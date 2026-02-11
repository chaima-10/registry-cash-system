import { useState, useEffect } from 'react';
import { FiSearch, FiShoppingCart, FiPlus, FiMinus, FiTrash2, FiMonitor, FiPrinter } from 'react-icons/fi';
import { getAllProducts } from '../api/products';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../api/cart';
import { processCheckout } from '../api/sales';
import PaymentModal from '../components/PaymentModal';
import Receipt from '../components/Receipt';

const POS = () => {
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
            alert(error.response?.data?.message || "Failed to add to cart");
        }
    };

    const handleUpdateQuantity = async (itemId, newQuantity) => {
        try {
            const updatedCart = await updateCartItem(itemId, newQuantity);
            setCart(updatedCart);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to update quantity");
        }
    };

    const handleRemoveItem = async (itemId) => {
        try {
            const updatedCart = await removeFromCart(itemId);
            setCart(updatedCart);
        } catch (error) {
            alert(error.response?.data?.message || "Failed to remove item");
        }
    };

    const handleClearCart = async () => {
        if (window.confirm("Are you sure you want to clear the cart?")) {
            try {
                await clearCart();
                setCart({ items: [], totalAmount: 0 });
            } catch (error) {
                alert(error.response?.data?.message || "Failed to clear cart");
            }
        }
    };

    const handleCheckout = () => {
        if (!cart.items || cart.items.length === 0) {
            alert('Cart is empty!');
            return;
        }
        setShowPaymentModal(true);
    };

    const handlePaymentConfirm = async (paymentMethod) => {
        try {
            const response = await processCheckout(paymentMethod);
            setShowPaymentModal(false);
            setCompletedSale(response.sale); // Store the sale data for printing
            alert('Payment successful!');
            await fetchData(); // Refresh data
        } catch (error) {
            alert(error.response?.data?.message || 'Payment failed');
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
        <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
            {/* LEFT SIDE: PRODUCT GRID */}
            <div className="w-2/3 p-6 flex flex-col border-r border-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FiMonitor /> POS Terminal
                    </h2>
                    <div className="relative w-1/2">
                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Scan barcode or search..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-3 gap-4 pb-20">
                    {loading ? (
                        <p className="col-span-3 text-center text-gray-500 mt-10">Loading products...</p>
                    ) : filteredProducts.length === 0 ? (
                        <p className="col-span-3 text-center text-gray-500 mt-10">No products found.</p>
                    ) : (
                        filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => handleAddToCart(product)}
                                className="bg-gray-800 p-4 rounded-xl cursor-pointer hover:bg-gray-700 transition-all border border-gray-700 hover:border-blue-500 group"
                            >
                                <div className="h-24 bg-gray-900 rounded-lg mb-3 flex items-center justify-center text-gray-600 group-hover:text-blue-400">
                                    <span className="text-2xl font-bold">{product.name.substring(0, 2).toUpperCase()}</span>
                                </div>
                                <h3 className="font-bold text-lg mb-1 truncate">{product.name}</h3>
                                <p className="text-gray-400 text-sm mb-2">{product.barcode}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-400 font-bold">${Number(product.price).toFixed(2)}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${product.stockQuantity > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {product.stockQuantity} in stock
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: CART */}
            <div className="w-1/3 bg-gray-800 flex flex-col shadow-2xl z-10">
                <div className="p-6 border-b border-gray-700 bg-gray-800/50 backdrop-blur">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FiShoppingCart /> Current Order
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">{cart.items?.length || 0} items</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.items?.map(item => (
                        <div key={item.id} className="bg-gray-900 p-4 rounded-xl flex justify-between items-center border border-gray-700">
                            <div>
                                <h4 className="font-bold">{item.product.name}</h4>
                                <p className="text-blue-400 text-sm">${Number(item.product.price).toFixed(2)}</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    className="p-2 bg-gray-800 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                >
                                    {item.quantity === 1 ? <FiTrash2 size={14} /> : <FiMinus size={14} />}
                                </button>
                                <span className="font-mono w-6 text-center">{item.quantity}</span>
                                <button
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    className="p-2 bg-gray-800 rounded-lg hover:bg-blue-500/20 hover:text-blue-400 transition-colors"
                                >
                                    <FiPlus size={14} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {(!cart.items || cart.items.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                            <FiShoppingCart size={48} className="mb-4" />
                            <p>Cart is empty</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-900 border-t border-gray-700">
                    <div className="flex justify-between items-center mb-4 text-gray-400">
                        <span>Subtotal</span>
                        <span>${Number(cart.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-6 text-2xl font-bold text-white">
                        <span>Total</span>
                        <span>${Number(cart.totalAmount).toFixed(2)}</span>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleClearCart}
                                className="py-4 rounded-xl bg-gray-800 hover:bg-red-500/20 text-red-400 font-bold transition-all border border-gray-700"
                            >
                                Cancel
                            </button>
                            <button className="py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 transition-all" onClick={handleCheckout}>
                                Pay Now
                            </button>
                        </div>

                        {completedSale && (
                            <button
                                onClick={handlePrintTicket}
                                className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <FiPrinter size={20} />
                                Print Ticket
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
