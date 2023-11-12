require('dotenv').config({ path: `../.env` })
const parseArgs = require('minimist')

const DatabaseConnection = require('../src/connections/DatabaseConnection')

const RegistrarHandler = require('../src/handlers/RegistrarHandler')
const ExtensionPricingHandler = require('../src/handlers/ExtensionPricingHandler')

;(async () => {
  const arguments = parseArgs(process.argv.slice(2))

  const database = new DatabaseConnection()
  const connection = await database.createConnection()

  // Let's get all the handlers together
  const registrarHandler = new RegistrarHandler(connection)

  // Fetch a list of all the registrars
  await registrarHandler.getRegistrarTable()
  const registrarList = Object.keys(registrarHandler.registrars)

  // Check whether the one passed in actually exists
  if (!registrarList.includes(arguments.registrar)) {
    console.log('Invalid registrar.')
    return
  }

  // Initialize a version of the ExtensionPricingHandler for this scraper
  const extensionPricingHandler = new ExtensionPricingHandler(
    arguments.registrar,
    connection,
    null,
    registrarHandler,
    null
  )

  // Then delete it
  await extensionPricingHandler.clearPricingTableInDatabase()

  console.log(`All pricing items for ${arguments.registrar} have been deleted.`)
})()