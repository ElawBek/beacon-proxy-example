import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  CounterV1__factory,
  CounterFactory__factory,
  CounterV2__factory,
} from "../typechain-types";

export async function deployFixture() {
  const [owner, alice] = await ethers.getSigners();

  const implV1 = await new CounterV1__factory(owner).deploy();

  const factory = await new CounterFactory__factory(owner).deploy(
    implV1.address
  );

  return { owner, alice, implV1, factory };
}

export async function createCountersFixture() {
  const { owner, alice, factory } = await loadFixture(deployFixture);
  const implV2 = await new CounterV2__factory(owner).deploy();

  await factory.connect(owner).create("ProxyCounter1");
  await factory.connect(alice).create("ProxyCounter2");

  const counter1Address = await factory.getCounter(0);
  const proxy1ver1 = new CounterV1__factory(owner).attach(counter1Address);

  return { owner, alice, factory, proxy1ver1, implV2 };
}

export async function updateImplementationFixture() {
  const { owner, alice, factory, proxy1ver1, implV2 } = await loadFixture(
    createCountersFixture
  );

  for (let i = 0; i < 10; i++) {
    await proxy1ver1.up();
  }

  await factory.update(implV2.address);

  const proxyCounter1Address = await factory.getCounter(0);
  const proxyCounter2Address = await factory.getCounter(1);

  const proxy1ver2 = new CounterV2__factory(owner).attach(proxyCounter1Address);
  const proxy2ver2 = new CounterV2__factory(alice).attach(proxyCounter2Address);

  return { owner, alice, factory, proxy1ver2, proxy2ver2, implV2 };
}
