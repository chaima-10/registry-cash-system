import { useEffect, useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import Quagga from 'quagga';
import { FiX, FiCamera, FiUpload, FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const CameraScannerModal = ({ isOpen, onClose, onScan }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('camera'); 
    const [isScannerStarted, setIsScannerStarted] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isScanningFile, setIsScanningFile] = useState(false);
    const [pendingCode, setPendingCode] = useState(null);
    const [detectedFormat, setDetectedFormat] = useState('');
    
    const videoRef = useRef(null);
    const codeReaderRef = useRef(null); 
    const isScanningRef = useRef(false);
    const streamRef = useRef(null);

    const isValidBarcode = (code) => {
        if (!/^\d{8,13}$/.test(code)) return false;
        return true;
    };

    const handleSuccess = useCallback((text, format = '', isFile = false) => {
        if (!isFile && !isScanningRef.current) return; 
        
        isScanningRef.current = false;
        setSuccess(text);
        setPendingCode(text);
        setDetectedFormat(format.toUpperCase().replace('_', '-'));
        stopScanner(); 
        
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }, []);

    const stopScanner = useCallback(() => {
        setIsScannerStarted(false);
        isScanningRef.current = false;
        
        if (codeReaderRef.current) {
            codeReaderRef.current.reset();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startScanner = async () => {
        try {
            console.log("[Scanner] Starting Clean ZXing Pro Scanner...");
            setError(null);
            setSuccess(null);
            isScanningRef.current = true;
            setIsScannerStarted(false);

            // 1. Try High-Resolution Stream first, fallback to standard, then basic, then ANY camera
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment", width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
                });
            } catch (highResError) {
                console.warn("[Scanner] High-res failed, falling back to standard resolution...", highResError);
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
                    });
                } catch (stdResError) {
                    console.warn("[Scanner] Standard-res failed, falling back to basic environment...", stdResError);
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: "environment" }
                        });
                    } catch (envResError) {
                        console.warn("[Scanner] Environment camera failed, falling back to ANY camera...", envResError);
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: true
                        });
                    }
                }
            }
            
            streamRef.current = stream;

            // 2. Initialize ZXing Brain
            if (!codeReaderRef.current) {
                const hints = new Map();
                hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
                hints.set(DecodeHintType.TRY_HARDER, true);
                codeReaderRef.current = new BrowserMultiFormatReader(hints);
            }

            // 3. Start Continuous Decoding using the Stream directly
            codeReaderRef.current.decodeFromStream(stream, videoRef.current, (result, err) => {
                if (!isScanningRef.current) return;
                
                if (result) {
                    const code = result.getText();
                    if (isValidBarcode(code)) {
                        console.log(`[Scanner] SUCCESS: ${code}`);
                        handleSuccess(code, result.getBarcodeFormat().toString());
                    }
                }
            });

            setIsScannerStarted(true);

        } catch (err) {
            console.error("[Scanner] Start Failed completely:", err);
            setError(t('cameraAccessError', 'Could not access camera. Please check permissions and device connectivity.'));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanningFile(true);
        setError(null);
        setSuccess(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            Quagga.decodeSingle({
                src: event.target.result,
                decoder: { readers: ["ean_reader", "upc_reader"] },
                locate: true
            }, (result) => {
                setIsScanningFile(false);
                if (result && result.codeResult) {
                    const code = result.codeResult.code.trim();
                    const standardText = code.length === 12 ? '0' + code : code;
                    handleSuccess(standardText, "EAN-13", true);
                } else {
                    setError(t('barcodeNotFoundInImage', 'No valid barcode found in this image.'));
                }
            });
        };
        reader.readAsDataURL(file);
    };

    const handleConfirm = () => {
        if (pendingCode) {
            onScan(pendingCode);
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen && mode === 'camera') {
            startScanner();
        }
        return () => stopScanner();
    }, [isOpen, mode]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
                >
                    {/* Header */}
                    <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <FiCamera className="text-blue-500 w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                    {t('cameraScanner', 'Professional Scanner')}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Mode</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <FiX className="text-slate-400 w-6 h-6" />
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="px-6 py-4 flex gap-2">
                        <button 
                            onClick={() => setMode('camera')}
                            className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all ${
                                mode === 'camera' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                        >
                            <FiCamera /> {t('camera', 'LIVE')}
                        </button>
                        <button 
                            onClick={() => setMode('upload')}
                            className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all ${
                                mode === 'upload' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                        >
                            <FiUpload /> {t('upload', 'UPLOAD')}
                        </button>
                    </div>

                    {/* Scanner View */}
                    <div className="p-6 pt-2">
                        <div className="relative aspect-video bg-slate-950 rounded-3xl overflow-hidden group shadow-inner">
                            {mode === 'camera' ? (
                                <>
                                    <video 
                                        ref={videoRef}
                                        className="w-full h-full object-cover"
                                        autoPlay
                                        muted
                                        playsInline
                                    />
                                    {/* Professional Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                        <div className="w-3/4 h-1/2 border-2 border-white/20 rounded-3xl relative overflow-hidden">
                                            {/* Scanning Line */}
                                            <motion.div 
                                                animate={{ top: ["5%", "95%"] }}
                                                transition={{ duration: 1.5, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
                                                className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] z-30"
                                            />
                                            {/* Corners */}
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
                                        </div>
                                    </div>
                                    {!isScannerStarted && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-30">
                                            <FiRefreshCw className="w-8 h-8 text-white animate-spin" />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl m-4 hover:border-blue-500 transition-colors cursor-pointer relative overflow-hidden group">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    />
                                    {isScanningFile ? (
                                        <FiRefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
                                    ) : (
                                        <>
                                            <div className="p-4 bg-blue-50 rounded-2xl dark:bg-blue-500/10 mb-4 group-hover:scale-110 transition-transform">
                                                <FiUpload className="w-10 h-10 text-blue-500" />
                                            </div>
                                            <p className="text-slate-800 dark:text-white font-bold tracking-tight">{t('clickToChoose', 'CHOOSE FROM FILE')}</p>
                                            <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-widest font-bold">High-Res Capture Preferred</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Success Overlay */}
                            <AnimatePresence>
                                {success && (
                                    <motion.div 
                                        initial={{ y: 100 }}
                                        animate={{ y: 0 }}
                                        className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 to-transparent z-40"
                                    >
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex flex-col gap-4 shadow-2xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-green-500 rounded-xl">
                                                        <FiCheckCircle className="text-white w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-bold uppercase">{detectedFormat || 'SUCCESS'}</p>
                                                        <p className="text-xl font-black text-slate-800 dark:text-white tracking-widest">{success}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleConfirm}
                                                className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-[0.98]"
                                            >
                                                {t('confirmAndAdd', 'ADD TO CART')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error Overlay */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="absolute inset-0 flex items-center justify-center p-6 bg-red-500/10 backdrop-blur-[2px] z-50"
                                    >
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-100 dark:border-red-900/50">
                                            <FiAlertCircle className="text-red-500 w-6 h-6 flex-shrink-0" />
                                            <p className="text-sm font-bold text-red-500">{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Instructions */}
                        <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                            <FiAlertCircle className="text-blue-500 w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                                {mode === 'camera' 
                                    ? t('scannerTip', 'Place the barcode center in the box. Ensure the camera is at least 20cm away for focus.')
                                    : t('uploadTip', 'Use the "Upload" tab for highly reflective or curved products.')
                                }
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CameraScannerModal;
