import { FiMonitor, FiGlobe, FiMoon, FiSun, FiDollarSign } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import api from '../api/axios';

const SettingsPage = () => {
    const { t } = useTranslation();
    const { user, toggleTheme, currency, changeCurrency } = useAuth();

    const handleThemeToggle = () => {
        toggleTheme();
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings')}</h2>

            {/* Appearance Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm transition-colors">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                        <FiMonitor size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('appearance')}</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                        {user?.theme === 'dark'
                            ? <FiMoon className="text-blue-600 dark:text-blue-400" />
                            : <FiSun className="text-orange-500" />}
                        <div>
                            <p className="text-gray-900 dark:text-white font-medium">{t('themeMode')}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {user?.theme === 'dark' ? t('darkMode') : t('lightMode')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleThemeToggle}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg ${user?.theme === 'dark'
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'
                            : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/30'
                            }`}
                    >
                        {user?.theme === 'dark' ? t('switchToLight') : t('switchToDark')}
                    </button>
                </div>
            </div>

            {/* Language Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm transition-colors">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-500/20 rounded-lg text-green-600 dark:text-green-400">
                        <FiGlobe size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('language')}</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-colors">
                    <div>
                        <p className="text-gray-900 dark:text-white font-medium">{t('systemLanguage')}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('selectPreferredLanguage')}</p>
                    </div>
                    <LanguageSwitcher />
                </div>
            </div>

            {/* Currency Card */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm transition-colors">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400">
                        <FiDollarSign size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('currency') || 'Currency'}</h3>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-colors">
                    <div>
                        <p className="text-gray-900 dark:text-white font-medium">{t('storeCurrency') || 'Store Currency'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('selectCurrency') || 'Select base currency'}</p>
                    </div>
                    <select
                        value={currency}
                        onChange={(e) => changeCurrency(e.target.value)}
                        className="py-2 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                    >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="TND">TND (د.ت)</option>
                        <option value="GBP">GBP (£)</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
