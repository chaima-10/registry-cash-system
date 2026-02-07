import { useState } from 'react';
import { FiPlus, FiUser, FiUserCheck, FiShield } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { registerUser } from '../api/auth';

const Users = () => {
    const [formData, setFormData] = useState({ username: '', password: '', role: 'cashier' });
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        try {
            await registerUser(formData);
            setMessage({ type: 'success', text: 'User registered successfully!' });
            setFormData({ username: '', password: '', role: 'cashier' });
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Registration failed' });
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">User Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Register Form */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400"><FiUserCheck size={24} /></div>
                        <h3 className="text-xl font-bold text-white">Register New User</h3>
                    </div>

                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                            <div className="relative">
                                <FiUser className="absolute left-3 top-3 text-gray-500" />
                                <input required type="text" className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"
                                    value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                            <input required type="password" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"
                                value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                    <input type="radio" name="role" value="cashier" checked={formData.role === 'cashier'} onChange={e => setFormData({ ...formData, role: 'cashier' })} />
                                    Cashier
                                </label>
                                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                    <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={e => setFormData({ ...formData, role: 'admin' })} />
                                    <span className="flex items-center gap-1 text-purple-400"><FiShield size={14} /> Admin</span>
                                </label>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
                            Create Account
                        </button>
                    </form>
                </div>

                {/* User List Info (Placeholder) */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center text-gray-500">
                    <FiUser size={48} className="mb-4 opacity-20" />
                    <p>A full user list table typically requires a dedicated GET /users endpoint.</p>
                    <p className="text-sm mt-2">Currently, you can use the form on the left to create users.</p>
                </div>
            </div>
        </div>
    );
};

export default Users;
