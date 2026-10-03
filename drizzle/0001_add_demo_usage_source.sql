PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_usage_records` (
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
	CONSTRAINT "usage_records_utility_type_valid" CHECK("__new_usage_records"."utility_type" in ('electricity', 'gas', 'water')),
	CONSTRAINT "usage_records_amount_positive" CHECK("__new_usage_records"."amount" > 0),
	CONSTRAINT "usage_records_unit_valid" CHECK("__new_usage_records"."unit" in ('kWh', 'therms', 'gal')),
	CONSTRAINT "usage_records_cost_nonnegative" CHECK("__new_usage_records"."cost_cents" >= 0),
	CONSTRAINT "usage_records_source_valid" CHECK("__new_usage_records"."source" in ('manual', 'demo_data', 'utility_sync')),
	CONSTRAINT "usage_records_date_iso" CHECK("__new_usage_records"."reading_date" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
INSERT INTO `__new_usage_records`("id", "household_id", "utility_type", "reading_date", "amount", "unit", "cost_cents", "source", "created_at") SELECT "id", "household_id", "utility_type", "reading_date", "amount", "unit", "cost_cents", "source", "created_at" FROM `usage_records`;--> statement-breakpoint
DROP TABLE `usage_records`;--> statement-breakpoint
ALTER TABLE `__new_usage_records` RENAME TO `usage_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `usage_records_household_date_idx` ON `usage_records` (`household_id`,`reading_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `usage_records_household_utility_date_unique` ON `usage_records` (`household_id`,`utility_type`,`reading_date`);
