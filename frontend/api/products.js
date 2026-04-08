// Mock product data
let mockProducts = [
  { id: 1, barcode: '1234567890123', name: 'Test Product 1', price: 10.99, stockQuantity: 50 },
  { id: 2, barcode: '9876543210987', name: 'Test Product 2', price: 25.50, stockQuantity: 30 }
];

export default function handler(req, res) {
  try {
    if (req.method === 'GET') {
      res.json({ products: mockProducts });
    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      const productId = parseInt(id);
      
      console.log(`Attempting to delete product with ID: ${productId}`);
      
      // Find product index
      const productIndex = mockProducts.findIndex(p => p.id === productId);
      
      if (productIndex === -1) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Remove product
      mockProducts.splice(productIndex, 1);
      
      console.log(`Product ${productId} deleted successfully`);
      res.json({ message: 'Product deleted successfully' });
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}
