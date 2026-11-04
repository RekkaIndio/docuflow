CG-360 (docuflow)
CG-360 is a governance and compliance platform for care homes in England. It brings policies, audits, staffing, supervision and incident records into one place, so a provider can show inspectors (the CQC) what it does, with evidence, whenever they ask.

The repository is called docuflow; the product and the app's browser title are CG-360.
What it does
Policies: a library of care-home policies, editable per organisation, with versions, approvals, acknowledgements and PDF export
Dependency calculator and staffing: scores resident dependency using the Northwick Park Dependency Score (NPDS) and models staffing need from it, with rotas that connect to those figures
CQC logs and audits: structured checklists, evidence capture, notification logs and inspection-ready exports
Risk assessments and action plans: scoring, mitigation, owners and automatic reminders until items are closed
Incidents and learning: incident capture, root cause analysis, lessons learned, safeguarding and maintenance logs
People: supervisions and appraisals for every role, plus a private journal for reflections to managers (named or anonymous)
Complaints and compliments: tracking and reporting
Documents with AI: upload documents, extract structured data, and chat with a document or a whole folder
Analytics: provider dashboards, trends, predictive and variance analysis
Inspector portals: time-limited, feature-scoped access for external reviewers
Multi-tenant organisations: invite flows, roles, care homes and workspace groups, per-organisation feature flags
Accessibility: neurodivergent-friendly display modes
Tech stack
Layer
Technology
Framework
Next.js 16 (App Router, with some Pages Router API routes), React 19, TypeScript
UI
Tailwind CSS 3, Radix UI primitives (shadcn/ui), Recharts
Auth, database, storage
Firebase (Authentication, Firestore, Storage) and the Firebase Admin SDK
Email
Mailgun
PDFs
jsPDF, Puppeteer (policy PDF generation)
Testing
Vitest

Quick start
Prerequisites
Node.js 20.9 or later (required by Next.js 16)
npm
A Firebase project with Authentication, Firestore and Storage enabled
A Mailgun account for email (a sandbox domain is fine for development)
API keys for the AI features you want to use (OpenAI and/or Google AI)
1. Install
git clone https://github.com/RekkaIndio/docuflow.git
cd docuflow
npm install

.npmrc enables legacy-peer-deps, so no extra flags are needed.
2. Point the app at your Firebase project
The web client config lives in src/lib/firebase-config.ts. Replace it with the config for your own Firebase project (Project settings, General, Your apps). Then deploy the Firestore rules:

firebase use <your-project-id>
firebase deploy --only firestore:rules
3. Configure environment variables
Create .env.local in the project root. It is git-ignored, so never commit it.

# Firebase Admin (server-side). Paste your service account JSON as a single line.
FIREBASE_ADMIN_CREDENTIALS={"type":"service_account", ...}
FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app

# App URLs (used in emails and links)
NEXT_PUBLIC_APP_URL=http://localhost:9003
APP_URL=http://localhost:9003

# Email
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_API_URL=
SUPPORT_EMAIL=

# Optional
NEXT_PUBLIC_GOOGLE_ANALYTICS=G-XXXXXXXXXX
SAVE_POLICIES_LOCALLY=

If FIREBASE_ADMIN_CREDENTIALS is not set, the Admin SDK falls back to application default credentials (GOOGLE_APPLICATION_CREDENTIALS). scripts/write-env-local.sh can generate a starter .env.local for the Mailgun variables.
4. Run
npm run dev

Open http://localhost:9003.
Scripts
Command
What it does
npm run dev
Dev server on port 9003
npm run build / npm start
Production build (webpack) and server
npm run lint
ESLint
npm run typecheck
TypeScript check with no emit
npm test
Run Vitest once
npm run genkit:dev
Start the Genkit developer UI for the AI flows
npm run genkit:watch
Genkit developer UI in watch mode
npm run generate:policy
Generate a policy PDF from src/policies/*.md
npm run policies:generate-all
Generate PDFs for every policy
npm run policies:add-front-matter
Add front matter to the policy markdown files
npm run ensure-org-users
Create any missing organisation user records


The scripts/ directory also holds one-off Firestore migration and maintenance scripts, such as moving data to the multi-tenant layout and revoking expired user access. They use the Admin SDK, so set FIREBASE_ADMIN_CREDENTIALS first. scripts/migrate-to-organisations.ts runs as a dry run by default; pass --apply to write, and test it on staging first.
Multi-tenancy
New sign-ups create a top-level organisations document, and existing collections are nested under it. For backwards compatibility the code still mirrors a created workspace into the top-level workspaces collection. Access is controlled by firestore.rules.
Project structure
src/
  app/
    (auth)/         Login, signup, password reset
    (protected)/    Signed-in app: dashboard, audits, appraisals, CQC logs, rotas, admin
    api/            Route handlers (admin, auth, cqc, chat, invites, orgs, policies, storage, ...)
    about/, help/, privacy/, terms/, contact/   Public pages
  actions/          Server actions (action plans, complaints, CQC logs, documents, rotas, ...)
  ai/               Genkit setup, OpenAI helpers and AI flows (chat, extraction, compliance, risk)
  components/       Shared UI
  lib/              Firebase, staffing and NPDS calculations, PDF generators, Mailgun, feature flags
  policies/         Care-home policy library (markdown)
  pages/api/        Remaining Pages Router API routes
public/policies/    Generated policy PDFs
scripts/            Migration, maintenance and PDF generation scripts
test/               Vitest suites
firestore.rules     Firestore security rules
apphosting.yaml     Firebase App Hosting configuration
Testing
npm test
npm run lint
npm run typecheck
Deployment
The repository includes Firebase App Hosting configuration (apphosting.yaml), Firebase Hosting and Firestore rules (firebase.json), and uses Vercel Analytics and Speed Insights. Whichever host you use, set the environment variables above in its settings, and keep the Admin credentials in the host's secret store.
More documentation
Topic
Document
Feature flags
FEATURE_MANAGEMENT_README.md, DEBUG_FEATURE_FLAGS.md
Editable policies
EDITABLE_POLICIES_README.md
Health snapshot
HEALTH_SNAPSHOT_README.md
Mailgun email
docs/mailgun-integration.md
Policy PDF scripts
scripts/README.md
Original product blueprint
docs/blueprint.md


The other upper-case markdown files in the repository root are development notes recording individual fixes and implementations.
Contributing
Create a branch from main.
Run npm run lint, npm run typecheck and npm test before opening a pull request.
Keep secrets, credentials and real resident or staff data out of commits, including docs, scripts and fixtures.

