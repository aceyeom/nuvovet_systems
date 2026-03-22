import React from 'react';

/**
 * Thin horizontal dose position indicator.
 * Shows where prescribed dose sits relative to recommended range.
 *
 * Props:
 *   dosePerKg   - prescribed dose in mg/kg (number or null)
 *   range       - [min, max] recommended range (array or null)
 *   ceiling     - explicit safety ceiling (number or null)
 *   unit        - dose unit string (default 'mg/kg')
 *   lang        - 'ko' | 'en'
 */
export function DoseTrackIndicator({ dosePerKg, range, ceiling, unit = 'mg/kg', lang = 'ko' }) {
  // No range data — can't show track
  if (!range || range.length < 2) return null;

  const [rangeMin, rangeMax] = range;
  const hasCeiling = ceiling != null && ceiling > rangeMax;
  const hasDose = dosePerKg != null && dosePerKg > 0;

  // Calculate track bounds:
  // Track spans from 0 to trackMax
  // trackMax = ceiling if exists, else rangeMax * 1.5 (to show overshoot zone)
  const trackMax = hasCeiling ? ceiling * 1.2 : rangeMax * 1.8;

  // Zone positions as percentages
  const rangeMinPct = (rangeMin / trackMax) * 100;
  const rangeMaxPct = (rangeMax / trackMax) * 100;
  const ceilingPct = hasCeiling ? (ceiling / trackMax) * 100 : 100;

  // Dose marker position
  const dosePct = hasDose ? Math.min(Math.max((dosePerKg / trackMax) * 100, 2), 98) : 0;

  // Determine status
  let status = 'none';
  if (hasDose) {
    if (hasCeiling && dosePerKg > ceiling) status = 'ceiling';
    else if (dosePerKg > rangeMax) status = 'above';
    else if (dosePerKg < rangeMin) status = 'below';
    else status = 'within';
  }

  const statusLabels = {
    within:  { ko: '권장 범위 내', en: 'Within recommended range' },
    below:   { ko: '권장 용량 미달 — 확인 필요', en: 'Below recommended dose' },
    above:   { ko: '권장 용량 초과 — 검토 필요', en: 'Exceeds recommended dose' },
    ceiling: { ko: '안전 한계 초과 ⚠', en: 'Exceeds safety ceiling ⚠' },
    none:    { ko: '용량 미입력', en: 'Dose not entered' },
  };

  const statusColor = {
    within:  'text-emerald-600',
    below:   'text-amber-600',
    above:   'text-amber-600',
    ceiling: 'text-red-600 font-semibold',
    none:    'text-slate-400',
  };

  if (!hasDose) {
    return (
      <div className="mt-1.5">
        <div className="w-full h-[6px] rounded-full bg-slate-100" />
        <p className={`text-[10px] mt-1 ${statusColor.none}`}>
          {statusLabels.none[lang] || statusLabels.none.ko} / {statusLabels.none.en}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      {/* Track */}
      <div className="relative w-full h-[6px] rounded-full bg-slate-100 overflow-visible">
        {/* Below range zone (left) — muted amber */}
        <div
          className="absolute top-0 left-0 h-full rounded-l-full bg-amber-200/50"
          style={{ width: `${rangeMinPct}%` }}
        />
        {/* Recommended range zone (middle) — muted green */}
        <div
          className="absolute top-0 h-full bg-emerald-200/60"
          style={{ left: `${rangeMinPct}%`, width: `${rangeMaxPct - rangeMinPct}%` }}
        />
        {/* Above range zone — muted amber */}
        <div
          className="absolute top-0 h-full bg-amber-200/50"
          style={{ left: `${rangeMaxPct}%`, width: `${(hasCeiling ? ceilingPct : 100) - rangeMaxPct}%` }}
        />
        {/* Beyond ceiling zone — red */}
        {hasCeiling && (
          <div
            className="absolute top-0 h-full rounded-r-full bg-red-200/60"
            style={{ left: `${ceilingPct}%`, width: `${100 - ceilingPct}%` }}
          />
        )}
        {/* Triangle marker */}
        <div
          className="absolute -top-[5px] transition-all duration-300"
          style={{ left: `${dosePct}%`, transform: 'translateX(-50%)' }}
        >
          <span className={`text-[10px] leading-none ${
            status === 'ceiling' ? 'text-red-600' :
            status === 'above' || status === 'below' ? 'text-amber-600' :
            'text-emerald-600'
          }`}>▲</span>
        </div>
      </div>
      {/* Status label */}
      <p className={`text-[10px] mt-1 ${statusColor[status]}`}>
        {statusLabels[status]?.[lang] || statusLabels[status]?.ko}
        {lang === 'ko' && ` / ${statusLabels[status]?.en}`}
      </p>
    </div>
  );
}
