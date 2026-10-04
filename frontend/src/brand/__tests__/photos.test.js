// Brand photographs: the bundled patient portraits (pets.js), the editorial photos, their credits
// (credits.js / PhotoCredits) and PetAvatar's photo-or-initial rendering.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PETS, petFor } from '../pets.js'
import { PHOTO_CREDITS, creditFor } from '../credits.js'
import { PetAvatar } from '../PetAvatar.jsx'
import { PhotoCredits } from '../PhotoCredits.jsx'
import { PHOTOS } from '../photos.js'

const BRAND_DIR = join(import.meta.dirname, '..')
const FRONTEND = join(BRAND_DIR, '../..')
const webps = (dir) => readdirSync(join(BRAND_DIR, dir)).filter((f) => f.endsWith('.webp')).map((f) => `src/brand/${dir}/${f}`)
const size = (repoPath) => statSync(join(FRONTEND, repoPath)).size
const SHIPPED = [...webps('pets'), ...webps('photos')]
const CHARTS = ['1042', '0877', '1310', '1455', '0921', '1502', '0650', '1388', '1620', '1733']

describe('patient photos (pets.js)', () => {
  it('maps every demo chart to a bundled photo, never a remote URL', () => {
    for (const id of CHARTS) {
      const p = PETS[id]
      expect(p, id).toBeTruthy()
      expect(p.photo, id).toBeTruthy()
      expect(p.photo, id).not.toMatch(/^https?:/)
      if (id !== '1310') expect(p.thumb, id).toBeTruthy()
    }
    expect(PETS['1310'].photo).toMatch(/^data:image\/webp;base64,/)
    expect(readFileSync(join(BRAND_DIR, 'pets.js'), 'utf8')).not.toMatch(/https?:\/\/|unsplash/i)
  })

  it('keeps petFor() for unknown charts (no photo, species from the code)', () => {
    expect(petFor('9999', 'Feline')).toMatchObject({ photo: null, species: 'cat' })
    expect(petFor(undefined, 'Canine')).toMatchObject({ photo: null, species: 'dog' })
    expect(petFor(1042).name).toBe('초코')
  })

  it('keeps every file above Vite\'s 4 kB inline limit (but 나비) and inside its budget', () => {
    // Under 4096 bytes Vite inlines an import into the JS chunk; the standalone build also relies on the
    // portraits being data: URIs there that tree-shake away (pets.js). 나비 is the one inlined on purpose.
    for (const f of SHIPPED) {
      const b = size(f)
      if (f.endsWith('/nabi.webp')) expect(b, f).toBeLessThanOrEqual(9000)
      else expect(b, f).toBeGreaterThan(6000)
      if (f.includes('/pets/')) expect(b, f).toBeLessThanOrEqual(45 * 1024)
      else expect(b, f).toBeLessThanOrEqual(160 * 1024)
    }
  })
})

/** Width and height from a WebP header (VP8, VP8L or VP8X). */
function webpSize(buf) {
  const kind = buf.toString('ascii', 12, 16)
  if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff]
  if (kind === 'VP8L') {
    const b = buf.readUInt32LE(21)
    return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]
  }
  if (kind === 'VP8X') return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1]
  throw new Error(`not a WebP: ${kind}`)
}

describe('editorial photos (photos.js)', () => {
  it('states the real size of each file and credits it', () => {
    for (const [name, p] of Object.entries(PHOTOS)) {
      const file = readdirSync(join(BRAND_DIR, 'photos')).find((f) => p.src.includes(f.replace('.webp', '')))
      expect(file, name).toBeTruthy()
      expect(webpSize(readFileSync(join(BRAND_DIR, 'photos', file))), name).toEqual([p.width, p.height])
      expect(creditFor(p.credit), name).toBeTruthy()
      expect(p.alt, name).toMatch(/[가-힣]/)
    }
    for (const id of CHARTS.filter((c) => c !== '1310')) {
      const f = join(BRAND_DIR, 'pets', `${PETS[id].key}.webp`)
      expect(webpSize(readFileSync(f)), id).toEqual([640, 640])
      expect(webpSize(readFileSync(f.replace('.webp', '-320.webp'))), id).toEqual([320, 320])
    }
  })
})

describe('credits (credits.js)', () => {
  it('credits every shipped photo with title, author, source, licence and changes', () => {
    const credited = new Set(PHOTO_CREDITS.flatMap((c) => c.files))
    for (const f of SHIPPED) expect(credited.has(f), `${f} has no credit`).toBe(true)
    for (const c of PHOTO_CREDITS) {
      for (const f of c.files) expect(existsSync(join(FRONTEND, f)), f).toBe(true)
      expect(c.files).toContain(c.file)
      for (const k of ['title', 'author', 'authorUrl', 'source', 'license', 'licenseUrl', 'changes', 'use']) expect(c[k], `${c.key}.${k}`).toBeTruthy()
      if (c.key === 'nabi') expect(c.license).toBe('CC0 1.0')
      else {
        expect(c.license).toBe('CC BY 2.0')
        expect(c.licenseUrl).toBe('https://creativecommons.org/licenses/by/2.0/')
        expect(c.flickr).toMatch(/^https:\/\/www\.flickr\.com\/photos\//)
        expect(c.source).toBe(c.flickr)
      }
    }
    expect(creditFor('choco').files).toContain('src/brand/photos/choco-portrait.webp')
    expect(creditFor('nope')).toBeNull()
  })

  it('PhotoCredits renders one linked line per photo', () => {
    const out = renderToString(createElement(PhotoCredits, { id: 'credits' }))
    expect(out).toMatch(/^<div class="nvb-credits" data-brand-surface="" id="credits">/)
    expect(out.match(/<li /g)).toHaveLength(PHOTO_CREDITS.length)
    expect(out.match(/rel="license noreferrer"/g)).toHaveLength(PHOTO_CREDITS.length)
    expect(out).toContain('href="https://www.flickr.com/photos/kevinlong/256060907"')
    expect(out).toContain('Kevin Long')
    expect(out).toContain('배경 일부 보정')
    expect(out).not.toMatch(/—|→|\.\.\./)
    expect(renderToString(createElement(PhotoCredits, { note: false }))).not.toContain('nvb-credits-note')
  })
})

describe('PetAvatar', () => {
  const html = (props) => renderToString(createElement(PetAvatar, props))

  it('renders the photo with a 320/640 srcset over the initial tile', () => {
    const out = html({ id: '1042', size: 34, shape: 'square' })
    expect(out).toMatch(/^<span class="nvb-pet" data-shape="square" role="img" aria-label="초코 사진"/)
    expect(out).toContain('<span class="nvb-pet-fallback" aria-hidden="true">초</span>')
    expect(out).toMatch(/<img src="[^"]*choco-320[^"]*\.webp" srcSet="[^"]*choco-320[^"]* 320w, [^"]*choco[^"]*\.webp 640w" sizes="34px"/)
  })

  it('falls back to the first syllable on a neutral tile (no glyph, no icon library)', () => {
    const out = html({ id: '9999', species: 'Canine', name: '구름', size: 44 })
    expect(out).toContain('aria-label="구름 사진"')
    expect(out).toContain('>구</span>')
    expect(out).not.toContain('<img')
    expect(out).not.toContain('<svg')
    const decorative = html({ id: '0877', alt: '' })
    expect(decorative).toContain('aria-hidden="true"')
    expect(decorative).not.toContain('role="img"')
    expect(html({ id: '1310', shape: 'round' })).toContain('data-shape="round"')
  })

  it('imports no icon library in the brand photo files', () => {
    for (const f of ['PetAvatar.jsx', 'PhotoCredits.jsx', 'pets.js', 'credits.js']) {
      expect(readFileSync(join(BRAND_DIR, f), 'utf8'), f).not.toMatch(/lucide-react|react-icons|@heroicons/)
    }
  })
})
