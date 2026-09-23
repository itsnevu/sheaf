// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SheafBatchPayer} from "../../src/SheafBatchPayer.sol";
import {ForkTest} from "./ForkHelpers.sol";

interface IFiatToken {
    function blacklister() external view returns (address);
    function blacklist(address account) external;
}

/// Real USDC (Circle FiatToken v2.2 behind a proxy) and native ETH on a fork of Base mainnet.
contract BaseForkTest is ForkTest {
    IERC20 internal constant USDC = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    uint256 internal constant BLOCK = 51_679_000;

    function setUp() public {
        _fork("FORK_URL_BASE", "https://mainnet.base.org", BLOCK);
        deal(address(USDC), treasury, 5_000_000e6);
        vm.deal(treasury, 100 ether);
    }

    function test_usdc_thirtyContractorsInOneTransaction() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(30, 1_250e6, "base-usdc");
        vm.startPrank(treasury);
        USDC.approve(address(payer), total);
        uint256 before = USDC.balanceOf(treasury);
        payer.payERC20(USDC, keccak256("sept-payroll"), ps);
        vm.stopPrank();
        assertEq(before - USDC.balanceOf(treasury), total);
        for (uint256 i; i < ps.length; ++i) assertEq(USDC.balanceOf(ps[i].recipient), ps[i].amount);
        assertEq(USDC.balanceOf(address(payer)), 0);
        assertEq(USDC.allowance(treasury, address(payer)), 0);
    }

    function test_usdc_replayAfterDroppedTxCannotPayTwice() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(5, 100e6, "replay");
        vm.startPrank(treasury);
        USDC.approve(address(payer), total * 2);
        payer.payERC20(USDC, keccak256("b"), ps);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.AlreadyProcessed.selector, 0, ps[0].paymentId));
        payer.payERC20(USDC, keccak256("b"), ps);
        vm.stopPrank();
        assertEq(USDC.balanceOf(ps[0].recipient), ps[0].amount);
    }

    function test_usdc_blacklistedRecipientRevertsTheWholeChunk() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(10, 100e6, "blacklist");
        IFiatToken fiat = IFiatToken(address(USDC));
        vm.prank(fiat.blacklister());
        fiat.blacklist(ps[6].recipient);
        vm.startPrank(treasury);
        USDC.approve(address(payer), total);
        vm.expectRevert("Blacklistable: account is blacklisted");
        payer.payERC20(USDC, keccak256("b"), ps);
        vm.stopPrank();
        assertEq(USDC.balanceOf(ps[0].recipient), 0, "atomic");
        assertFalse(payer.isProcessed(treasury, ps[0].paymentId));
    }

    function test_native_thirtyContractorsExactValue() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(30, 0.05 ether, "base-eth");
        vm.prank(treasury);
        payer.payNative{value: total}(keccak256("eth"), ps);
        for (uint256 i; i < ps.length; ++i) assertEq(ps[i].recipient.balance, ps[i].amount);
        assertEq(address(payer).balance, 0);
    }

    function test_gas_usdc() public {
        uint256[4] memory sizes = [uint256(1), 10, 50, 100];
        for (uint256 k; k < sizes.length; ++k) {
            (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(sizes[k], 1_000e6, bytes32(k + 100));
            vm.prank(treasury);
            USDC.approve(address(payer), total);
            bytes memory data = abi.encodeCall(SheafBatchPayer.payERC20, (USDC, keccak256("gas"), ps));
            vm.prank(treasury);
            uint256 g = gasleft();
            payer.payERC20(USDC, keccak256("gas"), ps);
            _report("USDC(Base)", sizes[k], g - gasleft(), data);
        }
    }

    /// Baseline for comparison: one ordinary USDC transfer to a fresh address, as its own transaction.
    function test_gas_plainTransferBaseline() public {
        address fresh = _recipient("plain", 0);
        bytes memory data = abi.encodeCall(IERC20.transfer, (fresh, 1_000e6));
        vm.prank(treasury);
        uint256 g = gasleft();
        USDC.transfer(fresh, 1_000e6);
        _report("USDC(Base) plain transfer", 1, g - gasleft(), data);
    }

    function test_gas_native() public {
        uint256[4] memory sizes = [uint256(1), 10, 50, 100];
        for (uint256 k; k < sizes.length; ++k) {
            (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(sizes[k], 0.01 ether, bytes32(k + 200));
            bytes memory data = abi.encodeCall(SheafBatchPayer.payNative, (keccak256("gas"), ps));
            vm.prank(treasury);
            uint256 g = gasleft();
            payer.payNative{value: total}(keccak256("gas"), ps);
            _report("ETH(Base)", sizes[k], g - gasleft(), data);
        }
    }
}
