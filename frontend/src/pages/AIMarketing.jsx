import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import api from '../api/axios';
import { 
    FiShoppingBag, FiMessageCircle, FiSend, FiTrash2, 
    FiArrowUpRight, FiArrowRight, FiCalendar, FiBookOpen, FiImage, FiZap, FiCheckCircle, FiDownload,
    FiArrowLeft, FiClock, FiAlertCircle
} from 'react-icons/fi';

// Loading Skeleton Component
const SuggestionSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl animate-pulse">
        <div className="flex justify-between items-start mb-8">
            <div className="w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
        <div className="w-3/4 h-8 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="w-full h-20 bg-slate-200 dark:bg-slate-700 rounded mb-10"></div>
        <div className="flex justify-between items-center">
            <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        </div>
    </div>
);

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
                const history = JSON.parse(saved);
                return history.filter(m => m.content !== t('historyCleared'));
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        }
        return [
            { role: 'ai', content: t('marketingWelcomeAi') }
        ];
    });
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const posterRef = useRef(null);

    // AI Generated Promotions State
    const [promotions, setPromotions] = useState([]);
    const [isGeneratingPromos, setIsGeneratingPromos] = useState(false);
    const [generationTimeout, setGenerationTimeout] = useState(false);
    const timeoutRef = useRef(null);
    const [selectedPoster, setSelectedPoster] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Selected Custom Event
    const [customEvent, setCustomEvent] = useState('');
    const [activeEventName, setActiveEventName] = useState(t('general'));

    useEffect(() => {
        fetchData();
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
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
            generateAiPromotions(data, t('general'));
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateAiPromotions = async (prods, eventName) => {
        setIsGeneratingPromos(true);
        setGenerationTimeout(false);
        const eventLabel = eventName || t('general');
        setActiveEventName(eventLabel);
        
        // Set timeout for 10 seconds
        timeoutRef.current = setTimeout(() => {
            setGenerationTimeout(true);
        }, 10000);
        
        const prompt = t('aiMarketingPrompt', { 
            event: eventLabel, 
            products: JSON.stringify(prods.slice(0,15).map(p => ({name:p.name, price:p.price})))
        });

        try {
            const response = await api.post('/ai/chat', {
                messages: [{ role: 'user', content: prompt }],
                systemContext: "Marketing Designer. JSON only. No markdown."
            });
            
            // Clear timeout on success
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
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
            // Clear timeout on error too
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setPromotions([
                { title: `${eventLabel} Premium`, description: t('exclusiveOffer', { event: eventLabel }), products: prods.slice(0,2).map(p => p.name), discountPercent: 20, timing: t('limited'), emoji: '⭐', theme: '#2563eb' }
            ]);
        } finally {
            setIsGeneratingPromos(false);
            setGenerationTimeout(false);
        }
    };

    const handleRetry = () => {
        generateAiPromotions(products, activeEventName);
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
            setChatMessages(prev => [...prev, { role: 'ai', content: t('aiErrorQuota') }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleDownloadPoster = async () => {
        if (!posterRef.current) return;
        setIsDownloading(true);
        try {
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
            alert(t('downloadError'));
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePublishNow = () => {
        if (!selectedPoster) return;
        handleSendMessage(null, t('publishPrompt', { title: selectedPoster.title, discount: selectedPoster.discountPercent, timing: selectedPoster.timing }));
        setSelectedPoster(null);
    };

    const handleBackToSuggestions = () => {
        setSelectedPoster(null);
    };

    const clearChatHistory = () => {
        if (window.confirm(t('clearChatConfirm'))) {
            setChatMessages([{ role: 'ai', content: t('marketingWelcomeAi') }]);
            localStorage.removeItem('marketing_chat_history');
        }
    };

    const getProductByName = (name) => products.find(p => p.name === name);
    const formatCurrency = (val) => new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(val || 0);

    if (isLoading) return (
        <div className="flex h-full items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-blue-600 font-bold animate-pulse">{t('loading')}</p>
            </div>
        </div>
    );

    return (
        <div className={`flex h-full gap-6 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
            
            <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-[1.25rem] flex items-center justify-center text-white"><FiZap size={28} /></div>
                        <div>
                            <h2 className="font-black text-2xl uppercase tracking-tighter">{t('aiSuggestions')}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t('marketingStudioDesc')}</p>
                        </div>
                    </div>
                    <div className="flex bg-slate-50 dark:bg-slate-950 p-2 rounded-[2rem] border border-slate-200 dark:border-slate-700 w-96">
                        <input
                            type="text"
                            value={customEvent}
                            onChange={(e) => setCustomEvent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && generateAiPromotions(products, customEvent)}
                            placeholder={t('specialEvent')}
                            className="bg-transparent border-none outline-none pl-4 flex-1 text-sm font-semibold"
                        />
                        <button onClick={() => generateAiPromotions(products, customEvent)} className="px-6 py-3 bg-blue-600 text-white font-black text-[10px] rounded-3xl uppercase tracking-wider">{t('generate')}</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <AnimatePresence>
                        {isGeneratingPromos ? (
                            <>
                                {[1, 2, 3, 4].map((i) => (
                                    <SuggestionSkeleton key={i} />
                                ))}
                            </>
                        ) : (
                            promotions.map((promo, idx) => (
                                <motion.div 
                                    key={idx} 
                                    layout 
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group relative bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 cursor-pointer shadow-xl flex flex-col hover:shadow-2xl transition-all duration-300"
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
                                        <div className="p-4 bg-blue-600 text-white rounded-2xl group-hover:scale-110 transition-transform"><FiArrowRight size={20} /></div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                    
                    {generationTimeout && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className="col-span-full p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-center gap-4"
                        >
                            <FiClock className="text-amber-600" size={24} />
                            <div className="text-center">
                                <p className="text-amber-800 dark:text-amber-200 font-semibold">{t('takingLonger')}</p>
                                <button 
                                    onClick={handleRetry}
                                    className="text-sm text-blue-600 hover:underline mt-1"
                                >
                                    {t('retry')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="w-[450px] flex flex-col bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden">
                <div className="bg-blue-800 p-10 text-white flex justify-between items-start">
                    <div>
                        <h2 className="font-black text-xl uppercase tracking-tighter">{t('marketingCopilot')}</h2>
                        <span className="text-[10px] uppercase opacity-70">{t('aiStrategyMode')}</span>
                    </div>
                    <button onClick={clearChatHistory} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors" title={t('clearHistory')}><FiTrash2 size={18} /></button>
                </div>
                <div className="flex-1 p-8 overflow-y-auto space-y-6 bg-slate-50 dark:bg-slate-900/50">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'}`}>
                                <p className="text-sm font-medium">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isAiTyping && (
                        <div className="flex items-center gap-2 text-blue-600">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            </div>
                            <span className="text-xs">{t('aiWriting')}</span>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>
                <div className="px-8 flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-8">
                    {!isAiTyping && chatMessages.length === 1 && (
                        <div className="grid grid-cols-2 gap-2 pt-6">
                            {[
                                { key: 'suggestionSlogan', icon: <FiZap /> },
                                { key: 'suggestionSocial', icon: <FiMessageCircle /> },
                                { key: 'suggestionStory', icon: <FiImage /> },
                                { key: 'suggestionEmail', icon: <FiBookOpen /> }
                            ].map((suggest, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => handleSendMessage(null, t(suggest.key))}
                                    className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 transition-all text-left"
                                >
                                    <span className="text-blue-500">{suggest.icon}</span>
                                    {t(suggest.key)}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="pt-4">
                        <div className="relative">
                            <input
                                type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                                placeholder={t('marketingWelcomeChat')} className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-[1.5rem] pl-6 pr-14 py-4 text-sm font-semibold"
                            />
                            <button type="submit" className="absolute right-2 top-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"><FiSend size={18} /></button>
                        </div>
                    </form>
                </div>
            </div>

            <AnimatePresence>
                {selectedPoster && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-20 bg-slate-950/90 backdrop-blur-3xl">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-7xl h-[90vh] md:h-[80vh] bg-white dark:bg-slate-950 rounded-[3rem] md:rounded-[5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl">
                            {/* Back Button - Top Left */}
                            <button 
                                onClick={handleBackToSuggestions}
                                className="absolute top-4 left-4 md:top-8 md:left-8 z-50 flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white font-semibold text-sm transition-all hover:scale-105"
                            >
                                <FiArrowLeft size={18} />
                                <span className="hidden sm:inline">{t('back')}</span>
                            </button>
                            
                            <button onClick={() => setSelectedPoster(null)} className="absolute top-4 right-4 md:top-12 md:right-12 z-50 w-10 h-10 md:w-16 md:h-16 bg-white/10 hover:bg-red-500/20 rounded-full flex items-center justify-center text-white transition-colors"><FiTrash2 size={20} /></button>
                            
                            <div ref={posterRef} className="w-full md:w-[55%] p-8 md:p-20 flex flex-col justify-between text-white overflow-y-auto" style={{ backgroundColor: selectedPoster.theme || '#2563eb' }}>
                                <div>
                                    <div className="inline-flex items-center gap-2 md:gap-4 px-4 md:px-8 py-2 md:py-3 bg-white/10 rounded-full mb-6 md:mb-12 border border-white/20">
                                        <span className="text-2xl md:text-3xl">{selectedPoster.emoji}</span>
                                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{selectedPoster.timing}</span>
                                    </div>
                                    <h2 className="text-4xl md:text-8xl font-black uppercase tracking-tighter leading-[0.8] mb-6 md:mb-10 overflow-hidden">
                                        {(selectedPoster.title || '').split(' ').map((w, i) => <span key={i} className="block last:opacity-70">{w}</span>)}
                                    </h2>
                                    <p className="text-lg md:text-3xl font-bold opacity-90 border-l-4 md:border-l-8 border-white pl-4 md:pl-8">{selectedPoster.description}</p>
                                </div>
                                <div className="mt-6 md:mt-0 bg-black/20 p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] flex justify-between items-center">
                                    <div className="flex items-center gap-3 md:gap-5">
                                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl flex items-center justify-center text-slate-900"><FiShoppingBag size={20} /></div>
                                        <span className="font-black text-sm md:text-base">{t('registryCash')}</span>
                                    </div>
                                    <span className="font-mono text-[10px] md:text-xs opacity-50 uppercase">RCS-IA-2026</span>
                                </div>
                            </div>

                            <div className="w-full md:w-[45%] p-6 md:p-16 flex flex-col justify-between bg-white dark:bg-slate-900 overflow-y-auto">
                                <div>
                                    <div className="flex justify-between items-end mb-6 md:mb-10 text-slate-800 dark:text-white">
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase opacity-40 mb-2">{t('featuredProducts')}</h3>
                                            <span className="px-3 md:px-4 py-1 md:py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] md:text-xs font-black">{selectedPoster.products?.length || 0} {t('items')}</span>
                                        </div>
                                        <div className="px-4 md:px-8 py-2 md:py-3 bg-blue-600 text-white font-black text-2xl md:text-4xl rounded-2xl md:rounded-3xl">-{selectedPoster.discountPercent}%</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        {selectedPoster.products?.map((pName, i) => {
                                            const prod = getProductByName(pName);
                                            return (
                                                <div key={i} className="bg-slate-50 dark:bg-slate-800 p-3 md:p-4 rounded-[1.5rem] md:rounded-[2.5rem]">
                                                    <div className="aspect-square bg-white rounded-2xl overflow-hidden mb-2 md:mb-3">
                                                       {prod?.imageUrl && (
                                                           <img 
                                                                crossOrigin="anonymous" 
                                                                src={prod.imageUrl.startsWith('http') 
                                                                    ? `${API_URL}/api/proxy/image?url=${encodeURIComponent(prod.imageUrl)}` 
                                                                    : `${API_URL}${prod.imageUrl}`} 
                                                                className="w-full h-full object-cover" 
                                                                alt={pName}
                                                            />
                                                        )}
                                                    </div>
                                                    <h4 className="font-black text-[9px] md:text-[10px] uppercase truncate">{pName}</h4>
                                                    <span className="text-blue-600 font-black text-xs md:text-sm">{formatCurrency(prod?.price * (1 - selectedPoster.discountPercent/100))}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="mt-6 md:mt-8 pt-4 md:pt-8 border-t border-slate-100 dark:border-slate-800 flex gap-3 md:gap-4">
                                    <button onClick={handleDownloadPoster} disabled={isDownloading} className="flex-1 py-4 md:py-7 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs transition-colors">
                                        {isDownloading ? t('downloading') : t('download')}
                                    </button>
                                    <button onClick={handlePublishNow} className="flex-[2] py-4 md:py-7 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs transition-colors">
                                        {t('publishNow')}
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
