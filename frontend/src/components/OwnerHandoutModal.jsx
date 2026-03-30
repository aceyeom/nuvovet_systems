import React, { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { generateOwnerHandoutApi } from '../lib/api';

/* ─── Korean label maps ───────────────────────────────────────── */

const FREQ_KR = {
  SID: '하루 1회', BID: '하루 2회', TID: '하루 3회', QID: '하루 4회',
  q2h: '2시간마다', q4h: '4시간마다', q6h: '6시간마다',
  q8h: '8시간마다', q12h: '12시간마다',
  CRI: '지속 주입', PRN: '필요 시', Monthly: '월 1회',
};

const ROUTE_KR = {
  PO: '경구', IV: '정맥주사', IM: '근육주사', SC: '피하주사',
  Eye: '점안', Ear: '점이', Top: '도포', Inh: '흡입',
  Topical: '도포', Ophthalmic: '점안', Otic: '점이', Inhalation: '흡입',
};

const CLASS_KR = {
  NSAID: '소염진통제', Corticosteroid: '스테로이드', Antibiotic: '항생제',
  Antiparasitic: '구충제', Antifungal: '항진균제', Analgesic: '진통제',
  Cardiac: '심장약', Diuretic: '이뇨제', Sedative: '진정제',
  Antiemetic: '구토억제제', 'GI Protectant': '위장보호제',
  Anticonvulsant: '항경련제', Antidepressant: '항우울제',
  'ACE Inhibitor': 'ACE억제제', Bronchodilator: '기관지확장제',
  Immunosuppressant: '면역억제제', Thyroid: '갑상선약', Hormone: '호르몬제',
};

function freqLabel(f) { return FREQ_KR[f] || f || '—'; }
function routeLabel(r) { return ROUTE_KR[r] || r || '—'; }
function classLabel(c) { return CLASS_KR[c] || c || ''; }

function getDose(drug, species) {
  if (drug.calculatedDose_mg) return `${drug.calculatedDose_mg} mg`;
  const perKg = drug.dosePerKg || drug.defaultDose?.[species];
  if (perKg) return `${perKg} ${drug.unit || 'mg/kg'}`;
  return '수의사 지시';
}

function getDuration(drug) {
  const d = drug.daysSupplied || drug.prescriptionDays || drug.duration;
  if (!d) return '수의사 지시';
  if (typeof d === 'number') return `${d}일`;
  return String(d);
}

function getFormulation(drug) {
  if (drug.selectedVariant) return drug.selectedVariant;
  const strength = drug.availableStrengths?.[0];
  if (strength) {
    const formLabel = strength.form === 'oral' ? ' 정제' : '';
    return `${strength.value}${strength.unit || 'mg'}${formLabel}`;
  }
  return null;
}

function getBrandName(drug) {
  if (drug.brandNames?.length) return drug.brandNames[0];
  return null;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ─── Print HTML builder ───────────────────────────────────────── */

function buildPrintHTML({ drugs, enrichedData, interactions, patientInfo, species, clinicName }) {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const speciesKr = species === 'dog' ? '개' : species === 'cat' ? '고양이' : species;

  const drugCardsHTML = drugs.map((drug, i) => {
    const enriched = enrichedData?.drugs?.[i] || {};
    const nameKr = esc(drug.nameKr || drug.name || '');
    const nameEn = esc(drug.name || '');
    const cls = esc(classLabel(drug.class));
    const brand = esc(getBrandName(drug));
    const form = esc(getFormulation(drug));
    const dose = esc(getDose(drug, species));
    const freq = esc(freqLabel(drug.freq));
    const dur = esc(getDuration(drug));
    const route = esc(routeLabel(drug.route));
    const notes = [enriched.howToGive, enriched.foodNote].filter(Boolean);
    const sideEffects = enriched.sideEffectsToWatch || '';

    return `
      <div class="drug-card">
        <div class="drug-header">
          <div class="drug-name-row">
            <span class="drug-name-kr">${nameKr}</span>
            ${nameKr !== nameEn ? `<span class="drug-name-en">${nameEn}</span>` : ''}
          </div>
          <div class="drug-meta">
            ${[cls, brand, form].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div class="dose-grid">
          <div class="dose-col">
            <div class="dose-label">투여량</div>
            <div class="dose-value">${dose}</div>
          </div>
          <div class="dose-col">
            <div class="dose-label">횟수</div>
            <div class="dose-value">${freq}</div>
          </div>
          <div class="dose-col">
            <div class="dose-label">기간</div>
            <div class="dose-value">${dur}</div>
          </div>
          <div class="dose-col last">
            <div class="dose-label">투여방법</div>
            <div class="dose-value">${route}</div>
          </div>
        </div>
        ${notes.length > 0 || sideEffects ? `
          <div class="drug-notes">
            ${notes.map(n => `<div class="note-line">${esc(n)}</div>`).join('')}
            ${sideEffects ? `<div class="note-warn">${esc(sideEffects)}</div>` : ''}
          </div>
        ` : ''}
      </div>`;
  }).join('');

  // Warnings from API or fallback
  const apiWarnings = enrichedData?.warnings || [];
  const hasUnhandledInteractions = apiWarnings.length === 0 &&
    interactions.some(ix => ix.severity?.label === 'Critical' || ix.severity?.label === 'Moderate');

  const warningsHTML = apiWarnings.length > 0
    ? apiWarnings.map(w => `
        <div class="warning-item">
          <div class="warning-title">${esc(w.title)}</div>
          <div class="warning-desc">${esc(w.description)}</div>
        </div>`).join('')
    : hasUnhandledInteractions
      ? `<div class="warning-item">
           <div class="warning-title">약물 상호작용 주의</div>
           <div class="warning-desc">처방된 약물 간 주의가 필요한 상호작용이 있습니다. 이상 증상이 나타나면 즉시 병원에 연락해 주세요.</div>
         </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>처방 안내문 — ${esc(patientInfo?.name) || '환자'}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo',
                 'Malgun Gothic', 'Noto Sans KR', sans-serif;
    color: #111827; background: #fff;
    font-size: 12px; line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { max-width: 660px; margin: 0 auto; }

  /* ── Header ── */
  .header {
    display: flex; justify-content: space-between; align-items: flex-end;
    padding-bottom: 14px; border-bottom: 2px solid #111827; margin-bottom: 22px;
  }
  .title { font-size: 22px; font-weight: 700; letter-spacing: -0.025em; }
  .header-right { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.7; }
  .clinic-name { font-weight: 600; color: #111827; }

  /* ── Patient bar ── */
  .patient-bar {
    display: flex; gap: 24px; flex-wrap: wrap;
    padding: 10px 16px; background: #f9fafb;
    border: 1px solid #e5e7eb; margin-bottom: 24px; font-size: 12px;
  }
  .plabel { color: #9ca3af; margin-right: 6px; }
  .pvalue { font-weight: 600; }

  /* ── Section title ── */
  .sec-title {
    font-size: 12px; font-weight: 700; color: #111827;
    margin-bottom: 12px; padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb; letter-spacing: 0.01em;
  }

  /* ── Drug card ── */
  .drug-card {
    border: 1px solid #e5e7eb; margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .drug-header { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; }
  .drug-name-row { display: flex; align-items: baseline; gap: 8px; }
  .drug-name-kr { font-size: 15px; font-weight: 600; color: #111827; }
  .drug-name-en { font-size: 11px; color: #9ca3af; }
  .drug-meta { font-size: 10px; color: #9ca3af; margin-top: 2px; }

  /* ── Dose grid ── */
  .dose-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; }
  .dose-col {
    padding: 10px 12px; text-align: center;
    border-right: 1px solid #f3f4f6;
  }
  .dose-col.last { border-right: none; }
  .dose-label {
    font-size: 9px; color: #9ca3af;
    letter-spacing: 0.05em; margin-bottom: 4px;
  }
  .dose-value { font-size: 13px; font-weight: 600; color: #111827; }

  /* ── Drug notes ── */
  .drug-notes { padding: 8px 16px; border-top: 1px solid #f3f4f6; }
  .note-line { font-size: 11px; color: #6b7280; line-height: 1.7; }
  .note-warn { font-size: 11px; color: #b45309; line-height: 1.7; margin-top: 2px; }

  /* ── Warnings ── */
  .warnings-section { margin-top: 24px; }
  .warning-item {
    padding: 8px 14px; margin-bottom: 8px;
    border-left: 3px solid #111827;
  }
  .warning-title { font-size: 12px; font-weight: 600; color: #111827; margin-bottom: 2px; }
  .warning-desc { font-size: 11px; color: #6b7280; line-height: 1.6; }

  /* ── General notes ── */
  .general-notes {
    padding: 10px 16px; border: 1px solid #e5e7eb;
    font-size: 11px; color: #6b7280; line-height: 1.7; margin-top: 20px;
  }

  /* ── Footer ── */
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
  .sig-line { width: 180px; border-bottom: 1px solid #111827; margin-top: 32px; margin-bottom: 4px; }
  .sig-label { font-size: 10px; color: #9ca3af; }
  .disclaimer {
    margin-top: 24px; font-size: 9px; color: #9ca3af; line-height: 1.7;
  }
  .footer-brand {
    margin-top: 8px; font-size: 9px; font-weight: 700;
    color: #d1d5db; letter-spacing: 0.1em;
  }

  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="title">처방 안내문</div>
    <div class="header-right">
      ${clinicName ? `<div class="clinic-name">${esc(clinicName)}</div>` : ''}
      <div>${today}</div>
    </div>
  </div>

  <div class="patient-bar">
    <div><span class="plabel">환자명</span><span class="pvalue">${esc(patientInfo?.name) || '—'}</span></div>
    <div><span class="plabel">종</span><span class="pvalue">${esc(speciesKr)}</span></div>
    ${patientInfo?.breed ? `<div><span class="plabel">품종</span><span class="pvalue">${esc(patientInfo.breed)}</span></div>` : ''}
    ${patientInfo?.weight ? `<div><span class="plabel">체중</span><span class="pvalue">${patientInfo.weight} kg</span></div>` : ''}
  </div>

  <div class="sec-title">처방 약물</div>
  ${drugCardsHTML}

  ${warningsHTML ? `
    <div class="warnings-section">
      <div class="sec-title">주의사항</div>
      ${warningsHTML}
    </div>
  ` : ''}

  ${enrichedData?.generalNotes ? `
    <div class="general-notes">${esc(enrichedData.generalNotes)}</div>
  ` : ''}

  <div class="footer">
    <div class="sig-line"></div>
    <div class="sig-label">담당 수의사</div>
    <div class="disclaimer">
      본 안내문은 담당 수의사가 검토 후 제공합니다. 복용 중 이상 증상이 나타나면 즉시 병원에 연락해 주세요.
    </div>
    <div class="footer-brand">NUVOVET</div>
  </div>

</div>
</body>
</html>`;
}

/* ─── Component ────────────────────────────────────────────────── */

export function OwnerHandoutModal({
  open, onClose, drugs = [], interactions = [], patientInfo = {}, species = 'dog', clinicName = '',
}) {
  const [enrichedData, setEnrichedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // API enrichment call
  useEffect(() => {
    if (!open || enrichedData || loading) return;

    const enrich = async () => {
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
          foodInteraction: '',
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
            species,
            breed: patientInfo.breed || '',
            weight: patientInfo.weight ? String(patientInfo.weight) : '',
          },
          drugs: drugItems,
          interactions: interactionItems,
          clinicName,
        });

        if (result) setEnrichedData(result);
        else setError('추가 정보 생성 실패');
      } catch {
        setError('서버 연결 실패 — 기본 처방 정보만 표시됩니다');
      }
      setLoading(false);
    };

    enrich();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on close
  useEffect(() => {
    if (!open) { setEnrichedData(null); setError(null); }
  }, [open]);

  const handlePrint = () => {
    const html = buildPrintHTML({ drugs, enrichedData, interactions, patientInfo, species, clinicName });
    const win = window.open('', '_blank', 'width=800,height=1100');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  if (!open) return null;

  const speciesKr = species === 'dog' ? '개' : species === 'cat' ? '고양이' : species;
  const hasInteractionWarnings = interactions.some(
    ix => ix.severity?.label === 'Critical' || ix.severity?.label === 'Moderate',
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900 tracking-tight">처방 안내문</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">인쇄 전 반드시 내용을 확인하세요</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 bg-white">

          {/* Patient info bar */}
          <div className="flex gap-5 flex-wrap text-[12px] px-4 py-2.5 bg-gray-50 border border-gray-200 mb-5">
            <div><span className="text-gray-400 mr-1.5">환자명</span><span className="font-semibold text-gray-900">{patientInfo.name || '—'}</span></div>
            <div><span className="text-gray-400 mr-1.5">종</span><span className="font-semibold text-gray-900">{speciesKr}</span></div>
            {patientInfo.breed && <div><span className="text-gray-400 mr-1.5">품종</span><span className="font-semibold text-gray-900">{patientInfo.breed}</span></div>}
            {patientInfo.weight && <div><span className="text-gray-400 mr-1.5">체중</span><span className="font-semibold text-gray-900">{patientInfo.weight} kg</span></div>}
          </div>

          {/* Section: drugs */}
          <div className="text-[12px] font-bold text-gray-900 mb-3 pb-1.5 border-b border-gray-200 tracking-wide">
            처방 약물
          </div>

          <div className="space-y-3 mb-5">
            {drugs.length === 0 && (
              <p className="text-[12px] text-gray-400 py-4">처방된 약물이 없습니다</p>
            )}
            {drugs.map((drug, i) => {
              const enriched = enrichedData?.drugs?.[i] || {};
              const nameKr = drug.nameKr || drug.name || '';
              const nameEn = drug.name || '';
              const cls = classLabel(drug.class);
              const brand = getBrandName(drug);
              const form = getFormulation(drug);
              const notes = [enriched.howToGive, enriched.foodNote].filter(Boolean);
              const sideEffects = enriched.sideEffectsToWatch || '';

              return (
                <div key={drug.id || i} className="border border-gray-200 overflow-hidden">
                  {/* Drug name header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-semibold text-gray-900">{nameKr}</span>
                      {nameKr !== nameEn && <span className="text-[11px] text-gray-400">{nameEn}</span>}
                    </div>
                    {(cls || brand || form) && (
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {[cls, brand, form].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>

                  {/* 4-column dosing grid */}
                  <div className="grid grid-cols-4 divide-x divide-gray-100">
                    <div className="px-3 py-3 text-center">
                      <div className="text-[9px] text-gray-400 tracking-widest mb-1">투여량</div>
                      <div className="text-[13px] font-semibold text-gray-900">{getDose(drug, species)}</div>
                    </div>
                    <div className="px-3 py-3 text-center">
                      <div className="text-[9px] text-gray-400 tracking-widest mb-1">횟수</div>
                      <div className="text-[13px] font-semibold text-gray-900">{freqLabel(drug.freq)}</div>
                    </div>
                    <div className="px-3 py-3 text-center">
                      <div className="text-[9px] text-gray-400 tracking-widest mb-1">기간</div>
                      <div className="text-[13px] font-semibold text-gray-900">{getDuration(drug)}</div>
                    </div>
                    <div className="px-3 py-3 text-center">
                      <div className="text-[9px] text-gray-400 tracking-widest mb-1">투여방법</div>
                      <div className="text-[13px] font-semibold text-gray-900">{routeLabel(drug.route)}</div>
                    </div>
                  </div>

                  {/* Enriched notes */}
                  {(notes.length > 0 || sideEffects) && (
                    <div className="px-4 py-2.5 border-t border-gray-100 space-y-0.5">
                      {notes.map((n, ni) => (
                        <div key={ni} className="text-[11px] text-gray-500 leading-relaxed">{n}</div>
                      ))}
                      {sideEffects && (
                        <div className="text-[11px] text-amber-700 leading-relaxed mt-1">{sideEffects}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Loading indicator for API enrichment */}
          {loading && (
            <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-4">
              <div className="w-3 h-3 border-[1.5px] border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              추가 정보 불러오는 중...
            </div>
          )}

          {/* Non-blocking error */}
          {error && !loading && (
            <div className="text-[11px] text-gray-400 mb-4">{error}</div>
          )}

          {/* Warnings from API */}
          {enrichedData?.warnings?.length > 0 && (
            <div className="mb-4">
              <div className="text-[12px] font-bold text-gray-900 mb-3 pb-1.5 border-b border-gray-200">
                주의사항
              </div>
              <div className="space-y-2">
                {enrichedData.warnings.map((w, i) => (
                  <div key={i} className="pl-3.5 border-l-[3px] border-gray-900 py-1.5">
                    <div className="text-[12px] font-semibold text-gray-900">{w.title}</div>
                    <div className="text-[11px] text-gray-500 leading-relaxed">{w.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback warning when API failed but interactions exist */}
          {!enrichedData && !loading && hasInteractionWarnings && (
            <div className="mb-4">
              <div className="text-[12px] font-bold text-gray-900 mb-3 pb-1.5 border-b border-gray-200">
                주의사항
              </div>
              <div className="pl-3.5 border-l-[3px] border-gray-900 py-1.5">
                <div className="text-[12px] font-semibold text-gray-900">약물 상호작용 주의</div>
                <div className="text-[11px] text-gray-500 leading-relaxed">
                  처방된 약물 간 주의가 필요한 상호작용이 있습니다. 이상 증상이 나타나면 즉시 병원에 연락해 주세요.
                </div>
              </div>
            </div>
          )}

          {/* General notes */}
          {enrichedData?.generalNotes && (
            <div className="px-4 py-3 border border-gray-200 text-[11px] text-gray-500 leading-relaxed">
              {enrichedData.generalNotes}
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[10px] text-gray-400">수의사 검토 후 인쇄</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
            <button
              onClick={handlePrint}
              disabled={drugs.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={13} />
              인쇄
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
