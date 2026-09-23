// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Tiny Merkle tree builder for tests. Uses OpenZeppelin's commutative pair hashing so
///         proofs verify with `MerkleProof.verify`. Odd nodes are carried up unchanged.
library Merkle {
    function hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function root(bytes32[] memory leaves) internal pure returns (bytes32) {
        require(leaves.length > 0, "empty");
        bytes32[] memory level = leaves;
        while (level.length > 1) {
            level = _nextLevel(level);
        }
        return level[0];
    }

    function proof(bytes32[] memory leaves, uint256 index) internal pure returns (bytes32[] memory out) {
        require(index < leaves.length, "index");
        bytes32[] memory level = leaves;
        bytes32[] memory tmp = new bytes32[](64);
        uint256 n;
        while (level.length > 1) {
            uint256 sib = index ^ 1;
            if (sib < level.length) {
                tmp[n++] = level[sib];
            }
            index /= 2;
            level = _nextLevel(level);
        }
        out = new bytes32[](n);
        for (uint256 i; i < n; i++) {
            out[i] = tmp[i];
        }
    }

    function _nextLevel(bytes32[] memory level) private pure returns (bytes32[] memory next) {
        uint256 len = (level.length + 1) / 2;
        next = new bytes32[](len);
        for (uint256 i; i < len; i++) {
            uint256 l = 2 * i;
            uint256 r = l + 1;
            next[i] = r < level.length ? hashPair(level[l], level[r]) : level[l];
        }
    }
}
