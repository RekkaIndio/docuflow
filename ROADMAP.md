# Roadmap

Where CG-360 is today and where it is headed. Open work is tracked in [GitHub Issues](../../issues); this file is the high-level view.

## Shipped

- Policy library with editing, versions, approvals, acknowledgements and PDF export
- Resident dependency scoring (NPDS) with acuity-based staffing insight and rotas
- CQC logs, audits, evidence capture and inspection-ready exports
- Risk assessments, action plans, incident capture, root cause analysis and lessons learned
- Supervisions and appraisals across every care-home role, plus a private journal for managers
- Complaints and compliments tracking
- AI document tools: structured data extraction and chat with documents or folders
- Provider dashboards, trends and predictive analytics
- Inspector portals with expiring, feature-scoped access
- Multi-tenant organisations with invites, roles, care homes and feature flags
- Accessibility modes, including neurodivergent-friendly display

## Next

- Add a `.env.example` and settle on one name per environment variable (for example `OPENAI_API_KEY`)
- Move the Firebase client config into environment variables so each deployment can use its own project
- Consolidate the remaining Pages Router API routes under the App Router
- Move the root-level implementation notes into a `docs/` folder
- Broaden automated test coverage beyond rota helpers, starting with the NPDS and staffing calculations
