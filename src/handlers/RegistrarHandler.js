class RegistrarHandler {
  db = null
  registrars = {}

  constructor(connection) {
    this.db = connection
  }

  async getRegistrarTable() {
    // Get the registrars from the SQL table
    const [registrarRows] = await this.db.execute('SELECT id, name FROM registrars')

    // Reformat the array into an object
    const registrars = {}

    registrarRows.forEach((row) => {
      registrars[row.name] = row.id
    })

    this.registrars = registrars
  }

  async getRegistrarId(name) {
    if (this.registrars[name]) {
      return this.registrars[name]
    }

    // If we've got this far, then the registrar doesn't currently exist in the database
    // So we need to create it
    return await this.createRegistrar(name)
  }

  async createRegistrar(name) {
    // Set it in the DB first
    const [registrarCreateRes] = await this.db.execute('INSERT INTO registrars(name) VALUES (?)', [name])

    if (registrarCreateRes.affectedRows === 0) {
      throw new Error('Cannot create registrar in DB')
    }

    const registrarId = registrarCreateRes.insertId

    // Now set it in the registrars object
    this.registrars['name'] = registrarId

    return registrarId
  }
}

module.exports = RegistrarHandler