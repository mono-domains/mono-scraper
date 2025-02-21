const axios = require('axios')

const SSHConnection = require('../connections/SSHConnection')

class FrontEndDeploymentHandler {
  async deployFrontEnd() {
    try {
      await this.deployFrontEndNetlify()
    } catch (e) {
      try {
        await this.deployFrontEndSSH()
      } catch (e) {
        throw new Error('No front end deployment method set')
      }
    }
  }

  async deployFrontEndNetlify() {
    if (!process.env.NETLIFY_BUILD_HOOK_URL) {
      throw new Error('Netlify Build Hook URL not set')
    }

    await axios({
      url: process.env.NETLIFY_BUILD_HOOK_URL,
      method: 'POST',
    })
  }

  async deployFrontEndSSH() {
    // Create a new connection to the FE server
    const ssh = new SSHConnection()
    const connection = await ssh.getConnection()

    // Run the build command
    const { stderr } = await connection.execCommand(
      'source ~/.nvm/nvm.sh && npm run generate',
      {
        cwd: '/usr/share/nginx/html',
      }
    )

    if (stderr && !stderr.startsWith('WARN')) {
      throw new Error(stderr)
    }

    // Disconnect
    connection.dispose()
  }
}

module.exports = FrontEndDeploymentHandler
