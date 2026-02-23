export const PATIENT_DATA = {
  name: "Max",
  species: "Canine",
  breed: "Shetland Sheepdog",
  weight: "5.2 kg",
  age: "4y 2m",
  sex: "Male Neutered",
  hr: "102 bpm",
  temp: "101.4 °F",
  allergies: ["Penicillin", "Sulfonamides"],
  conditions: ["Early Stage Renal Failure", "MDR1 Deficient"],
  history: "Recent lethargy, chronic renal monitoring. Patient carries ABCB1-1Δ (MDR1) mutation.",
  labResults: { creatinine: "1.8 mg/dL", bun: "32 mg/dL", usg: "1.018", alt: "45 U/L" }
};

export const INITIAL_PRESCRIPTION = [
  { id: 1, name: "Ivermectin", dosage: "0.5", unit: "mg/kg", freq: "SID", category: "Antiparasitic" }
];
