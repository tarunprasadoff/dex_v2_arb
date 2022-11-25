const { expect, assert } = require("chai")
const { ethers} = require('hardhat')
const { impersonateFundErc20 } = require("../utils/utilities")

const { abi } = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20.json")

const provider = ethers.provider

const pairs = [
    "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11", // UNISWAP
    "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f", // SUSHISWAP
    "0x8faf958E36c6970497386118030e6297fFf8d275", // SHIBASWAP
    "0x2ad95483ac838E2884563aD278e933fba96Bc242" // SAKESWAP
    // "0x60A26d69263eF43e9a68964bA141263F19D71D51" // CRODEFISWAP
]

const routers = [
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // UNISWAP
    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", // SUSHISWAP
    "0x03f7724180AA6b939894B5Ca4314783B0b36b329", // SHIBASWAP
    "0x9C578b573EdE001b95d51a55A3FAfb45f5608b1f", // SAKESWAP
    // "" // CRODEFISWAP
]

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

describe("Arbitrage UniswapV2 DAI-WETH", () => {

    let FLASHSWAP, DECIMALS_DAI, DECIMALS_WETH, 
    reserves_dai, reserves_weth, reserves_dai_human, reserves_weth_human

    beforeEach(async () => {

        [owner] = await ethers.getSigners()
        const FlashSwap = await ethers.getContractFactory("UniswapCrossFlash");
        FLASHSWAP = await FlashSwap.deploy(pairs, routers, DAI, WETH)

        await FLASHSWAP.deployed()
        expect(Object.keys((await FLASHSWAP.getAddresses())[0]).length).not.equal(0)

        // Obtaining decimals
        const daiContract = new ethers.Contract(DAI, abi, provider);
        const wethContract = new ethers.Contract(WETH, abi, provider);

        DECIMALS_DAI = (await daiContract.decimals())
        DECIMALS_WETH = (await wethContract.decimals())

        const dai_whale = "0xf977814e90da44bfa03b6295a0616a897441acec"
        const dai_borrow_amount_human = "10000"
        
        // Fund our contract - FOR TESTING ONLY
        await impersonateFundErc20(
            daiContract,
            dai_whale,
            FLASHSWAP.address,
            dai_borrow_amount_human,
            DECIMALS_DAI
        )

        const dai_balance = await FLASHSWAP.getBalanceOfToken(DAI)
        const dai_balance_human = ethers.utils.formatUnits(dai_balance, DECIMALS_DAI)
        console.log("Initial Funded DAI Balance", dai_balance_human)
        expect(Number(dai_balance_human)).equal(Number(dai_borrow_amount_human))

        const weth_whale = "0x06920c9fc643de77b99cb7670a944ad31eaaa260"
        const weth_borrow_amount_human = "10"
        
        // Fund our contract - FOR TESTING ONLY
        await impersonateFundErc20(
            wethContract,
            weth_whale,
            FLASHSWAP.address,
            weth_borrow_amount_human,
            DECIMALS_WETH
        )

        const weth_balance = await FLASHSWAP.getBalanceOfToken(WETH)
        const weth_balance_human = ethers.utils.formatUnits(weth_balance, DECIMALS_WETH)
        console.log("Initial Funded WETH Balance", weth_balance_human)
        expect(Number(weth_balance_human)).equal(Number(weth_borrow_amount_human))

    })

    it("Evaluate Arbitrage", async () => {
        
        let reserves_res = (await FLASHSWAP.getReserves())
        reserves_dai = reserves_res[0]
        reserves_weth = reserves_res[1]

        reserves_dai_human = reserves_dai.map((v) => ethers.utils.formatUnits(v, DECIMALS_DAI))
        reserves_weth_human = reserves_weth.map((v) => ethers.utils.formatUnits(v, DECIMALS_WETH))
        console.log(reserves_dai_human, reserves_weth_human)

        for (let i = 0; i < pairs.length; i++) {
            console.log(reserves_dai_human[i]/reserves_weth_human[i]);
          }
    })

    // it("Testing Trades", async () => {
    //     await FLASHSWAP.performArbitrage(DAI, 20)

    //     const dai_balance = await FLASHSWAP.getBalanceOfToken(DAI)
    //     const dai_balance_human = ethers.utils.formatUnits(dai_balance, DECIMALS_DAI)
    //     console.log("Final DAI Balance", dai_balance_human)

    //     const weth_balance = await FLASHSWAP.getBalanceOfToken(WETH)
    //     const weth_balance_human = ethers.utils.formatUnits(weth_balance, DECIMALS_WETH)
    //     console.log("Final WETH Balance", weth_balance_human)
    // })

})