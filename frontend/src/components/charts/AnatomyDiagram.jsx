import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Activity } from 'lucide-react';
import { getBurdenColor, getBurdenLevel, isMdr1SensitiveBreed } from './organBurdenAggregator';
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

// ── Dog SVG paths — German Shepherd side-profile facing right ──────
// Traced from reference image: standing GSD, head right, tail left
// ViewBox shows x:40–280, y:–4–144
const DOG_BODY = `
  M 255,60
  C 250,52 244,46 239,41
  C 235,36 233,28 235,22
  L 238,15
  L 249,5
  C 255,7 261,14 258,22
  C 255,27 249,29 243,29
  C 236,28 225,24 213,22
  C 199,20 185,20 171,21
  C 158,22 146,24 135,28
  C 124,32 115,38 108,44
  C 102,49 99,55 99,51
  C 93,44 87,33 85,23
  C 83,16 85,12 90,14
  C 94,17 101,27 108,38
  C 112,44 114,53 112,62
  L 110,78
  C 109,86 108,94 110,102
  L 110,120
  L 113,128 L 118,132 L 125,133 L 133,131 L 134,122
  C 135,112 135,104 135,96
  C 137,88 142,84 149,83
  C 159,83 169,83 179,83
  C 189,82 197,82 201,82
  L 201,102
  L 201,124
  L 204,130 L 210,133 L 218,133 L 222,130 L 222,124
  L 222,102
  C 222,91 218,84 214,81
  C 210,77 205,72 200,67
  C 213,63 229,62 241,62
  C 246,63 251,65 253,69
  C 255,72 256,65 255,60
  Z`;

const DOG_ORGANS = {
  // Brain: rounded region filling the cranial vault inside the skull
  brain: `M 243,29 C 246,22 251,17 256,17 C 261,17 264,22 262,27
    C 260,32 254,34 249,33 C 244,32 241,30 243,29 Z`,
  // Heart: small oval in the upper chest cavity
  heart: `M 204,58 C 207,52 213,51 218,55 C 222,59 222,65 219,70
    C 216,74 210,75 205,72 C 201,68 200,63 204,58 Z`,
  // Liver: large wedge in cranial abdomen, caudal to diaphragm
  liver: `M 161,55 C 169,48 181,47 193,51 C 201,55 204,62 201,69
    C 198,76 185,78 171,76 C 160,73 154,66 155,60 C 155,57 158,55 161,55 Z`,
  // Kidney: bean-shaped region in mid dorsal abdomen
  kidney: `M 134,56 C 140,50 152,49 162,53 C 169,57 171,65 167,72
    C 163,78 151,79 141,76 C 131,72 128,65 130,60 C 130,57 132,56 134,56 Z`,
  // Blood vessels: dorsal aorta with branch lines
  blood: `M 210,58 L 188,58 L 165,58 L 143,59 L 118,61
    M 194,64 L 190,74 M 163,64 L 159,74 M 138,65 L 134,73`,
};

// Dog organ label positions
const DOG_ORGAN_LABELS = {
  brain:  { x: 252, y: 40 },
  heart:  { x: 211, y: 82 },
  liver:  { x: 178, y: 84 },
  kidney: { x: 147, y: 85 },
};

// ── Cat SVG paths — domestic cat side-profile facing right ─────────
// Two triangular pointed ears, slimmer body, longer curving tail
const CAT_BODY = `
  M 250,64
  C 245,56 238,49 233,44
  C 229,39 227,31 229,24
  L 233,18
  L 244,6
  L 250,20
  L 256,14
  L 263,6
  L 266,20
  C 264,27 258,29 251,28
  C 244,27 232,24 219,22
  C 205,20 191,20 177,21
  C 165,22 153,22 143,24
  C 131,26 122,30 115,36
  C 108,42 105,48 104,45
  C 98,38 92,28 90,18
  C 88,11 90,7 94,9
  C 98,12 104,22 111,32
  C 115,39 117,47 115,56
  L 113,72
  C 112,80 111,90 113,98
  L 113,118
  L 116,126 L 122,130 L 128,131 L 136,129 L 137,121
  C 138,111 138,103 138,95
  C 140,87 144,83 151,82
  C 160,82 169,82 179,82
  C 188,81 195,81 199,81
  L 199,100
  L 199,122
  L 202,127 L 208,131 L 215,131 L 219,128 L 219,122
  L 219,100
  C 219,89 216,83 212,80
  C 208,77 203,72 197,67
  C 210,63 225,61 237,61
  C 242,62 247,64 250,68
  C 252,71 251,67 250,64
  Z`;

const CAT_ORGANS = {
  // Brain: inside the skull between the two ears
  brain: `M 238,22 C 241,16 247,14 252,17 C 257,20 258,27 255,31
    C 252,35 246,36 241,33 C 236,30 235,25 238,22 Z`,
  // Heart: small oval in upper chest
  heart: `M 202,57 C 205,51 211,50 215,54 C 219,58 220,64 217,69
    C 214,73 208,74 204,71 C 200,68 199,62 202,57 Z`,
  // Liver: cranial abdomen region
  liver: `M 158,55 C 166,48 178,47 189,51 C 197,55 200,62 197,69
    C 194,76 181,78 167,76 C 157,73 151,66 152,60 C 152,57 155,55 158,55 Z`,
  // Kidney: mid abdomen bean-shape
  kidney: `M 131,57 C 137,51 149,50 158,54 C 166,58 168,66 164,72
    C 160,78 148,79 138,76 C 128,72 125,65 127,60 C 128,57 129,57 131,57 Z`,
  // Blood vessels: aorta and branches
  blood: `M 208,58 L 186,58 L 163,58 L 141,59 L 116,62
    M 192,64 L 188,74 M 161,64 L 157,74 M 136,65 L 132,73`,
};

// Cat organ label positions
const CAT_ORGAN_LABELS = {
  brain:  { x: 248, y: 41 },
  heart:  { x: 209, y: 81 },
  liver:  { x: 175, y: 84 },
  kidney: { x: 145, y: 85 },
};

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
  const containerRef = useRef(null);
  const { t } = useI18n();

  const organPaths = species === 'cat' ? CAT_ORGANS : DOG_ORGANS;
  const bodyPath = species === 'cat' ? CAT_BODY : DOG_BODY;
  const organLabelPos = species === 'cat' ? CAT_ORGAN_LABELS : DOG_ORGAN_LABELS;

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

  if (!species) return null;

  const hasData = organScores && Object.values(organScores).some(o => o.finalScore !== null);

  // MDR1 ring position (near brain)
  const mdr1Pos = species === 'cat' ? { cx: 247, cy: 23 } : { cx: 252, cy: 23 };

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

      {/* SVG Diagram */}
      <div className="relative bg-slate-50 rounded-lg border border-slate-100 p-2 mb-2">
        <svg
          viewBox="40 -4 240 148"
          className="w-full"
          style={{ maxHeight: 160 }}
          role="img"
          aria-label={`${species} organ burden diagram`}
        >
          <defs>
            <pattern id="noDataPattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#f1f5f9" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Body silhouette */}
          <path
            d={bodyPath}
            fill="#f8fafc"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Blood vessels (rendered first, under organs) */}
          <path
            d={organPaths.blood}
            fill="none"
            stroke={organScores?.blood?.finalScore !== null
              ? getBurdenColor(organScores.blood.finalScore)
              : '#e2e8f0'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="4 3"
            className="organ-region"
            style={{
              transition: 'stroke 400ms ease',
              opacity: organScores?.blood?.finalScore !== null ? 0.7 : 0.3,
            }}
            onMouseEnter={(e) => handleMouseEnter('blood', e)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />

          {/* Solid organs */}
          {['brain', 'heart', 'liver', 'kidney'].map((organ) => {
            const score = organScores?.[organ]?.finalScore ?? null;
            const fillColor = getBurdenColor(score);

            return (
              <path
                key={organ}
                d={organPaths[organ]}
                fill={fillColor}
                stroke={hoveredOrgan === organ ? '#475569' : '#94a3b8'}
                strokeWidth={hoveredOrgan === organ ? 1.5 : 0.8}
                className="organ-region"
                onMouseEnter={(e) => handleMouseEnter(organ, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              />
            );
          })}

          {/* MDR1 pulsing ring around brain */}
          {showMdr1 && (
            <>
              <ellipse
                cx={mdr1Pos.cx}
                cy={mdr1Pos.cy}
                rx="14"
                ry="12"
                className="mdr1-ring"
              />
              <rect
                x={mdr1Pos.cx - 13}
                y={mdr1Pos.cy - 18}
                width="26"
                height="11"
                rx="3"
                fill="#f59e0b"
                opacity="0.9"
              />
              <text
                x={mdr1Pos.cx}
                y={mdr1Pos.cy - 10}
                textAnchor="middle"
                className="text-[7px] font-bold"
                fill="white"
              >
                MDR1
              </text>
            </>
          )}

          {/* Organ score labels */}
          {['brain', 'heart', 'liver', 'kidney'].map((organ) => {
            const pos = organLabelPos[organ];
            const score = organScores?.[organ]?.finalScore;
            return (
              <text
                key={`label-${organ}`}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                className="pointer-events-none"
                fill="#475569"
                fontSize="7"
                fontWeight="600"
                fontFamily="DM Sans, system-ui, sans-serif"
              >
                {score !== null && score !== undefined ? score : '—'}
              </text>
            );
          })}
        </svg>

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
