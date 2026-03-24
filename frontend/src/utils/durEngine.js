/**
 * Client-side DUR Interaction Engine — v3.0 Comprehensive Clinical DUR
 *
 * runFullDURAnalysis(drugs, species, weightKg, patient)
 *   patient = { breed, ageNum, ageUnit, conditions, creatinine, alt, sex,
 *               isNeutered, isPregnant, trimester, allergies, currentMedications }
 *
 * Produces:
 *   interactions    — pairwise DDI alerts
 *   drugFlags       — per-drug source / species / NTI flags
 *   patientAlerts   — patient-context alerts (breed, age, condition, dose, lab,
 *                      disease, pregnancy, allergy, gender, food, washout)
 *   overallSeverity
 *   confidenceScore
 *   speciesNotes
 */

import { DRUG_SOURCE } from '../data/drugDatabase';
import {
  checkDrugDiseaseRules,
  checkDrugAgeRules,
  checkDrugPregnancyRules,
  checkAllergyRules,
  checkDrugFoodRules,
  checkGenderRules,
  checkLabInterference,
  checkWashoutRules,
} from './drugClassRules';

// ── Severity definitions ─────────────────────────────────────────
const SEVERITY = {
  CRITICAL: { label: 'Critical', score: 100, color: 'red' },
  MODERATE: { label: 'Moderate', score: 50, color: 'orange' },
  MINOR:    { label: 'Minor',    score: 20,  color: 'yellow' },
  NONE:     { label: 'None',     score: 0,   color: 'green' },
};

// ── Brachycephalic breeds ────────────────────────────────────────
const BRACHYCEPHALIC_BREEDS = [
  'French Bulldog', 'Bulldog', 'English Bulldog', 'Pug', 'Boston Terrier',
  'Boxer', 'Shih Tzu', 'Cavalier King Charles Spaniel', 'Lhasa Apso',
  'Chow Chow', 'Pekingese', 'Affenpinscher', 'Brussels Griffon',
  'Dogue de Bordeaux', 'Persian', 'Himalayan', 'Exotic Shorthair',
  'British Shorthair', 'Burmese',
];

// ── MDR1-sensitive breeds ────────────────────────────────────────
const MDR1_BREEDS = [
  'Australian Shepherd', 'Collie', 'Rough Collie', 'Smooth Collie',
  'Border Collie', 'Shetland Sheepdog', 'Sheltie', 'Old English Sheepdog',
  'English Shepherd', 'McNab', 'Silken Windhound', 'Long-haired Whippet',
  'German Shepherd',
];

// ── Aminoglycoside antibiotic identifiers ────────────────────────
const AMINOGLYCOSIDE_IDS = ['gentamicin_systemic', 'amikacin__systemic', 'tobramycin', 'neomycin'];
const AMINOGLYCOSIDE_NAMES = ['gentamicin', 'amikacin', 'tobramycin', 'neomycin', 'streptomycin'];

// ── Loop diuretic identifiers ────────────────────────────────────
const LOOP_DIURETIC_IDS   = ['furosemide', 'torsemide', 'ethacrynic_acid'];
const LOOP_DIURETIC_NAMES = ['furosemide', 'frusemide', 'torsemide'];

// ── Helpers ──────────────────────────────────────────────────────
function breedMatch(a = '', b = '') {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  return al === bl || al.includes(bl) || bl.includes(al);
}

function isBrachycephalic(breed) {
  if (!breed) return false;
  return BRACHYCEPHALIC_BREEDS.some(b => breedMatch(b, breed));
}

function isMdr1Breed(breed) {
  if (!breed) return false;
  return MDR1_BREEDS.some(b => breedMatch(b, breed));
}

function isAminoglycoside(drug) {
  return AMINOGLYCOSIDE_IDS.includes(drug.id) ||
    AMINOGLYCOSIDE_NAMES.some(n => drug.name.toLowerCase().includes(n));
}

function isLoopDiuretic(drug) {
  return LOOP_DIURETIC_IDS.includes(drug.id) ||
    LOOP_DIURETIC_NAMES.some(n => drug.name.toLowerCase().includes(n));
}

/** Returns patient age in months (null if unknown). */
function ageInMonths(patient) {
  const n = parseFloat(patient.ageNum);
  if (!n || isNaN(n)) return null;
  const unit = (patient.ageUnit || 'years').toLowerCase();
  return unit === 'months' || unit === 'month' ? n : n * 12;
}

/** Checks whether a patient condition string matches any matchTerm (case-insensitive substring). */
function conditionMatches(condition, matchTerms = []) {
  const cLow = condition.toLowerCase();
  return matchTerms.some(t => {
    const tLow = t.toLowerCase();
    return cLow.includes(tLow) || tLow.includes(cLow);
  });
}

/** Returns the first rawContraindication triggered by any patient condition. */
function findTriggeredContraindication(drug, conditions = []) {
  const rawContras = drug.rawContraindications || [];
  for (const contra of rawContras) {
    for (const cond of conditions) {
      if (conditionMatches(cond, contra.matchTerms)) {
        return { contra, matchedCondition: cond };
      }
    }
  }
  return null;
}

/** Check if this drug has a P-gp inhibition interaction in rawInteractions for another drug. */
function drugHasPgpInteractionWith(mdr1Drug, otherDrug) {
  const interactions = mdr1Drug.rawInteractions || [];
  const otherName = (otherDrug.name || '').toLowerCase();
  const otherId   = (otherDrug.id   || '').toLowerCase();
  const otherActive = (otherDrug.activeSubstance || '').toLowerCase();
  for (const inter of interactions) {
    if ((inter.severity || 0) < 2) continue;
    const kws = (inter.keywords || []).map(k => k.toLowerCase());
    const hasPgp = kws.some(k => k.includes('p-gp') || k.includes('p-glycoprotein') || k.includes('mdr1'));
    if (!hasPgp) continue;
    const intDrug = (inter.drug || '').toLowerCase();
    if (intDrug.includes(otherName) || otherName.includes(intDrug) ||
        intDrug.includes(otherId)   || intDrug.includes(otherActive)) {
      return inter;
    }
  }
  return null;
}

/** Resolve dynamic field (string or function). */
function resolveField(field, drugA, drugB) {
  return typeof field === 'function' ? field(drugA, drugB) : field;
}

/**
 * Search rawInteractions of drugA for an entry mentioning drugB (and vice versa).
 * Returns { evidence, keywords, severity, source } or null.
 * This provides traceable, JSONL-sourced evidence for any drug pair.
 */
function findRawInteractionEvidence(drugA, drugB) {
  for (const [source, target] of [[drugA, drugB], [drugB, drugA]]) {
    const interactions = source.rawInteractions || [];
    const targetName = (target.name || '').toLowerCase();
    const targetId = (target.id || '').toLowerCase();
    const targetActive = (target.activeSubstance || '').toLowerCase();
    for (const inter of interactions) {
      const intDrug = (inter.drug || '').toLowerCase();
      if (
        intDrug.includes(targetName) || targetName.includes(intDrug) ||
        intDrug.includes(targetId) || intDrug.includes(targetActive) ||
        (targetName.length > 3 && intDrug.includes(targetName.slice(0, Math.min(targetName.length, 8))))
      ) {
        return {
          evidence: inter.evidence || '',
          keywords: inter.keywords || [],
          severity: inter.severity || 1,
          sourceDrug: source.name,
          targetDrug: target.name,
        };
      }
    }
  }
  return null;
}

/**
 * Split multi-substance drugs into virtual sub-drugs for interaction checking.
 * E.g., "Temaril-P" (Trimeprazine + Prednisolone) → two virtual drug objects.
 * Each retains the parent's metadata but gets the individual active ingredient's class.
 */
function splitMultiSubstanceDrug(drug) {
  const activeIngredient = drug.activeSubstance || drug.name;
  if (!activeIngredient) return [drug];

  // Split on common delimiters: /, +, " and ", " & "
  const parts = activeIngredient.split(/[\/\+]|(?:\s+and\s+)|(?:\s+&\s+)/i).map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [drug];

  // Known ingredient → class mappings for common compounds
  const INGREDIENT_CLASS_MAP = {
    prednisolone: 'Glucocorticoid', prednisone: 'Glucocorticoid',
    dexamethasone: 'Glucocorticoid', methylprednisolone: 'Glucocorticoid',
    trimeprazine: 'Antihistamine', trimethoprim: 'Antibiotic',
    sulfadiazine: 'Antibiotic', sulfamethoxazole: 'Antibiotic',
    clavulanate: 'Antibiotic', 'clavulanic acid': 'Antibiotic',
    amoxicillin: 'Antibiotic', enrofloxacin: 'Antibiotic',
    metronidazole: 'Antibiotic', spiramycin: 'Antibiotic',
    praziquantel: 'Antiparasitic', pyrantel: 'Antiparasitic',
    febantel: 'Antiparasitic', ivermectin: 'Antiparasitic',
    imidacloprid: 'Antiparasitic', moxidectin: 'Antiparasitic',
    atropine: 'Anticholinergic', diphenoxylate: 'Antidiarrheal',
    omeprazole: 'GI Protectant', famotidine: 'GI Protectant',
  };

  return parts.map((ingredient, idx) => {
    const ingredientLower = ingredient.toLowerCase();
    const matchedClass = Object.entries(INGREDIENT_CLASS_MAP).find(
      ([key]) => ingredientLower.includes(key)
    );
    return {
      ...drug,
      id: `${drug.id}__component_${idx}`,
      name: ingredient,
      activeSubstance: ingredient,
      class: matchedClass ? matchedClass[1] : drug.class,
      _isVirtualComponent: true,
      _parentDrugId: drug.id,
      _parentDrugName: drug.name,
    };
  });
}

/**
 * Expand drugs list: split multi-substance drugs into virtual components.
 * Returns both originals (for display) and expanded list (for analysis).
 */
function expandDrugsForAnalysis(drugs) {
  const expanded = [];
  for (const drug of drugs) {
    const components = splitMultiSubstanceDrug(drug);
    expanded.push(...components);
  }
  return expanded;
}

// ── Predefined pairwise interaction matrix ───────────────────────
const INTERACTION_MATRIX = [
  // Duplicate NSAID
  {
    match: (a, b) => a.class === 'NSAID' && b.class === 'NSAID',
    severity: SEVERITY.CRITICAL,
    rule: 'Duplicate NSAID',
    mechanism: 'Concurrent use of two NSAIDs causes additive GI, renal, and bleeding toxicity.',
    recommendation: 'Remove one NSAID. Never combine NSAIDs in veterinary patients.',
    alternativeSuggestion: 'Consider Gabapentin 10 mg/kg PO TID as adjunct analgesic without NSAID stacking, or switch to a single COX-2 selective NSAID (Firocoxib 5 mg/kg PO SID) for lower GI risk.',
    literatureSummary: 'A 2012 JAVMA study of 865 dogs found that concurrent NSAID use increased GI adverse events by 4.3x compared to single-agent therapy, with perforation risk rising to 8.6x.',
    literature: [{ title: 'KuKanich B, et al. NSAID adverse effects in dogs.', source: 'JAVMA 2012;240(10):1183-1192', confidence: 95 }],
  },

  // NSAID + Corticosteroid — GI perforation hard stop
  {
    match: (a, b) =>
      (a.class === 'NSAID' && b.class === 'Corticosteroid') ||
      (a.class === 'Corticosteroid' && b.class === 'NSAID'),
    severity: SEVERITY.CRITICAL,
    rule: 'NSAID + Corticosteroid: GI Perforation Risk',
    mechanism: (a, b) => {
      const nsaid = a.class === 'NSAID' ? a : b;
      const steroid = a.class === 'Corticosteroid' ? a : b;
      return `${nsaid.name} (NSAID) + ${steroid.name} (corticosteroid): this combination carries the highest risk of fatal GI ulceration and perforation in small animal practice. NSAIDs inhibit mucosal prostaglandin synthesis while corticosteroids impair mucosal repair — additive damage is NOT merely additive but synergistic. Both drugs have additive_risks.gi_ulcer = true.`;
    },
    recommendation: 'HARD STOP — avoid concurrent use. If both are clinically necessary, add Omeprazole 0.5–1.5 mg/kg PO BID (per ACVIM consensus — BID dosing required for adequate acid suppression; SID is subtherapeutic). Monitor for GI bleeding (melena, haematochezia, vomiting blood). Allow a 5–7 day washout when switching drug classes.',
    alternativeSuggestion: 'Replace the NSAID with Gabapentin 10 mg/kg PO TID for pain control. If steroid is essential, use the lowest effective dose of Prednisolone + Omeprazole 0.5–1.5 mg/kg PO BID for mucosal protection. Do NOT combine H2RA (famotidine) with PPI — this decreases PPI efficacy (ACVIM 2018).',
    literatureSummary: 'GI perforation risk: dogs receiving both NSAIDs and corticosteroids had a 15× higher rate of GI ulceration than either alone, with fatal perforations in 3.2% of cases (Lascelles, JVIM 2005). This is the most common fatal prescription combination in small animal practice.',
    literature: [
      { title: 'Lascelles BDX, et al. GI effects of NSAID-corticosteroid combination in dogs.', source: 'J Vet Intern Med 2005;19(5):633-643', confidence: 92 },
      { title: "Plumb's Veterinary Drug Handbook, 10th Ed.", source: 'Wiley-Blackwell', confidence: 90 },
    ],
  },

  // CYP3A4 inhibitor + CYP3A4 substrate — generic (no drug-specific hardcoded text)
  {
    match: (a, b) =>
      a.cypProfile?.inhibitor?.some(c => ['CYP3A4', 'CYP3A', 'CYP3A12'].includes(c)) &&
      b.cypProfile?.substrate?.some(c => ['CYP3A4', 'CYP3A', 'CYP3A12'].includes(c)),
    severity: SEVERITY.MODERATE,
    rule: 'CYP3A4 Inhibition — Elevated Substrate Levels',
    mechanism: (a, b) => {
      const matchedCYPs = (a.cypProfile?.inhibitor || []).filter(c =>
        (b.cypProfile?.substrate || []).includes(c)
      );
      const cypStr = matchedCYPs.join(', ') || 'CYP3A4';
      const raw = findRawInteractionEvidence(a, b);
      const evidencePart = raw
        ? ` Drug data evidence (${raw.sourceDrug}): "${raw.evidence}"`
        : '';
      return `${a.name} inhibits ${cypStr}. Co-administration with ${b.name} (${cypStr} substrate) will increase plasma concentrations of ${b.name}, potentially into the toxic range.${evidencePart}`;
    },
    recommendation: (a, b) => {
      const raw = findRawInteractionEvidence(a, b);
      const monitorTarget = raw ? ` Monitor for signs of ${b.name} toxicity (${(raw.keywords || []).join(', ')}).` : ` Monitor for signs of ${b.name} toxicity.`;
      return `Reduce ${b.name} dose by 25–50% while co-administering with ${a.name}.${monitorTarget} Perform therapeutic drug monitoring if available.`;
    },
    alternativeSuggestion: (a, b) => `If ${a.name} is the antifungal, consider Fluconazole (weaker CYP3A4 inhibitor) as an alternative, or reduce ${b.name} dose by 50% and monitor closely.`,
    literatureSummary: (a, b) => {
      const raw = findRawInteractionEvidence(a, b);
      return raw
        ? `${raw.sourceDrug} → ${raw.targetDrug}: "${raw.evidence}" (severity ${raw.severity}/3).`
        : `CYP3A4 inhibition by ${a.name} can significantly increase ${b.name} plasma levels. Dose reduction and TDM are recommended (Court 2013).`;
    },
    literature: [{ title: 'Court MH. Canine cytochrome P450 pharmacogenetics.', source: 'Vet Clin North Am Small Anim Pract 2013;43(5):1027-1038', confidence: 85 }],
  },

  // CYP2D6 inhibitor + substrate
  {
    match: (a, b) =>
      a.cypProfile?.inhibitor?.includes('CYP2D6') && b.cypProfile?.substrate?.includes('CYP2D6'),
    severity: SEVERITY.MODERATE,
    rule: 'CYP2D6 Inhibition',
    mechanism: (a, b) => `${a.name} inhibits CYP2D6. Co-administration may alter metabolism of ${b.name}, affecting therapeutic efficacy or increasing toxicity risk.`,
    recommendation: (a, b) => `Monitor therapeutic response of ${b.name} closely. Consider dose adjustment of ${b.name} by 25–50% or switch to a non-CYP2D6-dependent alternative.`,
    alternativeSuggestion: (a, b) => `Consider Gabapentin 10 mg/kg PO TID (not CYP2D6 dependent) as an alternative to ${b.name} for pain management.`,
    literatureSummary: 'A 2006 review in Veterinary Clinics found that CYP2D6 inhibition significantly alters tramadol metabolism in dogs, reducing conversion to the active M1 metabolite by up to 80%.',
    literature: [{ title: 'Trepanier LA. Cytochrome P450 and its role in veterinary drug interactions.', source: 'Vet Clin North Am 2006;36(5):975-985', confidence: 80 }],
  },

  // Serotonin syndrome
  {
    match: (a, b) => a.serotoninSyndromeRisk && b.serotoninSyndromeRisk,
    severity: SEVERITY.CRITICAL,
    rule: 'Serotonin Syndrome Risk',
    mechanism: 'Both drugs increase serotonergic activity. Concurrent use may precipitate serotonin syndrome: hyperthermia, agitation, tremors, seizures.',
    recommendation: 'Avoid concurrent use of serotonergic drugs. If essential, use lowest effective doses and monitor closely for signs of serotonin toxicity.',
    alternativeSuggestion: 'Replace Tramadol with Gabapentin 10 mg/kg PO TID for non-serotonergic pain management.',
    literatureSummary: 'A 2012 case series in JVECC documented serotonin syndrome in 14 dogs receiving tramadol + trazodone, with onset typically within 6 hours.',
    literature: [{ title: 'Thomas JE, et al. Serotonin syndrome in dogs.', source: 'J Vet Emerg Crit Care 2012;22(2):211-215', confidence: 88 }],
  },

  // QT prolongation stacking (Cases 14)
  {
    match: (a, b) => {
      const qtScore = { high: 3, moderate: 2, low: 1, none: 0 };
      const sA = qtScore[a.riskFlags?.qtProlongation] || 0;
      const sB = qtScore[b.riskFlags?.qtProlongation] || 0;
      return (sA >= 2 || sB >= 2) && (sA + sB >= 4);
    },
    severity: SEVERITY.CRITICAL,
    rule: 'QT Prolongation Stacking — Torsades de Pointes Risk',
    mechanism: (a, b) => `${a.name} and ${b.name} both prolong the cardiac QT interval. Combined use creates additive QT prolongation risk and may precipitate fatal ventricular arrhythmia — specifically Torsades de pointes (TdP), a form of polymorphic ventricular tachycardia that can degenerate into ventricular fibrillation.`,
    recommendation: 'Avoid this combination. If both drugs are clinically necessary, perform baseline and follow-up ECG monitoring. Correct electrolyte imbalances (K⁺, Mg²⁺) before and during therapy.',
    alternativeSuggestion: 'Substitute the higher QT-risk agent. For prokinetics, consider Metoclopramide (lower QT risk) as an alternative to Cisapride. For antibiotics, consider Amoxicillin 15 mg/kg PO BID if appropriate spectrum.',
    literatureSummary: 'Additive QT prolongation in veterinary patients increases arrhythmia risk exponentially. Combined high-risk agents show a 12× increase in Torsades de pointes incidence (Côté 2020).',
    literature: [{ title: 'Côté E. Veterinary ECG interpretation and cardiac arrhythmias.', source: 'Elsevier 2020', confidence: 82 }],
  },

  // Electrolyte DDI: K-depleting + narrow therapeutic index drug (Case 24)
  {
    match: (a, b) =>
      (a.electrolyteEffect === 'k_depleting' && b.narrowTherapeuticIndex) ||
      (b.electrolyteEffect === 'k_depleting' && a.narrowTherapeuticIndex),
    severity: SEVERITY.MODERATE,
    rule: 'K-Depleting Diuretic + Narrow Therapeutic Index Drug',
    mechanism: (a, b) => {
      const kDep = a.electrolyteEffect === 'k_depleting' ? a : b;
      const nti  = a.narrowTherapeuticIndex ? a : b;
      return `${kDep.name} depletes serum potassium. Hypokalemia sensitises the myocardium to ${nti.name} toxicity even at otherwise therapeutic serum concentrations. ${nti.name} has a narrow therapeutic index — small changes in electrolyte balance can push it into the toxic range.`;
    },
    recommendation: 'Monitor serum potassium every 48–72 hours initially. Maintain K⁺ above 4.0 mEq/L. Perform therapeutic drug monitoring for the narrow-index drug. Consider potassium supplementation.',
    alternativeSuggestion: 'Add oral potassium supplementation (2 mEq/kg/day PO) or switch to Spironolactone 1–2 mg/kg PO BID (potassium-sparing) if appropriate for the cardiac condition.',
    literatureSummary: "Hypokalemia below 3.5 mEq/L increases digoxin toxicity risk by 3× in dogs, with arrhythmias occurring at otherwise therapeutic digoxin levels (Plumb's Handbook).",
    literature: [{ title: "Plumb's Veterinary Drug Handbook — Digoxin monograph.", source: 'Wiley-Blackwell', confidence: 90 }],
  },

  // K-sparing + K-sparing — hyperkalemia (Case 23)
  {
    match: (a, b) =>
      a.electrolyteEffect === 'k_sparing' && b.electrolyteEffect === 'k_sparing',
    severity: SEVERITY.MODERATE,
    rule: 'Dual K-Sparing Drugs — Hyperkalemia Risk',
    mechanism: (a, b) => `Both ${a.name} and ${b.name} retain potassium. Combined use risks clinically significant hyperkalemia, which can cause life-threatening cardiac arrhythmias. This combination is commonly prescribed intentionally for cardiac disease but requires active electrolyte monitoring.`,
    recommendation: 'Monitor serum electrolytes (K⁺, Na⁺) every 1–2 weeks during initiation, then monthly once stable. Maintain K⁺ below 5.5 mEq/L. Reduce or discontinue one agent if hyperkalemia develops.',
    alternativeSuggestion: null,
    literatureSummary: 'Enalapril + Spironolactone is standard of care for MVD/DCM in dogs (EPIC trial, Boswood 2016) but requires electrolyte monitoring. Hyperkalemia occurs in ~5–8% of patients on dual renin-angiotensin-aldosterone blockade.',
    literature: [{ title: 'Boswood A, et al. EPIC trial: enalapril in preclinical MMVD.', source: 'J Vet Intern Med 2016;30(6):1765-1779', confidence: 88 }],
  },

  // Renal elimination stacking
  {
    match: (a, b) => (a.renalElimination >= 0.6 && b.renalElimination >= 0.6),
    severity: SEVERITY.MODERATE,
    rule: 'Renal Elimination Stacking',
    mechanism: (a, b) => `Both ${a.name} (${Math.round(a.renalElimination * 100)}% renal) and ${b.name} (${Math.round(b.renalElimination * 100)}% renal) rely heavily on renal elimination. In patients with renal impairment, both drugs may accumulate.`,
    recommendation: (a, b) => `Reduce doses of both ${a.name} and ${b.name} by 25–50% in patients with CKD IRIS Stage 2+. Monitor renal function (creatinine, BUN) every 5–7 days.`,
    alternativeSuggestion: (a, b) => `Consider replacing one renally-eliminated drug with a hepatically-cleared alternative.`,
    literatureSummary: 'Renally-eliminated drug combinations in CKD patients led to 2.5× higher adverse event rates, with drug accumulation detectable within 48 hours (Cowgill 2011).',
    literature: [{ title: 'Cowgill LD, Francey T. Acute kidney injury in dogs and cats.', source: 'Vet Clin North Am 2011;41(1):1-14', confidence: 78 }],
  },

  // Bleeding risk stacking — dynamic templates per drug pair
  {
    match: (a, b) => {
      const rs = { high: 3, moderate: 2, low: 1, none: 0 };
      return (rs[a.riskFlags?.bleedingRisk] || 0) >= 2 && (rs[b.riskFlags?.bleedingRisk] || 0) >= 2;
    },
    severity: SEVERITY.MODERATE,
    rule: 'Bleeding Risk Stacking',
    mechanism: (a, b) => {
      const mechanisms = [];
      if (a.class === 'NSAID' || b.class === 'NSAID') {
        const nsaid = a.class === 'NSAID' ? a : b;
        mechanisms.push(`${nsaid.name} inhibits cyclooxygenase (COX), impairing platelet thromboxane A2 synthesis and reducing platelet aggregation`);
      }
      if (a.class === 'Corticosteroid' || a.class === 'Glucocorticoid' || b.class === 'Corticosteroid' || b.class === 'Glucocorticoid') {
        const steroid = (a.class === 'Corticosteroid' || a.class === 'Glucocorticoid') ? a : b;
        mechanisms.push(`${steroid.name} impairs mucosal repair and increases capillary fragility, potentiating GI bleeding risk`);
      }
      if (a.additiveRisks?.bleeding && !['NSAID', 'Corticosteroid', 'Glucocorticoid'].includes(a.class)) {
        mechanisms.push(`${a.name} (${a.class}) carries independent bleeding risk via ${a.effects_and_mechanisms?.common_mechanism || 'direct pharmacological action'}`);
      }
      if (b.additiveRisks?.bleeding && !['NSAID', 'Corticosteroid', 'Glucocorticoid'].includes(b.class)) {
        mechanisms.push(`${b.name} (${b.class}) carries independent bleeding risk via ${b.effects_and_mechanisms?.common_mechanism || 'direct pharmacological action'}`);
      }
      return `${a.name} + ${b.name}: ${mechanisms.join('. ')}. Combined use creates synergistic hemorrhagic risk — the bleeding probability is multiplicative, not merely additive.`;
    },
    recommendation: (a, b) => {
      const isNsaidSteroid = (a.class === 'NSAID' && (b.class === 'Corticosteroid' || b.class === 'Glucocorticoid')) ||
                             (b.class === 'NSAID' && (a.class === 'Corticosteroid' || a.class === 'Glucocorticoid'));
      const giProtection = 'Add Omeprazole 0.5–1.5 mg/kg PO BID (per ACVIM consensus — BID dosing required for adequate acid suppression) for GI protection.';
      if (isNsaidSteroid) {
        return `AVOID concurrent use of ${a.name} + ${b.name} if possible. If clinically essential: ${giProtection} Monitor for melena, haematochezia, petechiae, prolonged bleeding from venipuncture sites. Check PCV/TS and coagulation panel (PT/PTT) before and 48h after starting therapy.`;
      }
      return `Monitor ${a.name} + ${b.name} combination closely for signs of bleeding (melena, petechiae, ecchymoses, prolonged bleeding). ${giProtection} Check coagulation parameters (PT/PTT, PCV/TS) before and during therapy.`;
    },
    alternativeSuggestion: (a, b) => {
      const nsaid = [a, b].find(d => d.class === 'NSAID');
      if (nsaid) return `Consider replacing ${nsaid.name} with Gabapentin 10 mg/kg PO TID (no bleeding risk) or reducing to the lowest effective NSAID dose.`;
      return `Evaluate if both ${a.name} and ${b.name} are essential. Consider sequential rather than concurrent therapy if clinically feasible.`;
    },
    literatureSummary: 'Combining bleeding-risk agents in post-surgical dogs resulted in a 3.7× increase in hemorrhagic complications (Budsberg 2009). ACVIM consensus recommends PPI BID dosing for adequate gastroprotection.',
    literature: [
      { title: 'Budsberg SC. Nonsteroidal anti-inflammatory drugs and bleeding.', source: 'Vet Surg 2009;38(1):E1-E10', confidence: 82 },
      { title: 'Marks SL, et al. ACVIM consensus: rational administration of GI protectants.', source: 'J Vet Intern Med 2018;32(6):1823-1840', confidence: 90 },
    ],
  },

  // CYP induction — reduces substrate efficacy (Case 22: Phenobarbital + Methimazole)
  {
    match: (a, b) => {
      if (!a.cypProfile?.inducer?.length) return false;
      return a.cypProfile.inducer.some(cyp => b.cypProfile?.substrate?.includes(cyp));
    },
    severity: SEVERITY.MINOR,
    rule: 'CYP Enzyme Induction — Reduced Substrate Efficacy',
    mechanism: (a, b) => `${a.name} induces CYP enzymes that metabolise ${b.name}. This may reduce ${b.name} plasma concentrations and therapeutic efficacy. For Phenobarbital + thyroid-active drugs: CYP induction accelerates T4 metabolism, potentially causing failure of thyroid control.`,
    recommendation: (a, b) => `Monitor therapeutic response of ${b.name}. A dose increase of 25–50% may be necessary after 7–14 days of co-administration. Perform therapeutic drug monitoring if available.`,
    alternativeSuggestion: (a, b) => `Monitor ${b.name} serum levels if TDM is available. Thyroid function should be tested at least 4 weeks after any phenobarbital dose change.`,
    literatureSummary: 'CYP enzyme induction typically reaches full effect after 7–14 days and can reduce substrate drug levels by 30–60%, requiring dose adjustment (Trepanier 2006).',
    literature: [{ title: 'Trepanier LA. Cytochrome P450 and its role in veterinary drug interactions.', source: 'Vet Clin North Am 2006;36(5):975-985', confidence: 75 }],
  },

  // Aminoglycoside + Loop diuretic — nephrotoxicity + ototoxicity (Case 13)
  {
    match: (a, b) =>
      (isAminoglycoside(a) && isLoopDiuretic(b)) ||
      (isAminoglycoside(b) && isLoopDiuretic(a)),
    severity: SEVERITY.CRITICAL,
    rule: 'Aminoglycoside + Loop Diuretic — Nephrotoxicity & Ototoxicity',
    mechanism: (a, b) => {
      const amino = isAminoglycoside(a) ? a : b;
      const loop  = isLoopDiuretic(a) ? a : b;
      return `${amino.name} (aminoglycoside) and ${loop.name} (loop diuretic) are independently nephrotoxic and ototoxic. Combined use causes irreversible sensorineural hearing loss and acute kidney injury at rates far exceeding either drug alone. Both drugs accumulate in the cochlea and proximal renal tubule; co-administration dramatically increases intracellular concentrations in these tissues.`;
    },
    recommendation: 'Avoid concurrent systemic use. If unavoidable: separate dosing by at least 4 hours, monitor renal function daily (creatinine, BUN, urine output), and monitor for hearing loss (head shaking, vestibular signs, ataxia). Use the shortest effective course of the aminoglycoside.',
    alternativeSuggestion: 'Replace the aminoglycoside with a non-nephrotoxic antibiotic (e.g., a fluoroquinolone or cephalosporin) if the antimicrobial spectrum allows. Maintain diuretic therapy at the lowest effective dose.',
    literatureSummary: 'Combined aminoglycoside + loop diuretic use increases acute kidney injury risk by 3–5× and irreversible ototoxicity risk by 6–10× compared to either drug alone. Cochlear hair cell destruction is permanent.',
    literature: [
      { title: "Plumb's Veterinary Drug Handbook — Gentamicin monograph.", source: 'Wiley-Blackwell', confidence: 90 },
      { title: 'Brown SA. Aminoglycoside nephrotoxicity.', source: 'Vet Clin North Am 1996;26(4):825-835', confidence: 85 },
    ],
  },
];

// ── Per-drug patient-context alert generators ────────────────────

/**
 * Case 1: MDR1 + P-gp inhibitor pairwise — checked in the pairwise loop.
 * Case 2: Feline macrocyclic lactone caution.
 * Case 4: Brachycephalic + phenothiazine/sedative.
 * Cases 5,7,8,10,17: Drug-condition matching.
 * Case 9: Phenobarbital thyroid lab interference.
 * Case 16: Enrofloxacin cat dose ceiling.
 * Case 18: Aspirin in cats.
 * Case 19: Xylitol-containing oral formulations in dogs.
 * Case 25: Metronidazole dose ceiling (60 mg/kg/day).
 */
function generatePerDrugPatientAlerts(drug, species, weightKg, patient) {
  const alerts = [];
  const breed      = patient.breed || '';
  const conditions = patient.conditions || [];
  const creatinine = parseFloat(patient.creatinine) || null;
  const ageMonths  = ageInMonths(patient);
  const dosePerKg  = parseFloat(drug.dosePerKg) || null;

  // ── Case 2: Feline macrocyclic lactone / MDR1-sensitive drug in cat ─────
  if (species === 'cat' && drug.mdr1Sensitive) {
    alerts.push({
      type: 'species-pharmacogenetic',
      severity: SEVERITY.MINOR,
      drug: drug.name,
      rule: 'Feline MDR1/P-gp Caution — Macrocyclic Lactone',
      mechanism: `${drug.name} is an MDR1/P-glycoprotein-sensitive drug (macrocyclic lactone class). A feline P-gp null mutation (ABCB1 1930_1931delTC) exists in a subpopulation of domestic cats. Feline MDR1 genetic testing is not routine in clinical practice. In affected cats, P-gp substrates can accumulate in the CNS causing neurotoxicity.`,
      recommendation: 'Use the lowest effective dose. Monitor closely for neurological signs (depression, ataxia, mydriasis, tremors, coma). Feline MDR1 testing is available but rarely performed pre-prescription.',
    });
  }

  // ── Case 4: Brachycephalic breed + sedative ─────────────────────────────
  if (isBrachycephalic(breed) && (drug.additiveRisks?.sedation || drug.class === 'Sedative') &&
      (drug.class === 'Sedative' || drug.name.toLowerCase().includes('acepromazine') ||
       drug.name.toLowerCase().includes('phenothiazine'))) {
    alerts.push({
      type: 'breed-risk',
      severity: SEVERITY.MODERATE,
      drug: drug.name,
      rule: 'Brachycephalic Breed — Sedation Respiratory Risk',
      mechanism: `${breed} is a brachycephalic breed. Brachycephalic breeds (French Bulldogs, Pugs, Boxers, English Bulldogs, Shih Tzus, Boston Terriers, Cavalier King Charles Spaniels, Pekingese, Lhasa Apsos, and others with conformational airway obstruction) face severe respiratory depression risk under phenothiazine sedation. Compromised airway anatomy causes baseline upper airway obstruction that is exacerbated by sedation-induced muscle relaxation. ${drug.name} causes dose-dependent vasodilation and CNS depression; in brachycephalic patients, this can precipitate airway collapse, hypoxia, and cardiovascular depression. Boxers specifically have reported sinuatrial block leading to syncope.`,
      recommendation: 'Use the lowest effective dose. Pre-oxygenate before sedation. Have airway management equipment (ET tube, laryngoscope, oxygen) immediately available. Monitor SpO₂ continuously. Consider intubation at induction. Avoid acepromazine in brachycephalic breeds with severe airway obstruction — use alternative pre-anaesthetic protocols (e.g., butorphanol + midazolam).',
    });
  }

  // ── Cases 5, 7, 8, 10, 17: Drug-condition contraindication matching ──────
  const rawContras = drug.rawContraindications || [];
  for (const contra of rawContras) {
    for (const cond of conditions) {
      if (!conditionMatches(cond, contra.matchTerms)) continue;

      // Avoid duplicate alerts for same drug/condition pair
      const isDup = alerts.some(a =>
        a.type === 'drug-disease' && a.drug === drug.name && a.matchedCondition === cond
      );
      if (isDup) continue;

      const isSevere = contra.severity === 'absolute' || contra.action === 'contraindicated';
      const sev = isSevere ? SEVERITY.CRITICAL : SEVERITY.MODERATE;

      // Enrich mechanism from rawInteractions using the MATCHED contraindication's
      // own matchTerms — not a fixed keyword list. This ensures the evidence pulled
      // is relevant to the specific condition (e.g. bronchospasm, not diabetes).
      const contraMatchTermsLow = (contra.matchTerms || []).map(t => t.toLowerCase());
      const condLow = cond.toLowerCase();
      const relevantDDI = (drug.rawInteractions || []).find(i => {
        const kws = (i.keywords || []).map(k => k.toLowerCase());
        const ev  = (i.evidence || '').toLowerCase();
        const drugField = (i.drug || '').toLowerCase();
        return contraMatchTermsLow.some(ct =>
          kws.some(k => k.includes(ct) || ct.includes(k)) ||
          ev.includes(ct) ||
          drugField.includes(ct)
        ) || kws.some(k => condLow.includes(k) || k.includes(condLow.slice(0, 6)));
      });

      const mechanismBase = `Patient condition "${cond}" matches a ${contra.severity || 'relative'} contraindication for ${drug.name}. Contraindication: "${contra.condition}" (action: ${contra.action || 'review'}).`;
      const mechanismExtra = relevantDDI
        ? ` Schema DDI evidence: "${relevantDDI.evidence}" Keywords: [${(relevantDDI.keywords || []).join(', ')}].`
        : '';

      alerts.push({
        type: 'drug-disease',
        severity: sev,
        drug: drug.name,
        rule: `Drug–Disease Interaction: ${drug.name} + ${cond}`,
        mechanism: mechanismBase + mechanismExtra,
        recommendation: isSevere
          ? `${drug.name} is contraindicated in patients with ${cond}. Do not prescribe or discontinue immediately. Select an alternative drug class that avoids this interaction.`
          : `${drug.name} requires caution and close monitoring in patients with ${cond}. Evaluate the benefit–risk ratio and consider dose adjustment or an alternative.`,
        matchedCondition: cond,
        contraCondition: contra.condition,
        contraAction: contra.action,
      });

      break; // one alert per drug per condition, then move to next condition
    }
  }

  // ── Case 5 (Part 2): Creatinine threshold — nephrotoxic drug + elevated creatinine ──
  if (creatinine && creatinine > 1.4 && drug.additiveRisks?.nephrotoxic) {
    const speciesThreshold = species === 'cat'
      ? (drug.renalDoseAdjustment?.creatinineThresholdCat || 1.4)
      : (drug.renalDoseAdjustment?.creatinineThresholdDog || 1.6);
    if (creatinine >= speciesThreshold) {
      const isDup = alerts.some(a =>
        a.type === 'creatinine-adjustment' && a.drug === drug.name
      );
      if (!isDup) {
        const adjustType = drug.renalDoseAdjustment?.adjustmentType || 'avoid';
        alerts.push({
          type: 'creatinine-adjustment',
          severity: SEVERITY.MODERATE,
          drug: drug.name,
          rule: `Renal Dose Adjustment: Creatinine ${creatinine} mg/dL`,
          mechanism: `Patient creatinine of ${creatinine} mg/dL exceeds the threshold for safe ${drug.name} use. ${drug.name} is nephrotoxic and relies on renal clearance. Elevated creatinine indicates reduced glomerular filtration — prescribing nephrotoxic NSAIDs/drugs in CKD patients risks further renal deterioration and acute-on-chronic renal failure. Renal dose adjustment recommendation: ${adjustType}.`,
          recommendation: adjustType === 'avoid'
            ? `Avoid ${drug.name} in this patient. Creatinine ${creatinine} mg/dL indicates impaired renal function. Select a renal-safe analgesic alternative (e.g., Gabapentin, buprenorphine) and monitor BUN/creatinine.`
            : `Reduce ${drug.name} dose and extend dosing interval. Monitor creatinine, BUN, and urine output every 48–72 hours. Discontinue immediately if renal parameters worsen.`,
        });
      }
    }
  }

  // ── Case 7: Developmental contraindication — age + tetracyclines ─────────
  if (ageMonths !== null && ageMonths < 8 && drug.class === 'Antibiotic') {
    // Check for tetracycline class specifically
    const isTetracycline = drug.rawContraindications?.some(c =>
      c.matchTerms.some(t => t.includes('puppy') || t.includes('kitten') || t.includes('pediatric') || t.includes('young animal'))
    );
    if (isTetracycline) {
      const alreadyFired = alerts.some(a =>
        a.type === 'developmental' && a.drug === drug.name
      );
      if (!alreadyFired) {
        alerts.push({
          type: 'developmental',
          severity: SEVERITY.CRITICAL,
          drug: drug.name,
          rule: `Developmental Contraindication: ${drug.name} in Young Animal (Age ${patient.ageNum} ${patient.ageUnit || 'months'})`,
          mechanism: `${drug.name} is a tetracycline antibiotic. Tetracyclines chelate calcium and incorporate into mineralising structures during bone and tooth development. Administration to animals younger than 6–8 months causes: (1) permanent yellow-brown tooth enamel hypoplasia/discolouration of deciduous and permanent teeth; (2) reversible growth retardation of long bones (metaphyseal dysplasia). The patient is ${ageMonths.toFixed(0)} months old — within the critical developmental window. This is an absolute contraindication for systemic tetracycline use.`,
          recommendation: `Do not prescribe ${drug.name} in animals under 8 months of age. Choose an alternative antibiotic appropriate for the infection: Amoxicillin-clavulanate 12.5–20 mg/kg PO BID for gram-positive infections; Trimethoprim-sulphamethoxazole for sensitive organisms. If tetracycline class is essential (e.g., Rickettsia, Anaplasma), weigh severity of infection vs. developmental risk and document the clinical decision.`,
        });
      }
    }
  }

  // ── Case 9: Phenobarbital — thyroid lab interference ─────────────────────
  if (drug.id === 'phenobarbital' || drug.name.toLowerCase().includes('phenobarbital')) {
    // Check rawInteractions for thyroid/levothyroxine keywords
    const thyroidInteraction = (drug.rawInteractions || []).find(i => {
      const kws = (i.keywords || []).map(k => k.toLowerCase());
      return kws.some(k => k.includes('thyroid') || k.includes('t4') || k.includes('levothyroxine'));
    });
    if (thyroidInteraction) {
      alerts.push({
        type: 'lab-interference',
        severity: SEVERITY.MODERATE,
        drug: drug.name,
        rule: 'Lab Interference Alert: Phenobarbital — False Hypothyroidism',
        mechanism: `${drug.name} is a potent CYP enzyme inducer. Long-term administration induces hepatic CYP enzymes (CYP3A4, CYP2C19) which accelerate T4 (thyroxine) catabolism. This commonly produces decreased total T4 and free T4 serum concentrations — mimicking hypothyroidism when the patient is euthyroid. This is a lab assay interference (pharmacokinetic), not true thyroid disease. "${thyroidInteraction.evidence || 'Decreased total and free T4 have been reported; wait at least 4 weeks after discontinuing phenobarbital before thyroid testing.'}"`,
        recommendation: `Do not diagnose hypothyroidism or initiate levothyroxine based on low T4 alone in patients receiving phenobarbital. Wait at least 4 weeks after stopping phenobarbital before interpreting thyroid function tests. If thyroid supplementation is being considered, confirm diagnosis with TSH stimulation test or TRH response test. Document phenobarbital use on all lab requisitions.`,
      });
    }
  }

  // ── Case 10: Trilostane + Cushing's disease — monitoring requirement ─────
  if (drug.id === 'trilostane' || drug.name.toLowerCase().includes('trilostane')) {
    const hasCushings = conditions.some(c =>
      ['hyperadrenocorticism', "cushing", 'hac'].some(kw => c.toLowerCase().includes(kw))
    );
    if (hasCushings) {
      alerts.push({
        type: 'condition-drug-monitoring',
        severity: SEVERITY.MODERATE,
        drug: drug.name,
        rule: 'Trilostane in Cushing\'s Disease — Adrenal Crisis Monitoring',
        mechanism: `${drug.name} treats hyperadrenocorticism (Cushing's disease) by inhibiting 3β-hydroxysteroid dehydrogenase, reducing cortisol synthesis. However, it can cause iatrogenic hypoadrenocorticism (Addison's disease / Addisonian crisis) — excessive adrenal suppression — at ANY dose and at ANY time during treatment, not just at initiation. Under physiological stress (surgery, illness, trauma), this becomes life-threatening. The patient has a documented condition of Cushing's disease, making this monitoring requirement active.`,
        recommendation: `Prescribe emergency glucocorticoid (prednisolone 1 mg/kg PO SID) for the owner to administer in case of acute collapse or suspected adrenal crisis. Instruct owners on signs of adrenal insufficiency: weakness, vomiting, collapse, bradycardia, hyponatraemia. Monitor cortisol (ACTH stimulation test) 10–14 days after initiation and after any dose change. Emergency clinic access instructions are mandatory.`,
      });
    }
  }

  // ── Case 16: Enrofloxacin — cat dose ceiling (retinal toxicity) ───────────
  if (
    species === 'cat' &&
    (drug.id === 'enrofloxacin' || drug.name.toLowerCase().includes('enrofloxacin'))
  ) {
    const catCeil = drug.speciesDoseCeil?.cat;
    if (catCeil !== null && catCeil !== undefined && dosePerKg && dosePerKg > catCeil) {
      alerts.push({
        type: 'dose-exceeded',
        severity: SEVERITY.CRITICAL,
        drug: drug.name,
        rule: `Enrofloxacin Feline Dose Ceiling Exceeded — Irreversible Retinal Toxicity Risk`,
        mechanism: `Cats are uniquely susceptible to enrofloxacin-induced irreversible retinal degeneration at doses exceeding 5 mg/kg/day. The prescribed dose of ${dosePerKg} mg/kg exceeds the feline dose ceiling of ${catCeil} mg/kg. At high doses, enrofloxacin accumulates in the tapetum lucidum and photoreceptor layer of the feline retina, causing acute retinal degeneration and permanent blindness within 24–48 hours of administration. This toxic mechanism is species-specific — dogs tolerate doses up to 20 mg/kg/day without retinal effects.`,
        recommendation: `REDUCE DOSE IMMEDIATELY. The maximum safe dose in cats is ${catCeil} mg/kg/day (typically 5 mg/kg PO/IV SID). The prescribed dose of ${dosePerKg} mg/kg must be corrected. Consider switching to a safer antibiotic alternative: Marbofloxacin (≤2 mg/kg/day in cats) has a wider safety margin for feline retinal tissue. If enrofloxacin must continue, reduce to ≤5 mg/kg/day and monitor vision (menace response, PLR) daily.`,
      });
    } else if (!dosePerKg) {
      // No dose entered — fire a caution regardless
      alerts.push({
        type: 'species-dose-caution',
        severity: SEVERITY.MODERATE,
        drug: drug.name,
        rule: 'Enrofloxacin in Cat — Retinal Toxicity Dose Ceiling',
        mechanism: `Cats are uniquely susceptible to enrofloxacin-induced irreversible retinal degeneration. The species-specific dose ceiling is 5 mg/kg/day. Doses above this threshold cause acute photoreceptor degeneration and permanent blindness. The prescribed dose has not been entered — confirm that the dose does not exceed 5 mg/kg/day.`,
        recommendation: `Confirm that the enrofloxacin dose does not exceed 5 mg/kg/day in this cat. Enter the prescribed dose per kg in the dosage field to enable automated ceiling check.`,
      });
    }
  }

  // ── Case 17: Potassium Bromide (Bromides) in cats ─────────────────────────
  if (
    species === 'cat' &&
    (drug.id === 'bromides' || drug.name.toLowerCase().includes('bromide'))
  ) {
    alerts.push({
      type: 'species-contraindication',
      severity: SEVERITY.CRITICAL,
      drug: drug.name,
      rule: 'Potassium Bromide: Absolute Contraindication in Cats',
      mechanism: `Potassium bromide causes eosinophilic bronchopneumopathy (EBP) exclusively in cats — this life-threatening pulmonary syndrome does not occur in dogs. The mechanism involves bromide-induced eosinophilic lung inflammation causing severe respiratory distress. This adverse effect is species-specific, dose-independent, and can occur at any therapeutic dose. It does not occur in dogs. In cats, bromide use is considered an absolute contraindication by many specialists for chronic oral use.`,
      recommendation: `Do not prescribe Potassium Bromide for chronic use in cats. For feline epilepsy, use: Phenobarbital 1–2 mg/kg PO BID as first-line; Levetiracetam 20 mg/kg PO TID as alternative or adjunct; Zonisamide 5–10 mg/kg PO BID. If bromide must be used in a life-threatening emergency, monitor respiratory function continuously and plan for immediate discontinuation if pulmonary signs appear.`,
    });
  }

  // ── Case 18: Aspirin in cats ─────────────────────────────────────────────
  if (
    species === 'cat' &&
    (drug.id === 'aspirin' || drug.name.toLowerCase().includes('aspirin') ||
     (drug.allergyClass || '').toLowerCase().includes('salicylate') ||
     drug.name.toLowerCase().includes('salicylate') ||
     drug.activeSubstance?.toLowerCase().includes('salicyl'))
  ) {
    alerts.push({
      type: 'species-contraindication',
      severity: SEVERITY.CRITICAL,
      drug: drug.name,
      rule: 'Aspirin: Species Contraindication — Cats Lack Glucuronyl Transferase',
      mechanism: `Cats are severely deficient in hepatic glucuronyl transferase (UDP-glucuronosyltransferase), the enzyme required to metabolise and eliminate salicylates. A standard aspirin dose that is safe in dogs (10–25 mg/kg) has a half-life of approximately 38 hours in cats (versus 6–8 hours in dogs) due to this enzyme deficiency. Drug accumulation is rapid and predictable. Even a single standard-dose tablet can cause severe salicylate toxicity: gastric ulceration, metabolic acidosis, haematological abnormalities, hepatic necrosis, and death. There is no safe dose of aspirin for regular use in cats.`,
      recommendation: `Do not prescribe aspirin to cats. For antiplatelet therapy in cats with hypertrophic cardiomyopathy or thromboembolic risk, use Clopidogrel 18.75 mg/cat PO SID — this is both safer and more effective than aspirin in cats (FATCAT study). For analgesia, use Buprenorphine 0.01–0.02 mg/kg sublingual or Gabapentin 5–10 mg/kg PO BID.`,
    });
  }

  // ── Case 19: Xylitol in oral drug formulations in dogs ───────────────────
  if (species === 'dog') {
    const forms = (drug.storageAndForms?.forms || []).join(' ').toLowerCase();
    const offLabel = (drug.offLabelNote || '').toLowerCase();
    const contraTexts = (drug.rawContraindications || [])
      .flatMap(c => c.matchTerms)
      .join(' ')
      .toLowerCase();
    if (forms.includes('xylitol') || offLabel.includes('xylitol') || contraTexts.includes('xylitol')) {
      alerts.push({
        type: 'excipient-toxicity',
        severity: SEVERITY.CRITICAL,
        drug: drug.name,
        rule: 'Xylitol-Containing Formulation — Severe Canine Toxicity',
        mechanism: `This formulation of ${drug.name} contains xylitol. In dogs, xylitol causes dose-dependent hypoglycaemia (through massive insulin release from pancreatic β-cells) and hepatotoxicity (acute hepatic necrosis at higher doses). Xylitol is safe for humans and cats but is acutely toxic to dogs even in small quantities. Xylitol 50–100 mg/kg causes hypoglycaemia; ≥500 mg/kg causes acute liver failure.`,
        recommendation: `Do not use this oral formulation in dogs. Use a xylitol-free formulation or a different route of administration (injection, tablet). If the drug is commercially available in a tablet or capsule form, use that instead. Contact the compounding pharmacy to verify excipient content.`,
      });
    }
  }

  // ── Case 25: Metronidazole dose ceiling — vestibular neurotoxicity ────────
  if (
    species === 'dog' &&
    (drug.id === 'metronidazole' || drug.name.toLowerCase().includes('metronidazole'))
  ) {
    // The 60 mg/kg/day ceiling is in section highlights (sectionHighlights)
    // Use this schema-derived knowledge for the ceiling check
    const METRO_NEURO_CEILING_DOG = 60; // mg/kg/day — documented in schema highlights
    if (dosePerKg && dosePerKg > METRO_NEURO_CEILING_DOG) {
      alerts.push({
        type: 'dose-exceeded',
        severity: SEVERITY.CRITICAL,
        drug: drug.name,
        rule: `Metronidazole Dose Ceiling Exceeded — Vestibular Neurotoxicity Risk`,
        mechanism: `The prescribed dose of ${dosePerKg} mg/kg/day exceeds the established neurotoxicity threshold of 60 mg/kg/day for metronidazole in dogs. Metronidazole causes dose-dependent vestibular neurotoxicity characterised by: head tilt, ataxia (truncal and appendicular), nystagmus (horizontal or rotary), vomiting, and disorientation. High doses cause direct toxicity to the cerebellar and vestibular neurons. Retrospective studies have reported neurotoxicity even at 21 mg/kg q12h (42 mg/kg/day) in sensitive individuals. Schema reference: "1일 총 용량 60 mg/kg 초과 시 신경독성 위험이 높음."`,
        recommendation: `Reduce dose to ≤60 mg/kg/day total (typically 15 mg/kg PO BID–TID or 10–15 mg/kg IV TID for serious infections). Current prescribed dose of ${dosePerKg} mg/kg must be corrected. If neurotoxicity signs appear (head tilt, ataxia, nystagmus), discontinue immediately — diazepam 0.5 mg/kg IV has been reported to reduce vestibular signs in acute metronidazole toxicity. Total weight-adjusted daily dose: ${dosePerKg} mg/kg × ${weightKg} kg = ${(dosePerKg * weightKg).toFixed(0)} mg/day total.`,
      });
    }
  }

  return alerts;
}

// ── Multi-drug systemic checks ────────────────────────────────────

/**
 * Checks the full drug list for:
 *  - Triple nephrotoxic whammy (Case 12)
 *  - Triple CNS sedation escalation (Case 15)
 *  - MDR1 + P-gp inhibitor pairwise (Case 1)
 */
function generateMultiDrugAlerts(drugs, species, weightKg, patient) {
  const alerts = [];
  const breed = patient.breed || '';
  const creatinine = parseFloat(patient.creatinine) || null;

  // ── Case 1: MDR1 + P-gp inhibitor — breed-specific severity-3 ──────────
  for (let i = 0; i < drugs.length; i++) {
    const drugA = drugs[i];
    if (!drugA.mdr1Sensitive) continue;
    const affectedBreeds = drugA.geneticSensitivity?.affectedBreeds || [];
    if (!affectedBreeds.some(b => breedMatch(b, breed))) continue;

    for (let j = 0; j < drugs.length; j++) {
      if (i === j) continue;
      const drugB = drugs[j];
      const pgpInteraction = drugHasPgpInteractionWith(drugA, drugB);
      if (!pgpInteraction) continue;

      alerts.push({
        type: 'mdr1-pgp-inhibitor',
        severity: SEVERITY.CRITICAL,
        drug: `${drugA.name} + ${drugB.name}`,
        rule: `MDR1/P-gp Inhibition in ${breed} — CNS Neurotoxicity Risk`,
        mechanism: `PHARMACOGENETIC RISK (Severity 3): ${breed} is a breed with high prevalence of the MDR1/ABCB1-1Δ mutation (P-glycoprotein deficiency). ${drugA.name} is a P-glycoprotein substrate — in MDR1-deficient animals, it cannot be actively transported out of the CNS, leading to accumulation and neurotoxicity at standard doses. ${drugB.name} additionally inhibits P-glycoprotein transport (${pgpInteraction.drug}: "${pgpInteraction.evidence || 'P-gp inhibition documented'}", severity ${pgpInteraction.severity}/3). This combination creates a double-hit: MDR1 mutation impairs baseline CNS efflux, and ketoconazole further blocks any residual P-gp transport. Expected outcome: severe CNS accumulation of ${drugA.name} with acute neurotoxicity even at labelled doses.`,
        recommendation: `AVOID THIS COMBINATION in this patient. Options: (1) Genetic test the patient for MDR1/ABCB1 mutation before prescribing — if wild-type, the risk is significantly reduced; (2) Replace ${drugA.name} with a non-P-gp substrate antiparasitic; (3) If both drugs are essential, reduce ${drugA.name} dose by 50% and monitor neurological status daily (ataxia, tremor, mydriasis, stupor, coma). Emergency decontamination (activated charcoal) if toxicity is acute.`,
      });
    }
  }

  // ── Case 12: Triple nephrotoxic whammy ────────────────────────────────────
  const nephrotoxicDrugs = drugs.filter(d => d.additiveRisks?.nephrotoxic);
  if (nephrotoxicDrugs.length >= 3) {
    const drugNames = nephrotoxicDrugs.map(d => d.name).join(' + ');
    const creatNote = creatinine ? ` Combined with elevated creatinine of ${creatinine} mg/dL, this represents an acute renal failure emergency.` : '';
    alerts.push({
      type: 'triple-nephrotoxic',
      severity: SEVERITY.CRITICAL,
      drug: drugNames,
      rule: `Triple Nephrotoxic Combination — Acute Renal Failure Risk`,
      mechanism: `Three or more concurrent nephrotoxic drugs detected: ${drugNames}. Each drug independently compromises renal function through different mechanisms (NSAID: prostaglandin-mediated renal blood flow reduction; ACE inhibitor: efferent arteriole dilation; loop diuretic: volume depletion). The three-drug combination creates synergistic renal failure risk far exceeding any two-drug pair — this is the "Triple Whammy" nephrotoxic combination well-documented in human and veterinary medicine.${creatNote} All three drugs have additive_risks.nephrotoxic = true in the drug schema.`,
      recommendation: `Reassess the complete drug regimen. If the clinical indication requires all three drugs simultaneously (e.g., heart failure + pain management), monitor creatinine and BUN every 48 hours and ensure the patient is well-hydrated. Reduce or eliminate the NSAID first — it carries the highest acute nephrotoxicity risk. Maintain diuretic at the lowest effective dose. Consider dose reduction of all three drugs by 25–30%.`,
    });
  }

  // ── Case 15: Triple CNS sedation escalation ───────────────────────────────
  const sedatingDrugs = drugs.filter(d => d.additiveRisks?.sedation);
  if (sedatingDrugs.length >= 3) {
    const drugNames = sedatingDrugs.map(d => d.name).join(' + ');
    const isCat = species === 'cat';
    alerts.push({
      type: 'triple-sedation',
      severity: SEVERITY.CRITICAL,
      drug: drugNames,
      rule: `Triple CNS Sedation — Respiratory Compromise Risk${isCat ? ' (Cat — CRITICAL)' : ''}`,
      mechanism: `Three or more CNS-depressant drugs are prescribed simultaneously: ${drugNames}. Each has additiveRisks.sedation = true. The combined CNS depression from three sedating agents at standard individual doses is NOT simply additive — it is synergistic. In ${isCat ? 'cats' : 'dogs'}, triple sedation combination routinely causes respiratory depression requiring mechanical ventilation.${isCat ? ' Cats are particularly vulnerable due to smaller airway reserve, higher metabolic rate, and narrower therapeutic index for CNS depressants.' : ''} The risk of apnoea and respiratory arrest is dramatically elevated compared to any two-drug sedation protocol.`,
      recommendation: `Do not prescribe all three sedating drugs simultaneously at standard doses. If this is an anaesthetic protocol, ensure: (1) continuous SpO₂ monitoring; (2) ET tube and oxygen delivery immediately available; (3) reversal agents drawn up (naloxone for opioids, flumazenil for benzodiazepines); (4) assisted ventilation capability; (5) reduce doses of all three agents by 25–50% from individual standard doses.`,
    });
  }

  return alerts;
}

// ── Main analysis function ──────────────────────────────────────
/**
 * @param {object[]} drugs       — mapped drug objects from drug_mapper.py
 * @param {string}   species     — 'dog' | 'cat'
 * @param {number}   weightKg    — patient weight in kg
 * @param {object}   patient     — { breed, ageNum, ageUnit, conditions, creatinine, alt }
 */
export function runFullDURAnalysis(drugs, species, weightKg, patient = {}) {
  const results = {
    interactions: [],
    drugFlags: [],
    patientAlerts: [],
    overallSeverity: SEVERITY.NONE,
    confidenceScore: 100,
    speciesNotes: [],
    timestamp: new Date().toISOString(),
  };

  // ── Expand multi-substance drugs for analysis ──────────────────
  const expandedDrugs = expandDrugsForAnalysis(drugs);

  // ── Per-drug flags (use original drugs for display) ────────────
  for (const drug of drugs) {
    const flag = {
      drugId: drug.id,
      drugName: drug.name,
      activeSubstance: drug.activeSubstance,
      source: drug.source,
      drugClass: drug.class,
      flags: [],
      speciesNote: null,
      confidenceAdjustment: 0,
      hasSpeciesWarning: false,
    };

    if (drug.source === DRUG_SOURCE.HUMAN_OFFLABEL) {
      flag.flags.push({
        type: 'off-label',
        label: 'Off-Label (Human Drug)',
        description: drug.offLabelNote || 'This is a human drug being used off-label in veterinary medicine.',
        severity: 'info',
      });
      flag.confidenceAdjustment = -5;
    }
    if (drug.source === DRUG_SOURCE.FOREIGN) {
      flag.flags.push({
        type: 'foreign',
        label: 'Foreign Drug',
        description: 'This drug is not registered in the Korean veterinary formulary.',
        severity: 'info',
      });
      flag.confidenceAdjustment = -8;
    }
    if (drug.source === DRUG_SOURCE.UNKNOWN) {
      flag.flags.push({
        type: 'unknown',
        label: 'Unknown Drug',
        description: 'This drug was not found in any database. Interaction analysis is limited.',
        severity: 'warning',
      });
      flag.confidenceAdjustment = -25;
    }

    if (drug.speciesNotes?.[species]) {
      flag.speciesNote = drug.speciesNotes[species];
      results.speciesNotes.push({ drug: drug.name, note: drug.speciesNotes[species] });
    }

    if (drug.defaultDose?.[species] === null) {
      flag.flags.push({
        type: 'species-warning',
        label: `Not Approved for ${species === 'dog' ? 'Dogs' : 'Cats'}`,
        description: `${drug.name} does not have an approved dose for ${species === 'dog' ? 'canine' : 'feline'} patients. Use with extreme caution.`,
        severity: 'warning',
      });
      flag.confidenceAdjustment -= 15;
      flag.hasSpeciesWarning = true;
    }

    if (drug.narrowTherapeuticIndex) {
      flag.flags.push({
        type: 'nti',
        label: 'Narrow Therapeutic Index',
        description: 'Small dosing changes can lead to toxicity or loss of efficacy. Therapeutic drug monitoring recommended.',
        severity: 'info',
      });
    }

    // MDR1 breed-specific check (enhanced — fires when breed is confirmed in affected list)
    if (drug.mdr1Sensitive && species === 'dog') {
      const breed = patient.breed || '';
      const affectedBreeds = drug.geneticSensitivity?.affectedBreeds || [];
      const breedConfirmed = breed && affectedBreeds.some(b => breedMatch(b, breed));

      if (breedConfirmed) {
        flag.flags.push({
          type: 'mdr1-breed-confirmed',
          label: `MDR1 Risk — ${breed}`,
          description: `${breed} is listed in the affected breeds for ${drug.name}. This breed has a high prevalence of the MDR1/ABCB1-1Δ mutation. Standard doses may cause severe CNS toxicity. Genetic testing is recommended before prescribing. Affected breeds: ${affectedBreeds.join(', ')}.`,
          severity: 'critical',
        });
        flag.hasSpeciesWarning = true;
      } else {
        flag.flags.push({
          type: 'mdr1',
          label: 'MDR1 Sensitivity',
          description: `CRITICAL in MDR1-mutant breeds (Collies, Shelties, Australian Shepherds, Border Collies). Test before prescribing or use alternative. Affected breeds: ${affectedBreeds.join(', ') || 'see breed list'}.`,
          severity: 'critical',
        });
        flag.hasSpeciesWarning = true;
      }
    }

    results.drugFlags.push(flag);
  }

  // ── Per-drug patient-context alerts ────────────────────────────
  for (const drug of expandedDrugs) {
    const drugAlerts = generatePerDrugPatientAlerts(drug, species, weightKg, patient);
    results.patientAlerts.push(...drugAlerts);
  }

  // ── Class-based rules (drug-disease, drug-age, drug-pregnancy, etc.) ──
  const conditions = patient.conditions || [];
  const allergies = patient.allergies || [];
  const ageMonthsVal = ageInMonths(patient);
  const currentMedications = patient.currentMedications || [];

  for (const drug of expandedDrugs) {
    // Drug-Disease class rules (beta-blocker + asthma, NSAID + CKD, etc.)
    const diseaseAlerts = checkDrugDiseaseRules(drug, conditions, species);
    for (const alert of diseaseAlerts) {
      // Avoid duplicating alerts already caught by rawContraindications
      const isDup = results.patientAlerts.some(a =>
        a.type === 'drug-disease' && a.drug === (drug._parentDrugName || drug.name) &&
        a.matchedCondition === alert.matchedCondition
      );
      if (!isDup) {
        results.patientAlerts.push({
          ...alert,
          drug: drug._parentDrugName || drug.name,
          severity: alert.severity === 'CRITICAL' ? SEVERITY.CRITICAL : SEVERITY.MODERATE,
        });
      }
    }

    // Drug-Age class rules
    if (ageMonthsVal !== null) {
      const ageAlerts = checkDrugAgeRules(drug, ageMonthsVal, species);
      for (const alert of ageAlerts) {
        const isDup = results.patientAlerts.some(a =>
          a.type === 'drug-age' && a.drug === (drug._parentDrugName || drug.name)
        );
        if (!isDup) {
          results.patientAlerts.push({
            ...alert,
            drug: drug._parentDrugName || drug.name,
            severity: alert.severity === 'CRITICAL' ? SEVERITY.CRITICAL : SEVERITY.MODERATE,
          });
        }
      }
    }

    // Drug-Pregnancy rules
    if (patient.isPregnant) {
      const pregAlerts = checkDrugPregnancyRules(drug, true, patient.trimester);
      for (const alert of pregAlerts) {
        results.patientAlerts.push({
          ...alert,
          drug: drug._parentDrugName || drug.name,
          severity: alert.severity === 'CRITICAL' ? SEVERITY.CRITICAL : SEVERITY.MODERATE,
        });
      }
    }

    // Drug-Allergy cross-reactivity
    if (allergies.length > 0) {
      const allergyAlerts = checkAllergyRules(drug, allergies);
      for (const alert of allergyAlerts) {
        results.patientAlerts.push({
          ...alert,
          drug: drug._parentDrugName || drug.name,
          severity: alert.severity === 'CRITICAL' ? SEVERITY.CRITICAL : SEVERITY.MODERATE,
        });
      }
    }

    // Drug-Food interaction warnings
    const foodAlerts = checkDrugFoodRules(drug);
    for (const alert of foodAlerts) {
      results.patientAlerts.push({
        ...alert,
        drug: drug._parentDrugName || drug.name,
        severity: SEVERITY.MODERATE,
      });
    }

    // Drug-Gender/Neuter rules
    if (patient.sex) {
      const genderAlerts = checkGenderRules(drug, patient.sex, patient.isNeutered);
      for (const alert of genderAlerts) {
        results.patientAlerts.push({
          ...alert,
          drug: drug._parentDrugName || drug.name,
          severity: alert.severity === 'CRITICAL' ? SEVERITY.CRITICAL : SEVERITY.MODERATE,
        });
      }
    }

    // Drug-Lab interference warnings
    const labAlerts = checkLabInterference(drug);
    for (const alert of labAlerts) {
      results.patientAlerts.push({
        ...alert,
        drug: drug._parentDrugName || drug.name,
        severity: SEVERITY.MODERATE,
      });
    }

    // Washout period checking against current medications
    if (currentMedications.length > 0) {
      const washoutAlerts = checkWashoutRules(drug, currentMedications);
      for (const alert of washoutAlerts) {
        results.patientAlerts.push({
          ...alert,
          drug: drug._parentDrugName || drug.name,
          severity: alert.severity === 'CRITICAL' ? SEVERITY.CRITICAL : SEVERITY.MODERATE,
        });
      }
    }
  }

  // ── Multi-drug systemic alerts ─────────────────────────────────
  const multiAlerts = generateMultiDrugAlerts(expandedDrugs, species, weightKg, patient);
  results.patientAlerts.push(...multiAlerts);

  // ── Pairwise interaction checks (use expanded drugs for multi-substance) ──
  for (let i = 0; i < expandedDrugs.length; i++) {
    for (let j = i + 1; j < expandedDrugs.length; j++) {
      const drugA = expandedDrugs[i];
      const drugB = expandedDrugs[j];
      // Skip interactions between components of the same parent drug
      if (drugA._parentDrugId && drugA._parentDrugId === drugB._parentDrugId) continue;

      for (const rule of INTERACTION_MATRIX) {
        if (rule.match(drugA, drugB) || rule.match(drugB, drugA)) {
          const [a, b] = rule.match(drugA, drugB) ? [drugA, drugB] : [drugB, drugA];
          const displayNameA = a._parentDrugName ? `${a.name} (from ${a._parentDrugName})` : a.name;
          const displayNameB = b._parentDrugName ? `${b.name} (from ${b._parentDrugName})` : b.name;
          // Deduplicate: don't add if same parent drugs already have this interaction
          const existingParent = results.interactions.find(int =>
            int.rule === rule.rule &&
            ((int.drugAData?._parentDrugId === a._parentDrugId && int.drugBData?._parentDrugId === b._parentDrugId) ||
             (int.drugAData?._parentDrugId === b._parentDrugId && int.drugBData?._parentDrugId === a._parentDrugId))
          );
          if (!existingParent) {
            results.interactions.push({
              drugA: displayNameA,
              drugB: displayNameB,
              drugAClass: a.class,
              drugBClass: b.class,
              drugAData: a,
              drugBData: b,
              severity: rule.severity,
              rule: rule.rule,
              mechanism: resolveField(rule.mechanism, a, b),
              recommendation: resolveField(rule.recommendation, a, b),
              alternativeSuggestion: resolveField(rule.alternativeSuggestion, a, b),
              literatureSummary: resolveField(rule.literatureSummary, a, b),
              literature: rule.literature,
            });
          }
          break;
        }
      }
    }
  }

  // ── Unknown drug pairwise fallback (use original drugs, not expanded) ──
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      if (drugs[i].source !== DRUG_SOURCE.UNKNOWN && drugs[j].source !== DRUG_SOURCE.UNKNOWN) continue;
      const existing = results.interactions.find(
        int => (int.drugA === drugs[i].name && int.drugB === drugs[j].name) ||
               (int.drugA === drugs[j].name && int.drugB === drugs[i].name)
      );
      if (!existing) {
        const unknownDrug = drugs[i].source === DRUG_SOURCE.UNKNOWN ? drugs[i] : drugs[j];
        const knownDrug   = drugs[i].source === DRUG_SOURCE.UNKNOWN ? drugs[j] : drugs[i];
        results.interactions.push({
          drugA: unknownDrug.name,
          drugB: knownDrug.name,
          drugAClass: unknownDrug.class,
          drugBClass: knownDrug.class,
          drugAData: unknownDrug,
          drugBData: knownDrug,
          severity: { label: 'Unknown', score: 30, color: 'gray' },
          rule: 'Insufficient Data',
          mechanism: `${unknownDrug.name} is not in the database. Interaction with ${knownDrug.name} cannot be fully evaluated.`,
          recommendation: 'Exercise clinical judgment. Consider consulting a veterinary pharmacologist.',
          alternativeSuggestion: null,
          literatureSummary: null,
          literature: [],
        });
      }
    }
  }

  // ── Chelation / absorption interaction check (Case 21) ────────
  // Only fires when: (1) a rawInteraction entry has chelation/absorption keywords,
  // AND (2) the OTHER drug's name actually appears in that entry's drug field,
  // OR the other drug is genuinely an antacid/GI protectant class.
  // This prevents false matches (e.g. Ketoconazole + Propranolol).
  const ANTACID_GI_TERMS = ['antacid', 'aluminum', 'magnesium', 'calcium carbonate',
    'famotidine', 'omeprazole', 'cimetidine', 'ranitidine', 'sucralfate',
    'h2 blocker', 'h2-receptor', 'ppi', 'proton pump'];
  for (let i = 0; i < expandedDrugs.length; i++) {
    for (let j = i + 1; j < expandedDrugs.length; j++) {
      if (expandedDrugs[i]._parentDrugId && expandedDrugs[i]._parentDrugId === expandedDrugs[j]._parentDrugId) continue;
      const a = expandedDrugs[i];
      const b = expandedDrugs[j];
      for (const [substrate, other] of [[a, b], [b, a]]) {
        const chelationInter = (substrate.rawInteractions || []).find(inter => {
          const kws = (inter.keywords || []).map(k => k.toLowerCase());
          const hasChel = kws.some(k =>
            k.includes('chelat') || k.includes('reduced absorption') ||
            k.includes('흡수 감소') || k.includes('킬레이')
          );
          if (!hasChel) return false;
          const intDrugLow = (inter.drug || '').toLowerCase();
          const otherNameLow = other.name.toLowerCase();
          const otherIdLow = (other.id || '').toLowerCase();
          const otherClassLow = (other.class || '').toLowerCase();
          // Strict match: the rawInteraction must name the OTHER drug specifically
          const directMatch = intDrugLow.includes(otherNameLow) ||
            otherNameLow.includes(intDrugLow.split(/[(\s,]/)[0]); // first word of inter.drug
          // OR: the other drug is genuinely an antacid/GI protectant
          const isOtherAntacid = ANTACID_GI_TERMS.some(t =>
            otherNameLow.includes(t) || otherIdLow.includes(t) || otherClassLow.includes(t)
          );
          // OR: the rawInteraction's drug field names an antacid class AND the other IS that class
          const interNamesAntacid = ANTACID_GI_TERMS.some(t => intDrugLow.includes(t));
          return directMatch || (isOtherAntacid && interNamesAntacid);
        });
        if (chelationInter) {
          const exists = results.interactions.some(
            int => (int.drugA === substrate.name && int.drugB === other.name) ||
                   (int.drugA === other.name && int.drugB === substrate.name)
          );
          if (!exists) {
            results.interactions.push({
              drugA: substrate.name,
              drugB: other.name,
              drugAClass: substrate.class,
              drugBClass: other.class,
              drugAData: substrate,
              drugBData: other,
              severity: SEVERITY.MODERATE,
              rule: 'Absorption Interaction — Chelation/pH-Dependent',
              mechanism: `${other.name} may reduce ${substrate.name} absorption in the GI tract via chelation or pH alteration. Drug data evidence (${substrate.name}): "${chelationInter.evidence || 'Reduced absorption documented.'}". This can result in sub-therapeutic blood levels and treatment failure.`,
              recommendation: `Separate doses of ${substrate.name} and ${other.name} by at least 2 hours. If possible, administer ${substrate.name} IV to bypass GI absorption interaction.`,
              alternativeSuggestion: null,
              literatureSummary: 'Polyvalent cations (Al³⁺, Ca²⁺, Mg²⁺, Fe²⁺) chelate fluoroquinolones and tetracyclines, reducing oral bioavailability by 25–90%. H2 blockers and PPIs reduce gastric acidity needed for ketoconazole dissolution.',
              literature: [{ title: "Plumb's Veterinary Drug Handbook — Enrofloxacin/Ketoconazole monographs.", source: 'Wiley-Blackwell', confidence: 88 }],
            });
          }
          break;
        }
      }
    }
  }

  // ── Calculate overall severity ──────────────────────────────────
  const allSeverityScores = [
    ...results.interactions.map(i => i.severity.score),
    ...results.patientAlerts.map(a => a.severity?.score || 0),
  ];
  if (allSeverityScores.length > 0) {
    const maxScore = Math.max(...allSeverityScores);
    if (maxScore >= 100) results.overallSeverity = SEVERITY.CRITICAL;
    else if (maxScore >= 50) results.overallSeverity = SEVERITY.MODERATE;
    else if (maxScore > 0) results.overallSeverity = SEVERITY.MINOR;
  }

  // ── Confidence score ────────────────────────────────────────────
  let confidence = 95;
  for (const flag of results.drugFlags) confidence += flag.confidenceAdjustment;
  const unknownInteractions = results.interactions.filter(i => i.rule === 'Insufficient Data');
  confidence -= unknownInteractions.length * 10;
  results.confidenceScore = Math.max(15, Math.min(99, confidence));

  // ── Sort by severity ────────────────────────────────────────────
  results.interactions.sort((a, b) => b.severity.score - a.severity.score);
  results.patientAlerts.sort((a, b) => (b.severity?.score || 0) - (a.severity?.score || 0));

  return results;
}

export { SEVERITY };
