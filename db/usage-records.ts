export type UtilityType = "electricity" | "gas" | "water";
export type UsageSource = "manual" | "demo_data" | "utility_sync" | "csv_import";

export type UsageRecordDto = {
  id: number;
  date: string;
  category: "Electricity" | "Gas" | "Water";
  amount: number;
  unit: "kWh" | "therms" | "gal";
  cost: number;
  source: "Manual" | "Demo data" | "Utility sync" | "CSV import";
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
  csv_import: "CSV import",
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

async function getDemoHouseholdId(database: D1Database) {
  const household = await database
    .prepare(`
      SELECT id
      FROM households
      WHERE name = ? AND address = ? AND owner_user_id IS NULL
      LIMIT 1
    `)
    .bind(DEMO_HOUSEHOLD_NAME, DEMO_ADDRESS)
    .first<{ id: number }>();

  if (!household) {
    throw new Error("GreenMeter demo data is not seeded. Run the database seed command.");
  }
  return household.id;
}

async function getOrCreateHousehold(database: D1Database, ownerUserId?: string, ownerName?: string) {
  if (!ownerUserId) return getDemoHouseholdId(database);

  const existing = await database
    .prepare("SELECT id FROM households WHERE owner_user_id = ?")
    .bind(ownerUserId)
    .first<{ id: number }>();
  if (existing) return existing.id;

  const household = await database.prepare(`
    INSERT INTO households (name, address, owner_user_id)
    VALUES (?, ?, ?)
    RETURNING id
  `).bind(
    ownerName?.trim() ? `${ownerName.trim()}'s home` : "My home",
    "Address not set",
    ownerUserId,
  ).first<{ id: number }>();

  if (!household) throw new Error("The household could not be created.");
  return household.id;
}

export async function listUsageRecords(
  database: D1Database,
  ownerUserId?: string,
  ownerName?: string,
): Promise<UsageRecordDto[]> {
  const householdId = await getOrCreateHousehold(database, ownerUserId, ownerName);
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
  ownerUserId: string,
  ownerName?: string,
) {
  const householdId = await getOrCreateHousehold(database, ownerUserId, ownerName);
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

export async function insertUsageRecords(
  database: D1Database,
  inputs: NewUsageRecordInput[],
  ownerUserId: string,
  ownerName?: string,
) {
  const householdId = await getOrCreateHousehold(database, ownerUserId, ownerName);
  if (inputs.length === 0) return [];

  await database.batch(inputs.map((input) => database.prepare(`
    INSERT INTO usage_records
      (household_id, utility_type, reading_date, amount, unit, cost_cents, source)
    VALUES (?, ?, ?, ?, ?, ?, 'csv_import')
  `).bind(
    householdId,
    input.category,
    input.date,
    input.amount,
    units[input.category],
    input.costCents,
  )));

  return listUsageRecords(database, ownerUserId, ownerName);
}
