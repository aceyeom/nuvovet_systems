import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search, X, AlertTriangle, Globe, FlaskConical, HelpCircle,
  Pill, Ban, Loader2, ChevronDown, ChevronUp, SlidersHorizontal,
  Check, Info,
} from 'lucide-react';
import { createUnknownDrug } from '../data/drugDatabase';
import { useI18n } from '../i18n';
import { listDrugsApi } from '../lib/api';

// ── Species-Specific Toxicity Hardstops ─────────────────────────
const SPECIES_HARDSTOPS = {
  cat: {
    acetaminophen: '아세트아미노펜(파라세타몰)은 고양이에게 치명적입니다. 글루쿠론산 전이효소가 부족하여 대사할 수 없습니다.',
    paracetamol:   '파라세타몰은 고양이에게 치명적입니다. 글루쿠론산 전이효소가 부족하여 대사할 수 없습니다.',
    permethrin:    '퍼메트린은 강력한 고양이 신경독소입니다. 소량의 외용 노출도 경련과 사망을 유발합니다.',
    ibuprofen:     '이부프로펜은 고양이에게 매우 독성이 강하며 급성 신부전과 위장관 천공을 유발합니다.',
    naproxen:      '나프록센은 고양이에서 안전역이 매우 좁아 사용 금지입니다.',
    benzocaine:    '벤조카인은 고양이에서 메트헤모글로빈혈증을 유발하며 치명적일 수 있습니다.',
    'tea tree':    '티트리 오일(멜라루카)은 저용량 외용에서도 고양이에게 신경독성을 나타냅니다.',
    melaleuca:     '멜라루카(티트리) 오일은 고양이에게 신경독성이 있습니다.',
    xylitol:       '자일리톨은 심각한 저혈당증과 간부전을 유발합니다.',
    'onion':       '양파/마늘 화합물은 고양이에서 하인츠체 용혈성 빈혈을 유발합니다.',
    'garlic':      '마늘 화합물은 고양이에서 하인츠체 용혈성 빈혈을 유발합니다.',
  },
  dog: {
    xylitol:   '자일리톨은 개에서 심각한 저혈당증과 급성 간 괴사를 유발합니다.',
    grapes:    '포도/건포도는 알려지지 않은 기전으로 개에서 급성 신부전을 유발합니다.',
    raisins:   '건포도는 알려지지 않은 기전으로 개에서 급성 신부전을 유발합니다.',
    macadamia: '마카다미아 너트는 개에서 떨림과 고체온증을 유발합니다.',
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

// ── Route display labels (internal values stay English) ─────────
const ROUTE_DISPLAY_LABEL = {
  PO: '경구',
  IV: '정맥',
  IM: '근육',
  SC: '피하',
  Topical: '외용',
  Ophthalmic: '점안',
  Otic: '점이',
  Inhalation: '흡입',
};

function getRouteDisplayLabel(route) {
  return ROUTE_DISPLAY_LABEL[route] || route;
}

// ── Route-specific frequency options ────────────────────────────
const PARENTERAL_ROUTES = new Set(['IV', 'IM', 'SC']);
const SIMPLE_ROUTES = new Set(['Topical', 'Ophthalmic', 'Otic', 'Inhalation']);

const FREQ_BY_ROUTE = {
  PO:          ['SID', 'BID', 'TID', 'QID', 'PRN', 'Other'],
  IV:          ['CRI', 'q2h', 'q4h', 'q6h', 'q8h', 'q12h', 'PRN', 'Other'],
  IM:          ['SID', 'BID', 'q8h', 'q12h', 'PRN', 'Other'],
  SC:          ['SID', 'BID', 'q8h', 'q12h', 'PRN', 'Other'],
  Topical:     ['SID', 'BID', 'TID', 'QID', 'PRN', 'Other'],
  Ophthalmic:  ['SID', 'BID', 'TID', 'QID', 'q2h', 'q4h', 'PRN', 'Other'],
  Otic:        ['SID', 'BID', 'TID', 'PRN', 'Other'],
  Inhalation:  ['SID', 'BID', 'TID', 'QID', 'PRN', 'Other'],
  _default:    ['SID', 'BID', 'TID', 'QID', 'q8h', 'q12h', 'PRN', 'Other'],
};

// ── Frequency display labels ────────────────────────────────────
const FREQ_DISPLAY_LABEL = {
  SID: '1일 1회', BID: '1일 2회', TID: '1일 3회', QID: '1일 4회',
  CRI: '지속주입', PRN: '필요시', Other: '기타',
  q2h: '2시간마다', q4h: '4시간마다', q6h: '6시간마다',
  q8h: '8시간마다', q12h: '12시간마다',
};

function getFreqDisplayLabel(freq) {
  return FREQ_DISPLAY_LABEL[freq] || freq;
}

// ── Route-aware dose unit labels ────────────────────────────────
const ROUTE_UNIT_LABEL = {
  PO: '정',
  IV: 'mL',
  IM: 'mL',
  SC: 'mL',
  Topical: '도포',
  Ophthalmic: '방울',
  Otic: '방울',
  Inhalation: '회',
};

function getDoseUnitLabel(route) {
  return ROUTE_UNIT_LABEL[route] || '단위';
}

// ── Strength grouping by unit (4 groups) ────────────────────────
const UNIT_ORAL = new Set(['mg', 'g', 'mcg', 'µg']);
const UNIT_INJECTABLE = new Set(['mg/mL', 'mg/ml', 'IU/mL', 'iu/mL', 'mcg/mL', 'µg/mL', 'U/mL']);
const UNIT_PERCENT = new Set(['%']);

function classifyStrengthUnit(unit, strengthForm, drugDosageForms) {
  // If the strength has an explicit form tag from schema, use it
  if (strengthForm) {
    const f = strengthForm.toLowerCase();
    if (f === 'injectable') return 'injectable';
    if (f === 'topical') return 'topical';
    if (f === 'ophthalmic') return 'ophthalmic';
    if (f === 'otic') return 'otic';
    if (f === 'oral') return 'oral';
  }
  if (!unit) return 'oral';
  const u = unit.trim();
  if (UNIT_INJECTABLE.has(u) || u.toLowerCase().includes('/ml')) return 'injectable';
  if (UNIT_PERCENT.has(u)) {
    // Use drug's dosage_form to disambiguate % units
    const forms = (drugDosageForms || []).map(f => f.toLowerCase());
    if (forms.includes('ophthalmic') || forms.includes('drop')) return 'ophthalmic';
    return 'topical'; // default % to topical
  }
  if (UNIT_ORAL.has(u)) return 'oral';
  return 'oral';
}

function groupStrengthsByForm(strengths, drugDosageForms) {
  const oral = [];
  const injectable = [];
  const topical = [];
  const ophthalmic = [];
  (strengths || []).forEach((s, idx) => {
    const group = classifyStrengthUnit(s.unit, s.form, drugDosageForms);
    const entry = { ...s, _idx: idx };
    if (group === 'injectable') injectable.push(entry);
    else if (group === 'topical') topical.push(entry);
    else if (group === 'ophthalmic' || group === 'otic') ophthalmic.push(entry);
    else oral.push(entry);
  });
  return { oral, injectable, topical, ophthalmic };
}

// ── BSA calculation (Meeh's formula) ────────────────────────────
function calculateBSA(weightKg, species) {
  if (!weightKg || weightKg <= 0) return null;
  const k = species === 'cat' ? 0.100 : 0.101;
  return k * Math.pow(weightKg, 2 / 3);
}

// ── Tablet rounding helpers ─────────────────────────────────────
function roundToQuarter(val) {
  return Math.round(val * 4) / 4;
}

function fractionLabel(val) {
  if (val <= 0) return '0';
  const whole = Math.floor(val);
  const frac = val - whole;
  const fracMap = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' };
  const fracStr = fracMap[Math.round(frac * 4) / 4] ?? '';
  if (whole === 0) return fracStr || '0';
  return fracStr ? `${whole}${fracStr}` : `${whole}`;
}

/** Score a strength by how clean the tablet fraction is for a given total dose. */
function scoreStrength(totalDoseMg, strengthValue) {
  if (!strengthValue || strengthValue <= 0) return { exact: 0, rounded: 0, score: 0 };
  const exact = totalDoseMg / strengthValue;
  const rounded = roundToQuarter(exact);
  // Score: closeness to a clean fraction (whole > half > quarter)
  const diff = Math.abs(exact - rounded);
  const fracPart = rounded % 1;
  let cleanness = 1;
  if (fracPart === 0) cleanness = 1.0;
  else if (fracPart === 0.5) cleanness = 0.8;
  else cleanness = 0.6; // quarter
  const accuracy = 1 - Math.min(diff / exact, 1);
  return { exact, rounded, score: accuracy * cleanness };
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

/** Check if a route is a "simple" route that doesn't need dose/kg calculation */
function isSimpleRoute(route) {
  return SIMPLE_ROUTES.has(route);
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

// ── Drug Info Popover ────────────────────────────────────────────
function DrugInfoPopover({ drug, onClose }) {
  const desc = drug.briefDescription || drug.commonMechanism || null;
  const indications = drug.primaryIndications?.length ? drug.primaryIndications : null;
  const mechanism = drug.mechanismShort || drug.commonMechanism || null;
  const adverse = drug.commonAdverseEffects?.length ? drug.commonAdverseEffects : null;

  if (!desc && !indications && !mechanism && !adverse) {
    return (
      <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-72">
        <p className="text-[11px] text-slate-400">약물 정보가 아직 등록되지 않았습니다.</p>
        <button onClick={onClose} className="absolute top-1.5 right-1.5 p-0.5 text-slate-400 hover:text-slate-600"><X size={12} /></button>
      </div>
    );
  }

  return (
    <div className="absolute z-30 top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-80 space-y-2">
      <button onClick={onClose} className="absolute top-1.5 right-1.5 p-0.5 text-slate-400 hover:text-slate-600"><X size={12} /></button>
      {desc && (
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">약물 설명</p>
          <p className="text-[11px] text-slate-700 leading-relaxed">{desc}</p>
        </div>
      )}
      {indications && (
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">주요 적응증</p>
          <div className="flex flex-wrap gap-1">
            {indications.map((ind, i) => (
              <span key={i} className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded border border-blue-100">{ind}</span>
            ))}
          </div>
        </div>
      )}
      {mechanism && (
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">작용 기전</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">{mechanism}</p>
        </div>
      )}
      {adverse && (
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">주요 부작용</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">{adverse.join(', ')}</p>
        </div>
      )}
    </div>
  );
}

// ── Drug Card ───────────────────────────────────────────────────
function DrugCard({ drug, species, weight, onRemove, onUpdateDrug, collapseSignal }) {
  const hardstop = checkHardstop(drug, species);
  const hasSeenCollapseSignalRef = useRef(false);
  const [showInfo, setShowInfo] = useState(false);

  // Formulation state
  const strengths = drug.availableStrengths || [];
  const [selectedStrengthIdx, setSelectedStrengthIdx] = useState(
    drug._selectedStrengthIdx ?? 0
  );
  const selectedStrength = strengths[selectedStrengthIdx] || null;

  // ── Clinical context (dosage_list entries) ────────────────
  const dosageEntries = drug.dosageList?.[species] || [];
  const hasMultipleContexts = dosageEntries.length > 1;
  const [selectedContextIdx, setSelectedContextIdx] = useState(0);

  // ── Formulation → Route → Freq/Dose cascade ──────────────
  const validRoutes = getValidRoutes(drug, species);
  const [route, setRoute] = useState(() => {
    if (drug.route && validRoutes.includes(drug.route)) return drug.route;
    return validRoutes[0] || 'PO';
  });
  const [isOffLabel, setIsOffLabel] = useState(false);

  // Dosage entry for the currently-selected route
  const activeDosage = findDosageForRoute(drug, species, route);

  // Route options = data-backed + "기타 (허가 외)"
  const routeOptions = [...validRoutes, 'Other (off-label)'];

  // Frequency options depend on route
  const freqOptions = FREQ_BY_ROUTE[route] || FREQ_BY_ROUTE._default;
  const [freq, setFreq] = useState(() => {
    const initial = activeDosage?.frequency || drug.freq || 'SID';
    return freqOptions.includes(initial) ? initial : freqOptions[0];
  });

  // Route mode
  const isParenteral = PARENTERAL_ROUTES.has(route);
  const isSimple = isSimpleRoute(route);
  const isIV = route === 'IV';
  const [adminMode, setAdminMode] = useState('bolus'); // 'bolus' | 'cri'
  const [infusionRate, setInfusionRate] = useState('');
  const [infusionDuration, setInfusionDuration] = useState('');

  // Duration
  const [duration, setDuration] = useState(drug.prescriptionDays || 7);
  const [durationInput, setDurationInput] = useState(String(drug.prescriptionDays || 7));
  const [memo, setMemo] = useState(drug.memo || '');

  // Simple route fields (topical, ophthalmic, otic, inhalation)
  const [applicationInstructions, setApplicationInstructions] = useState('');
  const [dropsCount, setDropsCount] = useState('');
  const [puffsCount, setPuffsCount] = useState('');

  // Dose state — pre-fill with species default
  const defaultDose = drug.defaultDose?.[species] || '';
  const [dosePerKg, setDosePerKg] = useState(
    drug.dosePerKg !== undefined && drug.dosePerKg !== '' ? drug.dosePerKg : defaultDose
  );

  // Dose unit — auto from dosageList, manually overridable
  const [doseUnit, setDoseUnit] = useState(() => {
    return activeDosage?.unit || drug.unit || 'mg/kg';
  });

  // Grouped strengths for form-based display (4 groups)
  const strengthGroups = groupStrengthsByForm(strengths, drug.dosageForms);

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
    const group = classifyStrengthUnit(s.unit, s.form, drug.dosageForms);
    if (group === 'injectable') {
      const parenteralRoute = validRoutes.find(r => PARENTERAL_ROUTES.has(r));
      if (parenteralRoute && route !== parenteralRoute) handleRouteChange(parenteralRoute);
    } else if (group === 'topical') {
      if (validRoutes.includes('Topical') && route !== 'Topical') handleRouteChange('Topical');
    } else if (group === 'ophthalmic' || group === 'otic') {
      const ophRoute = validRoutes.find(r => r === 'Ophthalmic' || r === 'Otic');
      if (ophRoute && route !== ophRoute) handleRouteChange(ophRoute);
    } else {
      if (validRoutes.includes('PO') && route !== 'PO') handleRouteChange('PO');
    }
  };

  // ── Clinical context change ──
  const handleContextChange = (idx) => {
    setSelectedContextIdx(idx);
    const entry = dosageEntries[idx];
    if (!entry) return;
    if (entry.route && validRoutes.includes(entry.route)) handleRouteChange(entry.route);
    if (entry.value != null) {
      const parts = String(entry.value).split(/\s*[-–]\s*/);
      if (parts.length === 2) {
        const avg = (parseFloat(parts[0]) + parseFloat(parts[1])) / 2;
        setDosePerKg(isNaN(avg) ? '' : avg);
      } else {
        const v = parseFloat(entry.value);
        setDosePerKg(isNaN(v) ? '' : v);
      }
    }
    if (entry.unit) setDoseUnit(entry.unit);
    if (entry.frequency) {
      const newFreqOptions = FREQ_BY_ROUTE[entry.route || route] || FREQ_BY_ROUTE._default;
      setFreq(newFreqOptions.includes(entry.frequency) ? entry.frequency : newFreqOptions[0]);
    }
    if (entry.durationNote) {
      const m = entry.durationNote.match(/(\d+)/);
      if (m) { setDuration(parseInt(m[1], 10)); setDurationInput(m[1]); }
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
  const isBSA = doseUnit === 'mg/m²';
  const bsa = isBSA ? calculateBSA(weightNum, species) : null;
  const totalDoseMg = (() => {
    if (doseNum <= 0 || weightNum <= 0) return null;
    if (isBSA && bsa) return +(doseNum * bsa);
    if (doseUnit === 'mg' || doseUnit === 'mL') return +doseNum; // absolute dose
    return +(doseNum * weightNum); // per-kg
  })();
  const range = drug.doseRange?.[species];
  const doseStatus = (!isSimple && doseNum > 0) ? getDoseStatus(doseNum, range) : null;

  // Tablets / volume needed + smart rounding
  const exactUnits = totalDoseMg && selectedStrength?.value
    ? totalDoseMg / selectedStrength.value
    : null;
  const isInjectableRoute = PARENTERAL_ROUTES.has(route);
  const roundedTablets = exactUnits != null && !isInjectableRoute ? roundToQuarter(exactUnits) : null;
  const tabletsNeeded = isInjectableRoute ? exactUnits : roundedTablets;
  const totalDoseDisplay = totalDoseMg != null
    ? `${totalDoseMg.toFixed(totalDoseMg < 1 ? 3 : totalDoseMg < 10 ? 2 : 1)} mg`
    : null;

  // Best strength suggestion for oral routes
  const bestStrengthIdx = (() => {
    if (!totalDoseMg || isInjectableRoute || isSimple) return null;
    const oralStrengths = strengthGroups.oral;
    if (oralStrengths.length <= 1) return null;
    let bestIdx = null;
    let bestScore = -1;
    oralStrengths.forEach((s) => {
      const { score } = scoreStrength(totalDoseMg, s.value);
      if (score > bestScore) { bestScore = score; bestIdx = s._idx; }
    });
    return bestIdx;
  })();

  // Push updates to parent whenever key state changes
  useEffect(() => {
    onUpdateDrug(drug.id, {
      dosePerKg: isSimple ? undefined : dosePerKg,
      doseUnit: isSimple ? undefined : doseUnit,
      route: isOffLabel ? 'Other' : route,
      freq,
      prescriptionDays: duration || '',
      memo,
      doseStatus,
      _selectedStrengthIdx: selectedStrengthIdx,
      // Simple route fields
      ...(route === 'Topical' ? { applicationInstructions } : {}),
      ...(route === 'Ophthalmic' || route === 'Otic' ? { dropsCount } : {}),
      ...(route === 'Inhalation' ? { puffsCount } : {}),
      ...(isIV && adminMode === 'cri' ? {
        adminMode: 'cri',
        infusionRate,
        infusionDuration,
      } : { adminMode: 'bolus' }),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dosePerKg, doseUnit, route, freq, duration, memo, selectedStrengthIdx, adminMode, infusionRate, infusionDuration, applicationInstructions, dropsCount, puffsCount]);

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
        <div className="flex-1 min-w-0 relative">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-slate-900 leading-tight">{drug.name}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowInfo(v => !v); }}
              className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
              title="약물 정보"
            >
              <Info size={12} />
            </button>
          </div>
          {showInfo && <DrugInfoPopover drug={drug} onClose={() => setShowInfo(false)} />}
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
        </div>
        {!expanded && (
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2 pt-1">
            <p className="text-[12px] font-medium text-slate-600 whitespace-nowrap">
              {drug.nameKr || drug.name} · {getRouteDisplayLabel(route)} · {selectedStrength ? `${selectedStrength.value}${selectedStrength.unit}` : ''} · {getFreqDisplayLabel(freq)}{duration ? ` · ${duration}일` : ''}
            </p>
            {memo && <p className="text-[11px] text-slate-400 italic leading-snug mt-0.5 text-center">{memo}</p>}
          </div>
        )}
        {!expanded && !isSimple && (
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
              {tabletsNeeded != null && selectedStrength && (
                <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                  {isInjectableRoute
                    ? `${tabletsNeeded.toFixed(2)} mL (${selectedStrength.value}${selectedStrength.unit})`
                    : `${fractionLabel(roundedTablets)} ${getDoseUnitLabel(route)} × ${selectedStrength.value}${selectedStrength.unit}`
                  }
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
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">제형</label>
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
                            } ${bestStrengthIdx === s._idx ? 'ring-1 ring-emerald-400' : ''}`}>
                            {s.value}{s.unit}
                            {bestStrengthIdx === s._idx && <span className="ml-1 text-[8px] text-emerald-500">추천</span>}
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
                    {strengthGroups.topical.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] font-semibold text-amber-500 w-8 shrink-0">외용</span>
                        {strengthGroups.topical.map((s) => (
                          <button key={s._idx} onClick={() => handleFormulationChange(s._idx)}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-all ${
                              selectedStrengthIdx === s._idx
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white text-amber-600 border-amber-200 hover:border-amber-300'
                            }`}>
                            {s.value}{s.unit}
                          </button>
                        ))}
                      </div>
                    )}
                    {strengthGroups.ophthalmic.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] font-semibold text-teal-500 w-8 shrink-0">안과</span>
                        {strengthGroups.ophthalmic.map((s) => (
                          <button key={s._idx} onClick={() => handleFormulationChange(s._idx)}
                            className={`px-2 py-0.5 text-[11px] font-medium rounded-md border transition-all ${
                              selectedStrengthIdx === s._idx
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-white text-teal-600 border-teal-200 hover:border-teal-300'
                            }`}>
                            {s.value}{s.unit}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical context dropdown */}
              {hasMultipleContexts && (
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">적응증 선택</label>
                  <select
                    value={selectedContextIdx}
                    onChange={e => handleContextChange(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700"
                  >
                    {dosageEntries.map((entry, i) => (
                      <option key={i} value={i}>{entry.context || `프로토콜 ${i + 1}`}</option>
                    ))}
                  </select>
                  {dosageEntries[selectedContextIdx]?.evidence && (
                    <p className="text-[9px] text-blue-500 mt-0.5 leading-tight">{dosageEntries[selectedContextIdx].evidence}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">투여경로</label>
                  <select value={isOffLabel ? 'Other (off-label)' : route} onChange={e => handleRouteChange(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-[12px] border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700 ${
                      isOffLabel ? 'border-amber-300' : 'border-slate-200'
                    }`}>
                    {routeOptions.map(r => (
                      <option key={r} value={r}>{r === 'Other (off-label)' ? '기타 (허가 외)' : getRouteDisplayLabel(r)}</option>
                    ))}
                  </select>
                  {activeDosage?.context && !hasMultipleContexts && (
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{activeDosage.context}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">투여빈도</label>
                  <select value={freq} onChange={e => setFreq(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700">
                    {freqOptions.map(f => <option key={f} value={f}>{getFreqDisplayLabel(f)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {isIV && adminMode === 'cri' ? '주입시간 (시간)' : '투여기간 (일)'}
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

            {/* Right: dose-related info — route-specific modes */}
            {isSimple ? (
              /* ── Simple route mode (외용/점안/점이/흡입) ── */
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {route === 'Topical' && '외용 투여'}
                  {route === 'Ophthalmic' && '점안 투여'}
                  {route === 'Otic' && '점이 투여'}
                  {route === 'Inhalation' && '흡입 투여'}
                </label>
                {selectedStrength && (
                  <div className="text-[12px] font-medium text-slate-700 bg-slate-50 rounded-md px-2.5 py-1.5 border border-slate-100">
                    선택 농도: {selectedStrength.value}{selectedStrength.unit}
                  </div>
                )}
                {route === 'Topical' && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">도포 지시사항</label>
                    <textarea
                      value={applicationInstructions}
                      onChange={(e) => setApplicationInstructions(e.target.value)}
                      placeholder="예: 환부에 얇게 도포, 병변 부위에 1일 2회 도포..."
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700 placeholder:text-slate-300 resize-y min-h-[54px]"
                    />
                  </div>
                )}
                {(route === 'Ophthalmic' || route === 'Otic') && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      {route === 'Ophthalmic' ? '점안 횟수 (방울/회)' : '점이 횟수 (방울/회)'}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={dropsCount}
                      onChange={(e) => { if (/^\d*$/.test(e.target.value)) setDropsCount(e.target.value); }}
                      placeholder="예: 1"
                      className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                )}
                {route === 'Inhalation' && (
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">흡입 횟수 (회/투여)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={puffsCount}
                      onChange={(e) => { if (/^\d*$/.test(e.target.value)) setPuffsCount(e.target.value); }}
                      placeholder="예: 2"
                      className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* ── Standard / Injectable dose mode ── */
              <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {isInjectableRoute ? '용량 / 투여량' : '용량'}
                </label>
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

                {/* BSA info for mg/m² */}
                {isBSA && bsa && (
                  <div className="text-[10px] text-blue-600 bg-blue-50 rounded-md px-2 py-1 border border-blue-100">
                    BSA: {bsa.toFixed(3)} m² ({species === 'cat' ? '고양이' : '개'} {weightNum}kg)
                  </div>
                )}

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
                        {tabletsNeeded != null && selectedStrength && (
                          <div className="text-[11px] font-semibold text-slate-600 mt-1">
                            {isInjectableRoute ? (
                              /* Injectable: show volume (mL) */
                              <span>{tabletsNeeded.toFixed(2)} mL ({selectedStrength.value}{selectedStrength.unit} 바이알)</span>
                            ) : (
                              /* Oral: show rounded tablets with fraction */
                              <span>
                                {fractionLabel(roundedTablets)} {getDoseUnitLabel(route)} × {selectedStrength.value}{selectedStrength.unit}
                                {exactUnits && Math.abs(exactUnits - roundedTablets) > 0.01 && (
                                  <span className="text-[9px] text-slate-400 ml-1">(정확: {exactUnits.toFixed(2)})</span>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Splittable warning */}
                        {!isInjectableRoute && selectedStrength?.isSplittable === false && roundedTablets && roundedTablets % 1 !== 0 && (
                          <div className="mt-1 text-[9px] text-amber-600 flex items-center justify-center gap-1">
                            <AlertTriangle size={9} /> 이 제형은 분할할 수 없습니다
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-[10px] text-slate-400">체중을 입력하세요</div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
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
