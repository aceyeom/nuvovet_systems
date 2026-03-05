import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Database, Shield, Beaker, BookOpen, Dna, Globe } from 'lucide-react';
import { NuvovetLogo } from './NuvovetLogo';
import { MolecularBackground } from './MolecularBackground';

const ANALYSIS_STEPS = [
  {
    id: 'resolve',
    label: 'Resolving drug identifiers',
    detail: 'Matching product names → active substances',
    icon: Database,
    duration: 600,
  },
  {
    id: 'korean_db',
    label: 'Querying Korean Veterinary DB',
    detail: 'Scanning 877 registered products',
    icon: Globe,
    duration: 800,
  },
  {
    id: 'cyp',
    label: 'CYP enzyme interaction analysis',
    detail: 'Checking CYP3A4, CYP2D6, CYP1A2, CYP2C9 profiles',
    icon: Dna,
    duration: 700,
  },
  {
    id: 'ddi',
    label: 'Pairwise DDI screening',
    detail: 'Evaluating drug-drug interaction pairs',
    icon: Shield,
    duration: 900,
  },
  {
    id: 'species',
    label: 'Species-specific dose verification',
    detail: 'Applying canine/feline pharmacokinetic parameters',
    icon: Beaker,
    duration: 600,
  },
  {
    id: 'literature',
    label: 'Cross-referencing literature',
    detail: 'PMC, Plumb\'s, BSAVA Formulary',
    icon: BookOpen,
    duration: 800,
  },
];

export function AnalysisScreen({ onComplete, drugCount, species }) {
  const [completedSteps, setCompletedSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let timer;

    const runStep = (index) => {
      if (index >= ANALYSIS_STEPS.length) {
        timer = setTimeout(() => onComplete(), 400);
        return;
      }

      setActiveStep(index);

      timer = setTimeout(() => {
        setCompletedSteps(prev => [...prev, ANALYSIS_STEPS[index].id]);
        runStep(index + 1);
      }, ANALYSIS_STEPS[index].duration);
    };

    timer = setTimeout(() => runStep(0), 300);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center">
      {/* Full-screen molecular background */}
      <MolecularBackground />

      {/* Content overlay */}
      <div className="relative z-10 max-w-sm w-full px-6 py-12">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <NuvovetLogo size={56} className="text-slate-900" />
            <div className="absolute inset-0 animate-ping opacity-20">
              <NuvovetLogo size={56} className="text-slate-900" />
            </div>
          </div>
        </div>

        <h2 className="text-center typo-page-title mb-1">
          Running DUR Analysis
        </h2>
        <p className="text-center typo-label mb-8">
          Screening {drugCount} drug{drugCount !== 1 ? 's' : ''} for {species === 'dog' ? 'canine' : 'feline'} patient
        </p>

        {/* Steps */}
        <div className="space-y-3 bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
          {ANALYSIS_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isActive = activeStep === index && !isCompleted;
            const isPending = index > activeStep;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
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
                <div>
                  <p className={`text-[13px] ${isCompleted ? 'text-slate-600' : isActive ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-[11px] text-slate-400 mt-0.5 animate-fade-in">
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
