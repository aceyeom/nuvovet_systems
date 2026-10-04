#!/usr/bin/env node
/*
 * Offline render of the landing laptop → frontend/public/render/laptop/.
 *
 *   cd frontend/scripts/render && npm install && node render.mjs            full set (both widths, ~1.5 h on SwiftShader)
 *   node render.mjs --widths 1000                                           one width
 *   node render.mjs --only 3-13                                             re-render some sequence frames, then encode
 *   node render.mjs --encode-only                                           WebP + manifests from the cache only
 *   node render.mjs --still 0,109 --width 1100 --ss 1 --samples 4 --out a.png --sheet s.png   look-dev stills
 *        (--mode beauty|open|glare, --variants '[{…}]' --rows for A/B rows, --cfg '{…}' look overrides)
 *   node render.mjs --receipt                                               receipt still-life (optional)
 *   node render.mjs --receipt --still --width 600 --out r.png               receipt look dev
 *
 * Needs the global Playwright module (Chromium). WebGL2 runs on SwiftShader, so the result is
 * deterministic and needs no GPU. three + sharp live in this folder's own package.json and never
 * enter the app bundle. Renders are cached losslessly (RENDER_CACHE, default $TMPDIR/nuvovet-render-cache)
 * so encoding can be redone without rendering.
 *
 * Scene: src/scene.js (laptop scene + modes), src/laptop.js (geometry, keyboard, materials),
 * src/studio.js (environment), src/nearfield.js (near-field soft cards), src/occlusion.js (analytic
 * ground shadow + lid occlusion), src/core.js (jittered accumulation, tone mapping), src/receipt.js.
 *
 * Outputs (per width w):
 *   seq-{w}/frame-00..NN.webp   lid-opening sequence, transparent, screen off (black glass); the
 *                               in-between frames carry baked motion blur (SHUTTER)
 *   open-{w}.webp               final pose, the screen area without reflections (the DOM covers it)
 *   glare-{w}.webp              the glass reflection over the screen area (white, alpha = reflection)
 *   manifest.json               widths, frames, aspect, exact screen corners (normalised, top-left origin)
 *   receipt-{w}.webp            (--receipt) opaque still-life for the Claims chapter, 3:2
 * and src/pages/landing/laptopManifest.json, the subset LaptopRender.jsx imports.
 */
import http from 'node:http'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const HERE = path.dirname(new URL(import.meta.url).pathname)
const FRONTEND = path.resolve(HERE, '../..')
const OUT_DIR = process.env.RENDER_OUT || path.join(FRONTEND, 'public/render/laptop')
const SRC_MANIFEST = process.env.RENDER_OUT ? path.join(process.env.RENDER_OUT, 'laptopManifest.json') : path.join(FRONTEND, 'src/pages/landing/laptopManifest.json')
const CACHE = process.env.RENDER_CACHE || path.join(os.tmpdir(), 'nuvovet-render-cache')

/* ------------------------------------------------------------------ settings */
export const LOOK = {
  view: { elev: 19, yaw: 0, dist: 13, lateral: 0, rise: 0, aspect: 1.25, margin: { l: 0.02, r: 0.02, t: 0.02, b: 0.05 } },
  openDeg: 109, // = 90 + elev: the panel is parallel to the sensor, so the screen is an exact rectangle
}
const SIZES = {
  2200: { ss: 2, samples: 16, samplesSeq: 10, quality: { seq: 62, rest: 80, alpha: 80, glare: 70 } },
  1000: { ss: 2.5, samples: 16, samplesSeq: 10, quality: { seq: 66, rest: 82, alpha: 85, glare: 70 } },
}
const FRAMES = 24
const DURATION_MS = 1200
// motion blur: each in-between frame integrates the lid over this fraction of the frame interval
// (a 180° shutter); fast frames get more samples so the blur stays smooth (≈ one sample per 4.5 px of
// travel of the lid's top edge)
const SHUTTER = 0.5
function blurSamples(range, width, base) {
  const travelPx = (Math.abs(range[1] - range[0]) * Math.PI) / 180 * 2.03 * ((width * 0.7) / 3.1)
  return Math.max(base, Math.min(32, Math.ceil(travelPx / 4.5)))
}
// ease-out spacing (cubic-bezier 0.3, 0, 0.25, 1): a short lift, then a long, soft settle
const EASE = [0.3, 0, 0.25, 1]

/* ------------------------------------------------------------------ args */
const argv = process.argv.slice(2)
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`)
  return i < 0 ? d : argv[i + 1]
}
const has = (k) => argv.includes(`--${k}`)
const PORT = Number(process.env.RENDER_PORT || arg('port', 5252))

/* ------------------------------------------------------------------ server */
const ROUTES = [
  ['/three/', path.join(HERE, 'node_modules/three/')],
  ['/fonts/', path.join(FRONTEND, 'node_modules/pretendard/dist/web/static/woff2/')],
  ['/brand/', path.join(FRONTEND, 'src/brand/')],
  ['/claim/', path.join(FRONTEND, 'src/pages/insurance/preview/')],
  ['/src/', path.join(HERE, 'src/')],
  ['/', HERE + '/'],
]
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.json': 'application/json' }
const pending = new Map()
function waitFor(name) {
  return new Promise((resolve) => pending.set(name, resolve))
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (req.method === 'POST' && url.pathname === '/__out') {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const name = url.searchParams.get('name')
      const w = Number(url.searchParams.get('w'))
      const h = Number(url.searchParams.get('h'))
      const fn = pending.get(name)
      pending.delete(name)
      fn?.({ buf: Buffer.concat(chunks), w, h })
      res.writeHead(204)
      res.end()
    })
    return
  }
  let p = url.pathname === '/' ? '/index.html' : url.pathname
  const route = ROUTES.find(([pre]) => p.startsWith(pre))
  const file = path.join(route[1], p.slice(route[0].length))
  if (!file.startsWith(route[1]) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404)
    res.end()
    return
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
  fs.createReadStream(file).pipe(res)
})

/* ------------------------------------------------------------------ helpers */
function bezier([x1, y1, x2, y2]) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const X = (t) => ((ax * t + bx) * t + cx) * t
  const Y = (t) => ((ay * t + by) * t + cy) * t
  return (x) => {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2
      if (X(m) < x) lo = m
      else hi = m
    }
    return Y((lo + hi) / 2)
  }
}

function raw({ buf, w, h }) {
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).flip()
}

/**
 * Glare: the glass reflection over the screen area as a white overlay whose alpha is the reflected
 * luminance. The reflection is a soft gradient, so it is smoothed (normalised convolution, clipped
 * back to the exact screen coverage) to drop the render's dither noise — 15 kB instead of 220 kB.
 */
async function encodeGlare(src, file, quality) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const n = info.width * info.height
  const lum = Buffer.alloc(n)
  const cov = Buffer.alloc(n)
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    cov[p] = data[i + 3]
    lum[p] = Math.round(((data[i] + data[i + 1] + data[i + 2]) / 3) * (data[i + 3] / 255))
  }
  const one = { raw: { width: info.width, height: info.height, channels: 1 } }
  const sigma = Math.max(2, info.width / 360)
  const lumB = await sharp(lum, one).blur(sigma).extractChannel(0).raw().toBuffer()
  const covB = await sharp(cov, one).blur(sigma).extractChannel(0).raw().toBuffer()
  const out = Buffer.alloc(n * 4)
  for (let p = 0; p < n; p++) {
    out[p * 4] = out[p * 4 + 1] = out[p * 4 + 2] = 255
    out[p * 4 + 3] = cov[p] ? Math.round((lumB[p] / Math.max(covB[p], 1)) * cov[p]) : 0
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ quality, alphaQuality: 100, effort: 6 }).toFile(file)
  return fs.statSync(file).size
}

async function screenOffColour(shot, corners) {
  // average straight colour of the open frame in the middle of the screen
  const { data, info } = await raw(shot).raw().toBuffer({ resolveWithObject: true })
  const [tl, , br] = corners
  const x0 = Math.round(((tl[0] + br[0]) / 2 - 0.1) * info.width)
  const x1 = Math.round(((tl[0] + br[0]) / 2 + 0.1) * info.width)
  const y0 = Math.round(((tl[1] + br[1]) / 2 - 0.05) * info.height)
  const y1 = Math.round(((tl[1] + br[1]) / 2 + 0.05) * info.height)
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * info.width + x) * 4
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      n++
    }
  }
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/* ------------------------------------------------------------------ receipt still-life */
const RECEIPT = { widths: [1200, 720], aspect: 1.5, ss: 2, samples: 16, quality: 82 }
async function receipt(page) {
  await page.goto(`http://127.0.0.1:${PORT}/receipt.html`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 })
  const cfg = JSON.parse(arg('cfg', '{}'))
  console.log('init', JSON.stringify(await page.evaluate((c) => window.RR.init(c), cfg)))
  const widths = has('still') ? [Number(arg('width', 600))] : RECEIPT.widths
  for (const width of widths) {
    const height = Math.round(width / RECEIPT.aspect)
    const name = `receipt-${width}`
    const got = waitFor(name)
    const t = await page.evaluate((o) => window.RR.render(o), { width, ss: has('still') ? Number(arg('ss', 1)) : RECEIPT.ss, samples: has('still') ? Number(arg('samples', 4)) : RECEIPT.samples, name })
    const shot = await got
    if (has('still')) {
      await raw(shot).resize(width, height, { kernel: 'lanczos3', fit: 'fill' }).flatten({ background: '#ffffff' }).png().toFile(arg('out', 'receipt.png'))
      console.log('still', arg('out', 'receipt.png'), t.ms, 'ms')
    } else {
      const file = path.join(OUT_DIR, `receipt-${width}.webp`)
      await raw(shot).resize(width, height, { kernel: 'lanczos3', fit: 'fill' }).flatten({ background: '#ffffff' }).webp({ quality: RECEIPT.quality, effort: 6, smartSubsample: true }).toFile(file)
      console.log(`receipt-${width}.webp ${t.ms} ms ${(fs.statSync(file).size / 1024).toFixed(1)} KB`)
    }
  }
}

/** Step 2 of the full set: WebP + manifests from the lossless cache (see main). */
async function encodeAll(widths) {
  widths = widths || arg('widths', '2200,1000').split(',').map(Number)
  const meta = JSON.parse(fs.readFileSync(path.join(CACHE, 'meta.json'), 'utf8'))
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const manifestPath = path.join(OUT_DIR, 'manifest.json')
  const prev = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {}
  const bytes = { ...(prev.bytes || {}) }
  const fromCache = (name, width) => sharp(path.join(CACHE, `${name}-${width}.png`))
  for (const width of widths) {
    const S = SIZES[width] || SIZES[2200]
    const dir = path.join(OUT_DIR, `seq-${width}`)
    fs.mkdirSync(dir, { recursive: true })
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f))
    let total = 0
    let largest = 0
    for (let k = 0; k < meta.frames; k++) {
      const name = `frame-${String(k).padStart(2, '0')}`
      const file = path.join(dir, `${name}.webp`)
      const q = k === 0 || k === meta.frames - 1 ? S.quality.rest : S.quality.seq
      await fromCache(name, width).webp({ quality: q, alphaQuality: S.quality.alpha, effort: 6, smartSubsample: true }).toFile(file)
      const size = fs.statSync(file).size
      total += size
      largest = Math.max(largest, size)
    }
    bytes[`seq-${width}`] = total
    bytes[`seq-${width}-largest`] = largest
    const openFile = path.join(OUT_DIR, `open-${width}.webp`)
    await fromCache('open', width).webp({ quality: S.quality.rest, alphaQuality: S.quality.alpha, effort: 6, smartSubsample: true }).toFile(openFile)
    bytes[`open-${width}`] = fs.statSync(openFile).size
    const glareFile = path.join(OUT_DIR, `glare-${width}.webp`)
    bytes[`glare-${width}`] = await encodeGlare(path.join(CACHE, `glare-${width}.png`), glareFile, S.quality.glare)
    console.log(`encoded ${width}: seq ${(total / 1024).toFixed(0)} KB (largest ${(largest / 1024).toFixed(1)} KB), open ${(bytes[`open-${width}`] / 1024).toFixed(1)} KB, glare ${(bytes[`glare-${width}`] / 1024).toFixed(1)} KB`)
  }
  const corners = meta.corners
  const allWidths = [...new Set([...(prev.widths || []), ...widths])].sort((x, y) => y - x)
  const manifest = {
    version: 1,
    widths: allWidths,
    sizes: Object.fromEntries(allWidths.map((w) => [w, [w, Math.round(w / meta.view.aspect)]])),
    aspect: meta.view.aspect,
    frames: meta.frames,
    durationMs: DURATION_MS,
    ease: EASE,
    angles: meta.angles,
    poster: 'closed',
    files: { frame: 'seq-{w}/frame-{nn}.webp', open: 'open-{w}.webp', glare: 'glare-{w}.webp' },
    screen: {
      w: 1200,
      h: 750,
      tl: corners[0].map((v) => +v.toFixed(6)),
      tr: corners[1].map((v) => +v.toFixed(6)),
      br: corners[2].map((v) => +v.toFixed(6)),
      bl: corners[3].map((v) => +v.toFixed(6)),
      off: meta.off,
    },
    bytes,
    view: meta.view,
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  // the runtime component imports the fields it needs from a copy beside it (public/ can't be imported)
  const { version, widths: ws, sizes, aspect, frames: n, durationMs, poster, files, screen } = manifest
  fs.writeFileSync(SRC_MANIFEST, JSON.stringify({ version, widths: ws, sizes, aspect, frames: n, durationMs, poster, files, screen }, null, 2) + '\n')
  console.log('manifest', JSON.stringify(manifest.screen))
}

/* ------------------------------------------------------------------ main */
async function main() {
  if (has('encode-only')) {
    await encodeAll()
    return
  }
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r))
  const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright')
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=8192'] })
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } })
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()) })
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  if (has('receipt')) {
    await receipt(page)
    await browser.close()
    server.close()
    return
  }
  await page.goto(`http://127.0.0.1:${PORT}/`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 })
  const cfg = JSON.parse(arg('cfg', '{}'))
  const tInit = Date.now()
  const info = await page.evaluate((c) => window.R.init(c), cfg)
  if (has('timing')) console.log('init ms', Date.now() - tInit)
  console.log('init', JSON.stringify({ renderer: info.renderer, maxTex: info.maxTex, monogram: info.monogram }))
  const view = { ...LOOK.view, ...(cfg.view || {}), openDeg: Number(arg('open', cfg.openDeg || LOOK.openDeg)) }
  await page.evaluate((v) => window.R.frame(v), view)

  const shoot = async (opts) => {
    const name = `${opts.mode || 'beauty'}-${opts.openDeg}-${opts.width}-${Math.random().toString(36).slice(2, 8)}`
    const got = waitFor(name)
    const t = await page.evaluate((o) => window.R.render(o), { ...opts, name, shadow: cfg.shadow, exposure: cfg.exposure })
    const shot = await got
    if (has('timing')) console.log('timing', JSON.stringify(t))
    return { shot, ms: t.ms }
  }

  if (has('warm')) {
    const { ms } = await shoot({ width: 200, ss: 1, samples: 1, openDeg: view.openDeg })
    console.log('warm-up ms', ms)
  }
  if (has('env')) {
    const [yaw, pitch] = arg('env').split(',').map(Number)
    await page.setViewportSize({ width: 1000, height: 500 })
    await page.evaluate((o) => window.R.envView(o), { width: 1000, height: 500, yaw, pitch, fov: 90 })
    await page.locator('canvas').screenshot({ path: arg('out', 'env.png') })
  } else if (has('still')) {
    // look-dev: one or more stills (comma-separated lid angles) → PNGs, plus a sheet on white
    const width = Number(arg('width', 1100))
    const height = Math.round(width / view.aspect)
    const out = arg('out', 'still.png')
    const degs = arg('still').split(',').map(Number)
    const variants = JSON.parse(arg('variants', '[{}]'))
    const files = []
    for (const [vi, v] of variants.entries()) {
      if (Object.keys(v).length) await page.evaluate((c) => window.R.update(c), v)
      for (const deg of degs) {
        const { shot, ms } = await shoot({ width, ss: Number(arg('ss', 1)), samples: Number(arg('samples', 8)), openDeg: deg, mode: arg('mode', 'beauty') })
        const file = out.replace(/\.png$/, `-v${vi}-${deg}.png`)
        await raw(shot).resize(width, height, { kernel: 'lanczos3', fit: 'fill' }).png().toFile(file)
        files.push({ file, row: vi, col: degs.indexOf(deg) })
        console.log(JSON.stringify({ file, ms }))
      }
    }
    if (has('dumpground')) {
      const g = await page.evaluate(() => window.R.dumpGround())
      await sharp(Buffer.from(g.b64, 'base64'), { raw: { width: g.width, height: g.height, channels: 1 } }).negate().png().toFile(arg('dumpground'))
    }
    if (has('sheet')) {
      const bg = arg('bg', '#ffffff')
      const cols = has('rows') ? degs.length : 1
      const layers = files.map((f, i) => (has('rows') ? { input: f.file, left: f.col * width, top: f.row * height } : { input: f.file, left: 0, top: i * height }))
      const W = width * cols
      const Hs = height * (has('rows') ? variants.length : files.length)
      await sharp({ create: { width: W, height: Hs, channels: 4, background: bg } }).composite(layers).flatten({ background: bg }).png().toFile(arg('sheet'))
      console.log('sheet', arg('sheet'))
    }
    const corners = await page.evaluate(() => window.R.corners())
    console.log(JSON.stringify({ corners }))
  } else {
    // full set: 1) render every image to a lossless cache at its final size, 2) encode WebP from it.
    // `--encode-only` repeats step 2 (e.g. to try other WebP qualities) without rendering.
    const widths = arg('widths', '2200,1000').split(',').map(Number)
    const frames = Number(arg('frames', FRAMES))
    const ease = bezier(EASE)
    const angles = Array.from({ length: frames }, (_, k) => +(view.openDeg * ease(k / (frames - 1))).toFixed(3))
    fs.mkdirSync(CACHE, { recursive: true })
    const metaPath = path.join(CACHE, 'meta.json')
    let meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {}
    {
      const corners = await page.evaluate(() => window.R.corners())
      meta = { ...meta, corners, angles, frames, view }
      for (const width of widths) {
        const S = SIZES[width] || SIZES[2200]
        const height = Math.round(width / view.aspect)
        const save = async (shot, name) => {
          await raw(shot).resize(width, height, { kernel: 'lanczos3', fit: 'fill' }).png({ compressionLevel: 3 }).toFile(path.join(CACHE, `${name}-${width}.png`))
        }
        const only = arg('only') ? arg('only').split('-').map(Number) : null
        for (let k = 0; k < frames; k++) {
          if (only && (k < only[0] || k > only[1])) continue
          // the closed poster and the final frame are seen at rest: more samples, no motion blur
          const rest = k === 0 || k === frames - 1
          const tk = k / (frames - 1)
          const half = SHUTTER / (frames - 1) / 2
          const shutter = rest ? null : [view.openDeg * ease(Math.max(0, tk - half)), view.openDeg * ease(Math.min(1, tk + half))]
          const samples = rest ? S.samples : blurSamples(shutter, width, S.samplesSeq)
          const { shot, ms } = await shoot({ width, ss: S.ss, samples, openDeg: angles[k], shutter })
          await save(shot, `frame-${String(k).padStart(2, '0')}`)
          console.log(`render ${width} frame ${k} ${angles[k]}° ${samples} samples ${ms} ms`)
        }
        if (!arg('only')) {
          const { shot, ms } = await shoot({ width, ss: S.ss, samples: S.samples, openDeg: view.openDeg, mode: 'open' })
          await save(shot, 'open')
          meta.off = await screenOffColour(shot, corners)
          console.log(`render ${width} open ${ms} ms, screen off ${meta.off}`)
        }
        if (!arg('only')) {
          const { shot, ms } = await shoot({ width, ss: S.ss, samples: S.samples, openDeg: view.openDeg, mode: 'glare' })
          await save(shot, 'glare')
          console.log(`render ${width} glare ${ms} ms`)
        }
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
      }
    }
    await encodeAll(widths)
  }
  await browser.close()
  server.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
