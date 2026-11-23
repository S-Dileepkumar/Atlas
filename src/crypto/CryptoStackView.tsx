import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Cpu,
  Download,
  Layers,
  Lock,
  Menu,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  X,
} from 'lucide-react';
import {
  CRYPTO_CURRICULUM,
  CryptoChapter,
  MASTERY_STAGES,
  STACK_STRATA,
  StackStratumId,
} from './cryptoCurriculum';
import {
  KYBER_Q,
  MlKemHardwareMode,
  NTT_STAGE_ANNOTATIONS,
  NttStageAnnotation,
  PQC_SCHEME_MATRIX,
  buildPqcMatrixCsv,
  computeExtendedGcd,
  computeKyberButterfly,
  computeMlKemParameterProfile,
  simulateSideChannelTrace,
  solveCrt3,
} from './cryptoLabs';
import { CodeBlock } from '../components/DiagramViewers';
import type { AppView } from '../components/HomeDashboard';

interface CryptoStackViewProps {
  initialChapterId?: string;
  initialSubtopicId?: string;
  initialLab?: LabTabId;
  onBack?: () => void;
  onNavigate: (view: AppView) => void;
  onSelectProtocol: (protocolId: string) => void;
  onSelectIp: (ipId: string) => void;
  onOpenCdc: (ipId: string) => void;
}

export type CryptoLabTabId = LabTabId;
type LabTabId = 'pqc' | 'params' | 'sca' | 'math' | 'mastery';

const MASTERY_STORAGE_KEY = 'vpa_crypto_mastery_stages_v1';
const SIDEBAR_GROUPS_STORAGE_KEY = 'vpa_crypto_sidebar_groups_v1';

interface SidebarGroup {
  id: string;
  label: string;
  chapterIds: string[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  { id: 'grp-foundations', label: 'Foundations & Silicon Core', chapterIds: ['ch1-math', 'ch2-hardware'] },
  { id: 'grp-systems', label: 'Software, Engines & Hardening', chapterIds: ['ch3-software', 'ch6-implementation'] },
  { id: 'grp-classical', label: 'Classical Crypto & Protocols', chapterIds: ['ch4-symmetric', 'ch5-asymmetric'] },
  { id: 'grp-attacks', label: 'Attacks & Reverse Engineering', chapterIds: ['ch7-attacks'] },
  { id: 'grp-pqc', label: 'PQC, Systems & Mastery Path', chapterIds: ['ch8-pqc', 'ch9-advanced', 'ch10-mastery'] },
];

export const CryptoStackView: React.FC<CryptoStackViewProps> = ({
  initialChapterId,
  initialSubtopicId,
  initialLab,
  onBack,
  onNavigate,
  onSelectProtocol,
  onSelectIp,
  onOpenCdc,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    initialChapterId && CRYPTO_CURRICULUM.some((c) => c.id === initialChapterId)
      ? initialChapterId
      : CRYPTO_CURRICULUM[0].id
  );
  const [highlightedSubtopicId, setHighlightedSubtopicId] = useState<string | undefined>(
    initialSubtopicId
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStratumFilter, setActiveStratumFilter] = useState<StackStratumId | 'all'>('all');
  const [activeLab, setActiveLab] = useState<LabTabId>(initialLab || 'pqc');
  const [labOpen, setLabOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Collapsible hierarchical sidebar state (persisted)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_GROUPS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage errors
    }
    return {
      'grp-foundations': true,
      'grp-systems': true,
      'grp-classical': true,
      'grp-attacks': true,
      'grp-pqc': true,
    };
  });

  // Progressive disclosure per subtopic (Math / Silicon / Attack)
  const [collapsedSubtopics, setCollapsedSubtopics] = useState<Record<string, boolean>>({});
  const [showSiliconNotes, setShowSiliconNotes] = useState(true);

  // Lab A: Modular Math & CRT state
  const [modA, setModA] = useState(17);
  const [modM, setModM] = useState(3329);
  const [crtPairs, setCrtPairs] = useState([
    { a: 2, m: 3 },
    { a: 3, m: 5 },
    { a: 2, m: 7 },
  ]);

  // Lab B: Side-Channel Simulator state
  const [secretByte, setSecretByte] = useState(0x5a);
  const [maskByte, setMaskByte] = useState(0xc3);

  // Lab C: NTT Butterfly + Stage Inspector + PQC Filter state
  const [nttA, setNttA] = useState(1240);
  const [nttB, setNttB] = useState(2150);
  const [nttZeta, setNttZeta] = useState(17);
  const [selectedNttStage, setSelectedNttStage] =
    useState<NttStageAnnotation['id']>('twiddle-mul');
  const [pqcTypeFilter, setPqcTypeFilter] = useState<
    'all' | 'KEM / Key Exchange' | 'Digital Signature'
  >('all');

  // Lab D: Live ML-KEM Parameter Explorer & Area/Power/Latency Estimator
  const [mlKemK, setMlKemK] = useState<2 | 3 | 4>(3);
  const [mlKemEta1, setMlKemEta1] = useState<2 | 3>(2);
  const [mlKemDu, setMlKemDu] = useState<10 | 11>(10);
  const [mlKemDv, setMlKemDv] = useState<4 | 5>(4);
  const [mlKemHwMode, setMlKemHwMode] = useState<MlKemHardwareMode>('masked-1st-order');

  // Lab E: Mastery Tracker state
  const [completedStages, setCompletedStages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(MASTERY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (initialChapterId && CRYPTO_CURRICULUM.some((c) => c.id === initialChapterId)) {
      setActiveStratumFilter('all');
      setSearchQuery('');
      setSelectedChapterId(initialChapterId);
    }
  }, [initialChapterId]);

  useEffect(() => {
    if (initialLab) {
      setActiveLab(initialLab);
      setLabOpen(true);
    }
  }, [initialLab]);

  useEffect(() => {
    if (initialSubtopicId) {
      const owner = CRYPTO_CURRICULUM.find((ch) =>
        ch.subtopics.some((s) => s.id === initialSubtopicId)
      );
      if (owner) {
        setActiveStratumFilter('all');
        setSearchQuery('');
        setSelectedChapterId(owner.id);
        setHighlightedSubtopicId(initialSubtopicId);
      }
    }
  }, [initialSubtopicId]);

  useEffect(() => {
    if (!highlightedSubtopicId) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`crypto-sub-${highlightedSubtopicId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [highlightedSubtopicId, selectedChapterId]);

  const toggleSidebarGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem(SIDEBAR_GROUPS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const toggleStageComplete = (stageId: string) => {
    setCompletedStages((prev) => {
      const next = prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId];
      try {
        localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const totalSubtopics = useMemo(
    () => CRYPTO_CURRICULUM.reduce((acc, ch) => acc + ch.subtopics.length, 0),
    []
  );

  const filteredChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return CRYPTO_CURRICULUM.filter((ch) => {
      const stratumMatch =
        activeStratumFilter === 'all' || ch.stratumId === activeStratumFilter;
      if (!stratumMatch) return false;
      if (!q) return true;
      return (
        ch.title.toLowerCase().includes(q) ||
        ch.vlsiPerspective.toLowerCase().includes(q) ||
        ch.subtopics.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.summary.toLowerCase().includes(q) ||
            s.mechanics.toLowerCase().includes(q) ||
            s.siliconAndRtlLink.toLowerCase().includes(q) ||
            s.attackAndDefense.toLowerCase().includes(q)
        )
      );
    });
  }, [searchQuery, activeStratumFilter]);

  const activeChapter: CryptoChapter = useMemo(() => {
    return (
      filteredChapters.find((c) => c.id === selectedChapterId) ||
      CRYPTO_CURRICULUM.find((c) => c.id === selectedChapterId) ||
      filteredChapters[0] ||
      CRYPTO_CURRICULUM[0]
    );
  }, [filteredChapters, selectedChapterId]);

  const activeChapterIdx = CRYPTO_CURRICULUM.findIndex((c) => c.id === activeChapter.id);
  const prevChapter = activeChapterIdx > 0 ? CRYPTO_CURRICULUM[activeChapterIdx - 1] : null;
  const nextChapter =
    activeChapterIdx >= 0 && activeChapterIdx < CRYPTO_CURRICULUM.length - 1
      ? CRYPTO_CURRICULUM[activeChapterIdx + 1]
      : null;

  const progressPct = Math.round(((activeChapterIdx + 1) / CRYPTO_CURRICULUM.length) * 100);

  const visibleSubtopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeChapter.subtopics;
    const matched = activeChapter.subtopics.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.mechanics.toLowerCase().includes(q) ||
        s.siliconAndRtlLink.toLowerCase().includes(q) ||
        s.attackAndDefense.toLowerCase().includes(q)
    );
    return matched.length > 0 ? matched : activeChapter.subtopics;
  }, [activeChapter, searchQuery]);

  // Interactive Lab computations
  const extGcd = useMemo(() => computeExtendedGcd(modA, modM), [modA, modM]);
  const crtResult = useMemo(() => solveCrt3(crtPairs), [crtPairs]);
  const scaResult = useMemo(
    () => simulateSideChannelTrace(secretByte, maskByte),
    [secretByte, maskByte]
  );
  const nttTrace = useMemo(
    () => computeKyberButterfly(nttA, nttB, nttZeta),
    [nttA, nttB, nttZeta]
  );
  const visiblePqcSchemes = useMemo(
    () =>
      PQC_SCHEME_MATRIX.filter(
        (s) => pqcTypeFilter === 'all' || s.type === pqcTypeFilter
      ),
    [pqcTypeFilter]
  );
  const activeNttStageInfo = useMemo(
    () =>
      NTT_STAGE_ANNOTATIONS.find((s) => s.id === selectedNttStage) ||
      NTT_STAGE_ANNOTATIONS[0],
    [selectedNttStage]
  );
  const mlKemProfile = useMemo(
    () =>
      computeMlKemParameterProfile(
        mlKemK,
        mlKemEta1,
        mlKemDu,
        mlKemDv,
        mlKemHwMode
      ),
    [mlKemK, mlKemEta1, mlKemDu, mlKemDv, mlKemHwMode]
  );

  const selectChapter = (id: string, subId?: string, forceScrollToReader = false) => {
    const savedScrollY = window.scrollY;
    setSelectedChapterId(id);
    setHighlightedSubtopicId(subId);
    setMobileSidebarOpen(false);
    if (forceScrollToReader && !subId) {
      const readerEl = document.getElementById('crypto-chapter-reader');
      if (readerEl) {
        readerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (!subId) {
      window.requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - savedScrollY) > 2) {
          window.scrollTo({ top: savedScrollY, behavior: 'auto' });
        }
      });
    }
  };

  const handleAtlasLink = (link: { kind: 'protocol' | 'ip' | 'view'; targetId: string }) => {
    if (link.kind === 'protocol') onSelectProtocol(link.targetId);
    else if (link.kind === 'ip') onSelectIp(link.targetId);
    else if (link.targetId === 'cdc-analyzer') onOpenCdc('opentitan-aes');
    else onNavigate(link.targetId as AppView);
  };

  const handleExportCsv = () => {
    const csv = buildPqcMatrixCsv(visiblePqcSchemes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nist-2026-pqc-hardware-matrix.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Hero + Breadcrumb + Quick Actions */}
      <div className="flex flex-wrap items-start justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div className="max-w-3xl space-y-2.5">
          {/* "You are here" Breadcrumb & Verification Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 text-[var(--text-primary)] hover:text-[var(--sem-control)] transition-colors cursor-pointer mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <span className="font-mono text-[var(--sem-control)]">Silicon-to-PQC Stack</span>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--text-primary)] font-medium">
              Ch {String(activeChapter.number).padStart(2, '0')} · {activeChapter.title}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {CRYPTO_CURRICULUM.length} Chapters · {totalSubtopics} Topics
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--sem-high)] font-medium">
              Verified against FIPS 203 / 204 / 205 (2026)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
            Reverse-Engineered Cryptography &amp; Post-Quantum Silicon Stack
          </h1>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-[75ch]">
            Complete VLSI semiconductor security engineering reference moving bottom-up from mathematical foundations, CMOS gates, and CPU/cache microarchitecture through constant-time accelerators, side-channel &amp; fault reverse engineering, and NIST 2026 Post-Quantum Cryptography.
          </p>
        </div>

        {/* Cross-Platform Silicon & Export Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs shrink-0 no-print">
          <button
            type="button"
            onClick={() => onNavigate('aes-deep-dive')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--sem-control)] text-white dark:text-slate-950 font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            AES 7-Chapter Lab
          </button>
          <button
            type="button"
            onClick={() => onSelectIp('opentitan-aes')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Cpu className="w-4 h-4 text-[var(--sem-control)]" />
            OpenTitan AES IP
          </button>
          <button
            type="button"
            onClick={() => onOpenCdc('opentitan-aes')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Clock className="w-4 h-4 text-[var(--sem-control)]" />
            CDC Domains
          </button>
          <button
            type="button"
            onClick={() => onSelectProtocol('tl-ul')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Layers className="w-4 h-4 text-[var(--sem-control)]" />
            TL-UL Integrity
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title="Print clean reference sheet"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Reverse-Engineered Stack Navigator (6 Interactive Strata) */}
      <section className="space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Reverse-Engineered Silicon-to-PQC Stack
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Select any physical or protocol stratum to filter chapters and trace how mathematical equations map to CMOS gates and quantum-resistant hardware.
            </p>
          </div>
          {activeStratumFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveStratumFilter('all')}
              className="text-xs font-medium text-[var(--sem-control)] hover:underline cursor-pointer whitespace-nowrap"
            >
              Show All 10 Chapters →
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {STACK_STRATA.map((st) => {
            const isSelected = activeStratumFilter === st.id;
            const containsActive = st.chapterIds.includes(activeChapter.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setActiveStratumFilter('all');
                  } else {
                    setActiveStratumFilter(st.id);
                    if (st.chapterIds[0]) setSelectedChapterId(st.chapterIds[0]);
                  }
                }}
                className={`p-4 text-left rounded-lg border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)]'
                    : containsActive
                    ? 'border-[var(--sem-control)]/50 bg-[var(--bg-surface)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--sem-control)]/70'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-[var(--sem-control)] font-semibold">
                    {st.label}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {st.subtitle}
                  </div>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)]">
                  {st.hardwareBoundary}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Interactive Engineering Workbench */}
      <section
        id="crypto-workbench"
        className="scroll-mt-24 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-5 no-print"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="space-y-0.5">
            <div className="text-xs font-mono text-[var(--sem-control)] font-medium">
              Implementation Lab · Interactive Silicon &amp; Cryptographic Calculators
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Annotated NTT Butterfly, ML-KEM Parameter &amp; Area Estimator, Side-Channel Trace &amp; Mastery Path
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
              {(
                [
                  { id: 'pqc', label: 'NTT & 2026 Matrix', icon: Cpu },
                  { id: 'params', label: 'Parameter & Area Estimator', icon: SlidersHorizontal },
                  { id: 'sca', label: 'Side-Channel & Masking', icon: Activity },
                  { id: 'math', label: 'Mod Inverse & CRT', icon: Calculator },
                  {
                    id: 'mastery',
                    label: `Mastery (${completedStages.length}/${MASTERY_STAGES.length})`,
                    icon: CheckCircle2,
                  },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = activeLab === tab.id && labOpen;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveLab(tab.id);
                      setLabOpen(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[var(--sem-control)] text-white dark:text-slate-950 font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setLabOpen((v) => !v)}
              className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap shrink-0"
            >
              {labOpen ? 'Hide Lab' : 'Show Lab'}
            </button>
          </div>
        </div>

        {/* LAB 1: Annotated NTT Butterfly + NIST 2026 Benchmark Matrix */}
        {labOpen && activeLab === 'pqc' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[var(--sem-control)]">
                  Annotated ML-KEM Ring R_q = Z_{KYBER_Q}[X]/(X^256 + 1)
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Click Any Butterfly Stage to Inspect RTL &amp; Power/EM Leakage
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <label className="space-y-1 block">
                  <span className="text-[var(--text-secondary)] font-medium">Coeff a_in</span>
                  <input
                    type="number"
                    min={0}
                    max={3328}
                    value={nttA}
                    onChange={(e) => setNttA(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono tabular-nums"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-[var(--text-secondary)] font-medium">Coeff b_in</span>
                  <input
                    type="number"
                    min={0}
                    max={3328}
                    value={nttB}
                    onChange={(e) => setNttB(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono tabular-nums"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-[var(--text-secondary)] font-medium">Twiddle ζ</span>
                  <input
                    type="number"
                    min={1}
                    max={3328}
                    value={nttZeta}
                    onChange={(e) => setNttZeta(Number(e.target.value) || 17)}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono tabular-nums"
                  />
                </label>
              </div>

              {/* Interactive Clickable SVG Butterfly */}
              <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                <svg
                  viewBox="0 0 430 156"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Interactive annotated Cooley-Tukey NTT butterfly mod 3329"
                >
                  <line x1="78" y1="36" x2="322" y2="36" stroke="var(--sem-control)" strokeWidth="2" />
                  <line x1="78" y1="114" x2="112" y2="114" stroke="var(--sem-high)" strokeWidth="2" />
                  <line x1="208" y1="114" x2="322" y2="114" stroke="var(--sem-high)" strokeWidth="2" />
                  <line x1="230" y1="114" x2="306" y2="36" stroke="var(--sem-active)" strokeWidth="1.5" strokeDasharray="4 3" />
                  <line x1="230" y1="36" x2="306" y2="114" stroke="var(--sem-active)" strokeWidth="1.5" strokeDasharray="4 3" />

                  {/* Stage 1: Input SRAM */}
                  <g onClick={() => setSelectedNttStage('input-sram')} className="cursor-pointer">
                    <rect
                      x="8"
                      y="18"
                      width="72"
                      height="34"
                      rx="6"
                      fill="var(--bg-canvas)"
                      stroke={selectedNttStage === 'input-sram' ? 'var(--sem-control)' : 'var(--border-subtle)'}
                      strokeWidth={selectedNttStage === 'input-sram' ? 2 : 1.2}
                    />
                    <text x="44" y="39" textAnchor="middle" fill="var(--text-primary)" className="font-mono text-[11px] font-semibold">
                      a={nttTrace.aIn}
                    </text>

                    <rect
                      x="8"
                      y="97"
                      width="72"
                      height="34"
                      rx="6"
                      fill="var(--bg-canvas)"
                      stroke={selectedNttStage === 'input-sram' ? 'var(--sem-control)' : 'var(--border-subtle)'}
                      strokeWidth={selectedNttStage === 'input-sram' ? 2 : 1.2}
                    />
                    <text x="44" y="118" textAnchor="middle" fill="var(--text-primary)" className="font-mono text-[11px] font-semibold">
                      b={nttTrace.bIn}
                    </text>
                  </g>

                  {/* Stage 2: Twiddle Mul */}
                  <g onClick={() => setSelectedNttStage('twiddle-mul')} className="cursor-pointer">
                    <rect
                      x="110"
                      y="92"
                      width="96"
                      height="44"
                      rx="6"
                      fill="var(--bg-elevated)"
                      stroke={selectedNttStage === 'twiddle-mul' ? 'var(--sem-active)' : 'var(--border-subtle)'}
                      strokeWidth={selectedNttStage === 'twiddle-mul' ? 2 : 1.2}
                    />
                    <text x="158" y="110" textAnchor="middle" fill="var(--text-secondary)" className="font-mono text-[9px]">
                      b · {nttTrace.zeta}
                    </text>
                    <text x="158" y="126" textAnchor="middle" fill="var(--text-primary)" className="font-mono text-[11px] font-bold">
                      {nttTrace.bIn * nttTrace.zeta}
                    </text>
                  </g>

                  {/* Stage 3: Barrett Reduction */}
                  <g onClick={() => setSelectedNttStage('barrett-mod')} className="cursor-pointer">
                    <rect
                      x="216"
                      y="92"
                      width="88"
                      height="44"
                      rx="6"
                      fill="var(--bg-elevated)"
                      stroke={selectedNttStage === 'barrett-mod' ? 'var(--sem-control)' : 'var(--border-subtle)'}
                      strokeWidth={selectedNttStage === 'barrett-mod' ? 2 : 1.2}
                    />
                    <text x="260" y="110" textAnchor="middle" fill="var(--text-secondary)" className="font-mono text-[9px]">
                      mod 3329
                    </text>
                    <text x="260" y="126" textAnchor="middle" fill="var(--sem-control)" className="font-mono text-[11px] font-bold">
                      t = {nttTrace.t}
                    </text>
                  </g>

                  {/* Stage 4: Outputs */}
                  <g onClick={() => setSelectedNttStage('add-sub-out')} className="cursor-pointer">
                    <rect
                      x="322"
                      y="18"
                      width="98"
                      height="34"
                      rx="6"
                      fill="var(--bg-canvas)"
                      stroke={selectedNttStage === 'add-sub-out' ? 'var(--sem-high)' : 'var(--sem-control)'}
                      strokeWidth={selectedNttStage === 'add-sub-out' ? 2 : 1.2}
                    />
                    <text x="371" y="39" textAnchor="middle" fill="var(--text-primary)" className="font-mono text-[11px] font-bold">
                      a&apos;={nttTrace.aOut}
                    </text>

                    <rect
                      x="322"
                      y="97"
                      width="98"
                      height="34"
                      rx="6"
                      fill="var(--bg-canvas)"
                      stroke={selectedNttStage === 'add-sub-out' ? 'var(--sem-high)' : 'var(--sem-high)'}
                      strokeWidth={selectedNttStage === 'add-sub-out' ? 2 : 1.2}
                    />
                    <text x="371" y="118" textAnchor="middle" fill="var(--text-primary)" className="font-mono text-[11px] font-bold">
                      b&apos;={nttTrace.bOut}
                    </text>
                  </g>
                </svg>
              </div>

              {/* Selected Stage RTL & Leakage Callout */}
              <div className="p-3.5 rounded-md border border-[var(--sem-active)]/40 bg-[var(--bg-surface)] space-y-1.5 text-xs">
                <div className="font-semibold text-[var(--sem-active)] flex items-center justify-between gap-2">
                  <span>Silicon Stage Note · {activeNttStageInfo.label}</span>
                  <span className="font-mono tabular-nums text-[11px] text-[var(--sem-high)]">
                    GS Inv: ({nttTrace.inverseCheckA}, {nttTrace.inverseCheckB})
                  </span>
                </div>
                <p className="text-[var(--text-primary)] leading-relaxed">{activeNttStageInfo.rtlRole}</p>
                <p className="text-[var(--text-secondary)] leading-relaxed">{activeNttStageInfo.leakageNote}</p>
              </div>
            </div>

            {/* NIST 2026 PQC Benchmark Matrix + CSV Export */}
            <div className="xl:col-span-7 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-[var(--sem-control)]">
                    NIST FIPS 203 / 204 / 205 / 206 &amp; Backup KEM Matrix
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Classical vs. Post-Quantum Footprint &amp; Silicon Bottlenecks
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 p-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs">
                    {(['all', 'KEM / Key Exchange', 'Digital Signature'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setPqcTypeFilter(f)}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                          pqcTypeFilter === f
                            ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {f === 'all' ? 'All Schemes' : f}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--sem-control)]" />
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      <th className="py-2 pr-3 font-medium">Scheme</th>
                      <th className="py-2 pr-3 font-medium">Standard / Family</th>
                      <th className="py-2 pr-3 font-medium text-right">PK (B)</th>
                      <th className="py-2 pr-3 font-medium text-right">CT / Sig (B)</th>
                      <th className="py-2 pr-3 font-medium">Primary Hardware Focus</th>
                      <th className="py-2 font-medium">2026 Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {visiblePqcSchemes.map((s) => (
                      <tr key={s.id} className="hover:bg-[var(--bg-surface)]/70">
                        <td className="py-2.5 pr-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                          {s.name}
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--text-secondary)] whitespace-nowrap">
                          <span className="font-mono text-[var(--sem-control)]">{s.standard}</span>
                          <span aria-hidden="true"> · </span>
                          <span>{s.family}</span>
                        </td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-right text-[var(--text-primary)]">
                          {s.publicKeyBytes.toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-right text-[var(--text-primary)]">
                          {s.ciphertextOrSigBytes.toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--text-secondary)] min-w-[200px]">
                          {s.hardwareFocus}
                        </td>
                        <td className="py-2.5 text-[var(--text-primary)] whitespace-nowrap">
                          {s.status2026}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LAB 2: Live ML-KEM Parameter Explorer & ASIC Area / Power / Latency Estimator */}
        {labOpen && activeLab === 'params' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[var(--sem-control)]">
                  FIPS 203 Interactive Parameter &amp; Hardware Architecture Tuning
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Module-LWE (k, η₁, d_u, d_v) &amp; Silicon Estimator
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[var(--text-secondary)] font-medium mb-1.5">
                    Module Rank k (Security Parameter Set)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([2, 3, 4] as const).map((kVal) => (
                      <button
                        key={kVal}
                        type="button"
                        onClick={() => {
                          setMlKemK(kVal);
                          if (kVal === 2) {
                            setMlKemEta1(3);
                            setMlKemDu(10);
                            setMlKemDv(4);
                          } else if (kVal === 3) {
                            setMlKemEta1(2);
                            setMlKemDu(10);
                            setMlKemDv(4);
                          } else {
                            setMlKemEta1(2);
                            setMlKemDu(11);
                            setMlKemDv(5);
                          }
                        }}
                        className={`py-2 px-3 rounded border font-mono cursor-pointer transition-colors ${
                          mlKemK === kVal
                            ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--sem-control)] font-semibold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                        }`}
                      >
                        k={kVal} ({kVal === 2 ? '512' : kVal === 3 ? '768' : '1024'})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[var(--text-secondary)] mb-1">CBD η₁</div>
                    <div className="flex gap-1">
                      {([2, 3] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMlKemEta1(v)}
                          className={`flex-1 py-1.5 rounded border font-mono cursor-pointer ${
                            mlKemEta1 === v
                              ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] mb-1">Comp d_u</div>
                    <div className="flex gap-1">
                      {([10, 11] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMlKemDu(v)}
                          className={`flex-1 py-1.5 rounded border font-mono cursor-pointer ${
                            mlKemDu === v
                              ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-secondary)] mb-1">Comp d_v</div>
                    <div className="flex gap-1">
                      {([4, 5] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMlKemDv(v)}
                          className={`flex-1 py-1.5 rounded border font-mono cursor-pointer ${
                            mlKemDv === v
                              ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[var(--text-secondary)] font-medium mb-1.5">
                    ASIC / FPGA Hardware Microarchitecture
                  </div>
                  <div className="space-y-1.5">
                    {(
                      [
                        { id: 'single-pe-unmasked', label: 'Compact 1-PE NTT (Unmasked Baseline)' },
                        { id: 'masked-1st-order', label: '1st-Order SCA Masked (A2B/B2A + DOM Keccak)' },
                        { id: 'quad-pe-high-speed', label: 'High-Throughput 4-PE Parallel NTT' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMlKemHwMode(m.id)}
                        className={`w-full text-left px-3 py-2 rounded border text-xs cursor-pointer transition-colors ${
                          mlKemHwMode === m.id
                            ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <div className="text-xs font-mono text-[var(--sem-control)]">
                    Live Computed Sizes &amp; 28nm ASIC Estimate
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {mlKemProfile.schemeLabel} · {mlKemProfile.classicalSecurityBits}-bit Equivalent Security
                  </h3>
                </div>
                <span className="text-xs font-mono text-[var(--sem-high)]">
                  n = 256 · q = 3329
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">Public Key (ek)</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {mlKemProfile.publicKeyBytes.toLocaleString()} B
                  </div>
                </div>
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">Secret Key (dk)</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {mlKemProfile.secretKeyBytes.toLocaleString()} B
                  </div>
                </div>
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">Ciphertext (c)</div>
                  <div className="text-base font-bold text-[var(--sem-control)] mt-0.5">
                    {mlKemProfile.ciphertextBytes.toLocaleString()} B
                  </div>
                </div>
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">Shared Secret</div>
                  <div className="text-base font-bold text-[var(--sem-high)] mt-0.5">
                    {mlKemProfile.sharedSecretBytes} B
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">Decaps Latency</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {mlKemProfile.estimatedCycles.toLocaleString()} cyc
                  </div>
                </div>
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">Estimated Area</div>
                  <div className="text-base font-bold text-[var(--sem-active)] mt-0.5">
                    ~{mlKemProfile.estimatedAreaKge} kGE
                  </div>
                </div>
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">Dynamic Power</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    ~{mlKemProfile.estimatedPowerMw} mW
                  </div>
                </div>
                <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="text-[11px] text-[var(--text-secondary)]">Coeff SRAM</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {mlKemProfile.sramFootprintKb} KB
                  </div>
                </div>
              </div>

              <div className="p-4 rounded border border-[var(--sem-active)]/40 bg-[var(--bg-surface)] text-xs space-y-1">
                <div className="font-semibold text-[var(--sem-active)]">
                  Silicon Critical Path &amp; Workload Breakdown
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {mlKemProfile.criticalPathNote} Per decapsulation: {mlKemProfile.nttCallsPerDecaps} NTT/INTT passes and {mlKemProfile.keccakBlocksPerDecaps} Keccak-f[1600] permutations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* LAB 3: Side-Channel & Constant-Time Simulator */}
        {labOpen && activeLab === 'sca' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-mono text-[var(--sem-control)]">
                  CMOS Dynamic Power &amp; Timing Leakage Model
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Vulnerable Branch/Table vs. Constant-Time DOM Masking
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <label className="space-y-1 block">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)] font-medium">Secret Key Byte</span>
                    <span className="font-mono tabular-nums text-[var(--text-primary)]">
                      0x{secretByte.toString(16).padStart(2, '0').toUpperCase()} ({secretByte.toString(2).padStart(8, '0')})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={secretByte}
                    onChange={(e) => setSecretByte(Number(e.target.value))}
                    className="w-full accent-[var(--sem-control)]"
                  />
                </label>

                <label className="space-y-1 block">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)] font-medium">DOM Random Share Mask (m)</span>
                    <span className="font-mono tabular-nums text-[var(--text-primary)]">
                      0x{maskByte.toString(16).padStart(2, '0').toUpperCase()} ({maskByte.toString(2).padStart(8, '0')})
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={maskByte}
                    onChange={(e) => setMaskByte(Number(e.target.value))}
                    className="w-full accent-[var(--sem-high)]"
                  />
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
                <div className="p-3 rounded border border-[var(--sem-active)]/40 bg-[var(--bg-surface)] space-y-1">
                  <div className="font-semibold text-[var(--sem-active)] flex items-center justify-between">
                    <span>▲ LEAKY BRANCH / UNMASKED</span>
                    <span className="font-mono tabular-nums">{scaResult.leakyCycles} cycles</span>
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {scaResult.leakySnrNote}
                  </p>
                </div>
                <div className="p-3 rounded border border-[var(--sem-high)]/40 bg-[var(--bg-surface)] space-y-1">
                  <div className="font-semibold text-[var(--sem-high)] flex items-center justify-between">
                    <span>● HARDENED CONSTANT-TIME + DOM</span>
                    <span className="font-mono tabular-nums">{scaResult.hardenedCycles} cycles</span>
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {scaResult.hardenedSnrNote}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[var(--text-primary)]">
                  Simulated CMOS Switching Current Profile I_DD (mW eq.) per Key Bit
                </span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-[var(--sem-active)] font-mono">▲ Leaky Trace (HW + Branch)</span>
                  <span className="text-[var(--sem-high)] font-mono">● DOM Masked Constant-Time Trace</span>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
                {scaResult.samples.map((sample) => (
                  <div
                    key={sample.label}
                    className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 flex flex-col items-center gap-2 text-xs"
                  >
                    <div className="font-mono text-[11px] text-[var(--text-secondary)]">
                      {sample.label} (k={sample.secretBit})
                    </div>
                    <div className="w-full h-28 flex items-end justify-center gap-1.5 px-1">
                      <div
                        className="w-3 rounded-t bg-[var(--sem-active)]/85 transition-all duration-150"
                        style={{ height: `${Math.min(100, (sample.leakyPowerMw / 7.5) * 100)}%` }}
                        title={`Leaky: ${sample.leakyPowerMw} mW`}
                      />
                      <div
                        className="w-3 rounded-t bg-[var(--sem-high)]/85 transition-all duration-150"
                        style={{ height: `${Math.min(100, (sample.hardenedPowerMw / 7.5) * 100)}%` }}
                        title={`Hardened: ${sample.hardenedPowerMw} mW`}
                      />
                    </div>
                    <div className="font-mono tabular-nums text-[10px] text-[var(--text-secondary)] text-center">
                      <div>{sample.leakyPowerMw}</div>
                      <div className="text-[var(--sem-high)]">{sample.hardenedPowerMw}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LAB 4: Extended GCD & CRT */}
        {labOpen && activeLab === 'math' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-4">
              <div>
                <div className="text-xs font-mono text-[var(--sem-control)]">
                  Extended Euclidean Algorithm · Bezout Identity
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Modular Inverse Calculator (a^-1 mod m)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="space-y-1 block">
                  <span className="text-[var(--text-secondary)]">Integer a</span>
                  <input
                    type="number"
                    value={modA}
                    onChange={(e) => setModA(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono tabular-nums"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-[var(--text-secondary)]">Modulus m</span>
                  <input
                    type="number"
                    min={2}
                    value={modM}
                    onChange={(e) => setModM(Math.max(2, Number(e.target.value) || 2))}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono tabular-nums"
                  />
                </label>
              </div>

              <div className="p-3 formula-highlight flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                <span>gcd({modA}, {modM}) = {extGcd.gcd}</span>
                {extGcd.inverse !== null ? (
                  <span className="text-[var(--sem-high)] font-semibold">
                    {modA}^-1 === {extGcd.inverse} (mod {modM})
                  </span>
                ) : (
                  <span className="text-[var(--sem-error)] font-semibold">
                    No modular inverse (gcd != 1)
                  </span>
                )}
              </div>

              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      <th className="py-1.5 pr-3">Step</th>
                      <th className="py-1.5 pr-3">Quotient q</th>
                      <th className="py-1.5 pr-3">Remainder r</th>
                      <th className="py-1.5">Bezout s</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {extGcd.steps.map((st) => (
                      <tr key={st.step}>
                        <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{st.step}</td>
                        <td className="py-1.5 pr-3">{st.q}</td>
                        <td className="py-1.5 pr-3">{st.r}</td>
                        <td className="py-1.5">{st.s}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-4">
              <div>
                <div className="text-xs font-mono text-[var(--sem-control)]">
                  Chinese Remainder Theorem (RSA-CRT Acceleration)
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  3-Modulus CRT System Solver
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {crtPairs.map((pair, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-3 font-mono text-[var(--text-secondary)]">
                      x === a_{idx + 1} (mod m_{idx + 1})
                    </span>
                    <input
                      type="number"
                      value={pair.a}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setCrtPairs((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, a: val } : p))
                        );
                      }}
                      className="col-span-4 px-2.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono tabular-nums"
                      aria-label={`CRT remainder a${idx + 1}`}
                    />
                    <span className="col-span-1 text-center font-mono text-[var(--text-secondary)]">mod</span>
                    <input
                      type="number"
                      min={2}
                      value={pair.m}
                      onChange={(e) => {
                        const val = Math.max(2, Number(e.target.value) || 2);
                        setCrtPairs((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, m: val } : p))
                        );
                      }}
                      className="col-span-4 px-2.5 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono tabular-nums"
                      aria-label={`CRT modulus m${idx + 1}`}
                    />
                  </div>
                ))}
              </div>

              <div className="p-3 formula-highlight text-xs font-mono tabular-nums space-y-1">
                {crtResult.coprime && crtResult.x !== null ? (
                  <>
                    <div className="text-[var(--sem-high)] font-semibold">
                      Unique Solution: x === {crtResult.x} (mod {crtResult.M})
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      {crtResult.terms
                        .map((t, i) => `M${i + 1}=${t.Mi}, y${i + 1}=${t.yi}`)
                        .join(' · ')}
                    </div>
                  </>
                ) : (
                  <div className="text-[var(--sem-error)] font-semibold">
                    Moduli must be pairwise coprime (gcd(m_i, m_j) = 1).
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LAB 5: 7-Stage Practical Mastery Path */}
        {labOpen && activeLab === 'mastery' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-secondary)]">
                Check off completed stages along the recommended silicon-to-PQC engineering progression.
              </span>
              <span className="font-mono tabular-nums font-semibold text-[var(--sem-high)]">
                {completedStages.length} / {MASTERY_STAGES.length} Stages Complete
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {MASTERY_STAGES.map((stage) => {
                const done = completedStages.includes(stage.id);
                return (
                  <div
                    key={stage.id}
                    className={`rounded-lg border p-4 flex flex-col justify-between gap-3 ${
                      done
                        ? 'border-[var(--sem-high)]/60 bg-[var(--bg-canvas)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[11px] text-[var(--sem-control)] font-semibold">
                          Stage 0{stage.stageNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleStageComplete(stage.id)}
                          className={`inline-flex items-center gap-1 text-xs font-medium cursor-pointer ${
                            done ? 'text-[var(--sem-high)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          {done ? 'Done' : 'Mark Done'}
                        </button>
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {stage.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {stage.focus}
                      </p>
                      <ul className="space-y-1 text-[11px] text-[var(--text-secondary)] pt-1">
                        {stage.deliverables.map((d) => (
                          <li key={d} className="flex items-start gap-1.5">
                            <span className="text-[var(--sem-control)]">·</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => selectChapter(stage.chapterIds[0], undefined, true)}
                        className="text-[var(--sem-control)] hover:underline font-medium cursor-pointer"
                      >
                        Read Chapter →
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (stage.recommendedLab === 'aes-deep-dive') {
                            onNavigate('aes-deep-dive');
                          } else if (stage.recommendedLab === 'mastery') {
                            selectChapter('ch10-mastery', undefined, true);
                          } else {
                            setActiveLab(stage.recommendedLab as LabTabId);
                            setLabOpen(true);
                            document
                              .getElementById('crypto-workbench')
                              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Open Lab
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Main Three-Zone Documentation Architecture: Left Hierarchical Nav | Main Reader | Right Sticky Mini-TOC & Related Silicon */}
      <div
        id="crypto-chapter-reader"
        className="scroll-mt-28 [overflow-anchor:none] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Mobile Syllabus Toggle */}
        <div className="lg:hidden flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] no-print">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] cursor-pointer"
          >
            <Menu className="w-4 h-4 text-[var(--sem-control)]" />
            {mobileSidebarOpen ? 'Hide Chapter Syllabus' : 'Browse 10 Chapters'}
          </button>
          <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
            Progress: {progressPct}%
          </span>
        </div>

        {/* Left Hierarchical Persistent Sidebar */}
        <aside
          className={`${
            mobileSidebarOpen ? 'block' : 'hidden'
          } lg:block lg:col-span-4 xl:col-span-3 lg:sticky lg:top-[76px] space-y-4`}
        >
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter chapters, PQC, CPA, NTT..."
                className="w-full pl-8 pr-8 py-2 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--sem-control)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Clear syllabus filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[65vh] overflow-y-auto [overflow-anchor:none] pr-1">
              {SIDEBAR_GROUPS.map((grp) => {
                const grpChapters = filteredChapters.filter((ch) =>
                  grp.chapterIds.includes(ch.id)
                );
                if (grpChapters.length === 0) return null;
                const isExpanded = expandedGroups[grp.id] !== false;

                return (
                  <div key={grp.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleSidebarGroup(grp.id)}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <span>{grp.label}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          isExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>

                    {isExpanded &&
                      grpChapters.map((ch) => {
                        const active = ch.id === activeChapter.id;
                        return (
                          <div key={ch.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => selectChapter(ch.id)}
                              className={`w-full text-left px-3 py-2 rounded-md border transition-colors cursor-pointer ${
                                active
                                  ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                                  : 'border-transparent hover:bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums text-[var(--sem-control)]">
                                <span>Chapter {String(ch.number).padStart(2, '0')}</span>
                                <span>{ch.subtopics.length} topics</span>
                              </div>
                              <div className="text-sm font-semibold mt-0.5 leading-snug">
                                {ch.title}
                              </div>
                            </button>

                            {active && (
                              <div className="pl-3 space-y-0.5 pb-1">
                                {ch.subtopics.map((sub) => (
                                  <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setHighlightedSubtopicId(sub.id)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer truncate ${
                                      highlightedSubtopicId === sub.id
                                        ? 'text-[var(--sem-control)] font-semibold bg-[var(--bg-canvas)]'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                    title={sub.title}
                                  >
                                    {sub.title}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                );
              })}

              {filteredChapters.length === 0 && (
                <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                  No matching chapters or subtopics for &ldquo;{searchQuery}&rdquo;.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Chapter Content Canvas */}
        <div className="lg:col-span-8 xl:col-span-6 space-y-6 min-h-[85vh] [overflow-anchor:none]">
          {/* Chapter Framing Banner */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-[var(--sem-control)]">
                  Chapter {String(activeChapter.number).padStart(2, '0')}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeChapter.stackLayerLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{visibleSubtopics.length} Topics</span>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => setShowSiliconNotes((v) => !v)}
                  className="px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {showSiliconNotes ? 'Compact View' : 'Expand Details'}
                </button>
                <button
                  type="button"
                  disabled={!prevChapter}
                  onClick={() => prevChapter && selectChapter(prevChapter.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={!nextChapter}
                  onClick={() => nextChapter && selectChapter(nextChapter.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Reading Progress Indicator */}
            <div className="w-full h-1 rounded-full bg-[var(--bg-canvas)] overflow-hidden">
              <div
                className="h-full bg-[var(--sem-control)] transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              {activeChapter.number}. {activeChapter.title}
            </h2>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="p-4 rounded-md border border-[var(--sem-active)]/40 bg-[var(--bg-canvas)] space-y-1.5">
                <div className="font-semibold text-[var(--sem-active)] flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  Silicon &amp; VLSI Security Engineer Perspective
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed max-w-[75ch]">
                  {activeChapter.vlsiPerspective}
                </p>
              </div>

              <div className="p-4 rounded-md border border-[var(--sem-high)]/40 bg-[var(--bg-canvas)] space-y-1.5">
                <div className="font-semibold text-[var(--sem-high)] flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  Verified Architectural Takeaway
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed max-w-[75ch]">
                  {activeChapter.keyTakeaway}
                </p>
              </div>
            </div>
          </div>

          {/* Subtopic Deep-Dive Cards (Math <-> RTL <-> Silicon + Progressive Disclosure) */}
          <div className="space-y-5">
            {visibleSubtopics.map((sub, idx) => {
              const isHighlighted = highlightedSubtopicId === sub.id;
              const isCollapsed = collapsedSubtopics[sub.id] ?? !showSiliconNotes;
              return (
                <article
                  key={sub.id}
                  id={`crypto-sub-${sub.id}`}
                  className={`rounded-lg border p-6 space-y-4 transition-colors ${
                    isHighlighted
                      ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="text-xs font-mono text-[var(--text-secondary)] tabular-nums">
                        {activeChapter.number}.{idx + 1} · {activeChapter.title}
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">
                        {sub.title}
                      </h3>
                      <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-[75ch]">
                        {sub.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedSubtopics((prev) => ({
                          ...prev,
                          [sub.id]: !isCollapsed,
                        }))
                      }
                      className="text-xs font-mono text-[var(--sem-control)] hover:underline cursor-pointer shrink-0 no-print"
                    >
                      {isCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <>
                      {/* Side-by-Side Math / Formal <-> Silicon / RTL <-> Attack / Defense */}
                      <div className="space-y-3 text-sm">
                        <div className="p-4 formula-highlight space-y-1.5">
                          <div className="font-semibold text-[var(--sem-control)] flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4" />
                            Mechanics &amp; Formal Structure
                          </div>
                          <p className="text-[var(--text-primary)] leading-relaxed max-w-[75ch]">
                            {sub.mechanics}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-4 rounded-md border border-[var(--sem-active)]/40 bg-[var(--bg-canvas)] space-y-1.5">
                            <div className="font-semibold text-[var(--sem-active)] flex items-center gap-1.5">
                              <Cpu className="w-4 h-4" />
                              Silicon Notes (RTL, Area &amp; Microarchitecture)
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                              {sub.siliconAndRtlLink}
                            </p>
                          </div>

                          <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-1.5">
                            <div className="font-semibold text-[var(--sem-error)] flex items-center gap-1.5">
                              <ShieldAlert className="w-4 h-4" />
                              Attack Surface &amp; Countermeasures
                            </div>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                              {sub.attackAndDefense}
                            </p>
                          </div>
                        </div>
                      </div>

                      {sub.codeSnippet && (
                        <div className="pt-1">
                          <CodeBlock
                            title={sub.codeSnippet.title}
                            language={sub.codeSnippet.language}
                            code={sub.codeSnippet.code}
                          />
                        </div>
                      )}

                      {sub.atlasLinks && sub.atlasLinks.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs no-print">
                          <span className="text-[var(--text-secondary)] inline-flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5" />
                            Related Silicon &amp; Specs:
                          </span>
                          {sub.atlasLinks.map((lnk) => (
                            <button
                              key={`${sub.id}-${lnk.targetId}`}
                              type="button"
                              onClick={() => handleAtlasLink(lnk)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--sem-control)] hover:border-[var(--sem-control)] font-medium cursor-pointer"
                            >
                              {lnk.label}
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>

          {/* Bottom Chapter Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)] no-print">
            {prevChapter ? (
              <button
                type="button"
                onClick={() => selectChapter(prevChapter.id, undefined, true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous: {prevChapter.number}. {prevChapter.title}
              </button>
            ) : (
              <span />
            )}

            {nextChapter && (
              <button
                type="button"
                onClick={() => selectChapter(nextChapter.id, undefined, true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[var(--sem-control)] text-xs font-semibold text-white dark:text-slate-950 hover:opacity-90 cursor-pointer"
              >
                Next: {nextChapter.number}. {nextChapter.title}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Sticky Mini-TOC + Live Parameter Snapshot + Related Silicon */}
        <aside className="hidden xl:block xl:col-span-3 xl:sticky xl:top-[76px] space-y-4 no-print">
          {/* Mini-TOC */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-primary)]">On This Chapter</span>
              <span className="font-mono tabular-nums text-[var(--sem-control)]">
                {progressPct}% stack
              </span>
            </div>
            <div className="space-y-1 max-h-[260px] overflow-y-auto pr-1">
              {visibleSubtopics.map((sub, i) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setHighlightedSubtopicId(sub.id)}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer truncate ${
                    highlightedSubtopicId === sub.id
                      ? 'bg-[var(--bg-elevated)] text-[var(--sem-control)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title={sub.title}
                >
                  {activeChapter.number}.{i + 1} {sub.title}
                </button>
              ))}
            </div>
          </div>

          {/* Live ML-KEM Snapshot */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Active ML-KEM Spec</span>
              <button
                type="button"
                onClick={() => {
                  setActiveLab('params');
                  setLabOpen(true);
                  document
                    .getElementById('crypto-workbench')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="text-[11px] font-mono text-[var(--sem-control)] hover:underline cursor-pointer"
              >
                Tune →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono tabular-nums">
              <div className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-secondary)]">Rank / PK</div>
                <div className="text-[var(--text-primary)] font-semibold">
                  k={mlKemProfile.k} · {mlKemProfile.publicKeyBytes}B
                </div>
              </div>
              <div className="p-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                <div className="text-[10px] text-[var(--text-secondary)]">Area / Latency</div>
                <div className="text-[var(--sem-active)] font-semibold">
                  {mlKemProfile.estimatedAreaKge}kGE · {(mlKemProfile.estimatedCycles / 1000).toFixed(1)}k
                </div>
              </div>
            </div>
          </div>

          {/* Related Silicon Box */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-2.5 text-xs">
            <div className="font-semibold text-[var(--text-primary)]">Related Silicon &amp; Standards</div>
            <div className="space-y-1.5">
              {[
                { label: 'OpenTitan AES (DOM Masked)', action: () => onSelectIp('opentitan-aes') },
                { label: 'OpenTitan TL-UL Bus Integrity', action: () => onSelectProtocol('tl-ul') },
                { label: 'lowRISC Ibex RoT Core', action: () => onSelectIp('ibex') },
                { label: 'AES 7-Chapter FIPS-197 Lab', action: () => onNavigate('aes-deep-dive') },
                { label: 'RTL Design 14 Modules', action: () => onNavigate('rtl-design') },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full text-left px-2.5 py-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--sem-control)] hover:border-[var(--sem-control)] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="truncate">{item.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
