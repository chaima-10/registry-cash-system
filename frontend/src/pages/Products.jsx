import { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import { getAllCategories } from '../api/categories';

import { useTranslation } from 'react-i18next';

const Products = () => {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentProductId, setCurrentProductId] = useState(null);
    const [formData, setFormData] = useState({
        barcode: '', name: '', price: '', stockQuantity: '', categoryId: '', subcategoryId: ''
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

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm)
    );

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
                subcategoryId: product.subcategoryId || ''
            });
        } else {
            setIsEditing(false);
            setCurrentProductId(null);
            setFormData({ barcode: '', name: '', price: '', stockQuantity: '', categoryId: '', subcategoryId: '' });
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
        if (!formData.categoryId) return [];
        const category = categories.find(c => c.id === parseInt(formData.categoryId));
        return category ? category.subcategories : [];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{t('productManagement')}</h2>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg shadow-blue-500/30"
                >
                    <FiPlus /> {t('addProduct')}
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                />
            </div>

            {/* Products Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800/50 text-gray-400 border-b border-gray-800">
                                <th className="p-4 font-medium">{t('barcode')}</th>
                                <th className="p-4 font-medium">{t('name')}</th>
                                <th className="p-4 font-medium">{t('category')}</th>
                                <th className="p-4 font-medium">{t('stock')}</th>
                                <th className="p-4 font-medium text-right">{t('price')}</th>
                                <th className="p-4 font-medium text-center">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">{t('loadingProducts')}</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">{t('noProductsFound')}</td></tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <tr key={product.id} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="p-4 text-gray-300 font-mono text-sm">{product.barcode}</td>
                                        <td className="p-4 text-white font-medium">{product.name}</td>
                                        <td className="p-4 text-gray-400">
                                            <span className="px-2 py-1 rounded-lg bg-gray-800 text-xs border border-gray-700">
                                                {product.category?.name || '-'} {product.subcategory ? `/ ${product.subcategory.name}` : ''}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${product.stockQuantity < 10 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {product.stockQuantity}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-gray-300">${Number(product.price).toFixed(2)}</td>
                                        <td className="p-4 flex justify-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(product)}
                                                className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id, product.name)}
                                                className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                            >
                                                <FiTrash2 />
                                            </button>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">{isEditing ? t('editProduct') : t('addNewProduct')}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><FiX size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('barcode')}</label>
                                        <input required type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                            value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} disabled={isEditing} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('stock')}</label>
                                        <input required type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                            value={formData.stockQuantity} onChange={e => setFormData({ ...formData, stockQuantity: e.target.value })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('productName')}</label>
                                    <input required type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('price')} ($)</label>
                                    <input required type="number" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                        value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('category')}</label>
                                        <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                            value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value, subcategoryId: '' })}>
                                            <option value="">{t('selectCategory')}</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">{t('subcategory')}</label>
                                        <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                            value={formData.subcategoryId} onChange={e => setFormData({ ...formData, subcategoryId: e.target.value })} disabled={!formData.categoryId}>
                                            <option value="">{t('selectSubcategory')}</option>
                                            {getSubcategories().map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
                                    {isEditing ? t('updateProduct') : t('createProduct')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Products;
