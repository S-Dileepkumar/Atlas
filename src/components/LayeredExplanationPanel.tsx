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
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* LEVEL 1 — FUNDAMENTAL UNDERSTANDING */}
      {showL1 && (
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--sem-control)]">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>LEVEL 1 — Fundamental Understanding (First Principles & Student Intuition)</span>
            </div>
            <span className="font-mono text-[11px] text-[var(--sem-control)]">
              Zero prior VLSI assumptions
            </span>
          </div>

          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {explanation.level1.intuitionSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-1.5">
              <div className="font-semibold text-[var(--sem-control)]">
                Why Engineers Had to Invent It
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {explanation.level1.whyItExists}
              </p>
            </div>
            <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-1.5">
              <div className="font-semibold text-[var(--sem-control)]">
                Everyday Mental Model & Analogy
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {explanation.level1.everydayAnalogy}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {explanation.level1.stepByStepMentalModel.map((step, i) => (
              <div
                key={i}
                className="p-3.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] leading-relaxed"
              >
                {step}
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 pt-1 text-[var(--sem-data)]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Common Beginner Misconception:</strong> {explanation.level1.beginnerMisconception}
            </p>
          </div>
        </section>
      )}

      {/* LEVEL 2 — ENGINEERING & SPECIFICATION MECHANICS */}
      {showL2 && (
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <Layers className="w-4 h-4 text-[var(--sem-control)] shrink-0" />
              <span>LEVEL 2 — Engineering Mechanics (Architecture, Equations, Worked Example & Reset)</span>
            </div>
            <span className="font-mono text-[11px] text-[var(--sem-control)]">
              Design & Timing Spec
            </span>
          </div>

          <p className="text-sm text-[var(--text-primary)] leading-relaxed">
            {explanation.level2.architectureAndMechanics}
          </p>

          <div className="space-y-1.5">
            <div className="font-semibold text-[var(--text-primary)]">
              Quantitative Rules, Bit Math & Timing Constraints
            </div>
            <ul className="list-disc pl-5 space-y-1 font-mono text-[var(--sem-control)]">
              {explanation.level2.mathematicalAndTimingRules.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-1.5">
              <div className="font-semibold text-[var(--text-primary)]">
                Worked Cycle-by-Cycle / Numeric Example
              </div>
              <p className="font-mono text-[var(--text-secondary)] leading-relaxed">
                {explanation.level2.workedEngineeringExample}
              </p>
            </div>
            <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-1.5">
              <div className="font-semibold text-[var(--text-primary)]">
                Reset & Safe Initialization Rules
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {explanation.level2.resetAndInitialization}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* LEVEL 3 — EXPERT MICROARCHITECTURE, CORNER CASES & VERIFICATION */}
      {showL3 && (
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--sem-high)] shrink-0" />
              <span>LEVEL 3 — Expert Microarchitecture, Corner Cases & Silicon Debug</span>
            </div>
            <span className="font-mono text-[11px] text-[var(--sem-high)]">
              RTL Signoff & DV
            </span>
          </div>

          <div>
            <div className="font-semibold text-[var(--text-primary)] mb-1">
              Synthesizable RTL & CDC Microarchitecture
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {explanation.level3.rtlMicroarchitecture}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-[var(--sem-error)]">
              Real-World Corner Cases & Failure Mode Analysis
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {explanation.level3.cornerCasesAndFailureModes.map((cf, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-1.5"
                >
                  <div className="font-semibold text-[var(--text-primary)]">
                    Symptom: {cf.symptom}
                  </div>
                  <div className="text-[var(--text-secondary)] leading-relaxed">
                    <strong>Root Cause:</strong> {cf.rootCause}
                  </div>
                  <div className="text-[var(--sem-control)] leading-relaxed">
                    <strong>Resolution:</strong> {cf.resolution}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--sem-high)] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  UVM Verification & SVA Assertion Focus
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed mt-1">
                  {explanation.level3.verificationAndAssertions}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Wrench className="w-4 h-4 text-[var(--sem-control)] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  Silicon Bring-Up & Waveform Debug Playbook
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed mt-1">
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
