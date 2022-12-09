function get_ret_sim(reserves_0, reserves_1, l, start_ind, magnifiers, fees, isLoanToken0, names) {

    let num, den, right, den_sup

    num = ( BigInt( reserves_0[start_ind] ) * BigInt( reserves_1[start_ind] ) * BigInt( magnifiers[start_ind] ) )
    den_sup = ( BigInt( magnifiers[start_ind] ) - BigInt( fees[start_ind] ) )

    if (isLoanToken0) {

        den = ( BigInt( reserves_0[start_ind] ) - BigInt( l ) )
        right = ( BigInt( reserves_1[start_ind] ) * BigInt( magnifiers[start_ind] ) )

    } else {

        den = ( BigInt( reserves_1[start_ind] ) - BigInt( l ) )
        right = ( BigInt( reserves_0[start_ind] ) * BigInt( magnifiers[start_ind] ) )

    }

    ret_sim = ( ( num / den ) - right ) / den_sup

    if ( den * ( ( ret_sim * den_sup ) + right ) >= num ) {

        // console.log("Decreasing Ret Sim - Start Ind:", start_ind)

        while ( den * ( ( ( ret_sim - BigInt(1) ) * den_sup ) + right ) >= num ) {

            ret_sim -= BigInt(1)

            // console.log(ret_sim)

        }

        // if ( den * ( ( ( ret_sim - BigInt(1) ) * den_sup ) + right ) >= num ) {

        //     return ( ret_sim - BigInt(1) )

        // } else {

        //     return ret_sim

        // }

    } else {

        // console.log("Increasing Ret Sim - Start Ind:", start_ind)

        while ( true ) {

            ret_sim += BigInt(1)

            // console.log(ret_sim)

            if ( den * ( ( ( ret_sim + BigInt(1) ) * den_sup ) + right ) >= num ) {

                break

            }

        }

    }

    return ret_sim
    
    // else if ( den * ( ( ( ret_sim + BigInt(1) ) * den_sup ) + right ) >= num ) {

    //     return ( ret_sim + BigInt(1) )

    // } else {

    //     console.log(
    //     `Rounding Error: 
    //     ${names[0]} Start Reserve ${reserves_0[start_ind]} 
    //     ${names[1]} Start Reserve ${reserves_1[start_ind]} 
    //     Loan ${names[0] ? isLoanToken0: names[1]} Loan Amount ${l} 
    //     Ret ${names[1] ? isLoanToken0: names[0]} Ret Sim ${ret_sim}`
    //     )

    //     throw("Rounding Error")

    // }

}

module.exports = { get_ret_sim }