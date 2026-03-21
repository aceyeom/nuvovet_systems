import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getBurdenLevel } from './organBurdenAggregator';
import { ORGAN_LABELS } from './anatomyConstants';
import { getOrganLoads } from './anatomyEliminationCalc';

const ORGANS = ['brain', 'heart', 'liver', 'kidney', 'blood'];

// ── Ranked Organ List with expand-in-place ──────────────────────────
export default function OrganChecklist({ organScores, showMdr1, hoveredOrgan, onHover, onMove, onLeave, t, lang, drugs, species }) {
  const [expandedOrgan, setExpandedOrgan] = useState(null);

  const { contributions } = (drugs && drugs.length > 0)
    ? getOrganLoads(drugs, species)
    : { contributions: [] };

  // Build sorted list: by drug count descending, hide zero-drug organs
  const ranked = ORGANS.map((organ) => {
    const data = organScores?.[organ] || { finalScore: null, contributingDrugs: [], keywords: [], evidence: '' };
    const level = getBurdenLevel(data.finalScore);
    const drugCount = data.contributingDrugs?.length || 0;
    return { organ, data, level, drugCount };
  })
    .filter((o) => o.drugCount > 0)
    .sort((a, b) => b.drugCount - a.drugCount);

  const levelDot = (level) => {
    const colors = {
      nodata: '#e2e8f0', none: '#cbd5e1', low: '#93c5fd',
      moderate: '#3b82f6', high: '#1d4ed8', critical: '#1e3a5f',
    };
    return colors[level] || '#e2e8f0';
  };

  return (
    <div className="mb-3">
      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
        {lang === 'ko' ? '장기별 관여 약물' : 'Drugs per organ'}
      </p>

      <div className="space-y-0.5">
        {ranked.map(({ organ, data, level, drugCount }) => {
          const organLabel = ORGAN_LABELS[organ];
          const isHovered = hoveredOrgan === organ;
          const isExpanded = expandedOrgan === organ;

          // Elimination % (kidney → renal, liver → hepatic)
          const elimPct = organ === 'kidney'
            ? contributions.reduce((sum, c) => sum + c.scaledRenal, 0)
            : organ === 'liver'
            ? contributions.reduce((sum, c) => sum + c.scaledHepatic, 0)
            : null;

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
              {/* Row: organ name + drug count */}
              <button
                className="w-full flex items-center justify-between py-1.5 px-2 text-left"
                onClick={() => setExpandedOrgan(isExpanded ? null : organ)}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: levelDot(level) }} />
                  <span className="text-[11px] font-semibold text-slate-700">
                    {organLabel.ko} / {organLabel.en}
                  </span>
                  {organ === 'brain' && showMdr1 && (
                    <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">MDR1</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-slate-500">
                    ×{drugCount}
                  </span>
                  {isExpanded ? <ChevronUp size={10} className="text-slate-400" /> : <ChevronDown size={10} className="text-slate-400" />}
                </div>
              </button>

              {/* Expand-in-place: drug names + elimination + keywords */}
              {isExpanded && (
                <div className="px-3 pb-2.5 pt-0.5 space-y-1.5 border-t border-slate-100">
                  {/* Drug names */}
                  {data.contributingDrugs.map((cd) => (
                    <div key={cd.drugId} className="flex items-center py-1 px-2 bg-white rounded-md border border-slate-100">
                      <span className="text-[11px] font-medium text-slate-700">{cd.drugName}</span>
                    </div>
                  ))}

                  {/* Elimination % for kidney/liver */}
                  {elimPct !== null && (
                    <div className="px-2 py-1.5 bg-slate-50 rounded-md border border-slate-100">
                      <p className="text-[10px] text-slate-500">
                        {organ === 'kidney'
                          ? (lang === 'ko' ? '신장 배설 비율' : 'Renal elimination')
                          : (lang === 'ko' ? '간 배설 비율' : 'Hepatic elimination')
                        }: <span className="font-semibold text-slate-700">{elimPct}%</span>
                      </p>
                    </div>
                  )}

                  {/* Keywords */}
                  {data.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {data.keywords.map((kw, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {ranked.length === 0 && (
        <p className="text-[10px] text-slate-400 px-2 py-2">
          {lang === 'ko' ? '약물을 추가하면 장기별 관여도가 표시됩니다' : 'Add drugs to see organ involvement'}
        </p>
      )}
    </div>
  );
}
