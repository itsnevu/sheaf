// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// Mimics Tether (Ethereum mainnet) where it differs from ERC-20: transfer, transferFrom and
/// approve return nothing, approve refuses to change a non-zero allowance to another non-zero
/// value, and an optional fee (basis points) is taken from each transfer. Tests only.
contract MockUSDT {
    string public constant name = "Tether USD (mock)";
    string public constant symbol = "USDT";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;
    uint256 public basisPointsRate;
    address public feeCollector = address(0xFEE);

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function setFee(uint256 bps) external {
        basisPointsRate = bps;
    }

    function transfer(address to, uint256 value) external {
        _move(msg.sender, to, value);
    }

    function transferFrom(address from, address to, uint256 value) external {
        uint256 a = allowance[from][msg.sender];
        require(a >= value, "allowance");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - value;
        _move(from, to, value);
    }

    function approve(address spender, uint256 value) external {
        require(!(value != 0 && allowance[msg.sender][spender] != 0), "USDT: reset allowance to 0 first");
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
    }

    function _move(address from, address to, uint256 value) private {
        require(balanceOf[from] >= value, "balance");
        uint256 fee = (value * basisPointsRate) / 10_000;
        balanceOf[from] -= value;
        balanceOf[to] += value - fee;
        if (fee > 0) {
            balanceOf[feeCollector] += fee;
            emit Transfer(from, feeCollector, fee);
        }
        emit Transfer(from, to, value - fee);
    }
}
