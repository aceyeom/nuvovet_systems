/**
 * IIFE / ESM entry of the standalone widget bundle (EMR popup spec §3.1, §7):
 *   npm run build:widget → dist-widget/nuvovet-dur.iife.js (window.NuvoVetDUR) + dist-widget/nuvovet-dur.js (ESM)
 *
 * Third-party pages have no demo bar, so the bundle defaults to `fonts: 'inject'` (the subset
 * Pretendard bytes below, registered with the FontFace API under "NuvoVet Pretendard") and
 * `marker: true` (the panel-footer 교육용 프로토타입 marker). The `?subset` import resolves only in
 * the widget build (vite.widget.config.js, fontSubsetImport); the in-app demo imports index.jsx.
 */
import pretendardSubset from 'pretendard/dist/web/variable/woff2/PretendardVariable.woff2?subset'
import { createDurWidget, WIDGET_VERSION } from './index.jsx'

export const version = WIDGET_VERSION

export function create(options = {}) {
  return createDurWidget({
    fonts: 'inject',
    marker: true,
    ...options,
    fontSource: options.fontSource ?? pretendardSubset,
  })
}

if (typeof window !== 'undefined' && !window.NuvoVetDUR) window.NuvoVetDUR = { create, version }
