/**
 * Standalone build of the portfolio DUR showcase.
 *
 *   npm run build:portfolio  → dist-portfolio/index.html (one self-contained file)
 *   npm run dev:portfolio    → http://localhost:5174/ (serves portfolio.html)
 *
 * Browsers refuse to load module scripts and dynamic-import chunks from
 * file:// URLs, so the build is a single chunk (code splitting off) and the
 * script and stylesheet are inlined into the HTML. The result opens by
 * double-click, from any static host, or as an e-mail attachment.
 *
 * The built page also carries a Content-Security-Policy that forbids every
 * network request (connect, img, font, frame…), which enforces the
 * showcase's "no network at runtime" rule in the browser itself.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { subsetFonts } from './scripts/vite-plugin-subset-fonts.js'

// Standalone budget (DESIGN_SYSTEM §9.3: 450 kB gzip for the one file). The showcase sets Pretendard at
// 400, 500 and 600 only, and its OpenType use is tnum/zero (.num), ss06 (base.css) and case. Keeping
// the weight axis at 400–600 and only these features (plus the default shaping set) takes the
// inlined subset from about 158 kB to 100 kB while it stays a variable font with real 500/600.
// fonts-standalone.css declares the same 400–600 range.
const FONT_WEIGHTS = { min: 400, max: 600 }
const FONT_FEATURES = [
  // default shaping (Latin + Hangul jamo composition)
  'ccmp', 'locl', 'mark', 'mkmk', 'kern', 'liga', 'calt', 'rlig', 'rvrn', 'ljmo', 'vjmo', 'tjmo',
  // used by the CSS
  'tnum', 'zero', 'ss06', 'case',
]

const ENTRY = 'portfolio.html'
const OUT_HTML = 'index.html'

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  'font-src data:', // the subset Pretendard is inlined as a data: URI
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

/** Escape a closing tag that would end the inline element early. */
function safeInline(code, tag) {
  return code.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`)
}

/** Dev server: serve the showcase at / instead of the main app's index.html. */
function servePortfolioAtRoot() {
  return {
    name: 'portfolio-dev-root',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') req.url = `/${ENTRY}`
        next()
      })
    },
  }
}

/**
 * src/ui/app.css scans only part of src/ui (its `@source not` lines). Fail the build when a bundled
 * module sits under one of those paths: Tailwind would not have generated its classes.
 */
function guardTailwindSources() {
  const appCss = path.resolve(import.meta.dirname, 'src/ui/app.css')
  return {
    name: 'portfolio-guard-tailwind-sources',
    apply: 'build',
    generateBundle(_options, bundle) {
      // Only the size exclusions inside src/ui are guarded; the widget is excluded on purpose (it ships
      // its own CSS into shadow roots).
      const uiDir = path.dirname(appCss)
      const excluded = [...fs.readFileSync(appCss, 'utf8').matchAll(/^@source not "([^"]+)"/gm)]
        .map((m) => path.resolve(uiDir, m[1]))
        .filter((x) => x.startsWith(uiDir + path.sep))
      const bad = new Set()
      for (const f of Object.values(bundle)) {
        if (f.type !== 'chunk') continue
        for (const id of Object.keys(f.modules)) {
          const file = id.split('?')[0]
          const hit = excluded.find((x) => file === x || file.startsWith(x + path.sep))
          if (hit && !/\.css$/.test(file)) bad.add(`${path.relative(import.meta.dirname, file)} (excluded by ${path.relative(import.meta.dirname, hit)})`)
        }
      }
      if (bad.size) this.error(`src/ui/app.css does not scan modules the showcase bundles; remove their @source not line:\n  ${[...bad].join('\n  ')}`)
    },
  }
}

function inlineSingleFile() {
  /** Inline the entry's script and stylesheet into the HTML; return the new HTML. */
  function inline(ctx, bundle) {
    const htmlAsset = bundle[ENTRY]
    if (!htmlAsset || htmlAsset.type !== 'asset') ctx.error(`${ENTRY} was not emitted`)
    let html = String(htmlAsset.source)
    const inlined = new Set()

    // <script type="module" crossorigin src="./assets/x.js"></script> → inline module script
    html = html.replace(/<script\b[^>]*\bsrc="(?:\.\/)?([^"]+\.js)"[^>]*><\/script>/g, (tag, file) => {
      const chunk = bundle[file]
      if (!chunk || chunk.type !== 'chunk') return tag
      inlined.add(file)
      return `<script type="module">${safeInline(chunk.code, 'script')}</script>`
    })

    // <link rel="stylesheet" crossorigin href="./assets/x.css"> → <style>
    html = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(?:\.\/)?([^"]+\.css)"[^>]*>/g, (tag, file) => {
      const asset = bundle[file]
      if (!asset || asset.type !== 'asset') return tag
      inlined.add(file)
      return `<style>${safeInline(String(asset.source), 'style')}</style>`
    })

    // A single chunk needs no preload hints.
    html = html.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>\s*/g, '')

    // Enforce "no network" in the browser itself.
    // (after the charset declaration, which must stay first).
    const csp = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`
    html = /<meta charset="[^"]*"\s*\/?>/i.test(html)
      ? html.replace(/<meta charset="[^"]*"\s*\/?>/i, (m) => `${m}\n    ${csp}`)
      : html.replace(/<head>/i, `<head>\n    ${csp}`)

    for (const file of inlined) delete bundle[file]
    const leftovers = Object.keys(bundle).filter((f) => f !== ENTRY && !f.endsWith('.map'))
    // Anything left would be fetched at runtime, which file:// pages cannot do.
    if (leftovers.length) ctx.error(`not inlined (would break file://): ${leftovers.join(', ')}`)
    return html
  }

  return {
    name: 'portfolio-inline-single-file',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      // After Vite's own generateBundle hooks (HTML emit, preload-marker replacement).
      order: 'post',
      handler(_options, bundle) {
        const html = inline(this, bundle)
        delete bundle[ENTRY]
        this.emitFile({ type: 'asset', fileName: OUT_HTML, source: html })
      },
    },
  }
}

export default defineConfig({
  // subsetFonts() must run before inlineSingleFile() (both are post generateBundle hooks).
  plugins: [react(), tailwindcss(), servePortfolioAtRoot(), guardTailwindSources(), subsetFonts({ variationAxes: { wght: FONT_WEIGHTS }, keepFeatures: FONT_FEATURES }), inlineSingleFile()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  base: './',
  // No public/ copy: the main app's favicon and anatomy images are not part of the showcase.
  publicDir: false,
  build: {
    outDir: 'dist-portfolio',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    // Fonts are emitted as files so subsetFonts() can cut them down, then inlined as data: URIs.
    assetsInlineLimit: (file, content) => (file.endsWith('.woff2') ? false : content.length < 100000),
    rolldownOptions: {
      input: ENTRY,
      output: { codeSplitting: false },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: 'localhost',
    open: false,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
})
