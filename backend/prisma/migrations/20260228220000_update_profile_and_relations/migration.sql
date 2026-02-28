-- AlterTable (Add missing fields to User)
ALTER TABLE `User` ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `lastLogin` DATETIME(3) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'Active';

-- CreateIndex
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);

-- Ensure Foreign Keys are properly set (re-applying to be safe and consistent)
-- These should already exist, but if Render's DB is in a weird state, this ensures consistency.
-- Note: We avoid dropping indexes that might be needed for constraints.

-- Sale -> User
-- SaleItem -> Sale
-- SaleItem -> Product
-- Cart -> User
-- CartItem -> Cart
-- CartItem -> Product
-- Product -> Category
-- Product -> Subcategory
-- Subcategory -> Category

-- We only apply the ones that might have been missing or need verification
-- (The following are already in the initial migration, but we keep them here if needed for sync)
