import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Zap } from 'lucide-react';
import { PatientConfig } from '../components/PatientConfig';
import { DrugInput } from '../components/DrugInput';
import { AnalysisScreen } from '../components/AnalysisScreen';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { getDrugById } from '../data/drugDatabase';
import { runFullDURAnalysis } from '../utils/durEngine';

// Pre-filled demo case: a common scenario with known interactions
const DEMO_DEFAULTS = {
  species: 'dog',
  weight: 8.5,
  drugs: [
    getDrugById('meloxicam'),
    getDrugById('prednisolone'),
    getDrugById('metronidazole'),
  ],
};

export default function Demo() {
  const navigate = useNavigate();
  const [species, setSpecies] = useState(DEMO_DEFAULTS.species);
  const [weight, setWeight] = useState(DEMO_DEFAULTS.weight);
  const [drugs, setDrugs] = useState(DEMO_DEFAULTS.drugs);
  const [step, setStep] = useState('input'); // input | analyzing | results
  const [results, setResults] = useState(null);

  const handleAddDrug = (drug) => {
    setDrugs(prev => [...prev, drug]);
  };

  const handleRemoveDrug = (drugId) => {
    setDrugs(prev => prev.filter(d => d.id !== drugId));
  };

  const handleRunAnalysis = () => {
    if (drugs.length < 2) return;
    setStep('analyzing');
  };

  const handleAnalysisComplete = useCallback(() => {
    const analysisResults = runFullDURAnalysis(drugs, species, weight);
    setResults(analysisResults);
    setStep('results');
  }, [drugs, species, weight]);

  const handleBackToInput = () => {
    setStep('input');
  };

  const handleNewAnalysis = () => {
    setDrugs(DEMO_DEFAULTS.drugs);
    setSpecies(DEMO_DEFAULTS.species);
    setWeight(DEMO_DEFAULTS.weight);
    setResults(null);
    setStep('input');
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
              <Shield size={13} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-900">VetDUR</span>
              <span className="hidden sm:inline text-xs text-slate-400 ml-2">Demo Mode</span>
            </div>
          </div>
        </div>
        <span className="text-xs px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-medium">
          Demo
        </span>
      </header>

      {/* Content */}
      {step === 'input' && (
        <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
          {/* Demo intro */}
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              Pre-filled with a sample case. Adjust species, weight, or drugs — then run the DUR scan to see interaction results.
            </p>
          </div>

          {/* Patient config */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Patient
            </h3>
            <PatientConfig
              species={species}
              weight={weight}
              onSpeciesChange={setSpecies}
              onWeightChange={setWeight}
            />
          </div>

          {/* Drug input */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Current Medications ({drugs.length})
            </h3>
            <DrugInput
              drugs={drugs}
              onAddDrug={handleAddDrug}
              onRemoveDrug={handleRemoveDrug}
              species={species}
              demoMode
            />
          </div>

          {/* Run button */}
          <button
            onClick={handleRunAnalysis}
            disabled={drugs.length < 2}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            <Zap size={15} />
            Run DUR Scan
          </button>

          {drugs.length < 2 && (
            <p className="text-xs text-slate-400 text-center">
              Add at least 2 drugs to check interactions
            </p>
          )}
        </main>
      )}

      {step === 'analyzing' && (
        <AnalysisScreen
          onComplete={handleAnalysisComplete}
          drugCount={drugs.length}
          species={species}
        />
      )}

      {step === 'results' && (
        <main className="flex-1 pb-8">
          <ResultsDisplay
            results={results}
            onBack={handleBackToInput}
            onNewAnalysis={handleNewAnalysis}
          />
        </main>
      )}
    </div>
  );
}
