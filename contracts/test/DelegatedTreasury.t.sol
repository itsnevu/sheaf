// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {DelegatedTreasury} from "../src/DelegatedTreasury.sol";
import {TokenTransfer} from "../src/TokenTransfer.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockRestrictedToken} from "../src/mocks/MockRestrictedToken.sol";

contract DelegatedTreasuryTest is Test {
    MockUSDG usdg;
    DelegatedTreasury t;

    address owner = makeAddr("owner");
    address op = makeAddr("operator");
    address op2 = makeAddr("operator2");
    address approver = makeAddr("approver");
    address both = makeAddr("operatorAndApprover");
    address stranger = makeAddr("stranger");
    address payee = makeAddr("payee");

    uint256 constant CAP = 1_000e6;

    function setUp() public {
        usdg = new MockUSDG();
        t = new DelegatedTreasury(owner);
        usdg.mint(owner, 100_000e6);

        vm.startPrank(owner);
        usdg.approve(address(t), type(uint256).max);
        t.fund(address(usdg), 10_000e6);
        t.setOperator(op, true);
        t.setOperator(op2, true);
        t.setApprover(approver, true);
        t.setOperator(both, true);
        t.setApprover(both, true);
        t.setDailyCap(address(usdg), CAP);
        vm.stopPrank();
    }

    function _proposeApprove(uint256 amount) internal returns (uint256 id) {
        vm.prank(op);
        id = t.propose(address(usdg), payee, amount);
        vm.prank(approver);
        t.approve(id);
    }

    function test_lifecycleHappyPath() public {
        vm.prank(op);
        vm.expectEmit(true, true, false, true);
        emit DelegatedTreasury.Proposed(1, op, address(usdg), payee, 400e6);
        uint256 id = t.propose(address(usdg), payee, 400e6);

        vm.prank(approver);
        vm.expectEmit(true, true, false, true);
        emit DelegatedTreasury.Approved(id, approver);
        t.approve(id);

        vm.prank(op2);
        vm.expectEmit(true, true, false, true);
        emit DelegatedTreasury.Executed(id, op2, address(usdg), payee, 400e6);
        t.execute(id);

        assertEq(usdg.balanceOf(payee), 400e6);
        assertEq(uint8(t.getProposal(id).status), uint8(DelegatedTreasury.Status.Executed));
        assertEq(t.getProposal(id).approver, approver);
    }

    // ------------------------------------------------------------ four eyes

    function test_proposerCannotApproveOwnProposal() public {
        vm.prank(both);
        uint256 id = t.propose(address(usdg), payee, 1e6);
        vm.prank(both);
        vm.expectRevert(abi.encodeWithSelector(DelegatedTreasury.ProposerCannotApprove.selector, id, both));
        t.approve(id);

        // a different approver is fine
        vm.prank(approver);
        t.approve(id);
    }

    function test_executeRequiresApproval() public {
        vm.prank(op);
        uint256 id = t.propose(address(usdg), payee, 1e6);
        vm.prank(op);
        vm.expectRevert(
            abi.encodeWithSelector(DelegatedTreasury.WrongStatus.selector, id, DelegatedTreasury.Status.Proposed)
        );
        t.execute(id);
    }

    function test_doubleExecuteReverts() public {
        uint256 id = _proposeApprove(1e6);
        vm.startPrank(op);
        t.execute(id);
        vm.expectRevert(
            abi.encodeWithSelector(DelegatedTreasury.WrongStatus.selector, id, DelegatedTreasury.Status.Executed)
        );
        t.execute(id);
        vm.stopPrank();
    }

    // ------------------------------------------------------------ roles

    function test_roleChecks() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(DelegatedTreasury.NotOperator.selector, stranger));
        t.propose(address(usdg), payee, 1e6);

        vm.prank(op);
        uint256 id = t.propose(address(usdg), payee, 1e6);

        vm.prank(op2); // operator but not approver
        vm.expectRevert(abi.encodeWithSelector(DelegatedTreasury.NotApprover.selector, op2));
        t.approve(id);

        vm.prank(approver);
        t.approve(id);

        vm.prank(approver); // approver but not operator
        vm.expectRevert(abi.encodeWithSelector(DelegatedTreasury.NotOperator.selector, approver));
        t.execute(id);

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        t.setOperator(stranger, true);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        t.setDailyCap(address(usdg), 1);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        t.withdraw(address(usdg), stranger, 1);
    }

    function test_revokedOperatorCannotExecute() public {
        uint256 id = _proposeApprove(1e6);
        vm.prank(owner);
        t.setOperator(op, false);
        vm.prank(op);
        vm.expectRevert(abi.encodeWithSelector(DelegatedTreasury.NotOperator.selector, op));
        t.execute(id);
    }

    // ------------------------------------------------------------ cancel

    function test_cancelByProposerAndOwner() public {
        vm.prank(op);
        uint256 a = t.propose(address(usdg), payee, 1e6);
        vm.prank(op);
        t.cancel(a);
        assertEq(uint8(t.getProposal(a).status), uint8(DelegatedTreasury.Status.Cancelled));

        uint256 b = _proposeApprove(1e6);
        vm.prank(owner);
        t.cancel(b);
        assertEq(uint8(t.getProposal(b).status), uint8(DelegatedTreasury.Status.Cancelled));

        vm.prank(op);
        vm.expectRevert(
            abi.encodeWithSelector(DelegatedTreasury.WrongStatus.selector, b, DelegatedTreasury.Status.Cancelled)
        );
        t.execute(b);
    }

    function test_cancelByOtherOperatorReverts() public {
        vm.prank(op);
        uint256 id = t.propose(address(usdg), payee, 1e6);
        vm.prank(op2);
        vm.expectRevert(abi.encodeWithSelector(DelegatedTreasury.NotOwnerOrProposer.selector, op2));
        t.cancel(id);
    }

    // ------------------------------------------------------------ daily cap

    function test_dailyCapEnforcedAndRolls() public {
        uint256 a = _proposeApprove(600e6);
        uint256 b = _proposeApprove(500e6);
        vm.prank(op);
        t.execute(a);
        assertEq(t.remainingToday(address(usdg)), 400e6);

        vm.prank(op);
        vm.expectRevert(
            abi.encodeWithSelector(DelegatedTreasury.DailyCapExceeded.selector, address(usdg), CAP, 600e6, 500e6)
        );
        t.execute(b);

        vm.warp(block.timestamp + 1 days);
        assertEq(t.remainingToday(address(usdg)), CAP);
        vm.prank(op);
        t.execute(b);
        assertEq(usdg.balanceOf(payee), 1_100e6);
    }

    function test_zeroCapBlocksExecution() public {
        MockUSDG other = new MockUSDG();
        other.mint(address(t), 10e6);
        vm.prank(op);
        uint256 id = t.propose(address(other), payee, 1e6);
        vm.prank(approver);
        t.approve(id);
        vm.prank(op);
        vm.expectRevert(abi.encodeWithSelector(DelegatedTreasury.DailyCapExceeded.selector, address(other), 0, 0, 1e6));
        t.execute(id);
    }

    function test_singleProposalOverCapReverts() public {
        uint256 id = _proposeApprove(CAP + 1);
        vm.prank(op);
        vm.expectRevert(
            abi.encodeWithSelector(DelegatedTreasury.DailyCapExceeded.selector, address(usdg), CAP, 0, CAP + 1)
        );
        t.execute(id);
    }

    // ------------------------------------------------------------ owner

    function test_ownerWithdrawsEverythingIgnoringCap() public {
        vm.prank(owner);
        t.withdraw(address(usdg), owner, 10_000e6);
        assertEq(usdg.balanceOf(address(t)), 0);
        assertEq(usdg.balanceOf(owner), 100_000e6);
    }

    // ------------------------------------------------------------ restricted token

    function test_restrictedTokenRevertsCleanlyAndStaysApproved() public {
        MockRestrictedToken stk = new MockRestrictedToken();
        stk.setAllowlisted(address(t), true);
        stk.mint(address(t), 5e18);
        vm.prank(owner);
        t.setDailyCap(address(stk), 5e18);

        vm.prank(op);
        uint256 id = t.propose(address(stk), payee, 1e18);
        vm.prank(approver);
        t.approve(id);

        bytes memory inner = abi.encodeWithSelector(MockRestrictedToken.NotAllowlisted.selector, payee);
        vm.prank(op);
        vm.expectRevert(
            abi.encodeWithSelector(TokenTransfer.TransferRejected.selector, address(stk), payee, 1e18, inner)
        );
        t.execute(id);

        // state untouched: still approved, cap not consumed
        assertEq(uint8(t.getProposal(id).status), uint8(DelegatedTreasury.Status.Approved));
        assertEq(t.spentInWindow(address(stk)), 0);

        stk.setAllowlisted(payee, true);
        vm.prank(op);
        t.execute(id);
        assertEq(stk.balanceOf(payee), 1e18);
    }

    // ------------------------------------------------------------ fuzz

    function testFuzz_windowSpendNeverExceedsCap(uint96[8] memory amounts, uint96 cap) public {
        vm.assume(cap > 0);
        usdg.mint(address(t), 8 * 10_000e6); // enough for every proposal, so only the cap can block
        vm.prank(owner);
        t.setDailyCap(address(usdg), cap);

        uint256 executed;
        for (uint256 i; i < amounts.length; i++) {
            uint256 amt = bound(uint256(amounts[i]), 1, 10_000e6);
            uint256 id = _proposeApprove(amt);
            vm.prank(op);
            if (executed + amt <= cap) {
                t.execute(id);
                executed += amt;
            } else {
                vm.expectRevert();
                t.execute(id);
            }
        }
        assertLe(t.spentInWindow(address(usdg)), cap);
        assertEq(usdg.balanceOf(payee), executed);
    }
}
