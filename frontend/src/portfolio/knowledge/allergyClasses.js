/** Drug-allergy classes. `aliases` are exact free-text spellings the EMR
 *  adapter recognises (after normalisation; never fuzzy). A prescribed drug whose flags.allergyClass is listed in
 *  the patient's allergies triggers ALLERGY_CLASS. Cross-reactivity between
 *  classes is deliberately not modelled in this prototype. */

export const ALLERGY_CLASSES = [
  { id: 'penicillin', label: { en: 'Penicillins (β-lactam)', ko: '페니실린계(베타락탐)' }, aliases: ['PCN', '페니실린류'] },
  { id: 'cephalosporin', label: { en: 'Cephalosporins', ko: '세팔로스포린계' } },
  { id: 'sulfonamide', label: { en: 'Sulfonamides', ko: '설폰아마이드계' }, aliases: ['Sulfa', '설파', '설파제'] },
  { id: 'fluoroquinolone', label: { en: 'Fluoroquinolones', ko: '플루오로퀴놀론계' } },
  { id: 'nitroimidazole', label: { en: 'Nitroimidazoles', ko: '니트로이미다졸계' } },
  { id: 'nsaid', label: { en: 'NSAIDs', ko: '비스테로이드성 소염진통제(NSAID)' } },
  { id: 'azole', label: { en: 'Azole antifungals', ko: '아졸계 항진균제' } },
  { id: 'macrocyclic_lactone', label: { en: 'Macrocyclic lactones', ko: '마크로사이클릭 락톤계' } },
  { id: 'opioid', label: { en: 'Opioids', ko: '오피오이드' } },
  { id: 'ace_inhibitor', label: { en: 'ACE inhibitors', ko: 'ACE 억제제' } },
]

export const ALLERGY_BY_ID = Object.fromEntries(ALLERGY_CLASSES.map((a) => [a.id, a]))
