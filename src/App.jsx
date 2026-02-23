import React, { useState, Suspense } from 'react';
import { Sidebar } from './components/Sidebar/Sidebar';
import { PatientPanel } from './components/PatientPanel/PatientPanel';
import { Header } from './components/Layout/Header';
import { PrescriptionEntry } from './components/Workflow/PrescriptionEntry';
import { AnalysisLoader } from './components/Workflow/AnalysisLoader';
import { SafetyReview } from './components/Workflow/SafetyReview';
import { PrescriptionSummary } from './components/Workflow/PrescriptionSummary';
import { DrugDictionaryModal } from './components/Modals/DrugDictionaryModal';
import { usePrescriptionManager } from './hooks/usePrescriptionManager';
import { useWorkflowState } from './hooks/useWorkflowState';
import { runDURAnalysis, generateOwnerInstructions } from './utils/durAnalysis';
import { PATIENT_DATA, INITIAL_PRESCRIPTION } from './data/patientData';
import { DRUG_DICTIONARY } from './data/drugDictionary';

export default function App() {
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const prescriptionManager = usePrescriptionManager(INITIAL_PRESCRIPTION);
  const workflow = useWorkflowState();

  const handleExecuteDUR = async () => {
    workflow.startAnalysis();
    setTimeout(() => workflow.updateCheckSequence({ ddi: true }), 800);
    setTimeout(() => workflow.updateCheckSequence({ dose: true }), 1600);
    setTimeout(() => workflow.updateCheckSequence({ allergy: true }), 2400);
    setTimeout(() => workflow.updateCheckSequence({ disease: true }), 3200);

    try {
      const result = await runDURAnalysis(PATIENT_DATA, prescriptionManager.prescription);
      setTimeout(() => workflow.completeAnalysis(result), 4000);
    } catch (err) {
      setTimeout(() => {
        workflow.completeAnalysis({
          score: 35,
          alerts: [{
            type: "Disease",
            severity: "Critical",
            title: "MDR1 Sensitivity (Ivermectin)",
            shortFix: "Switch to Selamectin",
            action: { type: "replace", target: "Ivermectin", value: "Selamectin" }
          }]
        });
      }, 4000);
    }
  };

  const handleApplyAlert = (alert) => {
    prescriptionManager.applyAlert(alert, DRUG_DICTIONARY);
    workflow.setScreeningResult(prev => ({
      ...prev,
      alerts: prev.alerts.filter(a => a.title !== alert.title),
      score: Math.min(100, prev.score + 35)
    }));
  };

  const handleAddDrug = (drug) => {
    prescriptionManager.addDrug({
      name: drug.name,
      dosage: drug.dose,
      unit: drug.unit,
      freq: drug.freq,
      category: drug.cat
    });
    setIsDictionaryOpen(false);
  };

  const handleGenerateSummary = async () => {
    workflow.setIsGenerating(true);
    try {
      const result = await generateOwnerInstructions(prescriptionManager.prescription);
      workflow.setOwnerInstructions(result);
    } catch (e) {
      workflow.setOwnerInstructions({ text: "Give meds with food. Monitor hydration.", bullets: ["Check site", "Ensure water access", "Finish course"] });
    }
    workflow.setIsGenerating(false);
  };

  const handleFinishSession = () => {
    workflow.reset();
    window.location.reload();
  };

  return (
    <Suspense fallback={<div className="w-full h-screen bg-slate-900 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
        <Sidebar />
        <PatientPanel patient={PATIENT_DATA} />
        <main className="flex-1 flex flex-col min-w-0">
          <Header workflowStep={workflow.workflowStep} onExecuteDUR={handleExecuteDUR} />
          <div className="flex-1 overflow-y-auto p-12 bg-[#F1F5F9]/30">
            {workflow.workflowStep === 'entry' && <PrescriptionEntry prescription={prescriptionManager.prescription} onEdit={prescriptionManager.updateDrug} onRemove={prescriptionManager.removeDrug} onAddDrug={() => setIsDictionaryOpen(true)} />}
            {workflow.workflowStep === 'analyzing' && <AnalysisLoader checkSequence={workflow.checkSequence} />}
            {workflow.workflowStep === 'review' && <SafetyReview screeningResult={workflow.screeningResult} onApplyChange={handleApplyAlert} onAdjust={() => workflow.setWorkflowStep('entry')} onFinalize={() => workflow.setWorkflowStep('order')} />}
            {workflow.workflowStep === 'order' && <PrescriptionSummary prescription={prescriptionManager.prescription} ownerInstructions={workflow.ownerInstructions} isGenerating={workflow.isGenerating} onGenerateSummary={handleGenerateSummary} onFinish={handleFinishSession} />}
          </div>
        </main>
        <DrugDictionaryModal drugDictionary={DRUG_DICTIONARY} isOpen={isDictionaryOpen} onClose={() => setIsDictionaryOpen(false)} onSelectDrug={handleAddDrug} />
      </div>
    </Suspense>
  );
}

