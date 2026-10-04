/**
 * Hero replay 2: the Claims console adjudicating the synthetic hero claim (heroClaim.json).
 *
 *   receive → code → rules → payout → decide → (loop)
 *
 * The receipt's free-text lines arrive, each gets its standard code, the pricing rules flag the
 * outliers with their amount at risk, the payout ledger counts down to the payable amount, and the
 * engine hands the claim to an adjuster ("검토 필요") with the clinic-level pattern flag.
 */
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import NumberFlow from '@number-flow/react'
import {
  Activity, BadgeCheck, Building2, Code2, FileSearch, Inbox, Landmark, ReceiptText, ScanLine, Siren, TriangleAlert,
} from 'lucide-react'
import { CLAIM, CLAIM_FINDINGS, CLAIM_LEDGER, CLAIM_LINES, fmtWon } from './script.js'
import { usePhases } from './timeline.js'

export const CLAIMS_PHASES = [
  { id: 'receive', ms: 1500 },
  { id: 'code', ms: 2300 },
  { id: 'rules', ms: 2300 },
  { id: 'payout', ms: 2300 },
  { id: 'decide', ms: 2900 },
]
const STEP_OF = { receive: 0, code: 1, rules: 2, payout: 3, decide: 4 }
const NAV = [[Inbox, '청구 대기열', true], [Building2, '병원'], [Landmark, '수가 기준'], [Activity, '엔진 성능'], [Code2, 'API']]
const SEV = { critical: '높음', warning: '주의' }

export function ClaimsReplay({ playing = true, onStep }) {
  const { phase, reached, cycle } = usePhases(CLAIMS_PHASES, { playing })
  useEffect(() => { onStep?.(STEP_OF[phase]) }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps
  const coded = reached('code')
  const ruled = reached('rules')
  const paid = reached('payout')
  const decided = reached('decide')
  const findings = CLAIM_FINDINGS.slice(0, 6)

  return (
    <div className="rp rp-claims">
      <aside className="rc-side">
        <div className="rc-brand"><span className="rc-mark" />nuvovet<b>Claims</b></div>
        {NAV.map(([Icon, label, on]) => <span key={label} className="rc-nav" data-on={on || undefined}><Icon size={15} strokeWidth={1.75} />{label}</span>)}
        <div className="rc-side-foot"><span className="rc-dot" />엔진 {CLAIM.engine_version}</div>
      </aside>
      <main className="rc-main">
        <header className="rc-head">
          <div>
            <span className="rc-crumb">청구 대기열 / {CLAIM.claim_id}</span>
            <h3>{CLAIM.claim_id}<span className="rc-chip">수술</span></h3>
            <p>{CLAIM.clinic.name} · {CLAIM.clinic.region} · {CLAIM.patient.breed} {CLAIM.patient.age_years}세 · {CLAIM.diagnoses[0].name_ko}</p>
          </div>
          <AnimatePresence mode="wait">
            {decided ? (
              <motion.span key="d" className="rc-decision" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
                <FileSearch size={15} strokeWidth={2} />심사자 검토 필요
              </motion.span>
            ) : (
              <motion.span key="p" className="rc-pending" exit={{ opacity: 0 }}>
                <ScanLine size={15} strokeWidth={1.75} />{coded ? '규칙 심사 중' : '수신 중'}
              </motion.span>
            )}
          </AnimatePresence>
        </header>
        <div className="rc-grid">
          <section className="rc-card rc-lines">
            <div className="rc-card-title"><ReceiptText size={14} strokeWidth={1.75} />청구 항목 <span>{CLAIM_LINES.length}개</span></div>
            <table>
              <thead><tr><th>청구 원문</th><th>표준화</th><th className="rp-r">금액</th><th className="rp-r">소견 금액</th></tr></thead>
              <tbody>
                {CLAIM_LINES.map((l, i) => (
                  <motion.tr key={`${l.key}-${cycle}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.09 }} data-sev={ruled && l.severity ? l.severity : undefined}>
                    <td className="rc-raw">{l.raw}{l.qty > 1 ? <i> × {l.qty}</i> : null}</td>
                    <td>
                      {coded ? (
                        <motion.span className="rc-code" data-none={!l.code || undefined} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.16, type: 'spring', stiffness: 400, damping: 22 }}>
                          {l.code ? <><b>{l.code}</b>{l.codeName}</> : '약품으로 인식'}
                        </motion.span>
                      ) : <span className="rc-skel" />}
                    </td>
                    <td className="rp-r rc-num">{fmtWon(l.total)}</td>
                    <td className="rp-r rc-num">
                      {ruled && l.risk ? (
                        <motion.span className="rc-risk" data-sev={l.severity} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>{fmtWon(l.risk)}</motion.span>
                      ) : <span className="rc-dim">–</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="rc-col">
            <div className="rc-card rc-findings">
              <div className="rc-card-title"><TriangleAlert size={14} strokeWidth={1.75} />심사 소견 <span>{ruled ? `${CLAIM.findings.filter((f) => f.severity !== 'info').length}건` : '대기'}</span></div>
              <ul>
                <AnimatePresence>
                  {ruled ? findings.map((f, i) => (
                    <motion.li key={`${f.item_ref}-${cycle}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.22 }} data-sev={f.severity}>
                      <span className="rc-sev">{SEV[f.severity] || '참고'}</span>
                      <span className="rc-ftitle">{f.title}</span>
                      <span className="rc-num">{fmtWon(f.amount_at_risk)}</span>
                    </motion.li>
                  )) : null}
                </AnimatePresence>
              </ul>
              <p className="rc-rule">{ruled ? '규칙 pricing.regional_outlier · 지역 수가 백분위' : '보장 · 임상 · 수가 · 무결성 규칙 대기'}</p>
            </div>
            <div className="rc-card rc-ledger">
              <div className="rc-card-title"><Landmark size={14} strokeWidth={1.75} />지급 계산</div>
              <dl>
                {CLAIM_LEDGER.map((r) => (
                  <div key={r.key} data-total={r.total || undefined}>
                    <dt>{r.label}</dt>
                    <dd className="rc-num">
                      {r.sign && paid ? <span className="rc-sign">{r.sign}</span> : null}
                      <NumberFlow value={paid ? r.value : r.key === 'billed' ? r.value : 0} locales="ko-KR" suffix="원" transformTiming={{ duration: 900, easing: 'ease-out' }} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>
        <AnimatePresence>
          {decided ? (
            <motion.div className="rc-flag" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.5, duration: 0.45 }}>
              <span className="rc-flag-icon"><Siren size={16} strokeWidth={1.75} /></span>
              <span><b>{CLAIM.siu_flags[0].title_ko}</b>{CLAIM.siu_flags[0].detail_ko}</span>
              <span className="rc-flag-ok"><BadgeCheck size={14} strokeWidth={1.75} />자동 거절 없음 · 심사자 확인</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default ClaimsReplay
