/*
 * Geometry helpers for the procedural laptop.
 *
 * Plan coordinates: x = width (right), z = depth (+z towards the viewer), y = up.
 * A "profile" describes a surface that runs around a rounded rectangle: each point is
 * { o, y, crease?, m? } where o is the outward offset of the rounded rectangle (negative = inset),
 * y is the height, crease starts a hard normal break, and m is the material group of the segment
 * that starts at this point. Rings at every offset share one topology, so the loft is a clean strip.
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const { PI, cos, sin, hypot, max } = Math

/** Points around a rounded rectangle (w × d, plan radius r) grown by offset o. */
export function ring(w, d, r, o, cs = 16, cx0 = 0, cz0 = 0) {
  const cx = w / 2 - r
  const cz = d / 2 - r
  const rr = max(r + o, 1e-5)
  const out = []
  const corners = [[cx, cz, 0], [-cx, cz, PI / 2], [-cx, -cz, PI], [cx, -cz, 1.5 * PI]]
  for (const [ox, oz, a0] of corners) {
    for (let k = 0; k <= cs; k++) {
      const a = a0 + (k / cs) * (PI / 2)
      const c = cos(a)
      const s = sin(a)
      out.push({ x: cx0 + ox + rr * c, z: cz0 + oz + rr * s, nx: c, nz: s })
    }
  }
  return out
}

/**
 * Loft a profile around a rounded rectangle.
 * opts: { cs, inward, cx, cz, uv: (x, y, z) => [u, v] }
 * Returns a BufferGeometry (indexed) with position, normal, uv and material groups.
 */
export function loft(w, d, r, profile, opts = {}) {
  const { cs = 16, inward = false, cx = 0, cz = 0, uv = (x, y, z) => [x, z] } = opts
  const P = profile.length
  // per-segment profile normals (a = horizontal outward, b = up)
  const segN = []
  for (let k = 0; k < P - 1; k++) {
    const dO = profile[k + 1].o - profile[k].o
    const dY = profile[k + 1].y - profile[k].y
    let a = -dY
    let b = dO
    const l = hypot(a, b) || 1
    a /= l
    b /= l
    if (inward) {
      a = -a
      b = -b
    }
    segN.push([a, b])
  }
  const avg = (n0, n1) => {
    const a = n0[0] + n1[0]
    const b = n0[1] + n1[1]
    const l = hypot(a, b) || 1
    return [a / l, b / l]
  }
  const pos = []
  const nor = []
  const uvs = []
  const idx = []
  const groups = []
  const ringLen = ring(w, d, r, 0, cs).length
  for (let k = 0; k < P - 1; k++) {
    const p0 = profile[k]
    const p1 = profile[k + 1]
    const nStart = k === 0 || p0.crease ? segN[k] : avg(segN[k - 1], segN[k])
    const nEnd = k + 1 === P - 1 || p1.crease ? segN[k] : avg(segN[k], segN[k + 1])
    const r0 = ring(w, d, r, p0.o, cs, cx, cz)
    const r1 = ring(w, d, r, p1.o, cs, cx, cz)
    const base = pos.length / 3
    for (const [rg, p, n] of [[r0, p0, nStart], [r1, p1, nEnd]]) {
      for (const q of rg) {
        pos.push(q.x, p.y, q.z)
        const nx = n[0] * q.nx
        const ny = n[1]
        const nz = n[0] * q.nz
        const l = hypot(nx, ny, nz) || 1
        nor.push(nx / l, ny / l, nz / l)
        uvs.push(...uv(q.x, p.y, q.z))
      }
    }
    const start = idx.length
    for (let j = 0; j < ringLen; j++) {
      const j1 = (j + 1) % ringLen
      const a = base + j
      const b = base + j1
      const c = base + ringLen + j1
      const e = base + ringLen + j
      idx.push(a, b, c, a, c, e)
    }
    groups.push({ start, count: idx.length - start, m: p0.m ?? 0 })
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(idx)
  for (const gr of groups) g.addGroup(gr.start, gr.count, gr.m)
  orient(g)
  return g
}

/** Make triangle winding agree with the vertex normals (front faces outwards). */
export function orient(g) {
  const p = g.attributes.position
  const n = g.attributes.normal
  const index = g.index.array
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const nn = new THREE.Vector3()
  for (let i = 0; i < index.length; i += 3) {
    a.fromBufferAttribute(p, index[i])
    b.fromBufferAttribute(p, index[i + 1])
    c.fromBufferAttribute(p, index[i + 2])
    const f = b.clone().sub(a).cross(c.clone().sub(a))
    if (f.lengthSq() < 1e-20) continue
    nn.fromBufferAttribute(n, index[i]).add(c.fromBufferAttribute(n, index[i + 1])).add(b.fromBufferAttribute(n, index[i + 2]))
    if (f.dot(nn) < 0) {
      const t = index[i + 1]
      index[i + 1] = index[i + 2]
      index[i + 2] = t
    }
  }
  g.index.needsUpdate = true
  return g
}

/** THREE.Shape / Path for a rounded rectangle in plan (shape y = −z). */
export function rrPath(w, d, r, cx = 0, cz = 0, PathCls = THREE.Shape) {
  const s = new PathCls()
  const x = cx - w / 2
  const y = -cz - d / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -PI / 2, 0, false)
  s.lineTo(x + w, y + d - r)
  s.absarc(x + w - r, y + d - r, r, 0, PI / 2, false)
  s.lineTo(x + r, y + d)
  s.absarc(x + r, y + d - r, r, PI / 2, PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, PI, 1.5 * PI, false)
  return s
}

/** Flat cap from a shape at height y, facing up (or down). uv(x, y, z) like loft. */
export function cap(shape, y, { down = false, segs = 24, uv = (x, yy, z) => [x, z] } = {}) {
  const g = new THREE.ShapeGeometry(shape, segs)
  g.rotateX(-PI / 2) // shape (sx, sy) → plan (x, z = −sy), normal +y
  g.translate(0, y, 0)
  const p = g.attributes.position
  const n = g.attributes.normal
  const u = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    n.setXYZ(i, 0, down ? -1 : 1, 0)
    const [uu, vv] = uv(p.getX(i), p.getY(i), p.getZ(i))
    u.setXY(i, uu, vv)
  }
  orient(g)
  g.clearGroups()
  return g
}

/** Merge geometries that each carry their own material index (single group per input). */
export function mergeWithGroups(list) {
  // list: [{ g, m }] — g may carry groups (loft) or not (cap → m)
  const parts = []
  for (const { g, m } of list) {
    const gg = g.index ? g.toNonIndexed() : g
    if (g.groups.length) {
      // split by group so each part gets its own material index
      const src = g.index ? g : null
      for (const gr of g.groups) {
        const sub = new THREE.BufferGeometry()
        for (const name of ['position', 'normal', 'uv']) {
          const attr = src.attributes[name]
          const arr = new Float32Array(gr.count * attr.itemSize)
          for (let i = 0; i < gr.count; i++) {
            const vi = src.index.array[gr.start + i]
            for (let k = 0; k < attr.itemSize; k++) arr[i * attr.itemSize + k] = attr.array[vi * attr.itemSize + k]
          }
          sub.setAttribute(name, new THREE.BufferAttribute(arr, attr.itemSize))
        }
        parts.push({ g: sub, m: m ?? gr.materialIndex })
      }
    } else {
      parts.push({ g: gg, m: m ?? 0 })
    }
  }
  parts.sort((a, b) => a.m - b.m)
  const merged = mergeGeometries(parts.map((p) => p.g), false)
  merged.clearGroups()
  let start = 0
  let i = 0
  while (i < parts.length) {
    const m = parts[i].m
    let count = 0
    while (i < parts.length && parts[i].m === m) {
      count += parts[i].g.attributes.position.count
      i++
    }
    merged.addGroup(start, count, m)
    start += count
  }
  return merged
}

/** Quarter-ish arc points for profiles: from angle a0 to a1 (deg) around (o, y) with radius rad. */
export function arc(co, cy, rad, a0, a1, steps, extra = {}) {
  const out = []
  for (let k = 0; k <= steps; k++) {
    const a = ((a0 + ((a1 - a0) * k) / steps) * PI) / 180
    out.push({ o: co + rad * cos(a), y: cy + rad * sin(a), ...extra })
  }
  return out
}

/** Rounded capsule along x (hinge barrel): length L, radius rad, end rounding e. */
export function barrel(L, rad, e, seg = 48) {
  const pts = []
  pts.push(new THREE.Vector2(0, -L / 2))
  for (let k = 0; k <= 8; k++) {
    const a = -PI / 2 + (k / 8) * (PI / 2)
    pts.push(new THREE.Vector2(rad - e + e * cos(a), -L / 2 + e + e * sin(a)))
  }
  for (let k = 0; k <= 8; k++) {
    const a = (k / 8) * (PI / 2)
    pts.push(new THREE.Vector2(rad - e + e * cos(a), L / 2 - e + e * sin(a)))
  }
  pts.push(new THREE.Vector2(0, L / 2))
  const g = new THREE.LatheGeometry(pts, seg)
  g.rotateZ(PI / 2)
  return g
}
