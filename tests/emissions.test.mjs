import assert from "node:assert/strict";
import test from "node:test";
import { emissionsFactors, estimateEmissions } from "../lib/emissions.ts";

test("converts EPA electricity and natural-gas factors into kilograms of CO2e", () => {
  const estimate = estimateEmissions(100, 10);

  assert.equal(estimate.electricityKg, 32);
  assert.equal(estimate.gasKg, 53.1);
  assert.equal(estimate.totalKg, 85.1);
});

test("documents the region, year, unit, and source for every factor", () => {
  for (const factor of Object.values(emissionsFactors)) {
    assert.ok(factor.value > 0);
    assert.match(factor.unit, /kg CO2e per/);
    assert.ok(factor.region.length > 0);
    assert.ok(factor.dataYear >= 2023);
    assert.match(factor.sourceUrl, /^https:\/\/www\.epa\.gov\//);
  }
});
