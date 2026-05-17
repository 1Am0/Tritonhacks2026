# Gemini / Generative API Test

This repository includes a small Node script that can call the Google Generative AI API (Gemini / Text-Bison) using an API key provided via environment variables.

Files added
- `scripts/gemini_test.js` — CLI script that sends a prompt to the configured model and prints the response.

Usage
1. Install Node (v18+) if you don't already have it.
2. Set your API key in the environment (do NOT commit your secret to the repo):

```bash
export GOOGLE_API_KEY="YOUR_API_KEY_HERE"
# or
export GEMINI_API_KEY="YOUR_API_KEY_HERE"
```

3. Run the script with a prompt:

```bash
node scripts/gemini_test.js "Write a short test message about debate live chat"
```

Notes & security
- The script sends the API key as a query parameter (the Generative API also supports OAuth bearer tokens). Keep the key secret.
- Default model is `text-bison-001`. To change it, set `GEMINI_MODEL` environment variable.
- This is a simple test harness — adapt request shape for different models (chat-style models use `messages` instead of `prompt`).
