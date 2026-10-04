/**
 * PhotoCredits: the plain-text credit list for every photograph the site ships (src/brand/credits.js).
 * The landing footer places it in its "사진 출처" section (id="credits"); the EMR demo links to /#credits.
 *
 *   <PhotoCredits />                    note + list (12 px Pretendard, muted, underlined links)
 *   <PhotoCredits note={false} />       the list only
 *
 * Each line: what the photo shows on the site, the title (linked to its source page), the author (linked
 * to their profile) and the licence (linked, rel="license"); a line names its extra change when it had one
 * beyond the crop, grade and resize every photo got. Styles: src/brand/credits.css (override the colour
 * with --nvb-credits-fg / --nvb-credits-link on a dark surface).
 */
import { PHOTO_CREDITS } from './credits.js'
import './brand.css'
import './credits.css'

const DEFAULT_CHANGES = 'cropped, colour-graded, resized'
const EXTRA = { 'cropped, background stand retouched out, colour-graded, resized': '배경 일부 보정' }

export function PhotoCredits({ note = true, className, ...rest }) {
  return (
    <div className={`nvb-credits${className ? ` ${className}` : ''}`} data-brand-surface="" {...rest}>
      {note ? (
        <p className="nvb-credits-note">
          환자 이름과 진료 기록은 가상이며, 사진은 화면을 보여 주기 위해 사용했습니다. 모든 사진은 잘라내고 색을 보정하고 크기를 조정했습니다.
        </p>
      ) : null}
      <ul className="nvb-credits-list">
        {PHOTO_CREDITS.map((c) => (
          <li key={c.key} data-photo={c.key}>
            <span className="nvb-credits-use">{c.use}</span>{' '}
            <a href={c.source} lang={c.titleLang} rel="noreferrer">“{c.title}”</a>,{' '}
            <a href={c.authorUrl} rel="noreferrer">{c.author}</a>,{' '}
            <a href={c.licenseUrl} rel="license noreferrer">{c.license}</a>
            {c.changes !== DEFAULT_CHANGES && EXTRA[c.changes] ? `, ${EXTRA[c.changes]}` : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PhotoCredits
