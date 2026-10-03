/**
 * EMR DUR widget bundle (EMR_DUR_POPUP_SPEC.md §7; DESIGN_SYSTEM.md §8.2).
 *
 *   npm run build:widget → dist-widget/nuvovet-dur.iife.js (window.NuvoVetDUR) + dist-widget/nuvovet-dur.js (ESM)
 *   npm run dev:widget   → serves widget-demo/ (http://localhost:5175/)
 *
 * Library mode, one chunk, no Tailwind: the widget ships its own CSS (tokens.css?inline + widget.css?inline)
 * into shadow roots. Skeleton owned by WP0; the plugin block below is owned by WP3.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fontSubsetImport } from './scripts/vite-plugin-font-subset-import.js'

const ROOT = import.meta.dirname
const ENTRY = path.resolve(ROOT, 'src/portfolio/emr/widget/entry.js')

export default defineConfig({
  // ── plugins: owned by WP3 ──────────────────────────────────────────────────────────────────────
  // `import font from '…/PretendardVariable.woff2?subset'` (widget/entry.js) → a data: URI of Pretendard subset
  // to the characters the widget can render (src/portfolio/{engine,knowledge,emr} + ASCII) and pinned to one
  // static weight (wght 400; the browser synthesises 600). The variable font with its weight axis is 140 kB,
  // the static face 60 kB; with the 172 kB of JS (React + engine + knowledge text) only the static face keeps
  // the IIFE inside the 250 kB gzip budget (DESIGN_SYSTEM §9.3). Registered with FontFace at runtime (fonts.js).
  // No Tailwind: the widget ships tokens.css?inline + widget.css?inline into its shadow roots.
  plugins: [
    (() => {
      const cache = new Map()
      const dirs = ['src/portfolio/engine', 'src/portfolio/knowledge', 'src/portfolio/emr'].map((d) => path.resolve(ROOT, d))
      const collect = (dir) => fs.readdirSync(dir, { withFileTypes: true }).map((e) => {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) return e.name === '__tests__' ? '' : collect(p)
        return /\.(jsx?|json)$/.test(e.name) ? fs.readFileSync(p, 'utf8') : ''
      }).join('')
      return {
        name: 'nv-widget-font-subset',
        enforce: 'pre',
        async resolveId(id, importer) {
          if (!id.endsWith('.woff2?subset')) return null
          const r = await this.resolve(id.slice(0, -'?subset'.length), importer, { skipSelf: true })
          return r && `\0nv-subset:${r.id}`
        },
        async load(id) {
          if (!id.startsWith('\0nv-subset:')) return null
          const file = id.slice('\0nv-subset:'.length)
          if (!cache.has(file)) {
            const { default: subsetFont } = await import('subset-font')
            let text = ''
            for (let c = 0x20; c < 0x7f; c++) text += String.fromCharCode(c)
            text += dirs.map(collect).join('')
            const chars = [...new Set(text)].join('')
            const out = await subsetFont(fs.readFileSync(file), chars, { targetFormat: 'woff2', variationAxes: { wght: 400 } })
            console.log(`  [widget-font] ${path.basename(file)}: ${(fs.statSync(file).size / 1024).toFixed(0)} kB -> ${(out.length / 1024).toFixed(0)} kB (${chars.length} chars, wght 400)`)
            cache.set(file, `data:font/woff2;base64,${out.toString('base64')}`)
          }
          return `export default ${JSON.stringify(cache.get(file))}`
        },
      }
    })(),
    react(),
  ],
  // ── end of WP3 block ───────────────────────────────────────────────────────────────────────────
  resolve: { alias: { '@': path.resolve(ROOT, 'src') } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') }, // library mode does not replace it
  publicDir: false,
  root: ROOT,
  server: {
    port: 5175,
    strictPort: true,
    host: 'localhost',
    open: false,
  },
  build: {
    outDir: 'dist-widget',
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    minify: true,
    lib: {
      entry: ENTRY,
      name: 'NuvoVetDUR',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'nuvovet-dur.js' : 'nuvovet-dur.iife.js'),
    },
    rolldownOptions: { output: { codeSplitting: false, exports: 'named' } },
  },
})
