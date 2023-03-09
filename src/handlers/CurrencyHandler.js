const ExchangeRateApiConnection = require('../connections/ExchangeRateApiConnection')
const DatabaseBulkQueryHelper = require('../helpers/DatabaseBulkQueryHelper')
const CurrencyHelper = require('../helpers/CurrencyHelper')

class CurrencyHandler {
  db = null
  currencyTable = []

  constructor(connection) {
    this.db = connection
  }

  async setCurrencyTable() {
    const exchangeRateApiConnection = new ExchangeRateApiConnection()

    try {
      this.currencyTable = await exchangeRateApiConnection.getExchangeRateData()
    } catch (e) {
      console.log('ExchangeRateAPI issue, falling back to db\n')

      // Fetch existing currency data from db
      const [currencyTableRows] = await this.db.execute('SELECT currencyCode, rate FROM currency')

      // The data is currently in an array like [{ currencyCode: XXX, rate: ##.## }] when we want it
      // in an object format like { XXX: ##.## }, so we can just reformat it a bit here
      const currencyTable = {}

      currencyTableRows.forEach((row) => {
        currencyTable[row.currencyCode] = row.rate
      })

      this.currencyTable = currencyTable

      // We don't need to do anything further here
      return
    }

    // Now that we've got the currencyTable, let's update it in the DB
    const databaseQueryHelper = new DatabaseBulkQueryHelper()

    // Set the basics of the SQL update
    databaseQueryHelper.setPrefix('INSERT INTO currency(currencyCode, rate) VALUES')
    databaseQueryHelper.setSuffix('ON DUPLICATE KEY UPDATE currencyCode = VALUES(currencyCode), rate = VALUES(rate)')

    // Now loop through the table and add all the values in
    for (const entry of Object.entries(this.currencyTable)) {
      databaseQueryHelper.addRow(entry)
    }

    // Now we can build the query
    const { query, params, numberOfRows } = databaseQueryHelper.getQuery()

    // And execute it
    const [insertCurrencyRes] = await this.db.execute(query, params)

    const affectedRows = insertCurrencyRes.affectedRows

    if (affectedRows !== numberOfRows) {
      console.log('Currency insert mismatch')
      console.log(`Expected vs Affected: ${numberOfRows} / ${affectedRows}\n`)

      return
    }

    console.log(`${affectedRows} currencies updated\n`)
  }

  convertToUSD(price) {
    // The passed price here will be a string including the symbol
    // So we first need to identify the currency being used
    const currencyHelper = new CurrencyHelper()
    const currencyCode = currencyHelper.getCurrencyFromPriceString(price)

    // Now we can convert it to USD using the table we fetched above
    const conversionRate = this.currencyTable[currencyCode]

    // Then just get the number value (e.g $100.23 -> 100.23)
    const priceNumber = Number(price.replace(/[^\d.]+/g, ''))

    // And multiply it by the conversion rate
    return priceNumber * conversionRate
  }
}

module.exports = CurrencyHandler