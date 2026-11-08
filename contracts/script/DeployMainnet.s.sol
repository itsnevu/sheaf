// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RaqioVault} from "../src/RaqioVault.sol";
import {RaqioAirdrop} from "../src/RaqioAirdrop.sol";
import {RaqioScore} from "../src/RaqioScore.sol";

/// @notice Mainnet deployment for Kinetiq Elysium (chain 99901).
/// @dev Simulation is the default. Add --broadcast only after explicit approval.
/// Required environment: FEE_ROUTER_ADDRESS, RAQIO_ADMIN_ADDRESS.
contract DeployMainnet is Script {
    uint256 internal constant ELYSIUM_MAINNET = 99901;

    function run() external {
        require(block.chainid == ELYSIUM_MAINNET, "Select Elysium Mainnet (99901)");
        address router = vm.envAddress("FEE_ROUTER_ADDRESS");
        address admin = vm.envAddress("RAQIO_ADMIN_ADDRESS");
        // A multisig/treasury contract is recommended, but an EOA is valid because
        // the vault only transfers ERC-20 fees to this address.
        require(router != address(0), "FEE_ROUTER_ADDRESS is zero");
        require(admin != address(0), "RAQIO_ADMIN_ADDRESS is zero");

        vm.startBroadcast();
        RaqioVault vault = new RaqioVault(router, 25);
        RaqioAirdrop airdrop = new RaqioAirdrop(address(vault));
        RaqioScore score = new RaqioScore(address(vault));
        vault.transferOwnership(admin);
        airdrop.transferOwnership(admin);
        score.transferOwnership(admin);
        vm.stopBroadcast();

        console2.log("RaqioVault", address(vault));
        console2.log("RaqioAirdrop", address(airdrop));
        console2.log("RaqioScore", address(score));
        console2.log("Admin must accept ownership on all three contracts", admin);
    }
}
