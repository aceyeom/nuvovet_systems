import { useCallback, useRef } from 'react'

/**
 * Focus return for Dialog / AlertDialog / Sheet content (§9.5: focus goes back where it came from).
 * Radix only returns focus to a DialogTrigger; a dialog opened from state (a shortcut, a button that
 * sets `open`, a row action) would leave focus on <body>. The content's onOpenAutoFocus records the
 * element that had focus at that moment (still the opener), and onCloseAutoFocus focuses it again,
 * unless the caller's own handler prevented the default. With nothing useful to return to, Radix's
 * default (the trigger, if any) stays in charge.
 *
 *   const focus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus })
 *   <DialogPrimitive.Content onOpenAutoFocus={focus.onOpenAutoFocus} onCloseAutoFocus={focus.onCloseAutoFocus} />
 */
export function useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus } = {}) {
  const opener = useRef(null)
  const onOpen = useCallback(
    (event) => {
      opener.current = typeof document === 'undefined' ? null : document.activeElement
      onOpenAutoFocus?.(event)
    },
    [onOpenAutoFocus],
  )
  const onClose = useCallback(
    (event) => {
      onCloseAutoFocus?.(event)
      const el = opener.current
      opener.current = null
      if (event.defaultPrevented) return
      if (!el || el === document.body || !el.isConnected || typeof el.focus !== 'function') return
      event.preventDefault()
      el.focus({ preventScroll: true })
    },
    [onCloseAutoFocus],
  )
  return { onOpenAutoFocus: onOpen, onCloseAutoFocus: onClose }
}
