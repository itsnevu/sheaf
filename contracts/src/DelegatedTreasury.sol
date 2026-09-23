// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {TokenTransfer} from "./TokenTransfer.sol";

/// @title DelegatedTreasury (Sheaf operation: TREASURY)
/// @notice Delegated treasury with on-chain four-eyes. The OWNER funds the contract and sets
///         roles and per-token daily caps. An OPERATOR proposes a payment `(token, to, amount)`
///         and, once an APPROVER who is not the proposer has approved it, an OPERATOR executes
///         it. Execution is subject to a per-token daily spend cap. The owner can withdraw
///         everything at any time.
///
/// @dev Privacy statement: this contract is about control, not privacy. Every proposal,
///      approval and payment is public on-chain, including `to`. What it gives an
///      organisation is that the wallet holding the funds (this contract, controlled by the
///      owner) is not the wallet that day-to-day staff use, and that no single staff key can
///      move funds. Nothing here is anonymous, untraceable or unlinkable.
///
///      Daily cap: per token, a 24-hour window starts at the first execution after the previous
///      window ended; spend inside the window may not exceed `dailyCap[token]`. A cap of zero
///      means no proposal in that token can be executed until the owner sets a cap. The owner's
///      own `withdraw` is not subject to the cap.
///
///      Restricted tokens: if `token` refuses the transfer to `to`, `execute` reverts with
///      `TokenTransfer.TransferRejected`; the proposal stays Approved and can be retried or
///      cancelled.
contract DelegatedTreasury is Ownable2Step, ReentrancyGuard {
    using TokenTransfer for address;

    // ---------------------------------------------------------------- types

    /// @notice Proposal state.
    enum Status {
        None,
        Proposed,
        Approved,
        Executed,
        Cancelled
    }

    /// @notice A payment proposal.
    struct Proposal {
        address token;
        address to;
        uint256 amount;
        address proposer;
        address approver;
        Status status;
    }

    // ---------------------------------------------------------------- errors

    /// @notice Caller lacks the OPERATOR role.
    error NotOperator(address caller);
    /// @notice Caller lacks the APPROVER role.
    error NotApprover(address caller);
    /// @notice Caller is neither owner nor the proposal's proposer.
    error NotOwnerOrProposer(address caller);
    /// @notice Four-eyes: the proposer may not approve its own proposal.
    error ProposerCannotApprove(uint256 proposalId, address proposer);
    /// @notice The proposal is not in the state required by this action.
    error WrongStatus(uint256 proposalId, Status status);
    /// @notice Executing would push spend in `token` over the daily cap.
    error DailyCapExceeded(address token, uint256 cap, uint256 spentInWindow, uint256 amount);
    /// @notice A zero address or zero amount where not allowed.
    error ZeroValue();

    // ---------------------------------------------------------------- events

    /// @notice OPERATOR role granted or revoked.
    event OperatorSet(address indexed account, bool enabled);
    /// @notice APPROVER role granted or revoked.
    event ApproverSet(address indexed account, bool enabled);
    /// @notice Daily cap for `token` set.
    event DailyCapSet(address indexed token, uint256 cap);
    /// @notice Owner funded the treasury.
    event Funded(address indexed from, address indexed token, uint256 amount);
    /// @notice Owner withdrew.
    event Withdrawn(address indexed token, address indexed to, uint256 amount);
    /// @notice A payment was proposed.
    event Proposed(uint256 indexed proposalId, address indexed proposer, address token, address to, uint256 amount);
    /// @notice A proposal was approved.
    event Approved(uint256 indexed proposalId, address indexed approver);
    /// @notice A proposal was executed and paid.
    event Executed(uint256 indexed proposalId, address indexed executor, address token, address to, uint256 amount);
    /// @notice A proposal was cancelled.
    event Cancelled(uint256 indexed proposalId, address indexed by);

    // ---------------------------------------------------------------- storage

    /// @notice Length of a spend window.
    uint256 public constant WINDOW = 1 days;

    /// @notice OPERATOR role.
    mapping(address => bool) public isOperator;
    /// @notice APPROVER role.
    mapping(address => bool) public isApprover;
    /// @notice Daily cap per token. Zero = nothing executable.
    mapping(address => uint256) public dailyCap;
    /// @notice Start of the current spend window per token.
    mapping(address => uint256) public windowStart;
    /// @notice Spend inside the current window per token.
    mapping(address => uint256) public spentInWindow;
    /// @notice Proposals by id (ids start at 1).
    mapping(uint256 => Proposal) public proposals;
    /// @notice Number of proposals so far.
    uint256 public proposalCount;

    // ---------------------------------------------------------------- setup

    /// @param initialOwner The OWNER: funds, sets roles and limits, may withdraw everything.
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Grant or revoke OPERATOR. Owner only.
    function setOperator(address account, bool enabled) external onlyOwner {
        if (account == address(0)) revert ZeroValue();
        isOperator[account] = enabled;
        emit OperatorSet(account, enabled);
    }

    /// @notice Grant or revoke APPROVER. Owner only.
    function setApprover(address account, bool enabled) external onlyOwner {
        if (account == address(0)) revert ZeroValue();
        isApprover[account] = enabled;
        emit ApproverSet(account, enabled);
    }

    /// @notice Set the daily cap for `token`. Owner only. Zero blocks execution in that token.
    function setDailyCap(address token, uint256 cap) external onlyOwner {
        dailyCap[token] = cap;
        emit DailyCapSet(token, cap);
    }

    /// @notice Pull `amount` of `token` from the owner into the treasury. Owner only.
    ///         The owner may also transfer tokens directly; this helper only adds an event.
    function fund(address token, uint256 amount) external onlyOwner {
        token.pullIn(msg.sender, address(this), amount);
        emit Funded(msg.sender, token, amount);
    }

    /// @notice Withdraw `amount` of `token` to `to`. Owner only, any time, not capped.
    function withdraw(address token, address to, uint256 amount) external nonReentrant onlyOwner {
        if (to == address(0)) revert ZeroValue();
        token.sendOut(to, amount);
        emit Withdrawn(token, to, amount);
    }

    // ---------------------------------------------------------------- lifecycle

    /// @notice Propose a payment. OPERATOR only.
    /// @return proposalId The new proposal's id.
    function propose(address token, address to, uint256 amount) external returns (uint256 proposalId) {
        if (!isOperator[msg.sender]) revert NotOperator(msg.sender);
        if (token == address(0) || to == address(0) || amount == 0) revert ZeroValue();
        proposalId = ++proposalCount;
        proposals[proposalId] = Proposal({
            token: token, to: to, amount: amount, proposer: msg.sender, approver: address(0), status: Status.Proposed
        });
        emit Proposed(proposalId, msg.sender, token, to, amount);
    }

    /// @notice Approve a proposal. APPROVER only, and never the proposer (four-eyes).
    function approve(uint256 proposalId) external {
        if (!isApprover[msg.sender]) revert NotApprover(msg.sender);
        Proposal storage p = proposals[proposalId];
        if (p.status != Status.Proposed) revert WrongStatus(proposalId, p.status);
        if (p.proposer == msg.sender) revert ProposerCannotApprove(proposalId, p.proposer);
        p.status = Status.Approved;
        p.approver = msg.sender;
        emit Approved(proposalId, msg.sender);
    }

    /// @notice Execute an approved proposal. OPERATOR only. Enforces the daily cap.
    function execute(uint256 proposalId) external nonReentrant {
        if (!isOperator[msg.sender]) revert NotOperator(msg.sender);
        Proposal storage p = proposals[proposalId];
        if (p.status != Status.Approved) revert WrongStatus(proposalId, p.status);

        _chargeCap(p.token, p.amount);

        p.status = Status.Executed;
        p.token.sendOut(p.to, p.amount);
        emit Executed(proposalId, msg.sender, p.token, p.to, p.amount);
    }

    /// @notice Cancel a Proposed or Approved proposal. Owner or the proposer.
    function cancel(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.status != Status.Proposed && p.status != Status.Approved) revert WrongStatus(proposalId, p.status);
        if (msg.sender != owner() && msg.sender != p.proposer) revert NotOwnerOrProposer(msg.sender);
        p.status = Status.Cancelled;
        emit Cancelled(proposalId, msg.sender);
    }

    /// @notice Read a proposal.
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /// @notice Remaining spend allowed in `token` before the current window's cap is hit.
    function remainingToday(address token) external view returns (uint256) {
        uint256 cap = dailyCap[token];
        if (block.timestamp >= windowStart[token] + WINDOW) return cap;
        uint256 spent = spentInWindow[token];
        return spent >= cap ? 0 : cap - spent;
    }

    function _chargeCap(address token, uint256 amount) private {
        uint256 cap = dailyCap[token];
        if (block.timestamp >= windowStart[token] + WINDOW) {
            windowStart[token] = block.timestamp;
            spentInWindow[token] = 0;
        }
        uint256 spent = spentInWindow[token];
        if (spent + amount > cap) revert DailyCapExceeded(token, cap, spent, amount);
        spentInWindow[token] = spent + amount;
    }
}
