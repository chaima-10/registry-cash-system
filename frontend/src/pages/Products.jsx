import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiCamera } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import CameraScannerModal from '../components/CameraScannerModal';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import { getAllCategories, createCategory, createSubcategory } from '../api/categories';
import Barcode from 'react-barcode';

import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Products = () => {
    const { t } = useTranslation();
    const { formatCurrency, currency, exchangeRates, changeCurrency } = useAuth();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSubcategory, setFilterSubcategory] = useState('');
    const [scannerTarget, setScannerTarget] = useState('search'); // 'search' or 'form'

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProductId, setCurrentProductId] = useState(null);
    const [formData, setFormData] = useState({
        barcode: '', name: '', price: '', purchasePrice: '', stockQuantity: '', categoryId: '', subcategoryId: '', remise: '', tva: '', safetyStock: '0'
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const barcodeInputRef = useRef(null);

    useEffect(() => {
        if (isModalOpen && !isEditing && barcodeInputRef.current) {
            setTimeout(() => {
                barcodeInputRef.current?.focus();
            }, 100);
        }
    }, [isModalOpen, isEditing]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsData, categoriesData] = await Promise.all([
                getAllProducts(),
                getAllCategories()
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = filterCategory ? product.categoryId === parseInt(filterCategory) : true;
        const matchesSub = filterSubcategory ? product.subcategoryId === parseInt(filterSubcategory) : true;
        return matchesSearch && matchesCat && matchesSub;
    });

    const getFilterSubcategories = () => {
        if (!filterCategory) {
            return categories.flatMap(c => c.subcategories || []);
        }
        const category = categories.find(c => c.id === parseInt(filterCategory));
        return category ? category.subcategories || [] : [];
    };

    const handleCreateCategory = async () => {
        const name = window.prompt(t('newCategory'));
        if (name) {
            try {
                const res = await createCategory({ name });
                await fetchData();
                setFilterCategory(res.id.toString());
                setFilterSubcategory('');
            } catch (error) {
                toast.error(t('failedToCreate'));
            }
        }
    };

    const handleCreateSubcategory = async () => {
        if (!filterCategory) {
            toast.error(t('selectCategoryFirst', "Sélectionnez d'abord une catégorie principale."));
            return;
        }
        const name = window.prompt(t('newSubcategory'));
        if (name) {
            try {
                const res = await createSubcategory({ name, categoryId: filterCategory });
                await fetchData();
                setFilterSubcategory(res.id.toString());
            } catch (error) {
                toast.error(t('failedToCreate'));
            }
        }
    };

    const handleOpenModal = (product = null) => {
        const rate = (exchangeRates && exchangeRates[currency]) ? exchangeRates[currency] : 1;
        
        if (product) {
            setIsEditing(true);
            setCurrentProductId(product.id);
            setFormData({
                barcode: product.barcode,
                name: product.name,
                price: (Number(product.price) * rate).toFixed(3),
                purchasePrice: product.purchasePrice ? (Number(product.purchasePrice) * rate).toFixed(3) : '',
                stockQuantity: product.stockQuantity,
                categoryId: product.categoryId || '',
                subcategoryId: product.subcategoryId || '',
                remise: product.remise || '',
                tva: product.tva || '',
                safetyStock: product.safetyStock || '0'
            });
        } else {
            setIsEditing(false);
            setCurrentProductId(null);
            setFormData({ barcode: '', name: '', price: '', purchasePrice: '', stockQuantity: '', categoryId: '', subcategoryId: '', remise: '', tva: '', safetyStock: '0' });
        }
        setImageFile(null);
        setImagePreview(product?.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${API_URL}${product.imageUrl}`) : null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const rate = (exchangeRates && exchangeRates[currency]) ? exchangeRates[currency] : 1;
            const data = new FormData();
            
            
            const submissionData = { ...formData };
            if (submissionData.price) submissionData.price = (parseFloat(submissionData.price) / rate).toFixed(6);
            if (submissionData.purchasePrice) submissionData.purchasePrice = (parseFloat(submissionData.purchasePrice) / rate).toFixed(6);

            Object.keys(submissionData).forEach(key => {
                data.append(key, submissionData[key]);
            });
            
            if (imageFile) {
                data.append('image', imageFile);
            }

            if (isEditing) {
                await updateProduct(currentProductId, data);
            } else {
                await createProduct(data);
            }
            setIsModalOpen(false);
            fetchData();
            toast.success(t(isEditing ? 'productUpdated' : 'productCreated', 'Opération réussie !'));
        } catch (error) {
            toast.error(`Failed to ${isEditing ? 'update' : 'create'} product: ` + (error.response?.data?.error || error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            try {
                await deleteProduct(id);
                await fetchData();
                toast.success(t('productDeleted', 'Produit supprimé !'));
            } catch (error) {
                toast.error("Failed to delete product: " + (error.response?.data?.message || error.message));
            }
        }
    };

    const getSubcategories = () => {
        if (!formData.categoryId) {
            return categories.flatMap(c => c.subcategories || []);
        }
        const category = categories.find(c => c.id === parseInt(formData.categoryId));
        return category ? category.subcategories || [] : [];
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{t('productManagement')}</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95"
                >
                    <FiPlus /> {t('addProduct')}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex gap-1">
                        <select
                            value={filterCategory}
                            onChange={(e) => { setFilterCategory(e.target.value); setFilterSubcategory(''); }}
                            className="flex-1 py-3 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors shadow-sm appearance-none"
                        >
                            <option value="">{t('allCategories', 'Catégories')}</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" onClick={handleCreateCategory} className="p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 text-blue-600 dark:text-blue-400 rounded-xl transition-colors shrink-0 border border-blue-100 dark:border-blue-800" title="Nouvelle catégorie">
                            <FiPlus />
                        </button>
                    </div>

                    <div className="flex gap-1">
                        <select
                            value={filterSubcategory}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilterSubcategory(val);
                                if (val && !filterCategory) {
                                    const parentCat = categories.find(c => c.subcategories?.some(s => s.id === parseInt(val)));
                                    if (parentCat) setFilterCategory(parentCat.id.toString());
                                }
                            }}
                            className="flex-1 py-3 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors shadow-sm appearance-none"
                        >
                            <option value="">{t('allSubcategories', 'Sous-catégories')}</option>
                            {getFilterSubcategories().map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button type="button" onClick={handleCreateSubcategory} disabled={!filterCategory} className="p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-800/60 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed border border-blue-100 dark:border-blue-800" title="Nouvelle sous-catégorie">
                            <FiPlus />
                        </button>
                    </div>
                </div>
            </div>

            {/* Products Display */}
            <div className="hidden lg:block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest">{t('image') || 'Img'}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest">{t('barcode')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest">{t('name')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest">{t('category')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest">{t('subcategory') || 'Subcategory'}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest">{t('stock')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest">{t('reorderLevel')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest text-right">{t('purchasePrice', 'Purchase Price')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest text-right">{t('totalPurchasePrice', 'Total Purchase')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center">{t('tvaPercent', 'Tax (%)')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center">{t('remise', 'Discount (%)')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest text-right">{t('unitSellingPrice', 'Selling Unit')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest text-right">{t('totalSellingPrice', 'Total Selling')}</th>
                                <th className="p-4 font-black uppercase text-[10px] tracking-widest text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 transition-colors">
                            {loading ? (
                                <tr><td colSpan="13" className="p-8 text-center text-gray-500 font-bold">{t('loadingProducts')}</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="13" className="p-8 text-center text-gray-500 font-bold">{t('noProductsFound')}</td></tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl.startsWith('http') ? product.imageUrl : `${API_URL}${product.imageUrl}`}
                                                        alt={product.name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                    />
                                                ) : null}
                                                <span className="text-[10px] font-bold text-gray-400 items-center justify-center" style={{ display: product.imageUrl ? 'none' : 'flex' }}>
                                                    {product.name.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono text-xs">{product.barcode}</td>
                                        <td className="p-4 text-gray-900 dark:text-white font-bold">{product.name}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase border border-blue-100 dark:border-blue-500/20">
                                                {product.category?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 text-[10px] font-black uppercase border border-purple-100 dark:border-purple-500/20">
                                                {product.subcategory?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${product.stockQuantity <= Number(product.reorderLevel) ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400'}`}>
                                                {product.stockQuantity}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold border border-gray-100 dark:border-gray-700">
                                                {Number(product.reorderLevel).toFixed(0)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-gray-600 dark:text-gray-400 font-bold">
                                            {formatCurrency(Number(product.purchasePrice || 0))}
                                        </td>
                                        <td className="p-4 text-right text-gray-800 dark:text-gray-200 font-black">
                                            {formatCurrency(Number(product.purchasePrice || 0) * product.stockQuantity)}
                                        </td>
                                        <td className="p-4 text-center font-bold text-gray-600 dark:text-gray-400">
                                            {product.tva || 0}%
                                        </td>
                                        <td className="p-4 text-center font-bold text-gray-600 dark:text-gray-400">
                                            {product.remise || 0}%
                                        </td>
                                        <td className="p-4 text-right text-blue-600 dark:text-blue-400 font-black">
                                            {formatCurrency(((Number(product.price) * (1 - (product.remise || 0) / 100)) * (1 + (product.tva || 0) / 100)))}
                                        </td>
                                        <td className="p-4 text-right text-green-600 dark:text-green-400 font-black">
                                            {formatCurrency(((Number(product.price) * (1 - (product.remise || 0) / 100)) * (1 + (product.tva || 0) / 100)) * product.stockQuantity)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => handleOpenModal(product)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors" title={t('edit')}><FiEdit2 size={16} /></button>
                                                <button onClick={() => handleDelete(product.id, product.name)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors" title={t('delete')}><FiTrash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest animate-pulse">{t('loading')}...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-500 font-bold uppercase tracking-widest">{t('noProductsFound')}</div>
                ) : (
                    filteredProducts.map(product => (
                        <div key={product.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm flex flex-col gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl.startsWith('http') ? product.imageUrl : `${API_URL}${product.imageUrl}`}
                                            alt={product.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <span className="text-sm font-black text-gray-400">{product.name.substring(0, 2).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-black text-gray-900 dark:text-white truncate">{product.name}</h4>
                                    <p className="text-[10px] font-mono text-gray-500 mt-1">{product.barcode}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase">
                                            {product.category?.name || '-'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${product.stockQuantity <= Number(product.reorderLevel) ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400'}`}>
                                            Stock: {product.stockQuantity}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold border border-gray-100 dark:border-gray-700">
                                            {t('reorderLevel')}: {Number(product.reorderLevel).toFixed(0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                                <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                                    {formatCurrency(((Number(product.price) * (1 - (product.remise || 0) / 100)) * (1 + (product.tva || 0) / 100)))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(product)} className="p-3 bg-gray-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-xl transition-all border border-gray-200 dark:border-gray-700"><FiEdit2 size={18} /></button>
                                    <button onClick={() => handleDelete(product.id, product.name)} className="p-3 bg-gray-50 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-xl transition-all border border-gray-200 dark:border-gray-700"><FiTrash2 size={18} /></button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Product Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 100 }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl transition-colors max-h-[90vh] flex flex-col"
                        >
                            <div className="p-6 lg:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
                                <h3 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{isEditing ? t('editProduct') : t('addNewProduct')}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <FiX size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('barcode')}</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    ref={barcodeInputRef}
                                                    required type="text" pattern="\d{12,13}" title="Barcode must be strictly EAN-13 (13 digits) or UPC-A (12 digits)"
                                                    className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 pr-10 text-gray-900 dark:text-white outline-none transition-all font-mono ${isEditing ? 'opacity-60 cursor-not-allowed' : 'focus:border-blue-500 dark:focus:border-blue-400'}`}
                                                    value={formData.barcode}
                                                    onChange={e => setFormData({ ...formData, barcode: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                                                    disabled={isEditing}
                                                />
                                                {!isEditing && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            setScannerTarget('form');
                                                            setIsCameraScannerOpen(true);
                                                        }}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600 transition-colors"
                                                    >
                                                        <FiCamera size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('stock')}</label>
                                        <input required type="number" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('safetyStock')}</label>
                                        <input type="number" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.safetyStock} onChange={e => setFormData({ ...formData, safetyStock: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('productName')}</label>
                                    <input required type="text" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">
                                            {t('purchasePrice')} ({currency})
                                        </label>
                                        <input type="number" step="0.001" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">
                                            {t('sellingPriceHT')} ({currency})
                                        </label>
                                        <input required type="number" step="0.001" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('currency', 'Currency')}</label>
                                    <select 
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all appearance-none"
                                        value={currency} 
                                        onChange={e => {
                                            const newCur = e.target.value;
                                            const rate = (exchangeRates && exchangeRates[currency]) ? exchangeRates[currency] : 1;
                                            const newRate = (exchangeRates && exchangeRates[newCur]) ? exchangeRates[newCur] : 1;
                                            
                                            // Conversion to keep input consistent
                                            setFormData(prev => ({
                                                ...prev,
                                                price: (parseFloat(prev.price || 0) / rate * newRate).toFixed(3),
                                                purchasePrice: prev.purchasePrice ? (parseFloat(prev.purchasePrice) / rate * newRate).toFixed(3) : ''
                                            }));
                                            
                                            changeCurrency(newCur);
                                        }}
                                    >
                                        {Object.keys(exchangeRates || { USD: 1 }).map(cur => (
                                            <option key={cur} value={cur}>{cur}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('remise', 'Remise')} (%)</label>
                                        <input type="number" step="1" max="100" min="0" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.remise} onChange={e => setFormData({ ...formData, remise: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('tvaPercent', 'TVA')} (%)</label>
                                        <input type="number" step="0.01" max="100" min="0" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.tva} onChange={e => setFormData({ ...formData, tva: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('category')}</label>
                                        <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all appearance-none"
                                            value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}>
                                            <option value="">{t('selectCategory')}</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('subcategory')}</label>
                                        <select className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all appearance-none"
                                            value={formData.subcategoryId}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const parentCat = val ? categories.find(c => c.subcategories?.some(s => s.id === parseInt(val))) : null;
                                                setFormData({ 
                                                    ...formData, 
                                                    subcategoryId: val,
                                                    categoryId: parentCat ? parentCat.id.toString() : formData.categoryId
                                                });
                                            }}>
                                            <option value="">{t('selectSubcategory')}</option>
                                            {getSubcategories().map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('productImage')}</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                                            {imagePreview ? (
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.querySelector('.img-fallback').style.display = 'flex'; }}
                                                />
                                            ) : null}
                                            <FiCamera
                                                size={24}
                                                className={`text-gray-400 img-fallback ${imagePreview ? 'hidden' : 'block'}`}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                id="product-image"
                                                className="hidden" 
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setImageFile(file);
                                                        setImagePreview(URL.createObjectURL(file));
                                                    }
                                                }}
                                            />
                                            <label 
                                                htmlFor="product-image"
                                                className="cursor-pointer px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-bold transition-all border border-gray-200 dark:border-gray-700 inline-block"
                                            >
                                                {t('chooseFile') || 'Choisir un fichier'}
                                            </label>
                                            <p className="text-[10px] text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none px-8 py-3 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">{t('cancel', 'Annuler')}</button>
                                    <button type="submit" className="flex-[2] sm:flex-none px-10 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
                                        {isEditing ? t('save', 'Enregistrer') : t('add', 'Ajouter')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Camera Scanner Modal */}
            <CameraScannerModal
                isOpen={isCameraScannerOpen}
                onClose={() => setIsCameraScannerOpen(false)}
                onScan={(decodedText) => {
                    if (scannerTarget === 'search') {
                        setSearchTerm(decodedText);
                    } else {
                        setFormData(prev => ({ ...prev, barcode: decodedText }));
                    }
                    setIsCameraScannerOpen(false);
                }}
            />
        </div>
    );
};

export default Products;
