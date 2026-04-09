// Enhanced product serverless function with better error handling
let mockProducts = [
  { 
    id: 1, 
    barcode: '1234567890123', 
    name: 'Test Product 1', 
    price: 10.99, 
    stockQuantity: 50, 
    categoryId: 1, 
    subcategoryId: 1,
    purchasePrice: 5.50,
    remise: 0,
    tva: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 2, 
    barcode: '9876543210987', 
    name: 'Test Product 2', 
    price: 25.50, 
    stockQuantity: 30, 
    categoryId: 1, 
    subcategoryId: 1,
    purchasePrice: 15.00,
    remise: 10,
    tva: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let nextId = 3;
let mockCategories = [
  { id: 1, name: 'Electronics', subcategories: [{ id: 1, name: 'Accessories' }] },
  { id: 2, name: 'Food', subcategories: [{ id: 2, name: 'Snacks' }] }
];

export default function handler(req, res) {
  try {
    const { method } = req;
    const { id } = req.query;
    const startTime = Date.now();

    console.log(`[${new Date().toISOString()}] ${method} /api/products${id ? '/' + id : ''}`);

    switch (method) {
      case 'GET':
        if (id) {
          const product = mockProducts.find(p => p.id === parseInt(id));
          if (!product) {
            console.log(`Product not found: ${id}`);
            return res.status(404).json({ message: 'Product not found' });
          }
          console.log(`Product found: ${product.name}`);
          return res.json(product);
        }
        
        console.log(`Returning ${mockProducts.length} products`);
        return res.json({ products: mockProducts });

      case 'POST':
        const { name, price, stockQuantity, barcode, categoryId, subcategoryId, purchasePrice, remise, tva } = req.body;
        
        console.log('Creating product:', { name, price, stockQuantity, barcode });
        
        if (!name || !price || !stockQuantity) {
          console.log('Missing required fields:', { name, price, stockQuantity });
          return res.status(400).json({ 
            message: 'Name, price, and stock quantity are required',
            missing: { name: !!name, price: !!price, stockQuantity: !!stockQuantity }
          });
        }

        const newProduct = {
          id: nextId++,
          name: name.trim(),
          price: parseFloat(price),
          stockQuantity: parseInt(stockQuantity),
          barcode: barcode || `AUTO${nextId}`,
          categoryId: parseInt(categoryId) || 1,
          subcategoryId: parseInt(subcategoryId) || 1,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          remise: remise ? parseFloat(remise) : 0,
          tva: tva ? parseFloat(tva) : 20,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        mockProducts.push(newProduct);
        console.log(`Product created successfully: ${newProduct.name} (ID: ${newProduct.id})`);
        
        return res.status(201).json({
          message: 'Product created successfully',
          product: newProduct
        });

      case 'PUT':
        if (!id) {
          return res.status(400).json({ message: 'Product ID is required' });
        }

        const productIndex = mockProducts.findIndex(p => p.id === parseInt(id));
        if (productIndex === -1) {
          return res.status(404).json({ message: 'Product not found' });
        }

        const updates = req.body;
        console.log(`Updating product ${id}:`, updates);
        
        mockProducts[productIndex] = { 
          ...mockProducts[productIndex], 
          ...updates, 
          updatedAt: new Date().toISOString() 
        };
        
        console.log(`Product updated successfully`);
        return res.json({
          message: 'Product updated successfully',
          product: mockProducts[productIndex]
        });

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ message: 'Product ID is required' });
        }

        const productId = parseInt(id);
        const deleteIndex = mockProducts.findIndex(p => p.id === productId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({ message: 'Product not found' });
        }
        
        const deletedProduct = mockProducts.splice(deleteIndex, 1)[0];
        console.log(`Product deleted: ${deletedProduct.name} (ID: ${productId})`);
        
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
    
    return res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
