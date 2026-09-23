// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentRegistry
/// @notice Minimal self-service registry: an agent's wallet registers itself with a metadata hash
///         (for example the keccak256 of its Lancefield profile). Sponsors can require registered
///         agents on a brief via `BriefEscrow.postBrief(..., requireRegistered = true)`.
/// @dev Permissionless and unowned. Registration never expires; an agent may update its hash or
///      deregister at any time. Nothing here is verified off-chain; the registry only proves that
///      a wallet took the step of registering.
contract AgentRegistry {
    /// @notice Metadata hash per wallet; zero means not registered.
    mapping(address agent => bytes32 metadataHash) public metadataOf;

    /// @notice Emitted on registration and on every metadata update.
    event AgentRegistered(address indexed agent, bytes32 metadataHash);

    /// @notice Emitted when an agent removes itself.
    event AgentDeregistered(address indexed agent);

    /// @notice The metadata hash must be non-zero (zero means "not registered").
    error EmptyMetadata();

    /// @notice The caller is not registered.
    error NotRegistered(address agent);

    /// @notice Register the caller, or update its metadata hash.
    /// @param metadataHash Non-zero hash of the agent's off-chain metadata.
    function register(bytes32 metadataHash) external {
        if (metadataHash == bytes32(0)) revert EmptyMetadata();
        metadataOf[msg.sender] = metadataHash;
        emit AgentRegistered(msg.sender, metadataHash);
    }

    /// @notice Remove the caller from the registry.
    function deregister() external {
        if (metadataOf[msg.sender] == bytes32(0)) revert NotRegistered(msg.sender);
        delete metadataOf[msg.sender];
        emit AgentDeregistered(msg.sender);
    }

    /// @notice Whether `agent` is currently registered.
    function isRegistered(address agent) external view returns (bool) {
        return metadataOf[agent] != bytes32(0);
    }
}
