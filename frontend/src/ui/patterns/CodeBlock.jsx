import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/primitives/button'
import { Tabs, TabsList, TabsTrigger } from '@/ui/primitives/tabs'

/**
 * Pretty-print a JSON value for display: every level indented by `indent` spaces, arrays longer than
 * `maxItems` cut to their first `maxItems` elements plus a `// 외 N개` line (design review P1-17).
 * `maxItems: Infinity` keeps everything. The output is for reading, not valid JSON once cut.
 */
export function formatJson(value, { maxItems = Infinity, indent = 2, more = (n) => `// 외 ${n}개` } = {}) {
  const pad = (d) => ' '.repeat(d * indent)
  const walk = (v, d) => {
    if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
    if (Array.isArray(v)) {
      if (!v.length) return '[]'
      const shown = v.slice(0, maxItems)
      const lines = shown.map((x, i) => `${pad(d + 1)}${walk(x, d + 1)}${i < shown.length - 1 || v.length > shown.length ? ',' : ''}`)
      if (v.length > shown.length) lines.push(`${pad(d + 1)}${more(v.length - shown.length)}`)
      return `[\n${lines.join('\n')}\n${pad(d)}]`
    }
    const keys = Object.keys(v).filter((k) => v[k] !== undefined)
    if (!keys.length) return '{}'
    const lines = keys.map((k, i) => `${pad(d + 1)}${JSON.stringify(k)}: ${walk(v[k], d + 1)}${i < keys.length - 1 ? ',' : ''}`)
    return `{\n${lines.join('\n')}\n${pad(d)}}`
  }
  return walk(value, 0)
}

/** A run of Korean words (with the spaces and figures between them, e.g. "야간 응급 진찰", "외 7개"). */
const HANGUL_RUN = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]+(?: +[0-9]*[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]+)*/g

/**
 * The code with each Hangul run in a `span.cb-ko`, so a page can set Korean in a text face (no
 * monospace face carries Hangul, and a monospace word space between Hangul words reads as a gap).
 * Unstyled by default; the text is unchanged.
 */
function markHangul(text) {
  const out = []
  let last = 0
  for (const m of text.matchAll(HANGUL_RUN)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<span key={m.index} className="cb-ko">{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/**
 * CodeBlock (§4.5): bg-subtle rounded-lg border, .mono 12 px, a ghost copy button, optional tabs.
 * Pass `code` (string), `json` (a value, pretty-printed with formatJson; `jsonOptions` passed on), or
 * `tabs` = [{ value, label, code | json, copy? }]. `copy` (or `copyText` without tabs) is what the copy
 * button puts on the clipboard when it differs from the text shown, e.g. the whole, valid JSON behind
 * an excerpt cut with a `// 외 N개` line. Long lines scroll sideways inside the block (thin visible
 * scrollbar); `wrap` soft-wraps them instead. The scrolling <pre> is focusable (tabIndex 0, named by
 * `title` or the tab label) so it gets the §3.9 2 px focus outline rather than the browser's 1 px one.
 */
export function CodeBlock({ code, json, jsonOptions, tabs, title, copyText, wrap = false, className, ...props }) {
  const [tab, setTab] = useState(tabs?.[0]?.value)
  const [copied, setCopied] = useState(false)
  const toText = (c, j) => (j !== undefined ? formatJson(j, jsonOptions) : c ?? '')
  const active = tabs ? tabs.find((t) => t.value === tab) : null
  const current = tabs ? (active ? toText(active.code, active.json) : '') : toText(code, json)
  const clip = (tabs ? active?.copy : copyText) ?? current
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clip)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-subtle', className)} {...props}>
      <div className="flex h-9 items-center gap-2 border-b border-border pr-1 pl-3">
        {tabs ? (
          <Tabs value={tab} onValueChange={setTab} className="min-w-0 flex-1">
            <TabsList variant="underline" className="h-9 border-b-0">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-2">{title}</span>
        )}
        <Button variant="ghost" size="icon-sm" aria-label="코드 복사" onClick={copy}>
          {copied ? <Check strokeWidth={1.5} /> : <Copy strokeWidth={1.5} />}
        </Button>
      </div>
      <pre
        tabIndex={0}
        role="region"
        aria-label={typeof active?.label === 'string' ? active.label : typeof title === 'string' ? title : '코드'}
        className={cn(
          'mono p-3 leading-5 text-foreground',
          wrap ? 'break-words whitespace-pre-wrap' : 'overflow-x-auto [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]',
          // The outline is drawn inside: the block's own overflow-hidden would clip an outer one.
          'focus-visible:outline-offset-[-2px]',
        )}
      >
        <code>{markHangul(current)}</code>
      </pre>
    </div>
  )
}
