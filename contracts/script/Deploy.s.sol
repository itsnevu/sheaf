// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {SheafBatchPayer} from "../src/SheafBatchPayer.sol";

/// Deterministic deployment of SheafBatchPayer through the canonical CREATE2 factory
/// (0x4e59b44847b379578588920cA78FbF26c0B4956C, present on Ethereum, Base, Arbitrum, Optimism,
/// Polygon and on every anvil node). The contract has no constructor arguments and no owner, and
/// the bytecode carries no metadata hash, so the address is the same on every chain.
///
/// Idempotent: if the code is already at the predicted address, nothing is broadcast. Either way
/// it writes deployments/<chainId>.json (or $SHEAF_DEPLOYMENTS_OUT/<chainId>.json), which the app
/// reads at runtime.
///
/// Use scripts/deploy-contract.sh rather than calling this directly: it refuses public RPCs
/// unless you pass --public, and never takes a key on the command line.
contract Deploy is Script {
    bytes32 public constant SALT = keccak256("sheaf.batch-payer.v1");

    function predictedAddress() public pure returns (address) {
        return vm.computeCreate2Address(SALT, keccak256(type(SheafBatchPayer).creationCode), CREATE2_FACTORY);
    }

    function run() external returns (address deployed) {
        deployed = predictedAddress();
        bool fresh = deployed.code.length == 0;
        if (fresh) {
            require(CREATE2_FACTORY.code.length > 0, "CREATE2 factory is not deployed on this chain");
            vm.startBroadcast();
            SheafBatchPayer payer = new SheafBatchPayer{salt: SALT}();
            vm.stopBroadcast();
            require(address(payer) == deployed, "CREATE2 address mismatch");
            console.log("SheafBatchPayer deployed at", deployed);
        } else {
            console.log("SheafBatchPayer already deployed at", deployed);
        }
        bytes32 codehash = keccak256(type(SheafBatchPayer).runtimeCode);
        // In a dry run (no --broadcast) the code only exists in the simulation, which is enough.
        require(keccak256(deployed.code) == codehash, "code at the predicted address is not SheafBatchPayer");
        _write(deployed, codehash, fresh);
    }

    function _write(address deployed, bytes32 codehash, bool fresh) internal {
        string memory dir = vm.envOr("SHEAF_DEPLOYMENTS_OUT", string("../deployments"));
        string memory path = string.concat(dir, "/", vm.toString(block.chainid), ".json");
        string memory o = "deployment";
        vm.serializeUint(o, "chainId", block.chainid);
        vm.serializeString(o, "contract", "SheafBatchPayer");
        vm.serializeAddress(o, "address", deployed);
        vm.serializeBytes32(o, "salt", SALT);
        vm.serializeAddress(o, "factory", CREATE2_FACTORY);
        vm.serializeBytes32(o, "runtimeCodeHash", codehash);
        vm.serializeUint(o, "maxPayments", 200);
        vm.serializeString(o, "compiler", "solc 0.8.28, optimizer 10000 runs, evm cancun, no metadata hash");
        vm.serializeBool(o, "deployedByThisRun", fresh);
        // Lower bound for event scans: the block the script ran against.
        string memory json = vm.serializeUint(o, "fromBlock", block.number);
        vm.writeJson(json, path);
        console.log("wrote", path);
    }
}
