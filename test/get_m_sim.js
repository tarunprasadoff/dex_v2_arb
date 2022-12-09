function get_m_sim(reserves_0, reserves_1, l, end_ind, magnifiers, fees, isLoanToken0, names) {

    let num, den, left

    num = ( BigInt( reserves_0[end_ind] ) * BigInt( reserves_1[end_ind] ) * BigInt( magnifiers[end_ind] ) )

    if (isLoanToken0){

        end_loan_token_reserve = BigInt( reserves_0[end_ind] )
        left = BigInt( reserves_1[end_ind] )

    } else {

        end_loan_token_reserve = BigInt( reserves_1[end_ind] )
        left = BigInt( reserves_0[end_ind] )

    }

    den = ( end_loan_token_reserve * BigInt( magnifiers[end_ind] ) + BigInt( l ) * ( BigInt( magnifiers[end_ind] ) - BigInt( fees[end_ind] ) ) )

    m_sim = ( left - ( num / den ) )

    if ( ( den * ( left - m_sim ) ) >= num ) {

        // console.log("Increasing M Sim - End Ind:", end_ind)

        while ( ( den * ( left - m_sim - BigInt(1) ) ) >= num ) {

            m_sim += BigInt(1)

            // console.log(m_sim)

        }

        // if ( ( den * ( left - m_sim - BigInt(1) ) ) >= num ) {

        //     return ( m_sim + BigInt(1) )

        // } else {

        //     return m_sim

        // }

    } else {

        // console.log("Decreasing M Sim - End Ind:", end_ind)

        while ( true ) {

            m_sim -= BigInt(1)

            // console.log(m_sim)

            if ( ( den * ( left - m_sim ) ) >= num ) {
                break
            }

        }

    }

    return m_sim
    
    // else if( ( den * ( left - m_sim + BigInt(1) ) ) >= num ) {

    //     return ( m_sim - BigInt(1) )

    // } else {

    //     console.log(
    //     `Rounding Error: 
    //     ${names[0]} End Reserve ${reserves_0[end_ind]} 
    //     ${names[1]} End Reserve ${reserves_1[end_ind]} 
    //     Loan ${names[0] ? isLoanToken0: names[1]} Loan Amount ${l} 
    //     Mid ${names[1] ? isLoanToken0: names[0]}  Mid Sim ${m_sim}`
    //     )

    //     throw("Rounding Error")

    // }

}

module.exports = { get_m_sim }