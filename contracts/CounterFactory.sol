// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CounterFactory
 * @author Dmitry K. (@elawbek)
 * @dev calls from created beacon proxies (counters) go through beacon, which have an implementation in our storage
 */
contract CounterFactory is Ownable {
    using Counters for Counters.Counter;

    UpgradeableBeacon private immutable beacon;

    /// @notice counter ids
    Counters.Counter private childId;

    /// @notice id => counter address map
    mapping(uint256 => BeaconProxy) private counters;

    event ProxyCreated(address indexed newProxy, uint256 id);
    event ImplementationChanged(address newImpl);

    /// @notice set the first logic to the beacon
    /// @param _cLogic - address of the new implementation
    constructor(address _cLogic) {
        beacon = new UpgradeableBeacon(_cLogic);

        emit ImplementationChanged(_cLogic);
    }

    /// @notice get the id of the last created counter
    function getLastCounter() external view returns (uint256 id_) {
        id_ = childId.current();
    }

    /// @notice get the beacon address
    function getBeacon() external view returns (address beacon_) {
        beacon_ = address(beacon);
    }

    /// @notice get the address of the counter by id
    function getCounter(uint256 _id) external view returns (address counter_) {
        counter_ = address(counters[_id]);
    }

    /// @notice create a new beacon proxy
    /// @param _name - new name of a counter
    /// @dev emit `ProxyCreated` event
    function create(string calldata _name) external {
        uint256 currentId = childId.current();
        childId.increment();

        BeaconProxy proxy = new BeaconProxy(
            address(beacon),
            abi.encodeWithSignature(
                "initialize(string,address)",
                _name,
                msg.sender
            )
        );

        counters[currentId] = proxy;

        emit ProxyCreated(address(proxy), currentId);
    }

    /// @notice get the current implementation address
    function implementation() external view returns (address impl_) {
        impl_ = beacon.implementation();
    }

    /// @notice set a new implementation on the beacon
    /// @dev emit `ImplementationChanged` event
    function update(address _newLogic) external onlyOwner {
        beacon.upgradeTo(_newLogic);

        emit ImplementationChanged(_newLogic);
    }
}
