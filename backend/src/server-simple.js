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
