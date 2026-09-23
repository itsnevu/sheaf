// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {TokenTransfer} from "./TokenTransfer.sol";

/// @title StealthDesk (Sheaf operation: ACCUMULATE)
/// @notice Stealth accumulation desk. A `treasury` deposits tokens into its desk balance and
///         commits a plan: a Merkle root over legs `(recipient, token, amount, notBefore, salt)`,
///         each keyed by its `legIndex`. An `operator` chosen by the treasury reveals and
///         executes legs one at a time with a Merkle proof. Each leg pays `amount` of `token`
///         to `recipient` from the treasury's balance, no earlier than `notBefore`, at most once.
///
/// @dev Privacy statement (read this before relying on the contract):
///      - Legs that have not been executed yet, and therefore the plan's total size and its
///        list of recipients, are hidden behind the commitment. That is the whole privacy
///        property.
///      - Every executed leg is a public `Transfer` from this contract to `recipient`, with a
///        public `LegExecuted(planId, legIndex, recipient, token, amount)` event. Observers see
///        every payout from the desk, its size and its timing, and can correlate them.
///      - `planId` is linked to the treasury by `PlanCommitted`, so every executed leg is
///        attributable to the treasury. Nothing here is anonymous, untraceable or unlinkable.
///        Do not describe it that way.
///
///      Restricted tokens: if `token` performs compliance checks and `recipient` is not allowed
///      to receive it, `executeLeg` reverts with `TokenTransfer.TransferRejected` and the leg
///      stays unexecuted. The treasury can cancel the plan and withdraw at any time.
contract StealthDesk is ReentrancyGuard {
    using TokenTransfer for address;

    // ---------------------------------------------------------------- types

    /// @notice One payout inside a plan.
    /// @param recipient Who receives the tokens.
    /// @param token Which ERC-20.
    /// @param amount How much.
    /// @param notBefore Earliest unix second at which the leg may execute.
    /// @param salt Random value so the leaf hash reveals nothing before execution.
    struct Leg {
        address recipient;
        address token;
        uint256 amount;
        uint64 notBefore;
        bytes32 salt;
    }

    /// @notice A committed plan.
    struct Plan {
        address treasury;
        bytes32 root;
        bool cancelled;
    }

    // ---------------------------------------------------------------- errors

    /// @notice `planId` is already in use.
    error PlanExists(bytes32 planId);
    /// @notice `planId` does not exist.
    error PlanNotFound(bytes32 planId);
    /// @notice The plan was cancelled.
    error PlanIsCancelled(bytes32 planId);
    /// @notice Caller is neither the plan's treasury nor its operator.
    error NotOperator(address caller, address treasury);
    /// @notice Caller is not the plan's treasury.
    error NotTreasury(address caller, address treasury);
    /// @notice The leg at `legIndex` was already executed.
    error LegAlreadyExecuted(bytes32 planId, uint256 legIndex);
    /// @notice The leg's `notBefore` has not been reached.
    error LegTooEarly(uint64 notBefore, uint256 nowTs);
    /// @notice The leg + proof do not verify against the plan root.
    error InvalidLegProof();
    /// @notice The treasury's desk balance in `token` is too small.
    error InsufficientBalance(address token, uint256 have, uint256 need);
    /// @notice Zero address / zero root / zero amount where not allowed.
    error ZeroValue();

    // ---------------------------------------------------------------- events

    /// @notice Tokens deposited into `treasury`'s desk balance.
    event Deposited(address indexed treasury, address indexed token, uint256 amount);
    /// @notice Tokens withdrawn from `treasury`'s desk balance to `to`.
    event Withdrawn(address indexed treasury, address indexed token, address indexed to, uint256 amount);
    /// @notice `treasury` set its operator.
    event OperatorSet(address indexed treasury, address indexed operator);
    /// @notice A plan was committed.
    event PlanCommitted(bytes32 indexed planId, address indexed treasury, bytes32 root);
    /// @notice A plan was cancelled; its remaining legs are void.
    event PlanCancelled(bytes32 indexed planId, address indexed treasury);
    /// @notice A leg was revealed and paid. This is public.
    event LegExecuted(
        bytes32 indexed planId, uint256 indexed legIndex, address indexed recipient, address token, uint256 amount
    );

    // ---------------------------------------------------------------- storage

    /// @notice Desk balance: treasury => token => amount.
    mapping(address => mapping(address => uint256)) public balanceOf;
    /// @notice Operator per treasury (zero = only the treasury itself can execute).
    mapping(address => address) public operatorOf;
    /// @notice Plans by id.
    mapping(bytes32 => Plan) public plans;
    /// @notice planId => legIndex => executed.
    mapping(bytes32 => mapping(uint256 => bool)) public legExecuted;

    // ---------------------------------------------------------------- balance

    /// @notice Deposit `amount` of `token` into the caller's desk balance.
    ///         The amount credited is the balance actually received (fee-on-transfer safe).
    function deposit(address token, uint256 amount) external nonReentrant {
        if (token == address(0) || amount == 0) revert ZeroValue();
        uint256 before = IERC20(token).balanceOf(address(this));
        token.pullIn(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        balanceOf[msg.sender][token] += received;
        emit Deposited(msg.sender, token, received);
    }

    /// @notice Withdraw `amount` of `token` from the caller's desk balance to `to`. Any time.
    function withdraw(address token, address to, uint256 amount) external nonReentrant {
        if (to == address(0)) revert ZeroValue();
        uint256 have = balanceOf[msg.sender][token];
        if (have < amount) revert InsufficientBalance(token, have, amount);
        balanceOf[msg.sender][token] = have - amount;
        token.sendOut(to, amount);
        emit Withdrawn(msg.sender, token, to, amount);
    }

    /// @notice Set (or clear, with zero) the operator allowed to execute the caller's plans.
    function setOperator(address operator) external {
        operatorOf[msg.sender] = operator;
        emit OperatorSet(msg.sender, operator);
    }

    // ---------------------------------------------------------------- plans

    /// @notice Commit a plan. `root` is the Merkle root over `leafOf(planId, legIndex, leg)` leaves.
    /// @param planId Caller-chosen unique id.
    /// @param root Merkle root of the legs.
    function commitPlan(bytes32 planId, bytes32 root) external {
        if (root == bytes32(0)) revert ZeroValue();
        if (plans[planId].treasury != address(0)) revert PlanExists(planId);
        plans[planId] = Plan({treasury: msg.sender, root: root, cancelled: false});
        emit PlanCommitted(planId, msg.sender, root);
    }

    /// @notice Cancel a plan. Remaining legs become void. Treasury only.
    function cancelPlan(bytes32 planId) external {
        Plan storage p = plans[planId];
        if (p.treasury == address(0)) revert PlanNotFound(planId);
        if (p.treasury != msg.sender) revert NotTreasury(msg.sender, p.treasury);
        if (p.cancelled) revert PlanIsCancelled(planId);
        p.cancelled = true;
        emit PlanCancelled(planId, msg.sender);
    }

    /// @notice Reveal and execute one leg. Callable by the plan's treasury or its operator.
    /// @param planId The plan.
    /// @param legIndex Position of the leg in the plan (bound into the leaf).
    /// @param leg The leg contents.
    /// @param proof Merkle proof for `leafOf(planId, legIndex, leg)`.
    function executeLeg(bytes32 planId, uint256 legIndex, Leg calldata leg, bytes32[] calldata proof)
        external
        nonReentrant
    {
        Plan storage p = plans[planId];
        if (p.treasury == address(0)) revert PlanNotFound(planId);
        if (p.cancelled) revert PlanIsCancelled(planId);
        if (msg.sender != p.treasury && msg.sender != operatorOf[p.treasury]) {
            revert NotOperator(msg.sender, p.treasury);
        }
        if (legExecuted[planId][legIndex]) revert LegAlreadyExecuted(planId, legIndex);
        if (block.timestamp < leg.notBefore) revert LegTooEarly(leg.notBefore, block.timestamp);
        if (!MerkleProof.verifyCalldata(proof, p.root, leafOf(planId, legIndex, leg))) revert InvalidLegProof();

        uint256 have = balanceOf[p.treasury][leg.token];
        if (have < leg.amount) revert InsufficientBalance(leg.token, have, leg.amount);

        legExecuted[planId][legIndex] = true;
        balanceOf[p.treasury][leg.token] = have - leg.amount;
        leg.token.sendOut(leg.recipient, leg.amount);
        emit LegExecuted(planId, legIndex, leg.recipient, leg.token, leg.amount);
    }

    /// @notice Merkle leaf for a leg. Double-hashed to prevent second-preimage attacks.
    function leafOf(bytes32 planId, uint256 legIndex, Leg memory leg) public pure returns (bytes32) {
        return keccak256(
            bytes.concat(
                keccak256(abi.encode(planId, legIndex, leg.recipient, leg.token, leg.amount, leg.notBefore, leg.salt))
            )
        );
    }
}
