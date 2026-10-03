import { useEffect, useState } from 'react'

/** Subscribes to a media query. `wide:` in the console is (min-width: 1440px) (§2.5, §5.3). */
export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false)
  const [match, setMatch] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const on = () => setMatch(mql.matches)
    on()
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [query])
  return match
}

export const WIDE = '(min-width: 1440px)'
export const DESKTOP = '(min-width: 1024px)'
export const PHONE = '(max-width: 639.98px)'
