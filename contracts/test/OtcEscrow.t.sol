// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OtcEscrow} from "../src/OtcEscrow.sol";
import {TokenTransfer} from "../src/TokenTransfer.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockRestrictedToken} from "../src/mocks/MockRestrictedToken.sol";

contract OtcEscrowTest is Test {
    MockUSDG usdg;
    MockRestrictedToken stk;
    OtcEscrow otc;

    address maker = makeAddr("maker");
    address taker = makeAddr("taker");
    address stranger = makeAddr("stranger");
    address makerFresh = makeAddr("makerFresh");
    address takerFresh = makeAddr("takerFresh");

    uint256 constant STK_AMT = 10e18;
    uint256 constant USDG_AMT = 1_500e6;
    uint64 expiry;

    function setUp() public {
        usdg = new MockUSDG();
        stk = new MockRestrictedToken();
        otc = new OtcEscrow();
        expiry = uint64(block.timestamp + 1 days);

        // maker sells stock tokens for USDG
        stk.setAllowlisted(maker, true);
        stk.setAllowlisted(address(otc), true);
        stk.setAllowlisted(taker, true);
        stk.setAllowlisted(takerFresh, true);
        stk.mint(maker, STK_AMT);
        usdg.mint(taker, USDG_AMT);

        vm.prank(maker);
        stk.approve(address(otc), type(uint256).max);
        vm.prank(taker);
        usdg.approve(address(otc), type(uint256).max);
    }

    function _create(address namedTaker, address makerRecipient) internal returns (uint256 id) {
        vm.prank(maker);
        id = otc.createOrder(address(stk), STK_AMT, address(usdg), USDG_AMT, namedTaker, expiry, makerRecipient);
    }

    function test_createEscrowsMakerTokens() public {
        uint256 id = _create(taker, makerFresh);
        assertEq(id, 1);
        assertEq(stk.balanceOf(address(otc)), STK_AMT);
        assertEq(stk.balanceOf(maker), 0);
        OtcEscrow.Order memory o = otc.getOrder(id);
        assertEq(uint8(o.status), uint8(OtcEscrow.Status.Open));
        assertEq(o.makerRecipient, makerFresh);
    }

    function test_fillAtomicWithFreshRecipients() public {
        uint256 id = _create(taker, makerFresh);
        vm.prank(taker);
        vm.expectEmit(true, true, false, true);
        emit OtcEscrow.OrderFilled(id, taker, makerFresh, takerFresh);
        otc.fill(id, takerFresh);

        assertEq(usdg.balanceOf(makerFresh), USDG_AMT);
        assertEq(usdg.balanceOf(maker), 0);
        assertEq(stk.balanceOf(takerFresh), STK_AMT);
        assertEq(stk.balanceOf(taker), 0);
        assertEq(stk.balanceOf(address(otc)), 0);
        assertEq(uint8(otc.getOrder(id).status), uint8(OtcEscrow.Status.Filled));
    }

    function test_fillDefaultsRecipientsToSelves() public {
        uint256 id = _create(address(0), address(0));
        vm.prank(taker);
        otc.fill(id, address(0));
        assertEq(usdg.balanceOf(maker), USDG_AMT);
        assertEq(stk.balanceOf(taker), STK_AMT);
    }

    function test_openOrderAnyoneCanFill() public {
        uint256 id = _create(address(0), address(0));
        usdg.mint(stranger, USDG_AMT);
        stk.setAllowlisted(stranger, true);
        vm.startPrank(stranger);
        usdg.approve(address(otc), type(uint256).max);
        otc.fill(id, address(0));
        vm.stopPrank();
        assertEq(stk.balanceOf(stranger), STK_AMT);
    }

    function test_wrongTakerReverts() public {
        uint256 id = _create(taker, address(0));
        usdg.mint(stranger, USDG_AMT);
        vm.startPrank(stranger);
        usdg.approve(address(otc), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(OtcEscrow.NotTaker.selector, stranger, taker));
        otc.fill(id, address(0));
        vm.stopPrank();
    }

    function test_fillAfterExpiryReverts() public {
        uint256 id = _create(taker, address(0));
        vm.warp(expiry + 1);
        vm.prank(taker);
        vm.expectRevert(abi.encodeWithSelector(OtcEscrow.OrderExpired.selector, id, expiry, expiry + 1));
        otc.fill(id, address(0));
    }

    function test_doubleFillReverts() public {
        uint256 id = _create(taker, address(0));
        vm.startPrank(taker);
        otc.fill(id, address(0));
        vm.expectRevert(abi.encodeWithSelector(OtcEscrow.OrderNotOpen.selector, id, OtcEscrow.Status.Filled));
        otc.fill(id, address(0));
        vm.stopPrank();
    }

    function test_cancelRefundsAfterExpiry() public {
        uint256 id = _create(taker, address(0));
        vm.warp(expiry + 1);
        vm.prank(maker);
        otc.cancel(id, address(0));
        assertEq(stk.balanceOf(maker), STK_AMT);
        assertEq(uint8(otc.getOrder(id).status), uint8(OtcEscrow.Status.Cancelled));

        vm.prank(taker);
        vm.expectRevert(abi.encodeWithSelector(OtcEscrow.OrderNotOpen.selector, id, OtcEscrow.Status.Cancelled));
        otc.fill(id, address(0));
    }

    function test_cancelBeforeExpiryAllowed() public {
        uint256 id = _create(taker, address(0));
        vm.prank(maker);
        otc.cancel(id, address(0));
        assertEq(stk.balanceOf(maker), STK_AMT);
    }

    function test_cancelByNonMakerReverts() public {
        uint256 id = _create(taker, address(0));
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(OtcEscrow.NotMaker.selector, stranger, maker));
        otc.cancel(id, address(0));
    }

    function test_cancelAfterFillReverts() public {
        uint256 id = _create(taker, address(0));
        vm.prank(taker);
        otc.fill(id, address(0));
        vm.prank(maker);
        vm.expectRevert(abi.encodeWithSelector(OtcEscrow.OrderNotOpen.selector, id, OtcEscrow.Status.Filled));
        otc.cancel(id, address(0));
    }

    function test_expiryInPastReverts() public {
        vm.prank(maker);
        vm.expectRevert(
            abi.encodeWithSelector(OtcEscrow.ExpiryInPast.selector, uint64(block.timestamp), block.timestamp)
        );
        otc.createOrder(address(stk), STK_AMT, address(usdg), USDG_AMT, taker, uint64(block.timestamp), address(0));
    }

    function test_restrictedRecipientRevertsCleanlyAndEscrowStaysRefundable() public {
        uint256 id = _create(taker, address(0));
        address unverified = makeAddr("unverified");
        bytes memory inner = abi.encodeWithSelector(MockRestrictedToken.NotAllowlisted.selector, unverified);
        vm.prank(taker);
        vm.expectRevert(
            abi.encodeWithSelector(TokenTransfer.TransferRejected.selector, address(stk), unverified, STK_AMT, inner)
        );
        otc.fill(id, unverified);

        // nothing moved
        assertEq(usdg.balanceOf(taker), USDG_AMT);
        assertEq(stk.balanceOf(address(otc)), STK_AMT);
        assertEq(uint8(otc.getOrder(id).status), uint8(OtcEscrow.Status.Open));

        vm.prank(maker);
        otc.cancel(id, address(0));
        assertEq(stk.balanceOf(maker), STK_AMT);
    }

    function test_unverifiedMakerCannotEscrow() public {
        stk.setAllowlisted(maker, false);
        bytes memory inner = abi.encodeWithSelector(MockRestrictedToken.NotAllowlisted.selector, maker);
        vm.prank(maker);
        vm.expectRevert(
            abi.encodeWithSelector(
                TokenTransfer.TransferFromRejected.selector, address(stk), maker, address(otc), STK_AMT, inner
            )
        );
        otc.createOrder(address(stk), STK_AMT, address(usdg), USDG_AMT, taker, expiry, address(0));
    }

    function testFuzz_fillConservesBalances(uint96 mAmt, uint96 tAmt) public {
        vm.assume(mAmt > 0 && tAmt > 0);
        MockUSDG a = new MockUSDG();
        MockUSDG b = new MockUSDG();
        a.mint(maker, mAmt);
        b.mint(taker, tAmt);
        vm.prank(maker);
        a.approve(address(otc), type(uint256).max);
        vm.prank(taker);
        b.approve(address(otc), type(uint256).max);

        vm.prank(maker);
        uint256 id = otc.createOrder(address(a), mAmt, address(b), tAmt, address(0), expiry, makerFresh);
        vm.prank(taker);
        otc.fill(id, takerFresh);

        assertEq(a.balanceOf(takerFresh), mAmt);
        assertEq(b.balanceOf(makerFresh), tAmt);
        assertEq(a.balanceOf(address(otc)), 0);
        assertEq(b.balanceOf(address(otc)), 0);
    }
}
