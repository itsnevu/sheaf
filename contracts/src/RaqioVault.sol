// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title RaqioVault
/// @notice Unified token lock, LP lock, and vesting engine for the Raqio protocol.
///         Supports simple time-locks, LP position locks (ERC-20 and ERC-721),
///         linear vesting streams, and cliff + linear vesting.
///         No admin function can withdraw locked tokens. Fee management only.
contract RaqioVault is ReentrancyGuard, Ownable2Step, IERC721Receiver {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────────────────────────────────
    // Types
    // ──────────────────────────────────────────────────────────────────────────

    enum LockType { TOKEN, LP, STREAM, CLIFF_STREAM }

    struct Lock {
        uint256 id;
        LockType lockType;
        address owner;
        address beneficiary;
        address token;
        uint256 tokenId;
        uint256 amount;
        uint256 startTime;
        uint256 cliffTime;
        uint256 endTime;
        uint256 claimed;
        bool cancelable;
        bool canceled;
        bool withdrawn;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Storage
    // ──────────────────────────────────────────────────────────────────────────

    uint256 public nextLockId;
    mapping(uint256 => Lock) internal _locks;
    mapping(address => uint256[]) internal _userLocks;
    mapping(uint256 => bool) public isNFTLock;
    mapping(address => uint256[]) internal _tokenLocks;
    mapping(address => mapping(uint256 => bool)) private _associated;
    address private _receivingNFT;
    address private _receivingFrom;
    uint256 private _receivingId;

    address public feeRouter;
    uint256 public feeBps;
    uint256 public constant MAX_FEE_BPS = 50;

    uint256 public pendingFeeBps;
    uint256 public feeChangeReadyAt;
    uint256 public constant FEE_TIMELOCK = 48 hours;

    // ──────────────────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────────────────

    event TokensLocked(uint256 indexed lockId, address indexed owner, address token, uint256 amount, uint256 unlockTime);
    event LPLocked(uint256 indexed lockId, address indexed owner, address lpToken, uint256 amount, uint256 unlockTime);
    event NFTPositionLocked(uint256 indexed lockId, address indexed owner, address nftContract, uint256 tokenId, uint256 unlockTime);
    event StreamCreated(uint256 indexed lockId, address indexed owner, address indexed beneficiary, address token, uint256 amount, uint256 startTime, uint256 cliffTime, uint256 endTime);
    event Claimed(uint256 indexed lockId, address indexed beneficiary, uint256 amount);
    event Canceled(uint256 indexed lockId, uint256 senderAmount, uint256 recipientAmount);
    event LockExtended(uint256 indexed lockId, uint256 oldUnlockTime, uint256 newUnlockTime);
    event LockOwnershipTransferred(uint256 indexed lockId, address indexed oldOwner, address indexed newOwner);
    event TokensAdded(uint256 indexed lockId, uint256 additionalAmount, uint256 newTotal);
    event FeeChangeProposed(uint256 newFeeBps, uint256 readyAt);
    event FeeChangeExecuted(uint256 oldFeeBps, uint256 newFeeBps);

    // ──────────────────────────────────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────────────────────────────────

    error ZeroAddress();
    error ZeroAmount();
    error InvalidTime();
    error NotLockOwner();
    error NotBeneficiary();
    error LockNotFound();
    error AlreadyWithdrawn();
    error AlreadyCanceled();
    error NotCancelable();
    error StillLocked();
    error NothingToClaim();
    error CannotShorten();
    error FeeTooHigh();
    error TimelockNotReady();
    error NoPendingFeeChange();
    error CannotAddToNFTLock();
    error CannotAddToStreamType();
    error CannotExtendStream();
    error UnsupportedToken();
    error UnexpectedNFT();

    // ──────────────────────────────────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────────────────────────────────

    /// @param _feeRouter Address that receives protocol fees.
    /// @param _feeBps Fee in basis points (max 50).
    constructor(address _feeRouter, uint256 _feeBps) Ownable(msg.sender) {
        if (_feeRouter == address(0)) revert ZeroAddress();
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        feeRouter = _feeRouter;
        feeBps = _feeBps;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Lock functions
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Lock ERC-20 tokens until a specified time.
    /// @param token ERC-20 token address.
    /// @param amount Amount to lock (before fee deduction).
    /// @param unlockTime Unix timestamp when tokens can be withdrawn.
    /// @param beneficiary Address that can withdraw after unlock.
    /// @return lockId The ID of the created lock.
    function lockTokens(
        address token,
        uint256 amount,
        uint256 unlockTime,
        address beneficiary
    ) external nonReentrant returns (uint256 lockId) {
        if (token == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (unlockTime <= block.timestamp) revert InvalidTime();

        uint256 netAmount = _collectFee(token, amount);

        lockId = nextLockId++;
        _locks[lockId] = Lock({
            id: lockId,
            lockType: LockType.TOKEN,
            owner: msg.sender,
            beneficiary: beneficiary,
            token: token,
            tokenId: 0,
            amount: netAmount,
            startTime: block.timestamp,
            cliffTime: 0,
            endTime: unlockTime,
            claimed: 0,
            cancelable: false,
            canceled: false,
            withdrawn: false
        });
        _indexLock(lockId);

        emit TokensLocked(lockId, msg.sender, token, netAmount, unlockTime);
    }

    /// @notice Lock LP tokens (ERC-20) until a specified time.
    function lockLP(
        address lpToken,
        uint256 amount,
        uint256 unlockTime,
        address beneficiary
    ) external nonReentrant returns (uint256 lockId) {
        if (lpToken == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (unlockTime <= block.timestamp) revert InvalidTime();

        uint256 netAmount = _collectFee(lpToken, amount);

        lockId = nextLockId++;
        _locks[lockId] = Lock({
            id: lockId,
            lockType: LockType.LP,
            owner: msg.sender,
            beneficiary: beneficiary,
            token: lpToken,
            tokenId: 0,
            amount: netAmount,
            startTime: block.timestamp,
            cliffTime: 0,
            endTime: unlockTime,
            claimed: 0,
            cancelable: false,
            canceled: false,
            withdrawn: false
        });
        _indexLock(lockId);

        emit LPLocked(lockId, msg.sender, lpToken, netAmount, unlockTime);
    }

    /// @notice Lock an ERC-721 NFT position (Uniswap V3/V4 LP).
    function lockNFTPosition(
        address nftContract,
        uint256 tokenId,
        uint256 unlockTime,
        address beneficiary
    ) external nonReentrant returns (uint256 lockId) {
        if (nftContract == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (unlockTime <= block.timestamp) revert InvalidTime();

        _receivingNFT = nftContract;
        _receivingFrom = msg.sender;
        _receivingId = tokenId;
        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), tokenId);
        if (IERC721(nftContract).ownerOf(tokenId) != address(this)) revert UnexpectedNFT();
        _receivingNFT = address(0);
        _receivingFrom = address(0);

        lockId = nextLockId++;
        _locks[lockId] = Lock({
            id: lockId,
            lockType: LockType.LP,
            owner: msg.sender,
            beneficiary: beneficiary,
            token: nftContract,
            tokenId: tokenId,
            amount: 0,
            startTime: block.timestamp,
            cliffTime: 0,
            endTime: unlockTime,
            claimed: 0,
            cancelable: false,
            canceled: false,
            withdrawn: false
        });
        isNFTLock[lockId] = true;
        _indexLock(lockId);

        emit NFTPositionLocked(lockId, msg.sender, nftContract, tokenId, unlockTime);
    }

    /// @notice Create a linear vesting stream with optional cliff.
    /// @param beneficiary Who receives vested tokens.
    /// @param token ERC-20 token to stream.
    /// @param amount Total deposit (before fee).
    /// @param startTime When vesting begins.
    /// @param cliffDuration Seconds until cliff ends (0 for no cliff).
    /// @param totalDuration Total vesting duration in seconds.
    /// @param cancelable Whether the sender can cancel.
    /// @return lockId The ID of the created stream.
    function createStream(
        address beneficiary,
        address token,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 totalDuration,
        bool cancelable
    ) external nonReentrant returns (uint256 lockId) {
        if (token == address(0) || beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (totalDuration == 0) revert InvalidTime();
        if (cliffDuration > totalDuration) revert InvalidTime();
        if (startTime < block.timestamp) startTime = block.timestamp;

        uint256 netAmount = _collectFee(token, amount);

        LockType lt = cliffDuration > 0 ? LockType.CLIFF_STREAM : LockType.STREAM;
        uint256 cliffTime = startTime + cliffDuration;
        uint256 endTime = startTime + totalDuration;

        lockId = nextLockId++;
        _locks[lockId] = Lock({
            id: lockId,
            lockType: lt,
            owner: msg.sender,
            beneficiary: beneficiary,
            token: token,
            tokenId: 0,
            amount: netAmount,
            startTime: startTime,
            cliffTime: cliffTime,
            endTime: endTime,
            claimed: 0,
            cancelable: cancelable,
            canceled: false,
            withdrawn: false
        });
        _indexLock(lockId);

        emit StreamCreated(lockId, msg.sender, beneficiary, token, netAmount, startTime, cliffTime, endTime);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Claim / Withdraw
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Claim vested tokens from a stream, or withdraw from an unlocked lock.
    function claim(uint256 lockId) external nonReentrant returns (uint256 payout) {
        Lock storage l = _getLock(lockId);
        if (l.withdrawn) revert AlreadyWithdrawn();
        if (l.canceled) revert AlreadyCanceled();
        if (msg.sender != l.beneficiary) revert NotBeneficiary();

        if (l.lockType == LockType.TOKEN || l.lockType == LockType.LP) {
            if (block.timestamp < l.endTime) revert StillLocked();

            if (isNFTLock[lockId]) {
                l.withdrawn = true;
                IERC721(l.token).safeTransferFrom(address(this), l.beneficiary, l.tokenId);
                emit Claimed(lockId, l.beneficiary, 0);
            } else {
                payout = l.amount - l.claimed;
                if (payout == 0) revert NothingToClaim();
                l.claimed = l.amount;
                l.withdrawn = true;
                IERC20(l.token).safeTransfer(l.beneficiary, payout);
                emit Claimed(lockId, l.beneficiary, payout);
            }
        } else {
            uint256 vested = _vestedAmount(l);
            payout = vested - l.claimed;
            if (payout == 0) revert NothingToClaim();

            l.claimed = vested;
            if (l.claimed == l.amount) l.withdrawn = true;

            IERC20(l.token).safeTransfer(l.beneficiary, payout);
            emit Claimed(lockId, l.beneficiary, payout);
        }
    }

    /// @notice Cancel a cancelable stream. Vested goes to beneficiary, unvested to owner.
    function cancel(uint256 lockId) external nonReentrant {
        Lock storage l = _getLock(lockId);
        if (msg.sender != l.owner) revert NotLockOwner();
        if (!l.cancelable) revert NotCancelable();
        if (l.canceled) revert AlreadyCanceled();
        if (l.withdrawn) revert AlreadyWithdrawn();
        if (l.lockType != LockType.STREAM && l.lockType != LockType.CLIFF_STREAM) revert NotCancelable();

        l.canceled = true;

        uint256 vested = _vestedAmount(l);
        uint256 recipientAmount = vested - l.claimed;
        uint256 senderAmount = l.amount - vested;
        l.claimed = vested;

        if (recipientAmount > 0) {
            IERC20(l.token).safeTransfer(l.beneficiary, recipientAmount);
        }
        if (senderAmount > 0) {
            IERC20(l.token).safeTransfer(l.owner, senderAmount);
        }

        emit Canceled(lockId, senderAmount, recipientAmount);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Lock management
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Extend a lock's unlock time. Can only make it longer, not shorter.
    function extendLock(uint256 lockId, uint256 newUnlockTime) external {
        Lock storage l = _getLock(lockId);
        if (msg.sender != l.owner) revert NotLockOwner();
        if (l.withdrawn || l.canceled) revert AlreadyWithdrawn();
        if (l.lockType == LockType.STREAM || l.lockType == LockType.CLIFF_STREAM) revert CannotExtendStream();
        if (newUnlockTime <= l.endTime) revert CannotShorten();

        uint256 oldEnd = l.endTime;
        l.endTime = newUnlockTime;
        emit LockExtended(lockId, oldEnd, newUnlockTime);
    }

    /// @notice Transfer ownership of a lock to another address.
    function transferLockOwnership(uint256 lockId, address newOwner) external {
        if (newOwner == address(0)) revert ZeroAddress();
        Lock storage l = _getLock(lockId);
        if (msg.sender != l.owner) revert NotLockOwner();
        if (l.withdrawn || l.canceled) revert AlreadyWithdrawn();
        address oldOwner = l.owner;
        l.owner = newOwner;
        _associate(newOwner, lockId);
        emit LockOwnershipTransferred(lockId, oldOwner, newOwner);
    }

    /// @notice Add more ERC-20 tokens to an existing lock. Not supported for NFT or stream locks.
    function addToLock(uint256 lockId, uint256 additionalAmount) external nonReentrant {
        if (additionalAmount == 0) revert ZeroAmount();
        Lock storage l = _getLock(lockId);
        if (msg.sender != l.owner) revert NotLockOwner();
        if (l.withdrawn || l.canceled) revert AlreadyWithdrawn();
        if (isNFTLock[lockId]) revert CannotAddToNFTLock();
        if (l.lockType == LockType.STREAM || l.lockType == LockType.CLIFF_STREAM) revert CannotAddToStreamType();

        _pullExact(l.token, additionalAmount);
        l.amount += additionalAmount;

        emit TokensAdded(lockId, additionalAmount, l.amount);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // View functions
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Get full lock details.
    function getLock(uint256 lockId) external view returns (Lock memory) {
        return _getLock(lockId);
    }

    /// @notice How much the beneficiary can claim right now.
    function claimable(uint256 lockId) external view returns (uint256) {
        Lock storage l = _getLock(lockId);
        if (l.withdrawn || l.canceled) return 0;

        if (l.lockType == LockType.TOKEN || l.lockType == LockType.LP) {
            if (isNFTLock[lockId]) return 0;
            return block.timestamp >= l.endTime ? l.amount - l.claimed : 0;
        }
        return _vestedAmount(l) - l.claimed;
    }

    /// @notice All lock IDs associated with an address (as owner or beneficiary).
    function locksOf(address user) external view returns (uint256[] memory) {
        uint256[] storage ids = _userLocks[user];
        uint256 count;
        for (uint256 i; i < ids.length; ++i) {
            Lock storage l = _locks[ids[i]];
            if (l.owner == user || l.beneficiary == user) ++count;
        }
        uint256[] memory current = new uint256[](count);
        uint256 j;
        for (uint256 i; i < ids.length; ++i) {
            Lock storage l = _locks[ids[i]];
            if (l.owner == user || l.beneficiary == user) current[j++] = ids[i];
        }
        return current;
    }

    function locksForToken(address token) external view returns (uint256[] memory) { return _tokenLocks[token]; }
    function tokenLockCount(address token) external view returns (uint256) { return _tokenLocks[token].length; }
    function tokenLockAt(address token, uint256 index) external view returns (uint256) { return _tokenLocks[token][index]; }

    function _associate(address user, uint256 id) private {
        if (!_associated[user][id]) { _associated[user][id] = true; _userLocks[user].push(id); }
    }

    function _indexLock(uint256 id) private {
        Lock storage l = _locks[id];
        _associate(l.owner, id);
        _associate(l.beneficiary, id);
        _tokenLocks[l.token].push(id);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Fee management (owner only, timelocked)
    // ──────────────────────────────────────────────────────────────────────────

    /// @notice Propose a fee change. Takes effect after 48 hours.
    function proposeFeeChange(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        pendingFeeBps = newFeeBps;
        feeChangeReadyAt = block.timestamp + FEE_TIMELOCK;
        emit FeeChangeProposed(newFeeBps, feeChangeReadyAt);
    }

    /// @notice Execute a pending fee change after the timelock.
    function executeFeeChange() external onlyOwner {
        if (feeChangeReadyAt == 0) revert NoPendingFeeChange();
        if (block.timestamp < feeChangeReadyAt) revert TimelockNotReady();

        uint256 oldFee = feeBps;
        feeBps = pendingFeeBps;
        pendingFeeBps = 0;
        feeChangeReadyAt = 0;
        emit FeeChangeExecuted(oldFee, feeBps);
    }

    /// @notice Update the fee router address.
    function setFeeRouter(address newRouter) external onlyOwner {
        if (newRouter == address(0)) revert ZeroAddress();
        feeRouter = newRouter;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ERC-721 receiver
    // ──────────────────────────────────────────────────────────────────────────

    function onERC721Received(address, address from, uint256 tokenId, bytes calldata) external view override returns (bytes4) {
        if (msg.sender != _receivingNFT || from != _receivingFrom || tokenId != _receivingId) revert UnexpectedNFT();
        return IERC721Receiver.onERC721Received.selector;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Internal
    // ──────────────────────────────────────────────────────────────────────────

    function _getLock(uint256 lockId) internal view returns (Lock storage) {
        Lock storage l = _locks[lockId];
        if (l.token == address(0)) revert LockNotFound();
        return l;
    }

    /// @dev Pull tokens from sender, deduct fee, return net amount deposited.
    function _collectFee(address token, uint256 amount) internal returns (uint256 netAmount) {
        _pullExact(token, amount);
        uint256 fee = Math.mulDiv(amount, feeBps, 10_000);
        if (fee > 0) {
            IERC20(token).safeTransfer(feeRouter, fee);
        }
        netAmount = amount - fee;
    }

    function _pullExact(address token, uint256 amount) private {
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        if (IERC20(token).balanceOf(address(this)) - beforeBalance != amount) revert UnsupportedToken();
    }

    /// @dev Calculate how much has vested for a stream lock.
    function _vestedAmount(Lock storage l) internal view returns (uint256) {
        if (block.timestamp < l.startTime) return 0;
        if (l.lockType == LockType.CLIFF_STREAM && block.timestamp < l.cliffTime) return 0;
        if (block.timestamp >= l.endTime) return l.amount;

        uint256 elapsed = block.timestamp - l.startTime;
        uint256 duration = l.endTime - l.startTime;
        return Math.mulDiv(l.amount, elapsed, duration);
    }
}
