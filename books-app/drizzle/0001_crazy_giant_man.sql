CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('supplier','shipping','packaging','marketing','wages','other') NOT NULL,
	`description` varchar(240) NOT NULL,
	`vendor` varchar(180),
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'KES',
	`expenseDate` timestamp NOT NULL,
	`paymentStatus` enum('paid','pending','cancelled') NOT NULL DEFAULT 'paid',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('raw_material','finished_product') NOT NULL,
	`name` varchar(180) NOT NULL,
	`materialId` int,
	`productExternalId` varchar(120),
	`unit` varchar(32) NOT NULL,
	`quantity` decimal(12,3) NOT NULL DEFAULT '0',
	`unitCost` decimal(12,2) NOT NULL DEFAULT '0',
	`reorderLevel` decimal(12,3) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventoryItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materialPriceHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`supplier` varchar(180),
	`unitPrice` decimal(12,2) NOT NULL,
	`effectiveDate` timestamp NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `materialPriceHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materialUsage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`materialId` int NOT NULL,
	`productExternalId` varchar(120),
	`customOrderRef` varchar(120),
	`quantity` decimal(12,3) NOT NULL,
	`unitCost` decimal(12,2) NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	`note` text,
	CONSTRAINT `materialUsage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`sku` varchar(64),
	`unit` varchar(32) NOT NULL,
	`supplier` varchar(180),
	`currentUnitPrice` decimal(12,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'KES',
	`reorderLevel` decimal(12,3) NOT NULL DEFAULT '0',
	`active` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stockMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryItemId` int NOT NULL,
	`movementType` enum('purchase','usage','adjustment','sale','return') NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`unitCost` decimal(12,2) NOT NULL,
	`reference` varchar(120),
	`movementDate` timestamp NOT NULL,
	`notes` text,
	CONSTRAINT `stockMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storeOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(120) NOT NULL,
	`customerName` varchar(180),
	`customerEmail` varchar(320),
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0',
	`currency` varchar(8) NOT NULL DEFAULT 'KES',
	`status` varchar(48) NOT NULL,
	`orderDate` timestamp NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storeOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `storeOrders_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `storeProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(120) NOT NULL,
	`name` varchar(240) NOT NULL,
	`category` varchar(120),
	`salePrice` decimal(12,2) NOT NULL DEFAULT '0',
	`currency` varchar(8) NOT NULL DEFAULT 'KES',
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storeProducts_id` PRIMARY KEY(`id`),
	CONSTRAINT `storeProducts_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `syncEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(80) NOT NULL,
	`status` enum('success','partial','failed') NOT NULL,
	`records` int NOT NULL DEFAULT 0,
	`message` text,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncEvents_id` PRIMARY KEY(`id`)
);
