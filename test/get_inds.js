function get_inds(rates, i, j, isLoanToken0) {

    if ( ( ( rates[i] > rates[j] ) && isLoanToken0 ) || ( ( rates[i] < rates[j] ) && !isLoanToken0 ) ) {
        return [i,j]
    } else if ( ( ( rates[i] < rates[j] ) && isLoanToken0 ) || ( ( rates[i] > rates[j] ) && !isLoanToken0 ) ) {
        return [j,i]
    } else {
        return [-1,-1]
    }

}

module.exports = { get_inds }