/** Keyboard + open/active state for a listbox combobox (ARIA 1.2 pattern). */

import { useCallback, useState } from 'react'

export default function useCombobox({ count, onSelect, isDisabled = () => false }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const move = useCallback((dir) => {
    if (!count) return
    setOpen(true)
    setActive((a) => {
      let next = a
      for (let i = 0; i < count; i++) {
        next = (next + dir + count) % count
        if (!isDisabled(next)) return next
      }
      return a
    })
  }, [count, isDisabled])

  const onKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Enter') {
      if (open && active >= 0 && active < count && !isDisabled(active)) {
        e.preventDefault()
        onSelect(active)
      }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); setActive(-1) }
    }
  }, [move, open, active, count, onSelect, isDisabled])

  return { open, setOpen, active, setActive, onKeyDown }
}
