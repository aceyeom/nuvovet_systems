import React from 'react';
import { Pill, Sparkles } from 'lucide-react';

export const Header = ({ workflowStep, onExecuteDUR }) => {
  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
          <Pill size={20} />
        </div>
        <div>
          <h1 className="text-sm font-black uppercase tracking-tight text-slate-800">
            {workflowStep === 'entry'
              ? 'Prescription Entry'
              : workflowStep === 'review'
              ? 'Clinical Safety Audit'
              : 'Final Order Verification'}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Pharmacy OS v4.0</p>
        </div>
      </div>
      {workflowStep === 'entry' && (
        <button
          onClick={onExecuteDUR}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <Sparkles size={14} /> Execute DUR Scan
        </button>
      )}
    </header>
  );
};
