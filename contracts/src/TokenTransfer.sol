// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title TokenTransfer
/// @notice Outbound and inbound ERC-20 transfer helper that turns any failure into one explicit error.
/// @dev Robinhood Stock Tokens run compliance checks on both sender and receiver and revert
///      when either is not verified. A plain `transfer` would bubble the token's own error
///      (or, for a non-standard token, a low-level revert with no data), which is hard to read
///      from a wallet or an indexer. This library wraps the call so every failed payout surfaces
///      as `TransferRejected(token, to, amount, reason)` with the token's revert data attached.
///      Because the revert unwinds the whole transaction, no contract state is changed and the
///      funds stay where they were (refundable by the usual cancel/withdraw paths).
library TokenTransfer {
    /// @notice A token refused an outbound transfer. `reason` is the token's raw revert data.
    error TransferRejected(address token, address to, uint256 amount, bytes reason);

    /// @notice A token refused an inbound `transferFrom`. `reason` is the token's raw revert data.
    error TransferFromRejected(address token, address from, address to, uint256 amount, bytes reason);

    /// @notice Send `amount` of `token` to `to`, reverting with `TransferRejected` on any failure.
    function sendOut(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory ret) = token.call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!ok || !_returnedTrue(ret) || token.code.length == 0) {
            revert TransferRejected(token, to, amount, ret);
        }
    }

    /// @notice Pull `amount` of `token` from `from` to `to`, reverting with `TransferFromRejected`
    ///         on any failure.
    function pullIn(address token, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory ret) = token.call(abi.encodeCall(IERC20.transferFrom, (from, to, amount)));
        if (!ok || !_returnedTrue(ret) || token.code.length == 0) {
            revert TransferFromRejected(token, from, to, amount, ret);
        }
    }

    function _returnedTrue(bytes memory ret) private pure returns (bool) {
        if (ret.length == 0) return true; // non-standard tokens that return nothing
        if (ret.length != 32) return false;
        return abi.decode(ret, (bool));
    }
}
