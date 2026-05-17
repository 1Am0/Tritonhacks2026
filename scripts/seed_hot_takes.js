#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const HELP_TEXT = `Usage:
  node scripts/seed_hot_takes.js [--count 1000] [--batch 100] [--author "Hot Take Bot"]

Options:
  --count <n>    Number of sample topics to insert (default: 1000)
  --batch <n>    Batch size per request (default: 100)
  --author <s>   Author name for inserted rows (default: Hot Take Bot)
  --dry-run      Generate topics but do not insert
  --help         Show this help
`;

function parseArgs(argv) {
  const args = {
    count: 1000,
    batch: 100,
    author: 'Hot Take Bot',
    dryRun: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      args.help = true;
      continue;
    }
    if (a === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (a === '--count') {
      args.count = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--batch') {
      args.batch = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--author') {
      args.author = String(argv[i + 1] || '').trim() || args.author;
      i += 1;
      continue;
    }
  }

  return args;
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildTopic(seed) {
  const intros = [
    'Hot take:',
    'Unpopular opinion:',
    'Debate this:',
    'Controversial claim:',
    'Spicy take:',
    'Bold stance:',
  ];

  const subjects = [
    'AI tools in classrooms',
    'remote work policies',
    'social media regulation',
    'college admissions standards',
    'professional sports officiating',
    'streaming service pricing',
    'city public transit funding',
    'cryptocurrency adoption',
    'electric vehicle mandates',
    'video game monetization',
    'climate policy timelines',
    'healthcare pricing transparency',
    'universal basic income',
    'school uniforms',
    'homework in high school',
    'standardized testing',
    'space exploration budgets',
    'food delivery apps',
    'minimum wage laws',
    'privacy laws for apps',
  ];

  const predicates = [
    'should be mandatory nationwide',
    'is doing more harm than good',
    'is overrated by the public',
    'should be left to local governments',
    'needs stricter oversight immediately',
    'benefits wealthy groups the most',
    'is the best investment this decade',
    'should be optional, not required',
    'deserves a complete policy reset',
    'will improve outcomes long-term',
  ];

  const closers = [
    'Change my mind.',
    'Prove me wrong.',
    'Convince me otherwise.',
    'Let us debate it.',
    'Where do you stand?',
    'Agree or disagree?',
  ];

  const intro = randomPick(intros);
  const subject = randomPick(subjects);
  const predicate = randomPick(predicates);
  const closer = randomPick(closers);

  return `${intro} ${subject} ${predicate}. ${closer} (#${seed})`;
}

function generateTopics(count) {
  const rows = [];
  for (let i = 1; i <= count; i += 1) {
    rows.push(buildTopic(i));
  }
  return rows;
}

async function insertBatch(supabaseUrl, supabaseKey, tableName, author, topics) {
  const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/${tableName}`;
  const payload = topics.map((topic) => ({ author, topic }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert failed (${res.status}): ${text}`);
  }

  return payload.length;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (!Number.isFinite(args.count) || args.count <= 0) {
    throw new Error('--count must be a positive number');
  }
  if (!Number.isFinite(args.batch) || args.batch <= 0) {
    throw new Error('--batch must be a positive number');
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const SUPABASE_TABLE = process.env.SUPABASE_SEED_TABLE || 'debate_topics';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env');
  }

  const topics = generateTopics(args.count);

  if (args.dryRun) {
    console.log(`Generated ${topics.length} topics (dry run).`);
    console.log('Example topics:');
    topics.slice(0, 5).forEach((t) => console.log(`- ${t}`));
    return;
  }

  let inserted = 0;
  for (let i = 0; i < topics.length; i += args.batch) {
    const chunk = topics.slice(i, i + args.batch);
    const count = await insertBatch(SUPABASE_URL, SUPABASE_KEY, SUPABASE_TABLE, args.author, chunk);
    inserted += count;
    console.log(`Inserted ${inserted}/${topics.length} topics...`);
  }

  console.log(`Done. Inserted ${inserted} topics into ${SUPABASE_TABLE}.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
