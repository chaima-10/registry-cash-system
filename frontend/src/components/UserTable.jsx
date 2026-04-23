import React from 'react';
import { FiEdit, FiTrash2, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { calculateNetSalary } from '../utils/salaryCalculator';

const UserTable = ({ users, title, onEdit, onDelete }) => {
    const { t } = useTranslation();
    const { formatCurrency } = useAuth();

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-xl overflow-hidden transition-colors">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400"><FiUser size={24} /></div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title || t('users')}</h3>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 backdrop-blur-sm transition-colors">
                            <th className="p-4 font-bold uppercase text-[10px] tracking-wider">{t('fullName')}</th>
                            <th className="p-4 font-bold uppercase text-[10px] tracking-wider">{t('dailySalary', 'Daily Salary')}</th>
                            <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-center">{t('workedDays')}</th>
                            <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-center">{t('absences')}</th>
                            <th className="p-4 font-bold uppercase text-[10px] tracking-wider">{t('monthlySalary')}</th>
                            <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-gray-300 divide-y divide-gray-100 dark:divide-gray-800 transition-colors">
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500 italic">{t('noUsersFound')}</td>
                            </tr>
                        ) : (
                            users.map((user, idx) => (
                                <motion.tr 
                                    key={user.id} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="hover:bg-blue-50/30 dark:hover:bg-blue-500/5 group transition-all duration-200"
                                >
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.fullName || '-'}</span>
                                            <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                                                <span className="text-[10px]">@{user.username}</span>
                                                {user.role === 'admin' && (
                                                    <span className="text-[8px] font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20 shadow-sm">
                                                        {t('admin')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-semibold text-blue-600 dark:text-blue-400 font-mono">
                                        {formatCurrency(user.salary || 0, null, false)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-green-500/5 text-green-600 dark:text-green-400 text-xs font-bold border border-green-500/10 shadow-sm">
                                            {user.workedDays || 0} {t('days')}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-red-500/5 text-red-600 dark:text-red-400 text-xs font-bold border border-red-500/10 shadow-sm">
                                            {user.absences || 0} {t('days')}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            {(() => {
                                                const salaryData = calculateNetSalary(
                                                    user.salary,
                                                    user.absences,
                                                    user.workingDays,
                                                    user.workedDays
                                                );
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 line-through decoration-gray-400/50">
                                                            {formatCurrency(salaryData.expectedMonthlySalary, null, false)}
                                                        </span>
                                                        <span className="font-black text-gray-900 dark:text-white text-sm">
                                                            {formatCurrency(salaryData.netSalary, null, false)}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                            <span className="text-[9px] text-gray-400 uppercase font-black tracking-tighter opacity-70 mt-0.5">
                                                {new Date().toLocaleString('default', { month: 'long' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 px-1">
                                            <button
                                                onClick={() => onEdit(user)}
                                                className="p-2.5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl transition-all border border-transparent hover:border-blue-500/20 shadow-sm active:scale-95"
                                                title={t('edit')}
                                            >
                                                <FiEdit size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDelete(user.id)}
                                                className="p-2.5 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/20 shadow-sm active:scale-95"
                                                title={t('delete')}
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserTable;
