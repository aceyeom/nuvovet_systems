/**
 * nuvovet brand marks (src/brand/brand.css).
 *
 *   <BrandMark product="dur" />            the tile: an "n" arch with the island pill above its shoulder
 *   <BrandLockup product="claims" />       mark · nuvovet ╰ ● Claims   (the product hangs off the master brand)
 *
 * product: undefined (master brand) | 'dur' | 'claims'. tone: 'dark' text (default) | 'light' text.
 */
import { useId } from 'react'
import './brand.css'

export const PRODUCTS = {
  dur: { key: 'dur', name: 'DUR', full: 'nuvovet DUR', tagline: '처방 안전 검토', audience: '동물병원' },
  claims: { key: 'claims', name: 'Claims', full: 'nuvovet Claims', tagline: '보험 청구 심사', audience: '펫보험사' },
}

export function BrandMark({ product, className, title }) {
  const gid = useId().replace(/:/g, '')
  const stroke = product ? `var(--nvb-${product}-300)` : `url(#${gid}-g)`
  const pill = product ? `var(--nvb-${product}-400)` : `url(#${gid}-g)`
  return (
    <svg className={`nvb-mark${className ? ` ${className}` : ''}`} viewBox="0 0 32 32" role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'} aria-label={title}>
      <defs>
        <linearGradient id={`${gid}-g`} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6380FF" />
          <stop offset="1" stopColor="#2CC4A8" />
        </linearGradient>
        <linearGradient id={`${gid}-t`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1B2640" />
          <stop offset="1" stopColor="#0A1220" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gid}-t)`} />
      <path d="M9.6 23.4v-7.2a6.4 6.4 0 0 1 12.8 0v7.2" fill="none" stroke={stroke} strokeWidth="3.3" strokeLinecap="round" />
      <rect x="18.6" y="5.6" width="8" height="3.4" rx="1.7" fill={pill} />
    </svg>
  )
}

export function BrandLockup({ product, size = 'md', tone = 'dark', suffix, className, ...rest }) {
  const p = product ? PRODUCTS[product] : null
  return (
    <span className={`nvb-lockup${className ? ` ${className}` : ''}`} data-product={product || undefined} data-size={size} data-tone={tone} data-brand-surface="" {...rest}>
      <BrandMark product={product} />
      <span className="nvb-word">nuvovet</span>
      {p ? (
        <span className="nvb-branch">
          <svg viewBox="0 0 12 18" aria-hidden="true">
            <path d="M2 1v7.5a5 5 0 0 0 5 5h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="nvb-product">{p.name}</span>
        </span>
      ) : null}
      {suffix ? <span className="nvb-suffix">{suffix}</span> : null}
    </span>
  )
}
