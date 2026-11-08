// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

interface IRaqioVault {
    function createStream(
        address beneficiary,
        address token,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 totalDuration,
        bool cancelable
    ) external returns (uint256 lockId);
    function transferLockOwnership(uint256 lockId, address newOwner) external;
}

/// @title RaqioAirdrop
/// @notice Merkle-based token airdrops with optional auto-vesting via RaqioVault.
///         Creators deposit tokens and publish a merkle root. Claimants prove their
///         allocation; if vesting is configured the claim creates a stream in RaqioVault.
contract RaqioAirdrop is ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    struct Campaign {
        address creator;
        address token;
        bytes32 merkleRoot;
        uint256 totalDeposit;
        uint256 totalClaimed;
        uint256 vestingDuration;
        uint256 cliffDuration;
        bool cancelable;
        uint256 expiresAt;
        uint256 totalSwept;
    }

    IRaqioVault public immutable vault;
    uint256 public nextCampaignId;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, address token, bytes32 merkleRoot, uint256 totalDeposit, uint256 vestingDuration, uint256 expiresAt);
    event AirdropClaimed(uint256 indexed campaignId, address indexed claimant, uint256 amount, uint256 lockId);
    event CampaignSwept(uint256 indexed campaignId, address indexed creator, uint256 amount);

    error ZeroAddress();
    error ZeroAmount();
    error InvalidDuration();
    error AlreadyClaimed();
    error InvalidProof();
    error CampaignNotFound();
    error CampaignNotExpired();
    error NotCampaignCreator();
    error CampaignExpired();
    error InsufficientCampaignBalance();
    error UnsupportedToken();

    /// @param _vault Address of the RaqioVault contract.
    constructor(address _vault) Ownable(msg.sender) {
        if (_vault == address(0)) revert ZeroAddress();
        vault = IRaqioVault(_vault);
    }

    /// @notice Create a new airdrop campaign.
    /// @param token ERC-20 token to distribute.
    /// @param merkleRoot Root of the merkle tree encoding (address, uint256 amount) leaves.
    /// @param totalDeposit Total tokens to deposit (must cover all leaves).
    /// @param vestingDuration If > 0, each claim creates a vesting stream of this duration.
    /// @param cliffDuration Cliff period within the vesting duration (0 for no cliff).
    /// @param cancelable Whether vesting streams can be canceled by the creator.
    /// @param duration Campaign lifetime in seconds. After expiry the creator can sweep unclaimed tokens.
    /// @return campaignId The ID of the created campaign.
    function createCampaign(
        address token,
        bytes32 merkleRoot,
        uint256 totalDeposit,
        uint256 vestingDuration,
        uint256 cliffDuration,
        bool cancelable,
        uint256 duration
    ) external nonReentrant returns (uint256 campaignId) {
        if (token == address(0) || token.code.length == 0) revert ZeroAddress();
        if (merkleRoot == bytes32(0)) revert InvalidProof();
        if (totalDeposit == 0) revert ZeroAmount();
        if (duration == 0) revert InvalidDuration();
        if (cliffDuration > vestingDuration) revert InvalidDuration();

        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalDeposit);
        if (IERC20(token).balanceOf(address(this)) - beforeBalance != totalDeposit) revert UnsupportedToken();

        campaignId = nextCampaignId++;
        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            token: token,
            merkleRoot: merkleRoot,
            totalDeposit: totalDeposit,
            totalClaimed: 0,
            vestingDuration: vestingDuration,
            cliffDuration: cliffDuration,
            cancelable: cancelable,
            expiresAt: block.timestamp + duration,
            totalSwept: 0
        });

        emit CampaignCreated(campaignId, msg.sender, token, merkleRoot, totalDeposit, vestingDuration, block.timestamp + duration);
    }

    /// @notice Claim an airdrop allocation. If vesting is configured, a stream is created in RaqioVault.
    /// @param campaignId The campaign to claim from.
    /// @param amount The claimant's allocation as encoded in the merkle tree.
    /// @param proof The merkle proof for (msg.sender, amount).
    /// @return lockId The RaqioVault lock ID if vesting, or 0 for instant claims.
    function claimAirdrop(
        uint256 campaignId,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant returns (uint256 lockId) {
        Campaign storage c = _getCampaign(campaignId);
        if (block.timestamp >= c.expiresAt) revert CampaignExpired();
        if (claimed[campaignId][msg.sender]) revert AlreadyClaimed();
        if (amount == 0) revert ZeroAmount();
        if (amount > c.totalDeposit - c.totalClaimed - c.totalSwept) revert InsufficientCampaignBalance();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        if (!MerkleProof.verify(proof, c.merkleRoot, leaf)) revert InvalidProof();

        claimed[campaignId][msg.sender] = true;
        c.totalClaimed += amount;

        if (c.vestingDuration > 0) {
            IERC20(c.token).forceApprove(address(vault), amount);
            lockId = vault.createStream(
                msg.sender,
                c.token,
                amount,
                block.timestamp,
                c.cliffDuration,
                c.vestingDuration,
                c.cancelable
            );
            IERC20(c.token).forceApprove(address(vault), 0);
            vault.transferLockOwnership(lockId, c.creator);
        } else {
            IERC20(c.token).safeTransfer(msg.sender, amount);
            lockId = 0;
        }

        emit AirdropClaimed(campaignId, msg.sender, amount, lockId);
    }

    /// @notice Sweep unclaimed tokens after campaign expiry. Creator only.
    function sweep(uint256 campaignId) external nonReentrant {
        Campaign storage c = _getCampaign(campaignId);
        if (msg.sender != c.creator) revert NotCampaignCreator();
        if (block.timestamp < c.expiresAt) revert CampaignNotExpired();

        uint256 remaining = c.totalDeposit - c.totalClaimed - c.totalSwept;
        if (remaining == 0) revert ZeroAmount();

        c.totalSwept += remaining;
        IERC20(c.token).safeTransfer(c.creator, remaining);

        emit CampaignSwept(campaignId, c.creator, remaining);
    }

    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    function _getCampaign(uint256 campaignId) internal view returns (Campaign storage) {
        Campaign storage c = campaigns[campaignId];
        if (c.token == address(0)) revert CampaignNotFound();
        return c;
    }
}
