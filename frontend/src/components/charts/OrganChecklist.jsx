import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { getBurdenLevel } from './organBurdenAggregator';
import { ORGAN_LABELS, LEVEL_LABELS, LEVEL_COLORS, getOrganDotColor } from './anatomyConstants';

const ORGANS = ['brain', 'heart', 'liver', 'kidney', 'blood'];

// ── Organ Detail Modal ──────────────────────────────────────────────
function OrganDetailModal({ organ, data, t, lang, onClose }) {
  if (!organ || !data) return null;

  const level = getBurdenLevel(data.finalScore);
  const levelInfo = LEVEL_LABELS[level];
  const organLabel = ORGAN_LABELS[organ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X size={16} className="text-slate-400" />
        </button>

        {/* Header */}
        <div className="mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getOrganDotColor(data.finalScore) }}
            />
            <h3 className="text-[15px] font-bold text-slate-800">
              {organLabel.ko} / {organLabel.en}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[13px] font-bold text-slate-700">
              {data.finalScore !== null ? `${data.finalScore} / 100` : '—'}
            </span>
            <span className={`text-[11px] font-semibold ${LEVEL_COLORS[level]}`}>
              {levelInfo.dots} {levelInfo.ko} ({levelInfo.en})
            </span>
          </div>
        </div>

        {/* Recommended Action */}
        {levelInfo.action ? (
          <div className="mb-4 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-1">
              {t?.anatomy?.recommendedAction || '권장 조치'}
            </p>
            <p className="text-[12px] text-blue-700 font-medium leading-relaxed">
              {levelInfo.action}
            </p>
          </div>
        ) : (
          <div className="mb-4 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
            <p className="text-[11px] text-slate-500">
              {t?.anatomy?.noActionNeeded || '현재 수준에서 특별한 모니터링이 필요하지 않습니다'}
            </p>
          </div>
        )}

        {/* Contributing Drugs */}
        {data.contributingDrugs.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {t?.anatomy?.contributingDrugs || '관여 약물'}
            </p>
            <div className="space-y-1.5">
              {data.contributingDrugs.map((cd) => (
                <div key={cd.drugId} className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-lg">
                  <span className="text-[12px] font-medium text-slate-700">{cd.drugName}</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">base: {cd.baseScore}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-semibold text-slate-700">{cd.scaledScore}</span>
                    {cd.doseScalingApplied && cd.baseScore !== cd.scaledScore && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                        dose-scaled
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keywords / Triggered Effects */}
        {data.keywords.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t?.anatomy?.triggeredEffects || '유발 효과'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.keywords.map((kw, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Full Evidence */}
        {data.evidence && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t?.anatomy?.fullEvidence || '전체 근거'}
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
              {data.evidence}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Organ Checklist (replaces raw score table) ──────────────────────
export default function OrganChecklist({ organScores, showMdr1, hoveredOrgan, onHover, onMove, onLeave, t, lang }) {
  const [showAll, setShowAll] = useState(false);
  const [selectedOrgan, setSelectedOrgan] = useState(null);

  const organsWithData = ORGANS.map((organ) => {
    const data = organScores?.[organ] || { finalScore: null, contributingDrugs: [], keywords: [], evidence: '' };
    const level = getBurdenLevel(data.finalScore);
    return { organ, data, level };
  });

  const visibleOrgans = showAll
    ? organsWithData
    : organsWithData.filter((o) => o.level !== 'nodata' && o.level !== 'none');

  const hiddenCount = organsWithData.length - visibleOrgans.length;

  return (
    <>
      <div className="mb-3">
        {/* Section label */}
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
          {t?.anatomy?.monitoringChecklist || '모니터링 체크리스트'}
        </p>

        <div className="space-y-0.5">
          {visibleOrgans.map(({ organ, data, level }) => {
            const levelInfo = LEVEL_LABELS[level];
            const organLabel = ORGAN_LABELS[organ];
            const isHovered = hoveredOrgan === organ;

            return (
              <div
                key={organ}
                className={`flex flex-col gap-0.5 py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                  isHovered ? 'bg-slate-100' : 'hover:bg-slate-50'
                }`}
                onMouseEnter={(e) => onHover(organ, e)}
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                onClick={() => setSelectedOrgan(organ)}
              >
                {/* Top row: organ name + level */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getOrganDotColor(data.finalScore) }}
                    />
                    <span className="text-[11px] font-medium text-slate-700">{organLabel.ko} / {organLabel.en}</span>
                    {organ === 'brain' && showMdr1 && (
                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">MDR1</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold ${LEVEL_COLORS[level]}`}>
                      {levelInfo.ko}
                    </span>
                    <span className={`text-[9px] ${LEVEL_COLORS[level]}`}>
                      {levelInfo.dots}
                    </span>
                  </div>
                </div>

                {/* Action sentence */}
                {levelInfo.action && (
                  <p className="text-[10px] text-slate-500 pl-3.5 leading-relaxed">
                    → {levelInfo.action}
                    {data.contributingDrugs.length > 0 && (
                      <span className="text-slate-400 ml-1">
                        ({data.contributingDrugs.map(d => d.drugName).join(', ')})
                      </span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Show all / hide toggle */}
        {hiddenCount > 0 && (
          <button
            className="mt-1.5 px-2 py-1 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {showAll
              ? (t?.anatomy?.hideRoutine || '정상 장기 숨김')
              : `${t?.anatomy?.showAllOrgans || '모든 장기 보기'} (+${hiddenCount})`
            }
          </button>
        )}

        {/* No organs need monitoring */}
        {visibleOrgans.length === 0 && !showAll && (
          <p className="text-[10px] text-slate-400 px-2 py-2">
            {t?.anatomy?.noActionNeeded || '현재 수준에서 특별한 모니터링이 필요하지 않습니다'}
          </p>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrgan && organScores?.[selectedOrgan] && (
        <OrganDetailModal
          organ={selectedOrgan}
          data={organScores[selectedOrgan]}
          t={t}
          lang={lang}
          onClose={() => setSelectedOrgan(null)}
        />
      )}
    </>
  );
}
