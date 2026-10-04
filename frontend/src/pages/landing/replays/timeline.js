/** Small timeline helpers for the hero replays (scripted, looping, pausable). */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Steps through `phases` ([{ id, ms }]) while `playing`; loops. Returns the current index, id,
 * the loop count and `reached(id)` (true once that phase has started in this loop).
 *   start  the phase to begin on (a reduced-motion still holds its key frame there)
 *   onEnd  called when the last phase ends; return true to stop there (the caller moves on),
 *          anything else loops back to the first phase
 * A pause restarts the current phase from its beginning when play resumes.
 */
export function usePhases(phases, { playing = true, start = 0, onEnd } = {}) {
  const [state, setState] = useState({ i: start, cycle: 0 })
  const endRef = useRef(onEnd)
  endRef.current = onEnd
  useEffect(() => {
    if (!playing) return undefined
    const id = setTimeout(() => {
      if (state.i + 1 >= phases.length && endRef.current?.() === true) return
      setState((s) => (s.i + 1 < phases.length ? { ...s, i: s.i + 1 } : { i: 0, cycle: s.cycle + 1 }))
    }, phases[state.i].ms)
    return () => clearTimeout(id)
  }, [state, playing, phases])
  const index = state.i
  return {
    index,
    phase: phases[index].id,
    cycle: state.cycle,
    reached: (id) => phases.findIndex((p) => p.id === id) <= index,
  }
}

/** Calls the latest `fn(...args)` whenever `deps` change (callbacks from the hero may change identity). */
export function useReport(fn, args) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => { ref.current?.(...args) }, args) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Types `text` one character at a time while `active`; resets when `active` turns false. */
export function useTyping(text, active, perChar = 120) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) {
      setN(0)
      return undefined
    }
    if (n >= text.length) return undefined
    const id = setTimeout(() => setN((x) => x + 1), perChar)
    return () => clearTimeout(id)
  }, [active, n, text, perChar])
  return text.slice(0, n)
}

/**
 * Cursor target: the centre of `[data-target=name]` inside `rootRef`, in the root's own
 * (unscaled) coordinates. Recomputed whenever `name` or `dep` changes.
 */
export function useTarget(rootRef, name, dep) {
  const [pt, setPt] = useState(null)
  const last = useRef(null)
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !name) return
    const measure = () => {
      const el = root.querySelector(`[data-target="${name}"]`)
      if (!el) return
      const r = root.getBoundingClientRect()
      const k = root.offsetWidth ? r.width / root.offsetWidth : 1
      const e = el.getBoundingClientRect()
      const next = { x: (e.left - r.left + e.width / 2) / k, y: (e.top - r.top + e.height / 2) / k }
      if (!last.current || Math.abs(last.current.x - next.x) > 0.5 || Math.abs(last.current.y - next.y) > 0.5) {
        last.current = next
        setPt(next)
      }
    }
    measure()
    const id = setTimeout(measure, 380)
    return () => clearTimeout(id)
  }, [rootRef, name, dep])
  return pt
}

/** True while the element is on screen and the tab is visible (replays pause otherwise). */
export function useOnScreen(ref) {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    let visible = true
    let inView = true
    const update = () => setOn(visible && inView)
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; update() }, { threshold: 0.15 })
    io.observe(el)
    const vis = () => { visible = document.visibilityState !== 'hidden'; update() }
    document.addEventListener('visibilitychange', vis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', vis)
    }
  }, [ref])
  return on
}
