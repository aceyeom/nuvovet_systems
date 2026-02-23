import React from 'react';
import { FlaskConical, AlertCircle } from 'lucide-react';

export const PatientPanel = ({ patient }) => {
  return (
    <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 leading-none">{patient.name}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {patient.breed} • {patient.sex}
            </p>
          </div>
          <div className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter">
            In-Patient
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
            <p className="text-[8px] font-bold text-slate-400 uppercase">Weight</p>
            <p className="text-xs font-black text-slate-700">{patient.weight}</p>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
            <p className="text-[8px] font-bold text-slate-400 uppercase">Temp</p>
            <p className="text-xs font-black text-slate-700">{patient.temp}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
            <FlaskConical size={12} /> Diagnostic Baseline
          </h4>
          <div className="space-y-1">
            {Object.entries(patient.labResults).map(([key, val]) => (
              <div key={key} className="flex justify-between text-[11px] font-bold py-1 border-b border-slate-50">
                <span className="text-slate-400 uppercase">{key}</span>
                <span className="text-slate-700">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-red-500 uppercase mb-3 flex items-center gap-2">
            <AlertCircle size={12} /> Clinical Contraindications
          </h4>
          <div className="space-y-2">
            {patient.conditions.map(c => (
              <div key={c} className="p-3 bg-red-50 rounded-xl border border-red-100 text-[11px] font-black text-red-700 flex items-start gap-2">
                <AlertCircle size={10} className="mt-0.5 shrink-0" />
                {c}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-900 rounded-2xl">
          <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">Subjective History</h4>
          <p className="text-[11px] font-bold text-slate-300 leading-relaxed italic">"{patient.history}"</p>
        </div>
      </div>
    </aside>
  );
};
