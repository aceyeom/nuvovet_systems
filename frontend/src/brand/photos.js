/**
 * Editorial photographs for the landing (src/brand/photos/*.webp, hashed by Vite). Same grade as the patient
 * portraits: neutral white balance, saturation −10 %, gentle contrast. Square corners (radius 0) wherever
 * they are shown. Credits: src/brand/credits.js (`credit` is the key there).
 *
 *   import { PHOTOS } from '@/brand/photos'
 *   <img src={PHOTOS.chocoPortrait.src} width={PHOTOS.chocoPortrait.width} height={…} alt={PHOTOS.chocoPortrait.alt} />
 *
 * chocoPortrait  4:5   800×1000  초코 (the rough collie patient, chart 1042), a close portrait; DUR chapter
 * dogHighkey     3:2   1024×683  small black-and-white dog on white, black-and-white high key; lots of air left
 * kittenHands    3:2   960×640   a sleeping white kitten held in two hands
 * blackCat       4:5   768×960   a black cat on pale stone, looking at the camera
 * The three editorial ones share one mood (pale ground, near monochrome); use one or two per page, not all.
 * Not in the offline standalone build (it allows data: images only); do not import this module there.
 */
import chocoPortrait from './photos/choco-portrait.webp'
import dogHighkey from './photos/dog-highkey.webp'
import kittenHands from './photos/kitten-hands.webp'
import blackCat from './photos/black-cat.webp'

export const PHOTOS = {
  chocoPortrait: { src: chocoPortrait, width: 800, height: 1000, alt: '러프 콜리 초코의 얼굴', credit: 'choco' },
  dogHighkey: { src: dogHighkey, width: 1024, height: 683, alt: '흰 바닥에 앉아 위를 올려다보는 작은 개', credit: 'dog-highkey' },
  kittenHands: { src: kittenHands, width: 960, height: 640, alt: '두 손에 안겨 잠든 흰 아기 고양이', credit: 'kitten-hands' },
  blackCat: { src: blackCat, width: 768, height: 960, alt: '밝은 돌바닥에 앉아 정면을 보는 검은 고양이', credit: 'black-cat' },
}

export default PHOTOS
