/**
 * Hero replay 2: the Claims console adjudicating the synthetic hero claim (heroClaim.json).
 *
 *   receive → code → rules → payout → decide → (loop)
 *
 * The receipt's free-text lines arrive, each gets its standard code, the pricing rules flag the
 * outliers with their amount at risk, the payout is calculated down to the payable amount, and the
 * engine hands the claim to an adjuster ("심사자 검토 필요") with the clinic-level pattern flag.
 *
 * The chrome follows the real /insurance console: white surfaces, hairlines, a quiet sidebar, solid
 * fills and severities as words. No icon set, no gradients, no glowing dots. Like the DUR replay it is
 * a picture inside the laptop screen (role="img", inert): divs and <b>, no landmarks or headings.
 *
 * props: playing, still (reduced motion: hold the decided frame), onStep(i), onPhase(index, cycle), onEnd()
 */
import { AnimatePresence, motion } from 'motion/react'
import { BrandLockup } from '@/brand/Brand'
import { CLAIM, CLAIM_FINDINGS, CLAIM_LEDGER, CLAIM_LINES, fmtWon } from './script.js'
import { usePhases, useReport } from './timeline.js'

export const CLAIMS_PHASES = [
  { id: 'receive', ms: 1500 },
  { id: 'code', ms: 2300 },
  { id: 'rules', ms: 2300 },
  { id: 'payout', ms: 2300 },
  { id: 'decide', ms: 2900 },
]
const STEP_OF = { receive: 0, code: 1, rules: 2, payout: 3, decide: 4 }
const STILL = CLAIMS_PHASES.length - 1
const NAV = [['개요'], ['청구 심사', '135', true], ['병원 리스크'], ['진료비 벤치마크'], ['엔진 성능'], ['API 연동']]
const SEV = { critical: '높음', warning: '주의' }

export function ClaimsReplay({ playing = true, still = false, onStep, onPhase, onEnd }) {
  const { index, phase, reached, cycle } = usePhases(CLAIMS_PHASES, { playing: playing && !still, start: still ? STILL : 0, onEnd })
  useReport(onStep, [STEP_OF[phase]])
  useReport(onPhase, [index, cycle])
  const coded = reached('code')
  const ruled = reached('rules')
  const paid = reached('payout')
  const decided = reached('decide')
  const findings = CLAIM_FINDINGS.slice(0, 6)
  const actionable = CLAIM.findings.filter((f) => f.severity !== 'info').length
  const fade = (delay) => (still ? { initial: false } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.35, delay } })

  return (
    <div className="rp rp-claims">
      <div className="rc-side">
        <div className="rc-brand"><BrandLockup product="claims" height={18} /></div>
        {NAV.map(([label, count, on]) => (
          <span key={label} className="rc-nav" data-on={on || undefined}>{label}{count ? <i>{count}</i> : null}</span>
        ))}
        <div className="rc-side-foot">엔진 {CLAIM.engine_version}</div>
      </div>
      <div className="rc-main">
        <div className="rc-top"><span>청구 심사</span><span className="rc-top-user">김 심사역 (가상)</span></div>
        <div className="rc-head">
          <div>
            <span className="rc-crumb">청구 심사 / {CLAIM.claim_id}</span>
            <b className="rc-id">{CLAIM.claim_id}<span className="rc-tag">수술</span></b>
            <span className="rc-meta">{CLAIM.clinic.name} · {CLAIM.clinic.region} · {CLAIM.patient.breed} {CLAIM.patient.age_years}세 · {CLAIM.diagnoses[0].name_ko}</span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {decided ? (
              <motion.span key="d" className="rc-decision" {...fade(0)}>심사자 검토 필요</motion.span>
            ) : (
              <motion.span key="p" className="rc-pending" exit={{ opacity: 0 }}>{coded ? '규칙 심사 중' : '영수증 수신 중'}</motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="rc-grid">
          <div className="rc-card rc-lines">
            <div className="rc-card-title">청구 항목<span>{CLAIM_LINES.length}개</span></div>
            <table>
              <thead><tr><th>청구 원문</th><th>표준화</th><th className="rp-r">금액</th><th className="rp-r">소견 금액</th></tr></thead>
              <tbody>
                {CLAIM_LINES.map((l, i) => (
                  <motion.tr key={`${l.key}-${cycle}`} {...fade(i * 0.08)}>
                    <td className="rc-raw">{l.raw}{l.qty > 1 ? <i> × {l.qty}</i> : null}</td>
                    <td>
                      {coded ? (
                        <motion.span className="rc-code" data-none={!l.code || undefined} {...fade(i * 0.12)}>
                          {l.code ? <><b>{l.code}</b>{l.codeName}</> : '약품으로 인식'}
                        </motion.span>
                      ) : <span className="rc-dim">대기</span>}
                    </td>
                    <td className="rp-r rc-num">{fmtWon(l.total)}</td>
                    <td className="rp-r rc-num">
                      {ruled && l.risk ? (
                        <motion.span className="rc-risk" data-sev={l.severity} {...fade(i * 0.08)}>{fmtWon(l.risk)}</motion.span>
                      ) : <span className="rc-dim">–</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rc-col">
            <div className="rc-card rc-findings">
              <div className="rc-card-title">심사 소견<span>{ruled ? `${actionable}건` : '대기'}</span></div>
              <ul>
                {ruled ? findings.map((f, i) => (
                  <motion.li key={`${f.item_ref}-${cycle}`} data-sev={f.severity} {...fade(0.1 + i * 0.16)}>
                    <span className="rc-sev">{SEV[f.severity] || '참고'}</span>
                    <span className="rc-ftitle">{f.title}</span>
                    <span className="rc-num">{fmtWon(f.amount_at_risk)}</span>
                  </motion.li>
                )) : null}
              </ul>
              <p className="rc-rule">{ruled ? '규칙 pricing.regional_outlier · 지역 수가 백분위' : '보장 · 임상 · 수가 · 무결성 규칙 대기'}</p>
            </div>
            <div className="rc-card rc-ledger">
              <div className="rc-card-title">지급 계산</div>
              <dl>
                {CLAIM_LEDGER.map((r, i) => (
                  <div key={r.key} data-total={r.total || undefined}>
                    <dt>{r.label}</dt>
                    <dd className="rc-num">
                      {paid || r.key === 'billed' ? (
                        <motion.span key={`${r.key}-${paid}`} {...(r.key === 'billed' ? { initial: false } : fade(i * 0.18))}>
                          {r.sign && r.value ? <span className="rc-sign">{r.sign}</span> : null}{fmtWon(r.value)}
                        </motion.span>
                      ) : <span className="rc-dim">–</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {decided ? (
            <motion.div className="rc-flag" {...fade(0.4)} exit={{ opacity: 0 }}>
              <span className="rc-flag-k">병원 패턴</span>
              <span className="rc-flag-v"><b>{CLAIM.siu_flags[0].title_ko}</b>{CLAIM.siu_flags[0].detail_ko}</span>
              <span className="rc-flag-ok">자동 거절 없음 · 심사자 확인</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default ClaimsReplay
