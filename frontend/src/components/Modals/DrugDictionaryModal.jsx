import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';

export const DrugDictionaryModal = ({ drugDictionary, isOpen, onClose, onSelectDrug }) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredDrugs = drugDictionary.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl flex flex-col h-[650px] overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
              Veterinary Formulary
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Pharmacy Reference Database
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 hover:text-red-500 transition-all"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-8">
          <div className="relative">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"
              size={20}
            />
            <input
              autoFocus
              placeholder="Search clinical agents..."
              className="w-full pl-14 pr-8 py-5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-3">
          {filteredDrugs.map(drug => (
            <button
              key={drug.name}
              onClick={() => onSelectDrug(drug)}
              className="w-full p-6 bg-white rounded-[1.5rem] border border-slate-100 flex justify-between items-center hover:bg-indigo-600 hover:text-white transition-all group shadow-sm"
            >
              <div className="text-left">
                <p className="font-black text-sm mb-0.5">{drug.name}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase group-hover:text-indigo-200">
                  {drug.cat} • {drug.dose}{drug.unit}
                </p>
              </div>
              <Plus size={18} className="text-slate-400 group-hover:text-white" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
