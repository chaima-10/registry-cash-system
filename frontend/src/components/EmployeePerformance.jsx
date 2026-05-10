import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiUsers, FiShoppingCart, FiDollarSign, FiClock,
    FiArrowUpRight, FiArrowDownRight, FiActivity, FiRefreshCw,
    FiChevronRight, FiUser, FiCheckCircle, FiXCircle, FiCalendar,
    FiBriefcase, FiZap
} from 'react-icons/fi';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import api from '../api/axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

// Helper components for consistency
const StatCard = ({ label, value, subValue, icon: Icon, color, i }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between h-full group hover:shadow-xl transition-all duration-500"
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`p-4 rounded-2xl bg-opacity-10 text-opacity-100`} style={{ backgroundColor: `${color}1A` }}>
                <Icon size={24} style={{ color: color }} />
            </div>
            {subValue && (
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${subValue.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {subValue}
                </span>
            )}
        </div>
        <div>
            <div className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</div>
            <div className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</div>
        </div>
    </motion.div>
);

const Badge = ({ label, color, bg }) => (
    <span 
        className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border"
        style={{ color, backgroundColor: bg, borderColor: color + '20' }}
    >
        {label}
    </span>
);

const Avatar = ({ name, size = 32 }) => (
    <div 
        className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black uppercase shadow-lg"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
        {name?.charAt(0)}
    </div>
);

const EmployeePerformance = () => {
    const { t } = useTranslation();
    const { formatCurrency } = useAuth();
    const [users, setUsers] = useState([]);
    const [sales, setSales] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [selectedRowKey, setSelectedRowKey] = useState(null); // Format: userId-weekStart

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, salesRes, attRes] = await Promise.all([
                api.get('/users').catch(() => ({ data: [] })),
                api.get('/sales').catch(() => ({ data: [] })),
                api.get('/attendance/all?days=90').catch(() => ({ data: [] })) // Fixed endpoint
            ]);
            setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.users || []);
            setSales(Array.isArray(salesRes.data) ? salesRes.data : salesRes.data?.sales || []);
            setAttendance(Array.isArray(attRes.data) ? attRes.data : attRes.data?.history || []);
        } catch (error) {
            console.error("Failed to fetch performance data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Date Helpers
    const getWeekStart = (dateStr) => {
        const date = new Date(dateStr);
        const day = date.getDay() || 7;
        date.setDate(date.getDate() - day + 1);
        return date.toISOString().split('T')[0];
    };

    const getWeekEnd = (startStr) => {
        const date = new Date(startStr);
        date.setDate(date.getDate() + 6);
        return date.toISOString().split('T')[0];
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    };

    // Performance Transformation Logic
    const performanceData = useMemo(() => {
        const groups = new Map();

        // 1. Filter users by role
        const filteredUsers = roleFilter === 'ALL' ? users : users.filter(u => u.role === roleFilter);
        const userIds = new Set(filteredUsers.map(u => u.id));

        // 2. Group Attendance by User & Week
        attendance.forEach(record => {
            if (!userIds.has(record.userId)) return;
            const weekStart = getWeekStart(record.date);
            const key = `${record.userId}-${weekStart}`;
            
            if (!groups.has(key)) {
                const user = users.find(u => u.id === record.userId);
                groups.set(key, {
                    key,
                    userId: record.userId,
                    userName: user?.fullName || user?.username || 'Unknown',
                    weekStart,
                    weekEnd: getWeekEnd(weekStart),
                    hours: 0,
                    transactions: 0,
                    revenue: 0,
                    days: [],
                    role: user?.role,
                    status: 'Valide'
                });
            }
            const group = groups.get(key);
            group.hours += Number(record.totalHours || 0);
            group.days.push({
                date: record.date.split('T')[0],
                status: record.status,
                hours: Number(record.totalHours || 0),
                type: 'ATTENDANCE'
            });
        });

        // 3. Integrate Sales Data
        sales.forEach(sale => {
            if (!userIds.has(sale.userId)) return;
            const weekStart = getWeekStart(sale.createdAt);
            const key = `${sale.userId}-${weekStart}`;

            if (!groups.has(key)) {
                // If no attendance record, we still track sales activity
                const user = users.find(u => u.id === sale.userId);
                groups.set(key, {
                    key,
                    userId: sale.userId,
                    userName: user?.fullName || user?.username || 'Unknown',
                    weekStart,
                    weekEnd: getWeekEnd(weekStart),
                    hours: 0,
                    transactions: 0,
                    revenue: 0,
                    days: [],
                    role: user?.role,
                    status: 'Valide'
                });
            }
            const group = groups.get(key);
            group.transactions += 1;
            group.revenue += Number(sale.totalAmount || 0);
            
            // Track daily activity breakdown
            const dateStr = sale.createdAt.split('T')[0];
            let day = group.days.find(d => d.date === dateStr);
            if (!day) {
                day = { date: dateStr, status: 'PRESENT', hours: 0, transactions: 0, revenue: 0, type: 'SALE' };
                group.days.push(day);
            }
            day.transactions = (day.transactions || 0) + 1;
            day.revenue = (day.revenue || 0) + Number(sale.totalAmount || 0);
        });

        return Array.from(groups.values()).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    }, [users, sales, attendance, roleFilter]);

    const stats = useMemo(() => {
        const activeCount = users.filter(u => u.status === 'Active').length;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const weeklySales = sales.filter(s => new Date(s.createdAt) >= weekAgo);
        const weeklyRevenue = weeklySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const pendingApprovals = performanceData.filter(p => p.status === 'En attente').length;

        return [
            { label: t('activeEmployees', 'Active Employees'), value: activeCount, icon: FiUsers, color: '#6366f1' },
            { label: t('weeklyTransactions', 'Weekly Transactions'), value: weeklySales.length, icon: FiShoppingCart, color: '#f59e0b', subValue: '+8%' },
            { label: t('totalRevenueGenerated', 'Total Revenue'), value: formatCurrency(weeklyRevenue), icon: FiDollarSign, color: '#10b981', subValue: '+12%' },
            { label: t('pendingApprovals', 'Pending Approvals'), value: pendingApprovals, icon: FiBriefcase, color: '#8b5cf6' }
        ];
    }, [users, sales, performanceData, formatCurrency, t]);

    const selectedGroup = useMemo(() => {
        return performanceData.find(p => p.key === selectedRowKey) || null;
    }, [performanceData, selectedRowKey]);

    const dailyActivityData = useMemo(() => {
        if (!selectedGroup) return [];
        // Map days to a chart-friendly format
        return selectedGroup.days.sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
            name: new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short' }),
            revenue: d.revenue || 0,
            transactions: d.transactions || 0,
            hours: d.hours || 0
        }));
    }, [selectedGroup]);

    const getStatusStyles = (status) => {
        switch(status) {
            case 'Valide': return { color: '#059669', bg: 'rgba(5,150,105,0.1)' };
            case 'En attente': return { color: '#d97706', bg: 'rgba(217,119,6,0.1)' };
            case 'Rejete': return { color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
            default: return { color: '#64748b', bg: 'rgba(100,116,139,0.1)' };
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                        {t('employeePerformance', 'Employee Performance')}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">
                        {t('performanceSubtitle', 'Track cashier activity, revenue generated, and shift compliance.')}
                    </p>
                </div>
                <button 
                    onClick={fetchData}
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                >
                    <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    {t('refresh', 'Refresh')}
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => <StatCard key={s.label} {...s} i={i} />)}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                {[
                    { id: 'ALL', label: t('allEmployees', 'Tous') },
                    { id: 'cashier', label: t('cashiers', 'Caissiers') },
                    { id: 'admin', label: t('admins', 'Admins') }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => { setRoleFilter(f.id); setSelectedRowKey(null); }}
                        className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 ${
                            roleFilter === f.id 
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-lg' 
                            : 'bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-8 items-start">
                {/* Main Table */}
                <div className={`col-span-12 ${selectedRowKey ? 'lg:col-span-8' : ''} transition-all duration-500`}>
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">{t('employee', 'Employé')}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">{t('week', 'Semaine')}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">{t('transactions', 'Trans.')}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">{t('revenue', 'Revenu')}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">{t('workedHours', 'Heures')}</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">{t('status', 'Statut')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {performanceData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center opacity-20">
                                                    <FiActivity size={48} className="mb-4" />
                                                    <p className="text-sm font-bold uppercase tracking-widest">{t('noActivity', 'Aucune activité')}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        performanceData.map((row, idx) => {
                                            const statusStyle = getStatusStyles(row.status);
                                            const isSelected = selectedRowKey === row.key;
                                            return (
                                                <motion.tr
                                                    key={row.key}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.02 }}
                                                    onClick={() => setSelectedRowKey(isSelected ? null : row.key)}
                                                    className={`cursor-pointer transition-all duration-300 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                                >
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <Avatar name={row.userName} size={36} />
                                                            <div>
                                                                <div className="font-black text-gray-900 dark:text-white text-sm tracking-tighter leading-none mb-1">{row.userName}</div>
                                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{row.role}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                        {formatDate(row.weekStart)} - {formatDate(row.weekEnd)}
                                                    </td>
                                                    <td className="px-6 py-5 text-center font-black text-gray-900 dark:text-white text-sm">
                                                        {row.transactions}
                                                    </td>
                                                    <td className="px-6 py-5 text-center font-black text-green-600 dark:text-green-400 text-sm">
                                                        {formatCurrency(row.revenue)}
                                                    </td>
                                                    <td className="px-6 py-5 text-center font-black text-gray-900 dark:text-white text-sm">
                                                        {row.hours.toFixed(1)}h
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                        <Badge label={row.status} color={statusStyle.color} bg={statusStyle.bg} />
                                                    </td>
                                                </motion.tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Detail Section */}
                <AnimatePresence>
                    {selectedGroup && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="col-span-12 lg:col-span-4 space-y-6"
                        >
                            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl p-8 overflow-hidden sticky top-8">
                                <div className="flex justify-between items-start mb-8">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <FiActivity className="text-orange-500" /> Work & Performance
                                    </h3>
                                    <button onClick={() => setSelectedRowKey(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        <FiXCircle size={24} />
                                    </button>
                                </div>

                                {(() => {
                                    const user = users.find(u => u.id === selectedGroup.userId);
                                    if (!user) return null;
                                    return (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">{t('monthlySalary', 'Monthly Salary')}</label>
                                                    <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                                        <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white text-lg">💰</div>
                                                        <span className="text-gray-900 dark:text-white font-black text-xl">{formatCurrency(user.monthlySalary, null, false)}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-1">{t('workedDays', 'Worked Days')}</label>
                                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-sm">
                                                            <FiCalendar className="text-blue-500" /> {user.workedDays || 0} {t('days', 'days')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-1">{t('absences', 'Absences')}</label>
                                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold text-sm">
                                                        <FiXCircle className="text-red-500" /> {user.absences || 0} {t('days', 'days')}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-1">{t('dailyRevenue', 'Daily Revenue')}</label>
                                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                                                        <FiActivity className="text-blue-500" /> {formatCurrency(user.dailyRevenue || 0)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-1">{t('totalMonthlySales', 'Total Monthly Sales')}</label>
                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm">
                                                    <FiCheckCircle className="text-green-500" /> {formatCurrency(selectedGroup.revenue || 0)}
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2">
                                                    <FiZap size={14} /> {t('primesReceived', 'Primes Received')}
                                                </h4>
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Montant Prime (TND)</label>
                                                        <input type="number" placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-bold text-sm" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Raison / Occasion</label>
                                                        <input type="text" placeholder="ex: Eid Al-Fitr" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-medium text-sm" />
                                                    </div>
                                                </div>
                                                <button className="w-full mt-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black rounded-xl shadow-lg shadow-orange-500/25 transition-all text-xs flex items-center justify-center gap-2">
                                                    🚀 Distribute
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default EmployeePerformance;
