/*
 * Receipt still-life (receipt.html): a thermal clinic receipt, typeset from the hero claim
 * (src/pages/insurance/preview/heroClaim.json), lying on a pale studio surface with its top end
 * curling up; same studio light as the laptop. The photo is cropped so the receipt runs off the
 * bottom edge, like an editorial still. Opaque output: the surface is part of the picture.
 *
 * Every figure on the paper comes from heroClaim.json; the paper says it is synthetic data.
 */
import * as THREE from 'three'
import { accumulate, fitFrustum, glInfo, loadFont, post, renderer, setProjection } from './core.js'
import { nfUniforms, setCards, withNearField } from './nearfield.js'
import { buildStudio } from './studio.js'

const { PI, sin, cos, sqrt, max, min, abs } = Math

const PW = 0.8 // 80 mm thermal roll
const PL = 2.7 // paper length (27 cm)
const PX = 1280 / PW // texture pixels per unit
const LIFT = 0.0035 // the paper floats a hair above the surface
const CURL = { start: 0.76, angle: 86 } // the top 28 % of the paper bends up by `angle` degrees in total
const YAW = (8 * PI) / 180

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(20, 0.8, 0.5, 60)
let VIEW = null
let paper = null
let surface = null
let env = null
let PROF = null
const STATE = { exposure: 1.75 }

/* ------------------------------------------------------------------ receipt texture */
const won = (n) => n.toLocaleString('ko-KR')

function receiptTexture(claim, fontR, fontB) {
  const W = Math.round(PW * PX)
  const H = Math.round(PL * PX)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  // thermal paper: cool white with a faint fibre noise
  g.fillStyle = '#f7f7f5'
  g.fillRect(0, 0, W, H)
  const img = g.getImageData(0, 0, W, H)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 5
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  g.putImageData(img, 0, 0)

  const mm = PX / 100 // pixels per millimetre (1 unit = 10 cm)
  const M = 5 * mm
  const ink = '#262626'
  let y = 16 * mm
  const text = (s, x, size, { weight = 'r', align = 'left', color = ink } = {}) => {
    g.font = `${weight === 'b' ? 600 : 500} ${Math.round(size * mm)}px ${weight === 'b' ? fontB : fontR}`
    g.textAlign = align
    g.fillStyle = color
    g.fillText(s, x, y)
  }
  const rule = (gap = 5) => {
    y += gap * mm * 0.5
    g.fillStyle = ink
    for (let x = M; x < W - M; x += 2.2 * mm) g.fillRect(x, y, 1.2 * mm, 0.32 * mm)
    y += gap * mm * 0.5 + 3.6 * mm
  }
  const row = (l, r, size = 3.3, opts = {}) => {
    text(l, M, size, opts)
    text(r, W - M, size, { ...opts, align: 'right' })
    y += size * mm * 1.75
  }

  g.textBaseline = 'alphabetic'
  text(claim.clinic.name, W / 2, 5.2, { weight: 'b', align: 'center' })
  y += 7.4 * mm
  text(`${claim.clinic.region} · 진료비 영수증`, W / 2, 3.4, { align: 'center' })
  y += 4 * mm
  rule()
  const p = claim.patient
  row('진료일', claim.visit_date)
  row('환자', `${p.breed} · ${String(p.age_years).replace(/\.0$/, '')}세 · ${p.weight_kg}kg`)
  row('진단', claim.diagnoses.map((d) => d.name_ko).join(', '))
  row('입원', `${claim.payable.days}일`)
  rule()
  // items: description · qty · amount (tabular)
  const qx = W - M - 24 * mm
  const head = () => {
    text('항목', M, 3.1, { color: '#555' })
    text('수량', qx, 3.1, { align: 'right', color: '#555' })
    text('금액', W - M, 3.1, { align: 'right', color: '#555' })
    y += 3.1 * mm * 2
  }
  head()
  let sum = 0
  for (const line of claim.lines) {
    text(line.description, M, 3.3)
    text(String(line.quantity), qx, 3.3, { align: 'right' })
    text(won(line.total), W - M, 3.3, { align: 'right' })
    sum += line.total
    y += 3.3 * mm * 1.85
  }
  rule()
  row('합계', `${won(sum)}원`, 4, { weight: 'b' })
  rule()
  text(`청구번호 ${claim.claim_id}`, W / 2, 3, { align: 'center', color: '#444' })
  y += 5.2 * mm
  text('합성 데이터 · 실제 진료 기록이 아닙니다', W / 2, 3, { align: 'center', color: '#444' })

  // thermal print is a little soft
  const soft = document.createElement('canvas')
  soft.width = W
  soft.height = H
  const sg = soft.getContext('2d')
  sg.filter = 'blur(0.55px)'
  sg.drawImage(c, 0, 0)
  sg.filter = 'none'
  const t = new THREE.CanvasTexture(soft)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/* ------------------------------------------------------------------ paper shape */
/** Centre line of the paper: s (0 = bottom end … PL = top end) → { u: along the surface, y: height }. */
function profile(n = 400) {
  const pts = []
  let u = 0
  let y = LIFT
  let a = 0
  const s0 = CURL.start * PL
  const total = (CURL.angle * PI) / 180
  // curvature ramps up smoothly so the bend has no kink
  const ramp = (s) => {
    const t = min(1, max(0, (s - s0) / (PL - s0)))
    return t * t * (3 - 2 * t)
  }
  const dS = PL / n
  let norm = 0
  for (let i = 0; i < n; i++) norm += ramp((i + 0.5) * dS) * dS
  for (let i = 0; i <= n; i++) {
    const s = i * dS
    pts.push({ s, u, y, a })
    const k = (ramp(s + dS / 2) / norm) * total
    a += k * dS
    u += cos(a) * dS
    y += sin(a) * dS
  }
  return pts
}

function paperGeometry(prof) {
  const nx = 12
  const ny = prof.length - 1
  const g = new THREE.PlaneGeometry(PW, PL, nx, ny)
  const p = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const v = uv.getY(i) // 0 = bottom end, 1 = top end
    const k = Math.round(v * ny)
    const q = prof[k]
    // transverse bow, stronger in the curl; a whisper of waviness along the flat part
    const curl = q.a / ((CURL.angle * PI) / 180)
    const bow = (x / (PW / 2)) ** 2 * (0.0025 + 0.012 * curl) + (x / (PW / 2)) * 0.012 * curl
    const wave = 0.0012 * sin(q.s * 7.3 + 0.6) * (1 - min(1, q.a * 4))
    p.setXYZ(i, x, q.y + bow + wave, -q.u)
  }
  g.computeVertexNormals()
  return g
}

/* ------------------------------------------------------------------ occlusion of the surface */
function bakeSurfaceAO(prof, tex, box) {
  const { width: nx, height: nz, data } = tex.image
  // paper height above the surface as a function of the along-coordinate u (monotonic for < 90°)
  const us = prof.map((p) => p.u)
  const ys = prof.map((p) => p.y)
  const heightAt = (u) => {
    if (u < 0 || u > us[us.length - 1]) return null
    let lo = 0
    let hi = us.length - 1
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1
      if (us[m] < u) lo = m
      else hi = m
    }
    const t = (u - us[lo]) / (us[hi] - us[lo] || 1)
    return ys[lo] + (ys[hi] - ys[lo]) * t
  }
  const cy = cos(YAW)
  const sy = sin(YAW)
  /** world (x, z) → paper plan [across, u along from the bottom end] (inverse of the paper's yaw + offset) */
  const local = (x, z) => {
    const dx = x - paper.position.x
    const dz = z - paper.position.z
    return [cy * dx - sy * dz, -(sy * dx + cy * dz)]
  }
  // sky (cosine) + a soft key from the upper left, like the laptop's ground
  const dirs = []
  const N = 120
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N
    const v = (i * 0.618034) % 1
    const s = 0.04 + u * 0.96
    const yv = sqrt(s)
    const r = sqrt(1 - s)
    dirs.push([r * cos(2 * PI * v), yv, r * sin(2 * PI * v), 0.45 / N])
  }
  const key = new THREE.Vector3(-0.55, 1, -0.45).normalize()
  const t1 = new THREE.Vector3(1, 0, 0).cross(key).normalize()
  const t2 = key.clone().cross(t1).normalize()
  const K = 80
  for (let i = 0; i < K; i++) {
    const r = sqrt((i + 0.5) / K) * Math.tan((14 * PI) / 180)
    const a = i * 2.399963
    const d = key.clone().addScaledVector(t1, r * cos(a)).addScaledVector(t2, r * sin(a)).normalize()
    dirs.push([d.x, d.y, d.z, 0.55 / K])
  }
  const occ = new Float32Array(nx * nz)
  for (let j = 0; j < nz; j++) {
    const z = box.z1 - ((j + 0.5) / nz) * (box.z1 - box.z0)
    for (let i = 0; i < nx; i++) {
      const x = box.x0 + ((i + 0.5) / nx) * (box.x1 - box.x0)
      let hit = 0
      for (const d of dirs) {
        for (let t = 0.004; t < 0.6; t *= 1.35) {
          const py = d[1] * t
          if (py > 0.35) break
          const [lx, lu] = local(x + d[0] * t, z + d[2] * t)
          if (abs(lx) > PW / 2) continue
          const h = heightAt(lu)
          if (h !== null && py <= h) {
            hit += d[3]
            break
          }
        }
      }
      occ[j * nx + i] = hit
    }
  }
  // blur a little and write AO (1 = open)
  const R = 2
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      let a = 0
      let n = 0
      for (let dj = -R; dj <= R; dj++) {
        for (let di = -R; di <= R; di++) {
          const ii = min(nx - 1, max(0, i + di))
          const jj = min(nz - 1, max(0, j + dj))
          a += occ[jj * nx + ii]
          n++
        }
      }
      const ao = 1 - 0.9 * (a / n)
      const k = (j * nx + i) * 4
      data[k] = data[k + 1] = data[k + 2] = Math.round(ao * 255)
      data[k + 3] = 255
    }
  }
  tex.needsUpdate = true
}

/* ------------------------------------------------------------------ scene */
async function init(cfg = {}) {
  const fontR = await loadFont('PretendardR', 'Pretendard-Medium.woff2', '500')
  const fontB = await loadFont('PretendardSB', 'Pretendard-SemiBold.woff2', '600')
  const claim = await (await fetch('/claim/heroClaim.json')).json()
  env = buildStudio(renderer, {
    top: [0.12, 0.12, 0.12],
    horizon: [0.3, 0.3, 0.3],
    floor: [0.6, 0.6, 0.6],
    boxes: [
      { size: [6, 4], pos: [-4, 5, -3], intensity: 6.5, feather: 0.35, gradY: [1, 0.5], target: [0, 0, 0] },
      { size: [12, 4], pos: [0, 2.6, -9], intensity: 2, feather: 0.3, gradY: [1, 0.35] },
      { size: [16, 8], pos: [0, 3.4, 11], intensity: 1, feather: 0.45 },
    ],
  })
  scene.environment = env

  const prof = profile()
  PROF = prof
  const mat = new THREE.MeshPhysicalMaterial({ map: receiptTexture(claim, fontR, fontB), roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.35, side: THREE.DoubleSide })
  withNearField(mat, 'body')
  paper = new THREE.Mesh(paperGeometry(prof), mat)
  paper.rotation.y = YAW
  paper.position.set(0.32, 0, 1.12) // the bottom end sits beyond the bottom of the picture
  scene.add(paper)
  paper.updateMatrixWorld(true)

  const box = { x0: -2.2, x1: 2.2, z0: -2.4, z1: 2.4 }
  const aoTex = new THREE.DataTexture(new Uint8Array(352 * 384 * 4), 352, 384, THREE.RGBAFormat)
  aoTex.magFilter = THREE.LinearFilter
  aoTex.minFilter = THREE.LinearFilter
  aoTex.colorSpace = THREE.NoColorSpace
  bakeSurfaceAO(prof, aoTex, box)
  const sMat = new THREE.MeshPhysicalMaterial({ color: '#f2f3f5', roughness: 0.85, aoMap: aoTex, aoMapIntensity: 1 })
  withNearField(sMat, 'body')
  const sGeo = new THREE.PlaneGeometry(box.x1 - box.x0, box.z1 - box.z0)
  // uv: u = x, v = 0 at z1 (front) to match the AO rows
  const sp = sGeo.attributes.position
  const suv = sGeo.attributes.uv
  for (let i = 0; i < sp.count; i++) suv.setXY(i, 0.5 + sp.getX(i) / (box.x1 - box.x0), 0.5 + sp.getY(i) / (box.z1 - box.z0))
  surface = new THREE.Mesh(sGeo, sMat)
  surface.rotation.x = -PI / 2
  scene.add(surface)

  setCards([
    // a big soft window from the upper left: the sheen across the paper and the falloff on the surface
    { pos: [-1.6, 2.4, -1.4], size: [3.4, 2.4], target: [0, 0, 0.3], intensity: 2.2, feather: 0.6, gradY: [1, 0.4] },
  ])
  if (cfg.exposure) STATE.exposure = cfg.exposure
  frame(cfg.view || {})
  return { ...glInfo(), lines: claim.lines.length, view: VIEW, cam: camera.position.toArray(), paper: paper.geometry.attributes.position.count }
}

function frame({ elev = 50, aspect = 1.5, dist = 9 } = {}) {
  camera.rotation.set((-elev * PI) / 180, 0, 0, 'YXZ')
  const target = new THREE.Vector3(0.0, 0, -0.45)
  camera.position.copy(target).addScaledVector(new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion), dist)
  camera.updateMatrixWorld(true)
  // frame a surface rectangle around the upper part of the receipt; the rest runs off the bottom
  // the curled top end (with its lift) and a surface band down to where the items list ends
  const top = paper.localToWorld(new THREE.Vector3(0, PROF.at(-1).y, -PROF.at(-1).u))
  const pts = [top.clone().add(new THREE.Vector3(-0.68, 0.04, -0.08)), top.clone().add(new THREE.Vector3(0.68, 0.04, -0.08)), new THREE.Vector3(top.x - 0.68, 0, top.z + 1.0), new THREE.Vector3(top.x + 0.68, 0, top.z + 1.0)]
  VIEW = fitFrustum(camera, pts, { aspect, margin: { l: 0, r: 0, t: 0, b: 0 } })
  setProjection(camera, VIEW)
  return VIEW
}

async function render({ width, ss = 2, samples = 16, name }) {
  const t0 = performance.now()
  const W = Math.round(width * ss)
  const H = Math.round(W / VIEW.aspect)
  nfUniforms.nfViewInv.value.copy(camera.matrixWorld)
  const buf = accumulate({ scene, camera, view: VIEW, W, H, samples, exposure: STATE.exposure })
  await post(name, W, H, buf)
  return { ms: Math.round(performance.now() - t0), W, H }
}

function update(cfg = {}) {
  if (cfg.exposure) STATE.exposure = cfg.exposure
  if (cfg.view) frame(cfg.view)
  return true
}

window.RR = { init, frame, render, update }
window.__ready = true
