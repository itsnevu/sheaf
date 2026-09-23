// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RejectingReceiver
/// @notice Test-only contract that refuses native ETH.
contract RejectingReceiver {
    error NoThanks();

    receive() external payable {
        revert NoThanks();
    }
}
