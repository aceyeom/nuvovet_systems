/**
 * DOSE_RANGE — entered dose outside the selected protocol's range.
 *   above max: major if ≥ 2× max, otherwise moderate
 *   below min: minor (efficacy)
 *   single-dose protocol repeated: moderate (major if each dose is also ≥ 2× max)
 *   no reference / unit mismatch: a note, not a finding
 *   entered route differs from the protocol's route: a note (the range may not apply)
 */

import { T, enName, koName, fmt, riskOrgans } from './util.js'
import { SINGLE_DOSE_OVER_DAILY } from './enroFelineRetina.js'

const RULE = { id: 'DOSE_RANGE', version: '1.1.0' }

function rangeText(ref) {
  const per = ref.per === 'day' ? '/day' : ''
  const perKo = ref.per === 'day' ? '/일' : ''
  const r = ref.min === ref.max ? `${fmt(ref.min)}` : `${fmt(ref.min)}–${fmt(ref.max)}`
  return T(`${r} ${ref.unit}${per}`, `${r} ${ref.unit}${perKo}`)
}

function evaluate(ctx) {
  const contributions = []
  const notes = []
  for (const m of ctx.meds) {
    const row = m.doseRow
    if (!row) continue
    const dEn = enName(m.drug), dKo = koName(m.drug)

    // A protocol is a reference for one route; a dose given by another route may not fit it.
    const protoRoutes = row.ref?.routes || (row.ref?.route ? [row.ref.route] : [])
    const routeDiffers = Boolean(m.protocol && m.med.route && protoRoutes.length && !protoRoutes.includes(m.med.route))
    const routeWhy = routeDiffers
      ? T(`The entered route (${m.med.route}) differs from the protocol route (${protoRoutes.join('/')}), so this reference range may not apply; select a protocol for the route given.`,
        `입력 경로(${m.med.route})가 프로토콜 경로(${protoRoutes.join('/')})와 달라 이 참고 범위가 맞지 않을 수 있습니다. 투여 경로에 맞는 프로토콜을 선택하십시오.`)
      : null
    if (routeDiffers) {
      notes.push({
        id: `dose_route_${m.drug.id}`,
        kind: 'administration',
        category: 'validation',
        drugIds: [m.drug.id],
        text: T(`${dEn}: ${routeWhy.en}`, `${dKo}: ${routeWhy.ko}`),
        sources: [],
      })
    }

    if (row.status === 'no_reference') {
      const why = m.protocol ? null : (m.drug.protocols.some((p) => p.species === ctx.species)
        ? T('no protocol was selected', '프로토콜(적응증)이 선택되지 않았습니다')
        : T(`this formulary has no reference dose for a ${ctx.species}`, `이 처방집에는 ${ctx.species === 'cat' ? '고양이' : '개'} 참고 용량이 없습니다`))
      notes.push({
        id: `dose_noref_${m.drug.id}`,
        kind: 'administration',
        category: 'validation',
        drugIds: [m.drug.id],
        text: T(`${dEn}: dose not checked — ${why ? why.en : 'no reference range'}.`, `${dKo}: 용량을 검토하지 않았습니다 — ${why ? why.ko : '참고 범위 없음'}.`),
        sources: [],
      })
      continue
    }
    if (row.status === 'unit_mismatch' && row.amount?.error === 'weight') continue // covered by the weight_missing note
    if (row.status === 'unit_mismatch') {
      notes.push({
        id: `dose_unit_${m.drug.id}`,
        kind: 'administration',
        category: 'validation',
        drugIds: [m.drug.id],
        text: T(`${dEn}: the entered dose or frequency cannot be compared with the protocol (${row.ref?.unit ?? '—'}); dose not checked.`, `${dKo}: 입력한 용량 또는 빈도를 프로토콜(${row.ref?.unit ?? '—'})과 비교할 수 없어 용량을 검토하지 않았습니다.`),
        sources: [],
      })
      continue
    }
    if (row.status === 'within') continue

    const ref = row.ref
    const rt = rangeText(ref)
    const entered = row.compared
    const enteredText = entered ? T(`${fmt(entered.value)} ${entered.unit}`, `${fmt(entered.value)} ${entered.unit.replace('/day', '/일')}`) : T('—', '—')
    let severity, title, consequence
    const why = []
    const repeat = row.status === 'above' && entered?.reason === 'repeat'
    const freqText = row.frequency || '—'
    let factorLabel = T(`${enteredText.en} (reference ${rt.en})`, `${enteredText.ko} (참고 ${rt.ko})`)
    let actions
    if (repeat) {
      // Each dose may be within (or below) the range: the problem is the repetition, not the size.
      severity = row.ratio != null && row.ratio >= 2 ? 'major' : 'moderate'
      title = T(`${dEn}: single-dose protocol prescribed repeatedly`, `${dKo}: 단회 투여 프로토콜을 반복 처방`)
      consequence = T('Repeated exposure that the referenced single-dose protocol does not cover.', '참고한 단회 투여 프로토콜이 다루지 않는 반복 노출입니다.')
      why.push(T(`The selected protocol (${ref.source}) is a single administration; the entered frequency (${freqText}) repeats it.`, `선택한 프로토콜(${ref.source})은 단회 투여인데 입력한 빈도(${freqText})는 반복 투여입니다.`))
      if (row.ratio != null && row.ratio > 1) {
        why.push(T(`Each dose is also above the reference: ${enteredText.en} vs ${rt.en} (${fmt(row.ratio)}× the maximum).`, `1회 용량도 참고 범위를 넘습니다: 입력 ${enteredText.ko}, 참고 ${rt.ko} (최대치의 ${fmt(row.ratio)}배).`))
      }
      factorLabel = T(`${enteredText.en} ${freqText} (protocol: single dose)`, `${enteredText.ko} ${freqText} (프로토콜: 단회)`)
      actions = [T(`This protocol covers one administration only (${rt.en}, once). Do not repeat it: give a single dose, or choose a protocol that supports repeated dosing.`,
        `이 프로토콜은 1회 투여(${rt.ko}, 1회)만 다룹니다. 반복하지 말고 1회만 투여하거나, 반복 투여를 지원하는 프로토콜을 선택하십시오.`)]
    } else if (row.status === 'above') {
      severity = row.ratio != null && row.ratio >= 2 ? 'major' : 'moderate'
      title = T(`${dEn} dose above the reference range`, `${dKo} 용량이 참고 범위를 초과함`)
      consequence = T('Higher exposure than the referenced protocol; dose-related adverse effects become more likely.', '참고 프로토콜보다 노출이 커져 용량 관련 부작용 가능성이 높아집니다.')
      why.push(T(`Entered ${enteredText.en} vs reference ${rt.en}${row.ratio != null ? ` (${fmt(row.ratio)}× the maximum)` : ''}.`, `입력 ${enteredText.ko}, 참고 범위 ${rt.ko}${row.ratio != null ? ` (최대치의 ${fmt(row.ratio)}배)` : ''}.`))
      if (entered?.reason === 'single_dose_exceeds_daily') {
        why.push(SINGLE_DOSE_OVER_DAILY)
      }
      actions = [T(`Re-check the calculation and bring the dose within ${rt.en}, or document why a higher dose is intended.`, `계산을 다시 확인하고 ${rt.ko} 이내로 조정하거나, 고용량이 의도된 이유를 기록하십시오.`)]
    } else {
      severity = 'minor'
      title = T(`${dEn} dose below the reference range`, `${dKo} 용량이 참고 범위보다 낮음`)
      consequence = T('Exposure may be too low for the intended effect.', '의도한 효과를 내기에 노출이 부족할 수 있습니다.')
      why.push(T(`Entered ${enteredText.en} vs reference ${rt.en}.`, `입력 ${enteredText.ko}, 참고 범위 ${rt.ko}.`))
      actions = [T(`Confirm the intended dose; the referenced range is ${rt.en}.`, `의도한 용량인지 확인하십시오. 참고 범위는 ${rt.ko}입니다.`)]
    }
    if (entered?.reason === 'frequency') {
      why.push(T('Compared as a daily total because the entered frequency differs from the protocol’s.', '입력 빈도가 프로토콜과 달라 1일 총량으로 비교했습니다.'))
    }
    if (routeWhy) why.push(routeWhy)
    if (m.protocol?.note) why.push(m.protocol.note)

    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity,
      problemKey: `dose:${m.drug.id}`,
      drugIds: [m.drug.id],
      factors: [{ kind: 'dose', id: `${m.drug.id}_${repeat ? 'repeat' : row.status}`, label: factorLabel }],
      title,
      consequence,
      why,
      actions,
      alternatives: [],
      sources: [ref.source, ...(m.protocol?.extraSources || [])].filter(Boolean),
      evidence: ref.labelStatus === 'label' ? 'label' : 'literature',
      ownerSigns: row.status === 'above' ? (m.drug.ownerSigns || []) : [],
      organs: row.status === 'above' ? riskOrgans(m.drug, ctx.species, 2) : [],
      inputs: [
        { fact: `dose.${m.drug.id}`, value: enteredText.en },
        { fact: `protocol.${m.protocol?.id}`, value: rt.en, source: ref.source },
        { fact: 'ratio', value: row.ratio != null ? `${fmt(row.ratio)}×` : '—' },
      ],
    })
  }
  return { contributions, notes }
}

export default {
  ...RULE,
  layer: 'dose',
  name: T('Dose range check', '용량 범위 검토'),
  sources: [],
  evaluate,
}
