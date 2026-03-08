// Korean EMR-aligned frontend schema helpers.

export const SEX_ENUM = [
  'Spayed Female',
  'Neutered Male',
  'Intact Female',
  'Intact Male',
  'Unknown',
];

export const PATIENT_STATUS_ENUM = ['정상', '사망', '기타'];

export const ROUTE_ENUM = ['PO', 'IV', 'SC', 'IM', 'Eye', 'Ear', 'Top', 'Inh'];

export const DOSE_UNIT_ENUM = ['mg/kg', 'mcg/kg', 'IU/kg', 'ml/kg', 'mg', 'EA'];

export const TREATMENT_CATEGORY_ENUM = ['진찰', '검사', '처치', '수액/수혈', '의료폐기물'];

export function freqToTimesPerDay(freq) {
  if (!freq) return 1;
  const normalized = String(freq).toUpperCase();
  if (normalized.includes('TID') || normalized.includes('Q8H')) return 3;
  if (normalized.includes('BID') || normalized.includes('Q12H')) return 2;
  return 1;
}

export function normalizeRoute(route) {
  const value = String(route || '').toLowerCase();
  if (value.includes('iv')) return 'IV';
  if (value.includes('sc')) return 'SC';
  if (value.includes('im')) return 'IM';
  if (value.includes('eye') || value.includes('oph')) return 'Eye';
  if (value.includes('ear') || value.includes('otic')) return 'Ear';
  if (value.includes('top')) return 'Top';
  if (value.includes('inh')) return 'Inh';
  return 'PO';
}

export function normalizeDoseUnit(unit) {
  const value = String(unit || '').toLowerCase();
  if (value.includes('mcg/kg')) return 'mcg/kg';
  if (value.includes('iu/kg')) return 'IU/kg';
  if (value.includes('ml/kg')) return 'ml/kg';
  if (value.includes('mg/kg')) return 'mg/kg';
  if (value === 'ea') return 'EA';
  if (value.includes('mg')) return 'mg';
  return 'mg/kg';
}

function toFixedFloat(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

export function calculateDoseMetrics({ dosePerKg, doseUnit, patientWeight, daysSupplied, timesPerDay }) {
  const qty = Number(dosePerKg) || 0;
  const weight = Number(patientWeight) || 0;
  const days = Math.max(1, Number(daysSupplied) || 1);
  const times = Math.max(1, Number(timesPerDay) || 1);

  const perKgUnit = doseUnit.endsWith('/kg');
  const calculatedDose = perKgUnit ? qty * weight : qty;
  const totalDose = calculatedDose * days * times;

  return {
    calculatedDose_mg: toFixedFloat(calculatedDose),
    totalDose_mg: toFixedFloat(totalDose),
  };
}

export function buildPrescriptionLineItem(drug, patientWeight) {
  const defaultDoseBySpecies =
    drug?.defaultDose?.dog != null
      ? drug.defaultDose.dog
      : drug?.defaultDose?.cat != null
      ? drug.defaultDose.cat
      : 0;

  const dosePerKg = Number(drug?.dosePerKg ?? defaultDoseBySpecies ?? 0) || 0;
  const doseUnit = normalizeDoseUnit(drug?.doseUnit || drug?.unit);
  const route = normalizeRoute(drug?.route);
  const daysSupplied = Number(drug?.daysSupplied) || 1;
  const timesPerDay = Number(drug?.timesPerDay) || freqToTimesPerDay(drug?.freq);

  const { calculatedDose_mg, totalDose_mg } = calculateDoseMetrics({
    dosePerKg,
    doseUnit,
    patientWeight,
    daysSupplied,
    timesPerDay,
  });

  return {
    ...drug,
    dosePerKg,
    doseUnit,
    daysSupplied,
    timesPerDay,
    calculatedDose_mg,
    totalDose_mg,
    route,
    folderName: drug?.folderName || '기본',
    treatmentCategory: drug?.treatmentCategory || '처치',
    sellingPrice: Number(drug?.sellingPrice) || 0,
    vatApplicable: Boolean(drug?.vatApplicable),
  };
}
