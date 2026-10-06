export type UtilityType = "electricity" | "gas" | "water";
export type UsageSource = "manual" | "demo_data" | "utility_sync";

export type UsageRecordDto = {
  id: number;
  date: string;
  category: "Electricity" | "Gas" | "Water";
  amount: number;
  unit: "kWh" | "therms" | "gal";
  cost: number;
  source: "Manual" | "Demo data" | "Utility sync";
};

export type NewUsageRecordInput = {
  date: string;
  category: UtilityType;
  amount: number;
  costCents: number;
};

const DEMO_ADDRESS = "1842 East Lemon Street";
const DEMO_HOUSEHOLD_NAME = "GreenMeter demo home";

const categoryLabels = {
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
} as const;

const units = {
  electricity: "kWh",
  gas: "therms",
  water: "gal",
} as const;

const sourceLabels = {
  manual: "Manual",
  demo_data: "Demo data",
  utility_sync: "Utility sync",
} as const;

type UsageRow = {
  id: number;
  reading_date: string;
  utility_type: UtilityType;
  amount: number;
  unit: "kWh" | "therms" | "gal";
  cost_cents: number;
  source: UsageSource;
};

function toDto(row: UsageRow): UsageRecordDto {
  return {
    id: row.id,
    date: row.reading_date,
    category: categoryLabels[row.utility_type],
    amount: row.amount,
    unit: row.unit,
    cost: row.cost_cents / 100,
    source: sourceLabels[row.source],
  };
}

export async function ensureUsageDatabase(database: D1Database) {
  await database.batch([
    database.prepare(`
      CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        owner_email TEXT UNIQUE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT households_name_not_blank CHECK(length(trim(name)) > 0),
        CONSTRAINT households_address_not_blank CHECK(length(trim(address)) > 0),
        CONSTRAINT households_owner_email_normalized CHECK(owner_email IS NULL OR owner_email = lower(trim(owner_email)))
      )
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS usage_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        household_id INTEGER NOT NULL,
        utility_type TEXT NOT NULL,
        reading_date TEXT NOT NULL,
        amount REAL NOT NULL,
        unit TEXT NOT NULL,
        cost_cents INTEGER NOT NULL,
        source TEXT DEFAULT 'manual' NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
        CONSTRAINT usage_records_utility_type_valid CHECK(utility_type in ('electricity', 'gas', 'water')),
        CONSTRAINT usage_records_amount_positive CHECK(amount > 0),
        CONSTRAINT usage_records_unit_valid CHECK(unit in ('kWh', 'therms', 'gal')),
        CONSTRAINT usage_records_cost_nonnegative CHECK(cost_cents >= 0),
        CONSTRAINT usage_records_source_valid CHECK(source in ('manual', 'demo_data', 'utility_sync')),
        CONSTRAINT usage_records_date_iso CHECK(reading_date glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
        UNIQUE(household_id, utility_type, reading_date)
      )
    `),
    database.prepare(`
      CREATE INDEX IF NOT EXISTS usage_records_household_date_idx
      ON usage_records (household_id, reading_date)
    `),
  ]);

  await database
    .prepare("INSERT OR IGNORE INTO households (name, address) VALUES (?, ?)")
    .bind(DEMO_HOUSEHOLD_NAME, DEMO_ADDRESS)
    .run();

  const household = await database
    .prepare("SELECT id FROM households WHERE address = ?")
    .bind(DEMO_ADDRESS)
    .first<{ id: number }>();

  if (!household) throw new Error("The demonstration household could not be initialized.");

  const demoRecords = [
    ["electricity", "2026-09-18", 18.4, "kWh", 261],
    ["electricity", "2026-09-17", 21.2, "kWh", 301],
    ["gas", "2026-09-16", 0.8, "therms", 112],
    ["water", "2026-09-15", 126, "gal", 74],
    ["electricity", "2026-09-14", 16.7, "kWh", 237],
  ] as const;

  await database.batch(demoRecords.map((record) => database.prepare(`
    INSERT OR IGNORE INTO usage_records
      (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
    VALUES (?, ?, ?, ?, ?, ?, 'demo_data')
  `).bind(household.id, ...record)));

  return household.id;
}

async function getOrCreateHousehold(database: D1Database, ownerEmail?: string, ownerName?: string) {
  const demoHouseholdId = await ensureUsageDatabase(database);
  if (!ownerEmail) return demoHouseholdId;

  const normalizedEmail = ownerEmail.trim().toLowerCase();
  const existing = await database
    .prepare("SELECT id FROM households WHERE owner_email = ?")
    .bind(normalizedEmail)
    .first<{ id: number }>();
  if (existing) return existing.id;

  const household = await database.prepare(`
    INSERT INTO households (name, address, owner_email)
    VALUES (?, ?, ?)
    RETURNING id
  `).bind(
    ownerName?.trim() ? `${ownerName.trim()}'s home` : "My home",
    "Address not set",
    normalizedEmail,
  ).first<{ id: number }>();

  if (!household) throw new Error("The household could not be created.");
  return household.id;
}

export async function listUsageRecords(
  database: D1Database,
  ownerEmail?: string,
  ownerName?: string,
): Promise<UsageRecordDto[]> {
  const householdId = await getOrCreateHousehold(database, ownerEmail, ownerName);
  const result = await database.prepare(`
    SELECT id, reading_date, utility_type, amount, unit, cost_cents, source
    FROM usage_records
    WHERE household_id = ?
    ORDER BY reading_date DESC, id DESC
    LIMIT 50
  `).bind(householdId).all<UsageRow>();

  return result.results.map(toDto);
}

export async function insertUsageRecord(
  database: D1Database,
  input: NewUsageRecordInput,
  ownerEmail: string,
  ownerName?: string,
) {
  const householdId = await getOrCreateHousehold(database, ownerEmail, ownerName);
  const unit = units[input.category];
  const result = await database.prepare(`
    INSERT INTO usage_records
      (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
    VALUES (?, ?, ?, ?, ?, ?, 'manual')
    RETURNING id, reading_date, utility_type, amount, unit, cost_cents, source
  `).bind(
    householdId,
    input.category,
    input.date,
    input.amount,
    unit,
    input.costCents,
  ).first<UsageRow>();

  if (!result) throw new Error("The usage record was not saved.");
  return toDto(result);
}
