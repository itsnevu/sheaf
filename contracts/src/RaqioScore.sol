// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {RaqioVault} from "./RaqioVault.sol";

/// @notice Bounded, reproducible commitment indicators. This is not a security audit or a guarantee against fraud.
/// @dev Only registered ERC-20 LP tokens contribute to LP points. Arbitrary NFTs do not prove pool liquidity.
contract RaqioScore is Ownable2Step {
    struct Score { uint8 value; uint40 updatedAt; uint8 supplyLocked; uint8 lpLocked; uint8 vestingUsage; uint8 history; }
    struct Facts { uint256 locked; uint256 vesting; uint256 cancellations; uint256 durationPoints; }
    RaqioVault public vault;
    mapping(address => address) public verifiedLP;
    uint256 public constant MAX_LOCKS_PER_TOKEN = 256;
    event VaultChanged(address indexed vault);
    event LPRegistered(address indexed token, address indexed lpToken);
    error InvalidAddress();
    error TooManyLocks();

    constructor(address initialVault) Ownable(msg.sender) { _setVault(initialVault); }
    function setVaultAddress(address next) external onlyOwner { _setVault(next); }
    function _setVault(address next) private { if(next.code.length == 0) revert InvalidAddress(); vault=RaqioVault(next); emit VaultChanged(next); }
    /// @notice Administrative evidence registry, not a pool oracle. Zero removes the LP association.
    function setVerifiedLP(address token, address lpToken) external onlyOwner {
        if(token.code.length == 0 || (lpToken != address(0) && (lpToken.code.length == 0 || lpToken == token))) revert InvalidAddress();
        verifiedLP[token]=lpToken; emit LPRegistered(token,lpToken);
    }
    function _unvested(RaqioVault.Lock memory l) private view returns(uint256) {
        if(l.withdrawn || l.canceled || block.timestamp >= l.endTime) return 0;
        if(l.lockType == RaqioVault.LockType.TOKEN || l.lockType == RaqioVault.LockType.LP || block.timestamp < l.startTime || block.timestamp < l.cliffTime) return l.amount;
        return l.amount - Math.mulDiv(l.amount,block.timestamp-l.startTime,l.endTime-l.startTime);
    }
    function _facts(address token, bool lpOnly) private view returns(Facts memory f) {
        uint256 count=vault.tokenLockCount(token); if(count > MAX_LOCKS_PER_TOKEN) revert TooManyLocks();
        for(uint256 i; i<count; ++i) {
            uint256 id=vault.tokenLockAt(token,i); if(vault.isNFTLock(id)) continue;
            RaqioVault.Lock memory l=vault.getLock(id);
            if(lpOnly && l.lockType != RaqioVault.LockType.LP) continue;
            if(l.canceled) ++f.cancellations;
            uint256 locked=_unvested(l); f.locked+=locked;
            if(locked>0 && (l.lockType == RaqioVault.LockType.STREAM || l.lockType == RaqioVault.LockType.CLIFF_STREAM)) ++f.vesting;
        }
        if(f.locked==0 || lpOnly) return f;
        for(uint256 i; i<count; ++i) {
            uint256 id=vault.tokenLockAt(token,i); if(vault.isNFTLock(id)) continue;
            RaqioVault.Lock memory l=vault.getLock(id); uint256 amount=_unvested(l); if(amount==0) continue;
            uint256 remaining=l.endTime-block.timestamp;
            uint256 points=remaining<30 days?5:remaining<180 days?10:remaining<365 days?15:20;
            f.durationPoints+=Math.mulDiv(amount,points,f.locked);
        }
    }
    function _percent(uint256 amount,uint256 total) private pure returns(uint8) {
        if(total==0) return 0;
        return uint8(Math.min(100,Math.mulDiv(amount,100,total)));
    }
    function getFullScore(address token) public view returns(Score memory s) {
        if(token.code.length==0) revert InvalidAddress();
        Facts memory f=_facts(token,false); s.supplyLocked=_percent(f.locked,IERC20(token).totalSupply());
        address lp=verifiedLP[token];
        if(lp!=address(0)) { Facts memory pool=_facts(lp,true); s.lpLocked=_percent(pool.locked,IERC20(lp).totalSupply()); }
        s.vestingUsage=f.vesting>0?100:0;
        // Inactive/no-lock tokens receive no history bonus. Anyone can create a lock; the metric is not identity verification.
        s.history=f.locked==0?0:f.cancellations>=2?0:f.cancellations==1?50:100;
        s.value=uint8(uint256(s.supplyLocked)*40/100+f.durationPoints+uint256(s.lpLocked)*20/100+uint256(s.vestingUsage)*10/100+uint256(s.history)*10/100);
        s.updatedAt=uint40(block.timestamp);
    }
    function computeScore(address token) external view returns(uint256 score,uint256 supplyLocked,uint256 lpLocked,uint256 vestingActive) {
        Score memory s=getFullScore(token); return(s.value,s.supplyLocked,s.lpLocked,s.vestingUsage);
    }
    function getScore(address token) external view returns(uint8) { return getFullScore(token).value; }
}
