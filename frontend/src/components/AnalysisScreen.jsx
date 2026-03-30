import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Loader2, Database, Beaker, BookOpen, Dna, Globe, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n';
import { formatMechanismApi } from '../lib/api';
import { buildGroundedFormatPayload } from '../lib/interactionText';

const CRYSTALLINE_GLOBAL_SPEED = 0.5;

function clampOpacity(opacity) {
  return Math.max(0, Math.min(1, opacity));
}

function monochromeFill(opacity) {
  return `rgba(15, 23, 42, ${clampOpacity(opacity)})`;
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let animId;
    let time = 0;
    let lastTime = 0;

    const W = size;
    const H = size;
    const cx = W / 2;
    const cy = H / 2;
    const gridSize = 15;
    const spacing = W / (gridSize - 1);
    const dots = Array.from({ length: gridSize * gridSize }, (_, index) => ({
      x: (index % gridSize) * spacing,
      y: Math.floor(index / gridSize) * spacing,
    }));

    function draw(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      time += deltaTime * 0.16 * CRYSTALLINE_GLOBAL_SPEED;

      ctx.clearRect(0, 0, W, H);

      const waveRadius = time % (W * 1.2);
      const waveWidth = (W / 180) * 60;

      dots.forEach(dot => {
        const distance = Math.hypot(dot.x - cx, dot.y - cy);
        const distanceToWave = Math.abs(distance - waveRadius);
        let displacement = 0;

        if (distanceToWave < waveWidth / 2) {
          const wavePhase = (distanceToWave / (waveWidth / 2)) * Math.PI;
          displacement = easeInOutCubic(Math.sin(wavePhase)) * (W / 180) * 10;
        }

        const angleToCenter = Math.atan2(dot.y - cy, dot.x - cx);
        const dx = Math.cos(angleToCenter) * displacement;
        const dy = Math.sin(angleToCenter) * displacement;

        ctx.beginPath();
        ctx.arc(
          dot.x + dx,
          dot.y + dy,
          (W / 180) * (1.2 + (Math.abs(displacement) / ((W / 180) * 10 || 1)) * 2),
          0,
          Math.PI * 2
        );
        ctx.fillStyle = monochromeFill(
          0.2 + (Math.abs(displacement) / ((W / 180) * 10 || 1)) * 0.8
        );
        ctx.fill();
      });
    }

    function animate(timestamp) {
      draw(timestamp);
      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
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
            return formatMechanismApi(buildGroundedFormatPayload(ix))
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
          <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[32px] border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <CrystallineRefractionCanvas size={180} />
          </div>
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
      </div>
    </div>
  );
}
