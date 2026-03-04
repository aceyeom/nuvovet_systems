import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus, AlertTriangle, Globe, FlaskConical, HelpCircle } from 'lucide-react';
import { searchDrugs, DRUG_DATABASE, DRUG_SOURCE, createUnknownDrug } from '../data/drugDatabase';

// Source badge for drug pills
function SourceIcon({ source }) {
  if (source === DRUG_SOURCE.HUMAN_OFFLABEL) {
    return <FlaskConical size={11} className="text-amber-500 shrink-0" title="Off-label human drug" />;
  }
  if (source === DRUG_SOURCE.FOREIGN) {
    return <Globe size={11} className="text-blue-500 shrink-0" title="Foreign drug" />;
  }
  if (source === DRUG_SOURCE.UNKNOWN) {
    return <HelpCircle size={11} className="text-slate-400 shrink-0" title="Unknown drug" />;
  }
  return null;
}

export function DrugInput({ drugs, onAddDrug, onRemoveDrug, species, demoMode = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUnknownOption, setShowUnknownOption] = useState(false);
  const [unknownIngredient, setUnknownIngredient] = useState('');
  const [showIngredientInput, setShowIngredientInput] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (value) => {
    setQuery(value);
    if (value.trim().length >= 1) {
      const found = searchDrugs(value, species);
      // Filter out already-added drugs
      const filtered = found.filter(d => !drugs.some(existing => existing.id === d.id));
      setResults(filtered);
      setShowUnknownOption(value.trim().length >= 2 && filtered.length === 0);
      setShowDropdown(true);
    } else {
      setResults([]);
      setShowDropdown(false);
      setShowUnknownOption(false);
    }
  };

  const handleSelectDrug = (drug) => {
    onAddDrug(drug);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setShowUnknownOption(false);
  };

  const handleAddUnknown = () => {
    setShowIngredientInput(true);
  };

  const handleConfirmUnknown = () => {
    const drug = createUnknownDrug(query.trim(), unknownIngredient.trim() || null);
    onAddDrug(drug);
    setQuery('');
    setUnknownIngredient('');
    setShowIngredientInput(false);
    setShowDropdown(false);
    setShowUnknownOption(false);
  };

  const sourceLabel = (source) => {
    if (source === DRUG_SOURCE.KR_VET) return null;
    if (source === DRUG_SOURCE.HUMAN_OFFLABEL) return 'Off-label';
    if (source === DRUG_SOURCE.FOREIGN) return 'Foreign';
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Drug list */}
      {drugs.length > 0 && (
        <div className="space-y-2">
          {drugs.map((drug, idx) => (
            <div
              key={drug.id || idx}
              className="flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg group transition-all hover:border-slate-300"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-400 font-mono w-4 shrink-0">{idx + 1}</span>
                <SourceIcon source={drug.source} />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-slate-800 truncate block">
                    {drug.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {drug.activeSubstance !== drug.name && drug.activeSubstance !== 'Unknown'
                      ? drug.activeSubstance + ' · '
                      : ''}
                    {drug.class}
                    {drug.source !== DRUG_SOURCE.KR_VET && (
                      <span className="ml-1.5 text-amber-500">
                        · {sourceLabel(drug.source)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveDrug(drug.id)}
                className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove drug"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query.trim().length >= 1 && setShowDropdown(true)}
            placeholder={drugs.length === 0 ? "Search drug name or active substance..." : "Add another drug..."}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && (results.length > 0 || showUnknownOption) && (
          <div
            ref={dropdownRef}
            className="absolute z-30 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {results.map((drug) => (
              <button
                key={drug.id}
                onClick={() => handleSelectDrug(drug)}
                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <SourceIcon source={drug.source} />
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {drug.name}
                      {drug.nameKr && (
                        <span className="ml-1.5 text-xs text-slate-400">{drug.nameKr}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {drug.class} · {drug.defaultDose[species] || '—'} {drug.unit} {drug.freq}
                      {sourceLabel(drug.source) && (
                        <span className="ml-1.5 text-amber-500">{sourceLabel(drug.source)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Unknown drug option */}
            {showUnknownOption && !showIngredientInput && (
              <button
                onClick={handleAddUnknown}
                className="w-full text-left px-3 py-3 hover:bg-slate-50 transition-colors border-t border-slate-100"
              >
                <div className="flex items-center gap-2 text-slate-500">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <div>
                    <div className="text-sm font-medium">
                      Add "{query.trim()}" as unknown drug
                    </div>
                    <div className="text-xs text-slate-400">
                      Not found in database — you can specify the active ingredient
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Active ingredient input for unknown drugs */}
            {showIngredientInput && (
              <div className="px-3 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-500 mb-2">
                  Optional: enter the active ingredient for better interaction analysis
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={unknownIngredient}
                    onChange={(e) => setUnknownIngredient(e.target.value)}
                    placeholder="e.g., acetaminophen"
                    className="flex-1 px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    autoFocus
                  />
                  <button
                    onClick={handleConfirmUnknown}
                    className="px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <button
                  onClick={handleConfirmUnknown}
                  className="mt-1.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  Skip — add without ingredient
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demo hint */}
      {demoMode && drugs.length === 0 && (
        <p className="text-xs text-slate-400 text-center">
          Add at least 2 drugs to check interactions
        </p>
      )}
    </div>
  );
}
