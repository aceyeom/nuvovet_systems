/**
 * Floating launcher + drawer (`layout: 'floating'`, 1024–1279 px) and the bottom sheet (< 1024 px)
 * (EMR popup spec §2.2, §3.7.4, §3.12).
 *
 * Launcher: bottom-right, 16 px inset, 40 px, 8 px radius, shadow-pop. "DUR · 주의 1" (highest
 * non-zero + count), "DUR · 문제 없음" or "DUR · 검토 불완전". Critical when a contraindicated or
 * major card exists (`data-status`); the fill follows the highest severity's own token
 * (`data-level`): solid red only for 금기, the amber major tint for 중대. It never opens anything
 * or moves focus by itself.
 * Drawer: 380 px over the host's right edge; focus trap only while open; Esc closes and returns
 * focus to the launcher. Sheet: role="dialog", not modal; 48 px bar with the verdict, expands to
 * 70 vh; Esc collapses.
 */

import { useEffect, useId, useRef } from 'react'
import { ChevronUp } from 'lucide-react'
import { Panel } from './Panel.jsx'
import { Badge, SEV_ICON, ic, topSeverity } from './parts.jsx'
import { severityWord, t } from './strings.js'
import { focusables, trapTab } from './focus.js'
import { useWidget } from './WidgetApp.jsx'

let launcherEl = null
let sheetBarEl = null

/** { label, critical, level } for the launcher and the sheet bar. */
export function summaryLabel(response, locale) {
  if (!response) return { label: t(locale, 'launcher.empty'), critical: false, level: null }
  const ext = response.extension
  if (!ext.supported) return { label: t(locale, 'verdict.incomplete'), critical: false, level: 'incomplete' }
  if (ext.empty) return { label: t(locale, 'launcher.empty'), critical: false, level: null }
  const top = topSeverity(response.cards)
  if (top) return { label: `${severityWord(locale, top)} ${ext.counts[top]}`, critical: top === 'contraindicated' || top === 'major', level: top }
  if (!ext.verdict.complete) return { label: t(locale, 'verdict.incomplete'), critical: false, level: 'incomplete' }
  return { label: t(locale, 'launcher.none'), critical: false, level: 'none' }
}

export function Launcher() {
  const { ctl, s, ui, locale } = useWidget()
  const ref = useRef(null)
  const { label, critical, level } = summaryLabel(s.response, locale)
  const Icon = level ? SEV_ICON[level] : null
  useEffect(() => {
    launcherEl = ref.current
    return () => { if (launcherEl === ref.current) launcherEl = null }
  })
  return (
    <button
      ref={ref}
      type="button"
      className="nv-launcher"
      data-status={critical ? 'critical' : 'neutral'}
      data-level={level || undefined}
      data-floating=""
      aria-expanded={ui.drawerOpen}
      aria-controls="nv-drawer"
      onClick={() => ctl.setUi({ drawerOpen: !ui.drawerOpen })}
    >
      {Icon ? <Icon {...ic(16)} /> : null}
      {t(locale, 'launcher', { label })}
    </button>
  )
}

export function Drawer() {
  const { ctl, locale } = useWidget()
  const ref = useRef(null)
  useEffect(() => {
    // Opened by a user action (launcher or badge click): focus the close button unless a reveal
    // is about to focus a card heading.
    const el = ref.current
    const t0 = setTimeout(() => {
      const root = el?.getRootNode()
      if (el && !el.contains(root?.activeElement)) (el.querySelector('[data-nv="close"]') || focusables(el)[0])?.focus()
    }, 0)
    return () => {
      clearTimeout(t0)
      // Closing returns focus to the launcher (§3.7.4).
      const root = el?.getRootNode()
      const focusWasInside = root && el && (el.contains(root.activeElement) || root.activeElement == null)
      if (focusWasInside && launcherEl) setTimeout(() => launcherEl?.focus(), 0)
    }
  }, [])
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      ctl.setUi({ drawerOpen: false })
      return
    }
    if (e.key === 'Tab' && trapTab(e, ref.current, ref.current?.getRootNode())) e.stopPropagation()
  }
  return (
    <div ref={ref} id="nv-drawer" className="nv-drawer" role="dialog" aria-label={t(locale, 'panel.region')} data-floating="" onKeyDown={onKeyDown}>
      <Panel mode="drawer" />
    </div>
  )
}

export function Sheet() {
  const { ctl, s, ui, locale } = useWidget()
  const id = useId()
  const barRef = useRef(null)
  const expanded = ui.sheetExpanded
  const { label, level } = summaryLabel(s.response, locale)
  useEffect(() => {
    sheetBarEl = barRef.current
  })
  const prev = useRef(expanded)
  useEffect(() => {
    if (prev.current && !expanded) {
      const root = barRef.current?.getRootNode()
      if (root && (root.activeElement == null || root.activeElement === document.body)) barRef.current?.focus()
    }
    prev.current = expanded
  }, [expanded])
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && expanded) {
      e.stopPropagation()
      ctl.setUi({ sheetExpanded: false })
      setTimeout(() => sheetBarEl?.focus(), 0)
    }
  }
  return (
    <section className="nv-sheet" role="dialog" aria-modal="false" aria-label={t(locale, 'sheet.label')} data-expanded={expanded ? 'true' : 'false'} data-floating="" onKeyDown={onKeyDown}>
      {!expanded ? (
        <button ref={barRef} type="button" className="nv-sheet-bar" aria-expanded="false" aria-controls={id} onClick={() => ctl.setUi({ sheetExpanded: true })}>
          {level && level !== 'none' && level !== 'incomplete' ? (
            <>
              <Badge status={level} locale={locale} />
              <span className="nv-truncate">{s.response?.extension?.verdict?.action || t(locale, 'launcher', { label })}</span>
            </>
          ) : (
            <span className="nv-truncate">{t(locale, 'launcher', { label })}</span>
          )}
          <ChevronUp className="nv-chev" {...ic(16)} />
        </button>
      ) : (
        <div id={id} className="nv-panel-scope">
          <Panel mode="sheet" />
        </div>
      )}
    </section>
  )
}
