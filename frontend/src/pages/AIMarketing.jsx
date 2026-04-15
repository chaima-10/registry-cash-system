import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { 
    FiShoppingBag, FiMessageCircle, FiSend, FiTrash2, 
    FiArrowUpRight, FiArrowRight, FiCalendar, FiBookOpen, FiImage, FiZap, FiCheckCircle
} from 'react-icons/fi';

const AIMarketing = () => {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Marketing Chat State
    const [chatMessages, setChatMessages] = useState([
        { role: 'ai', content: t('marketingWelcomeAi', "Bonjour ! Je suis votre assistant expert en Marketing. Je suis là pour vous aider à créer des slogans percutants et des visuels attrayants.") }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // AI Generated Promotions State
    const [promotions, setPromotions] = useState([]);
    const [isGeneratingPromos, setIsGeneratingPromos] = useState(false);
    const [selectedPoster, setSelectedPoster] = useState(null);
    const [viewMode, setViewMode] = useState('poster'); // 'poster' or 'catalog'
    
    // Selected Custom Event
    const [customEvent, setCustomEvent] = useState('');
    const [activeEventName, setActiveEventName] = useState('Général');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isAiTyping]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const prodRes = await api.get('/products');
            setProducts(prodRes.data || []);
            // Initial dynamic generation
            generateAiPromotions(prodRes.data, 'Général');
        } catch (error) {
            console.error("Error fetching data for AI Marketing:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateAiPromotions = async (prods, eventName) => {
        setIsGeneratingPromos(true);
        setActiveEventName(eventName || 'Général');
        const eventLabel = eventName || 'Général';
        
        // V3: Increased model volume and better prompt engineering
        const prompt = `Génère 6 idées de campagnes marketing extrêmement créatives pour l'événement "${eventLabel}". 
        Utilise ces produits disponibles: ${JSON.stringify(prods.slice(0,20).map(p => ({name:p.name, price:p.price, img: p.imageUrl})))}.
        Réponds UNIQUEMENT en JSON: 
        [{
            "title": "Titre", 
            "description": "Description", 
            "products": ["Nom Produit 1", "Nom Produit 2", "Nom Produit 3", "Nom Produit 4"], 
            "discountPercent": 25, 
            "timing": "Période", 
            "emoji": "✨", 
            "theme": "#hexcolor",
            "type": "catalog"
        }]`;

        try {
            const response = await api.post('/ai/chat', {
                messages: [{ role: 'user', content: prompt }],
                systemContext: "Tu es un expert en design marketing de classe mondiale. Réponds UNIQUEMENT avec du JSON valide. Propose des campagnes avec BEAUCOUP de produits (4-6 par campagne)."
            });
            
            const text = response.data.reply;
            const jsonStr = text.match(/\[.*\]/s)?.[0];
            if (jsonStr) {
                setPromotions(JSON.parse(jsonStr));
            } else {
                throw new Error("Invalid JSON from AI");
            }
        } catch (error) {
            console.error("AI Generation failed, using fallbacks:", error);
            // Fallback richer static data
            setPromotions([
                { title: t('megaBackToSchool', 'Grand Pack Rentrée'), description: t('megaBackToSchoolDesc', 'Tout le nécessaire pour une rentrée réussie.'), products: prods.slice(0,6).map(p => p.name), discountPercent: 30, timing: 'Septembre', emoji: '📚', theme: '#4f46e5', type: 'catalog' }
            ]);
        } finally {
            setIsGeneratingPromos(false);
        }
    };

    const handleGenerateCustomEvent = () => {
        if (!customEvent.trim()) return;
        generateAiPromotions(products, customEvent);
    };

    const handleSendMessage = async (e, forcedMessage = null) => {
        e?.preventDefault();
        const message = forcedMessage || chatInput;
        if (!message.trim()) return;

        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: message }]);
        setIsAiTyping(true);

        try {
            const systemContext = "Tu es un expert en copywriting pour les réseaux sociaux. Ta SEULE tâche est de créer des textes ultra accrocheurs (copywriting) pour accompagner des affiches promotionnelles publiées sur FB/Insta. Réponds en " + (isRtl ? "Arabe" : "Français/Anglais") + ". Ne donne aucune explication stratégique financière. Seulement le texte prêt à être publié avec des hashtags et emojis.";
            const apiMessages = chatMessages.concat({ role: 'user', content: message })
                .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

            const response = await api.post('/ai/chat', { messages: apiMessages, systemContext });
            setChatMessages(prev => [...prev, { role: 'ai', content: response.data.reply }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'ai', content: t('errorProcessing', "Erreur AI.") }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(val);

    const getProductByName = (name) => products.find(p => p.name === name);

    if (isLoading) return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Loading AI Marketing Studio...</div>;

    return (
        <div className={`flex h-full gap-6 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
            
            {/* MAIN MARKETING DASHBOARD PANEL - CLEAN LAYOUT */}
            <div className="flex-1 min-w-0 relative flex flex-col bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-white dark:border-slate-800 overflow-hidden">
                
                {/* Event Custom Input Top Header */}
                <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <FiZap size={28} />
                        </div>
                        <div>
                            <h2 className="font-black text-2xl tracking-tighter uppercase leading-none mb-1">AI SUGGESTIONS</h2>
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{activeEventName}</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-50 dark:bg-slate-950 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-700 w-full xl:w-96 shadow-inner">
                        <input
                            type="text"
                            value={customEvent}
                            onChange={(e) => setCustomEvent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustomEvent()}
                            placeholder="Ex: Fête des Mères, Promo Été..."
                            className="bg-transparent border-none outline-none pl-4 pr-2 py-2 flex-1 text-sm font-semibold text-slate-800 dark:text-gray-200"
                        />
                        <button
                            onClick={handleGenerateCustomEvent}
                            disabled={isGeneratingPromos || !customEvent.trim()}
                            className="px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-3xl disabled:opacity-50 transition-transform active:scale-95 shadow-md"
                        >
                            {isGeneratingPromos ? '...' : 'GÉNÉRER'}
                        </button>
                    </div>
                </div>

                {/* Promotions Board */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative">
                    {isGeneratingPromos && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md z-30 flex items-center justify-center rounded-[3rem]">
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-16 h-16 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="font-black text-blue-600 uppercase text-xs tracking-[0.4em] animate-pulse">{t('aiThinking', 'L\'IA conçoit vos modèles...')}</p>
                            </div>
                        </div>
                    )}


                    <div className="grid grid-cols-1 xl:grid-cols-2 3xl:grid-cols-3 gap-10">
                        <AnimatePresence mode="popLayout">
                            {promotions.map((promo, idx) => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                                    key={promo.title + idx} 
                                    className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-[3rem] p-1.5 border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer shadow-xl hover:shadow-[0_30px_60px_rgba(37,99,235,0.15)] flex flex-col"
                                    onClick={() => setSelectedPoster(promo)}
                                >
                                    <div className="p-10 relative z-10 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="px-5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                                                    {promo.timing}
                                                </span>
                                                {promo.type === 'catalog' && (
                                                    <span className="px-5 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mt-2">
                                                        Multiple Products
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-4xl group-hover:rotate-12 group-hover:scale-110 transition-all shadow-inner">
                                                {promo.emoji}
                                            </div>
                                        </div>
                                        
                                        <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-4 leading-[1.1] tracking-tighter">
                                            {promo.title}
                                        </h4>
                                        
                                        <p className="text-base text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                                            {promo.description}
                                        </h4>
                                        
                                        <div className="mt-auto space-y-6">
                                            <div className="flex -space-x-4 overflow-hidden mb-2">
                                                {promo.products.slice(0,6).map((pName, i) => {
                                                    const prod = getProductByName(pName);
                                                    return (
                                                        <motion.div 
                                                            whileHover={{ scale: 1.2, zIndex: 50 }}
                                                            key={i} 
                                                            className="w-14 h-14 rounded-[1.25rem] border-4 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-700 overflow-hidden shadow-lg"
                                                            title={pName}
                                                        >
                                                            {prod?.imageUrl ? (
                                                                <img src={`${API_URL}${prod.imageUrl}`} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase opacity-40">{pName.substring(0,2)}</div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                                {promo.products.length > 6 && (
                                                    <div className="w-14 h-14 rounded-[1.25rem] border-4 border-white dark:border-slate-900 bg-slate-800 flex items-center justify-center text-white text-xs font-black shadow-lg">
                                                        +{promo.products.length - 6}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommended Boost</span>
                                                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">-{promo.discountPercent}%</span>
                                                </div>
                                                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 group-hover:translate-x-1 transition-transform">
                                                    <FiArrowRight size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Glass reflection effect */}
                                    <div className="absolute top-0 left-0 w-full h-[150%] bg-gradient-to-b from-white/20 to-transparent -translate-y-full group-hover:translate-y-0 transition-transform duration-1000 rotate-12 pointer-events-none" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

            </div>

            {/* CHATBOT SIDE PANEL */}
            <div className="w-[450px] flex flex-col bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-white dark:border-slate-800 overflow-hidden shrink-0 relative">
                <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-10 text-white relative overflow-hidden">
                    {/* Decorative blobs */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-2xl opacity-50" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-5 mb-4">
                            <div className="w-14 h-14 bg-white/20 rounded-[1.25rem] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-xl">
                                <FiMessageCircle size={28} />
                            </div>
                            <div>
                                <h2 className="font-black text-xl tracking-tighter uppercase leading-none mb-1">{t('marketingCopilot', 'Marketing Copilot')}</h2>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 opacity-80">AI Strategy Mode</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-blue-100 text-xs font-medium leading-relaxed opacity-70 border-l-2 border-white/20 pl-4">
                            {t('askAiMarketing', 'Demandez des slogans percutants, des stratégies de réseaux sociaux ou créez des catalogues sur mesure.')}
                        </p>
                    </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {chatMessages.map((msg, i) => (
                        <motion.div 
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={i} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-br-none shadow-blue-500/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700'
                            }`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                            </div>
                        </motion.div>
                    ))}
                    {isAiTyping && (
                         <div className="flex justify-start">
                             <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] rounded-bl-none px-6 py-4 flex gap-2 border border-slate-100 dark:border-slate-700 shadow-sm transition-all animate-pulse">
                                 {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <div className="relative group">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={t('chatPlaceholder', 'Tapez votre demande ici...')}
                            className="w-full bg-slate-900 border border-slate-700 rounded-[2rem] pl-7 pr-16 py-5 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all shadow-inner text-sm font-semibold text-white placeholder:text-slate-500"
                        />
                        <button 
                            type="submit" 
                            disabled={!chatInput.trim() || isAiTyping} 
                            className="absolute right-3 top-3 w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center"
                        >
                            <FiSend size={20} />
                        </button>
                    </div>
                    <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
                        {['Texte Publication', 'Hooks IG/TikTok', 'Hashtags Pertinents'].map((p, idx) => (
                            <button 
                                key={idx} 
                                type="button"
                                onClick={() => handleSendMessage(null, p === 'Texte Publication' ? "Génère un texte court et percutant pour ma publication sur les réseaux." : p)}
                                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-blue-50 hover:text-blue-600 transition-all whitespace-nowrap border border-transparent hover:border-blue-100"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </form>
            </div>
            
            {/* POSTER / CATALOG PREVIEW MODAL - FULL SCREEN UPGRADE */}
            <AnimatePresence>
                {selectedPoster && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 lg:p-20 bg-slate-950/90 backdrop-blur-3xl">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 100 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-7xl h-full max-h-[90vh] bg-white dark:bg-slate-950 rounded-[5rem] overflow-hidden shadow-[0_0_200px_rgba(0,0,0,0.8)] border border-white/5 flex flex-col md:flex-row"
                        >
                            <button 
                                onClick={() => setSelectedPoster(null)}
                                className="absolute top-12 right-12 z-50 w-16 h-16 bg-white/10 hover:bg-red-500 text-white rounded-full backdrop-blur-2xl flex items-center justify-center transition-all border border-white/10 shadow-2xl"
                            >
                                <FiTrash2 size={28} />
                            </button>

                            {/* DESIGN AREA - The Flyer/Poster Card */}
                            <div className="w-full md:w-[55%] relative p-20 flex flex-col justify-between overflow-hidden text-white group"
                                 style={{ backgroundColor: selectedPoster.theme || '#2563eb' }}>
                                
                                {/* Background textures */}
                                <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/0 to-black/20" />
                                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,#fff_0,transparent_70%)]" />
                                <div className="absolute h-px w-full top-1/4 bg-white/20 -rotate-3 blur-md" />
                                <div className="absolute h-px w-full top-2/4 bg-white/10 rotate-12 blur-sm" />
                                
                                <div className="relative z-10">
                                    <div className="inline-flex items-center gap-4 px-8 py-3 bg-white/10 backdrop-blur-3xl rounded-full border border-white/20 mb-12 shadow-2xl">
                                        <span className="text-3xl animate-bounce">{selectedPoster.emoji}</span>
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black uppercase tracking-[0.4em] leading-none mb-1">{selectedPoster.timing}</span>
                                            <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest leading-none">Market Context</span>
                                        </div>
                                    </div>
                                    
                                    <h2 className={`font-black tracking-tighter leading-[0.8] uppercase mb-10 ${isRtl ? 'text-9xl' : 'text-9xl'}`} 
                                        style={{ textShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                                        {selectedPoster.title.split(' ').map((word, i) => (
                                            <motion.span 
                                                initial={{ opacity: 0, x: -50 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 + (i * 0.1) }}
                                                key={i} 
                                                className="block last:opacity-80"
                                            >
                                                {word}
                                            </motion.span>
                                        ))}
                                    </h2>
                                    
                                    <div className="flex items-center gap-6 mb-12">
                                        <div className="w-32 h-2 bg-white rounded-full shadow-lg" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-50">Edition 2026</span>
                                    </div>
                                    
                                    <p className="text-3xl font-bold max-w-xl opacity-90 leading-tight tracking-tight border-l-8 border-white pl-8 py-2">
                                        {selectedPoster.description}
                                    </p>
                                </div>

                                {/* FOOTER INFOS */}
                                <div className="relative z-10 flex items-center justify-between mt-12 bg-black/10 backdrop-blur-md p-8 rounded-[3rem] border border-white/10">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-white flex items-center justify-center rounded-[1.5rem] text-slate-900 shadow-[0_10px_30px_rgba(255,255,255,0.4)]">
                                            <FiShoppingBag size={32} />
                                        </div>
                                        <div className="text-left font-black leading-tight uppercase">
                                            <div className="text-xl tracking-tighter mb-0.5">REGISTRY CASH</div>
                                            <div className="text-[11px] text-white/50 tracking-[0.3em]">AI EMPOWERED SYSTEM</div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <span className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Generated Template ID</span>
                                        <span className="font-mono text-sm opacity-80">RCS-IA-MOD-007XB</span>
                                    </div>
                                </div>
                            </div>

                            {/* PRODUCTS LIST - THE CATALOG GRID UPGRADE */}
                            <div className="w-full md:w-[45%] bg-white dark:bg-slate-900 p-16 flex flex-col justify-between overflow-hidden">
                                <div className="overflow-hidden flex flex-col flex-1">
                                    <div className="flex justify-between items-end mb-12">
                                        <div>
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">{t('featuredProducts', 'Produits Inclus')}</h3>
                                            <div className="flex gap-2">
                                                <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">{selectedPoster.products.length} Items Selected</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Bundle Offer</span>
                                            <div className="px-8 py-3 bg-blue-600 text-white font-black text-4xl rounded-3xl shadow-2xl shadow-blue-500/30">-{selectedPoster.discountPercent}%</div>
                                        </div>
                                    </div>

                                    {/* Scrollable Catalog Grid */}
                                    <div className="grid grid-cols-2 gap-6 overflow-y-auto custom-scrollbar pr-4 pb-10">
                                        {selectedPoster.products.map((pName, idx) => {
                                            const prod = getProductByName(pName);
                                            return (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.5 + (idx * 0.05) }}
                                                    key={idx} 
                                                    className="group/item relative bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-slate-100 dark:border-slate-800 hover:border-blue-200"
                                                >
                                                    <div className="relative aspect-square bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm mb-4 group-hover/item:scale-105 transition-transform">
                                                        {prod?.imageUrl ? (
                                                            <img src={`${API_URL}${prod.imageUrl}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-4xl opacity-10">🛍️</span>
                                                        )}
                                                        <div className="absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                            <FiCheckCircle size={14} />
                                                        </div>
                                                    </div>
                                                    <div className="px-2">
                                                        <h4 className="font-black text-slate-800 dark:text-white uppercase text-[10px] mb-1 tracking-tight truncate" title={pName}>{pName}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-blue-600 dark:text-blue-400 font-black text-sm">{formatCurrency(prod?.price * (1 - selectedPoster.discountPercent/100))}</span>
                                                            <span className="text-slate-400 text-[9px] line-through font-bold opacity-60">{formatCurrency(prod?.price || 0)}</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-8 pt-10 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-8 bg-slate-900 dark:bg-white p-10 rounded-[3rem] shadow-2xl group overflow-hidden relative active:scale-95 transition-all cursor-pointer">
                                        <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-0 transition-all duration-500" />
                                        <div className="relative z-10">
                                            <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-50 dark:opacity-40">Total Bundle Price</div>
                                            <div className="text-5xl font-black tracking-tighter text-white dark:text-slate-900">
                                                {formatCurrency(selectedPoster.products.reduce((acc, p) => acc + (parseFloat(getProductByName(p)?.price) || 0), 0) * (1 - selectedPoster.discountPercent/100))}
                                            </div>
                                        </div>
                                        <div className="w-20 h-20 bg-white/10 dark:bg-slate-900/10 rounded-[2rem] flex items-center justify-center relative z-10 group-hover:bg-white/20 transition-all">
                                            <FiArrowRight size={32} className="text-white dark:text-slate-900 group-hover:translate-x-3 transition-transform duration-500" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-6">
                                        <button className="flex-1 py-7 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95 border-2 border-transparent hover:border-slate-300">
                                            {t('downloadKit', 'Télécharger Kit IA')}
                                        </button>
                                        <button className="flex-2 px-12 py-7 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-2xl shadow-blue-500/30">
                                            {t('publishNow', 'Négoce et Publication')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIMarketing;
