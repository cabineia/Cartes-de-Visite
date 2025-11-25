
import React from 'react';
import { ContactData } from '../types';
import { Trash2, ChevronRight, Search } from 'lucide-react';

interface StepHistoryProps {
  history: ContactData[];
  onSelect: (contact: ContactData) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const StepHistory: React.FC<StepHistoryProps> = ({ history, onSelect, onDelete, onBack }) => {
  const [search, setSearch] = React.useState('');

  const filtered = history.filter(c => 
    c.fullName.toLowerCase().includes(search.toLowerCase()) || 
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col animate-fadeIn bg-bg dark:bg-night-bg transition-colors">
      <div className="p-4 border-b border-slate-200 dark:border-night-border bg-surface dark:bg-night-bg sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-primary dark:text-white">Historique</h2>
          <button onClick={onBack} className="text-secondary text-sm font-medium hover:text-primary dark:hover:text-white">Nouveau Scan</button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" size={16} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-bg dark:bg-night-surface border-none rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none text-primary dark:text-white"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-secondary">
            <p>Aucun contact trouvé.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(contact => (
              <div 
                key={contact.id}
                className="bg-surface dark:bg-night-surface p-4 rounded-xl border border-slate-100 dark:border-night-border flex items-center justify-between group hover:border-accent transition shadow-sm cursor-pointer"
                onClick={() => onSelect(contact)}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-bg dark:bg-night-bg rounded-full flex items-center justify-center text-secondary font-bold text-lg shrink-0 overflow-hidden">
                    {contact.profileImage ? (
                      <img src={contact.profileImage} alt={contact.fullName} className="w-full h-full object-cover" />
                    ) : (
                      contact.fullName.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary dark:text-white">{contact.fullName}</h3>
                    <p className="text-xs text-secondary dark:text-night-text-sec">{contact.company || contact.title}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                   <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce contact ?')) {
                        onDelete(contact.id); 
                      }
                    }}
                    className="p-2 text-secondary hover:text-red-500 transition"
                    title="Supprimer"
                   >
                     <Trash2 size={18} />
                   </button>
                   <div className="p-2 text-secondary hover:text-primary dark:hover:text-white">
                     <ChevronRight size={18} />
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
