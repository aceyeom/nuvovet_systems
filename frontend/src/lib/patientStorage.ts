/**
 * Patient Profile Storage (server-backed)
 *
 * Persists patient profiles in the backend database under the authenticated account.
 */

import {
  addPatientVisitApi,
  deletePatientApi,
  getPatientsApi,
  upsertPatientApi,
} from './api';

export interface VisitRecord {
  date: string;
  drugs: string[];
  dur_summary: string;
  prescribed_drugs?: {
    id: string;
    name: string;
    regimen?: string;
    note?: string;
  }[];
}

export interface PatientProfile {
  id: string;
  name: string;
  owner_phone: string | null;
  species: 'dog' | 'cat';
  breed: string | null;
  weight_kg: number | null;
  sex: string | null;
  age_years: number | null;
  allergies: string[];
  conditions: string[];
  creatinine_mg_dL: number | null;
  alt_u_L: number | null;
  created_at: string;
  updated_at: string;
  visit_history: VisitRecord[];
}

function normalizePatient(raw: any): PatientProfile {
  const nowIso = new Date().toISOString();
  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || 'Patient'),
    owner_phone: raw?.owner_phone ?? null,
    species: raw?.species === 'cat' ? 'cat' : 'dog',
    breed: raw?.breed ?? null,
    weight_kg: typeof raw?.weight_kg === 'number' ? raw.weight_kg : null,
    sex: raw?.sex ?? null,
    age_years: typeof raw?.age_years === 'number' ? raw.age_years : null,
    allergies: Array.isArray(raw?.allergies) ? raw.allergies : [],
    conditions: Array.isArray(raw?.conditions) ? raw.conditions : [],
    creatinine_mg_dL: typeof raw?.creatinine_mg_dL === 'number' ? raw.creatinine_mg_dL : null,
    alt_u_L: typeof raw?.alt_u_L === 'number' ? raw.alt_u_L : null,
    created_at: typeof raw?.created_at === 'string' ? raw.created_at : nowIso,
    updated_at: typeof raw?.updated_at === 'string' ? raw.updated_at : nowIso,
    visit_history: Array.isArray(raw?.visit_history) ? raw.visit_history : [],
  };
}

export async function getAllPatients(): Promise<PatientProfile[]> {
  const rows = await getPatientsApi();
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizePatient);
}

export async function searchPatients(query: string): Promise<PatientProfile[]> {
  const all = await getAllPatients();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.owner_phone ?? '').toLowerCase().includes(q),
  );
}

export async function getPatientById(id: string): Promise<PatientProfile | null> {
  const all = await getAllPatients();
  return all.find((p) => p.id === id) ?? null;
}

export async function savePatient(
  partial: Omit<PatientProfile, 'id' | 'created_at' | 'updated_at' | 'visit_history'> & {
    id?: string;
    visit_history?: VisitRecord[];
  },
): Promise<PatientProfile> {
  const payload = {
    ...partial,
    id: partial.id,
    visit_history: partial.visit_history ?? [],
  };

  const saved = await upsertPatientApi(payload);
  if (!saved) {
    throw new Error('Failed to save patient profile');
  }
  return normalizePatient(saved);
}

export async function addVisitRecord(
  patientId: string,
  visit: VisitRecord,
): Promise<PatientProfile | null> {
  const saved = await addPatientVisitApi(patientId, visit);
  return saved ? normalizePatient(saved) : null;
}

export async function deletePatient(id: string): Promise<void> {
  await deletePatientApi(id);
}

export function sortPatients(
  profiles: PatientProfile[],
  by: 'last_visit' | 'name' | 'species',
): PatientProfile[] {
  return [...profiles].sort((a, b) => {
    if (by === 'name') return a.name.localeCompare(b.name);
    if (by === 'species') return a.species.localeCompare(b.species);
    const aDate = a.visit_history[0]?.date ?? a.updated_at;
    const bDate = b.visit_history[0]?.date ?? b.updated_at;
    return bDate.localeCompare(aDate);
  });
}
