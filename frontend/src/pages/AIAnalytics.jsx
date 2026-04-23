import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiTrendingUp, FiBox, FiCalendar, FiAlertCircle, FiPieChart, 
    FiSend, FiMessageCircle, FiRefreshCw, FiActivity, FiArrowUpRight, FiArrowDownRight, FiArrowRight, FiShoppingBag, FiTrash2 
} from 'react-icons/fi';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

// Tabs will be defined inside to support translation

const AIAnalytics = () => {
    const { t } = useTranslation();
    const { formatCurrency } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [topProductsSortBy, setTopProductsSortBy] = useState('revenue');
    
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [promoSuccess, setPromoSuccess] = useState({});
    const [orderSuccess, setOrderSuccess] = useState({});
    const [generatingPoster, setGeneratingPoster] = useState({});
    const [posterGenerated, setPosterGenerated] = useState({});
    const [selectedPoster, setSelectedPoster] = useState(null);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // AI states (Marketing removed)
    // Removed old chat hooks and marketing specific generation logic

    // Initial Data Fetch
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
            } catch (error) {
                console.error("Erreur de chargement des données", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchDashboardData();
    }, []);

    // Derived Date Helpers
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

    // Calculate advanced derived data
    const getDailySummary = () => {
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
    };

    const getTopProducts = () => {
        const map = {};
        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    // Strictly match the getAllProducts filter: must be Active and not deleted
                    if (!item.product || item.product.isDeleted || item.product.status !== 'Active') return;

                    if (!map[item.productId]) {
                        map[item.productId] = { 
                            id: item.productId, 
                            name: item.product.name, 
                            imageUrl: item.product.imageUrl || null, 
                            revenue: 0, 
                            qty: 0 
                        };
                    }
                    map[item.productId].revenue += parseFloat(item.subtotal || 0);
                    map[item.productId].qty += item.quantity;
                });
            }
        });
        // Also enrich from products list if imageUrl not already set from sale items
        const result = Object.values(map);
        result.forEach(p => {
            if (!p.imageUrl) {
                const found = products.find(pr => pr.id === p.id);
                if (found) p.imageUrl = found.imageUrl || null;
            }
        });
        return result
            .sort((a, b) => topProductsSortBy === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty)
            .slice(0, 5);
    };

    const getSlowProductsWithPromos = () => {
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
            actionReason: `Stock élevé (${p.stockQuantity}) et ventes très faibles.`
        }));
    };

    const getBehaviorData = () => {
        const hourCounts = Array(24).fill(0);
        let totalRevenue = 0;

        sales.forEach(s => {
            const h = new Date(s.createdAt).getHours();
            if (!isNaN(h)) hourCounts[h]++;
            totalRevenue += parseFloat(s.totalAmount || 0);
        });

        const heatmapData = hourCounts.map((count, h) => ({ heure: `${h}h`, Transactions: count })).filter((d, i) => i > 7 && i < 22);
        const panierMoyen = sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : 0;

        return { heatmapData, panierMoyen, totalClients: sales.length };
    };

    const getAnomalies = () => {
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
                anomaliesList.push({ type: 'Stock Mort', product: p, desc: 'Stock bloqué > 100 unités avec 0 vente récente.' });
            }
        });

        // Pricing / margin anomaly (if price is somehow lower than purchase default assumption)
        products.forEach(p => {
            const achat = p.purchasePrice ? parseFloat(p.purchasePrice) : 0;
            const vente = parseFloat(p.price);
            if (achat > 0 && vente <= achat) {
                anomaliesList.push({ type: 'Marge Négative', product: p, desc: "Le prix de vente est inférieur ou égal au prix d'achat." });
            }
        });

        return anomaliesList.slice(0, 6);
    };

    const getSmartAlerts = () => {
        const salesMap = {};
        sales.forEach(sale => {
            if (sale.items) {
                sale.items.forEach(item => {
                    salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
                });
            }
        });

        // Calculate real number of days in current month for velocity
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        const alerts = [];
        products.forEach(p => {
            const totalSold = salesMap[p.id] || 0;
            const dailyVelocity = totalSold / daysInMonth; // Actual days in month velocity
            const daysRemaining = dailyVelocity > 0 ? p.stockQuantity / dailyVelocity : 999;
            
            if (p.stockQuantity <= 10) {
                alerts.push({ p, days: daysRemaining.toFixed(1), urgency: 'high', reason: "Stock critique absolu (<10)" });
            } else if (dailyVelocity > 1 && daysRemaining < 7) {
                alerts.push({ p, days: daysRemaining.toFixed(1), urgency: 'medium', reason: `Se vend très vite ! Rupture prévue dans ${daysRemaining.toFixed(0)} jours.` });
            }
        });
        return alerts.sort((a,b) => a.days - b.days).slice(0, 8);
    };

    const getForecastData = () => {
        const monthlyAvg = sales.length > 0 ? sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0) / Math.max(1, sales.length * 0.1) : 5000;
        const months = ['M+1', 'M+2', 'M+3', 'M+4', 'M+5', 'M+6'];
        return months.map((m, i) => {
            const pred = monthlyAvg * (1 + (i * 0.05)) + (Math.random() * 500);
            return {
                name: m,
                Prédiction: pred,
                Historique: monthlyAvg,
                Approvisionnement: pred * 0.6 // Recommend 60% of pred as supply capital
            };
        });
    };

    // Apply promo to a product via API
    const handleApplyPromotion = async (product) => {
        // La remise suggérée est comme '-30%', nous avons besoin d'un nombre positif 0-100
        const discountNum = Math.abs(parseInt(product.suggestedDiscount));
        
        try {
            const formData = new FormData();
            formData.append('remise', discountNum);
            formData.append('name', product.name);
            formData.append('price', product.price);
            formData.append('stockQuantity', product.stockQuantity);
            // Preserve category & subcategory so they are NOT wiped by the update
            if (product.categoryId) formData.append('categoryId', product.categoryId);
            if (product.subcategoryId) formData.append('subcategoryId', product.subcategoryId);
            if (product.tva !== undefined && product.tva !== null) formData.append('tva', product.tva);
            if (product.purchasePrice !== undefined && product.purchasePrice !== null) formData.append('purchasePrice', product.purchasePrice);
            
            // Ne pas envoyer le barcode pour éviter les conflits de validation (déjà existant ou format invalide)
            await api.put(`/products/${product.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setPromoSuccess(prev => ({ ...prev, [product.id]: true }));
            // Re-fetch products immediately so the suggestion list updates and hides this product
            const res = await api.get('/products');
            setProducts(Array.isArray(res.data) ? res.data : res.data?.products || []);
            setTimeout(() => setPromoSuccess(prev => ({ ...prev, [product.id]: false })), 3000);
        } catch (err) {
            console.error('Failed to apply promo', err);
            alert("Erreur lors de l'application de la promotion.");
        }
    };

    // "Commander" button - shows a reorder alert
    const handleOrderProduct = (product) => {
        setOrderSuccess(prev => ({ ...prev, [product.id]: true }));
        setTimeout(() => setOrderSuccess(prev => ({ ...prev, [product.id]: false })), 4000);
    };

    // Generate a visual poster for a marketing idea
    const handleGeneratePoster = (ideaId) => {
        setGeneratingPoster(prev => ({ ...prev, [ideaId]: true }));
        // Simulate generation delay
        setTimeout(() => {
            setGeneratingPoster(prev => ({ ...prev, [ideaId]: false }));
            setPosterGenerated(prev => ({ ...prev, [ideaId]: true }));
        }, 2500);
    };

    const renderTabContent = () => {
        if (loadingData) {
            return <div className="flex h-64 items-center justify-center"><FiRefreshCw className="animate-spin text-4xl text-blue-500" /></div>;
        }

        switch (activeTab) {
            case 'overview':
                const daily = getDailySummary();
                const slowOverviewProds = getSlowProductsWithPromos().slice(0, 3);
                return (
                    <div className="space-y-8">
                        {/* Strategic BI Hero */}
                        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/5 group">
                            <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-all duration-1000"></div>
                            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                                <div className="max-w-2xl">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="px-4 py-1.5 bg-blue-500/20 backdrop-blur-xl rounded-full text-[11px] font-black tracking-[0.2em] uppercase border border-white/10 text-blue-300">
                                            IA ANALYTICS ENGINE 
                                        </span>
                                        <div className="flex gap-1.5">
                                            {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-pulse" style={{animationDelay: `${i*0.2}s`}}></div>)}
                                        </div>
                                    </div>
                                    <h3 className="text-4xl font-black mb-4 leading-[1.1] tracking-tight">{t('aiHeroTitle', "Optimisez votre magasin avec l'IA.")}</h3>
                                    <p className="text-slate-300 text-lg opacity-90 leading-relaxed">
                                        {t('aiHeroDesc', "Analyse temps réel : Votre CA est de {{rev}}. Le volume est stable. Focus suggéré : Promotions ciblées.", {rev: formatCurrency(daily.todayRevenue)})}
                                    </p>
                                </div>
                                <div className="flex flex-wrap md:flex-nowrap gap-4 shrink-0">
                                    <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 w-32 md:w-40 flex flex-col justify-center hover:scale-105 transition-transform">
                                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('sales', 'Ventes')}</div>
                                        <div className="text-3xl font-black text-white">{daily.todayCount}</div>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 w-32 md:w-40 flex flex-col justify-center hover:scale-105 transition-transform">
                                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('alerts', 'Alertes')}</div>
                                        <div className="text-3xl font-black text-orange-400">{getSmartAlerts().length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-black flex items-center gap-3 tracking-tighter uppercase"><FiTrendingUp className="text-blue-600" /> {t('topSelling', 'Top de Vente')}</h3>
                                    <div className="flex bg-gray-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <button onClick={() => setTopProductsSortBy('revenue')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${topProductsSortBy === 'revenue' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-gray-400'}`}>{t('revenueSort', 'Revenu')}</button>
                                        <button onClick={() => setTopProductsSortBy('quantity')} className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${topProductsSortBy === 'quantity' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-md' : 'text-gray-400'}`}>{t('quantitySort', 'Quantité')}</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {getTopProducts().map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all hover:bg-white dark:hover:bg-slate-900 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                                    {p.imageUrl ? <img src={`${API_URL}${p.imageUrl}`} className="w-full h-full object-contain" /> : <span className="text-xs font-black text-slate-400">{p.name.substring(0,2).toUpperCase()}</span>}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-800 dark:text-white truncate max-w-[150px]">{p.name}</div>
                                                    <div className="text-xs text-slate-400 font-bold">{t('unitsSold', '{{count}} unités vendues', {count: p.qty})}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-blue-600 dark:text-blue-400">{formatCurrency(p.revenue)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700">
                                <h3 className="text-xl font-black mb-8 flex items-center gap-3 tracking-tighter uppercase"><FiAlertCircle className="text-orange-500" /> {t('dormantStock', 'Produits Dormants')}</h3>
                                <div className="space-y-4">
                                    {slowOverviewProds.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-orange-50/30 dark:bg-orange-900/10 rounded-2xl border border-transparent hover:border-orange-100 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-orange-100 dark:border-orange-900/30 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                                                    {p.imageUrl ? <img src={`${API_URL}${p.imageUrl}`} className="w-full h-full object-contain" /> : <span className="text-xs font-black text-orange-300">{p.name.substring(0,2).toUpperCase()}</span>}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-800 dark:text-white truncate max-w-[150px]">{p.name}</div>
                                                    <div className="text-xs text-orange-500/70 font-bold underline decoration-2 underline-offset-4">Stock: {p.stockQuantity}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-black text-orange-600 bg-orange-100 dark:bg-orange-900/40 px-2 py-1 rounded-lg">PROMO {p.suggestedDiscount}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'products':
                const slowProds = getSlowProductsWithPromos();
                return (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><FiActivity className="text-orange-500" /> {t('adaptedPromotions', 'Promotions Adaptées')}</h3>
                            <p className="text-sm text-gray-500 mb-6">Suggestions IA pour écouler les stocks dormants et maximiser la rotation.</p>
                            
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
                                                <div className="text-xs text-gray-500">Stock: {p.stockQuantity} unités</div>
                                                <div className="bg-orange-500 text-white font-bold px-2 py-0.5 rounded-md text-xs inline-block mt-1">Remise IA: {p.suggestedDiscount}</div>
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
                return (
                    <div className="space-y-8">
                        {/* Forecast Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-blue-500 font-black text-[10px] uppercase tracking-widest mb-2">{t('estimatedGrowth', 'Croissance Estimée')}</div>
                                <div className="text-3xl font-black text-slate-800 dark:text-white">+12.5%</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">Projection Q2 2026</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-indigo-500 font-black text-[10px] uppercase tracking-widest mb-2 font-bold">{t('supplyUrgency', 'Urgence Approvisionnement')}</div>
                                <div className="text-3xl font-black text-indigo-600">85%</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">Capacité de stockage optimale</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-teal-500 font-black text-[10px] uppercase tracking-widest mb-2 font-bold">{t('marketTrend', 'Tendance Marché')}</div>
                                <div className="text-3xl font-black text-teal-600">HAUSSE</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">Saisonnalité favorable</div>
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
                                    <ComposedChart data={getForecastData()}>
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
                const behavior = getBehaviorData();
                return (
                    <div className="space-y-8">
                        {/* Behavior Insights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full -mr-16 -mt-16"></div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">{t('peakActivity', 'Heure de Pointe')}</div>
                                    <div className="text-4xl font-black">16:00</div>
                                </div>
                                <div className="text-xs font-bold opacity-70 mt-4">+24% d'affluence vs matins</div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-7 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                                <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">{t('customerFlow', 'Flux Clients')}</div>
                                <div className="text-3xl font-black text-slate-800 dark:text-white">High</div>
                                <div className="text-xs text-green-500 mt-1 font-bold">Stable sur les 7 derniers jours</div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-7 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                                <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">{t('repeatBuyers', 'Fidélité')}</div>
                                <div className="text-3xl font-black text-slate-800 dark:text-white">68%</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">Taux de retour clients hebdomadaire</div>
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
                                    Mise à jour directe
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
            case 'marketing':
                return (
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                                <div>
                                    <h3 className="text-2xl font-black flex items-center gap-3 tracking-tighter uppercase">
                                        <FiShoppingBag className="text-pink-500 scale-125" /> {t('tabMarketing', 'Marketing')}
                                    </h3>
                                    <p className="text-slate-500 font-medium mt-1">{t('aiMarketingDesc', "L'IA conçoit vos prochaines campagnes à partir de vos données réelles.")}</p>
                                </div>
                                <button
                                    onClick={generateMarketingIdeas}
                                    disabled={isGeneratingMarketing}
                                    className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 group uppercase tracking-widest text-[11px]"
                                >
                                    {isGeneratingMarketing ? <FiRefreshCw className="animate-spin" /> : <FiActivity className="group-hover:rotate-180 transition-transform duration-500" />}
                                    {isGeneratingMarketing ? t('loading', 'ANALYSE...') : t('btnGenerateAi', "GÉNÉRER AVEC L'IA")}
                                </button>
                            </div>

                            {!marketingSuggested && !isGeneratingMarketing && (
                                <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mb-6 text-5xl shadow-lg">🚀</div>
                                    <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">{t('readyToBoost', 'Prêt à Booster ?')}</h4>
                                    <p className="text-slate-500 max-w-sm font-medium text-sm">{t('marketingLaunchDesc', "Lancez l'intelligence marketing pour découvrir des opportunités uniques.")}</p>
                                </div>
                            )}

                            {isGeneratingMarketing && (
                                <div className="flex flex-col items-center justify-center py-24">
                                    <FiRefreshCw className="animate-spin text-4xl text-blue-500 mb-4" />
                                    <p className="text-slate-500 font-black tracking-widest uppercase text-[10px]">{t('aiCalculating', 'Calcul stratégique...')}</p>
                                </div>
                            )}

                            <div className="grid gap-8 md:grid-cols-2">
                                <AnimatePresence>
                                    {marketingIdeas.map((idea, i) => (
                                        <motion.div 
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="group bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-lg hover:shadow-2xl transition-all"
                                        >
                                            <div className="relative p-8 text-white min-h-[160px] flex flex-col justify-end" style={{ backgroundColor: idea.theme }}>
                                                <div className="absolute top-6 right-6 text-5xl opacity-20 group-hover:scale-125 transition-transform duration-500">{idea.emoji}</div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest uppercase">Offre IA</span>
                                                        {idea.timing && (
                                                            <span className="px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                                                                <FiCalendar className="text-[10px]" /> {idea.timing}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-black text-2xl tracking-tighter uppercase">{idea.title}</h4>
                                                </div>
                                            </div>
                                            <div className="p-8">
                                                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6 text-sm">{idea.description}</p>
                                                
                                                {idea.products && idea.products.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t('featuredProducts', 'Produits à l\'honneur')}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {idea.products.map((pName, j) => (
                                                                    <span key={j} className="text-[10px] font-black bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                                                        {pName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t('visualSupport', 'Support Visuel')}</p>
                                                            <div className="flex gap-2">
                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs" title={t('poster', 'Affiche')}>🖼️</div>
                                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs" title={t('catalog', 'Catalogue')}>📚</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="flex gap-3">
                                                    {posterGenerated[i] ? (
                                                        <button
                                                            onClick={() => setSelectedPoster(idea)}
                                                            className="flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl bg-green-500 text-white shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-transform"
                                                        >
                                                            ✨ {t('seePoster', 'Voir l\'Affiche')}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleGeneratePoster(i)}
                                                            disabled={generatingPoster[i]}
                                                            className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all ${
                                                                generatingPoster[i] ? 'opacity-50 cursor-wait' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                            }`}
                                                            style={{ borderColor: idea.theme, color: idea.theme }}
                                                        >
                                                            {generatingPoster[i] ? (
                                                                <>
                                                                    <FiRefreshCw className="animate-spin" /> {t('loading', 'Chargement...')}
                                                                </>
                                                            ) : (
                                                                <>🎨 {t('generatePoster', 'Générer l\'affiche')}</>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="px-6 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                                                        title={t('moreDetails', 'Plus de détails')}
                                                    >
                                                        <FiArrowUpRight />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                );
            case 'alerts':
                const smartAlerts = getSmartAlerts();
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2"><FiAlertCircle className="text-red-500"/> {t('anticipatingShortages', 'Anticipation des Ruptures')}</h3>
                            <p className="text-sm text-gray-500 mt-1">{t('stockVelocityDesc', 'Basé sur la vélocité des ventes récentes.')}</p>
                        </div>
                        <div className="space-y-3">
                            {smartAlerts.length === 0 ? (
                                <p className="text-green-500 font-medium">{t('everythingIsFine', 'Tout va bien ! Aucune rupture anticipée.')}</p>
                            ) : (
                                smartAlerts.map((a, i) => (
                                    <div key={i} className={`flex items-center justify-between p-4 border rounded-xl relative overflow-hidden ${
                                        a.urgency === 'high' ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800/50' : 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/50'
                                    }`}>
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.urgency === 'high' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden shrink-0 ml-2">
                                                {a.p.imageUrl ? (
                                                    <img src={`${API_URL}${a.p.imageUrl}`} alt={a.p.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-[10px] font-black text-gray-400">{a.p.name.substring(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`font-bold ${a.urgency === 'high' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                                    {a.p.name}
                                                </p>
                                                <p className={`text-sm mt-1 font-medium ${a.urgency === 'high' ? 'text-red-600' : 'text-orange-600'}`}>
                                                    {a.reason}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-3 py-1 text-white font-bold rounded-lg text-sm ${a.urgency === 'high' ? 'bg-red-500' : 'bg-orange-500'}`}>
                                                {a.p.stockQuantity} en stock
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            
            {/* MAIN DASHBOARD PANEL */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Tabs */}
                <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 custom-scrollbar hide-scrollbar">
                    {[
                        { id: 'overview', label: t('tabOverview', "Vue d'ensemble"), icon: FiPieChart },
                        { id: 'products', label: t('tabProductsPromos', 'Produits & Promos'), icon: FiBox },
                        { id: 'forecasts', label: t('tabForecasts', 'Prévisions'), icon: FiTrendingUp },
                        { id: 'behavior', label: t('tabBehavior', 'Comportement'), icon: FiCalendar },
                        { id: 'alerts', label: t('tabAlerts', 'Alertes stock'), icon: FiAlertCircle }
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
