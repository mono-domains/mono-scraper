const punycode = require('punycode/')
const DatabaseBulkQueryHelper = require('../helpers/DatabaseBulkQueryHelper')
const DateHelper = require('../helpers/DateHelper')

class ExtensionPricingHandler {
  registrarName = null
  db = null
  currencyHandler = null
  registrarHandler = null
  extensionHandler = null

  constructor(registrarName, connection, currencyHandler, registrarHandler, extensionHandler) {
    this.registrarName = registrarName
    this.db = connection
    this.currencyHandler = currencyHandler
    this.registrarHandler = registrarHandler
    this.extensionHandler = extensionHandler
  }

  async setPricingTableInDatabase(pricingTable) {
    // Let's start setting up the DB query to insert all of this information
    const databaseQueryHelper = new DatabaseBulkQueryHelper()

    databaseQueryHelper.setPrefix('INSERT INTO extension_pricing (extensionId, registrarId, registerPrice, renewalPrice, url, isOnSale, lastUpdate) VALUES')
    databaseQueryHelper.setSuffix('ON DUPLICATE KEY UPDATE registerPrice = VALUES(registerPrice), renewalPrice = VALUES(renewalPrice), url = VALUES(url), isOnSale = VALUES(isOnSale), lastUpdate = VALUES(lastUpdate)')

    // Since it's always the same, let's get the registrar id here
    const registrarId = await this.registrarHandler.getRegistrarId(this.registrarName)

    // Initialize DateHelper for formatting
    const dateHelper = new DateHelper()

    // Now, we should've been passed an array of objects with the following info
    // { extension, registerPrice, renewalPrice, isOnSale, registerUrl }
    // So we're just gonna go through, format it all in the way we expect, and insert it to the db
    for (const row of pricingTable) {
      // We wanna first encode the extension with punycode if it's not already
      const extension = row.extension
      const encodedExtension = extension.startsWith('.xn--') ? extension : punycode.toASCII(extension)

      // Then get it's id out of the database
      const extensionId = await this.extensionHandler.getExtensionId(encodedExtension)

      // Now we want to convert the passed currencies to their USD values
      const registerPriceUSD = this.currencyHandler.convertToUSD(row.registerPrice)

      // If these prices aren't numbers, they will return NaN
      // To try and not break everything, we'll check for it and skip if it's found
      if (isNaN(registerPriceUSD)) {
        console.log(`${row.extension} skipped, NaN register price.`)
        console.log(`Register Price: "${row.registerPrice}"`)
        continue
      }

      const renewalPriceUSD = this.currencyHandler.convertToUSD(row.renewalPrice)

      // See the above
      if (isNaN(renewalPriceUSD)) {
        console.log(`${row.extension} skipped, NaN renewal price.`)
        console.log(`Renewal Price: "${row.renewalPrice}"`)
        continue
      }

      // Now finally convert the isOnSale boolean to the tinyint the DB is expecting
      const isOnSaleInt = row.isOnSale ? 1 : 0

      // Now add it all to a row
      databaseQueryHelper.addRow([
        extensionId,
        registrarId,
        registerPriceUSD,
        renewalPriceUSD,
        row.registerUrl,
        isOnSaleInt,
        dateHelper.getSQLFormattedDate(new Date())
      ])
    }

    // Now we're here, everything should be added to our databaseQueryHelper
    // So we should just be able to get the query
    const { query, params, numberOfRows } = databaseQueryHelper.getQuery()

    // And execute it
    const [insertPricingRes] = await this.db.execute(query, params)

    const affectedRows = insertPricingRes.affectedRows

    if (numberOfRows !== affectedRows && numberOfRows !== affectedRows / 2) {
      console.log('Pricing insert mismatch')
      console.log(`Expected vs Affected: ${numberOfRows} / ${affectedRows}`)

      return
    }

    console.log(`${numberOfRows} pricings updated`)
  }
}

module.exports = ExtensionPricingHandler