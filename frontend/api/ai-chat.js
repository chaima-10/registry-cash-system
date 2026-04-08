export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { messages, systemContext } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    // Simple mock response for testing
    const mockResponse = "Désolé, je suis en mode test sur Vercel. Le backend fonctionne mais l'IA complète nécessite une base de données. Veuillez contacter l'administrateur pour configurer la base de données.";
    
    return res.json({ reply: mockResponse });
  } catch (error) {
    console.error('Error in AI Controller:', error);
    res.status(500).json({ message: "Erreur lors de la communication avec l'IA.", error: error.message });
  }
}
