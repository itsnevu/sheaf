// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {BriefEscrow} from "../src/BriefEscrow.sol";

/// @title Deploy
/// @notice Deploys AgentRegistry (unless one is given) and BriefEscrow on Robinhood Chain.
/// @dev Environment variables:
///      - `LANCEFIELD_OWNER`          owner of BriefEscrow (required)
///      - `LANCEFIELD_REGISTRAR`      server key allowed to register entries (required, may be zero)
///      - `LANCEFIELD_FEE_BPS`        protocol fee in bps, 0..500 (required)
///      - `LANCEFIELD_FEE_RECIPIENT`  fee receiver, required non-zero when fee > 0
///      - `LANCEFIELD_REGISTRY`       optional existing AgentRegistry; a new one is deployed if unset
///      Run with `--rpc-url $ROBINHOOD_RPC_URL --chain-id 4663 --broadcast` (see README).
contract Deploy is Script {
    /// @notice Robinhood Chain.
    uint256 public constant ROBINHOOD_CHAIN_ID = 4663;

    function run() external {
        address owner = vm.envAddress("LANCEFIELD_OWNER");
        address registrar = vm.envAddress("LANCEFIELD_REGISTRAR");
        uint256 feeBps = vm.envUint("LANCEFIELD_FEE_BPS");
        address feeRecipient = vm.envAddress("LANCEFIELD_FEE_RECIPIENT");
        address existingRegistry = vm.envOr("LANCEFIELD_REGISTRY", address(0));

        require(block.chainid == ROBINHOOD_CHAIN_ID, "Deploy: not Robinhood Chain (4663)");
        require(owner != address(0), "Deploy: owner is zero");
        require(feeBps <= 500, "Deploy: fee above 5%");

        vm.startBroadcast();
        AgentRegistry registry = existingRegistry == address(0) ? new AgentRegistry() : AgentRegistry(existingRegistry);
        BriefEscrow escrow = new BriefEscrow(owner, registrar, uint16(feeBps), feeRecipient, registry);
        vm.stopBroadcast();

        console.log("AgentRegistry ", address(registry));
        console.log("BriefEscrow   ", address(escrow));
    }
}
