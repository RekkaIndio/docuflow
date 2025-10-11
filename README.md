# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Organisations (multi-tenant)

This project now supports a simple multi-tenant layout in Firestore. New signups will create a top-level `organisations` document and nest the existing collections under it:


For backward compatibility the code currently mirrors a created workspace into the top-level `workspaces` collection. Existing top-level collections remain supported for now.

A migration script is provided at `scripts/migrate-to-organisations.ts`. It defaults to a dry-run; re-run with `--apply` to perform writes. Review and test on staging before running in production.


## Google Analytics

To enable Google Analytics (GA4) add your measurement ID to an environment variable named `NEXT_PUBLIC_GOOGLE_ANALYTICS`.

Create a `.env.local` file in the project root during development and add:

```
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-XXXXXXXXXX
```

Vercel Analytics

This project uses Vercel Analytics. Install the client package and add the Analytics component to the root layout (the project already includes the package in package.json):

```
npm i @vercel/analytics
```

This app gates the Analytics component behind a cookie-consent banner — analytics will only load after users accept analytics cookies. You can change preferences using the 'Cookie preferences' link in the site footer.
