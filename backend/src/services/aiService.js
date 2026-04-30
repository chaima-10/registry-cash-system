/**
 * AI Service to handle external API communication
 * Wired directly to Google Gemini API via generateContent
 */
class AIService {
    async generateResponse(messages, systemContext) {
        // Using 1.5 Flash as primary for higher free-tier quotas. 
        const models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
        
        const callGemini = async (model, retryCount = 0) => {
            try {
                // Setup dynamic system prompt defining it as a marketing copilot
                const defaultSystemPrompt = `Tu es un Marketing Copilot expert intégré au dashboard d'Intelligence Artificielle de notre système de caisse.
Ta mission est d'accompagner l'utilisateur en générant des textes de publication, des hooks (IG/TikTok), des hashtags pertinents ou en proposant des stratégies marketing.
Réponds de manière concise, engageante et professionnelle. Tu peux utiliser des emojis adaptés.`;

                // Use the provided system context, or default to the Marketing Copilot prompt
                const systemPrompt = systemContext || defaultSystemPrompt;

                // Normalize messages: Gemini requires alternating 'user' and 'model' roles.
                let normalizedMessages = [];
                let lastAddedRole = null;

                for (const msg of messages) {
                    if (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'ai' || msg.role === 'model') {
                        const geminiRole = msg.role === 'user' ? 'user' : 'model';
                        // Skip if same role as last one (to maintain alternating pattern)
                        if (geminiRole !== lastAddedRole) {
                            normalizedMessages.push({
                                role: geminiRole,
                                parts: [{ text: msg.content || "..." }]
                            });
                            lastAddedRole = geminiRole;
                        } else {
                            // Append to the existing part if same role consecutively
                            if (normalizedMessages.length > 0) {
                                normalizedMessages[normalizedMessages.length - 1].parts[0].text += "\n" + (msg.content || "...");
                            }
                        }
                    }
                }

                // Ensure the last message is from the user (required by Gemini)
                if (normalizedMessages.length > 0 && normalizedMessages[normalizedMessages.length - 1].role !== 'user') {
                    normalizedMessages.pop();
                }

                if (normalizedMessages.length === 0) {
                    return "Comment puis-je vous aider en tant que Marketing Copilot ?";
                }

                const apiKey = process.env.GEMINI_API_KEY || '';
                if (!apiKey || apiKey.length < 10) {
                    throw new Error("Clé API Gemini (GEMINI_API_KEY) manquante ou invalide.");
                }

                // Make real API calls using the Gemini endpoint
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [{ text: systemPrompt }]
                        },
                        contents: normalizedMessages, 
                        generationConfig: {
                            maxOutputTokens: 1500,
                            temperature: 0.7
                        }
                    })
                });

                if (!response.ok) {
                    const errBody = await response.text();
                    
                    // Handle Quota Exhaustion specifically
                    if (response.status === 429) {
                        const currentIndex = models.indexOf(model);
                        if (currentIndex < models.length - 1) {
                            console.warn(`Quota exhausted for ${model}, falling back to ${models[currentIndex + 1]}`);
                            return callGemini(models[currentIndex + 1], 0);
                        }
                        throw new Error("QUOTA_EXCEEDED: Vous avez épuisé votre quota gratuit quotidien. Veuillez réessayer plus tard.");
                    }

                    // Retry logic for 5xx errors
                    if (response.status >= 500 && retryCount < 2) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                        return callGemini(model, retryCount + 1);
                    }
                    throw new Error(`API Gemini Error ${response.status}`);
                }

                const data = await response.json();
                if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
                    return data.candidates[0].content.parts[0].text;
                }

                throw new Error("Format de réponse inattendu.");

            } catch (err) {
                // If it's not a quota error we already handled, try fallback
                if (!err.message.includes("QUOTA_EXCEEDED")) {
                    const currentIndex = models.indexOf(model);
                    if (currentIndex !== -1 && currentIndex < models.length - 1) {
                        return callGemini(models[currentIndex + 1], 0);
                    }
                }
                throw err;
            }
        };

        try {
            return await callGemini(models[0]);
        } catch (err) {
            console.error("AI Service Error:", err.message);
            return `ERROR_AI: ${err.message}`;
        }
    }
}

module.exports = new AIService();
