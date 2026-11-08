// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Script, console2} from "forge-std/Script.sol";
import {RaqioVault} from "../src/RaqioVault.sol";
import {RaqioAirdrop} from "../src/RaqioAirdrop.sol";
import {RaqioScore} from "../src/RaqioScore.sol";

/// @notice Dry-run by default. Broadcasting requires an explicit operator command and funded wallet.
contract DeployInfrastructure is Script {
 function run() external {
  require(block.chainid==99801,"Select Elysium Testnet");
  address router=vm.envAddress("FEE_ROUTER_ADDRESS");
  address admin=vm.envAddress("RAQIO_ADMIN_ADDRESS");
  require(router!=address(0)&&admin!=address(0),"Configure fee router and admin");
  vm.startBroadcast();
  RaqioVault vault=new RaqioVault(router,25);
  RaqioAirdrop airdrop=new RaqioAirdrop(address(vault));
  RaqioScore score=new RaqioScore(address(vault));
  vault.transferOwnership(admin);airdrop.transferOwnership(admin);score.transferOwnership(admin);
  vm.stopBroadcast();
  console2.log("RaqioVault",address(vault));console2.log("RaqioAirdrop",address(airdrop));console2.log("RaqioScore",address(score));
  console2.log("Admin must accept ownership on all three contracts",admin);
 }
}
