import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ORGAN_LABELS,
  ANATOMY_IMAGE_CONFIG,
  ORGAN_RENDER_ORDER,
  getSectionFill,
  getSectionStroke,
  HEAT_ORGANS,
} from './anatomyConstants';
import { getBurdenLevel } from './organBurdenAggregator';
import { getOrganLoads } from './anatomyEliminationCalc';
import { useI18n } from '../../i18n';

export default function OrganIslandOverlay({
  species,
  organScores,
  drugs,
  selectedOrgan,
  onSelectOrgan,
  onClose,
  showMdr1,
}) {
  const { t, lang } = useI18n();
  const anatomyConfig = species === 'cat' ? ANATOMY_IMAGE_CONFIG.cat : ANATOMY_IMAGE_CONFIG.dog;
  const [expandedOrgan, setExpandedOrgan] = useState(selectedOrgan);

  const { contributions } = (drugs && drugs.length > 0)
    ? getOrganLoads(drugs, species)
    : { contributions: [] };

  const handleOrganClick = (organ) => {
    setExpandedOrgan(expandedOrgan === organ ? null : organ);
    if (onSelectOrgan) onSelectOrgan(organ);
  };

  const sortedOrgans = [...ORGAN_RENDER_ORDER].sort((a, b) => {
    const aCount = organScores?.[a]?.contributingDrugs?.length || 0;
    const bCount = organScores?.[b]?.contributingDrugs?.length || 0;
    return bCount - aCount;
  });

  const levelDot = (level) => {
    const colors = {
      nodata: '#e2e8f0', none: '#cbd5e1', low: '#93c5fd',
      moderate: '#3b82f6', high: '#1d4ed8', critical: '#1e3a5f',
    };
    return colors[level] || '#e2e8f0';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div>
            <h3 className="text-[13px] font-bold text-slate-800">
              {t.anatomy?.organInvolvement || 'Organ Involvement'}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {species === 'dog' ? '🐕' : '🐈'}{' '}
              {lang === 'ko'
                ? '약물이 대사되는 장기를 표시합니다'
                : 'Shows which organs are processing your prescribed drugs'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Enlarged outline */}
        <div className="px-5 pt-4 pb-2">
          <div className="relative bg-slate-50 rounded-xl border border-slate-100 p-3">
            <svg
              className="w-full rounded-lg"
              viewBox={`0 0 ${anatomyConfig.width} ${anatomyConfig.height}`}
              role="img"
              aria-label={`${species} organ involvement diagram — expanded`}
            >
              <image
                href={anatomyConfig.src}
                x="0" y="0"
                width={anatomyConfig.width} height={anatomyConfig.height}
                preserveAspectRatio="xMidYMid meet"
              />

              {ORGAN_RENDER_ORDER.map((organ) => {
                const section = anatomyConfig.sections[organ];
                if (!section) return null;
                const score = organScores?.[organ]?.finalScore ?? null;
                const isSelected = expandedOrgan === organ;
                const fill = getSectionFill(score);
                const stroke = isSelected ? '#1e40af' : getSectionStroke(score, false);
                const strokeWidth = isSelected ? 2.5 : 1.3;

                if (section.type === 'line') {
                  return (
                    <g key={`island-${organ}`}>
                      <path d={section.d} fill="none" stroke={fill}
                        strokeWidth={section.strokeWidth} strokeLinecap="round" opacity={0.7} />
                      <path d={section.d} fill="none"
                        stroke={isSelected ? '#1e40af' : '#475569'}
                        strokeWidth={isSelected ? 2.5 : 1.2}
                        strokeLinecap="round" strokeDasharray={score == null ? '6 4' : undefined}
                        opacity={0.6} pointerEvents="none" />
                      <path d={section.d} fill="none" stroke="transparent"
                        strokeWidth={section.hitWidth} strokeLinecap="round"
                        className="cursor-pointer" onClick={() => handleOrganClick(organ)} />
                    </g>
                  );
                }

                return (
                  <g key={`island-${organ}`}>
                    <path d={section.d} fill={fill} stroke={stroke}
                      strokeWidth={strokeWidth} strokeLinejoin="round"
                      strokeDasharray={score == null ? '4 3' : undefined} />
                    <path d={section.d} fill="transparent"
                      className="cursor-pointer" onClick={() => handleOrganClick(organ)} />
                  </g>
                );
              })}

              {/* Labels */}
              {HEAT_ORGANS.map((organ) => {
                const anchor = anatomyConfig.labelAnchors[organ];
                if (!anchor) return null;
                const isSelected = expandedOrgan === organ;
                const organLabel = ORGAN_LABELS[organ];
                const drugCount = organScores?.[organ]?.contributingDrugs?.length || 0;

                return (
                  <g key={`label-${organ}`} pointerEvents="none">
                    <line x1={anchor.organCx} y1={anchor.organCy} x2={anchor.x} y2={anchor.y}
                      stroke={isSelected ? '#1e40af' : '#94a3b8'} strokeWidth="1.6"
                      strokeDasharray="3 2" opacity={isSelected ? 0.9 : 0.65} />
                    <circle cx={anchor.organCx} cy={anchor.organCy} r="3"
                      fill={isSelected ? '#1e40af' : '#94a3b8'} opacity={isSelected ? 0.9 : 0.65} />
                    <text x={anchor.x} y={anchor.y}
                      textAnchor={anchor.x < anatomyConfig.width / 2 ? 'end' : 'start'}
                      fill={isSelected ? '#1e40af' : '#475569'}
                      fontSize={isSelected ? '14' : '12.5'} fontWeight="700"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" paintOrder="stroke"
                      letterSpacing="0.2">
                      {organLabel.ko}
                    </text>
                    {drugCount > 0 && (
                      <text
                        x={anchor.x + (anchor.x < anatomyConfig.width / 2 ? -2 : 2)}
                        y={anchor.y + 14}
                        textAnchor={anchor.x < anatomyConfig.width / 2 ? 'end' : 'start'}
                        fill="#64748b" fontSize="10" fontWeight="600"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        stroke="rgba(255,255,255,0.9)" strokeWidth="2" paintOrder="stroke">
                        x{drugCount} {lang === 'ko' ? '약물' : drugCount === 1 ? 'drug' : 'drugs'}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[10px] font-medium text-slate-400">
                  {lang === 'ko' ? '낮음' : 'Low'}
                </span>
                <div className="h-2 flex-1 rounded-full border border-slate-200"
                  style={{ background: 'linear-gradient(90deg, #dbeafe 0%, #93c5fd 25%, #3b82f6 55%, #1d4ed8 78%, #1e3a5f 100%)' }} />
                <span className="shrink-0 text-[10px] font-medium text-slate-500">
                  {lang === 'ko' ? '높음' : 'High'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Organ details below outline */}
        <div className="px-5 pb-5 pt-2 space-y-1">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
            {lang === 'ko' ? '장기별 관여 약물' : 'Drugs per organ'}
          </p>

          {sortedOrgans.map((organ) => {
            const data = organScores?.[organ] || { finalScore: null, contributingDrugs: [], keywords: [] };
            const drugCount = data.contributingDrugs?.length || 0;
            if (drugCount === 0) return null;

            const isExpanded = expandedOrgan === organ;
            const organLabel = ORGAN_LABELS[organ];
            const level = getBurdenLevel(data.finalScore);

            const elimPct = organ === 'kidney'
              ? contributions.reduce((sum, c) => sum + c.scaledRenal, 0)
              : organ === 'liver'
              ? contributions.reduce((sum, c) => sum + c.scaledHepatic, 0)
              : null;

            return (
              <div key={organ}
                className={`rounded-lg border transition-colors ${
                  isExpanded ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}>
                <button
                  onClick={() => handleOrganClick(organ)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: levelDot(level) }} />
                    <span className="text-[12px] font-semibold text-slate-700">
                      {organLabel.ko} / {organLabel.en}
                    </span>
                    {organ === 'brain' && showMdr1 && (
                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">MDR1</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">
                      x{drugCount} {lang === 'ko' ? '약물' : drugCount === 1 ? 'drug' : 'drugs'}
                    </span>
                    {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-0.5 space-y-2 border-t border-slate-100">
                    <div className="space-y-1">
                      {data.contributingDrugs.map((cd) => (
                        <div key={cd.drugId} className="flex items-center justify-between py-1 px-2 bg-white rounded-md border border-slate-100">
                          <span className="text-[11px] font-medium text-slate-700">{cd.drugName}</span>
                        </div>
                      ))}
                    </div>

                    {elimPct !== null && (
                      <div className="px-2 py-1.5 bg-slate-50 rounded-md border border-slate-100">
                        <p className="text-[10px] text-slate-500">
                          {organ === 'kidney'
                            ? (lang === 'ko' ? '신장 배설 비율' : 'Renal elimination')
                            : (lang === 'ko' ? '간 배설 비율' : 'Hepatic elimination')
                          }: <span className="font-semibold text-slate-700">{elimPct}%</span>
                          <span className="text-slate-400 ml-1">
                            {lang === 'ko' ? '(처방 전체 누적)' : '(cumulative across prescription)'}
                          </span>
                        </p>
                      </div>
                    )}

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

          {sortedOrgans.every(o => (organScores?.[o]?.contributingDrugs?.length || 0) === 0) && (
            <p className="text-[11px] text-slate-400 text-center py-3">
              {lang === 'ko' ? '약물을 추가하면 장기별 관여도가 표시됩니다' : 'Add drugs to see organ involvement'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
