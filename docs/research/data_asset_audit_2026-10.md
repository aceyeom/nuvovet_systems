# Is our current data of any use? Data-asset audit

**As of:** 2026-10-02 · **Owner:** NuvoVet research · **Related:** `docs/DATA_PROVENANCE.md` (licensing register), `docs/claims/SCHEMA_V2_SPEC.md`, `docs/portfolio/DUR_SHOWCASE_SPEC.md`, `docs/research/insurer_intake_2026-10.md`

**Where the numbers come from.** Three audits were run with Python and Node against the repo: the legacy drug database, the QIA product registry, and everything else. Their scripts live in the session scratch area (`/tmp/claude-0/audit/`) and are not part of the repo. The verbatim-overlap figure was re-run and reproduced exactly. Numbers marked *in-sample* were measured on the same set used to tune the fix, so they are upper bounds.

---

## 1. Executive answer

**Yes, the data is useful for claims. But the valuable part is the plain public data and one internal note, not the drug-interaction "moat".**

| Verdict | Asset | Why |
|---|---|---|
| **Use now** | **QIA product registry scrape** (3,161 public product records) | Korean brand-name → ingredient aliases: drug resolution goes from **56% to ~99%** of 323 receipt-style brand names (*in-sample*; spot check **39/40**). It also gives a **non-covered / preventive product dictionary**: 1,953 quasi-drug products, 85 vaccines, and 194 prevention-only products. The content is regulator-published labelling; how it was collected still needs a licence check. |
| **Use now** | **`EMR_Field_Analysis.md`** (internal note made from real Korean EMR screenshots) | The only primary description in the repo of what a real clinic invoice line looks like. It drove the codebook expansion: probe accuracy goes from **93/209 → 204/206** (*in-sample*). |
| **Use with fixes** | **PubMed Central (PMC) reference runs** | **637 usable references for 375 drugs**, with 82.5% precision on a 40-item hand label. They seed clean-room dose ceilings and real citations. The existing sync script would publish **389 junk references** if run. |
| **Seed only** | **Frontend 26-drug set** (`drugDatabase.js`) | 0 of 290 five-word phrases overlap Plumb's-derived text. It is a clean starting point for the portfolio demo, but needs fixes (e.g. amlodipine is about 3.5× too high for cats). |
| **Interim only** | **Plumb's-derived dose numbers** (670 records) | Used only as labelled "legacy" dose references in the claims engine until the clean-room store exists. **Never shipped, never shown publicly.** |
| **Kill** | Plumb's prose, interaction "evidence" text, LLM-assigned organ-burden scores, the 192 QIA-derived junk/duplicate records, and the deck slides claiming "Plumb's 교차확인" | Licence-encumbered, wrong, or actively harmful. For example, the duplicates silently disable dose checks for **59 of 323** brand-name queries. |

**Urgent, and separate from value:** repository hygiene needs an owner decision. See §4.

---

## 2. Asset register

| # | Asset | Location | Size | Origin / licence | Measured quality | Claims engine | Portfolio DUR | Verdict |
|---|---|---|---|---|---|---|---|---|
| A1 | **Legacy drug records "P"** (Plumb's-derived) | `backend/data/converted/**` | 670 of 862 files | LLM translation of Plumb's monographs: all 670 have `plumbs_sections_found > 0`; models were claude-sonnet-4-6 (639) and Gemini (31); 637 name Plumb's in `_data_quality.ddi_source`. **Plumb's EULA prohibits copying, derivatives and AI/ML use.** | 0 of 862 reviewed. Median confidence 62. Dog mg/kg present in 61%, cat 46%. Dose spot check: 45 of 62 within 0.9–2× of label, 14 too loose. 69% of characters are prose. | **Interim** dose references only, labelled legacy | **None** | Freeze; delete when the clean-room store lands |
| A2 | **Legacy drug records "Q"** (QIA-derived) | same folder, 192 files | 192 | `regex_parser_v1` over the QIA "cleaned" subset; public data | 95 duplicate a P record (70 drugs); 15 Q–Q duplicates; junk includes 10 excipients, 6 parse fragments (`200mg`, `kpc`…), 13 biologics, 2 blood products and 25 supplements. Only 28 are genuinely new ingredients. | **Harmful as is**: resolution lands on empty duplicates | — | Canonicalise or quarantine (§5 #2) |
| A3 | **QIA registry raw** | `backend/data/AZ트/dog_drugs_only_raw.jsonl` | 3,161 records, 10 MB, crawled 2026-02-24/25 | Public QIA product pages. **Licence and collection terms are not verified**: there is no source URL per record and the site terms are unknown. | Header fields parse at 100%. Ingredient tables found for 2,894 records (97.5% of amount rows parse). 3,133 unique licence numbers allow an exact re-pull. | **High**: aliases, non-covered dictionary, combination products, label doses | Medium: Korean brand search | **Use** |
| A4 | QIA "cleaned" subset | `…/dog_drugs_cleaned.jsonl` | 741 records | Subset of A3, filtered on unknown criteria | Misses 56 of the 323 reliably mappable products; one record is corrupted | — | — | **Do not use** (use A3) |
| A5 | **PMC reference runs** | `runs/reference_chunks/` | 671 drug IDs, 1,026 candidates, 932 unique PMC IDs, 7.1 MB | PubMed search → rule score → LLM screen. Bibliographic metadata is fine. **~1.39M characters of abstract text (811 abstracts) are stored verbatim** and must not be redistributed. | 637 usable (375 drugs); 210 LLM-rejected; 179 retry results dropped the species filter and none mention dog or cat; **33 of 40 (82.5%, 95% CI 68–91%) are clinically useful** | **Medium-high**: 77 of 87 engine drugs covered; 60 of 87 have a dose-stating abstract | **High**: 23 of 26 demo drugs covered | **Use** after curation |
| A6 | Superseded PMC test runs, smoke tests, failure logs | `test_pmc_references_chunk_*`, `_llm_smoke_test*`, `failed_drugs_*` | — | — | Superseded | — | — | Archive |
| A7 | **EMR field analysis** | `backend/scripts/docs/EMR_Field_Analysis.md` | 14 KB | Derived from real Korean EMR screenshots | Line format, 5 treatment categories, prescription fields (unit, per-kg dose, days, times per day, route, VAT flag), insurance fields already present in the EMR | **High** | Medium | **Use.** Example values replaced with placeholders in the tree (2026-10); history still holds the originals (§4). |
| A8 | DUR architecture doc | `backend/scripts/docs/DUR_DATABASE_아키텍쳐_v2.md` | 78 KB | Owned | §18 (drug resolution pipeline, unmatched-drug log, self-healing synonyms) carries over directly to unmapped claim lines | Medium | Medium | Keep §18 |
| A9 | Frontend drug set | `frontend/src/data/drugDatabase.js` | **26 drugs** (not 28) | Paraphrased, unsourced; 0 of 290 five-word phrases overlap P | Amlodipine for cats stored as 0.625 **mg/kg** where it should be 0.625 mg **per cat** (~3.5× too high at 3.5 kg). Metronidazole wrongly flagged as narrow-therapeutic-index and as a CYP2C9 inhibitor. Human CYP labels used on canine data. | Low | **High as a seed** | Rebuild with citations |
| A10 | `breedProfiles.js`, `seedData.js`, `emrSchema.js`, `lib/commonDrugs.ts` | `frontend/src/data`, `lib` | 7 vignettes; 2 patients and 9 visits; EMR enums; 47 unsourced drug IDs | Fictional or derived | Mostly dead code. Two of the vignette condition strings ("MDR1 Deficient", "Mild hepatic insufficiency") map to FLUTD. `emrSchema.freqToTimesPerDay` returns 1 for QID or q6h dosing, and its line-item builder uses the dog dose for cats. | `emrSchema` enums: Medium | Vignettes: High | Keep vignettes and enums |
| A11 | Backend breed list | `backend/routers/clinical.py` | 92 dog and 52 cat breeds, English only | — | No 진돗개, 스피츠 or 코리안숏헤어 | Medium (needs a KO map) | Medium | Add a Korean breed map |
| A12 | Demo claims snapshot | `frontend/src/data/claimsDemoSnapshot.json` | 313 claims, 1.16 MB | Synthetic | **Circular:** 36 distinct line strings; 88% of 1,378 lines are exact codebook terms | Demo only | — | Regenerate with diverse vocabulary |
| A13 | Stress tests and audits | `docs/clinical_stress_test.md`, `docs/dur_engine_audit_2026.md` | 25 cases (22 pass, 3 data gaps) | Owned, self-authored; many passes come from rules hard-coded by drug ID | — | Low | **High** as a case gallery | Keep |
| A14 | Pitch deck | `docs/ppt/` | 18 HTML slides | Owned. **S09 and S14 claim "Plumb's 교차확인 / 이중검증" (cross-checked against Plumb's) and "0 DUR"; drug counts of 862 and 725 are inconsistent.** | — | S12 (EMR vendor matrix), S18 (team) and the visual system are reusable | Before/after screenshots | **Do not publish S09 or S14 as they are** |
| A15 | Curated Korean aliases | `backend/claims/data/kr_drug_aliases.json` | **180 alias strings across 75 ids** (the provenance register and memo said 190) | NuvoVet-curated | Agrees with QIA on 43 of 44 overlaps | **High** | Medium | Keep; top priority in resolution |
| A16 | Prior audit reports | `backend/scripts/audit_*`, `scripts/docs/reports/` | — | Owned | `audit_report.json` counts "Unknown" as populated (true known-class rate 75%). The clinical-accuracy audit lists 177 issues (51 high). | — | — | Reference only |
| A17 | `docs/sql/drug_references_validation.sql` | — | 93 lines | Owned | Assumes relevance scores of 0–100; the actual scores run 6–20 | Low | Low | Archive |

---

## 3. Measured numbers

### 3.1 Legacy drug records: P (670, Plumb's-derived) vs Q (192, QIA-derived)

| Measure | P | Q |
|---|---|---|
| Records with a dog mg/kg entry | 409 (61%) | 11 |
| Records with a cat mg/kg entry | 311 (46%) | 21 |
| Records with mg/kg for both species | 300 | 11 |
| mg/kg strings that parse | 2,277 of 2,292 (99.3%) | — |
| Korean brand names | **0** (2,792 English brand names) | 450 product names on 192 records |
| Contraindication match terms | 3,838 rows, **2,977 distinct terms, not normalised** (e.g. CKD 291, renal failure 205, renal insufficiency 88); 96% English | 0 |
| Drug–drug interaction rows | 5,908 (79% English evidence text) | 0 |
| `organ_burden_logic` | LLM-assigned. No code computes it. 41 records use a 0–5 scale and 568 use 0–100. Correlates with keyword count (r = 0.83), but one keyword can score anywhere from 1 to 70. **It feeds the anatomy diagrams.** | all zeros |
| Human reviewer | 0 | 0 |

- **Dose plausibility.** The engine's dose references were compared with public label values in 62 pairs. 45 were OK, **14 too loose**, 1 slightly tight, and 2 missing (prednisolone has no standalone record).
  - **Too-loose examples:** famotidine 8 mg/kg (a per-**day** constant-rate-infusion total stored as a single dose); omeprazole 10 and benazepril 2.0 (taken from `max_dose_mg_kg`); phenobarbital 24 (an IV loading dose); trilostane 19.
  - **Schema gap:** the schema does not distinguish dose per administration from dose per day.
- **Indication ↔ diagnosis.** Substring links to 42 of the 45 diagnosis codes produce 836 links at about **67% precision** (30-link sample). That is good enough only for a candidate list.
- **Fact vs prose.** By character volume, P is **31% fact fields** (names, doses, routes, flags) and **69% prose**. The prose is a Korean translation of the monographs, i.e. a derivative work.
- **Verbatim overlap**, measured with 8-word sequences against the 642 raw monographs from the original extraction. **Re-run for this document; identical result.**
  - **English interaction evidence:** **1,019 of 3,977 strings (26%) are ≥90% verbatim**, and 1,594 (40%) are ≥50%.
  - **Dose evidence:** 75 of 1,030 (7%) are ≥90% verbatim.
  - **Controls:** `frontend/src/data/drugDatabase.js` and the strings in `durEngine.js` show **0** strings with ≥50% overlap.

### 3.2 QIA registry (A3)

- **Composition:**
  - 2,002 동물용의약외품 (quasi-drugs), 1,065 동물용의약품 (drugs) and 94 biologics.
  - 2,418 are for companion animals only; 615 mix companion and livestock.
  - 174 are export-only.
  - **The claims-relevant set:** 852 domestic companion drugs plus 85 biologics.
- **Brand resolution today** (323 reliable products, brand name as it would appear on a receipt):

  | Result | Count |
  |---|---|
  | Correct | **182 (56%)** |
  | Lands on a QIA-created duplicate | 59 (only 10 of these have a dog dose reference) |
  | Unresolved | 79 |
  | Wrong | 3 |

  The 3 wrong ones: 클라벳 → amoxicillin (should be amoxicillin-clavulanate), 타이로세틴-F → tylosin, 펜다졸 → oxfendazole.
- **Auto-generated aliases:** 263 brand stems, of which **223 are new**.
  - With duplicates suppressed, resolution reaches **321/323** (*in-sample*).
  - Spot check (20 random plus 20 currently missed): **39/40 correct id**, 40/40 correct ingredient.
  - **Exact matching only.** Jamo-fuzzy matching was ~27% precise (메벤다졸 → fenbendazole), so fuzzy matches may only feed a review queue.
- **Missing combination products.** These are the highest-volume Korean pet products:
  - ivermectin + pyrantel (45 products);
  - praziquantel + pyrantel + febantel (10);
  - praziquantel + mebendazole (10);
  - imidacloprid + moxidectin (7);
  - afoxolaner + milbemycin (5).
- **Non-covered / preventive dictionary:**
  - **1,953 companion quasi-drugs** (shampoo 1,063; wound/skin 155; oral/dental 129; supplement 100; deodorant 100; wipes 92; ear/eye cleaners 47; repellent 27; other 240);
  - **85 vaccines**;
  - **194 prevention-only labels** (105 heartworm).
- **Label doses:** 230 single-drug product × species rows cover 35 ids.
  - 148 of 221 fall within 0.5–2× of the existing reference maximum.
  - 67 are below half (expected: on-label vs off-label maximum).
  - 6 are above 2× (per-day totals or parse errors).
  - Strength per unit can be parsed for 159 of 310 single-drug products.
- **Licensing: not verified.** data.go.kr and medi.qia.go.kr were unreachable. Confirm on 공공데이터포털 whether an official dataset or Open API exists and what its 이용허락범위 (licence scope) allows, and check the KOGL (공공누리) type on medi.qia.go.kr.

### 3.3 PMC references (A5)

- **Funnel:** 1,026 candidates → 637 usable (passed the LLM check **and** mention dog or cat) covering 375 drugs.
  - The 179 retry results that dropped the species filter include mango fruit, Zika screening and a paediatric oncology paper.
- **Precision:** **33 of 40 hand-labelled usable references are clinically useful (82.5%; 95% CI 68–91%)**. Median journal impact factor is 2.6, and the drug name appears in the title 81% of the time.
- **Dose-stating abstracts:** 287 usable abstracts state a mg/kg or µg/kg dose, covering 207 drugs.
- **Coverage:** 77 of 87 engine drugs have a usable reference, and 60 of 87 have one that states a dose.
- **Defect:** `drug_sync.py` looks for `test_pmc_references.json`, which does not exist, and ignores the `llm_invalid` flag. **If run, it would publish 389 junk references (38%), and 195 drugs would show only junk.**

### 3.4 EMR field analysis (A7) and the codebook probe

**What a real invoice line looks like**

- **Treatment lines** follow `<category>-<item>(<modifier>)`, e.g. `검사-X-ray(경상)` or `입원-소형견(1일)`, with a selling price (판매금액). There are only **5 categories**: 진찰 (consultation), 검사 (tests and imaging), 처치 (treatment), 수액/수혈 (fluids and transfusion), 의료폐기물 (medical waste).
- **Prescription lines** carry name, unit (mg/kg, mcg/kg, IU/kg, ml/kg, mg, EA), dose per kg, calculated dose, days, times per day, route (8 values), total, a **VAT flag** and amount.
- **The patient screen already holds insurance fields:** 사보험 번호 (private insurance number), 가입플랜 (enrolled plan) with 특약 (rider) tabs, and 보험군.
- **The one real price point** (₩60,000 for that X-ray) sits at the **93rd–98th percentile** of our seed benchmark (median ₩32,000). Either the seed is low or the unit of service (per view or per study) is undefined.

**Codebook probe: 209 EMR-style strings**

| Test | Before | After the audited proposal |
|---|---|---|
| Probe strings correct | 93 (97 missed, 16 wrong, 3 drug lines) | **204 / 206** (*in-sample*) |
| Where the right code already existed | 93 / 117 (79.5%) | — |
| False-positive probe | 3 / 16 | **14 / 16** |
| Synthetic regression (1,378 lines) | — | Identical |

**Payout errors the old matcher caused**

- **20 lines that should be excluded were paid.** Unmapped lines defaulted to eligible. Examples: nail trim, euthanasia, tail docking, devocalisation, supplements, kennel-cough / influenza / FeLV vaccines, NexGard, Bravecto, 세부내역서 document fees, discounts, funerals.
- **Short Latin substrings caused false matches:**
  - "Doctor's fee", "Infection control" and "Ectropion surgery" were coded as CT (they contain "ct");
  - "Usual visit" was coded as urinalysis (it contains "ua");
  - "routine checkup" → UTI; "hepatic insufficiency" → FLUTD; "admission" → diabetes; "pruritus" → URI; "fading kitten" → FAD.
- **Diagnosis coverage:** 24 of 55 realistic diagnoses were missed outright.

**The demo's accuracy is circular.** The synthetic demo uses only 36 distinct line strings, and 88% of its 1,378 lines are exact codebook terms. Any accuracy figure from it proves little.

### 3.5 Frontend data, deck and docs (A9–A14)
- **Dead data files:** most frontend data files are never imported. Only `DRUG_SOURCE`, `createUnknownDrug` and `seedData` are used.
- **Deck:** S09 and S14 must not be published as they are, because they claim cross-checking against Plumb's. S12 (the competitor matrix of 4 Korean EMR vendors) and S18 (team) can go into an insurer deck.
- **Feature ideas worth keeping:** two items in `feature_suggestions.md` (reversal-agent lookup, discharge-instruction generator) need only fields that are already populated. They make better showcase features than the organ diagrams.

---

## 4. Repository hygiene (owner action)

The findings and the remediation runbook for this section are kept outside the repository, with the owner, until the remediation is done. In short: older commits contain licence-encumbered source material and one credential. Deleting files in later commits does not remove either. The owner decides on visibility, credential rotation and any history rewrite. No agent has executed any of it.

---

## 5. Ranked value-extraction plan

Ranked by value to the claims product per day of effort. Effort figures are from the audits.

| Rank | Action | Effort | Payoff | Status in this session |
|---|---|---|---|---|
| 0 | **Repository hygiene** (§4) | ~0.5 day + Support wait | Owner decision | **Not executed.** Owner action. |
| 1 | **QIA alias layer.** `build_qia_aliases.py` reads the raw registry and emits `claims/data/qia_aliases.json`, with exact matching only, licence-number provenance, every ingredient of a combination listed, and export-only or livestock-only items dropped. Resolution order: curated aliases > QIA aliases > DB names > fuzzy. | 1–2 days | Brand resolution 56% → ~99% (*in-sample*); restores the 72 dog-dose checks lost to duplicates | **Implemented** (in the working tree when this was written; not yet committed). `backend/scripts/build_qia_aliases.py` → `backend/claims/data/qia_aliases.json`: 661 alias stems from 852 domestic companion drugs, 148 of them combination aliases, 2 conflicting stems dropped, each with its licence number |
| 2 | **Canonicalise or quarantine the 192 QIA-created records.** Excipients, fragments, biologics and Q–Q duplicates leave the resolution index; Korean-ID duplicates redirect to canonical records. | 0.5–1 day | Fixes the 59 of 323 brand queries that skip dose and class checks | **Implemented** (working tree). `backend/claims/data/legacy_drug_records.json`: 109 duplicate → canonical redirects; excluded records are 10 excipients, 6 fragments, 13 biologics, 2 blood products and 26 supplements |
| 3 | **Non-covered / preventive product dictionary** (`claims/data/noncovered_products.json`) applied to drug and product lines | 1–2 days | Directly reduces insurer leakage: shampoos, supplements, parasite preventives and vaccines stop being paid as treatment | **In progress** (spec §A8). `claims/data/noncovered_products.json` was not yet in the tree when this was written. |
| 4 | **Codebook expansion and matcher rewrite.** 60 new procedure codes, 59 synonyms, EMR-prefix category hints, token-boundary matching for short Latin terms, ~20 diagnosis codes; the probe set becomes a test fixture. | 1.5–2.5 days | Probe 93 → 204 of 206 (*in-sample*); false-positive probe 3 → 14 of 16; ends the payout errors in §3.4 | **Implemented** (working tree). `procedure_codes.json` 62 → 122 codes; `diagnosis_codes.json` 45 → 70; matcher changes in `codebook.py`; probe fixtures in `backend/tests/fixtures/`. Accuracy is gated by the spec's tests, not re-measured here. |
| 5 | **Clean-room portfolio rebuild.** Curated formulary with cited sources (PubMed-verified DOIs/PMIDs, FDA/EMA/QIA labels); no Plumb's-derived content; organ-system matrix replaces the anatomy art | 2–4 days | A public showcase with no licence exposure | **In progress** (spec `docs/portfolio/DUR_SHOWCASE_SPEC.md`). `frontend/src/portfolio/` was not yet in the tree when this was written. |
| 6 | Fix how the engine builds dose references: choose by route and indication; drop loading, CRI and per-day entries; ignore `max_dose_mg_kg` when ≥2× the value; add prednisolone | 1–2 days | Clears ~14 of 60 loose references | Not started |
| 7 | Combination product ids (ivermectin + pyrantel, etc.) plus fipronil and permethrin as canonical records | 1–2 days | 55 multi-ingredient products stop resolving to one component | Not started |
| 8 | Curated PMC evidence pack: keep the 637 usable references, drop abstracts, LLM-extract dose statements from the 287 dose-bearing abstracts, DVM review. Fix the `llm_invalid` filter in the sync (1 hour). | 2–4 days + DVM time | Clean-room dose ceilings for 60 of 87 engine drugs | Not started |
| 9 | QIA label-dose table (230 rows, 35 ids) and strength-per-unit parsing (159 of 310) | 3–5 days + review | On-label doses with source sentences; tablet counts convert to mg | Not started |
| 10 | Clean-room rebuild of the top 150 drugs: about 8 engineering days and **~80 DVM hours**, 4–5 weeks calendar, under $200 in LLM cost. Prose is not rebuilt. | 4–5 weeks | Exit criterion for deleting `backend/data/converted/` | Not started |
| 11 | Korean↔English breed map (~30 breeds, with MDR1, brachycephalic and patella flags) | 0.5 day | Breed-based exclusions; better portfolio input | Not started |
| 12 | Deck cleanup: reuse S12, S18 and the visual system; remove S09/S14 Plumb's claims, "0 DUR" and the 862/725 stats | 0.5 day | Insurer-deck starting point | Not started |
| 13 | Catalog prices (판매금액) from pre-check partners, to define units of service | Process | Defensible price-outlier checks | Not started |
| 14 | Archive superseded PMC runs, failure logs and `docs/sql` | 15 min | Less noise | Not started |

**Lowest priority:** normalising the 2,977 contraindication terms (DUR showcase only; no claims value) and the LLM-based indication ↔ diagnosis table (~1 week).

---

## 6. Decisions needed from the founders

1. **Decide on §4 today.**
2. **Delete `backend/data/converted/` from all history now**, or keep it private until the clean-room store lands? The recommendation is to keep it private for now, purge it from history when it is deleted, and never make it public.
3. **Legal opinion** on whether legacy Plumb's-derived values may be used even privately as a post-hoc disagreement check.
4. **QIA licence confirmation** (공공데이터포털 / KOGL), before QIA-derived aliases appear in a customer deliverable.
5. **DVM budget** of about 80 hours for the top-150 clean-room review.

## 7. Caveats
- The 209-string probe was written from EMR conventions and common billing items; it is **not real receipts**. Only real partner receipts give a true accuracy figure.
- The 82.5% PMC precision comes from 40 labels, and the 39/40 alias spot check from 40 aliases.
- The audit scripts are in the session scratch area (`/tmp/claude-0/audit/`) and are not versioned in the repo.
