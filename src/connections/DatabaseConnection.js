const mysql = require('mysql2/promise')

class DatabaseConnection {
  constructor() {
    this.connection = null
  }

  async createConnection() {
    this.connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    })

    return this.connection
  }

  getConnection() {
    if (!this.connection) {
      throw new Error('Connection not initialized')
    }

    return this.connection
  }

  async closeConnection() {
    if (!this.connection) {
      throw new Error('Connection not initialized')
    }

    await this.connection.end()
    this.connection = null
  }
}

module.exports = DatabaseConnection
