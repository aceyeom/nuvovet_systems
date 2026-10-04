/**
 * The rendered laptop (pre-rendered offline by scripts/render, see that folder's render.mjs).
 *
 *   <LaptopRender label="…" playing onPowered={fn} className="…">{screenContent}</LaptopRender>
 *
 * - First paint: the closed-lid frame as a plain <picture> (no skeleton, SSR-safe).
 * - When the stage is in view (and `playing` is true) the lid-opening sequence is preloaded and played
 *   once on a canvas (~1.2 s), cross-fading neighbouring frames so the motion is smooth at any refresh.
 * - Then the open frame is shown and a 1200 × 750 `.lr-screen` element is laid exactly into the glass
 *   with a CSS matrix3d computed from the manifest's projected screen corners (a homography, so it
 *   stays exact for any camera). The screen powers on (black → content, 300 ms) and `onPowered` fires.
 *   The glass reflection (`glare`) sits above the DOM.
 * - Reduced motion: the open frame and the content immediately.
 * - `playing` = false holds the intro (the laptop stays closed until it becomes true).
 * The screen keeps role="img" + aria-label; its content is inert (the replays are pictures, not UI).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import manifest from './laptopManifest.json'
import './laptop.css'

export const SCREEN_W = manifest.screen.w
export const SCREEN_H = manifest.screen.h

const BASE = `${import.meta.env.BASE_URL || '/'}render/laptop/`
const BIG = Math.max(...manifest.widths)
const SMALL = Math.min(...manifest.widths)
/** Wide layouts use the large set; phones the small one (≈1000 px is plenty at 3× DPR there). */
const MEDIA_BIG = '(min-width: 640px)'
const LAST = manifest.frames - 1
const OPEN_HOLD_MS = 140 // a beat of black glass before the screen lights up
const POWER_MS = 300

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function fileUrl(kind, w, n = 0) {
  if (kind === 'frame') return BASE + manifest.files.frame.replace('{w}', w).replace('{nn}', String(n).padStart(2, '0'))
  return BASE + manifest.files[kind].replace('{w}', w)
}

/**
 * CSS matrix3d that maps an element of size sw × sh (origin top-left) onto the quad
 * [tl, tr, br, bl] (pixel coordinates in the container). Square → quad homography (Heckbert).
 */
export function homography([tl, tr, br, bl], sw, sh) {
  const [x0, y0] = tl
  const [x1, y1] = tr
  const [x2, y2] = br
  const [x3, y3] = bl
  const sx = x0 - x1 + x2 - x3
  const sy = y0 - y1 + y2 - y3
  let g = 0
  let h = 0
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const dx1 = x1 - x2
    const dx2 = x3 - x2
    const dy1 = y1 - y2
    const dy2 = y3 - y2
    const det = dx1 * dy2 - dx2 * dy1
    g = (sx * dy2 - dx2 * sy) / det
    h = (dx1 * sy - sx * dy1) / det
  }
  const a = x1 - x0 + g * x1
  const b = x3 - x0 + h * x3
  const d = y1 - y0 + g * y1
  const e = y3 - y0 + h * y3
  const m = [a / sw, d / sw, 0, g / sw, b / sh, e / sh, 0, h / sh, 0, 0, 1, 0, x0, y0, 0, 1]
  return `matrix3d(${m.map((v) => +v.toFixed(9)).join(',')})`
}

/**
 * Fetch and decode the sequence, a few frames at a time, straight into ImageBitmaps pre-scaled to the
 * canvas size: the 1.2 s of playback never decodes or resamples a full-size image, and memory stays
 * bounded (many parallel full-size decodes make browsers drop some of them).
 */
async function loadFrames(set, w, h, signal) {
  const one = async (n) => {
    const url = fileUrl('frame', set, n)
    if (typeof createImageBitmap === 'function' && typeof fetch === 'function') {
      const blob = await (await fetch(url, { signal })).blob()
      return createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' })
    }
    const img = new Image()
    img.src = url
    await (img.decode ? img.decode() : new Promise((ok, no) => { img.onload = ok; img.onerror = no }))
    return img
  }
  const out = new Array(manifest.frames)
  let next = 0
  const worker = async () => {
    while (next < manifest.frames) {
      const n = next++
      out[n] = await one(n)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return out
}

function Picture({ kind, className, priority, imgRef }) {
  return (
    <picture className={className} aria-hidden="true">
      <source media={MEDIA_BIG} srcSet={fileUrl(kind, BIG)} type="image/webp" />
      <img
        ref={imgRef}
        src={fileUrl(kind, SMALL)}
        alt=""
        width={manifest.sizes[SMALL][0]}
        height={manifest.sizes[SMALL][1]}
        decoding="async"
        draggable={false}
        fetchPriority={priority ? 'high' : undefined}
      />
    </picture>
  )
}

export function LaptopRender({ label, playing = true, onPowered, className, children }) {
  const reduce = useReducedMotion()
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const screenRef = useRef(null)
  const openRef = useRef(null)
  const glareRef = useRef(null)
  const poweredRef = useRef(onPowered)
  poweredRef.current = onPowered
  // closed → opening → open (black glass) → on (content)
  const [state, setState] = useState(reduce ? 'on' : 'closed')
  const [inView, setInView] = useState(false)

  // Lay the 1200 × 750 screen into the glass; recompute when the stage resizes.
  useIsoLayoutEffect(() => {
    const root = rootRef.current
    const screen = screenRef.current
    if (!root || !screen) return undefined
    const { tl, tr, br, bl } = manifest.screen
    const place = () => {
      const w = root.clientWidth
      const hgt = root.clientHeight
      if (!w || !hgt) return
      const px = [tl, tr, br, bl].map(([x, y]) => [x * w, y * hgt])
      screen.style.transform = homography(px, SCREEN_W, SCREEN_H)
    }
    place()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(place)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // Reduced motion: straight to the lit screen.
  useEffect(() => {
    if (reduce) setState('on')
  }, [reduce])

  // Start once the stage is (nearly) in view.
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setInView(true) }, { rootMargin: '120px 0px', threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Start the intro once: in view, allowed to play, motion allowed.
  const [go, setGo] = useState(false)
  useEffect(() => {
    if (!reduce && inView && playing && state === 'closed') setGo(true)
  }, [reduce, inView, playing, state])

  // The lid-opening sequence (runs once; only unmounting stops it).
  useEffect(() => {
    if (!go) return undefined
    let cancelled = false
    let raf = 0
    let frames = []
    const abort = typeof AbortController === 'function' ? new AbortController() : null
    const set = window.matchMedia?.(MEDIA_BIG).matches ? BIG : SMALL
    // the sequence is motion: 1.25× the CSS size is plenty (the rest pose is the full-size picture)
    const cw = Math.max(1, Math.min(manifest.sizes[set][0], Math.round((rootRef.current?.clientWidth || 1) * Math.min(window.devicePixelRatio || 1, 1.25))))
    const ch = Math.max(1, Math.round(cw / manifest.aspect))
    // the rest pose must be decoded before the canvas hands over to it (no blank frame)
    const rest = [openRef.current, glareRef.current].map((img) => img?.decode?.().catch(() => {}))
    Promise.all([loadFrames(set, cw, ch, abort?.signal), ...rest])
      .then(([loaded]) => {
        frames = loaded
        if (cancelled) {
          for (const f of loaded) f.close?.()
          return
        }
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx) {
          setState('open')
          return
        }
        canvas.width = cw
        canvas.height = ch
        ctx.imageSmoothingQuality = 'high'
        const draw = (f) => {
          const i = Math.max(0, Math.min(LAST, Math.floor(f)))
          const t = Math.max(0, Math.min(1, f - i))
          ctx.globalCompositeOperation = 'source-over'
          ctx.globalAlpha = 1
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          // premultiplied cross-fade: A·(1−t) + B·t, exact for transparent frames too
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = 1 - t
          ctx.drawImage(frames[i], 0, 0, canvas.width, canvas.height)
          if (t > 0 && i < LAST) {
            ctx.globalAlpha = t
            ctx.drawImage(frames[i + 1], 0, 0, canvas.width, canvas.height)
          }
          ctx.globalAlpha = 1
          ctx.globalCompositeOperation = 'source-over'
        }
        draw(0)
        setState('opening')
        const t0 = performance.now()
        const tick = (now) => {
          if (cancelled) return
          // rAF time is the frame's start, which can precede t0: clamp at 0
          const p = Math.min(1, Math.max(0, (now - t0) / manifest.durationMs))
          draw(p * LAST)
          if (p < 1) raf = requestAnimationFrame(tick)
          else {
            setState('open')
            for (const f of frames) f.close?.()
          }
        }
        raf = requestAnimationFrame(tick)
      })
      .catch(() => { if (!cancelled) setState('open') })
    return () => {
      cancelled = true
      abort?.abort()
      cancelAnimationFrame(raf)
      for (const f of frames) f.close?.()
    }
  }, [go])

  // Black glass for a beat, then power on.
  useEffect(() => {
    if (state !== 'open') return undefined
    const t = setTimeout(() => setState('on'), OPEN_HOLD_MS)
    return () => clearTimeout(t)
  }, [state])

  useEffect(() => {
    if (state !== 'on') return undefined
    if (reduce) {
      poweredRef.current?.()
      return undefined
    }
    const t = setTimeout(() => poweredRef.current?.(), POWER_MS)
    return () => clearTimeout(t)
  }, [state, reduce])

  // A quiet scroll response: 1 → 1.03 as the stage leaves the viewport.
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ['end end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 1.03])

  return (
    <motion.div
      ref={rootRef}
      className={['lr', className].filter(Boolean).join(' ')}
      data-state={state}
      style={{ scale, '--lr-aspect': `${manifest.sizes[BIG][0]} / ${manifest.sizes[BIG][1]}`, '--lr-off': manifest.screen.off }}
    >
      <Picture kind="frame" className="lr-layer lr-poster" priority />
      <canvas ref={canvasRef} className="lr-layer lr-canvas" aria-hidden="true" />
      <Picture kind="open" className="lr-layer lr-open" imgRef={openRef} />
      <div ref={screenRef} className="lr-screen" role="img" aria-label={label} data-powered={state === 'on' || undefined} style={{ width: SCREEN_W, height: SCREEN_H }}>
        {state === 'on' ? (
          <div className="lr-screen-content" inert>
            {children}
          </div>
        ) : null}
      </div>
      <Picture kind="glare" className="lr-layer lr-glare" imgRef={glareRef} />
    </motion.div>
  )
}

export default LaptopRender
