import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiTrendingUp, FiBox, FiCalendar, FiAlertCircle, FiPieChart, 
    FiSend, FiMessageCircle, FiRefreshCw, FiActivity, FiArrowUpRight, FiArrowDownRight, FiArrowRight, FiShoppingBag, FiTrash2, FiZap
} from 'react-icons/fi';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useAuth } from '../context/AuthContext';

const AIAnalytics = () => {
    const { t } = useTranslation();
    const { formatCurrency } = useAuth();
    const [activeTab, setActiveTab] = useState('products');
    
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [promoSuccess, setPromoSuccess] = useState({});
    const [orderSuccess, setOrderSuccess] = useState({});
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const [isGeneratingForecast, setIsGeneratingForecast] = useState(false);
    const [aiForecastData, setAiForecastData] = useState(null);
    const [aiInsights, setAiInsights] = useState(null);
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [insightsCacheKey, setInsightsCacheKey] = useState('');
    
    // AI Chat State
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const chatEndRef = useRef(null);

    // Initialize chat welcome message when translations are available
    useEffect(() => {
        setChatMessages([
            { role: 'ai', content: t('aiChatWelcome', 'Hello! I am your Analytics AI Assistant. I can help you analyze your sales, inventory, and customer behavior. Ask me anything!') }
        ]);
    }, [t]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoadingData(true);
                const [prodRes, salesRes, usersRes, catRes] = await Promise.all([
                    api.get('/products').catch(e => ({ data: [] })),
                    api.get('/sales').catch(e => ({ data: [] })),
                    api.get('/users').catch(e => ({ data: [] })),
                    api.get('/categories').catch(e => ({ data: [] }))
                ]);
                setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.products || []);
                setSales(Array.isArray(salesRes.data) ? salesRes.data : salesRes.data?.sales || []);
                setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.users || []);
                setCategories(Array.isArray(catRes.data) ? catRes.data : catRes.data?.categories || []);

                // Load cached insights
                const cachedInsights = localStorage.getItem('aiInsights');
                const cachedCacheKey = localStorage.getItem('aiInsightsCacheKey');
                if (cachedInsights && cachedCacheKey) {
                    setAiInsights(JSON.parse(cachedInsights));
                    setInsightsCacheKey(cachedCacheKey);
                }
            } catch (error) {
                console.error("Erreur de chargement des données", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchDashboardData();
    }, []);
    // Generate cache key based on current data state and language
    const newCacheKey = useMemo(() => 
        `${products.length}-${sales.length}-${products[0]?.stockQuantity ?? 0}-${sales[0]?.totalAmount ?? 0}-${i18n.language}`,
        [products, sales, i18n.language]
    );

    const isToday = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };
    const isYesterday = (dateStr) => {
        const d = new Date(dateStr);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
    };

    const getDailySummary = useMemo(() => {
        let todayRevenue = 0;
        let yesterdayRevenue = 0;
        let todayCount = 0;

        sales.forEach(s => {
            if (isToday(s.createdAt)) {
                todayRevenue += parseFloat(s.totalAmount || 0);
                todayCount++;
            } else if (isYesterday(s.createdAt)) {
                yesterdayRevenue += parseFloat(s.totalAmount || 0);
            }
        });

        const diff = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
        
        return {
            todayRevenue,
            yesterdayRevenue,
            diff: diff.toFixed(1),
            isPositive: diff >= 0,
            todayCount
        };
    }, [sales]);

    const slowProductsWithPromos = useMemo(() => {
        const salesMap = {};
        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
                });
            }
        });

        const slow = products
            .filter(p => !salesMap[p.id] || salesMap[p.id] < 5) // Very low sales
            .filter(p => p.stockQuantity > 20) // High stock
            .filter(p => !p.remise || parseFloat(p.remise) === 0) // No active discount yet
            .sort((a, b) => b.stockQuantity - a.stockQuantity)
            .slice(0, 5);

        return slow.map(p => ({
            ...p,
            suggestedDiscount: p.stockQuantity > 50 ? '-30%' : '-15%',
            salesCount: salesMap[p.id] || 0,
            actionReason: t('actionReasonSlow', { stock: p.stockQuantity, sales: salesMap[p.id] || 0 })
        }));
    }, [products, sales, t]);

    const behaviorData = useMemo(() => {
        const hourCounts = Array(24).fill(0);
        let totalRevenue = 0;

        sales.forEach(s => {
            const h = new Date(s.createdAt).getHours();
            if (!isNaN(h)) hourCounts[h]++;
            totalRevenue += parseFloat(s.totalAmount || 0);
        });

        // Calculate peak hour
        let peakH = 16; // default fallback
        let maxC = 0;
        hourCounts.forEach((count, h) => {
            if (count > maxC) {
                maxC = count;
                peakH = h;
            }
        });

        const heatmapData = hourCounts.map((count, h) => ({ heure: `${h}h`, Transactions: count })).filter((d, i) => i > 7 && i < 22);
        const panierMoyen = sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : 0;
        
        const todaySalesCount = sales.filter(s => isToday(s.createdAt)).length;
        const flow = todaySalesCount > 10 ? 'High' : todaySalesCount > 3 ? 'Moderate' : 'Stable';

        return { heatmapData, panierMoyen, totalClients: sales.length, peakHour: `${peakH}:00`, flow };
    }, [sales]);

    const getAnomalies = useMemo(() => {
        const anomaliesList = [];
        const salesMap = {};
        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
                });
            }
        });

        // Dead stock anomaly
        products.forEach(p => {
            if (p.stockQuantity > 100 && (!salesMap[p.id] || salesMap[p.id] === 0)) {
                anomaliesList.push({ type: t('stockMort', 'Stock Mort'), product: p, desc: t('stockMortDesc', 'Stock bloqué > 100 unités avec 0 vente récente.') });
            }
        });

        // Pricing / margin anomaly (if price is somehow lower than purchase default assumption)
        products.forEach(p => {
            const achat = p.purchasePrice ? parseFloat(p.purchasePrice) : 0;
            const vente = parseFloat(p.price);
            if (achat > 0 && vente <= achat) {
                anomaliesList.push({ type: t('margeNegative', 'Marge Négative'), product: p, desc: t('margeNegativeDesc', "Le prix de vente est inférieur ou égal au prix d'achat.") });
            }
        });

        return anomaliesList.slice(0, 6);
    }, [products, sales, t]);

    const smartAlerts = useMemo(() => {
        const salesMap = {};
        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
                });
            }
        });

        
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        const alerts = [];
        products.forEach(p => {
            const totalSold = salesMap[p.id] || 0;
            const dailyVelocity = totalSold / daysInMonth; 
            const daysRemaining = dailyVelocity > 0 ? p.stockQuantity / dailyVelocity : 999;
            
            if (p.stockQuantity <= 10) {
                alerts.push({ p, days: daysRemaining.toFixed(1), urgency: 'high', reason: t('stockCriticalAbs', "Stock critique absolu (<10)") });
            } else if (dailyVelocity > 1 && daysRemaining < 7) {
                alerts.push({ p, days: daysRemaining.toFixed(1), urgency: 'medium', reason: t('sellingFastAlert', { days: daysRemaining.toFixed(0) }) });
            }
        });
        return alerts.sort((a,b) => a.days - b.days).slice(0, 8);
    }, [products, sales]);

    const getAIPerformanceMetrics = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        let thisMonthRev = 0;
        let lastMonthRev = 0;
        
        sales.forEach(s => {
            const d = new Date(s.createdAt);
            if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
                thisMonthRev += parseFloat(s.totalAmount || 0);
            } else if (d.getFullYear() === (thisMonth === 0 ? thisYear - 1 : thisYear) && d.getMonth() === (thisMonth === 0 ? 11 : thisMonth - 1)) {
                lastMonthRev += parseFloat(s.totalAmount || 0);
            }
        });
        
        const growth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 12.5;
        const lowStockCount = products.filter(p => p.stockQuantity <= 10).length;
        
        const supplyUrgency = products.length > 0 ? (lowStockCount / products.length) * 100 : 0;
        const trend = growth > 2 ? t('uptrend', 'HAUSSE') : growth < -2 ? t('downtrend', 'BAISSE') : t('stable', 'STABLE');
        
        return {
            growth: growth.toFixed(1),
            supplyUrgency: Math.max(15, Math.min(95, (supplyUrgency * 10) + 15)).toFixed(0), // Scale for visual impact
            trend
        };
    }, [sales, products, t]);

    const generateAiForecast = useCallback(async () => {
        setIsGeneratingForecast(true);
        try {
            const salesData = sales.slice(-50).map(s => ({
                date: s.createdAt,
                amount: parseFloat(s.totalAmount || 0),
                items: s.items?.length || 0
            }));
            
            const productData = products.slice(0, 20).map(p => ({
                name: p.name,
                stock: p.stockQuantity,
                price: p.price,
                category: p.categoryId
            }));

            const prompt = `Analyze this retail sales data and provide 6-month sales forecast. Return ONLY JSON format: [{"month": "M+1", "prediction": number, "confidence": "high/medium/low", "insight": "brief reason"}]. Sales data: ${JSON.stringify(salesData)}. Products: ${JSON.stringify(productData)}. Current month revenue: ${salesData.reduce((sum, s) => sum + s.amount, 0)}.`;

            const response = await api.post('/ai/chat', {
                messages: [{ role: 'user', content: prompt }],
                systemContext: 'Retail Analytics Expert. JSON only. No markdown. Provide realistic forecasts based on historical data.'
            });

            const text = response.data.reply;
            const jsonMatch = text.match(/\[.*\]/s);
            if (jsonMatch) {
                const forecastData = JSON.parse(jsonMatch[0]);
                setAiForecastData(forecastData);
            } else {
                throw new Error('Invalid AI response');
            }
        } catch (error) {
            console.error('AI Forecast error:', error);
            // Fallback to simple calculation
            setAiForecastData(null);
        } finally {
            setIsGeneratingForecast(false);
        }
    }, [sales, products]);

    // Generate AI inventory insights
    const generateAiInsights = useCallback(async () => {
        setIsGeneratingInsights(true);
        try {
            const inventoryData = products.map(p => ({
                name: p.name,
                stock: p.stockQuantity,
                price: p.price,
                purchasePrice: p.purchasePrice,
                category: p.categoryId
            }));

            const salesByProduct = {};
            sales.forEach(s => {
                s.items?.forEach(item => {
                    const productId = item.product?.id;
                    if (productId) {
                        salesByProduct[productId] = (salesByProduct[productId] || 0) + (item.quantity || 1);
                    }
                });
            });

            const prompt = `You are a retail inventory expert. Analyze this data and provide 3-5 specific, actionable recommendations. For each recommendation, identify:
1. Which specific product needs attention
2. The exact problem (e.g., "selling too fast", "not selling at all", "low margin", "overstocked")
3. The specific next step to take (e.g., "Order 50 units immediately", "Apply 20% discount", "Remove from catalog", "Increase price by 10%")
4. Priority level based on business impact

Return ONLY JSON format: [{"type": "restock/alert/discount/promotion/price_adjust/remove", "product": "exact product name", "reason": "specific problem with numbers", "action": "exact next step with numbers", "priority": "high/medium/low"}].

Inventory data: ${JSON.stringify(inventoryData)}
Sales by product: ${JSON.stringify(salesByProduct)}
Total sales: ${sales.length}
Total revenue: ${sales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0)}`;

            const response = await api.post('/ai/chat', {
                messages: [{ role: 'user', content: prompt }],
                systemContext: 'You are a retail inventory management expert. Provide specific, actionable recommendations with exact numbers. JSON only. No markdown. Focus on business impact and immediate actions.'
            });

            const text = response.data.reply;
            const jsonMatch = text.match(/\[.*\]/s);
            if (jsonMatch) {
                const insightsData = JSON.parse(jsonMatch[0]);
                setAiInsights(insightsData);
                localStorage.setItem('aiInsights', JSON.stringify(insightsData));
                localStorage.setItem('aiInsightsCacheKey', newCacheKey);
            } else {
                throw new Error('Invalid AI response');
            }
        } catch (error) {
            console.error('AI Insights error:', error);
            // Enhanced fallback with more specific recommendations
            const fallbackInsights = [];
            const salesMap = {};
            sales.forEach(s => {
                s.items?.forEach(item => {
                    salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
                });
            });
            
            // Critical stock - specific order quantity
            products.filter(p => p.stockQuantity <= 10).forEach(p => {
                const salesVelocity = salesMap[p.id] || 0;
                const orderQty = Math.max(50, salesVelocity * 10);
                fallbackInsights.push({
                    type: 'restock',
                    product: p.name,
                    reason: t('stockCriticalWithVelocity', { stock: p.stockQuantity, velocity: salesVelocity }),
                    action: t('orderImmediately', { qty: orderQty }),
                    priority: 'high'
                });
            });
            
            // Overstocked with no sales - specific discount
            products.filter(p => p.stockQuantity > 50 && (!salesMap[p.id] || salesMap[p.id] === 0)).slice(0, 2).forEach(p => {
                const discount = p.stockQuantity > 100 ? 40 : 25;
                fallbackInsights.push({
                    type: 'discount',
                    product: p.name,
                    reason: t('overstockNoSales', { stock: p.stockQuantity }),
                    action: t('applyDiscountToClear', { discount }),
                    priority: 'high'
                });
            });
            
            // Slow moving stock
            products.filter(p => p.stockQuantity > 20 && salesMap[p.id] > 0 && salesMap[p.id] < 5).slice(0, 2).forEach(p => {
                fallbackInsights.push({
                    type: 'discount',
                    product: p.name,
                    reason: t('slowMovingStock', { sold: salesMap[p.id], stock: p.stockQuantity }),
                    action: t('apply15PercentDiscount'),
                    priority: 'medium'
                });
            });
            
            // Low margin products
            products.filter(p => p.purchasePrice && parseFloat(p.price) <= parseFloat(p.purchasePrice) * 1.2).slice(0, 1).forEach(p => {
                const margin = ((parseFloat(p.price) - parseFloat(p.purchasePrice)) / parseFloat(p.purchasePrice) * 100).toFixed(0);
                fallbackInsights.push({
                    type: 'price_adjust',
                    product: p.name,
                    reason: t('lowMargin', { margin }),
                    action: t('increasePrice15Percent'),
                    priority: 'medium'
                });
            });
            
            // If still no insights, provide general analysis
            if (fallbackInsights.length === 0) {
                const totalStock = products.reduce((sum, p) => sum + p.stockQuantity, 0);
                const avgStock = products.length > 0 ? Math.round(totalStock / products.length) : 0;
                fallbackInsights.push({
                    type: 'info',
                    product: t('globalInventory'),
                    reason: t('inventoryAnalysis', { count: products.length, avgStock }),
                    action: t('analyzeTopSellingProducts'),
                    priority: 'low'
                });
            }
            
            setAiInsights(fallbackInsights);
            localStorage.setItem('aiInsights', JSON.stringify(fallbackInsights));
            localStorage.setItem('aiInsightsCacheKey', newCacheKey);
        } finally {
            setIsGeneratingInsights(false);
        }
    }, [sales, products, t, newCacheKey]);

    useEffect(() => {
        if (sales.length > 0 && products.length > 0) {
            generateAiForecast();
        }
    }, [generateAiForecast]);

    useEffect(() => {
        if (newCacheKey !== insightsCacheKey && sales.length > 0 && products.length > 0) {
            setInsightsCacheKey(newCacheKey);
            generateAiInsights();
        }
    }, [newCacheKey, generateAiInsights, insightsCacheKey]);

    const forecastData = useMemo(() => {
        if (aiForecastData && aiForecastData.length > 0) {
            return aiForecastData.map(f => ({
                name: f.month,
                Prédiction: f.prediction,
                Historique: sales.length > 0 ? Math.round(sales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0) / Math.max(1, sales.length / 30)) : 0,
                Approvisionnement: Math.round(f.prediction * 0.7),
                confidence: f.confidence,
                insight: f.insight
            }));
        }

        const now = new Date();
        const currentMonthSales = sales.filter(s => new Date(s.createdAt).getMonth() === now.getMonth());
        const monthlyAvg = currentMonthSales.length > 0 
            ? currentMonthSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0) 
            : (sales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0) / Math.max(1, sales.length / 30) || 5000);
            
        const months = ['M+1', 'M+2', 'M+3', 'M+4', 'M+5', 'M+6'];
        const growthRate = 0.05; // 5% projected growth

        return months.map((m, i) => {
            const pred = monthlyAvg * Math.pow(1 + growthRate, i + 1);
            return {
                name: m,
                Prédiction: Math.round(pred),
                Historique: Math.round(monthlyAvg),
                Approvisionnement: Math.round(pred * 0.7),
                confidence: 'medium',
                insight: 'Projected based on historical data'
            };
        });
    }, [aiForecastData, sales]);

    const handleApplyPromotion = async (product) => {
        const discountNum = Math.abs(parseInt(product.suggestedDiscount));
        
        try {
            const formData = new FormData();
            formData.append('remise', discountNum);
            formData.append('name', product.name);
            formData.append('price', product.price);
            formData.append('stockQuantity', product.stockQuantity);
    
            if (product.categoryId) formData.append('categoryId', product.categoryId);
            if (product.subcategoryId) formData.append('subcategoryId', product.subcategoryId);
            if (product.tva !== undefined && product.tva !== null) formData.append('tva', product.tva);
            if (product.purchasePrice !== undefined && product.purchasePrice !== null) formData.append('purchasePrice', product.purchasePrice);
            
            await api.put(`/products/${product.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setPromoSuccess(prev => ({ ...prev, [product.id]: true }));
            setTimeout(() => setPromoSuccess(prev => ({ ...prev, [product.id]: false })), 3000);
            // Re-fetch products after success tick is shown
            setTimeout(async () => {
                const res = await api.get('/products');
                setProducts(Array.isArray(res.data) ? res.data : res.data?.products || []);
            }, 3500);
        } catch (err) {
            console.error('Failed to apply promo', err);
            alert("Erreur lors de l'application de la promotion.");
        }
    };

    
    const handleOrderProduct = (product) => {
        setOrderSuccess(prev => ({ ...prev, [product.id]: true }));
        setTimeout(() => setOrderSuccess(prev => ({ ...prev, [product.id]: false })), 4000);
    };


    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMessage = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsAiTyping(true);

        try {
            // Prepare context data for AI
            const contextData = {
                totalSales: sales.length,
                totalRevenue: sales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0),
                totalProducts: products.length,
                lowStockCount: products.filter(p => p.stockQuantity <= 10).length,
                topSellingProduct: products.length > 0 ? products[0].name : 'N/A'
            };

            const systemContext = `You are a Retail Analytics Expert. Answer questions about sales, inventory, and business performance. Use this data: ${JSON.stringify(contextData)}. Be concise and actionable.`;
            const apiMessages = chatMessages
                .slice(-10)
                .concat({ role: 'user', content: userMessage })
                .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

            const response = await api.post('/ai/chat', { messages: apiMessages, systemContext });
            setChatMessages(prev => [...prev, { role: 'ai', content: response.data.reply }]);
        } catch (error) {
            setChatMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const clearChatHistory = () => {
        setChatMessages([
            { role: 'ai', content: t('aiChatWelcome', 'Hello! I am your Analytics AI Assistant. I can help you analyze your sales, inventory, and customer behavior. Ask me anything!') }
        ]);
    };

    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isAiTyping]);

    const renderTabContent = () => {
        if (loadingData) {
            return <div className="flex h-64 items-center justify-center"><FiRefreshCw className="animate-spin text-4xl text-blue-500" /></div>;
        }

        switch (activeTab) {

            case 'products':
                const slowProds = slowProductsWithPromos;
                return (
                    <div className="space-y-6">
                    
                        <div className="bg-gradient-to-br  from-blue-200 to-indigo-200 p-6 rounded-2xl shadow-xl text-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900"><FiZap /> {t('aiInsights', 'Insights IA')}</h3>
                                <button 
                                    onClick={generateAiInsights}
                                    disabled={isGeneratingInsights}
                                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                >
                                    {isGeneratingInsights ? <FiRefreshCw className="animate-spin" /> : t('refresh', 'Actualiser')}
                                </button>
                            </div>
                            <div className="grid gap-3">
                                {aiInsights && aiInsights.length > 0 ? (
                                    aiInsights.map((insight, i) => (
                                        <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                                                    insight.priority === 'high' ? 'bg-red-500' : 
                                                    insight.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                                }`} />
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm mb-1 text-gray-800">{insight.product}</div>
                                                    <div className="text-xs text-gray-600 mb-2">{insight.reason}</div>
                                                    <div className="text-xs font-medium bg-blue-100 text-blue-800 inline-block px-2 py-1 rounded-md">
                                                        {insight.action}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                    {insight.type}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-sm">
                                        <div className="text-sm text-gray-600">
                                            {isGeneratingInsights ? t('aiThinking', 'L\'IA réfléchit...') : t('noAlerts', 'Aucune alerte.')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><FiActivity className="text-orange-500" /> {t('adaptedPromotions', 'Promotions Adaptées')}</h3>
                            <p className="text-sm text-gray-500 mb-6">{t('analyticsPromoDesc', 'Suggestions IA pour écouler les stocks dormants et maximiser la rotation.')}</p>
                            
                            <div className="grid gap-4 md:grid-cols-2">
                                {slowProds.map((p, i) => (
                                    <div key={i} className="p-4 border border-orange-100 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-14 h-14 rounded-xl bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 flex items-center justify-center overflow-hidden shrink-0">
                                                {p.imageUrl ? (
                                                    <img src={`${API_URL}${p.imageUrl}`} alt={p.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-sm font-black text-orange-400">{p.name.substring(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold dark:text-white truncate">{p.name}</div>
                                                <div className="text-xs text-gray-500">{t('stockCount', { count: p.stockQuantity })}</div>
                                                <div className="bg-orange-500 text-white font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider inline-block mt-1">{t('remiseAi', 'Remise IA')}: {p.suggestedDiscount}</div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{p.actionReason}</p>
                                        {promoSuccess[p.id] ? (
                                            <div className="w-full py-2 bg-green-100 dark:bg-green-900/30 border border-green-300 text-green-700 dark:text-green-400 rounded-lg text-sm font-bold text-center">
                                                ✅ {t('promotionApplied', 'Promotion appliquée !')}
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleApplyPromotion(p)}
                                                className="w-full py-2 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">
                                                {t('applyPromotion', 'Appliquer la promotion')}
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {slowProds.length === 0 && <p className="text-gray-500 italic">{t('noDormantStock', 'Aucun stock dormant détecté.')}</p>}
                            </div>
                        </div>
                    </div>
                );
            case 'forecasts':
                const aiMetrics = getAIPerformanceMetrics;
                return (
                    <div className="space-y-8">
                        {/* Forecast Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-blue-500 font-black text-[10px] uppercase tracking-widest mb-2">{t('estimatedGrowth', 'Croissance Estimée')}</div>
                                <div className="text-3xl font-black text-slate-800 dark:text-white">{aiMetrics.growth > 0 ? '+' : ''}{aiMetrics.growth}%</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">{t('projectionQ2', 'Projection Q2 2026')}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-indigo-500 font-black text-[10px] uppercase tracking-widest mb-2 font-bold">{t('supplyUrgency', 'Urgence Approvisionnement')}</div>
                                <div className="text-3xl font-black text-indigo-600">{aiMetrics.supplyUrgency}%</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">{t('optimalStockCapacity', 'Capacité de stockage optimale')}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-teal-500 font-black text-[10px] uppercase tracking-widest mb-2 font-bold">{t('marketTrend', 'Tendance Marché')}</div>
                                <div className="text-3xl font-black text-teal-600">{aiMetrics.trend}</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">{t('favorableSeasonality', 'Saisonnalité favorable')}</div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col h-[500px]">
                            <div className="mb-8 flex justify-between items-end">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase leading-none mb-2">{t('salesForecasts', 'Prévisions Stratégiques')}</h3>
                                    <p className="text-slate-400 text-sm font-medium">{t('forecastDesc', 'Anticipation des flux de vente et optimisation des achats.')}</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div> {t('supply', 'Appro.') }
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        <div className="w-3 h-[2px] bg-indigo-500"></div> {t('forecast', 'Prévision') }
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={forecastData}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.4}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                                        />
                                        <Tooltip 
                                            cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} 
                                        />
                                        <Bar dataKey="Approvisionnement" fill="url(#barGradient)" radius={[10, 10, 0, 0]} barSize={40} />
                                        <Line type="monotone" dataKey="Prédiction" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                );
            case 'behavior':
                const behavior = behaviorData;
                return (
                    <div className="space-y-8">
                        {/* Behavior Insights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-16 -mt-16"></div>
                                 <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">{t('peakActivity', 'Heure de Pointe')}</div>
                                    <div className="text-4xl font-black">{behavior.peakHour}</div>
                                </div>
                                <div className="text-xs font-bold opacity-70 mt-4">{t('basedOnRealTransactions', 'Basé sur vos transactions réelles.')}</div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-7 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                                <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">{t('customerFlow', 'Flux Clients')}</div>
                                <div className="text-3xl font-black text-slate-800 dark:text-white">{t(`flow${behavior.flow}`, behavior.flow)}</div>
                                <div className="text-xs text-green-500 mt-1 font-bold">{t('stableLastHours', 'Stable sur les dernières heures')}</div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-7 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                                <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">{t('averageBasket', 'Panier Moyen')}</div>
                                <div className="text-3xl font-black text-slate-800 dark:text-white">{formatCurrency(behavior.panierMoyen)}</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">{t('avgSpendPerClient', 'Dépense moyenne par client')}</div>
                            </div>
                        </div>

                        {/* Customer Traffic Area */}
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 h-[400px] flex flex-col">
                            <div className="mb-8 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase leading-none mb-1">{t('activityByHour', 'Trafic Intraday')}</h3>
                                    <p className="text-slate-400 text-sm font-medium">{t('heatmapDesc', 'Visualisation des pics de transactions par tranche horaire.')}</p>
                                </div>
                                <div className="text-[10px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 px-4 py-2 rounded-full uppercase tracking-widest">
                                    {t('directUpdate', 'Mise à jour directe')}
                                </div>
                            </div>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={behavior.heatmapData}>
                                        <defs>
                                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                        <XAxis 
                                            dataKey="heure" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                                        />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="Transactions" 
                                            stroke="#6366f1" 
                                            fillOpacity={1} 
                                            fill="url(#colorTraffic)" 
                                            strokeWidth={4}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                );
            case 'chat':
                return (
                    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {/* Chat Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                    <FiZap size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tighter"> AI Analytics Assistant</h3>
                                    <p className="text-xs text-gray-500 font-medium">{t('AIIntro','Ask questions about your sales, inventory, and performance')}</p>
                                </div>
                            </div>
                            <button 
                                onClick={clearChatHistory}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-2"
                            >
                                <FiTrash2 size={16} />
                                {t('clearHistory', 'Clear')}
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {chatMessages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                                        msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-br-md' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                                    }`}>
                                        <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {isAiTyping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-5 py-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleChatSubmit} className="p-6 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={t('askAiPlaceholder', 'Ask about your analytics...')}
                                    className="flex-1 px-5 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-gray-200 placeholder-gray-400"
                                    disabled={isAiTyping}
                                />
                                <button
                                    type="submit"
                                    disabled={isAiTyping || !chatInput.trim()}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                                >
                                    <FiSend size={18} />
                                    {t('send', 'Send')}
                                </button>
                            </div>
                        </form>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            
            
            <div className="flex-1 flex flex-col min-w-0">
                
                <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar">
                    {[
                        { id: 'products', label: t('tabProductsPromos', 'Produits & Promos'), icon: FiBox },
                        { id: 'forecasts', label: t('tabForecasts', 'Prévisions'), icon: FiTrendingUp },
                        { id: 'behavior', label: t('tabBehavior', 'Comportement'), icon: FiCalendar },
                        { id: 'chat', label: t('tabChat', 'AI Chat'), icon: FiMessageCircle }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <tab.icon className={activeTab === tab.id ? "text-white" : "text-gray-400"} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderTabContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
};


export default AIAnalytics;
