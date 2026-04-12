/**
 * AI Service to handle external API communication
 * Wired directly to Claude API via /v1/messages
 */
class AIService {
    async generateResponse(messages, systemContext) {
        try {
            // Setup dynamic system prompt defining it as a marketing copilot
            const defaultSystemPrompt = `Tu es un Marketing Copilot expert intégré au dashboard d'Intelligence Artificielle de notre système de caisse.
Ta mission est d'accompagner l'utilisateur en générant des textes de publication, des hooks (IG/TikTok), des hashtags pertinents ou en proposant des stratégies marketing.
Réponds de manière concise, engageante et professionnelle. Tu peux utiliser des emojis adaptés.`;

            // Use the provided system context, or default to the Marketing Copilot prompt
            const systemPrompt = systemContext || defaultSystemPrompt;

            // Normalize messages: Anthropic requires alternating user/assistant roles.
            let normalizedMessages = [];
            let lastAddedRole = null;

            for (const msg of messages) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    // Skip if same role as last one (to maintain alternating pattern)
                    if (msg.role !== lastAddedRole) {
                        normalizedMessages.push({
                            role: msg.role,
                            content: msg.content || "..."
                        });
                        lastAddedRole = msg.role;
                    }
                }
            }

            // Ensure the last message is from the user (required by Anthropic)
            if (normalizedMessages.length > 0 && normalizedMessages[normalizedMessages.length - 1].role !== 'user') {
                normalizedMessages.pop();
            }

            if (normalizedMessages.length === 0) {
                return "Comment puis-je vous aider en tant que Marketing Copilot ?";
            }

            const apiKey = process.env.ANTHROPIC_API_KEY || '';
            if (!apiKey || apiKey === 'votre_cle_api_ici' || apiKey.length < 10) {
                throw new Error("Clé API Anthropic (ANTHROPIC_API_KEY) manquante ou invalide dans le fichier .env.");
            }

            // Make real API calls using the /v1/messages endpoint
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1500,
                    system: systemPrompt,
                    messages: normalizedMessages // Full conversation history for context
                })
            });

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`API Anthropic a renvoyé l'erreur ${response.status}: ${errBody}`);
            }

            const data = await response.json();
            if (data && data.content && data.content.length > 0) {
                return data.content[0].text;
            }

            throw new Error("Format de réponse inattendu de l'API Claude.");

        } catch (err) {
            console.error("AI Service Error:", err.message);
            return `[Erreur API Marketing Copilot] : ${err.message}`;
        }
    }
}

module.exports = new AIService();
