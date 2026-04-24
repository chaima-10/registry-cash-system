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
    const [activeTab, setActiveTab] = useState('products');
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

    // AI states
    const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);

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
            actionReason: t('actionReasonSlow', { qty: p.stockQuantity })
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
                alerts.push({ p, days: daysRemaining.toFixed(1), urgency: 'high', reason: t('stockCriticalAbs', "Stock critique absolu (<10)") });
            } else if (dailyVelocity > 1 && daysRemaining < 7) {
                alerts.push({ p, days: daysRemaining.toFixed(1), urgency: 'medium', reason: t('sellingFastAlert', { days: daysRemaining.toFixed(0) }) });
            }
        });
        return alerts.sort((a,b) => a.days - b.days).slice(0, 8);
    };

    const getForecastData = () => {
        const monthlyAvg = sales.length > 0 ? sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0) / Math.max(1, sales.length * 0.1) : 5000;
        const months = ['M+1', 'M+2', 'M+3', 'M+4', 'M+5', 'M+6'];
        return months.map((m, i) => {
            const pred = monthlyAvg * (1 + (i * 0.03)); // 3% growth linear
            return {
                name: m,
                Prédiction: pred,
                Historique: monthlyAvg,
                Approvisionnement: pred * 0.6
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

            case 'products':
                const slowProds = getSlowProductsWithPromos();
                return (
                    <div className="space-y-6">
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
                return (
                    <div className="space-y-8">
                        {/* Forecast Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-blue-500 font-black text-[10px] uppercase tracking-widest mb-2">{t('estimatedGrowth', 'Croissance Estimée')}</div>
                                <div className="text-3xl font-black text-slate-800 dark:text-white">+12.5%</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">{t('projectionQ2', 'Projection Q2 2026')}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-indigo-500 font-black text-[10px] uppercase tracking-widest mb-2 font-bold">{t('supplyUrgency', 'Urgence Approvisionnement')}</div>
                                <div className="text-3xl font-black text-indigo-600">85%</div>
                                <div className="text-xs text-slate-400 mt-1 font-bold">{t('optimalStockCapacity', 'Capacité de stockage optimale')}</div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                                <div className="text-teal-500 font-black text-[10px] uppercase tracking-widest mb-2 font-bold">{t('marketTrend', 'Tendance Marché')}</div>
                                <div className="text-3xl font-black text-teal-600">{t('uptrend', 'HAUSSE')}</div>
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
                                <div className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">{t('repeatBuyers', 'Panier Moyen')}</div>
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
                        { id: 'products', label: t('tabProductsPromos', 'Produits & Promos'), icon: FiBox },
                        { id: 'forecasts', label: t('tabForecasts', 'Prévisions'), icon: FiTrendingUp },
                        { id: 'behavior', label: t('tabBehavior', 'Comportement'), icon: FiCalendar }
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
