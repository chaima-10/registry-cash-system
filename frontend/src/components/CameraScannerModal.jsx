import { useEffect, useState, useRef } from 'react';
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
    const [engineUsed, setEngineUsed] = useState('');
    const [pendingCode, setPendingCode] = useState(null);
    
    const videoRef = useRef(null);
    const codeReaderRef = useRef(null); // For Uploads only
    const isScanningRef = useRef(false);
    const lastCodeRef = useRef(null);
    const codeCountRef = useRef(0);

    // EAN-13/UPC-A checksum validation
    const isValidEAN = (code) => {
        if (!/^\d{8,13}$/.test(code)) return false;
        const digits = code.split('').map(Number);
        let sum = 0;
        for (let i = 0; i < digits.length - 1; i++) {
            sum += digits[i] * (i % 2 === 0 ? 1 : 3);
        }
        const checksum = (10 - (sum % 10)) % 10;
        return checksum === digits[digits.length - 1];
    };

    const isValidBarcode = (code) => {
        if (!code) return false;
        const clean = code.trim();
        // Only accept numeric codes 8-13 digits (EAN-8, EAN-13, UPC-A, UPC-E)
        if (!/^\d{8,13}$/.test(clean)) return false;
        // Validate checksum for EAN/UPC
        return isValidEAN(clean);
    };

    const handleSuccess = (text) => {
        if (!isScanningRef.current) return; 
        isScanningRef.current = false;
        
        setSuccess(text);
        setPendingCode(text);
        stopScanner(); 
        
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    };

    const confirmScan = () => {
        if (pendingCode) {
            onScan(pendingCode);
            onClose();
        }
    };

    const retryScan = () => {
        setPendingCode(null);
        setSuccess(null);
        setError(null);
        lastCodeRef.current = null;
        codeCountRef.current = 0;
        startScanner();
    };

    const startScanner = async () => {
        try {
            setError(null);
            setSuccess(null);
            isScanningRef.current = true;
            setIsScannerStarted(false);

            // ENGINE 1: Chrome/Edge Native BarcodeDetector API (AI-Powered, ignoring glare/blur)
            if ('BarcodeDetector' in window) {
                setEngineUsed('Native AI Scanner');
                console.log("Using Native BarcodeDetector API");
                
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setIsScannerStarted(true);
                    
                    // Only retail barcode formats for product scanning (EAN-13, EAN-8, UPC-A, UPC-E)
                    const barcodeDetector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
                    
                    const scanFrame = async () => {
                        if (!isScanningRef.current || !videoRef.current) return;
                        
                        try {
                            const barcodes = await barcodeDetector.detect(videoRef.current);
                            if (barcodes.length > 0) {
                                const code = barcodes[0].rawValue;
                                // Only accept EAN-13, EAN-8, UPC-A formats
                                if (!/^\d{8,13}$/.test(code.trim())) return;
                                
                                const standardText = code.trim().length === 12 ? '0' + code.trim() : code.trim();
                                
                                // Require 2 consecutive identical reads
                                if (lastCodeRef.current === standardText) {
                                    codeCountRef.current++;
                                    if (codeCountRef.current >= 2 && isValidBarcode(standardText)) {
                                        handleSuccess(standardText);
                                        return;
                                    }
                                } else {
                                    lastCodeRef.current = standardText;
                                    codeCountRef.current = 1;
                                }
                            }
                        } catch (e) {
                            // ignore frame errors
                        }
                        
                        if (isScanningRef.current) {
                            // Scan rapidly
                            requestAnimationFrame(scanFrame);
                        }
                    };
                    
                    scanFrame();
                }
                return;
            }

            // ENGINE 2: Fallback to QuaggaJS (Specifically built for live 1D Barcodes, better than ZXing for video)
            setEngineUsed('QuaggaJS Scanner');
            console.log("Using QuaggaJS Fallback");
            
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector('#quagga-container'), // Must inject into a container
                    constraints: {
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                },
                decoder: {
                    // Only retail barcode readers for product scanning
                    readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader"]
                },
                locate: true // Turns on localization to find the barcode in the frame
            }, function(err) {
                if (err) {
                    console.error("Quagga Init Error:", err);
                    setError(t('cameraAccessError', 'Could not access camera.'));
                    return;
                }
                Quagga.start();
                setIsScannerStarted(true);
            });

            Quagga.onDetected((data) => {
                if (!isScanningRef.current) return;
                const code = data.codeResult.code;
                // Only accept EAN-13, EAN-8, UPC-A formats
                if (!/^\d{8,13}$/.test(code.trim())) return;
                
                const standardText = code.trim().length === 12 ? '0' + code.trim() : code.trim();
                
                // Require 2 consecutive identical reads
                if (lastCodeRef.current === standardText) {
                    codeCountRef.current++;
                    if (codeCountRef.current >= 2 && isValidBarcode(standardText)) {
                        handleSuccess(standardText);
                    }
                } else {
                    lastCodeRef.current = standardText;
                    codeCountRef.current = 1;
                }
            });

        } catch (err) {
            console.error("Camera start failed", err);
            setError(t('cameraAccessError', 'Could not access camera. Please check permissions.'));
            setIsScannerStarted(false);
        }
    };

    const stopScanner = () => {
        console.log("Stopping scanner...");
        setIsScannerStarted(false);
        isScanningRef.current = false;
        
        // Stop Native stream
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        // Stop Quagga
        try {
            Quagga.stop();
            Quagga.offDetected();
        } catch (e) {}
    };

    const retryScanner = async () => {
        stopScanner();
        setError(null);
        setPendingCode(null);
        setSuccess(null);
        lastCodeRef.current = null;
        codeCountRef.current = 0;
        await new Promise(resolve => setTimeout(resolve, 500));
        await startScanner();
    };

    // The upload logic remains untouched using ZXing
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanningFile(true);
        setError(null);
        setSuccess(null);

        try {
            if (!codeReaderRef.current) {
                const hints = new Map();
                // Only retail barcode formats for product scanning
                hints.set(DecodeHintType.POSSIBLE_FORMATS, [
                    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, 
                    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E
                ]);
                hints.set(DecodeHintType.TRY_HARDER, true);
                codeReaderRef.current = new BrowserMultiFormatReader(hints);
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                const img = new Image();
                img.onload = async () => {
                    try {
                        const result = await codeReaderRef.current.decodeFromImageElement(img);
                        const text = result.getText();
                        const standardText = text.trim().length === 12 ? '0' + text.trim() : text.trim();
                        
                        if (isValidBarcode(standardText)) {
                            handleSuccess(standardText);
                        } else {
                            setError(t('invalidBarcodeFormat', `Invalid barcode format. Got ${standardText.length} characters.`));
                        }
                    } catch (err) {
                        setError(t('barcodeNotFoundInImage', 'No valid barcode found in this image.'));
                    } finally {
                        setIsScanningFile(false);
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setError(t('fileProcessError', 'Error processing image file.'));
            setIsScanningFile(false);
        }
    };

    useEffect(() => {
        if (isOpen && mode === 'camera') {
            const timer = setTimeout(() => {
                startScanner();
            }, 300);
            return () => {
                clearTimeout(timer);
                stopScanner();
            };
        } else {
            stopScanner();
        }
    }, [isOpen, mode]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div key="camera-scanner-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-gray-950 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10"
                    >
                        {/* Header */}
                        <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                                    {mode === 'camera' ? <FiCamera size={24} /> : <FiUpload size={24} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                                        {mode === 'camera' ? t('cameraScanner', 'Scanner Caméra') : t('imageScanner', 'Scanner Image')}
                                    </h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        {mode === 'camera' ? t('liveScan', 'DIRECT') : t('fileScan', 'FICHIER')}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5">
                                <FiX size={28} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-2 bg-gray-50 dark:bg-white/5 m-6 rounded-2xl border border-gray-100 dark:border-white/5">
                            <button 
                                onClick={() => setMode('camera')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'camera' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <FiCamera size={18} /> {t('tabCamera', 'Caméra')}
                            </button>
                            <button 
                                onClick={() => setMode('upload')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'upload' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <FiUpload size={18} /> {t('tabUpload', 'Téléverser')}
                            </button>
                        </div>
                        
                        {/* Content area */}
                        <div className="relative aspect-video bg-black mx-6 mb-6 rounded-[2rem] overflow-hidden border border-white/10 group">
                            {mode === 'camera' ? (
                                <>
                                    <div className="w-full h-full relative" id="quagga-container">
                                        {/* Fallback Native Video for BarcodeDetector */}
                                        <video 
                                            ref={videoRef} 
                                            className="w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:hidden" 
                                            autoPlay 
                                            playsInline 
                                            muted 
                                        />
                                        
                                        {isScannerStarted && !error && !success && (
                                            <>
                                                <div className="absolute inset-0 border-2 border-blue-500/30 z-10 pointer-events-none overflow-hidden">
                                                    <div className="absolute left-0 right-0 h-1 bg-blue-500 animate-scan shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                                                </div>
                                                <div className="absolute top-4 right-4 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm z-50">
                                                    {engineUsed}
                                                </div>
                                            </>
                                        )}
                                        
                                        {!isScannerStarted && !error && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 bg-gray-900/80 backdrop-blur-md">
                                                <FiRefreshCw className="animate-spin text-blue-500" size={48} />
                                                <p className="text-sm font-black uppercase tracking-[0.2em] opacity-60">{t('initializing', 'Chargement...')}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-white/5 p-8 text-center transition-colors hover:bg-gray-100 dark:hover:bg-white/10">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        id="scanner-upload" 
                                        className="hidden" 
                                        onChange={handleFileUpload}
                                        disabled={isScanningFile}
                                    />
                                    <label 
                                        htmlFor="scanner-upload"
                                        className="cursor-pointer group flex flex-col items-center gap-6"
                                    >
                                        <div className="w-24 h-24 rounded-[2rem] bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 group-active:scale-95 transition-all shadow-xl shadow-blue-500/5">
                                            {isScanningFile ? <FiRefreshCw className="animate-spin" size={40} /> : <FiUpload size={40} />}
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                {isScanningFile ? t('scanningFile', 'Analyse en cours...') : t('clickToUpload', 'Cliquer pour choisir')}
                                            </p>
                                            <p className="text-xs font-bold text-gray-400 mt-2">
                                                JPG, PNG (EAN/UPC/QR)
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Overlays (Error/Success) */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div 
                                        key="error-overlay"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-red-600/90 backdrop-blur-md text-white gap-6"
                                    >
                                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center shadow-2xl">
                                            <FiAlertCircle size={40} />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black uppercase tracking-tight">{t('error', 'Erreur')}</p>
                                            <p className="text-sm font-medium mt-2 opacity-90 max-w-[250px] mx-auto">{error}</p>
                                        </div>
                                        <button 
                                            onClick={mode === 'camera' ? retryScanner : () => setError(null)}
                                            className="px-8 py-3 bg-white text-red-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/20"
                                        >
                                            {t('retry', 'RÉESSAYER')}
                                        </button>
                                    </motion.div>
                                )}

                                {success && pendingCode && (
                                    <motion.div 
                                        key="success-overlay"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-blue-600/95 backdrop-blur-md text-white gap-6"
                                    >
                                        <div className="w-20 h-20 bg-white rounded-[2rem] text-blue-600 flex items-center justify-center shadow-2xl">
                                            <FiCheckCircle size={48} />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80">{t('detected', 'DÉTECTÉ')}</p>
                                            <p className="text-3xl font-black tracking-tighter break-all px-4">{success}</p>
                                        </div>
                                        <div className="flex gap-3 w-full max-w-xs pt-4">
                                            <button 
                                                onClick={retryScan}
                                                className="flex-1 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                                            >
                                                {t('retry', 'RÉESSAYER')}
                                            </button>
                                            <button 
                                                onClick={confirmScan}
                                                className="flex-1 py-3 bg-white text-blue-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                                            >
                                                {t('confirm', 'CONFIRMER')}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer / Instructions */}
                        <div className="p-8 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <FiAlertCircle size={20} />
                            </div>
                            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 leading-relaxed">
                                {mode === 'camera' 
                                    ? t('scannerInstructions', 'Placez le code-barres au centre. Évitez les reflets si vous scannez un écran.')
                                    : t('uploadInstructions', 'Choisissez une image nette où le code-barres est bien visible et plat.')}
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
                    animation: scan 2.5s ease-in-out infinite;
                }
                /* Hide Quagga injected canvas so it doesn't mess up UI */
                #quagga-container canvas.drawingBuffer {
                    display: none;
                }
                #quagga-container video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
            `}</style>
        </AnimatePresence>
    );
};

export default CameraScannerModal;
