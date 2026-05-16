const prisma = require('../src/config/prisma');
const stockService = require('../src/services/stockService');

async function initializeReorderLevels() {
    try {
        console.log('Fetching all products...');
        const products = await prisma.product.findMany({
            where: { isDeleted: false }
        });

        console.log(`Initializing reorder levels for ${products.length} products...`);
        for (const product of products) {
            await stockService.updateProductReorderLevel(product.id);
        }

        console.log('All reorder levels initialized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
}

initializeReorderLevels();
