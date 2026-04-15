import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import api from '../api/axios';
import { 
    FiShoppingBag, FiMessageCircle, FiSend, FiTrash2, 
    FiArrowUpRight, FiArrowRight, FiCalendar, FiBookOpen, FiImage, FiZap, FiCheckCircle, FiDownload
} from 'react-icons/fi';

const AIMarketing = () => {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Marketing Chat State with LocalStorage Persistence
    const [chatMessages, setChatMessages] = useState(() => {
        const saved = localStorage.getItem('marketing_chat_history');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        }
        return [
            { role: 'ai', content: t('marketingWelcomeAi', "Bonjour ! Je suis votre assistant expert en Marketing. Je suis là pour vous aider à créer des slogans percutants et des visuels attrayants.") }
        ];
    });
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const posterRef = useRef(null);

    // AI Generated Promotions State
    const [promotions, setPromotions] = useState([]);
    const [isGeneratingPromos, setIsGeneratingPromos] = useState(false);
    const [selectedPoster, setSelectedPoster] = useState(null);
    const [viewMode, setViewMode] = useState('poster'); // 'poster' or 'catalog'
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Selected Custom Event
    const [customEvent, setCustomEvent] = useState('');
    const [activeEventName, setActiveEventName] = useState('Général');

    useEffect(() => {
        fetchData();
    }, []);

    // Scroll to bottom and save history
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        localStorage.setItem('marketing_chat_history', JSON.stringify(chatMessages));
    }, [chatMessages, isAiTyping]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const prodRes = await api.get('/products');
            const data = prodRes.data || [];
            setProducts(data);
            // Initial dynamic generation
            generateAiPromotions(data, 'Général');
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
        
        // V5: Forced strict JSON and added data validation
        const prompt = `Génère 6 idées de campagnes marketing extrêmement créatives pour l'événement "${eventLabel}". 
        Produits disponibles: ${JSON.stringify(prods.slice(0,25).map(p => ({name:p.name, price:p.price, img: p.imageUrl})))}.
        Règles CRITIQUES : 
        1. RÉPONDS UNIQUEMENT AVEC UN TABLEAU JSON. PAS DE TEXTE D'INTRODUCTION.
        2. Format : [{"title": "Titre", "description": "Description", "products": ["Nom Produit 1", "Nom Produit 2"], "discountPercent": 20, "timing": "...", "emoji": "...", "theme": "#hex", "type": "catalog"}]
        3. Assure-toi que chaque objet a TOUTES les propriétés mentionnées.`;

        try {
            const response = await api.post('/ai/chat', {
                messages: [{ role: 'user', content: prompt }],
                systemContext: "Tu es un expert marketing. Réponds exclusivement en JSON valide (tableau d'objets). Ne fournis aucune explication textuelle."
            });
            
            let text = response.data.reply;
            const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : (text.startsWith('[') ? text : null);

            if (jsonStr) {
                try {
                    const parsedData = JSON.parse(jsonStr);
                    // Filter out incomplete objects to prevent UI crashes
                    const validData = parsedData.filter(p => p.title && p.description && Array.isArray(p.products));
                    if (validData.length > 0) {
                        setPromotions(validData);
                        return; // Successfully set
                    }
                } catch (parseError) {
                    console.error("JSON Parse Error:", parseError);
                }
            }
            throw new Error("No valid data received");
        } catch (error) {
            console.error("AI Generation failed/incomplete, using fallbacks:", error);
            // Robust static fallbacks
            setPromotions([
                { 
                    title: `${eventLabel} Premium`, 
                    description: `Une sélection exclusive pour marquer l'occasion de ${eventLabel}.`, 
                    products: prods.length > 0 ? prods.slice(0,4).map(p => p.name) : ["Produit 1", "Produit 2"], 
                    discountPercent: 15, 
                    timing: 'Saisonnier', 
                    emoji: '🚀', 
                    theme: '#1e293b', 
                    type: 'catalog' 
                },
                { 
                    title: `Offre Flash ${eventLabel}`, 
                    description: `Ne manquez pas ces remises exceptionnelles limitées dans le temps.`, 
                    products: prods.length > 0 ? prods.slice(Math.max(0, prods.length - 4)).map(p => p.name) : ["Produit A", "Produit B"], 
                    discountPercent: 25, 
                    timing: '48 Heures', 
                    emoji: '⚡', 
                    theme: '#2563eb', 
                    type: 'catalog' 
                }
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
            const systemContext = "Tu es un expert en copywriting. Crée des textes ultra accrocheurs. Réponds en " + (isRtl ? "Arabe" : "Français/Anglais") + ". Pas d'explications.";
            const apiMessages = chatMessages.concat({ role: 'user', content: message })
                .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

            const response = await api.post('/ai/chat', { messages: apiMessages, systemContext });
            setChatMessages(prev => [...prev, { role: 'ai', content: response.data.reply }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'ai', content: "Erreur lors de la réponse de l'IA." }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const clearChatHistory = () => {
        if (window.confirm("Effacer l'historique ?")) {
            const initialMsg = [{ role: 'ai', content: t('marketingWelcomeAi', "Bonjour ! Je suis votre assistant expert en Marketing.") }];
            setChatMessages(initialMsg);
            localStorage.setItem('marketing_chat_history', JSON.stringify(initialMsg));
        }
    };

    const handleDownloadPoster = async () => {
        if (!posterRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(posterRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null,
            });
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `poster-${(selectedPoster?.title || 'marketing').replace(/\s+/g, '-').toLowerCase()}.png`;
            link.click();
        } catch (error) {
            console.error("Download failed:", error);
            alert("Erreur lors du téléchargement.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePublishNow = () => {
        if (!selectedPoster) return;
        const msg = `Génère un texte publicitaire pour "${selectedPoster.title || 'ma campagne'}". Timing: ${selectedPoster.timing || 'Maintenant'}, Remise: ${selectedPoster.discountPercent || 0}%`;
        handleSendMessage(null, msg);
        setSelectedPoster(null);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(val || 0);

    const getProductByName = (name) => products.find(p => p.name === name);

    if (isLoading) return <div className="flex h-screen items-center justify-center font-bold text-slate-400">Loading AI Marketing Studio...</div>;

    return (
        <div className={`flex h-full gap-6 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
            
            <div className="flex-1 min-w-0 relative flex flex-col bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-white dark:border-slate-800 overflow-hidden">
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

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative">
                    {isGeneratingPromos && (
                        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md z-30 flex items-center justify-center rounded-[3rem]">
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-16 h-16 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="font-black text-blue-600 uppercase text-xs tracking-[0.4em] animate-pulse">L'IA conçoit vos modèles...</p>
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
                                    key={(promo.title || 'promo') + idx} 
                                    className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-[3rem] p-1.5 border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer shadow-xl hover:shadow-[0_30px_60px_rgba(37,99,235,0.15)] flex flex-col"
                                    onClick={() => setSelectedPoster(promo)}
                                >
                                    <div className="p-10 relative z-10 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-8">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="px-5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                                                    {promo.timing || 'Offre'}
                                                </span>
                                            </div>
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-4xl group-hover:rotate-12 group-hover:scale-110 transition-all shadow-inner">
                                                {promo.emoji || '✨'}
                                            </div>
                                        </div>
                                        
                                        <h4 className="text-3xl font-black text-slate-800 dark:text-white mb-4 leading-[1.1] tracking-tighter">
                                            {promo.title || 'Suggestion IA'}
                                        </h4>
                                        
                                        <p className="text-base text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                                            {promo.description || 'Chargement des détails...'}
                                        </p>

                                        <div className="mt-auto space-y-6">
                                            <div className="flex -space-x-4 overflow-hidden mb-2">
                                                {promo.products && promo.products.slice(0,6).map((pName, i) => {
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
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase opacity-40">{typeof pName === 'string' ? pName.substring(0,2) : '?'}</div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommended Boost</span>
                                                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">-{promo.discountPercent || 0}%</span>
                                                </div>
                                                <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 group-hover:translate-x-1 transition-transform">
                                                    <FiArrowRight size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 left-0 w-full h-[150%] bg-gradient-to-b from-white/20 to-transparent -translate-y-full group-hover:translate-y-0 transition-transform duration-1000 rotate-12 pointer-events-none" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="w-[450px] flex flex-col bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-white dark:border-slate-800 overflow-hidden shrink-0 relative">
                <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-10 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white/20 rounded-[1.25rem] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-xl">
                                    <FiMessageCircle size={28} />
                                </div>
                                <div>
                                    <h2 className="font-black text-xl tracking-tighter uppercase leading-none mb-1">Marketing Copilot</h2>
                                </div>
                            </div>
                            <button onClick={clearChatHistory} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl">
                                <FiTrash2 size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isAiTyping && <div className="p-4 animate-pulse">L'IA réfléchit...</div>}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-8 bg-white dark:bg-slate-900">
                    <div className="relative">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-[2rem] pl-7 pr-16 py-5 text-white"
                        />
                        <button type="submit" className="absolute right-3 top-3 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center">
                            <FiSend size={20} />
                        </button>
                    </div>
                </form>
            </div>
            
            <AnimatePresence>
                {selectedPoster && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 lg:p-20 bg-slate-950/90 backdrop-blur-3xl">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="relative w-full max-w-7xl h-full max-h-[90vh] bg-white dark:bg-slate-950 rounded-[5rem] overflow-hidden border border-white/5 flex flex-col md:flex-row shadow-2xl"
                        >
                            <button onClick={() => setSelectedPoster(null)} className="absolute top-12 right-12 z-50 w-16 h-16 bg-white/10 hover:bg-red-500 rounded-full flex items-center justify-center text-white">
                                <FiTrash2 size={28} />
                            </button>

                            <div ref={posterRef} className="w-full md:w-[55%] relative p-20 flex flex-col justify-between overflow-hidden text-white"
                                 style={{ backgroundColor: selectedPoster.theme || '#2563eb' }}>
                                <div className="relative z-10">
                                    <div className="inline-flex items-center gap-4 px-8 py-3 bg-white/10 rounded-full mb-12 border border-white/20">
                                        <span className="text-3xl">{selectedPoster.emoji || '✨'}</span>
                                        <span className="text-[12px] font-black uppercase tracking-widest">{selectedPoster.timing || 'Maintenant'}</span>
                                    </div>
                                    <h2 className="font-black text-8xl tracking-tighter leading-[0.8] uppercase mb-10">
                                        {((selectedPoster.title || 'OFFRE SPÉCIALE').split(' ')).map((word, i) => (
                                            <span key={i} className="block last:opacity-80">{word}</span>
                                        ))}
                                    </h2>
                                    <p className="text-3xl font-bold max-w-xl opacity-90 leading-tight border-l-8 border-white pl-8">
                                        {selectedPoster.description || 'Une offre incroyable vous attend.'}
                                    </p>
                                </div>
                            </div>

                            <div className="w-full md:w-[45%] bg-white dark:bg-slate-900 p-16 flex flex-col justify-between overflow-y-auto">
                                <div>
                                    <div className="flex justify-between items-end mb-12">
                                        <div>
                                            <h3 className="text-[11px] font-black uppercase text-slate-400 mb-2">Produits Inclus</h3>
                                            <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[9px] font-black">{selectedPoster.products?.length || 0} Items</span>
                                        </div>
                                        <div className="px-8 py-3 bg-blue-600 text-white font-black text-4xl rounded-3xl">-{selectedPoster.discountPercent || 0}%</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {selectedPoster.products?.map((pName, idx) => {
                                            const prod = getProductByName(pName);
                                            return (
                                                <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem]">
                                                    <div className="aspect-square bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center overflow-hidden mb-4">
                                                        {prod?.imageUrl ? <img src={`${API_URL}${prod.imageUrl}`} className="w-full h-full object-cover" /> : <span className="text-4xl">🛍️</span>}
                                                    </div>
                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-[10px] truncate">{pName}</h4>
                                                    <span className="text-blue-600 font-black text-sm">{formatCurrency(prod?.price * (1 - (selectedPoster.discountPercent || 0)/100))}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-8 pt-10 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-8 bg-slate-900 dark:bg-white p-10 rounded-[3rem]">
                                        <div className="text-white dark:text-slate-900">
                                            <div className="text-[10px] font-black uppercase opacity-50">Total Bundle Price</div>
                                            <div className="text-5xl font-black">{formatCurrency(selectedPoster.products?.reduce((acc, p) => acc + (parseFloat(getProductByName(p)?.price) || 0), 0) * (1 - (selectedPoster.discountPercent || 0)/100))}</div>
                                        </div>
                                        <FiArrowRight size={32} className="text-blue-500" />
                                    </div>
                                    <div className="flex gap-6">
                                        <button onClick={handleDownloadPoster} disabled={isDownloading} className="flex-1 py-7 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-[2rem] font-black uppercase text-xs">
                                            {isDownloading ? '...' : 'Download'}
                                        </button>
                                        <button onClick={handlePublishNow} className="flex-2 px-12 py-7 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs">
                                            Publish Now
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
