import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { FiUser, FiMail, FiPhone, FiCalendar, FiClock, FiShield, FiLock, FiEdit2, FiActivity, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile, changePassword } from '../api/auth';

const ProfilePage = () => {
    const { user, updateUser } = useAuth();
    const { t } = useTranslation();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [editFormData, setEditFormData] = useState({ fullName: '', email: '', phone: '' });
    const [passwordFormData, setPasswordFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

    const handleOpenEdit = () => {
        setEditFormData({
            fullName: user?.fullName || '',
            email: user?.email || '',
            phone: user?.phone || ''
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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
        } catch {
            return 'Invalid Date';
        }
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
                                        {user?.email && (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user?.isEmailVerified ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400'}`}>
                                                {user?.isEmailVerified ? 'Vérifié' : 'Non vérifié'}
                                            </span>
                                        )}
                                    </div>
                                    {user?.pendingEmail && (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium pl-11">
                                            Changement en attente : {user.pendingEmail} (vérifiez votre boîte mail)
                                        </div>
                                    )}
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">{t('emailAddress')}</label>
                                    <input
                                        type="email"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:border-blue-500 outline-none transition-all"
                                        value={editFormData.email}
                                        onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
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
