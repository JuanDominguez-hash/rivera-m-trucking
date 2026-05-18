CREATE TABLE `daily_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`routeId` int NOT NULL,
	`logDate` date NOT NULL,
	`totalPackages` int NOT NULL DEFAULT 0,
	`packagesDelivered` int NOT NULL DEFAULT 0,
	`doublesReturns` int NOT NULL DEFAULT 0,
	`ratePerPackage` decimal(10,2) NOT NULL,
	`ratePerDouble` decimal(10,2) NOT NULL,
	`grossPay` decimal(10,2) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverCode` varchar(32) NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`ssnLast4` varchar(4),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`),
	CONSTRAINT `drivers_driverCode_unique` UNIQUE(`driverCode`)
);
--> statement-breakpoint
CREATE TABLE `pay_stubs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`weekStart` date NOT NULL,
	`weekEnd` date NOT NULL,
	`totalPackages` int NOT NULL DEFAULT 0,
	`totalDelivered` int NOT NULL DEFAULT 0,
	`totalDoubles` int NOT NULL DEFAULT 0,
	`grossPay` decimal(10,2) NOT NULL,
	`totalPenalties` decimal(10,2) NOT NULL DEFAULT '0.00',
	`totalPay` decimal(10,2) NOT NULL,
	`status` enum('draft','sent','approved','disputed') NOT NULL DEFAULT 'draft',
	`driverNotes` text,
	`sentAt` timestamp,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pay_stubs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `penalties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`dailyLogId` int,
	`description` varchar(500) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`penaltyDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `penalties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`routeNumber` varchar(32) NOT NULL,
	`zone` varchar(100),
	`description` text,
	`ratePerPackage` decimal(10,2) NOT NULL,
	`ratePerDouble` decimal(10,2) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `routes_id` PRIMARY KEY(`id`),
	CONSTRAINT `routes_routeNumber_unique` UNIQUE(`routeNumber`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `driverId` int;