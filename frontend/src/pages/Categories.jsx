import { useState, useEffect } from 'react';
import { FiFolderPlus, FiFolder, FiChevronRight, FiChevronDown, FiPlus } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllCategories, createCategory, createSubcategory } from '../api/categories';

import { useTranslation } from 'react-i18next';

const CategoryItem = ({ category, onAddSub }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="mb-2">
            <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors cursor-pointer group"
                onClick={() => setIsOpen(!isOpen)}>
                <span className="text-gray-400">{isOpen ? <FiChevronDown /> : <FiChevronRight />}</span>
                <FiFolder className="text-blue-400" />
                <span className="text-white font-medium flex-1">{category.name}</span>
                <button onClick={(e) => { e.stopPropagation(); onAddSub(category.id); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-xs bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-all flex items-center gap-1">
                    <FiPlus /> {t('sub')}
                </button>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-8 mt-2 space-y-2 border-l-2 border-gray-800 pl-4"
                    >
                        {category.subcategories?.length > 0 ? (
                            category.subcategories.map(sub => (
                                <div key={sub.id} className="p-2 text-gray-400 text-sm flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                    {sub.name}
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-600 text-sm italic">{t('noSubcategories')}</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Categories = () => {
    const { t } = useTranslation();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('category'); // 'category' or 'subcategory'
    const [selectedParentId, setSelectedParentId] = useState(null);
    const [name, setName] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getAllCategories();
            setCategories(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = () => {
        setModalType('category');
        setName('');
        setShowModal(true);
    };

    const handleAddSubcategory = (parentId) => {
        setModalType('subcategory');
        setSelectedParentId(parentId);
        setName('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalType === 'category') {
                await createCategory({ name });
            } else {
                await createSubcategory({ name, categoryId: selectedParentId });
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            alert("Failed to create");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{t('categories')}</h2>
                <button onClick={handleAddCategory} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-colors">
                    <FiFolderPlus /> {t('newCategory')}
                </button>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                {loading ? (
                    <div className="text-gray-500">{t('loading')}</div>
                ) : categories.length === 0 ? (
                    <div className="text-gray-500">{t('noCategoriesFound')}</div>
                ) : (
                    categories.map(cat => (
                        <CategoryItem key={cat.id} category={cat} onAddSub={handleAddSubcategory} />
                    ))
                )}
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-gray-900 border border-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-4">
                                {modalType === 'category' ? t('newCategory') : t('newSubcategory')}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('name')}</label>
                                    <input autoFocus type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                                        value={name} onChange={e => setName(e.target.value)} required />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">{t('cancel')}</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700">{t('create')}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Categories;
