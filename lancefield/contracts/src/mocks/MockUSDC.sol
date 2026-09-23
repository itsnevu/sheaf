// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice LOCAL DEVELOPMENT ONLY. A 6-decimal stand-in for USDC that anyone can mint. The deploy script
///         deploys it on the local anvil chain (31337) only; Base and Base Sepolia use Circle's USDC.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin (local only)", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
