/**
 * `import uri from 'some/font.woff2?subset'` -> a base64 data: URI of that font subset to every
 * character found in the source tree (UI strings, i18n, case data) + ASCII. Variation axes are kept.
 * Works in lib mode (where Vite force-inlines assets and ignores assetsInlineLimit).
 */
import fs from 'node:fs'
import path from 'node:path'
import subsetFont from 'subset-font'

function collectText(dir, exts = /\.(jsx?|tsx?|json|html|md)$/) {
  let text = ''
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) text += collectText(p, exts)
    else if (exts.test(e.name)) text += fs.readFileSync(p, 'utf8')
  }
  return text
}

export function fontSubsetImport({ srcDirs = ['src'], extraText = '' } = {}) {
  let ascii = ''
  for (let c = 0x20; c < 0x7f; c++) ascii += String.fromCharCode(c)
  const cache = new Map()
  return {
    name: 'font-subset-import',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (!id.endsWith('.woff2?subset')) return null
      const r = await this.resolve(id.slice(0, -'?subset'.length), importer, { skipSelf: true })
      return r && `\0subset:${r.id}`
    },
    async load(id) {
      if (!id.startsWith('\0subset:')) return null
      const file = id.slice('\0subset:'.length)
      if (!cache.has(file)) {
        const text = ascii + extraText + srcDirs.map((d) => collectText(path.resolve(d))).join('')
        const chars = [...new Set(text)].join('')
        const out = await subsetFont(fs.readFileSync(file), chars, { targetFormat: 'woff2' })
        console.log(`  [font-subset] ${path.basename(file)}: ${(fs.statSync(file).size / 1024).toFixed(0)} kB -> ${(out.length / 1024).toFixed(0)} kB (${chars.length} chars)`)
        cache.set(file, `data:font/woff2;base64,${out.toString('base64')}`)
      }
      return `export default ${JSON.stringify(cache.get(file))}`
    },
  }
}
