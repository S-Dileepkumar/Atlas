import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock, MinusCircle, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { CompletenessReport, CompletenessStatus } from '../utils/completenessTracker';

interface CompletenessTrackerPanelProps {
  title: string;
  report: CompletenessReport;
}

const STATUS_STYLE: Record<
  CompletenessStatus,
  { text: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  Documented: { text: 'text-emerald-700 dark:text-emerald-400', Icon: CheckCircle2 },
  'Partially documented': { text: 'text-amber-700 dark:text-amber-400', Icon: Clock },
  'Not yet documented': { text: 'text-rose-700 dark:text-rose-400', Icon: AlertTriangle },
  'Not applicable': { text: 'text-slate-500 dark:text-slate-400', Icon: MinusCircle },
  'Requires source verification': { text: 'text-cyan-700 dark:text-cyan-400', Icon: ShieldAlert },
};

export const CompletenessTrackerPanel: React.FC<CompletenessTrackerPanelProps> = ({ title, report }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            Documentation Completeness & Source Verification Tracker — {title}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {report.documentedCount}/{report.applicableCount} applicable technical domains fully verified ({report.percentComplete}%) · {report.note}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-28 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-600 dark:bg-cyan-400"
              style={{ width: `${report.percentComplete}%` }}
            />
          </div>
          <span className="text-xs font-mono font-semibold tabular-nums text-cyan-700 dark:text-cyan-400">
            {report.percentComplete}%
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
            {expanded ? 'Hide Checklist' : 'Inspect 16 Checkpoints'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {report.items.map((item) => {
            const st = STATUS_STYLE[item.status];
            const Icon = st.Icon;
            return (
              <div
                key={item.topic}
                className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{item.topic}</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${st.text}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{item.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
