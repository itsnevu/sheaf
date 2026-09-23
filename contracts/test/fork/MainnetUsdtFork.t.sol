// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SheafBatchPayer} from "../../src/SheafBatchPayer.sol";
import {ForkTest} from "./ForkHelpers.sol";

/// Tether's actual interface: no return values, and approve refuses non-zero -> non-zero.
interface ITether {
    function approve(address spender, uint256 value) external;
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address who) external view returns (uint256);
    function owner() external view returns (address);
    function setParams(uint256 newBasisPoints, uint256 newMaxFee) external;
}

/// Real USDT on a fork of Ethereum mainnet: the canonical non-standard ERC-20.
contract MainnetUsdtForkTest is ForkTest {
    using SafeERC20 for IERC20;

    address internal constant USDT_ADDR = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITether internal constant USDT = ITether(USDT_ADDR);
    uint256 internal constant BLOCK = 26_038_000;

    function setUp() public {
        _fork("FORK_URL_MAINNET", "https://eth.drpc.org", BLOCK);
        deal(USDT_ADDR, treasury, 5_000_000e6);
    }

    function test_usdt_allowanceMustBeResetThenBatchPays() public {
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(30, 480e6, "usdt");
        vm.startPrank(treasury);
        USDT.approve(address(payer), 1); // a leftover allowance from an earlier batch
        vm.expectRevert();
        USDT.approve(address(payer), total); // Tether refuses non-zero -> non-zero
        IERC20(USDT_ADDR).forceApprove(address(payer), total); // what the app does: 0, then total
        assertEq(USDT.allowance(treasury, address(payer)), total);
        payer.payERC20(IERC20(USDT_ADDR), keccak256("usdt-batch"), ps);
        vm.stopPrank();
        for (uint256 i; i < ps.length; ++i) assertEq(USDT.balanceOf(ps[i].recipient), ps[i].amount);
        assertEq(USDT.balanceOf(address(payer)), 0);
        assertEq(USDT.allowance(treasury, address(payer)), 0);
    }

    function test_usdt_transferFeeIsRefusedNotShorted() public {
        vm.prank(USDT.owner());
        USDT.setParams(10, 49); // 0.1 % fee, capped at 49 USDT
        (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(3, 1_000e6, "fee");
        vm.startPrank(treasury);
        USDT.approve(address(payer), total);
        vm.expectRevert(abi.encodeWithSelector(SheafBatchPayer.AmountNotReceived.selector, 0, ps[0].amount, ps[0].amount - ps[0].amount / 1000));
        payer.payERC20(IERC20(USDT_ADDR), keccak256("fee"), ps);
        vm.stopPrank();
    }

    /// Baseline for comparison: one ordinary USDT transfer to a fresh address, as its own transaction.
    function test_gas_plainTransferBaseline() public {
        address fresh = _recipient("plain", 0);
        bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", fresh, 1_000e6);
        vm.prank(treasury);
        uint256 g = gasleft();
        (bool ok,) = USDT_ADDR.call(data);
        uint256 used = g - gasleft();
        assertTrue(ok);
        _report("USDT(Ethereum) plain transfer", 1, used, data);
    }

    function test_gas_usdt() public {
        uint256[4] memory sizes = [uint256(1), 10, 50, 100];
        for (uint256 k; k < sizes.length; ++k) {
            (SheafBatchPayer.Payment[] memory ps, uint256 total) = _batch(sizes[k], 1_000e6, bytes32(k + 300));
            vm.startPrank(treasury);
            IERC20(USDT_ADDR).forceApprove(address(payer), total);
            vm.stopPrank();
            bytes memory data = abi.encodeCall(SheafBatchPayer.payERC20, (IERC20(USDT_ADDR), keccak256("gas"), ps));
            vm.prank(treasury);
            uint256 g = gasleft();
            payer.payERC20(IERC20(USDT_ADDR), keccak256("gas"), ps);
            _report("USDT(Ethereum)", sizes[k], g - gasleft(), data);
        }
    }
}
