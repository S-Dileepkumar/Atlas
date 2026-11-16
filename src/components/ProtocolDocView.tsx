import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Search,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Cpu,
  ShieldCheck,
  Activity,
  FileCode2,
  Bug,
  HelpCircle,
  GitBranch,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { ProtocolDocument, SignalDefinition } from '../types/protocol';
import { WaveformViewer } from './WaveformViewer';
import { BlockDiagramSvg, CodeBlock, FsmDiagramSvg } from './DiagramViewers';
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

interface ProtocolDocViewProps {
  protocol: ProtocolDocument;
  onBack: () => void;
  onOpenLab: (simId: string) => void;
  onCompare: (protoId: string) => void;
  onSelectIp?: (ipId: string) => void;
  onOpenAesDeepDive?: () => void;
}

type DocSection =
  | 'overview'
  | 'specs'
  | 'signals'
  | 'timing'
  | 'transactions'
  | 'rtl'
  | 'verification'
  | 'debugging'
  | 'interview';

const SECTION_TABS: Array<{ id: DocSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview & Arch', icon: Layers },
  { id: 'specs', label: 'Specifications', icon: Cpu },
  { id: 'signals', label: 'Signals', icon: GitBranch },
  { id: 'timing', label: 'Timing Diagrams', icon: Activity },
  { id: 'transactions', label: 'Transaction Flow', icon: ChevronRight },
  { id: 'rtl', label: 'RTL Design', icon: FileCode2 },
  { id: 'verification', label: 'UVM & SVA', icon: ShieldCheck },
  { id: 'debugging', label: 'Debugging Lab', icon: Bug },
  { id: 'interview', label: 'Interview Prep', icon: HelpCircle },
];

export const ProtocolDocView: React.FC<ProtocolDocViewProps> = ({
  protocol,
  onBack,
  onOpenLab,
  onCompare,
  onSelectIp,
  onOpenAesDeepDive,
}) => {
  const [activeSection, setActiveSection] = useState<DocSection>('overview');
  const [depthLevel, setDepthLevel] = useState<'all' | 'l1' | 'l2' | 'l3'>('all');
  const [showLayeredPanel, setShowLayeredPanel] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<SignalDefinition | null>(null);
  const [signalQuery, setSignalQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [selectedWaveformId, setSelectedWaveformId] = useState<string>(protocol.waveforms[0]?.id || '');
  const [iqLevelFilter, setIqLevelFilter] = useState<string>('ALL');
  const [openIqIds, setOpenIqIds] = useState<Record<string, boolean>>({});
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(protocol.channels.map((ch) => [ch, true]))
  );

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

  // Sync defaults when switching protocols
  React.useEffect(() => {
    setSelectedSignal(null);
    setSignalQuery('');
    setChannelFilter('ALL');
    setSelectedWaveformId(protocol.waveforms[0]?.id || '');
    setIqLevelFilter('ALL');
    setExpandedChannels(Object.fromEntries(protocol.channels.map((ch) => [ch, true])));
  }, [protocol.id, protocol.channels, protocol.waveforms]);

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

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
      {/* Top Breadcrumb & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Protocols
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{protocol.standardBody}</span>
              <span aria-hidden="true">·</span>
              <span>{protocol.specVersion}</span>
              <span aria-hidden="true">·</span>
              <span>{protocol.depth}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
              {protocol.name} <span className="font-normal text-slate-500 dark:text-slate-400 text-lg sm:text-xl">— {protocol.fullName}</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(protocol.id === 'tl-ul' || protocol.id === 'tl-ul-integrity' || protocol.id === 'entropy-if') && onOpenAesDeepDive && (
            <button
              type="button"
              onClick={onOpenAesDeepDive}
              className="px-3 py-2 text-xs font-medium rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              See Used in AES 7-Chapter Deep Dive →
            </button>
          )}
          <button
            type="button"
            onClick={() => onCompare(protocol.id)}
            className="px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Compare Protocol
          </button>
          {simMapping[protocol.id] && (
            <button
              type="button"
              onClick={() => onOpenLab(simMapping[protocol.id])}
              className="px-3.5 py-2 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Launch in Simulator
            </button>
          )}
        </div>
      </div>

      {/* Progressive 3-Level Depth Filter + 16-Checkpoint Completeness Tracker */}
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Understanding Layer:</span>
            <span>Filter depth progression across standard spec, signals, RTL, and verification</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-cyan-700 dark:text-cyan-400">
              [OFFICIAL SPECIFICATION] · [ENGINEERING RECOMMENDATION]
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
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
                  className={`px-2.5 py-1 rounded font-medium whitespace-nowrap cursor-pointer ${
                    depthLevel === lvl.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowLayeredPanel((v) => !v)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
            >
              {showLayeredPanel ? 'Hide Progressive Layers' : 'Show Progressive Layers'}
            </button>
          </div>
        </div>

        <CompletenessTrackerPanel title={protocol.name} report={auditProtocolCompleteness(protocol)} />
      </div>

      {/* Main Split Workspace: Left Protocol-to-RTL Tree + Right Doc Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* Left Sidebar: Protocol-to-RTL Signal Tree */}
        <aside className="lg:col-span-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 lg:sticky lg:top-20">
          <div className="mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Protocol-to-RTL Explorer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click any signal node to inspect timing rules, RTL logic, SVA assertions, and UVM mapping.
            </p>
          </div>

          <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
            <div className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400 px-2 py-1">
              {protocol.name}
            </div>
            {protocol.channels.map((ch) => {
              const chSignals = protocol.signals.filter((s) => s.channel === ch);
              const isOpen = expandedChannels[ch] !== false;
              return (
                <div key={ch} className="pl-2 border-l border-slate-200 dark:border-slate-800 ml-2">
                  <button
                    type="button"
                    onClick={() => setExpandedChannels((p) => ({ ...p, [ch]: !isOpen }))}
                    className="w-full flex items-center justify-between text-left px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 rounded cursor-pointer"
                  >
                    <span className="truncate">{ch}</span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">{chSignals.length}</span>
                  </button>
                  {isOpen && (
                    <div className="pl-3 mt-0.5 space-y-0.5">
                      {chSignals.map((sig) => {
                        const isSelected = selectedSignal?.name === sig.name;
                        return (
                          <button
                            key={sig.name}
                            type="button"
                            onClick={() => setSelectedSignal(sig)}
                            className={`w-full flex items-center justify-between px-2 py-1 text-xs font-mono rounded transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span className="truncate">{sig.name}</span>
                            <span className="text-[10px] text-slate-400 tabular-nums shrink-0 ml-2">{sig.width}b</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Primary Content */}
        <div className="lg:col-span-9 min-w-0 space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 overflow-x-auto">
            {SECTION_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Signal-to-RTL Inspector Drawer (shown whenever a signal is clicked) */}
          {selectedSignal && (
            <div className="rounded-lg border border-cyan-500/40 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">
                    Protocol-to-RTL Signal Inspector · {selectedSignal.channel}
                  </div>
                  <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedSignal.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>Width: <strong className="font-mono text-slate-700 dark:text-slate-200">{selectedSignal.width}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Direction: <strong className="text-slate-700 dark:text-slate-200">{selectedSignal.direction}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Reset: <strong className="font-mono text-slate-700 dark:text-slate-200">{selectedSignal.resetValue}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedSignal.polarity}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSignal(null)}
                  className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  title="Close Signal Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-md border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/20 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-cyan-800 dark:text-cyan-300">In Simple Words (Student Guide): </strong>
                  {explainSignalLikeStudent(
                    selectedSignal.name,
                    selectedSignal.direction,
                    `${selectedSignal.width}b`,
                    selectedSignal.summary
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">Signal Definition & Timing Rules</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{selectedSignal.summary}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-2">{selectedSignal.timingRules}</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Legal Condition: </span>
                    <span className="text-slate-600 dark:text-slate-300">{selectedSignal.legalConditions}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-rose-700 dark:text-rose-400">Illegal Condition: </span>
                    <span className="text-slate-600 dark:text-slate-300">{selectedSignal.illegalConditions}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Dependencies: </span>
                    <span className="font-mono text-cyan-700 dark:text-cyan-400">{selectedSignal.dependencies.join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CodeBlock title={`${selectedSignal.name}_rtl.sv`} language="SystemVerilog RTL" code={selectedSignal.rtlExample} />
                <CodeBlock title={`${selectedSignal.name}_sva.sv`} language="SystemVerilog Assertion" code={selectedSignal.svaAssertion} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">UVM Driver / Verification Note</h4>
                  <p className="text-slate-600 dark:text-slate-300">{selectedSignal.uvmDriverNote}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Common RTL & DV Pitfalls</h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                    {selectedSignal.commonBugs.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Progressive 3-Level Concept Depth Breakdown (updates live with depthLevel) */}
          {showLayeredPanel && (
            <LayeredExplanationPanel explanation={layeredExplanation} depthLevel={depthLevel} />
          )}

          {/* Section 1: Overview & Architecture */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <StudentExplainerCard
                data={getProtocolStudentExplainer(protocol)}
                label={`New to ${protocol.name}? · Student First-Principles Explainer`}
              />

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">01. Protocol Overview</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {protocol.overview.definition}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Why It Was Developed</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {protocol.overview.whyDeveloped}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Core Problem Solved</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                      {protocol.overview.problemSolved}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Primary SoC Applications</h3>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {protocol.overview.usedIn.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Engineering Advantages</h3>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {protocol.overview.advantages.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">Trade-offs & Limitations</h3>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {protocol.overview.limitations.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">02. Interconnect Architecture & Signal Flow</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{protocol.architecture.summary}</p>
                </div>

                <BlockDiagramSvg nodes={protocol.architecture.nodes} links={protocol.architecture.links} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Clock & Reset Domain</div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{protocol.architecture.clockAndReset}</p>
                  </div>
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Data Path Flow</div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{protocol.architecture.dataFlow}</p>
                  </div>
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Control & Handshake</div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{protocol.architecture.controlFlow}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">Role Terminology</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {protocol.overview.terminology.map((t, i) => (
                      <div key={i} className="flex flex-col">
                        <span className="font-semibold text-cyan-700 dark:text-cyan-400">{t.term}</span>
                        <span className="text-slate-600 dark:text-slate-300">{t.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Technical Specifications */}
          {activeSection === 'specs' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-cyan-800 dark:text-cyan-300">Student Guide:</strong> {SECTION_STUDENT_GUIDES.specs}</span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Technical Specifications Matrix</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Normative standard constraints are explicitly separated from configurable and implementation-specific parameters.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400">
                        <th className="py-3 px-4 font-semibold">Parameter</th>
                        <th className="py-3 px-4 font-semibold">Specification</th>
                        <th className="py-3 px-4 font-semibold">Classification</th>
                        <th className="py-3 px-4 font-semibold">Engineering Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {protocol.specifications.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{row.parameter}</td>
                          <td className="py-3 px-4 font-mono text-cyan-700 dark:text-cyan-300 tabular-nums">{row.value}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{row.classification}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {protocol.versionDifferences && protocol.versionDifferences.length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Revision & Version Evolution</h3>
                  <div className="space-y-3">
                    {protocol.versionDifferences.map((v, i) => (
                      <div key={i} className="text-xs border-b border-slate-100 dark:border-slate-800/80 pb-2.5 last:border-0 last:pb-0">
                        <div className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">{v.version}</div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">{v.keyChanges}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Authoritative External Links & Real Open-Source Silicon Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Official Standards & Reference Links
                  </h3>
                  <div className="space-y-2 text-xs">
                    {officialLinks.map((lnk) => (
                      <a
                        key={lnk.url + lnk.label}
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 p-2.5 rounded border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-colors"
                      >
                        <div>
                          <div className="font-medium text-cyan-700 dark:text-cyan-400">{lnk.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{lnk.authority}</div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </a>
                    ))}
                  </div>
                  <ul className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    {protocol.sources.map((src, i) => (
                      <li key={i}>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{src.title}</span> · {src.reference}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    Real Open-Source Silicon Using {protocol.name} ({relatedIps.length})
                  </h3>
                  {relatedIps.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Core bus specification used across SoC subsystems and protocol bridges inside the IP Universe.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {relatedIps.map((ip) => (
                        <button
                          key={ip.id}
                          type="button"
                          onClick={() => onSelectIp?.(ip.id)}
                          className="w-full text-left p-2.5 rounded border border-slate-200 dark:border-slate-800 hover:border-cyan-500 flex items-center justify-between gap-2 text-xs cursor-pointer"
                        >
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{ip.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{ip.category} · {ip.rtlLanguage}</div>
                          </div>
                          <span className="text-cyan-700 dark:text-cyan-400 font-medium shrink-0">Inspect IP →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Signal Reference */}
          {activeSection === 'signals' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-cyan-800 dark:text-cyan-300">Student Guide:</strong> {SECTION_STUDENT_GUIDES.signals}</span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={signalQuery}
                      onChange={(e) => setSignalQuery(e.target.value)}
                      placeholder="Filter signals by name or description..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setChannelFilter('ALL')}
                      className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                        channelFilter === 'ALL'
                          ? 'bg-cyan-600 text-white font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      All Channels
                    </button>
                    {protocol.channels.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setChannelFilter(ch)}
                        className={`px-2.5 py-1 text-xs rounded cursor-pointer whitespace-nowrap ${
                          channelFilter === ch
                            ? 'bg-cyan-600 text-white font-medium'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400">
                        <th className="py-2.5 px-4 font-semibold">Signal</th>
                        <th className="py-2.5 px-4 font-semibold">Channel</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Width</th>
                        <th className="py-2.5 px-4 font-semibold">Direction</th>
                        <th className="py-2.5 px-4 font-semibold">Technical & Student Meaning</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredSignals.map((sig) => (
                        <tr
                          key={sig.name}
                          onClick={() => setSelectedSignal(sig)}
                          className="hover:bg-cyan-500/5 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 font-mono font-semibold text-cyan-700 dark:text-cyan-400 whitespace-nowrap align-top">{sig.name}</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap align-top">{sig.channel}</td>
                          <td className="py-2.5 px-4 font-mono text-right tabular-nums text-slate-700 dark:text-slate-300 align-top">{sig.width}</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">{sig.direction}</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 max-w-md space-y-1">
                            <div>{sig.summary}</div>
                            <div className="text-[11px] text-cyan-700 dark:text-cyan-400">
                              In Simple Words: {explainSignalLikeStudent(sig.name, sig.direction, `${sig.width}b`, sig.summary)}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-medium text-cyan-700 dark:text-cyan-400 whitespace-nowrap align-top">
                            Details →
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Interactive Timing Diagrams */}
          {activeSection === 'timing' && activeWaveform && (
            <div className="space-y-4">
              {protocol.waveforms.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  {protocol.waveforms.map((wf) => (
                    <button
                      key={wf.id}
                      type="button"
                      onClick={() => setSelectedWaveformId(wf.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                        wf.id === activeWaveform.id
                          ? 'bg-cyan-600 border-cyan-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {wf.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                <strong className="text-cyan-800 dark:text-cyan-300">How to Read Timing Waveforms (Student Tip):</strong>{' '}
                Hardware only commits data on the rising clock tick (<code className="font-mono">posedge clk</code>). Step cycle-by-cycle below, watch green vertical bars where <code className="font-mono">VALID && READY</code> overlap, or switch on <strong>Edit Mode</strong> to intentionally break signals and see why the rule checker complains!
              </div>
              <WaveformViewer scenario={activeWaveform} interactive />
            </div>
          )}

          {/* Section 5: Transaction Flow */}
          {activeSection === 'transactions' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-cyan-800 dark:text-cyan-300">Student Guide:</strong> {SECTION_STUDENT_GUIDES.transactions}</span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Transaction Lifecycle</h2>
                <div className="space-y-3">
                  {protocol.transactionFlow.nominal.map((step) => (
                    <div
                      key={step.step}
                      className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      <div className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400 tabular-nums shrink-0 sm:w-28">
                        0{step.step}. {step.phase}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{step.description}</p>
                        <div className="mt-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          Active Signals: {step.activeSignals.join(' · ')}
                        </div>
                        {step.activeSignals[0] && (
                          <div className="mt-1 text-[11px] text-cyan-700 dark:text-cyan-400">
                            Key Signal Intuition ({step.activeSignals[0]}): {explainSignalLikeStudent(step.activeSignals[0])}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Ordering, Backpressure & Error Semantics</h3>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                  {protocol.transactionFlow.errorAndOrdering.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 6: RTL Implementation */}
          {activeSection === 'rtl' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-cyan-800 dark:text-cyan-300">Student Guide:</strong> {SECTION_STUDENT_GUIDES.rtl}</span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">RTL Architecture & State Machine</h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{protocol.rtl.architectureNotes}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Data-Path Design: </span>
                    <span className="text-slate-600 dark:text-slate-400">{protocol.rtl.datapathNotes}</span>
                  </div>
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Control-Path Design: </span>
                    <span className="text-slate-600 dark:text-slate-400">{protocol.rtl.controlpathNotes}</span>
                  </div>
                </div>

                <FsmDiagramSvg states={protocol.rtl.fsmStates} transitions={protocol.rtl.fsmTransitions} />
              </div>

              <CodeBlock
                title={protocol.rtl.codeTitle}
                language={protocol.rtl.codeLanguage}
                code={protocol.rtl.codeSnippet}
              />

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">Common RTL Implementation Mistakes</h3>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                  {protocol.rtl.commonMistakes.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 7: Design Verification (UVM & SVA) */}
          {activeSection === 'verification' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-cyan-800 dark:text-cyan-300">Student Guide:</strong> {SECTION_STUDENT_GUIDES.verification}</span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">UVM Verification Architecture</h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{protocol.verification.uvmArchitecture}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Driver Strategy</div>
                    <p className="text-slate-600 dark:text-slate-400">{protocol.verification.driverStrategy}</p>
                  </div>
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Monitor Strategy</div>
                    <p className="text-slate-600 dark:text-slate-400">{protocol.verification.monitorStrategy}</p>
                  </div>
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Scoreboard Architecture</div>
                    <p className="text-slate-600 dark:text-slate-400">{protocol.verification.scoreboardStrategy}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-xs">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Functional Coverage Closure Points</h3>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {protocol.verification.coveragePoints.map((cp, i) => <li key={i}>{cp}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">High-Value Corner Cases</h3>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 list-disc pl-4">
                      {protocol.verification.cornerCases.map((cc, i) => <li key={i}>{cc}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <CodeBlock title={`${protocol.id}_sva_checker.sv`} language="SystemVerilog Assertions (SVA)" code={protocol.verification.svaSnippet} />
              <CodeBlock title={`${protocol.id}_uvm_component.sv`} language="SystemVerilog UVM" code={protocol.verification.uvmSnippet} />
            </div>
          )}

          {/* Section 8: Debugging Lab */}
          {activeSection === 'debugging' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-cyan-500/25 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span><strong className="text-cyan-800 dark:text-cyan-300">Student Guide:</strong> {SECTION_STUDENT_GUIDES.debugging}</span>
              </div>
              {protocol.debuggingLab.length === 0 ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 text-xs text-slate-600 dark:text-slate-400">
                  Interactive failure scenario waveforms are available on the primary reference protocols (AXI4, AXI4-Lite, AXI4-Stream, APB, PCIe Gen5) or inside the standalone Protocol Compliance Checker.
                </div>
              ) : (
                protocol.debuggingLab.map((dbg) => (
                  <div
                    key={dbg.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-5"
                  >
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Failure Case Study
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{dbg.title}</h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{dbg.symptom}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-rose-700 dark:text-rose-400 mb-1">Violated Rule</div>
                        <p className="text-slate-600 dark:text-slate-300">{dbg.violatedRule}</p>
                      </div>
                      <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">RTL Root Cause</div>
                        <p className="text-slate-600 dark:text-slate-300">{dbg.rootCause}</p>
                      </div>
                      <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Verified Fix</div>
                        <p className="text-slate-600 dark:text-slate-300">{dbg.fix}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Expected Compliant Waveform
                        </div>
                        <WaveformViewer scenario={dbg.expectedWaveform} interactive={false} />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 mb-2">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Actual Buggy Waveform
                        </div>
                        <WaveformViewer scenario={dbg.actualWaveform} interactive={false} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Section 9: Interview Preparation */}
          {activeSection === 'interview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {protocol.name} Interview & Design Review Questions
                </h2>
                <div className="flex flex-wrap items-center gap-1">
                  {['ALL', 'Beginner', 'Intermediate', 'Advanced', 'Debugging', 'Verification'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setIqLevelFilter(lvl)}
                      className={`px-2.5 py-1 text-xs rounded cursor-pointer ${
                        iqLevelFilter === lvl
                          ? 'bg-cyan-600 text-white font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIqIds((p) => ({ ...p, [iq.id]: !isOpen }))}
                        className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                            {iq.level}
                          </div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                            {iq.question}
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{iq.answer}</p>
                          <div className="text-cyan-700 dark:text-cyan-400 font-medium">
                            Key Takeaway: {iq.keyTakeaway}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
