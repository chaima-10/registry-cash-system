import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FiX, FiCamera, FiRefreshCw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const CameraScannerModal = ({ isOpen, onClose, onScan }) => {
    const { t } = useTranslation();
    const [isScannerStarted, setIsScannerStarted] = useState(false);
    const [error, setError] = useState(null);
    const scannerRef = useRef(null);
    const containerId = "camera-scanner-viewport";

    const startScanner = async () => {
        try {
            setError(null);
            const html5QrCode = new Html5Qrcode(containerId);
            scannerRef.current = html5QrCode;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
            };

            // Start scanning with the back camera (environment)
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    stopScanner().then(() => {
                        onScan(decodedText);
                    });
                },
                (errorMessage) => {
                    // Ignore background errors
                }
            );
            setIsScannerStarted(true);
        } catch (err) {
            console.error("Camera start failed", err);
            setError(t('cameraAccessError', 'Could not access camera. Please check permissions.'));
            setIsScannerStarted(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
                setIsScannerStarted(false);
            } catch (err) {
                console.error("Stop failed", err);
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            // Give a moment for the modal animation to finish and container to mount
            const timer = setTimeout(() => {
                startScanner();
            }, 500);
            return () => {
                clearTimeout(timer);
                stopScanner();
            };
        } else {
            stopScanner();
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10"
                    >
                        <div className="p-5 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                    <FiCamera size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {t('scanBarcode', 'Scan Barcode')}
                                </h3>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800">
                                <FiX size={24} />
                            </button>
                        </div>
                        
                        <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
                            <div id={containerId} className="w-full h-full" />
                            
                            {!isScannerStarted && !error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 bg-gray-900">
                                    <FiRefreshCw className="animate-spin" size={40} />
                                    <p className="text-sm font-medium opacity-70">{t('initializingCamera', 'Initializing Camera...')}</p>
                                </div>
                            )}

                            {error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-gray-900 text-white gap-6">
                                    <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                                        <FiCamera size={32} />
                                    </div>
                                    <p className="text-sm font-bold text-red-400">{error}</p>
                                    <button 
                                        onClick={startScanner}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
                                    >
                                        {t('tryAgain', 'Try Again')}
                                    </button>
                                </div>
                            )}

                            {/* Scanner Overlay */}
                            {isScannerStarted && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 border-[40px] border-black/40" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] border-2 border-blue-500 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 animate-scan" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 text-center">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {t('scannerInstructions', 'Place the barcode inside the square to scan it automatically.')}
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
            <style>{`
                @keyframes scan {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
                #camera-scanner-viewport video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>
        </AnimatePresence>
    );
};

export default CameraScannerModal;
