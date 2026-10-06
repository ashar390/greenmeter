PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_households` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`owner_email` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "households_name_not_blank" CHECK(length(trim("__new_households"."name")) > 0),
	CONSTRAINT "households_address_not_blank" CHECK(length(trim("__new_households"."address")) > 0),
	CONSTRAINT "households_owner_email_normalized" CHECK("__new_households"."owner_email" is null or "__new_households"."owner_email" = lower(trim("__new_households"."owner_email")))
);
--> statement-breakpoint
INSERT INTO `__new_households`("id", "name", "address", "owner_email", "created_at") SELECT "id", "name", "address", NULL, "created_at" FROM `households`;--> statement-breakpoint
DROP TABLE `households`;--> statement-breakpoint
ALTER TABLE `__new_households` RENAME TO `households`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `households_owner_email_unique` ON `households` (`owner_email`);
