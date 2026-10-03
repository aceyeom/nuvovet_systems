# NuvoVet design system and UI rebuild plan (binding)

Status: binding spec for the Phase 6 UI rebuild. Author: lead product designer, 2026-10-03.

**Inputs.** This spec synthesises four research tracks: ai-tells, stack, emr and audit. Their full text and screenshots are in `/tmp/claude-0/uiresearch/` (audit screenshots in `audit/shots/`). The DUR popup has its own spec, [`docs/portfolio/EMR_DUR_POPUP_SPEC.md`](../portfolio/EMR_DUR_POPUP_SPEC.md).

**Precedence.** Where this document conflicts with `docs/portfolio/DUR_SHOWCASE_SPEC.md`, this document wins. That covers §0.4 (allowed imports) and §7 (visual system, fonts, tokens). Everything else in the showcase spec still holds:
- clean-room data;
- no runtime network;
- no fabricated numbers;
- bilingual copy;
- determinism.

**Reading rule for builders.** MUST, NEVER and DO are requirements. "Prefer" means the default unless a requirement elsewhere conflicts. If something is not specified, choose the option that removes UI rather than adds it.

---

## 1. Direction

### 1.1 Direction statement: "Clinical ledger"

NuvoVet should look like a well-kept clinical ledger, not a template.

- **Palette.** Calm, cool-neutral surfaces, ink-black type and hairline rules. There is exactly one accent: cobalt `#2457F5` in light mode and `#6F92FF` in dark mode. It is used only for links, focus, selection and the first chart series.
- **Colour is reserved for meaning.** Clinical severity (금기 / 중대 / 주의 / 경미) and claim decisions (자동 승인 / 서류 요청 / 심사 필요 / 지급 거절 권고) are the only other colours in the product. Every coloured mark has a word and an icon next to it.
- **Density.** The app is dense and keyboard-first:
  - 13–14 px text with tabular figures;
  - 32 px controls and 32–36 px table rows;
  - a 240 px sidebar;
  - a ⌘K command palette.
- **Marketing pages** use the same tokens. They spend their boldness in one place: large Pretendard display type over a live, cropped piece of the real product. No illustrations, shaders or gradients.
- **The signature element** is the evidence trail. Every verdict shows its rule ID, its source and what was not checked.
- **Copy** is Korean-first, short and verb-first, and never narrates itself.

### 1.2 Banned anti-patterns

Each item cites the track that found it. A reviewer MUST reject a PR that adds any of these. The QA script in WP9 greps for the mechanical ones (§9.4).

**Colour**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| C1 | Indigo, violet, purple, teal or emerald anywhere, including Tailwind `indigo-*`, `violet-*`, `purple-*`, `teal-*`, `emerald-*` and the hexes `#6366f1`, `#0f766e`, `#0F766E`, `#134E4A`, `#10b981` | ai-tells #4, #8; audit §2 | `--brand` cobalt for interaction; greys for everything else |
| C2 | Gradients on text, buttons, cards or backgrounds (`bg-clip-text text-transparent`, `linear-gradient`, `radial-gradient`, glow blobs) | ai-tells #1, #22 | Flat surfaces. The only allowed gradient is the skeleton shimmer. |
| C3 | A different accent per product or section (blue insurer / green clinic, coloured feature eyebrows) | ai-tells #7; audit §3.1 | One accent |
| C4 | Severity or decision colours used for decoration or emphasis | ai-tells rule 5 | Ink weight and size for emphasis |
| C5 | Cream or "warm minimal" backgrounds (`#f7f7f5`, `#F4F1EA`), and terracotta | ai-tells #5 | `--background` / `--surface-subtle` |
| C6 | Colour as the only signal | ai-tells §4; Vercel guidelines | Icon + word + colour |

**Layout and components**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| L1 | A centred hero with a pill eyebrow and two pill CTAs; a 180 vh scroll-linked hero; a WebGL shader | audit §3.1; ai-tells #1, #2 | Left-aligned hero: one primary button, one text link, live product UI |
| L2 | Three-up icon-in-a-rounded-square feature cards | ai-tells #9; audit §3.5 | Real UI crops, or a two-column text + number layout |
| L3 | Fake miniature product illustrations, including 9–10 px text inside "screens" | audit §3.1 | Live components rendered from real data |
| L4 | Coloured 3–4 px left-border strips on cards | ai-tells #12 | Severity goes in the label row |
| L5 | Bordered boxes nested more than one level deep | ai-tells #13 | Spacing, headings and dividers inside one card |
| L6 | Shadows on in-flow cards; `shadow-lg`/`shadow-xl`; frosted glass (`backdrop-blur`) | ai-tells §4; audit §2 | Hairline border. Shadows only on floating layers (§3.6). |
| L7 | Pills (`rounded-full`) on text badges, buttons or tags | ai-tells #11 | 4 px badges, 6 px buttons. `rounded-full` only for avatars, switches and counters. |
| L8 | Dashed borders, except on a file drop zone | ai-tells #20 | Solid hairline |
| L9 | `01 / 02` numbering, "a · b · c" metadata strings and "→" glued to links, as decoration | ai-tells #6, #14 | Plain labels. Numbering only for real steps. |
| L10 | An explanation paragraph under every widget, repeated disclaimers, a "Not a screenshot" style of self-narration | audit §3.3, §3.5; ai-tells #15, #16 | One `합성 데이터` / `교육용 프로토타입` marker per screen, in the top bar. Definitions go in tooltips. |
| L11 | Zero-count rows ("0 Major · 0 Moderate…") | audit §3.5 | Show non-zero counts only |
| L12 | Highlighting every row in a table | audit §3.3 | Highlight only flagged rows |
| L13 | Bars scaled to the maximum value but labelled as percentages | audit §3.3 | 0–100 % scale |
| L14 | `<div onClick>` / `<tr onClick>` / `<button onClick={navigate}>` used for navigation | audit §5 | `<a href>` / `<Link>`; a real button with a row action |

**Typography**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| T1 | DM Sans, DM Mono, Inter, JetBrains Mono, Space Grotesk, Instrument Serif, Fraunces, or any Google Fonts / jsDelivr / unpkg font URL | ai-tells #18; audit §2 | Self-hosted Pretendard Variable + Geist Mono (§2.4) |
| T2 | Letter-spaced uppercase labels (`uppercase tracking-*`), positive letter-spacing on Hangul | ai-tells #10 | Sentence case at `text-xs` weight 500 in `--muted-foreground` |
| T3 | Text smaller than 12 px; half-pixel sizes (10.5 / 11.5 / 12.5) | audit §3.1, §3.3 | The type scale (§3.2) |
| T4 | Missing `word-break: keep-all` on Korean | ai-tells #17 | Global base style (§3.2) |
| T5 | Proportional digits in tables, KPIs, doses or amounts | ai-tells §4 | `tabular-nums` (the `.num` utility) |
| T6 | A different colour on the second line of a headline; one highlighted word | ai-tells #6 | One colour per heading |

**Motion**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| M1 | Fade-up on scroll, staggered entrances, count-up numbers, bounce or spring overshoot, `transition: all`, infinite decorative animation | ai-tells §3; audit §3.1 | §3.7 durations; only `transform`/`opacity` |

**Copy**

| # | Banned | Found in | Replacement |
|---|---|---|---|
| W1 | "seamless / powerful / elevate / unlock / 혁신적인 / 강력한", "honest / 정직한", "not just X but Y", lists of three for rhythm, more than one em dash per screen | ai-tells #15, §3 | §6 copy rules |
| W2 | Meta-commentary about the page itself ("Rule counts per layer are read from…", "This table runs analyze()…", print-dialog instructions) | audit §3.5 | Delete, or move to `#/how-it-works` as one sentence |
| W3 | Leaked enums or English in Korean UI (`antibiotic`, `gi_protectant`, `/visit`, "Acute gastroenteritis") | audit §6.4 | Korean display names; the code as a secondary mono line if needed |
| W4 | Answer-key leakage ("합성 데이터 정답 라벨") in reviewer views | audit §3.3 | Shown only on the engine-performance page |
| W5 | Unresolved particles ("나비(으)로") | audit §6.7 | A particle helper (§6.3) |

---

## 2. Library stack

### 2.1 Verified versions (stack track, Chromium 141, 2026-10-03)

Only these versions are allowed; they were installed, built and exercised together. Pin them exactly: no `^`, so a later resolve cannot drift.

```bash
cd frontend
npm i -E tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 tw-animate-css@1.4.0 \
  radix-ui@1.6.7 class-variance-authority@0.7.1 clsx@2.1.1 tailwind-merge@3.7.0 \
  cmdk@1.1.1 sonner@2.0.8 vaul@1.1.2 \
  @tanstack/react-table@9.2.4 recharts@3.10.1 react-is@19.3.0 \
  pretendard@1.3.9 @fontsource-variable/geist-mono@5.3.0
npm i -E -D subset-font@2.9.0
npm rm framer-motion three autoprefixer postcss tailwindcss@3   # three/framer-motion only served the retired shader hero
# unchanged: react/react-dom 19.3.0, react-router-dom 7.18.4, vite 8.3.2, @vitejs/plugin-react 6.1.1,
#            vitest 5.0.3, lucide-react 1.50.0
```

**Not allowed in this phase:**
- **Packages the stack track did not verify:** `@tanstack/react-virtual`, `@visx/*` (dry run only), `react-day-picker`, `@base-ui/react`, `next-themes`, `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`.
- **`motion`:** CSS plus `tw-animate-css` covers every animation in §3.7.
- **`react-resizable-panels`:** no surface needs resizable panes.

**TanStack Table 9.2.4 has a new API.** shadcn's data-table docs still describe v8, so use this pattern instead (verified in `/tmp/claude-0/uiresearch/stack/proj/src/Demo.jsx`):

```jsx
import { useTable, tableFeatures, rowSortingFeature, createSortedRowModel, sortFns, createColumnHelper } from '@tanstack/react-table'
const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns })
const table = useTable({ features, columns, data })
// header: <table.FlexRender header={h} />   cell: <table.FlexRender cell={cell} />
```

If you need a feature not shown here (filtering, pagination), read `node_modules/@tanstack/react-table/dist/*.d.ts`. Do not guess the v8 names. Pagination of at most 312 rows is done client-side by slicing; virtualisation is not needed.

### 2.2 Where shared UI lives

```
frontend/
  components.json              shadcn config (below)
  jsconfig.json                {"compilerOptions":{"baseUrl":".","paths":{"@/*":["./src/*"]}}}
  scripts/vendor-shadcn.mjs    copied from /tmp/claude-0/uiresearch/stack/proj/scripts/ (pinned to shadcn commit 295a1f1…)
  scripts/vite-plugin-subset-fonts.js        (same origin; used by the standalone build)
  scripts/vite-plugin-font-subset-import.js  (same origin; used by the widget build)
  src/ui/
    tokens.css                 every design token, light + dark (§3). Plain CSS, no Tailwind directives.
    theme.css                  Tailwind v4 bridge: @theme inline mapping tokens → utilities (§2.5)
    fonts.js                   main-app font imports (§2.4)
    fonts-standalone.css       one @font-face per family, for single-file builds
    cn.js                      export function cn(...a){ return twMerge(clsx(a)) }
    theme.js                   getTheme()/setTheme()/useTheme() (§2.6)
    primitives/*.jsx           vendored shadcn new-york-v4 components, restyled (§4)
    patterns/*.jsx             NuvoVet compositions: SeverityBadge, DecisionBadge, StatCard, DataTable,
                               EmptyState, PageHeader, AppShell, CommandMenu, Kbd, Num, Money, Logo
    lib/format.js              Korean number, currency and date formatting (§6.4)
    lib/particle.js            Korean particle helper (§6.3)
    index.js                   barrel export
```

`components.json`:
```json
{ "$schema":"https://ui.shadcn.com/schema.json","style":"new-york","rsc":false,"tsx":false,
  "tailwind":{"config":"","css":"src/index.css","baseColor":"neutral","cssVariables":true,"prefix":""},
  "iconLibrary":"lucide",
  "aliases":{"components":"@/ui","utils":"@/ui/cn","ui":"@/ui/primitives","lib":"@/ui/lib","hooks":"@/ui/hooks"} }
```

**Vendoring.** The proxy blocks `ui.shadcn.com` (it returns 403), so use the stack track's script:

```bash
node scripts/vendor-shadcn.mjs button input textarea label select checkbox radio-group switch \
  dialog alert-dialog sheet drawer popover tooltip dropdown-menu command tabs table badge card \
  separator scroll-area skeleton kbd sonner sidebar
git diff src/index.css   # the CLI may inject its own theme variables; revert them — tokens live in src/ui/tokens.css
```

- **The vendor script's `patch()`** rewrites `from "cn"` to the path set in the utils alias. Update its target string to `@/ui/cn`.
- **Sonner:** the patched wrapper must read the theme from `document.documentElement.dataset.theme` (`'dark'` or `'light'`, else `'system'`), not from `next-themes`.
- **No portalize step.** `scripts/portalize.mjs` and `vite-plugin-shadow-focus.js` are NOT used. The DUR widget does not use Radix (see the popup spec §3.1), so no Radix component ever renders inside a shadow root.
- **If `/tmp/claude-0/uiresearch/stack/` is gone:** re-create `vendor-shadcn.mjs` from its description. Fetch `https://raw.githubusercontent.com/shadcn-ui/ui/295a1f114a138f23b5dfee0e0c6812394dfeb90c/apps/v4/registry/new-york-v4/ui/<name>.tsx`, rewrite `from "cn"`, wrap each file in a registry-item JSON, and run `REGISTRY_URL=https://raw.githubusercontent.com/shadcn-ui/ui/<sha>/apps/v4/public/r npx shadcn@4.21.1 add ./<name>.json`.

**Who may import what:**

| Code | May import |
|---|---|
| `src/ui/**` | react, react-dom, the §2.1 packages, lucide-react, and other `src/ui` files |
| `src/pages/**` | anything |
| `src/portfolio/**` | react, react-dom, lucide-react and `@/ui/**`. Nothing else outside `src/portfolio`, so copying `src/portfolio` + `src/ui` into a fresh repo still builds. This amends showcase spec §0.4. |
| `src/portfolio/emr/widget/**` | react, react-dom, lucide-react, `src/portfolio/engine/**`, `src/portfolio/emr/*.js` and `@/ui/tokens.css?inline`. **Not** `@/ui/primitives` or Radix (popup spec §3.1). |

**Aliases.** Vite and Vitest resolve `@` → `src` in all three configs: `vite.config.js`, `vite.portfolio.config.js` and `vite.widget.config.js`.

### 2.3 Tailwind 3 → 4 migration recipe (one PR, WP0)

Do not run v3 and v4 side by side.

1. **Start from a clean git tree.** Run `npx @tailwindcss/upgrade@4.3.3` in `frontend/` (about 23 s).
2. **Revert the false edit** in `src/portfolio/components/pages/__tests__/pages.test.js`: the tool renames the test "shadow UI keys" to "shadow-sm UI keys". Review the tool's whole template diff for other renames of that kind.
3. **Move the global reset into `@layer base`.** This is critical. Rules not in a layer beat every v4 utility: straight after the upgrade, 60 of 60 padded elements on `/` computed to 0 px.
   - Rules to move: `*`, `html`, `body`, `#root`, the scrollbar rules, the number-input spinner rules, `input:focus`, `button:focus-visible` and `html[lang=ko] body`.
   - Helper script: `/tmp/claude-0/uiresearch/stack/upgrade/layer-element-rules.py`.
   - In practice `index.css` is rewritten in step 6, so make sure no element-level rule remains outside `@layer base`.
4. **Switch to the Vite plugin:**
   - `npm i -E -D @tailwindcss/vite@4.3.3`
   - `npm rm @tailwindcss/postcss postcss`
   - `rm postcss.config.js tailwind.config.js`
   - in `vite.config.js` and `vite.portfolio.config.js`: `import tailwindcss from '@tailwindcss/vite'` and `plugins: [react(), tailwindcss(), …]`
5. **Delete `src/pages/insurance/insurance.css`'s unlayered generic classes.** In v4 the unlayered `.card`, `.btn` and `.gap-8` beat utilities. They go away anyway: WP6 deletes `insurance.css`. Until WP6 lands, wrap the file in `@layer components { … }`.
6. **Replace `src/index.css`** with exactly:
   ```css
   @import "tailwindcss";
   @import "tw-animate-css";
   @import "./ui/tokens.css";
   @import "./ui/theme.css";
   @source not "./portfolio/emr/widget";   /* the widget ships its own CSS */
   @layer base { /* §3.2 global text rules, focus ring, body background */ }
   ```
   The ~40 dead utility and animation classes in the old `index.css` (audit §1) are deleted.
7. **`index.html`:**
   - remove the Google Fonts / jsDelivr loader script;
   - set `<html lang="ko">`;
   - add `<meta name="color-scheme" content="light dark">` and the theme bootstrap (§2.6);
   - set the title `NuvoVet` (per-page titles in §6.5);
   - set the meta description: "동물병원 진료 기록을 펫보험 청구 데이터로 정형화하고, 근거와 함께 심사합니다."
8. **Acceptance:** `npm run build`, `npm run build:portfolio` and `npm test` all pass, and `/`, `/insurance`, `/clinic/claim` and `/dur` render.

### 2.4 Fonts (self-hosted, no CDN)

**Families:**
- **Sans, for everything:** Pretendard Variable. Its Latin glyphs are derived from Inter, and it ships `tnum`, `zero`, `case`, `ss01–16` and `cv01–13`, so no second sans is needed.
- **Mono, for identifiers only:** Geist Mono Variable. Identifiers are rule IDs, claim IDs, product codes, KCD-style codes and API paths.

**Main app.** In `src/ui/fonts.js`, imported once from `src/main.jsx`:

```js
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css' // 92 unicode-range slices, same-origin
import '@fontsource-variable/geist-mono/wght.css'
```

**Standalone single-file build.** `src/portfolio/standalone.jsx` imports `@/ui/fonts-standalone.css`. That file has one `@font-face` per family, pointing at `pretendard/dist/web/variable/woff2/PretendardVariable.woff2` and `@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2`. `PortfolioApp.jsx` MUST NOT import fonts itself.

In `vite.portfolio.config.js`:
- add `subsetFonts()` before `inlineSingleFile()`;
- set `assetsInlineLimit: (f) => f.endsWith('.woff2') ? false : undefined`;
- add `'font-src data:'` to the CSP array.

Measured result: Pretendard 2,009 → 50 kB, still variable.

**Font stacks** (`--font-sans`, `--font-mono`):
```
"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif
"Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
```

**Known limit.** Hangul typed at runtime that isn't in the bundle (a free-text comment) falls back to the system Korean font in the standalone and widget builds. This is acceptable; do not ship the 435 kB KS X 1001 set.

### 2.5 Tailwind bridge (`src/ui/theme.css`)

```css
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
@theme inline {
  --font-sans: var(--font-sans); --font-mono: var(--font-mono);
  --color-background: var(--background); --color-foreground: var(--foreground);
  --color-card: var(--card); --color-card-foreground: var(--foreground);
  --color-popover: var(--popover); --color-popover-foreground: var(--foreground);
  --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary); --color-secondary-foreground: var(--foreground);
  --color-muted: var(--muted); --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent); --color-accent-foreground: var(--foreground);   /* shadcn "accent" = hover surface */
  --color-destructive: var(--sev-critical);
  --color-border: var(--border); --color-input: var(--input); --color-ring: var(--ring);
  --color-subtle: var(--surface-subtle); --color-raised: var(--surface-raised);
  --color-text-2: var(--text-2); --color-border-strong: var(--border-strong);
  --color-brand: var(--brand); --color-brand-hover: var(--brand-hover); --color-brand-soft: var(--brand-soft);
  --color-sev-critical: var(--sev-critical); --color-sev-critical-bg: var(--sev-critical-bg);
  --color-sev-major: var(--sev-major); --color-sev-major-bg: var(--sev-major-bg);
  --color-sev-moderate: var(--sev-moderate); --color-sev-moderate-bg: var(--sev-moderate-bg);
  --color-sev-minor: var(--sev-minor); --color-sev-minor-bg: var(--sev-minor-bg);
  --color-ok: var(--ok); --color-ok-bg: var(--ok-bg); --color-info: var(--info); --color-info-bg: var(--info-bg);
  --color-sidebar: var(--surface-subtle); --color-sidebar-foreground: var(--foreground);
  --color-sidebar-accent: var(--accent); --color-sidebar-accent-foreground: var(--foreground);
  --color-sidebar-border: var(--border); --color-sidebar-ring: var(--ring);
  --color-sidebar-primary: var(--primary); --color-sidebar-primary-foreground: var(--primary-foreground);
  --color-chart-1: var(--chart-1); --color-chart-2: var(--chart-2); --color-chart-3: var(--chart-3);
  --radius-sm: 4px; --radius-md: 6px; --radius-lg: 8px; --radius-xl: 12px;
  /* type scale: Tailwind's own keys are re-pointed so tailwind-merge needs no custom config (§3.2) */
  --text-xs: 12px; --text-xs--line-height: 16px;
  --text-sm: 13px; --text-sm--line-height: 20px;
  --text-base: 14px; --text-base--line-height: 22px;
  --text-lg: 16px; --text-lg--line-height: 24px;
  --text-xl: 20px; --text-xl--line-height: 28px;
  --text-2xl: 24px; --text-2xl--line-height: 32px;
  --text-3xl: 32px; --text-3xl--line-height: 40px;
  --text-5xl: 48px; --text-5xl--line-height: 56px;
  --text-6xl: 64px; --text-6xl--line-height: 72px;
  --shadow-pop: var(--shadow-pop); --shadow-modal: var(--shadow-modal);
  --ease-out: cubic-bezier(0.2, 0, 0, 1); --ease-in: cubic-bezier(0.4, 0, 1, 1);
}
```

**Utility naming rules:**
- **NEVER invent new font-size utility names** such as `text-caption`. tailwind-merge would read them as colours and drop `text-foreground`.
- **`dark:` is almost never needed**, because every colour is a token that flips. Use it only for image swaps.
- **`text-4xl` is undefined on purpose.**

### 2.6 Dark mode mechanism

**One attribute, everywhere:** `data-theme="light" | "dark"`.
- On `<html>` in the main app and the standalone build.
- On `.nv-scope` inside the widget shadow root.
- No attribute means "follow the system".

**The bootstrap script** goes inline in `<head>` of `index.html` and `portfolio.html`, before any CSS, so there is no flash:
```html
<script>(function(){try{var t=localStorage.getItem('nv-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();</script>
```

**`src/ui/theme.js`:**
- **`getTheme()`** returns `'light' | 'dark' | 'system'`.
- **`setTheme(t)`:**
  - sets or removes the attribute;
  - writes `localStorage['nv-theme']` inside try/catch;
  - also removes the legacy key `nuvovet.dur.theme` after reading it once.
- **`resolvedTheme()`** returns `'light' | 'dark'` via `matchMedia('(prefers-color-scheme: dark)')`.
- **`useTheme()`** subscribes to changes and to the media query.

**Portfolio.** `PortfolioApp.jsx` stops setting `data-theme` on `.pf-root`. It calls `setTheme` instead, so the attribute lives on `<html>`.

**Allowed by the CSP.** The standalone CSP already allows inline scripts (`script-src 'unsafe-inline'`).

**Theme toggle.** A three-state toggle (시스템 / 라이트 / 다크) appears in:
- the console top bar;
- the clinic page header;
- the `/dur` header.

The landing page follows the system setting and has no toggle.

---

## 3. Tokens (`src/ui/tokens.css`)

### 3.1 Colour: exact values

**Selectors.** Light tokens are declared on `:root, .nv-scope`. Dark tokens are declared twice:
- under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]), .nv-scope:not([data-theme="light"]) {…} }`;
- under `:root[data-theme="dark"], .nv-scope[data-theme="dark"] {…}`.

Also set `color-scheme: light` and `color-scheme: dark` respectively.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#0E0F11` | page, cards, popovers |
| `--surface-subtle` | `#F7F8FA` | `#16171A` | sidebar, table header, app canvas behind cards |
| `--surface-muted` (`--muted`, `--secondary`, `--accent`) | `#F0F2F5` | `#232529` | hover, selected row, secondary button |
| `--surface-raised` (`--card` in dark, `--popover` in dark) | `#FFFFFF` | `#1C1E22` | floating layers (dark mode shows elevation by surface, not shadow) |
| `--foreground` | `#16191E` | `#ECEEF1` | primary text |
| `--text-2` | `#4D5560` | `#A9AFB8` | secondary text |
| `--muted-foreground` (text-3) | `#646C77` | `#8D949E` | meta text, captions, **placeholders** |
| `--text-faint` | `#9AA1AA` | `#5F656E` | **disabled only** (fails 4.5:1 on purpose; WCAG exempts disabled) |
| `--border` | `#E3E6EA` | `#272A2F` | hairlines (decorative) |
| `--border-strong` | `#CDD2D8` | `#363A40` | table header rule, dividers that group |
| `--input` | `#848B95` | `#666D77` | form-control borders (≥ 3:1 non-text contrast) |
| `--primary` | `#16191E` | `#ECEEF1` | primary button background (ink) |
| `--primary-foreground` | `#FFFFFF` | `#0E0F11` | text on ink |
| `--brand` | `#2457F5` | `#6F92FF` | links, focus, selection, chart series 1 |
| `--brand-hover` | `#1C47D6` | `#8AA6FF` | link hover |
| `--brand-soft` | `#EDF2FF` | `#18213D` | selected nav item, selection background |
| `--ring` | `#2457F5` | `#6F92FF` | focus ring |
| `--chart-1` / `-2` / `-3` | `#2457F5` / `#4D5560` / `#848B95` | `#6F92FF` / `#A9AFB8` / `#666D77` | categorical series, in this order |
| `--backdrop` | `rgb(14 15 17 / .48)` | `rgb(0 0 0 / .64)` | modal scrim |

**Semantic status.** Text colour and tint background, always paired with an icon and a word.

| Token | Light fg / bg | Dark fg / bg | DUR meaning | Claims meaning |
|---|---|---|---|---|
| `--sev-critical` / `-bg` | `#C8241B` / `#FDF0EF` | `#FF6B5E` / `#2A1513` | 금기 contraindicated | 지급 거절 권고 `deny_recommended`; finding 심각 |
| `--sev-major` / `-bg` | `#B84A00` / `#FDF2E9` | `#FF8F3D` / `#2A1A0E` | 중대 major | — |
| `--sev-moderate` / `-bg` | `#8F6200` / `#FBF5E3` | `#E3B341` / `#272011` | 주의 moderate | 심사 필요 `review`; finding 주의 |
| `--sev-minor` / `-bg` | `#4D5560` / `#F0F2F5` | `#A9AFB8` / `#232529` | 경미 minor; 참고 notes; 검토 불완전 incomplete | finding 정보 |
| `--info` / `-bg` | `#2457F5` / `#EDF2FF` | `#8AA4FF` / `#18213D` | — | 서류 요청(대기) `pend` |
| `--ok` / `-bg` | `#147A4E` / `#EBF6F0` | `#3FC685` / `#10241A` | dose "범위 내" status text only (never a verdict) | 자동 승인 `auto_approve` |

**Rules:**
- DUR "규칙상 문제 없음" (verdict `none`) is **neutral**: `--sev-minor` text, no green. Green is never a DUR verdict.
- Red appears only for 금기 and 지급 거절 권고.

**Order of status colour precedence on one element:** critical > major > moderate > info > ok > minor.

### 3.2 Contrast (WCAG 2.x)

Computed with `/tmp/claude-0/uiresearch/spec/contrast.py` (relative luminance, sRGB).

**Text tokens on surfaces, light:**

| Token | Hex | on `#FFFFFF` | on `#F7F8FA` | on `#F0F2F5` |
|---|---|---|---|---|
| foreground | `#16191E` | 17.62 | 16.58 | 15.71 |
| text-2 | `#4D5560` | 7.54 | 7.10 | 6.73 |
| muted-foreground | `#646C77` | 5.31 | 5.00 | 4.74 |
| text-faint (disabled) | `#9AA1AA` | 2.61 | 2.45 | 2.33 |
| brand | `#2457F5` | 5.59 | 5.26 | 4.98 |
| brand-hover | `#1C47D6` | 7.19 | 6.76 | 6.41 |
| sev-critical | `#C8241B` | 5.64 | 5.31 | 5.03 |
| sev-major | `#B84A00` | 5.23 | 4.92 | 4.66 |
| sev-moderate | `#8F6200` | 5.36 | 5.05 | 4.78 |
| sev-minor | `#4D5560` | 7.54 | 7.10 | 6.73 |
| ok | `#147A4E` | 5.35 | 5.04 | 4.77 |
| input border (non-text, ≥ 3) | `#848B95` | 3.44 | 3.24 | — |

**Text tokens on surfaces, dark:**

| Token | Hex | on `#0E0F11` | on `#16171A` | on `#1C1E22` | on `#232529` |
|---|---|---|---|---|---|
| foreground | `#ECEEF1` | 16.50 | 15.42 | 14.36 | 13.21 |
| text-2 | `#A9AFB8` | 8.69 | 8.12 | 7.56 | 6.95 |
| muted-foreground | `#8D949E` | 6.27 | 5.86 | 5.45 | 5.02 |
| text-faint (disabled) | `#5F656E` | 3.26 | 3.05 | 2.84 | 2.61 |
| brand | `#6F92FF` | 6.60 | 6.17 | 5.75 | 5.29 |
| sev-critical | `#FF6B5E` | 6.86 | 6.42 | 5.97 | 5.49 |
| sev-major | `#FF8F3D` | 8.45 | 7.89 | 7.35 | 6.76 |
| sev-moderate | `#E3B341` | 9.85 | 9.21 | 8.58 | 7.89 |
| ok | `#3FC685` | 8.79 | 8.22 | 7.65 | 7.04 |
| info | `#8AA4FF` | 8.07 | 7.54 | 7.02 | 6.46 |
| input border (non-text, ≥ 3) | `#666D77` | ≈3.7 | 3.43 | — | — |

**Status text on its own tint (badges):**

| Pair | Light | Dark |
|---|---|---|
| critical on critical-bg | 5.07 | 6.19 |
| major on major-bg | 4.74 | 7.38 |
| moderate on moderate-bg | 4.92 | 8.29 |
| minor on minor-bg | 6.73 | 6.95 |
| ok on ok-bg | 4.84 | 7.47 |
| info on info-bg | 4.99 | 6.67 |

**Buttons:**

| Pair | Ratio |
|---|---|
| white on ink `#16191E` | 17.62 |
| white on brand `#2457F5` | 5.59 |
| white on critical `#C8241B` | 5.64 |
| dark: `#0E0F11` on `#ECEEF1` | 16.50 |
| dark: `#0E0F11` on `#FF6B5E` | 6.86 |

**Focus ring.** The ring itself measures 5.59 light and 6.60 dark against the page (≥ 3 required).

**Known limits:**
- Hairline `--border` is 1.25 light / 1.33 dark. It is decorative, so this is allowed. Any boundary that identifies a control uses `--input`.
- `--chart-3` light `#848B95` is 3.44: it may only carry series that are also direct-labelled.

Every new colour pair added later MUST be added to this table with its measured ratio.

### 3.3 Type scale

Tailwind keys are re-pointed in §2.5.

| Class | px / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `text-xs` | 12 / 16 | 500 | 0 | captions, table meta, axis labels, badges |
| `text-sm` | 13 / 20 | 400 / 500 | 0 | table cells, side panels, menus, buttons, EMR widget body |
| `text-base` | 14 / 22 | 400 | 0 | default app body |
| `text-lg` | 16 / 24 | 400; 600 for titles | 0 | marketing body, mobile inputs (prevents iOS zoom), card / panel titles |
| `text-xl` | 20 / 28 | 600 | −0.01em | app page title (max one per screen) |
| `text-2xl` | 24 / 32 | 600 / 700 | −0.015em | KPI numbers, marketing h3 |
| `text-3xl` | 32 / 40 | 700 | −0.02em | marketing h2 only |
| `text-5xl` | 48 / 56 | 700 | −0.025em | marketing hero, desktop |
| `text-6xl` | 64 / 72 | 700 | −0.03em | at most once on the whole site (landing hero ≥ 1280 px) |

**Rules:**
- **Weights:** 400, 500, 600 and 700 only.
- **App screens** never use `text-3xl` or larger.
- **Negative tracking** is applied only to Latin-heavy display lines. Korean headings get `tracking-normal`.

**Global base** (`@layer base` in `index.css`; the widget repeats it under `.nv-scope`):

```css
html { -webkit-text-size-adjust: 100%; }
body { background: var(--background); color: var(--foreground); font-family: var(--font-sans); font-size: 14px; line-height: 22px;
       font-feature-settings: "ss06"; /* Pretendard: straight-sided l for 1/l legibility in doses */ }
:where(h1,h2,h3,h4,p,li,td,th,label,dt,dd,span,div) { word-break: keep-all; overflow-wrap: anywhere; }
:where(h1,h2,h3) { text-wrap: balance; }  :where(p) { text-wrap: pretty; }
.num, :where(td.num, th.num) { font-variant-numeric: tabular-nums; text-align: right; }
.mono { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0; }
::selection { background: var(--brand-soft); }
```

**If `ss06` misbehaves.** It is only a legibility preference. If `ss06` changes any Hangul glyph in Chromium (WP0 checks with one screenshot), drop it.

### 3.4 Spacing, sizing, layout

**Spacing.** Tailwind's 4 px scale, using only `0, 0.5 (2px), 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 24`. That is 0–96 px; 96 px is for marketing sections only.

**Controls:**
- default height 32 px (`h-8`), small 28 px (`h-7`), large 40 px (`h-10`);
- touch screens (< 640 px): 40 px, with a hit area of at least 44 px via padding;
- inline padding 12 px; icon buttons 32×32 with a 16 px icon.

**Rows:**
- default table row 36 px (`h-9`);
- compact 32 px, for the insurer queue;
- comfortable 44 px, for clinic form grids;
- list item 40 px;
- nav item 32 px.

**App shell:**

| Element | Size |
|---|---|
| sidebar | 240 px expanded, 56 px collapsed (icon rail) |
| top bar | 48 px |
| page padding | 24 px (16 px under 640 px) |
| reading width | max 1200 px; tables are full width |

**Gaps:**
- 8 px inside a control group;
- 12 px between related fields;
- 24 px between sections in the app;
- 64 px (`py-16`) between marketing sections; 96 px only around the hero.

**Breakpoints:** Tailwind defaults `sm 640`, `lg 1024`, `xl 1280`. `md` and `2xl` are not used.

**Container:** marketing `max-w-[1200px] px-6`; app content full width inside the shell.

### 3.5 Radius

| Size | Radius | Used for |
|---|---|---|
| `rounded-sm` | 4 px | badges, checkboxes, chips, kbd |
| `rounded-md` | 6 px | buttons, inputs, menu items, table row selection |
| `rounded-lg` | 8 px | cards, popovers, side panels, toasts, the EMR DUR panel |
| `rounded-xl` | 12 px | dialogs, sheets (outer corner only), the EMR gate dialog |
| `rounded-full` | — | avatars, switch tracks, count bubbles only |

**Nesting rule:** inner radius = outer radius − padding, and never larger than the parent.

**No other values.** `rounded-2xl`, `rounded-3xl`, `rounded-[…]` and `rounded` (bare) are banned.

### 3.6 Borders and shadows

**In-flow surfaces:** a 1 px `border-border`, no shadow.

**Floating layers only:**
```css
--shadow-pop:   0 0 0 1px rgb(16 24 40 / .06), 0 1px 2px rgb(16 24 40 / .06), 0 4px 12px rgb(16 24 40 / .08);  /* menus, popovers, toasts, tooltips */
--shadow-modal: 0 0 0 1px rgb(16 24 40 / .08), 0 2px 4px rgb(16 24 40 / .06), 0 16px 48px rgb(16 24 40 / .18); /* dialogs, sheets, EMR gate */
/* dark: same geometry with rgb(0 0 0 / .5), plus surface-raised background and a 1px --border-strong ring */
```

**Allowed shadow utilities:** only `shadow-pop` and `shadow-modal`. `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl` and `shadow-2xl` are removed from vendored components.

### 3.7 Motion

```css
--dur-1: 100ms;  /* hover / press colour */
--dur-2: 150ms;  /* tooltips, tab indicator, accordion */
--dur-3: 200ms;  /* menus, popovers, combobox, toasts */
--dur-4: 250ms;  /* dialogs, sheets, drawers, EMR gate */
--ease-out: cubic-bezier(0.2, 0, 0, 1);  --ease-in: cubic-bezier(0.4, 0, 1, 1);  --ease-inout: cubic-bezier(0.6, 0, 0.2, 1);
```

- **Exits** run at about 75 % of the enter duration with `--ease-in`.
- **Dialogs** fade in and scale from 0.98 to 1. **Sheets and drawers** slide 16 px plus fade. Nothing moves more than 16 px.
- **Only `opacity` and `transform` animate.** Never write `transition: all`; list the properties.
- **Reduced motion.** `@media (prefers-reduced-motion: reduce)` turns every transform animation into a fade of at most 100 ms. tw-animate-css classes are wrapped with `motion-safe:`.
- **Spinners** appear after 200 ms and stay at least 400 ms. Skeletons mirror the final layout.

### 3.8 Z-index

| Token | Value | Layer |
|---|---|---|
| `--z-sticky` | 10 | sticky table headers, sticky action bar |
| `--z-header` | 20 | app top bar, marketing nav |
| `--z-sidebar` | 30 | mobile sidebar sheet |
| `--z-overlay` | 50 | all Radix portals (dialog, popover, menu, tooltip, ⌘K); shadcn's `z-50` stays |
| `--z-toast` | 60 | Sonner |
| widget host | 2147483000 | `:host` of the EMR DUR overlay (popup spec §3.4) |

No other values are allowed.

### 3.9 Focus

```css
:where(a, button, input, select, textarea, [tabindex], [role="button"], [role="tab"], [role="option"], summary):focus-visible {
  outline: 2px solid var(--ring); outline-offset: 2px; border-radius: inherit;
}
```

- Inputs use `focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20`.
- **Never** `outline: none` without a replacement.
- The focus ring is the same in light and dark mode (§3.2 ratios).

---

## 4. Component inventory

Every component lives in `src/ui/primitives` (vendored) or `src/ui/patterns` (NuvoVet). The "Replaces" column maps the audit's inventory (audit §4).

Vendored files are edited only as stated:
- remove `shadow-xs` and `shadow-sm` from in-flow components;
- set radii per §3.5;
- remove `uppercase tracking-*`;
- replace `text-[...]` arbitrary sizes.

### 4.1 Actions

**`Button`** (vendored)
- **Variants:**
  - `default`: ink, `bg-primary`;
  - `secondary`: `bg-secondary`, plus a 1 px `border-border`;
  - `outline`;
  - `ghost`;
  - `link`: `text-brand`, underline on hover;
  - `destructive`: `bg-sev-critical`, white text; used only for an irreversible delete or "지급 거절 권고 확정".
- **Sizes:** `sm` 28, `default` 32, `lg` 40, `icon` 32×32, `icon-sm` 28×28.
- **States:** hover, active (`translate-y-px` is not used), `focus-visible`, `disabled` (50 % opacity, `--text-faint`), and `loading` (spinner left of the label; the label stays).
- **Replaces:** B1–B9 (landing pills, Start text buttons, console `.btn-*`, `.text-link`, `.icon-btn`, `.pf-btn--*`, `.pf-icon-btn`).

**`ToggleGroup`** (composed from Radix `ToggleGroup` via the `radix-ui` package)
- **Modes:** `single` and `multiple`.
- **Sizes:** `sm` and `default`.
- **Replaces:** `.pf-seg` (EN/KO, Dog/Cat, sex, Matrix/Table) and the clinic document toggles (B8).

**`DropdownMenu`, `Kbd`** (vendored)
- **Replace:** the ad-hoc menus and `.pf-kbd`.

### 4.2 Navigation

**`Sidebar`** (vendored `sidebar.jsx` + `hooks/use-mobile`)
- **Variants:** expanded 240 / collapsed 56 (rail), and a mobile `Sheet`.
- **Items:** 32 px tall, with `aria-current="page"`.
- **Groups:** labels in `text-xs` `--muted-foreground`, sentence case.
- **Replaces:** console `.shell-sidebar`, `.nav-item`, `.org-switcher` and the yellow org tile (deleted).

**`Tabs`** (vendored)
- **Variants:** `underline` (default) and `segmented`. Each tab can carry a count.
- **Replaces:** console `.tabs` / `.tab`, the workbench mobile bar, and the claim-queue filters (which become saved views).

**`Breadcrumb`** (pattern)
- **Use:** the console detail pages, e.g. "청구 심사 / SYN-2026-00220".

**`CommandMenu`** (pattern on vendored `command` = cmdk + Dialog)
- **Opens with:** ⌘K / Ctrl+K and `/`.
- **Groups:** 이동 (pages), 청구 (claim IDs), 병원 (clinics), 규칙 (rule IDs), 설정 (theme, language).
- **Rows:** each shows its shortcut; the list is capped at 400 px.
- **New:** there was no palette before.

**`Link`** — a plain `<a>` / router `<Link>` in `text-brand`.
- **Replaces:** every `onClick={navigate}`.

### 4.3 Data display

**`Badge`** (vendored, restyled)
- 4 px radius, `text-xs` weight 500, 20 px tall, padding 6 px.
- **Variants:** `neutral`, `outline`, `mono` (code IDs).
- **Replaces:** console `.badge*`, `.chip`, POST/GET pills, the "추정"/"없음" tags, Start pills, `.pf-chip`, `.pf-mbadge`, `.pf-badge-edited`, `.pf-labchip`.

**`SeverityBadge`** (pattern)
- **Props:** `level ∈ contraindicated | major | moderate | minor | incomplete | none`.
- **Sizes:** `sm` (20 px) and `md` (24 px).
- **Rendering:** icon + word, tint background + status text. The fill-weight rank is kept as an extra cue:
  - contraindicated = solid fill with white text (`bg-sev-critical text-white`);
  - major = tint plus a 1 px border in the status colour;
  - moderate = tint;
  - minor / incomplete / none = neutral tint.
- **Icons (lucide 16 px):** `OctagonX`, `TriangleAlert`, `CircleAlert`, `Info`, `CircleDashed` (incomplete), `CircleCheck` (none, neutral colour).
- **Words, KO / EN:**

  | Level | KO | EN |
  |---|---|---|
  | contraindicated | 금기 | Contraindicated |
  | major | 중대 | Major |
  | moderate | 주의 | Moderate |
  | minor | 경미 | Minor |
  | incomplete | 검토 불완전 | Incomplete |
  | none | 규칙상 문제 없음 | No rule findings |

- **Replaces:** `.pf-sev--*`, console `FindingCard` severity, and the landing 심각/주의 pills.

**`DecisionBadge`** (pattern)
- **Props:** `decision ∈ auto_approve | pend | review | deny_recommended`.

  | Decision | KO | Icon | Status token |
  |---|---|---|---|
  | `auto_approve` | 자동 승인 | `CircleCheck` | ok |
  | `pend` | 서류 요청 | `FileClock` | info |
  | `review` | 심사 필요 | `CircleAlert` | moderate |
  | `deny_recommended` | 지급 거절 권고 | `OctagonX` | critical |

- **Replaces:** `DecisionBadge` / `.badge-*` and `.dot-*`.

**`FindingSeverity`** (claims, pattern)
- **Values:** 심각 / 주의 / 정보, using critical / moderate / minor tokens.
- **Replaces:** console finding labels.

**`StatusText`** (pattern)
- **Rendering:** icon + word in the status colour, no background.
- **Use:** dose status (범위 내 / 범위 미만 / 범위 초과 / 참고 용량 없음 / 투여량 확인).
- **Replaces:** `.pf-status--*`.

**`Card`** (vendored, restyled)
- `rounded-lg border bg-card`, no shadow.
- **Slots:** `CardHeader` (title `text-lg` weight 600 + optional action), `CardContent`, `CardFooter`.
- **Padding:** 16 px in the app, 24 px on marketing pages.
- **Replaces:** console `.card*`, `.pf-panel`, `.pf-casecard`, `.pf-casehead`, `.pf-livecase`, `.pf-callout`, Start cards, and landing frosted cards (deleted).

**`StatCard`** (pattern)
- **Content:** a label (`text-xs` muted), a value (`text-2xl` `.num`), an optional delta (`text-xs`, coloured only when the direction has a declared meaning), an optional 32 px sparkline (recharts `Line`, no axes) and an optional footnote.
- **Height:** equal heights in a row.
- **Replaces:** `.stat-card`, `Stat`, and the landing glass stat strip.

**`DataTable`** (pattern: TanStack v9 + vendored `table`)
- **Header:** sticky (`top-0 z-[var(--z-sticky)] bg-subtle`), `text-xs` weight 500 in `--muted-foreground`, sentence case, units in the header ("청구액 (원)").
- **Sorting:** sortable headers are buttons with `aria-sort`.
- **Rows and cells:** right-aligned `.num` cells; row hover `bg-muted`; no zebra stripes.
- **Density:** a toggle between 32 and 36 px.
- **Row behaviour:** a row is a link (`<a>` in the first cell, with the row click delegating to it). `j` / `k` move the selection and `Enter` opens it.
- **States:** empty / loading (skeleton rows) / error.
- **Replaces:** every console `.table` and `.pf-mtable` / `.pf-gtable`.
- **Exception:** print tables in the report and handout stay hand-styled.

**`DescriptionList`** (pattern)
- **Layout:** two columns, `dt` muted `text-sm`, `dd` `text-sm` `.num` when numeric.
- **Replaces:** `PayableBreakdown` and patient blocks.

**`Num`** and **`Money`** (patterns)
- **`Money`:** `₩1,234,567`, or compact `₩9,518만` / `₩1.2억` only in KPIs (§6.4).
- **`Num`:** tabular figures.

**`CitationChip`**
- **Appearance:** an `outline` badge with a `BookOpen` 12 px icon.
- **On hover/focus:** a `HoverCard` (Radix `HoverCard` from `radix-ui`) with the source's cite and DOI.
- **Replaces:** `.pf-cite`.

**`RangeBar`**
- **Kept** from the portfolio (`.pf-range`) and restyled to tokens: track `--border-strong`, the reference band `--brand-soft`, a marker in ink.
- **Status colour** goes only on the status word.

**`BarList`, `CategoryBar`, `ProgressBar`** (patterns, plain divs)
- **Scale:** always 0–100 % or an absolute value with an axis label.
- **Replaces:** console `BarList`, the stacked decision bar, `PercentileBar` and the clinic-risk bar.

**`Chart`** (vendored `chart.jsx` on recharts 3, **lazy-loaded** per route)
- **Series:** `--chart-1..3`.
- **Axes and labels:** axis text `text-xs` muted with tabular figures, direct labels preferred over legends, no gradients.

### 4.4 Inputs

**`Input`** (vendored)
- 32 px tall, `border-input`, `rounded-md`, placeholder in `--muted-foreground`.
- **Addons:** `InputGroup` with prefix/suffix (`kg`, `mg/dL`, `원`).
- **Replaces:** raw console/clinic inputs, `.pf-input`, `.pf-input-group`, `.pf-numfield`.

**`MoneyInput`** (pattern)
- **Display:** `₩` prefix and thousands separators.
- **Value:** an integer (no decimals).

**`Select`** (vendored, Radix)
- **Replaces:** native `<select>` for sort, 분류, 지역, 보험사, 종 and frequency, plus `.pf-select`.

**`Combobox`** (pattern: `Popover` + `Command`; never the Base UI combobox)
- **Replaces:** `DrugSearch`, `BreedCombobox`, `.pf-combo`, `.pf-listbox`.

**`MultiCombobox` + `Tag`** (pattern)
- **Replaces:** `.pf-token` problem tokens and allergy pickers.

**`Checkbox`, `RadioGroup`, `Switch`, `Label`, `Textarea`** (vendored)
- **Replace:** `.pf-check`, `.pf-proto__radio` and the consent checkbox.

**`Field`** (pattern)
- **Structure:** a label above the control, help text in `text-xs` muted, and the error message in `text-xs` `--sev-critical` with an icon, linked via `aria-describedby`.
- Every input has a visible `<Label>`. Placeholder-only inputs are banned (audit: 25 of 34 inputs in the clinic form are unlabelled).

**`DatePicker`**
- **Not in this phase:** use `<Input type="date">` with a Korean format echo underneath (`2026년 10월 3일`).

**`Dropzone`** (pattern)
- The only dashed border in the product.
- **Replaces:** the hidden file input "영수증 사진으로 채우기".

### 4.5 Feedback and overlays

**`Dialog` / `AlertDialog`** (vendored)
- 12 px radius, `shadow-modal`, max width 520 px (`sm`) / 720 px (`lg`).
- **Focus:** trapped. The first focusable element is the **safe** action.

**`Sheet`** (vendored)
- **Uses:**
  - the claim detail on narrow screens;
  - filters on mobile;
  - the sidebar on mobile.

**`Drawer`** (vaul)
- **Use:** mobile bottom sheets for clinic results.

**`Popover`, `Tooltip`, `HoverCard`**
- **Tooltip** opens after 400 ms and holds definitions such as "서류 요청(대기)이란…". **Replaces:** the explanation paragraphs.

**`Toaster`** (Sonner)
- **Appearance:** bottom-right, 8 px radius, `shadow-pop`, hairline border.
- **Use:** only to confirm an action ("메모 저장됨"). Never for errors that need action.

**`Alert`** (vendored)
- **Variants:** `neutral`, `info`, `warning`, `critical`.
- **Rendering:** icon + title + one line, no left strip.
- At most one per screen. **Replaces:** the console info banner and `.pf-note`.

**`EmptyState`** (pattern)
- **Content:**
  - a 20 px icon;
  - one line that says what is missing;
  - one action.
- **Replaces:** bare "청구를 선택하세요." and the tiny "소견 없음" card.

**`Skeleton`, `Spinner`**
- Mirror the final layout.

**`EnvironmentMarker`** (pattern)
- **Appearance:** a `Badge` `outline` in the top bar reading `합성 데이터` (console, clinic) or `교육용 프로토타입` (`/dur`, EMR demo), with a tooltip that holds the full disclaimer.
- **Replaces:** `SourceNote` chips, the three per-screen disclaimers, and 4–6 portfolio repeats.

### 4.6 Brand

**`Logo`** (pattern, `src/ui/patterns/Logo.jsx`)
- **Wordmark:** lowercase `nuvovet` in Pretendard 700 at −0.03em, ink colour.
- **Product suffix:** an optional muted label in sentence case at the same baseline (e.g. `nuvovet 청구 심사`, `nuvovet DUR 데모`).
- **Sizes:** 16 / 20 px.
- **No icon tile.** `src/components/NuvovetLogo.jsx`, the inline 21 px span, the teal "CLAIMS" caps and the portfolio pill-in-square icon are all deleted.
- **Favicon:** keep `public/favicon.png`.

---

## 5. Surface-by-surface redesign

All wireframes are 1440 px unless stated otherwise. `[■]` means real product UI rendered from live components.

### 5.1 Landing `/`

**Audience:** pet-insurance claims, actuarial and IT buyers.

**Goal:** understand the product in one screen, then reach the console in one click.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ nuvovet        제품  연동  보안      DUR 데모              [콘솔 데모 열기]  파일럿 문의   │ 56px nav, sticky, hairline on scroll
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  펫보험 청구를,                              ┌──────────────────────────────────────────┐ │
│  근거가 붙은 데이터로.                         │ [■] live claim-detail crop:              │ │
│  (text-5xl, left-aligned, 2 lines max)      │  SYN-2026-00220 · 심사 필요                │ │
│                                             │  소견 3건 · 규칙 ID · 금액 영향              │ │
│  동물병원 영수증을 표준 코드로 정형화하고,        │  line-item table (flagged rows only tinted) │ │
│  보장·임상·가격 규칙으로 심사합니다.             │  sticky action bar (승인/서류 요청/SIU)      │ │
│                                             └──────────────────────────────────────────┘ │
│  [콘솔 데모 열기]   파일럿 문의 →(text link)       caption: 합성 데이터 312건 기준 (text-xs)     │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 4-up stat row (plain, hairline separators, values from landingStats.json + snapshot):    │
│  848          |  426 / 426        |  4           | 0                                     │
│  약품 별칭     |  규칙 ID·설명이 붙은 소견 | 규칙군      | 자동 거절 (판정은 심사역)               │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 2-col section ×3 (alternating text left / UI right; no eyebrows in colour):              │
│  ① 정형화  — [■] receipt line → standard code mapping table (real rows from snapshot)      │
│  ② 심사    — [■] FindingList of one claim with rule IDs + CitationChip                    │
│  ③ 연동    — [■] code block: POST /api/claims/adjudicate request/response (copy button)     │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ 보안·데이터 (2-col text): 합성 데이터로 시연 · 개인정보 비식별 · 온프레미스/API 선택 (only true claims) │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ CTA band (bg-subtle, not dark): "실제 청구 1,000–5,000건으로 파일럿을 제안합니다" [파일럿 문의]   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ footer: nuvovet · 펫보험 청구 데이터 레이어 · 문의 메일 · © 2026  (no "#" links)               │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Content hierarchy:** headline → live product crop → primary CTA → proof row → three capability sections → security → pilot CTA.

**Removed:**
- `ShaderHero.jsx`, `ShaderCanvas`, three.js and framer-motion;
- the 180 vh sticky hero;
- `FeatureSection` and all `features/*Illustration.jsx`;
- the dark CTA slab with the indigo glow;
- the old DUR footer copy ("수의약품 처방점검 시스템", "수의 전문가 전용…");
- the `href="#"` Terms and Privacy links (delete them; no legal pages exist).

**Replaces the illustrations:** live components imported from the console (`ClaimDetailPreview`, `LineItemTable`, `FindingList`), fed by `claimsDemoSnapshot.json`. The snapshot is lazy-loaded with `import()` *after* first paint; a `Skeleton` shows until then. They render non-interactively (`inert`) inside a `Card` titled "청구 심사 화면" with a caption.

**Numbers.** Only these, no others:
- **From `src/data/landingStats.json`:**
  - `aliases.total` = 848, captioned "국내 상품명·성분 별칭 (직접 정리 204 · 동물용의약품 허가 661, 중복 제외)";
  - `findings.with_rule_and_explanation` / `findings.total` = 426 / 426, shown as a fraction, not "100%";
  - the number 4 (rule families: 보장·임상·가격·무결성, which `rule_hits` prefixes confirm);
  - 0 auto-denials (an engine design fact; caption "판정은 심사역이 확정").
- **From the snapshot:** "합성 데이터 312건 기준" (`summary.claims`).
- **Never:** recall %, false-alarm %, or ₩ savings on the landing page. Those belong on the engine-performance page with their caveat.

**Copy rules:**
- Korean only on `/`; the i18n toggle is removed from the landing page.
- Headline at most 2 lines and 20 Hangul characters per line.
- No eyebrow labels; section titles are plain `text-3xl`.

**Links:**
- "콘솔 데모 열기" → `/insurance`.
- "파일럿 문의" → `mailto:` using the existing contact address in `src/i18n/ko.js`. If none exists, the button opens a `Dialog` with that same address in text; WP8 MUST NOT invent an address. If no address exists anywhere in the repo, the button is omitted.
- "DUR 데모" (nav, muted) → `/dur`.

**Mobile (390):**
- the hero stacks: headline, then the CTA, then the product crop scaled to fit;
- the stat row becomes a 2×2 grid;
- the capability sections become single-column, text first.

### 5.2 `/start`

Delete `src/pages/Start.jsx`. `/start` and `/academy` redirect to `/`. The landing nav gives access to `/insurance`, `/clinic/claim` and `/dur`; the console's sidebar footer links to the clinic tool.

### 5.3 Insurer console `/insurance/*`

**Routes** (nested `<Routes>` in `Insurance.jsx`; all deep-linkable):

| URL | Screen |
|---|---|
| `/insurance` | 개요 (overview) |
| `/insurance/claims?view=open\|pend\|review\|deny\|auto\|all&q=&sort=` | 청구 심사 queue |
| `/insurance/claims/:claimId` | claim detail |
| `/insurance/clinics?sort=` and `/insurance/clinics/:clinicId` | 병원 리스크 |
| `/insurance/fees?q=` | 진료비 벤치마크 |
| `/insurance/evaluation` | 엔진 성능 |
| `/insurance/api` | API 연동 |

The old in-component tab state goes away.

**App shell:**

```
┌────────────┬─────────────────────────────────────────────────────────────────────────────┐
│ nuvovet    │ 청구 심사 / SYN-2026-00220        [⌘K 검색…]      [합성 데이터] [◐] [김 심사역 ▾] │ 48px top bar
│ 청구 심사    ├─────────────────────────────────────────────────────────────────────────────┤
│            │                                                                             │
│ 개요        │  page content (24px padding, full width)                                     │
│ 청구 심사  33│                                                                             │
│ 병원 리스크   │                                                                             │
│ 진료비 벤치마크│                                                                             │
│ 엔진 성능     │                                                                             │
│ ─ 연동 ─     │                                                                             │
│ API 연동     │                                                                             │
│            │                                                                             │
│ ─────────  │                                                                             │
│ 병원용 사전 점검↗│                                                                             │
│ [«] collapse │                                                                             │
└────────────┴─────────────────────────────────────────────────────────────────────────────┘
 240px (56px collapsed: icons + tooltips; state in localStorage 'nv-sidebar')
```

**Top bar:**
- breadcrumb;
- the ⌘K trigger, shown as a fake input with a `Kbd`;
- the `EnvironmentMarker` "합성 데이터";
- the theme toggle;
- a user menu. The demo user "김 심사역 (가상)" is a static label and the menu holds only theme and language.
- The tagline "펫보험 청구 정형화 · 임상 심사 엔진" is removed.

**Sidebar count:** the 청구 심사 nav item shows the open-claims count as a counter bubble (`rounded-full`, allowed).

**Mobile (< 1024):**
- the sidebar becomes a `Sheet` opened from a menu button in the top bar;
- tables become stacked list rows;
- the claim detail is a full-screen route (not below the queue).

**개요 (overview):**

```
[PageHeader: 개요 · 기간 2026-04-03 – 2026-09-30 (from data) · 채널 Select]
[StatCard ×4: 청구 건수 312 | 청구액 ₩1.57억 | 검토 대상 금액 ₩1,841만 (summary.amount_flagged) | 자동 승인율 56.7%]
[Chart card (2/3): 월별 청구액 — 자동 승인 vs 검토 대상 (stacked bars, by visit_date month; recharts lazy)] [판정 퍼널 (1/3): 4 rows DecisionBadge + count + link to /insurance/claims?view=…]
[Card: 주요 소견 규칙 Top 8 (BarList, absolute counts with axis "건")] [Card: 서류 요청 사유 (BarList)] [Card: SIU 신호 (BarList)]
```

- **Rules for the numbers:**
  - every number is computed from `summary`/`claims`;
  - no period-over-period deltas (the data has no prior period);
  - no sparklines unless they are computed from `visit_date`.
- **Bar list:** `coverage.line_ineligible` (128) is shown with its Korean label; bars use absolute scaling with the count printed.

**청구 심사 queue:**

```
[PageHeader: 청구 심사]  [Tabs (saved views with counts): 처리 대상 135 | 서류 요청 33 | 심사 필요 55 | 거절 권고 47 | 자동 승인 177 | 전체 312]
[Toolbar: 검색(청구ID·병원·진단) | 보험사 Select | 채널 Select | 밀도 toggle]
[DataTable compact 32px: 청구 ID(mono) | 접수일 | 병원 | 종 | 진단명 | 청구액(원, num) | 판정(DecisionBadge) | 주요 사유 | 소견 수 | SIU]
[Pagination: 50 per page, "1–50 / 135"]
```

- **Rows:** each row links to `/insurance/claims/:id`. `j`/`k` and `Enter` work.
- **At ≥ 1440:** the detail opens as a right `Sheet` (720 px) over the queue, and the URL still changes. **Below 1440:** it opens as a full page.

**Claim detail:**

```
[Breadcrumb] SYN-2026-00220  [DecisionBadge 심사 필요]  ₩7,383,700 청구 · ₩5,000,000 지급 예정
샘플동물병원 32 · 서울 · 개 · 위장관 이물 · 진료일 2026-09-17 · 접수 insurer_app→"보험사 앱"
[Tabs: 소견 8 | 진료 항목 | 지급 계산 | 이력]
 소견: FindingList — each row: FindingSeverity · title · rule id (mono) · 금액 영향 (num) · CitationChip/benchmark · [근거 보기 ▸]
 진료 항목: DataTable (청구 원문 | 표준 코드(mono) 표준명 | 수량 | 금액 | 지역 분위 RangeGlyph | 지급 판정); flagged rows tinted --sev-moderate-bg ONLY
 지급 계산: DescriptionList
 이력: activity log (local)
[Sticky action bar (bottom, z-sticky): [승인] [서류 요청 ▾] [SIU 이관] [메모]  — 판정 변경 시 사유 Select 필수]
```

- **Adjudication actions** are client-side only. They are stored in `localStorage['nv-claim-actions']` inside try/catch, with an activity log entry. The bar carries the tooltip "데모: 이 브라우저에만 저장됩니다". The backend API is unchanged.
- **Answer-key labels** (`claim.labels`) are not shown here.
- **Enums** map to Korean:
  - channels: `owner_upload` → 보호자 업로드, `insurer_app` → 보험사 앱, `fax_email` → 팩스·이메일, `emr_autoclaim` → EMR 자동 청구, `live_counter` → 원내 접수;
  - drug classes: Korean names.
- **Number precision:**
  - doses are rounded to 3 significant figures (fixes `13.243`);
  - English diagnoses show the Korean name first, with the English as a secondary muted line, only when the source has both.

**병원 리스크:**
- **Table** of clinics: `clinic_id` (mono), name, region, claims, billed, flagged, SIU, at-risk ₩, and 검토 대상 비중 as a ProgressBar on a 0–100 % scale.
- **Small samples:** when `claims < 10`, show a "표본 적음" badge.
- **Navigation:** sortable headers; a row links to `/insurance/clinics/:clinicId`.
- **Clinic detail page:** KPI row, that clinic's claims as a DataTable, and the region peer median from `summary.clinics`.

**진료비 벤치마크:**
- **Toolbar:** one price-check input at the top (`MoneyInput` + procedure Combobox).
- **Table:** only benchmarked items, with a P10–P50–P90 range glyph and Korean units (`/visit` → 회, `/day` → 일, `/test` → 건).
- **Disclosure:** "벤치마크 없는 항목 61개" collapsed at the bottom.

**엔진 성능:**
- **One `Alert`** at the top: "합성 데이터로 생성한 정답 라벨 기준입니다. 실제 청구 성능을 뜻하지 않습니다."
- **Confusion matrix** (decisions × labels), then per-anomaly recall with **n** shown next to each bar, then a false-alarm rate with n.
- **Labels** are only visible here.
- **Not shown:** the full-width 100 % bar wall and the claim "13/14 at 100%" without n.

**API 연동:**
- **Layout:** Stripe-docs two-column. Left: endpoint, method `Badge mono`, description and parameters table. Right: code panel with tabs (curl / Python / Node) and a copy button.
- **Content:**
  - real example request and response bodies, taken from the snapshot shapes;
  - base URL shown as `https://api.example.com` (placeholder, not the onrender host);
  - "설계 원칙" becomes a 5-item list of at most 1 line each.

**Copy:** Korean-first. Console strings live in `src/pages/insurance/strings.ko.js`; English is not required in the console this phase.

### 5.4 Clinic pre-check `/clinic/claim`

**Audience:** clinic front-desk staff. **Goal:** "보험 청구 전에 서류·항목 누락을 확인합니다."

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ nuvovet 병원용 청구 사전 점검                      [합성 데이터] [◐]                      │ 48px header (no DUR button)
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Stepper: ① 영수증  ② 항목 확인  ③ 결과        (aria-current step; numbers are real steps)  │
│                                                                                     │
│ ① [Dropzone: 영수증 사진을 끌어오거나 선택하세요 (JPG·PNG)]   또는 [직접 입력]  [예시 불러오기 ▾] │
│                                                                                     │
│ ② Card "환자·보험" (Field grid 2-col): 보험사 Select | 동물 이름 | 종 | 품종 | 진료일 | 진단명      │
│    Card "진료 항목" DataTable-editable (44px rows): 항목명 | 수량 | 단가(원) | 금액(원) | [삭제]    │
│    Card "처방" DataTable-editable: 약품명(Combobox) | 용량 mg/kg | 1일 횟수 | 일수 | 단가 | 수량    │
│    [Checkbox] 보호자 동의를 받았습니다 (상세: Tooltip/Dialog "동의 내용 보기")                  │
│    [사전 점검 실행] (primary)                                                            │
│                                                                                     │
│ ③ Result (single column, max 960):                                                  │
│    Summary row: [DecisionBadge-like readiness: 청구 준비 완료 / 보완 필요 N건]  예상 지급액 ₩…  │
│    Checklist: 필요 서류 (✓/필요) · 누락 항목 · 소견 (FindingSeverity rows) — or EmptyState     │
│    [보완 후 다시 점검]  [결과 인쇄]                                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Removed:**
- the three value-prop cards;
- the "교육용 DUR 프로토타입" button;
- the long consent sentence (moved to the dialog);
- the `.nuvo-insurance { height: 100vh }` bug (the whole file goes away);
- leaked enums (`antiemetic`, `gi_protectant` become Korean class names).

**Formatting:**
- amounts use `MoneyInput` and `Money` (`₩10,000`);
- the date shows its Korean format echo;
- every input has a `<Label>`. In table-like grids the column header is the visible label and each input carries `aria-label` = column + row number.

**Mobile:**
- grids become stacked cards, one per line item, each with labelled fields;
- the result summary is sticky at the top.

**API:** calls stay `precheckClaim` / `extractReceipt` with unchanged payloads.

### 5.5 Portfolio showcase `/dur` (and standalone)

**Header (56 px):**
- the `Logo` "nuvovet DUR 데모";
- nav: 사례 연구 · 사례 · **EMR 데모** · 작동 방식;
- right side: `EnvironmentMarker` "교육용 프로토타입", LangToggle (ToggleGroup EN/KO), ThemeToggle.

The subtitle line under the logo is removed: the disclaimer now lives only in the marker, its tooltip, the footer (one line) and print pages (required by showcase spec §0.7).

**`#/` 사례 연구:**

```
H1 (text-3xl): 동물 처방 안전 검토 엔진 — 사례 연구         (one em dash allowed here; nowhere else on page)
lead (text-lg, 2 lines): what it is, my role, status (prototype; company pivoted to claims)
[EMR 데모 열기 (primary)]  사례 5개 보기 (link)
[■] Live DUR panel crop: the EMR widget rendered for V1 초코 (same component as #/emr, inert), caption "실제 엔진 출력"
2-col: 문제 (3 short paragraphs) | 만든 것 (5 bullets)
2-col: 설계 원칙 (규칙 17개 · 근거 출처 · 결정적 엔진) with numbers read from RULE_LAYERS/SOURCES, no narration of how they were read
Footer
```

- **Removed:**
  - three icon-tile feature cards;
  - "Live — computed in your browser now";
  - "Honest status";
  - "Not a screenshot";
  - repeated disclaimers.

**`#/cases`:**
- a 2-column grid of compact `Card`s;
- each card: species glyph, name + signalment (one line), the clinical question (one line), med `Badge`s and a SeverityBadge of the expected verdict;
- each card links to the workbench, with a secondary "EMR에서 보기" link to `#/emr/<visitId>` (popup spec §7);
- the "Blank case" card becomes a dashed-free `Button variant=outline` "빈 사례로 시작".
- The "Engine should catch" text moves to the workbench brief (collapsed).

**`#/case/:id` workbench:**
- **Columns:** Patient 300 | Findings flex | (no third column).
- **The Dose check column merges into the Rx editor rows.** Each med row shows its per-dose / per-day, plan, RangeBar and StatusText once. This fixes the dose shown twice (audit §3.5).
- **Verdict:**
  - one tinted surface (`--sev-*-bg`) for the verdict summary only, with non-zero counts only;
  - the dose-problem count is renamed and redefined as **"투여량 확인 N건"**: it counts rows whose status is above/below/unit_mismatch **or** that carry a rounding note. This fixes "0 dose problems" next to "Check amount" (audit §6.1).
- **Finding cards:** neutral `Card` with a `SeverityBadge` in the title row; no red border. Contraindicated/major are expanded; others are one line.
- **Organ matrix:** collapsed behind a `Disclosure` "장기별 위험 보기" (keeps its table view).
- **Brief:** "CLINICAL QUESTION / ENGINE SHOULD CATCH" becomes a collapsed `Disclosure` "이 사례의 질문", without the caps.

**`#/case/:id/report`, `#/case/:id/handout`:**
- **Keep** the document design.
- **Restyle:** tokens and fonts.
- **Fix:** handout near-duplicate signs. `handoutModel.dedupe()` drops a sign whose normalised text is contained in another sign for the same drug ("구토" ⊂ "구토 또는 식욕 부진"), and emergency signs are not repeated under "Watch for". Add a test.

**`#/how-it-works`:**
- **Keep:** the pipeline SVG, the rule table and the live golden table.
- **Cut** engineering prose to at most 120 words per section.
- **Add:** a "EMR 연동 방식" section linking to `#/emr` (popup spec §7).

**`#/emr` and `#/emr/:visitId`:** see the popup spec. The page chrome is a 40 px demo bar instead of the portfolio header.

**Korean copy pass** (`pages.ko.js`, `ui.ko.js`):
- rewrite translated-sounding strings in native Korean (formal 하십시오체 for clinical actions, 해요체 is not used);
- fix particles with `lib/particle.js` (`나비로 돌아가기`);
- remove "정직한";
- remove the unverified sentence "국내 동물병원 EMR에는 처방 안전 검토 기능이 없습니다" from `pages.ko.js` and `pages.en.js` (EMR track §1: no source either way).

**Styling migration.** `styles/portfolio.css` (2,160 lines) and `pages.css` are replaced by Tailwind utilities + `src/ui`. Keep only:
- print CSS (`@page A4`, report/handout layout), moved to `styles/print.css`;
- the organ-matrix glyph CSS.

The `pf-*` token block is deleted; `--pf-*` references become `src/ui` tokens.

**English is still the default for `/dur`** (showcase spec §0.6). The EMR demo defaults to Korean (popup spec §2.5).

### 5.6 EMR demo (`/dur#/emr`)

Specified in full in `docs/portfolio/EMR_DUR_POPUP_SPEC.md`. In design-system terms:
- **The fictional EMR host does NOT use NuvoVet tokens or `src/ui`.** It has its own deliberately generic desktop-EMR look:
  - grey frames `#E9ECEF`;
  - 12–13 px system font stack `"Malgun Gothic", "Apple SD Gothic Neo", sans-serif`;
  - square 2 px corners;
  - blue-grey tab strips.
  This makes the NuvoVet overlay read as a separate product.
- **The overlay uses the NuvoVet tokens** (light/dark) through `tokens.css?inline` inside its shadow root.

---

## 6. Copy rules

### 6.1 General
- Korean-first on `/`, `/insurance`, `/clinic/claim` and `#/emr`. English is the default on `/dur` pages other than `#/emr`, with complete Korean.
- **Buttons** are verb + object: "청구 승인", "서류 요청", "보호자 안내문 인쇄", "처방으로 돌아가기". Never "확인" alone when a more specific verb exists; never "Get started".
- **Numbers:** numerals for counts; a space before units (`10 mg`, `24.0 kg`, `₩` has no space); `·` only as a separator inside metadata lines that encode real fields.
- **Error messages** say how to fix the problem: "API에 연결할 수 없습니다. 백엔드(:8000)가 실행 중인지 확인하세요."
- **Ellipsis:** use `…`, never three dots.
- **Em dashes:** at most one per screen.
- **Forbidden words:** "안전" in DUR results; "정직"/"honest"; "AI" as an adjective; marketing filler (§1.2 W1).

### 6.2 Korean register
- **Clinical instructions** (DUR cards, engine strings): formal `~하십시오`, as authored in the engine.
- **UI chrome and the console:** plain polite `~합니다 / ~하세요`, consistent per surface. Console: `~하세요`; clinic: `~하세요`; marketing: `~합니다`.

### 6.3 Particles

`src/ui/lib/particle.js`:
- **API:** `withParticle(word, pair)` where `pair ∈ '은/는' | '이/가' | '을/를' | '과/와' | '으로/로'`.
- **Rule:** use the batchim of the last Hangul syllable. For `으로/로`, a final ㄹ takes 로.
- **Non-Hangul endings:** decide by the reading of the last digit or letter where known; otherwise fall back to the `(으)로` form.

### 6.4 Formatting (`src/ui/lib/format.js`)
- **`fmtWon(n)`** → `₩1,234,567`.
- **`fmtWonCompact(n)`:**
  - → `₩9,518만` when 1만 ≤ n < 1억 (1 decimal place max);
  - → `₩1.57억` when n ≥ 1억;
  - KPIs only.
- **`fmtDate('2026-09-17')`** → `2026-09-17` in tables and `2026년 9월 17일` in prose.
- **`fmtPct(0.5673)`** → `56.7%`.
- **`fmtDose(x)`** → 3 significant figures.

### 6.5 Page titles

`document.title` is set per route via a `useTitle` hook in `src/ui/patterns/useTitle.js`:

| Route | Title |
|---|---|
| `/` | `nuvovet — 펫보험 청구 데이터` |
| `/insurance` | `개요 · nuvovet 청구 심사` |
| `/insurance/claims` | `청구 심사 · nuvovet` |
| `/insurance/claims/:id` | `SYN-… · 청구 심사 · nuvovet` |
| `/clinic/claim` | `청구 사전 점검 · nuvovet` |
| `/dur` | `NuvoVet DUR — case study` (by sub-route) |
| `#/emr` | `EMR 데모 · NuvoVet DUR` |

The landing title is the one place a second em dash is allowed (the title is not on screen).

---

## 7. Constraints carried over (non-negotiable)

1. **Clean-room portfolio.** No text, number or structure from Plumb's or from `backend/data/converted/**` in `src/portfolio/**` (showcase spec §0.1). EMR fixtures are fictional.
2. **Standalone build keeps working.** `npm run build:portfolio` emits a single `dist-portfolio/index.html` that:
   - opens from `file://`;
   - carries the CSP plus `font-src data:`;
   - makes zero network requests.
   It may import shared UI from `src/ui` only.
3. **Backend API contracts are unchanged:** `/api/claims/demo`, `/api/claims/demo/:id`, `/api/claims/evaluation`, `/api/claims/insurers`, `/api/claims/adjudicate`, `/api/claims/precheck` and `/api/claims/extract`, with the same params and payloads. No backend file is edited in this phase.
4. **Tests keep passing:**
   - all existing Vitest suites (`cd frontend && npm test`, 249 tests at the time of writing);
   - all pytest suites (`cd backend && python -m pytest -q`).
   Tests may be updated only where this spec changes behaviour explicitly: the D1/D2 tolerance in the popup spec §5, and the handout dedupe. Every such update is listed in the PR description.
5. **No fabricated numbers on marketing pages.** Stats come from `src/data/landingStats.json` or are computed from `claimsDemoSnapshot.json` at runtime (§5.1).
6. **`/dur` and the standalone build make no external network requests.** Fonts are same-origin (main app) or inlined `data:` (standalone/widget).
7. **No commits of build output:** `dist/`, `dist-portfolio/` and `dist-widget/` stay in `.gitignore`. WP0 adds `dist-widget/` to the ignore file if it isn't there yet.

---

## 8. Build plan: work packages

Each WP owns its files. **A WP MUST NOT edit a file owned by another WP.** If it needs a change there, it records the request in its PR description, and the owner (or WP9) applies it. Shared contracts are frozen by WP0 at the end of its run.

### 8.1 Dependency graph

```
WP0 Foundation ──┬──> WP5 Portfolio /dur ──┐
 (blocking)      ├──> WP6 Insurer console ─┤
                 ├──> WP7 Clinic pre-check ┤
                 ├──> WP8 Landing ─────────┤──> WP9 QA & acceptance (last)
                 └──> WP3 DUR widget UI ───┤
WP1 Engine accuracy (parallel with WP0) ──> WP2 EMR adapter+SDK ──> WP3 ──> WP4 EMR host & route ┘
```

- WP1 and WP2 have no UI and can start immediately.
- WP3 needs WP0 (tokens.css) and WP2 (SDK).
- WP4 needs WP3.
- WP5 must merge the `#/emr` route registration (it owns `router.js`/`PortfolioApp.jsx`) before WP4 can be screenshot-tested. WP4 creates `src/portfolio/pages/EmrDemoPage.jsx` as a stub (a default export rendering `null`) in its first commit, so WP5's lazy import never breaks the build.
- WP8 imports console preview components from WP6 (`src/pages/insurance/preview/*`). WP6 delivers those first, with this frozen API: `ClaimDetailPreview({ claimId })`, `LineItemTable({ lines, flaggedOnly })` and `FindingList({ findings })`.

### 8.2 Work packages and owned files

**WP0: Foundation** (one agent, first, blocking)
- **Owns:**
  - `frontend/package.json`, `frontend/package-lock.json`, `frontend/components.json`, `frontend/jsconfig.json`;
  - `frontend/vite.config.js`, `frontend/vite.portfolio.config.js`, `frontend/vite.widget.config.js` (created as a skeleton; WP3 fills in plugins inside the marked block only);
  - deletes `frontend/postcss.config.js` and `frontend/tailwind.config.js`;
  - `frontend/index.html`, `frontend/portfolio.html`, `frontend/.gitignore`;
  - `frontend/scripts/vendor-shadcn.mjs`, `frontend/scripts/vite-plugin-subset-fonts.js`, `frontend/scripts/vite-plugin-font-subset-import.js`;
  - `frontend/src/index.css`, `frontend/src/main.jsx`, `frontend/src/App.jsx`;
  - `frontend/src/ui/**`;
  - deletes `frontend/src/components/NuvovetLogo.jsx` once nothing imports it (WP8 removes the landing import; until then WP0 leaves it).
- **Does:**
  - §2.1 install;
  - §2.3 migration;
  - §2.4 fonts;
  - §2.6 theme;
  - §3 tokens;
  - vendors and restyles all §4 primitives;
  - builds the §4 patterns (`SeverityBadge`, `DecisionBadge`, `FindingSeverity`, `StatusText`, `StatCard`, `DataTable`, `DescriptionList`, `Num`, `Money`, `MoneyInput`, `Field`, `Combobox`, `MultiCombobox`, `Tag`, `EmptyState`, `EnvironmentMarker`, `AppShell`, `CommandMenu`, `PageHeader`, `Breadcrumb`, `Dropzone`, `Logo`, `CitationChip`, `RangeBar`, `BarList`, `CategoryBar`, `ProgressBar`, `useTitle`);
  - `lib/format.js` and `lib/particle.js` with Vitest tests in `src/ui/lib/__tests__/`;
  - a hidden kitchen-sink route `/__ui` (dev only: `import.meta.env.DEV`) that renders every component in light and dark, for WP9 screenshots.
- **App.jsx final route table:**
  - `/` → Landing;
  - `/insurance/*` → Insurance;
  - `/clinic/claim` → ClinicClaim;
  - `/dur` → PortfolioApp;
  - `/start`, `/academy` → redirect to `/`;
  - `/demo`, `/system` → `/dur`;
  - `*` → `/`.

  Every page is `lazy()` with a `Suspense` skeleton, to fix the 1,040 kB entry chunk (audit §1).
- **npm scripts added:** `build:widget` (`vite build --config vite.widget.config.js`), `dev:widget` (`vite --config vite.widget.config.js`), and `qa` (`node scripts/qa/run.cjs`; the file is owned by WP9).
- **Acceptance:**
  - build, build:portfolio and test all pass;
  - `/__ui` renders with 0 console errors;
  - no request to `fonts.googleapis.com`, `cdn.jsdelivr.net` or `unpkg.com` from any route;
  - the contrast table in §3.2 is reproduced by a Vitest test `src/ui/__tests__/contrast.test.js`. It parses `tokens.css` and asserts each listed pair ≥ 4.5, or ≥ 3 for the non-text pairs.

**WP1: Engine accuracy** (parallel)
- **Owns:** `frontend/src/portfolio/engine/**` (including `__tests__`), `frontend/src/portfolio/cases/cases.js`.
- **Does:**
  - the popup spec §5 engine changes: BOUND_TOLERANCE, the count tolerance with its rounding note, and `ENGINE_VERSION`;
  - updates or adds tests.
- **Acceptance:**
  - all engine tests pass;
  - the five golden cases are unchanged;
  - the popup spec §8 table E01–E23 matches the "binding" column when run through WP2's adapter.

**WP2: EMR adapter + SDK (logic)**
- **Owns:** `frontend/src/portfolio/emr/*.js` and `frontend/src/portfolio/emr/__tests__/**`.
- **Does:** popup spec §3.2–§3.3 (SDK API and payloads, without UI), §4 (mapping), §5.2 (adapter-side defects) and the logic tests of §8.

**WP3: DUR widget UI**
- **Owns:**
  - `frontend/src/portfolio/emr/widget/**`;
  - the plugin block of `frontend/vite.widget.config.js`;
  - `frontend/widget-demo/**` (static hostile-host and plain-HTML EMR pages).
- **Does:** popup spec §3 and §6 (the overlay, cards, gate, acknowledgement log and widget build).

**WP4: Fictional EMR host + demo route**
- **Owns:** `frontend/src/portfolio/emr/host/**`, `frontend/src/portfolio/pages/EmrDemoPage.jsx`.
- **Does:** popup spec §2 (fictional EMR screens and grid behaviour) and §7 (routes and links).

**WP5: Portfolio `/dur` redesign**
- **Owns:**
  - `frontend/src/portfolio/PortfolioApp.jsx`, `router.js`, `standalone.jsx`;
  - `components/**` (except `emr/`);
  - `pages/**` (except `EmrDemoPage.jsx`);
  - `styles/**`, `i18n/**`, `knowledge/**` (copy-only edits; clinical facts unchanged).
- **Does:**
  - §5.5;
  - registers routes `emr` and `emr/:visitId` in `router.js` (`matchRoute`: `seg[0]==='emr'` → name `'emr'`, `params.visitId = seg[1] || null`);
  - adds the CaseStudy and Cases links (popup spec §7).

**WP6: Insurer console**
- **Owns:**
  - `frontend/src/pages/Insurance.jsx`;
  - `frontend/src/pages/insurance/**` (except `claimForm.jsx`);
  - new `frontend/src/pages/insurance/preview/**`.
- **Does:**
  - §5.3;
  - deletes `insurance.css`, `ui.jsx` and `icons.jsx` once unused;
  - keeps `claimsApi.js` request shapes byte-identical.

**WP7: Clinic pre-check**
- **Owns:** `frontend/src/pages/ClinicClaim.jsx` and `frontend/src/pages/insurance/claimForm.jsx`.
- **Does:**
  - §5.4;
  - keeps `claimForm.jsx`'s exports (`ClaimForm`, `PRESETS`, `emptyForm`, `fromDraft`, `toClaim`, `today`) and their data shapes stable, because WP6 imports them.

**WP8: Landing**
- **Owns:**
  - `frontend/src/pages/Landing.jsx` and `frontend/src/pages/landing/**`;
  - deletes `frontend/src/pages/Start.jsx`;
  - `frontend/src/i18n/**`.
- **Does:** §5.1 and §5.2.

**WP9: QA and acceptance** (last; may make one-line fixes in any file, and must list each)
- **Owns:** `frontend/scripts/qa/**`.
- **Does:** §9.

### 8.3 Order within a day of agents
1. WP0 + WP1 + WP2 in parallel.
2. When WP0 lands: WP3, WP5, WP6, WP7 in parallel.
3. When WP6's previews land: WP8.
4. When WP3 lands: WP4.
5. Then WP9.

---

## 9. Acceptance criteria (all must pass before merge)

### 9.1 Commands
```bash
cd frontend && npm ci && npm test && npm run build && npm run build:portfolio && npm run build:widget
cd ../backend && python -m pytest -q
cd ../frontend && npm run qa      # WP9 script; exits non-zero on any failure below
```

### 9.2 Screenshots

`scripts/qa/shots.cjs` uses the global Playwright: `require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright')`.

**Matrix:** viewports 1440×900, 1024×768 and 390×844; themes light and dark (set via `localStorage['nv-theme']` before load).

**Routes:**
- `/`
- `/insurance`
- `/insurance/claims`
- `/insurance/claims/SYN-2026-00220`
- `/insurance/clinics`
- `/insurance/fees`
- `/insurance/evaluation`
- `/insurance/api`
- `/clinic/claim` (empty and result states)
- `/dur#/`
- `/dur#/cases`
- `/dur#/case/choco`
- `/dur#/case/nabi`
- `/dur#/case/choco/report`
- `/dur#/case/nabi/handout`
- `/dur#/how-it-works`
- `/dur#/emr/V1` (panel open; gate dialog open after clicking 처방 저장)
- `/dur#/emr/V5`
- `dist-portfolio/index.html#/emr/V7` (file://)
- `dist-widget` hostile host

Output goes to `frontend/qa-shots/` (gitignored).

**Automated checks per screenshot:**
- **No horizontal scroll:** `document.documentElement.scrollWidth <= innerWidth`.
- **No clipped text:** no element with `scrollWidth > clientWidth + 1` and `overflow: hidden` that contains text, except elements marked `data-truncate`.
- **Minimum size:** no text under 12 px (`getComputedStyle(el).fontSize`).
- **Fonts:** the font of `body` resolves to Pretendard (`document.fonts.check('14px "Pretendard Variable"')`), except in the EMR host frame.
- **Korean wrapping:** every element whose text contains Hangul has computed `word-break: keep-all`.

**Review:** a human or agent also looks at the 1440-light and 390-dark shots of every route against §5 and §1.2.

### 9.3 Runtime
- **Zero console errors and warnings** on every route above (`page.on('console')`, `pageerror`).
- **No external requests:**
  - for `/dur*`, the standalone file and the widget hostile host, record every request; anything not `localhost:5173`, `file://` or `data:` fails;
  - for the main app, any request to a host other than `localhost` fails. API calls go to `localhost:8000` via the dev proxy; the QA script sets `VITE_API_BASE_URL=http://localhost:8000` or routes them there.
- **Bundle budgets** (gzip):

  | Bundle | Budget |
  |---|---|
  | main entry chunk | ≤ 180 kB |
  | `/insurance` route chunks, excluding recharts | ≤ 160 kB |
  | recharts | lazy, own chunk |
  | standalone `dist-portfolio/index.html` | ≤ 450 kB |
  | widget IIFE | ≤ 250 kB |

### 9.4 Static checks (`scripts/qa/lint-design.cjs`)

Run over `src/**` excluding `src/portfolio/emr/host/**`. Fail on any of:
- `/\b(indigo|violet|purple|teal|emerald)-\d{2,3}\b/`
- `/#(6366f1|0f766e|134e4a|10b981)\b/i`
- `bg-clip-text`, `linear-gradient(`, `radial-gradient(` (allowed only in `src/ui/primitives/skeleton.jsx`)
- `rounded-(2xl|3xl|\[)`
- `/\buppercase\b/` together with `/tracking-/` on the same line
- `shadow-(sm|md|lg|xl|2xl)\b`
- `backdrop-blur`
- `text-\[\d` (arbitrary font sizes)
- `transition: all` / `transition-all`
- `fonts.googleapis`, `jsdelivr`, `unpkg`
- `DM Sans`, `"Inter"`, `JetBrains`
- `onClick={() => navigate(`
- `<div onClick`, `<tr onClick`

Also fail on these words in UI strings (`i18n/**`, `strings.ko.js`, JSX text): `정직`, `honest`, `seamless`, `혁신적`.

### 9.5 Accessibility (axe-like checks without new deps, `scripts/qa/a11y.cjs`)

On every route, at 1440 light and 390 dark:
- exactly one `<main>` and one `<h1>`;
- `<html lang>` matches the page language (`ko` on Korean surfaces);
- every `input`/`select`/`textarea` has an accessible name;
- every icon-only button has an `aria-label`;
- the nav current item has `aria-current="page"`;
- tabs use `role=tablist` / `tab` / `aria-selected`;
- sortable headers have `aria-sort`;
- tabbing through the page reaches every interactive element, with a visible focus ring (outline width ≥ 2 px computed on `:focus-visible`);
- dialogs trap focus and Esc closes them;
- the contrast of the computed text colour vs. the background of each text node is ≥ 4.5 (≥ 3 for text ≥ 24 px). Sampled: every 10th text node plus all badges.
- The EMR popup has its own a11y checks in the popup spec §8.4.

### 9.6 Definition of done for each WP
- Owned files only, plus a list of requested cross-WP edits.
- Its slice of §9.2–§9.5 passes for its routes.
- No TODOs left in shipped code.
- The PR description lists:
  - removed files;
  - changed tests and why;
  - screenshots (1440 light + 390 dark) of its routes.
