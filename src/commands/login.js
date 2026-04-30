'use strict';

const http = require('http');
const crypto = require('crypto');
const { saveCredentials } = require('../lib/credentials');
const { BASE_URL } = require('../lib/api');

function base64URLEncode(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest();
}

async function login() {
  const chalk = require('chalk');
  const ora = require('ora');
  const open = require('open');

  const PORT = 9876;
  const state = base64URLEncode(crypto.randomBytes(16));
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(codeVerifier));
  const redirectUri = `http://localhost:${PORT}/callback`;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      if (url.pathname !== '/callback') {
        res.end('Not found'); return;
      }

      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      const username = url.searchParams.get('username');
      const error = url.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>✅ Login successful! You can close this tab.</h2></body></html>');
      server.close();

      if (error || !accessToken) {
        console.error(chalk.red('\n❌  Login failed:', error || 'No token received'));
        reject(new Error('Login failed'));
        return;
      }

      saveCredentials({ access_token: accessToken, refresh_token: refreshToken, username });
      console.log(chalk.green(`\n✅  Logged in as @${username}`));
      resolve();
    });

    server.listen(PORT, async () => {
      const authUrl = `${BASE_URL}/auth/github?state=${state}&code_challenge=${codeChallenge}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const spinner = ora('Opening GitHub login in your browser…').start();
      await open(authUrl);
      spinner.succeed('Browser opened. Waiting for authentication…');
    });

    server.on('error', reject);

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      console.error(chalk.red('\n❌  Login timed out. Try again.'));
      process.exit(1);
    }, 2 * 60 * 1000);
  });
}

module.exports = { login };
