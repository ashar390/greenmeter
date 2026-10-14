import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: text("emailVerified"),
  image: text("image"),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  oauthTokenSecret: text("oauth_token_secret"),
  oauthToken: text("oauth_token"),
}, (table) => [
  uniqueIndex("accounts_provider_account_unique").on(table.provider, table.providerAccountId),
  index("accounts_user_id_idx").on(table.userId),
]);

export const sessions = sqliteTable("sessions", {
  id: text("id").notNull(),
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: text("expires").notNull(),
}, (table) => [index("sessions_user_id_idx").on(table.userId)]);

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").primaryKey(),
  expires: text("expires").notNull(),
});

export const passwordCredentials = sqliteTable("password_credentials", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  iterations: integer("iterations").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  check("password_credentials_hash_not_blank", sql`length(${table.passwordHash}) > 0`),
  check("password_credentials_salt_not_blank", sql`length(${table.salt}) > 0`),
  check("password_credentials_iterations_secure", sql`${table.iterations} >= 100000`),
]);

export const households = sqliteTable("households", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("households_owner_user_id_unique").on(table.ownerUserId),
  check("households_name_not_blank", sql`length(trim(${table.name})) > 0`),
  check("households_address_not_blank", sql`length(trim(${table.address})) > 0`),
]);

export const usageRecords = sqliteTable("usage_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  utilityType: text("utility_type", { enum: ["electricity", "gas", "water"] }).notNull(),
  readingDate: text("reading_date").notNull(),
  amount: real("amount").notNull(),
  unit: text("unit", { enum: ["kWh", "therms", "gal"] }).notNull(),
  costCents: integer("cost_cents").notNull(),
  source: text("source", { enum: ["manual", "demo_data", "utility_sync", "csv_import"] }).notNull().default("manual"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("usage_records_household_date_idx").on(table.householdId, table.readingDate),
  uniqueIndex("usage_records_household_utility_date_unique").on(
    table.householdId,
    table.utilityType,
    table.readingDate,
  ),
  check("usage_records_utility_type_valid", sql`${table.utilityType} in ('electricity', 'gas', 'water')`),
  check("usage_records_amount_positive", sql`${table.amount} > 0`),
  check("usage_records_unit_valid", sql`${table.unit} in ('kWh', 'therms', 'gal')`),
  check("usage_records_cost_nonnegative", sql`${table.costCents} >= 0`),
  check("usage_records_source_valid", sql`${table.source} in ('manual', 'demo_data', 'utility_sync', 'csv_import')`),
  check("usage_records_date_iso", sql`${table.readingDate} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
]);

export const reductionGoals = sqliteTable("reduction_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  utilityType: text("utility_type", { enum: ["electricity", "gas", "water"] }).notNull(),
  targetPercent: real("target_percent").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("reduction_goals_household_period_idx").on(table.householdId, table.periodStart, table.periodEnd),
  uniqueIndex("reduction_goals_household_utility_period_unique").on(
    table.householdId,
    table.utilityType,
    table.periodStart,
    table.periodEnd,
  ),
  check("reduction_goals_utility_type_valid", sql`${table.utilityType} in ('electricity', 'gas', 'water')`),
  check("reduction_goals_target_range", sql`${table.targetPercent} > 0 and ${table.targetPercent} <= 100`),
  check("reduction_goals_period_valid", sql`${table.periodEnd} >= ${table.periodStart}`),
]);

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type UsageRecord = typeof usageRecords.$inferSelect;
export type NewUsageRecord = typeof usageRecords.$inferInsert;
export type ReductionGoal = typeof reductionGoals.$inferSelect;
export type NewReductionGoal = typeof reductionGoals.$inferInsert;
