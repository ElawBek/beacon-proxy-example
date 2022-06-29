// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/// @title CounterV1
/// @author Dmitry K. (@elawbek)
contract CounterV1 is Initializable {
    /// @notice counter owner
    address public owner;

    /// @notice counter name
    string public name;
    uint256 public value;

    error Down(string reason);
    error NotOwner(address caller);

    /// @dev disable any init actions directly through the origin contract
    constructor() {
        _disableInitializers();
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    /// @notice set name and owner
    function initialize(string memory _name, address _owner)
        public
        initializer
    {
        name = _name;
        owner = _owner;
    }

    /// @notice increment value
    function up() external onlyOwner {
        unchecked {
            value++;
        }
    }

    /// @notice decrement value
    function down() public onlyOwner {
        if (value == 0) revert Down("!value");

        unchecked {
            value--;
        }
    }
}
