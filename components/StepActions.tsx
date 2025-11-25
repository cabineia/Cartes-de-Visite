
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ContactData, EmailTemplate, UserSignature } from '../types';
import { generateAIContextEmail } from '../services/geminiService';
import { downloadVCard, fileToBase64, resizeImage } from '../services/utils';
import { 
  Mail, Download, ArrowLeft, Wand2, Copy, Check, 
  UserPlus, Eye, X, Edit2,
  Share2, Linkedin, Twitter, Facebook, Instagram,
  FileText, Sparkles, ChevronDown, PenTool, Loader2, Upload, Trash2, Plus, PenLine,
  Mic, MicOff, Layers, MessageSquare, MessageCircle
} from 'lucide-react';

interface StepActionsProps {
  contact: ContactData;
  signatures: UserSignature[];
  categories: string[];
  templates: EmailTemplate[];
  onAddSignature: (sig: UserSignature) => void;
  onUpdateSignature: (sig: UserSignature) => void;
  onDeleteSignature: (id: string) => void;
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddTemplate: (tmpl: EmailTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onBack: () => void;
}

export const StepActions: React.FC<StepActionsProps> = ({ 
  contact, signatures, categories, templates, 
  onAddSignature, onUpdateSignature, onDeleteSignature, 
  onAddCategory, onDeleteCategory,
  onAddTemplate, onDeleteTemplate,
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'export'>('email');
  
  // -- GESTION CATÉGORIES --
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
      if (categories.includes('Networking & Affaires')) return 'Networking & Affaires';
      return categories.length > 0 ? categories[0] : '';
  });

  // State for adding new category
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // -- GESTION MODÈLES (TEMPLATES) --
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const recognitionRef = useRef<any>(null);
  
  // Filtrage basé sur selectedCategory
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  const [context, setContext] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedBody, setGeneratedBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManualDraft, setShowManualDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recordingField, setRecordingField] = useState<'context' | 'body' | null>(null);
  
  // Signature State
  const [selectedSigId, setSelectedSigId] = useState<string>('');
  const [currentSigHTML, setCurrentSigHTML] = useState('');
  const [isEditingSig, setIsEditingSig] = useState(false);
  const [editingProfileName, setEditingProfileName] = useState('');
  const [sigFields, setSigFields] = useState({
    name: 'Votre Nom',
    title: 'Poste',
    company: 'Nom de l\'Entreprise',
    logo: ''
  });

  // SECURITÉ : Si la catégorie sélectionnée disparaît des props
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(selectedCategory)) {
        setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Sync template selection
  useEffect(() => {
    // Check if the currently selected template ID is still valid for the current category
    const isCurrentValid = filteredTemplates.some(t => t.id === selectedTemplateId);
    
    if (!isCurrentValid) {
      if (filteredTemplates.length > 0) {
        setSelectedTemplateId(filteredTemplates[0].id);
      } else {
        setSelectedTemplateId('');
      }
    }
  }, [filteredTemplates, selectedTemplateId]);

  useEffect(() => {
    if (signatures.length > 0 && !selectedSigId) {
      const defaultSig = signatures.find(s => s.isDefault) || signatures[0];
      setSelectedSigId(defaultSig.id);
    }
  }, [signatures, selectedSigId]);

  useEffect(() => {
    const sig = signatures.find(s => s.id === selectedSigId);
    if (sig) {
      if (sig.data) {
        setSigFields(sig.data);
        let html = `<b>${sig.data.name}</b><br/><i>${sig.data.title}</i><br/>${sig.data.company}`;
        if (sig.data.logo) {
           html += `<br/><br/><img src="${sig.data.logo}" alt="Logo" style="display: block; max-height: 80px; max-width: 200px; height: auto; border: 0;" />`;
        }
        setCurrentSigHTML(html);
      } else {
        setCurrentSigHTML(sig.content);
        setSigFields({
            name: 'Votre Nom',
            title: 'Poste',
            company: 'Nom de l\'Entreprise',
            logo: ''
        });
      }
      setEditingProfileName(sig.name);
    }
  }, [selectedSigId, signatures]);

  const updateSigHTML = (fields: typeof sigFields) => {
    let html = `<b>${fields.name}</b><br/><i>${fields.title}</i><br/>${fields.company}`;
    if (fields.logo) {
       html += `<br/><br/><img src="${fields.logo}" alt="Logo" style="display: block; max-height: 80px; max-width: 200px; height: auto; border: 0;" />`;
    }
    setCurrentSigHTML(html);
    return html;
  };

  const handleFieldChange = (key: keyof typeof sigFields, value: string) => {
    const newFields = { ...sigFields, [key]: value };
    setSigFields(newFields);
    updateSigHTML(newFields);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        const resized = await resizeImage(base64, 300, 150, 'image/png');
        handleFieldChange('logo', resized);
      } catch (err) {
        console.error("Logo upload failed", err);
        alert("Erreur lors du chargement du logo.");
      }
    }
  };

  const handleSaveCurrentSig = () => {
    const content = updateSigHTML(sigFields);
    const sigToUpdate = signatures.find(s => s.id === selectedSigId);
    if (sigToUpdate) {
        onUpdateSignature({
            ...sigToUpdate,
            name: editingProfileName,
            content,
            data: sigFields
        });
        setIsEditingSig(false);
    }
  };

  const handleCreateSignature = () => {
    const newId = `sig-${Date.now()}`;
    const newSig: UserSignature = {
        id: newId,
        name: `Profil ${signatures.length + 1}`,
        content: '<b>Votre Nom</b><br/><i>Poste</i><br/>Entreprise',
        isDefault: false,
        data: {
            name: 'Votre Nom',
            title: 'Poste',
            company: 'Entreprise',
            logo: ''
        }
    };
    onAddSignature(newSig);
    setSelectedSigId(newId);
    setIsEditingSig(true);
  };

  const handleDeleteSignature = () => {
    if (signatures.length <= 1) return;
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce profil de signature ?")) {
        onDeleteSignature(selectedSigId);
        const remaining = signatures.filter(s => s.id !== selectedSigId);
        if (remaining.length > 0) {
            setSelectedSigId(remaining[0].id);
        }
    }
  };

  // --- ACTIONS CATÉGORIES ---
  const handleSaveNewCategory = () => {
    if (newCategoryName.trim()) {
        const name = newCategoryName.trim();
        if (categories.includes(name)) {
            alert("Cette catégorie existe déjà.");
            return;
        }
        onAddCategory(name);
        setSelectedCategory(name);
        setNewCategoryName('');
        setIsAddingCategory(false);
    }
  };

  const handleDeleteCurrentCategory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedCategory) return;
    if (categories.length <= 1) {
        alert("Impossible de supprimer la dernière catégorie.");
        return;
    }

    // Check for templates in this category
    const associatedTemplates = templates.filter(t => t.category === selectedCategory).length;
    let message = `Voulez-vous vraiment supprimer la catégorie "${selectedCategory}" ?`;
    
    if (associatedTemplates > 0) {
        message += `\n\nAttention : ${associatedTemplates} modèle(s) associé(s) à cette catégorie ne seront plus accessibles.`;
    }

    if (window.confirm(message)) {
        onDeleteCategory(selectedCategory);
    }
  };

  // --- ACTIONS MODÈLES ---
  const handleSaveNewTemplate = () => {
    if (newTemplateName.trim()) {
        const newTmpl: EmailTemplate = {
            id: `tmpl-${Date.now()}`,
            category: selectedCategory,
            name: newTemplateName.trim()
        };
        onAddTemplate(newTmpl);
        setSelectedTemplateId(newTmpl.id);
        setNewTemplateName('');
        setIsAddingTemplate(false);
    }
  };

  const handleDeleteCurrentTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedTemplateId) return;

    const templateName = templates.find(t => t.id === selectedTemplateId)?.name || "ce modèle";

    if (window.confirm(`Voulez-vous vraiment supprimer le modèle "${templateName}" ?\nCette action est irréversible.`)) {
        onDeleteTemplate(selectedTemplateId);
    }
  };

  const toggleVoiceInput = (field: 'context' | 'body') => {
    if (recordingField === field) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch(e) {}
      }
      setRecordingField(null);
      return;
    }

    if (recordingField && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch(e) {}
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setRecordingField(field);
      recognition.onend = () => setRecordingField(null);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (field === 'context') {
          setContext(prev => (prev ? prev + ' ' : '') + transcript);
        } else {
          setGeneratedBody(prev => (prev ? prev + ' ' : '') + transcript);
        }
      };
      recognition.onerror = (event: any) => {
        setRecordingField(null);
        if (event.error !== 'no-speech') {
           console.warn("Erreur vocale:", event.error);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      alert("Impossible de démarrer la reconnaissance vocale.");
    }
  };

  const handleGenerate = async () => {
    let targetId = selectedTemplateId;
    if (!targetId && filteredTemplates.length > 0) {
        targetId = filteredTemplates[0].id;
        setSelectedTemplateId(targetId);
    }

    const template = templates.find(t => t.id === targetId);
    if (!template) {
        alert("Veuillez sélectionner un type de message avant de générer.");
        return;
    }

    setIsGenerating(true);
    setShowManualDraft(true);
    const currentSig = signatures.find(s => s.id === selectedSigId);
    const sigName = currentSig?.data?.name || currentSig?.name || "Moi";
    
    const result = await generateAIContextEmail(contact, template, context, sigName);
    setGeneratedSubject(result.subject);
    setGeneratedBody(result.body);
    setIsGenerating(false);
  };

  const handleManualDraft = () => {
    setShowManualDraft(true);
    if (!generatedBody) {
        setGeneratedBody('');
        setGeneratedSubject('');
    }
  };

  const handleCopy = async () => {
    const plainText = `${generatedSubject ? `Objet: ${generatedSubject}\n\n` : ''}${generatedBody}\n\n--\n${currentSigHTML.replace(/<br\/>/g, '\n').replace(/<[^>]*>?/gm, '')}`;
    const htmlContent = `
      <div style="font-family: sans-serif; font-size: 14px; color: #333;">
        ${generatedSubject ? `<strong>Objet:</strong> ${generatedSubject}<br/><br/>` : ''}
        ${generatedBody.replace(/\n/g, '<br/>')}
        <br/><br/>--<br/>
        ${currentSigHTML}
      </div>
    `;

    try {
      const typeHtml = "text/html";
      const typeText = "text/plain";
      const blobHtml = new Blob([htmlContent], { type: typeHtml });
      const blobText = new Blob([plainText], { type: typeText });
      
      if (typeof ClipboardItem !== 'undefined') {
          const data = [new ClipboardItem({ [typeHtml]: blobHtml, [typeText]: blobText })];
          await navigator.clipboard.write(data);
      } else {
          throw new Error("ClipboardItem not supported");
      }
      setCopied(true);
    } catch (err) {
      navigator.clipboard.writeText(plainText);
      setCopied(true);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMailTo = () => {
    const body = encodeURIComponent(generatedBody + `\n\n--\n${currentSigHTML.replace(/<br\/>/g, '\n').replace(/<[^>]*>?/gm, '')}`);
    const subject = encodeURIComponent(generatedSubject);
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
  };

  const handleSms = () => {
    const body = encodeURIComponent(generatedBody);
    const phone = contact.phone.replace(/[^0-9+]/g, '');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const separator = isIOS ? '&' : '?';
    window.location.href = `sms:${phone}${separator}body=${body}`;
  };

  const handleWhatsApp = () => {
    const body = encodeURIComponent(generatedBody);
    const phone = contact.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${body}`, '_blank');
  };

  const handleSocialClick = async (platform: keyof ContactData['socials']) => {
    await handleCopy();
    
    const value = contact.socials[platform];
    let url = '';
    
    switch(platform) {
        case 'linkedin': url = 'https://www.linkedin.com'; break;
        case 'twitter': url = 'https://twitter.com'; break;
        case 'facebook': url = 'https://www.facebook.com'; break;
        case 'instagram': url = 'https://www.instagram.com'; break;
    }

    if (value) {
        let handle = value.replace(/\/$/, '');
        if (handle.includes('http')) {
            const parts = handle.split('/');
            handle = parts[parts.length - 1];
        }
        handle = handle.replace('@', '');

        switch(platform) {
            case 'linkedin': url = value.includes('http') ? value : `https://www.linkedin.com/in/${handle}`; break;
            case 'twitter': url = `https://twitter.com/${handle}`; break;
            case 'facebook': url = `http://m.me/${handle}`; break;
            case 'instagram': url = `https://ig.me/m/${handle}`; break;
        }
        
        setTimeout(() => {
            window.open(url, '_blank');
        }, 100);
    } else {
         setTimeout(() => {
            window.open(url, '_blank');
        }, 100);
    }
  };

  const handleGoogleContacts = () => {
    window.open('https://contacts.google.com/new', '_blank');
  };

  // Render Social Buttons
  const SocialButtonsGrid = () => (
    <div className="grid grid-cols-2 gap-3 mt-2">
      <button onClick={() => handleSocialClick('linkedin')} className="p-3 bg-surface dark:bg-night-surface border border-slate-200 dark:border-night-border rounded-xl font-bold text-sm text-[#0077b5] flex items-center justify-center space-x-2 hover:bg-accent hover:text-primary hover:border-transparent transition shadow-sm">
        <Linkedin size={18} />
        <span>LinkedIn</span>
      </button>
      <button onClick={() => handleSocialClick('twitter')} className="p-3 bg-surface dark:bg-night-surface border border-slate-200 dark:border-night-border rounded-xl font-bold text-sm text-slate-900 dark:text-slate-200 flex items-center justify-center space-x-2 hover:bg-accent hover:text-primary hover:border-transparent transition shadow-sm">
        <Twitter size={18} />
        <span>X (Twitter)</span>
      </button>
      <button onClick={() => handleSocialClick('facebook')} className="p-3 bg-surface dark:bg-night-surface border border-slate-200 dark:border-night-border rounded-xl font-bold text-sm text-[#1877F2] flex items-center justify-center space-x-2 hover:bg-accent hover:text-primary hover:border-transparent transition shadow-sm">
        <Facebook size={18} />
        <span>Facebook</span>
      </button>
      <button onClick={() => handleSocialClick('instagram')} className="p-3 bg-surface dark:bg-night-surface border border-slate-200 dark:border-night-border rounded-xl font-bold text-sm text-[#E1306C] flex items-center justify-center space-x-2 hover:bg-accent hover:text-primary hover:border-transparent transition shadow-sm">
        <Instagram size={18} />
        <span>Instagram</span>
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col animate-slideInRight w-full bg-bg dark:bg-night-bg transition-colors">
      {/* Header */}
      <div className="p-6 pb-4 flex items-center space-x-4 sticky top-0 z-20 bg-bg dark:bg-night-bg">
        <button onClick={onBack} className="p-3 bg-surface dark:bg-night-surface shadow-sm hover:shadow-md rounded-full transition-all text-primary dark:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-xl text-primary dark:text-white truncate">{contact.fullName}</h2>
          <p className="text-sm text-secondary dark:text-night-text-sec truncate">{contact.company || contact.title}</p>
        </div>
      </div>

      {/* Tabs Pills */}
      <div className="px-6 pb-6">
        <div className="flex p-1.5 bg-surface dark:bg-night-surface rounded-full shadow-sm w-full max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('email')} 
            className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all duration-200 ${activeTab === 'email' ? 'bg-accent text-primary shadow-md' : 'text-secondary hover:text-primary dark:hover:text-white'}`}
          >
            Générateur IA
          </button>
          <button 
            onClick={() => setActiveTab('export')} 
            className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all duration-200 ${activeTab === 'export' ? 'bg-accent text-primary shadow-md' : 'text-secondary hover:text-primary dark:hover:text-white'}`}
          >
            Export & Actions
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar">
        {activeTab === 'email' && (
          <div className="space-y-6">
            
            {/* Config Card */}
            <div className="bg-surface dark:bg-night-surface p-5 rounded-3xl shadow-soft border border-slate-100 dark:border-night-border">
                <div className="space-y-5">
                    
                    {/* Category Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center text-xs font-bold text-secondary uppercase tracking-wider ml-1 gap-2">
                                <Layers size={14} />
                                <span>Type de message</span>
                            </label>
                            
                            {/* Add/Delete Category Controls */}
                            <div className="flex items-center space-x-2">
                                {!isAddingCategory && (
                                    <>
                                        <button 
                                            type="button"
                                            onClick={() => setIsAddingCategory(true)}
                                            className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer shadow-sm"
                                            title="Ajouter une catégorie"
                                        >
                                            <Plus size={18} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={handleDeleteCurrentCategory}
                                            className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer shadow-sm"
                                            title="Supprimer cette catégorie"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {isAddingCategory ? (
                            <div className="flex items-center space-x-2 animate-fadeIn">
                                <input 
                                    autoFocus
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Nouvelle catégorie..."
                                    className="flex-1 p-4 bg-bg dark:bg-night-bg border border-transparent focus:border-accent rounded-2xl text-sm font-medium outline-none text-primary dark:text-white"
                                />
                                <button 
                                    type="button"
                                    onClick={handleSaveNewCategory}
                                    className="p-4 bg-accent text-primary rounded-2xl hover:opacity-90 transition-opacity"
                                >
                                    <Check size={18} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                                    className="p-4 bg-slate-100 dark:bg-white/10 text-secondary rounded-2xl hover:text-primary dark:hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative group">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full p-4 pl-5 bg-bg dark:bg-night-bg border border-transparent hover:border-accent/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-accent appearance-none text-primary dark:text-white pr-10 truncate transition-all cursor-pointer"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-secondary group-hover:text-accent transition-colors">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Template Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center text-xs font-bold text-secondary uppercase tracking-wider ml-1 gap-2">
                                <FileText size={14} />
                                <span>Modèle</span>
                            </label>

                            <div className="flex items-center space-x-2">
                                {!isAddingTemplate && (
                                    <>
                                        <button 
                                            type="button"
                                            onClick={() => setIsAddingTemplate(true)}
                                            className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer shadow-sm"
                                            title="Ajouter un modèle"
                                        >
                                            <Plus size={18} />
                                        </button>
                                        {selectedTemplateId && (
                                            <button 
                                                type="button"
                                                onClick={handleDeleteCurrentTemplate}
                                                className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer shadow-sm"
                                                title="Supprimer ce modèle"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {isAddingTemplate ? (
                             <div className="flex items-center space-x-2 animate-fadeIn">
                                <input 
                                    autoFocus
                                    value={newTemplateName}
                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                    placeholder="Nouveau modèle..."
                                    className="flex-1 p-4 bg-bg dark:bg-night-bg border border-transparent focus:border-accent rounded-2xl text-sm font-medium outline-none text-primary dark:text-white"
                                />
                                <button 
                                    type="button"
                                    onClick={handleSaveNewTemplate}
                                    className="p-4 bg-accent text-primary rounded-2xl hover:opacity-90 transition-opacity"
                                >
                                    <Check size={18} />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setIsAddingTemplate(false); setNewTemplateName(''); }}
                                    className="p-4 bg-slate-100 dark:bg-white/10 text-secondary rounded-2xl hover:text-primary dark:hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative group">
                                <select
                                    value={selectedTemplateId || ''}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                    className="w-full p-4 pl-5 bg-bg dark:bg-night-bg border border-transparent hover:border-accent/50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-accent appearance-none text-primary dark:text-white pr-10 truncate transition-all cursor-pointer"
                                >
                                    {filteredTemplates.length > 0 ? (
                                        filteredTemplates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))
                                    ) : (
                                        <option value="">Aucun modèle disponible</option>
                                    )}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-secondary group-hover:text-accent transition-colors">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Context Input */}
                    <div>
                        <label className="flex items-center text-xs font-bold text-secondary uppercase tracking-wider mb-3 ml-1 gap-2">
                            <Sparkles size={14} />
                            <span>Contexte</span>
                        </label>
                        <div className="relative">
                            <textarea
                                className="w-full p-4 bg-bg dark:bg-night-bg border border-transparent focus:border-accent rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none resize-none text-primary dark:text-white placeholder-slate-400 transition-all min-h-[100px]"
                                placeholder="Ex: Rencontré au salon Tech, intéressé par nos services cloud..."
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                            />
                            <button 
                              type="button"
                              onClick={() => toggleVoiceInput('context')}
                              className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-300 ${recordingField === 'context' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse' : 'bg-surface dark:bg-night-surface text-secondary hover:text-primary dark:hover:text-white shadow-sm'}`}
                              title="Saisie vocale"
                            >
                              {recordingField === 'context' ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex flex-col space-y-3">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating || (!selectedTemplateId && filteredTemplates.length === 0)}
                            className="w-full py-4 bg-gradient-to-r from-accent to-blue-300 dark:from-accent dark:to-blue-600 text-primary dark:text-white rounded-2xl font-bold text-base flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] shadow-lg shadow-accent/20 hover:shadow-accent/40"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Rédaction en cours...</span>
                                </>
                            ) : (
                                <>
                                    <Wand2 size={20} />
                                    <span>Générer le message</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleManualDraft}
                            className="w-full py-3.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all"
                        >
                            <PenLine size={16} />
                            <span>Rédiger manuellement un brouillon</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Result Card */}
            {(generatedBody || generatedSubject || showManualDraft) && (
                <div className="bg-surface dark:bg-night-surface rounded-3xl shadow-soft overflow-hidden animate-fadeIn border border-slate-100 dark:border-night-border">
                    {/* Toolbar */}
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-night-border flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                        <span className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
                            <PenTool size={14} />
                            Brouillon
                        </span>
                        <div className="flex space-x-1">
                            <button type="button" onClick={() => setShowPreview(true)} className="p-2 hover:bg-white dark:hover:bg-night-bg rounded-full text-secondary hover:text-primary transition" title="Aperçu">
                                <Eye size={18} />
                            </button>
                            <button type="button" onClick={handleCopy} className="p-2 hover:bg-white dark:hover:bg-night-bg rounded-full text-secondary hover:text-primary transition" title="Copier">
                                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-6 space-y-5">
                         {selectedCategory !== 'SMS & Messagerie' && (
                            <div className="group">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1 block opacity-0 group-hover:opacity-100 transition-opacity">Objet</label>
                                <input 
                                    value={generatedSubject} 
                                    onChange={(e) => setGeneratedSubject(e.target.value)}
                                    className="w-full bg-transparent font-bold text-lg border-none focus:ring-0 p-0 text-primary dark:text-white placeholder-slate-300 border-b border-transparent focus:border-accent/50 transition-colors"
                                    placeholder="Objet du message..."
                                />
                            </div>
                         )}
                         
                         <div className="relative">
                             <textarea 
                                value={generatedBody}
                                onChange={(e) => setGeneratedBody(e.target.value)}
                                className="w-full bg-transparent text-base leading-relaxed text-primary dark:text-gray-300 border-none focus:ring-0 p-0 min-h-[200px] resize-none placeholder-secondary/50"
                                placeholder="Rédigez votre message ici..."
                             />
                             <button 
                                type="button"
                                onClick={() => toggleVoiceInput('body')}
                                className={`absolute bottom-2 right-2 p-2 rounded-full transition-all duration-300 ${recordingField === 'body' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse' : 'bg-slate-100 dark:bg-white/10 text-secondary hover:text-primary dark:hover:text-white shadow-sm'}`}
                                title="Saisie vocale"
                              >
                                {recordingField === 'body' ? <MicOff size={18} /> : <Mic size={18} />}
                              </button>
                         </div>
                         
                         {/* Signature Accordion */}
                         <div className="pt-4 border-t border-slate-100 dark:border-night-border">
                            {/* Header with Edit Toggle */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-secondary uppercase tracking-wider">Signature</span>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setIsEditingSig(!isEditingSig)}
                                    className="p-1.5 rounded-full bg-bg dark:bg-night-bg text-secondary hover:text-accent transition-colors"
                                    title={isEditingSig ? "Fermer l'éditeur" : "Modifier la signature"}
                                >
                                    <Edit2 size={12} />
                                </button>
                            </div>

                            {/* Always visible Profile Switcher */}
                            <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
                                {signatures.map(sig => (
                                    <button
                                        type="button"
                                        key={sig.id}
                                        onClick={() => setSelectedSigId(sig.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                                            selectedSigId === sig.id 
                                            ? 'bg-primary dark:bg-white text-white dark:text-black shadow-sm' 
                                            : 'bg-slate-100 dark:bg-white/5 text-secondary hover:bg-slate-200 dark:hover:bg-white/10'
                                        }`}
                                    >
                                        {sig.name}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleCreateSignature}
                                    className="px-2 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent hover:text-primary transition-colors flex-shrink-0"
                                    title="Nouveau profil"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            <div className={`overflow-hidden transition-all duration-300 ${isEditingSig ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="bg-bg dark:bg-night-bg p-4 rounded-2xl space-y-3 mb-4 border border-slate-100 dark:border-night-border">
                                    <div>
                                        <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Nom du profil</label>
                                        <input 
                                            value={editingProfileName} 
                                            onChange={(e) => setEditingProfileName(e.target.value)}
                                            className="w-full bg-surface dark:bg-night-surface p-2 rounded-lg text-sm border-none focus:ring-1 focus:ring-accent text-primary dark:text-white" 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Votre Nom</label>
                                            <input 
                                                value={sigFields.name} 
                                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                                className="w-full bg-surface dark:bg-night-surface p-2 rounded-lg text-sm border-none focus:ring-1 focus:ring-accent text-primary dark:text-white" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Poste</label>
                                            <input 
                                                value={sigFields.title} 
                                                onChange={(e) => handleFieldChange('title', e.target.value)}
                                                className="w-full bg-surface dark:bg-night-surface p-2 rounded-lg text-sm border-none focus:ring-1 focus:ring-accent text-primary dark:text-white" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Entreprise</label>
                                        <input 
                                            value={sigFields.company} 
                                            onChange={(e) => handleFieldChange('company', e.target.value)}
                                            className="w-full bg-surface dark:bg-night-surface p-2 rounded-lg text-sm border-none focus:ring-1 focus:ring-accent text-primary dark:text-white" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-secondary uppercase tracking-wider mb-1">Logo (Optionnel)</label>
                                        <div className="flex items-center space-x-3">
                                            {sigFields.logo && (
                                                <img src={sigFields.logo} className="h-8 w-auto rounded border border-slate-200" alt="preview" />
                                            )}
                                            <label className="px-3 py-2 bg-surface dark:bg-night-surface rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition text-xs font-bold text-secondary flex items-center space-x-1">
                                                <Upload size={12} />
                                                <span>Choisir...</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-2">
                                        <button type="button" onClick={handleDeleteSignature} className="text-red-400 hover:text-red-600 p-2 text-xs font-bold flex items-center gap-1">
                                            <Trash2 size={12} /> Supprimer
                                        </button>
                                        <button type="button" onClick={handleSaveCurrentSig} className="bg-primary dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90">
                                            Enregistrer
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Signature Preview (Always visible) */}
                            <div 
                                className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 text-sm text-primary dark:text-slate-300"
                                dangerouslySetInnerHTML={{ __html: currentSigHTML }}
                            />
                         </div>
                    </div>

                    {/* Quick Actions Bar */}
                    <div className="grid grid-cols-3 border-t border-slate-100 dark:border-night-border divide-x divide-slate-100 dark:divide-night-border bg-slate-50 dark:bg-night-bg">
                        <button type="button" onClick={handleMailTo} className="p-4 flex flex-col items-center justify-center space-y-1 hover:bg-white dark:hover:bg-white/5 transition group">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-300 group-hover:scale-110 transition">
                                <Mail size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Email</span>
                        </button>
                        <button type="button" onClick={handleSms} className="p-4 flex flex-col items-center justify-center space-y-1 hover:bg-white dark:hover:bg-white/5 transition group">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-300 group-hover:scale-110 transition">
                                <MessageSquare size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">SMS</span>
                        </button>
                        <button type="button" onClick={handleWhatsApp} className="p-4 flex flex-col items-center justify-center space-y-1 hover:bg-white dark:hover:bg-white/5 transition group">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-300 group-hover:scale-110 transition">
                                <MessageCircle size={20} />
                            </div>
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">WhatsApp</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Social Share */}
            <div className="bg-surface dark:bg-night-surface p-5 rounded-3xl shadow-soft border border-slate-100 dark:border-night-border">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Share2 size={14} />
                    Réseaux Sociaux
                </h3>
                <SocialButtonsGrid />
            </div>
            
            <div className="h-8"></div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-4">
             <div className="bg-surface dark:bg-night-surface p-6 rounded-3xl shadow-soft space-y-4 border border-slate-100 dark:border-night-border">
                <div className="flex items-center space-x-4 mb-2">
                   <div className="w-12 h-12 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                      <UserPlus size={24} />
                   </div>
                   <div>
                      <h3 className="font-bold text-lg text-primary dark:text-white">Sauvegarder</h3>
                      <p className="text-sm text-secondary">Ajouter aux contacts du téléphone</p>
                   </div>
                </div>
                <button 
                  type="button"
                  onClick={() => downloadVCard(contact)}
                  className="w-full py-4 bg-primary dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg hover:opacity-90 transition"
                >
                  <Download size={20} />
                  <span>Télécharger vCard (.vcf)</span>
                </button>
                <button 
                  type="button"
                  onClick={handleGoogleContacts}
                  className="w-full py-4 bg-surface dark:bg-night-surface text-primary dark:text-white border border-slate-200 dark:border-night-border rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                >
                   <img src="https://www.gstatic.com/images/branding/product/1x/contacts_48dp.png" alt="Google Contacts" className="w-5 h-5" />
                   <span>Ouvrir Google Contacts</span>
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowPreview(false)}>
           <div className="bg-surface dark:bg-night-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-100 dark:bg-night-bg p-4 flex justify-between items-center border-b border-slate-200 dark:border-night-border">
                 <h3 className="font-bold text-primary dark:text-white">Aperçu du message</h3>
                 <button type="button" onClick={() => setShowPreview(false)} className="p-2 bg-white dark:bg-white/10 rounded-full text-secondary hover:text-primary dark:text-white transition">
                    <X size={18} />
                 </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                 {generatedSubject && (
                    <div className="mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
                       <span className="text-xs font-bold text-secondary uppercase">Objet</span>
                       <p className="text-lg font-bold text-primary dark:text-white mt-1">{generatedSubject}</p>
                    </div>
                 )}
                 <div className="whitespace-pre-wrap text-base leading-relaxed text-primary dark:text-slate-200 font-sans">
                    {generatedBody}
                 </div>
                 <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10">
                    <div dangerouslySetInnerHTML={{__html: currentSigHTML}} className="text-sm text-secondary dark:text-slate-400" />
                 </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-night-bg border-t border-slate-200 dark:border-night-border flex space-x-3">
                 <button type="button" onClick={() => { handleCopy(); setShowPreview(false); }} className="flex-1 py-3 bg-primary dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg hover:opacity-90 transition flex items-center justify-center space-x-2">
                    <Copy size={18} />
                    <span>Copier</span>
                 </button>
                 <button type="button" onClick={() => { handleMailTo(); setShowPreview(false); }} className="flex-1 py-3 bg-accent text-primary rounded-xl font-bold shadow-lg hover:bg-accent-hover transition flex items-center justify-center space-x-2">
                    <Mail size={18} />
                    <span>Envoyer</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
