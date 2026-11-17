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
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[var(--bg-elevated)]/60 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <GraduationCap className="w-4 h-4 text-[var(--sem-control)] shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-[var(--sem-control)]">
              {label}
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)] truncate mt-0.5">
              {data.analogyTitle}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sem-control)] shrink-0">
          {open ? 'Hide' : 'Explain'}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {open && (
        <div className="px-6 pb-6 pt-3 border-t border-[var(--border-subtle)] space-y-4 text-xs">
          <p className="text-[var(--text-primary)] leading-relaxed">
            {data.everydayAnalogy}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {data.threeStepFlow.map((step, i) => (
              <div
                key={i}
                className="p-3.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] leading-relaxed"
              >
                {step}
              </div>
            ))}
          </div>

          <div className="text-[var(--text-secondary)] leading-relaxed pt-1">
            <strong className="text-[var(--sem-control)]">Key Takeaway:</strong>{' '}
            {data.keyTakeaway}
          </div>
        </div>
      )}
    </div>
  );
};
