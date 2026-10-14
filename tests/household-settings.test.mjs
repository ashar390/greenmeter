import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { getHouseholdSettings, updateHouseholdSettings } from "../db/household-settings.ts";

class StatementAdapter {
  constructor(statement, values = []) { this.statement = statement; this.values = values; }
  bind(...values) { return new StatementAdapter(this.statement, values); }
  async first() { return this.statement.get(...this.values) ?? null; }
}

async function databaseAdapter() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const migrationFiles = (await readdir(new URL("../drizzle/", import.meta.url))).filter((name) => name.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    const migration = await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) sqlite.exec(statement);
  }
  return { sqlite, database: { prepare: (sql) => new StatementAdapter(sqlite.prepare(sql)) } };
}

test("stores private household location and factor selections by account", async () => {
  const { sqlite, database } = await databaseAdapter();
  sqlite.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)").run("location-user", "Location User", "location@example.com");

  const defaults = await getHouseholdSettings(database, "location-user", "Location User");
  assert.equal(defaults.egridSubregion, "AZNM");
  assert.equal(defaults.waterSource, "local_surface");

  const updated = await updateHouseholdSettings(database, "location-user", "Location User", {
    city: "Tempe",
    stateCode: "AZ",
    postalCode: "85281",
    egridSubregion: "AZNM",
    waterSource: "local_groundwater",
  });
  assert.deepEqual(updated, {
    city: "Tempe",
    stateCode: "AZ",
    postalCode: "85281",
    egridSubregion: "AZNM",
    waterSource: "local_groundwater",
  });
  assert.equal(sqlite.prepare("SELECT address FROM households WHERE owner_user_id = ?").get("location-user").address, "Tempe, AZ, 85281");
  sqlite.close();
});
