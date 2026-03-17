import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Zap, Search, X, Lock, ChevronDown, ChevronUp,
  Check, ArrowRight
} from 'lucide-react';
import { NuvovetWordmark } from '../components/NuvovetLogo';
import { AnalysisScreen } from '../components/AnalysisScreen';
import { ResultsDisplay } from '../components/ResultsDisplay';
import AnatomyDiagram from '../components/charts/AnatomyDiagram';
import { aggregateOrganBurden } from '../components/charts/organBurdenAggregator';
import { runFullDURAnalysis } from '../utils/durEngine';
import { useI18n, LangToggle } from '../i18n';
import { DRUG_SOURCE } from '../data/drugDatabase';

// ── Demo Drug Catalogue ────────────────────────────────────────────
const DEMO_DRUGS_CATALOGUE = [
  {
    id: 'meloxicam',
    name: 'Meloxicam',
    nameKr: '멜록시캄',
    activeSubstance: 'Meloxicam',
    class: 'NSAID',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 0.1, cat: 0.05 },
    doseRange: { dog: [0.05, 0.2], cat: [0.025, 0.05] },
    unit: 'mg/kg',
    freq: 'SID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: ['CYP3A4'], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'moderate', hepatotoxic: 'low', qtProlongation: 'none', bleedingRisk: 'moderate', giUlcer: 'moderate' },
    renalElimination: 0.40,
    pk: { halfLife: 24, timeToPeak: 7.5, bioavailability: 0.93, proteinBinding: 0.97, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '1.5 mg/mL oral suspension', value: 1.5, unit: 'mg/mL', form: 'Susp' },
      { label: '5 mg tablet', value: 5, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'prednisolone',
    name: 'Prednisolone',
    nameKr: '프레드니솔론',
    activeSubstance: 'Prednisolone',
    class: 'Corticosteroid',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 0.5, cat: 1.0 },
    doseRange: { dog: [0.25, 2.0], cat: [0.5, 2.0] },
    unit: 'mg/kg',
    freq: 'SID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: ['CYP3A4'], inhibitor: [], inducer: ['CYP3A4'] },
    riskFlags: { nephrotoxic: 'low', hepatotoxic: 'moderate', qtProlongation: 'none', bleedingRisk: 'low', giUlcer: 'moderate' },
    renalElimination: 0.20,
    pk: { halfLife: 2.5, timeToPeak: 1.5, bioavailability: 0.95, proteinBinding: 0.70, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '5 mg tablet', value: 5, unit: 'mg', form: 'Tab' },
      { label: '20 mg tablet', value: 20, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'dexmedetomidine',
    name: 'Dexmedetomidine',
    nameKr: '덱스메데토미딘',
    activeSubstance: 'Dexmedetomidine',
    class: 'Sedative',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 10, cat: 40 },
    doseRange: { dog: [5, 20], cat: [20, 80] },
    unit: 'mcg/kg',
    freq: 'SID',
    route: 'IM',
    narrowTherapeuticIndex: true,
    cypProfile: { substrate: ['CYP2D6'], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'none', hepatotoxic: 'none', qtProlongation: 'low', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.10,
    pk: { halfLife: 0.75, timeToPeak: 0.25, bioavailability: 0.95, proteinBinding: 0.94, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '0.5 mg/mL injection', value: 0.5, unit: 'mg/mL', form: 'Inj' },
      { label: '1 mg/mL injection', value: 1, unit: 'mg/mL', form: 'Inj' },
    ],
  },
  {
    id: 'amoxicillin-clavulanate',
    name: 'Amoxicillin-Clavulanate',
    nameKr: '아목시실린-클라불란산',
    activeSubstance: 'Amoxicillin + Clavulanic Acid',
    class: 'Antibiotic',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 12.5, cat: 12.5 },
    doseRange: { dog: [10, 25], cat: [10, 25] },
    unit: 'mg/kg',
    freq: 'BID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: [], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'low', hepatotoxic: 'low', qtProlongation: 'none', bleedingRisk: 'none', giUlcer: 'low' },
    renalElimination: 0.75,
    pk: { halfLife: 1.5, timeToPeak: 1, bioavailability: 0.72, proteinBinding: 0.18, primaryElimination: 'renal' },
    availableStrengths: [
      { label: '62.5 mg tablet (50mg/12.5mg)', value: 62.5, unit: 'mg', form: 'Tab' },
      { label: '125 mg tablet (100mg/25mg)', value: 125, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'furosemide',
    name: 'Furosemide',
    nameKr: '푸로세미드',
    activeSubstance: 'Furosemide',
    class: 'Diuretic',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 2, cat: 1 },
    doseRange: { dog: [1, 4], cat: [0.5, 2] },
    unit: 'mg/kg',
    freq: 'BID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: [], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'moderate', hepatotoxic: 'none', qtProlongation: 'low', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.80,
    pk: { halfLife: 1.5, timeToPeak: 1, bioavailability: 0.77, proteinBinding: 0.91, primaryElimination: 'renal' },
    availableStrengths: [
      { label: '20 mg tablet', value: 20, unit: 'mg', form: 'Tab' },
      { label: '40 mg tablet', value: 40, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'ivermectin',
    name: 'Ivermectin',
    nameKr: '이버멕틴',
    activeSubstance: 'Ivermectin',
    class: 'Antiparasitic',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 6, cat: 24 },
    doseRange: { dog: [3, 12], cat: [12, 48] },
    unit: 'mcg/kg',
    freq: 'SID',
    route: 'PO',
    narrowTherapeuticIndex: true,
    mdr1Sensitive: true,
    cypProfile: { substrate: ['CYP3A4'], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'none', hepatotoxic: 'low', qtProlongation: 'none', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.10,
    pk: { halfLife: 24, timeToPeak: 4, bioavailability: 0.93, proteinBinding: 0.93, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '0.08% oral solution (0.8 mg/mL)', value: 0.8, unit: 'mg/mL', form: 'Soln' },
    ],
  },
  {
    id: 'ketoconazole',
    name: 'Ketoconazole',
    nameKr: '케토코나졸',
    activeSubstance: 'Ketoconazole',
    class: 'Antifungal',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 5, cat: 2.5 },
    doseRange: { dog: [2.5, 10], cat: [1, 5] },
    unit: 'mg/kg',
    freq: 'BID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: ['CYP3A4'], inhibitor: ['CYP3A4'], inducer: [] },
    riskFlags: { nephrotoxic: 'low', hepatotoxic: 'moderate', qtProlongation: 'none', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.15,
    pk: { halfLife: 8, timeToPeak: 2, bioavailability: 0.75, proteinBinding: 0.99, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '200 mg tablet', value: 200, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'enalapril',
    name: 'Enalapril',
    nameKr: '에날라프릴',
    activeSubstance: 'Enalapril Maleate',
    class: 'ACE Inhibitor',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 0.5, cat: 0.25 },
    doseRange: { dog: [0.25, 1.0], cat: [0.125, 0.5] },
    unit: 'mg/kg',
    freq: 'SID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: [], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'moderate', hepatotoxic: 'none', qtProlongation: 'none', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.90,
    pk: { halfLife: 11, timeToPeak: 4, bioavailability: 0.60, proteinBinding: 0.50, primaryElimination: 'renal' },
    availableStrengths: [
      { label: '2.5 mg tablet', value: 2.5, unit: 'mg', form: 'Tab' },
      { label: '5 mg tablet', value: 5, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'cyclosporine',
    name: 'Cyclosporine',
    nameKr: '사이클로스포린',
    activeSubstance: 'Cyclosporine',
    class: 'Immunosuppressant',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 5, cat: 5 },
    doseRange: { dog: [2.5, 10], cat: [2.5, 7.5] },
    unit: 'mg/kg',
    freq: 'SID',
    route: 'PO',
    narrowTherapeuticIndex: true,
    cypProfile: { substrate: ['CYP3A4'], inhibitor: ['CYP3A4'], inducer: [] },
    riskFlags: { nephrotoxic: 'moderate', hepatotoxic: 'moderate', qtProlongation: 'none', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.10,
    pk: { halfLife: 10, timeToPeak: 1.5, bioavailability: 0.34, proteinBinding: 0.98, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '10 mg/mL oral solution', value: 10, unit: 'mg/mL', form: 'Soln' },
      { label: '25 mg capsule', value: 25, unit: 'mg', form: 'Cap' },
      { label: '100 mg capsule', value: 100, unit: 'mg', form: 'Cap' },
    ],
  },
  {
    id: 'phenobarbital',
    name: 'Phenobarbital',
    nameKr: '페노바르비탈',
    activeSubstance: 'Phenobarbital',
    class: 'Anticonvulsant',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 2.5, cat: 1.5 },
    doseRange: { dog: [1.5, 5], cat: [0.5, 3] },
    unit: 'mg/kg',
    freq: 'BID',
    route: 'PO',
    narrowTherapeuticIndex: true,
    cypProfile: { substrate: ['CYP3A4'], inhibitor: [], inducer: ['CYP3A4'] },
    riskFlags: { nephrotoxic: 'none', hepatotoxic: 'moderate', qtProlongation: 'none', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.25,
    pk: { halfLife: 72, timeToPeak: 8, bioavailability: 0.89, proteinBinding: 0.45, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '15 mg tablet', value: 15, unit: 'mg', form: 'Tab' },
      { label: '30 mg tablet', value: 30, unit: 'mg', form: 'Tab' },
      { label: '60 mg tablet', value: 60, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'methimazole',
    name: 'Methimazole',
    nameKr: '메티마졸',
    activeSubstance: 'Methimazole',
    class: 'Thyroid',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 0.2, cat: 2.5 },
    doseRange: { dog: [0.1, 0.5], cat: [1.25, 5] },
    unit: 'mg',
    freq: 'BID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: [], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'low', hepatotoxic: 'moderate', qtProlongation: 'none', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.35,
    pk: { halfLife: 4, timeToPeak: 2, bioavailability: 0.88, proteinBinding: 0.1, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '2.5 mg tablet', value: 2.5, unit: 'mg', form: 'Tab' },
      { label: '5 mg tablet', value: 5, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'amlodipine',
    name: 'Amlodipine',
    nameKr: '암로디핀',
    activeSubstance: 'Amlodipine',
    class: 'Cardiac',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 0.15, cat: 0.625 },
    doseRange: { dog: [0.1, 0.25], cat: [0.3125, 1.25] },
    unit: 'mg',
    freq: 'SID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: ['CYP3A4'], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'none', hepatotoxic: 'low', qtProlongation: 'low', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.1,
    pk: { halfLife: 30, timeToPeak: 6, bioavailability: 0.7, proteinBinding: 0.93, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '2.5 mg tablet', value: 2.5, unit: 'mg', form: 'Tab' },
      { label: '5 mg tablet', value: 5, unit: 'mg', form: 'Tab' },
    ],
  },
  {
    id: 'maropitant',
    name: 'Maropitant',
    nameKr: '마로피탄트',
    activeSubstance: 'Maropitant',
    class: 'Antiemetic',
    source: DRUG_SOURCE.KR_VET,
    defaultDose: { dog: 2, cat: 1 },
    doseRange: { dog: [1, 2], cat: [1, 2] },
    unit: 'mg/kg',
    freq: 'SID',
    route: 'PO',
    narrowTherapeuticIndex: false,
    cypProfile: { substrate: ['CYP3A4', 'CYP2D6'], inhibitor: [], inducer: [] },
    riskFlags: { nephrotoxic: 'none', hepatotoxic: 'low', qtProlongation: 'none', bleedingRisk: 'none', giUlcer: 'none' },
    renalElimination: 0.1,
    pk: { halfLife: 7.5, timeToPeak: 2, bioavailability: 0.37, proteinBinding: 0.99, primaryElimination: 'hepatic' },
    availableStrengths: [
      { label: '16 mg tablet', value: 16, unit: 'mg', form: 'Tab' },
      { label: '24 mg tablet', value: 24, unit: 'mg', form: 'Tab' },
    ],
  },
];

const DEMO_ORGAN_BURDEN_BY_DRUG = {
  meloxicam: {
    dog: { brain: 20, heart: 28, liver: 65, kidney: 72, blood: 58 },
    cat: { brain: 18, heart: 24, liver: 62, kidney: 76, blood: 55 },
  },
  prednisolone: {
    dog: { brain: 22, heart: 26, liver: 70, kidney: 34, blood: 40 },
    cat: { brain: 18, heart: 20, liver: 68, kidney: 30, blood: 36 },
  },
  dexmedetomidine: {
    dog: { brain: 74, heart: 62, liver: 35, kidney: 18, blood: 20 },
    cat: { brain: 70, heart: 58, liver: 32, kidney: 16, blood: 18 },
  },
  'amoxicillin-clavulanate': {
    dog: { brain: 10, heart: 14, liver: 34, kidney: 66, blood: 18 },
    cat: { brain: 8, heart: 12, liver: 30, kidney: 62, blood: 16 },
  },
  furosemide: {
    dog: { brain: 12, heart: 28, liver: 22, kidney: 86, blood: 30 },
    cat: { brain: 10, heart: 24, liver: 20, kidney: 82, blood: 28 },
  },
  ivermectin: {
    dog: { brain: 68, heart: 24, liver: 42, kidney: 12, blood: 20 },
    cat: { brain: 66, heart: 22, liver: 40, kidney: 10, blood: 18 },
  },
  ketoconazole: {
    dog: { brain: 20, heart: 28, liver: 82, kidney: 24, blood: 22 },
    cat: { brain: 18, heart: 24, liver: 86, kidney: 20, blood: 20 },
  },
  enalapril: {
    dog: { brain: 8, heart: 36, liver: 16, kidney: 72, blood: 18 },
    cat: { brain: 6, heart: 34, liver: 14, kidney: 68, blood: 16 },
  },
  cyclosporine: {
    dog: { brain: 16, heart: 22, liver: 78, kidney: 36, blood: 32 },
    cat: { brain: 14, heart: 20, liver: 80, kidney: 34, blood: 30 },
  },
  phenobarbital: {
    dog: { brain: 56, heart: 18, liver: 74, kidney: 20, blood: 18 },
    cat: { brain: 52, heart: 16, liver: 70, kidney: 18, blood: 16 },
  },
  methimazole: {
    dog: { brain: 16, heart: 20, liver: 62, kidney: 38, blood: 26 },
    cat: { brain: 14, heart: 22, liver: 66, kidney: 42, blood: 30 },
  },
  amlodipine: {
    dog: { brain: 12, heart: 48, liver: 30, kidney: 22, blood: 20 },
    cat: { brain: 10, heart: 52, liver: 34, kidney: 24, blood: 22 },
  },
  maropitant: {
    dog: { brain: 20, heart: 16, liver: 48, kidney: 18, blood: 14 },
    cat: { brain: 22, heart: 18, liver: 52, kidney: 20, blood: 16 },
  },
};

DEMO_DRUGS_CATALOGUE.forEach((drug) => {
  if (DEMO_ORGAN_BURDEN_BY_DRUG[drug.id]) {
    drug.organBurden = DEMO_ORGAN_BURDEN_BY_DRUG[drug.id];
  }
});

// ── Demo Patient Profiles ─────────────────────────────────────────
const DEMO_PROFILES = [
  {
    id: 'choco',
    photo: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=640&h=760&auto=format&fit=crop&q=75',
    photoPosition: '50% 34%',
    nameKo: '초코',
    nameEn: 'Choco',
    species: 'dog',
    breed: 'Border Collie',
    weight: 12,
    ageKo: '4세',
    sex: 'Neutered Male',
    sexKo: '중성화 수컷',
    summaryKo: 'MDR1 유전자 변이 고위험 견종. 이버멕틴과 케토코나졸 병용 시 P-gp 억제로 신경독성 위험이 높습니다.',
    summaryEn: 'MDR1 mutation risk breed. Ivermectin + Ketoconazole: P-gp inhibition → severe neurotoxicity risk.',
    drugIds: ['ivermectin', 'ketoconazole'],
    conditions: [],
    flaggedLabs: [],
  },
  {
    id: 'haru',
    photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=480&auto=format&fit=crop&q=70',
    photoPosition: '50% 28%',
    nameKo: '하루',
    nameEn: 'Haru',
    species: 'dog',
    breed: 'Golden Retriever',
    weight: 28,
    ageKo: '8세',
    sex: 'Spayed Female',
    sexKo: '중성화 암컷',
    summaryKo: '만성 심장질환 이력. NSAID+이뇨제+ACE억제제 3제 병용 시 신장 관류 저하(Triple Whammy) 위험.',
    summaryEn: 'Chronic cardiac disease. Triple Whammy — renal perfusion risk with NSAID + diuretic + ACEi.',
    drugIds: ['meloxicam', 'furosemide', 'enalapril'],
    conditions: ['Chronic Heart Disease'],
    flaggedLabs: [],
  },
  {
    id: 'kongyi',
    photo: 'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=640&h=760&auto=format&fit=crop&q=75',
    photoPosition: '50% 40%',
    nameKo: '콩이',
    nameEn: 'Kongyi',
    species: 'dog',
    breed: 'Shih Tzu',
    weight: 6,
    ageKo: '6세',
    sex: 'Intact Male',
    sexKo: '미중성화 수컷',
    summaryKo: '알레르기성 피부염 및 간질 병력. 프레드니솔론+페노바르비탈+사이클로스포린 3제로 간 CYP3A4 부담 가중.',
    summaryEn: 'Allergic dermatitis + epilepsy. Hepatic CYP3A4 overload risk with corticosteroid + anticonvulsant + immunosuppressant.',
    drugIds: ['prednisolone', 'phenobarbital', 'cyclosporine'],
    conditions: ['Allergic Dermatitis', 'Epilepsy'],
    flaggedLabs: [],
  },
  {
    id: 'nabi',
    photo: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=640&h=760&auto=format&fit=crop&q=75',
    photoPosition: '50% 36%',
    nameKo: '나비',
    nameEn: 'Nabi',
    species: 'cat',
    breed: 'Persian',
    weight: 4.1,
    ageKo: '7세',
    sex: 'Spayed Female',
    sexKo: '중성화 암컷',
    summaryKo: '갑상선 기능 항진증 및 초기 CKD 병력. 갑상선/혈압/항구토 처방의 장기 연관도를 확인해야 합니다.',
    summaryEn: 'Hyperthyroidism with early CKD. Organ involvement monitoring is required across thyroid, blood pressure and antiemetic therapy.',
    drugIds: ['methimazole', 'amlodipine', 'maropitant'],
    conditions: ['Hyperthyroidism', 'Early CKD (IRIS Stage 2)'],
    flaggedLabs: [
      { key: 'creatinine', value: '2.0', unit: 'mg/dL', status: 'high' },
      { key: 'bun', value: '36', unit: 'mg/dL', status: 'high' },
    ],
  },
];

// ── Profile Selection Step ────────────────────────────────────────
function ProfileSelectStep({ onSelect }) {
  const { lang } = useI18n();
  const [hovered, setHovered] = useState(null);

  return (
    <div className="flex-1 px-4 sm:px-6 py-8 animate-slide-in">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <p className="typo-section-header mb-2">
            {lang === 'ko' ? '데모 시작 / START DEMO' : 'START DEMO'}
          </p>
          <h1 className="typo-page-title mb-3">
            {lang === 'ko' ? '환자를 선택하세요' : 'Select a Demo Patient'}
          </h1>
          <p className="typo-body text-slate-500 max-w-md mx-auto" style={{ wordBreak: 'keep-all' }}>
            {lang === 'ko'
              ? '실제 임상 시나리오를 기반으로 한 4가지 환자 프로필 중 하나를 선택하세요.'
              : 'Choose from four clinical scenarios to see how NuvoVet handles complex drug interactions.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {DEMO_PROFILES.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onSelect(profile)}
              onMouseEnter={() => setHovered(profile.id)}
              onMouseLeave={() => setHovered(null)}
              className={`text-left rounded-2xl border bg-white shadow-sm overflow-hidden transition-all duration-200 ${
                hovered === profile.id
                  ? 'border-indigo-400 shadow-indigo-100/60 shadow-lg -translate-y-0.5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Dog photo */}
              <div className="h-44 overflow-hidden bg-slate-100">
                <img
                  src={profile.photo}
                  alt={profile.nameEn}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ objectPosition: profile.photoPosition || '50% 35%' }}
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[18px] font-black text-slate-900">{profile.nameKo}</span>
                  <span className="text-[12px] text-slate-400 font-medium">{profile.nameEn}</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 mb-2">
                  {profile.breed} · {profile.weight}kg · {profile.ageKo} · {lang === 'ko' ? profile.sexKo : profile.sex}
                </p>
                <p
                  className="text-[11px] text-slate-600 leading-relaxed mb-3"
                  style={{ wordBreak: 'keep-all', lineHeight: 1.8 }}
                >
                  {lang === 'ko' ? profile.summaryKo : profile.summaryEn}
                </p>

                {/* Pre-selected drug tags */}
                <div className="flex flex-wrap gap-1">
                  {profile.drugIds.map((id) => {
                    const drug = DEMO_DRUGS_CATALOGUE.find((d) => d.id === id);
                    return drug ? (
                      <span
                        key={id}
                        className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200"
                      >
                        {drug.name}
                      </span>
                    ) : null;
                  })}
                </div>

                {profile.conditions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {profile.conditions.map((c, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Select CTA */}
              <div
                className={`px-4 py-2.5 border-t flex items-center justify-between transition-colors duration-200 ${
                  hovered === profile.id
                    ? 'bg-indigo-50 border-indigo-100'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <span
                  className={`text-[11px] font-semibold transition-colors ${
                    hovered === profile.id ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                >
                  {lang === 'ko' ? '이 환자 선택' : 'Select patient'}
                </span>
                <ArrowRight
                  size={13}
                  className={`transition-colors ${
                    hovered === profile.id ? 'text-indigo-500' : 'text-slate-300'
                  }`}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Selected Profile Card (prescription step) ────────────────────
function SelectedProfileCard({ profile }) {
  const { lang } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
            <img
              src={profile.photo}
              alt={profile.nameEn}
              className="w-full h-full object-cover"
              style={{ objectPosition: profile.photoPosition || '50% 35%' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-bold text-slate-900">{profile.nameKo}</p>
              <span className="text-[11px] text-slate-400 font-medium">{profile.nameEn}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                <Lock size={8} />
                {lang === 'ko' ? '데모' : 'Demo'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {profile.breed} · {lang === 'ko' ? profile.sexKo : profile.sex}
            </p>
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
          { label: lang === 'ko' ? '나이' : 'Age', value: profile.ageKo },
          { label: lang === 'ko' ? '체중' : 'Weight', value: `${profile.weight} kg` },
          { label: lang === 'ko' ? '품종' : 'Breed', value: profile.breed },
          { label: lang === 'ko' ? '성별' : 'Sex', value: lang === 'ko' ? profile.sexKo : profile.sex },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="typo-label uppercase">{label}</p>
            <p className="text-[12px] font-semibold text-slate-900 mt-0.5 truncate">{value}</p>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="px-4 pb-3 animate-fade-in">
          {profile.conditions.length > 0 ? (
            <>
              <p className="typo-label mb-1.5">{lang === 'ko' ? '기저 질환' : 'Conditions'}</p>
              <div className="flex flex-wrap gap-1">
                {profile.conditions.map((c, i) => (
                  <span key={i} className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                    {c}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[12px] text-slate-400 italic">
              {lang === 'ko' ? '기저 질환 없음' : 'No pre-existing conditions'}
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

// ── Demo Drug Card (simplified, with guided animation support) ───
function DemoDrugCard({ drug, species, weight, onRemove, guideStrength }) {
  const [selectedStrengthIdx, setSelectedStrengthIdx] = useState(0);
  const [dosePerKg, setDosePerKg] = useState(drug.defaultDose?.[species] || drug.defaultDose?.dog || '');
  const [freq, setFreq] = useState(drug.freq || 'SID');
  const strengths = drug.availableStrengths || [];

  const doseNum = parseFloat(dosePerKg) || 0;
  const isPerKgUnit = typeof drug.unit === 'string' && drug.unit.includes('/kg');
  const totalDoseMg = doseNum > 0
    ? +(isPerKgUnit && weight > 0 ? doseNum * weight : doseNum)
    : null;
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
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Dose ({drug.unit})</p>
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

// ── Demo Drug Search (no API) ─────────────────────────────────────
function DemoDrugSearch({ addedDrugIds, onAdd, guideStep }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const { lang } = useI18n();

  const handleQuery = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (q.trim().length >= 1) {
      const filtered = DEMO_DRUGS_CATALOGUE.filter(d =>
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
            {lang === 'ko'
              ? 'Meloxicam, Prednisolone, Furosemide, Ivermectin, Ketoconazole, Enalapril, Cyclosporine, Phenobarbital 등'
              : 'Try: Meloxicam, Prednisolone, Furosemide, Ivermectin, Ketoconazole, Enalapril, Cyclosporine, Phenobarbital'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Demo Results — Left Patient Summary ───────────────────────────
function DemoResultsPatientSummary({ profile, drugs }) {
  const { lang } = useI18n();

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="h-44 bg-slate-100 overflow-hidden">
          <img
            src={profile.photo}
            alt={profile.nameEn}
            className="w-full h-full object-cover"
            style={{ objectPosition: profile.photoPosition || '50% 35%' }}
          />
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[16px] font-black text-slate-900">{profile.nameKo}</span>
            <span className="text-[11px] text-slate-400">{profile.nameEn}</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full ml-auto">
              <Lock size={8} />
              {lang === 'ko' ? '데모' : 'Demo'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            {profile.breed} · {lang === 'ko' ? profile.sexKo : profile.sex}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              { label: lang === 'ko' ? '체중' : 'Weight', value: `${profile.weight} kg` },
              { label: lang === 'ko' ? '나이' : 'Age', value: profile.ageKo },
              {
                label: lang === 'ko' ? '종' : 'Species',
                value: profile.species === 'cat'
                  ? (lang === 'ko' ? '고양이 (Feline)' : 'Feline')
                  : (lang === 'ko' ? '개 (Canine)' : 'Canine'),
              },
              { label: lang === 'ko' ? '성별' : 'Sex', value: lang === 'ko' ? profile.sexKo : profile.sex },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="typo-label">{label}</p>
                <p className="text-[12px] font-semibold text-slate-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {profile.conditions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="typo-label mb-1.5">{lang === 'ko' ? '기저 질환' : 'Conditions'}</p>
              <div className="flex flex-wrap gap-1">
                {profile.conditions.map((c, i) => (
                  <span key={i} className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Prescribed drugs list */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="typo-section-header mb-3">
          {lang === 'ko' ? '처방 약물' : 'PRESCRIBED DRUGS'}
        </p>
        <div className="space-y-2">
          {drugs.map((drug) => (
            <div key={drug.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-[12px] font-semibold text-slate-800">{drug.nameKr || drug.name}</p>
                <p className="text-[10px] text-slate-400">{drug.name}</p>
              </div>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                {drug.class}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Demo Results — Right Organ + Dose Panel ───────────────────────
function DemoResultsRightPanel({ drugs, profile, results }) {
  const { lang } = useI18n();
  const species = profile?.species || 'dog';
  const weight = profile?.weight || 12;
  const organScores = aggregateOrganBurden(drugs, species);

  return (
    <div className="space-y-3">
      {/* Dose summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="typo-section-header mb-3">
          {lang === 'ko' ? '체중 보정 용량' : 'WEIGHT-ADJUSTED DOSE'}
        </p>
        <div className="space-y-0">
          {drugs.map((drug) => {
            const dose = drug.defaultDose?.[species] ?? drug.defaultDose?.dog;
            const totalMg = dose ? (dose * weight) : null;
            return (
              <div key={drug.id} className="py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12px] font-semibold text-slate-800">{drug.nameKr || drug.name}</p>
                  {totalMg !== null && (
                    <span className="text-[12px] font-bold text-slate-900 shrink-0">
                      {totalMg % 1 === 0 ? totalMg : totalMg.toFixed(2)} mg
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {dose} {drug.unit} × {weight} kg · {drug.freq} · {drug.route}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anatomy diagram */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <AnatomyDiagram
          species={species}
          organScores={organScores}
          patientBreed={profile?.breed}
          mdr1SensitiveDrugs={drugs.filter((d) => d.mdr1Sensitive).map((d) => d.id)}
          drugs={drugs}
          patientInfo={{
            name: profile?.nameKo,
            breed: profile?.breed,
            weight: profile?.weight,
            species,
          }}
          overallRisk={results?.overallSeverity?.score >= 100 ? 'contraindicated' : undefined}
        />
      </div>
    </div>
  );
}

// ── Main Demo Page ───────────────────────────────────────────────
export default function Demo() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  const [step, setStep] = useState('profile_select'); // 'profile_select' | 'prescription' | 'analyzing' | 'results'
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [drugs, setDrugs] = useState([]);
  const [results, setResults] = useState(null);

  // ── Guided animation step ────────────────────────────────────────
  const [guideStep, setGuideStep] = useState('search');

  useEffect(() => {
    if (drugs.length === 0) {
      setGuideStep('search');
    } else {
      setGuideStep('run');
    }
  }, [drugs.length]);

  const handleSelectProfile = (profile) => {
    setSelectedProfile(profile);
    const profileDrugs = profile.drugIds
      .map((id) => DEMO_DRUGS_CATALOGUE.find((d) => d.id === id))
      .filter(Boolean);
    setDrugs(profileDrugs);
    setStep('prescription');
  };

  const handleSearchFocus = () => {
    if (drugs.length === 0) setGuideStep('search');
  };

  const handleSearchInput = () => {
    if (drugs.length === 0) setGuideStep('result');
  };

  const handleAddDrug = (drug) => {
    setDrugs((prev) => [...prev, drug]);
    setGuideStep('strength');
    setTimeout(() => setGuideStep('run'), 2500);
  };

  const handleRemoveDrug = (drugId) => {
    setDrugs((prev) => prev.filter((d) => d.id !== drugId));
  };

  const handleRunAnalysis = () => {
    if (drugs.length < 1) return;
    setGuideStep('done');
    setStep('analyzing');
  };

  const handleAnalysisComplete = useCallback(() => {
    const weight = selectedProfile?.weight ?? 12;
    const species = selectedProfile?.species ?? 'dog';
    const analysisResults = runFullDURAnalysis(drugs, species, weight);
    setResults(analysisResults);
    setStep('results');
  }, [drugs, selectedProfile]);

  const handleNewAnalysis = () => {
    setStep('profile_select');
    setDrugs([]);
    setResults(null);
    setSelectedProfile(null);
    setGuideStep('search');
  };

  const addedDrugIds = new Set(drugs.map((d) => d.id));

  const patientInfo = selectedProfile
    ? {
        name: selectedProfile.nameKo,
        species: selectedProfile.species,
        breed: selectedProfile.breed,
        weight: selectedProfile.weight,
        conditions: selectedProfile.conditions,
        flaggedLabs: selectedProfile.flaggedLabs,
        imageUrl: selectedProfile.photo,
        imagePosition: selectedProfile.photoPosition,
      }
    : null;

  const handleBack = () => {
    if (step === 'results') {
      setStep('prescription');
    } else if (step === 'prescription') {
      setStep('profile_select');
    } else {
      navigate('/');
    }
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
              onClick={handleBack}
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

      {/* ── Profile Selection Step ── */}
      {step === 'profile_select' && (
        <ProfileSelectStep onSelect={handleSelectProfile} />
      )}

      {/* ── Prescription step ── */}
      {step === 'prescription' && selectedProfile && (
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
                  ? '약물을 확인하거나 추가한 뒤 DUR 검사를 실행하세요.'
                  : 'Review or add drugs below, then run the DUR scan.'}
              </p>
            </div>

            {/* Selected patient */}
            <SelectedProfileCard profile={selectedProfile} />

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

              {/* Demo drug chips */}
              <div className="flex flex-wrap gap-1.5">
                {DEMO_DRUGS_CATALOGUE.map((d) => (
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
                />
              </div>

              {/* Added drug cards */}
              {drugs.length > 0 && (
                <div className="space-y-3 mt-2">
                  {drugs.map((drug) => (
                    <DemoDrugCard
                      key={drug.id}
                      drug={drug}
                      species={selectedProfile.species}
                      weight={selectedProfile.weight}
                      onRemove={() => handleRemoveDrug(drug.id)}
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
          species={selectedProfile?.species || 'dog'}
        />
      )}

      {/* ── Results step — 3-column layout ── */}
      {step === 'results' && results && selectedProfile && (
        <main className="flex-1 pb-8">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 animate-fade-in">
            <div className="flex gap-5 items-start">

              {/* Left column — patient summary */}
              <div className="hidden lg:block w-72 xl:w-80 shrink-0">
                <div className="sticky top-[78px]">
                  <DemoResultsPatientSummary
                    profile={selectedProfile}
                    drugs={drugs}
                  />
                </div>
              </div>

              {/* Middle column — scan results */}
              <div className="flex-1 min-w-0">
                <ResultsDisplay
                  hideSidebar
                  demoMode
                  results={results}
                  onBack={() => setStep('prescription')}
                  onNewAnalysis={handleNewAnalysis}
                  patientInfo={patientInfo}
                  drugs={drugs}
                  species={selectedProfile.species}
                />
              </div>

              {/* Right column — dose summary + anatomy */}
              <div className="hidden xl:block w-72 xl:w-80 shrink-0">
                <div className="sticky top-[78px]">
                  <DemoResultsRightPanel
                    drugs={drugs}
                    profile={selectedProfile}
                    results={results}
                  />
                </div>
              </div>

            </div>
          </div>
        </main>
      )}
    </div>
  );
}
