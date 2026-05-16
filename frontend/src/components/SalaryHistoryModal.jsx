import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCalendar, FiUser, FiDollarSign, FiPrinter, FiSearch, FiFileText } from 'react-icons/fi';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Payslip from './Payslip';

const SalaryHistoryModal = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const { formatCurrency } = useAuth();

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/users/salary/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (error) {
            console.error("Error fetching salary history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const filteredHistory = history.filter(item => 
        item.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.month?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewPayslip = (payment) => {
        setSelectedPayment(payment);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400">
                            <FiDollarSign size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Historique des Salaires</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gérez et réimprimez les fiches de paie</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <FiX size={24} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-8 pb-0">
                    <div className="relative group">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Rechercher par employé ou mois..." 
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-emerald-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Chargement de l'historique...</p>
                        </div>
                    ) : filteredHistory.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredHistory.map((item) => (
                                <motion.div 
                                    key={item.id}
                                    whileHover={{ y: -4 }}
                                    className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xs">
                                                {item.user?.username?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 dark:text-white text-sm">{item.user?.fullName || item.user?.username}</h4>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{item.user?.role}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">
                                                {formatCurrency(item.amount, 'TND', false)}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.month}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                                <FiCalendar />
                                                {new Date(item.paidAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleViewPayslip(item)}
                                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm"
                                        >
                                            <FiPrinter /> Fiche de Paie
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <FiFileText className="mx-auto text-4xl text-gray-300 mb-4" />
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Aucun historique trouvé</p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Payslip Overlay */}
            <AnimatePresence>
                {selectedPayment && (
                    <Payslip 
                        payment={selectedPayment} 
                        onClose={() => setSelectedPayment(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SalaryHistoryModal;
