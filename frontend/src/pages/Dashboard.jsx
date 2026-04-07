import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiDollarSign, FiActivity, FiRefreshCw, FiAward, FiClock, 
    FiPieChart, FiBox, FiTrendingUp, FiArrowRight, FiZap
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <motion.div
        whileHover={{ y: -5, scale: 1.02 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-7 rounded-[2rem] shadow-xl shadow-slate-200/40 dark:shadow-none transition-all group"
    >
        <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl -mr-16 -mt-16 rounded-full ${color.replace('bg-', 'bg-')}`}></div>
        <div className="flex items-start justify-between mb-6 relative z-10">
            <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-xl ${color.replace('bg-', 'text-')}`}>
                <Icon />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black ${trend >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <FiTrendingUp className={trend < 0 ? 'rotate-180' : ''} />
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="relative z-10">
            <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h3>
            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{value}</p>
            {subtitle && <p className="text-[10px] font-bold text-slate-400 mt-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span> {subtitle}
            </p>}
        </div>
    </motion.div>
);

const Dashboard = () => {
    const { t } = useTranslation();
    const { formatCurrency } = useAuth();
    const [period, setPeriod] = useState('day'); // day, week, month
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [salesRes, prodRes] = await Promise.all([
                    api.get('/sales').catch(() => ({ data: [] })),
                    api.get('/products').catch(() => ({ data: [] }))
                ]);
                
                setSales(Array.isArray(salesRes.data) ? salesRes.data : salesRes.data?.sales || []);
                setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.products || []);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ----------------------------------------
    // FINANCIAL INTELLIGENCE CALCULATIONS
    // ----------------------------------------
    
    const now = new Date();
    
    const isToday = (d) => d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const isThisWeek = (d) => {
        const diff = (now - d) / (1000 * 60 * 60 * 24);
        return diff <= 7;
    };
    const isThisMonth = (d) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

    const checkPeriod = (d) => {
        if (period === 'day') return isToday(d);
        if (period === 'week') return isThisWeek(d);
        return isThisMonth(d);
    };

    let totalRevenue = 0;
    let totalCost = 0;
    let transactionCount = 0;
    const cashierMap = {};

    // Map for faster product lookup
    const productLookup = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

    sales.forEach(s => {
        const saleDate = new Date(s.createdAt);
        if (!checkPeriod(saleDate)) return;

        const rev = parseFloat(s.totalAmount || 0);
        totalRevenue += rev;
        transactionCount++;

        // Calculate COGS (Cost of Goods Sold)
        if (s.items && Array.isArray(s.items)) {
            s.items.forEach(item => {
                const prod = productLookup[item.productId || item.id];
                const costPrice = prod ? parseFloat(prod.purchasePrice || 0) : 0;
                totalCost += (costPrice * (item.quantity || 1));
            });
        } else {
            // Fallback estimation
            totalCost += (rev * 0.65);
        }

        // Cashier logic
        const cName = s.user?.username || `Utilisateur #${s.userId}`;
        if (!cashierMap[cName]) cashierMap[cName] = { name: cName, revenue: 0, count: 0 };
        cashierMap[cName].revenue += rev;
        cashierMap[cName].count += 1;
    });

    const netProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;
    const inventoryValue = products.reduce((acc, p) => acc + (p.stockQuantity * parseFloat(p.price || 0)), 0);

    const recentTransactions = sales.slice(0, 5); 
    const topCashiers = Object.values(cashierMap).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
    const maxCashierRevenue = topCashiers.length > 0 ? topCashiers[0].revenue : 1;

    const timeAgo = (dateStr) => {
        const min = Math.floor((new Date() - new Date(dateStr)) / 60000);
        if (min < 1) return t('justNow', "À l'instant");
        if (min < 60) return t('minutesAgo', 'Il y a {{min}} min', { min });
        const hr = Math.floor(min/60);
        if (hr < 24) return t('hoursAgo', 'Il y a {{hr}} h', { hr });
        return t('daysAgo', 'Il y a {{days}} j.', { days: Math.floor(hr/24) });
    };

    if (loading) {
        return <div className="flex items-center justify-center h-[70vh]"><FiRefreshCw className="animate-spin text-4xl text-blue-500" /></div>;
    }

    return (
        <div className="space-y-8 p-1">
            {/* Header & Global Period Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-800 dark:text-white uppercase">{t('dashboard', 'Tableau de Bord')}</h1>
                    <p className="text-slate-400 font-bold text-sm mt-1">{t('dashboardSubtitle', 'Intelligence financière et monitoring en temps réel.')}</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                    {[
                        { id: 'day', label: t('periodDay', 'Jour') },
                        { id: 'week', label: t('periodWeek', 'Semaine') },
                        { id: 'month', label: t('periodMonth', 'Mois') }
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                period === p.id 
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg shadow-blue-500/10' 
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={t('turnover', 'Chiffre d\'Affaires')} 
                    value={formatCurrency(totalRevenue)} 
                    subtitle={t('periodTransactions', '{{count}} transactions ce(tte) {{period}}', { count: transactionCount, period: period === 'day' ? 'jour' : period === 'week' ? 'semaine' : 'mois' })} 
                    icon={FiDollarSign} 
                    color="bg-blue-600"
                    trend={12}
                />
                <StatCard 
                    title={t('totalPurchases', 'Total Achats (Coût)')} 
                    value={formatCurrency(totalCost)} 
                    icon={FiBox} 
                    color="bg-amber-500" 
                    subtitle={t('cogsDesc', 'Valeur d\'achat des produits vendus')}
                />
                <StatCard 
                    title={t('profitRealized', 'Bénéfice Réalisé')} 
                    value={formatCurrency(netProfit)} 
                    icon={FiZap} 
                    color="bg-emerald-600" 
                    trend={8}
                    subtitle={t('marginLabel', 'Marge nette : {{margin}}%', { margin })}
                />
                <StatCard 
                    title={t('inventoryValue', 'Valeur Stock Actuel')} 
                    value={formatCurrency(inventoryValue)} 
                    icon={FiPieChart} 
                    color="bg-indigo-600" 
                    subtitle={t('potentialSales', 'Potentiel CA résiduel')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Recent Transactions */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600"><FiClock size={20}/></div>
                            {t('recentTransactions', 'Dernières Transactions')}
                        </h3>
                        <FiArrowRight className="text-slate-300 pointer-events-none" />
                    </div>
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {recentTransactions.map((tx, i) => (
                                <motion.div 
                                    layout
                                    key={tx.id || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all hover:bg-white dark:hover:bg-slate-900 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
                                            {tx.user?.username?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-slate-800 dark:text-white font-black uppercase text-xs tracking-tight">{t('ticketNumber', 'Ticket #{{id}}', { id: tx.id })}</p>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{tx.user?.username || 'Admin'} • {timeAgo(tx.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(tx.totalAmount)}</div>
                                        <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none mt-1">Payé</div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {recentTransactions.length === 0 && <p className="text-slate-400 text-sm font-medium p-4 text-center border-2 border-dashed border-slate-100 rounded-3xl">{t('noTransactionsFound', 'Aucune transaction enregistrée.')}</p>}
                    </div>
                </div>

                {/* Cashier Performance - Restyled with filters */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600"><FiAward size={20}/></div>
                            {t('cashierPerformance', 'Performances Caissiers')}
                        </h3>
                        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">{period}</div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold mb-8 leading-relaxed">{t('cashierPerformanceDesc', 'Classement basé sur le CA généré selon le filtre temporel sélectionné.')}</p>
                    
                    <div className="space-y-7">
                        <AnimatePresence mode="popLayout">
                            {topCashiers.map((cashier, i) => (
                                <motion.div layout key={cashier.name} className="relative group">
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                                                i === 0 ? 'bg-amber-100 text-amber-600 shadow-amber-200' :
                                                i === 1 ? 'bg-slate-100 text-slate-500 shadow-slate-200' :
                                                i === 2 ? 'bg-orange-100 text-orange-600 shadow-orange-200' :
                                                'bg-slate-50 text-slate-400'
                                            } font-black shadow-sm group-hover:scale-110 transition-transform`}>
                                                {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                                            </div>
                                            <span className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-tight">{cashier.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-slate-800 dark:text-white text-sm leading-none mb-1">{formatCurrency(cashier.revenue)}</div>
                                            <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{t('ticketsGenerated', '{{count}} tickets', { count: cashier.count })}</div>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-50 dark:border-slate-700/50">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(cashier.revenue / maxCashierRevenue) * 100}%` }}
                                            className={`h-full rounded-full ${
                                                i === 0 ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600' : 
                                                'bg-gradient-to-r from-blue-500 to-indigo-600'
                                            } shadow-lg shadow-blue-500/10`}
                                        ></motion.div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {topCashiers.length === 0 && <p className="text-slate-400 text-sm font-bold text-center py-6">{t('noCashierData', 'Aucune donnée pour cette période.')}</p>}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
