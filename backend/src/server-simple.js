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

// Mock Giveaway Data
let mockGiveaways = [
    {
        id: 1,
        title: "Test Giveaway 1",
        description: "Test giveaway for demo purposes",
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        winnerCount: 1,
        status: "ACTIVE",
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

let mockParticipants = [];
let mockWinners = [];

// Giveaway Routes
app.get('/api/giveaways', (req, res) => {
    try {
        const formattedGiveaways = mockGiveaways.map(giveaway => ({
            ...giveaway,
            participantCount: mockParticipants.filter(p => p.giveawayId === giveaway.id).length,
            creator: { id: 1, username: "admin" }
        }));
        res.json(formattedGiveaways);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching giveaways', error: error.message });
    }
});

app.get('/api/giveaways/:id', (req, res) => {
    try {
        const { id } = req.params;
        const giveawayId = parseInt(id);
        const giveaway = mockGiveaways.find(g => g.id === giveawayId);
        
        if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
        }

        const participants = mockParticipants.filter(p => p.giveawayId === giveawayId);
        const winners = mockWinners.filter(w => w.giveawayId === giveawayId);

        res.json({
            ...giveaway,
            participants: participants.map(p => ({
                ...p,
                user: { id: p.userId, username: `user${p.userId}` }
            })),
            winners: winners.map(w => ({
                ...w,
                user: { id: w.userId, username: `user${w.userId}` }
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching giveaway', error: error.message });
    }
});

app.post('/api/giveaways', (req, res) => {
    try {
        const { title, description, startDate, endDate, winnerCount } = req.body;
        
        if (!title || !endDate) {
            return res.status(400).json({ message: 'Title and end date are required' });
        }

        if (new Date(endDate) <= new Date()) {
            return res.status(400).json({ message: 'End date must be in the future' });
        }

        const newGiveaway = {
            id: mockGiveaways.length + 1,
            title,
            description,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: new Date(endDate),
            winnerCount: parseInt(winnerCount) || 1,
            status: 'ACTIVE',
            createdBy: 1,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        mockGiveaways.push(newGiveaway);
        res.status(201).json(newGiveaway);
    } catch (error) {
        res.status(500).json({ message: 'Error creating giveaway', error: error.message });
    }
});

app.post('/api/giveaways/:id/participate', (req, res) => {
    try {
        const { id } = req.params;
        const giveawayId = parseInt(id);
        const userId = 1; // Mock user ID

        const giveaway = mockGiveaways.find(g => g.id === giveawayId);
        
        if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
        }

        if (giveaway.status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Giveaway is not active' });
        }

        if (new Date(giveaway.endDate) <= new Date()) {
            return res.status(400).json({ message: 'Giveaway has ended' });
        }

        const existingParticipation = mockParticipants.find(p => p.giveawayId === giveawayId && p.userId === userId);
        
        if (existingParticipation) {
            return res.status(400).json({ message: 'You have already participated in this giveaway' });
        }

        const participation = {
            id: mockParticipants.length + 1,
            giveawayId,
            userId,
            joinedAt: new Date()
        };

        mockParticipants.push(participation);
        res.status(201).json({ message: 'Successfully participated in giveaway', participation });
    } catch (error) {
        res.status(500).json({ message: 'Error participating in giveaway', error: error.message });
    }
});

app.post('/api/giveaways/:id/select-winners', (req, res) => {
    try {
        const { id } = req.params;
        const giveawayId = parseInt(id);

        const giveaway = mockGiveaways.find(g => g.id === giveawayId);
        
        if (!giveaway) {
            return res.status(404).json({ message: 'Giveaway not found' });
        }

        if (giveaway.status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Giveaway is not active' });
        }

        const participants = mockParticipants.filter(p => p.giveawayId === giveawayId);
        
        if (participants.length === 0) {
            return res.status(400).json({ message: 'No participants in this giveaway' });
        }

        const existingWinners = mockWinners.filter(w => w.giveawayId === giveawayId);
        if (existingWinners.length > 0) {
            return res.status(400).json({ message: 'Winners have already been selected' });
        }

        // Random winner selection
        const shuffledParticipants = [...participants].sort(() => 0.5 - Math.random());
        const selectedWinners = shuffledParticipants.slice(0, Math.min(giveaway.winnerCount, participants.length));

        // Create winner records
        const winnerData = selectedWinners.map((participant, index) => ({
            id: mockWinners.length + index + 1,
            giveawayId,
            userId: participant.userId,
            rank: index + 1,
            selectedAt: new Date()
        }));

        mockWinners.push(...winnerData);

        // Update giveaway status
        const giveawayIndex = mockGiveaways.findIndex(g => g.id === giveawayId);
        mockGiveaways[giveawayIndex].status = 'ENDED';

        res.json({ 
            message: 'Winners selected successfully', 
            winners: winnerData,
            totalParticipants: participants.length 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error selecting winners', error: error.message });
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
