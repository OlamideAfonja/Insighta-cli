#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const { login } = require('./commands/login');
const { loadCredentials, clearCredentials } = require('./lib/credentials');
const { createClient } = require('./lib/api');
const { listProfiles, searchProfiles, createProfile, exportProfiles } = require('./commands/profiles');

const program = new Command();

program
  .name('insighta')
  .description('Insighta Labs CLI')
  .version('1.0.0');

// ── Auth ──────────────────────────────────────────────────────────────────────
program
  .command('login')
  .description('Authenticate with GitHub')
  .action(async () => { await login(); });

program
  .command('logout')
  .description('Log out and clear credentials')
  .action(async () => {
    const chalk = require('chalk');
    const creds = loadCredentials();
    if (creds?.refresh_token) {
      try {
        const client = createClient();
        await client.post('/auth/logout', { refresh_token: creds.refresh_token });
      } catch { /* ignore */ }
    }
    clearCredentials();
    console.log(chalk.green('✅  Logged out.'));
  });

program
  .command('whoami')
  .description('Show current user')
  .action(async () => {
    const chalk = require('chalk');
    const creds = loadCredentials();
    if (!creds) { console.log(chalk.yellow('Not logged in. Run: insighta login')); return; }
    try {
      const client = createClient();
      const res = await client.get('/auth/me');
      const u = res.data.data;
      console.log(`@${u.username} · ${u.role} · ${u.email || 'no email'}`);
    } catch (err) {
      console.error(chalk.red(err.response?.data?.message || err.message));
    }
  });

// ── Profiles ──────────────────────────────────────────────────────────────────
const profiles = program.command('profiles').description('Profile operations');

profiles
  .command('list')
  .description('List profiles with optional filters')
  .option('--gender <gender>', 'Filter by gender')
  .option('--age-group <group>', 'Filter by age group')
  .option('--country <code>', 'Filter by country_id')
  .option('--min-age <n>', 'Minimum age')
  .option('--max-age <n>', 'Maximum age')
  .option('--sort-by <field>', 'Sort field: age | created_at | gender_probability')
  .option('--order <dir>', 'asc or desc')
  .option('--page <n>', 'Page number')
  .option('--limit <n>', 'Results per page')
  .action(listProfiles);

profiles
  .command('search <query>')
  .description('Natural language search')
  .option('--page <n>', 'Page number')
  .option('--limit <n>', 'Results per page')
  .action(searchProfiles);

profiles
  .command('create')
  .description('Create a new profile (admin only)')
  .requiredOption('--name <name>', 'Full name')
  .action(createProfile);

profiles
  .command('export')
  .description('Export profiles to CSV')
  .option('--format <fmt>', 'Export format (csv)', 'csv')
  .option('--gender <gender>', 'Filter by gender')
  .option('--country <code>', 'Filter by country_id')
  .action(exportProfiles);

program.parse(process.argv);
