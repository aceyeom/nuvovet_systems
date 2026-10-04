/**
 * The rendered laptop (pre-rendered offline by scripts/render, see that folder's render.mjs).
 *
 *   <LaptopRender label="…" playing onPowered={fn} className="…">{screenContent}</LaptopRender>
 *
 * - First paint: the closed-lid frame as a plain <picture> (no skeleton, SSR-safe).
 * - Fit: the frame is composed for the open laptop, so the closed device sits in its lower 40 %. When
 *   that would put the closed device below the fold, the whole render starts scaled down from its top
 *   edge (the "camera" is pulled back) until the closed device is in view, and pushes back in to full
 *   size while the lid opens: the opening is always seen, and the screen ends large (on a viewport
 *   that would cut the open device at the hinge it settles at ZOOM_END_MIN, so the keyboard shows
 *   above the fold; see endScale). When even a
 *   ZOOM_MIN pull-back would not bring it into view (a short viewport), the intro is skipped and the
 *   laptop is shown open and lit (the open frame fades in, then the screen powers on).
 * - The lid sequence starts loading as soon as the stage is near the viewport (the first frames with a
 *   preload hint) and plays once the closed device itself is in view (60 % of it, or 20 % for 600 ms)
 *   and the first frames are decoded;
 *   later frames stream in during playback (the clock holds if one is late). Frames are drawn one at a
 *   time (nearest frame; the in-between frames carry their own motion blur), at most 1.25 × CSS px.
 * - Then the open frame is shown and a 1200 × 750 `.lr-screen` element is laid exactly into the glass
 *   with a CSS matrix3d computed from the manifest's projected screen corners (a homography, so it
 *   stays exact for any camera). The screen powers on (black → content, 300 ms) and `onPowered` fires.
 *   The glass reflection (`glare`) sits above the DOM.
 * - Reduced motion: the open frame and the content immediately, at full size.
 * - `playing` = false holds the intro (the laptop stays closed until it becomes true).
 * The screen keeps role="img" + aria-label; its content is inert (the replays are pictures, not UI).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import manifest from './laptopManifest.json'
import './laptop.css'

export const SCREEN_W = manifest.screen.w
export const SCREEN_H = manifest.screen.h
/**
 * The open device's box in the frame, normalised [x0, y0, x1, y1]. The three-quarter render is not
 * centred in its frame, so a page that lines the device up with its grid reads it from here (the hero:
 * --lr-x0 / --lr-w / --lr-cx on the stage).
 */
export const DEVICE_BOX = manifest.boxes?.open || [0.08, 0.021, 0.92, 0.9585]

const BASE = `${import.meta.env.BASE_URL || '/'}render/laptop/`
const BIG = Math.max(...manifest.widths)
const SMALL = Math.min(...manifest.widths)
/** Wide layouts use the large stills; phones the small ones (≈1000 px is plenty at 3× DPR there). */
const MEDIA_BIG = '(min-width: 640px)'
const LAST = manifest.frames - 1
const FRAME_MS = manifest.durationMs / LAST
const OPEN_HOLD_MS = 140 // a beat of black glass before the screen lights up
const POWER_MS = 300
/** The push-in outlasts the lid a little, so the camera settles after the lid does. */
const ZOOM_MS = manifest.durationMs + 300
/**
 * The furthest the camera may start pulled back. Below it (a short viewport: the stage starts low and
 * the closed device would be a thumbnail) the intro is skipped: the laptop is shown open and lit, at
 * full size, as with reduced motion, so the first screen shows the product instead of white paper.
 */
const ZOOM_MIN = 0.3
/**
 * Where the camera may settle: on a viewport that cuts the open device at the hinge (1440 × 900: the
 * fold falls right under the screen), it ends a little pulled back, so the fold crops the keyboard and
 * the picture reads as a product shot rather than a floating screen. Never further than this (the
 * screen's content has to stay legible), 1 when the whole device already fits.
 */
const ZOOM_END_MIN = 0.9
/** The intro starts when this much of the closed device is on screen, or LOOSE of it for LOOSE_MS. */
const VIEW_MIN = 0.6
const LOOSE = 0.2
const LOOSE_MS = 600
/** Frames decoded before the lid may start moving (the rest stream in during playback). */
const PRIMED = 6
/** The closed device, normalised [x0, y0, x1, y1] in the frame. */
const CLOSED = manifest.boxes?.closed || [0.08, 0.615, 0.92, 0.957]
const FOLD_GAP = 20 // px kept clear between the closed device and the bottom of the viewport

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function fileUrl(kind, w, n = 0) {
  if (kind === 'frame') return BASE + manifest.files.frame.replace('{w}', w).replace('{nn}', String(n).padStart(2, '0'))
  return BASE + manifest.files[kind].replace('{w}', w)
}

/** cubic-bezier(x1, y1, x2, y2) as a function of x ∈ [0, 1]. */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 24; i++) {
      const m = (lo + hi) / 2
      if (((ax * m + bx) * m + cx) * m < x) lo = m
      else hi = m
    }
    const t = (lo + hi) / 2
    return ((ay * t + by) * t + cy) * t
  }
}
const zoomEase = bezier(0.42, 0, 0.18, 1)

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

/** The sequence width for a canvas `cw` px wide: the smallest motion set that covers it. */
export function motionSet(cw) {
  const sets = [...(manifest.motion || manifest.widths)].sort((a, b) => a - b)
  return sets.find((w) => w >= cw) || sets[sets.length - 1]
}

/** Canvas size for a stage `cssW` px wide: the motion is seen for 1.2 s, 1.25 × CSS px is plenty. */
function canvasSize(cssW) {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const sets = manifest.motion || manifest.widths
  const cw = Math.max(1, Math.min(Math.max(...sets), Math.round(cssW * Math.min(dpr, 1.25))))
  return [cw, Math.max(1, Math.round(cw / manifest.aspect))]
}

/**
 * How far the camera starts pulled back: the scale (from the render's top edge) at which the closed
 * device clears the fold, 1 when it already does or the stage is not on screen at all. Not clamped
 * below: a value under ZOOM_MIN means the intro cannot be seen from here (see `place`).
 */
export function fitScale(el) {
  if (!el || typeof window === 'undefined') return 1
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight
  const h = el.offsetHeight
  if (!h || r.top >= vh || r.bottom <= 0) return 1
  return Math.min(1, (vh - FOLD_GAP - r.top) / (h * CLOSED[3]))
}

/**
 * The camera's resting scale (see ZOOM_END_MIN): enough to bring the open device's front edge to the
 * fold, clamped to [ZOOM_END_MIN, 1].
 */
export function endScale(el) {
  if (!el || typeof window === 'undefined') return 1
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight
  const h = el.offsetHeight
  if (!h || r.top >= vh || r.bottom <= 0) return 1
  const need = (vh - FOLD_GAP - r.top) / (h * DEVICE_BOX[3])
  return need >= 1 ? 1 : Math.max(ZOOM_END_MIN, need)
}

/** Decode one frame into a bitmap pre-scaled to the canvas (playback never resamples a big image). */
async function decodeFrame(src, w, h) {
  const img = typeof src === 'string' ? Object.assign(new Image(), { decoding: 'async', src }) : src
  if (img.decode) await img.decode()
  else if (!img.complete) await new Promise((ok, no) => { img.onload = ok; img.onerror = no })
  if (typeof createImageBitmap === 'function') return createImageBitmap(img, { resizeWidth: w, resizeHeight: h, resizeQuality: 'medium' })
  return img
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
  const camRef = useRef(null)
  const canvasRef = useRef(null)
  const screenRef = useRef(null)
  const posterRef = useRef(null)
  const openRef = useRef(null)
  const glareRef = useRef(null)
  const sentinelRef = useRef(null)
  const poweredRef = useRef(onPowered)
  poweredRef.current = onPowered
  // closed → opening → open (black glass) → on (content)
  const [state, setState] = useState(reduce ? 'on' : 'closed')
  const stateRef = useRef(state)
  stateRef.current = state
  const zoomRef = useRef(1) // the camera's starting scale (see fitScale)
  const [rest, setRest] = useState(null) // { z, pull }: the camera's resting scale, and the layout it frees
  const [skip, setSkip] = useState(false) // the intro cannot be seen from here: open and lit instead
  const skipRef = useRef(false)
  const [near, setNear] = useState(false) // the stage is close: start loading
  const [inView, setInView] = useState(false) // the closed device is on screen: start playing
  const [primed, setPrimed] = useState(false) // the first frames are decoded
  const seq = useRef(null) // { frames: [], ready: n (contiguous), cw, ch, done: Promise }

  // Lay the 1200 × 750 screen into the glass; pull the camera back while the lid is closed.
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
      if (stateRef.current === 'closed' && !skipRef.current) {
        const s = reduce ? 1 : fitScale(root)
        if (s < ZOOM_MIN) {
          skipRef.current = true
          setSkip(true)
        }
        zoomRef.current = s < ZOOM_MIN ? 1 : s
        if (camRef.current) camRef.current.style.transform = zoomRef.current < 1 ? `scale(${zoomRef.current})` : ''
      }
    }
    place()
    // the headline's display face may land after the first layout and move the stage
    let live = true
    document.fonts?.ready?.then(() => { if (live) place() })
    window.addEventListener('resize', place)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    ro?.observe(root)
    return () => {
      live = false
      window.removeEventListener('resize', place)
      ro?.disconnect()
    }
  }, [reduce])

  // Skipped intro: once the open frame is decoded, show it (it fades in) and power on.
  useEffect(() => {
    if (!skip || reduce || stateRef.current !== 'closed') return undefined
    let cancelled = false
    const img = openRef.current
    const ready = img?.decode ? img.decode().catch(() => {}) : Promise.resolve()
    ready.then(() => { if (!cancelled && stateRef.current === 'closed') setState('open') })
    return () => { cancelled = true }
  }, [skip, reduce])

  // Reduced motion: straight to the lit screen, at full size.
  useEffect(() => {
    if (!reduce) return
    if (camRef.current) camRef.current.style.transform = ''
    setState('on')
  }, [reduce])

  // Near: start loading. In view: the closed device (the sentinel, which follows the camera) is mostly
  // on screen, so the opening is seen.
  useEffect(() => {
    const root = rootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      setInView(true)
      return undefined
    }
    const nearIo = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true) }, { rootMargin: '600px 0px' })
    // most of the closed device on screen: now; a part of it (the lid rises into view): after a beat
    let loose = 0
    const viewIo = new IntersectionObserver(([e]) => {
      const ratio = e.isIntersecting ? e.intersectionRatio : 0
      if (ratio >= VIEW_MIN) {
        clearTimeout(loose)
        loose = 0
        setInView(true)
      } else if (ratio >= LOOSE) {
        if (!loose) loose = setTimeout(() => { loose = 0; setInView(true) }, LOOSE_MS)
      } else {
        clearTimeout(loose)
        loose = 0
        setInView(false)
      }
    }, { threshold: [0, LOOSE, VIEW_MIN, 1] })
    nearIo.observe(root)
    viewIo.observe(sentinel)
    return () => {
      clearTimeout(loose)
      nearIo.disconnect()
      viewIo.disconnect()
    }
  }, [])

  // Load the sequence (once): the poster stands in for frame 0, frames 1.. stream in order.
  useEffect(() => {
    if (reduce || skip || !near || stateRef.current !== 'closed') return undefined
    const root = rootRef.current
    if (!root) return undefined
    let cancelled = false
    const [cw, ch] = canvasSize(root.clientWidth)
    const set = motionSet(cw)
    const urls = Array.from({ length: manifest.frames }, (_, n) => fileUrl('frame', set, n))
    for (let n = 1; n < PRIMED; n++) preload(urls[n], { as: 'image', fetchPriority: 'high' })
    const s = { frames: new Array(manifest.frames), ready: 0, cw, ch }
    seq.current = s
    const done = new Array(manifest.frames).fill(false)
    const settle = (n, bmp) => {
      if (cancelled) {
        bmp?.close?.()
        return
      }
      s.frames[n] = bmp
      done[n] = true
      while (s.ready < manifest.frames && done[s.ready]) s.ready++
      if (s.ready >= Math.min(PRIMED, manifest.frames)) setPrimed(true)
    }
    const one = (n) => decodeFrame(n === 0 && posterRef.current ? posterRef.current : urls[n], cw, ch)
      .catch(() => (n === 0 ? decodeFrame(urls[0], cw, ch) : null))
    let next = 0
    const worker = async () => {
      while (!cancelled && next < manifest.frames) {
        const n = next++
        const bmp = await one(n).catch(() => null)
        // a frame that failed is skipped (the clock never waits on it); frame 0 must exist
        if (!bmp && n === 0) {
          cancelled = true
          setState('open')
          return
        }
        settle(n, bmp)
      }
    }
    Promise.all(Array.from({ length: 4 }, worker))
    return () => {
      cancelled = true
      seq.current = null
      for (const f of s.frames) f?.close?.()
      setPrimed(false)
    }
  }, [near, reduce, skip])

  // Start the intro once: in view, primed, allowed to play, motion allowed.
  const [go, setGo] = useState(false)
  useEffect(() => {
    if (!reduce && !skip && inView && primed && playing && state === 'closed') setGo(true)
  }, [reduce, skip, inView, primed, playing, state])

  // The lid-opening sequence and the push-in (runs once; only unmounting stops it).
  useEffect(() => {
    if (!go) return undefined
    const s = seq.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!s || !ctx) {
      setState('open')
      return undefined
    }
    let cancelled = false
    let raf = 0
    let t0 = 0
    let drawn = -1
    let lidDone = false
    let restReady = false
    const z0 = zoomRef.current
    const cam = camRef.current
    // the resting scale; the stage gives back the height it frees below the device (the content under
    // it is below the fold when this applies, so nothing visible moves)
    const z1 = endScale(rootRef.current)
    if (z1 < 1) setRest({ z: z1, pull: Math.round((1 - z1) * (rootRef.current?.offsetHeight || 0)) })
    // the rest pose must be decoded before the canvas hands over to it (no blank frame)
    Promise.all([openRef.current, glareRef.current].map((img) => img?.decode?.().catch(() => {}))).then(() => { restReady = true })
    canvas.width = s.cw
    canvas.height = s.ch
    ctx.imageSmoothingQuality = 'high'
    const draw = (i) => {
      // nearest available frame at or below i (a frame that failed to load is skipped)
      let k = i
      while (k > 0 && !s.frames[k]) k--
      if (k === drawn || !s.frames[k]) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(s.frames[k], 0, 0, canvas.width, canvas.height)
      drawn = k
    }
    draw(0)
    setState('opening')
    const tick = (now) => {
      if (cancelled) return
      if (!t0) t0 = now
      let f = (now - t0) / FRAME_MS
      // a late frame holds the clock (lid and camera together) instead of skipping ahead
      const avail = Math.max(0, s.ready - 1)
      if (f > avail && avail < LAST) {
        t0 = now - avail * FRAME_MS
        f = avail
      }
      if (!lidDone) draw(Math.min(LAST, Math.round(f)))
      const z = Math.min(1, (now - t0) / ZOOM_MS)
      if (cam && (z0 < 1 || z1 < 1)) {
        const k = z < 1 ? z0 + (z1 - z0) * zoomEase(z) : z1
        cam.style.transform = k < 1 ? `scale(${k})` : ''
      }
      if (!lidDone && f >= LAST && restReady) {
        lidDone = true
        setState('open')
      }
      if (!lidDone || z < 1) raf = requestAnimationFrame(tick)
      else for (const fr of s.frames) fr?.close?.()
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
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

  const [x0, y0, x1, y1] = CLOSED
  return (
    <motion.div
      ref={rootRef}
      className={['lr', className].filter(Boolean).join(' ')}
      data-state={state}
      data-intro={skip ? 'skipped' : undefined}
      data-rest={rest ? rest.z : undefined}
      style={{ scale, marginBottom: rest ? -rest.pull : undefined, '--lr-aspect': `${manifest.sizes[BIG][0]} / ${manifest.sizes[BIG][1]}`, '--lr-off': manifest.screen.off }}
    >
      <div ref={camRef} className="lr-cam">
        <Picture kind="frame" className="lr-layer lr-poster" priority imgRef={posterRef} />
        <canvas ref={canvasRef} className="lr-layer lr-canvas" aria-hidden="true" />
        <Picture kind="open" className="lr-layer lr-open" imgRef={openRef} />
        <div ref={screenRef} className="lr-screen" role="img" aria-label={label} data-powered={state === 'on' || undefined} style={{ width: SCREEN_W, height: SCREEN_H }}>
          {/* mounted during the black-glass beat (hidden), so its first paint is not the power-on frame */}
          {state === 'open' || state === 'on' ? (
            <div className="lr-screen-content" inert>
              {children}
            </div>
          ) : null}
        </div>
        <Picture kind="glare" className="lr-layer lr-glare" imgRef={glareRef} />
        <span
          ref={sentinelRef}
          className="lr-sentinel"
          aria-hidden="true"
          style={{ left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` }}
        />
      </div>
    </motion.div>
  )
}

export default LaptopRender
