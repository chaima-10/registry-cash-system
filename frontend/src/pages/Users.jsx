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
        <div className="space-y-6 px-2 sm:px-4">
            <h2 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{t('userManagement')}</h2>

            <div className="grid grid-cols-12 gap-8 items-start">
                
                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl lg:rounded-[2.5rem] p-6 lg:p-8 shadow-sm transition-colors lg:sticky lg:top-6 h-fit order-2 lg:order-1">
                    <div className="flex items-center gap-3 mb-6 lg:mb-8">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400"><FiUserCheck size={24} /></div>
                        <h3 className="text-lg lg:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{t('registerNewUser')}</h3>
                    </div>

                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-6 p-4 rounded-xl text-xs font-bold uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20'}`}
                        >
                            {message.text}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t('fullName')}</label>
                            <div className="relative">
                                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input required type="text" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold text-sm"
                                    value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t('username')}</label>
                            <div className="relative">
                                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input required type="text" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold text-sm"
                                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t('password')}</label>
                            <input required type="password" className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-bold text-sm"
                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">{t('dailySalary', 'Daily Salary')}</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 font-black text-[10px]">TND</span>
                                <input required type="number" step="0.001" className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-black text-sm"
                                    value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1 mb-2">{t('role')}</label>
                            <div className="flex gap-4">
                                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer font-bold text-xs group transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/50 dark:has-[:checked]:bg-blue-500/10">
                                    <input type="radio" name="role" value="cashier" checked={formData.role === 'cashier'} onChange={e => setFormData({ ...formData, role: 'cashier' })} className="hidden" />
                                    <FiUser size={14} className="text-gray-400 group-has-[:checked]:text-blue-500" />
                                    <span className="text-gray-500 group-has-[:checked]:text-blue-600 dark:group-has-[:checked]:text-blue-400">{t('cashier')}</span>
                                </label>
                                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer font-bold text-xs group transition-all has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50/50 dark:has-[:checked]:bg-purple-500/10">
                                    <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={e => setFormData({ ...formData, role: 'admin' })} className="hidden" />
                                    <FiShield size={14} className="text-gray-400 group-has-[:checked]:text-purple-500" />
                                    <span className="text-gray-500 group-has-[:checked]:text-purple-600 dark:group-has-[:checked]:text-purple-400">{t('admin')}</span>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] mt-6 uppercase tracking-widest text-xs">
                            {t('createAccount')}
                        </button>
                    </form>
                </div>

                
                <div className="col-span-12 lg:col-span-8 space-y-8 order-1 lg:order-2">
                    <UserTable 
                        title={`${t('cashiers', 'Cashiers')}`}
                        users={users.filter(u => u.role === 'cashier')} 
                        onEdit={handleEdit} 
                        onDelete={handleDelete} 
                    />
                    <UserTable 
                        title={`${t('admins', 'Administrators')}`}
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
