import React, { useState, useRef, useEffect } from 'react';
import { getBurdenLevel } from './organBurdenAggregator';
import { ORGAN_LABELS, LEVEL_LABELS, LEVEL_COLORS } from './anatomyConstants';

export default function OrganTooltip({ organ, data, position, containerRef, contributions, t }) {
  const tooltipRef = useRef(null);
  const [adjusted, setAdjusted] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!tooltipRef.current || !containerRef.current) return;
    const tip = tooltipRef.current.getBoundingClientRect();
    let x = position.x;
    let y = position.y - tip.height - 8;

    if (x + tip.width > window.innerWidth - 8) x = window.innerWidth - tip.width - 8;
    if (x < 8) x = 8;
    if (y < 8) y = position.y + 16;
    if (y + tip.height > window.innerHeight - 8) y = window.innerHeight - tip.height - 8;

    setAdjusted({ x, y });
  }, [position, containerRef]);

  const level = getBurdenLevel(data.finalScore);
  const levelInfo = LEVEL_LABELS[level];
  const organLabel = ORGAN_LABELS[organ];

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none"
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 max-w-[300px] text-left">
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
          <span className="text-[12px] font-bold text-slate-800">{organLabel.ko} / {organLabel.en}</span>
          <div className="text-right">
            <span className="text-[12px] font-bold text-slate-700">
              {data.finalScore !== null ? `${data.finalScore} / 100` : '—'}
            </span>
            <span className={`ml-1.5 text-[10px] font-semibold ${LEVEL_COLORS[level]}`}>
              {levelInfo.dots} {levelInfo.en}
            </span>
          </div>
        </div>

        {/* Recommended action */}
        {levelInfo.action && (
          <div className="mb-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider mb-0.5">
              {t?.anatomy?.recommendedAction || '권장 조치'}
            </p>
            <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
              {levelInfo.action}
            </p>
          </div>
        )}

        {data.contributingDrugs.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t?.anatomy?.contributingDrugs || '관여 약물'}</p>
            {data.contributingDrugs.map((cd) => (
              <div key={cd.drugId} className="flex justify-between text-[11px] py-0.5">
                <span className="text-slate-700 font-medium truncate mr-2">{cd.drugName}</span>
                <span className="text-slate-500 shrink-0">
                  base: {cd.baseScore} → {cd.scaledScore}
                  {!cd.doseScalingApplied && <span className="text-slate-400 ml-1">{t?.anatomy?.noDose || '(용량 없음)'}</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {data.contributingDrugs.length === 0 && data.finalScore !== null && (
          <p className="text-[11px] text-slate-400 mb-2">{t?.anatomy?.singleDrug || '단일 약물'}</p>
        )}

        {data.keywords.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t?.anatomy?.triggeredEffects || '유발 효과'}</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {data.keywords.join(' · ')}
            </p>
          </div>
        )}

        {data.evidence && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t?.anatomy?.evidence || '근거'}</p>
            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
              {data.evidence}
            </p>
          </div>
        )}

        {/* Per-drug elimination contribution */}
        {contributions && contributions.length > 0 && (
          <div className="pt-2 mt-2 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              {t?.results?.perDrugContribution || 'Per-drug contribution'}
            </p>
            <div className="space-y-0.5">
              {contributions.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-medium text-slate-700 w-20 truncate shrink-0">{c.drugName}</span>
                  <span className="text-slate-400 font-mono">
                    {t?.results?.renalShort || 'renal'} <span className="text-slate-600 font-semibold">{c.scaledRenal}%</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400 font-mono">
                    {t?.results?.hepaticShort || 'hepatic'} <span className="text-slate-600 font-semibold">{c.scaledHepatic}%</span>
                  </span>
                  {c.doseScalingApplied && c.doseModifier !== 1.0 && (
                    <span className="text-[9px] font-medium px-1 rounded bg-blue-50 text-blue-600">
                      ×{c.doseModifier}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
