# NuvoVet DUR Engine — Deep Technical Audit
**Audit Date:** 2026-04-04  
**Auditor:** Claude Code (automated static analysis)  
**Branch:** `claude/audit-dur-engine-cleanup-1U6MY`

---

## Table of Contents
1. [Repository Structure Map](#step-1--repository-structure-map)
2. [Database Schema](#step-2--database-schema)
3. [DUR Engine Traces](#step-3--dur-engine-traces)
4. [Data Coverage Evaluation](#step-4--data-coverage-evaluation)
5. [Failure Mode Analysis](#step-5--failure-mode-analysis)
6. [Data Pipeline Evaluation](#step-6--data-pipeline-evaluation)
7. [Audit Report](#step-7--audit-report)

---

## STEP 1 — Repository Structure Map

### Database Schema Files
| File | Description |
|------|-------------|
| `backend/auth.py` (lines 60–193) | Creates 3 PostgreSQL tables on startup: `accounts`, `account_patients`, `patient_medications` |
| `backend/services/drug_sync.py` | Creates `drugs` and `drug_references` tables; syncs JSONL → PostgreSQL |
| `backend/data/drug_data_schema_final.json` | JSON Schema definition for the JSONL drug record format (v1) |

### Engine Logic Files
| File | Description |
|------|-------------|
| `frontend/src/utils/durEngine.js` | Main DUR engine (930 lines): pairwise DDI matrix (10 rules) + 29 per-drug patient-context alert generators; entry point `runFullDURAnalysis()` |
| `frontend/src/utils/drugClassRules.js` | 8 supplemental rule-checker functions (drug-disease, age, pregnancy, allergy, food, gender, lab interference, washout) |
| `backend/services/drug_mapper.py` | Maps raw JSONL drug records to the frontend Drug contract (450+ fields); critical bridge between database and engine |

### Data Source Files
| File | Description |
|------|-------------|
| `backend/data/converted/**/*.jsonl` | 862 JSONL files (one per drug), A–Z directories; primary drug knowledge base (~18 MB) |
| `backend/services/drug_loader.py` | Loads drugs from PostgreSQL (`drugs` table) with JSONL fallback; builds in-memory search index |
| `frontend/src/data/drugDatabase.js` | 28 curated demo drugs with hardcoded data; offline/demo fallback only |
| `frontend/src/data/breedProfiles.js` | 7 demo patient scenarios with pre-verified interactions |

### API Route Files
| File | Description |
|------|-------------|
| `backend/routers/drugs.py` | `GET /api/drugs/search`, `GET /api/drugs/{id}`, `GET /api/drugs` — drug search with multi-strategy scoring |
| `backend/routers/clinical.py` | `GET /api/breeds`, `GET /api/conditions`, `GET /api/allergies` — aggregated reference data from drug DB |
| `backend/routers/medications.py` | `GET/POST/PUT/DELETE /api/patients/{id}/medications` — patient medication CRUD |
| `backend/routers/ocr.py` | `POST /api/ocr/extract-patient` — Claude vision API for EMR screenshot parsing |
| `backend/routers/format_mechanism.py` | `POST /api/format/mechanism`, `/translate-korean`, `/owner-handout` — Claude-powered text formatting |
| `backend/auth.py` | `/api/auth/*` — JWT login, signup, patient profile CRUD |

### Test Files
**None exist.** No unit tests, integration tests, or automated test suite of any kind. `backend/scripts/audit_clinical_accuracy.py` and `check_dosage_false_positives.py` are manual audit scripts, not automated tests. Results are static JSON snapshots, not runnable assertions.

### Utility / Helper Files
| File | Description |
|------|-------------|
| `backend/services/fuzzy_search.py` | Trigram similarity + Korean Hangul jamo decomposition for drug name matching |
| `backend/services/drug_sync.py` | One-way JSONL → PostgreSQL sync; `sync_drug_data()` and `sync_reference_results()` |
| `backend/main.py` | FastAPI app factory, CORS config, router registration, startup sync trigger |
| `frontend/src/lib/api.js` | All backend API calls; base URL configuration |
| `frontend/src/lib/patientStorage.ts` | localStorage-based patient profile persistence (temporary measure, documented as such) |
| `frontend/src/i18n/` | Korean/English translation context (~250 keys each) |

---

## STEP 2 — Database Schema

### 2.1 PostgreSQL Tables (User/Patient Data)

**`accounts`** — One row per registered clinic user
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | TEXT | NOT NULL PK | UUID |
| username | TEXT | NOT NULL UNIQUE | Login identifier |
| password_hash | TEXT | NOT NULL | bcrypt, 12 rounds |
| plan_tier | TEXT | NOT NULL DEFAULT 'free' | |
| plan_status | TEXT | NOT NULL DEFAULT 'trial_not_started' | active / expired / trial_not_started |
| created_at | TIMESTAMPTZ | NOT NULL | |
| trial_starts_at | TIMESTAMPTZ | NULL | Set on `/start-trial` |
| trial_ends_at | TIMESTAMPTZ | NULL | NOW()+30d |
| account_data | JSONB | NOT NULL DEFAULT '{}' | Arbitrary metadata |

**`account_patients`** — Patient profiles, PK: (account_id, patient_id)
| Column | Type | FK | Notes |
|--------|------|----|-------|
| account_id | TEXT | → accounts(id) CASCADE | |
| patient_id | TEXT | — | Client-generated UUID |
| profile | JSONB | — | Full patient object. Missing conditions/breed/creatinine = no patient-context DUR alerts |
| created_at / updated_at | TIMESTAMPTZ | — | |

**`patient_medications`** — Medication records
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | TEXT PK | YES | UUID |
| account_id / patient_id | TEXT | YES | Account-scoped |
| drug_id | TEXT | NO | Links to drug DB; null if unknown drug |
| drug_name | TEXT | YES | Display name |
| dose / unit / route / frequency | TEXT | NO | **Null dose disables all dose-ceiling checks** |
| status | TEXT | YES | active / stopped / prn |
| start_date / stop_date | DATE | NO | stop_date used by washout engine |

### 2.2 Drug Reference Tables

**`drugs`** — Full JSONL records, one row per drug
| Column | Type | Notes |
|--------|------|-------|
| drug_id | TEXT PK | |
| name_ko | TEXT | Korean name (denormalized for search) |
| drug_class | TEXT | |
| full_data | JSONB | ~20 KB avg; entire drug record |

**`drug_references`** — PMC literature references
| Column | Type | Notes |
|--------|------|-------|
| drug_id | TEXT | No FK constraint to drugs table |
| pmc_id | TEXT | UNIQUE with drug_id |
| if_score | DOUBLE PRECISION | Impact factor |
| relevance_score | INTEGER 0–100 | Computed at sync time |
| raw_payload | JSONB | Full PMC response |

### 2.3 Schema Gaps

- **Most critical for DUR accuracy:** `drugs` / JSONL files. Every engine check depends on drug records.
- **Sparsely populated risk:** `drug_references` requires explicit sync; drugs table requires startup flag or admin call.
- **Missing tables the engine assumes:** None — fails gracefully to JSONL when PostgreSQL is unavailable.
- **No FK constraint** between `drug_references.drug_id` and `drugs.drug_id` — orphaned references possible after drug deletion.

---

## STEP 3 — DUR Engine Traces

### 3.1 DDI Engine (Drug-Drug Interaction)

**Entry point:** `runFullDURAnalysis()` → pairwise loop over `INTERACTION_MATRIX` (`durEngine.js:237`)

**Inputs:** Array of mapped drug objects. Required fields per drug: `class`, `cypProfile.inhibitor`, `cypProfile.substrate`, `additiveRisks`, `renalElimination`, `electrolyteEffect`, `narrowTherapeuticIndex`, `serotoninSyndromeRisk`, `mdr1Sensitive`, `rawInteractions`.

**Tables queried:** None at runtime — all drug data is pre-loaded into memory and passed as JavaScript objects from the frontend state.

**Trigger condition:** For each pair (A, B), each of the 10 `INTERACTION_MATRIX` rules is evaluated via its `match(a, b)` function. If `match()` returns true, a flag is generated.

**10 rules and their match conditions:**
1. `a.class === 'NSAID' && b.class === 'NSAID'` → CRITICAL
2. One NSAID + one Corticosteroid → CRITICAL
3. `a.cypProfile.inhibitor` includes CYP3A4/3A/3A12 AND `b.cypProfile.substrate` includes same → MODERATE
4. Same as #3 but for CYP2D6 → MODERATE
5. `a.serotoninSyndromeRisk && b.serotoninSyndromeRisk` → CRITICAL
6. Both drugs have `riskFlags.qtProlongation === 'high'` → CRITICAL
7. `a.electrolyteEffect === 'k_depleting' && b.narrowTherapeuticIndex` → MODERATE
8. `a.electrolyteEffect === 'k_sparing' && b.electrolyteEffect === 'k_sparing'` → MODERATE
9. Both `renalElimination >= 0.6` → MODERATE
10. `isAminoglycoside(a) && isLoopDiuretic(b)` (or vice versa) → CRITICAL

**Returned on flag:** `{ severity, rule, drug_a, drug_b, mechanism, recommendation, alternativeSuggestion, literatureSummary, literature[] }`. Mechanism and recommendation are dynamic functions that call `findRawInteractionEvidence()` to pull JSONL evidence strings.

**Returned when no flag:** Empty `interactions: []` array.

**Missing input handling:** If `drug.class` is undefined, class-based rules silently skip. If `cypProfile` is missing, CYP rules skip. No explicit null-guard error is thrown — the engine degrades silently.

**Drug not found in DB:** If searched drug is unknown, `drug.source === 'unknown'` and confidence score is reduced by 25 points. Interaction analysis still runs but no `rawInteractions` evidence is available.

**Hardcoded thresholds:**
- `renalElimination >= 0.6` at `durEngine.js:422` — threshold for renal stacking
- `confidenceAdjustment`: `-5` off-label, `-8` foreign, `-25` unknown (`durEngine.js:980–997`)
- K+ monitoring: "maintain >4.0 mEq/L" and "<5.5 mEq/L" — hardcoded in recommendation strings

### 3.2 Dosage Validation Engine

**Entry point:** `generatePerDrugPatientAlerts()` (`durEngine.js:486`)

**Inputs:** `drug` object, `species` ('dog'|'cat'), `weightKg`, `patient.ageNum`, `patient.ageUnit`, `drug.dosePerKg` (from prescription entry — optional).

**Tables queried at runtime:** None. Dose ranges come from `drug.speciesDoseCeil[species]` and `drug.dosageList[species]` — pre-mapped from JSONL in `drug_mapper.py`.

**Trigger condition:** `dosePerKg > drug.speciesDoseCeil[species]`. Two hardcoded drug-specific checks:
- Enrofloxacin in cats: dose > 5 mg/kg → CRITICAL (`durEngine.js:659–683`)
- Metronidazole in dogs: dose > 60 mg/kg/day → CRITICAL (`durEngine.js:744–757`)
- General dose ceiling: `dosePerKg > drug.speciesDoseCeil[species]` → MODERATE

**If no dose entered:** Enrofloxacin in cats fires a MODERATE caution regardless (no dose = unverified). Other dose checks are skipped entirely.

**If patient has no weight recorded:** `weightKg` is passed as null/0. Dose-ceiling checks use `dosePerKg` directly (mg/kg units), so weight is only needed for display of total mg — the ceiling comparison itself still works.

**Age-based dosing:** Handled via `checkDrugAgeRules()` (`drugClassRules.js:278`) — checks against 6 age rules (fluoroquinolones in puppies/kittens, NSAIDs in young dogs, phenobarbital in neonates, aminoglycosides in neonates, geriatric NSAID caution).

**Source of dose range data:** JSONL `dosage_and_kinetics.dog/cat.dosage_list[].max_dose_mg_kg` — sourced from Plumb's Veterinary Drug Handbook extraction pipeline. Route-specific variants exist per dosage_list entry.

### 3.3 Allergy Engine

**Entry point:** `checkAllergyRules(drug, allergies)` (`drugClassRules.js:430`)

**Inputs:** Single drug object, `patient.allergies[]` (array of strings entered by user).

**Tables queried:** None. Allergy data comes from `patient.allergies` passed at analysis time.

**Trigger — direct match:** `nameOrClassMatches(drug, [allergy])` — checks `drug.name`, `drug.class`, and `drug.id` for substring match against each allergy string → CRITICAL.

**Trigger — cross-reactivity:** 5 hardcoded cross-reactivity pairs (`ALLERGY_CROSS_REACTIVITY`, `drugClassRules.js:386`): penicillin↔cephalosporin, sulfonamide class, NSAID class, fluoroquinolone class → MODERATE or CRITICAL.

**What it does NOT check:** Cross-reactivity beyond the 5 hardcoded pairs. No structural similarity, no mechanism-based cross-reactivity. If a patient is allergic to "amoxicillin" and is prescribed ampicillin, this fires only because both are in the `allergyTerms` and `drugTerms` lists — there is no general beta-lactam cross-reactivity logic beyond the hardcoded entries.

**If allergies array is empty:** Returns `[]` immediately (`drugClassRules.js:431`).

### 3.4 Contraindication Engine

**Entry point:** Per-drug loop over `drug.rawContraindications` inside `generatePerDrugPatientAlerts()` (`durEngine.js:521–571`)

**Inputs:** `drug.rawContraindications[]` (from JSONL), `patient.conditions[]`.

**Tables queried:** `drug.rawContraindications` — populated from `contraindications[]` in each JSONL file, mapped by `drug_mapper.py` line ~228.

**Trigger condition:** `conditionMatches(patientCondition, contra.matchTerms)` — substring match between any patient condition string and any `matchTerm` in the contraindication (`durEngine.js:99–104`).

**Severity mapping:** `contra.severity === 'absolute' || contra.action === 'contraindicated'` → CRITICAL; otherwise MODERATE.

**Species filter:** Partially implemented. `speciesContraindicated` field exists in the drug mapper output (`drug_mapper.py:298`) but the contraindication loop in `durEngine.js:521` does NOT filter by species. A cat-specific contraindication would fire for a dog patient if the patient condition matches.

**If conditions array is empty:** No drug-disease alerts fire. Silent pass.

**Supplemental hardcoded contraindications** (`drugClassRules.js:36`): 15 additional drug-disease rules by drug name/class + condition keyword (NSAID+renal, beta-blocker+asthma, cisplatin in cats, etc.).

### 3.5 Therapeutic Duplication Engine

**Status: NOT IMPLEMENTED as a distinct engine.**

There is no dedicated therapeutic duplication check. The closest approximation is Rule 1 in `INTERACTION_MATRIX`: `a.class === 'NSAID' && b.class === 'NSAID'` (duplicate NSAID), which fires as a DDI CRITICAL. No general "same class" or "same indication" duplication logic exists for other drug classes (e.g., two ACE inhibitors, two anticonvulsants, two antibiotics of the same class).

---

## STEP 4 — Data Coverage Evaluation

### 4.1 DDI Engine Coverage

**Database statistics (computed from 862 JSONL files):**
- Total drugs loaded: 862 (641 successfully mapped; remainder have parse errors)
- Drugs with at least one interaction entry: 611 (70.9%)
- Drugs with zero interactions: 251 (29.1%)
- Total `drug_interactions[]` entries across all drugs: 5,908
- Unique bidirectional drug pairs covered: ~5,694

**Zero-interaction drugs include:** ophthalmic-only formulations (alcaftadine, besifloxacin, bimatoprost), excipients (benzyl_alcohol, alkamuls, butylhydroxytoluene), vaccines (bordetella_pertussis), and some duplicate/variant entries (carprofen_25mg, cephalexin_as_monohydrate, bethanechols).

**CYP450 handling:** Lookup-based, not inferred. CYP substrate/inhibitor/inducer status is stored per drug in `metabolism_and_clearance.cyp_profile`. Only 88 of 862 drugs (10.2%) have any CYP data populated. This means CYP-based DDI rules (Rules 3 and 4) can only fire when both interacting drugs are in this sparse 10.2% subset. For the majority of drug combinations, CYP interactions are silently missed.

**Pharmacodynamic vs pharmacokinetic interactions:** Not explicitly separated. The `drug_interactions[].keywords` array contains tags like "nephrotoxic", "serotonin", "qt_prolongation" that imply pharmacodynamic interaction, but the engine treats all interactions uniformly. The `additive_risks` flags (nephrotoxic, sedation, qt_prolongation, gi_ulcer, bleeding) handle some PD stacking separately.

**Drug class coverage (estimated):**
- NSAIDs: Well-covered (meloxicam 23 interactions, carprofen 17, enrofloxacin 24, phenobarbital 48)
- Antibiotics: Moderate (metronidazole 10, amoxicillin variable)
- Antifungals/CYP inhibitors: Sparse CYP data — major gap for ketoconazole/itraconazole interactions
- Oncology drugs: Sparse; cisplatin/carboplatin have minimal interaction data beyond species flags
- Ophthalmic drugs: Minimal — most have 0 interactions (appropriate for topical use)

### 4.2 Dosage Validation Coverage

- Drugs with species-specific dose ranges: 667 of 862 (77.4%)
- Dog dosage entries: 2,199 total across 667 drugs
- Cat dosage entries: 1,424 total across 667 drugs
- Route-specific dose limits: Present in `dosage_list[].route` field per entry (e.g., IV vs PO variants exist for metronidazole: 15 dog entries, 13 cat entries)
- Weight-based dosing: All doses stored as mg/kg — weight multiplication happens at display layer, not in DB
- Source: Plumb's Veterinary Drug Handbook 10th edition (PDF extraction pipeline); manually reviewed for high-risk drugs

**Gaps:** No IV dose limits for most drugs. No loading dose vs maintenance dose distinction in the DUR engine (exists in the schema as `context` field but the engine does not read it). No compounded formulation dose limits.

### 4.3 Contraindication Coverage

- Drugs with contraindications: 669 of 862 (77.6%)
- Patient conditions matched via `matchTerms[]` substring logic
- MDR1/ABCB1 genetic risk: Handled via `drug.mdr1Sensitive` boolean + `geneticSensitivity.affectedBreeds[]`. Breeds covered: Australian Shepherd, Collie, Border Collie, Shetland Sheepdog, Sheltie, Old English Sheepdog, German Shepherd, and others (`durEngine.js:48–53`). Drugs flagged: macrocyclic lactones primarily.
- Organ-specific contraindications (renal, hepatic): Present in JSONL `contraindications[]` for most NSAIDs, aminoglycosides, phenobarbital, ketoconazole, methimazole. Coverage is drug-dependent — not systematically complete.
- **Species filter gap:** The contraindication loop (`durEngine.js:521`) does not check whether a contraindication applies only to a specific species. A cat-only contraindication will fire for a dog if condition text matches.

### 4.4 Allergy Engine Coverage

- Allergy data source: Free-text strings entered by user; no structured allergy ontology
- Cross-reactivity coverage: 5 hardcoded pairs only (penicillin↔cephalosporin, sulfonamide, NSAID class, fluoroquinolone class, reverse cephalosporin→penicillin)
- No structural chemistry cross-reactivity. No mechanism-based inference.
- Direct match logic: substring of `drug.name`, `drug.class`, or `drug.id` — will catch "carprofen" if patient has "NSAID allergy" only because "nsaid" is in the `drugTerms` list. Will NOT catch it if allergy is recorded as "Rimadyl".

### 4.5 Therapeutic Duplication Coverage

Not implemented. Zero coverage. Only duplicate NSAIDs are caught (via DDI Rule 1). Two beta-blockers, two ACE inhibitors, two anticonvulsants, or two antibiotics of the same class would not be flagged.

---

## STEP 5 — Failure Mode Analysis

**1. Most likely silent miss of a dangerous interaction:**
A vet prescribes ketoconazole + cyclosporine. Both drugs have significant CYP3A4 involvement. However, only 10.2% of drugs have CYP data populated. If either drug's CYP profile is empty in the JSONL, the CYP inhibition rule (Rule 3) does not fire. The engine would return no DDI alert for a combination that can increase cyclosporine blood levels by 3–5× into nephrotoxic/neurotoxic range. This is the highest-risk silent failure mode.

**2. Most likely false positive:**
The `conditionMatches()` function uses bidirectional substring matching (`durEngine.js:101–103`). A patient condition entered as "mild hepatic elevation" would match a contraindication `matchTerm` of "hepatic" and fire a CRITICAL contraindication for a drug that is only contraindicated in severe hepatic failure. Clinical acceptability varies widely; the engine cannot distinguish severity grades of the same condition.

**3. Korean brand name → generic resolution:**
Search path in `backend/services/drug_loader.py:_build_search_index()` (line ~175): The search index includes `products_ko[]` (Korean product names from `drug_identity.product_names_ko`). Example: "메타캄" → maps to meloxicam. In `backend/routers/drugs.py:search_drugs()` (line ~80), product_ko names are checked for substring and exact matches with a score of 70–90. If the vet types a Korean brand name, it will resolve to the generic drug record provided the brand name is listed in `product_names_ko`. Coverage is incomplete — tramadol has no `product_names_ko` entries; furosemide has none. If a brand name is absent from the list, the search returns no results and the drug must be added as "unknown", disabling all interaction analysis.

**4. Dog-prescribed, cat-only contraindication:**
The contraindication engine at `durEngine.js:521–571` iterates `drug.rawContraindications[]` and checks `conditionMatches()`. It does NOT check a `species` filter on the contraindication itself. However, cat-specific absolute contraindications (bromide, oral diazepam, aspirin, enrofloxacin ceiling) are implemented as **hardcoded species guards** earlier in the same function — e.g., `if (species === 'cat' && ...)` at lines 686, 700, 703, 800. These are correct. The JSONL-driven `rawContraindications` path does not apply a species filter, but the critical species-specific cases are handled by the hardcoded guards, not by JSONL contraindications.

**5. No weight recorded + dosage engine:**
`weightKg` passed as `null` or `0`. Dose-ceiling checks compare `dosePerKg` (mg/kg) directly to `speciesDoseCeil` (mg/kg) — no weight multiplication needed, so weight absence does not break these checks. The metronidazole ceiling message includes a total-dose calculation: `dosePerKg * weightKg` (`durEngine.js:754`) — this would output `NaN mg/day` if weight is null. Functionally: ceiling check still fires correctly; display message degrades to NaN.

**6. Drug not in database:**
`drug.source === DRUG_SOURCE.UNKNOWN` → `flag.confidenceAdjustment = -25` (`durEngine.js:990`). Overall confidence score is reduced. The unknown drug flag is shown in the UI. **No interaction analysis is performed for the unknown drug** — it has no `class`, no `cypProfile`, no `rawInteractions`. Any interactions the unknown drug might have are silently missed. This is explicit but not surfaced as a warning to the user in the results — only shown as a flag.

**7. Test coverage:**
No automated tests exist. Running `pytest` or any test framework returns no results — there is no test runner configured and no test files. The manual audit scripts (`backend/scripts/audit_clinical_accuracy.py`, `check_dosage_false_positives.py`) produce JSON reports but are not runnable assertions. **Test coverage is 0%.**

---

## STEP 6 — Data Pipeline Evaluation

**1. How was the initial drug database populated?**
PDF extraction from Plumb's Veterinary Drug Handbook 10th edition. The pipeline split the PDF into per-drug page chunks (stored as `backend/scripts/plumbs_output/0–65.jsonl`, now deleted), then Claude was used to extract structured JSON from each chunk into the JSONL schema. Scripts: `backend/scripts/parse_korean_drugs.py`, `populate_drug_info.py`, `fix_drug_data.py`. Secondary sources: PMC (PubMed Central) literature for reference data and interaction evidence strings.

**2. How is Plumb's data represented?**
Structured fields. The PDF was extracted into discrete records: `dosage_and_kinetics.dog/cat.dosage_list[]` contains dose values, units, routes, and frequencies as structured data. Interaction evidence appears as free-text strings in `drug_interactions[].evidence`. This is not raw text storage — it is extracted and structured, though the quality of extraction varies by drug.

**3. How is PMC data used?**
Precomputed index stored in `drug_references` PostgreSQL table. The pipeline in `backend/scripts/recheck_failed_references.py` and `migrate_reference_metadata.py` ran PMC API queries per drug and stored results. At query time, `drug_loader.py` JOINs `drugs` with `drug_references` and attaches references to each drug record as `_reference_context`. There is no live RAG pipeline — it is static precomputed data. No vector embeddings, no semantic search over PMC content.

**4. When was the database last updated?**
The run logs (`runs/reference_chunks/missing_retry_153_20260323.json` — now deleted) indicate the most recent PMC reference sync completed around 2026-03-23. No automatic update mechanism exists. Updates require manually running the pipeline scripts and triggering admin reload. There is no versioning on drug records — no `updated_at` on JSONL files, no schema version field per drug.

**5. Korean brand name mapping:**
Stored in `drug_identity.product_names_ko[]` per JSONL file. Examples: meloxicam has `['페트캄 현탁액', '메타캄 현탁액', '메타캄 주사액']`; carprofen has `['케어오펫 정', '리마딜 츄어블 정']`. The search index in `drug_loader.py:_build_search_index()` includes `products_ko` alongside `name_ko`, `brands`, and `name_en`.

**Coverage gaps in Korean brand names:**
- tramadol: no `product_names_ko` entries (commonly prescribed in Korea as "트라마돌 HCl 정" under multiple brand names)
- furosemide: no `product_names_ko` entries (sold in Korea as "후로세미드 정", "라식스 정")
- phenobarbital: no `product_names_ko` entries
- prednisolone (systemic): no `product_names_ko` entries
- metronidazole: no `product_names_ko` entries

These are high-volume drugs in Korean small animal practice. If a vet types the Korean brand name, the search fails and the drug must be added as unknown.

---

## STEP 7 — Audit Report

### 7.1 Engine Architecture Summary

```
User Input: species + weightKg + patient context + selected drugs
        │
        ▼
Drug Search (backend/routers/drugs.py)
  → Exact/substring/fuzzy match against search index
  → drug_mapper.py: JSONL raw → Drug contract (450+ fields)
        │
        ▼
runFullDURAnalysis(drugs, species, weightKg, patient)   [durEngine.js]
        │
        ├── expandDrugsForAnalysis()
        │     └── Split multi-substance drugs (e.g., Temaril-P → Trimeprazine + Prednisolone)
        │
        ├── Per-drug flags
        │     └── Source badge (kr_vet / human_offlabel / foreign / unknown)
        │         Confidence score adjustment
        │
        ├── Pairwise DDI loop [INTERACTION_MATRIX, 10 rules]
        │     ├── Hits: drug.class, cypProfile, additiveRisks, electrolyteEffect,
        │     │         renalElimination, serotoninSyndromeRisk, rawInteractions
        │     └── → interactions[] with severity, mechanism, recommendation, literature
        │
        ├── generatePerDrugPatientAlerts() [per drug, 29 cases]
        │     ├── Hits: drug.rawContraindications (from JSONL contraindications[])
        │     │         drug.speciesDoseCeil, drug.additiveRisks, drug.mdr1Sensitive
        │     │         patient.breed, .conditions, .creatinine, .ageMonths, .dosePerKg
        │     └── → patientAlerts[] with type, severity, mechanism, recommendation
        │
        ├── checkDrugDiseaseRules / checkAllergyRules / etc. [drugClassRules.js]
        │     └── 8 supplemental checkers → additional patientAlerts[]
        │
        └── generateMultiDrugAlerts() [3 multi-drug rules]
              └── Triple nephrotoxic, triple sedation, MDR1+P-gp inhibitor
                        │
                        ▼
        Results: { interactions[], patientAlerts[], drugFlags[],
                   overallSeverity, confidenceScore }
                        │
                        ▼
        ResultsDisplay.jsx → UI rendering (severity-sorted cards)
```

### 7.2 Data Coverage Assessment

| Engine | Records in DB | Coverage Quality | Biggest Gap |
|--------|--------------|-----------------|-------------|
| DDI (pairwise) | 5,908 interaction entries; 5,694 unique pairs | Medium | CYP data only for 88/862 drugs (10.2%) — most CYP interactions silently missed |
| Dosage Validation | 2,199 dog + 1,424 cat dose entries across 667 drugs | Medium | Dose field is optional in prescriptions — ceiling checks disabled when dose not entered |
| Contraindication | 669/862 drugs have contraindication entries | Medium | No species filter on JSONL-driven contraindications; match is condition-text substring only |
| Allergy | 5 hardcoded cross-reactivity pairs | Low | No brand name allergy matching; structural cross-reactivity not modeled |
| Therapeutic Duplication | 1 rule (duplicate NSAID) | Low | Not implemented for any drug class except NSAIDs |

### 7.3 Confirmed Strengths

1. **Species-specific absolute contraindications are hardcoded correctly.** Bromide in cats (`durEngine.js:686`), oral diazepam in cats (`durEngine.js:800`), aspirin in cats (`durEngine.js:700`), enrofloxacin dose ceiling in cats (`durEngine.js:659`) — each has explicit `species === 'cat'` guards with clinically correct mechanisms citing primary literature (Center et al. JAVMA 1996 for diazepam; FATCAT study for clopidogrel vs aspirin).

2. **NSAID + corticosteroid rule is the most thorough in the codebase.** Rule 2 (`durEngine.js:250`) includes the Lascelles 2005 JVIM citation, quantifies the 15× risk increase, specifies BID omeprazole dosing per ACVIM consensus, names the 5–7 day washout requirement, and distinguishes SID vs BID PPI dosing — all clinically accurate.

3. **Multi-substance drug splitting works correctly.** `splitMultiSubstanceDrug()` (`durEngine.js:181`) decomposes "amoxicillin/clavulanate" and "Temaril-P" into virtual components with correct class assignment, enabling interaction checking against individual ingredients.

4. **UGT deficiency handling in cats is unusually complete.** Cases 26 and 29 (`durEngine.js:759–860`) cover morphine, chloramphenicol, piroxicam, oxazepam, lorazepam, and temazepam with specific half-life multipliers, mechanism citations (Court & Greenblatt 2000 PMID:10862526, Kondo et al. 2017 PMID:28453659), and dose reduction recommendations.

5. **Dynamic evidence extraction.** `findRawInteractionEvidence()` (`durEngine.js:150`) pulls the actual evidence strings from the JSONL `drug_interactions[]` array at runtime, meaning CYP and other DDI mechanism text is traceable to source data rather than generic boilerplate.

### 7.4 Confirmed Gaps (by clinical risk)

| # | Gap | Engine | Likelihood in clinical use | Fix required |
|---|-----|--------|---------------------------|-------------|
| 1 | CYP data missing for 89.8% of drugs — CYP inhibition DDI rules (3, 4) silent for most pairs | DDI | High | Populate `cyp_profile` for high-priority drugs: ketoconazole, itraconazole, fluconazole, cyclosporine, chloramphenicol, phenobarbital, rifampin, cimetidine |
| 2 | Therapeutic duplication not implemented for any class except NSAIDs | Duplication | High | Add duplicate-class check for ACE inhibitors, beta-blockers, anticonvulsants, antibiotics (same class) |
| 3 | Korean brand names missing for high-volume drugs (tramadol, furosemide, prednisolone, phenobarbital, metronidazole) | All | High | Populate `product_names_ko[]` for top 50 most prescribed Korean veterinary drugs |
| 4 | Contraindication species filter absent — JSONL-driven contraindications don't filter by species | Contraindication | Medium | Add `species` field to `contraindications[]` JSONL schema; filter in `generatePerDrugPatientAlerts()` |
| 5 | Dose field optional — ceiling checks disabled when vet doesn't enter a dose | Dosage | Medium | Default to schema `defaultDose` when no dose entered; fire warning if dose is absent for high-risk drugs |
| 6 | No test suite | All | Ongoing | Write unit tests for `runFullDURAnalysis()`, `drug_mapper.map_drug()`, and each rule in `INTERACTION_MATRIX` |
| 7 | Allergy cross-reactivity is 5 hardcoded pairs only | Allergy | Medium | Expand to cover macrolide, tetracycline, aminoglycoside, and opioid class allergies |
| 8 | Hardcoded admin credentials in `auth.py:185` | Security | High (dev) | Move to environment variable; add startup assertion that default password is changed |
| 9 | 251 drugs have zero interaction entries | DDI | Medium | Audit zero-interaction drugs; many are ophthalmic/excipients (acceptable) but systemic drugs with zero entries need review |

### 7.5 Silent Failure Risks

These are scenarios where the engine returns no alert but should:

1. **CYP3A4 inhibitor + CYP3A4 substrate where either drug lacks CYP data in JSONL.** Example: ketoconazole (CYP3A4 inhibitor) + cyclosporine. If either drug has an empty `cyp_profile.inhibitors[]` or `cyp_profile.substrates[]`, Rule 3 never fires. High clinical frequency — antifungals + immunosuppressants are a common combination in dermatology.

2. **Two drugs of the same class other than NSAIDs.** Two beta-blockers, two benzodiazepines, two macrolide antibiotics — no duplication alert fires. The engine would return a clean result.

3. **Unknown drug entered + known drug interaction.** A vet types a drug not in the database. It is added as "unknown source." No interaction rules run against it. If the unknown drug is a serotonergic agent (tramadol brand name not found), serotonin syndrome risk with another serotonergic drug is missed entirely.

4. **Patient allergy recorded as brand name.** If patient allergy is "Rimadyl" (brand for carprofen), and carprofen is prescribed, the allergy engine does not fire — it checks `drug.name` ("Carprofen"), `drug.class` ("NSAID"), and `drug.id` ("carprofen") against the string "Rimadyl". None match. Silent pass.

5. **Cat-only contraindication applied to a dog patient via JSONL path.** The `rawContraindications` loop has no species filter. A contraindication that is only relevant in cats (e.g., some hepatotoxicity contraindications that differ by species) would fire for a dog patient with a matching condition string.

6. **No washout check when switching from one drug to another within a session.** Washout rules in `checkWashoutRules()` (`drugClassRules.js:729`) check `patient.currentMedications[]` — the patient's historically recorded medications. If the previous drug was never recorded in the system, no washout alert fires.

### 7.6 Readiness Assessment

**No. This engine is not ready to be shown to a veterinary clinical pharmacologist for accuracy review without preparation.**

**Specific reasons:**

1. A pharmacologist will immediately test a CYP inhibitor + CYP substrate pair (ketoconazole + cyclosporine is the textbook example). The engine will return no alert for this combination if either drug lacks CYP data. This is an embarrassing miss for the most well-known class of DDI.

2. "No therapeutic duplication detection" is a basic expectation of any DUR system. A pharmacologist will test two anticonvulsants or two ACE inhibitors and find no flag.

3. The allergy engine will miss "Rimadyl" as a carprofen allergy. A pharmacologist checking allergy logic will find this immediately.

**Minimum fixes before a pharmacologist review:**

1. **Populate CYP profiles** for at minimum: ketoconazole, itraconazole, fluconazole, cyclosporine, phenobarbital, rifampin, chloramphenicol, cimetidine, erythromycin/clarithromycin, and the top 10 CYP substrates. This alone would enable Rule 3/4 to fire for the most clinically relevant pairs.

2. **Add duplicate-class detection** for at least: ACE inhibitors, beta-blockers, benzodiazepines, and opioids. A two-line check in `INTERACTION_MATRIX` per class.

3. **Add brand name to allergy matching** — check `drug.brandNames[]` and `drug.productNamesKo[]` against `patient.allergies[]` in `checkAllergyRules()`.

4. **Cases that demonstrate genuine strength** (if a meeting proceeds anyway): the NSAID+corticosteroid rule, the UGT deficiency cat cases (oral diazepam, aspirin in cats), enrofloxacin retinal toxicity ceiling check, and the serotonin syndrome rule — these are all clinically accurate and well-cited.

---
*Audit generated by automated static analysis of commit `94c365e` on branch `claude/audit-dur-engine-cleanup-1U6MY`.*
