/**
 * Merge rule contributions by problemKey, rank findings and compute the verdict.
 *
 * One problem → one card: all mechanisms for the same problem (e.g. CYP3A and
 * P-gp effects of the same drug pair, or a dose rule and a species dose limit)
 * are merged at the highest severity, and every contributing rule is listed in
 * the card's trace.
 */

export const SEVERITIES = ['contraindicated', 'major', 'moderate', 'minor']

export const SEVERITY_META = {
  contraindicated: { rank: 0, label: { en: 'Contraindicated', ko: '금기' } },
  major: { rank: 1, label: { en: 'Major', ko: '중대' } },
  moderate: { rank: 2, label: { en: 'Moderate', ko: '주의' } },
  minor: { rank: 3, label: { en: 'Minor', ko: '경미' } },
  none: { rank: 4, label: { en: 'No problems found', ko: '발견된 문제 없음' } },
}

export function severityRank(s) {
  return SEVERITY_META[s]?.rank ?? 99
}

const EVIDENCE_RANK = { literature: 0, label: 1, mechanistic: 2 }

function uniqText(list) {
  const seen = new Set()
  const out = []
  for (const t of list || []) {
    if (!t) continue
    const k = typeof t === 'string' ? t : t.en
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

function uniq(list) {
  return [...new Set((list || []).filter(Boolean))]
}

function slug(s) {
  return String(s).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase()
}

/** Merge contributions that share a problemKey into Finding objects. */
export function mergeContributions(contributions) {
  const groups = new Map()
  for (const c of contributions) {
    if (!groups.has(c.problemKey)) groups.set(c.problemKey, [])
    groups.get(c.problemKey).push(c)
  }
  const findings = []
  for (const [problemKey, list] of groups) {
    const sorted = [...list].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
    const primary = sorted[0]
    const factors = []
    const seenF = new Set()
    for (const c of sorted) {
      for (const f of c.factors || []) {
        const k = `${f.kind}:${f.id}`
        if (seenF.has(k)) continue
        seenF.add(k)
        factors.push(f)
      }
    }
    const evidence = sorted.map((c) => c.evidence).sort((a, b) => (EVIDENCE_RANK[a] ?? 9) - (EVIDENCE_RANK[b] ?? 9))[0] || 'mechanistic'
    findings.push({
      id: `f_${slug(problemKey)}`,
      ruleId: primary.ruleId,
      ruleVersion: primary.ruleVersion,
      severity: primary.severity,
      problemKey,
      drugIds: uniq(sorted.flatMap((c) => c.drugIds)),
      factors,
      title: primary.title,
      consequence: primary.consequence,
      why: uniqText(sorted.flatMap((c) => c.why)),
      actions: uniqText(sorted.flatMap((c) => c.actions)),
      alternatives: uniqText(sorted.flatMap((c) => c.alternatives)),
      sources: uniq(sorted.flatMap((c) => c.sources)),
      evidence,
      ownerSigns: uniqText(sorted.flatMap((c) => c.ownerSigns)),
      organs: uniq(sorted.flatMap((c) => c.organs || [])),
      trace: {
        rules: sorted.map((c) => ({ ruleId: c.ruleId, ruleVersion: c.ruleVersion, severity: c.severity })),
        inputs: sorted.flatMap((c) => (c.inputs || []).map((i) => ({ ...i, rule: c.ruleId }))),
      },
    })
  }
  return rankFindings(findings)
}

/** Ranked by severity, then by number of contributing factors, then by number of drugs. */
export function rankFindings(findings) {
  return [...findings].sort((a, b) =>
    severityRank(a.severity) - severityRank(b.severity) ||
    b.factors.length - a.factors.length ||
    b.drugIds.length - a.drugIds.length ||
    a.problemKey.localeCompare(b.problemKey))
}

const HEADLINES = {
  contraindicated: { en: 'Contraindicated — do not dispense as written', ko: '금기 — 현재 처방대로 조제하지 마십시오' },
  major: { en: 'Major problem — change the prescription or document why it is intended', ko: '중대 — 처방을 변경하거나 의도한 이유를 기록하십시오' },
  moderate: { en: 'Moderate — dispense only with the monitoring plan below', ko: '주의 — 아래 모니터링 계획과 함께 조제하십시오' },
  minor: { en: 'Minor — note and monitor', ko: '경미 — 기록하고 관찰하십시오' },
  none: { en: 'No problems found by the rules in this prototype — this is not a guarantee of safety', ko: '이 프로토타입의 규칙으로는 문제가 발견되지 않았습니다 — 안전을 보장하지는 않습니다' },
}

export function computeVerdict(findings, notes, doses) {
  const counts = { contraindicated: 0, major: 0, moderate: 0, minor: 0, notes: notes.length, doseProblems: 0 }
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1
  counts.doseProblems = doses.filter((d) => ['above', 'below', 'unit_mismatch'].includes(d.status)).length
  const level = findings.length ? findings[0].severity : 'none'
  return { level, headline: HEADLINES[level], counts }
}

/**
 * Compare two results for a "what changed" chip after an input edit.
 * Returns { verdictFrom, verdictTo, added:[Finding], removed:[Finding], changed:[{ finding, from, to }] }.
 * Findings are matched by problemKey; the UI turns this into prose.
 */
export function diffResults(prev, next) {
  const before = new Map((prev?.findings || []).map((f) => [f.problemKey, f]))
  const after = new Map((next?.findings || []).map((f) => [f.problemKey, f]))
  const added = []
  const removed = []
  const changed = []
  for (const [k, f] of after) {
    if (!before.has(k)) added.push(f)
    else if (before.get(k).severity !== f.severity) changed.push({ finding: f, from: before.get(k).severity, to: f.severity })
  }
  for (const [k, f] of before) if (!after.has(k)) removed.push(f)
  return { verdictFrom: prev?.verdict?.level ?? null, verdictTo: next?.verdict?.level ?? null, added, removed, changed }
}
