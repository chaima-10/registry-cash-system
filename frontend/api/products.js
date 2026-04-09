// Mock product data
let mockProducts = [
  { id: 1, barcode: '1234567890123', name: 'Test Product 1', price: 10.99, stockQuantity: 50, categoryId: 1, subcategoryId: 1 },
  { id: 2, barcode: '9876543210987', name: 'Test Product 2', price: 25.50, stockQuantity: 30, categoryId: 1, subcategoryId: 1 }
];

let nextId = 3;

export default function handler(req, res) {
  try {
    const { method } = req;
    const { id } = req.query;

    switch (method) {
      case 'GET':
        if (id) {
          const product = mockProducts.find(p => p.id === parseInt(id));
          if (!product) {
            return res.status(404).json({ message: 'Product not found' });
          }
          return res.json(product);
        }
        res.json({ products: mockProducts });
        break;

      case 'POST':
        const { name, price, stockQuantity, barcode, categoryId, subcategoryId } = req.body;
        
        if (!name || !price || !stockQuantity) {
          return res.status(400).json({ message: 'Name, price, and stock quantity are required' });
        }

        const newProduct = {
          id: nextId++,
          name,
          price: parseFloat(price),
          stockQuantity: parseInt(stockQuantity),
          barcode: barcode || `AUTO${nextId}`,
          categoryId: parseInt(categoryId) || 1,
          subcategoryId: parseInt(subcategoryId) || 1,
          createdAt: new Date().toISOString()
        };

        mockProducts.push(newProduct);
        res.status(201).json(newProduct);
        break;

      case 'PUT':
        if (!id) {
          return res.status(400).json({ message: 'Product ID is required' });
        }

        const productIndex = mockProducts.findIndex(p => p.id === parseInt(id));
        if (productIndex === -1) {
          return res.status(404).json({ message: 'Product not found' });
        }

        const updates = req.body;
        mockProducts[productIndex] = { ...mockProducts[productIndex], ...updates, updatedAt: new Date().toISOString() };
        res.json(mockProducts[productIndex]);
        break;

      case 'DELETE':
        if (!id) {
          return res.status(400).json({ message: 'Product ID is required' });
        }

        const productId = parseInt(id);
        console.log(`Attempting to delete product with ID: ${productId}`);
        
        // Find product index
        const deleteIndex = mockProducts.findIndex(p => p.id === productId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({ message: 'Product not found' });
        }
        
        // Remove product
        const deletedProduct = mockProducts.splice(deleteIndex, 1)[0];
        
        console.log(`Product ${productId} deleted successfully`);
        res.json({ message: 'Product deleted successfully', product: deletedProduct });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ message: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('Product API error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}
