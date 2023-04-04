const SSHConnection = require('../connections/SSHConnection')

class FrontEndDeploymentHandler {
  async deployFrontEnd() {
    // Create a new connection to the FE server
    const ssh = new SSHConnection()
    const connection = await ssh.getConnection()

    // Run the build command
    const { stderr } = await connection.execCommand('source ~/.nvm/nvm.sh && npm run generate', {
      cwd: '/usr/share/nginx/html'
    })

    if (stderr && !stderr.startsWith('WARN')) {
      throw new Error(stderr)
    }

    // Disconnect
    connection.dispose()
  }
}

module.exports = FrontEndDeploymentHandler