import React, { useState } from 'react';
import { GraduationCap, ChevronDown, ChevronUp } from 'lucide-react';
import { StudentExplainerData } from '../data/studentExplainers';

interface StudentExplainerCardProps {
  data: StudentExplainerData;
  defaultOpen?: boolean;
  label?: string;
}

export const StudentExplainerCard: React.FC<StudentExplainerCardProps> = ({
  data,
  defaultOpen = true,
  label = 'Student Intuition · Explain From First Principles',
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-cyan-500/5 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-cyan-800 dark:text-cyan-400">
              {label}
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {data.analogyTitle}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400 shrink-0">
          {open ? 'Hide' : 'Explain'}
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-cyan-500/20 space-y-3 text-xs">
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
            {data.everydayAnalogy}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {data.threeStepFlow.map((step, i) => (
              <div
                key={i}
                className="p-2.5 rounded border border-cyan-500/20 bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                {step}
              </div>
            ))}
          </div>

          <div className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
            <strong className="text-cyan-800 dark:text-cyan-300">Key Takeaway:</strong>{' '}
            {data.keyTakeaway}
          </div>
        </div>
      )}
    </div>
  );
};
