const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupUnwantedProducts() {
    try {
        console.log('Starting cleanup process...');

        // ⚠️ IMPORTANT:
        // Before running this script, ensure your .env has the Aiven DATABASE_URL for production
        // Run with: node cleanup-aiven.js
        
        // Define the products you want to clean up here (by barcode or ID)
        const barcodesToCleanup = [
            // "1234567890123", // Example barcode
            // "9876543210987"
        ];

        if (barcodesToCleanup.length === 0) {
            console.log('No barcodes provided in `barcodesToCleanup`. Exiting...');
            // In case you just want to find all that should be deleted, add logic here.
            return;
        }

        for (const barcode of barcodesToCleanup) {
            const product = await prisma.product.findUnique({
                where: { barcode: String(barcode) }
            });

            if (!product) {
                console.log(`Product not found: ${barcode}`);
                continue;
            }

            console.log(`Processing product: ${product.name} (${product.barcode})...`);
            
            // 1. Remove from all active carts
            await prisma.cartItem.deleteMany({
                where: { productId: product.id }
            });

            /*
            // --- OPTION A: SOFT DELETE (RECOMMENDED) ---
            // Keeps analytics and sales history intact.
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    isDeleted: true,
                    status: 'Deleted',
                    barcode: `${product.barcode}-deleted-${Date.now()}` // Free up original barcode
                }
            });
            console.log(`✅ Soft-deleted product: ${product.name}`);
            */

             
            // --- OPTION B: HARD DELETE ---
            // Removes product entirely. (Nullifies relation in old sales, which can impact reporting)
            await prisma.saleItem.updateMany({
                where: { productId: product.id },
                data: { productId: null }
            });

            await prisma.product.delete({
                where: { id: product.id }
            });
            console.log(`✅ Hard-deleted product from DB: ${product.name}`);
            
        }

        console.log('Cleanup completed successfully.');
    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupUnwantedProducts();
