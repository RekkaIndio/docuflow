Backfill audit_latest_scores

This script populates `workspaces/{workspaceId}/settings/audit_latest_scores` by scanning existing
`workspaces/{workspaceId}/audits` collections and picking the most recent audit per `auditType` that has
a numeric `scorePercent` field.

File: scripts/backfill-audit-latest-scores.js

Prerequisites
- Node.js (14+)
- A Firebase service account JSON with Firestore read/write permissions, OR application default credentials
  available in the environment (GOOGLE_APPLICATION_CREDENTIALS).

Usage

Run with a service account file:

```bash
EXPORT_PATH=/path/to/serviceAccount.json
node scripts/backfill-audit-latest-scores.js --serviceAccount="$EXPORT_PATH" --project=your-project-id
```

Or use ADC (when GOOGLE_APPLICATION_CREDENTIALS env var is set):

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
export FIREBASE_PROJECT=your-project-id
node scripts/backfill-audit-latest-scores.js
```

What it does
- Iterates all documents under `workspaces`.
- For each workspace, pages through `workspaces/{workspaceId}/audits` ordered by `createdAt` descending.
- Picks the newest audit for each `auditType` that contains a numeric `scorePercent`.
- Writes `workspaces/{workspaceId}/settings/audit_latest_scores` with fields like:

  {
    "care-plan": { scorePercent: 88, yesCount: 22, totalCount: 25, updatedAt: 169... },
    "health-safety": { scorePercent: 92, yesCount: 46, totalCount: 50, updatedAt: 169... }
  }

Notes and recommendations
- The script writes with `merge: true` so it won't clobber other settings fields.
- It determines `createdAt` from the audit document's `createdAt` field. If `createdAt` is a Firestore
  Timestamp it uses `.toMillis()`; otherwise it falls back to the raw value or Date.now().
- The script should be run in a trusted environment and may take a while for large numbers of workspaces.

Next steps
- If you want the backfill to run automatically in CI, create a small Cloud Function or Cloud Run job with
  the service account attached and run it once.
- If you want to re-run it safely, the script is idempotent because it always writes the latest per-auditType.
