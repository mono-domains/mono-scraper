require('dotenv').config({ path: `${__dirname}/.env` })

const DatabaseConnection = require('./src/connections/DatabaseConnection')

const CurrencyHandler = require('./src/handlers/CurrencyHandler')
const RegistrarHandler = require('./src/handlers/RegistrarHandler')
const ExtensionHandler = require('./src/handlers/ExtensionHandler')
const ExtensionPricingHandler = require('./src/handlers/ExtensionPricingHandler')
const FrontEndDeploymentHandler = require('./src/handlers/FrontEndDeploymentHandler')

const PorkbunScrapingHandler = require('./src/handlers/scrapers/PorkbunScrapingHandler')
const NetimScrapingHandler = require('./src/handlers/scrapers/NetimScrapingHandler')
const NamecheapScrapingHandler = require('./src/handlers/scrapers/NamecheapScrapingHandler')
const One01DomainScrapingHandler = require('./src/handlers/scrapers/101DomainScrapingHandler')

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
    Porkbun: PorkbunScrapingHandler,
    Netim: NetimScrapingHandler,
    Namecheap: NamecheapScrapingHandler,
    '101Domain': One01DomainScrapingHandler,
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

    // Then initialize the scraper
    const scraper = new ScraperClass(extensionPricingHandler)

    console.log(`Beginning scrape: ${registrarName}`)

    // And scrape
    try {
      await scraper.setPricingData()
    } catch (e) {
      console.log(`Scraping aborted: ${registrarName}`)
      console.log(e.message + '\n')

      console.log(e)

      continue
    }

    console.log(`Scrape finished: ${registrarName}\n`)
  }

  // Close the DB connection, since we're done
  connection.end()

  // Now we can deploy the front end
  const frontEndDeploymentHandler = new FrontEndDeploymentHandler()

  console.log('Starting Front End deployment')

  try {
    await frontEndDeploymentHandler.deployFrontEnd()
  } catch (e) {
    console.log('Error while deploying')
    console.log(e.message)

    return
  }

  console.log('Front End deployment finished')
})()
