class DateHelper {
  getSQLFormattedDate(date) {
    // To insert into a SQL database, the date has to be in the following format:
    // 2021-05-30 15:48:50
    const monthString = String(date.getMonth()).padStart(2, '0')
    const dateString = String(date.getDate()).padStart(2, '0')

    const hoursString = String(date.getHours()).padStart(2, '0')
    const minutesString = String(date.getMinutes()).padStart(2, '0')
    const secondsString = String(date.getSeconds()).padStart(2, '0')

    const formattedDateString = `${date.getFullYear()}-${monthString}-${dateString} ${hoursString}:${minutesString}:${secondsString}`

    return formattedDateString
  }
}

module.exports = DateHelper