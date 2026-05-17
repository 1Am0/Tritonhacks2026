#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const topic = process.argv[2];
if (!topic) {
  console.error('Usage: node scripts/analyze_debate.js "<debate topic>"');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or Supabase key in .env');
  process.exit(1);
}

if (!GOOGLE_API_KEY) {
  console.error('Missing GOOGLE_API_KEY in .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

async function fetchJson(pathname) {
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${pathname}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase request failed: ${res.status} ${text}`);
  }

  return JSON.parse(text || '[]');
}

function stripCodeFences(text) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

async function main() {
  let messages;
  let participants;

  try {
    [messages, participants] = await Promise.all([
      fetchJson(`debate_messages?select=id,topic,author,message,created_at,session_id&topic=eq.${encodeURIComponent(topic)}&order=created_at.asc`),
      fetchJson(`debate_topic_presence?select=session_id,display_name,stance,last_seen&topic=eq.${encodeURIComponent(topic)}`),
    ]);
  } catch (err) {
    const message = String(err && err.message ? err.message : err);
    if (message.includes('debate_topic_presence.stance does not exist') || message.includes('42703')) {
      console.error('Missing stance column in debate_topic_presence. Run DEBATE_AI_SQL.sql first.');
      process.exit(1);
    }
    throw err;
  }

  if (!messages.length) {
    console.log(JSON.stringify({ topic, participants: [], summary: 'No messages found.' }, null, 2));
    return;
  }

  const prompt = `You are scoring a live debate.
Topic: ${topic}

Participants:
${JSON.stringify(participants, null, 2)}

Messages in order:
${JSON.stringify(messages, null, 2)}

Task:
- For each participant, estimate how persuaded they appear to be by the opposing side.
- Return a percentage from 0 to 100 for each participant, where 0 = not moved at all and 100 = fully moved.
- Use the participant's explicit stance if present. If stance is missing, infer it from the conversation.
- Identify the current winner as the participant whose arguments appear to be persuading others the most.
- Return JSON only in this shape:
{
  "topic": "...",
  "winner_session_id": "...",
  "winner_display_name": "...",
  "summary": "...",
  "participants": [
    {
      "session_id": "...",
      "display_name": "...",
      "stance": "agree|disagree|null",
      "moved_percentage": 0,
      "reason": "..."
    }
  ]
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const rawText = response.text || '';
  const parsed = JSON.parse(stripCodeFences(rawText));
  console.log(JSON.stringify(parsed, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
