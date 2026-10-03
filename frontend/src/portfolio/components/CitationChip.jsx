import { useState } from 'react'
import { CitationChip as Chip } from '@/ui/patterns/EvidenceTrail'
import { SOURCES } from '../knowledge/sources.js'
import { useLang } from '../i18n/index.js'
import { sourceShort } from './format.js'

/**
 * A knowledge-base citation as the shared CitationChip (§4.5): outline badge with a BookOpen icon;
 * hover or focus shows the full cite, the title and the DOI. Nothing is fetched at runtime.
 */
export default function CitationChip({ id }) {
  const { lang } = useLang()
  const s = SOURCES[id]
  if (!s) return null
  const cite = s.title ? `${s.cite}. ${s.title}` : s.cite
  return <Chip label={sourceShort(id, lang)} cite={s.pmid && !s.doi ? `${cite} (PMID ${s.pmid})` : cite} doi={s.doi || null} />
}

/**
 * Citations of one finding. `max` shows the first `max` chips and a "+N" button that reveals the
 * rest, so a well-cited finding is not a row of seven chips (design review P2).
 */
export function CitationList({ ids = [], max = Infinity, className }) {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const list = [...new Set(ids)].filter((id) => SOURCES[id])
  if (!list.length) return null
  const hidden = open ? 0 : Math.max(0, list.length - max)
  const shown = hidden ? list.slice(0, max) : list
  return (
    <span className={className ?? 'inline-flex flex-wrap items-center gap-1'}>
      {shown.map((id) => <CitationChip key={id} id={id} />)}
      {hidden ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={lang === 'ko' ? `출처 ${hidden}개 더 보기` : `Show ${hidden} more sources`}
          className="num inline-flex h-6 items-center rounded-sm px-1 text-xs text-text-2 hover:text-foreground hover:underline"
        >
          +{hidden}
        </button>
      ) : null}
    </span>
  )
}
