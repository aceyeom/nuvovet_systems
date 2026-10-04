/*
 * The nuvovet laptop: an original 14-inch-class design built procedurally.
 * Units: 1 = 10 cm. Deck bottom rests on feet at y = FEET; +z points at the viewer.
 *
 * Graphite anodised aluminium (bead-blasted, polished diamond-cut chamfers on every edge),
 * thin black glass bezel, slim deck with an undercut base, Korean keyboard (2-beolsik legends)
 * in a recessed well, large glass trackpad, hinge barrel, MaruBuri "n" inlay on the lid.
 */
import * as THREE from 'three'
import { arc, barrel, cap, loft, mergeWithGroups, rrPath } from './geometry.js'

const { PI } = Math

export const DIM = (() => {
  const W = 3.1
  const R = 0.16
  const BASE_H = 0.122
  const FEET = 0.008
  const LID_T = 0.048
  const SIDE_BEZEL = 0.064
  const TOP_BEZEL = 0.066
  const CHIN = 0.104
  const SW = W - 2 * SIDE_BEZEL
  const SH = SW * (750 / 1200)
  const LID_H = CHIN + SH + TOP_BEZEL
  const GAP = 0.0032
  const HINGE_R = 0.027
  const HINGE_OFF = 0.03
  const PIVOT_IN = 0.034
  const DEPTH = PIVOT_IN + HINGE_OFF + LID_H + 0.002
  const PIV_Y = FEET + BASE_H + GAP + LID_T / 2
  const PIV_Z = -DEPTH / 2 + PIVOT_IN
  return { W, R, BASE_H, FEET, LID_T, SIDE_BEZEL, TOP_BEZEL, CHIN, SW, SH, LID_H, GAP, HINGE_R, HINGE_OFF, PIVOT_IN, DEPTH, PIV_Y, PIV_Z }
})()

/** Deck plan → 0..1 (v = 0 at the front edge). Used by every deck part for the lid AO map. */
export const deckUV = (x, y, z) => [(x + DIM.W / 2) / DIM.W, 1 - (z + DIM.DEPTH / 2) / DIM.DEPTH]

/* ---------------------------------------------------------------- keyboard layout */
const P = 0.19 // key pitch (19 mm)
const KGAP = 0.031
const FN_H = 0.62
const fnW = (14.5 - 1.25 - 1) / 12
const HANGUL = { Q: 'ㅂ', W: 'ㅈ', E: 'ㄷ', R: 'ㄱ', T: 'ㅅ', Y: 'ㅛ', U: 'ㅕ', I: 'ㅑ', O: 'ㅐ', P: 'ㅔ', A: 'ㅁ', S: 'ㄴ', D: 'ㅇ', F: 'ㄹ', G: 'ㅎ', H: 'ㅗ', J: 'ㅓ', K: 'ㅏ', L: 'ㅣ', Z: 'ㅋ', X: 'ㅌ', C: 'ㅊ', V: 'ㅍ', B: 'ㅠ', N: 'ㅜ', M: 'ㅡ' }
const letter = (c) => ({ u: 1, t: 'letter', a: c, b: HANGUL[c] })
const sym = (lo, hi) => ({ u: 1, t: 'sym', a: hi, b: lo })
const mod = (u, label, align = 'bl') => ({ u, t: 'mod', a: label, align })

const ROWS = [
  { h: FN_H, keys: [mod(1.25, 'esc'), ...Array.from({ length: 12 }, (_, i) => ({ u: fnW, t: 'fn', a: `F${i + 1}` })), { u: 1, t: 'power' }] },
  { h: 1, keys: [sym('`', '~'), sym('1', '!'), sym('2', '@'), sym('3', '#'), sym('4', '$'), sym('5', '%'), sym('6', '^'), sym('7', '&'), sym('8', '*'), sym('9', '('), sym('0', ')'), sym('-', '_'), sym('=', '+'), mod(1.5, 'backspace', 'br')] },
  { h: 1, keys: [mod(1.5, 'tab'), ...'QWERTYUIOP'.split('').map(letter), sym('[', '{'), sym(']', '}'), sym('\\', '|')] },
  { h: 1, keys: [mod(1.75, 'caps lock'), ...'ASDFGHJKL'.split('').map(letter), sym(';', ':'), sym("'", '"'), mod(1.75, 'enter', 'br')] },
  { h: 1, keys: [mod(2.25, 'shift'), ...'ZXCVBNM'.split('').map(letter), sym(',', '<'), sym('.', '>'), sym('/', '?'), mod(2.25, 'shift', 'br')] },
  { h: 1, keys: [mod(1, 'fn'), mod(1, 'ctrl'), mod(1, 'alt'), mod(1.25, '한자', 'bc'), { u: 5, t: 'space' }, mod(1.25, '한/영', 'bc'), mod(1, 'alt', 'br'), { u: 1, t: 'arrow', a: '◀', half: 'low' }, { u: 1, t: 'updown' }, { u: 1, t: 'arrow', a: '▶', half: 'low' }] },
]

export function keyboardLayout() {
  const keys = []
  let z = 0
  for (const row of ROWS) {
    let x = 0
    for (const k of row.keys) {
      const w = k.u * P
      const d = row.h * P
      if (k.t === 'updown') {
        const hh = (d - KGAP * 0.5) / 2
        keys.push({ ...k, t: 'arrow', a: '▲', x: x + w / 2, z: z + KGAP / 4 + hh / 2, w: w - KGAP, d: hh - KGAP * 0.5 })
        keys.push({ ...k, t: 'arrow', a: '▼', x: x + w / 2, z: z + d - KGAP / 4 - hh / 2, w: w - KGAP, d: hh - KGAP * 0.5 })
      } else if (k.half === 'low') {
        const hh = (d - KGAP * 0.5) / 2
        keys.push({ ...k, x: x + w / 2, z: z + d - KGAP / 4 - hh / 2, w: w - KGAP, d: hh - KGAP * 0.5 })
      } else {
        keys.push({ ...k, x: x + w / 2, z: z + d / 2, w: w - KGAP, d: d - KGAP })
      }
      x += w
    }
    z += row.h * P
  }
  const KW = 14.5 * P
  const KD = z
  for (const k of keys) {
    k.x -= KW / 2
    k.z -= KD / 2
  }
  return { keys, KW, KD }
}

/* ---------------------------------------------------------------- textures */
function legendTexture(layout, font) {
  const { keys, KW, KD } = layout
  const PX = 4096 / KW
  const cw = 4096
  const ch = Math.ceil(KD * PX)
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const g = c.getContext('2d')
  g.fillStyle = '#1b1c1e'
  g.fillRect(0, 0, cw, ch)
  const ink = '#c9ccd1'
  g.fillStyle = ink
  g.strokeStyle = ink
  g.textBaseline = 'alphabetic'
  const m = 0.021 * PX // legend margin from the cap edge
  for (const k of keys) {
    const x0 = (k.x - k.w / 2 + KW / 2) * PX
    const z0 = (k.z - k.d / 2 + KD / 2) * PX
    const x1 = x0 + k.w * PX
    const z1 = z0 + k.d * PX
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    const sz = (s) => `${Math.round(s * PX)}px ${font}`
    if (k.t === 'letter') {
      g.font = `500 ${sz(0.036)}`
      g.textAlign = 'left'
      g.fillText(k.a, x0 + m, z0 + m + 0.03 * PX)
      g.font = `500 ${sz(0.03)}`
      g.textAlign = 'right'
      g.fillText(k.b, x1 - m, z1 - m)
    } else if (k.t === 'sym') {
      g.font = `500 ${sz(0.03)}`
      g.textAlign = 'center'
      g.fillText(k.a, cx, z0 + m + 0.026 * PX)
      g.fillText(k.b, cx, z1 - m)
    } else if (k.t === 'mod') {
      const ko = /[가-힣]/.test(k.a)
      g.font = `500 ${sz(ko ? 0.027 : 0.024)}`
      g.textAlign = k.align === 'br' ? 'right' : k.align === 'bc' ? 'center' : 'left'
      const tx = k.align === 'br' ? x1 - m : k.align === 'bc' ? cx : x0 + m
      g.fillText(k.a, tx, z1 - m)
    } else if (k.t === 'fn') {
      g.font = `500 ${sz(0.021)}`
      g.textAlign = 'center'
      g.fillText(k.a, cx, cz + 0.008 * PX)
    } else if (k.t === 'power') {
      const r = 0.017 * PX
      g.lineWidth = 0.0032 * PX
      g.lineCap = 'round'
      g.beginPath()
      g.arc(cx, cz + 0.002 * PX, r, -PI / 2 + 0.75, -PI / 2 - 0.75 + 2 * PI)
      g.stroke()
      g.beginPath()
      g.moveTo(cx, cz - r * 1.15)
      g.lineTo(cx, cz - r * 0.15)
      g.stroke()
    } else if (k.t === 'arrow') {
      const s = 0.0085 * PX
      g.beginPath()
      const dir = { '▲': [0, -1], '▼': [0, 1], '◀': [-1, 0], '▶': [1, 0] }[k.a]
      const [dx, dy] = dir
      g.moveTo(cx + dx * s, cz + dy * s)
      g.lineTo(cx - dx * s * 0.55 + dy * s * 0.9, cz - dy * s * 0.55 + dx * s * 0.9)
      g.lineTo(cx - dx * s * 0.55 - dy * s * 0.9, cz - dy * s * 0.55 - dx * s * 0.9)
      g.closePath()
      g.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

/**
 * The lid's MaruBuri SemiBold "n" (units: 1000/em, baseline 0; glyph box ≈ x 35..588, y −495..44) as a
 * debossed inlay: `alpha` is the glyph; `color` (sRGB) is a darker, matte floor with a narrow lit wall
 * along its lower-right edges (the walls facing the upper-left key) and a shadowed wall along the
 * upper-left ones, so it reads recessed into the lid rather than printed on it. Canvas "up" is towards
 * the hinge (the glyph is upright for a viewer in front of the closed laptop). style 'flat' = alpha only.
 */
function monogramTextures(d, { style = 'deboss', rim = 10, floor = [46, 47, 50], lit = [196, 198, 202], shade = [22, 23, 25] } = {}) {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, S, S)
  const gw = 588 - 35
  const gh = 495 + 44
  const k = (S * 0.8) / Math.max(gw, gh)
  g.translate(S / 2 - ((35 + 588) / 2) * k, S / 2 - ((-495 + 44) / 2) * k)
  g.scale(k, k)
  g.fillStyle = '#fff'
  g.fill(new Path2D(d))
  const alpha = new THREE.CanvasTexture(c)
  alpha.colorSpace = THREE.NoColorSpace
  alpha.anisotropy = 8
  if (style === 'flat') return { alpha, color: null }
  const m = g.getImageData(0, 0, S, S).data
  const at = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? 0 : m[(y * S + x) * 4] / 255)
  const cc = document.createElement('canvas')
  cc.width = S
  cc.height = S
  const cg = cc.getContext('2d')
  const img = cg.createImageData(S, S)
  const o = img.data
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const inside = at(x, y)
      // wall widths fade in over the rim: lit where the recess ends towards the lower right, shaded towards the upper left
      let litA = 0
      let shadeA = 0
      for (let r = 1; r <= rim; r++) {
        const w = 1 - (r - 1) / rim
        litA = Math.max(litA, (inside - at(x + r, y + r)) * w)
        shadeA = Math.max(shadeA, (inside - at(x - r, y - r)) * w)
      }
      litA = Math.max(0, Math.min(1, litA))
      shadeA = Math.max(0, Math.min(1, shadeA))
      const i = (y * S + x) * 4
      for (let ch = 0; ch < 3; ch++) {
        let v = floor[ch]
        v += (lit[ch] - v) * litA
        v += (shade[ch] - v) * shadeA
        o[i + ch] = v
      }
      o[i + 3] = 255
    }
  }
  cg.putImageData(img, 0, 0)
  const color = new THREE.CanvasTexture(cc)
  color.colorSpace = THREE.SRGBColorSpace
  color.anisotropy = 8
  return { alpha, color }
}

/* ---------------------------------------------------------------- materials */
/**
 * The keyboard well floor in the deck plan (deckUV): a lifted charcoal (not a black hole) with soft
 * occlusion under every cap, so the gaps read as depth: darker right at the cap walls, lighter mid-gap.
 */
function wellTexture(layout, wellZ, opts = {}) {
  const { keys } = layout
  const PX = 4096 / DIM.W
  const cw = 4096
  const ch = Math.ceil(DIM.DEPTH * PX)
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  // a CPU canvas: the blur filter on the GPU (SwiftShader) path takes minutes
  const g = c.getContext('2d', { willReadFrequently: true })
  g.fillStyle = opts.color || '#44484e'
  g.fillRect(0, 0, cw, ch)
  const px = (x) => (x + DIM.W / 2) * PX
  const pz = (z) => (z + DIM.DEPTH / 2) * PX
  const halo = (spread, alpha, blur) => {
    const path = new Path2D()
    for (const k of keys) {
      const w = (k.w + 2 * spread) * PX
      const d = (k.d + 2 * spread) * PX
      const r = Math.min(0.02, k.d * 0.28) * PX
      path.roundRect(px(k.x) - w / 2, pz(wellZ + k.z) - d / 2, w, d, r)
    }
    g.save()
    g.filter = `blur(${Math.max(1, blur * PX).toFixed(1)}px)`
    g.fillStyle = `rgba(0, 0, 0, ${alpha})`
    g.fill(path)
    g.restore()
  }
  // a wide soft term and a tight contact term (the caps sit ~1 mm off the floor)
  halo(0.004, opts.aoWide ?? 0.38, 0.007)
  halo(0.0, opts.aoTight ?? 0.7, 0.0025)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/**
 * Fine bead-blast grain for the anodised aluminium: a roughness map (green channel) of value noise around
 * 1 − amp, so the surface roughness varies by ± amp × base at a little under one output pixel. It breaks
 * up the perfectly even CG sheen without reading as texture.
 */
function grainTexture(amp = 0.12, S = 1024, repeat = 4) {
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')
  const img = g.createImageData(S, S)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round(255 * (1 - amp + amp * 2 * (rnd() - 0.5)))
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 8
  return t
}

export function makeMaterials(opts = {}) {
  const grain = (opts.aluGrain ?? 0.12) > 0 ? grainTexture(opts.aluGrain ?? 0.12) : null
  const alu = new THREE.MeshPhysicalMaterial({
    name: 'alu',
    color: new THREE.Color(opts.aluColor || '#4c4d50'),
    metalness: 1,
    // the grain map scales roughness down by up to 2 × aluGrain: lift the base so the mean stays put
    roughness: (opts.aluRough ?? 0.38) / (1 - (grain ? opts.aluGrain ?? 0.12 : 0)),
    roughnessMap: grain,
  })
  const chamfer = new THREE.MeshPhysicalMaterial({
    name: 'chamfer',
    color: new THREE.Color(opts.chamferColor || '#b0b1b4'),
    metalness: 1,
    roughness: 0.12,
  })
  const dark = new THREE.MeshStandardMaterial({ name: 'dark', color: '#0e0e0f', metalness: 0.3, roughness: 0.8 })
  // the keyboard well floor (its map, with the cap occlusion, is set in buildLaptop)
  const well = new THREE.MeshStandardMaterial({ name: 'well', color: '#ffffff', metalness: 0.15, roughness: 0.72 })
  const keys = new THREE.MeshPhysicalMaterial({
    name: 'keys',
    color: '#ffffff',
    metalness: 0,
    roughness: 0.52,
    clearcoat: 0.08,
    clearcoatRoughness: 0.5,
    specularIntensity: 0.6,
  })
  const pad = new THREE.MeshPhysicalMaterial({
    name: 'pad',
    color: new THREE.Color(opts.padColor || '#3c3d40'),
    metalness: 0.5,
    roughness: 0.28,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
  })
  const hinge = new THREE.MeshPhysicalMaterial({ name: 'hinge', color: '#2d2d2f', metalness: 1, roughness: 0.42 })
  const glass = new THREE.MeshPhysicalMaterial({
    name: 'glass',
    color: '#000000',
    metalness: 0,
    roughness: 0.035,
    ior: 1.52,
    specularIntensity: 1,
  })
  const panel = new THREE.MeshPhysicalMaterial({
    name: 'panel',
    color: new THREE.Color(opts.panelColor || '#0a0a0b'),
    metalness: 0,
    roughness: 0.035,
    ior: 1.52,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -8,
  })
  const lens = new THREE.MeshPhysicalMaterial({ name: 'lens', color: '#05070a', metalness: 0.2, roughness: 0.1, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16 })
  const deboss = (opts.inlay?.style ?? 'deboss') !== 'flat'
  const inlay = new THREE.MeshPhysicalMaterial({
    name: 'inlay',
    // debossed: the colour map carries the floor and the walls; flat: one lighter metal tone
    color: new THREE.Color(deboss ? '#ffffff' : opts.inlayColor || '#5c5d60'),
    metalness: 1,
    roughness: deboss ? 0.34 : 0.24,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -8,
  })
  const lidAlu = alu.clone()
  lidAlu.name = 'lidAlu'
  const lidChamfer = chamfer.clone()
  lidChamfer.name = 'lidChamfer'
  return { alu, chamfer, lidAlu, lidChamfer, dark, well, keys, pad, hinge, glass, panel, lens, inlay, inlayOpts: opts.inlay || {}, wellOpts: opts.well || {} }
}

/* ---------------------------------------------------------------- build */
export function buildLaptop({ mats, font = 'Pretendard', monogram }) {
  const D = DIM
  const root = new THREE.Group()
  root.name = 'laptop'
  const H = D.BASE_H
  const layout = keyboardLayout()

  /* deck ------------------------------------------------------------- */
  const deck = new THREE.Group()
  deck.position.y = D.FEET
  root.add(deck)
  const CH = 0.0075 // deck top chamfer (polished)
  // side walls use materials 3/4 (no lid AO: the AO map is a plan-view map of the top surface)
  const deckProfile = [
    { o: -CH, y: H, m: 4, crease: true },
    { o: 0, y: H - CH, m: 3, crease: true },
    { o: 0, y: 0.042, m: 3 },
  ]
  // undercut: quarter ellipse from (0, 0.042) to (−0.028, 0)
  for (let k = 1; k <= 10; k++) {
    const a = (-k / 10) * (PI / 2)
    deckProfile.push({ o: -0.028 + 0.028 * Math.cos(a), y: 0.042 + 0.042 * Math.sin(a), m: 3 })
  }
  const deckSide = loft(D.W, D.DEPTH, D.R, deckProfile, { cs: 24, uv: deckUV })

  // keyboard well
  const WELL_PAD = 0.011
  const wellW = layout.KW + 2 * WELL_PAD
  const wellD = layout.KD + 2 * WELL_PAD
  const wellR = 0.026
  const wellZ = -D.DEPTH / 2 + 0.118 + wellD / 2
  const WELL_DEPTH = 0.0105
  const WELL_CH = 0.0026
  const wellWalls = loft(wellW, wellD, wellR, [
    { o: WELL_CH, y: H, m: 1, crease: true },
    { o: 0, y: H - WELL_CH, m: 0, crease: true },
    { o: 0, y: H - WELL_DEPTH, m: 0 },
  ], { inward: true, cz: wellZ, cs: 8, uv: deckUV })
  const wellFloor = cap(rrPath(wellW, wellD, wellR, 0, wellZ), H - WELL_DEPTH, { uv: deckUV })

  // trackpad
  const padW = 1.24
  const padD = 0.71
  const padR = 0.045
  const padZ = wellZ + wellD / 2 + 0.082 + padD / 2
  const GROOVE = 0.0032
  const PAD_CH = 0.0018
  const padCut = loft(padW + 2 * GROOVE, padD + 2 * GROOVE, padR + GROOVE, [
    { o: PAD_CH, y: H, m: 1, crease: true },
    { o: 0, y: H - PAD_CH, m: 2, crease: true },
    { o: 0, y: H - 0.005, m: 2 },
  ], { inward: true, cz: padZ, cs: 8, uv: deckUV })
  const grooveFloor = cap(rrPath(padW + 2 * GROOVE, padD + 2 * GROOVE, padR + GROOVE, 0, padZ), H - 0.005, { uv: deckUV })

  // top surface with holes
  const top = rrPath(D.W - 2 * CH, D.DEPTH - 2 * CH, D.R - CH)
  top.holes.push(rrPath(wellW + 2 * WELL_CH, wellD + 2 * WELL_CH, wellR + WELL_CH, 0, wellZ, THREE.Path))
  top.holes.push(rrPath(padW + 2 * GROOVE + 2 * PAD_CH, padD + 2 * GROOVE + 2 * PAD_CH, padR + GROOVE + PAD_CH, 0, padZ, THREE.Path))
  const topCap = cap(top, H, { segs: 32, uv: deckUV })
  const bottomCap = cap(rrPath(D.W - 0.056, D.DEPTH - 0.056, D.R - 0.028), 0, { down: true, uv: deckUV })

  const deckGeo = mergeWithGroups([
    { g: deckSide },
    { g: topCap, m: 0 },
    { g: bottomCap, m: 2 },
    { g: wellWalls },
    { g: wellFloor, m: 5 },
    { g: padCut },
    { g: grooveFloor, m: 2 },
  ])
  mats.well.map = wellTexture(layout, wellZ, mats.wellOpts)
  const deckMesh = new THREE.Mesh(deckGeo, [mats.alu, mats.chamfer, mats.dark, mats.lidAlu, mats.lidChamfer, mats.well])
  deckMesh.name = 'deck'
  deck.add(deckMesh)

  // trackpad slab (glass)
  const padTop = H - 0.0004
  const padSlab = loft(padW, padD, padR, [
    { o: -0.0016, y: padTop },
    ...arc(-0.0016, padTop - 0.0016, 0.0016, 90, 0, 4).slice(1),
    { o: 0, y: H - 0.0045 },
  ], { cz: padZ, cs: 8, uv: deckUV })
  const padCap = cap(rrPath(padW - 0.0032, padD - 0.0032, padR - 0.0016, 0, padZ), padTop, { uv: deckUV })
  const padMesh = new THREE.Mesh(mergeWithGroups([{ g: padSlab, m: 0 }, { g: padCap, m: 0 }]), mats.pad)
  padMesh.name = 'trackpad'
  deck.add(padMesh)

  // keys (one merged geometry, UV = keyboard plan for the legend texture)
  const KEY_H = 0.0095
  const keyY0 = H - WELL_DEPTH
  const KE = 0.0055 // cap edge rounding
  const kbUV = (x, y, z) => [(x + layout.KW / 2) / layout.KW, 1 - (z - (wellZ - layout.KD / 2)) / layout.KD]
  const keyParts = []
  for (const k of layout.keys) {
    const kr = Math.min(0.02, k.d * 0.28)
    const topY = keyY0 + KEY_H
    const prof = [
      { o: -KE, y: topY },
      ...arc(-KE, topY - KE, KE, 90, 0, 5).slice(1),
      { o: 0, y: keyY0 + 0.001 },
    ]
    const kz = wellZ + k.z
    keyParts.push({ g: loft(k.w, k.d, kr, prof, { cs: 6, cx: k.x, cz: kz, uv: kbUV }), m: 0 })
    keyParts.push({ g: cap(rrPath(k.w - 2 * KE, k.d - 2 * KE, kr - KE, k.x, kz), topY, { segs: 6, uv: kbUV }), m: 0 })
  }
  const keyGeo = mergeWithGroups(keyParts)
  {
    // second uv set: deck plan, for the lid ambient-occlusion map
    const p = keyGeo.attributes.position
    const uv1 = new Float32Array(p.count * 2)
    for (let i = 0; i < p.count; i++) uv1.set(deckUV(p.getX(i), 0, p.getZ(i)), i * 2)
    keyGeo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2))
  }
  mats.keys.map = legendTexture(layout, font)
  const keyMesh = new THREE.Mesh(keyGeo, mats.keys)
  keyMesh.name = 'keys'
  deck.add(keyMesh)

  // hinge barrel
  const hingeL = D.W - 2 * D.R - 0.06
  const hinge = new THREE.Mesh(barrel(hingeL, D.HINGE_R, 0.012), mats.hinge)
  hinge.position.set(0, D.PIV_Y, D.PIV_Z)
  hinge.name = 'hinge'
  root.add(hinge)

  /* lid --------------------------------------------------------------- */
  const pivot = new THREE.Group()
  pivot.name = 'lidPivot'
  pivot.position.set(0, D.PIV_Y, D.PIV_Z)
  root.add(pivot)
  const T = D.LID_T
  const LCH = 0.006
  const lidProfile = [
    { o: -LCH, y: 0, m: 1, crease: true },
    { o: 0, y: -LCH, m: 0, crease: true },
    { o: 0, y: -(T - 0.015), m: 0 },
  ]
  for (let k = 1; k <= 8; k++) {
    const a = (-k / 8) * (PI / 2)
    lidProfile.push({ o: -0.015 + 0.015 * Math.cos(a), y: -(T - 0.015) + 0.015 * Math.sin(a), m: 0 })
  }
  const lidSide = loft(D.W, D.LID_H, D.R, lidProfile, { cs: 24 })
  const lidFront = cap(rrPath(D.W - 2 * LCH, D.LID_H - 2 * LCH, D.R - LCH), 0)
  const lidBack = cap(rrPath(D.W - 0.03, D.LID_H - 0.03, D.R - 0.015), -T, { down: true })
  const lidGeo = mergeWithGroups([{ g: lidSide }, { g: lidFront, m: 0 }, { g: lidBack, m: 0 }])
  // flat frame → lid-local: plan z → −y', thickness y → z'; then lift to the hinge offset and centre on the axis
  const toLid = new THREE.Matrix4().makeTranslation(0, D.HINGE_OFF + D.LID_H / 2, T / 2).multiply(new THREE.Matrix4().makeRotationX(PI / 2))
  lidGeo.applyMatrix4(toLid)
  const lidMesh = new THREE.Mesh(lidGeo, [mats.lidAlu, mats.lidChamfer, mats.dark])
  lidMesh.name = 'lid'
  pivot.add(lidMesh)

  // black glass (whole front, inside the aluminium rim)
  const RIM = 0.0125
  const glassShape = rrPath(D.W - 2 * RIM, D.LID_H - 2 * RIM, D.R - RIM, 0, -(D.HINGE_OFF + D.LID_H / 2))
  const glassGeo = new THREE.ShapeGeometry(glassShape, 32) // shape (x, sy) with sy = −cz → y' = HINGE_OFF + LID_H/2
  const glass = new THREE.Mesh(glassGeo, mats.glass)
  glass.position.z = T / 2 + 0.0004
  glass.name = 'glass'
  pivot.add(glass)

  // active area (panel), coplanar with the glass via polygon offset
  const panelY = D.HINGE_OFF + D.CHIN + D.SH / 2
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(D.SW, D.SH), mats.panel)
  panel.position.set(0, panelY, T / 2 + 0.0004)
  panel.name = 'panel'
  pivot.add(panel)

  // camera
  const cam = new THREE.Mesh(new THREE.CircleGeometry(0.0072, 32), mats.lens)
  cam.position.set(0, D.HINGE_OFF + D.LID_H - D.TOP_BEZEL / 2, T / 2 + 0.0004)
  cam.name = 'webcam'
  pivot.add(cam)

  // lid back inlay: MaruBuri "n", upright for a viewer in front of the closed laptop
  if (monogram) {
    const tex = monogramTextures(monogram, mats.inlayOpts)
    mats.inlay.alphaMap = tex.alpha
    if (tex.color) mats.inlay.map = tex.color
    const s = 0.26
    const inlay = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mats.inlay)
    inlay.rotation.x = PI
    inlay.position.set(0, D.HINGE_OFF + D.LID_H * 0.5, -T / 2 - 0.0003)
    inlay.name = 'inlay'
    pivot.add(inlay)
  }

  const setOpen = (deg) => {
    pivot.rotation.x = ((90 - deg) * PI) / 180
    pivot.updateMatrixWorld(true)
  }
  setOpen(0)

  /** Screen (panel) corners in world space: tl, tr, br, bl as seen from the front. */
  const screenCorners = () => {
    root.updateMatrixWorld(true)
    const hw = D.SW / 2
    const hh = D.SH / 2
    return [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => new THREE.Vector3(x, y, 0).applyMatrix4(panel.matrixWorld))
  }

  return { root, pivot, panel, glass, setOpen, screenCorners, layout, parts: { deckMesh, keyMesh, padMesh, lidMesh, hinge } }
}
