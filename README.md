# GreenMeter

GreenMeter is a full-stack household utility tracking application that brings electricity, water, and natural-gas records into one private dashboard. Users can enter readings individually, import GreenMeter CSV files, or load standard Green Button XML exports from participating utilities. Imported records feed the same billing-period totals, trends, and regional emissions estimates as manually entered readings.

**Live application:** [greenmeter.anusha-sharma.workers.dev](https://greenmeter.anusha-sharma.workers.dev)

The public demo can be explored without an account. Users can create an email/password account or use GitHub sign-in; either method creates a private household workspace whose records are isolated from other users on the server.

## Technology

- **Frontend:** React, TypeScript, and CSS
- **Application runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite) with versioned SQL migrations
- **Authentication:** Auth.js with email/password and optional GitHub OAuth
- **Testing:** Vitest and production-render checks

## Current milestone

The current release is deployed publicly on Cloudflare Workers. It connects a responsive React dashboard to a production D1 database through validated API routes. Dashboard metrics and emissions estimates are calculated from persisted records rather than hard-coded display values.

Implemented:

- Responsive utility-account dashboard
- Reporting-period totals and comparisons
- Data-driven electricity visualization
- Validated, persistent usage-entry form
- Recorded-cost calculation
- Recent-records table
- Versioned D1/SQLite schema for households, usage records, and reduction goals
- REST-style read and write API
- EPA-based electricity and natural-gas emissions estimates
- Private household location settings with selectable EPA eGRID region
- Water-supply emissions estimates using documented DOE energy ranges and the selected regional grid factor
- Public read-only demonstration mode
- Email/password accounts with salted PBKDF2 password hashing
- Optional GitHub OAuth sign-in
- Authenticated household workspaces with server-side record isolation by account ID
- Validated CSV import with preview, row-level errors, and source tracking
- Green Button ESPI XML import with interval-to-daily aggregation, unit conversion, validation, and source tracking
- Explicit, repeatable database migrations and demonstration-data seeding
- Database readiness endpoint at `/api/health`
- Unit, schema, and production-render tests
- Public production deployment

Not implemented yet:

- Direct utility-company API integrations

## Start locally

```bash
npm install
npm run db:setup:local
npm run dev
```

Open the local address printed in the terminal.

Copy `.dev.vars.example` to `.dev.vars` and provide an Auth.js secret. Keep
`.dev.vars` private; it is ignored by Git. To test optional GitHub sign-in,
also provide credentials from a GitHub OAuth application and set its local
callback URL to `http://localhost:3000/api/auth/callback/github`.

## Verify the project

```bash
npm test
```

This creates a production build and executes the automated checks.

## Database workflow

Schema changes belong in versioned files under `drizzle/`. Application requests
never create or alter tables. The demonstration household is also separate from
the schema and can be loaded safely more than once:

```bash
npm run db:migrate:local
npm run db:seed:local
```

For production, use `db:migrate:remote` followed by `db:seed:remote`. The
`/api/health` endpoint returns HTTP 200 only when the expected tables and the
demonstration household are available.

## Deployment

The production application is available at:

**[https://greenmeter.anusha-sharma.workers.dev](https://greenmeter.anusha-sharma.workers.dev)**

Build and deploy the Worker with:

```bash
npm run deploy
```

Production credentials are stored as encrypted Worker secrets and are never committed to the repository. The production D1 binding is defined in `wrangler.jsonc`.

To preview the production Worker locally:

```bash
npm run preview
```

The Worker configuration lives in `wrangler.jsonc`.

## Learn the architecture

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a beginner-friendly explanation of:

- every language and framework;
- how React communicates with the API and persistent database;
- why the project uses SQL, Cloudflare D1, and Drizzle;
- how browser, API, and database layers will communicate; and
- what is honest to claim on a résumé at each stage.

## Emissions methodology

- Electricity uses the household's selected EPA eGRID2023 subregion total-output rate.
- Natural gas uses the EPA 2025 stationary-combustion factors, converted to kilograms of CO2e per therm.
- Water uses the DOE generalized energy range for the selected supply type and the household's eGRID electricity factor. GreenMeter uses the midpoint of the published range and displays that assumption in the dashboard.

These results are estimates based on recorded activity and are not utility-certified measurements.

## Next milestone

Expand Green Button interoperability coverage and add representative provider fixtures while preserving manual entry and CSV import as reliable alternatives.
