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

    address[] public pairs;

    // Token Addresses
    address private DAI; // token0
    address private WETH; // token1

    //Trade Variables
    uint256 private deadline  = block.timestamp + 10 seconds;
    
    constructor(address[] memory _pairs, address _DAI, address _WETH) public {

        require(_pairs.length > 0, "Pairs should be more than one");
        
        DAI = _DAI;
        WETH = _WETH;

        pairs = _pairs;

    }

    function getBalanceOfToken(address _address) public view returns (uint256) {
        return IERC20(_address).balanceOf(address(this));
    }

    function getReserves() public view returns(uint112[] memory, uint112[] memory) {
        
        uint112[] memory reserv0s = new uint112[](pairs.length);
        uint112[] memory reserv1s = new uint112[](pairs.length);

        for(uint i = 0; i < pairs.length; i++) {
            (reserv0s[i], reserv1s[i], ) = IUniswapV2Pair(pairs[i]).getReserves();
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

        require(_start < pairs.length, "Start DEX not present");
        require(_end < pairs.length, "End DEX not present");

        require(_mid > _return, "Require Profitability");

        uint256 amount0Out = _token == DAI ? _loan : 0;
        uint256 amount1Out = _token == WETH ? _loan : 0;

        bytes memory data = abi.encode(

            _start, 
            _end,
            _token,
            _loan,
            _mid,
            _return

        );

        IUniswapV2Pair(pairs[_start]).
            swap(amount0Out, amount1Out, address(this), data);
    
    }

    function performArbitrage(

        bytes memory _data,
        address _source,
        address _root_source

    ) private {

        require(_root_source == address(this), "Source must be this account");

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

        require(_source == pairs[_start],
        "Sender needs to match the uniswap pair");
        
        IERC20(_token).transfer(pairs[_end], _loan);

        uint256 amount0Out = _token == WETH ? _mid : 0;
        uint256 amount1Out = _token == DAI ? _mid : 0;

        IUniswapV2Pair(pairs[_end]).
        swap(amount0Out, amount1Out, address(this), new bytes(0));

        IERC20(_token).transfer(pairs[_start], _return);

    }

    function uniswapV2Call(

        address _sender,
        uint256 _amount0,
        uint256 _amount1,
        bytes calldata _data

    ) external {
   
        performArbitrage(_data, msg.sender, _sender);

    }

    function SakeSwapCall(

        address _sender,
        uint256 _amount0,
        uint256 _amount1,
        bytes calldata _data

    ) external {
   
        performArbitrage(_data, msg.sender, _sender);

    }

    function croDefiSwapCall(

        address _sender,
        uint256 _amount0,
        uint256 _amount1,
        bytes calldata _data

    ) external {
   
        performArbitrage(_data, msg.sender, _sender);

    }


}