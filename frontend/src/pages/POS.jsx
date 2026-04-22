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

const POS = () => {
    const { t } = useTranslation();
    const { currency, exchangeRates, formatCurrency } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState({ items: [], totalAmount: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [barcodeInput, setBarcodeInput] = useState('');
    const barcodeInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [completedSale, setCompletedSale] = useState(null);
    const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

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

    const handleBarcodeSubmit = async (e) => {
        if (e) e.preventDefault();
        const scannedCode = barcodeInput.trim();
        await processBarcodeScanned(scannedCode);
    };

    const processBarcodeScanned = async (scannedCode) => {
        if (!scannedCode) return;
        const foundProduct = products.find(p => p.barcode === scannedCode);

        if (foundProduct) {
            await handleAddToCart(foundProduct);
        } else {
            alert(t('productNotFound', 'Product not found for barcode: ') + scannedCode);
        }

        setBarcodeInput('');
        barcodeInputRef.current?.focus();
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
            const rate = (exchangeRates && exchangeRates[currency]) ? exchangeRates[currency] : 1;
            const response = await processCheckout(paymentMethod, currency, rate);
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

    const filteredProducts = products.filter(p => {
        const matchesName = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBarcode = barcodeInput.trim() === '' || p.barcode.includes(barcodeInput.trim());
        return matchesName && matchesBarcode;
    });

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
            {/* LEFT SIDE: PRODUCT GRID */}
            <div className="w-2/3 p-6 flex flex-col border-r border-gray-200 dark:border-gray-800 transition-colors">
                <div className="flex flex-col mb-6 space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FiMonitor className="text-blue-600 dark:text-blue-400" /> {t('posTerminal')}
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* 1. Barcode Scanner Input */}
                        <div className="flex flex-1 gap-2">
                            <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
                                <FiBox className="absolute left-4 top-1/2 transform -translate-y-1/2 text-green-500" />
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    placeholder={t('scanBarcodeToCart', 'Scan Barcode (Auto-Add)')}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-800 focus:border-green-500 dark:focus:border-green-500 rounded-xl outline-none transition-all text-gray-900 dark:text-white font-mono shadow-sm"
                                    value={barcodeInput}
                                    onChange={e => setBarcodeInput(e.target.value)}
                                    autoFocus
                                />
                            </form>
                            <button
                                onClick={() => setIsCameraScannerOpen(true)}
                                className="p-3 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded-xl transition-all shadow-sm border border-green-200 dark:border-green-700 flex items-center justify-center transform active:scale-95"
                                title={t('scanWithCamera', 'Scan with Camera')}
                            >
                                <FiCamera size={22} />
                            </button>
                        </div>

                        {/* 2. Manual Search Input */}
                        <div className="relative flex-1">
                            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('searchByName', 'Search by product name...')}
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-white shadow-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
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
                                {/* Image / Placeholder */}
                                <div className="h-24 bg-gray-100 dark:bg-gray-900 rounded-lg mb-3 flex items-center justify-center relative transition-colors overflow-hidden">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl.startsWith('http') ? product.imageUrl : `${API_URL}${product.imageUrl}`}
                                            alt={product.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <span className="text-2xl font-bold text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                            {product.name.substring(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                    {product.remise > 0 && (
                                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg shadow-red-500/30">
                                            -{product.remise}%
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-bold text-lg mb-2 truncate text-gray-900 dark:text-white text-center">{product.name}</h3>

                                <div className="flex justify-center mb-3">
                                    <div className="bg-white px-3 py-1 rounded-lg">
                                        <Barcode value={product.barcode} width={1.2} height={35} fontSize={12} margin={0} background="transparent" />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                                            {formatCurrency(((product.price * (1 - (product.remise || 0) / 100)) * (1 + (product.tva || 0) / 100)))}
                                        </span>
                                        {product.remise > 0 && (
                                            <span className="text-gray-400 text-xs line-through">
                                                {formatCurrency((Number(product.price) * (1 + (product.tva || 0) / 100)))}
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
                        <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl flex justify-between items-center border border-gray-100 dark:border-gray-700 transition-colors gap-3">
                            {/* Product thumbnail */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0">
                                {item.product.imageUrl ? (
                                    <img
                                        src={item.product.imageUrl.startsWith('http') ? item.product.imageUrl : `${API_URL}${item.product.imageUrl}`}
                                        alt={item.product.name}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <span className="text-xs font-black text-gray-400">{item.product.name.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold flex items-center gap-1 flex-wrap text-gray-900 dark:text-white text-sm">
                                    <span className="truncate">{item.product.name}</span>
                                    {item.product.remise > 0 && (
                                        <span className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                                            -{item.product.remise}%
                                        </span>
                                    )}
                                    {item.tvaRate > 0 && (
                                        <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                                            TVA {item.tvaRate}%
                                        </span>
                                    )}
                                </h4>
                                <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                                    {formatCurrency(((item.product.price * (1 - (item.product.remise || 0) / 100)) * (1 + (item.tvaRate || 0) / 100)))}
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
                    <div className="flex justify-between items-center mb-2 text-gray-500 dark:text-gray-400 font-medium text-sm">
                        <span>{t('subtotal')} (HT)</span>
                        <span>{formatCurrency(Number(cart.subtotalHT || 0))}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4 text-gray-500 dark:text-gray-400 font-medium text-sm">
                        <span>TVA</span>
                        <span>{formatCurrency(Number(cart.tvaAmount || 0))}</span>
                    </div>
                    <div className="flex justify-between items-center mb-6 text-2xl font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 pt-4">
                        <span>{t('total')}</span>
                        <span>{formatCurrency(Number(cart.totalAmount || 0))}</span>
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

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                cart={cart}
                onConfirm={handlePaymentConfirm}
            />

            {/* Hidden Receipt for Printing */}
            <Receipt sale={completedSale} />

            {/* Camera Scanner Modal */}
            <CameraScannerModal
                isOpen={isCameraScannerOpen}
                onClose={() => setIsCameraScannerOpen(false)}
                onScan={handleCameraScan}
            />
        </div>
    );
};

export default POS;
