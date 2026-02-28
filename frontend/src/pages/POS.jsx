import { useState, useEffect } from 'react';
import { FiSearch, FiShoppingCart, FiPlus, FiMinus, FiTrash2, FiMonitor, FiPrinter } from 'react-icons/fi';
import { getAllProducts } from '../api/products';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../api/cart';
import { processCheckout } from '../api/sales';
import PaymentModal from '../components/PaymentModal';
import Receipt from '../components/Receipt';
import { useTranslation } from 'react-i18next';

const POS = () => {
    const { t } = useTranslation();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState({ items: [], totalAmount: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [completedSale, setCompletedSale] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsData, cartData] = await Promise.all([
                getAllProducts(),
                getCart()
            ]);
            setProducts(productsData);
            setCart(cartData || { items: [], totalAmount: 0 });
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async (product) => {
        try {
            const updatedCart = await addToCart(product.id, 1);
            setCart(updatedCart);
        } catch (error) {
            alert(error.response?.data?.message || t('failedAddToCart'));
        }
    };

    const handleUpdateQuantity = async (itemId, newQuantity) => {
        try {
            const updatedCart = await updateCartItem(itemId, newQuantity);
            setCart(updatedCart);
        } catch (error) {
            alert(error.response?.data?.message || t('failedUpdateQuantity'));
        }
    };

    const handleRemoveItem = async (itemId) => {
        try {
            const updatedCart = await removeFromCart(itemId);
            setCart(updatedCart);
        } catch (error) {
            alert(error.response?.data?.message || t('failedRemoveItem'));
        }
    };

    const handleClearCart = async () => {
        if (window.confirm(t('clearCartConfirm'))) {
            try {
                await clearCart();
                setCart({ items: [], totalAmount: 0 });
            } catch (error) {
                alert(error.response?.data?.message || t('failedClearCart'));
            }
        }
    };

    const handleCheckout = () => {
        if (!cart.items || cart.items.length === 0) {
            alert(t('cartIsEmpty'));
            return;
        }
        setShowPaymentModal(true);
    };

    const handlePaymentConfirm = async (paymentMethod) => {
        try {
            const response = await processCheckout(paymentMethod);
            setShowPaymentModal(false);
            setCompletedSale(response.sale);
            alert(t('paymentSuccessful'));
            await fetchData();
        } catch (error) {
            alert(error.response?.data?.message || t('paymentFailed'));
        }
    };

    const handlePrintTicket = () => {
        if (completedSale) {
            window.print();
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm)
    );

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
            {/* LEFT SIDE: PRODUCT GRID */}
            <div className="w-2/3 p-6 flex flex-col border-r border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FiMonitor className="text-blue-600 dark:text-blue-400" /> {t('posTerminal')}
                    </h2>
                    <div className="relative w-1/2">
                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('scanBarcodeOrSearch')}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 custom-scrollbar">
                    {loading ? (
                        <p className="col-span-full text-center text-gray-500 mt-10">{t('loadingProducts')}</p>
                    ) : filteredProducts.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500 mt-10">{t('noProductsFound')}</p>
                    ) : (
                        filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => handleAddToCart(product)}
                                className="bg-white dark:bg-gray-800 p-4 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 group shadow-sm hover:shadow-md"
                            >
                                <div className="h-24 bg-gray-100 dark:bg-gray-900 rounded-lg mb-3 flex items-center justify-center text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 relative transition-colors">
                                    <span className="text-2xl font-bold">{product.name.substring(0, 2).toUpperCase()}</span>
                                    {product.remise > 0 && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg shadow-red-500/30">
                                            -{product.remise}%
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg mb-1 truncate text-gray-900 dark:text-white">{product.name}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{product.barcode}</p>
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                                            ${(product.price * (1 - (product.remise || 0) / 100)).toFixed(2)}
                                        </span>
                                        {product.remise > 0 && (
                                            <span className="text-gray-400 text-xs line-through">
                                                ${Number(product.price).toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${product.stockQuantity > 0 ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                                        {product.stockQuantity > 0 ? `${product.stockQuantity} ${t('inStock')}` : t('outOfStock')}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: CART */}
            <div className="w-1/3 bg-white dark:bg-gray-900 flex flex-col shadow-2xl z-10 border-l border-gray-200 dark:border-gray-800 transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur transition-colors">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <FiShoppingCart className="text-blue-600 dark:text-blue-400" /> {t('currentOrder')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cart.items?.length || 0} {t('items')}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {cart.items?.map(item => (
                        <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl flex justify-between items-center border border-gray-100 dark:border-gray-700 transition-colors">
                            <div>
                                <h4 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                    {item.product.name}
                                    {item.product.remise > 0 && (
                                        <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
                                            -{item.product.remise}%
                                        </span>
                                    )}
                                </h4>
                                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                                    ${(item.product.price * (1 - (item.product.remise || 0) / 100)).toFixed(2)}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/20 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                    {item.quantity === 1 ? <FiTrash2 size={14} /> : <FiMinus size={14} />}
                                </button>
                                <span className="font-mono w-6 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                                <button
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    <FiPlus size={14} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {(!cart.items || cart.items.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-50">
                            <FiShoppingCart size={48} className="mb-4" />
                            <p>{t('cartIsEmpty')}</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 transition-colors">
                    <div className="flex justify-between items-center mb-4 text-gray-500 dark:text-gray-400 font-medium">
                        <span>{t('subtotal')}</span>
                        <span>${Number(cart.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-6 text-2xl font-bold text-gray-900 dark:text-white">
                        <span>{t('total')}</span>
                        <span>${Number(cart.totalAmount).toFixed(2)}</span>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleClearCart}
                                className="py-4 rounded-xl bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 font-bold transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
                            >
                                {t('clear')}
                            </button>
                            <button className="py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 transition-all font-sans" onClick={handleCheckout}>
                                {t('payNow')}
                            </button>
                        </div>

                        {completedSale && (
                            <button
                                onClick={handlePrintTicket}
                                className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <FiPrinter size={20} />
                                {t('printTicket')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                totalAmount={Number(cart.totalAmount)}
                onConfirm={handlePaymentConfirm}
            />

            {/* Hidden Receipt for Printing */}
            <Receipt sale={completedSale} />
        </div>
    );
};

export default POS;
