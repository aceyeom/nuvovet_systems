import React from 'react';
import { AlertTriangle, Activity } from 'lucide-react';

function EliminationBar({ label, pct, barColor, textColor, riskLabel }) {
  const visualWidth = Math.min((pct / 200) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-medium text-slate-600">{label}</span>
        <span className={`text-[11px] font-semibold font-mono ${textColor}`}>
          {pct}% <span className="font-normal text-slate-400">({riskLabel})</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${visualWidth}%` }}
        />
      </div>
    </div>
  );
}

export default function EliminationRoutePanel({
  renal, hepatic, renalRisk, hepaticRisk, isCritical, contributions, t,
}) {
  return (
    <div className={`rounded-lg border overflow-hidden ${isCritical ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
      <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className={renalRisk.text} />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {t?.anatomy?.eliminationNotes || '배설 경로 및 주의사항'}
          </span>
        </div>
        {isCritical && (
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200">
            <AlertTriangle size={8} />
            {t?.results?.compromisedKidney}
          </span>
        )}
      </div>

      {/* Critical banner */}
      {isCritical && (
        <div className="mx-3 my-2 px-2 py-1.5 bg-red-100 border border-red-200 rounded-lg flex items-start gap-1.5">
          <AlertTriangle size={11} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-700 leading-relaxed">
            {t?.results?.organLoadCriticalPrefix} <strong>{renal}%</strong> {t?.results?.organLoadCriticalBody}
          </p>
        </div>
      )}

      {/* Renal + Hepatic bars */}
      <div className="px-3 py-2 space-y-2">
        <EliminationBar
          label={t?.results?.renalEliminationBurden}
          pct={renal}
          barColor={renalRisk.bar}
          textColor={renalRisk.text}
          riskLabel={t?.results?.riskLevel?.[renalRisk.level] || renalRisk.label}
        />
        <EliminationBar
          label={t?.results?.hepaticEliminationBurden}
          pct={hepatic}
          barColor={hepaticRisk.bar}
          textColor={hepaticRisk.text}
          riskLabel={t?.results?.riskLevel?.[hepaticRisk.level] || hepaticRisk.label}
        />
      </div>

      {/* Footnote */}
      {contributions.length > 0 && (
        <div className="px-3 pb-2 border-t border-slate-100 pt-2">
          <p className="text-[9px] text-slate-400 leading-relaxed">
            {t?.results?.organLoadFootnote}
          </p>
        </div>
      )}
    </div>
  );
}
