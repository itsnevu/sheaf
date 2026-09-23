// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PrivateClaim} from "../src/PrivateClaim.sol";
import {StealthDesk} from "../src/StealthDesk.sol";
import {OtcEscrow} from "../src/OtcEscrow.sol";
import {DelegatedTreasury} from "../src/DelegatedTreasury.sol";

/// @title Deploy
/// @notice Deploys all four Sheaf contracts.
/// @dev Environment variables:
///      - `SHEAF_OWNER`        owner of PrivateClaim and DelegatedTreasury (required)
///      - `SHEAF_CLAIM_TOKEN`  ERC-20 distributed by PrivateClaim, e.g. USDG (required)
///      Run with `--rpc-url $ROBINHOOD_RPC_URL --broadcast` (see README).
contract Deploy is Script {
    function run() external {
        address owner = vm.envAddress("SHEAF_OWNER");
        address claimToken = vm.envAddress("SHEAF_CLAIM_TOKEN");

        vm.startBroadcast();
        PrivateClaim claim = new PrivateClaim(owner, IERC20(claimToken));
        StealthDesk desk = new StealthDesk();
        OtcEscrow otc = new OtcEscrow();
        DelegatedTreasury treasury = new DelegatedTreasury(owner);
        vm.stopBroadcast();

        console.log("PrivateClaim      ", address(claim));
        console.log("StealthDesk       ", address(desk));
        console.log("OtcEscrow         ", address(otc));
        console.log("DelegatedTreasury ", address(treasury));
    }
}
