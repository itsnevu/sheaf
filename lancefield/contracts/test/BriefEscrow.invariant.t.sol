// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {BriefEscrow} from "../src/BriefEscrow.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";

/// @dev Drives BriefEscrow through random posts, entries, picks, cancels, expiries and claims
///      with both USDG and native prizes, and tracks the sum of open prizes and claimables so
///      the invariant can compare it with the contract's own accounting and its balances.
contract EscrowHandler is Test {
    BriefEscrow public escrow;
    MockUSDG public usdg;
    address public registrar;
    address public feeTo;

    address[] public actors;
    bytes32[] public briefs;
    uint256 public nonce;

    // ghost: open prize per token
    mapping(address => uint256) public ghostOpen;
    // ghost: sum of claimables per token
    mapping(address => uint256) public ghostClaimable;

    constructor(BriefEscrow escrow_, MockUSDG usdg_, address registrar_, address feeTo_) {
        escrow = escrow_;
        usdg = usdg_;
        registrar = registrar_;
        feeTo = feeTo_;
        for (uint256 i; i < 4; ++i) {
            address a = address(uint160(0xA000 + i));
            actors.push(a);
            vm.deal(a, 1_000 ether);
            usdg.mint(a, 1_000_000e6);
            vm.prank(a);
            usdg.approve(address(escrow), type(uint256).max);
        }
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function post(uint256 seed, uint96 amount, bool native, bool early, uint32 subDelta, uint32 judgeDelta) external {
        amount = uint96(bound(amount, 1, native ? 10 ether : 100_000e6));
        subDelta = uint32(bound(subDelta, 1, 30 days));
        judgeDelta = uint32(bound(judgeDelta, 1, 30 days));
        bytes32 id = keccak256(abi.encode("brief", nonce++));
        address sponsor = _actor(seed);
        address token = native ? address(0) : address(usdg);
        uint64 sub = uint64(block.timestamp + subDelta);
        uint64 judge = sub + judgeDelta;

        vm.prank(sponsor);
        if (native) {
            escrow.postBrief{value: amount}(id, token, amount, sub, judge, early, false);
        } else {
            escrow.postBrief(id, token, amount, sub, judge, early, false);
        }
        briefs.push(id);
        ghostOpen[token] += amount;
    }

    function registerEntry(uint256 briefSeed, uint256 agentSeed) external {
        if (briefs.length == 0) return;
        bytes32 id = briefs[briefSeed % briefs.length];
        vm.prank(registrar);
        try escrow.registerEntry(id, _actor(agentSeed), keccak256(abi.encode(id, agentSeed))) {} catch {}
    }

    function pick(uint256 briefSeed, uint256 winnerSeed, uint8 split) external {
        if (briefs.length == 0) return;
        bytes32 id = briefs[briefSeed % briefs.length];
        BriefEscrow.Brief memory b = escrow.getBrief(id);
        if (!escrow.canPick(id)) return;

        uint256 n = bound(split, 1, 3);
        if (b.prizeAmount < n) n = 1;
        address[] memory w = new address[](n);
        uint256[] memory a = new uint256[](n);
        bytes32[] memory h = new bytes32[](n);
        uint256 remaining = b.prizeAmount;
        for (uint256 i; i < n; ++i) {
            w[i] = _actor(winnerSeed + i);
            h[i] = keccak256(abi.encode(id, winnerSeed + i));
            a[i] = i == n - 1 ? remaining : remaining / n;
            if (i != n - 1) remaining -= a[i];
        }
        vm.prank(b.sponsor);
        escrow.pickWinners(id, w, a, h);

        ghostOpen[b.prizeToken] -= b.prizeAmount;
        ghostClaimable[b.prizeToken] += b.prizeAmount; // net + fee == prize
    }

    function cancel(uint256 briefSeed) external {
        if (briefs.length == 0) return;
        bytes32 id = briefs[briefSeed % briefs.length];
        BriefEscrow.Brief memory b = escrow.getBrief(id);
        vm.prank(b.sponsor);
        try escrow.cancel(id) {
            ghostOpen[b.prizeToken] -= b.prizeAmount;
            ghostClaimable[b.prizeToken] += b.prizeAmount;
        } catch {}
    }

    function expire(uint256 briefSeed) external {
        if (briefs.length == 0) return;
        bytes32 id = briefs[briefSeed % briefs.length];
        BriefEscrow.Brief memory b = escrow.getBrief(id);
        try escrow.expire(id) {
            ghostOpen[b.prizeToken] -= b.prizeAmount;
            ghostClaimable[b.prizeToken] += b.prizeAmount;
        } catch {}
    }

    function claim(uint256 who, bool native) external {
        address token = native ? address(0) : address(usdg);
        address account = who % 5 == 4 ? feeTo : _actor(who);
        uint256 amount = escrow.claimable(token, account);
        if (amount == 0) return;
        vm.prank(account);
        escrow.claim(token);
        ghostClaimable[token] -= amount;
    }

    function warp(uint32 dt) external {
        vm.warp(block.timestamp + bound(dt, 1, 10 days));
    }
}

contract BriefEscrowInvariantTest is StdInvariant, Test {
    MockUSDG usdg;
    AgentRegistry registry;
    BriefEscrow escrow;
    EscrowHandler handler;

    address owner = makeAddr("owner");
    address registrar = makeAddr("registrar");
    address feeTo = makeAddr("feeTo");

    function setUp() public {
        usdg = new MockUSDG();
        registry = new AgentRegistry();
        escrow = new BriefEscrow(owner, registrar, 300, feeTo, registry);
        handler = new EscrowHandler(escrow, usdg, registrar, feeTo);
        targetContract(address(handler));
    }

    /// @dev Contract balance >= sum of open prizes + claimables, for both assets, and the
    ///      contract's own `totalOwed` matches the ghost accounting exactly.
    function invariant_balanceCoversOwed() public view {
        address native = address(0);
        uint256 owedUsdg = handler.ghostOpen(address(usdg)) + handler.ghostClaimable(address(usdg));
        uint256 owedEth = handler.ghostOpen(native) + handler.ghostClaimable(native);

        assertEq(escrow.totalOwed(address(usdg)), owedUsdg, "usdg totalOwed");
        assertEq(escrow.totalOwed(native), owedEth, "eth totalOwed");
        assertGe(usdg.balanceOf(address(escrow)), owedUsdg, "usdg balance");
        assertGe(address(escrow).balance, owedEth, "eth balance");
    }

    /// @dev Nothing leaks: with no fee-on-transfer and no direct donations, balances equal owed.
    function invariant_noExcessWithoutDonations() public view {
        assertEq(usdg.balanceOf(address(escrow)), escrow.totalOwed(address(usdg)));
        assertEq(address(escrow).balance, escrow.totalOwed(address(0)));
    }
}
