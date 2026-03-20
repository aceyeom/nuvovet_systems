/**
 * Seed Data — 소미 (Somi) & 하루 (Haru)
 *
 * Realistic patient profiles and diagnosis history for dashboard population.
 * Spans the past ~90 days under the admin account.
 * DO NOT import into durEngine or backend data files.
 */

const SEED_STORAGE_KEY = 'nuvovet_seed_initialized';
const PATIENTS_KEY = 'nuvovet_patients';

// Fixed IDs for deterministic seeding
const SOMI_ID = 'seed-somi-001';
const HARU_ID = 'seed-haru-001';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
  return d.toISOString();
}

const SOMI_PROFILE = {
  id: SOMI_ID,
  name: '소미 (Somi)',
  owner_phone: '010-1234-5678',
  species: 'dog',
  breed: 'Golden Retriever',
  weight_kg: 28.5,
  sex: 'Spayed Female',
  age_years: 7,
  allergies: ['Penicillin'],
  conditions: ['Osteoarthritis', 'Mild hepatic insufficiency'],
  creatinine_mg_dL: 1.2,
  alt_u_L: 88,
  created_at: daysAgo(92),
  updated_at: daysAgo(3),
  visit_history: [
    {
      date: daysAgo(3),
      drugs: ['meloxicam', 'omeprazole', 'tramadol'],
      dur_summary: 'Moderate',
      prescribed_drugs: [
        { id: 'meloxicam', name: 'Meloxicam', regimen: '0.1 mg/kg PO SID × 14일', note: '관절염 유지 치료' },
        { id: 'omeprazole', name: 'Omeprazole', regimen: '1 mg/kg PO SID × 14일', note: 'NSAID 위장보호' },
        { id: 'tramadol', name: 'Tramadol', regimen: '3 mg/kg PO BID PRN', note: '통증 보조' },
      ],
    },
    {
      date: daysAgo(18),
      drugs: ['meloxicam', 'omeprazole'],
      dur_summary: 'Minor',
      prescribed_drugs: [
        { id: 'meloxicam', name: 'Meloxicam', regimen: '0.1 mg/kg PO SID × 14일', note: '관절염 유지' },
        { id: 'omeprazole', name: 'Omeprazole', regimen: '1 mg/kg PO SID × 14일', note: '위장보호' },
      ],
    },
    {
      date: daysAgo(45),
      drugs: ['meloxicam', 'prednisolone', 'omeprazole'],
      dur_summary: 'Critical',
      prescribed_drugs: [
        { id: 'meloxicam', name: 'Meloxicam', regimen: '0.1 mg/kg PO SID', note: '관절염' },
        { id: 'prednisolone', name: 'Prednisolone', regimen: '0.5 mg/kg PO BID × 5일', note: '급성 염증' },
        { id: 'omeprazole', name: 'Omeprazole', regimen: '1 mg/kg PO SID', note: '위장보호' },
      ],
    },
    {
      date: daysAgo(72),
      drugs: ['carprofen', 'gabapentin'],
      dur_summary: 'Clear',
      prescribed_drugs: [
        { id: 'carprofen', name: 'Carprofen', regimen: '2.2 mg/kg PO BID × 10일', note: '초기 관절염 관리' },
        { id: 'gabapentin', name: 'Gabapentin', regimen: '5 mg/kg PO BID', note: '신경병증 통증' },
      ],
    },
  ],
};

const HARU_PROFILE = {
  id: HARU_ID,
  name: '하루 (Haru)',
  owner_phone: '010-9876-5432',
  species: 'cat',
  breed: 'Korean Shorthair',
  weight_kg: 4.2,
  sex: 'Neutered Male',
  age_years: 12,
  allergies: [],
  conditions: ['CKD Stage II', 'Hyperthyroidism'],
  creatinine_mg_dL: 2.8,
  alt_u_L: 42,
  created_at: daysAgo(88),
  updated_at: daysAgo(5),
  visit_history: [
    {
      date: daysAgo(5),
      drugs: ['methimazole', 'amlodipine', 'aluminum-hydroxide'],
      dur_summary: 'Moderate',
      prescribed_drugs: [
        { id: 'methimazole', name: 'Methimazole', regimen: '2.5 mg PO BID', note: '갑상선 기능 항진증' },
        { id: 'amlodipine', name: 'Amlodipine', regimen: '0.625 mg PO SID', note: '고혈압 관리' },
        { id: 'aluminum-hydroxide', name: 'Aluminum Hydroxide', regimen: '90 mg/kg PO SID (식사 시)', note: '인 결합제' },
      ],
    },
    {
      date: daysAgo(22),
      drugs: ['methimazole', 'benazepril'],
      dur_summary: 'Minor',
      prescribed_drugs: [
        { id: 'methimazole', name: 'Methimazole', regimen: '2.5 mg PO BID', note: '갑상선 기능 항진증' },
        { id: 'benazepril', name: 'Benazepril', regimen: '0.5 mg/kg PO SID', note: 'ACE 억제제 — 신장 보호' },
      ],
    },
    {
      date: daysAgo(50),
      drugs: ['methimazole', 'enrofloxacin', 'maropitant'],
      dur_summary: 'Critical',
      prescribed_drugs: [
        { id: 'methimazole', name: 'Methimazole', regimen: '2.5 mg PO BID', note: '갑상선' },
        { id: 'enrofloxacin', name: 'Enrofloxacin', regimen: '5 mg/kg PO SID × 7일', note: 'UTI 치료' },
        { id: 'maropitant', name: 'Maropitant', regimen: '1 mg/kg SC SID × 3일', note: '구토 방지' },
      ],
    },
    {
      date: daysAgo(75),
      drugs: ['methimazole', 'famotidine'],
      dur_summary: 'Clear',
      prescribed_drugs: [
        { id: 'methimazole', name: 'Methimazole', regimen: '2.5 mg PO BID', note: '갑상선' },
        { id: 'famotidine', name: 'Famotidine', regimen: '0.5 mg/kg PO SID × 7일', note: '위산 억제' },
      ],
    },
    {
      date: daysAgo(88),
      drugs: ['methimazole'],
      dur_summary: 'Clear',
      prescribed_drugs: [
        { id: 'methimazole', name: 'Methimazole', regimen: '1.25 mg PO BID', note: '갑상선 — 초기 용량' },
      ],
    },
  ],
};

// ── Aggregated analytics derived from seed data ──────────────────────

export function getSeedPatients() {
  return [SOMI_PROFILE, HARU_PROFILE];
}

export function getSeedAnalytics() {
  const patients = getSeedPatients();
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // All visits flattened
  const allVisits = patients.flatMap(p =>
    p.visit_history.map(v => ({ ...v, patientName: p.name, patientId: p.id, species: p.species }))
  );

  // This month's visits
  const monthVisits = allVisits.filter(v => {
    const d = new Date(v.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  // Alerts
  const alertsByType = { Critical: 0, Moderate: 0, Minor: 0, Clear: 0 };
  allVisits.forEach(v => { alertsByType[v.dur_summary] = (alertsByType[v.dur_summary] || 0) + 1; });

  // Drug frequency
  const drugFreq = {};
  allVisits.forEach(v => {
    (v.prescribed_drugs || []).forEach(rx => {
      drugFreq[rx.name] = (drugFreq[rx.name] || 0) + 1;
    });
  });
  const topDrugs = Object.entries(drugFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Drug class mapping
  const drugClasses = {
    Meloxicam: 'NSAID', Carprofen: 'NSAID',
    Prednisolone: 'Corticosteroid',
    Tramadol: 'Opioid Analgesic', Gabapentin: 'Anticonvulsant/Analgesic',
    Omeprazole: 'Proton Pump Inhibitor', Famotidine: 'H2 Blocker',
    Methimazole: 'Antithyroid',
    Amlodipine: 'Calcium Channel Blocker', Benazepril: 'ACE Inhibitor',
    Enrofloxacin: 'Fluoroquinolone', Maropitant: 'NK1 Antagonist',
    'Aluminum Hydroxide': 'Phosphate Binder',
  };
  const classFreq = {};
  allVisits.forEach(v => {
    (v.prescribed_drugs || []).forEach(rx => {
      const cls = drugClasses[rx.name] || 'Other';
      classFreq[cls] = (classFreq[cls] || 0) + 1;
    });
  });
  const topClasses = Object.entries(classFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Weekly trend (past 12 weeks)
  const weeklyTrend = [];
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = allVisits.filter(v => {
      const d = new Date(v.date);
      return d >= weekStart && d < weekEnd;
    }).length;
    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    weeklyTrend.push({ label, count });
  }

  // Most flagged drug combination
  const combos = {};
  allVisits.filter(v => v.dur_summary === 'Critical' || v.dur_summary === 'Moderate').forEach(v => {
    const names = (v.prescribed_drugs || []).map(rx => rx.name).sort();
    if (names.length >= 2) {
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const key = `${names[i]} + ${names[j]}`;
          combos[key] = (combos[key] || 0) + 1;
        }
      }
    }
  });
  const mostFlaggedCombo = Object.entries(combos).sort((a, b) => b[1] - a[1])[0] || ['—', 0];

  return {
    totalDiagnosesThisMonth: monthVisits.length,
    totalDiagnosesAll: allVisits.length,
    alertsCaughtThisMonth: monthVisits.filter(v => v.dur_summary !== 'Clear').length,
    alertsCaughtAll: allVisits.filter(v => v.dur_summary !== 'Clear').length,
    uniquePatients: patients.length,
    mostFlaggedCombo: { combo: mostFlaggedCombo[0], count: mostFlaggedCombo[1] },
    alertsByType,
    topDrugs,
    topClasses,
    weeklyTrend,
    allVisits,
    patients,
  };
}

/**
 * Seeds localStorage with Somi & Haru if not already present.
 * Safe to call multiple times — checks for existing IDs.
 */
export function ensureSeedData() {
  try {
    const raw = localStorage.getItem(PATIENTS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const hasSomi = existing.some(p => p.id === SOMI_ID);
    const hasHaru = existing.some(p => p.id === HARU_ID);

    if (hasSomi && hasHaru) return; // already seeded

    const toAdd = [];
    if (!hasSomi) toAdd.push(SOMI_PROFILE);
    if (!hasHaru) toAdd.push(HARU_PROFILE);

    const merged = [...toAdd, ...existing];
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(merged));
  } catch {
    // localStorage unavailable
  }
}
