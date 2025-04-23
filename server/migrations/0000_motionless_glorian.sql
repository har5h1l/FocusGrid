CREATE TABLE `study_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`course_name` text NOT NULL,
	`exam_date` text NOT NULL,
	`weekly_study_time` integer NOT NULL,
	`study_preference` text NOT NULL,
	`learning_style` text,
	`study_materials` text,
	`topics` text NOT NULL,
	`topics_progress` text,
	`resources` text NOT NULL,
	`selected_schedule` integer DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`study_plan_id` integer,
	`title` text NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`duration` integer NOT NULL,
	`resource` text,
	`is_completed` integer DEFAULT false,
	`task_type` text NOT NULL,
	FOREIGN KEY (`study_plan_id`) REFERENCES `study_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_weeks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`study_plan_id` integer,
	`week_start` text NOT NULL,
	`week_end` text NOT NULL,
	`monday_task` text,
	`wednesday_task` text,
	`friday_task` text,
	`weekend_task` text,
	FOREIGN KEY (`study_plan_id`) REFERENCES `study_plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);