'use strict';

const axios = require('axios');
const { loadCredentials, saveCredentials, clearCredentials } = require('./credentials');

const BASE_URL = process.env.INSIGHTA_API_URL || 'https://insighta-production-7e27.up.railway.app';

function createClient() {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: { 'X-API-Version': '1' },
  });

  // Attach access token on every request
  client.interceptors.request.use((config) => {
    const creds = loadCredentials();
    if (creds?.access_token) {
      config.headers['Authorization'] = `Bearer ${creds.access_token}`;
    }
    return config;
  });

  // Auto-refresh on 401
  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config;
      if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        const creds = loadCredentials();
        if (!creds?.refresh_token) {
          clearCredentials();
          console.error('\nSession expired. Please run: insighta login');
          process.exit(1);
        }
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: creds.refresh_token,
          });
          const { access_token, refresh_token } = res.data;
          saveCredentials({ ...creds, access_token, refresh_token });
          original.headers['Authorization'] = `Bearer ${access_token}`;
          return client(original);
        } catch {
          clearCredentials();
          console.error('\nSession expired. Please run: insighta login');
          process.exit(1);
        }
      }
      return Promise.reject(err);
    }
  );

  return client;
}

module.exports = { createClient, BASE_URL };
