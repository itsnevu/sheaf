// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {SheafBatchPayer} from "../../src/SheafBatchPayer.sol";

/// Shared plumbing for tests against real tokens on forks of public chains (read-only: the fork
/// is local to the test process; nothing is ever broadcast). Blocks are pinned so Foundry caches
/// the state; override the RPCs with FORK_URL_BASE / FORK_URL_MAINNET, or skip every fork test
/// with SHEAF_SKIP_FORK_TESTS=true when offline.
abstract contract ForkTest is Test {
    // CREATE2_FACTORY (0x4e59b448…) comes from forge-std, the same factory forge scripts use.
    bytes32 internal constant SALT = keccak256("sheaf.batch-payer.v1");

    SheafBatchPayer internal payer;
    address internal treasury = makeAddr("fork-treasury");

    function _fork(string memory envKey, string memory defaultUrl, uint256 blockNumber) internal {
        vm.skip(vm.envOr("SHEAF_SKIP_FORK_TESTS", false));
        vm.createSelectFork(vm.envOr(envKey, defaultUrl), blockNumber);
        // Deploy exactly as the deploy script does: through the canonical CREATE2 factory.
        (bool ok, bytes memory ret) = CREATE2_FACTORY.call(abi.encodePacked(SALT, type(SheafBatchPayer).creationCode));
        require(ok, "create2 deploy failed");
        payer = SheafBatchPayer(address(bytes20(ret)));
        assertEq(address(payer), vm.computeCreate2Address(SALT, keccak256(type(SheafBatchPayer).creationCode), CREATE2_FACTORY));
    }

    /// Fresh, never-funded recipient per (salt, i): the realistic worst case for gas.
    function _recipient(bytes32 salt, uint256 i) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encode("fork-recipient", salt, i)))));
    }

    function _batch(uint256 n, uint256 base, bytes32 salt) internal pure returns (SheafBatchPayer.Payment[] memory ps, uint256 total) {
        ps = new SheafBatchPayer.Payment[](n);
        for (uint256 i; i < n; ++i) {
            ps[i] = SheafBatchPayer.Payment({recipient: _recipient(salt, i), amount: base + i, paymentId: keccak256(abi.encode(salt, i))});
            total += base + i;
        }
    }

    /// Calldata-inclusive estimate of the transaction gas (EIP-2028 pricing + 21000 base).
    function _intrinsic(bytes memory data) internal pure returns (uint256 g) {
        g = 21_000;
        for (uint256 i; i < data.length; ++i) g += data[i] == 0 ? 4 : 16;
    }

    function _report(string memory label, uint256 n, uint256 execGas, bytes memory data) internal pure {
        uint256 txGas = execGas + _intrinsic(data);
        console.log(string.concat(label, " n=", vm.toString(n), " exec=", vm.toString(execGas), " tx~", vm.toString(txGas), " per-recipient~", vm.toString(txGas / n)));
    }
}
