class CurrencyHelper {
  getCurrencyFromPriceString(price) {
    const currencies = {
      '£': 'GBP',
      '$': 'USD',
      '€': 'EUR'
    }

    return currencies[price.substring(0, 1)]
  }
}

module.exports = CurrencyHelper