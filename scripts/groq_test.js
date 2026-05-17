#!/usr/bin/env node

// Simple GROQ key tester. This script does NOT assume the exact API URL
// because different Groq accounts may use different endpoints. If you
// provide GROQ_API_URL in the environment, the script will attempt a
// GET to that URL with the provided key. Otherwise it prints instructions.

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = process.env.GROQ_API_URL; // optional

if (!GROQ_API_KEY) {
  console.error('Missing GROQ_API_KEY in .env');
  process.exit(1);
}

async function main() {
  if (!GROQ_API_URL) {
    console.log('GROQ_API_KEY is present. To run a live test, set GROQ_API_URL in .env and re-run.');
    return;
  }

  console.log(`Testing GROQ SDK against URL: ${GROQ_API_URL}`);

  try {
    const { groq } = await import('@ai-sdk/groq');
    const modelObj = groq('llama-3.3-70b-versatile');
    const model = typeof modelObj === 'string' ? modelObj : modelObj.modelId || String(modelObj);

    const res = await fetch(`${GROQ_API_URL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Fact check this: is the world population 7 billion, return a json true, false with a reason' }] })
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`GROQ request failed: ${res.status} ${text}`);
    }

    console.log('GROQ response:', text);
  } catch (err) {
    console.error('GROQ test failed:', err && err.message ? err.message : String(err));
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
