/**
 * PetAvatar: a patient's photo with a designed fallback (species glyph on a warm tint) that shows
 * while the photo loads and stays when it cannot load (offline build, blocked CDN, broken id).
 */
import { useEffect, useState } from 'react'
import { Cat, Dog } from 'lucide-react'
import { petFor } from './pets.js'
import './brand.css'

/** The offline standalone build ships a CSP that only allows data: images: never request a remote photo there. */
const remoteBlocked = (() => {
  try {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || ''
    return /img-src\s+data:\s*(;|$)/.test(csp)
  } catch {
    return false
  }
})()
const usable = (src) => Boolean(src) && (!remoteBlocked || src.startsWith('data:'))

export function PetAvatar({ id, species, name, size = 40, shape = 'round', ring = false, className, style, alt }) {
  const pet = petFor(id, species)
  const photo = usable(pet.photo) ? pet.photo : null
  const [state, setState] = useState(photo ? 'loading' : 'none')
  useEffect(() => { setState(photo ? 'loading' : 'none') }, [photo])
  const Glyph = pet.species === 'cat' ? Cat : Dog
  const label = alt ?? (name || pet.name ? `${name || pet.name} 사진` : undefined)
  return (
    <span
      className={`nvb-pet${className ? ` ${className}` : ''}`}
      data-shape={shape}
      data-ring={ring || undefined}
      data-loaded={state === 'loaded' || undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      style={{ width: size, height: size, '--nvb-pet-bg': pet.tone.bg, '--nvb-pet-fg': pet.tone.fg, '--nvb-pet-pos': pet.pos, ...style }}
    >
      <span className="nvb-pet-fallback" aria-hidden="true">
        <Glyph />
      </span>
      {photo && state !== 'error' ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          draggable="false"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
        />
      ) : null}
    </span>
  )
}

export default PetAvatar
