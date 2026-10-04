/**
 * nuvovet brand marks (styles in src/brand/brand.css). The wordmark is lowercase `nuvovet` outlined from
 * MaruBuri SemiBold; a product lockup adds the product name (MaruBuri Regular) in its product ink after a
 * fixed gap. Paths, not text: the logo never waits for a web font (brandMarks.generated.js).
 *
 *   <BrandLockup />                                   nuvovet           master wordmark
 *   <BrandLockup product="dur" height={18} />         nuvovet DUR
 *   <BrandLockup product="claims" suffix="콘솔" />     nuvovet Claims  콘솔   (suffix: Pretendard 500 13 px, muted)
 *   <BrandMark product="dur" size={32} />             monogram tile: favicon / app-icon use only, never beside
 *                                                     the wordmark (tile={false}: the bare n in currentColor)
 *
 * height: the frame height in px (ascender to descender of the outlines; default 20). Recommended: 16 in the
 *   console sidebar and the EMR demo bar, 18 in product headers and landing tabs, 20–22 in the landing nav,
 *   24 for large headers. Below 16 use the master wordmark alone. At small sizes the outlines are fitted to
 *   the pixel grid (integer x-height, the serif feet on a pixel edge); the drawn size stays within 4 %.
 * tone: 'ink' (default) follows the console theme: ink + product ink on light, #ECEEF1 + light product ink
 *   on dark. 'light' is always the light tone (for dark surfaces such as the island). 'mono' is one colour,
 *   currentColor. The legacy tone 'dark' and size 'sm' | 'md' | 'lg' are still accepted.
 *
 * Renders <span class="nvb-lockup" data-product data-tone data-brand-surface> containing
 * <svg role="img" aria-label="nuvovet DUR"> and, with `suffix`, <span class="nvb-suffix">.
 */
import { useEffect } from 'react'
import { FRAME, WORDMARK, PRODUCT, MONOGRAM_N } from './brandMarks.generated.js'
import './brand.css'

export const PRODUCTS = {
  dur: { key: 'dur', name: 'DUR', full: 'nuvovet DUR', tagline: '처방 안전 검토', audience: '동물병원' },
  claims: { key: 'claims', name: 'Claims', full: 'nuvovet Claims', tagline: '보험 청구 심사', audience: '펫보험사' },
}

// Presentation-attribute fills: the marks keep their colours where brand.css is not loaded (a widget
// shadow root). brand.css overrides them (theme-aware ink tone, forced colours).
const FILLS = {
  ink: { word: '#16191E', dur: '#28553B', claims: '#1D3C6E' },
  light: { word: '#ECEEF1', dur: '#8DCBA4', claims: '#9DBCEE' },
  mono: { word: 'currentColor', dur: 'currentColor', claims: 'currentColor' },
}
const LEGACY_SIZE = { sm: 16, md: 20, lg: 24 }

// Font units (y down): the serif feet line and the top serifs of u and v (the x-height edge) are the
// longest horizontal edges of the marks.
const FEET = 25
const X_TOP = -476
const FIT_MAX = 48 // px; larger marks are drawn at their nominal scale
const FIT_TOLERANCE = 0.04 // never draw more than 4 % off the nominal size (e.g. 12 px stays unfitted)

const num = (v) => Math.round(v * 1000) / 1000

/**
 * Geometry for a lockup `height` px tall. At FIT_MAX and below the scale is chosen so that the x-height
 * (feet to top serifs, 501 units) is a whole number of pixels when that costs at most 4 % of the size;
 * the feet line always sits on a pixel edge `feet` px from the top of the box. The svg box ends at the
 * feet line (its bottom is the flex baseline) and a margin of `height - feet` px restores the full height.
 */
export function lockupGeometry(height = 20, product) {
  const h = Math.max(8, Math.round(Number(height) || 20))
  const nominal = h / FRAME.height
  const span = FEET - X_TOP
  const fitted = Math.max(1, Math.round(span * nominal)) / span
  const scale = h <= FIT_MAX && Math.abs(fitted / nominal - 1) <= FIT_TOLERANCE ? fitted : nominal
  const feet = Math.min(h, Math.round((FEET - FRAME.top) * nominal))
  const x1 = product ? PRODUCT[product].x1 : WORDMARK.x0 + WORDMARK.width
  const units = x1 - WORDMARK.x0
  const top = FEET - feet / scale
  return {
    height: h,
    feet,
    scale,
    width: num(units * scale),
    viewBox: `${WORDMARK.x0} ${num(top)} ${units} ${num(feet / scale)}`,
  }
}

export function BrandLockup({ product, height, size, tone = 'ink', suffix, className, style, ...rest }) {
  const p = product && PRODUCTS[product] ? product : undefined
  const t = tone === 'light' || tone === 'mono' ? tone : 'ink'
  const g = lockupGeometry(height ?? LEGACY_SIZE[size] ?? 20, p)
  const fill = FILLS[t]
  const label = p ? PRODUCTS[p].full : 'nuvovet'
  const hasSuffix = suffix !== undefined && suffix !== null && suffix !== false && suffix !== ''
  return (
    <span
      className={`nvb-lockup${className ? ` ${className}` : ''}`}
      data-product={p}
      data-tone={t}
      data-brand-surface=""
      style={{ height: g.height, ...style }}
      {...rest}
    >
      <svg
        className="nvb-lockup-mark"
        role="img"
        aria-label={label}
        focusable="false"
        viewBox={g.viewBox}
        preserveAspectRatio="none"
        width={g.width}
        height={g.feet}
        style={{ marginBottom: g.height - g.feet }}
      >
        <path className="nvb-lockup-word" fill={fill.word} d={WORDMARK.d} />
        {p ? <path className="nvb-lockup-product" fill={fill[p]} d={PRODUCT[p].d} /> : null}
      </svg>
      {hasSuffix ? <span className="nvb-suffix">{suffix}</span> : null}
    </span>
  )
}

const TILE = { dur: '#28553B', claims: '#1D3C6E' }

/**
 * The monogram: MaruBuri SemiBold `n`, white on a 32-unit tile (ink, or the product ink). For favicons,
 * app icons and avatars only; it never sits beside the wordmark. `tile={false}` draws the bare n in
 * currentColor (e.g. a collapsed sidebar, where the wordmark is hidden).
 */
export function BrandMark({ product, size = 32, title, tile = true, className, ...rest }) {
  const p = product && PRODUCTS[product] ? product : undefined
  return (
    <svg
      className={`nvb-mark${className ? ` ${className}` : ''}`}
      data-product={p}
      viewBox={tile ? '0 0 32 32' : '-150 -697 924 924'}
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
      {...rest}
    >
      {tile ? <rect width="32" height="32" rx="7" fill={TILE[p] || '#16191E'} /> : null}
      <path transform={tile ? 'translate(4.67 25) scale(0.03636)' : undefined} fill={tile ? '#FFFFFF' : 'currentColor'} d={MONOGRAM_N.d} />
    </svg>
  )
}

/**
 * Per-route favicon: while mounted, points <link id="nv-favicon"> (index.html) at /favicon-<product>.svg
 * and restores the master icon on unmount. A no-op where that link does not exist (standalone build).
 */
export function useBrandFavicon(product) {
  useEffect(() => {
    if (!product || !PRODUCTS[product] || typeof document === 'undefined') return undefined
    const link = document.getElementById('nv-favicon')
    if (!link) return undefined
    const prev = link.getAttribute('href')
    link.setAttribute('href', `/favicon-${product}.svg`)
    return () => {
      if (prev) link.setAttribute('href', prev)
    }
  }, [product])
}
