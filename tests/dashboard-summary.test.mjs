import assert from "node:assert/strict";
import test from "node:test";
import { calculateDashboardSummary } from "../lib/dashboard-summary.ts";

const records = [
  { id: 1, date: "2026-09-10", category: "Electricity", amount: 10, unit: "kWh", cost: 1.5, source: "Demo data" },
  { id: 2, date: "2026-09-11", category: "Electricity", amount: 20, unit: "kWh", cost: 3, source: "Demo data" },
  { id: 3, date: "2026-09-11", category: "Water", amount: 100, unit: "gal", cost: 0.5, source: "Demo data" },
  { id: 4, date: "2026-08-10", category: "Electricity", amount: 40, unit: "kWh", cost: 6, source: "Demo data" },
  { id: 5, date: "2026-08-11", category: "Water", amount: 80, unit: "gal", cost: 0.4, source: "Demo data" },
];

test("calculates totals, chart values, cost, and previous-period changes", () => {
  const summary = calculateDashboardSummary(records, "current");

  assert.equal(summary.electricity.amount, 30);
  assert.equal(summary.electricity.changePercent, -25);
  assert.equal(summary.water.amount, 100);
  assert.equal(summary.water.changePercent, 25);
  assert.equal(summary.totalCost, 5);
  assert.equal(summary.electricityAverage, 15);
  assert.equal(summary.electricityHighest, 20);
  assert.equal(summary.chartMaximum, 20);
  assert.equal(summary.daysRecorded, 2);
  assert.equal(summary.emissions.totalKg, 9.6);
  assert.equal(summary.emissions.changePercent, -25);
  assert.deepEqual(summary.electricityDays.map((day) => day.amount), [10, 20]);
});

test("returns honest unavailable comparisons when no earlier data exists", () => {
  const summary = calculateDashboardSummary(records.slice(0, 3), "current");

  assert.equal(summary.electricity.changePercent, null);
  assert.equal(summary.water.changePercent, null);
});

test("supports previous-month and twelve-month reporting periods", () => {
  const previous = calculateDashboardSummary(records, "previous");
  const last12 = calculateDashboardSummary(records, "last12");

  assert.equal(previous.electricity.amount, 40);
  assert.equal(previous.dateRangeLabel, "Aug 1–Aug 31");
  assert.equal(last12.electricity.amount, 70);
  assert.equal(last12.water.amount, 180);
});
