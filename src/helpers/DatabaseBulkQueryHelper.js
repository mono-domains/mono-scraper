class DatabaseBulkQueryHelper {
  queryPrefix = ''
  querySuffix = ''
  queryRows = []
  queryRowLength = null

  setPrefix(prefix) {
    this.queryPrefix = prefix
  }

  setSuffix(suffix) {
    this.querySuffix = suffix
  }

  addRow(row) {
    if (!Array.isArray(row)) {
      throw new Error('Rows must be arrays')
    }

    // If the row length isn't already set, set it. Then check against it afterwards.
    if (this.queryRowLength === null) {
      this.queryRowLength = row.length
    } else if (this.queryRowLength !== row.length) {
      throw new Error('Row length mismatch')
    }

    this.queryRows.push(row)
  }

  getQuery() {
    // So we want to make a string which will include a ? for each item in each row
    // For example, if we're inputting 2 items, this string needs to be (?, ?)
    const singleRowParam = `(${Array(this.queryRowLength).fill('?').join(', ')})`

    // Now we want to multiply the string above by the length of the rows, so if there
    // were 3 rows it'd be (?, ?), (?, ?), (?, ?)
    const allParams = Array(this.queryRows.length).fill(singleRowParam).join(', ')

    // Now we can put everything together along with the prefix and suffix
    const query = `${this.queryPrefix} ${allParams} ${this.querySuffix}`

    // Then finally we want to flatten out the rows to get what we pass into the db execute function
    const flattenedRows = this.queryRows.flat()

    // And we can return the two
    return {
      query,
      params: flattenedRows,
      numberOfRows: this.queryRows.length
    }
  }
}

module.exports = DatabaseBulkQueryHelper