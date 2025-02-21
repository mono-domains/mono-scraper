const { firefox } = require('playwright')
const cheerio = require('cheerio')

const BaseScrapingHandler = require('./BaseScrapingHandler')

class PorkbunScrapingHandler extends BaseScrapingHandler {
  registrarUrl = 'https://porkbun.com/products/domains'

  async getPricingTableHTML() {
    const browser = await firefox.launch()
    const context = await browser.newContext()

    const page = await context.newPage()

    try {
      await page.goto(this.registrarUrl)

      const pricingTable = await page.innerHTML(
        '#domainsPricingAllExtensionsContainer'
      )

      await browser.close()

      return pricingTable
    } catch (e) {
      await browser.close()

      throw e
    }
  }

  parsePricingTable(pricingTableHTML) {
    const $ = cheerio.load(pricingTableHTML)
    const pricingTable = []

    $('.domainsPricingAllExtensionsItem').each((i, element) => {
      const extension = $(element).find('.col-xs-3 a').text()

      const registrationCell = $(element).find(
        '.domainsPricingAllExtensionsItemPrice.registration'
      )

      const registerPrice = registrationCell.find('.sortValue').text()
      const renewalPrice = $(element)
        .find('.domainsPricingAllExtensionsItemPrice.renewal .sortValue')
        .text()

      const isOnSale = !!registrationCell.find('.text-muted').length

      const registerUrl = $(element).find('.col-xs-3 a').attr('href')

      pricingTable.push({
        extension,
        registerPrice: `$${registerPrice}`,
        renewalPrice: `$${renewalPrice}`,
        isOnSale,
        registerUrl: `https://porkbun.com${registerUrl}`,
      })
    })

    return pricingTable
  }
}

module.exports = PorkbunScrapingHandler
