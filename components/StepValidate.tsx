import React, { useState, useRef } from 'react';
import { ContactData } from '../types';
import { Check, X, User, Building, Phone, Mail, Globe, MapPin, Linkedin, Twitter, Facebook, Instagram, Camera } from 'lucide-react';
import { fileToBase64, resizeImage } from '../services/utils';

interface StepValidateProps {
  contact: ContactData;
  onUpdate: (field: keyof ContactData, value: any) => void;
  onSocialUpdate: (platform: keyof ContactData['socials'], value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

// Extracted components to prevent re-renders causing focus loss
const InputGroup = ({ 
  icon: Icon, 
  label, 
  value, 
  field, 
  onChange,
  type = "text" 
}: { 
  icon: any, 
  label: string, 
  value: string, 
  field: keyof ContactData, 
  onChange: (field: keyof ContactData, value: string) => void,
  type?: string
}) => (
  <div className="relative group bg-bg dark:bg-night-bg/50 rounded-2xl transition-all focus-within:bg-surface dark:focus-within:bg-black focus-within:ring-2 focus-within:ring-accent focus-within:shadow-soft">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary">
      <Icon size={20} />
    </div>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(field, e.target.value)}
      className="block w-full pl-12 pr-4 py-4 bg-transparent border-none rounded-2xl focus:ring-0 placeholder-slate-400 text-primary dark:text-white font-medium"
      placeholder={label}
    />
  </div>
);

const SocialInput = ({ 
  icon: Icon, 
  platform, 
  value, 
  onChange 
}: { 
  icon: any, 
  platform: keyof ContactData['socials'], 
  value: string, 
  onChange: (platform: keyof ContactData['socials'], value: string) => void
}) => (
  <div className="flex items-center space-x-3 p-2">
    <div className="text-secondary"><Icon size={20} /></div>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(platform, e.target.value)}
      className="flex-1 py-2 bg-transparent border-b border-slate-200 dark:border-night-border focus:border-accent outline-none text-sm font-medium text-primary dark:text-white placeholder-slate-300"
      placeholder={`Lien ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
    />
  </div>
);

export const StepValidate: React.FC<StepValidateProps> = ({ contact, onUpdate, onSocialUpdate, onSave, onCancel }) => {
  const profileInputRef = useRef<HTMLInputElement>(null);
  
  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        const resized = await resizeImage(base64, 512, 512, 'image/jpeg', 0.85);
        onUpdate('profileImage', resized);
      } catch (err) {
        console.error("Profile photo upload failed", err);
      }
    }
  };

  return (
    <div className="h-full flex flex-col w-full bg-bg dark:bg-night-bg animate-fadeIn transition-colors">
      {/* Header Sticky */}
      <div className="flex items-center justify-between px-6 py-4 bg-bg dark:bg-night-bg sticky top-0 z-20">
        <button onClick={onCancel} className="p-3 bg-surface dark:bg-night-surface text-secondary hover:text-red-500 rounded-full shadow-sm transition">
          <X size={20} />
        </button>
        <h2 className="font-bold text-lg text-primary dark:text-white">Vérification</h2>
        <button onClick={onSave} className="p-3 bg-accent text-primary hover:bg-accent-hover rounded-full shadow-lg transition">
          <Check size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar space-y-6">
        
        {/* Profile Photo Section */}
        <div className="flex flex-col items-center justify-center pt-4 pb-6">
           <div className="relative group cursor-pointer" onClick={() => profileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden bg-surface dark:bg-night-surface border-4 border-surface dark:border-night-border shadow-card flex items-center justify-center">
                {contact.profileImage ? (
                  <img src={contact.profileImage} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-slate-300">{contact.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition transform">
                <Camera size={16} />
              </div>
           </div>
           <input 
             type="file" 
             ref={profileInputRef}
             className="hidden"
             accept="image/*"
             onChange={handleProfilePhotoUpload}
           />
        </div>

        <div className="bg-surface dark:bg-night-surface p-6 rounded-3xl shadow-soft space-y-4">
          <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Identité</h3>
          <InputGroup icon={User} label="Nom complet" value={contact.fullName} field="fullName" onChange={onUpdate} />
          <div className="grid grid-cols-1 gap-4">
             <InputGroup icon={User} label="Poste" value={contact.title} field="title" onChange={onUpdate} />
             <InputGroup icon={Building} label="Entreprise" value={contact.company} field="company" onChange={onUpdate} />
          </div>
        </div>

        <div className="bg-surface dark:bg-night-surface p-6 rounded-3xl shadow-soft space-y-4">
          <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Contact</h3>
          <InputGroup icon={Mail} label="Email" value={contact.email} field="email" type="email" onChange={onUpdate} />
          <InputGroup icon={Phone} label="Téléphone" value={contact.phone} field="phone" type="tel" onChange={onUpdate} />
          <InputGroup icon={Globe} label="Site Web" value={contact.website} field="website" type="url" onChange={onUpdate} />
          <InputGroup icon={MapPin} label="Adresse" value={contact.address} field="address" onChange={onUpdate} />
        </div>

        <div className="bg-surface dark:bg-night-surface p-6 rounded-3xl shadow-soft space-y-4">
          <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">Réseaux</h3>
          <div className="space-y-2">
            <SocialInput icon={Linkedin} platform="linkedin" value={contact.socials.linkedin || ''} onChange={onSocialUpdate} />
            <SocialInput icon={Twitter} platform="twitter" value={contact.socials.twitter || ''} onChange={onSocialUpdate} />
            <SocialInput icon={Facebook} platform="facebook" value={contact.socials.facebook || ''} onChange={onSocialUpdate} />
            <SocialInput icon={Instagram} platform="instagram" value={contact.socials.instagram || ''} onChange={onSocialUpdate} />
          </div>
        </div>

        {/* Card Image Preview */}
        {contact.scanImage && (
          <div className="rounded-3xl overflow-hidden shadow-soft mt-4 border border-slate-100 dark:border-night-border">
            <img src={contact.scanImage} alt="Carte scannée" className="w-full object-cover opacity-90 hover:opacity-100 transition" />
          </div>
        )}
        
        <div className="h-8"></div>
      </div>
    </div>
  );
};