# EMR + DUR popup demo: build spec (binding)

Status: binding spec for the Phase 6 build. Author: lead product designer, 2026-10-03.

**Companion documents:**
- [`docs/design/DESIGN_SYSTEM.md`](../design/DESIGN_SYSTEM.md): tokens, work packages (WP1–WP4 implement this spec) and acceptance gates.
- [`DUR_SHOWCASE_SPEC.md`](./DUR_SHOWCASE_SPEC.md): clean-room data, no network, no fabricated numbers, determinism.

**The founder's request:** "Turn the DUR into a web popup for demonstration on top of an existing EMR. Make sure it's accurate."

**What this spec delivers:**
- **A fictional, generic Korean veterinary EMR screen** ("데모 차트 (가상 EMR)").
- **The NuvoVet DUR overlay** that a real EMR would embed. It is modelled on CDS Hooks `order-select` / `order-sign`, isolated in a Shadow DOM, and built both in-app and as a standalone widget bundle.
- **An adapter** that turns EMR prescription rows into engine input without ever guessing a strength, concentration, frequency or indication.
- **An accuracy test plan** whose expected outputs were produced by running the real engine (§8).

**How the expected outputs were produced.** A reference adapter and scenario runner were written and executed while writing this spec. The source is reproduced in Appendix C; the scratch copy is in `/tmp/claude-0/uiresearch/spec/`. Defects found in the engine were also prototyped and fixed, and the full engine test suite was re-run after the fix:
- before the fix: 248 of 249 Vitest tests passed;
- after the fix: the same 248 passed;
- the 1 failure in both runs is a path-only failure caused by running the suite from a copy outside `frontend/`.

---

## 0. Key decisions

1. **Two-stage check, following CDS Hooks.**
   - **On every grid edit (`order-select`, 300 ms debounce):** the overlay is passive. It updates row badges and the side panel and never steals focus.
   - **On 처방 저장 / 처방전 출력 / eVET 전송 (`order-sign`):** a blocking `alertdialog` opens, but **only** for 금기 (contraindicated) or 중대 (major) findings the vet has not yet acknowledged for the same inputs.
   - **Never interruptive:** 주의 (moderate), 경미 (minor), notes and "확인 필요".
2. **Never invent data.**
   - Strength and concentration come only from the EMR product code (`productMap`).
   - Frequency comes from 용법 text or 횟수 Tt (+ 일수 Dy for single doses).
   - The indication (protocol) comes from route + frequency + mapped diagnosis.
   - Anything still ambiguous becomes **확인 필요** on the row and makes the verdict **검토 불완전**. It is never shown as "문제 없음".
3. **The engine is fixed before the demo is called accurate.**
   - **D1:** count-entry tolerance.
   - **D2:** bound tolerance.
   - **D3:** every suggestion is re-checked.
   - **D4:** non-splittable product split.
   - **D6/D7:** the incomplete-verdict surface.
   - **D5** (duration limits) is not invented. It is shown as "검토 안 함: 투여기간".
4. **Override reasons are coded,** adapted from HIRA's 예외사유 codes and the J1–J6 revision (Jang 2016). Contraindicated findings need a reason, a checked free-text comment and "보호자에게 설명함". Major findings need a reason. No hard stop: the vet keeps legal discretion.
5. **Packaging.**
   - **The widget** is plain React + hand-written CSS inside a Shadow DOM, with **no Radix**. That avoids the seven shadow-root breakages the stack track found and the untested dev-mode focus fix.
   - **The host EMR** has its own generic desktop look, so the overlay visibly comes from a different product.
   - **Where it ships:**
     - `/dur#/emr/:visitId` in the main app;
     - the same route in the single-file standalone build;
     - `dist-widget/nuvovet-dur.iife.js` for real embedding.

---

## 1. Scope, sources and what could not be reached

**Evidence used:**
- The emr track:
  - CDS Hooks spec, Library `order-select`/`order-sign` and the HL7 PDDI-CDS IG, fetched from raw.githubusercontent.com;
  - SMART App Launch;
  - PubMed papers: Jang 2016 (doi:10.4258/hir.2016.22.1.39), Shin 2019 (doi:10.1186/s12913-019-4686-9), Lee 2018 (doi:10.1371/journal.pone.0195434), van der Sijs 2006 (doi:10.1197/jamia.M1809), Phansalkar 2013 (doi:10.1136/amiajnl-2012-001089) and Payne 2015 (doi:10.1093/jamia/ocv011).
- `backend/scripts/docs/EMR_Field_Analysis.md`: anonymised real EMR screens, the primary source for field names.
- The ai-tells track: CDS Hooks card model, alert-fatigue literature.
- The stack track: Shadow DOM widget, verified in Chromium 141.

**Blocked, not read:**
- cds-hooks.hl7.org, hl7.org and build.fhir.org (the FHIR `patient-animal` extension URL is unverified, so it is not used);
- hira.or.kr (the HIRA DUR module documentation);
- law.go.kr (the 수의사법 prescription-form wording);
- dailyvet, khanews and dailypharm (used through search snippets only).

**Must not be claimed:**
- that any Korean vet EMR lacks a safety check;
- any vendor's exact grid layout.

**Out of scope:**
- receipts (수납), eVET transmission and real authentication;
- any network call;
- any real vendor name, logo, colour or layout. Do not name 인투벳, 이프렌즈, 플러스벳 or any other vendor anywhere in the UI.

---

## 2. The fictional EMR host

### 2.1 Identity

**Names:**
- Product name: **"데모 차트"**, with the subtitle "가상 EMR".
- Clinic: **"새봄동물의료센터 (가상)"**.
- Vet: **"김민서 (가상)"**, user id `Practitioner/demo-kim`.

**Watermark.** A permanent corner watermark (bottom-left, `text-xs`, 60 % opacity, `aria-hidden="false"`, also printed) reads:
> 가상의 EMR — 실제 제품이 아닙니다 · NuvoVet DUR 교육용 프로토타입, 임상 검증되지 않음

**Look.** The look is deliberately generic and must not resemble NuvoVet. It lives in `src/portfolio/emr/host/emr.css`, scoped under `.emr-root`, with no Tailwind and no `src/ui`:

| Element | Value |
|---|---|
| font | `"Malgun Gothic","Apple SD Gothic Neo",-apple-system,sans-serif`, 12 px (grid) / 13 px (forms), line-height 1.4 |
| frame background | `#E9ECEF` |
| panels | `#FFFFFF` with a 1 px `#C8CDD2` border, 2 px radius |
| tab strip | `#DDE3EA`, with the active tab `#FFFFFF` |
| title bars | `#46566B` with white text, 28 px |
| grid header | `#F1F3F5`; rows 26 px; selected row `#DCE8F7` |
| buttons | 26 px, `#F8F9FA` with a `#ADB5BD` border; the primary 처방 저장 button is `#2F5E9E` with white text |

- Contrast: `#2F5E9E` with white is 6.6:1.
- The host stays light in every site theme (§2.5).

### 2.2 Layout

The layout is designed at 1440×900 and must work at 1280×800.

```
┌ demo bar 40px (portfolio chrome, NuvoVet tokens, follows site theme) ───────────────────────────────────────────┐
│ nuvovet DUR 데모 · 가상 EMR 위에서 동작   방문 [V1 초코 ▾]  시도: "처방 저장을 눌러 보세요"   위젯 [라이트|다크]  기록 내보내기  사례로 ↗ │
├ EMR title bar 28px ───────────────────────────────────────────────────────────────────────────────────────────┤
│ 데모 차트 (가상 EMR) │ 접수  진료  수납  예약 │ 새봄동물의료센터 (가상) · 수의사 김민서 (가상) · 2026-10-03          │
├──────────────┬───────────────────────────────────────────────────────────────────────┬────────────────────────┤
│ 대기목록 220px │ 환자 헤더 (2 lines, 13px)                                                │ NuvoVet DUR panel 360px │
│ [검색 이름/번호] │ 초코 #1042 · 개 · ROUGH COLLIE/러프 콜리 · 중성화 수컷 · 4y 4m (2022-05-14)│ (overlay, docked;       │
│ 탭 대기|진료중|수납│ 24.0 kg (2026-10-03 측정) · 보호자 이○○ · 담당의 김민서 · 혈액형 — · 특이 ⚠ MDR1 미검사 │  injected by the widget)│
│ ─────────────│ ───────────────────────────────────────────────────────────────────── │                        │
│ 09:10 초코 개 진료중│ [S][O][A][P][검사결과][이력]  (A selected: 진단명 chips "D-DERM-012 전신성 모낭충증") │                        │
│ 09:30 콩이 개 대기 │ ── TX/RX ────────────────────────────────────────────────────────── │                        │
│ 09:50 나비 묘 대기 │ Rx 검색 [성분명/상품명/초성 ⌕] 필터 (정)(주)(액)(외)                         │                        │
│ … (V1–V10)    │ ┌ Rx grid (§2.4) ──────────────────────────────────────────────┐   │                        │
│              │ │ 구분 상품코드 이름 단위 투여량 계산량 횟수 일수 경로 용법 전체 금액 DUR│   │                        │
│              │ └──────────────────────────────────────────────────────────────┘   │                        │
│              │ 진료기록 footer: (DUR acknowledgement lines appear here, §3.10)        │                        │
│              │ [처방 저장] [처방전 출력] [eVET 전송] [수납으로]   (bottom action bar)      │                        │
└──────────────┴───────────────────────────────────────────────────────────────────────┴────────────────────────┘
```

**Responsive behaviour:**

| Width | Panel | EMR changes |
|---|---|---|
| ≥ 1280 | docked in a 360 px right column | — |
| 1024–1279 | `layout:'floating'`: a launcher at bottom-right opens a 380 px drawer over the EMR's right edge | the waitlist collapses to 48 px (icons + count) |
| < 1024 | a bottom sheet: 48 px collapsed bar showing the verdict, expands to 70 vh | the waitlist sits behind a "대기목록" button |

- **Grid overflow** at every width: the Rx grid scrolls horizontally inside its own container. The page never scrolls horizontally.
- **Hidden columns:**
  - below 1440: `폴더명` and `VAT`;
  - below 1280: `상품코드` and `금액`.

### 2.3 Patient header fields

Field names follow `EMR_Field_Analysis.md`:

| Field | Shows |
|---|---|
| 동물 이름 + 동물 번호 | e.g. 초코 #1042 |
| 종 | 개 / 고양이 / 토끼 … (the source value is Canine / Feline / Rabbit) |
| 품종 | bilingual `ROUGH COLLIE/러프 콜리` |
| 성별 | five values: Spayed Female 중성화 암컷, Neutered Male 중성화 수컷, Intact Female 암컷, Intact Male 수컷, Unknown 미상 |
| 생년월일 → 나이 | `4y 4m` |
| 체중 | value + measurement date. A weight older than 30 days shows "(45일 전 측정)" in `#B35C00` text |
| 보호자 | a masked name |
| 담당의 | — |
| 혈액형 | — |
| 특이사항 | a ⚠ icon + text, e.g. "MDR1 미검사", "페니실린 알레르기" |
| 검사결과 tab | a table of labs: date, test, value, unit, reference range. Creatinine is in mg/dL; µmol/L rows are converted by the adapter (§4.1) |
| A (진단명) | chips of `code + name`. Codes are **fictional** (`D-DERM-012` …), shaped like the MAFRA 표준 질병명 codes but not copied from it |
| 알레르기 | coded entries (`penicillin` …) shown in Korean; free-text allergies are allowed and become "확인 필요" (§4.3) |

### 2.4 Rx grid

**Columns, in order.** The DUR column is rendered by the widget into a host-provided slot (§3.2).

| Column | Example | Editable | Notes |
|---|---|---|---|
| 폴더명 | 피부 | no | from the product |
| 구분 | Rx / Tx | no | Tx rows (treatments) are not sent to DUR |
| 상품코드 | `RX-IVM-SOL10` | no | key into `productMap` (Appendix A); mono 11 px |
| 이름 | 이버멕틴 경구액 10 mg/mL (액) | no | ingredient + strength + form suffix (정)(주)(액)(외)(캡)(츄) |
| 단위 | `mcg/kg` ▾ | select | options: mg/kg, mcg/kg, IU/kg, mL/kg, mg, mcg, mL, EA, 포 |
| 투여량 Qty | 300 | number | step 0.01 |
| 계산량 | 7.2 mg (0.72 mL) | no | host-computed (§2.4.1) |
| 횟수 Tt | 1 | integer | blank allowed |
| 일수 Dy | 7 | integer | blank allowed |
| 경로 Rt | PO ▾ | select | PO, IV, SC, IM, Eye, Ear, Top, Inh |
| 용법 | 격일 | text | optional; wins over Tt (§4.2) |
| 전체 | 7 mL | no | host-computed, informational |
| 금액 | ₩7,000 | no | fictional price table, labelled "가상 단가" in the column tooltip |
| DUR | ● 금기 | no | badge slot (§3.7.3) |

#### 2.4.1 Host calculations

The host computes these itself. **They are display-only;** the engine recomputes everything from the raw fields.

- **계산량:** Qty × 체중 for `/kg` units, shown in the numerator unit. For liquids the mL equivalent is added (`7.2 mg (0.72 mL)`). For `mg`/`mcg`/`mL` units it is the Qty itself. For `EA` it is `Qty × strength`, shown in mg.
- **전체** = per-administration product units × Tt × Dy, shown in product units (정/캡슐/mL/개).
- Both are shown with a tooltip: "EMR 계산값 (표시용)".

#### 2.4.2 Behaviour

- **Adding a row.** Rx 검색 is a combobox with ↑↓/Enter. It searches product display names plus the engine's bilingual, jamo-aware drug search (`searchDrugs`) and lists matching **products**. Choosing one adds a row with that product's default unit and empty Qty/Tt/Dy, and focuses Qty.
- **Deleting.** A "×" button at the end of each row (`aria-label="행 삭제: 이버멕틴"`) deletes the row.
- **Edits.** Every edit is committed on input. 300 ms after the last change the host calls `dur.check(toCdsRequest(visit, 'order-select'))` (§3.3).
- **Saving.** 처방 저장, 처방전 출력 and eVET 전송 call `await dur.gate(toCdsRequest(visit, 'order-sign'))`:
  - If `proceed` is true: show the host toast "처방이 저장되었습니다 (데모)" and append the acknowledgement lines to the 진료기록 footer.
  - If false: return focus to the row named in the gate result (`focusRowId`), or to the save button.
- **No persistence.** Visits are in-memory per page load. "방문 초기화" in the demo bar reloads the fixture.

### 2.5 Language and theme

- **The EMR host is Korean only.** Column abbreviations like Qty, Tt, Dy and Rt are kept, as real Korean EMRs use them.
- **Widget locale:** `ko` by default on `#/emr`; `?lang=en` in the hash query switches it to `en`. The portfolio's EN/KO toggle in the demo bar switches the widget locale only.
- **Theme:**
  - the host EMR is always light;
  - the widget theme defaults to `light` and is switchable in the demo bar (라이트 | 다크);
  - the demo bar follows the site theme.

### 2.6 Sample patients and visits

These are the visits on the waitlist. The data is fictional, and the fixtures are reproduced verbatim in Appendix B. The expected results are the binding column of §8.1.

| Visit | Patient | Prescription (EMR rows) | Expected at save | Demo-bar hint (one line) |
|---|---|---|---|---|
| V1 | 초코 #1042, Rough Collie, NM, 24.0 kg, MDR1 미검사; 전신성 모낭충증, 말라세지아 외이염 | 이버멕틴 경구액 10 mg/mL mcg/kg 300 Tt1 Dy7 PO; 케토코나졸 정 200 mg mg/kg 5 Tt2 Dy21 PO | **gate opens**: 금기 MDR1_PGP_ML | 처방 저장을 눌러 보세요 |
| V2 | 콩이 #0877, 시츄, NM, 6.0 kg; 뇌전증, 아토피 | 페노바르비탈 15 mg 2.5 mg/kg Tt2 Dy30; 사이클로스포린 10 mg 캡슐 5 mg/kg Tt1 Dy30; 프레드니솔론 5 mg 0.5 mg/kg Tt1 Dy14 | no gate; panel 주의 1 · 경미 2 | 사이클로스포린 행을 삭제해 보세요 |
| V3 | 나비 #1310, 코리안숏헤어, FS, 4.1 kg, Cr 2.0; 갑상선기능항진증, CKD | 메티마졸 2.5 mg mg 2.5 Tt2 Dy30; 암로디핀 2.5 mg EA 0.25 Tt1 Dy30; 마로피탄트 16 mg 1 mg/kg Tt1 Dy14 | no gate; 주의 1 | 계산량 칸의 툴팁을 확인해 보세요 |
| V4 | 모찌 #1455, 코리안숏헤어, FS, 3.8 kg | 퍼메트린 스팟온 (개 전용) EA 1 Tt1 Dy1 Top | **gate opens**: 금기 SPECIES_HARDSTOP | 처방 저장을 눌러 보세요 |
| V5 | 대박 #0921, 래브라도, FS, 30.0 kg; 표재성 농피증, 구토 | 아목시실린·클라불란산 375 mg 12.5 mg/kg Tt2 Dy7; 마로피탄트 60 mg 2 mg/kg Tt1 Dy2 | no gate; "규칙상 문제 없음" (neutral) | 체중을 지워 보세요 |
| V6 | 보리 #1502, 말티즈, FS, 3.2 kg, Cr 2.1; CKD, 골관절염, MMVD | 멜록시캄 현탁액 1.5 mg/mL 0.1 mg/kg Tt1 Dy14; 푸로세미드 12.5 mg 2 mg/kg Tt2; 피모벤단 1.25 mg 0.25 mg/kg Tt2; 베나제프릴 5 mg 0.5 mg/kg Tt1 | no gate; 주의 1 (NSAID_RENAL) | 멜록시캄을 mL 0.21로 바꿔 보세요 |
| V7 | 해피 #0650, 골든 리트리버, NM, 28.0 kg; 골관절염, 아토피, 불안 | 카프로펜 100 mg 4.4 mg/kg Tt1 Dy7; 프레드니솔론 5 mg 0.5 mg/kg Tt1 Dy7; 트라마돌 50 mg 5 mg/kg Tt4 Dy5; 트라조돈 100 mg 10 mg/kg Tt1 Dy1 | **gate opens**: 중대 NSAID_CORTICOSTEROID; panel also 주의 SEROTONERGIC | 트라마돌 횟수를 3으로 바꿔 보세요 |
| V8 | 레오 #1388, 러시안 블루, NM, 3.5 kg; 요로감염 | 엔로플록사신 68 mg EA 0.5 Tt1 Dy10; 멜록시캄 주사 5 mg/mL 0.3 mg/kg Tt1 Dy1 SC | **gate opens**: 중대 ENRO_FELINE_RETINA | 멜록시캄 일수를 3으로 바꿔 보세요 |
| V9 | 두부 #1620, 푸들, NM, 8.0 kg; 뇌전증, 불안 | 플루옥세틴 16 mg 츄어블 EA 1 Tt1 Dy30; 페노바르비탈 30 mg 2.5 mg/kg Tt2 Dy30 | **gate opens**: 금기 DRUG_CONDITION | — |
| V10 | 코코 #1733, 비글, 암컷, 12.0 kg, 알레르기 penicillin; 피부 감염 | 아목시실린·클라불란산 250 mg 12.5 mg/kg Tt2 Dy7 | **gate opens**: 중대 ALLERGY_CLASS | — |

V1–V5 reproduce the five golden cases.

---

## 3. The DUR overlay

### 3.1 Architecture

```
src/portfolio/emr/
  adapter.js          EMR visit → caseInput (+ per-row status). Pure. (Appendix C is the reference implementation.)
  cds.js              toVisit(cdsRequest) / toCdsRequest(visit, hook): CDS-Hooks-shaped request ⇄ visit model
  productMap.js       Appendix A        conditionMap.js   Appendix A.2 + PROTOCOL_CONDITIONS + SAME_INDICATION
  cards.js            engine Result + adapter output → DurResponse (cards, rowStatus, verdict, notes, coverage)
  suggestions.js      candidate suggestions + re-check (§6.3)
  overrideReasons.js  §3.9 code system      commentCheck.js  §3.9 free-text validator
  feedbackLog.js      §3.10 (memory + localStorage, try/catch)
  sdk.js              createDur(options) — state, check(), gate() promise plumbing, events. No DOM.
  fixtures.js         Appendix B visits V1–V10 (+ test-only visits)
  widget/
    index.jsx         createDurWidget(options) = createDur + mount UI; also exports mountInShadow()
    entry.js          IIFE/ESM entry: window.NuvoVetDUR = { create: createDurWidget, version }
    Panel.jsx  Card.jsx  GateDialog.jsx  RowBadge.jsx  CoverageStrip.jsx  NotesChecklist.jsx  Launcher.jsx
    focusTrap.js      shadow-aware focus trap (uses root.activeElement + event.composedPath())
    widget.css        hand-written CSS, px units only, tokens via var(--…) under .nv-scope
    fonts.js          namespaced @font-face injected into document.head once ("NuvoVet Pretendard")
  host/               the fictional EMR (WP4): EmrApp.jsx, WaitList.jsx, PatientHeader.jsx, RxGrid.jsx, RxSearch.jsx, emr.css
```

**Why the widget has no Radix.** The stack track proved Radix works in a shadow root, but only with:
- a build-time patch of about 30 Radix, cmdk and vaul files (`shadowFocus`);
- `portalize`;
- `@property` and `rem` rewrites.

The dev-mode path of that patch was untested, and the demo runs under `vite dev`. The overlay needs only a panel, disclosures, a radio group, a textarea, a checkbox and one modal, so a small hand-written set is cheaper and deterministic.

**Shared code.** The widget shares **tokens** (`@/ui/tokens.css?inline`) and the **engine**. It shares no components with `src/ui`.

### 3.2 SDK API

All calls are synchronous except `gate`. There is no network and no storage beyond the try/catch log (§3.10).

```ts
type Locale = 'ko' | 'en'
const dur = NuvoVetDUR.create({
  locale?: Locale,                         // default 'ko'
  theme?: 'light' | 'dark' | 'system',     // default 'light'
  layout?: 'docked' | 'floating' | 'sheet' | 'auto',  // 'auto' = §2.2 breakpoints; default 'auto'
  fonts?: 'inject' | 'inherit',            // IIFE default 'inject'; in-app 'inherit' (page already loads Pretendard)
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
dur.getLog(encounterId?: string): Feedback[]; dur.exportLog(): string /* JSON */; dur.clearLog(): void
dur.unmount(): void
type GateResult = { proceed: boolean, feedback: Feedback[], focusRowId?: string }
type DurEvent =
  | { type: 'cards', response: DurResponse }
  | { type: 'gate-open', cardIds: string[] } | { type: 'gate-close', proceed: boolean }
  | { type: 'feedback', entry: Feedback }
  | { type: 'focus-row', rowId: string }                 // "처방 수정"
  | { type: 'remove-row', rowId: string }                // accepted "삭제" suggestion; host deletes and re-checks
  | { type: 'update-row', rowId: string, patch: { qty?: number, unit?: string, productCode?: string, protocolChoice?: string } }
  | { type: 'fix-chart', field: 'breed' | 'weight' | 'diagnoses' | 'allergies' | 'mdr1' }  // NV-DATA
  | { type: 'open-workbench', href: string }
```

**`ProductMapEntry`** = `{ code, display, drugId, strengthId, defaultProtocolId? }`.

**`badgeSlot` and `panel`:**
- `badgeSlot(rowId)` returns the host's empty DUR cell. The widget attaches a shadow root to it and renders the badge there. Each slot shares the same constructed stylesheet.
- With no `panel`, the widget renders the floating launcher/drawer in the overlay host (§3.4).

### 3.3 Request and response (CDS Hooks shape)

**Request.** `toCdsRequest(visit, hook)` builds it; `toVisit(request)` inverts it, and the adapter consumes the visit. One `MedicationRequest` per Rx row:

```jsonc
{ "hook": "order-select" /* | "order-sign" */, "hookInstance": "<uuid>",
  "context": { "userId": "Practitioner/demo-kim", "patientId": "1042", "encounterId": "enc-V1-2026-10-03",
    "selections": ["MedicationRequest/rx-2"],               // order-select: the edited row(s); order-sign: all rows
    "draftOrders": { "resourceType": "Bundle", "type": "collection", "entry": [ { "resource": {
      "resourceType": "MedicationRequest", "id": "rx-2", "status": "draft", "intent": "order",
      "medicationCodeableConcept": { "coding": [ { "system": "urn:demo-emr:product", "code": "RX-KTZ-T200", "display": "케토코나졸 정 200 mg" } ] },
      "dosageInstruction": [ {
        "text": "",                                           // 용법 (free text, may be empty)
        "route": { "text": "PO" },                            // 경로 Rt, raw
        "doseAndRate": [ { "doseQuantity": { "value": 5, "unit": "mg/kg" } } ],   // 투여량 + 단위, raw
        "timing": { "repeat": { "frequency": 2, "period": 1, "periodUnit": "d",    // 횟수 Tt (omitted when blank)
                                "boundsDuration": { "value": 21, "unit": "d" } } } } ],  // 일수 Dy (omitted when blank)
      "extension": [ { "url": "urn:demo-emr:calculated", "valueQuantity": { "value": 120, "unit": "mg" } },
                     { "url": "urn:nuvovet:protocol-choice", "valueString": "keto_dog_malassezia" } ]   // only after the vet chose
    } } ] } },
  "prefetch": {
    "patient": { "id": "1042", "name": "초코", "species": "Canine", "breed": "ROUGH COLLIE/러프 콜리", "sex": "Neutered Male", "birthDate": "2022-05-14" },
    "weight": { "valueQuantity": { "value": 24.0, "unit": "kg" }, "effectiveDateTime": "2026-10-03" },
    "labs": [ { "code": "creatinine", "value": 2.0, "unit": "mg/dL", "date": "2026-10-01" } ],
    "conditions": [ { "code": "D-DERM-012", "display": "전신성 모낭충증" } ],
    "allergies": [ { "code": "penicillin" } /* or { "text": "자유 입력" } */ ],
    "genotype": { "abcb1": "unknown" },
    "visitDate": "2026-10-03" } }
```

The `prefetch.patient` block is simplified on purpose. The FHIR `patient-animal` extension is not used because its URL could not be verified.

**Response.** Produced by `cards.js`:

```jsonc
{ "cards": [ {
    "uuid": "card-<fnv1a(problemKey|inputHash)>",            // stable across re-checks with the same inputs
    "summary": "<finding.title[locale]>",                     // ≤ 140 chars (asserted in tests)
    "indicator": "critical",                                  // contraindicated|major → critical; moderate → warning; minor → info
    "detail": "<markdown: consequence, why[], actions[], alternatives[]>",
    "source": { "label": "NuvoVet DUR · 교육용 프로토타입", "topic": { "code": "MDR1_PGP_ML", "display": "품종·유전자" } },
    "overrideReasons": [ /* §3.9 codings allowed for this rule */ ],
    "selectionBehavior": "at-most-one",
    "suggestions": [ { "uuid": "…", "label": "이버멕틴 삭제", "isRecommended": true,
                       "actions": [ { "type": "delete", "description": "rx-1", "resourceId": ["MedicationRequest/rx-1"] } ] } ],
    "links": [ { "label": "전체 분석 열기", "url": "#/case/custom?s=…", "type": "absolute" } ],
    "extension": { "severity": "contraindicated", "findingId": "f_mdr1_ivermectin", "problemKey": "mdr1:ivermectin",
                   "ruleIds": ["MDR1_PGP_ML"], "ruleVersion": "1.1.0", "drugIds": ["ivermectin","ketoconazole"],
                   "rowIds": ["rx-1","rx-2"], "sources": ["mealey2001", "…"], "evidence": "literature",
                   "inputHash": "<fnv1a>", "ackKey": "<problemKey>|<inputHash>", "blocking": true } } ],
  "extension": {
    "verdict": { "level": "contraindicated", "headline": "<engine headline[locale]>", "complete": true, "incompleteReasons": [] },
    "counts": { "contraindicated": 1, "major": 0, "moderate": 0, "minor": 0, "doseChecks": 1, "notes": 3 },
    "rowStatus": { "rx-1": { "badge": "contraindicated", "label": "금기" }, "rx-2": { "badge": "contraindicated", "label": "금기", "rounding": true } },
    "notes": [ /* engine notes (category: administration|lab|monitoring|rounding|caution), plus adapter notes (§4.3) */ ],
    "doses": [ /* engine DoseRow[], unchanged */ ],
    "unmapped": [ { "rowId": "rx-4", "code": "RX-XYZ-999" } ],
    "coverage": { "checked": ["species","breed","interaction","duplication","condition","renal","allergy","dose"],
                  "notChecked": ["age","pregnancy","duration","otherClinics"] },
    "engineVersion": "1.2.0", "ms": 1.3 } }
```

**Hashes:**
- **`inputHash`** = `fnv1a(canonicalJson({ severity, rows }))`, where `rows` holds each involved row's `{ drugId, strengthId, dose, frequency, route, protocolId, durationDays }` and the finding's `factors` as `kind:id` strings. Both helpers come from `engine/hash.js`.
- **`ackKey`** = `problemKey + '|' + inputHash`.

### 3.4 Shadow DOM isolation

Two host elements are used, both created by the widget:

1. **The panel host.** This is the element passed as `mount({ panel })`, docked in the EMR layout. The widget calls `attachShadow({ mode: 'open' })` on it.
2. **The overlay host.** `<nuvovet-dur-overlay>` is appended once directly under `document.body`. It holds the gate dialog, the floating drawer/launcher and the bottom sheet. Inside its shadow root:
   ```css
   :host { all: initial !important; position: fixed !important; inset: 0 auto auto 0 !important; width: 0 !important; height: 0 !important;
           z-index: 2147483000 !important; contain: none !important; }
   ```
   The dialog, scrim and drawer are `position: fixed` children sized to the viewport. The host must sit directly under `<body>`, never inside an ancestor with `transform`, `filter` or `contain`.

**One React root**, created in the panel host's shadow, renders everything. It reaches the overlay host and the badge slots through `createPortal` into their shadow roots.

**CSS.** `tokens.css?inline` + `widget.css?inline` are concatenated into one `CSSStyleSheet`, which is assigned to every shadow root's `adoptedStyleSheets`. The fallback is a `<style>` element when `adoptedStyleSheets` is missing.

**The stack track's seven failure modes, and how this widget avoids each:**

| # | Failure | Avoided by |
|---|---|---|
| 1 | Host `html{font-size:62.5%}` shrinks rem | `widget.css` uses px only. A lint test fails on `rem` in `widget.css`, and `tokens.css` contains no rem. |
| 2 | `@property` ignored in shadow roots | No Tailwind in the widget; no `@property` (asserted by test). |
| 3 | `@font-face` inside a shadow root is ignored | `fonts.js` injects `@font-face { font-family: "NuvoVet Pretendard" … }` into `document.head` once, when `fonts:'inject'`. The widget stack is `"NuvoVet Pretendard","Pretendard Variable",system-ui,…`. |
| 4 | The host defines a fake font with the same name | Namespaced family name (above) |
| 5 | Host CSS variables inherit into the shadow (`* { --primary: lime !important }`) | All tokens are re-declared on `.nv-scope`, the root element inside each shadow root. Outer selectors such as `*` cannot match elements inside a shadow tree, and a declaration on `.nv-scope` beats anything inherited through `:host`, so every descendant reads NuvoVet values. Asserted by §8.3 test 4. |
| 6 | Host `z-index: 99999` sticky header | `:host` rule above |
| 7 | Focus retargeting breaks focus traps | `focusTrap.js` reads `shadowRoot.activeElement` and `event.composedPath()[0]`, and never `document.activeElement` |

**Reset.** `.nv-scope` sets `all: initial` on itself and then re-establishes `font`, `color`, `line-height`, `letter-spacing: 0`, `text-transform: none` and `box-sizing: border-box` (also for descendants). This survives the hostile host's `* { … !important }`: inherited properties are re-set with `!important` on `.nv-scope *`.

### 3.5 Trigger points

| Moment | Hook | What happens | Blocks? |
|---|---|---|---|
| Row added, edited or removed (300 ms debounce; Tt/Dy may be blank) | `order-select` | `check()`: badges and panel re-render; cards replaced by uuid (expanded state kept per uuid); live region announces count changes only | Never |
| Patient weight, diagnoses, labs, allergies or MDR1 changed | `order-select` (all rows selected) | same as above; acknowledged cards whose `inputHash` changed lose their acknowledgement and come back | Never |
| 처방 저장 / 처방전 출력 / eVET 전송 | `order-sign` | `gate()`: opens the dialog only when ≥ 1 card has `blocking: true` (§3.6) and its `ackKey` is not in this encounter's log as `overridden` or `accepted` | Only then |
| Opening the chart (patient selected) | none | the panel shows the last result for that visit, or "처방을 입력하면 검토합니다" | No: per CDS Hooks best practice, nothing fires on chart open |

**Dedupe** follows PDDI-CDS `filter-out-repeated-alerts`. A blocking card acknowledged in the panel at select time ("확인하고 사유 입력", §3.7.1) is not shown again at sign, unless its inputs changed.

### 3.6 Passive vs interruptive, by severity

| Engine severity | CDS indicator | Row badge | Panel | Gate at sign | Requires to proceed |
|---|---|---|---|---|---|
| contraindicated (금기) | critical | solid red "금기" | expanded card at top | **yes** | coded reason + comment (passes §3.9 check) + ☑ 보호자에게 위험을 설명함 |
| major (중대) | critical | outlined orange "중대" | expanded | **yes** | coded reason (comment required only for NV-OTH) |
| moderate (주의) | warning | tint amber "주의" | collapsed to one line | no | nothing; optional "확인함" (logged as `accepted`, no reason) |
| minor (경미) | info | neutral "경미" | collapsed | no | nothing |
| notes (admin/lab/monitoring/caution/rounding) | — (not cards) | "≈" marker on rounding rows | "투약 안내" checklist (collapsed, count) | no | nothing |
| row 확인 필요 (§4.3) | — | neutral dashed-icon "확인 필요" | "확인 필요" group above the cards | no (shown as a line in the gate if the gate opens for other reasons) | nothing; the verdict shows 검토 불완전 |
| unmapped product | — | "검토 안 함" | listed under the coverage strip | no | nothing |
| unsupported species | — | "—" on all rows | the whole panel reads "지원하지 않는 종 — 개·고양이만 검토합니다" | no | nothing; `analyze()` is **not** called |

**Minor findings are always non-blocking:**
- the panel never auto-expands for them;
- the floating launcher does not change state for them;
- they never move focus, play a sound or animate beyond a 150 ms colour change.

**At select time,** a contraindicated finding changes the floating launcher to its critical state (red "금기 1"). It still does not open the drawer, steal focus or show a modal.

### 3.7 Card and panel anatomy

#### 3.7.1 Panel (docked 360 px; drawer 380 px; sheet full width)

```
┌───────────────────────────────────────────────┐
│ nuvovet DUR        규칙 17개 · 14:32:05   [–]   │ 40px header; [–] minimise (docked) / close (drawer; Esc)
├───────────────────────────────────────────────┤
│ [■ 금기] 금기 — 현재 처방대로 조제하지 마십시오     │ verdict row: SeverityBadge md + engine headline (2 lines max)
│ 금기 1 · 투여량 확인 1        [검토 불완전 1 ▸]     │ non-zero counts only; incomplete chip opens the 확인 필요 group
├───────────────────────────────────────────────┤
│ 확인 필요 (shown only when present)               │
│  아목시실린·클라불란산 · 빈도 미입력 [행으로 이동]     │
├───────────────────────────────────────────────┤
│ Card (expanded, critical) — §3.7.2               │
├─── hairline ──────────────────────────────────┤
│ Card (collapsed, warning): [주의] 페노바르비탈 + 사이클로스포린 … ▸│
├───────────────────────────────────────────────┤
│ 투약 안내 3 ▸                                     │ NotesChecklist (checkbox per note; ticks are not saved)
├───────────────────────────────────────────────┤
│ 검토함 종·품종·병용·중복·질환·신기능·알레르기·용량      │ CoverageStrip, text-xs muted, always visible
│ 검토 안 함 연령·임신/수유·투여기간·타 병원 처방        │
│ 전체 분석 열기 ↗                 교육용 프로토타입 ⓘ  │ ⓘ tooltip = full disclaimer
└───────────────────────────────────────────────┘
```

**Verdict row by state:**

| State | Shown |
|---|---|
| `none` + complete | neutral `CircleCheck` + "규칙상 문제 없음" + the engine headline ("…안전을 보장하지는 않습니다") |
| `none` + incomplete | `CircleDashed` + **"검토 불완전"** + the reasons (never a check mark) |
| any severity + incomplete | the severity badge plus a secondary chip "검토 불완전 N" |

**`doseChecks`** (shown as "투여량 확인 N") = the number of rows whose dose status is above, below or unit_mismatch, **or** that carry a rounding note. This fixes the "0 dose problems" contradiction (audit §6.1).

#### 3.7.2 Card (expanded)

The anatomy follows Payne 2015's seven elements and the CDS Hooks card.

```
[■ 금기] 품종·유전자                                        이버멕틴 + 케토코나졸
MDR1 위험견에게 고용량 이버멕틴 + P-gp 억제제 병용                 ← summary = finding.title (text-sm 600)
이버멕틴은 정상적으로 P-당단백질에 의해 뇌로 들어가지 못합니다. …   ← consequence (2-line clamp + "더 보기" toggles full text; never truncated in data)
이 환자에서  콜리 — MDR1 위험: 높음 · ABCB1 유전자형: 미검사 · 고용량: 300 mcg/kg (기준 50 mcg/kg) · 케토코나졸 — P-gp 억제제
권장  ABCB1 유전자형을 확인하기 전에는 고용량 이버멕틴을 시작하지 마십시오.   ← actions[0..1]; the rest under 자세히
[이버멕틴 삭제 ✓권장]  [처방 수정]                         [예외 사유 입력 ▾]   ← suggestions (re-checked, §6.3) · focus-row · override (right, secondary)
▸ 자세히 — 기전(why[]), 대안(alternatives[], text only), 모든 권장, 규칙 MDR1_PGP_ML@1.1.0, 입력값(trace.inputs)
근거  Mealey 2001 · Mealey 2008 · Gramer 2010 · …                     ← CitationChips (DOI hrefs; external links open only on click)
```

**Element rules:**
- **Category label** is mapped by ruleId:

  | Category | Rules |
  |---|---|
  | 종 금기 | SPECIES_HARDSTOP |
  | 품종·유전자 | MDR1_PGP_ML |
  | 병용 주의 | CYP3A_INHIBITION, CYP_INDUCTION, GASTRIC_PH_AZOLE, NSAID_CORTICOSTEROID, SEROTONERGIC |
  | 효능군 중복 | NSAID_DUPLICATE, IMMUNOSUPPRESSION_ADDITIVE |
  | 질환 금기·주의 | DRUG_CONDITION |
  | 신기능 주의 | NSAID_RENAL, RENAL_ADJUST, METHIMAZOLE_CKD |
  | 알레르기 | ALLERGY_CLASS |
  | 용량 주의 | DOSE_RANGE, ENRO_FELINE_RETINA |

  EN labels: Species · Breed/genotype · Interaction · Duplication · Condition · Kidney · Allergy · Dose.
- **Text comes from the engine only.** Every clinical string is `finding.*[locale]`. **No prose is written at runtime.** Drug names come from `DRUG_BY_ID[id].name[locale]`.
- **"이 환자에서"** lists `finding.factors[].label[locale]` as plain text joined with " · ". No pills.
- **Collapsed card** = one 36 px line: badge + summary (1-line ellipsis with a `title`) + drugs + chevron. Contraindicated and major start expanded; the others start collapsed.
- **Hover/focus on a card** highlights its `rowIds` in the host grid (event `focus-row` with `{ highlight: true }`), using `#FFF4CC` row background in the host.
- **Hairlines.** Cards are separated by hairlines, not boxed. There is no coloured left border. Severity colour appears only in the badge.
- **"예외 사유 입력 ▾"** expands the inline override form (§3.9) inside the card. Submitting it logs `overridden` for that `ackKey`, so the gate skips the card later.

#### 3.7.3 Row badge (in the host's DUR cell)

- **Size:** 20 px, using the `SeverityBadge` `sm` style (§3.6 colours).
- **Text:** the highest severity among the row's cards, else `확인 필요`, `검토 안 함`, or `—`. A row with a rounding note adds "≈" after the label.
- **It is a `<button>`:**
  - `aria-label="이버멕틴: 금기 1건. 검토 패널에서 보기"`;
  - clicking it scrolls the panel to and expands the first card for that row, and focuses its summary heading.

#### 3.7.4 Floating launcher (`layout: floating`)

- **Appearance:** a button, bottom-right, 16 px inset, 40 px tall, 8 px radius, `shadow-pop`.
- **Label:** "DUR · 주의 1" (non-zero highest + count), or "DUR · 문제 없음" / "DUR · 검토 불완전".
- **States:** neutral, or critical when any contraindicated/major card is present.
- **Behaviour:** it toggles the drawer. Esc closes the drawer and returns focus to the launcher.

### 3.8 Gate dialog (`order-sign`)

```
┌──────────────────────────────────────────────────────────── 560px, radius 12, shadow-modal ┐
│ ▬▬▬ 4px top rule in the highest severity colour                                              │
│ [■ 금기] 저장 전 확인이 필요한 처방 1건                                         [×]          │ title (aria-labelledby)
│ 초코 · 개 · 24.0 kg · 러프 콜리                                                              │ one-line identity (needPatientBanner:false)
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Card (expanded, as §3.7.2, max 3 expanded; further cards collapsed with "외 N건")              │
│   └ 예외 사유 (radiogroup, required)                                                         │
│       ○ 임상적 판단: 이점이 위험보다 큼 (모니터링 계획 기록)      NV-J2                           │
│       ○ ABCB1(MDR1) 유전자형 정상 확인                         NV-GEN                          │
│       ○ … (allowed reasons for this rule, §3.9)                                              │
│       ○ 환자 정보가 실제와 다름 → 차트 수정                       NV-DATA (does not override)     │
│     코멘트 (금기: 10자 이상) [textarea]   ☑ 보호자에게 위험을 설명함 (금기만)                        │
│     inline validation message (aria-live polite)                                             │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ 확인 필요 1건: 아목시실린·클라불란산 빈도 미입력 (non-blocking line, only if present)               │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [예외 처리하고 저장] (outline; disabled until every blocking card is valid)   [처방으로 돌아가기] (ink, default focus) │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Roles and focus:**
- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` = title, `aria-describedby` = the first card's consequence.
- **Initial focus** goes to "처방으로 돌아가기". The focus trap cycles within the dialog.

**Keys:**
- **Esc**, the × button and clicking the scrim all close the dialog as "back to prescription". The gate resolves `{ proceed: false }`. Nothing is saved.
- **Enter** is never bound to override. Both footer buttons are `type="button"`, and the textarea's Enter inserts a newline.
- There are no single-letter shortcuts.

**Drafts.** The reason, comment and checkbox drafts are kept per `ackKey` for the encounter, so reopening the gate restores them.

**"예외 처리하고 저장"** logs one `overridden` Feedback per blocking card, closes the dialog and resolves `{ proceed: true, feedback }`. The host then writes the chart lines (§3.10).

**Suggestions inside the gate** (e.g. "이버멕틴 삭제"):
- emit `remove-row` / `update-row`;
- log `accepted` with `acceptedSuggestions`;
- close the gate with `{ proceed: false, focusRowId }`.

The vet then saves again: the change triggers a re-check, so the gate runs on fresh cards.

**NV-DATA** emits `fix-chart` with the field (§3.9), closes the gate with `{ proceed: false }` and logs **nothing**.

**Return focus.** On close, focus returns to the host element that had focus before `gate()` was called. This is recorded as `document.activeElement` at call time, which is the host's save button in light DOM.

### 3.9 Override reasons

**Code system:** `https://nuvovet.example/CodeSystem/dur-override` (a placeholder domain; never fetched). Lineage is from Jang et al. 2016 (doi:10.4258/hir.2016.22.1.39): HIRA's 11 codes (A, B, C, F–L, P) and the proposed six-code revision J1–J6, which covered 84.2 % of overrides in that study.

| Code | KO display | EN display | Lineage | Allowed for (ruleIds) |
|---|---|---|---|---|
| NV-J2 | 임상적 판단: 이점이 위험보다 큼 (모니터링 계획 기록) | Clinical judgement: benefit outweighs risk (monitoring plan recorded) | J2 | all |
| NV-INT | 의도된 병용, 혈중농도·반응 모니터링 예정 | Intended combination; levels/response will be monitored | J2 | CYP3A_INHIBITION, CYP_INDUCTION, GASTRIC_PH_AZOLE, NSAID_CORTICOSTEROID, SEROTONERGIC, MDR1_PGP_ML |
| NV-J4 | 기존 약을 이번 처방으로 중단·교체함 | Existing drug stopped or replaced by this prescription | A/C/F/H/I/J → J4; L → J3 | all interaction + duplication rules (above + NSAID_DUPLICATE, IMMUNOSUPPRESSION_ADDITIVE) |
| NV-J1 | 단회·간헐·필요시(PRN) 투여 | Single, intermittent or as-needed dose | P, G → J1 | all |
| NV-J5 | 수술·검사 전후 투여 | Peri-operative or peri-procedural use | J5 | all |
| NV-J6 | 응급 상황 | Emergency | J6 | all |
| NV-GEN | ABCB1(MDR1) 유전자형 정상 확인 | ABCB1 (MDR1) genotype confirmed normal | vet-specific | MDR1_PGP_ML |
| NV-DATA | 환자 정보가 실제와 다름 → 차트 수정 | Patient data is wrong — fix the chart | — | all. **Does not override:** opens the chart field and re-checks |
| NV-OTH | 기타 (직접 입력) | Other (free text) | free text | all; comment required |

**NV-GEN behaviour.** Choosing it as a reason records the override. It does **not** silently change `mdr1Status`. To change the genotype, the vet uses NV-DATA → `fix-chart: 'mdr1'`, which edits the patient's 특이사항 and re-checks.

**What each severity requires:**

| Severity | Reason | Comment | ☑ 보호자에게 위험을 설명함 |
|---|---|---|---|
| contraindicated | coded reason required | must pass the free-text check | must be ticked |
| major | coded reason required | must pass the free-text check only when the reason is NV-OTH | not required |
| moderate / minor | none | none | none; optional "확인함" logs `accepted` |

There is no hard block. HIRA grade C ("must not be prescribed") is a human-insurance rule, and veterinary discretion applies. The Jang 2016 grades A (reason optional) and B (reason required) map to minor/moderate and major/contraindicated respectively.

**Free-text check** (`commentCheck.js`). Jang 2016 found 72.2 % of overrides were free text, and 21.1 % of that free text was meaningless. A comment is rejected when any of these holds:
1. it is shorter than 10 characters after trimming;
2. more than 50 % of its characters are one repeated character;
3. it consists only of Hangul compatibility jamo (U+3131–U+318E) plus spaces and punctuation;
4. it has no run of at least 2 Hangul syllables or 2 Latin letters.

| Input | Result |
|---|---|
| "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ" | rejected (rules 2, 3) |
| "aaaaaaaaaa" | rejected (rule 2) |
| "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊ" | rejected (rule 3) |
| "1234567890" | rejected (rule 4) |
| "케토코나졸 감량 병용, 2주 후 재검" | accepted |

**Rejection messages:**
- KO: "구체적인 사유를 10자 이상 입력하십시오 (예: 감량 병용, 2주 후 혈중농도 측정)."
- EN: "Enter a specific reason of at least 10 characters (e.g. reduced dose, recheck levels in 2 weeks)."

### 3.10 Acknowledgement log

The log uses the CDS Hooks Feedback shape:

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

**Storage:**
- in memory, mirrored to `localStorage['nv-dur-log']` inside try/catch;
- capped at 200 entries, oldest dropped;
- the page works identically when storage throws.

**Export.** "기록 내보내기" in the demo bar downloads `nuvovet-dur-log-<date>.json` via a Blob URL. This creates no network request.

**Chart line.** The host appends one line per overridden card to the 진료기록 footer:
> `DUR · 금기 1건 예외 처리 (NV-J2) · 김민서 (가상) 14:32 · 규칙 MDR1_PGP_ML@1.1.0 · 엔진 1.2.0`

This mirrors HIRA's reason transmission and is printed with the chart.

### 3.11 Widget chrome copy (KO / EN)

These are the widget's own strings, in `src/portfolio/emr/widget/strings.js`. Clinical text always comes from the engine.

| Key | KO | EN |
|---|---|---|
| panel.title | nuvovet DUR | nuvovet DUR |
| panel.rules | 규칙 {n}개 | {n} rules |
| panel.empty | 처방을 입력하면 검토합니다 | Add a prescription to start the review |
| verdict.none | 규칙상 문제 없음 | No rule findings |
| verdict.incomplete | 검토 불완전 | Review incomplete |
| counts.doseChecks | 투여량 확인 {n} | Dose checks {n} |
| group.confirm | 확인 필요 | Needs input |
| notes.title | 투약 안내 | Administration notes |
| card.patient | 이 환자에서 | In this patient |
| card.recommend | 권장 | Recommended |
| card.details | 자세히 | Details |
| card.evidence | 근거 | Evidence |
| card.mechanistic | 기전 근거 — 인용 연구 없음 | Mechanistic rationale — no study cited |
| card.edit | 처방 수정 | Edit prescription |
| card.override | 예외 사유 입력 | Enter override reason |
| card.ack | 확인함 | Acknowledge |
| sugg.delete | {drug} 삭제 | Remove {drug} |
| sugg.strength | {product} {plan}로 변경 | Change to {plan} of {product} |
| sugg.recommended | 권장 | Recommended |
| gate.title | 저장 전 확인이 필요한 처방 {n}건 | {n} prescription(s) need review before saving |
| gate.back | 처방으로 돌아가기 | Back to prescription |
| gate.proceed | 예외 처리하고 저장 | Override and save |
| gate.comment | 코멘트 | Comment |
| gate.commentHint.contra | 10자 이상, 구체적으로 | At least 10 characters, specific |
| gate.owner | 보호자에게 위험을 설명함 | Risk explained to the owner |
| gate.more | 외 {n}건 | {n} more |
| coverage.checked | 검토함 | Checked |
| coverage.notChecked | 검토 안 함 | Not checked |
| coverage.items | 종·품종·병용·중복·질환·신기능·알레르기·용량 | species · breed · interactions · duplication · conditions · kidney · allergy · dose |
| coverage.missing | 연령·임신/수유·투여기간·타 병원 처방 | age · pregnancy/lactation · duration · other clinics' prescriptions |
| link.workbench | 전체 분석 열기 | Open full analysis |
| marker | 교육용 프로토타입 | Educational prototype |
| marker.tooltip | 교육용 프로토타입입니다. 임상 검증을 거치지 않았으며 진료에 사용하지 마십시오. 모든 검토는 이 브라우저 안에서만 실행됩니다. | Educational prototype, not clinically validated. Do not use for patient care. Every check runs in this browser only. |
| species.unsupported | 지원하지 않는 종 — 개·고양이만 검토합니다 | Unsupported species — only dogs and cats are reviewed |
| badge.unmapped | 검토 안 함 | Not reviewed |
| row.goto | 행으로 이동 | Go to row |
| launcher | DUR · {label} | DUR · {label} |

The §4.3 confirm reasons have their own copy in that section.

**Copy rules:**
- Never say "안전" or "safe".
- No em dash in widget chrome, except the engine headline and the two strings above that copy the engine's style.
- The formal "~하십시오" ending is used only in engine strings.

### 3.12 Accessibility

**Panel:**
- `<aside role="region" aria-label="nuvovet DUR 처방 검토">`.
- The verdict is an `<h2>` and each card summary an `<h3>`.
- Disclosures are `<button aria-expanded aria-controls>`.

**Live region:**
- one `aria-live="polite"` node;
- it announces "처방 검토: 금기 1건, 주의 1건" only when counts or verdict change, at most once per 1 s;
- it never announces on every keystroke.

**Focus:**
- **The widget never moves focus on `check()`.** Focus moves only on a user action inside the widget, or when the gate opens.
- Tab order is natural DOM order: the docked panel follows the EMR content.
- A skip link inside the EMR action bar reads "DUR 검토로 이동".

**Gate:**
- focus trap;
- Esc rules as in §3.8;
- `inert` is applied to the panel host and to the EMR root while the gate is open. The host EMR root gets `inert` through the `gate-open` event, which the demo host honours.

**Floating drawer:** a focus trap only while open, and Esc closes it.

**Bottom sheet:** a `role="dialog"` that is not modal when collapsed, and Esc collapses it.

**Targets:** at least 24 px; badges in the grid have a 24 px hit area via padding. Every icon-only button has an `aria-label`.

**Colour:** never the only signal. Every badge has a word, and the critical card adds the `OctagonX` icon.

**Reduced motion:** gate and drawer animations become a 100 ms fade.

**Contrast:** the widget uses the DESIGN_SYSTEM §3.2 tokens. The host EMR primary button is `#2F5E9E` with white, 6.6:1.

**Print:**
- the panel is hidden in host print;
- chart acknowledgement lines and the watermark print.

### 3.13 Staying non-blocking

- **`check()` performance.** It is synchronous and must finish in under 50 ms for 10 rows (measured; engine `trace.ms` is about 1–2 ms).
- **Debounce.** The 300 ms debounce runs in the host. The widget never debounces `gate`.
- **Stable cards.** A re-check replaces cards by stable uuid, so expanded or collapsed state and in-progress override drafts survive edits that don't change the card's inputs.
- **No focus theft.** Typing in the grid can never open the gate or move focus. A Playwright test types a full V7 prescription and asserts `document.activeElement` stays in the grid and no `alertdialog` exists.

---

## 4. EMR row → engine input mapping

The reference implementation is Appendix C. Every rule here is implemented and exercised by the §8 scenarios.

### 4.1 Patient and visit

| EMR field | Engine field | Rule |
|---|---|---|
| 종 (`Canine`/`dog`/`개`/`견`, `Feline`/`cat`/`고양이`/`묘`) | `species` | Anything else → **unsupported**: `analyze()` is NOT called (it would check as a dog). |
| 품종 `A/B` | `breedId` via `resolveBreed(half, species)` | Try each half in order. Unresolved dog breed → adapter note `breed_unresolved`, plus engine `factorsMissing: breed` (MDR1 handled by the engine as "unknown", never "normal"). |
| 성별 (5 values) | `sex`, `neutered` | `Spayed*` → female, true; `Neutered*` → male, true; `Intact Female` → female, false; `Intact Male` → male, false; `Unknown` → null, null |
| 생년월일 + visit date | `ageYears` | floor to 0.1 y; passed through (no rule uses age, which is shown in the coverage strip) |
| 체중 + 측정일 | `weightKg` | Blank → null (engine `weight_missing`, verdict incomplete). Older than 30 days → adapter note `weight_stale` ("체중 {n}일 전 측정"): still used, but shown with its date. |
| 검사결과 creatinine | `labs.creatinine` (mg/dL) | Most recent within 90 days, else note `lab_stale_creatinine`. `µmol/L` ÷ 88.4, rounded to 0.01. |
| 검사결과 ALT | `labs.alt` (U/L) | most recent within 90 days |
| 진단명 code | `conditions` via `conditionMap` | Unmapped codes are listed in `unmappedDx` (shown under 자세히 → 입력값) and never guessed from names. |
| 알레르기 coded | `allergies` | must be an `ALLERGY_BY_ID` key |
| 알레르기 free text | — | adapter note `allergy_free_text`: "자유 입력 알레르기는 검토하지 않았습니다 — 코드로 입력하십시오" |
| MDR1 (특이사항 genotype) | `mdr1Status` | `unknown` unless a coded genotype is present |
| 임신/수유 | `pregnant`/`lactating` | The demo EMR has no field: always false, listed as "검토 안 함" |

### 4.2 Rx row

| EMR field | Engine field | Rule |
|---|---|---|
| 구분 | — | only `Rx` rows are sent |
| 상품코드 | `drugId`, `strengthId` | `productMap` is **the only source of strength and concentration.** Unknown code → `unmapped` (badge "검토 안 함"); the row is excluded from `meds`. Never fuzzy-match names to products at runtime. |
| 단위 + 투여량 | `dose: {value, unit}` | See the unit table below |
| 횟수 Tt + 일수 Dy + 용법 | `frequency` | 용법 first via `normalizeFrequency` (e.g. "격일" → q48h, "월1회" → monthly, "필요시" → prn, "bid" → q12h). Otherwise Tt: 1→q24h, 2→q12h, 3→q8h, 4→q6h, 6→q4h. **Tt1 with Dy1 → `once`.** Blank Tt and no recognised 용법 → null + `freq_missing`. Other Tt (5, 0.5, 8…) → null + `freq_unmapped`. |
| 일수 Dy | `durationDays` | passed through. The engine has no duration rule (§5, D5), so the coverage strip says so. |
| 경로 Rt | `route` | PO/IV/SC/IM pass through. `Top` → `spot-on` if the product form is spot-on, else `topical`. `Eye`/`Ear`/`Inh` → passed as-is + `route_no_reference` (no protocol matches). Blank → `route_missing`. |
| 계산량 (host) | cross-check only | For `mg/kg` and `mcg/kg` rows: if \|Qty × factor × weight − EMR 계산량(mg)\| / expected > 1 % → row note `calc_mismatch`: "EMR 계산량 불일치 — 체중·단위를 확인하십시오". Never used as the dose. |
| (none) | `protocolId` | Protocol policy, below |
| protocol choice (vet) | `protocolId` | `urn:nuvovet:protocol-choice` extension; overrides the policy |

**Unit table:**

| EMR unit (case-insensitive) | Engine unit | Notes |
|---|---|---|
| `mg/kg`, `mcg/kg` (`ug/kg`, `µg/kg`), `IU/kg`, `mL/kg` (`cc/kg`) | same | per-kg |
| `mg`, `mcg` (`ug`, `µg`), `g`, `IU`, `mL` (`cc`) | same | per-animal; volumes need a liquid product (from the code) |
| `EA`, `T`, `tab`, `정`, `캡슐`, `cap`, `개` | product form: tablet→`tablet`, chewable→`chewable`, capsule→`capsule`, spot-on→`pipette` | Liquid product + EA → `unit_count_liquid` (확인 필요). The count must be a multiple of the engine's `splitStep(strength)` (¼ if quarter-scorable, ½ if splittable, else 1; capsules 1), else `split_not_allowed`. |
| `포`, `앰플`/`amp`, `바이알`/`vial`, `gtt`, `방울` | — | `unit_needs_record`: amount per sachet/ampoule/drop is unknown → `dose: null`. Interaction, species, condition and allergy rules still run. |
| anything else | — | `unit_unknown`, `dose: null`. **Never treated as mg.** |

**Protocol policy** (`chooseProtocol`, Appendix C):
1. Take `protocolsFor(drugId, species)`.
2. Keep those whose `route` or `altRoutes` include the row route. If none remain → `protocol_route`, or `protocol_none` when the drug has no protocol for the species at all (permethrin, acetaminophen).
3. If any remaining protocol's frequency equals the row frequency, keep only those.
4. If more than one remains, keep those linked to a mapped diagnosis via `PROTOCOL_CONDITIONS`.
5. If exactly one remains, use it.
6. If all remaining protocols are in one `SAME_INDICATION` group (`ac_dog_eu` + `ac_dog_us`), use the group's primary and show the row note "EU/UK 라벨 기준(자동)".
7. Otherwise → `protocol_indication`, with the options listed. The row shows a chip "확인 필요 · 적응증 선택 ▾" (a select of `indication[locale]` values). The choice is sent as `protocol-choice`.

### 4.3 Ambiguity: what is shown, and what is never done

Every confirm reason sets the row badge to "확인 필요" (or "참고 용량 없음" for `protocol_none`) and makes `verdict.complete = false`.

| Reason key | KO row text | EN | Never do |
|---|---|---|---|
| `unit_count_liquid` | 확인 필요 · 액상 제품은 mL로 입력하십시오 | Needs input · enter liquids in mL | assume 1 EA = 1 mL or 1 vial |
| `unit_needs_record` | 확인 필요 · 포·앰플·방울당 함량 기록이 없습니다 | Needs input · no amount per sachet/ampoule/drop | assume a compounding recipe |
| `unit_unknown` | 확인 필요 · 단위를 인식할 수 없습니다 | Needs input · unit not recognised | treat as mg |
| `freq_missing` | 확인 필요 · 횟수 미입력 | Needs input · frequency missing | assume q24h |
| `freq_unmapped` | 확인 필요 · 용법을 입력하십시오 (예: 격일, 월1회) | Needs input · enter the schedule (e.g. every other day) | round Tt |
| `route_no_reference` | 참고 용량 없음 · 이 경로의 참고 용량이 없습니다 | No reference for this route | check against the PO protocol |
| `route_missing` | 확인 필요 · 경로 미입력 | Needs input · route missing | assume PO |
| `protocol_route` | 확인 필요 · 이 경로의 참고 용량이 없습니다 | Needs input · no reference for this route | pick another route's protocol |
| `protocol_none` | 참고 용량 없음 · 용량 검토 안 함 | No reference dose · dose not checked | — |
| `protocol_indication` | 확인 필요 · 적응증 선택 | Needs input · choose the indication | pick the lower or higher dose |
| `split_not_allowed` | 확인 필요 · 이 제형은 {step} 단위로만 나눌 수 있습니다 | Needs input · this product splits only in {step} units | accept the fraction |
| `calc_mismatch` (note, not confirm) | EMR 계산량 불일치 — 체중·단위를 확인하십시오 | EMR calculated amount differs — check weight and unit | use the EMR value |
| `weight_stale` (note) | 체중 {n}일 전 측정 | Weight measured {n} days ago | — |
| `breed_unresolved` (note) | 품종을 인식하지 못했습니다 — MDR1 위험은 미상으로 검토합니다 | Breed not recognised — MDR1 risk treated as unknown | treat as low risk |
| `allergy_free_text` (note) | 자유 입력 알레르기는 검토하지 않았습니다 | Free-text allergies were not checked | parse the text |
| unmapped product | 검토 안 함 · 처방집에 없는 제품 | Not reviewed · not in the formulary | treat as "no findings" |
| unsupported species | 지원하지 않는 종 | Unsupported species | run as a dog |

**Engine validation notes** also force `complete = false`. These are notes with category `validation`, including `weight_missing`, `freq_*`, `dose_strength_*`, `dose_unit_*`, `dose_noref_*` and `unknown_drug_*`. So does `factorsMissing` matching `/^(weightKg|protocol\.|frequency\.)/`.

---

## 5. Engine accuracy changes

WP1 owns `src/portfolio/engine/**`.

| # | Defect (emr track §5.3, reproduced) | Required change | Status in this spec |
|---|---|---|---|
| D1 | Count entries are compared against range bounds with no tolerance. Maropitant ½ × 16 mg for a 3.8 kg dog gives **moderate DOSE_RANGE (1.053×)**; carprofen 2 × 25 mg for an 11 kg dog gives **moderate (1.033×)**. Both are label-consistent. | In `buildDoseRow`, when the dose unit is a count (`entersProduct && dimension === 'count'`), pass `tolerance: ROUNDING_TOLERANCE` (0.10) to `compareWithProtocol`. When the status is `within` **only because of** the tolerance, set `cmp.tolerated = true` and emit a rounding note (§5.1). | **Prototyped and verified:** E19, E20 → `none` |
| D2 | Mass and volume entries flip on float noise: meloxicam 0.21 mL (0.098 mg/kg vs 0.1) gives **minor DOSE_RANGE below**; 0.0667 mL/kg (1.0005 mg vs 1.0) gives moderate "above". | Add `export const BOUND_TOLERANCE = 0.02`. `compareWithProtocol({…, tolerance = BOUND_TOLERANCE})` uses `eps = Math.max(1e-9, tolerance)` in every bound comparison: per-dose, per-day and frequency-daily. | **Prototyped and verified:** E06b → no DOSE_RANGE |
| D3 | A suggested plan can breach a safety ceiling: cat 3.5 kg, enrofloxacin 5 mg/kg → plan "22.7 mg 정제 1정" = 6.49 mg/kg/day, above the 5 mg/kg/day retinal ceiling, with only a rounding note. | **The widget never offers a plan or strength as a one-click suggestion unless re-checked** (§6.3). Engine change not required. | Verified: applying 1 × 22.7 → **major ENRO_FELINE_RETINA**; ½ × 22.7 → minor DOSE_RANGE below. So no suggestion is offered for E23. |
| D4 | ½ of a non-splittable product is accepted silently (robenacoxib 20 mg ½정). | **Adapter:** `split_not_allowed` using `splitStep()` (export `splitStep` from `engine/index.js`). | Verified: E21 → `complete=false` |
| D5 | 일수 Dy is ignored (robenacoxib "최대 3일"). | **Not fixed in this phase.** `durationDays` exists in protocols but mixes typical courses (metronidazole 7 d) with label maxima (robenacoxib 3 d). Adding a rule needs sourced `maxDurationDays` per protocol, which is clean-room work for a later phase. The coverage strip lists "투여기간" under 검토 안 함. | Documented limit |
| D6 | `weightKg: null` → verdict `none` | The widget shows **검토 불완전**, never "규칙상 문제 없음" (§3.7.1) | Verified: E14 |
| D7 | `{1,'정'}` with no strength → verdict `none` | The adapter always supplies `strengthId` from the product code. Engine `dose_strength_*` notes force incomplete. | Covered by design |
| D8 (new, audit §6.1) | "0 dose problems" next to "Check amount" warnings | `doseChecks` = status ∉ {within, no_reference} **or** a rounding note on the row (§3.7.1). In the workbench, WP5 renames `rv.doseProblems` to "투여량 확인 {n}건" / "{n} dose checks" with the same definition. Add `counts.doseChecks` to `computeVerdict`; keep `doseProblems` for existing tests. | To build |

### 5.1 Exact engine changes (WP1)

**1. `dose.js`:**
- add `export const BOUND_TOLERANCE = 0.02` next to `ROUNDING_TOLERANCE`;
- change the `compareWithProtocol` signature to `{ protocol, amount, weightKg, species, frequency, tolerance = BOUND_TOLERANCE }`;
- `const eps = Math.max(1e-9, tolerance)`;
- after the status is computed, also compute the status with `eps = 1e-9`. If the strict status ≠ `within` and the tolerant status = `within`, return `tolerated: true`.

**2. `buildDoseRow`:**
- `const tol = entersProduct && parsedUnit.dimension === 'count' ? ROUNDING_TOLERANCE : BOUND_TOLERANCE`, passed to `compareWithProtocol`;
- if `cmp.tolerated && !rounding`, set:
  ```js
  rounding = { deviation: ratio - 1 (signed, relative to the nearer bound), text: {
    en: `${administration.en} gives ${v} ${u}, ${sign}${pct}% from the reference ${range}; within the rounding allowance for this product.`,
    ko: `${administration.ko} 투여 시 ${v} ${u}으로 참고 범위(${range})와 ${sign}${pct}% 차이가 있으나 이 제형의 분할 허용 범위 안입니다.` } }
  ```
  `v` / `u` / `range` / `sign` / `pct` are formatted like the existing rounding notes, with `fmtNum`.
- The engine then emits it as `rounding_<drugId>_<index>` (existing path).
- **Updated D1 expectation:** E19 and E20 also emit `rounding_maropitant_0` / `rounding_carprofen_0`. These are the only differences from the prototype output pasted in §8.1.

**3. `findings.js` `computeVerdict`:** add `counts.doseChecks` (D8).

**4. `index.js`:**
- export `BOUND_TOLERANCE`, `splitStep`, and `ENGINE_VERSION = '1.2.0'` (an engine-wide version used in logs; rule versions are unchanged);
- re-export `canonicalJson`, `fnv1a` from `hash.js`.

**5. Tests:**
- new cases in `engine/__tests__/dose.test.js` for D1/D2, including "≥ 2× max is still major", "5 % above max with a mg/kg entry is still moderate above", and "11 % above max with a count entry is still moderate above";
- all five golden cases unchanged;
- `rules.test.js:293` (`doseProblems` 1) unchanged.

**Safety ceilings are unaffected.** ENRO_FELINE_RETINA uses `exposure24hPerKg` directly, with no tolerance: E08 (34 mg = 9.7 mg/kg/day) is still major.

---

## 6. From engine result to cards

### 6.1 Building cards (`cards.js`)

**One card per engine `Finding`.** Findings are already merged by `problemKey`. The fields:

| Field | Value |
|---|---|
| `summary` | `title[locale]` |
| `indicator` | per §3.6 |
| `detail` | Markdown: `consequence`, `why[]` bullets, `actions[]` bullets, `alternatives[]` bullets |
| `source.topic` | `{ code: ruleId, display: category }` |
| `extension.rowIds` | the rows whose `drugId ∈ finding.drugIds` (all rows of that drug) |

**Sort order:**
1. severity rank;
2. then the number of factors (as the engine does);
3. then the order of first row.

**Blocking:** `blocking = severity ∈ {contraindicated, major}`.

**Notes are not cards.**
- They go to the "투약 안내" checklist, in this order: administration, lab, monitoring, caution, rounding.
- Each shows its drug name and text, plus source chips when `sources` is non-empty.
- **Validation notes** go to the "확인 필요" group instead.

### 6.2 Coverage strip

These sets are fixed for engine 1.2.0:
- **Checked:** species, breed/MDR1, interactions, duplication, conditions, kidney, allergy, dose.
- **Not checked:** age, pregnancy/lactation, duration, other clinics' prescriptions.

Tested against `RULE_LAYERS`: every rule's layer must map to one "checked" item, so adding a rule without updating the strip fails a test.

### 6.3 Suggestions (`suggestions.js`), re-checked

**Candidates per card:**
1. **Delete:** for each `drugId` in `finding.drugIds`, the action "{drug} 삭제".
2. **Strength change:** for each involved row with `dose.suggestedStrengthId ≠ row strength`, a candidate whose `productCode` is a mapped product for `suggestedStrengthId`, keeping the per-kg dose.
3. **Plan change:** for a count-entered row with a rounding note, the counts that are multiples of `splitStep` within ±1 step of the calculated amount.

**Re-check:** each candidate is applied to a copy of the visit, then `adapt` + `analyze` run.

**Offered only if both hold:**
- the card's `problemKey` is gone, or its severity drops (for delete/strength) / the rounding note clears (for plan);
- no new finding appears, and no existing finding's severity rises.

**What is shown:**
- at most 2 suggestions per card;
- `isRecommended` = the first offered;
- alternatives from other drug classes (`finding.alternatives`) are **text only** under 자세히, and never actions.

**Verified examples:**

| Visit | Candidate | Result | Offered? |
|---|---|---|---|
| V1 | delete ivermectin | none | yes, recommended |
| V1 | delete ketoconazole | MDR1_PGP_ML still contraindicated | no |
| E23 | 1 × 22.7 mg | major ENRO_FELINE_RETINA | no |
| E23 | ½ × 22.7 mg | new minor DOSE_RANGE | no |

For E23 the card area shows only the engine's rounding note text, and no suggestion.

---

## 7. Routes, builds and links

| Target | URL / file | Notes |
|---|---|---|
| In-app demo | `/dur#/emr` → replaced by `#/emr/V1`; `/dur#/emr/:visitId` (V1–V10); `?lang=en` optional | `matchRoute`: `seg[0]==='emr'` → name `emr`, `params.visitId = seg[1] ?? null`. Unknown visitId → `#/emr/V1`. `EmrDemoPage` replaces the portfolio header with the 40 px demo bar (§2.2) and lazy-loads the host + widget. |
| Standalone single file | `dist-portfolio/index.html#/emr/V1` | Same code. Fonts: the widget uses `fonts:'inherit'` (`fonts-standalone.css` is already on the document). CSP unchanged except `font-src data:`. Zero requests. |
| Widget bundle | `npm run build:widget` → `dist-widget/nuvovet-dur.iife.js` (`window.NuvoVetDUR`) and `dist-widget/nuvovet-dur.js` (ESM) | `vite.widget.config.js`: library mode; `define: {'process.env.NODE_ENV': '"production"'}`; `cssCodeSplit:false`; `rolldownOptions.output: { codeSplitting:false, exports:'named' }`; `plugins: [fontSubsetImport(), react()]` (no Tailwind). Fonts imported with `?subset` and subset to the characters in `src/portfolio/**` (stack track: 2,009 → 46 kB). Budget ≤ 250 kB gzip. |
| Widget demo pages | `frontend/widget-demo/index.html` (plain-HTML mock EMR table, no React, calling `NuvoVetDUR.create().mount()`); `frontend/widget-demo/hostile.html` | Hostile host adapted from `/tmp/claude-0/uiresearch/stack/host/emr.html`: `html{font-size:62.5%}`, `* {…!important}`, `button,input,select{all:unset}`, `[role=dialog]{display:none}`, `[data-state=open]{opacity:.2}`, `* { --primary: lime !important }`, fake "Pretendard Variable", sticky header `z-index:99999`. `npm run dev:widget` serves `widget-demo/` with the built bundle. |

**Links into the demo:**
- **Case study `#/`:** the primary CTA "EMR 데모 열기" → `#/emr/V1`. The hero's live crop is the widget panel for V1, rendered inert.
- **Cases `#/cases`:** each golden card has a secondary link "EMR에서 보기" → `choco`→V1, `kongyi`→V2, `nabi`→V3, `mochi`→V4, `daebak`→V5.
- **Workbench header:** the same "EMR에서 보기" link for golden cases.
- **How it works:** a section "EMR 연동 방식" (≤ 120 words, plus the §3.3 request/response excerpts as code) linking to `#/emr/V1`.
- **The portfolio header nav** gets "EMR 데모".

**Links out of the demo:**
- **Widget card "전체 분석 열기"** → `${workbenchBase}/case/custom?s=${stateParam(caseInput)}`, using `caseModel.stateParam` and `router.casePath` (`workbenchBase` is `#` in-app).
- **Demo bar "사례로"** → `#/case/<golden id>` for V1–V5, and `#/cases` otherwise.

---

## 8. Accuracy test plan

### 8.1 Scenarios: EMR rows → exact expected output

**How these were produced.** Each scenario was run with `node /tmp/claude-0/uiresearch/spec/scenarios.mjs` through the Appendix C adapter:
- **Current column:** the repo engine as of commit `7c37bca`.
- **Binding column:** the engine with the §5.1 D1/D2 patch, prototyped in `/tmp/claude-0/uiresearch/spec/pf-fixed`. Plus the two rounding notes §5.1 adds to E19 and E20.

WP2's `src/portfolio/emr/__tests__/scenarios.test.js` MUST assert every line of the binding column: `verdict.level`, `complete`, the exact multiset of `ruleId/severity[drugIds]`, each dose's `perDoseMg` and `status`, the note ids, and each row's `protocolId` and confirm reasons. Fixtures are in Appendix B.

| ID | Scenario | Binding verdict | complete | Findings (ruleId/severity [drugs]) | Must NOT appear | Gate opens at save? |
|---|---|---|---|---|---|---|
| E01 | V1 초코: ivermectin + ketoconazole, collie | contraindicated | true | MDR1_PGP_ML/contraindicated [ivermectin+ketoconazole] | DOSE_RANGE | yes (1 card) |
| E02 | V2 콩이 | moderate | true | CYP_INDUCTION/moderate [phenobarbital+ciclosporin]; IMMUNOSUPPRESSION_ADDITIVE/minor [ciclosporin+prednisolone]; CYP_INDUCTION/minor [phenobarbital+prednisolone] | — | no |
| E03 | V3 나비 | moderate | true | METHIMAZOLE_CKD/moderate [methimazole] | any drug–drug rule | no |
| E04 | V4 모찌: permethrin, cat | contraindicated | **false** (protocol_none; dose not checked) | SPECIES_HARDSTOP/contraindicated [permethrin] | — | yes |
| E05 | V5 대박 (negative control) | none | true | — | any | no; panel "규칙상 문제 없음" |
| E06 | V6 보리 | moderate | true | NSAID_RENAL/moderate [meloxicam+furosemide+benazepril] | DOSE_RANGE | no |
| E06b | V6, meloxicam typed as 0.21 mL | moderate | true | NSAID_RENAL/moderate [meloxicam+furosemide+benazepril] | **DOSE_RANGE** (current engine: minor below; fixed by D2) | no |
| E07 | V7 해피 (Tt4) | major | true | NSAID_CORTICOSTEROID/major [carprofen+prednisolone]; SEROTONERGIC/moderate [tramadol+trazodone] | DOSE_RANGE | yes (1 card: NSAID_CORTICOSTEROID only) |
| E07b | V7, tramadol Tt3 | major | true | + DOSE_RANGE/minor [tramadol] (q8h daily 15 mg/kg vs protocol q6h 20 mg/kg/day; genuine) | — | yes (1 card) |
| E08 | V8 레오: enrofloxacin ½×68 mg + meloxicam inj Dy1 | major | true | ENRO_FELINE_RETINA/major [enrofloxacin] | SPECIES_HARDSTOP | yes |
| E08b | V8, meloxicam Dy3 | major | true | ENRO_FELINE_RETINA/major [enrofloxacin]; SPECIES_HARDSTOP/major [meloxicam] | — | yes (2 cards) |
| E09 | V9 두부: fluoxetine, epileptic poodle | contraindicated | true | DRUG_CONDITION/contraindicated [fluoxetine] | — | yes |
| E10 | V10 코코: penicillin allergy + amoxicillin-clavulanate | major | true | ALLERGY_CLASS/major [amoxicillin_clavulanate] | — | yes |
| E11 | hepatopathy + phenobarbital | contraindicated | true | DRUG_CONDITION/contraindicated [phenobarbital] | — | yes |
| E12 | ketoconazole + omeprazole | moderate | true | GASTRIC_PH_AZOLE/moderate [ketoconazole+omeprazole] | — | no |
| E13 | carprofen + meloxicam | major | true | NSAID_DUPLICATE/major [carprofen+meloxicam] | — | yes |
| E14 | no weight | none | **false** (weight_missing; weightKg) | — | — | no; panel "검토 불완전" |
| E15 | maropitant PO, no diagnosis | none | **false** (protocol_indication) | — | — | no; row chip "적응증 선택" |
| E16 | blank Tt + unmapped product RX-XYZ-999 | none | **false** (freq_missing; unmapped) | — | — | no |
| E17 | ivermectin entered as "포", collie | contraindicated | **false** (unit_needs_record) | MDR1_PGP_ML/contraindicated [ivermectin+ketoconazole] | — | yes |
| E18 | rabbit | unsupported | — | `analyze` not called | any | no |
| E19 | D1: maropitant ½×16 mg, 3.8 kg dog | none | true | — (current engine: DOSE_RANGE/moderate) | DOSE_RANGE | no |
| E20 | D1: carprofen 2×25 mg, 11 kg dog | none | true | — (current engine: DOSE_RANGE/moderate) | DOSE_RANGE | no |
| E21 | D4: robenacoxib 20 mg ½정 | none | **false** (split_not_allowed) | — | — | no |
| E22 | stale weight (45 d) + 계산량 mismatch (14 vs 15 mg) | none | true | — | — | no; notes `weight_stale`, `calc_mismatch` |
| E23 | D3: cat enrofloxacin 5 mg/kg, 22.7 mg tablet | none | true | — | — | no; **no suggestion offered** (§6.3) |

**Raw output, binding column.** This is the `pf-fixed` engine before the §5.1 rounding-note addition. The binding expectation adds `rounding_maropitant_0` to E19 and `rounding_carprofen_0` to E20.

```
E01 | V1 초코 — 이버멕틴 + 케토코나졸 (콜리)
  verdict=contraindicated complete=true
  findings: MDR1_PGP_ML/contraindicated[ivermectin+ketoconazole]
  doses: ivermectin:7.2mg:within(0.5) plan=10 mg/mL 0.72 mL, ketoconazole:120mg:within(1) plan=200 mg 정제 ½정
  notes: rounding_ketoconazole_1, admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=iver_dog_demodex rx-2=keto_dog_malassezia
E02 | V2 콩이 — 페노바르비탈 + 사이클로스포린 + 프레드니솔론
  verdict=moderate complete=true
  findings: CYP_INDUCTION/moderate[phenobarbital+ciclosporin], IMMUNOSUPPRESSION_ADDITIVE/minor[ciclosporin+prednisolone], CYP_INDUCTION/minor[phenobarbital+prednisolone]
  doses: phenobarbital:15mg:within(0.833) plan=15 mg 정제 1정, ciclosporin:30mg:within(0.746) plan=10 mg 캡슐 3개, prednisolone:3mg:within(0.5) plan=5 mg 정제 ½정
  notes: rounding_prednisolone_2, admin_phenobarbital_0, admin_phenobarbital_1, admin_ciclosporin_0, admin_ciclosporin_1
  rows: rx-1=pb_dog_epilepsy rx-2=csa_dog_ad rx-3=pred_dog_ad
E03 | V3 나비 — 메티마졸·암로디핀·마로피탄트 (CKD 고양이)
  verdict=moderate complete=true
  findings: METHIMAZOLE_CKD/moderate[methimazole]
  doses: methimazole:2.5mg:within(1) plan=2.5 mg 정제 1정, amlodipine:0.625mg:within(0.25) plan=2.5 mg 정제 ¼정, maropitant:4.1mg:within(0.345) plan=16 mg 정제 ½정
  notes: rounding_maropitant_2, admin_methimazole_0, admin_amlodipine_0
  rows: rx-1=mmi_cat_start rx-2=amlo_cat_htn rx-3=maro_cat_ckd_po
E04 | V4 모찌 — 개 전용 퍼메트린 스팟온 (고양이)
  verdict=contraindicated complete=false (dose_noref_permethrin; protocol.permethrin; rx-1:protocol_none)
  findings: SPECIES_HARDSTOP/contraindicated[permethrin]
  doses: permethrin:nullmg:no_reference
  notes: dose_noref_permethrin
  rows: rx-1=∅!protocol_none
E05 | V5 대박 — 아목시실린·클라불란산 + 마로피탄트 (음성 대조)
  verdict=none complete=true
  findings: —
  doses: amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정, maropitant:60mg:within(1) plan=60 mg 정제 1정
  notes: —
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동) rx-2=maro_dog_vomit
E06 | V6 보리 — 멜록시캄 + 푸로세미드 + 피모벤단 + 베나제프릴 (CKD 개)
  verdict=moderate complete=true
  findings: NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]
  doses: meloxicam:0.32mg:within(1) plan=1.5 mg/mL 0.21 mL, furosemide:6.4mg:within(1) plan=12.5 mg 정제 ½정, pimobendan:0.8mg:within(1) plan=1.25 mg 츄어블 ½개, benazepril:1.6mg:within(0.125) plan=5 mg 정제 ½정
  notes: rounding_pimobendan_2, rounding_benazepril_3, admin_meloxicam_0, admin_furosemide_0, admin_benazepril_0
  rows: rx-1=melox_dog_oa rx-2=furo_dog_chf rx-3=pimo_dog_chf rx-4=bena_dog_htn
E06b | V6 변형 — 멜록시캄을 0.21 mL로 입력 (D2 경계값)
  verdict=moderate complete=true
  findings: NSAID_RENAL/moderate[meloxicam+furosemide+benazepril]
  doses: meloxicam:0.315mg:within(0.984) plan=1.5 mg/mL 0.21 mL, furosemide:6.4mg:within(1) plan=12.5 mg 정제 ½정, pimobendan:0.8mg:within(1) plan=1.25 mg 츄어블 ½개, benazepril:1.6mg:within(0.125) plan=5 mg 정제 ½정
  notes: rounding_pimobendan_2, rounding_benazepril_3, admin_meloxicam_0, admin_furosemide_0, admin_benazepril_0
  rows: rx-1=melox_dog_oa rx-2=furo_dog_chf rx-3=pimo_dog_chf rx-4=bena_dog_htn
E07 | V7 해피 — 카프로펜 + 프레드니솔론 + 트라마돌 + 트라조돈
  verdict=major complete=true
  findings: NSAID_CORTICOSTEROID/major[carprofen+prednisolone], SEROTONERGIC/moderate[tramadol+trazodone]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, prednisolone:14mg:within(0.5) plan=5 mg 정제 3정, tramadol:140mg:within(1) plan=50 mg 정제 3정, trazodone:280mg:within(0.833) plan=100 mg 정제 3정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=pred_dog_ad rx-3=tram_dog_pain rx-4=traz_dog_previsit
E07b | V7 변형 — 트라마돌 Tt3
  verdict=major complete=true
  findings: NSAID_CORTICOSTEROID/major[carprofen+prednisolone], SEROTONERGIC/moderate[tramadol+trazodone], DOSE_RANGE/minor[tramadol]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, prednisolone:14mg:within(0.5) plan=5 mg 정제 3정, tramadol:140mg:below(1) plan=50 mg 정제 3정, trazodone:280mg:within(0.833) plan=100 mg 정제 3정
  notes: rounding_carprofen_0, admin_carprofen_0
  rows: rx-1=carp_dog_pain rx-2=pred_dog_ad rx-3=tram_dog_pain rx-4=traz_dog_previsit
E08 | V8 레오 — 엔로플록사신 ½×68 mg + 멜록시캄 주사 단회 (고양이)
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin]
  doses: enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정, meloxicam:1.05mg:within(1) plan=5 mg/mL 0.21 mL
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0, admin_meloxicam_0, caution_meloxicam_0
  rows: rx-1=enro_cat rx-2=melox_cat_periop
E08b | V8 변형 — 멜록시캄 주사 Dy3 (반복 투여)
  verdict=major complete=true
  findings: ENRO_FELINE_RETINA/major[enrofloxacin], SPECIES_HARDSTOP/major[meloxicam]
  doses: enrofloxacin:34mg:above(1.943) plan=68 mg 정제 ½정, meloxicam:1.05mg:above plan=5 mg/mL 0.21 mL
  notes: admin_enrofloxacin_0, caution_enrofloxacin_0, admin_meloxicam_0
  rows: rx-1=enro_cat rx-2=melox_cat_periop
E09 | 두부 — 뇌전증 푸들에 플루옥세틴
  verdict=contraindicated complete=true
  findings: DRUG_CONDITION/contraindicated[fluoxetine]
  doses: fluoxetine:16mg:within(1) plan=16 mg 츄어블 1개, phenobarbital:20mg:within(0.833) plan=30 mg 정제 ½정
  notes: rounding_phenobarbital_1, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=flx_dog_sep rx-2=pb_dog_epilepsy
E10 | 코코 — 페니실린 알레르기 + 아목시실린·클라불란산
  verdict=major complete=true
  findings: ALLERGY_CLASS/major[amoxicillin_clavulanate]
  doses: amoxicillin_clavulanate:150mg:within(0.5) plan=250 mg 정제 ½정
  notes: rounding_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu~EU/UK 라벨 기준(자동)
E11 | 두부 변형 — 간 질환 + 페노바르비탈
  verdict=contraindicated complete=true
  findings: DRUG_CONDITION/contraindicated[phenobarbital]
  doses: phenobarbital:20mg:within(0.833) plan=30 mg 정제 ½정
  notes: rounding_phenobarbital_0, admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy
E12 | 대박 변형 — 케토코나졸 + 오메프라졸
  verdict=moderate complete=true
  findings: GASTRIC_PH_AZOLE/moderate[ketoconazole+omeprazole]
  doses: ketoconazole:300mg:within(1) plan=200 mg 정제 1½정, omeprazole:30mg:within(1) plan=10 mg 캡슐 3개
  notes: admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=keto_dog_malassezia rx-2=ome_dog_acid
E13 | 해피 변형 — 카프로펜 + 멜록시캄 (NSAID 중복)
  verdict=major complete=true
  findings: NSAID_DUPLICATE/major[carprofen+meloxicam]
  doses: carprofen:123.2mg:within(1) plan=100 mg 정제 1정, meloxicam:2.8mg:within(1) plan=1.5 mg/mL 1.9 mL
  notes: rounding_carprofen_0, admin_carprofen_0, admin_meloxicam_0
  rows: rx-1=carp_dog_pain rx-2=melox_dog_oa
E14 | 체중 미입력 — 카프로펜
  verdict=none complete=false (weight_missing; weightKg)
  findings: —
  doses: carprofen:nullmg:unit_mismatch
  notes: weight_missing, admin_carprofen_0
  rows: rx-1=carp_dog_pain
E15 | 적응증 모호 — 마로피탄트 PO, 진단명 없음
  verdict=none complete=false (dose_noref_maropitant; protocol.maropitant; rx-1:protocol_indication)
  findings: —
  doses: maropitant:60mg:no_reference plan=60 mg 정제 1정
  notes: dose_noref_maropitant
  rows: rx-1=∅!protocol_indication
E16 | 처방집 외 제품 + 빈도 미입력
  verdict=none complete=false (freq_amoxicillin_clavulanate_0; frequency.amoxicillin_clavulanate; rx-1:freq_missing; unmapped:RX-XYZ-999)
  findings: —
  doses: amoxicillin_clavulanate:375mg:within(0.5) plan=375 mg 정제 1정
  notes: freq_amoxicillin_clavulanate_0
  rows: rx-1=ac_dog_eu!freq_missing~EU/UK 라벨 기준(자동)
E17 | 단위 확인 필요 — 이버멕틴 "포" 입력 (콜리)
  verdict=contraindicated complete=false (dose_unit_ivermectin; rx-1:unit_needs_record)
  findings: MDR1_PGP_ML/contraindicated[ivermectin+ketoconazole]
  doses: ivermectin:nullmg:unit_mismatch, ketoconazole:120mg:within(1) plan=200 mg 정제 ½정
  notes: rounding_ketoconazole_1, dose_unit_ivermectin, admin_ketoconazole_0, admin_ketoconazole_1
  rows: rx-1=iver_dog_demodex!unit_needs_record rx-2=keto_dog_malassezia
E18 | 지원하지 않는 종 — 토끼
  supported=false → 지원하지 않는 종
E19 | D1 — 마로피탄트 ½×16 mg 정, 3.8 kg 개 (구토)
  verdict=none complete=true
  findings: —
  doses: maropitant:8mg:within(1.053) plan=16 mg 정제 ½정
  notes: —
  rows: rx-1=maro_dog_vomit
E20 | D1 — 카프로펜 2×25 mg 정, 11 kg 개
  verdict=none complete=true
  findings: —
  doses: carprofen:50mg:within(1.033) plan=25 mg 정제 2정
  notes: admin_carprofen_0
  rows: rx-1=carp_dog_pain
E21 | D4 — 로베나콕시브 20 mg(분할 불가) ½정
  verdict=none complete=false (rx-1:split_not_allowed)
  findings: —
  doses: robenacoxib:10mg:within(0.5) plan=20 mg 정제 ½정
  notes: —
  rows: rx-1=robe_dog_postop!split_not_allowed
E22 | 콩이 변형 — 체중 측정 45일 전 + 계산량 불일치
  verdict=none complete=true
  findings: —
  doses: phenobarbital:15mg:within(0.833) plan=15 mg 정제 1정
  notes: admin_phenobarbital_0, admin_phenobarbital_1
  rows: rx-1=pb_dog_epilepsy~calc_mismatch
  adapterNotes: weight_stale
E23 | D3 — 고양이 엔로플록사신 5 mg/kg, 22.7 mg 정 (제안 재검토)
  verdict=none complete=true
  findings: —
  doses: enrofloxacin:17.5mg:within(1) plan=22.7 mg 정제 1정
  notes: rounding_enrofloxacin_0, admin_enrofloxacin_0, caution_enrofloxacin_0
  rows: rx-1=enro_cat
```

**Current-engine differences** (the diff between `out_current.txt` and `out_fixed.txt`). These three cases become `it.fails` regression markers until WP1 lands, then normal tests:

```
E06b  current: + DOSE_RANGE/minor[meloxicam]  meloxicam:0.315mg:below(0.984)
E19   current: verdict=moderate  DOSE_RANGE/moderate[maropitant]  maropitant:8mg:above(1.053)
E20   current: verdict=moderate  DOSE_RANGE/moderate[carprofen]   carprofen:50mg:above(1.033)
```

**Gate expectations:** the gate opens at save for E01, E04, E07, E07b, E08, E08b, E09, E10, E11, E13 and E17, and for **no other** scenario.

**Suggestion re-check checks:**
- E23 offers no suggestion;
- E01 offers exactly "이버멕틴 삭제" (recommended);
- E07 offers "카프로펜 삭제" and "프레드니솔론 삭제", both of which clear NSAID_CORTICOSTEROID without adding a finding.

### 8.2 Mapping unit tests (`emr/__tests__/adapter.test.js`)

**Units:**
- `EA` + tablet product → `tablet`;
- `EA` + chewable → `chewable`;
- `EA` + capsule → `capsule`;
- `EA` + spot-on → `pipette`;
- `EA` + solution/injection/suspension → `unit_count_liquid`;
- `정`, `캡슐`, `T`, `tab`, `개` behave like `EA`;
- `ml/kg` → `mL/kg`;
- `cc` → `mL`;
- `ug/kg` and `µg/kg` → `mcg/kg`;
- `IU/kg` passes through;
- `포`, `앰플`, `바이알`, `gtt`, `방울` → `unit_needs_record` with `dose: null`;
- `xyz` → `unit_unknown`, with `dose: null` and never mg.

**Split:**

| Input | Result |
|---|---|
| amlodipine 2.5 mg tablet (quarter) ¼ | ok |
| ketoconazole 200 mg (half only) ½ | ok |
| ketoconazole 200 mg ¼ | `split_not_allowed` |
| robenacoxib (non-splittable) ½ | `split_not_allowed` |
| ciclosporin capsule ½ | `split_not_allowed` |
| fluoxetine chewable 1 | ok |

**Frequency:**

| Input | Result |
|---|---|
| Tt1 Dy7 | q24h |
| Tt2 | q12h |
| Tt3 | q8h |
| Tt4 | q6h |
| Tt6 | q4h |
| Tt1 Dy1 | once |
| Tt2 Dy1 | q12h |
| Tt5 | null + `freq_unmapped` |
| Tt blank, no 용법 | null + `freq_missing` |
| 용법 "격일" | q48h (wins over Tt1) |
| 용법 "월1회" | monthly |
| 용법 "필요시" | prn |
| 용법 "bid" | q12h |
| 용법 "아무거나" + Tt2 | q12h (unrecognised 용법 falls back to Tt) |

**Route:**
- `po` → PO;
- `Top` + permethrin → spot-on;
- `Top` + non-spot-on → topical;
- `Eye` → `route_no_reference`;
- blank → `route_missing`.

**Protocol policy:**

| Case | Result |
|---|---|
| ivermectin dog PO q24h | `iver_dog_demodex` |
| ivermectin dog PO 용법 "월1회" | `iver_dog_hw` |
| maropitant dog PO, no diagnosis | `protocol_indication` with options `[maro_dog_vomit, maro_dog_motion]` |
| maropitant dog PO with D-GI-001 | `maro_dog_vomit` |
| maropitant dog SC | `maro_dog_inj` |
| meloxicam dog PO Tt1 Dy1 (once) | `melox_dog_load` |
| meloxicam dog PO Tt1 Dy14 | `melox_dog_oa` |
| amoxicillin-clavulanate dog | `ac_dog_eu` + "EU/UK 라벨 기준(자동)" |
| pimobendan dog with D-CAR-005 | `pimo_dog_chf` |
| pimobendan dog without diagnosis | `protocol_indication` |
| permethrin cat | `protocol_none` |

A `protocol-choice` extension overrides all of these.

**Patient fields:**

| Case | Result |
|---|---|
| `Spayed Female` | female, true |
| `Unknown` | null, null |
| breed "ROUGH COLLIE/러프 콜리" | `collie` |
| breed "KOREAN SHORTHAIR/코리안숏헤어" (cat) | `domestic_shorthair` |
| breed "XYZ/모름" (dog) | `breed_unresolved` |
| creatinine 176.8 µmol/L | 2.0 mg/dL |
| creatinine dated 120 days before the visit | `lab_stale_creatinine`, not used |
| weight measured 31 days earlier | `weight_stale` |
| species `Rabbit` | unsupported, `analyze` not called (spy) |

**계산량:**
- furosemide 2 mg/kg × 3.66 kg with EMR 7.32 mg → no note;
- EMR 7.0 mg → `calc_mismatch`;
- an EMR value is never used as the dose (assert that `caseInput.meds[i].dose` equals the raw Qty/unit).

**Incomplete-verdict precedence:** a result with `level: 'none'` and any confirm reason, validation note or unmapped row renders "검토 불완전" and never `CircleCheck`. This is a component test with a fixture.

**Comment check:** the §3.9 table, exactly.

**Card building:**
- every card `summary` is ≤ 140 characters, for all 26 scenarios in both locales;
- every card has `source.label` and `topic.code`;
- `blocking` matches §3.6;
- uuids are stable when re-running the same visit and change when an involved row's dose changes;
- `doseChecks` for V1 is 1 (ketoconazole rounding) and for V5 is 0.

### 8.3 Widget isolation tests (`frontend/scripts/qa/widget.cjs`, Playwright, Chromium)

Run against `dist-widget` on `widget-demo/hostile.html` and on `/dur#/emr/V1`:

1. **Containment.** Every widget element is inside a shadow root of `<nuvovet-dur-overlay>`, the panel host or a badge slot. `document.body` gains exactly one new child: the overlay host.
2. **Sizing** is computed from rendered output: the panel header is 40 px tall; the card summary is 13 px Pretendard; gate buttons are 32 px tall. The host's `html{font-size:62.5%}` makes no difference. Compare against the same measures on `widget-demo/index.html`, with a tolerance of ±0.5 px.
3. **Fonts.** The computed `font-family` of the summary starts with `"NuvoVet Pretendard"`, and `document.fonts.check('13px "NuvoVet Pretendard"')` is true. The host's fake "Pretendard Variable" is not used by the widget.
4. **Tokens.** The critical badge background equals `rgb(200, 36, 27)` (`#C8241B`) despite `* { --primary: lime !important }`, and no widget element computes `color: rgb(255, 0, 0)`.
5. **Stacking.** With the gate open, `elementFromPoint` at the host's sticky header returns the overlay host; the scrim covers the full viewport; the dialog opacity is 1 (`[data-state=open]{opacity:.2}` cannot reach it).
6. **Focus.** On gate open, the shadow root's `activeElement` is "처방으로 돌아가기".
   - Tab ×20 never leaves the dialog.
   - Shift+Tab wraps.
   - Typing "케토코나졸 감량 병용, 2주 후 재검" into the comment fills the textarea, so keystrokes reach it.
   - Esc closes the dialog, `gate()` resolves `proceed:false`, and focus returns to the host save button.
7. **Enter safety.** Pressing Enter with the reason chosen and a valid comment does not override.
8. **Network.** Zero requests other than the page's own files: `page.on('request')` records every request, and only `file:`, `data:` or the dev-server origin may appear.
9. **Console.** Zero errors and warnings.
10. **CSS lint.** No `rem`, `@property` or `@import url(` in the inlined widget CSS.
11. **Size.** The IIFE is ≤ 250 kB gzip (measured with zlib).

### 8.4 UX and accessibility tests (`frontend/scripts/qa/emr.cjs`, on `/dur#/emr/*` and the standalone file)

- **Timing.** Editing a Qty updates the row badge within 500 ms, and an `alertdialog` never appears while typing (type the full V7 prescription from empty).
- **Gate per scenario.** Clicking 처방 저장 opens the gate for V1, V4, V7, V8, V9 and V10 only. For V2, V3, V5 and V6 it saves directly, with the toast and no dialog.
- **Override requirements.**
  - **V1 (contraindicated):** "예외 처리하고 저장" stays disabled until a reason, a valid comment and the 보호자 checkbox are all set.
  - **V7 (major):** a reason alone enables it.
  - **NV-OTH:** also requires a valid comment.
- **Dedupe.** After overriding V7 and saving, saving again opens no gate. Changing prednisolone to 1 mg/kg and saving opens it again: the input hash changed.
- **Live re-check.** In V8, changing meloxicam Dy 1 → 3 adds the 중대 badge on the meloxicam row and a second card.
- **Unmapped and incomplete states.**
  - V5 with weight cleared shows "검토 불완전" and no check icon.
  - Adding "RX-XYZ-999" via a test hook shows "검토 안 함".
- **NV-DATA** on V1 emits `fix-chart`, focuses the host's 특이사항/breed field and adds no log entry.
- **Suggestion.** Accepting "이버멕틴 삭제" on V1 removes the row, the re-check clears the card, and the log has one `accepted` entry.
- **Log.** "기록 내보내기" downloads JSON matching the §3.10 shape. With `localStorage` throwing (stubbed), the demo still works.
- **Watermarks.** "가상의 EMR" and "교육용 프로토타입" are visible at all three viewports and in `page.pdf()` print output.
- **Language.** With `ko`, no ASCII word of 4 or more letters appears in widget text, apart from drug codes, rule IDs, units, "DUR", "nuvovet", "MDR1", "ABCB1", "P-gp", "CYP3A" and DOIs. With `?lang=en`, no Hangul appears in widget chrome (patient and drug names excepted).
- **Accessibility.**
  - The panel has `role=region` and a name.
  - Card disclosures have `aria-expanded`.
  - The gate is `role=alertdialog` with `aria-modal`.
  - Badges are buttons with descriptive `aria-label`s.
  - The live region text changes only when counts change.
  - The contrast of every widget text node is ≥ 4.5 in light and dark widget themes.
- **Screenshots.** Taken per DESIGN_SYSTEM §9.2: V1 panel, V1 gate, V5, V7 gate and V8b, at 1440/1024/390. The dark site theme keeps the EMR light; plus one shot with the widget theme set to dark.

---

## 9. Before showing externally

- **Vet review.** A veterinarian reviews V1–V10, the card copy, the override list and the coverage strip. `cases.js` already notes that the case copy needs this.
- **Check against the founder's real EMR screenshots:**
  - the meaning of Tt and Dy (times per day vs. total administrations);
  - whether a 용법 field exists;
  - how 가루약 / 포 are recorded;
  - eVET status display.
- **If they differ:** update the §4.2 tables, and nothing else.
- **Remove the unverified sentence** "국내 동물병원 EMR에는 처방 안전 검토 기능이 없습니다" (DESIGN_SYSTEM §5.5).
- **Never present this as a product feature of a real EMR,** and never use a real vendor's name or screenshots in the demo or its marketing.

---

## Appendix A: product map and condition map

### A.1 `productMap.js`

The codes are fictional, and the strengths are the engine's clean-room `strengths`. `defaultProtocolId` is not set for any product; the protocol policy decides.

| Code | Display (KO) | drugId | strengthId |
|---|---|---|---|
| RX-IVM-SOL10 | 이버멕틴 경구액 10 mg/mL | ivermectin | iver_sol_10 |
| RX-IVM-CH68 / CH136 / CH272 | 이버멕틴 츄어블 68 / 136 / 272 mcg | ivermectin | iver_chew_68 / _136 / _272 |
| RX-KTZ-T200 | 케토코나졸 정 200 mg | ketoconazole | keto_tab_200 |
| RX-CSA-C10 / C25 / C50 | 사이클로스포린 캡슐 10 / 25 / 50 mg | ciclosporin | csa_cap_10 / _25 / _50 |
| RX-PB-T15 / T30 | 페노바르비탈 정 15 / 30 mg | phenobarbital | pb_tab_15 / _30 |
| RX-PRED-T5 | 프레드니솔론 정 5 mg | prednisolone | pred_tab_5 |
| RX-MMI-T25 | 메티마졸 정 2.5 mg | methimazole | mmi_tab_2_5 |
| RX-AML-T25 | 암로디핀 정 2.5 mg | amlodipine | amlo_tab_2_5 |
| RX-MRP-T16 / T24 / T60 | 마로피탄트 정 16 / 24 / 60 mg | maropitant | maro_tab_16 / _24 / _60 |
| RX-MRP-INJ10 | 마로피탄트 주사액 10 mg/mL | maropitant | maro_inj_10 |
| RX-AMC-T375 / T250 | 아목시실린·클라불란산 정 375 / 250 mg | amoxicillin_clavulanate | ac_tab_375 / ac_tab_250 |
| RX-MLX-SUS15 | 멜록시캄 현탁액 1.5 mg/mL | meloxicam | melox_susp_1_5 |
| RX-MLX-INJ5 | 멜록시캄 주사액 5 mg/mL | meloxicam | melox_inj_5 |
| RX-CRP-T25 / T100 | 카프로펜 정 25 / 100 mg | carprofen | carp_tab_25 / _100 |
| RX-ROB-T20 | 로베나콕시브 정 20 mg | robenacoxib | robe_tab_20 |
| RX-GBP-C100 | 가바펜틴 캡슐 100 mg | gabapentin | gaba_cap_100 |
| RX-TRM-T50 | 트라마돌 정 50 mg | tramadol | tram_tab_50 |
| RX-TRZ-T100 | 트라조돈 정 100 mg | trazodone | traz_tab_100 |
| RX-FLX-CH16 | 플루옥세틴 츄어블 16 mg | fluoxetine | flx_chew_16 |
| RX-OMP-C10 | 오메프라졸 캡슐 10 mg | omeprazole | ome_cap_10 |
| RX-FAM-T10 | 파모티딘 정 10 mg | famotidine | famo_tab_10 |
| RX-ENR-T227 / T68 | 엔로플록사신 정 22.7 / 68 mg | enrofloxacin | enro_tab_22_7 / _68 |
| RX-MTZ-T250 | 메트로니다졸 정 250 mg | metronidazole | metro_tab_250 |
| RX-FUR-T125 | 푸로세미드 정 12.5 mg | furosemide | furo_tab_12_5 |
| RX-PIM-CH125 | 피모벤단 츄어블 1.25 mg | pimobendan | pimo_chew_1_25 |
| RX-BNZ-T5 | 베나제프릴 정 5 mg | benazepril | bena_tab_5 |
| RX-PERM-SPOT | 퍼메트린 스팟온 (개 전용) | permethrin | perm_spot |
| RX-APAP-T500 | 아세트아미노펜 정 500 mg | acetaminophen | apap_tab_500 |

A test asserts that every `strengthId` exists in `DRUG_BY_ID[drugId].strengths`.

### A.2 `conditionMap.js`

The codes are fictional.

```
D-DERM-012 demodicosis · D-EAR-004 malassezia_otitis · D-NEU-001 epilepsy · D-DERM-001 atopic_dermatitis · D-END-003 hyperthyroidism
D-URO-010 ckd · D-DERM-020 skin_infection · D-GI-001 vomiting_diarrhoea · D-MSK-002 osteoarthritis · D-CAR-005 mmvd_chf
D-BEH-001 anxiety · D-URO-002 uti · D-HEP-001 hepatopathy · D-GI-007 gi_ulcer_history · D-CAR-009 hypertension
```

Korean display names are the engine's `CONDITION_BY_ID[id].label.ko`, prefixed with the code, e.g. "D-URO-010 만성 신장병(CKD)".

**Protocol linking:**
```
PROTOCOL_CONDITIONS = { iver_dog_demodex:[demodicosis], iver_dog_hw:[], maro_dog_vomit:[vomiting_diarrhoea], maro_dog_motion:[],
                        pimo_dog_chf:[mmvd_chf], pimo_dog_b2:[] }
SAME_INDICATION = [{ ids:[ac_dog_eu, ac_dog_us], primary: ac_dog_eu, label: 'EU/UK 라벨 기준(자동)' }]
```

This is indication linking for protocol choice only, not a clinical fact. Extend it only with a source-backed indication match.

---

## Appendix B: fixtures (`fixtures.js`)

These are verbatim from the executed runner. `rx(rowId, productCode, unit, qty, tt, dy, rt='PO', extra)`; visit date `2026-10-03`.

```js
const D = '2026-10-03'
const pt = (o) => ({ mdr1: 'unknown', allergies: [], labs: [], ...o })
CHOCO  = pt({ id:'1042', name:'초코', species:'Canine', breed:'ROUGH COLLIE/러프 콜리', sex:'Neutered Male', birthDate:'2022-05-14', weight:{ kg:24.0, measuredAt:D } })
KONGYI = pt({ id:'0877', name:'콩이', species:'Canine', breed:'SHIH TZU/시츄', sex:'Neutered Male', birthDate:'2020-03-02', weight:{ kg:6.0, measuredAt:D } })
NABI   = pt({ id:'1310', name:'나비', species:'Feline', breed:'KOREAN SHORTHAIR/코리안숏헤어', sex:'Spayed Female', birthDate:'2013-06-20', weight:{ kg:4.1, measuredAt:D },
              labs:[{ code:'creatinine', value:2.0, unit:'mg/dL', date:'2026-10-01' }] })
MOCHI  = pt({ id:'1455', name:'모찌', species:'Feline', breed:'KOREAN SHORTHAIR/코리안숏헤어', sex:'Spayed Female', birthDate:'2024-04-11', weight:{ kg:3.8, measuredAt:D } })
DAEBAK = pt({ id:'0921', name:'대박', species:'Canine', breed:'LABRADOR RETRIEVER/래브라도 리트리버', sex:'Spayed Female', birthDate:'2023-01-30', weight:{ kg:30.0, measuredAt:D } })
BORI   = pt({ id:'1502', name:'보리', species:'Canine', breed:'MALTESE/말티즈', sex:'Spayed Female', birthDate:'2014-08-08', weight:{ kg:3.2, measuredAt:D },
              labs:[{ code:'creatinine', value:2.1, unit:'mg/dL', date:'2026-09-29' }] })
HAPPY  = pt({ id:'0650', name:'해피', species:'Canine', breed:'GOLDEN RETRIEVER/골든 리트리버', sex:'Neutered Male', birthDate:'2019-02-17', weight:{ kg:28.0, measuredAt:D } })
LEO    = pt({ id:'1388', name:'레오', species:'Feline', breed:'RUSSIAN BLUE/러시안 블루', sex:'Neutered Male', birthDate:'2017-07-01', weight:{ kg:3.5, measuredAt:D } })
DUBU   = pt({ id:'1620', name:'두부', species:'Canine', breed:'POODLE/푸들', sex:'Neutered Male', birthDate:'2021-11-03', weight:{ kg:8.0, measuredAt:D } })
COCO   = pt({ id:'1733', name:'코코', species:'Canine', breed:'BEAGLE/비글', sex:'Intact Female', birthDate:'2022-09-09', weight:{ kg:12.0, measuredAt:D }, allergies:[{ code:'penicillin' }] })
TOFU   = pt({ id:'1801', name:'토끼', species:'Rabbit', breed:'HOLLAND LOP/홀랜드 롭', sex:'Unknown', birthDate:'2024-01-01', weight:{ kg:1.8, measuredAt:D } })

E01/V1  CHOCO  dx[D-DERM-012, D-EAR-004]  rx-1 RX-IVM-SOL10 mcg/kg 300 Tt1 Dy7 PO calc 7.2 mg ; rx-2 RX-KTZ-T200 mg/kg 5 Tt2 Dy21 PO calc 120 mg
E02/V2  KONGYI dx[D-NEU-001, D-DERM-001]  rx-1 RX-PB-T15 mg/kg 2.5 Tt2 Dy30 ; rx-2 RX-CSA-C10 mg/kg 5 Tt1 Dy30 ; rx-3 RX-PRED-T5 mg/kg 0.5 Tt1 Dy14
E03/V3  NABI   dx[D-END-003, D-URO-010]  rx-1 RX-MMI-T25 mg 2.5 Tt2 Dy30 ; rx-2 RX-AML-T25 EA 0.25 Tt1 Dy30 ; rx-3 RX-MRP-T16 mg/kg 1 Tt1 Dy14
E04/V4  MOCHI  dx[]                      rx-1 RX-PERM-SPOT EA 1 Tt1 Dy1 Top
E05/V5  DAEBAK dx[D-DERM-020, D-GI-001]  rx-1 RX-AMC-T375 mg/kg 12.5 Tt2 Dy7 ; rx-2 RX-MRP-T60 mg/kg 2 Tt1 Dy2
E06/V6  BORI   dx[D-URO-010, D-MSK-002, D-CAR-005]  rx-1 RX-MLX-SUS15 mg/kg 0.1 Tt1 Dy14 ; rx-2 RX-FUR-T125 mg/kg 2 Tt2 Dy14 ; rx-3 RX-PIM-CH125 mg/kg 0.25 Tt2 Dy14 ; rx-4 RX-BNZ-T5 mg/kg 0.5 Tt1 Dy14
E06b    as E06 but rx-1 RX-MLX-SUS15 mL 0.21 Tt1 Dy14
E07/V7  HAPPY  dx[D-MSK-002, D-DERM-001, D-BEH-001]  rx-1 RX-CRP-T100 mg/kg 4.4 Tt1 Dy7 ; rx-2 RX-PRED-T5 mg/kg 0.5 Tt1 Dy7 ; rx-3 RX-TRM-T50 mg/kg 5 Tt4 Dy5 ; rx-4 RX-TRZ-T100 mg/kg 10 Tt1 Dy1
E07b    as E07 but rx-3 Tt3
E08/V8  LEO    dx[D-URO-002]  rx-1 RX-ENR-T68 EA 0.5 Tt1 Dy10 ; rx-2 RX-MLX-INJ5 mg/kg 0.3 Tt1 Dy1 SC
E08b    as E08 but rx-2 Dy3
E09/V9  DUBU   dx[D-NEU-001, D-BEH-001]  rx-1 RX-FLX-CH16 EA 1 Tt1 Dy30 ; rx-2 RX-PB-T30 mg/kg 2.5 Tt2 Dy30
E10/V10 COCO   dx[D-DERM-020]  rx-1 RX-AMC-T250 mg/kg 12.5 Tt2 Dy7
E11     DUBU   dx[D-HEP-001, D-NEU-001]  rx-1 RX-PB-T30 mg/kg 2.5 Tt2 Dy30
E12     DAEBAK dx[D-EAR-004]  rx-1 RX-KTZ-T200 mg/kg 10 Tt1 Dy21 ; rx-2 RX-OMP-C10 mg/kg 1 Tt2 Dy14
E13     HAPPY  dx[D-MSK-002]  rx-1 RX-CRP-T100 mg/kg 4.4 Tt1 Dy7 ; rx-2 RX-MLX-SUS15 mg/kg 0.1 Tt1 Dy7
E14     HAPPY with weight:null  dx[D-MSK-002]  rx-1 RX-CRP-T100 mg/kg 4.4 Tt1 Dy7
E15     DAEBAK dx[]  rx-1 RX-MRP-T60 mg/kg 2 Tt1 Dy2
E16     DAEBAK dx[D-DERM-020]  rx-1 RX-AMC-T375 mg/kg 12.5 Tt'' Dy7 ; rx-2 RX-XYZ-999 mg/kg 1 Tt1 Dy7
E17     CHOCO  dx[D-DERM-012]  rx-1 RX-IVM-SOL10 포 1 Tt1 Dy7 ; rx-2 RX-KTZ-T200 mg/kg 5 Tt2 Dy21
E18     TOFU   dx[]  rx-1 RX-MTZ-T250 mg/kg 10 Tt2 Dy7
E19     DAEBAK with weight 3.8 kg  dx[D-GI-001]  rx-1 RX-MRP-T16 EA 0.5 Tt1 Dy2
E20     HAPPY with weight 11 kg  dx[D-MSK-002]  rx-1 RX-CRP-T25 EA 2 Tt1 Dy7
E21     HAPPY with weight 5 kg  dx[D-MSK-002]  rx-1 RX-ROB-T20 EA 0.5 Tt1 Dy3
E22     KONGYI with weight measuredAt 2026-08-19  dx[D-NEU-001]  rx-1 RX-PB-T15 mg/kg 2.5 Tt2 Dy30 calc 14 mg
E23     LEO    dx[D-URO-002]  rx-1 RX-ENR-T227 mg/kg 5 Tt1 Dy10
```

**Display data for the host.** The host also needs, for display only:
- guardian names (masked: 이○○, 박○○ …);
- fictional unit prices (₩500–₩3,000 per 정/mL);
- 폴더명.

Choose these freely, labelled "가상". They are not inputs to the engine.

---

## Appendix C: reference adapter (executed while writing this spec)

`src/portfolio/emr/adapter.js` MUST behave exactly like this. Port it with the import paths changed to the engine modules. The constants (`PRODUCT_MAP`, `CONDITION_MAP`, `PROTOCOL_CONDITIONS`, `SAME_INDICATION`) move to `productMap.js` and `conditionMap.js`.

```js
const TT_TO_FREQ = { 1: 'q24h', 2: 'q12h', 3: 'q8h', 4: 'q6h', 6: 'q4h' }
const PASS_UNITS = { 'mg/kg':'mg/kg','mcg/kg':'mcg/kg','ug/kg':'mcg/kg','µg/kg':'mcg/kg','iu/kg':'IU/kg','ml/kg':'mL/kg','cc/kg':'mL/kg',
  mg:'mg', mcg:'mcg', ug:'mcg', 'µg':'mcg', ml:'mL', cc:'mL', g:'g', iu:'IU' }
const COUNT_UNITS = ['ea','t','tab','정','캡슐','cap','개']
const CONFIRM_UNITS = ['포','앰플','amp','바이알','vial','gtt','방울']
const FORM_TO_COUNT = { tablet:'tablet', chewable:'chewable', capsule:'capsule', 'spot-on':'pipette' }
const ROUTES = { PO:'PO', IV:'IV', SC:'SC', IM:'IM' }
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

export function mapSpecies(text) {
  const t = String(text || '').trim().toLowerCase()
  if (['canine','dog','개','견'].includes(t)) return 'dog'
  if (['feline','cat','고양이','묘'].includes(t)) return 'cat'
  return null
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
export function mapFrequency({ sig, tt, dy }) {
  if (sig) { const f = normalizeFrequency(sig); if (f.ok) return { frequency: f.id } }
  if (tt == null || tt === '') return { frequency: null, confirm: 'freq_missing' }
  const n = Number(tt)
  if (n === 1 && Number(dy) === 1) return { frequency: 'once' }
  if (TT_TO_FREQ[n]) return { frequency: TT_TO_FREQ[n] }
  return { frequency: null, confirm: 'freq_unmapped' }
}
export function mapRoute(rt, strength) {
  const r = String(rt || '').trim()
  if (ROUTES[r.toUpperCase()]) return { route: ROUTES[r.toUpperCase()] }
  if (/^top$/i.test(r)) return { route: strength?.form === 'spot-on' ? 'spot-on' : 'topical' }
  if (/^(eye|ear|inh)$/i.test(r)) return { route: r, confirm: 'route_no_reference' }
  return { route: null, confirm: 'route_missing' }
}
export function chooseProtocol({ drugId, species, route, frequency, conditionIds, choice }) {
  const all = protocolsFor(drugId, species)
  if (choice) return { protocolId: choice, how: 'chosen' }
  let c = all.filter((p) => [p.route, ...(p.altRoutes || [])].includes(route))
  if (!c.length) return { protocolId: null, confirm: all.length ? 'protocol_route' : 'protocol_none', options: all.map((p) => p.id) }
  const sameFreq = c.filter((p) => (Array.isArray(p.frequency) ? p.frequency : [p.frequency]).includes(frequency))
  if (sameFreq.length) c = sameFreq
  if (c.length > 1) { const linked = c.filter((p) => (PROTOCOL_CONDITIONS[p.id] || []).some((x) => conditionIds.includes(x))); if (linked.length) c = linked }
  if (c.length === 1) return { protocolId: c[0].id, how: 'auto' }
  const group = SAME_INDICATION.find((g) => c.every((p) => g.ids.includes(p.id)))
  if (group) return { protocolId: group.primary, how: 'same_indication', label: group.label }
  return { protocolId: null, confirm: 'protocol_indication', options: c.map((p) => p.id) }
}
export function adapt(visit) {
  const p = visit.patient
  const species = mapSpecies(p.species)
  if (!species) return { supported: false, reason: 'species_unsupported' }
  const adapterNotes = []
  let breedId = null
  for (const h of String(p.breed || '').split('/').map((s) => s.trim()).filter(Boolean)) { breedId = resolveBreed(h, species); if (breedId) break }
  if (!breedId && species === 'dog') adapterNotes.push('breed_unresolved')
  const { sex, neutered } = mapSex(p.sex)
  const ageYears = p.birthDate ? Math.floor((daysBetween(p.birthDate, visit.date) / 365.25) * 10) / 10 : null
  const weightKg = p.weight?.kg ?? null
  if (weightKg != null && p.weight.measuredAt && daysBetween(p.weight.measuredAt, visit.date) > 30) adapterNotes.push('weight_stale')
  const labs = {}
  for (const l of p.labs || []) {
    if (daysBetween(l.date, visit.date) > 90) { adapterNotes.push(`lab_stale_${l.code}`); continue }
    if (l.code === 'creatinine') labs.creatinine = /mol/i.test(l.unit) ? Math.round((l.value / 88.4) * 100) / 100 : l.value
    if (l.code === 'alt') labs.alt = l.value
  }
  const conditions = [], unmappedDx = []
  for (const d of visit.diagnoses || []) { const c = CONDITION_MAP[d.code]; if (c && CONDITION_BY_ID[c]) conditions.push(c); else unmappedDx.push(d.code) }
  const allergies = []
  for (const a of p.allergies || []) { if (a.code && ALLERGY_BY_ID[a.code]) allergies.push(a.code); else adapterNotes.push('allergy_free_text') }
  const meds = [], rows = {}, unmapped = []
  for (const row of visit.rows.filter((r) => r.kind === 'Rx')) {
    const prod = PRODUCT_MAP[row.productCode]
    if (!prod || !getDrug(prod.drugId)) { unmapped.push({ rowId: row.rowId, code: row.productCode }); continue }
    const strength = getStrength(prod.drugId, prod.strengthId)
    const confirm = [], notes = []
    const u = mapUnit(row.unit, strength); if (u.confirm) confirm.push(u.confirm)
    const f = mapFrequency(row); if (f.confirm) confirm.push(f.confirm)
    const rt = mapRoute(row.rt, strength); if (rt.confirm) confirm.push(rt.confirm)
    const qty = Number(row.qty)
    if (u.unit && ['tablet','capsule','chewable','pipette'].includes(u.unit) && strength) {
      const step = splitStep(strength)
      if (Math.abs(qty / step - Math.round(qty / step)) > 1e-9) confirm.push('split_not_allowed')
    }
    const pr = chooseProtocol({ drugId: prod.drugId, species, route: rt.route, frequency: f.frequency, conditionIds: conditions, choice: row.protocolChoice })
    if (pr.confirm) confirm.push(pr.confirm)
    if (pr.label) notes.push(pr.label)
    if (row.calc && u.unit && /\/kg$/.test(u.unit) && weightKg) {
      const factor = { 'mg/kg': 1, 'mcg/kg': 0.001 }[u.unit]
      const calcMg = row.calc.unit === 'mcg' ? row.calc.value / 1000 : row.calc.value
      if (factor && Math.abs(qty * factor * weightKg - calcMg) / (qty * factor * weightKg) > 0.01) notes.push('calc_mismatch')
    }
    rows[row.rowId] = { drugId: prod.drugId, protocolId: pr.protocolId, confirm, notes, options: pr.options || null }
    meds.push({ drugId: prod.drugId, protocolId: pr.protocolId, dose: u.unit && Number.isFinite(qty) ? { value: qty, unit: u.unit } : null,
      route: rt.route, frequency: f.frequency, durationDays: row.dy ? Number(row.dy) : null, strengthId: prod.strengthId })
  }
  return { supported: true, rows, unmapped, adapterNotes, unmappedDx,
    caseInput: { species, weightKg, breedId, breedText: p.breed || '', ageYears, sex, neutered, pregnant: false, lactating: false,
                 conditions, labs, allergies, mdr1Status: p.mdr1 || 'unknown', meds } }
}
const INCOMPLETE_MISSING = /^(weightKg|protocol\.|frequency\.)/
export function check(visit) {   // the core of sdk.check(); cards.js builds the DurResponse from this
  const a = adapt(visit)
  if (!a.supported) return { supported: false }
  const r = analyze(a.caseInput)
  const validation = r.notes.filter((n) => n.category === 'validation').map((n) => n.id)
  const missing = r.trace.factorsMissing.filter((m) => INCOMPLETE_MISSING.test(m))
  const rowConfirm = Object.entries(a.rows).filter(([, v]) => v.confirm.length).map(([k, v]) => `${k}:${v.confirm.join('+')}`)
  const complete = !validation.length && !missing.length && !rowConfirm.length && !a.unmapped.length
  return { supported: true, adapter: a, result: r, complete,
           incompleteReasons: [...validation, ...missing, ...rowConfirm, ...a.unmapped.map((u) => `unmapped:${u.code}`)] }
}
```

`splitStep` and the D1/D2 tolerance come from `engine/index.js` after WP1 (§5.1).
