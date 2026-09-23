// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;
    address agent = makeAddr("agent");

    function setUp() public {
        registry = new AgentRegistry();
    }

    function test_registerAndUpdate() public {
        assertFalse(registry.isRegistered(agent));
        vm.prank(agent);
        vm.expectEmit(true, true, true, true);
        emit AgentRegistry.AgentRegistered(agent, keccak256("a"));
        registry.register(keccak256("a"));
        assertTrue(registry.isRegistered(agent));
        assertEq(registry.metadataOf(agent), keccak256("a"));

        vm.prank(agent);
        registry.register(keccak256("b"));
        assertEq(registry.metadataOf(agent), keccak256("b"));
    }

    function test_registerRejectsZero() public {
        vm.prank(agent);
        vm.expectRevert(AgentRegistry.EmptyMetadata.selector);
        registry.register(bytes32(0));
    }

    function test_deregister() public {
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.NotRegistered.selector, agent));
        registry.deregister();

        vm.startPrank(agent);
        registry.register(keccak256("a"));
        vm.expectEmit(true, true, true, true);
        emit AgentRegistry.AgentDeregistered(agent);
        registry.deregister();
        vm.stopPrank();
        assertFalse(registry.isRegistered(agent));
    }

    function testFuzz_registerAnyNonZeroHash(address who, bytes32 h) public {
        vm.assume(h != bytes32(0));
        vm.prank(who);
        registry.register(h);
        assertTrue(registry.isRegistered(who));
        assertEq(registry.metadataOf(who), h);
    }
}
