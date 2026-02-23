import { useState } from 'react';

export const usePrescriptionManager = (initialPrescription) => {
  const [prescription, setPrescription] = useState(initialPrescription);

  const addDrug = (drug) => {
    setPrescription([...prescription, { id: Date.now(), ...drug }]);
  };

  const removeDrug = (id) => {
    setPrescription(prev => prev.filter(p => p.id !== id));
  };

  const updateDrug = (id, field, value) => {
    setPrescription(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const applyAlert = (alert, drugDictionary) => {
    const { action } = alert;
    
    if (action.type === 'replace') {
      const template = drugDictionary.find(d => d.name === action.value);
      setPrescription(prev =>
        prev.map(p =>
          p.name === action.target
            ? { ...p, name: action.value, dosage: template?.dose || p.dosage }
            : p
        )
      );
    } else if (action.type === 'update') {
      setPrescription(prev =>
        prev.map(p =>
          p.name === action.target ? { ...p, dosage: action.value } : p
        )
      );
    } else if (action.type === 'remove') {
      setPrescription(prev => prev.filter(p => p.name !== action.target));
    }
  };

  return { prescription, addDrug, removeDrug, updateDrug, applyAlert, setPrescription };
};
