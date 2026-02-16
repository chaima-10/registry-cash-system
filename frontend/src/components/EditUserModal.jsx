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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">{t('editUser')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <FiX size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('fullName')}</label>
                        <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('salary')}</label>
                        <input
                            type="number"
                            name="salary"
                            step="0.01"
                            value={formData.salary}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('workingDays')}</label>
                        <input
                            type="text"
                            name="workingDays"
                            placeholder="e.g. Mon,Tue,Wed"
                            value={formData.workingDays}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
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
