import { useState, useEffect } from 'react';
import { FiPlus, FiUser, FiUserCheck, FiShield } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { register } from '../api/auth';
import { getUsers, updateUser, deleteUser } from '../api/users';
import UserTable from '../components/UserTable';
import EditUserModal from '../components/EditUserModal';
import { useTranslation } from 'react-i18next';

const Users = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({ username: '', password: '', role: 'cashier', fullName: '', salary: '', workingDays: '' });
    const [message, setMessage] = useState(null);
    const [users, setUsers] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.message || t('errorFetchingUsers', 'Erreur lors du chargement des utilisateurs.') 
            });
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            await register(formData);
            setMessage({ type: 'success', text: t('userRegisteredSuccess') });
            setFormData({ username: '', password: '', role: 'cashier', fullName: '', salary: '', workingDays: '' });
            fetchUsers(); 
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('registrationFailed') });
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm(t('deleteUserConfirm'))) {
            try {
                await deleteUser(id);
                setMessage({ type: 'success', text: t('userDeletedSuccess') });
                fetchUsers();
            } catch (error) {
                setMessage({ type: 'error', text: t('failedToDeleteUser') });
            }
        }
    };

    const handleUpdate = async (id, data) => {
        try {
            await updateUser(id, data);
            fetchUsers();
            setIsEditModalOpen(false);
            setMessage({ type: 'success', text: t('userUpdatedSuccess') });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || t('failedToUpdateUser') });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white px-2">{t('userManagement')}</h2>

            <div className="grid grid-cols-12 gap-8 items-start">
                
                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-xl h-fit transition-colors sticky top-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400"><FiUserCheck size={24} /></div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('registerNewUser')}</h3>
                    </div>

                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/20' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/20'}`}
                        >
                            {message.text}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('fullName')}</label>
                            <div className="relative">
                                <FiUser className="absolute left-3 top-3 text-gray-400" />
                                <input required type="text" className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-medium"
                                    value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('username')}</label>
                            <div className="relative">
                                <FiUser className="absolute left-3 top-3 text-gray-400" />
                                <input required type="text" className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-medium"
                                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('password')}</label>
                            <input required type="password" className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-medium"
                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('dailySalary', 'Daily Salary')}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-blue-500 font-bold text-xs">TND</span>
                                <input required type="number" step="0.001" className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-medium"
                                
                                    value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} />
                            </div>
                        </div>

                        {/* Working Days removed - now automatic */}

                        <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2">{t('role')}</label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer font-medium group">
                                    <input type="radio" name="role" value="cashier" checked={formData.role === 'cashier'} onChange={e => setFormData({ ...formData, role: 'cashier' })} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                                    {t('cashier')}
                                </label>
                                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer font-medium group">
                                    <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={e => setFormData({ ...formData, role: 'admin' })} className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300" />
                                    <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400"><FiShield size={14} /> {t('admin')}</span>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95 mt-4">
                            {t('createAccount')}
                        </button>
                    </form>
                </div>

                
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <UserTable 
                        title={`${t('userManagement')} - ${t('cashiers', 'Cashiers')}`}
                        users={users.filter(u => u.role === 'cashier')} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                    />
                    <UserTable 
                        title={`${t('userManagement')} - ${t('admins', 'Administrators')}`}
                        users={users.filter(u => u.role === 'admin')} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                    />
                </div>
            </div>

            <EditUserModal
                user={editingUser}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={handleUpdate}
            />
        </div>
    );
};

export default Users;
