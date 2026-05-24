import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiShoppingCart, FiPlus, FiMinus, FiTrash2, FiMonitor, FiPrinter, FiBox, FiCamera } from 'react-icons/fi';
import Barcode from 'react-barcode';
import CameraScannerModal from '../components/CameraScannerModal';
import { getAllProducts } from '../api/products';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../api/cart';
import { processCheckout } from '../api/sales';
import PaymentModal from '../components/PaymentModal';
import Receipt from '../components/Receipt';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const POS = () => {
    const { t } = useTranslation();
    const { currency, exchangeRates, formatCurrency } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState({ items: [], totalAmount: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [completedSale, setCompletedSale] = useState(null);
    const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
    const [editingQuantityItemId, setEditingQuantityItemId] = useState(null);
    const [editingQuantityValue, setEditingQuantityValue] = useState('');

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
            toast.error(error.response?.data?.message || t('failedAddToCart'));
        }
    };

    const handleBarcodeSubmit = async (e) => {
        if (e) e.preventDefault();
        await processBarcodeScanned(searchTerm.trim());
    };

    const processBarcodeScanned = async (scannedCode) => {
        if (!scannedCode) return;
        const foundProduct = products.find(p => p.barcode === scannedCode);

        if (foundProduct) {
            await handleAddToCart(foundProduct);
            setSearchTerm(''); // Clear search field after successful scan
        } else {
            toast.error(t('productNotFound', 'Product not found for barcode: ') + scannedCode);
        }
    };

    const handleCameraScan = async (decodedText) => {
        setIsCameraScannerOpen(false);
        await processBarcodeScanned(decodedText);
    };

    const handleUpdateQuantity = async (itemId, newQuantity) => {
        try {
            const updatedCart = await updateCartItem(itemId, newQuantity);
            setCart(updatedCart);
        } catch (error) {
            toast.error(error.response?.data?.message || t('failedUpdateQuantity'));
        }
    };

    const handleQuantityEditCommit = async (itemId) => {
        const parsed = parseInt(editingQuantityValue, 10);
        setEditingQuantityItemId(null);
        if (!parsed || parsed < 1) return;
        await handleUpdateQuantity(itemId, parsed);
    };

    const handleRemoveItem = async (itemId) => {
        try {
            const updatedCart = await removeFromCart(itemId);
            setCart(updatedCart);
        } catch (error) {
            toast.error(error.response?.data?.message || t('failedRemoveItem'));
        }
    };

    const handleClearCart = async () => {
        if (window.confirm(t('clearCartConfirm'))) {
            try {
                await clearCart();
                setCart({ items: [], totalAmount: 0 });
            } catch (error) {
                toast.error(error.response?.data?.message || t('failedClearCart'));
            }
        }
    };

    const handleCheckout = () => {
        if (!cart.items || cart.items.length === 0) {
            toast.error(t('cartIsEmpty'));
            return;
        }
        setShowPaymentModal(true);
    };

    const handlePaymentConfirm = async (method, paymentData) => {
        try {
            const rate = (exchangeRates && exchangeRates[currency]) ? exchangeRates[currency] : 1;
            const checkoutPromise = processCheckout({
                paymentMethod: method,
                currency,
                exchangeRate: rate,
                amountTendered: paymentData.cashTendered,
                changeAmount: paymentData.change,
                voucherQR: paymentData.voucherQR
            });

            const response = await toast.promise(checkoutPromise, {
                loading: t('processingPayment', 'Traitement du paiement...'),
                success: t('paymentSuccessful', 'Paiement réussi !'),
                error: (err) => err.response?.data?.message || t('paymentFailed', 'Paiement échoué')
            });

            setShowPaymentModal(false);
            setCompletedSale(response.sale);
            await fetchData();
        } catch (error) {
            console.error("Checkout failed:", error);
        }
    };

    const handlePrintTicket = () => {
        if (completedSale) {
            window.print();
        }
    };

    const filteredProducts = products.filter(p => {
        return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'cart' for mobile

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:white overflow-hidden transition-colors duration-300">
            
            {/* Products Section */}
            <div className={`flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-gray-800 transition-colors ${activeTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 lg:p-6 flex flex-col space-y-4">
                    <div className="flex items-center justify-between lg:justify-start gap-2">
                        <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
                            <FiMonitor className="text-blue-600 dark:text-blue-400" /> {t('posTerminal')}
                        </h2>
                        <button 
                            onClick={() => setActiveTab('cart')}
                            className="lg:hidden relative p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"
                        >
                            <FiShoppingCart size={20} />
                            {cart.items?.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                    {cart.items.length}
                                </span>
                            )}
                        </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 flex gap-2">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t('searchByName', 'Search by name...')}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900 focus:border-blue-500 rounded-xl outline-none transition-all text-gray-900 dark:text-white shadow-sm text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleBarcodeSubmit(e); }}
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={() => setIsCameraScannerOpen(true)}
                                className="p-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 rounded-xl transition-all shadow-sm border border-blue-200 dark:border-blue-800 flex items-center justify-center transform active:scale-95"
                                title={t('scanWithCamera', 'Scan with Camera')}
                            >
                                <FiCamera size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 lg:px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4 pb-24 lg:pb-6 custom-scrollbar">
                    {loading ? (
                        <p className="col-span-full text-center text-gray-500 mt-10">{t('loadingProducts')}</p>
                    ) : filteredProducts.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500 mt-10">{t('noProductsFound')}</p>
                    ) : (
                        filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => handleAddToCart(product)}
                                className="bg-white dark:bg-gray-800 p-3 lg:p-4 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 group shadow-sm hover:shadow-md flex flex-col"
                            >
                                <div className="h-16 md:h-20 lg:h-24 bg-gray-100 dark:bg-gray-900 rounded-lg mb-2 lg:mb-3 flex items-center justify-center relative transition-colors overflow-hidden shrink-0">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl.startsWith('http') ? product.imageUrl : `${API_URL}${product.imageUrl}`}
                                            alt={product.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <span className="text-xl lg:text-2xl font-bold text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                            {product.name.substring(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                    {product.remise > 0 && (
                                        <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] lg:text-xs font-bold px-1.5 lg:py-1 rounded-full shadow-lg">
                                            -{product.remise}%
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-bold text-sm lg:text-base mb-1 truncate text-gray-900 dark:text-white text-center">{product.name}</h3>

                                <div className="hidden sm:flex justify-center mb-2">
                                    <div className="bg-white px-2 py-0.5 rounded-md">
                                        <Barcode value={product.barcode} width={0.8} height={25} fontSize={8} margin={0} background="transparent" />
                                    </div>
                                </div>

                                <div className="flex flex-col lg:flex-row justify-between items-center gap-1 mt-auto">
                                    <div className="flex flex-col items-center lg:items-start">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs lg:text-sm">
                                            {formatCurrency(((product.price * (1 - (product.remise || 0) / 100)) * (1 + (product.tva || 0) / 100)))}
                                        </span>
                                        {product.remise > 0 && (
                                            <span className="text-gray-400 text-[10px] line-through">
                                                {formatCurrency((Number(product.price) * (1 + (product.tva || 0) / 100)))}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[9px] lg:text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                        product.stockQuantity <= 0 
                                            ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' 
                                            : product.stockQuantity <= Number(product.reorderLevel || 5)
                                                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                                                : 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'
                                    }`}>
                                        {product.stockQuantity > 0 ? `${product.stockQuantity}` : 'Out'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Cart Section */}
            <div className={`w-full lg:w-[400px] bg-white dark:bg-gray-900 flex flex-col shadow-2xl z-10 border-l border-gray-200 dark:border-gray-800 transition-colors h-full ${activeTab === 'products' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-3 lg:p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur transition-colors flex items-center justify-between">
                    <div>
                        <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                            <FiShoppingCart className="text-blue-600 dark:text-blue-400" /> {t('currentOrder')}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cart.items?.length || 0} {t('items')}</p>
                    </div>
                    <button 
                        onClick={() => setActiveTab('products')}
                        className="lg:hidden p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500"
                    >
                        {t('back', 'Back')}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-2 custom-scrollbar">
                    {cart.items?.map(item => (
                        <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl flex justify-between items-center border border-gray-100 dark:border-gray-700 transition-colors gap-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0">
                                {item.product.imageUrl ? (
                                    <img
                                        src={item.product.imageUrl.startsWith('http') ? item.product.imageUrl : `${API_URL}${item.product.imageUrl}`}
                                        alt={item.product.name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <span className="text-[10px] font-black text-gray-400">{item.product.name.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold flex items-center gap-1 flex-wrap text-gray-900 dark:text-white text-[10px] lg:text-xs">
                                    <span className="truncate max-w-[80px] sm:max-w-none">{item.product.name}</span>
                                    {item.product.remise > 0 && (
                                        <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[8px] px-1 py-0.5 rounded-md font-bold shrink-0">
                                            -{item.product.remise}%
                                        </span>
                                    )}
                                </h4>
                                <p className="text-blue-600 dark:text-blue-400 text-[10px] lg:text-xs font-medium">
                                    {formatCurrency(((item.product.price * (1 - (item.product.remise || 0) / 100)) * (1 + (item.tvaRate || 0) / 100)))}
                                </p>
                            </div>

                            <div className="flex items-center gap-1 lg:gap-2">
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 lg:p-1 border border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => item.quantity > 1 ? handleUpdateQuantity(item.id, item.quantity - 1) : handleRemoveItem(item.id)}
                                        className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 transition-all"
                                    >
                                        <FiMinus size={12} />
                                    </button>
                                    {editingQuantityItemId === item.id ? (
                                        <input
                                            type="number"
                                            min="1"
                                            className="font-mono w-8 lg:w-10 text-center text-gray-900 dark:text-white text-[10px] lg:text-xs font-black bg-white dark:bg-gray-700 border border-blue-400 rounded-md outline-none"
                                            value={editingQuantityValue}
                                            onChange={e => setEditingQuantityValue(e.target.value)}
                                            onBlur={() => handleQuantityEditCommit(item.id)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleQuantityEditCommit(item.id); }}
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="font-mono w-6 lg:w-8 text-center text-gray-900 dark:text-white text-[10px] lg:text-xs font-black cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                            onClick={() => { setEditingQuantityItemId(item.id); setEditingQuantityValue(String(item.quantity)); }}
                                        >
                                            {item.quantity}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                        className="p-1 hover:bg-white dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400 transition-all"
                                    >
                                        <FiPlus size={12} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="p-1.5 lg:p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                    <FiTrash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {(!cart.items || cart.items.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-50 py-10">
                            <FiShoppingCart size={32} className="mb-2" />
                            <p className="text-sm">{t('cartIsEmpty')}</p>
                        </div>
                    )}
                </div>

                <div className="p-3 lg:p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 transition-colors">
                    <div className="space-y-1 mb-3">
                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 font-medium text-[10px] uppercase tracking-wider">
                            <span>{t('subtotal')} (HT)</span>
                            <span>{formatCurrency(cart.items?.length > 0 ? Number(cart.subtotalHT || 0) : 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 font-medium text-[10px] uppercase tracking-wider">
                            <span>{t('TVA')}</span>
                            <span>{formatCurrency(cart.items?.length > 0 ? Number(cart.tvaAmount || 0) : 0)}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center mb-4 text-lg lg:text-xl font-black text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 pt-3">
                        <span>{t('total')}</span>
                        <span>{formatCurrency(cart.items?.length > 0 ? Number(cart.totalAmount || 0) : 0)}</span>
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleClearCart}
                                className="py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 font-bold transition-all border border-gray-200 dark:border-gray-700 shadow-sm text-xs"
                            >
                                {t('clear')}
                            </button>
                            <button className="py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs" onClick={handleCheckout}>
                                {t('payNow')}
                            </button>
                        </div>

                        {completedSale && (
                            <button
                                onClick={handlePrintTicket}
                                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2 text-xs"
                            >
                                <FiPrinter size={16} />
                                {t('printTicket')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                cart={cart}
                onConfirm={handlePaymentConfirm}
            />

            <Receipt sale={completedSale} />

            <CameraScannerModal
                isOpen={isCameraScannerOpen}
                onClose={() => setIsCameraScannerOpen(false)}
                onScan={handleCameraScan}
            />
        </div>
    );
};

export default POS;
