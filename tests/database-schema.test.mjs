import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrationsUrl = new URL("../drizzle/", import.meta.url);

async function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");

  const migrationFiles = (await readdir(migrationsUrl))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migration = await readFile(new URL(migrationFile, migrationsUrl), "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) database.exec(statement);
    }
  }

  return database;
}

function insertHousehold(database) {
  const result = database
    .prepare("INSERT INTO households (name, address) VALUES (?, ?)")
    .run("Home", "1842 East Lemon Street");

  return Number(result.lastInsertRowid);
}

test("migration creates the expected GreenMeter tables", async () => {
  const database = await createDatabase();
  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);

  assert.deepEqual(tables, ["households", "reduction_goals", "usage_records"]);
  database.close();
});

test("usage records enforce valid amounts, costs, categories, and uniqueness", async () => {
  const database = await createDatabase();
  const householdId = insertHousehold(database);
  const insert = database.prepare(`
    INSERT INTO usage_records
      (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(householdId, "electricity", "2026-09-21", 18.4, "kWh", 261, "demo_data");

  assert.throws(
    () => insert.run(householdId, "electricity", "2026-09-20", 0, "kWh", 0, "manual"),
    /usage_records_amount_positive/,
  );
  assert.throws(
    () => insert.run(householdId, "solar", "2026-09-20", 5, "kWh", 0, "manual"),
    /usage_records_utility_type_valid/,
  );
  assert.throws(
    () => insert.run(householdId, "water", "2026-09-20", 100, "gal", -1, "manual"),
    /usage_records_cost_nonnegative/,
  );
  assert.throws(
    () => insert.run(householdId, "electricity", "2026-09-21", 19.1, "kWh", 270, "manual"),
    /UNIQUE constraint failed/,
  );
  assert.throws(
    () => insert.run(householdId, "gas", "2026-09-22", 1, "therms", 120, "invented"),
    /usage_records_source_valid/,
  );

  database.close();
});

test("foreign keys reject orphan records and cascade household deletion", async () => {
  const database = await createDatabase();
  const householdId = insertHousehold(database);

  assert.throws(
    () => database.prepare(`
      INSERT INTO usage_records
        (household_id, utility_type, reading_date, amount, unit, cost_cents)
      VALUES (?, 'water', '2026-09-21', 100, 'gal', 74)
    `).run(9999),
    /FOREIGN KEY constraint failed/,
  );

  database.prepare(`
    INSERT INTO usage_records
      (household_id, utility_type, reading_date, amount, unit, cost_cents)
    VALUES (?, 'water', '2026-09-21', 100, 'gal', 74)
  `).run(householdId);
  database.prepare("DELETE FROM households WHERE id = ?").run(householdId);

  const remaining = database.prepare("SELECT COUNT(*) AS count FROM usage_records").get();
  assert.equal(remaining.count, 0);
  database.close();
});

test("reduction goals enforce a valid percentage and date range", async () => {
  const database = await createDatabase();
  const householdId = insertHousehold(database);
  const insert = database.prepare(`
    INSERT INTO reduction_goals
      (household_id, utility_type, target_percent, period_start, period_end)
    VALUES (?, 'electricity', ?, ?, ?)
  `);

  insert.run(householdId, 10, "2026-09-01", "2026-09-30");
  assert.throws(
    () => insert.run(householdId, 0, "2026-10-01", "2026-10-31"),
    /reduction_goals_target_range/,
  );
  assert.throws(
    () => insert.run(householdId, 10, "2026-11-30", "2026-11-01"),
    /reduction_goals_period_valid/,
  );

  database.close();
});
