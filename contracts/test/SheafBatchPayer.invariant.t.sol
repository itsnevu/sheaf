// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SheafBatchPayer} from "../src/SheafBatchPayer.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockUSDT} from "./mocks/MockUSDT.sol";

/// Drives the payer with random batches: standard ERC-20, USDT-style and native, including
/// replays of earlier payment ids, wrong msg.value and short allowances. Every call is wrapped
/// in try/catch so the fuzzer explores freely; the ghost ledger only counts successful calls.
contract PayerHandler is Test {
    using SafeERC20 for IERC20;

    SheafBatchPayer public immutable payer;
    MockERC20 public immutable token;
    MockUSDT public immutable usdt;
    address public constant TREASURY = address(0x7EA5);
    uint256 public constant RECIPIENTS = 12;

    bytes32[] public knownIds;
    mapping(bytes32 => uint256) public timesPaid;
    uint256 public requestedToken;
    uint256 public requestedUsdt;
    uint256 public requestedNative;
    uint256 public calls;
    uint256 public successes;

    constructor(SheafBatchPayer payer_, MockERC20 token_, MockUSDT usdt_) {
        payer = payer_;
        token = token_;
        usdt = usdt_;
    }

    function recipient(uint256 i) public pure returns (address) {
        return address(uint160(0x1000 + (i % RECIPIENTS)));
    }

    function _build(uint256 seed, uint256 n, bool reuse) internal view returns (SheafBatchPayer.Payment[] memory ps, uint256 total) {
        ps = new SheafBatchPayer.Payment[](n);
        for (uint256 i; i < n; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, i)));
            bytes32 id = reuse && knownIds.length > 0 ? knownIds[r % knownIds.length] : keccak256(abi.encode("id", seed, i, calls));
            uint256 amount = bound(r >> 8, 1, 1_000_000e6);
            ps[i] = SheafBatchPayer.Payment({recipient: recipient(r), amount: amount, paymentId: id});
            total += amount;
        }
    }

    function _settle(SheafBatchPayer.Payment[] memory ps) internal {
        for (uint256 i; i < ps.length; ++i) {
            if (timesPaid[ps[i].paymentId] == 0) knownIds.push(ps[i].paymentId);
            timesPaid[ps[i].paymentId] += 1;
        }
        successes++;
    }

    function payToken(uint256 seed, uint8 count, bool reuse, bool shortAllowance) external {
        calls++;
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _build(seed, bound(count, 1, 8), reuse);
        token.mint(TREASURY, total);
        vm.startPrank(TREASURY);
        token.approve(address(payer), shortAllowance ? total - 1 : total);
        try payer.payERC20(token, keccak256(abi.encode("batch", seed)), ps) returns (uint256 paid) {
            assertEq(paid, total);
            requestedToken += total;
            _settle(ps);
        } catch {}
        token.approve(address(payer), 0);
        vm.stopPrank();
    }

    function payUsdt(uint256 seed, uint8 count, bool reuse) external {
        calls++;
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _build(seed, bound(count, 1, 8), reuse);
        usdt.mint(TREASURY, total);
        vm.startPrank(TREASURY);
        IERC20(address(usdt)).forceApprove(address(payer), total);
        try payer.payERC20(IERC20(address(usdt)), keccak256(abi.encode("usdt", seed)), ps) returns (uint256 paid) {
            assertEq(paid, total);
            requestedUsdt += total;
            _settle(ps);
        } catch {}
        IERC20(address(usdt)).forceApprove(address(payer), 0);
        vm.stopPrank();
    }

    function payNative(uint256 seed, uint8 count, bool reuse, int8 valueError) external {
        calls++;
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _build(seed, bound(count, 1, 8), reuse);
        uint256 delta = valueError >= 0 ? uint256(uint8(valueError)) : uint256(uint16(-int16(valueError)));
        uint256 value = valueError >= 0 ? total + delta : (delta > total ? 0 : total - delta);
        vm.deal(TREASURY, TREASURY.balance + value);
        vm.prank(TREASURY);
        try payer.payNative{value: value}(keccak256(abi.encode("native", seed)), ps) returns (uint256 paid) {
            assertEq(paid, total);
            assertEq(value, total);
            requestedNative += total;
            _settle(ps);
        } catch {}
    }

    function knownIdCount() external view returns (uint256) {
        return knownIds.length;
    }
}

contract SheafBatchPayerInvariantTest is Test {
    SheafBatchPayer internal payer;
    MockERC20 internal token;
    MockUSDT internal usdt;
    PayerHandler internal handler;

    function setUp() public {
        payer = new SheafBatchPayer();
        token = new MockERC20("Token", "TKN", 6);
        usdt = new MockUSDT();
        handler = new PayerHandler(payer, token, usdt);
        targetContract(address(handler));
    }

    function _received(IERC20 t) internal view returns (uint256 sum) {
        for (uint256 i; i < handler.RECIPIENTS(); ++i) sum += t.balanceOf(handler.recipient(i));
    }

    function _receivedNative() internal view returns (uint256 sum) {
        for (uint256 i; i < handler.RECIPIENTS(); ++i) sum += handler.recipient(i).balance;
    }

    /// The contract never keeps a balance of anything.
    function invariant_holdsNothing() public view {
        assertEq(token.balanceOf(address(payer)), 0);
        assertEq(usdt.balanceOf(address(payer)), 0);
        assertEq(address(payer).balance, 0);
    }

    /// Sum paid to recipients equals the sum requested by successful calls, per asset.
    function invariant_sumPaidEqualsSumRequested() public view {
        assertEq(_received(IERC20(address(token))), handler.requestedToken());
        assertEq(_received(IERC20(address(usdt))), handler.requestedUsdt());
        assertEq(_receivedNative(), handler.requestedNative());
    }

    /// No payment id was ever paid twice, and the on-chain flag agrees with the ghost ledger.
    function invariant_eachPaymentIdPaidAtMostOnce() public view {
        uint256 n = handler.knownIdCount();
        for (uint256 i; i < n; ++i) {
            bytes32 id = handler.knownIds(i);
            assertEq(handler.timesPaid(id), 1);
            assertTrue(payer.isProcessed(handler.TREASURY(), id));
        }
    }

    /// The handler must really move money, not only hit reverts.
    function afterInvariant() public view {
        assertGt(handler.successes(), 0);
        assertGt(handler.knownIdCount(), 0);
    }

    /// The treasury keeps whatever was not requested: nothing leaks anywhere else.
    function invariant_conservation() public view {
        assertEq(token.balanceOf(handler.TREASURY()) + _received(IERC20(address(token))), token.totalSupply());
        assertEq(usdt.balanceOf(handler.TREASURY()) + _received(IERC20(address(usdt))), usdt.totalSupply());
    }
}
