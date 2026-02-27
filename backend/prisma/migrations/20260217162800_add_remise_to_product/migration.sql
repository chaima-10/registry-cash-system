-- AlterTable: Add remise column to Product (simple, no index drops)
ALTER TABLE `Product` ADD COLUMN `remise` DECIMAL(5, 2) NOT NULL DEFAULT 0;
