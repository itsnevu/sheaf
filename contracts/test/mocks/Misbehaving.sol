// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SheafBatchPayer} from "../../src/SheafBatchPayer.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// transferFrom returns false instead of reverting. SafeERC20 must turn that into a revert.
contract ReturnsFalseToken {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}

/// Moves the tokens but credits the recipient twice (a broken or malicious token).
contract InflatingToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        balanceOf[to] += 2 * value;
        return true;
    }
}

/// Has no receive function: native payments to it fail.
contract RejectsEther {}

/// Burns all forwarded gas and returns a large blob when paid.
contract ReturnBomb {
    receive() external payable {
        assembly {
            return(0, 1000000)
        }
    }
}

/// Tries to re-enter the payer when it receives native currency or a token callback, and
/// records whether the nested call was refused.
contract Reentrant {
    SheafBatchPayer public immutable payer;
    bool public reentryBlocked;
    bool public attempted;

    constructor(SheafBatchPayer payer_) {
        payer = payer_;
    }

    receive() external payable {
        attempted = true;
        SheafBatchPayer.Payment[] memory ps = new SheafBatchPayer.Payment[](1);
        ps[0] = SheafBatchPayer.Payment({recipient: address(0xBEEF), amount: msg.value, paymentId: keccak256("reenter")});
        try payer.payNative{value: msg.value}(keccak256("reenter-batch"), ps) {
            reentryBlocked = false;
        } catch (bytes memory reason) {
            reentryBlocked = bytes4(reason) == bytes4(keccak256("ReentrancyGuardReentrantCall()"));
        }
    }
}

/// ERC-20 whose transferFrom calls back into the payer (ERC-777 style hook) before moving funds.
contract HookToken {
    SheafBatchPayer public payer;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    bool public reentryBlocked;

    function setPayer(SheafBatchPayer payer_) external {
        payer = payer_;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        SheafBatchPayer.Payment[] memory ps = new SheafBatchPayer.Payment[](1);
        ps[0] = SheafBatchPayer.Payment({recipient: address(0xBEEF), amount: 1, paymentId: keccak256("hook")});
        try payer.payERC20(IERC20(address(this)), keccak256("hook-batch"), ps) {
            reentryBlocked = false;
        } catch (bytes memory reason) {
            reentryBlocked = bytes4(reason) == bytes4(keccak256("ReentrancyGuardReentrantCall()"));
        }
        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        balanceOf[to] += value;
        return true;
    }
}
