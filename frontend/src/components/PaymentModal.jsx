import { useState } from 'react';
import { FiX, FiCreditCard, FiDollarSign, FiGift } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const PaymentModal = ({ isOpen, onClose, totalAmount, onConfirm }) => {
    const [selectedMethod, setSelectedMethod] = useState('CASH');
    const [cashTendered, setCashTendered] = useState('');
    const [processing, setProcessing] = useState(false);

    const change = cashTendered ? parseFloat(cashTendered) - totalAmount : 0;

    const handleConfirm = async () => {
        if (selectedMethod === 'CASH' && change < 0) {
            alert('Insufficient cash tendered');
            return;
        }

        setProcessing(true);
        try {
            await onConfirm(selectedMethod);
            setCashTendered('');
            setSelectedMethod('CASH');
        } catch (error) {
            console.error('Payment error:', error);
        } finally {
            setProcessing(false);
        }
    };

    const paymentMethods = [
        { id: 'CASH', label: 'Cash', icon: FiDollarSign, color: 'green' },
        { id: 'CARD', label: 'Credit Card', icon: FiCreditCard, color: 'blue' },
        { id: 'VOUCHER', label: 'Gift Voucher', icon: FiGift, color: 'purple' }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl z-50 border border-gray-700"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">Payment</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <FiX className="text-gray-400" size={24} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Total Amount */}
                            <div className="bg-gray-900 p-4 rounded-xl">
                                <p className="text-gray-400 text-sm mb-1">Total Amount</p>
                                <p className="text-3xl font-bold text-white">${totalAmount.toFixed(2)}</p>
                            </div>

                            {/* Payment Method Selection */}
                            <div>
                                <p className="text-gray-400 text-sm mb-3">Select Payment Method</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {paymentMethods.map((method) => {
                                        const Icon = method.icon;
                                        const isSelected = selectedMethod === method.id;
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => setSelectedMethod(method.id)}
                                                className={`p-4 rounded-xl border-2 transition-all ${isSelected
                                                        ? `border-${method.color}-500 bg-${method.color}-500/10`
                                                        : 'border-gray-700 hover:border-gray-600 bg-gray-900'
                                                    }`}
                                            >
                                                <Icon className={`mx-auto mb-2 ${isSelected ? `text-${method.color}-400` : 'text-gray-400'}`} size={24} />
                                                <p className={`text-xs text-center ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                                    {method.label}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Cash Input */}
                            {selectedMethod === 'CASH' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <label className="text-gray-400 text-sm mb-2 block">Cash Tendered</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={cashTendered}
                                        onChange={(e) => setCashTendered(e.target.value)}
                                        placeholder="Enter amount..."
                                        className="w-full px-4 py-3 bg-gray-900 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-white"
                                    />
                                    {cashTendered && (
                                        <div className="mt-3 p-3 bg-gray-900 rounded-xl">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400">Change:</span>
                                                <span className={`font-bold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    ${Math.abs(change).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Card/Voucher Info */}
                            {(selectedMethod === 'CARD' || selectedMethod === 'VOUCHER') && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"
                                >
                                    <p className="text-blue-400 text-sm text-center">
                                        {selectedMethod === 'CARD'
                                            ? 'Card payment will be processed at the terminal'
                                            : 'Gift voucher code will be verified'}
                                    </p>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-700 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={processing || (selectedMethod === 'CASH' && change < 0)}
                                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-green-500/20 transition-all"
                            >
                                {processing ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PaymentModal;
