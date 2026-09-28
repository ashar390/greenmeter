CREATE TABLE `households` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "households_name_not_blank" CHECK(length(trim("households"."name")) > 0),
	CONSTRAINT "households_address_not_blank" CHECK(length(trim("households"."address")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `households_address_unique` ON `households` (`address`);--> statement-breakpoint
CREATE TABLE `reduction_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer NOT NULL,
	`utility_type` text NOT NULL,
	`target_percent` real NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reduction_goals_utility_type_valid" CHECK("reduction_goals"."utility_type" in ('electricity', 'gas', 'water')),
	CONSTRAINT "reduction_goals_target_range" CHECK("reduction_goals"."target_percent" > 0 and "reduction_goals"."target_percent" <= 100),
	CONSTRAINT "reduction_goals_period_valid" CHECK("reduction_goals"."period_end" >= "reduction_goals"."period_start")
);
--> statement-breakpoint
CREATE INDEX `reduction_goals_household_period_idx` ON `reduction_goals` (`household_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE UNIQUE INDEX `reduction_goals_household_utility_period_unique` ON `reduction_goals` (`household_id`,`utility_type`,`period_start`,`period_end`);--> statement-breakpoint
CREATE TABLE `usage_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`household_id` integer NOT NULL,
	`utility_type` text NOT NULL,
	`reading_date` text NOT NULL,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	`cost_cents` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "usage_records_utility_type_valid" CHECK("usage_records"."utility_type" in ('electricity', 'gas', 'water')),
	CONSTRAINT "usage_records_amount_positive" CHECK("usage_records"."amount" > 0),
	CONSTRAINT "usage_records_unit_valid" CHECK("usage_records"."unit" in ('kWh', 'therms', 'gal')),
	CONSTRAINT "usage_records_cost_nonnegative" CHECK("usage_records"."cost_cents" >= 0),
	CONSTRAINT "usage_records_source_valid" CHECK("usage_records"."source" in ('manual', 'utility_sync')),
	CONSTRAINT "usage_records_date_iso" CHECK("usage_records"."reading_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `usage_records_household_date_idx` ON `usage_records` (`household_id`,`reading_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `usage_records_household_utility_date_unique` ON `usage_records` (`household_id`,`utility_type`,`reading_date`);