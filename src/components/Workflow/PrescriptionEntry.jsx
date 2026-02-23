import React from 'react';
import { Pill, Trash2, Plus } from 'lucide-react';

export const PrescriptionEntry = ({ prescription, onEdit, onRemove, onAddDrug }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 gap-4">
        {prescription.map(p => (
          <div
            key={p.id}
            className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between shadow-sm group hover:border-indigo-300 transition-all"
          >
            <div className="flex items-center gap-6 flex-1">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <Pill size={24} />
              </div>
              <div className="grid grid-cols-3 flex-1 items-center">
                <div className="pr-4 border-r border-slate-100 group-hover:border-indigo-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Drug Name</p>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => onEdit(p.id, 'name', e.target.value)}
                    className="w-full bg-transparent font-black text-slate-800 text-sm outline-none focus:text-indigo-600 transition-colors"
                  />
                </div>
                <div className="px-6 border-r border-slate-100 group-hover:border-indigo-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Dosage</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={p.dosage}
                      onChange={(e) => onEdit(p.id, 'dosage', e.target.value)}
                      className="w-12 bg-transparent font-black text-slate-800 text-sm outline-none focus:text-indigo-600 transition-colors"
                    />
                    <span className="text-xs font-bold text-slate-400 uppercase">{p.unit}</span>
                  </div>
                </div>
                <div className="px-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Frequency</p>
                  <input
                    type="text"
                    value={p.freq}
                    onChange={(e) => onEdit(p.id, 'freq', e.target.value)}
                    className="w-full bg-transparent font-black text-slate-800 text-sm outline-none focus:text-indigo-600 transition-colors"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => onRemove(p.id)}
              className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        <button
          onClick={onAddDrug}
          className="w-full py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center gap-3 text-slate-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 transition-all"
        >
          <Plus size={32} />
          <span className="text-[11px] font-black uppercase tracking-widest">Add Drug from Formulary</span>
        </button>
      </div>
    </div>
  );
};
