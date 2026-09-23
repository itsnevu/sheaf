// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SheafBatchPayer} from "../src/SheafBatchPayer.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";
import {HookToken, InflatingToken, Reentrant, RejectsEther, ReturnBomb, ReturnsFalseToken} from "./mocks/Misbehaving.sol";

contract SheafBatchPayerTest is Test {
    SheafBatchPayer internal payer;
    MockERC20 internal usdc;
    MockUSDT internal usdt;
    address internal treasury = makeAddr("treasury");
    bytes32 internal constant BATCH = keccak256("batch-1");

    event PaymentExecuted(bytes32 indexed batchId, bytes32 indexed paymentId, address indexed payer, address token, address recipient, uint256 amount);
    event BatchExecuted(bytes32 indexed batchId, address indexed payer, address indexed token, uint256 count, uint256 total);

    function setUp() public {
        payer = new SheafBatchPayer();
        usdc = new MockERC20("USD Coin (mock)", "USDC", 6);
        usdt = new MockUSDT();
        usdc.mint(treasury, 10_000_000e6);
        usdt.mint(treasury, 10_000_000e6);
        vm.deal(treasury, 1_000 ether);
    }

    /* ─────────── helpers ─────────── */

    function _recipient(uint256 i) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encode("recipient", i)))));
    }

    function _batch(uint256 n, uint256 base, bytes32 salt) internal pure returns (SheafBatchPayer.Payment[] memory ps, uint256 total) {
        ps = new SheafBatchPayer.Payment[](n);
        for (uint256 i; i < n; ++i) {
            uint256 amount = base + i;
            ps[i] = SheafBatchPayer.Payment({recipient: _recipient(i), amount: amount, paymentId: keccak256(abi.encode(salt, i))});
            total += amount;
        }
    }

    function _one(address to, uint256 amount, bytes32 id) internal pure returns (SheafBatchPayer.Payment[] memory ps) {
        ps = new SheafBatchPayer.Payment[](1);
        ps[0] = SheafBatchPayer.Payment({recipient: to, amount: amount, paymentId: id});
    }

    /* ─────────── ERC-20 ─────────── */

    function test_payERC20_paysEveryRecipientExactly() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(30, 1_000e6, "s");
        vm.prank(treasury);
        usdc.approve(address(payer), total);
        uint256 before = usdc.balanceOf(treasury);

        vm.prank(treasury);
        uint256 paid = payer.payERC20(usdc, BATCH, ps);

        assertEq(paid, total);
        assertEq(usdc.balanceOf(treasury), before - total);
        for (uint256 i; i < ps.length; ++i) {
            assertEq(usdc.balanceOf(ps[i].recipient), ps[i].amount);
            assertTrue(payer.isProcessed(treasury, ps[i].paymentId));
        }
        assertEq(usdc.balanceOf(address(payer)), 0, "never holds tokens");
        assertEq(usdc.allowance(treasury, address(payer)), 0, "exact allowance fully used");
    }

    function test_payERC20_emitsOneEventPerPaymentAndOneSummary() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(3, 5e6, "e");
        vm.prank(treasury);
        usdc.approve(address(payer), total);
        for (uint256 i; i < ps.length; ++i) {
            vm.expectEmit(true, true, true, true, address(payer));
            emit PaymentExecuted(BATCH, ps[i].paymentId, treasury, address(usdc), ps[i].recipient, ps[i].amount);
        }
        vm.expectEmit(true, true, true, true, address(payer));
        emit BatchExecuted(BATCH, treasury, address(usdc), 3, total);
        vm.prank(treasury);
        payer.payERC20(usdc, BATCH, ps);
    }

    function test_eventsCarryNoPlaintext() public {
        // The only per-payment data in logs: two opaque hashes, the payer, token, recipient, amount.
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(2, 1e6, "p");
        vm.prank(treasury);
        usdc.approve(address(payer), total);
        vm.recordLogs();
        vm.prank(treasury);
        payer.payERC20(usdc, BATCH, ps);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint256 seen;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].emitter != address(payer) || logs[i].topics[0] != PaymentExecuted.selector) continue;
            assertEq(logs[i].topics.length, 4);
            assertEq(logs[i].topics[1], BATCH);
            assertEq(logs[i].topics[2], ps[seen].paymentId);
            assertEq(logs[i].data.length, 96, "token, recipient, amount only");
            ++seen;
        }
        assertEq(seen, 2);
    }

    function test_replayOfSameBatchReverts() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(5, 1e6, "r");
        vm.startPrank(treasury);
        usdc.approve(address(payer), total * 2);
        payer.payERC20(usdc, BATCH, ps);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.AlreadyProcessed.selector, 0, ps[0].paymentId));
        payer.payERC20(usdc, BATCH, ps);
        vm.stopPrank();
        assertEq(usdc.balanceOf(ps[0].recipient), ps[0].amount, "paid once");
    }

    function test_resubmissionContainingOnePaidIdRevertsWholeChunk() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(4, 1e6, "x");
        vm.startPrank(treasury);
        usdc.approve(address(payer), total * 2);
        payer.payERC20(usdc, BATCH, _one(ps[2].recipient, ps[2].amount, ps[2].paymentId));
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.AlreadyProcessed.selector, 2, ps[2].paymentId));
        payer.payERC20(usdc, BATCH, ps);
        vm.stopPrank();
        assertEq(usdc.balanceOf(ps[0].recipient), 0, "atomic: nothing else moved");
        assertFalse(payer.isProcessed(treasury, ps[0].paymentId));
    }

    function test_duplicateIdInsideOneBatchReverts() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(3, 1e6, "d");
        ps[2].paymentId = ps[0].paymentId;
        vm.startPrank(treasury);
        usdc.approve(address(payer), total);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.AlreadyProcessed.selector, 2, ps[0].paymentId));
        payer.payERC20(usdc, BATCH, ps);
        vm.stopPrank();
    }

    function test_paymentIdsAreScopedPerPayer() public {
        address other = makeAddr("other-treasury");
        usdc.mint(other, 10e6);
        bytes32 id = keccak256("shared-id");
        vm.prank(other);
        usdc.approve(address(payer), 1e6);
        vm.prank(other);
        payer.payERC20(usdc, BATCH, _one(_recipient(1), 1e6, id));
        // Someone else using the same id cannot block the treasury's payment.
        vm.prank(treasury);
        usdc.approve(address(payer), 1e6);
        vm.prank(treasury);
        payer.payERC20(usdc, BATCH, _one(_recipient(1), 1e6, id));
        assertEq(usdc.balanceOf(_recipient(1)), 2e6);
    }

    function test_insufficientAllowanceReverts() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(3, 1e6, "a");
        vm.startPrank(treasury);
        usdc.approve(address(payer), total - 1);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(payer), ps[2].amount - 1, ps[2].amount));
        payer.payERC20(usdc, BATCH, ps);
        vm.stopPrank();
        assertFalse(payer.isProcessed(treasury, ps[0].paymentId), "rolled back");
    }

    function test_insufficientBalanceReverts() public {
        address poor = makeAddr("poor");
        usdc.mint(poor, 1e6);
        vm.startPrank(poor);
        usdc.approve(address(payer), 2e6);
        vm.expectRevert();
        payer.payERC20(usdc, BATCH, _one(_recipient(1), 2e6, keccak256("p")));
        vm.stopPrank();
    }

    function test_validation() public {
        SheafBatchPayer.Payment[] memory empty = new SheafBatchPayer.Payment[](0);
        vm.startPrank(treasury);
        vm.expectRevert(SheafBatchPayer.EmptyBatch.selector);
        payer.payERC20(usdc, BATCH, empty);
        vm.expectRevert(SheafBatchPayer.ZeroBatchId.selector);
        payer.payERC20(usdc, bytes32(0), _one(_recipient(1), 1, keccak256("z")));
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.ZeroPaymentId.selector, 0));
        payer.payERC20(usdc, BATCH, _one(_recipient(1), 1, bytes32(0)));
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.ZeroAmount.selector, 0));
        payer.payERC20(usdc, BATCH, _one(_recipient(1), 0, keccak256("z")));
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.InvalidRecipient.selector, 0, address(0)));
        payer.payERC20(usdc, BATCH, _one(address(0), 1, keccak256("z")));
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.InvalidRecipient.selector, 0, address(payer)));
        payer.payERC20(usdc, BATCH, _one(address(payer), 1, keccak256("z")));
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.InvalidRecipient.selector, 0, treasury));
        payer.payERC20(usdc, BATCH, _one(treasury, 1, keccak256("z")));
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.InvalidToken.selector, address(0)));
        payer.payERC20(IERC20(address(0)), BATCH, _one(_recipient(1), 1, keccak256("z")));
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.InvalidToken.selector, makeAddr("eoa")));
        payer.payERC20(IERC20(makeAddr("eoa")), BATCH, _one(_recipient(1), 1, keccak256("z")));
        vm.stopPrank();
    }

    function test_batchSizeIsCapped() public {
        uint256 max = payer.MAX_PAYMENTS();
        (SheafBatchPayer.Payment[] memory ok, uint256 total) = _batch(max, 1, "cap");
        vm.startPrank(treasury);
        usdc.approve(address(payer), total);
        payer.payERC20(usdc, BATCH, ok);
        (SheafBatchPayer.Payment[] memory tooMany,) = _batch(max + 1, 1, "cap2");
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.BatchTooLarge.selector, max + 1, max));
        payer.payERC20(usdc, BATCH, tooMany);
        vm.stopPrank();
    }

    /* ─────────── USDT-style tokens ─────────── */

    function test_usdtStyleToken_noReturnValues() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(10, 250e6, "t");
        vm.startPrank(treasury);
        // A leftover allowance cannot be changed to another non-zero value on USDT...
        usdt.approve(address(payer), 1);
        vm.expectRevert("USDT: reset allowance to 0 first");
        usdt.approve(address(payer), total);
        // ...so the app resets to zero first; SafeERC20.forceApprove does the same.
        SafeERC20.forceApprove(IERC20(address(usdt)), address(payer), total);
        assertEq(usdt.allowance(treasury, address(payer)), total);
        payer.payERC20(IERC20(address(usdt)), BATCH, ps);
        vm.stopPrank();
        for (uint256 i; i < ps.length; ++i) {
            assertEq(usdt.balanceOf(ps[i].recipient), ps[i].amount);
        }
        assertEq(usdt.balanceOf(address(payer)), 0);
    }

    function test_feeOnTransferIsRefused() public {
        usdt.setFee(10); // 0.1 %
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(2, 1_000e6, "f");
        vm.startPrank(treasury);
        usdt.approve(address(payer), total);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.AmountNotReceived.selector, 0, ps[0].amount, ps[0].amount - ps[0].amount / 1000));
        payer.payERC20(IERC20(address(usdt)), BATCH, ps);
        vm.stopPrank();
    }

    function test_tokenReturningFalseReverts() public {
        ReturnsFalseToken bad = new ReturnsFalseToken();
        bad.mint(treasury, 10);
        vm.prank(treasury);
        vm.expectRevert(abi.encodeWithSelector(SafeERC20.SafeERC20FailedOperation.selector, address(bad)));
        payer.payERC20(IERC20(address(bad)), BATCH, _one(_recipient(1), 1, keccak256("f")));
    }

    function test_tokenOvercreditingIsRefused() public {
        InflatingToken bad = new InflatingToken();
        bad.mint(treasury, 10);
        vm.startPrank(treasury);
        bad.approve(address(payer), 10);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.AmountNotReceived.selector, 0, 5, 10));
        payer.payERC20(IERC20(address(bad)), BATCH, _one(_recipient(1), 5, keccak256("i")));
        vm.stopPrank();
    }

    function test_tokenHookCannotReenter() public {
        HookToken hook = new HookToken();
        hook.setPayer(payer);
        hook.mint(treasury, 10);
        vm.startPrank(treasury);
        hook.approve(address(payer), 10);
        payer.payERC20(IERC20(address(hook)), BATCH, _one(_recipient(1), 10, keccak256("h")));
        vm.stopPrank();
        assertTrue(hook.reentryBlocked());
        assertEq(hook.balanceOf(_recipient(1)), 10);
    }

    /* ─────────── native ─────────── */

    function test_payNative_exactValue() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(30, 0.01 ether, "n");
        vm.prank(treasury);
        uint256 paid = payer.payNative{value: total}(BATCH, ps);
        assertEq(paid, total);
        for (uint256 i; i < ps.length; ++i) {
            assertEq(ps[i].recipient.balance, ps[i].amount);
        }
        assertEq(address(payer).balance, 0, "never holds ether");
    }

    function test_payNative_valueMismatchReverts() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(3, 1 ether, "m");
        vm.startPrank(treasury);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.ValueMismatch.selector, total, total + 1));
        payer.payNative{value: total + 1}(BATCH, ps);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.ValueMismatch.selector, total, total - 1));
        payer.payNative{value: total - 1}(BATCH, ps);
        vm.stopPrank();
    }

    function test_payNative_failedRecipientRevertsEverything() public {
        RejectsEther wall = new RejectsEther();
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(3, 1 ether, "w");
        ps[1].recipient = address(wall);
        vm.prank(treasury);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.NativeTransferFailed.selector, 1, address(wall)));
        payer.payNative{value: total}(BATCH, ps);
        assertEq(ps[0].recipient.balance, 0);
        assertFalse(payer.isProcessed(treasury, ps[0].paymentId));
    }

    function test_payNative_returnBombDoesNotCopyReturnData() public {
        ReturnBomb bomb = new ReturnBomb();
        vm.prank(treasury);
        payer.payNative{value: 1 ether}(BATCH, _one(address(bomb), 1 ether, keccak256("b")));
        assertEq(address(bomb).balance, 1 ether);
    }

    function test_payNative_reentryIsBlocked() public {
        Reentrant r = new Reentrant(payer);
        // The recipient's nested call is refused; it swallows the error, so the outer payment lands.
        vm.prank(treasury);
        payer.payNative{value: 1 ether}(BATCH, _one(address(r), 1 ether, keccak256("re")));
        assertTrue(r.attempted());
        assertTrue(r.reentryBlocked());
        assertEq(address(r).balance, 1 ether);
        assertFalse(payer.isProcessed(address(r), keccak256("reenter")));
    }

    function test_payERC20_isNotPayable() public {
        (SheafBatchPayer.Payment[] memory ps,) = _batch(1, 1, "np");
        (bool ok,) = address(payer).call{value: 1}(abi.encodeCall(SheafBatchPayer.payERC20, (usdc, BATCH, ps)));
        assertFalse(ok);
        (ok,) = address(payer).call{value: 1}("");
        assertFalse(ok, "no receive: stray ether is refused");
    }

    function test_areProcessed() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(3, 1e6, "ap");
        vm.startPrank(treasury);
        usdc.approve(address(payer), total);
        payer.payERC20(usdc, BATCH, ps);
        vm.stopPrank();
        bytes32[] memory ids = new bytes32[](4);
        ids[0] = ps[0].paymentId;
        ids[1] = keccak256("unknown");
        ids[2] = ps[2].paymentId;
        ids[3] = ps[1].paymentId;
        bool[] memory paid = payer.areProcessed(treasury, ids);
        assertTrue(paid[0]);
        assertFalse(paid[1]);
        assertTrue(paid[2]);
        assertTrue(paid[3]);
        assertFalse(payer.areProcessed(makeAddr("nobody"), ids)[0]);
    }

    /* ─────────── fuzz ─────────── */

    function testFuzz_payERC20(uint8 count, uint64 seed) public {
        uint256 n = bound(count, 1, 60);
        SheafBatchPayer.Payment[] memory ps = new SheafBatchPayer.Payment[](n);
        uint256 total;
        for (uint256 i; i < n; ++i) {
            uint256 amount = bound(uint256(keccak256(abi.encode(seed, i))), 1, 50_000e6);
            ps[i] = SheafBatchPayer.Payment({recipient: _recipient(uint256(seed) * 1000 + i), amount: amount, paymentId: keccak256(abi.encode(seed, "id", i))});
            total += amount;
        }
        uint256 before = usdc.balanceOf(treasury);
        vm.startPrank(treasury);
        usdc.approve(address(payer), total);
        assertEq(payer.payERC20(usdc, BATCH, ps), total);
        vm.stopPrank();
        uint256 received;
        for (uint256 i; i < n; ++i) received += usdc.balanceOf(ps[i].recipient);
        assertEq(received, total, "sum paid == sum requested");
        assertEq(before - usdc.balanceOf(treasury), total);
        assertEq(usdc.balanceOf(address(payer)), 0);
    }

    function testFuzz_payNative_anyMismatchReverts(uint96 extra, bool over) public {
        vm.assume(extra > 0);
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(4, 1 ether, "fz");
        uint256 value = over ? total + extra : (extra >= total ? 0 : total - extra);
        vm.deal(treasury, total + uint256(extra));
        vm.prank(treasury);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.ValueMismatch.selector, total, value));
        payer.payNative{value: value}(BATCH, ps);
        assertEq(address(payer).balance, 0);
    }

    function testFuzz_payNative(uint8 count, uint64 seed) public {
        uint256 n = bound(count, 1, 60);
        SheafBatchPayer.Payment[] memory ps = new SheafBatchPayer.Payment[](n);
        uint256 total;
        for (uint256 i; i < n; ++i) {
            uint256 amount = bound(uint256(keccak256(abi.encode(seed, i))), 1, 5 ether);
            ps[i] = SheafBatchPayer.Payment({recipient: _recipient(uint256(seed) * 1000 + i), amount: amount, paymentId: keccak256(abi.encode(seed, "nid", i))});
            total += amount;
        }
        vm.deal(treasury, total);
        vm.prank(treasury);
        payer.payNative{value: total}(BATCH, ps);
        uint256 received;
        for (uint256 i; i < n; ++i) received += ps[i].recipient.balance;
        assertEq(received, total);
        assertEq(treasury.balance, 0);
        assertEq(address(payer).balance, 0);
    }
}
