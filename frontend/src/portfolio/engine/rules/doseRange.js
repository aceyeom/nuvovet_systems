/**
 * DOSE_RANGE — entered dose outside the selected protocol's range.
 *   above max: major if ≥ 2× max, otherwise moderate (never "above" when the source gives a minimum only)
 *   below min: minor (efficacy)
 *   starting-dose protocol (ref.phase 'start'): above or below → minor; the reference is where
 *     titration begins, not a maximum, so a refill at a titrated dose is not an overdose
 *   rows of the same ingredient summed in engine.js: checked once, on the first row
 *   single-dose protocol repeated: moderate (major if each dose is also ≥ 2× max)
 *   no reference / unit mismatch: a note, not a finding
 *   entered route differs from the protocol's route: a note (the range may not apply)
 */

import { T, enName, koName, fmt, riskOrgans } from './util.js'
import { SINGLE_DOSE_OVER_DAILY } from './enroFelineRetina.js'
import { fmtNum, fixFloat } from '../units.js'
import { FREQUENCY_BY_ID, perDayFactor } from '../dose.js'
import { getSource } from '../../knowledge/sources.js'

const RULE = { id: 'DOSE_RANGE', version: '1.2.0' }

function rangeText(ref) {
  const per = ref.per === 'day' ? '/day' : ''
  const perKo = ref.per === 'day' ? '/일' : ''
  if (ref.max == null) return T(`≥ ${fmt(ref.min)} ${ref.unit}${per}`, `≥ ${fmt(ref.min)} ${ref.unit}${perKo}`) // the source states a minimum only
  const r = ref.min === ref.max ? `${fmt(ref.min)}` : `${fmt(ref.min)}–${fmt(ref.max)}`
  return T(`${r} ${ref.unit}${per}`, `${r} ${ref.unit}${perKo}`)
}

/**
 * The reference stated per day, for a comparison the engine made on daily
 * totals (a per-dose protocol compared at another frequency). Both sides of
 * "entered (reference)" are then per day.
 */
function dailyRef(ref) {
  const factors = (Array.isArray(ref.frequency) ? ref.frequency : ref.frequency ? [ref.frequency] : [])
    .map(perDayFactor).filter((x) => x != null)
  if (!factors.length) return null
  return {
    ...ref,
    per: 'day',
    min: fixFloat(ref.min * Math.min(...factors)),
    max: ref.max == null ? null : fixFloat(ref.max * Math.max(...factors)),
  }
}

/** "Metacam label" / "Bhatti et al. 2015": a readable name for a source id. */
function sourceName(id) {
  const src = getSource(id)
  if (!src) return T('the referenced source', '참고 자료')
  if (src.kind === 'label') {
    const brand = src.cite.split(' (')[0]
    return T(`${brand} label`, `${brand} 라벨`)
  }
  const short = src.cite.split(',')[0]
  return T(short, short)
}

const lcFirst = (x) => x.charAt(0).toLowerCase() + x.slice(1)

const ROUTE_KO = { PO: '경구(PO)', SC: '피하(SC)', IM: '근육(IM)', IV: '정맥(IV)', topical: '국소', 'spot-on': '스팟온' }

/** Why a row has no reference dose, in words the vet can act on. */
function noReferenceWhy(m, ctx) {
  const species = ctx.species === 'cat' ? T('cat', '고양이') : T('dog', '개')
  const own = m.drug.protocols.filter((p) => p.species === ctx.species)
  if (m.drug.species && !m.drug.species.includes(ctx.species)) {
    const only = m.drug.species.map((x) => (x === 'cat' ? T('cats', '고양이') : T('dogs', '개')))
    return T(`this formulary lists it for ${only.map((x) => x.en).join(' and ')} only and has no reference dose for a ${species.en}`, `이 처방집에서 ${only.map((x) => x.ko).join('·')} 전용 약물이라 ${species.ko} 참고 용량이 없습니다`)
  }
  if (!own.length) return T(`this formulary has no reference dose for a ${species.en}`, `이 처방집에는 ${species.ko} 참고 용량이 없습니다`)
  const route = m.med.route
  if (route && !own.some((p) => [p.route, ...(p.altRoutes || [])].includes(route))) {
    return T(`this formulary has no ${species.en} reference dose for the ${route} route`, `이 처방집에는 ${ROUTE_KO[route] || route} 경로의 ${species.ko} 참고 용량이 없습니다`)
  }
  return T('no protocol (indication) was selected', '프로토콜(적응증)이 선택되지 않았습니다')
}

function evaluate(ctx) {
  const contributions = []
  const notes = []
  for (const m of ctx.meds) {
    const row = m.doseRow
    if (!row) continue
    if (m.combinedInto != null) continue // D9: checked once on the group lead
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
      const why = m.protocol ? T('no reference range', '참고 범위가 없습니다') : noReferenceWhy(m, ctx)
      notes.push({
        id: `dose_noref_${m.drug.id}`,
        kind: 'administration',
        category: 'validation',
        drugIds: [m.drug.id],
        text: T(`${dEn}: ${why.en}, so the dose was not checked.`, `${dKo}: ${why.ko}. 용량을 검토하지 않았습니다.`),
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
        text: T(`${dEn}: the entered dose or frequency cannot be compared with the protocol (${row.ref?.unit ?? '–'}); dose not checked.`, `${dKo}: 입력한 용량 또는 빈도를 프로토콜(${row.ref?.unit ?? '–'})과 비교할 수 없어 용량을 검토하지 않았습니다.`),
        sources: [],
      })
      continue
    }
    if (row.status === 'within') continue

    const ref = row.ref
    const rt = rangeText(ref)
    // Both sides per day when the engine compared daily totals (spec review F8).
    const rtCmp = row.compared?.per === 'day' && ref.per !== 'day' && row.compared.reason !== 'ceiling'
      ? rangeText(dailyRef(ref) || ref) : rt
    const entered = row.compared
    const enteredText = entered ? T(`${fmt(entered.value)} ${entered.unit}`, `${fmt(entered.value)} ${entered.unit.replace('/day', '/일')}`) : T('–', '–')
    let severity, title, consequence
    const why = []
    const repeat = row.status === 'above' && entered?.reason === 'repeat'
    const freqLabel = FREQUENCY_BY_ID[row.frequency]?.label || T(row.frequency || '–', row.frequency || '–')
    let factorLabel = T(`${enteredText.en} (reference ${rtCmp.en})`, `${enteredText.ko} (참고 ${rtCmp.ko})`)
    let actions
    if (repeat) {
      // Each dose may be within (or below) the range: the problem is the repetition, not the size.
      severity = row.ratio != null && row.ratio >= 2 ? 'major' : 'moderate'
      title = T(`${dEn}: single-dose protocol prescribed repeatedly`, `${dKo}: 단회 투여 프로토콜을 반복 처방`)
      consequence = T('Repeated exposure that the referenced single-dose protocol does not cover.', '참고한 단회 투여 프로토콜이 다루지 않는 반복 노출입니다.')
      const src = sourceName(ref.source)
      why.push(T(`The selected protocol (${src.en}) covers a single administration; the entered frequency, ${lcFirst(freqLabel.en)}, repeats it.`, `선택한 프로토콜(${src.ko})은 1회 투여만 다룹니다. 입력한 빈도 ${freqLabel.ko}는 반복 투여입니다.`))
      if (row.ratio != null && row.ratio > 1) {
        why.push(T(`Each dose is also above the reference: ${enteredText.en} vs ${rt.en} (${fmt(row.ratio)}× the maximum).`, `1회 용량도 참고 범위를 넘습니다: 입력 ${enteredText.ko}, 참고 ${rt.ko} (최대치의 ${fmt(row.ratio)}배).`))
      }
      factorLabel = T(`${enteredText.en} ${lcFirst(freqLabel.en)}; protocol is a single dose`, `${enteredText.ko} ${freqLabel.ko}, 프로토콜은 1회 투여`)
      actions = [T(`This protocol covers one administration only (${rt.en}, once). Do not repeat it: give a single dose, or choose a protocol that supports repeated dosing.`,
        `이 프로토콜은 1회 투여(${rt.ko}, 1회)만 다룹니다. 반복하지 말고 1회만 투여하거나, 반복 투여를 지원하는 프로토콜을 선택하십시오.`)]
    } else if (entered?.reason === 'ceiling' && ref.ceiling) {
      // Above an upper limit the protocol's own source states (a minimum-only
      // label's highest labelled dose, or a starting dose's total loading dose).
      const c = ref.ceiling
      const ct = T(`${fmt(c.value)} ${ref.unit}${c.per === 'day' ? '/day' : ''}`, `${fmt(c.value)} ${ref.unit}${c.per === 'day' ? '/일' : ''}`)
      severity = ref.phase === 'start' || (row.ratio != null && row.ratio >= 2) ? 'major' : 'moderate'
      title = T(`${dEn} dose above the sourced upper limit`, `${dKo} 용량이 근거 자료의 상한을 초과함`)
      consequence = T('Higher exposure than any dose the referenced source gives; dose-related adverse effects become more likely.', '참고 자료가 제시한 어떤 용량보다 노출이 커서 용량 관련 부작용 가능성이 높아집니다.')
      why.push(T(`Entered ${enteredText.en} vs upper limit ${ct.en} (${fmt(row.ratio)}× the limit).`, `입력 ${enteredText.ko}, 상한 ${ct.ko} (상한의 ${fmt(row.ratio)}배).`))
      if (c.text) why.push(T(`Upper limit: ${c.text.en}.`, `상한 근거: ${c.text.ko}.`))
      factorLabel = T(`${enteredText.en} (upper limit ${ct.en})`, `${enteredText.ko} (상한 ${ct.ko})`)
      actions = [T(`Re-check the calculation, including the decimal point. Keep the dose at or below ${ct.en}, or document why a higher dose is intended.`, `소수점을 포함해 계산을 다시 확인하십시오. ${ct.ko} 이하로 조정하거나, 고용량이 의도된 이유를 기록하십시오.`)]
    } else if (ref.phase === 'start') {
      // D10: a starting-dose protocol is not a maximum; a different dose may be a titrated maintenance dose.
      severity = 'minor'
      title = row.status === 'above'
        ? T(`${dEn}: above the starting dose (not applicable to a titrated maintenance dose)`, `${dKo}: 시작 용량보다 높음 (적정 중인 유지 용량이면 해당 없음)`)
        : T(`${dEn}: below the starting dose (not applicable to a titrated maintenance dose)`, `${dKo}: 시작 용량보다 낮음 (적정 중인 유지 용량이면 해당 없음)`)
      consequence = T('The reference is a starting dose, not a maximum; this formulary has no sourced maintenance range.', '참고값은 시작 용량이며 최대 용량이 아닙니다. 이 처방집에는 근거가 있는 유지 용량 범위가 없습니다.')
      why.push(T(`Entered ${enteredText.en} vs starting dose ${rtCmp.en}${row.ratio != null ? ` (${fmt(row.ratio)}×)` : ''}.`, `입력 ${enteredText.ko}, 시작 용량 ${rtCmp.ko}${row.ratio != null ? ` (${fmt(row.ratio)}배)` : ''}.`))
      actions = [T('If this is a first prescription, confirm the starting dose; if it is a refill, confirm it matches the titrated dose in the chart.', '첫 처방이면 시작 용량을 확인하십시오. 재처방이면 차트의 적정 용량과 같은지 확인하십시오.')]
    } else if (row.status === 'above') {
      severity = row.ratio != null && row.ratio >= 2 ? 'major' : 'moderate'
      title = T(`${dEn} dose above the reference range`, `${dKo} 용량이 참고 범위를 초과함`)
      consequence = T('Higher exposure than the referenced protocol; dose-related adverse effects become more likely.', '참고 프로토콜보다 노출이 커져 용량 관련 부작용 가능성이 높아집니다.')
      why.push(T(`Entered ${enteredText.en} vs reference ${rtCmp.en}${row.ratio != null ? ` (${fmt(row.ratio)}× the maximum)` : ''}.`, `입력 ${enteredText.ko}, 참고 범위 ${rtCmp.ko}${row.ratio != null ? ` (최대치의 ${fmt(row.ratio)}배)` : ''}.`))
      if (entered?.reason === 'single_dose_exceeds_daily') {
        why.push(SINGLE_DOSE_OVER_DAILY)
      }
      actions = [T(`Re-check the calculation and bring the dose within ${rt.en}, or document why a higher dose is intended.`, `계산을 다시 확인하고 ${rt.ko} 이내로 조정하거나, 고용량이 의도된 이유를 기록하십시오.`)]
    } else {
      severity = 'minor'
      title = T(`${dEn} dose below the reference range`, `${dKo} 용량이 참고 범위보다 낮음`)
      consequence = T('Exposure may be too low for the intended effect.', '의도한 효과를 내기에 노출이 부족할 수 있습니다.')
      why.push(T(`Entered ${enteredText.en} vs reference ${rtCmp.en}.`, `입력 ${enteredText.ko}, 참고 범위 ${rtCmp.ko}.`))
      actions = [T(`Confirm the intended dose; the referenced range is ${rt.en}.`, `의도한 용량인지 확인하십시오. 참고 범위는 ${rt.ko}입니다.`)]
    }
    if (entered?.reason === 'frequency') {
      why.push(T('Compared as a daily total because the entered frequency differs from the protocol’s.', '입력 빈도가 프로토콜과 달라 1일 총량으로 비교했습니다.'))
    }
    if (routeWhy) why.push(routeWhy)
    if (row.combined) why.push(T(`Compared as the sum of ${row.combined.rows} rows of the same ingredient (${fmtNum(row.combined.totalMg, 4)} mg per administration).`, `같은 성분 ${row.combined.rows}행을 합산한 1회 ${fmtNum(row.combined.totalMg, 4)} mg으로 비교했습니다.`))
    if (m.protocol?.note) why.push(m.protocol.note)

    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity,
      problemKey: `dose:${m.drug.id}`,
      drugIds: [m.drug.id],
      factors: [{ kind: 'dose', id: `${m.drug.id}_${repeat ? 'repeat' : entered?.reason === 'ceiling' ? 'ceiling' : ref.phase === 'start' ? 'start_' + row.status : row.status}`, label: factorLabel }],
      title,
      consequence,
      why,
      actions,
      alternatives: [],
      sources: [...new Set([ref.source, entered?.reason === 'ceiling' ? ref.ceiling?.source : null, ...(m.protocol?.extraSources || [])].filter(Boolean))],
      evidence: ref.labelStatus === 'label' ? 'label' : 'literature',
      ownerSigns: row.status === 'above' ? (m.drug.ownerSigns || []) : [],
      organs: row.status === 'above' ? riskOrgans(m.drug, ctx.species, 2) : [],
      inputs: [
        { fact: `dose.${m.drug.id}`, value: enteredText.en },
        { fact: `protocol.${m.protocol?.id}`, value: rt.en, source: ref.source },
        { fact: 'ratio', value: row.ratio != null ? `${fmt(row.ratio)}×` : '–' },
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
