import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiInfo } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const EditUserModal = ({ user, isOpen, onClose, onUpdate }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        fullName: '',
        salary: '',
        workingDays: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                salary: user.salary || '',
                workingDays: user.workingDays || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(user.id, formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl transform transition-all animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex flex-col">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('editUser')}</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 opacity-70">{t('personalInformation')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{t('fullName')}</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{t('monthlySalary')}</label>
                        <div className="relative group">
                            <input
                                type="number"
                                name="salary"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.salary}
                                onChange={handleChange}
                                className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium pr-14"
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-blue-500/50 dark:text-blue-400/30">TND</div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{t('workingDays')}</label>
                        <input
                            type="text"
                            name="workingDays"
                            placeholder={t('workingDaysPlaceholder', 'e.g. Mon,Tue,Wed')}
                            value={formData.workingDays}
                            onChange={handleChange}
                            className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                        />
                        <div className="flex items-start gap-2 mt-2 px-1">
                            <div className="mt-0.5"><FiSave size={10} className="text-blue-500" /></div>
                            <p className="text-[10px] text-gray-400 italic leading-relaxed">
                                {t('workingDaysAutoNote', 'Les jours travaillés sont calculés automatiquement.')}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-12">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-2xl transition-all active:scale-95"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 active:scale-95 hover:shadow-blue-500/40"
                        >
                            <FiSave size={18} /> {t('saveChanges')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
