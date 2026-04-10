-- DropIndex
ALTER TABLE `Cart` DROP FOREIGN KEY IF EXISTS `Cart_userId_fkey`;
DROP INDEX IF EXISTS `Cart_userId_fkey` ON `Cart`;

-- DropIndex
DROP INDEX `CartItem_cartId_fkey` ON `CartItem`;

-- DropIndex
DROP INDEX `CartItem_productId_fkey` ON `CartItem`;

-- DropIndex
DROP INDEX `Product_categoryId_fkey` ON `Product`;

-- DropIndex
DROP INDEX `Product_subcategoryId_fkey` ON `Product`;

-- DropIndex
DROP INDEX `Sale_userId_fkey` ON `Sale`;

-- DropIndex
DROP INDEX `SaleItem_productId_fkey` ON `SaleItem`;

-- DropIndex
DROP INDEX `SaleItem_saleId_fkey` ON `SaleItem`;

-- DropIndex
DROP INDEX `Subcategory_categoryId_fkey` ON `Subcategory`;

-- AlterTable
ALTER TABLE `Cart` ADD COLUMN `subtotalHT` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `tvaAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `CartItem` ADD COLUMN `tvaAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `tvaRate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `tva` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    ADD COLUMN `subtotalHT` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `tvaAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE `SaleItem` ADD COLUMN `tvaAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `tvaRate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cart` ADD CONSTRAINT `Cart_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `Cart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_subcategoryId_fkey` FOREIGN KEY (`subcategoryId`) REFERENCES `Subcategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subcategory` ADD CONSTRAINT `Subcategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
