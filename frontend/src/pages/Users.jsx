import { useState, useEffect, Component } from 'react';
import { FiPlus, FiUser, FiUserCheck, FiShield } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { register } from '../api/auth';
import { getUsers, updateUser, deleteUser, distributePrimes, distributeSalaries } from '../api/users';
import UserTable from '../components/UserTable';
import EditUserModal from '../components/EditUserModal';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FiActivity, FiDollarSign, FiClock, FiFileText } from 'react-icons/fi';
import SalaryHistoryModal from '../components/SalaryHistoryModal';
import ShiftScheduleSelector from '../components/ShiftScheduleSelector';

// Lazy load AttendanceTracker to isolate errors
import React, { Suspense } from 'react';
const AttendanceTracker = React.lazy(() => import('../components/AttendanceTracker'));
const EmployeePerformance = React.lazy(() => import('../components/EmployeePerformance'));

// Error Boundary to catch runtime crashes in AttendanceTracker
class AttendanceBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('AttendanceTracker crashed:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="mt-12 pt-12 border-t border-gray-200 dark:border-gray-800 p-8 text-center">
                    <p className="text-red-500 font-bold text-sm">⚠️ Attendance section encountered an error</p>
                    <p className="text-gray-400 text-xs mt-2">{this.state.error?.message}</p>
                    <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const Users = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({ username: '', password: '', role: 'cashier', fullName: '', salary: '', workingDays: '', shiftSchedule: '' });
    const [message, setMessage] = useState(null);
    const [users, setUsers] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const { user, formatCurrency } = useAuth();
    const [primeData, setPrimeData] = useState({ amount: '', reason: '' });
    const [isDistributing, setIsDistributing] = useState(false);
    const [salaryMonth, setSalaryMonth] = useState('');
    const [isDistributingSalary, setIsDistributingSalary] = useState(false);
    const [isSalaryHistoryOpen, setIsSalaryHistoryOpen] = useState(false);

    const handleDistributePrime = async () => {
        if (!primeData.amount || isNaN(primeData.amount) || parseFloat(primeData.amount) <= 0) {
            return alert(t('pleaseEnterValidAmount', 'Veuillez saisir un montant valide.'));
        }
        setIsDistributing(true);
        try {
            const res = await distributePrimes({ 
                amount: parseFloat(primeData.amount), 
                reason: primeData.reason 
            });
            
            alert(res.message);
            fetchUsers();
            setPrimeData({ amount: '', reason: '' });
        } catch (error) {
            const errorMsg = error.response?.data?.message || t('failedToDistributePrime', 'Échec de la distribution.');
            alert(`Erreur: ${errorMsg}`);
            console.error("Distribution Error:", error);
        } finally {
            setIsDistributing(false);
        }
    };

    const handleDistributeSalary = async () => {
        setIsDistributingSalary(true);
        try {
            const res = await distributeSalaries({ month: salaryMonth });
            alert(res.message);
            fetchUsers();
            setSalaryMonth('');
        } catch (error) {
            const errorMsg = error.response?.data?.message || t('failedToDistributeSalary', 'Échec de la distribution des salaires.');
            alert(`Erreur: ${errorMsg}`);
            console.error("Salary Distribution Error:", error);
        } finally {
            setIsDistributingSalary(false);
        }
    };

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
            setFormData({ username: '', password: '', role: 'cashier', fullName: '', salary: '', workingDays: '', shiftSchedule: '' });
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
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-8 order-2 lg:order-1 lg:sticky lg:top-6 h-fit">
                    {/* User Registration Form */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl lg:rounded-[2.5rem] p-6 lg:p-8 shadow-sm transition-colors">
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
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1 mb-2">{t('workingSchedule', 'Working Schedule')}</label>
                            <ShiftScheduleSelector 
                                value={formData.shiftSchedule}
                                onChange={(val) => setFormData({ ...formData, shiftSchedule: val })}
                            />
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

            {/* Admin Distribution Widgets — Side by Side */}
            {user?.role === 'admin' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Prime Distribution */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl lg:rounded-[2.5rem] p-6 lg:p-8 shadow-sm transition-colors">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-600 dark:text-orange-400">
                                <FiActivity size={24} />
                            </div>
                            <h3 className="text-lg lg:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                {t('primesReceived', 'Primes Received')}
                            </h3>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Montant Prime (TND)</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                                        value={primeData.amount}
                                        onChange={e => setPrimeData({ ...primeData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Raison / Occasion</label>
                                    <input
                                        type="text"
                                        placeholder="ex: Eid Al-Fitr 2026"
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                                        value={primeData.reason}
                                        onChange={e => setPrimeData({ ...primeData, reason: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleDistributePrime}
                                    disabled={isDistributing}
                                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black rounded-2xl shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDistributing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '🚀 Distribute to All'}
                                </button>
                                
                                <div className="p-4 bg-orange-50/50 dark:bg-orange-500/5 rounded-2xl border border-orange-100 dark:border-orange-500/10">
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-bold flex items-center gap-2">
                                        <FiActivity size={14} /> 
                                        {user?.stats?.lastSystemDistribution 
                                            ? `Last distributed: ${formatCurrency(user?.stats?.lastSystemDistribution?.amount, null, false)} — ${user?.stats?.lastSystemDistribution?.reason}`
                                            : 'No prime distributed yet'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Salary Distribution */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl lg:rounded-[2.5rem] p-6 lg:p-8 shadow-sm transition-colors">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                                    <FiDollarSign size={24} />
                                </div>
                                <h3 className="text-lg lg:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                    {t('salaryDistribution', 'Salary Distribution')}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setIsSalaryHistoryOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-emerald-100 dark:border-emerald-500/20"
                            >
                                <FiFileText /> Fiche de Paie
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">{t('salaryMonth', 'Mois / Période')}</label>
                                <input
                                    type="text"
                                    placeholder={`ex: ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                                    value={salaryMonth}
                                    onChange={e => setSalaryMonth(e.target.value)}
                                />
                            </div>

                            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                                    <FiDollarSign size={14} />
                                    {t('salaryNote', 'Chaque employé recevra son salaire journalier défini dans son profil.')}
                                </p>
                            </div>

                            <button
                                onClick={handleDistributeSalary}
                                disabled={isDistributingSalary}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDistributingSalary ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '💰 ' + t('distributeAllSalaries', 'Distribute Salaries')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AttendanceBoundary>
                <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin text-4xl text-blue-500">⟳</div></div>}>
                    <AttendanceTracker />
                </Suspense>
            </AttendanceBoundary>

            <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin text-4xl text-blue-500">⟳</div></div>}>
                <EmployeePerformance />
            </Suspense>


            <EditUserModal
                user={editingUser}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUpdate={handleUpdate}
            />

            <SalaryHistoryModal
                isOpen={isSalaryHistoryOpen}
                onClose={() => setIsSalaryHistoryOpen(false)}
            />
        </div>
    );
};

export default Users;
