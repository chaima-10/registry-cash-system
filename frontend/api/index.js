// Universal API router for Vercel - handles all API requests
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

// Initialize Prisma client
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

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: '24h' }
  );
};

// Helper function to verify token
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  const { method, url } = req;
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] ${method} ${url}`);

  try {
    // Parse URL path
    const path = url.replace('/api/', '');
    const pathParts = path.split('/');
    const endpoint = pathParts[0];
    const id = pathParts[1];
    const action = pathParts[2];

    console.log(`Parsed: endpoint=${endpoint}, id=${id}, action=${action}`);

    // AUTH ENDPOINTS
    if (endpoint === 'auth-real') {
      if (method === 'POST' && action === 'login') {
        const { username, password } = req.body;
        
        if (!username || !password) {
          return res.status(400).json({ message: 'Username and password are required' });
        }

        const user = await prisma.user.findUnique({
          where: { username: username.trim() }
        });
        
        if (!user || password !== user.password) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user);
        
        return res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }

      if (method === 'POST' && action === 'register') {
        const { username, email, password, role = 'cashier' } = req.body;
        
        if (!username || !email || !password) {
          return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: username.trim() },
              { email: email.trim() }
            ]
          }
        });
        
        if (existingUser) {
          return res.status(400).json({ message: 'Username or email already exists' });
        }

        const newUser = await prisma.user.create({
          data: {
            username: username.trim(),
            email: email.trim(),
            password: password,
            role: role
          }
        });
        
        const token = generateToken(newUser);
        
        return res.status(201).json({
          message: 'Registration successful',
          token,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role
          }
        });
      }

      if (method === 'GET' && action === 'me') {
        const decoded = verifyToken(req);
        
        if (!decoded) {
          return res.status(401).json({ message: 'Invalid token' });
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        });
        
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        return res.json(user);
      }
    }

    // PRODUCTS ENDPOINTS
    if (endpoint === 'products-real') {
      if (method === 'GET') {
        if (id) {
          const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
              category: true,
              subcategory: true,
            }
          });
          
          if (!product) {
            return res.status(404).json({ message: 'Product not found' });
          }
          
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
        
        return res.json({ products });
      }

      if (method === 'POST') {
        const { name, price, stockQuantity, barcode, categoryId, subcategoryId, purchasePrice, remise, tva } = req.body;
        
        if (!name || !price || !stockQuantity) {
          return res.status(400).json({ 
            message: 'Name, price, and stock quantity are required'
          });
        }

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

        return res.status(201).json({
          message: 'Product created successfully',
          product: newProduct
        });
      }

      if (method === 'PUT' && id) {
        const productId = parseInt(id);
        const updates = req.body;
        
        const existingProduct = await prisma.product.findUnique({
          where: { id: productId }
        });
        
        if (!existingProduct) {
          return res.status(404).json({ message: 'Product not found' });
        }

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
        
        return res.json({
          message: 'Product updated successfully',
          product: updatedProduct
        });
      }

      if (method === 'DELETE' && id) {
        const productId = parseInt(id);
        
        const existingSales = await prisma.saleItem.findFirst({
          where: { productId }
        });

        if (existingSales) {
          return res.status(400).json({ 
            message: 'Cannot delete product: it is linked to existing sales.' 
          });
        }

        await prisma.cartItem.deleteMany({
          where: { productId }
        });

        const deletedProduct = await prisma.product.delete({
          where: { id: productId }
        });
        
        return res.json({ 
          message: 'Product deleted successfully', 
          product: deletedProduct 
        });
      }
    }

    // CATEGORIES ENDPOINTS
    if (endpoint === 'categories-real') {
      if (method === 'GET') {
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
        
        return res.json({ categories });
      }

      if (method === 'POST') {
        const { name } = req.body;
        
        if (!name) {
          return res.status(400).json({ message: 'Category name is required' });
        }

        const newCategory = await prisma.category.create({
          data: {
            name: name.trim()
          }
        });

        return res.status(201).json({
          message: 'Category created successfully',
          category: newCategory
        });
      }
    }

    // DEFAULT RESPONSE
    return res.status(404).json({ 
      message: 'API endpoint not found',
      availableEndpoints: [
        'POST /api/auth-real/login',
        'POST /api/auth-real/register', 
        'GET /api/auth-real/me',
        'GET /api/products-real',
        'POST /api/products-real',
        'PUT /api/products-real/:id',
        'DELETE /api/products-real/:id',
        'GET /api/categories-real',
        'POST /api/categories-real'
      ]
    });

  } catch (error) {
    console.error('Universal API Error:', error);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (process.env.NODE_ENV === 'production') {
      await prisma.$disconnect();
    }
  }
}
