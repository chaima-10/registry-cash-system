import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiDollarSign, FiActivity, FiRefreshCw, FiTrendingUp, FiAlertCircle, 
    FiBox, FiArrowRight, FiClock, FiShoppingBag, FiZap, FiAward, FiPieChart
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
    const [period, setPeriod] = useState('day'); 
    const [topProductsSortBy, setTopProductsSortBy] = useState('revenue');
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    // DATA INTELLIGENCE & CALCULATIONS
    // ----------------------------------------
    
    const now = new Date();
    const isToday = (d) => d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    const isThisWeek = (d) => { const diff = (now - d) / (1000 * 60 * 60 * 24); return diff <= 7; };
    const isThisMonth = (d) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

    const checkPeriod = (d) => {
        if (period === 'day') return isToday(d);
        if (period === 'week') return isThisWeek(d);
        return isThisMonth(d);
    };

    const productLookup = products.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {});
    
    const getDashboardData = () => {
        const now = new Date();
        let currentRev = 0;
        let currentCost = 0;
        let prevRev = 0;
        let prevCost = 0;
        let currentCount = 0;
        const cashierMap = {};

        // Calculate boundaries for previous period
        const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
        const lastMonth = new Date(); lastMonth.setMonth(now.getMonth() - 1);
        const lastYear = new Date(); lastYear.setFullYear(now.getFullYear() - 1);

        const isPreviousPeriod = (d) => {
            if (period === 'day') {
                return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
            }
            if (period === 'week') {
                const diff = (now - d) / (1000 * 60 * 60 * 24);
                return diff > 7 && diff <= 14;
            }
            if (period === 'month') {
                // If current month is Jan, previous is Dec of previous year
                const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
            }
            return false;
        };

        sales.forEach(s => {
            const saleDate = new Date(s.createdAt);
            const rev = parseFloat(s.totalAmount || 0);
            
            let cost = 0;
            // Use the product data already embedded in the sale items if available
            if (s.items && s.items.length > 0) {
                s.items.forEach(item => {
                    
                    const prod = item.product || productLookup[item.productId || item.id];
                    if (prod) {
                        const tvaRate = parseFloat(prod.tva || 0);
                        const purchasePrice = parseFloat(prod.purchasePrice || 0);
                        const costPrice = purchasePrice * (1 + tvaRate / 100);
                        cost += (costPrice * (item.quantity || 1));
                    } else {
                        // Fallback cost if product info is completely missing (approx 70% of item subtotal)
                        cost += parseFloat(item.subtotal || 0) * 0.7;
                    }
                });
            } else {
                cost = rev * 0.7; 
            }

            if (checkPeriod(saleDate)) {
                currentRev += rev;
                currentCost += cost;
                currentCount++;
                const cName = s.user?.username || t('userNumber', { id: s.userId });
                if (!cashierMap[cName]) cashierMap[cName] = { name: cName, revenue: 0, count: 0 };
                cashierMap[cName].revenue += rev;
                cashierMap[cName].count += 1;
            } else if (isPreviousPeriod(saleDate)) {
                prevRev += rev;
                prevCost += cost;
            }
        });

        const calculateTrend = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        const totalRevenue = currentRev;
        const totalCost = currentCost;
        const netProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

        return {
            revTrend: calculateTrend(currentRev, prevRev),
            profitTrend: calculateTrend(currentRev - currentCost, prevRev - prevCost),
            totalRevenue,
            totalCost,
            netProfit,
            margin,
            transactionCount: currentCount,
            cashierMap
        };
    };

    const { totalRevenue, totalCost, netProfit, margin, transactionCount, cashierMap, revTrend, profitTrend } = getDashboardData();
    const inventoryValue = products.reduce((acc, p) => acc + (p.stockQuantity * parseFloat(p.price || 0)), 0);

    const getPeriodSummary = () => ({ rev: totalRevenue, count: transactionCount });

    const getTopProducts = () => {
        const map = {};
        sales.forEach(sale => {
            if (!checkPeriod(new Date(sale.createdAt))) return;
            if (sale.items) sale.items.forEach(item => {
                if (!item.product || item.product.isDeleted || item.product.status !== 'Active') return;
                if (!map[item.productId]) map[item.productId] = { id: item.productId, name: item.product.name, imageUrl: item.product.imageUrl, revenue: 0, qty: 0 };
                map[item.productId].revenue += parseFloat(item.subtotal || 0);
                map[item.productId].qty += item.quantity;
            });
        });
        return Object.values(map)
            .sort((a, b) => topProductsSortBy === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty)
            .slice(0, 5);
    };

    const getSmartAlerts = () => {
        const salesMap = {};
        sales.forEach(sale => { if (sale.items) sale.items.forEach(item => { salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity; }); });
        const alerts = [];
        products.forEach(p => {
            if (p.stockQuantity <= 10) alerts.push({ p, urgency: 'high', reason: t('stockCritical', "Stock critique (<10)") });
            else if ((salesMap[p.id] || 0) > 50 && p.stockQuantity < 30) alerts.push({ p, urgency: 'medium', reason: t('sellingFastAlert', "Vente rapide, stock faible") });
        });
        return alerts.slice(0, 4);
    };

    const timeAgo = (dateStr) => {
        const min = Math.floor((new Date() - new Date(dateStr)) / 60000);
        if (min < 1) return t('justNow', "À l'instant");
        if (min < 60) return t('minutesAgo', 'Il y a {{min}} min', { min });
        const hr = Math.floor(min/60);
        if (hr < 24) return t('hoursAgo', 'Il y a {{hr}} h', { hr });
        return t('daysAgo', 'Il y a {{days}} j.', { days: Math.floor(hr/24) });
    };

    if (loading) return <div className="flex items-center justify-center h-[70vh]"><FiRefreshCw className="animate-spin text-4xl text-blue-500" /></div>;

    const summary = getPeriodSummary();
    const topProducts = getTopProducts();
    const alerts = getSmartAlerts();
    const recentTransactions = sales.slice(0, 5); 
    const topCashiers = Object.values(cashierMap).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
    const maxCashierRevenue = topCashiers.length > 0 ? topCashiers[0].revenue : 1;

    const getImageUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return `${API_URL}${url}`;
    };

    return (
        <div className="space-y-8 p-1">
            {/* Header & Period Switcher */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-800 dark:text-white uppercase">{t('dashboard', 'Tableau de Bord')}</h1>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                    {['day', 'week', 'month'].map(p => (
                        <button key={p} onClick={() => setPeriod(p)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                            {t(`period${p.charAt(0).toUpperCase() + p.slice(1)}`, p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Premium Banner */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white border border-white/5 group">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-all duration-1000"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                    <div className="max-w-2xl">
                        <span className="px-4 py-1.5 bg-blue-500/20 backdrop-blur-xl rounded-full text-[11px] font-black tracking-[0.2em] uppercase border border-white/10 text-blue-300">{t('financialMonitor', 'MONITEUR FINANCIER')}</span>
                        <h3 className="text-4xl font-black mt-6 mb-4 leading-[1.1] tracking-tight">{t('performanceOf', { period: period === 'day' ? t('ofDay', 'du Jour') : period === 'week' ? t('ofWeek', 'de la Semaine') : t('ofMonth', 'du Mois') })}</h3>
                        <p className="text-slate-300 text-lg opacity-90 leading-relaxed">{t('financialMonitorDesc', { rev: formatCurrency(summary.rev), count: summary.count })}</p>
                    </div>
                    <div className="flex gap-4 shrink-0">
                        <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 w-32 md:w-40 flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('sales', 'Ventes')}</div>
                            <div className="text-3xl font-black text-white">{summary.count}</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 w-32 md:w-40 flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('tabAlerts', 'Alertes')}</div>
                            <div className="text-3xl font-black text-orange-400">{alerts.length}</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Original StatCards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title={t('turnover', 'CA')} value={formatCurrency(totalRevenue)} icon={FiDollarSign} color="bg-blue-600" trend={revTrend} subtitle={t('periodTransactions', { count: transactionCount, period: t(`period${period.charAt(0).toUpperCase() + period.slice(1)}`) })} />
                <StatCard title={t('totalPurchases', 'Achats')} value={formatCurrency(totalCost)} icon={FiBox} color="bg-amber-500" subtitle={t('cogsDesc', "Coût des produits vendus")} />
                <StatCard title={t('profitRealized', 'Bénéfice')} value={formatCurrency(netProfit)} icon={FiZap} color="bg-emerald-600" trend={profitTrend} subtitle={t('marginLabel', { margin })} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Transactions (Old) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-8 shrink-0">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase">
                            <FiClock className="text-blue-600" /> {t('recentTransactions', 'Dernières Transactions')}
                        </h3>
                        <div className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">
                            {sales.length} {t('total')}
                        </div>
                    </div>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        <AnimatePresence mode="popLayout">
                            {sales.map((tx, i) => (
                                <motion.div layout key={tx.id || i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/40 rounded-3xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all hover:bg-white dark:hover:bg-slate-900 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg shadow-sm group-hover:scale-105 transition-transform">{tx.user?.username?.charAt(0).toUpperCase() || 'U'}</div>
                                        <div><p className="text-slate-800 dark:text-white font-black uppercase text-xs tracking-tight">{t('ticketNumber', { id: tx.id })}</p><p className="text-[10px] text-slate-400 font-bold mt-0.5">{tx.user?.username || t('admin', 'Admin')} • {timeAgo(tx.createdAt)}</p></div>
                                    </div>
                                    <div className="text-right"><div className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(tx.totalAmount)}</div><div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none mt-1">{t('paid', 'Payé')}</div></div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Top Selling (New) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black flex items-center gap-3 tracking-tighter uppercase">
                            <FiTrendingUp className="text-blue-600" /> {t('topSelling', 'Top de Vente')}
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => setTopProductsSortBy('revenue')} 
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${topProductsSortBy === 'revenue' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-400'}`}
                            >
                                {t('revenueLabel')}
                            </button>
                            <button 
                                onClick={() => setTopProductsSortBy('quantity')} 
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${topProductsSortBy === 'quantity' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-400'}`}
                            >
                                {t('quantityLabel')}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {topProducts.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all hover:bg-white dark:hover:bg-slate-900 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                                        {p.imageUrl ? <img src={getImageUrl(p.imageUrl)} className="w-full h-full object-contain" /> : <span className="text-xs font-black text-slate-400">{p.name.substring(0,2).toUpperCase()}</span>}
                                    </div>
                                    <div><div className="font-black text-slate-800 dark:text-white truncate max-w-[150px]">{p.name}</div><div className="text-xs text-slate-400 font-bold">{t('unitsSold', { count: p.qty })}</div></div>
                                </div>
                                <div className="text-lg font-black text-blue-600 dark:text-blue-400">{formatCurrency(p.revenue)}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cashier Performance (Old) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter uppercase mb-8"><FiAward className="text-amber-600" /> {t('cashierPerformance', 'Performances Caissiers')}</h3>
                    <div className="space-y-7">
                        {topCashiers.map((cashier, i) => (
                            <div key={cashier.name} className="relative group">
                                <div className="flex justify-between items-end mb-3">
                                    <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${i === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'} font-black shadow-sm group-hover:scale-110 transition-transform`}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</div><span className="font-black text-slate-700 dark:text-slate-200 uppercase text-xs tracking-tight">{cashier.name}</span></div>
                                    <div className="text-right"><div className="font-black text-slate-800 dark:text-white text-sm leading-none mb-1">{formatCurrency(cashier.revenue)}</div><div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{t('ticketsGenerated', { count: cashier.count })}</div></div>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-50 dark:border-slate-700/50"><motion.div initial={{ width: 0 }} animate={{ width: `${(cashier.revenue / maxCashierRevenue) * 100}%` }} className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} shadow-lg shadow-blue-500/10`}></motion.div></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stock Alerts (New) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl">
                    <h3 className="text-xl font-black flex items-center gap-3 tracking-tighter uppercase mb-8"><FiAlertCircle className="text-red-500" /> {t('stockAlerts')}</h3>
                    <div className="space-y-3">
                        {alerts.length === 0 ? <p className="text-slate-400 text-sm font-bold text-center py-6">{t('noAlerts', 'Aucune alerte.')}</p> : alerts.map((a, i) => (
                            <div key={i} className={`flex items-center justify-between p-4 border rounded-2xl relative overflow-hidden ${a.urgency === 'high' ? 'bg-red-50 border-red-100 dark:bg-red-900/10' : 'bg-orange-50 border-orange-100 dark:bg-orange-900/10'}`}><div className={`absolute left-0 top-0 bottom-0 w-1 ${a.urgency === 'high' ? 'bg-red-500' : 'bg-orange-500'}`}></div><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden shrink-0 ml-2">{a.p.imageUrl ? <img src={getImageUrl(a.p.imageUrl)} alt={a.p.name} className="w-full h-full object-contain" /> : <span className="text-[10px] font-black text-gray-400">{a.p.name.substring(0, 2).toUpperCase()}</span>}</div><div><p className={`font-bold text-xs ${a.urgency === 'high' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'}`}>{a.p.name}</p><p className={`text-[10px] mt-0.5 font-bold ${a.urgency === 'high' ? 'text-red-600' : 'text-orange-600'}`}>{a.reason}</p></div></div><span className={`px-3 py-1 text-white font-black rounded-lg text-[10px] ${a.urgency === 'high' ? 'bg-red-500' : 'bg-orange-500'}`}>{a.p.stockQuantity} {t('units', 'unités')}</span></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;


