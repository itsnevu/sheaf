// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {LancefieldPrizeEscrow} from "../src/LancefieldPrizeEscrow.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";

/// Deploys the prize escrow and writes deployments/<chainId>.json, which the app reads.
///
/// Environment:
///   DEPLOYER_PRIVATE_KEY  required. Read here, never passed on the command line.
///   ESCROW_OWNER          optional, defaults to the deployer. Can change fees and the token allow-list only.
///   FEE_RECIPIENT         optional, defaults to the owner.
///   FEE_BPS               optional, defaults to 1500 (15%, the contract's cap).
///   ALLOW_ETH             optional, defaults to true (native ETH prizes).
///   USDC_ADDRESS          optional override; Base and Base Sepolia use Circle's USDC, anvil gets a mock.
///   DEPLOYMENTS_DIR       optional, defaults to "deployments" (must stay inside ./deployments).
///
/// Use script/deploy.sh rather than calling this directly: it checks the chain and the result.
contract Deploy is Script {
    address internal constant BASE_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address internal constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    uint256 internal constant ANVIL = 31337;

    function run() external returns (LancefieldPrizeEscrow escrow, address usdc) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address owner = vm.envOr("ESCROW_OWNER", deployer);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", owner);
        uint256 fee = vm.envOr("FEE_BPS", uint256(1_500));
        bool allowEth = vm.envOr("ALLOW_ETH", true);
        require(fee <= 1_500, "FEE_BPS above the 1500 cap");
        uint256 startBlock = block.number;

        vm.startBroadcast(pk);
        bool mock;
        (usdc, mock) = _usdc();
        address[] memory tokens = new address[](allowEth ? 2 : 1);
        tokens[0] = usdc;
        if (allowEth) tokens[1] = address(0);
        // forge-lint: disable-next-line(unsafe-typecast)
        escrow = new LancefieldPrizeEscrow(owner, feeRecipient, uint16(fee), tokens);
        vm.stopBroadcast();

        string memory json = _json(escrow, usdc, mock, allowEth, startBlock);
        string memory dir = vm.envOr("DEPLOYMENTS_DIR", string("deployments"));
        string memory path = string.concat(vm.projectRoot(), "/", dir, "/", vm.toString(block.chainid), ".json");
        if (vm.isContext(VmSafe.ForgeContext.ScriptBroadcast) || vm.isContext(VmSafe.ForgeContext.ScriptResume)) {
            vm.createDir(string.concat(vm.projectRoot(), "/", dir), true);
            vm.writeFile(path, json);
            console2.log("Wrote", path);
        } else {
            console2.log("Dry run: nothing broadcast and no deployment file written. Would write", path);
        }
        console2.log(json);
    }

    function _usdc() internal returns (address token, bool mock) {
        token = vm.envOr("USDC_ADDRESS", address(0));
        if (token == address(0)) {
            if (block.chainid == 8453) token = BASE_USDC;
            else if (block.chainid == 84532) token = BASE_SEPOLIA_USDC;
            else if (block.chainid == ANVIL) return (address(new MockUSDC()), true);
            else revert("Unknown chain: set USDC_ADDRESS");
        }
        require(token.code.length > 0, "USDC_ADDRESS has no code on this chain");
        require(IERC20Metadata(token).decimals() == 6, "USDC_ADDRESS is not a 6-decimal token");
    }

    function _json(LancefieldPrizeEscrow escrow, address usdc, bool mock, bool allowEth, uint256 startBlock) internal view returns (string memory) {
        string memory tokens = string.concat('[{"symbol":"USDC","address":"', vm.toString(usdc), '","decimals":6,"mock":', mock ? "true" : "false", "}");
        if (allowEth) tokens = string.concat(tokens, ',{"symbol":"ETH","address":"', vm.toString(address(0)), '","decimals":18,"mock":false}');
        tokens = string.concat(tokens, "]");
        return string.concat(
            "{",
            '"chainId":', vm.toString(block.chainid),
            ',"escrow":"', vm.toString(address(escrow)), '"',
            ',"startBlock":', vm.toString(startBlock),
            ',"owner":"', vm.toString(escrow.owner()), '"',
            ',"feeRecipient":"', vm.toString(escrow.feeRecipient()), '"',
            ',"feeBps":', vm.toString(uint256(escrow.feeBps())),
            ',"maxFeeBps":', vm.toString(uint256(escrow.MAX_FEE_BPS())),
            ',"pickWindowSeconds":', vm.toString(uint256(escrow.PICK_WINDOW())),
            ',"maxDurationSeconds":', vm.toString(uint256(escrow.MAX_DURATION())),
            ',"tokens":', tokens,
            ',"deployedAt":', vm.toString(block.timestamp),
            "}\n"
        );
    }
}
