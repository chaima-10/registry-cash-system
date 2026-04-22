import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiLoader, FiArrowLeft } from 'react-icons/fi';

const EmailVerification = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyToken = async () => {
            const token = searchParams.get('token');
            if (!token) {
                setStatus('error');
                setMessage('Jeton de vérification manquant.');
                return;
            }

            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const response = await axios.get(`${API_URL}/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(response.data.message);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Une erreur est survenue lors de la vérification.');
            }
        };

        verifyToken();
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 text-center border border-gray-100 dark:border-gray-800"
            >
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <FiLoader className="w-16 h-16 text-blue-500 animate-spin mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Vérification en cours...</h2>
                        <p className="text-gray-500 dark:text-gray-400">Veuillez patienter pendant que nous validons votre e-mail.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <FiCheckCircle className="w-12 h-12 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Succès !</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8">{message}</p>
                        <Link 
                            to="/login" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                        >
                            Se connecter
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <FiXCircle className="w-12 h-12 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Erreur</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8">{message}</p>
                        <Link 
                            to="/login" 
                            className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                            <FiArrowLeft /> Retour à la connexion
                        </Link>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default EmailVerification;
