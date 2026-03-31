const Anthropic = require('@anthropic-ai/sdk');

exports.chat = async (req, res) => {
    try {
        const { messages, systemContext } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Messages array is required' });
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const systemPrompt = `Tu es un assistant IA intégré à un système de caisse enregistreuse et de gestion de stock (Registry Cash System).
Ton rôle est d'analyser les données du magasin et de donner des conseils stratégiques au gérant (promotions, stock, etc.).
Voici le contexte actuel des ventes et des produits :
${systemContext || "Aucune donnée fournie pour l'instant."}

Réponds de manière concise, professionnelle, et en te basant exclusivement sur ces données.`;

        if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'votre_cle_api_ici') {
            console.log("Mock AI Mode: Missing API key");
            // Delai de traitement simulé
            await new Promise(resolve => setTimeout(resolve, 1500));
            const lastMessage = messages[messages.length - 1].content.toLowerCase();
            let mockResponse = "Je n'ai pas de clé API valide pour le moment, mais je peux vous donner une réponse simulée : Les ventes ont l'air correctes.";
            
            if (lastMessage.includes('remise')) {
                mockResponse = "💡 **Suggestion de Remise**\n\nPour encourager l'écoulement des produits lents, je vous propose d'appliquer une remise de -15% ou -20%. Un pack \"Achetez 2, obtenez le 3ème à moitié prix\" fonctionne bien aussi.";
            } else if (lastMessage.includes('promotion') || lastMessage.includes('promotions')) {
                mockResponse = "🔥 **Promotions Recommandées**\n\nLes produits dont le stock ne diminue pas devraient bénéficier d'une remise d'au moins 20%. Pour les Tops Produits, aucune promotion n'est nécessaire car ils se vendent très bien seuls.";
            } else if (lastMessage.includes('vente') || lastMessage.includes('mois')) {
                mockResponse = "📈 **Analyse des Ventes**\n\nLe chiffre d'affaires est stable aujourd'hui ! Je vous conseille d'optimiser l'inventaire avant la fin du mois. Surveillez les statistiques horaires pour ajuster le personnel si les pics de ventes se confirment l'après-midi.";
            } else if (lastMessage.includes('stock') || lastMessage.includes('alerte')) {
                mockResponse = "⚠️ **Stock Critique**\n\nVos alertes montrent plusieurs articles avec moins de 10 unités restantes. Vous devez réapprovisionner ces produits d'ici ce soir pour ne rater aucune vente ce week-end.";
            }

            return res.json({ reply: mockResponse });
        }

        const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307", // use haiku for fast, cheap responses
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages,
        });

        res.json({
            reply: response.content[0].text,
        });
    } catch (error) {
        console.error('Error proxying to Anthropic:', error);
        // Si c'est une erreur 401 d'Anthropic (clé invalide)
        if (error.status === 401) {
             return res.status(401).json({ message: "La clé API Anthropic configurée est invalide." });
        }
        res.status(500).json({ message: "Erreur lors de la communication avec l'IA. Vérifiez votre connexion et votre clé API.", error: error.message });
    }
};
