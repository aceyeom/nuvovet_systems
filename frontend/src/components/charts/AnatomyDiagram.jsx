import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getBurdenLevel, isMdr1SensitiveBreed } from './organBurdenAggregator';
import { useI18n } from '../../i18n';
import {
  ORGAN_LABELS,
  ANATOMY_IMAGE_CONFIG,
  HEAT_ORGANS,
  ORGAN_RENDER_ORDER,
  getSectionFill,
  getSectionStroke,
} from './anatomyConstants';
import { getOrganLoads, getRenalRisk, getHepaticRisk } from './anatomyEliminationCalc';
import OrganTooltip from './OrganTooltip';
import OrganChecklist from './OrganChecklist';
import EliminationRoutePanel from './EliminationRoutePanel';

export default function AnatomyDiagram({
  species,
  organScores,
  patientBreed,
  mdr1SensitiveDrugs,
  drugs = [],
  patientInfo,
  overallRisk,
}) {
  const [hoveredOrgan, setHoveredOrgan] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [imageFailed, setImageFailed] = useState(false);
  const containerRef = useRef(null);
  const { t, lang } = useI18n();
  const anatomyConfig = species === 'cat' ? ANATOMY_IMAGE_CONFIG.cat : ANATOMY_IMAGE_CONFIG.dog;

  const showMdr1 = Boolean(
    mdr1SensitiveDrugs &&
    mdr1SensitiveDrugs.length > 0 &&
    species === 'dog' &&
    isMdr1SensitiveBreed(patientBreed)
  );

  // Elimination pathway data
  const { renal, hepatic, contributions } = drugs.length > 0
    ? getOrganLoads(drugs, species)
    : { renal: 0, hepatic: 0, contributions: [] };

  const elevatedCreatinine = patientInfo?.flaggedLabs?.some(
    (lab) =>
      (lab.key?.toLowerCase().includes('creatinine') || lab.key?.toLowerCase().includes('bun')) &&
      lab.status === 'high',
  );

  const renalRisk = getRenalRisk(renal, elevatedCreatinine);
  const hepaticRisk = getHepaticRisk(hepatic);
  const isCritical = renalRisk.level === 'critical';
  const isContraindicated = overallRisk === 'contraindicated';

  const handleMouseEnter = useCallback((organ, e) => {
    setHoveredOrgan(organ);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredOrgan(null);
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [species]);

  if (!species) return null;

  const hasData = organScores && Object.values(organScores).some(o => o.finalScore !== null);

  return (
    <div ref={containerRef} className="select-none">
      {/* Header — reframed as monitoring priorities */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            {t.anatomy?.monitoringPriorities || '모니터링 권고'}
          </h3>
          <span className="text-[10px] text-slate-400">
            {species === 'dog' ? '🐕' : '🐈'} {species === 'dog' ? t.species.dog : t.species.cat}
          </span>
        </div>
        <p className="text-[9px] text-slate-400 mt-0.5">
          {t.anatomy?.monitoringSubtitle || '처방 약물의 장기별 모니터링 권고사항'}
        </p>
      </div>

      {/* SVG heatmap diagram */}
      <div className="relative bg-slate-50 rounded-lg border border-slate-100 p-2 mb-2">
        <svg
          className="w-full max-h-[220px] rounded-md bg-slate-100"
          viewBox={`0 0 ${anatomyConfig.width} ${anatomyConfig.height}`}
          role="img"
          aria-label={`${species} organ involvement diagram`}
        >
          <image
            href={anatomyConfig.src}
            x="0"
            y="0"
            width={anatomyConfig.width}
            height={anatomyConfig.height}
            preserveAspectRatio="xMidYMid meet"
            onError={() => setImageFailed(true)}
          />

          {/* Organ sections */}
          {ORGAN_RENDER_ORDER.map((organ) => {
            const section = anatomyConfig.sections[organ];
            if (!section) return null;

            const score = organScores?.[organ]?.finalScore ?? null;
            const hovered = hoveredOrgan === organ;
            const fill = getSectionFill(score);
            const stroke = getSectionStroke(score, hovered);
            const strokeWidth = hovered ? 2 : 1.3;

            const showRedOutline = isContraindicated && score != null && score > 60;
            const finalStroke = showRedOutline ? '#dc2626' : stroke;
            const finalStrokeWidth = showRedOutline ? 2.5 : strokeWidth;

            if (section.type === 'line') {
              return (
                <g key={`section-${organ}`}>
                  <path
                    d={section.d}
                    fill="none"
                    stroke={fill}
                    strokeWidth={section.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="organ-section"
                    opacity={0.7}
                  />
                  <path
                    d={section.d}
                    fill="none"
                    stroke={showRedOutline ? '#dc2626' : (hovered ? '#1e293b' : '#475569')}
                    strokeWidth={hovered ? 2 : 1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={score == null ? '6 4' : undefined}
                    opacity={0.6}
                    pointerEvents="none"
                  />
                  <path
                    d={section.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={section.hitWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="organ-region"
                    onMouseEnter={(e) => handleMouseEnter(organ, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  />
                </g>
              );
            }

            return (
              <g key={`section-${organ}`}>
                <path
                  d={section.d}
                  fill={fill}
                  stroke={finalStroke}
                  strokeWidth={finalStrokeWidth}
                  strokeLinejoin="round"
                  strokeDasharray={score == null ? '4 3' : undefined}
                  className="organ-section"
                />
                <path
                  d={section.d}
                  fill="transparent"
                  className="organ-region"
                  onMouseEnter={(e) => handleMouseEnter(organ, e)}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
              </g>
            );
          })}

          {/* MDR1 marker */}
          {showMdr1 && (
            <>
              <circle
                cx={anatomyConfig.mdr1.x * anatomyConfig.width}
                cy={anatomyConfig.mdr1.y * anatomyConfig.height}
                r={anatomyConfig.width * 0.055}
                className="mdr1-ring-svg"
              />
              <rect
                x={anatomyConfig.mdr1.x * anatomyConfig.width - anatomyConfig.width * 0.045}
                y={anatomyConfig.mdr1.y * anatomyConfig.height - anatomyConfig.height * 0.13}
                width={anatomyConfig.width * 0.09}
                height={anatomyConfig.height * 0.05}
                rx="3"
                fill="#f59e0b"
                opacity="0.92"
              />
              <text
                x={anatomyConfig.mdr1.x * anatomyConfig.width}
                y={anatomyConfig.mdr1.y * anatomyConfig.height - anatomyConfig.height * 0.095}
                textAnchor="middle"
                fill="white"
                fontSize="8"
                fontWeight="700"
              >
                MDR1
              </text>
            </>
          )}

          {/* Leader lines and labels */}
          {HEAT_ORGANS.map((organ) => {
            const anchor = anatomyConfig.labelAnchors[organ];
            if (!anchor) return null;
            const hovered = hoveredOrgan === organ;
            const organLabel = ORGAN_LABELS[organ];

            return (
              <g key={`label-${organ}`} pointerEvents="none">
                <line
                  x1={anchor.organCx}
                  y1={anchor.organCy}
                  x2={anchor.x}
                  y2={anchor.y}
                  stroke={hovered ? '#334155' : '#94a3b8'}
                  strokeWidth="1.6"
                  strokeDasharray="3 2"
                  opacity={hovered ? 0.9 : 0.65}
                />
                <circle
                  cx={anchor.organCx}
                  cy={anchor.organCy}
                  r="3"
                  fill={hovered ? '#334155' : '#94a3b8'}
                  opacity={hovered ? 0.9 : 0.65}
                />
                <text
                  x={anchor.x}
                  y={anchor.y}
                  textAnchor={anchor.x < anatomyConfig.width / 2 ? 'end' : 'start'}
                  fill={hovered ? '#0f172a' : '#475569'}
                  fontSize={hovered ? '14' : '12.5'}
                  fontWeight="700"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  stroke="rgba(255,255,255,0.92)"
                  strokeWidth="2.5"
                  paintOrder="stroke"
                  letterSpacing="0.2"
                >
                  {organLabel.ko}
                </text>
              </g>
            );
          })}
        </svg>

        {imageFailed && (
          <div className="mt-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
            {lang === 'ko'
              ? `해부학 이미지가 없습니다. ${anatomyConfig.src} 파일을 추가하세요.`
              : `Anatomy image is missing. Add ${anatomyConfig.src} to render the diagram.`}
          </div>
        )}

        {/* Empty state */}
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
            <p className="text-[11px] text-slate-400">{t.anatomy?.addDrugsPrompt || '약물을 추가하면 모니터링 권고가 표시됩니다'}</p>
          </div>
        )}

        {/* Compact spectrum legend */}
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-medium text-slate-400">
              {lang === 'ko' ? '낮음' : 'Low'}
            </span>
            <div
              className="h-2 flex-1 rounded-full border border-slate-200"
              style={{
                background: 'linear-gradient(90deg, #dbeafe 0%, #93c5fd 25%, #3b82f6 55%, #1d4ed8 78%, #1e3a5f 100%)',
              }}
            />
            <span className="shrink-0 text-[10px] font-medium text-slate-500">
              {lang === 'ko' ? '높음' : 'High'}
            </span>
          </div>
        </div>
      </div>

      {/* Clinical monitoring checklist */}
      <OrganChecklist
        organScores={organScores}
        showMdr1={showMdr1}
        hoveredOrgan={hoveredOrgan}
        onHover={handleMouseEnter}
        onMove={handleMouseMove}
        onLeave={handleMouseLeave}
        t={t}
        lang={lang}
      />

      {/* Elimination route panel */}
      {drugs.length > 0 && (
        <EliminationRoutePanel
          renal={renal}
          hepatic={hepatic}
          renalRisk={renalRisk}
          hepaticRisk={hepaticRisk}
          isCritical={isCritical}
          contributions={contributions}
          t={t}
        />
      )}

      {/* Tooltip */}
      {hoveredOrgan && organScores?.[hoveredOrgan] && (
        <OrganTooltip
          organ={hoveredOrgan}
          data={organScores[hoveredOrgan]}
          position={tooltipPos}
          containerRef={containerRef}
          contributions={contributions}
          t={t}
        />
      )}
    </div>
  );
}
