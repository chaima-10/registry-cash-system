import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiCalendar, FiUser, FiCheckCircle, FiXCircle, FiFilter, FiDownload, 
    FiSearch, FiRefreshCw, FiClock, FiAlertCircle 
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

const AttendanceTracker = () => {
    const { t } = useTranslation();
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, present, absent
    const [searchTerm, setSearchTerm] = useState('');
    const [days, setDays] = useState(30);

    useEffect(() => {
        fetchAttendance();
    }, [days]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/attendance/all?days=${days}`);
            setAttendanceData(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching attendance:", error);
        } finally {
            setLoading(false);
        }
    };

    const triggerCheck = async () => {
        if (!window.confirm(t('confirmTriggerCheck', 'Do you really want to trigger manual verification for today?'))) return;
        try {
            await api.post('/attendance/trigger-check');
            setFilter('all');
            fetchAttendance();
        } catch (error) {
            console.error("Error triggering check:", error);
        }
    };

    const filteredData = attendanceData.filter(record => {
        const matchesFilter = filter === 'all' || record.status?.toLowerCase() === filter;
        const matchesSearch = (record.user?.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                             (record.user?.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const stats = {
        present: attendanceData.filter(r => r.status === 'PRESENT').length,
        absent: attendanceData.filter(r => r.status === 'ABSENT').length,
        total: attendanceData.length
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <FiRefreshCw className="animate-spin text-4xl text-blue-500" />
        </div>
    );

    return (
        <div className="space-y-8 mt-12 pt-12 border-t border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                        {t('attendanceTracking', 'Suivi de Présence')}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-widest">
                        {t('attendanceSubtitle', 'Gestion des entrées et absences du personnel')}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={triggerCheck}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30"
                    >
                        <FiRefreshCw /> {t('triggerCheck', 'Vérifier Maintenant')}
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl lg:rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalRecords', 'Total Enregistrements')}</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl text-xl">
                            <FiCalendar />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl lg:rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalPresent', 'Total Présents')}</p>
                            <h3 className="text-2xl font-black text-emerald-600">{stats.present}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl text-xl">
                            <FiCheckCircle />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl lg:rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalAbsent', 'Total Absents')}</p>
                            <h3 className="text-2xl font-black text-red-600">{stats.absent}</h3>
                        </div>
                        <div className="p-3 bg-red-500/10 text-red-600 rounded-xl text-xl">
                            <FiXCircle />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl lg:rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('totalHours', 'Total Hours')}</p>
                            <h3 className="text-2xl font-black text-blue-600">
                                {attendanceData.reduce((sum, r) => sum + Number(r.totalHours || 0), 0).toFixed(1)}h
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl text-xl">
                            <FiClock />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-gray-900 p-6 rounded-2xl lg:rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="relative w-full lg:w-96">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={t('searchEmployee', 'Rechercher un employé...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    />
                </div>
                
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                        {['all', 'present', 'absent'].map(f => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                {t(f)}
                            </button>
                        ))}
                    </div>

                    <select 
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase px-4 py-2 tracking-widest outline-none"
                    >
                        <option value={7}>{t('last7Days', '7 Derniers Jours')}</option>
                        <option value={30}>{t('last30Days', '30 Derniers Jours')}</option>
                        <option value={90}>{t('last90Days', '90 Derniers Jours')}</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl lg:rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('employee', 'Employé')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('role', 'Rôle')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('date', 'Date')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('clockIn', 'Entrée')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('clockOut', 'Sortie')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('duration', 'Durée')}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('status', 'Statut')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                            <AnimatePresence>
                                {filteredData.map((record) => (
                                    <motion.tr 
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        key={`${record.userId}-${record.date}`} 
                                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/10">
                                                    {record.user?.username?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{record.user?.fullName || record.user?.username}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold tracking-tight">@{record.user?.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${record.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {record.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                             <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                 <FiClock className="text-blue-500" />
                                                 <span className="text-xs font-bold">{new Date(record.date).toLocaleDateString()}</span>
                                             </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {record.clockIn ? new Date(record.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                                {record.clockOut ? new Date(record.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                                {record.totalHours ? `${parseFloat(record.totalHours).toFixed(2)}h` : '-'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl w-fit ${
                                                record.status === 'PRESENT' 
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' 
                                                : 'bg-red-50 text-red-600 dark:bg-red-500/10'
                                            }`}>
                                                {record.status === 'PRESENT' ? <FiCheckCircle /> : <FiXCircle />}
                                                <span className="text-[10px] font-black uppercase tracking-widest">{t(record.status?.toLowerCase() || '')}</span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredData.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <FiAlertCircle className="text-2xl text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-black uppercase text-xs tracking-widest">{t('noAttendanceRecords', 'Aucun enregistrement trouvé')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceTracker;
