import React, { useState, useRef, useEffect } from 'react';
import { getBurdenLevel } from './organBurdenAggregator';
import { ORGAN_LABELS } from './anatomyConstants';

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

  const organLabel = ORGAN_LABELS[organ];
  const drugCount = data.contributingDrugs?.length || 0;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none"
      style={{ left: adjusted.x, top: adjusted.y }}
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 max-w-[260px] text-left">
        {/* Organ name + drug count */}
        <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-100">
          <span className="text-[12px] font-bold text-slate-800">{organLabel.ko} / {organLabel.en}</span>
          {drugCount > 0 && (
            <span className="text-[10px] font-semibold text-slate-500">
              ×{drugCount} {drugCount === 1 ? 'drug' : 'drugs'}
            </span>
          )}
        </div>

        {/* Drug names */}
        {drugCount > 0 && (
          <div className="mb-1.5 space-y-0.5">
            {data.contributingDrugs.map((cd) => (
              <div key={cd.drugId} className="text-[11px] font-medium text-slate-700 py-0.5 px-1">
                {cd.drugName}
              </div>
            ))}
          </div>
        )}

        {drugCount === 0 && (
          <p className="text-[11px] text-slate-400 mb-1.5">
            {t?.anatomy?.noInvolvement || '관여 약물 없음'}
          </p>
        )}

        {/* Keywords */}
        {data.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {data.keywords.map((kw, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Hint to click */}
        {drugCount > 0 && (
          <p className="text-[9px] text-slate-400 text-center pt-1 border-t border-slate-100">
            {t?.anatomy?.clickToExpand || '클릭하여 자세히 보기'}
          </p>
        )}
      </div>
    </div>
  );
}
