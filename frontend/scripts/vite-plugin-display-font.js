/**
 * Build-time subset of the brand display face (MaruBuri, OFL-1.1; src/brand/fonts/).
 *
 *   import regular from './fonts/MaruBuri-Regular.woff2?display-subset'
 *
 * resolves to a URL of that font cut down to the characters the display face may render: the static
 * copy in src/i18n, src/pages/landing and src/brand (tests excluded), printable ASCII and a few
 * typographic marks. The display face renders static copy only; runtime data (pet names, amounts) is
 * set in Pretendard, so nothing it has to draw can be missing from the subset.
 *
 *   vite build          → an emitted, hashed .woff2 asset; the module exports its URL
 *   vite (dev), vitest  → a data: URL (nothing to serve)
 *   inline: true        → a data: URL in builds too (single-file builds whose CSP only allows data:)
 *
 * The full files are about 820 kB (Regular) and 890 kB (SemiBold); the subsets about 50–60 kB each.
 * The subset is computed once per character set; in dev, an edit that adds a character to the scanned
 * copy cuts the subsets again and reloads the page.
 */
import fs from 'node:fs'
import path from 'node:path'

const QUERY = '?display-subset'
const PREFIX = '\0nv-display-font:'
// Typographic marks the brand copy may use beyond what the source scan finds.
const EXTRA = '†‡§·–‘’“”'
// Default shaping plus the figure and position features the brand type uses (tnum for aligned
// figures, sups for evidence markers, case, fractions). Drops aalt/fwid/vert, which pull in
// full-width and vertical alternates of every kept character.
const FEATURES = ['ccmp', 'locl', 'liga', 'kern', 'case', 'tnum', 'sups', 'frac', 'numr', 'dnom']

function collectText(dir) {
  if (!fs.existsSync(dir)) return ''
  let text = ''
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') text += collectText(p)
    } else if (/\.(jsx?|mjs|json)$/.test(e.name) && !/\.test\./.test(e.name)) {
      text += fs.readFileSync(p, 'utf8')
    }
  }
  return text
}

/** The characters to keep: ASCII, the extra marks and every character of the scanned copy. */
export function displayCharacters(root, dirs, extra = EXTRA) {
  let text = extra
  for (let c = 0x20; c < 0x7f; c++) text += String.fromCharCode(c)
  for (const d of dirs) text += collectText(path.resolve(root, d))
  // Drop control characters and line breaks; keep everything printable.
  return [...new Set(text)].filter((ch) => ch.codePointAt(0) >= 0x20).sort().join('')
}

// `dirs` resolve against the frontend root (this file's parent folder), whatever the Vite root is.
const ROOT = path.resolve(import.meta.dirname, '..')

export function displayFontSubset({ root = ROOT, dirs = ['src/i18n', 'src/pages/landing', 'src/brand'], extra = EXTRA, inline = false, log = true } = {}) {
  let build = false
  let chars = null // the character set the cached subsets were cut to
  const cache = new Map() // font file -> Promise<Buffer>

  function currentChars() {
    if (chars === null) chars = displayCharacters(root, dirs, extra)
    return chars
  }

  function subset(file) {
    if (!cache.has(file)) {
      const keep = currentChars()
      cache.set(file, (async () => {
        const { default: subsetFont } = await import('subset-font')
        const out = await subsetFont(fs.readFileSync(file), keep, { targetFormat: 'woff2', keepFeatures: FEATURES })
        if (log && build) {
          const hangul = [...keep].filter((c) => c >= '가' && c <= '힣').length
          console.log(`  [display-font] ${path.basename(file)}: ${(fs.statSync(file).size / 1024).toFixed(0)} kB -> ${(out.length / 1024).toFixed(0)} kB (${keep.length} chars, ${hangul} Hangul syllables)`)
        }
        return out
      })())
    }
    return cache.get(file)
  }

  return {
    name: 'nv-display-font-subset',
    enforce: 'pre',
    configResolved(config) {
      build = config.command === 'build'
    },
    // Dev: when edited copy brings a character the subset lacks, cut the subsets again and reload the page.
    configureServer(server) {
      const scanned = dirs.map((d) => path.resolve(root, d) + path.sep)
      const onChange = (file) => {
        if (!/\.(jsx?|mjs|json)$/.test(file) || !scanned.some((d) => file.startsWith(d))) return
        const next = displayCharacters(root, dirs, extra)
        if (chars === null || next === chars) return
        chars = next
        cache.clear()
        const graph = server.environments?.client?.moduleGraph ?? server.moduleGraph
        let stale = false
        for (const mod of [...(graph.idToModuleMap?.values() ?? [])]) {
          if (mod.id?.startsWith(PREFIX)) {
            graph.invalidateModule(mod)
            stale = true
          }
        }
        if (stale) server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
    },
    async resolveId(id, importer) {
      if (!id.endsWith(QUERY)) return null
      const r = await this.resolve(id.slice(0, -QUERY.length), importer, { skipSelf: true })
      return r ? PREFIX + r.id.split('?')[0] : null
    },
    async load(id) {
      if (!id.startsWith(PREFIX)) return null
      const file = id.slice(PREFIX.length).split('?')[0]
      const out = await subset(file)
      if (build && !inline) {
        const ref = this.emitFile({ type: 'asset', name: path.basename(file), source: out })
        return `export default import.meta.ROLLUP_FILE_URL_${ref}`
      }
      return `export default ${JSON.stringify(`data:font/woff2;base64,${out.toString('base64')}`)}`
    },
  }
}

export default displayFontSubset
