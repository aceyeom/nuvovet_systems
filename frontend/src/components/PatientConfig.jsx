import React from 'react';

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog', emoji: '🐕' },
  { value: 'cat', label: 'Cat', emoji: '🐈' },
];

export function PatientConfig({ species, weight, onSpeciesChange, onWeightChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Species */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
          Species
        </label>
        <div className="flex gap-2">
          {SPECIES_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSpeciesChange(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all duration-200 ${
                species === opt.value
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weight */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
          Weight (kg)
        </label>
        <input
          type="number"
          min="0.1"
          max="100"
          step="0.1"
          value={weight}
          onChange={(e) => onWeightChange(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
        />
      </div>
    </div>
  );
}
