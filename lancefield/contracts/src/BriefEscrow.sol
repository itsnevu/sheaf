// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TokenTransfer} from "./TokenTransfer.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title BriefEscrow
/// @notice Prize escrow for Lancefield briefs. A sponsor posts a brief and deposits the prize
///         (USDG or any ERC-20, or native ETH) in the same call. Agents' entries are registered by
///         the Lancefield server (the `registrar`). During judging the sponsor picks one or more
///         winners; the prize (minus the protocol fee fixed at posting time) becomes claimable by
///         each winner. If the sponsor never picks, anyone can expire the brief after the judging
///         deadline and the sponsor's refund becomes claimable. Every payout is pull-based.
/// @dev Lifecycle per brief (see `stateOf`):
///        Open ──(submissionDeadline passes)──▶ Judging ──pickWinner(s)──▶ Settled
///        Open ──cancel (sponsor, no entries)──▶ Cancelled
///        Judging ──(judgingDeadline passes)──▶ Expired ──expire (anyone)──▶ Refunded
///      `Open` and `Judging` share one stored status (`Status.Open`); the split is derived from
///      time. Posting is pausable; picking, claiming, refunding and expiring never are.
///      Not upgradeable. No admin path can move escrowed funds anywhere but to the winners, the
///      fee recipient or the sponsor.
contract BriefEscrow is Ownable2Step, Pausable, ReentrancyGuard {
    using TokenTransfer for address;

    // ---------------------------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------------------------

    /// @notice Stored status. `Open` covers both the submission and the judging window.
    enum Status {
        None,
        Open,
        Settled,
        Refunded,
        Cancelled
    }

    /// @notice Derived state, splitting `Status.Open` by time.
    enum State {
        None,
        Open, // before submissionDeadline
        Judging, // submissionDeadline <= now <= judgingDeadline
        Expired, // judgingDeadline passed without a pick; `expire` can be called
        Settled,
        Refunded,
        Cancelled
    }

    /// @notice One brief.
    struct Brief {
        address sponsor;
        address prizeToken; // address(0) = native ETH
        uint256 prizeAmount;
        uint64 submissionDeadline;
        uint64 judgingDeadline;
        uint16 feeBps; // snapshot at posting time
        bool allowEarlyPick;
        bool requireRegistered;
        Status status;
        uint32 entryCount;
    }

    // ---------------------------------------------------------------------------------------
    // Constants and configuration
    // ---------------------------------------------------------------------------------------

    /// @notice Basis-point denominator.
    uint256 public constant BPS = 10_000;

    /// @notice Upper bound on the protocol fee (5%).
    uint16 public constant MAX_FEE_BPS = 500;

    /// @notice Upper bound on winners per brief.
    uint256 public constant MAX_WINNERS = 16;

    /// @notice Optional agent registry, consulted for briefs posted with `requireRegistered`.
    ///         Zero address means the flag cannot be used.
    AgentRegistry public immutable registry;

    /// @notice The Lancefield server key, allowed to register entries on-chain.
    address public registrar;

    /// @notice Protocol fee applied to briefs posted from now on (snapshotted per brief).
    uint16 public feeBps;

    /// @notice Receiver of protocol fees (credited pull-based). Must be non-zero while feeBps > 0.
    address public feeRecipient;

    // ---------------------------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------------------------

    /// @notice Briefs by id (the bytes32 form of the off-chain brief id).
    mapping(bytes32 briefId => Brief) private _briefs;

    /// @notice Agent that handed in an entry hash for a brief; zero if not registered.
    mapping(bytes32 briefId => mapping(bytes32 entryHash => address agent)) public entryAgent;

    /// @notice Pull-based balances: token => account => amount. Token address(0) is native ETH.
    mapping(address token => mapping(address account => uint256 amount)) public claimable;

    /// @notice Sum of open prizes and claimables per token. `balance >= totalOwed` is the invariant.
    mapping(address token => uint256 amount) public totalOwed;

    // ---------------------------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------------------------

    /// @notice A brief was posted and its prize deposited.
    event BriefPosted(
        bytes32 indexed briefId,
        address indexed sponsor,
        address indexed prizeToken,
        uint256 prizeAmount,
        uint64 submissionDeadline,
        uint64 judgingDeadline,
        uint16 feeBps,
        bool allowEarlyPick,
        bool requireRegistered
    );
    /// @notice The registrar recorded an entry.
    event EntryRegistered(bytes32 indexed briefId, address indexed agent, bytes32 indexed entryHash);
    /// @notice A winner was credited `amount` (net of fee), claimable via `claim`.
    event WinnerPicked(bytes32 indexed briefId, address indexed winner, bytes32 indexed entryHash, uint256 amount);
    /// @notice The brief is settled; `fee` was credited to the fee recipient.
    event BriefSettled(bytes32 indexed briefId, uint256 winnerCount, uint256 fee);
    /// @notice The sponsor cancelled an entry-less brief; the prize is claimable by the sponsor.
    event BriefCancelled(bytes32 indexed briefId);
    /// @notice The judging deadline passed without a pick; the prize is claimable by the sponsor.
    event BriefExpired(bytes32 indexed briefId, address indexed caller);
    /// @notice `account` withdrew its claimable balance of `token`.
    event Claimed(address indexed token, address indexed account, uint256 amount);
    /// @notice The registrar changed.
    event RegistrarUpdated(address indexed registrar);
    /// @notice The fee for future briefs changed.
    event FeeUpdated(uint16 feeBps, address indexed feeRecipient);

    // ---------------------------------------------------------------------------------------
    // Errors
    // ---------------------------------------------------------------------------------------

    error ZeroAddress();
    error ZeroAmount();
    error InvalidId();
    error BriefExists(bytes32 briefId);
    error UnknownBrief(bytes32 briefId);
    error InvalidDeadlines();
    error WrongValue(uint256 expected, uint256 actual);
    error AmountMismatch(uint256 expected, uint256 actual);
    error NotSponsor(bytes32 briefId, address caller);
    error NotRegistrar(address caller);
    error NotOpen(bytes32 briefId);
    error NotJudging(bytes32 briefId);
    error NotExpired(bytes32 briefId);
    error HasEntries(bytes32 briefId, uint32 count);
    error EntryExists(bytes32 briefId, bytes32 entryHash);
    error EntryNotOwnedBy(bytes32 briefId, bytes32 entryHash, address winner);
    error AgentNotRegistered(address agent);
    error NoRegistry();
    error BadWinnerCount(uint256 count);
    error LengthMismatch();
    error SumMismatch(uint256 expected, uint256 actual);
    error FeeTooHigh(uint16 feeBps);
    error NothingToClaim();

    // ---------------------------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------------------------

    /// @param owner_ Initial owner (Ownable2Step).
    /// @param registrar_ Server key allowed to call `registerEntry`. May be zero (set later).
    /// @param feeBps_ Initial protocol fee, at most `MAX_FEE_BPS`.
    /// @param feeRecipient_ Fee receiver; required to be non-zero if `feeBps_ > 0`.
    /// @param registry_ Optional AgentRegistry; zero disables `requireRegistered`.
    constructor(address owner_, address registrar_, uint16 feeBps_, address feeRecipient_, AgentRegistry registry_)
        Ownable(owner_)
    {
        _setFee(feeBps_, feeRecipient_);
        registrar = registrar_;
        emit RegistrarUpdated(registrar_);
        registry = registry_;
    }

    // ---------------------------------------------------------------------------------------
    // Owner
    // ---------------------------------------------------------------------------------------

    /// @notice Set the registrar (the Lancefield server key). Zero disables entry registration.
    function setRegistrar(address registrar_) external onlyOwner {
        registrar = registrar_;
        emit RegistrarUpdated(registrar_);
    }

    /// @notice Set the protocol fee for briefs posted from now on. Existing briefs keep their snapshot.
    function setFee(uint16 feeBps_, address feeRecipient_) external onlyOwner {
        _setFee(feeBps_, feeRecipient_);
    }

    /// @notice Stop new briefs from being posted. Picks, claims, refunds and expiry keep working.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Resume posting.
    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------------------------
    // Sponsor
    // ---------------------------------------------------------------------------------------

    /// @notice Post a brief and deposit its prize in the same call.
    /// @dev ERC-20 prizes are pulled with `transferFrom` and checked by balance delta, so
    ///      fee-on-transfer tokens are rejected (`AmountMismatch`). Native prizes require
    ///      `msg.value == prizeAmount`; ERC-20 prizes require `msg.value == 0`.
    /// @param briefId Unique id, e.g. `keccak256(bytes(offChainId))`. Non-zero, unused.
    /// @param prizeToken ERC-20 address, or address(0) for native ETH.
    /// @param prizeAmount Prize in the token's base units (USDG: 6 decimals).
    /// @param submissionDeadline Unix time at which entries close and judging begins.
    /// @param judgingDeadline Unix time by which the sponsor must pick; after it, anyone can `expire`.
    /// @param allowEarlyPick Let the sponsor pick before `submissionDeadline`.
    /// @param requireRegistered Only accept entries from, and pay winners in, `registry`.
    function postBrief(
        bytes32 briefId,
        address prizeToken,
        uint256 prizeAmount,
        uint64 submissionDeadline,
        uint64 judgingDeadline,
        bool allowEarlyPick,
        bool requireRegistered
    ) external payable nonReentrant whenNotPaused {
        if (briefId == bytes32(0)) revert InvalidId();
        if (_briefs[briefId].status != Status.None) revert BriefExists(briefId);
        if (prizeAmount == 0) revert ZeroAmount();
        if (submissionDeadline <= block.timestamp || judgingDeadline <= submissionDeadline) revert InvalidDeadlines();
        if (requireRegistered && address(registry) == address(0)) revert NoRegistry();

        uint16 fee = feeBps;
        _briefs[briefId] = Brief({
            sponsor: msg.sender,
            prizeToken: prizeToken,
            prizeAmount: prizeAmount,
            submissionDeadline: submissionDeadline,
            judgingDeadline: judgingDeadline,
            feeBps: fee,
            allowEarlyPick: allowEarlyPick,
            requireRegistered: requireRegistered,
            status: Status.Open,
            entryCount: 0
        });
        totalOwed[prizeToken] += prizeAmount;

        emit BriefPosted(
            briefId,
            msg.sender,
            prizeToken,
            prizeAmount,
            submissionDeadline,
            judgingDeadline,
            fee,
            allowEarlyPick,
            requireRegistered
        );

        if (prizeToken == address(0)) {
            if (msg.value != prizeAmount) revert WrongValue(prizeAmount, msg.value);
        } else {
            if (msg.value != 0) revert WrongValue(0, msg.value);
            uint256 before = IERC20(prizeToken).balanceOf(address(this));
            prizeToken.pullIn(msg.sender, address(this), prizeAmount);
            uint256 received = IERC20(prizeToken).balanceOf(address(this)) - before;
            if (received != prizeAmount) revert AmountMismatch(prizeAmount, received);
        }
    }

    /// @notice Pick a single winner for the whole prize.
    /// @param entryHash The winning entry's hash. If it was registered on-chain it must belong to `winner`.
    function pickWinner(bytes32 briefId, address winner, bytes32 entryHash) external nonReentrant {
        address[] memory winners = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        bytes32[] memory hashes = new bytes32[](1);
        winners[0] = winner;
        amounts[0] = _briefs[briefId].prizeAmount;
        hashes[0] = entryHash;
        _pick(briefId, winners, amounts, hashes);
    }

    /// @notice Split the prize between up to `MAX_WINNERS` winners. `amounts` must sum exactly to the prize.
    function pickWinners(
        bytes32 briefId,
        address[] calldata winners,
        uint256[] calldata amounts,
        bytes32[] calldata entryHashes
    ) external nonReentrant {
        _pick(briefId, winners, amounts, entryHashes);
    }

    /// @notice Cancel a brief before its submission deadline, only if no entry was registered.
    ///         The prize becomes claimable by the sponsor.
    function cancel(bytes32 briefId) external nonReentrant {
        Brief storage b = _briefs[briefId];
        if (b.status == Status.None) revert UnknownBrief(briefId);
        if (b.sponsor != msg.sender) revert NotSponsor(briefId, msg.sender);
        if (b.status != Status.Open || block.timestamp >= b.submissionDeadline) revert NotOpen(briefId);
        if (b.entryCount != 0) revert HasEntries(briefId, b.entryCount);

        b.status = Status.Cancelled;
        claimable[b.prizeToken][b.sponsor] += b.prizeAmount;
        emit BriefCancelled(briefId);
    }

    // ---------------------------------------------------------------------------------------
    // Registrar
    // ---------------------------------------------------------------------------------------

    /// @notice Record that `agent` handed in `entryHash` for `briefId`. Only while entries are open.
    function registerEntry(bytes32 briefId, address agent, bytes32 entryHash) external {
        if (msg.sender != registrar) revert NotRegistrar(msg.sender);
        if (agent == address(0)) revert ZeroAddress();
        if (entryHash == bytes32(0)) revert InvalidId();
        Brief storage b = _briefs[briefId];
        if (b.status == Status.None) revert UnknownBrief(briefId);
        if (b.status != Status.Open || block.timestamp >= b.submissionDeadline) revert NotOpen(briefId);
        if (entryAgent[briefId][entryHash] != address(0)) revert EntryExists(briefId, entryHash);
        if (b.requireRegistered && !registry.isRegistered(agent)) revert AgentNotRegistered(agent);

        entryAgent[briefId][entryHash] = agent;
        b.entryCount += 1;
        emit EntryRegistered(briefId, agent, entryHash);
    }

    // ---------------------------------------------------------------------------------------
    // Anyone
    // ---------------------------------------------------------------------------------------

    /// @notice After the judging deadline with no pick, mark the brief refunded. The sponsor's prize
    ///         becomes claimable. Callable by anyone, never pausable.
    function expire(bytes32 briefId) external nonReentrant {
        Brief storage b = _briefs[briefId];
        if (b.status == Status.None) revert UnknownBrief(briefId);
        if (b.status != Status.Open || block.timestamp <= b.judgingDeadline) revert NotExpired(briefId);

        b.status = Status.Refunded;
        claimable[b.prizeToken][b.sponsor] += b.prizeAmount;
        emit BriefExpired(briefId, msg.sender);
    }

    /// @notice Withdraw the caller's whole claimable balance of `token` (address(0) = native ETH).
    /// @dev Reverts with `TokenTransfer.TransferRejected` / `NativeTransferRejected` if the token or
    ///      receiver refuses; the balance stays claimable. Never pausable.
    function claim(address token) external nonReentrant {
        uint256 amount = claimable[token][msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimable[token][msg.sender] = 0;
        totalOwed[token] -= amount;
        emit Claimed(token, msg.sender, amount);

        if (token == address(0)) {
            msg.sender.sendNative(amount);
        } else {
            token.sendOut(msg.sender, amount);
        }
    }

    // ---------------------------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------------------------

    /// @notice Full brief record.
    function getBrief(bytes32 briefId) external view returns (Brief memory) {
        return _briefs[briefId];
    }

    /// @notice Derived state (splits stored `Open` into Open / Judging / Expired by time).
    function stateOf(bytes32 briefId) public view returns (State) {
        Brief storage b = _briefs[briefId];
        if (b.status == Status.None) return State.None;
        if (b.status == Status.Settled) return State.Settled;
        if (b.status == Status.Refunded) return State.Refunded;
        if (b.status == Status.Cancelled) return State.Cancelled;
        if (block.timestamp < b.submissionDeadline) return State.Open;
        if (block.timestamp <= b.judgingDeadline) return State.Judging;
        return State.Expired;
    }

    /// @notice Whether the sponsor may pick right now.
    function canPick(bytes32 briefId) public view returns (bool) {
        Brief storage b = _briefs[briefId];
        if (b.status != Status.Open) return false;
        if (block.timestamp > b.judgingDeadline) return false;
        return b.allowEarlyPick || block.timestamp >= b.submissionDeadline;
    }

    // ---------------------------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------------------------

    function _setFee(uint16 feeBps_, address feeRecipient_) private {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh(feeBps_);
        if (feeBps_ > 0 && feeRecipient_ == address(0)) revert ZeroAddress();
        feeBps = feeBps_;
        feeRecipient = feeRecipient_;
        emit FeeUpdated(feeBps_, feeRecipient_);
    }

    function _pick(bytes32 briefId, address[] memory winners, uint256[] memory amounts, bytes32[] memory hashes)
        private
    {
        Brief storage b = _briefs[briefId];
        if (b.status == Status.None) revert UnknownBrief(briefId);
        if (b.sponsor != msg.sender) revert NotSponsor(briefId, msg.sender);
        if (!canPick(briefId)) revert NotJudging(briefId);

        uint256 n = winners.length;
        if (n == 0 || n > MAX_WINNERS) revert BadWinnerCount(n);
        if (amounts.length != n || hashes.length != n) revert LengthMismatch();

        // Effects first: the brief is settled before any balance is credited.
        b.status = Status.Settled;

        uint256 sum = 0;
        uint256 totalFee = 0;
        for (uint256 i; i < n; ++i) {
            sum += amounts[i];
            totalFee += _award(briefId, b, winners[i], amounts[i], hashes[i]);
        }
        if (sum != b.prizeAmount) revert SumMismatch(b.prizeAmount, sum);
        if (totalFee != 0) claimable[b.prizeToken][feeRecipient] += totalFee;

        emit BriefSettled(briefId, n, totalFee);
    }

    /// @dev Validate one winner and credit its net amount. Returns the fee taken on `amount`.
    function _award(bytes32 briefId, Brief storage b, address winner, uint256 amount, bytes32 entryHash)
        private
        returns (uint256 fee)
    {
        if (winner == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (b.requireRegistered && !registry.isRegistered(winner)) revert AgentNotRegistered(winner);
        address registered = entryAgent[briefId][entryHash];
        if (registered != address(0) && registered != winner) revert EntryNotOwnedBy(briefId, entryHash, winner);

        fee = (amount * b.feeBps) / BPS;
        uint256 net = amount - fee;
        claimable[b.prizeToken][winner] += net;
        emit WinnerPicked(briefId, winner, entryHash, net);
    }
}
