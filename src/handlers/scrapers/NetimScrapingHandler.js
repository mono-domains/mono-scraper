const { firefox } = require('playwright')
const cheerio = require('cheerio')

class NetimScrapingHandler {
  extensionPricingHandler = null
  registrarUrl = 'https://www.netim.com/en/domain-name/extensions-list'

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

    const pricingTable = await page.innerHTML('.contour-tableau')

    await browser.close()

    return pricingTable
  }

  parsePricingTable(pricingTableHTML) {
    const $ = cheerio.load(pricingTableHTML)
    const pricingTable = []

    $('.row-parent').each((i, element) => {
      const extension = $(element).find('.extension a').text()

      const registrationCell = $(element).find('.row-parent_item--4')
      const renewalCell = $(element).find('.row-parent_item--5')

      const { price: registerPrice, isOnSale } = this.getPriceAndIsOnSaleFromCell(registrationCell)

      const { price: renewalPrice } = this.getPriceAndIsOnSaleFromCell(renewalCell)

      const registerUrl = $(element).find('.extension a').attr('href')

      pricingTable.push({
        extension,
        registerPrice,
        renewalPrice,
        isOnSale,
        registerUrl: `https://www.netim.com${registerUrl}`
      })
    })

    return pricingTable
  }

  getPriceAndIsOnSaleFromCell(cell) {
    let price = cell.text()
    let isOnSale = false

    if (cell.find('.old-price.text-muted').length) {
      price = cell.find('.new-price').text()
      isOnSale = true
    }

    return {
      price,
      isOnSale
    }
  }
}

module.exports = NetimScrapingHandler