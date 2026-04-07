const Anthropic = require('@anthropic-ai/sdk');

/**
 * AI Service to handle external API communication
 * Provides smart fallback if API key is missing
 */
class AIService {
    constructor() {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        this.isMockMode = !apiKey || apiKey === 'votre_cle_api_ici' || apiKey.length < 10;
        
        if (!this.isMockMode) {
            this.anthropic = new Anthropic({ apiKey });
        }
    }

    async generateResponse(messages, systemContext) {
        if (!this.isMockMode) {
            try {
                const systemPrompt = `Tu es un assistant IA intégré à un système de caisse enregistreuse (Registry Cash System).
Ton rôle est d'analyser les données du magasin et de donner des conseils stratégiques.
Données : ${systemContext || "Non fournies."}
Réponds de manière concise, professionnelle, et en français.`;

                const response = await this.anthropic.messages.create({
                    model: "claude-3-haiku-20240307",
                    max_tokens: 1024,
                    system: systemPrompt,
                    messages: messages,
                });

                return response.content[0].text;
            } catch (err) {
                console.error("AI Service Error:", err.message);
                // Fallback to mock on error
            }
        }

        return this.generateSmartMockResponse(messages, systemContext);
    }

    generateSmartMockResponse(messages, systemContext) {
        const lastMessage = messages[messages.length - 1].content.toLowerCase();
        
        // Context parsing
        const revenueMatch = systemContext?.match(/aujourd'hui: ([\d.]+\$)/);
        const revenue = revenueMatch ? revenueMatch[1] : "0$";
        const alertsMatch = systemContext?.match(/Alertes stock actives: (\d+)/);
        const alertsCount = alertsMatch ? alertsMatch[1] : "0";
        
        // Dynamic Marketing JSON detection
        if (systemContext?.includes('JSON strict') || lastMessage.includes('génère des idées de marketing')) {
            const productsMatch = systemContext?.match(/DONNÉES PRODUITS \(stock, prix, etc\.\): (\[.*\])/);
            let productNames = ["Produit Premium", "Service Client", "Offre Spéciale"];
            
            if (productsMatch) {
                try {
                    const productsList = JSON.parse(productsMatch[1]);
                    if (productsList.length > 0) {
                        productNames = productsList.map(p => p.name);
                    }
                } catch (e) { /* ignore */ }
            }

            const templates = [
                { title: "Vente Flash Éclair", desc: "Boostez vos ventes ce weekend avec une offre limitée sur vos produits phares.", emoji: "⚡", theme: "#ef4444", timing: "Weekend / Période Creuse" },
                { title: "Pack Fidélité Gold", desc: "Récompensez vos clients réguliers avec un bundle exclusif et un design élégant.", emoji: "🏆", theme: "#f59e0b", timing: "Fêtes / Anniversaires" },
                { title: "Offre de Saison", desc: "Préparez la nouvelle saison avec une sélection de produits tendances et une affiche dédiée.", emoji: "🌿", theme: "#10b981", timing: "Changement de Saison" },
                { title: "Liquidation Stock", desc: "Optimisez votre espace en proposant des remises massives sur les stocks dormants.", emoji: "📦", theme: "#6366f1", timing: "Fin de Mois / Inventaire" },
                { title: "Duo Complémentaire", desc: "Associez vos meilleurs produits pour augmenter le panier moyen avec un catalogue attractif.", emoji: "💎", theme: "#ec4899", timing: "Forte Activité" },
                { title: "Welcome Pack", desc: "Attirez de nouveaux clients avec une offre de bienvenue irrésistible et visuelle.", emoji: "🎁", theme: "#3b82f6", timing: "Tout au long de l'année" },
                { title: "Spécial Rentrée", desc: "Maximisez vos ventes lors de la rentrée scolaire avec des packs indispensables.", emoji: "🎒", theme: "#0ea5e9", timing: "Rentrée Scolaire" },
                { title: "Night Sale", desc: "Offres exclusives pour vos clients de fin de journée.", emoji: "🌙", theme: "#1e1b4b", timing: "Période Creuse (Soirée)" }
            ];

            // Shuffling templates and picking 4
            const shuffled = templates.sort(() => 0.5 - Math.random());
            const ideas = shuffled.slice(0, 4).map(t => ({
                title: t.title,
                description: t.desc,
                theme: t.theme,
                emoji: t.emoji,
                timing: t.timing,
                products: [
                    productNames[Math.floor(Math.random() * productNames.length)],
                    productNames[Math.floor(Math.random() * productNames.length)]
                ]
            }));

            return JSON.stringify(ideas);
        }

        if (lastMessage.includes('marketing') || lastMessage.includes('catalogue')) {
            return `🎨 **Suggestions Marketing Stratégiques**\n\n1. **Campagne "Best-Seller"** : Boostez vos 5 meilleurs produits.\n2. **Offre Pack** : -10% sur les bundles.\n3. **Fidélité** : Programme de points.\n\nQuelle idée voulez-vous approfondir ?`;
        } 
        
        if (lastMessage.includes('remise') || lastMessage.includes('promo')) {
            return `💡 **Conseil Promo** : Une remise de **15%** sur les stocks dormants est recommandée. Vos ventes actuelles : ${revenue}.`;
        }

        if (lastMessage.includes('stock') || lastMessage.includes('commander')) {
            return `📦 **Alerte Stock** : Vous avez **${alertsCount} alertes**. Pensez à vérifier vos niveaux de stock avant demain.`;
        }

        return `Assistant IA (Mode Local) : CA de **${revenue}** et **${alertsCount} alertes stock**. Comment puis-je vous aider ?`;
    }
}

module.exports = new AIService();
