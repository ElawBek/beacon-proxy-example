import { expect } from "chai";

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber, constants } from "ethers/lib/ethers";

import {
  createCountersFixture,
  deployFixture,
  updateImplementationFixture,
} from "./fixtures";

describe("Beacon proxy", function () {
  describe("Deployment", () => {
    it("Factory state", async () => {
      const { owner, factory, implV1 } = await loadFixture(deployFixture);

      expect([
        await factory.owner(),
        await factory.implementation(),
      ]).to.deep.eq([owner.address, implV1.address]);
    });

    describe("Origin contract", () => {
      it("Should be an error when trying to initialize the origin contract", async () => {
        const { owner, implV1 } = await loadFixture(deployFixture);

        await expect(
          implV1.initialize("RevertCounter", owner.address)
        ).to.revertedWith("Initializable: contract is already initialized");
      });

      it("Origin implementation's state", async () => {
        const { implV1 } = await loadFixture(deployFixture);

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
      const { factory } = await loadFixture(deployFixture);

      await expect(factory.create("TestCounter")).to.emit(
        factory,
        "ProxyCreated"
      );
    });

    describe("Counter functionality", async () => {
      it("Proxy counter state", async () => {
        const { owner, proxy1ver1 } = await loadFixture(createCountersFixture);

        expect([await proxy1ver1.owner(), await proxy1ver1.name()]).to.deep.eq([
          owner.address,
          "ProxyCounter1",
        ]);
      });

      it("Non-owner reverts", async () => {
        const { alice, proxy1ver1 } = await loadFixture(createCountersFixture);

        await expect(proxy1ver1.connect(alice).up()).to.revertedWithCustomError(
          proxy1ver1,
          "NotOwner"
        );

        await expect(
          proxy1ver1.connect(alice).down()
        ).to.revertedWithCustomError(proxy1ver1, "NotOwner");
      });

      it("Up", async () => {
        const { proxy1ver1 } = await loadFixture(createCountersFixture);

        for (let i = 0; i < 10; i++) {
          await proxy1ver1.up();
        }
        expect(await proxy1ver1.value()).to.eq(BigNumber.from(10));
      });

      it("Down revert", async () => {
        const { proxy1ver1 } = await loadFixture(createCountersFixture);

        await expect(proxy1ver1.down()).to.revertedWithCustomError(
          proxy1ver1,
          "Down"
        );
      });

      it("Down", async () => {
        const { proxy1ver1 } = await loadFixture(createCountersFixture);

        for (let i = 0; i < 10; i++) {
          await proxy1ver1.up();
        }
        await proxy1ver1.down();

        expect(await proxy1ver1.value()).to.eq(BigNumber.from(9));
      });
    });
  });

  describe("Update implementation", () => {
    it("Non-owner revert", async () => {
      const { factory, alice, implV2 } = await loadFixture(
        createCountersFixture
      );

      await expect(
        factory.connect(alice).update(implV2.address)
      ).to.revertedWith("Ownable: caller is not the owner");
    });

    it("`ImplementationChanged` event", async () => {
      const { factory, implV2 } = await loadFixture(createCountersFixture);

      await expect(factory.update(implV2.address))
        .to.emit(factory, "ImplementationChanged")
        .withArgs(implV2.address);

      expect(await factory.implementation()).to.eq(implV2.address);
    });

    describe("Check new methods after update implementation", async () => {
      beforeEach(async () => {});

      it("Proxy V2 state", async () => {
        const { proxy1ver2, proxy2ver2, owner, alice } = await loadFixture(
          updateImplementationFixture
        );

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
          const { proxy1ver2, alice } = await loadFixture(
            updateImplementationFixture
          );

          await expect(
            proxy1ver2.connect(alice).reset()
          ).to.revertedWithCustomError(proxy1ver2, "NotOwner");
        });

        it("already zero revert", async () => {
          const { proxy2ver2 } = await loadFixture(updateImplementationFixture);

          await expect(proxy2ver2.reset()).to.revertedWithCustomError(
            proxy2ver2,
            "Reset"
          );
        });
      });

      describe("Ownership functionality", async () => {
        it("Non-owner reverts", async () => {
          const { proxy1ver2, alice } = await loadFixture(
            updateImplementationFixture
          );

          await expect(
            proxy1ver2.connect(alice).transferOwnerShip(alice.address)
          ).to.revertedWithCustomError(proxy1ver2, "NotOwner");

          await expect(
            proxy1ver2.connect(alice).renounceOwnership()
          ).to.revertedWithCustomError(proxy1ver2, "NotOwner");
        });

        it("Address(0) revert during the transfer of ownership function", async () => {
          const { proxy2ver2 } = await loadFixture(updateImplementationFixture);

          await expect(
            proxy2ver2.transferOwnerShip(constants.AddressZero)
          ).to.revertedWithCustomError(
            proxy2ver2,
            "NewOwnerCannotBeAddressZero"
          );
        });

        it("Ownership events", async () => {
          const { proxy1ver2, alice, owner, proxy2ver2 } = await loadFixture(
            updateImplementationFixture
          );

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
