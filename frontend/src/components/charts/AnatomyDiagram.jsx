import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getBurdenColor, getBurdenLevel, isMdr1SensitiveBreed } from './organBurdenAggregator';

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
  { label: '0–20',   color: 'var(--color-burden-none)',     className: 'bg-slate-200' },
  { label: '21–40',  color: 'var(--color-burden-low)',      className: 'bg-amber-200' },
  { label: '41–60',  color: 'var(--color-burden-moderate)', className: 'bg-amber-500' },
  { label: '61–85',  color: 'var(--color-burden-high)',     className: 'bg-red-500' },
  { label: '86–100', color: 'var(--color-burden-critical)', className: 'bg-red-700' },
];

// ── Dog SVG paths (side-profile, facing right) ─────────────────────
// Clean minimal silhouette with geometric organ regions
const DOG_BODY = `M 45 110 C 40 105, 30 95, 28 85 C 26 75, 30 60, 38 52 C 42 48, 48 45, 55 43
  L 60 40 C 55 32, 50 22, 52 15 C 54 10, 60 8, 65 10 L 68 14 C 70 10, 75 8, 78 12
  C 80 16, 78 22, 76 28 L 80 32 C 85 30, 92 32, 95 38 C 100 32, 108 30, 115 32
  C 125 35, 135 40, 150 42 C 170 45, 195 48, 220 52 C 240 55, 258 58, 270 62
  C 278 65, 282 68, 280 75 C 284 72, 292 68, 295 72 C 298 76, 292 82, 285 80
  C 282 82, 280 88, 275 95 C 270 100, 268 108, 265 118 C 264 122, 262 130, 260 138
  C 259 142, 255 145, 250 145 C 246 145, 244 142, 245 138 C 246 132, 248 125, 250 118
  C 252 112, 250 108, 245 105 C 230 108, 210 110, 190 110
  C 180 110, 165 112, 150 115 C 140 118, 130 122, 125 130 C 122 135, 120 140, 118 145
  C 117 148, 114 150, 110 150 C 106 150, 104 147, 105 143 C 106 138, 108 132, 110 125
  C 112 118, 108 114, 100 112 C 85 112, 68 112, 55 112 Z`;

const DOG_ORGANS = {
  brain: `M 55 28 C 58 18, 68 14, 75 18 C 80 22, 78 30, 74 34 C 70 38, 62 38, 58 34 C 54 32, 54 30, 55 28 Z`,
  heart: `M 105 55 C 110 48, 120 46, 125 50 C 130 54, 130 62, 125 68 C 120 74, 112 76, 108 72 C 102 66, 100 60, 105 55 Z`,
  liver: `M 140 58 C 148 52, 168 50, 185 54 C 195 57, 200 62, 198 70 C 195 78, 182 82, 168 80 C 155 78, 142 72, 138 66 C 136 62, 137 59, 140 58 Z`,
  kidney: `M 205 62 C 212 56, 228 55, 238 60 C 245 64, 248 72, 244 80 C 240 86, 228 88, 218 85 C 210 82, 204 74, 203 68 C 202 65, 203 63, 205 62 Z`,
  blood: `M 95 65 C 100 60, 108 62, 115 65 L 140 62 L 185 58 L 225 62 L 250 68
    M 115 68 L 130 85 M 170 72 L 165 90 M 220 70 L 230 88`,
};

// ── Cat SVG paths (side-profile, facing right) ─────────────────────
const CAT_BODY = `M 50 115 C 45 108, 38 98, 36 88 C 34 78, 38 62, 48 52
  L 55 45 C 48 35, 42 20, 45 12 C 47 8, 52 5, 55 8 L 60 18
  C 65 10, 70 4, 74 8 C 78 12, 76 22, 72 30 L 78 35
  C 85 32, 92 34, 96 40 C 102 35, 112 32, 122 34
  C 138 38, 160 42, 185 48 C 210 52, 235 56, 252 60
  C 260 63, 264 68, 262 75 C 268 72, 280 65, 288 60
  C 294 56, 300 55, 302 58 C 304 62, 300 68, 292 74
  C 285 80, 275 82, 268 80 C 265 84, 260 92, 256 102
  C 254 108, 252 118, 250 128 C 249 132, 246 135, 242 135
  C 238 135, 236 132, 237 128 C 238 122, 240 115, 242 108
  C 244 100, 240 96, 235 95
  C 220 98, 195 100, 175 102 C 160 104, 140 108, 125 112
  C 118 116, 112 122, 108 130 C 106 136, 104 140, 100 140
  C 96 140, 95 137, 96 132 C 98 126, 100 120, 102 114
  C 104 108, 98 106, 88 108 C 72 110, 58 112, 52 114 Z`;

const CAT_ORGANS = {
  brain: `M 56 30 C 60 20, 70 16, 74 22 C 78 26, 76 34, 72 38 C 68 40, 60 40, 57 36 C 54 34, 54 32, 56 30 Z`,
  heart: `M 100 58 C 106 50, 116 48, 120 53 C 124 58, 124 66, 120 72 C 116 76, 108 78, 104 74 C 98 68, 96 62, 100 58 Z`,
  liver: `M 132 58 C 142 52, 162 50, 178 55 C 188 58, 192 64, 190 72 C 186 78, 174 82, 160 80 C 148 78, 135 72, 132 66 C 130 62, 130 60, 132 58 Z`,
  kidney: `M 198 62 C 206 56, 222 55, 232 60 C 238 64, 240 72, 236 78 C 232 84, 222 86, 214 83 C 206 80, 198 72, 197 66 C 196 64, 197 63, 198 62 Z`,
  blood: `M 92 68 C 98 62, 106 64, 112 68 L 138 62 L 178 58 L 218 62 L 242 68
    M 110 70 L 128 86 M 162 72 L 158 90 M 215 70 L 224 86`,
};

// ── Tooltip Component ──────────────────────────────────────────────
function OrganTooltip({ organ, data, position, containerRef }) {
  const tooltipRef = useRef(null);
  const [adjusted, setAdjusted] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!tooltipRef.current || !containerRef.current) return;
    const tip = tooltipRef.current.getBoundingClientRect();
    const container = containerRef.current.getBoundingClientRect();
    let x = position.x;
    let y = position.y - tip.height - 8;

    // Keep within viewport
    if (x + tip.width > window.innerWidth - 8) x = window.innerWidth - tip.width - 8;
    if (x < 8) x = 8;
    if (y < 8) y = position.y + 16;
    // Also check bottom overflow for the fallback position
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
        {/* Header */}
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
          <div>
            <span className="text-[12px] font-bold text-slate-800">{organLabel.ko} / {organLabel.en}</span>
          </div>
          <div className="text-right">
            <span className="text-[12px] font-bold text-slate-700">
              {data.finalScore !== null ? `${data.finalScore} / 100` : '—'}
            </span>
            <span className={`ml-1.5 text-[10px] font-semibold ${LEVEL_COLORS[level]}`}>
              {levelInfo.dots} {levelInfo.en}
            </span>
          </div>
        </div>

        {/* Contributing drugs */}
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

        {/* Triggered keywords */}
        {data.keywords.length > 0 && (
          <div className="mb-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Triggered effects</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {data.keywords.join(' · ')}
            </p>
          </div>
        )}

        {/* Evidence */}
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

// ── Main AnatomyDiagram Component ──────────────────────────────────
export default function AnatomyDiagram({ species, organScores, patientBreed, mdr1SensitiveDrugs }) {
  const [hoveredOrgan, setHoveredOrgan] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const organPaths = species === 'cat' ? CAT_ORGANS : DOG_ORGANS;
  const bodyPath = species === 'cat' ? CAT_BODY : DOG_BODY;

  const showMdr1 = Boolean(
    mdr1SensitiveDrugs &&
    mdr1SensitiveDrugs.length > 0 &&
    species === 'dog' &&
    isMdr1SensitiveBreed(patientBreed)
  );

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
          viewBox="10 0 310 160"
          className="w-full"
          style={{ maxHeight: 180 }}
          role="img"
          aria-label={`${species} organ burden diagram`}
        >
          <defs>
            {/* No-data diagonal stripe pattern */}
            <pattern id="noDataPattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#f1f5f9" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" strokeWidth="1.5" />
            </pattern>
          </defs>

          {/* Body silhouette (non-interactive background) */}
          <path
            d={bodyPath}
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Blood vessels (rendered first, under organs) */}
          <path
            id="organ-blood"
            d={organPaths.blood}
            fill="none"
            stroke={organScores?.blood?.finalScore !== null
              ? getBurdenColor(organScores.blood.finalScore)
              : '#e2e8f0'}
            strokeWidth="2"
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
                id={`organ-${organ}`}
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
                cx="65"
                cy={species === 'cat' ? '30' : '28'}
                rx="14"
                ry="12"
                className="mdr1-ring"
              />
              <rect
                x="55"
                y={species === 'cat' ? '14' : '12'}
                width="26"
                height="11"
                rx="3"
                fill="#f59e0b"
                opacity="0.9"
              />
              <text
                x="68"
                y={species === 'cat' ? '22' : '20'}
                textAnchor="middle"
                className="text-[7px] font-bold"
                fill="white"
              >
                MDR1
              </text>
            </>
          )}

          {/* Organ labels (subtle, inside or near each organ) */}
          {[
            { organ: 'brain',  x: species === 'cat' ? 65 : 65,  y: species === 'cat' ? 50 : 44 },
            { organ: 'heart',  x: species === 'cat' ? 112 : 115, y: species === 'cat' ? 84 : 82 },
            { organ: 'liver',  x: species === 'cat' ? 158 : 165, y: species === 'cat' ? 88 : 86 },
            { organ: 'kidney', x: species === 'cat' ? 218 : 224, y: species === 'cat' ? 92 : 92 },
          ].map(({ organ, x, y }) => {
            const score = organScores?.[organ]?.finalScore;
            return (
              <text
                key={`label-${organ}`}
                x={x}
                y={y}
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

      {/* Compact score table */}
      <div className="space-y-1">
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
                      ? (getBurdenLevel(data.finalScore) === 'none' ? '#cbd5e1' :
                         getBurdenLevel(data.finalScore) === 'low' ? '#fde68a' :
                         getBurdenLevel(data.finalScore) === 'moderate' ? '#f59e0b' :
                         getBurdenLevel(data.finalScore) === 'high' ? '#ef4444' : '#b91c1c')
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
