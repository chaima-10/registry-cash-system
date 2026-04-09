// Real database-connected categories serverless function for Vercel with Aiven
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client for serverless environment
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  prisma = new PrismaClient();
}

// Handle graceful shutdown
if (process.env.NODE_ENV !== 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method } = req;
    const { id } = req.query;

    console.log(`[${new Date().toISOString()}] ${method} /api/categories${id ? '/' + id : ''}`);

    switch (method) {
      case 'GET':
        if (id) {
          const category = await prisma.category.findUnique({
            where: { id: parseInt(id) },
            include: {
              subcategories: true
            }
          });
          
          if (!category) {
            return res.status(404).json({ message: 'Category not found' });
          }
          
          return res.json(category);
        }
        
        const categories = await prisma.category.findMany({
          include: {
            subcategories: true
          },
          orderBy: {
            name: 'asc'
          }
        });
        
        console.log(`Found ${categories.length} categories in database`);
        return res.json({ categories });

      case 'POST':
        const { name } = req.body;
        
        if (!name) {
          return res.status(400).json({ message: 'Category name is required' });
        }

        const newCategory = await prisma.category.create({
          data: {
            name: name.trim()
          }
        });

        console.log(`Category created: ${newCategory.name} (ID: ${newCategory.id})`);
        
        return res.status(201).json({
          message: 'Category created successfully',
          category: newCategory
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
        return res.status(405).json({ message: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Category API Error:', error);
    
    // Check for database connection issues
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(500).json({ 
        message: 'Database connection failed. Check DATABASE_URL and Aiven configuration.',
        error: error.message,
        code: 'DB_CONNECTION_ERROR'
      });
    }
    
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Ensure database connection is closed in serverless environment
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    }
  }
}
