import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus, AlertTriangle, Globe, FlaskConical, HelpCircle, Pill } from 'lucide-react';
import { searchDrugs, DRUG_SOURCE, createUnknownDrug } from '../data/drugDatabase';
import { searchDrugCatalog } from '../data/drugSearchData';

function SourceIcon({ source }) {
  if (source === DRUG_SOURCE.HUMAN_OFFLABEL) return <FlaskConical size={11} className="text-amber-500 shrink-0" title="Off-label human drug" />;
  if (source === DRUG_SOURCE.FOREIGN) return <Globe size={11} className="text-blue-500 shrink-0" title="Foreign drug" />;
  if (source === DRUG_SOURCE.UNKNOWN) return <HelpCircle size={11} className="text-slate-400 shrink-0" title="Unknown drug" />;
  return null;
}

function RouteIcon({ route }) {
  if (!route || route === 'Unknown') return null;
  const r = route.toLowerCase();
  if (r.includes('po') || r === 'oral') return <span className="text-[11px]">💊</span>;
  if (r.includes('sc') || r.includes('iv') || r.includes('inject')) return <span className="text-[11px]">💉</span>;
  if (r.includes('topical')) return <span className="text-[11px]">🧴</span>;
  return null;
}

function DrugCard({ drug, index, onRemove, species }) {
  const isMdr1Risk = drug.mdr1Sensitive && species === 'dog';
  const isNti = drug.narrowTherapeuticIndex;
  const isOffLabel = drug.source === DRUG_SOURCE.HUMAN_OFFLABEL;

  return (
    <div className="flex items-start justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg group transition-all hover:border-slate-300 hover:shadow-sm">
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <span className="text-[10px] text-slate-400 font-mono w-4 shrink-0 mt-1">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <SourceIcon source={drug.source} />
            <span className="typo-drug-name text-[14px] truncate">{drug.name}</span>
            {drug.activeSubstance !== drug.name && drug.activeSubstance !== 'Unknown' && (
              <span className="text-[11px] text-slate-400">({drug.activeSubstance})</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {drug.selectedVariant && (
              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                {drug.selectedVariant}
              </span>
            )}
            <div className="flex items-center gap-1">
              <RouteIcon route={drug.route} />
              <span className="text-[10px] text-slate-400">{drug.route}</span>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{drug.class}</span>
            {isOffLabel && (
              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Off-label</span>
            )}
            {isNti && (
              <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">NTI</span>
            )}
            {isMdr1Risk && (
              <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">MDR1 ⚠</span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => onRemove(drug.id)}
        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function DrugInput({ drugs, onAddDrug, onRemoveDrug, species, demoMode = false }) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [catalogResults, setCatalogResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUnknownOption, setShowUnknownOption] = useState(false);
  const [unknownIngredient, setUnknownIngredient] = useState('');
  const [showIngredientInput, setShowIngredientInput] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

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

  useEffect(() => {
    if (showSearch && inputRef.current) inputRef.current.focus();
  }, [showSearch]);

  const handleSearch = (value) => {
    setQuery(value);
    setSelectedProduct(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (value.trim().length >= 1) {
        const found = searchDrugs(value, species).filter(d => !drugs.some(ex => ex.id === d.id));
        setResults(found);
        setCatalogResults(searchDrugCatalog(value));
        setShowUnknownOption(value.trim().length >= 2 && found.length === 0);
        setShowDropdown(true);
      } else {
        setResults([]);
        setCatalogResults([]);
        setShowDropdown(false);
        setShowUnknownOption(false);
      }
    }, 200);
  };

  const handleSelectDrug = (drug) => {
    const catalogMatch = catalogResults.find(c => c.drug_db_id === drug.id);
    if (catalogMatch && catalogMatch.variants.length > 1) {
      setSelectedProduct({ drug, catalog: catalogMatch });
      return;
    }
    const variant = catalogMatch?.variants[0];
    onAddDrug({
      ...drug,
      selectedVariant: variant ? `${variant.strength_value}${variant.strength_unit} ${catalogMatch.dosage_form?.split(',')[0] || ''}`.trim() : null,
    });
    resetSearch();
  };

  const handleSelectVariant = (variant) => {
    if (!selectedProduct) return;
    const { drug, catalog } = selectedProduct;
    onAddDrug({
      ...drug,
      selectedVariant: `${variant.strength_value}${variant.strength_unit} ${catalog.dosage_form?.split(',')[0] || ''}`.trim(),
    });
    resetSearch();
  };

  const resetSearch = () => {
    setQuery('');
    setResults([]);
    setCatalogResults([]);
    setShowDropdown(false);
    setShowUnknownOption(false);
    setSelectedProduct(null);
    setShowSearch(false);
  };

  const handleConfirmUnknown = () => {
    onAddDrug(createUnknownDrug(query.trim(), unknownIngredient.trim() || null));
    setUnknownIngredient('');
    setShowIngredientInput(false);
    resetSearch();
  };

  return (
    <div className="space-y-3">
      {drugs.length > 0 && (
        <div className="space-y-2">
          {drugs.map((drug, idx) => (
            <DrugCard key={drug.id || idx} drug={drug} index={idx} onRemove={onRemoveDrug} species={species} />
          ))}
        </div>
      )}

      {!showSearch ? (
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white text-[13px] font-medium rounded-lg hover:bg-slate-800 transition-all duration-200"
        >
          <Plus size={15} />
          Add Medication
        </button>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-expand-in">
          <div className="p-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => query.trim().length >= 1 && setShowDropdown(true)}
                placeholder="Search by brand name, generic name, or active ingredient"
                className="w-full pl-9 pr-8 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all placeholder:text-slate-400"
              />
              <button onClick={resetSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
          </div>

          {selectedProduct && (
            <div className="px-3 pb-3 animate-fade-in">
              <p className="text-[11px] text-slate-400 mb-2">
                Select strength for <span className="font-medium text-slate-600">{selectedProduct.catalog.english_name_base}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.catalog.variants.map((v) => (
                  <button
                    key={v.variant_id}
                    onClick={() => handleSelectVariant(v)}
                    className="px-3 py-1.5 text-[12px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 hover:border-slate-300 transition-all"
                  >
                    {v.strength_value}{v.strength_unit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDropdown && !selectedProduct && (results.length > 0 || showUnknownOption) && (
            <div ref={dropdownRef} className="border-t border-slate-100 max-h-60 overflow-y-auto">
              {results.map((drug) => {
                const cat = catalogResults.find(c => c.drug_db_id === drug.id);
                return (
                  <button
                    key={drug.id}
                    onClick={() => handleSelectDrug(drug)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Pill size={14} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-slate-800">{cat ? cat.english_name_base : drug.name}</span>
                          {drug.activeSubstance !== drug.name && (
                            <span className="text-[11px] text-slate-400">({drug.activeSubstance})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {cat ? `${cat.substance.drug_class}${cat.substance.subclass ? ` · ${cat.substance.subclass}` : ''} · ${cat.route_of_administration} ${cat.dosage_form}` : drug.class}
                        </div>
                        {cat && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {cat.variants.map(v => (
                              <span key={v.variant_id} className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {v.strength_value}{v.strength_unit}
                              </span>
                            ))}
                            {cat.variants[0]?.license_status === 'korean_approved' && (
                              <span className="text-[10px] text-emerald-600 font-medium">● Korean Licensed</span>
                            )}
                            {cat.variants[0]?.is_prescription_only && (
                              <span className="text-[10px] text-blue-600 font-medium">● Rx only</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {showUnknownOption && !showIngredientInput && (
                <button
                  onClick={() => setShowIngredientInput(true)}
                  className="w-full text-left px-3 py-3 hover:bg-slate-50 transition-colors border-t border-slate-100"
                >
                  <div className="flex items-center gap-2 text-slate-500">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <div>
                      <div className="text-[13px] font-medium">Add "{query.trim()}" as unknown drug</div>
                      <div className="text-[11px] text-slate-400">Not found in database — specify active ingredient</div>
                    </div>
                  </div>
                </button>
              )}

              {showIngredientInput && (
                <div className="px-3 py-3 border-t border-slate-100 bg-slate-50">
                  <p className="text-[11px] text-slate-500 mb-2">Optional: enter the active ingredient for better analysis</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={unknownIngredient}
                      onChange={(e) => setUnknownIngredient(e.target.value)}
                      placeholder="e.g., acetaminophen"
                      className="flex-1 px-2.5 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      autoFocus
                    />
                    <button onClick={handleConfirmUnknown} className="px-3 py-2 bg-slate-900 text-white text-[11px] font-medium rounded-lg hover:bg-slate-800">Add</button>
                  </div>
                  <button onClick={handleConfirmUnknown} className="mt-1.5 text-[11px] text-slate-400 hover:text-slate-600">Skip — add without ingredient</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {demoMode && drugs.length === 0 && (
        <p className="text-[11px] text-slate-400 text-center">Add at least 2 drugs to check interactions</p>
      )}
    </div>
  );
}
