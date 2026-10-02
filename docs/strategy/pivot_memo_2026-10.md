# NuvoVet pivot memo — October 2026

**From:** CEO office · **To:** founding team (염인, 김동현, 김명학), advisors, prospective investors
**Status:** decision memo. Research figures come from search-engine extracts gathered on 2026-10-02 (direct page fetches were blocked in the research environment). Verify every number marked † against the primary source before using it externally.

---

## The decision in one page

**Stop.** Selling a veterinary DUR (drug-interaction checker) to clinics. Academy. The KTL/QIA medical-device approval plan that was to consume 67% of the first-year budget. The "monetize de-identified clinic data" pitch.

**Start.** **NuvoVet Claims — the clinical data layer between Korean vet clinics and pet insurers.**
1. **Land (now → mid-2027):** sell claims structuring + clinical adjudication to the pet insurers that do *not* own a clinic rail. Claims already arrive as receipt photos, so no clinic integration is needed on day one.
2. **Expand (2027):** give clinics a free pre-check ("보험 청구 사전점검") that produces standard-coded claims; route them, with owner consent, to any partner insurer → a neutral multi-insurer rail.
3. **Scale (2028+):** Japan's non-Anicom insurers; data products built from the cross-insurer dataset.

**Why now.** Pet-insurance policies in force grew ~50% YoY to ~307k (H1 2026)†. The FSS tightened products in 2025 because of loss-ratio and moral-hazard concerns. MAFRA has coded 3,511 diseases and 4,930 procedures, with a roadmap to load them into EMRs in 2026 and manage records with them from 2027. Per-clinic fee disclosure for ~4,000 hospitals is scheduled for December 2026. The medical-records bill passed committee on 2026-09-02. Each of these makes *structured clinical claims data* more valuable and more obtainable — and nobody neutral owns it yet.

**What exists today (built during this rework).** A deterministic, explainable claims engine. A Korean drug-alias layer. An insurer console running on that engine. A clinic pre-check page. Receipt-photo extraction. 51 automated tests, including a recall/false-alarm regression gate. See §11.

**Next 90 days.** 20 claims-operations meetings → 2 design partners → a free retrospective study on 1,000–5,000 of each partner's historical claims → 1 paid pilot LOI → TIPS application anchored on that LOI.

---

## 1. Why version 1 failed

The product was technically ambitious. The business had no buyer with both the pain and the budget.

| What the deck claimed | What is actually true |
|---|---|
| "0 veterinary DUR systems exist" | Plumb's (owned by Instinct) ships a vet drug-interaction checker covering 25,000+ interactions, embedded in Instinct's EMR and ScribbleVet†. Korean EMRs lack one, but Korean vets rank workload, staffing and owner complaints as their pain, not drug safety†. Only ~20% of vet drugs even require a prescription†. |
| "Data moat: 862 drugs, 9,746 rules" | 645 of 862 records name Plumb's as their source (`_data_quality.ddi_source`). **0 of 862** have a human reviewer. Plumb's EULA prohibits copying, derivative works and AI/ML use†. So the "moat" is a legal liability, and anyone with an LLM and a weekend could rebuild it. |
| "SAM ₩8–12B" | Clinics are price-sensitive (avg individual clinic revenue ₩3.6억; small-clinic revenue falling in real terms)†. 4,500 companion clinics × ₩10만/month ≈ ₩54억/yr at 100% share. Two EMR vendors control distribution and give AI features away free. |
| "Regulatory approval = barrier to entry" | Nobody is required to buy a vet DUR, so approval would build a moat around a product with no pull. |
| Three products (Insurance, EMR, Academy) | Two of the three were UI mock-ups (the insurance demo even impersonated KB손해보험 with fake staff). Focus was the real gap. |

**Root cause:** the market was "vets who should care about drug safety". It should have been "payers who lose money when clinical data is messy."

---

## 2. What the research says

### 2.1 Korean pet insurance is small, fast-growing and structurally broken at the claims layer

| | 2022 | 2023 | 2024 | 2025 | H1 2026 |
|---|---|---|---|---|---|
| Policies in force | 71,896 | ~109,088 | 162,111 | ~251,800 (+55%) | 307,115 (+50% YoY) |
| Gross premium | ₩28.8bn | ₩46.9bn | ₩79.9bn | ~₩128.7bn (+61%) | ₩82.3bn (H1) |
| Penetration | ~1% | 1.4% | ~2% | ~3% | ~3.3% |

Sources: Newsway 2026-09-22, Asia Today 2026-04-16, FSS via KIRI 2024-04, Newstomato/Financial News 2026-09†.

Other facts:
- **11–13 insurers.** Meritz holds ~50%+ of policies; DB is gaining in new business. Kakao Pay Insurance entered in March 2026 with a product co-designed using Fitpet's clinic claims data. MyBrown (the first pet-specialist insurer) launched in July 2025, backed by Samsung Fire/Life, GC Vet, KDB, and **우리엔, an EMR vendor**†.
- **The FSS is controlling loss ratios.** From 2025-05: 1-year renewal, coverage ≤70%, co-pay ≥30%, deductible ≥₩30,000†. Insurers want 5-year renewal back. Standardization is the regulator's precondition for relaxing anything.
- **Claims are painful and messy.** Owners pay in full, then photograph receipts. The same condition is coded differently from clinic to clinic, neutering may be one line or many, and receipts mix in food, grooming and boarding. Financial News (2026-09) calls claims "제자리걸음" (stalled)†.
- **Prices vary wildly.** In MAFRA's 2025 survey of 3,950 clinics, first-visit fees ranged ₩1,000–61,000 (61×) around a mean of ₩10,520†. Vet services rank 37th of 40 markets in consumer satisfaction, and 46.1% of owners name a standard fee schedule as the top fix for pet insurance†.

### 2.2 The rails are being built vertically — and the followers have none

| Rail | Clinics | Notes |
|---|---|---|
| Meritz × 인투씨엔에스 (IntoVet) | ~1,600 auto-claim clinics† | the market leader owns its rail |
| MyBrown × 우리엔 "라이브청구" | 600+ clinics; ~25–27% of MyBrown claims settled at the counter† | the EMR vendor is an insurer shareholder |
| KIDI (보험개발원) POS, 2019 | 5 insurers contracted; current use unknown† | the only multi-insurer attempt |

DB, Samsung, Hyundai, KB, Hanwha, Lotte, NH, Carrot, Kakao Pay and Hana — the insurers that are **not** the leader — have no clinic rail. That is our market.

### 2.3 Everywhere else, the claims rail *is* the moat

- **Japan, Anicom:** 7,057 counter-settlement clinics (more than half of Japan's clinics), ~88% of 4.5M+ annual claims settled at the counter, #1 for 15 consecutive years, >40% share†. iPet has 6,217 clinics†. Penetration is ~20%, against ~3% in Korea.
- **UK, VetEnvoy/VetXML:** a hub used by more than 75% of practices†.
- **Australia, PetSure GapOnly:** in 85% of clinics, 3,000+ real-time claims/day†.
- **US, Trupanion:** a patented PIMS integration at 11,000+ clinics, which Trupanion calls a moat in its 10-K†. **No neutral US clearinghouse exists**†.
- **Claims automation pays:**
  - ManyPets: AI reviews 100% of claims and fully automates >50%; profit before tax up 59%†.
  - Lemonade: company-wide cost per claim of $19†.
  - The leaders build this in-house; mid-tier carriers and MGAs cannot†.

### 2.4 Dead ends we are explicitly not entering

- **AI scribes:** saturated and consolidating. Instinct bought ScribbleVet (2026-01), IDEXX bought CoVet (2026-09), and in Korea IntoVet and 우리엔 bundle free AI charting†.
- **Vet education:** 496 vet-school seats a year and a 97.8% licensing pass rate leave essentially no exam-prep market. Continuing education is crowded and free†.
- **Standalone DUR:** see §1.

---

## 3. The new company

**One-liner:** NuvoVet turns veterinary invoices into standard-coded, clinically checked insurance claims: an engine for insurers today, a neutral clinic-to-insurer rail tomorrow.

| Side | Pain | What NuvoVet gives them | Who pays |
|---|---|---|---|
| **Insurer** (claims ops, actuarial) | Adjusters re-key photographed receipts. No standard codes. Leakage from pre-existing conditions, price outliers, non-covered items, duplicates. Regulator pressure on loss ratio. | Structured claim mapped to standard codes. Payable computed. Explainable findings (coverage, clinical, pricing, integrity). Never an auto-denial. | Insurer: per claim plus platform fee |
| **Clinic** | Owner calls about rejected claims, document requests, unpaid balances. Disclosure and records rules coming. | Free pre-check before the owner files. Standard-coded record. Later, direct settlement (faster payment). | Free; later insurer-funded (the 실손24 model) or a settlement fee |
| **Owner** | Pays in full, waits, gets rejected for reasons they don't understand | Faster, cleaner claims (indirect) | — |

**Why insurers first**
1. **Concentrated buyers with budgets:** 11–13 insurers versus 4,500 clinics.
2. **Regulatory alignment:** our product is exactly the standardization the FSS wants before it relaxes product rules.
3. **No integration on day one:** claims already arrive as images, and our extraction handles them.
4. **A follower coalition:** the non-Meritz insurers cannot build a 1,600-clinic rail alone, and a neutral one beats each building its own.

**The DUR work is not wasted.** It becomes the clinical-knowledge layer behind the claims checks: drug–diagnosis consistency, dose plausibility, species safety. It also stays a free clinic-side feature (`/system`).

---

## 4. Defensibility (honest version)

**Not moats:** the drug database (licence-encumbered and reproducible), the LLM (a commodity), the UI.

**Moats we can build, in the order they compound:**
1. **The normalization layer.** Messy Korean invoice text, Korean brand names and free-text diagnoses mapped to MAFRA standard codes. It improves with every claim and every adjuster correction. Incumbents already treat code libraries as defensible assets: IntoCNS won an injunction over its treatment-code data†.
2. **A cross-insurer, adjudication-labelled dataset.** Every insurer sees only its own claims. A neutral processor sees the market: regional fee distributions, clinic patterns, which findings adjusters confirm. This is the Verisk/ISO pattern from P&C insurance.
3. **Two-sided network effects.** Once clinics use pre-check, each new insurer makes the rail more valuable to clinics, and each new clinic makes it more valuable to insurers. Anicom shows how durable this gets.
4. **Standards position.** Be the reference implementation of MAFRA codes for insurance use, and get a seat in the 2026 동물의료 제도개선 TF.
5. **Workflow embedding.** Once wired into an insurer's claims system and audit trail, we are expensive to rip out.

**Threats to those moats:**
- **KIDI builds a public rail like 실손24.** We become the clinical layer on top: KIDI transmits, we structure and adjudicate. Or we bid to be its vendor.
- **Insurers build in-house** (Meritz did). We target the followers, price below their internal cost, and offer the cross-insurer benchmark they cannot build.
- **The EMR duopoly.** We enter from the insurer side. On the clinic side we go through challengers (벳칭 PlusVet, 벳플럭스) and the VetHonors MSO, then offer IntoCNS/우리엔 a revenue share, as 실손24 pays EMR vendors.

---

## 5. Market size (bottom-up)

**Korea, today**
- Annualized 2026 premium is ~₩165–180bn.
- Claims volume is the key unknown. At an assumed 3–5 claims per policy per year, that is **~1.0–1.5M claims/yr**. Validate this in the pilot.
- At ₩1,000–3,000 per claim, revenue is **₩1–4.5bn/yr at 100% share**. Small.
- **Value anchor:** at an ~80% loss ratio, ~₩130–145bn of claims are paid a year. Finding 3–5% leakage is worth **₩4–7bn/yr** to insurers. That is the basis for value-based pricing.

**Korea, 2030 scenario.** Penetration of 8% (still under half of Japan's) puts premiums at ~₩600–800bn. That supports **₩10–25bn** of revenue including data products.

**Japan.** A ~₩1.3조 market with ~20% penetration. Anicom alone handles 4.5M+ claims, and the non-Anicom/iPet insurers lack counter settlement. IntoCNS is already entering Japan through a white-label partner, so the Korea→Japan path exists.

**Global.** Mid-tier carriers and MGAs: Lassie ($100M+ ARR), Dalma, US MGAs. The adjudication engine is language-agnostic; only the normalization layer is Korea-specific.

**CEO verdict:** Korea alone is a capital-efficient, defensible business with a ₩10–30bn revenue ceiling by 2030. That is good, but not a venture outcome by itself. **A venture outcome requires becoming the neutral rail in Korea *and* reaching Japan.** We should raise and plan accordingly, and not pretend Korea alone is a ₩1조 market.

---

## 6. Business model and unit economics

- **Insurer pricing:** per claim, ₩500–1,000 for structuring only and ₩1,500–3,000 for full adjudication, plus a platform fee. In pilots, offer a share of verified savings.
- **Clinic:** free pre-check. Later, a settlement fee or an insurer-funded deployment fee (the 실손24 model).
- **Data products (later, aggregated, consented):** a regional fee index, clinic pattern benchmarks, product-design data. Kakao Pay Insurance built a product on Fitpet's clinic claims data, so the demand is proven†.
- **Variable cost per claim:**
  - Extraction with Claude Opus 5.5 ($4 / $20 per MTok) uses ~1.8k input and ~0.8k output tokens per receipt, so **≈ $0.023 ≈ ₩32 per claim**.
  - Adjudication itself is deterministic CPU work.
  - Gross margin is therefore >90% even at ₩1,000 per claim.

---

## 7. Go-to-market

**Phase 0 (now → Dec 2026): prove value on their data.**
- 20 conversations with claims-operations and actuarial heads: DB손보, 삼성화재, 현대해상, KB손보, 한화, 롯데, NH, 캐롯, 카카오페이손보, 하나, 마이브라운.
- **Offer:** a free retrospective study on 1,000–5,000 de-identified historical claims. We report line-level structuring accuracy versus adjusters, leakage identified (₩ and % of paid), false-alarm rate, and auto-approve potential.
- **Goal:** 2 design partners and 1 paid-pilot LOI.

**Phase 1 (H1 2027): live pilot.**
- API in shadow mode, then assisted mode.
- Ingest the MAFRA code table and the December-2026 per-clinic fee disclosure. The engine already supports a clinic's posted fee as a check (`pricing.above_posted_fee`).
- Prepare for financial-sector vendor reviews: VPC deployment option, pseudonymized IDs, no image retention, ISMS-P roadmap.

**Phase 2 (H2 2027): clinic side → rail.**
- Roll out pre-check through challenger EMRs, the VetHonors MSO and directly (free).
- With owner consent, route coded claims to partner insurers.
- Align with 2027 standard-code record keeping.

**Phase 3 (2028): Japan and data products.**

**Funding.** A TIPS application anchored by an insurer LOI, plus 초기창업패키지. Strategic investors: insurers' CVCs and KDB, which is already in MyBrown. Keep burn low: three founders plus one claims hire until the pilot converts.

---

## 8. Keep / kill

| Keep | Kill |
|---|---|
| Clinical knowledge (species rules, interactions) as the claims engine's clinical layer | Standalone DUR as the company's product |
| `/system` prescription review as a free clinic feature | Academy (removed; recoverable from commit `aca919e`) |
| Korean product-name ↔ ingredient mapping (now a curated alias layer) | Insurance UI mock-ups and the KB impersonation |
| OCR/extraction | Medical-device approval plan |
| | "Sell de-identified clinic data" as a pitch line (it alarms vets, who protested insurer data flows in 2019†) |

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **IP: Plumb's-derived drug data** | Stop distributing it commercially. Do a clean-room rebuild from QIA product approvals (medi.qia.go.kr), FDA/EMA labels and primary literature, with DVM pharmacologist sign-off. The claims engine already isolates this: therapeutic classes, Korean aliases and species rules are NuvoVet-authored with PubMed-verified references. Only dose references read legacy data, and every such finding is labelled as such. |
| **Privacy/financial regulation** (PIPA, 신용정보법, outsourcing and cloud rules for financial firms) | Pseudonymized patient IDs, no receipt-image retention, VPC deployment option, ISMS-P plan before the second customer |
| **Vet association backlash** | Clinic-consented, owner-initiated flows. Clinics get value first (pre-check). No sale of clinic-identifiable data. A DVM advisory panel. |
| **Long insurer sales cycles** | The retrospective study needs no integration. TIPS as a bridge. |
| **KIDI or an insurer builds it** | Be the clinical layer on top. Serve the followers. Cross-insurer benchmarks. |
| **Slowing growth** (new-contract growth 66% → 59% → 39%) | Standardization is the regulator's precondition for relaxing products, so we are aligned with the fix rather than exposed to the slowdown |
| **Wrong findings harm owners** | The engine never auto-denies. Rules are deterministic and explainable, every finding carries evidence, adjusters decide, and decisions are audit-logged. |

---

## 10. Team

- **염인 (CEO / product & engineering):** owns the engine, console and security posture.
- **김동현 (data/ML):** owns extraction, normalization accuracy and the evaluation harness on partner data.
- **김명학 (BD/finance):** owns the 20 insurer meetings, the pilot contract and TIPS.
- **First hire:** a former pet-insurance adjuster or 손해사정사, to turn findings into the adjusters' language and policy logic.
- **Advisors:** 2–3 DVMs, including a clinical pharmacologist, for rule sign-off.

---

## 11. What was built in this rework

| Area | Where | What it does |
|---|---|---|
| Claims engine | `backend/claims/` | Pydantic claim model. Codebooks with 62 procedure and 45 diagnosis seed codes (slots reserved for MAFRA mapping). Normalization. 4 rule families. Payable computation. Never auto-denies. |
| Korean drug layer | `backend/claims/data/kr_drug_aliases.json`, `knowledge.py` | 190 Korean brand/ingredient aliases (아포퀠, 베트메딘, 소론도…). Canonicalizes duplicate Korean records. Own therapeutic-class vocabulary. |
| Clinical rules | `backend/claims/data/clinical_rules.json` | Species safety rules with references verified on PubMed (DOIs). NSAID+steroid combination rules. Chronic-condition marker drugs (the pre-existing-condition signal). |
| Extraction | `backend/claims/extract.py` | Receipt photo to claim draft via Claude structured output. The model transcribes; it never decides. |
| API | `backend/routers/claims.py` | `adjudicate`, `precheck`, `extract`, `demo`, `evaluation`, `codes` |
| Evaluation | `backend/claims/synthetic.py` | Labelled synthetic claims with 9 anomaly types. Recall is 87–100% per type and the clean-claim false-alarm rate is 0% across 3 seeds — **synthetic, so this proves the rules behave as designed, not real-world accuracy.** |
| Tests | `backend/tests/` | 51 tests, including a recall/false-alarm regression gate |
| Insurer console | `/insurance` | Runs on the engine (live API, with a static-snapshot fallback). Live claim composer. Clinic risk. Fee benchmarks. Engine performance. API docs. |
| Clinic pre-check | `/clinic/claim` | Free pre-check with receipt-photo fill |
| Security | `backend/auth.py`, `main.py` | Removed the `admin/admin` default, required a production secret, boots without Postgres, CORS from env |

---

## Appendix — key sources (verify † items before external use)

- Pet insurance series: newsway.co.kr/news/view?ud=2026092217064720239 · asiatoday.co.kr/kn/view.php?key=20260416010004872 · newstomato.com/ReadNews.aspx?no=1312894 · fnnews.com/news/202609071818114472
- FSS 2025 product rules: edaily.co.kr (2025-04-06) · biz.newdaily.co.kr (2025-05-07)
- Rails: newspim.com/news/view/20240322000076 (Meritz auto-claims) · venturesquare.net/1098501 and fntimes.com (MyBrown live claims) · view.asiae.co.kr/article/2019060707034694934 (KIDI POS)
- MAFRA standard codes: nongmin.com/article/20250424500071 · dailyvet.co.kr/news/policy/240836
- Fee survey: mafra.go.kr/bbs/home/792/592824/download.do · korea.kr pressRelease 156736122
- Per-clinic fee disclosure: busan.com (2026-07-16) · m.news.nate.com/view/20260902n27863
- Records bill: hankyung.com/article/202609029891i
- EMR market and the IntoCNS injunction: dailypharm.com/user/news/337848 · dailyvet.co.kr/news/industry/286451
- Anicom: anicom-sompo.co.jp/customers/anicomah · iPet: ipet-ins.com/products/madoguchiseisan
- VetEnvoy: vetxml.co.uk · GapOnly: insurancebusinessmag.com (AU, 2026) · Trupanion 10-K FY2025 (sec.gov)
- ManyPets: insurance-edge.net (2026-08-06) · Lemonade Q4-2024 shareholder letter
- Plumb's EULA: plumbs.com/eula-updated · Plumb's interaction checker: plumbs.com/features/drug-interaction-checker
- Scribe consolidation: instinct.vet/news (ScribbleVet) · dvm360.com (IDEXX–CoVet)
- PubMed references used in the engine: Lascelles 2005 doi:10.2460/javma.2005.227.1112 · Boothe 2002 doi:10.2460/javma.2002.221.1131 · Wiebe & Hamilton 2002 doi:10.2460/javma.2002.221.1568 · Mealey 2001 doi:10.1097/00008571-200111000-00012 · Rumbeiha 1995 PMID 8585668 · Ceccherini 2015 PMID 26623376
