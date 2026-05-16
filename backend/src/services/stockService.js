const prisma = require('../config/prisma');

class StockService {
    /**
     * Calculates the reorder level for a product based on the last 30 days of sales history.
     * Logic: (Average Daily Sales * 7) + Safety Stock
     * Fallback: 5 units if the result is lower.
     */
    async calculateReorderLevel(productId) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { safetyStock: true }
        });

        if (!product) return 5;

        // Get sales from the last 30 days
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
