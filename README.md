# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Organisations (multi-tenant)

This project now supports a simple multi-tenant layout in Firestore. New signups will create a top-level `organisations` document and nest the existing collections under it:

- organisations/{orgId}/published_policies
- organisations/{orgId}/teams
- organisations/{orgId}/users
- organisations/{orgId}/workspaces

For backward compatibility the code currently mirrors a created workspace into the top-level `workspaces` collection. Existing top-level collections remain supported for now.

A migration script is provided at `scripts/migrate-to-organisations.ts`. It defaults to a dry-run; re-run with `--apply` to perform writes. Review and test on staging before running in production.
