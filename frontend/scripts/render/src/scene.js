/*
 * The laptop scene (index.html). Lighting = studio environment (studio.js) + near-field soft cards
 * (nearfield.js); occlusion = analytic lid/deck AO and a baked ground shadow (occlusion.js), all
 * recomputed for every lid angle. Images are accumulated by core.js and posted to render.mjs.
 *
 * Modes: beauty (screen off: black glass), open (the screen area without reflections; the DOM covers
 * it) and glare (only the glass reflection over the screen area, for the overlay).
 */
import * as THREE from 'three'
import { accumulate, envView, fitFrustum, glInfo, loadFont, post, project, renderer, setProjection } from './core.js'
import { buildLaptop, DIM, makeMaterials } from './laptop.js'
import { bakeGround, GROUND, makeDeckAO, makeGroundTexture, updateDeckAO } from './occlusion.js'
import { nfUniforms, setCards, withNearField } from './nearfield.js'
import { buildStudio } from './studio.js'

const { PI } = Math

/** Near-field soft cards (see nearfield.js). size [w, h]; they face `target`; gradY = [top, bottom]. */
export const CARDS = [
  // low sweep behind the laptop: the gradient across the closed lid and the deck
  { pos: [0, 1.5, -3.6], size: [7, 2.4], target: [0, 0.2, 0], intensity: 3, feather: 0.35, gradY: [0.25, 1] },
  // soft glare across the black glass, from the upper left
  { pos: [-2.6, 3.2, 5], size: [5, 3.5], target: [0, 1, -0.5], intensity: 0.5, feather: 0.6, gradX: [1, 0.2], gradY: [1, 0.3], groups: ['glass'] },
  // overhead strip in front: the front chamfers and edges
  { pos: [0, 3.5, 2.2], size: [6, 0.8], target: [0, 0, 0], intensity: 4, feather: 0.4 },
  // side strips: the side chamfers
  { pos: [-3.2, 1.2, 0.2], size: [0.5, 3], target: [0, 0.4, 0], intensity: 5, feather: 0.4 },
  { pos: [3.2, 1.2, 0.2], size: [0.5, 3], target: [0, 0.4, 0], intensity: 3.5, feather: 0.4 },
]

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(20, 1.6, 0.5, 60)
let L = null // laptop
let MATS = null
let VIEW = null
const MODE_MATS = {}
const STATE = {
  exposure: 2,
  shadow: { strength: 0.85, tint: [0.02, 0.02, 0.02] },
  ground: { keyWeight: 0.92, key: [0, 1, -0.15], keySpread: 18 },
  deckAO: { lift: 0.5, grad: 0.25, specWeight: 0.7 },
}

/* ------------------------------------------------------------------ ground shadow catcher */
const groundTex = makeGroundTexture()
const groundMat = new THREE.ShaderMaterial({
  uniforms: {
    map: { value: groundTex },
    strength: { value: 0.6 },
    tint: { value: new THREE.Vector3() },
    box: { value: new THREE.Vector4(GROUND.x0, GROUND.x1, GROUND.z0, GROUND.z1) },
    // elliptical fade around the footprint, so no shadow reaches the image edges (rx, rz, cz, inner)
    fade: { value: new THREE.Vector4(DIM.W / 2 + 0.6, DIM.DEPTH / 2 + 0.75, -0.2, 0.7) },
  },
  vertexShader: 'uniform vec4 box; varying vec2 vUv; varying vec2 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; vUv = vec2((w.x - box.x) / (box.y - box.x), (box.w - w.z) / (box.w - box.z)); gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform sampler2D map; uniform float strength; uniform vec3 tint; uniform vec4 fade; varying vec2 vUv; varying vec2 vW;
    void main(){
      float edge = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x) * smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
      float e = length(vec2(vW.x / fade.x, (vW.y - fade.z) / fade.y));
      edge *= 1.0 - smoothstep(fade.w, 1.0, e);
      float s = texture2D(map, vUv).a * strength * edge;
      gl_FragColor = vec4(tint, s);
    }`,
  transparent: true,
  depthWrite: false,
})
const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND.x1 - GROUND.x0, GROUND.z1 - GROUND.z0), groundMat)
ground.rotation.x = -PI / 2
ground.position.set((GROUND.x0 + GROUND.x1) / 2, -0.0005, (GROUND.z0 + GROUND.z1) / 2)
ground.renderOrder = -1

/* ------------------------------------------------------------------ view / framing */
/**
 * The camera looks down by `elev` degrees, straight on; with the lid at 90 + elev the panel is
 * parallel to the sensor, so the screen projects to an exact rectangle (crisp DOM). An off-axis
 * frustum frames the laptop at every lid angle.
 */
function frame(cfg) {
  const { elev = 20, yaw = 0, dist = 12, lateral = 0, rise = 0, aspect = 1.6, margin = { l: 0.03, r: 0.03, t: 0.03, b: 0.06 }, openDeg } = cfg
  camera.rotation.set((-elev * PI) / 180, (yaw * PI) / 180, 0, 'YXZ')
  camera.updateMatrixWorld(true)
  L.setOpen(openDeg)
  const target = L.screenCorners().reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(0.25)
  const back = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
  camera.position.copy(target).addScaledVector(back, dist).addScaledVector(right, lateral).addScaledVector(up, rise)
  camera.updateMatrixWorld(true)
  const pts = []
  const box = new THREE.Box3()
  for (const a of [0, 25, 50, 75, 90, openDeg]) {
    L.setOpen(a)
    box.setFromObject(L.root, true)
    for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z))
  }
  L.setOpen(openDeg)
  VIEW = { ...fitFrustum(camera, pts, { aspect, margin }), openDeg }
  setProjection(camera, VIEW)
  return VIEW
}

/** Normalised image coordinates (0..1, origin top-left) of the screen corners [tl, tr, br, bl]. */
function corners(openDeg = VIEW.openDeg) {
  L.setOpen(openDeg)
  return project(camera, VIEW, L.screenCorners())
}

/* ------------------------------------------------------------------ render */
function applyMode(mode) {
  L.panel.material = mode === 'open' ? MODE_MATS.panelOpen : mode === 'glare' ? MODE_MATS.panelGlare : MATS.panel
  const only = mode === 'glare' ? new Set([L.panel]) : null
  L.root.traverse((o) => { if (o.isMesh) o.visible = !only || only.has(o) })
  ground.visible = mode !== 'glare'
}

async function render(cfg) {
  const t0 = performance.now()
  // shutter: [from, to] lid angles — the samples spread across it (motion blur baked into the frame)
  const { width, ss = 2, samples = 16, openDeg, mode = 'beauty', name, shadow = {}, shutter = null } = cfg
  const W = Math.round(width * ss)
  const H = Math.round(W / VIEW.aspect)
  L.setOpen(openDeg)
  camera.updateMatrixWorld(true)
  if (mode !== 'glare') {
    updateDeckAO(MATS.deckAO, L.pivot, camera.position, STATE.deckAO)
    MATS.deckAOKeys.needsUpdate = true
    bakeGround(groundTex, L.pivot, { ...STATE.ground, ...(cfg.ground || {}) })
  }
  const tBake = performance.now() - t0
  groundMat.uniforms.strength.value = shadow.strength ?? STATE.shadow.strength
  groundMat.uniforms.tint.value.set(...(shadow.tint ?? STATE.shadow.tint))
  scene.environment = MATS.envMap
  applyMode(mode)
  nfUniforms.nfViewInv.value.copy(camera.matrixWorld)
  const beforeSample = shutter ? (i) => L.setOpen(shutter[0] + ((shutter[1] - shutter[0]) * (i + 0.5)) / samples) : null
  const buf = accumulate({ scene, camera, view: VIEW, W, H, samples, exposure: cfg.exposure ?? STATE.exposure, beforeSample })
  L.setOpen(openDeg)
  applyMode('beauty')
  const tRender = performance.now() - t0 - tBake
  await post(name, W, H, buf)
  return { ms: Math.round(performance.now() - t0), bake: Math.round(tBake), render: Math.round(tRender), W, H }
}

async function init(cfg = {}) {
  const font = await loadFont()
  let monogram = null
  try {
    monogram = (await import('/brand/brandMarks.generated.js')).MONOGRAM_N.d
  } catch {
    monogram = null
  }
  MATS = makeMaterials(cfg.materials || {})
  L = buildLaptop({ mats: MATS, font, monogram })
  scene.add(L.root, ground)
  MATS.envMap = buildStudio(renderer, cfg.studio || {})
  // lid occlusion on the deck (recomputed per lid angle); keys read it through their second uv set
  MATS.deckAO = makeDeckAO()
  MATS.deckAOKeys = MATS.deckAO.clone()
  MATS.deckAOKeys.channel = 1
  for (const m of [MATS.alu, MATS.chamfer, MATS.dark, MATS.pad]) {
    m.aoMap = MATS.deckAO
    m.aoMapIntensity = 1
  }
  MATS.keys.aoMap = MATS.deckAOKeys
  MODE_MATS.panelOpen = MATS.panel.clone()
  MODE_MATS.panelOpen.specularIntensity = 0
  MODE_MATS.panelGlare = MATS.panel.clone()
  MODE_MATS.panelGlare.color.set(0x000000)
  for (const m of [MATS.alu, MATS.chamfer, MATS.lidAlu, MATS.lidChamfer, MATS.pad, MATS.keys, MATS.hinge, MATS.inlay]) withNearField(m, 'body')
  for (const m of [MATS.glass, MATS.panel, MODE_MATS.panelOpen, MODE_MATS.panelGlare]) withNearField(m, 'glass')
  setCards(cfg.cards || CARDS)
  update({ ...cfg, studio: undefined, cards: undefined })
  return { ...glInfo(), dim: DIM, monogram: Boolean(monogram) }
}

/** Change look parameters without rebuilding the scene (look-dev variants). */
function update(cfg = {}) {
  if (cfg.exposure) STATE.exposure = cfg.exposure
  if (cfg.shadow) Object.assign(STATE.shadow, cfg.shadow)
  if (cfg.ground) Object.assign(STATE.ground, cfg.ground)
  if (cfg.deckAO) Object.assign(STATE.deckAO, cfg.deckAO)
  for (const [name, props] of Object.entries(cfg.materials || {})) {
    const list = name === 'alu' ? [MATS.alu, MATS.lidAlu] : name === 'chamfer' ? [MATS.chamfer, MATS.lidChamfer] : [MATS[name]]
    for (const m of list) {
      for (const [k, v] of Object.entries(props)) {
        if (m[k] && m[k].isColor) m[k].set(v)
        else m[k] = v
      }
    }
  }
  if (cfg.studio && MATS.envMap) {
    MATS.envMap = buildStudio(renderer, cfg.studio)
    scene.environment = MATS.envMap
  }
  if (cfg.cards) setCards(cfg.cards)
  if (cfg.nfGain !== undefined) nfUniforms.nfGain.value = cfg.nfGain
  if (cfg.view && VIEW) frame(cfg.view)
  return true
}

function dumpGround() {
  const { width, height, data } = groundTex.image
  let bin = ''
  for (let i = 3; i < data.length; i += 4) bin += String.fromCharCode(data[i])
  return { width, height, b64: btoa(bin) }
}

window.R = { init, frame, render, corners, update, dumpGround, envView: (o) => envView(MATS.envMap, o), DIM }
window.__ready = true
