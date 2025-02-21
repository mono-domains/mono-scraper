const punycode = require('punycode/')
const DatabaseBulkQueryHelper = require('../helpers/DatabaseBulkQueryHelper')

class ExtensionPricingHandler {
  registrarName = null
  db = null
  currencyHandler = null
  registrarHandler = null
  extensionHandler = null

  constructor(
    registrarName,
    connection,
    currencyHandler,
    registrarHandler,
    extensionHandler
  ) {
    this.registrarName = registrarName
    this.db = connection
    this.currencyHandler = currencyHandler
    this.registrarHandler = registrarHandler
    this.extensionHandler = extensionHandler
  }

  async clearPricingTableInDatabase() {
    // To ensure the data in the table is up to date, the easiest way is to clear all entries for the
    // current registrar in the database. This ensures that, for example, if a extension is removed from
    // a specific registrar, it's not still included in the pricing information on the website.

    // So, let's start by getting the registrar id
    const registrarId = await this.registrarHandler.getRegistrarId(
      this.registrarName
    )

    // Now we can just make a DB query to delete everything with that registrar id
    await this.db.execute(
      'DELETE FROM extension_pricing WHERE registrarId = ?',
      [registrarId]
    )
  }

  async setPricingTableInDatabase(pricingTable) {
    // Let's start setting up the DB query to insert all of this information
    const databaseQueryHelper = new DatabaseBulkQueryHelper()

    databaseQueryHelper.setPrefix(
      'INSERT INTO extension_pricing (extensionId, registrarId, registerPrice, renewalPrice, url, isOnSale) VALUES'
    )

    // Since it's always the same, let's get the registrar id here
    const registrarId = await this.registrarHandler.getRegistrarId(
      this.registrarName
    )

    // Before we start, let's refresh the extensions table
    await this.extensionHandler.getExtensionsTable()

    // Now, we should've been passed an array of objects with the following info
    // { extension, registerPrice, renewalPrice, isOnSale, registerUrl }
    // So we're just gonna go through, format it all in the way we expect, and insert it to the db
    for (const row of pricingTable) {
      // We wanna first encode the extension with punycode if it's not already
      const extension = row.extension
      const encodedExtension = extension.startsWith('.xn--')
        ? extension
        : punycode.toASCII(extension)

      // Then get it's id out of the database
      const extensionId = await this.extensionHandler.getExtensionId(
        encodedExtension
      )

      // Now we want to convert the passed currencies to their USD values
      const registerPriceUSD = this.currencyHandler.convertToUSD(
        row.registerPrice
      )

      // If these prices aren't numbers, they will return NaN
      // To try and not break everything, we'll check for it and skip if it's found
      if (isNaN(registerPriceUSD)) {
        console.log(`${row.extension} skipped, NaN register price.`)
        console.log(`Register Price: "${row.registerPrice}"`)
        continue
      }

      let renewalPriceUSD = null

      if (row.renewalPrice) {
        renewalPriceUSD = this.currencyHandler.convertToUSD(row.renewalPrice)

        // See the above
        if (isNaN(renewalPriceUSD)) {
          console.log(`${row.extension} skipped, NaN renewal price.`)
          console.log(`Renewal Price: "${row.renewalPrice}"`)
          continue
        }
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
      ])
    }

    // Now we're here, everything should be added to our databaseQueryHelper
    // So we should just be able to get the query
    const { query, params, numberOfRows } = databaseQueryHelper.getQuery()

    // And execute it
    try {
      // First, let's ask MySQL to EXPLAIN the query to see if it'll work fine
      await this.db.execute(`EXPLAIN ${query}`, params)

      // It did, so now let's clear the db of any info
      await this.clearPricingTableInDatabase()

      // And insert the new info
      const [insertPricingRes] = await this.db.execute(query, params)

      const affectedRows = insertPricingRes.affectedRows

      if (numberOfRows !== affectedRows && numberOfRows !== affectedRows / 2) {
        console.log('Pricing insert mismatch')
        console.log(`Expected vs Affected: ${numberOfRows} / ${affectedRows}`)

        return
      }

      console.log(`${numberOfRows} pricings updated`)
    } catch (e) {
      console.log(e)

      throw new Error('MySQL insert error')
    }
  }
}

module.exports = ExtensionPricingHandler
