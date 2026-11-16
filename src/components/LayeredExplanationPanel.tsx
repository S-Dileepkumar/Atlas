import React from 'react';
import { BookOpen, Layers, ShieldCheck, AlertTriangle, Wrench, CheckCircle2 } from 'lucide-react';
import { LayeredConceptExplanation } from '../data/conceptDepthEngine';

export type ExplanationDepthFilter = 'all' | 'l1' | 'l2' | 'l3';

interface LayeredExplanationPanelProps {
  explanation: LayeredConceptExplanation;
  depthLevel: ExplanationDepthFilter;
  compact?: boolean;
}

export const LayeredExplanationPanel: React.FC<LayeredExplanationPanelProps> = ({
  explanation,
  depthLevel,
  compact = false,
}) => {
  const showL1 = depthLevel === 'all' || depthLevel === 'l1';
  const showL2 = depthLevel === 'all' || depthLevel === 'l2';
  const showL3 = depthLevel === 'all' || depthLevel === 'l3';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* LEVEL 1 — FUNDAMENTAL UNDERSTANDING */}
      {showL1 && (
        <section className="rounded-lg border border-cyan-500/30 bg-cyan-50/45 dark:bg-cyan-950/20 p-5 space-y-3.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-cyan-800 dark:text-cyan-300">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>LEVEL 1 — Fundamental Understanding (First Principles & Student Intuition)</span>
            </div>
            <span className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400">
              Zero prior VLSI assumptions
            </span>
          </div>

          <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed">
            {explanation.level1.intuitionSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded border border-cyan-500/20 bg-white/80 dark:bg-slate-900/70 space-y-1">
              <div className="font-semibold text-cyan-800 dark:text-cyan-300">
                Why Engineers Had to Invent It
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {explanation.level1.whyItExists}
              </p>
            </div>
            <div className="p-3.5 rounded border border-cyan-500/20 bg-white/80 dark:bg-slate-900/70 space-y-1">
              <div className="font-semibold text-cyan-800 dark:text-cyan-300">
                Everyday Mental Model & Analogy
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {explanation.level1.everydayAnalogy}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {explanation.level1.stepByStepMentalModel.map((step, i) => (
              <div
                key={i}
                className="p-3 rounded border border-cyan-500/20 bg-white/75 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                {step}
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 pt-1 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Common Beginner Misconception:</strong> {explanation.level1.beginnerMisconception}
            </p>
          </div>
        </section>
      )}

      {/* LEVEL 2 — ENGINEERING & SPECIFICATION MECHANICS */}
      {showL2 && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/75 p-5 space-y-3.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>LEVEL 2 — Engineering Mechanics (Architecture, Equations, Worked Example & Reset)</span>
            </div>
            <span className="font-mono text-[11px] text-blue-700 dark:text-blue-400">
              Design & Timing Spec
            </span>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {explanation.level2.architectureAndMechanics}
          </p>

          <div className="space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Quantitative Rules, Bit Math & Timing Constraints
            </div>
            <ul className="list-disc pl-5 space-y-1 font-mono text-slate-700 dark:text-cyan-300">
              {explanation.level2.mathematicalAndTimingRules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Worked Cycle-by-Cycle / Numeric Example
              </div>
              <p className="font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
                {explanation.level2.workedEngineeringExample}
              </p>
            </div>
            <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Reset & Safe Initialization Rules
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {explanation.level2.resetAndInitialization}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* LEVEL 3 — EXPERT MICROARCHITECTURE, CORNER CASES & VERIFICATION */}
      {showL3 && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/75 p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>LEVEL 3 — Expert Microarchitecture, Corner Cases & Silicon Debug</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
              RTL Signoff & DV
            </span>
          </div>

          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Synthesizable RTL & CDC Microarchitecture
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {explanation.level3.rtlMicroarchitecture}
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-rose-700 dark:text-rose-400">
              Real-World Corner Cases & Failure Mode Analysis
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {explanation.level3.cornerCasesAndFailureModes.map((cf, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1.5"
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Symptom: {cf.symptom}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong>Root Cause:</strong> {cf.rootCause}
                  </div>
                  <div className="text-cyan-800 dark:text-cyan-300 leading-relaxed">
                    <strong>Resolution:</strong> {cf.resolution}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  UVM Verification & SVA Assertion Focus
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                  {explanation.level3.verificationAndAssertions}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Wrench className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Silicon Bring-Up & Waveform Debug Playbook
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                  {explanation.level3.siliconDebugPlaybook}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
