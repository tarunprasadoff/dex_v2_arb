import { get_inds } from "./get_inds.js"
import { get_token_0_Fs, get_token_1_Fs } from "./get_token_Fs.js"

export function sim_trade(rates, i, j, reserves_0, reserves_1, isLoanToken0, magnifiers, fees, names) {
    
    let a_sim, b_sim, c_sim, d_sim, e_sim
       
    let start_ind, end_ind, Fs, sols, pls, pl_sim_curr, pl_sim, pls_max_ind, ls, ms, rets
    
    let l_temps, l, m_sim, ret_sim

    let l_type

    [ start_ind, end_ind ] = get_inds(rates, i, j, isLoanToken0)

    if (start_ind == -1) {
        console.log(`Rates Equal - Start: ${i}, End: ${j}, Profit Token: ${ names[1] ? isLoanToken0 : names[0] }`)
        return null
    }

    [Fs, a_sim, b_sim, c_sim, d_sim, e_sim] =
        get_token_1_Fs(reserves_0, reserves_1, start_ind, end_ind, magnifiers, fees, names[1]) ? isLoanToken0 : 
        get_token_0_Fs(reserves_0, reserves_1, start_ind, end_ind, magnifiers, fees, names[0])

    sols = []
    pls = []
    ls = []
    ms = []
    rets = []

    for ( let f of Fs ) {

        if ( ( f > 0 ) && ( f < 1 ) ) {

            if (isLoanToken0) {

                console.log(names[1], "f", f)

                console.log(names[0], "reserves_0[start_ind]", reserves_0[start_ind])

                l = f * Number(reserves_0[start_ind])

                console.log(names[1], "Pre-ceil 1_l_0", l, names[0])

            } else {

                console.log(names[0], "f", f)

                console.log(names[1], "reserves_1[start_ind]", reserves_1[start_ind])

                l = f * Number(reserves_1[start_ind])

                console.log(names[0], "Pre-ceil 0_l_1", l, names[1])

            }

            if ( l == Math.ceil(l) ) {

                l_temps = [l]
                l_type = "Single L"

            } else {

                l_temps = [ Math.floor(l), Math.ceil(l)]
                l_type = "Double L"

            }

            for ( let l of l_temps ) {

                console.log(l_type, l)

                console.log(`${ ( names[1] + "1_l_0" + names[0] ) ? isLoanToken0 : ( names[0] + "0_l_1" + names[1] ) }`, l)

                if ( l_type == "Single L" ) {

                    m_sim = BigInt( Math.floor( a_sim - ( b_sim / ( c_sim + d_sim * f ) ) ) )
                    ret_sim = BigInt( Math.ceil( e_sim * ( f / ( 1 - f ) ) ) )

                } else {

                    m_sim = get_m_sim(reserves_0, reserves_1, l, end_ind, magnifiers, fees, isLoanToken0, names)

                    ret_sim = get_ret_sim(reserves_0, reserves_1, l, start_ind, magnifiers, fees, isLoanToken0, names)

                }

                pl_sim_curr = m_sim - ret_curr

                if (pl_sim_curr > 0) {

                    console.log("Profit Type Precision Checking Log for", l_type)
                    console.log(`${names[1] ? isLoanToken0 : names[0]} pl_sim_curr`, pl_sim_curr, "string version", pl_sim_curr.toString())
                    console.log(`${names[1] ? isLoanToken0 : names[0]} l`, l, "string version", l.toString())
                    console.log(`${names[1] ? isLoanToken0 : names[0]} m`, m_sim, "string version", m_sim.toString())
                    console.log(`${names[1] ? isLoanToken0 : names[0]} ret`, ret_sim, "string version", ret_sim.toString())

                    sols.push(f)
                    pls.push(pl_sim_curr)
                    ls.push(l)
                    ms.push(m_sim)
                    rets.push(ret_sim)

                }

            }

        }
    }

    if ( pls.length > 0 ) {

        pl_sim = Math.max(...pls)
        pls_max_ind = pls.indexOf(pl_sim)

        let loan_token, loan_token_reserve, return_token

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

        console.log("Start", loan_token, loan_token_reserve)
        console.log("Fraction", sols[pls_max_ind])
        console.log("Loan", loan_token, ls[pls_max_ind])

        console.log("Mid", return_token, ms[pls_max_ind] )
        console.log("Ret", return_token, rets[pls_max_ind] )
        console.log("Profit: ", pl_sim )

        return {
            "start_ind": start_ind,
            "end_ind": end_ind,
            "l": ls[pls_max_ind],
            "m": ms[pls_max_ind],
            "ret": rets[pls_max_ind],
            "pl": pl_sim,
            "loan_token": (0 ? isLoanToken0 : 1)
        }

    } else {

        console.log(`No Profitable ${ names[1] ? isLoanToken0 : names[0] } Trades according to Sim`)

        return null

    }

}