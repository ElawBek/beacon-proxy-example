import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { BigNumber, constants } from "ethers/lib/ethers";

import {
  CounterFactory,
  CounterFactory__factory,
  CounterV1,
  CounterV1__factory,
  CounterV2,
  CounterV2__factory,
} from "../typechain-types";

describe("Beacon proxy", function () {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;

  let factory: CounterFactory;

  let implV1: CounterV1;
  let implV2: CounterV2;

  let proxy1ver1: CounterV1;
  let proxy2ver1: CounterV1;

  let proxy1ver2: CounterV2;
  let proxy2ver2: CounterV2;

  beforeEach(async () => {
    [owner, alice] = await ethers.getSigners();

    implV1 = await new CounterV1__factory(owner).deploy();

    factory = await new CounterFactory__factory(owner).deploy(implV1.address);
  });

  describe("Deployment", () => {
    it("Factory state", async () => {
      expect([
        await factory.owner(),
        await factory.implementation(),
      ]).to.deep.eq([owner.address, implV1.address]);
    });

    describe("Origin contract", () => {
      it("Should be an error when trying to initialize the origin contract", async () => {
        await expect(
          implV1.initialize("RevertCounter", owner.address)
        ).to.revertedWith("Initializable: contract is already initialized");
      });

      it("Origin implementation's state", async () => {
        expect([
          await implV1.owner(),
          await implV1.name(),
          await implV1.value(),
        ]).to.deep.eq([constants.AddressZero, "", constants.Zero]);
      });
    });
  });

  describe("Create proxy", () => {
    it("Create function should emit `ProxyCreated` event", async () => {
      await expect(factory.create("TestCounter")).to.emit(
        factory,
        "ProxyCreated"
      );
    });
    describe("Counter functionality", async () => {
      beforeEach(async () => {
        await factory.create("ProxyCounter1");
        await factory.connect(alice).create("ProxyCounter1");

        const counterAddress = await factory.getCounter(0);
        proxy1ver1 = new CounterV1__factory(owner).attach(counterAddress);
      });

      it("Proxy counter state", async () => {
        expect([await proxy1ver1.owner(), await proxy1ver1.name()]).to.deep.eq([
          owner.address,
          "ProxyCounter1",
        ]);
      });

      it("Non-owner reverts", async () => {
        await expect(proxy1ver1.connect(alice).up()).to.revertedWith(
          `NotOwner("${alice.address}")`
        );
        await expect(proxy1ver1.connect(alice).down()).to.revertedWith(
          `NotOwner("${alice.address}")`
        );
      });

      it("Up", async () => {
        for (let i = 0; i < 10; i++) {
          await proxy1ver1.up();
        }
        expect(await proxy1ver1.value()).to.eq(BigNumber.from(10));
      });

      it("Down revert", async () => {
        await expect(proxy1ver1.down()).to.revertedWith(`Down("!value")`);
      });

      it("Down", async () => {
        for (let i = 0; i < 10; i++) {
          await proxy1ver1.up();
        }
        await proxy1ver1.down();

        expect(await proxy1ver1.value()).to.eq(BigNumber.from(9));
      });
    });
  });

  describe("Update implementation", () => {
    beforeEach(async () => {
      await factory.create("ProxyCounter1");
      await factory.connect(alice).create("ProxyCounter2");

      let proxyCounterAddress = await factory.getCounter(0);

      proxy1ver1 = new CounterV1__factory(owner).attach(proxyCounterAddress);

      proxyCounterAddress = await factory.getCounter(1);

      proxy2ver1 = new CounterV1__factory(alice).attach(proxyCounterAddress);

      implV2 = await new CounterV2__factory(owner).deploy();

      for (let i = 0; i < 10; i++) {
        await proxy1ver1.up();
      }
    });

    it("Non-owner revert", async () => {
      await expect(
        factory.connect(alice).update(implV2.address)
      ).to.revertedWith("Ownable: caller is not the owner");
    });

    it("`ImplementationChanged` event", async () => {
      await expect(factory.update(implV2.address))
        .to.emit(factory, "ImplementationChanged")
        .withArgs(implV2.address);

      expect(await factory.implementation()).to.eq(implV2.address);
    });

    describe("Check new methods after update implementation", async () => {
      beforeEach(async () => {
        await factory.update(implV2.address);

        let proxyCounterAddress = await factory.getCounter(0);

        proxy1ver2 = new CounterV2__factory(owner).attach(proxyCounterAddress);

        proxyCounterAddress = await factory.getCounter(1);

        proxy2ver2 = new CounterV2__factory(alice).attach(proxyCounterAddress);
      });

      it("Proxy V2 state", async () => {
        expect([
          await proxy1ver2.owner(),
          await proxy1ver2.name(),
          await proxy1ver2.value(),
        ]).to.deep.eq([owner.address, "ProxyCounter1", BigNumber.from(10)]);

        expect([
          await proxy2ver2.owner(),
          await proxy2ver2.name(),
          await proxy2ver2.value(),
        ]).to.deep.eq([alice.address, "ProxyCounter2", constants.Zero]);
      });

      describe("Reset reverts", () => {
        it("Non-owner revert", async () => {
          await expect(proxy1ver2.connect(alice).reset()).to.revertedWith(
            `NotOwner("${alice.address}")`
          );
        });

        it("already zero revert", async () => {
          await expect(proxy2ver2.reset()).to.revertedWith(
            `Reset("already zero")`
          );
        });
      });

      describe("Ownership functionality", async () => {
        it("Non-owner reverts", async () => {
          await expect(
            proxy1ver2.connect(alice).transferOwnerShip(alice.address)
          ).to.revertedWith(`NotOwner("${alice.address}")`);

          await expect(
            proxy1ver2.connect(alice).renounceOwnership()
          ).to.revertedWith(`NotOwner("${alice.address}")`);
        });

        it("Address(0) revert during the transfer of ownership function", async () => {
          await expect(
            proxy2ver2.transferOwnerShip(constants.AddressZero)
          ).to.revertedWith("NewOwnerCannotBeAddressZero()");
        });

        it("Ownership events", async () => {
          await expect(proxy1ver2.transferOwnerShip(alice.address))
            .to.emit(proxy1ver2, "OwnershipTransferred")
            .withArgs(owner.address, alice.address);

          await expect(proxy2ver2.renounceOwnership())
            .to.emit(proxy2ver2, "OwnershipTransferred")
            .withArgs(alice.address, constants.AddressZero);

          expect([
            await proxy1ver2.owner(),
            await proxy2ver2.owner(),
          ]).to.deep.eq([alice.address, constants.AddressZero]);
        });
      });
    });
  });
});
