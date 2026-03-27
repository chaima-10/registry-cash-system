import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX, FiCamera } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import CameraScannerModal from '../components/CameraScannerModal';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import { getAllCategories } from '../api/categories';
import Barcode from 'react-barcode';

import { useTranslation } from 'react-i18next';

const Products = () => {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSubcategory, setFilterSubcategory] = useState('');

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProductId, setCurrentProductId] = useState(null);
    const [formData, setFormData] = useState({
        barcode: '', name: '', price: '', stockQuantity: '', categoryId: '', subcategoryId: '', remise: ''
    });

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
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.barcode.includes(searchTerm);
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

    const handleOpenModal = (product = null) => {
        if (product) {
            setIsEditing(true);
            setCurrentProductId(product.id);
            setFormData({
                barcode: product.barcode,
                name: product.name,
                price: product.price,
                stockQuantity: product.stockQuantity,
                categoryId: product.categoryId || '',
                subcategoryId: product.subcategoryId || '',
                remise: product.remise || ''
            });
        } else {
            setIsEditing(false);
            setCurrentProductId(null);
            setFormData({ barcode: '', name: '', price: '', stockQuantity: '', categoryId: '', subcategoryId: '', remise: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateProduct(currentProductId, formData);
            } else {
                await createProduct(formData);
            }
            setIsModalOpen(false);
            fetchData(); // Refresh list
        } catch (error) {
            alert(`Failed to ${isEditing ? 'update' : 'create'} product: ` + (error.response?.data?.message || error.message));
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            try {
                await deleteProduct(id);
                fetchData();
            } catch (error) {
                alert("Failed to delete product: " + (error.response?.data?.message || error.message));
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
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('productManagement')}</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg shadow-blue-500/30 font-bold"
                >
                    <FiPlus /> {t('addProduct')}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 flex gap-2">
                    <div className="relative w-full">
                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setIsCameraScannerOpen(true)}
                        className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center transform active:scale-95"
                        title={t('scanWithCamera', 'Scan with Camera')}
                    >
                        <FiCamera size={22} />
                    </button>
                </div>
                <div className="flex gap-4">
                    <select
                        value={filterCategory}
                        onChange={(e) => { setFilterCategory(e.target.value); setFilterSubcategory(''); }}
                        className="py-3 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                    >
                        <option value="">{t('allCategories')}</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

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
                        className="py-3 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                    >
                        <option value="">{t('allSubcategories')}</option>
                        {getFilterSubcategories().map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                                <th className="p-4 font-bold uppercase text-xs tracking-wider">{t('barcode')}</th>
                                <th className="p-4 font-bold uppercase text-xs tracking-wider">{t('name')}</th>
                                <th className="p-4 font-bold uppercase text-xs tracking-wider">{t('category')}</th>
                                <th className="p-4 font-bold uppercase text-xs tracking-wider">{t('subcategory')}</th>
                                <th className="p-4 font-bold uppercase text-xs tracking-wider">{t('stock')}</th>
                                <th className="p-4 font-bold uppercase text-xs tracking-wider text-right">{t('price')}</th>
                                <th className="p-4 font-bold uppercase text-xs tracking-wider text-right">{t('remise') || 'Remise'} %</th>
                                <th className="p-4 font-bold uppercase text-xs tracking-wider text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 transition-colors">
                            {loading ? (
                                <tr><td colSpan="8" className="p-8 text-center text-gray-500">{t('loadingProducts')}</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="8" className="p-8 text-center text-gray-500">{t('noProductsFound')}</td></tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="bg-white px-2 py-1 rounded inline-block">
                                                <Barcode value={product.barcode} width={1} height={25} fontSize={10} margin={0} background="transparent" />
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-900 dark:text-white font-medium">{product.name}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-100 dark:border-blue-500/20">
                                                {product.category?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {product.subcategory?.name ? (
                                                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-gray-700">
                                                    {product.subcategory.name}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${product.stockQuantity < 10 ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-500/20 text-green-600 dark:text-green-400'}`}>
                                                {product.stockQuantity}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-gray-700 dark:text-gray-300 font-medium">${Number(product.price).toFixed(2)}</td>
                                        <td className="p-4 text-right text-green-600 dark:text-green-400 font-bold">
                                            {product.remise ? `${product.remise}%` : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-1">
                                                <button
                                                    onClick={() => handleOpenModal(product)}
                                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                                    title={t('edit')}
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                                    title={t('delete')}
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Product Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transition-colors"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 transition-colors">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{isEditing ? t('editProduct') : t('addNewProduct')}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                    <FiX size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('barcode')}</label>
                                        <input required type="text" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} disabled={isEditing} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('stock')}</label>
                                        <input required type="number" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('productName')}</label>
                                    <input required type="text" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">{t('price')} ($)</label>
                                        <input required type="number" step="0.01" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-400">Remise (%)</label>
                                        <input type="number" step="1" max="100" min="0" className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all"
                                            value={formData.remise} onChange={e => setFormData({ ...formData, remise: e.target.value })} />
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

                                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 mt-4 active:scale-95">
                                    {isEditing ? t('updateProduct') : t('createProduct')}
                                </button>
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
                    setSearchTerm(decodedText);
                    setIsCameraScannerOpen(false);
                }}
            />
        </div>
    );
};

export default Products;
