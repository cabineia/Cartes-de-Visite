
import React, { useReducer, useEffect, useMemo, useRef } from 'react';
import { AppStep, AppState, AppAction, ContactData, EmailTemplate } from './types';
import { INITIAL_STATE, DEFAULT_SIGNATURE, DEFAULT_CATEGORIES, EMAIL_TEMPLATES } from './constants';
import { resizeImage, runOCR } from './services/utils';
import { extractContactInfo, extractContactFromText } from './services/geminiService';
import { StepScan } from './components/StepScan';
import { StepValidate } from './components/StepValidate';
import { StepActions } from './components/StepActions';
import { StepHistory } from './components/StepHistory';
import { StepQRScan } from './components/StepQRScan';
import { Loader2, Moon, Sun, History as HistoryIcon, X } from 'lucide-react';

// Reducer
const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_PROCESSING_STATUS':
      return { ...state, processingStatus: action.payload };
    case 'SET_CURRENT_CONTACT':
      return { ...state, currentContact: action.payload };
    case 'UPDATE_CONTACT_FIELD':
      if (!state.currentContact) return state;
      return {
        ...state,
        currentContact: {
          ...state.currentContact,
          [action.payload.field]: action.payload.value
        }
      };
    case 'UPDATE_SOCIAL':
      if (!state.currentContact) return state;
      return {
        ...state,
        currentContact: {
          ...state.currentContact,
          socials: {
            ...state.currentContact.socials,
            [action.payload.platform]: action.payload.value
          }
        }
      };
    case 'SAVE_CONTACT': {
      const exists = state.history.find(c => c.id === action.payload.id);
      const newHistory = exists 
        ? state.history.map(c => c.id === action.payload.id ? action.payload : c)
        : [action.payload, ...state.history];
      localStorage.setItem('geminiCardScannerHistory', JSON.stringify(newHistory));
      return { ...state, history: newHistory };
    }
    case 'DELETE_CONTACT': {
      const newHistory = state.history.filter(c => c.id !== action.payload);
      localStorage.setItem('geminiCardScannerHistory', JSON.stringify(newHistory));
      return { ...state, history: newHistory };
    }
    case 'LOAD_CONTACT':
      return { ...state, currentContact: action.payload, step: AppStep.ACTIONS };
    case 'ADD_SIGNATURE':
      return { ...state, signatures: [...state.signatures, action.payload] };
    case 'UPDATE_SIGNATURE':
      return { 
        ...state, 
        signatures: state.signatures.map(s => s.id === action.payload.id ? action.payload : s) 
      };
    case 'DELETE_SIGNATURE':
      return { ...state, signatures: state.signatures.filter(s => s.id !== action.payload) };
    case 'ADD_CATEGORY': {
      if (state.categories.includes(action.payload)) return state;
      const newCats = [...state.categories, action.payload];
      localStorage.setItem('geminiCardScannerCategories', JSON.stringify(newCats));
      return { ...state, categories: newCats };
    }
    case 'DELETE_CATEGORY': {
      const newCats = state.categories.filter(c => c !== action.payload);
      localStorage.setItem('geminiCardScannerCategories', JSON.stringify(newCats));
      return { ...state, categories: newCats };
    }
    case 'ADD_TEMPLATE': {
      // Add to main templates list
      const newTemps = [...state.templates, action.payload];
      localStorage.setItem('geminiCardScannerTemplates', JSON.stringify(newTemps));
      return { ...state, templates: newTemps };
    }
    case 'DELETE_TEMPLATE': {
      // Remove from main templates list
      const newTemps = state.templates.filter(t => t.id !== action.payload);
      localStorage.setItem('geminiCardScannerTemplates', JSON.stringify(newTemps));
      return { ...state, templates: newTemps };
    }
    case 'TOGGLE_THEME':
      return { ...state, isDarkMode: !state.isDarkMode };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const safeParse = (key: string, fallback: any) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.error(`Failed to parse ${key}`, e);
      return fallback;
    }
  };

  const initialSigs = safeParse('geminiCardScannerSignatures', [DEFAULT_SIGNATURE]);
  
  // -- Load Categories --
  const storedCategories = safeParse('geminiCardScannerCategories', null);
  const oldCustomCategories = safeParse('geminiCardScannerCustomCats', []);
  
  let initialCategories = DEFAULT_CATEGORIES;
  if (storedCategories && Array.isArray(storedCategories) && storedCategories.length > 0) {
    initialCategories = storedCategories;
  } else if (oldCustomCategories.length > 0) {
    // Migration: merge old custom cats if no new storage exists
    initialCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...oldCustomCategories]));
  }

  // -- Load Templates (Unified) --
  const storedTemplates = safeParse('geminiCardScannerTemplates', null);
  const oldCustomTemplates = safeParse('geminiCardScannerCustomTemps', []);
  
  let initialTemplates: EmailTemplate[] = [];

  if (storedTemplates && Array.isArray(storedTemplates) && storedTemplates.length > 0) {
    initialTemplates = storedTemplates;
  } else {
    // First run with new logic: Combine defaults with any old custom ones
    initialTemplates = [...EMAIL_TEMPLATES, ...oldCustomTemplates];
  }

  const initialStateWithData = { 
    ...INITIAL_STATE, 
    signatures: initialSigs,
    categories: initialCategories,
    templates: initialTemplates // Use the fully populated list
  };

  const [state, dispatch] = useReducer(reducer, initialStateWithData);
  const ndefRef = useRef<any>(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('geminiCardScannerHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        (parsed as ContactData[]).forEach(c => dispatch({ type: 'SAVE_CONTACT', payload: c }));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      dispatch({ type: 'TOGGLE_THEME' });
    }
  }, []);

  useEffect(() => {
    if (state.signatures.length > 0) {
      localStorage.setItem('geminiCardScannerSignatures', JSON.stringify(state.signatures));
    }
  }, [state.signatures]);

  useEffect(() => {
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.isDarkMode]);

  const handleImageSelected = async (base64: string) => {
    dispatch({ type: 'SET_STEP', payload: AppStep.PROCESSING });
    
    try {
      dispatch({ type: 'SET_PROCESSING_STATUS', payload: 'Optimisation...' });
      const resized = await resizeImage(base64);
      
      dispatch({ type: 'SET_PROCESSING_STATUS', payload: 'Lecture...' });
      const ocrText = await runOCR(resized);
      
      dispatch({ type: 'SET_PROCESSING_STATUS', payload: 'Analyse Gemini...' });
      const extracted = await extractContactInfo(resized, ocrText);

      const newContact: ContactData = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        scanImage: resized,
        fullName: extracted.fullName || '',
        title: extracted.title || '',
        company: extracted.company || '',
        email: extracted.email || '',
        phone: extracted.phone || '',
        website: extracted.website || '',
        address: extracted.address || '',
        socials: extracted.socials || {},
        notes: ''
      };

      dispatch({ type: 'SET_CURRENT_CONTACT', payload: newContact });
      dispatch({ type: 'SET_STEP', payload: AppStep.VALIDATE });

    } catch (error) {
      console.error(error);
      dispatch({ type: 'SET_STEP', payload: AppStep.SCAN });
      alert("Échec du traitement. Veuillez réessayer.");
    }
  };

  const handleQrScanSuccess = async (decodedText: string) => {
    dispatch({ type: 'SET_STEP', payload: AppStep.PROCESSING });
    dispatch({ type: 'SET_PROCESSING_STATUS', payload: 'Analyse du QR Code...' });

    try {
      const extracted = await extractContactFromText(decodedText);

      const newContact: ContactData = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        fullName: extracted.fullName || 'Contact QR',
        title: extracted.title || '',
        company: extracted.company || '',
        email: extracted.email || '',
        phone: extracted.phone || '',
        website: extracted.website || '',
        address: extracted.address || '',
        socials: extracted.socials || {},
        notes: `Importé depuis QR Code.\nContenu brut: ${decodedText.substring(0, 50)}...`
      };

      dispatch({ type: 'SET_CURRENT_CONTACT', payload: newContact });
      dispatch({ type: 'SET_STEP', payload: AppStep.VALIDATE });
    } catch (error) {
      console.error(error);
      dispatch({ type: 'SET_STEP', payload: AppStep.SCAN });
      alert("Impossible de lire le contact depuis ce QR Code.");
    }
  };

  const handleNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      alert("La lecture NFC n'est pas supportée par ce navigateur ou cet appareil. Essayez Chrome sur Android.");
      return;
    }

    dispatch({ type: 'SET_STEP', payload: AppStep.PROCESSING });
    dispatch({ type: 'SET_PROCESSING_STATUS', payload: 'Approchez la carte NFC du dos de votre téléphone...' });

    try {
      const ndef = new (window as any).NDEFReader();
      ndefRef.current = ndef;
      await ndef.scan();
      
      ndef.onreading = async (event: any) => {
        dispatch({ type: 'SET_PROCESSING_STATUS', payload: 'Lecture NFC en cours...' });
        
        try {
            const message = event.message;
            const decoder = new TextDecoder();
            let fullText = "";

            for (const record of message.records) {
              if (record.recordType === "text") {
                  fullText += decoder.decode(record.data) + "\n";
              } else if (record.recordType === "url") {
                  fullText += decoder.decode(record.data) + "\n";
              } else if (record.mediaType && record.mediaType.includes('vcard')) {
                  fullText += decoder.decode(record.data) + "\n";
              }
            }

            if (!fullText.trim()) {
               throw new Error("Aucune donnée texte lisible trouvée.");
            }

            // Reuse the QR code text extraction logic for NFC vCard/Text data
            dispatch({ type: 'SET_PROCESSING_STATUS', payload: 'Analyse des données NFC...' });
            const extracted = await extractContactFromText(fullText);

            const newContact: ContactData = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                fullName: extracted.fullName || 'Contact NFC',
                title: extracted.title || '',
                company: extracted.company || '',
                email: extracted.email || '',
                phone: extracted.phone || '',
                website: extracted.website || '',
                address: extracted.address || '',
                socials: extracted.socials || {},
                notes: `Importé via NFC.\nContenu: ${fullText.substring(0, 50)}...`
            };
            
            dispatch({ type: 'SET_CURRENT_CONTACT', payload: newContact });
            dispatch({ type: 'SET_STEP', payload: AppStep.VALIDATE });

        } catch (readError) {
            console.error("NFC Parsing Error", readError);
            alert("Erreur lors de la lecture des données de la carte.");
            dispatch({ type: 'SET_STEP', payload: AppStep.SCAN });
        }
      };

      ndef.onreadingerror = () => {
         alert("Erreur de lecture. Maintenez la carte plus longtemps.");
      };

    } catch (error) {
      console.error("NFC Error", error);
      dispatch({ type: 'SET_STEP', payload: AppStep.SCAN });
      alert("Impossible de démarrer le scan NFC. Vérifiez que le NFC est activé et que vous avez donné les permissions.");
    }
  };

  const handleManualEntry = () => {
    const emptyContact: ContactData = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      fullName: '', title: '', company: '', email: '', phone: '', website: '', address: '', socials: {}
    };
    dispatch({ type: 'SET_CURRENT_CONTACT', payload: emptyContact });
    dispatch({ type: 'SET_STEP', payload: AppStep.VALIDATE });
  };

  const handleSaveContact = () => {
    if (state.currentContact) {
      dispatch({ type: 'SAVE_CONTACT', payload: state.currentContact });
      dispatch({ type: 'SET_STEP', payload: AppStep.ACTIONS });
    }
  };

  const goHome = () => {
    // Abort NFC if active (best effort)
    if (ndefRef.current) {
        // NDEFReader doesn't strictly have a stop() in all implementations yet, 
        // usually handled by AbortController signal in scan(), but keeping it simple for now.
        ndefRef.current = null;
    }
    dispatch({ type: 'SET_STEP', payload: AppStep.SCAN });
    dispatch({ type: 'SET_CURRENT_CONTACT', payload: null as any });
  };

  return (
    <div className="min-h-screen bg-bg dark:bg-black text-primary dark:text-white font-sans flex items-center justify-center p-0 sm:p-4 lg:p-8 transition-colors duration-300">
      
      {/* Global Actions */}
      <div className="fixed top-4 right-4 z-50 flex space-x-3">
        {state.step === AppStep.SCAN && (
           <button 
             onClick={() => dispatch({type: 'SET_STEP', payload: AppStep.HISTORY})}
             className="p-3 rounded-full bg-surface dark:bg-night-surface shadow-soft text-primary dark:text-white hover:scale-105 transition-transform"
           >
             <HistoryIcon size={22} />
           </button>
        )}
        {state.step !== AppStep.VALIDATE && (
          <button 
            onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
            className="p-3 rounded-full bg-surface dark:bg-night-surface shadow-soft text-primary dark:text-white hover:scale-105 transition-transform"
          >
            {state.isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        )}
      </div>

      {/* Main Mobile Container - Calmia Style */}
      <main className="w-full max-w-[480px] h-[100dvh] sm:h-[850px] bg-bg dark:bg-night-bg sm:rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col border-8 border-white dark:border-night-surface box-content ring-1 ring-black/5 transition-colors duration-300">
        
        {state.step === AppStep.SCAN && (
          <StepScan 
            onImageSelected={handleImageSelected} 
            onManualEntry={handleManualEntry} 
            onQrScan={() => dispatch({ type: 'SET_STEP', payload: AppStep.QR_SCAN })}
            onNfcScan={handleNfcScan}
          />
        )}

        {state.step === AppStep.QR_SCAN && (
          <StepQRScan 
            onScanSuccess={handleQrScanSuccess}
            onCancel={() => dispatch({ type: 'SET_STEP', payload: AppStep.SCAN })}
          />
        )}

        {state.step === AppStep.PROCESSING && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fadeIn bg-surface dark:bg-night-bg relative">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-8 border-slate-50 dark:border-night-border"></div>
              <div className="absolute inset-0 w-32 h-32 rounded-full border-8 border-accent border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="text-primary animate-spin" size={40} />
              </div>
            </div>
            <div className="text-center px-8">
              <h3 className="text-2xl font-bold text-primary dark:text-white mb-2">Analyse en cours</h3>
              <p className="text-secondary dark:text-night-text-sec font-medium mb-6">{state.processingStatus}</p>
              
              <button 
                onClick={goHome}
                className="px-6 py-2 rounded-full bg-slate-100 dark:bg-white/10 text-secondary hover:text-primary dark:text-white dark:hover:bg-white/20 transition-colors text-sm font-bold flex items-center justify-center mx-auto space-x-2"
              >
                <X size={16} />
                <span>Annuler</span>
              </button>
            </div>
          </div>
        )}

        {state.step === AppStep.VALIDATE && state.currentContact && (
          <StepValidate 
            contact={state.currentContact}
            onUpdate={(f, v) => dispatch({ type: 'UPDATE_CONTACT_FIELD', payload: { field: f, value: v } })}
            onSocialUpdate={(p, v) => dispatch({ type: 'UPDATE_SOCIAL', payload: { platform: p, value: v } })}
            onSave={handleSaveContact}
            onCancel={goHome}
          />
        )}

        {state.step === AppStep.ACTIONS && state.currentContact && (
          <StepActions 
            contact={state.currentContact} 
            signatures={state.signatures}
            categories={state.categories}
            templates={state.templates} 
            onAddSignature={(sig) => dispatch({ type: 'ADD_SIGNATURE', payload: sig })}
            onUpdateSignature={(sig) => dispatch({ type: 'UPDATE_SIGNATURE', payload: sig })}
            onDeleteSignature={(id) => dispatch({ type: 'DELETE_SIGNATURE', payload: id })}
            onAddCategory={(cat) => dispatch({ type: 'ADD_CATEGORY', payload: cat })}
            onDeleteCategory={(cat) => dispatch({ type: 'DELETE_CATEGORY', payload: cat })}
            onAddTemplate={(tmpl) => dispatch({ type: 'ADD_TEMPLATE', payload: tmpl })}
            onDeleteTemplate={(id) => dispatch({ type: 'DELETE_TEMPLATE', payload: id })}
            onBack={goHome}
          />
        )}

        {state.step === AppStep.HISTORY && (
          <StepHistory 
            history={state.history} 
            onSelect={(c) => dispatch({ type: 'LOAD_CONTACT', payload: c })}
            onDelete={(id) => dispatch({ type: 'DELETE_CONTACT', payload: id })}
            onBack={goHome}
          />
        )}

      </main>
    </div>
  );
};

export default App;
