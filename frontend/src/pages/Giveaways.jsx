import { useState, useEffect } from 'react';
import { FiGift, FiUsers, FiCalendar, FiTrophy, FiPlus, FiEdit2, FiTrash2, FiPlay, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';
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
    const [selectedGiveaway, setSelectedGiveaway] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        winnerCount: 1
    });
    const [participating, setParticipating] = useState({});
    const [processing, setProcessing] = useState(false);

    // Fetch giveaways
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

    // Create giveaway
    const handleCreateGiveaway = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const response = await api.post('/giveaways', formData);
            setGiveaways([response.data, ...giveaways]);
            setShowCreateForm(false);
            setFormData({
                title: '',
                description: '',
                startDate: '',
                endDate: '',
                winnerCount: 1
            });
        } catch (error) {
            console.error('Error creating giveaway:', error);
            alert(error.response?.data?.message || 'Error creating giveaway');
        } finally {
            setProcessing(false);
        }
    };

    // Participate in giveaway
    const handleParticipate = async (giveawayId) => {
        setParticipating({ ...participating, [giveawayId]: true });
        try {
            await api.post(`/giveaways/${giveawayId}/participate`);
            // Refresh giveaways to update participant count
            const response = await api.get('/giveaways');
            setGiveaways(response.data || []);
        } catch (error) {
            console.error('Error participating:', error);
            alert(error.response?.data?.message || 'Error participating in giveaway');
            setParticipating({ ...participating, [giveawayId]: false });
        }
    };

    // Select winners
    const handleSelectWinners = async (giveawayId) => {
        if (!confirm('Are you sure you want to select winners? This action cannot be undone.')) {
            return;
        }
        
        setProcessing(true);
        try {
            await api.post(`/giveaways/${giveawayId}/select-winners`);
            // Refresh giveaways
            const response = await api.get('/giveaways');
            setGiveaways(response.data || []);
        } catch (error) {
            console.error('Error selecting winners:', error);
            alert(error.response?.data?.message || 'Error selecting winners');
        } finally {
            setProcessing(false);
        }
    };

    // Delete giveaway
    const handleDeleteGiveaway = async (giveawayId) => {
        if (!confirm('Are you sure you want to delete this giveaway?')) {
            return;
        }
        
        try {
            await api.delete(`/giveaways/${giveawayId}`);
            setGiveaways(giveaways.filter(g => g.id !== giveawayId));
        } catch (error) {
            console.error('Error deleting giveaway:', error);
            alert(error.response?.data?.message || 'Error deleting giveaway');
        }
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    // Check if giveaway is active
    const isGiveawayActive = (giveaway) => {
        return giveaway.status === 'ACTIVE' && new Date(giveaway.endDate) > new Date();
    };

    // Check if user can participate
    const canParticipate = (giveaway) => {
        return isGiveawayActive(giveaway) && !participating[giveaway.id];
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <FiGift className="text-purple-600" size={32} />
                    {t('giveaways', 'Giveaways / Tirage au sort')}
                </h1>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                    <FiPlus size={18} />
                    {t('createGiveaway', 'Create Giveaway')}
                </button>
            </div>

            {/* Create Giveaway Form */}
            <AnimatePresence>
                {showCreateForm && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowCreateForm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                {t('createNewGiveaway', 'Create New Giveaway')}
                            </h2>
                            <form onSubmit={handleCreateGiveaway} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2">
                                        {t('giveawayTitle', 'Giveaway Title')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-gray-900 dark:text-white"
                                        placeholder={t('enterTitle', 'Enter giveaway title...')}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2">
                                        {t('description', 'Description')}
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-gray-900 dark:text-white"
                                        placeholder={t('enterDescription', 'Enter giveaway description...')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2">
                                            {t('startDate', 'Start Date')}
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2">
                                            {t('endDate', 'End Date')}
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400 mb-2">
                                        {t('winnerCount', 'Number of Winners')}
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        required
                                        value={formData.winnerCount}
                                        onChange={(e) => setFormData({ ...formData, winnerCount: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-xl font-medium transition-colors"
                                    >
                                        {processing ? t('creating', 'Creating...') : t('createGiveaway', 'Create Giveaway')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                                    >
                                        {t('cancel', 'Cancel')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Giveaways List */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
            ) : giveaways.length === 0 ? (
                <div className="text-center py-12">
                    <FiGift size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                        {t('noGiveaways', 'No giveaways yet')}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-500">
                        {t('createFirstGiveaway', 'Create your first giveaway to get started!')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {giveaways.map((giveaway) => (
                        <motion.div
                            key={giveaway.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                        {giveaway.title}
                                    </h3>
                                    {giveaway.description && (
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                            {giveaway.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <FiCalendar size={16} />
                                            <span>{t('ends', 'Ends')}: {formatDate(giveaway.endDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FiUsers size={16} />
                                            <span>{giveaway.participantCount || 0} {t('participants', 'participants')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {giveaway.status === 'ACTIVE' && (
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                            {t('active', 'ACTIVE')}
                                        </span>
                                    )}
                                    {giveaway.status === 'ENDED' && (
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 text-xs font-bold rounded-full">
                                            {t('ended', 'ENDED')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                                    {giveaway.winners && giveaway.winners.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <FiTrophy size={16} className="text-yellow-500" />
                                            <span>{giveaway.winners.length} {t('winners', 'winners')}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {canParticipate(giveaway) && (
                                        <button
                                            onClick={() => handleParticipate(giveaway.id)}
                                            disabled={participating[giveaway.id]}
                                            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            {participating[giveaway.id] ? (
                                                <>
                                                    <FiCheckCircle size={16} />
                                                    {t('participated', 'Participated')}
                                                </>
                                            ) : (
                                                <>
                                                    <FiPlay size={16} />
                                                    {t('participate', 'Participate')}
                                                </>
                                            )}
                                        </button>
                                    )}
                                    
                                    {user?.role === 'admin' && (
                                        <div className="flex gap-2">
                                            {giveaway.status === 'ACTIVE' && giveaway.participants && giveaway.participants.length > 0 && (
                                                <button
                                                    onClick={() => handleSelectWinners(giveaway.id)}
                                                    disabled={processing}
                                                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                                                    title={t('selectWinners', 'Select Winners')}
                                                >
                                                    <FiTrophy size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteGiveaway(giveaway.id)}
                                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                title={t('delete', 'Delete')}
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Show winners if giveaway ended */}
                            {giveaway.status === 'ENDED' && giveaway.winners && giveaway.winners.length > 0 && (
                                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <h4 className="font-bold text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
                                        <FiTrophy size={18} />
                                        {t('winners', 'Winners')}
                                    </h4>
                                    <div className="space-y-2">
                                        {giveaway.winners.map((winner) => (
                                            <div key={winner.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                        {winner.rank}{winner.rank === 1 ? 'st' : 'nd'} {t('place', 'place')}
                                                    </span>
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        {winner.user?.username || `User ${winner.userId}`}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                                    {formatDate(winner.selectedAt)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Giveaways;
