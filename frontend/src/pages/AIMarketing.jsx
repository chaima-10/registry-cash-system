import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    // FIX 1: localStorage with expiration (7 days)
    const [chatMessages, setChatMessages] = useState(() => {
        const saved = localStorage.getItem('marketing_chat_history');
        if (saved) {
            try {
                const { data, timestamp } = JSON.parse(saved);
                const isExpired = Date.now() - timestamp > 7 * 24 * 60 * 60 * 1000;
                if (!isExpired && Array.isArray(data)) {
                    return data.filter(m => m.content !== t('historyCleared'));
                }
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
    const [downloadError, setDownloadError] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    
    // Selected Custom Event
    const [customEvent, setCustomEvent] = useState('');
    const [activeEventName, setActiveEventName] = useState(t('general'));

    useEffect(() => {
        fetchData();
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll to bottom and save history
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        // FIX 1: localStorage with expiration (7 days)
        localStorage.setItem('marketing_chat_history', JSON.stringify({ data: chatMessages, timestamp: Date.now() }));
    }, [chatMessages, isAiTyping]);

    const generateAiPromotions = useCallback(async (prods, eventName) => {
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
            
            // FIX: Robust JSON parsing with fallback to regex
            let text = response.data.reply;
            let validData = null;
            try {
                // Try direct JSON parse first
                const cleanedText = text.trim();
                validData = JSON.parse(cleanedText);
            } catch (e) {
                // Fallback to regex extraction
                const jsonMatch = text.match(/\[.*\]/s);
                if (jsonMatch) {
                    try {
                        validData = JSON.parse(jsonMatch[0]);
                    } catch (parseError) {
                        throw new Error("Invalid AI data");
                    }
                } else {
                    throw new Error("Invalid AI data");
                }
            }
            if (validData) {
                const filteredData = validData.filter(p => p.title && p.description);
                if (filteredData.length > 0) {
                    setPromotions(filteredData);
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
    }, [t]);

    const fetchData = useCallback(async () => {
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
    }, [t, generateAiPromotions]);

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
            // FIX: Limit API messages to last 20 to avoid context overflow
            const apiMessages = chatMessages.concat({ role: 'user', content: message })
                .slice(-20)
                .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

            const response = await api.post('/ai/chat', { messages: apiMessages, systemContext });
            let reply = response.data.reply;
            
            // Handle specific AI error codes from backend
            if (reply.includes('ERROR_AI:')) {
                if (reply.includes('QUOTA_EXCEEDED')) {
                    reply = t('aiErrorQuota', 'Quota d\'intelligence artificielle épuisé pour aujourd\'hui. Veuillez réessayer demain.');
                } else if (reply.includes('AUTH_LEAKED') || reply.includes('AUTH_ERROR')) {
                    reply = t('aiErrorAuth', 'Erreur d\'authentification IA : La clé API est invalide ou désactivée. Contactez l\'administrateur.');
                } else if (reply.includes('SAFETY_BLOCK')) {
                    reply = t('aiErrorSafety', 'Désolé, cette requête a été bloquée pour des raisons de sécurité par l\'IA.');
                } else {
                    reply = t('aiErrorGeneral', 'Désolé, j\'ai rencontré une erreur technique. Veuillez réessayer plus tard.');
                }
            }
            
            setChatMessages(prev => [...prev, { role: 'ai', content: reply }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'ai', content: t('aiErrorQuota') }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const handleDownloadPoster = async () => {
        if (!posterRef.current) return;
        setIsDownloading(true);
        setDownloadError(false);
        
        try {
            console.log("Starting pixel-perfect poster capture...");
            
            // 1. ASSET PRE-LOADING
            // Ensure all images in the poster are fully loaded
            const images = posterRef.current.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue anyway to avoid hanging
                });
            });
            
            // Ensure fonts are loaded for clear text
            const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();
            
            await Promise.all([...imagePromises, fontPromise]);
            // Buffer to allow final browser layout/paint
            await new Promise(resolve => setTimeout(resolve, 800));

            // 2. CAPTURE CONFIGURATION
            const canvas = await html2canvas(posterRef.current, {
                useCORS: true,
                allowTaint: false,
                scale: 3, // High resolution for professional output
                logging: false,
                backgroundColor: '#ffffff',
                imageTimeout: 30000,
                // Force a consistent window width for layout calculation
                windowWidth: 1400,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.getElementById('marketing-poster-capture');
                    if (!clonedEl) return;

                    // A. FORCE OPTIMAL EXPORT LAYOUT
                    // We force desktop proportions (row layout) for the poster export
                    clonedEl.style.display = 'flex';
                    clonedEl.style.flexDirection = 'row';
                    clonedEl.style.width = '1400px';
                    clonedEl.style.height = 'auto'; // Auto-fit height to content
                    clonedEl.style.minHeight = '800px';
                    clonedEl.style.position = 'relative';
                    clonedEl.style.overflow = 'visible';

                    // B. ROBUST STYLE BAKING (The layout fix)
                    // We must capture all layout-critical properties because we remove external CSS
                    const camelize = (str) => str.replace(/-(\w)/g, (_, c) => c.toUpperCase());
                    
                    const colorToRgba = (color) => {
                        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return color;
                        try {
                            const cvs = document.createElement('canvas');
                            cvs.width = 1; cvs.height = 1;
                            const ctx = cvs.getContext('2d');
                            ctx.fillStyle = color;
                            ctx.fillRect(0, 0, 1, 1);
                            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
                            return `rgba(${r}, ${g}, ${b}, ${a/255})`;
                        } catch (e) { return color; }
                    };

                    const criticalProps = [
                        'display', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
                        'justify-content', 'align-items', 'gap', 'column-gap', 'row-gap',
                        'position', 'top', 'right', 'bottom', 'left', 'z-index',
                        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
                        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                        'box-sizing', 'overflow', 'visibility', 'opacity',
                        'background-color', 'color', 'border-radius', 
                        'border-width', 'border-style', 'border-color',
                        'font-size', 'font-weight', 'font-family', 'line-height', 
                        'text-align', 'text-transform', 'letter-spacing',
                        'box-shadow', 'object-fit', 'object-position', 'clip-path'
                    ];

                    const bakeStyles = (source, target) => {
                        const computed = window.getComputedStyle(source);
                        
                        criticalProps.forEach(prop => {
                            const value = computed.getPropertyValue(prop);
                            const camelProp = camelize(prop);
                            
                            // Convert colors to safe RGBA
                            if (prop.includes('color')) {
                                target.style[camelProp] = colorToRgba(value);
                            } 
                            // Sanitize shadows to prevent OKLCH crashes
                            else if (prop === 'box-shadow' && value.includes('oklch')) {
                                target.style.boxShadow = '0 15px 40px rgba(0,0,0,0.15)';
                            }
                            else if (value && value !== 'none' && value !== 'normal') {
                                target.style[camelProp] = value;
                            }
                        });

                        // Ensure images are cross-origin ready and fit correctly
                        if (source.tagName === 'IMG') {
                            target.crossOrigin = "anonymous";
                            target.style.objectFit = computed.objectFit || 'contain';
                        }

                        // Recursively bake children
                        for (let i = 0; i < source.children.length; i++) {
                            if (target.children[i]) {
                                bakeStyles(source.children[i], target.children[i]);
                            }
                        }
                    };

                    bakeStyles(posterRef.current, clonedEl);

                    // C. FINAL ISOLATION
                    // Remove all external stylesheets to prevent rendering engine crashes
                    const styles = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
                    styles.forEach(s => s.remove());
                    
                    // Inject a minimal reset for the capture context
                    const reset = clonedDoc.createElement('style');
                    reset.innerHTML = `
                        * { box-sizing: border-box !important; -webkit-print-color-adjust: exact; }
                        img { display: block !important; max-width: 100% !important; height: auto !important; }
                        #marketing-poster-capture { height: auto !important; min-height: 800px !important; }
                    `;
                    clonedDoc.head.appendChild(reset);
                }
            });

            // 3. GENERATE AND DOWNLOAD
            const imgData = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = imgData;
            link.download = `marketing-${selectedPoster?.title?.replace(/\s+/g, '-') || 'promo'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log("Poster exported successfully.");
        } catch (error) {
            console.error("Poster download failed:", error);
            setDownloadError(true);
            setTimeout(() => setDownloadError(false), 5000);
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
        // FIX: Replace window.confirm with modal state
        setShowClearConfirm(true);
    };

    const confirmClearHistory = () => {
        setChatMessages([{ role: 'ai', content: t('marketingWelcomeAi') }]);
        localStorage.removeItem('marketing_chat_history');
        setShowClearConfirm(false);
    };

    const cancelClearHistory = () => {
        setShowClearConfirm(false);
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
        <div className={`flex flex-col xl:flex-row h-full gap-4 lg:gap-6 ${isRtl ? 'xl:flex-row-reverse text-right' : ''}`}>
            
            <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="p-4 md:p-8 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 lg:gap-6">
                    <div className="flex items-center gap-3 lg:gap-4">
                        {/* Back Arrow - Only visible when poster is selected */}
                        <AnimatePresence>
                            {selectedPoster && (
                                <motion.button
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    onClick={handleBackToSuggestions}
                                    className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title={t('back')}
                                    aria-label={t('back')}
                                >
                                    <FiArrowLeft size={24} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-blue-600 rounded-xl lg:rounded-[1.25rem] flex items-center justify-center text-white shrink-0"><FiZap size={24} /></div>
                        <div>
                            <h2 className="font-black text-xl lg:text-2xl uppercase tracking-tighter">{t('aiSuggestions')}</h2>
                            <p className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400">{t('marketingStudioDesc')}</p>
                        </div>
                    </div>
                    <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-full border border-slate-200 dark:border-slate-700 w-full lg:w-96">
                        <input
                            type="text"
                            value={customEvent}
                            onChange={(e) => setCustomEvent(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && generateAiPromotions(products, customEvent)}
                            placeholder={t('specialEvent')}
                            disabled={isGeneratingPromos}
                            className="bg-transparent border-none outline-none pl-4 flex-1 text-xs lg:text-sm font-semibold disabled:opacity-50"
                        />
                        <button 
                            onClick={() => generateAiPromotions(products, customEvent)} 
                            disabled={isGeneratingPromos}
                            className="px-4 lg:px-6 py-2 lg:py-3 bg-blue-600 text-white font-black text-[9px] lg:text-[10px] rounded-full uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingPromos ? (t('generating') || '...') : t('generate')}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-6 lg:gap-10">
                    <AnimatePresence>
                        {isGeneratingPromos ? (
                            <>
                                {[1, 2].map((i) => (
                                    <SuggestionSkeleton key={i} />
                                ))}
                            </>
                        ) : (
                            promotions.map((promo, idx) => (
                                <motion.div 
                                    key={promo.title || idx} 
                                    layout 
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group relative bg-white dark:bg-slate-900 rounded-[1.5rem] md:rounded-[3rem] p-4 md:p-10 border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 cursor-pointer shadow-xl flex flex-col hover:shadow-2xl transition-all duration-300"
                                    onClick={() => setSelectedPoster(promo)}
                                >
                                    <div className="flex justify-between items-start mb-6 lg:mb-8">
                                        <span className="px-4 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[9px] lg:text-[10px] font-black uppercase rounded-full">{promo.timing}</span>
                                        <div className="text-3xl lg:text-4xl">{promo.emoji}</div>
                                    </div>
                                    <h4 className="text-2xl lg:text-3xl font-black mb-3 lg:mb-4 tracking-tighter">{promo.title}</h4>
                                    <p className="text-sm lg:text-base text-slate-500 mb-6 lg:mb-10 line-clamp-3">{promo.description}</p>
                                    <div className="mt-auto flex justify-between items-center">
                                        <span className="text-xl lg:text-2xl font-black text-blue-600">-{promo.discountPercent}%</span>
                                        <div className="p-3 lg:p-4 bg-blue-600 text-white rounded-xl lg:rounded-2xl group-hover:scale-110 transition-transform"><FiArrowRight size={18} /></div>
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

            <div className="w-full xl:w-[450px] min-h-[400px] h-[50vh] xl:h-full flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden shrink-0">
                <div className="bg-blue-800 p-4 md:p-10 text-white flex justify-between items-start shrink-0">
                    <div>
                        <h2 className="font-black text-lg lg:text-xl uppercase tracking-tighter">{t('marketingCopilot')}</h2>
                        <span className="text-[9px] lg:text-[10px] uppercase opacity-70">{t('aiStrategyMode')}</span>
                    </div>
                    <button onClick={clearChatHistory} className="p-2 lg:p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors" title={t('clearHistory')} aria-label={t('clearHistory')}><FiTrash2 size={18} /></button>
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
                            <button type="submit" className="absolute right-2 top-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95" aria-label={t('send')}><FiSend size={18} /></button>
                        </div>
                    </form>
                </div>
            </div>

            <AnimatePresence>
                {selectedPoster && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-20 bg-slate-950/90 backdrop-blur-3xl">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-7xl h-[90vh] md:h-[80vh] bg-white dark:bg-slate-950 rounded-[3rem] md:rounded-[5rem] overflow-hidden flex flex-col shadow-2xl">
                            {/* Control Buttons (Excluded from Poster) */}
                            <div className="absolute top-4 left-4 md:top-8 md:left-8 z-50 flex items-center gap-2">
                                <button 
                                    onClick={handleBackToSuggestions}
                                    className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white font-semibold text-sm transition-all hover:scale-105"
                                    aria-label={t('back')}
                                >
                                    <FiArrowLeft size={18} />
                                    <span className="hidden sm:inline">{t('back')}</span>
                                </button>
                            </div>
                            
                            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50 flex items-center gap-2">
                                <button 
                                    onClick={() => setSelectedPoster(null)} 
                                    className="w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-red-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors" 
                                    aria-label={t('close') || 'Close'}
                                >
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                            
                            <div 
                                id="marketing-poster-capture"
                                ref={posterRef} 
                                className="flex-1 flex flex-col md:flex-row overflow-hidden" 
                                style={{ backgroundColor: '#ffffff', minHeight: '600px' }}
                            >
                                {/* Left Side: Branding & Main Offer */}
                                <div className="w-[60%] p-12 md:p-16 flex flex-col justify-between" style={{ backgroundColor: selectedPoster.theme || '#2563eb', color: '#ffffff', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.03)', clipPath: 'circle(40% at 90% 10%)' }}></div>
                                    
                                    <div style={{ position: 'relative', zIndex: 10 }}>
                                        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full mb-8 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                                            <span className="text-xl">{selectedPoster.emoji}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{selectedPoster.timing}</span>
                                        </div>
                                        <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tight leading-[0.9] mb-8">
                                            {(selectedPoster.title || '').split(' ').map((w, i) => (
                                                <span key={i} className="block first:opacity-100 last:opacity-50">{w}</span>
                                            ))}
                                        </h2>
                                        <div style={{ width: '50px', height: '4px', backgroundColor: '#ffffff', marginBottom: '24px', opacity: 0.5 }}></div>
                                        <p className="text-xl md:text-3xl font-bold opacity-90 max-w-sm leading-tight">{selectedPoster.description}</p>
                                    </div>

                                    <div className="flex items-center gap-4 mt-8" style={{ position: 'relative', zIndex: 10 }}>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#ffffff', color: selectedPoster.theme || '#2563eb' }}>
                                            <FiShoppingBag size={20} />
                                        </div>
                                        <div>
                                            <span className="block font-black text-sm uppercase tracking-tight">Registry Cash</span>
                                            <span className="block text-[9px] opacity-50 font-mono">EST. 2026</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Product Gallery */}
                                <div className="w-[40%] p-8 md:p-12 flex flex-col" style={{ backgroundColor: '#ffffff', color: '#1a1a1a', minHeight: '100%' }}>
                                    <div>
                                        <div className="flex justify-between items-center mb-10">
                                            <div>
                                                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">{t('featuredProducts')}</h3>
                                                <span className="text-xs font-bold" style={{ color: selectedPoster.theme || '#2563eb' }}>{selectedPoster.products?.length || 0} ITEMS</span>
                                            </div>
                                            <div className="px-4 py-2 text-white font-black text-3xl rounded-xl shadow-lg" style={{ backgroundColor: '#e11d48' }}>
                                                -{selectedPoster.discountPercent}%
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-5">
                                            {selectedPoster.products?.map((pName, i) => {
                                                const prod = getProductByName(pName);
                                                return (
                                                    <div key={i} className="flex gap-4 items-center p-3 rounded-2xl" style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#ffffff' }}>
                                                           {prod?.imageUrl ? (
                                                               <img 
                                                                    crossOrigin="anonymous" 
                                                                    src={prod.imageUrl.startsWith('http') 
                                                                        ? `${API_URL}/api/proxy/image?url=${encodeURIComponent(prod.imageUrl)}&t=${new Date().getTime()}` 
                                                                        : `${API_URL}${prod.imageUrl}?t=${new Date().getTime()}`} 
                                                                    className="max-w-[80%] max-h-[80%] object-contain" 
                                                                    alt={pName}
                                                                />
                                                            ) : (
                                                                <FiShoppingBag className="opacity-10" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-black text-[11px] uppercase truncate opacity-80">{pName}</h4>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="font-black text-lg" style={{ color: selectedPoster.theme || '#2563eb' }}>
                                                                    {formatCurrency(prod?.price * (1 - selectedPoster.discountPercent/100))}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center opacity-30">
                                        <span className="text-[9px] font-black uppercase">PROMOTIONAL ASSET</span>
                                        <span className="text-[9px] font-mono">ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions (Outside Poster Capture) */}
                            <div className="p-6 md:p-12 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-3 md:gap-4 relative">
                                <button onClick={handleDownloadPoster} disabled={isDownloading} className="flex-1 py-4 md:py-7 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs transition-colors" aria-label={t('download')}>
                                    {isDownloading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <FiClock className="animate-spin" /> {t('downloading')}
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <FiDownload /> {t('download')}
                                        </span>
                                    )}
                                </button>
                                {downloadError && (
                                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-xl">
                                        {t('downloadError')}
                                    </div>
                                )}
                                <button onClick={handlePublishNow} className="flex-[2] py-4 md:py-7 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                                    <FiSend /> {t('publishNow')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* FIX: Confirmation modal for clearing chat history */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-3xl"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-black mb-4 text-slate-800 dark:text-white">{t('clearChatConfirm')}</h3>
                            <div className="flex gap-4 mt-6">
                                <button
                                    // FIX 2: Missing i18n keys with fallbacks
                                    onClick={cancelClearHistory}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-black uppercase text-xs transition-colors"
                                >
                                    {t('cancel') || 'Cancel'}
                                </button>
                                <button
                                    // FIX 2: Missing i18n keys with fallbacks
                                    onClick={confirmClearHistory}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase text-xs transition-colors"
                                >
                                    {t('confirm') || 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIMarketing;
