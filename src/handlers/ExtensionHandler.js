class ExtensionHandler {
  db = null
  extensions = {}

  constructor(connection) {
    this.db = connection
  }

  async getExtensionsTable() {
    // Get the extensions from the SQL table
    const [extensionsRows] = await this.db.execute(
      'SELECT id, extension FROM extensions'
    )

    // Reformat the array into an object
    const extensions = {}

    extensionsRows.forEach(row => {
      extensions[row.extension] = row.id
    })

    this.extensions = extensions
  }

  async getExtensionId(extension) {
    if (this.extensions[extension]) {
      return this.extensions[extension]
    }

    // If we've got this far, then the extension doesn't currently exist in the database
    // So we need to create it
    return await this.createExtension(extension)
  }

  async createExtension(extension) {
    // Set it in the DB first
    const [extensionCreateRes] = await this.db.execute(
      'INSERT INTO extensions(extension) VALUES (?)',
      [extension]
    )

    if (extensionCreateRes.affectedRows === 0) {
      throw new Error('Cannot create extension in DB')
    }

    const extensionId = extensionCreateRes.insertId

    // Now set it in the extensions object
    this.extensions['name'] = extensionId

    return extensionId
  }
}

module.exports = ExtensionHandler
