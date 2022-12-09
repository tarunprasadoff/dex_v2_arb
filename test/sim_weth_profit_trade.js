function sim_weth_profit_trade(rates, i, j, reserves_dai, reserves_weth) {

    let start_ind, end_ind, weth_Fs, weth_sols, weth_pls, weth_pl_sim_curr,
    weth_pl_sim, weth_pls_max_ind, weth_l_dais, weth_m_weths, weth_ret_weths

    let weth_l_temp_dais, weth_l_dai, m_step_cap, ret_step_cap, m_is_step_positive, ret_is_step_negative, m_weth_sim, ret_weth_sim

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
    weth_l_dais = []
    weth_m_weths = []
    weth_ret_weths = []

    for (let weth_F of weth_Fs) {

        if ( ( weth_F > 0 ) && ( weth_F < 1 ) ) {

            console.log("weth_F", weth_F)
            console.log("reserves_dai[start_ind]", reserves_dai[start_ind])

            weth_l_dai = weth_F * Number(reserves_dai[start_ind])

            console.log("Pre-ceil weth_l_dai", weth_l_dai)

            if ( weth_l_dai == Math.ceil(weth_l_dai) ) {

                weth_l_temp_dais = [ weth_l_dai ]

            } else {

                weth_l_temp_dais = [ Math.floor(weth_l_dai), Math.ceil(weth_l_dai) ]

            }

            for ( let weth_l_dai of weth_l_temp_dais ) {

                console.log("weth_l_dai", weth_l_dai)

                m_weth_sim = BigInt( Math.ceil( a_sim - ( b_sim / ( c_sim + d_sim * weth_F ) ) ) )
                m_is_step_positive = ( 
                                        ( BigInt( reserves_dai[end_ind] * 1000 + weth_l_dai * 997 ) * ( BigInt( reserves_weth[end_ind] ) - m_weth_sim ) ) >=
                                            BigInt( reserves_dai[end_ind] * reserves_weth[end_ind] * 1000 )
                                    )

                console.log("m_weth_sim", m_weth_sim, m_is_step_positive,
                            ( BigInt( reserves_dai[end_ind] * 1000 + weth_l_dai * 997 ) * ( BigInt( reserves_weth[end_ind] ) - m_weth_sim ) ),
                            BigInt( reserves_dai[end_ind] * reserves_weth[end_ind] * 1000 )
                            )

                if ( m_is_step_positive ) {

                    m_step_cap = BigInt( reserves_weth[end_ind] ) - m_weth_sim

                } else {

                    m_step_cap = m_weth_sim

                }
                

                for ( let step = 0; step < m_step_cap; step++ ) {

                    if ( m_is_step_positive ) {

                        m_weth_sim += BigInt(1)

                        let elei = ( BigInt( reserves_dai[end_ind] * 1000 + weth_l_dai * 997 ) * ( BigInt( reserves_weth[end_ind] ) - m_weth_sim ) ) < BigInt( reserves_dai[end_ind] * reserves_weth[end_ind] * 1000 )

                        console.log("step", step, "m_dai_sim", m_dai_sim, elei,
                                    ( BigInt( reserves_dai[end_ind] * 1000 + weth_l_dai * 997 ) * ( BigInt( reserves_weth[end_ind] ) - m_weth_sim ) ),
                                    BigInt( reserves_dai[end_ind] * reserves_weth[end_ind] * 1000 )
                                   )

                        if ( elei ) {

                            m_weth_sim -= BigInt(1)
                            break

                        }

                    } else {

                        m_weth_sim -= BigInt(1)

                        let elei = ( BigInt( reserves_dai[end_ind] * 1000 + weth_l_dai * 997 ) * ( BigInt( reserves_weth[end_ind] ) - m_weth_sim ) ) >= BigInt( reserves_dai[end_ind] * reserves_weth[end_ind] * 1000 )

                        console.log("step", step, "m_dai_sim", m_dai_sim, elei,
                                    ( BigInt( reserves_dai[end_ind] * 1000 + weth_l_dai * 997 ) * ( BigInt( reserves_weth[end_ind] ) - m_weth_sim ) ),
                                    BigInt( reserves_dai[end_ind] * reserves_weth[end_ind] * 1000 )
                                   )

                        if ( elei ) {

                            break

                        }

                    }

                }

                ret_weth_sim = BigInt( Math.floor( e_sim * ( weth_F / ( 1 - weth_F ) ) ) )
                ret_is_step_negative = (
                                        ( BigInt( reserves_weth[start_ind] * 1000 + ret_weth_sim * 997 ) * ( BigInt( reserves_dai[start_ind] ) - weth_l_dai ) ) >=
                                        BigInt( reserves_dai[start_ind] * reserves_weth[start_ind] * 1000 )
                                        )

                console.log("ret_weth_sim", ret_weth_sim, ret_is_step_negative,
                            ( BigInt( reserves_weth[start_ind] * 1000 + ret_weth_sim * 997 ) * ( BigInt( reserves_dai[start_ind] ) - weth_l_dai ) ),
                            BigInt( reserves_dai[start_ind] * reserves_weth[start_ind] * 1000 )
                            )

                if ( ret_is_step_negative ) {

                    ret_step_cap = ret_weth_sim

                } else {

                    ret_step_cap = m_weth_sim - ret_weth_sim

                }

                for ( let step = 0; step < ret_step_cap; step++ ) {

                    if ( ret_is_step_negative ) {

                        ret_weth_sim -= BigInt(1)

                        let elei = ( ( BigInt( reserves_weth[start_ind] * 1000 + ret_weth_sim * 997 ) * ( BigInt( reserves_dai[start_ind] ) - weth_l_dai ) ) < BigInt( reserves_dai[start_ind] * reserves_weth[start_ind] * 1000 ) )

                        console.log("step", step, "ret_dai_sim", ret_dai_sim, elei,
                                    ( BigInt( reserves_weth[start_ind] * 1000 + ret_weth_sim * 997 ) * ( BigInt( reserves_dai[start_ind] ) - weth_l_dai ) ),
                                    BigInt( reserves_dai[start_ind] * reserves_weth[start_ind] * 1000 )
                                   )

                        if ( elei ) {

                            ret_weth_sim += BigInt(1)
                            break

                        }

                    } else {

                        ret_weth_sim += BigInt(1)

                        let elei = ( ( BigInt( reserves_weth[start_ind] * 1000 + ret_weth_sim * 997 ) * ( BigInt( reserves_dai[start_ind] ) - weth_l_dai ) ) >= BigInt( reserves_dai[start_ind] * reserves_weth[start_ind] * 1000 ) )

                        console.log("step", step, "ret_dai_sim", ret_dai_sim, elei,
                                    ( BigInt( reserves_weth[start_ind] * 1000 + ret_weth_sim * 997 ) * ( BigInt( reserves_dai[start_ind] ) - weth_l_dai ) ),
                                    BigInt( reserves_dai[start_ind] * reserves_weth[start_ind] * 1000 )
                                   )

                        if ( elei ) {
                            
                            break

                        }

                    }

                }

                weth_pl_sim_curr = m_weth_sim - ret_weth_sim
                
                if (weth_pl_sim_curr > 0) {

                    console.log("Profit Type Precision Checking Log")
                    console.log("weth_pl_sim_curr",weth_pl_sim_curr,"string version",weth_pl_sim_curr.toString())
                    console.log("weth_l_dai",weth_l_dai,"string version",weth_l_dai.toString())
                    console.log("m_weth_sim",m_weth_sim,"string version",m_weth_sim.toString())
                    console.log("ret_weth_sim",ret_weth_sim,"string version",ret_weth_sim.toString())

                    weth_sols.push(weth_F)
                    weth_pls.push(weth_pl_sim_curr)
                    weth_l_dais.push(weth_l_dai)
                    weth_m_weths.push(m_weth_sim)
                    weth_ret_weths.push(ret_weth_sim)

                }

            }
        
        }

    }
    
    if ( weth_pls.length > 0 ) {

        weth_pl_sim = Math.max(...weth_pls)
        weth_pls_max_ind = weth_pls.indexOf(weth_pl_sim)
        console.log("Weth Profit Trade Sim")

        console.log("Start DAI", Number(reserves_dai[start_ind]))
        console.log("Fraction: ", weth_sols[weth_pls_max_ind])
        console.log("Loan DAI", weth_l_dais[weth_pls_max_ind])

        console.log("Mid WETH", weth_m_weths[weth_pls_max_ind] )
        console.log("Ret WETH", weth_ret_weths[weth_pls_max_ind] )
        console.log("Profit: ", weth_pl_sim )

        return {
            "start_ind": start_ind,
            "end_ind": end_ind,
            "l": weth_l_dais[weth_pls_max_ind],
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

module.exports = { sim_weth_profit_trade }