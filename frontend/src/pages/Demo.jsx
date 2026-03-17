import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, Search, X, Lock, ChevronDown, ChevronUp,
  Check, AlertCircle
} from 'lucide-react';
import { NuvovetWordmark } from '../components/NuvovetLogo';
import { AnalysisScreen } from '../components/AnalysisScreen';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { runFullDURAnalysis } from '../utils/durEngine';
import { useI18n, LangToggle } from '../i18n';
import { DRUG_DATABASE } from '../data/drugDatabase';

// ── Demo Patients ───────────────────────────────────────────────
// Border Collie and Shih Tzu image assignments are intentionally swapped
// per demo request.
const DEMO_PATIENTS = [
  {
    id: 'border-collie-demo',
    name: 'Max',
    species: 'dog',
    breed: 'Border Collie',
    weight: 12,
    age: '4 years',
    sex: 'Neutered Male',
    conditions: ['MDR1 Deficient'],
    flaggedLabs: [{ key: 'creatinine', value: '1.9', unit: 'mg/dL', status: 'high' }],
    defaultDrugIds: ['meloxicam', 'prednisolone', 'furosemide'],
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&crop=faces&w=720&h=980&q=80',
    imagePosition: '50% 28%',
  },
  {
    id: 'shih-tzu-demo',
    name: 'Milo',
    species: 'dog',
    breed: 'Shih Tzu',
    weight: 6.4,
    age: '6 years',
    sex: 'Spayed Female',
    conditions: ['Early Stage Renal Failure'],
    flaggedLabs: [{ key: 'creatinine', value: '1.7', unit: 'mg/dL', status: 'high' }],
    defaultDrugIds: ['amoxicillin', 'enalapril', 'furosemide'],
    imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&crop=faces&w=720&h=980&q=80',
    imagePosition: '50% 32%',
  },
  {
    id: 'persian-cat-demo',
    name: 'Luna',
    species: 'cat',
    breed: 'Persian',
    weight: 4.1,
    age: '7 years',
    sex: 'Spayed Female',
    conditions: ['Hyperthyroidism', 'Early CKD (IRIS Stage 2)'],
    flaggedLabs: [
      { key: 'creatinine', value: '2.0', unit: 'mg/dL', status: 'high' },
      { key: 'bun', value: '36', unit: 'mg/dL', status: 'high' },
    ],
    defaultDrugIds: ['methimazole', 'amlodipine', 'maropitant'],
    imageUrl: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&crop=faces&w=720&h=980&q=80',
    imagePosition: '50% 38%',
  },
];

const DEMO_DRUG_IDS = [
  'meloxicam',
  'prednisolone',
  'furosemide',
  'amoxicillin',
  'enalapril',
  'methimazole',
  'amlodipine',
  'maropitant',
  'gabapentin',
  'omeprazole',
];

const DEMO_DRUGS_CATALOGUE = DRUG_DATABASE.filter((drug) => DEMO_DRUG_IDS.includes(drug.id));

function buildDemoDrugForPatient(drug, species) {
  return {
    ...drug,
    dosePerKg: drug.defaultDose?.[species] ?? '',
    freq: drug.freq || 'SID',
    selectedStrengthIdx: 0,
  };
}

// ── Demo Drug Card (simplified, with guided animation support) ──
function DemoDrugCard({ drug, species, weight, onRemove, onUpdate, guideStrength }) {
  const [selectedStrengthIdx, setSelectedStrengthIdx] = useState(0);
  const [dosePerKg, setDosePerKg] = useState(drug.dosePerKg ?? drug.defaultDose?.[species] ?? '');
  const [freq, setFreq] = useState(drug.freq || 'SID');
  const strengths = drug.availableStrengths || [];

  useEffect(() => {
    setDosePerKg(drug.dosePerKg ?? drug.defaultDose?.[species] ?? '');
    setFreq(drug.freq || 'SID');
    setSelectedStrengthIdx(drug.selectedStrengthIdx || 0);
  }, [drug.dosePerKg, drug.defaultDose, drug.freq, drug.selectedStrengthIdx, species]);

  useEffect(() => {
    onUpdate?.(drug.id, {
      dosePerKg: parseFloat(dosePerKg) || '',
      freq,
      selectedStrengthIdx,
    });
  }, [dosePerKg, freq, selectedStrengthIdx, drug.id, onUpdate]);

  const doseNum = parseFloat(dosePerKg) || 0;
  const totalDoseMg = doseNum > 0 && weight > 0 ? +(doseNum * weight) : null;
  const selectedStrength = strengths[selectedStrengthIdx] || null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
        <div>
          <p className="text-[13px] font-semibold text-slate-900">{drug.name}</p>
          <p className="text-[11px] text-slate-400">{drug.activeSubstance} · {drug.class}</p>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      <div className="px-3.5 py-3 space-y-3">
        {/* Strength selector */}
        {strengths.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Size / Formulation
            </p>
            <div className="flex flex-wrap gap-1.5">
              {strengths.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedStrengthIdx(i)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all duration-150 ${
                    guideStrength ? 'animate-demo-guide-pulse' : ''
                  } ${
                    selectedStrengthIdx === i
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dose + freq */}
        <div className="flex gap-3">
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Dose (mg/kg)</p>
            <input
              type="number"
              value={dosePerKg}
              onChange={(e) => setDosePerKg(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Freq</p>
            <select
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
              className="px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white"
            >
              {['SID', 'BID', 'TID', 'q8h', 'PRN'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Total dose display */}
        {totalDoseMg !== null && (
          <p className="text-[11px] text-slate-500">
            Total: <span className="font-semibold text-slate-800">{totalDoseMg.toFixed(2)} mg</span>
            {selectedStrength
              ? ` ≈ ${(totalDoseMg / selectedStrength.value).toFixed(2)} × ${selectedStrength.label}`
              : ''}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Demo Drug Search (no API) ────────────────────────────────────
function DemoDrugSearch({ addedDrugIds, onAdd, guideStep, catalogue }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const { lang } = useI18n();

  const handleQuery = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (q.trim().length >= 1) {
      const filtered = catalogue.filter(d =>
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        d.nameKr?.includes(q) ||
        d.activeSubstance.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleAdd = (drug) => {
    if (addedDrugIds.has(drug.id)) return;
    onAdd({ ...drug });
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleQuery}
          onFocus={() => query && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder={lang === 'ko' ? '약물 검색 (예: Meloxicam)...' : 'Search drugs (e.g. Meloxicam)...'}
          className={`w-full pl-9 pr-4 py-3 text-[13px] bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all ${
            guideStep === 'search' ? 'animate-demo-guide-pulse' : ''
          }`}
        />
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {results.map((drug, i) => (
            <button
              key={drug.id}
              onMouseDown={() => handleAdd(drug)}
              disabled={addedDrugIds.has(drug.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors disabled:opacity-40 ${
                guideStep === 'result' ? 'animate-demo-bounce-in' : ''
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div>
                <p className="text-[13px] font-semibold text-slate-900">{drug.name}</p>
                <p className="text-[11px] text-slate-400">{drug.nameKr} · {drug.class}</p>
              </div>
              {addedDrugIds.has(drug.id)
                ? <Check size={14} className="text-emerald-500 shrink-0" />
                : <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">+ ADD</span>
              }
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.trim() && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3">
          <p className="text-[12px] text-slate-500">
            {lang === 'ko' ? '데모에 포함된 약물만 검색됩니다.' : 'Only demo drugs are searchable.'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {(lang === 'ko' ? '예시: ' : 'Try: ') + catalogue.slice(0, 6).map((d) => d.name).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

function DemoPatientSelector({ patients, selectedPatientId, onSelect }) {
  const { lang } = useI18n();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <p className="typo-section-header mb-3">
        {lang === 'ko' ? '데모 환자 선택' : 'Select Demo Patient'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {patients.map((patient) => {
          const selected = patient.id === selectedPatientId;
          return (
            <button
              key={patient.id}
              onClick={() => onSelect(patient.id)}
              className={`text-left rounded-xl border overflow-hidden transition-all ${
                selected
                  ? 'border-slate-900 shadow-md ring-2 ring-slate-200'
                  : 'border-slate-200 hover:border-slate-400 hover:shadow-sm'
              }`}
            >
              <div className="h-44 bg-slate-100">
                <img
                  src={patient.imageUrl}
                  alt={`${patient.breed} demo patient`}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: patient.imagePosition || '50% 35%' }}
                  loading="lazy"
                />
              </div>
              <div className="px-3 py-2.5 bg-white">
                <p className="text-[13px] font-semibold text-slate-900 truncate">{patient.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{patient.breed}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {patient.species === 'dog' ? 'Canine' : 'Feline'} · {patient.weight} kg
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Locked Patient Card ─────────────────────────────────────────
function LockedPatientCard({ patient }) {
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-16 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
            <img
              src={patient.imageUrl}
              alt={`${patient.breed} patient`}
              className="w-full h-full object-cover"
              style={{ objectPosition: patient.imagePosition || '50% 35%' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-bold text-slate-900">{patient.name}</p>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                <Lock size={8} />
                {lang === 'ko' ? '데모 환자 / Demo Patient' : 'Demo Patient'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{patient.breed} · {patient.species === 'dog' ? 'Canine' : 'Feline'} · {patient.sex}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="px-4 py-3 grid grid-cols-4 gap-3">
        {[
          { label: lang === 'ko' ? '나이' : 'Age', value: patient.age },
          { label: lang === 'ko' ? '체중' : 'Weight', value: `${patient.weight} kg` },
          { label: lang === 'ko' ? '품종' : 'Breed', value: patient.breed },
          { label: lang === 'ko' ? '성별' : 'Sex', value: patient.sex },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="typo-label uppercase">{label}</p>
            <p className="text-[13px] font-semibold text-slate-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="px-4 pb-3 animate-fade-in">
          <p className="typo-label mb-1.5">{lang === 'ko' ? '기저 질환' : 'Conditions'}</p>
          {patient.conditions?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {patient.conditions.map((condition) => (
                <span key={condition} className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                  {condition}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-slate-400 italic">
              {lang === 'ko' ? '없음 (데모 시 선택 가능)' : 'None pre-filled - select during demo'}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Lock size={10} />
            {lang === 'ko' ? '환자 정보 수정 불가 (데모 모드)' : 'Patient details locked in demo mode'}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Demo Page ──────────────────────────────────────────────
export default function Demo() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [step, setStep] = useState('prescription'); // 'prescription' | 'analyzing' | 'results'
  const [selectedPatientId, setSelectedPatientId] = useState(DEMO_PATIENTS[0].id);
  const [drugs, setDrugs] = useState([]);
  const [results, setResults] = useState(null);
  const selectedPatient = DEMO_PATIENTS.find((patient) => patient.id === selectedPatientId) || DEMO_PATIENTS[0];

  useEffect(() => {
    const seededDrugs = (selectedPatient.defaultDrugIds || [])
      .map((drugId) => DEMO_DRUGS_CATALOGUE.find((drug) => drug.id === drugId))
      .filter(Boolean)
      .map((drug) => buildDemoDrugForPatient(drug, selectedPatient.species));
    setDrugs(seededDrugs);
  }, [selectedPatientId, selectedPatient.defaultDrugIds, selectedPatient.species]);

  // ── Guided animation step ──────────────────────────────────────
  // 'search' → user should search; 'result' → results shown; 'strength' → pick size; 'run' → run DUR
  const [guideStep, setGuideStep] = useState('search');

  // Track drug state for guide transitions
  useEffect(() => {
    if (drugs.length === 0) {
      setGuideStep('search');
    } else {
      // After adding a drug, guide to strength selection
      // After strength is implicitly selected (it defaults to 0), guide to Run DUR
      setGuideStep('run');
    }
  }, [drugs.length]);

  // When search results appear we'll set guideStep to 'result' in the search handler
  const handleSearchFocus = () => {
    if (drugs.length === 0) setGuideStep('search');
  };

  const handleSearchInput = () => {
    if (drugs.length === 0) setGuideStep('result');
  };

  const handleAddDrug = (drug) => {
    setDrugs(prev => [...prev, buildDemoDrugForPatient(drug, selectedPatient.species)]);
    setGuideStep('strength');
    // After brief delay, move to 'run' (assume strength defaults to first option)
    setTimeout(() => setGuideStep('run'), 2500);
  };

  const handleUpdateDrug = useCallback((drugId, patch) => {
    setDrugs((prev) => prev.map((drug) => (drug.id === drugId ? { ...drug, ...patch } : drug)));
  }, []);

  const handleRemoveDrug = (drugId) => {
    setDrugs(prev => prev.filter(d => d.id !== drugId));
  };

  const handleRunAnalysis = () => {
    if (drugs.length < 1) return;
    setGuideStep('done');
    setStep('analyzing');
  };

  const handleAnalysisComplete = useCallback(() => {
    const analysisResults = runFullDURAnalysis(drugs, selectedPatient.species, selectedPatient.weight);
    setResults(analysisResults);
    setStep('results');
  }, [drugs, selectedPatient.species, selectedPatient.weight]);

  const handleNewAnalysis = () => {
    setStep('prescription');
    setDrugs([]);
    setResults(null);
    setGuideStep('search');
  };

  const addedDrugIds = new Set(drugs.map(d => d.id));

  const patientInfo = {
    name: selectedPatient.name,
    species: selectedPatient.species,
    breed: selectedPatient.breed,
    weight: selectedPatient.weight,
    conditions: selectedPatient.conditions,
    flaggedLabs: selectedPatient.flaggedLabs,
    imageUrl: selectedPatient.imageUrl,
    imagePosition: selectedPatient.imagePosition,
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col relative">
      {/* Dot grid background */}
      <div className="fixed inset-0 bg-dot-grid pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.07),0_3px_10px_rgba(15,23,42,0.04)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[62px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => step === 'results' ? setStep('prescription') : navigate('/')}
              className="p-2 -ml-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <NuvovetWordmark />
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <span className="typo-label px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full">
              {t.demoLabel}
            </span>
          </div>
        </div>
      </header>

      {/* ── Prescription step ── */}
      {step === 'prescription' && (
        <div className="flex-1 flex flex-col px-4 sm:px-6 py-6 animate-slide-in">
          <div className="max-w-lg mx-auto w-full space-y-5">

            {/* Title */}
            <div>
              <p className="typo-section-header mb-1.5">
                {lang === 'ko' ? '데모 처방 / DEMO PRESCRIPTION' : 'DEMO PRESCRIPTION'}
              </p>
              <h1 className="typo-page-title mb-1">
                {lang === 'ko' ? '처방 DUR 검사' : 'Prescription DUR Check'}
              </h1>
              <p className="typo-body">
                {lang === 'ko'
                  ? '아래의 약물을 검색하고 추가한 뒤 DUR 검사를 실행하세요.'
                  : 'Search and add drugs below, then run the DUR scan.'}
              </p>
            </div>

            {/* Locked patient */}
            <DemoPatientSelector
              patients={DEMO_PATIENTS}
              selectedPatientId={selectedPatientId}
              onSelect={setSelectedPatientId}
            />

            {/* Locked patient */}
            <LockedPatientCard patient={selectedPatient} />

            {/* Drug search section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="typo-section-header">
                  {lang === 'ko' ? `약물 목록 (${drugs.length})` : `DRUGS (${drugs.length})`}
                </p>
                {guideStep === 'search' && (
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                    {lang === 'ko' ? '↓ 검색하세요' : '↓ Start searching'}
                  </span>
                )}
              </div>

              {/* Demo drug hint */}
              <div className="flex flex-wrap gap-1.5">
                {DEMO_DRUGS_CATALOGUE.map(d => (
                  <span
                    key={d.id}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      addedDrugIds.has(d.id)
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    {addedDrugIds.has(d.id) ? '✓ ' : ''}{d.name}
                  </span>
                ))}
              </div>

              {/* Drug search input */}
              <div
                onClick={handleSearchFocus}
                onChange={handleSearchInput}
              >
                <DemoDrugSearch
                  addedDrugIds={addedDrugIds}
                  onAdd={handleAddDrug}
                  guideStep={guideStep}
                  catalogue={DEMO_DRUGS_CATALOGUE}
                />
              </div>

              {/* Added drug cards */}
              {drugs.length > 0 && (
                <div className="space-y-3 mt-2">
                  {drugs.map(drug => (
                    <DemoDrugCard
                      key={drug.id}
                      drug={drug}
                      species={selectedPatient.species}
                      weight={selectedPatient.weight}
                      onRemove={() => handleRemoveDrug(drug.id)}
                      onUpdate={handleUpdateDrug}
                      guideStrength={guideStep === 'strength'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Run DUR button */}
            <button
              onClick={handleRunAnalysis}
              disabled={drugs.length === 0}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm ${
                guideStep === 'run' ? 'animate-demo-guide-pulse' : ''
              }`}
            >
              <Zap size={15} />
              {lang === 'ko' ? 'DUR 검사 실행 / Run DUR Scan' : 'Run DUR Scan'}
            </button>

            {drugs.length === 0 && (
              <p className="text-center text-[11px] text-slate-400">
                {lang === 'ko' ? '약물을 하나 이상 추가해 주세요.' : 'Add at least one drug to run the scan.'}
              </p>
            )}

          </div>
        </div>
      )}

      {/* ── Analyzing step ── */}
      {step === 'analyzing' && (
        <AnalysisScreen
          onComplete={handleAnalysisComplete}
          drugCount={drugs.length}
          species={selectedPatient.species}
        />
      )}

      {/* ── Results step ── */}
      {step === 'results' && (
        <main className="flex-1 pb-8">
          <ResultsDisplay
            results={results}
            onBack={() => setStep('prescription')}
            onNewAnalysis={handleNewAnalysis}
            patientInfo={patientInfo}
            drugs={drugs}
            species={selectedPatient.species}
            demoMode
          />
        </main>
      )}
    </div>
  );
}
