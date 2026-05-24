/**
 * Base Class for AI Providers
 */
class BaseProvider {
    constructor(name) {
        this.name = name;
    }

    /**
     * Normalize messages to a format the provider understands
     * @param {Array} messages 
     * @param {String} systemPrompt 
     */
    formatMessages(messages, systemPrompt) {
        throw new Error("Method 'formatMessages' must be implemented.");
    }

    /**
     * Generate completion
     * @param {Array} messages 
     * @param {String} systemPrompt 
     */
    async generate(messages, systemPrompt) {
        throw new Error("Method 'generate' must be implemented.");
    }

    /**
     * Handle common API errors
     * @param {Response} response 
     * @param {Object} data 
     */
    handleError(response, data) {
        const status = response.status;
        if (status === 429) throw new Error("QUOTA_EXCEEDED");
        if (status === 401 || status === 403) throw new Error("AUTH_ERROR");
        throw new Error(`API_ERROR: ${data?.error?.message || response.statusText}`);
    }
}

module.exports = BaseProvider;
