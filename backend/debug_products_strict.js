const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugProducts() {
    try {
        // 1. Verify Database URL
        const dbUrl = process.env.DATABASE_URL || 'Not Set';
        // Masking password for log safety, but showing host/db
        const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
        console.log('1. DATABASE_URL:', maskedUrl);

        // Match regex to extract host and db name for user verification
        const match = dbUrl.match(/@([^:\/]+)(?::\d+)?\/([^?]+)/);
        if (match) {
            console.log('   Host:', match[1]);
            console.log('   DB Name:', match[2]);
        } else {
            console.log('   Could not parse DB URL format.');
        }

        // 2. Query with Prisma (No includes)
        console.log('\n2. Prisma Query (findMany)...');
        const prismaProducts = await prisma.product.findMany();
        console.log(`   Count: ${prismaProducts.length}`);
        if (prismaProducts.length > 0) {
            console.log('   First Item:', prismaProducts[0]);
        } else {
            console.log('   Result: [] (Empty)');
        }

        // 3. Query with Raw SQL
        console.log('\n3. Raw SQL Query (SELECT * FROM Product)...');
        try {
            // Note: Table names in Prisma are usually mapped to models. 
            // Default is "Product" (TitleCase) or "product" (lowercase) depending on DB.
            // Prisma schema has `model Product`. By default in MySQL with Prisma it matches.
            // But if the table is named differently we'll see.
            // Try "Product" first.
            let rawProducts = await prisma.$queryRawUnsafe('SELECT * FROM Product');
            console.log(`   Count: ${rawProducts.length}`);
            if (rawProducts.length > 0) {
                console.log('   First Item:', rawProducts[0]);
            } else {
                console.log('   Result: [] (Empty)');
            }
        } catch (e) {
            console.log('   Error querying "Product" table:', e.message);
            console.log('   Trying lowercase "product"...');
            try {
                let rawProducts = await prisma.$queryRawUnsafe('SELECT * FROM product');
                console.log(`   Count: ${rawProducts.length}`);
                if (rawProducts.length > 0) {
                    console.log('   First Item:', rawProducts[0]);
                }
            } catch (e2) {
                console.log('   Error querying "product" table:', e2.message);
            }
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugProducts();
