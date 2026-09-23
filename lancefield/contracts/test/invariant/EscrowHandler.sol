// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CommonBase} from "forge-std/Base.sol";
import {StdCheats} from "forge-std/StdCheats.sol";
import {StdUtils} from "forge-std/StdUtils.sol";
import {LancefieldPrizeEscrow as Escrow} from "../../src/LancefieldPrizeEscrow.sol";
import {MockERC20} from "../mocks/Tokens.sol";

/// Drives the escrow through random sequences of funding, picking, reclaiming, time passing, fee
/// withdrawals and fee changes. Every call it makes is a valid one (the suite runs with
/// fail_on_revert = true), and it keeps its own ledger to compare against the contract.
contract EscrowHandler is CommonBase, StdCheats, StdUtils {
    Escrow public immutable escrow;
    MockERC20 public immutable usdc;
    address public immutable owner;
    bool public immutable feeChanges;
    address internal constant ETH = address(0);

    address[] internal sponsors;
    address[] internal winners;

    struct Tracked {
        bytes32 id;
        bytes32 ref;
        address sponsor;
        address token;
        uint256 amount;
        uint64 deadline;
        Escrow.Status status;
    }

    Tracked[] public tracked;
    uint256 internal nonce;

    // ghost ledger, per token
    mapping(address => uint256) public funded;
    mapping(address => uint256) public open;
    mapping(address => uint256) public paidToWinners;
    mapping(address => uint256) public reclaimed;
    mapping(address => uint256) public feesTaken;
    mapping(address => uint256) public feesWithdrawn;
    bool public feeOverCap;

    uint256 public calls;
    // how many calls actually changed state (the rest were skipped as not yet valid)
    uint256 public funds;
    uint256 public picks;
    uint256 public reclaims;
    uint256 public withdrawals;

    constructor(Escrow escrow_, MockERC20 usdc_, address owner_, bool feeChanges_) {
        escrow = escrow_;
        usdc = usdc_;
        owner = owner_;
        feeChanges = feeChanges_;
        for (uint256 i; i < 3; ++i) {
            sponsors.push(makeAddr(string.concat("sponsor", vm.toString(i))));
            winners.push(makeAddr(string.concat("winner", vm.toString(i))));
        }
    }

    function trackedCount() external view returns (uint256) {
        return tracked.length;
    }

    function trackedAt(uint256 i) external view returns (Tracked memory) {
        return tracked[i];
    }

    function fund(uint256 sponsorSeed, bool useEth, uint256 amount, uint256 lead) external {
        calls++;
        address sponsor = sponsors[sponsorSeed % sponsors.length];
        address token = useEth ? ETH : address(usdc);
        amount = useEth ? bound(amount, 1, 1_000 ether) : bound(amount, 1, 1e15 * 1e6);
        // Mostly short deadlines so reclaims happen within a run; testFuzz_windows covers the full 180 days.
        uint64 deadline = uint64(block.timestamp + bound(lead, 1, 45 days));
        bytes32 ref = keccak256(abi.encode("lancefield:brief:", ++nonce));

        if (useEth) {
            vm.deal(sponsor, amount);
            vm.prank(sponsor);
            escrow.fund{value: amount}(ref, ETH, amount, deadline);
        } else {
            usdc.mint(sponsor, amount);
            vm.startPrank(sponsor);
            usdc.approve(address(escrow), amount);
            escrow.fund(ref, token, amount, deadline);
            vm.stopPrank();
        }
        tracked.push(Tracked(escrow.escrowIdOf(sponsor, ref), ref, sponsor, token, amount, deadline, Escrow.Status.Funded));
        funded[token] += amount;
        open[token] += amount;
        funds++;
    }

    function pick(uint256 index, uint256 winnerSeed) external {
        calls++;
        if (tracked.length == 0) return;
        Tracked storage t = tracked[index % tracked.length];
        if (t.status != Escrow.Status.Funded || block.timestamp > uint256(t.deadline) + escrow.PICK_WINDOW()) return;
        address winner = winners[winnerSeed % winners.length];
        uint256 feeBps = escrow.getEscrowById(t.id).feeBps;
        uint256 fee = (t.amount * feeBps) / 10_000;
        if (fee * 10_000 > t.amount * escrow.MAX_FEE_BPS()) feeOverCap = true;

        uint256 before = t.token == ETH ? winner.balance : usdc.balanceOf(winner);
        vm.prank(t.sponsor);
        escrow.pickWinner(t.ref, winner, keccak256(abi.encode("entry", index)));
        uint256 got = (t.token == ETH ? winner.balance : usdc.balanceOf(winner)) - before;

        t.status = Escrow.Status.Paid;
        open[t.token] -= t.amount;
        paidToWinners[t.token] += got;
        feesTaken[t.token] += fee;
        picks++;
    }

    function reclaim(uint256 index) external {
        calls++;
        if (tracked.length == 0) return;
        Tracked storage t = tracked[index % tracked.length];
        if (t.status != Escrow.Status.Funded || block.timestamp <= uint256(t.deadline) + escrow.PICK_WINDOW()) return;
        vm.prank(t.sponsor);
        escrow.reclaim(t.ref);
        t.status = Escrow.Status.Reclaimed;
        open[t.token] -= t.amount;
        reclaimed[t.token] += t.amount;
        reclaims++;
    }

    function warp(uint256 secondsAhead) external {
        calls++;
        vm.warp(block.timestamp + bound(secondsAhead, 0, 30 days));
    }

    function withdrawFees(bool useEth) external {
        calls++;
        address token = useEth ? ETH : address(usdc);
        uint256 amount = escrow.accruedFees(token);
        if (amount == 0) return;
        escrow.withdrawFees(token);
        feesWithdrawn[token] += amount;
        withdrawals++;
    }

    function setFee(uint256 fee) external {
        calls++;
        if (!feeChanges) return;
        uint16 next = uint16(bound(fee, 0, escrow.MAX_FEE_BPS()));
        vm.prank(owner);
        escrow.setFeeBps(next);
    }
}
