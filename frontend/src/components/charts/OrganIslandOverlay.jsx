import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
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

const PRIMARY_THRESHOLD = 40;
const HIDE_THRESHOLD = 10;

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
  const [showElimInfo, setShowElimInfo] = useState(null);

  const { renal: renalTotal, hepatic: hepaticTotal, contributions } = (drugs && drugs.length > 0)
    ? getOrganLoads(drugs, species)
    : { renal: 0, hepatic: 0, contributions: [] };

  const handleOrganClick = (organ) => {
    setExpandedOrgan(expandedOrgan === organ ? null : organ);
    if (onSelectOrgan) onSelectOrgan(organ);
  };

  const getElimPct = (organ) => organ === 'kidney' ? renalTotal : organ === 'liver' ? hepaticTotal : null;
  const getElimCaution = (organ) => {
    const pct = getElimPct(organ);
    if (pct === null) return null;
    if (pct >= 200) return 'high';
    if (pct >= 120) return 'moderate';
    return null;
  };

  const elimExplanation = lang === 'ko'
    ? '이 수치는 처방된 약물들의 배설 부하량 합산입니다. 100%가 한계치가 아니며, 높을수록 해당 장기에 더 많은 부하가 걸림을 의미합니다.'
    : 'This is the cumulative elimination load from all prescribed drugs. 100% is not a limit — higher values mean greater processing burden on this organ.';

  // Classify organs
  const allOrgans = ORGAN_RENDER_ORDER.map((organ) => {
    const data = organScores?.[organ] || { finalScore: null, contributingDrugs: [], keywords: [] };
    const score = data.finalScore ?? 0;
    const drugCount = data.contributingDrugs?.length || 0;
    const level = getBurdenLevel(data.finalScore);
    const isPrimary = score >= PRIMARY_THRESHOLD;
    return { organ, data, level, drugCount, score, isPrimary };
  });

  const primary = allOrgans.filter(o => o.isPrimary && o.drugCount > 0).sort((a, b) => b.score - a.score);
  const minor = allOrgans.filter(o => !o.isPrimary && o.score >= HIDE_THRESHOLD && o.drugCount > 0).sort((a, b) => b.score - a.score);

  const levelDot = (level) => ({
    nodata: '#e2e8f0', none: '#cbd5e1', low: '#93c5fd',
    moderate: '#3b82f6', high: '#1d4ed8', critical: '#1e3a5f',
  }[level] || '#e2e8f0');

  const renderOrganRow = ({ organ, data, level, drugCount }, isMinor) => {
    const organLabel = ORGAN_LABELS[organ];
    const isExpanded = expandedOrgan === organ;
    const elimPct = getElimPct(organ);
    const cautionLevel = getElimCaution(organ);

    return (
      <div key={organ}
        className={`rounded-lg border transition-colors ${
          isExpanded ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-white hover:bg-slate-50'
        }`}>
        <button onClick={() => handleOrganClick(organ)}
          className="w-full flex items-center justify-between px-3 py-2 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: levelDot(level) }} />
            <span className={`text-[12px] font-semibold ${isMinor ? 'text-slate-400' : 'text-slate-700'}`}>
              {organLabel.ko} / {organLabel.en}
            </span>
            {organ === 'brain' && showMdr1 && (
              <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">MDR1</span>
            )}
            {elimPct !== null && (
              <span className="relative flex items-center gap-0.5">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  cautionLevel === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                  cautionLevel === 'moderate' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                  'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {organ === 'kidney' ? (lang === 'ko' ? '신장' : 'Renal') : (lang === 'ko' ? '간' : 'Hepatic')} {elimPct}%
                </span>
                {cautionLevel && <AlertTriangle size={10} className={cautionLevel === 'high' ? 'text-red-500' : 'text-amber-500'} />}
                <button className="text-slate-400 hover:text-slate-600 p-0.5"
                  onClick={(e) => { e.stopPropagation(); setShowElimInfo(showElimInfo === organ ? null : organ); }}>
                  <Info size={10} />
                </button>
                {showElimInfo === organ && (
                  <div className="absolute z-40 left-0 top-6 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-2.5 text-[10px] text-slate-600 leading-relaxed"
                    onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setShowElimInfo(null)} className="absolute top-1 right-1.5 text-slate-400 hover:text-slate-600 text-xs">&times;</button>
                    {elimExplanation}
                  </div>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-medium ${isMinor ? 'text-slate-400' : 'text-slate-500'}`}>
              x{drugCount}
            </span>
            {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
          </div>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 pt-0.5 space-y-2 border-t border-slate-100">
            <div className="space-y-1">
              {data.contributingDrugs.map((cd) => (
                <div key={cd.drugId} className="flex items-center py-1 px-2 bg-white rounded-md border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-700">{cd.drugName}</span>
                </div>
              ))}
            </div>

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}>

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
            <svg className="w-full rounded-lg"
              viewBox={`0 0 ${anatomyConfig.width} ${anatomyConfig.height}`}
              role="img" aria-label={`${species} organ involvement diagram — expanded`}>
              <image href={anatomyConfig.src} x="0" y="0"
                width={anatomyConfig.width} height={anatomyConfig.height}
                preserveAspectRatio="xMidYMid meet" />

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

            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[10px] font-medium text-slate-400">{lang === 'ko' ? '낮음' : 'Low'}</span>
                <div className="h-2 flex-1 rounded-full border border-slate-200"
                  style={{ background: 'linear-gradient(90deg, #dbeafe 0%, #93c5fd 25%, #3b82f6 55%, #1d4ed8 78%, #1e3a5f 100%)' }} />
                <span className="shrink-0 text-[10px] font-medium text-slate-500">{lang === 'ko' ? '높음' : 'High'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Organ details below outline */}
        <div className="px-5 pb-5 pt-2 space-y-1">
          {primary.length > 0 && (
            <>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                {lang === 'ko' ? '주요 관여 장기' : 'Primary involvement'}
              </p>
              {primary.map((o) => renderOrganRow(o, false))}
            </>
          )}

          {minor.length > 0 && (
            <>
              <p className="text-[8px] font-semibold text-slate-300 uppercase tracking-wider mt-2 mb-1 px-1">
                {lang === 'ko' ? '경미한 관여' : 'Minor involvement'}
              </p>
              {minor.map((o) => renderOrganRow(o, true))}
            </>
          )}

          {primary.length === 0 && minor.length === 0 && (
            <p className="text-[11px] text-slate-400 text-center py-3">
              {lang === 'ko' ? '약물을 추가하면 장기별 관여도가 표시됩니다' : 'Add drugs to see organ involvement'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
