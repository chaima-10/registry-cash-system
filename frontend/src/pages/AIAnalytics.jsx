import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiTrendingUp, FiBox, FiCalendar, FiAlertCircle, FiPieChart, 
    FiSend, FiMessageCircle, FiRefreshCw, FiActivity, FiArrowUpRight, FiArrowDownRight, FiShoppingBag 
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

    // AI states
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: "Bonjour ! Je suis l'Assistant IA du magasin. Je surveille vos données, prévois vos stocks et analyse le comportement d'achat de vos clients. Comment puis-je vous aider aujourd'hui ?" }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const messagesEndRef = useRef(null);

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

    // Scroll chat to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

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
                    if (!map[item.productId]) map[item.productId] = { id: item.productId, name: item.product?.name || `Produit ${item.productId}`, imageUrl: item.product?.imageUrl || null, revenue: 0, qty: 0 };
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

        // Assume sales log is over 30 days for velocity calculation
        const alerts = [];
        products.forEach(p => {
            const totalSold = salesMap[p.id] || 0;
            const dailyVelocity = totalSold / 30; // Approx sold per day
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

    // AI Chat handler
    const handleSendMessage = async (e, quickPrompt = null) => {
        if (e) e.preventDefault();
        const userText = quickPrompt || chatInput;
        if (!userText.trim()) return;

        const newMessages = [...chatMessages, { role: 'user', content: userText }];
        setChatMessages(newMessages);
        setChatInput('');
        setIsAiTyping(true);

        try {
            const daily = getDailySummary();
            const alerts = getSmartAlerts();
            const anomaliesInfo = getAnomalies();
            
            const safeSales = Array.isArray(sales) ? sales : [];
            const safeUsers = Array.isArray(users) ? users : [];
            const safeCats = Array.isArray(categories) ? categories : [];
            const safeProducts = Array.isArray(products) ? products : [];

            // Préparer les données brutes pour que l'IA y ait totalement accès
            const productsData = JSON.stringify(safeProducts.map(p => ({
                id: p.id, name: p.name, stock: p.stockQuantity, achat: p.purchasePrice, vente: p.price
            })));
            
            // Pour les ventes, on ne prend que l'essentiel pour ne pas surcharger la requête
            const salesData = JSON.stringify(safeSales.slice(-50).map(s => ({
                date: s.createdAt,
                total: s.totalAmount,
                userId: s.userId,
                items: Array.isArray(s.items) ? s.items.map(i => ({ pId: i.productId, q: i.quantity })) : []
            })));

            const usersData = JSON.stringify(safeUsers.map(u => ({ id: u.id, nom: u.username, role: u.role })));
            const categoriesData = JSON.stringify(safeCats.map(c => ({ id: c.id, nom: c.name })));
            
            const systemContext = `
Nom de l'assistant : Assistant IA.
Contexte du magasin:
1. Résumé aujourd'hui: ${daily.todayRevenue}$ (${daily.todayCount} ventes). Variation vs hier: ${daily.diff}%.
2. Alertes Stock: ${alerts.length} alertes actuelles.
3. Anomalies détectées: ${anomaliesInfo.length}.

MISSION: Tu as un accès intégral aux données réelles ci-dessous. Tu peux répondre à n'importe quelle question du gérant : promotions à lancer, décisions prioritaires, tendances... Pose des réponses courtes et stratégiques.

DONNÉES PRODUITS:
${productsData}

DONNÉES UTILISATEURS:
${usersData}

DONNÉES CATÉGORIES:
${categoriesData}

DERNIÈRES VENTES:
${salesData}
`;

            const apiMessages = newMessages.filter(m => m.role === 'user' || m.role === 'assistant');

            const response = await api.post('/ai/chat', {
                messages: apiMessages,
                systemContext: systemContext
            });

            setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
        } catch (error) {
            console.error("Erreur AI", error);
            const errorMessage = error.response?.data?.message || 'Désolé, une erreur technique est survenue lors de la connexion.';
            setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
        } finally {
            setIsAiTyping(false);
        }
    };

    const renderTabContent = () => {
        if (loadingData) {
            return <div className="flex h-64 items-center justify-center"><FiRefreshCw className="animate-spin text-4xl text-blue-500" /></div>;
        }

        switch (activeTab) {
            case 'overview':
                const slowOverviewProds = getSlowProductsWithPromos();
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Top Products Table */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2"><FiTrendingUp className="text-green-500" /> Les Plus Vendus</h3>
                                    <select 
                                        value={topProductsSortBy}
                                        onChange={(e) => setTopProductsSortBy(e.target.value)}
                                        className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 rounded-lg px-2 py-1.5 focus:ring-0 focus:outline-none"
                                    >
                                        <option value="revenue">Par Revenu</option>
                                        <option value="quantity">Par Quantité</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    {getTopProducts().map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                                                {p.imageUrl ? (
                                                    <img src={`${import.meta.env.VITE_API_URL}${p.imageUrl}`} alt={p.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-[10px] font-black text-gray-400">{p.name.substring(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <span className="font-medium dark:text-white flex-1 truncate">{p.name}</span>
                                            <div className="text-right shrink-0">
                                                <div className="font-bold text-green-600 dark:text-green-400">{formatCurrency(p.revenue)}</div>
                                                <div className="text-xs text-gray-500">{p.qty} vendus</div>
                                            </div>
                                        </div>
                                    ))}
                                    {getTopProducts().length === 0 && <p className="text-gray-500 text-sm">Pas de données de vente disponibles.</p>}
                                </div>
                            </div>
                            
                            {/* Slow Products Table */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><FiAlertCircle className="text-orange-500" /> Les Plus Lents</h3>
                                <div className="space-y-3">
                                    {slowOverviewProds.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                                                {p.imageUrl ? (
                                                    <img src={`${import.meta.env.VITE_API_URL}${p.imageUrl}`} alt={p.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-[10px] font-black text-gray-400">{p.name.substring(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium dark:text-white block truncate">{p.name}</span>
                                                <span className="text-xs text-gray-500">Stock restant: {p.stockQuantity}</span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="font-bold text-orange-600 dark:text-orange-400">Promo IA: {p.suggestedDiscount}</div>
                                                <div className="text-[10px] text-gray-500">Ventes trop faibles</div>
                                            </div>
                                        </div>
                                    ))}
                                    {slowOverviewProds.length === 0 && <p className="text-gray-500 text-sm">Aucun produit dormant détecté.</p>}
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
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><FiActivity className="text-orange-500" /> Promotions Adaptées</h3>
                            <p className="text-sm text-gray-500 mb-6">Suggestions IA pour écouler les stocks dormants et maximiser la rotation.</p>
                            
                            <div className="grid gap-4 md:grid-cols-2">
                                {slowProds.map((p, i) => (
                                    <div key={i} className="p-4 border border-orange-100 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold dark:text-white">{p.name}</div>
                                            <div className="bg-orange-500 text-white font-bold px-2 py-1 rounded-md text-sm">{p.suggestedDiscount}</div>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{p.actionReason}</p>
                                        <button className="w-full py-2 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">
                                            Appliquer la promotion
                                        </button>
                                    </div>
                                ))}
                                {slowProds.length === 0 && <p className="text-gray-500 italic">Aucun stock dormant détecté.</p>}
                            </div>
                        </div>
                    </div>
                );
            case 'forecasts':
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[450px] flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold mb-1">Prévisions des Ventes & Approvisionnement</h3>
                            <p className="text-sm text-gray-500">Anticipez vos ventes futures pour mieux organiser vos achats auprès des fournisseurs.</p>
                        </div>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={getForecastData()}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="name" tick={{fill: '#6b7280'}} />
                                    <YAxis tick={{fill: '#6b7280'}} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend />
                                    <Bar dataKey="Approvisionnement" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Achat Conseillé ($)" />
                                    <Line type="monotone" dataKey="Prédiction" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="Ventes Prévues ($)" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            case 'behavior':
                const behavior = getBehaviorData();
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-center flex flex-col justify-center">
                                <h4 className="text-indigo-600 dark:text-indigo-400 font-bold mb-2">Panier Moyen Global</h4>
                                <div className="text-4xl font-black text-indigo-700 dark:text-indigo-300">
                                    {formatCurrency(behavior.panierMoyen)}
                                </div>
                                <p className="text-xs text-indigo-500 mt-2">Basé sur {behavior.totalClients} transactions totales</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[350px] flex flex-col">
                            <h3 className="text-lg font-bold mb-4">Activité par Heure (Heatmap)</h3>
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={behavior.heatmapData}>
                                        <defs>
                                            <linearGradient id="colorTrans" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="heure" tick={{fill: '#6b7280'}} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Area type="monotone" dataKey="Transactions" stroke="#ef4444" fillOpacity={1} fill="url(#colorTrans)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                );
            case 'anomalies':
                const anomalies = getAnomalies();
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white"><FiActivity className="text-purple-500"/> Détection d'Anomalies</h3>
                            <p className="text-sm text-gray-500 mt-1">L'IA scanne constament les flux de données pour identifier des comportements illogiques ou des erreurs de gestion.</p>
                        </div>
                        
                        <div className="space-y-4">
                            {anomalies.map((a, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm h-fit">
                                        <FiAlertCircle className="text-xl text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                                            {a.product.name} 
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full">{a.type}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{a.desc}</p>
                                    </div>
                                </div>
                            ))}
                            {anomalies.length === 0 && (
                                <div className="text-center py-10">
                                    <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-green-50 mb-3">
                                        <FiTrendingUp className="text-2xl text-green-500"/>
                                    </div>
                                    <p className="font-medium text-gray-600 dark:text-gray-300">Aucune anomalie détectée</p>
                                    <p className="text-sm text-gray-400 mt-1">Vos données de stock et de vente sont cohérentes.</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'alerts':
                const smartAlerts = getSmartAlerts();
                return (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2"><FiAlertCircle className="text-red-500"/> Anticipation des Ruptures</h3>
                            <p className="text-sm text-gray-500 mt-1">Basé sur la vélocité des ventes récentes (et pas seulement sur le stock brut).</p>
                        </div>
                        <div className="space-y-3">
                            {smartAlerts.length === 0 ? (
                                <p className="text-green-500 font-medium">Tout va bien ! Aucune rupture anticipée.</p>
                            ) : (
                                smartAlerts.map((a, i) => (
                                    <div key={i} className={`flex items-center justify-between p-4 border rounded-xl relative overflow-hidden ${
                                        a.urgency === 'high' ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800/50' : 'bg-orange-50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/50'
                                    }`}>
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.urgency === 'high' ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden shrink-0 ml-2">
                                                {a.p.imageUrl ? (
                                                    <img src={`${import.meta.env.VITE_API_URL}${a.p.imageUrl}`} alt={a.p.name} className="w-full h-full object-contain" />
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
                                            <button className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 px-3 py-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
                                                Commander
                                            </button>
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
                        { id: 'anomalies', label: t('tabAnomalies', 'Anomalies'), icon: FiActivity },
                        { id: 'alerts', label: t('tabAlerts', 'Alertes stock'), icon: FiAlertCircle },
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

            {/* AI ASSISTANT SIDE PANEL */}
            <div className="w-[380px] flex flex-col bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden shrink-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <FiMessageCircle className="text-xl" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">Assistant IA</h2>
                            <p className="text-blue-100 text-xs text-opacity-80">Connecté à vos données temps réel</p>
                        </div>
                    </div>
                </div>

                {/* Quick Prompts */}
                <div className="px-5 pt-4 pb-2 flex gap-2 overflow-x-auto custom-scrollbar hide-scrollbar">
                    <button onClick={(e) => handleSendMessage(e, "Générer un résumé de la journée")} className="whitespace-nowrap px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-bold tracking-wide hover:bg-blue-100 transition-colors uppercase">📊 Résumé</button>
                    <button onClick={(e) => handleSendMessage(e, "Quelles anomalies as-tu détectées dans les données ?")} className="whitespace-nowrap px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-bold tracking-wide hover:bg-blue-100 transition-colors uppercase">🔍 Anomalies</button>
                    <button onClick={(e) => handleSendMessage(e, "Que me conseilles-tu d'approvisionner urgemment ?")} className="whitespace-nowrap px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-bold tracking-wide hover:bg-blue-100 transition-colors uppercase">📦 Achats</button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4">
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-sm shadow-md' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-200 dark:border-gray-600'
                            }`}>
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {isAiTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={t('askAiPlaceholder', 'Demandez une analyse...')}
                            className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!chatInput.trim() || isAiTyping}
                            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <FiSend className="text-lg" />
                        </button>
                    </div>
                </form>
            </div>
            
        </div>
    );
};

export default AIAnalytics;
