/**
 * Panel layout for the current viewport (EMR popup spec §2.2, §3.2 `layout`).
 *   ≥ 1280 px  docked in the host's panel element (falls back to floating when it is absent)
 *   1024–1279  floating launcher + 380 px drawer
 *   < 1024     bottom sheet
 */
export function resolveLayout(option, width, panelConnected) {
  const o = option || 'auto'
  if (o === 'sheet') return 'sheet'
  // Island: a draggable pill that expands in place (EMR demo default). Phones keep the bottom sheet.
  if (o === 'island') return width < 640 ? 'sheet' : 'island'
  if (o === 'floating') return 'floating'
  if (o === 'docked') return panelConnected ? 'docked' : 'floating'
  if (width < 1024) return 'sheet'
  if (width < 1280) return 'floating'
  return panelConnected ? 'docked' : 'floating'
}
