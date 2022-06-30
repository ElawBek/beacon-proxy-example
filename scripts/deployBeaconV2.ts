import { ethers, run } from "hardhat";

import {
  CounterFactory__factory,
  CounterV1__factory,
  CounterV2__factory,
} from "../typechain-types";

const FACTORY_ADDRESS = "";
const PROXY_COUNTER_ADDRESS = "";

async function main() {
  const [signer] = await ethers.getSigners();

  const proxyCounterV1 = new CounterV1__factory(signer).attach(
    PROXY_COUNTER_ADDRESS
  );

  let tx = await proxyCounterV1.up();
  await tx.wait();

  console.log(`Value ver1: ${await proxyCounterV1.value()}`);

  const implV2 = await new CounterV2__factory(signer).deploy();
  await implV2.deployed();

  const factory = new CounterFactory__factory(signer).attach(FACTORY_ADDRESS);

  tx = await factory.update(implV2.address);
  await tx.wait();

  const proxyCounterV2 = new CounterV2__factory(signer).attach(
    PROXY_COUNTER_ADDRESS
  );

  tx = await proxyCounterV2.reset();
  await tx.wait();

  console.log(`Value ver2: ${await proxyCounterV2.value()}`);

  await run("verify:verify", {
    address: implV2.address,
    contract: "contracts/CounterV2.sol:CounterV2",
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
