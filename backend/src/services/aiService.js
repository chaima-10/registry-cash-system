const GroqProvider = require('./aiProviders/GroqProvider');
const GeminiProvider = require('./aiProviders/GeminiProvider');

/**
 * AI Service orchestrator with multi-provider fallback
 */
class AIService {
    constructor() {
        this.providers = [
            new GroqProvider(),
            new GeminiProvider()
        ];
        
        // Reorder providers if default is different
        const defaultProviderName = (process.env.DEFAULT_AI_PROVIDER || 'groq').toLowerCase();
        if (defaultProviderName === 'gemini') {
            this.providers = [this.providers[1], this.providers[0]];
        }
    }

    async generateResponse(messages, systemContext) {
        const defaultSystemPrompt = `Tu es un Marketing Copilot expert intégré au dashboard d'Intelligence Artificielle de notre système de caisse.
Ta mission est d'accompagner l'utilisateur en générant des textes de publication, des hooks (IG/TikTok), des hashtags pertinents ou en proposant des stratégies marketing.
Réponds de manière concise, engageante et professionnelle. Tu peux utiliser des emojis adaptés.`;

        const systemPrompt = systemContext || defaultSystemPrompt;
        const lastErrors = [];

        // Try each provider in order
        for (const provider of this.providers) {
            try {
                // Skip if no API key or invalid (basic check)
                if (!provider.apiKey || provider.apiKey.length < 10 || provider.apiKey.includes('votre_cle')) {
                    console.warn(`[AI] Skipping ${provider.name} provider: Missing or invalid API key.`);
                    continue;
                }

                const reply = await provider.generate(messages, systemPrompt);
                if (reply) return { reply, provider: provider.name };

            } catch (err) {
                const errorMsg = err.message;
                console.error(`[AI] Provider ${provider.name} failed:`, errorMsg);
                lastErrors.push(`${provider.name}: ${errorMsg}`);

                // If this is not the last provider, log the switch
                const currentIndex = this.providers.indexOf(provider);
                if (currentIndex < this.providers.length - 1) {
                    console.warn(`[AI] Switching to Fallback Provider: ${this.providers[currentIndex + 1].name}`);
                }
                
                continue;
            }
        }

        // If we reach here, all providers failed
        const finalError = lastErrors.length > 0 
            ? `All AI providers failed. Last errors: ${lastErrors.join(' | ')}`
            : "No valid AI providers configured (check your API keys in .env).";
            
        console.error("[AI] Critical Failure:", finalError);
        return { reply: `ERROR_AI: ${finalError}`, provider: 'None' };
    }
}

module.exports = new AIService();
