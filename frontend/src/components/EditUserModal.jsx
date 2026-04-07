import React, { useState, useEffect } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('editUser')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('fullName')}</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('dailyRate')}</label>
                        <input
                            type="number"
                            name="salary"
                            step="0.01"
                            placeholder="e.g. 50.00"
                            value={formData.salary}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('workingDays')}</label>
                        <input
                            type="text"
                            name="workingDays"
                            placeholder={t('workingDaysPlaceholder', 'e.g. Mon,Tue,Wed')}
                            value={formData.workingDays}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all font-medium"
                        />
                        <p className="text-[10px] text-gray-400 mt-1 italic">{t('workingDaysAutoNote', 'Les jours travaillés sont calculés automatiquement.')}</p>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all active:scale-95"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 active:scale-95"
                        >
                            <FiSave /> {t('save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserModal;
