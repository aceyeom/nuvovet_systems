# NuvoVet DUR Engine Audit

## Audit Date: 2026-03-18

## Summary of Pre-Existing Engine Capabilities (v1.0)

The DUR engine (`durEngine.js`) before the clinical stress test implementation supported:

- Pairwise DDI detection via a static `INTERACTION_MATRIX`
- 8 rule types: duplicate NSAID, NSAID+corticosteroid, CYP3A4 inhibition, CYP2D6 inhibition, serotonin syndrome, QT stacking, electrolyte DDI (K-depleting + digoxin), renal elimination stacking, bleeding risk stacking, CYP induction
- Per-drug flags: off-label, foreign, unknown, species notes, NTI, MDR1 (species=dog, unbreeds)
- Function signature: `runFullDURAnalysis(drugs, species, weightKg)` — NO patient context

## Pre-Existing Gaps Identified

| Gap | Category | Severity |
|-----|----------|----------|
| No patient breed input to engine | Pharmacogenetic | Critical |
| No patient age input to engine | Developmental | Critical |
| No patient conditions input to engine | Drug-disease | Critical |
| No creatinine/ALT lab values to engine | Dose adjustment | Critical |
| No prescribed dose per kg passed to engine | Dose ceiling | Critical |
| No species dose ceiling check | Species-specific | High |
| No drug-disease contraindication matching | Drug-disease | High |
| No triple-drug additive stacking detection | Toxicity | High |
| No lab interference alert type | Lab interference | Medium |
| No condition-drug monitoring alerts | Monitoring | Medium |
| rawContraindications not exposed by mapper | Architecture | High |
| speciesDoseCeil not calculated by mapper | Architecture | High |
| patientAlerts section not rendered in UI | UI | High |

## Post-Stress-Test Fixes Applied (v2.0)

### Backend (drug_mapper.py)
- Added `rawContraindications`: full list of `{condition, matchTerms, severity, action}` per drug
- Added `speciesDoseCeil.{dog,cat}`: minimum `max_dose_mg_kg` across dosage_list entries
- Added `macrocyclicLactone`: bool flag for MDR1-sensitive antiparasitic drugs
- Added `sectionHighlights`: schema highlights text for dose ceiling parsing

### Frontend Engine (durEngine.js)
- Extended signature: `runFullDURAnalysis(drugs, species, weightKg, patient = {})`
- Added `patientAlerts: []` to results structure
- Added `generatePerDrugPatientAlerts()`: patient-context checks for breed, age, conditions, creatinine, dose ceiling
- Added `generateMultiDrugAlerts()`: triple-nephrotoxic, triple-sedation, MDR1+P-gp
- Added fluoroquinolone+antacid chelation pairwise rule
- Added dual K-sparing hyperkalemia rule
- Added aminoglycoside + loop diuretic ototoxicity/nephrotoxicity rule
- Updated QT rule to explicitly name Torsades de pointes
- Updated NSAID+Corticosteroid rule to explicitly name GI perforation

### Frontend UI (ResultsDisplay.jsx)
- Added `PatientAlertCard` component with type badges and severity styling
- Added `patientAlerts` section in main results content
- Updated `SeverityBanner` to include patientAlerts in counts
- Severity-3 / Critical patient alerts use red border with left accent stripe

### FullSystem.jsx
- Both `runFullDURAnalysis` call sites updated to pass `patientCtx = {breed, ageNum, ageUnit, conditions, creatinine, alt}`
