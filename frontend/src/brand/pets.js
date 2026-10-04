/**
 * Patient photos for the fictional demo patients, keyed by chart number (src/portfolio/emr/fixtures.js).
 *
 * - 나비 (#1310) is a bundled photo: "Chelsea the cat" by Stefan van der Walt, CC0, shipped with
 *   scikit-image's sample data. It is inlined (?inline) so the offline standalone build can show it.
 * - Every other photo is hot-linked from the Unsplash CDN (Unsplash licence: free to use, hot-linking
 *   is the CDN's intended use). Swap an id here to change a patient's photo everywhere.
 *   Where the CDN is unreachable (offline builds, strict CSP), PetAvatar draws a species glyph instead.
 *
 * The patients, names and charts are fictional; the photos only illustrate them.
 */
import nabiPhoto from './pets/nabi.jpg?inline'

const unsplash = (id, w = 320) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${w}&q=70`

/** Warm, species-tinted fallbacks (also the photo frame's background while it loads). */
const TONE = {
  cocoa: { bg: 'linear-gradient(140deg, #F4E2CC, #DDB98F)', fg: '#6B4521' },
  cream: { bg: 'linear-gradient(140deg, #FBF1E1, #EBD5B3)', fg: '#7A5A2E' },
  gold: { bg: 'linear-gradient(140deg, #FCEBC8, #F0C77E)', fg: '#7A4E0E' },
  slate: { bg: 'linear-gradient(140deg, #E3E8F1, #BCC6D8)', fg: '#384761' },
  tabby: { bg: 'linear-gradient(140deg, #EFE3D3, #CDB291)', fg: '#5C4428' },
  ink: { bg: 'linear-gradient(140deg, #E6E7EE, #C3C6D3)', fg: '#2F3445' },
}

export const PETS = {
  '1042': { name: '초코', species: 'dog', tone: TONE.cocoa, photo: unsplash('photo-1568572933382-74d440642117'), pos: '50% 35%' },
  '0877': { name: '콩이', species: 'dog', tone: TONE.cream, photo: unsplash('photo-1583337130417-3346a1be7dee'), pos: '50% 40%' },
  '1310': { name: '나비', species: 'cat', tone: TONE.tabby, photo: nabiPhoto, pos: '50% 45%', bundled: true },
  '1455': { name: '모찌', species: 'cat', tone: TONE.tabby, photo: unsplash('photo-1514888286974-6c03e2ca1dba'), pos: '50% 40%' },
  '0921': { name: '대박', species: 'dog', tone: TONE.gold, photo: unsplash('photo-1587300003388-59208cc962cb'), pos: '50% 40%' },
  '1502': { name: '보리', species: 'dog', tone: TONE.cream, photo: unsplash('photo-1561037404-61cd46aa615b'), pos: '50% 40%' },
  '0650': { name: '해피', species: 'dog', tone: TONE.gold, photo: unsplash('photo-1552053831-71594a27632d'), pos: '50% 35%' },
  '1388': { name: '레오', species: 'cat', tone: TONE.slate, photo: unsplash('photo-1518791841217-8f162f1e1131'), pos: '50% 40%' },
  '1620': { name: '두부', species: 'dog', tone: TONE.ink, photo: unsplash('photo-1543466835-00a7907e9de1'), pos: '50% 40%' },
  '1733': { name: '코코', species: 'dog', tone: TONE.cocoa, photo: unsplash('photo-1505628346881-b72b27e84530'), pos: '50% 40%' },
}

/** The photo record for a chart number, or a generic one for the species. */
export function petFor(id, species) {
  const p = PETS[String(id)]
  if (p) return p
  const cat = /feline|cat|고양이/i.test(String(species || ''))
  return { name: '', species: cat ? 'cat' : 'dog', tone: cat ? TONE.slate : TONE.cocoa, photo: null }
}
