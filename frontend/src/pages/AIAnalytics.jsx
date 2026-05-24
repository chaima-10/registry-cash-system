import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiSend, FiRefreshCw, FiTrash2, FiZap } from 'react-icons/fi';
import {
    Tooltip, ResponsiveContainer, Area, ComposedChart,
    CartesianGrid, XAxis, YAxis
} from 'recharts';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const AIAnalytics = () => {
    const { t, i18n } = useTranslation();
    const { formatCurrency } = useAuth();

    // ─── Data State ───────────────────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // ─── AI Forecast State ────────────────────────────────────────────────────
    const [aiForecastData, setAiForecastData] = useState(null);
    const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);

    // ─── AI Insights State ────────────────────────────────────────────────────
    const [aiInsights, setAiInsights] = useState(null);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [insightsCacheKey, setInsightsCacheKey] = useState('');

    // ─── AI Chat State ────────────────────────────────────────────────────────
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const chatEndRef = useRef(null);

    // Initialize chat welcome message
    useEffect(() => {
        setChatMessages([
            { role: 'ai', content: t('aiChatWelcome', 'Hello! I am your Analytics AI Assistant. I can help you analyze your sales, inventory, and customer behavior. Ask me anything!') }
        ]);
    }, [t]);

    // ─── Fetch Data ───────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoadingData(true);
                const [prodRes, salesRes] = await Promise.all([
                    api.get('/products').catch(() => ({ data: [] })),
                    api.get('/sales').catch(() => ({ data: [] })),
                ]);
                setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.products || []);
                setSales(Array.isArray(salesRes.data) ? salesRes.data : salesRes.data?.sales || []);

                // Restore cached insights
                const cachedInsights = localStorage.getItem('aiInsights');
                const cachedCacheKey = localStorage.getItem('aiInsightsCacheKey');
                if (cachedInsights && cachedCacheKey) {
                    setAiInsights(JSON.parse(cachedInsights));
                    setInsightsCacheKey(cachedCacheKey);
                }
            } catch (error) {
                console.error('Erreur de chargement des données', error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    // ─── Cache Key (for insights invalidation) ────────────────────────────────
    const newCacheKey = useMemo(() =>
        `${products.length}-${sales.length}-${products[0]?.stockQuantity ?? 0}-${sales[0]?.totalAmount ?? 0}-${i18n.language}`,
        [products, sales, i18n.language]
    );

    // ─── Shared JSON cleaner ──────────────────────────────────────────────────
    const cleanJsonText = (str) =>
        str
            .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
            .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
            .trim();

    // ─── Parse array from AI text ─────────────────────────────────────────────
    const parseAiJsonArray = (replyText) => {
        // Attempt 1: top-level JSON array
        const startIdx = replyText.indexOf('[');
        const endIdx = replyText.lastIndexOf(']');
        if (startIdx !== -1 && endIdx > startIdx) {
            try {
                const parsed = JSON.parse(cleanJsonText(replyText.substring(startIdx, endIdx + 1)));
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (_) { /* fall through */ }
        }
        // Attempt 2: object wrapping an array
        const objStart = replyText.indexOf('{');
        const objEnd = replyText.lastIndexOf('}');
        if (objStart !== -1 && objEnd > objStart) {
            try {
                const fullObj = JSON.parse(cleanJsonText(replyText.substring(objStart, objEnd + 1)));
                const nested = Object.values(fullObj).find(v => Array.isArray(v) && v.length > 0);
                if (nested) return nested;
            } catch (_) { /* fall through */ }
        }
        return null;
    };

    // ─── Generate AI Sales Forecast ───────────────────────────────────────────
    const generateAiForecast = useCallback(async () => {
        setIsGeneratingForecast(true);
        try {
            if (sales.length < 5) throw new Error('Données insuffisantes (min. 5 transactions).');

            const salesData = sales.slice(-40).map(s => ({
                date: s.createdAt,
                amount: parseFloat(s.totalAmount || 0),
                items: s.items?.length || 0
            }));
            const productData = products.slice(0, 15).map(p => ({
                name: p.name, stock: p.stockQuantity, price: p.price
            }));

            const prompt = `Analyze this retail sales data and provide a 6-month sales forecast. Return ONLY a JSON array: [{"month":"M+1","prediction":number,"confidence":"high/medium/low","insight":"brief reason"}].
Sales data: ${JSON.stringify(salesData)}.
Products: ${JSON.stringify(productData)}.
Current month revenue: ${salesData.reduce((s, r) => s + r.amount, 0)}.`;

            const response = await api.post('/ai/chat', {
                messages: [{ role: 'user', content: prompt }],
                systemContext: 'Retail Analytics Expert. Return ONLY a valid JSON array. No markdown, no preamble.'
            });

            const replyText = response.data.reply;
            if (!replyText || replyText.startsWith('ERROR_AI:')) throw new Error(replyText || 'Empty AI response');

            const parsed = parseAiJsonArray(replyText);
            if (parsed) { setAiForecastData(parsed); return; }

            throw new Error('Format de réponse IA non reconnu.');
        } catch (error) {
            console.error('AI Forecast error:', error);
            // Statistical fallback
            const currentRev = sales.slice(-30).reduce((s, r) => s + parseFloat(r.totalAmount || 0), 0);
            setAiForecastData([
                { month: 'M+1', prediction: currentRev * 1.05, confidence: 'medium', insight: 'Croissance linéaire estimée.' },
                { month: 'M+2', prediction: currentRev * 1.10, confidence: 'low',    insight: 'Tendance saisonnière projetée.' }
            ]);
        } finally {
            setIsGeneratingForecast(false);
        }
    }, [sales, products]);

    // ─── Generate AI Insights ─────────────────────────────────────────────────
    const generateAiInsights = useCallback(async () => {
        setIsGeneratingInsights(true);
        try {
            if (products.length === 0) throw new Error('Aucun produit disponible.');

            const inventoryData = products.slice(0, 30).map(p => ({
                name: p.name, stock: p.stockQuantity, price: p.price, purchasePrice: p.purchasePrice
            }));

            const salesByProduct = {};
            sales.slice(-100).forEach(s => {
                s.items?.forEach(item => {
                    const id = item.product?.id || item.productId;
                    if (id) salesByProduct[id] = (salesByProduct[id] || 0) + (item.quantity || 1);
                });
            });

            const prompt = `Analyze this retail inventory and provide 3-5 actionable recommendations. Return ONLY a JSON array: [{"type":"restock/alert/discount/promotion/price_adjust/remove","product":"name","reason":"problem","action":"next step","priority":"high/medium/low"}].
Inventory: ${JSON.stringify(inventoryData)}
Sales velocity: ${JSON.stringify(salesByProduct)}`;

            const response = await api.post('/ai/chat', {
                messages: [{ role: 'user', content: prompt }],
                systemContext: 'Inventory Strategy Expert. Return ONLY a valid JSON array. No text before or after the JSON.'
            });

            const replyText = response.data.reply;
            if (!replyText || replyText.startsWith('ERROR_AI:')) throw new Error(replyText || 'Empty AI response');

            const parsed = parseAiJsonArray(replyText);
            if (parsed) {
                setAiInsights(parsed);
                localStorage.setItem('aiInsights', JSON.stringify(parsed));
                localStorage.setItem('aiInsightsCacheKey', `v1-${products.length}-${sales.length}`);
                return;
            }
            throw new Error('Format de réponse IA Insights non reconnu.');
        } catch (error) {
            console.error('AI Insights error:', error);
            // Rules-based fallback
            const salesByProduct = {};
            sales.slice(-100).forEach(s => {
                s.items?.forEach(item => {
                    const id = item.product?.id || item.productId;
                    if (id) salesByProduct[id] = (salesByProduct[id] || 0) + (item.quantity || 1);
                });
            });
            const fallback = [];

            products.filter(p => p.stockQuantity > 50 && !salesByProduct[p.id]).slice(0, 2).forEach(p => {
                fallback.push({
                    type: 'discount', product: p.name,
                    reason: t('overstockNoSales', { stock: p.stockQuantity }),
                    action: t('applyDiscountToClear', { discount: p.stockQuantity > 100 ? 40 : 25 }),
                    priority: 'high'
                });
            });
            products.filter(p => p.stockQuantity > 20 && salesByProduct[p.id] > 0 && salesByProduct[p.id] < 5).slice(0, 2).forEach(p => {
                fallback.push({
                    type: 'discount', product: p.name,
                    reason: t('slowMovingStock', { sold: salesByProduct[p.id], stock: p.stockQuantity }),
                    action: t('apply15PercentDiscount'),
                    priority: 'medium'
                });
            });
            products.filter(p => p.purchasePrice && parseFloat(p.price) <= parseFloat(p.purchasePrice) * 1.2).slice(0, 1).forEach(p => {
                const margin = ((parseFloat(p.price) - parseFloat(p.purchasePrice)) / parseFloat(p.purchasePrice) * 100).toFixed(0);
                fallback.push({
                    type: 'price_adjust', product: p.name,
                    reason: t('lowMargin', { margin }),
                    action: t('increasePrice15Percent'),
                    priority: 'medium'
                });
            });
            if (fallback.length === 0) {
                const avgStock = products.length > 0 ? Math.round(products.reduce((s, p) => s + p.stockQuantity, 0) / products.length) : 0;
                fallback.push({
                    type: 'info', product: t('globalInventory'),
                    reason: t('inventoryAnalysis', { count: products.length, avgStock }),
                    action: t('analyzeTopSellingProducts'),
                    priority: 'low'
                });
            }

            setAiInsights(fallback);
            localStorage.setItem('aiInsights', JSON.stringify(fallback));
            localStorage.setItem('aiInsightsCacheKey', newCacheKey);
        } finally {
            setIsGeneratingInsights(false);
        }
    }, [sales, products, t, newCacheKey]);

    // ─── Auto-trigger Forecast & Insights ────────────────────────────────────
    useEffect(() => {
        if (sales.length > 0 && products.length > 0) generateAiForecast();
    }, [generateAiForecast]);

    useEffect(() => {
        if (newCacheKey !== insightsCacheKey && sales.length > 0 && products.length > 0) {
            setInsightsCacheKey(newCacheKey);
            generateAiInsights();
        }
    }, [newCacheKey, generateAiInsights, insightsCacheKey]);

    // ─── Forecast Chart Data ──────────────────────────────────────────────────
    const forecastChartData = useMemo(() => {
        if (aiForecastData && aiForecastData.length > 0) {
            const monthlyAvg = sales.length > 0
                ? Math.round(sales.reduce((s, r) => s + parseFloat(r.totalAmount || 0), 0) / Math.max(1, sales.length / 30))
                : 0;
            return aiForecastData.map(f => ({
                name: f.month,
                prediction: f.prediction,
                Historique: monthlyAvg,
                Approvisionnement: Math.round(f.prediction * 0.7),
                confidence: f.confidence,
                insight: f.insight
            }));
        }
        // Statistical fallback chart
        const now = new Date();
        const currentMonthSales = sales.filter(s => new Date(s.createdAt).getMonth() === now.getMonth());
        const monthlyAvg = currentMonthSales.length > 0
            ? currentMonthSales.reduce((s, r) => s + parseFloat(r.totalAmount || 0), 0)
            : (sales.reduce((s, r) => s + parseFloat(r.totalAmount || 0), 0) / Math.max(1, sales.length / 30) || 5000);

        return ['M+1', 'M+2', 'M+3', 'M+4', 'M+5', 'M+6'].map((m, i) => {
            const pred = monthlyAvg * Math.pow(1.05, i + 1);
            return { name: m, prediction: Math.round(pred), Historique: Math.round(monthlyAvg), Approvisionnement: Math.round(pred * 0.7), confidence: 'medium' };
        });
    }, [aiForecastData, sales]);

    // ─── AI Chat Submit ───────────────────────────────────────────────────────
    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMessage = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsAiTyping(true);

        try {
            const contextData = {
                totalSales: sales.length,
                totalRevenue: sales.reduce((s, r) => s + parseFloat(r.totalAmount || 0), 0),
                totalProducts: products.length,
                lowStockCount: products.filter(p => p.stockQuantity <= Number(p.reorderLevel || 5)).length,
                topSellingProduct: products.length > 0 ? products[0].name : 'N/A'
            };
            const systemContext = `You are a Retail Analytics Expert. Answer questions about sales, inventory, and business performance. Use this data: ${JSON.stringify(contextData)}. Be concise and actionable.`;
            const apiMessages = chatMessages
                .slice(-10)
                .concat({ role: 'user', content: userMessage })
                .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

            const response = await api.post('/ai/chat', { messages: apiMessages, systemContext });
            let reply = response.data.reply;

            if (reply.includes('ERROR_AI:')) {
                if (reply.includes('QUOTA_EXCEEDED'))      reply = t('aiErrorQuota', "Quota d'IA épuisé.");
                else if (reply.includes('AUTH_ERROR'))      reply = t('aiErrorAuth', "Erreur d'authentification IA.");
                else                                         reply = t('aiErrorGeneral', 'Erreur technique IA.');
            }
            setChatMessages(prev => [...prev, { role: 'ai', content: reply }]);
        } catch {
            setChatMessages(prev => [...prev, { role: 'ai', content: t('aiErrorGeneral', 'Désolé, une erreur est survenue.') }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const clearChatHistory = () => {
        setChatMessages([
            { role: 'ai', content: t('aiChatWelcome', 'Hello! I am your Analytics AI Assistant. Ask me anything!') }
        ]);
    };

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isAiTyping]);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full gap-4 lg:gap-6 p-1">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-800 dark:text-white uppercase flex items-center gap-3">
                        <FiZap className="text-blue-600 animate-pulse" />
                        {t('aiAnalyticsSuite', 'Suite Décisionnelle IA')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                        {t('aiSuiteSubtitle', 'Prévisions de ventes, recommandations stratégiques et assistant intelligent réunis.')}
                    </p>
                </div>
            </div>

            {loadingData ? (
                <div className="flex h-96 items-center justify-center">
                    <FiRefreshCw className="animate-spin text-4xl text-blue-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">

                    {/* Left Column: Forecast + Insights */}
                    <div className="xl:col-span-7 flex flex-col gap-6">

                        {/* Sales Forecast Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl flex flex-col h-[400px]">
                            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 shrink-0">
                                <div>
                                    <h3 className="text-lg font-black tracking-tighter uppercase text-slate-800 dark:text-white flex items-center gap-2">
                                        <FiTrendingUp className="text-blue-500" />
                                        {t('salesForecasts', 'Prévisions de Ventes Stratégiques')}
                                    </h3>
                                    <p className="text-slate-400 text-xs font-medium">
                                        {t('forecastDesc', 'Anticipation des flux de vente et optimisation des achats.')}
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> {t('supply', 'Appro.')}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <div className="w-2.5 h-[2px] bg-indigo-500" /> {t('forecast', 'Prévision')}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0">
                                {isGeneratingForecast ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-slate-400 font-medium">{t('generatingForecast', 'Génération des prévisions IA...')}</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={forecastChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false} tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                                            />
                                            <YAxis
                                                axisLine={false} tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                                tickFormatter={val => formatCurrency(val)}
                                                width={70}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '10px 14px' }}
                                                formatter={val => [formatCurrency(val), t('forecastedRevenue', 'Revenu Prévu')]}
                                                labelStyle={{ fontWeight: 800, fontSize: 11, marginBottom: 4 }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="prediction"
                                                fill="url(#predictionGradient)"
                                                stroke="#6366f1"
                                                strokeWidth={3}
                                                dot={{ fill: '#6366f1', r: 4, strokeWidth: 1.5, stroke: '#fff' }}
                                                activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                                                name={t('forecastedRevenue', 'Revenu Prévu')}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* AI Insights Card */}
                        <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-slate-900/5 dark:from-indigo-950/30 dark:via-slate-900/30 dark:to-slate-900/50 p-6 rounded-3xl border border-blue-100 dark:border-slate-800 shadow-xl flex flex-col flex-1 min-h-[350px]">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <h3 className="text-lg font-black tracking-tighter uppercase text-slate-800 dark:text-white flex items-center gap-2">
                                    <FiZap className="text-yellow-500" />
                                    {t('aiInsights', 'Recommandations IA')}
                                </h3>
                                <button
                                    onClick={generateAiInsights}
                                    disabled={isGeneratingInsights}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-blue-500/10"
                                >
                                    {isGeneratingInsights
                                        ? <FiRefreshCw className="animate-spin" />
                                        : <><FiRefreshCw /> {t('refresh', 'Actualiser')}</>
                                    }
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 max-h-[320px]">
                                {aiInsights && aiInsights.length > 0 ? (
                                    aiInsights.map((insight, i) => (
                                        <div key={i} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-100/50 dark:border-slate-700/80 shadow-sm flex items-start gap-4 hover:border-indigo-200 dark:hover:border-indigo-950 transition-all">
                                            <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 shadow-sm ${
                                                insight.priority === 'high'   ? 'bg-red-500' :
                                                insight.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <span className="font-black text-sm text-slate-800 dark:text-white truncate uppercase tracking-tight">{insight.product}</span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-600/50">
                                                        {insight.type}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3 leading-relaxed">{insight.reason}</p>
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/50 inline-block">
                                                    {insight.action}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100/50 dark:border-slate-700/80 shadow-sm text-center">
                                        <p className="text-sm font-bold text-slate-400">
                                            {isGeneratingInsights
                                                ? t('aiThinking', "L'IA formule ses recommandations...")
                                                : t('noAlerts', 'Aucune recommandation disponible.')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: AI Chat Assistant */}
                    <div className="xl:col-span-5 flex flex-col h-[774px]">
                        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            {/* Chat Header */}
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <FiZap size={20} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black tracking-tight uppercase text-slate-800 dark:text-white">
                                            {t('integratedAIAssistant', 'Assistant IA Intégré')}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            {t('AIIntro', 'Posez vos questions sur les ventes ou les stocks')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={clearChatHistory}
                                    className="p-2.5 bg-slate-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-slate-800"
                                    title={t('clearHistory', "Effacer l'historique")}
                                >
                                    <FiTrash2 size={16} />
                                </button>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                {chatMessages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                                            msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-none font-semibold text-xs leading-relaxed'
                                                : 'bg-slate-50 dark:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-bl-none font-medium text-xs border border-slate-100 dark:border-slate-800/80 leading-relaxed'
                                        }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </motion.div>
                                ))}
                                {isAiTyping && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                        <div className="bg-slate-50 dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-100 dark:border-slate-800/80">
                                            <div className="flex gap-1.5 py-1">
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input */}
                            <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0 bg-slate-50/50 dark:bg-gray-900/50">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder={t('askAiPlaceholder', 'Posez votre question...')}
                                        className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400"
                                        disabled={isAiTyping}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isAiTyping || !chatInput.trim()}
                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-gray-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 shadow-md shadow-blue-500/10"
                                    >
                                        <FiSend size={14} />
                                        {t('send', 'Envoyer')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default AIAnalytics;
