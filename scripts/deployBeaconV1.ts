import { ethers, run } from "hardhat";

import {
  CounterV1__factory,
  CounterFactory__factory,
} from "../typechain-types";

async function main() {
  const [signer] = await ethers.getSigners();

  const implV1 = await new CounterV1__factory(signer).deploy();
  await implV1.deployed();

  const factory = await new CounterFactory__factory(signer).deploy(
    implV1.address
  );
  await factory.deployed();

  await run("verify:verify", {
    address: implV1.address,
    contract: "contracts/CounterV1.sol:CounterV1",
  });

  await run("verify:verify", {
    address: factory.address,
    contract: "contracts/CounterFactory.sol:CounterFactory",
    constructorArguments: [implV1.address],
  });

  const tx = await factory.create("MyCounter");
  await tx.wait();

  console.log(`Created proxy: ${await factory.getCounter(0)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
