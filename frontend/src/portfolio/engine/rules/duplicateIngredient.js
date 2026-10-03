/**
 * DUPLICATE_INGREDIENT (D9) — the same ingredient on two or more rows that could not be summed
 * (route, frequency, duration or protocol differ, or a row has no computable dose).
 *   both/all rows repeated administrations → major (overlap is certain)
 *   at least one row is a single administration → moderate (may be a sequence, e.g. day-1 dose then maintenance)
 * Rows that share route, frequency, duration and protocol are summed in engine.js and dose-checked once instead.
 */
import { T, enName, koName } from './util.js'

const RULE = { id: 'DUPLICATE_INGREDIENT', version: '1.0.0' }

function evaluate(ctx) {
  const contributions = []
  for (const group of ctx.duplicateGroups || []) {
    const drug = group[0].drug
    const single = group.some((m) => m.freqId === 'once')
    contributions.push({
      ruleId: RULE.id,
      ruleVersion: RULE.version,
      severity: single ? 'moderate' : 'major',
      problemKey: `dup:${drug.id}`,
      drugIds: [drug.id],
      factors: [{ kind: 'duplicate', id: `${drug.id}_${group.length}`, label: T(`${enName(drug)} on ${group.length} rows`, `${koName(drug)} ${group.length}행`) }],
      title: T(`Same ingredient on ${group.length} rows: ${enName(drug)}`, `동일 성분 중복: ${koName(drug)} ${group.length}행`),
      consequence: T('Total exposure is the sum of the rows; each row was dose-checked on its own only.', '총 노출량은 각 행의 합입니다. 각 행은 개별 용량으로만 검토했습니다.'),
      why: [T('The rows differ in route, frequency, duration or reference protocol, so they were not summed.', '경로·횟수·일수 또는 참고 프로토콜이 달라 합산하지 않았습니다.')],
      actions: [single
        ? T('Confirm the single administration does not fall on the same day as the course; otherwise delete one row.', '단회 투여가 반복 투여와 같은 날에 겹치지 않는지 확인하고, 겹치면 한 행을 삭제하십시오.')
        : T('Delete the duplicate row, or record why both are intended.', '중복 행을 삭제하거나, 두 행이 모두 의도된 이유를 기록하십시오.')],
      alternatives: [],
      sources: [],
      evidence: 'mechanistic',
      ownerSigns: [],
      organs: [],
      inputs: group.map((m) => ({ fact: `meds[${m.index}]`, value: [m.med.route || '–', m.freqId || '–', m.med.durationDays != null ? `${m.med.durationDays} d` : '–'].join(' · ') })),
    })
  }
  return { contributions }
}

export default { ...RULE, layer: 'pd', name: T('Same-ingredient duplication', '동일 성분 중복'), sources: [], evaluate }
