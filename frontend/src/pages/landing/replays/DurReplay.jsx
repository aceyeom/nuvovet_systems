/**
 * Hero replay 1: EMR demo visit V1 re-enacted at 1200 × 750 inside the laptop.
 *
 *   open → type → add → check → alert → click → resolve → compact → save → (loop)
 *
 * The vet types 이버멕틴 into Rx 검색 and adds it; the island checks, then opens itself with the
 * contraindication (MDR1 dog + ivermectin + P-gp inhibitor); the cursor accepts the recommended
 * "이버멕틴 삭제"; the island folds back into a pill, and the order is saved.
 *
 * The host is the same fictional 2000s clinic program as the EMR demo (src/portfolio/emr/host): bevelled
 * text toolbar, square framed photos, square bordered status cells, no icon set. The island is the only
 * modern layer. The replay is a picture (the laptop screen is role="img" and inert), so it uses no
 * landmarks or headings: divs and <b> only.
 *
 * props: playing, still (reduced motion: hold the alert frame), onStep(i) (the hero's step labels, 0–4),
 *        onPhase(index, cycle), onEnd() (see usePhases)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PetAvatar } from '@/brand/PetAvatar'
import { Cursor } from './Cursor.jsx'
import { IslandMock } from './IslandMock.jsx'
import { DUR_PATIENT as P, DUR_ROWS, DUR_SEARCH, WAITLIST } from './script.js'
import { usePhases, useReport, useTarget, useTyping } from './timeline.js'

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
const STILL = DUR_PHASES.findIndex((p) => p.id === 'alert')
const TOOLS = [['신규접수', '환자검색'], ['진료', '검사의뢰', '처방', '백신']]
const COLS = ['폴더명', '구분', '이름', '단위', '투여량', '계산량', '횟수', '일수', '경로', '전체', '금액', 'DUR']
const NUM = new Set(['투여량', '횟수', '일수', '전체', '금액'])

/**
 * A grid row. No layout animation: a removed row fades out in place and then unmounts, and the rows
 * below move up at once, as a legacy grid redraws (a layout-animated row slid over the 진료기록 line).
 */
function Row({ row, badge, hl }) {
  return (
    <motion.tr
      initial={{ opacity: 0, backgroundColor: '#E8F3EC' }}
      animate={{ opacity: 1, backgroundColor: hl ? '#FFF4CC' : '#FFFFFF' }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
      transition={{ duration: 0.45 }}
    >
      <td>{row.folder}</td>
      <td><span className="rp-sel">Rx</span></td>
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
        {badge === 'crit' ? <span className="rp-badge" data-tone="crit">금기</span>
          : badge === 'rel' ? <span className="rp-badge" data-tone="rel">관련 ≈</span>
            : <span className="rp-badge" data-tone="dash">–</span>}
      </td>
    </motion.tr>
  )
}

export function DurReplay({ playing = true, still = false, onStep, onPhase, onEnd }) {
  const root = useRef(null)
  const { index, phase, reached, cycle } = usePhases(DUR_PHASES, { playing: playing && !still, start: still ? STILL : 0, onEnd })
  const typing = phase === 'type'
  const typed = useTyping(DUR_SEARCH.query, typing || phase === 'add', 140)
  const hasIvm = reached('add') && !reached('resolve')
  const alerting = reached('alert') && !reached('resolve')
  const islandState = phase === 'check' ? 'checking' : phase === 'alert' || phase === 'click' ? 'alert' : phase === 'resolve' ? 'resolved' : 'idle'

  useReport(onStep, [STEP_OF[phase]])
  useReport(onPhase, [index, cycle])

  const targetName = { open: 'search', type: 'search', add: 'result', check: 'result', alert: 'island-fix', click: 'island-fix', resolve: 'save', compact: 'save', save: 'save' }[phase]
  const at = useTarget(root, still ? null : targetName, `${phase}-${cycle}`)
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
  // The 진료기록 line counts the rows on screen: an added row counts at once, a removed one once its
  // fade-out is done (AnimatePresence onExitComplete), so the line never reads 1건 over two rows.
  const [shown, setShown] = useState(rows.length)
  useEffect(() => { setShown((n) => Math.max(n, rows.length)) }, [rows.length])
  const total = shown > 1 ? '36,400원' : '29,400원'

  return (
    <div className="rp rp-emr" ref={root}>
      <div className="rp-title">
        <span className="rp-appicon" />
        <b>데모 차트</b><span className="rp-dim">(가상 EMR)</span>
        <span className="rp-tsep" />
        <span className="rp-menu"><span>접수</span><span data-on="">진료</span><span>입원</span><span>수납</span><span>예약</span><span>통계</span></span>
        <span className="rp-meta">
          <span>새봄동물의료센터 (가상)</span><i />
          <span>2026-10-03 09:14</span><i />
          <span>수의사 김민서 (가상)</span><i />
          <span>알림 <b className="rp-bell">3</b></span>
        </span>
      </div>
      <div className="rp-toolbar">
        {TOOLS.map((group, g) => (
          <span key={g} className="rp-tools">
            {g > 0 ? <span className="rp-tool-sep" /> : null}
            {group.map((label) => <span key={label} className="rp-tool">{label}</span>)}
          </span>
        ))}
        <span className="rp-tool-stat">오늘 내원 <b>10</b></span>
        <span className="rp-tool-stat">출력 대기 <b>0</b></span>
      </div>
      <div className="rp-body">
        <div className="rp-wait">
          <div className="rp-wait-head">대기목록<span>10명</span></div>
          <div className="rp-wait-tabs"><span data-on="">대기</span><span>진료중</span><span>수납</span></div>
          {WAITLIST.map((w, i) => (
            <div key={w.id} className="rp-wait-item" data-on={i === 0 || undefined}>
              <PetAvatar id={w.id} size={32} shape="square" alt="" />
              <span className="rp-wait-main"><b>{w.name}<span>{w.sp}</span></b><span>{w.reason}</span></span>
              <span className="rp-wait-meta"><span>{w.time}</span><i data-on={i === 0 || undefined}>{w.state}</i></span>
            </div>
          ))}
        </div>
        <div className="rp-chart">
          <div className="rp-box rp-pt">
            <div className="rp-pt-main">
              <span className="rp-pt-photo"><PetAvatar id={P.id} size={60} shape="square" name={P.name} alt="" /></span>
              <div className="rp-pt-info">
                <div className="rp-pt-line"><b className="rp-pt-name">{P.name}</b><span className="rp-dim">{P.no}</span>{P.signalment.map((s) => <span key={s}>{s}</span>)}</div>
                <div className="rp-pt-line"><span className="rp-dim">체중</span><span className="rp-in">{P.weight}</span>kg<span className="rp-dim">보호자</span>{P.guardian}<span className="rp-dim">담당의</span>김민서</div>
                <div className="rp-pt-line">
                  <span className="rp-dim">특이</span>
                  <span className="rp-cell" data-tone="warn"><i>MDR1</i><span>미검사</span></span>
                  <span className="rp-cell"><i>알레르기</i><span>없음</span></span>
                  <span className="rp-cell"><i>만성</i><span>없음</span></span>
                </div>
              </div>
              <span className="rp-pt-side">
                <span className="rp-cell" data-tone="ok"><i>보험</i><span>{P.insurance}</span></span>
                <span className="rp-dim">접수 09:10 · 진료 1 · 개 재진</span>
              </span>
            </div>
            <div className="rp-vitals">
              <span className="rp-cc"><span className="rp-dim">주호소</span>{P.complaint}</span>
              {P.vitals.map(([k, v, u]) => <span key={k}><span className="rp-dim">{k}</span><b>{v}</b>{u}</span>)}
            </div>
          </div>
          <div className="rp-box rp-soap">
            <div className="rp-soap-tabs"><span>S 주관</span><span>O 객관</span><span data-on="">A 진단</span><span>P 계획</span><span>검사결과</span><span>이력·백신</span></div>
            <div className="rp-soap-row">
              <span className="rp-dim">진단명</span>
              {P.dx.map(([c, n]) => <span key={c} className="rp-dx"><i>{c}</i>{n}<b>×</b></span>)}
              <span className="rp-sel rp-sel-wide">진단 추가</span>
            </div>
          </div>
          <div className="rp-box rp-rx">
            <div className="rp-box-title">TX/RX</div>
            <div className="rp-rx-tools">
              <span className="rp-dim">Rx 검색</span>
              <span className="rp-search" data-target="search" data-focus={typing || phase === 'add' || undefined}>
                {typed ? <span>{typed}<i className="rp-caret" data-on={typing || undefined} /></span> : <span className="rp-ph">성분명·상품명·초성</span>}
              </span>
              <span className="rp-dim">필터</span>
              <span className="rp-chk">(정)</span><span className="rp-chk">(주)</span><span className="rp-chk">(액)</span>
              {/* A legacy list box: it appears and goes at once, no fade. */}
              {(typed.length >= 3 && (typing || phase === 'add')) ? (
                <span className="rp-drop">
                  {DUR_SEARCH.results.map((r, i) => (
                    <span key={r} className="rp-opt" data-target={i === 0 ? 'result' : undefined} data-on={(i === 0 && phase === 'add') || undefined}>{r}<i>{i === 0 ? 'RX-IVM-SOL10' : 'RX-IVM-CH272'}</i></span>
                  ))}
                </span>
              ) : null}
            </div>
            <table className="rp-grid">
              <thead><tr>{COLS.map((c) => <th key={c} className={NUM.has(c) ? 'rp-r' : undefined}>{c}</th>)}</tr></thead>
              <tbody>
                <AnimatePresence initial={false} onExitComplete={() => setShown(rows.length)}>
                  {rows.map((r) => (
                    <Row key={r.id} row={r} badge={alerting ? (r.id === 'ivm' ? 'crit' : 'rel') : 'dash'} hl={alerting} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            <div className="rp-record">진료기록 · 처방 {shown}건 · 합계 <b>{total}</b></div>
            <div className="rp-actions">
              <span className="rp-btn rp-btn-primary" data-target="save" data-pressed={phase === 'save' || undefined}>처방 저장</span>
              <span className="rp-btn">처방전 출력</span>
              <span className="rp-btn">eVET 전송</span>
              <span className="rp-btn" data-off="">수납으로</span>
            </div>
          </div>
        </div>
      </div>
      <span className="rp-watermark">가상 EMR · 실제 제품이 아닙니다</span>
      <div className="rp-island-slot">
        <IslandMock state={islandState === 'idle' && alerting ? 'alertCompact' : islandState} pressed={phase === 'click'} />
      </div>
      <AnimatePresence>
        {phase === 'save' ? (
          <motion.div className="rp-toast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.35 }}>
            처방을 저장했습니다 · DUR 검토 기록 1건
          </motion.div>
        ) : null}
      </AnimatePresence>
      {still ? null : <Cursor at={at} pressing={pressing} />}
    </div>
  )
}

export default DurReplay
