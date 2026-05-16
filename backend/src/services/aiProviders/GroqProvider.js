const BaseProvider = require('./BaseProvider');

class GroqProvider extends BaseProvider {
    constructor() {
        super('Groq');
        this.apiKey = (process.env.GROQ_API_KEY || process.env.GROK_API_KEY || '').replace(/["']/g, '').trim();
        this.models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
        this.url = 'https://api.groq.com/openai/v1/chat/completions';
    }

    formatMessages(messages, systemPrompt) {
        const normalized = [{ role: 'system', content: systemPrompt }];
        messages.forEach(msg => {
            normalized.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content || '...'
            });
        });
        return normalized;
    }

    async generate(messages, systemPrompt) {
        if (!this.apiKey || this.apiKey.length < 10) {
            throw new Error("AUTH_ERROR: Missing Groq API Key");
        }

        // Try models in order
        for (const model of this.models) {
            try {
                console.log(`[AI] Attempting ${this.name} with model ${model}...`);
                
                const callApi = async (retryAttempt = 0) => {
                    try {
                        const response = await fetch(this.url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${this.apiKey}`
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: this.formatMessages(messages, systemPrompt),
                                temperature: 0.7,
                                max_tokens: 2048
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
                            this.handleError(response, data);
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

                if (data.choices && data.choices[0]?.message?.content) {
                    console.log(`[AI] ${this.name} success using ${model}`);
                    return data.choices[0].message.content;
                }

                throw new Error("FORMAT_ERROR: Invalid response from Groq");

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

module.exports = GroqProvider;
