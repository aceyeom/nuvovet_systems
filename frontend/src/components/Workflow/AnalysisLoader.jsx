import React from 'react';
import { CheckCircle, Loader2, BrainCircuit } from 'lucide-react';

export const AnalysisLoader = ({ checkSequence }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 max-w-sm mx-auto">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500/10 blur-3xl animate-pulse rounded-full" />
        <BrainCircuit size={64} className="text-indigo-600 relative z-10 animate-pulse" />
      </div>
      <div className="w-full space-y-3">
        {['DDI Check', 'Dosage Range', 'Allergy Check', 'Disease Audit'].map((label, i) => {
          const keys = ['ddi', 'dose', 'allergy', 'disease'];
          const active = checkSequence[keys[i]];
          return (
            <div
              key={label}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-500 ${
                active
                  ? 'bg-white border-slate-200 shadow-sm'
                  : 'bg-transparent border-slate-100 opacity-20'
              }`}
            >
              <div className="flex items-center gap-3">
                {active ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <Loader2 size={16} className="animate-spin text-slate-300" />
                )}
                <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
