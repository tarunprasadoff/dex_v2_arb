export function sim_dai_profit_trade(rates, i, j, reserves_dai, reserves_weth) {

    let start_ind, end_ind, dai_Fs, dai_sols, dai_pls, dai_pl_sim_curr,
        dai_pl_sim, dai_pls_max_ind, dai_l_weths, dai_m_dais, dai_ret_dais

    let dai_l_temp_weths, dai_l_weth, m_step_cap, ret_step_cap, m_is_step_positive, ret_is_step_negative, m_dai_sim, ret_dai_sim

    if ( rates[i] > rates[j] ) { 

        start_ind = j
        end_ind = i

    } else if ( rates[i] < rates[j] ) {

        start_ind = i
        end_ind = j

    } else {

        return null

    }

    console.log("DAI Simulation", start_ind, end_ind)

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
    dai_l_weths = []
    dai_m_dais = []
    dai_ret_dais = []

    for (let dai_F of dai_Fs) {

        if ( ( dai_F > 0 ) && ( dai_F < 1 ) ) {

            console.log("dai_F", dai_F)
            console.log("reserves_weth[start_ind]", reserves_weth[start_ind])

            dai_l_weth = dai_F * Number(reserves_weth[start_ind])

            console.log("Pre-ceil dai_l_weth", dai_l_weth)

            if ( dai_l_weth == Math.ceil(dai_l_weth) ) {

                dai_l_temp_weths = [ dai_l_weth ]

            } else {

                dai_l_temp_weths = [ Math.floor(dai_l_weth), Math.ceil(dai_l_weth) ]

            }

            for ( let dai_l_weth of dai_l_temp_weths ) {

                console.log("dai_l_weth", dai_l_weth)

                m_dai_sim = BigInt( Math.ceil( a_sim - ( b_sim / ( c_sim + d_sim * dai_F ) ) ) )
                m_is_step_positive = ( 
                                        BigInt( reserves_weth[end_ind] * 1000 + dai_l_weth * 997 ) * ( BigInt( reserves_dai[end_ind] ) - m_dai_sim ) >=
                                        BigInt( reserves_dai[end_ind] * reserves_weth[end_ind]  * 1000 )
                                     )

                console.log("m_dai_sim", m_dai_sim, m_is_step_positive,
                            BigInt( reserves_weth[end_ind] * 1000 + dai_l_weth * 997 ) * ( BigInt( reserves_dai[end_ind] ) - m_dai_sim ),
                            BigInt( reserves_dai[end_ind] * reserves_weth[end_ind]  * 1000 )
                            )

                if ( m_is_step_positive ) {

                    m_step_cap = BigInt( reserves_weth[end_ind] ) - m_dai_sim

                } else {

                    m_step_cap = m_dai_sim

                }

                for ( let step = 0; step < m_step_cap; step++ ) {

                    if ( m_is_step_positive ) {

                        m_dai_sim += BigInt(1)

                        let elei = ( BigInt( reserves_weth[end_ind] * 1000 + dai_l_weth * 997 ) * ( BigInt( reserves_dai[end_ind] ) - m_dai_sim ) ) < BigInt( reserves_dai[end_ind] * reserves_weth[end_ind]  * 1000 )

                        console.log("step", step, "m_dai_sim", m_dai_sim, elei,
                                    ( BigInt( reserves_weth[end_ind] * 1000 + dai_l_weth * 997 ) * ( BigInt( reserves_dai[end_ind] ) - m_dai_sim ) ),
                                    BigInt( reserves_dai[end_ind] * reserves_weth[end_ind]  * 1000 )
                                   )

                        if ( elei ) {

                            m_dai_sim -= BigInt(1)
                            break

                        }

                    } else {

                        m_dai_sim -= BigInt(1)

                        let elei = ( BigInt( reserves_weth[end_ind] * 1000 + dai_l_weth * 997 ) * ( BigInt( reserves_dai[end_ind] ) - m_dai_sim ) ) >= BigInt( reserves_dai[end_ind] * reserves_weth[end_ind]  * 1000 )

                        console.log("step", step, "m_dai_sim", m_dai_sim, elei,
                                    ( BigInt( reserves_weth[end_ind] * 1000 + dai_l_weth * 997 ) * ( BigInt( reserves_dai[end_ind] ) - m_dai_sim ) ),
                                    BigInt( reserves_dai[end_ind] * reserves_weth[end_ind]  * 1000 )
                                    )

                        if ( elei ) {

                            break

                        }

                    }

                }

                ret_dai_sim = BigInt( Math.ceil( e_sim * ( dai_F / ( 1 - dai_F ) ) ) )
                ret_is_step_negative = (
                                        ( BigInt( reserves_dai[start_ind] * 1000 + ret_dai_sim * 997 ) * ( BigInt( reserves_weth[start_ind] ) - dai_l_weth ) ) >=
                                        BigInt( reserves_dai[start_ind] * 1000 * reserves_weth[start_ind] )
                                        )

                console.log("ret_dai_sim", ret_dai_sim, ret_is_step_negative,
                            ( BigInt( reserves_dai[start_ind] * 1000 + ret_dai_sim * 997 ) * ( BigInt( reserves_weth[start_ind] ) - dai_l_weth ) ),
                            BigInt( reserves_dai[start_ind] * 1000 * reserves_weth[start_ind] )
                            )

                if ( ret_is_step_negative ) {

                    ret_step_cap = ret_dai_sim
        
                } else {

                    ret_step_cap = m_dai_sim - ret_dai_sim

                }

                for ( let step = 0; step < ret_step_cap; step++ ) {

                    if ( ret_is_step_negative ) {

                        ret_dai_sim = ret_dai_sim - BigInt(1)

                        let elei = ( ( BigInt( reserves_dai[start_ind] * 1000 + ret_dai_sim * 997 ) * ( BigInt( reserves_weth[start_ind] ) - dai_l_weth ) ) < BigInt( reserves_dai[start_ind] * 1000 * reserves_weth[start_ind] ) )

                        console.log("step", step, "ret_dai_sim", ret_dai_sim, elei,
                                    ( BigInt( reserves_dai[start_ind] * 1000 + ret_dai_sim * 997 ) * ( BigInt( reserves_weth[start_ind] ) - dai_l_weth ) ),
                                    BigInt( reserves_dai[start_ind] * 1000 * reserves_weth[start_ind] )
                                   )

                        if ( elei ) {

                            ret_dai_sim = ret_dai_sim + BigInt(1)
                            break

                        }
            
                    } else {
    
                        ret_dai_sim = ret_dai_sim + BigInt(1)

                        let elei = ( ( BigInt( reserves_dai[start_ind] * 1000 + ret_dai_sim * 997 ) * ( BigInt( reserves_weth[start_ind] ) - dai_l_weth ) ) >= BigInt( reserves_dai[start_ind] * 1000 * reserves_weth[start_ind] ) )

                        console.log("step", step, "ret_dai_sim", ret_dai_sim, elei,
                                    ( BigInt( reserves_dai[start_ind] * 1000 + ret_dai_sim * 997 ) * ( BigInt( reserves_weth[start_ind] ) - dai_l_weth ) ),
                                    BigInt( reserves_dai[start_ind] * 1000 * reserves_weth[start_ind] )
                                   )

                        if ( elei ) {

                            break

                        }

                    }

                }

                dai_pl_sim_curr = m_dai_sim - ret_dai_sim
                
                if (dai_pl_sim_curr > 0) {

                    console.log("Profit Type Precision Checking Log")
                    console.log("dai_pl_sim_curr",dai_pl_sim_curr,"string version",dai_pl_sim_curr.toString())
                    console.log("dai_l_weth",dai_l_weth,"string version",dai_l_weth.toString())
                    console.log("m_dai_sim",m_dai_sim,"string version",m_dai_sim.toString())
                    console.log("ret_dai_sim",ret_dai_sim,"string version",ret_dai_sim.toString())

                    dai_sols.push(dai_F)
                    dai_pls.push(dai_pl_sim_curr)
                    dai_l_weths.push(dai_l_weth)
                    dai_m_dais.push(m_dai_sim)
                    dai_ret_dais.push(ret_dai_sim)

                }

            }

        }

    }
    
    if ( dai_pls.length > 0 ) {

        dai_pl_sim = Math.max(...dai_pls)
        dai_pls_max_ind = dai_pls.indexOf(dai_pl_sim)
        console.log("Dai Profit Trade Sim")

        console.log("Start WETH", Number(reserves_weth[start_ind]))
        console.log("Fraction: ", dai_sols[dai_pls_max_ind])
        console.log("Loan WETH", dai_l_weths[dai_pls_max_ind])        
        
        console.log("Mid DAI", dai_m_dais[dai_pls_max_ind])
        console.log("Ret DAI", dai_ret_dais[dai_pls_max_ind])
        console.log("Profit: ", dai_pl_sim)

        return {
            "start_ind": start_ind,
            "end_ind": end_ind,
            "l": dai_l_weths[dai_pls_max_ind],
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