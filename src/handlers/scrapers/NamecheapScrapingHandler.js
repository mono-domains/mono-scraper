const { firefox } = require('playwright')
const cheerio = require('cheerio')

const BaseScrapingHandler = require('./BaseScrapingHandler')

class NamecheapScrapingHandler extends BaseScrapingHandler {
  registrarUrl = 'https://www.namecheap.com/domains/domain-name-search/'

  async getPricingTableHTML() {
    const browser = await firefox.launch()
    const context = await browser.newContext()

    const page = await context.newPage()

    try {
      await page.goto(this.registrarUrl)

      await page.click('.gb-btn-show-more')

      await page.waitForSelector('.gb-tld-name[href="/domains/registration/gtld/zone/"]')

      const pricingTable = await page.innerHTML('.gb-domain-name-search--pricing')

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

    $('tbody').each((i, tbody) => {
      $(tbody).find('tr').each((i, element) => {
        const extension = $(element).find('.gb-tld-name').text()

        const registerPrice = $(element).find('.gb-price:first-child').text()
        const renewalPrice = $(element).find('.gb-price:last-child > span').text()

        // In case the prices aren't set, skip this one
        if (!registerPrice || !renewalPrice) {
          return
        }

        const isOnSale = !!$(element).find('.gb-label--sale').length

        const registerUrl = $(element).find('.gb-tld-name').attr('href')

        pricingTable.push({
          extension,
          registerPrice,
          renewalPrice,
          isOnSale,
          registerUrl: registerUrl ? `https://www.namecheap.com${registerUrl}` : this.registrarUrl
        })
      })
    })

    return pricingTable
  }
}

module.exports = NamecheapScrapingHandler