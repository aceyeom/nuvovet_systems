// Restyle vendored shadcn/ui files to the NuvoVet tokens (DESIGN_SYSTEM.md §4.1).
//
//   node scripts/vendor-shadcn.mjs <names…>   # vendors into src/ui/primitives
//   node scripts/restyle-shadcn.mjs           # run after every vendoring; idempotent
//
// Vendored files are changed only by this script, so re-vendoring gives the same result.
// Two passes per file:
//   1. file-specific edits (component structure, variant tables) written against the upstream source;
//      each is a no-op when its upstream text is absent, so a second run changes nothing;
//   2. a token pass over every string literal that applies the §4.1 find/replace table.
// Exit code 1 if the §4.1 acceptance grep still finds anything.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const PRIM = path.join(ROOT, 'src/ui/primitives')
const HOOKS = path.join(ROOT, 'src/ui/hooks')

const POP_FILES = new Set(['popover', 'select', 'dropdown-menu', 'tooltip', 'hover-card', 'command', 'chart'])
const MODAL_FILES = new Set(['dialog', 'alert-dialog', 'sheet', 'drawer'])
const FORM_FILES = new Set(['input', 'textarea', 'select', 'input-group'])

// §3.3 type scale, for text-[Npx] → nearest key.
const TYPE = { xs: 12, sm: 13, base: 14, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '5xl': 48, '6xl': 64 }
const nearestText = (px) => Object.entries(TYPE).reduce((a, b) => (Math.abs(b[1] - px) < Math.abs(a[1] - px) ? b : a))[0]

/** Split "a:b:[x:y]:c" on top-level colons. */
function splitVariants(tok) {
  const parts = []
  let depth = 0, cur = ''
  for (const ch of tok) {
    if (ch === '[' || ch === '(') depth++
    if (ch === ']' || ch === ')') depth--
    if (ch === ':' && depth === 0) { parts.push(cur); cur = '' } else cur += ch
  }
  parts.push(cur)
  return { variants: parts.slice(0, -1), util: parts[parts.length - 1] }
}

const FOCUSY = (v) => v === 'focus' || v === 'focus-visible'

/** Map one class token to zero or more tokens. */
function mapToken(tok, file) {
  const { variants, util: rawUtil } = splitVariants(tok)
  const bang = rawUtil.endsWith('!') ? '!' : ''
  const util = bang ? rawUtil.slice(0, -1) : rawUtil
  const pre = variants.length ? variants.join(':') + ':' : ''
  const out = (u) => pre + u + bang
  const allFocusy = variants.every(FOCUSY)
  const hasFocus = variants.some(FOCUSY)

  // dark: colour overrides — tokens flip on their own.
  if (variants.includes('dark')) return []
  // md:/2xl: do not exist; the app's mobile breakpoint is lg (1024).
  if (variants.includes('md') || variants.includes('2xl')) {
    return mapToken(variants.map((v) => (v === 'md' || v === '2xl' ? 'lg' : v)).join(':') + ':' + rawUtil, file)
  }

  // Focus: delete shadcn's 50 % ring; the §3.9 global outline applies.
  if ((util === 'outline-none' || util === 'outline-hidden') && allFocusy) return []
  if (util === 'outline-hidden') return [out('outline-none')]
  if (hasFocus && /^(ring-\[3px\]|ring-ring\/50|ring-ring|ring-2|ring-0|ring-1|outline-1|outline-ring|ring-offset-\d)$/.test(util)) return []
  if (hasFocus && /^ring-destructive/.test(util)) return []
  if (/^ring-offset-/.test(util)) return []
  if (util === 'border-ring' && hasFocus) return FORM_FILES.has(file) ? [tok] : []

  // Invalid state.
  if (variants.some((v) => v.startsWith('aria-invalid') || v.includes('aria-invalid=true')) && /^ring-/.test(util)) return []
  if (/^border-destructive(\/\d+)?$/.test(util)) return [out('border-sev-critical')]

  // Heights (§3.4): 32 px default, 40 px on coarse pointers.
  if (util === 'h-9') return [out('h-8'), pre + 'touch:h-10' + bang]
  if (util === 'size-9') return [out('size-8'), pre + 'touch:size-10' + bang]
  if (util === 'min-w-9') return [out('min-w-8')]

  // `shadow-none` still computes a (transparent) box-shadow list in Tailwind 4, which the §9.7 shadow
  // budget counts; nothing in flow has a shadow to cancel, so drop it.
  if (util === 'shadow-none') return []

  // Shadows: none in flow; pop / modal on floating layers.
  if (/^shadow(-(xs|sm|md|lg|xl|2xl))?$/.test(util) || /^shadow-\[/.test(util)) {
    const big = /^shadow-(md|lg|xl|2xl)$/.test(util)
    if (big && !variants.length && POP_FILES.has(file)) return [out('shadow-pop')]
    if (big && !variants.length && MODAL_FILES.has(file)) return [out('shadow-modal')]
    return []
  }

  // Transitions: list properties, never `all`; no box-shadow.
  if (util === 'transition-all' || util === 'transition') return [out('transition-[color,background-color,border-color,opacity]')]
  if (util === 'transition-[color,box-shadow]') return [out('transition-[color,background-color,border-color]')]
  if (util === 'transition-shadow') return []

  // Radius (§3.5).
  if (util === 'rounded' || util === 'rounded-xs' || /^rounded-\[(calc\(var\(--radius\)-\d+px\)|2px|4px)\]$/.test(util)) return [out('rounded-sm')]
  if (util === 'rounded-[inherit]') return [out('[border-radius:inherit]')]

  // Motion (§3.7): 0.98 zoom, ≤ 16 px slides, transforms only when motion is allowed.
  let m = util
  if (m === 'zoom-in-95') m = 'zoom-in-[0.98]'
  if (m === 'zoom-out-95') m = 'zoom-out-[0.98]'
  if (/^slide-(in-from|out-to)-(top|bottom|left|right)$/.test(m)) m += '-4'
  if (/^(zoom-(in|out)-|slide-(in-from|out-to)-)/.test(m)) {
    return [(variants.includes('motion-safe') ? pre : 'motion-safe:' + pre) + m + bang]
  }
  if (util === 'animate-spin' && !variants.includes('motion-safe')) return ['motion-safe:' + pre + 'animate-spin' + bang]
  if (util === 'duration-500') return [out('duration-250')]
  if (util === 'duration-300') return [out('duration-200')]

  // Colours: wiped palette → tokens.
  if (util === 'bg-black/50' || util === 'bg-black/80') return [out('bg-backdrop')]
  if (util === 'text-white') return [out('text-on-solid')]
  if (/^bg-destructive\/(10|20)$/.test(util)) return [out('bg-sev-critical-bg')]
  if (util === 'bg-destructive') return [out('bg-sev-critical-solid')]
  if (/^bg-destructive\/\d+$/.test(util)) return [out(util.replace('bg-destructive', 'bg-sev-critical-solid'))]
  if (/^text-destructive(\/\d+)?$/.test(util)) return [out('text-sev-critical')]
  if (/^(fill|stroke)-destructive$/.test(util)) return [out(util.replace('destructive', 'sev-critical'))]
  if (util === 'selection:bg-primary' || variants.includes('selection')) return []

  // Arbitrary px/rem values the design lint would flag, where a scale value is equivalent.
  if (util === 'translate-y-[2px]') return [out('translate-y-0.5')]
  if (util === 'border-[1.5px]') return [out('border')]
  if (util === 'min-w-[8rem]') return [out('min-w-32')]

  // Typography (§1.2 T2, T3).
  if (util === 'uppercase' || /^tracking-(wide|wider|widest|tight|tighter)$/.test(util)) return []
  const tx = util.match(/^text-\[(\d+(?:\.\d+)?)(px|rem)\]$/)
  if (tx) return [out('text-' + nearestText(tx[2] === 'rem' ? Number(tx[1]) * 16 : Number(tx[1])))]

  return [tok]
}

function restyleClasses(str, file) {
  if (!/[a-z]-|^[a-z]+$/.test(str)) return str
  const lead = str.match(/^\s*/)[0], trail = str.match(/\s*$/)[0]
  const toks = str.trim().split(/\s+/)
  if (!toks[0]) return str
  const out = []
  let touched = false
  for (const t of toks) {
    const mapped = mapToken(t, file)
    if (mapped.length !== 1 || mapped[0] !== t) touched = true
    for (const r of mapped) if (!(/[-:]/.test(r) && out.includes(r))) out.push(r)
  }
  return touched ? lead + out.join(' ') + trail : str
}

/** Apply restyleClasses to every "…" and `…` literal (no ${} interpolations in these files). */
function tokenPass(src, file) {
  return src
    .replace(/"([^"\n]*)"/g, (m, s) => (/^(use client|radix-ui|react|lucide-react|vaul|cmdk|sonner|recharts)$/.test(s) || s.startsWith('@/') || s.startsWith('./') ? m : `"${restyleClasses(s, file)}"`))
    .replace(/`([^`$]*)`/g, (m, s) => `\`${restyleClasses(s, file)}\``)
}

const rep = (s, from, to) => (s.includes(from) ? s.split(from).join(to) : s)

// Korean copy for the few strings the vendored files render (sr-only labels, defaults).
const COPY = [
  ['<span className="sr-only">Close</span>', '<span className="sr-only">닫기</span>'],
  ['<Button variant="outline">Close</Button>', '<Button variant="outline">닫기</Button>'],
  ['<span className="sr-only">More</span>', '<span className="sr-only">더 보기</span>'],
  ['<span className="sr-only">More pages</span>', '<span className="sr-only">페이지 더 보기</span>'],
  ['aria-label="pagination"', 'aria-label="페이지"'],
  ['aria-label="Go to previous page"', 'aria-label="이전 페이지"'],
  ['aria-label="Go to next page"', 'aria-label="다음 페이지"'],
  ['<span className="hidden sm:block">Previous</span>', '<span className="hidden sm:block">이전</span>'],
  ['<span className="hidden sm:block">Next</span>', '<span className="hidden sm:block">다음</span>'],
  ['title = "Command Palette",', 'title = "명령 검색",'],
  ['description = "Search for a command to run...",', 'description = "실행할 명령이나 이동할 화면을 검색하세요",'],
  ['<SheetTitle>Sidebar</SheetTitle>', '<SheetTitle>메뉴</SheetTitle>'],
  ['<SheetDescription>Displays the mobile sidebar.</SheetDescription>', '<SheetDescription>화면 이동 메뉴입니다.</SheetDescription>'],
  ['<span className="sr-only">Toggle Sidebar</span>', '<span className="sr-only">메뉴 열기·닫기</span>'],
  ['aria-label="Toggle Sidebar"', 'aria-label="메뉴 열기·닫기"'],
  ['title="Toggle Sidebar"', 'title="메뉴 열기·닫기"'],
  ['"var(--popover-foreground)"', '"var(--foreground)"'],
]

// ── File-specific edits (pass 1) ─────────────────────────────────────────────────────────────
const SPECIFIC = {
  button(s) {
    s = rep(s, '"inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all',
      '"inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-100')
    s = rep(s, 'default: "bg-primary text-primary-foreground hover:bg-primary/90"',
      'default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover"')
    s = rep(s, '"bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"',
      '"bg-sev-critical-solid text-on-solid hover:bg-sev-critical-solid/90 active:bg-sev-critical-solid/90"')
    s = rep(s, '"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"',
      '"border border-input bg-background text-foreground hover:bg-row-hover active:bg-row-pressed"')
    s = rep(s, '"bg-secondary text-secondary-foreground hover:bg-secondary/80"',
      '"border border-border bg-secondary text-secondary-foreground hover:bg-row-pressed active:bg-row-pressed"')
    s = rep(s, '"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"',
      '"text-foreground hover:bg-row-hover active:bg-row-pressed"')
    s = rep(s, 'link: "text-primary underline-offset-4 hover:underline"',
      'link: "h-auto px-0 text-brand underline-offset-4 hover:text-brand-hover hover:underline"')
    // Sizes (§3.4, §4.3): sm 28, default 32, lg 40, icon 32, icon-sm 28; 40 on touch.
    s = rep(s, 'default: "h-9 px-4 py-2 has-[>svg]:px-3"', 'default: "h-8 touch:h-10 px-3 has-[>svg]:px-2.5"')
    s = rep(s, 'xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5', 'xs: "h-6 touch:h-10 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5')
    s = rep(s, 'sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5"', 'sm: "h-7 touch:h-10 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2"')
    s = rep(s, 'lg: "h-10 rounded-md px-6 has-[>svg]:px-4"', 'lg: "h-10 rounded-md px-4 has-[>svg]:px-3"')
    s = rep(s, '"icon-xs": "size-6 rounded-md', '"icon-xs": "size-6 touch:size-10 rounded-md')
    s = rep(s, '"icon-sm": "size-8"', '"icon-sm": "size-7 touch:size-10"')
    // loading: spinner left of the label; the label stays.
    if (!s.includes('LoaderCircle')) {
      s = rep(s, 'import { Slot } from "radix-ui"', 'import { Slot } from "radix-ui"\nimport { LoaderCircle } from "lucide-react"')
      s = rep(s, '  asChild = false,\n  ...props\n}) {\n  const Comp = asChild ? Slot.Root : "button"\n',
        '  asChild = false,\n  loading = false,\n  disabled,\n  children,\n  ...props\n}) {\n  const Comp = asChild ? Slot.Root : "button"\n')
      s = rep(s, '      className={cn(buttonVariants({ variant, size, className }))}\n      {...props}\n    />',
        '      className={cn(buttonVariants({ variant, size, className }))}\n      disabled={disabled || loading}\n      aria-busy={loading || undefined}\n      {...props}\n    >\n      {asChild ? children : (\n        <>\n          {loading ? <LoaderCircle aria-hidden="true" strokeWidth={1.5} className="animate-spin" /> : null}\n          {children}\n        </>\n      )}\n    </Comp>')
    }
    return s
  },
  input(s) {
    s = rep(s, ' text-base shadow-xs', ' text-sm touch:text-lg shadow-xs')
    s = rep(s, ' md:text-sm', '')
    return s
  },
  textarea(s) {
    s = rep(s, ' text-base shadow-xs', ' text-sm touch:text-lg shadow-xs')
    s = rep(s, ' md:text-sm', '')
    return s
  },
  'input-group'(s) {
    s = rep(s, 'has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50',
      'has-[[data-slot=input-group-control]:focus-visible]:outline-2 has-[[data-slot=input-group-control]:focus-visible]:outline-offset-2 has-[[data-slot=input-group-control]:focus-visible]:outline-ring')
    s = rep(s, 'shadow-none focus-visible:ring-0', 'shadow-none focus-visible:outline-0')
    s = rep(s, 'has-[[data-slot][aria-invalid=true]]:ring-destructive/20 ', '')
    return s
  },
  tooltip(s) {
    s = rep(s, 'delayDuration = 0,', 'delayDuration = 400,')
    s = rep(s, 'rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background', 'max-w-[280px] rounded-md bg-primary px-2 py-1 text-xs text-balance text-primary-foreground shadow-pop')
    s = s.replace(/\n\s*<TooltipPrimitive\.Arrow[^>]*\/>/, '')
    return s
  },
  badge(s) {
    s = rep(s, 'overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium',
      'overflow-hidden rounded-sm border border-transparent h-5 px-1.5 text-xs leading-4 font-medium')
    s = s.replace(/variant: \{\n\s*default: "bg-primary[\s\S]*?\n {6}\},\n {4}\},\n {4}defaultVariants: \{\n {6}variant: "default",/,
      `variant: {
        neutral: "bg-muted text-foreground",
        outline: "border-border-strong bg-background text-text-2",
        id: "id border-border bg-subtle text-text-2",
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-sev-critical-solid text-on-solid",
      },
    },
    defaultVariants: {
      variant: "neutral",`)
    s = rep(s, '  variant = "default",\n  asChild', '  variant = "neutral",\n  asChild')
    return s
  },
  card(s) {
    s = rep(s, '"flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm"', '"flex flex-col gap-4 rounded-lg border bg-card py-4 text-card-foreground"')
    s = rep(s, 'gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6', 'gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-4')
    s = rep(s, 'cn("leading-none font-semibold", className)', 'cn("text-lg font-semibold", className)')
    s = rep(s, 'cn("px-6", className)', 'cn("px-4", className)')
    s = rep(s, '"flex items-center px-6 [.border-t]:pt-6"', '"flex items-center px-4 [.border-t]:pt-4"')
    return s
  },
  tabs(s) {
    // Variants: underline (default) and segmented (§4.4); active segmented item visible without a shadow.
    s = rep(s, 'rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9', 'rounded-md p-0.5 text-muted-foreground group-data-[orientation=horizontal]/tabs:h-8')
    s = rep(s, 'data-[variant=line]:rounded-none', 'data-[variant=underline]:rounded-none data-[variant=underline]:border-b data-[variant=underline]:p-0 data-[variant=underline]:gap-4')
    s = rep(s, '        default: "bg-muted",\n        line: "gap-1 bg-transparent",', '        underline: "bg-transparent",\n        segmented: "bg-muted",')
    s = rep(s, 'defaultVariants: {\n      variant: "default",', 'defaultVariants: {\n      variant: "underline",')
    s = rep(s, '  variant = "default",\n  ...props\n}) {\n  return (\n    <TabsPrimitive.List', '  variant = "underline",\n  ...props\n}) {\n  return (\n    <TabsPrimitive.List')
    s = rep(s, 'group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm', 'group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-background group-data-[variant=segmented]/tabs-list:data-[state=active]:ring-1 group-data-[variant=segmented]/tabs-list:data-[state=active]:ring-border-strong group-data-[variant=segmented]/tabs-list:rounded-sm group-data-[variant=underline]/tabs-list:px-0 group-data-[variant=underline]/tabs-list:flex-none')
    s = s.split('group-data-[variant=line]').join('group-data-[variant=underline]')
    s = rep(s, 'text-foreground/60 transition-all', 'text-muted-foreground transition-all')
    s = rep(s, 'after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5', 'after:bottom-[-1px] group-data-[orientation=horizontal]/tabs:after:h-0.5')
    return s
  },
  toggle(s) {
    s = rep(s, 'hover:bg-muted hover:text-muted-foreground', 'text-muted-foreground hover:bg-row-hover hover:text-foreground')
    s = rep(s, 'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground', 'data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:ring-1 data-[state=on]:ring-border-strong')
    s = rep(s, 'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground', 'border border-input bg-transparent hover:bg-row-hover')
    s = rep(s, 'default: "h-9 min-w-9 px-2"', 'default: "h-8 touch:h-10 min-w-8 px-2.5"')
    s = rep(s, 'sm: "h-8 min-w-8 px-1.5"', 'sm: "h-7 touch:h-10 min-w-7 px-2"')
    return s
  },
  'toggle-group'(s) {
    s = rep(s, '  variant,\n  size,\n  spacing = 0,\n  children,', '  variant = "default",\n  size = "default",\n  spacing = 0,\n  children,')
    // Segmented control (§4.2): track bg-muted p-0.5 rounded-md; items rounded-sm inside it.
    s = rep(s, '"group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs"',
      '"group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[variant=default]:bg-muted data-[variant=default]:p-0.5"')
    s = rep(s, '"data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md',
      '"data-[variant=default]:rounded-sm data-[variant=default]:h-7 data-[variant=default]:data-[size=sm]:h-6 data-[variant=default]:touch:min-h-9 data-[spacing=0]:data-[variant=outline]:rounded-none data-[spacing=0]:data-[variant=outline]:first:rounded-l-md data-[spacing=0]:data-[variant=outline]:last:rounded-r-md')
    return s
  },
  kbd(s) {
    s = rep(s, 'rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground', 'rounded-sm border border-border-strong bg-subtle px-1 font-sans text-xs id text-muted-foreground')
    s = rep(s, '[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background', '[[data-slot=tooltip-content]_&]:border-transparent [[data-slot=tooltip-content]_&]:bg-primary-foreground/20 [[data-slot=tooltip-content]_&]:text-primary-foreground')
    return s
  },
  skeleton(s) {
    // The only allowed gradient in the product (§1.2 C2): the shimmer, only when motion is allowed.
    if (!s.includes('data-skeleton')) s = rep(s, 'data-slot="skeleton"\n', 'data-slot="skeleton"\n      data-skeleton=""\n      aria-hidden="true"\n')
    s = rep(s, '"animate-pulse rounded-md bg-accent"',
      '"rounded-md bg-muted motion-safe:animate-shimmer motion-safe:bg-[length:200%_100%] motion-safe:bg-[linear-gradient(90deg,var(--muted)_25%,color-mix(in_oklab,var(--muted)_40%,var(--background))_50%,var(--muted)_75%)]"')
    return s
  },
  alert(s) {
    s = s.replace(/variant: \{\n\s*default: "bg-card text-card-foreground",[\s\S]*?\n {6}\},\n {4}\},\n {4}defaultVariants: \{\n {6}variant: "default",/,
      `variant: {
        neutral: "border-[color-mix(in_oklab,var(--sev-minor)_28%,transparent)] bg-sev-minor-bg text-foreground [&>svg]:text-sev-minor",
        warning: "border-[color-mix(in_oklab,var(--sev-moderate)_28%,transparent)] bg-sev-moderate-bg text-foreground [&>svg]:text-sev-moderate",
        critical: "border-[color-mix(in_oklab,var(--sev-critical)_28%,transparent)] bg-sev-critical-bg text-foreground [&>svg]:text-sev-critical",
      },
    },
    defaultVariants: {
      variant: "neutral",`)
    s = rep(s, '  variant,\n  ...props\n}) {\n  return (\n    <div\n      data-slot="alert"', '  variant = "neutral",\n  ...props\n}) {\n  return (\n    <div\n      data-slot="alert"\n      data-status={variant}')
    s = rep(s, '[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current', '[&>svg]:size-4 [&>svg]:translate-y-0.5')
    s = rep(s, 'text-sm text-muted-foreground [&_p]:leading-relaxed', 'text-sm text-text-2')
    return s
  },
  sonner(s) {
    s = rep(s, 'import { useTheme } from "next-themes"', 'import { useTheme } from "@/ui/theme"')
    s = rep(s, '"--border-radius": "var(--radius)"\n', '"--border-radius": "var(--radius)",\n          zIndex: "var(--z-toast)",\n          fontFamily: "var(--nv-font-sans)"\n')
    if (!s.includes('toastOptions')) {
      s = rep(s, '      className="toaster group"\n', '      className="toaster group"\n      position="bottom-right"\n      toastOptions={{ classNames: { toast: "shadow-pop text-sm", description: "text-text-2" } }}\n')
    }
    return s
  },
  table(s) {
    s = rep(s, 'cn("[&_tr]:border-b", className)', 'cn("bg-subtle [&_tr]:border-b [&_tr]:border-border-strong [&_tr]:hover:bg-transparent", className)')
    s = rep(s, '"border-t bg-muted/50 font-medium [&>tr]:last:border-b-0"', '"border-t bg-subtle font-medium [&>tr]:last:border-b-0"')
    s = rep(s, '"border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted"',
      '"border-b transition-colors duration-100 hover:bg-row-hover aria-selected:bg-brand-soft data-[state=selected]:bg-brand-soft"')
    s = rep(s, '"h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground',
      '"h-9 px-3 first:pl-4 last:pr-4 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground [&.num]:text-right')
    s = rep(s, '"p-2 align-middle whitespace-nowrap', '"h-9 px-3 first:pl-4 last:pr-4 align-middle whitespace-nowrap')
    return s
  },
  dialog(s) {
    s = rep(s, 'rounded-lg border bg-background p-6 shadow-lg duration-200', 'rounded-xl border bg-popover p-6 shadow-lg duration-250')
    s = rep(s, 'sm:max-w-lg', 'sm:max-w-[520px]')
    return s
  },
  'alert-dialog'(s) {
    s = rep(s, 'rounded-lg border bg-background p-6 shadow-lg duration-200', 'rounded-xl border bg-popover p-6 shadow-lg duration-250')
    s = rep(s, 'sm:max-w-lg', 'sm:max-w-[520px]')
    return s
  },
  sheet(s) {
    s = rep(s, '"fixed z-50 flex flex-col gap-4 bg-background shadow-lg', '"fixed z-50 flex flex-col gap-4 bg-popover shadow-lg')
    return s
  },
  drawer(s) {
    s = rep(s, '"group/drawer-content fixed z-50 flex h-auto flex-col bg-background"', '"group/drawer-content fixed z-50 flex h-auto flex-col bg-popover shadow-lg"')
    s = rep(s, 'data-[vaul-drawer-direction=bottom]:rounded-t-lg', 'data-[vaul-drawer-direction=bottom]:rounded-t-xl')
    s = rep(s, 'data-[vaul-drawer-direction=top]:rounded-b-lg', 'data-[vaul-drawer-direction=top]:rounded-b-xl')
    return s
  },
  chart(s) {
    s = rep(s, 'dark: ".dark"', 'dark: "[data-theme=dark]"')
    // No hex literals in src (§9.4): target recharts parts by class, not by their default stroke colours.
    s = rep(s, "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50", '[&_.recharts-cartesian-grid_line]:stroke-border')
    s = rep(s, "[&_.recharts-dot[stroke='#fff']]:stroke-transparent", '[&_.recharts-dot]:stroke-transparent')
    s = rep(s, "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border", '[&_.recharts-polar-grid_line]:stroke-border')
    s = rep(s, "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border", '[&_.recharts-reference-line_line]:stroke-border')
    s = rep(s, "[&_.recharts-sector[stroke='#fff']]:stroke-transparent", '[&_.recharts-sector]:stroke-transparent')
    s = rep(s, 'rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl', 'rounded-lg border border-border/50 bg-popover px-2.5 py-1.5 text-xs shadow-xl')
    return s
  },
  switch(s) {
    s = rep(s, 'data-[size=default]:h-[1.15rem] data-[size=default]:w-8', 'data-[size=default]:h-[18px] data-[size=default]:w-8')
    return s
  },
  sidebar(s) {
    s = rep(s, 'const SIDEBAR_WIDTH = "16rem"', 'const SIDEBAR_WIDTH = "240px"')
    s = rep(s, 'const SIDEBAR_WIDTH_ICON = "3rem"', 'const SIDEBAR_WIDTH_ICON = "56px"')
    // State persists in localStorage['nv-sidebar'] (§4.4), not a cookie.
    s = rep(s, 'const SIDEBAR_COOKIE_NAME = "sidebar_state"\nconst SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7\n', 'const SIDEBAR_STORAGE_KEY = "nv-sidebar"\n')
    s = rep(s, '  const [_open, _setOpen] = React.useState(defaultOpen)',
      '  const [_open, _setOpen] = React.useState(() => {\n    try {\n      const v = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)\n      if (v === "true" || v === "false") return v === "true"\n    } catch {\n      /* storage blocked */\n    }\n    return defaultOpen\n  })')
    s = rep(s, '      // This sets the cookie to keep the sidebar state.\n      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`',
      '      try {\n        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(openState))\n      } catch {\n        /* storage blocked */\n      }')
    return s
  },
}

// ── UI-steward fixes (pass 3, after the token pass) ───────────────────────────────────────────
// Changes made after the first restyle, written as old → new on the restyled text so a fresh
// vendor + restyle reproduces the repo files and a re-run on the repo changes nothing.
const STEWARD = {
  toggle: [
    // Selected state: a 1 px border instead of ring-1 (a ring is a box-shadow; §3.6, §9.7-4), on the
    // segmented-control surface token (lighter than its track in dark too).
    ['text-muted-foreground hover:bg-row-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-sev-critical data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:ring-1 data-[state=on]:ring-border-strong',
      'border border-transparent text-muted-foreground hover:bg-row-hover hover:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-sev-critical data-[state=on]:border-border-strong data-[state=on]:bg-segment-active data-[state=on]:text-foreground'],
    ['        outline:\n          "border border-input bg-transparent hover:bg-row-hover",',
      '        // Multi-select chips: every item bordered; "on" is an ink border (not a fill), so it never reads\n        // as a single-choice segmented track (design review P1-19).\n        outline:\n          "border border-input bg-transparent text-text-2 hover:bg-row-hover data-[state=on]:border-foreground data-[state=on]:bg-background",'],
  ],
  'toggle-group': [
    ['function ToggleGroup({\n  className,\n  variant = "default",\n  size = "default",\n  spacing = 0,\n  children,\n  ...props\n}) {\n  return (',
      'function ToggleGroup({\n  className,\n  variant: variantProp,\n  size = "default",\n  spacing: spacingProp,\n  children,\n  ...props\n}) {\n  // The grey segmented track means "pick one". A multi-select group defaults to separate bordered\n  // items that wrap (design review P1-19); pass variant="default" to force the track.\n  const variant = variantProp ?? (props.type === "multiple" ? "outline" : "default")\n  const spacing = spacingProp ?? (variant === "outline" && props.type === "multiple" ? 2 : 0)\n  return ('],
    ['rounded-md data-[variant=default]:bg-muted data-[variant=default]:p-0.5"',
      'rounded-md data-[variant=default]:bg-segment data-[variant=default]:p-0.5 data-[variant=outline]:data-[spacing=2]:flex-wrap"'],
  ],
  tabs: [
    ['segmented: "bg-muted",', 'segmented: "bg-segment",'],
    ['group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-background group-data-[variant=segmented]/tabs-list:data-[state=active]:ring-1 group-data-[variant=segmented]/tabs-list:data-[state=active]:ring-border-strong',
      'group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-segment-active group-data-[variant=segmented]/tabs-list:data-[state=active]:border-border-strong'],
  ],
  command: [
    // DialogTitle/Description inside DialogContent (Radix names the dialog from them; REQUEST WP6).
    ['    <Dialog {...props}>\n      <DialogHeader className="sr-only">\n        <DialogTitle>{title}</DialogTitle>\n        <DialogDescription>{description}</DialogDescription>\n      </DialogHeader>\n      <DialogContent\n        className={cn("overflow-hidden p-0", className)}\n        showCloseButton={showCloseButton}\n      >\n',
      '    <Dialog {...props}>\n      <DialogContent\n        className={cn("overflow-hidden p-0", className)}\n        showCloseButton={showCloseButton}\n      >\n        {/* Title and description inside DialogContent so Radix links them (aria-labelledby/-describedby). */}\n        <DialogHeader className="sr-only">\n          <DialogTitle>{title}</DialogTitle>\n          <DialogDescription>{description}</DialogDescription>\n        </DialogHeader>\n'],
    [' [&_[cmdk-input]]:h-12', ''],
    // One input height (the wrapper was h-8 around an h-10 input); focus shown as a 2 px rule under the
    // search row instead of a second outline inside the menu (design review P2, ⌘K).
    ['      className="flex h-8 touch:h-10 items-center gap-2 border-b px-3"\n    >\n      <SearchIcon className="size-4 shrink-0 opacity-50" />',
      '      // The menu is the focus context: the input shows focus as a 2 px ring-coloured rule under the\n      // search row (the wrapper\'s ::after) instead of a second outline inside the floating panel.\n      className="relative flex h-10 touch:h-11 items-center gap-2 border-b border-border px-3 after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-ring after:opacity-0 has-[[data-slot=command-input]:focus-visible]:after:opacity-100"\n    >\n      <SearchIcon aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-muted-foreground" />'],
    ['"flex h-10 w-full rounded-md bg-transparent py-3 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"',
      '"flex h-full w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-50"'],
  ],
  'dialog': [
    // Return focus to the opener when the dialog was opened from state (§9.5; review: consent dialog, ⌘K).
    ["function DialogContent({\n  className,\n  children,\n  showCloseButton = true,\n  ...props\n}) {\n  return (", "function DialogContent({\n  className,\n  children,\n  showCloseButton = true,\n  onOpenAutoFocus,\n  onCloseAutoFocus,\n  ...props\n}) {\n  const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus })\n  return ("],
    ["        data-slot=\"dialog-content\"\n        className={cn(", "        data-slot=\"dialog-content\"\n        onOpenAutoFocus={returnFocus.onOpenAutoFocus}\n        onCloseAutoFocus={returnFocus.onCloseAutoFocus}\n        className={cn("],
  ],
  'sheet': [
    // Return focus to the opener when the dialog was opened from state (§9.5; review: consent dialog, ⌘K).
    ["  side = \"right\",\n  showCloseButton = true,\n  ...props\n}) {\n  return (", "  side = \"right\",\n  showCloseButton = true,\n  onOpenAutoFocus,\n  onCloseAutoFocus,\n  ...props\n}) {\n  const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus })\n  return ("],
    ["        data-slot=\"sheet-content\"\n        className={cn(", "        data-slot=\"sheet-content\"\n        onOpenAutoFocus={returnFocus.onOpenAutoFocus}\n        onCloseAutoFocus={returnFocus.onCloseAutoFocus}\n        className={cn("],
  ],
  'alert-dialog': [
    // Return focus to the opener when the dialog was opened from state (§9.5; review: consent dialog, ⌘K).
    ["function AlertDialogContent({\n  className,\n  size = \"default\",\n  ...props\n}) {\n  return (", "function AlertDialogContent({\n  className,\n  size = \"default\",\n  onOpenAutoFocus,\n  onCloseAutoFocus,\n  ...props\n}) {\n  const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus })\n  return ("],
    ["        data-slot=\"alert-dialog-content\"\n        data-size={size}", "        data-slot=\"alert-dialog-content\"\n        onOpenAutoFocus={returnFocus.onOpenAutoFocus}\n        onCloseAutoFocus={returnFocus.onCloseAutoFocus}\n        data-size={size}"],
  ],
}

function acceptanceGrep(src) {
  return src.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /shadow-(xs|sm|md|lg)|ring-\[3px\]|outline-hidden|bg-black|text-white|md:|rounded-\[/.test(l))
}

let changed = 0, bad = 0
for (const f of fs.readdirSync(PRIM).filter((f) => f.endsWith('.jsx')).sort()) {
  const name = f.replace(/\.jsx$/, '')
  const p = path.join(PRIM, f)
  const before = fs.readFileSync(p, 'utf8')
  let s = SPECIFIC[name] ? SPECIFIC[name](before) : before
  for (const [a, b] of COPY) s = rep(s, a, b)
  // Floating surfaces are 8 px (§3.5); their menu items stay 6 px.
  if (['dropdown-menu', 'hover-card', 'popover', 'select'].includes(name)) s = rep(s, 'rounded-md border bg-popover', 'rounded-lg border bg-popover')
  s = tokenPass(s, name)
  for (const [from, to] of STEWARD[name] || []) s = rep(s, from, to)
  if (s.includes('useReturnFocus(') && !s.includes('@/ui/hooks/use-return-focus')) {
    s = rep(s, 'import { cn } from "@/ui/cn"\n', 'import { cn } from "@/ui/cn"\nimport { useReturnFocus } from "@/ui/hooks/use-return-focus"\n')
  }
  if (s !== before) { fs.writeFileSync(p, s); changed++; console.log(`  restyled ${f}`) }
  for (const [n, l] of acceptanceGrep(s)) { bad++; console.log(`  §4.1 grep hit ${f}:${n}: ${l.trim().slice(0, 140)}`) }
}
// Mobile breakpoint for the sidebar sheet: < 1024 px (§5.3).
const mob = path.join(HOOKS, 'use-mobile.js')
if (fs.existsSync(mob)) {
  const b = fs.readFileSync(mob, 'utf8')
  const a = b.replace('const MOBILE_BREAKPOINT = 768', 'const MOBILE_BREAKPOINT = 1024')
  if (a !== b) { fs.writeFileSync(mob, a); changed++; console.log('  restyled hooks/use-mobile.js') }
}
// The vendor script's CLI run also writes lib/utils.js; NuvoVet's cn lives in src/ui/cn.js (theme-aware twMerge).
const stray = path.join(ROOT, 'src/ui/lib/utils.js')
if (fs.existsSync(stray)) { fs.rmSync(stray); changed++; console.log('  removed src/ui/lib/utils.js (use @/ui/cn)') }
console.log(`restyle-shadcn: ${changed} file(s) changed, ${bad} §4.1 grep hit(s)`)
process.exit(bad ? 1 : 0)
