const axios = require('axios')

class ExchangeRateApiConnection {
  async getExchangeRateData() {
    const { data } = await axios.get(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/latest/USD`)

    if(data.result !== 'success') {
      throw new Error('Error fetching currency API')
    }

    return data.conversion_rates
  }
}

module.exports = ExchangeRateApiConnection