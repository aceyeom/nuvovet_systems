/**
 * Coverage strip (EMR popup spec §6.2, §3.7.1): what this visit's review checked, checked only
 * partly (with the reason) and did not check, computed per visit by coverage.js. Unmapped
 * products are listed under it.
 */

import { joinItems } from './parts.jsx'
import { t } from './strings.js'

export function CoverageStrip({ coverage, unmapped, locale }) {
  if (!coverage) return null
  const L = (item) => coverage.labels?.[item]?.[locale] ?? item
  const partial = coverage.partial || []
  return (
    <div className="nv-section" data-nv="coverage">
      <dl className="nv-coverage">
        <dt>{t(locale, 'coverage.checked')}</dt>
        <dd>{joinItems(locale, coverage.checked.map(L))}</dd>
        {partial.length ? (
          <>
            <dt>{t(locale, 'coverage.partial')}</dt>
            <dd>{joinItems(locale, partial.map((p) => `${L(p.item)} (${p.label?.[locale] ?? p.reason})`))}</dd>
          </>
        ) : null}
        <dt>{t(locale, 'coverage.notChecked')}</dt>
        <dd>
          {joinItems(locale, [
            ...coverage.notChecked.map(L),
            ...(unmapped || []).map((u) => `${u.code} (${t(locale, 'coverage.unmapped')})`),
          ])}
        </dd>
      </dl>
    </div>
  )
}
