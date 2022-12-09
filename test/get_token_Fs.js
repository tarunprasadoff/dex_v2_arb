function get_token_1_Fs(reserves_0, reserves_1, start_ind, end_ind, magnifiers, fees, name) {

    console.log(`Profit ${name} Simulation`, start_ind, end_ind)

    const a_sim = Number(reserves_1[end_ind])

    const b_sim = Number(reserves_0[end_ind]) * Number(reserves_1[end_ind]) * magnifiers[end_ind]

    const c_sim = Number(reserves_0[end_ind]) * magnifiers[end_ind]

    const d_sim = Number(reserves_0[start_ind]) * ( magnifiers[end_ind] - fees[end_ind] )

    const e_sim = Number(reserves_1[start_ind]) * ( magnifiers[start_ind] / ( magnifiers[start_ind] - fees[start_ind] ) )

    const N_1 = ( e_sim ** 0.5 ) * 
          ((
            ( b_sim * d_sim * ( c_sim ** 2 ) ) +
            ( 2 * b_sim * c_sim * ( d_sim ** 2 ) ) +
            ( b_sim * ( d_sim ** 3 ) )
            ) ** 0.5)

    const N_2 = ( b_sim * d_sim ) + ( e_sim * c_sim * d_sim )

    const D_1 = ( b_sim * d_sim ) - ( e_sim * ( d_sim ** 2) )

    return [ [ ( ( N_2 - N_1 ) / D_1 ) , ( ( N_2 + N_1 ) / D_1 ) ], a_sim, b_sim, c_sim, d_sim, e_sim ]

}

function get_token_0_Fs(reserves_0, reserves_1, start_ind, end_ind, magnifiers, fees, name) {

    console.log(`Profit ${name} Simulation`, start_ind, end_ind)

    const a_sim = Number(reserves_0[end_ind])

    const b_sim = Number(reserves_0[end_ind]) * Number(reserves_1[end_ind]) * magnifiers[end_ind]

    const c_sim = magnifiers[end_ind] * Number(reserves_1[end_ind])

    const d_sim = ( magnifiers[end_ind] - fees[end_ind] ) * Number(reserves_1[start_ind])

    const e_sim = Number(reserves_0[start_ind]) * ( magnifiers[start_ind] / ( magnifiers[start_ind] - fees[start_ind] ) )

    const N_1 = ( e_sim ** 0.5 ) * 
          ((
            ( b_sim * d_sim * ( c_sim ** 2 ) ) +
            ( 2 * b_sim * c_sim * ( d_sim ** 2 ) ) +
            ( b_sim * ( d_sim ** 3 ) )
            ) ** 0.5)

    const N_2 = ( b_sim * d_sim ) + ( e_sim * c_sim * d_sim )

    const D_1 = ( b_sim * d_sim ) - ( e_sim * ( d_sim ** 2) )

    return [ [ ( ( N_2 - N_1 ) / D_1 ) , ( ( N_2 + N_1 ) / D_1 ) ], a_sim, b_sim, c_sim, d_sim, e_sim ]

}

module.exports = { get_token_1_Fs, get_token_0_Fs }