# GreenMeter Architecture — Beginner's Guide

This document explains how GreenMeter is organized, why each technology was chosen, and what still needs to be built. It intentionally separates **what works today** from the planned backend so the project remains honest.

## 1. What we are building

GreenMeter is a web application that helps a household:

1. review electricity, water, and natural-gas usage;
2. compare the current billing cycle with the previous one;
3. add missing usage records;
4. estimate cost and carbon emissions; and
5. receive understandable alerts about unusual usage.

The product has three conceptual layers:

```text
Browser interface  →  Application/API  →  SQL database
What users see         Rules and validation   Permanent records
```

The interface and database schema are complete today. The API connection between them is the next milestone. Building the project in layers keeps each learning step small enough to understand and test.

## 2. Current architecture

```text
User's browser
    │
    ├── React components render the dashboard
    ├── CSS controls layout, color, spacing, and responsive behavior
    ├── TypeScript checks the shapes of usage records
    └── React state stores records temporarily while the page is open
```

The current version is a **frontend prototype**. If the page is refreshed, manually entered records disappear because they are stored only in browser memory.

That limitation is deliberate for the first milestone. It lets us verify the product flow before introducing database and server complexity.

## 3. Languages

### TypeScript

TypeScript is JavaScript with type checking. JavaScript runs in the browser; TypeScript checks our code before it runs.

For example, a usage record must have a date, utility category, amount, unit, cost, and source. TypeScript warns us if code creates a record without one of those required fields.

We chose it because:

- it is widely used in modern web development;
- types make a growing codebase safer to change;
- the same language can eventually be used for browser and server code; and
- it provides better editor feedback for a beginner.

### HTML through JSX

Browsers display HTML. React uses JSX, a syntax that lets us describe HTML-like elements inside TypeScript files. The markup in `app/page.tsx` becomes the buttons, forms, tables, and sections visible in the browser.

### CSS

CSS controls presentation: layout, typography, spacing, colors, responsive breakpoints, focus states, and hover states. We use ordinary CSS in `app/globals.css` so the connection between a class name and its visual result is easy to learn.

## 4. Framework and libraries

### React

React builds the interface from reusable components and updates only the parts that change.

GreenMeter currently uses React for:

- opening and closing the new-record form;
- validating submitted values;
- requesting and saving records through the API;
- recalculating the projected bill; and
- changing the selected reporting period.

`useState` stores information that can change. `useMemo` recalculates a derived value only when its input records change.

### Next-compatible application structure

The project uses the familiar Next.js App Router file structure:

- `app/layout.tsx` wraps every page and defines site metadata;
- `app/page.tsx` composes the intro and dashboard at `/`;
- `app/dashboard/page.tsx` contains the dashboard client interface;
- `app/globals.css` contains global styles; and
- `app/api/usage-records/route.ts` exposes the records API.

The local build is handled by **vinext**, a Vite-based compatibility layer that packages the application for a Cloudflare Worker. Vite provides the fast local development and build process.

Why this structure:

- routes and server endpoints have predictable file locations;
- frontend and API code can live in one repository;
- the starter already supports deployment to a small cloud environment; and
- it avoids maintaining two separate deployments during the learning phase.

### No component library yet

We did not install a large UI component library. The current interface uses semantic HTML and project-owned CSS.

This is useful while learning because you can see how forms, tables, navigation, spacing, and responsive design work. Later, a component library could improve development speed, but it should not hide the fundamentals at the beginning.

## 5. Data model

The TypeScript version of a usage record is:

```ts
type UsageRecord = {
  id: number;
  date: string;
  category: "Electricity" | "Gas" | "Water";
  amount: number;
  unit: string;
  cost: number;
  source: "Manual" | "Demo data" | "Utility sync";
};
```

This is a **model**: a formal description of the information the application works with.

Important design decisions:

- `id` uniquely identifies a record.
- `category` accepts only three supported utilities.
- `amount` stores the measured consumption.
- `unit` explains the amount (`kWh`, `therms`, or `gal`).
- `cost` is stored separately because prices differ by utility and rate plan.
- `source` distinguishes user-entered data from imported data.

## 6. Database

The project uses **Cloudflare D1**, a managed SQL database based on SQLite, with **Drizzle ORM**. The application now initializes its local tables, seeds clearly labeled demonstration records, reads them through an API, and persists new manual records.

### Why SQL?

Usage records are structured and related. SQL is a good fit because it supports:

- clear tables and columns;
- validation constraints;
- sorting and filtering by date;
- aggregation such as monthly totals; and
- transactions for reliable updates.

### Why D1/SQLite for this project?

- the project starter already supports it;
- it requires little infrastructure management;
- SQLite syntax teaches transferable relational-database concepts;
- it is sufficient for a portfolio project with modest traffic; and
- it can be deployed with the application.

### Why Drizzle?

Drizzle maps TypeScript code to SQL tables. It gives us type checking while still making the database schema and generated SQL visible. That is helpful for learning because it is not a complete abstraction over SQL.

### Tables

```text
households
  id, name, address, created_at

usage_records
  id, household_id, utility_type, reading_date,
  amount, unit, cost_cents, source, created_at

reduction_goals
  id, household_id, utility_type, target_percent,
  period_start, period_end
```

Money will be stored as integer cents rather than decimal dollars. Integer storage avoids floating-point rounding errors such as `0.1 + 0.2` not being represented exactly by a computer.

## 7. Request flow

Loading the dashboard works like this:

```text
1. Browser requests the dashboard
2. React requests GET /api/usage-records
3. The route calls the database helper
4. Prepared SQL queries D1
5. D1 returns usage rows
6. API converts rows to JSON
7. React renders the returned records and calculated totals
```

Adding a record will work like this:

```text
Form → client validation → POST /api/usage-records → server validation
     → SQL insert → saved record returned → table updates
```

Client validation gives the user fast feedback. Server validation is still required because a caller can bypass the browser and send requests directly to the API.

## 8. UI architecture

The redesigned interface follows conventions used by real account and utility portals:

- Account and property context appear before analytics.
- Billing-cycle dates explain the time range of every metric.
- Values include explicit units such as kWh and gallons.
- Comparisons identify the reference period.
- Estimates are labeled as estimates.
- Alerts describe the observed pattern instead of claiming intelligence.
- Tables expose the underlying records, sources, and dates.
- Decorative scores, streaks, gradients, and vague motivational language are avoided.

The result is intentionally quieter and more information-dense. A real product needs to help users verify numbers and complete tasks, not merely look impressive in a screenshot.

## 9. Folder map

```text
Greenmeter/
├── app/
│   ├── layout.tsx        # Shared page wrapper and link-preview metadata
│   ├── page.tsx          # Root composition: intro followed by dashboard
│   ├── intro-sequence.tsx
│   ├── dashboard/page.tsx
│   ├── api/session/route.ts
│   ├── api/usage-records/route.ts
│   └── globals.css       # Visual system and responsive styles
├── db/
│   ├── schema.ts         # Typed definitions for the three SQL tables
│   └── usage-records.ts  # Prepared queries and row-to-API mapping
├── lib/
│   ├── dashboard-summary.ts # Pure totals, comparisons, and chart calculations
│   ├── emissions.ts       # EPA factors and emissions calculation
│   └── request-user.ts    # Trusted identity-header parsing
├── drizzle/
│   ├── 0000_*.sql        # Versioned SQL migration generated from the schema
│   └── meta/             # Drizzle's migration history
├── docs/
│   └── ARCHITECTURE.md   # This explanation
├── public/
│   └── og.png            # Image shown when a link is shared
├── tests/
│   └── rendered-html.test.mjs
├── package.json          # Dependencies and development commands
└── vite.config.ts        # Build and Cloudflare configuration
```

The schema is deliberately separate from API code. `db/schema.ts` describes the intended database, while `drizzle/` records the exact SQL needed to create it. This makes schema changes reviewable and repeatable across local, test, and hosted databases.

## 10. Testing strategy

The test suite builds the production application and verifies calculations, emissions factors, SQL constraints, database migrations, authenticated identity parsing, household record isolation, and important server-rendered content.
3. **Database tests** for inserts, queries, and constraints.
4. **Browser tests** for the complete add-record workflow.

Each layer catches a different category of failure. More tests are not automatically better; tests should protect behavior that matters.

## 11. Build sequence

We will build the project in this order:

1. **Interface prototype — complete.** Confirm the information and workflow.
2. **Database schema — complete.** Define tables, constraints, indexes, and generate the first migration.
3. **Read API — complete.** Load records from SQL instead of hard-coded data.
4. **Write API — complete.** Validate and save manually entered records.
5. **Dashboard calculation service — complete.** Derive totals, costs, comparisons, goals, and chart values from saved records.
6. **Error/loading states — complete.** Handle slow, empty, incomplete, or failed requests honestly.
7. **Emissions service — complete.** Estimate electricity and gas emissions with documented EPA factors and explicit exclusions.
8. **Authentication and authorization — complete.** Keep the demo public and read-only while scoping authenticated API operations to the signed-in household.
9. **CSV import — complete.** Preview, validate, and atomically persist authenticated bulk utility records with provenance.
10. **Deployment and observability.** Publish, log errors, and measure health.

This order minimizes hidden complexity. Authentication was added after the data flow so its authorization boundaries could be tested independently.

## 12. What you may claim today

You can currently say that you built a responsive React/TypeScript energy dashboard, designed a tested relational SQL schema, implemented authenticated REST-style APIs with household-level data isolation, added a validated bulk CSV ingestion workflow, and created unit-tested services for period analytics and EPA-based carbon estimates.

Do **not** yet claim Spring Boot, real utility integrations, water emissions, or utility-certified carbon accounting. Public provider rows are demonstration data, and authenticated records are manually entered.
