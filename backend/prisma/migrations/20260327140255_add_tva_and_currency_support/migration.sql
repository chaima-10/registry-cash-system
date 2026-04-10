-- Drop existing foreign keys (safe way for MySQL)
ALTER TABLE `Cart` DROP FOREIGN KEY IF EXISTS `Cart_userId_fkey`;

ALTER TABLE `CartItem` DROP FOREIGN KEY IF EXISTS `CartItem_cartId_fkey`;
ALTER TABLE `CartItem` DROP FOREIGN KEY IF EXISTS `CartItem_productId_fkey`;

ALTER TABLE `Product` DROP FOREIGN KEY IF EXISTS `Product_categoryId_fkey`;
ALTER TABLE `Product` DROP FOREIGN KEY IF EXISTS `Product_subcategoryId_fkey`;

ALTER TABLE `Sale` DROP FOREIGN KEY IF EXISTS `Sale_userId_fkey`;

ALTER TABLE `SaleItem` DROP FOREIGN KEY IF EXISTS `SaleItem_productId_fkey`;
ALTER TABLE `SaleItem` DROP FOREIGN KEY IF EXISTS `SaleItem_saleId_fkey`;

ALTER TABLE `Subcategory` DROP FOREIGN KEY IF EXISTS `Subcategory_categoryId_fkey`;

-- Note: We removed the DROP INDEX lines because MySQL does not support `DROP INDEX IF EXISTS` in this format (this was causing the 1064 error).

-- Add the new columns for TVA and currency support
ALTER TABLE `Cart` 
    ADD COLUMN `subtotalHT` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `tvaAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE `CartItem` 
    ADD COLUMN `tvaAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `tvaRate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE `Product` 
    ADD COLUMN `tva` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE `Sale` 
    ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    ADD COLUMN `subtotalHT` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `tvaAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

ALTER TABLE `SaleItem` 
    ADD COLUMN `tvaAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `tvaRate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

-- Re-add the foreign keys (they will also recreate the necessary indexes)
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Cart` ADD CONSTRAINT `Cart_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `Cart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Product` ADD CONSTRAINT `Product_subcategoryId_fkey` FOREIGN KEY (`subcategoryId`) REFERENCES `Subcategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Subcategory` ADD CONSTRAINT `Subcategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;