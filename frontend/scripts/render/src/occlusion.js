/*
 * Analytic occlusion (CPU), recomputed for every lid angle:
 *
 *   ground shadow  — visibility of a big overhead softbox plus the sky (cosine) from every texel of
 *                    the floor, against the deck slab, the lid and the hinge barrel. Smooth, noise-free
 *                    and far faster than shadow maps on SwiftShader.
 *   deck occlusion — how much of each deck-top point's glossy reflection lobe (around the camera's
 *                    mirror direction) and of its sky is blocked by the open lid. Used as aoMap, so the
 *                    deck darkens towards the hinge the way a real open laptop does.
 */
import * as THREE from 'three'
import { DIM } from './laptop.js'

const { PI, sqrt, cos, sin, abs, max, min, hypot } = Math

function halton(i, b) {
  let f = 1
  let r = 0
  while (i > 0) {
    f /= b
    r += f * (i % b)
    i = Math.floor(i / b)
  }
  return r
}

/** Signed distance to the deck's rounded rectangle in plan. */
function sdDeck(x, z) {
  const hx = DIM.W / 2 - DIM.R
  const hz = DIM.DEPTH / 2 - DIM.R
  const qx = abs(x) - hx
  const qz = abs(z) - hz
  return hypot(max(qx, 0), max(qz, 0)) + min(max(qx, qz), 0) - DIM.R
}

function makeOccluder(pivot) {
  pivot.updateMatrixWorld(true)
  const inv = pivot.matrixWorld.clone().invert()
  const e = inv.elements
  const y0 = DIM.FEET + 0.004
  const y1 = DIM.FEET + DIM.BASE_H
  const lidY0 = -DIM.HINGE_R
  const lidY1 = DIM.HINGE_OFF + DIM.LID_H
  const hingeHalf = (DIM.W - 2 * DIM.R - 0.06) / 2
  /** true if the ray o + t d (t > 0) hits the laptop. o = [x, y, z], d = [x, y, z] (unit). */
  return function hit(ox, oy, oz, dx, dy, dz, skipDeck = false) {
    // deck slab
    if (!skipDeck && dy > 1e-6 && oy < y1) {
      const ta = max(0, (y0 - oy) / dy)
      const tb = (y1 - oy) / dy
      if (tb > 0) {
        for (let k = 0; k <= 6; k++) {
          const t = ta + ((tb - ta) * k) / 6
          if (sdDeck(ox + dx * t, oz + dz * t) < 0) return true
        }
      }
    }
    // lid (plane z' = 0 in pivot space)
    const lx = e[0] * ox + e[4] * oy + e[8] * oz + e[12]
    const ly = e[1] * ox + e[5] * oy + e[9] * oz + e[13]
    const lz = e[2] * ox + e[6] * oy + e[10] * oz + e[14]
    const ddx = e[0] * dx + e[4] * dy + e[8] * dz
    const ddy = e[1] * dx + e[5] * dy + e[9] * dz
    const ddz = e[2] * dx + e[6] * dy + e[10] * dz
    if (abs(ddz) > 1e-9) {
      const t = -lz / ddz
      if (t > 0) {
        const px = lx + ddx * t
        const py = ly + ddy * t
        if (abs(px) < DIM.W / 2 && py > lidY0 && py < lidY1) return true
      }
    }
    // hinge barrel: cylinder along x through the pivot
    {
      const cy = oy - DIM.PIV_Y
      const cz = oz - DIM.PIV_Z
      const a = dy * dy + dz * dz
      const b = 2 * (cy * dy + cz * dz)
      const c = cy * cy + cz * cz - DIM.HINGE_R * DIM.HINGE_R
      const disc = b * b - 4 * a * c
      if (a > 1e-9 && disc > 0) {
        const t = (-b - sqrt(disc)) / (2 * a)
        if (t > 0 && abs(ox + dx * t) < hingeHalf) return true
      }
    }
    return false
  }
}

/* ------------------------------------------------------------------ direction sets */
function hemisphere(n, minElevDeg) {
  const s0 = sin((minElevDeg * PI) / 180) ** 2
  return Array.from({ length: n }, (_, i) => {
    // stratified cosine-weighted
    const u = (i + 0.5) / n
    const v = halton(i + 1, 3)
    const s = s0 + u * (1 - s0)
    const y = sqrt(s)
    const r = sqrt(1 - s)
    const a = 2 * PI * (v + i * 0.618034)
    return [r * cos(a), y, r * sin(a)]
  })
}
function cone(n, axis, halfAngleDeg) {
  const ax = new THREE.Vector3(...axis).normalize()
  const t1 = new THREE.Vector3(1, 0, 0).cross(ax)
  if (t1.lengthSq() < 1e-6) t1.set(0, 0, 1).cross(ax)
  t1.normalize()
  const t2 = ax.clone().cross(t1).normalize()
  const ha = (halfAngleDeg * PI) / 180
  return Array.from({ length: n }, (_, i) => {
    const r = sqrt((i + 0.5) / n) * Math.tan(ha)
    const a = 2 * PI * halton(i + 1, 2) + i * 2.399963
    const d = ax.clone().addScaledVector(t1, r * cos(a)).addScaledVector(t2, r * sin(a)).normalize()
    return [d.x, d.y, d.z]
  })
}

/* ------------------------------------------------------------------ ground */
export const GROUND = { x0: -2.5, x1: 2.5, z0: -2.4, z1: 1.8, nx: 560, nz: 470 }

export function makeGroundTexture() {
  const t = new THREE.DataTexture(new Uint8Array(GROUND.nx * GROUND.nz * 4), GROUND.nx, GROUND.nz, THREE.RGBAFormat)
  t.colorSpace = THREE.NoColorSpace
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

/**
 * Ground darkness (alpha) per texel, row 0 = front (z1), column 0 = left (x0).
 * cfg: { key: [x, y, z], keySpread (deg), keyWeight, sky: n, keyN: n, minElev }
 */
export function bakeGround(tex, pivot, cfg = {}) {
  const { key = [0.05, 1, -0.18], keySpread = 28, keyWeight = 0.55, skyN = 192, keyN = 128, minElev = 3 } = cfg
  const hit = makeOccluder(pivot)
  const sky = hemisphere(skyN, minElev)
  const keyDirs = cone(keyN, key, keySpread)
  const { nx, nz, x0, x1, z0, z1 } = GROUND
  const data = tex.image.data
  const occ = new Float32Array(nx * nz)
  for (let j = 0; j < nz; j++) {
    const z = z1 - ((j + 0.5) / nz) * (z1 - z0)
    for (let i = 0; i < nx; i++) {
      const x = x0 + ((i + 0.5) / nx) * (x1 - x0)
      // per-texel rotation about y decorrelates the direction sets (noise instead of streaks)
      const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453
      const phi = (h - Math.floor(h)) * 2 * PI
      const c = cos(phi)
      const s = sin(phi)
      let occSky = 0
      for (const d of sky) if (hit(x, 0, z, d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c)) occSky++
      let occKey = 0
      const jit = 0.35 // small rotation for the key cone (it is not symmetric about y)
      const ck = cos(phi * jit)
      const sk = sin(phi * jit)
      for (const d of keyDirs) if (hit(x, 0, z, d[0] * ck - d[2] * sk, d[1], d[0] * sk + d[2] * ck)) occKey++
      occ[j * nx + i] = keyWeight * (occKey / keyDirs.length) + (1 - keyWeight) * (occSky / sky.length)
    }
  }
  // separable binomial blur (radius 4) to melt the remaining noise
  const tmp = new Float32Array(nx * nz)
  const w = [1, 8, 28, 56, 70, 56, 28, 8, 1]
  const R = 4
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      let a = 0
      let ws = 0
      for (let k = -R; k <= R; k++) {
        const ii = Math.min(nx - 1, Math.max(0, i + k))
        a += occ[j * nx + ii] * w[k + R]
        ws += w[k + R]
      }
      tmp[j * nx + i] = a / ws
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      let a = 0
      let ws = 0
      for (let k = -R; k <= R; k++) {
        const jj = Math.min(nz - 1, Math.max(0, j + k))
        a += tmp[jj * nx + i] * w[k + R]
        ws += w[k + R]
      }
      const v = a / ws
      const kk = (j * nx + i) * 4
      data[kk] = data[kk + 1] = data[kk + 2] = 0
      data[kk + 3] = Math.round(min(1, v) * 255)
    }
  }
  tex.needsUpdate = true
}

/* ------------------------------------------------------------------ deck */
export function makeDeckAO(res = [224, 152]) {
  const [nx, nz] = res
  const t = new THREE.DataTexture(new Uint8Array(nx * nz * 4).fill(255), nx, nz, THREE.RGBAFormat)
  t.colorSpace = THREE.NoColorSpace
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

/**
 * Deck-top occlusion (red channel; row 0 = front edge): mix of the glossy lobe around the camera's
 * mirror direction (lobe deg) and the cosine sky, both against the lid and hinge.
 */
export function updateDeckAO(tex, pivot, camPos, cfg = {}) {
  const { lobe = 24, lobeN = 96, skyN = 96, specWeight = 0.8, floor = 0.06, lift = 0, grad = 0 } = cfg
  const hit = makeOccluder(pivot)
  const { width: nx, height: nz, data } = tex.image
  const sky = hemisphere(skyN, 1)
  const yTop = DIM.FEET + DIM.BASE_H + 0.0008
  const base = cone(lobeN, [0, 1, 0], lobe) // lobe around +y, rotated per texel
  const v = new THREE.Vector3()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const tmp = new THREE.Vector3()
  for (let j = 0; j < nz; j++) {
    const z = DIM.DEPTH / 2 - ((j + 0.5) / nz) * DIM.DEPTH
    for (let i = 0; i < nx; i++) {
      const x = -DIM.W / 2 + ((i + 0.5) / nx) * DIM.W
      // mirror direction of the camera ray at this point
      v.set(x - camPos.x, yTop - camPos.y, z - camPos.z).normalize()
      const r = tmp.set(v.x, -v.y, v.z)
      q.setFromUnitVectors(up, r)
      let n = 0
      let occ = 0
      for (const d of base) {
        const w = new THREE.Vector3(d[0], d[1], d[2]).applyQuaternion(q)
        if (w.y <= 0.002) continue
        n++
        if (hit(x, yTop, z, w.x, w.y, w.z, true)) occ++
      }
      const spec = n ? 1 - occ / n : 1
      let occS = 0
      for (const d of sky) if (hit(x, yTop, z, d[0], d[1], d[2], true)) occS++
      const diff = 1 - occS / sky.length
      // lift: keep some light everywhere; grad: art-directed falloff, brighter towards the front edge
      const g = 1 - grad * (1 - (j + 0.5) / nz) * 0 - grad * ((j + 0.5) / nz)
      const ao = max(floor, (lift + (1 - lift) * (specWeight * spec + (1 - specWeight) * diff)) * g)
      const k = (j * nx + i) * 4
      data[k] = data[k + 1] = data[k + 2] = Math.round(ao * 255)
      data[k + 3] = 255
    }
  }
  tex.needsUpdate = true
}
