// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {TokenTransfer} from "./TokenTransfer.sol";

/// @title OtcEscrow (Sheaf operation: OTC)
/// @notice Private OTC block trade. A `maker` escrows `makerAmount` of `makerToken` and asks for
///         `takerAmount` of `takerToken`, optionally from one named `taker`, until `expiry`.
///         The taker fills atomically in one transaction: their `takerToken` goes to the
///         maker's chosen receiving address and the escrowed `makerToken` goes to the taker's
///         chosen receiving address. No pool, no price impact, no partial fills. Before a fill,
///         or after expiry, the maker cancels and is refunded.
///
/// @dev Privacy statement (read this before relying on the contract):
///      - Each side may receive into a fresh address (`makerRecipient`, `takerRecipient`), so
///        the wallet that funded the trade is not the wallet that ends up holding the proceeds.
///        That is the whole privacy property.
///      - The order (both tokens, both amounts, expiry, the named taker if any) and the fill
///        are public on-chain, including both receiving addresses. Amounts and timing remain
///        correlatable. Nothing here is anonymous, untraceable or unlinkable. Do not describe
///        it that way.
///
///      Fee-on-transfer tokens: the maker deposit is measured by balance delta and must equal
///      `makerAmount` exactly; otherwise `createOrder` reverts. The taker side is measured on
///      `makerRecipient`'s balance and must equal `takerAmount` exactly; otherwise `fill` reverts.
///
///      Restricted tokens: if any leg of the fill is refused by the token's compliance checks,
///      the whole fill reverts (`TokenTransfer.TransferRejected` / `TransferFromRejected`) and
///      the escrow is untouched; the maker can still cancel and be refunded.
contract OtcEscrow is ReentrancyGuard {
    using TokenTransfer for address;

    // ---------------------------------------------------------------- types

    /// @notice Order state.
    enum Status {
        None,
        Open,
        Filled,
        Cancelled
    }

    /// @notice One OTC order.
    struct Order {
        address maker;
        address makerToken;
        uint256 makerAmount;
        address makerRecipient; // receives takerToken
        address taker; // zero = anyone
        address takerToken;
        uint256 takerAmount;
        uint64 expiry;
        Status status;
    }

    // ---------------------------------------------------------------- errors

    /// @notice A zero address or zero amount where not allowed.
    error ZeroValue();
    /// @notice `expiry` is not in the future.
    error ExpiryInPast(uint64 expiry, uint256 nowTs);
    /// @notice The order is not open.
    error OrderNotOpen(uint256 orderId, Status status);
    /// @notice The order has expired.
    error OrderExpired(uint256 orderId, uint64 expiry, uint256 nowTs);
    /// @notice Caller is not the named taker.
    error NotTaker(address caller, address taker);
    /// @notice Caller is not the maker.
    error NotMaker(address caller, address maker);
    /// @notice The amount actually received differs from the amount asked (fee-on-transfer).
    error AmountMismatch(address token, uint256 expected, uint256 received);

    // ---------------------------------------------------------------- events

    /// @notice An order was created and the maker's tokens escrowed.
    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address indexed taker,
        address makerToken,
        uint256 makerAmount,
        address takerToken,
        uint256 takerAmount,
        uint64 expiry,
        address makerRecipient
    );
    /// @notice An order was filled. Both receiving addresses are public.
    event OrderFilled(uint256 indexed orderId, address indexed taker, address makerRecipient, address takerRecipient);
    /// @notice An order was cancelled and the maker refunded to `refundTo`.
    event OrderCancelled(uint256 indexed orderId, address refundTo);

    // ---------------------------------------------------------------- storage

    /// @notice Orders by id (ids start at 1).
    mapping(uint256 => Order) public orders;
    /// @notice Number of orders created so far.
    uint256 public orderCount;

    // ---------------------------------------------------------------- maker

    /// @notice Create an order and escrow `makerAmount` of `makerToken` from the caller.
    /// @param makerToken Token the maker gives.
    /// @param makerAmount Amount the maker gives (must be received exactly).
    /// @param takerToken Token the maker wants.
    /// @param takerAmount Amount the maker wants.
    /// @param taker Only this address may fill; zero for anyone.
    /// @param expiry Unix second after which the order can no longer be filled.
    /// @param makerRecipient Where the maker receives `takerToken`; zero means the maker itself.
    /// @return orderId The new order's id.
    function createOrder(
        address makerToken,
        uint256 makerAmount,
        address takerToken,
        uint256 takerAmount,
        address taker,
        uint64 expiry,
        address makerRecipient
    ) external nonReentrant returns (uint256 orderId) {
        if (makerToken == address(0) || takerToken == address(0) || makerAmount == 0 || takerAmount == 0) {
            revert ZeroValue();
        }
        if (expiry <= block.timestamp) revert ExpiryInPast(expiry, block.timestamp);
        if (makerRecipient == address(0)) makerRecipient = msg.sender;

        uint256 before = IERC20(makerToken).balanceOf(address(this));
        makerToken.pullIn(msg.sender, address(this), makerAmount);
        uint256 received = IERC20(makerToken).balanceOf(address(this)) - before;
        if (received != makerAmount) revert AmountMismatch(makerToken, makerAmount, received);

        orderId = ++orderCount;
        orders[orderId] = Order({
            maker: msg.sender,
            makerToken: makerToken,
            makerAmount: makerAmount,
            makerRecipient: makerRecipient,
            taker: taker,
            takerToken: takerToken,
            takerAmount: takerAmount,
            expiry: expiry,
            status: Status.Open
        });
        emit OrderCreated(
            orderId, msg.sender, taker, makerToken, makerAmount, takerToken, takerAmount, expiry, makerRecipient
        );
    }

    /// @notice Cancel an open order and refund the escrow to `refundTo`. Maker only. Allowed
    ///         at any time before a fill, including after expiry.
    /// @param orderId The order.
    /// @param refundTo Where the escrow goes back to; zero means the maker itself.
    function cancel(uint256 orderId, address refundTo) external nonReentrant {
        Order storage o = orders[orderId];
        if (o.status != Status.Open) revert OrderNotOpen(orderId, o.status);
        if (o.maker != msg.sender) revert NotMaker(msg.sender, o.maker);
        if (refundTo == address(0)) refundTo = o.maker;
        o.status = Status.Cancelled;
        o.makerToken.sendOut(refundTo, o.makerAmount);
        emit OrderCancelled(orderId, refundTo);
    }

    // ---------------------------------------------------------------- taker

    /// @notice Fill an open, unexpired order atomically.
    /// @param orderId The order.
    /// @param takerRecipient Where the taker receives `makerToken`; zero means the caller itself.
    function fill(uint256 orderId, address takerRecipient) external nonReentrant {
        Order storage o = orders[orderId];
        if (o.status != Status.Open) revert OrderNotOpen(orderId, o.status);
        if (block.timestamp > o.expiry) revert OrderExpired(orderId, o.expiry, block.timestamp);
        if (o.taker != address(0) && o.taker != msg.sender) revert NotTaker(msg.sender, o.taker);
        if (takerRecipient == address(0)) takerRecipient = msg.sender;

        o.status = Status.Filled;

        // Taker pays the maker's receiving address directly; measured on that address.
        uint256 before = IERC20(o.takerToken).balanceOf(o.makerRecipient);
        o.takerToken.pullIn(msg.sender, o.makerRecipient, o.takerAmount);
        uint256 received = IERC20(o.takerToken).balanceOf(o.makerRecipient) - before;
        if (received != o.takerAmount) revert AmountMismatch(o.takerToken, o.takerAmount, received);

        // Escrow goes to the taker's receiving address.
        o.makerToken.sendOut(takerRecipient, o.makerAmount);

        emit OrderFilled(orderId, msg.sender, o.makerRecipient, takerRecipient);
    }

    /// @notice Read an order.
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
}
