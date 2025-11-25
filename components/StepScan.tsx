
import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon, ScanLine, QrCode, Nfc } from 'lucide-react';
import { fileToBase64 } from '../services/utils';

interface StepScanProps {
  onImageSelected: (base64: string) => void;
  onManualEntry: () => void;
  onQrScan: () => void;
  onNfcScan: () => void;
}

export const StepScan: React.FC<StepScanProps> = ({ onImageSelected, onManualEntry, onQrScan, onNfcScan }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      onImageSelected(base64);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const base64 = await fileToBase64(e.dataTransfer.files[0]);
      onImageSelected(base64);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6 animate-fadeIn bg-bg dark:bg-night-bg transition-colors">
      {/* Header */}
      <div className="pt-6 pb-2">
        <h1 className="text-4xl font-bold text-primary dark:text-white tracking-tight">Bonjour,</h1>
        <p className="text-xl text-secondary dark:text-night-text-sec mt-1">Que souhaitez-vous scanner aujourd'hui ?</p>
      </div>

      {/* Main Action Card */}
      <div 
        className={`flex-1 w-full bg-surface dark:bg-night-surface rounded-3xl shadow-soft transition-all duration-300 transform hover:scale-[1.01] cursor-pointer relative overflow-hidden group
          ${dragActive ? 'ring-4 ring-accent' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {/* Decorative background blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/30 rounded-full -mr-16 -mt-16 opacity-50 transition-transform group-hover:scale-110 duration-700"></div>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
          <div className="w-24 h-24 bg-bg dark:bg-night-bg rounded-full flex items-center justify-center mb-6 shadow-inner text-primary dark:text-white transition-transform group-hover:rotate-12 border border-slate-100 dark:border-night-border">
            <ScanLine size={40} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-primary dark:text-white mb-2">Scanner une carte</h2>
          <p className="text-secondary dark:text-night-text-sec max-w-xs">
            Prenez une photo ou importez une image pour extraire les contacts instantanément.
          </p>
          
          <div className="mt-8 px-8 py-4 bg-accent text-primary rounded-full font-bold text-lg flex items-center space-x-2 shadow-lg hover:bg-accent-hover transition-colors">
            <Camera size={22} />
            <span>Lancer la caméra</span>
          </div>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          capture="environment"
          className="hidden" 
        />
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button 
           onClick={() => fileInputRef.current?.click()}
           className="p-4 bg-surface dark:bg-night-surface rounded-3xl shadow-card flex flex-col items-center justify-center space-y-2 hover:bg-slate-50 dark:hover:bg-white/5 transition"
        >
           <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-primary dark:text-blue-100">
             <Upload size={20} />
           </div>
           <span className="font-medium text-xs text-primary dark:text-slate-200">Galerie</span>
        </button>

        <button 
           onClick={onQrScan}
           className="p-4 bg-surface dark:bg-night-surface rounded-3xl shadow-card flex flex-col items-center justify-center space-y-2 hover:bg-slate-50 dark:hover:bg-white/5 transition"
        >
           <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-primary dark:text-emerald-100">
             <QrCode size={20} />
           </div>
           <span className="font-medium text-xs text-primary dark:text-slate-200">QR Code</span>
        </button>
        
        <button 
          onClick={onNfcScan}
          className="p-4 bg-surface dark:bg-night-surface rounded-3xl shadow-card flex flex-col items-center justify-center space-y-2 hover:bg-slate-50 dark:hover:bg-white/5 transition"
        >
           <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-full text-primary dark:text-orange-100">
             <Nfc size={20} />
           </div>
           <span className="font-medium text-xs text-primary dark:text-slate-200">NFC</span>
        </button>
        
        <button 
          onClick={onManualEntry}
          className="p-4 bg-surface dark:bg-night-surface rounded-3xl shadow-card flex flex-col items-center justify-center space-y-2 hover:bg-slate-50 dark:hover:bg-white/5 transition"
        >
           <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full text-primary dark:text-purple-100">
             <ImageIcon size={20} />
           </div>
           <span className="font-medium text-xs text-primary dark:text-slate-200">Manuel</span>
        </button>
      </div>
    </div>
  );
};
