/**
 * AI Service to handle external API communication
 * Updated to use Groq API (fast inference engine)
 */
class AIService {
    async generateResponse(messages, systemContext) {
        // Use Groq models (active)
        const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
        
        const callGroq = async (model, retryCount = 0) => {
            try {
                const defaultSystemPrompt = `Tu es un Marketing Copilot expert intégré au dashboard d'Intelligence Artificielle de notre système de caisse.
Ta mission est d'accompagner l'utilisateur en générant des textes de publication, des hooks (IG/TikTok), des hashtags pertinents ou en proposant des stratégies marketing.
Réponds de manière concise, engageante et professionnelle. Tu peux utiliser des emojis adaptés.`;

                const systemPrompt = systemContext || defaultSystemPrompt;

                // Normalize messages for OpenAI format (system, user, assistant)
                let normalizedMessages = [
                    { role: 'system', content: systemPrompt }
                ];

                for (const msg of messages) {
                    const role = (msg.role === 'user') ? 'user' : 'assistant';
                    const content = msg.content || "...";
                    normalizedMessages.push({ role, content });
                }

                // Check for API Key
                const apiKey = (process.env.GROK_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || '').replace(/["']/g, '').trim();
                
                if (!apiKey || apiKey.length < 10) {
                    throw new Error("AUTH_ERROR: Clé API Groq manquante.");
                }

                const url = 'https://api.groq.com/openai/v1/chat/completions';
                
                const requestBody = {
                    model: model,
                    messages: normalizedMessages, 
                    temperature: 0.7,
                    max_tokens: 2048
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                });

                const data = await response.json();

                if (!response.ok) {
                    console.error(`Groq API Error (${model}) Status ${response.status}:`, JSON.stringify(data));
                    
                    if (response.status === 401 || response.status === 403) {
                        throw new Error("AUTH_ERROR: Accès refusé. Vérifiez votre clé API Groq.");
                    }

                    if (response.status === 429) {
                        const currentIndex = models.indexOf(model);
                        if (currentIndex < models.length - 1) {
                            console.warn(`Quota exceeded for ${model}, trying fallback...`);
                            return callGroq(models[currentIndex + 1]);
                        }
                        throw new Error("QUOTA_EXCEEDED: Quota d'utilisation épuisé.");
                    }

                    throw new Error(`API_ERROR: ${data.error?.message || response.statusText}`);
                }

                if (data.choices && data.choices[0]?.message?.content) {
                    return data.choices[0].message.content;
                }

                throw new Error("FORMAT_ERROR: Réponse inattendue de l'IA.");

            } catch (err) {
                console.error(`Attempt with ${model} failed:`, err.message);
                
                // Don't retry auth errors
                if (err.message.startsWith("AUTH_")) throw err;
                
                // Retry logic for transient errors
                const currentIndex = models.indexOf(model);
                if (currentIndex < models.length - 1 && retryCount < 1) {
                    return callGroq(models[currentIndex + 1], retryCount + 1);
                }
                throw err;
            }
        };

        try {
            return await callGroq(models[0]);
        } catch (err) {
            console.error("Final AI Service Failure:", err.message);
            return `ERROR_AI: ${err.message}`;
        }
    }
}

module.exports = new AIService();
