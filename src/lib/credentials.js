'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CREDS_DIR = path.join(os.homedir(), '.insighta');
const CREDS_FILE = path.join(CREDS_DIR, 'credentials.json');

function loadCredentials() {
  try {
    if (!fs.existsSync(CREDS_FILE)) return null;
    return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function saveCredentials(data) {
  fs.mkdirSync(CREDS_DIR, { recursive: true });
  fs.writeFileSync(CREDS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function clearCredentials() {
  if (fs.existsSync(CREDS_FILE)) fs.unlinkSync(CREDS_FILE);
}

module.exports = { loadCredentials, saveCredentials, clearCredentials };
