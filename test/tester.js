const { expect, assert } = require("chai")
const { ethers} = require('hardhat')
const { impersonateFundErc20 } = require("../utils/utilities")

const { abi } = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20.json")

// import { sim_weth_profit_trade } from "./sim_weth_profit_trade.js"
// import { sim_dai_profit_trade } from "./sim_dai_profit_trade.js"

const { sim_trade } = require("./sim_trade.js")

const shibaswap_abi = require("../external_abis/shibaswap.json")["result"]
const crodefifactory_abi = require("../external_abis/crodefifactory.json")["result"]

const croDefiFactory_address = "0x9DEB29c9a4c7A88a3C0257393b7f3335338D9A9D"

const provider = ethers.provider

const pairs = [
    "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11", // UNISWAP
    "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f", // SUSHISWAP
    "0x8faf958E36c6970497386118030e6297fFf8d275", // SHIBASWAP
    "0x2ad95483ac838E2884563aD278e933fba96Bc242", // SAKESWAP
    "0x60A26d69263eF43e9a68964bA141263F19D71D51" // CRODEFISWAP
]

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

describe("Arbitrage UniswapV2 DAI-WETH", () => {

    let FLASHSWAP, DECIMALS_DAI, DECIMALS_WETH, 
    reserves_dai, reserves_weth, reserves_dai_human, reserves_weth_human
    
    let rates, fees, magnifiers

    let bestPL = 0
    let bestTrade = null

    beforeEach(async () => {

        [owner] = await ethers.getSigners()
        const FlashSwap = await ethers.getContractFactory("UniswapCrossFlash");
        FLASHSWAP = await FlashSwap.deploy(pairs, DAI, WETH)
        await FLASHSWAP.deployed()

        // Obtaining decimals
        const daiContract = new ethers.Contract(DAI, abi, provider)
        const wethContract = new ethers.Contract(WETH, abi, provider)

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

        const _shibaswap = new ethers.Contract(pairs[2], shibaswap_abi, provider)

        const _crodefifactory = new ethers.Contract(croDefiFactory_address, crodefifactory_abi, provider)

        fees = [
            3,
            3,
            Number(await _shibaswap.totalFee()),
            3,
            Number(await _crodefifactory.totalFeeBasisPoint())
        ]

        magnifiers = [
            1000,
            1000,
            1000,
            1000,
            10000
        ]

    })

    it("Evaluate Arbitrage", async () => {
        
        let reserves_res = (await FLASHSWAP.getReserves())
        reserves_dai = reserves_res[0]
        reserves_weth = reserves_res[1]

        reserves_dai_human = reserves_dai.map((v) => ethers.utils.formatUnits(v, DECIMALS_DAI))
        reserves_weth_human = reserves_weth.map((v) => ethers.utils.formatUnits(v, DECIMALS_WETH))
        console.log(reserves_dai_human, reserves_weth_human)

        rates = []
        for (let i = 0; i < pairs.length; i++) {
            rates.push( reserves_dai_human[i] / reserves_weth_human[i] )
            console.log( rates[i] )
        }

        let currWethTrade = null
        let currDaiTrade = null

        let curr_pl

        const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length
        const weth_to_dai_rate = average( rates )

        for (let i = 0; i < (pairs.length - 1); i++) {

            for (let j = i + 1; j < pairs.length; j++) {

                // currWethTrade = sim_weth_profit_trade(rates,i,j,reserves_dai,reserves_weth)
                // currDaiTrade = sim_dai_profit_trade(rates,i,j,reserves_dai,reserves_weth)

                currWethTrade = sim_trade( rates, i, j, reserves_dai, reserves_weth,
                                           true, magnifiers, fees,
                                           ["Token 0: DAI", "Token 1: WETH"]
                                         )

                currDaiTrade = sim_trade( rates, i, j, reserves_dai, reserves_weth,
                                            false, magnifiers, fees,
                                            ["Token 0: DAI", "Token 1: WETH"]
                                          )

                if ( currWethTrade ) {

                    curr_pl = Number(currWethTrade["pl"]) * weth_to_dai_rate

                    if ( curr_pl > bestPL ) {

                        bestPL = curr_pl
                        bestTrade = currWethTrade

                    }

                }

                if ( currDaiTrade ) {

                    curr_pl = Number(currDaiTrade["pl"])

                    if ( curr_pl > bestPL ) {

                        bestPL = curr_pl
                        bestTrade = currDaiTrade

                    }

                }

            }

        }

    })

    it("Testing Trades", async () => {

        if ( bestPL <= 0 ) {

            console.log("No Profitable Trades to Execute")

        } else {

            let currLoanToken, currProfitToken

            console.log("Best Trade")

            if ( bestTrade["loan_token"] == 0 ) {
                currLoanToken = "DAI"
                currProfitToken = "WETH"
            } else {
                currLoanToken = "WETH"
                currProfitToken = "DAI"
            }
            

            console.log("Start Ind", bestTrade["start_ind"], typeof(bestTrade["start_ind"]))
            console.log("End Ind", bestTrade["end_ind"], typeof(bestTrade["end_ind"]))
            console.log("Loan Token", currLoanToken, typeof(currLoanToken))
            console.log("Loan", bestTrade["l"], currLoanToken, typeof(bestTrade["l"]))
            console.log("Mid ", bestTrade["m"], currProfitToken, typeof(bestTrade["m"]))
            console.log("Return", bestTrade["ret"], currProfitToken, typeof(bestTrade["ret"]))
            console.log("Profit of: ", bestTrade["pl"], currProfitToken, typeof(bestTrade["pl"]))

            await FLASHSWAP.startArbitrage(bestTrade["start_ind"], bestTrade["end_ind"], ( ( bestTrade["loan_token"] == 0 ) ? DAI: WETH ),
                                           bestTrade["l"], bestTrade["m"], bestTrade["ret"])

            const dai_balance = await FLASHSWAP.getBalanceOfToken(DAI)
            const dai_balance_human = ethers.utils.formatUnits(dai_balance, DECIMALS_DAI)
            console.log("Final DAI Balance", dai_balance_human)

            const weth_balance = await FLASHSWAP.getBalanceOfToken(WETH)
            const weth_balance_human = ethers.utils.formatUnits(weth_balance, DECIMALS_WETH)
            console.log("Final WETH Balance", weth_balance_human)

        }
        
    })

})

// To Do

// Test Precision in BigInt Computation
// Create a loop of non hardhat ethers.js and verify if live and fork matches
// If it matches then sim until a profitable signal and execute on fork once signal arrives