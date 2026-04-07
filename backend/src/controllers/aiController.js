const aiService = require('../api/aiService');

exports.chat = async (req, res) => {
    try {
        const { messages, systemContext } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Messages array is required' });
        }

        const reply = await aiService.generateResponse(messages, systemContext);
        
        return res.json({ reply });

    } catch (error) {
        console.error('Error in AI Controller:', error);
        res.status(500).json({ message: "Erreur lors de la communication avec l'IA.", error: error.message });
    }
};
