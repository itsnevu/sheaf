// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {TokenTransfer} from "./TokenTransfer.sol";

/// @title PrivateClaim (Sheaf operation: CLAIM)
/// @notice Private allocation claim. A launch or airdrop publishes a Merkle root over
///         `(account, amount)`. The eligible `account` proves membership and names a
///         `recipient` (typically a fresh address). Tokens go straight to `recipient`;
///         `account` never holds them. Either `account` calls `claim` itself, or it signs an
///         EIP-712 `Claim` message and a relayer submits `claimWithSignature`, so `account`
///         does not need to send a transaction at all.
///
/// @dev Privacy statement (read this before relying on the contract):
///      - The wallet that owns the eligibility (`account`) does not appear as the token
///        destination. That is the whole privacy property.
///      - The `Claimed(account, recipient, amount)` event, the calldata of the claim
///        transaction and the resulting `Transfer` log are all public. Anyone reading the
///        chain can link `account` to `recipient`. This is unavoidable on an L2 with public
///        calldata; the contract does not and cannot hide it.
///      - Amounts and timing stay correlatable. Nothing here is anonymous, untraceable or
///        unlinkable. Do not describe it that way.
///
///      Restricted tokens: if the claim token performs compliance checks and `recipient` is
///      not allowed to receive it, the payout reverts with `TokenTransfer.TransferRejected`.
///      Nothing is marked claimed in that case; `account` can claim again to a different
///      recipient.
contract PrivateClaim is Ownable2Step, EIP712, ReentrancyGuard {
    using TokenTransfer for address;

    // ---------------------------------------------------------------- errors

    /// @notice Root or window is not set.
    error WindowNotConfigured();
    /// @notice `start >= end`.
    error InvalidWindow(uint64 start, uint64 end);
    /// @notice Current time is outside `[start, end]`.
    error WindowClosed(uint64 start, uint64 end, uint256 nowTs);
    /// @notice The claim window has not ended yet (sweep is not allowed).
    error WindowStillOpen(uint64 end, uint256 nowTs);
    /// @notice `account` already claimed.
    error AlreadyClaimed(address account);
    /// @notice The Merkle proof does not verify against the root.
    error InvalidProof();
    /// @notice `recipient` is the zero address.
    error ZeroRecipient();
    /// @notice `msg.sender` is not `account` (direct claim path).
    error NotAccount(address caller, address account);
    /// @notice The signature deadline has passed.
    error SignatureExpired(uint256 deadline, uint256 nowTs);
    /// @notice The signature was not produced by `account`.
    error InvalidSignature();
    /// @notice The root cannot be changed after the first claim.
    error RootLocked();

    // ---------------------------------------------------------------- events

    /// @notice Root and window were set.
    event Configured(bytes32 indexed root, uint64 start, uint64 end);
    /// @notice Owner funded the contract with `amount` of the claim token.
    event Funded(address indexed from, uint256 amount);
    /// @notice A claim was paid. NOTE: this publicly links `account` to `recipient`.
    event Claimed(address indexed account, address indexed recipient, uint256 amount);
    /// @notice Owner swept `amount` of unclaimed tokens to `to` after the window.
    event Swept(address indexed to, uint256 amount);

    // ---------------------------------------------------------------- storage

    /// @notice EIP-712 type hash for `Claim(address account,address recipient,uint256 amount,uint256 deadline)`.
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("Claim(address account,address recipient,uint256 amount,uint256 deadline)");

    /// @notice The token being distributed.
    IERC20 public immutable token;
    /// @notice Merkle root over `leaf(account, amount)` leaves.
    bytes32 public root;
    /// @notice Claim window start (inclusive), unix seconds.
    uint64 public start;
    /// @notice Claim window end (inclusive), unix seconds.
    uint64 public end;
    /// @notice Number of successful claims so far. Once non-zero the root is locked.
    uint256 public claimCount;
    /// @notice Whether `account` has claimed.
    mapping(address => bool) public claimed;

    // ---------------------------------------------------------------- setup

    /// @param initialOwner Address that funds, configures and sweeps.
    /// @param token_ The ERC-20 to distribute.
    constructor(address initialOwner, IERC20 token_) Ownable(initialOwner) EIP712("Sheaf PrivateClaim", "1") {
        token = token_;
    }

    /// @notice Set the Merkle root and the claim window. Owner only. Locked after the first claim.
    /// @param root_ Merkle root over `(account, amount)` leaves.
    /// @param start_ Window start (inclusive).
    /// @param end_ Window end (inclusive); must be after `start_`.
    function configure(bytes32 root_, uint64 start_, uint64 end_) external onlyOwner {
        if (claimCount != 0) revert RootLocked();
        if (start_ >= end_) revert InvalidWindow(start_, end_);
        root = root_;
        start = start_;
        end = end_;
        emit Configured(root_, start_, end_);
    }

    /// @notice Pull `amount` of the claim token from the owner into this contract.
    ///         Owner may also transfer tokens directly; this helper only adds an event.
    function fund(uint256 amount) external onlyOwner {
        address(token).pullIn(msg.sender, address(this), amount);
        emit Funded(msg.sender, amount);
    }

    /// @notice After the window closes, send `amount` of the remaining balance to `to`. Owner only.
    function sweep(address to, uint256 amount) external nonReentrant onlyOwner {
        if (end == 0) revert WindowNotConfigured();
        if (block.timestamp <= end) revert WindowStillOpen(end, block.timestamp);
        if (to == address(0)) revert ZeroRecipient();
        address(token).sendOut(to, amount);
        emit Swept(to, amount);
    }

    // ---------------------------------------------------------------- claims

    /// @notice Claim directly. `msg.sender` must be `account`.
    /// @param account The eligible address in the Merkle tree.
    /// @param recipient Where the tokens go. Publicly linked to `account` on-chain.
    /// @param amount The amount in the Merkle leaf.
    /// @param proof Merkle proof for the `(account, amount)` leaf.
    function claim(address account, address recipient, uint256 amount, bytes32[] calldata proof) external nonReentrant {
        if (msg.sender != account) revert NotAccount(msg.sender, account);
        _claim(account, recipient, amount, proof);
    }

    /// @notice Claim on behalf of `account` with its EIP-712 signature. Anyone (a relayer) may
    ///         call this. Replay is prevented by the one-claim-per-account rule: once
    ///         `claimed[account]` is true the same signature is useless, so no separate nonce
    ///         is needed. `deadline` bounds how long an unsubmitted signature stays usable.
    /// @param account The eligible address in the Merkle tree and the signer.
    /// @param recipient Where the tokens go. Bound into the signature.
    /// @param amount The amount in the Merkle leaf. Bound into the signature.
    /// @param deadline Last unix second at which the signature is valid.
    /// @param proof Merkle proof for the `(account, amount)` leaf.
    /// @param signature EIP-712 signature by `account` over `Claim(account, recipient, amount, deadline)`.
    function claimWithSignature(
        address account,
        address recipient,
        uint256 amount,
        uint256 deadline,
        bytes32[] calldata proof,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert SignatureExpired(deadline, block.timestamp);
        bytes32 digest = hashClaim(account, recipient, amount, deadline);
        (address signer, ECDSA.RecoverError err,) = ECDSA.tryRecover(digest, signature);
        if (err != ECDSA.RecoverError.NoError || signer != account) revert InvalidSignature();
        _claim(account, recipient, amount, proof);
    }

    /// @notice EIP-712 digest that `account` must sign for `claimWithSignature`.
    function hashClaim(address account, address recipient, uint256 amount, uint256 deadline)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, account, recipient, amount, deadline)));
    }

    /// @notice Merkle leaf for `(account, amount)`. Double-hashed to prevent second-preimage attacks.
    function leaf(address account, uint256 amount) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    }

    /// @notice EIP-712 domain separator (exposed for off-chain signers).
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _claim(address account, address recipient, uint256 amount, bytes32[] calldata proof) private {
        if (root == bytes32(0) || end == 0) revert WindowNotConfigured();
        if (block.timestamp < start || block.timestamp > end) revert WindowClosed(start, end, block.timestamp);
        if (recipient == address(0)) revert ZeroRecipient();
        if (claimed[account]) revert AlreadyClaimed(account);
        if (!MerkleProof.verifyCalldata(proof, root, leaf(account, amount))) revert InvalidProof();

        claimed[account] = true;
        claimCount += 1;
        address(token).sendOut(recipient, amount);
        emit Claimed(account, recipient, amount);
    }
}
