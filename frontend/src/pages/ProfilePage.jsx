import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { FiUser, FiMail, FiPhone, FiCalendar, FiClock, FiShield, FiLock, FiEdit2, FiActivity, FiX, FiSend } from 'react-icons/fi';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile, changePassword, resendVerificationEmail } from '../api/auth';
import { distributePrimes } from '../api/users';
import { getProfile } from '../api/auth';
import { calculateNetSalary } from '../utils/salaryCalculator';

const ProfilePage = () => {
    const { user, updateUser } = useAuth();
    const { t } = useTranslation();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [editFormData, setEditFormData] = useState({ fullName: '', email: '', phone: '', age: '' });
    const [passwordFormData, setPasswordFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [primeData, setPrimeData] = useState({ amount: '', reason: '' });
    const [isDistributing, setIsDistributing] = useState(false);
    const [isSendingVerification, setIsSendingVerification] = useState(false);

    const handleResendVerification = async () => {
        if (!user?.email || isSendingVerification) return;
        setIsSendingVerification(true);
        try {
            const result = await resendVerificationEmail(user.email);
            alert(result.message || 'E-mail de vérification envoyé !');
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Échec de l\'envoi';
            alert(`Erreur: ${msg}`);
        } finally {
            setIsSendingVerification(false);
        }
    };

    const handleOpenEdit = () => {
        setEditFormData({
            fullName: user?.fullName || '',
            email: user?.email || '',
            phone: user?.phone || '',
            age: user?.age || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await updateProfile(editFormData);
            updateUser(res.user);
            setIsEditModalOpen(false);
            alert(res.message || t('profileUpdatedSuccess'));
        } catch (error) {
            alert(error.response?.data?.message || t('failedToUpdateProfile'));
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
            return alert(t('passwordsDoNotMatch'));
        }
        try {
            await changePassword({
                currentPassword: passwordFormData.currentPassword,
                newPassword: passwordFormData.newPassword
            });
            setIsPasswordModalOpen(false);
            setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            alert(t('passwordChangedSuccess'));
        } catch (error) {
            alert(error.response?.data?.message || t('failedToChangePassword'));
        }
    };

    const handleDistributePrime = async () => {
        if (!primeData.amount || isNaN(primeData.amount) || parseFloat(primeData.amount) <= 0) {
            return alert(t('pleaseEnterValidAmount', 'Veuillez saisir un montant valide.'));
        }
        setIsDistributing(true);
        try {
            const res = await distributePrimes({ 
                amount: parseFloat(primeData.amount), 
                reason: primeData.reason 
            });
            
            // Show detailed success message
            alert(res.message);
            
            // Refresh profile to update stats
            const updatedProfile = await getProfile();
            updateUser(updatedProfile);
            setPrimeData({ amount: '', reason: '' });
        } catch (error) {
            const errorMsg = error.response?.data?.message || t('failedToDistributePrime', 'Échec de la distribution.');
            alert(`Erreur: ${errorMsg}`);
            console.error("Distribution Error:", error);
        } finally {
            setIsDistributing(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
        } catch {
            return 'Invalid Date';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'TND' }).format(amount);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('profile') || 'My Profile'}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t('managePersonalInfo')}</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Personal Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm dark:shadow-xl transition-colors">
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FiUser className="text-blue-500" /> {t('personalInformation')}
                            </h3>
                            <button
                                onClick={handleOpenEdit}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors text-sm font-medium">
                                <FiEdit2 /> {t('editProfile')}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-8 items-start mb-8 pb-8 border-b border-gray-100 dark:border-gray-800">
                            {/* Profile Picture */}
                            <div className="relative group cursor-pointer">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-blue-500/20">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <FiEdit2 className="text-white text-xl" />
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.fullName || user?.username}</h4>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user?.status === 'Disabled' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'}`}>
                                        {user?.status || t('active')}
                                    </span>
                                </div>
                                <p className="text-blue-600 dark:text-blue-400 font-medium capitalize mb-4">{user?.role}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('username')}</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        <FiUser />
                                    </div>
                                    {user?.username}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('emailAddress')}</label>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                            <FiMail />
                                        </div>
                                        <span>{user?.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('phoneNumber')}</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        <FiPhone />
                                    </div>
                                    {user?.phone || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('age') || 'Age'}</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        <FiUser />
                                    </div>
                                    {user?.age || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('accountCreated')}</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        <FiCalendar />
                                    </div>
                                    {formatDate(user?.createdAt)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* New Card: Work & Performance */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm dark:shadow-xl transition-colors">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FiActivity className="text-orange-500" /> {t('workAndPerformance')}
                            </h3>
                        </div>

                        {/* TODO: prime/bonus system */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                {user?.role === 'cashier' ? (
                                    <>
                                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                                            {t('netSalaryThisMonth', 'Net Salary This Month')}
                                        </label>
                                        {(() => {
                                            const salaryData = calculateNetSalary(
                                                user?.stats?.monthlySalary,
                                                user?.stats?.absences,
                                                user?.workingDays,
                                                user?.stats?.workedDays
                                            );
                                            return (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center text-green-600">
                                                            💰
                                                        </div>
                                                        <span className="text-gray-900 dark:text-white font-black text-lg">
                                                            {formatCurrency(salaryData.netSalary, null, false)}
                                                        </span>
                                                        <FiLock className="text-gray-400 ml-auto" size={14} title="Auto-calculated" />
                                                    </div>
                                                    <div className="pl-11 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                                                        <div className="flex justify-between gap-4">
                                                            <span>{t('expectedMonthlySalary', 'Expected Monthly')}:</span>
                                                            <span className="font-medium text-gray-400 line-through">{formatCurrency(salaryData.expectedMonthlySalary, null, false)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span>{t('dailySalary', 'Daily Salary')}:</span>
                                                            <span className="font-medium">{formatCurrency(salaryData.dailySalary, null, false)}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span>{t('workedDays')}:</span>
                                                            <span className="font-medium">{user?.stats?.workedDays || 0} {t('days')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <>
                                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('monthlySalary')}</label>
                                        <div className="flex items-center gap-3 text-gray-900 dark:text-white font-black text-lg">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                                💰
                                            </div>
                                            {formatCurrency(user?.stats?.monthlySalary || 0, null, false)}
                                        </div>
                                    </>
                                )}
                            </div>

                            {user.role === 'cashier' && (
                                <div>
                                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('shiftSchedule')}</label>
                                    <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                            <FiClock />
                                        </div>
                                        {user.shiftSchedule || t('notSpecified', 'Non spécifié')}
                                        <FiLock className="text-gray-400 ml-auto" size={14} title="Editable by admin only" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('workedDays')}</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        📅
                                    </div>
                                    {user?.stats?.workedDays || 0} {t('days')}
                                    <FiLock className="text-gray-400 ml-auto" size={14} title="Auto-calculated" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('absences')}</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        ❌
                                    </div>
                                    {user?.stats?.absences || 0} {t('days')}
                                    <FiLock className="text-gray-400 ml-auto" size={14} title="Auto-calculated" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('dailyRevenue')}</label>
                                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 font-bold">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        📈
                                    </div>
                                    {formatCurrency(user?.stats?.dailyRevenue || 0)}
                                    <FiLock className="text-gray-400 ml-auto" size={14} title="Auto-calculated" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('totalMonthlySales')}</label>
                                <div className="flex items-center gap-3 text-green-600 dark:text-green-400 font-bold">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        🏆
                                    </div>
                                    {formatCurrency(user?.stats?.totalSalesMonth || 0)}
                                    <FiLock className="text-gray-400 ml-auto" size={14} title="Auto-calculated" />
                                </div>
                            </div>
                        </div>

                        {/* Primes Received Section */}
                        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6 flex items-center gap-2">
                                <FiActivity size={14} /> {t('primesReceived')}
                            </h4>

                            {user.role === 'admin' ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Montant Prime (TND)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                                                value={primeData.amount}
                                                onChange={e => setPrimeData({ ...primeData, amount: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Raison / Occasion</label>
                                            <input
                                                type="text"
                                                placeholder="ex: Eid Al-Fitr 2026"
                                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                                value={primeData.reason}
                                                onChange={e => setPrimeData({ ...primeData, reason: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-4">
                                        <button
                                            onClick={handleDistributePrime}
                                            disabled={isDistributing}
                                            className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black rounded-2xl shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isDistributing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🚀 Distribute to All'}
                                        </button>
                                        
                                        <div className="p-4 bg-orange-50/50 dark:bg-orange-500/5 rounded-2xl border border-orange-100 dark:border-orange-500/10">
                                            <p className="text-xs text-orange-600 dark:text-orange-400 font-bold flex items-center gap-2">
                                                <FiActivity size={14} /> 
                                                {user?.stats?.lastSystemDistribution 
                                                    ? `Last distributed: ${formatCurrency(user.stats.lastSystemDistribution.amount, null, false)} — ${user.stats.lastSystemDistribution.reason} (${formatDate(user.stats.lastSystemDistribution.distributedAt)})`
                                                    : 'No prime distributed yet'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Dernière Prime</label>
                                        <p className="text-gray-900 dark:text-white font-bold flex items-center gap-2">
                                            {user?.stats?.lastPrime 
                                                ? `${formatCurrency(user.stats.lastPrime.amount, null, false)} — ${user.stats.lastPrime.reason} (${formatDate(user.stats.lastPrime.distributedAt)})`
                                                : 'No prime received yet'
                                            }
                                            <FiLock className="text-gray-400 ml-auto" size={12} />
                                        </p>
                                    </div>
                                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Total Primes Cette Année</label>
                                        <p className="text-green-600 dark:text-green-400 font-black text-xl flex items-center gap-2">
                                            {formatCurrency(user?.stats?.totalPrimesYear || 0, null, false)}
                                            <FiLock className="text-gray-400 ml-auto" size={12} />
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Security */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm dark:shadow-xl transition-colors">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                            <FiShield className="text-purple-500" /> {t('security')}
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('lastLogin')}</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                        <FiClock />
                                    </div>
                                    {formatDate(user?.lastLogin)}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">{t('activeSessions')}</label>
                                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-500">
                                        <FiActivity />
                                    </div>
                                    {t('activeSessionCurrent')}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-purple-500/20">
                                <FiLock /> {t('changePassword')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FiEdit2 className="text-blue-500" /> {t('editProfile')}
                                </h3>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                    <FiX size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('fullName')}</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:border-blue-500 outline-none transition-all"
                                        value={editFormData.fullName}
                                        onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('age') || 'Age'}</label>
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:border-blue-500 outline-none transition-all"
                                            value={editFormData.age}
                                            onChange={e => setEditFormData({ ...editFormData, age: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('phoneNumber')}</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:border-blue-500 outline-none transition-all"
                                            value={editFormData.phone}
                                            onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('emailAddress')}</label>
                                    <input
                                        type="email"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:border-blue-500 outline-none transition-all"
                                        value={editFormData.email}
                                        onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                    />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        {t('cancel')}
                                    </button>
                                    <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all">
                                        {t('saveChanges')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Change Password Modal */}
            <AnimatePresence>
                {isPasswordModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FiLock className="text-purple-500" /> {t('changePassword')}
                                </h3>
                                <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                    <FiX size={24} />
                                </button>
                            </div>
                            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('currentPassword')}</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 dark:focus:border-purple-500 outline-none transition-all"
                                        value={passwordFormData.currentPassword}
                                        onChange={e => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })}
                                    />
                                </div>
                                <div className="h-px bg-gray-200 dark:bg-gray-800 my-4"></div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('newPassword')}</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 dark:focus:border-purple-500 outline-none transition-all"
                                        value={passwordFormData.newPassword}
                                        onChange={e => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('confirmNewPassword')}</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 dark:focus:border-purple-500 outline-none transition-all"
                                        value={passwordFormData.confirmPassword}
                                        onChange={e => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
                                    />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-3 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        {t('cancel')}
                                    </button>
                                    <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all">
                                        {t('updatePassword')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default ProfilePage;
