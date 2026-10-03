// FindingList({ findings }): claim findings as EvidenceTrail rows (DESIGN_SYSTEM.md §4.5, §5.3).
// Frozen API (§8.1): the landing ledger (WP8) renders it with a line's findings from heroClaim.json.
// `findings` are claim-model findings (preview/model.js toClaimModel), in the order given.
//
// A source shared by several rows (e.g. "진료비 벤치마크 (자체 추정치)" on every pricing finding) is shown
// once as a note above the list instead of a chip on each row (§1.2 L10).
import { useId, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { CitationChip, EvidenceRow, EvidenceTrail } from '@/ui/patterns/EvidenceTrail'
import { FindingSeverity } from '@/ui/patterns/status'
import { fmtNum, fmtWon } from '@/ui/lib/format'
import { cn } from '@/ui/cn'

function EvidenceDetail({ id, finding }) {
  const notes = finding.evidence.filter((e) => !e.source)
  return (
    <div id={id} className="flex flex-col gap-1 pb-1">
      {finding.detail ? <p className="text-sm text-text-2">{finding.detail}</p> : null}
      {notes.length ? (
        <ul className="flex flex-col gap-0.5 text-xs text-text-2">
          {notes.map((e, i) => (
            <li key={i}>{e.label}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

const sourceOf = (f) => f.evidence?.find((e) => e.source) || null

/** One finding: badge, one-line title, amount; the rule line ends with a 상세 toggle. */
export function FindingRow({ finding, golden = false, hideSource = false }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const source = hideSource ? null : sourceOf(finding)
  const hasDetail = !!finding.detail || finding.evidence.some((e) => !e.source)
  const toggle = hasDetail ? (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen((o) => !o)}
      className="inline-flex h-5 items-center gap-0.5 rounded-sm text-xs font-medium text-text-2 hover:text-foreground"
    >
      상세
      <ChevronRight aria-hidden="true" strokeWidth={1.5} className={cn('size-3.5 transition-transform duration-150', open && 'rotate-90')} />
    </button>
  ) : null
  return (
    <EvidenceRow
      data-golden={golden ? 'finding-row' : undefined}
      badge={<FindingSeverity severity={finding.severity} />}
      title={finding.title}
      impact={finding.amount_at_risk > 0 ? fmtWon(finding.amount_at_risk) : null}
      ruleId={finding.rule}
      basis={finding.basis}
      citation={source ? <CitationChip label={source.label} cite={source.cite} /> : null}
      action={toggle}
    >
      {open ? <EvidenceDetail id={id} finding={finding} /> : null}
    </EvidenceRow>
  )
}

/** Source labels used by two or more findings: { label → { source, count } }. */
function sharedSources(findings) {
  const by = new Map()
  for (const f of findings) {
    const s = sourceOf(f)
    if (!s) continue
    const hit = by.get(s.label) || { source: { ...s }, count: 0 }
    // Per-row cites (item-specific figures) do not belong on the shared chip; keep a cite only if all agree.
    if (hit.count && hit.source.cite !== s.cite) hit.source.cite = null
    hit.count += 1
    by.set(s.label, hit)
  }
  return [...by.values()].filter((x) => x.count >= 2)
}

export function FindingList({ findings, className }) {
  if (!findings?.length) return null
  const shared = sharedSources(findings)
  const sharedLabels = new Set(shared.map((x) => x.source.label))
  const list = (
    <EvidenceTrail className={className}>
      {findings.map((f, i) => (
        <FindingRow key={`${f.rule}-${f.item_ref ?? ''}-${i}`} finding={f} golden={i === findings.length - 1} hideSource={sharedLabels.has(sourceOf(f)?.label)} />
      ))}
    </EvidenceTrail>
  )
  if (!shared.length) return list
  return (
    <div className="flex flex-col gap-2">
      {shared.map(({ source, count }) => (
        <p key={source.label} className="flex flex-wrap items-center gap-2 text-xs text-text-2">
          <CitationChip label={source.label} cite={source.cite} />
          <span>
            아래 소견 <span className="num">{fmtNum(count)}</span>건의 공통 근거입니다.
          </span>
        </p>
      ))}
      {list}
    </div>
  )
}

export default FindingList
