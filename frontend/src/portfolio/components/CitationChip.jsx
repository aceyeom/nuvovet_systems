import { BookOpen, FileText, ExternalLink } from 'lucide-react'
import { SOURCES, sourceHref } from '../knowledge/sources.js'
import { useLang } from '../i18n/index.js'
import { sourceShort } from './format.js'

/**
 * A citation as a chip. DOI/PMID sources link out (opened only when clicked —
 * nothing is fetched at runtime); labels and guidelines are plain chips.
 * full: show the full "Author Year, Journal" text instead of "Author Year".
 */
export default function CitationChip({ id, full = false }) {
  const { t, lang } = useLang()
  const s = SOURCES[id]
  if (!s) return null
  const href = sourceHref(id)
  const Icon = s.kind === 'label' ? FileText : BookOpen
  const text = full ? s.cite : sourceShort(id, lang)
  const title = [s.cite, s.title, s.doi ? `doi:${s.doi}` : s.pmid ? `PMID ${s.pmid}` : null].filter(Boolean).join(' — ')
  if (!href) {
    return (
      <span className="pf-cite" title={title}>
        <Icon size={13} aria-hidden="true" />
        <span>{text}</span>
      </span>
    )
  }
  return (
    <a className="pf-cite pf-cite--link" href={href} target="_blank" rel="noopener noreferrer" title={`${title} — ${t('cite.open')}`}>
      <Icon size={13} aria-hidden="true" />
      <span>{text}</span>
      <ExternalLink size={11} aria-hidden="true" className="pf-cite__ext" />
    </a>
  )
}

export function CitationList({ ids = [], full = false }) {
  const list = [...new Set(ids)].filter((id) => SOURCES[id])
  if (!list.length) return null
  return (
    <span className="pf-cites">
      {list.map((id) => <CitationChip key={id} id={id} full={full} />)}
    </span>
  )
}
