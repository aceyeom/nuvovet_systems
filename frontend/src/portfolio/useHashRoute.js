/** React subscription to the hash route (kept out of router.js so that module stays React-free). */
import { useEffect, useState } from 'react'
import { matchRoute, NAV_EVENT } from './router.js'

function currentHash() {
  return typeof window === 'undefined' ? '' : window.location.hash
}

/** Subscribe to the current route. Re-renders on hash changes and on navigate(). */
export function useHashRoute() {
  const [route, setRoute] = useState(() => matchRoute(currentHash()))
  useEffect(() => {
    const update = () => setRoute(matchRoute(currentHash()))
    window.addEventListener('hashchange', update)
    window.addEventListener(NAV_EVENT, update)
    return () => {
      window.removeEventListener('hashchange', update)
      window.removeEventListener(NAV_EVENT, update)
    }
  }, [])
  return route
}

export default useHashRoute
