import { useEffect } from 'react'

/** document.title per route (§6.5). Parts are joined with " · ", never an em dash. */
export function useTitle(...parts) {
  const title = parts.flat().filter(Boolean).join(' · ')
  useEffect(() => {
    if (title) document.title = title
  }, [title])
}

export default useTitle
