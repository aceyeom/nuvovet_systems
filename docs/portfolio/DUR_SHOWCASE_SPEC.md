# NuvoVet DUR showcase: build spec (binding)

This spec turns the original NuvoVet DUR product into a portfolio-grade, static showcase. It consolidates the six product-audit reports from 2026-10-02. When in doubt, choose **honesty over impressiveness**: nothing on screen may claim more than the code actually does.

## 0. Non-negotiables

1. **Clean-room data only.** No text, number or structure may come from Plumb's or from `backend/data/converted/**`. That data is LLM-translated from Plumb's, and the Plumb's licence forbids derivatives. Every clinical fact in the showcase is authored from public sources:
   - FDA/EMA/QIA product labels;
   - PubMed-indexed literature, verified with the PubMed MCP tools and cited by DOI or PMID;
   - published consensus guidelines.

   Facts carry a source id. Prose is written fresh, in our own words.
2. **No network.** The showcase makes zero network calls at runtime: no backend, no LLM, no hot-linked images, no CDN fonts. It must work from `file://` via the standalone build.
3. **No fabricated numbers.** Specifically:
   - no "confidence %";
   - no invented organ scores;
   - no percentages above 100;
   - no effect sizes without a verified source;
   - no fake progress theatre;
   - no claims about how many products or databases were searched.

   Every number shown has a unit and a basis.
4. **Self-contained.** All code lives under `frontend/src/portfolio/`. It may import only `react` and `react-dom`, plus `lucide-react` if useful. It must not import from outside `src/portfolio`, so the folder can later be copied into a fresh public repo with clean history.
5. **Deterministic and tested.** The engine is pure functions. Vitest suites cover:
   - dose units;
   - every rule;
   - the organ matrix;
   - search;
   - the golden cases.

   `npm test` runs them.
6. **Bilingual.** English is the default and Korean is complete. Clinical strings are authored in both languages inside the knowledge/rule data. There is no runtime translation.
7. **Disclaimer.** A visible "Educational prototype — not clinically validated" appears in the header and on every printed page.

## 1. Packaging and routes

- **Main app.** `/dur` mounts `<PortfolioApp/>`. `/demo` and `/system` redirect to `/dur`. The old Demo/FullSystem pages are retired.
- **Standalone.** `frontend/portfolio.html` + `src/portfolio/standalone.jsx` + `frontend/vite.portfolio.config.js` (`base: './'`, `outDir: 'dist-portfolio'`). Scripts: `npm run build:portfolio`, `npm run dev:portfolio`.
- **Internal navigation** uses the location hash, so it works under any host path:
  - `#/` → case study
  - `#/cases` → case picker
  - `#/case/:id` → workbench
  - `#/case/:id/report`
  - `#/case/:id/handout`
  - `#/how-it-works`
  - `#/case/custom` → blank case. Custom-case state is serialized into the hash (base64url JSON) so it can be shared.

## 2. File layout

```
src/portfolio/
  PortfolioApp.jsx        shell: header, hash router, footer
  standalone.jsx
  router.js               useHashRoute(), navigate()
  styles/portfolio.css    all styles, scoped under .pf-root; tokens; light + dark
  i18n/index.js           LangProvider, useLang(), t(key), pick({en,ko})
  i18n/ui.en.js, ui.ko.js UI chrome strings only
  knowledge/
    sources.js            citation registry
    drugs.js              curated formulary (~22 drugs)
    breeds.js             curated breeds with KO aliases
    conditions.js         problem-list vocabulary → organ systems
    allergyClasses.js
  engine/
    units.js              quantity parsing/conversion
    dose.js               computeDose(), frequency vocabulary, tablet/volume rounding, BSA
    search.js             bilingual + jamo-aware drug and breed search
    rules/                one module per rule (see §5)
    engine.js             analyze(caseInput) → Result (see §4)
    findings.js           merge-by-problem, ranking, verdict
    organMatrix.js        buildOrganMatrix(result, caseInput)
    __tests__/*.test.js
  cases/cases.js          golden cases with expected results
  pages/                  CaseStudyPage, CasesPage, WorkbenchPage, ReportPage, HandoutPage, HowItWorksPage
  components/             shared UI (see §7)
```

## 3. Knowledge model (clean-room)

`sources.js`: `{ [id]: { kind: 'doi'|'pmid'|'label'|'guideline', cite: 'Author Year, Journal', doi?, pmid?, url?, note? } }`. Every DOI/PMID must have been verified with the PubMed tools in this session. Label sources name the product and regulator (e.g. "Heartgard — US FDA NADA 138-412"); add one only when confident it exists.

`drugs.js`, one entry per drug:

```js
{
  id: 'ivermectin',
  name: { en: 'Ivermectin', ko: '이버멕틴' },
  aliases: ['하트가드', 'Heartgard', '카디오캡'],   // Korean/global brand names; brand→ingredient facts only
  class: { en: 'Macrocyclic lactone (avermectin)', ko: '마크로사이클릭 락톤' },
  species: ['dog','cat'],
  strengths: [{ id, form: 'tablet'|'chewable'|'capsule'|'solution'|'injection'|'suspension'|'spot-on', amount: {value, unit}, per?: {value, unit:'mL'}, splittable: bool }],
  protocols: [{ id, species, indication: {en,ko}, dose: {min, max, unit: 'mcg/kg'|'mg/kg'|'mg'|'mg/m2'|..., basis:'per_kg'|'per_animal'|'per_m2'}, route, frequency, durationDays?, labelStatus: 'label'|'extra-label', source }],
  pk: { pgp: { substrate: bool, inhibitor: 'strong'|'moderate'|'weak'|null }, cyp: { substrateOf: ['CYP3A'], inhibits: {CYP3A:'strong'}, induces: {CYP3A:'strong'} }, renalFraction: number|null, sources: [...] },
  flags: { mdr1Sensitive: bool, narrowTherapeuticIndex: bool, nsaid: bool, corticosteroid: bool, immunosuppressant: bool, serotonergic: bool, allergyClass: 'macrocyclic_lactone'|... },
  organRisk: { kidney:{level:0-3, reason:{en,ko}, source}, liver:{...}, gi:{...}, hemostasis:{...}, cns:{...}, heart:{...} },  // omitted key = not assessed ('na'), never 0
  admin: [{ kind:'administration'|'lab', text:{en,ko}, source? }],
  ownerSigns: [{en,ko}],      // what an owner should watch for with this drug
  speciesCautions: [{ species, severity, text:{en,ko}, source }]
}
```

Formulary (~22 drugs). Cover the golden cases plus enough for "build your own":
- ivermectin, ketoconazole, cyclosporine (systemic), phenobarbital, prednisolone
- methimazole, amlodipine, maropitant, amoxicillin-clavulanate
- meloxicam, carprofen, robenacoxib
- gabapentin, tramadol, trazodone, fluoxetine
- omeprazole, famotidine, enrofloxacin, metronidazole
- furosemide, pimobendan, benazepril
- permethrin (topical), acetaminophen

Conservative rules for organRisk levels:
- **3** = labelled warning or contraindication for that organ in the species, or well-documented serious toxicity.
- **2** = labelled precaution or documented clinically relevant effect.
- **1** = minor or uncommon.
- Omit the key when unassessed.

`breeds.js`: `{ id, en, ko: [...aliases], species, mdr1: 'high'|'moderate'|'low'|'not_reported', mdr1Note: {en,ko}, source, brachycephalic: bool }`.
- Use published MDR1 allele frequencies (Gramer 2010 doi:10.1016/j.tvjl.2010.06.012; Mealey & Meurs 2008 doi:10.2460/javma.233.6.921):
  - Collie ~59% (high)
  - Shetland Sheepdog ~30%
  - Australian Shepherd ~22%
  - Border Collie ~1% (low but listed)
- Include about 30 breeds common in Korea: 말티즈, 푸들, 포메라니안, 비숑, 시츄, 진돗개, 웰시코기, 골든 리트리버, 래브라도, 코리안숏헤어, 페르시안, 러시안블루, 스코티시폴드, etc.
- Unrecognised free text maps to "unknown". It never maps to "safe".

## 4. Engine API (contract consumed by the UI)

```js
analyze(caseInput) → Result
caseInput = {
  species: 'dog'|'cat', weightKg: number, breedId: string|null, breedText: string,
  ageYears: number|null, sex: 'male'|'female'|null, neutered: bool|null, pregnant: bool, lactating: bool,
  conditions: [conditionId], labs: { creatinine?: number /* mg/dL */, alt?: number /* U/L */ },
  allergies: [allergyClassId], mdr1Status: 'unknown'|'normal/normal'|'mutant/normal'|'mutant/mutant',
  meds: [{ drugId, protocolId|null, dose: {value, unit}, route, frequency, durationDays|null, strengthId|null }]
}
Result = {
  verdict: { level: 'contraindicated'|'major'|'moderate'|'minor'|'none', headline:{en,ko},
             counts: { contraindicated, major, moderate, minor, notes, doseProblems } },
  findings: [Finding],    // ranked by severity, then by number of factors
  notes: [{ id, kind:'administration'|'lab'|'monitoring', drugIds, text:{en,ko}, sources:[id] }],
  doses: [DoseRow],
  organMatrix: OrganMatrix,
  trace: { drugsResolved, pairsEvaluated, rulesEvaluated, rulesFired:[ruleId], factorsUsed:[key], factorsMissing:[key], ms }
}
Finding = { id, ruleId, ruleVersion, severity, problemKey, drugIds:[], factors:[{kind:'breed'|'species'|'condition'|'lab'|'allergy'|'dose'|'mdr1', id, label:{en,ko}}],
            title:{en,ko}, consequence:{en,ko}, why:[{en,ko}], actions:[{en,ko}], alternatives:[{en,ko}],
            sources:[sourceId], evidence:'literature'|'label'|'mechanistic', ownerSigns:[{en,ko}],
            trace: { inputs:[{ fact:string, value:string, source?:sourceId }] } }
DoseRow = { drugId, protocolId, perDose:{value, unit}, perDay:{value, unit}|null, administration:{en,ko} /* '1 × 68 mcg chewable' or '0.72 mL of 10 mg/mL' */,
            ref:{ min, max, unit, basis, labelStatus, source }|null, status:'within'|'below'|'above'|'no_reference'|'unit_mismatch',
            ratio:number|null, working:{en,ko} /* '300 mcg/kg × 24 kg = 7.2 mg' */ }
OrganMatrix = { columns:[{ id:'kidney'|'liver'|'gi'|'hemostasis'|'cns'|'heart', label:{en,ko},
                badges:[{ kind:'additive'|'patient'|'interaction', reason:{en,ko} }] }],
                rows:[{ drugId, cells:{ [colId]: { level:0|1|2|3|'na', reason:{en,ko}|null, source:sourceId|null } } }] }
```

Behaviour:
- **Dose units.** Do all quantity maths in `units.js`/`dose.js`:
  - mcg ↔ mg ↔ g; mL volume from concentration; IU.
  - Per-kg, per-animal (never multiplied by weight) and per-m² (Meeh BSA: K = 10.1 for dogs, 10.0 for cats).
  - Tablets round to the nearest ¼ (½ if not quarter-scorable, whole if not splittable). Suggest the best-fit strength.
  - Unit tests must include: ivermectin 6 mcg/kg × 12 kg = 72 mcg = 0.072 mg; methimazole 2.5 mg per cat is not multiplied by weight.
- **Frequency vocabulary.** `once, q4h, q6h, q8h, q12h, q24h, q48h, q72h, weekly, q14d, monthly, cri, prn`. Map synonyms (SID→q24h, BID→q12h, TID→q8h, QID→q6h, EOD→q48h). Never coerce silently: an unknown value raises a validation note.
- **Merging.** Findings merge by `problemKey` (drug pair or drug + patient factor). All mechanisms for one problem go into one card at the highest severity, with every contributing rule listed in its trace.
- **Missing inputs.** Missing data is never treated as safe. If the breed is unknown and an MDR1-sensitive drug is prescribed, show a moderate "MDR1 status unknown" finding at doses above the preventive threshold.
- **Trace.** `trace.ms` is measured with `performance.now()`.

## 5. Rules (each its own module, with id, version, sources, tests)

Severity scale: contraindicated > major > moderate > minor. Administration and lab notes are notes, not findings.

| Rule id | Fires when | Severity |
|---|---|---|
| `MDR1_PGP_ML` | Macrocyclic lactone (P-gp substrate, mdr1Sensitive) in a dog. Tiers by breed MDR1 risk / mdr1Status, dose vs 50 mcg/kg threshold (preventive vs high-dose), and a concurrent P-gp inhibitor. | MDR1-risk breed (or mutant genotype) + high dose → **contraindicated**. High dose + P-gp inhibitor in any breed → **major**. MDR1-risk breed at preventive dose with a P-gp inhibitor, or unknown genotype at high dose → **moderate**. MDR1-risk breed at a label preventive dose without an inhibitor → **minor** (Mealey 2008: label heartworm-preventive doses are safe even for mutant/mutant dogs; changed from moderate after the 2026-10 clinical review). Otherwise minor/none. Sources: Mealey 2001, Mealey 2008 (doi:10.1016/j.vetpar.2008.09.009), Gramer 2010, Schrickx 2014 (doi:10.1016/j.tvjl.2014.01.012). |
| `CYP3A_INHIBITION` | Strong or moderate CYP3A inhibitor + CYP3A substrate | Moderate if the substrate is NTI or an immunosuppressant. Note that ketoconazole is used deliberately to cut ciclosporin dose; advise TDM (Myre 1991 doi:10.1159/000138850; Archer 2014 doi:10.1111/jvim.12265). |
| `CYP_INDUCTION` | Strong inducer (phenobarbital) + substrate | Moderate if NTI or immunosuppressant (therapeutic failure risk; trough TDM at ~2 weeks; alternatives oclacitinib/lokivetmab). Minor otherwise (e.g. prednisolone). Graham 2006 doi:10.1002/jbt.20118, Archer 2014. **Direction must be stated correctly.** |
| `NSAID_CORTICOSTEROID` | NSAID + corticosteroid concurrently | Major (GI ulceration/perforation). Lascelles 2005 doi:10.2460/javma.2005.227.1112. Do not quote unsourced multipliers. |
| `NSAID_DUPLICATE` | Two NSAIDs | Major |
| `NSAID_RENAL` | NSAID + CKD condition or creatinine above the species reference | Moderate for a dog, major for a cat. Cite ISFM/AAFP NSAID guidelines (Sparkes 2010) if verified on PubMed; otherwise label guidance. |
| `METHIMAZOLE_CKD` | Cat, methimazole + CKD condition or high creatinine | Moderate monitoring plan (Williams 2010 doi:10.1111/j.1939-1676.2010.0566.x; Daminet 2014 doi:10.1111/jsap.12157) |
| `SPECIES_HARDSTOP` | Cat + permethrin; cat + acetaminophen | Contraindicated |
| `ENRO_FELINE_RETINA` | Cat, enrofloxacin > 5 mg/kg/day (per-day computed from frequency) | Major (Wiebe & Hamilton 2002 doi:10.2460/javma.2002.221.1568) |
| `SEROTONERGIC` | ≥2 serotonergic drugs (tramadol, trazodone, fluoxetine) | Moderate. Evidence 'mechanistic' unless a veterinary source is verified. |
| `IMMUNOSUPPRESSION_ADDITIVE` | ≥2 immunosuppressants | Minor (infection monitoring, steroid taper) |
| `ALLERGY_CLASS` | Prescribed drug's allergyClass is in the patient's allergies | Major |
| `DOSE_RANGE` | Entered dose outside the selected protocol's range | Above max: major if ≥2× max, else moderate. Below min: minor (efficacy). No reference → note. |
| `RENAL_ADJUST` | renalFraction ≥ 0.5 and CKD or high creatinine | Moderate, with interval extension or dose reduction advice from the source |
| `ADMIN_NOTES` | — | Emits notes (with food, lab effects such as phenobarbital ↑ALP/↓T4) |

Cases A, B, C must produce exactly the expected findings in §6. Additional findings are allowed only if listed as acceptable in the case's `expect.allowAlso`.

## 6. Golden cases (`cases/cases.js`; each has `expect` asserted in tests)

| id | Patient | Prescription | Expected |
|---|---|---|---|
| `choco` | Rough Collie, MN, 4 y, 24 kg, MDR1 status unknown; generalised demodicosis + Malassezia otitis | Ivermectin 300 mcg/kg PO q24h; ketoconazole 5 mg/kg PO q12h | verdict **contraindicated**; MDR1_PGP_ML contraindicated (factors: breed, dose, P-gp inhibitor), with the alternative "isoxazoline (Mueller 2020 doi:10.1111/vde.12806)" and "ABCB1 genotyping"; note: ketoconazole with food; dose row ivermectin 7.2 mg |
| `kongyi` | Shih Tzu, MN, 6 y, 6 kg; idiopathic epilepsy + atopic dermatitis | Phenobarbital 2.5 mg/kg PO q12h; ciclosporin 5 mg/kg PO q24h; prednisolone 0.5 mg/kg PO q24h | verdict **moderate**; CYP_INDUCTION pheno→ciclosporin moderate (correct direction); CYP_INDUCTION pheno→prednisolone minor; IMMUNOSUPPRESSION_ADDITIVE minor; lab notes |
| `nabi` | Domestic Shorthair (코리안숏헤어 alias), FS, 13 y, 4.1 kg; hyperthyroidism + CKD IRIS 2; creatinine 2.0 | Methimazole 2.5 mg/cat PO q12h; amlodipine 0.625 mg/cat PO q24h; maropitant 1 mg/kg PO q24h | verdict **moderate**; no drug–drug findings; METHIMAZOLE_CKD moderate; per-cat doses not × weight |
| `mochi` | Korean Shorthair cat, FS, 2 y, 3.8 kg | Permethrin (canine spot-on) topical | verdict **contraindicated**; SPECIES_HARDSTOP |
| `daebak` | Labrador Retriever, FS, 3 y, 30 kg | Amoxicillin-clavulanate 12.5 mg/kg PO q12h; maropitant 2 mg/kg PO q24h | verdict **none** (negative control; at most notes) |

Case copy (title, clinical question, "engine should catch") is authored in EN and KO. A vet must review it before public launch; say so in the How-it-works page.

## 7. UI

### Visual system (`styles/portfolio.css`, scoped `.pf-root`)

- **Fonts.** System stack: `Inter, "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif`. Use `tabular-nums` for dose tables.
- **Type scale.** 12 / 13 / 14 / 16 / 20 / 28 / 40. Minimum 12px. Clinical body text is 14px.
- **Tokens.**
  - Neutral surfaces: `--pf-bg #f7f7f5`, `--pf-surface #ffffff`, `--pf-border #e4e4e0`, `--pf-ink #111827`, `--pf-ink-2 #4b5563`, `--pf-ink-3 #6b7280`.
  - One accent for interactive elements: teal `#0f766e`.
  - Severity colours (always paired with an icon and a word; used for severity only): contraindicated `#b42318`, major `#c4320a`, moderate `#b54708`, minor `#475467`. Soft backgrounds at ~8%.
  - Dark-mode tokens under `prefers-color-scheme: dark` and `[data-theme=dark]`.
- **Layout.** 8px spacing grid, 10px radius, 1px borders, no heavy shadows.
- **No emoji. No photos.** Species are shown with simple monoline SVG glyphs.
- **Accessibility.** Focus rings visible. Hit targets ≥ 32px (44px for organ-matrix cells). Pinch-zoom is never disabled. Colour contrast ≥ 4.5:1 for text.

### Pages

1. **Case study `#/`.** One scroll, no marketing.
   - Problem: polypharmacy in companion animals; heavy off-label human drug use in Korean clinics; no vet DUR in Korean EMRs.
   - What I built and my role.
   - Honest status: a prototype, not clinically validated. The company pivoted to pet-insurance claims, and the rule engine design carried into the claims engine.
   - A live, non-interactive render of case Choco's verdict and top finding produced by the real engine (not a screenshot).
   - CTAs: Open the cases · How it works.
2. **Cases `#/cases`.** 5 compact cards (2-column grid, 1 column on mobile). Each card: species glyph, signalment line, clinical question, medication chips, and "Engine should catch: …". Plus a "Blank case" card.
3. **Workbench `#/case/:id`.** One screen with live recompute (`useMemo` on inputs; no Run button, no staged progress).
   - **≥1200px:** Patient (300px) | Findings (flex) | Dose check (360px, sticky).
   - **768–1199px:** 2 columns with dose check below.
   - **<768px:** tabs Patient / Rx / Review with a sticky summary bar.
   - **Patient panel.** Species, weight, breed combobox (EN/KO aliases, MDR1 chip), age, sex/neuter, problems (chips from conditions.js), creatinine/ALT with live interpretation chips, allergy classes, MDR1 genotype select.
   - **Prescription editor.** Search (command-palette style, ↑↓/Enter; result rows show "Ivermectin · 이버멕틴 — matched alias: 하트가드"). Each med row: protocol select (indication + label/extra-label + source), dose value + unit (unit locked to protocol basis), route, frequency, duration, strength. A computed amount line ("7.2 mg → 0.72 mL of 10 mg/mL") and a range bar (protocol min–max, entered dose marker).
   - **Findings column:**
     - Verdict banner: icon + word + headline + real counts + trace ("3 pairs · 14 rules · 2 ms"). Actions: Report, Owner handout.
     - Findings cards. Contraindicated/major start expanded; moderate/minor collapse to one line. Each card shows: severity tag, title, drug + factor chips, consequence, Why bullets, What to do, Alternatives, Evidence (citation chips with DOI links, or "Mechanistic rationale — no study cited"), and a "Rule trace" disclosure (ruleId@version, inputs with sources). Hovering a card highlights the involved med rows and matrix cells.
     - Administration & monitoring notes as a neutral checklist.
     - "What changed" chip after an input edit, e.g. "Breed → Labrador: MDR1 finding cleared".
   - **Organ-system matrix (replaces the anatomy diagrams).** Full width in the findings column, below the findings.
     - Columns: Kidney, Liver, GI, Hemostasis, CNS, Heart.
     - Rows: drugs, plus a pinned top row "This patient" carrying the column badges.
     - Cells: a 3-segment single-hue ordinal glyph (0–3 filled) with a hatched "—" for not assessed.
     - Colour is reserved for badges: Additive (amber outline), Patient and Interaction (red outline pill + icon).
     - Tooltip/focus: level word + reason + source. Click opens an inline detail panel.
     - Legend: 4 labelled swatches + hatch.
     - Footnote: "Levels are ordinal flags from labels/literature; they are never added together."
     - Mobile: transposed into a stacked list per system. Follow the dataviz rules: no gradients, no percentages, a table view available.
   - **Dose check column.** A table per drug: prescribed per dose and per day in correct units, how to give it, the reference range bar with label/extra-label + source, and a status word.
4. **Report `#/case/:id/report`.**
   - An A4 sheet preview on screen with print CSS (`@page A4`), and a "Print / Save PDF" button (`window.print()` on the same page; no pop-up).
   - Contents:
     - header with the report ID (a deterministic hash of the case inputs);
     - patient block;
     - verdict;
     - findings table (severity · problem · rule id · action);
     - dose table;
     - notes;
     - clinician acknowledgement + signature box;
     - "Prototype — not clinically validated" footer on every page.
5. **Owner handout `#/case/:id/handout`.**
   - An A4 preview with an EN/KO toggle independent of the UI language.
   - Per medicine: what it is for, how much in owner units ("1 chewable (68 mcg)", "0.7 mL"), when (AM/PM × 7-day checkbox grid), with or without food, and what to watch for (drug ownerSigns + finding ownerSigns).
   - A condition block (e.g. CKD: thirst/urination/appetite).
   - "Call us immediately if" emergency signs, generated from finding ownerSigns.
   - Vet signature line; clinic placeholder "Your clinic".
   - Never "safe to use together". No emoji.
6. **How it works `#/how-it-works`.**
   - Pipeline diagram (inline SVG, theme-aware): case input → drug resolution (search/aliases) → rule layers (pharmacokinetic interactions, species/breed, drug–disease, dose) → merge-by-problem → three renderers (workbench, report, handout).
   - Rule-definition excerpt and dose-conversion excerpt.
   - **A live golden-case table:** it runs `analyze()` on all 5 cases in the browser and shows expected vs actual with pass/fail.
   - Formulary provenance: N drugs, M sources; list the sources.
   - Limitations and what I'd do next (vet review, pharmacist sign-off, more drugs).
   - A note that the original product used a licensed compendium and that this showcase was rebuilt from public sources.

### Components (indicative)

`SeverityTag`, `VerdictBanner`, `FindingCard`, `RuleTrace`, `CitationChip`, `NotesList`, `DoseTable`, `RangeBar`, `OrganMatrix`, `PatientPanel`, `BreedCombobox`, `DrugSearch`, `MedRow`, `SpeciesGlyph`, `LangToggle`, `A4Sheet`.

## 8. Retire

- **Main-app routes and pages.** Demo.jsx, FullSystem.jsx, Dashboard.jsx (analytics), Account.jsx, Pricing.jsx, Patients.jsx, Login/Register, AnalysisScreen, ResultsDisplay, DrugInput, the anatomy charts (`components/charts/*`), and `public/anatomy`.
- **Dev dependencies.** `scripts/trace-anatomy.cjs`, `jimp`, `potrace`.
- **Main-app links.** Update links: the clinic page "처방 안전 검토" button goes to `/dur`.
- **Keep** the insurance console, the clinic claim pre-check, the landing page and the start page.
- All removed code stays recoverable from git history (commit `0759600`).

## 9. Acceptance

- `npm test` passes: unit, rule and golden tests.
- `npm run build` and `npm run build:portfolio` succeed.
- The portfolio bundle is under 250 KB gzipped (lazy-load pages where useful).
- Screenshots at 1440px and 390px for: case study, cases, each golden workbench, report, handout, how-it-works. No overflow, no clipped labels, no broken images, no console errors.
- `grep` over `src/portfolio` finds no "Plumb", no `fetch(`, no `http` image URLs, no `confidence`.
- Every DOI in `sources.js` was verified on PubMed during this build. List them in `docs/portfolio/SOURCES_VERIFIED.md` with the verification date.
