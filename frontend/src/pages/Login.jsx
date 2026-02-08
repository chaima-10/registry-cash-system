import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';

import { useTranslation } from 'react-i18next';

const Login = () => {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            // Axios error handling
            setError(err.response?.data?.message || t('loginFailed'));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-50 animate-blob animation-delay-2000"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl"
            >
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{t('welcomeBack')}</h1>
                    <p className="text-gray-400">{t('signInAccess')}</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">{t('username')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <FiUser />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-500 text-white"
                                placeholder={t('enterUsername')}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">{t('password')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <FiLock />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-500 text-white"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <FiLogIn /> {t('signInAction')}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
