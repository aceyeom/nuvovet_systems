/*
 * Shared offline-render core (headless Chromium + SwiftShader, driven by render.mjs).
 *
 * accumulate(): every output image is the average of `samples` sub-pixel-jittered renders (box-filtered
 * supersampling on top of the driver's oversize factor). Each sample is rendered in linear HDR,
 * tone-mapped with Khronos PBR Neutral, encoded to sRGB and averaged premultiplied; the result is
 * un-premultiplied, dithered and read back as straight-alpha RGBA (rows bottom-up) for the driver.
 */
import * as THREE from 'three'

export const canvas = document.createElement('canvas')
canvas.width = 16
canvas.height = 16
document.body.appendChild(canvas)
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(1)
renderer.autoClear = false // every pass clears explicitly; accumulation passes must not

export function halton(i, b) {
  let f = 1
  let r = 0
  while (i > 0) {
    f /= b
    r += f * (i % b)
    i = Math.floor(i / b)
  }
  return r
}

/* ------------------------------------------------------------------ fullscreen passes */
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
const fsScene = new THREE.Scene()
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2))
fsQuad.frustumCulled = false
fsScene.add(fsQuad)
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
const addBlend = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, blendEquationAlpha: THREE.AddEquation }

const composite = new THREE.ShaderMaterial({
  uniforms: { src: { value: null }, weight: { value: 1 }, exposure: { value: 1 } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D src; uniform float weight; uniform float exposure; varying vec2 vUv;
    vec3 neutral(vec3 color) {
      const float startCompression = 0.8 - 0.04;
      const float desaturation = 0.15;
      float x = min(color.r, min(color.g, color.b));
      float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
      color -= offset;
      float peak = max(color.r, max(color.g, color.b));
      if (peak < startCompression) return color;
      const float d = 1.0 - startCompression;
      float newPeak = 1.0 - d * d / (peak + d - startCompression);
      color *= newPeak / peak;
      float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
      return mix(color, vec3(newPeak), g);
    }
    vec3 srgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){
      vec4 c = texture2D(src, vUv);
      float a = clamp(c.a, 0.0, 1.0);
      vec3 col = a > 1e-6 ? c.rgb / a : vec3(0.0);
      col = srgb(neutral(col * exposure));
      gl_FragColor = vec4(col * a, a) * weight;
    }`,
  depthTest: false,
  depthWrite: false,
  ...addBlend,
})
const output = new THREE.ShaderMaterial({
  uniforms: { src: { value: null } },
  vertexShader: VS,
  fragmentShader: `uniform sampler2D src; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(src, vUv);
      float a = clamp(c.a, 0.0, 1.0);
      vec3 col = a > 1e-6 ? c.rgb / a : vec3(0.0);
      float n = (hash(gl_FragCoord.xy) + hash(gl_FragCoord.yx + 17.0) - 1.0) / 255.0;
      gl_FragColor = vec4(clamp(col + n, 0.0, 1.0), clamp(a + n * step(0.002, a) * step(a, 0.998), 0.0, 1.0));
    }`,
  depthTest: false,
  depthWrite: false,
  blending: THREE.NoBlending,
})
function fs(mat, target, clear = false) {
  fsQuad.material = mat
  renderer.setRenderTarget(target)
  if (clear) {
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, true)
  }
  renderer.render(fsScene, fsCam)
}

/* ------------------------------------------------------------------ camera framing */
/**
 * Off-axis frustum that frames `points` (world space) for a camera whose pose is already set:
 * margins are fractions of the content box; the short side grows to reach `aspect`.
 */
export function fitFrustum(camera, points, { aspect, margin }) {
  camera.updateMatrixWorld(true)
  const inv = camera.matrixWorldInverse
  let l = Infinity
  let r = -Infinity
  let b = Infinity
  let t = -Infinity
  for (const p of points) {
    const q = p.clone().applyMatrix4(inv)
    const tx = q.x / -q.z
    const ty = q.y / -q.z
    l = Math.min(l, tx)
    r = Math.max(r, tx)
    b = Math.min(b, ty)
    t = Math.max(t, ty)
  }
  const w0 = r - l
  const h0 = t - b
  l -= w0 * margin.l
  r += w0 * margin.r
  b -= h0 * margin.b
  t += h0 * margin.t
  const w1 = r - l
  const h1 = t - b
  if (w1 / h1 > aspect) {
    const add = w1 / aspect - h1
    const fb = margin.b + margin.t > 0 ? margin.b / (margin.b + margin.t) : 0.5
    b -= add * fb
    t += add * (1 - fb)
  } else {
    const add = h1 * aspect - w1
    l -= add / 2
    r += add / 2
  }
  return { l, r, b, t, near: camera.near, far: camera.far, aspect }
}

/** Apply the view frustum, shifted by (jx, jy) pixels of a W × H image. */
export function setProjection(camera, view, jx = 0, jy = 0, W = 1, H = 1) {
  const { l, r, b, t, near, far } = view
  const dx = ((r - l) / W) * jx
  const dy = ((t - b) / H) * jy
  camera.projectionMatrix.makePerspective((l + dx) * near, (r + dx) * near, (t + dy) * near, (b + dy) * near, near, far)
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
}

/** Normalised image coordinates (0..1, origin top-left) of world points through the unjittered view. */
export function project(camera, view, points) {
  setProjection(camera, view)
  camera.updateMatrixWorld(true)
  return points.map((p) => {
    const q = p.clone().project(camera)
    return [(q.x + 1) / 2, (1 - q.y) / 2]
  })
}

/* ------------------------------------------------------------------ accumulate */
let rts = null
function targets(W, H) {
  if (rts && rts.W === W && rts.H === H) return rts
  if (rts) for (const k of ['beauty', 'acc', 'out']) rts[k].dispose()
  rts = {
    W,
    H,
    beauty: new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: true }),
    acc: new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, depthBuffer: false }),
    out: new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: false }),
  }
  return rts
}

/** Render `samples` jittered passes of scene/camera/view at W × H; returns straight RGBA (bottom-up). */
export function accumulate({ scene, camera, view, W, H, samples, exposure, beforeSample }) {
  const T = targets(W, H)
  composite.uniforms.exposure.value = exposure
  renderer.setRenderTarget(T.acc)
  renderer.setClearColor(0x000000, 0)
  renderer.clear(true, true, true)
  for (let i = 0; i < samples; i++) {
    const jx = samples === 1 ? 0 : halton(i + 1, 2) - 0.5
    const jy = samples === 1 ? 0 : halton(i + 1, 3) - 0.5
    setProjection(camera, view, jx, jy, W, H)
    beforeSample?.(i)
    renderer.setRenderTarget(T.beauty)
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, true)
    renderer.render(scene, camera)
    composite.uniforms.src.value = T.beauty.texture
    composite.uniforms.weight.value = 1 / samples
    fs(composite, T.acc)
  }
  setProjection(camera, view)
  output.uniforms.src.value = T.acc.texture
  fs(output, T.out, true)
  const buf = new Uint8Array(W * H * 4)
  renderer.readRenderTargetPixels(T.out, 0, 0, W, H, buf)
  renderer.setRenderTarget(null)
  return buf
}

/** Hand a finished image to the driver. */
export async function post(name, W, H, buf) {
  const res = await fetch(`/__out?name=${encodeURIComponent(name)}&w=${W}&h=${H}`, { method: 'POST', body: buf })
  if (!res.ok) throw new Error('post failed ' + res.status)
}

/** Look-dev: show an environment map through a wide camera on the page canvas. */
export function envView(envMap, { width, height, yaw = 0, pitch = 0, fov = 100 }) {
  canvas.width = width
  canvas.height = height
  renderer.setSize(width, height, false)
  const s = new THREE.Scene()
  s.background = envMap
  const c = new THREE.PerspectiveCamera(fov, width / height, 0.1, 10)
  c.rotation.set((pitch * Math.PI) / 180, (yaw * Math.PI) / 180, 0, 'YXZ')
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.setRenderTarget(null)
  renderer.render(s, c)
  renderer.toneMapping = THREE.NoToneMapping
  return true
}

export async function loadFont(family = 'PretendardR', file = 'Pretendard-Medium.woff2', weight = '500') {
  const font = new FontFace(family, `url(/fonts/${file})`, { weight })
  await font.load()
  document.fonts.add(font)
  return family
}

export function glInfo() {
  const gl = renderer.getContext()
  return { renderer: gl.getParameter(gl.RENDERER), maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE), maxRb: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) }
}
