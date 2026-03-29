import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader2, Database, Beaker, BookOpen, Dna, Globe, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { formatMechanismApi } from '../lib/api';

// ── Crystalline Refraction Canvas Animation ─────────────────────
function CrystallineRefractionCanvas({ size = 192 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    let animId;
    let t = 0;

    const W = size;
    const H = size;
    const cx = W / 2;
    const cy = H / 2;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const R = Math.min(W, H) * 0.36;
      const rotation = t * 0.18;
      const SIDES = 6;

      // ── Outer hexagon vertices ──
      const outer = Array.from({ length: SIDES }, (_, i) => {
        const a = (i / SIDES) * Math.PI * 2 + rotation;
        return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
      });

      // ── Inner ring vertices (offset by half-step, smaller) ──
      const inner = Array.from({ length: SIDES }, (_, i) => {
        const a = ((i + 0.5) / SIDES) * Math.PI * 2 + rotation;
        return { x: cx + Math.cos(a) * R * 0.40, y: cy + Math.sin(a) * R * 0.40 };
      });

      // ── Facets (triangles: outer[i]→outer[n]→inner[i] and outer[n]→inner[i]→inner[n]) ──
      for (let i = 0; i < SIDES; i++) {
        const n = (i + 1) % SIDES;
        const hue = ((i / SIDES) * 200 + t * 14 + 195) % 360;

        ctx.beginPath();
        ctx.moveTo(outer[i].x, outer[i].y);
        ctx.lineTo(outer[n].x, outer[n].y);
        ctx.lineTo(inner[i].x, inner[i].y);
        ctx.closePath();
        ctx.fillStyle = `hsla(${hue}, 60%, 72%, ${0.10 + 0.06 * Math.sin(t * 1.4 + i)})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 50%, 62%, 0.30)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(outer[n].x, outer[n].y);
        ctx.lineTo(inner[i].x, inner[i].y);
        ctx.lineTo(inner[n].x, inner[n].y);
        ctx.closePath();
        ctx.fillStyle = `hsla(${(hue + 35) % 360}, 55%, 76%, ${0.09 + 0.05 * Math.sin(t * 1.1 + i + 1)})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${(hue + 35) % 360}, 48%, 66%, 0.25)`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // ── Outer outline ──
      ctx.beginPath();
      outer.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.strokeStyle = `hsla(220, 45%, 62%, 0.50)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // ── Inner outline ──
      ctx.beginPath();
      inner.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.strokeStyle = `hsla(220, 40%, 68%, 0.35)`;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // ── Spokes: center → outer vertices ──
      outer.forEach(({ x, y }, i) => {
        const sHue = ((i / SIDES) * 200 + t * 18 + 195) % 360;
        const g = ctx.createLinearGradient(cx, cy, x, y);
        g.addColorStop(0, `hsla(${sHue}, 65%, 72%, 0.45)`);
        g.addColorStop(1, `hsla(${sHue}, 65%, 72%, 0)`);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });

      // ── Light entry beam (white, from top, gently oscillates) ──
      const entryDir = -Math.PI / 2 + Math.sin(t * 0.38) * 0.22;
      const eX = cx + Math.cos(entryDir) * R * 1.55;
      const eY = cy + Math.sin(entryDir) * R * 1.55;
      const eGrad = ctx.createLinearGradient(eX, eY, cx, cy);
      eGrad.addColorStop(0, `hsla(220, 25%, 88%, 0)`);
      eGrad.addColorStop(0.55, `hsla(220, 25%, 88%, 0.40)`);
      eGrad.addColorStop(1, `hsla(220, 25%, 88%, 0.65)`);
      ctx.beginPath();
      ctx.moveTo(eX, eY);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = eGrad;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // ── Refracted exit rays (spectrum dispersion) ──
      const NUM_RAYS = 7;
      for (let r = 0; r < NUM_RAYS; r++) {
        const spread = (r - (NUM_RAYS - 1) / 2) / (NUM_RAYS - 1); // -0.5 … +0.5
        const rayHue = ((spread * 270 + 360) % 360); // red→violet
        const exitAngle = entryDir + Math.PI + spread * 0.58;
        const xX = cx + Math.cos(exitAngle) * R * 1.62;
        const xY = cy + Math.sin(exitAngle) * R * 1.62;

        const xGrad = ctx.createLinearGradient(cx, cy, xX, xY);
        xGrad.addColorStop(0, `hsla(${rayHue}, 80%, 62%, 0.68)`);
        xGrad.addColorStop(0.55, `hsla(${rayHue}, 75%, 65%, 0.30)`);
        xGrad.addColorStop(1, `hsla(${rayHue}, 70%, 65%, 0)`);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(xX, xY);
        ctx.strokeStyle = xGrad;
        ctx.lineWidth = r === Math.floor(NUM_RAYS / 2) ? 2.0 : 1.1;
        ctx.stroke();
      }

      // ── Core glow ──
      const coreR = R * 0.16;
      const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.2);
      coreG.addColorStop(0, `hsla(220, 65%, 92%, ${0.58 + Math.sin(t * 1.9) * 0.14})`);
      coreG.addColorStop(0.45, `hsla(220, 55%, 88%, 0.18)`);
      coreG.addColorStop(1, `hsla(220, 55%, 88%, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = coreG;
      ctx.fill();

      // ── Soft outer ambient halo ──
      const haloG = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R * 1.35);
      haloG.addColorStop(0, `hsla(220, 45%, 82%, 0)`);
      haloG.addColorStop(0.5, `hsla(220, 50%, 86%, 0.035)`);
      haloG.addColorStop(1, `hsla(220, 50%, 86%, 0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = haloG;
      ctx.fill();
    }

    function animate() {
      t += 0.012;
      draw();
      animId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}

// ── Build a format request payload from a DUR interaction object ─
function buildFormatPayload(ix) {
  return {
    drug_a_name: ix.drugA || '',
    drug_b_name: ix.drugB || '',
    interaction_type: 'drug-drug',
    severity: ix.severity?.label || 'Unknown',
    rule_name: ix.rule || '',
    mechanism_text: ix.mechanism || '',
    recommendation_text: ix.recommendation || '',
    alternative_suggestion: ix.alternativeSuggestion || '',
    literature_summary: ix.literatureSummary || '',
    raw_interaction_keywords: [],
    drug_a_class: ix.drugAClass || '',
    drug_b_class: ix.drugBClass || '',
    literature_refs: (ix.literature || []).map(r => ({
      title: r.title, source: r.source, confidence: r.confidence,
    })),
  };
}

// Props:
//   onComplete(preformattedMap)  — called when done; map is { 'ix-N': formatResult }
//   drugCount, species           — display only
//   durResults                   — { interactions[], ... } from runFullDURAnalysis (already run)
export function AnalysisScreen({ onComplete, drugCount, species, durResults }) {
  const { t, lang } = useI18n();
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Steps 0-4 are instant UI ticks; step 5 waits for real API calls
  const QUICK_DURATION = 160; // ms per quick step

  const STEPS = [
    { id: 'resolve',    label: t.analysis.step1, detail: t.analysis.step1Sub, icon: Database    },
    { id: 'korean_db',  label: t.analysis.step2, detail: t.analysis.step2Sub, icon: Globe       },
    { id: 'cyp',        label: t.analysis.step3, detail: t.analysis.step3Sub, icon: Dna         },
    { id: 'ddi',        label: t.analysis.step4, detail: t.analysis.step4Sub, icon: ShieldCheck  },
    { id: 'species',    label: t.analysis.step5, detail: t.analysis.step5Sub, icon: Beaker      },
    { id: 'literature', label: t.analysis.step6, detail: t.analysis.step6Sub, icon: BookOpen    },
  ];

  const QUICK_STEPS = STEPS.length - 1; // steps 0-4 are quick; step 5 waits for API

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    // Fire format API calls immediately for Critical + Moderate drug-drug interactions
    const interactions = durResults?.interactions || [];
    const toFormat = interactions.filter(
      ix => ix.severity?.label === 'Critical' || ix.severity?.label === 'Moderate'
    );

    const formatPromise = toFormat.length > 0
      ? Promise.all(
          toFormat.map((ix, localIdx) => {
            const globalIdx = interactions.indexOf(ix);
            return formatMechanismApi(buildFormatPayload(ix))
              .then(result => result ? { uid: `ix-${globalIdx}`, result } : null)
              .catch(() => null);
          })
        ).then(items => {
          const map = {};
          items.forEach(item => { if (item?.result) map[item.uid] = item.result; });
          return map;
        })
      : Promise.resolve({});

    // Tick through quick steps while API calls run
    const runQuickStep = (index) => {
      if (cancelled) return;
      if (index >= QUICK_STEPS) {
        // All quick steps done — now wait for API calls
        formatPromise.then(preformattedMap => {
          if (cancelled) return;
          setActiveStep(QUICK_STEPS);
          const t1 = setTimeout(() => {
            if (cancelled) return;
            setCompletedSteps(prev => [...prev, STEPS[QUICK_STEPS].id]);
            const t2 = setTimeout(() => {
              if (!cancelled) onCompleteRef.current(preformattedMap);
            }, 150);
            timers.push(t1, t2);
          }, 200);
          timers.push(t1);
        });
        return;
      }
      setActiveStep(index);
      const tid = setTimeout(() => {
        if (cancelled) return;
        setCompletedSteps(prev => [...prev, STEPS[index].id]);
        runQuickStep(index + 1);
      }, QUICK_DURATION);
      timers.push(tid);
    };

    const init = setTimeout(() => runQuickStep(0), 150);
    timers.push(init);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const speciesLabel = species === 'dog'
    ? (lang === 'ko' ? '개' : 'canine')
    : (lang === 'ko' ? '고양이' : 'feline');

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-white">

      <div className="relative z-10 max-w-sm w-full px-6 py-12">
        {/* Crystalline Refraction animation */}
        <div className="flex items-center justify-center mb-8">
          <CrystallineRefractionCanvas size={192} />
        </div>

        <h2 className="text-center typo-page-title mb-1">
          {t.analysis.analyzingPrescription}
        </h2>
        <p className="text-center typo-label mb-8">
          {lang === 'ko'
            ? `${speciesLabel} 환자 — ${drugCount}종 약물 검사 중`
            : `Screening ${drugCount} drug${drugCount !== 1 ? 's' : ''} for ${speciesLabel} patient`
          }
        </p>

        {/* Steps */}
        <div className="space-y-2 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isActive = activeStep === index && !isCompleted;
            const isPending = index > activeStep;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                  isActive ? 'bg-slate-50' : ''
                } ${isPending ? 'opacity-40' : 'opacity-100'}`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle size={16} className="text-emerald-500" />
                  ) : isActive ? (
                    <Loader2 size={16} className="text-slate-600 animate-spin" />
                  ) : (
                    <Icon size={16} className="text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-[13px] leading-tight ${isCompleted ? 'text-slate-600' : isActive ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-[11px] text-slate-400 mt-0.5 animate-fade-in truncate">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full h-1 bg-slate-200/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-900/60 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((completedSteps.length) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
