// Table density preference (32 px compact, the queue default, or 36 px), per browser (§4.5).
export const DENSITY_KEY = 'nv-density'

export function readDensity() {
  try {
    const v = window.localStorage.getItem(DENSITY_KEY)
    return v === 'default' ? 'default' : 'compact'
  } catch {
    return 'compact'
  }
}

export function writeDensity(v) {
  try {
    window.localStorage.setItem(DENSITY_KEY, v)
  } catch {
    /* storage blocked */
  }
}
