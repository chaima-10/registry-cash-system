import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiArrowLeft, FiCheckCircle, FiShield } from 'react-icons/fi';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../api/auth';
import { useTranslation } from 'react-i18next';

const ForgotPassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: Code & New Password
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await forgotPassword(email);
            setMessage({ type: 'success', text: 'Un code de vérification a été envoyé à votre email.' });
            setStep(2);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'envoi du code.' });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            await resetPassword({ email, code, newPassword });
            setMessage({ type: 'success', text: 'Mot de passe réinitialisé avec succès ! Redirection...' });
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Code invalide ou expiré.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white relative overflow-hidden px-4">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl"
            >
                <Link to="/login" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6 transition-colors">
                    <FiArrowLeft className="mr-2" /> Retour à la connexion
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {step === 1 ? 'Mot de passe oublié' : 'Réinitialisation'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {step === 1 
                            ? 'Entrez votre email pour recevoir un code de récupération.' 
                            : 'Entrez le code reçu par email et votre nouveau mot de passe.'}
                    </p>
                </div>

                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-3 ${
                            message.type === 'success' 
                                ? 'bg-green-500/20 border border-green-500/50 text-green-200' 
                                : 'bg-red-500/20 border border-red-500/50 text-red-200'
                        }`}
                    >
                        {message.type === 'success' ? <FiCheckCircle /> : <FiShield />}
                        {message.text}
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.form
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleSendCode}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Adresse Email</label>
                                <div className="relative">
                                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:border-blue-500 outline-none transition-all text-white"
                                        placeholder="votre@email.com"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                {loading ? 'Envoi...' : 'Envoyer le code'}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleResetPassword}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Code de vérification</label>
                                <div className="relative">
                                    <FiShield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        maxLength="6"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:border-blue-500 outline-none transition-all text-white tracking-[0.5em] font-bold text-center"
                                        placeholder="000000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 ml-1">Nouveau mot de passe</label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:border-blue-500 outline-none transition-all text-white"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                {loading ? 'Traitement...' : 'Réinitialiser le mot de passe'}
                            </button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
