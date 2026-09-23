// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockRestrictedToken
/// @notice Test-only stand-in for a Robinhood Stock Token: an ERC-20 with an allowlist.
///         Transfers revert unless both the sender and the receiver are allowlisted
///         (minting and burning are exempt). This simulates the compliance checks that
///         real stock tokens perform on both ends of a transfer.
contract MockRestrictedToken is ERC20 {
    /// @notice Thrown when a transfer involves an address that is not allowlisted.
    error NotAllowlisted(address account);

    /// @notice Allowlist status per address.
    mapping(address => bool) public allowlisted;

    constructor() ERC20("Mock Stock Token", "mSTK") {}

    /// @notice Set the allowlist status of `account`. Test-only.
    function setAllowlisted(address account, bool ok) external {
        allowlisted[account] = ok;
    }

    /// @notice Mint `amount` to `to`. Test-only.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && !allowlisted[from]) revert NotAllowlisted(from);
        if (to != address(0) && !allowlisted[to]) revert NotAllowlisted(to);
        super._update(from, to, value);
    }
}
