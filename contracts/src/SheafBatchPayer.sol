// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SheafBatchPayer
/// @notice Pays many recipients in one transaction, straight from the caller's wallet.
///
/// Non-custodial: ERC-20 amounts move payer -> recipient with `transferFrom` (one allowance for
/// the whole batch); native amounts are forwarded from `msg.value` in the same call, which must
/// equal the sum of the batch exactly. The contract has no owner, no upgrade path and no fees,
/// and it never keeps a balance: nothing is ever transferred to it.
///
/// Idempotent: a `(payer, paymentId)` pair can be paid once, ever. Resubmitting a batch after a
/// dropped or replaced transaction reverts with `AlreadyProcessed` instead of paying twice.
///
/// Exact: an ERC-20 payment reverts unless the recipient's balance rises by exactly `amount`,
/// so fee-on-transfer or rebasing behaviour can never short a payee silently.
///
/// Private externally: events carry the payer's opaque `batchId` and `paymentId` hashes, never
/// names, invoice numbers or other references. Recipient, amount and token are public on-chain
/// anyway (they are visible in the token transfer itself).
contract SheafBatchPayer is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Payment {
        address recipient;
        uint256 amount;
        bytes32 paymentId;
    }

    /// @notice Upper bound on payments per call; keeps a batch well inside any block gas limit.
    uint256 public constant MAX_PAYMENTS = 200;

    /// @dev payer => paymentId => paid.
    mapping(address payer => mapping(bytes32 paymentId => bool paid)) private _processed;

    /// @notice One event per payment. `token` is address(0) for the native asset.
    event PaymentExecuted(
        bytes32 indexed batchId,
        bytes32 indexed paymentId,
        address indexed payer,
        address token,
        address recipient,
        uint256 amount
    );

    /// @notice One event per call, after every payment in it succeeded.
    event BatchExecuted(bytes32 indexed batchId, address indexed payer, address indexed token, uint256 count, uint256 total);

    error EmptyBatch();
    error BatchTooLarge(uint256 count, uint256 max);
    error ZeroBatchId();
    error ZeroPaymentId(uint256 index);
    error ZeroAmount(uint256 index);
    error InvalidRecipient(uint256 index, address recipient);
    error AlreadyProcessed(uint256 index, bytes32 paymentId);
    error InvalidToken(address token);
    error ValueMismatch(uint256 expected, uint256 received);
    error NativeTransferFailed(uint256 index, address recipient);
    error AmountNotReceived(uint256 index, uint256 expected, uint256 received);

    /// @notice Pays every `payments[i].amount` of `token` from msg.sender to `payments[i].recipient`.
    /// @dev msg.sender must have approved this contract for at least the batch total. Works with
    /// tokens that return no value from transferFrom (USDT) through SafeERC20.
    /// @return total Sum of all amounts paid.
    function payERC20(IERC20 token, bytes32 batchId, Payment[] calldata payments)
        external
        nonReentrant
        returns (uint256 total)
    {
        if (address(token).code.length == 0) revert InvalidToken(address(token));
        uint256 n = _checkBatch(batchId, payments.length);

        // Checks and effects for the whole batch before any external call.
        for (uint256 i; i < n; ++i) {
            total += _record(i, payments[i]);
        }

        // Interactions: straight from payer to recipient, never through this contract.
        for (uint256 i; i < n; ++i) {
            Payment calldata p = payments[i];
            uint256 before = token.balanceOf(p.recipient);
            token.safeTransferFrom(msg.sender, p.recipient, p.amount);
            uint256 afterwards = token.balanceOf(p.recipient);
            if (afterwards < before || afterwards - before != p.amount) {
                revert AmountNotReceived(i, p.amount, afterwards < before ? 0 : afterwards - before);
            }
            emit PaymentExecuted(batchId, p.paymentId, msg.sender, address(token), p.recipient, p.amount);
        }
        emit BatchExecuted(batchId, msg.sender, address(token), n, total);
    }

    /// @notice Pays the native asset. `msg.value` must equal the sum of amounts exactly; any
    /// mismatch reverts (nothing is refunded because nothing is ever kept).
    /// @return total Sum of all amounts paid (== msg.value).
    function payNative(bytes32 batchId, Payment[] calldata payments)
        external
        payable
        nonReentrant
        returns (uint256 total)
    {
        uint256 n = _checkBatch(batchId, payments.length);
        for (uint256 i; i < n; ++i) {
            total += _record(i, payments[i]);
        }
        if (total != msg.value) revert ValueMismatch(total, msg.value);

        for (uint256 i; i < n; ++i) {
            Payment calldata p = payments[i];
            address recipient = p.recipient;
            uint256 amount = p.amount;
            bool ok;
            // Forward all gas but copy no return data (no return-data bombs).
            assembly ("memory-safe") {
                ok := call(gas(), recipient, amount, 0, 0, 0, 0)
            }
            if (!ok) revert NativeTransferFailed(i, recipient);
            emit PaymentExecuted(batchId, p.paymentId, msg.sender, address(0), recipient, amount);
        }
        emit BatchExecuted(batchId, msg.sender, address(0), n, total);
    }

    /// @notice Whether `payer` has already paid `paymentId` through this contract.
    function isProcessed(address payer, bytes32 paymentId) external view returns (bool) {
        return _processed[payer][paymentId];
    }

    /// @notice Batch form of isProcessed, for reconciliation after a dropped or replaced transaction.
    function areProcessed(address payer, bytes32[] calldata paymentIds) external view returns (bool[] memory paid) {
        paid = new bool[](paymentIds.length);
        for (uint256 i; i < paymentIds.length; ++i) {
            paid[i] = _processed[payer][paymentIds[i]];
        }
    }

    function _checkBatch(bytes32 batchId, uint256 n) private pure returns (uint256) {
        if (batchId == bytes32(0)) revert ZeroBatchId();
        if (n == 0) revert EmptyBatch();
        if (n > MAX_PAYMENTS) revert BatchTooLarge(n, MAX_PAYMENTS);
        return n;
    }

    /// @dev Validates one payment and marks its id as paid for msg.sender. A repeated id, within
    /// the batch or from an earlier transaction, reverts the whole call.
    function _record(uint256 i, Payment calldata p) private returns (uint256) {
        if (p.paymentId == bytes32(0)) revert ZeroPaymentId(i);
        if (p.amount == 0) revert ZeroAmount(i);
        address r = p.recipient;
        if (r == address(0) || r == address(this) || r == msg.sender) revert InvalidRecipient(i, r);
        mapping(bytes32 => bool) storage paid = _processed[msg.sender];
        if (paid[p.paymentId]) revert AlreadyProcessed(i, p.paymentId);
        paid[p.paymentId] = true;
        return p.amount;
    }
}
