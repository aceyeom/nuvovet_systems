/**
 * PetAvatar: a patient's photo (src/brand/pets.js), with the pet's first syllable on a neutral tile behind
 * it. The tile shows while the photo loads and stays when there is no photo (the offline standalone build
 * carries only 나비; an unknown chart number has none).
 *
 *   <PetAvatar id="1042" size={34} shape="square" />        EMR legacy thumbnail (2 px corners)
 *   <PetAvatar id="1042" size={44} shape="round" name="초코" />
 *
 * Props: id (chart number), species (only for an unknown id), name (overrides the record's name for the
 * label and the initial), size (px, default 40), shape 'round' (default) | 'square' ('rounded', 6 px, is
 * still accepted), ring (1.5 px outline in the product ink), className, style, alt (the accessible name;
 * alt="" makes it decorative; default "<name> 사진").
 * srcset offers the 320 px file (every size up to 160 CSS px at 2x) and the 640 px one for larger or denser.
 * Styles: .nvb-pet in src/brand/brand.css.
 */
import { useEffect, useRef, useState } from 'react'
import { petFor } from './pets.js'
import './brand.css'

/** A page whose CSP allows only data: images (the offline standalone build) never requests a file. */
const dataOnly = (() => {
  try {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || ''
    return /img-src\s+data:\s*(;|$)/.test(csp)
  } catch {
    return false
  }
})()
const usable = (src) => Boolean(src) && (!dataOnly || src.startsWith('data:'))

/** The first syllable (or letter) of a name: 초코 → 초. */
const initialOf = (name) => (name ? Array.from(String(name).trim())[0] || '' : '')

export function PetAvatar({ id, species, name, size = 40, shape = 'round', ring = false, className, style, alt }) {
  const pet = petFor(id, species)
  const photo = usable(pet.photo) ? pet.photo : null
  const thumb = photo && usable(pet.thumb) ? pet.thumb : null
  const [state, setState] = useState(photo ? 'loading' : 'none')
  const img = useRef(null)
  useEffect(() => {
    // A cached photo can finish before React attaches onLoad.
    if (photo && img.current?.complete && img.current.naturalWidth > 0) setState('loaded')
    else setState(photo ? 'loading' : 'none')
  }, [photo])
  const shown = name || pet.name
  const label = alt ?? (shown ? `${shown} 사진` : undefined)
  const px = typeof size === 'number' ? size : null
  return (
    <span
      className={`nvb-pet${className ? ` ${className}` : ''}`}
      data-shape={shape}
      data-ring={ring || undefined}
      data-loaded={state === 'loaded' || undefined}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
      style={{ width: size, height: size, '--nvb-pet-pos': pet.pos, ...style }}
    >
      <span className="nvb-pet-fallback" aria-hidden="true">
        {initialOf(shown)}
      </span>
      {photo && state !== 'error' ? (
        <img
          ref={img}
          src={thumb || photo}
          srcSet={thumb ? `${thumb} 320w, ${photo} 640w` : undefined}
          sizes={thumb ? (px ? `${px}px` : '160px') : undefined}
          width={px || undefined}
          height={px || undefined}
          alt=""
          loading="lazy"
          decoding="async"
          draggable="false"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
      ) : null}
    </span>
  )
}

export default PetAvatar
