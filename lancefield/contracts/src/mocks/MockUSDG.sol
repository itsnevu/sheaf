// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDG
/// @notice Test-only stand-in for the USDG stablecoin. Six decimals, anyone can mint.
contract MockUSDG is ERC20 {
    constructor() ERC20("Mock USDG", "USDG") {}

    /// @notice Number of decimals, matching USDG.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint `amount` to `to`. Test-only.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
