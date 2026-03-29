import React, { useState, useRef } from 'react';
import { X, Printer, AlertTriangle, Pill, Clock, UtensilsCrossed, Eye } from 'lucide-react';
import { generateOwnerHandoutApi } from '../lib/api';
import { NuvovetLogo } from './NuvovetLogo';

/**
 * OwnerHandoutModal — generates and previews a printable Korean discharge
 * instruction sheet for pet owners. The vet reviews before printing.
 *
 * Flow: Button click → API call → Preview modal → "검토 후 인쇄"
 */
export function OwnerHandoutModal({ open, onClose, drugs = [], interactions = [], patientInfo = {}, species = 'dog', clinicName = '' }) {
  const [handoutData, setHandoutData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  // Generate handout on mount when opened
  React.useEffect(() => {
    if (!open || handoutData || loading) return;

    const generateHandout = async () => {
      setLoading(true);
      setError(null);
      try {
        const drugItems = drugs.map(d => ({
          name: d.name || '',
          nameKr: d.nameKr || '',
          dose: d.dosePerKg ? String(d.dosePerKg) : (d.defaultDose?.[species] ? String(d.defaultDose[species]) : ''),
          unit: d.unit || 'mg/kg',
          frequency: d.freq || '',
          route: d.route || '',
          duration: d.duration || '',
          drugClass: d.class || '',
          speciesNote: d.speciesNotes?.[species] || '',
          foodInteraction: '', // Will be enriched by LLM from DB data
          contraindications: d.contraindications || [],
          sideEffects: '',
        }));

        const interactionItems = interactions
          .filter(ix => ix.severity?.label === 'Critical' || ix.severity?.label === 'Moderate')
          .map(ix => ({
            drugA: ix.drugA || '',
            drugB: ix.drugB || '',
            severity: ix.severity?.label || '',
            rule: ix.rule || '',
            recommendation: ix.recommendation || '',
          }));

        const result = await generateOwnerHandoutApi({
          patient: {
            name: patientInfo.name || '',
            species: species,
            breed: patientInfo.breed || '',
            weight: patientInfo.weight ? String(patientInfo.weight) : '',
          },
          drugs: drugItems,
          interactions: interactionItems,
          clinicName: clinicName,
        });

        if (result) {
          setHandoutData(result);
        } else {
          setError('안내문 생성에 실패했습니다. 다시 시도해 주세요.');
        }
      } catch {
        setError('서버 연결에 실패했습니다.');
      }
      setLoading(false);
    };

    generateHandout();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when closed
  React.useEffect(() => {
    if (!open) {
      setHandoutData(null);
      setError(null);
    }
  }, [open]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const speciesKr = species === 'dog' ? '개' : species === 'cat' ? '고양이' : species;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>퇴원 안내문 — ${patientInfo.name || '환자'}</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif; color: #1e293b; padding: 20px; max-width: 700px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #0f172a; margin-bottom: 16px; }
  .header-title { font-size: 18px; font-weight: 800; color: #0f172a; }
  .header-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .patient-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; display: flex; gap: 24px; flex-wrap: wrap; }
  .patient-field { font-size: 12px; }
  .patient-label { color: #64748b; font-weight: 500; }
  .patient-value { color: #0f172a; font-weight: 700; margin-left: 4px; }
  .section-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 16px 0 8px; display: flex; align-items: center; gap: 6px; }
  .section-title .icon { width: 16px; height: 16px; }
  .drug-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
  .drug-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
  .drug-detail { font-size: 11px; color: #475569; margin-bottom: 3px; display: flex; align-items: baseline; gap: 4px; }
  .drug-detail .label { font-weight: 600; color: #334155; min-width: 60px; }
  .warning-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
  .warning-title { font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 4px; }
  .warning-desc { font-size: 11px; color: #7f1d1d; line-height: 1.5; }
  .general-notes { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 14px; margin-top: 12px; font-size: 11px; color: #166534; line-height: 1.6; }
  .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-text { font-size: 9px; color: #94a3b8; }
  .footer-logo { font-size: 11px; font-weight: 800; color: #94a3b8; }
  .vet-signature { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #cbd5e1; }
  .vet-signature-line { width: 200px; border-bottom: 1px solid #64748b; margin-top: 24px; }
  .vet-signature-label { font-size: 10px; color: #64748b; margin-top: 4px; }
  .side-effect-note { font-size: 10px; color: #ea580c; font-weight: 500; margin-top: 4px; padding: 4px 8px; background: #fff7ed; border-radius: 6px; border: 1px solid #fed7aa; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-title">퇴원 안내문</div>
      <div class="header-sub">${clinicName || '동물병원'} · ${today}</div>
    </div>
    <div class="footer-logo">NUVOVET</div>
  </div>

  <div class="patient-info">
    <div class="patient-field"><span class="patient-label">환자명:</span><span class="patient-value">${patientInfo.name || '—'}</span></div>
    <div class="patient-field"><span class="patient-label">종:</span><span class="patient-value">${speciesKr}</span></div>
    ${patientInfo.breed ? `<div class="patient-field"><span class="patient-label">품종:</span><span class="patient-value">${patientInfo.breed}</span></div>` : ''}
    ${patientInfo.weight ? `<div class="patient-field"><span class="patient-label">체중:</span><span class="patient-value">${patientInfo.weight} kg</span></div>` : ''}
  </div>

  <div class="section-title">💊 처방 약물 안내</div>
  ${(handoutData?.drugs || []).map(d => `
    <div class="drug-card">
      <div class="drug-name">${d.name}</div>
      ${d.howToGive ? `<div class="drug-detail"><span class="label">투여법:</span> ${d.howToGive}</div>` : ''}
      ${d.doseAndFrequency ? `<div class="drug-detail"><span class="label">용량:</span> ${d.doseAndFrequency}</div>` : ''}
      ${d.foodNote ? `<div class="drug-detail"><span class="label">식이:</span> ${d.foodNote}</div>` : ''}
      ${d.sideEffectsToWatch ? `<div class="side-effect-note">⚠ ${d.sideEffectsToWatch}</div>` : ''}
    </div>
  `).join('')}

  ${(handoutData?.warnings || []).length > 0 ? `
    <div class="section-title">⚠️ 주의사항</div>
    ${handoutData.warnings.map(w => `
      <div class="warning-card">
        <div class="warning-title">${w.title}</div>
        <div class="warning-desc">${w.description}</div>
      </div>
    `).join('')}
  ` : ''}

  ${handoutData?.generalNotes ? `
    <div class="general-notes">
      📋 ${handoutData.generalNotes}
    </div>
  ` : ''}

  <div class="vet-signature">
    <div class="vet-signature-line"></div>
    <div class="vet-signature-label">담당 수의사 서명</div>
  </div>

  <div class="footer">
    <div class="footer-text">본 안내문은 수의사가 검토한 후 제공됩니다. 이상 증상 발생 시 즉시 내원해 주세요.</div>
    <div class="footer-logo">NUVOVET</div>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">보호자 퇴원 안내문</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">검토 후 인쇄하세요 — LLM 원문을 수의사가 반드시 확인해야 합니다</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4" ref={printRef}>
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              <p className="text-[13px] text-slate-500">안내문 생성 중...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle size={14} className="text-red-500" />
              <p className="text-[12px] text-red-700">{error}</p>
            </div>
          )}

          {handoutData && (
            <div className="space-y-4">
              {/* Patient header */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <div className="flex items-center gap-4 flex-wrap text-[12px]">
                  <span><span className="text-slate-400">환자명:</span> <span className="font-semibold text-slate-800">{patientInfo.name || '—'}</span></span>
                  <span><span className="text-slate-400">종:</span> <span className="font-semibold text-slate-800">{species === 'dog' ? '개' : '고양이'}</span></span>
                  {patientInfo.breed && <span><span className="text-slate-400">품종:</span> <span className="font-semibold text-slate-800">{patientInfo.breed}</span></span>}
                  {patientInfo.weight && <span><span className="text-slate-400">체중:</span> <span className="font-semibold text-slate-800">{patientInfo.weight} kg</span></span>}
                </div>
              </div>

              {/* Drug cards */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Pill size={13} className="text-blue-500" />
                  처방 약물 안내
                </h3>
                <div className="space-y-2">
                  {handoutData.drugs.map((d, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                      <p className="text-[13px] font-bold text-slate-900 mb-2">{d.name}</p>
                      <div className="space-y-1">
                        {d.howToGive && (
                          <div className="flex items-baseline gap-1.5 text-[11px]">
                            <span className="font-semibold text-slate-500 shrink-0 w-14">투여법</span>
                            <span className="text-slate-700">{d.howToGive}</span>
                          </div>
                        )}
                        {d.doseAndFrequency && (
                          <div className="flex items-baseline gap-1.5 text-[11px]">
                            <Clock size={10} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-slate-700">{d.doseAndFrequency}</span>
                          </div>
                        )}
                        {d.foodNote && (
                          <div className="flex items-baseline gap-1.5 text-[11px]">
                            <UtensilsCrossed size={10} className="text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-slate-700">{d.foodNote}</span>
                          </div>
                        )}
                        {d.sideEffectsToWatch && (
                          <div className="mt-1.5 px-2.5 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-[10px] text-orange-700 font-medium flex items-center gap-1">
                              <Eye size={10} className="text-orange-500" />
                              {d.sideEffectsToWatch}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {handoutData.warnings.length > 0 && (
                <div>
                  <h3 className="text-[12px] font-bold text-red-700 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-red-500" />
                    주의사항
                  </h3>
                  <div className="space-y-2">
                    {handoutData.warnings.map((w, i) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        <p className="text-[12px] font-bold text-red-800 mb-1">{w.title}</p>
                        <p className="text-[11px] text-red-700 leading-relaxed">{w.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General notes */}
              {handoutData.generalNotes && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <p className="text-[11px] text-emerald-700 leading-relaxed">📋 {handoutData.generalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-400 italic">수의사 검토 필수 — AI 생성 문서입니다</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              닫기
            </button>
            <button
              onClick={handlePrint}
              disabled={!handoutData}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={13} />
              검토 후 인쇄
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
