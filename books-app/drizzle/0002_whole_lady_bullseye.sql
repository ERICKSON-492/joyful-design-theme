CREATE TABLE `customOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(120) NOT NULL,
	`category` varchar(120) NOT NULL,
	`vision` text,
	`colors` text,
	`requestedMaterials` text,
	`customerName` varchar(180) NOT NULL,
	`customerPhone` varchar(40) NOT NULL,
	`customerEmail` varchar(320),
	`deliveryLocation` varchar(240),
	`status` varchar(48) NOT NULL DEFAULT 'new',
	`orderDate` timestamp NOT NULL,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `customOrders_externalId_unique` UNIQUE(`externalId`)
);
--> statement-breakpoint
ALTER TABLE `storeOrders` ADD `customerPhone` varchar(40);--> statement-breakpoint
ALTER TABLE `storeOrders` ADD `shippingCost` decimal(12,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `storeOrders` ADD `items` text;--> statement-breakpoint
ALTER TABLE `storeProducts` ADD `subcategory` varchar(120);--> statement-breakpoint
ALTER TABLE `storeProducts` ADD `stock` decimal(12,3) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `storeProducts` ADD `active` int DEFAULT 1 NOT NULL;