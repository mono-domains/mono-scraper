class BaseScrapingHandler {
  extensionPricingHandler = null
  shouldUpdateCurrencyTable = true

  constructor(extensionPricingHandler, shouldUpdateCurrencyTable) {
    this.extensionPricingHandler = extensionPricingHandler
    this.shouldUpdateCurrencyTable = shouldUpdateCurrencyTable
  }

  async setPricingData() {
    // First we fetch the pricing table HTML
    const pricingTableHTML = await this.getPricingTableHTML()

    // Now parse it into a JS array
    const pricingTable = this.parsePricingTable(pricingTableHTML)

    // Now pass it into the extensionPricingHandler to add it to the db
    await this.extensionPricingHandler.setPricingTableInDatabase(
      pricingTable,
      this.shouldUpdateCurrencyTable
    )
  }
}

module.exports = BaseScrapingHandler
