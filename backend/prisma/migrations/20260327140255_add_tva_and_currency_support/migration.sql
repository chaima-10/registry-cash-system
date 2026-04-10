-- Safe way to drop foreign keys in MySQL
DROP PROCEDURE IF EXISTS DropForeignKeyIfExists;
DELIMITER //
CREATE PROCEDURE DropForeignKeyIfExists(IN tableName VARCHAR(64), IN constraintName VARCHAR(64))
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = tableName 
        AND CONSTRAINT_NAME = constraintName 
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        SET @query = CONCAT('ALTER TABLE `', tableName, '` DROP FOREIGN KEY `', constraintName, '`');
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Call the procedure for each foreign key
CALL DropForeignKeyIfExists('Cart', 'Cart_userId_fkey');
CALL DropForeignKeyIfExists('CartItem', 'CartItem_cartId_fkey');
CALL DropForeignKeyIfExists('CartItem', 'CartItem_productId_fkey');
CALL DropForeignKeyIfExists('Product', 'Product_categoryId_fkey');
CALL DropForeignKeyIfExists('Product', 'Product_subcategoryId_fkey');
CALL DropForeignKeyIfExists('Sale', 'Sale_userId_fkey');
CALL DropForeignKeyIfExists('SaleItem', 'SaleItem_productId_fkey');
CALL DropForeignKeyIfExists('SaleItem', 'SaleItem_saleId_fkey');
CALL DropForeignKeyIfExists('Subcategory', 'Subcategory_categoryId_fkey');

DROP PROCEDURE IF EXISTS DropForeignKeyIfExists;

-- Add the new columns for TVA and currency support
-- We use a similar procedure for columns to ensure idempotency
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

CALL AddColumnIfNotExists('Cart', 'subtotalHT', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('Cart', 'tvaAmount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('CartItem', 'tvaAmount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('CartItem', 'tvaRate', 'DECIMAL(5, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('Product', 'tva', 'DECIMAL(5, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('Sale', 'currency', "VARCHAR(191) NOT NULL DEFAULT 'USD'");
CALL AddColumnIfNotExists('Sale', 'subtotalHT', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('Sale', 'tvaAmount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('SaleItem', 'tvaAmount', 'DECIMAL(10, 2) NOT NULL DEFAULT 0.00');
CALL AddColumnIfNotExists('SaleItem', 'tvaRate', 'DECIMAL(5, 2) NOT NULL DEFAULT 0.00');

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- Re-add the foreign keys
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Cart` ADD CONSTRAINT `Cart_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_cartId_fkey` FOREIGN KEY (`cartId`) REFERENCES `Cart`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_subcategoryId_fkey` FOREIGN KEY (`subcategoryId`) REFERENCES `Subcategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Subcategory` ADD CONSTRAINT `Subcategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;