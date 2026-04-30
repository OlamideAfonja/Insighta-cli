'use strict';

const { createClient } = require('../lib/api');

function printTable(data) {
  const Table = require('cli-table3');
  if (!data.length) { console.log('No profiles found.'); return; }
  const table = new Table({
    head: ['Name', 'Gender', 'Age', 'Age Group', 'Country', 'GP', 'CP'],
    colWidths: [24, 8, 6, 12, 10, 6, 6],
  });
  data.forEach((p) => table.push([
    p.name, p.gender, p.age, p.age_group, p.country_id,
    p.gender_probability?.toFixed(2), p.country_probability?.toFixed(2),
  ]));
  console.log(table.toString());
}

function printMeta(res) {
  const chalk = require('chalk');
  console.log(chalk.dim(`Page ${res.page}/${res.total_pages} · ${res.total} total results`));
}

async function listProfiles(opts) {
  const ora = require('ora');
  const chalk = require('chalk');
  const client = createClient();
  const spinner = ora('Fetching profiles…').start();
  try {
    const params = {};
    if (opts.gender) params.gender = opts.gender;
    if (opts.ageGroup) params.age_group = opts.ageGroup;
    if (opts.country) params.country_id = opts.country;
    if (opts.minAge) params.min_age = opts.minAge;
    if (opts.maxAge) params.max_age = opts.maxAge;
    if (opts.sortBy) params.sort_by = opts.sortBy;
    if (opts.order) params.order = opts.order;
    if (opts.page) params.page = opts.page;
    if (opts.limit) params.limit = opts.limit;
    const res = await client.get('/api/profiles', { params });
    spinner.stop();
    printMeta(res.data);
    printTable(res.data.data);
  } catch (err) {
    spinner.fail(chalk.red(err.response?.data?.message || err.message));
  }
}

async function searchProfiles(query, opts) {
  const ora = require('ora');
  const chalk = require('chalk');
  const client = createClient();
  const spinner = ora('Searching…').start();
  try {
    const params = { q: query };
    if (opts.page) params.page = opts.page;
    if (opts.limit) params.limit = opts.limit;
    const res = await client.get('/api/profiles/search', { params });
    spinner.stop();
    if (res.data.status === 'error') { console.log(chalk.yellow(res.data.message)); return; }
    printMeta(res.data);
    printTable(res.data.data);
  } catch (err) {
    spinner.fail(chalk.red(err.response?.data?.message || err.message));
  }
}

async function createProfile(opts) {
  const ora = require('ora');
  const chalk = require('chalk');
  const client = createClient();
  const spinner = ora(`Creating profile for "${opts.name}"…`).start();
  try {
    const res = await client.post('/api/profiles', { name: opts.name });
    spinner.succeed(chalk.green('Profile created!'));
    const p = res.data.data;
    console.log(`  Name:    ${p.name}`);
    console.log(`  Gender:  ${p.gender} (${p.gender_probability})`);
    console.log(`  Age:     ${p.age} (${p.age_group})`);
    console.log(`  Country: ${p.country_name} (${p.country_id})`);
  } catch (err) {
    spinner.fail(chalk.red(err.response?.data?.message || err.message));
  }
}

async function exportProfiles(opts) {
  const ora = require('ora');
  const chalk = require('chalk');
  const fs = require('fs');
  const path = require('path');
  const client = createClient();
  const spinner = ora('Exporting profiles…').start();
  try {
    const params = { format: opts.format || 'csv' };
    if (opts.gender) params.gender = opts.gender;
    if (opts.country) params.country_id = opts.country;
    const res = await client.get('/api/profiles/export', { params, responseType: 'text' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `profiles_${timestamp}.csv`;
    const dest = path.join(process.cwd(), filename);
    fs.writeFileSync(dest, res.data);
    spinner.succeed(chalk.green(`Exported to ${dest}`));
  } catch (err) {
    spinner.fail(chalk.red(err.response?.data?.message || err.message));
  }
}

module.exports = { listProfiles, searchProfiles, createProfile, exportProfiles };
