// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BriefEscrow} from "../BriefEscrow.sol";

/// @title ReentrantReceiver
/// @notice Test-only winner that tries to re-enter `BriefEscrow.claim` from its receive hook.
contract ReentrantReceiver {
    BriefEscrow public immutable escrow;
    uint256 public attempts;
    bool public reentered;
    bytes public lastRevert;

    constructor(BriefEscrow escrow_) {
        escrow = escrow_;
    }

    /// @notice Claim the native balance; the receive hook then tries to claim again.
    function claim() external {
        escrow.claim(address(0));
    }

    receive() external payable {
        attempts += 1;
        if (attempts == 1) {
            try escrow.claim(address(0)) {
                reentered = true;
            } catch (bytes memory reason) {
                lastRevert = reason;
            }
        }
    }
}
