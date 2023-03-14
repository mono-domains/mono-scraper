const { firefox } = require('playwright')
const cheerio = require('cheerio')

const BaseScrapingHandler = require('./BaseScrapingHandler')

class GoogleDomainsScrapingHandler extends BaseScrapingHandler {
  registrarUrl = 'https://domains.google/get-started/domain-search/'

  async getPricingTableHTML() {
    const browser = await firefox.launch()
    const context = await browser.newContext()

    const page = await context.newPage()
    await page.goto(this.registrarUrl)

    await page.click('.price-list__show-more')

    const pricingTable = await page.innerHTML('.price-list__content__grid--show-all')

    await browser.close()

    return pricingTable
  }

  parsePricingTable(pricingTableHTML) {
    const $ = cheerio.load(pricingTableHTML)
    const pricingTable = []

    $('.price-list__card').each((i, element) => {
      const extension = $(element).find('.price-list__card__tld').text()

      const registerPrice = $(element).find('.price-list__card__price').text()
      const renewalPrice = null

      const isOnSale = false

      const registerUrl = $(element).attr('href')

      pricingTable.push({
        extension,
        registerPrice,
        renewalPrice,
        isOnSale,
        registerUrl: registerUrl ? `https://domains.google${registerUrl}` : this.registrarUrl
      })
    })

    return pricingTable
  }
}

module.exports = GoogleDomainsScrapingHandler