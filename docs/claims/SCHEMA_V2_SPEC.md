# Claims engine v2: build spec (binding)

Inputs that drove this spec: the insurer-intake research and the data-asset audits of 2026-10-02 (`docs/research/`).

v2 makes the engine match **what Korean insurers actually receive**:
- phone photos of an itemised receipt (영수증) and a 진료비 세부내역서 (itemised statement);
- above insurer-specific thresholds, a statutory 진단서 (diagnosis certificate, 수의사법 시행규칙 별지 제4호의2) or the insurer's own form with its own disease codes;
- the full 진료부 (clinical record) only on suspicion;
- no statutory receipt format; clinic-specific item naming; total-only receipts; mixed food/grooming baskets.

Constraints:
- **Backward compatibility.** Every v1 request body must still validate and adjudicate. `diagnoses: ["외이염"]` still works.
- All existing tests keep passing. Add the new tests listed here.
- Never auto-deny. Decisions are now `auto_approve | pend | review | deny_recommended`. `pend` means "request information", the commonest real outcome.

## A. Normalization (codebook, drug resolution)

1. **Matcher rewrite** (`claims/codebook.py`):
   - Tokenize compact text. Latin terms of 4 characters or fewer match only on token boundaries (digit suffixes allowed: `Chem10`). This fixes "Doctor's fee"→CT, "Usual"→urinalysis, "routine"→UTI, "insufficiency"→FLUTD, "admission"→DM, "pruritus"→URI, "fading"→FAD.
   - Parse the EMR prefix pattern `<category>-<item>(<modifier>)` (e.g. `검사-X-ray(경상)`, `입원-소형견(1일)`, `의료폐기물`). Use the category as a hint on near-ties and fall back to the category default code when the item is unmatched.
   - Rank candidates by (category-hint agreement, term length, specificity).
   - Expose `match_procedure(text, code=None, category_hint=None) -> Match(code, confidence, matched_term, category_hint)`, while keeping the old tuple-returning call sites working (wrapper).
2. **Codebook expansion.** Merge the audited proposal at `/tmp/claude-0/audit/procedure_codes_proposed.json` (122 codes, 59 new synonyms) after reviewing each addition.
   - New codes have `benchmark: null` unless a public source exists. The pricing rule skips codes with no benchmark. Do not invent prices.
   - Add coverage categories for the new codes: `admin` (medical waste, VAT, documents), `discount`, `euthanasia`, `funeral` → non_medical, `cosmetic` → non_medical, `supplement` → non_medical, external parasite preventives → preventive.
   - Discount lines (ADM-004) may carry a negative `unit_price`. No other line may.
3. **Diagnosis codebook.** Apply the same token-boundary fix and add about 20 codes:
   - hip dysplasia, BOAS, IMHA, lymphoma, glaucoma, hypoadrenocorticism, heartworm disease, tick-borne disease, anal sacculitis, cryptorchidism, umbilical/inguinal hernia, retained deciduous teeth, cherry eye;
   - symptom-level codes 식욕부진, 구토, 설사, 파행, 소양감, 탈모, with `specificity: "symptom"`.

   Each diagnosis gains `body_system` and `condition_group` (e.g. `patella_hip`, `dental`, `skin`, `chronic_cardiac`) for waiting periods and exclusion riders. Keep `mafra_standard_ref` but structure it as `{species_prefix, code, version}|null` (MAFRA codes look like `DH10.56`: species letter + KCD-like core + cause digits).
4. **Probe fixtures.** Copy `/tmp/claude-0/audit/emr_rows.json` (209 EMR-style strings with expected codes) into `backend/tests/fixtures/emr_lines.json`, along with the false-positive probe. Test: ≥ 95% accuracy on the probe set and ≥ 14/16 on false positives. Also assert the synthetic demo vocabulary is unchanged.
5. **Drug-like line routing.** When a line is unmapped (or maps to pharmacy) and looks like a drug (`Inj.`, `(정)`, `(주)`, `tab`, `cap`, `mg`, `mL`, a known alias), resolve it with `resolve_drug`.
   - If it resolves, set `NormalizedLine.drug_id` and category `pharmacy`.
   - Feed it into the clinical checks as a prescription with unknown dose. Clinical rules must tolerate a missing dose.
6. **QIA alias layer.** Write `backend/scripts/build_qia_aliases.py`. It reads `backend/data/AZ트/dog_drugs_only_raw.jsonl` (the raw file, not the cleaned subset) and emits `claims/data/qia_aliases.json`:
   - `{alias_stem: {ingredients: [canonical ids], licence_no, product_name, category, species, export_only}}`;
   - exact matching only (English, Korean, and the QIA Korean↔English ingredient pairs); no fuzzy auto-accept;
   - combination products list every ingredient;
   - drop export-only and livestock-only items.

   The audit found about 223 new aliases with 39/40 spot-check accuracy. Reuse the scripts in `/tmp/claude-0/audit/` (parse.py, mapping2.py, aliases.py, products.py). `resolve_drug` priority is: curated `kr_drug_aliases.json` > QIA aliases > DB names > fuzzy.
7. **Canonicalize QIA-created duplicate records.** `/tmp/claude-0/audit/qmap.json` maps 192 legacy QIA records to canonical ids or junk. Resolution must never land on a junk record or a Korean-id duplicate. Excipients, fragments and biologics are excluded from the index.
8. **Non-covered product dictionary.** `claims/data/noncovered_products.json` covers:
   - QIA 동물용의약외품 (quasi-drugs: shampoos, wipes, deodorants, supplements, oral care);
   - preventive-only products (heartworm and parasite preventives, vaccines/biologics), each with category and licence_no.

   Coverage applies it to line items and prescriptions: a match makes the item ineligible with reason `noncovered_product:<category>`.
9. **Fix.** The provenance doc says 190 curated aliases, but the actual count is 180. Correct it.

## B. Schema v2 (`claims/models.py`), additive and backward compatible

- **Diagnosis object.** `Claim.diagnoses: List[str | Diagnosis]`, where `Diagnosis = {text_raw, codes:[{system:'NVD'|'MAFRA'|'KB_PET'|'SAMSUNG_PET', code, version?}], certainty:'presumptive'|'final'|null, onset_date?, diagnosis_date?, is_accident?: bool, source_doc?: doc_type}`. Waiting periods key on `onset_date` when present.
- **Documents.** `Claim.documents: List[Document]`, where `Document = {doc_type, source:'photo'|'pdf'|'emr'|'manual', issued_at?, issuer_brn?, vet_license_no?, serial_no?, has_seal?, captured_at? (imaging), pages?, insurer_form_code?}`. `doc_type` enum:
  - `RECEIPT_ITEMIZED`, `RECEIPT_TOTAL_ONLY`, `DETAIL_STATEMENT`
  - `DX_CERT_STATUTORY`, `INSURER_TX_CONFIRMATION`, `OPINION_WITH_RX`
  - `MEDICAL_RECORD`, `LAB_RESULT`, `IMAGING`
  - `PAYMENT_SLIP`, `CASH_RECEIPT`
  - `PET_PHOTO_FRONT`, `PET_PHOTO_SIDE`, `PET_PHOTO_FACE`
  - `REGISTRATION_CERT`, `SURGERY_CONSENT`, `PRESCRIPTION`
  - `CLAIM_FORM`, `CONSENT_FORM`, `ID_COPY`, `BANK_PROOF`
- **Intake and invoice.** `Claim.intake_channel`: `owner_upload | insurer_app | fax_email | emr_autoclaim | live_counter | nuvovet_precheck`. `Claim.invoice_total?: int` (printed total, for reconciliation).
- **LineItem.** Add `category_raw?` (printed heading or EMR prefix), `tax_status: 'exempt'|'taxable'|'unknown'`, `service_date?`, `diagnosis_refs?: [int]` (indexes into diagnoses), `is_bundle?: bool`.
- **Patient.** Add `registration_no?`, masked in every response to the last 4 digits; `coat_color?`; `birth_date?`; plus `neutered` (exists).
- **Clinic.** Add `brn?`, `emr_vendor?`, `participation_status: 'none'|'precheck'|'direct'`.
- **Policy v2.** Fields:
  - `regime: 'legacy'|'fss_2025_05'`
  - `insurer_id?` (selects an insurer profile, §D)
  - `copay_ratio` (fss ≥ 0.30)
  - `deductible: {amount, basis:'per_visit'|'per_day'|'per_claim'}`. The default is ₩30,000 per visit; the v1 default of ₩10,000 is wrong post-2025-05. If a v1 `deductible_per_visit` is given, honour it.
  - `waiting_periods: {illness:30, accident:0, groups:{patella_hip:365}}` (defaults; per product)
  - `riders: [{id:'skin'|'patella_hip'|'dental'|'liability'|'funeral', start_date}]`
  - `limits: {per_day?, per_visit?, per_surgery?, annual_amount?, annual_visits?}`
  - `exclusion_riders (부담보): [{condition_group|body_system, until?}]`
  - usage counters

  v1 fields (`coverage_ratio`, `covers_dental`, `covers_patella`, `illness_waiting_days`, `per_visit_limit`, `annual_limit`, `used_this_year`) map onto v2 (coverage_ratio = 1 − copay_ratio). Do **not** hard-cap coverage at 0.7: legacy in-force policies exist. Flag a policy that violates its regime as info.

## C. Decision and outputs

- **Decisions.** `auto_approve | pend | review | deny_recommended`. Precedence: deny_recommended (hard rules) > review (warning or critical clinical/pricing/integrity) > pend (missing information) > auto_approve.
- **Pend reasons** (`pend_reasons[]`, each with `code`, `actor: 'owner'|'clinic'|'insurer'`, `detail_ko`):
  - `RECEIPT_NOT_ITEMIZED`: a single line, or lines that don't reconcile with `invoice_total` within ₩10, or a `RECEIPT_TOTAL_ONLY` document.
  - `MIXED_BASKET_UNSPLIT`: non-medical items present but not itemised.
  - `MISSING_DX`: no diagnosis.
  - `DX_UNMAPPED`.
  - `NEED_DX_CERT`: above the insurer threshold with no DX_CERT or insurer form; when the insurer profile requires its own codes, also needs that code.
  - `IMAGING_NO_TIMESTAMP`: an imaging line plus an IMAGING document without `captured_at`, where the profile requires it.
  - `PET_ID_UNVERIFIED`: no registration_no and no photo set, where the profile requires it.
  - `ORIGINALS_REQUIRED`: above the insurer threshold.
- **Info flags.**
  - `MEDICAL_RECORD_MAY_BE_UNAVAILABLE`: service more than 1 year ago. The 진료부 retention is 1 year (수의사법 시행규칙 §13), while claims run 3 years (상법 §662).
  - Document fee lines: always ineligible.
- **SIU flags** (`siu_flags[]`, referral grade, never denial):
  - undisclosed chronic condition within 1 year of policy start;
  - species/identity mismatch;
  - duplicate across claims;
  - clinic price far above benchmark repeatedly (if history is given).

  The full medical record is requested **only** when an SIU flag fires. Say so in the output (`record_request_rule_id`).
- **Line decisions.** `line_decisions[]` per line: `{line_index, eligible, reason_code, benefit_type:'outpatient'|'inpatient'|'surgery'|'preventive'|'non_medical'|'admin', amount, eligible_amount}`.
- **Required documents.** `required_documents[]`: a checklist computed from the insurer profile, each item `{doc_type, why_ko, satisfied: bool}`.

## D. Insurer profiles (`claims/data/insurer_profiles.json`)

This is versioned reference data. Every entry carries `source_url`, `as_of` and `verified: false` until re-checked against live insurer pages. Include:
- **default:** 진단서 required above ₩300,000 per condition; imaging timestamp required; photos when unregistered.
- **KB:** ₩300k per disease/accident, summed per condition across visits (flag this as an inference); KB disease code required on 진단서/진료확인서; JPG/PNG only; card slip must show BRN.
- **Samsung, Meritz:** originals above ₩1M.
- **Lotte:** originals above ₩3M.
- **DB:** app claim ≤ ₩5M.
- **NH:** ≤ 30 files.
- **Hyundai:** photos (front and side full body) on every claim.
- **MyBrown:** live counter claim at partner clinics.

Source URLs are in `docs/research/insurer_intake_2026-10.md`.

## E. Synthetic data and evaluation

- **Diversify vocabulary.** Line descriptions are drawn from the EMR-style probe strings and clinic-style variants. Exact codebook terms are no longer the majority, so evaluation stops being circular.
- **New anomaly types.** `total_only_receipt` → pend RECEIPT_NOT_ITEMIZED; `missing_dx` → pend MISSING_DX; `above_threshold_no_cert` → pend NEED_DX_CERT.
- **Regression gate.** Keep it: clean false-alarm ≤ 2% (review-level), recall ≥ 0.8 per anomaly type. Report pend rate separately.
- **Snapshot.** Regenerate the frontend snapshot via `backend/scripts/export_claims_demo.py`.

## F. API and console

- **API.** `/api/claims/adjudicate` and `/precheck` return the new fields. `precheck` maps pend reasons with `actor: 'clinic'` into clinic-fixable issues ("영수증을 항목별로 발급해 주세요", "진단서가 필요합니다 (₩300,000 초과)").
- **Insurer console.** Show the Pend decision (badge: `대기 · 서류 요청`), the pend reasons, the required-documents checklist, and SIU flags in the claim detail. The Overview decision bar includes pend.
- **Clinic pre-check page.** Shows the documents the clinic should issue.

## G. Tests (add)

Matcher false-positive tests; probe accuracy; QIA alias resolution (including combinations); non-covered product exclusion; pend reasons (each); insurer-profile document checklist; policy regime defaults; v1 backward compatibility (old request bodies); masking of registration_no.
