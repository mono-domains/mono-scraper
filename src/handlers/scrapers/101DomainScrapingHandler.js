const { firefox } = require('playwright')
const cheerio = require('cheerio')

const BaseScrapingHandler = require('./BaseScrapingHandler')

// This name is so stupid lmao
class One01DomainScrapingHandler extends BaseScrapingHandler {
  registrarUrl = 'https://www.101domain.com/pricing.htm'
  checkedExtensions = []

  async setPricingData() {
    // Since the 101Domain pricing information is split up by letter, we have to approach
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
    await page.goto(this.registrarUrl)

    const footerNavigationHTML = await page.innerHTML('.pricelist-footer.filter-navigation')

    // So first we need to find all of the different pages of extensions so we can easily
    // loop through them. They're all contained in footerNavigation, so now have to parse them.
    const $ = cheerio.load(footerNavigationHTML)
    const footerNavigationLinks = $('.pricelist-drop--item:not(.popular_list)')

    // Then we just loop through all the ones that we want
    for (const element of footerNavigationLinks) {
      const linkId = $(element).attr('id')
      
      // Click them
      await page.click(`[id="${linkId}"]`)

      // Fetch the resulting pricing table
      const pricingTable = await page.innerHTML('.pricelist-rows:not(:empty)')

      const parsedPricingTable = this.parsePricingTable(pricingTable)

      pricingData = pricingData.concat(parsedPricingTable)
    }

    await browser.close()

    return pricingData
  }

  parsePricingTable(pricingTableHTML) {
    const $ = cheerio.load(pricingTableHTML)
    const tableRows = $('.pricelist-row')
    const pricingTable = []

    for (const row of tableRows) {
      const extensionLink = $(row).find('.pricelist-row--link')

      const extension = extensionLink.text()

      // Since there's a popular tab, some extensions can be included twice. To avoid this, we can
      // store a list of all the extensions that we've already checked and skip any that are in there.
      if (this.checkedExtensions.includes(extension)) {
        continue
      }

      const registerPrice = $(row).find('.pricelist-row--item .price-current').text()
      const renewalPrice = $(row).find('.pricelist-row--item .price-renew').text()

      const isOnSale = !!$(row).find('.on-sale').length

      const registerUrl = extensionLink.attr('href')

      pricingTable.push({
        extension,
        registerPrice: this.getNormalizedPriceString(registerPrice),
        renewalPrice: this.getNormalizedPriceString(renewalPrice),
        isOnSale,
        registerUrl
      })

      this.checkedExtensions.push(extension)
    }

    return pricingTable
  }

  getNormalizedPriceString(price) {
    // 101domain has pricing as ###.## USD, we need it as $###.##
    return `$${price.split(' ')[0]}`
  }
}

module.exports = One01DomainScrapingHandler