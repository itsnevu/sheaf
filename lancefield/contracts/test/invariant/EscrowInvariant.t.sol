// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {LancefieldPrizeEscrow as Escrow} from "../../src/LancefieldPrizeEscrow.sol";
import {MockERC20} from "../mocks/Tokens.sol";
import {EscrowHandler} from "./EscrowHandler.sol";

/// Shared invariants. Subclasses pick the fee setup.
abstract contract EscrowInvariantBase is Test {
    Escrow internal escrow;
    MockERC20 internal usdc;
    EscrowHandler internal handler;
    address internal constant ETH = address(0);
    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");

    function _feeBps() internal pure virtual returns (uint16);
    function _feeChanges() internal pure virtual returns (bool);

    function setUp() public {
        vm.warp(1_780_000_000);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        address[] memory tokens = new address[](2);
        tokens[0] = address(usdc);
        tokens[1] = ETH;
        escrow = new Escrow(owner, treasury, _feeBps(), tokens);
        handler = new EscrowHandler(escrow, usdc, owner, _feeChanges());
        targetContract(address(handler));
    }

    /// Sum of the prizes of every escrow the contract itself reports as Funded, per token.
    function _openPrizesOnChain(address token) internal view returns (uint256 sum) {
        uint256 n = handler.trackedCount();
        for (uint256 i; i < n; ++i) {
            EscrowHandler.Tracked memory t = handler.trackedAt(i);
            Escrow.Escrow memory e = escrow.getEscrowById(t.id);
            if (e.token == token && e.status == Escrow.Status.Funded) sum += e.amount;
        }
    }

    function _balance(address token) internal view returns (uint256) {
        return token == ETH ? address(escrow).balance : usdc.balanceOf(address(escrow));
    }

    /// The escrow holds exactly the open prizes plus fees not yet withdrawn. Nothing more, nothing less.
    function invariant_balanceIsOpenPrizesPlusUnwithdrawnFees() public view {
        for (uint256 k; k < 2; ++k) {
            address token = k == 0 ? address(usdc) : ETH;
            assertEq(_balance(token), _openPrizesOnChain(token) + escrow.accruedFees(token), "balance != open prizes + fees");
        }
    }

    /// The contract's running total agrees with its own per-escrow records and with the handler's ledger.
    function invariant_totalEscrowedMatchesOpenPrizes() public view {
        for (uint256 k; k < 2; ++k) {
            address token = k == 0 ? address(usdc) : ETH;
            assertEq(escrow.totalEscrowed(token), _openPrizesOnChain(token), "totalEscrowed != sum of open escrows");
            assertEq(escrow.totalEscrowed(token), handler.open(token), "totalEscrowed != ledger");
        }
    }

    /// Every unit funded is either still open, paid to a winner, reclaimed by its sponsor, or a fee.
    function invariant_conservation() public view {
        for (uint256 k; k < 2; ++k) {
            address token = k == 0 ? address(usdc) : ETH;
            assertEq(
                handler.funded(token),
                handler.open(token) + handler.paidToWinners(token) + handler.reclaimed(token) + escrow.accruedFees(token) + handler.feesWithdrawn(token),
                "value created or lost"
            );
            assertEq(handler.feesTaken(token), escrow.accruedFees(token) + handler.feesWithdrawn(token), "fee ledger");
        }
    }

    /// No payout ever takes more than the capped fee, and settled escrows never change again.
    function invariant_feesCappedAndStatusesFinal() public view {
        assertFalse(handler.feeOverCap(), "fee above cap");
        uint256 n = handler.trackedCount();
        for (uint256 i; i < n; ++i) {
            EscrowHandler.Tracked memory t = handler.trackedAt(i);
            Escrow.Escrow memory e = escrow.getEscrowById(t.id);
            assertEq(uint8(e.status), uint8(t.status), "status drifted");
            assertEq(e.amount, t.amount, "amount drifted");
            assertEq(e.sponsor, t.sponsor, "sponsor drifted");
            assertLe(e.feeBps, escrow.MAX_FEE_BPS(), "fee snapshot above cap");
        }
    }

    /// Shows, with -vv, how many calls in a run really funded, paid, reclaimed or withdrew.
    function afterInvariant() external view {
        assertGt(handler.calls(), 0);
        console2.log("funds", handler.funds(), "picks", handler.picks());
        console2.log("reclaims", handler.reclaims(), "fee withdrawals", handler.withdrawals());
    }
}

/// 15% fee, fee changes and fee withdrawals in the mix.
contract EscrowInvariantTest is EscrowInvariantBase {
    function _feeBps() internal pure override returns (uint16) {
        return 1_500;
    }

    function _feeChanges() internal pure override returns (bool) {
        return true;
    }
}

/// No fee: here the escrow's balance must equal the sum of open prizes exactly.
contract EscrowInvariantNoFeeTest is EscrowInvariantBase {
    function _feeBps() internal pure override returns (uint16) {
        return 0;
    }

    function _feeChanges() internal pure override returns (bool) {
        return false;
    }

    function invariant_balanceEqualsSumOfOpenPrizes() public view {
        assertEq(usdc.balanceOf(address(escrow)), _openPrizesOnChain(address(usdc)), "usdc balance != open prizes");
        assertEq(address(escrow).balance, _openPrizesOnChain(ETH), "eth balance != open prizes");
    }
}
