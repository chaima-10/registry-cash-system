import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiShoppingBag, FiUsers, FiActivity, FiRefreshCw, FiAward, FiClock, FiPieChart, FiBox } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const StatCard = ({ title, value, change, icon: Icon, color, subtitle = '' }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm dark:shadow-xl transition-colors"
    >
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-opacity-20 ${color}`}>
                <Icon className={`text-2xl ${color.replace('bg-', 'text-')}`} />
            </div>
            {change !== undefined && (
                <span className={`text-sm font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {change > 0 ? '+' : ''}{change}%
                </span>
            )}
        </div>
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </motion.div>
);

const Dashboard = () => {
    const { t } = useTranslation();
    const { formatCurrency } = useAuth();

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
    // METRICS CALCULATIONS
    // ----------------------------------------
    
    const now = new Date();
    
    // Revenue logic
    let revToday = 0;
    let revWeek = 0;
    let revMonth = 0;
    let countToday = 0;

    // Cashier logic
    const cashierMap = {};

    sales.forEach(s => {
        const d = new Date(s.createdAt);
        const amt = parseFloat(s.totalAmount || 0);

        // Date conditions
        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        
        // Exact 7 days rolling window logic
        const diffTime = Math.abs(now - d);
        const diffDays = diffTime / (1000 * 60 * 60 * 24); 
        const isThisWeek = diffDays <= 7;
        
        // Accurate month logic
        const isThisMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

        if (isToday) { revToday += amt; countToday++; }
        if (isThisWeek) revWeek += amt;
        if (isThisMonth) revMonth += amt;

        // Cashier logic
        const cName = s.user?.username || `Utilisateur #${s.userId}`;
        if (!cashierMap[cName]) cashierMap[cName] = { name: cName, revenue: 0, count: 0 };
        cashierMap[cName].revenue += amt;
        cashierMap[cName].count += 1;
    });

    const inventoryValue = products.reduce((acc, p) => acc + (p.stockQuantity * parseFloat(p.price || 0)), 0);

    const recentTransactions = sales.slice(0, 6); // Top 6 since normally sorted DESC from backend

    const topCashiers = Object.values(cashierMap).sort((a,b) => b.revenue - a.revenue).slice(0, 5);
    const maxCashierRevenue = topCashiers.length > 0 ? topCashiers[0].revenue : 1;

    // Relative Time Formatter
    const timeAgo = (dateStr) => {
        const min = Math.floor((new Date() - new Date(dateStr)) / 60000);
        if (min < 1) return `À l'instant`;
        if (min < 60) return `Il y a ${min} min`;
        const hr = Math.floor(min/60);
        if (hr < 24) return `Il y a ${hr} h`;
        return `Il y a ${Math.floor(hr/24)} jours`;
    }

    if (loading) {
        return <div className="flex items-center justify-center h-[70vh]"><FiRefreshCw className="animate-spin text-4xl text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Revenu du Jour" value={formatCurrency(revToday)} subtitle={`${countToday} transactions aujourd'hui`} icon={FiDollarSign} color="bg-green-500" />
                <StatCard title="Revenu Semaine (7j)" value={formatCurrency(revWeek)} icon={FiActivity} color="bg-blue-500" />
                <StatCard title="Revenu du Mois" value={formatCurrency(revMonth)} icon={FiPieChart} color="bg-purple-500" />
                <StatCard title="Valeur du Stock (Revente)" value={formatCurrency(inventoryValue)} icon={FiBox} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent Transactions */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-xl transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FiClock className="text-blue-500"/> Dernières Transactions</h3>
                    <div className="space-y-4">
                        {recentTransactions.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold uppercase border border-blue-500/20">
                                        {tx.user?.username?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-bold">Ticket #{tx.id}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Encaissement : {tx.user?.username || 'Gérant'} • {timeAgo(tx.createdAt)}</p>
                                    </div>
                                </div>
                                <span className="text-gray-900 dark:text-white font-black text-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1 rounded-lg">
                                    {formatCurrency(tx.totalAmount)}
                                </span>
                            </div>
                        ))}
                        {recentTransactions.length === 0 && <p className="text-gray-500 text-sm">Aucune transaction enregistrée.</p>}
                    </div>
                </div>

                {/* Cashier Performance */}
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-xl transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FiAward className="text-yellow-500"/> Performances par Caissier</h3>
                    <p className="text-sm text-gray-500 mb-6">Classement basé sur le Chiffre d'Affaires total généré par chaque employé (historique complet).</p>
                    <div className="space-y-6 mt-6">
                        {topCashiers.map((cashier, i) => (
                            <div key={i} className="relative">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        {i === 0 && <span className="text-lg">🥇</span>}
                                        {i === 1 && <span className="text-lg">🥈</span>}
                                        {i === 2 && <span className="text-lg">🥉</span>}
                                        {i > 2 && <span className="text-gray-400 font-bold ml-1">{i + 1}.</span>}
                                        {cashier.name}
                                    </span>
                                    <div className="text-right">
                                        <div className="font-black text-gray-700 dark:text-gray-300">{formatCurrency(cashier.revenue)}</div>
                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{cashier.count} tickets générés</div>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(cashier.revenue / maxCashierRevenue) * 100}%` }}
                                        className={`h-3 rounded-full ${i === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                                    ></motion.div>
                                </div>
                            </div>
                        ))}
                        {topCashiers.length === 0 && <p className="text-gray-500 text-sm">Aucune donnée de caissier.</p>}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
