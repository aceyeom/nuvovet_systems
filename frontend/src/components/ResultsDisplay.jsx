import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, AlertCircle, Info, CheckCircle, ChevronDown, ChevronUp,
  BookOpen, FlaskConical, Globe, HelpCircle, Dna, ArrowLeft,
  Check, Lightbulb, FileText, Clock, Pill, Flag, Printer, Download,
  Mail, Send, ArrowRight
} from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { DRUG_SOURCE } from '../data/drugDatabase';
// DrugTimeline (PK graph) removed from results page per visualization overhaul
import { NuvovetLogo } from './NuvovetLogo';
import { OrganLoadIndicator } from './OrganLoadIndicator';
import { ConfidenceProvenance } from './ConfidenceProvenance';
import { ScanExportButton } from './ScanExportPDF';
import { useI18n } from '../i18n';
import { formatMechanismApi } from '../lib/api';

// ── Formatted Mechanism Display ─────────────────────────────────
// Renders mechanism text with structure: either AI-formatted (bullet points)
// or raw text with basic formatting applied.
function FormattedMechanismText({ text, className = '' }) {
  if (!text) return null;

  // Check if text contains bullet point markers (from AI formatting or templates)
  const hasBullets = text.includes('•') || text.includes('MECHANISM') || text.includes('RECOMMENDED');

  if (hasBullets) {
    const lines = text.split('\n');
    return (
      <div className={`space-y-1 ${className}`}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          // Section headers (ALL CAPS)
          if (/^[A-Z\s]{4,}$/.test(trimmed) && !trimmed.startsWith('•')) {
            return (
              <p key={i} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2 first:mt-0">
                {trimmed}
              </p>
            );
          }
          // Bullet points
          if (trimmed.startsWith('•')) {
            return (
              <p key={i} className="text-[12px] text-slate-700 leading-relaxed pl-3">
                {trimmed}
              </p>
            );
          }
          // Regular text
          return <p key={i} className="text-[12px] text-slate-700 leading-relaxed">{trimmed}</p>;
        })}
      </div>
    );
  }

  // Plain text — render as-is
  return <p className={`text-[12px] text-slate-700 leading-relaxed ${className}`}>{text}</p>;
}

// ── AI Format Button ────────────────────────────────────────────
// Calls the /api/format/mechanism endpoint to get structured text
function AIFormatButton({ interaction, onFormatted }) {
  const [loading, setLoading] = useState(false);
  const [formatted, setFormatted] = useState(null);
  const { t } = useI18n();

  const handleFormat = async (e) => {
    e.stopPropagation();
    if (formatted || loading) return;
    setLoading(true);
    try {
      const result = await formatMechanismApi({
        drug_a_name: interaction.drugA || '',
        drug_b_name: interaction.drugB || '',
        interaction_type: interaction.rule?.includes('Disease') ? 'drug-disease' : 'drug-drug',
        severity: interaction.severity?.label || 'Unknown',
        rule_name: interaction.rule || '',
        mechanism_text: interaction.mechanism || '',
        recommendation_text: interaction.recommendation || '',
        alternative_suggestion: interaction.alternativeSuggestion || '',
        literature_summary: interaction.literatureSummary || '',
        raw_interaction_keywords: [],
        drug_a_class: interaction.drugAClass || '',
        drug_b_class: interaction.drugBClass || '',
        literature_refs: (interaction.literature || []).map(r => ({
          title: r.title, source: r.source, confidence: r.confidence,
        })),
      });
      if (result) {
        setFormatted(result);
        if (onFormatted) onFormatted(result);
      }
    } catch (err) {
      console.warn('Format mechanism failed:', err);
    }
    setLoading(false);
  };

  if (formatted) {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-medium">
          <FlaskConical size={10} />
          <span>AI-formatted from verified data</span>
          {formatted.data_sources?.length > 0 && (
            <span className="text-slate-400 ml-1">
              (sources: {formatted.data_sources.join(', ')})
            </span>
          )}
        </div>
        <FormattedMechanismText text={formatted.formatted_full} />
      </div>
    );
  }

  return (
    <button
      onClick={handleFormat}
      disabled={loading}
      className="flex items-center gap-1.5 text-[10px] font-medium text-blue-500 hover:text-blue-700 transition-colors mt-1.5 disabled:opacity-50"
    >
      <FlaskConical size={10} />
      {loading ? 'Formatting...' : 'Format with AI'}
    </button>
  );
}

// ── Demo Upgrade Banner ─────────────────────────────────────────
function DemoUpgradeBanner({ lang }) {
  const navigate = useNavigate();
  return (
    <div className="bg-slate-900 text-white no-print">
      <div className="w-full px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div>
          <p className="text-[17px] font-black mb-1">
            {lang === 'ko' ? '전체 기능을 사용할 준비가 되셨나요?' : 'Ready to access the full version?'}
          </p>
          <p className="text-[13px] text-slate-400">
            {lang === 'ko'
              ? '실제 환자 데이터로 완전한 DUR 분석을 경험하세요'
              : 'Experience complete DUR analysis with your real patients'}
          </p>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors"
        >
          {lang === 'ko' ? '플랜 보기 / View Plans' : 'View Plans'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Overall Severity Banner ─────────────────────────────────────
function SeverityBanner({ results, drugs = [] }) {
  const { t, lang } = useI18n();
  const { interactions, drugFlags, confidenceScore, overallSeverity } = results;
  const patientAlerts = results.patientAlerts || [];
  const criticalCount = interactions.filter(i => i.severity.label === 'Critical').length
    + patientAlerts.filter(a => a.severity?.label === 'Critical').length;
  const moderateCount = interactions.filter(i => i.severity.label === 'Moderate').length
    + patientAlerts.filter(a => a.severity?.label === 'Moderate').length;
  const minorCount = interactions.filter(i => i.severity.label === 'Minor' || i.severity.label === 'Unknown').length
    + patientAlerts.filter(a => a.severity?.label === 'Minor').length;

  const isCritical = overallSeverity?.label === 'Critical';
  const isModerate = overallSeverity?.label === 'Moderate';
  const isClear = interactions.length === 0 && patientAlerts.length === 0;

  const bannerBg = isCritical
    ? 'bg-red-50 border-red-300'
    : isModerate
    ? 'bg-amber-50 border-amber-300'
    : isClear
    ? 'bg-emerald-50 border-emerald-300'
    : 'bg-yellow-50 border-yellow-200';

  const iconColor = isCritical
    ? 'text-red-500'
    : isModerate
    ? 'text-amber-500'
    : isClear
    ? 'text-emerald-500'
    : 'text-yellow-500';

  const SeverityIcon = isCritical ? AlertTriangle : isModerate ? AlertCircle : isClear ? CheckCircle : Info;

  const confColor = confidenceScore >= 85 ? 'text-emerald-600' : confidenceScore >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className={`rounded-xl border-2 p-4 mb-5 animate-fade-in ${bannerBg}`}>
      <div className="flex items-start gap-4">
        <div className={`shrink-0 mt-0.5 ${iconColor}`}>
          <SeverityIcon size={28} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <SeverityBadge severity={overallSeverity} size="lg" />
            <span className="text-[13px] font-semibold text-slate-800">
              {t.results.overallSeverity}
            </span>
          </div>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
            <span className="text-[13px] text-slate-600">
              <span className="font-semibold text-slate-900">{drugFlags.length}</span>{' '}
              {t.results.drugsScreenedInline}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-[13px] text-slate-600">
              <span className="font-semibold text-slate-900">{interactions.length}</span>{' '}
              {t.results.interactionsInline}
            </span>
            {criticalCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[12px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {criticalCount} {t.results.critical}
                </span>
              </>
            )}
            {moderateCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[12px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {moderateCount} {t.results.moderate}
                </span>
              </>
            )}
            {minorCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[12px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {minorCount} {t.results.minor}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-2xl font-bold ${confColor}`}>{confidenceScore}%</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">{t.results.confidence}</div>
          <div className="mt-1 w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${confidenceScore >= 85 ? 'bg-emerald-500' : confidenceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Map patient alert types to patient fields ───────────────────
const ALERT_FIELD_MAP = {
  'breed-risk':               'breed',
  'mdr1-pgp-inhibitor':       'breed',
  'species-pharmacogenetic':  'species',
  'species-contraindication': 'species',
  'excipient-toxicity':       'species',
  'drug-disease':             'conditions',
  'condition-drug-monitoring':'conditions',
  'creatinine-adjustment':    'flaggedLabs',
  'lab-interference':         'flaggedLabs',
  'developmental':            'age',
  'dose-exceeded':            'weight',
  'species-dose-caution':     'weight',
  'triple-nephrotoxic':       'conditions',
  'triple-sedation':          'conditions',
};

const FIELD_LABELS = {
  breed:      { ko: '품종', en: 'Breed' },
  species:    { ko: '종', en: 'Species' },
  conditions: { ko: '기저질환', en: 'Conditions' },
  flaggedLabs:{ ko: '검사 수치', en: 'Lab Values' },
  age:        { ko: '연령', en: 'Age' },
  weight:     { ko: '체중/용량', en: 'Weight/Dose' },
};

// ── Patient Risk Profile (shows only fields that triggered alerts) ──
function PatientRiskProfile({ patientAlerts = [], lang }) {
  const fieldGroups = {};
  patientAlerts.forEach(alert => {
    const field = ALERT_FIELD_MAP[alert.type] || 'other';
    if (!fieldGroups[field]) fieldGroups[field] = [];
    fieldGroups[field].push(alert);
  });

  const activeFields = Object.entries(fieldGroups);
  if (activeFields.length === 0) {
    return (
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-[11px] text-emerald-600 font-medium">
          환자 특이 위험 요소 없음 / No patient-specific risk factors
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        환자 위험 프로필 / Risk Profile
      </p>
      <div className="space-y-1.5">
        {activeFields.map(([field, alerts]) => {
          const label = FIELD_LABELS[field] || { ko: field, en: field };
          const hasCritical = alerts.some(a => a.severity?.label === 'Critical');
          const dotColor = hasCritical ? 'bg-red-500' : 'bg-amber-400';
          const textColor = hasCritical ? 'text-red-700' : 'text-amber-700';
          const bgColor = hasCritical ? 'bg-red-50' : 'bg-amber-50';

          return (
            <div key={field} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${bgColor}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <span className={`text-[11px] font-semibold ${textColor}`}>
                  {lang === 'ko' ? label.ko : label.en}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">
                  ({alerts.length})
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {alerts.slice(0, 3).map((a, i) => (
                    <span key={i} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${
                      a.severity?.label === 'Critical'
                        ? 'text-red-600 bg-red-100 border-red-200'
                        : 'text-amber-600 bg-amber-100 border-amber-200'
                    }`}>
                      {a.drug || a.rule?.slice(0, 30)}
                    </span>
                  ))}
                  {alerts.length > 3 && (
                    <span className="text-[9px] text-slate-400">+{alerts.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Patient Summary Panel (left panel) ────────────────────────
// NOTE: Severity breakdown (critical/moderate/minor counts) is shown only in
// the SeverityBanner (main content area) to avoid duplication. This panel
// shows patient info, drug count, interaction count, organ load, and confidence.
function PatientSummaryPanel({ results, patientInfo, drugs = [], species = 'dog' }) {
  const { t, lang } = useI18n();
  const { interactions, drugFlags, confidenceScore } = results;
  const patientAlerts = results.patientAlerts || [];

  return (
    <div className="space-y-3">
      {patientInfo?.name && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          {patientInfo.imageUrl && (
            <div className="mb-3 h-52 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src={patientInfo.imageUrl}
                alt={`${patientInfo.breed || patientInfo.species || 'patient'} profile`}
                className="w-full h-full object-cover"
                style={{ objectPosition: patientInfo.imagePosition || '50% 35%' }}
                loading="lazy"
              />
            </div>
          )}
          <h3 className="typo-section-header mb-3">{t.results.patient}</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline gap-2">
              <span className="typo-label shrink-0">{t.results.patient}</span>
              <span className="typo-drug-name text-[13px] text-right truncate">{patientInfo.name}</span>
            </div>
            {patientInfo.species && (
              <div className="flex justify-between items-baseline gap-2">
                <span className="typo-label shrink-0">{t.results.species}</span>
                <span className="text-[13px] font-medium text-slate-700 text-right">{patientInfo.species === 'dog' ? t.species.dog : t.species.cat}</span>
              </div>
            )}
            {patientInfo.breed && (
              <div className="flex justify-between items-baseline gap-2">
                <span className="typo-label shrink-0">{t.results.breed}</span>
                <span className="text-[13px] font-medium text-slate-700 text-right truncate">{patientInfo.breed}</span>
              </div>
            )}
            {patientInfo.weight && (
              <div className="flex justify-between items-baseline gap-2">
                <span className="typo-label shrink-0">{t.results.weight}</span>
                <span className="text-[13px] font-medium text-slate-700">{patientInfo.weight} kg</span>
              </div>
            )}
          </div>
          {patientInfo.conditions && patientInfo.conditions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="typo-label block mb-1.5">{t.results.conditions}</span>
              <div className="flex flex-wrap gap-1">
                {patientInfo.conditions.map((c, i) => (
                  <span key={i} className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">{c}</span>
                ))}
              </div>
            </div>
          )}
          {patientInfo.flaggedLabs && patientInfo.flaggedLabs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="typo-label block mb-1.5">{t.results.flaggedLabs}</span>
              <div className="flex flex-wrap gap-1">
                {patientInfo.flaggedLabs.map((lab, i) => (
                  <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${lab.status === 'high' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                    {lab.key}: {lab.value} {lab.unit} {lab.status === 'high' ? '↑' : '↓'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Patient Risk Profile — only shows fields that triggered alerts */}
          <PatientRiskProfile patientAlerts={patientAlerts} lang={lang} />
        </div>
      )}

      {/* Scan summary — drug count + interaction count only (severity breakdown is in the banner above) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="typo-section-header mb-3">{t.results.scanSummary}</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="typo-label">{t.results.drugsScreened}</span>
            <span className="typo-score font-semibold text-slate-900">{drugFlags.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="typo-label">{t.results.interactions}</span>
            <span className="typo-score font-semibold text-slate-900">{interactions.length}</span>
          </div>
        </div>
      </div>

      {/* Cumulative Organ Load — prominent, always expanded (core differentiator) */}
      <OrganLoadIndicator drugs={drugs} patientInfo={patientInfo} species={species} />

      {/* Confidence Provenance */}
      <ConfidenceProvenance
        confidenceScore={confidenceScore}
        drugs={drugs}
        species={species}
      />
    </div>
  );
}

function ClassChip({ label }) {
  return <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{label}</span>;
}

// ── Why Dangerous Panel ──────────────────────────────────────────
// Critical (severity 3): always fully visible — no toggle required.
// Moderate (severity 2): toggleable.
function WhyDangerousPanel({ interaction, t }) {
  const severityLabel = interaction.severity?.label;
  const isCritical = severityLabel === 'Critical';
  // Critical is always open; Moderate starts collapsed
  const [open, setOpen] = useState(isCritical);

  if (isCritical) {
    // Always-expanded — no toggle button
    return (
      <div className="px-4 pb-3 border-t border-slate-100/50 space-y-3">
        <p className={`text-[11px] font-semibold flex items-center gap-1.5 text-red-600`}>
          <AlertTriangle size={11} className="text-red-500" />
          {t.results.whyDangerous}
        </p>
        <div className="bg-red-50/70 border border-red-200 rounded-lg px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500">
            {t.results.mechanismSection}
          </p>
          <p className="text-[12px] text-slate-700 leading-relaxed">
            {interaction.mechanism || <span className="text-slate-400 italic">기전 상세 정보를 현재 데이터베이스에서 확인할 수 없습니다. / Mechanism detail not available in current database.</span>}
          </p>
        </div>
        <div className="flex items-start gap-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2.5">
          <AlertTriangle size={13} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-[12px] font-semibold text-red-800">{t.results.actionContraindicated}</p>
        </div>
        {interaction.literatureSummary && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500">
              {t.results.clinicalSignificance}
            </p>
            <p className="text-[12px] text-slate-600 leading-relaxed bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              {interaction.literatureSummary}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Moderate — toggleable
  return (
    <div className="px-4 pb-3 border-t border-slate-100/50">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 hover:text-amber-800 transition-colors"
      >
        <AlertTriangle size={11} className="text-amber-500" />
        {t.results.whyDangerous}
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <div className="mt-2.5 space-y-3 animate-fade-in">
          <div className="bg-amber-50/50 border border-amber-200 rounded-lg px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500">
              {t.results.mechanismSection}
            </p>
            <p className="text-[12px] text-slate-700 leading-relaxed">
              {interaction.mechanism || <span className="text-slate-400 italic">기전 상세 정보를 현재 데이터베이스에서 확인할 수 없습니다. / Mechanism detail not available in current database.</span>}
            </p>
          </div>
          {interaction.literatureSummary && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500">
                {t.results.clinicalSignificance}
              </p>
              <p className="text-[12px] text-slate-600 leading-relaxed bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                {interaction.literatureSummary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Interaction Card ────────────────────────────────────────────
function InteractionCard({ interaction, index, acknowledged, noted, onAcknowledge, onNote, isFullSystem, wasRefined }) {
  const { t } = useI18n();
  const isMinor = interaction.severity?.label === 'Minor' || interaction.severity?.label === 'Unknown';
  const isSignificant = interaction.severity?.label === 'Critical' || interaction.severity?.label === 'Moderate';
  const [expanded, setExpanded] = useState(isMinor ? false : index === 0);
  const [showLiterature, setShowLiterature] = useState(false);
  const severityLabel = interaction.severity?.label;

  const cardBg = () => {
    if (severityLabel === 'Critical') return 'bg-red-50 border-red-200';
    if (severityLabel === 'Moderate') return 'bg-amber-50/60 border-amber-200';
    return 'bg-white border-slate-200';
  };

  const accentBorder = () => {
    if (severityLabel === 'Critical') return 'border-l-[3px] border-l-red-500';
    if (severityLabel === 'Moderate') return 'border-l-[3px] border-l-amber-400';
    return '';
  };

  if (isMinor && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border transition-all hover:shadow-sm ${cardBg()} ${acknowledged ? 'opacity-60' : ''} animate-stagger-fade-in`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <SeverityBadge severity={interaction.severity} />
        <span className="typo-drug-name text-[13px] flex-1 text-left min-w-0 break-words">{interaction.drugA} + {interaction.drugB}</span>
        {wasRefined && (
          <span className="text-[9px] font-medium text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full shrink-0">
            {t.results.refinedAlert}
          </span>
        )}
        <span className="text-[11px] text-slate-400 shrink-0 hidden sm:block">{interaction.rule}</span>
        <ChevronDown size={12} className="text-slate-400 shrink-0" />
      </button>
    );
  }

  const recBoxBg = () => {
    if (severityLabel === 'Critical') return 'bg-red-100/70 border-red-200';
    if (severityLabel === 'Moderate') return 'bg-amber-100/50 border-amber-200';
    return 'bg-blue-50 border-blue-100';
  };

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md ${accentBorder()} ${cardBg()} ${acknowledged ? 'opacity-70' : ''} print-break-inside-avoid animate-stagger-fade-in`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Zone 1: Header */}
      <div className={`px-4 py-3.5 cursor-pointer ${severityLabel === 'Critical' ? 'bg-red-50' : severityLabel === 'Moderate' ? 'bg-amber-50/40' : 'bg-white'}`} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="typo-drug-name break-words">{interaction.drugA} + {interaction.drugB}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {interaction.drugAClass && <ClassChip label={interaction.drugAClass} />}
              <span className="text-slate-300 text-[10px]">+</span>
              {interaction.drugBClass && <ClassChip label={interaction.drugBClass} />}
              {wasRefined && (
                <span className="text-[9px] font-medium text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full">
                  ✦ {t.results.refinedAlert}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SeverityBadge severity={interaction.severity} />
            {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="animate-fade-in">
          {/* Zone 2: Mechanism */}
          <div className="px-4 py-3 bg-white border-t border-slate-100/50">
            <h4 className="typo-section-header text-[11px] mb-1.5">{t.results.whatHappens.toUpperCase()}</h4>
            <FormattedMechanismText text={interaction.mechanism} />
            <AIFormatButton interaction={interaction} />
          </div>

          {/* "Why is this dangerous?" — severity Moderate + Critical only */}
          {isSignificant && (
            <WhyDangerousPanel interaction={interaction} t={t} />
          )}

          {/* Zone 3: Recommendation */}
          <div className="px-4 py-3 border-t border-slate-100/50">
            <div className={`rounded-lg border px-3.5 py-3 ${recBoxBg()}`}>
              <h4 className="typo-section-header text-[11px] mb-1.5">{t.results.recommendedAction.toUpperCase()}</h4>
              <p className="typo-rec text-slate-800 leading-relaxed">{interaction.recommendation}</p>

              {interaction.alternativeSuggestion && severityLabel === 'Critical' && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/50">
                  <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
                    <Lightbulb size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">{t.results.alternativeSuggestion}</p>
                      <p className="text-[13px] text-emerald-800 font-medium leading-relaxed">{interaction.alternativeSuggestion}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Literature — interaction-level refs + PMC references from drug data */}
          <div className="px-4 pb-3">
            <button
              onClick={(e) => { e.stopPropagation(); setShowLiterature(!showLiterature); }}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              <BookOpen size={11} />
              {t.results.evidenceRefs}
              {showLiterature ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {showLiterature && (
              <div className="mt-2 space-y-2 animate-fade-in">
                {interaction.literatureSummary ? (
                  <FormattedMechanismText
                    text={interaction.literatureSummary}
                    className="bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-100"
                  />
                ) : null}
                {/* Interaction-level literature references */}
                {(interaction.literature || []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rule References</p>
                    {interaction.literature.map((ref, i) => (
                      <div key={`rule-${i}`} className="text-[11px] text-slate-500 px-2.5 py-1.5 bg-slate-50 rounded mb-1">
                        <p className="font-medium text-slate-600">{ref.title}</p>
                        <p className="typo-label">{ref.source}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* PMC references from drug_references table (via evidenceReferences on drug data) */}
                {(() => {
                  const pmcRefs = [
                    ...(interaction.drugAData?.evidenceReferences || []),
                    ...(interaction.drugBData?.evidenceReferences || []),
                  ].filter(r => r.pmc_id && r.title);
                  // Deduplicate by pmc_id
                  const seen = new Set();
                  const uniqueRefs = pmcRefs.filter(r => {
                    if (seen.has(r.pmc_id)) return false;
                    seen.add(r.pmc_id);
                    return true;
                  }).slice(0, 5); // Show top 5
                  if (uniqueRefs.length === 0) return null;
                  return (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">PMC Literature</p>
                      {uniqueRefs.map((ref, i) => (
                        <div key={`pmc-${i}`} className="text-[11px] text-slate-500 px-2.5 py-1.5 bg-blue-50/50 rounded mb-1 border border-blue-100/50">
                          <p className="font-medium text-slate-600">{ref.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="typo-label text-blue-600">PMC{ref.pmc_id}</span>
                            {ref.if_score && <span className="typo-label">IF: {ref.if_score}</span>}
                            {ref.url && (
                              <a href={ref.url} target="_blank" rel="noopener noreferrer"
                                 className="text-blue-500 hover:text-blue-700 underline typo-label"
                                 onClick={e => e.stopPropagation()}>
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {/* No references at all */}
                {(interaction.literature || []).length === 0 &&
                 !interaction.literatureSummary &&
                 !(interaction.drugAData?.evidenceReferences?.length) &&
                 !(interaction.drugBData?.evidenceReferences?.length) && (
                  <p className="text-[11px] text-slate-400 italic px-1">{t.results.sourceNotAvailable}</p>
                )}
              </div>
            )}
          </div>

          {/* Acknowledgment row — Full System only */}
          {isFullSystem && (
            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); onAcknowledge(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${acknowledged ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
              >
                <Check size={12} className={acknowledged ? 'text-emerald-600' : 'text-slate-400'} />
                {t.results.reviewed}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNote(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${noted ? 'bg-slate-100 text-slate-600 border border-slate-300' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}
              >
                <Flag size={10} />
                {t.results.noted}
              </button>
              <span className="text-[10px] text-slate-400 ml-auto italic">{t.results.clinicalJudgment}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Drug Flag Card ──────────────────────────────────────────────
function DrugFlagCard({ drugFlag, species }) {
  const [expanded, setExpanded] = useState(false);
  if (drugFlag.flags.length === 0 && !drugFlag.speciesNote) return null;

  const sourceIcon = () => {
    if (drugFlag.source === DRUG_SOURCE.HUMAN_OFFLABEL) return <FlaskConical size={13} className="text-amber-500" />;
    if (drugFlag.source === DRUG_SOURCE.FOREIGN) return <Globe size={13} className="text-blue-500" />;
    if (drugFlag.source === DRUG_SOURCE.UNKNOWN) return <HelpCircle size={13} className="text-slate-400" />;
    return <Pill size={13} className="text-emerald-500" />;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2.5 text-left">
        {sourceIcon()}
        <span className="text-[13px] font-medium text-slate-800 flex-1 min-w-0 truncate">{drugFlag.drugName}</span>
        {drugFlag.hasSpeciesWarning && (
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full border shrink-0 ${species === 'dog' ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-violet-300 bg-violet-50 text-violet-600'}`}>
            {species === 'dog' ? '🐕' : '🐈'}
          </span>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {drugFlag.flags.map((f, i) => (
            <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${f.type === 'off-label' ? 'bg-amber-50 text-amber-600' : f.type === 'foreign' ? 'bg-blue-50 text-blue-600' : f.type === 'mdr1' || f.type === 'nti' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              {f.label}
            </span>
          ))}
          {expanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {drugFlag.flags.map((f, i) => <p key={i} className="typo-body">{f.description}</p>)}
          {drugFlag.speciesNote && (
            <div className="flex items-start gap-1.5 typo-body bg-slate-50 px-2.5 py-2 rounded">
              <Dna size={11} className="text-slate-400 mt-0.5 shrink-0" />
              <p>{drugFlag.speciesNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Action Bar (always visible at bottom of results) ────────────
function ResultsActionBar({ results, patientInfo, drugs, species, lang, t }) {
  const { drugFlags, interactions } = results;

  const handleEmailPrint = () => {
    // Open print dialog — doctor can print-to-PDF and email
    window.print();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm no-print">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle size={15} className="text-emerald-500 shrink-0" />
        <span className="text-[13px] font-semibold text-slate-700">
          {t.results.scanComplete}
        </span>
        <span className="text-[12px] text-slate-400 ml-auto">
          {new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')}
          {' · '}{drugFlags.length} {t.results.drugCountLabel}
          {' · '}{interactions.length} {t.results.interactionsFound}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleEmailPrint}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 text-[13px] font-medium rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
        >
          <Printer size={14} />
          {t.results.exportSummary}
        </button>
        <div className="flex-1 flex">
          <ScanExportButton
            results={results}
            patientInfo={patientInfo}
            drugs={drugs}
            species={species}
          />
        </div>
        <button
          onClick={() => {
            const subject = encodeURIComponent(
              lang === 'ko'
                ? `NUVOVET DUR 보고서 — ${patientInfo?.name || '환자'}`
                : `NUVOVET DUR Report — ${patientInfo?.name || 'Patient'}`
            );
            const body = encodeURIComponent(
              lang === 'ko'
                ? `DUR 분석 보고서\n\n환자: ${patientInfo?.name || '—'}\n날짜: ${new Date().toLocaleDateString('ko-KR')}\n검사 약물 수: ${drugFlags.length}\n발견된 상호작용: ${interactions.length}\n\n상세 내용은 전체 보고서를 출력하여 확인해 주세요.`
                : `DUR Analysis Report\n\nPatient: ${patientInfo?.name || '—'}\nDate: ${new Date().toLocaleDateString()}\nDrugs screened: ${drugFlags.length}\nInteractions found: ${interactions.length}\n\nPlease print the full report for details.`
            );
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
          }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-[13px] font-medium rounded-lg hover:bg-slate-800 transition-all"
        >
          <Mail size={14} />
          {t.results.sendViaEmail}
        </button>
      </div>
    </div>
  );
}

// ── Patient Alert Card ──────────────────────────────────────────
function PatientAlertCard({ alert, index }) {
  const [expanded, setExpanded] = useState(index < 3);

  const isCritical = alert.severity?.label === 'Critical';
  const isModerate = alert.severity?.label === 'Moderate';

  const typeLabel = {
    'mdr1-pgp-inhibitor':       '⚠ Pharmacogenetic Risk',
    'breed-risk':               '⚠ Breed-Specific Risk',
    'species-pharmacogenetic':  '⚠ Species Pharmacogenetic',
    'drug-disease':             '⚑ Drug–Disease Interaction',
    'creatinine-adjustment':    '⚑ Renal Dose Adjustment',
    'developmental':            '⛔ Developmental Contraindication',
    'lab-interference':         '⚗ Lab Interference Alert',
    'condition-drug-monitoring':'⚑ Monitoring Requirement',
    'species-contraindication': '⛔ Species Contraindication',
    'dose-exceeded':            '⛔ Dose Ceiling Exceeded',
    'species-dose-caution':     '⚠ Species Dose Caution',
    'triple-nephrotoxic':       '⛔ Triple Nephrotoxic Combination',
    'triple-sedation':          '⛔ Triple Sedation Escalation',
    'excipient-toxicity':       '⛔ Excipient Toxicity',
  }[alert.type] || '⚠ Clinical Alert';

  const cardBg = isCritical
    ? 'bg-red-50 border-red-300 border-l-[4px] border-l-red-600'
    : isModerate
    ? 'bg-amber-50 border-amber-200 border-l-[3px] border-l-amber-500'
    : 'bg-blue-50 border-blue-200';

  const headerBg = isCritical ? 'bg-red-50' : isModerate ? 'bg-amber-50/60' : 'bg-blue-50/60';

  return (
    <div
      className={`rounded-xl border overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md print-break-inside-avoid animate-stagger-fade-in ${cardBg}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={`px-4 py-3.5 cursor-pointer ${headerBg}`} onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <SeverityBadge severity={alert.severity} />
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isCritical ? 'text-red-700 bg-red-100' :
                isModerate ? 'text-amber-700 bg-amber-100' :
                'text-blue-700 bg-blue-100'
              }`}>{typeLabel}</span>
            </div>
            <p className="typo-drug-name text-[13px] break-words leading-snug">{alert.rule}</p>
            {alert.drug && (
              <p className="text-[11px] text-slate-500 mt-0.5">Drug: <span className="font-medium text-slate-700">{alert.drug}</span></p>
            )}
          </div>
          <div className="shrink-0 mt-0.5">
            {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="animate-fade-in">
          <div className="px-4 py-3 bg-white border-t border-slate-100/50">
            <h4 className="typo-section-header text-[11px] mb-1.5">MECHANISM / CLINICAL BASIS</h4>
            <p className="typo-body leading-relaxed text-[12px]">{alert.mechanism}</p>
          </div>
          <div className="px-4 py-3 border-t border-slate-100/50">
            <div className={`rounded-lg border px-3.5 py-3 ${
              isCritical ? 'bg-red-100/70 border-red-200' :
              isModerate ? 'bg-amber-100/50 border-amber-200' :
              'bg-blue-50 border-blue-100'
            }`}>
              <h4 className="typo-section-header text-[11px] mb-1.5">RECOMMENDED ACTION</h4>
              <p className="typo-rec text-slate-800 leading-relaxed text-[12px]">{alert.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: truncate mechanism text to ~1 sentence ─────────────
function truncateMechanism(text, maxLen = 120) {
  if (!text || text.length <= maxLen) return text || '';
  const sentenceEnd = text.indexOf('.', 60);
  if (sentenceEnd > 0 && sentenceEnd <= maxLen) return text.slice(0, sentenceEnd + 1);
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

// ── Unified Alert Card for the Priority Stack ──────────────────
function UnifiedAlertCard({ alert, index, acknowledged, noted, onAcknowledge, onNote, isFullSystem, wasRefined, lang, preformatted }) {
  const isCritical = alert.severity?.label === 'Critical';
  const isModerate = alert.severity?.label === 'Moderate';
  const forceOpen = isCritical || isModerate;
  const [expanded, setExpanded] = useState(forceOpen);

  const cardBg = isCritical
    ? 'bg-red-50 border-red-200'
    : isModerate
    ? 'bg-amber-50/60 border-amber-200'
    : 'bg-white border-slate-200';

  const accentBorder = isCritical
    ? 'border-l-[3px] border-l-red-500'
    : isModerate
    ? 'border-l-[3px] border-l-amber-400'
    : '';

  const headerBg = isCritical
    ? 'bg-red-50'
    : isModerate
    ? 'bg-amber-50/40'
    : 'bg-white';

  // Determine title and subtitle based on alert source
  const title = alert._src === 'interaction'
    ? `${alert.drugA} + ${alert.drugB}`
    : alert._src === 'patientAlert'
    ? (alert.rule || alert.drug)
    : alert._src === 'drugFlag'
    ? alert.drugName
    : alert.drug || alert.rule || '';

  const subtitle = alert._src === 'interaction'
    ? alert.rule
    : alert._src === 'patientAlert'
    ? (alert.drug ? `약물: ${alert.drug}` : '')
    : alert._src === 'drugFlag'
    ? (alert.flags || []).map(f => f.label).join(', ')
    : '';

  const mechanism = alert.mechanism || alert.note || alert.message || '';
  const recommendation = alert.recommendation || '';

  return (
    <div
      id={`alert-${alert._uid}`}
      className={`rounded-xl border overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md ${accentBorder} ${cardBg} animate-stagger-fade-in`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Header */}
      <div className={`px-4 py-3 cursor-pointer ${headerBg}`} onClick={() => !forceOpen && setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <SeverityBadge severity={alert.severity} />
              {alert._src === 'interaction' && alert.drugAClass && (
                <>
                  <ClassChip label={alert.drugAClass} />
                  <span className="text-slate-300 text-[10px]">+</span>
                  <ClassChip label={alert.drugBClass} />
                </>
              )}
              {wasRefined && alert._src === 'interaction' && (
                <span className="text-[9px] font-medium text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full">
                  ✦ Refined
                </span>
              )}
            </div>
            <p className="typo-drug-name text-[13px] break-words leading-snug">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
            {/* Inline mechanism preview for collapsed minor alerts */}
            {!expanded && mechanism && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{truncateMechanism(mechanism)}</p>
            )}
          </div>
          <div className="shrink-0 mt-0.5">
            {!forceOpen && (expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {(expanded || forceOpen) && (
        <div className="animate-fade-in">
          {/* Mechanism */}
          {mechanism && (
            <div className="px-4 py-3 bg-white border-t border-slate-100/50">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                기전 / Mechanism
              </h4>
              {preformatted ? (
                <>
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-medium mb-1.5">
                    <FlaskConical size={10} />
                    <span>AI-formatted from verified data</span>
                    {preformatted.data_sources?.length > 0 && (
                      <span className="text-slate-400 ml-1">(sources: {preformatted.data_sources.join(', ')})</span>
                    )}
                  </div>
                  <FormattedMechanismText text={preformatted.formatted_full} />
                </>
              ) : (
                <p className="text-[12px] text-slate-700 leading-relaxed">{mechanism}</p>
              )}
            </div>
          )}

          {/* Recommendation */}
          {(recommendation || preformatted?.formatted_recommendation) && (
            <div className="px-4 py-3 border-t border-slate-100/50">
              <div className={`rounded-lg border px-3.5 py-3 ${
                isCritical ? 'bg-red-100/70 border-red-200' :
                isModerate ? 'bg-amber-100/50 border-amber-200' :
                'bg-blue-50 border-blue-100'
              }`}>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  권장 조치 / Recommended Action
                </h4>
                <p className="typo-rec text-slate-800 leading-relaxed text-[12px]">{preformatted?.formatted_recommendation || recommendation}</p>
              </div>
            </div>
          )}

          {/* Alternative suggestion — Critical interactions only */}
          {alert._src === 'interaction' && alert.alternativeSuggestion && isCritical && (
            <div className="px-4 pb-3">
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
                <Lightbulb size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">
                    대안 제안 / Alternative
                  </p>
                  <p className="text-[12px] text-emerald-800 font-medium leading-relaxed">{alert.alternativeSuggestion}</p>
                </div>
              </div>
            </div>
          )}

          {/* Acknowledgment row — Full System only, interactions only */}
          {isFullSystem && alert._src === 'interaction' && (
            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap border-t border-slate-100/50 pt-2">
              <button
                onClick={(e) => { e.stopPropagation(); onAcknowledge?.(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${acknowledged ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
              >
                <Check size={12} className={acknowledged ? 'text-emerald-600' : 'text-slate-400'} />
                확인됨 / Reviewed
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onNote?.(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${noted ? 'bg-slate-100 text-slate-600 border border-slate-300' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}
              >
                <Flag size={10} />
                메모됨 / Noted
              </button>
              <span className="text-[10px] text-slate-400 ml-auto italic">임상 판단이 우선합니다</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Alert Priority Stack ───────────────────────────────────────
function AlertPriorityStack({
  interactions, patientAlerts, drugFlags, speciesNotes, flaggedDrugs,
  acknowledged, noted, setAcknowledged, setNoted,
  isFullSystem, wasRefined, species, lang, t, preformattedData,
}) {
  // Build unified alert list with deduplication
  const allAlerts = useMemo(() => {
    const alerts = [];
    const coveredDrugs = new Set(); // track drug names covered by interactions/patient alerts

    // 1. Interactions (richest data — always included)
    interactions.forEach((ix, i) => {
      alerts.push({
        ...ix,
        _src: 'interaction',
        _idx: i,
        _uid: `ix-${i}`,
        severity: ix.severity || { label: 'Unknown', score: 30, color: 'gray' },
      });
      coveredDrugs.add(ix.drugA?.toLowerCase());
      coveredDrugs.add(ix.drugB?.toLowerCase());
    });

    // 2. Patient alerts
    patientAlerts.forEach((pa, i) => {
      alerts.push({
        ...pa,
        _src: 'patientAlert',
        _idx: i,
        _uid: `pa-${i}`,
        severity: pa.severity || { label: 'Minor', score: 20, color: 'yellow' },
      });
      if (pa.drug) coveredDrugs.add(pa.drug.toLowerCase());
    });

    // 3. Drug flags — only if not already covered by interactions/patient alerts
    (flaggedDrugs || []).forEach((df, i) => {
      // Skip if no meaningful flags
      if (df.flags.length === 0 && !df.speciesNote) return;
      // Skip if this drug's issues are already covered
      const drugCovered = coveredDrugs.has(df.drugName?.toLowerCase());
      // Include if has flags not represented elsewhere (off-label, foreign, etc)
      const hasUniqueFlags = df.flags.some(f => f.type === 'off-label' || f.type === 'foreign' || f.type === 'unknown');
      if (drugCovered && !hasUniqueFlags) return;

      const worstFlag = df.flags.reduce((w, f) => {
        if (f.severity === 'critical') return 'Critical';
        if (f.severity === 'warning' && w !== 'Critical') return 'Moderate';
        return w;
      }, 'Minor');

      alerts.push({
        ...df,
        _src: 'drugFlag',
        _uid: `df-${i}`,
        severity: { label: worstFlag, score: worstFlag === 'Critical' ? 100 : worstFlag === 'Moderate' ? 50 : 20, color: worstFlag === 'Critical' ? 'red' : worstFlag === 'Moderate' ? 'orange' : 'yellow' },
        mechanism: df.flags.map(f => f.description).filter(Boolean).join(' '),
        recommendation: df.speciesNote || '',
      });
      coveredDrugs.add(df.drugName?.toLowerCase());
    });

    // 4. Species notes — only if not already covered
    (speciesNotes || []).forEach((sn, i) => {
      const drugLower = sn.drug?.toLowerCase();
      if (coveredDrugs.has(drugLower)) return; // already covered
      alerts.push({
        ...sn,
        _src: 'speciesNote',
        _uid: `sn-${i}`,
        severity: { label: 'Minor', score: 20, color: 'yellow' },
        mechanism: sn.note,
        recommendation: '',
      });
    });

    return alerts;
  }, [interactions, patientAlerts, flaggedDrugs, speciesNotes]);

  // Tier the alerts
  const tier1 = allAlerts.filter(a => a.severity?.label === 'Critical');
  const tier2 = allAlerts.filter(a => a.severity?.label === 'Moderate');
  const tier3 = allAlerts.filter(a => a.severity?.label !== 'Critical' && a.severity?.label !== 'Moderate');

  const totalAlerts = allAlerts.length;
  if (totalAlerts === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
        <p className="typo-drug-name text-emerald-800 mb-1">{t.results.noInteractions}</p>
        <p className="typo-body text-emerald-600">
          {t.results.noContraindicationsDetail}
        </p>
      </div>
    );
  }

  const renderAlertCard = (alert, idx) => {
    const isIx = alert._src === 'interaction';
    const ixIdx = alert._idx;
    return (
      <UnifiedAlertCard
        key={alert._uid}
        alert={alert}
        index={idx}
        acknowledged={isIx ? !!acknowledged[ixIdx] : false}
        noted={isIx ? !!noted[ixIdx] : false}
        onAcknowledge={isIx ? () => setAcknowledged(prev => ({ ...prev, [ixIdx]: !prev[ixIdx] })) : undefined}
        onNote={isIx ? () => setNoted(prev => ({ ...prev, [ixIdx]: !prev[ixIdx] })) : undefined}
        isFullSystem={isFullSystem}
        wasRefined={wasRefined}
        lang={lang}
        preformatted={preformattedData?.[alert._uid]}
      />
    );
  };

  const TierSection = ({ title, alerts, color, icon: Icon }) => {
    if (alerts.length === 0) return null;
    const bgMap = { red: 'bg-red-50 border-red-200', amber: 'bg-amber-50 border-amber-200', slate: 'bg-slate-50 border-slate-200' };
    const textMap = { red: 'text-red-700', amber: 'text-amber-700', slate: 'text-slate-600' };
    const badgeMap = { red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-700', slate: 'bg-slate-200 text-slate-600' };

    return (
      <div className="space-y-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bgMap[color]}`}>
          <Icon size={14} className={textMap[color]} />
          <span className={`text-[12px] font-bold ${textMap[color]}`}>{title}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeMap[color]}`}>{alerts.length}</span>
        </div>
        <div className="space-y-2.5">
          {alerts.map((a, i) => renderAlertCard(a, i))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <TierSection
        title="즉시 확인 필요 / Requires Immediate Review"
        alerts={tier1}
        color="red"
        icon={AlertTriangle}
      />
      <TierSection
        title="모니터링 필요 / Monitor Closely"
        alerts={tier2}
        color="amber"
        icon={AlertCircle}
      />
      <TierSection
        title="참고 사항 / Notes"
        alerts={tier3}
        color="slate"
        icon={Info}
      />
    </div>
  );
}

// ── Interaction Severity Matrix ────────────────────────────────
function InteractionMatrix({ drugs, interactions, lang }) {
  const drugNames = drugs.map(d => lang === 'ko' && d.nameKr ? d.nameKr : d.name);
  const drugIds = drugs.map(d => d.name);

  // Build lookup: (drugA, drugB) → severity
  const severityMap = {};
  interactions.forEach((ix, idx) => {
    const key1 = `${ix.drugA}|${ix.drugB}`;
    const key2 = `${ix.drugB}|${ix.drugA}`;
    severityMap[key1] = { severity: ix.severity, idx };
    severityMap[key2] = { severity: ix.severity, idx };
  });

  const cellColor = (severity) => {
    if (!severity) return 'bg-slate-100 text-slate-300';
    if (severity.label === 'Critical') return 'bg-red-100 text-red-700 hover:bg-red-200';
    if (severity.label === 'Moderate') return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
    if (severity.label === 'Minor' || severity.label === 'Unknown') return 'bg-blue-100 text-blue-600 hover:bg-blue-200';
    return 'bg-slate-100 text-slate-300';
  };

  const cellLabel = (severity) => {
    if (!severity) return '—';
    if (severity.label === 'Critical') return '3';
    if (severity.label === 'Moderate') return '2';
    return '1';
  };

  const handleCellClick = (idx) => {
    if (idx === undefined) return;
    const el = document.getElementById(`alert-ix-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400'), 1500);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
        상호작용 매트릭스 / Interaction Matrix
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-20" />
              {drugNames.map((name, i) => (
                <th key={i} className="text-[10px] font-semibold text-slate-600 px-1 py-1.5 text-center" style={{ minWidth: '40px' }}>
                  <span className="block truncate max-w-[60px]">{name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drugNames.map((rowName, ri) => (
              <tr key={ri}>
                <td className="text-[10px] font-semibold text-slate-600 pr-2 py-1 text-right truncate max-w-[80px]">{rowName}</td>
                {drugIds.map((_, ci) => {
                  if (ri === ci) {
                    return <td key={ci} className="p-0.5"><div className="w-full h-7 bg-slate-50 rounded" /></td>;
                  }
                  if (ri > ci) {
                    // Mirror of upper triangle
                    return <td key={ci} className="p-0.5"><div className="w-full h-7 bg-slate-50 rounded" /></td>;
                  }
                  const lookup = severityMap[`${drugIds[ri]}|${drugIds[ci]}`];
                  const sev = lookup?.severity;
                  const ixIdx = lookup?.idx;
                  return (
                    <td key={ci} className="p-0.5">
                      <button
                        onClick={() => handleCellClick(ixIdx)}
                        className={`w-full h-7 rounded text-[11px] font-bold transition-colors ${cellColor(sev)} ${sev ? 'cursor-pointer' : 'cursor-default'}`}
                        title={sev ? `${drugIds[ri]} + ${drugIds[ci]}: ${sev.label}` : ''}
                      >
                        {cellLabel(sev)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-100 border border-red-200" /><span className="text-[9px] text-slate-500">3 심각</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /><span className="text-[9px] text-slate-500">2 주의</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /><span className="text-[9px] text-slate-500">1 참고</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /><span className="text-[9px] text-slate-500">— 없음</span></div>
      </div>
    </div>
  );
}

// ── Main Results Display ────────────────────────────────────────
export function ResultsDisplay({ results, onBack, onNewAnalysis, patientInfo, isFullSystem = false, drugs = [], species = 'dog', onUpdatePatientRecord, hideSidebar = false, demoMode = false }) {
  const { t, lang } = useI18n();
  if (!results) return null;

  const { interactions, drugFlags, speciesNotes } = results;
  const patientAlerts = results.patientAlerts || [];
  const hasInteractions = interactions.length > 0;
  const flaggedDrugs = drugFlags.filter(f => f.flags.length > 0 || f.speciesNote);

  const [acknowledged, setAcknowledged] = useState({});
  const [noted, setNoted] = useState({});
  const acknowledgedCount = Object.values(acknowledged).filter(Boolean).length;
  const notedCount = Object.values(noted).filter(Boolean).length;
  const allReviewed = interactions.length > 0 && (acknowledgedCount + notedCount) >= interactions.length;
  const [showScanBar, setShowScanBar] = useState(false);
  const [showDiagnosisToast, setShowDiagnosisToast] = useState(false);
  const [isDiagnosisToastFading, setIsDiagnosisToastFading] = useState(false);
  const diagnosisToastFadeRef = useRef(null);
  const diagnosisToastHideRef = useRef(null);

  useEffect(() => {
    if (allReviewed) {
      const timer = setTimeout(() => setShowScanBar(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowScanBar(false);
    }
  }, [allReviewed]);

  useEffect(() => {
    return () => {
      if (diagnosisToastFadeRef.current) clearTimeout(diagnosisToastFadeRef.current);
      if (diagnosisToastHideRef.current) clearTimeout(diagnosisToastHideRef.current);
    };
  }, []);

  const handleCompleteAndRecordDiagnosis = () => {
    if (!onUpdatePatientRecord) return;

    onUpdatePatientRecord();

    if (diagnosisToastFadeRef.current) clearTimeout(diagnosisToastFadeRef.current);
    if (diagnosisToastHideRef.current) clearTimeout(diagnosisToastHideRef.current);

    setIsDiagnosisToastFading(false);
    setShowDiagnosisToast(true);

    diagnosisToastFadeRef.current = setTimeout(() => {
      setIsDiagnosisToastFading(true);
    }, 1400);

    diagnosisToastHideRef.current = setTimeout(() => {
      setShowDiagnosisToast(false);
      setIsDiagnosisToastFading(false);
    }, 1750);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h2 className="typo-page-title">{t.results.durReport}</h2>
              <p className="typo-label mt-0.5">
                {new Date(results.timestamp).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          {!demoMode && (
          <div className="shrink-0">
            <button
              onClick={handleCompleteAndRecordDiagnosis}
              disabled={!onUpdatePatientRecord}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold rounded-lg border transition-colors ${
                onUpdatePatientRecord
                  ? 'text-white bg-slate-900 border-slate-900 hover:bg-slate-800'
                  : 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
              }`}
              title="Complete and record diagnosis"
            >
              <CheckCircle size={14} />
              Complete and record diagnosis
            </button>
          </div>
          )}
        </div>

        {/* Print header */}
        <div className="hidden print-show mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="typo-drug-name">{patientInfo?.name}</p>
              <p className="typo-label">{new Date(results.timestamp).toLocaleDateString()}</p>
            </div>
            <NuvovetLogo size={32} className="text-slate-900" />
          </div>
        </div>

        {/* Layout: two-panel normally, or single-column when hideSidebar=true (three-col layout in FullSystem) */}
        <div className={`flex gap-5 ${hideSidebar ? 'flex-col' : 'flex-col lg:flex-row'}`}>
          {/* Left sidebar — patient summary (hidden when parent manages the layout) */}
          {!hideSidebar && (
          <div className="w-full lg:w-72 xl:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-20">
              <PatientSummaryPanel results={results} patientInfo={patientInfo} drugs={drugs} species={species} />
            </div>
          </div>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Prominent severity banner */}
            <SeverityBanner results={results} drugs={drugs} />

            {/* Unified Alert Priority Stack */}
            <AlertPriorityStack
              interactions={interactions}
              patientAlerts={patientAlerts}
              drugFlags={drugFlags}
              speciesNotes={speciesNotes}
              flaggedDrugs={flaggedDrugs}
              acknowledged={acknowledged}
              noted={noted}
              setAcknowledged={setAcknowledged}
              setNoted={setNoted}
              isFullSystem={isFullSystem}
              wasRefined={!!results.wasRefined}
              species={species}
              lang={lang}
              t={t}
              preformattedData={results.preformattedData}
            />

            {/* Interaction Severity Matrix — 3+ drugs AND at least 1 interaction */}
            {drugs.length >= 3 && interactions.length > 0 && (
              <InteractionMatrix
                drugs={drugs}
                interactions={interactions}
                lang={lang}
              />
            )}

            {/* Always-visible action bar (full system only) */}
            {!demoMode && (
              <ResultsActionBar
                results={results}
                patientInfo={patientInfo}
                drugs={drugs}
                species={species}
                lang={lang}
                t={t}
              />
            )}

            {!demoMode && (
            <div className="flex gap-3 no-print flex-wrap">
              <button onClick={onBack} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">{t.results.backToMeds}</button>
              <button onClick={onNewAnalysis} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">{t.results.newAnalysis}</button>
            </div>
            )}

            {demoMode && (
            <div className="flex gap-3 no-print flex-wrap">
              <button onClick={onBack} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">{lang === 'ko' ? '← 처방으로 돌아가기' : '← Back to Prescription'}</button>
              <button onClick={onNewAnalysis} className="flex-1 px-4 py-2.5 text-[13px] font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">{lang === 'ko' ? '새로 시작' : 'Start Over'}</button>
            </div>
            )}

            <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
              {t.results.disclaimer}
            </p>
          </div>
        </div>
      </div>

      {/* Demo upgrade banner */}
      {demoMode && (
        <DemoUpgradeBanner lang={lang} />
      )}

      {showDiagnosisToast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 shadow-lg transition-opacity duration-300 ${
            isDiagnosisToastFading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <p className="text-[12px] font-semibold text-emerald-700">Diagnosis was recorded.</p>
        </div>
      )}

      {/* Fixed bottom scan bar — shows only after full review in full system */}
      {showScanBar && !demoMode && (
        <div className="fixed bottom-0 left-0 right-0 z-30 no-print animate-slide-up-bar">
          <div className="bg-white border-t border-slate-200 shadow-lg px-4 sm:px-6 py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                <span className="text-[13px] font-medium text-slate-700 truncate">
                  {t.results.allReviewed} · {drugFlags.length} {t.results.drugCountLabel} · {interactions.length} {t.results.interactionsFound}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 text-[12px] font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <Printer size={13} />
                  {t.results.exportSummary}
                </button>
                <ScanExportButton
                  results={results}
                  patientInfo={patientInfo}
                  drugs={drugs}
                  species={species}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
