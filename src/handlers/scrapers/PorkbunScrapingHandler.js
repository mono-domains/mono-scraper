const { firefox } = require('playwright')
const cheerio = require('cheerio')

class PorkbunScrapingHandler {
  extensionPricingHandler = null
  registrarUrl = 'https://porkbun.com/products/domains'

  constructor(extensionPricingHandler) {
    this.extensionPricingHandler = extensionPricingHandler
  }

  async setPricingData() {
    // First we fetch the pricing table HTML from Porkbun
    const pricingTableHTML = await this.getPricingTableHTML()

    // Now parse it into a JS array
    const pricingTable = this.parsePricingTable(pricingTableHTML)

    // Now pass it into the extensionPricingHandler to add it to the db
    await this.extensionPricingHandler.setPricingTableInDatabase(pricingTable)
  }

  async getPricingTableHTML() {
    const browser = await firefox.launch()
    const context = await browser.newContext()

    const page = await context.newPage()
    await page.goto(this.registrarUrl)

    const pricingTable = await page.innerHTML('#domainsPricingAllExtensionsContainer')

    await browser.close()

    return pricingTable
  }

  parsePricingTable(pricingTableHTML) {
    const $ = cheerio.load(pricingTableHTML)
    const pricingTable = []

    $('.domainsPricingAllExtensionsItem').each(function() {
      const extension = $(this).find('.col-xs-3 a').text()

      const registrationCell = $(this).find('.domainsPricingAllExtensionsItemPrice.registration')

      const registerPrice = registrationCell.find('.sortValue').text();
      const renewalPrice = $(this).find('.domainsPricingAllExtensionsItemPrice.renewal .sortValue').text();

      const isOnSale = !!registrationCell.find('.text-muted').length

      const registerUrl = $(this).find('.col-xs-3 a').attr('href')

      pricingTable.push({
        extension,
        registerPrice: `$${registerPrice}`,
        renewalPrice: `$${renewalPrice}`,
        isOnSale,
        registerUrl: `https://porkbun.com${registerUrl}`
      })
    })

    return pricingTable
  }
}

module.exports = PorkbunScrapingHandler