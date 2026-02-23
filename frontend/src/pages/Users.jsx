import { useState, useEffect } from 'react';
import { FiPlus, FiUser, FiUserCheck, FiShield } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { registerUser } from '../api/auth';
import { getUsers, updateUser, deleteUser } from '../api/users';
import CashierTable from '../components/CashierTable';
import EditUserModal from '../components/EditUserModal';
import { useTranslation } from 'react-i18next';

const Users = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({ username: '', password: '', role: 'cashier', fullName: '' });
    const [message, setMessage] = useState(null);
    const [users, setUsers] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            await registerUser(formData);
            setMessage({ type: 'success', text: t('userRegisteredSuccess') });
            setFormData({ username: '', password: '', role: 'cashier', fullName: '' });
            fetchUsers(); // Refresh list
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
                setMessage({ type: 'success', text: 'User deleted successfully!' });
                fetchUsers();
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to delete user' });
            }
        }
    };

    const handleUpdate = async (id, data) => {
        try {
            await updateUser(id, data);
            fetchUsers();
            setIsEditModalOpen(false);
            setMessage({ type: 'success', text: 'User updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update user' });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">{t('userManagement')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Register Form */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl h-fit">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><FiUserCheck size={24} /></div>
                        <h3 className="text-xl font-bold text-white">{t('registerNewUser')}</h3>
                    </div>

                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('fullName')}</label>
                            <div className="relative">
                                <FiUser className="absolute left-3 top-3 text-gray-500" />
                                <input required type="text" className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"
                                    value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('username')}</label>
                            <div className="relative">
                                <FiUser className="absolute left-3 top-3 text-gray-500" />
                                <input required type="text" className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"
                                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('password')}</label>
                            <input required type="password" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"
                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">{t('role')}</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                    <input type="radio" name="role" value="cashier" checked={formData.role === 'cashier'} onChange={e => setFormData({ ...formData, role: 'cashier' })} />
                                    {t('cashier')}
                                </label>
                                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                    <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={e => setFormData({ ...formData, role: 'admin' })} />
                                    <span className="flex items-center gap-1 text-purple-400"><FiShield size={14} /> {t('admin')}</span>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
                            {t('createAccount')}
                        </button>
                    </form>
                </div>

                {/* Cashier Table */}
                <CashierTable users={users} onEdit={handleEdit} onDelete={handleDelete} />
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
