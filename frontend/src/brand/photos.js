/**
 * Editorial photographs for the landing (src/brand/photos/*.webp, hashed by Vite). One series: the patient
 * grade (neutral white balance, gentle contrast) with less colour still, because the closing photo is black and
 * white (초코 colour 0.68 with a highlight roll-off on the flash-lit chin; the kitten 0.78). Square corners
 * (radius 0) wherever they are shown. Credits: src/brand/credits.js (`credit` is the key there).
 * Sources are the Open Images copies, 1024 px on the long side (the largest reachable): the 3:2 frames ship
 * at that native size, uncropped; nothing is upscaled but the 초코 crop.
 *
 *   import { PHOTOS } from '@/brand/photos'
 *   <img src={PHOTOS.chocoPortrait.src} width={PHOTOS.chocoPortrait.width} height={…} alt={PHOTOS.chocoPortrait.alt} />
 *
 * chocoPortrait  4:5   1000×1250 초코 (the rough collie patient, chart 1042): the whole head and ruff, eyes on the
 *                                 upper third, mouth closed; DUR chapter. The source crop is 546×683 (the largest
 *                                 copy available), resized with Lanczos and a light unsharp mask
 * dogHighkey     3:2   1024×683  small black-and-white dog on white, black-and-white high key; lots of air left
 * kittenHands    3:2   1024×683  a sleeping white kitten held in two hands (the whole frame)
 * The two editorial ones share one mood (pale ground, near monochrome). Ship only photos a page shows:
 * every file here is credited at /#credits.
 * Not in the offline standalone build (it allows data: images only); do not import this module there.
 */
import chocoPortrait from './photos/choco-portrait.webp'
import dogHighkey from './photos/dog-highkey.webp'
import kittenHands from './photos/kitten-hands.webp'

export const PHOTOS = {
  chocoPortrait: { src: chocoPortrait, width: 1000, height: 1250, alt: '정면을 바라보는 러프 콜리 초코', credit: 'choco' },
  dogHighkey: { src: dogHighkey, width: 1024, height: 683, alt: '흰 바닥에 앉아 위를 올려다보는 작은 개', credit: 'dog-highkey' },
  kittenHands: { src: kittenHands, width: 1024, height: 683, alt: '두 손에 안겨 잠든 흰 아기 고양이', credit: 'kitten-hands' },
}

export default PHOTOS
