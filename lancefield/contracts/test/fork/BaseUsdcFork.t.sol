// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {LancefieldPrizeEscrow as Escrow} from "../../src/LancefieldPrizeEscrow.sol";

interface IFiatToken is IERC20 {
    function blacklister() external view returns (address);
    function blacklist(address account) external;
}

/// Runs the escrow against Circle's real USDC on a local fork of Base. Read-only against the public
/// chain: the fork lives in memory and nothing is broadcast. Skipped unless BASE_RPC_URL is set:
///   BASE_RPC_URL=https://mainnet.base.org forge test --match-path test/fork/BaseUsdcFork.t.sol
contract BaseUsdcForkTest is Test {
    IFiatToken internal constant USDC = IFiatToken(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    Escrow internal escrow;
    address internal sponsor = makeAddr("fork-sponsor");
    address internal winner = makeAddr("fork-winner");
    address internal treasury = makeAddr("fork-treasury");
    bool internal forked;

    function setUp() public {
        string memory rpc = vm.envOr("BASE_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);
        forked = true;
        assertEq(block.chainid, 8453, "BASE_RPC_URL is not Base mainnet");
        address[] memory tokens = new address[](1);
        tokens[0] = address(USDC);
        escrow = new Escrow(address(this), treasury, 1_500, tokens);
        deal(address(USDC), sponsor, 1_000e6);
        vm.prank(sponsor);
        USDC.approve(address(escrow), type(uint256).max);
    }

    function test_fork_realUsdc_fundAndPay() public {
        vm.skip(!forked);
        bytes32 ref = keccak256("lancefield:brief:fork-1");
        uint64 deadline = uint64(block.timestamp + 3 days);
        vm.startPrank(sponsor);
        escrow.fund(ref, address(USDC), 250e6, deadline);
        assertEq(USDC.balanceOf(address(escrow)), 250e6);
        escrow.pickWinner(ref, winner, keccak256("lancefield:entry:fork-e1"));
        vm.stopPrank();
        assertEq(USDC.balanceOf(winner), 212.5e6);
        escrow.withdrawFees(address(USDC));
        assertEq(USDC.balanceOf(treasury), 37.5e6);
        assertEq(USDC.balanceOf(address(escrow)), 0);
    }

    function test_fork_realUsdc_reclaim() public {
        vm.skip(!forked);
        bytes32 ref = keccak256("lancefield:brief:fork-2");
        uint64 deadline = uint64(block.timestamp + 1 days);
        vm.prank(sponsor);
        escrow.fund(ref, address(USDC), 400e6, deadline);
        vm.warp(deadline + 14 days + 1);
        vm.prank(sponsor);
        escrow.reclaim(ref);
        assertEq(USDC.balanceOf(sponsor), 1_000e6);
    }

    /// Documented limit: Circle can freeze a wallet, and then no contract can pay it. The prize stays
    /// escrowed; the sponsor can pick another entry or reclaim after the window.
    function test_fork_frozenWinnerCannotBePaid() public {
        vm.skip(!forked);
        bytes32 ref = keccak256("lancefield:brief:fork-3");
        uint64 deadline = uint64(block.timestamp + 1 days);
        vm.prank(sponsor);
        escrow.fund(ref, address(USDC), 100e6, deadline);
        vm.prank(USDC.blacklister());
        USDC.blacklist(winner);
        vm.prank(sponsor);
        vm.expectRevert();
        escrow.pickWinner(ref, winner, bytes32(0));
        assertEq(USDC.balanceOf(address(escrow)), 100e6);
        vm.warp(deadline + 14 days + 1);
        vm.prank(sponsor);
        escrow.reclaim(ref);
        assertEq(USDC.balanceOf(sponsor), 1_000e6);
    }
}
