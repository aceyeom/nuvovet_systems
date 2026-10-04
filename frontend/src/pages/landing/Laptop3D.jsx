/**
 * A laptop drawn in CSS 3D (no WebGL): a lid hinged on a keyboard deck. On first view it rises in
 * closed (the nuvovet mark on the lid), the lid swings open, the screen powers on, and then the
 * screen plays `children`. Scroll leans it towards the reader; the pointer tilts it a little.
 *
 * Geometry: the group is turned −B° about X (camera above), the lid opens to +B° so the screen
 * faces the reader. Closed lid = −90° (lying on the deck). The screen content is laid out at a
 * fixed virtual size (VW × VH) and scaled to the screen, so the replays stay pixel-crisp.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { BrandMark } from '@/brand/Brand'

export const VW = 1200
export const VH = 750
const BASE_TILT = 20

const KEY_ROWS = [14, 14, 13, 12, 9]

function Keyboard() {
  return (
    <div className="lp-keys" aria-hidden="true">
      {KEY_ROWS.map((n, r) => (
        <div key={r} className="lp-keyrow" data-row={r}>
          {Array.from({ length: n }, (_, i) => <span key={i} className="lp-key" data-w={r === 4 && i === 4 ? 'space' : undefined} />)}
        </div>
      ))}
    </div>
  )
}

/** Scale factor for the virtual screen, from the rendered screen width. */
function useScreenScale(ref) {
  const [scale, setScale] = useState(0.7)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const set = () => setScale(el.clientWidth / VW)
    set()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return scale
}

export function Laptop3D({ children, onPowered, label, accent = 'dur', sectionRef }) {
  const reduce = useReducedMotion()
  const screenRef = useRef(null)
  const scale = useScreenScale(screenRef)
  const [powered, setPowered] = useState(Boolean(reduce))

  // Lid: −90 (closed) → +BASE_TILT (open).
  const lid = useMotionValue(reduce ? BASE_TILT : -90)
  const lidSpring = useSpring(lid, { stiffness: 38, damping: 13, mass: 1.1 })
  const glow = useTransform(lidSpring, [-60, BASE_TILT], [0, 1])
  const boot = useTransform(glow, [0, 0.85, 1], [0, 0.9, 0])

  // Scroll: the laptop leans towards the reader and grows a little as the hero scrolls away.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const scrollTilt = useTransform(scrollYProgress, [0, 0.6], [-BASE_TILT, -6])
  // Starts smaller so the whole lid sweep happens above the fold, then zooms in with the scroll.
  const zoom = useTransform(scrollYProgress, [0, 0.38], reduce ? [1, 1] : [0.74, 1])

  // Pointer tilt.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotY = useSpring(useTransform(px, [-1, 1], [-7, 7]), { stiffness: 60, damping: 18 })
  const rotXp = useSpring(useTransform(py, [-1, 1], [2.5, -2.5]), { stiffness: 60, damping: 18 })
  const rotX = useTransform([scrollTilt, rotXp], ([a, b]) => a + b)

  useEffect(() => {
    if (reduce) return undefined
    const t1 = setTimeout(() => lid.set(BASE_TILT), 900)
    const unsub = lidSpring.on('change', (v) => {
      if (v > -12 && !powered) {
        setPowered(true)
      }
    })
    return () => {
      clearTimeout(t1)
      unsub()
    }
  }, [reduce]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (powered) onPowered?.() }, [powered]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (reduce) return undefined
    const on = (e) => {
      px.set((e.clientX / window.innerWidth) * 2 - 1)
      py.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => window.removeEventListener('pointermove', on)
  }, [reduce, px, py])

  return (
    <motion.div className="lp-laptop-wrap" data-accent={accent} style={{ scale: zoom, transformOrigin: '50% 0%' }}>
      <motion.div
        className="lp-laptop"
        initial={reduce ? false : { opacity: 0, y: 70 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ rotateX: rotX, rotateY: rotY }}
      >
        <motion.div className="lp-lid" style={{ rotateX: lidSpring }}>
          <div className="lp-lid-back" aria-hidden="true">
            <BrandMark className="lp-lid-logo" />
          </div>
          <div className="lp-bezel">
            <span className="lp-cam" aria-hidden="true" />
            <div className="lp-screen" ref={screenRef} role="img" aria-label={label} data-powered={powered || undefined}>
              <div className="lp-screen-inner" style={{ width: VW, height: VH, transform: `scale(${scale})` }}>
                {powered ? children : null}
              </div>
              <motion.span className="lp-boot" aria-hidden="true" style={{ opacity: boot }} />
              <span className="lp-glare" aria-hidden="true" />
            </div>
          </div>
        </motion.div>
        <div className="lp-deck" aria-hidden="true">
          <div className="lp-deck-top">
            <span className="lp-hinge" />
            <Keyboard />
            <span className="lp-pad" />
          </div>
          <span className="lp-deck-lip" />
        </div>
        <motion.span className="lp-floor" aria-hidden="true" style={{ opacity: glow }} />
      </motion.div>
    </motion.div>
  )
}

export default Laptop3D
