// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {LancefieldPrizeEscrow} from "../../src/LancefieldPrizeEscrow.sol";

/// Refuses ETH.
contract RevertingReceiver {
    receive() external payable {
        revert("no thanks");
    }
}

/// A sponsor contract that tries to re-enter the escrow when it receives ETH.
contract ReentrantSponsor {
    LancefieldPrizeEscrow public immutable escrow;
    bytes32 public briefRef;
    uint256 public reentries;

    constructor(LancefieldPrizeEscrow escrow_) {
        escrow = escrow_;
    }

    function fund(bytes32 ref, uint64 deadline) external payable {
        briefRef = ref;
        escrow.fund{value: msg.value}(ref, address(0), msg.value, deadline);
    }

    function reclaim() external {
        escrow.reclaim(briefRef);
    }

    receive() external payable {
        reentries++;
        escrow.reclaim(briefRef); // must revert: the guard and the status both stop it
    }
}

/// A winner contract that tries to re-enter pickWinner on the same escrow via the sponsor path.
contract ReentrantWinner {
    LancefieldPrizeEscrow public immutable escrow;
    bytes32 public briefRef;

    constructor(LancefieldPrizeEscrow escrow_) {
        escrow = escrow_;
    }

    function setRef(bytes32 ref) external {
        briefRef = ref;
    }

    receive() external payable {
        escrow.withdrawFees(address(0)); // any nested entry must revert
    }
}
