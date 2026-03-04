import React, { useState } from 'react';
import {
  AlertTriangle, AlertCircle, Info, CheckCircle, ChevronDown, ChevronUp,
  BookOpen, FlaskConical, Globe, HelpCircle, Dna, Shield, ArrowLeft
} from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { DRUG_SOURCE } from '../data/drugDatabase';

// ── Interaction Card ────────────────────────────────────────────
function InteractionCard({ interaction, index }) {
  const [expanded, setExpanded] = useState(index === 0);

  const severityIcon = () => {
    const label = interaction.severity?.label;
    if (label === 'Critical') return <AlertTriangle size={16} className="text-red-500" />;
    if (label === 'Moderate') return <AlertCircle size={16} className="text-amber-500" />;
    if (label === 'Minor') return <Info size={16} className="text-yellow-500" />;
    if (label === 'Unknown') return <HelpCircle size={16} className="text-slate-400" />;
    return <CheckCircle size={16} className="text-emerald-500" />;
  };

  const severityBorder = () => {
    const label = interaction.severity?.label;
    if (label === 'Critical') return 'border-l-red-500';
    if (label === 'Moderate') return 'border-l-amber-500';
    if (label === 'Minor') return 'border-l-yellow-400';
    return 'border-l-slate-300';
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden border-l-4 ${severityBorder()} transition-all duration-200`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="mt-0.5 shrink-0">{severityIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge severity={interaction.severity} />
            <span className="text-xs text-slate-400">{interaction.rule}</span>
          </div>
          <p className="text-sm font-medium text-slate-800">
            {interaction.drugA} + {interaction.drugB}
          </p>
        </div>
        <div className="shrink-0 mt-1 text-slate-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in border-t border-slate-100 pt-3">
          {/* Mechanism */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mechanism</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{interaction.mechanism}</p>
          </div>

          {/* Recommendation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommendation</h4>
            <p className="text-sm text-slate-700 leading-relaxed">{interaction.recommendation}</p>
          </div>

          {/* Literature */}
          {interaction.literature && interaction.literature.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <BookOpen size={11} />
                References
              </h4>
              <div className="space-y-1.5">
                {interaction.literature.map((ref, i) => (
                  <div key={i} className="text-xs text-slate-500 bg-slate-50 px-2.5 py-2 rounded">
                    <p className="font-medium text-slate-600">{ref.title}</p>
                    <p className="text-slate-400">{ref.source}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Drug Flag Card ──────────────────────────────────────────────
function DrugFlagCard({ drugFlag }) {
  const [expanded, setExpanded] = useState(false);

  if (drugFlag.flags.length === 0 && !drugFlag.speciesNote) return null;

  const sourceIcon = () => {
    if (drugFlag.source === DRUG_SOURCE.HUMAN_OFFLABEL) return <FlaskConical size={13} className="text-amber-500" />;
    if (drugFlag.source === DRUG_SOURCE.FOREIGN) return <Globe size={13} className="text-blue-500" />;
    if (drugFlag.source === DRUG_SOURCE.UNKNOWN) return <HelpCircle size={13} className="text-slate-400" />;
    return <Shield size={13} className="text-emerald-500" />;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 text-left"
      >
        {sourceIcon()}
        <span className="text-sm font-medium text-slate-800 flex-1">{drugFlag.drugName}</span>
        <div className="flex items-center gap-1.5">
          {drugFlag.flags.map((f, i) => (
            <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${
              f.type === 'off-label' ? 'bg-amber-50 text-amber-600' :
              f.type === 'foreign' ? 'bg-blue-50 text-blue-600' :
              f.type === 'unknown' ? 'bg-slate-100 text-slate-500' :
              f.type === 'species-warning' ? 'bg-red-50 text-red-600' :
              f.type === 'mdr1' ? 'bg-red-50 text-red-600' :
              'bg-slate-100 text-slate-500'
            }`}>
              {f.label}
            </span>
          ))}
          {expanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {drugFlag.flags.map((f, i) => (
            <p key={i} className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
          ))}
          {drugFlag.speciesNote && (
            <div className="flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-2 rounded">
              <Dna size={11} className="text-slate-400 mt-0.5 shrink-0" />
              <p>{drugFlag.speciesNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Results Display ────────────────────────────────────────
export function ResultsDisplay({ results, onBack, onNewAnalysis }) {
  if (!results) return null;

  const { interactions, drugFlags, overallSeverity, confidenceScore, speciesNotes } = results;
  const hasInteractions = interactions.length > 0;
  const flaggedDrugs = drugFlags.filter(f => f.flags.length > 0 || f.speciesNote);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">DUR Analysis Report</h2>
          <p className="text-xs text-slate-400">
            {new Date(results.timestamp).toLocaleString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {/* Overall status */}
      <div className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border ${
        overallSeverity.label === 'Critical' ? 'bg-red-50 border-red-200' :
        overallSeverity.label === 'Moderate' ? 'bg-amber-50 border-amber-200' :
        overallSeverity.label === 'Minor' ? 'bg-yellow-50 border-yellow-200' :
        'bg-emerald-50 border-emerald-200'
      }`}>
        {overallSeverity.label === 'Critical' ? <AlertTriangle size={20} className="text-red-600 shrink-0" /> :
         overallSeverity.label === 'Moderate' ? <AlertCircle size={20} className="text-amber-600 shrink-0" /> :
         overallSeverity.label === 'Minor' ? <Info size={20} className="text-yellow-600 shrink-0" /> :
         <CheckCircle size={20} className="text-emerald-600 shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${
            overallSeverity.label === 'Critical' ? 'text-red-800' :
            overallSeverity.label === 'Moderate' ? 'text-amber-800' :
            overallSeverity.label === 'Minor' ? 'text-yellow-800' :
            'text-emerald-800'
          }`}>
            {overallSeverity.label === 'None'
              ? 'No Significant Interactions Detected'
              : `${overallSeverity.label} Interaction${interactions.length > 1 ? 's' : ''} Found`}
          </p>
          <p className={`text-xs ${
            overallSeverity.label === 'Critical' ? 'text-red-600' :
            overallSeverity.label === 'Moderate' ? 'text-amber-600' :
            overallSeverity.label === 'Minor' ? 'text-yellow-600' :
            'text-emerald-600'
          }`}>
            {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} evaluated
            {interactions.filter(i => i.severity.label === 'Critical').length > 0 &&
              ` · ${interactions.filter(i => i.severity.label === 'Critical').length} critical`}
          </p>
        </div>
      </div>

      {/* Confidence */}
      <ConfidenceIndicator score={confidenceScore} />

      {/* Interactions */}
      {hasInteractions && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Interaction Report
          </h3>
          <div className="space-y-2">
            {interactions.map((interaction, i) => (
              <InteractionCard key={i} interaction={interaction} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Drug Flags */}
      {flaggedDrugs.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Drug Advisory Flags
          </h3>
          <div className="space-y-2">
            {flaggedDrugs.map((flag, i) => (
              <DrugFlagCard key={i} drugFlag={flag} />
            ))}
          </div>
        </div>
      )}

      {/* Species Notes */}
      {speciesNotes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Dna size={12} />
            Species-Specific Notes
          </h3>
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {speciesNotes.map((note, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-xs font-medium text-slate-600 mb-0.5">{note.drug}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{note.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Modify Prescription
        </button>
        <button
          onClick={onNewAnalysis}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          New Analysis
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center leading-relaxed pt-2">
        This analysis is generated from the VetDUR interaction database and is not a substitute for clinical judgment.
        Always verify critical interactions with current literature and consult a veterinary pharmacologist for complex cases.
      </p>
    </div>
  );
}
