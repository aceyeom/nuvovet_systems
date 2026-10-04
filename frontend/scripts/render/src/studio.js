/*
 * Studio lighting as an environment map: soft-edged softboxes, strip lights, black flags and a white
 * sweep, rendered once into a PMREM (no HDRI files, no network). The laptop is lit only by this
 * environment; the ground shadow is baked separately (see scene.js).
 */
import * as THREE from 'three'

/** Softbox texture: a rounded rectangle with a smooth feathered edge and an optional internal gradient. */
function softTexture({ feather = 0.18, gradY = [1, 1], gradX = [1, 1] } = {}) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')
  const img = g.createImageData(S, S)
  const f = Math.max(feather, 1e-3)
  const smooth = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
  }
  for (let j = 0; j < S; j++) {
    const v = (j + 0.5) / S
    const ty = gradY[0] + (gradY[1] - gradY[0]) * v
    for (let i = 0; i < S; i++) {
      const u = (i + 0.5) / S
      const tx = gradX[0] + (gradX[1] - gradX[0]) * u
      // separable feathered edges (no diagonal creases): smooth 0 → 1 over `feather` from each edge
      const a = smooth(0, f, Math.min(u, 1 - u)) * smooth(0, f, Math.min(v, 1 - v))
      const val = a * ty * tx
      const k = (j * S + i) * 4
      img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.round(Math.max(0, Math.min(1, val)) * 255)
      img.data[k + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  return t
}

function softbox(env, { size, pos, target = [0, 0.6, 0], intensity = 1, tint = [1, 1, 1], ...tex }) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size[0], size[1]),
    new THREE.MeshBasicMaterial({
      map: softTexture(tex),
      color: new THREE.Color(tint[0] * intensity, tint[1] * intensity, tint[2] * intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  m.position.set(...pos)
  m.lookAt(new THREE.Vector3(...target))
  m.renderOrder = 1
  env.add(m)
  return m
}

export const STUDIO_DEFAULT = {
  top: [0.035, 0.035, 0.035],
  horizon: [0.14, 0.14, 0.14],
  floor: [0.75, 0.75, 0.75],
  // The key comes from the upper left: every box is a little brighter on its left half, a big soft box
  // sits up and to the left in front, and the left strip outshines the right one, so the lid and the deck
  // fall off from left to right instead of carrying one flat vertical gradient.
  // (gradX is in the box's texture space: a box facing back towards the laptop from the front is
  // mirrored, so its [left, right] reads [right, left] in the picture.)
  boxes: [
    // big overhead softbox, a little behind and to the left: the sheen on the deck and the closed lid
    { size: [8, 5], pos: [-1.2, 7, -1.2], intensity: 3.0, feather: 0.3, gradY: [1, 0.45], gradX: [0.55, 1] },
    // back wall softbox at low elevation: the gradient across horizontal surfaces seen at ~20°
    { size: [12, 3.6], pos: [0, 2.6, -9], intensity: 3, feather: 0.3, gradY: [1, 0.35], gradX: [0.6, 1.1] },
    // left (key side) and right (fill) strips: long highlights down the edges and corners
    { size: [1.1, 7], pos: [-7, 2.5, -0.6], intensity: 5.5, feather: 0.3 },
    { size: [1.1, 7], pos: [7, 2.5, -0.6], intensity: 2.8, feather: 0.3 },
    // high front card: a little light on the front chamfers everywhere (kept low: an environment box
    // lights a straight chamfer evenly; the streak along it comes from the near-field strip, scene.js)
    { size: [10, 2.6], pos: [0, 8.5, 3.2], intensity: 1.8, feather: 0.3, gradX: [0.5, 1] },
    // the key: a large soft box up and to the left, in front
    { size: [7, 7], pos: [-7, 6, 4], intensity: 1.4, feather: 0.45 },
    // big card behind the camera, brighter at the top-left: what the black glass shows
    { size: [16, 8], pos: [-1.5, 3.4, 11], intensity: 0.7, feather: 0.45, gradY: [1, 0.15], gradX: [1, 0.4] },
  ],
}

export function buildStudio(renderer, opts = {}) {
  const o = { ...STUDIO_DEFAULT, ...opts }
  const env = new THREE.Scene()
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40, 96, 48),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: new THREE.Vector3(...o.top) }, horizon: { value: new THREE.Vector3(...o.horizon) }, floor: { value: new THREE.Vector3(...o.floor) } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 floor;
        varying vec3 vDir;
        void main(){
          float y = vDir.y;
          vec3 c = y > 0.0 ? mix(horizon, top, pow(clamp(y, 0.0, 1.0), 0.55)) : mix(horizon, floor, smoothstep(0.0, 0.25, -y));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  )
  env.add(sky)
  for (const b of o.boxes) softbox(env, b)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const rt = pmrem.fromScene(env, 0, 0.05, 100, { size: o.size || 1024, position: new THREE.Vector3(0, 0.6, 0) })
  pmrem.dispose()
  return rt.texture
}
