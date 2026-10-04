/*
 * Near-field soft cards: analytic softboxes evaluated per pixel along the true reflection ray
 * (from the shaded point, not from the scene origin like an environment map). They give the
 * position-dependent gradients of studio product photography — the sweep across a lid, the soft
 * glare across a black screen — that an infinitely distant environment cannot. Roughness widens the
 * card's falloff with distance, so glossy metal shows a soft gradient and glass a crisper one.
 * Injected into MeshPhysicalMaterial's indirect specular, so the aoMap's specular occlusion applies.
 */
import * as THREE from 'three'

const NF_MAX = 6

export const nfUniforms = {
  nfCount: { value: 0 },
  nfC: { value: Array.from({ length: NF_MAX }, () => new THREE.Vector3()) },
  nfX: { value: Array.from({ length: NF_MAX }, () => new THREE.Vector3(1, 0, 0)) },
  nfY: { value: Array.from({ length: NF_MAX }, () => new THREE.Vector3(0, 1, 0)) },
  nfS: { value: Array.from({ length: NF_MAX }, () => new THREE.Vector4(1, 1, 0.2, 0)) },
  nfG: { value: Array.from({ length: NF_MAX }, () => new THREE.Vector4(1, 1, 1, 1)) },
  nfViewInv: { value: new THREE.Matrix4() },
  nfGain: { value: 1 },
  // lid "reflection hold" (radians): materials hooked with { hold: true } shade as if the lid were this
  // much closer to shut (a rotation of the normal about the hinge axis, world x). See scene.js setLid.
  nfHold: { value: 0 },
}

const HEADER = /* glsl */ `
#define NF_MAX ${NF_MAX}
uniform int nfCount;
uniform vec3 nfC[NF_MAX];
uniform vec3 nfX[NF_MAX];
uniform vec3 nfY[NF_MAX];
uniform vec4 nfS[NF_MAX];
uniform vec4 nfG[NF_MAX];
uniform mat4 nfViewInv;
uniform float nfGain;
uniform float nfOn[NF_MAX];
uniform float nfHold;
vec3 nearField( vec3 p, vec3 r, float rough ) {
  vec3 acc = vec3( 0.0 );
  float a = rough * rough;
  for ( int i = 0; i < NF_MAX; i ++ ) {
    if ( i >= nfCount ) break;
    if ( nfOn[ i ] < 0.5 ) continue;
    vec3 n = normalize( cross( nfX[ i ], nfY[ i ] ) );
    float dn = dot( r, n );
    if ( abs( dn ) < 1e-4 ) continue;
    float t = dot( nfC[ i ] - p, n ) / dn;
    if ( t <= 0.0 ) continue;
    vec3 h = p + r * t - nfC[ i ];
    float u = dot( h, nfX[ i ] ) / nfS[ i ].x;
    float v = dot( h, nfY[ i ] ) / nfS[ i ].y;
    float blur = ( 0.01 + 1.7 * a ) * t;
    float fx = nfS[ i ].z + blur / nfS[ i ].x;
    float fy = nfS[ i ].z + blur / nfS[ i ].y;
    float sx = 1.0 - smoothstep( 1.0 - fx, 1.0 + fx, abs( u ) );
    float sy = 1.0 - smoothstep( 1.0 - fy, 1.0 + fy, abs( v ) );
    float gy = mix( nfG[ i ].y, nfG[ i ].x, clamp( v * 0.5 + 0.5, 0.0, 1.0 ) );
    float gx = mix( nfG[ i ].z, nfG[ i ].w, clamp( u * 0.5 + 0.5, 0.0, 1.0 ) );
    float spread = ( 1.0 + blur / nfS[ i ].x ) * ( 1.0 + blur / nfS[ i ].y );
    acc += vec3( nfS[ i ].w * sx * sy * gx * gy / spread );
  }
  return acc;
}
`

const HOLD = /* glsl */ `
#ifdef NF_HOLD
{
  vec3 k = normalize( ( viewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
  float c = cos( nfHold );
  float s = sin( nfHold );
  geometryNormal = normalize( geometryNormal * c + cross( k, geometryNormal ) * s + k * dot( k, geometryNormal ) * ( 1.0 - c ) );
}
#endif
`

const INJECT = /* glsl */ `
#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
{
  vec3 nfP = ( nfViewInv * vec4( geometryPosition, 1.0 ) ).xyz;
  vec3 nfN = normalize( ( nfViewInv * vec4( geometryNormal, 0.0 ) ).xyz );
  vec3 nfD = normalize( nfP - cameraPosition );
  #ifdef NF_FLAG
    // the screen glass: what it mirrors below the horizon is the laptop's own deck and a black flag on
    // the floor in front (a product-photography trick), not the white sweep. Without it the half-open
    // lid mirrors the bright floor at grazing incidence and reads as a pale ghost, then a grey slab.
    radiance *= mix( NF_FLAG, 1.0, smoothstep( -0.15, 0.1, reflect( nfD, nfN ).y ) );
  #endif
  radiance += nearField( nfP, reflect( nfD, nfN ), material.roughness ) * nfGain;
  #ifdef USE_CLEARCOAT
    vec3 nfNc = normalize( ( nfViewInv * vec4( geometryClearcoatNormal, 0.0 ) ).xyz );
    clearcoatRadiance += nearField( nfP, reflect( nfD, nfNc ), material.clearcoatRoughness ) * nfGain;
  #endif
}
#endif
`

/**
 * Hook a MeshStandard/Physical material up to the shared near-field cards.
 * `only`: optional list of card names this material reflects (default: every card without `only` of its own).
 * `flag`: scale the environment reflection by this for rays pointing below the horizon (screen glass).
 */
export function withNearField(material, group = 'body', { hold = false, flag = null } = {}) {
  const on = { value: new Array(NF_MAX).fill(0) }
  material.userData.nfGroup = group
  material.userData.nfOn = on
  registry.add(material)
  if (hold) material.defines = { ...(material.defines || {}), NF_HOLD: '' }
  // flag: the environment reflection's floor (0..1) for rays below the horizon (glass; see INJECT)
  if (flag != null) material.defines = { ...(material.defines || {}), NF_FLAG: Number(flag).toFixed(3) }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, nfUniforms, { nfOn: on })
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', HEADER + '\nvoid main() {')
      .replace('#include <lights_fragment_maps>', HOLD + INJECT)
  }
  material.customProgramCacheKey = () => `nearfield-v2${hold ? '-hold' : ''}${flag != null ? `-flag${flag}` : ''}`
  material.needsUpdate = true
  return material
}

const registry = new Set()

/**
 * cards: [{ pos, size: [w, h], target, intensity, feather, gradY: [top, bottom], gradX: [left, right], groups }]
 * `groups` lists the material groups that see the card (default ['body']); glass is group 'glass'.
 */
export function setCards(cards) {
  for (const m of registry) {
    const on = m.userData.nfOn.value
    on.fill(0)
    cards.slice(0, NF_MAX).forEach((c, i) => { on[i] = (c.groups || ['body']).includes(m.userData.nfGroup) ? 1 : 0 })
  }
  const o = new THREE.Object3D()
  nfUniforms.nfCount.value = Math.min(cards.length, NF_MAX)
  cards.slice(0, NF_MAX).forEach((c, i) => {
    o.position.set(...c.pos)
    o.lookAt(new THREE.Vector3(...(c.target || [0, 0.5, 0])))
    o.updateMatrixWorld(true)
    nfUniforms.nfC.value[i].set(...c.pos)
    nfUniforms.nfX.value[i].set(1, 0, 0).applyQuaternion(o.quaternion)
    nfUniforms.nfY.value[i].set(0, 1, 0).applyQuaternion(o.quaternion)
    nfUniforms.nfS.value[i].set(c.size[0] / 2, c.size[1] / 2, c.feather ?? 0.25, c.intensity ?? 1)
    const gy = c.gradY || [1, 1]
    const gx = c.gradX || [1, 1]
    nfUniforms.nfG.value[i].set(gy[0], gy[1], gx[0], gx[1])
  })
}
