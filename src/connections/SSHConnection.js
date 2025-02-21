const { NodeSSH } = require('node-ssh')

class SSHConnection {
  async getConnection() {
    const ssh = new NodeSSH()

    // Connect to the server
    await ssh.connect({
      host: process.env.SSH_SERVER_IP,
      username: process.env.SSH_USERNAME,
      password: process.env.SSH_PASSWORD,
      privateKeyPath: process.env.SSH_PRIVKEY_PATH,
      passphrase: process.env.SSH_PRIVKEY_PASSPHRASE,
    })

    return ssh
  }
}

module.exports = SSHConnection
