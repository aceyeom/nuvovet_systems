/**
 * Browser-side golden-case check for the How-it-works page. Mirrors the
 * assertions in engine/__tests__/golden.test.js so the page shows, live,
 * the same pass/fail the test suite enforces:
 *   - verdict level matches;
 *   - every expected finding is present (ruleId + severity + drugIds, plus
 *     factor kinds and alternatives when listed);
 *   - no other finding unless its ruleId is in allowAlso;
 *   - listed notes are present;
 *   - listed dose amounts match.
 */

function sameSet(a, b) {
  return [...a].sort().join('|') === [...b].sort().join('|')
}

function closeTo(a, b, digits = 6) {
  return a != null && b != null && Math.abs(a - b) < 10 ** -digits / 2
}

export function checkCase(c, result) {
  const exp = c.expect
  const checks = []

  checks.push({ id: 'verdict', pass: result.verdict.level === exp.verdict, expected: exp.verdict, actual: result.verdict.level })

  const unmatched = [...result.findings]
  const missing = []
  for (const e of exp.findings) {
    const i = unmatched.findIndex((f) => f.ruleId === e.ruleId && f.severity === e.severity && (!e.drugIds || sameSet(f.drugIds, e.drugIds)))
    if (i < 0) {
      missing.push({ ruleId: e.ruleId, severity: e.severity, reason: 'missing' })
      continue
    }
    const f = unmatched.splice(i, 1)[0]
    const kinds = f.factors.map((x) => x.kind)
    const factorsOk = !e.factorKinds || e.factorKinds.every((k) => kinds.includes(k))
    const altsOk = (e.alternativesInclude || []).every((alt) => f.alternatives.some((a) => a.en.includes(alt)))
    if (!factorsOk) missing.push({ ruleId: e.ruleId, severity: e.severity, reason: 'factors' })
    if (!altsOk) missing.push({ ruleId: e.ruleId, severity: e.severity, reason: 'alternatives' })
  }
  const unexpected = unmatched.filter((f) => !(exp.allowAlso || []).includes(f.ruleId)).map((f) => ({ ruleId: f.ruleId, severity: f.severity }))
  checks.push({ id: 'findings', pass: missing.length === 0 && unexpected.length === 0, missing, unexpected })

  const notesMissing = (exp.notesInclude || []).filter((id) => !result.notes.some((n) => n.id === id))
  checks.push({ id: 'notes', pass: notesMissing.length === 0, expectedCount: (exp.notesInclude || []).length, missing: notesMissing })

  const doseFails = []
  for (const d of exp.doses || []) {
    const row = result.doses.find((r) => r.drugId === d.drugId)
    if (!row || !closeTo(row.perDoseMg, d.perDoseMg) || (d.administrationEn && row.administration.en !== d.administrationEn)) doseFails.push(d.drugId)
  }
  checks.push({ id: 'doses', pass: doseFails.length === 0, expectedCount: (exp.doses || []).length, failed: doseFails })

  return { id: c.id, pass: checks.every((x) => x.pass), checks }
}
