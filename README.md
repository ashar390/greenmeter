# GreenMeter

GreenMeter is a full-stack household utility tracker for electricity, water, and natural gas. It turns manually entered readings, CSV imports, and standard Green Button XML exports into billing-period totals, usage trends, cost summaries, and location-aware carbon estimates.

**Live application:** [greenmeter.anusha-sharma.workers.dev](https://greenmeter.anusha-sharma.workers.dev)

The public demo is available without an account. Registered users receive a private household workspace with records and location settings isolated from other accounts on the server.

## Features

- Responsive dashboard with reporting-period totals, comparisons, charts, recent records, and reduction goals
- Manual electricity, water, and natural-gas entry with server-side validation
- CSV import with preview, row-level errors, duplicate detection, and source tracking
- Green Button ESPI XML import with interval-to-daily aggregation and unit conversion
- Household address, EPA eGRID subregion, and water-source settings
- Regional electricity, natural-gas, and water-supply emissions estimates
- Recorded utility costs and data-driven billing summaries
- Email/password authentication and optional GitHub OAuth
- Read-only public demonstration mode
- Server-side household ownership and record isolation
- Versioned database migrations, repeatable demo seeding, health checks, and automated tests

Direct utility-company API integrations are not currently supported. Users import utility exports or enter records manually.

## Technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Interface | React 19, TypeScript, CSS | Accessible, responsive dashboard and forms |
| Application | Next.js App Router structure, vinext, Vite | Pages, API routes, local development, and Worker builds |
| Runtime | Cloudflare Workers | Hosts the frontend and server-side API |
| Database | Cloudflare D1 (SQLite), Drizzle ORM | Persists accounts, households, settings, records, and goals |
| Authentication | Auth.js, PBKDF2, optional GitHub OAuth | Creates secure application sessions |
| Parsing | fast-xml-parser | Validates and reads Green Button XML exports |
| Testing | Node.js test runner and production build checks | Verifies calculations, imports, schema, isolation, and rendered output |

## Architecture

```text
Browser (React dashboard)
        │ HTTPS / JSON
        ▼
Cloudflare Worker (pages, authentication, API routes, validation)
        │ parameterized queries
        ▼
Cloudflare D1 (accounts, households, settings, records, goals)
```

Dashboard values are calculated from persisted usage records rather than hard-coded display data. Both authentication methods create the same application session, and every private database query is scoped to the authenticated account's household.

For a beginner-friendly explanation of the request flow and design choices, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project structure

```text
app/                 Pages, dashboard components, styles, and API routes
db/                  Database schema, queries, and demonstration seed data
drizzle/             Versioned SQL migrations and schema snapshots
lib/                 Import parsers, calculations, authentication helpers
public/              Static images and the CSV import template
tests/               Unit, schema, isolation, and rendered-output tests
worker/              Cloudflare Worker entry point
docs/ARCHITECTURE.md Detailed architecture and learning guide
wrangler.jsonc       Cloudflare bindings and deployment configuration
```

## Supported imports

### GreenMeter CSV

- Accepts files smaller than 1 MB and up to 500 data rows.
- Uses the columns shown in [`public/greenmeter-import-template.csv`](public/greenmeter-import-template.csv).
- Validates utility categories, dates, measurements, costs, and duplicates before saving.

### Green Button XML

- Accepts standard Green Button ESPI XML files smaller than 5 MB.
- Supports electricity, natural-gas, and water readings represented by supported ESPI commodity and unit codes.
- Aggregates interval readings into daily records before saving, with a maximum of 20,000 intervals per import.

Both workflows show a preview before confirmation. The raw uploaded file is processed for the import and is not retained; accepted readings are stored as household usage records.

PDF bill extraction is not part of the application.

## Prerequisites

- [Node.js](https://nodejs.org/) 22.13 or newer
- npm
- A Cloudflare account for D1, Worker preview, or deployment
- A GitHub OAuth application only if testing optional GitHub sign-in

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local database and load the demonstration household:

   ```bash
   npm run db:setup:local
   ```

3. Copy `.dev.vars.example` to `.dev.vars` and replace `AUTH_SECRET` with a long, random value. Keep `.dev.vars` private; Git ignores it.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed in the terminal.

To test GitHub sign-in, also set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`. Configure the OAuth callback as `<local-origin>/api/auth/callback/github`, using the exact origin printed by the development server.

## Verification

Run the complete project check:

```bash
npm test
```

This creates a production build and runs the Node.js test suite. Lint the source separately with:

```bash
npm run lint
```

## Database workflow

Schema changes belong in versioned files under `drizzle/`. Application requests never create or alter tables. The demonstration seed is kept separate from the schema and can be applied repeatedly.

```bash
npm run db:migrate:local
npm run db:seed:local
```

For production, run `npm run db:migrate:remote` followed by `npm run db:seed:remote`. The `/api/health` endpoint returns HTTP 200 only when the expected tables and demonstration household are available.

## Deployment

Build and deploy the application to Cloudflare Workers with:

```bash
npm run deploy
```

Use `npm run preview` to build and run the production Worker locally. Worker and D1 configuration lives in `wrangler.jsonc`; production credentials must be stored as encrypted Worker secrets and must never be committed.

## Security and privacy

- Passwords are salted and hashed on the server with PBKDF2-SHA-256; readable passwords are never stored.
- Session cookies are opaque, HTTP-only, and secure in production.
- API authorization scopes private reads and writes to the signed-in account's household ID.
- The demonstration household is read-only and separate from registered-user data.
- Import routes enforce file-size, row or interval, data-type, and duplicate limits before persistence.
- Secrets and local environment values are excluded from version control.

This is a portfolio application, not a utility-certified billing or emissions service. Users should avoid importing sensitive data they do not want stored as usage records.

## Emissions methodology

- Electricity uses the household's selected EPA eGRID2023 subregion total-output rate.
- Natural gas uses EPA 2025 stationary-combustion factors converted to kilograms of CO2e per therm.
- Water uses the midpoint of a DOE generalized energy range for the selected supply type together with the household's eGRID electricity factor.

Results are estimates based on recorded activity and configured regional assumptions; they are not utility-certified measurements.

## Roadmap

- Expand Green Button interoperability with additional representative provider fixtures
- Improve import history and user-facing diagnostics
- Add direct utility integrations where stable, publicly accessible provider APIs permit them

## License

GreenMeter is available under the [MIT License](LICENSE).
