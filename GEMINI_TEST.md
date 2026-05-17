# GROQ Test

This repository includes a small Node script that can call a GROQ endpoint using an API key provided via environment variables.

Files of interest
- `scripts/groq_test.js` — CLI script that checks `GROQ_API_KEY` and will attempt a GET/POST to `GROQ_API_URL` when configured.

Usage
1. Install Node (v18+) if you don't already have it.
2. Set your GROQ variables in the environment (do NOT commit your secret to the repo):

```bash
export GROQ_API_KEY="YOUR_GROQ_KEY"
export GROQ_API_URL="https://api.groq.ai/v1/your-endpoint"
```

3. Run the test script:

```bash
node scripts/groq_test.js
```

Notes & security
- The script sends the API key in the `Authorization` header. Keep the key secret.
- Set the correct `GROQ_API_URL` for your account before running the live request; endpoints vary by account.
- This is a simple test harness — adapt the request shape if your GROQ endpoint expects a different payload.
