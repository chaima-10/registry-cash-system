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
            generateAiPromotions(data, 'Général');
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateAiPromotions = async (prods, eventName) => {
        setIsGeneratingPromos(true);
        setActiveEventName(eventName || 'Général');
        const eventLabel = eventName || 'Général';
        
        const prompt = `Génère 6 idées de campagnes marketing pour "${eventLabel}". 
        Utilise : ${JSON.stringify(prods.slice(0,15).map(p => ({name:p.name, price:p.price})))}.
        Réponds UNIQUEMENT en JSON: 
        [{"title": "...", "description": "...", "products": ["Nom Produit"], "discountPercent": 20, "timing": "...", "emoji": "...", "theme": "#hex"}]`;

        try {
            const response = await api.post('/ai/chat', {
                messages: [{ role: 'user', content: prompt }],
                systemContext: "Marketing Designer. JSON only. No markdown."
            });
            
            let text = response.data.reply;
            const jsonMatch = text.match(/\[.*\]/s);
            if (jsonMatch) {
                const validData = JSON.parse(jsonMatch[0]).filter(p => p.title && p.description);
                if (validData.length > 0) {
                    setPromotions(validData);
                    return;
                }
            }
            throw new Error("Invalid AI data");
        } catch (error) {
            setPromotions([
                { title: `${eventLabel} Premium`, description: `Offre exclusive ${eventLabel}.`, products: prods.slice(0,2).map(p => p.name), discountPercent: 20, timing: 'Limité', emoji: '⭐', theme: '#2563eb' }
            ]);
        } finally {
            setIsGeneratingPromos(false);
        }
    };

    const handleSendMessage = async (e, forcedMessage = null) => {
        e?.preventDefault();
        const message = forcedMessage || chatInput;
        if (!message.trim()) return;

        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: message }]);
        setIsAiTyping(true);

        try {
            const systemContext = "Expert Copywriter. No explanations. Social media focus.";
            const apiMessages = chatMessages.concat({ role: 'user', content: message })
                .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

            const response = await api.post('/ai/chat', { messages: apiMessages, systemContext });
            setChatMessages(prev => [...prev, { role: 'ai', content: response.data.reply }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'ai', content: "Quota dépassé ou erreur. Réessayez dans quelques minutes." }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleDownloadPoster = async () => {
        if (!posterRef.current) return;
        setIsDownloading(true);
        try {
            // Wait a split second for images to be ready
            const canvas = await html2canvas(posterRef.current, {
                useCORS: true, 
                allowTaint: false,
                scale: 2,
                logging: false,
                backgroundColor: null,
            });
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `marketing-${selectedPoster?.title || 'promo'}.png`;
            link.click();
        } catch (error) {
            console.error("Download failed:", error);
            alert("Erreur: Le serveur d'images bloque le téléchargement.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePublishNow = () => {
        if (!selectedPoster) return;
        handleSendMessage(null, `Rédige un post Facebook/Instagram pour ma campagne "${selectedPoster.title}". Promo: ${selectedPoster.discountPercent}% pour ${selectedPoster.timing}.`);
        setSelectedPoster(null);
    };

    const clearChatHistory = () => {
        if (window.confirm("Effacer ?")) {
            setChatMessages([{ role: 'ai', content: "Discussion effacée." }]);
            localStorage.removeItem('marketing_chat_history');
        }
    };

    const getProductByName = (name) => products.find(p => p.name === name);
    const formatCurrency = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(val || 0);

    if (isLoading) return <div className="p-20 text-center">Loading...</div>;

    return (
        <div className={`flex h-full gap-6 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
            
            <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white"><FiZap size={28} /></div>
                        <h2 className="font-black text-2xl uppercase tracking-tighter">AI SUGGESTIONS</h2>
                    </div>
                    <div className="flex bg-slate-50 dark:bg-slate-950 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-700 w-96">
                        <input
                            type="text"
                            value={customEvent}
                            onChange={(e) => setCustomEvent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && generateAiPromotions(products, customEvent)}
                            placeholder="Événement spécial..."
                            className="bg-transparent border-none outline-none pl-4 flex-1 text-sm font-semibold"
                        />
                        <button onClick={() => generateAiPromotions(products, customEvent)} className="px-6 py-3 bg-blue-600 text-white font-black text-[10px] rounded-3xl">GÉNÉRER</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <AnimatePresence>
                        {promotions.map((promo, idx) => (
                            <motion.div 
                                key={idx} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="group relative bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 cursor-pointer shadow-xl flex flex-col"
                                onClick={() => setSelectedPoster(promo)}
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <span className="px-5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black uppercase rounded-full">{promo.timing}</span>
                                    <div className="text-4xl">{promo.emoji}</div>
                                </div>
                                <h4 className="text-3xl font-black mb-4 tracking-tighter">{promo.title}</h4>
                                <p className="text-slate-500 mb-10">{promo.description}</p>
                                <div className="mt-auto flex justify-between items-center">
                                    <span className="text-2xl font-black text-blue-600">-{promo.discountPercent}%</span>
                                    <div className="p-4 bg-blue-600 text-white rounded-2xl"><FiArrowRight size={20} /></div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <div className="w-[450px] flex flex-col bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden">
                <div className="bg-blue-800 p-10 text-white flex justify-between items-start">
                    <div>
                        <h2 className="font-black text-xl uppercase tracking-tighter">Marketing Copilot</h2>
                        <span className="text-[10px] uppercase opacity-70">AI Strategy Mode</span>
                    </div>
                    <button onClick={clearChatHistory} className="p-3 bg-white/10 rounded-xl"><FiTrash2 size={18} /></button>
                </div>
                <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50 dark:bg-slate-900/50">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'}`}>
                                <p className="text-sm font-medium">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isAiTyping && <div className="p-4 animate-pulse text-xs text-blue-600">L'IA rédige votre texte...</div>}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-8 border-t border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <input
                            type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Une stratégie ?" className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-[2rem] pl-7 pr-16 py-5 text-sm font-semibold"
                        />
                        <button type="submit" className="absolute right-3 top-3 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center"><FiSend size={20} /></button>
                    </div>
                </form>
            </div>

            <AnimatePresence>
                {selectedPoster && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-20 bg-slate-950/90 backdrop-blur-3xl">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative w-full max-w-7xl h-[80vh] bg-white dark:bg-slate-950 rounded-[5rem] overflow-hidden flex shadow-2xl">
                            <button onClick={() => setSelectedPoster(null)} className="absolute top-12 right-12 z-50 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white"><FiTrash2 size={28} /></button>
                            
                            <div ref={posterRef} className="w-[55%] p-20 flex flex-col justify-between text-white" style={{ backgroundColor: selectedPoster.theme || '#2563eb' }}>
                                <div>
                                    <div className="inline-flex items-center gap-4 px-8 py-3 bg-white/10 rounded-full mb-12 border border-white/20">
                                        <span className="text-3xl">{selectedPoster.emoji}</span>
                                        <span className="text-xs font-black uppercase tracking-widest">{selectedPoster.timing}</span>
                                    </div>
                                    <h2 className="text-8xl font-black uppercase tracking-tighter leading-[0.8] mb-10 overflow-hidden">
                                        {(selectedPoster.title || '').split(' ').map((w, i) => <span key={i} className="block last:opacity-70">{w}</span>)}
                                    </h2>
                                    <p className="text-3xl font-bold opacity-90 border-l-8 border-white pl-8">{selectedPoster.description}</p>
                                </div>
                                <div className="bg-black/20 p-8 rounded-[3rem] flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-900"><FiShoppingBag size={28} /></div>
                                        <span className="font-black">REGISTRY CASH</span>
                                    </div>
                                    <span className="font-mono text-xs opacity-50 uppercase">RCS-IA-2026</span>
                                </div>
                            </div>

                            <div className="w-[45%] p-16 flex flex-col justify-between bg-white dark:bg-slate-900">
                                <div>
                                    <div className="flex justify-between items-end mb-10 text-slate-800 dark:text-white">
                                        <div><h3 className="text-[10px] font-black uppercase opacity-40 mb-2">Produits Inclus</h3><span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-black">{selectedPoster.products?.length || 0} Itms</span></div>
                                        <div className="px-8 py-3 bg-blue-600 text-white font-black text-4xl rounded-3xl">-{selectedPoster.discountPercent}%</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedPoster.products?.map((pName, i) => {
                                            const prod = getProductByName(pName);
                                            return (
                                                <div key={i} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-[2.5rem]">
                                                    <div className="aspect-square bg-white rounded-2xl overflow-hidden mb-3">
                                                       {prod?.imageUrl && <img crossOrigin="anonymous" src={`${API_URL}${prod.imageUrl}`} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <h4 className="font-black text-[10px] uppercase truncate">{pName}</h4>
                                                    <span className="text-blue-600 font-black text-sm">{formatCurrency(prod?.price * (1 - selectedPoster.discountPercent/100))}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                    <button onClick={handleDownloadPoster} disabled={isDownloading} className="flex-1 py-7 bg-slate-100 dark:bg-slate-800 rounded-[2rem] font-black uppercase text-xs">
                                        {isDownloading ? '...' : 'Download'}
                                    </button>
                                    <button onClick={handlePublishNow} className="flex-2 py-7 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs">
                                        Publish Now
                                    </button>
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
