import { useId } from 'react'
import { useLang } from '../../i18n/index.js'
import { RULES } from '../../engine/rules/index.js'

/**
 * Engine pipeline as inline SVG. Colours come from the portfolio tokens
 * (pages.css → .pf-dg*), so it follows the light/dark theme. Two layouts:
 * horizontal (≥ 768 px) and vertical (phones); CSS shows one.
 */

const LAYER_GROUPS = [
  { id: 'interactions', layers: ['pk', 'pd'] },
  { id: 'species', layers: ['species_breed'] },
  { id: 'disease', layers: ['drug_disease', 'patient'] },
  { id: 'dose', layers: ['dose'] },
  { id: 'notes', layers: ['notes'] },
]

function useLayerCounts() {
  return LAYER_GROUPS.map((g) => ({ ...g, n: RULES.filter((r) => g.layers.includes(r.layer)).length }))
}

function Box({ x, y, w, h, title, sub = [], variant = '', align = 'middle' }) {
  const cx = align === 'start' ? x + 14 : x + w / 2
  const lines = [title, ...sub]
  const lineH = 17
  const top = y + h / 2 - ((lines.length - 1) * lineH) / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" className={`pf-dg__box ${variant}`.trim()} />
      {lines.map((l, i) => (
        <text key={i} x={cx} y={top + i * lineH} textAnchor={align} dominantBaseline="central" className={i === 0 ? 'pf-dg__t' : 'pf-dg__s'}>
          {l}
        </text>
      ))}
    </g>
  )
}

function Layer({ x, y, w, h, label, n, notes }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" className={`pf-dg__layer${notes ? ' pf-dg__layer--notes' : ''}`} />
      <text x={x + 12} y={y + h / 2} dominantBaseline="central" className="pf-dg__l">{label}</text>
      <text x={x + w - 12} y={y + h / 2} dominantBaseline="central" textAnchor="end" className="pf-dg__n">{n}</text>
    </g>
  )
}

function Arrow({ d, marker }) {
  return <path d={d} className="pf-dg__arrow" markerEnd={`url(#${marker})`} />
}

function Marker({ id }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className="pf-dg__head" />
      </marker>
    </defs>
  )
}

function Horizontal({ t, layers, titleId, descId }) {
  const marker = `${useId().replace(/:/g, '')}-h`
  const W = 1040
  const H = 344
  const cy = 172
  const gx = 400
  const gw = 254
  const ly0 = 54
  const lh = 46
  const lg = 9
  const rx = 884
  const rw = 156
  const rh = 62
  const ry = [cy - rh - 18 - rh / 2, cy - rh / 2, cy + rh / 2 + 18]
  return (
    <svg className="pf-dg pf-dg--h" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
      <Marker id={marker} />
      <Box x={0} y={cy - 52} w={156} h={104} title={t('hw.dg.input')} sub={[t('hw.dg.inputSub1'), t('hw.dg.inputSub2')]} />
      <Arrow d={`M156 ${cy} H190`} marker={marker} />
      <Box x={194} y={cy - 52} w={168} h={104} title={t('hw.dg.resolve')} sub={[t('hw.dg.resolveSub1'), t('hw.dg.resolveSub2')]} />
      <Arrow d={`M362 ${cy} H${gx - 4}`} marker={marker} />
      <rect x={gx} y={10} width={gw} height={H - 20} rx="10" className="pf-dg__group" />
      <text x={gx + 14} y={34} className="pf-dg__t">{t('hw.dg.rules', { n: RULES.length })}</text>
      {layers.map((l, i) => (
        <Layer key={l.id} x={gx + 12} y={ly0 + i * (lh + lg)} w={gw - 24} h={lh} label={t(`hw.dg.layer.${l.id}`)} n={l.n} notes={l.id === 'notes'} />
      ))}
      <Arrow d={`M${gx + gw} ${cy} H${690 - 4}`} marker={marker} />
      <Box x={690} y={cy - 64} w={158} h={128} title={t('hw.dg.merge')} sub={[t('hw.dg.mergeSub1'), t('hw.dg.mergeSub2'), t('hw.dg.mergeSub3')]} variant="pf-dg__accent" />
      {ry.map((y, i) => (
        <Arrow key={i} d={`M848 ${cy} C866 ${cy} 864 ${y + rh / 2} ${rx - 4} ${y + rh / 2}`} marker={marker} />
      ))}
      <Box x={rx} y={ry[0]} w={rw} h={rh} title={t('hw.dg.workbench')} sub={[t('hw.dg.workbenchSub')]} />
      <Box x={rx} y={ry[1]} w={rw} h={rh} title={t('hw.dg.report')} sub={[t('hw.dg.reportSub')]} />
      <Box x={rx} y={ry[2]} w={rw} h={rh} title={t('hw.dg.handout')} sub={[t('hw.dg.handoutSub')]} />
    </svg>
  )
}

function Vertical({ t, layers, titleId, descId }) {
  const marker = `${useId().replace(/:/g, '')}-v`
  const W = 340
  const lh = 40
  const lg = 8
  const gy = 196
  const gh = 44 + layers.length * lh + (layers.length - 1) * lg + 12
  const my = gy + gh + 28
  const mh = 92
  const ry = my + mh + 36
  const rw = (W - 16) / 3
  const H = ry + 66
  return (
    <svg className="pf-dg pf-dg--v" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
      <Marker id={marker} />
      <Box x={0} y={0} w={W} h={70} title={t('hw.dg.input')} sub={[`${t('hw.dg.inputSub1')} ${t('hw.dg.inputSub2')}`]} />
      <Arrow d={`M${W / 2} 70 V94`} marker={marker} />
      <Box x={0} y={98} w={W} h={70} title={t('hw.dg.resolve')} sub={[`${t('hw.dg.resolveSub1')} · ${t('hw.dg.resolveSub2')}`]} />
      <Arrow d={`M${W / 2} 168 V${gy - 4}`} marker={marker} />
      <rect x={0} y={gy} width={W} height={gh} rx="10" className="pf-dg__group" />
      <text x={14} y={gy + 24} className="pf-dg__t">{t('hw.dg.rules', { n: RULES.length })}</text>
      {layers.map((l, i) => (
        <Layer key={l.id} x={12} y={gy + 40 + i * (lh + lg)} w={W - 24} h={lh} label={t(`hw.dg.layer.${l.id}`)} n={l.n} notes={l.id === 'notes'} />
      ))}
      <Arrow d={`M${W / 2} ${gy + gh} V${my - 4}`} marker={marker} />
      <Box x={0} y={my} w={W} h={mh} title={t('hw.dg.merge')} sub={[t('hw.dg.mergeSub1'), `${t('hw.dg.mergeSub2')} · ${t('hw.dg.mergeSub3')}`]} variant="pf-dg__accent" />
      {[0, 1, 2].map((i) => (
        <Arrow key={i} d={`M${W / 2} ${my + mh} C${W / 2} ${my + mh + 18} ${i * (rw + 8) + rw / 2} ${ry - 18} ${i * (rw + 8) + rw / 2} ${ry - 4}`} marker={marker} />
      ))}
      <Box x={0} y={ry} w={rw} h={56} title={t('hw.dg.workbench')} />
      <Box x={rw + 8} y={ry} w={rw} h={56} title={t('hw.dg.report')} />
      <Box x={2 * (rw + 8)} y={ry} w={rw} h={56} title={t('hw.dg.handoutShort')} />
    </svg>
  )
}

export default function PipelineDiagram() {
  const { t } = useLang()
  const layers = useLayerCounts()
  const base = useId().replace(/:/g, '')
  const titleId = `${base}-title`
  const descId = `${base}-desc`
  return (
    <figure className="pf-dgfig">
      <p id={titleId} className="pf-sr">{t('hw.dg.title')}</p>
      <p id={descId} className="pf-sr">{t('hw.dg.desc', { n: RULES.length })}</p>
      <Horizontal t={t} layers={layers} titleId={titleId} descId={descId} />
      <Vertical t={t} layers={layers} titleId={titleId} descId={descId} />
      <figcaption className="pf-dgfig__cap">{t('hw.dg.caption')}</figcaption>
    </figure>
  )
}
