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
const fetch = globalThis.fetch || require('node-fetch');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const TABLES = (process.env.SUPABASE_CLEAR_TABLES || 'debate_messages,debate_topic_presence,debate_topics').split(',').map(s => s.trim()).filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY environment variables.');
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

  // First try naive delete (may fail if PostgREST requires a WHERE clause)
  let res = await fetch(baseUrl, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  let text = await res.text();
  if (res.ok) {
    console.log(`  OK ${table}: ${res.status} ${text ? '- ' + text : ''}`);
    return;
  }

  // If PostgREST rejects DELETE without WHERE, try safe fallback filters
  if (res.status === 400 && /DELETE requires a WHERE clause/i.test(text)) {
    const fallbackFields = ['id', 'session_id', 'topic', 'created_at'];
    for (const field of fallbackFields) {
      const url = `${baseUrl}?${encodeURIComponent(field)}=not.is.null`;
      try {
        const r2 = await fetch(url, {
          method: 'DELETE',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });
        const t2 = await r2.text();
        if (r2.ok) {
          console.log(`  OK ${table} via filter ${field}=not.is.null: ${r2.status} ${t2 ? '- ' + t2 : ''}`);
          return;
        }
        // continue trying other fields
      } catch (err) {
        // ignore and try next
      }
    }
    throw new Error(`Failed deleting ${table}: PostgREST requires a WHERE clause and no fallback filter worked.`);
  }

  // Other non-OK responses
  throw new Error(`Failed deleting ${table}: ${res.status} ${text}`);
}

async function main() {
  console.log('Supabase clear script - will DELETE ALL ROWS from these tables:');
  TABLES.forEach(t => console.log(' -', t));

  const autoYes = process.argv.includes('--yes') || process.argv.includes('-y');
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
