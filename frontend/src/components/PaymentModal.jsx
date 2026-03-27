import { useState } from 'react';
import { FiX, FiCreditCard, FiDollarSign, FiGift, FiCheck, FiCheckCircle, FiActivity } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const PaymentModal = ({ isOpen, onClose, totalAmount, onConfirm }) => {
    const { t } = useTranslation();
    const [selectedMethod, setSelectedMethod] = useState('CASH');
    const [cashTendered, setCashTendered] = useState('');
    const [processing, setProcessing] = useState(false);

    const amount = Number(totalAmount) || 0;
    const tendered = parseFloat(cashTendered) || 0;
    const change = tendered - amount;

    const handleConfirm = async () => {
        if (selectedMethod === 'CASH' && change < 0) {
            alert(t('insufficientCash') || 'Insufficient cash tendered');
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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    {/* Backdrop click to close */}
                    <div className="absolute inset-0" onClick={onClose} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden transition-colors"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 transition-colors">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('finalizePayment')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('selectMethodAndConfirm')}</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left: Summary */}
                                <div className="space-y-6">
                                    <div className="p-6 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 transition-colors">
                                        <p className="text-blue-600 dark:text-blue-400 font-bold mb-1 uppercase text-xs tracking-wider">{t('totalAmount')}</p>
                                        <p className="text-4xl font-black text-gray-900 dark:text-white">${amount.toFixed(2)}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('paymentMethod')}</label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {[
                                                { id: 'CASH', icon: FiDollarSign, label: t('cash'), color: 'text-green-500', bg: 'bg-green-500/10' },
                                                { id: 'VOUCHER', icon: FiGift, label: t('giftVoucher'), color: 'text-purple-500', bg: 'bg-purple-500/10' },
                                                { id: 'CARD', icon: FiCreditCard, label: t('creditCard'), color: 'text-blue-500', bg: 'bg-blue-500/10' }
                                            ].map((method) => (
                                                <button
                                                    key={method.id}
                                                    onClick={() => setSelectedMethod(method.id)}
                                                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selectedMethod === method.id
                                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-600/10 scale-[1.02] shadow-lg shadow-blue-500/10'
                                                            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500'
                                                        }`}
                                                >
                                                    <div className={`p-3 rounded-xl ${method.bg} ${method.color}`}>
                                                        <method.icon size={20} />
                                                    </div>
                                                    <span className={`font-bold ${selectedMethod === method.id ? 'text-gray-900 dark:text-white' : ''}`}>{method.label}</span>
                                                    {selectedMethod === method.id && <FiCheck className="ml-auto text-blue-600" size={20} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cash Input */}
                                    {selectedMethod === 'CASH' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <label className="block text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">{t('cashTendered') || 'Cash Tendered'}</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={cashTendered}
                                                onChange={(e) => setCashTendered(e.target.value)}
                                                placeholder={t('enterAmount')}
                                                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 transition-colors"
                                            />
                                            {cashTendered && (
                                                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-500 dark:text-gray-400">{t('change') || 'Change'}:</span>
                                                        <span className={`font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
                                            <p className="text-blue-600 dark:text-blue-400 text-sm text-center">
                                                {selectedMethod === 'CARD'
                                                    ? t('cardProcessMsg') || 'Card payment will be processed at the terminal'
                                                    : t('voucherProcessMsg') || 'Gift voucher code will be verified'}
                                            </p>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Right: Actions */}
                                <div className="flex flex-col justify-between space-y-8">
                                    <div className="space-y-4">
                                        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 transition-colors">
                                            <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                <FiActivity className="text-blue-500" /> {t('orderSummary')}
                                            </h4>
                                            <div className="space-y-3">
                                                <div className="flex justify-between text-gray-500 dark:text-gray-400 font-medium">
                                                    <span>{t('subtotal')}</span>
                                                    <span className="text-gray-900 dark:text-white font-bold">${amount.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-gray-500 dark:text-gray-400 font-medium">
                                                    <span>{t('discount')}</span>
                                                    <span className="text-green-500 font-bold">-$0.00</span>
                                                </div>
                                                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                                                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                                                    <span>{t('total')}</span>
                                                    <span>${amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <button
                                            onClick={handleConfirm}
                                            disabled={processing || (selectedMethod === 'CASH' && change < 0)}
                                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white font-black text-xl rounded-2xl transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-95"
                                        >
                                            {processing ? (
                                                <span className="animate-pulse">{t('processing') || 'Processing...'}</span>
                                            ) : (
                                                <>
                                                    <FiCheckCircle size={24} />
                                                    {t('completePurchase')}
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-4 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all"
                                        >
                                            {t('cancel')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PaymentModal;
