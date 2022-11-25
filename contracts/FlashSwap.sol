// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.6.6;

import "hardhat/console.sol";

// Uniswap Interface and library imports
import "./libraries/UniswapV2Library.sol";
import "./libraries/SafeERC20.sol";
import "./interfaces/IUniswapV2Router01.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IERC20.sol";

contract UniswapCrossFlash {

    using SafeERC20 for IERC20;

    struct route {
        address pair;
        address router;
    }

    route[] private addresses;

    // Token Addresses
    address private DAI; // token0
    address private WETH; // token1

    //Trade Variables
    uint256 private deadline  = block.timestamp + 10 seconds;
    
    constructor(address[] memory pairs, address[] memory routers, address _DAI, address _WETH) public {

        require(pairs.length == routers.length, "Inconsistent length between Pairs and Routers");
        
        DAI = _DAI;
        WETH = _WETH;

        for(uint i=0; i < pairs.length; i++){
            route memory temp;
            temp.pair = pairs[i];
            temp.router = routers[i];
            addresses.push(temp);
        }

    }

    function getAddresses() public view returns(address[] memory, address[] memory) {
        
        address[] memory pairs = new address[](addresses.length);
        address[] memory routers = new address[](addresses.length);
        
        for(uint i=0; i < addresses.length; i++){
            route memory temp = addresses[i];
            pairs[i] = temp.pair;
            routers[i] = temp.router;
        }

        return (pairs, routers);

    }

    function getBalanceOfToken(address _address) public view returns (uint256) {
        return IERC20(_address).balanceOf(address(this));
    }

    function getReserves() public view returns(uint112[] memory, uint112[] memory) {
        
        uint112[] memory reserv0s = new uint112[](addresses.length);
        uint112[] memory reserv1s = new uint112[](addresses.length);

        for(uint i = 0; i < addresses.length; i++) {
            (reserv0s[i], reserv1s[i], ) = IUniswapV2Pair(addresses[i].pair).getReserves();
        }

        return (reserv0s, reserv1s);

    }

    function startArbitrage(
        uint256 _start,
        uint256 _end,
        address _token,
        uint256 _loan,
        uint256 _mid,
        uint256 _return
        ) external {

        require(_start < addresses.length, "Start DEX not present");
        require(_end < addresses.length, "End DEX not present");

        uint256 amount0Out = _token == DAI ? _loan : 0;
        uint256 amount1Out = _token == WETH ? _loan : 0;

        bytes memory data = abi.encode(
            _start, 
            _end,
            _token,
            _loan,
            _mid,
            _return,
            msg.sender
            );

        IUniswapV2Pair(addresses[_start].pair).swap(amount0Out, amount1Out, address(this), data);
    
    }

    function uniswapV2Call(
        address _sender,
        uint256 _amount0,
        uint256 _amount1,
        bytes calldata _data
    ) external {

        (
            uint256 _start,
            uint256 _end,
            address _token,
            uint256 _loan,
            uint256 _mid,
            uint256 _return
        ) = abi.decode(_data, (
            uint256,
            uint256,
            address,
            uint256,
            uint256,
            uint256
            ));
        require(msg.sender == addresses[_start].pair, "Sender needs to match the uniswap pair");
        IERC20(_token).transfer(msg.sender, _loan);

    }

    // Call "Call Function" Dynamically
    // Separate Execution of Arb
    // Remove Router Addresses


}