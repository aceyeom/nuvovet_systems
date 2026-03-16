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

// ── Dog SVG paths — clean side-profile silhouette facing left ──────
// Based on reference: German Shepherd-like standing profile
const DOG_BODY = `
  M 258,52 C 262,46 268,36 268,28 C 268,22 264,16 258,14
  L 254,12 C 252,8 248,4 244,4 C 240,4 238,8 238,12
  C 236,16 238,22 240,28
  L 236,34 C 230,30 222,28 216,30
  C 210,28 202,26 194,28
  C 180,30 164,34 148,38
  C 130,42 112,46 96,52
  C 88,56 82,60 80,68
  C 76,66 68,64 64,68
  C 60,72 66,78 72,76
  C 76,78 78,82 82,88
  C 86,94 88,102 90,110
  C 91,116 92,124 94,130
  C 95,134 98,138 102,138
  C 106,138 108,134 107,130
  C 106,124 104,118 102,112
  C 100,106 102,102 106,98
  C 118,100 134,102 150,102
  C 162,102 176,100 190,98
  C 200,96 208,94 216,88
  C 220,92 224,98 226,106
  C 228,112 230,120 232,128
  C 233,132 236,136 240,136
  C 244,136 246,132 245,128
  C 244,122 242,116 240,110
  C 238,104 240,98 244,94
  C 248,90 252,84 254,78
  C 258,72 262,64 260,56
  Z`;

const DOG_ORGANS = {
  brain: `M 244,18 C 248,12 256,10 260,16 C 264,20 262,28 258,32
    C 254,36 246,36 243,32 C 240,28 240,22 244,18 Z`,
  heart: `M 200,52 C 206,46 216,44 220,50 C 224,56 222,64 218,68
    C 214,72 206,74 202,70 C 196,64 194,58 200,52 Z`,
  liver: `M 158,52 C 168,46 186,44 196,48 C 202,52 204,58 200,64
    C 196,70 184,72 172,70 C 162,68 154,62 154,58 C 154,56 155,54 158,52 Z`,
  kidney: `M 112,58 C 120,52 134,52 142,56 C 148,60 150,68 146,74
    C 142,80 132,82 124,78 C 116,74 110,68 110,64 C 110,62 111,60 112,58 Z`,
  blood: `M 218,60 L 196,54 L 168,50 L 138,54 L 110,60
    M 200,64 L 190,80 M 168,62 L 162,78 M 130,66 L 124,80`,
};

// Dog organ label positions (near each organ)
const DOG_ORGAN_LABELS = {
  brain:  { x: 252, y: 42 },
  heart:  { x: 210, y: 80 },
  liver:  { x: 178, y: 80 },
  kidney: { x: 128, y: 86 },
};

// ── Cat SVG paths — clean walking side-profile facing left ─────────
// Based on reference: sleek domestic cat with curved tail
const CAT_BODY = `
  M 252,58 C 258,50 264,38 264,28
  C 264,20 258,12 254,10 L 250,6 C 248,2 244,0 242,2
  C 240,4 240,10 242,16
  L 240,22 C 236,18 230,16 226,18
  C 220,16 212,18 206,20
  C 192,24 176,28 160,32
  C 140,38 120,42 104,48
  C 96,52 90,56 86,62
  C 80,58 72,52 66,48
  C 60,44 56,44 54,46
  C 52,48 56,54 60,58
  C 66,64 74,68 80,68
  C 84,72 86,78 88,86
  C 90,92 90,100 92,108
  C 93,114 96,118 100,118
  C 104,118 106,114 105,110
  C 104,104 102,98 100,92
  C 98,88 100,84 104,80
  C 116,82 132,84 150,84
  C 164,84 178,82 192,80
  C 202,78 210,76 218,72
  C 222,76 224,82 226,90
  C 228,96 228,104 230,112
  C 231,116 234,118 238,118
  C 242,118 244,114 243,110
  C 242,104 240,98 238,92
  C 236,86 238,82 242,78
  C 246,74 250,68 252,62
  Z`;

const CAT_ORGANS = {
  brain: `M 248,16 C 252,10 260,8 262,14 C 264,18 262,26 258,28
    C 254,30 248,30 246,28 C 244,26 244,20 248,16 Z`,
  heart: `M 204,38 C 210,32 218,30 222,36 C 226,42 224,50 220,54
    C 216,58 208,58 204,54 C 200,48 200,42 204,38 Z`,
  liver: `M 164,40 C 174,34 190,32 200,36 C 206,40 208,46 204,52
    C 200,58 188,60 176,58 C 166,56 160,50 160,46 C 160,44 161,42 164,40 Z`,
  kidney: `M 120,46 C 128,40 142,40 150,44 C 156,48 158,56 154,62
    C 150,68 140,70 132,66 C 124,62 118,56 118,52 C 118,50 119,48 120,46 Z`,
  blood: `M 220,46 L 198,40 L 174,38 L 146,42 L 118,48
    M 204,48 L 194,66 M 174,46 L 168,64 M 138,52 L 132,66`,
};

// Cat organ label positions
const CAT_ORGAN_LABELS = {
  brain:  { x: 254, y: 36 },
  heart:  { x: 214, y: 64 },
  liver:  { x: 182, y: 66 },
  kidney: { x: 136, y: 74 },
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
  const mdr1Pos = species === 'cat' ? { cx: 254, cy: 22 } : { cx: 252, cy: 24 };

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
