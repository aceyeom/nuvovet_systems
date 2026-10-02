import { useLang } from '../i18n/index.js'
import { fmtNum, rangeText } from './format.js'

/**
 * Reference range bar: protocol min–max as a band on a 0-based linear scale,
 * the entered dose as a marker. A dose far above the range is pinned to the
 * right edge with an arrow rather than squashing the band.
 * band: { min, max, value, unit } (see format.doseBand)
 */
export default function RangeBar({ band, status, compact = false }) {
  const { t } = useLang()
  if (!band) return null
  const lo = Math.min(band.min, band.max)
  const hi = Math.max(band.min, band.max)
  if (!(hi > 0)) return null
  const cap = hi * 3
  const domain = Math.min(Math.max(hi * 1.5, band.value * 1.15), cap)
  const beyond = band.value > domain
  const pos = (v) => Math.max(0, Math.min(100, (v / domain) * 100))
  const left = pos(lo)
  const width = Math.max(pos(hi) - left, 0)
  const marker = beyond ? 100 : pos(band.value)
  const narrow = width < 14
  const label = t('rb.aria', {
    range: rangeText(band.min, band.max, band.unit),
    value: `${fmtNum(band.value)} ${band.unit}`,
    status: t(`dc.status.${status}`),
  })

  return (
    <div className={`pf-range${compact ? ' pf-range--compact' : ''} pf-range--${status}`} role="img" aria-label={label}>
      <div className="pf-range__track">
        <span className={`pf-range__band${width < 1 ? ' is-point' : ''}`} style={{ left: `${left}%`, width: width < 1 ? undefined : `${width}%` }} />
        <span className={`pf-range__marker${beyond ? ' is-beyond' : ''}`} style={{ left: `${marker}%` }} />
      </div>
      {!compact && (
        <div className="pf-range__ticks" aria-hidden="true">
          <span className="pf-range__tick is-zero" style={{ left: 0 }}>0</span>
          {narrow ? (
            <span className="pf-range__tick" style={{ left: `${left + width / 2}%` }}>{lo === hi ? fmtNum(lo) : `${fmtNum(lo)}–${fmtNum(hi)}`}</span>
          ) : (
            <>
              <span className="pf-range__tick" style={{ left: `${left}%` }}>{fmtNum(lo)}</span>
              <span className="pf-range__tick" style={{ left: `${left + width}%` }}>{fmtNum(hi)}</span>
            </>
          )}
          {beyond && <span className="pf-range__tick is-end">{fmtNum(band.value)} ›</span>}
        </div>
      )}
    </div>
  )
}
