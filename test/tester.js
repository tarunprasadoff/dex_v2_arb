const { expect, assert } = require("chai")
const { ethers} = require('hardhat')
const { impersonateFundErc20 } = require("../utils/utilities")

const { abi } = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20.json")
const shibaswap_abi = require("../external_abis/shibaswap.json")["result"]
const crodefifactory_abi = require("../external_abis/crodefifactory.json")["result"]

const provider = ethers.provider

const pairs = [
    "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11", // UNISWAP
    "0xC3D03e4F041Fd4cD388c549Ee2A29a9E5075882f", // SUSHISWAP
    "0x8faf958E36c6970497386118030e6297fFf8d275", // SHIBASWAP
    "0x2ad95483ac838E2884563aD278e933fba96Bc242", // SAKESWAP
    "0x60A26d69263eF43e9a68964bA141263F19D71D51" // CRODEFISWAP
]

const croDefiFactory_address = "0x9DEB29c9a4c7A88a3C0257393b7f3335338D9A9D"

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

describe("Arbitrage UniswapV2 DAI-WETH", () => {

    let FLASHSWAP, DECIMALS_DAI, DECIMALS_WETH, 
    reserves_dai, reserves_weth, reserves_dai_human, reserves_weth_human, fees, rates,
    bestTrade_start, bestTrade_end, bestTrade_l, bestTrade_m, bestTrade_ret, bestTrade_pl
    let bestTradeType = []
    let bestTradeInd = []

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

        let dai_start = []
        let dai_end = []
        let dai_l_weth = []
        let dai_m_dai = []
        let dai_ret_dai = []
        let dai_pl_dai = []
        let dai_start_r_dai = []
        let dai_start_r_weth = []
        let dai_end_r_dai = []
        let dai_end_r_weth = []

        let weth_start = []
        let weth_end = []
        let weth_l_dai = []
        let weth_m_weth = []
        let weth_ret_weth = []
        let weth_pl_weth = []
        let weth_start_r_dai = []
        let weth_start_r_weth = []
        let weth_end_r_dai = []
        let weth_end_r_weth = []

        for (let i = 0; i < (pairs.length - 1); i++) {

            // console.log("I: ", i)

            for (let j = i + 1; j < pairs.length; j++) {

                // console.log("J: ", j)

                for (let step = 1; step < 10; step++) {

                    let l_dai, l_weth, k_start, k_end, m_dai, m_weth, ret_dai, ret_weth, pl_dai, pl_weth
            
                    f = step / 10

                    // console.log("F: ", f)

                    if ( rates[i] > rates[j] ) {
                        start_ind = i
                        end_ind = j
                    } else if ( rates[i] < rates[j] ) {
                        start_ind = j
                        end_ind = i
                    } else {
                        break
                    }

                    // console.log("Starting with DAI")

                    l_dai = Number(f*Number(reserves_dai[start_ind]))

                    k_end = Number(reserves_dai[end_ind]) * Number(reserves_weth[end_ind]) * (1000**2)

                    m_weth = Number(reserves_weth[end_ind]) - ( k_end / ( 1000 * ( ( Number(reserves_dai[end_ind]) * 1000 ) + ( l_dai * 997 ) ) ) )

                    k_start = Number(reserves_dai[start_ind]) * Number(reserves_weth[start_ind]) * (1000**2)

                    ret_weth = ( ( ( k_start / ( 1000 * ( Number(reserves_dai[start_ind]) - l_dai ) ) ) - ( Number(reserves_weth[start_ind]) * 1000 ) ) / 997 )

                    pl_weth = m_weth - ret_weth

                    if ( pl_weth > 0 ) {
                        weth_start.push(start_ind)
                        weth_end.push(end_ind)
                        weth_l_dai.push(l_dai)
                        weth_m_weth.push(m_weth)
                        weth_ret_weth.push(ret_weth)
                        weth_pl_weth.push(pl_weth)
                        weth_start_r_dai.push(Number(reserves_dai[start_ind]))
                        weth_start_r_weth.push(Number(reserves_weth[start_ind]))
                        weth_end_r_dai.push(Number(reserves_dai[end_ind]))
                        weth_end_r_weth.push(Number(reserves_weth[end_ind]))
                    }

                    // console.log("Starting with WETH")

                    if ( rates[i] > rates[j] ) {
                        start_ind = j
                        end_ind = i
                    } else if ( rates[i] < rates[j] ) {
                        start_ind = i
                        end_ind = j
                    } else {
                        break
                    }

                    l_weth = Number(f*Number(reserves_weth[start_ind]))

                    k_end = Number(reserves_dai[end_ind]) * Number(reserves_weth[end_ind]) * (1000**2)

                    m_dai = Number(reserves_dai[end_ind]) - ( k_end / ( 1000 * ( ( Number(reserves_weth[end_ind]) * 1000 ) + ( l_weth * 997 ) ) ) )

                    k_start = Number(reserves_dai[start_ind]) * Number(reserves_weth[start_ind]) * (1000**2)

                    ret_dai = ( ( ( k_start / ( 1000 * ( Number(reserves_weth[start_ind]) - l_weth ) ) ) - ( Number(reserves_dai[start_ind]) * 1000 ) ) / 997 )

                    pl_dai = m_dai - ret_dai

                    if ( pl_dai > 0 ) {
                        dai_start.push(start_ind)
                        dai_end.push(end_ind)
                        dai_l_weth.push(l_weth)
                        dai_m_dai.push(m_dai)
                        dai_ret_dai.push(ret_dai)
                        dai_pl_dai.push(pl_dai)
                        dai_start_r_dai.push(Number(reserves_dai[start_ind]))
                        dai_start_r_weth.push(Number(reserves_weth[start_ind]))
                        dai_end_r_dai.push(Number(reserves_dai[end_ind]))
                        dai_end_r_weth.push(Number(reserves_weth[end_ind]))
                    }

                }

            }

        }

        // console.log("dai trade count", daiTrades.length)
        // console.log("weth trade count", wethTrades.length)

        let bestDaiPL = 0
        let bestWethPL = 0

        let dmin, wmin

        const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length
        const weth_to_dai_rate = average( rates )

        if (dai_start.length > 0) {
            for (let dind = 0; dind < dai_start.length; dind++) {
                if (dind == 0) {
                    bestDaiPL = dai_pl_dai[dind]
                    dmin = 0
                } else {
                    if (dai_pl_dai[dind] < bestDaiPL) {
                        bestDaiPL = dai_pl_dai[dind]
                        dmin = dind
                    }
                }
            }

            console.log("Most Profitable WETH Flash Loan Origin Trade")
            console.log("Start Dex Ind", dai_start[dmin])
            console.log("End Dex Ind", dai_end[dmin])
            console.log("Loan in WETH: ", dai_l_weth[dmin])
            console.log("Mid in DAI: ", dai_m_dai[dmin])
            console.log("Return in DAI: ", dai_ret_dai[dmin])
            console.log("PL in DAI: ", dai_pl_dai[dmin])
            console.log("Start Reserve DAI: ", dai_start_r_dai[dmin])
            console.log("Start Reserve WETH: ", dai_start_r_weth[dmin])
            console.log("End Reserve DAI: ", dai_end_r_dai[dmin])
            console.log("End Reserve WETH: ", dai_end_r_weth[dmin])

            bestTradeType = [WETH]
            bestTradeInd = dmin
            bestTrade_start = dai_start[dmin]
            bestTrade_end = dai_end[dmin]
            bestTrade_l = dai_l_weth[dmin]
            bestTrade_m = dai_m_dai[dmin]
            bestTrade_ret = dai_ret_dai[dmin]
            bestTrade_pl = dai_pl_dai[dmin]

        } else {
            console.log("No Net Profitable WETH Flash Loan Origin Trades")
        }

        if (weth_start.length > 0) {
            for (let wind = 0; wind < weth_start.length; wind++) {
                if (wind == 0) {
                    bestWethPL = weth_pl_weth[wind]
                    wmin = 0
                } else {
                    if (weth_pl_weth[wind] < bestWethPL) {
                        bestWethPL = weth_pl_weth[wind]
                        wmin = wind
                    }
                }
            }

            console.log("Most Profitable DAI Flash Loan Origin Trade")
            console.log("Start Dex Ind", weth_start[wmin])
            console.log("End Dex Ind", weth_end[wmin])
            console.log("Loan in DAI: ", weth_l_dai[wmin])
            console.log("Mid in WETH: ", weth_m_weth[wmin])
            console.log("Return in WETH: ", weth_ret_weth[wmin])
            console.log("PL in WETH: ", weth_pl_weth[wmin])
            console.log("Start Reserve DAI: ", weth_start_r_dai[wmin])
            console.log("Start Reserve WETH: ", weth_start_r_weth[wmin])
            console.log("End Reserve DAI: ", weth_end_r_dai[wmin])
            console.log("End Reserve WETH: ", weth_end_r_weth[wmin])

            if (bestTradeType.length == 0) {
                bestTradeType = [DAI]
                bestTradeInd = wmin
                bestTrade_start = weth_start[wmin]
                bestTrade_end = weth_end[wmin]
                bestTrade_l = weth_l_dai[wmin]
                bestTrade_m = weth_m_weth[wmin]
                bestTrade_ret = weth_ret_weth[wmin]
                bestTrade_pl = weth_pl_weth[wmin]
            } else {
                if ((bestWethPL * weth_to_dai_rate) > bestDaiPL) {
                    bestTradeType = [DAI]
                    bestTradeInd = wmin
                    bestTrade_start = weth_start[wmin]
                    bestTrade_end = weth_end[wmin]
                    bestTrade_l = weth_l_dai[wmin]
                    bestTrade_m = weth_m_weth[wmin]
                    bestTrade_ret = weth_ret_weth[wmin]
                    bestTrade_pl = weth_pl_weth[wmin]
                }
            }

        } else {
            console.log("No Net Profitable DAI Flash Loan Origin Trades")
        }

    })

    it("Testing Trades", async () => {

        if (bestTradeType.length > 0){

            await FLASHSWAP.startArbitrage(bestTrade_start, bestTrade_end, bestTradeType[0],
                                           bestTrade_l, bestTrade_m, bestTrade_ret)

            const dai_balance = await FLASHSWAP.getBalanceOfToken(DAI)
            const dai_balance_human = ethers.utils.formatUnits(dai_balance, DECIMALS_DAI)
            console.log("Final DAI Balance", dai_balance_human)

            const weth_balance = await FLASHSWAP.getBalanceOfToken(WETH)
            const weth_balance_human = ethers.utils.formatUnits(weth_balance, DECIMALS_WETH)
            console.log("Final WETH Balance", weth_balance_human)

        } else {
            console.log("No Profitable Trades to Execute")
        }
        
    })

})