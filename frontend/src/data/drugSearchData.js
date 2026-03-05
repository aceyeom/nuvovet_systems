/**
 * Drug search data aligned with DUR_DATABASE_아키텍쳐_v2.md schema.
 * Structure mirrors: products → product_variants → substances
 */

export const DRUG_SEARCH_CATALOG = [
  {
    product_id: 'apoquel_001',
    korean_name_base: '아포퀠',
    english_name_base: 'Apoquel',
    manufacturer: 'Zoetis',
    substance: {
      inn_name: 'Oclacitinib',
      drug_class: 'Immunosuppressant',
      subclass: 'JAK Inhibitor',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Tablet',
    variants: [
      { variant_id: 'apoquel_3.6', strength_value: 3.6, strength_unit: 'mg', license_status: 'foreign', is_prescription_only: true },
      { variant_id: 'apoquel_5.4', strength_value: 5.4, strength_unit: 'mg', license_status: 'foreign', is_prescription_only: true },
      { variant_id: 'apoquel_16', strength_value: 16, strength_unit: 'mg', license_status: 'foreign', is_prescription_only: true },
    ],
    drug_db_id: 'oclacitinib',
  },
  {
    product_id: 'cerenia_001',
    korean_name_base: '세레니아',
    english_name_base: 'Cerenia',
    manufacturer: 'Zoetis',
    substance: {
      inn_name: 'Maropitant',
      drug_class: 'Antiemetic',
      subclass: 'NK1 Antagonist',
    },
    route_of_administration: 'Oral, SC',
    dosage_form: 'Tablet, Injectable',
    variants: [
      { variant_id: 'cerenia_16', strength_value: 16, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'cerenia_24', strength_value: 24, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'cerenia_60', strength_value: 60, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'cerenia_inj', strength_value: 10, strength_unit: 'mg/ml', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'maropitant',
  },
  {
    product_id: 'carprofen_001',
    korean_name_base: '카프로펜',
    english_name_base: 'Carprofen',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Carprofen',
      drug_class: 'NSAID',
      subclass: 'Propionic acid derivative',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Tablet',
    variants: [
      { variant_id: 'carprofen_25', strength_value: 25, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'carprofen_50', strength_value: 50, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'carprofen_100', strength_value: 100, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'carprofen',
  },
  {
    product_id: 'prednisolone_001',
    korean_name_base: '프레드니솔론',
    english_name_base: 'Prednisolone',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Prednisolone',
      drug_class: 'Corticosteroid',
      subclass: 'Glucocorticoid',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Tablet',
    variants: [
      { variant_id: 'pred_5', strength_value: 5, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'pred_20', strength_value: 20, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'prednisolone',
  },
  {
    product_id: 'meloxicam_001',
    korean_name_base: '멜록시캄',
    english_name_base: 'Meloxicam',
    manufacturer: 'Boehringer Ingelheim',
    substance: {
      inn_name: 'Meloxicam',
      drug_class: 'NSAID',
      subclass: 'Oxicam',
    },
    route_of_administration: 'Oral, SC',
    dosage_form: 'Oral suspension, Injectable',
    variants: [
      { variant_id: 'melox_oral', strength_value: 1.5, strength_unit: 'mg/ml', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'melox_inj', strength_value: 5, strength_unit: 'mg/ml', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'meloxicam',
  },
  {
    product_id: 'phenobarbital_001',
    korean_name_base: '페노바르비탈',
    english_name_base: 'Phenobarbital',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Phenobarbital',
      drug_class: 'Anticonvulsant',
      subclass: 'Barbiturate',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Tablet',
    variants: [
      { variant_id: 'pheno_15', strength_value: 15, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'pheno_30', strength_value: 30, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'pheno_60', strength_value: 60, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'phenobarbital',
  },
  {
    product_id: 'metronidazole_001',
    korean_name_base: '메트로니다졸',
    english_name_base: 'Metronidazole',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Metronidazole',
      drug_class: 'Antibiotic',
      subclass: 'Nitroimidazole',
    },
    route_of_administration: 'Oral, IV',
    dosage_form: 'Tablet, Injectable',
    variants: [
      { variant_id: 'metro_250', strength_value: 250, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'metro_500', strength_value: 500, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'metronidazole',
  },
  {
    product_id: 'ketoconazole_001',
    korean_name_base: '케토코나졸',
    english_name_base: 'Ketoconazole',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Ketoconazole',
      drug_class: 'Antifungal',
      subclass: 'Azole',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Tablet',
    variants: [
      { variant_id: 'keto_200', strength_value: 200, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'ketoconazole',
  },
  {
    product_id: 'furosemide_001',
    korean_name_base: '푸로세미드',
    english_name_base: 'Furosemide',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Furosemide',
      drug_class: 'Diuretic',
      subclass: 'Loop diuretic',
    },
    route_of_administration: 'Oral, SC',
    dosage_form: 'Tablet, Injectable',
    variants: [
      { variant_id: 'furo_20', strength_value: 20, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'furo_40', strength_value: 40, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'furosemide',
  },
  {
    product_id: 'cyclosporine_001',
    korean_name_base: '사이클로스포린',
    english_name_base: 'Cyclosporine (Atopica)',
    manufacturer: 'Elanco',
    substance: {
      inn_name: 'Cyclosporine',
      drug_class: 'Immunosuppressant',
      subclass: 'Calcineurin inhibitor',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Capsule',
    variants: [
      { variant_id: 'cyclo_25', strength_value: 25, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'cyclo_50', strength_value: 50, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'cyclo_100', strength_value: 100, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'cyclosporine',
  },
  {
    product_id: 'gabapentin_001',
    korean_name_base: '가바펜틴',
    english_name_base: 'Gabapentin',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Gabapentin',
      drug_class: 'Anticonvulsant',
      subclass: 'GABA analog',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Capsule',
    variants: [
      { variant_id: 'gaba_100', strength_value: 100, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'gaba_300', strength_value: 300, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'gabapentin',
  },
  {
    product_id: 'tramadol_001',
    korean_name_base: '트라마돌',
    english_name_base: 'Tramadol',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Tramadol',
      drug_class: 'Analgesic',
      subclass: 'Opioid',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Tablet',
    variants: [
      { variant_id: 'tram_50', strength_value: 50, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'tramadol',
  },
  {
    product_id: 'amoxicillin_001',
    korean_name_base: '아목시실린',
    english_name_base: 'Amoxicillin',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Amoxicillin',
      drug_class: 'Antibiotic',
      subclass: 'Beta-lactam',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Tablet',
    variants: [
      { variant_id: 'amox_250', strength_value: 250, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'amox_500', strength_value: 500, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'amoxicillin',
  },
  {
    product_id: 'enrofloxacin_001',
    korean_name_base: '엔로플록사신',
    english_name_base: 'Enrofloxacin',
    manufacturer: 'Bayer',
    substance: {
      inn_name: 'Enrofloxacin',
      drug_class: 'Antibiotic',
      subclass: 'Fluoroquinolone',
    },
    route_of_administration: 'Oral, SC',
    dosage_form: 'Tablet, Injectable',
    variants: [
      { variant_id: 'enro_50', strength_value: 50, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'enro_150', strength_value: 150, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'enrofloxacin',
  },
  {
    product_id: 'trazodone_001',
    korean_name_base: '트라조돈',
    english_name_base: 'Trazodone',
    manufacturer: 'Various',
    substance: {
      inn_name: 'Trazodone',
      drug_class: 'Sedative',
      subclass: 'SARI',
    },
    route_of_administration: 'Oral',
    dosage_form: 'Tablet',
    variants: [
      { variant_id: 'traz_50', strength_value: 50, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
      { variant_id: 'traz_100', strength_value: 100, strength_unit: 'mg', license_status: 'korean_approved', is_prescription_only: true },
    ],
    drug_db_id: 'trazodone',
  },
];

// Allergy data aligned with substance_synonyms and allergy_class_members
export const ALLERGY_SEARCH_DATA = [
  { id: 'penicillin', name: 'Penicillin', type: 'substance', class: 'Beta-lactam' },
  { id: 'amoxicillin_allergy', name: 'Amoxicillin', type: 'substance', class: 'Beta-lactam' },
  { id: 'beta_lactam_class', name: 'Beta-lactam class', type: 'class', members: ['Penicillin', 'Amoxicillin', 'Ampicillin', 'Cephalosporins'] },
  { id: 'sulfonamide_class', name: 'Sulfonamide class', type: 'class', members: ['Sulfamethoxazole', 'Sulfadiazine'] },
  { id: 'nsaid_class', name: 'NSAID class', type: 'class', members: ['Meloxicam', 'Carprofen', 'Firocoxib', 'Ketoprofen'] },
  { id: 'fluoroquinolone_class', name: 'Fluoroquinolone class', type: 'class', members: ['Enrofloxacin', 'Marbofloxacin', 'Pradofloxacin'] },
  { id: 'tetracycline', name: 'Tetracycline', type: 'substance', class: 'Tetracycline' },
  { id: 'metronidazole_allergy', name: 'Metronidazole', type: 'substance', class: 'Nitroimidazole' },
];

// Search products
export function searchDrugCatalog(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase().trim();

  return DRUG_SEARCH_CATALOG.filter(product => {
    return (
      product.english_name_base.toLowerCase().includes(q) ||
      product.korean_name_base.includes(q) ||
      product.substance.inn_name.toLowerCase().includes(q) ||
      product.substance.drug_class.toLowerCase().includes(q)
    );
  });
}

// Search allergies
export function searchAllergies(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase().trim();

  return ALLERGY_SEARCH_DATA.filter(item => {
    return (
      item.name.toLowerCase().includes(q) ||
      (item.class && item.class.toLowerCase().includes(q)) ||
      (item.members && item.members.some(m => m.toLowerCase().includes(q)))
    );
  });
}
