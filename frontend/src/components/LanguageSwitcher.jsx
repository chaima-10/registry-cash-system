import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    useEffect(() => {
        document.body.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    }, [i18n.language]);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="flex space-x-2 rtl:space-x-reverse">
            <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded-md ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
                English
            </button>
            <button
                onClick={() => changeLanguage('fr')}
                className={`px-3 py-1 rounded-md ${i18n.language === 'fr' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
                Français
            </button>
            <button
                onClick={() => changeLanguage('ar')}
                className={`px-3 py-1 rounded-md ${i18n.language === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
                العربية
            </button>
        </div>
    );
};

export default LanguageSwitcher;
