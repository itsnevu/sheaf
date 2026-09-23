// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StealthDesk} from "../src/StealthDesk.sol";
import {TokenTransfer} from "../src/TokenTransfer.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockRestrictedToken} from "../src/mocks/MockRestrictedToken.sol";
import {Merkle} from "./utils/Merkle.sol";

contract StealthDeskTest is Test {
    MockUSDG usdg;
    StealthDesk desk;

    address treasury = makeAddr("treasury");
    address operator = makeAddr("operator");
    address stranger = makeAddr("stranger");
    address r0 = makeAddr("r0");
    address r1 = makeAddr("r1");
    address r2 = makeAddr("r2");

    bytes32 constant PLAN = keccak256("plan-1");
    StealthDesk.Leg[] legs;
    bytes32[] leaves;
    bytes32 root;

    function setUp() public {
        usdg = new MockUSDG();
        desk = new StealthDesk();
        usdg.mint(treasury, 1_000_000e6);

        legs.push(StealthDesk.Leg(r0, address(usdg), 100e6, uint64(block.timestamp), keccak256("s0")));
        legs.push(StealthDesk.Leg(r1, address(usdg), 200e6, uint64(block.timestamp + 1 days), keccak256("s1")));
        legs.push(StealthDesk.Leg(r2, address(usdg), 300e6, uint64(block.timestamp + 2 days), keccak256("s2")));
        for (uint256 i; i < legs.length; i++) {
            leaves.push(desk.leafOf(PLAN, i, legs[i]));
        }
        root = Merkle.root(leaves);

        vm.startPrank(treasury);
        usdg.approve(address(desk), type(uint256).max);
        desk.deposit(address(usdg), 1_000e6);
        desk.setOperator(operator);
        desk.commitPlan(PLAN, root);
        vm.stopPrank();
    }

    function test_depositCreditsBalance() public view {
        assertEq(desk.balanceOf(treasury, address(usdg)), 1_000e6);
        assertEq(usdg.balanceOf(address(desk)), 1_000e6);
    }

    function test_operatorExecutesLeg() public {
        vm.prank(operator);
        vm.expectEmit(true, true, true, true);
        emit StealthDesk.LegExecuted(PLAN, 0, r0, address(usdg), 100e6);
        desk.executeLeg(PLAN, 0, legs[0], Merkle.proof(leaves, 0));

        assertEq(usdg.balanceOf(r0), 100e6);
        assertEq(desk.balanceOf(treasury, address(usdg)), 900e6);
        assertTrue(desk.legExecuted(PLAN, 0));
    }

    function test_treasuryMayExecuteItself() public {
        vm.prank(treasury);
        desk.executeLeg(PLAN, 0, legs[0], Merkle.proof(leaves, 0));
        assertEq(usdg.balanceOf(r0), 100e6);
    }

    function test_strangerCannotExecute() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(StealthDesk.NotOperator.selector, stranger, treasury));
        desk.executeLeg(PLAN, 0, legs[0], Merkle.proof(leaves, 0));
    }

    function test_legDoubleExecuteReverts() public {
        bytes32[] memory p = Merkle.proof(leaves, 0);
        vm.startPrank(operator);
        desk.executeLeg(PLAN, 0, legs[0], p);
        vm.expectRevert(abi.encodeWithSelector(StealthDesk.LegAlreadyExecuted.selector, PLAN, 0));
        desk.executeLeg(PLAN, 0, legs[0], p);
        vm.stopPrank();
    }

    function test_notBeforeEnforced() public {
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(StealthDesk.LegTooEarly.selector, legs[1].notBefore, block.timestamp));
        desk.executeLeg(PLAN, 1, legs[1], Merkle.proof(leaves, 1));

        vm.warp(legs[1].notBefore);
        vm.prank(operator);
        desk.executeLeg(PLAN, 1, legs[1], Merkle.proof(leaves, 1));
        assertEq(usdg.balanceOf(r1), 200e6);
    }

    function test_tamperedLegReverts() public {
        StealthDesk.Leg memory bad = legs[0];
        bad.amount = 999e6;
        vm.prank(operator);
        vm.expectRevert(StealthDesk.InvalidLegProof.selector);
        desk.executeLeg(PLAN, 0, bad, Merkle.proof(leaves, 0));

        // right leg, wrong index
        vm.prank(operator);
        vm.expectRevert(StealthDesk.InvalidLegProof.selector);
        desk.executeLeg(PLAN, 1, legs[0], Merkle.proof(leaves, 0));
    }

    function test_cancelVoidsRemainingLegs() public {
        vm.prank(operator);
        desk.executeLeg(PLAN, 0, legs[0], Merkle.proof(leaves, 0));

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(StealthDesk.NotTreasury.selector, stranger, treasury));
        desk.cancelPlan(PLAN);

        vm.prank(treasury);
        desk.cancelPlan(PLAN);

        vm.warp(block.timestamp + 3 days);
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(StealthDesk.PlanIsCancelled.selector, PLAN));
        desk.executeLeg(PLAN, 1, legs[1], Merkle.proof(leaves, 1));
    }

    function test_withdrawAnyTime() public {
        vm.prank(treasury);
        desk.withdraw(address(usdg), treasury, 1_000e6);
        assertEq(desk.balanceOf(treasury, address(usdg)), 0);
        assertEq(usdg.balanceOf(treasury), 1_000_000e6);

        // legs now fail for lack of balance, no stuck state
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(StealthDesk.InsufficientBalance.selector, address(usdg), 0, 100e6));
        desk.executeLeg(PLAN, 0, legs[0], Merkle.proof(leaves, 0));
    }

    function test_withdrawMoreThanBalanceReverts() public {
        vm.prank(treasury);
        vm.expectRevert(
            abi.encodeWithSelector(StealthDesk.InsufficientBalance.selector, address(usdg), 1_000e6, 1_001e6)
        );
        desk.withdraw(address(usdg), treasury, 1_001e6);
    }

    function test_duplicatePlanIdReverts() public {
        vm.prank(treasury);
        vm.expectRevert(abi.encodeWithSelector(StealthDesk.PlanExists.selector, PLAN));
        desk.commitPlan(PLAN, root);
    }

    function test_restrictedTokenRevertsCleanly() public {
        MockRestrictedToken stk = new MockRestrictedToken();
        stk.setAllowlisted(treasury, true);
        stk.setAllowlisted(address(desk), true);
        stk.mint(treasury, 10e18);

        StealthDesk.Leg memory leg = StealthDesk.Leg(r0, address(stk), 1e18, 0, keccak256("x"));
        bytes32 pid = keccak256("plan-stk");
        bytes32[] memory l = new bytes32[](1);
        l[0] = desk.leafOf(pid, 0, leg);

        vm.startPrank(treasury);
        stk.approve(address(desk), type(uint256).max);
        desk.deposit(address(stk), 10e18);
        desk.commitPlan(pid, Merkle.root(l));
        vm.stopPrank();

        bytes memory inner = abi.encodeWithSelector(MockRestrictedToken.NotAllowlisted.selector, r0);
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(TokenTransfer.TransferRejected.selector, address(stk), r0, 1e18, inner));
        desk.executeLeg(pid, 0, leg, Merkle.proof(l, 0));

        // balance intact, leg not marked, treasury can withdraw
        assertEq(desk.balanceOf(treasury, address(stk)), 10e18);
        assertFalse(desk.legExecuted(pid, 0));
        vm.prank(treasury);
        desk.withdraw(address(stk), treasury, 10e18);
        assertEq(stk.balanceOf(treasury), 10e18);
    }

    function testFuzz_legsNeverExceedDeposit(uint96 a0, uint96 a1, uint96 dep) public {
        vm.assume(a0 > 0 && a1 > 0);
        StealthDesk d = new StealthDesk();
        MockUSDG t = new MockUSDG();
        t.mint(treasury, dep);
        bytes32 pid = keccak256("fuzz");
        StealthDesk.Leg memory l0 = StealthDesk.Leg(r0, address(t), a0, 0, bytes32(0));
        StealthDesk.Leg memory l1 = StealthDesk.Leg(r1, address(t), a1, 0, bytes32(0));
        bytes32[] memory l = new bytes32[](2);
        l[0] = d.leafOf(pid, 0, l0);
        l[1] = d.leafOf(pid, 1, l1);

        vm.startPrank(treasury);
        t.approve(address(d), type(uint256).max);
        if (dep > 0) d.deposit(address(t), dep);
        d.commitPlan(pid, Merkle.root(l));

        uint256 paid;
        if (a0 <= dep) {
            d.executeLeg(pid, 0, l0, Merkle.proof(l, 0));
            paid += a0;
        } else {
            vm.expectRevert();
            d.executeLeg(pid, 0, l0, Merkle.proof(l, 0));
        }
        if (paid + a1 <= dep) {
            d.executeLeg(pid, 1, l1, Merkle.proof(l, 1));
            paid += a1;
        } else {
            vm.expectRevert();
            d.executeLeg(pid, 1, l1, Merkle.proof(l, 1));
        }
        vm.stopPrank();

        assertEq(t.balanceOf(r0) + t.balanceOf(r1), paid);
        assertEq(d.balanceOf(treasury, address(t)), uint256(dep) - paid);
    }
}
