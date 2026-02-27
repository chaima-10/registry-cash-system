-- AlterTable: Add theme column to User (simple, no index drops)
ALTER TABLE `User` ADD COLUMN `theme` VARCHAR(191) NOT NULL DEFAULT 'light';
