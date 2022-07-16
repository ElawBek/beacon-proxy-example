import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { constants, BigNumber } from "ethers";

import {
  createCounters,
  deployFactoryFixture,
  updateImplementationFixture,
} from "./fixtures";

import {
  CounterFactory,
  CounterV1__factory,
  CounterV1,
  CounterV2,
} from "../typechain-types";

describe("Beacon", () => {
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;

  let factory: CounterFactory;

  let implV1: CounterV1;

  describe("Before upgrade", () => {
    beforeEach(async () => {
      ({ owner, alice, factory, implV1 } = await loadFixture(
        deployFactoryFixture
      ));
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
        let counterV1: CounterV1;

        beforeEach(async () => {
          await createCounters(owner, alice, factory);

          counterV1 = new CounterV1__factory(owner).attach(
            await factory.getCounter(0)
          );
        });

        it("Proxy counter state", async () => {
          expect([await counterV1.owner(), await counterV1.name()]).to.deep.eq([
            owner.address,
            "ProxyCounter1",
          ]);
        });

        it("Non-owner reverts", async () => {
          await expect(
            counterV1.connect(alice).up()
          ).to.revertedWithCustomError(counterV1, "NotOwner");

          await expect(
            counterV1.connect(alice).down()
          ).to.revertedWithCustomError(counterV1, "NotOwner");
        });

        it("Up", async () => {
          for (let i = 0; i < 10; i++) {
            await counterV1.up();
          }
          expect(await counterV1.value()).to.eq(BigNumber.from(10));
        });

        it("Down revert", async () => {
          await expect(counterV1.down()).to.revertedWithCustomError(
            counterV1,
            "Down"
          );
        });

        it("Down", async () => {
          for (let i = 0; i < 10; i++) {
            await counterV1.up();
          }
          await counterV1.down();

          expect(await counterV1.value()).to.eq(BigNumber.from(9));
        });
      });
    });
  });

  describe("Update implementation", () => {
    let counter1V2: CounterV2;
    let counter2V2: CounterV2;

    beforeEach(async () => {
      ({ counter1V2, counter2V2, alice, owner, factory } = await loadFixture(
        updateImplementationFixture
      ));
    });

    it("Proxy V2 state", async () => {
      expect([
        await counter1V2.connect(owner).owner(),
        await counter1V2.connect(owner).name(),
        await counter1V2.connect(owner).value(),
      ]).to.deep.eq([owner.address, "ProxyCounter1", BigNumber.from(10)]);

      expect([
        await counter2V2.connect(owner).owner(),
        await counter2V2.connect(owner).name(),
        await counter2V2.connect(owner).value(),
      ]).to.deep.eq([alice.address, "ProxyCounter2", constants.Zero]);
    });

    describe("Reset reverts", () => {
      it("Non-owner revert", async () => {
        await expect(
          counter1V2.connect(alice).reset()
        ).to.revertedWithCustomError(counter1V2, "NotOwner");
      });

      it("already zero revert", async () => {
        await expect(
          counter2V2.connect(alice).reset()
        ).to.revertedWithCustomError(counter2V2, "Reset");
      });
    });

    describe("Ownership functionality", async () => {
      it("Non-owner reverts", async () => {
        await expect(
          counter1V2.connect(alice).transferOwnership(alice.address)
        ).to.revertedWithCustomError(counter1V2, "NotOwner");

        await expect(
          counter1V2.connect(alice).renounceOwnership()
        ).to.revertedWithCustomError(counter1V2, "NotOwner");
      });

      it("Address(0) revert during the transfer of ownership function", async () => {
        await expect(
          counter2V2.connect(alice).transferOwnership(constants.AddressZero)
        ).to.revertedWithCustomError(counter2V2, "NewOwnerCannotBeAddressZero");
      });
    });
  });
});
