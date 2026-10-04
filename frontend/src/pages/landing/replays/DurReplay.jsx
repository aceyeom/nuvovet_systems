/**
 * Hero replay 1: EMR demo visit V1 re-enacted at 1200 × 750 inside the laptop.
 *
 *   open → type → add → check → alert → click → resolve → compact → save → (loop)
 *
 * The vet types 이버멕틴 into Rx 검색 and adds it; the island checks, then opens itself with the
 * contraindication (MDR1 dog + ivermectin + P-gp inhibitor); the cursor accepts the recommended
 * "이버멕틴 삭제"; the island turns green, folds back into a pill, and the order is saved.
 * `onStep(i)` reports the step rail index (0–4) to the hero.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bell, CalendarDays, FileText, FlaskConical, Hospital, OctagonX, Pill, Receipt, Search, ShieldCheck, Stethoscope, Syringe, TriangleAlert, UserPlus,
} from 'lucide-react'
import { PetAvatar } from '@/brand/PetAvatar'
import { Cursor } from './Cursor.jsx'
import { IslandMock } from './IslandMock.jsx'
import { DUR_PATIENT as P, DUR_ROWS, DUR_SEARCH, WAITLIST } from './script.js'
import { usePhases, useTarget, useTyping } from './timeline.js'

export const DUR_PHASES = [
  { id: 'open', ms: 1500 },
  { id: 'type', ms: 1700 },
  { id: 'add', ms: 650 },
  { id: 'check', ms: 700 },
  { id: 'alert', ms: 2900 },
  { id: 'click', ms: 650 },
  { id: 'resolve', ms: 1900 },
  { id: 'compact', ms: 900 },
  { id: 'save', ms: 2100 },
]
const STEP_OF = { open: 0, type: 0, add: 1, check: 1, alert: 2, click: 3, resolve: 3, compact: 4, save: 4 }
const TOOLS = [[UserPlus, '신규접수'], [Search, '환자검색'], [Stethoscope, '진료'], [FlaskConical, '검사의뢰'], [Pill, '처방'], [Syringe, '백신'], [FileText, '진단서'], [Receipt, '수납']]
const COLS = ['폴더명', '이름', '단위', '투여량', '계산량', '횟수', '일수', '경로', '전체', '금액', 'DUR']

function Row({ row, badge, hl }) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, backgroundColor: '#E7F7F2' }}
      animate={{ opacity: 1, backgroundColor: hl ? '#FFF4CC' : '#FFFFFF' }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.35 } }}
      transition={{ duration: 0.45 }}
    >
      <td>{row.folder}</td>
      <td className="rp-name">{row.name}</td>
      <td><span className="rp-sel">{row.unit}</span></td>
      <td className="rp-r"><span className="rp-in">{row.qty}</span></td>
      <td>{row.calc}</td>
      <td className="rp-r"><span className="rp-in rp-in-sm">{row.tt}</span></td>
      <td className="rp-r"><span className="rp-in rp-in-sm">{row.dy}</span></td>
      <td><span className="rp-sel">{row.rt}</span></td>
      <td className="rp-r">{row.total}</td>
      <td className="rp-r">{row.price}</td>
      <td>
        {badge === 'crit' ? <span className="rp-badge" data-tone="crit"><OctagonX size={11} strokeWidth={2} />금기</span>
          : badge === 'rel' ? <span className="rp-badge" data-tone="rel">관련 ≈</span>
            : <span className="rp-badge" data-tone="dash">–</span>}
      </td>
    </motion.tr>
  )
}

export function DurReplay({ playing = true, onStep }) {
  const root = useRef(null)
  const { phase, reached, cycle } = usePhases(DUR_PHASES, { playing })
  const typing = phase === 'type'
  const typed = useTyping(DUR_SEARCH.query, typing || phase === 'add', 140)
  const hasIvm = reached('add') && !reached('resolve')
  const alerting = reached('alert') && !reached('resolve')
  const islandState = phase === 'check' ? 'checking' : phase === 'alert' || phase === 'click' ? 'alert' : phase === 'resolve' ? 'resolved' : 'idle'

  useEffect(() => { onStep?.(STEP_OF[phase]) }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const targetName = { open: 'search', type: 'search', add: 'result', check: 'result', alert: 'island-fix', click: 'island-fix', resolve: 'save', compact: 'save', save: 'save' }[phase]
  const at = useTarget(root, targetName, `${phase}-${cycle}`)
  // The click lands after the cursor has arrived.
  const [pressing, setPressing] = useState(false)
  useEffect(() => {
    setPressing(false)
    if (!['add', 'click', 'save'].includes(phase)) return undefined
    const at0 = phase === 'save' ? 520 : 330
    const a = setTimeout(() => setPressing(true), at0)
    const b = setTimeout(() => setPressing(false), at0 + 220)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [phase, cycle])

  const rows = useMemo(() => (hasIvm ? [DUR_ROWS.ivm, DUR_ROWS.keto] : [DUR_ROWS.keto]), [hasIvm])
  const total = hasIvm ? '36,400원' : '29,400원'

  return (
    <div className="rp rp-emr" ref={root}>
      <div className="rp-title">
        <span className="rp-appicon"><Hospital size={13} strokeWidth={2} /></span>
        <b>데모 차트</b><span className="rp-dim">(가상 EMR)</span>
        <span className="rp-menu"><span>접수</span><span data-on="">진료</span><span>입원</span><span>수납</span><span>예약</span></span>
        <span className="rp-meta"><CalendarDays size={12} />2026-10-03 09:14<span className="rp-avatar">김</span>수의사 김민서<Bell size={12} /></span>
      </div>
      <div className="rp-toolbar">
        {TOOLS.map(([Icon, label]) => <span key={label} className="rp-tool"><Icon size={17} strokeWidth={1.6} />{label}</span>)}
      </div>
      <div className="rp-body">
        <aside className="rp-wait">
          <div className="rp-wait-head">대기목록<span>10명</span></div>
          {WAITLIST.map((w, i) => (
            <div key={w.id} className="rp-wait-item" data-on={i === 0 || undefined}>
              <PetAvatar id={w.id} size={30} alt="" />
              <span className="rp-wait-main"><b>{w.name}</b><span>{w.reason}</span></span>
              <span className="rp-wait-meta"><span>{w.time}</span><i data-on={i === 0 || undefined}>{w.state}</i></span>
            </div>
          ))}
        </aside>
        <main className="rp-chart">
          <section className="rp-box rp-pt">
            <div className="rp-pt-main">
              <PetAvatar id={P.id} size={64} shape="rounded" name={P.name} />
              <div className="rp-pt-info">
                <div className="rp-pt-line"><b className="rp-pt-name">{P.name}</b><span className="rp-dim">{P.no}</span>{P.signalment.map((s) => <span key={s}>{s}</span>)}</div>
                <div className="rp-pt-line"><span className="rp-dim">체중</span><span className="rp-in">{P.weight}</span>kg<span className="rp-dim">보호자</span>{P.guardian}<span className="rp-dim">담당의</span>김민서</div>
                <div className="rp-pt-line">
                  <span className="rp-chip" data-tone="warn"><TriangleAlert size={12} strokeWidth={2} />MDR1 미검사</span>
                  {P.dx.map(([c, n]) => <span key={c} className="rp-chip"><i>{c}</i>{n}</span>)}
                </div>
              </div>
              <span className="rp-ins"><ShieldCheck size={13} strokeWidth={1.75} />{P.insurance}</span>
            </div>
            <div className="rp-vitals">
              <span className="rp-cc"><span className="rp-dim">주호소</span>{P.complaint}</span>
              {P.vitals.map(([k, v, u]) => <span key={k}><span className="rp-dim">{k}</span><b>{v}</b>{u}</span>)}
            </div>
          </section>
          <section className="rp-box rp-rx">
            <div className="rp-box-title">TX/RX</div>
            <div className="rp-rx-tools">
              <span className="rp-dim">Rx 검색</span>
              <span className="rp-search" data-target="search" data-focus={typing || phase === 'add' || undefined}>
                <Search size={12} />
                {typed ? <span>{typed}<i className="rp-caret" data-on={typing || undefined} /></span> : <span className="rp-ph">성분명·상품명·초성</span>}
              </span>
              <AnimatePresence>
                {(typed.length >= 3 && (typing || phase === 'add')) ? (
                  <motion.span className="rp-drop" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                    {DUR_SEARCH.results.map((r, i) => (
                      <span key={r} className="rp-opt" data-target={i === 0 ? 'result' : undefined} data-on={(i === 0 && phase === 'add') || undefined}>{r}<i>{i === 0 ? 'RX-IVM-SOL10' : 'RX-IVM-CH272'}</i></span>
                    ))}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
            <table className="rp-grid">
              <thead><tr>{COLS.map((c) => <th key={c} className={['투여량', '횟수', '일수', '전체', '금액'].includes(c) ? 'rp-r' : undefined}>{c}</th>)}</tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {rows.map((r) => (
                    <Row key={r.id} row={r} badge={alerting ? (r.id === 'ivm' ? 'crit' : 'rel') : 'dash'} hl={alerting} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            <div className="rp-record">진료기록 · 처방 {rows.length}건 · 합계 <b>{total}</b></div>
            <div className="rp-actions">
              <span className="rp-btn rp-btn-primary" data-target="save" data-pressed={phase === 'save' || undefined}>처방 저장</span>
              <span className="rp-btn">처방전 출력</span>
              <span className="rp-btn">eVET 전송</span>
            </div>
          </section>
        </main>
      </div>
      <div className="rp-island-slot">
        <IslandMock state={islandState === 'idle' && alerting ? 'alertCompact' : islandState} pressed={phase === 'click'} />
      </div>
      <AnimatePresence>
        {phase === 'save' ? (
          <motion.div className="rp-toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.35 }}>
            처방을 저장했습니다 · DUR 검토 기록 1건
          </motion.div>
        ) : null}
      </AnimatePresence>
      <Cursor at={at} pressing={pressing} />
    </div>
  )
}

export default DurReplay
