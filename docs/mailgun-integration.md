Mailgun integration

This repository includes a small test endpoint at `src/pages/api/mailgun-test.ts` to exercise Mailgun's HTTP API.

Environment variables (do not commit your API keys):

- MAILGUN_API_KEY — your Mailgun API key (starts with `api-` or similar)
- MAILGUN_DOMAIN — the Mailgun sending domain (e.g. `sandboxXXX.mailgun.org`)

Local test (macOS / Linux):

1. Set env vars in your shell (zsh):

```bash
export MAILGUN_API_KEY="your-mailgun-api-key"
export MAILGUN_DOMAIN="sandbox31cad4b05de247c098d2f738330ed77a.mailgun.org"
```

2. Start Next.js dev server:

```bash
npm run dev
```

3. Send a test request (replace recipient email):

Option A — create `.env.local` from exported environment variables (recommended):

```bash
# export the secrets into your shell first
export MAILGUN_API_KEY="YOUR_REAL_MAILGUN_API_KEY"
export MAILGUN_DOMAIN="sandbox31cad4b05de247c098d2f738330ed77a.mailgun.org"
export MAILGUN_TEST_TOKEN="some-secret-token"

# then run the provided helper script to write .env.local
./scripts/write-env-local.sh

# restart dev server and run curl (include header if you set MAILGUN_TEST_TOKEN)
curl -X POST http://localhost:9002/api/mailgun-test \
  -H "Content-Type: application/json" \
  -H "X-MAILGUN-TEST-TOKEN: some-secret-token" \
  -d '{"to":"you@example.com","subject":"Test","text":"Hello from Docuflow"}'
```

Option B — export variables for the current session (temporary):

```bash
export MAILGUN_API_KEY="YOUR_REAL_MAILGUN_API_KEY"
export MAILGUN_DOMAIN="sandbox31cad4b05de247c098d2f738330ed77a.mailgun.org"
export MAILGUN_TEST_TOKEN="some-secret-token"

curl -X POST http://localhost:9002/api/mailgun-test \
  -H "Content-Type: application/json" \
  -H "X-MAILGUN-TEST-TOKEN: some-secret-token" \
  -d '{"to":"you@example.com","subject":"Test","text":"Hello from Docuflow"}'
```

Notes:
- The endpoint performs a server-side request to Mailgun; keep your API key secret.
- The repo also uses Firestore-based 'mail' collection triggers for existing email flows; this endpoint is a simple manual test harness.

Helper script
----------------
This repo includes `scripts/write-env-local.sh` which will write a `.env.local` file in the project root using exported environment variables. The script will back up any existing `.env.local` to `.env.local.backup`.

Security:
- Because you shared API keys earlier, rotate them in Mailgun and update the new key in your `.env.local` or hosting provider's secret store.

Security:
- In production, enforce auth and rate limits around this endpoint.

