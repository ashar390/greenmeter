# GreenMeter

GreenMeter is a full-stack household utility dashboard for reviewing electricity, water, and natural-gas usage. It persists utility records, calculates period-over-period trends, and estimates emissions with documented U.S. Environmental Protection Agency factors.

## Current milestone

The current release connects a responsive React dashboard to a Cloudflare D1 database through validated API routes and uses a standard Cloudflare Workers deployment configuration. Dashboard metrics and emissions estimates are derived from persisted records rather than hard-coded display values.

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
- Public read-only demonstration mode
- GitHub OAuth with database-backed sessions
- Authenticated household workspaces with server-side record isolation by account ID
- Validated CSV import with preview, row-level errors, and source tracking
- Unit, schema, and production-render tests

Not implemented yet:

- Direct utility-company API integrations
- Water emissions calculations
- Public production deployment

## Start locally

```bash
npm install
npm run db:migrate:local
npm run dev
```

Open the local address printed in the terminal.

Copy `.dev.vars.example` to `.dev.vars` and provide an Auth.js secret plus the
credentials from a GitHub OAuth application. Keep `.dev.vars` private; it is
ignored by Git. For local development, set the OAuth callback URL to
`http://localhost:3000/api/auth/callback/github`.

## Verify the project

```bash
npm test
```

This creates a production build and executes the automated checks.

## Preview the production Worker

```bash
npm run preview
```

The Worker configuration lives in `wrangler.jsonc`. Before the first remote
deployment, create the production D1 database and replace the placeholder
database ID in that file with the ID returned by Wrangler.

## Learn the architecture

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a beginner-friendly explanation of:

- every language and framework;
- how React communicates with the API and persistent database;
- why the project uses SQL, Cloudflare D1, and Drizzle;
- how browser, API, and database layers will communicate; and
- what is honest to claim on a résumé at each stage.

## Emissions methodology

- Electricity uses the EPA eGRID2023 AZNM total output rate for the WECC Southwest region.
- Natural gas uses the EPA 2025 stationary-combustion factors, converted to kilograms of CO2e per therm.
- Water is intentionally excluded until a defensible regional factor is selected.

These results are estimates based on recorded activity and are not utility-certified measurements.

## Next milestone

Move database initialization and demonstration seeding out of request handling.
