import React, { useState, useEffect } from 'react';
import { 
    FiGift, FiUsers, FiCalendar, FiAward, FiPlus, 
    FiTrash2, FiPlay, FiCheckCircle, FiClock, FiTrendingUp 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Giveaways = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [giveaways, setGiveaways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        winnerCount: 1
    });
    const [participating, setParticipating] = useState({});
    const [processing, setProcessing] = useState(false);
    
    // New states for client registration (cashier only)
    const [showRegistrationForm, setShowRegistrationForm] = useState(false);
    const [selectedGiveawayId, setSelectedGiveawayId] = useState(null);
    const [registrationData, setRegistrationData] = useState({
        clientName: '',
        clientSurname: '',
        clientPhone: ''
    });

    // States for Drawing Animation
    const [showDrawModal, setShowDrawModal] = useState(false);
    const [drawingGiveaway, setDrawingGiveaway] = useState(null);
    const [drawStatus, setDrawStatus] = useState('idle'); // idle, drawing, revealed
    const [drawWinners, setDrawWinners] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchGiveaways = async () => {
            try {
                const response = await api.get('/giveaways');
                setGiveaways(response.data || []);
            } catch (error) {
                console.error('Error fetching giveaways:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchGiveaways();
    }, []);

    const handleCreateGiveaway = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const response = await api.post('/giveaways', formData);
            setGiveaways([response.data, ...giveaways]);
            setShowCreateForm(false);
            setFormData({
                title: '', description: '', startDate: '', endDate: '', winnerCount: 1
            });
        } catch (error) {
            console.error('Error creating giveaway:', error);
            alert(error.response?.data?.message || 'Error creating giveaway');
        } finally {
            setProcessing(false);
        }
    };

    const handleParticipate = (giveawayId) => {
        if (user?.role === 'cashier') {
            setSelectedGiveawayId(giveawayId);
            setShowRegistrationForm(true);
        } else {
            submitParticipation(giveawayId);
        }
    };

    const submitParticipation = async (giveawayId, clientData = {}) => {
        // Validation for cashier registration
        if (user?.role === 'cashier') {
            const nameRegex = /^[a-zA-Z\sÀ-ÿ]+$/;
            const phoneRegex = /^\+?[0-9]+$/;

            if (!nameRegex.test(clientData.clientName)) {
                alert(t('nameLetterOnly', 'First Name must contain only letters.'));
                return;
            }
            if (!nameRegex.test(clientData.clientSurname)) {
                alert(t('surnameLetterOnly', 'Surname must contain only letters.'));
                return;
            }

            // Country-specific phone validation (Tunisia +216)
            const phone = clientData.clientPhone.replace(/\s/g, '');
            if (phone.startsWith('+216')) {
                const numberPart = phone.substring(4);
                if (numberPart.length !== 8 || !/^\d+$/.test(numberPart)) {
                    alert(t('invalidTunisianPhone', 'Tunisian phone numbers must contain exactly 8 digits after +216.'));
                    return;
                }
            } else {
                // Local Tunisian number must be exactly 8 digits
                const localPhone = phone.startsWith('0') ? phone.substring(1) : phone;
                if (localPhone.length !== 8 || !/^\d+$/.test(localPhone)) {
                    alert(t('invalidLocalPhone', 'Local Tunisian phone numbers must contain exactly 8 digits.'));
                    return;
                }
            }

            if (!phoneRegex.test(phone)) {
                alert(t('phoneDigitsOnly', 'Phone number must contain only digits and optional +.'));
                return;
            }
        }

        setParticipating({ ...participating, [giveawayId]: true });
        try {
            await api.post(`/giveaways/${giveawayId}/participate`, clientData);
            const response = await api.get('/giveaways');
            setGiveaways(response.data || []);
            setShowRegistrationForm(false);
            setRegistrationData({ clientName: '', clientSurname: '', clientPhone: '' });
        } catch (error) {
            console.error('Error participating in giveaway:', error);
            alert(error.response?.data?.message || 'Error participating in giveaway');
            setParticipating({ ...participating, [giveawayId]: false });
        } finally {
            setParticipating(prev => ({ ...prev, [giveawayId]: false }));
        }
    };

    // Real-time Input Sanitization
    const handleNameInput = (field, value) => {
        const lettersOnly = value.replace(/[^a-zA-Z\sÀ-ÿ]/g, '');
        setRegistrationData(prev => ({ ...prev, [field]: lettersOnly }));
    };

    const handlePhoneInput = (value) => {
        let sanitized = value.replace(/[^\d+]/g, '');
        if (sanitized.includes('+')) {
            const firstPlus = sanitized.indexOf('+');
            sanitized = sanitized.split('').filter((char, index) => 
                (char === '+' && index === 0) || char !== '+'
            ).join('');
        }
        setRegistrationData(prev => ({ ...prev, clientPhone: sanitized }));
    };

    const handleSelectWinners = async (giveawayId) => {
        setProcessing(true);
        try {
            const response = await api.get(`/giveaways/${giveawayId}`);
            setDrawingGiveaway(response.data);
            setDrawStatus('idle');
            setDrawWinners([]);
            setShowDrawModal(true);
        } catch (error) {
            console.error('Error opening draw modal:', error);
            alert('Error loading giveaway participants');
        } finally {
            setProcessing(false);
        }
    };

    const startDrawingProcess = async () => {
        if (!drawingGiveaway?.participants?.length) return;
        setDrawStatus('drawing');
        
        // Start shuffling index
        const shuffleInterval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % drawingGiveaway.participants.length);
        }, 100);

        try {
            const response = await api.post(`/giveaways/${drawingGiveaway.id}/select-winners`);
            const winners = response.data.winners;
            
            // Min 3s animation
            await new Promise(r => setTimeout(r, 3000));
            
            clearInterval(shuffleInterval);
            setDrawWinners(winners);
            setDrawStatus('revealed');
            
            // Update main list
            const mainResponse = await api.get('/giveaways');
            setGiveaways(mainResponse.data || []);
        } catch (error) {
            clearInterval(shuffleInterval);
            setDrawStatus('idle');
            alert(error.response?.data?.message || 'Error during draw');
        }
    };

    const handleDeleteGiveaway = async (giveawayId) => {
        if (!window.confirm('Are you sure you want to delete this giveaway?')) return;
        try {
            await api.delete(`/giveaways/${giveawayId}`);
            setGiveaways(giveaways.filter(g => g.id !== giveawayId));
        } catch (error) {
            alert(error.response?.data?.message || 'Error deleting giveaway');
        }
    };

    const isGiveawayActive = (giveaway) => {
        return giveaway.status === 'ACTIVE' && new Date(giveaway.endDate) > new Date();
    };

    const canParticipate = (giveaway) => {
        return isGiveawayActive(giveaway) && !participating[giveaway.id] && user?.role === 'cashier';
    };

    const getTimeLeft = (endDate) => {
        const diff = new Date(endDate).getTime() - Date.now();
        if (diff <= 0) return 'Ended';
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const calculateProgress = (start, end) => {
        const startDate = new Date(start || Date.now() - 86400000 * 7).getTime(); // assume 7 days ago if empty
        const endDate = new Date(end).getTime();
        const now = Date.now();
        if (now >= endDate) return 100;
        if (now <= startDate) return 0;
        return Math.min(100, Math.max(0, ((now - startDate) / (endDate - startDate)) * 100));
    };

    // Calculate dynamic stats
    const stats = {
        total: giveaways.length,
        active: giveaways.filter(g => isGiveawayActive(g)).length,
        participants: giveaways.reduce((sum, g) => sum + (g.participantCount || 0), 0),
        ended: giveaways.filter(g => g.status === 'ENDED' || new Date(g.endDate) <= new Date()).length
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600">
                            <FiGift size={28} />
                        </div>
                        {t('giveaways', 'Giveaways Events')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium ml-1">
                        {t('giveawaysDesc', 'Manage promotional contests and engage your participants.')}
                    </p>
                </div>
                {user?.role === 'admin' && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <FiPlus size={20} />
                        {t('createGiveaway', 'New Giveaway')}
                    </button>
                )}
            </div>

            {/* 1. STATS BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
                {[
                    { title: 'Total Giveaways', value: stats.total, icon: FiGift, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30' },
                    { title: 'Active', value: stats.active, icon: FiTrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' },
                    { title: 'Total Participants', value: stats.participants, icon: FiUsers, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/30' },
                    { title: 'Ended', value: stats.ended, icon: FiClock, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800' }
                ].map((stat, i) => (
                    <motion.div key={i} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: i*0.1}} 
                        className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} border flex items-center justify-center shrink-0`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div className="text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">{stat.value}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t(stat.title, stat.title)}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
                </div>
            ) : giveaways.length === 0 ? (
                /* 4. EMPTY STATE */
                <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="w-40 h-40 bg-purple-50 dark:bg-purple-900/10 rounded-[3rem] flex items-center justify-center mb-8 rotate-12 shadow-inner border border-purple-100 dark:border-purple-900/20">
                        <FiGift size={64} className="text-purple-500 drop-shadow-lg -rotate-12" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
                        {t('noGiveaways', 'No giveaways exist yet')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md">
                        {t('createFirstGiveaway', 'Engage your audience, reward loyalty, and boost sales by creating your very first giveaway event today!')}
                    </p>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/20 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center gap-3"
                        >
                            <FiPlus size={22} />
                            {t('createFirstButton', 'Create your first giveaway')}
                        </button>
                    )}
                </motion.div>
            ) : (
                /* 3. LAYOUT (3-Column Grid) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                    {giveaways.map((giveaway, idx) => {
                        const active = isGiveawayActive(giveaway);
                        const timeLeft = getTimeLeft(giveaway.endDate);
                        const ended = giveaway.status === 'ENDED' || new Date(giveaway.endDate) <= new Date();
                        const isEndingSoon = active && (new Date(giveaway.endDate).getTime() - Date.now() < 86400000 * 2);
                        const progress = calculateProgress(giveaway.startDate, giveaway.endDate);

                        return (
                            /* 2. CARD REDESIGN */
                            <motion.div
                                key={giveaway.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-lg flex flex-col transition-all hover:-translate-y-2 hover:shadow-2xl ${ended ? 'opacity-70 grayscale-[20%]' : ''}`}
                            >
                                {/* Colored Top Strip */}
                                <div className={`h-2.5 w-full ${active ? (isEndingSoon ? 'bg-green-500' : 'bg-purple-600') : 'bg-gray-400'}`} />
                                
                                <div className="p-8 flex-1 flex flex-col">
                                    {/* Header Badges */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${active ? (isEndingSoon ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' : 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400') : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-900/50 dark:border-gray-700 dark:text-gray-400'}`}>
                                            {active ? (isEndingSoon ? 'Ending Soon' : 'Active') : 'Ended'}
                                        </div>
                                        {user?.role === 'admin' && (
                                            <button onClick={() => handleDeleteGiveaway(giveaway.id)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                                <FiTrash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Prize Name & Icon */}
                                    <div className="flex items-start gap-4 mb-3">
                                        <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shrink-0 ${active ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30' : 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-500/20'}`}>
                                            <FiGift size={28} />
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight line-clamp-2 pt-1 tracking-tight">
                                            {giveaway.title}
                                        </h3>
                                    </div>
                                    
                                    {/* Description */}
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 line-clamp-2 min-h-[40px] font-medium leading-relaxed">
                                        {giveaway.description || t('noDescription', 'No special description provided.')}
                                    </p>

                                    {/* Embedded Stats Cards */}
                                    <div className="grid grid-cols-2 gap-3 mb-8">
                                        <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-2 text-gray-400 mb-1.5">
                                                <FiUsers size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">{t('participants', 'Participants')}</span>
                                            </div>
                                            <span className="text-xl font-black text-gray-900 dark:text-white">{giveaway.participantCount || 0}</span>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-2 text-gray-400 mb-1.5">
                                                <FiClock size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">{t('timeLeft', 'Time Left')}</span>
                                            </div>
                                            <span className={`text-xl font-black ${isEndingSoon ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                                {active ? timeLeft : 'Ended'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-8 mt-auto">
                                        <div className="flex justify-between text-[10px] font-black text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-widest">
                                            <span>Timeline</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-900/80 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full rounded-full ${active ? (isEndingSoon ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500') : 'bg-gray-400'}`} 
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        {active && canParticipate(giveaway) && (
                                            <button
                                                onClick={() => handleParticipate(giveaway.id)}
                                                disabled={participating[giveaway.id]}
                                                className="flex-1 py-3.5 bg-gray-900 hover:bg-purple-600 dark:bg-white dark:hover:bg-purple-500 dark:text-gray-900 text-white rounded-[1.25rem] text-sm font-bold shadow-xl transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
                                            >
                                                <FiPlay size={18} />
                                                {t('participateMsg', 'Participate Now')}
                                            </button>
                                        )}
                                        
                                        {(!active || !canParticipate(giveaway)) && !giveaway.winners?.length && user?.role !== 'admin' && (
                                            <div className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-[1.25rem] text-sm font-bold flex items-center justify-center gap-2 border border-gray-200 dark:border-transparent">
                                                <FiCheckCircle size={18} />
                                                {participating[giveaway.id] ? t('joinedMsg', 'You Joined') : t('endedMsg', 'Event Closed')}
                                            </div>
                                        )}

                                        {user?.role === 'admin' && (!giveaway.winners || giveaway.winners.length === 0) && (
                                            <button
                                                onClick={() => handleSelectWinners(giveaway.id)}
                                                disabled={processing || !giveaway.participantCount || active}
                                                className={`flex-1 py-3.5 rounded-[1.25rem] text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${active ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/20 hover:-translate-y-1'}`}
                                            >
                                                <FiAward size={18} />
                                                {active ? t('waiting', 'Wait for End') : t('draw', 'Draw Winners')}
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Winners Results Display */}
                                    {ended && giveaway.winners && giveaway.winners.length > 0 && (
                                        <div className="mt-6 pt-5 flex flex-col gap-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 mb-1 flex items-center gap-1.5"><FiAward size={14}/> Official Winners</div>
                                            {giveaway.winners.map(w => {
                                                const winnerName = w.participation?.clientName ? `${w.participation.clientName} ${w.participation.clientSurname}` : (w.user?.fullName || w.user?.username || `User ${w.userId}`);
                                                return (
                                                    <div key={w.id} className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 rounded-2xl border border-yellow-200/60 dark:border-yellow-900/50 shadow-sm">
                                                        <span className="font-bold text-sm text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-full bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center text-xs text-yellow-800 dark:text-yellow-50">#{w.rank}</span>
                                                            {winnerName}
                                                        </span>
                                                        {w.participation?.clientPhone && <span className="text-[10px] text-yellow-700 dark:text-yellow-400 opacity-60 font-bold">{w.participation.clientPhone}</span>}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create Giveaway Modal (Unchanged Backend logic, styled up) */}
            <AnimatePresence>
                {showCreateForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowCreateForm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 md:p-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600">
                                    <FiGift size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                    Create New Event
                                </h2>
                            </div>
                            
                            <form onSubmit={handleCreateGiveaway} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Giveaway Title</label>
                                    <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:border-purple-500 focus:ring-0 text-gray-900 dark:text-white transition-all shadow-sm"
                                        placeholder="E.g., Summer Mega Pack..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Description</label>
                                    <textarea required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3}
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl font-medium focus:border-purple-500 focus:ring-0 text-gray-900 dark:text-white transition-all shadow-sm"
                                        placeholder="Describe the rules and prizes..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Start Date</label>
                                        <input type="datetime-local" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:border-purple-500 focus:ring-0 text-gray-900 dark:text-white transition-all shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">End Date</label>
                                        <input type="datetime-local" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:border-purple-500 focus:ring-0 text-gray-900 dark:text-white transition-all shadow-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Number of Winners</label>
                                    <input type="number" min="1" max="100" required value={formData.winnerCount} onChange={(e) => setFormData({ ...formData, winnerCount: parseInt(e.target.value) || 1 })}
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl font-bold focus:border-purple-500 focus:ring-0 text-gray-900 dark:text-white transition-all shadow-sm" />
                                </div>
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowCreateForm(false)}
                                        className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-[1.5rem] font-bold transition-all">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={processing}
                                        className="flex-[2] py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-[1.5rem] font-bold shadow-xl shadow-purple-500/20 transition-all flex justify-center items-center">
                                        {processing ? 'Creating...' : 'Launch Giveaway'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Client Registration Modal (Cashier only) */}
            <AnimatePresence>
                {showRegistrationForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowRegistrationForm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 md:p-10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                                    <FiUsers size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                        Client Registration
                                    </h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Fill in participant details</p>
                                </div>
                            </div>
                            
                            <form onSubmit={(e) => { e.preventDefault(); submitParticipation(selectedGiveawayId, registrationData); }} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">First Name</label>
                                        <input type="text" required value={registrationData.clientName} onChange={(e) => handleNameInput('clientName', e.target.value)}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] font-bold focus:border-blue-500 focus:ring-0 text-gray-900 dark:text-white transition-all shadow-sm"
                                            placeholder="Name" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Surname</label>
                                        <input type="text" required value={registrationData.clientSurname} onChange={(e) => handleNameInput('clientSurname', e.target.value)}
                                            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] font-bold focus:border-blue-500 focus:ring-0 text-gray-900 dark:text-white transition-all shadow-sm"
                                            placeholder="Surname" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Phone Number</label>
                                    <input type="tel" required value={registrationData.clientPhone} onChange={(e) => handlePhoneInput(e.target.value)}
                                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-[1.25rem] font-bold focus:border-blue-500 focus:ring-0 text-gray-900 dark:text-white transition-all shadow-sm"
                                        placeholder="+216..." />
                                </div>
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowRegistrationForm(false)}
                                        className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-[1.5rem] font-bold transition-all">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={participating[selectedGiveawayId]}
                                        className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-[1.5rem] font-bold shadow-xl shadow-blue-500/20 transition-all flex justify-center items-center">
                                        {participating[selectedGiveawayId] ? 'Registering...' : 'Register Participant'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Draw Winners Modal */}
            <AnimatePresence>
                {showDrawModal && drawingGiveaway && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 50 }}
                            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-8 pb-4 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center text-yellow-600">
                                        <FiAward size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Draw Winners</h2>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{drawingGiveaway.title}</p>
                                    </div>
                                </div>
                                <button onClick={() => !processing && setShowDrawModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2">
                                    <FiPlus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <div className="px-8 py-6">
                                {/* Animation Area */}
                                <div className="bg-gray-50 dark:bg-gray-950 rounded-[2.5rem] p-10 mb-8 border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                                    
                                    {drawStatus === 'idle' && (
                                        <div className="text-center">
                                            <div className="text-4xl font-black text-gray-300 dark:text-gray-700 mb-4 tracking-tighter uppercase italic">Ready to Draw?</div>
                                            <button 
                                                onClick={startDrawingProcess}
                                                className="px-10 py-5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-black shadow-xl shadow-yellow-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
                                            >
                                                <FiPlay size={20} /> START RANDOM SELECTION
                                            </button>
                                        </div>
                                    )}

                                    {drawStatus === 'drawing' && (
                                        <div className="text-center">
                                            <motion.div 
                                                animate={{ scale: [1, 1.1, 1] }} 
                                                transition={{ duration: 0.2, repeat: Infinity }}
                                                className="text-5xl font-black text-yellow-500 tracking-tight italic"
                                            >
                                                {drawingGiveaway.participants[currentIndex]?.clientName || drawingGiveaway.participants[currentIndex]?.user?.username}
                                            </motion.div>
                                            <div className="mt-8 flex justify-center gap-2">
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                        </div>
                                    )}

                                    {drawStatus === 'revealed' && (
                                        <div className="w-full text-center">
                                            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6">
                                                <div className="text-yellow-500 mb-2 font-black uppercase tracking-[0.3em] text-[10px]">TIRAGE TERMINÉ</div>
                                                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-8">Félicitations aux Gagnants!</h3>
                                            </motion.div>
                                            
                                            <div className="grid gap-4 max-w-md mx-auto">
                                                {drawWinners.map((winner, idx) => (
                                                    <motion.div 
                                                        key={idx}
                                                        initial={{ x: -20, opacity: 0 }} 
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: idx * 0.2 }}
                                                        className="flex items-center gap-4 bg-white dark:bg-gray-900 p-5 rounded-3xl border-2 border-yellow-400 shadow-xl shadow-yellow-500/10"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-white font-black">#{idx + 1}</div>
                                                        <div className="text-left">
                                                            <div className="font-black text-lg text-gray-900 dark:text-white leading-none mb-1">
                                                                {winner.clientName || winner.user?.fullName || winner.user?.username}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{winner.clientPhone || 'System User'}</div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>

                                            <button 
                                                onClick={() => setShowDrawModal(false)}
                                                className="mt-10 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black shadow-xl transition-all hover:opacity-90"
                                            >
                                                Close & View Results
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Participant Sidebar Info */}
                                <div className="flex justify-between items-center px-4">
                                    <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                                        <FiUsers size={14} /> {drawingGiveaway.participants.length} Participants au total
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                                        <FiAward size={14} /> {drawingGiveaway.winnerCount} Gagnant(s) à tirer
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Giveaways;
