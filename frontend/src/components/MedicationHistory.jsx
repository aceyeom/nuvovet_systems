import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Pill, Plus, X, ChevronDown, ChevronUp, Calendar, Clock,
  AlertTriangle, Check, Search, Loader2, Trash2, Edit2,
} from 'lucide-react';
import { searchDrugsApi, getPatientMedicationsApi, addPatientMedicationApi,
         updatePatientMedicationApi, deletePatientMedicationApi } from '../lib/api';

// ── Status colors and labels ────────────────────────────────────
const STATUS_CONFIG = {
  active:  { color: 'bg-green-100 text-green-800 border-green-300', label: '복용 중', labelEn: 'Active' },
  stopped: { color: 'bg-gray-100 text-gray-600 border-gray-300', label: '중단', labelEn: 'Stopped' },
  prn:     { color: 'bg-blue-100 text-blue-800 border-blue-300', label: '필요시', labelEn: 'PRN' },
};

const EMPTY_MED = {
  drug_id: '', drug_name: '', dose: '', unit: 'mg/kg', route: 'PO',
  frequency: 'SID', status: 'active', indication: '', start_date: '', stop_date: '',
};

/**
 * MedicationHistory — Collapsible panel showing a patient's current and historical medications.
 *
 * Props:
 *   patientId     — UUID of the patient (from account_patients)
 *   species       — 'dog' | 'cat'
 *   onMedsChange  — callback(medications[]) when medications list changes
 *                   (parent can pass these to the DUR engine as currentMedications)
 *   isDemo        — if true, store in local state only (no backend calls)
 */
export default function MedicationHistory({ patientId, species, onMedsChange, isDemo = false }) {
  const [medications, setMedications] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newMed, setNewMed] = useState({ ...EMPTY_MED });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const searchTimeout = useRef(null);

  // Load medications on mount
  useEffect(() => {
    if (!patientId || isDemo) return;
    setLoading(true);
    getPatientMedicationsApi(patientId)
      .then(meds => {
        if (meds) {
          setMedications(meds);
          onMedsChange?.(meds);
        }
      })
      .finally(() => setLoading(false));
  }, [patientId, isDemo]);

  // Drug search with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      const results = await searchDrugsApi(searchQuery, species, 8);
      setSearchResults(results || []);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery, species]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectDrug = useCallback((drug) => {
    setNewMed(prev => ({
      ...prev,
      drug_id: drug.id,
      drug_name: drug.name,
    }));
    setSearchQuery(drug.name);
    setShowSearch(false);
  }, []);

  const handleAddMed = useCallback(async () => {
    if (!newMed.drug_name) return;

    if (isDemo) {
      const demoMed = { ...newMed, id: `demo_${Date.now()}`, created_at: new Date().toISOString() };
      const updated = [...medications, demoMed];
      setMedications(updated);
      onMedsChange?.(updated);
    } else if (patientId) {
      const saved = await addPatientMedicationApi(patientId, newMed);
      if (saved) {
        const updated = [...medications, saved];
        setMedications(updated);
        onMedsChange?.(updated);
      }
    }

    setNewMed({ ...EMPTY_MED });
    setSearchQuery('');
    setIsAdding(false);
  }, [newMed, medications, patientId, isDemo, onMedsChange]);

  const handleUpdateStatus = useCallback(async (medId, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'stopped') {
      updates.stop_date = new Date().toISOString().split('T')[0];
    }

    if (isDemo) {
      const updated = medications.map(m => m.id === medId ? { ...m, ...updates } : m);
      setMedications(updated);
      onMedsChange?.(updated);
    } else {
      const saved = await updatePatientMedicationApi(patientId, medId, updates);
      if (saved) {
        const updated = medications.map(m => m.id === medId ? saved : m);
        setMedications(updated);
        onMedsChange?.(updated);
      }
    }
  }, [medications, patientId, isDemo, onMedsChange]);

  const handleDelete = useCallback(async (medId) => {
    if (isDemo) {
      const updated = medications.filter(m => m.id !== medId);
      setMedications(updated);
      onMedsChange?.(updated);
    } else {
      const ok = await deletePatientMedicationApi(patientId, medId);
      if (ok) {
        const updated = medications.filter(m => m.id !== medId);
        setMedications(updated);
        onMedsChange?.(updated);
      }
    }
  }, [medications, patientId, isDemo, onMedsChange]);

  const activeMeds = medications.filter(m => m.status === 'active' || m.status === 'prn');
  const stoppedMeds = medications.filter(m => m.status === 'stopped');

  return (
    <div className="mb-4 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-sm text-slate-800">
            현재 복용 약물 / Current Medications
          </span>
          {activeMeds.length > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {activeMeds.length}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
          )}

          {/* Active medications chips */}
          {activeMeds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeMeds.map(med => (
                <MedChip
                  key={med.id}
                  med={med}
                  onStop={() => handleUpdateStatus(med.id, 'stopped')}
                  onDelete={() => handleDelete(med.id)}
                />
              ))}
            </div>
          )}

          {/* Stopped medications (collapsed) */}
          {stoppedMeds.length > 0 && (
            <StoppedMedsSection
              meds={stoppedMeds}
              onReactivate={(id) => handleUpdateStatus(id, 'active')}
              onDelete={(id) => handleDelete(id)}
            />
          )}

          {activeMeds.length === 0 && !loading && !isAdding && (
            <p className="text-sm text-slate-400 text-center py-2">
              등록된 약물이 없습니다 / No medications recorded
            </p>
          )}

          {/* Add medication form */}
          {isAdding ? (
            <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/30 space-y-3">
              {/* Drug search */}
              <div ref={searchRef} className="relative">
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="약물 검색 / Search drug..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                    onFocus={() => setShowSearch(true)}
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setNewMed(prev => ({ ...prev, drug_id: '', drug_name: '' })); }}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>
                {showSearch && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map(drug => (
                      <button
                        key={drug.id}
                        onClick={() => handleSelectDrug(drug)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0"
                      >
                        <span className="font-medium">{drug.name}</span>
                        {drug.class && <span className="ml-2 text-xs text-slate-500">{drug.class}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dose, route, frequency row */}
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="용량 / Dose"
                  value={newMed.dose}
                  onChange={(e) => setNewMed(prev => ({ ...prev, dose: e.target.value }))}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                />
                <select
                  value={newMed.route}
                  onChange={(e) => setNewMed(prev => ({ ...prev, route: e.target.value }))}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="PO">PO (경구)</option>
                  <option value="IV">IV (정맥)</option>
                  <option value="IM">IM (근육)</option>
                  <option value="SC">SC (피하)</option>
                  <option value="Topical">외용</option>
                </select>
                <select
                  value={newMed.frequency}
                  onChange={(e) => setNewMed(prev => ({ ...prev, frequency: e.target.value }))}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="SID">SID (1일1회)</option>
                  <option value="BID">BID (1일2회)</option>
                  <option value="TID">TID (1일3회)</option>
                  <option value="QID">QID (1일4회)</option>
                  <option value="PRN">PRN (필요시)</option>
                </select>
              </div>

              {/* Status and indication */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newMed.status}
                  onChange={(e) => setNewMed(prev => ({ ...prev, status: e.target.value }))}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="active">복용 중 / Active</option>
                  <option value="stopped">중단 / Stopped</option>
                  <option value="prn">필요시 / PRN</option>
                </select>
                <input
                  type="text"
                  placeholder="적응증 / Indication"
                  value={newMed.indication}
                  onChange={(e) => setNewMed(prev => ({ ...prev, indication: e.target.value }))}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* Start/stop dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <input
                    type="date"
                    value={newMed.start_date}
                    onChange={(e) => setNewMed(prev => ({ ...prev, start_date: e.target.value }))}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-2 flex-1"
                    placeholder="시작일"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <input
                    type="date"
                    value={newMed.stop_date}
                    onChange={(e) => setNewMed(prev => ({ ...prev, stop_date: e.target.value }))}
                    className="text-sm border border-slate-300 rounded-lg px-3 py-2 flex-1"
                    placeholder="중단일"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setIsAdding(false); setNewMed({ ...EMPTY_MED }); setSearchQuery(''); }}
                  className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  onClick={handleAddMed}
                  disabled={!newMed.drug_name}
                  className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> 추가
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-indigo-600 border border-dashed border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> 약물 추가 / Add Medication
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Medication chip ─────────────────────────────────────────────
function MedChip({ med, onStop, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const statusConf = STATUS_CONFIG[med.status] || STATUS_CONFIG.active;

  return (
    <div className={`inline-flex flex-col border rounded-lg overflow-hidden ${statusConf.color}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium"
      >
        <Pill className="w-3 h-3" />
        <span>{med.drug_name}</span>
        {med.dose && <span className="text-xs opacity-75">{med.dose} {med.unit}</span>}
        {med.frequency && <span className="text-xs opacity-60">{med.frequency}</span>}
      </button>

      {expanded && (
        <div className="px-3 py-2 bg-white/50 border-t text-xs space-y-1">
          {med.route && <div><span className="text-slate-500">투여경로:</span> {med.route}</div>}
          {med.indication && <div><span className="text-slate-500">적응증:</span> {med.indication}</div>}
          {med.start_date && <div><span className="text-slate-500">시작일:</span> {med.start_date}</div>}
          {med.stop_date && <div><span className="text-slate-500">중단일:</span> {med.stop_date}</div>}
          <div className="flex gap-1 pt-1">
            {med.status === 'active' && (
              <button onClick={onStop} className="text-orange-600 hover:text-orange-800 px-1.5 py-0.5 rounded bg-orange-50">
                중단
              </button>
            )}
            <button onClick={onDelete} className="text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50">
              <Trash2 className="w-3 h-3 inline" /> 삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stopped medications section ─────────────────────────────────
function StoppedMedsSection({ meds, onReactivate, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        중단된 약물 ({meds.length}) / Stopped
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 mt-2">
          {meds.map(med => (
            <div key={med.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border bg-gray-50 text-gray-500 border-gray-200">
              <span className="line-through">{med.drug_name}</span>
              {med.stop_date && <span className="text-gray-400">({med.stop_date})</span>}
              <button onClick={() => onReactivate(med.id)} className="text-green-500 hover:text-green-700 ml-1" title="재개">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => onDelete(med.id)} className="text-red-400 hover:text-red-600" title="삭제">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
