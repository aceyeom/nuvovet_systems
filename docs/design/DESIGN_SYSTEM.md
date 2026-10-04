# NuvoVet design system and UI rebuild plan (binding)

Status: binding spec for the Phase 6 UI rebuild. Revision 2, 2026-10-03: two adversarial reviews (a design-director critique of this document and a clinical/CDS critique of the popup spec) were applied; every accepted and rejected finding is listed in the [Revision log](#revision-log) at the end.

**Inputs.** This spec synthesises four research tracks: ai-tells, stack, emr and audit. Their text is in `/tmp/claude-0/uiresearch/spec/src_{ai-tells,audit,emr,stack}.md` and the verified stack scratch project is `/tmp/claude-0/uiresearch/stack/proj`. The DUR popup has its own spec, [`docs/portfolio/EMR_DUR_POPUP_SPEC.md`](../portfolio/EMR_DUR_POPUP_SPEC.md).

**Precedence.** Where this document conflicts with `docs/portfolio/DUR_SHOWCASE_SPEC.md`, this document wins. That covers showcase §0.4 (allowed imports), §7 (visual system, fonts, tokens) and the §9 bundle budget. Everything else in the showcase spec still holds:
- clean-room data;
- no runtime network;
- no fabricated numbers;
- bilingual copy;
- determinism.

**Reading rule for builders.** MUST, NEVER and DO are requirements. "Prefer" means the default unless a requirement elsewhere conflicts. If something is not specified, choose the option that removes UI rather than adds it.

**Founder decisions encoded in this revision** (2026-10-03):
1. There is no public contact address. The landing page has no pilot-enquiry CTA band and no 파일럿 문의 nav item. The primary button is 콘솔 데모 열기 (`/insurance`). `src/i18n/contact.js` exports `CONTACT_EMAIL = ''` (re-exported from `src/i18n/index.jsx`); the band and nav item render only when it is non-empty. No real address is ever written into the repo by an agent.
2. The landing headline is a full sentence with a verb and no em dash (§5.1). The wording is founder-editable.
3. NSAID + CKD + CHF/diuretic stays **moderate** unless WP1 reads a primary label source in full (popup spec §5, D16).
4. The work-package plan is fixed as in §8: no premature package removal, the Tailwind codemod runs first, shared UI is not frozen, WP4 creates the EMR stub, every component has a named owner (§4.0).
5. Visual acceptance cannot be passed by scripts alone: every surface has a reference description (§5) and a reviewer agent signs off screenshots against it and against §1.2 (§9.8).

---

## 1. Direction

### 1.1 Direction statement: "Clinical ledger"

NuvoVet should look like a well-kept clinical ledger, not a template.

- **Palette.** Calm, cool-neutral surfaces, ink-black type and hairline rules. One utility accent, cobalt (`#2457F5` light, `#6E9BFF` dark), is used only for links, focus, selection and the first chart series. **Blue is not the brand.** Identity comes from the evidence trail (§4.5 `EvidenceTrail`) and the ledger typography (tabular figures, double-ruled totals). A dark token keeps its light token's OKLCH hue within ±3° (the WP0 contrast test checks this).
- **Colour is reserved for meaning.** Clinical severity (금기 / 중대 / 주의 / 경미) and claim decisions (자동 승인 / 서류 요청 / 심사 필요 / 지급 거절 권고) are the only other colours. Every coloured mark carries a word; severity marks also carry an icon (§4.2 icon rules).
- **Density.** The app is dense and keyboard-first:
  - 13–14 px text with tabular figures;
  - 32 px controls (40 px on coarse pointers) and 32–36 px table rows;
  - a 240 px sidebar;
  - a ⌘K command palette.
- **Surfaces.** The app canvas is `--background` (white / near-black), not grey. Tables sit directly on the page with row rules. Cards exist only for grouped secondary content (a form section, a code panel).
- **Marketing pages** use the same tokens. They spend their boldness in one place: large Pretendard display type over a live, cropped piece of the real product. No illustrations, shaders, gradients, stat strips or alternating zig-zag sections.
- **The signature element** is the evidence trail: every verdict shows its rule ID, its source and what was not checked, in one defined component.
- **Copy** is Korean-first, short and verb-first, and never narrates itself.

### 1.2 Banned anti-patterns

Each item cites the track that found it. A reviewer MUST reject a PR that adds any of these. The WP9 lint greps for the mechanical ones (§9.4); the reviewer agent checks the rest (§9.8).

**Colour**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| C1 | Indigo, violet, purple, teal or emerald anywhere, including hexes `#6366f1`, `#818CF8`, `#0f766e`, `#134E4A`, `#10b981`, `#047857`; any Tailwind default palette class (`bg-blue-600`, `text-gray-500`…) | ai-tells #4, #8; audit §2; critique P0-2/P0-3 | `--brand` for interaction; tokens for everything else |
| C2 | Gradients on text, buttons, cards or backgrounds (`bg-clip-text text-transparent`, `linear-gradient`, `radial-gradient`, glow blobs) | ai-tells #1, #22 | Flat surfaces. The only allowed gradient is the skeleton shimmer. |
| C3 | A different accent per product or section | ai-tells #7; audit §3.1 | One accent |
| C4 | Severity or decision colours used for decoration or emphasis | ai-tells rule 5 | Ink weight and size for emphasis |
| C5 | Cream or "warm minimal" backgrounds (`#f7f7f5`, `#F4F1EA`, `#FBF5E3` as a row fill), terracotta | ai-tells #5; critique P1-3 | `--background` |
| C6 | Colour as the only signal | ai-tells §4; Vercel guidelines | Word + colour (+ icon on severity) |
| C7 | A light-grey app canvas with white bordered cards on it | critique P0-1 | `--background` canvas; tables unboxed |

**Layout and components**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| L1 | A centred hero with a pill eyebrow and two pill CTAs; a split hero; a 180 vh scroll-linked hero; a WebGL shader | audit §3.1; ai-tells #1, #2; critique P0-1 | Full-width left-aligned hero over a live product crop (§5.1) |
| L2 | Three-up icon-in-a-rounded-square feature cards | ai-tells #9; audit §3.5 | Real UI crops, or two-column text |
| L3 | Fake miniature product illustrations, including 9–10 px text inside "screens" | audit §3.1 | Live components rendered from real data |
| L4 | Coloured 3–4 px strips on any edge of a card or dialog | ai-tells #12; critique P1-12 | Severity goes in the label row |
| L5 | Bordered boxes nested more than one level deep | ai-tells #13 | Spacing, headings and dividers |
| L6 | Shadows on in-flow surfaces; frosted glass (`backdrop-blur`) | ai-tells §4; audit §2 | Hairline border. Shadows only on floating layers (§3.6). |
| L7 | Pills (`rounded-full`) on text badges, buttons, tags or counts | ai-tells #11 | 4 px badges, 6 px buttons. `rounded-full` only for avatars and switch tracks. |
| L8 | Dashed borders, except on a file drop zone | ai-tells #20 | Solid hairline |
| L9 | `01 / 02` numbering, "a · b · c" metadata strings of three or more parts, "→" glued to links | ai-tells #6, #14; critique P1-9 | `DescriptionList`; numbering only for real steps |
| L10 | An explanation paragraph under every widget, repeated disclaimers, self-narration ("Not a screenshot", "실제 엔진 출력") | audit §3.3, §3.5; ai-tells #15, #16 | One `합성 데이터` / `교육용 프로토타입` marker per screen, in the top bar. Definitions go in tooltips. |
| L11 | Zero-count rows ("0 Major · 0 Moderate…") | audit §3.5 | Non-zero counts only |
| L12 | Highlighting every row in a table, or a badge on most rows | audit §3.3; critique P0-10 | Flag only flagged rows; de-emphasise instead of badging |
| L13 | Bars scaled to the maximum value but labelled as percentages | audit §3.3 | 0–100 % scale |
| L14 | `<div onClick>` / `<tr onClick>` / programmatic navigation from a click handler | audit §5 | `<a href>` / `<Link>` |
| L15 | A KPI stat strip or a row of 3–4 metric cards that advertises the product's own design ("848 aliases", "4 rule families") | ai-tells #3; audit; critique P0-1 | One worked example (§5.1 ledger); `MetricStrip` in the app only |
| L16 | Feature sections alternating text-left / UI-right | audit; critique P0-1 | Same orientation for every section |
| L17 | The stock dashboard: four KPI cards, a 2/3 chart + 1/3 funnel, three bar-list cards | critique P0-1 | Queue-first overview (§5.3) |

**Typography**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| T1 | DM Sans, DM Mono, Inter, JetBrains Mono, Geist / Geist Mono, Space Grotesk, Instrument Serif, Fraunces, or any Google Fonts / jsDelivr / unpkg font URL | ai-tells #3, #18; audit §2; critique P1-7 | Self-hosted Pretendard Variable; system monospace for code only (§2.4) |
| T2 | Uppercase (`uppercase`, `text-transform: uppercase`) anywhere outside print.css; positive letter-spacing on Hangul | ai-tells #10 | Sentence case at `text-xs` weight 500 in `--muted-foreground` |
| T3 | Text smaller than 12 px; half-pixel sizes | audit §3.1, §3.3 | The type scale (§3.3) |
| T4 | Missing `word-break: keep-all` on Korean | ai-tells #17 | Global base style (§3.3) |
| T5 | Proportional digits in tables, KPIs, doses or amounts | ai-tells §4 | `.num` |
| T6 | A different colour on the second line of a headline; one highlighted word | ai-tells #6 | One colour per heading |
| T7 | Monospace "data labels" for IDs on every row | critique P1-7 | `.id` (Pretendard, `tnum zero`, 500) |

**Motion**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| M1 | Fade-up on scroll, staggered entrances, count-up numbers, bounce or spring overshoot, `transition: all`, infinite decorative animation, scale-on-press | ai-tells §3; audit §3.1 | §3.7 durations; only `transform`/`opacity` |

**Copy**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| W1 | "seamless / powerful / elevate / unlock / Get started / 혁신적인 / 혁신 / 강력한 / 안전합니다", "honest / 정직한", "not just X but Y", lists of three for rhythm, an em dash in any heading or more than one per screen, `...`, `→` in strings | ai-tells #15, §3; critique P1-1, P1-9 | §6 copy rules |
| W2 | Meta-commentary about the page itself ("Rule counts per layer are read from…", print-dialog instructions) | audit §3.5 | Delete, or one sentence on `#/how-it-works` |
| W3 | Leaked enums or English in Korean UI (`antibiotic`, `gi_protectant`, `/visit`, "Acute gastroenteritis") | audit §6.4 | Korean display names; the code as a secondary `.id` line if needed |
| W4 | Answer-key leakage ("합성 데이터 정답 라벨") in reviewer views | audit §3.3 | Engine-performance page only |
| W5 | Unresolved particles ("나비(으)로") | audit §6.7 | `withParticle` (§6.3) |
| W6 | Verbless fragment headlines with a comma ("펫보험 청구를, 근거가 붙은 데이터로.") | critique P1-9 | A full sentence with a verb |

---

## 2. Library stack

### 2.1 Verified versions (stack track, Chromium 141, 2026-10-03)

Only these versions are allowed; they were installed, built and exercised together. Pin exactly (no `^`).

```bash
cd frontend
npm i -E tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 tw-animate-css@1.4.0 \
  radix-ui@1.6.7 class-variance-authority@0.7.1 clsx@2.1.1 tailwind-merge@3.7.0 \
  cmdk@1.1.1 sonner@2.0.8 vaul@1.1.2 \
  @tanstack/react-table@9.2.4 recharts@3.10.1 react-is@19.3.0 \
  pretendard@1.3.9
npm i -E -D subset-font@2.9.0
npm rm autoprefixer postcss @tailwindcss/postcss       # build tooling replaced by @tailwindcss/vite
# NOT removed by WP0: framer-motion, three. They are still imported by ShaderHero/CTASection/FeatureSection/
#   features/*Illustration (WP8), Start.jsx (WP8) and Insurance.jsx (WP6). WP9 removes them after WP6 and WP8
#   have merged and `grep -rE "from '(three|framer-motion)" src` is empty; the build must pass after removal.
# unchanged: react/react-dom 19.3.0, react-router-dom 7.18.4, vite 8.3.2, @vitejs/plugin-react 6.1.1,
#            vitest 5.0.3, lucide-react 1.50.0
```

**Not allowed in this phase:**
- **Packages the stack track did not verify:** `@tanstack/react-virtual`, `@visx/*`, `react-day-picker`, `@base-ui/react`, `next-themes`, any `@fontsource*` package, `pixelmatch`, `axe-core`.
- **`motion`:** CSS plus `tw-animate-css` covers §3.7.
- **`react-resizable-panels`:** no surface needs resizable panes.

**TanStack Table 9.2.4 has a new API.** shadcn's data-table docs still describe v8, so use this pattern (verified in `/tmp/claude-0/uiresearch/stack/proj/src/Demo.jsx`):

```jsx
import { useTable, tableFeatures, rowSortingFeature, createSortedRowModel, sortFns, createColumnHelper } from '@tanstack/react-table'
const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns })
const table = useTable({ features, columns, data })
// header: <table.FlexRender header={h} />   cell: <table.FlexRender cell={cell} />
```

For other features read `node_modules/@tanstack/react-table/dist/*.d.ts`; do not guess v8 names. Pagination of at most 312 rows is client-side slicing; no virtualisation.

### 2.2 Where shared UI lives

```
frontend/
  components.json              shadcn config (below)
  jsconfig.json                {"compilerOptions":{"baseUrl":".","paths":{"@/*":["./src/*"]}}}
  scripts/vendor-shadcn.mjs    copied from /tmp/claude-0/uiresearch/stack/proj/scripts/ (pinned to shadcn commit 295a1f1…)
  scripts/restyle-shadcn.mjs   the §4.1 find/replace table, run after every vendoring (idempotent)
  scripts/vite-plugin-subset-fonts.js        (stack origin; standalone build)
  scripts/vite-plugin-font-subset-import.js  (stack origin; widget build)
  src/ui/
    tokens.css                 every design token, light + dark (§3). Plain CSS, no Tailwind directives.
    theme.css                  Tailwind v4 bridge (§2.5)
    pairs.json                 every text × background pair any component renders (§3.2)
    fonts.js                   main-app font import (§2.4)
    fonts-standalone.css       one @font-face, for single-file builds
    cn.js                      export function cn(...a){ return twMerge(clsx(a)) }
    theme.js                   getTheme()/setTheme()/useTheme() (§2.6)
    primitives/*.jsx           vendored shadcn new-york-v4 components, restyled by script (§4.1)
    patterns/*.jsx             shared NuvoVet compositions (owner WP0 / UI steward, §4.0)
    ext/<wp>/*.jsx             components added by a later WP for its own surface (§4.0, §8)
    golden/*.jsx               the three reference screens (§9.9)
    lib/format.js              Korean number, currency and date formatting (§6.4)
    lib/particle.js            Korean particle helper (§6.3)
    index.js                   barrel export of primitives + patterns (not ext/)
```

`components.json`:
```json
{ "$schema":"https://ui.shadcn.com/schema.json","style":"new-york","rsc":false,"tsx":false,
  "tailwind":{"config":"","css":"src/index.css","baseColor":"neutral","cssVariables":true,"prefix":""},
  "iconLibrary":"lucide",
  "aliases":{"components":"@/ui","utils":"@/ui/cn","ui":"@/ui/primitives","lib":"@/ui/lib","hooks":"@/ui/hooks"} }
```

**Vendoring.** The proxy blocks `ui.shadcn.com` (403), so use the stack track's script:

```bash
node scripts/vendor-shadcn.mjs button input textarea label select checkbox radio-group switch \
  dialog alert-dialog sheet drawer popover tooltip hover-card dropdown-menu command tabs table badge card \
  separator scroll-area skeleton kbd sonner sidebar toggle toggle-group chart input-group collapsible \
  breadcrumb pagination alert
node scripts/restyle-shadcn.mjs
git diff --stat src/index.css   # the CLI may inject theme variables; revert them — tokens live in src/ui/tokens.css
```

- **`patch()`** in the vendor script rewrites `from "cn"` to the utils alias; set its target to `@/ui/cn`.
- **Sonner:** the wrapper reads the theme from `document.documentElement.dataset.theme` (`'dark'`/`'light'`, else `'system'`), not `next-themes`.
- **No portalize step.** `scripts/portalize.mjs` and `vite-plugin-shadow-focus.js` are NOT used. The DUR widget uses no Radix (popup spec §3.1).
- **If `/tmp/claude-0/uiresearch/stack/` is gone:** fetch `https://raw.githubusercontent.com/shadcn-ui/ui/295a1f114a138f23b5dfee0e0c6812394dfeb90c/apps/v4/registry/new-york-v4/ui/<name>.tsx`, rewrite `from "cn"`, wrap each file in a registry-item JSON, and run `REGISTRY_URL=https://raw.githubusercontent.com/shadcn-ui/ui/<sha>/apps/v4/public/r npx shadcn@4.21.1 add ./<name>.json`.

**Who may import what:**

| Code | May import |
|---|---|
| `src/ui/**` | react, react-dom, the §2.1 packages, lucide-react, other `src/ui` files |
| `src/pages/**` | anything |
| `src/portfolio/**` | react, react-dom, lucide-react and `@/ui/**`. Nothing else outside `src/portfolio`, so `src/portfolio` + `src/ui` copied into a fresh repo still builds. Amends showcase §0.4. |
| `src/portfolio/emr/widget/**` | react, react-dom, lucide-react, `src/portfolio/engine/**`, `src/portfolio/knowledge/**`, `src/portfolio/emr/*.js`, `@/ui/tokens.css?inline`. **Not** `@/ui/primitives`, patterns or Radix (popup spec §3.1). |
| `src/ui/ext/<wp>/**` | the same as `src/ui/**`, plus `src/ui/patterns`. Not another WP's `ext/`. |

**Aliases.** Vite and Vitest resolve `@` → `src` in `vite.config.js`, `vite.portfolio.config.js` and `vite.widget.config.js`.

### 2.3 Tailwind 3 → 4 migration recipe (WP0, before any other UI WP starts)

Do not run v3 and v4 side by side. Steps 1–5 run over **every** file in `frontend/` and are exempt from the ownership rule (§8.0); WP0's report lists every file the codemod touched. No other UI WP starts until step 8 passes.

1. **Start from a clean tree** for `frontend/` (other WPs have not started). Run `npx @tailwindcss/upgrade@4.3.3` in `frontend/` (about 23 s).
2. **Revert the false edit** in `src/portfolio/components/pages/__tests__/pages.test.js` (the tool renames the test "shadow UI keys" to "shadow-sm UI keys"). Review the template diff for other renames of that kind.
3. **Move the global reset into `@layer base`.** Rules not in a layer beat every v4 utility: straight after the upgrade, 60 of 60 padded elements on `/` computed to 0 px.
   - Rules to move: `*`, `html`, `body`, `#root`, scrollbar, number-input spinner, `input:focus`, `button:focus-visible`, `html[lang=ko] body`.
   - Helper: `/tmp/claude-0/uiresearch/stack/upgrade/layer-element-rules.py`.
4. **Switch to the Vite plugin:** `rm postcss.config.js tailwind.config.js`; in `vite.config.js` and `vite.portfolio.config.js` add `import tailwindcss from '@tailwindcss/vite'` and `plugins: [react(), tailwindcss(), …]`.
5. **Wrap `src/pages/insurance/insurance.css` in `@layer components { … }`.** Its unlayered `.card`, `.btn`, `.gap-8` would beat utilities. WP6 deletes the file later.
6. **Replace `src/index.css`** with exactly:
   ```css
   @import "tailwindcss";
   @import "tw-animate-css";
   @import "./ui/tokens.css";
   @import "./ui/theme.css";
   @source not "./portfolio/emr/widget";   /* the widget ships its own CSS */
   @layer base { /* §3.3 global text rules, §3.9 focus, body background */ }
   ```
   The ~40 dead utility and animation classes of the old file (audit §1) are deleted.
7. **`index.html`:** remove the Google Fonts / jsDelivr loader; `<html lang="ko">`; `<meta name="color-scheme" content="light dark">`; `<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">` and `content="#0E0F11"` for dark; the theme bootstrap (§2.6); title `nuvovet`; description "동물병원 진료 기록을 펫보험 청구 데이터로 정형화하고, 근거와 함께 심사합니다."
8. **Acceptance:** `npm run build`, `npm run build:portfolio` and `npm test` pass, and `/`, `/insurance`, `/clinic/claim`, `/dur` render (old pages may still look old; they must not break).

### 2.4 Fonts (self-hosted, no CDN)

- **Sans, for everything:** Pretendard Variable. It ships `tnum`, `zero`, `case`, `ss01–16`, `cv01–13`.
- **Monospace:** code blocks and API paths only, using the system stack `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. No monospace web font is shipped.
- **Identifiers** (claim IDs, rule IDs, product codes, KCD-style codes) use the `.id` class in Pretendard (§3.3), never monospace.

**Main app.** `src/ui/fonts.js`, imported once from `src/main.jsx`:
```js
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css' // 92 unicode-range slices, same-origin
```

**Standalone single-file build.** `src/portfolio/standalone.jsx` imports `@/ui/fonts-standalone.css`: one `@font-face` pointing at `pretendard/dist/web/variable/woff2/PretendardVariable.woff2`. `PortfolioApp.jsx` MUST NOT import fonts itself. In `vite.portfolio.config.js`: `subsetFonts()` before `inlineSingleFile()`; `assetsInlineLimit: (f) => f.endsWith('.woff2') ? false : undefined`; `'font-src data:'` in the CSP. Measured: Pretendard 2,009 → 50 kB, still variable.

**Font tokens** (source names are namespaced so the Tailwind bridge never maps a variable onto itself):
```
--nv-font-sans: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif;
--nv-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

**Known limit.** Hangul typed at runtime that is not in the subset (a free-text comment) falls back to the system Korean font in the standalone and widget builds. Acceptable; do not ship the 435 kB KS X 1001 set.

### 2.5 Tailwind bridge (`src/ui/theme.css`)

Tailwind's default palette, type scale, shadows, radii and unused breakpoints are wiped, so a stray default class compiles to nothing and the lint (§9.4) catches it. Verified with Tailwind 4.3.3 (`text-foreground`, `bg-sev-critical/10`, `rounded-full` still compile; `bg-blue-500`, `text-4xl`, `shadow-md`, `rounded-2xl` do not).

```css
@custom-variant dark {
  @media (prefers-color-scheme: dark) {
    &:where(:root:not([data-theme="light"]) *, .nv-scope:not([data-theme="light"]) *) { @slot; }
  }
  &:where([data-theme="dark"] *, [data-theme="dark"]) { @slot; }
}
@custom-variant touch (@media (pointer: coarse));
@theme inline {
  --color-*: initial; --text-*: initial; --shadow-*: initial; --radius-*: initial;
  --breakpoint-md: initial; --breakpoint-2xl: initial; --breakpoint-wide: 1440px;
  --font-sans: var(--nv-font-sans); --font-mono: var(--nv-font-mono);
  --color-background: var(--background); --color-foreground: var(--foreground);
  --color-card: var(--card); --color-card-foreground: var(--foreground);
  --color-popover: var(--popover); --color-popover-foreground: var(--foreground);
  --color-primary: var(--primary); --color-primary-hover: var(--primary-hover); --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary); --color-secondary-foreground: var(--foreground);
  --color-muted: var(--muted); --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent); --color-accent-foreground: var(--foreground);   /* shadcn "accent" = hover surface */
  --color-destructive: var(--sev-critical-solid);
  --color-border: var(--border); --color-input: var(--input); --color-ring: var(--ring);
  --color-subtle: var(--surface-subtle); --color-row-hover: var(--row-hover); --color-backdrop: var(--backdrop);
  --color-text-2: var(--text-2); --color-text-faint: var(--text-faint); --color-border-strong: var(--border-strong);
  --color-brand: var(--brand); --color-brand-hover: var(--brand-hover); --color-brand-soft: var(--brand-soft);
  --color-sev-critical: var(--sev-critical); --color-sev-critical-bg: var(--sev-critical-bg); --color-sev-critical-solid: var(--sev-critical-solid);
  --color-on-solid: var(--on-solid);
  --color-sev-major: var(--sev-major); --color-sev-major-bg: var(--sev-major-bg);
  --color-sev-moderate: var(--sev-moderate); --color-sev-moderate-bg: var(--sev-moderate-bg);
  --color-sev-minor: var(--sev-minor); --color-sev-minor-bg: var(--sev-minor-bg);
  --color-ok: var(--ok); --color-ok-bg: var(--ok-bg);
  --color-sidebar: var(--surface-subtle); --color-sidebar-foreground: var(--foreground);
  --color-sidebar-accent: var(--accent); --color-sidebar-accent-foreground: var(--foreground);
  --color-sidebar-border: var(--border); --color-sidebar-ring: var(--ring);
  --color-sidebar-primary: var(--primary); --color-sidebar-primary-foreground: var(--primary-foreground);
  --color-chart-1: var(--chart-1); --color-chart-2: var(--chart-2); --color-chart-3: var(--chart-3);
  --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px; --radius-xl: 12px;
  /* type scale (§3.3): only these keys exist */
  --text-xs: 12px; --text-xs--line-height: 16px;
  --text-sm: 13px; --text-sm--line-height: 20px;
  --text-base: 14px; --text-base--line-height: 22px;
  --text-lg: 16px; --text-lg--line-height: 24px;
  --text-xl: 20px; --text-xl--line-height: 28px;
  --text-2xl: 24px; --text-2xl--line-height: 32px;
  --text-3xl: 32px; --text-3xl--line-height: 40px;
  --text-5xl: 48px; --text-5xl--line-height: 56px;
  --text-6xl: 64px; --text-6xl--line-height: 72px;
  --shadow-pop: var(--nv-shadow-pop); --shadow-modal: var(--nv-shadow-modal);
  --ease-out: cubic-bezier(0.2, 0, 0, 1); --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --z-sticky: 10; --z-header: 20; --z-sidebar: 30; --z-overlay: 50; --z-toast: 60;
}
```

**Utility naming rules:**
- **Only the keys listed here exist.** `text-4xl`, `text-7xl`, `shadow-md`, `rounded-2xl`, `md:` and `2xl:` do not compile.
- **NEVER invent font-size utility names** such as `text-caption`; tailwind-merge would read them as colours and drop `text-foreground`.
- **`dark:` is rarely needed**, because every colour is a token that flips. It now fires for explicit dark *and* for system dark without an attribute (the variant above), so shadcn's own `dark:` classes behave the same in both cases.
- **`touch:`** is the coarse-pointer variant (§3.4).

### 2.6 Dark mode mechanism

**One attribute, everywhere:** `data-theme="light" | "dark"` on `<html>` (main app, standalone) or on `.nv-scope` (widget shadow roots). No attribute means "follow the system".

**Bootstrap script**, inline in `<head>` of `index.html` and `portfolio.html`, before any CSS:
```html
<script>(function(){try{var t=localStorage.getItem('nv-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();</script>
```

**`src/ui/theme.js`:**
- `getTheme()` → `'light' | 'dark' | 'system'`.
- `setTheme(t)`: sets or removes the attribute; writes `localStorage['nv-theme']` in try/catch; removes the legacy key `nuvovet.dur.theme` after reading it once.
- `resolvedTheme()` → `'light' | 'dark'` via `matchMedia('(prefers-color-scheme: dark)')`.
- `useTheme()` subscribes to changes and to the media query.

**Portfolio.** `PortfolioApp.jsx` stops setting `data-theme` on `.pf-root` and calls `setTheme`. The standalone CSP already allows inline scripts.

**ThemeToggle** (three states 시스템 / 라이트 / 다크) appears in the console top bar, the clinic header and the `/dur` header. The landing page follows the system setting and has no toggle.

---

## 3. Tokens (`src/ui/tokens.css`)

### 3.1 Colour: exact values

**Selectors.** Light tokens on `:root, .nv-scope`. Dark tokens twice: under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]), .nv-scope:not([data-theme="light"]) {…} }` and under `:root[data-theme="dark"], .nv-scope[data-theme="dark"] {…}`. Set `color-scheme: light` / `dark` respectively.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#0E0F11` | **app and marketing canvas**, in-flow cards |
| `--card` | `var(--background)` | `var(--background)` | in-flow cards are not raised |
| `--popover` (`--surface-raised`) | `#FFFFFF` | `#1C1E22` | floating layers only (menus, popovers, dialogs, sheets, toasts) |
| `--surface-subtle` | `#F7F8FA` | `#16171A` | sidebar, table header, code blocks, Kbd. **Not** the page background. |
| `--surface-muted` (`--muted`, `--secondary`, `--accent`) | `#F0F2F5` | `#232529` | secondary button, segmented-control track, skeleton |
| `--row-hover` | `rgb(16 24 40 / .04)` | `rgb(255 255 255 / .05)` | row / ghost hover; doubled opacity when pressed |
| `--foreground` | `#16191E` | `#ECEEF1` | primary text |
| `--text-2` | `#4D5560` | `#A9AFB8` | secondary text, rule IDs |
| `--muted-foreground` | `#646C77` | `#8D949E` | meta text, captions, placeholders |
| `--text-faint` | `#9AA1AA` | `#5F656E` | not used for text (disabled uses `opacity-50` only) |
| `--border` | `rgb(16 24 40 / .10)` | `rgb(255 255 255 / .09)` | hairlines (decorative) |
| `--border-strong` | `rgb(16 24 40 / .18)` | `rgb(255 255 255 / .14)` | table header rule, grouping dividers, ledger double rule |
| `--input` | `#848B95` | `#666D77` | form-control borders (≥ 3:1 non-text) |
| `--primary` | `#16191E` | `#ECEEF1` | primary button (ink) |
| `--primary-hover` | `#30353D` | `#D5D9DE` | primary hover and pressed |
| `--primary-foreground` | `#FFFFFF` | `#0E0F11` | text on ink |
| `--brand` | `#2457F5` | `#6E9BFF` | links, focus, selection, chart series 1 (OKLCH hue 264.9° / 264.5°) |
| `--brand-hover` | `#1C47D6` | `#8DB1FF` | link hover |
| `--brand-soft` | `#EDF2FF` | `#18213D` | selected nav item, selected row, `::selection` |
| `--ring` | `#2457F5` | `#6E9BFF` | focus outline |
| `--chart-1` / `-2` / `-3` | `#2457F5` / `#4D5560` / `#848B95` | `#6E9BFF` / `#A9AFB8` / `#666D77` | categorical series, in this order |
| `--backdrop` | `rgb(14 15 17 / .48)` | `rgb(0 0 0 / .64)` | modal scrim |
| `--on-solid` | `#FFFFFF` | `#FFFFFF` | text on `--sev-critical-solid` |

**Semantic status.** Text colour, tint background and (critical only) a solid fill.

| Token | Light fg / bg | Dark fg / bg | DUR meaning | Claims meaning |
|---|---|---|---|---|
| `--sev-critical` / `-bg` | `#C8241B` / `#FDF0EF` | `#FF6B5E` / `#2A1513` | 금기 text | 지급 거절 권고 `deny_recommended`; finding 심각 |
| `--sev-critical-solid` | `#C8241B` | `#C8241B` | 금기 badge fill, destructive button | — |
| `--sev-major` / `-bg` | `#B84A00` / `#FDF2E9` | `#FF8F3D` / `#2A1A0E` | 중대 major | — |
| `--sev-moderate` / `-bg` | `#8F6200` / `#FBF5E3` | `#E3B341` / `#272011` | 주의 moderate | 심사 필요 `review`; finding 주의 |
| `--sev-minor` / `-bg` | `#4D5560` / `#F0F2F5` | `#A9AFB8` / `#232529` | 경미; 참고; 검토 불완전 | finding 정보 |
| `--ok` / `-bg` | `#1A7F37` / `#EEF7EF` | `#4AC26B` / `#10241A` | dose "범위 내" status text only (never a verdict) | 자동 승인 `auto_approve` |

There is no `--info` token: 서류 요청 (`pend`) is a neutral outline badge (§4.5), so it can never be mistaken for a link or a selected row.

**Tinted status surfaces** (the DUR verdict summary, an `Alert`) add `border: 1px solid color-mix(in oklab, var(--sev-*) 28%, transparent)`, so they stay visible in dark mode where the tint alone is ≈ 1.04:1 on the page.

**Rules:**
- DUR "규칙상 문제 없음" (verdict `none`) is **neutral**: `--sev-minor` text, no green. Green is never a DUR verdict.
- Red appears only for 금기 and 지급 거절 권고.
- Status precedence on one element: critical > major > moderate > ok > minor.

### 3.2 Contrast (WCAG 2.x)

Computed with `/tmp/claude-0/uiresearch/spec-rev/contrast_rev.py` (relative luminance, sRGB; transparent tokens blended over the surface they sit on).

**Text tokens, light** (on `#FFFFFF` / `#F7F8FA` / `#F0F2F5`): foreground 17.62 / 16.58 / 15.71; text-2 7.54 / 7.10 / 6.73; muted-foreground 5.31 / 5.00 / 4.74; brand 5.59 / 5.26 / 4.98 (4.99 on brand-soft); brand-hover 7.19 / 6.76 / 6.41; sev-critical 5.64 / 5.31 / 5.03; sev-major 5.23 / 4.92 / 4.66; sev-moderate 5.36 / 5.05 / 4.78; sev-minor 7.54 / 7.10 / 6.73; ok 5.08 (4.64 on ok-bg); input border 3.44 / 3.24.

**Text tokens, dark** (on `#0E0F11` / `#16171A` / `#1C1E22` / `#232529`): foreground 16.50 / 15.42 / 14.36 / 13.21; text-2 8.69 / 8.12 / 7.56 / 6.95; muted-foreground 6.27 / 5.86 / 5.45 / 5.02; brand 7.12 on page, 6.20 on popover, 5.89 on brand-soft; brand-hover 9.01; sev-critical 6.86 / 6.42 / 5.97 / 5.49; sev-major 8.45 / 7.89 / 7.35 / 6.76; sev-moderate 9.85 / 9.21 / 8.58 / 7.89; ok 8.42 (7.15 on ok-bg); input border ≈3.7 / 3.43.

**Status text on its own tint (badges):** critical 5.07 light / 6.19 dark; major 4.74 / 7.38; moderate 4.92 / 8.29; minor 6.73 / 6.95; ok 4.64 / 7.15.

**Fills:**

| Pair | Ratio |
|---|---|
| white on ink `#16191E` | 17.62 |
| white on primary-hover `#30353D` | 12.34 |
| dark: `#0E0F11` on `#ECEEF1` / on `#D5D9DE` | 16.50 / 13.52 |
| `--on-solid` white on `--sev-critical-solid` `#C8241B` (both themes) | 5.64 |
| solid `#C8241B` against the dark page (non-text shape) | 3.40 |
| foreground on brand-soft | 15.73 light / 13.65 dark |

**Hairlines and hover** (blended): border 1.23 light, 1.25 dark page, 1.30 dark popover; border-strong 1.47 light, 1.47 dark; row-hover 1.08 light, 1.11 dark. Hairlines are decorative; any boundary that identifies a control uses `--input`. Hover is never the only state signal (selected rows use `--brand-soft` + `aria-selected`).

**Focus ring:** 5.59 light, 7.12 dark against the page (≥ 3 required).

**`--chart-3` light** `#848B95` is 3.44: it may only carry series that are also direct-labelled.

**`src/ui/pairs.json`** lists every text-colour × background pair any component can render (including status text on tints, `on-solid` on solid, foreground on brand-soft, muted on row-hover). The WP0 contrast test (§8 WP0) fails when a pair is below 4.5 (3 for non-text and ≥ 24 px text), when a dark token's OKLCH hue differs from its light token's by more than 3° (brand, ring, ok, chart-1), **and** when a component's class list uses a `text-*`/`bg-*` token combination that is not in `pairs.json` (scanned from `src/ui/**`).

### 3.3 Type scale

| Class | px / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `text-xs` | 12 / 16 | 500 | 0 | captions, table meta, axis labels, badges, tooltips |
| `text-sm` | 13 / 20 | 400 / 500 | 0 | table cells, side panels, menus, buttons, EMR widget body |
| `text-base` | 14 / 22 | 400 | 0 | default app body |
| `text-lg` | 16 / 24 | 400; 600 for titles | 0 | marketing body, inputs on `touch:` (prevents iOS zoom), panel titles |
| `text-xl` | 20 / 28 | 600 | −0.01em (Latin only) | app page title (one per screen) |
| `text-2xl` | 24 / 32 | 600 / 700 | −0.015em (Latin only) | MetricStrip values, marketing h3 |
| `text-3xl` | 32 / 40 | 700 | 0 for Hangul | marketing h2 |
| `text-5xl` | 48 / 56 | 700 | 0 for Hangul | landing hero ≥ 1024 |
| `text-6xl` | 64 / 72 | 700 | 0 for Hangul | at most once on the site |

**Rules:** weights 400/500/600/700 only; app screens never use `text-3xl` or larger; negative tracking only on Latin-heavy lines; at most 6 distinct font sizes on an app screen and 8 on a marketing screen (§9.7).

**Global base** (`@layer base` in `index.css`; the widget repeats it under `.nv-scope`):
```css
html { -webkit-text-size-adjust: 100%; }
body { background: var(--background); color: var(--foreground); font-family: var(--nv-font-sans); font-size: 14px; line-height: 22px;
       font-feature-settings: "ss06"; /* Pretendard: straight-sided l for 1/l legibility in doses */ }
:where(h1,h2,h3,h4,p,li,td,th,label,dt,dd,span,div) { word-break: keep-all; overflow-wrap: break-word; }
:where(h1,h2,h3) { text-wrap: balance; }  :where(p) { text-wrap: pretty; }
.num, :where(td.num, th.num) { font-variant-numeric: tabular-nums; text-align: right; }
.num, .id, :where(td.num, th.num) { white-space: nowrap; }
.id { font-feature-settings: "tnum", "zero"; font-weight: 500; letter-spacing: 0; }
.mono { font-family: var(--nv-font-mono); font-size: 12px; letter-spacing: 0; }   /* code and API paths only */
.ledger-total { border-top: 3px double var(--border-strong); }
::selection { background: var(--brand-soft); }
```

`overflow-wrap: anywhere` is banned: it made a 7-column table "fit" at 390 px by breaking `7,383,700` across three lines. Tables that do not fit scroll inside their own container (`overflow-x: auto` on the table wrapper, never the page). **If `ss06` changes any Hangul glyph in Chromium** (WP0 checks with one screenshot), drop it.

### 3.4 Spacing, sizing, layout

**Spacing.** Tailwind's 4 px scale, only `0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24` (0–96 px). 96 px is for marketing sections only.

**Controls:** default 32 px (`h-8`), small 28 px (`h-7`), large 40 px (`h-10`); on `touch:` (coarse pointer, any width) every control is `h-10` with a hit area ≥ 44 px; inline padding 12 px; icon buttons 32×32 with a 16 px icon (`touch:` 40×40).

**Rows:** default table row 36 px; compact 32 px (insurer queue default); comfortable 44 px (clinic form grids); list item 40 px; nav item 32 px. Header row height = body row height.

**App shell:** sidebar 240 px expanded / 56 px collapsed; top bar 48 px; page padding 24 px (16 px under 640 px); reading width max 1200 px; tables full width.

**Gaps:** 8 px inside a control group; 12 px between related fields; 24 px between app sections. Marketing: hero `pt-24 pb-16`, ledger `py-16`, capability sections `py-12`, footer `py-12`.

**Breakpoints:** `sm 640`, `lg 1024`, `xl 1280`, `wide 1440`. `md` and `2xl` do not exist.

**Container:** marketing `max-w-[1200px] px-6` (`px-4` under 640); app content full width inside the shell.

### 3.5 Radius

| Size | Radius | Used for |
|---|---|---|
| `rounded-sm` | 4 px | badges, checkboxes, chips, kbd, segmented items |
| `rounded-md` | 6 px | buttons, inputs, menu items, tooltips, segmented track |
| `rounded-lg` | 8 px | cards, popovers, side panels, toasts, the EMR DUR panel |
| `rounded-xl` | 12 px | dialogs, sheets (outer corner), the EMR gate dialog |
| `rounded-full` | 9999 px / 50 % | avatars and switch tracks only |

Inner radius = outer radius − padding, never larger than the parent. Every computed radius on a screenshot is one of 0, 4, 6, 8, 12, 9999 px or 50 % (§9.7).

### 3.6 Borders, shadows, ledger rules

**In-flow surfaces:** 1 px `border-border`, no shadow.

**Floating layers only:**
```css
--nv-shadow-pop:   0 0 0 1px rgb(16 24 40 / .06), 0 1px 2px rgb(16 24 40 / .06), 0 4px 12px rgb(16 24 40 / .08);  /* menus, popovers, toasts, tooltips */
--nv-shadow-modal: 0 0 0 1px rgb(16 24 40 / .08), 0 2px 4px rgb(16 24 40 / .06), 0 16px 48px rgb(16 24 40 / .18); /* dialogs, sheets, EMR gate */
/* dark: same geometry with rgb(0 0 0 / .5), on --popover, plus a 1px --border-strong ring */
```
Only `shadow-pop` and `shadow-modal` compile.

**Ledger totals.** Every sum row (지급 계산, the landing ledger, report totals) sits under `.ledger-total` (3 px double `--border-strong`). This is the product's one typographic flourish; it appears nowhere else.

### 3.7 Motion

```css
--dur-1: 100ms;  /* hover / press colour */
--dur-2: 150ms;  /* tooltips, tab indicator, disclosure */
--dur-3: 200ms;  /* menus, popovers, combobox, toasts */
--dur-4: 250ms;  /* dialogs, sheets, drawers, EMR gate */
--ease-out: cubic-bezier(0.2, 0, 0, 1);  --ease-in: cubic-bezier(0.4, 0, 1, 1);  --ease-inout: cubic-bezier(0.6, 0, 0.2, 1);
```
- Exits run at about 75 % of the enter duration with `--ease-in`.
- Dialogs fade and scale from 0.98 to 1 (`zoom-in-[0.98]`); sheets and drawers slide 16 px plus fade. Nothing moves more than 16 px. No press nudge or scale.
- Only `opacity` and `transform` animate; list the properties, never `transition: all`.
- `prefers-reduced-motion: reduce` turns every transform animation into a ≤ 100 ms fade; tw-animate-css classes are wrapped in `motion-safe:`.
- Spinners appear after 200 ms and stay ≥ 400 ms. Skeletons (`bg-muted`, 1.2 s shimmer only when motion is allowed) mirror the final layout. No skeleton is visible on `/` at first paint (§5.1).

### 3.8 Z-index

| Token | Value | Layer |
|---|---|---|
| `--z-sticky` | 10 | sticky table headers, sticky action bar |
| `--z-header` | 20 | app top bar, marketing nav |
| `--z-sidebar` | 30 | mobile sidebar sheet |
| `--z-overlay` | 50 | all Radix portals; shadcn's `z-50` stays |
| `--z-toast` | 60 | Sonner |
| widget host | 2147483000 | `:host` of the EMR DUR overlay (popup spec §3.4) |

No other values.

### 3.9 Focus

One treatment for every control, including inputs:
```css
:where(a, button, input, select, textarea, [tabindex], [role="button"], [role="tab"], [role="option"], summary):focus-visible {
  outline: 2px solid var(--ring); outline-offset: 2px;
}
:where(input, select, textarea):focus-visible { border-color: var(--ring); }
```
- No `border-radius: inherit` (it gave focused links and `summary` elements their parent's radius); the outline follows the element's own radius.
- In table rows the first-cell link's outline is inset (`outline-offset: -2px`).
- **Never** `outline: none` / `outline-hidden` without this replacement; the restyle script deletes shadcn's `ring-[3px] ring-ring/50` (≈ 2.3:1 at 50 % opacity).
- Same ring in light and dark (§3.2).

---

## 4. Component inventory

### 4.0 Ownership: every component a surface uses

No surface may render a component that is not in this table. **Shared components are not frozen:** a later WP that needs something new builds it in `src/ui/ext/<wp>/` (e.g. `src/ui/ext/wp6/SavedViewTabs.jsx`) and lists any change it needs to an existing `src/ui` file under REQUESTS in its report (exact file + change). The UI-steward round (§8.3 step 3) applies those requests and promotes an `ext/` component to `patterns/` when a second WP needs it. "Location" is where the file lives at the end of the phase.

| Component | Location | Owner | Used by |
|---|---|---|---|
| Vendored primitives: Button, Input, InputGroup, Textarea, Label, Select, Checkbox, RadioGroup, Switch, Dialog, AlertDialog, Sheet, Drawer, Popover, Tooltip, HoverCard, DropdownMenu, Command, Tabs, Table, Badge, Card, Separator, ScrollArea, Skeleton, Kbd, Toaster, Sidebar, Toggle, ToggleGroup, Chart, Collapsible, Breadcrumb, Pagination, Alert | `src/ui/primitives/` | WP0 | all app surfaces |
| SeverityBadge, DecisionBadge, FindingSeverity, StatusText | `patterns/` | WP0 | WP5, WP6, WP7, WP8 (widget has its own CSS copy) |
| EvidenceTrail, CitationChip | `patterns/` | WP0 | WP5, WP6, WP8; CSS copy in widget (WP3) |
| Num, Money, `lib/format.js`, `lib/particle.js`, useTitle | `patterns/`, `lib/` | WP0 | all |
| Field, MoneyInput, Combobox, EmptyState | `patterns/` | WP0 | WP5, WP6, WP7 |
| DataTable (sorting, density, row states, j/k selection API, pagination footer), DescriptionList | `patterns/` | WP0 | WP5, WP6, WP7 |
| MetricStrip, BarList, ProgressBar | `patterns/` | WP0 | WP6 (overview, clinics), WP5 (evaluation-style bars on how-it-works) |
| PageHeader, Disclosure, CodeBlock | `patterns/` | WP0 | WP5, WP6, WP8 |
| EnvironmentMarker, Logo, ThemeToggle, LangToggle | `patterns/` | WP0 | all; LangToggle on `/dur` (WP5) and the EMR demo bar (WP4) |
| Golden reference screens (§9.9) | `src/ui/golden/` | WP0 | WP9 comparison |
| AppShell (sidebar + top bar), CommandMenu, SavedViewTabs, StickyActionBar, ActivityLog, RangeGlyph, ConfusionMatrix, ClaimDetailPanel | `ext/wp6/` | WP6 | console only |
| ClaimDetailPreview, LineItemTable, FindingList, `heroClaim.json` | `src/pages/insurance/preview/` | WP6 | WP8 (landing crop, ledger) |
| ClaimLedger | `ext/wp8/` | WP8 | landing only |
| Stepper, Dropzone, EditableGrid (DataTable-editable rows) | `ext/wp7/` | WP7 | clinic only |
| RangeBar, MultiCombobox + Tag, OrganMatrix, DoseRowCells, PortfolioHeader | `ext/wp5/` (OrganMatrix stays in `src/portfolio/components`) | WP5 | `/dur` only |
| Widget Panel, Card, GateDialog, RowBadge, CoverageStrip, NotesChecklist, Launcher | `src/portfolio/emr/widget/` (hand-written, no `src/ui`) | WP3 | EMR demo, widget bundle |
| EMR host (EmrApp, WaitList, PatientHeader, RxGrid, RxSearch, DemoBar) | `src/portfolio/emr/host/` (DemoBar uses `src/ui`) | WP4 | EMR demo |

Removed from the inventory: `StatCard` (replaced by MetricStrip), `CategoryBar` (the overview funnel is gone), the `info` status, the `mono` Badge variant (now `id`).

### 4.1 Restyling vendored files (`scripts/restyle-shadcn.mjs`)

Vendored files are changed only by this script, so re-vendoring gives the same result. Rows run in this order (the button `sm` rule before the general `h-9` rule).

| Find | Replace |
|---|---|
| `outline-none` / `outline-hidden` together with `focus-visible:ring-[3px] focus-visible:ring-ring/50` (and `focus-visible:border-ring`) | delete; the §3.9 global outline applies |
| `aria-invalid:ring-*` / `aria-invalid:border-destructive` | `aria-invalid:border-sev-critical` |
| button size `sm`: `h-8` | `h-7` |
| `h-9` / `size-9` | `h-8 touch:h-10` / `size-8 touch:size-10` |
| `shadow-xs`, `shadow-sm`, bare `shadow`, `shadow-md`, `shadow-lg` | delete on in-flow parts; `shadow-pop` on popover, select, dropdown, tooltip and hover-card content; `shadow-modal` on dialog, alert-dialog, sheet, drawer |
| `text-base md:text-sm` (Input, Textarea) | `text-sm touch:text-lg` |
| `dark:bg-input/30`, `dark:bg-destructive/60`, other `dark:` colour overrides | delete (tokens flip) |
| `rounded-[calc(var(--radius)-Npx)]`, `rounded-[2px]`, `rounded-[4px]`, bare `rounded` | `rounded-sm` |
| `rounded-xs` | `rounded-sm` |
| Tabs `data-[state=active]:shadow-sm` | `data-[state=active]:bg-background data-[state=active]:ring-1 data-[state=active]:ring-border-strong` |
| `zoom-in-95` / `zoom-out-95` | `zoom-in-[0.98]` / `zoom-out-[0.98]` |
| `bg-black/50` (dialog, sheet, drawer overlays) | `bg-backdrop` |
| `bg-destructive text-white`, `text-white` | `bg-sev-critical-solid text-on-solid` / `text-on-solid` |
| `uppercase`, `tracking-wide*`, `tracking-widest` | delete |
| `text-[Npx]` / `text-[N.Nrem]` | the nearest §3.3 key |

After the script: `grep -rnE "shadow-(xs|sm|md|lg)|ring-\[3px\]|outline-hidden|bg-black|text-white|md:|rounded-\[" src/ui/primitives` returns nothing (WP0 acceptance).

### 4.2 Icons and states (apply to every component)

**Icons.** Lucide at 16 px with `strokeWidth={1.5}`, or 14 px at the same stroke inside `text-xs` badges. Icons are **required** in SeverityBadge (colour + icon + word is a clinical safety rule). In table cells the DecisionBadge shows word + colour without an icon (the word is the non-colour signal). At most one Lucide icon per table row, excluding the row-action button (§9.7). No icon tiles.

| Item | Spec |
|---|---|
| Primary button hover / pressed | `bg-primary-hover`; pressed looks like hover; no nudge or scale |
| Secondary and ghost hover / pressed | `bg-row-hover`; pressed doubles the opacity |
| Disabled | `opacity-50` only (never also `--text-faint`, which double-dims to ≈ 1.6:1) |
| Selected nav item | `bg-brand-soft text-foreground font-medium`, icon `text-brand`, `aria-current="page"` |
| Tooltip | `bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md`, no arrow, 400 ms delay, max width 280 px |
| Kbd | `h-5 min-w-5 px-1 rounded-sm border border-border-strong bg-subtle text-xs id` |
| Tab counts, sidebar counts | plain `text-xs` muted digits, right-aligned, no bubble |
| Segmented control | track `bg-muted p-0.5 rounded-md`; active item `bg-background ring-1 ring-border-strong rounded-sm` |
| Sticky action bar | `h-14 border-t bg-background`, no blur, no shadow, `z-[var(--z-sticky)]` |
| Charts | horizontal gridlines only; square bars (`radius={0}`); 30 % category gap; `text-xs` muted axis labels with tabular figures; direct labels preferred; status tokens only when the series is itself a decision or severity |
| Skeleton | `bg-muted`; 1.2 s shimmer only under `motion-safe` |

### 4.3 Actions

**`Button`** (vendored). Variants: `default` (ink `bg-primary`), `secondary` (`bg-secondary` + 1 px `border-border`), `outline`, `ghost`, `link` (`text-brand`, underline on hover), `destructive` (`bg-sev-critical-solid text-on-solid`; only for an irreversible delete or "지급 거절 권고 확정"). Sizes: `sm` 28, `default` 32, `lg` 40, `icon` 32×32, `icon-sm` 28×28; every size is 40 px on `touch:`. `loading` puts a spinner left of the label; the label stays. Replaces B1–B9 (landing pills, Start text buttons, console `.btn-*`, `.text-link`, `.icon-btn`, `.pf-btn--*`, `.pf-icon-btn`).

**`ToggleGroup`** (vendored Radix). `single`/`multiple`; `sm`/`default`; segmented styling (§4.2). Replaces `.pf-seg` and the clinic document toggles.

**`DropdownMenu`, `Kbd`** (vendored). Replace the ad-hoc menus and `.pf-kbd`.

### 4.4 Navigation

**`Sidebar`** (vendored, inside WP6's AppShell). Expanded 240 / collapsed 56 (rail with tooltips; state in `localStorage['nv-sidebar']` in try/catch) and a mobile `Sheet`. Items 32 px, `aria-current="page"`, selected style §4.2. Group labels `text-xs` muted sentence case. Replaces `.shell-sidebar`, `.nav-item`, `.org-switcher` and the yellow org tile.

**`Tabs`** (vendored). `underline` (default) and `segmented`; optional plain-digit count. Replaces console `.tabs`, the workbench mobile bar, the queue filters (now SavedViewTabs, WP6).

**`Breadcrumb`** (vendored). Console detail pages ("청구 심사 / SYN-2026-00220") and the `/dur` case study ("사례 연구").

**`CommandMenu`** (WP6, `ext/wp6/`, on vendored `command`). Opens with ⌘K / Ctrl+K and `/`; groups 이동, 청구, 병원, 규칙, 설정; each row shows its shortcut; list capped at 400 px. It is one of the few places allowed to navigate from a handler (§9.4).

**`Link`.** A plain `<a>` / router `<Link>` in `text-brand`. Every navigation is a link.

### 4.5 Data display

**`Badge`** (vendored). 4 px radius, `text-xs` weight 500, 20 px tall, 6 px padding. Variants `neutral`, `outline`, `id` (identifiers in `.id` style). Replaces console `.badge*`, `.chip`, POST/GET pills, "추정"/"없음" tags, Start pills, `.pf-chip`, `.pf-mbadge`, `.pf-badge-edited`, `.pf-labchip`.

**`SeverityBadge`** (pattern). `level ∈ contraindicated | major | moderate | minor | incomplete | none`; sizes `sm` 20 px, `md` 24 px. Icon + word always:
- contraindicated: solid `bg-sev-critical-solid text-on-solid`, icon `OctagonX`;
- major: `bg-sev-major-bg text-sev-major` + 1 px border in `--sev-major`, icon `TriangleAlert`;
- moderate: `bg-sev-moderate-bg text-sev-moderate`, icon `CircleAlert`;
- minor: neutral tint, icon `Info`; incomplete: neutral tint, icon `CircleDashed`; none: neutral tint, icon `CircleCheck` in `--sev-minor`.

| Level | KO | EN |
|---|---|---|
| contraindicated | 금기 | Contraindicated |
| major | 중대 | Major |
| moderate | 주의 | Moderate |
| minor | 경미 | Minor |
| incomplete | 검토 불완전 | Incomplete |
| none | 규칙상 문제 없음 | No rule findings |

A `related` modifier renders the same word in an outline badge (`border-border-strong`, text `--text-2`, no fill, no icon) for drugs that contribute to a finding without being its cause (popup spec §3.7.3). Replaces `.pf-sev--*`, console FindingCard severity, the landing 심각/주의 pills.

**`DecisionBadge`** (pattern). Word + colour; icon only outside tables.

| Decision | KO | Icon (outside tables) | Style |
|---|---|---|---|
| `auto_approve` | 자동 승인 | `CircleCheck` | `text-ok bg-ok-bg` |
| `pend` | 서류 요청 | `FileClock` | neutral outline: `border border-border-strong text-foreground bg-background` |
| `review` | 심사 필요 | `CircleAlert` | `text-sev-moderate bg-sev-moderate-bg` |
| `deny_recommended` | 지급 거절 권고 | `OctagonX` | `text-sev-critical bg-sev-critical-bg` |

**`FindingSeverity`** (claims). 심각 / 주의 / 정보 using critical / moderate / minor tokens.

**`StatusText`.** Word in the status colour (+ 14 px icon), no background. Dose status: 범위 내 / 범위 미만 / 범위 초과 / 참고 용량 없음 / 투여량 확인. Replaces `.pf-status--*`.

**`EvidenceTrail`** (pattern; also the CSS model for the widget card, the DUR workbench finding list, the console FindingList and the landing ledger):
```
[SeverityBadge sm] title (text-sm 500, 1 line)                                amount / dose impact (.num, right)
규칙 pricing.regional_outlier  v1.0  ·  근거 지역 P90 3,120,000원  ·  [CitationChip]          (text-xs, --text-2)
검토 안 함  연령 · 임신/수유                                  (text-xs muted; only when the rule has gaps)
```
Rule IDs use `.id` in `--text-2`. Rows are separated by 1 px `--border`, with no box around each row. The `·` joins here are allowed because each part is a labelled field (규칙 / 근거 / 검토 안 함), not decoration.

**`Card`** (vendored). `rounded-lg border bg-card`, no shadow, only for grouped secondary content (a form section, a code panel, a dialog body). Padding 16 px app / 24 px marketing. Slots `CardHeader` (title `text-lg` 600 + optional action), `CardContent`, `CardFooter`. Replaces `.card*`, `.pf-panel`, `.pf-casecard`, `.pf-casehead`, `.pf-livecase`, `.pf-callout`, Start cards and the landing frosted cards. Tables and finding lists are **not** put in cards.

**`MetricStrip`** (pattern). One bordered row of 2–4 cells separated by vertical hairlines; each cell a `text-xs` muted label above a `text-2xl` `.num` value; no icons, no deltas unless the data has a prior period, no card per metric. 2×2 under 640 px. Replaces `.stat-card`, `Stat`, the landing glass stat strip.

**`DataTable`** (pattern: TanStack v9 + vendored `table`).
- **Header:** sticky (`top-0 z-[var(--z-sticky)] bg-subtle`), bottom border `border-border-strong`, `text-xs` weight 500 muted, sentence case, units in the header ("청구액 (원)"); header height = body row height; cells `px-3`, first/last column `pl-4`/`pr-4`.
- **Sorting:** sortable headers are buttons with `aria-sort`.
- **Cells:** `.num` right-aligned; IDs `.id`; no zebra stripes.
- **Density:** toggle 32 / 36 px.
- **Row behaviour:** the first cell holds an `<a>`; the row click delegates to it. `j`/`k` move the selection, `Enter` opens it. The selection API (`selectedId`, `onSelect`) lets WP6 drive a side panel.
- **Row states:**

  | State | How it looks |
  |---|---|
  | rest | `bg-background`, 1 px bottom `border-border` |
  | hover | `bg-row-hover` |
  | selected (j/k, side panel open) | `bg-brand-soft`, `aria-selected="true"` |
  | keyboard focus | §3.9 outline on the first-cell link, inset −2 px |
  | flagged | **no fill.** A 20 px leading column holds a `CircleAlert` 14 px in `--sev-moderate`; the amount is `font-medium` |
  | flagged + selected | `bg-brand-soft` + the leading icon |
- **States:** empty (EmptyState) / loading (skeleton rows) / error.
- **Pagination footer:** `135건 중 1–50` + Pagination (50 per page).
- **Wrapper:** `overflow-x-auto` on the table container; the page never scrolls sideways.
- Replaces every console `.table` and `.pf-mtable` / `.pf-gtable`. Print tables in the report and handout stay hand-styled.

**`DescriptionList`.** Grid of cells; each a `text-xs` muted `dt` above a `text-sm` `dd` (`.num` when numeric). Replaces `PayableBreakdown`, patient blocks and every "a · b · c" metadata line.

**`Num`, `Money`.** `Money` uses `fmtWon` / `fmtWonCompact` (§6.4); in a column whose header says (원), cells use `Num` with no unit.

**`CitationChip`.** `outline` badge with a `BookOpen` 12 px icon; on hover/focus a `HoverCard` with the cite and DOI. Replaces `.pf-cite`.

**`RangeBar`** (WP5) and **`RangeGlyph`** (WP6). Track `--border-strong`, reference band `--brand-soft`, marker ink. Status colour only on the word next to it.

**`BarList`, `ProgressBar`.** Plain divs. Always 0–100 % or an absolute value with an axis label and the count printed. Replaces console BarList, `PercentileBar` and the clinic-risk bar.

**`Chart`** (vendored `chart.jsx` on recharts 3, lazy-loaded per route). Series `--chart-1..3`; §4.2 chart rules.

**`CodeBlock`.** `bg-subtle rounded-lg border`, `.mono` 12 px, a copy button (ghost icon, `aria-label="코드 복사"`), optional tabs (curl / Python / Node).

**`Disclosure`.** Vendored Collapsible with a `button[aria-expanded]` header row (chevron, 150 ms).

### 4.6 Inputs

**`Input`** (vendored). 32 px (`touch:` 40), `border-input`, `rounded-md`, placeholder muted, `text-sm touch:text-lg`. `InputGroup` adds prefix/suffix (`kg`, `mg/dL`, `원`). Replaces raw inputs, `.pf-input`, `.pf-input-group`, `.pf-numfield`.

**`MoneyInput`.** Thousands separators and a `원` suffix (no `₩`); integer value.

**`Select`** (vendored Radix). Replaces native `<select>` for sort, 분류, 지역, 보험사, 종 and frequency, and `.pf-select`.

**`Combobox`** (Popover + Command; never the Base UI combobox). Replaces `DrugSearch`, `BreedCombobox`, `.pf-combo`, `.pf-listbox`.

**`MultiCombobox` + `Tag`** (WP5). Replaces `.pf-token` problem tokens and allergy pickers.

**`Checkbox`, `RadioGroup`, `Switch`, `Label`, `Textarea`** (vendored). Replace `.pf-check`, `.pf-proto__radio`, the consent checkbox.

**`Field`.** Label above the control, help `text-xs` muted, error `text-xs` `--sev-critical` with an icon, linked via `aria-describedby`. Every input has a visible `<Label>`; placeholder-only inputs are banned (audit: 25 of 34 clinic inputs were unlabelled). In table-like grids the column header is the visible label and each input carries `aria-label` = column + row number.

**`DatePicker`.** Not in this phase: `<Input type="date">` with a Korean echo underneath (`2026년 10월 3일`).

**`Dropzone`** (WP7). The only dashed border in the product. Replaces the hidden "영수증 사진으로 채우기" input.

### 4.7 Feedback and overlays

**`Dialog` / `AlertDialog`.** 12 px radius, `shadow-modal`, `bg-popover`, max width 520 (`sm`) / 720 (`lg`) px. Focus trapped; first focusable element is the **safe** action. No coloured strip.

**`Sheet`.** Filters and the sidebar on mobile. (The claim detail at `wide:` is WP6's non-modal ClaimDetailPanel, not a Sheet; §5.3.)

**`Drawer`** (vaul). Mobile bottom sheets for clinic results.

**`Popover`, `Tooltip`, `HoverCard`.** Tooltip §4.2; holds definitions ("서류 요청이란…") instead of explanation paragraphs.

**`Toaster`** (Sonner). Bottom-right, 8 px radius, `shadow-pop`, hairline. Only to confirm an action ("메모를 저장했습니다"). Never for errors that need action.

**`Alert`.** Variants `neutral`, `warning`, `critical`; icon + title + one line, tinted with the 28 % border (§3.1), no strip. At most one per screen.

**`EmptyState`.** A 20 px icon, one line that says what is missing, one action.

**`EnvironmentMarker`.** Outline Badge in the top bar reading `합성 데이터` (console, clinic) or `교육용 프로토타입` (`/dur`, EMR demo), with a tooltip holding the full disclaimer. It is the only disclaimer on a screen (plus one footer line and print pages where showcase §0.7 requires them).

### 4.8 Brand

**`Logo`** (`src/ui/patterns/Logo.jsx`). Lowercase `nuvovet` in Pretendard 700 at −0.03em, ink; optional muted product suffix in sentence case (`nuvovet 청구 심사`, `nuvovet DUR 데모`); 16 / 20 px. No icon tile. `src/components/NuvovetLogo.jsx` is imported only by `src/pages/Start.jsx`; WP8 deletes both. The teal "CLAIMS" caps, the inline 21 px span and the portfolio pill-in-square icon are deleted. Favicon: keep `public/favicon.png`.

Amended by §4.9: product surfaces (console sidebar, `/dur` header, clinic header, EMR demo bar, landing) show the outlined `BrandLockup`; `Logo` remains for screens without a product (the kit). The favicon is now the monogram (`public/favicon-master.svg`, PNG fallback `public/favicon.png`).

### 4.9 Brand layer (amendment, 2026-10-04)

The brand layer is `src/brand/**` (tokens `brand.css`, marks `Brand.jsx`, display face `displayFont.js`) and the surfaces built on it: the landing `/`, the lockups in product headers, the EMR demo bar, guide strip and DUR island. It is **ink on white paper**; this section overrides §1.2, §2.4, §3.3 and §4.8 for those surfaces only. Console screens keep every other rule.

- **Display face (exception to §1.2 T1 and §2.4).** MaruBuri (Naver, OFL-1.1; Regular 400 and SemiBold 600, vendored in `src/brand/fonts/` with `OFL.txt`), registered with `FontFace` as `"nuvovet Display"` by `src/brand/displayFont.js`, which the landing entry imports once. `scripts/vite-plugin-display-font.js` subsets both files to the characters of `src/i18n`, `src/pages/landing` and `src/brand` plus ASCII and `† ‡ § · – ‘ ’ “ ”` (about 52–58 kB each; a hashed asset in builds, a `data:` URL in dev and Vitest). It sets **static display copy only** (headlines, one key figure per section); runtime data such as pet names and amounts stay in Pretendard. Geist (`@fontsource-variable/geist`) is removed; no Latin-only face may precede the Hangul face in a stack. Not loaded by the standalone or widget builds.
- **Type scale (brand surfaces; exception to §3.3).** `.nvb-d1` 400 64/76 −0.02em (52/64 ≤ 1023 px, 36/46 ≤ 639 px), `.nvb-d2` 400 40/52 −0.015em (34/46, 28/38), `.nvb-d3` 600 28/38 −0.01em (22/32) in the display face; `.nvb-lead` 19/32 (17/28 on phones), `.nvb-body` 16/26, `.nvb-ui` 500 14/20, `.nvb-label` 500 13/20 muted, `.nvb-caption` 500 12/16 muted in Pretendard. The negative display tracking applies to Hangul as well (MaruBuri at −0.02em measured clean at 64 px); Pretendard stays at 0. Nothing below 12 px.
- **Colour (exception to §1.2 C3).** Ink `#16191E`, ink-2 `#4D5560`, muted `#646C77`, paper `#FFFFFF`, paper-2 `#F6F7F9`, rules `rgb(16 24 40 / .10)` and `/ .18`. Each product has one ink, used **only** on its product name in a lockup, its favicon tile and the 1.5 px active-tab hairline: DUR `#28553B` (8.56:1 on paper), Claims `#1D3C6E` (10.92:1); on dark surfaces `#8DCBA4` / `#9DBCEE` with a `#ECEEF1` wordmark. Severity colour appears only where it carries clinical meaning, inside product UI. No gradients, glows, coloured dots, chips or pills around product names.
- **Lockup (replaces the §4.8 product suffix on product surfaces).** `BrandLockup({ product?: 'dur' | 'claims', height = 20, tone = 'ink' | 'light' | 'mono', suffix? })` renders `<span class="nvb-lockup" data-product data-tone data-brand-surface>` with an outlined SVG (`role="img"`, `aria-label="nuvovet DUR"`): lowercase `nuvovet` from MaruBuri SemiBold, a fixed gap, then the product name from MaruBuri Regular in the product ink. Paths, not text, so it never waits for a font. `tone="ink"` follows the console theme (ink on light, `#ECEEF1` + light product ink on dark); `light` is for dark surfaces; `mono` is one colour (`currentColor`). Heights: 16 in the console sidebar and demo bar, 18 in product headers and landing tabs, 20–22 in the landing nav; below 16 use the wordmark alone. At these sizes the outlines are fitted to the pixel grid (whole-pixel x-height, serif feet on a pixel edge). A `suffix` is Pretendard 500 13 px muted, 10 px after the mark, no divider. Never a tile, branch glyph, pill or dot beside the wordmark.
- **Monogram.** `BrandMark` is the MaruBuri `n` on a 32-unit tile (ink, or the product ink): favicons (`public/favicon-{master,dur,claims}.svg`; product routes swap the icon with `useBrandFavicon`), app icons and the collapsed sidebar only.
- **Budgets and checks.** Elements under `[data-brand-surface]` are exempt from the console colour, radius, shadow and type-size budgets (§9.7, `scripts/qa/pagecheck.cjs`); `src/brand/**` and `src/pages/landing/**` are exempt from `lint-design.cjs`. The font check (§9.2, `scripts/qa/shots.cjs`) accepts `nuvovet Display` (reported by CDP as MaruBuri Regular / SemiBold) on brand routes besides Pretendard Variable; a display glyph missing from the subset falls back to a system face and fails that check. No icon set (lucide or other) on the landing, the brand layer, the island or the guide strip and demo bar controls: words, typographic marks and the three CSS glyphs `.nvb-menu`, `.nvb-close`, `.nvb-grabber`.

---

## 5. Surface-by-surface redesign

All wireframes are 1440 px unless stated. `[■]` means real product UI rendered from live components. Each surface has a **Reference** paragraph: the concrete look the reviewer agent compares screenshots against (§9.8). A screenshot that passes every script but does not match its reference fails.

### 5.1 Landing `/`

**Audience:** pet-insurance claims, actuarial and IT buyers. **Goal:** understand the product in one screen, then reach the console in one click.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ nuvovet        제품  연동  보안      DUR 데모 (muted)                       [콘솔 데모 열기] │ 56px nav, sticky, hairline after scroll
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  동물병원 영수증을 심사할 수 있는                                                            │ text-5xl, left-aligned, 2 lines max
│  청구 데이터로 바꿉니다.                                                                    │
│  진료 항목을 표준 코드로 정형화하고, 규칙 ID와 근거가 붙은 소견으로 심사합니다.                  │ text-lg, text-2, 1 sentence
│  [콘솔 데모 열기]   API 연동 보기 (text link)                                                │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [■] ClaimDetailPreview SYN-2026-00220, inert, full container width, 560px tall crop  │ │ overflow:hidden, hairline bottom, no fade mask
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
│  합성 데이터 312건 기준 (text-xs muted)                                                     │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 심사 예시 (h2 text-3xl)                                                                    │
│ ┌ ClaimLedger (one bordered surface, 3 columns split by hairlines) ──────────────────────┐ │
│ │ 청구 원문               │ 표준화                        │ 심사                           │ │
│ │ 장절개술(이물) 4,727,600 │ SUR-003 위장관 이물 제거술      │ [심각] pricing.regional_outlier │ │
│ │ …(3 lines as typed)    │ …(same lines, standard codes) │ …findings, rule ID, 금액 영향   │ │
│ ├────────────────────────┴───────────────────────────────┴────────────────────────────┤ │
│ │ 청구 7,383,700원        지급 예정 5,000,000원            소견 8건      (.ledger-total)   │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 연동 (h2): [■ CodeBlock POST /api/claims/adjudicate request/response]  │ 3-line description │ same orientation
│ 보안·데이터 (h2): two columns of plain text (only statements true of the code today)         │ same orientation
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ footer: Logo · links 콘솔 데모 / DUR 사례 연구 · © 2026 nuvovet (no "#" links)               │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Headline** (founder-editable): `동물병원 영수증을 심사할 수 있는 청구 데이터로 바꿉니다.` A full sentence with a verb, no em dash, at most 2 lines at `text-5xl`. Store it in `src/i18n/ko.js` under one key so the founder can change it without touching layout.

**CTA and contact.** The primary button is **콘솔 데모 열기** → `/insurance`; the text link is **API 연동 보기** → `/insurance/api`. `src/i18n/contact.js` exports `CONTACT_EMAIL = ''`. Only when it is non-empty does the page add (a) a 파일럿 문의 nav item and (b) a closing band (`py-24`, `bg-background`, one sentence + `mailto:` button); then 파일럿 문의 becomes primary and 콘솔 데모 열기 secondary. With the empty constant there is no band, no nav item and no mailto anywhere. WP8 MUST NOT write any address.

**Numbers.** Only these, all read at runtime:
- from `src/pages/insurance/preview/heroClaim.json` (WP6, < 8 kB, generated from the snapshot, Vitest-checked against it): the ledger lines, findings and totals of SYN-2026-00220 (청구 7,383,700원, 지급 예정 5,000,000원, 소견 8건 at the time of writing);
- `합성 데이터 312건 기준` from `summary.claims` — imported through `heroClaim.json` (`claimsCount`), so `/` never loads the 2.4 MB snapshot.
- **No stat strip.** Not 848 aliases, not 426/426, not a rule-family count. If a rule count is ever needed it is computed from `summary.rule_hits` prefixes: 12 rules in 5 families (보장 3 · 임상 3 · 가격 1 · 무결성 4 · 데이터 1).
- **Never** recall %, false-alarm %, or claimed savings on the landing page.

**Ledger lines.** The three lines are the three with the largest `amount_at_risk` in their findings (ties: line order), shown as typed (`description`), then `code` + `code_name`, then each finding as an `EvidenceTrail` row (badge, title, `.id` rule, amount). Every number comes from `heroClaim.json`.

**No skeleton at first paint.** The hero imports `heroClaim.json` statically; nothing on `/` shimmers.

**Removed:** `ShaderHero.jsx`, `ShaderCanvas`, `FeatureSection` and all `features/*Illustration.jsx`, `CTASection.jsx`, the 180 vh sticky hero, the dark CTA slab, the old DUR footer copy, the `href="#"` Terms/Privacy links, the landing stat row, the landing i18n toggle.

**Copy:** Korean only on `/`; no eyebrow labels; section titles plain `text-3xl`; marketing register 합니다체 (§6.2).

**Mobile (390):** headline (`text-3xl`), lead, button row, then the preview rendered at its own mobile layout (not scaled down; no text under 12 px) cropped to 480 px; the ledger becomes three stacked groups with the total row last; sections single-column.

**Reference.** A white page. One left-aligned two-line black headline (48 px, weight 700) over a full-width crop of a real claim screen whose top edge starts ≤ 520 px from the top of the viewport at 1440×900; one ink button and one blue text link between them. Below: one bordered three-column ledger with ~36 px rows, tabular numbers right-aligned and a double rule above the totals. Then two text sections, same orientation. No coloured blocks other than severity badges inside the ledger, no cards in a row, no icons in squares, no numbers in giant type, no grey canvas.

### 5.2 `/start`

Delete `src/pages/Start.jsx` (and `src/components/NuvovetLogo.jsx`). `/start` and `/academy` redirect to `/`. The landing nav reaches `/insurance` and `/dur`; the console's sidebar footer links to the clinic tool.

### 5.3 Insurer console `/insurance/*`

**Routes** (nested `<Routes>` in `Insurance.jsx`; all deep-linkable):

| URL | Screen |
|---|---|
| `/insurance` | 개요 |
| `/insurance/claims?view=open\|pend\|review\|deny\|auto\|all&q=&sort=&sel=` | 청구 심사 queue (`sel` = claim in the side panel at `wide:`) |
| `/insurance/claims/:claimId` | claim detail (full page) |
| `/insurance/clinics?sort=` and `/insurance/clinics/:clinicId` | 병원 리스크 |
| `/insurance/fees?q=` | 진료비 벤치마크 |
| `/insurance/evaluation` | 엔진 성능 |
| `/insurance/api` | API 연동 |

**App shell** (WP6 AppShell):
```
┌────────────┬─────────────────────────────────────────────────────────────────────────────┐
│ nuvovet    │ 청구 심사 / SYN-2026-00220        [⌘K 검색…]      [합성 데이터] [◐] [김 심사역 (가상) ▾] │ 48px top bar
│ 청구 심사    ├─────────────────────────────────────────────────────────────────────────────┤
│ 개요        │  page content on --background (24px padding, full width)                    │
│ 청구 심사 135│                                                                             │
│ 병원 리스크   │                                                                             │
│ 진료비 벤치마크│                                                                             │
│ 엔진 성능     │                                                                             │
│ 연동 (group) │                                                                             │
│ API 연동     │                                                                             │
│ ─────────  │                                                                             │
│ 병원용 사전 점검 │                                                                             │
│ [«] 접기     │                                                                             │
└────────────┴─────────────────────────────────────────────────────────────────────────────┘
 240px on --surface-subtle (56px collapsed)
```
- **Top bar:** breadcrumb; ⌘K trigger (input-like button with a Kbd); EnvironmentMarker 합성 데이터; ThemeToggle; a static user label "김 심사역 (가상)" whose menu holds theme and language. The tagline is removed.
- **Sidebar count:** 청구 심사 shows **135** (처리 대상 = 서류 요청 33 + 심사 필요 55 + 거절 권고 47, computed from `summary.decisions`) as right-aligned `text-xs` muted digits, no bubble.
- **Mobile (< 1024):** sidebar in a `Sheet` from a menu button; tables become stacked list rows; the claim detail is its own route.

**개요 (overview): queue first.**
```
[PageHeader: 개요 · 기간 2026.04.03 ~ 2026.09.30 (from data) · 채널 Select]
[MetricStrip: 청구 312건 | 청구액 1.57억 원 | 검토 대상 1,841만 원 | 자동 승인 56.7%]
[h2 처리 대상 ── compact DataTable, top 10 open claims (same columns as the queue) ── 전체 135건 보기 (link)]
[h2 월별 검토 대상 금액 ── one full-width bar chart, 200px, Apr–Sep by visit_date month]
[h2 주요 소견 규칙 (BarList, counts "건") ──1px rule── h2 서류 요청 사유 (BarList)]   two plain sections, no cards
```
- 검토 대상 금액 = `summary.amount_flagged` (18,409,436 → `1,841만 원`). The monthly bars sum `amount_at_risk` over findings with the backend's `RISK_CATEGORIES` filter (`backend/routers/claims.py`); a Vitest test asserts the six bars sum to `summary.amount_flagged`.
- No funnel card (the queue's saved views do that job), no period-over-period deltas (no prior period exists), no sparklines.
- 주요 소견 규칙 shows Korean rule labels with absolute counts (`coverage.line_ineligible` 128 first).

**Reference (overview).** White canvas, no cards. A single bordered strip of four numbers (24 px tabular) separated by vertical hairlines, then a dense table of ten 32 px rows that looks exactly like the queue, then one quiet grey-and-blue bar chart, then two plain bar lists side by side under 16 px headings. The first thing the eye lands on after the numbers is a claim row, not a chart.

**청구 심사 queue:**
```
[PageHeader: 청구 심사]
[SavedViewTabs: 처리 대상 135 | 서류 요청 33 | 심사 필요 55 | 거절 권고 47 | 자동 승인 177 | 전체 312]   (plain-digit counts)
[Toolbar: 검색(청구 ID·병원·진단) | 보험사 Select | 채널 Select | 밀도 toggle]
[DataTable compact 32px: ⚠ | 청구 ID (.id) | 접수일 | 병원 | 종 | 진단명 | 청구액 (원) | 판정 | 주요 사유 | 소견 | SIU]
[135건 중 1–50  ‹ 1 2 3 ›]
```
- Each row's first cell is a link to `/insurance/claims/:id`; `j`/`k` move the selection; `Enter` opens.
- **At `wide:` (≥ 1440):** selecting a row opens WP6's **non-modal** ClaimDetailPanel: 720 px on the right, `border-l`, no backdrop, `role="region"`, `aria-label="청구 상세"`. The queue stays usable: j/k moves the selection and updates the panel and `?sel=`; Esc closes the panel and returns focus to the row. **Below `wide:`** the detail is its own page.
- Flagged rows use the DataTable flagged state (§4.5), never a fill.

**Reference (queue).** A full-width table of 32 px rows directly on the white page, a 1 px rule under each row and a slightly stronger rule under the header; IDs in medium-weight tabular Pretendard; amounts right-aligned; one small amber icon in the leading column of flagged rows only; decision words in coloured text on a pale tint, no icons, no pills. At 1440 a 720 px panel slides in on the right with no dimming.

**Claim detail:**
```
[Breadcrumb]  SYN-2026-00220  [DecisionBadge 심사 필요]                       청구 7,383,700원 · 지급 예정 5,000,000원
[DescriptionList row 1: 병원 샘플동물병원 32 | 지역 서울 | 종 개 | 진단 위장관 이물]
[DescriptionList row 2: 진료일 2026-09-17 | 접수 경로 보험사 앱]
[Tabs: 소견 8 | 진료 항목 | 지급 계산 | 이력]
 소견: EvidenceTrail list (severity · title · rule .id · 금액 영향 · CitationChip/benchmark · 근거 보기 ▸)
 진료 항목: DataTable (청구 원문 | 표준 코드 .id + 표준명 | 수량 | 금액 (원) | 지역 분위 RangeGlyph | 지급 판정), DataTable flagged state
 지급 계산: DescriptionList, total under .ledger-total
 이력: ActivityLog (local)
[StickyActionBar: [승인] [서류 요청 ▾] [SIU 이관] [메모]   판정 변경 시 사유 Select 필수]
```
- The two-part "청구 · 지급 예정" header line is allowed (two labelled amounts).
- Actions are client-side only, stored in `localStorage['nv-claim-actions']` in try/catch with an ActivityLog entry; tooltip "데모: 이 브라우저에만 저장됩니다". Backend unchanged.
- Answer-key labels (`claim.labels`) are not shown.
- Enums map to Korean: channels `owner_upload` 보호자 업로드, `insurer_app` 보험사 앱, `fax_email` 팩스·이메일, `emr_autoclaim` EMR 자동 청구, `live_counter` 원내 접수; drug classes by Korean name.
- Doses rounded to 3 significant figures (fixes `13.243`); English diagnoses show Korean first with the English as a muted second line only when the source has both.

**Reference (detail).** Header: one line of ID + decision + two right-aligned amounts, then two quiet rows of small grey labels over 13 px values. Below the tabs a list of findings separated by hairlines, each with a small badge, a one-line title, a grey rule ID line and a right-aligned amount. A plain 56 px action bar at the bottom. No cards around the finding list, no coloured strips.

**병원 리스크.** Table: `clinic_id` (.id), 이름, 지역, 청구 수, 청구액 (원), 검토 대상, SIU, 위험 금액 (원), 검토 대상 비중 as a ProgressBar 0–100 %. When a clinic has fewer than 10 claims (22 of 36 clinics, 4–13 claims each) its bar fill is `--border-strong` and its ratio `--muted-foreground`; one footnote: `청구 10건 미만 병원은 흐리게 표시합니다.` No per-row badge. Sortable headers; rows link to `/insurance/clinics/:clinicId`; a ghost button "내보내기 (CSV)" builds the file in the browser (Blob URL, no network). Clinic detail: MetricStrip, that clinic's claims as a DataTable, the region peer median from `summary.clinics`.

**진료비 벤치마크.** One price-check toolbar (`MoneyInput` + procedure Combobox). Table of benchmarked items only, with a P10–P50–P90 RangeGlyph and Korean units (`/visit` → 회, `/day` → 일, `/test` → 건). A Disclosure "벤치마크 없는 항목 61개" collapsed at the bottom.

**엔진 성능.** One `Alert` at the top: "합성 데이터로 생성한 정답 라벨 기준입니다. 실제 청구 성능을 뜻하지 않습니다." ConfusionMatrix (decisions × labels), then per-anomaly recall with **n** next to each bar, then the false-alarm rate with n. Labels only here. Not shown: the 100 % bar wall and "13/14 at 100%" without n.

**API 연동.** Stripe-docs two-column layout: left endpoint, method `Badge id`, description and parameters DataTable; right CodeBlock with curl / Python / Node tabs. Real request/response bodies from the snapshot shapes; base URL `https://api.example.com`; "설계 원칙" as a 5-item list, one line each. `₩` may appear only inside English code samples.

**Copy:** Korean-first, strings in `src/pages/insurance/strings.ko.js`; English not required in the console this phase.

### 5.4 Clinic pre-check `/clinic/claim`

**Audience:** clinic front-desk staff. **Goal:** "보험 청구 전에 서류·항목 누락을 확인합니다."

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ nuvovet 병원용 청구 사전 점검                      [합성 데이터] [◐]                      │ 48px header
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Stepper: ① 영수증  ② 항목 확인  ③ 결과   (aria-current step; real steps)               │
│ ① [Dropzone: 영수증 사진을 끌어오거나 선택하세요 (JPG·PNG)]   [직접 입력]  [예시 불러오기 ▾] │
│ ② section "환자·보험" (Field grid 2-col): 보험사 | 동물 이름 | 종 | 품종 | 진료일 | 진단명    │
│    section "진료 항목" EditableGrid 44px: 항목명 | 수량 | 단가 (원) | 금액 (원) | [삭제]       │
│    section "처방" EditableGrid: 약품명 (Combobox) | 용량 mg/kg | 1일 횟수 | 일수 | 단가 | 수량  │
│    [Checkbox] 보호자 동의를 받았습니다  (동의 내용 보기 → Dialog)                              │
│    [사전 점검 실행] (primary)                                                            │
│ ③ Result (single column, max 960): readiness (청구 준비 완료 / 보완 필요 N건), 예상 지급액   │
│    Checklist: 필요 서류 · 누락 항목 · 소견 (FindingSeverity rows) — or EmptyState          │
│    [보완 후 다시 점검]  [결과 인쇄]                                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
```
Form sections are `Card`s (grouped secondary content); the grids inside are not boxed again.

**Removed:** the three value-prop cards; the "교육용 DUR 프로토타입" button; the long consent sentence (moved to the dialog); the `.nuvo-insurance { height: 100vh }` bug; leaked enums (`antiemetic`, `gi_protectant` become Korean class names).

**Formatting:** `MoneyInput` and `Money` (`10,000원`); dates with the Korean echo; every input labelled (§4.6).

**Mobile:** grids become stacked groups, one per line item, each with labelled fields; the result summary is sticky at the top.

**API:** `precheckClaim` / `extractReceipt` with unchanged payloads.

**Reference.** A white page with a thin three-step stepper, then two or three hairline-bordered form sections with labelled 40/44 px fields in two columns, and one ink primary button. The result is a single column with one status line and a checklist; no hero, no illustrations, no coloured panels.

### 5.5 Portfolio showcase `/dur` (and standalone)

**Header (56 px):** `Logo` "nuvovet DUR 데모"; nav 사례 연구 · 사례 · **EMR 데모** · 작동 방식; right: EnvironmentMarker "교육용 프로토타입", LangToggle, ThemeToggle. The subtitle line under the logo is removed; the disclaimer lives in the marker tooltip, one footer line and print pages (showcase §0.7).

**`#/` 사례 연구:**
```
Breadcrumb: 사례 연구
H1 (text-3xl): 동물 처방 검토 엔진                               (no em dash in any /dur heading)
lead (text-lg, 2 lines): what it is, my role, status (prototype; company pivoted to claims)
[EMR 데모 열기 (primary)]  사례 5개 보기 (link)
[■] Live DUR panel crop: the EMR widget for V1 초코 (same component as #/emr, inert). No caption.
2-col: 문제 (3 short paragraphs) | 만든 것 (5 bullets)
설계 원칙 (규칙 수 · 근거 출처 · 결정적 엔진), numbers read from RULE_LAYERS / SOURCES
Footer
```
Removed: icon-tile feature cards; "Live — computed in your browser now"; "Honest status"; "Not a screenshot"; "실제 엔진 출력"; repeated disclaimers.

**`#/cases`:** 2-column grid of compact `Card`s (species glyph, name + signalment on one line, the clinical question on one line, med `Badge`s, a SeverityBadge of the expected verdict); each links to the workbench, with a secondary "EMR에서 보기" link to `#/emr/<visitId>` (popup spec §7). "Blank case" becomes `Button variant=outline` "빈 사례로 시작". "Engine should catch" moves into the workbench brief.

**`#/case/:id` workbench:**
- Columns: Patient 300 | Findings flex.
- The dose-check column merges into the Rx editor rows (per-dose / per-day, plan, RangeBar, StatusText once). Dose cards from US labels show "미국 라벨 기준" (popup spec §5, D13).
- Verdict: one tinted surface (with the 28 % border) for the summary only, non-zero counts only; "투여량 확인 N건" counts rows whose status is above/below/unit_mismatch or that carry a rounding note.
- Finding cards: EvidenceTrail rows with a SeverityBadge in the title row; contraindicated/major expanded, others one line.
- Organ matrix behind a Disclosure "장기별 위험 보기".
- Brief: a collapsed Disclosure "이 사례의 질문", no caps.
- Off-label protocols show an outline Badge `허가 외 사용` with a solid border (never dashed).

**`#/case/:id/report`, `#/case/:id/handout`:** keep the document design; restyle to tokens and fonts; `handoutModel.dedupe()` drops a sign whose normalised text is contained in another sign for the same drug ("구토" ⊂ "구토 또는 식욕 부진"), and emergency signs are not repeated under "Watch for" (test added).

**`#/how-it-works`:** keep the pipeline SVG, rule table and live golden table; ≤ 120 words of prose per section; add "EMR 연동 방식" linking to `#/emr` (popup spec §7).

**`#/emr`, `#/emr/:visitId`:** see the popup spec; the page chrome is the 40 px demo bar.

**Korean copy pass** (`pages.ko.js`, `ui.ko.js`): native Korean per §6.2; particles via `withParticle` (`나비로 돌아가기`); remove "정직한"; remove the unverified sentence "국내 동물병원 EMR에는 처방 안전 검토 기능이 없습니다" from `pages.ko.js` and `pages.en.js`.

**Styling migration.** `styles/portfolio.css` (2,160 lines) and `pages.css` are replaced by Tailwind utilities + `src/ui`. Keep only print CSS (`@page A4`, report/handout) in `styles/print.css`, and the organ-matrix glyph CSS. The `pf-*` token block is deleted.

**Default language.** English stays the default on `/dur` pages other than `#/emr` (showcase §0.6). Changing it to Korean is a founder decision that is still open; until then nothing changes. The EMR demo defaults to Korean.

**Reference.** A white document-like page: a small breadcrumb, a 32 px heading, two lines of lead text, one ink button and a link, then a live cropped DUR panel with real badges, then two columns of plain text. The workbench is two columns of dense rows with hairline separators; severity only in badges.

### 5.6 EMR demo (`/dur#/emr`)

Specified in `docs/portfolio/EMR_DUR_POPUP_SPEC.md`. In design-system terms:
- **The fictional EMR host does NOT use NuvoVet tokens or `src/ui`.** Its own generic desktop look (grey frames `#E9ECEF`, 12–13 px `"Malgun Gothic", "Apple SD Gothic Neo", sans-serif`, 2 px corners, blue-grey tab strips) makes the overlay read as a separate product. Its hex values are exempt from the colour lint (§9.4).
- **The overlay uses NuvoVet tokens** (light/dark) through `tokens.css?inline` inside its shadow roots.
- **The gate dialog has no colour strip.**
- **One DUR disclaimer per screen:** the demo bar's `교육용 프로토타입` marker. The widget's own footer marker is off in the demo (`marker: false`) and on by default in the IIFE bundle (third-party pages have no demo bar). `source.label` is just `NuvoVet DUR`. The host's "가상 EMR" watermark stays: it labels the fictional host, not the DUR, and is the only marker that prints with the chart.
- **No em dash in widget or host strings;** use ": " or a full stop.

**Reference.** A deliberately plain grey desktop-EMR (small system font, square corners, 26 px grid rows) with a crisp white NuvoVet panel on the right: 40 px header, one verdict row with a solid red 금기 badge, hairline-separated cards, a muted coverage strip. The gate is a white 560 px dialog with 12 px corners over a dark scrim; no coloured band.

---

## 6. Copy rules

### 6.1 General
- Korean-first on `/`, `/insurance`, `/clinic/claim` and `#/emr`. English is the default on other `/dur` pages, with complete Korean.
- **Buttons** are verb + object or a noun phrase of the action: "청구 승인", "서류 요청", "보호자 안내문 인쇄", "처방으로 돌아가기". Never "확인" alone when a specific verb exists; never "Get started".
- **Numbers:** numerals for counts; a space before units (`10 mg`, `24.0 kg`); `원` follows the number with no space (`1,234,567원`); compact `만 원`/`억 원` keep the space before 원 (`1,841만 원`).
- **Ranges** use `~`: `2026.04.03 ~ 2026.09.30` in headers, `4월 3일 ~ 9월 30일` in prose. Counts of a range: `135건 중 1–50`.
- **Error messages** say how to fix the problem: "API에 연결할 수 없습니다. 백엔드(:8000)가 실행 중인지 확인하세요."
- **Ellipsis:** `…`, never `...`.
- **Em dashes:** none in headings, titles or widget strings; at most one per screen elsewhere.
- **Forbidden words:** "안전" in DUR results and DUR product names; "정직"/"honest"; "AI" as an adjective; W1.

### 6.2 Korean register (by kind of string, on every surface)
- **Headings, buttons, tabs, menu items:** a noun phrase (`청구 승인`, `처방 검토`).
- **Descriptions, status lines, empty states, toasts:** 합니다체 (`메모를 저장했습니다`, `검토 대상이 없습니다`).
- **Instructions to the user:** ~하세요 (`영수증 사진을 선택하세요`).
- **Clinical recommendations from the engine:** 하십시오체, exactly as authored in the engine.

### 6.3 Particles

`src/ui/lib/particle.js`: `withParticle(word, pair)` with `pair ∈ '은/는' | '이/가' | '을/를' | '과/와' | '으로/로'`. Uses the batchim of the last Hangul syllable; for `으로/로` a final ㄹ takes 로. Non-Hangul endings are decided by the reading of the last digit or letter where known, else the `(으)로` form.

### 6.4 Formatting (`src/ui/lib/format.js`)
- **`fmtWon(n)`** → `1,234,567원`. In a column whose header says (원), cells use `fmtNum` with no unit.
- **`fmtWonCompact(n)`** (MetricStrip and KPIs only): n ≥ 1억 → `1.57억 원` (2 decimals, trailing zeros dropped); 1,000만 ≤ n < 1억 → `1,841만 원` (whole 만, half up); 1만 ≤ n < 1,000만 → `738.4만 원` (1 decimal); below 1만 → `fmtWon`.
- **`₩`** appears only inside English code samples on the API page.
- **`fmtDate('2026-09-17')`** → `2026-09-17` in tables, `2026.09.17` in headers and ranges, `2026년 9월 17일` in prose.
- **`fmtPct(0.5673)`** → `56.7%`.
- **`fmtDose(x)`** → 3 significant figures.
- Tests in `src/ui/lib/__tests__/format.test.js` cover each boundary (9,999 / 10,000 / 9,999,999 / 10,000,000 / 99,999,999 / 100,000,000 / 156,935,799 → `1.57억 원` / 18,409,436 → `1,841만 원`).

### 6.5 Page titles

`document.title` per route via `useTitle` (`src/ui/patterns/useTitle.js`). Separator ` · `, never an em dash.

| Route | Title |
|---|---|
| `/` | `nuvovet · 펫보험 청구 데이터` |
| `/insurance` | `개요 · nuvovet 청구 심사` |
| `/insurance/claims` | `청구 심사 · nuvovet` |
| `/insurance/claims/:id` | `SYN-… · 청구 심사 · nuvovet` |
| `/clinic/claim` | `청구 사전 점검 · nuvovet` |
| `/dur` | `NuvoVet DUR · 사례 연구` (by sub-route) |
| `#/emr` | `EMR 데모 · NuvoVet DUR` |

---

## 7. Constraints carried over (non-negotiable)

1. **Clean-room portfolio.** No text, number or structure from Plumb's or from `backend/data/converted/**` in `src/portfolio/**` (showcase §0.1). EMR fixtures are fictional.
2. **Standalone build keeps working.** `npm run build:portfolio` emits a single `dist-portfolio/index.html` that opens from `file://`, carries the CSP plus `font-src data:`, makes zero network requests, and imports shared UI from `src/ui` only.
3. **Backend API contracts are unchanged:** `/api/claims/demo`, `/api/claims/demo/:id`, `/api/claims/evaluation`, `/api/claims/insurers`, `/api/claims/adjudicate`, `/api/claims/precheck`, `/api/claims/extract`. No backend file is edited in this phase.
4. **Tests keep passing:** all Vitest suites (`cd frontend && npm test`, 249 at the time of writing) and all pytest suites (`cd backend && python3 -m pytest -q tests`). Tests change only where a spec changes behaviour explicitly: the popup spec §5 engine changes (D1/D2, D9–D15, with the exact test edits listed there) and the handout dedupe. Every such update is listed in the WP report.
5. **No fabricated numbers on marketing pages.** Every number is read at runtime from `heroClaim.json` / the snapshot (§5.1).
6. **`/dur` and the standalone build make no external network requests.** Fonts are same-origin (main app) or inlined `data:` (standalone/widget).
7. **No commits of build output:** `dist/`, `dist-portfolio/`, `dist-widget/` and `qa-shots/` stay in `.gitignore`.
8. **No personal data in repo files:** no model names, no personal email addresses, no real contact address (§5.1).

---

## 8. Build plan: work packages

### 8.0 Rules for every WP

- **Ownership.** A WP edits only the files it owns (§8.2). If it needs a change elsewhere it lists it under **REQUESTS** in its final report with the exact file and change; it does not make it. A WP may add new files under `frontend/src/ui/ext/<wp>/` (e.g. `ext/wp6/`) for components its own surface needs, and lists them in its report.
- **Shared UI is not frozen.** `src/ui/primitives` and `src/ui/patterns` are owned by WP0. Edits other WPs need are applied in the **UI-steward round** (§8.3 step 3) by the WP0 owner, who also promotes an `ext/` component to `patterns/` once a second WP needs it (updating imports in both WPs' files under the exemption below).
- **Exemptions.** (a) WP0's `@tailwindcss/upgrade` codemod and the `insurance.css` `@layer components` wrap (§2.3 steps 1–5) touch files across all WPs; they run before any other UI WP starts and WP0's report lists every touched file. (b) The UI-steward round may update import paths in any file when it promotes a component. (c) WP9 may make one-line fixes anywhere and lists each.
- **No state-changing git commands** (commit, stash, checkout, reset) by WP agents; other agents edit the same tree concurrently. Never run formatters repo-wide.
- **Dev servers** use the port assigned to the WP; an agent stops only its own server, by PID.
- **Every WP report** ends with: files built, decisions/deviations, verification (commands + results, screenshot paths it looked at), REQUESTS, known gaps.

### 8.1 Dependency graph

```
step 1   WP0 Foundation (codemod first, then tokens/primitives/patterns/golden) ─┐
         WP1 Engine + knowledge ──┐                                              │
         WP2 EMR adapter + SDK ───┤                                              │
step 2   WP4 creates EmrDemoPage stub (first action) ── then host on WP2's SDK ──┼─ WP3 DUR widget UI ─┐
         WP5 /dur · WP6 console (preview/* + heroClaim.json first) · WP7 clinic  │                     │
step 3   UI-steward round (WP0 owner): apply REQUESTS to src/ui, promote ext/ components              │
step 4   WP8 landing (needs WP6 preview + heroClaim.json) · WP4 wires the real widget (needs WP3) ─────┘
step 5   WP9 QA, reviewer sign-off (§9.8), removes three + framer-motion
```

- WP1 and WP2 have no UI and start immediately. WP2's scenario tests use the §8.1 binding outputs of the popup spec; until WP1 lands, cases that depend on engine changes are `it.fails` markers (popup spec §8.1).
- **WP4's first action in step 2** is `src/portfolio/pages/EmrDemoPage.jsx` as a stub (`export default function EmrDemoPage(){ return null }`), before WP5 registers the lazy route, so WP5's build never breaks.
- WP6 delivers `src/pages/insurance/preview/*` (`ClaimDetailPreview({ claimId })`, `LineItemTable({ lines, flaggedOnly })`, `FindingList({ findings })`) and `heroClaim.json` first; their props change only through a REQUEST to WP6.
- WP3 needs WP0 (tokens.css) and WP2 (SDK).

### 8.2 Work packages and owned files

**WP0: Foundation and UI steward** (first, blocking for UI WPs)
- **Owns:** `frontend/package.json`, `package-lock.json`, `components.json`, `jsconfig.json`; `vite.config.js`, `vite.portfolio.config.js`, `vite.widget.config.js` (skeleton; WP3 owns the marked plugin block); deletes `postcss.config.js`, `tailwind.config.js`; `index.html`, `portfolio.html`, `.gitignore`; `scripts/vendor-shadcn.mjs`, `scripts/restyle-shadcn.mjs`, `scripts/vite-plugin-subset-fonts.js`, `scripts/vite-plugin-font-subset-import.js`; `src/index.css`, `src/main.jsx`, `src/App.jsx`; `src/ui/**` except `src/ui/ext/**`.
- **Does, in order:** §2.3 codemod and migration (steps 1–8, before step 2 starts); §2.1 install (no removal of `three`/`framer-motion`); §2.4 fonts; §2.6 theme; §3 tokens and `pairs.json`; vendoring + `restyle-shadcn.mjs` (§4.1); the WP0 rows of §4.0; `lib/format.js`, `lib/particle.js` with tests; the three golden reference screens (§9.9); a dev-only kitchen-sink route `/__ui` (`import.meta.env.DEV`) rendering every primitive and pattern in light and dark, plus `/__ui/golden`.
- **App.jsx route table:** `/` Landing; `/insurance/*` Insurance; `/clinic/claim` ClinicClaim; `/dur` PortfolioApp; `/start`, `/academy` → `/`; `/demo`, `/system` → `/dur`; `*` → `/`. Every page `lazy()` with a Suspense fallback that is an empty `bg-background` block (no skeleton on `/`).
- **npm scripts:** `build:widget` (`vite build --config vite.widget.config.js`), `dev:widget`, `qa` (`node scripts/qa/run.cjs`, file owned by WP9).
- **Acceptance:** build, build:portfolio and test pass; `/__ui` renders with 0 console errors; no request to `fonts.googleapis.com`, `cdn.jsdelivr.net` or `unpkg.com`; `src/ui/__tests__/contrast.test.js` parses `tokens.css` + `pairs.json` and enforces §3.2 (ratios, ±3° hue, unlisted pairs); the §4.1 grep is empty; `src/ui/__tests__/theme-css.test.js` compiles `theme.css` with the `compile()` API of `@tailwindcss/node` (installed with `@tailwindcss/vite`; pattern in `/tmp/claude-0/uiresearch/spec-critique/twtest/run3.mjs`) and asserts `bg-blue-500`, `text-4xl`, `shadow-md`, `rounded-2xl`, `md:p-2` produce no CSS while `text-foreground`, `bg-sev-critical/10`, `rounded-full`, `wide:p-2`, `touch:h-10` do.
- **UI-steward round (step 3):** applies every REQUEST against `src/ui/**` from WP3–WP7 reports, promotes shared `ext/` components, re-runs `npm test && npm run build && npm run build:portfolio`, and reports what it applied or declined (with reason).

**WP1: Engine + knowledge** (parallel)
- **Owns:** `frontend/src/portfolio/engine/**` (including `__tests__`), `frontend/src/portfolio/knowledge/**`, `frontend/src/portfolio/cases/cases.js`. WP5 sends copy-only knowledge edits as REQUESTS.
- **Does:** popup spec §5 (D1, D2, D8–D16) and the test edits listed there.
- **Acceptance:** engine tests pass; the five golden cases are unchanged; the popup spec §8.1 binding outputs match when run through WP2's adapter.

**WP2: EMR adapter + SDK (logic)**
- **Owns:** `frontend/src/portfolio/emr/*.js`, `frontend/src/portfolio/emr/__tests__/**`.
- **Does:** popup spec §3.2–§3.3 (SDK and payloads, no UI), §4 (mapping, Appendix C), §6 (cards, coverage, suggestions, hash) and the logic tests of §8.

**WP3: DUR widget UI**
- **Owns:** `frontend/src/portfolio/emr/widget/**`; the plugin block of `vite.widget.config.js`; `frontend/widget-demo/**`.
- **Does:** popup spec §3 (overlay, cards, gate, log UI) and the widget build.

**WP4: Fictional EMR host + demo route**
- **Owns:** `frontend/src/portfolio/emr/host/**`, `frontend/src/portfolio/pages/EmrDemoPage.jsx` (stub first).
- **Does:** popup spec §2 and §7.

**WP5: Portfolio `/dur` redesign**
- **Owns:** `frontend/src/portfolio/PortfolioApp.jsx`, `router.js`, `standalone.jsx`; `components/**` (except `emr/`); `pages/**` (except `EmrDemoPage.jsx`); `styles/**`; `src/portfolio/i18n/**`; `frontend/src/ui/ext/wp5/**`.
- **Does:** §5.5; registers routes `emr` and `emr/:visitId` in `router.js` (`seg[0]==='emr'` → `'emr'`, `params.visitId = seg[1] || null`) after WP4's stub exists; adds the case-study and cases links (popup spec §7).

**WP6: Insurer console**
- **Owns:** `frontend/src/pages/Insurance.jsx`; `frontend/src/pages/insurance/**` (except `claimForm.jsx`), including new `preview/**`; `frontend/src/ui/ext/wp6/**`.
- **Does:** §5.3; deletes `insurance.css`, `ui.jsx`, `icons.jsx` once unused; removes Insurance.jsx's `framer-motion` import; keeps `claimsApi.js` request shapes byte-identical.

**WP7: Clinic pre-check**
- **Owns:** `frontend/src/pages/ClinicClaim.jsx`, `frontend/src/pages/insurance/claimForm.jsx`, `frontend/src/ui/ext/wp7/**`.
- **Does:** §5.4; keeps `claimForm.jsx`'s exports (`ClaimForm`, `PRESETS`, `emptyForm`, `fromDraft`, `toClaim`, `today`) and shapes stable (WP6 imports them).

**WP8: Landing**
- **Owns:** `frontend/src/pages/Landing.jsx`, `frontend/src/pages/landing/**`, `frontend/src/i18n/**` (including new `contact.js` with `export const CONTACT_EMAIL = ''`), `frontend/src/ui/ext/wp8/**`; deletes `frontend/src/pages/Start.jsx` and `frontend/src/components/NuvovetLogo.jsx` (Start.jsx is its only importer).
- **Does:** §5.1, §5.2.

**WP9: QA and acceptance** (last)
- **Owns:** `frontend/scripts/qa/**`. May remove `three` and `framer-motion` from `package.json`/lock once `grep -rnE "from ['\"](three|framer-motion)" frontend/src` is empty, then re-runs every build.
- **Does:** §9, including the reviewer-agent sign-off (§9.8).

### 8.3 Order
1. WP0 (codemod first) + WP1 + WP2 in parallel. No other UI WP starts until WP0's §2.3 step 8 passes.
2. WP4's stub, then WP3, WP4 (host), WP5, WP6, WP7 in parallel.
3. UI-steward round.
4. WP8 (after WP6's preview + heroClaim.json); WP4 finishes widget integration (after WP3).
5. WP9.

---

## 9. Acceptance criteria (all must pass before merge)

Scripted checks are necessary but **not sufficient**: §9.8 (reviewer agent) must also pass.

### 9.1 Commands
```bash
cd frontend && npm ci && npm test && npm run build && npm run build:portfolio && npm run build:widget
cd ../backend && python3 -m pytest -q tests
cd ../frontend && npm run qa      # WP9 script; exits non-zero on any failure below
```

### 9.2 Screenshots and per-screenshot checks

`scripts/qa/shots.cjs` uses the global Playwright: `require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')`.

**Matrix:** 1440×900, 1024×768 and 390×844 (390 also with `hasTouch: true`, which makes `pointer: coarse` true); light and dark (via `localStorage['nv-theme']`), plus one run with no stored theme and `colorScheme: 'dark'` (system dark) per route.

**Routes:** `/`; `/insurance`; `/insurance/claims`; `/insurance/claims?sel=SYN-2026-00220` (1440: side panel); `/insurance/claims/SYN-2026-00220`; `/insurance/clinics`; `/insurance/fees`; `/insurance/evaluation`; `/insurance/api`; `/clinic/claim` (empty and result states); `/dur#/`; `/dur#/cases`; `/dur#/case/choco`; `/dur#/case/nabi`; `/dur#/case/choco/report`; `/dur#/case/nabi/handout`; `/dur#/how-it-works`; `/dur#/emr/V1` (panel; gate after 처방 저장); `/dur#/emr/V5`; `dist-portfolio/index.html#/emr/V7` (file://); the `dist-widget` hostile host; `/__ui/golden`.

Output in `frontend/qa-shots/` (gitignored).

**Automated checks per screenshot:**
- **No horizontal page scroll:** `document.documentElement.scrollWidth <= innerWidth` (table wrappers may scroll internally).
- **Numbers and IDs on one line:** every `.num` / `.id` element's text Range has `getClientRects().length === 1`.
- **Korean wrapping:** for every text node containing Hangul, no line break falls between two Hangul syllables of the same space-separated word (Range rects per word; a word wider than its container is reported separately).
- **No clipped text:** no element with `scrollWidth > clientWidth + 1` and `overflow: hidden` that contains text, except `data-truncate` elements that also carry a `title`.
- **Minimum size:** no text under 12 px.
- **Fonts:** `[...document.fonts].some(f => f.family.replace(/"/g,'') === 'Pretendard Variable' && f.status === 'loaded')`, and CDP `CSS.getPlatformFontsForNode` on 5 sampled text nodes (one Hangul, one Latin, one digit-heavy) returns a family starting with `Pretendard`. Not checked in the EMR host frame (its own font).
- **First paint on `/`:** a screenshot taken at `domcontentloaded` + 100 ms contains no `[data-skeleton]` element.
- **Landing layout:** at 1440×900 the hero crop's top edge is ≤ 520 px; no element matches the stat-strip pattern (≥ 3 siblings each with a ≥ 32 px number and a ≤ 13 px caption).

### 9.3 Runtime
- **Zero console errors and warnings** on every route (`console`, `pageerror`).
- **No external requests:** for `/dur*`, the standalone file and the widget hostile host, anything not `localhost:<port>`, `file://` or `data:` fails; for the main app any host other than `localhost` fails (API calls go to `localhost:8000`).
- **Navigation is links:** on each route, every visible `button`/`[role=button]` (max 40 per route) is clicked in a fresh page; if the URL path changes and the element is not inside an `<a href>`, fail — except form-submit buttons, CommandMenu items and keyboard handlers listed in `scripts/qa/nav-allowlist.json`.
- **Bundle budgets** (gzip): main entry ≤ 180 kB; `/insurance` route chunks excluding recharts ≤ 164 kB; recharts lazy in its own chunk; `/` route ≤ 135 kB and never includes `claimsDemoSnapshot.json`; standalone `dist-portfolio/index.html` ≤ 480 kB; widget IIFE ≤ 250 kB. (Raised from 160 / 120 / 450 by the brand layer, §4.9: the outlined wordmark on the console sidebar, the rendered landing and the EMR demo's content; `scripts/qa/bundles.cjs` records each reason.)

### 9.4 Static checks (`scripts/qa/lint-design.cjs`)

Run over `src/**` excluding `src/portfolio/emr/host/**`, `src/ui/tokens.css`, `styles/print.css`. Fail on any of:
```
/\b(bg|text|border|ring|fill|stroke|outline|divide|decoration|from|via|to|placeholder|caret|accent|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(-\d{2,3})?(\/\d+)?\b/
/#[0-9a-fA-F]{3,8}\b/ and /\b(rgb|rgba|hsl|hsla|oklch|oklab)\(/          (also outside src/portfolio/emr/widget/widget.css)
/\b(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(7|9|11|14|20|28|32|36|40|44|48|52|56|60|64|72|80|96)\b/   (marketing files may use 16|24 only via §3.4)
/-\[\d+(\.\d+)?(px|rem)\]/                                        (allowlist for w-/h-/max-w-/min-w- per file in scripts/qa/arbitrary-allowlist.json)
/\b(md|2xl):/
/\b(drop-)?shadow(-(xs|sm|md|lg|xl|2xl|inner))?\b(?!-(pop|modal))/
/\brounded(-(2xl|3xl|xs))?\b(?![-\w])/ , /rounded-\[/              (bare `rounded` banned; sm/md/lg/xl/full allowed)
/\buppercase\b/, /text-transform:\s*uppercase/, /tracking-(wide|wider|widest|\[0?\.\d)/
/bg-clip-text/, /linear-gradient\(/, /radial-gradient\(/            (allowed only in primitives/skeleton.jsx)
/backdrop-blur/, /transition-all/, /transition:\s*all/
/text-\[\d/
/fonts\.googleapis|jsdelivr|unpkg|@fontsource|Geist|"Inter"|DM Sans|JetBrains/
/useNavigate\(/ outside scripts/qa/nav-allowlist.json files; /window\.location(\.href)?\s*=/; /<(div|tr|td|li|span)[^>]*onClick/
/href="#"/
```
And in UI strings (`src/i18n/**`, `src/pages/**/strings*.js`, `src/portfolio/i18n/**`, `src/portfolio/emr/widget/strings.js`, JSX text): `정직`, `honest`, `seamless`, `혁신`, `강력한`, `powerful`, `elevate`, `unlock`, `Get started`, `안전합니다`, `\.\.\.`, `→`, any string with more than one `—`, and any `—` in a key containing `title`, `heading`, `h1`, `gate`, `panel` or `species`.

### 9.5 Accessibility (`scripts/qa/a11y.cjs`, no new deps)

On every route at 1440 light and 390 dark:
- exactly one `<main>` and one `<h1>`; `<html lang>` matches the page language;
- every `input`/`select`/`textarea` has an accessible name; every icon-only button an `aria-label`;
- nav current item `aria-current="page"`; tabs `role=tablist`/`tab`/`aria-selected`; sortable headers `aria-sort`;
- tabbing reaches every interactive element with a visible focus indicator: computed `outline-width ≥ 2px` and `outline-style ≠ none` on `:focus-visible` for every element reached;
- dialogs trap focus and Esc closes them; the claim side panel is not modal (Tab leaves it);
- **contrast of every text node** (not sampled): computed colour against the first ancestor with a non-transparent background, blending semi-transparent layers on the way up; ≥ 4.5 (≥ 3 for ≥ 24 px); nodes over a background image are listed for manual review;
- the EMR popup has its own checks (popup spec §8.4).

### 9.6 Determinism and data checks (Vitest)
- `heroClaim.json` equals the snapshot's SYN-2026-00220 subset; the overview's monthly bars sum to `summary.amount_flagged`; the sidebar count equals `pend + review + deny_recommended`.
- `fmtWonCompact` boundaries (§6.4).

### 9.7 Design budgets (Playwright, every §9.2 screenshot; each is a hard fail)
1. **Colour:** any element whose computed text, background or border colour has OKLCH chroma > 0.04 must be inside `[data-status]`, a link, `:focus-visible`, `[aria-selected=true]`/`[aria-current]`, or a chart mark (`.recharts-*`), or be a `SeverityBadge`/`DecisionBadge`/`StatusText`.
2. **Font sizes:** ≤ 6 distinct computed sizes on an app screen, ≤ 8 on a marketing screen.
3. **Corner radius:** every computed radius ∈ {0, 4, 6, 8, 12, 9999 px, 50 %}.
4. **Shadows:** a non-`none` `box-shadow` only inside a Radix popper (`[data-radix-popper-content-wrapper]`), `[role=dialog]`, `[role=alertdialog]`, a Sonner toast or `[data-floating]`.
5. **Nesting:** an element with a border on ≥ 3 sides has at most one bordered ancestor of the same kind.
6. **Icons:** ≤ 1 Lucide icon (`svg.lucide`) per table row, excluding the row-action button.
7. **Letter case:** no computed `text-transform: uppercase`; no positive `letter-spacing` on text containing Hangul.
8. **Canvas:** the computed background of `body` and of the app main region equals `--background`.

### 9.8 Reviewer-agent sign-off (not automatable; blocks merge)

A reviewer agent that did not build the surface receives, per route: the 1440-light, 1024-dark and 390-dark screenshots; that surface's **Reference** paragraph (§5); §1.2; and the golden screens (§9.9). For every screenshot it records PASS/FAIL with evidence (element and reason) for:
- **Reference match:** density (row heights and control heights as stated), hierarchy (what the eye lands on first, as stated), surface treatment (white canvas, unboxed tables, cards only where stated);
- **every banned item** in §1.2 (C1–C7, L1–L17, T1–T7, M1 judged from a 2 s screen recording of the first load, W1–W6 on visible copy);
- **"would a designer at a serious B2B company ship this"**: one sentence with the single most template-like detail, which must be fixed if it maps to a §1.2 item.

Any FAIL blocks; the builder fixes and the reviewer re-reviews the new shots. The reviewer's notes go in WP9's report. WP9 runs this round twice: after step 2 for WP5–WP7 (early correction) and at the end for every route.

### 9.9 Golden reference screens (`/__ui/golden`, WP0)

Three hand-tuned screens built in step 1 and approved by the reviewer agent (§9.8) before step 2 starts:
1. one claim-queue row in all six DataTable states (§4.5);
2. the claim-detail header and one EvidenceTrail finding row;
3. one DUR finding card (the CSS model for the widget card).

WP6, WP5 and WP3 MUST reuse their exact classes (WP3 copies the computed values into `widget.css`). WP9 compares by **computed-style fingerprint**, not pixels: for each golden element and its production counterpart (marked `data-golden="queue-row" | "claim-header" | "finding-row" | "dur-card"`), the class list (WP5/WP6) and the computed `font-size`, `font-weight`, `line-height`, `height`, `padding`, `border-*-width`, `border-*-color`, `background-color`, `color` and `border-radius` must be equal.

### 9.10 Definition of done for each WP
- Owned files only, plus REQUESTS and `ext/` additions listed.
- Its slice of §9.2–§9.7 passes for its routes, and §9.8 has no open FAIL.
- No TODOs in shipped code.
- The report lists removed files, changed tests and why, and the screenshots (1440 light + 390 dark) it looked at.

---

## Revision log

Revision 2 (2026-10-03) applies the design-director critique (`/tmp/claude-0/uiresearch/critique/critique_0.md`) and the founder decisions listed at the top. Verification scripts: `/tmp/claude-0/uiresearch/spec-rev/contrast_rev.py` (all ratios and OKLCH hues in §3), and the snapshot checks below (run with node against `src/data/claimsDemoSnapshot.json`: 312 claims, billed 156,935,799, `amount_flagged` 18,409,436, decisions pend 33 / review 55 / deny 47 / auto 177, 12 rules in 5 prefixes, 36 clinics with 22 under 10 claims, SYN-2026-00220 billed 7,383,700 / reimbursed 5,000,000 / 8 findings, visit dates 2026-04-03 to 2026-09-30).

| Finding | Status | Where |
|---|---|---|
| P0-1 template layouts (split hero, stat strip, zig-zag, stock dashboard, grey canvas) | Applied | §1.1, §1.2 C7/L1/L15–L17, §3.1, §5.1, §5.3 |
| P0-1 "WP8 cannot start until the founder gives an address" | Resolved by founder decision 1 | §5.1 (`CONTACT_EMAIL = ''`, no band) |
| P0-1 ledger total `청구 … → 지급 예정 …` | Modified: three labelled cells, no `→` (the critique's own P1-1 bans `→` in strings) | §5.1 |
| P0-1 text link next to the primary button | Modified: `API 연동 보기` (no contact address exists) | §5.1 |
| P0-2 wipe Tailwind defaults; widen lint | Applied | §2.5, §9.4, WP0 acceptance |
| P0-3 dark brand and ok green re-hued | Applied, values re-measured | §3.1, §3.2 |
| P0-4 solid critical + on-solid tokens | Applied | §3.1, §4.3, §4.5 |
| P0-5 package removal, EMR stub, codemod exemption, vendor list, logo importer, missing components | Applied; ownership model per founder decision 4 instead of "first WP that uses it owns it in `patterns/`": later WPs build in `src/ui/ext/<wp>/`, request edits, UI-steward round applies them; WP4 (not WP0) creates the EmrDemoPage stub, as its first action in step 2 | §2.1, §2.2, §2.3, §4.0, §4.8, §8 |
| P0-6 shadcn focus/height/shadow/zoom/radius/tab overrides | Applied as `scripts/restyle-shadcn.mjs`; added rows for `bg-black/50`, `text-white`, `rounded-xs`, `uppercase`, which the palette wipe would otherwise silently break | §3.9, §4.1 |
| P0-7 design budgets | Applied, plus budget 8 (canvas) | §9.7 |
| P0-7 golden screens approved by the founder; pixelmatch ≤ 0.5 % | Modified: approval by the reviewer agent (founder decision 5; the founder is not in the agent loop); comparison by computed-style fingerprint. **Rejected pixelmatch**: not a verified package (§2.1), and pixel diffs of screens rendering live data fail on unrelated content | §9.8, §9.9 |
| P0-8 `dark:` ignores system dark | Applied (variant verified by the critique in 4.3.3) | §2.5 |
| P0-9 `overflow-wrap: anywhere` breaks amounts | Applied; `.num`/`.id` nowrap + single-line check | §3.3, §9.2 |
| P0-10 rule families 5, open claims 135, no small-sample badge | Applied; numbers re-verified | §5.1, §5.3 |
| P1-1 gameable checks (font, contrast sampling, keep-all, hex, uppercase split, navigate, banned words, shadow regex) | Applied | §9.2–§9.5 |
| P1-2 delete `--info` | Applied; pend is a neutral outline badge | §3.1, §4.5 |
| P1-3 row-state table | Applied | §4.5 |
| P1-4 transparent borders, card = background, popover raised, tinted-surface border | Applied; dark border measured 1.25 page / 1.30 popover (critique quoted 1.22 / 1.29) | §3.1, §3.2 |
| P1-5 Korean money, ranges, pagination | Applied, with boundary tests | §6.1, §6.4 |
| P1-6 EvidenceTrail + ledger double rule | Applied | §3.6, §4.5 |
| P1-7 no Geist Mono; `.id`; Lucide stroke; table badges without icons | Applied | §1.2 T1/T7, §2.4, §4.2 |
| P1-8 touch controls, `wide` breakpoint, non-modal side panel | Applied | §2.5, §3.4, §5.3 |
| P1-9 em dashes, `안전` in the H1, caption self-narration, metadata string, register conflict, verbless headline | Applied; headline is founder-editable (decision 2) | §5.1, §5.3, §5.5, §6.2, §6.5 |
| P1-10 skeleton at first paint | Applied (`heroClaim.json`, first-paint check) | §5.1, §9.2 |
| P1-11 hover/disabled/nav/tooltip/kbd/counts/segmented/sticky/charts/skeleton/theme-color/focus radius/marketing spacing/header height | Applied | §2.3, §3.4, §3.9, §4.2 |
| P1-12 EMR: no colour strip, one disclaimer, no em dashes | Applied. **Partly modified:** the host's "가상 EMR" watermark is kept because it labels the fictional host (not the DUR) and is the only marker that prints with the chart; the IIFE widget keeps its own marker because third-party pages have no demo bar | §5.6; popup spec §2.1, §3.7.1 |
| P2-1 self-referencing tokens | Applied (`--nv-font-*`, `--nv-shadow-*`) | §2.4, §2.5, §3.6 |
| P2-2 mono font, overview chart, CSV export, off-label badge | Applied | §2.4, §5.3, §5.5 |
| P2-2 `/dur` default language | Not changed: recorded as an open founder decision; English stays the default per showcase §0.6 | §5.5 |
| Founder decision 5: reference descriptions + reviewer agent | Added | §5 "Reference" paragraphs, §9.8 |

Revision 3 (2026-10-04) adds the brand layer (§4.9): MaruBuri display face for brand surfaces only, outlined `nuvovet` lockups with the product name in its product ink, monogram favicons, Geist removed. It amends §1.2 T1 and C3, §2.4, §3.3 and §4.8 for brand surfaces; console rules are unchanged.
