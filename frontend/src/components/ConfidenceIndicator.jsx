import React from 'react';

export function ConfidenceIndicator({ score }) {
  const getColor = () => {
    if (score >= 85) return { bar: 'bg-emerald-500', text: 'text-emerald-700', label: 'High Confidence' };
    if (score >= 60) return { bar: 'bg-amber-500', text: 'text-amber-700', label: 'Moderate Confidence' };
    return { bar: 'bg-red-500', text: 'text-red-700', label: 'Low Confidence' };
  };

  const { bar, text, label } = getColor();

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Analysis Confidence
        </span>
        <span className={`text-sm font-semibold ${text}`}>{score}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${bar} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className={`mt-1.5 text-xs ${text}`}>{label}</p>
    </div>
  );
}
