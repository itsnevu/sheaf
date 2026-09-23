// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PrivateClaim} from "../src/PrivateClaim.sol";
import {TokenTransfer} from "../src/TokenTransfer.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockRestrictedToken} from "../src/mocks/MockRestrictedToken.sol";
import {Merkle} from "./utils/Merkle.sol";

contract PrivateClaimTest is Test {
    MockUSDG usdg;
    PrivateClaim claim;

    address owner = makeAddr("owner");
    address relayer = makeAddr("relayer");
    address fresh = makeAddr("fresh");

    uint256 alicePk = 0xA11CE;
    address alice;
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 constant ALICE_AMT = 1_000e6;
    uint256 constant BOB_AMT = 250e6;
    uint256 constant CAROL_AMT = 7e6;

    bytes32[] leaves;
    bytes32 root;
    uint64 start;
    uint64 end;

    function setUp() public {
        alice = vm.addr(alicePk);
        usdg = new MockUSDG();
        claim = new PrivateClaim(owner, IERC20(address(usdg)));

        leaves.push(claim.leaf(alice, ALICE_AMT));
        leaves.push(claim.leaf(bob, BOB_AMT));
        leaves.push(claim.leaf(carol, CAROL_AMT));
        root = Merkle.root(leaves);

        start = uint64(block.timestamp + 1 hours);
        end = uint64(block.timestamp + 8 days);

        usdg.mint(owner, 10_000e6);
        vm.startPrank(owner);
        usdg.approve(address(claim), type(uint256).max);
        claim.fund(2_000e6);
        claim.configure(root, start, end);
        vm.stopPrank();

        vm.warp(start);
    }

    function _sign(uint256 pk, address account, address recipient, uint256 amount, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = claim.hashClaim(account, recipient, amount, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    // ------------------------------------------------------------ happy paths

    function test_directClaimPaysRecipientNotAccount() public {
        vm.prank(bob);
        vm.expectEmit(true, true, false, true);
        emit PrivateClaim.Claimed(bob, fresh, BOB_AMT);
        claim.claim(bob, fresh, BOB_AMT, Merkle.proof(leaves, 1));

        assertEq(usdg.balanceOf(fresh), BOB_AMT);
        assertEq(usdg.balanceOf(bob), 0);
        assertTrue(claim.claimed(bob));
        assertEq(claim.claimCount(), 1);
    }

    function test_relayedClaimWithSignature() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _sign(alicePk, alice, fresh, ALICE_AMT, deadline);

        vm.prank(relayer);
        claim.claimWithSignature(alice, fresh, ALICE_AMT, deadline, Merkle.proof(leaves, 0), sig);

        assertEq(usdg.balanceOf(fresh), ALICE_AMT);
        assertEq(usdg.balanceOf(alice), 0);
        assertTrue(claim.claimed(alice));
    }

    // ------------------------------------------------------------ one claim per account

    function test_secondClaimReverts() public {
        vm.startPrank(bob);
        claim.claim(bob, fresh, BOB_AMT, Merkle.proof(leaves, 1));
        vm.expectRevert(abi.encodeWithSelector(PrivateClaim.AlreadyClaimed.selector, bob));
        claim.claim(bob, makeAddr("fresh2"), BOB_AMT, Merkle.proof(leaves, 1));
        vm.stopPrank();
    }

    function test_signatureReplayReverts() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _sign(alicePk, alice, fresh, ALICE_AMT, deadline);
        bytes32[] memory proof = Merkle.proof(leaves, 0);

        vm.prank(relayer);
        claim.claimWithSignature(alice, fresh, ALICE_AMT, deadline, proof, sig);

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(PrivateClaim.AlreadyClaimed.selector, alice));
        claim.claimWithSignature(alice, fresh, ALICE_AMT, deadline, proof, sig);
    }

    // ------------------------------------------------------------ signature checks

    function test_expiredSignatureReverts() public {
        uint256 deadline = vm.getBlockTimestamp() + 10;
        bytes memory sig = _sign(alicePk, alice, fresh, ALICE_AMT, deadline);
        vm.warp(deadline + 1);
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(PrivateClaim.SignatureExpired.selector, deadline, deadline + 1));
        claim.claimWithSignature(alice, fresh, ALICE_AMT, deadline, Merkle.proof(leaves, 0), sig);
    }

    function test_wrongRecipientInSignatureReverts() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _sign(alicePk, alice, fresh, ALICE_AMT, deadline);
        // relayer tries to redirect to its own address
        vm.prank(relayer);
        vm.expectRevert(PrivateClaim.InvalidSignature.selector);
        claim.claimWithSignature(alice, relayer, ALICE_AMT, deadline, Merkle.proof(leaves, 0), sig);
    }

    function test_signatureByOtherKeyReverts() public {
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _sign(0xB0B, alice, fresh, ALICE_AMT, deadline);
        vm.prank(relayer);
        vm.expectRevert(PrivateClaim.InvalidSignature.selector);
        claim.claimWithSignature(alice, fresh, ALICE_AMT, deadline, Merkle.proof(leaves, 0), sig);
    }

    function test_directClaimByOtherCallerReverts() public {
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(PrivateClaim.NotAccount.selector, relayer, bob));
        claim.claim(bob, fresh, BOB_AMT, Merkle.proof(leaves, 1));
    }

    // ------------------------------------------------------------ proofs and window

    function test_wrongAmountReverts() public {
        vm.prank(bob);
        vm.expectRevert(PrivateClaim.InvalidProof.selector);
        claim.claim(bob, fresh, BOB_AMT + 1, Merkle.proof(leaves, 1));
    }

    function test_zeroRecipientReverts() public {
        vm.prank(bob);
        vm.expectRevert(PrivateClaim.ZeroRecipient.selector);
        claim.claim(bob, address(0), BOB_AMT, Merkle.proof(leaves, 1));
    }

    function test_beforeWindowReverts() public {
        vm.warp(start - 1);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PrivateClaim.WindowClosed.selector, start, end, start - 1));
        claim.claim(bob, fresh, BOB_AMT, Merkle.proof(leaves, 1));
    }

    function test_afterWindowReverts() public {
        vm.warp(end + 1);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PrivateClaim.WindowClosed.selector, start, end, end + 1));
        claim.claim(bob, fresh, BOB_AMT, Merkle.proof(leaves, 1));
    }

    // ------------------------------------------------------------ owner

    function test_sweepOnlyAfterWindow() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(PrivateClaim.WindowStillOpen.selector, end, block.timestamp));
        claim.sweep(owner, 1);

        vm.warp(end + 1);
        vm.prank(owner);
        claim.sweep(owner, 2_000e6);
        assertEq(usdg.balanceOf(address(claim)), 0);
    }

    function test_nonOwnerCannotConfigureOrSweep() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        claim.configure(bytes32(uint256(1)), 1, 2);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        claim.sweep(bob, 1);
    }

    function test_rootLockedAfterFirstClaim() public {
        vm.prank(bob);
        claim.claim(bob, fresh, BOB_AMT, Merkle.proof(leaves, 1));
        vm.prank(owner);
        vm.expectRevert(PrivateClaim.RootLocked.selector);
        claim.configure(bytes32(uint256(1)), start, end);
    }

    // ------------------------------------------------------------ restricted token

    function test_restrictedTokenRevertsCleanlyAndLeavesClaimOpen() public {
        MockRestrictedToken stk = new MockRestrictedToken();
        PrivateClaim rc = new PrivateClaim(owner, IERC20(address(stk)));
        stk.setAllowlisted(address(rc), true);
        stk.mint(address(rc), 10_000e18);
        vm.prank(owner);
        rc.configure(root, start, end);

        bytes32[] memory proof = Merkle.proof(leaves, 1);
        bytes memory inner = abi.encodeWithSelector(MockRestrictedToken.NotAllowlisted.selector, fresh);
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(TokenTransfer.TransferRejected.selector, address(stk), fresh, BOB_AMT, inner)
        );
        rc.claim(bob, fresh, BOB_AMT, proof);
        assertFalse(rc.claimed(bob));

        // once the recipient is verified, the same claim goes through
        stk.setAllowlisted(fresh, true);
        vm.prank(bob);
        rc.claim(bob, fresh, BOB_AMT, proof);
        assertEq(stk.balanceOf(fresh), BOB_AMT);
    }

    // ------------------------------------------------------------ fuzz

    function testFuzz_claimAnyRecipientAndAmount(uint256 pk, address recipient, uint96 amount) public {
        pk = bound(pk, 1, type(uint128).max);
        vm.assume(recipient != address(0) && recipient != address(claim) && recipient != owner);
        address account = vm.addr(pk);
        vm.assume(amount > 0);

        bytes32[] memory l = new bytes32[](2);
        l[0] = claim.leaf(account, amount);
        l[1] = claim.leaf(makeAddr("other"), 1);
        PrivateClaim c = new PrivateClaim(owner, IERC20(address(usdg)));
        usdg.mint(address(c), amount);
        vm.prank(owner);
        c.configure(Merkle.root(l), start, end);

        uint256 deadline = block.timestamp + 1;
        bytes32 digest = c.hashClaim(account, recipient, amount, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);

        uint256 before = usdg.balanceOf(recipient);
        vm.prank(relayer);
        c.claimWithSignature(account, recipient, amount, deadline, Merkle.proof(l, 0), abi.encodePacked(r, s, v));
        assertEq(usdg.balanceOf(recipient) - before, amount);
        assertTrue(c.claimed(account));
    }
}
