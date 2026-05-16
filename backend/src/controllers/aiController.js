const aiService = require('../services/aiService');

exports.chat = async (req, res) => {
    try {
        const { messages, systemContext } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Messages array is required' });
        }

        const { reply, provider } = await aiService.generateResponse(messages, systemContext);
        
        return res.json({ reply, provider });

    } catch (error) {
        console.error('Error in AI Controller:', error);
        res.status(500).json({ message: "Erreur lors de la communication avec l'IA.", error: error.message });
    }
};
