import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmail } from '../api/auth';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiLoader, FiArrowRight } from 'react-icons/fi';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('');

    const hasAttempted = useRef(false);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('Jeton de vérification manquant.');
            return;
        }

        if (hasAttempted.current) return;
        hasAttempted.current = true;

        const performVerification = async () => {
            try {
                await verifyEmail(token);
                setStatus('success');
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'La vérification a échoué.');
            }
        };

        performVerification();
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white relative overflow-hidden px-4">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl text-center"
            >
                {status === 'loading' && (
                    <div className="py-10">
                        <FiLoader className="w-16 h-16 mx-auto mb-6 text-blue-400 animate-spin" />
                        <h2 className="text-2xl font-bold mb-2">Vérification en cours...</h2>
                        <p className="text-gray-400">Veuillez patienter pendant que nous validons votre email.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-10">
                        <FiCheckCircle className="w-16 h-16 mx-auto mb-6 text-green-400" />
                        <h2 className="text-2xl font-bold mb-2">Email vérifié !</h2>
                        <p className="text-gray-400 mb-8">Votre compte est maintenant actif. Vous pouvez vous connecter.</p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all"
                        >
                            Aller à la connexion <FiArrowRight className="ml-2" />
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-10">
                        <FiXCircle className="w-16 h-16 mx-auto mb-6 text-red-400" />
                        <h2 className="text-2xl font-bold mb-2">Échec de la vérification</h2>
                        <p className="text-gray-400 mb-8">{message}</p>
                        <Link
                            to="/login"
                            className="inline-flex items-center text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Retour à la connexion
                        </Link>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default VerifyEmail;
