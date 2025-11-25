
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import { X, QrCode, CameraOff, RefreshCw } from 'lucide-react';

interface StepQRScanProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel: () => void;
}

export const StepQRScan: React.FC<StepQRScanProps> = ({ onScanSuccess, onCancel }) => {
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);

  const startScanner = async () => {
    setError('');
    const regionId = "reader";
    
    // Ensure element exists
    if (!document.getElementById(regionId)) return;

    // Initialize if needed
    if (!scannerRef.current) {
        try {
            scannerRef.current = new Html5Qrcode(regionId);
        } catch (e) {
            console.error("Initialization error", e);
            // If it fails here, it might be because of a lingering instance. 
            // We can't easily recover without a full remount or clearing, 
            // but usually the cleanup handles it.
        }
    }

    if (!scannerRef.current) return;

    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };
    
    try {
        // If already scanning, stop first (shouldn't happen with isScanning check but safe guard)
        if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
        }

        await scannerRef.current.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
                if (mountedRef.current) {
                    scannerRef.current?.stop().then(() => {
                        scannerRef.current = null;
                        onScanSuccess(decodedText);
                    }).catch(console.error);
                }
            },
            () => {} // Ignore frame errors
        );
        
        if (mountedRef.current) setIsScanning(true);
        
    } catch (err: any) {
        console.error("Start error", err);
        if (mountedRef.current) {
            let msg = "Impossible d'accéder à la caméra.";
            if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied') || err?.message?.includes('Permission dismissed')) {
                msg = "Accès caméra refusé ou ignoré. Veuillez autoriser l'accès et réessayer.";
            }
            setError(msg);
        }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    // Slight delay to ensure DOM is ready and smooth transition
    const timer = setTimeout(startScanner, 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
        }).catch(e => console.error("Cleanup error", e));
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-black text-white relative animate-fadeIn">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-xl font-bold flex items-center space-x-2">
           <QrCode size={20} className="text-accent" />
           <span>Scanner un code</span>
        </h2>
        <button 
          onClick={() => {
             onCancel();
          }}
          className="p-2 bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-black">
         {error ? (
            <div className="text-center p-8 space-y-6 z-10 max-w-sm mx-auto">
                <div className="inline-flex p-5 bg-red-500/20 rounded-full text-red-400 shadow-lg shadow-red-900/20">
                    <CameraOff size={32} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Erreur Caméra</h3>
                    <p className="text-red-200 text-sm leading-relaxed">{error}</p>
                </div>
                <div className="flex flex-col space-y-3 w-full pt-2">
                    <button 
                        onClick={startScanner} 
                        className="w-full py-3.5 bg-white text-black rounded-2xl text-sm font-bold hover:bg-gray-200 flex items-center justify-center space-x-2 transition transform active:scale-95"
                    >
                        <RefreshCw size={18} />
                        <span>Réessayer</span>
                    </button>
                    <button 
                        onClick={onCancel} 
                        className="w-full py-3.5 bg-white/10 text-white rounded-2xl text-sm font-bold hover:bg-white/20 transition"
                    >
                        Annuler
                    </button>
                </div>
            </div>
         ) : (
            <div id="reader" className="w-full h-full"></div>
         )}
         
         <style>{`
            #reader video { object-fit: cover; height: 100%; width: 100%; }
            #reader__scan_region { background: transparent; }
            #reader__dashboard_section_csr span { display: none; }
         `}</style>
      </div>

      {/* Bottom instructions */}
      {!error && (
          <div className="absolute bottom-10 left-0 right-0 text-center p-4 z-20 pointer-events-none">
            <div className="inline-block px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                <p className="text-sm font-medium text-white/90">Pointez la caméra vers un QR Code</p>
            </div>
          </div>
      )}
    </div>
  );
};
