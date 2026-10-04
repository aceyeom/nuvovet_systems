/**
 * The widget's single React tree (rendered in the overlay host's shadow root). It portals the
 * docked panel into the panel host's shadow root and one RowBadge into each badge slot's shadow
 * root, and renders the launcher/drawer, the bottom sheet, the live region and the gate here.
 */

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { resolveLayout } from './layout.js'
import { Panel } from './Panel.jsx'
import { RowBadge } from './RowBadge.jsx'
import { Launcher, Drawer, Sheet } from './Launcher.jsx'
import { GateDialog } from './GateDialog.jsx'
import { Island } from './Island.jsx'
import { liveSentence } from './strings.js'

const Ctx = createContext(null)
export const useWidget = () => useContext(Ctx)

/** data-theme for .nv-scope: 'system' leaves it unset so tokens.css follows prefers-color-scheme. */
export const themeAttr = (theme) => (theme === 'dark' ? 'dark' : theme === 'system' ? undefined : 'light')

function LiveRegion({ locale, response }) {
  const [text, setText] = useState('')
  const last = useRef({ sentence: '', at: 0, timer: 0 })
  const sentence = liveSentence(locale, response)
  useEffect(() => {
    const L = last.current
    if (!sentence || sentence === L.sentence) return undefined
    const wait = Math.max(0, 1000 - (Date.now() - L.at))
    clearTimeout(L.timer)
    L.timer = setTimeout(() => {
      L.sentence = sentence
      L.at = Date.now()
      setText(sentence)
    }, wait)
    return () => clearTimeout(L.timer)
  }, [sentence])
  return (
    <div className="nv-sr" aria-live="polite" aria-atomic="true">
      {text}
    </div>
  )
}

export function WidgetApp({ ctl }) {
  const snap = useSyncExternalStore(ctl.subscribe, ctl.getSnapshot, ctl.getSnapshot)
  const { core: s, ui } = snap
  const locale = s.locale
  const theme = themeAttr(s.theme)
  const layout = s.mounted ? resolveLayout(s.layout, ui.width, Boolean(ui.panelRoot && ui.panelConnected)) : null
  const value = { ctl, dur: ctl.core, s, ui, locale, layout, theme }
  const response = s.response
  const rowStatus = response?.extension?.rowStatus || {}

  return (
    <Ctx.Provider value={value}>
      <div className="nv-scope nv-overlay-root" data-theme={theme} lang={locale}>
        <LiveRegion locale={locale} response={response} />
        {layout === 'floating' ? (
          <>
            <Launcher />
            {ui.drawerOpen ? <Drawer /> : null}
          </>
        ) : null}
        {layout === 'sheet' ? <Sheet /> : null}
        {layout === 'island' ? <Island /> : null}
        <GateDialog />
      </div>
      {layout === 'docked' && ui.panelRoot
        ? createPortal(
          <div className="nv-scope nv-panel-scope" data-theme={theme} lang={locale}>
            <Panel mode="docked" />
          </div>,
          ui.panelRoot,
          'nv-panel',
        )
        : null}
      {[...ui.slots].map(([rowId, root]) =>
        rowStatus[rowId]
          ? createPortal(
            <span className="nv-scope nv-slot" data-theme={theme} lang={locale}>
              <RowBadge rowId={rowId} status={rowStatus[rowId]} />
            </span>,
            root,
            `slot-${rowId}`,
          )
          : null)}
    </Ctx.Provider>
  )
}
