/**
 * EMR popup spec §6 and §8.1 "Card decisions, binding" / §8.2 "Card building": gate,
 * primary/related rows, re-checked suggestions, inputHash/uuid/ackKey, row badges,
 * notes, counts and the coverage strip, built from the real engine result.
 */
import { describe, it, expect } from 'vitest'
import { check } from '../adapter.js'
import { buildResponse, inputHash } from '../cards.js'
import { SCENARIOS, VISITS, W, P } from '../fixtures.js'
import { PRODUCT_MAP } from '../productMap.js'
import { CARD_DECISIONS } from './binding.js'
import { fmtCard, parseCardDecisions } from './format.js'
import { computeVerdict } from '../../engine/findings.js'
import { analyze } from '../../engine/index.js'
import { resolveCase } from '../../components/caseModel.js'

const DECISIONS = parseCardDecisions(CARD_DECISIONS)
const IDS = Object.keys(SCENARIOS)
const respond = (visit, opts) => buildResponse(check(visit), visit, opts)
const cache = new Map()
const res = (id, locale = 'ko') => {
  const k = `${id}|${locale}`
  if (!cache.has(k)) cache.set(k, respond(SCENARIOS[id], { locale }))
  return cache.get(k)
}
const byRule = (r, ruleId) => r.cards.find((k) => k.extension.ruleIds[0] === ruleId)
const hashOf = (id, ruleId) => byRule(res(id), ruleId).extension.inputHash

describe('card decisions, binding (§8.1)', () => {
  it('covers every scenario', () => {
    expect(Object.keys(DECISIONS)).toEqual(IDS)
  })
  it.each(IDS)('%s: gate, primary/related rows, suggestions and inputHash', (id) => {
    const exp = DECISIONS[id]
    const r = res(id)
    if (exp.unsupported) {
      expect(r.extension.supported).toBe(false)
      expect(r.cards).toEqual([])
      return
    }
    const blocking = r.cards.filter((k) => k.extension.blocking).length
    expect(blocking ? `yes(${blocking})` : 'no').toBe(exp.gate)
    // Order follows §6.1 (severity, factors, first row); the binding block lists engine order.
    expect(r.cards.map(fmtCard).sort()).toEqual([...exp.cards].sort())
  })
  it('cards sort by severity, then number of factors, then first row (§6.1)', () => {
    const sev = { contraindicated: 0, major: 1, moderate: 2, minor: 3 }
    for (const id of IDS) {
      const r = res(id)
      if (!r.extension.supported) continue
      const order = SCENARIOS[id].rows.map((x) => x.rowId)
      const key = (k) => [sev[k.extension.severity], -k.extension.factorCount, Math.min(...k.extension.rowIds.map((x) => order.indexOf(x)))]
      for (let i = 1; i < r.cards.length; i++) {
        const [a, b] = [key(r.cards[i - 1]), key(r.cards[i])]
        expect(a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] <= b[2])))).toBe(true)
      }
    }
    // E02: the two minor cards have the same factor count; phenobarbital's row comes first.
    expect(res('E02').cards.map((k) => `${k.extension.ruleIds[0]}/${k.extension.severity}`)).toEqual(['CYP_INDUCTION/moderate', 'CYP_INDUCTION/minor', 'IMMUNOSUPPRESSION_ADDITIVE/minor'])
  })
})

describe('inputHash, uuid and ackKey (§3.3, H3)', () => {
  it('binding equalities and inequalities', () => {
    expect(hashOf('E08', 'ENRO_FELINE_RETINA')).toBe(hashOf('E08b', 'ENRO_FELINE_RETINA'))
    expect(hashOf('E08', 'ENRO_FELINE_RETINA')).toBe(hashOf('E45a', 'ENRO_FELINE_RETINA'))
    expect(hashOf('E45a', 'ENRO_FELINE_RETINA')).not.toBe(hashOf('E45b', 'ENRO_FELINE_RETINA'))
    expect(hashOf('E07', 'NSAID_CORTICOSTEROID')).toBe(hashOf('E07b', 'NSAID_CORTICOSTEROID'))
    expect(hashOf('E10', 'ALLERGY_CLASS')).toBe(hashOf('E40', 'ALLERGY_CLASS'))
    expect(hashOf('E01', 'MDR1_PGP_ML')).toBe(1113501192)
  })
  it('uuid and ackKey derive from problemKey + inputHash', () => {
    const k = res('E01').cards[0]
    expect(k.extension.ackKey).toBe(`mdr1:ivermectin|${k.extension.inputHash}`)
    expect(k.uuid).toMatch(/^card-\d+$/)
  })
  it('uuids are stable for the same visit and change with dose, frequency or weight', () => {
    const base = SCENARIOS.E45a
    const uuid = (v) => respond(v).cards[0].uuid
    expect(uuid(base)).toBe(uuid(JSON.parse(JSON.stringify(base))))
    expect(uuid(base)).toBe(res('E45a').cards[0].uuid)
    expect(uuid(SCENARIOS.E45b)).not.toBe(uuid(base))
    const dose = { ...base, rows: [{ ...base.rows[0], qty: 1 }] }
    const freq = { ...base, rows: [{ ...base.rows[0], tt: 2 }] }
    expect(uuid(dose)).not.toBe(uuid(base))
    expect(uuid(freq)).not.toBe(uuid(base))
  })
  it('a weight change re-raises the V7 NSAID_CORTICOSTEROID card (dedupe key changes)', () => {
    const v26 = { ...VISITS.V7, patient: W(VISITS.V7.patient, 26) }
    const a = byRule(respond(VISITS.V7), 'NSAID_CORTICOSTEROID').extension.ackKey
    const b = byRule(respond(v26), 'NSAID_CORTICOSTEROID').extension.ackKey
    expect(a).not.toBe(b)
  })
  it('inputHash is the §3.3 object', () => {
    const c = check(SCENARIOS.E01)
    expect(inputHash(c, c.result.findings[0])).toBe(1113501192)
  })
})

describe('suggestion checks (§6.3, §8.1)', () => {
  const labels = (id, ruleId) => byRule(res(id), ruleId).suggestions.map((s) => s.label)
  it('E01 offers exactly "이버멕틴 삭제", recommended', () => {
    const s = res('E01').cards[0].suggestions
    expect(s.map((x) => x.label)).toEqual(['이버멕틴 삭제'])
    expect(s[0].isRecommended).toBe(true)
  })
  it('E07 offers 카프로펜 삭제 and 프레드니솔론 삭제 for NSAID_CORTICOSTEROID', () => {
    expect(labels('E07', 'NSAID_CORTICOSTEROID')).toEqual(['카프로펜 삭제', '프레드니솔론 삭제'])
  })
  it('E25 offers both row deletes, by product', () => {
    expect(labels('E25', 'DOSE_RANGE')).toEqual(['카프로펜 정 100 mg 행 삭제', '카프로펜 정 25 mg 행 삭제'])
  })
  it('E26 and E27 never offer to delete the Tx row', () => {
    expect(labels('E26', 'DUPLICATE_INGREDIENT')).toEqual(['멜록시캄 현탁액 1.5 mg/mL 행 삭제'])
    expect(labels('E27', 'NSAID_DUPLICATE')).toEqual(['카프로펜 삭제'])
    for (const id of ['E26', 'E27', 'E08b']) {
      for (const k of res(id).cards) for (const s of k.suggestions) expect(SCENARIOS[id].rows.find((r) => r.rowId === s.extension.rowId).kind).toBe('Rx')
    }
  })
  it('E08b: the SPECIES_HARDSTOP card on the Tx row has no suggestion', () => {
    expect(labels('E08b', 'SPECIES_HARDSTOP')).toEqual([])
    expect(labels('E08b', 'ENRO_FELINE_RETINA')).toEqual(['엔로플록사신 삭제'])
  })
  it('E23 offers no suggestion anywhere (D3/D15)', () => {
    const r = res('E23')
    expect(r.cards).toEqual([])
    expect(r.extension.rowSuggestions).toEqual({})
  })
  it('every suggestion action has a string resourceId and a description naming the product', () => {
    for (const id of IDS) {
      for (const locale of ['ko', 'en']) {
        const r = res(id, locale)
        for (const k of r.cards) {
          expect(k.suggestions.length).toBeLessThanOrEqual(2)
          k.suggestions.forEach((s, i) => {
            expect(s.isRecommended).toBe(i === 0)
            for (const act of s.actions) {
              expect(typeof act.resourceId).toBe('string')
              expect(act.resourceId).toMatch(/^MedicationRequest\//)
              const row = SCENARIOS[id].rows.find((x) => `MedicationRequest/${x.rowId}` === act.resourceId)
              const prod = PRODUCT_MAP[row.productCode]
              expect(act.description).toContain(locale === 'en' ? prod.displayEn : prod.display)
            }
          })
        }
      }
    }
  })
  it('every offered suggestion really improves its card when re-checked', () => {
    for (const id of IDS) {
      const r = res(id)
      for (const k of r.cards) {
        for (const s of k.suggestions) {
          const v = SCENARIOS[id]
          const after = s.extension.kind === 'delete'
            ? { ...v, rows: v.rows.filter((x) => x.rowId !== s.extension.rowId) }
            : { ...v, rows: v.rows.map((x) => (x.rowId === s.extension.rowId ? { ...x, ...s.extension.patch } : x)) }
          const a = check(after)
          const f = a.result.findings.find((x) => x.problemKey === k.extension.problemKey)
          const sev = { contraindicated: 0, major: 1, moderate: 2, minor: 3 }
          expect(!f || sev[f.severity] > sev[k.extension.severity]).toBe(true)
        }
      }
    }
  })
  it('a count-entered row with a rounding note may get a plan suggestion only when the note clears and nothing gets worse', () => {
    for (const id of IDS) {
      const r = res(id)
      if (!r.extension.supported) continue
      for (const [rowId, list] of Object.entries(r.extension.rowSuggestions)) {
        for (const s of list) {
          const v = SCENARIOS[id]
          const a = check({ ...v, rows: v.rows.map((x) => (x.rowId === rowId ? { ...x, ...s.extension.patch } : x)) })
          const i = a.adapter.medRowIds.indexOf(rowId)
          expect(a.result.notes.some((n) => n.category === 'rounding' && n.id.endsWith(`_${i}`))).toBe(false)
          expect(a.result.findings.length).toBeLessThanOrEqual(check(v).result.findings.length)
        }
      }
    }
  })
})

describe('card building (§8.2)', () => {
  it('every summary ≤ 140 chars in both locales; source and blocking per §3.6', () => {
    for (const id of IDS) {
      for (const locale of ['ko', 'en']) {
        for (const k of res(id, locale).cards) {
          expect(k.summary.length).toBeGreaterThan(0)
          expect([...k.summary].length).toBeLessThanOrEqual(140)
          expect(k.source.label).toBe('nuvovet DUR')
          expect(k.source.topic.code).toBe(k.extension.ruleIds[0])
          expect(k.source.topic.display).toBeTruthy()
          expect(k.extension.blocking).toBe(['contraindicated', 'major'].includes(k.extension.severity))
          expect(k.indicator).toBe({ contraindicated: 'critical', major: 'critical', moderate: 'warning', minor: 'info' }[k.extension.severity])
          expect(k.selectionBehavior).toBe('at-most-one')
          expect(k.links[0].url).toMatch(/^#\/case\/custom/)
        }
      }
    }
  })
  it('summary and clinical text come from the engine finding', () => {
    const c = check(SCENARIOS.E01)
    const f = c.result.findings[0]
    const k = res('E01').cards[0]
    expect(k.summary).toBe(f.title.ko)
    expect(k.extension.consequence).toBe(f.consequence.ko)
    expect(k.detail.startsWith(f.consequence.ko)).toBe(true)
    expect(res('E01', 'en').cards[0].summary).toBe(f.title.en)
  })
  it('primary/related rows (V1, V6, V7)', () => {
    const v1 = res('E01').cards[0].extension
    expect([v1.primaryRowIds, v1.relatedRowIds]).toEqual([['rx-1'], ['rx-2']])
    const v6 = res('E06').cards[0].extension
    expect([v6.primaryRowIds, v6.relatedRowIds]).toEqual([['rx-1'], ['rx-2', 'rx-4']])
    const v7 = byRule(res('E07'), 'NSAID_CORTICOSTEROID').extension
    expect([v7.primaryRowIds, v7.relatedRowIds]).toEqual([['rx-1', 'rx-2'], []])
  })
  it('doseChecks: V1 = 1 (ketoconazole rounding), V5 = 0, E51 = 0 (powder)', () => {
    expect(res('E01').extension.counts.doseChecks).toBe(1)
    expect(res('E05').extension.counts.doseChecks).toBe(0)
    expect(res('E51').extension.counts.doseChecks).toBe(0)
    expect(res('E03').extension.counts.doseChecks).toBe(1)
  })
  it('counts are the card severities', () => {
    expect(res('E02').extension.counts).toMatchObject({ contraindicated: 0, major: 0, moderate: 1, minor: 2 })
    expect(res('E08b').extension.counts).toMatchObject({ major: 2 })
  })
  it('E51: the powder row drops its rounding note and the ≈ marker; coverage adds crushing', () => {
    const r = res('E51')
    expect(r.extension.notes.map((n) => n.id)).not.toContain('rounding_maropitant_2')
    expect(r.extension.notes.map((n) => n.id)).toContain('powder_rx-3')
    expect(r.extension.rowStatus['rx-3'].rounding).toBeUndefined()
    expect(res('E03').extension.rowStatus['rx-3'].rounding).toBe(true)
    expect(r.extension.coverage.notChecked).toContain('crushing')
    expect(res('E03').extension.coverage.notChecked).not.toContain('crushing')
  })
  it('E23: the plan text is replaced by the ceiling note (D15)', () => {
    const d = res('E23').extension.doses[0]
    expect(d.planReplacedBy).toBe('ceiling_plan_enrofloxacin_0')
    expect(d.planText).toContain('6.49 mg/kg/일')
    expect(res('E01').extension.doses[1].planText).toBe('200 mg 정제 ½정')
  })
  it('dose cards carry the label jurisdiction (D13) and the starting-dose flag (D10)', () => {
    expect(byRule(res('E38'), 'DOSE_RANGE').extension.jurisdiction).toBe('US')
    expect(byRule(res('E39'), 'DOSE_RANGE').extension.jurisdiction).toBe('US')
    expect(byRule(res('E28'), 'DOSE_RANGE').extension.startDose).toBe(true)
    expect(byRule(res('E29'), 'DOSE_RANGE').extension.startDose).toBe(true)
    expect(byRule(res('E38'), 'DOSE_RANGE').extension.startDose).toBe(false)
    expect(res('E01').cards[0].extension.jurisdiction).toBe(null)
  })
  it('override reasons per rule: species hard stops offer only NV-DATA and NV-OTH', () => {
    expect(res('E04').cards[0].overrideReasons.map((x) => x.code)).toEqual(['NV-DATA', 'NV-OTH'])
    expect(byRule(res('E08b'), 'SPECIES_HARDSTOP').overrideReasons.map((x) => x.code)).toEqual(['NV-DATA', 'NV-OTH'])
    expect(res('E10').cards[0].overrideReasons.map((x) => x.code)).toEqual(['NV-J2', 'NV-J5', 'NV-J6', 'NV-ALG-INT', 'NV-ALG-TOL', 'NV-DATA', 'NV-OTH'])
    expect(res('E01').cards[0].overrideReasons.map((x) => x.code)).toContain('NV-INT')
    expect(byRule(res('E26'), 'DUPLICATE_INGREDIENT').overrideReasons.map((x) => x.code)).toContain('NV-SEQ')
    for (const id of IDS) for (const k of res(id).cards) for (const o of k.overrideReasons) expect(o.system).toBe('https://nuvovet.example/CodeSystem/dur-override')
  })
})

describe('row badges (§3.7.3)', () => {
  it('V1: ivermectin 금기 primary, ketoconazole related with ≈', () => {
    const s = res('E01').extension.rowStatus
    expect(s['rx-1']).toMatchObject({ badge: 'contraindicated', label: '금기', text: '금기', count: 1, ariaLabel: '이버멕틴: 금기 1건. 검토 패널에서 보기' })
    expect(s['rx-2']).toMatchObject({ badge: 'contraindicated', label: '금기', text: '관련', related: true, rounding: true, ariaLabel: '케토코나졸: 금기 1건에 관련. 검토 패널에서 보기' })
  })
  it('V6: furosemide and benazepril show 관련; pimobendan shows nothing', () => {
    const s = res('E06').extension.rowStatus
    expect(s['rx-2'].text).toBe('관련')
    expect(s['rx-4'].text).toBe('관련')
    expect(s['rx-3'].badge).toBe('none')
  })
  it('Tx rows are flagged in-clinic; E08b meloxicam Tx row is 중대', () => {
    const s = res('E08b').extension.rowStatus
    expect(s['rx-2']).toMatchObject({ badge: 'major', inClinic: true })
    expect(res('E08').extension.rowStatus['rx-2']).toMatchObject({ badge: 'none', inClinic: true })
  })
  it('confirm, no-reference and unmapped badges', () => {
    expect(res('E16').extension.rowStatus).toMatchObject({ 'rx-1': { badge: 'confirm', text: '확인 필요' }, 'rx-2': { badge: 'unmapped', text: '검토 안 함' } })
    expect(res('E30').extension.rowStatus['rx-1']).toMatchObject({ badge: 'noref', text: '참고 용량 없음' })
    expect(res('E50').extension.rowStatus['rx-1']).toMatchObject({ badge: 'confirm' })
    expect(res('E04').extension.rowStatus['rx-1']).toMatchObject({ badge: 'contraindicated', confirm: ['protocol_none'] })
  })
  it('E27: the procedure Tx row has no badge slot status; unsupported species shows a dash on every row', () => {
    expect(Object.keys(res('E27').extension.rowStatus)).toEqual(['tx-1', 'rx-1'])
    expect(res('E18').extension.rowStatus['rx-1'].badge).toBe('unsupported')
    expect(res('E18').extension.rowStatus['rx-1'].text).not.toContain('—')
  })
})

describe('notes and the 확인 필요 group (§6.1, §4.3)', () => {
  it('notes are ordered administration, lab, monitoring, caution, rounding', () => {
    const order = ['administration', 'lab', 'monitoring', 'caution', 'rounding']
    for (const id of IDS) {
      const n = res(id).extension.notes.map((x) => order.indexOf(x.category))
      expect(n).toEqual([...n].sort((a, b) => a - b))
      expect(res(id).extension.notes.every((x) => x.category !== 'validation')).toBe(true)
    }
  })
  it('E22: weight_stale and calc_mismatch are shown as notes', () => {
    const ids = res('E22').extension.notes.map((n) => n.id)
    expect(ids).toContain('weight_stale')
    expect(ids).toContain('calc_mismatch_rx-1')
    expect(res('E22').extension.notes.find((n) => n.id === 'weight_stale').text).toBe('체중 45일 전 측정')
  })
  it('E16: row reasons, validation notes and the unmapped product are in the group', () => {
    const g = res('E16').extension.confirm
    expect(g.find((x) => x.key === 'freq_missing')).toMatchObject({ kind: 'row', rowId: 'rx-1', text: '확인 필요: 횟수 미입력' })
    expect(g.find((x) => x.key === 'unmapped')).toMatchObject({ rowId: 'rx-2', code: 'RX-XYZ-999' })
    expect(g.find((x) => x.key === 'freq_amoxicillin_clavulanate_0')).toMatchObject({ kind: 'validation', covered: true })
  })
  it('visit reasons carry their chip and fix-chart field', () => {
    expect(res('E40').extension.confirm.find((x) => x.key === 'allergy_text_recognised')).toMatchObject({ kind: 'visit', chip: 'recognised', field: 'allergies', text: '알레르기 "페니실린 알레르기": 자유 입력에서 인식, 확인 필요' })
    expect(res('E41b').extension.confirm.find((x) => x.kind === 'visit')).toMatchObject({ chip: 'recognised', field: 'diagnoses', text: '진단 "뇌전증": 자유 입력에서 인식, 확인 필요' })
    expect(res('E42').extension.confirm.find((x) => x.kind === 'visit')).toMatchObject({ chip: 'stale', field: 'labs', text: '크레아티닌 124일 전 검사: 최신 결과를 확인하십시오' })
    expect(res('E21').extension.confirm[0].text).toBe('확인 필요: 이 제형은 분할할 수 없습니다')
    expect(res('E14').extension.confirm.find((x) => x.key === 'weight_missing')).toMatchObject({ field: 'weight' })
  })
  it('species states: unsupported and missing', () => {
    expect(res('E18').extension).toMatchObject({ supported: false, reason: 'species_unsupported', verdict: { level: null, complete: false } })
    expect(res('E52').extension.confirm[0]).toMatchObject({ key: 'species_missing', field: 'species', text: '종 미입력: 환자 정보에서 종을 입력하십시오' })
  })
})

describe('incomplete-verdict precedence (§8.2)', () => {
  it('level none with any reason is never complete', () => {
    for (const id of IDS) {
      const r = res(id)
      if (!r.extension.supported) continue
      const v = r.extension.verdict
      const anyReason = r.extension.confirm.length > 0 || r.extension.unmapped.length > 0
      expect(v.complete).toBe(!anyReason)
      if (v.level === 'none' && anyReason) expect(v.incompleteReasons.length).toBeGreaterThan(0)
    }
  })
  it('V5 with the weight cleared is incomplete', () => {
    const r = respond({ ...VISITS.V5, patient: W(VISITS.V5.patient, null) })
    expect(r.extension.verdict).toMatchObject({ level: 'none', complete: false })
    expect(respond(VISITS.V5).extension.verdict).toMatchObject({ level: 'none', complete: true, action: '규칙으로 확인한 문제가 없습니다. 이상이 없다는 뜻은 아닙니다.' })
  })
})

describe('coverage strip (§6.2, §8.2)', () => {
  it('E40 allergy partial; E07 kidney partial (크레아티닌 없음); E49 age "연령 (1세 미만)"', () => {
    expect(res('E40').extension.coverage.partial).toContainEqual(expect.objectContaining({ item: 'allergy', reason: 'allergy_text_recognised' }))
    const k = res('E07').extension.coverage.partial.find((p) => p.item === 'kidney')
    expect(k).toMatchObject({ reason: 'creatinine_missing', label: { ko: '크레아티닌 없음', en: 'no creatinine' } })
    expect(res('E49').extension.coverage.labels.age.ko).toBe('연령 (1세 미만)')
    expect(res('E01').extension.coverage.labels.age.ko).toBe('연령')
  })
  it('a clean visit checks every item and lists the fixed not-checked items', () => {
    expect(res('E05').extension.coverage).toMatchObject({
      checked: ['species', 'breed', 'interaction', 'duplication', 'condition', 'kidney', 'allergy', 'dose'],
      partial: [],
      notChecked: ['age', 'pregnancy', 'duration', 'otherClinics', 'thisClinicHistory'],
    })
  })
  it('partial items by cause', () => {
    const items = (id) => res(id).extension.coverage.partial.map((p) => p.item)
    expect(items('E43')).toContain('breed')
    expect(items('E41')).toContain('condition')
    expect(items('E42')).toContain('kidney')
    expect(items('E16')).toContain('dose')
    expect(res('E16').extension.coverage.partial.find((p) => p.item === 'dose').label.ko).toBe('1행 제외')
    expect(items('E06')).not.toContain('kidney') // creatinine present
    expect(items('E03')).not.toContain('kidney')
  })
})

describe('engine-side copy (D17)', () => {
  it('verdict.action has no em dash and no "안전" for every level', () => {
    const f = (severity) => [{ severity }]
    for (const level of ['contraindicated', 'major', 'moderate', 'minor', null]) {
      const v = computeVerdict(level ? f(level) : [], [], [])
      for (const t of [v.action.ko, v.action.en]) {
        expect(t).not.toContain('—')
        expect(t).not.toContain('안전')
        expect(t.toLowerCase()).not.toContain('safe')
      }
    }
  })
  it('the response carries verdict.action in the widget locale', () => {
    expect(res('E01').extension.verdict.action).toBe('현재 처방대로 조제하지 마십시오')
    expect(res('E01', 'en').extension.verdict.action).toBe('Do not dispense as written')
  })
  it('patient identity line data (§3.8)', () => {
    expect(res('E01').extension.patient).toMatchObject({ name: '초코', species: '개', weightKg: 24, breed: '러프 콜리' })
    expect(respond(SCENARIOS.E01, { locale: 'en' }).extension.patient.species).toBe('Dog')
    expect(P.CHOCO.name).toBe('초코')
  })
})

describe('"전체 분석 열기" link (§7)', () => {
  const sameInWorkbench = (id) => {
    const c = check(SCENARIOS[id])
    const url = res(id).cards[0].links[0].url
    const { input } = resolveCase('custom', { s: new URLSearchParams(url.split('?')[1]).get('s') })
    const key = (r) => r.findings.map((f) => `${f.problemKey}/${f.severity}`)
    return [key(analyze(input)), key(c.result)]
  }
  const withCards = IDS.filter((id) => res(id).cards.length && id !== 'E17')
  it.each(withCards)('%s: the workbench link reproduces the same findings', (id) => {
    const [workbench, emr] = sameInWorkbench(id)
    expect(workbench).toEqual(emr)
  })
  // A null dose (unit "포", no amount per sachet) survives the workbench's sanitizeInput,
  // so the linked analysis keeps MDR1 contraindicated.
  it('E17: the workbench link reproduces the same findings (null dose)', () => {
    const [workbench, emr] = sameInWorkbench('E17')
    expect(workbench).toEqual(emr)
  })
})
