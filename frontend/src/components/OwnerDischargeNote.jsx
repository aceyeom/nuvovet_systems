import React from 'react';
import { Heart } from 'lucide-react';
import { useI18n } from '../i18n';
import { checkDrugFoodRules } from '../utils/drugClassRules';

/**
 * Owner Discharge Note — 보호자 퇴원 안내문
 *
 * Generates a warm, patient-friendly print sheet for the pet owner.
 * Intentionally stripped of:
 *   - Dose / strength / mg/kg numbers
 *   - Clinical DDI mechanism text
 *   - Score percentages and confidence levels
 *
 * Shows only:
 *   - Which drugs were prescribed (name + frequency + duration)
 *   - Concise bullet-point watch signs per interaction
 *   - Patient-status-specific notes (renal, hepatic, conditions)
 *   - Universal emergency symptoms
 */

// ── Watch-point extractor ────────────────────────────────────────
function getOwnerWatchPoints(interaction) {
  const ruleText = (
    (interaction.rule || '') +
    ' ' +
    (interaction.recommendation || '') +
    ' ' +
    (interaction.mechanism || '')
  ).toLowerCase();

  const points = new Set();

  if (
    ruleText.includes('gi') ||
    ruleText.includes('ulcer') ||
    ruleText.includes('gastrointestinal') ||
    ruleText.includes('bleed') ||
    ruleText.includes('hemorrhage') ||
    ruleText.includes('vomit') ||
    ruleText.includes('melena')
  ) {
    points.add('구토 또는 검은 변(혈변)이 보이면 즉시 연락하세요');
    points.add('식욕이 갑자기 떨어지면 연락하세요');
  }

  if (
    ruleText.includes('sedation') ||
    ruleText.includes('respiratory depression') ||
    ruleText.includes('cns depress') ||
    ruleText.includes('oversedation') ||
    ruleText.includes('apnea')
  ) {
    points.add('비정상적인 졸음·비틀거림·호흡이 느려지면 즉시 연락하세요');
  }

  if (
    ruleText.includes('qt') ||
    ruleText.includes('cardiac') ||
    ruleText.includes('ventricular') ||
    ruleText.includes('arrhythmia') ||
    ruleText.includes('heart')
  ) {
    points.add('갑자기 쓰러지거나 호흡 곤란이 생기면 즉시 응급처치를 받으세요');
  }

  if (
    ruleText.includes('renal') ||
    ruleText.includes('nephrotoxic') ||
    ruleText.includes('kidney') ||
    ruleText.includes('creatinine')
  ) {
    points.add('음수량이나 소변량이 눈에 띄게 변하면 연락하세요');
  }

  if (
    ruleText.includes('hepat') ||
    ruleText.includes('liver') ||
    ruleText.includes('jaundice') ||
    ruleText.includes('alt') ||
    ruleText.includes('hepatotox')
  ) {
    points.add('눈이나 잇몸이 노래지면 즉시 연락하세요 (황달)');
    points.add('구토와 식욕 저하가 이틀 이상 지속되면 연락하세요');
  }

  if (ruleText.includes('serotonin')) {
    points.add('근육 경련·흥분·발열이 나타나면 즉시 응급처치를 받으세요');
  }

  if (
    ruleText.includes('hypoglycemi') ||
    ruleText.includes('blood glucose') ||
    ruleText.includes('glucose')
  ) {
    points.add('기력 저하·비틀거림·발작이 나타나면 즉시 응급처치를 받으세요 (저혈당 가능)');
  }

  if (
    ruleText.includes('coagul') ||
    ruleText.includes('anticoagul') ||
    ruleText.includes('hemorrhag')
  ) {
    points.add('잇몸 출혈·코피·피부 멍이 생기면 연락하세요');
  }

  if (
    ruleText.includes('nsaid') &&
    (ruleText.includes('steroid') || ruleText.includes('corticosteroid') || ruleText.includes('prednisolone'))
  ) {
    points.add('구토와 혈변 위험이 높으므로 공복 투여를 피하고 이상 시 즉시 연락하세요');
  }

  if (
    ruleText.includes('hypokalemi') ||
    ruleText.includes('potassium') ||
    ruleText.includes('diuretic')
  ) {
    points.add('무기력·근육 약화·식욕 저하가 나타나면 연락하세요');
  }

  // Fallback if nothing matched
  if (points.size === 0) {
    const sev = interaction.severity?.label;
    if (sev === 'Critical') {
      points.add('구토·기력 저하·식욕 감소가 나타나면 즉시 연락하세요');
    } else if (sev === 'Moderate') {
      points.add('행동 변화나 식욕 저하가 하루 이상 지속되면 연락하세요');
    } else {
      points.add('이상 증상이 나타나면 연락하세요');
    }
  }

  return [...points].slice(0, 3);
}

function getRouteLabel(route) {
  const labels = {
    PO: '먹는 약',
    IV: '주사 약',
    IM: '근육주사',
    SC: '피하주사',
    Topical: '바르는 약',
    Ophthalmic: '눈에 넣는 약',
    Otic: '귀에 넣는 약',
    Inhalation: '흡입 약',
  };

  return labels[route] || route || '약';
}

function getFrequencyLabel(freq) {
  const labels = {
    SID: '하루 1번',
    BID: '하루 2번',
    TID: '하루 3번',
    QID: '하루 4번',
    q8h: '8시간마다',
    q12h: '12시간마다',
    PRN: '필요할 때만',
  };

  return labels[freq] || freq || '';
}

function getDurationLabel(drug) {
  return drug.prescriptionDays ? `${drug.prescriptionDays}일 동안` : '병원에서 안내한 기간 동안';
}

function getHowToGiveLabel(drug) {
  const route = drug.route || 'PO';
  const freq = getFrequencyLabel(drug.freq);
  const duration = getDurationLabel(drug);

  if (route === 'PO') {
    return `${freq || '정해진 횟수대로'} 입으로 주세요. 가능하면 매일 비슷한 시간에 ${duration} 주세요.`;
  }
  if (route === 'Ophthalmic') {
    return `${freq || '정해진 횟수대로'} 눈에 넣어 주세요. 점안 후 눈 주변을 부드럽게 닦아 주세요.`;
  }
  if (route === 'Otic') {
    return `${freq || '정해진 횟수대로'} 귀에 넣어 주세요. 투약 후 귀 밑을 가볍게 마사지해 주세요.`;
  }
  if (route === 'Topical') {
    return `${freq || '정해진 횟수대로'} 얇게 발라 주세요. 핥지 않도록 잠시 지켜봐 주세요.`;
  }
  if (route === 'Inhalation') {
    return `${freq || '정해진 횟수대로'} 흡입하게 해 주세요. 사용법은 병원 안내를 우선해 주세요.`;
  }

  return `${getRouteLabel(route)}으로 ${freq || '정해진 횟수대로'} 투약합니다. 집에서 직접 투약하는 경우 병원 안내를 그대로 따라 주세요.`;
}

function getFoodNote(drug) {
  const foodRules = checkDrugFoodRules(drug);
  const text = foodRules.map((rule) => rule.message.toLowerCase()).join(' ');

  if (text.includes('empty stomach') || text.includes('before meals')) {
    return '가능하면 공복에 주세요. 식사 1시간 전이나 식후 2시간 뒤로 띄우면 좋습니다.';
  }
  if (text.includes('with food') || text.includes('high-fat') || text.includes('better tolerated when given with food')) {
    return '음식과 함께 또는 식후에 주면 속이 덜 불편할 수 있습니다.';
  }
  if (text.includes('dairy') || text.includes('calcium') || text.includes('magnesium') || text.includes('antacid')) {
    return '유제품, 칼슘/마그네슘 보충제, 제산제와는 2시간 이상 간격을 두세요.';
  }
  if ((drug.route || 'PO') === 'PO') {
    return '특별한 제한이 없다면 정해진 시간에 맞춰 주세요. 속이 예민하면 식후 투약이 도움이 될 수 있습니다.';
  }

  return '식사와의 특별한 제한은 없지만, 병원에서 별도 안내받은 경우 그 지시를 우선해 주세요.';
}

function getDrugWatchouts(drug) {
  const drugText = `${drug.name || ''} ${drug.nameKr || ''} ${drug.class || ''}`.toLowerCase();

  if (drugText.includes('nsaid') || drugText.includes('carprofen') || drugText.includes('meloxicam') || drugText.includes('firocoxib') || drugText.includes('pred') || drugText.includes('steroid')) {
    return '구토, 설사, 검은 변, 식욕 저하가 보이면 바로 병원에 연락하세요.';
  }
  if (drugText.includes('metronidazole') || drugText.includes('antibiotic') || drugText.includes('amoxicillin') || drugText.includes('doxycycline') || drugText.includes('fluoroquinolone')) {
    return '구토, 설사, 침울함이 심해지거나 식사를 거의 못 하면 연락하세요.';
  }
  if (drugText.includes('gabapentin') || drugText.includes('tramadol') || drugText.includes('opioid') || drugText.includes('phenobarbital') || drugText.includes('levetiracetam')) {
    return '심하게 처지거나 비틀거림이 심하면 바로 병원에 알려 주세요.';
  }
  if (drugText.includes('furosemide') || drugText.includes('diuretic') || drugText.includes('heart') || drugText.includes('cardiac')) {
    return '물을 너무 못 마시거나 소변량이 갑자기 줄면 바로 연락하세요.';
  }

  return '평소와 다른 구토, 설사, 기력 저하, 식욕 저하가 지속되면 병원에 연락하세요.';
}

// ── HTML builder ─────────────────────────────────────────────────
function buildOwnerHTML({ results, patientInfo, drugs }) {
  const { interactions } = results;
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const iscat = patientInfo?.species === 'cat';
  const speciesEmoji = iscat ? '🐈' : '🐕';
  const speciesLabel = iscat ? '고양이' : '강아지';

  // Only surface Critical + Moderate interactions
  const importantInteractions = (interactions || []).filter(
    (i) => i.severity?.label === 'Critical' || i.severity?.label === 'Moderate',
  );

  // ── Drug rows ──────────────────────────────────────────────────
  const drugRows = drugs.map((drug) => {
    const name = drug.nameKr || drug.name || drug.id;
    const parts = [
      getFrequencyLabel(drug.freq),
      getRouteLabel(drug.route),
      drug.prescriptionDays ? `${drug.prescriptionDays}일간` : null,
    ].filter(Boolean);
    const regimen = parts.join(' · ');
    const howToGive = getHowToGiveLabel(drug);
    const foodNote = getFoodNote(drug);
    const watchout = getDrugWatchouts(drug);

    return `
      <div class="drug-item">
        <div class="drug-body">
          <div class="drug-topline">
            <span class="drug-pill">💊</span>
            <div>
              <div class="drug-name">${name}</div>
              ${regimen ? `<div class="drug-regimen">${regimen}</div>` : ''}
            </div>
          </div>
          <div class="drug-guide-list">
            <div class="guide-row"><span class="guide-label">투약</span><span class="guide-copy">${howToGive}</span></div>
            <div class="guide-row"><span class="guide-label">식사</span><span class="guide-copy">${foodNote}</span></div>
            <div class="guide-row"><span class="guide-label">주의</span><span class="guide-copy">${watchout}</span></div>
          </div>
        </div>
      </div>`;
  }).join('');

  // ── Interaction warnings ────────────────────────────────────────
  const warningCards = importantInteractions.map((ix) => {
    const isCritical = ix.severity?.label === 'Critical';
    const nameA = ix.drugANameKr || ix.drugA || '';
    const nameB = ix.drugBNameKr || ix.drugB || '';
    const watchPoints = getOwnerWatchPoints(ix);
    return `
      <div class="warn-card ${isCritical ? 'warn-critical' : 'warn-moderate'}">
        <div class="warn-head">
          <span class="warn-icon">${isCritical ? '⚠️' : '💬'}</span>
          <span class="warn-drugs">${nameA} &amp; ${nameB} 함께 복용 중</span>
          <span class="sev-badge ${isCritical ? 'sev-crit' : 'sev-mod'}">${isCritical ? '중요' : '주의'}</span>
        </div>
        <ul class="bullet-list">
          ${watchPoints.map((p) => `<li>${p}</li>`).join('')}
        </ul>
      </div>`;
  }).join('');

  // ── Condition-specific notes ───────────────────────────────────
  const conditionBlocks = [];

  if (
    patientInfo?.renalStatus &&
    patientInfo.renalStatus !== 'Unknown' &&
    patientInfo.renalStatus !== 'Normal'
  ) {
    conditionBlocks.push(
      `<div class="cond-note">🫘 <strong>신장 기능 저하</strong> — 물을 갑자기 덜 마시거나 구토가 지속되면 즉시 연락하세요.</div>`,
    );
  }
  if (
    patientInfo?.hepaticStatus &&
    patientInfo.hepaticStatus !== 'Unknown' &&
    patientInfo.hepaticStatus !== 'Normal'
  ) {
    conditionBlocks.push(
      `<div class="cond-note">🫀 <strong>간 기능 저하</strong> — 눈이나 잇몸이 노랗게 보이면 즉시 연락하세요.</div>`,
    );
  }
  (patientInfo?.conditions || []).forEach((c) => {
    const cl = c.toLowerCase();
    if (cl.includes('diabet') || cl.includes('당뇨')) {
      conditionBlocks.push(
        `<div class="cond-note">💉 <strong>당뇨</strong> — 기력 저하·비틀거림·경련이 나타나면 즉시 응급처치를 받으세요 (저혈당 가능).</div>`,
      );
    }
    if (cl.includes('epilep') || cl.includes('간질') || cl.includes('발작')) {
      conditionBlocks.push(
        `<div class="cond-note">⚡ <strong>간질/발작 이력</strong> — 일부 약물이 발작 역치를 낮출 수 있습니다. 발작 시 즉시 연락하세요.</div>`,
      );
    }
  });

  const conditionSection =
    conditionBlocks.length > 0
      ? `<div class="section">
          <div class="sec-header"><span class="sec-icon">🏥</span><span class="sec-title">환자 상태별 주의사항</span></div>
          ${conditionBlocks.join('')}
        </div>`
      : '';

  // ── Warnings section ───────────────────────────────────────────
  const warningsSection =
    warningCards.length > 0
      ? `<div class="section">
          <div class="sec-header"><span class="sec-icon">🔔</span><span class="sec-title">약물 복용 시 주의사항</span></div>
          ${warningCards}
        </div>`
      : `<div class="section">
          <div class="sec-header"><span class="sec-icon">✅</span><span class="sec-title">약물 복용 안전성</span></div>
          <div class="all-clear">
            <span class="all-clear-icon">✅</span>
            <div>
              <div class="all-clear-title">특별한 약물 간 주의사항이 없습니다</div>
              <div class="all-clear-sub">처방된 약물은 안전하게 함께 사용할 수 있습니다</div>
            </div>
          </div>
        </div>`;

  const emergencyList = [
    '심한 구토 또는 혈변',
    '갑작스러운 기력 저하 · 쓰러짐',
    '호흡 이상 (빠름 또는 느림)',
    '경련 또는 의식 저하',
    '심한 식욕 · 음수 저하',
    '눈 · 피부가 노래지는 황달',
  ];

  const routineTips = [
    '약은 가능하면 매일 비슷한 시간에 주세요.',
    '한 번 빼먹었다고 다음 투약 때 두 배로 주지 마세요.',
    '먹는 약 후 구토가 반복되면 다시 먹이기 전에 병원에 문의하세요.',
    '복용 중에는 물을 충분히 마실 수 있게 해 주세요.',
  ];

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>보호자 퇴원 안내문 — ${patientInfo?.name ?? '환자'}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic','Nanum Gothic',sans-serif;
      font-size:13px;color:#2d3748;background:#f7f5f0;line-height:1.65;
    }
    .page{max-width:680px;margin:0 auto;padding:28px 20px 48px;background:#f7f5f0;}

    /* ── Header ── */
    .top-bar{
      display:flex;align-items:flex-start;justify-content:space-between;
      background:#fff;border-radius:20px;padding:20px 24px;
      margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);
    }
    .doc-title{font-size:20px;font-weight:800;color:#1a202c;letter-spacing:-0.03em;}
    .doc-date{font-size:12px;color:#a0aec0;margin-top:3px;}
    .brand{text-align:right;}
    .brand-name{font-size:11px;font-weight:800;color:#0d9488;letter-spacing:.1em;}
    .brand-sub{font-size:10px;color:#a0aec0;}

    /* ── Patient card ── */
    .patient-card{
      background:linear-gradient(135deg,#0d9488 0%,#0284c7 100%);
      border-radius:20px;padding:20px 24px;margin-bottom:14px;
      color:#fff;display:flex;align-items:flex-start;gap:16px;
    }
    .pet-emoji{font-size:44px;line-height:1;margin-top:2px;}
    .pet-name{font-size:24px;font-weight:800;letter-spacing:-0.03em;}
    .pet-meta{font-size:12px;opacity:.85;margin-top:4px;}
    .chip-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;}
    .chip{
      background:rgba(255,255,255,.2);border-radius:999px;
      padding:3px 10px;font-size:11px;font-weight:500;
    }

    /* ── Section cards ── */
    .section{
      background:#fff;border-radius:20px;padding:20px 22px;
      margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,.06);
    }
    .sec-header{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
    .sec-icon{font-size:18px;}
    .sec-title{font-size:15px;font-weight:700;color:#1a202c;}

    /* ── Drug list ── */
    .drug-item{
      display:flex;align-items:flex-start;gap:12px;
      padding:11px 14px;background:#f7fbff;
      border-radius:14px;margin-bottom:8px;border:1px solid #e2ecf6;
    }
    .drug-topline{display:flex;align-items:flex-start;gap:12px;}
    .drug-pill{font-size:22px;line-height:1;padding-top:1px;}
    .drug-name{font-size:14px;font-weight:600;color:#1a202c;}
    .drug-regimen{font-size:12px;color:#718096;margin-top:2px;}
    .drug-guide-list{margin-top:10px;display:grid;gap:6px;}
    .guide-row{display:grid;grid-template-columns:44px 1fr;gap:8px;align-items:start;}
    .guide-label{font-size:11px;font-weight:700;color:#0f766e;letter-spacing:-0.01em;}
    .guide-copy{font-size:12px;color:#475569;line-height:1.55;}

    /* ── Warning cards ── */
    .warn-card{border-radius:14px;padding:14px 16px;margin-bottom:10px;}
    .warn-critical{background:#fff5f5;border:1.5px solid #fc8181;}
    .warn-moderate{background:#fffbeb;border:1.5px solid #f6ad55;}
    .warn-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
    .warn-icon{font-size:16px;}
    .warn-drugs{font-size:13px;font-weight:600;color:#1a202c;flex:1;}
    .sev-badge{font-size:10px;font-weight:700;padding:2px 9px;border-radius:999px;}
    .sev-crit{background:#fed7d7;color:#c53030;}
    .sev-mod{background:#fef3c7;color:#c05621;}
    .bullet-list{list-style:none;padding:0;margin:0;}
    .bullet-list li{
      font-size:13px;color:#374151;
      padding:4px 0 4px 22px;position:relative;line-height:1.5;
    }
    .bullet-list li::before{
      content:'→';position:absolute;left:0;
      color:#9ca3af;font-weight:700;
    }

    /* ── Condition notes ── */
    .cond-note{
      font-size:13px;color:#2d3748;
      padding:9px 13px;background:#f0fdfa;
      border-radius:12px;margin-bottom:8px;
      border-left:3px solid #0d9488;line-height:1.6;
    }

    /* ── All-clear ── */
    .all-clear{
      display:flex;align-items:center;gap:12px;
      background:#f0fff4;border-radius:14px;padding:14px;
    }
    .all-clear-icon{font-size:26px;}
    .all-clear-title{font-size:14px;font-weight:600;color:#276749;}
    .all-clear-sub{font-size:12px;color:#68d391;margin-top:2px;}

    /* ── Emergency section ── */
    .emergency{
      background:#fff7ed;border-radius:20px;
      border:1.5px solid #f6ad55;
      padding:20px 22px;margin-bottom:14px;
    }
    .emg-title{
      font-size:15px;font-weight:700;color:#c05621;
      display:flex;align-items:center;gap:8px;margin-bottom:12px;
    }
    .emg-grid{
      display:grid;grid-template-columns:1fr 1fr;gap:7px;
    }
    .emg-item{
      font-size:12px;color:#9a3412;
      padding:7px 11px;background:#ffedd5;
      border-radius:10px;line-height:1.4;
      display:flex;align-items:flex-start;gap:5px;
    }
    .emg-item::before{content:'!';font-weight:800;color:#ea580c;flex-shrink:0;}

    /* ── Footer ── */
    .footer{text-align:center;padding-top:6px;}
    .footer p{font-size:11px;color:#a0aec0;line-height:1.7;}

    @media print{
      body{background:#fff;}
      .page{background:#fff;max-width:100%;padding:20px;}
      @page{margin:.8cm;size:A4;}
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="top-bar">
    <div>
      <div class="doc-title">🏥 보호자 퇴원 안내문</div>
      <div class="doc-date">${dateStr}</div>
    </div>
    <div class="brand">
      <div class="brand-name">NUVOVET</div>
      <div class="brand-sub">수의약물 관리 시스템</div>
    </div>
  </div>

  <!-- Patient card -->
  <div class="patient-card">
    <div class="pet-emoji">${speciesEmoji}</div>
    <div style="flex:1;min-width:0">
      <div class="pet-name">${patientInfo?.name || '환자'}</div>
      <div class="pet-meta">
        ${speciesLabel}${patientInfo?.breed ? ` · ${patientInfo.breed}` : ''}${patientInfo?.weight ? ` · ${patientInfo.weight} kg` : ''}
      </div>
      ${
        (patientInfo?.conditions || []).length > 0
          ? `<div class="chip-row">${patientInfo.conditions
              .slice(0, 4)
              .map((c) => `<span class="chip">${c}</span>`)
              .join('')}</div>`
          : ''
      }
    </div>
  </div>

  <!-- Drugs -->
  <div class="section">
    <div class="sec-header">
      <span class="sec-icon">💊</span>
      <span class="sec-title">처방 약물 (${drugs.length}종)</span>
    </div>
    ${drugRows || '<p style="color:#a0aec0;font-size:13px">처방된 약물이 없습니다</p>'}
  </div>

  <div class="section">
    <div class="sec-header">
      <span class="sec-icon">🕒</span>
      <span class="sec-title">집에서 약 줄 때 기억할 점</span>
    </div>
    <ul class="bullet-list">
      ${routineTips.map((tip) => `<li>${tip}</li>`).join('')}
    </ul>
  </div>

  <!-- Interaction warnings -->
  ${warningsSection}

  <!-- Condition-specific notes -->
  ${conditionSection}

  <!-- Emergency -->
  <div class="emergency">
    <div class="emg-title">🚨 즉시 병원에 연락해야 할 증상</div>
    <div class="emg-grid">
      ${emergencyList.map((s) => `<div class="emg-item">${s}</div>`).join('')}
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>
      이 안내문은 보호자를 위한 간소화된 정보입니다.<br/>
      자세한 임상 정보는 담당 수의사에게 문의하세요.<br/>
      NUVOVET · vetdur.nuvovet.com
    </p>
  </div>

</div>
</body>
</html>`;
}

// ── Exported button component ────────────────────────────────────
export function OwnerDischargeButton({ results, patientInfo, drugs }) {
  const { lang } = useI18n();

  const handlePrint = () => {
    const html = buildOwnerHTML({ results, patientInfo, drugs });
    const win = window.open('', '_blank', 'width=780,height=920');
    if (!win) {
      alert('팝업 차단이 설정되어 있습니다. 팝업을 허용해주세요.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center justify-center gap-1.5 px-4 py-2.5 w-full bg-teal-600 text-white text-[13px] font-medium rounded-lg hover:bg-teal-500 transition-colors"
    >
      <Heart size={14} />
      {lang === 'ko' ? '보호자 퇴원 안내문' : 'Owner Discharge Note'}
    </button>
  );
}
