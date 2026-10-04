/**
 * Credits for every photograph the site ships (src/brand/pets/*.webp, src/brand/photos/*.webp).
 * Rendered by PhotoCredits (the landing footer, #credits; the EMR demo links there as "사진 출처").
 *
 * The CC BY 2.0 photos were published on Flickr by their authors and reached us through Google's Open
 * Images dataset. CC BY asks for the title, author, source, licence and a note of the changes; all of them
 * are here. Every photo was cropped, colour-graded (neutral white balance, saturation −10 %, gentle
 * contrast) and resized. The maltese also had an out-of-focus stand behind its head painted out.
 * 나비 is "Chelsea the cat" from scikit-image's sample data, CC0 (no attribution required; credited anyway).
 *
 * The patients, their names and charts are fictional; the photos only illustrate them.
 *
 * Entry: { key, file, files, use, subject, title, author, authorUrl, flickr, source, license, licenseUrl, changes }
 *   file    the main export (repo path); files lists every export made from the same photo
 *   use     where it appears, in Korean (shown in the credits list)
 *   flickr  the photo's Flickr page (null for 나비); source is the page to link (= flickr when there is one)
 *   titleLang  set when the title is not in Latin script (lang attribute for screen readers)
 */

const CC_BY_2 = { license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/' }
const CHANGES = 'cropped, colour-graded, resized'

export const PHOTO_CREDITS = [
  {
    key: 'choco',
    file: 'src/brand/pets/choco.webp',
    files: ['src/brand/pets/choco.webp', 'src/brand/pets/choco-320.webp', 'src/brand/photos/choco-portrait.webp'],
    use: '초코 · 러프 콜리',
    subject: 'rough collie, head and shoulders',
    title: 'Lassie, July 29, 2006',
    author: 'Kevin Long',
    authorUrl: 'https://www.flickr.com/people/kevinlong/',
    flickr: 'https://www.flickr.com/photos/kevinlong/256060907',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'kongyi',
    file: 'src/brand/pets/kongyi.webp',
    files: ['src/brand/pets/kongyi.webp', 'src/brand/pets/kongyi-320.webp'],
    use: '콩이 · 시츄',
    subject: 'shih tzu lying on a bed',
    title: 'DSC_4453.JPG',
    author: 'Ryan Tir',
    authorUrl: 'https://www.flickr.com/people/ryan_tir/',
    flickr: 'https://www.flickr.com/photos/ryan_tir/62045895',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'nabi',
    file: 'src/brand/pets/nabi.webp',
    files: ['src/brand/pets/nabi.webp'],
    use: '나비 · 코리안숏헤어',
    subject: 'tabby cat, close-up',
    title: 'Chelsea the cat (scikit-image sample data)',
    author: 'Stefan van der Walt',
    authorUrl: 'https://github.com/stefanv',
    flickr: null,
    source: 'https://github.com/scikit-image/scikit-image/blob/v0.24.0/skimage/data/chelsea.png',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    changes: CHANGES,
  },
  {
    key: 'mochi',
    file: 'src/brand/pets/mochi.webp',
    files: ['src/brand/pets/mochi.webp', 'src/brand/pets/mochi-320.webp'],
    use: '모찌 · 코리안숏헤어',
    subject: 'tabby-and-white kitten on a grey backdrop',
    title: 'tabbygirl9',
    author: 'lovinkat',
    authorUrl: 'https://www.flickr.com/people/lovinkat/',
    flickr: 'https://www.flickr.com/photos/lovinkat/7595406412',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'daebak',
    file: 'src/brand/pets/daebak.webp',
    files: ['src/brand/pets/daebak.webp', 'src/brand/pets/daebak-320.webp'],
    use: '대박 · 래브라도 리트리버',
    subject: 'yellow labrador, sitting',
    title: 'Paddy again',
    author: 'Stuart Heath',
    authorUrl: 'https://www.flickr.com/people/misteraitch/',
    flickr: 'https://www.flickr.com/photos/misteraitch/5273027887',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'bori',
    file: 'src/brand/pets/bori.webp',
    files: ['src/brand/pets/bori.webp', 'src/brand/pets/bori-320.webp'],
    use: '보리 · 말티즈',
    subject: 'white maltese on a pink towel',
    title: 'IMG_4372',
    author: 'Mariposa Veterinary Wellness Center',
    authorUrl: 'https://www.flickr.com/people/mariposavet/',
    flickr: 'https://www.flickr.com/photos/mariposavet/9565289887',
    ...CC_BY_2,
    changes: 'cropped, background stand retouched out, colour-graded, resized',
  },
  {
    key: 'happy',
    file: 'src/brand/pets/happy.webp',
    files: ['src/brand/pets/happy.webp', 'src/brand/pets/happy-320.webp'],
    use: '해피 · 골든 리트리버',
    subject: 'golden retriever, frontal portrait',
    title: 'Sandy 3',
    author: 'tracey r',
    authorUrl: 'https://www.flickr.com/people/wanderingone/',
    flickr: 'https://www.flickr.com/photos/wanderingone/97044550',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'leo',
    file: 'src/brand/pets/leo.webp',
    files: ['src/brand/pets/leo.webp', 'src/brand/pets/leo-320.webp'],
    use: '레오 · 러시안 블루',
    subject: 'russian blue cat, sitting',
    title: 'Mitsu 2',
    author: 'Petteri Sulonen',
    authorUrl: 'https://www.flickr.com/people/primejunta/',
    flickr: 'https://www.flickr.com/photos/primejunta/78148945',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'dubu',
    file: 'src/brand/pets/dubu.webp',
    files: ['src/brand/pets/dubu.webp', 'src/brand/pets/dubu-320.webp'],
    use: '두부 · 푸들',
    subject: 'apricot poodle, studio portrait',
    title: 'Dog portrait',
    author: 'Brian Tomlinson',
    authorUrl: 'https://www.flickr.com/people/brian_tomlinson/',
    flickr: 'https://www.flickr.com/photos/brian_tomlinson/18081584784',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'coco',
    file: 'src/brand/pets/coco.webp',
    files: ['src/brand/pets/coco.webp', 'src/brand/pets/coco-320.webp'],
    use: '코코 · 비글',
    subject: 'tricolour beagle, frontal portrait',
    title: 'Test Shots Canon - Rascal 023',
    author: 'Scott Clark',
    authorUrl: 'https://www.flickr.com/people/lighttable/',
    flickr: 'https://www.flickr.com/photos/lighttable/324476056',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'dog-highkey',
    file: 'src/brand/photos/dog-highkey.webp',
    files: ['src/brand/photos/dog-highkey.webp'],
    use: '소개 사진 · 흰 바닥의 강아지',
    subject: 'small black-and-white dog, high-key black and white',
    title: '菲菲小姐隨影 IX',
    titleLang: 'zh-Hant',
    author: 'Alan Wat',
    authorUrl: 'https://www.flickr.com/people/alanwat/',
    flickr: 'https://www.flickr.com/photos/alanwat/20239945366',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'kitten-hands',
    file: 'src/brand/photos/kitten-hands.webp',
    files: ['src/brand/photos/kitten-hands.webp'],
    use: '소개 사진 · 손 안의 아기 고양이',
    subject: 'sleeping white kitten held in two hands',
    title: 'Bundle',
    author: 'Liv Estberger',
    authorUrl: 'https://www.flickr.com/people/7521408@N07/',
    flickr: 'https://www.flickr.com/photos/7521408@N07/2697539697',
    ...CC_BY_2,
    changes: CHANGES,
  },
  {
    key: 'black-cat',
    file: 'src/brand/photos/black-cat.webp',
    files: ['src/brand/photos/black-cat.webp'],
    use: '소개 사진 · 검은 고양이',
    subject: 'black cat on pale stone',
    title: 'p-8566',
    author: 'kuhnmi',
    authorUrl: 'https://www.flickr.com/people/31176607@N05/',
    flickr: 'https://www.flickr.com/photos/31176607@N05/14148417762',
    ...CC_BY_2,
    changes: CHANGES,
  },
].map((c) => ({ ...c, source: c.source || c.flickr }))

/** The credit for one photo key (a patient key such as 'choco', or an editorial key such as 'black-cat'). */
export function creditFor(key) {
  return PHOTO_CREDITS.find((c) => c.key === key) || null
}

export default PHOTO_CREDITS
