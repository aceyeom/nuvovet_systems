/**
 * Drug-Class Interaction Rules for Veterinary DUR Engine
 *
 * Exports 8 rule-checker functions consumed by durEngine.js:
 *   checkDrugDiseaseRules, checkDrugAgeRules, checkDrugPregnancyRules,
 *   checkAllergyRules, checkDrugFoodRules, checkGenderRules,
 *   checkLabInterference, checkWashoutRules
 *
 * Each function returns an array of alert objects:
 *   { type, severity, message, ...extra }
 */

// ── Helpers ─────────────────────────────────────────────────────

function nameOrClassMatches(drug, terms) {
  const n = (drug.name || '').toLowerCase();
  const c = (drug.class || '').toLowerCase();
  const id = (drug.id || '').toLowerCase();
  return terms.some(t => {
    const lc = t.toLowerCase();
    return n.includes(lc) || c.includes(lc) || id.includes(lc);
  });
}

function conditionMatches(conditions, terms) {
  return conditions.some(cond => {
    const lc = cond.toLowerCase();
    return terms.some(t => lc.includes(t.toLowerCase()));
  });
}

// ═══════════════════════════════════════════════════════════════
// 1. Drug-Disease Rules
// ═══════════════════════════════════════════════════════════════

const DRUG_DISEASE_RULES = [
  // NSAID + renal disease
  {
    drugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib',
                'ketoprofen', 'piroxicam', 'robenacoxib', 'tepoxalin', 'etodolac'],
    conditionTerms: ['kidney', 'renal', 'ckd', 'azotemia', 'nephro'],
    severity: 'CRITICAL',
    message: 'NSAIDs are contraindicated in patients with renal disease — may precipitate acute kidney injury via prostaglandin-mediated afferent arteriolar dilation inhibition.',
    species: null,
  },
  // NSAID + GI ulceration
  {
    drugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib',
                'ketoprofen', 'piroxicam', 'robenacoxib'],
    conditionTerms: ['gi ulcer', 'gastric ulcer', 'gastrointestinal bleed', 'melena', 'hematemesis'],
    severity: 'CRITICAL',
    message: 'NSAIDs increase risk of GI ulceration/perforation in patients with existing GI disease.',
    species: null,
  },
  // NSAID + liver disease
  {
    drugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib'],
    conditionTerms: ['liver', 'hepatic', 'hepato', 'cholestasis', 'elevated alt'],
    severity: 'MODERATE',
    message: 'NSAIDs undergo hepatic metabolism; use with caution in patients with hepatic compromise.',
    species: null,
  },
  // ACE inhibitor + hyperkalemia
  {
    drugTerms: ['ace inhibitor', 'enalapril', 'benazepril', 'ramipril', 'lisinopril'],
    conditionTerms: ['hyperkalemia', 'elevated potassium', 'hypoadrenocorticism', 'addison'],
    severity: 'MODERATE',
    message: 'ACE inhibitors may worsen hyperkalemia; monitor serum potassium closely.',
    species: null,
  },
  // Corticosteroid + diabetes
  {
    drugTerms: ['corticosteroid', 'prednis', 'dexamethasone', 'methylprednisolone',
                'triamcinolone', 'hydrocortisone', 'budesonide'],
    conditionTerms: ['diabetes', 'diabetic', 'hyperglycemia', 'insulin resistance'],
    severity: 'MODERATE',
    message: 'Corticosteroids cause insulin resistance and hyperglycemia — avoid or closely monitor in diabetic patients.',
    species: null,
  },
  // Corticosteroid + GI ulcer
  {
    drugTerms: ['corticosteroid', 'prednis', 'dexamethasone', 'methylprednisolone'],
    conditionTerms: ['gi ulcer', 'gastric ulcer', 'gastrointestinal bleed'],
    severity: 'MODERATE',
    message: 'Corticosteroids increase GI ulceration risk, especially when combined with NSAIDs.',
    species: null,
  },
  // Beta-blocker + asthma/bronchospastic disease (all species)
  {
    drugTerms: ['beta-blocker', 'atenolol', 'propranolol', 'metoprolol', 'carvedilol', 'sotalol', 'timolol', 'nadolol'],
    conditionTerms: ['asthma', 'bronchospasm', 'feline asthma', 'bronchial', 'copd', 'bronchoconstric'],
    severity: 'CRITICAL',
    message: 'Beta-blockers (especially non-selective: propranolol, nadolol, timolol) block β₂-adrenergic receptors in bronchial smooth muscle, causing bronchoconstriction. In patients with bronchospastic disease this can trigger acute, life-threatening respiratory distress. Contraindicated regardless of species.',
    species: null,
  },
  // Aminoglycoside + renal disease
  {
    drugTerms: ['aminoglycoside', 'gentamicin', 'amikacin', 'tobramycin', 'neomycin'],
    conditionTerms: ['kidney', 'renal', 'ckd', 'azotemia', 'nephro'],
    severity: 'CRITICAL',
    message: 'Aminoglycosides are nephrotoxic — contraindicated or require extreme caution and TDM in renal-compromised patients.',
    species: null,
  },
  // Cisplatin in cats
  {
    drugTerms: ['cisplatin'],
    conditionTerms: ['any'],
    severity: 'CRITICAL',
    message: 'Cisplatin is absolutely contraindicated in cats — causes fatal pulmonary edema. Use carboplatin instead.',
    species: 'cat',
  },
  // Metformin + liver disease
  {
    drugTerms: ['metformin'],
    conditionTerms: ['liver', 'hepatic', 'hepato'],
    severity: 'MODERATE',
    message: 'Metformin risk of lactic acidosis is increased in hepatic impairment.',
    species: null,
  },
  // Furosemide + dehydration
  {
    drugTerms: ['furosemide', 'loop diuretic', 'torsemide'],
    conditionTerms: ['dehydra', 'hypovolemia', 'hypovolemic'],
    severity: 'MODERATE',
    message: 'Loop diuretics in dehydrated patients can worsen hypovolemia and electrolyte depletion.',
    species: null,
  },
  // Methimazole + liver disease
  {
    drugTerms: ['methimazole', 'thiamazole'],
    conditionTerms: ['liver', 'hepatic', 'hepato', 'cholestasis'],
    severity: 'MODERATE',
    message: 'Methimazole can cause hepatotoxicity; monitor liver values in patients with pre-existing hepatic disease.',
    species: null,
  },
  // Phenobarbital + liver disease
  {
    drugTerms: ['phenobarbital', 'phenobarbitone'],
    conditionTerms: ['liver', 'hepatic', 'hepato', 'elevated alt'],
    severity: 'MODERATE',
    message: 'Phenobarbital is hepatotoxic with chronic use; contraindicated or use with extreme caution in hepatic patients.',
    species: null,
  },
  // Ketoconazole + liver disease
  {
    drugTerms: ['ketoconazole'],
    conditionTerms: ['liver', 'hepatic', 'hepato'],
    severity: 'CRITICAL',
    message: 'Ketoconazole is highly hepatotoxic; contraindicated in patients with liver disease.',
    species: null,
  },
  // Metronidazole + seizure history
  {
    drugTerms: ['metronidazole'],
    conditionTerms: ['seizure', 'epilepsy', 'epileptic', 'convulsion'],
    severity: 'MODERATE',
    message: 'Metronidazole can cause neurotoxicity/seizures at high doses; use reduced doses or avoid in seizure-prone patients.',
    species: null,
  },
  // Tetracycline + young animals (bone/teeth)
  {
    drugTerms: ['tetracycline', 'doxycycline', 'minocycline', 'oxytetracycline'],
    conditionTerms: ['growing', 'pediatric', 'juvenile'],
    severity: 'MODERATE',
    message: 'Tetracyclines may cause tooth discoloration and bone growth disturbance in young/growing animals.',
    species: null,
  },
];

/**
 * @param {object} drug
 * @param {string[]} conditions
 * @param {string} species
 * @returns {Array<{type, severity, message, matchedCondition}>}
 */
export function checkDrugDiseaseRules(drug, conditions, species) {
  const alerts = [];
  const safeConditions = conditions || [];

  for (const rule of DRUG_DISEASE_RULES) {
    // Species filter
    if (rule.species && rule.species !== species) continue;

    if (!nameOrClassMatches(drug, rule.drugTerms)) continue;

    // Special case: species-level contraindication triggers regardless of condition
    // (e.g., cisplatin in cats is always contraindicated)
    if (rule.conditionTerms.includes('any') && rule.species === species) {
      alerts.push({
        type: 'drug-disease',
        severity: rule.severity,
        message: rule.message,
        matchedCondition: `species:${species}`,
      });
      continue;
    }

    // Condition-based rules require conditions to be present
    if (safeConditions.length === 0) continue;

    for (const cond of safeConditions) {
      if (rule.conditionTerms.some(t => cond.toLowerCase().includes(t.toLowerCase()))) {
        alerts.push({
          type: 'drug-disease',
          severity: rule.severity,
          message: rule.message,
          matchedCondition: cond,
        });
      }
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════
// 2. Drug-Age Rules
// ═══════════════════════════════════════════════════════════════

const DRUG_AGE_RULES = [
  // Fluoroquinolones in young dogs — cartilage damage
  {
    drugTerms: ['fluoroquinolone', 'enrofloxacin', 'marbofloxacin', 'orbifloxacin',
                'pradofloxacin', 'ciprofloxacin'],
    maxAgeMonths: 12, // dogs under 12 months (large breeds under 18)
    severity: 'CRITICAL',
    message: 'Fluoroquinolones cause cartilage damage in growing animals — avoid in dogs under 12-18 months.',
    species: 'dog',
  },
  // Fluoroquinolones in kittens
  {
    drugTerms: ['fluoroquinolone', 'enrofloxacin', 'marbofloxacin', 'orbifloxacin', 'pradofloxacin'],
    maxAgeMonths: 8,
    severity: 'CRITICAL',
    message: 'Fluoroquinolones may cause retinal degeneration in cats and cartilage damage in kittens.',
    species: 'cat',
  },
  // NSAIDs in very young puppies
  {
    drugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib'],
    maxAgeMonths: 6,
    severity: 'MODERATE',
    message: 'NSAIDs should be used with caution in puppies under 6 months — immature renal/hepatic function.',
    species: 'dog',
  },
  // Phenobarbital in neonates
  {
    drugTerms: ['phenobarbital', 'phenobarbitone'],
    maxAgeMonths: 3,
    severity: 'MODERATE',
    message: 'Neonatal animals have immature hepatic metabolism — phenobarbital clearance is significantly reduced.',
    species: null,
  },
  // Geriatric NSAID caution (>120 months / 10 years)
  {
    drugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib'],
    minAgeMonths: 120,
    severity: 'MODERATE',
    message: 'Geriatric patients: monitor renal and hepatic function before and during chronic NSAID therapy.',
    species: null,
  },
  // Aminoglycosides in neonates
  {
    drugTerms: ['aminoglycoside', 'gentamicin', 'amikacin'],
    maxAgeMonths: 3,
    severity: 'MODERATE',
    message: 'Neonatal patients have immature renal function — aminoglycoside clearance is reduced, increasing nephro/ototoxicity risk.',
    species: null,
  },
];

/**
 * @param {object} drug
 * @param {number} ageMonths
 * @param {string} species
 * @returns {Array<{type, severity, message}>}
 */
export function checkDrugAgeRules(drug, ageMonths, species) {
  if (ageMonths == null) return [];
  const alerts = [];

  for (const rule of DRUG_AGE_RULES) {
    if (rule.species && rule.species !== species) continue;
    if (!nameOrClassMatches(drug, rule.drugTerms)) continue;

    const tooYoung = rule.maxAgeMonths != null && ageMonths < rule.maxAgeMonths;
    const tooOld = rule.minAgeMonths != null && ageMonths >= rule.minAgeMonths;

    if (tooYoung || tooOld) {
      alerts.push({
        type: 'drug-age',
        severity: rule.severity,
        message: rule.message,
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════
// 3. Drug-Pregnancy Rules
// ═══════════════════════════════════════════════════════════════

const DRUG_PREGNANCY_RULES = [
  {
    drugTerms: ['methotrexate'],
    severity: 'CRITICAL',
    message: 'Methotrexate is teratogenic — absolutely contraindicated in pregnant animals.',
  },
  {
    drugTerms: ['misoprostol'],
    severity: 'CRITICAL',
    message: 'Misoprostol causes uterine contractions — contraindicated in pregnancy (abortifacient).',
  },
  {
    drugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib',
                'ketoprofen', 'piroxicam'],
    severity: 'MODERATE',
    message: 'NSAIDs may inhibit prostaglandin-mediated parturition and cause premature closure of ductus arteriosus in late pregnancy.',
  },
  {
    drugTerms: ['corticosteroid', 'prednis', 'dexamethasone', 'methylprednisolone',
                'triamcinolone'],
    severity: 'MODERATE',
    message: 'Corticosteroids can induce premature parturition/abortion, especially dexamethasone in late pregnancy.',
  },
  {
    drugTerms: ['griseofulvin'],
    severity: 'CRITICAL',
    message: 'Griseofulvin is teratogenic in cats — contraindicated in pregnancy.',
  },
  {
    drugTerms: ['fluoroquinolone', 'enrofloxacin', 'marbofloxacin', 'orbifloxacin', 'pradofloxacin'],
    severity: 'MODERATE',
    message: 'Fluoroquinolones may affect fetal cartilage development — avoid during pregnancy if alternatives exist.',
  },
  {
    drugTerms: ['tetracycline', 'doxycycline', 'minocycline', 'oxytetracycline'],
    severity: 'MODERATE',
    message: 'Tetracyclines chelate calcium — may cause fetal tooth discoloration and bone growth inhibition.',
  },
  {
    drugTerms: ['ace inhibitor', 'enalapril', 'benazepril'],
    severity: 'CRITICAL',
    message: 'ACE inhibitors are fetotoxic — can cause renal dysgenesis in developing fetuses.',
  },
  {
    drugTerms: ['ketoconazole', 'itraconazole'],
    severity: 'MODERATE',
    message: 'Azole antifungals may be teratogenic — avoid during pregnancy.',
  },
  {
    drugTerms: ['cisplatin', 'carboplatin', 'cyclophosphamide', 'vincristine', 'doxorubicin'],
    severity: 'CRITICAL',
    message: 'Chemotherapeutic agents are teratogenic/embryotoxic — contraindicated in pregnancy.',
  },
];

/**
 * @param {object} drug
 * @param {boolean} isPregnant
 * @param {string} [trimester]
 * @returns {Array<{type, severity, message}>}
 */
export function checkDrugPregnancyRules(drug, isPregnant, trimester) {
  if (!isPregnant) return [];
  const alerts = [];

  for (const rule of DRUG_PREGNANCY_RULES) {
    if (!nameOrClassMatches(drug, rule.drugTerms)) continue;
    alerts.push({
      type: 'drug-pregnancy',
      severity: rule.severity,
      message: rule.message + (trimester ? ` (Trimester: ${trimester})` : ''),
    });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════
// 4. Allergy / Cross-Reactivity Rules
// ═══════════════════════════════════════════════════════════════

const ALLERGY_CROSS_REACTIVITY = [
  // Penicillin → cephalosporin cross-reactivity (~1-10%)
  {
    allergyTerms: ['penicillin', 'amoxicillin', 'ampicillin', 'amoxicillin-clavulanate'],
    drugTerms: ['cephalosporin', 'cephalexin', 'cefazolin', 'cefovecin', 'cefpodoxime', 'ceftriaxone'],
    severity: 'MODERATE',
    message: 'Possible cross-reactivity between penicillins and cephalosporins (1-10% risk). Monitor for hypersensitivity.',
  },
  // Cephalosporin → penicillin cross-reactivity
  {
    allergyTerms: ['cephalosporin', 'cephalexin', 'cefazolin', 'cefovecin', 'cefpodoxime'],
    drugTerms: ['penicillin', 'amoxicillin', 'ampicillin', 'amoxicillin-clavulanate'],
    severity: 'MODERATE',
    message: 'Possible cross-reactivity between cephalosporins and penicillins. Monitor for hypersensitivity.',
  },
  // Sulfonamide allergy
  {
    allergyTerms: ['sulfonamide', 'sulfamethoxazole', 'trimethoprim-sulfa', 'tmp-smx'],
    drugTerms: ['sulfonamide', 'sulfamethoxazole', 'sulfadiazine', 'sulfadimethoxine', 'trimethoprim-sulfa'],
    severity: 'CRITICAL',
    message: 'Patient has documented sulfonamide allergy — all sulfonamide antibiotics are contraindicated.',
  },
  // NSAID allergy
  {
    allergyTerms: ['nsaid', 'carprofen', 'meloxicam', 'aspirin'],
    drugTerms: ['nsaid', 'carprofen', 'meloxicam', 'deracoxib', 'firocoxib', 'ketoprofen',
                'piroxicam', 'robenacoxib', 'aspirin'],
    severity: 'CRITICAL',
    message: 'Patient has a documented NSAID allergy — cross-reactivity between NSAIDs is common.',
  },
  // Fluoroquinolone allergy
  {
    allergyTerms: ['fluoroquinolone', 'enrofloxacin', 'marbofloxacin'],
    drugTerms: ['fluoroquinolone', 'enrofloxacin', 'marbofloxacin', 'orbifloxacin', 'pradofloxacin', 'ciprofloxacin'],
    severity: 'CRITICAL',
    message: 'Patient has a documented fluoroquinolone allergy — avoid all fluoroquinolones.',
  },
];

/**
 * @param {object} drug
 * @param {string[]} allergies
 * @returns {Array<{type, severity, message, allergen}>}
 */
export function checkAllergyRules(drug, allergies) {
  if (!allergies || allergies.length === 0) return [];
  const alerts = [];

  // Direct match — drug name/class matches an allergy exactly
  for (const allergy of allergies) {
    if (nameOrClassMatches(drug, [allergy])) {
      alerts.push({
        type: 'drug-allergy',
        severity: 'CRITICAL',
        message: `Patient has a documented allergy to "${allergy}" — this drug matches directly.`,
        allergen: allergy,
      });
    }
  }

  // Cross-reactivity
  for (const rule of ALLERGY_CROSS_REACTIVITY) {
    const hasAllergy = allergies.some(a =>
      rule.allergyTerms.some(t => a.toLowerCase().includes(t.toLowerCase()))
    );
    if (!hasAllergy) continue;
    if (!nameOrClassMatches(drug, rule.drugTerms)) continue;

    // Avoid double-alerting if we already caught a direct match
    const already = alerts.some(a => a.type === 'drug-allergy');
    if (!already) {
      const matchedAllergy = allergies.find(a =>
        rule.allergyTerms.some(t => a.toLowerCase().includes(t.toLowerCase()))
      );
      alerts.push({
        type: 'drug-allergy',
        severity: rule.severity,
        message: rule.message,
        allergen: matchedAllergy,
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════
// 5. Drug-Food Interaction Rules
// ═══════════════════════════════════════════════════════════════

const DRUG_FOOD_RULES = [
  {
    drugTerms: ['doxycycline'],
    message: 'Doxycycline absorption is reduced by dairy products and antacids containing calcium, magnesium, or aluminum. Administer on an empty stomach or 2 hours apart from meals.',
  },
  {
    drugTerms: ['tetracycline', 'oxytetracycline'],
    message: 'Tetracyclines chelate divalent cations (Ca²⁺, Mg²⁺, Fe²⁺) in food, reducing bioavailability. Give 1-2 hours before feeding.',
  },
  {
    drugTerms: ['fluoroquinolone', 'enrofloxacin', 'marbofloxacin', 'orbifloxacin'],
    message: 'Fluoroquinolone absorption may be reduced by concurrent administration with foods high in calcium or magnesium.',
  },
  {
    drugTerms: ['theophylline', 'aminophylline'],
    message: 'High-fat meals can alter theophylline absorption rate. Maintain consistent feeding schedule during therapy.',
  },
  {
    drugTerms: ['sucralfate'],
    message: 'Sucralfate should be given on an empty stomach (1 hour before meals) for optimal mucosal binding.',
  },
  {
    drugTerms: ['metronidazole'],
    message: 'Metronidazole may be better tolerated when given with food to reduce GI upset, but this may slightly delay absorption.',
  },
  {
    drugTerms: ['griseofulvin'],
    message: 'Griseofulvin absorption is enhanced by high-fat meals — administer with food for optimal bioavailability.',
  },
  {
    drugTerms: ['itraconazole'],
    message: 'Itraconazole (capsule form) requires gastric acidity for absorption — administer with food. Oral solution is absorbed better on an empty stomach.',
  },
  {
    drugTerms: ['ketoconazole'],
    message: 'Ketoconazole requires acidic gastric pH for dissolution — give with food and avoid concurrent antacids or H2-blockers.',
  },
];

/**
 * @param {object} drug
 * @returns {Array<{type, message}>}
 */
export function checkDrugFoodRules(drug) {
  const alerts = [];

  for (const rule of DRUG_FOOD_RULES) {
    if (nameOrClassMatches(drug, rule.drugTerms)) {
      alerts.push({
        type: 'drug-food',
        message: rule.message,
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════
// 6. Gender / Neuter Status Rules
// ═══════════════════════════════════════════════════════════════

const GENDER_RULES = [
  // Testosterone / anabolic steroids in intact females
  {
    drugTerms: ['testosterone', 'nandrolone', 'stanozolol', 'anabolic steroid'],
    sex: 'female',
    neuteredOnly: false,
    severity: 'MODERATE',
    message: 'Androgen/anabolic steroids in intact females may cause masculinization, clitoral hypertrophy, and behavioral changes.',
  },
  // Estrogen in intact males
  {
    drugTerms: ['diethylstilbestrol', 'des', 'estradiol', 'estrogen'],
    sex: 'male',
    neuteredOnly: false,
    severity: 'MODERATE',
    message: 'Estrogens in males may cause feminization, bone marrow suppression, and prostatic changes.',
  },
  // DES typically used in spayed females for incontinence
  {
    drugTerms: ['diethylstilbestrol', 'des'],
    sex: 'female',
    neuteredOnly: true,
    severity: 'MODERATE',
    message: 'DES for urinary incontinence: monitor for bone marrow suppression (aplastic anemia risk). Use lowest effective dose.',
  },
  // Progestins in intact females
  {
    drugTerms: ['megestrol', 'medroxyprogesterone', 'progestin', 'progestagen'],
    sex: 'female',
    neuteredOnly: false,
    severity: 'MODERATE',
    message: 'Progestins in intact females increase risk of pyometra, mammary neoplasia, diabetes mellitus, and adrenocortical suppression.',
  },
];

/**
 * @param {object} drug
 * @param {string} sex 'male' | 'female'
 * @param {boolean} isNeutered
 * @returns {Array<{type, severity, message}>}
 */
export function checkGenderRules(drug, sex, isNeutered) {
  if (!sex) return [];
  const alerts = [];

  for (const rule of GENDER_RULES) {
    if (rule.sex !== sex.toLowerCase()) continue;
    if (!nameOrClassMatches(drug, rule.drugTerms)) continue;

    if (rule.neuteredOnly && !isNeutered) continue;
    if (!rule.neuteredOnly && isNeutered) continue;

    alerts.push({
      type: 'drug-gender',
      severity: rule.severity,
      message: rule.message,
    });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════
// 7. Lab Interference Rules
// ═══════════════════════════════════════════════════════════════

const LAB_INTERFERENCE_RULES = [
  {
    drugTerms: ['corticosteroid', 'prednis', 'dexamethasone', 'methylprednisolone'],
    message: 'Corticosteroids: ↑ ALP (steroid-induced isoenzyme), ↑ glucose, ↓ T4, stress leukogram (neutrophilia, lymphopenia, eosinopenia). May invalidate LDDS/ACTH stim testing.',
  },
  {
    drugTerms: ['phenobarbital', 'phenobarbitone'],
    message: 'Phenobarbital: induces hepatic enzymes → ↑ ALP, ↑ GGT, ↓ T4 (enhanced metabolism). May mimic hepatic disease or hypothyroidism on panels.',
  },
  {
    drugTerms: ['furosemide', 'loop diuretic'],
    message: 'Loop diuretics: may cause ↓ K⁺, ↓ Na⁺, ↓ Cl⁻, ↑ BUN, ↑ creatinine (prerenal azotemia). Electrolyte panels may be altered.',
  },
  {
    drugTerms: ['methimazole', 'thiamazole'],
    message: 'Methimazole: correcting hyperthyroidism may unmask underlying renal disease (↑ BUN/creatinine) due to reduced GFR.',
  },
  {
    drugTerms: ['heparin'],
    message: 'Heparin interferes with coagulation assays (PT, aPTT). May cause falsely elevated potassium in some analyzers.',
  },
  {
    drugTerms: ['cephalosporin', 'cephalexin', 'cefazolin', 'cefovecin'],
    message: 'Some cephalosporins may cause false-positive urine glucose (copper reduction method) and false-positive direct Coombs test.',
  },
  {
    drugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib'],
    message: 'NSAIDs: monitor renal values (BUN, creatinine, SDMA) and liver enzymes (ALT, ALP) during chronic therapy.',
  },
  {
    drugTerms: ['aminoglycoside', 'gentamicin', 'amikacin'],
    message: 'Aminoglycosides: monitor BUN, creatinine, urinalysis (casts, proteinuria) for nephrotoxicity. TDM (peak/trough) recommended.',
  },
];

/**
 * @param {object} drug
 * @returns {Array<{type, message}>}
 */
export function checkLabInterference(drug) {
  const alerts = [];

  for (const rule of LAB_INTERFERENCE_RULES) {
    if (nameOrClassMatches(drug, rule.drugTerms)) {
      alerts.push({
        type: 'lab-interference',
        message: rule.message,
      });
    }
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════
// 8. Washout Period Rules
// ═══════════════════════════════════════════════════════════════

const WASHOUT_RULES = [
  // NSAID → NSAID washout (3-7 days)
  {
    newDrugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib',
                   'ketoprofen', 'piroxicam', 'robenacoxib'],
    currentMedTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib',
                      'ketoprofen', 'piroxicam', 'robenacoxib', 'aspirin'],
    washoutDays: 5,
    severity: 'CRITICAL',
    message: 'A 3-7 day washout period is required when switching between NSAIDs to prevent GI ulceration/perforation.',
  },
  // NSAID → Corticosteroid (or vice versa)
  {
    newDrugTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib'],
    currentMedTerms: ['corticosteroid', 'prednis', 'dexamethasone', 'methylprednisolone'],
    washoutDays: 5,
    severity: 'CRITICAL',
    message: 'A washout period is critical between NSAIDs and corticosteroids — concurrent use dramatically increases GI ulceration risk.',
  },
  {
    newDrugTerms: ['corticosteroid', 'prednis', 'dexamethasone', 'methylprednisolone'],
    currentMedTerms: ['nsaid', 'meloxicam', 'carprofen', 'deracoxib', 'firocoxib'],
    washoutDays: 5,
    severity: 'CRITICAL',
    message: 'A washout period is critical between corticosteroids and NSAIDs — concurrent use dramatically increases GI ulceration risk.',
  },
  // MAO-I → serotonergic drug
  {
    newDrugTerms: ['ssri', 'fluoxetine', 'sertraline', 'tramadol', 'trazodone',
                   'serotonin', 'clomipramine'],
    currentMedTerms: ['mao inhibitor', 'selegiline', 'amitraz'],
    washoutDays: 14,
    severity: 'CRITICAL',
    message: 'A 14-day washout is required after MAO inhibitors before starting serotonergic drugs — risk of serotonin syndrome.',
  },
  // Serotonergic → MAO-I
  {
    newDrugTerms: ['mao inhibitor', 'selegiline', 'amitraz'],
    currentMedTerms: ['ssri', 'fluoxetine', 'sertraline', 'tramadol', 'trazodone', 'clomipramine'],
    washoutDays: 14,
    severity: 'CRITICAL',
    message: 'A 14-day washout is required after serotonergic drugs before starting MAO inhibitors — risk of serotonin syndrome.',
  },
  // Fluoxetine specifically has long half-life
  {
    newDrugTerms: ['selegiline', 'mao inhibitor', 'tramadol'],
    currentMedTerms: ['fluoxetine'],
    washoutDays: 35,
    severity: 'CRITICAL',
    message: 'Fluoxetine has a long half-life (active metabolite norfluoxetine). A 5-week washout is recommended before MAO-I or serotonergic drugs.',
  },
];

function medMatchesTerms(med, terms) {
  const name = (med.drug_name || med.name || '').toLowerCase();
  const cls = (med.drug_class || med.class || '').toLowerCase();
  return terms.some(t => {
    const lc = t.toLowerCase();
    return name.includes(lc) || cls.includes(lc);
  });
}

/**
 * @param {object} drug  - the NEW drug being prescribed
 * @param {Array} currentMedications - patient's current/recent medications
 * @returns {Array<{type, severity, message, washoutDays}>}
 */
export function checkWashoutRules(drug, currentMedications) {
  if (!currentMedications || currentMedications.length === 0) return [];
  const alerts = [];

  for (const rule of WASHOUT_RULES) {
    if (!nameOrClassMatches(drug, rule.newDrugTerms)) continue;

    for (const med of currentMedications) {
      if (!medMatchesTerms(med, rule.currentMedTerms)) continue;

      // Check stop_date to see if within washout window
      if (med.stop_date) {
        const stopDate = new Date(med.stop_date);
        const now = new Date();
        const daysSinceStopped = (now - stopDate) / (1000 * 60 * 60 * 24);
        if (daysSinceStopped >= rule.washoutDays) continue; // washout complete
      }

      // Still active or within washout period
      const medName = med.drug_name || med.name || 'unknown';
      alerts.push({
        type: 'washout',
        severity: rule.severity,
        message: `${rule.message} Current/recent medication: ${medName}.`,
        washoutDays: rule.washoutDays,
      });
      break; // one alert per rule is sufficient
    }
  }

  return alerts;
}
