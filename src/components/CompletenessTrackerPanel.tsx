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
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-[var(--bg-elevated)]/60 transition-colors cursor-pointer"
      >
        <div className="min-w-0">
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            Documentation Completeness &amp; Source Verification Tracker — {title}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {report.documentedCount}/{report.applicableCount} applicable technical domains fully verified ({report.percentComplete}%) · {report.note}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-28 h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full bg-[var(--sem-control)] transition-all duration-200"
              style={{ width: `${report.percentComplete}%` }}
            />
          </div>
          <span className="text-xs font-mono font-semibold tabular-nums text-[var(--sem-control)]">
            {report.percentComplete}%
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            {expanded ? 'Hide Checklist' : 'Inspect 16 Checkpoints'}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {report.items.map((item) => {
            const st = STATUS_STYLE[item.status];
            const Icon = st.Icon;
            return (
              <div
                key={item.topic}
                className="p-3.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">{item.topic}</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${st.text}`}>
                    <Icon className="w-4 h-4" />
                    {item.status}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{item.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
