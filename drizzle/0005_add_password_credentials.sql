CREATE TABLE `password_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`iterations` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "password_credentials_hash_not_blank" CHECK(length("password_credentials"."password_hash") > 0),
	CONSTRAINT "password_credentials_salt_not_blank" CHECK(length("password_credentials"."salt") > 0),
	CONSTRAINT "password_credentials_iterations_secure" CHECK("password_credentials"."iterations" >= 100000)
);
