# GreenMeter

GreenMeter is a household utility dashboard for reviewing electricity, water, and natural-gas usage. It presents billing-cycle totals, comparisons, estimated emissions, usage alerts, and individual records in a practical account-portal interface.

## Current milestone

The current release is a frontend prototype built with React and TypeScript. Records added through the form are stored in React state and last only until the page is refreshed.

Implemented:

- Responsive utility-account dashboard
- Billing-cycle and comparison context
- Daily electricity visualization
- Validated usage-entry form
- Derived projected-cost calculation
- Recent-records table
- Automated production-render checks

Not implemented yet:

- Permanent database storage
- REST API endpoints
- Authentication
- Real utility-company integrations
- Production-grade emissions calculations

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
- how React state currently stores data;
- why the next milestone uses SQL, Cloudflare D1, and Drizzle;
- how browser, API, and database layers will communicate; and
- what is honest to claim on a résumé at each stage.

## Next milestone

Define the SQL schema and replace temporary browser data with a tested API and persistent database.
