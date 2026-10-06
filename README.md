# GreenMeter

GreenMeter is a full-stack household utility dashboard for reviewing electricity, water, and natural-gas usage. It persists utility records, calculates period-over-period trends, and estimates emissions with documented U.S. Environmental Protection Agency factors.

## Current milestone

The current release connects a responsive React dashboard to a Cloudflare D1 database through validated API routes. Dashboard metrics and emissions estimates are derived from persisted records rather than hard-coded display values.

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
- Authenticated household workspaces with server-side record isolation
- Validated CSV import with preview, row-level errors, and source tracking
- Unit, schema, and production-render tests

Not implemented yet:

- Direct utility-company API integrations
- Water emissions calculations
- Public production deployment

## Start locally

```bash
npm install
npm run dev
```

Open the local address printed in the terminal.

## Verify the project

```bash
npm test
```

This creates a production build and executes the automated checks.

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

Add deployment observability and end-to-end production checks.
