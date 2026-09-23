// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LancefieldPrizeEscrow as Escrow} from "../src/LancefieldPrizeEscrow.sol";
import {FeeOnTransferToken, MockERC20, NoReturnToken, ReentrantToken} from "./mocks/Tokens.sol";
import {ReentrantSponsor, ReentrantWinner, RevertingReceiver} from "./mocks/Receivers.sol";

contract LancefieldPrizeEscrowTest is Test {
    Escrow internal escrow;
    MockERC20 internal usdc;

    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");
    address internal sponsor = makeAddr("sponsor");
    address internal winner = makeAddr("winner");
    address internal stranger = makeAddr("stranger");

    address internal constant ETH = address(0);
    uint16 internal constant FEE = 1_500;
    bytes32 internal constant REF = keccak256("lancefield:brief:brief-1");
    bytes32 internal constant ENTRY = keccak256("lancefield:entry:entry-1");
    uint256 internal constant PRIZE = 250e6;

    uint64 internal deadline;

    event PrizeFunded(bytes32 indexed escrowId, bytes32 indexed briefRef, address indexed sponsor, address token, uint256 amount, uint16 feeBps, uint64 deadline);
    event WinnerPaid(bytes32 indexed escrowId, bytes32 indexed briefRef, address indexed winner, bytes32 entryRef, address token, uint256 payout, uint256 fee);
    event PrizeReclaimed(bytes32 indexed escrowId, bytes32 indexed briefRef, address indexed sponsor, address token, uint256 amount);

    function setUp() public {
        vm.warp(1_780_000_000);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        address[] memory tokens = new address[](2);
        tokens[0] = address(usdc);
        tokens[1] = ETH;
        escrow = new Escrow(owner, treasury, FEE, tokens);
        deadline = uint64(block.timestamp + 7 days);
        usdc.mint(sponsor, 1_000_000e6);
        vm.deal(sponsor, 1_000 ether);
        vm.prank(sponsor);
        usdc.approve(address(escrow), type(uint256).max);
    }

    /* ── helpers ── */

    function _fundUsdc(bytes32 ref, uint256 amount) internal returns (bytes32 id) {
        vm.prank(sponsor);
        id = escrow.fund(ref, address(usdc), amount, deadline);
    }

    function _fundEth(bytes32 ref, uint256 amount) internal returns (bytes32 id) {
        vm.prank(sponsor);
        id = escrow.fund{value: amount}(ref, ETH, amount, deadline);
    }

    /* ── constructor and config ── */

    function test_constructor_setsConfig() public view {
        assertEq(escrow.owner(), owner);
        assertEq(escrow.feeRecipient(), treasury);
        assertEq(escrow.feeBps(), FEE);
        assertTrue(escrow.isTokenAllowed(address(usdc)));
        assertTrue(escrow.isTokenAllowed(ETH));
        assertFalse(escrow.isTokenAllowed(address(0xBEEF)));
        assertEq(escrow.PICK_WINDOW(), 14 days);
        assertEq(escrow.MAX_FEE_BPS(), 1_500);
    }

    function test_constructor_rejectsFeeAboveCap() public {
        vm.expectRevert(abi.encodeWithSelector(Escrow.FeeTooHigh.selector, uint16(1_501), uint16(1_500)));
        new Escrow(owner, treasury, 1_501, new address[](0));
    }

    function test_constructor_rejectsZeroOwnerAndRecipient() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new Escrow(address(0), treasury, 0, new address[](0));
        vm.expectRevert(Escrow.ZeroAddress.selector);
        new Escrow(owner, address(0), 0, new address[](0));
    }

    function test_constructor_rejectsTokenWithoutCode() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(0xBEEF);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NotAContract.selector, address(0xBEEF)));
        new Escrow(owner, treasury, 0, tokens);
    }

    /* ── fund ── */

    function test_fund_usdc_holdsPrizeAndEmits() public {
        bytes32 id = escrow.escrowIdOf(sponsor, REF);
        vm.expectEmit(address(escrow));
        emit PrizeFunded(id, REF, sponsor, address(usdc), PRIZE, FEE, deadline);
        bytes32 got = _fundUsdc(REF, PRIZE);
        assertEq(got, id);

        Escrow.Escrow memory e = escrow.getEscrow(sponsor, REF);
        assertEq(e.sponsor, sponsor);
        assertEq(e.token, address(usdc));
        assertEq(e.amount, PRIZE);
        assertEq(e.deadline, deadline);
        assertEq(e.feeBps, FEE);
        assertEq(uint8(e.status), uint8(Escrow.Status.Funded));
        assertEq(usdc.balanceOf(address(escrow)), PRIZE);
        assertEq(escrow.totalEscrowed(address(usdc)), PRIZE);
        assertEq(abi.encode(escrow.getEscrowById(id)), abi.encode(e));
    }

    function test_fund_eth_holdsPrize() public {
        _fundEth(REF, 1 ether);
        assertEq(address(escrow).balance, 1 ether);
        assertEq(escrow.totalEscrowed(ETH), 1 ether);
        assertEq(uint8(escrow.getEscrow(sponsor, REF).status), uint8(Escrow.Status.Funded));
    }

    function test_fund_rejectsDisallowedToken() public {
        MockERC20 other = new MockERC20("Other", "OTH", 18);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.TokenNotAllowed.selector, address(other)));
        escrow.fund(REF, address(other), 1, deadline);
    }

    function test_fund_rejectsZeroAndHugeAmounts() public {
        vm.startPrank(sponsor);
        vm.expectRevert(Escrow.ZeroAmount.selector);
        escrow.fund(REF, address(usdc), 0, deadline);
        uint256 huge = uint256(type(uint96).max) + 1;
        vm.expectRevert(abi.encodeWithSelector(Escrow.AmountTooLarge.selector, huge));
        escrow.fund(REF, address(usdc), huge, deadline);
        vm.stopPrank();
    }

    function test_fund_rejectsBadDeadlines() public {
        vm.startPrank(sponsor);
        uint64 past = uint64(block.timestamp);
        vm.expectRevert(abi.encodeWithSelector(Escrow.BadDeadline.selector, past));
        escrow.fund(REF, address(usdc), PRIZE, past);
        uint64 tooFar = uint64(block.timestamp + 180 days + 1);
        vm.expectRevert(abi.encodeWithSelector(Escrow.BadDeadline.selector, tooFar));
        escrow.fund(REF, address(usdc), PRIZE, tooFar);
        // the far edge itself is fine
        escrow.fund(REF, address(usdc), PRIZE, uint64(block.timestamp + 180 days));
        vm.stopPrank();
    }

    function test_fund_rejectsWrongValue() public {
        vm.startPrank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.WrongValue.selector, 0.5 ether, 1 ether));
        escrow.fund{value: 0.5 ether}(REF, ETH, 1 ether, deadline);
        vm.expectRevert(abi.encodeWithSelector(Escrow.WrongValue.selector, 1, 0));
        escrow.fund{value: 1}(REF, address(usdc), PRIZE, deadline);
        vm.stopPrank();
    }

    function test_fund_onlyOncePerKey() public {
        bytes32 id = _fundUsdc(REF, PRIZE);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.AlreadyFunded.selector, id));
        escrow.fund(REF, address(usdc), PRIZE, deadline);
    }

    function test_fund_sameRefDifferentSponsorsAreSeparate() public {
        // A front-runner cannot squat a sponsor's brief: the key includes the sponsor.
        usdc.mint(stranger, 1e6);
        vm.startPrank(stranger);
        usdc.approve(address(escrow), 1e6);
        escrow.fund(REF, address(usdc), 1e6, deadline);
        vm.stopPrank();
        _fundUsdc(REF, PRIZE);
        assertEq(escrow.getEscrow(sponsor, REF).amount, PRIZE);
        assertEq(escrow.getEscrow(stranger, REF).amount, 1e6);
    }

    function test_fund_rejectsFeeOnTransferToken() public {
        FeeOnTransferToken fot = new FeeOnTransferToken();
        vm.prank(owner);
        escrow.setTokenAllowed(address(fot), true);
        fot.mint(sponsor, 100 ether);
        vm.startPrank(sponsor);
        fot.approve(address(escrow), 100 ether);
        vm.expectRevert(abi.encodeWithSelector(Escrow.UnsupportedToken.selector, address(fot), 99 ether, 100 ether));
        escrow.fund(REF, address(fot), 100 ether, deadline);
        vm.stopPrank();
    }

    function test_fund_noReturnTokenWorksThroughSafeERC20() public {
        NoReturnToken nrt = new NoReturnToken();
        vm.prank(owner);
        escrow.setTokenAllowed(address(nrt), true);
        nrt.mint(sponsor, 500e6);
        vm.startPrank(sponsor);
        nrt.approve(address(escrow), 500e6);
        escrow.fund(REF, address(nrt), 500e6, deadline);
        escrow.pickWinner(REF, winner, ENTRY);
        vm.stopPrank();
        assertEq(nrt.balanceOf(winner), 425e6);
        assertEq(nrt.balanceOf(address(escrow)), 75e6);
    }

    function test_fund_withoutAllowanceReverts() public {
        vm.prank(sponsor);
        usdc.approve(address(escrow), 0);
        vm.prank(sponsor);
        vm.expectRevert();
        escrow.fund(REF, address(usdc), PRIZE, deadline);
    }

    function test_plainEthTransferIsRefused() public {
        vm.prank(sponsor);
        (bool ok,) = address(escrow).call{value: 1 ether}("");
        assertFalse(ok);
    }

    /* ── pickWinner ── */

    function test_pickWinner_paysWinnerLessFee() public {
        bytes32 id = _fundUsdc(REF, PRIZE);
        vm.expectEmit(address(escrow));
        emit WinnerPaid(id, REF, winner, ENTRY, address(usdc), 212.5e6, 37.5e6);
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);

        assertEq(usdc.balanceOf(winner), 212.5e6);
        assertEq(usdc.balanceOf(address(escrow)), 37.5e6);
        assertEq(escrow.accruedFees(address(usdc)), 37.5e6);
        assertEq(escrow.totalEscrowed(address(usdc)), 0);
        Escrow.Escrow memory e = escrow.getEscrow(sponsor, REF);
        assertEq(uint8(e.status), uint8(Escrow.Status.Paid));
        assertEq(e.winner, winner);
        assertEq(e.entryRef, ENTRY);
    }

    function test_pickWinner_eth() public {
        _fundEth(REF, 2 ether);
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        assertEq(winner.balance, 1.7 ether);
        assertEq(escrow.accruedFees(ETH), 0.3 ether);
        assertEq(address(escrow).balance, 0.3 ether);
    }

    function test_pickWinner_allowedBeforeDeadlineAndAtWindowEdge() public {
        _fundUsdc(REF, PRIZE);
        _fundUsdc(keccak256("second"), PRIZE);
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY); // before the deadline: the sponsor may end early
        vm.warp(deadline + 14 days); // last second of the window
        vm.prank(sponsor);
        escrow.pickWinner(keccak256("second"), winner, ENTRY);
        assertEq(usdc.balanceOf(winner), 425e6);
    }

    function test_pickWinner_closedAfterWindow() public {
        _fundUsdc(REF, PRIZE);
        vm.warp(deadline + 14 days + 1);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.PickWindowClosed.selector, deadline + 14 days));
        escrow.pickWinner(REF, winner, ENTRY);
    }

    function test_pickWinner_onlySponsor() public {
        _fundUsdc(REF, PRIZE);
        // Anyone else computes a different escrow id, which is empty.
        bytes32 strangerId = escrow.escrowIdOf(stranger, REF);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NotFunded.selector, strangerId));
        escrow.pickWinner(REF, stranger, ENTRY);
        bytes32 ownerId = escrow.escrowIdOf(owner, REF);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NotFunded.selector, ownerId));
        escrow.pickWinner(REF, owner, ENTRY);
        assertEq(usdc.balanceOf(address(escrow)), PRIZE);
    }

    function test_pickWinner_rejectsBadWinners() public {
        _fundUsdc(REF, PRIZE);
        vm.startPrank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.InvalidWinner.selector, address(0)));
        escrow.pickWinner(REF, address(0), ENTRY);
        vm.expectRevert(abi.encodeWithSelector(Escrow.InvalidWinner.selector, address(escrow)));
        escrow.pickWinner(REF, address(escrow), ENTRY);
        vm.expectRevert(abi.encodeWithSelector(Escrow.InvalidWinner.selector, sponsor));
        escrow.pickWinner(REF, sponsor, ENTRY);
        vm.stopPrank();
    }

    function test_pickWinner_onlyOnce() public {
        bytes32 id = _fundUsdc(REF, PRIZE);
        vm.startPrank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NotFunded.selector, id));
        escrow.pickWinner(REF, stranger, ENTRY);
        vm.stopPrank();
    }

    function test_pickWinner_unfundedReverts() public {
        bytes32 id = escrow.escrowIdOf(sponsor, REF);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NotFunded.selector, id));
        escrow.pickWinner(REF, winner, ENTRY);
    }

    function test_pickWinner_ethToRefusingWalletRevertsAndKeepsPrize() public {
        RevertingReceiver bad = new RevertingReceiver();
        _fundEth(REF, 1 ether);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NativeTransferFailed.selector, address(bad), 0.85 ether));
        escrow.pickWinner(REF, address(bad), ENTRY);
        assertEq(uint8(escrow.getEscrow(sponsor, REF).status), uint8(Escrow.Status.Funded));
        assertEq(address(escrow).balance, 1 ether);
        // The sponsor can still pay someone who accepts ETH.
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        assertEq(winner.balance, 0.85 ether);
    }

    function test_pickWinner_usesFeeSnapshotNotCurrentFee() public {
        _fundUsdc(REF, PRIZE);
        vm.prank(owner);
        escrow.setFeeBps(0);
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        assertEq(usdc.balanceOf(winner), 212.5e6); // still 15%: the rate in force when it was funded
        _fundUsdc(keccak256("after"), PRIZE);
        vm.prank(sponsor);
        escrow.pickWinner(keccak256("after"), stranger, ENTRY);
        assertEq(usdc.balanceOf(stranger), PRIZE); // funded at 0%
    }

    function test_pickWinner_stillWorksAfterTokenIsDisallowed() public {
        _fundUsdc(REF, PRIZE);
        vm.prank(owner);
        escrow.setTokenAllowed(address(usdc), false);
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        assertEq(usdc.balanceOf(winner), 212.5e6);
    }

    /* ── reclaim ── */

    function test_reclaim_afterWindowReturnsEverything() public {
        bytes32 id = _fundUsdc(REF, PRIZE);
        uint256 before = usdc.balanceOf(sponsor);
        vm.warp(deadline + 14 days + 1);
        vm.expectEmit(address(escrow));
        emit PrizeReclaimed(id, REF, sponsor, address(usdc), PRIZE);
        vm.prank(sponsor);
        escrow.reclaim(REF);
        assertEq(usdc.balanceOf(sponsor), before + PRIZE);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        assertEq(escrow.totalEscrowed(address(usdc)), 0);
        assertEq(escrow.accruedFees(address(usdc)), 0);
        assertEq(uint8(escrow.getEscrow(sponsor, REF).status), uint8(Escrow.Status.Reclaimed));
    }

    function test_reclaim_eth() public {
        _fundEth(REF, 1 ether);
        uint256 before = sponsor.balance;
        vm.warp(deadline + 15 days);
        vm.prank(sponsor);
        escrow.reclaim(REF);
        assertEq(sponsor.balance, before + 1 ether);
    }

    function test_reclaim_notBeforeWindowEnds() public {
        _fundUsdc(REF, PRIZE);
        vm.startPrank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.PickWindowOpen.selector, deadline + 14 days));
        escrow.reclaim(REF);
        vm.warp(deadline + 14 days);
        vm.expectRevert(abi.encodeWithSelector(Escrow.PickWindowOpen.selector, deadline + 14 days));
        escrow.reclaim(REF);
        vm.stopPrank();
    }

    function test_reclaim_onlySponsorAndOnlyOnce() public {
        bytes32 id = _fundUsdc(REF, PRIZE);
        vm.warp(deadline + 15 days);
        bytes32 strangerId = escrow.escrowIdOf(stranger, REF);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NotFunded.selector, strangerId));
        escrow.reclaim(REF);
        vm.startPrank(sponsor);
        escrow.reclaim(REF);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NotFunded.selector, id));
        escrow.reclaim(REF);
        vm.stopPrank();
    }

    function test_reclaim_impossibleAfterPayout() public {
        bytes32 id = _fundUsdc(REF, PRIZE);
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        vm.warp(deadline + 30 days);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NotFunded.selector, id));
        escrow.reclaim(REF);
    }

    /* ── fees ── */

    function test_withdrawFees_sendsOnlyFeesToRecipient() public {
        _fundUsdc(REF, PRIZE);
        _fundUsdc(keccak256("open"), 1_000e6); // stays open
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        vm.prank(stranger); // anyone may trigger it; the money only goes to the fee recipient
        escrow.withdrawFees(address(usdc));
        assertEq(usdc.balanceOf(treasury), 37.5e6);
        assertEq(usdc.balanceOf(address(escrow)), 1_000e6);
        assertEq(escrow.accruedFees(address(usdc)), 0);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NothingToWithdraw.selector, address(usdc)));
        escrow.withdrawFees(address(usdc));
    }

    function test_withdrawFees_eth() public {
        _fundEth(REF, 1 ether);
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        escrow.withdrawFees(ETH);
        assertEq(treasury.balance, 0.15 ether);
        assertEq(address(escrow).balance, 0);
    }

    /* ── owner powers stop at fees and the allow-list ── */

    function test_owner_setters() public {
        vm.startPrank(owner);
        escrow.setFeeBps(500);
        assertEq(escrow.feeBps(), 500);
        vm.expectRevert(abi.encodeWithSelector(Escrow.FeeTooHigh.selector, uint16(1_501), uint16(1_500)));
        escrow.setFeeBps(1_501);
        escrow.setFeeRecipient(stranger);
        assertEq(escrow.feeRecipient(), stranger);
        vm.expectRevert(Escrow.ZeroAddress.selector);
        escrow.setFeeRecipient(address(0));
        escrow.setTokenAllowed(ETH, false);
        assertFalse(escrow.isTokenAllowed(ETH));
        vm.stopPrank();
    }

    function test_owner_settersAreOwnerOnly() public {
        vm.startPrank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        escrow.setFeeBps(0);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        escrow.setFeeRecipient(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        escrow.setTokenAllowed(address(usdc), false);
        vm.stopPrank();
    }

    function test_owner_cannotTouchEscrowedPrize() public {
        _fundUsdc(REF, PRIZE);
        _fundEth(keccak256("eth"), 1 ether);
        vm.startPrank(owner);
        escrow.setFeeRecipient(owner);
        escrow.setFeeBps(1_500);
        escrow.setTokenAllowed(address(usdc), false);
        escrow.setTokenAllowed(ETH, false);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NothingToWithdraw.selector, address(usdc)));
        escrow.withdrawFees(address(usdc));
        vm.expectRevert(abi.encodeWithSelector(Escrow.NothingToWithdraw.selector, ETH));
        escrow.withdrawFees(ETH);
        vm.expectRevert();
        escrow.reclaim(REF);
        vm.stopPrank();
        assertEq(usdc.balanceOf(address(escrow)), PRIZE);
        assertEq(address(escrow).balance, 1 ether);
        // ...and the sponsor can still settle both.
        vm.warp(deadline + 15 days);
        vm.startPrank(sponsor);
        escrow.reclaim(REF);
        escrow.reclaim(keccak256("eth"));
        vm.stopPrank();
    }

    function test_owner_twoStepTransfer() public {
        vm.prank(owner);
        escrow.transferOwnership(stranger);
        assertEq(escrow.owner(), owner);
        vm.prank(stranger);
        escrow.acceptOwnership();
        assertEq(escrow.owner(), stranger);
    }

    /* ── reentrancy ── */

    function test_reentrancy_sponsorCannotReclaimTwice() public {
        ReentrantSponsor attacker = new ReentrantSponsor(escrow);
        attacker.fund{value: 1 ether}(REF, deadline);
        _fundEth(keccak256("victim"), 5 ether); // other money in the contract
        vm.warp(deadline + 15 days);
        // The nested reclaim reverts, so the ETH transfer fails and the whole reclaim reverts.
        vm.expectRevert(abi.encodeWithSelector(Escrow.NativeTransferFailed.selector, address(attacker), 1 ether));
        attacker.reclaim();
        assertEq(address(escrow).balance, 6 ether);
    }

    function test_reentrancy_winnerCannotReenter() public {
        ReentrantWinner w = new ReentrantWinner(escrow);
        _fundEth(REF, 1 ether);
        vm.prank(sponsor);
        vm.expectRevert(abi.encodeWithSelector(Escrow.NativeTransferFailed.selector, address(w), 0.85 ether));
        escrow.pickWinner(REF, address(w), ENTRY);
        assertEq(address(escrow).balance, 1 ether);
    }

    function test_reentrancy_tokenCallbackIsBlocked() public {
        ReentrantToken rt = new ReentrantToken();
        vm.prank(owner);
        escrow.setTokenAllowed(address(rt), true);
        rt.mint(sponsor, 10 ether);
        vm.prank(sponsor);
        rt.approve(address(escrow), 10 ether);
        rt.arm(address(escrow), abi.encodeCall(Escrow.withdrawFees, (address(rt))));
        vm.prank(sponsor);
        escrow.fund(REF, address(rt), 10 ether, deadline);
        assertTrue(rt.attempted());
        assertFalse(rt.succeeded()); // ReentrancyGuardReentrantCall
        assertEq(rt.balanceOf(address(escrow)), 10 ether);
    }

    /* ── fuzz ── */

    function testFuzz_payoutPlusFeeEqualsPrize(uint96 amount, uint16 fee) public {
        amount = uint96(bound(amount, 1, type(uint96).max));
        fee = uint16(bound(fee, 0, 1_500));
        vm.prank(owner);
        escrow.setFeeBps(fee);
        usdc.mint(sponsor, amount);
        _fundUsdc(REF, amount);
        uint256 before = usdc.balanceOf(winner);
        vm.prank(sponsor);
        escrow.pickWinner(REF, winner, ENTRY);
        uint256 paid = usdc.balanceOf(winner) - before;
        uint256 feeTaken = escrow.accruedFees(address(usdc));
        assertEq(paid + feeTaken, amount);
        assertLe(feeTaken * 10_000, uint256(amount) * 1_500);
        assertEq(feeTaken, (uint256(amount) * fee) / 10_000);
    }

    function testFuzz_windows(uint64 lead, uint64 wait) public {
        lead = uint64(bound(lead, 1, 180 days));
        wait = uint64(bound(wait, 0, 400 days));
        uint64 d = uint64(block.timestamp) + lead;
        vm.prank(sponsor);
        escrow.fund(REF, address(usdc), PRIZE, d);
        vm.warp(block.timestamp + wait);
        bool pickOpen = block.timestamp <= uint256(d) + 14 days;
        vm.prank(sponsor);
        if (pickOpen) {
            vm.expectRevert(abi.encodeWithSelector(Escrow.PickWindowOpen.selector, d + 14 days));
            escrow.reclaim(REF);
            vm.prank(sponsor);
            escrow.pickWinner(REF, winner, ENTRY);
            assertEq(uint8(escrow.getEscrow(sponsor, REF).status), uint8(Escrow.Status.Paid));
        } else {
            vm.expectRevert(abi.encodeWithSelector(Escrow.PickWindowClosed.selector, d + 14 days));
            escrow.pickWinner(REF, winner, ENTRY);
            vm.prank(sponsor);
            escrow.reclaim(REF);
            assertEq(uint8(escrow.getEscrow(sponsor, REF).status), uint8(Escrow.Status.Reclaimed));
        }
    }

    function testFuzz_strangersCannotMoveFunds(address who, bytes32 ref, address to) public {
        vm.assume(who != sponsor);
        assumeNotForgeAddress(who);
        _fundUsdc(REF, PRIZE);
        vm.warp(deadline + 15 days);
        vm.startPrank(who);
        vm.expectRevert();
        escrow.reclaim(REF);
        vm.expectRevert();
        escrow.pickWinner(REF, to, ref);
        vm.stopPrank();
        assertEq(usdc.balanceOf(address(escrow)), PRIZE);
    }
}
