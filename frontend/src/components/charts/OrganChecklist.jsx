import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { getBurdenLevel } from './organBurdenAggregator';
import { ORGAN_LABELS } from './anatomyConstants';
import { getOrganLoads } from './anatomyEliminationCalc';

const ORGANS = ['brain', 'heart', 'liver', 'kidney', 'blood'];
const PRIMARY_THRESHOLD = 40;  // ≥40 = primary involvement
const HIDE_THRESHOLD = 10;     // <10 = hidden entirely

// ── Info popup component ────────────────────────────────────────────
function InfoPopup({ text, onClose }) {
  return (
    <div className="absolute z-40 right-0 top-6 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-[10px] text-slate-600 leading-relaxed"
      onClick={(e) => e.stopPropagation()}>
      <button onClick={onClose} className="absolute top-1 right-1.5 text-slate-400 hover:text-slate-600 text-xs">&times;</button>
      {text}
    </div>
  );
}

// ── Ranked Organ List with Primary/Minor and always-visible elimination ──
export default function OrganChecklist({ organScores, showMdr1, hoveredOrgan, onHover, onMove, onLeave, t, lang, drugs, species }) {
  const [expandedOrgan, setExpandedOrgan] = useState(null);
  const [showSectionInfo, setShowSectionInfo] = useState(false);
  const [showElimInfo, setShowElimInfo] = useState(null); // organ key or null

  const { renal: renalTotal, hepatic: hepaticTotal, contributions } = (drugs && drugs.length > 0)
    ? getOrganLoads(drugs, species)
    : { renal: 0, hepatic: 0, contributions: [] };

  // Build ranked list with primary/minor classification
  const allOrgans = ORGANS.map((organ) => {
    const data = organScores?.[organ] || { finalScore: null, contributingDrugs: [], keywords: [], evidence: '' };
    const level = getBurdenLevel(data.finalScore);
    const drugCount = data.contributingDrugs?.length || 0;
    const score = data.finalScore ?? 0;
    const isPrimary = score >= PRIMARY_THRESHOLD;
    return { organ, data, level, drugCount, score, isPrimary };
  });

  const primary = allOrgans
    .filter((o) => o.isPrimary && o.drugCount > 0)
    .sort((a, b) => b.score - a.score);
  const minor = allOrgans
    .filter((o) => !o.isPrimary && o.score >= HIDE_THRESHOLD && o.drugCount > 0)
    .sort((a, b) => b.score - a.score);

  const levelDot = (level) => {
    const colors = {
      nodata: '#e2e8f0', none: '#cbd5e1', low: '#93c5fd',
      moderate: '#3b82f6', high: '#1d4ed8', critical: '#1e3a5f',
    };
    return colors[level] || '#e2e8f0';
  };

  // Elimination data for kidney/liver
  const getElimPct = (organ) => {
    if (organ === 'kidney') return renalTotal;
    if (organ === 'liver') return hepaticTotal;
    return null;
  };

  const getElimCautionLevel = (organ) => {
    const pct = getElimPct(organ);
    if (pct === null) return null;
    if (pct >= 200) return 'high';
    if (pct >= 120) return 'moderate';
    return null;
  };

  const elimExplanation = lang === 'ko'
    ? '이 수치는 처방된 약물들의 배설 부하량 합산입니다. 100%가 한계치가 아니며, 높을수록 해당 장기에 더 많은 부하가 걸림을 의미합니다.'
    : 'This is the cumulative elimination load from all prescribed drugs. 100% is not a limit — higher values mean greater processing burden on this organ.';

  const sectionExplanation = lang === 'ko'
    ? '주요 관여: 해당 장기에 의미 있는 약물 부하가 있음. 경미한 관여: 미미한 수준의 부하이나 참고용으로 표시됨.'
    : 'Primary: meaningful drug burden on this organ. Minor: low-level involvement shown for reference.';

  const renderOrganRow = ({ organ, data, level, drugCount, isPrimary }, isMinor) => {
    const organLabel = ORGAN_LABELS[organ];
    const isHovered = hoveredOrgan === organ;
    const isExpanded = expandedOrgan === organ;
    const elimPct = getElimPct(organ);
    const cautionLevel = getElimCautionLevel(organ);

    return (
      <div
        key={organ}
        className={`rounded-lg border transition-colors ${
          isExpanded ? 'border-blue-200 bg-blue-50/30' : isHovered ? 'border-slate-200 bg-slate-50' : 'border-transparent hover:bg-slate-50'
        }`}
        onMouseEnter={(e) => onHover(organ, e)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <button
          className="w-full flex items-center justify-between py-1.5 px-2 text-left"
          onClick={() => setExpandedOrgan(isExpanded ? null : organ)}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: levelDot(level) }} />
            <span className={`text-[11px] font-semibold ${isMinor ? 'text-slate-400' : 'text-slate-700'}`}>
              {organLabel.ko} / {organLabel.en}
            </span>
            {organ === 'brain' && showMdr1 && (
              <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">MDR1</span>
            )}
            {/* Always-visible elimination badge for kidney/liver */}
            {elimPct !== null && (
              <span className="relative flex items-center gap-0.5 ml-1">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  cautionLevel === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                  cautionLevel === 'moderate' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {organ === 'kidney' ? (lang === 'ko' ? '신장' : 'Renal') : (lang === 'ko' ? '간' : 'Hepatic')} {elimPct}%
                </span>
                {cautionLevel && (
                  <AlertTriangle size={10} className={cautionLevel === 'high' ? 'text-red-500' : 'text-amber-500'} />
                )}
                <button
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                  onClick={(e) => { e.stopPropagation(); setShowElimInfo(showElimInfo === organ ? null : organ); }}
                >
                  <Info size={10} />
                </button>
                {showElimInfo === organ && (
                  <InfoPopup text={elimExplanation} onClose={() => setShowElimInfo(null)} />
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-medium ${isMinor ? 'text-slate-400' : 'text-slate-500'}`}>
              ×{drugCount}
            </span>
            {isExpanded ? <ChevronUp size={10} className="text-slate-400" /> : <ChevronDown size={10} className="text-slate-400" />}
          </div>
        </button>

        {isExpanded && (
          <div className="px-3 pb-2.5 pt-0.5 space-y-1.5 border-t border-slate-100">
            {data.contributingDrugs.map((cd) => (
              <div key={cd.drugId} className="flex items-center py-1 px-2 bg-white rounded-md border border-slate-100">
                <span className="text-[11px] font-medium text-slate-700">{cd.drugName}</span>
              </div>
            ))}

            {/* Per-drug elimination breakdown for kidney/liver */}
            {(organ === 'kidney' || organ === 'liver') && contributions.length > 0 && (
              <div className="px-2 py-1.5 bg-slate-50 rounded-md border border-slate-100 space-y-0.5">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {lang === 'ko' ? '약물별 배설 기여도' : 'Per-drug elimination'}
                </p>
                {contributions.map((c) => {
                  const pct = organ === 'kidney' ? c.scaledRenal : c.scaledHepatic;
                  if (pct === 0) return null;
                  return (
                    <div key={c.drugId} className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-600">{c.drugName}</span>
                      <span className="font-semibold text-slate-700">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mb-3">
      {/* Section header with info icon */}
      <div className="relative flex items-center gap-1 mb-1.5 px-1">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
          {lang === 'ko' ? '장기별 약물 관여도' : 'Organ drug involvement'}
        </p>
        <button
          className="text-slate-400 hover:text-slate-600"
          onClick={() => setShowSectionInfo(!showSectionInfo)}
        >
          <Info size={10} />
        </button>
        {showSectionInfo && (
          <InfoPopup text={sectionExplanation} onClose={() => setShowSectionInfo(false)} />
        )}
      </div>

      {/* Primary organs */}
      {primary.length > 0 && (
        <div className="space-y-0.5 mb-1">
          {primary.map((o) => renderOrganRow(o, false))}
        </div>
      )}

      {/* Minor organs */}
      {minor.length > 0 && (
        <div className="space-y-0.5">
          {primary.length > 0 && (
            <p className="text-[8px] font-semibold text-slate-300 uppercase tracking-wider px-2 pt-1">
              {lang === 'ko' ? '경미한 관여' : 'Minor involvement'}
            </p>
          )}
          {minor.map((o) => renderOrganRow(o, true))}
        </div>
      )}

      {/* Empty state */}
      {primary.length === 0 && minor.length === 0 && (
        <p className="text-[10px] text-slate-400 px-2 py-2">
          {lang === 'ko' ? '약물을 추가하면 장기별 관여도가 표시됩니다' : 'Add drugs to see organ involvement'}
        </p>
      )}
    </div>
  );
}
