const prisma = require('../config/prisma');

class StockService {
    /**
     * Calculates the reorder level for a product.
     * If safetyStock is manually set (> 0), use it directly as the reorder level.
     * Otherwise: (Average Daily Sales * 7) + safetyStock, minimum 5.
     */
    async calculateReorderLevel(productId) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { safetyStock: true }
        });

        if (!product) return 5;

        // If user manually set a safety stock, use it directly as the reorder level
        if (product.safetyStock && Number(product.safetyStock) > 0) {
            return Number(product.safetyStock);
        }

        // Otherwise calculate from sales history
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesItems = await prisma.saleitem.findMany({
            where: {
                productId: productId,
                sale: {
                    createdAt: {
                        gte: thirtyDaysAgo
                    }
                }
            },
            select: {
                quantity: true
            }
        });

        const totalSold = salesItems.reduce((sum, item) => sum + item.quantity, 0);
        const averageDailySales = totalSold / 30;

        // reorderLevel = (averageDailySales * 7) + safetyStock
        let calculatedLevel = (averageDailySales * 7) + (product.safetyStock || 0);

        // Fallback to minimum threshold of 5
        const finalReorderLevel = Math.max(calculatedLevel, 5);

        return finalReorderLevel;
    }

    /**
     * Updates a product's reorderLevel in the database.
     */
    async updateProductReorderLevel(productId) {
        try {
            const reorderLevel = await this.calculateReorderLevel(productId);
            
            await prisma.product.update({
                where: { id: productId },
                data: {
                    reorderLevel: reorderLevel.toString()
                }
            });

            console.log(`Updated reorderLevel for product ${productId} to ${reorderLevel}`);
        } catch (error) {
            console.error(`Error updating reorderLevel for product ${productId}:`, error);
        }
    }
}

module.exports = new StockService();
