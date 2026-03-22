import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, X, AlertTriangle, Globe, FlaskConical, HelpCircle,
  Pill, Ban, Loader2, ChevronDown, ChevronUp, SlidersHorizontal,
  Check,
} from 'lucide-react';
import { createUnknownDrug } from '../data/drugDatabase';
import { useI18n } from '../i18n';
import { listDrugsApi } from '../lib/api';

// ── Species-Specific Toxicity Hardstops ─────────────────────────
const SPECIES_HARDSTOPS = {
  cat: {
    acetaminophen: 'Acetaminophen (paracetamol) is acutely fatal in cats. Cats lack glucuronyl transferase and cannot metabolise it.',
    paracetamol:   'Paracetamol is acutely fatal in cats. Cats lack glucuronyl transferase and cannot metabolise it.',
    permethrin:    'Permethrin is a potent feline neurotoxin. Even small topical exposures cause seizures and death.',
    ibuprofen:     'Ibuprofen is highly toxic to cats causing acute renal failure and GI perforation.',
    naproxen:      'Naproxen is toxic to cats with a very narrow safety margin — do not use.',
    benzocaine:    'Benzocaine causes methaemoglobinaemia in cats and can be fatal.',
    'tea tree':    'Tea tree oil (melaleuca) is neurotoxic to cats even at low topical doses.',
    melaleuca:     'Melaleuca (tea tree) oil is neurotoxic to cats.',
    xylitol:       'Xylitol causes severe hypoglycaemia and liver failure.',
    'onion':       'Onion/garlic compounds cause Heinz body haemolytic anaemia in cats.',
    'garlic':      'Garlic compounds cause Heinz body haemolytic anaemia in cats.',
  },
  dog: {
    xylitol:   'Xylitol causes severe hypoglycaemia and acute hepatic necrosis in dogs.',
    grapes:    'Grapes/raisins cause acute renal failure in dogs via an unknown mechanism.',
    raisins:   'Raisins cause acute renal failure in dogs via an unknown mechanism.',
    macadamia: 'Macadamia nuts cause tremors and hyperthermia in dogs.',
  },
};

function checkHardstop(drug, species) {
  const checks = SPECIES_HARDSTOPS[species] || {};
  const nameStr = `${drug.name || ''} ${drug.activeSubstance || ''} ${(drug.brandNames || []).join(' ')}`.toLowerCase();
  for (const [fragment, reason] of Object.entries(checks)) {
    if (nameStr.includes(fragment)) return reason;
  }
  return null;
}

// ── Form → Route mapping ────────────────────────────────────────
const FORM_ROUTE_MAP = {
  Tab: ['PO'],
  Cap: ['PO'],
  Susp: ['PO'],
  Inj: ['IV', 'IM', 'SC'],
  Drop: ['Ophthalmic', 'Otic'],
  Oint: ['Topical'],
  Topical: ['Topical'],
  Ophthalmic: ['Ophthalmic'],
};

// ── Route-specific frequency options ────────────────────────────
const PARENTERAL_ROUTES = new Set(['IV', 'IM', 'SC']);

const FREQ_BY_ROUTE = {
  PO:    ['SID', 'BID', 'TID', 'QID', 'PRN', 'Other'],
  IV:    ['CRI', 'q2h', 'q4h', 'q6h', 'q8h', 'q12h', 'PRN', 'Other'],
  IM:    ['SID', 'BID', 'q8h', 'q12h', 'PRN', 'Other'],
  SC:    ['SID', 'BID', 'q8h', 'q12h', 'PRN', 'Other'],
  _default: ['SID', 'BID', 'TID', 'QID', 'q8h', 'q12h', 'PRN', 'Other'],
};

// ── Route-aware dose unit labels ────────────────────────────────
const ROUTE_UNIT_LABEL = {
  PO: '정',       // tablets
  IV: 'ml',
  IM: 'ml',
  SC: 'ml',
  Topical: '도포',  // application
  Ophthalmic: '방울', // drops
  Otic: '방울',
};

function getDoseUnitLabel(route) {
  return ROUTE_UNIT_LABEL[route] || 'units';
}

// ── Strength grouping by unit (mg = oral, mg/mL = injectable) ──
const UNIT_ORAL = new Set(['mg', 'g', 'mcg', 'µg']);
const UNIT_INJECTABLE = new Set(['mg/mL', 'mg/ml', 'IU/mL', 'iu/mL', 'mcg/mL', 'µg/mL', 'U/mL']);

function classifyStrengthUnit(unit) {
  if (!unit) return 'oral';
  const u = unit.trim();
  if (UNIT_INJECTABLE.has(u) || u.toLowerCase().includes('/ml')) return 'injectable';
  return 'oral';
}

function groupStrengthsByForm(strengths) {
  const oral = [];
  const injectable = [];
  (strengths || []).forEach((s, idx) => {
    const group = classifyStrengthUnit(s.unit);
    if (group === 'injectable') injectable.push({ ...s, _idx: idx });
    else oral.push({ ...s, _idx: idx });
  });
  return { oral, injectable };
}

// ── Dose unit options ───────────────────────────────────────────
const DOSE_UNIT_OPTIONS = ['mg/kg', 'mcg/kg', 'µg/kg', 'IU/kg', 'mg/m²', 'mL/kg', 'mg', 'mL'];

/** Given a drug's dosageForms + dosageList, compute valid routes. */
function getValidRoutes(drug, species) {
  const routes = new Set();
  // From dosage_list entries for this species
  const dList = drug.dosageList?.[species] || [];
  dList.forEach(e => { if (e.route) routes.add(e.route); });
  // From form→route mapping
  (drug.dosageForms || []).forEach(form => {
    (FORM_ROUTE_MAP[form] || []).forEach(r => routes.add(r));
  });
  // Fallback: if nothing, use the drug's default route
  if (routes.size === 0 && drug.route) routes.add(drug.route);
  return [...routes];
}

/** Find the dosage_list entry matching a route for a species. */
function findDosageForRoute(drug, species, route) {
  const dList = drug.dosageList?.[species] || [];
  return dList.find(e => e.route === route) || null;
}

// ── Source icon ─────────────────────────────────────────────────
function SourceIcon({ source }) {
  if (source === 'human_offlabel') return <FlaskConical size={13} className="text-amber-500 shrink-0" />;
  if (source === 'foreign') return <Globe size={13} className="text-blue-500 shrink-0" />;
  if (source === 'unknown') return <HelpCircle size={13} className="text-slate-400 shrink-0" />;
  return <Pill size={13} className="text-emerald-500 shrink-0" />;
}

// ── Dose Input ──────────────────────────────────────────────────
function DoseInput({ value, onChange, placeholder, className }) {
  const [localVal, setLocalVal] = useState(value !== '' && value != null ? String(value) : '');
  useEffect(() => { setLocalVal(value !== '' && value != null ? String(value) : ''); }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={localVal}
      onChange={(e) => { setLocalVal(e.target.value); onChange(e.target.value); }}
      onBlur={() => {
        const parsed = parseFloat(localVal);
        if (localVal === '' || isNaN(parsed)) { setLocalVal(''); onChange(''); }
        else { setLocalVal(String(parsed)); onChange(parsed); }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

// ── Get dose status ─────────────────────────────────────────────
function getDoseStatus(doseNum, range) {
  if (!doseNum || !range || !Array.isArray(range) || range.length < 2) return null;
  if (doseNum < range[0]) return 'below';
  if (doseNum > range[1]) return 'above';
  return 'within';
}

// ── Drug Card ───────────────────────────────────────────────────
function DrugCard({ drug, species, weight, onRemove, onUpdateDrug, collapseSignal }) {
  const hardstop = checkHardstop(drug, species);
  const hasSeenCollapseSignalRef = useRef(false);

  // Formulation state
  const strengths = drug.availableStrengths || [];
  const [selectedStrengthIdx, setSelectedStrengthIdx] = useState(
    drug._selectedStrengthIdx ?? 0
  );
  const selectedStrength = strengths[selectedStrengthIdx] || null;

  // ── Formulation → Route → Freq/Dose cascade ──────────────
  const validRoutes = getValidRoutes(drug, species);
  const [route, setRoute] = useState(() => {
    // Initialise to the drug's data-backed route, or fall back
    if (drug.route && validRoutes.includes(drug.route)) return drug.route;
    return validRoutes[0] || 'PO';
  });
  const [isOffLabel, setIsOffLabel] = useState(false);

  // Dosage entry for the currently-selected route
  const activeDosage = findDosageForRoute(drug, species, route);

  // Route options = data-backed + "Other (off-label)"
  const routeOptions = [...validRoutes, 'Other (off-label)'];

  // Frequency options depend on route
  const freqOptions = FREQ_BY_ROUTE[route] || FREQ_BY_ROUTE._default;
  const [freq, setFreq] = useState(() => {
    const initial = activeDosage?.frequency || drug.freq || 'SID';
    return freqOptions.includes(initial) ? initial : freqOptions[0];
  });

  // IV administration mode: bolus vs CRI
  const isParenteral = PARENTERAL_ROUTES.has(route);
  const isIV = route === 'IV';
  const [adminMode, setAdminMode] = useState('bolus'); // 'bolus' | 'cri'
  const [infusionRate, setInfusionRate] = useState('');
  const [infusionDuration, setInfusionDuration] = useState('');

  // Duration
  const [duration, setDuration] = useState(drug.prescriptionDays || 7);
  const [durationInput, setDurationInput] = useState(String(drug.prescriptionDays || 7));
  const [memo, setMemo] = useState(drug.memo || '');

  // Dose state — pre-fill with species default
  const defaultDose = drug.defaultDose?.[species] || '';
  const [dosePerKg, setDosePerKg] = useState(
    drug.dosePerKg !== undefined && drug.dosePerKg !== '' ? drug.dosePerKg : defaultDose
  );

  // Dose unit — auto from dosageList, manually overridable
  const [doseUnit, setDoseUnit] = useState(() => {
    return activeDosage?.unit || drug.unit || 'mg/kg';
  });

  // Grouped strengths for form-based display
  const strengthGroups = groupStrengthsByForm(strengths);

  // ── Cascade: when route changes, update freq, dose, duration, unit ──
  const handleRouteChange = (newRoute) => {
    if (newRoute === 'Other (off-label)') {
      setIsOffLabel(true);
      setRoute(newRoute);
      return;
    }
    setIsOffLabel(false);
    setRoute(newRoute);
    const entry = findDosageForRoute(drug, species, newRoute);
    if (entry) {
      // Auto-fill freq from dosage_list
      const newFreqOptions = FREQ_BY_ROUTE[newRoute] || FREQ_BY_ROUTE._default;
      const entryFreq = entry.frequency || 'SID';
      setFreq(newFreqOptions.includes(entryFreq) ? entryFreq : newFreqOptions[0]);
      // Auto-fill dose
      if (entry.value != null) {
        const parts = String(entry.value).split(/\s*[-–]\s*/);
        if (parts.length === 2) {
          const avg = ((parseFloat(parts[0]) + parseFloat(parts[1])) / 2);
          setDosePerKg(isNaN(avg) ? '' : avg);
        } else {
          const v = parseFloat(entry.value);
          setDosePerKg(isNaN(v) ? '' : v);
        }
      }
      // Auto-fill dose unit
      if (entry.unit) setDoseUnit(entry.unit);
      // Auto-fill duration hint (parse leading number from durationNote)
      if (entry.durationNote) {
        const m = entry.durationNote.match(/(\d+)/);
        if (m) { setDuration(parseInt(m[1], 10)); setDurationInput(m[1]); }
      }
    }
    // Reset IV-specific fields when switching away
    if (newRoute !== 'IV') {
      setAdminMode('bolus');
      setInfusionRate('');
      setInfusionDuration('');
    }
  };

  // ── Cascade: when formulation (strength) clicked, auto-switch route ──
  const handleFormulationChange = (idx) => {
    setSelectedStrengthIdx(idx);
    const s = strengths[idx];
    if (!s) return;
    const group = classifyStrengthUnit(s.unit);
    if (group === 'injectable') {
      // Auto-select first parenteral route
      const parenteralRoute = validRoutes.find(r => PARENTERAL_ROUTES.has(r));
      if (parenteralRoute && route !== parenteralRoute) handleRouteChange(parenteralRoute);
    } else {
      // Auto-select PO if available
      if (validRoutes.includes('PO') && route !== 'PO') handleRouteChange('PO');
    }
  };

  useEffect(() => {
    setDuration(drug.prescriptionDays || 7);
    setDurationInput(String(drug.prescriptionDays || 7));
  }, [drug.prescriptionDays]);

  // Expanded state
  const [expanded, setExpanded] = useState(true);
  const [isEntering, setIsEntering] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 20);
    return () => clearTimeout(timer);
  }, []);

  // Collapse only after the card has mounted, so a newly added card stays open.
  useEffect(() => {
    if (!hasSeenCollapseSignalRef.current) {
      hasSeenCollapseSignalRef.current = true;
      return;
    }
    setExpanded(false);
  }, [collapseSignal]);

  // Compute dose info
  const doseNum = parseFloat(dosePerKg) || 0;
  const weightNum = parseFloat(weight) || 0;
  const totalDoseMg = doseNum > 0 && weightNum > 0 ? +(doseNum * weightNum) : null;
  const range = drug.doseRange?.[species];
  const doseStatus = doseNum > 0 ? getDoseStatus(doseNum, range) : null;

  // Tablets / volume needed
  const tabletsNeeded = totalDoseMg && selectedStrength
    ? +(totalDoseMg / selectedStrength.value).toFixed(2)
    : null;
  const totalDoseDisplay = totalDoseMg != null
    ? `${totalDoseMg.toFixed(totalDoseMg < 1 ? 3 : totalDoseMg < 10 ? 2 : 1)} mg`
    : null;

  // Push updates to parent whenever key state changes
  useEffect(() => {
    onUpdateDrug(drug.id, {
      dosePerKg,
      doseUnit,
      route: isOffLabel ? 'Other' : route,
      freq,
      prescriptionDays: duration || '',
      memo,
      doseStatus,
      _selectedStrengthIdx: selectedStrengthIdx,
      ...(isIV && adminMode === 'cri' ? {
        adminMode: 'cri',
        infusionRate,
        infusionDuration,
      } : { adminMode: 'bolus' }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dosePerKg, doseUnit, route, freq, duration, memo, selectedStrengthIdx, adminMode, infusionRate, infusionDuration]);

  const inputBorderClass = doseStatus === 'above'
    ? 'border-red-400 focus:ring-red-200'
    : doseStatus === 'below'
    ? 'border-orange-400 focus:ring-orange-200'
    : 'border-slate-200 focus:ring-slate-900/10';

  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ease-out ${
      isEntering ? 'opacity-0 translate-y-1 scale-[0.995]' : 'opacity-100 translate-y-0 scale-100'
    } ${hardstop ? 'border-red-300' : doseStatus === 'above' ? 'border-red-200' : doseStatus === 'below' ? 'border-orange-200' : 'border-slate-200'}`}>

      {/* Hardstop banner */}
      {hardstop && (
        <div className="flex items-start gap-2 px-3.5 py-2 bg-red-100 border-b border-red-200">
          <Ban size={13} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-800 leading-relaxed font-medium">{hardstop}</p>
        </div>
      )}

      {/* Off-label route warning banner */}
      {isOffLabel && (
        <div className="flex items-start gap-2 px-3.5 py-2 bg-amber-50 border-b border-amber-200">
          <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800 leading-relaxed font-medium">
            Off-label route — no dosage data available. All fields require manual entry.
          </p>
        </div>
      )}

      {/* Drug header */}
      <div
        onClick={() => setExpanded(v => !v)}
        className="flex items-start gap-2.5 px-3.5 pt-2.5 pb-1.5 cursor-pointer"
      >
        <div className="mt-0.5"><SourceIcon source={drug.source} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 leading-tight">{drug.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {drug.nameKr && <span className="text-[11px] text-slate-400">{drug.nameKr}</span>}
            {drug.class && <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{drug.class}</span>}
            {drug.activeSubstance && drug.activeSubstance !== drug.name && (
              <span className="text-[10px] text-slate-400">{drug.activeSubstance}</span>
            )}
            {drug.isApproved?.[species] ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                <Check size={9} strokeWidth={3} /> 국내허가
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                <AlertTriangle size={9} /> 미허가
              </span>
            )}
          </div>
          {!expanded && (
            <></>
          )}
        </div>
        {!expanded && (
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 pt-1">
            <p className="text-[13px] font-semibold text-slate-700 tracking-wide whitespace-nowrap">
              {freq} · {route}{duration ? ` · ${duration}d` : ''}
            </p>
            {memo && <p className="text-[11px] text-slate-400 italic leading-snug mt-0.5 text-center">{memo}</p>}
          </div>
        )}
        {!expanded && (
          <div className="shrink-0 min-w-[170px] text-right">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5">
              <div className={`text-[14px] font-bold leading-tight ${
                doseStatus === 'above' ? 'text-red-700' :
                doseStatus === 'below' ? 'text-orange-700' :
                'text-slate-800'
              }`}>
                {totalDoseDisplay || '—'}
              </div>
              <div className="text-[9px] text-slate-500">총 투여량</div>
              {tabletsNeeded && selectedStrength && (
                <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                  {tabletsNeeded.toFixed(2)} {getDoseUnitLabel(route)} × {selectedStrength.value}{selectedStrength.unit}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(v => !v);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(drug.id);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
        expanded ? 'max-h-[720px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className={`px-3.5 pb-3 pt-2.5 ${expanded ? 'border-t border-slate-100' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-3">

            {/* Left: regimen controls (compact) */}
            <div className="space-y-2.5">
              {strengths.length > 0 && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">제형 Formulation</label>
                  <div className="space-y-1">
                    {strengthGroups.oral.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] font-semibold text-slate-400 w-8 shrink-0">경구</span>
                        {strengthGroups.oral.map((s) => (
                          <button key={s._idx} onClick={() => handleFormulationChange(s._idx)}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-all ${
                              selectedStrengthIdx === s._idx
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}>
                            {s.value}{s.unit}
                          </button>
                        ))}
                      </div>
                    )}
                    {strengthGroups.injectable.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] font-semibold text-blue-400 w-8 shrink-0">주사</span>
                        {strengthGroups.injectable.map((s) => (
                          <button key={s._idx} onClick={() => handleFormulationChange(s._idx)}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-all ${
                              selectedStrengthIdx === s._idx
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-blue-600 border-blue-200 hover:border-blue-300'
                            }`}>
                            {s.value}{s.unit}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">투여경로 Route</label>
                  <select value={isOffLabel ? 'Other (off-label)' : route} onChange={e => handleRouteChange(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-[12px] border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700 ${
                      isOffLabel ? 'border-amber-300' : 'border-slate-200'
                    }`}>
                    {routeOptions.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {activeDosage?.context && (
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{activeDosage.context}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">투여빈도 Freq</label>
                  <select value={freq} onChange={e => setFreq(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700">
                    {freqOptions.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {isIV && adminMode === 'cri' ? '주입시간 (hrs)' : '투여기간 (일)'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={durationInput}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!/^\d*$/.test(next)) return;
                      setDurationInput(next);
                      if (next === '') {
                        setDuration('');
                        return;
                      }
                      setDuration(parseInt(next, 10));
                    }}
                    onBlur={() => {
                      if (durationInput === '') return;
                      const parsed = parseInt(durationInput, 10);
                      if (Number.isNaN(parsed) || parsed < 1) {
                        setDuration(1);
                        setDurationInput('1');
                        return;
                      }
                      if (parsed > 365) {
                        setDuration(365);
                        setDurationInput('365');
                        return;
                      }
                      setDuration(parsed);
                      setDurationInput(String(parsed));
                    }}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700"
                  />
                </div>
              </div>

              {/* IV Bolus / CRI toggle + infusion fields */}
              {isIV && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">투여방법</label>
                    <div className="flex rounded-md border border-blue-200 overflow-hidden">
                      <button
                        onClick={() => setAdminMode('bolus')}
                        className={`px-2.5 py-1 text-[11px] font-medium transition-all ${
                          adminMode === 'bolus'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}>
                        Bolus
                      </button>
                      <button
                        onClick={() => { setAdminMode('cri'); setFreq('CRI'); }}
                        className={`px-2.5 py-1 text-[11px] font-medium transition-all ${
                          adminMode === 'cri'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-600 hover:bg-blue-50'
                        }`}>
                        CRI
                      </button>
                    </div>
                  </div>
                  {adminMode === 'cri' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">주입속도 (ml/hr)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={infusionRate}
                          onChange={(e) => setInfusionRate(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full px-2.5 py-1.5 text-[12px] border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300/30 bg-white text-slate-700 placeholder:text-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">주입시간 (hrs)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={infusionDuration}
                          onChange={(e) => setInfusionDuration(e.target.value)}
                          placeholder="e.g. 4"
                          className="w-full px-2.5 py-1.5 text-[12px] border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300/30 bg-white text-slate-700 placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Duration note from dosage data */}
              {activeDosage?.durationNote && (
                <div className="rounded-md border border-sky-100 bg-sky-50/50 px-2.5 py-1.5">
                  <p className="text-[9px] font-semibold text-sky-500 mb-0.5">투여기간 안내</p>
                  <p className="text-[11px] text-sky-800 leading-snug">{activeDosage.durationNote}</p>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">메모 Memo</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Qualitative notes (e.g., with food, monitor appetite, owner counseling)..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700 placeholder:text-slate-300 resize-y min-h-[54px]"
                />
              </div>
            </div>

            {/* Right: dose-related info */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">용량 Dose</label>
              <div className="flex items-center gap-1">
                <DoseInput
                  value={dosePerKg}
                  onChange={(v) => setDosePerKg(v)}
                  placeholder={range ? `${range[0]}–${range[1]}` : ''}
                  className={`w-full px-2.5 py-1.5 text-[12px] border rounded-md focus:outline-none focus:ring-2 bg-white placeholder:text-slate-300 transition-all ${inputBorderClass}`}
                />
                <select
                  value={doseUnit}
                  onChange={(e) => setDoseUnit(e.target.value)}
                  className="shrink-0 px-1.5 py-1.5 text-[10px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-500 font-medium"
                >
                  {DOSE_UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              {/* Always-visible dose range */}
              {range && (
                <div className={`text-[10px] flex items-center gap-1 ${
                  doseStatus === 'above' ? 'text-red-600 font-medium' :
                  doseStatus === 'below' ? 'text-orange-600 font-medium' :
                  doseStatus === 'within' ? 'text-emerald-600' :
                  'text-slate-400'
                }`}>
                  {doseStatus === 'above' && <AlertTriangle size={10} />}
                  {doseStatus === 'below' && <AlertTriangle size={10} />}
                  {doseStatus === 'within' && <Check size={9} strokeWidth={3} />}
                  <span>권장 {range[0]}–{range[1]} {doseUnit}</span>
                  {doseStatus === 'above' && <span>· 초과</span>}
                  {doseStatus === 'below' && <span>· 미달</span>}
                </div>
              )}

              {(totalDoseMg || doseNum > 0) ? (
                <div className="rounded-md p-2 text-center border border-slate-200 bg-slate-50/60">
                  {totalDoseMg != null ? (
                    <>
                      <div className={`text-[15px] font-bold leading-tight ${
                        doseStatus === 'above' ? 'text-red-700' :
                        doseStatus === 'below' ? 'text-orange-700' :
                        'text-slate-800'
                      }`}>
                        {totalDoseDisplay}
                      </div>
                      <div className="text-[9px] text-slate-400">총 투여량</div>
                      {doseStatus && (
                        <div className={`mt-1 inline-flex items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                          doseStatus === 'above'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : doseStatus === 'below'
                            ? 'border-orange-200 bg-orange-50 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}>
                          {doseStatus === 'above' ? '범위 초과' : doseStatus === 'below' ? '범위 미달' : '적정 범위'}
                        </div>
                      )}
                      {tabletsNeeded && (
                        <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                          {tabletsNeeded.toFixed(2)} {getDoseUnitLabel(route)} × {selectedStrength.value}{selectedStrength.unit}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-400">체중을 입력하세요</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter constants ─────────────────────────────────────────────
const DRUG_CLASSES = [
  'NSAID', 'Antibiotic', 'Corticosteroid', 'Sedative', 'Analgesic',
  'Antiemetic', 'GI Protectant', 'Antiparasitic', 'Cardiac', 'Diuretic',
  'Anticonvulsant', 'Antifungal', 'ACE Inhibitor', 'Immunosuppressant',
  'Antidepressant', 'Bronchodilator', 'Thyroid', 'Hormone', 'Antineoplastic Agent',
];
const SOURCE_OPTIONS = [
  { value: 'kr_vet',         label: 'KR Vet',    desc: 'Registered veterinary drug' },
  { value: 'human_offlabel', label: 'Off-label',  desc: 'Human drug, off-label use' },
  { value: 'foreign',        label: 'Imported',   desc: 'Foreign / imported drug' },
];
const FORM_OPTIONS = ['Tab', 'Inj', 'Cap', 'Susp', 'Drop', 'Oint', 'Topical', 'Ophthalmic'];

// ── Main DrugInput Component ────────────────────────────────────
export function DrugInput({ drugs, onAddDrug, onRemoveDrug, onUpdateDrug, species = 'dog', weight = 0, searchFn }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ class: null, source: null, form: null, hasReversal: false });
  const [collapseSignal, setCollapseSignal] = useState(0);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const selectedIds = new Set(drugs.map((d) => d.id));
  const activeFilterCount = [filters.class, filters.source, filters.form, filters.hasReversal].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  // Apply client-side filters to a result array
  const applyFilters = (items, f) => {
    const cf = f || filters;
    let out = items || [];
    if (cf.class)       out = out.filter(d => d.class === cf.class);
    if (cf.source)      out = out.filter(d => d.source === cf.source);
    if (cf.form)        out = out.filter(d => Array.isArray(d.dosageForms) && d.dosageForms.includes(cf.form));
    if (cf.hasReversal) out = out.filter(d => d.hasReversal);
    return out;
  };

  const doSearch = useCallback(async (q, cf) => {
    const hasFilters = cf && [cf.class, cf.source, cf.form, cf.hasReversal].some(Boolean);
    if (!q.trim() && !hasFilters) {
      setResults([]); setShowDropdown(false); setLoading(false); return;
    }
    setLoading(true);
    try {
      let raw;
      if (q.trim()) {
        raw = await searchFn(q.trim(), species, 30);
        raw = raw || [];
      } else {
        // browse mode — no text query, use list endpoint with class/source
        const data = await listDrugsApi({
          drugClass: cf?.class || undefined,
          source: cf?.source || undefined,
          limit: 50,
        });
        raw = data?.results || [];
      }
      setResults(applyFilters(raw, cf));
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFn, species]);

  const scheduleSearch = (q, cf) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q, cf), 280);
  };

  const handleQueryChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) setFilterOpen(false); // hide filters when typing
    scheduleSearch(val, filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, doSearch]);

  const handleFilterToggle = (key, val) => {
    const newF = { ...filters, [key]: filters[key] === val ? null : val };
    setFilters(newF);
    scheduleSearch(query, newF);
  };

  const toggleReversal = () => {
    const newF = { ...filters, hasReversal: !filters.hasReversal };
    setFilters(newF);
    scheduleSearch(query, newF);
  };

  const clearFilters = () => {
    const newF = { class: null, source: null, form: null, hasReversal: false };
    setFilters(newF);
    scheduleSearch(query, newF);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSearchFocus = () => {
    if (!filterOpen && (results.length > 0 || hasActiveFilters)) setShowDropdown(true);
  };

  const handleAddDrug = (drug) => {
    if (selectedIds.has(drug.id)) return;
    setCollapseSignal((v) => v + 1);
    onAddDrug(drug);
    setQuery(''); setResults([]); setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleAddUnknown = () => {
    if (!query.trim()) return;
    const unknown = createUnknownDrug(query.trim());
    if (!selectedIds.has(unknown.id)) {
      setCollapseSignal((v) => v + 1);
      onAddDrug(unknown);
    }
    setQuery(''); setResults([]); setShowDropdown(false);
    inputRef.current?.focus();
  };

  const sourceLabel = (src) => SOURCE_OPTIONS.find(s => s.value === src)?.label || src;

  return (
    <div className="space-y-2.5">

      {/* ── Search + filter unified ──────────────────────────── */}
      <div className="relative">
        {/* Search bar with embedded filter button */}
        <div className={`flex items-center border border-slate-200 bg-white transition-all focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-300 ${filterOpen ? 'rounded-t-xl' : 'rounded-xl'}`}>
          <Search size={15} className="shrink-0 ml-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={handleSearchFocus}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder={t.drugInput.searchPlaceholder}
            className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none placeholder:text-slate-300"
          />
          {loading && <Loader2 size={14} className="shrink-0 mr-2 text-slate-400 animate-spin" />}
          <div className="w-px h-5 bg-slate-200 shrink-0" />
          <button
            onMouseDown={(e) => { e.preventDefault(); setFilterOpen(v => !v); setShowDropdown(false); }}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors rounded-r-xl ${
              filterOpen || hasActiveFilters
                ? 'text-slate-900 bg-slate-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/80'
            }`}
          >
            <SlidersHorizontal size={13} />
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Dropdown results */}
        {showDropdown && !filterOpen && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
            {results.length === 0 && !loading && (
              <div className="px-4 py-3 space-y-2">
                <p className="text-[12px] text-slate-400">
                  {hasActiveFilters ? 'No drugs match your current filters' : t.drugInput.noMatchFound}
                </p>
                {query.trim() && (
                  <button onMouseDown={(e) => { e.preventDefault(); handleAddUnknown(); }}
                    className="text-[12px] text-slate-600 font-medium hover:text-slate-900 transition-colors">
                    + {t.drugInput.addUnknownDrug.replace('{name}', query.trim())}
                  </button>
                )}
              </div>
            )}
            {results.map((drug) => {
              const isSelected = selectedIds.has(drug.id);
              const hardstop = checkHardstop(drug, species);
              const range = drug.doseRange?.[species];
              return (
                <button key={drug.id}
                  onMouseDown={(e) => { e.preventDefault(); if (!isSelected) handleAddDrug(drug); }}
                  disabled={isSelected}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 transition-colors ${isSelected ? 'bg-slate-50 opacity-60 cursor-default' : 'hover:bg-slate-50'} ${hardstop ? 'bg-red-50/50' : ''}`}>
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5"><SourceIcon source={drug.source} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-slate-900">{drug.name}</span>
                        {drug.nameKr && <span className="text-[12px] text-slate-500">{drug.nameKr}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {drug.class && <span className="text-[10px] font-medium text-slate-400">{drug.class}</span>}
                        {range && <span className="text-[10px] text-slate-400">{range[0]}–{range[1]} mg/kg</span>}
                        {drug.hasReversal && (
                          <span className="text-[10px] text-violet-600 font-medium">↩ Reversal</span>
                        )}
                        {hardstop && (
                          <span className="flex items-center gap-1 text-[10px] text-red-600 font-medium">
                            <AlertTriangle size={10} /> Species contraindication
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <span className="text-[10px] text-slate-400 shrink-0 self-center">{t.drugInput.selected}</span>}
                  </div>
                </button>
              );
            })}
            {query.trim() && results.length > 0 && (
              <button onMouseDown={(e) => { e.preventDefault(); handleAddUnknown(); }}
                className="w-full text-left px-4 py-2.5 text-[12px] text-slate-500 hover:bg-slate-50 transition-colors border-t border-slate-100">
                + {t.drugInput.addUnknownDrug.replace('{name}', query.trim())}
              </button>
            )}
          </div>
        )}

        {/* ── Compact filter panel — attached below search bar ── */}
        <div className={`border border-slate-200 border-t-0 rounded-b-xl bg-white overflow-hidden shadow-sm transition-[max-height,opacity] duration-300 ease-in-out ${
          filterOpen ? 'max-h-[720px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none border-transparent shadow-none'
        }`}>

            {/* Active chips */}
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 bg-slate-50/60 border-b border-slate-100">
                {filters.class && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    {filters.class}
                    <button onClick={() => handleFilterToggle('class', filters.class)}><X size={9} /></button>
                  </span>
                )}
                {filters.source && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    {sourceLabel(filters.source)}
                    <button onClick={() => handleFilterToggle('source', filters.source)}><X size={9} /></button>
                  </span>
                )}
                {filters.form && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-full">
                    {filters.form}
                    <button onClick={() => handleFilterToggle('form', filters.form)}><X size={9} /></button>
                  </span>
                )}
                {filters.hasReversal && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                    Has Reversal
                    <button onClick={toggleReversal}><X size={9} /></button>
                  </span>
                )}
                <button onClick={clearFilters} className="text-[10px] text-slate-400 hover:text-red-500 ml-auto transition-colors">Clear all</button>
              </div>
            )}

            <div className="p-3 space-y-2.5">
              {/* Drug Class */}
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Drug Class</p>
                <div className="flex flex-wrap gap-1">
                  {DRUG_CLASSES.map((cls) => (
                    <button key={cls} onClick={() => handleFilterToggle('class', cls)}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded-full border transition-all ${
                        filters.class === cls
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                      }`}>{cls}</button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100" />

              <div className="grid grid-cols-2 gap-3">
                {/* Source */}
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Source</p>
                  <div className="flex flex-col gap-1">
                    {SOURCE_OPTIONS.map((opt) => (
                      <button key={opt.value} onClick={() => handleFilterToggle('source', opt.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-left ${
                          filters.source === opt.value
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}>
                        <SourceIcon source={opt.value} />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form + Reversal */}
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Form</p>
                    <div className="flex flex-wrap gap-1">
                      {FORM_OPTIONS.map((form) => (
                        <button key={form} onClick={() => handleFilterToggle('form', form)}
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-lg border transition-all ${
                            filters.form === form
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}>{form}</button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={filters.hasReversal} onChange={toggleReversal}
                      className="w-3 h-3 rounded border-slate-300 text-slate-800 focus:ring-slate-500" />
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-700">Has reversal agent</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Selected drug cards */}
      {drugs.length > 0 && (
        <div className="space-y-3">
          {drugs.map((drug) => (
            <DrugCard
              key={drug.id}
              drug={drug}
              species={species}
              weight={weight}
              onRemove={onRemoveDrug}
              onUpdateDrug={onUpdateDrug}
              collapseSignal={collapseSignal}
            />
          ))}
        </div>
      )}

      {drugs.length === 0 && !query && !hasActiveFilters && (
        <p className="text-center text-[13px] text-slate-400 py-6">
          {t.fullSystem.addMoreDrugs || 'Search and add drugs to start your prescription'}
        </p>
      )}
    </div>
  );
}
