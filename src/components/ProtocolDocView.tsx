import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Cpu,
  ExternalLink,
  FileCode2,
  GitBranch,
  GraduationCap,
  HelpCircle,
  Layers,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { ProtocolDocument, SignalDefinition } from '../types/protocol';
import { ALL_PROTOCOLS } from '../data/protocols';
import { PROTOCOL_CATEGORIES } from '../data/categories';
import { WaveformViewer } from './WaveformViewer';
import { BlockDiagramSvg, CodeBlock, FsmDiagramSvg } from './DiagramViewers';
import { PacketLayerInspectorSvg, UvmArchitectureFlowSvg } from './TechnicalVisualizers';
import { StudentExplainerCard } from './StudentExplainerCard';
import { CompletenessTrackerPanel } from './CompletenessTrackerPanel';
import { auditProtocolCompleteness } from '../utils/completenessTracker';
import {
  explainSignalLikeStudent,
  getProtocolOfficialLinks,
  getProtocolStudentExplainer,
  SECTION_STUDENT_GUIDES,
} from '../data/studentExplainers';
import { ALL_IPS } from '../data/ips';
import { LayeredExplanationPanel } from './LayeredExplanationPanel';
import { getProtocolLayeredExplanation } from '../data/conceptDepthEngine';
import {
  getEntityClassification,
  getEntityRelationships,
  getLifecycleNote,
  getLifecycleStatus,
} from '../utils/entityTaxonomy';

export type UseCaseFilter = 'all' | 'rtl' | 'uvm' | 'interview';

interface ProtocolDocViewProps {
  protocol: ProtocolDocument;
  useCaseFilter?: UseCaseFilter;
  onSelectProtocol?: (id: string) => void;
  mobileSidebarOpen?: boolean;
  onCloseMobileSidebar?: () => void;
  onBack: () => void;
  onOpenLab: (simId: string) => void;
  onCompare: (protoId: string) => void;
  onSelectIp?: (ipId: string) => void;
  onOpenAesDeepDive?: () => void;
  onOpenKnowledgeGraph?: (nodeId: string) => void;
  onOpenExplainer?: (topicId?: string) => void;
  onOpenCurriculum?: (pillar: 'rtl-design' | 'systemverilog' | 'uvm-methodology') => void;
}

type AnchorSectionId =
  | 'sec-overview'
  | 'sec-block-fsm'
  | 'sec-signals'
  | 'sec-timing-sva'
  | 'sec-rtl-verif'
  | 'sec-debug-interview';

const ANCHOR_SECTIONS: Array<{
  id: AnchorSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  useCases: UseCaseFilter[];
}> = [
  { id: 'sec-overview', label: 'Overview', icon: Layers, useCases: ['all', 'interview'] },
  { id: 'sec-block-fsm', label: 'Block Diagram & FSM', icon: Cpu, useCases: ['all', 'rtl'] },
  { id: 'sec-signals', label: 'Signal Table', icon: GitBranch, useCases: ['all', 'rtl', 'uvm'] },
  { id: 'sec-timing-sva', label: 'Timing & SVA', icon: Activity, useCases: ['all', 'rtl', 'uvm'] },
  { id: 'sec-rtl-verif', label: 'RTL & Verification', icon: ShieldCheck, useCases: ['all', 'rtl', 'uvm'] },
  { id: 'sec-debug-interview', label: 'Debugging & Interview', icon: HelpCircle, useCases: ['all', 'uvm', 'interview'] },
];

interface SidebarGroup {
  id: string;
  title: string;
  categoryIds: string[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'on-chip',
    title: 'On-Chip Buses',
    categoryIds: ['amba', 'interconnect', 'processor', 'noc'],
  },
  {
    id: 'serial',
    title: 'Serial Interfaces',
    categoryIds: ['peripheral', 'usb', 'mipi', 'display', 'automotive', 'wireless', 'industrial'],
  },
  {
    id: 'high-speed',
    title: 'High-Speed Interconnects',
    categoryIds: ['high-speed', 'networking', 'chip-to-chip', 'accelerator', 'phy-serdes', 'packaging'],
  },
  {
    id: 'memory',
    title: 'Memory & Coherence',
    categoryIds: ['memory', 'storage', 'coherency'],
  },
  {
    id: 'system',
    title: 'System & Verification',
    categoryIds: ['debug', 'security', 'power-mgmt', 'standards', 'dft-test', 'clock-cdc', 'verif-eda', 'proc-arch', 'phys-design', 'safety'],
  },
];

function useIsDesktopXl(): boolean {
  const [isXl, setIsXl] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1280px)').matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsXl(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isXl;
}

export const ProtocolDocView: React.FC<ProtocolDocViewProps> = ({
  protocol,
  useCaseFilter = 'all',
  onSelectProtocol,
  mobileSidebarOpen = false,
  onCloseMobileSidebar,
  onBack,
  onOpenLab,
  onCompare,
  onSelectIp,
  onOpenAesDeepDive,
  onOpenKnowledgeGraph,
  onOpenExplainer,
  onOpenCurriculum,
}) => {
  const isDesktopXl = useIsDesktopXl();
  const [activeAnchor, setActiveAnchor] = useState<AnchorSectionId>('sec-overview');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [depthLevel, setDepthLevel] = useState<'all' | 'l1' | 'l2' | 'l3'>('all');
  const [showLayeredPanel, setShowLayeredPanel] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<SignalDefinition | null>(null);
  const [signalQuery, setSignalQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [selectedWaveformId, setSelectedWaveformId] = useState<string>(protocol.waveforms[0]?.id || '');
  const [iqLevelFilter, setIqLevelFilter] = useState<string>('ALL');
  const [openIqIds, setOpenIqIds] = useState<Record<string, boolean>>({});
  const [sandboxTab, setSandboxTab] = useState<'waveform' | 'sva'>('waveform');
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const signalDrawerRef = useRef<HTMLDivElement | null>(null);

  const inspectSignal = (sig: SignalDefinition) => {
    setSelectedSignal(sig);
    window.requestAnimationFrame(() => {
      signalDrawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  // Build grouped 498-protocol tree for the 260px left navigation sidebar
  const groupedProtocols = useMemo(() => {
    const protoById = new Map(ALL_PROTOCOLS.map((p) => [p.id, p]));
    const catById = new Map<string, (typeof PROTOCOL_CATEGORIES)[number]>(
      PROTOCOL_CATEGORIES.map((c) => [c.id, c])
    );
    const assignedIds = new Set<string>();

    const groups = SIDEBAR_GROUPS.map((grp) => {
      const items: ProtocolDocument[] = [];
      const seenInGroup = new Set<string>();
      for (const cid of grp.categoryIds) {
        const cat = catById.get(cid);
        if (!cat) continue;
        for (const pid of cat.protocolIds) {
          if (seenInGroup.has(pid)) continue;
          const doc = protoById.get(pid);
          if (doc) {
            seenInGroup.add(pid);
            assignedIds.add(pid);
            items.push(doc);
          }
        }
      }
      return { id: grp.id, title: grp.title, protocols: items };
    });

    // Catch any protocol not explicitly listed in categoryIds so 100% of 498 entries remain reachable
    const unassigned = ALL_PROTOCOLS.filter((p) => !assignedIds.has(p.id));
    if (unassigned.length > 0) {
      groups[groups.length - 1].protocols.push(...unassigned);
    }
    return groups;
  }, []);

  const activeGroupId = useMemo(() => {
    const found = groupedProtocols.find((g) => g.protocols.some((p) => p.id === protocol.id));
    return found?.id || 'on-chip';
  }, [groupedProtocols, protocol.id]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => ({
    [activeGroupId]: true,
  }));

  useEffect(() => {
    setExpandedGroups((prev) => ({ ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  const relatedIps = useMemo(
    () =>
      ALL_IPS.filter((ip) =>
        ip.interfaces.some(
          (i) =>
            i.protocolId === protocol.id ||
            (protocol.id === 'tl-ul-integrity' && i.protocolId === 'tl-ul') ||
            (protocol.id === 'tl-ul' && i.protocolId === 'tl-ul-integrity')
        )
      ),
    [protocol.id]
  );

  const officialLinks = useMemo(() => getProtocolOfficialLinks(protocol), [protocol]);
  const layeredExplanation = useMemo(() => getProtocolLayeredExplanation(protocol), [protocol]);
  const entityCls = useMemo(() => getEntityClassification(protocol), [protocol]);
  const lifecycleStatus = useMemo(() => getLifecycleStatus(protocol), [protocol]);
  const lifecycleNote = useMemo(() => getLifecycleNote(protocol), [protocol]);
  const relationships = useMemo(() => getEntityRelationships(protocol), [protocol]);

  // Reset local filters when switching protocols without disrupting layout
  useEffect(() => {
    setSelectedSignal(null);
    setSignalQuery('');
    setChannelFilter('ALL');
    setSelectedWaveformId(protocol.waveforms[0]?.id || '');
    setIqLevelFilter('ALL');
    setActiveAnchor('sec-overview');
  }, [protocol.id, protocol.waveforms]);

  // Auto-open top interview questions when Interview Prep mode is active
  useEffect(() => {
    if (useCaseFilter === 'interview' && protocol.interviewQuestions.length > 0) {
      setOpenIqIds((prev) => ({
        ...prev,
        [protocol.interviewQuestions[0].id]: true,
        ...(protocol.interviewQuestions[1] ? { [protocol.interviewQuestions[1].id]: true } : {}),
      }));
    }
  }, [useCaseFilter, protocol.interviewQuestions]);

  // Live Scrollspy with IntersectionObserver across all 6 anchor sections
  useEffect(() => {
    const ids = ANCHOR_SECTIONS.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveAnchor(visible[0].target.id as AnchorSectionId);
        }
      },
      {
        rootMargin: '-88px 0px -58% 0px',
        threshold: 0,
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [protocol.id]);

  const scrollToSection = (id: AnchorSectionId) => {
    setActiveAnchor(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onCloseMobileSidebar?.();
  };

  const filteredSignals = useMemo(() => {
    return protocol.signals.filter((s) => {
      const matchesChan = channelFilter === 'ALL' || s.channel === channelFilter;
      const q = signalQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.channel.toLowerCase().includes(q);
      return matchesChan && matchesQuery;
    });
  }, [protocol.signals, channelFilter, signalQuery]);

  const activeWaveform =
    protocol.waveforms.find((w) => w.id === selectedWaveformId) || protocol.waveforms[0];

  const filteredQuestions = useMemo(() => {
    return protocol.interviewQuestions.filter(
      (q) => iqLevelFilter === 'ALL' || q.level === iqLevelFilter
    );
  }, [protocol.interviewQuestions, iqLevelFilter]);

  const simMapping: Record<string, string> = {
    axi4: 'axi4',
    'axi4-lite': 'axi4-lite',
    'axi4-stream': 'axi4-stream',
    apb: 'apb',
    spi: 'spi',
    i2c: 'i2c',
    uart: 'uart',
  };

  const isSectionEmphasized = (id: AnchorSectionId) => {
    if (useCaseFilter === 'all') return true;
    const item = ANCHOR_SECTIONS.find((s) => s.id === id);
    return item ? item.useCases.includes(useCaseFilter) : true;
  };

  const sectionEmphasisClass = (id: AnchorSectionId) =>
    isSectionEmphasized(id)
      ? 'opacity-100 transition-opacity duration-200'
      : 'opacity-55 hover:opacity-100 transition-opacity duration-200';

  const sidebarFilterLower = sidebarSearch.trim().toLowerCase();

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border-subtle)] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Protocol Directory
          </span>
          <span className="text-[11px] font-mono tabular-nums text-[var(--text-secondary)]">
            {ALL_PROTOCOLS.length}
          </span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Jump to protocol..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--sem-control)]"
          />
          {sidebarSearch && (
            <button
              type="button"
              onClick={() => setSidebarSearch('')}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {groupedProtocols.map((grp) => {
          const matchingProtocols = sidebarFilterLower
            ? grp.protocols.filter(
                (p) =>
                  p.name.toLowerCase().includes(sidebarFilterLower) ||
                  p.fullName.toLowerCase().includes(sidebarFilterLower) ||
                  p.id.toLowerCase().includes(sidebarFilterLower)
              )
            : grp.protocols;

          if (sidebarFilterLower && matchingProtocols.length === 0) return null;

          const isExpanded = sidebarFilterLower ? true : Boolean(expandedGroups[grp.id]);

          return (
            <div key={grp.id} className="space-y-1">
              <button
                type="button"
                onClick={() => setExpandedGroups((prev) => ({ ...prev, [grp.id]: !isExpanded }))}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                <span className="truncate">{grp.title}</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-[var(--text-secondary)] shrink-0">
                  {matchingProtocols.length}
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
              </button>

              {isExpanded && (
                <div className="space-y-0.5 pl-1.5">
                  {matchingProtocols.map((item) => {
                    const isActive = item.id === protocol.id;
                    return (
                      <div key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProtocol?.(item.id);
                            onCloseMobileSidebar?.();
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-r-md transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                            isActive
                              ? 'border-l-2 border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
                              : 'border-l-2 border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60'
                          }`}
                        >
                          <span className="truncate">{item.name}</span>
                          {isActive && (
                            <span className="text-[10px] font-mono text-[var(--sem-control)] shrink-0">
                              {item.signals.length}s
                            </span>
                          )}
                        </button>

                        {/* Nested Quick-Jump Anchor Links under Active Protocol */}
                        {isActive && (
                          <div className="ml-3 mt-1 mb-2 pl-2.5 border-l border-[var(--border-subtle)] space-y-0.5">
                            {ANCHOR_SECTIONS.map((sec) => {
                              const anchorActive = activeAnchor === sec.id;
                              return (
                                <button
                                  key={sec.id}
                                  type="button"
                                  onClick={() => scrollToSection(sec.id)}
                                  className={`w-full text-left px-2 py-1 text-[11px] rounded transition-colors cursor-pointer ${
                                    anchorActive
                                      ? 'text-[var(--sem-control)] font-semibold bg-[var(--bg-elevated)]/80'
                                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  {sec.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
      {/* Mobile Slide-Over Sidebar Drawer (< lg) */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => onCloseMobileSidebar?.()}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Atlas Navigation</span>
              <button
                type="button"
                onClick={() => onCloseMobileSidebar?.()}
                aria-label="Close sidebar"
                className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{renderSidebarBody()}</div>
          </aside>
        </div>
      )}

      {/* Three-Column Engineering Documentation Shell */}
      <div className="flex flex-col lg:flex-row items-start gap-6 2xl:gap-8">
        {/* Column 1: Fixed Left Sidebar Navigation (Desktop lg+) */}
        <aside className="hidden lg:flex lg:w-[236px] xl:w-[244px] shrink-0 sticky top-[76px] h-[calc(100vh-92px)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-col overflow-hidden">
          {renderSidebarBody()}
        </aside>

        {/* Column 2: Center Documentation Stream */}
        <div ref={contentContainerRef} className="flex-1 min-w-0 w-full space-y-10">
          {/* Document Header & Actions */}
          <div className="pb-6 border-b border-[var(--border-subtle)] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  All Protocols
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--sem-control)]">{entityCls}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        lifecycleStatus === 'Superseded / Merged'
                          ? 'font-semibold text-[var(--sem-data)]'
                          : lifecycleStatus === 'Deprecated / Historical'
                          ? 'font-semibold text-[var(--sem-error)]'
                          : lifecycleStatus === 'Research / Emerging'
                          ? 'font-semibold text-[var(--sem-control)]'
                          : 'text-[var(--sem-high)] font-medium'
                      }
                    >
                      {lifecycleStatus}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{protocol.standardBody}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{protocol.specVersion}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
                    {protocol.name}{' '}
                    <span className="font-normal text-[var(--text-secondary)] text-lg sm:text-xl">
                      — {protocol.fullName}
                    </span>
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onOpenExplainer && (
                  <button
                    type="button"
                    onClick={() => {
                      const mapped =
                        protocol.id === 'axi4'
                          ? 'axi4-handshakes'
                          : protocol.id === 'pcie-gen5'
                          ? 'pcie-ltssm-tlp'
                          : protocol.id === 'ddr5'
                          ? 'ddr5-bank-refresh'
                          : `proto-${protocol.id}`;
                      onOpenExplainer(mapped);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--sem-control)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Activity className="w-4 h-4" />
                    Interactive Explainer
                  </button>
                )}
                {(protocol.id === 'tl-ul' || protocol.id === 'tl-ul-integrity' || protocol.id === 'entropy-if') &&
                  onOpenAesDeepDive && (
                    <button
                      type="button"
                      onClick={onOpenAesDeepDive}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--sem-high)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      AES 7-Chapter Lab →
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => onCompare(protocol.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Compare Protocol
                </button>
                {onOpenKnowledgeGraph && (
                  <button
                    type="button"
                    onClick={() => onOpenKnowledgeGraph(`proto:${protocol.id}`)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Knowledge Graph
                  </button>
                )}
                {simMapping[protocol.id] && (
                  <button
                    type="button"
                    onClick={() => onOpenLab(simMapping[protocol.id])}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-[var(--sem-control)] hover:opacity-90 text-white transition-opacity cursor-pointer whitespace-nowrap"
                  >
                    Launch in Simulator
                  </button>
                )}
              </div>
            </div>

            {/* Understanding Layer Depth Filter + 16-Checkpoint Completeness Tracker */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2 text-[var(--text-secondary)]">
                  <span className="font-semibold text-[var(--text-primary)]">Understanding Layer:</span>
                  <span>Filter depth progression across standard spec, signals, RTL, and verification</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[var(--sem-control)]">
                    [OFFICIAL SPECIFICATION] · [ENGINEERING RECOMMENDATION]
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    {[
                      { id: 'all' as const, label: 'All 3 Levels' },
                      { id: 'l1' as const, label: 'L1 Fundamental' },
                      { id: 'l2' as const, label: 'L2 Engineering' },
                      { id: 'l3' as const, label: 'L3 Expert (RTL/DV)' },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setDepthLevel(lvl.id);
                          setShowLayeredPanel(true);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                          depthLevel === lvl.id
                            ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLayeredPanel((v) => !v)}
                    className="px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] font-medium cursor-pointer transition-colors"
                  >
                    {showLayeredPanel ? 'Hide Progressive Layers' : 'Show Progressive Layers'}
                  </button>
                </div>
              </div>

              <CompletenessTrackerPanel title={protocol.name} report={auditProtocolCompleteness(protocol)} />

              {useCaseFilter !== 'all' && (
                <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">
                    Use-case focus active:{' '}
                    <strong className="text-[var(--text-primary)]">
                      {useCaseFilter === 'rtl'
                        ? 'RTL Design (Architecture, FSM, Signals & SystemVerilog)'
                        : useCaseFilter === 'uvm'
                        ? 'UVM Verification (Timing, SVA Assertions, Coverage & Debugging)'
                        : 'Interview Prep (First-Principles Overview & Design Review Q&A)'}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Signal-to-RTL Inspector Drawer (whenever a signal row is clicked) */}
          {selectedSignal && (
            <div
              ref={signalDrawerRef}
              className="scroll-mt-[88px] rounded-lg border border-[var(--sem-control)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="text-xs text-[var(--sem-control)] font-medium">
                    Protocol-to-RTL Signal Inspector · {selectedSignal.channel}
                  </div>
                  <h3 className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">
                    {selectedSignal.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] mt-1.5">
                    <span>
                      Width:{' '}
                      <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                        {selectedSignal.width}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Direction: <strong className="text-[var(--text-primary)]">{selectedSignal.direction}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Reset:{' '}
                      <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                        {selectedSignal.resetValue}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedSignal.polarity}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSignal(null)}
                  className="p-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Close Signal Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-start gap-3 text-xs text-[var(--text-secondary)]">
                <GraduationCap className="w-4 h-4 text-[var(--sem-control)] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[var(--text-primary)]">In Simple Words (Student Guide): </strong>
                  {explainSignalLikeStudent(
                    selectedSignal.name,
                    selectedSignal.direction,
                    `${selectedSignal.width}b`,
                    selectedSignal.summary
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Signal Definition &amp; Timing Rules
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{selectedSignal.summary}</p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
                    {selectedSignal.timingRules}
                  </p>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="font-semibold text-[var(--sem-high)]">Legal Condition: </span>
                    <span className="text-[var(--text-secondary)]">{selectedSignal.legalConditions}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--sem-error)]">Illegal Condition: </span>
                    <span className="text-[var(--text-secondary)]">{selectedSignal.illegalConditions}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text-primary)]">Dependencies: </span>
                    <span className="font-mono text-[var(--sem-control)]">
                      {selectedSignal.dependencies.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                <CodeBlock
                  title={`${selectedSignal.name}_rtl.sv`}
                  language="SystemVerilog RTL"
                  code={selectedSignal.rtlExample}
                />
                <CodeBlock
                  title={`${selectedSignal.name}_sva.sv`}
                  language="SystemVerilog Assertion"
                  code={selectedSignal.svaAssertion}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-subtle)] text-xs">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1.5">UVM Driver / Verification Note</h4>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{selectedSignal.uvmDriverNote}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1.5">Common RTL &amp; DV Pitfalls</h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-[var(--text-secondary)]">
                    {selectedSignal.commonBugs.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* ANCHOR 1: OVERVIEW & SPECIFICATIONS                              */}
          {/* ================================================================ */}
          <section id="sec-overview" className={`scroll-mt-[84px] space-y-8 ${sectionEmphasisClass('sec-overview')}`}>
            {(lifecycleNote ||
              relationships.length > 0 ||
              lifecycleStatus === 'Superseded / Merged' ||
              lifecycleStatus === 'Deprecated / Historical' ||
              entityCls !== 'Communication Protocol') && (
              <div
                className={`rounded-lg border p-6 text-xs space-y-2 ${
                  lifecycleStatus === 'Superseded / Merged' || lifecycleStatus === 'Deprecated / Historical'
                    ? 'border-[var(--sem-data)]/50 bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="font-semibold flex flex-wrap items-center gap-2 text-[var(--text-primary)]">
                  <span>Classification: {entityCls}</span>
                  <span aria-hidden="true">·</span>
                  <span>Lifecycle Status: {lifecycleStatus}</span>
                </div>
                {lifecycleNote && <p className="leading-relaxed">{lifecycleNote}</p>}
                {relationships.length > 0 && (
                  <div className="text-[11px] opacity-90">
                    <strong className="font-semibold">Architecture &amp; Standard Lineage:</strong>{' '}
                    {relationships.join(' · ')}
                  </div>
                )}
              </div>
            )}

            {showLayeredPanel && (
              <LayeredExplanationPanel explanation={layeredExplanation} depthLevel={depthLevel} />
            )}

            <StudentExplainerCard
              data={getProtocolStudentExplainer(protocol)}
              label={`New to ${protocol.name}? · Student First-Principles Explainer`}
            />

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">01. Protocol Overview</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                  {protocol.overview.definition}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Why It Was Developed</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    {protocol.overview.whyDeveloped}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Core Problem Solved</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                    {protocol.overview.problemSolved}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-[var(--border-subtle)] text-xs">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-2.5">Primary SoC Applications</h3>
                  <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-4">
                    {protocol.overview.usedIn.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--sem-high)] mb-2.5">Engineering Advantages</h3>
                  <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-4">
                    {protocol.overview.advantages.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--sem-data)] mb-2.5">Trade-offs &amp; Limitations</h3>
                  <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-4">
                    {protocol.overview.limitations.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-5 border-t border-[var(--border-subtle)]">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-3">Role Terminology</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {protocol.overview.terminology.map((t, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="font-semibold font-mono text-[var(--sem-control)]">{t.term}</span>
                      <span className="text-[var(--text-secondary)] leading-relaxed">{t.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Technical Specifications Matrix */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
              <div className="px-6 sm:px-8 py-5 border-b border-[var(--border-subtle)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  02. Technical Specifications Matrix
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Normative standard constraints separated from configurable and implementation-specific parameters.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                      <th className="py-3.5 px-6 font-semibold">Parameter</th>
                      <th className="py-3.5 px-6 font-semibold">Specification</th>
                      <th className="py-3.5 px-6 font-semibold">Classification</th>
                      <th className="py-3.5 px-6 font-semibold">Engineering Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {protocol.specifications.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-[var(--text-primary)]">{row.parameter}</td>
                        <td className="py-3.5 px-6 font-mono text-[var(--sem-control)] tabular-nums">
                          {row.value}
                        </td>
                        <td className="py-3.5 px-6 text-[var(--text-secondary)]">{row.classification}</td>
                        <td className="py-3.5 px-6 text-[var(--text-secondary)]">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {protocol.versionDifferences && protocol.versionDifferences.length > 0 && (
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Revision &amp; Version Evolution</h3>
                <div className="space-y-3">
                  {protocol.versionDifferences.map((v, i) => (
                    <div
                      key={i}
                      className="text-xs border-b border-[var(--border-subtle)] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="font-mono font-semibold text-[var(--sem-control)]">{v.version}</div>
                      <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">{v.keyChanges}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                  Official Standards &amp; Reference Links
                </h3>
                <div className="space-y-2.5 text-xs">
                  {officialLinks.map((lnk) => (
                    <a
                      key={lnk.url + lnk.label}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--sem-control)] transition-colors"
                    >
                      <div>
                        <div className="font-medium text-[var(--sem-control)]">{lnk.label}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">{lnk.authority}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    </a>
                  ))}
                </div>
                <ul className="space-y-1 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                  {protocol.sources.map((src, i) => (
                    <li key={i}>
                      <span className="font-medium text-[var(--text-primary)]">{src.title}</span> · {src.reference}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[var(--sem-control)]" />
                  Real Open-Source Silicon Using {protocol.name} ({relatedIps.length})
                </h3>
                {relatedIps.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Core bus specification used across SoC subsystems and protocol bridges inside the IP Universe.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {relatedIps.map((ip) => (
                      <button
                        key={ip.id}
                        type="button"
                        onClick={() => onSelectIp?.(ip.id)}
                        className="w-full text-left p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--sem-control)] flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">{ip.name}</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            {ip.category} · {ip.rtlLanguage}
                          </div>
                        </div>
                        <span className="text-[var(--sem-control)] font-medium shrink-0">Inspect IP →</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* ANCHOR 2: BLOCK DIAGRAM, TRANSACTION FLOW & FSM                  */}
          {/* ================================================================ */}
          <section
            id="sec-block-fsm"
            className={`scroll-mt-[84px] space-y-8 pt-6 border-t border-[var(--border-subtle)] ${sectionEmphasisClass(
              'sec-block-fsm'
            )}`}
          >
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  03. Interconnect Architecture &amp; Block Diagram
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  {protocol.architecture.summary}
                </p>
              </div>

              <BlockDiagramSvg nodes={protocol.architecture.nodes} links={protocol.architecture.links} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1.5">Clock &amp; Reset Domain</div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{protocol.architecture.clockAndReset}</p>
                </div>
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1.5">Data Path Flow</div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{protocol.architecture.dataFlow}</p>
                </div>
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1.5">Control &amp; Handshake</div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{protocol.architecture.controlFlow}</p>
                </div>
              </div>
            </div>

            <PacketLayerInspectorSvg protocol={protocol} />

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transaction Lifecycle &amp; FSM</h2>
                <span className="text-xs text-[var(--text-secondary)]">{SECTION_STUDENT_GUIDES.transactions}</span>
              </div>

              <FsmDiagramSvg states={protocol.rtl.fsmStates} transitions={protocol.rtl.fsmTransitions} />

              <div className="space-y-3 pt-2">
                {protocol.transactionFlow.nominal.map((step) => (
                  <div
                    key={step.step}
                    className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
                  >
                    <div className="font-mono text-xs font-semibold text-[var(--sem-control)] tabular-nums shrink-0 sm:w-32">
                      0{step.step}. {step.phase}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{step.description}</p>
                      <div className="mt-2 text-[11px] font-mono text-[var(--text-secondary)]">
                        Active Signals: {step.activeSignals.join(' · ')}
                      </div>
                      {step.activeSignals[0] && (
                        <div className="mt-1 text-[11px] text-[var(--sem-control)]">
                          Key Signal Intuition ({step.activeSignals[0]}):{' '}
                          {explainSignalLikeStudent(step.activeSignals[0])}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2.5">
                  Ordering, Backpressure &amp; Error Semantics
                </h3>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)] list-disc pl-4">
                  {protocol.transactionFlow.errorAndOrdering.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* ANCHOR 3: SIGNAL REFERENCE TABLE                                 */}
          {/* ================================================================ */}
          <section
            id="sec-signals"
            className={`scroll-mt-[84px] space-y-6 pt-6 border-t border-[var(--border-subtle)] ${sectionEmphasisClass(
              'sec-signals'
            )}`}
          >
            <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-3.5 flex items-start gap-3 text-xs text-[var(--text-secondary)]">
              <GraduationCap className="w-4 h-4 text-[var(--sem-control)] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[var(--text-primary)]">Signal Guide:</strong> {SECTION_STUDENT_GUIDES.signals}{' '}
                Click any signal row below to inspect its dedicated RTL &amp; SVA rule sheet.
              </span>
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    04. Signal Specification Table ({filteredSignals.length})
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
                  <div className="relative min-w-[200px] max-w-xs flex-1">
                    <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={signalQuery}
                      onChange={(e) => setSignalQuery(e.target.value)}
                      placeholder="Filter signals..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--sem-control)]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setChannelFilter('ALL')}
                      className={`px-2.5 py-1 text-xs rounded cursor-pointer transition-colors ${
                        channelFilter === 'ALL'
                          ? 'bg-[var(--sem-control)] text-white font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      All Channels
                    </button>
                    {protocol.channels.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChannelFilter(ch)}
                        className={`px-2.5 py-1 text-xs rounded cursor-pointer whitespace-nowrap transition-colors ${
                          channelFilter === ch
                            ? 'bg-[var(--sem-control)] text-white font-medium'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                      <th className="py-3 px-6 font-semibold">Signal</th>
                      <th className="py-3 px-4 font-semibold">Channel</th>
                      <th className="py-3 px-4 font-semibold text-right">Width</th>
                      <th className="py-3 px-4 font-semibold">Direction</th>
                      <th className="py-3 px-6 font-semibold">Technical &amp; Student Meaning</th>
                      <th className="py-3 px-6 font-semibold text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {filteredSignals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 px-6 text-center text-xs text-[var(--text-secondary)]">
                          No signals match your current search or channel filter.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setSignalQuery('');
                              setChannelFilter('ALL');
                            }}
                            className="text-[var(--sem-control)] font-medium hover:underline cursor-pointer"
                          >
                            Reset signal filter
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredSignals.map((sig) => (
                        <tr
                          key={sig.name}
                          onClick={() => inspectSignal(sig)}
                          className={`hover:bg-[var(--bg-elevated)]/70 cursor-pointer transition-colors ${
                            selectedSignal?.name === sig.name ? 'bg-[var(--bg-elevated)]' : ''
                          }`}
                        >
                          <td className="py-3.5 px-6 font-mono font-semibold text-[var(--sem-control)] whitespace-nowrap align-top">
                            {sig.name}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap align-top">
                            {sig.channel}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-right tabular-nums text-[var(--text-primary)] align-top">
                            {sig.width}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap align-top">
                            {sig.direction}
                          </td>
                          <td className="py-3.5 px-6 text-[var(--text-secondary)] max-w-md space-y-1">
                            <div className="text-[var(--text-primary)]">{sig.summary}</div>
                            <div className="text-[11px] text-[var(--sem-control)]">
                              In Simple Words: {explainSignalLikeStudent(sig.name, sig.direction, `${sig.width}b`, sig.summary)}
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-right font-medium text-[var(--sem-control)] whitespace-nowrap align-top">
                            Details →
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* ANCHOR 4: TIMING SCENARIOS & SVA ASSERTIONS OVERVIEW             */}
          {/* ================================================================ */}
          <section
            id="sec-timing-sva"
            className={`scroll-mt-[84px] space-y-6 pt-6 border-t border-[var(--border-subtle)] ${sectionEmphasisClass(
              'sec-timing-sva'
            )}`}
          >
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    05. Timing Rules &amp; Protocol Assertions (SVA)
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Hardware commits transfers on the rising clock edge (<code className="font-mono">posedge clk</code>).
                    Step cycles or inspect assertions live in the sticky waveform sandbox.
                  </p>
                </div>
                {protocol.waveforms.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {protocol.waveforms.map((wf) => (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() => {
                          setSelectedWaveformId(wf.id);
                          setSandboxTab('waveform');
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                          wf.id === activeWaveform?.id
                            ? 'bg-[var(--sem-control)] border-[var(--sem-control)] text-white'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {wf.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">Active Timing Scenario</div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {activeWaveform ? `${activeWaveform.name} — ${activeWaveform.description}` : 'No scenario defined.'}
                  </p>
                </div>
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">Handshake Assertion Rule</div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {SECTION_STUDENT_GUIDES.verification}
                  </p>
                </div>
              </div>

              {!isDesktopXl && activeWaveform && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    Interactive Waveform Sandbox ({activeWaveform.name})
                  </div>
                  <WaveformViewer scenario={activeWaveform} interactive />
                </div>
              )}

              <CodeBlock
                title={`${protocol.id}_sva_checker.sv`}
                language="SystemVerilog Assertions (SVA)"
                code={protocol.verification.svaSnippet}
              />
            </div>
          </section>

          {/* ================================================================ */}
          {/* ANCHOR 5: RTL DESIGN & UVM VERIFICATION                          */}
          {/* ================================================================ */}
          <section
            id="sec-rtl-verif"
            className={`scroll-mt-[84px] space-y-8 pt-6 border-t border-[var(--border-subtle)] ${sectionEmphasisClass(
              'sec-rtl-verif'
            )}`}
          >
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">06. RTL Implementation Guide</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  {protocol.rtl.architectureNotes}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <span className="font-semibold text-[var(--text-primary)]">Data-Path Design: </span>
                  <span className="text-[var(--text-secondary)] leading-relaxed">{protocol.rtl.datapathNotes}</span>
                </div>
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <span className="font-semibold text-[var(--text-primary)]">Control-Path Design: </span>
                  <span className="text-[var(--text-secondary)] leading-relaxed">{protocol.rtl.controlpathNotes}</span>
                </div>
              </div>

              <CodeBlock
                title={protocol.rtl.codeTitle}
                language={protocol.rtl.codeLanguage}
                code={protocol.rtl.codeSnippet}
              />

              <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <h3 className="text-xs font-semibold text-[var(--sem-data)] mb-2">
                  Common RTL Implementation Mistakes
                </h3>
                <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] list-disc pl-4">
                  {protocol.rtl.commonMistakes.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            <UvmArchitectureFlowSvg
              title={`${protocol.name} UVM Testbench & Scoreboard Flow`}
              driverNote={protocol.verification.driverStrategy}
              monitorNote={protocol.verification.monitorStrategy}
              scoreboardNote={protocol.verification.scoreboardStrategy}
            />

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">UVM Verification Architecture</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  {protocol.verification.uvmArchitecture}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">Driver Strategy</div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">{protocol.verification.driverStrategy}</p>
                </div>
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">Monitor Strategy</div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {protocol.verification.monitorStrategy}
                  </p>
                </div>
                <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">Scoreboard Architecture</div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {protocol.verification.scoreboardStrategy}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2.5">
                    Functional Coverage Closure Points
                  </h4>
                  <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-4">
                    {protocol.verification.coveragePoints.map((cp, i) => (
                      <li key={i}>{cp}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-2.5">High-Value Corner Cases</h4>
                  <ul className="space-y-1.5 text-[var(--text-secondary)] list-disc pl-4">
                    {protocol.verification.cornerCases.map((cc, i) => (
                      <li key={i}>{cc}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <CodeBlock
                title={`${protocol.id}_uvm_component.sv`}
                language="SystemVerilog UVM"
                code={protocol.verification.uvmSnippet}
              />

              {onOpenCurriculum && (
                <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-[var(--text-secondary)]">
                    Master the underlying design &amp; verification constructs used above:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenCurriculum('rtl-design')}
                      className="px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] font-medium cursor-pointer transition-colors"
                    >
                      RTL Design Handbook →
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCurriculum('systemverilog')}
                      className="px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] font-medium cursor-pointer transition-colors"
                    >
                      SystemVerilog (SV) →
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCurriculum('uvm-methodology')}
                      className="px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] font-medium cursor-pointer transition-colors"
                    >
                      UVM Methodology →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ================================================================ */}
          {/* ANCHOR 6: DEBUGGING LAB & INTERVIEW PREP                         */}
          {/* ================================================================ */}
          <section
            id="sec-debug-interview"
            className={`scroll-mt-[84px] space-y-8 pt-6 border-t border-[var(--border-subtle)] ${sectionEmphasisClass(
              'sec-debug-interview'
            )}`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Bug className="w-4 h-4 text-[var(--sem-error)]" />
                  07. Debugging Lab &amp; Failure Case Studies
                </h2>
              </div>

              {protocol.debuggingLab.length === 0 ? (
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-xs text-[var(--text-secondary)]">
                  Interactive failure scenario waveforms are available on the primary reference protocols (AXI4, AXI4-Lite, AXI4-Stream, APB, PCIe Gen5) or inside the standalone Protocol Compliance Checker.
                </div>
              ) : (
                protocol.debuggingLab.map((dbg) => (
                  <div
                    key={dbg.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6"
                  >
                    <div className="border-b border-[var(--border-subtle)] pb-4">
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sem-error)]">
                        <AlertTriangle className="w-4 h-4" />
                        Failure Case Study
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">{dbg.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{dbg.symptom}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                        <div className="font-semibold text-[var(--sem-error)] mb-1">Violated Rule</div>
                        <p className="text-[var(--text-secondary)] leading-relaxed">{dbg.violatedRule}</p>
                      </div>
                      <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                        <div className="font-semibold text-[var(--sem-data)] mb-1">RTL Root Cause</div>
                        <p className="text-[var(--text-secondary)] leading-relaxed">{dbg.rootCause}</p>
                      </div>
                      <div className="p-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                        <div className="font-semibold text-[var(--sem-high)] mb-1">Verified Fix</div>
                        <p className="text-[var(--text-secondary)] leading-relaxed">{dbg.fix}</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sem-high)] mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Expected Compliant Waveform
                        </div>
                        <WaveformViewer scenario={dbg.expectedWaveform} interactive={false} />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--sem-error)] mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          Actual Buggy Waveform
                        </div>
                        <WaveformViewer scenario={dbg.actualWaveform} interactive={false} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  08. {protocol.name} Interview &amp; Design Review Questions
                </h2>
                <div className="flex flex-wrap items-center gap-1">
                  {['ALL', 'Beginner', 'Intermediate', 'Advanced', 'Debugging', 'Verification'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setIqLevelFilter(lvl)}
                      className={`px-2.5 py-1 text-xs rounded cursor-pointer transition-colors ${
                        iqLevelFilter === lvl
                          ? 'bg-[var(--sem-control)] text-white font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredQuestions.map((iq) => {
                  const isOpen = !!openIqIds[iq.id];
                  return (
                    <div
                      key={iq.id}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIqIds((p) => ({ ...p, [iq.id]: !isOpen }))}
                        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[var(--bg-elevated)]/60 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="text-[11px] font-medium font-mono text-[var(--sem-control)]">{iq.level}</div>
                          <div className="text-sm font-medium text-[var(--text-primary)] mt-1">{iq.question}</div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 pt-3 border-t border-[var(--border-subtle)] text-xs space-y-2.5">
                          <p className="text-[var(--text-secondary)] leading-relaxed">{iq.answer}</p>
                          <div className="text-[var(--sem-control)] font-medium">
                            Key Takeaway: {iq.keyTakeaway}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Column 3: Sticky Right Interactive Sandbox (Pinned >= 1280px xl) */}
        {isDesktopXl && (
          <aside className="w-[392px] 2xl:w-[450px] shrink-0 sticky top-[76px] max-h-[calc(100vh-92px)] overflow-y-auto space-y-4">
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
              {/* Sandbox Header Bar */}
              <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[var(--sem-control)]" />
                    <span>Live Protocol Sandbox</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-secondary)] tabular-nums mt-0.5">
                    {protocol.name} · {activeWaveform?.cycles || 0} cycles
                  </div>
                </div>

                <div className="inline-flex items-center p-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                  <button
                    type="button"
                    onClick={() => setSandboxTab('waveform')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                      sandboxTab === 'waveform'
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Waveform
                  </button>
                  <button
                    type="button"
                    onClick={() => setSandboxTab('sva')}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                      sandboxTab === 'sva'
                        ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    SVA Checker
                  </button>
                </div>
              </div>

              {sandboxTab === 'waveform' ? (
                <div className="p-4 space-y-3">
                  {protocol.waveforms.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {protocol.waveforms.map((wf) => (
                        <button
                          key={wf.id}
                          type="button"
                          onClick={() => setSelectedWaveformId(wf.id)}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                            wf.id === activeWaveform?.id
                              ? 'bg-[var(--sem-control)] border-[var(--sem-control)] text-white'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {wf.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeWaveform ? (
                    <WaveformViewer scenario={activeWaveform} interactive />
                  ) : (
                    <div className="p-6 text-xs text-[var(--text-secondary)]">
                      No timing scenario registered for this entry.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Normative SystemVerilog Assertions enforced across clock edges for{' '}
                    <span className="font-mono text-[var(--text-primary)]">{protocol.name}</span>.
                  </div>
                  <CodeBlock
                    title={`${protocol.id}_sva_checker.sv`}
                    language="SystemVerilog SVA"
                    code={protocol.verification.svaSnippet}
                  />
                </div>
              )}
            </div>

            {/* Quick Channel-to-Signal Pinout Map inside Sticky Sandbox */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <FileCode2 className="w-4 h-4 text-[var(--sem-control)]" />
                  Signal Pinout Quick-Inspect
                </span>
                <span className="text-[11px] font-mono tabular-nums text-[var(--text-secondary)]">
                  {protocol.signals.length} signals
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {protocol.signals.map((sig) => {
                  const isSel = selectedSignal?.name === sig.name;
                  return (
                    <button
                      key={sig.name}
                      type="button"
                      onClick={() => inspectSignal(sig)}
                      className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                        isSel
                          ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--sem-control)] font-semibold'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {sig.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
