#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Deprecated: replaced by scripts/groq_test.js
console.log('This test script has been replaced by scripts/groq_test.js.');
console.log('Run `node scripts/groq_test.js` and set GROQ_API_URL in .env for a live test.');
