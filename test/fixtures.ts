import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  CounterV1__factory,
  CounterFactory__factory,
  CounterV1,
  CounterV2__factory,
  CounterV2,
  CounterFactory,
} from "../typechain-types";

export async function deployFactoryFixture() {
  const [owner, alice] = await ethers.getSigners();

  const implV1 = await new CounterV1__factory(owner).deploy();

  const factory = await new CounterFactory__factory(owner).deploy(
    implV1.address
  );

  return { owner, alice, implV1, factory };
}

export async function updateImplementationFixture() {
  const [owner, alice] = await ethers.getSigners();

  const implV1 = await new CounterV1__factory(owner).deploy();

  const factory = await new CounterFactory__factory(owner).deploy(
    implV1.address
  );

  await createCounters(owner, alice, factory);

  const countersV1: CounterV1[] = [];

  for (let i = 0; i < 2; i++) {
    countersV1.push(
      new CounterV1__factory().attach(await factory.getCounter(i))
    );
  }

  for (let i = 0; i < 10; i++) {
    await countersV1[0].connect(owner).up();
  }

  const implV2 = await new CounterV2__factory(owner).deploy();

  await factory.update(implV2.address);

  const countersV2: CounterV2[] = [];

  for (let i = 0; i < 2; i++) {
    countersV2.push(new CounterV2__factory().attach(countersV1[i].address));
  }

  return {
    owner,
    alice,
    implV2,
    factory,
    counter1V2: countersV2[0],
    counter2V2: countersV2[1],
  };
}

export async function createCounters(
  owner: SignerWithAddress,
  alice: SignerWithAddress,
  factory: CounterFactory
) {
  await factory.connect(owner).create("ProxyCounter1");
  await factory.connect(alice).create("ProxyCounter2");
}
