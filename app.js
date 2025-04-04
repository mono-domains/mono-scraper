require('dotenv').config({ path: `${__dirname}/.env` })

const DatabaseConnection = require('./src/connections/DatabaseConnection')

const ExtensionPricingHandler = require('./src/handlers/ExtensionPricingHandler')
const FrontEndDeploymentHandler = require('./src/handlers/FrontEndDeploymentHandler')

const PorkbunScrapingHandler = require('./src/handlers/scrapers/PorkbunScrapingHandler')
const NetimScrapingHandler = require('./src/handlers/scrapers/NetimScrapingHandler')
const NamecheapScrapingHandler = require('./src/handlers/scrapers/NamecheapScrapingHandler')
const One01DomainScrapingHandler = require('./src/handlers/scrapers/101DomainScrapingHandler')

;(async () => {
  const db = new DatabaseConnection()
  await db.createConnection()
  await db.closeConnection()

  let shouldUpdateCurrencyTable = true

  // Now we can start with scraping
  const scrapers = {
    Porkbun: PorkbunScrapingHandler,
    Netim: NetimScrapingHandler,
    Namecheap: NamecheapScrapingHandler,
    '101Domain': One01DomainScrapingHandler,
  }

  for (const [registrarName, ScraperClass] of Object.entries(scrapers)) {
    // Initialize a version of the ExtensionPricingHandler for this scraper
    const extensionPricingHandler = new ExtensionPricingHandler(registrarName)

    // Then initialize the scraper
    const scraper = new ScraperClass(
      extensionPricingHandler,
      shouldUpdateCurrencyTable
    )

    console.log(`Beginning scrape: ${registrarName}`)

    // And scrape
    try {
      await scraper.setPricingData()

      // Don't update the currency table after the first scrape
      shouldUpdateCurrencyTable = false
    } catch (e) {
      console.log(`Scraping aborted: ${registrarName}`)
      console.log(e.message + '\n')

      console.log(e)

      continue
    }

    console.log(`Scrape finished: ${registrarName}\n`)
  }

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
