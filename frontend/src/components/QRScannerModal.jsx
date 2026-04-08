import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FiX, FiCamera } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const QRScannerModal = ({ isOpen, onClose, onScan }) => {
    const { t } = useTranslation();
    const [hasPermission, setHasPermission] = useState(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const requestCameraPermission = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
                stream.getTracks().forEach(track => track.stop());
                setHasPermission(true);
                startScanning();
            } catch (error) {
                console.error('Camera permission denied:', error);
                setHasPermission(false);
            }
        };

        const startScanning = () => {
            if (!hasPermission && hasPermission !== null) return;

            setIsScanning(true);
            
            // Configuration for QR scanner
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                supportedScanTypes: [0] // 0 for QR_CODE
            };

            const scanner = new Html5QrcodeScanner(
                "qr-scanner-container",
                config,
                false // verbose flag
            );

            scanner.render(
                (decodedText) => {
                    scanner.clear(); // Stop scanning once a QR code is detected
                    onScan(decodedText);
                    onClose();
                },
                (errorMessage) => {
                    // Background scan errors are frequent and safe to ignore
                }
            );

            // Cleanup on unmount or when modal closes
            return () => {
                if (scanner) {
                    scanner.clear().catch(error => console.error("Failed to clear scanner", error));
                }
                setIsScanning(false);
            };
        };

        requestCameraPermission();
    }, [isOpen, hasPermission, onScan, onClose]);

    const handleRetry = () => {
        setHasPermission(null);
    };

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
                                {t('scanQRCode', 'Scan QR Code')}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                                <FiX size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-gray-950 min-h-[300px] flex items-center justify-center">
                            {hasPermission === false ? (
                                <div className="text-center space-y-4">
                                    <FiCamera size={48} className="mx-auto text-gray-400" />
                                    <div>
                                        <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                                            {t('cameraPermissionDenied', 'Camera permission denied')}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-500">
                                            {t('allowCameraAccess', 'Please allow camera access to scan QR codes')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleRetry}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        {t('retry', 'Retry')}
                                    </button>
                                </div>
                            ) : hasPermission === null ? (
                                <div className="text-center space-y-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {t('requestingCameraPermission', 'Requesting camera permission...')}
                                    </p>
                                </div>
                            ) : (
                                <div className="w-full">
                                    {/* The HTML5 QR Code Scanner mounts here */}
                                    <div 
                                        id="qr-scanner-container" 
                                        className="w-full rounded-xl overflow-hidden bg-black" 
                                        style={{ 
                                            border: 'none',
                                            minHeight: '250px'
                                        }} 
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 text-center text-sm font-medium text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                            {t('pointCameraAtQR', 'Point your device camera at the QR code.')}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default QRScannerModal;
