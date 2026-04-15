-- Safe way to drop indexes and re-add columns
DROP PROCEDURE IF EXISTS DropIndexIfExists;
DELIMITER //
CREATE PROCEDURE DropIndexIfExists(IN tableName VARCHAR(64), IN indexName VARCHAR(64))
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = tableName 
        AND INDEX_NAME = indexName
    ) THEN
        SET @query = CONCAT('ALTER TABLE `', tableName, '` DROP INDEX `', indexName, '`');
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL DropIndexIfExists('Cart', 'Cart_userId_fkey');
CALL DropIndexIfExists('CartItem', 'CartItem_cartId_fkey');
CALL DropIndexIfExists('CartItem', 'CartItem_productId_fkey');
CALL DropIndexIfExists('Product', 'Product_categoryId_fkey');
CALL DropIndexIfExists('Product', 'Product_subcategoryId_fkey');
CALL DropIndexIfExists('Sale', 'Sale_userId_fkey');
CALL DropIndexIfExists('SaleItem', 'SaleItem_productId_fkey');
CALL DropIndexIfExists('SaleItem', 'SaleItem_saleId_fkey');
CALL DropIndexIfExists('Subcategory', 'Subcategory_categoryId_fkey');

DROP PROCEDURE IF EXISTS DropIndexIfExists;

-- Safe way to add columns
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DELIMITER //
CREATE PROCEDURE AddColumnIfNotExists(IN tableName VARCHAR(64), IN colName VARCHAR(64), IN colType VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = tableName 
        AND COLUMN_NAME = colName
    ) THEN
        SET @query = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', colName, '` ', colType);
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL AddColumnIfNotExists('CartItem', 'priceTTC', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('Sale', 'exchangeRate', 'DECIMAL(10, 4) NOT NULL DEFAULT 1.0000');
CALL AddColumnIfNotExists('SaleItem', 'priceTTC', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- Re-add foreign keys
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Cart` ADD CONSTRAINT `Cart_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `Cart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_subcategoryId_fkey` FOREIGN KEY (`subcategoryId`) REFERENCES `Subcategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Subcategory` ADD CONSTRAINT `Subcategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
