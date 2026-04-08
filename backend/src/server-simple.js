const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars before anything else
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock product data for testing
let mockProducts = [
    { id: 1, barcode: '1234567890123', name: 'Test Product 1', price: 10.99, stockQuantity: 50 },
    { id: 2, barcode: '9876543210987', name: 'Test Product 2', price: 25.50, stockQuantity: 30 }
];

// Basic AI Route without database dependency
app.post('/api/ai/chat', (req, res) => {
    try {
        const { messages, systemContext } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Messages array is required' });
        }

        // Simple mock response for testing
        const mockResponse = "Désolé, je suis en mode test. Le backend fonctionne mais l'IA complète nécessite une base de données. Veuillez contacter l'administrateur pour configurer la base de données.";
        
        return res.json({ reply: mockResponse });
    } catch (error) {
        console.error('Error in AI Controller:', error);
        res.status(500).json({ message: "Erreur lors de la communication avec l'IA.", error: error.message });
    }
});

// Mock Product Routes
app.get('/api/products', (req, res) => {
    try {
        res.json({ products: mockProducts });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error: error.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        const { id } = req.params;
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
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Backend is running in simple mode!');
});

const startServer = async () => {
    try {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('AI endpoint available at: http://localhost:5000/api/ai/chat');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
};

startServer();
