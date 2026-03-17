import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Activity } from 'lucide-react';
import { getBurdenLevel, isMdr1SensitiveBreed } from './organBurdenAggregator';
import { useI18n } from '../../i18n';

// ── Organ display config ───────────────────────────────────────────
const ORGAN_LABELS = {
  brain:  { en: 'Brain',  ko: '뇌' },
  heart:  { en: 'Heart',  ko: '심장' },
  liver:  { en: 'Liver',  ko: '간' },
  kidney: { en: 'Kidney', ko: '신장' },
  blood:  { en: 'Blood',  ko: '혈액' },
};

const LEVEL_LABELS = {
  nodata:   { en: 'No Data',        ko: '데이터 없음', dots: '○○○○○' },
  none:     { en: 'Routine',         ko: '정상',       dots: '○○○○○' },
  low:      { en: 'Routine',         ko: '정상',       dots: '●○○○○' },
  moderate: { en: 'Monitor',         ko: '관찰',       dots: '●●○○○' },
  high:     { en: 'Monitor Closely', ko: '주의 관찰',  dots: '●●●●○' },
  critical: { en: 'Monitor Closely', ko: '주의 관찰',  dots: '●●●●●' },
};

// Blue intensity scale — lightest to deepest navy
const LEVEL_COLORS = {
  nodata:   'text-slate-400',
  none:     'text-slate-500',
  low:      'text-blue-400',
  moderate: 'text-blue-500',
  high:     'text-blue-700',
  critical: 'text-blue-900',
};

// ── SVG anatomy overlays (pixel coordinates in species canvas) ─────
// Dog: viewBox 485×385 — organ shapes positioned to match the traced silhouette
// Cat: viewBox 379×199 — smaller proportional shapes for feline anatomy
//
// Brain: rounded brain shape inside the skull/head region
// Heart: slightly left of center in the upper chest cavity
// Liver: large region in the mid-right abdominal cavity, behind the ribcage
// Kidney: two smaller bean shapes in the mid-to-lower back region
// Blood: branching vascular line from the brain, over the organs, into all four legs

const ANATOMY_IMAGE_CONFIG = {
  dog: {
    src: '/anatomy/dog-traced.svg',
    alt: 'Dog traced anatomy silhouette',
    width: 485,
    height: 385,
    mdr1: { x: 0.185, y: 0.24 },
    sections: {
      brain:  { type: 'path', d: 'M 82 84 C 86 74, 96 70, 106 73 C 114 76, 118 84, 116 93 C 114 100, 107 105, 99 106 C 93 106, 88 103, 85 98 C 81 96, 79 91, 82 84 Z' },
      heart:  { type: 'path', d: 'M 140 170 C 146 161, 158 160, 164 168 C 168 173, 168 179, 165 185 C 161 192, 155 196, 148 196 C 142 196, 136 192, 133 185 C 131 179, 133 173, 140 170 Z' },
      liver:  { type: 'path', d: 'M 190 178 C 206 168, 232 167, 248 175 C 255 179, 257 188, 253 196 C 248 205, 236 210, 222 211 C 209 212, 197 207, 190 200 C 184 194, 183 185, 190 178 Z' },
      kidney: { type: 'path', d: 'M 271 175 C 278 169, 288 168, 296 172 C 303 175, 308 182, 308 190 C 308 198, 303 204, 296 208 C 288 212, 278 211, 271 207 C 264 202, 261 195, 262 188 C 263 182, 266 178, 271 175 Z' },
      blood:  { type: 'line', d: 'M 101 92 C 115 95, 126 104, 134 118 C 151 143, 184 152, 224 154 C 265 156, 307 154, 347 157 C 369 160, 388 167, 403 177', strokeWidth: 10, hitWidth: 28 },
    },
    // Label anchor positions — outside the body silhouette, connected by leader lines
    labelAnchors: {
      brain:  { x: 50,  y: 52,  organCx: 98,  organCy: 88 },
      heart:  { x: 105, y: 230, organCx: 148, organCy: 180 },
      liver:  { x: 280, y: 230, organCx: 222, organCy: 192 },
      kidney: { x: 340, y: 160, organCx: 286, organCy: 190 },
      blood:  { x: 390, y: 218, organCx: 346, organCy: 160 },
    },
  },
  cat: {
    src: '/anatomy/cat-traced.svg',
    alt: 'Cat traced anatomy silhouette',
    width: 379,
    height: 199,
    mdr1: { x: 0.18, y: 0.245 },
    sections: {
      brain:  { type: 'path', d: 'M 59 44 C 62 37, 70 34, 78 36 C 85 38, 89 44, 87 51 C 85 57, 80 61, 74 62 C 70 62, 66 60, 63 56 C 60 55, 57 50, 59 44 Z' },
      heart:  { type: 'path', d: 'M 112 96 C 116 89, 126 88, 131 95 C 134 99, 134 105, 132 110 C 129 116, 124 119, 118 120 C 113 120, 108 116, 106 110 C 104 105, 106 99, 112 96 Z' },
      liver:  { type: 'path', d: 'M 149 100 C 163 93, 183 93, 196 99 C 201 102, 203 108, 200 114 C 196 121, 185 125, 174 126 C 163 126, 153 122, 148 116 C 143 111, 143 105, 149 100 Z' },
      kidney: { type: 'path', d: 'M 213 98 C 219 93, 227 92, 234 95 C 240 98, 244 104, 244 110 C 244 117, 240 122, 234 125 C 228 128, 219 127, 213 123 C 208 119, 205 113, 206 107 C 207 102, 209 99, 213 98 Z' },
      blood:  { type: 'line', d: 'M 74 49 C 85 53, 94 60, 101 70 C 113 84, 138 90, 168 92 C 198 94, 226 95, 253 99 C 276 102, 295 108, 312 120', strokeWidth: 7, hitWidth: 20 },
    },
    labelAnchors: {
      brain:  { x: 40,  y: 25,  organCx: 73,  organCy: 48 },
      heart:  { x: 82,  y: 140, organCx: 118, organCy: 106 },
      liver:  { x: 210, y: 142, organCx: 174, organCy: 112 },
      kidney: { x: 270, y: 88,  organCx: 228, organCy: 110 },
      blood:  { x: 296, y: 134, organCx: 246, organCy: 102 },
    },
  },
};

const HEAT_ORGANS = ['brain', 'heart', 'liver', 'kidney', 'blood'];
const ORGAN_RENDER_ORDER = ['brain', 'heart', 'liver', 'kidney', 'blood'];

// ── Blue intensity color scale ────────────────────────────────────
function getSeverityHex(score) {
  const level = getBurdenLevel(score);
  if (level === 'nodata') return '#cbd5e1';   // slate-200
  if (level === 'none') return '#94a3b8';      // slate-400
  if (level === 'low') return '#93c5fd';       // blue-300
  if (level === 'moderate') return '#3b82f6';  // blue-500
  if (level === 'high') return '#1d4ed8';      // blue-700
  return '#1e3a5f';                            // deep navy
}

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  const raw = hex.replace('#', '');
  const full = raw.length === 3
    ? raw.split('').map((c) => c + c).join('')
    : raw;

  if (full.length !== 6) {
    return `rgba(148, 163, 184, ${alpha})`;
  }

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getSectionFill(score) {
  if (score == null) return 'rgba(148, 163, 184, 0.16)';
  const level = getBurdenLevel(score);
  const alpha = level === 'none' ? 0.28 : level === 'low' ? 0.40 : level === 'moderate' ? 0.52 : level === 'high' ? 0.60 : 0.68;
  return hexToRgba(getSeverityHex(score), alpha);
}

function getSectionStroke(score, hovered) {
  if (hovered) return '#1e293b';
  if (score == null) return '#94a3b8';
  return '#475569';
}

// ── Organ load calculation (from OrganLoadIndicator) ─────────────
function getOrganLoads(drugs, species) {
  let renalLoad = 0;
  let hepaticLoad = 0;
  const contributions = [];

  drugs.forEach((drug) => {
    const renal = drug.renalElimination ?? 0;
    const hepatic =
      drug.hepaticElimination != null
        ? drug.hepaticElimination
        : drug.pk?.primaryElimination === 'hepatic'
        ? Math.max(1 - renal, 0)
        : drug.pk?.primaryElimination === 'mixed'
        ? Math.max((1 - renal) * 0.5, 0)
        : 0;

    const prescribedDose = drug.dosePerKg ?? 0;
    const standardDose = drug.defaultDose?.[species] ?? null;
    let doseModifier = 1.0;
    let doseScalingApplied = false;

    if (prescribedDose > 0 && standardDose != null && standardDose > 0) {
      doseModifier = Math.min(Math.max(prescribedDose / standardDose, 0.5), 2.0);
      doseScalingApplied = true;
    }

    const scaledRenal = renal * doseModifier;
    const scaledHepatic = hepatic * doseModifier;

    renalLoad += scaledRenal;
    hepaticLoad += scaledHepatic;

    contributions.push({
      drugId: drug.id,
      drugName: drug.name,
      scaledRenal: Math.round(scaledRenal * 100),
      scaledHepatic: Math.round(scaledHepatic * 100),
      doseModifier: Math.round(doseModifier * 100) / 100,
      doseScalingApplied,
    });
  });

  return {
    renal: Math.round(renalLoad * 100),
    hepatic: Math.round(hepaticLoad * 100),
    contributions,
  };
}

function getRenalRisk(renalPct, elevatedCreatinine) {
  if (elevatedCreatinine && renalPct >= 40)
    return { level: 'critical', label: 'Critical', bar: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' };
  if (renalPct >= 120)
    return { level: 'high', label: 'High', bar: 'bg-red-400', text: 'text-red-600', bg: 'bg-red-50 border-red-200' };
  if (renalPct >= 70)
    return { level: 'moderate', label: 'Moderate', bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  return { level: 'low', label: 'Low', bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-white border-slate-200' };
}

function getHepaticRisk(hepaticPct) {
  if (hepaticPct >= 180)
    return { level: 'high', label: 'High', bar: 'bg-amber-500', text: 'text-amber-700' };
  if (hepaticPct >= 100)
    return { level: 'moderate', label: 'Moderate', bar: 'bg-yellow-400', text: 'text-amber-600' };
  return { level: 'low', label: 'Low', bar: 'bg-emerald-500', text: 'text-emerald-700' };
}

// ── Tooltip Component (now includes per-drug contribution) ────────
function OrganTooltip({ organ, data, position, containerRef, contributions, t }) {
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

        {/* Per-drug elimination contribution (moved from main card) */}
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

// ── Elimination bar (compact) ──────────────────────────────────────
function EliminationBar({ label, pct, barColor, textColor, riskLabel }) {
  const visualWidth = Math.min((pct / 200) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-medium text-slate-600">{label}</span>
        <span className={`text-[11px] font-semibold font-mono ${textColor}`}>
          {pct}% <span className="font-normal text-slate-400">({riskLabel})</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${visualWidth}%` }}
        />
      </div>
    </div>
  );
}

// ── Main AnatomyDiagram Component ──────────────────────────────────
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

  // Check if overall DUR risk is contraindicated (only case where red outline is allowed)
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

  // Helper: get organ score fill color for the dot in the score table
  function getOrganDotColor(score) {
    if (score == null) return '#e2e8f0';
    const level = getBurdenLevel(score);
    if (level === 'none') return '#cbd5e1';
    if (level === 'low') return '#93c5fd';      // blue-300
    if (level === 'moderate') return '#3b82f6';  // blue-500
    if (level === 'high') return '#1d4ed8';      // blue-700
    return '#1e3a5f';                            // deep navy
  }

  return (
    <div ref={containerRef} className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          {t.anatomy?.organInvolvement || '장기 관여'}
        </h3>
        <span className="text-[10px] text-slate-400">
          {species === 'dog' ? '🐕' : '🐈'} {species === 'dog' ? t.species.dog : t.species.cat}
        </span>
      </div>

      {/* Image + heatmap diagram */}
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

          {/* Organ sections: distinct region fills with clear boundaries */}
          {ORGAN_RENDER_ORDER.map((organ) => {
            const section = anatomyConfig.sections[organ];
            if (!section) return null;

            const score = organScores?.[organ]?.finalScore ?? null;
            const hovered = hoveredOrgan === organ;
            const fill = getSectionFill(score);
            const stroke = getSectionStroke(score, hovered);
            const strokeWidth = hovered ? 2 : 1.3;

            // Red outline ONLY if overall DUR risk is "contraindicated" and this organ has a high score
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

          {/* Leader lines and labels — full organ names outside the silhouette */}
          {HEAT_ORGANS.map((organ) => {
            const anchor = anatomyConfig.labelAnchors[organ];
            if (!anchor) return null;
            const hovered = hoveredOrgan === organ;
            const organLabel = ORGAN_LABELS[organ];

            return (
              <g key={`label-${organ}`} pointerEvents="none">
                {/* Leader line from organ to label */}
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
                {/* Dot at organ end */}
                <circle
                  cx={anchor.organCx}
                  cy={anchor.organCy}
                  r="3"
                  fill={hovered ? '#334155' : '#94a3b8'}
                  opacity={hovered ? 0.9 : 0.65}
                />
                {/* Full label text */}
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
            <p className="text-[11px] text-slate-400">{t.anatomy?.addDrugsPrompt || '약물을 추가하면 장기 관여도가 표시됩니다'}</p>
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

      {/* Compact organ score table */}
      <div className="space-y-0.5 mb-3">
        {['brain', 'heart', 'liver', 'kidney', 'blood'].map((organ) => {
          const data = organScores?.[organ] || { finalScore: null, contributingDrugs: [] };
          const level = getBurdenLevel(data.finalScore);
          const levelInfo = LEVEL_LABELS[level];
          const organLabel = ORGAN_LABELS[organ];

          return (
            <div
              key={organ}
              className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 transition-colors cursor-default"
              onMouseEnter={(e) => handleMouseEnter(organ, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getOrganDotColor(data.finalScore) }}
                />
                <span className="text-[11px] text-slate-600">{organLabel.ko} / {organLabel.en}</span>
                {organ === 'brain' && showMdr1 && (
                  <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">MDR1</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold ${LEVEL_COLORS[level]}`}>
                  {data.finalScore !== null ? data.finalScore : '—'}
                </span>
                <span className={`text-[9px] ${LEVEL_COLORS[level]}`}>
                  {levelInfo.en}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Primary Elimination Route (renamed from Cumulative Organ Load) ─── */}
      {drugs.length > 0 && (
        <div className={`rounded-lg border overflow-hidden ${isCritical ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
          <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Activity size={12} className={renalRisk.text} />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.results.primaryEliminationRoute || 'Primary Elimination Route'}
              </span>
            </div>
            {isCritical && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200">
                <AlertTriangle size={8} />
                {t.results.compromisedKidney}
              </span>
            )}
          </div>

          {/* Critical banner */}
          {isCritical && (
            <div className="mx-3 my-2 px-2 py-1.5 bg-red-100 border border-red-200 rounded-lg flex items-start gap-1.5">
              <AlertTriangle size={11} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-700 leading-relaxed">
                {t.results.organLoadCriticalPrefix} <strong>{renal}%</strong> {t.results.organLoadCriticalBody}
              </p>
            </div>
          )}

          {/* Renal + Hepatic bars */}
          <div className="px-3 py-2 space-y-2">
            <EliminationBar
              label={t.results.renalEliminationBurden}
              pct={renal}
              barColor={renalRisk.bar}
              textColor={renalRisk.text}
              riskLabel={t.results.riskLevel?.[renalRisk.level] || renalRisk.label}
            />
            <EliminationBar
              label={t.results.hepaticEliminationBurden}
              pct={hepatic}
              barColor={hepaticRisk.bar}
              textColor={hepaticRisk.text}
              riskLabel={t.results.riskLevel?.[hepaticRisk.level] || hepaticRisk.label}
            />
          </div>

          {/* Per-drug contribution REMOVED from main card — now in tooltip only */}
          {contributions.length > 0 && (
            <div className="px-3 pb-2 border-t border-slate-100 pt-2">
              <p className="text-[9px] text-slate-400 leading-relaxed">
                {t.results.organLoadFootnote}
              </p>
            </div>
          )}
        </div>
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
