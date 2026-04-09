// Database connection test endpoint for Vercel
const { PrismaClient } = require('@prisma/client');

export default async function handler(req, res) {
  try {
    console.log('=== DATABASE CONNECTION TEST ===');
    console.log('DATABASE_URL configured:', !!process.env.DATABASE_URL);
    console.log('JWT_SECRET configured:', !!process.env.JWT_SECRET);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // Initialize Prisma client
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Test database connection
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('Database connection successful!');

    // Test database operations
    const tests = [];

    // Test 1: Count users
    try {
      const userCount = await prisma.user.count();
      tests.push({ name: 'User Count', status: 'success', value: userCount });
      console.log(`Users in database: ${userCount}`);
    } catch (error) {
      tests.push({ name: 'User Count', status: 'error', error: error.message });
    }

    // Test 2: Count products
    try {
      const productCount = await prisma.product.count();
      tests.push({ name: 'Product Count', status: 'success', value: productCount });
      console.log(`Products in database: ${productCount}`);
    } catch (error) {
      tests.push({ name: 'Product Count', status: 'error', error: error.message });
    }

    // Test 3: Count categories
    try {
      const categoryCount = await prisma.category.count();
      tests.push({ name: 'Category Count', status: 'success', value: categoryCount });
      console.log(`Categories in database: ${categoryCount}`);
    } catch (error) {
      tests.push({ name: 'Category Count', status: 'error', error: error.message });
    }

    // Test 4: Test giveaway tables (they might not exist yet)
    try {
      const giveawayCount = await prisma.giveaway.count();
      tests.push({ name: 'Giveaway Count', status: 'success', value: giveawayCount });
      console.log(`Giveaways in database: ${giveawayCount}`);
    } catch (error) {
      tests.push({ name: 'Giveaway Count', status: 'error', error: error.message });
      console.log('Giveaway tables might not exist yet (this is expected)');
    }

    // Test 5: Test sample query
    try {
      const sampleProducts = await prisma.product.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          price: true,
          stockQuantity: true
        }
      });
      tests.push({ name: 'Sample Query', status: 'success', value: sampleProducts.length });
      console.log(`Sample products found: ${sampleProducts.length}`);
    } catch (error) {
      tests.push({ name: 'Sample Query', status: 'error', error: error.message });
    }

    // Test 6: Test database schema
    try {
      const schemaInfo = await prisma.$queryRaw`SHOW TABLES`;
      tests.push({ name: 'Schema Info', status: 'success', value: schemaInfo.length });
      console.log(`Tables in database: ${schemaInfo.length}`);
    } catch (error) {
      tests.push({ name: 'Schema Info', status: 'error', error: error.message });
    }

    await prisma.$disconnect();

    // Calculate success rate
    const successCount = tests.filter(t => t.status === 'success').length;
    const totalTests = tests.length;
    const successRate = Math.round((successCount / totalTests) * 100);

    const result = {
      status: successRate >= 50 ? 'success' : 'partial',
      message: successRate === 100 ? 'All database tests passed!' : `Database connection working with ${successRate}% success rate`,
      tests,
      successRate,
      environment: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    };

    console.log('=== TEST RESULTS ===');
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Status: ${result.status}`);
    console.log('=== END TEST ===');

    return res.status(200).json(result);

  } catch (error) {
    console.error('DATABASE CONNECTION TEST FAILED:', error);
    console.error('Stack:', error.stack);

    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      environment: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
        NODE_ENV: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    });
  }
}
