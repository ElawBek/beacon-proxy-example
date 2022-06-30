# Example of a Beacon proxy

This is an implementation for [Beacon proxy](https://docs.openzeppelin.com/contracts/4.x/api/proxy#BeaconProxy)

# Installation

1. Clone tis repo:

```shell
git clone https://github.com/ElawBek/beacon-proxy-example.git
```

2. Install NPM packages:

```shell
cd beacon-proxy-example
npm install
```

# Deployment

localhost: (comment out the "verify:verify")

```shell
npx hardhat node
npx hardhat run scripts/deployBeaconV1.js
npx hardhat run scripts/deployBeaconV2.js
```

custom network (testnets/mainnets):

```shell
npx hardhat run scripts/deployBeaconV1.js --network yourNetwork
npx hardhat run scripts/deployBeaconV2.js --network yourNetwork
```

## How the scripts works

deployBeaconV1.ts:

1. deploy contract (implementation)
2. deploy factory contract with arg: implementation address
3. verify contracts on the scanner
4. create beaconProxyContract through factory

deployBeaconV1.ts: (copy your factory and proxy addresses from the scanner)

1. call method from proxy ver1
2. deploy the second version of the contract (implementation)
3. upgrade implementation through admin factory contract with arg: nextImpl address
4. call method from proxy ver2
5. verify v2 impl on the scanner

# Run tests:

```shell
npx hardhat test
```

# Useful Links

1. [Simultaneous Upgrades with Beacons (Openzeppelin blog)](https://blog.openzeppelin.com/the-state-of-smart-contract-upgrades/#beacons)
2. [EIP-1967: Standard Proxy Storage Slots](https://eips.ethereum.org/EIPS/eip-1967)
3. [Upgradable Contracts - Beacon Proxy and EIP-1967 ](https://www.youtube.com/watch?v=2oUHr8hxzBA)
