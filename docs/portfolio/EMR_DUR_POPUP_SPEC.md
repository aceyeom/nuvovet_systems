# EMR + DUR popup demo: build spec (binding)

Status: binding spec for the Phase 6 build. Revision 2, 2026-10-03: the clinical-pharmacist / CDS-engineer critique (`/tmp/claude-0/uiresearch/critique/critique_1.md`) and the design critique's EMR items were applied. Accepted and rejected findings are listed in the [Revision log](#revision-log).

**Companion documents:**
- [`docs/design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md): tokens, work packages (WP1–WP4 implement this spec) and acceptance gates.
- [`DUR_SHOWCASE_SPEC.md`](./DUR_SHOWCASE_SPEC.md): clean-room data, no network, no fabricated numbers, determinism.

**The founder's request:** "Turn the DUR into a web popup for demonstration on top of an existing EMR. Make sure it's accurate."

**What this spec delivers:**
- **A fictional, generic Korean veterinary EMR screen** ("데모 차트 (가상 EMR)").
- **The NuvoVet DUR overlay** a real EMR would embed, modelled on CDS Hooks `order-select` / `order-sign`, isolated in Shadow DOM, built in-app and as a standalone widget bundle.
- **An adapter** that turns EMR rows (prescriptions *and* in-clinic administrations) into engine input without ever guessing a strength, concentration, frequency, indication or clinical fact.
- **An accuracy test plan** of 61 scenarios whose expected outputs were produced by running the engine (§8).

**How the expected outputs were produced.** Every binding output in §8 was produced by executing code, not by hand:
- **Engine:** a copy of the repo engine with the D1/D2 patch (`/tmp/claude-0/uiresearch/spec/pf-fixed`) plus the revision-2 changes D9–D15, applied by `/tmp/claude-0/uiresearch/spec-rev/patch_engine.py` to `/tmp/claude-0/uiresearch/spec-rev/pf-rev`.
- **Adapter:** Appendix C (revision 2), wired to that engine as `/tmp/claude-0/uiresearch/spec-rev/adapter_rev.mjs`.
- **Runner:** `node run.mjs rev SPEC|NEW` (outputs `out_rev_spec.txt`, `out_rev_new.txt`); card decisions (gate, related rows, suggestions, `inputHash`) by `node cards_rev.mjs` (`out_rev_cards.txt`).
- **Engine test suite on the patched copy:** 244 of 249 pass. The 5 failures are expected and listed in §5.2 (one path-only failure from running outside `frontend/`, and four tests whose behaviour this spec changes on purpose).

---

## 0. Key decisions

1. **Two-stage check, following CDS Hooks.**
   - **On every grid edit (`order-select`, 300 ms debounce):** passive. Row badges and the side panel update; focus never moves.
   - **On 처방 저장 / 처방전 출력 / eVET 전송 (`order-sign`):** a blocking modal opens **only** for 금기 or 중대 findings not yet acknowledged for the same inputs.
   - **Never interruptive:** 주의, 경미, notes, "확인 필요".
2. **Never invent data.**
   - Strength and concentration come only from the EMR product code (`productMap`).
   - Frequency comes from 용법 and 횟수 Tt. When both are present and disagree, the row is flagged **and the higher frequency is used**, so a safety ceiling is never under-counted.
   - The protocol comes from route + frequency + mapped diagnosis + the product's default (chewable heartworm products).
   - Free-text allergies or diagnoses are matched only by exact keys from the knowledge base; anything unmapped, stale or recognised from free text makes the verdict **검토 불완전**, never "규칙상 문제 없음".
3. **Everything the patient receives in this visit is checked.** Rx rows *and* Tx rows whose 상품코드 is in `productMap` (in-clinic injections). Two rows of the same ingredient are summed when they share route, frequency, duration and protocol, and otherwise raise a same-ingredient duplication finding.
4. **The engine is fixed before the demo is called accurate** (§5): D1/D2 tolerances, D3 suggestions re-checked, D4 non-splittable split, D6/D7 incomplete surface, D8 dose-check count, and in revision 2: D9 same-ingredient summing/duplication, D10 starting-dose protocols, D11 single-dose-only references, D12 single administrations, D13 label jurisdiction, D14 minimum-only labels, D15 planned amount vs safety ceiling. D5 (duration limits) is not invented; it is shown as "검토 안 함: 투여기간". NSAID + CKD + heart failure stays 주의 until a primary label source is read in full (D16).
5. **Override reasons are coded** with a corrected lineage (§3.9): HIRA's 11 codes are overlapping-prescription (중복처방) codes; HIRA takes free text for combination, age and pregnancy alerts; J1–J6 are one hospital study's proposal (Jang 2016), used here as a design basis only. Contraindicated findings need a reason, a checked comment and 보호자 설명; major findings need a reason. No hard stop.
6. **Packaging.**
   - **The widget** is plain React + hand-written CSS in Shadow DOM, no Radix. One React root lives in the overlay host under `<body>` and portals into the panel and the badge slots. The gate is a native `<dialog>` opened with `showModal()` inside the overlay's shadow root.
   - **The host EMR** has its own generic desktop look.
   - **Ships as** `/dur#/emr/:visitId` (main app), the same route in the standalone file, and `dist-widget/nuvovet-dur.iife.js`.

---

## 1. Scope, sources and what could not be reached

**Evidence used:**
- The emr track: CDS Hooks spec and the `order-select`/`order-sign` hook pages and the HL7 PDDI-CDS IG (fetched from raw.githubusercontent.com); SMART App Launch.
- **Jang et al. 2016, read in full via PubMed** (PMC4756057, doi:10.4258/hir.2016.22.1.39): HIRA's 11 overlapping-prescription codes (A, B, C, F, G, H, I, J, K, L, P); free-text reasons for combination, age and pregnancy alerts; inspection grades A (reason optional), B (reason required), C (must not be prescribed), D (optional); the requirement to explain the drug and its side effects to the patient when a reason is entered; the proposed J1–J6 codes (J1 = P + G, J2 clinical justification, J3 = revised L, J4 = A/C/F/H/I/J merged, J5 operation/examination, J6 emergency), covering 84.2 % of overrides; 72.2 % of overrides were free text and 21.1 % of free text was meaningless.
- PubMed papers from the emr track: Shin 2019 (doi:10.1186/s12913-019-4686-9), Lee 2018 (doi:10.1371/journal.pone.0195434), van der Sijs 2006 (doi:10.1197/jamia.M1809), Phansalkar 2013 (doi:10.1136/amiajnl-2012-001089), Payne 2015 (doi:10.1093/jamia/ocv011).
- `backend/scripts/docs/EMR_Field_Analysis.md`: anonymised real EMR screens, the primary source for field names (it shows Tx and Rx mixed in one grid, with in-clinic injections as Tx).
- The ai-tells track (CDS card model, alert fatigue) and the stack track (Shadow DOM, Chromium 141), plus the critique's Chromium checks in `/tmp/claude-0/uiresearch/critique-emr/shadowtest/` (`t.cjs`: portals, dialog; `font.cjs`: fonts under a strict CSP).

**Seen only in search snippets, not used for any rule:** UK VMD SPC 2177183 (Metacam dogs contraindication wording); dailyvet articles on eVET scope.

**Blocked, not read:** cds-hooks.hl7.org, hl7.org, build.fhir.org (so the FHIR `patient-animal` extension is not used); hira.or.kr; law.go.kr; the Korean QIA label database; the EU Rimadyl and Vetmedin SPCs.

**Must not be claimed:** that any Korean vet EMR lacks a safety check; any vendor's exact grid layout; which drugs eVET covers.

**Out of scope:** receipts (수납), eVET transmission, real authentication, any network call, any real vendor name, logo, colour or layout (never name 인투벳, 이프렌즈, 플러스벳 or any other vendor).

---

## 2. The fictional EMR host

### 2.1 Identity

- Product: **"데모 차트"**, subtitle "가상 EMR". Clinic: **"새봄동물의료센터 (가상)"**. Vet: **"김민서 (가상)"**, user id `Practitioner/demo-kim`.
- **Watermark** (bottom-left, `text-xs`, 60 % opacity, printed): `가상 EMR · 실제 제품이 아닙니다`. It labels the host only; the DUR disclaimer is the demo bar's `교육용 프로토타입` marker (DESIGN_SYSTEM §5.6).
- **Look**, in `src/portfolio/emr/host/emr.css`, scoped under `.emr-root`, no Tailwind, no `src/ui`:

| Element | Value |
|---|---|
| font | `"Malgun Gothic","Apple SD Gothic Neo",-apple-system,sans-serif`, 12 px (grid) / 13 px (forms), line-height 1.4 |
| frame background | `#E9ECEF` |
| panels | `#FFFFFF`, 1 px `#C8CDD2` border, 2 px radius |
| tab strip | `#DDE3EA`, active tab `#FFFFFF` |
| title bars | `#46566B`, white text, 28 px |
| grid header | `#F1F3F5`; rows 26 px; selected row `#DCE8F7`; DUR-highlighted row `#FFF4CC` |
| buttons | 26 px, `#F8F9FA`, `#ADB5BD` border; 처방 저장 `#2F5E9E` with white text (6.6:1) |

The host stays light in every site theme (§2.5).

### 2.2 Layout

Designed at 1440×900; must work at 1280×800.

```
┌ demo bar 40px (portfolio chrome, NuvoVet tokens, follows site theme) ────────────────────────────────────────────┐
│ nuvovet DUR 데모   방문 [V1 초코 ▾]   시도: 처방 저장을 눌러 보세요   위젯 [라이트|다크]  [교육용 프로토타입]  기록 내보내기  사례로 │
├ EMR title bar 28px ────────────────────────────────────────────────────────────────────────────────────────────┤
│ 데모 차트 (가상 EMR) │ 접수  진료  수납  예약 │ 새봄동물의료센터 (가상) · 수의사 김민서 (가상) · 2026-10-03           │
├──────────────┬───────────────────────────────────────────────────────────────────────┬─────────────────────────┤
│ 대기목록 220px │ 환자 헤더 (2 lines, 13px)                                                │ NuvoVet DUR panel 360px │
│ [검색 이름/번호] │ 초코 #1042 · 개 · ROUGH COLLIE/러프 콜리 · 중성화 수컷 · 4y 4m (2022-05-14)│ (portal target, docked) │
│ 탭 대기|진료중|수납│ 24.0 kg (2026-10-03 측정) · 보호자 이○○ · 담당의 김민서 · 특이 ⚠ MDR1 미검사    │                         │
│ 09:10 초코 개 진료중│ [S][O][A][P][검사결과][이력]  (A: 진단명 chips "D-DERM-012 전신성 모낭충증")       │                         │
│ … (V1–V10)    │ ── TX/RX ── Rx 검색 [성분명/상품명/초성 ⌕]  필터 (정)(주)(액)(외)                 │                         │
│              │ ┌ Rx grid (§2.4) ─────────────────────────────────────────────────┐   │                         │
│              │ │ 구분 상품코드 이름 단위 투여량 계산량 횟수 일수 경로 용법 조제 전체 금액 DUR │   │                         │
│              │ └────────────────────────────────────────────────────────────────┘   │                         │
│              │ 진료기록 footer (DUR acknowledgement lines, §3.10)                     │                         │
│              │ [처방 저장] [처방전 출력] [eVET 전송] [수납으로]  · skip link "DUR 검토로 이동" │                         │
└──────────────┴───────────────────────────────────────────────────────────────────────┴─────────────────────────┘
```
The host's own patient header and title bar are host chrome (the EMR's real layout uses `·` joins); NuvoVet surfaces do not.

**Responsive behaviour:**

| Width | Panel | EMR changes |
|---|---|---|
| ≥ 1280 | docked in a 360 px right column | — |
| 1024–1279 | `layout:'floating'`: launcher at bottom-right opens a 380 px drawer over the EMR's right edge | waitlist collapses to 48 px |
| < 1024 | bottom sheet: 48 px collapsed bar with the verdict, expands to 70 vh | waitlist behind a "대기목록" button |

- The Rx grid scrolls horizontally inside its own container; the page never does.
- Hidden columns below 1440: `폴더명`, `VAT`; below 1280: `상품코드`, `금액`.
- Responsive layouts may unmount the right column; the widget's React root does not live there (§3.4).

### 2.3 Patient header fields

Field names follow `EMR_Field_Analysis.md`:

| Field | Shows |
|---|---|
| 동물 이름 + 번호 | 초코 #1042 |
| 종 | 개 / 고양이 / 토끼 … (source value Canine / Feline / Rabbit; blank allowed) |
| 품종 | bilingual `ROUGH COLLIE/러프 콜리` |
| 성별 | Spayed Female 중성화 암컷, Neutered Male 중성화 수컷, Intact Female 암컷, Intact Male 수컷, Unknown 미상 |
| 생년월일 → 나이 | `4y 4m` |
| 체중 | value + measurement date; older than 30 days (14 days under 6 months of age) shows "(45일 전 측정)" in `#B35C00` |
| 보호자 | masked name |
| 특이사항 | ⚠ + text, e.g. "MDR1 미검사" |
| 검사결과 tab | labs: date, test, value, unit, reference range (creatinine mg/dL; µmol/L converted by the adapter) |
| A (진단명) | chips of `code + name`; codes **fictional** (`D-DERM-012` …); a free-text diagnosis has a code like `D-FREE-01` and its typed name |
| 알레르기 | coded entries shown in Korean; free-text entries allowed (§4.1) |

### 2.4 Rx grid

**Columns, in order.** Columns marked *demo addition* do not appear in the observed EMR screens (`EMR_Field_Analysis.md`); they are added for the demo and labelled so in the column tooltip.

| Column | Example | Editable | Notes |
|---|---|---|---|
| 폴더명 | 피부 | no | from the product |
| 구분 | Rx / Tx | select | **Tx rows whose 상품코드 is in `productMap` are sent to DUR** (in-clinic administration, badge "원내"); Tx rows without a mapped product (procedures, labs) are not |
| 상품코드 | `RX-IVM-SOL10` | no | key into `productMap` (Appendix A) |
| 이름 | 이버멕틴 경구액 10 mg/mL (액) | no | ingredient + strength + form suffix (정)(주)(액)(외)(캡)(츄) |
| 단위 | `mcg/kg` ▾ | select | mg/kg, mcg/kg, IU/kg, mL/kg, mg, mcg, mL, EA, 포 (*demo addition*: 포, mL, mcg) |
| 투여량 Qty | 300 | number | step 0.01 |
| 계산량 | 7.2 mg (0.72 mL) | no | host-computed (§2.4.1) |
| 횟수 Tt | 1 | integer | times per day; blank allowed |
| 일수 Dy | 7 | integer | blank allowed |
| 경로 Rt | PO ▾ | select | PO, IV, SC, IM, Eye, Ear, Top, Inh |
| 용법 | 격일 | text | *demo addition*; optional; read together with Tt (§4.2) |
| 조제 | 정제 ▾ | select | *demo addition*: 정제 / 가루; 가루 = powder, one 포 per dose (§4.2) |
| 전체 | 100.8 mg | no | host-computed total in mg, as in the observed EMR |
| 금액 | 7,000원 | no | fictional price table ("가상 단가" in the tooltip) |
| DUR | 금기 | no | `<td><span data-nv-slot="rx-1"></span></td>`; the widget attaches its shadow root to the span (§3.4) |

#### 2.4.1 Host calculations (display only; the engine recomputes everything from raw fields)

- **계산량:** Qty × 체중 for `/kg` units, in the numerator unit; liquids add the mL equivalent (`7.2 mg (0.72 mL)`). For `mg`/`mcg`/`mL` it is the Qty. For `EA` it is Qty × strength in mg.
- **전체** = 계산량 (mg) × Tt × Dy, in mg (the observed EMR shows an mg total).
- Tooltip on both: "EMR 계산값 (표시용)".

#### 2.4.2 Behaviour

- **Adding a row.** Rx 검색 is a combobox (↑↓/Enter) over product display names plus the engine's bilingual, jamo-aware `searchDrugs`, listing **products**. Choosing one adds a row with the product's default unit and empty Qty/Tt/Dy, and focuses Qty.
- **Deleting.** "×" at the end of each row (`aria-label="행 삭제: 이버멕틴"`).
- **Edits** commit on input. 300 ms after the last change the host calls `dur.check(toCdsRequest(visit, 'order-select'))`. Host rows are React state; on every render the host keeps the `data-nv-slot` span for each row, and the widget re-acquires slots on every `check()` (§3.4).
- **Saving.** 처방 저장 / 처방전 출력 / eVET 전송 call `await dur.gate(toCdsRequest(visit, 'order-sign'))`. If `proceed`: host toast "처방을 저장했습니다 (데모)" and the acknowledgement lines in the 진료기록 footer. If not: focus returns to `focusRowId`'s Qty input, or to the save button.
- **No persistence.** Visits are in memory per page load; "방문 초기화" in the demo bar reloads the fixture.

### 2.5 Language and theme

- **The host is Korean only.** Qty, Tt, Dy and Rt abbreviations are kept, as in real Korean EMRs.
- **Widget locale:** `ko` by default on `#/emr`; `?lang=en` switches it to `en`. The demo bar's LangToggle switches the widget locale only.
- **Theme:** the host is always light; the widget theme defaults to `light` and is switchable in the demo bar (라이트 | 다크); the demo bar follows the site theme.

### 2.6 Sample patients and visits

Fictional; fixtures verbatim in Appendix B; expected results are the binding column of §8.1.

| Visit | Patient | Prescription (EMR rows) | Expected at save | Demo-bar hint |
|---|---|---|---|---|
| V1 | 초코 #1042, Rough Collie, NM, 24.0 kg, MDR1 미검사; 전신성 모낭충증, 말라세지아 외이염 | 이버멕틴 경구액 10 mg/mL mcg/kg 300 Tt1 Dy7 PO; 케토코나졸 정 200 mg mg/kg 5 Tt2 Dy21 PO | **gate opens**: 금기 MDR1_PGP_ML (ketoconazole row shows "관련") | 처방 저장을 눌러 보세요 |
| V2 | 콩이 #0877, 시츄, NM, 6.0 kg; 뇌전증, 아토피 | 페노바르비탈 15 mg 2.5 mg/kg Tt2 Dy30; 사이클로스포린 10 mg 캡슐 5 mg/kg Tt1 Dy30; 프레드니솔론 5 mg 0.5 mg/kg Tt1 Dy14 | no gate; 주의 1 · 경미 2 | 사이클로스포린 행을 삭제해 보세요 |
| V3 | 나비 #1310, 코리안숏헤어, FS, 4.1 kg, Cr 2.0; 갑상선기능항진증, CKD | 메티마졸 2.5 mg mg 2.5 Tt2 Dy30; 암로디핀 2.5 mg EA 0.25 Tt1 Dy30; 마로피탄트 16 mg 1 mg/kg Tt1 Dy14 | no gate; 주의 1 | 마로피탄트 조제를 가루로 바꿔 보세요 |
| V4 | 모찌 #1455, 코리안숏헤어, FS, 3.8 kg | 퍼메트린 스팟온 (개 전용) EA 1 Tt1 Dy1 Top | **gate opens**: 금기 SPECIES_HARDSTOP | 처방 저장을 눌러 보세요 |
| V5 | 대박 #0921, 래브라도, FS, 30.0 kg; 표재성 농피증, 구토 | 아목시실린·클라불란산 375 mg 12.5 mg/kg Tt2 Dy7; 마로피탄트 60 mg 2 mg/kg Tt1 Dy2 | no gate; "규칙상 문제 없음" (neutral) | 체중을 지워 보세요 |
| V6 | 보리 #1502, 말티즈, FS, 3.2 kg, Cr 2.1; CKD, 골관절염, MMVD | 멜록시캄 현탁액 1.5 mg/mL 0.1 mg/kg Tt1 Dy14; 푸로세미드 12.5 mg 2 mg/kg Tt2; 피모벤단 1.25 mg 0.25 mg/kg Tt2; 베나제프릴 5 mg 0.5 mg/kg Tt1 | no gate; 주의 1 (NSAID_RENAL; furosemide and benazepril rows show "관련"). Stays 주의 by founder decision until a label source is read in full (§5, D16) | 멜록시캄을 mL 0.21로 바꿔 보세요 |
| V7 | 해피 #0650, 골든 리트리버, NM, 28.0 kg; 골관절염, 아토피, 불안 | 카프로펜 100 mg 4.4 mg/kg Tt1 Dy7; 프레드니솔론 5 mg 0.5 mg/kg Tt1 Dy7; 트라마돌 50 mg 5 mg/kg Tt4 Dy5; 트라조돈 100 mg 10 mg/kg Tt1 Dy1 | **gate opens**: 중대 NSAID_CORTICOSTEROID; panel also 주의 SEROTONERGIC | 프레드니솔론을 삭제해 보세요 |
| V8 | 레오 #1388, 러시안 블루, NM, 3.5 kg; 요로감염 | 엔로플록사신 68 mg EA 0.5 Tt1 Dy10 (Rx); 멜록시캄 주사 5 mg/mL 0.3 mg/kg Tt1 Dy1 SC (**Tx**, given in clinic) | **gate opens**: 중대 ENRO_FELINE_RETINA | 멜록시캄 일수를 3으로 바꿔 보세요 |
| V9 | 두부 #1620, 푸들, NM, 8.0 kg; 뇌전증, 불안 | 플루옥세틴 16 mg 츄어블 EA 1 Tt1 Dy30; 페노바르비탈 30 mg 2.5 mg/kg Tt2 Dy30 | **gate opens**: 금기 DRUG_CONDITION | — |
| V10 | 코코 #1733, 비글, 암컷, 12.0 kg, 알레르기 penicillin; 피부 감염 | 아목시실린·클라불란산 250 mg 12.5 mg/kg Tt2 Dy7 | **gate opens**: 중대 ALLERGY_CLASS | — |

V1–V5 reproduce the five golden cases. The V3 hint demonstrates the powder rule (the ½-tablet rounding note disappears; §4.2).

---

## 3. The DUR overlay

### 3.1 Architecture

```
src/portfolio/emr/
  adapter.js          EMR visit → caseInput (+ per-row status). Pure. Appendix C is the reference implementation.
  cds.js              toVisit(cdsRequest) / toCdsRequest(visit, hook): CDS-Hooks-shaped request ⇄ visit model
  productMap.js       Appendix A.1        conditionMap.js   Appendix A.2 + PROTOCOL_CONDITIONS + SAME_INDICATION
  cards.js            engine Result + adapter output → DurResponse (cards, rowStatus, verdict, notes, coverage, hashes)
  coverage.js         per-visit coverage strip (§6.2)
  suggestions.js      candidate suggestions + re-check (§6.3)
  overrideReasons.js  §3.9 code system      commentCheck.js  §3.9 free-text validator
  feedbackLog.js      §3.10 (memory + localStorage, try/catch)
  sdk.js              createDur(options): state, check(), gate() promise plumbing, events. No DOM.
  fixtures.js         Appendix B visits V1–V10 (+ test-only visits)
  widget/
    index.jsx         createDurWidget(options) = createDur + mount UI
    entry.js          IIFE/ESM entry: window.NuvoVetDUR = { create: createDurWidget, version }
    Panel.jsx  Card.jsx  GateDialog.jsx  RowBadge.jsx  CoverageStrip.jsx  NotesChecklist.jsx  Launcher.jsx
    focus.js          drawer focus trap (shadowRoot.activeElement + event.composedPath()); the gate uses native <dialog>
    widget.css        hand-written CSS, px units only, tokens via var(--…) under .nv-scope
    fonts.js          registers "NuvoVet Pretendard" with the FontFace API (§3.4)
    strings.js        widget chrome copy (§3.11)
  host/               the fictional EMR (WP4): EmrApp.jsx, DemoBar.jsx, WaitList.jsx, PatientHeader.jsx, RxGrid.jsx, RxSearch.jsx, emr.css
```

**Why the widget has no Radix.** Radix works in a shadow root only with a build-time patch of ~30 Radix/cmdk/vaul files, `portalize`, and `@property`/`rem` rewrites; the dev-mode path was untested and the demo runs under `vite dev`. The overlay needs a panel, disclosures, a radio group, a textarea, a checkbox and one modal; a small hand-written set is cheaper and deterministic.

**Shared code.** The widget shares **tokens** (`@/ui/tokens.css?inline`), the **engine** and the **knowledge** modules. It shares no components with `src/ui`; its card CSS copies the computed values of the DESIGN_SYSTEM §9.9 golden DUR card.

### 3.2 SDK API

All calls are synchronous except `gate`. No network; no storage beyond the try/catch log (§3.10).

```ts
type Locale = 'ko' | 'en'
const dur = NuvoVetDUR.create({
  locale?: Locale,                         // default 'ko'
  theme?: 'light' | 'dark' | 'system',     // default 'light'
  layout?: 'docked' | 'floating' | 'sheet' | 'auto',  // 'auto' = §2.2 breakpoints; default 'auto'
  fonts?: 'inject' | 'inherit',            // IIFE default 'inject' (FontFace API); in-app 'inherit'
  marker?: boolean,                        // panel-footer 교육용 프로토타입 marker; IIFE default true; in-app demo false (demo bar has it)
  productMap?: ProductMapEntry[],          // default Appendix A
  conditionMap?: Record<string, ConditionId>,
  user: { id: string, display: string },   // 'Practitioner/demo-kim', '김민서 (가상)'
  links?: { workbenchBase?: string },      // in-app '#'; IIFE demo '/dur#'
  onEvent?: (e: DurEvent) => void,
})
dur.mount({ panel?: HTMLElement, badgeSlot?: (rowId: string) => HTMLElement | null }): void
dur.check(request: CdsRequest): DurResponse          // order-select; renders panel + badges; returns the response
dur.gate(request: CdsRequest): Promise<GateResult>   // order-sign
dur.setLocale(l: Locale): void; dur.setTheme(t): void
dur.getLog(encounterId?: string): Feedback[]; dur.exportLog(): string /* {"feedback":[…]} JSON */; dur.clearLog(): void
dur.unmount(): void
type GateResult = { proceed: boolean, feedback: Feedback[], focusRowId?: string }
type DurEvent =
  | { type: 'cards', response: DurResponse }
  | { type: 'gate-open', cardIds: string[] } | { type: 'gate-close', proceed: boolean }
  | { type: 'feedback', entry: Feedback }
  | { type: 'focus-row', rowId: string, highlight?: boolean }   // "처방 수정"; hover highlight
  | { type: 'remove-row', rowId: string }                         // accepted delete suggestion; host deletes and re-checks
  | { type: 'update-row', rowId: string, patch: { qty?: number, unit?: string, productCode?: string, protocolChoice?: string, dispense?: '정제' | '가루' } }
  | { type: 'fix-chart', field: 'species' | 'breed' | 'weight' | 'diagnoses' | 'allergies' | 'labs' | 'mdr1' }  // NV-DATA, confirm chips
  | { type: 'open-workbench', href: string }
```

**`ProductMapEntry`** = `{ code, display, drugId, strengthId, defaultProtocolId? }`.

**Mount targets:**
- **`panel`** must be an element that accepts `attachShadow` (`div`, `aside`, `section`, or a custom element). If it is absent, or the host later removes it (responsive layouts), the widget falls back to the floating launcher/drawer in the overlay host until `mount({ panel })` is called again.
- **`badgeSlot(rowId)`** returns the host's slot element for that row: a `<span data-nv-slot="<rowId>">` (or a `<nuvovet-dur-badge>` custom element) **inside** the DUR `<td>`. `attachShadow()` on a `<td>` throws `NotSupportedError` (verified in Chromium). Default: `document.querySelector('[data-nv-slot="'+CSS.escape(rowId)+'"]')`. If the returned element cannot take a shadow root, the widget appends its own `<span data-nv-slot>` child and attaches there. Slots are re-acquired on every `check()`; a slot that is not `isConnected` is skipped, and a slot element that already has a shadow root is reused.

### 3.3 Request and response (CDS-Hooks-shaped)

The payloads follow the CDS Hooks shapes. The `prefetch` block is **CDS-Hooks-shaped, not FHIR**: it uses simplified objects, not `Observation`/`Condition`/`AllergyIntolerance` resources (the FHIR `patient-animal` extension URL could not be verified).

**Request.** `toCdsRequest(visit, hook)` builds it; `toVisit(request)` inverts it. One `MedicationRequest` per Rx row and per Tx row with a mapped product:

```jsonc
{ "hook": "order-select" /* | "order-sign" */, "hookInstance": "<uuid>",
  "context": { "userId": "Practitioner/demo-kim", "patientId": "1042", "encounterId": "enc-V1-2026-10-03",
    "selections": ["MedicationRequest/rx-2"],               // order-select only; order-sign has no selections
    "draftOrders": { "resourceType": "Bundle", "type": "collection", "entry": [ { "resource": {
      "resourceType": "MedicationRequest", "id": "rx-2", "status": "draft", "intent": "order",
      "medicationCodeableConcept": { "coding": [ { "system": "urn:demo-emr:product", "code": "RX-KTZ-T200", "display": "케토코나졸 정 200 mg" } ] },
      "dosageInstruction": [ {
        "text": "",                                           // 용법 (free text, may be empty)
        "route": { "text": "PO" },                            // 경로 Rt, raw
        "doseAndRate": [ { "doseQuantity": { "value": 5, "unit": "mg/kg" } } ],
        "timing": { "repeat": { "frequency": 2, "period": 1, "periodUnit": "d",    // 횟수 Tt (omitted when blank)
                                "boundsDuration": { "value": 21, "unit": "d" } } } } ],  // 일수 Dy (omitted when blank)
      "extension": [ { "url": "urn:demo-emr:calculated", "valueQuantity": { "value": 120, "unit": "mg" } },
                     { "url": "urn:demo-emr:category", "valueCode": "Rx" },            // "Tx" for in-clinic administration
                     { "url": "urn:demo-emr:dispense", "valueCode": "tablet" },        // "powder" for 가루
                     { "url": "urn:nuvovet:protocol-choice", "valueString": "keto_dog_malassezia" } ]   // only after the vet chose
    } } ] } },
  "prefetch": {
    "patient": { "id": "1042", "name": "초코", "species": "Canine", "breed": "ROUGH COLLIE/러프 콜리", "sex": "Neutered Male", "birthDate": "2022-05-14" },
    "weight": { "valueQuantity": { "value": 24.0, "unit": "kg" }, "effectiveDateTime": "2026-10-03" },
    "labs": [ { "code": "creatinine", "value": 2.0, "unit": "mg/dL", "date": "2026-10-01" } ],
    "conditions": [ { "code": "D-DERM-012", "display": "전신성 모낭충증" } ],
    "allergies": [ { "code": "penicillin" } /* or { "text": "페니실린 알레르기" } */ ],
    "genotype": { "abcb1": "unknown" },
    "visitDate": "2026-10-03" } }
```

**Response** (`cards.js`):

```jsonc
{ "cards": [ {
    "uuid": "card-<fnv1a(problemKey|inputHash)>",            // stable across re-checks with the same inputs
    "summary": "<finding.title[locale]>",                     // ≤ 140 chars (asserted)
    "indicator": "critical",                                  // contraindicated|major → critical; moderate → warning; minor → info
    "detail": "<markdown: consequence, why[], actions[], alternatives[]>",
    "source": { "label": "NuvoVet DUR", "topic": { "code": "MDR1_PGP_ML", "display": "품종·유전자" } },
    "overrideReasons": [ /* §3.9 codings allowed for this rule */ ],
    "selectionBehavior": "at-most-one",
    "suggestions": [ { "uuid": "…", "label": "이버멕틴 삭제", "isRecommended": true,
                       "actions": [ { "type": "delete", "description": "이버멕틴 경구액 10 mg/mL 처방 삭제", "resourceId": "MedicationRequest/rx-1" } ] } ],
    "links": [ { "label": "전체 분석 열기", "url": "#/case/custom?s=…", "type": "absolute" } ],
    "extension": { "severity": "contraindicated", "findingId": "f_mdr1_ivermectin", "problemKey": "mdr1:ivermectin",
                   "ruleIds": ["MDR1_PGP_ML"], "ruleVersion": "1.1.0", "drugIds": ["ivermectin","ketoconazole"],
                   "rowIds": ["rx-1","rx-2"], "primaryRowIds": ["rx-1"], "relatedRowIds": ["rx-2"],
                   "sources": ["mealey2001", "…"], "evidence": "literature", "jurisdiction": null,
                   "inputHash": "<fnv1a>", "ackKey": "<problemKey>|<inputHash>", "blocking": true } } ],
  "extension": {
    "verdict": { "level": "contraindicated", "action": "<engine verdict.action[locale]>", "complete": true, "incompleteReasons": [] },
    "counts": { "contraindicated": 1, "major": 0, "moderate": 0, "minor": 0, "doseChecks": 1, "notes": 3 },
    "rowStatus": { "rx-1": { "badge": "contraindicated", "label": "금기" },
                   "rx-2": { "badge": "contraindicated", "label": "금기", "related": true, "rounding": true } },
    "notes": [ /* engine notes (administration|lab|monitoring|caution|rounding), adapter notes (§4.3) */ ],
    "doses": [ /* engine DoseRow[]; a row with planExceedsCeiling shows the ceiling note, not the plan (§5, D15) */ ],
    "unmapped": [ { "rowId": "rx-4", "code": "RX-XYZ-999" } ],
    "coverage": { "checked": ["species","breed","interaction","duplication","condition","renal","allergy","dose"],
                  "partial": [ /* { "item": "allergy", "reason": "allergy_free_text" } */ ],
                  "notChecked": ["age","pregnancy","duration","otherClinics","thisClinicHistory"] },
    "engineVersion": "1.2.0", "ms": 1.3 } }
```

**Suggestion actions** follow CDS Hooks: `resourceId` is one string; `description` is readable text naming the product.

**Hashes** (`cards.js`, using `canonicalJson` and `fnv1a` from `engine/hash.js` and `exposure24hPerKg` from `engine/dose.js`):
- **`inputHash`** = `fnv1a(canonicalJson({ severity, factors, weightKg, rows }))` where `factors` = the finding's factors as sorted `kind:id` strings; `weightKg` = patient weight rounded to 0.1 (or null); `rows` = every row whose `drugId ∈ finding.drugIds`, sorted by rowId, each `{ rowId, drugId, strengthId, dose, frequency, route, protocolId, durationDays, perDoseMg, exposure24hPerKg, status, ratio, compared }` (numbers rounded to 3 decimals; `exposure24hPerKg` uses the summed amount for a summed group; `compared` = `compared.value`).
- **`ackKey`** = `problemKey + '|' + inputHash`.
- So a weight change, a dose change, or a frequency change re-raises an acknowledged card (§3.5). Binding: E45a (3.5 kg) and E45b (2.5 kg), same enrofloxacin row, give different hashes (§8.1).

**Feedback** is exported as `{ "feedback": [ Feedback, … ] }` (§3.10).

### 3.4 Shadow DOM isolation

**Three kinds of host element:**
1. **The overlay host** `<nuvovet-dur-overlay>`, appended once directly under `document.body`. It holds **the single React root**, the gate `<dialog>`, the floating drawer/launcher and the bottom sheet. It must never sit inside an ancestor with `transform`, `filter` or `contain`.
   ```css
   :host { all: initial; position: fixed; inset: 0 auto auto 0; width: 0; height: 0; z-index: 2147483000; contain: none; display: block; }
   ```
2. **The panel host**, passed as `mount({ panel })`; the widget attaches an open shadow root and the root renders into it with `createPortal`.
3. **Badge slots** (`span[data-nv-slot]`), one shadow root each, rendered by `createPortal` from the same root.

The React root lives in the overlay host because the host's responsive layout may unmount the right-hand column; a root inside it would be destroyed with it.

**CSS.** `tokens.css?inline` + `widget.css?inline` are concatenated into one `CSSStyleSheet` assigned to every shadow root's `adoptedStyleSheets` (fallback: a `<style>` element). Reset:
```css
.nv-scope { all: initial; display: block; box-sizing: border-box; font: 13px/20px var(--nv-font-sans); color: var(--foreground);
            letter-spacing: 0; text-transform: none; -webkit-font-smoothing: antialiased; }
.nv-scope *, .nv-scope *::before, .nv-scope *::after { box-sizing: border-box; }
:host([data-nv-slot]), :host(nuvovet-dur-badge) { display: inline-block; }
```
`all: initial` resets `display` to `inline`, so `display: block` is declared explicitly. There is no `.nv-scope * { … !important }` rule: host selectors cannot match inside a shadow tree, only inherited properties cross the boundary and `all: initial` on `.nv-scope` stops them; `!important` inside the widget would only defeat the widget's own rules.

**Fonts (`fonts.js`).** With `fonts: 'inject'`, the subset Pretendard WOFF2 bytes are bundled into the IIFE (`?subset` import, §7) and registered once with `const f = new FontFace('NuvoVet Pretendard', arrayBuffer); await f.load(); document.fonts.add(f)`. No `<style>` element and no `@font-face` text is injected, so a strict host CSP (`style-src 'self'; font-src 'none'`) does not block it (verified in Chromium). Widget stack: `"NuvoVet Pretendard","Pretendard Variable",system-ui,"Apple SD Gothic Neo","Malgun Gothic",sans-serif`.

**Failure modes and how this widget avoids each:**

| # | Failure | Avoided by |
|---|---|---|
| 1 | Host `html{font-size:62.5%}` shrinks rem | px only; a lint test fails on `rem` in `widget.css`; `tokens.css` has no rem |
| 2 | `@property` ignored in shadow roots | no Tailwind in the widget; no `@property` (test) |
| 3 | `@font-face` inside a shadow root is ignored; injected `<style>` blocked by CSP | FontFace API on `document.fonts` (above) |
| 4 | Host defines a fake font with the same name | namespaced family name |
| 5 | Host CSS variables inherit into the shadow (`* { --primary: lime !important }`) | every token is re-declared on `.nv-scope`; a declaration on the element beats inheritance through `:host` (§8.3 test 4) |
| 6 | Host `z-index: 99999` sticky header | the gate is a native `<dialog>` in the **top layer** (`showModal()`); drawer and sheet sit in the overlay host at `z-index: 2147483000` |
| 7 | Focus retargeting breaks focus traps | the gate relies on the native modal dialog (host page inert, Tab stays inside); the drawer's trap reads `shadowRoot.activeElement` and `event.composedPath()[0]`, never `document.activeElement` |
| 8 | `attachShadow()` on `<td>` throws `NotSupportedError` | slots are `span[data-nv-slot]` inside the cell (§3.2) |
| 9 | React synthetic events bubble through portals by the React tree, so one Esc in the gate also reached the panel's `onKeyDown` | every key handler in the gate, drawer and sheet calls `e.stopPropagation()` after handling; the panel's handlers ignore events whose `composedPath()` does not include the panel's shadow root |
| 10 | Host `[role=alertdialog]{display:none}` / `[data-state=open]{opacity:.2}` | rules from the host document cannot select elements in the shadow tree; the dialog carries no `data-state` |

### 3.5 Trigger points

| Moment | Hook | What happens | Blocks? |
|---|---|---|---|
| Row added, edited or removed (300 ms debounce; Tt/Dy may be blank) | `order-select` | `check()`: badges and panel re-render; cards replaced by uuid (expanded state kept per uuid); the live region announces count changes only | Never |
| Weight, diagnoses, labs, allergies, species or MDR1 changed | `order-select` (all rows) | same; acknowledged cards whose `inputHash` changed (weight and per-kg exposure are in it) lose their acknowledgement and come back | Never |
| 처방 저장 / 처방전 출력 / eVET 전송 | `order-sign` | `gate()` opens the dialog only when ≥ 1 card has `blocking: true` and its `ackKey` is not in this encounter's log as `overridden` or `accepted` | Only then |
| Opening the chart | none | the panel shows the last result for that visit, or "처방을 입력하면 검토합니다" | No (nothing fires on chart open) |

**Dedupe** follows PDDI-CDS `filter-out-repeated-alerts`: a blocking card acknowledged in the panel ("예외 사유 입력", §3.7.2) is not shown again at sign unless its inputs changed.

### 3.6 Passive vs interruptive, by severity

| Engine severity | CDS indicator | Row badge | Panel | Gate at sign | Requires to proceed |
|---|---|---|---|---|---|
| contraindicated (금기) | critical | solid red "금기" on primary rows; outline "관련" on related rows | expanded card at top | **yes** | coded reason + comment (passes §3.9) + ☑ 보호자에게 위험을 설명함 |
| major (중대) | critical | outlined orange "중대" (primary) / "관련" | expanded | **yes** | coded reason (comment only for NV-OTH); ☑ 보호자 설명 shown, optional, logged |
| moderate (주의) | warning | tint amber "주의" / "관련" | collapsed to one line | no | nothing; optional "확인함" (logged as `accepted`) |
| minor (경미) | info | neutral "경미" | collapsed | no | nothing |
| notes | — | "≈" after the label on rounding rows | "투약 안내" checklist (collapsed, count) | no | nothing |
| row 확인 필요 (§4.3) | — | neutral "확인 필요" with `CircleDashed` icon | "확인 필요" group above the cards | no (one line in the gate if it opens for other reasons) | nothing; verdict shows 검토 불완전 |
| visit 확인 필요 (free text, stale lab, unmapped diagnosis, age, breed) | — | — | "확인 필요" group with a chip per reason ("자유 입력에서 인식: 확인", "3개월 전 검사") that emits `fix-chart` | no | nothing; 검토 불완전 |
| unmapped product | — | "검토 안 함" | listed under the coverage strip | no | nothing |
| unsupported species | — | "—" on all rows | "지원하지 않는 종: 개·고양이만 검토합니다" | no | `analyze()` is **not** called |
| species missing | — | "—" on all rows | "종 미입력: 환자 정보에서 종을 입력하십시오" with a `fix-chart: species` chip | no | `analyze()` is not called |

In-clinic (Tx) rows show "원내" before the badge text; they are checked like Rx rows but are never offered as a delete suggestion (the drug may already have been given).

**Minor findings are always non-blocking:** the panel never auto-expands for them; the launcher does not change state; no focus move, sound or animation beyond a 150 ms colour change. **At select time** a contraindicated finding turns the floating launcher critical ("금기 1"); it still opens nothing and moves no focus.

### 3.7 Card and panel anatomy

#### 3.7.1 Panel (docked 360 px; drawer 380 px; sheet full width)

```
┌───────────────────────────────────────────────┐
│ nuvovet DUR        규칙 18개 · 14:32:05   [–]   │ 40px header; [–] minimise (docked) / close (drawer; Esc)
├───────────────────────────────────────────────┤
│ [■ 금기] 현재 처방대로 조제하지 마십시오           │ verdict row: SeverityBadge md + engine verdict.action (2 lines max)
│ 금기 1 · 투여량 확인 1        [검토 불완전 1 ▸]     │ non-zero counts only; the chip opens the 확인 필요 group
├───────────────────────────────────────────────┤
│ 확인 필요 (only when present)                    │
│  아목시실린·클라불란산: 횟수 미입력 [행으로 이동]      │
│  알레르기 "페니실린 알레르기": 자유 입력에서 인식 [확인] │
├───────────────────────────────────────────────┤
│ Card (expanded, critical), §3.7.2               │
├─── hairline ──────────────────────────────────┤
│ Card (collapsed, warning): [주의] 페노바르비탈 + 사이클로스포린 … ▸│
├───────────────────────────────────────────────┤
│ 투약 안내 3 ▸                                     │ NotesChecklist (ticks are not saved)
├───────────────────────────────────────────────┤
│ 검토함    종·품종·병용·중복·질환·신기능·알레르기·용량    │ CoverageStrip (§6.2), text-xs muted, computed per visit
│ 일부만    알레르기 (자유 입력)                       │ only when partial items exist
│ 검토 안 함 연령·임신/수유·투여기간·타 병원 처방·본원 이전 처방 │
│ 전체 분석 열기                  [교육용 프로토타입 ⓘ] │ marker only when options.marker (IIFE); off in the demo
└───────────────────────────────────────────────┘
```
"규칙 {n}개" is `RULES.length` (18 after D9). The header's two-part "count · time" line is allowed (two labelled facts).

**Verdict row by state:**

| State | Shown |
|---|---|
| `none` + complete | neutral `CircleCheck` + "규칙상 문제 없음" + the engine `verdict.action` ("규칙으로 확인한 문제가 없습니다. 이상이 없다는 뜻은 아닙니다.") |
| `none` + incomplete | `CircleDashed` + **"검토 불완전"** + the reasons (never a check mark) |
| any severity + incomplete | the severity badge plus a chip "검토 불완전 N" |

**`doseChecks`** ("투여량 확인 N") = rows whose dose status is above, below or unit_mismatch, **or** that carry a rounding note (powder rows have none, §4.2).

#### 3.7.2 Card (expanded)

Anatomy follows Payne 2015's seven elements and the CDS Hooks card; visual values come from the golden DUR card (DESIGN_SYSTEM §9.9).

```
[■ 금기] 품종·유전자                                        이버멕틴 + 케토코나졸
MDR1 위험견에게 고용량 이버멕틴 + P-gp 억제제 병용                 ← summary = finding.title (text-sm 600)
이버멕틴은 정상적으로 P-당단백질에 의해 뇌로 들어가지 못합니다. …   ← consequence (2-line clamp + "더 보기"; never truncated in data)
이 환자에서  콜리 MDR1 위험 높음 · ABCB1 미검사 · 300 mcg/kg (기준 50 mcg/kg) · 케토코나졸 P-gp 억제제   ← factor labels
권장  ABCB1 유전자형을 확인하기 전에는 고용량 이버멕틴을 시작하지 마십시오.   ← actions[0..1]; the rest under 자세히
[이버멕틴 삭제 · 권장]  [처방 수정]                         [예외 사유 입력 ▾]
▸ 자세히: 기전(why[]), 대안(alternatives[], text only), 모든 권장, 규칙 MDR1_PGP_ML@1.1.0, 입력값(trace.inputs)
규칙 MDR1_PGP_ML  v1.1.0  ·  근거 Mealey 2001 · Mealey 2008 · Gramer 2010   [CitationChip…]      ← EvidenceTrail line
검토 안 함  연령                                                   ← only when coverage marks a relevant gap
```

**Element rules:**
- **Category label** by ruleId:

  | Category | Rules |
  |---|---|
  | 종 금기 | SPECIES_HARDSTOP |
  | 품종·유전자 | MDR1_PGP_ML |
  | 병용 주의 | CYP3A_INHIBITION, CYP_INDUCTION, GASTRIC_PH_AZOLE, NSAID_CORTICOSTEROID, SEROTONERGIC |
  | 중복 | NSAID_DUPLICATE, IMMUNOSUPPRESSION_ADDITIVE, DUPLICATE_INGREDIENT |
  | 질환 금기·주의 | DRUG_CONDITION |
  | 신기능 주의 | NSAID_RENAL, RENAL_ADJUST, METHIMAZOLE_CKD |
  | 알레르기 | ALLERGY_CLASS |
  | 용량 주의 | DOSE_RANGE, ENRO_FELINE_RETINA |

  EN: Species · Breed/genotype · Interaction · Duplication · Condition · Kidney · Allergy · Dose.
- **Text comes from the engine only.** Every clinical string is `finding.*[locale]`; no prose is written at runtime. Drug names come from `DRUG_BY_ID[id].name[locale]`.
- **"이 환자에서"** lists `finding.factors[].label[locale]` as plain text joined with " · " (each part a labelled fact). No pills.
- **Dose cards** (DOSE_RANGE, ENRO_FELINE_RETINA) show `미국 라벨 기준` / `US label` after the rule line when the protocol's `ref.jurisdiction === 'US'` and `labelStatus === 'label'` (D13), `영국 라벨 기준` for `'UK'`. A starting-dose protocol (D10) shows `시작 용량 기준`.
- **Collapsed card** = one 36 px line: badge + summary (1-line ellipsis with `title`) + drugs + chevron. Contraindicated and major start expanded.
- **Hover/focus on a card** emits `focus-row` with `highlight: true` for its `rowIds` (host row background `#FFF4CC`).
- **Hairlines** separate cards; no box per card, no coloured edge. Severity colour appears only in the badge.
- **"예외 사유 입력 ▾"** expands the inline override form (§3.9) in the card. Submitting it logs `overridden` for that `ackKey`, so the gate skips the card.

#### 3.7.3 Row badge (in the host's DUR slot)

- 20 px, the SeverityBadge `sm` style. Hit area 24 px via padding.
- **Text:** the highest severity among the row's cards where the row is **primary**; if the row is only **related** to a card (its drug contributes but deleting it does not resolve the card, §6.1), an outline badge reading `관련` (`Related`) with the severity in its `aria-label`; else `확인 필요`, `검토 안 함` or `—`. A row with a rounding note adds "≈". Tx rows prefix "원내".
- **It is a `<button>`:** `aria-label="이버멕틴: 금기 1건. 검토 패널에서 보기"` / `"케토코나졸: 금기 1건에 관련. 검토 패널에서 보기"`. Clicking scrolls the panel to the first card for that row, expands it and focuses its summary heading.

#### 3.7.4 Floating launcher (`layout: floating`)

A bottom-right button, 16 px inset, 40 px tall, 8 px radius, `shadow-pop`. Label "DUR · 주의 1" (highest non-zero + count), "DUR · 문제 없음" or "DUR · 검토 불완전". Neutral, or critical when a contraindicated/major card exists. It toggles the drawer; Esc closes the drawer and returns focus to the launcher.

### 3.8 Gate dialog (`order-sign`)

```
┌──────────────────────────────────────────────────────────── 560px, radius 12, shadow-modal, bg popover ┐
│ [■ 금기] 저장 전 확인이 필요한 처방 1건                                                     [×]      │ title (aria-labelledby)
│ 초코 · 개 · 24.0 kg · 러프 콜리                                                                       │ identity line (patient banner off)
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Card (expanded, §3.7.2; max 3 expanded, further cards collapsed with "외 N건")                          │
│   └ 예외 사유 (radiogroup, required)                                                                   │
│       ○ 임상적 판단: 이점이 위험보다 큼 (모니터링 계획 기록)        NV-J2                                   │
│       ○ … (reasons allowed for this rule, §3.9)                                                        │
│       ○ 환자 정보가 실제와 다름: 차트 수정                         NV-DATA (does not override)               │
│     코멘트 [textarea]   ☑ 보호자에게 위험을 설명함                                                       │
│     inline validation message (aria-live polite)                                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 확인 필요 1건: 아목시실린·클라불란산 횟수 미입력 (non-blocking line, only if present)                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [예외 처리하고 저장] (outline; disabled until every blocking card is valid)    [처방으로 돌아가기] (ink)     │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
No colour strip on any edge.

**Element and roles.** A native `<dialog>` element inside the overlay host's shadow root, opened with `dialog.showModal()`. It carries `role="alertdialog"`, `aria-labelledby` = title, `aria-describedby` = the first card's consequence. `showModal()` puts it in the top layer above any host `z-index`, makes the host page inert (verified: the host input could not be focused) and keeps Tab inside the dialog. The `::backdrop` uses `--backdrop`.

**Focus handling (both traps were observed in Chromium):**
1. At `gate()` call time record `returnTo = document.activeElement` (the host's save button in light DOM).
2. After `showModal()`, call `.focus()` on "처방으로 돌아가기" explicitly. React's `autoFocus` does not set the HTML attribute, so without this `showModal()` focuses the first focusable element (the textarea).
3. On every close path call `dialog.close()` **before** unmounting the dialog's content, then `returnTo.focus()` if it is still connected, else the save button. Unmounting without `close()` sent focus to `<body>`.

**Keys:**
- **Esc** (the dialog's `cancel` event; `preventDefault()` and handle it), the × button and a click on the backdrop all close as "back to prescription": `gate()` resolves `{ proceed: false }`, nothing is saved. The key handler calls `stopPropagation()` so the panel and drawer do not also react.
- **Enter** is never bound to override. Both footer buttons are `type="button"`; there is no `<form method="dialog">`; Enter in the textarea inserts a newline.
- No single-letter shortcuts.

**Drafts.** Reason, comment and checkbox drafts are kept per `ackKey` for the encounter; reopening the gate restores them.

**"예외 처리하고 저장"** logs one `overridden` Feedback per blocking card, closes the dialog and resolves `{ proceed: true, feedback }`. The host writes the chart lines (§3.10).

**Suggestions inside the gate** emit `remove-row` / `update-row`, log `accepted` with `acceptedSuggestions`, and close with `{ proceed: false, focusRowId }`. The vet saves again; the re-check runs the gate on fresh cards.

**NV-DATA** emits `fix-chart` with the field, closes with `{ proceed: false }` and logs **nothing**.

### 3.9 Override reasons

**Code system:** `https://nuvovet.example/CodeSystem/dur-override` (placeholder; never fetched).

**Lineage (Jang 2016, read in full).** HIRA's DUR has 11 **overlapping-prescription (중복처방) codes**: A, B, C, F, G, H, I, J, K, L, P (e.g. F = prescription and administration dates differ; G = weekly or monthly medicine; P = PRN). Reasons for **combination, age and pregnancy alerts are entered as free text** in HIRA's system. Jang et al. analysed one tertiary hospital's 27,955 overrides and **proposed** six codes J1–J6 (J1 = P + G, PRN or intermittent; J2 = clinical justification; J3 = revised L; J4 = A, C, F, H, I, J merged, "patient was not taking / will not take the drugs involved"; J5 = operation or examination; J6 = emergency), which would have coded 84.2 % of those overrides. J1–J6 are a study proposal, not codes HIRA adopted. The NV codes below are this prototype's own, using J1–J6 as a design basis; they are not HIRA codes and must never be described as such.

| Code | KO display | EN display | Basis | Allowed for (ruleIds) |
|---|---|---|---|---|
| NV-J2 | 임상적 판단: 이점이 위험보다 큼 (모니터링 계획 기록) | Clinical judgement: benefit outweighs risk (monitoring plan recorded) | Jang J2 | all except SPECIES_HARDSTOP |
| NV-INT | 의도된 병용, 혈중농도·반응 모니터링 예정 | Intended combination; levels/response will be monitored | Jang J2 | CYP3A_INHIBITION, CYP_INDUCTION, GASTRIC_PH_AZOLE, NSAID_CORTICOSTEROID, SEROTONERGIC, MDR1_PGP_ML |
| NV-J1 | 단회·간헐·필요시(PRN) 투여 | Single, intermittent or as-needed dose | Jang J1 (HIRA P, G) | all except SPECIES_HARDSTOP, ALLERGY_CLASS |
| NV-SEQ | 순차 투여 (같은 날 겹치지 않음) | Sequential, not on the same day | HIRA F; Jang J4 | DUPLICATE_INGREDIENT, NSAID_DUPLICATE |
| NV-J5 | 수술·검사 전후 투여 | Peri-operative or peri-procedural use | Jang J5 | all except SPECIES_HARDSTOP |
| NV-J6 | 응급 상황 | Emergency | Jang J6 | all except SPECIES_HARDSTOP |
| NV-ALG-INT | 알레르기가 아닌 불내성(부작용) 이력 | History is an intolerance, not an allergy | prototype | ALLERGY_CLASS |
| NV-ALG-TOL | 이후 같은 계열을 문제없이 투여한 기록 있음 | The same class was given since without reaction | prototype | ALLERGY_CLASS |
| NV-DATA | 환자 정보가 실제와 다름: 차트 수정 | Patient data is wrong: fix the chart | — | all. **Does not override:** emits `fix-chart` and re-checks |
| NV-OTH | 기타 (직접 입력) | Other (free text) | HIRA free text | all; comment required |

- **Species hard stops** (permethrin or acetaminophen in a cat, repeated feline meloxicam) offer **only NV-DATA** (species recorded wrongly) and **NV-OTH** with a comment.
- **Not offered:** "existing drug stopped / replaced" (Jang J4 as a reason) is hidden while the check only sees the current draft; both drugs are in the same prescription, so the reason cannot be true. It returns when active prior prescriptions are in scope (`prefetch.activeMedications`, a later phase). "Genotype confirmed normal" is not a reason: a normal genotype is a chart fact, recorded through NV-DATA → `fix-chart: 'mdr1'`, which edits 특이사항 and re-checks, so the log and the chart never disagree.

**What each severity requires:**

| Severity | Reason | Comment | ☑ 보호자에게 위험을 설명함 |
|---|---|---|---|
| contraindicated | coded reason required | must pass the free-text check | must be ticked |
| major | coded reason required | must pass the check only for NV-OTH | shown; optional; logged as `ownerInformed` |
| moderate / minor | none | none | none; optional "확인함" logs `accepted` |

Per Jang 2016, HIRA practice is that once a reason is entered the drug and its side effects are explained to the patient (here, the owner); the checkbox records that. HIRA grade C ("must not be prescribed") is a human-insurance rule; veterinary discretion applies, so there is no hard block. Grades A (reason optional) / B (reason required) inform the moderate–minor / major–contraindicated split.

**Free-text check** (`commentCheck.js`). Jang 2016: 72.2 % of overrides were free text and 21.1 % of that was meaningless ("ㅋㅋㅋ", "aaa"). A comment is rejected when any holds (spaces are ignored in rules 1 and 2):
1. fewer than 8 non-space characters;
2. more than 50 % of the non-space characters are one repeated character;
3. only Hangul compatibility jamo (U+3131–U+318E), spaces and punctuation;
4. no run of at least 2 Hangul syllables or 2 Latin letters.

| Input | Result |
|---|---|
| "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ" | rejected (2, 3) |
| "aaaaaaaaaa" | rejected (2) |
| "a a a a a a a a b" | rejected (2) |
| "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ" | rejected (3) |
| "1234567890" | rejected (4) |
| "감량 병용함" | rejected (1: 5 non-space characters) |
| "케토코나졸 감량 병용, 2주 후 재검" | accepted |

**Rejection messages:** KO "구체적인 사유를 8자 이상 입력하십시오 (예: 감량 병용, 2주 후 혈중농도 측정)." EN "Enter a specific reason of at least 8 characters (e.g. reduced dose, recheck levels in 2 weeks)."

### 3.10 Acknowledgement log

CDS Hooks Feedback shape; exported wrapped as `{ "feedback": [ … ] }`:

```jsonc
{ "card": "card-…", "outcome": "overridden" /* | "accepted" */,
  "acceptedSuggestions": [ { "id": "<suggestion uuid>" } ],          // accepted only
  "overrideReason": { "reason": { "system": "https://nuvovet.example/CodeSystem/dur-override", "code": "NV-INT", "display": "의도된 병용, …" },
                      "userComment": "케토코나졸 감량 병용, 2주 후 혈중농도 측정" },   // overridden only
  "outcomeTimestamp": "2026-10-03T05:32:10.000Z",
  "extension": { "ackKey": "…", "ruleIds": ["CYP3A_INHIBITION"], "ruleVersion": "1.0.0", "severity": "moderate",
                 "drugIds": ["ketoconazole","ciclosporin"], "problemKey": "…", "inputHash": "…", "engineVersion": "1.2.0",
                 "userId": "Practitioner/demo-kim", "patientId": "1042", "encounterId": "enc-V1-2026-10-03", "ownerInformed": true,
                 "hook": "order-sign" } }
```

**Storage:** in memory, mirrored to `localStorage['nv-dur-log']` in try/catch; capped at 200 entries (oldest dropped); the page works identically when storage throws.

**Export.** "기록 내보내기" downloads `nuvovet-dur-log-<date>.json` via a Blob URL (no network).

**Chart line** (host, one per overridden card, printed with the chart; host chrome, so its `·` field separators are the EMR's own style):
> `DUR 금기 1건 예외 처리 (NV-J2) · 김민서 (가상) 14:32 · 규칙 MDR1_PGP_ML@1.1.0 · 엔진 1.2.0`

### 3.11 Widget chrome copy (KO / EN)

`src/portfolio/emr/widget/strings.js`. Clinical text always comes from the engine. No em dash anywhere in this table.

| Key | KO | EN |
|---|---|---|
| panel.title | nuvovet DUR | nuvovet DUR |
| panel.rules | 규칙 {n}개 | {n} rules |
| panel.empty | 처방을 입력하면 검토합니다 | Add a prescription to start the review |
| verdict.none | 규칙상 문제 없음 | No rule findings |
| verdict.incomplete | 검토 불완전 | Review incomplete |
| counts.doseChecks | 투여량 확인 {n} | Dose checks {n} |
| group.confirm | 확인 필요 | Needs input |
| chip.recognised | 자유 입력에서 인식: 확인 | Recognised from free text: confirm |
| notes.title | 투약 안내 | Administration notes |
| card.patient | 이 환자에서 | In this patient |
| card.recommend | 권장 | Recommended |
| card.details | 자세히 | Details |
| card.evidence | 근거 | Evidence |
| card.mechanistic | 기전 근거 (인용 연구 없음) | Mechanistic rationale (no study cited) |
| card.jurisdiction.US | 미국 라벨 기준 | US label |
| card.jurisdiction.UK | 영국 라벨 기준 | UK label |
| card.startDose | 시작 용량 기준 | Starting dose |
| card.edit | 처방 수정 | Edit prescription |
| card.override | 예외 사유 입력 | Enter override reason |
| card.ack | 확인함 | Acknowledge |
| badge.related | 관련 | Related |
| badge.inClinic | 원내 | In clinic |
| sugg.delete | {drug} 삭제 | Remove {drug} |
| sugg.deleteRow | {product} 행 삭제 | Remove the {product} row |
| sugg.strength | {product} {plan}로 변경 | Change to {plan} of {product} |
| gate.title | 저장 전 확인이 필요한 처방 {n}건 | {n} prescription(s) need review before saving |
| gate.back | 처방으로 돌아가기 | Back to prescription |
| gate.proceed | 예외 처리하고 저장 | Override and save |
| gate.comment | 코멘트 | Comment |
| gate.commentHint.contra | 8자 이상, 구체적으로 | At least 8 characters, specific |
| gate.owner | 보호자에게 위험을 설명함 | Risk explained to the owner |
| gate.more | 외 {n}건 | {n} more |
| coverage.checked | 검토함 | Checked |
| coverage.partial | 일부만 | Partly |
| coverage.notChecked | 검토 안 함 | Not checked |
| coverage.items | 종·품종·병용·중복·질환·신기능·알레르기·용량 | species · breed · interactions · duplication · conditions · kidney · allergy · dose |
| coverage.missing | 연령·임신/수유·투여기간·타 병원 처방·본원 이전 처방 | age · pregnancy/lactation · duration · other clinics' prescriptions · this clinic's earlier prescriptions |
| link.workbench | 전체 분석 열기 | Open full analysis |
| marker | 교육용 프로토타입 | Educational prototype |
| marker.tooltip | 교육용 프로토타입입니다. 임상 검증을 거치지 않았으며 진료에 사용하지 마십시오. 모든 검토는 이 브라우저 안에서만 실행됩니다. | Educational prototype, not clinically validated. Do not use for patient care. Every check runs in this browser only. |
| species.unsupported | 지원하지 않는 종: 개·고양이만 검토합니다 | Unsupported species: only dogs and cats are reviewed |
| species.missing | 종 미입력: 환자 정보에서 종을 입력하십시오 | Species missing: enter it in the patient record |
| badge.unmapped | 검토 안 함 | Not reviewed |
| row.goto | 행으로 이동 | Go to row |
| launcher | DUR · {label} | DUR · {label} |

The §4.3 confirm reasons have their own copy there. **Copy rules:** never "안전"/"safe"; the formal "~하십시오" only in engine strings and the two species lines that instruct the vet.

### 3.12 Accessibility

- **Panel:** `<aside role="region" aria-label="nuvovet DUR 처방 검토">`; the verdict is an `<h2>`, each card summary an `<h3>`; disclosures are `<button aria-expanded aria-controls>`.
- **Live region:** one `aria-live="polite"` node announcing "처방 검토: 금기 1건, 주의 1건" only when counts or verdict change, at most once per 1 s, never per keystroke.
- **Focus:** the widget never moves focus on `check()`; focus moves only on a user action in the widget or when the gate opens. Tab order is DOM order. A skip link in the EMR action bar reads "DUR 검토로 이동".
- **Gate:** native modal (§3.8) makes the rest of the page inert; the host additionally sets `inert` on the EMR root on `gate-open` (belt and braces for older engines) and removes it on `gate-close`.
- **Floating drawer:** focus trap only while open; Esc closes. **Bottom sheet:** `role="dialog"`, not modal when collapsed; Esc collapses.
- **Targets:** ≥ 24 px; every icon-only button has an `aria-label`.
- **Colour:** never the only signal; every badge has a word; critical cards add `OctagonX`.
- **Reduced motion:** gate and drawer animations become a 100 ms fade.
- **Contrast:** DESIGN_SYSTEM §3.2 tokens; solid 금기 badge `--on-solid` on `--sev-critical-solid` = 5.64 in both widget themes; host primary button 6.6:1.
- **Print:** the panel is hidden in host print; chart acknowledgement lines and the host watermark print.

### 3.13 Staying non-blocking

- **`check()`** is synchronous and finishes in < 50 ms for 10 rows (measured: 1.2 ms for a 4-row visit with the revised adapter and engine; suggestions add ~1 ms per candidate re-check).
- **Debounce** (300 ms) runs in the host; `gate` is never debounced.
- **Stable cards:** re-checks replace cards by uuid, so expanded state and override drafts survive edits that do not change the card's inputs.
- **No focus theft:** a Playwright test types the full V7 prescription and asserts focus stays in the grid and no `dialog[open]` exists.

---

## 4. EMR row → engine input mapping

The reference implementation is Appendix C (revision 2). Every rule here is implemented there and exercised by the §8 scenarios.

### 4.1 Patient and visit

| EMR field | Engine field | Rule |
|---|---|---|
| 종 (`Canine`/`dog`/`개`/`견`, `Feline`/`cat`/`고양이`/`묘`) | `species` | Blank → **species_missing** ("종 미입력" state, §3.6); anything else → **unsupported**. In both cases `analyze()` is NOT called (it would check as a dog). |
| 품종 `A/B` | `breedId` via `resolveBreed(half, species)` | Try each half in order. Unresolved dog breed → note `breed_unresolved` (the engine treats MDR1 risk as unknown, never normal). **When a macrocyclic lactone (`flags.mdr1Sensitive`) is prescribed, `breed_unresolved` makes the verdict incomplete.** |
| 성별 (5 values) | `sex`, `neutered` | `Spayed*` → female, true; `Neutered*` → male, true; `Intact Female` → female, false; `Intact Male` → male, false; `Unknown` → null, null |
| 생년월일 + visit date | `ageYears` | floor to 0.1 y. **Under 1 year → visit reason `age_under_1y`** (incomplete: no rule checks age; "1세 미만: 연령 관련 금기·주의는 검토하지 않았습니다"). |
| 체중 + 측정일 | `weightKg` | Blank → null (engine `weight_missing`, incomplete). Older than 30 days, or 14 days when the animal is under 6 months → note `weight_stale` ("체중 {n}일 전 측정"); still used, shown with its date. |
| 검사결과 creatinine / ALT | `labs.creatinine` (mg/dL), `labs.alt` (U/L) | The most recent value per test. Within 90 days → used. **Older than 90 days → visit reason `lab_stale_<code>` (incomplete); a stale creatinine at or above the species upper limit (`CREATININE_UPPER`: dog 1.4, cat 1.6 mg/dL) is still passed to the engine, with its date shown, so a known kidney problem is not silently dropped; a stale normal value is not used.** µmol/L ÷ 88.4, rounded to 0.01. |
| 진단명 code | `conditions` via `conditionMap` | Mapped → used. Unmapped code with a display name that **exactly** equals (after normalisation, Appendix C `norm`) a `CONDITIONS` label or alias for the species → passed to the engine + visit reason `dx_text_recognised:<code>` (chip "자유 입력에서 인식: 확인"). Otherwise → `unmappedDx` + visit reason `dx_unmapped:<code>`. Both are incomplete. No fuzzy matching. |
| 알레르기 coded | `allergies` | must be an `ALLERGY_BY_ID` key |
| 알레르기 free text | `allergies` or — | Normalised text exactly equal to an allergy-class id/label, or to a drug id/name/alias whose `flags.allergyClass` is set → that class is passed + visit reason `allergy_text_recognised` (the alert fires; chip "자유 입력에서 인식: 확인"). Otherwise visit reason `allergy_free_text` ("자유 입력 알레르기를 검토하지 못했습니다: 코드로 입력하십시오"). Both are incomplete. |
| MDR1 (특이사항 genotype) | `mdr1Status` | `unknown` unless a coded genotype is present |
| 임신/수유 | `pregnant`/`lactating` | no field in the demo EMR: always false, listed as "검토 안 함" |

### 4.2 Rx and Tx rows

| EMR field | Engine field | Rule |
|---|---|---|
| 구분 | — | **Rx rows, and Tx rows whose 상품코드 is in `productMap`**, are sent (Tx flagged `inClinic`). Tx rows without a mapped product (procedures, labs) are skipped silently. An Rx row with an unknown code is `unmapped`. |
| 상품코드 | `drugId`, `strengthId` | `productMap` is **the only source of strength and concentration**. Unknown code → `unmapped` (badge "검토 안 함"), excluded from `meds`. Never fuzzy-match names to products. `defaultProtocolId` (chewable heartworm products → `iver_dog_hw`) is used when no protocol choice exists. |
| 단위 + 투여량 | `dose: {value, unit}` | Unit table below |
| 용법 + 횟수 Tt + 일수 Dy | `frequency` | See **Frequency** below |
| 일수 Dy | `durationDays` | passed through; no duration rule (D5) |
| 경로 Rt | `route` | PO/IV/SC/IM pass through. `Top` → `spot-on` if the product form is spot-on, else `topical`. `Eye`/`Ear`/`Inh` → as-is + `route_no_reference`. Blank → `route_missing`. |
| 조제 | — | `가루` (powder, one 포 per dose): the split check is skipped, the engine's rounding notes for that row are not shown (they describe tablet fractions that are not dispensed), and the row note `powder` reads "가루 조제: 정제 분할·반올림과 분쇄 가능 여부는 검토하지 않았습니다". No do-not-crush claim is made: the knowledge base has no sourced crushing data. |
| 계산량 (host) | cross-check only | For `mg/kg` and `mcg/kg` rows: if \|Qty × factor × weight − EMR 계산량 (mg)\| > max(1 % of expected, 0.05 mg) → note `calc_mismatch`. Never used as the dose. |
| protocol choice (vet) | `protocolId` | `urn:nuvovet:protocol-choice`; overrides the policy |

**Frequency** (`mapFrequency`):
1. 횟수 Tt alone: 1→q24h, 2→q12h, 3→q8h, 4→q6h, 6→q4h. **Tt1 with Dy1 → `once` (a single administration)**. Other values (5, 0.5, 8…) → null + `freq_unmapped`. Blank Tt and no recognised 용법 → null + `freq_missing`.
2. 용법 alone (recognised by the engine's `normalizeFrequency`, e.g. "격일" → q48h, "월1회" → monthly, "필요시" → prn, "bid" → q12h): use it. An unrecognised 용법 is ignored.
3. **Both present.** They are *compatible* when 용법 is a daily schedule whose administrations per day equal Tt (q24h↔1, q12h↔2, q8h↔3, q6h↔4, q4h↔6), or a less-than-daily schedule (q48h, q72h, weekly, q14d, monthly, once) with Tt = 1. Compatible → the 용법 frequency. **Not compatible → confirm reason `freq_conflict` and the engine gets the frequency with more administrations per day** (so the feline enrofloxacin limit, the MDR1 high-dose test and every "above" check use the higher exposure). "필요시" + Tt n → q(24/n)h as the maximum per day, row note `prn_max_per_day` ("필요시: 1일 최대 {n}회로 검토했습니다"); "필요시" with blank Tt → `prn` (daily totals cannot be computed; per-day protocols then report `dose_unit_*`, incomplete).

**Unit table:**

| EMR unit (case-insensitive) | Engine unit | Notes |
|---|---|---|
| `mg/kg`, `mcg/kg` (`ug/kg`, `µg/kg`), `IU/kg`, `mL/kg` (`cc/kg`) | same | per-kg |
| `mg`, `mcg` (`ug`, `µg`), `g`, `IU`, `mL` (`cc`) | same | per-animal; volumes need a liquid product |
| `EA`, `T`, `tab`, `정`, `캡슐`, `cap`, `개` | product form: tablet→`tablet`, chewable→`chewable`, capsule→`capsule`, spot-on→`pipette` | Liquid product + EA → `unit_count_liquid`. The count must be a multiple of `splitStep(strength)` (¼ quarter-scorable, ½ splittable, else 1; capsules 1), else `split_not_allowed` (not checked for powder rows). |
| `포`, `앰플`/`amp`, `바이알`/`vial`, `gtt`, `방울` | — | `unit_needs_record`: amount per sachet/ampoule/drop unknown → `dose: null`. Interaction, species, condition, allergy rules still run. |
| anything else | — | `unit_unknown`, `dose: null`. **Never treated as mg.** |

**Protocol policy** (`chooseProtocol`):
1. Take `protocolsFor(drugId, species)`. A vet's protocol choice wins.
2. Keep those whose `route` or `altRoutes` include the row route. None left → `protocol_route`, or `protocol_none` when the drug has no protocol for the species.
3. If the product's `defaultProtocolId` is among them → use it.
4. **Repeated schedule against single-dose-only references (D11):** if the frequency repeats (anything but `once`, `prn`, `cri`) and every remaining protocol is single-dose (`frequency: 'once'`) and none carries `repeatPolicy: 'label_single_only'` → `protocol_repeat_none` (no reference dose; dose not checked; incomplete). Protocols with `label_single_only` (feline meloxicam injection: the label allows one injection) stay, so the engine's repeat check and SPECIES_HARDSTOP fire.
5. Keep the protocols whose frequency equals the row frequency, **except** when the row is a single administration derived from Tt1 + Dy1 and both single-dose and repeated protocols remain (meloxicam dog: day-1 loading vs maintenance); then do not narrow: one administration does not tell which regimen it belongs to.
6. If more than one remains, keep those linked to a mapped diagnosis via `PROTOCOL_CONDITIONS`.
7. Exactly one → use it.
8. All in one `SAME_INDICATION` group (`ac_dog_eu` + `ac_dog_us`) → the group's primary + row note "EU/UK 라벨 기준(자동)".
9. Otherwise → `protocol_indication` with the options; the row shows "확인 필요: 적응증 선택 ▾" (a select of `indication[locale]`), sent back as `protocol-choice`.

### 4.3 Ambiguity: what is shown, and what is never done

Every **confirm reason** sets the row badge to "확인 필요" (or "참고 용량 없음" for `protocol_none` / `protocol_repeat_none` / `route_no_reference`) and makes `verdict.complete = false`. Every **visit reason** makes `complete = false` and shows a line in the 확인 필요 group.

| Reason key | Kind | KO text | EN | Never do |
|---|---|---|---|---|
| `unit_count_liquid` | row | 확인 필요: 액상 제품은 mL로 입력하십시오 | Needs input: enter liquids in mL | assume 1 EA = 1 mL or 1 vial |
| `unit_needs_record` | row | 확인 필요: 포·앰플·방울당 함량 기록이 없습니다 | Needs input: no amount per sachet/ampoule/drop | assume a compounding recipe |
| `unit_unknown` | row | 확인 필요: 단위를 인식할 수 없습니다 | Needs input: unit not recognised | treat as mg |
| `freq_missing` | row | 확인 필요: 횟수 미입력 | Needs input: frequency missing | assume q24h |
| `freq_unmapped` | row | 확인 필요: 용법을 입력하십시오 (예: 격일, 월1회) | Needs input: enter the schedule (e.g. every other day) | round Tt |
| `freq_conflict` | row | 확인 필요: 용법과 횟수가 다릅니다 (높은 횟수로 검토) | Needs input: schedule and times per day differ (checked at the higher) | pick the lower frequency |
| `route_no_reference` | row | 참고 용량 없음: 이 경로의 참고 용량이 없습니다 | No reference for this route | check against the PO protocol |
| `route_missing` | row | 확인 필요: 경로 미입력 | Needs input: route missing | assume PO |
| `protocol_route` | row | 확인 필요: 이 경로의 참고 용량이 없습니다 | Needs input: no reference for this route | pick another route's protocol |
| `protocol_none` | row | 참고 용량 없음: 용량 검토 안 함 | No reference dose: dose not checked | — |
| `protocol_repeat_none` | row | 참고 용량 없음: 반복 투여 참고 용량이 없습니다 | No reference for repeated dosing | compare a daily regimen with a single-dose reference |
| `protocol_indication` | row | 확인 필요: 적응증 선택 | Needs input: choose the indication | pick the lower or higher dose |
| `split_not_allowed` | row | 확인 필요: 이 제형은 {step} 단위로만 나눌 수 있습니다 | Needs input: this product splits only in {step} units | accept the fraction |
| `calc_mismatch` | row note | EMR 계산량 불일치: 체중·단위를 확인하십시오 | EMR calculated amount differs: check weight and unit | use the EMR value |
| `prn_max_per_day` | row note | 필요시: 1일 최대 {n}회로 검토했습니다 | As needed: checked at {n} times a day at most | — |
| `powder` | row note | 가루 조제: 정제 분할·반올림과 분쇄 가능 여부는 검토하지 않았습니다 | Powder: tablet splitting, rounding and crushing were not checked | claim a form may be crushed |
| `weight_stale` | note | 체중 {n}일 전 측정 | Weight measured {n} days ago | — |
| `breed_unresolved` | note; visit reason with a macrocyclic lactone | 품종을 인식하지 못했습니다: MDR1 위험은 미상으로 검토합니다 | Breed not recognised: MDR1 risk treated as unknown | treat as low risk |
| `allergy_free_text` | visit | 자유 입력 알레르기를 검토하지 못했습니다: 코드로 입력하십시오 | Free-text allergy not checked: enter it as a code | parse the text loosely |
| `allergy_text_recognised` | visit | 알레르기 "{text}": 자유 입력에서 인식, 확인 필요 | Allergy "{text}" recognised from free text: confirm | treat it as confirmed |
| `dx_unmapped:<code>` | visit | 진단 {code}: 분류되지 않아 검토하지 못했습니다 | Diagnosis {code} is unmapped and was not checked | guess from the name |
| `dx_text_recognised:<code>` | visit | 진단 "{display}": 자유 입력에서 인식, 확인 필요 | Diagnosis "{display}" recognised from text: confirm | treat it as coded |
| `lab_stale_<code>` | visit | {test} {n}일 전 검사: 최신 결과를 확인하십시오 | {test} is {n} days old: confirm a current value | drop an abnormal value |
| `age_under_1y` | visit | 1세 미만: 연령 관련 금기·주의는 검토하지 않았습니다 | Under one year: age-related cautions were not checked | — |
| unmapped product | row | 검토 안 함: 처방집에 없는 제품 | Not reviewed: not in the formulary | treat as "no findings" |
| species_unsupported / species_missing | visit | §3.11 | §3.11 | run as a dog |

**Engine validation notes** also force `complete = false`: notes with category `validation` (`weight_missing`, `freq_*`, `dose_strength_*`, `dose_unit_*`, `dose_noref_*`, `dose_route_*`, `unknown_drug_*`), and `factorsMissing` matching `/^(weightKg|protocol\.|frequency\.)/`.

---

## 5. Engine accuracy changes

WP1 owns `src/portfolio/engine/**` and `src/portfolio/knowledge/**`. D1, D2 and D9–D15 were prototyped in `/tmp/claude-0/uiresearch/spec-rev/pf-rev` by `patch_engine.py` and produced the §8 outputs; D8 and D17 are additive fields with no effect on findings. WP1 ports the same edits. No maximum dose or duration is invented: every new field is either a structural flag or a value already stated in the protocol's own source note in the knowledge base.

| # | Defect | Required change | Verified by |
|---|---|---|---|
| D1 | Count entries compared to bounds with no tolerance (carprofen 2 × 25 mg, 11 kg → moderate 1.033×) | `buildDoseRow`: count entries use `tolerance: ROUNDING_TOLERANCE` (0.10). `compareWithProtocol` returns `tolerated: true` when within only because of the tolerance; the engine then emits a rounding note (count entries only) | E20 → none + `rounding_carprofen_0` |
| D2 | Mass/volume entries flip on float noise (meloxicam 0.21 mL → minor below 0.984×) | `BOUND_TOLERANCE = 0.02` for mass/volume entries; no note | E06b → no DOSE_RANGE |
| D3 | A suggested plan can breach a ceiling | the widget never offers an unchecked suggestion (§6.3); the plan text itself is handled by D15 | E23 → no suggestion |
| D4 | ½ of a non-splittable product accepted | adapter `split_not_allowed` via exported `splitStep` | E21 |
| D5 | 일수 Dy ignored | **not fixed:** needs sourced `maxDurationDays`; coverage says "투여기간 검토 안 함" | documented |
| D6 | `weightKg: null` → `none` | widget shows 검토 불완전 | E14 |
| D7 | `{1,'정'}` without strength → `none` | adapter always supplies `strengthId`; `dose_strength_*` forces incomplete | design |
| D8 | "0 dose problems" next to "Check amount" | `counts.doseChecks` in `computeVerdict` (status ∉ {within, no_reference} or a rounding note); keep `doseProblems` | §8.2 |
| **D9** | **Same ingredient on two rows is never checked as a total** (two carprofen rows of 4.4 mg/kg = 8.8 mg/kg/day → `none`; 100 mg + 25 mg tablets → false minor "below") | `engine.js`: group meds by `drugId`. If every row shares route, frequency, `durationDays` and `protocolId` and has a computable mg dose, **sum the mg per administration and compare the total once** (each member's dose row gets `combined: { rows, indexes, totalMg }` and the combined status; the lead's exposure uses the total; note `combined_<drugId>`; DOSE_RANGE skips non-lead members and adds a "합산" why line). Otherwise new rule **`DUPLICATE_INGREDIENT` v1.0.0** (layer `pd`, problemKey `dup:<drugId>`): **major** when every row is a repeated administration, **moderate** when at least one row is a single administration (`once`, e.g. a day-1 injection then oral maintenance); evidence `mechanistic`, no sources | E24 none; E25 major 2.0× summed; E26 moderate |
| **D10** | **Starting-dose protocols act as maxima** (methimazole 5 mg BID refill → major, gate) | knowledge: `phase: 'start'` on `mmi_cat_start` and `pb_dog_epilepsy` (both protocols' own indication/notes say "starting dose … titrate"). `buildDoseRow` copies `phase` into `ref`. DOSE_RANGE: when `ref.phase === 'start'` and the status is above or below (not a repeat), severity **minor**, title "{drug}: 시작 용량보다 높음/낮음 (적정 중인 유지 용량이면 해당 없음)", factor id `<drug>_start_<status>`. DOSE_RANGE version 1.2.0 | E28, E29 |
| **D11** | **Single-dose references applied to daily regimens** (trazodone q12h × 14 d → moderate "repeat") | knowledge: `repeatPolicy: 'label_single_only'` on `melox_cat_periop` (metacam_label note: single injection only). The adapter (§4.2 step 4) returns `protocol_repeat_none` for other single-dose-only references | E30, E31; E08b unchanged |
| **D12** | **One administration compared with a daily minimum** (first in-clinic amoxicillin-clavulanate dose → minor below) | `compareWithProtocol`: when `frequency === 'once'`, skip the frequency-based daily-exposure comparison and, in per-day protocols, the daily **minimum** (the per-day maximum still applies to the single dose) | E33 none; E44 within |
| **D13** | **Every dose reference is a US label, unlabelled as such** | knowledge: `jurisdiction: 'US'` on every label source whose cite says US FDA, `'UK'` on `synulox_label`. `buildDoseRow` copies `jurisdiction` into `ref`; dose cards show "미국 라벨 기준" (§3.7.2). Ranges are **not** changed: the EU ranges the critique quoted were from memory and are unverified | E38, E39 (minor below, labelled) |
| **D14** | **Minimum-only label encoded as min = max** (maropitant ½ × 16 mg, 3 kg dog → moderate 1.33×) | knowledge: `maro_dog_vomit` dose `max: null` (its note: "Label gives 2 mg/kg as the minimum tablet dose"). No "above" check exists without a sourced maximum. `knowledge.test.js` "min ≤ max" allows `max: null` | E37 none; E05, E19 ratio null |
| **D15** | **The engine's plan text recommends an amount above the feline enrofloxacin limit** (3.5 kg cat, 5 mg/kg → plan "22.7 mg 정제 1정" = 6.49 mg/kg/day) | `engine.js`: for a cat and a drug with `flags.felineRetinalLimit`, when the engine planned the amount (mass entry, not a count/volume the vet typed) and the entered dose itself is within the limit, compute `deliveredMg × perDay / weight`; above the limit → `doseRow.planExceedsCeiling = { valuePerKgDay, limit }` and note `ceiling_plan_<drugId>_<index>` (category caution, source baytril_label): "…가장 가까운 제품 투여량(22.7 mg 정제 1정)은 6.49 mg/kg/일로 고양이 한계 5 mg/kg/일을 넘습니다. 다른 함량이나 조제 제형을 사용하고 올림하지 마십시오." The widget shows this note in place of the plan text | E23 |
| **D16** | NSAID + CKD + heart failure / diuretic is moderate | **Unchanged (founder decision 3).** The UK VMD SPC wording ("do not use … impaired hepatic, cardiac or renal function") was seen only in a search snippet. WP1 may raise NSAID_RENAL to major for CKD + CHF/diuretic **only** after reading the full SPC or FDA label text, quoting the sentence in `sources.js`, and adding a test; otherwise V6/E06 stay 주의, and §9 lists this for the vet review | E06 moderate |
| **D17** | Engine verdict headlines start with the severity word and an em dash ("금기 — …"), duplicating the badge; the `none` headline uses "안전" | `computeVerdict` adds `verdict.action` (headline without the severity word, no em dash): contraindicated "현재 처방대로 조제하지 마십시오" / "Do not dispense as written"; major "처방을 변경하거나 의도한 이유를 기록하십시오" / "Change the prescription or record why it is intended"; moderate "아래 모니터링 계획과 함께 조제하십시오" / "Dispense only with the monitoring plan below"; minor "기록하고 관찰하십시오" / "Note and monitor"; none "규칙으로 확인한 문제가 없습니다. 이상이 없다는 뜻은 아닙니다." / "The rules found no problem. This does not mean there is none." `headline` is kept for the workbench and existing tests | §8.2 |

### 5.1 Exact engine changes (WP1)

1. **`dose.js`:** `BOUND_TOLERANCE = 0.02`; `compareWithProtocol(args)` wraps the comparison: run with the tolerance (`ROUNDING_TOLERANCE` for count entries, else `BOUND_TOLERANCE`); if the result is `within` and a strict run (`1e-9`) is not, return `{ …, tolerated: true, strictStatus }`. In the comparison core: skip the per-day **minimum** when `frequency === 'once'`; skip the frequency-based daily-exposure block when `frequency === 'once'` (D12). `buildDoseRow`: `ref.phase`, `ref.jurisdiction` (from `getSource(protocol.source)`), `deliveredMg` on the row, `tolerated`; when `cmp.tolerated` for a count entry and no other rounding note exists, `rounding.text` = KO `` `${administration.ko}: ${v} ${u} (참고 ${range}, ${sign}${pct}%). 이 제형의 분할 허용 범위 안입니다.` `` / EN `` `${administration.en} gives ${v} ${u}, ${sign}${pct}% from the reference ${range}; within the rounding allowance for this product.` `` (`v`, `u` from `compared`; `range` from the protocol; deviation relative to the bound that was crossed).
2. **`engine.js`:** D9 grouping/summing before rules run (`ctx.duplicateGroups` for the new rule; `m.combinedInto` on non-lead members); D15 plan check after dose rows are built.
3. **`rules/duplicateIngredient.js`** (new) and its registration after `NSAID_DUPLICATE` in `rules/index.js`.
4. **`rules/doseRange.js`:** version 1.2.0; skip `combinedInto` members; D10 branch; the combined why line.
5. **`findings.js` `computeVerdict`:** `counts.doseChecks` (D8); `verdict.action` (D17).
6. **`knowledge/drugs.js`:** `phase: 'start'` (mmi_cat_start, pb_dog_epilepsy); `max: null` (maro_dog_vomit); `repeatPolicy: 'label_single_only'` (melox_cat_periop). **`knowledge/sources.js`:** `jurisdiction` on label sources.
7. **`index.js`:** export `BOUND_TOLERANCE`, `splitStep`, `exposure24hPerKg`, `ENGINE_VERSION = '1.2.0'`; re-export `canonicalJson`, `fnv1a`.

### 5.2 Test edits (WP1), and the expected failures on the prototype

On the patched copy, 244 of 249 existing tests pass. The five failures and what WP1 does:

| Test | Why it fails | WP1 change |
|---|---|---|
| `knowledge.test.js` › every DOI is listed in `SOURCES_VERIFIED.md` | path-only: the prototype runs outside `frontend/` | none (passes in the repo) |
| `knowledge.test.js` › protocols are well-formed (min ≤ max) | D14 `max: null` | allow `max === null` (then `min > 0` is required) |
| `rules.test.js` › rule registry list | D9 adds `DUPLICATE_INGREDIENT` | add it to the expected list |
| `rules.test.js` › DOSE_RANGE "above max but < 2× → moderate" and "≥ 2× max → major" | the fixture uses `pb_dog_epilepsy`, now `phase: 'start'` (D10) | move both to `keto_dog_malassezia` (extra-label, 10 mg/kg/day, q24h, 10 kg dog): 12 mg/kg → moderate (1.2×), 20 mg/kg → major with "2× the maximum" and evidence `literature` (verified on the prototype); keep "within" and "below → minor" on PB |

**New tests** (`engine/__tests__/dose.test.js`, `rules.test.js`): D1 tolerated + note; D2 silent; "≥ 2× max is still major"; "5 % above max with a mg/kg entry is still moderate"; "11 % above max with a count entry is still moderate"; D9 summed within / summed major / duplicate major / duplicate moderate; D10 PB 4 and 6 mg/kg → minor `start_above`; D11 is adapter-side (WP2); D12 single administration never "below" a daily minimum; D13 `ref.jurisdiction`; D14 `max: null` never "above"; D15 E23 note; D17 `verdict.action` has no em dash and no "안전". All five golden cases unchanged; `rules.test.js:293` (`doseProblems` 1) unchanged.

**Safety ceilings are unaffected** by the tolerances: ENRO_FELINE_RETINA uses `exposure24hPerKg` directly; E08 (34 mg = 9.71 mg/kg/day) is still major.

---

## 6. From engine result to cards

### 6.1 Building cards (`cards.js`)

One card per engine `Finding` (already merged by `problemKey`):

| Field | Value |
|---|---|
| `summary` | `title[locale]` |
| `indicator` | per §3.6 |
| `detail` | Markdown: `consequence`, `why[]`, `actions[]`, `alternatives[]` |
| `source` | `{ label: 'NuvoVet DUR', topic: { code: ruleId, display: category } }` |
| `extension.rowIds` | every row whose `drugId ∈ finding.drugIds` |
| `extension.primaryRowIds` / `relatedRowIds` | A drug is **primary** when deleting all its rows (re-check as in §6.3) removes the card's `problemKey` or lowers its severity without adding or raising another finding. Rows of the other drugs are **related**. If no drug is primary, every row is primary. Verified: V1 primary rx-1 (ivermectin), related rx-2 (ketoconazole); V6 primary rx-1 (meloxicam), related rx-2, rx-4 (furosemide, benazepril); V7 NSAID_CORTICOSTEROID both primary |
| `extension.jurisdiction` | `ref.jurisdiction` for dose cards, else null |

**Sort:** severity rank, then number of factors, then first row order. **Blocking** = severity ∈ {contraindicated, major}.

**Notes are not cards.** They go to "투약 안내" in the order administration, lab, monitoring, caution, rounding, with the drug name and source chips; validation notes and confirm/visit reasons go to "확인 필요". Rounding notes of powder rows are dropped. A dose row with `planExceedsCeiling` shows its `ceiling_plan_*` note instead of the plan text.

### 6.2 Coverage strip (`coverage.js`, computed per visit)

Each item is **checked**, **partial** (with a reason) or **not checked**:

| Item | Partial when |
|---|---|
| species | never (unsupported/missing species shows the species state instead) |
| breed (MDR1) | `breed_unresolved` |
| interaction, duplication | never |
| condition | any `dx_unmapped:*` or `dx_text_recognised:*` |
| kidney | `lab_stale_creatinine`, or a renal-relevant drug with `labs.creatinine` in the engine's `factorsMissing` and no CKD diagnosis ("크레아티닌 없음") |
| allergy | `allergy_free_text` or `allergy_text_recognised` |
| dose | any row with a confirm reason or a `dose_*` validation note ("{n}행 제외") |

Always **not checked:** age (worded "연령 (1세 미만)" when `age_under_1y`), pregnancy/lactation, duration, other clinics' prescriptions, this clinic's earlier prescriptions (no `prefetch.activeMedications` this phase); plus "분쇄 가능 여부" when any row is powder. A test maps every rule's layer in `RULE_LAYERS` to one item, so a rule added without updating the strip fails.

### 6.3 Suggestions (`suggestions.js`), re-checked

**Candidates per card:**
1. **Delete**, per involved **row** (not per drug): label "{drug} 삭제" when the drug has one row, "{product} 행 삭제" when it has several. **Never** for an in-clinic (Tx) row.
2. **Strength change:** for an involved row with `dose.suggestedStrengthId ≠ row strength`, the mapped product for that strength, keeping the per-kg dose.
3. **Plan change:** for a count-entered row with a rounding note, counts that are multiples of `splitStep` within ±1 step.

**Re-check:** apply the candidate to a copy of the visit, then `adapt` + `analyze`. **Offered only if** the card's `problemKey` is gone or its severity drops (rounding note clears, for plans), **and** no new finding appears and no existing finding's severity rises. At most 2 per card; `isRecommended` = the first offered. Alternatives from other drug classes are text only under 자세히.

**Verified** (`out_rev_cards.txt`):

| Scenario | Offered |
|---|---|
| E01 / V1 | "이버멕틴 삭제" (recommended) only; deleting ketoconazole leaves MDR1_PGP_ML contraindicated |
| E07 / V7 | NSAID_CORTICOSTEROID: "카프로펜 삭제", "프레드니솔론 삭제" (each clears it, nothing added) |
| E08b | ENRO card: "엔로플록사신 삭제"; SPECIES_HARDSTOP (meloxicam, Tx row): none |
| E23 | none (1 × 22.7 mg → major ENRO_FELINE_RETINA; ½ × 22.7 → new minor DOSE_RANGE) |
| E25 | "카프로펜 정 100 mg 행 삭제", "카프로펜 정 25 mg 행 삭제" |
| E26 | "멜록시캄 현탁액 1.5 mg/mL 행 삭제" only (the other row is Tx) |
| E27 | "카프로펜 삭제" only (meloxicam is a Tx row) |

---

## 7. Routes, builds and links

| Target | URL / file | Notes |
|---|---|---|
| In-app demo | `/dur#/emr` → `#/emr/V1`; `/dur#/emr/:visitId` (V1–V10); `?lang=en` optional | `matchRoute`: `seg[0]==='emr'` → `emr`, `params.visitId = seg[1] ?? null`. Unknown visitId → `#/emr/V1`. `EmrDemoPage` replaces the portfolio header with the 40 px demo bar and lazy-loads host + widget with `marker: false`. |
| Standalone single file | `dist-portfolio/index.html#/emr/V1` | Same code; `fonts:'inherit'` (`fonts-standalone.css` is on the document); CSP unchanged except `font-src data:`; zero requests. |
| Widget bundle | `npm run build:widget` → `dist-widget/nuvovet-dur.iife.js` (`window.NuvoVetDUR`) and `dist-widget/nuvovet-dur.js` (ESM) | `vite.widget.config.js`: library mode; `define: {'process.env.NODE_ENV': '"production"'}`; `cssCodeSplit:false`; `rolldownOptions.output: { codeSplitting:false, exports:'named' }`; `plugins: [fontSubsetImport(), react()]` (no Tailwind). The font is imported with `?subset` as bytes (subset to the characters in `src/portfolio/**`; stack track: 2,009 → 46 kB) and registered with FontFace (§3.4). Budget ≤ 250 kB gzip. |
| Widget demo pages | `frontend/widget-demo/index.html` (plain-HTML EMR table with `<td><span data-nv-slot>`, no React, calling `NuvoVetDUR.create().mount()`); `frontend/widget-demo/hostile.html`; `frontend/widget-demo/csp.html` | Hostile host from `/tmp/claude-0/uiresearch/stack/host/emr.html`: `html{font-size:62.5%}`, `* {…!important}`, `button,input,select{all:unset}`, `[role=dialog],[role=alertdialog]{display:none}`, `[data-state=open]{opacity:.2}`, `* { --primary: lime !important }`, fake "Pretendard Variable", sticky header `z-index:99999`, a responsive right column that unmounts below 1280. `csp.html` sets `<meta http-equiv="Content-Security-Policy" content="style-src 'self'; font-src 'none'; script-src 'self'">` (pattern from `/tmp/claude-0/uiresearch/critique-emr/shadowtest/font.cjs`). |

**Links into the demo:** case study `#/` primary CTA "EMR 데모 열기" → `#/emr/V1` (hero crop = the V1 widget panel, inert); `#/cases` golden cards "EMR에서 보기" (`choco`→V1, `kongyi`→V2, `nabi`→V3, `mochi`→V4, `daebak`→V5); the same link in the workbench header; How it works "EMR 연동 방식" (≤ 120 words + the §3.3 excerpts) → `#/emr/V1`; portfolio nav "EMR 데모".

**Links out:** widget "전체 분석 열기" → `${workbenchBase}/case/custom?s=${stateParam(caseInput)}` (`caseModel.stateParam`, `router.casePath`); demo bar "사례로" → `#/case/<golden id>` for V1–V5, else `#/cases`.

---

## 8. Accuracy test plan

### 8.1 Scenarios: EMR rows → exact expected output

**How these were produced.** `node /tmp/claude-0/uiresearch/spec-rev/run.mjs rev SPEC|NEW` through the Appendix C adapter on the D1/D2 + D9–D15 engine (§0 "How the expected outputs were produced"). Fixtures are in Appendix B. E24–E53 come from the critique's adversarial set X01–X27 (`/tmp/claude-0/uiresearch/critique-emr/extra.mjs`) plus new cases for the revised rules.

WP2's `src/portfolio/emr/__tests__/scenarios.test.js` MUST assert every line of the raw output below: `verdict.level`, `complete` and the exact incomplete reasons, the multiset of `ruleId/severity[drugIds]`, each dose's `perDoseMg`, `status`, `ratio` and summed total, the note ids, each row's `protocolId`, confirm reasons, notes and Tx flag, and the adapter/visit notes. The "Depends on" column names the change each expectation needs; until WP1 lands, a scenario whose expectation depends on an engine change (D1, D2, D9, D10, D12–D15) is an `it.fails` marker, then a normal test. Adapter-only dependencies (C2, C3, C4, M1, M5, M8, L4, D11's policy) are WP2's own.

| ID | Scenario | Verdict | complete | Findings (ruleId/severity [drugs]) | Gate at save | Depends on |
|---|---|---|---|---|---|---|
| E01 | V1 초코: ivermectin + ketoconazole, collie | contraindicated | true | MDR1_PGP_ML/contraindicated [ivermectin+ketoconazole]; no DOSE_RANGE | yes (1) | — |
| E02 | V2 콩이 | moderate | true | CYP_INDUCTION/moderate [phenobarbital+ciclosporin]; IMMUNOSUPPRESSION_ADDITIVE/minor; CYP_INDUCTION/minor | no | — |
| E03 | V3 나비 | moderate | true | METHIMAZOLE_CKD/moderate [methimazole] | no | — |
| E04 | V4 모찌: permethrin, cat | contraindicated | false (protocol_none) | SPECIES_HARDSTOP/contraindicated [permethrin] | yes (1) | — |
| E05 | V5 대박 (negative control) | none | true | — (maropitant ratio null) | no | D14 |
| E06 | V6 보리 | moderate | true | NSAID_RENAL/moderate [meloxicam+furosemide+benazepril] | no | D16 (unchanged) |
| E06b | V6, meloxicam 0.21 mL | moderate | true | as E06; no DOSE_RANGE | no | D2 |
| E07 | V7 해피 (Tt4) | major | true | NSAID_CORTICOSTEROID/major; SEROTONERGIC/moderate | yes (1) | — |
| E07b | V7, tramadol Tt3 | major | true | + DOSE_RANGE/minor [tramadol] (genuine: q8h 15 vs q6h 20 mg/kg/day) | yes (1) | — |
| E08 | V8 레오: enrofloxacin ½×68 mg; meloxicam inj as **Tx** Dy1 | major | true | ENRO_FELINE_RETINA/major [enrofloxacin] | yes (1) | C2 |
| E08b | V8, meloxicam Dy3 | major | true | ENRO_FELINE_RETINA/major; SPECIES_HARDSTOP/major [meloxicam] | yes (2) | C2 |
| E09 | V9 두부: fluoxetine, epileptic poodle | contraindicated | true | DRUG_CONDITION/contraindicated [fluoxetine] | yes (1) | — |
| E10 | V10 코코: penicillin allergy | major | true | ALLERGY_CLASS/major [amoxicillin_clavulanate] | yes (1) | — |
| E11 | hepatopathy + phenobarbital | contraindicated | true | DRUG_CONDITION/contraindicated [phenobarbital] | yes (1) | — |
| E12 | ketoconazole + omeprazole | moderate | true | GASTRIC_PH_AZOLE/moderate | no | — |
| E13 | carprofen + meloxicam | major | true | NSAID_DUPLICATE/major | yes (1) | — |
| E14 | no weight | none | false (weight_missing) | — | no | — |
| E15 | maropitant PO, no diagnosis | none | false (protocol_indication) | — | no | — |
| E16 | blank Tt + unmapped RX-XYZ-999 | none | false (freq_missing; unmapped) | — | no | — |
| E17 | ivermectin as "포", collie | contraindicated | false (unit_needs_record) | MDR1_PGP_ML/contraindicated | yes (1) | — |
| E18 | rabbit | unsupported (`species_unsupported`) | — | `analyze` not called | no | L4 |
| E19 | maropitant ½×16 mg, 3.8 kg dog | none | true | — (within, ratio null, no rounding note) | no | D14 |
| E20 | carprofen 2×25 mg, 11 kg dog | none | true | — (+ `rounding_carprofen_0`) | no | D1 |
| E21 | robenacoxib 20 mg ½정 | none | false (split_not_allowed) | — | no | D4 |
| E22 | stale weight + 계산량 mismatch | none | true | — (notes weight_stale, calc_mismatch) | no | — |
| E23 | cat enrofloxacin 5 mg/kg, 22.7 mg tablet | none | true | — (+ `ceiling_plan_enrofloxacin_0`); no suggestion | no | D15 |
| E24 | carprofen 100 mg + 25 mg tablets, same schedule (X01) | none | true | — (Σ 125 mg, within 1.015) | no | D9 |
| E25 | carprofen 4.4 mg/kg on two rows (X02) | major | true | DOSE_RANGE/major [carprofen] (Σ 246.4 mg, 2.0×) | yes (1) | D9 |
| E26 | meloxicam inj Tx Dy1 + oral Dy14, dog (X03) | moderate | false (protocol_route on the Tx row) | DUPLICATE_INGREDIENT/moderate [meloxicam] | no | D9, C2 |
| E27 | meloxicam inj Tx + carprofen Rx + an X-ray Tx row (X04) | major | false (protocol_route) | NSAID_DUPLICATE/major [meloxicam+carprofen] | yes (1) | C2 |
| E28 | methimazole 5 mg BID, cat with Cr 2.0 (X05) | moderate | true | METHIMAZOLE_CKD/moderate; DOSE_RANGE/minor (start dose, 2.0×) | no | D10 |
| E29 | phenobarbital 4 mg/kg BID (X06) | minor | true | DOSE_RANGE/minor (start dose, 1.333×) | no | D10 |
| E30 | trazodone q12h × 14 d (X07) | none | false (protocol_repeat_none) | — | no | D11 |
| E31 | gabapentin q12h, cat with Cr 2.0 (X08) | moderate | false (protocol_repeat_none) | RENAL_ADJUST/moderate [gabapentin] | no | D11 |
| E32 | meloxicam dog Tt1 Dy1 (X09) | none | false (protocol_indication: oa vs load) | — | no | adapter §4.2 step 5 |
| E33 | first in-clinic amoxicillin-clavulanate dose Tt1 Dy1 (X09b) | none | true | — | no | D12 |
| E34 | phenobarbital 용법 "1일 1회" + Tt2 (X10) | none | false (freq_conflict) | — (checked at q12h) | no | C3 |
| E35 | cat enrofloxacin 용법 "sid" + Tt3 (X10b) | major | false (freq_conflict) | ENRO_FELINE_RETINA/major (3.0×) | yes (1) | C3 |
| E36 | carprofen 용법 "필요시", Tt blank (X11) | none | false (dose_unit) | — | no | — |
| E36b | carprofen "필요시" + Tt2 | major | true | DOSE_RANGE/major (2.0×, 2 × 4.4 mg/kg/day max) | yes (1) | C3 |
| E37 | maropitant ½×16 mg, 3 kg dog (X12) | none | true | — | no | D14 |
| E38 | carprofen 4 mg/kg (X13) | minor | true | DOSE_RANGE/minor (below, 0.909; card says 미국 라벨 기준) | no | D13 |
| E39 | pimobendan 0.2 mg/kg BID, CHF (X14) | minor | true | DOSE_RANGE/minor (below, 0.8; 미국 라벨 기준) | no | D13 |
| E40 | free-text allergy "페니실린 알레르기" (X15) | major | false (allergy_text_recognised) | ALLERGY_CLASS/major | yes (1) | C4 |
| E40b | free-text allergy "닭고기" | none | false (allergy_free_text) | — | no | C4 |
| E41 | epilepsy under unmapped code D-NEU-099, no name (X16) | none | false (dx_unmapped:D-NEU-099) | — | no | C4 |
| E41b | D-NEU-099 with display "뇌전증" | contraindicated | false (dx_text_recognised:D-NEU-099) | DRUG_CONDITION/contraindicated [fluoxetine] | yes (1) | C4 |
| E42 | creatinine 2.1 dated 124 days earlier + meloxicam (X17) | moderate | false (lab_stale_creatinine) | NSAID_RENAL/moderate [meloxicam] | no | C4 |
| E42b | creatinine 1.0 dated 124 days earlier + meloxicam | none | false (lab_stale_creatinine) | — | no | C4 |
| E43 | unresolved breed "XYZ/모름" + ivermectin | moderate | false (breed_unresolved) | MDR1_PGP_ML/moderate | no | C4 |
| E44 | Heartgard 272 mcg chewable Tt1 Dy1, collie (X19) | minor | true | MDR1_PGP_ML/minor (protocol iver_dog_hw by product default) | no | M1, D12 |
| E45a | cat enrofloxacin ½×68 mg at 3.5 kg (X20a) | major | true | ENRO_FELINE_RETINA/major (1.943×) | yes (1) | — |
| E45b | same row at 2.5 kg (X20b) | major | true | ENRO_FELINE_RETINA/major (2.72×); **inputHash ≠ E45a** | yes (1) | H3 |
| E46 | mL/kg on a tablet (X21) | none | false (dose_strength, dose_unit) | — | no | — |
| E47 | "포" on a tablet (X22) | none | false (unit_needs_record) | — | no | — |
| E48 | cat meloxicam SC with CKD (X23) | major | true | NSAID_RENAL/major [meloxicam] | yes (1) | — |
| E49 | enrofloxacin, 4-month-old Labrador (X25) | none | false (age_under_1y) | — | no | M8 |
| E50 | blank route (X26) | none | false (route_missing, protocol_route) | — | no | — |
| E51 | V3 with maropitant as 가루 | moderate | true | METHIMAZOLE_CKD/moderate; the maropitant rounding note is not shown (powder) | no | M5 |
| E52 | blank species | unsupported (`species_missing`) | — | `analyze` not called | no | L4 |
| E53 | phenobarbital 용법 "격일" + Tt2 | none | false (freq_conflict) | — (checked at q12h) | no | C3 |

**Gate expectations:** the gate opens at save for E01, E04, E07, E07b, E08, E08b, E09, E10, E11, E13, E17, E25, E27, E35, E36b, E40, E41b, E45a, E45b and E48, and for **no other** scenario.

**Raw output, binding** (`out_rev_spec.txt` + `out_rev_new.txt`). `Σ` is the summed amount of a same-ingredient group; `@Tx` marks an in-clinic row; `~` row notes; `!` confirm reasons; `adapterNotes` lists adapter notes and visit reasons. E51's `rounding_maropitant_2` is an engine note that `cards.js` drops because rx-3 is powder.

```
E01
  verdict=contraindicated complete=true
  findings: MDR1_PGP_ML/contraindicated[ivermectin+ketoconazole]
  doses: ivermectin:7.2mg:within(0.5) plan=10 mg/mL 0.72 mL, ketoconazole:120mg:within(1) plan=200 mg 정제 ½정
  notes: rounding_ketoconazole_1, admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=iver_dog_demodex rx-2=keto_dog_malassezia
E02
  verdict=moderate complete=true
  findings: CYP_INDUCTION/moderate[phenobarbital+ciclosporin], IMMUNOSUPPRESSION_ADDITIVE/minor[ciclosporin+prednisolone], CYP_INDUCTION/minor[phenobarbital+prednisolone]
  doses: phenobarbital:15mg:within(0.833) plan=15 mg 정제 1정, ciclosporin:30mg:within(0.746) plan=10 mg 캡슐 3개, prednisolone:3mg:within(0.5) plan=5 mg 정제 ½정
  notes: rounding_prednisolone_2, admin_phenobarbital_0, admin_phenobarbital_1, admin_ciclosporin_0, admin_ciclosporin_1
  rows: rx-1=pb_dog_epilepsy rx-2=csa_dog_ad rx-3=pred_dog_ad
E03
  verdict=moderate complete=true
  findings: METHIMAZOLE_CKD/moderate[methimazole]
  doses: methimazole:2.5mg:within(1) plan=2.5 mg 정제 1정, amlodipine:0.625mg:within(0.25) plan=2.5 mg 정제 ¼정, maropitant:4.1mg:within(0.345) plan=16 mg 정제 ½정
  notes: rounding_maropitant_2, admin_methimazole_0, admin_amlodipine_0
  rows: rx-1=mmi_cat_start rx-2=amlo_cat_htn rx-3=maro_cat_ckd_po
E04
  verdict=contraindicated complete=false (dose_noref_permethrin; protocol.permethrin; rx-1:protocol_none)
  findings: SPECIES_HARDSTOP/contraindicated[permethrin]
  doses: permethrin:nullmg:no_reference
  notes: dose_noref_permethrin
  rows: rx-1=∅!protocol_none
E05
  verdict=none complete=true
  findings: —
  doses: amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정, maropitant:60mg:within plan=60 mg 정제 1정
  notes: —
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동) rx-2=maro_dog_vomit
E06
  verdict=moderate complete=true
  findings: NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]
  doses: meloxicam:0.32mg:within(1) plan=1.5 mg/mL 0.21 mL, furosemide:6.4mg:within(1) plan=12.5 mg 정제 ½정, pimobendan:0.8mg:within(1) plan=1.25 mg 츄어블 ½개, benazepril:1.6mg:within(0.125) plan=5 mg 정제 ½정
  notes: rounding_pimobendan_2, rounding_benazepril_3, admin_meloxicam_0, admin_furosemide_0, admin_benazepril_0
  rows: rx-1=melox_dog_oa rx-2=furo_dog_chf rx-3=pimo_dog_chf rx-4=bena_dog_htn
E06b
  verdict=moderate complete=true
  findings: NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]
  doses: meloxicam:0.315mg:within(0.984) plan=1.5 mg/mL 0.21 mL, furosemide:6.4mg:within(1) plan=12.5 mg 정제 ½정, pimobendan:0.8mg:within(1) plan=1.25 mg 츄어블 ½개, benazepril:1.6mg:within(0.125) plan=5 mg 정제 ½정
  notes: rounding_pimobendan_2, rounding_benazepril_3, admin_meloxicam_0, admin_furosemide_0, admin_benazepril_0
  rows: rx-1=melox_dog_oa rx-2=furo_dog_chf rx-3=pimo_dog_chf rx-4=bena_dog_htn
E07
  verdict=major complete=true
  findings: NSAID_CORTICOSTEROID/major[carprofen+prednisolone], SEROTONERGIC/moderate[tramadol+trazodone]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, prednisolone:14mg:within(0.5) plan=5 mg 정제 3정, tramadol:140mg:within(1) plan=50 mg 정제 3정, trazodone:280mg:within(0.833) plan=100 mg 정제 3정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=pred_dog_ad rx-3=tram_dog_pain rx-4=traz_dog_previsit
E07b
  verdict=major complete=true
  findings: NSAID_CORTICOSTEROID/major[carprofen+prednisolone], SEROTONERGIC/moderate[tramadol+trazodone], DOSE_RANGE/minor[tramadol]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, prednisolone:14mg:within(0.5) plan=5 mg 정제 3정, tramadol:140mg:below(1) plan=50 mg 정제 3정, trazodone:280mg:within(0.833) plan=100 mg 정제 3정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=pred_dog_ad rx-3=tram_dog_pain rx-4=traz_dog_previsit
E08
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정, meloxicam:1.05mg:within(1) plan=5 mg/mL 0.21 mL
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0, admin_meloxicam_0, caution_meloxicam_0
  rows: rx-1=enro_cat rx-2=melox_cat_periop@Tx
E08b
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin], SPECIES_HARDSTOP/major[meloxicam]
  doses: enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정, meloxicam:1.05mg:above plan=5 mg/mL 0.21 mL
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0, admin_meloxicam_0
  rows: rx-1=enro_cat rx-2=melox_cat_periop@Tx
E09
  verdict=contraindicated complete=true
  findings: DRUG_CONDITION/contraindicated[fluoxetine]
  doses: fluoxetine:16mg:within(1) plan=16 mg 츄어블 1개, phenobarbital:20mg:within(0.833) plan=30 mg 정제 ½정
  notes: rounding_phenobarbital_1, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=flx_dog_sep rx-2=pb_dog_epilepsy
E10
  verdict=major complete=true
  findings: ALLERGY_CLASS/major[amoxicillin_clavulanate]
  doses: amoxicillin_clavulanate:150mg:within(0.5) plan=250 mg 정제 ½정
  notes: rounding_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
E11
  verdict=contraindicated complete=true
  findings: DRUG_CONDITION/contraindicated[phenobarbital]
  doses: phenobarbital:20mg:within(0.833) plan=30 mg 정제 ½정
  notes: rounding_phenobarbital_0, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy
E12
  verdict=moderate complete=true
  findings: GASTRIC_PH_AZOLE/moderate[ketoconazole+omeprazole]
  doses: ketoconazole:300mg:within(1) plan=200 mg 정제 1½정, omeprazole:30mg:within(1) plan=10 mg 캡슐 3개
  notes: admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=keto_dog_malassezia rx-2=ome_dog_acid
E13
  verdict=major complete=true
  findings: NSAID_DUPLICATE/major[carprofen+meloxicam]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, meloxicam:2.8mg:within(1) plan=1.5 mg/mL 1.9 mL
  notes: rounding_carprofen_0, admin_carprofen_0, admin_meloxicam_0
  rows: rx-1=carp_dog_pain rx-2=melox_dog_oa
E14
  verdict=none complete=false (weight_missing; weightKg)
  findings: —
  doses: carprofen:nullmg:unit_mismatch
  notes: weight_missing, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E15
  verdict=none complete=false (dose_noref_maropitant; protocol.maropitant; rx-1:protocol_indication)
  findings: —
  doses: maropitant:60mg:no_reference plan=60 mg 정제 1정
  notes: dose_noref_maropitant
  rows: rx-1=∅!protocol_indication
E16
  verdict=none complete=false (freq_amoxicillin_clavulanate_0; frequency.amoxicillin_clavulanate; rx-1:freq_missing; unmapped:RX-XYZ-999)
  findings: —
  doses: amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정
  notes: freq_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu!freq_missing~EU/UK 라벨 기준(자동)
E17
  verdict=contraindicated complete=false (dose_unit_ivermectin; rx-1:unit_needs_record)
  findings: MDR1_PGP_ML/contraindicated[ivermectin+ketoconazole]
  doses: ivermectin:nullmg:unit_mismatch, ketoconazole:120mg:within(1) plan=200 mg 정제 ½정
  notes: rounding_ketoconazole_1, dose_unit_ivermectin, admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=iver_dog_demodex!unit_needs_record rx-2=keto_dog_malassezia
E18
  supported=false (species_unsupported)
E19
  verdict=none complete=true
  findings: —
  doses: maropitant:8mg:within plan=16 mg 정제 ½정
  notes: —
  rows: rx-1=maro_dog_vomit
E20
  verdict=none complete=true
  findings: —
  doses: carprofen:50mg:within(1.033) plan=25 mg 정제 2정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E21
  verdict=none complete=false (rx-1:split_not_allowed)
  findings: —
  doses: robenacoxib:10mg:within(0.5) plan=20 mg 정제 ½정
  notes: —
  rows: rx-1=robe_dog_postop!split_not_allowed
E22
  verdict=none complete=true
  findings: —
  doses: phenobarbital:15mg:within(0.833) plan=15 mg 정제 1정
  notes: admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy~calc_mismatch
  adapterNotes: weight_stale
E23
  verdict=none complete=true
  findings: —
  doses: enrofloxacin:17.5mg:within(1) plan=22.7 mg 정제 1정
  notes: rounding_enrofloxacin_0, ceiling_plan_enrofloxacin_0, admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat
E24
  verdict=none complete=true
  findings: —
  doses: carprofen:100mg:within(1.015) plan=100 mg 정제 1정 Σ125mg, carprofen:25mg:within(1.015) plan=25 mg 정제 1정 Σ125mg
  notes: combined_carprofen, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=carp_dog_pain
E25
  verdict=major complete=true
  findings: DOSE_RANGE/major[carprofen]
  doses: carprofen:123.2mg:above(2) plan=100 mg 정제 1정 Σ246.4mg, carprofen:123.2mg:above(2) plan=25 mg 정제 5정 Σ246.4mg
  notes: rounding_carprofen_0, combined_carprofen, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=carp_dog_pain
E26
  verdict=moderate complete=false (dose_noref_meloxicam; protocol.meloxicam; tx-1:protocol_route)
  findings: DUPLICATE_INGREDIENT/moderate[meloxicam]
  doses: meloxicam:5.6mg:no_reference plan=5 mg/mL 1.1 mL, meloxicam:2.8mg:within(1) plan=1.5 mg/mL 1.9 mL
  notes: dose_noref_meloxicam, admin_meloxicam_0
  rows: tx-1=∅!protocol_route@Tx rx-1=melox_dog_oa
E27
  verdict=major complete=false (dose_noref_meloxicam; protocol.meloxicam; tx-1:protocol_route)
  findings: NSAID_DUPLICATE/major[meloxicam+carprofen]
  doses: meloxicam:5.6mg:no_reference plan=5 mg/mL 1.1 mL, carprofen:123.2mg:within(1) plan=100 mg 정제 1정
  notes: rounding_carprofen_1, dose_noref_meloxicam, admin_meloxicam_0, admin_carprofen_0
  rows: tx-1=∅!protocol_route@Tx rx-1=carp_dog_pain
E28
  verdict=moderate complete=true
  findings: METHIMAZOLE_CKD/moderate[methimazole], DOSE_RANGE/minor[methimazole]
  doses: methimazole:5mg:above(2) plan=2.5 mg 정제 2정
  notes: admin_methimazole_0
  rows: rx-1=mmi_cat_start
E29
  verdict=minor complete=true
  findings: DOSE_RANGE/minor[phenobarbital]
  doses: phenobarbital:24mg:above(1.333) plan=15 mg 정제 1½정
  notes: admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy
E30
  verdict=none complete=false (dose_noref_trazodone; protocol.trazodone; rx-1:protocol_repeat_none)
  findings: —
  doses: trazodone:140mg:no_reference plan=100 mg 정제 1½정
  notes: dose_noref_trazodone
  rows: rx-1=∅!protocol_repeat_none
E31
  verdict=moderate complete=false (dose_noref_gabapentin; protocol.gabapentin; rx-1:protocol_repeat_none)
  findings: RENAL_ADJUST/moderate[gabapentin]
  doses: gabapentin:100mg:no_reference plan=100 mg 캡슐 1개
  notes: dose_noref_gabapentin, admin_gabapentin_0
  rows: rx-1=∅!protocol_repeat_none
E32
  verdict=none complete=false (dose_noref_meloxicam; protocol.meloxicam; rx-1:protocol_indication)
  findings: —
  doses: meloxicam:2.8mg:no_reference plan=1.5 mg/mL 1.9 mL
  notes: dose_noref_meloxicam, admin_meloxicam_0
  rows: rx-1=∅!protocol_indication
E33
  verdict=none complete=true
  findings: —
  doses: amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정
  notes: —
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
E34
  verdict=none complete=false (rx-1:freq_conflict)
  findings: —
  doses: phenobarbital:15mg:within(0.833) plan=15 mg 정제 1정
  notes: admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy!freq_conflict
E35
  verdict=major complete=false (rx-1:freq_conflict)
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:17.5mg:above(3) plan=22.7 mg 정제 1정
  notes: rounding_enrofloxacin_0, admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat!freq_conflict
E36
  verdict=none complete=false (dose_unit_carprofen)
  findings: —
  doses: carprofen:123.2mg:unit_mismatch plan=100 mg 정제 1정
  notes: rounding_carprofen_0, dose_unit_carprofen, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E36b
  verdict=major complete=true
  findings: DOSE_RANGE/major[carprofen]
  doses: carprofen:123.2mg:above(2) plan=100 mg 정제 1정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain~prn_max_per_day
E37
  verdict=none complete=true
  findings: —
  doses: maropitant:8mg:within plan=16 mg 정제 ½정
  notes: —
  rows: rx-1=maro_dog_vomit
E38
  verdict=minor complete=true
  findings: DOSE_RANGE/minor[carprofen]
  doses: carprofen:112mg:below(0.909) plan=100 mg 정제 1정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E39
  verdict=minor complete=true
  findings: DOSE_RANGE/minor[pimobendan]
  doses: pimobendan:0.64mg:below(0.8) plan=1.25 mg 츄어블 ½개
  notes: —
  rows: rx-1=pimo_dog_chf
E40
  verdict=major complete=false (allergy_text_recognised)
  findings: ALLERGY_CLASS/major[amoxicillin_clavulanate]
  doses: amoxicillin_clavulanate:150mg:within(0.5) plan=250 mg 정제 ½정
  notes: rounding_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
  adapterNotes: allergy_text_recognised
E40b
  verdict=none complete=false (allergy_free_text)
  findings: —
  doses: amoxicillin_clavulanate:150mg:within(0.5) plan=250 mg 정제 ½정
  notes: rounding_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
  adapterNotes: allergy_free_text
E41
  verdict=none complete=false (dx_unmapped:D-NEU-099)
  findings: —
  doses: fluoxetine:16mg:within(1) plan=16 mg 츄어블 1개
  notes: —
  rows: rx-1=flx_dog_sep
E41b
  verdict=contraindicated complete=false (dx_text_recognised:D-NEU-099)
  findings: DRUG_CONDITION/contraindicated[fluoxetine]
  doses: fluoxetine:16mg:within(1) plan=16 mg 츄어블 1개
  notes: —
  rows: rx-1=flx_dog_sep
  adapterNotes: dx_text_recognised:D-NEU-099
E42
  verdict=moderate complete=false (lab_stale_creatinine)
  findings: NSAID_RENAL/moderate[meloxicam]
  doses: meloxicam:0.32mg:within(1) plan=1.5 mg/mL 0.21 mL
  notes: admin_meloxicam_0
  rows: rx-1=melox_dog_oa
  adapterNotes: lab_stale_creatinine
E42b
  verdict=none complete=false (lab_stale_creatinine)
  findings: —
  doses: meloxicam:0.32mg:within(1) plan=1.5 mg/mL 0.21 mL
  notes: admin_meloxicam_0
  rows: rx-1=melox_dog_oa
  adapterNotes: lab_stale_creatinine
E43
  verdict=moderate complete=false (breed_unresolved)
  findings: MDR1_PGP_ML/moderate[ivermectin]
  doses: ivermectin:7.2mg:within(0.5) plan=10 mg/mL 0.72 mL
  notes: —
  rows: rx-1=iver_dog_demodex
  adapterNotes: breed_unresolved
E44
  verdict=minor complete=true
  findings: MDR1_PGP_ML/minor[ivermectin]
  doses: ivermectin:0.272mg:within(0.227) plan=272 mcg 츄어블 1개
  notes: —
  rows: rx-1=iver_dog_hw
E45a
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat
E45b
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:34mg:above(2.72) plan=68 mg 정제 ½정
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat
E46
  verdict=none complete=false (dose_strength_carprofen_0; dose_unit_carprofen)
  findings: —
  doses: carprofen:nullmg:unit_mismatch
  notes: dose_strength_carprofen_0, dose_unit_carprofen, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E47
  verdict=none complete=false (dose_unit_phenobarbital; rx-1:unit_needs_record)
  findings: —
  doses: phenobarbital:nullmg:unit_mismatch
  notes: dose_unit_phenobarbital, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy!unit_needs_record
E48
  verdict=major complete=true
  findings: NSAID_RENAL/major[meloxicam]
  doses: meloxicam:1.23mg:within(1) plan=5 mg/mL 0.25 mL
  notes: admin_meloxicam_0, caution_meloxicam_0
  rows: rx-1=melox_cat_periop
E49
  verdict=none complete=false (age_under_1y)
  findings: —
  doses: enrofloxacin:60mg:within(0.25) plan=68 mg 정제 1정
  notes: rounding_enrofloxacin_0, admin_enrofloxacin_0
  rows: rx-1=enro_dog
  adapterNotes: age_under_1y
E50
  verdict=none complete=false (dose_noref_carprofen; protocol.carprofen; rx-1:route_missing+protocol_route)
  findings: —
  doses: carprofen:123.2mg:no_reference plan=100 mg 정제 1정
  notes: rounding_carprofen_0, dose_noref_carprofen, admin_carprofen_0
  rows: rx-1=∅!route_missing+protocol_route
E51
  verdict=moderate complete=true
  findings: METHIMAZOLE_CKD/moderate[methimazole]
  doses: methimazole:2.5mg:within(1) plan=2.5 mg 정제 1정, amlodipine:0.625mg:within(0.25) plan=2.5 mg 정제 ¼정, maropitant:4.1mg:within(0.345) plan=16 mg 정제 ½정
  notes: rounding_maropitant_2, admin_methimazole_0, admin_amlodipine_0
  rows: rx-1=mmi_cat_start rx-2=amlo_cat_htn rx-3=maro_cat_ckd_po~powder
E52
  supported=false (species_missing)
E53
  verdict=none complete=false (rx-1:freq_conflict)
  findings: —
  doses: phenobarbital:20mg:within(0.833) plan=30 mg 정제 ½정
  notes: rounding_phenobarbital_0, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy!freq_conflict
```

**Card decisions, binding** (`out_rev_cards.txt`, from `cards_rev.mjs`: gate, primary/related rows, offered suggestions, inputHash). The equalities and inequalities of `inputHash` are binding (E08 = E08b's ENRO card = E45a; E45a ≠ E45b; E07 = E07b for NSAID_CORTICOSTEROID; E10 = E40); the numeric values are the reference implementation's and are binding only if WP2 implements the §3.3 object exactly (it MUST).

```
E01 gate=yes(1) MDR1_PGP_ML/contraindicated primary=[rx-1] related=[rx-2] sugg=[delete:ivermectin] hash=1113501192
E02 gate=no CYP_INDUCTION/moderate primary=[rx-1,rx-2] related=[] sugg=[delete:phenobarbital,delete:ciclosporin] hash=1833895896 | IMMUNOSUPPRESSION_ADDITIVE/minor primary=[rx-2,rx-3] related=[] sugg=[delete:ciclosporin,delete:prednisolone] hash=2555986845 | CYP_INDUCTION/minor primary=[rx-1,rx-3] related=[] sugg=[delete:phenobarbital,delete:prednisolone] hash=4034938451
E03 gate=no METHIMAZOLE_CKD/moderate primary=[rx-1] related=[] sugg=[delete:methimazole] hash=4156413528
E04 gate=yes(1) SPECIES_HARDSTOP/contraindicated primary=[rx-1] related=[] sugg=[delete:permethrin] hash=1254720168
E05 gate=no 
E06 gate=no NSAID_RENAL/moderate primary=[rx-1] related=[rx-2,rx-4] sugg=[delete:meloxicam] hash=3737784754
E06b gate=no NSAID_RENAL/moderate primary=[rx-1] related=[rx-2,rx-4] sugg=[delete:meloxicam] hash=4276780090
E07 gate=yes(1) NSAID_CORTICOSTEROID/major primary=[rx-1,rx-2] related=[] sugg=[delete:carprofen,delete:prednisolone] hash=2644650050 | SEROTONERGIC/moderate primary=[rx-3,rx-4] related=[] sugg=[delete:tramadol,delete:trazodone] hash=1003006340
E07b gate=yes(1) NSAID_CORTICOSTEROID/major primary=[rx-1,rx-2] related=[] sugg=[delete:carprofen,delete:prednisolone] hash=2644650050 | SEROTONERGIC/moderate primary=[rx-3,rx-4] related=[] sugg=[delete:tramadol,delete:trazodone] hash=3129004573 | DOSE_RANGE/minor primary=[rx-3] related=[] sugg=[delete:tramadol] hash=82840716
E08 gate=yes(1) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=3480445930
E08b gate=yes(2) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=3480445930 | SPECIES_HARDSTOP/major primary=[rx-2] related=[] sugg=[] hash=2269827218
E09 gate=yes(1) DRUG_CONDITION/contraindicated primary=[rx-1] related=[] sugg=[delete:fluoxetine] hash=2879388551
E10 gate=yes(1) ALLERGY_CLASS/major primary=[rx-1] related=[] sugg=[delete:amoxicillin_clavulanate] hash=1019729993
E11 gate=yes(1) DRUG_CONDITION/contraindicated primary=[rx-1] related=[] sugg=[delete:phenobarbital] hash=951747739
E12 gate=no GASTRIC_PH_AZOLE/moderate primary=[rx-1,rx-2] related=[] sugg=[delete:ketoconazole,delete:omeprazole] hash=4205693331
E13 gate=yes(1) NSAID_DUPLICATE/major primary=[rx-1,rx-2] related=[] sugg=[delete:carprofen,delete:meloxicam] hash=986197227
E14 gate=no 
E15 gate=no 
E16 gate=no 
E17 gate=yes(1) MDR1_PGP_ML/contraindicated primary=[rx-1] related=[rx-2] sugg=[delete:ivermectin] hash=2226859729
E18 unsupported
E19 gate=no 
E20 gate=no 
E21 gate=no 
E22 gate=no 
E23 gate=no 
E24 gate=no 
E25 gate=yes(1) DOSE_RANGE/major primary=[rx-1,rx-2] related=[] sugg=[delete-row:rx-1,delete-row:rx-2] hash=2590710596
E26 gate=no DUPLICATE_INGREDIENT/moderate primary=[tx-1,rx-1] related=[] sugg=[delete-row:rx-1] hash=2821584937
E27 gate=yes(1) NSAID_DUPLICATE/major primary=[tx-1,rx-1] related=[] sugg=[delete:carprofen] hash=1312775726
E28 gate=no METHIMAZOLE_CKD/moderate primary=[rx-1] related=[] sugg=[delete:methimazole] hash=3038530700 | DOSE_RANGE/minor primary=[rx-1] related=[] sugg=[delete:methimazole] hash=603280856
E29 gate=no DOSE_RANGE/minor primary=[rx-1] related=[] sugg=[delete:phenobarbital] hash=888402511
E30 gate=no 
E31 gate=no RENAL_ADJUST/moderate primary=[rx-1] related=[] sugg=[delete:gabapentin] hash=1263472678
E32 gate=no 
E33 gate=no 
E34 gate=no 
E35 gate=yes(1) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=1367876703
E36 gate=no 
E36b gate=yes(1) DOSE_RANGE/major primary=[rx-1] related=[] sugg=[delete:carprofen] hash=4098270830
E37 gate=no 
E38 gate=no DOSE_RANGE/minor primary=[rx-1] related=[] sugg=[delete:carprofen] hash=978836129
E39 gate=no DOSE_RANGE/minor primary=[rx-1] related=[] sugg=[delete:pimobendan] hash=1338643402
E40 gate=yes(1) ALLERGY_CLASS/major primary=[rx-1] related=[] sugg=[delete:amoxicillin_clavulanate] hash=1019729993
E40b gate=no 
E41 gate=no 
E41b gate=yes(1) DRUG_CONDITION/contraindicated primary=[rx-1] related=[] sugg=[delete:fluoxetine] hash=2879388551
E42 gate=no NSAID_RENAL/moderate primary=[rx-1] related=[] sugg=[delete:meloxicam] hash=2946563526
E42b gate=no 
E43 gate=no MDR1_PGP_ML/moderate primary=[rx-1] related=[] sugg=[delete:ivermectin] hash=2984923831
E44 gate=no MDR1_PGP_ML/minor primary=[rx-1] related=[] sugg=[delete:ivermectin] hash=3959588977
E45a gate=yes(1) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=3480445930
E45b gate=yes(1) ENRO_FELINE_RETINA/major primary=[rx-1] related=[] sugg=[delete:enrofloxacin] hash=2790775771
E46 gate=no 
E47 gate=no 
E48 gate=yes(1) NSAID_RENAL/major primary=[rx-1] related=[] sugg=[delete:meloxicam] hash=1231811710
E49 gate=no 
E50 gate=no 
E51 gate=no METHIMAZOLE_CKD/moderate primary=[rx-1] related=[] sugg=[delete:methimazole] hash=4156413528
E52 unsupported
E53 gate=no 
```

**Difference from the revision-1 binding column** (D1/D2-only engine, revision-1 adapter): E05 and E19 ratio `1` → null (D14), and E19 loses its expected rounding note; E18 now carries the reason `species_unsupported`; E23 adds `ceiling_plan_enrofloxacin_0` (D15); E08/E08b mark the meloxicam row `@Tx` (C2). Every other E01–E23 line is unchanged.

**Suggestion checks:** E23 offers none; E01 offers exactly "이버멕틴 삭제" (recommended); E07 offers "카프로펜 삭제" and "프레드니솔론 삭제"; E25 offers both row deletes; E26 and E27 never offer to delete the Tx row (§6.3 table).

### 8.2 Mapping unit tests (`emr/__tests__/adapter.test.js`)

**Units:** `EA` + tablet → `tablet`; + chewable → `chewable`; + capsule → `capsule`; + spot-on → `pipette`; + solution/injection/suspension → `unit_count_liquid`; `정`, `캡슐`, `T`, `tab`, `개` like `EA`; `ml/kg` → `mL/kg`; `cc` → `mL`; `ug/kg`, `µg/kg` → `mcg/kg`; `IU/kg` passes; `포`, `앰플`, `바이알`, `gtt`, `방울` → `unit_needs_record`, `dose: null`; `xyz` → `unit_unknown`, never mg.

**Split:** amlodipine 2.5 mg ¼ ok; ketoconazole 200 mg ½ ok; ketoconazole ¼ `split_not_allowed`; robenacoxib ½ `split_not_allowed`; ciclosporin capsule ½ `split_not_allowed`; fluoxetine chewable 1 ok; any of these with `dispense: '가루'` → no split check.

**Frequency:**

| Input | Result |
|---|---|
| Tt1 Dy7 | q24h |
| Tt2 / Tt3 / Tt4 / Tt6 | q12h / q8h / q6h / q4h |
| Tt1 Dy1 | once (single administration) |
| Tt2 Dy1 | q12h |
| Tt "1.0" Dy7 | q24h |
| Tt5 | null + `freq_unmapped` |
| Tt blank, no 용법 | null + `freq_missing` |
| 용법 "격일" + Tt1 | q48h (compatible) |
| 용법 "격일" + Tt2 | q12h + `freq_conflict` |
| 용법 "월1회" + Tt1 | monthly |
| 용법 "bid" + Tt2 | q12h (compatible) |
| 용법 "1일 1회" + Tt2 | q12h + `freq_conflict` |
| 용법 "sid" + Tt3 | q8h + `freq_conflict` |
| 용법 "필요시", Tt blank | prn |
| 용법 "필요시" + Tt2 | q12h + note `prn_max_per_day` |
| 용법 "아무거나" + Tt2 | q12h (unrecognised 용법 ignored) |
| 용법 "bid", Tt blank | q12h |

**Route:** `po` → PO; `Top` + permethrin → spot-on; `Top` + other → topical; `Eye` → `route_no_reference`; blank → `route_missing`.

**Protocol policy:**

| Case | Result |
|---|---|
| ivermectin dog PO q24h | `iver_dog_demodex` |
| ivermectin dog PO 용법 "월1회" | `iver_dog_hw` |
| ivermectin chewable (RX-IVM-CH272) Tt1 Dy1, no diagnosis | `iver_dog_hw` (product default) |
| maropitant dog PO, no diagnosis | `protocol_indication` [maro_dog_vomit, maro_dog_motion] |
| maropitant dog PO with D-GI-001 | `maro_dog_vomit` |
| maropitant dog SC | `maro_dog_inj` |
| meloxicam dog PO Tt1 Dy1 | `protocol_indication` [melox_dog_oa, melox_dog_load] |
| meloxicam dog PO 용법 "1회" | `melox_dog_load` (explicit single dose) |
| meloxicam dog PO Tt1 Dy14 | `melox_dog_oa` |
| meloxicam cat SC Tt1 Dy3 | `melox_cat_periop` (label_single_only kept; engine repeat check fires) |
| trazodone dog PO Tt2 Dy14 | `protocol_repeat_none` |
| amoxicillin-clavulanate dog | `ac_dog_eu` + "EU/UK 라벨 기준(자동)" |
| pimobendan dog with D-CAR-005 / without | `pimo_dog_chf` / `protocol_indication` |
| permethrin cat | `protocol_none` |
| a `protocol-choice` extension | overrides all of these |

**Patient and visit fields:**

| Case | Result |
|---|---|
| `Spayed Female` / `Unknown` | female, true / null, null |
| breed "ROUGH COLLIE/러프 콜리" | `collie` |
| breed "KOREAN SHORTHAIR/코리안숏헤어" (cat) | `domestic_shorthair` |
| breed "XYZ/모름" (dog) | note `breed_unresolved`; incomplete only with a macrocyclic lactone |
| creatinine 176.8 µmol/L | 2.0 mg/dL |
| creatinine 2.1 mg/dL dated 124 days earlier (dog) | used (≥ 1.4) + `lab_stale_creatinine` |
| creatinine 1.0 mg/dL dated 124 days earlier | not used + `lab_stale_creatinine` |
| two creatinine values | the most recent only |
| weight measured 31 days earlier / 15 days earlier at 4 months of age | `weight_stale` / `weight_stale` |
| birth date 4 months before the visit | `age_under_1y` |
| allergy `{ text: '페니실린 알레르기' }` / `'Clavamox'` (a drug alias) / `'아목시실린'` (not an exact key) / `'닭고기'` | penicillin + `allergy_text_recognised` / penicillin + `allergy_text_recognised` / `allergy_free_text` / `allergy_free_text` |
| diagnosis `{ code:'D-NEU-099', display:'뇌전증' }` / without display | epilepsy + `dx_text_recognised:D-NEU-099` / `dx_unmapped:D-NEU-099` |
| species `Rabbit` / blank | `species_unsupported` / `species_missing`; `analyze` not called (spy) |
| a Tx row with RX-MLX-INJ5 / a Tx row with `PR-XRAY-2` | sent with `inClinic: true` / skipped, not unmapped |

**계산량:** furosemide 2 mg/kg × 3.66 kg with EMR 7.32 mg → no note; EMR 7.0 mg → `calc_mismatch`; amlodipine-like 0.1 mg/kg × 4.1 kg (0.41 mg) with EMR 0.4 mg → no note (absolute tolerance 0.05 mg); the EMR value is never used as the dose.

**Incomplete-verdict precedence:** a result with `level: 'none'` and any confirm reason, visit reason, validation note or unmapped row renders "검토 불완전" and never `CircleCheck` (component test).

**Comment check:** the §3.9 table, exactly.

**Card building:**
- every `summary` ≤ 140 characters, for all 61 scenarios in both locales; every card has `source.label === 'NuvoVet DUR'` and `topic.code`; `blocking` matches §3.6;
- primary/related rows as in the card-decisions block; uuids stable when re-running the same visit and different when an involved row's dose, frequency or the patient weight changes (E45a vs E45b);
- `doseChecks` for V1 = 1 (ketoconazole rounding), V5 = 0, E51 = 0;
- suggestion `actions[].resourceId` is a string and `description` names the product;
- the coverage strip for E40 lists allergy as partial, for E07 kidney as partial ("크레아티닌 없음"), for E49 age as "연령 (1세 미만)".

**Engine-side copy:** `verdict.action` for every level contains no "—" and no "안전" (D17).

### 8.3 Widget isolation tests (`frontend/scripts/qa/widget.cjs`, Playwright, Chromium)

Run against `dist-widget` on `widget-demo/hostile.html`, `widget-demo/csp.html` and `/dur#/emr/V1`:

1. **Containment.** Every widget element is inside the shadow root of `<nuvovet-dur-overlay>`, the panel host or a `span[data-nv-slot]`. `document.body` gains exactly one child (the overlay host). No `<td>` has a shadow root.
2. **Slots.** Re-rendering the host grid (delete a row, add a row) leaves exactly one badge per row; a detached slot causes no error.
3. **Sizing** from rendered output: panel header 40 px; card summary 13 px; gate buttons 32 px; equal (±0.5 px) to the same measures on `widget-demo/index.html` despite `html{font-size:62.5%}`.
4. **Tokens.** The 금기 badge background is `rgb(200, 36, 27)` and its text `rgb(255, 255, 255)` despite `* { --primary: lime !important }`; no widget element computes `color: rgb(255, 0, 0)`.
5. **Fonts.** The summary's computed `font-family` starts with `"NuvoVet Pretendard"`; `document.fonts` contains a loaded `NuvoVet Pretendard` face; the host's fake "Pretendard Variable" is unused. On `csp.html` the face also loads and no CSP violation is reported (`securitypolicyviolation` listener).
6. **Top layer.** With the gate open, `dialog.matches(':modal')` is true; `elementFromPoint` at the host's sticky header returns the overlay host; the dialog is visible and opaque despite `[role=alertdialog]{display:none}` and `[data-state=open]{opacity:.2}`; the host's input cannot be focused.
7. **Focus.** On gate open the overlay shadow root's `activeElement` is "처방으로 돌아가기". Tab ×20 never leaves the dialog; Shift+Tab wraps; typing "케토코나졸 감량 병용, 2주 후 재검" fills the textarea. Esc closes the dialog, `gate()` resolves `proceed:false`, focus returns to the host save button, and the docked panel and drawer are still open (Esc did not propagate).
8. **Enter safety.** Enter with a reason chosen and a valid comment does not override.
9. **Responsive.** Resizing below 1280 unmounts the host's right column: the widget keeps working (launcher appears), with no console error, and the React root is still mounted in the overlay host.
10. **Network.** Only `file:`, `data:` or the dev-server origin requests.
11. **Console.** Zero errors and warnings.
12. **CSS lint.** No `rem`, `@property`, `@import url(` or `!important` in the inlined widget CSS (the `:host` rule needs none).
13. **Size.** IIFE ≤ 250 kB gzip.

### 8.4 UX and accessibility tests (`frontend/scripts/qa/emr.cjs`, on `/dur#/emr/*` and the standalone file)

- **Timing.** Editing a Qty updates the row badge within 500 ms; no `dialog[open]` ever appears while typing (type the full V7 prescription from empty).
- **Gate per visit.** 처방 저장 opens the gate for V1, V4, V7, V8, V9, V10 only; V2, V3, V5, V6 save directly with the toast.
- **Override requirements.** V1: "예외 처리하고 저장" stays disabled until a reason, a valid comment and the 보호자 checkbox are set. V7: a reason alone enables it (the 보호자 checkbox is shown and optional). NV-OTH also requires a valid comment. V4 (species hard stop) offers only NV-DATA and NV-OTH.
- **Dedupe.** After overriding V7 and saving, saving again opens no gate. Changing prednisolone to 1 mg/kg (or the weight to 26 kg) and saving opens it again.
- **Live re-check.** In V8, changing the meloxicam Tx row's Dy 1 → 3 adds the 중대 badge on that row and a second card with no delete suggestion.
- **Related badges.** V1 ketoconazole row and V6 furosemide/benazepril rows show the outline "관련" badge.
- **Powder.** In V3, switching maropitant's 조제 to 가루 removes the "≈" marker and the rounding note, and the coverage strip adds "분쇄 가능 여부".
- **Unmapped and incomplete states.** V5 with weight cleared shows "검토 불완전" and no check icon; adding "RX-XYZ-999" via a test hook shows "검토 안 함"; typing "페니실린 알레르기" as a free-text allergy on V10's patient (after deleting the code) still shows the ALLERGY_CLASS card and a "자유 입력에서 인식: 확인" chip.
- **NV-DATA** on V1 emits `fix-chart`, focuses the host's 특이사항 field and adds no log entry.
- **Suggestion.** Accepting "이버멕틴 삭제" on V1 removes the row, the re-check clears the card, and the log has one `accepted` entry.
- **Log.** "기록 내보내기" downloads JSON `{ "feedback": [ … ] }` matching §3.10. With `localStorage` throwing (stubbed), the demo still works.
- **Markers.** "가상 EMR" (host watermark) and "교육용 프로토타입" (demo bar) are visible at all three viewports; the watermark appears in `page.pdf()` output; the widget footer marker is absent in the demo and present on `widget-demo/index.html`.
- **Language.** With `ko`, no ASCII word of 4+ letters in widget text except drug codes, rule IDs, units, "DUR", "nuvovet", "NuvoVet", "MDR1", "ABCB1", "P-gp", "CYP3A" and DOIs. With `?lang=en`, no Hangul in widget chrome (patient and drug names excepted). No "—" in any widget or host string.
- **Accessibility.** Panel `role=region` with a name; disclosures `aria-expanded`; gate `role=alertdialog` on a modal `<dialog>`; badges are buttons with descriptive `aria-label`s; the live region changes only when counts change; every widget text node ≥ 4.5:1 in light and dark widget themes.
- **Screenshots** per DESIGN_SYSTEM §9.2: V1 panel, V1 gate, V5, V7 gate, V8b at 1440/1024/390; dark site theme keeps the EMR light; one shot with the widget dark. The reviewer agent (DESIGN_SYSTEM §9.8) checks them against the §5.6 reference.

---

## 9. Before showing externally

- **Vet review.** A veterinarian reviews V1–V10, E24–E53, the card copy, the override list and the coverage strip (`cases.js` already notes that case copy needs this). Specifically: whether NSAID + CKD + heart failure/diuretic should be 중대 (D16; needs the full label text), the D9 rule (summed vs duplicate, single-administration = 주의), and the D10 titration wording.
- **Check against the founder's real EMR screenshots:** the meaning of Tt and Dy; whether a 용법 field exists and how it is combined with Tt; how 가루약 / 포 are recorded; whether 전체 is in mg; whether in-clinic injections appear as Tx rows; eVET status display. If they differ, update the §4.2 tables and the affected fixtures, and re-run §8.1.
- **Remove the unverified sentence** "국내 동물병원 EMR에는 처방 안전 검토 기능이 없습니다" (DESIGN_SYSTEM §5.5).
- **Never present this as a feature of a real EMR,** and never use a real vendor's name or screenshots.

---

## Appendix A: product map and condition map

### A.1 `productMap.js`

Codes are fictional; strengths are the engine's clean-room `strengths`. `defaultProtocolId` is set only where the product is labelled for one indication.

| Code | Display (KO) | drugId | strengthId | defaultProtocolId |
|---|---|---|---|---|
| RX-IVM-SOL10 | 이버멕틴 경구액 10 mg/mL | ivermectin | iver_sol_10 | — |
| RX-IVM-CH68 | 이버멕틴 츄어블 68 mcg | ivermectin | iver_chew_68 | iver_dog_hw |
| RX-IVM-CH136 | 이버멕틴 츄어블 136 mcg | ivermectin | iver_chew_136 | iver_dog_hw |
| RX-IVM-CH272 | 이버멕틴 츄어블 272 mcg | ivermectin | iver_chew_272 | iver_dog_hw |
| RX-KTZ-T200 | 케토코나졸 정 200 mg | ketoconazole | keto_tab_200 | — |
| RX-CSA-C10 | 사이클로스포린 캡슐 10 mg | ciclosporin | csa_cap_10 | — |
| RX-CSA-C25 | 사이클로스포린 캡슐 25 mg | ciclosporin | csa_cap_25 | — |
| RX-CSA-C50 | 사이클로스포린 캡슐 50 mg | ciclosporin | csa_cap_50 | — |
| RX-PB-T15 | 페노바르비탈 정 15 mg | phenobarbital | pb_tab_15 | — |
| RX-PB-T30 | 페노바르비탈 정 30 mg | phenobarbital | pb_tab_30 | — |
| RX-PRED-T5 | 프레드니솔론 정 5 mg | prednisolone | pred_tab_5 | — |
| RX-MMI-T25 | 메티마졸 정 2.5 mg | methimazole | mmi_tab_2_5 | — |
| RX-AML-T25 | 암로디핀 정 2.5 mg | amlodipine | amlo_tab_2_5 | — |
| RX-MRP-T16 | 마로피탄트 정 16 mg | maropitant | maro_tab_16 | — |
| RX-MRP-T24 | 마로피탄트 정 24 mg | maropitant | maro_tab_24 | — |
| RX-MRP-T60 | 마로피탄트 정 60 mg | maropitant | maro_tab_60 | — |
| RX-MRP-INJ10 | 마로피탄트 주사액 10 mg/mL | maropitant | maro_inj_10 | — |
| RX-AMC-T375 | 아목시실린·클라불란산 정 375 mg | amoxicillin_clavulanate | ac_tab_375 | — |
| RX-AMC-T250 | 아목시실린·클라불란산 정 250 mg | amoxicillin_clavulanate | ac_tab_250 | — |
| RX-MLX-SUS15 | 멜록시캄 현탁액 1.5 mg/mL | meloxicam | melox_susp_1_5 | — |
| RX-MLX-INJ5 | 멜록시캄 주사액 5 mg/mL | meloxicam | melox_inj_5 | — |
| RX-CRP-T25 | 카프로펜 정 25 mg | carprofen | carp_tab_25 | — |
| RX-CRP-T100 | 카프로펜 정 100 mg | carprofen | carp_tab_100 | — |
| RX-ROB-T20 | 로베나콕시브 정 20 mg | robenacoxib | robe_tab_20 | — |
| RX-GBP-C100 | 가바펜틴 캡슐 100 mg | gabapentin | gaba_cap_100 | — |
| RX-TRM-T50 | 트라마돌 정 50 mg | tramadol | tram_tab_50 | — |
| RX-TRZ-T100 | 트라조돈 정 100 mg | trazodone | traz_tab_100 | — |
| RX-FLX-CH16 | 플루옥세틴 츄어블 16 mg | fluoxetine | flx_chew_16 | — |
| RX-OMP-C10 | 오메프라졸 캡슐 10 mg | omeprazole | ome_cap_10 | — |
| RX-FAM-T10 | 파모티딘 정 10 mg | famotidine | famo_tab_10 | — |
| RX-ENR-T227 | 엔로플록사신 정 22.7 mg | enrofloxacin | enro_tab_22_7 | — |
| RX-ENR-T68 | 엔로플록사신 정 68 mg | enrofloxacin | enro_tab_68 | — |
| RX-MTZ-T250 | 메트로니다졸 정 250 mg | metronidazole | metro_tab_250 | — |
| RX-FUR-T125 | 푸로세미드 정 12.5 mg | furosemide | furo_tab_12_5 | — |
| RX-PIM-CH125 | 피모벤단 츄어블 1.25 mg | pimobendan | pimo_chew_1_25 | — |
| RX-BNZ-T5 | 베나제프릴 정 5 mg | benazepril | bena_tab_5 | — |
| RX-PERM-SPOT | 퍼메트린 스팟온 (개 전용) | permethrin | perm_spot | — |
| RX-APAP-T500 | 아세트아미노펜 정 500 mg | acetaminophen | apap_tab_500 | — |

A test asserts every `strengthId` exists in `DRUG_BY_ID[drugId].strengths` and every `defaultProtocolId` in `protocolsFor(drugId, …)`.

### A.2 `conditionMap.js`

Fictional codes:
```
D-DERM-012 demodicosis · D-EAR-004 malassezia_otitis · D-NEU-001 epilepsy · D-DERM-001 atopic_dermatitis · D-END-003 hyperthyroidism
D-URO-010 ckd · D-DERM-020 skin_infection · D-GI-001 vomiting_diarrhoea · D-MSK-002 osteoarthritis · D-CAR-005 mmvd_chf
D-BEH-001 anxiety · D-URO-002 uti · D-HEP-001 hepatopathy · D-GI-007 gi_ulcer_history · D-CAR-009 hypertension
```
Korean display names are `CONDITION_BY_ID[id].label.ko`, prefixed with the code ("D-URO-010 만성 신장병(CKD)").

```
PROTOCOL_CONDITIONS = { iver_dog_demodex:[demodicosis], iver_dog_hw:[], maro_dog_vomit:[vomiting_diarrhoea], maro_dog_motion:[],
                        pimo_dog_chf:[mmvd_chf], pimo_dog_b2:[] }
SAME_INDICATION = [{ ids:[ac_dog_eu, ac_dog_us], primary: ac_dog_eu, label: 'EU/UK 라벨 기준(자동)' }]
```
Indication linking for protocol choice only, not a clinical fact; extend it only with a source-backed indication match.

---

## Appendix B: fixtures (`fixtures.js`)

Verbatim from the executed runner (`/tmp/claude-0/uiresearch/spec-rev/fixtures.mjs` and `new.mjs`). `rx(rowId, productCode, unit, qty, tt, dy, rt='PO', extra)`; `extra` may carry `sig` (용법), `calc` (계산량), `dispense` (조제); `kind: 'Tx'` marks an in-clinic row; visit date `2026-10-03`.

```js
// Appendix B fixtures, retyped from the spec text (not copied from the spec's runner).
export const D = '2026-10-03'
export const rx = (rowId, productCode, unit, qty, tt, dy, rt = 'PO', extra = {}) => ({ kind: 'Rx', rowId, productCode, unit, qty, tt, dy, rt, ...extra })
const pt = (o) => ({ mdr1: 'unknown', allergies: [], labs: [], ...o })
export const P = {
CHOCO: pt({ id:'1042', name:'초코', species:'Canine', breed:'ROUGH COLLIE/러프 콜리', sex:'Neutered Male', birthDate:'2022-05-14', weight:{ kg:24.0, measuredAt:D } }),
KONGYI: pt({ id:'0877', name:'콩이', species:'Canine', breed:'SHIH TZU/시츄', sex:'Neutered Male', birthDate:'2020-03-02', weight:{ kg:6.0, measuredAt:D } }),
NABI: pt({ id:'1310', name:'나비', species:'Feline', breed:'KOREAN SHORTHAIR/코리안숏헤어', sex:'Spayed Female', birthDate:'2013-06-20', weight:{ kg:4.1, measuredAt:D }, labs:[{ code:'creatinine', value:2.0, unit:'mg/dL', date:'2026-10-01' }] }),
MOCHI: pt({ id:'1455', name:'모찌', species:'Feline', breed:'KOREAN SHORTHAIR/코리안숏헤어', sex:'Spayed Female', birthDate:'2024-04-11', weight:{ kg:3.8, measuredAt:D } }),
DAEBAK: pt({ id:'0921', name:'대박', species:'Canine', breed:'LABRADOR RETRIEVER/래브라도 리트리버', sex:'Spayed Female', birthDate:'2023-01-30', weight:{ kg:30.0, measuredAt:D } }),
BORI: pt({ id:'1502', name:'보리', species:'Canine', breed:'MALTESE/말티즈', sex:'Spayed Female', birthDate:'2014-08-08', weight:{ kg:3.2, measuredAt:D }, labs:[{ code:'creatinine', value:2.1, unit:'mg/dL', date:'2026-09-29' }] }),
HAPPY: pt({ id:'0650', name:'해피', species:'Canine', breed:'GOLDEN RETRIEVER/골든 리트리버', sex:'Neutered Male', birthDate:'2019-02-17', weight:{ kg:28.0, measuredAt:D } }),
LEO: pt({ id:'1388', name:'레오', species:'Feline', breed:'RUSSIAN BLUE/러시안 블루', sex:'Neutered Male', birthDate:'2017-07-01', weight:{ kg:3.5, measuredAt:D } }),
DUBU: pt({ id:'1620', name:'두부', species:'Canine', breed:'POODLE/푸들', sex:'Neutered Male', birthDate:'2021-11-03', weight:{ kg:8.0, measuredAt:D } }),
COCO: pt({ id:'1733', name:'코코', species:'Canine', breed:'BEAGLE/비글', sex:'Intact Female', birthDate:'2022-09-09', weight:{ kg:12.0, measuredAt:D }, allergies:[{ code:'penicillin' }] }),
TOFU: pt({ id:'1801', name:'토끼', species:'Rabbit', breed:'HOLLAND LOP/홀랜드 롭', sex:'Unknown', birthDate:'2024-01-01', weight:{ kg:1.8, measuredAt:D } }),
}
const v = (patient, dx, rows) => ({ date: D, patient, diagnoses: dx.map((code) => ({ code })), rows })
const W = (p, kg, measuredAt = D) => ({ ...p, weight: kg == null ? null : { kg, measuredAt } })
const { CHOCO, KONGYI, NABI, MOCHI, DAEBAK, BORI, HAPPY, LEO, DUBU, COCO, TOFU } = P
const V6rows = (r1) => [r1, rx('rx-2','RX-FUR-T125','mg/kg',2,2,14), rx('rx-3','RX-PIM-CH125','mg/kg',0.25,2,14), rx('rx-4','RX-BNZ-T5','mg/kg',0.5,1,14)]
const V7rows = (tt) => [rx('rx-1','RX-CRP-T100','mg/kg',4.4,1,7), rx('rx-2','RX-PRED-T5','mg/kg',0.5,1,7), rx('rx-3','RX-TRM-T50','mg/kg',5,tt,5), rx('rx-4','RX-TRZ-T100','mg/kg',10,1,1)]
export const SPEC = {
E01: v(CHOCO,['D-DERM-012','D-EAR-004'],[rx('rx-1','RX-IVM-SOL10','mcg/kg',300,1,7,'PO',{calc:{value:7.2,unit:'mg'}}), rx('rx-2','RX-KTZ-T200','mg/kg',5,2,21,'PO',{calc:{value:120,unit:'mg'}})]),
E02: v(KONGYI,['D-NEU-001','D-DERM-001'],[rx('rx-1','RX-PB-T15','mg/kg',2.5,2,30), rx('rx-2','RX-CSA-C10','mg/kg',5,1,30), rx('rx-3','RX-PRED-T5','mg/kg',0.5,1,14)]),
E03: v(NABI,['D-END-003','D-URO-010'],[rx('rx-1','RX-MMI-T25','mg',2.5,2,30), rx('rx-2','RX-AML-T25','EA',0.25,1,30), rx('rx-3','RX-MRP-T16','mg/kg',1,1,14)]),
E04: v(MOCHI,[],[rx('rx-1','RX-PERM-SPOT','EA',1,1,1,'Top')]),
E05: v(DAEBAK,['D-DERM-020','D-GI-001'],[rx('rx-1','RX-AMC-T375','mg/kg',12.5,2,7), rx('rx-2','RX-MRP-T60','mg/kg',2,1,2)]),
E06: v(BORI,['D-URO-010','D-MSK-002','D-CAR-005'],V6rows(rx('rx-1','RX-MLX-SUS15','mg/kg',0.1,1,14))),
E06b: v(BORI,['D-URO-010','D-MSK-002','D-CAR-005'],V6rows(rx('rx-1','RX-MLX-SUS15','mL',0.21,1,14))),
E07: v(HAPPY,['D-MSK-002','D-DERM-001','D-BEH-001'],V7rows(4)),
E07b: v(HAPPY,['D-MSK-002','D-DERM-001','D-BEH-001'],V7rows(3)),
E08: v(LEO,['D-URO-002'],[rx('rx-1','RX-ENR-T68','EA',0.5,1,10), { ...rx('rx-2','RX-MLX-INJ5','mg/kg',0.3,1,1,'SC'), kind:'Tx' }]),
E08b: v(LEO,['D-URO-002'],[rx('rx-1','RX-ENR-T68','EA',0.5,1,10), { ...rx('rx-2','RX-MLX-INJ5','mg/kg',0.3,1,3,'SC'), kind:'Tx' }]),
E09: v(DUBU,['D-NEU-001','D-BEH-001'],[rx('rx-1','RX-FLX-CH16','EA',1,1,30), rx('rx-2','RX-PB-T30','mg/kg',2.5,2,30)]),
E10: v(COCO,['D-DERM-020'],[rx('rx-1','RX-AMC-T250','mg/kg',12.5,2,7)]),
E11: v(DUBU,['D-HEP-001','D-NEU-001'],[rx('rx-1','RX-PB-T30','mg/kg',2.5,2,30)]),
E12: v(DAEBAK,['D-EAR-004'],[rx('rx-1','RX-KTZ-T200','mg/kg',10,1,21), rx('rx-2','RX-OMP-C10','mg/kg',1,2,14)]),
E13: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-CRP-T100','mg/kg',4.4,1,7), rx('rx-2','RX-MLX-SUS15','mg/kg',0.1,1,7)]),
E14: v(W(HAPPY,null),['D-MSK-002'],[rx('rx-1','RX-CRP-T100','mg/kg',4.4,1,7)]),
E15: v(DAEBAK,[],[rx('rx-1','RX-MRP-T60','mg/kg',2,1,2)]),
E16: v(DAEBAK,['D-DERM-020'],[rx('rx-1','RX-AMC-T375','mg/kg',12.5,'',7), rx('rx-2','RX-XYZ-999','mg/kg',1,1,7)]),
E17: v(CHOCO,['D-DERM-012'],[rx('rx-1','RX-IVM-SOL10','포',1,1,7), rx('rx-2','RX-KTZ-T200','mg/kg',5,2,21)]),
E18: v(TOFU,[],[rx('rx-1','RX-MTZ-T250','mg/kg',10,2,7)]),
E19: v(W(DAEBAK,3.8),['D-GI-001'],[rx('rx-1','RX-MRP-T16','EA',0.5,1,2)]),
E20: v(W(HAPPY,11),['D-MSK-002'],[rx('rx-1','RX-CRP-T25','EA',2,1,7)]),
E21: v(W(HAPPY,5),['D-MSK-002'],[rx('rx-1','RX-ROB-T20','EA',0.5,1,3)]),
E22: v(W(KONGYI,6.0,'2026-08-19'),['D-NEU-001'],[rx('rx-1','RX-PB-T15','mg/kg',2.5,2,30,'PO',{calc:{value:14,unit:'mg'}})]),
E23: v(LEO,['D-URO-002'],[rx('rx-1','RX-ENR-T227','mg/kg',5,1,10)]),
}
export { v, W }
```

```js
import { P, rx, v, W, D } from './fixtures.mjs'
const { CHOCO, KONGYI, NABI, DAEBAK, BORI, HAPPY, LEO, DUBU, COCO } = P
const tx = (...a) => ({ ...rx(...a), kind: 'Tx' })
export const NEW = {
  E24: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-CRP-T100','EA',1,1,7), rx('rx-2','RX-CRP-T25','EA',1,1,7)]),
  E25: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-CRP-T100','mg/kg',4.4,1,7), rx('rx-2','RX-CRP-T25','mg/kg',4.4,1,7)]),
  E26: v(HAPPY,['D-MSK-002'],[tx('tx-1','RX-MLX-INJ5','mg/kg',0.2,1,1,'SC'), rx('rx-1','RX-MLX-SUS15','mg/kg',0.1,1,14)]),
  E27: v(HAPPY,['D-MSK-002'],[tx('tx-1','RX-MLX-INJ5','mg/kg',0.2,1,1,'SC'), tx('tx-2','PR-XRAY-2','EA',1,1,1,''), rx('rx-1','RX-CRP-T100','mg/kg',4.4,1,7)]),
  E28: v(NABI,['D-END-003'],[rx('rx-1','RX-MMI-T25','EA',2,2,30)]),
  E29: v(KONGYI,['D-NEU-001'],[rx('rx-1','RX-PB-T15','mg/kg',4,2,30)]),
  E30: v(HAPPY,['D-BEH-001'],[rx('rx-1','RX-TRZ-T100','mg/kg',5,2,14)]),
  E31: v(NABI,[],[rx('rx-1','RX-GBP-C100','EA',1,2,30)]),
  E32: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-MLX-SUS15','mg/kg',0.1,1,1)]),
  E33: v(DAEBAK,['D-DERM-020'],[rx('rx-1','RX-AMC-T375','mg/kg',12.5,1,1)]),
  E34: v(KONGYI,['D-NEU-001'],[rx('rx-1','RX-PB-T15','mg/kg',2.5,2,30,'PO',{ sig:'1일 1회' })]),
  E35: v(LEO,['D-URO-002'],[rx('rx-1','RX-ENR-T227','mg/kg',5,3,10,'PO',{ sig:'sid' })]),
  E36: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-CRP-T100','mg/kg',4.4,'',7,'PO',{ sig:'필요시' })]),
  E36b: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-CRP-T100','mg/kg',4.4,2,7,'PO',{ sig:'필요시' })]),
  E37: v(W(DAEBAK,3.0),['D-GI-001'],[rx('rx-1','RX-MRP-T16','EA',0.5,1,2)]),
  E38: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-CRP-T100','mg/kg',4,1,7)]),
  E39: v(BORI,['D-CAR-005'],[rx('rx-1','RX-PIM-CH125','mg/kg',0.2,2,30)]),
  E40: v({ ...COCO, allergies:[{ text:'페니실린 알레르기' }] },['D-DERM-020'],[rx('rx-1','RX-AMC-T250','mg/kg',12.5,2,7)]),
  E40b: v({ ...COCO, allergies:[{ text:'닭고기' }] },['D-DERM-020'],[rx('rx-1','RX-AMC-T250','mg/kg',12.5,2,7)]),
  E41: v(DUBU,['D-NEU-099'],[rx('rx-1','RX-FLX-CH16','EA',1,1,30)]),
  E41b: { ...v(DUBU,[],[rx('rx-1','RX-FLX-CH16','EA',1,1,30)]), diagnoses:[{ code:'D-NEU-099', display:'뇌전증' }] },
  E42: v({ ...BORI, labs:[{ code:'creatinine', value:2.1, unit:'mg/dL', date:'2026-06-01' }] },['D-MSK-002'],[rx('rx-1','RX-MLX-SUS15','mg/kg',0.1,1,14)]),
  E42b: v({ ...BORI, labs:[{ code:'creatinine', value:1.0, unit:'mg/dL', date:'2026-06-01' }] },['D-MSK-002'],[rx('rx-1','RX-MLX-SUS15','mg/kg',0.1,1,14)]),
  E43: v({ ...CHOCO, breed:'XYZ/모름' },['D-DERM-012'],[rx('rx-1','RX-IVM-SOL10','mcg/kg',300,1,7)]),
  E44: v(CHOCO,[],[rx('rx-1','RX-IVM-CH272','EA',1,1,1)]),
  E45a: v(LEO,['D-URO-002'],[rx('rx-1','RX-ENR-T68','EA',0.5,1,10)]),
  E45b: v(W(LEO,2.5),['D-URO-002'],[rx('rx-1','RX-ENR-T68','EA',0.5,1,10)]),
  E46: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-CRP-T100','mL/kg',1,1,7)]),
  E47: v(KONGYI,['D-NEU-001'],[rx('rx-1','RX-PB-T15','포',1,2,30)]),
  E48: v(NABI,['D-URO-010'],[rx('rx-1','RX-MLX-INJ5','mg/kg',0.3,1,1,'SC')]),
  E49: v({ ...DAEBAK, birthDate:'2026-06-01', weight:{ kg:12, measuredAt:D } },['D-URO-002'],[rx('rx-1','RX-ENR-T68','mg/kg',5,1,10)]),
  E50: v(HAPPY,['D-MSK-002'],[rx('rx-1','RX-CRP-T100','mg/kg',4.4,1,7,'')]),
  E51: v(NABI,['D-END-003','D-URO-010'],[rx('rx-1','RX-MMI-T25','mg',2.5,2,30), rx('rx-2','RX-AML-T25','EA',0.25,1,30), rx('rx-3','RX-MRP-T16','mg/kg',1,1,14,'PO',{ dispense:'가루' })]),
  E52: v({ ...P.TOFU, species:'' },[],[rx('rx-1','RX-MTZ-T250','mg/kg',10,2,7)]),
  E53: v(DUBU,['D-NEU-001'],[rx('rx-1','RX-PB-T30','mg/kg',2.5,2,30,'PO',{ sig:'격일' })]),
}
```

**Display data for the host** (not engine inputs; choose freely, labelled "가상"): masked guardian names (이○○, 박○○ …), fictional unit prices (500–3,000원 per 정/mL), 폴더명.

---

## Appendix C: reference adapter (revision 2, executed for §8)

`src/portfolio/emr/adapter.js` MUST behave exactly like this. Port it with imports from the engine and knowledge modules (`analyze`, `normalizeFrequency`, `getDrug`, `getStrength`, `protocolsFor`, `resolveBreed`, `splitStep`, `CONDITION_BY_ID`, `ALLERGY_BY_ID`, `DRUGS`, `CREATININE_UPPER`); `PRODUCT_MAP`, `CONDITION_MAP`, `PROTOCOL_CONDITIONS` and `SAME_INDICATION` move to `productMap.js` / `conditionMap.js`. `check()` returns the incomplete reasons in the order validation notes, missing factors, row confirm reasons, unmapped products, visit reasons.

```js
const TT_TO_FREQ = { 1: 'q24h', 2: 'q12h', 3: 'q8h', 4: 'q6h', 6: 'q4h' }
const PER_DAY = { q4h: 6, q6h: 4, q8h: 3, q12h: 2, q24h: 1 }            // schedules given every day
const LESS_THAN_DAILY = ['q48h', 'q72h', 'weekly', 'q14d', 'monthly', 'once']
const PASS_UNITS = { 'mg/kg':'mg/kg','mcg/kg':'mcg/kg','ug/kg':'mcg/kg','µg/kg':'mcg/kg','iu/kg':'IU/kg','ml/kg':'mL/kg','cc/kg':'mL/kg',
  mg:'mg', mcg:'mcg', ug:'mcg', 'µg':'mcg', ml:'mL', cc:'mL', g:'g', iu:'IU' }
const COUNT_UNITS = ['ea','t','tab','정','캡슐','cap','개']
const CONFIRM_UNITS = ['포','앰플','amp','바이알','vial','gtt','방울']
const FORM_TO_COUNT = { tablet:'tablet', chewable:'chewable', capsule:'capsule', 'spot-on':'pipette' }
const ROUTES = { PO:'PO', IV:'IV', SC:'SC', IM:'IM' }
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
const freqList = (p) => (Array.isArray(p.frequency) ? p.frequency : [p.frequency])
const perDayOf = (id) => (id === 'once' ? 1 : PER_DAY[id] ?? (id === 'q48h' ? 0.5 : id === 'q72h' ? 1 / 3 : id === 'weekly' ? 1 / 7 : id === 'q14d' ? 1 / 14 : id === 'monthly' ? 1 / 30 : null))

// Exact-key text recognition (C4). No fuzzy matching: a key must equal the normalised text.
const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[\s·.,/_-]/g, '')
  .replace(/(알레르기|알러지|과민반응|과민증|allergy|allergic)$/, '').replace(/계$/, '').replace(/s$/, '')
function allergyKeys() {
  const m = new Map()
  for (const a of Object.values(ALLERGY_BY_ID)) for (const t of [a.id, a.label.ko, a.label.en]) m.set(norm(t), a.id)
  for (const d of DRUGS) if (d.flags?.allergyClass) for (const t of [d.id, d.name.ko, d.name.en, ...(d.aliases || [])]) m.set(norm(t), d.flags.allergyClass)
  return m
}
function conditionKeys(species) {
  const m = new Map()
  for (const c of Object.values(CONDITION_BY_ID)) {
    if (c.species && !c.species.includes(species)) continue
    for (const t of [c.label.ko, c.label.en, ...(c.aliases || [])]) m.set(norm(t), c.id)
  }
  return m
}

export function mapSpecies(text) {
  const t = String(text || '').trim().toLowerCase()
  if (!t) return { species: null, reason: 'species_missing' }
  if (['canine','dog','개','견'].includes(t)) return { species: 'dog' }
  if (['feline','cat','고양이','묘'].includes(t)) return { species: 'cat' }
  return { species: null, reason: 'species_unsupported' }
}
export function mapSex(text) {
  const t = String(text || '').toLowerCase()
  if (t.startsWith('spayed')) return { sex:'female', neutered:true }
  if (t.startsWith('neutered')) return { sex:'male', neutered:true }
  if (t.startsWith('intact female')) return { sex:'female', neutered:false }
  if (t.startsWith('intact male')) return { sex:'male', neutered:false }
  return { sex:null, neutered:null }
}
export function mapUnit(rawUnit, strength) {
  const k = String(rawUnit || '').trim().toLowerCase()
  if (PASS_UNITS[k]) return { unit: PASS_UNITS[k] }
  if (COUNT_UNITS.includes(k)) { const cu = strength ? FORM_TO_COUNT[strength.form] : null; return cu ? { unit: cu } : { confirm: 'unit_count_liquid' } }
  if (CONFIRM_UNITS.includes(k)) return { confirm: 'unit_needs_record' }
  return { confirm: 'unit_unknown' }
}
// C3 + M1: 용법 and Tt are both read; a conflict is flagged and the HIGHER frequency is used, so safety ceilings are never under-counted.
export function mapFrequency({ sig, tt, dy }) {
  const s = sig ? normalizeFrequency(sig) : null
  const sigId = s && s.ok ? s.id : null
  const hasTt = !(tt == null || String(tt).trim() === '')
  const n = hasTt ? Number(tt) : null
  let ttId = null, single = false
  if (hasTt) {
    if (n === 1 && Number(dy) === 1) { ttId = 'once'; single = true }
    else ttId = TT_TO_FREQ[n] || null
  }
  if (sigId && hasTt) {
    if (sigId === 'prn') return ttId ? { frequency: ttId === 'once' ? 'q24h' : ttId, note: 'prn_max_per_day' } : { frequency: 'prn' }
    const compatible = PER_DAY[sigId] != null ? PER_DAY[sigId] === n : LESS_THAN_DAILY.includes(sigId) ? n === 1 : false
    if (compatible) return { frequency: sigId }
    const hi = ttId && perDayOf(ttId) > perDayOf(sigId) ? ttId : sigId
    return { frequency: hi, singleAdministration: hi === 'once' && single, confirm: 'freq_conflict' }
  }
  if (sigId) return { frequency: sigId }
  if (!hasTt) return { frequency: null, confirm: 'freq_missing' }
  if (ttId) return { frequency: ttId, singleAdministration: single }
  return { frequency: null, confirm: 'freq_unmapped' }
}
export function mapRoute(rt, strength) {
  const r = String(rt || '').trim()
  if (ROUTES[r.toUpperCase()]) return { route: ROUTES[r.toUpperCase()] }
  if (/^top$/i.test(r)) return { route: strength?.form === 'spot-on' ? 'spot-on' : 'topical' }
  if (/^(eye|ear|inh)$/i.test(r)) return { route: r, confirm: 'route_no_reference' }
  return { route: null, confirm: 'route_missing' }
}
export function chooseProtocol({ drugId, species, route, frequency, singleAdministration, conditionIds, choice, defaultProtocolId }) {
  const all = protocolsFor(drugId, species)
  if (choice) return { protocolId: choice, how: 'chosen' }
  let c = all.filter((p) => [p.route, ...(p.altRoutes || [])].includes(route))
  if (!c.length) return { protocolId: null, confirm: all.length ? 'protocol_route' : 'protocol_none', options: all.map((p) => p.id) }
  if (defaultProtocolId && c.some((p) => p.id === defaultProtocolId)) return { protocolId: defaultProtocolId, how: 'product_default' }
  // H2: a repeated schedule against single-dose-only references → no reference (unless the label itself forbids repeating).
  const repeated = frequency && !['once', 'prn', 'cri'].includes(frequency)
  if (repeated && c.every((p) => freqList(p).every((f) => f === 'once')) && !c.some((p) => p.repeatPolicy === 'label_single_only'))
    return { protocolId: null, confirm: 'protocol_repeat_none', options: c.map((p) => p.id) }
  // M1: Tt1 + Dy1 is one administration; it does not by itself select a single-dose (loading) protocol over a daily one.
  const sameFreq = c.filter((p) => freqList(p).includes(frequency))
  if (sameFreq.length && !(singleAdministration && sameFreq.length < c.length)) c = sameFreq
  if (c.length > 1) { const linked = c.filter((p) => (PROTOCOL_CONDITIONS[p.id] || []).some((x) => conditionIds.includes(x))); if (linked.length) c = linked }
  if (c.length === 1) return { protocolId: c[0].id, how: 'auto' }
  const group = SAME_INDICATION.find((g) => c.every((p) => g.ids.includes(p.id)))
  if (group) return { protocolId: group.primary, how: 'same_indication', label: group.label }
  return { protocolId: null, confirm: 'protocol_indication', options: c.map((p) => p.id) }
}
export function adapt(visit) {
  const p = visit.patient
  const sp = mapSpecies(p.species)
  if (!sp.species) return { supported: false, reason: sp.reason }
  const species = sp.species
  const adapterNotes = [], visitConfirm = []
  let breedId = null
  for (const h of String(p.breed || '').split('/').map((s) => s.trim()).filter(Boolean)) { breedId = resolveBreed(h, species); if (breedId) break }
  if (!breedId && species === 'dog') adapterNotes.push('breed_unresolved')
  const { sex, neutered } = mapSex(p.sex)
  const ageYears = p.birthDate ? Math.floor((daysBetween(p.birthDate, visit.date) / 365.25) * 10) / 10 : null
  if (ageYears != null && ageYears < 1) visitConfirm.push('age_under_1y')
  const weightKg = p.weight?.kg ?? null
  const staleDays = ageYears != null && ageYears < 0.5 ? 14 : 30
  if (weightKg != null && p.weight.measuredAt && daysBetween(p.weight.measuredAt, visit.date) > staleDays) adapterNotes.push('weight_stale')
  const labs = {}, labDates = {}, seenLab = new Set()
  for (const l of [...(p.labs || [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))) {
    if (seenLab.has(l.code)) continue                                   // most recent value per test only
    seenLab.add(l.code)
    const value = l.code === 'creatinine' && /mol/i.test(l.unit) ? Math.round((l.value / 88.4) * 100) / 100 : l.value
    if (daysBetween(l.date, visit.date) > 90) {
      visitConfirm.push(`lab_stale_${l.code}`)
      const upper = l.code === 'creatinine' ? CREATININE_UPPER[species]?.value : null
      if (upper == null || value < upper) continue                      // stale and not abnormal → not used
    }
    if (l.code === 'creatinine' || l.code === 'alt') { labs[l.code] = value; labDates[l.code] = l.date }
  }
  const conditions = [], unmappedDx = []
  const cKeys = conditionKeys(species)
  for (const d of visit.diagnoses || []) {
    const c = CONDITION_MAP[d.code]
    if (c && CONDITION_BY_ID[c]) { conditions.push(c); continue }
    const t = cKeys.get(norm(d.display))
    if (d.display && t) { conditions.push(t); visitConfirm.push(`dx_text_recognised:${d.code}`) } else unmappedDx.push(d.code)
  }
  const allergies = []
  const aKeys = allergyKeys()
  for (const a of p.allergies || []) {
    if (a.code && ALLERGY_BY_ID[a.code]) { allergies.push(a.code); continue }
    const t = aKeys.get(norm(a.text))
    if (a.text && t) { allergies.push(t); visitConfirm.push('allergy_text_recognised') } else visitConfirm.push('allergy_free_text')
  }
  const meds = [], rows = {}, unmapped = []
  for (const row of visit.rows) {
    const prod = PRODUCT_MAP[row.productCode]
    if (row.kind === 'Tx' && !prod) continue                            // procedures, labs: not medications
    if (!prod || !getDrug(prod.drugId)) { unmapped.push({ rowId: row.rowId, code: row.productCode }); continue }
    const strength = getStrength(prod.drugId, prod.strengthId)
    const confirm = [], notes = []
    const powder = row.dispense === '가루'
    const u = mapUnit(row.unit, strength); if (u.confirm) confirm.push(u.confirm)
    const f = mapFrequency(row); if (f.confirm) confirm.push(f.confirm); if (f.note) notes.push(f.note)
    const rt = mapRoute(row.rt, strength); if (rt.confirm) confirm.push(rt.confirm)
    const qty = Number(row.qty)
    if (!powder && u.unit && ['tablet','capsule','chewable','pipette'].includes(u.unit) && strength) {
      const step = splitStep(strength)
      if (Math.abs(qty / step - Math.round(qty / step)) > 1e-9) confirm.push('split_not_allowed')
    }
    const pr = chooseProtocol({ drugId: prod.drugId, species, route: rt.route, frequency: f.frequency, singleAdministration: f.singleAdministration,
      conditionIds: conditions, choice: row.protocolChoice, defaultProtocolId: prod.defaultProtocolId })
    if (pr.confirm) confirm.push(pr.confirm)
    if (pr.label) notes.push(pr.label)
    if (powder) notes.push('powder')
    if (row.calc && u.unit && /\/kg$/.test(u.unit) && weightKg) {
      const factor = { 'mg/kg': 1, 'mcg/kg': 0.001 }[u.unit]
      const calcMg = row.calc.unit === 'mcg' ? row.calc.value / 1000 : row.calc.value
      const expected = qty * (factor ?? 0) * weightKg
      if (factor && Math.abs(expected - calcMg) > Math.max(0.01 * expected, 0.05)) notes.push('calc_mismatch')
    }
    rows[row.rowId] = { drugId: prod.drugId, protocolId: pr.protocolId, confirm, notes, options: pr.options || null, inClinic: row.kind === 'Tx', powder }
    meds.push({ rowId: row.rowId, drugId: prod.drugId, protocolId: pr.protocolId, dose: u.unit && Number.isFinite(qty) ? { value: qty, unit: u.unit } : null,
      route: rt.route, frequency: f.frequency, durationDays: row.dy ? Number(row.dy) : null, strengthId: prod.strengthId })
  }
  return { supported: true, rows, unmapped, adapterNotes, visitConfirm, unmappedDx, labDates,
    caseInput: { species, weightKg, breedId, breedText: p.breed || '', ageYears, sex, neutered, pregnant: false, lactating: false,
                 conditions, labs, allergies, mdr1Status: p.mdr1 || 'unknown', meds: meds.map(({ rowId, ...m }) => m) },
    medRowIds: meds.map((m) => m.rowId) }
}
export const INCOMPLETE_MISSING = /^(weightKg|protocol\.|frequency\.)/
export function check(visit) {   // the core of sdk.check(); cards.js builds the DurResponse from this
  const a = adapt(visit)
  if (!a.supported) return { supported: false, reason: a.reason }
  const r = analyze(a.caseInput)
  const validation = r.notes.filter((n) => n.category === 'validation').map((n) => n.id)
  const missing = r.trace.factorsMissing.filter((m) => INCOMPLETE_MISSING.test(m))
  const rowConfirm = Object.entries(a.rows).filter(([, v]) => v.confirm.length).map(([k, v]) => `${k}:${v.confirm.join('+')}`)
  const mlPrescribed = a.caseInput.meds.some((m) => getDrug(m.drugId)?.flags?.mdr1Sensitive)
  const visitReasons = [...a.visitConfirm, ...a.unmappedDx.map((c) => `dx_unmapped:${c}`),
    ...(a.adapterNotes.includes('breed_unresolved') && mlPrescribed ? ['breed_unresolved'] : [])]
  const incompleteReasons = [...validation, ...missing, ...rowConfirm, ...a.unmapped.map((u) => `unmapped:${u.code}`), ...visitReasons]
  return { supported: true, adapter: a, result: r, complete: incompleteReasons.length === 0, incompleteReasons }
}
```

`splitStep`, the D1/D2 tolerance and D9–D15 come from the engine after WP1 (§5.1).

---

## Revision log

Revision 2 (2026-10-03). Sources: `/tmp/claude-0/uiresearch/critique/critique_1.md` (clinical/CDS critique; its workdir `/tmp/claude-0/uiresearch/critique-emr/`), the EMR items of `critique_0.md` (P1-12), and the founder decisions recorded in DESIGN_SYSTEM.md. All expectations were recomputed by running code (§8.1).

| Finding | Status | Where |
|---|---|---|
| C1 same-ingredient duplication; summing multiple strengths | Applied as D9 (engine) with summing and a new rule. **Modified:** severity is **moderate** (not major) when one of the rows is a single administration, because the labelled day-1 dose then maintenance sequence (metacam_label note) cannot be told apart from an overlap without timing data; both-repeated duplicates are major as proposed. An X02-style duplicate (same schedule) is summed and becomes DOSE_RANGE major 2.0× instead of a separate duplicate card (same gate, clearer reason) | §0, §5 D9, E24–E26 |
| C2 Tx in-clinic injections | Applied (mapped Tx rows sent, `inClinic`, never offered as delete) | §2.4, §4.2, §6.3, E08, E27 |
| C3 용법 vs Tt | Applied: conflict flag + higher frequency; compatibility rule added so "격일 + Tt1" and "월1회 + Tt1" are not false conflicts; PRN + Tt as a daily maximum | §4.2, E34–E36b, E53 |
| C4 free text, unmapped, stale data | Applied: all incomplete; exact-key recognition for allergies and diagnoses (recognised items are passed to the engine so the alert fires, and still marked incomplete); stale abnormal creatinine passed through | §4.1, §4.3, E40–E43 |
| H1 start dose vs titration | Applied as D10. **Modified:** a deviation from a starting-dose protocol is a **minor finding** with titration wording, not a note: a note sits in the collapsed checklist and would hide a 10× entry error; no maximum is invented | §5 D10, E28, E29 |
| H2 single-dose-only references | Applied (D11: adapter `protocol_repeat_none`, knowledge `repeatPolicy` keeps the feline meloxicam label case) | §4.2, E30, E31, E08b |
| H3 inputHash ignores weight/exposure | Applied | §3.3, E45a/E45b |
| H4 US labels, min-only labels, NSAID + CKD + CHF | Applied: jurisdiction labelling (D13), `max: null` for the maropitant minimum (D14). **Not changed:** EU ranges (critic's own note: unverified, from memory), so E38/E39 stay minor "below" with "미국 라벨 기준"; NSAID + CKD + CHF stays moderate per founder decision 3 (D16) | §5, §9 |
| H5 attachShadow on `<td>` | Applied (`span[data-nv-slot]`, re-acquired, tolerant of detached slots) | §2.4, §3.2, §8.3 |
| H6 events across portals; root location | Applied (stopPropagation; root in the overlay host) | §3.4, §8.3 |
| H7 native dialog, explicit focus, close before unmount | Applied | §3.8, §8.3 |
| H8 override lineage, NV-J4, species hard stops, NV-GEN, owner explanation, allergy reasons | Applied; lineage re-read in the full text of Jang 2016 via PubMed (doi:10.4258/hir.2016.22.1.39). Owner explanation is shown for major and **optional** there (required for contraindicated), so a major alert does not gain a third mandatory field | §3.9 |
| M1 Tt1 + Dy1 single dose | Applied: product default for chewables; D12 (no daily minimum for one administration); **modified** "choose protocols by doses per day first": for a drug with both a loading and a daily protocol the row asks for the indication instead, because picking the daily protocol would turn a labelled 0.2 mg/kg day-1 meloxicam dose into a false major 2× alert | §4.2, E32, E33, E44 |
| M2 plan text above the enrofloxacin ceiling | Applied as D15 | §5, E23 |
| M3 related badges | Applied (primary/related by re-check) | §3.7.3, §6.1 |
| M4 per-visit coverage | Applied | §6.2 |
| M5 powder dispensing | Applied: 조제 field, rounding and split off. **Not applied:** "sourced do-not-crush notes": the knowledge base has no sourced crushing data, so the strip says crushing was not checked instead | §4.2, E51 |
| M6 widget CSS rules | Applied | §3.4 |
| M7 fonts under strict CSP | Applied (FontFace API, bytes bundled) | §3.4, §7, §8.3 |
| M8 age | Applied as "under 1 year → incomplete" for every drug: the knowledge base has no sourced age cautions to target | §4.1, E49 |
| M9 this clinic's earlier prescriptions | Applied (listed as not checked) | §3.11, §6.2 |
| L1 CDS Hooks details | Applied (no `selections` on order-sign, string `resourceId`, readable `description`, `{feedback: []}`, "CDS-Hooks-shaped" prefetch) | §3.3, §3.10 |
| L2 comment check | Applied: spaces ignored; minimum 8 non-space characters | §3.9 |
| L3 Appendix A shorthand | Applied (full ids) | Appendix A |
| L4 blank species | Applied (`species_missing`) | §3.6, E52 |
| L5 thresholds | Applied (14-day weight staleness under 6 months; 0.05 mg absolute calc tolerance) | §4.1, §4.2 |
| L6 V7 hint | Applied ("프레드니솔론을 삭제해 보세요") | §2.6 |
| L7 eVET applicability per row | **Rejected:** the only source is search snippets; showing eVET scope per row would be an unverified claim. §1 lists eVET scope as "must not be claimed" | §1 |
| L8 demo additions | Applied (용법, 조제, 포/mL/mcg units labelled; 전체 in mg) | §2.4 |
| critique_0 P1-12 (strip, disclaimers, em dashes) | Applied; host watermark kept and reworded (it labels the host and is the only printed marker); IIFE keeps its own marker | §2.1, §3.7.1, §3.8, §3.11 |
| New in revision 2 | D17 `verdict.action` (engine headlines duplicated the badge word, used an em dash and "안전") | §5 D17 |
