const BaseProvider = require('./BaseProvider');

class GeminiProvider extends BaseProvider {
    constructor() {
        super('Gemini');
        this.apiKey = (process.env.GEMINI_API_KEY || '').replace(/["']/g, '').trim();
        this.models = ['gemini-1.5-flash', 'gemini-1.5-pro'];
    }

    formatMessages(messages, systemPrompt) {
        // Gemini uses a different format (contents: [{ role, parts: [{ text }] }])
        // It doesn't have a separate 'system' role in the contents list for the chat endpoint
        // but it can be provided in system_instruction (available in newer API versions)
        // For simplicity and compatibility, we'll prefix the first user message or add a separate part.
        
        const contents = [];
        messages.forEach(msg => {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content || '...' }]
            });
        });
        
        return {
            contents,
            system_instruction: {
                parts: [{ text: systemPrompt }]
            }
        };
    }

    async generate(messages, systemPrompt) {
        if (!this.apiKey || this.apiKey.length < 10 || this.apiKey.includes('votre_cle')) {
            throw new Error("AUTH_ERROR: Missing Gemini API Key");
        }

        for (const model of this.models) {
            try {
                console.log(`[AI] Attempting ${this.name} with model ${model}...`);
                
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
                const formatted = this.formatMessages(messages, systemPrompt);

                const callApi = async (retryAttempt = 0) => {
                    try {
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: formatted.contents,
                                system_instruction: formatted.system_instruction,
                                generationConfig: {
                                    temperature: 0.7,
                                    maxOutputTokens: 2048,
                                }
                            }),
                            signal: AbortSignal.timeout(15000)
                        });

                        const data = await response.json();

                        if (!response.ok) {
                            // Retry on 5xx errors
                            if (response.status >= 500 && retryAttempt < 1) {
                                console.warn(`[AI] ${this.name} ${model} 5xx error, retrying...`);
                                return callApi(retryAttempt + 1);
                            }
                            if (response.status === 429) throw new Error("QUOTA_EXCEEDED");
                            throw new Error(`API_ERROR: ${data.error?.message || response.statusText}`);
                        }
                        return data;
                    } catch (e) {
                        if (retryAttempt < 1 && !e.message.includes("QUOTA")) {
                            return callApi(retryAttempt + 1);
                        }
                        throw e;
                    }
                };

                const data = await callApi();

                if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                    console.log(`[AI] ${this.name} success using ${model}`);
                    return data.candidates[0].content.parts[0].text;
                }

                throw new Error("FORMAT_ERROR: Invalid response from Gemini");

            } catch (err) {
                if (err.message === 'QUOTA_EXCEEDED' && model !== this.models[this.models.length - 1]) {
                    console.warn(`[AI] ${this.name} quota exceeded for ${model}, trying next model...`);
                    continue;
                }
                throw err;
            }
        }
    }
}

module.exports = GeminiProvider;
