/**
 * Patient photos for the fictional demo patients, keyed by chart number (src/portfolio/emr/fixtures.js).
 *
 * Every photo is bundled: src/brand/pets/<key>.webp (640 px square) and <key>-320.webp (320 px, for every
 * size up to 160 CSS px at 2x), imported through Vite as hashed assets. Nothing is fetched from another host.
 * Each file is over 4 kB on purpose (see __tests__/photos.test.js): Vite would inline a smaller import into
 * the JS chunk, and the standalone build relies on these imports being droppable data.
 * The squares are composed for the face (eyes near the upper third), so `pos` only matters when a caller
 * shows one in a non-square box. Credits: src/brand/credits.js (PhotoCredits renders them at /#credits).
 *
 * 나비 (#1310) is "Chelsea the cat" (scikit-image sample data, CC0) and is inlined (?inline): the offline
 * standalone build (vite.portfolio.config.js) is one self-contained file whose CSP allows data: images only,
 * and it must stay inside its size budget, so 나비 is the one portrait it carries. There `FILES` is empty,
 * the bundler drops the other imports (they would be data: URIs there, which tree-shake away; do not add
 * ?url or ?no-inline, those emit files the single-file build rejects), and PetAvatar draws the initial.
 *
 * The patients, names and charts are fictional; the photos only illustrate them.
 */
import nabiPhoto from './pets/nabi.webp?inline'

/** The standalone build is the only one with a relative base (vite.portfolio.config.js `base: './'`). */
const STANDALONE = import.meta.env.BASE_URL === './'

/** './pets/choco.webp' → hashed URL, for every portrait but 나비 (inlined above). */
const FILES = STANDALONE ? {} : import.meta.glob(['./pets/*.webp', '!./pets/nabi.webp'], { eager: true, import: 'default' })

function pet(key, name, species, pos) {
  return { key, name, species, photo: FILES[`./pets/${key}.webp`] || null, thumb: FILES[`./pets/${key}-320.webp`] || null, pos }
}

export const PETS = {
  '1042': pet('choco', '초코', 'dog', '50% 30%'),
  '0877': pet('kongyi', '콩이', 'dog', '60% 45%'),
  '1310': { key: 'nabi', name: '나비', species: 'cat', photo: nabiPhoto, thumb: null, pos: '50% 40%', bundled: true },
  '1455': pet('mochi', '모찌', 'cat', '50% 35%'),
  '0921': pet('daebak', '대박', 'dog', '50% 35%'),
  '1502': pet('bori', '보리', 'dog', '50% 35%'),
  '0650': pet('happy', '해피', 'dog', '50% 35%'),
  '1388': pet('leo', '레오', 'cat', '50% 35%'),
  '1620': pet('dubu', '두부', 'dog', '50% 35%'),
  '1733': pet('coco', '코코', 'dog', '50% 35%'),
}

/** The photo record for a chart number, or a photo-less one for the species (PetAvatar shows the initial). */
export function petFor(id, species) {
  const p = PETS[String(id)]
  if (p) return p
  const cat = /feline|cat|고양이/i.test(String(species || ''))
  return { key: null, name: '', species: cat ? 'cat' : 'dog', photo: null, thumb: null, pos: '50% 40%' }
}
