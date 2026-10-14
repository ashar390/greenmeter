PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_households` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`owner_user_id` text,
	`city` text,
	`state_code` text,
	`postal_code` text,
	`egrid_subregion` text DEFAULT 'AZNM' NOT NULL,
	`water_source` text DEFAULT 'local_surface' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "households_name_not_blank" CHECK(length(trim("__new_households"."name")) > 0),
	CONSTRAINT "households_address_not_blank" CHECK(length(trim("__new_households"."address")) > 0),
	CONSTRAINT "households_state_code_valid" CHECK("__new_households"."state_code" is null or "__new_households"."state_code" glob '[A-Z][A-Z]'),
	CONSTRAINT "households_postal_code_valid" CHECK("__new_households"."postal_code" is null or "__new_households"."postal_code" glob '[0-9][0-9][0-9][0-9][0-9]'),
	CONSTRAINT "households_water_source_valid" CHECK("__new_households"."water_source" in ('local_surface', 'local_groundwater', 'distant_watershed'))
);
--> statement-breakpoint
INSERT INTO `__new_households`("id", "name", "address", "owner_user_id", "city", "state_code", "postal_code", "egrid_subregion", "water_source", "created_at") SELECT "id", "name", "address", "owner_user_id", NULL, NULL, NULL, 'AZNM', 'local_surface', "created_at" FROM `households`;--> statement-breakpoint
DROP TABLE `households`;--> statement-breakpoint
ALTER TABLE `__new_households` RENAME TO `households`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `households_owner_user_id_unique` ON `households` (`owner_user_id`);
