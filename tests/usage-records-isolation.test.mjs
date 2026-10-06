import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { insertUsageRecord, insertUsageRecords, listUsageRecords } from "../db/usage-records.ts";

const migrationsUrl = new URL("../drizzle/", import.meta.url);

class D1StatementAdapter {
  constructor(statement, values = []) {
    this.statement = statement;
    this.values = values;
  }

  bind(...values) {
    return new D1StatementAdapter(this.statement, values);
  }

  async first() {
    return this.statement.get(...this.values) ?? null;
  }

  async all() {
    return { results: this.statement.all(...this.values) };
  }

  async run() {
    return this.statement.run(...this.values);
  }
}

async function createD1Adapter() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");

  const migrationFiles = (await readdir(migrationsUrl)).filter((name) => name.endsWith(".sql")).sort();
  for (const migrationFile of migrationFiles) {
    const migration = await readFile(new URL(migrationFile, migrationsUrl), "utf8");
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) sqlite.exec(statement);
    }
  }

  return {
    sqlite,
    database: {
      prepare(sql) {
        return new D1StatementAdapter(sqlite.prepare(sql));
      },
      async batch(statements) {
        return Promise.all(statements.map((statement) => statement.run()));
      },
    },
  };
}

test("authenticated households cannot read each other's usage records", async () => {
  const { sqlite, database } = await createD1Adapter();
  const input = { date: "2026-10-06", category: "electricity", amount: 12.5, costCents: 180 };

  await insertUsageRecord(database, input, "first@example.com", "First User");
  await insertUsageRecord(database, { ...input, amount: 27.2 }, "second@example.com", "Second User");

  const firstRecords = await listUsageRecords(database, "first@example.com", "First User");
  const secondRecords = await listUsageRecords(database, "second@example.com", "Second User");
  const demoRecords = await listUsageRecords(database);

  assert.deepEqual(firstRecords.map((record) => record.amount), [12.5]);
  assert.deepEqual(secondRecords.map((record) => record.amount), [27.2]);
  assert.equal(demoRecords.length, 5);

  sqlite.close();
});

test("bulk imports are attributed to the authenticated household and CSV source", async () => {
  const { sqlite, database } = await createD1Adapter();

  const records = await insertUsageRecords(database, [
    { date: "2026-10-01", category: "electricity", amount: 15, costCents: 210 },
    { date: "2026-10-02", category: "water", amount: 120, costCents: 70 },
  ], "importer@example.com", "Import User");

  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.source), ["CSV import", "CSV import"]);
  assert.equal((await listUsageRecords(database, "another@example.com", "Another User")).length, 0);

  sqlite.close();
});
