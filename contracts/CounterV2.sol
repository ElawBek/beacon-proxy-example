// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/// @title CounterV2
/// @author Dmitry K. (@elawbek)
/// @dev for the "avoid storage collisions" storage variables should be the same
// as in the first version
contract CounterV2 is Initializable {
  /// @notice counter owner
  address public owner;

  /// @notice counter name
  string public name;
  uint256 public value;

  error Reset(string reason);
  error Down(string reason);
  error NotOwner(address caller);
  error NewOwnerCannotBeAddressZero();

  event OwnershipTransferred(address oldOwner, address newOwner);

  /// @dev disable any init actions directly through the origin contract
  constructor() {
    _disableInitializers();
  }

  modifier onlyOwner() {
    if (msg.sender != owner) revert NotOwner(msg.sender);
    _;
  }

  /// @notice set name and owner
  function initialize(string memory _name, address _owner) public initializer {
    name = _name;
    owner = _owner;
  }

  /// @notice transfer ownership to `_newOwner`
  /// @dev `_newOwner` can't be address(0)
  /// emit `OwnershipTransferred` event
  function transferOwnership(address _newOwner) external onlyOwner {
    if (_newOwner == address(0)) {
      revert NewOwnerCannotBeAddressZero();
    }
    address _oldOwner = owner;
    owner = _newOwner;

    emit OwnershipTransferred(_oldOwner, _newOwner);
  }

  /// @notice delete ownership (kill contract)
  /// @dev emit `OwnershipTransferred` event
  function renounceOwnership() external onlyOwner {
    address _oldOwner = owner;
    owner = address(0);

    emit OwnershipTransferred(_oldOwner, address(0));
  }

  /// @notice increment value
  function up() external onlyOwner {
    unchecked {
      value++;
    }
  }

  /// @notice decrement value
  function down() external onlyOwner {
    if (value == 0) revert Down("!value");

    unchecked {
      value--;
    }
  }

  /// @notice reset value
  function reset() external onlyOwner {
    if (value == 0) revert Reset("already zero");

    value = 0;
  }
}
