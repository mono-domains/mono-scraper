require('dotenv').config()

const DatabaseConnection = require('./src/connections/DatabaseConnection')

const CurrencyHandler = require('./src/handlers/CurrencyHandler')
const RegistrarHandler = require('./src/handlers/RegistrarHandler')
const ExtensionHandler = require('./src/handlers/ExtensionHandler')
const ExtensionPricingHandler = require('./src/handlers/ExtensionPricingHandler')

const PorkbunScrapingHandler = require('./src/handlers/scrapers/PorkbunScrapingHandler')
const NetimScrapingHandler = require('./src/handlers/scrapers/NetimScrapingHandler')
const GoogleDomainsScrapingHandler = require('./src/handlers/scrapers/GoogleDomainsScrapingHandler')
const NamecheapScrapingHandler = require('./src/handlers/scrapers/NamecheapScrapingHandler')

;(async () => {
  const database = new DatabaseConnection()
  const connection = await database.createConnection()


  // First, we update the currency in case it's out of date
  const currencyHandler = new CurrencyHandler(connection)
  await currencyHandler.setCurrencyTable()

  // Now let's fetch the registrar data...
  const registrarHandler = new RegistrarHandler(connection)
  await registrarHandler.getRegistrarTable()

  // ...and the extension data
  const extensionHandler = new ExtensionHandler(connection)
  await extensionHandler.getExtensionsTable()


  // Now we can start with scraping
  const scrapers = {
    'Porkbun': PorkbunScrapingHandler,
    'Netim': NetimScrapingHandler,
    'Google': GoogleDomainsScrapingHandler,
    'Namecheap': NamecheapScrapingHandler
  }

  for (const [registrarName, ScraperClass] of Object.entries(scrapers)) {
    // Initialize a version of the ExtensionPricingHandler for this scraper
    const extensionPricingHandler = new ExtensionPricingHandler(
      registrarName,
      connection,
      currencyHandler,
      registrarHandler,
      extensionHandler
    )

    // Then clear the current registrar pricing info from the table
    try {
      await extensionPricingHandler.clearPricingTableInDatabase()
    } catch (e) {
      console.log(`Scraping aborted: ${registrarName}`)
      console.log(e.message)

      continue
    }

    // Then initialize the scraper
    const scraper = new ScraperClass(extensionPricingHandler)

    console.log(`Beginning scrape: ${registrarName}`)

    // And scrape
    try {
      await scraper.setPricingData()
    } catch (e) {
      console.log(`Scraping aborted: ${registrarName}`)
      console.log(e.message)

      continue
    }

    console.log(`Scrape finished: ${registrarName}\n`)
  }


  // Close the DB connection, since we're done
  connection.end();
})()