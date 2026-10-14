import assert from "node:assert/strict";
import test from "node:test";
import { egridRegions, emissionsFactors, estimateEmissions, waterSources } from "../lib/emissions.ts";

test("converts EPA electricity and natural-gas factors into kilograms of CO2e", () => {
  const estimate = estimateEmissions(100, 10);

  assert.equal(estimate.electricityKg, 32);
  assert.equal(estimate.gasKg, 53.1);
  assert.equal(estimate.waterKg, 0);
  assert.equal(estimate.totalKg, 85.1);
});

test("uses the selected regional grid factor for electricity and water", () => {
  const southwest = estimateEmissions(100, 0, 1_000, "AZNM", "local_surface");
  const california = estimateEmissions(100, 0, 1_000, "CAMX", "local_surface");

  assert.equal(southwest.electricityKg, 32);
  assert.equal(southwest.waterKg, 1);
  assert.equal(california.electricityKg, 19.5);
  assert.equal(california.waterKg, 0.6);
  assert.ok(southwest.totalKg > california.totalKg);
});

test("includes every published eGRID region and documented water-source ranges", () => {
  assert.equal(Object.keys(egridRegions).length, 28);
  assert.equal(waterSources.local_surface.kwhPerKgal, 3.15);
  assert.equal(waterSources.local_groundwater.kwhPerKgal, 3.7);
  assert.equal(waterSources.distant_watershed.kwhPerKgal, 15.3);
});

test("documents the region, year, unit, and source for every factor", () => {
  for (const factor of [emissionsFactors.electricity, emissionsFactors.naturalGas]) {
    assert.ok(factor.value > 0);
    assert.match(factor.unit, /kg CO2e per/);
    assert.ok(factor.region.length > 0);
    assert.ok(factor.dataYear >= 2023);
    assert.match(factor.sourceUrl, /^https:\/\/www\.epa\.gov\//);
  }
  assert.match(emissionsFactors.water.sourceUrl, /^https:\/\/www\.energy\.gov\//);
});
