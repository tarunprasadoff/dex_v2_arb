const { expect, assert } = require("chai")
const { ethers} = require('hardhat')
const { impersonateFundErc20 } = require("../utils/utilities")

const { abi } = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20.json")

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
    reserves_dai, reserves_weth, reserves_dai_human, reserves_weth_human, rates

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
            (Number(await _crodefifactory.totalFeeBasisPoint()) / 10)
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
            rates.push(reserves_dai_human[i]/reserves_weth_human[i])
            console.log(rates[i])
        }

        let currWethTrade = null
        let currDaiTrade = null

        const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length
        const weth_to_dai_rate = average( rates )

        for (let i = 0; i < (pairs.length - 1); i++) {

            for (let j = i + 1; j < pairs.length; j++) {

                currWethTrade = sim_weth_profit_trade(rates,i,j,reserves_dai,reserves_weth)
                currDaiTrade = sim_dai_profit_trade(rates,i,j,reserves_dai,reserves_weth)

                if ( currWethTrade ) {

                    if ( ( currWethTrade["pl"] * weth_to_dai_rate ) > bestPL ) {

                        bestPL = currWethTrade["pl"] * weth_to_dai_rate
                        bestTrade = currWethTrade

                    }

                }

                if ( currDaiTrade ) {

                    if ( currDaiTrade["pl"] > bestPL ) {

                        bestPL = currDaiTrade["pl"]
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

            {
                "start_ind",
                "end_ind",
                "l",
                "m",
                "ret",
                "pl",
                "token"
            }

            await FLASHSWAP.startArbitrage(bestTrade["start_ind"], bestTrade["end_ind"], bestTrade["token"],
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

function sim_weth_profit_trade(rates, i, j, reserves_dai, reserves_weth) {

    let start_ind, end_ind, weth_Fs, weth_sols, weth_pls, weth_pl_sim_curr,
    weth_pl_sim, weth_pls_max_ind, weth_sol, weth_m_weths, weth_ret_weths

    if ( rates[i] > rates[j] ) {

        start_ind = i
        end_ind = j

    } else if ( rates[i] < rates[j] ) {

        start_ind = j
        end_ind = i

    } else {
        
        return null

    }

    console.log("WETH Simulation", start_ind, end_ind)

    const a_sim = Number(reserves_weth[end_ind])

    const b_sim = Number(reserves_dai[end_ind]) * Number(reserves_weth[end_ind]) * 1000

    const c_sim = Number(reserves_dai[end_ind]) * 1000

    const d_sim = Number(reserves_dai[start_ind]) * 997

    const e_sim = ( Number(reserves_weth[start_ind]) * 1000 ) / 997

    const N_1 = ( e_sim ** 0.5 ) * 
          ((
            ( b_sim * d_sim * ( c_sim ** 2 ) ) +
            ( 2 * b_sim * c_sim * ( d_sim ** 2 ) ) +
            ( b_sim * ( d_sim ** 3 ) )
            ) ** 0.5)

    const N_2 = ( b_sim * d_sim ) + ( e_sim * c_sim * d_sim )

    const D_1 = ( b_sim * d_sim ) - ( e_sim * ( d_sim ** 2) )

    weth_Fs = [ ( ( N_2 - N_1 ) / D_1 ) , ( ( N_2 + N_1 ) / D_1 )]
    weth_sols = []
    weth_pls = []
    weth_m_weths = []
    weth_ret_weths = []

    for (let weth_F of weth_Fs) {

        if ( ( weth_F > 0 ) && ( weth_F < 1 ) ) {

            m_weth_sim = a_sim - ( b_sim / ( c_sim + d_sim * weth_F ) )
            ret_weth_sim = e_sim * ( weth_F / ( 1 - weth_F ) )

            weth_pl_sim_curr = m_weth_sim - ret_weth_sim
            
            if (weth_pl_sim_curr > 0) {

                weth_sols.push(weth_F)
                weth_pls.push(weth_pl_sim_curr)
                weth_m_weths.push(m_weth_sim)
                weth_ret_weths.push(ret_weth_sim)

            }

        }

    }
    
    if ( weth_pls.length > 0 ) {

        weth_pl_sim = Math.max(...weth_pls)
        weth_pls_max_ind = weth_pls.indexOf(weth_pl_sim)
        weth_sol = weth_sols[weth_pls_max_ind]
        console.log("Weth Profit Trade Sim")

        console.log("Start DAI", Number(reserves_dai[start_ind]))
        console.log("Fraction: ", weth_sol)
        console.log("Loan DAI", weth_sol*Number(reserves_dai[start_ind]))

        console.log("Mid WETH", weth_m_weths[weth_pls_max_ind] )
        console.log("Ret WETH", weth_ret_weths[weth_pls_max_ind] )
        console.log("Profit: ", weth_pl_sim )

        return {
            "start_ind": start_ind,
            "end_ind": end_ind,
            "l": weth_sol*Number(reserves_dai[start_ind]),
            "m": weth_m_weths[weth_pls_max_ind],
            "ret": weth_ret_weths[weth_pls_max_ind],
            "pl": weth_pl_sim,
            "token": DAI
        }

    } else {

        console.log("No Profitable WETH Trades according to Sim")

        return null

    }

}

function sim_dai_profit_trade(rates, i, j, reserves_dai, reserves_weth) {

    let start_ind, end_ind, dai_Fs, dai_sols, dai_pls, dai_pl_sim_curr,
        dai_pl_sim, dai_pls_max_ind, dai_sol, dai_m_dais, dai_ret_dais

    if ( rates[i] > rates[j] ) { 

        start_ind = j
        end_ind = i

    } else if ( rates[i] < rates[j] ) {

        start_ind = i
        end_ind = j

    } else {

        return null

    }

    console.log("WETH Simulation", start_ind, end_ind)

    const a_sim = Number(reserves_dai[end_ind])

    const b_sim = Number(reserves_dai[end_ind]) * Number(reserves_weth[end_ind]) * 1000

    const c_sim = 1000 * Number(reserves_weth[end_ind])

    const d_sim = 997 * Number(reserves_weth[start_ind])

    const e_sim = Number(reserves_dai[start_ind]) * ( 1000 / 997 )

    const N_1 = ( e_sim ** 0.5 ) * 
          ((
            ( b_sim * d_sim * ( c_sim ** 2 ) ) +
            ( 2 * b_sim * c_sim * ( d_sim ** 2 ) ) +
            ( b_sim * ( d_sim ** 3 ) )
            ) ** 0.5)

    const N_2 = ( b_sim * d_sim ) + ( e_sim * c_sim * d_sim )

    const D_1 = ( b_sim * d_sim ) - ( e_sim * ( d_sim ** 2) )

    dai_Fs = [ ( ( N_2 - N_1 ) / D_1 ) , ( ( N_2 + N_1 ) / D_1 )]
    dai_sols = []
    dai_pls = []
    dai_m_dais = []
    dai_ret_dais = []

    for (let dai_F of dai_Fs) {

        if ( ( dai_F > 0 ) && ( dai_F < 1 ) ) {

            m_dai_sim = a_sim - ( b_sim / ( c_sim + d_sim * dai_F ) )
            ret_dai_sim = e_sim * ( dai_F / ( 1 - dai_F ) )

            dai_pl_sim_curr = m_dai_sim - ret_dai_sim
            
            if (dai_pl_sim_curr > 0) {

                dai_sols.push(dai_F)
                dai_pls.push(dai_pl_sim_curr)
                dai_m_dais.push(m_dai_sim)
                dai_ret_dais.push(ret_dai_sim)

            }

        }

    }
    
    if ( dai_pls.length > 0 ) {

        dai_pl_sim = Math.max(...dai_pls)
        dai_pls_max_ind = dai_pls.indexOf(dai_pl_sim)
        dai_sol = dai_sols[dai_pls_max_ind]
        console.log("Dai Profit Trade Sim")

        console.log("Start WETH", Number(reserves_weth[start_ind]))
        console.log("Fraction: ", dai_sol)
        console.log("Loan WETH", dai_sol*Number(reserves_weth[start_ind]))        
        
        console.log("Mid DAI", dai_m_dais[dai_pls_max_ind])
        console.log("Ret DAI", dai_ret_dais[dai_pls_max_ind])
        console.log("Profit: ", dai_pl_sim)

        return {
            "start_ind": start_ind,
            "end_ind": end_ind,
            "l": dai_sol*Number(reserves_weth[start_ind]),
            "m": dai_m_dais[dai_pls_max_ind],
            "ret": dai_ret_dais[dai_pls_max_ind],
            "pl": dai_pl_sim,
            "token": WETH
        }

    } else {

        console.log("No Profitable DAI Trades according to Sim")

        return null

    }

}

// To Do

// Combine the two sims to single function
// Create a loop of non hardhat ethers.js and verify if live and fork matches
// If it matches then sim until a profitable signal and execute on fork once signal arrives
// Feed fees and magnifier dynamically