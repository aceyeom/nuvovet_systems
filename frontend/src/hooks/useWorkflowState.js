import { useState } from 'react';

export const useWorkflowState = () => {
  const [workflowStep, setWorkflowStep] = useState('entry');
  const [checkSequence, setCheckSequence] = useState({ ddi: false, dose: false, allergy: false, disease: false });
  const [screeningResult, setScreeningResult] = useState(null);
  const [ownerInstructions, setOwnerInstructions] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const startAnalysis = () => {
    setWorkflowStep('analyzing');
    setCheckSequence({ ddi: false, dose: false, allergy: false, disease: false });
  };

  const updateCheckSequence = (checks) => {
    setCheckSequence(prev => ({ ...prev, ...checks }));
  };

  const completeAnalysis = (result) => {
    setScreeningResult(result);
    setWorkflowStep('review');
  };

  const reset = () => {
    setWorkflowStep('entry');
    setCheckSequence({ ddi: false, dose: false, allergy: false, disease: false });
    setScreeningResult(null);
    setOwnerInstructions(null);
  };

  return {
    workflowStep,
    setWorkflowStep,
    checkSequence,
    updateCheckSequence,
    screeningResult,
    setScreeningResult,
    ownerInstructions,
    setOwnerInstructions,
    isGenerating,
    setIsGenerating,
    startAnalysis,
    completeAnalysis,
    reset
  };
};
