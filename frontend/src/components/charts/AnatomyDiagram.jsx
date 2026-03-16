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

// ── Dog SVG paths — side-profile facing left ───────────────────────
const DOG_BODY = `
  M 58,82
  C 62,72 71,66 83,62
  L 88,58
  L 86,49
  L 90,40
  L 96,46
  L 101,36
  L 107,44
  L 112,53
  C 133,56 163,57 190,56
  C 216,55 236,61 249,75
  C 256,83 259,93 257,104
  C 256,111 259,118 266,123
  C 272,127 276,133 273,136
  C 267,139 260,136 254,130
  C 248,124 244,119 238,117
  L 232,137
  C 232,141 226,143 220,142
  C 214,141 211,138 211,133
  L 213,113
  C 205,116 192,119 177,120
  L 175,137
  C 175,141 170,143 164,143
  C 159,143 155,140 155,136
  L 156,120
  L 130,121
  L 128,138
  C 128,142 122,144 116,143
  C 110,142 107,139 107,134
  L 110,113
  C 102,111 95,108 90,103
  C 82,97 76,93 68,91
  L 60,90
  C 56,89 55,86 58,82
  Z`;

const DOG_ORGANS = {
  brain: `M 92,54 C 96,49 104,49 109,54 C 113,59 112,66 106,69
    C 100,71 93,68 90,62 C 88,59 89,56 92,54 Z`,
  heart: `M 121,79 C 125,73 132,72 137,76 C 141,80 142,87 138,92
    C 134,97 126,98 121,94 C 117,90 117,84 121,79 Z`,
  liver: `M 146,82 C 154,76 167,76 177,80 C 184,84 186,91 182,97
    C 178,103 166,105 155,102 C 146,99 141,93 142,88 C 142,85 144,83 146,82 Z`,
  kidney: `M 171,84 C 177,79 187,79 195,83 C 201,87 202,94 198,99
    C 194,104 184,105 176,102 C 169,99 166,93 167,88 C 167,86 169,85 171,84 Z`,
  blood: `M 111,82 L 136,82 L 161,83 L 186,85 L 208,88
    M 141,85 L 138,94 M 166,86 L 163,96 M 191,88 L 188,97`,
};

// Dog organ label positions
const DOG_ORGAN_LABELS = {
  brain:  { x: 100, y: 50 },
  heart:  { x: 130, y: 78 },
  liver:  { x: 162, y: 81 },
  kidney: { x: 186, y: 82 },
};

// ── Cat SVG paths — side-profile facing left ───────────────────────
const CAT_BODY = `
  M 62,89
  C 68,80 77,74 89,71
  L 92,63
  L 88,52
  L 93,43
  L 99,50
  L 104,40
  L 110,47
  L 114,58
  C 132,61 155,62 179,61
  C 201,60 219,64 233,72
  C 243,79 251,88 256,98
  C 259,105 260,112 258,116
  C 256,121 258,124 263,126
  C 269,128 274,132 273,136
  C 268,139 261,138 256,134
  C 250,130 244,126 238,123
  L 236,138
  C 236,142 230,144 224,143
  C 218,142 215,139 215,134
  L 216,116
  C 207,118 194,120 181,121
  L 180,137
  C 180,141 174,143 168,143
  C 162,143 159,140 159,135
  L 160,121
  C 150,121 141,121 132,120
  L 130,138
  C 130,142 124,144 118,143
  C 112,142 109,139 109,134
  L 111,116
  C 102,113 95,109 90,104
  C 83,99 76,95 69,93
  L 63,92
  C 59,91 58,89 62,89
  Z`;

const CAT_ORGANS = {
  brain: `M 94,55 C 98,50 105,50 110,54 C 114,58 114,65 109,68
    C 103,71 96,69 93,63 C 91,60 91,57 94,55 Z`,
  heart: `M 122,80 C 126,74 133,73 138,77 C 142,81 143,88 139,93
    C 135,97 127,98 122,95 C 118,91 118,85 122,80 Z`,
  liver: `M 147,83 C 155,78 167,78 177,82 C 184,86 186,93 182,98
    C 178,104 166,106 155,103 C 147,100 142,94 143,89 C 143,86 145,84 147,83 Z`,
  kidney: `M 172,85 C 178,80 188,80 196,84 C 201,88 203,95 199,100
    C 195,105 186,106 178,103 C 171,100 168,94 169,89 C 169,87 170,86 172,85 Z`,
  blood: `M 111,84 L 136,84 L 161,85 L 186,87 L 207,90
    M 141,87 L 138,95 M 166,88 L 163,96 M 190,90 L 188,98`,
};

// Cat organ label positions
const CAT_ORGAN_LABELS = {
  brain:  { x: 102, y: 51 },
  heart:  { x: 131, y: 79 },
  liver:  { x: 162, y: 82 },
  kidney: { x: 186, y: 83 },
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
  const mdr1Pos = species === 'cat' ? { cx: 102, cy: 56 } : { cx: 101, cy: 55 };

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
