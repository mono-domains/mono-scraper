const { firefox } = require('playwright')
const cheerio = require('cheerio')

const BaseScrapingHandler = require('./BaseScrapingHandler')

class GandiScrapingHandler extends BaseScrapingHandler {
  registrarUrl = 'https://www.gandi.net/en-US/domain/tld'

  async setPricingData() {
    // Since the Gandi pricing information is also split up by letter, we have to approach
    // scraping the information slightly differently
    const pricingTable = await this.getPricingData()

    // Now pass it into the extensionPricingHandler to add it to the db
    await this.extensionPricingHandler.setPricingTableInDatabase(pricingTable)
  }

  async getPricingData() {
    let pricingData = []

    const browser = await firefox.launch()
    const context = await browser.newContext()

    const page = await context.newPage()
    await page.goto(`${this.registrarUrl}?prefix=xn--#tld-table`)

    // Before we do anything, let's parse the pricing table for the IDNs, since we've already got the page
    const idnPricingTableHTML = await page.innerHTML('.comparative-block')
    const idnPricingTable = this.parsePricingTable(idnPricingTableHTML)

    pricingData = pricingData.concat(idnPricingTable)

    // So now we want to get a list of all the extension categories, excluding the one we're on currently
    const filterCategoriesHTML = await page.innerHTML('#extension-table-filters')

    // Then we want to parse it to get all the categories
    const $ = cheerio.load(filterCategoriesHTML)
    const filterCategories = $('.extended-domain-table__filter:not(.extended-domain-table__filter--active)')

    // Now we've got these, we can loop through them all
    for (const category of filterCategories) {
      // Get their links
      const categoryLink = $(category).attr('href')

      // Navigate to those links
      await page.goto(this.registrarUrl + categoryLink)

      // Get the pricing table
      const pricingTableHTML = await page.innerHTML('.comparative-block')

      // Then parse it, and add it on to the rest
      const pricingTable = this.parsePricingTable(pricingTableHTML)

      pricingData = pricingData.concat(pricingTable)
    }

    await browser.close()

    return pricingData
  }

  parsePricingTable(pricingTableHTML) {
    const $ = cheerio.load(pricingTableHTML)
    const pricingTable = []

    $('.comparative-table__body').each((i, tbody) => {
      $(tbody).find('tr').each((i, row) => {
        const extensionLink = $(row).find('.comparative-table__cell--tld a')

        const extension = extensionLink.text()

        const registerPrice = $(row).find('.comparative-table__cell:nth-child(2) .comparative-table__price').text()
        const renewalPrice = $(row).find('.comparative-table__cell:nth-child(4) .comparative-table__price').text()

        // If the registerPrice isn't set then it's not for sale, so skip it
        if (!registerPrice) {
          return
        }

        const isOnSale = !!$(row).find('.badge--promo').length

        const registerUrl = extensionLink.attr('href')

        pricingTable.push({
          extension,
          registerPrice,
          renewalPrice,
          isOnSale,
          registerUrl: `https://www.gandi.net${registerUrl}`
        })
      })
    })

    return pricingTable
  }
}

module.exports = GandiScrapingHandler