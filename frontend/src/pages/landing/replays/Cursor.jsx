/** The replay's pointer: glides to a target point, dips when it "clicks". */
import { motion } from 'motion/react'

export function Cursor({ at, pressing, hidden }) {
  if (!at) return null
  return (
    <motion.div
      className="rp-cursor"
      aria-hidden="true"
      initial={false}
      animate={{ x: at.x - 4, y: at.y - 3, opacity: hidden ? 0 : 1, scale: pressing ? 0.86 : 1 }}
      transition={{ x: { type: 'spring', stiffness: 70, damping: 16 }, y: { type: 'spring', stiffness: 70, damping: 16 }, scale: { duration: 0.12 }, opacity: { duration: 0.3 } }}
    >
      <svg width="26" height="30" viewBox="0 0 26 30">
        <path d="M3 2.5v21.2l5.6-5.2 3.7 8.6 3.8-1.6-3.7-8.4h7.6z" fill="#0A1220" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      {pressing ? <span className="rp-cursor-ring" /> : null}
    </motion.div>
  )
}

export default Cursor
