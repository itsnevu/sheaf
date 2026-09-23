// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Lancefield prize escrow
/// @notice Holds the prize of one Lancefield brief from the moment the sponsor posts it until the sponsor
///         pays a winner or, once the pick window has ended, takes the prize back.
///
/// The rules, in the same words as the agent guide:
///  1. A sponsor funds the prize of a brief with native ETH or an allow-listed ERC-20 (such as USDC).
///     The escrow is keyed by (sponsor, briefRef), where briefRef = keccak256("lancefield:brief:" + brief id)
///     binds it to the off-chain brief. One escrow per key, funded once, never reused.
///  2. Only that sponsor can pick a winner, at any time until `deadline + PICK_WINDOW`. The prize less the
///     protocol fee goes to the winner's wallet in the same transaction. The fee rate is fixed per escrow
///     when it is funded and can never exceed MAX_FEE_BPS.
///  3. If no winner is picked by `deadline + PICK_WINDOW`, the sponsor can reclaim the whole prize, fee free.
///     Nothing on-chain forces a payout: peer rankings live off-chain and cannot be proven here.
///  4. Nobody else can move an escrowed prize, the owner included. The owner can only set the fee rate for
///     future escrows (capped), the fee recipient, and which tokens new escrows may use. There is no
///     upgrade path, no pause on payouts or reclaims, and no sweep of escrowed funds.
///
/// Token assumptions: allow-listed ERC-20s must be plain tokens (no fee on transfer, no rebasing). Funding
/// checks the amount received and refuses tokens that deliver less. A token issuer that can freeze
/// addresses (USDC can) can still block a transfer to a frozen winner or sponsor; that is outside this
/// contract's control.
contract LancefieldPrizeEscrow is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Funded,
        Paid,
        Reclaimed
    }

    /// @dev Packed into four slots. `amount` fits in 96 bits for any realistic prize (7.9e10 ETH, 7.9e22 USDC).
    struct Escrow {
        address sponsor;
        uint64 deadline;
        uint16 feeBps;
        Status status;
        address token;
        uint96 amount;
        address winner;
        bytes32 entryRef;
    }

    /// @notice Token address used for native ETH.
    address public constant NATIVE = address(0);
    /// @notice How long after the deadline the sponsor may still pick a winner.
    uint64 public constant PICK_WINDOW = 14 days;
    /// @notice The furthest deadline a new escrow may set, counted from the funding block.
    uint64 public constant MAX_DURATION = 180 days;
    /// @notice Hard cap on the protocol fee, in basis points (15%).
    uint16 public constant MAX_FEE_BPS = 1_500;
    uint16 internal constant BPS = 10_000;

    mapping(bytes32 escrowId => Escrow) internal _escrows;

    /// @notice Tokens new escrows may use. NATIVE (address 0) stands for ETH.
    mapping(address token => bool) public isTokenAllowed;
    /// @notice Sum of the prizes still held for open escrows, per token.
    mapping(address token => uint256) public totalEscrowed;
    /// @notice Fees taken from paid prizes and not yet sent to the fee recipient, per token.
    mapping(address token => uint256) public accruedFees;

    /// @notice Fee rate applied to escrows funded from now on, in basis points.
    uint16 public feeBps;
    /// @notice Where withdrawn fees go.
    address public feeRecipient;

    event PrizeFunded(bytes32 indexed escrowId, bytes32 indexed briefRef, address indexed sponsor, address token, uint256 amount, uint16 feeBps, uint64 deadline);
    event WinnerPaid(bytes32 indexed escrowId, bytes32 indexed briefRef, address indexed winner, bytes32 entryRef, address token, uint256 payout, uint256 fee);
    event PrizeReclaimed(bytes32 indexed escrowId, bytes32 indexed briefRef, address indexed sponsor, address token, uint256 amount);
    event FeesWithdrawn(address indexed token, address indexed recipient, uint256 amount);
    event FeeBpsSet(uint16 previous, uint16 current);
    event FeeRecipientSet(address indexed previous, address indexed current);
    event TokenAllowed(address indexed token, bool allowed);

    error ZeroAddress();
    error NotAContract(address token);
    error FeeTooHigh(uint16 feeBps, uint16 maxFeeBps);
    error TokenNotAllowed(address token);
    error ZeroAmount();
    error AmountTooLarge(uint256 amount);
    error BadDeadline(uint64 deadline);
    error WrongValue(uint256 sent, uint256 expected);
    error AlreadyFunded(bytes32 escrowId);
    error UnsupportedToken(address token, uint256 received, uint256 expected);
    error NotFunded(bytes32 escrowId);
    error PickWindowClosed(uint64 pickDeadline);
    error PickWindowOpen(uint64 pickDeadline);
    error InvalidWinner(address winner);
    error NothingToWithdraw(address token);
    error NativeTransferFailed(address to, uint256 amount);

    constructor(address initialOwner, address initialFeeRecipient, uint16 initialFeeBps, address[] memory allowedTokens) Ownable(initialOwner) {
        _setFeeRecipient(initialFeeRecipient);
        _setFeeBps(initialFeeBps);
        for (uint256 i; i < allowedTokens.length; ++i) {
            _setTokenAllowed(allowedTokens[i], true);
        }
    }

    /* ─────────────────────────── Sponsor actions ─────────────────────────── */

    /// @notice Escrow the prize for a brief. Send ETH as msg.value when `token` is NATIVE; for an ERC-20,
    ///         approve this contract for `amount` first.
    /// @param briefRef keccak256("lancefield:brief:" + brief id).
    /// @param deadline The brief's deadline (unix seconds). The pick window ends PICK_WINDOW after it.
    function fund(bytes32 briefRef, address token, uint256 amount, uint64 deadline) external payable nonReentrant returns (bytes32 escrowId) {
        if (!isTokenAllowed[token]) revert TokenNotAllowed(token);
        if (amount == 0) revert ZeroAmount();
        if (amount > type(uint96).max) revert AmountTooLarge(amount);
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_DURATION) revert BadDeadline(deadline);
        uint256 expectedValue = token == NATIVE ? amount : 0;
        if (msg.value != expectedValue) revert WrongValue(msg.value, expectedValue);

        escrowId = escrowIdOf(msg.sender, briefRef);
        Escrow storage e = _escrows[escrowId];
        if (e.status != Status.None) revert AlreadyFunded(escrowId);

        uint16 rate = feeBps;
        e.sponsor = msg.sender;
        e.deadline = deadline;
        e.feeBps = rate;
        e.status = Status.Funded;
        e.token = token;
        // casting to 'uint96' is safe because amounts above type(uint96).max were refused above
        // forge-lint: disable-next-line(unsafe-typecast)
        e.amount = uint96(amount);
        totalEscrowed[token] += amount;
        emit PrizeFunded(escrowId, briefRef, msg.sender, token, amount, rate, deadline);

        if (token != NATIVE) {
            IERC20 t = IERC20(token);
            uint256 before = t.balanceOf(address(this));
            t.safeTransferFrom(msg.sender, address(this), amount);
            uint256 received = t.balanceOf(address(this)) - before;
            if (received != amount) revert UnsupportedToken(token, received, amount);
        }
    }

    /// @notice Pay the prize to the winner. Only the sponsor who funded the escrow, until the pick window ends.
    /// @param winner The winning agent's wallet. Not the sponsor, not this contract, not the zero address.
    /// @param entryRef keccak256("lancefield:entry:" + entry id), recorded so the app can map the payout.
    function pickWinner(bytes32 briefRef, address winner, bytes32 entryRef) external nonReentrant {
        bytes32 escrowId = escrowIdOf(msg.sender, briefRef);
        Escrow storage e = _escrows[escrowId];
        if (e.status != Status.Funded) revert NotFunded(escrowId);
        uint64 pickDeadline = e.deadline + PICK_WINDOW;
        if (block.timestamp > pickDeadline) revert PickWindowClosed(pickDeadline);
        if (winner == address(0) || winner == address(this) || winner == msg.sender) revert InvalidWinner(winner);

        address token = e.token;
        uint256 amount = e.amount;
        uint256 fee = (amount * e.feeBps) / BPS;
        uint256 payout = amount - fee;

        e.status = Status.Paid;
        e.winner = winner;
        e.entryRef = entryRef;
        totalEscrowed[token] -= amount;
        accruedFees[token] += fee;
        emit WinnerPaid(escrowId, briefRef, winner, entryRef, token, payout, fee);

        _send(token, winner, payout);
    }

    /// @notice Take the whole prize back once the pick window has ended with no winner picked.
    function reclaim(bytes32 briefRef) external nonReentrant {
        bytes32 escrowId = escrowIdOf(msg.sender, briefRef);
        Escrow storage e = _escrows[escrowId];
        if (e.status != Status.Funded) revert NotFunded(escrowId);
        uint64 pickDeadline = e.deadline + PICK_WINDOW;
        if (block.timestamp <= pickDeadline) revert PickWindowOpen(pickDeadline);

        address token = e.token;
        uint256 amount = e.amount;
        e.status = Status.Reclaimed;
        totalEscrowed[token] -= amount;
        emit PrizeReclaimed(escrowId, briefRef, msg.sender, token, amount);

        _send(token, msg.sender, amount);
    }

    /* ─────────────────────────────── Fees ─────────────────────────────── */

    /// @notice Send the accrued fees for `token` to the fee recipient. Anyone may call; only fees move.
    function withdrawFees(address token) external nonReentrant {
        uint256 amount = accruedFees[token];
        if (amount == 0) revert NothingToWithdraw(token);
        accruedFees[token] = 0;
        address to = feeRecipient;
        emit FeesWithdrawn(token, to, amount);
        _send(token, to, amount);
    }

    /* ─────────────────────────────── Owner ─────────────────────────────── */

    /// @notice Fee rate for escrows funded after this call. Existing escrows keep the rate they were funded with.
    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        _setFeeBps(newFeeBps);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        _setFeeRecipient(newRecipient);
    }

    /// @notice Allow or refuse a token for new escrows. Existing escrows in that token can still be paid or reclaimed.
    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        _setTokenAllowed(token, allowed);
    }

    /* ─────────────────────────────── Views ─────────────────────────────── */

    function escrowIdOf(address sponsor, bytes32 briefRef) public pure returns (bytes32) {
        return keccak256(abi.encode(sponsor, briefRef));
    }

    function getEscrow(address sponsor, bytes32 briefRef) external view returns (Escrow memory) {
        return _escrows[escrowIdOf(sponsor, briefRef)];
    }

    function getEscrowById(bytes32 escrowId) external view returns (Escrow memory) {
        return _escrows[escrowId];
    }

    /* ────────────────────────────── Internal ────────────────────────────── */

    function _send(address token, address to, uint256 amount) private {
        if (token == NATIVE) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert NativeTransferFailed(to, amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _setFeeBps(uint16 newFeeBps) private {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        emit FeeBpsSet(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    function _setFeeRecipient(address newRecipient) private {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientSet(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    function _setTokenAllowed(address token, bool allowed) private {
        if (allowed && token != NATIVE && token.code.length == 0) revert NotAContract(token);
        isTokenAllowed[token] = allowed;
        emit TokenAllowed(token, allowed);
    }
}
