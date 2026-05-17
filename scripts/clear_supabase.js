#!/usr/bin/env node
/*
 * scripts/clear_supabase.js
 *
 * Safe helper to DELETE all rows from configured Supabase tables via the
 * PostgREST REST endpoints. Useful for development only. Requires a key
 * with delete permissions (service_role key recommended).
 *
 * Usage examples:
 *  SUPABASE_URL=https://your-project.supabase.co SUPABASE_KEY=your_service_role_key NODE_ENV=development node scripts/clear_supabase.js
 *  or set env vars in a .env file and run:
 *    node scripts/clear_supabase.js --yes
 */

const readline = require('readline');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLES = (process.env.SUPABASE_CLEAR_TABLES || 'debate_messages,debate_topic_presence,debate_topics').split(',').map(s => s.trim()).filter(Boolean);
const TABLE_KEYS = {
  debate_messages: ['id'],
  debate_topics: ['id'],
  debate_topic_presence: ['topic', 'session_id'],
};

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  console.error('Destructive wipes require the Supabase service-role key; the anon/publishable key cannot delete all rows.');
  process.exit(1);
}

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans); }));
}

async function deleteAllRows(table) {
  const base = SUPABASE_URL.replace(/\/+$/, '');
  const baseUrl = `${base}/rest/v1/${table}`;
  console.log(`-> Deleting all rows from table: ${table}`);

  const keyColumns = TABLE_KEYS[table] || ['id'];

  // Delete in batches by fetching the exact key columns and deleting each row explicitly.
  // This is slower than a blanket DELETE, but it is reliable and avoids leaving rows behind.
  const dryRun = process.argv.includes('--dry-run');
  let attempts = 0;
  while (attempts < 20) {
    attempts += 1;
    const select = keyColumns.join(',');
    const rowsResponse = await fetch(`${baseUrl}?select=${encodeURIComponent(select)}&limit=1000`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    const rowsText = await rowsResponse.text();
    if (!rowsResponse.ok) {
      throw new Error(`Failed reading ${table}: ${rowsResponse.status} ${rowsText}`);
    }

    const rows = JSON.parse(rowsText || '[]');
    if (!rows.length) {
      console.log(`  OK ${table}: empty`);
      return;
    }

    if (dryRun) {
      console.log(`  DRY RUN ${table}: would delete ${rows.length} row(s)`);
      for (const row of rows) {
        const preview = keyColumns.map((column) => `${column}=${JSON.stringify(row[column])}`).join(', ');
        console.log(`    - ${preview}`);
      }
      return;
    }

    for (const row of rows) {
      const filterParts = keyColumns.map((column) => `${encodeURIComponent(column)}=eq.${encodeURIComponent(row[column])}`);
      const deleteUrl = `${baseUrl}?${filterParts.join('&')}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      const deleteText = await deleteResponse.text();
      if (!deleteResponse.ok) {
        throw new Error(`Failed deleting from ${table}: ${deleteResponse.status} ${deleteText}`);
      }
    }
  }

  throw new Error(`Failed deleting ${table}: exceeded retry limit while rows still remained.`);
}

async function main() {
  console.log('Supabase clear script - will DELETE ALL ROWS from these tables:');
  TABLES.forEach(t => console.log(' -', t));

  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('Dry run mode enabled: no rows will be deleted.');
  }

  const autoYes = dryRun || process.argv.includes('--yes') || process.argv.includes('-y');
  if (!autoYes) {
    const answer = await ask('Type YES to proceed: ');
    if (answer.trim() !== 'YES') {
      console.log('Aborted. No changes made.');
      process.exit(0);
    }
  }

  for (const table of TABLES) {
    try {
      await deleteAllRows(table);
    } catch (err) {
      console.error(err.message || err);
    }
  }

  console.log('Done.');
}

main().catch(err => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
