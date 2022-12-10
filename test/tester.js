const { expect, assert } = require("chai")
const { ethers} = require('hardhat')
const { impersonateFundErc20 } = require("../utils/utilities")

const { abi } = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20.json")

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

const TOKEN_0 = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const TOKEN_1 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

const names = ["DAI", "WETH"]

describe("Arbitrage UniswapV2", () => {

    let FLASHSWAP, DECIMALS_TOKEN_0, DECIMALS_TOKEN_1,
    reserves_token_0, reserves_token_1, reserves_token_0_human, reserves_token_1_human
    
    let rates, fees, magnifiers

    let bestPL = 0
    let bestTrade = null

    beforeEach(async () => {

        [owner] = await ethers.getSigners()
        const FlashSwap = await ethers.getContractFactory("UniswapCrossFlash")

        FLASHSWAP = await FlashSwap.deploy(pairs, TOKEN_0, TOKEN_1)

        await FLASHSWAP.deployed()

        // Obtaining decimals

        const token_0_contract = new ethers.Contract(TOKEN_0, abi, provider)
        const token_1_contract = new ethers.Contract(TOKEN_1, abi, provider)

        DECIMALS_TOKEN_0 = (await token_0_contract.decimals())
        DECIMALS_TOKEN_1 = (await token_1_contract.decimals())

        const token_0_whale = "0xf977814e90da44bfa03b6295a0616a897441acec"
        const token_0_borrow_amount_human = "10000"
        
        // Fund our contract - FOR TESTING ONLY

        await impersonateFundErc20(
            token_0_contract,
            token_0_whale,
            FLASHSWAP.address,
            token_0_borrow_amount_human,
            DECIMALS_TOKEN_0
        )

        const token_0_balance = await FLASHSWAP.getBalanceOfToken(TOKEN_0)
        const token_0_balance_human = ethers.utils.formatUnits(token_0_balance, DECIMALS_TOKEN_0)
        console.log(`Initial Funded Token 0 ${names[0]} Balance`, token_0_balance_human)
        expect(Number(token_0_balance_human)).equal(Number(token_0_borrow_amount_human))

        const token_1_whale = "0x06920c9fc643de77b99cb7670a944ad31eaaa260"
        const token_1_borrow_amount_human = "10"

        await impersonateFundErc20(
            token_1_contract,
            token_1_whale,
            FLASHSWAP.address,
            token_1_borrow_amount_human,
            DECIMALS_TOKEN_1
        )

        const token_1_balance = await FLASHSWAP.getBalanceOfToken(TOKEN_1)
        const token_1_balance_human = ethers.utils.formatUnits(token_1_balance, DECIMALS_TOKEN_1)
        console.log(`Initial Funded Token 1 ${names[1]} Balance`, token_1_balance_human)
        expect(Number(token_1_balance_human)).equal(Number(token_1_borrow_amount_human))

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

        reserves_token_0 = reserves_res[0]
        reserves_token_1 = reserves_res[1]

        reserves_token_0_human = reserves_token_0.map((v) => ethers.utils.formatUnits(v, DECIMALS_TOKEN_0))
        reserves_token_1_human = reserves_token_1.map((v) => ethers.utils.formatUnits(v, DECIMALS_TOKEN_1))
        console.log(reserves_token_0_human, reserves_token_1_human)

        rates = []
        for (let i = 0; i < pairs.length; i++) {

            rates.push( reserves_token_0_human[i] / reserves_token_1_human[i] )

            console.log( rates[i] )

        }

        let curr_token_1_trade = null
        let curr_token_0_trade = null

        let curr_pl

        const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length

        const token_1_to_token_0_rate = average( rates )

        const sim_names = [`Token 0: ${names[0]}`, `Token 1: ${names[1]}`]

        for (let i = 0; i < (pairs.length - 1); i++) {

            for (let j = i + 1; j < pairs.length; j++) {

                curr_token_1_trade = sim_trade( rates, i, j, reserves_token_0, reserves_token_1, true, magnifiers, fees, sim_names)

                curr_token_0_trade = sim_trade( rates, i, j, reserves_token_0, reserves_token_1, false, magnifiers, fees, sim_names)

                if ( curr_token_1_trade ) {

                    curr_pl = Number(curr_token_1_trade["pl"]) * token_1_to_token_0_rate

                    if ( curr_pl > bestPL ) {

                        bestPL = curr_pl
                        bestTrade = curr_token_1_trade

                    }

                }

                if ( curr_token_0_trade ) {

                    curr_pl = Number(curr_token_0_trade["pl"])

                    if ( curr_pl > bestPL ) {

                        bestPL = curr_pl
                        bestTrade = curr_token_0_trade

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

                currLoanToken = names[0]
                currProfitToken = names[1]

            } else {

                currLoanToken = names[1]
                currProfitToken = names[0]
                
            }
            

            console.log("Start Ind", bestTrade["start_ind"])
            console.log("End Ind", bestTrade["end_ind"])
            console.log("Loan Token", currLoanToken)
            console.log("Loan", bestTrade["l"], currLoanToken)
            console.log("Mid ", bestTrade["m"], currProfitToken)
            console.log("Return", bestTrade["ret"], currProfitToken)
            console.log("Profit of: ", bestTrade["pl"], currProfitToken)

            await FLASHSWAP.startArbitrage(bestTrade["start_ind"], bestTrade["end_ind"], ( ( bestTrade["loan_token"] == 0 ) ? TOKEN_0: TOKEN_1 ),
                                           bestTrade["l"], bestTrade["m"], bestTrade["ret"])

            const token_0_balance = await FLASHSWAP.getBalanceOfToken(TOKEN_0)
            const token_0_balance_human = ethers.utils.formatUnits(token_0_balance, DECIMALS_TOKEN_0)
            console.log(`Final Token 0 ${names[0]} Balance`, token_0_balance_human)

            const token_1_balance = await FLASHSWAP.getBalanceOfToken(TOKEN_1)
            const token_1_balance_human = ethers.utils.formatUnits(token_1_balance, DECIMALS_TOKEN_1)
            console.log(`Final Token 1 ${names[1]} Balance`, token_1_balance_human)

        }
        
    })

})

// To Do

// Create a loop of non hardhat ethers.js and verify if live and fork matches
// If it matches then sim until a profitable signal and execute on fork once signal arrives