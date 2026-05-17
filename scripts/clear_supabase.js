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
// Default clear order: remove dependent rows first, then parent/topic rows.
const TABLES = (process.env.SUPABASE_CLEAR_TABLES || 'debate_messages,debate_ai_requests,debate_ai_results,debate_topic_presence,debate_topics').split(',').map(s => s.trim()).filter(Boolean);

// Fallback filter for tables without a numeric `id` column.
// Use a column we know exists in each table.
const TABLE_FALLBACK_FILTER = {
  debate_ai_requests:    'requested_at=gte.1970-01-01',
  debate_ai_results:     'updated_at=gte.1970-01-01',
  debate_topic_presence: 'last_seen=gte.1970-01-01',
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
  const dryRun = process.argv.includes('--dry-run');

  console.log(`-> Deleting all rows from table: ${table}`);

  if (dryRun) {
    console.log(`  DRY RUN ${table}: would delete all rows`);
    return;
  }

  // PostgREST requires a filter to allow DELETE. Using `id=gte.0` is the
  // common workaround, but the most universal approach is to use the
  // "not is null" filter on a column that always exists. We use the
  // Prefer: return=minimal header to avoid fetching deleted rows back.
  const deleteUrl = `${base}/rest/v1/${table}?id=gte.0`;
  let response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal'
    }
  });

  // Some tables may not have a numeric `id` column (e.g. composite-key tables).
  // Fall back to a per-table known column filter.
  if (!response.ok && TABLE_FALLBACK_FILTER[table]) {
    const fallbackUrl = `${base}/rest/v1/${table}?${TABLE_FALLBACK_FILTER[table]}`;
    response = await fetch(fallbackUrl, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: 'return=minimal'
      }
    });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed deleting from ${table}: ${response.status} ${text}`);
  }

  console.log(`  OK ${table}: all rows deleted`);
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