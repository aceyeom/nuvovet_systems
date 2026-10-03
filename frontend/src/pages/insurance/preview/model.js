// Claim view model shared by the console claim detail and the landing preview (DESIGN_SYSTEM.md §5.1, §5.3).
// Pure functions only: this file is imported by the landing page, so it must stay free of React, the API
// client and the 2.4 MB snapshot.

/** Finding categories that count toward 검토 대상 금액 (backend/routers/claims.py RISK_CATEGORIES). */
export const RISK_CATEGORIES = ['pricing', 'integrity', 'clinical']

const SPECIES_WORD = { dog: '개', cat: '고양이' }

/**
 * Engine strings are written for logs: "₩4,727,600", " — " separators and raw species enums.
 * Console copy uses "4,727,600원", ", " and Korean species names (§6.1, §6.4, W3).
 */
export function koText(s) {
  if (typeof s !== 'string') return s
  return s
    .replace(/₩\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g, '$1원')
    .replace(/\s+—\s+/g, ', ')
    .replace(/—/g, ', ')
    .replace(/\b(dog|cat)\b/g, (m) => SPECIES_WORD[m])
}

// Evidence lines that carry English source notes get a Korean label; the original stays as the cite.
const EVIDENCE_RULES = [
  [/^벤치마크: NuvoVet seed estimate/, '진료비 벤치마크 (자체 추정치)'],
  [/^벤치마크: MAFRA/, '농식품부 진료비 현황조사 기반 벤치마크'],
  [/^근거: legacy compendium-derived record/, '참고 용량 자료 (출처 재작성 중)'],
]

export function evidenceItem(text) {
  for (const [re, label] of EVIDENCE_RULES) if (re.test(text)) return { label, cite: koText(text), source: true }
  return { label: koText(text), source: false }
}

/** "단가 ₩4,727,600 — 서울 중앙값 ₩1,680,000, P90 ₩2,800,000." becomes "서울 P90 2,800,000원". */
function pricingBasis(detail) {
  const m = typeof detail === 'string' && detail.match(/—\s*(\S+)\s+중앙값\s+₩([\d,]+),\s*P90\s+₩([\d,]+)/)
  return m ? `${m[1]} P90 ${m[3]}원` : null
}

export function claimAtRisk(findings) {
  return (findings || []).filter((f) => RISK_CATEGORIES.includes(f.category)).reduce((a, f) => a + (f.amount_at_risk || 0), 0)
}

export const isActionable = (f) => f.severity !== 'info'

function toFinding(f) {
  return {
    rule: f.rule,
    category: f.category,
    severity: f.severity,
    title: koText(f.title),
    detail: koText(f.detail),
    item_ref: f.item_ref ?? null,
    amount_at_risk: f.amount_at_risk || 0,
    basis: f.rule === 'pricing.regional_outlier' ? pricingBasis(f.detail) : null,
    evidence: (f.evidence || []).map(evidenceItem),
  }
}

/**
 * detail = { claim, adjudication } from GET /api/claims/demo/:id (or the snapshot's `details[id]`).
 * Answer-key labels (`detail.labels`) are deliberately dropped (§5.3, W4).
 */
export function toClaimModel(detail) {
  const c = detail.claim || {}
  const a = detail.adjudication || {}
  const findings = (a.findings || []).map(toFinding)
  const decisions = a.line_decisions || []
  const lineDec = {}
  const drugDec = {}
  for (const d of decisions) {
    const slim = { eligible: !!d.eligible, reason_code: d.reason_code || null, benefit_type: d.benefit_type || null, eligible_amount: d.eligible_amount ?? null }
    if ((d.source || 'line') === 'line') lineDec[d.line_index] = slim
    else if (d.source === 'prescription') drugDec[d.line_index] = slim
  }
  const refRisk = (code) =>
    code ? findings.filter((f) => f.item_ref === code && RISK_CATEGORIES.includes(f.category)).reduce((s, f) => s + f.amount_at_risk, 0) : 0
  const refFlag = (code) => !!code && findings.some((f) => f.item_ref === code && isActionable(f))
  const lines = (a.lines || []).map((l, i) => {
    const ref = l.code || l.drug_id || null
    return {
      description: l.description,
      code: l.code || null,
      code_name: l.code_name || null,
      drug_ingredient: l.drug_ingredient || null,
      quantity: l.quantity,
      unit_price: l.unit_price,
      total: l.total,
      benchmark_percentile: l.benchmark_percentile ?? null,
      benchmark_median: l.benchmark_median ?? null,
      decision: lineDec[i] || null,
      at_risk: refRisk(ref),
      flagged: refFlag(ref),
    }
  })
  const drugs = (a.drugs || []).map((d, i) => ({
    input_name: d.input_name,
    ingredient: d.ingredient || null,
    therapeutic_class: d.therapeutic_class || null,
    dose_mg_per_kg: d.dose_mg_per_kg ?? null,
    total: d.total,
    decision: drugDec[i] || null,
    flagged: refFlag(d.drug_id),
  }))
  return {
    claim_id: a.claim_id || c.claim_id,
    decision: a.decision,
    engine_version: a.engine_version || null,
    confidence: a.confidence ?? null,
    benefit_type: a.benefit_type || null,
    visit_date: c.visit_date || null,
    submitted_date: c.submitted_date || null,
    intake_channel: c.intake_channel || null,
    insurer_profile: a.insurer_profile ? { id: a.insurer_profile.id, name_ko: a.insurer_profile.name_ko, verified: !!a.insurer_profile.verified } : null,
    clinic: { clinic_id: c.clinic?.clinic_id || null, name: c.clinic?.name || null, region: c.clinic?.region || null },
    patient: {
      species: c.patient?.species || null,
      breed: c.patient?.breed || null,
      age_years: c.patient?.age_years ?? null,
      weight_kg: c.patient?.weight_kg ?? null,
    },
    diagnoses: (a.diagnoses || []).map((d) => ({ code: d.code || null, name_ko: d.name_ko || null, input: d.input || null, specificity: d.specificity || null })),
    payable: a.payable || null,
    findings,
    lines,
    drugs,
    pend_reasons: (a.pend_reasons || []).map((p) => ({ code: p.code, actor: p.actor, detail_ko: koText(p.detail_ko), requests: p.requests || [] })),
    siu_flags: (a.siu_flags || []).map((s) => ({ code: s.code, title_ko: koText(s.title_ko), detail_ko: koText(s.detail_ko), evidence: s.evidence || [] })),
    record_request_rule_id: a.record_request_rule_id || null,
    required_documents: (a.required_documents || []).map((d) => ({
      doc_type: d.doc_type,
      alternatives: d.alternatives || [],
      actor: d.actor,
      required: d.required !== false,
      status: d.status,
      why_ko: koText(d.why_ko),
      pend_code: d.pend_code || null,
    })),
  }
}

/** The landing hero subset (§5.1): the claim model plus the batch size, so `/` never loads the snapshot. */
export const HERO_CLAIM_ID = 'SYN-2026-00220'
export function toHeroClaim(snapshot, claimId = HERO_CLAIM_ID) {
  // The preview shows the header, findings, lines and payout; documents and prescriptions stay in the
  // console. Null fields are dropped to keep the file under 8 kB (components treat missing as null).
  const { required_documents, drugs, ...model } = toClaimModel(snapshot.details[claimId])
  return compact({ ...model, claimsCount: snapshot.summary.claims })
}

function compact(v) {
  if (Array.isArray(v)) return v.map(compact)
  if (v && typeof v === 'object') {
    const out = {}
    for (const [k, x] of Object.entries(v)) if (x !== null && x !== undefined) out[k] = compact(x)
    return out
  }
  return v
}

export const actionableFindings = (model) => model.findings.filter(isActionable)
