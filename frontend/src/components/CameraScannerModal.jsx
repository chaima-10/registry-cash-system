import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FiX } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const CameraScannerModal = ({ isOpen, onClose, onScan }) => {
    const { t } = useTranslation();

    useEffect(() => {
        if (!isOpen) return;

        // Configuration for the scanner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
        };

        const scanner = new Html5QrcodeScanner(
            "camera-scanner-container",
            config,
            false // verbose flag
        );

        scanner.render(
            (decodedText) => {
                scanner.clear(); // Stop scanning once a barcode is detected
                onScan(decodedText);
            },
            (errorMessage) => {
                // Background scan errors are extremely frequent and safe to ignore
            }
        );

        // Cleanup on unmount or when modal closes
        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, [isOpen, onScan]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transition-colors flex flex-col"
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 transition-colors">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {t('scanBarcodeWithCamera', 'Scan Barcode with Camera')}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                <FiX size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-950">
                            {/* The HTML5 QR Code Scanner mounts here */}
                            <div id="camera-scanner-container" className="w-full rounded-xl overflow-hidden" style={{ border: 'none' }} />
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                            {t('pointCameraAtBarcode', 'Point your device camera at the barcode.')}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CameraScannerModal;
