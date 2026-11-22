import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Cpu,
  FolderTree,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  CURRICULUM_PILLARS,
  CurriculumModule,
  CurriculumPillarId,
  RTL_SV_UVM_CURRICULUM,
} from '../data/rtlSvUvmCurriculum';
import { getProtocolById } from '../data/protocols';
import { getIpById } from '../data/ips';
import { CodeBlock } from './DiagramViewers';
import type { AppView } from './HomeDashboard';

interface RtlSvUvmStudioViewProps {
  initialPillar: CurriculumPillarId;
  initialModuleId?: string;
  onSelectProtocol: (protocolId: string) => void;
  onSelectIp: (ipId: string) => void;
  onNavigate: (view: AppView) => void;
  onPillarChange?: (pillar: CurriculumPillarId) => void;
}

export const RtlSvUvmStudioView: React.FC<RtlSvUvmStudioViewProps> = ({
  initialPillar,
  initialModuleId,
  onSelectProtocol,
  onSelectIp,
  onNavigate,
  onPillarChange,
}) => {
  const [activePillar, setActivePillar] = useState<CurriculumPillarId>(initialPillar);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>(() => {
    if (initialModuleId && RTL_SV_UVM_CURRICULUM.some((m) => m.id === initialModuleId)) {
      return initialModuleId;
    }
    return RTL_SV_UVM_CURRICULUM.find((m) => m.pillar === initialPillar)?.id || RTL_SV_UVM_CURRICULUM[0].id;
  });

  useEffect(() => {
    setActivePillar(initialPillar);
    if (initialModuleId) {
      const target = RTL_SV_UVM_CURRICULUM.find((m) => m.id === initialModuleId);
      if (target) {
        setActivePillar(target.pillar);
        setSelectedModuleId(target.id);
        return;
      }
    }
    setSelectedModuleId((prev) => {
      const current = RTL_SV_UVM_CURRICULUM.find((m) => m.id === prev);
      if (current && current.pillar === initialPillar) return prev;
      return RTL_SV_UVM_CURRICULUM.find((m) => m.pillar === initialPillar)?.id || prev;
    });
  }, [initialPillar, initialModuleId]);

  const pillarMeta = useMemo(
    () => CURRICULUM_PILLARS.find((p) => p.id === activePillar) || CURRICULUM_PILLARS[0],
    [activePillar]
  );

  const pillarModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return RTL_SV_UVM_CURRICULUM.filter((m) => {
      if (m.pillar !== activePillar) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.chapter.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.deepTheory.toLowerCase().includes(q) ||
        m.codeExample.toLowerCase().includes(q) ||
        m.normativeRules.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [activePillar, searchQuery]);

  const groupedChapters = useMemo(() => {
    const map = new Map<string, CurriculumModule[]>();
    for (const mod of pillarModules) {
      const existing = map.get(mod.chapter) || [];
      existing.push(mod);
      map.set(mod.chapter, existing);
    }
    return Array.from(map.entries());
  }, [pillarModules]);

  const activeModule = useMemo(() => {
    return (
      pillarModules.find((m) => m.id === selectedModuleId) ||
      RTL_SV_UVM_CURRICULUM.find((m) => m.id === selectedModuleId && m.pillar === activePillar) ||
      pillarModules[0] ||
      RTL_SV_UVM_CURRICULUM.find((m) => m.pillar === activePillar) ||
      RTL_SV_UVM_CURRICULUM[0]
    );
  }, [pillarModules, selectedModuleId, activePillar]);

  const allInPillar = useMemo(
    () => RTL_SV_UVM_CURRICULUM.filter((m) => m.pillar === activePillar),
    [activePillar]
  );
  const currentIdx = allInPillar.findIndex((m) => m.id === activeModule.id);
  const prevMod = currentIdx > 0 ? allInPillar[currentIdx - 1] : null;
  const nextMod = currentIdx >= 0 && currentIdx < allInPillar.length - 1 ? allInPillar[currentIdx + 1] : null;

  const switchPillar = (p: CurriculumPillarId) => {
    setActivePillar(p);
    setSearchQuery('');
    const first = RTL_SV_UVM_CURRICULUM.find((m) => m.pillar === p);
    if (first) setSelectedModuleId(first.id);
    onPillarChange?.(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectModule = (id: string, scrollToReader = false) => {
    const savedScrollY = window.scrollY;
    setSelectedModuleId(id);
    if (scrollToReader) {
      const readerEl = document.getElementById('rtl-module-reader');
      if (readerEl) {
        readerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - savedScrollY) > 2) {
          window.scrollTo({ top: savedScrollY, behavior: 'auto' });
        }
      });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header & Pillar Tabs */}
      <div className="border-b border-[var(--border-subtle)] pb-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-mono font-semibold text-[var(--sem-control)]">{pillarMeta.standardRef}</span>
              <span aria-hidden="true">·</span>
              <span>{allInPillar.length} Core Modules</span>
              <span aria-hidden="true">·</span>
              <span>42 Total Concepts Across RTL, SV &amp; UVM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {pillarMeta.label}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{pillarMeta.description}</p>
          </div>

          {/* Segmented Pillar Switcher */}
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
            {CURRICULUM_PILLARS.map((p) => {
              const count = RTL_SV_UVM_CURRICULUM.filter((m) => m.pillar === p.id).length;
              const isAct = p.id === activePillar;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => switchPillar(p.id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    isAct
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  {p.shortLabel} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Linked Interactive Engineering Tools Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--text-secondary)] mr-1">Connected Engineering Workbenches:</span>
          <button
            type="button"
            onClick={() => onNavigate('rtl-explorer')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
          >
            <FolderTree className="w-4 h-4 text-[var(--sem-control)]" />
            RTL Source Explorer
          </button>
          <button
            type="button"
            onClick={() => onNavigate('cdc-analyzer')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[var(--sem-control)]" />
            CDC Analyzer
          </button>
          <button
            type="button"
            onClick={() => onNavigate('simulator')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
          >
            <Activity className="w-4 h-4 text-[var(--sem-control)]" />
            Waveform Lab
          </button>
          <button
            type="button"
            onClick={() => onNavigate('checker')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[var(--sem-high)]" />
            Compliance Checker
          </button>
          <button
            type="button"
            onClick={() => onNavigate('uvm')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[var(--sem-high)]" />
            UVM &amp; SVA Generator
          </button>
        </div>
      </div>

      {/* Main Two-Column Curriculum Workbench */}
      <div className="flex flex-col lg:flex-row items-start gap-8">
        {/* Left Sticky Concept Directory */}
        <aside className="w-full lg:w-[300px] shrink-0 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-92px)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Concept Syllabus
              </span>
              <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                {pillarModules.length} / {allInPillar.length}
              </span>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filter ${pillarMeta.shortLabel} concepts...`}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--sem-control)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear concept filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto p-3 space-y-4">
            {groupedChapters.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-secondary)] space-y-2">
                <p>No concepts match "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--sem-control)] font-medium hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              groupedChapters.map(([chapter, mods]) => (
                <div key={chapter} className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {chapter}
                  </div>
                  {mods.map((mod) => {
                    const isSel = mod.id === activeModule.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => selectModule(mod.id)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-r-md transition-colors cursor-pointer flex items-start gap-2 ${
                          isSel
                            ? 'border-l-2 border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
                            : 'border-l-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60'
                        }`}
                      >
                        <span className="font-mono text-[11px] text-[var(--sem-control)] shrink-0 tabular-nums">
                          {mod.number}
                        </span>
                        <span className="leading-snug">{mod.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Right Detail Stream */}
        <div id="rtl-module-reader" className="scroll-mt-20 flex-1 min-w-0 w-full space-y-8 [overflow-anchor:none]">
          <article className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-8">
            {/* Module Heading */}
            <header className="pb-6 border-b border-[var(--border-subtle)] space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-mono font-semibold text-[var(--sem-control)] tabular-nums">
                  Module {activeModule.number}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeModule.chapter}</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[var(--sem-high)]">{activeModule.scopeBadge}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {activeModule.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{activeModule.summary}</p>
            </header>

            {/* First-Principles Mechanism */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--sem-control)]" />
                Architectural Mechanism &amp; Theory
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{activeModule.deepTheory}</p>
            </section>

            {/* Normative Engineering Rules */}
            <section className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Normative Synthesis &amp; Verification Rules
              </h3>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)] list-disc pl-4">
                {activeModule.normativeRules.map((rule, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {rule}
                  </li>
                ))}
              </ul>
            </section>

            {/* Side-by-Side Common Pitfall vs Verified Fix */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sem-error)]">
                  <AlertTriangle className="w-4 h-4" />
                  Common Hardware / TB Pitfall
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{activeModule.commonPitfall}</p>
              </div>
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sem-high)]">
                  <CheckCircle2 className="w-4 h-4" />
                  Verified Production Fix
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{activeModule.verifiedFix}</p>
              </div>
            </section>

            {/* Compilable Code Example */}
            <section className="space-y-3 min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Production Reference Code ({activeModule.codeLanguage})
              </h3>
              <CodeBlock
                title={activeModule.codeTitle}
                language={activeModule.codeLanguage}
                code={activeModule.codeExample}
              />
            </section>

            {/* Design Review / Interview Takeaway */}
            <section className="rounded-md border border-[var(--sem-control)]/40 bg-[var(--bg-elevated)] p-5 space-y-1.5">
              <div className="text-xs font-semibold text-[var(--sem-control)]">
                Design Review &amp; Interview Takeaway
              </div>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">{activeModule.interviewTakeaway}</p>
            </section>

            {/* Cross-Links to Protocols & Open-Source IPs */}
            <section className="pt-6 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Applied Inside Protocol Specs
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeModule.relatedProtocols.map((pid) => {
                    const p = getProtocolById(pid);
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => onSelectProtocol(pid)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--sem-control)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
                      >
                        {p.name}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Applied Inside Open-Source Silicon IPs
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeModule.relatedIps.map((ipId) => {
                    const ip = getIpById(ipId);
                    return (
                      <button
                        key={ipId}
                        type="button"
                        onClick={() => onSelectIp(ipId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
                      >
                        <Cpu className="w-3.5 h-3.5 text-[var(--sem-control)]" />
                        {ip.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </article>

          {/* Module Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {prevMod ? (
              <button
                type="button"
                onClick={() => selectModule(prevMod.id, true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>
                  {prevMod.number} {prevMod.title}
                </span>
              </button>
            ) : (
              <div />
            )}

            {nextMod && (
              <button
                type="button"
                onClick={() => selectModule(nextMod.id, true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer ml-auto"
              >
                <span>
                  {nextMod.number} {nextMod.title}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
