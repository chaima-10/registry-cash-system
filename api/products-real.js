// Real database-connected products serverless function for Vercel with Aiven
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
  try {
    const { method } = req;
    const { id } = req.query;
    const startTime = Date.now();

    console.log(`[${new Date().toISOString()}] ${method} /api/products${id ? '/' + id : ''}`);
    console.log('DATABASE_URL configured:', !!process.env.DATABASE_URL);

    switch (method) {
      case 'GET':
        if (id) {
          const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
              category: true,
              subcategory: true,
            }
          });
          
          if (!product) {
            console.log(`Product not found: ${id}`);
            return res.status(404).json({ message: 'Product not found' });
          }
          
          console.log(`Product found: ${product.name}`);
          return res.json(product);
        }
        
        const products = await prisma.product.findMany({
          include: {
            category: true,
            subcategory: true,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        console.log(`Found ${products.length} products in database`);
        return res.json({ products });

      case 'POST':
        const { name, price, stockQuantity, barcode, categoryId, subcategoryId, purchasePrice, remise, tva } = req.body;
        
        console.log('Creating product:', { name, price, stockQuantity, barcode });
        
        if (!name || !price || !stockQuantity) {
          return res.status(400).json({ 
            message: 'Name, price, and stock quantity are required',
            missing: { name: !!name, price: !!price, stockQuantity: !!stockQuantity }
          });
        }

        // Check if barcode already exists
        if (barcode) {
          const existingProduct = await prisma.product.findFirst({
            where: { barcode: barcode.trim() }
          });
          
          if (existingProduct) {
            return res.status(400).json({ message: 'Product with this barcode already exists' });
          }
        }

        const newProduct = await prisma.product.create({
          data: {
            name: name.trim(),
            price: parseFloat(price),
            stockQuantity: parseInt(stockQuantity),
            barcode: barcode || `AUTO${Date.now()}`,
            categoryId: categoryId ? parseInt(categoryId) : null,
            subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
            purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
            remise: remise ? parseFloat(remise) : 0,
            tva: tva ? parseFloat(tva) : 20,
          },
          include: {
            category: true,
            subcategory: true,
          }
        });

        console.log(`Product created successfully: ${newProduct.name} (ID: ${newProduct.id})`);
        
        return res.status(201).json({
          message: 'Product created successfully',
          product: newProduct
        });

      case 'PUT':
        if (!id) {
          return res.status(400).json({ message: 'Product ID is required' });
        }

        const productId = parseInt(id);
        const updates = req.body;
        
        console.log(`Updating product ${productId}:`, updates);
        
        // Check if product exists
        const existingProduct = await prisma.product.findUnique({
          where: { id: productId }
        });
        
        if (!existingProduct) {
          return res.status(404).json({ message: 'Product not found' });
        }

        // Check barcode uniqueness if being updated
        if (updates.barcode && updates.barcode !== existingProduct.barcode) {
          const duplicateProduct = await prisma.product.findFirst({
            where: { 
              barcode: updates.barcode.trim(),
              id: { not: productId }
            }
          });
          
          if (duplicateProduct) {
            return res.status(400).json({ message: 'Product with this barcode already exists' });
          }
        }

        const updatedProduct = await prisma.product.update({
          where: { id: productId },
          data: {
            ...updates,
            updatedAt: new Date()
          },
          include: {
            category: true,
            subcategory: true,
          }
        });
        
        console.log(`Product updated successfully`);
        return res.json({
          message: 'Product updated successfully',
          product: updatedProduct
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ message: 'Product ID is required' });
        }

        const deleteId = parseInt(id);
        console.log(`Attempting to delete product: ${deleteId}`);
        
        // Check if product is linked to sales
        const existingSales = await prisma.saleItem.findFirst({
          where: { productId: deleteId }
        });

        if (existingSales) {
          return res.status(400).json({ 
            message: 'Cannot delete product: it is linked to existing sales. Consider disabling it instead.' 
          });
        }

        // Delete related cart items first
        await prisma.cartItem.deleteMany({
          where: { productId: deleteId }
        });

        // Delete the product
        const deletedProduct = await prisma.product.delete({
          where: { id: deleteId }
        });
        
        console.log(`Product deleted: ${deletedProduct.name} (ID: ${deleteId})`);
        
        return res.json({ 
          message: 'Product deleted successfully', 
          product: deletedProduct 
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ message: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Product API Error:', error);
    console.error('Stack:', error.stack);
    
    const responseTime = Date.now() - startTime;
    console.error(`Request failed after ${responseTime}ms`);
    
    // Check for database connection issues
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(500).json({ 
        message: 'Database connection failed. Check DATABASE_URL and Aiven configuration.',
        error: error.message,
        code: 'DB_CONNECTION_ERROR'
      });
    }
    
    if (error.code === 'P1001') {
      return res.status(500).json({ 
        message: 'Database connection timeout. Check Aiven network settings.',
        error: error.message,
        code: 'DB_TIMEOUT'
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
