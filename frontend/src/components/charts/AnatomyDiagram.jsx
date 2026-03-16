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
  nodata:   { en: 'No Data',  ko: '데이터 없음', dots: '○○○○○' },
  none:     { en: 'Minimal',  ko: '최소',       dots: '○○○○○' },
  low:      { en: 'Low',      ko: '낮음',       dots: '●○○○○' },
  moderate: { en: 'Moderate', ko: '보통',       dots: '●●○○○' },
  high:     { en: 'High',     ko: '높음',       dots: '●●●●○' },
  critical: { en: 'Critical', ko: '위험',       dots: '●●●●●' },
};

const LEVEL_COLORS = {
  nodata:   'text-slate-400',
  none:     'text-slate-500',
  low:      'text-amber-500',
  moderate: 'text-amber-600',
  high:     'text-red-500',
  critical: 'text-red-700',
};

const LEGEND_ITEMS = [
  { label: '0–20',   className: 'bg-slate-200' },
  { label: '21–40',  className: 'bg-amber-200' },
  { label: '41–60',  className: 'bg-amber-500' },
  { label: '61–85',  className: 'bg-red-500' },
  { label: '86–100', className: 'bg-red-700' },
];

// ── SVG anatomy overlays (pixel coordinates in species canvas) ─────
const ANATOMY_IMAGE_CONFIG = {
  dog: {
    src: '/anatomy/dog-traced.svg',
    alt: 'Dog traced anatomy silhouette',
    width: 485,
    height: 385,
    mdr1: { x: 0.185, y: 0.24 },
    sections: {
      brain:  { type: 'path', d: 'M 74 89 C 78 77, 92 72, 106 75 C 118 78, 124 89, 120 100 C 117 109, 108 114, 98 114 C 92 115, 88 112, 85 107 C 79 106, 72 99, 74 89 Z' },
      heart:  { type: 'path', d: 'M 138 166 C 145 156, 161 155, 168 165 C 171 170, 172 176, 170 182 C 167 190, 159 196, 150 197 C 141 197, 133 191, 130 182 C 128 176, 130 170, 138 166 Z' },
      liver:  { type: 'path', d: 'M 184 176 C 203 164, 235 164, 252 173 C 259 177, 261 186, 257 194 C 252 204, 238 211, 222 212 C 207 214, 193 209, 184 201 C 177 194, 176 184, 184 176 Z' },
      kidney: { type: 'path', d: 'M 267 171 C 276 164, 289 163, 300 167 C 309 170, 315 178, 315 187 C 315 197, 310 205, 301 210 C 291 215, 278 214, 269 209 C 260 203, 255 194, 256 185 C 257 179, 261 174, 267 171 Z' },
      blood:  { type: 'line', d: 'M 112 175 C 158 169, 206 169, 252 175 C 291 180, 325 190, 356 206', strokeWidth: 20, hitWidth: 34 },
    },
    labels: {
      brain:  { x: 98,  y: 96 },
      heart:  { x: 150, y: 179 },
      liver:  { x: 221, y: 189 },
      kidney: { x: 287, y: 189 },
      blood:  { x: 308, y: 208 },
    },
  },
  cat: {
    src: '/anatomy/cat-traced.svg',
    alt: 'Cat traced anatomy silhouette',
    width: 379,
    height: 199,
    mdr1: { x: 0.18, y: 0.245 },
    sections: {
      brain:  { type: 'path', d: 'M 57 48 C 60 39, 70 35, 80 37 C 89 39, 94 46, 92 54 C 90 61, 84 66, 77 67 C 73 67, 70 66, 67 63 C 62 62, 56 56, 57 48 Z' },
      heart:  { type: 'path', d: 'M 109 95 C 114 87, 126 86, 132 93 C 135 97, 136 102, 134 108 C 132 115, 126 120, 119 121 C 112 121, 106 117, 103 110 C 101 105, 102 99, 109 95 Z' },
      liver:  { type: 'path', d: 'M 146 98 C 162 90, 185 90, 198 96 C 203 99, 205 106, 201 112 C 197 120, 186 125, 174 126 C 162 127, 151 123, 145 116 C 140 111, 140 103, 146 98 Z' },
      kidney: { type: 'path', d: 'M 211 95 C 218 90, 227 89, 235 92 C 241 95, 246 101, 246 108 C 246 115, 242 121, 236 125 C 229 128, 220 128, 213 124 C 207 120, 204 114, 204 108 C 204 103, 206 98, 211 95 Z' },
      blood:  { type: 'line', d: 'M 91 103 C 122 99, 154 98, 185 101 C 212 104, 237 112, 262 123', strokeWidth: 12, hitWidth: 22 },
    },
    labels: {
      brain:  { x: 75,  y: 50 },
      heart:  { x: 118, y: 104 },
      liver:  { x: 174, y: 107 },
      kidney: { x: 225, y: 108 },
      blood:  { x: 242, y: 123 },
    },
  },
};

const HEAT_ORGANS = ['brain', 'heart', 'liver', 'kidney', 'blood'];
const ORGAN_RENDER_ORDER = ['blood', 'brain', 'heart', 'liver', 'kidney'];
const ORGAN_SHORT = { brain: 'BR', heart: 'HT', liver: 'LV', kidney: 'KD', blood: 'BL' };

function getSeverityHex(score) {
  const level = getBurdenLevel(score);
  if (level === 'nodata') return '#cbd5e1';
  if (level === 'none') return '#94a3b8';
  if (level === 'low') return '#fde68a';
  if (level === 'moderate') return '#f59e0b';
  if (level === 'high') return '#ef4444';
  return '#b91c1c';
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
  const alpha = level === 'none' ? 0.26 : level === 'low' ? 0.42 : level === 'moderate' ? 0.54 : level === 'high' ? 0.62 : 0.68;
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

// ── Tooltip Component ──────────────────────────────────────────────
function OrganTooltip({ organ, data, position, containerRef }) {
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 max-w-[280px] text-left">
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
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Contributing drugs</p>
            {data.contributingDrugs.map((cd) => (
              <div key={cd.drugId} className="flex justify-between text-[11px] py-0.5">
                <span className="text-slate-700 font-medium truncate mr-2">{cd.drugName}</span>
                <span className="text-slate-500 shrink-0">
                  base: {cd.baseScore} → {cd.scaledScore}
                  {!cd.doseScalingApplied && <span className="text-slate-400 ml-1">(no dose)</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {data.contributingDrugs.length === 0 && data.finalScore !== null && (
          <p className="text-[11px] text-slate-400 mb-2">단일 약물</p>
        )}

        {data.keywords.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Triggered effects</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {data.keywords.join(' · ')}
            </p>
          </div>
        )}

        {data.evidence && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Evidence</p>
            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
              {data.evidence}
            </p>
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
}) {
  const [hoveredOrgan, setHoveredOrgan] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [imageFailed, setImageFailed] = useState(false);
  const containerRef = useRef(null);
  const { t } = useI18n();
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
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Organ Burden
        </h3>
        <span className="text-[10px] text-slate-400">
          {species === 'dog' ? '🐕' : '🐈'} {species === 'dog' ? 'Canine' : 'Feline'}
        </span>
      </div>

      {/* Image + heatmap diagram */}
      <div className="relative bg-slate-50 rounded-lg border border-slate-100 p-2 mb-2">
        <svg
          className="w-full max-h-[220px] rounded-md bg-slate-100"
          viewBox={`0 0 ${anatomyConfig.width} ${anatomyConfig.height}`}
          role="img"
          aria-label={`${species} organ burden diagram`}
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

            if (section.type === 'ellipse') {
              return (
                <g key={`section-${organ}`}>
                  <ellipse
                    cx={section.cx}
                    cy={section.cy}
                    rx={section.rx}
                    ry={section.ry}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeDasharray={score == null ? '4 3' : undefined}
                    className="organ-section"
                  />
                  <ellipse
                    cx={section.cx}
                    cy={section.cy}
                    rx={section.rx}
                    ry={section.ry}
                    fill="transparent"
                    className="organ-region"
                    onMouseEnter={(e) => handleMouseEnter(organ, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  />
                </g>
              );
            }

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
                  />
                  <path
                    d={section.d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={hovered ? 3.6 : 2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={score == null ? '6 4' : undefined}
                    opacity={0.8}
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
                  stroke={stroke}
                  strokeWidth={strokeWidth}
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

          {/* Organ section labels */}
          {HEAT_ORGANS.map((organ) => {
            const pos = anatomyConfig.labels[organ];
            if (!pos) return null;
            const score = organScores?.[organ]?.finalScore;
            const hovered = hoveredOrgan === organ;
            const label = ORGAN_SHORT[organ];

            return (
              <g key={`label-${organ}`} pointerEvents="none">
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  fill={hovered ? '#0f172a' : '#334155'}
                  fontSize={hovered ? '11' : '10'}
                  fontWeight="700"
                >
                  {label} {score !== null && score !== undefined ? score : '—'}
                </text>
              </g>
            );
          })}
        </svg>

        {imageFailed && (
          <div className="mt-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
            Anatomy image is missing. Add {anatomyConfig.src} to render the diagram.
          </div>
        )}

        {/* Empty state */}
        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
            <p className="text-[11px] text-slate-400">Add drugs to see organ burden</p>
          </div>
        )}
      </div>

      {/* Color scale legend */}
      <div className="flex items-center gap-1 mb-2">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-0.5">
            <div
              className={`w-2.5 h-2.5 rounded-sm ${item.className}`}
              style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            />
            <span className="text-[8px] text-slate-400">{item.label}</span>
          </div>
        ))}
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
                  style={{
                    backgroundColor: data.finalScore !== null
                      ? (level === 'none' ? '#cbd5e1' :
                         level === 'low' ? '#fde68a' :
                         level === 'moderate' ? '#f59e0b' :
                         level === 'high' ? '#ef4444' : '#b91c1c')
                      : '#e2e8f0',
                  }}
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

      {/* ── Elimination Pathways (merged from OrganLoadIndicator) ─── */}
      {drugs.length > 0 && (
        <div className={`rounded-lg border overflow-hidden ${isCritical ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
          <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Activity size={12} className={renalRisk.text} />
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.results.cumulativeOrganLoad}
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

          {/* Per-drug contribution (compact) */}
          {contributions.length > 0 && (
            <div className="px-3 pb-2 border-t border-slate-100 pt-2">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                {t.results.perDrugContribution}
              </p>
              <div className="space-y-1">
                {contributions.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-medium text-slate-700 w-24 truncate shrink-0">{c.drugName}</span>
                    <span className="text-slate-400 font-mono">
                      {t.results.renalShort} <span className="text-slate-600 font-semibold">{c.scaledRenal}%</span>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400 font-mono">
                      {t.results.hepaticShort} <span className="text-slate-600 font-semibold">{c.scaledHepatic}%</span>
                    </span>
                    {c.doseScalingApplied && c.doseModifier !== 1.0 && (
                      <span className={`text-[9px] font-medium px-1 rounded ${c.doseModifier > 1 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        ×{c.doseModifier}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">
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
        />
      )}
    </div>
  );
}
