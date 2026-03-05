import React from 'react';
import { Clock } from 'lucide-react';

const PK_DATA = {
  meloxicam: { peak: 2, halfLife: 24, interval: 24 },
  prednisolone: { peak: 1.5, halfLife: 4, interval: 24 },
  carprofen: { peak: 1, halfLife: 8, interval: 12 },
  phenobarbital: { peak: 4, halfLife: 48, interval: 12 },
  furosemide: { peak: 0.5, halfLife: 2, interval: 12 },
  gabapentin: { peak: 2, halfLife: 3, interval: 8 },
  ketoconazole: { peak: 2, halfLife: 6, interval: 12 },
  metronidazole: { peak: 1, halfLife: 5, interval: 12 },
  cyclosporine: { peak: 2, halfLife: 9, interval: 12 },
  tramadol: { peak: 1.5, halfLife: 3, interval: 8 },
};

function getPkParams(drug) {
  if (!drug) return null;
  const id = drug.id || drug.name?.toLowerCase();
  const fromTable = PK_DATA[id];
  if (fromTable) return fromTable;

  const pk = drug.pk;
  if (pk && pk.timeToPeak && pk.halfLife) {
    return {
      peak: pk.timeToPeak,
      halfLife: pk.halfLife,
      interval: drug.freq === 'TID' ? 8 : drug.freq === 'BID' ? 12 : 24,
    };
  }
  return null;
}

// Generate concentration curve points for one dose
function generateDoseCurve(pk, startHour, maxHour = 24) {
  const points = [];
  const { peak, halfLife } = pk;
  const steps = 60;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (maxHour - startHour);
    const absT = startHour + t;
    if (absT > 24) break;

    let conc;
    if (t <= peak) {
      // Absorption ramp (simplified)
      conc = t / peak;
    } else {
      // Exponential decay from peak
      const decayTime = t - peak;
      conc = Math.exp(-0.693 * decayTime / halfLife);
    }

    points.push({ x: absT, y: Math.max(0, Math.min(1, conc)) });
  }
  return points;
}

// Build full 24h multi-dose curve
function buildMultiDoseCurve(pk) {
  const { interval } = pk;
  const doses = [];
  for (let start = 0; start < 24; start += interval) {
    doses.push(generateDoseCurve(pk, start));
  }

  // Merge by summing overlapping concentrations, cap at 1
  const merged = [];
  for (let hour = 0; hour <= 24; hour += 0.25) {
    let totalConc = 0;
    for (const dose of doses) {
      const nearest = dose.reduce((prev, curr) =>
        Math.abs(curr.x - hour) < Math.abs(prev.x - hour) ? curr : prev
      );
      if (Math.abs(nearest.x - hour) < 0.3) {
        totalConc += nearest.y;
      }
    }
    merged.push({ x: hour, y: Math.min(1, totalConc) });
  }
  return merged;
}

function curveToPath(points, svgWidth, svgHeight, padLeft, padRight, padTop, padBottom) {
  const usableW = svgWidth - padLeft - padRight;
  const usableH = svgHeight - padTop - padBottom;

  return points.map((p, i) => {
    const x = padLeft + (p.x / 24) * usableW;
    const y = padTop + usableH - p.y * usableH;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function curveToArea(points, svgWidth, svgHeight, padLeft, padRight, padTop, padBottom) {
  const usableW = svgWidth - padLeft - padRight;
  const usableH = svgHeight - padTop - padBottom;
  const baseline = padTop + usableH;

  const lineParts = points.map((p, i) => {
    const x = padLeft + (p.x / 24) * usableW;
    const y = padTop + usableH - p.y * usableH;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const lastX = padLeft + (points[points.length - 1].x / 24) * usableW;
  const firstX = padLeft + (points[0].x / 24) * usableW;

  return `${lineParts} L${lastX.toFixed(1)},${baseline} L${firstX.toFixed(1)},${baseline} Z`;
}

export function DrugTimeline({ drugA, drugB }) {
  const pkA = getPkParams(drugA);
  const pkB = getPkParams(drugB);

  const hasDataA = !!pkA;
  const hasDataB = !!pkB;

  if (!hasDataA && !hasDataB) return null;

  const partialOnly = (!hasDataA || !hasDataB) && (hasDataA || hasDataB);

  const curveA = hasDataA ? buildMultiDoseCurve(pkA) : [];
  const curveB = hasDataB ? buildMultiDoseCurve(pkB) : [];

  const svgW = 400;
  const svgH = 100;
  const padL = 0;
  const padR = 0;
  const padT = 8;
  const padB = 20;

  const ticks = [0, 6, 12, 18, 24];
  const usableW = svgW - padL - padR;

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={10} className="text-slate-400" />
        <span className="typo-label">24H PHARMACOKINETIC WINDOW</span>
      </div>

      <div className="bg-slate-50 rounded-lg border border-slate-100 p-3">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {ticks.map(t => {
            const x = padL + (t / 24) * usableW;
            return (
              <g key={t}>
                <line x1={x} y1={padT} x2={x} y2={svgH - padB} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2,2" />
                <text x={x} y={svgH - 4} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '8px', fontFamily: 'DM Mono, monospace' }}>
                  {t}h
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line x1={padL} y1={svgH - padB} x2={svgW - padR} y2={svgH - padB} stroke="#e2e8f0" strokeWidth="0.5" />

          {/* Drug A area + line */}
          {hasDataA && curveA.length > 0 && (
            <>
              <path d={curveToArea(curveA, svgW, svgH, padL, padR, padT, padB)} fill="#0f172a" fillOpacity="0.07" />
              <path d={curveToPath(curveA, svgW, svgH, padL, padR, padT, padB)} fill="none" stroke="#0f172a" strokeWidth="1.5" strokeOpacity="0.7" />
            </>
          )}

          {/* Drug B area + line */}
          {hasDataB && curveB.length > 0 && (
            <>
              <path d={curveToArea(curveB, svgW, svgH, padL, padR, padT, padB)} fill="#0f172a" fillOpacity="0.04" />
              <path d={curveToPath(curveB, svgW, svgH, padL, padR, padT, padB)} fill="none" stroke="#0f172a" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4,2" />
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          {hasDataA && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[2px] bg-slate-900 opacity-70 rounded" />
              <span className="text-[10px] font-medium text-slate-600">{drugA.name}</span>
              {pkA && <span className="text-[9px] text-slate-400 font-mono">t½ {pkA.halfLife}h</span>}
            </div>
          )}
          {hasDataB && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[2px] bg-slate-900 opacity-40 rounded" style={{ borderTop: '2px dashed' }} />
              <span className="text-[10px] font-medium text-slate-600">{drugB.name}</span>
              {pkB && <span className="text-[9px] text-slate-400 font-mono">t½ {pkB.halfLife}h</span>}
            </div>
          )}
        </div>

        {partialOnly && (
          <p className="text-[10px] text-slate-400 mt-1 italic">
            Dosing window only — full PK data pending for {!hasDataA ? drugA?.name : drugB?.name}
          </p>
        )}
      </div>
    </div>
  );
}
