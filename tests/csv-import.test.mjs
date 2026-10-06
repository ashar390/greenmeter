import assert from "node:assert/strict";
import test from "node:test";
import { parseUsageCsv } from "../lib/csv-import.ts";

test("parses a valid utility CSV into normalized database inputs", () => {
  const result = parseUsageCsv("date,utility,usage,cost\n2026-09-01,Electricity,18.4,$2.61\n2026-09-02,water,126,0.74");

  assert.deepEqual(result, {
    rows: [
      { date: "2026-09-01", category: "electricity", amount: 18.4, costCents: 261 },
      { date: "2026-09-02", category: "water", amount: 126, costCents: 74 },
    ],
    errors: [],
    totalRows: 2,
  });
});

test("reports row-level validation errors without accepting invalid rows", () => {
  const result = parseUsageCsv("date,utility,usage,cost\n09/01/2026,power,-2,nope\n2026-09-02,gas,1.2,1.25\n2026-09-02,gas,1.3,1.30");

  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.errors.map((error) => error.row), [2, 2, 2, 2, 4]);
});

test("rejects missing columns, oversized files, and malformed quotes", () => {
  assert.match(parseUsageCsv("date,utility\n2026-09-01,gas").errors[0].message, /Missing required columns/);
  assert.match(parseUsageCsv("date,utility,usage,cost\n2026-09-01,gas,1,1\n2026-09-02,gas,1,1", 1).errors[0].message, /at most 1/);
  assert.throws(() => parseUsageCsv('date,utility,usage,cost\n"2026-09-01,gas,1,1'), /unclosed quoted field/);
});
