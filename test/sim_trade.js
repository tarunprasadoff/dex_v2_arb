const { get_inds } = require("./get_inds.js")
const { get_token_1_Fs, get_token_0_Fs } = require("./get_token_Fs.js")
const { get_m_sim } = require("./get_m_sim.js")
const { get_ret_sim } = require("./get_ret_sim.js")

function sim_trade(rates, i, j, reserves_0, reserves_1, isLoanToken0, magnifiers, fees, names) {
    
    let a_sim, b_sim, c_sim, d_sim, e_sim
       
    let start_ind, end_ind, Fs, pl_sim_curr
    let final_sol, final_l, final_m, final_ret
    
    let l_temps, l, m_sim, ret_sim

    let l_type

    let pl_sim = BigInt(0)

    // console.log("I", i, "J", j)

    let inds = get_inds(rates, i, j, isLoanToken0)
    start_ind = inds[0]
    end_ind = inds[1]

    // console.log("start_ind", start_ind, "end_ind", end_ind)

    if (start_ind == -1) {
        // console.log(`Rates Equal - Start: ${i}, End: ${j}, Profit Token: ${ isLoanToken0 ? names[1] : names[0] }`)
        return null
    }

    [Fs, a_sim, b_sim, c_sim, d_sim, e_sim] = isLoanToken0 ? 
        get_token_1_Fs(reserves_0, reserves_1, start_ind, end_ind, magnifiers, fees, names[1]) : 
        get_token_0_Fs(reserves_0, reserves_1, start_ind, end_ind, magnifiers, fees, names[0])

    for ( let f of Fs ) {

        if ( ( f > 0 ) && ( f < 1 ) ) {

            if (isLoanToken0) {

                // console.log(names[1], "f", f)

                // console.log(names[0], "reserves_0[start_ind]", reserves_0[start_ind])

                l = f * Number(reserves_0[start_ind])

                // console.log(names[1], "Pre-ceil 1_l_0", l, names[0])

            } else {

                // console.log(names[0], "f", f)

                // console.log(names[1], "reserves_1[start_ind]", reserves_1[start_ind])

                l = f * Number(reserves_1[start_ind])

                // console.log(names[0], "Pre-ceil 0_l_1", l, names[1])

            }

            if ( l == Math.ceil(l) ) {

                l_temps = [BigInt(l)]
                l_type = "Single L"

            } else {

                l_temps = [ BigInt(Math.floor(l)), BigInt(Math.ceil(l))]
                l_type = "Double L"

            }

            m_sim = BigInt(a_sim) - BigInt( Math.ceil( b_sim / ( c_sim + d_sim * f ) ) )
            ret_sim = BigInt( Math.ceil( e_sim * ( f / ( 1 - f ) ) ) )

            pl_sim_curr = m_sim - ret_sim

            if (pl_sim_curr > 0) {

                for ( let l of l_temps ) {

                    // console.log(l_type, isLoanToken0 ? ( names[1] + "1_l_0" + names[0] ) : ( names[0] + "0_l_1" + names[1] ), l)
    
                    m_sim = get_m_sim(reserves_0, reserves_1, l, end_ind, magnifiers, fees, isLoanToken0, names)
        
                    ret_sim = get_ret_sim(reserves_0, reserves_1, l, start_ind, magnifiers, fees, isLoanToken0, names)

                    pl_sim_curr = m_sim - ret_sim
    
                    if (pl_sim_curr > 0) {

                        // console.log("Profit Type Precision Checking Log for", l_type)
                        // console.log(`${isLoanToken0 ? names[1] : names[0]} pl_sim_curr`, pl_sim_curr)
                        // console.log(`${isLoanToken0 ? names[1] : names[0]} l`, l)
                        // console.log(`${isLoanToken0 ? names[1] : names[0]} m`, m_sim)
                        // console.log(`${isLoanToken0 ? names[1] : names[0]} ret`, ret_sim)
        
                        if ( pl_sim_curr > pl_sim ) {
        
                            pl_sim = pl_sim_curr
                            final_sol = f
                            final_l = l
                            final_m = m_sim
                            final_ret = ret_sim
        
                        }
        
                    }
    
                }

            } else {

                continue

            }

        }
    }

    if ( pl_sim > 0 ) {

        let loan_token, loan_token_reserve, return_token

        console.log("\n")

        if ( isLoanToken0 ) {

            console.log(names[1], "Profit Trade Sim")
            loan_token = names[0]
            loan_token_reserve = reserves_0[start_ind]
            return_token = names[1]

        } else {

            console.log(names[0], "Profit Trade Sim")
            loan_token = names[1]
            loan_token_reserve = reserves_1[start_ind]
            return_token = names[0]

        }

        console.log("Start Ind", start_ind)
        console.log("Reserves: ", names[0], reserves_0[start_ind], names[1], reserves_1[start_ind])
        console.log("End Ind", end_ind)
        console.log("Reserves: ", names[0], reserves_0[end_ind], names[1], reserves_1[end_ind])
        
        console.log("Start", loan_token, loan_token_reserve)
        console.log("Fraction", final_sol)
        console.log("Loan", loan_token, final_l)

        console.log("Mid", return_token, final_m)
        console.log("Ret", return_token, final_ret)
        console.log("Profit: ", pl_sim, "\n")

        return {
            "start_ind": start_ind,
            "end_ind": end_ind,
            "l": final_l.toString(),
            "m": final_m.toString(),
            "ret": final_ret.toString(),
            "pl": pl_sim,
            "loan_token": (isLoanToken0 ? 0 : 1)
        }

    } else {

        console.log(`No Profitable ${ isLoanToken0 ? names[1] : names[0] } Trades according to Sim \n`)

        return null

    }

}

module.exports = { sim_trade }