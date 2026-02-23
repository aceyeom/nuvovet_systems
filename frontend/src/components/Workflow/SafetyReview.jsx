import React from 'react';
import { ShieldAlert, AlertTriangle, Save } from 'lucide-react';

export const SafetyReview = ({ screeningResult, onApplyChange, onAdjust, onFinalize }) => {
  if (!screeningResult) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={364}
                strokeDashoffset={364 - (364 * (screeningResult?.score || 0)) / 100}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  screeningResult?.score > 70
                    ? 'text-green-500'
                    : screeningResult?.score > 40
                    ? 'text-amber-500'
                    : 'text-red-500'
                }`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-800">{screeningResult?.score}%</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Safety</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase leading-none">Safety Assessment</h3>
            <p className="text-xs font-bold text-slate-400 mt-2 max-w-xs uppercase leading-relaxed">
              {screeningResult?.score > 70
                ? 'Low risk detected. Proceed with standard monitoring.'
                : 'Action required. Significant clinical risks identified.'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Alert Count</p>
          <p className="text-4xl font-black text-slate-900 leading-none">{screeningResult?.alerts?.length || 0}</p>
        </div>
      </div>

      {(screeningResult?.alerts ?? []).map((alert, i) => (
        <div
          key={i}
          className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-2 duration-300"
        >
          <div className="p-8 flex items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  alert.severity === 'Critical'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {alert.severity === 'Critical' ? (
                  <ShieldAlert size={28} />
                ) : (
                  <AlertTriangle size={28} />
                )}
              </div>
              <div>
                <p className="text-sm font-black text-slate-800 leading-tight mb-1">{alert.title}</p>
                <span
                  className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                    alert.severity === 'Critical'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {alert.severity} Risk
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Recommendation</p>
                <p className="text-xs font-bold text-slate-600 italic">"{alert.shortFix}"</p>
              </div>
              <button
                onClick={() => onApplyChange(alert)}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 transition-all shadow-lg"
              >
                Resolve Issue
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-4 pt-10">
        <button
          onClick={onAdjust}
          className="flex-1 py-5 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-slate-600 transition-colors"
        >
          Adjust Prescription
        </button>
        <button
          onClick={onFinalize}
          className="flex-[2] py-5 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
        >
          <Save size={16} /> Finalize Prescription
        </button>
      </div>
    </div>
  );
};
