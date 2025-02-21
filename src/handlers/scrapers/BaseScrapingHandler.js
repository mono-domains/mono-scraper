class BaseScrapingHandler {
  extensionPricingHandler = null

  constructor(extensionPricingHandler) {
    this.extensionPricingHandler = extensionPricingHandler
  }

  async setPricingData() {
    // First we fetch the pricing table HTML
    const pricingTableHTML = await this.getPricingTableHTML()

    // Now parse it into a JS array
    const pricingTable = this.parsePricingTable(pricingTableHTML)

    // Now pass it into the extensionPricingHandler to add it to the db
    await this.extensionPricingHandler.setPricingTableInDatabase(pricingTable)
  }
}

module.exports = BaseScrapingHandler
