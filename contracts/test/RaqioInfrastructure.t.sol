// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {RaqioVault} from "../src/RaqioVault.sol";
import {RaqioAirdrop} from "../src/RaqioAirdrop.sol";
import {RaqioScore} from "../src/RaqioScore.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";

contract PositionNFT is ERC721 { constructor() ERC721("Position","LP") {} function mint(address to,uint256 id) external { _mint(to,id); } }
contract TaxedToken is ERC20 {
 constructor() ERC20("Taxed","TAX") { _mint(msg.sender,1e24); }
 function _update(address from,address to,uint256 value) internal override { if(from!=address(0)&&to!=address(0)){super._update(from,address(0),value/100);value-=value/100;}super._update(from,to,value); }
}
contract RaqioInfrastructureTest is Test {
 RaqioVault vault; RaqioAirdrop drop; RaqioScore score; MockUSDG token;
 address alice=makeAddr("alice");address bob=makeAddr("bob");address treasury=makeAddr("treasury");
 function setUp() public {
  vm.warp(1_800_000_000);token=new MockUSDG();vault=new RaqioVault(treasury,25);drop=new RaqioAirdrop(address(vault));score=new RaqioScore(address(vault));
  token.mint(alice,1_000_000e6);vm.prank(alice);token.approve(address(vault),type(uint256).max);
 }
 function testFuzz_DepositFeeAndNoEarlyWithdrawal(uint96 raw) public {
  uint256 amount=bound(uint256(raw),1,1_000_000e6);vm.prank(alice);uint256 id=vault.lockTokens(address(token),amount,block.timestamp+1 days,bob);
  uint256 fee=amount*25/10_000;assertEq(vault.getLock(id).amount,amount-fee);assertEq(token.balanceOf(treasury),fee);
  vm.prank(bob);vm.expectRevert(RaqioVault.StillLocked.selector);vault.claim(id);vm.warp(block.timestamp+1 days);vm.prank(bob);vault.claim(id);assertEq(token.balanceOf(bob),amount-fee);assertTrue(vault.getLock(id).withdrawn);
 }
 function test_NFTPositionZeroIsWithdrawable() public {
  PositionNFT nft=new PositionNFT();nft.mint(alice,0);vm.startPrank(alice);nft.approve(address(vault),0);uint256 id=vault.lockNFTPosition(address(nft),0,block.timestamp+1 days,bob);vm.stopPrank();
  assertTrue(vault.isNFTLock(id));vm.warp(block.timestamp+1 days);vm.prank(bob);vault.claim(id);assertEq(nft.ownerOf(0),bob);
 }
 function test_UnsolicitedSafeNFTTransferRejected() public {
  PositionNFT nft=new PositionNFT();nft.mint(alice,1);vm.prank(alice);vm.expectRevert(RaqioVault.UnexpectedNFT.selector);nft.safeTransferFrom(alice,address(vault),1);
 }
 function test_StreamsCannotBeExtendedAfterClaim() public {
  vm.prank(alice);uint256 id=vault.createStream(bob,address(token),1000e6,block.timestamp,0,100 days,true);vm.warp(block.timestamp+50 days);vm.prank(bob);vault.claim(id);
  vm.prank(alice);vm.expectRevert(RaqioVault.CannotExtendStream.selector);vault.extendLock(id,block.timestamp+200 days);
  vm.warp(block.timestamp+50 days);vm.prank(bob);vault.claim(id);assertEq(token.balanceOf(bob),997_500_000);
 }
 function test_CancellationSplitsAndNoDoubleClaim() public {
  vm.prank(alice);uint256 id=vault.createStream(bob,address(token),1000e6,block.timestamp,0,100 days,true);vm.warp(block.timestamp+40 days);vm.prank(alice);vault.cancel(id);
  assertEq(token.balanceOf(bob),399e6);assertEq(vault.claimable(id),0);vm.prank(bob);vm.expectRevert(RaqioVault.AlreadyCanceled.selector);vault.claim(id);
 }
 function test_CliffCancellationBeforeCliffReturnsUnvested() public {
  vm.prank(alice);uint256 id=vault.createStream(bob,address(token),1000e6,block.timestamp,50 days,100 days,true);vm.warp(block.timestamp+49 days);vm.prank(alice);vault.cancel(id);assertEq(token.balanceOf(bob),0);
 }
 function test_OwnershipIndexHasNoDuplicatesOrStaleOwners() public {
  vm.prank(alice);uint256 id=vault.lockTokens(address(token),100e6,block.timestamp+1 days,bob);vm.prank(alice);vault.transferLockOwnership(id,bob);assertEq(vault.locksOf(bob).length,1);assertEq(vault.locksOf(alice).length,0);
  vm.prank(bob);vault.transferLockOwnership(id,alice);assertEq(vault.locksOf(alice).length,1);assertEq(vault.locksOf(bob).length,1);
 }
 function test_TaxTokenCannotConsumeOtherDeposits() public {
  TaxedToken tax=new TaxedToken();tax.approve(address(vault),type(uint256).max);vm.expectRevert(RaqioVault.UnsupportedToken.selector);vault.lockTokens(address(tax),100e18,block.timestamp+1 days,bob);
 }
 function test_AddRejectsTaxAndNFTZero() public {
  PositionNFT nft=new PositionNFT();nft.mint(alice,0);vm.startPrank(alice);nft.approve(address(vault),0);uint256 id=vault.lockNFTPosition(address(nft),0,block.timestamp+1 days,bob);vm.expectRevert(RaqioVault.CannotAddToNFTLock.selector);vault.addToLock(id,1);vm.stopPrank();
 }
 function test_FeeTimelock() public {
  vault.proposeFeeChange(50);vm.expectRevert(RaqioVault.TimelockNotReady.selector);vault.executeFeeChange();vm.warp(block.timestamp+48 hours);vault.executeFeeChange();assertEq(vault.feeBps(),50);vm.expectRevert(RaqioVault.FeeTooHigh.selector);vault.proposeFeeChange(51);
 }
 function test_AirdropCannotOverspendAnotherCampaign() public {
  bytes32 root=keccak256(bytes.concat(keccak256(abi.encode(bob,200e6))));vm.startPrank(alice);token.approve(address(drop),1000e6);uint256 id=drop.createCampaign(address(token),root,100e6,0,0,false,30 days);drop.createCampaign(address(token),root,900e6,0,0,false,30 days);vm.stopPrank();
  vm.prank(bob);vm.expectRevert(RaqioAirdrop.InsufficientCampaignBalance.selector);drop.claimAirdrop(id,200e6,new bytes32[](0));assertEq(token.balanceOf(address(drop)),1000e6);
 }
 function test_AirdropCreatorOwnsStreamAndAllowanceResets() public {
  bytes32 root=keccak256(bytes.concat(keccak256(abi.encode(bob,100e6))));vm.startPrank(alice);token.approve(address(drop),100e6);uint256 id=drop.createCampaign(address(token),root,100e6,100 days,0,true,30 days);vm.stopPrank();
  vm.prank(bob);uint256 stream=drop.claimAirdrop(id,100e6,new bytes32[](0));assertEq(vault.getLock(stream).owner,alice);assertEq(token.allowance(address(drop),address(vault)),0);
  vm.warp(block.timestamp+50 days);vm.prank(alice);vault.cancel(stream);assertEq(token.balanceOf(bob),49_875_000);assertEq(token.balanceOf(address(drop)),0);
 }
 function test_AirdropDoubleClaimRejectedAndSweepOnlyRemaining() public {
  bytes32 root=keccak256(bytes.concat(keccak256(abi.encode(bob,100e6))));vm.startPrank(alice);token.approve(address(drop),200e6);uint256 id=drop.createCampaign(address(token),root,200e6,0,0,false,10 days);vm.stopPrank();vm.prank(bob);drop.claimAirdrop(id,100e6,new bytes32[](0));vm.prank(bob);vm.expectRevert(RaqioAirdrop.AlreadyClaimed.selector);drop.claimAirdrop(id,100e6,new bytes32[](0));vm.warp(block.timestamp+10 days);vm.prank(alice);drop.sweep(id);assertEq(token.balanceOf(address(drop)),0);
 }
 function test_ScoreHasNoReporterInventedValuesAndExpiredLocksAreExcluded() public {
  assertEq(score.getScore(address(token)),0);vm.prank(alice);vault.lockTokens(address(token),500_000e6,block.timestamp+400 days,bob);RaqioScore.Score memory s=score.getFullScore(address(token));assertEq(s.supplyLocked,49);assertEq(s.lpLocked,0);assertLe(s.value,100);vm.warp(block.timestamp+400 days);assertEq(score.getScore(address(token)),0);
 }
 function test_LPScoreRequiresRegistrationAndActualVaultLP() public {
  MockUSDG lp=new MockUSDG();lp.mint(alice,100e6);vm.startPrank(alice);lp.approve(address(vault),100e6);vault.lockLP(address(lp),100e6,block.timestamp+365 days,bob);vm.stopPrank();assertEq(score.getFullScore(address(token)).lpLocked,0);score.setVerifiedLP(address(token),address(lp));assertEq(score.getFullScore(address(token)).lpLocked,99);
 }
}
