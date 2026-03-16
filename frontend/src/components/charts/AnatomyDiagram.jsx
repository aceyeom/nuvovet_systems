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

// ── Image-based anatomy overlays (normalized coordinates: 0..1) ──
const ANATOMY_IMAGE_CONFIG = {
  dog: {
    src: '/anatomy/dog-outline.png',
    alt: 'Dog side profile anatomy',
    aspectRatio: '485 / 385',
    scale: 1.34,
    offsetX: -0.5,
    offsetY: -6.5,
    mdr1: { x: 0.18, y: 0.27 },
    organs: {
      brain:  { x: 0.19, y: 0.31, size: 0.18, hit: 0.2 },
      heart:  { x: 0.33, y: 0.54, size: 0.17, hit: 0.19 },
      liver:  { x: 0.47, y: 0.56, size: 0.2, hit: 0.22 },
      kidney: { x: 0.59, y: 0.56, size: 0.17, hit: 0.19 },
      blood:  { x: 0.46, y: 0.53, size: 0.56, hit: 0.6 },
    },
    labels: {
      brain:  { x: 0.19, y: 0.25 },
      heart:  { x: 0.33, y: 0.48 },
      liver:  { x: 0.47, y: 0.49 },
      kidney: { x: 0.59, y: 0.49 },
    },
  },
  cat: {
    src: '/anatomy/cat-outline.png',
    alt: 'Cat side profile anatomy',
    aspectRatio: '379 / 199',
    scale: 1.17,
    offsetX: 0,
    offsetY: -1.2,
    mdr1: { x: 0.20, y: 0.35 },
    organs: {
      brain:  { x: 0.21, y: 0.37, size: 0.16, hit: 0.18 },
      heart:  { x: 0.38, y: 0.56, size: 0.16, hit: 0.18 },
      liver:  { x: 0.52, y: 0.57, size: 0.19, hit: 0.21 },
      kidney: { x: 0.63, y: 0.57, size: 0.16, hit: 0.18 },
      blood:  { x: 0.49, y: 0.54, size: 0.52, hit: 0.56 },
    },
    labels: {
      brain:  { x: 0.21, y: 0.33 },
      heart:  { x: 0.38, y: 0.51 },
      liver:  { x: 0.52, y: 0.52 },
      kidney: { x: 0.63, y: 0.52 },
    },
  },
};

const HEAT_ORGANS = ['brain', 'heart', 'liver', 'kidney', 'blood'];

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

function getHeatOpacity(score) {
  if (score == null) return 0;
  return Math.min(0.76, 0.18 + score / 140);
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
  const [imageReady, setImageReady] = useState(false);
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
    setImageReady(false);
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
        <div
          className="relative w-full max-h-[220px] overflow-hidden rounded-md bg-slate-100"
          style={{ aspectRatio: anatomyConfig.aspectRatio }}
          role="img"
          aria-label={`${species} organ burden diagram`}
        >
          <img
            src={anatomyConfig.src}
            alt={anatomyConfig.alt}
            className="absolute inset-0 w-full h-full object-contain select-none"
            style={{
              transformOrigin: 'center',
              transform: `translate(${anatomyConfig.offsetX}%, ${anatomyConfig.offsetY}%) scale(${anatomyConfig.scale})`,
            }}
            draggable={false}
            onLoad={() => setImageReady(true)}
            onError={() => {
              setImageReady(false);
              setImageFailed(true);
            }}
          />

          {/* Heatmap blobs */}
          {HEAT_ORGANS.map((organ) => {
            const point = anatomyConfig.organs[organ];
            if (!point) return null;

            const score = organScores?.[organ]?.finalScore ?? null;
            const color = getBurdenColor(score);
            const opacity = getHeatOpacity(score);
            const isHovered = hoveredOrgan === organ;

            return (
              <div
                key={`heat-${organ}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
                style={{
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                  width: `${point.size * 100}%`,
                  height: `${point.size * 100}%`,
                  opacity,
                  background: `radial-gradient(circle, ${hexToRgba(color, 0.74)} 0%, ${hexToRgba(color, 0.32)} 48%, ${hexToRgba(color, 0)} 78%)`,
                  filter: isHovered ? 'blur(0.5px) saturate(1.15)' : 'blur(1.2px)',
                  transform: `translate(-50%, -50%) scale(${isHovered ? 1.08 : 1})`,
                }}
              />
            );
          })}

          {/* Hover hit zones for tooltips */}
          {HEAT_ORGANS.map((organ) => {
            const point = anatomyConfig.organs[organ];
            if (!point) return null;

            return (
              <button
                key={`hit-${organ}`}
                type="button"
                aria-label={`${organ} region`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-0 p-0 bg-transparent"
                style={{
                  left: `${point.x * 100}%`,
                  top: `${point.y * 100}%`,
                  width: `${point.hit * 100}%`,
                  height: `${point.hit * 100}%`,
                  outline: 'none',
                }}
                onMouseEnter={(e) => handleMouseEnter(organ, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onFocus={(e) => handleMouseEnter(organ, e)}
                onBlur={handleMouseLeave}
              />
            );
          })}

          {/* MDR1 pulsing ring around brain */}
          {showMdr1 && (
            <>
              <div
                className="mdr1-ring absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${anatomyConfig.mdr1.x * 100}%`,
                  top: `${anatomyConfig.mdr1.y * 100}%`,
                  width: '11%',
                  height: '11%',
                }}
              />
              <span
                className="absolute -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold text-white bg-amber-500/95 px-1.5 py-0.5 rounded"
                style={{
                  left: `${anatomyConfig.mdr1.x * 100}%`,
                  top: `${(anatomyConfig.mdr1.y - 0.1) * 100}%`,
                }}
              >
                MDR1
              </span>
            </>
          )}

          {/* Organ score labels */}
          {['brain', 'heart', 'liver', 'kidney'].map((organ) => {
            const pos = anatomyConfig.labels[organ];
            const score = organScores?.[organ]?.finalScore;

            return (
              <span
                key={`label-${organ}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-700"
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                  textShadow: '0 1px 0 rgba(255,255,255,0.85)',
                }}
              >
                {score !== null && score !== undefined ? score : '—'}
              </span>
            );
          })}
        </div>

        {imageFailed && (
          <div className="mt-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
            Anatomy image is missing. Add {anatomyConfig.src} to render the diagram.
          </div>
        )}

        {!imageReady && !imageFailed && (
          <div className="absolute inset-2 rounded-md bg-white/35 animate-pulse" />
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
