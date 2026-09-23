// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {BriefEscrow} from "../src/BriefEscrow.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {TokenTransfer} from "../src/TokenTransfer.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockRestrictedToken} from "../src/mocks/MockRestrictedToken.sol";
import {ReentrantReceiver} from "../src/mocks/ReentrantReceiver.sol";
import {RejectingReceiver} from "../src/mocks/RejectingReceiver.sol";

contract BriefEscrowTest is Test {
    MockUSDG usdg;
    MockRestrictedToken stk;
    AgentRegistry registry;
    BriefEscrow escrow;

    address owner = makeAddr("owner");
    address registrar = makeAddr("registrar");
    address feeTo = makeAddr("feeTo");
    address sponsor = makeAddr("sponsor");
    address agentA = makeAddr("agentA");
    address agentB = makeAddr("agentB");
    address stranger = makeAddr("stranger");

    bytes32 constant BRIEF = keccak256("brief-1");
    bytes32 constant ENTRY_A = keccak256("entry-a");
    bytes32 constant ENTRY_B = keccak256("entry-b");
    uint256 constant PRIZE = 1_000e6;
    uint16 constant FEE = 250; // 2.5%
    address constant NATIVE = address(0);

    uint64 subDeadline;
    uint64 judgeDeadline;

    function setUp() public {
        usdg = new MockUSDG();
        stk = new MockRestrictedToken();
        registry = new AgentRegistry();
        escrow = new BriefEscrow(owner, registrar, FEE, feeTo, registry);

        subDeadline = uint64(block.timestamp + 7 days);
        judgeDeadline = uint64(block.timestamp + 14 days);

        usdg.mint(sponsor, 10 * PRIZE);
        vm.prank(sponsor);
        usdg.approve(address(escrow), type(uint256).max);
        vm.deal(sponsor, 100 ether);
    }

    // ------------------------------------------------------------------ helpers

    function _post(bytes32 id, bool earlyPick, bool requireReg) internal {
        vm.prank(sponsor);
        escrow.postBrief(id, address(usdg), PRIZE, subDeadline, judgeDeadline, earlyPick, requireReg);
    }

    function _postNative(bytes32 id, uint256 amount) internal {
        vm.prank(sponsor);
        escrow.postBrief{value: amount}(id, NATIVE, amount, subDeadline, judgeDeadline, false, false);
    }

    function _register(bytes32 id, address agent, bytes32 entry) internal {
        vm.prank(registrar);
        escrow.registerEntry(id, agent, entry);
    }

    function _toJudging() internal {
        vm.warp(subDeadline);
    }

    function _state(bytes32 id) internal view returns (BriefEscrow.State) {
        return escrow.stateOf(id);
    }

    // ------------------------------------------------------------------ constructor / admin

    function test_constructorSetsRoles() public view {
        assertEq(escrow.owner(), owner);
        assertEq(escrow.registrar(), registrar);
        assertEq(escrow.feeBps(), FEE);
        assertEq(escrow.feeRecipient(), feeTo);
        assertEq(address(escrow.registry()), address(registry));
    }

    function test_constructorRejectsFeeAboveMax() public {
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.FeeTooHigh.selector, 501));
        new BriefEscrow(owner, registrar, 501, feeTo, registry);
    }

    function test_constructorRejectsFeeWithoutRecipient() public {
        vm.expectRevert(BriefEscrow.ZeroAddress.selector);
        new BriefEscrow(owner, registrar, 1, address(0), registry);
    }

    function test_constructorAllowsZeroFeeWithoutRecipient() public {
        BriefEscrow e = new BriefEscrow(owner, registrar, 0, address(0), registry);
        assertEq(e.feeBps(), 0);
    }

    function test_setFeeOnlyOwnerAndBounded() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        escrow.setFee(100, feeTo);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.FeeTooHigh.selector, 500 + 1));
        escrow.setFee(501, feeTo);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.FeeUpdated(500, feeTo);
        escrow.setFee(500, feeTo);
        assertEq(escrow.feeBps(), 500);
    }

    function test_feeIsSnapshottedAtPosting() public {
        _post(BRIEF, false, false);
        vm.prank(owner);
        escrow.setFee(500, feeTo);
        _toJudging();
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        // still 2.5%, not 5%
        assertEq(escrow.claimable(address(usdg), feeTo), PRIZE * FEE / 10_000);
    }

    function test_setRegistrarOnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        escrow.setRegistrar(stranger);

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.RegistrarUpdated(stranger);
        escrow.setRegistrar(stranger);
        assertEq(escrow.registrar(), stranger);
    }

    function test_ownershipIsTwoStep() public {
        vm.prank(owner);
        escrow.transferOwnership(stranger);
        assertEq(escrow.owner(), owner);
        vm.prank(stranger);
        escrow.acceptOwnership();
        assertEq(escrow.owner(), stranger);
    }

    // ------------------------------------------------------------------ postBrief

    function test_postErc20EscrowsPrize() public {
        vm.prank(sponsor);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.BriefPosted(
            BRIEF, sponsor, address(usdg), PRIZE, subDeadline, judgeDeadline, FEE, false, false
        );
        escrow.postBrief(BRIEF, address(usdg), PRIZE, subDeadline, judgeDeadline, false, false);

        assertEq(usdg.balanceOf(address(escrow)), PRIZE);
        assertEq(escrow.totalOwed(address(usdg)), PRIZE);
        BriefEscrow.Brief memory b = escrow.getBrief(BRIEF);
        assertEq(b.sponsor, sponsor);
        assertEq(b.prizeAmount, PRIZE);
        assertEq(b.feeBps, FEE);
        assertEq(uint8(b.status), uint8(BriefEscrow.Status.Open));
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Open));
    }

    function test_postNativeEscrowsPrize() public {
        _postNative(BRIEF, 1 ether);
        assertEq(address(escrow).balance, 1 ether);
        assertEq(escrow.totalOwed(NATIVE), 1 ether);
    }

    function test_postNativeWrongValue() public {
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.WrongValue.selector, 1 ether, 0.5 ether));
        escrow.postBrief{value: 0.5 ether}(BRIEF, NATIVE, 1 ether, subDeadline, judgeDeadline, false, false);
    }

    function test_postErc20RejectsMsgValue() public {
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.WrongValue.selector, 0, 1));
        escrow.postBrief{value: 1}(BRIEF, address(usdg), PRIZE, subDeadline, judgeDeadline, false, false);
    }

    function test_postRejectsDuplicateId() public {
        _post(BRIEF, false, false);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.BriefExists.selector, BRIEF));
        escrow.postBrief(BRIEF, address(usdg), PRIZE, subDeadline, judgeDeadline, false, false);
    }

    function test_postRejectsZeroIdAndZeroAmount() public {
        vm.startPrank(sponsor);
        vm.expectRevert(BriefEscrow.InvalidId.selector);
        escrow.postBrief(bytes32(0), address(usdg), PRIZE, subDeadline, judgeDeadline, false, false);
        vm.expectRevert(BriefEscrow.ZeroAmount.selector);
        escrow.postBrief(BRIEF, address(usdg), 0, subDeadline, judgeDeadline, false, false);
        vm.stopPrank();
    }

    function test_postRejectsBadDeadlines() public {
        vm.startPrank(sponsor);
        vm.expectRevert(BriefEscrow.InvalidDeadlines.selector);
        escrow.postBrief(BRIEF, address(usdg), PRIZE, uint64(block.timestamp), judgeDeadline, false, false);
        vm.expectRevert(BriefEscrow.InvalidDeadlines.selector);
        escrow.postBrief(BRIEF, address(usdg), PRIZE, subDeadline, subDeadline, false, false);
        vm.stopPrank();
    }

    function test_postRequireRegisteredNeedsRegistry() public {
        BriefEscrow e = new BriefEscrow(owner, registrar, 0, address(0), AgentRegistry(address(0)));
        vm.prank(sponsor);
        usdg.approve(address(e), PRIZE);
        vm.prank(sponsor);
        vm.expectRevert(BriefEscrow.NoRegistry.selector);
        e.postBrief(BRIEF, address(usdg), PRIZE, subDeadline, judgeDeadline, false, true);
    }

    function test_postRestrictedTokenRevertsCleanlyWithoutStranding() public {
        stk.setAllowlisted(sponsor, true);
        stk.mint(sponsor, PRIZE);
        vm.prank(sponsor);
        stk.approve(address(escrow), PRIZE);
        // escrow itself is not allowlisted, so transferFrom into it is refused
        vm.prank(sponsor);
        vm.expectRevert(
            abi.encodeWithSelector(
                TokenTransfer.TransferFromRejected.selector,
                address(stk),
                sponsor,
                address(escrow),
                PRIZE,
                abi.encodeWithSelector(MockRestrictedToken.NotAllowlisted.selector, address(escrow))
            )
        );
        escrow.postBrief(BRIEF, address(stk), PRIZE, subDeadline, judgeDeadline, false, false);

        assertEq(stk.balanceOf(sponsor), PRIZE);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.None));
        assertEq(escrow.totalOwed(address(stk)), 0);
    }

    // ------------------------------------------------------------------ pause

    function test_pauseBlocksPostingOnly() public {
        _post(BRIEF, false, false);
        _register(BRIEF, agentA, ENTRY_A);

        vm.prank(owner);
        escrow.pause();

        vm.prank(sponsor);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        escrow.postBrief(keccak256("b2"), address(usdg), PRIZE, subDeadline, judgeDeadline, false, false);

        // registering, picking and claiming still work while paused
        _register(BRIEF, agentB, ENTRY_B);
        _toJudging();
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.prank(agentA);
        escrow.claim(address(usdg));
        assertEq(usdg.balanceOf(agentA), PRIZE - PRIZE * FEE / 10_000);

        vm.prank(owner);
        escrow.unpause();
        vm.prank(sponsor);
        escrow.postBrief(
            keccak256("b2"),
            address(usdg),
            PRIZE,
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            false,
            false
        );
    }

    function test_pauseDoesNotBlockExpireOrRefundClaim() public {
        _postNative(BRIEF, 1 ether);
        vm.prank(owner);
        escrow.pause();
        vm.warp(judgeDeadline + 1);
        vm.prank(stranger);
        escrow.expire(BRIEF);
        vm.prank(sponsor);
        escrow.claim(NATIVE);
        assertEq(sponsor.balance, 100 ether);
    }

    function test_pauseOnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        escrow.pause();
    }

    // ------------------------------------------------------------------ registerEntry

    function test_registerEntryOnlyRegistrar() public {
        _post(BRIEF, false, false);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotRegistrar.selector, sponsor));
        escrow.registerEntry(BRIEF, agentA, ENTRY_A);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotRegistrar.selector, owner));
        escrow.registerEntry(BRIEF, agentA, ENTRY_A);
    }

    function test_registerEntryRecordsAgentAndCount() public {
        _post(BRIEF, false, false);
        vm.prank(registrar);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.EntryRegistered(BRIEF, agentA, ENTRY_A);
        escrow.registerEntry(BRIEF, agentA, ENTRY_A);
        assertEq(escrow.entryAgent(BRIEF, ENTRY_A), agentA);
        assertEq(escrow.getBrief(BRIEF).entryCount, 1);
    }

    function test_registerEntryRejectsDuplicateUnknownZeroAndClosed() public {
        _post(BRIEF, false, false);
        _register(BRIEF, agentA, ENTRY_A);
        vm.startPrank(registrar);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.EntryExists.selector, BRIEF, ENTRY_A));
        escrow.registerEntry(BRIEF, agentB, ENTRY_A);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.UnknownBrief.selector, keccak256("nope")));
        escrow.registerEntry(keccak256("nope"), agentA, ENTRY_A);
        vm.expectRevert(BriefEscrow.ZeroAddress.selector);
        escrow.registerEntry(BRIEF, address(0), ENTRY_B);
        vm.expectRevert(BriefEscrow.InvalidId.selector);
        escrow.registerEntry(BRIEF, agentA, bytes32(0));
        vm.warp(subDeadline);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotOpen.selector, BRIEF));
        escrow.registerEntry(BRIEF, agentB, ENTRY_B);
        vm.stopPrank();
    }

    function test_registerEntryRequireRegistered() public {
        _post(BRIEF, false, true);
        vm.prank(registrar);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.AgentNotRegistered.selector, agentA));
        escrow.registerEntry(BRIEF, agentA, ENTRY_A);

        vm.prank(agentA);
        registry.register(keccak256("meta"));
        _register(BRIEF, agentA, ENTRY_A);
        assertEq(escrow.entryAgent(BRIEF, ENTRY_A), agentA);
    }

    // ------------------------------------------------------------------ state machine

    function test_stateTransitionsByTime() public {
        _post(BRIEF, false, false);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Open));
        assertFalse(escrow.canPick(BRIEF));
        vm.warp(subDeadline - 1);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Open));
        vm.warp(subDeadline);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Judging));
        assertTrue(escrow.canPick(BRIEF));
        vm.warp(judgeDeadline);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Judging));
        assertTrue(escrow.canPick(BRIEF));
        vm.warp(judgeDeadline + 1);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Expired));
        assertFalse(escrow.canPick(BRIEF));
    }

    function test_unknownBriefStateIsNone() public view {
        assertEq(uint8(_state(keccak256("nope"))), uint8(BriefEscrow.State.None));
    }

    // ------------------------------------------------------------------ pickWinner

    function test_pickWinnerCreditsNetAndFee() public {
        _post(BRIEF, false, false);
        _register(BRIEF, agentA, ENTRY_A);
        _toJudging();
        uint256 fee = PRIZE * FEE / 10_000;

        vm.prank(sponsor);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.WinnerPicked(BRIEF, agentA, ENTRY_A, PRIZE - fee);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.BriefSettled(BRIEF, 1, fee);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);

        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Settled));
        assertEq(escrow.claimable(address(usdg), agentA), PRIZE - fee);
        assertEq(escrow.claimable(address(usdg), feeTo), fee);
        assertEq(escrow.totalOwed(address(usdg)), PRIZE);

        vm.prank(agentA);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.Claimed(address(usdg), agentA, PRIZE - fee);
        escrow.claim(address(usdg));
        vm.prank(feeTo);
        escrow.claim(address(usdg));
        assertEq(usdg.balanceOf(agentA), PRIZE - fee);
        assertEq(usdg.balanceOf(feeTo), fee);
        assertEq(usdg.balanceOf(address(escrow)), 0);
        assertEq(escrow.totalOwed(address(usdg)), 0);
    }

    function test_pickWinnerZeroFee() public {
        BriefEscrow e = new BriefEscrow(owner, registrar, 0, address(0), registry);
        vm.startPrank(sponsor);
        usdg.approve(address(e), PRIZE);
        e.postBrief(BRIEF, address(usdg), PRIZE, subDeadline, judgeDeadline, false, false);
        _toJudging();
        e.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.stopPrank();
        assertEq(e.claimable(address(usdg), agentA), PRIZE);
        assertEq(e.claimable(address(usdg), address(0)), 0);
    }

    function test_pickWinnerNative() public {
        _postNative(BRIEF, 1 ether);
        _toJudging();
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        uint256 fee = 1 ether * uint256(FEE) / 10_000;
        vm.prank(agentA);
        escrow.claim(NATIVE);
        assertEq(agentA.balance, 1 ether - fee);
        assertEq(escrow.claimable(NATIVE, feeTo), fee);
    }

    function test_pickWinnerWrongCaller() public {
        _post(BRIEF, false, false);
        _toJudging();
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotSponsor.selector, BRIEF, owner));
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.prank(agentA);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotSponsor.selector, BRIEF, agentA));
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
    }

    function test_pickWinnerUnknownBrief() public {
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.UnknownBrief.selector, BRIEF));
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
    }

    function test_pickWinnerTooEarlyUnlessAllowed() public {
        _post(BRIEF, false, false);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotJudging.selector, BRIEF));
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);

        bytes32 early = keccak256("early");
        _post(early, true, false);
        vm.prank(sponsor);
        escrow.pickWinner(early, agentA, ENTRY_A);
        assertEq(uint8(_state(early)), uint8(BriefEscrow.State.Settled));
    }

    function test_pickWinnerTooLate() public {
        _post(BRIEF, false, false);
        vm.warp(judgeDeadline + 1);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotJudging.selector, BRIEF));
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
    }

    function test_pickWinnerAtJudgingDeadlineBoundary() public {
        _post(BRIEF, false, false);
        vm.warp(judgeDeadline);
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
    }

    function test_doublePickReverts() public {
        _post(BRIEF, false, false);
        _toJudging();
        vm.startPrank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotJudging.selector, BRIEF));
        escrow.pickWinner(BRIEF, agentB, ENTRY_B);
        vm.stopPrank();
        assertEq(escrow.claimable(address(usdg), agentB), 0);
    }

    function test_pickWinnerZeroAddress() public {
        _post(BRIEF, false, false);
        _toJudging();
        vm.prank(sponsor);
        vm.expectRevert(BriefEscrow.ZeroAddress.selector);
        escrow.pickWinner(BRIEF, address(0), ENTRY_A);
    }

    function test_pickWinnerEntryMustBelongToWinnerIfRegistered() public {
        _post(BRIEF, false, false);
        _register(BRIEF, agentA, ENTRY_A);
        _toJudging();
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.EntryNotOwnedBy.selector, BRIEF, ENTRY_A, agentB));
        escrow.pickWinner(BRIEF, agentB, ENTRY_A);

        // an unregistered hash is recorded as-is
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, agentB, ENTRY_B);
    }

    function test_pickWinnerRequireRegistered() public {
        _post(BRIEF, false, true);
        _toJudging();
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.AgentNotRegistered.selector, agentA));
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.prank(agentA);
        registry.register(keccak256("meta"));
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
    }

    // ------------------------------------------------------------------ pickWinners

    function _three() internal view returns (address[] memory w, uint256[] memory a, bytes32[] memory h) {
        w = new address[](3);
        a = new uint256[](3);
        h = new bytes32[](3);
        w[0] = agentA;
        w[1] = agentB;
        w[2] = stranger;
        a[0] = 500e6;
        a[1] = 300e6;
        a[2] = 200e6;
        h[0] = ENTRY_A;
        h[1] = ENTRY_B;
        h[2] = keccak256("entry-c");
    }

    function test_pickWinnersSplitsPrize() public {
        _post(BRIEF, false, false);
        _toJudging();
        (address[] memory w, uint256[] memory a, bytes32[] memory h) = _three();
        vm.prank(sponsor);
        escrow.pickWinners(BRIEF, w, a, h);

        uint256 totalFee;
        for (uint256 i; i < 3; ++i) {
            uint256 fee = a[i] * FEE / 10_000;
            totalFee += fee;
            assertEq(escrow.claimable(address(usdg), w[i]), a[i] - fee);
        }
        assertEq(escrow.claimable(address(usdg), feeTo), totalFee);
        // conservation: everything credited equals the prize
        uint256 credited = totalFee;
        for (uint256 i; i < 3; ++i) {
            credited += escrow.claimable(address(usdg), w[i]);
        }
        assertEq(credited, PRIZE);
    }

    function test_pickWinnersSumMismatch() public {
        _post(BRIEF, false, false);
        _toJudging();
        (address[] memory w, uint256[] memory a, bytes32[] memory h) = _three();
        a[2] = 200e6 + 1;
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.SumMismatch.selector, PRIZE, PRIZE + 1));
        escrow.pickWinners(BRIEF, w, a, h);

        a[2] = 200e6 - 1;
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.SumMismatch.selector, PRIZE, PRIZE - 1));
        escrow.pickWinners(BRIEF, w, a, h);

        // nothing was credited and the brief is still pickable
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Judging));
        assertEq(escrow.claimable(address(usdg), agentA), 0);
    }

    function test_pickWinnersLengthMismatch() public {
        _post(BRIEF, false, false);
        _toJudging();
        (address[] memory w, uint256[] memory a,) = _three();
        bytes32[] memory h = new bytes32[](2);
        vm.prank(sponsor);
        vm.expectRevert(BriefEscrow.LengthMismatch.selector);
        escrow.pickWinners(BRIEF, w, a, h);
        uint256[] memory a2 = new uint256[](2);
        h = new bytes32[](3);
        vm.prank(sponsor);
        vm.expectRevert(BriefEscrow.LengthMismatch.selector);
        escrow.pickWinners(BRIEF, w, a2, h);
    }

    function test_pickWinnersBounds() public {
        _post(BRIEF, false, false);
        _toJudging();
        vm.startPrank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.BadWinnerCount.selector, 0));
        escrow.pickWinners(BRIEF, new address[](0), new uint256[](0), new bytes32[](0));

        uint256 n = escrow.MAX_WINNERS() + 1;
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.BadWinnerCount.selector, n));
        escrow.pickWinners(BRIEF, new address[](n), new uint256[](n), new bytes32[](n));
        vm.stopPrank();
    }

    function test_pickWinnersMaxWinners() public {
        _post(BRIEF, false, false);
        _toJudging();
        uint256 n = escrow.MAX_WINNERS();
        address[] memory w = new address[](n);
        uint256[] memory a = new uint256[](n);
        bytes32[] memory h = new bytes32[](n);
        for (uint256 i; i < n; ++i) {
            w[i] = address(uint160(0x1000 + i));
            a[i] = PRIZE / n;
            h[i] = bytes32(i + 1);
        }
        a[n - 1] += PRIZE - (PRIZE / n) * n;
        vm.prank(sponsor);
        escrow.pickWinners(BRIEF, w, a, h);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Settled));
    }

    function test_pickWinnersZeroAmount() public {
        _post(BRIEF, false, false);
        _toJudging();
        (address[] memory w, uint256[] memory a, bytes32[] memory h) = _three();
        a[0] = 0;
        a[1] = PRIZE - 200e6;
        vm.prank(sponsor);
        vm.expectRevert(BriefEscrow.ZeroAmount.selector);
        escrow.pickWinners(BRIEF, w, a, h);
    }

    // ------------------------------------------------------------------ cancel

    function test_cancelWhileOpenWithoutEntries() public {
        _post(BRIEF, false, false);
        vm.prank(sponsor);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.BriefCancelled(BRIEF);
        escrow.cancel(BRIEF);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Cancelled));
        assertEq(escrow.claimable(address(usdg), sponsor), PRIZE);
        vm.prank(sponsor);
        escrow.claim(address(usdg));
        assertEq(usdg.balanceOf(sponsor), 10 * PRIZE);
        assertEq(escrow.totalOwed(address(usdg)), 0);
    }

    function test_cancelRejectedWithEntries() public {
        _post(BRIEF, false, false);
        _register(BRIEF, agentA, ENTRY_A);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.HasEntries.selector, BRIEF, 1));
        escrow.cancel(BRIEF);
    }

    function test_cancelRejectedAfterSubmissionDeadline() public {
        _post(BRIEF, false, false);
        _toJudging();
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotOpen.selector, BRIEF));
        escrow.cancel(BRIEF);
    }

    function test_cancelWrongCallerAndUnknown() public {
        _post(BRIEF, false, false);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotSponsor.selector, BRIEF, stranger));
        escrow.cancel(BRIEF);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.UnknownBrief.selector, keccak256("nope")));
        escrow.cancel(keccak256("nope"));
    }

    function test_cancelTwiceReverts() public {
        _post(BRIEF, false, false);
        vm.startPrank(sponsor);
        escrow.cancel(BRIEF);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotOpen.selector, BRIEF));
        escrow.cancel(BRIEF);
        vm.stopPrank();
    }

    function test_pickAfterCancelReverts() public {
        _post(BRIEF, true, false);
        vm.startPrank(sponsor);
        escrow.cancel(BRIEF);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotJudging.selector, BRIEF));
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ expire

    function test_expireAfterJudgingDeadlineByAnyone() public {
        _post(BRIEF, false, false);
        _register(BRIEF, agentA, ENTRY_A);
        vm.warp(judgeDeadline + 1);
        vm.prank(stranger);
        vm.expectEmit(true, true, true, true);
        emit BriefEscrow.BriefExpired(BRIEF, stranger);
        escrow.expire(BRIEF);
        assertEq(uint8(_state(BRIEF)), uint8(BriefEscrow.State.Refunded));
        // full refund, no fee
        assertEq(escrow.claimable(address(usdg), sponsor), PRIZE);
        assertEq(escrow.claimable(address(usdg), feeTo), 0);
    }

    function test_expireTooEarly() public {
        _post(BRIEF, false, false);
        vm.warp(judgeDeadline);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotExpired.selector, BRIEF));
        escrow.expire(BRIEF);
    }

    function test_expireAfterSettleOrTwiceReverts() public {
        _post(BRIEF, false, false);
        _toJudging();
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.warp(judgeDeadline + 1);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotExpired.selector, BRIEF));
        escrow.expire(BRIEF);

        bytes32 b2 = keccak256("b2");
        uint64 sub2 = uint64(block.timestamp + 1 days);
        uint64 judge2 = uint64(block.timestamp + 2 days);
        vm.prank(sponsor);
        escrow.postBrief(b2, address(usdg), PRIZE, sub2, judge2, false, false);
        vm.warp(judge2 + 1);
        escrow.expire(b2);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotExpired.selector, b2));
        escrow.expire(b2);
    }

    function test_expireUnknown() public {
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.UnknownBrief.selector, BRIEF));
        escrow.expire(BRIEF);
    }

    function test_pickAfterExpireReverts() public {
        _post(BRIEF, false, false);
        vm.warp(judgeDeadline + 1);
        escrow.expire(BRIEF);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotJudging.selector, BRIEF));
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
    }

    // ------------------------------------------------------------------ claim

    function test_claimNothingReverts() public {
        vm.prank(agentA);
        vm.expectRevert(BriefEscrow.NothingToClaim.selector);
        escrow.claim(address(usdg));
    }

    function test_claimAccumulatesAcrossBriefs() public {
        _post(BRIEF, true, false);
        _post(keccak256("b2"), true, false);
        vm.startPrank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        escrow.pickWinner(keccak256("b2"), agentA, ENTRY_B);
        vm.stopPrank();
        uint256 net = PRIZE - PRIZE * FEE / 10_000;
        assertEq(escrow.claimable(address(usdg), agentA), 2 * net);
        vm.prank(agentA);
        escrow.claim(address(usdg));
        assertEq(usdg.balanceOf(agentA), 2 * net);
        vm.prank(agentA);
        vm.expectRevert(BriefEscrow.NothingToClaim.selector);
        escrow.claim(address(usdg));
    }

    function test_claimRestrictedTokenRevertsCleanlyAndStaysClaimable() public {
        stk.setAllowlisted(sponsor, true);
        stk.setAllowlisted(address(escrow), true);
        stk.mint(sponsor, PRIZE);
        vm.startPrank(sponsor);
        stk.approve(address(escrow), PRIZE);
        escrow.postBrief(BRIEF, address(stk), PRIZE, subDeadline, judgeDeadline, true, false);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.stopPrank();

        uint256 net = PRIZE - PRIZE * FEE / 10_000;
        vm.prank(agentA);
        vm.expectRevert(
            abi.encodeWithSelector(
                TokenTransfer.TransferRejected.selector,
                address(stk),
                agentA,
                net,
                abi.encodeWithSelector(MockRestrictedToken.NotAllowlisted.selector, agentA)
            )
        );
        escrow.claim(address(stk));

        // nothing stranded: balance is still claimable and pays out once the agent is verified
        assertEq(escrow.claimable(address(stk), agentA), net);
        assertEq(escrow.totalOwed(address(stk)), PRIZE);
        stk.setAllowlisted(agentA, true);
        vm.prank(agentA);
        escrow.claim(address(stk));
        assertEq(stk.balanceOf(agentA), net);
    }

    function test_claimNativeRejectedReceiverRevertsCleanly() public {
        RejectingReceiver r = new RejectingReceiver();
        _postNative(BRIEF, 1 ether);
        _toJudging();
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, address(r), ENTRY_A);
        uint256 net = 1 ether - 1 ether * uint256(FEE) / 10_000;
        vm.prank(address(r));
        vm.expectRevert(
            abi.encodeWithSelector(
                TokenTransfer.NativeTransferRejected.selector,
                address(r),
                net,
                abi.encodeWithSelector(RejectingReceiver.NoThanks.selector)
            )
        );
        escrow.claim(NATIVE);
        assertEq(escrow.claimable(NATIVE, address(r)), net);
    }

    function test_claimReentrancyIsBlocked() public {
        ReentrantReceiver r = new ReentrantReceiver(escrow);
        _postNative(BRIEF, 1 ether);
        _postNative(keccak256("b2"), 1 ether);
        _toJudging();
        vm.startPrank(sponsor);
        escrow.pickWinner(BRIEF, address(r), ENTRY_A);
        vm.stopPrank();
        uint256 net = 1 ether - 1 ether * uint256(FEE) / 10_000;

        r.claim();

        assertEq(address(r).balance, net);
        assertFalse(r.reentered());
        assertEq(r.attempts(), 1);
        assertEq(r.lastRevert(), abi.encodeWithSignature("ReentrancyGuardReentrantCall()"));
        assertEq(escrow.claimable(NATIVE, address(r)), 0);
        // the second, unrelated brief's ETH is untouched
        assertEq(address(escrow).balance, 1 ether + (1 ether - net));
    }

    // ------------------------------------------------------------------ accounting

    function test_totalOwedTracksEveryPath() public {
        _post(BRIEF, false, false);
        _post(keccak256("b2"), false, false);
        _post(keccak256("b3"), false, false);
        assertEq(escrow.totalOwed(address(usdg)), 3 * PRIZE);

        vm.prank(sponsor);
        escrow.cancel(keccak256("b3"));
        assertEq(escrow.totalOwed(address(usdg)), 3 * PRIZE);

        _toJudging();
        vm.prank(sponsor);
        escrow.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.warp(judgeDeadline + 1);
        escrow.expire(keccak256("b2"));
        assertEq(escrow.totalOwed(address(usdg)), 3 * PRIZE);

        vm.prank(agentA);
        escrow.claim(address(usdg));
        vm.prank(feeTo);
        escrow.claim(address(usdg));
        vm.prank(sponsor);
        escrow.claim(address(usdg));
        assertEq(escrow.totalOwed(address(usdg)), 0);
        assertEq(usdg.balanceOf(address(escrow)), 0);
    }

    // ------------------------------------------------------------------ fuzz

    function testFuzz_singleWinnerConservesPrize(uint96 prize, uint16 fee) public {
        prize = uint96(bound(prize, 1, type(uint96).max));
        fee = uint16(bound(fee, 0, 500));
        BriefEscrow e = new BriefEscrow(owner, registrar, fee, feeTo, registry);
        usdg.mint(sponsor, prize);
        vm.startPrank(sponsor);
        usdg.approve(address(e), prize);
        e.postBrief(BRIEF, address(usdg), prize, subDeadline, judgeDeadline, true, false);
        e.pickWinner(BRIEF, agentA, ENTRY_A);
        vm.stopPrank();

        uint256 expectedFee = uint256(prize) * fee / 10_000;
        assertEq(e.claimable(address(usdg), agentA), prize - expectedFee);
        assertEq(e.claimable(address(usdg), feeTo), expectedFee);
        assertEq(e.claimable(address(usdg), agentA) + e.claimable(address(usdg), feeTo), prize);
        assertLe(expectedFee * 20, uint256(prize)); // never more than 5%
    }

    function testFuzz_multiWinnerSumMustMatch(uint96 prize, uint8 n, uint256 seed) public {
        prize = uint96(bound(prize, 16, type(uint96).max));
        n = uint8(bound(n, 1, 16));
        usdg.mint(sponsor, prize);
        vm.startPrank(sponsor);
        usdg.approve(address(escrow), prize);
        escrow.postBrief(BRIEF, address(usdg), prize, subDeadline, judgeDeadline, true, false);

        address[] memory w = new address[](n);
        uint256[] memory a = new uint256[](n);
        bytes32[] memory h = new bytes32[](n);
        uint256 remaining = prize;
        for (uint256 i; i < n; ++i) {
            w[i] = address(uint160(0x2000 + i));
            h[i] = bytes32(i + 1);
            if (i == n - 1) {
                a[i] = remaining;
            } else {
                uint256 maxHere = remaining - (n - 1 - i); // leave at least 1 per remaining winner
                a[i] = bound(uint256(keccak256(abi.encode(seed, i))), 1, maxHere);
                remaining -= a[i];
            }
        }

        // off by one in either direction fails
        a[n - 1] += 1;
        vm.expectRevert(abi.encodeWithSelector(BriefEscrow.SumMismatch.selector, prize, uint256(prize) + 1));
        escrow.pickWinners(BRIEF, w, a, h);
        a[n - 1] -= 1;

        escrow.pickWinners(BRIEF, w, a, h);
        vm.stopPrank();

        uint256 credited = escrow.claimable(address(usdg), feeTo);
        for (uint256 i; i < n; ++i) {
            credited += escrow.claimable(address(usdg), w[i]);
        }
        assertEq(credited, prize);
    }

    function testFuzz_deadlinesGateEveryAction(uint32 dt) public {
        _post(BRIEF, false, false);
        vm.warp(vm.getBlockTimestamp() + dt);
        uint256 t = block.timestamp;
        BriefEscrow.State s = escrow.stateOf(BRIEF);
        if (t < subDeadline) {
            assertEq(uint8(s), uint8(BriefEscrow.State.Open));
            assertFalse(escrow.canPick(BRIEF));
        } else if (t <= judgeDeadline) {
            assertEq(uint8(s), uint8(BriefEscrow.State.Judging));
            assertTrue(escrow.canPick(BRIEF));
            vm.expectRevert(abi.encodeWithSelector(BriefEscrow.NotExpired.selector, BRIEF));
            escrow.expire(BRIEF);
        } else {
            assertEq(uint8(s), uint8(BriefEscrow.State.Expired));
            assertFalse(escrow.canPick(BRIEF));
            escrow.expire(BRIEF);
            assertEq(escrow.claimable(address(usdg), sponsor), PRIZE);
        }
    }

    function testFuzz_feeSetterBounds(uint16 fee) public {
        vm.prank(owner);
        if (fee > 500) {
            vm.expectRevert(abi.encodeWithSelector(BriefEscrow.FeeTooHigh.selector, fee));
            escrow.setFee(fee, feeTo);
        } else {
            escrow.setFee(fee, feeTo);
            assertEq(escrow.feeBps(), fee);
        }
    }
}
