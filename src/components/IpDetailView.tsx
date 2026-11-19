import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  FolderTree,
  Cpu,
  Cable,
  Sliders,
  ShieldCheck,
  Terminal,
  Layers,
  BookOpen,
  Table2,
  ArrowRight,
  Clock,
  GraduationCap,
} from 'lucide-react';
import { IpArchBlock, IpArchLink, IpEntity, RtlModuleNode } from '../types/ipUniverse';
import { getProjectById } from '../data/ips';
import { ALL_SOCS } from '../data/socs';
import { CodeBlock } from './DiagramViewers';
import { InfiniteMeshViewport } from './InfiniteMeshViewport';
import { RegisterMemoryMapSvg } from './TechnicalVisualizers';
import { StudentExplainerCard } from './StudentExplainerCard';
import { CompletenessTrackerPanel } from './CompletenessTrackerPanel';
import { auditIpCompleteness } from '../utils/completenessTracker';
import {
  explainFsmStateLikeStudent,
  explainSignalLikeStudent,
  getIpStudentExplainer,
  SECTION_STUDENT_GUIDES,
} from '../data/studentExplainers';
import { LayeredExplanationPanel } from './LayeredExplanationPanel';
import { getIpLayeredExplanation } from '../data/conceptDepthEngine';

interface IpDetailViewProps {
  ip: IpEntity;
  onBack: () => void;
  onSelectProtocol: (protocolId: string) => void;
  onCompareIp: (ipId: string) => void;
  onOpenCdc?: (ipId: string) => void;
  onSelectSoc?: () => void;
  onOpenAesDeepDive?: () => void;
  onOpenKnowledgeGraph?: (nodeId: string) => void;
  onOpenExplainer?: (topicId?: string) => void;
}

type ExplorerTab = 'overview' | 'architecture' | 'rtl' | 'registers' | 'parameters' | 'verification' | 'implementation';

const BLOCK_ROLE_STUDENT_HELP: Record<IpArchBlock['role'], string> = {
  fetch: 'Fetches upcoming instructions or packet headers from memory so downstream compute units never run dry.',
  decode: 'Reads opcodes or packet fields and routes control signals to the right arithmetic or bus unit.',
  execute: 'Performs the heavy lifting math, logic, ALU/FPU operations, or pixel/matrix crunching on each cycle.',
  memory: 'Holds fast local data (SRAM, caches, registers, or load-store buffers) and talks to the SoC bus.',
  control: 'Acts as the traffic controller / FSM coordinating stalls, interrupts, CSRs, and safety checks.',
  crypto: 'Executes constant-time encryption, hashing, or entropy mixing isolated from general software.',
  interface: 'Adapts internal signals onto standard SoC bus pins (AXI4, TL-UL, OBI, PCIe) for outside blocks.',
};

export const IpDetailView: React.FC<IpDetailViewProps> = ({
  ip,
  onBack,
  onSelectProtocol,
  onCompareIp,
  onOpenCdc,
  onSelectSoc,
  onOpenAesDeepDive,
  onOpenKnowledgeGraph,
  onOpenExplainer,
}) => {
  const project = getProjectById(ip.projectId);
  const [viewMode, setViewMode] = useState<'ip' | 'protocol'>('ip');
  const [activeTab, setActiveTab] = useState<ExplorerTab>('overview');
  const [depthLevel, setDepthLevel] = useState<'all' | 'l1' | 'l2' | 'l3'>('all');
  const [showLayeredPanel, setShowLayeredPanel] = useState(true);
  const [selectedModule, setSelectedModule] = useState<RtlModuleNode>(ip.modules[0]);
  const [selectedArchBlock, setSelectedArchBlock] = useState<IpArchBlock | null>(ip.architecture.blocks[0] || null);
  const [selectedArchLink, setSelectedArchLink] = useState<IpArchLink | null>(ip.architecture.links[0] || null);
  const [selectedFsmState, setSelectedFsmState] = useState<{ fsmName: string; state: string } | null>(null);
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>(() =>
    Object.fromEntries(ip.parameters.map((p) => [p.name, p.defaultValue]))
  );
  const layeredExplanation = useMemo(() => getIpLayeredExplanation(ip), [ip]);

  const hostingSocs = ALL_SOCS.filter(
    (soc) =>
      soc.blocks.some((b) => b.ipId === ip.id) ||
      soc.connections.some((c) => c.fromIpId === ip.id || c.toIpId === ip.id)
  );

  useEffect(() => {
    setSelectedModule(ip.modules[0]);
    setSelectedArchBlock(ip.architecture.blocks[0] || null);
    setSelectedArchLink(ip.architecture.links[0] || null);
    setSelectedFsmState(null);
    setParamOverrides(Object.fromEntries(ip.parameters.map((p) => [p.name, p.defaultValue])));
  }, [ip]);

  const jumpToModule = (modName?: string) => {
    if (!modName) return;
    const found = ip.modules.find((m) => m.name === modName);
    if (found) {
      setSelectedModule(found);
      setSelectedFsmState(null);
      setViewMode('ip');
      setActiveTab('rtl');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header & Dual-Mode Toggle (IP Explorer vs Protocol Explorer) */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            IP Universe
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{project.name}</span>
              <span aria-hidden="true">·</span>
              <span>{ip.category}</span>
              <span aria-hidden="true">·</span>
              <span>{ip.rtlLanguage}</span>
              <span aria-hidden="true">·</span>
              <span>{ip.license}</span>
              <span aria-hidden="true">·</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-medium">{ip.confidence}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {ip.name}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">{ip.tagline}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('ip')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-colors ${
                viewMode === 'ip'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              1. IP Explorer
            </button>
            <button
              type="button"
              onClick={() => setViewMode('protocol')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer transition-colors ${
                viewMode === 'protocol'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              2. Protocol Explorer
            </button>
          </div>

          {ip.id === 'opentitan-aes' && onOpenAesDeepDive && (
            <button
              type="button"
              onClick={onOpenAesDeepDive}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              7-Chapter AES Deep Dive & Lab
            </button>
          )}

          {onOpenCdc && (
            <button
              type="button"
              onClick={() => onOpenCdc(ip.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              Clock Domains ({ip.architecture.clocks.length})
            </button>
          )}

          {onOpenExplainer && (
            <button
              type="button"
              onClick={() => {
                const mapped =
                  ip.id === 'opentitan-hmac'
                    ? 'opentitan-hmac'
                    : ip.id === 'gemmini'
                    ? 'systolic-gemmini'
                    : ip.id === 'vortex-gpu'
                    ? 'gpu-warp-simt'
                    : ip.id === 'rocket-chip'
                    ? 'riscv-5stage-pipeline'
                    : `ip-${ip.id}`;
                onOpenExplainer(mapped);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5" />
              Interactive Explainer
            </button>
          )}

          {onOpenKnowledgeGraph && (
            <button
              type="button"
              onClick={() => onOpenKnowledgeGraph(`ip:${ip.id}`)}
              className="px-3 py-2 text-xs font-medium rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 cursor-pointer"
            >
              Knowledge Graph
            </button>
          )}

          <button
            type="button"
            onClick={() => onCompareIp(ip.id)}
            className="px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Compare IP
          </button>
        </div>
      </div>

      {/* Progressive 3-Level Understanding Switcher + 16-Checkpoint Completeness Audit */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Understanding Layer:</span>
            <span>Switch complexity without losing your selected IP or module</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-cyan-700 dark:text-cyan-400">
              {ip.confidence === 'Verified from Source/Docs'
                ? '[OBSERVED IN RTL] · [OFFICIAL DOCUMENTATION]'
                : '[DERIVED FROM RTL] · [REQUIRES SOURCE VERIFICATION]'}
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

        <CompletenessTrackerPanel title={ip.name} report={auditIpCompleteness(ip)} />

        {showLayeredPanel && (
          <LayeredExplanationPanel explanation={layeredExplanation} depthLevel={depthLevel} />
        )}
      </div>

      {/* VIEW 2: PROTOCOL EXPLORER MODE */}
      {viewMode === 'protocol' ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Protocol & Bus Connectivity Hub for {ip.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Think of this like all the electrical plugs around the outside of the chip block. Click any bus box below to open its full Protocol Specification in Protocol Atlas.
                </p>
              </div>
              {onOpenCdc && (
                <button
                  type="button"
                  onClick={() => onOpenCdc(ip.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Inspect Clock Crossings
                </button>
              )}
            </div>

            {/* Interactive Infinite-Mesh Protocol Connectivity Schematic */}
            {(() => {
              const ifaceCount = Math.max(1, ip.interfaces.length);
              const dieH = Math.max(190, ifaceCount * 76 - 10);
              const hubBounds = {
                minX: 0,
                minY: 0,
                width: 820,
                height: Math.max(250, dieH + 64),
              };
              const hubMarkerId = `bus-hub-arr-${ip.id.replace(/[^a-zA-Z0-9]/g, '')}`;

              const hubMiniItems = [
                {
                  id: 'dut-core',
                  x: 30,
                  y: 30,
                  width: 233,
                  height: dieH - 12,
                  color: '#06b6d4',
                  active: true,
                },
                ...ip.interfaces.map((iface, idx) => ({
                  id: iface.name,
                  x: 440,
                  y: 32 + idx * 76,
                  width: 346,
                  height: 60,
                  color: iface.role.includes('Initiator')
                    ? '#3b82f6'
                    : iface.role.includes('Target')
                    ? '#10b981'
                    : '#f59e0b',
                })),
              ];
              const hubMiniLinks = ip.interfaces.map((_iface, idx) => ({
                x1: 263,
                y1: 32 + idx * 76 + 30,
                x2: 440,
                y2: 32 + idx * 76 + 30,
              }));

              return (
                <InfiniteMeshViewport
                  bounds={hubBounds}
                  title={`External Pin & Bus Topology (${ip.interfaces.length} Interface Port${ip.interfaces.length === 1 ? '' : 's'})`}
                  subtitle="Click any connected protocol card to open its full protocol specification"
                  minHeightClass="h-[340px] sm:h-[400px]"
                  showMiniMap={true}
                  minimapItems={hubMiniItems}
                  minimapLinks={hubMiniLinks}
                  legend={
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> Initiator Port
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Target Port
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Host / Sub Bidirectional
                      </span>
                    </>
                  }
                  renderDefs={() => (
                    <>
                      <marker id={`${hubMarkerId}-init`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
                      </marker>
                      <marker id={`${hubMarkerId}-tgt`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                      </marker>
                      <marker id={`${hubMarkerId}-bi`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                      </marker>
                    </>
                  )}
                >
                  {/* Central Silicon Die Package */}
                  <rect
                    x={24}
                    y={24}
                    width={245}
                    height={dieH}
                    rx={12}
                    fill="none"
                    stroke="#06b6d4"
                    strokeOpacity={0.35}
                    strokeWidth={1.25}
                    strokeDasharray="5 4"
                  />
                  <rect
                    x={30}
                    y={30}
                    width={233}
                    height={dieH - 12}
                    rx={9}
                    fill="var(--bg-surface)"
                    stroke="#06b6d4"
                    strokeWidth={2}
                  />
                  <path
                    d={`M 39 30 H 254 Q 263 30 263 39 V 54 H 30 V 39 Q 30 30 39 30 Z`}
                    fill="#06b6d4"
                    fillOpacity={0.18}
                  />
                  <line x1={30} y1={54} x2={263} y2={54} stroke="#06b6d4" strokeOpacity={0.4} strokeWidth={1} />
                  <text x={42} y={45.5} className="font-mono text-[9.5px] font-semibold tracking-wider uppercase" fill="#06b6d4">
                    DUT SILICON CORE · {ip.category.toUpperCase()}
                  </text>
                  <polygon
                    points="244,37 253,42 244,47"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth={1.3}
                  />

                  <text x={146} y={dieH / 2 + 10} textAnchor="middle" className="font-display text-[15px] font-bold" fill="var(--text-primary)">
                    {ip.name.length > 24 ? `${ip.name.slice(0, 22)}..` : ip.name}
                  </text>
                  <text x={146} y={dieH / 2 + 29} textAnchor="middle" className="font-mono text-[10px]" fill="var(--text-secondary)">
                    {ip.rtlLanguage} · {ip.modules.length} RTL Modules
                  </text>
                  <text x={146} y={dieH / 2 + 47} textAnchor="middle" className="font-mono text-[9.5px]" fill="var(--sem-control)">
                    Clk: {ip.architecture.clocks[0] || 'clk_i'} · Rst: {ip.architecture.resets[0] || 'rst_ni'}
                  </text>

                  {/* Bottom Die Package I/O Pins */}
                  {[0, 1, 2, 3, 4, 5].map((pinIdx) => (
                    <rect
                      key={pinIdx}
                      x={56 + pinIdx * 34}
                      y={dieH + 18}
                      width={12}
                      height={5}
                      rx={1.5}
                      fill="#06b6d4"
                      fillOpacity={0.6}
                    />
                  ))}

                  {/* Connected External Interface Bus Cards */}
                  {ip.interfaces.map((iface, idx) => {
                    const iy = 32 + idx * 76;
                    const cy = iy + 30;
                    const isInitiator = iface.role.includes('Initiator');
                    const isTarget = iface.role.includes('Target');
                    const stroke = isInitiator ? '#3b82f6' : isTarget ? '#10b981' : '#f59e0b';
                    const marker = isInitiator
                      ? `${hubMarkerId}-init`
                      : isTarget
                      ? `${hubMarkerId}-tgt`
                      : `${hubMarkerId}-bi`;
                    const pathD = isInitiator
                      ? `M 263 ${cy} C 335 ${cy}, 360 ${cy}, 436 ${cy}`
                      : `M 436 ${cy} C 360 ${cy}, 335 ${cy}, 263 ${cy}`;

                    return (
                      <g
                        key={iface.name}
                        onClick={() => onSelectProtocol(iface.protocolId)}
                        className="cursor-pointer svg-glide"
                      >
                        <path
                          d={pathD}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={2.3}
                          markerEnd={`url(#${marker})`}
                        />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#ffffff"
                          strokeOpacity={0.35}
                          strokeWidth={1.2}
                          className="schematic-flow-active"
                        />
                        <circle cx={263} cy={cy} r={3.5} fill={stroke} stroke="var(--bg-canvas)" strokeWidth={1} />
                        <circle cx={438} cy={cy} r={3.5} fill={stroke} stroke="var(--bg-canvas)" strokeWidth={1} />

                        {/* Domain & Signal Tag */}
                        <rect
                          x={306}
                          y={cy - 18}
                          width={94}
                          height={17}
                          rx={4}
                          fill="var(--bg-elevated)"
                          stroke="var(--border-subtle)"
                          strokeWidth={1}
                        />
                        <text x={353} y={cy - 6.5} textAnchor="middle" className="font-mono text-[9px] font-medium" fill="var(--text-secondary)">
                          {iface.clockDomain.split(' ')[0]}
                        </text>

                        {/* External Interface Card */}
                        <rect
                          x={440}
                          y={iy}
                          width={346}
                          height={60}
                          rx={8}
                          fill="var(--bg-surface)"
                          stroke={stroke}
                          strokeWidth={1.6}
                        />
                        <path
                          d={`M 448 ${iy} H 778 Q 786 ${iy} 786 ${iy + 8} V ${iy + 19} H 440 V ${iy + 8} Q 440 ${iy} 448 ${iy} Z`}
                          fill={stroke}
                          fillOpacity={0.16}
                        />
                        <text x={452} y={iy + 13} className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" fill={stroke}>
                          {iface.role} · RST: {iface.resetDomain.split(' ')[0]}
                        </text>
                        <text x={452} y={iy + 36} className="font-mono text-[12px] font-bold" fill="var(--text-primary)">
                          {iface.name} · {iface.protocolLabel}
                        </text>
                        <text x={452} y={iy + 51} className="text-[10px]" fill="var(--text-secondary)">
                          Click card to inspect {iface.protocolId.toUpperCase()} protocol spec →
                        </text>
                      </g>
                    );
                  })}
                </InfiniteMeshViewport>
              );
            })()}
          </div>

          <div className="rounded-md border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
            <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-cyan-800 dark:text-cyan-300">Protocol Explorer Student Guide:</strong> Every external bus below has a named set of copper wires, a clock metronome, and a role. <em>Initiator / Manager</em> starts requests; <em>Target / Subordinate</em> responds to them. Check the "In Simple Words" guide under every signal row!
            </span>
          </div>

          <div className="space-y-4">
            {ip.interfaces.map((iface) => (
              <div
                key={iface.name}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden"
              >
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">
                      {iface.role} · Clock: {iface.clockDomain} · Reset: {iface.resetDomain}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {iface.name} ({iface.protocolLabel})
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {iface.timingDependencies}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectProtocol(iface.protocolId)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer whitespace-nowrap"
                  >
                    Open {iface.protocolLabel} Spec <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400">
                        <th className="py-2.5 px-4 font-semibold">Signal</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Width</th>
                        <th className="py-2.5 px-4 font-semibold">Direction</th>
                        <th className="py-2.5 px-4 font-semibold">Protocol Mapping & Plain-English Student Meaning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {iface.signals.map((s) => (
                        <tr key={s.name}>
                          <td className="py-2.5 px-4 font-mono font-semibold text-cyan-700 dark:text-cyan-400 align-top">{s.name}</td>
                          <td className="py-2.5 px-4 font-mono text-right tabular-nums align-top">{s.width}</td>
                          <td className="py-2.5 px-4 align-top">{s.direction}</td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 space-y-1">
                            <div>{s.notes}</div>
                            <div className="text-[11px] text-cyan-800 dark:text-cyan-300/90">
                              <strong>Simple words:</strong>{' '}
                              {explainSignalLikeStudent(s.name, s.direction, s.width, s.notes)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* VIEW 1: IP EXPLORER MODE */
        <div className="space-y-6">
          {/* Sub-navigation Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 overflow-x-auto">
            {[
              { id: 'overview' as ExplorerTab, label: '01–02. Overview & Function', icon: BookOpen },
              { id: 'architecture' as ExplorerTab, label: '03. Block Architecture', icon: Layers },
              { id: 'rtl' as ExplorerTab, label: '04–05. Internal RTL Explorer', icon: FolderTree },
              { id: 'registers' as ExplorerTab, label: '07. Register Map', icon: Table2 },
              { id: 'parameters' as ExplorerTab, label: '08. Parameters', icon: Sliders },
              { id: 'verification' as ExplorerTab, label: '09–10. Verification & Sim', icon: ShieldCheck },
              { id: 'implementation' as ExplorerTab, label: '11–12. Impl & Attribution', icon: Cpu },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* 01-02: Overview & Functional Description */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <StudentExplainerCard
                data={getIpStudentExplainer(ip)}
                label={`New to ${ip.name}? · Student First-Principles Explainer`}
              />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    01. IP Metadata & Provenance
                  </h2>
                  <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {[
                      ['Project', project.name],
                      ['Maintainer', ip.maintainer],
                      ['License', ip.license],
                      ['Classification', ip.implementationKind],
                      ['RTL / Primary Lang', `${ip.rtlLanguage} / ${ip.primaryLanguage}`],
                      ['Development Status', ip.developmentStatus],
                      ['Latest Reference', ip.latestRef],
                      ['Platforms', ip.supportedPlatforms.join(', ')],
                    ].map(([k, v]) => (
                      <div key={k} className="py-2 flex justify-between gap-4">
                        <dt className="text-slate-500 dark:text-slate-400 shrink-0">{k}</dt>
                        <dd className="text-right font-medium text-slate-900 dark:text-slate-100">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="lg:col-span-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4 text-xs">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">02. Functional Description</h2>
                    <p className="text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{ip.functional.whatItDoes}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Why It Exists</h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{ip.functional.whyItExists}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Role Inside an SoC</h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{ip.functional.socRole}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Key Operations</h3>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                        {ip.functional.keyOperations.map((op, i) => <li key={i}>{op}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Known Limitations</h3>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                        {ip.functional.limitations.map((lim, i) => <li key={i}>{lim}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upstream Links, Protocols & Hosting SoCs */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Connected Bus Protocols ({ip.interfaces.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(ip.interfaces.map((i) => i.protocolId))).map((pid) => (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => onSelectProtocol(pid)}
                        className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-cyan-700 dark:text-cyan-400 font-mono cursor-pointer"
                      >
                        {pid.toUpperCase()} Spec →
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Real SoCs Containing {ip.name} ({hostingSocs.length})
                  </h3>
                  {hostingSocs.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400">
                      {ip.functional.whereUsed.join(', ')}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {hostingSocs.map((soc) => (
                        <button
                          key={soc.id}
                          type="button"
                          onClick={() => onSelectSoc?.()}
                          className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                        >
                          {soc.name} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    Official Upstream Repository & Docs
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    <a
                      href={ip.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 hover:underline truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      GitHub Repository ({project.name})
                    </a>
                    <a
                      href={ip.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 hover:underline truncate"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      Official Technical Documentation
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 03: Clickable Architecture Block Diagram */}
          {activeTab === 'architecture' && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    03. Internal Block Architecture (Click Any Block to Inspect Role & RTL)
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{ip.architecture.summary}</p>
                </div>
                {onOpenCdc && (
                  <button
                    type="button"
                    onClick={() => onOpenCdc(ip.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer shrink-0"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Inspect Clock Domains
                  </button>
                )}
              </div>

              {(() => {
                const blocks = ip.architecture.blocks;
                const minBlockX = blocks.length > 0 ? Math.min(...blocks.map((b) => b.x)) : 0;
                const minBlockY = blocks.length > 0 ? Math.min(...blocks.map((b) => b.y)) : 0;
                const maxX = Math.max(...blocks.map((b) => b.x + b.width), 620);
                const maxY = Math.max(...blocks.map((b) => b.y + b.height), 260);
                const archBounds = {
                  minX: minBlockX - 36,
                  minY: minBlockY - 32,
                  width: maxX - minBlockX + 72,
                  height: maxY - minBlockY + 68,
                };
                const roleStroke: Record<IpArchBlock['role'], string> = {
                  fetch: '#06b6d4',
                  decode: '#3b82f6',
                  execute: '#10b981',
                  memory: '#f59e0b',
                  control: '#8b5cf6',
                  crypto: '#f43f5e',
                  interface: '#64748b',
                };
                const markerId = `ip-arr-${ip.id.replace(/[^a-zA-Z0-9]/g, '')}`;

                const archMiniItems = blocks.map((blk) => ({
                  id: blk.id,
                  x: blk.x,
                  y: blk.y,
                  width: blk.width,
                  height: blk.height,
                  color: roleStroke[blk.role] || '#3b82f6',
                  active: selectedArchBlock?.id === blk.id,
                }));
                const archMiniLinks = ip.architecture.links
                  .map((lk) => {
                    const a = blocks.find((b) => b.id === lk.from);
                    const b = blocks.find((bl) => bl.id === lk.to);
                    if (!a || !b) return null;
                    return {
                      x1: a.x + a.width / 2,
                      y1: a.y + a.height / 2,
                      x2: b.x + b.width / 2,
                      y2: b.y + b.height / 2,
                    };
                  })
                  .filter((x): x is { x1: number; y1: number; x2: number; y2: number } => Boolean(x));

                return (
                  <InfiniteMeshViewport
                    bounds={archBounds}
                    title={`Microarchitecture Schematic (${blocks.length} Functional Units · ${ip.architecture.links.length} Internal Datapaths)`}
                    subtitle={`Clk: ${ip.architecture.clocks.join(', ')} · Click any unit or wire tag to inspect its RTL role`}
                    minHeightClass="h-[430px] sm:h-[490px]"
                    showMiniMap={true}
                    minimapItems={archMiniItems}
                    minimapLinks={archMiniLinks}
                    legend={
                      <>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-violet-500" /> Control / Sync
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" /> Fetch / Interface
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Datapath / Compute
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Memory / FIFO
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Crypto / Security
                        </span>
                      </>
                    }
                    renderDefs={() => (
                      <>
                        <marker id={`${markerId}-act`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
                        </marker>
                        <marker id={`${markerId}-sel`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                        </marker>
                        <marker id={`${markerId}-dim`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                        </marker>
                      </>
                    )}
                    footer={
                      (selectedArchBlock || selectedArchLink) && (
                        <div className="space-y-3">
                          {selectedArchBlock && (
                            <div className="flex flex-wrap items-start justify-between gap-4 text-xs">
                              <div className="space-y-1.5 max-w-3xl">
                                <div className="font-semibold text-[var(--text-primary)]">
                                  Block: {selectedArchBlock.label}{' '}
                                  <span className="font-mono text-[var(--sem-control)] font-normal">
                                    ({selectedArchBlock.role} · {selectedArchBlock.moduleName || 'subsystem'})
                                  </span>
                                </div>
                                <p className="text-[var(--text-secondary)] leading-relaxed">
                                  {selectedArchBlock.description}
                                </p>
                                <p className="text-cyan-800 dark:text-cyan-300 leading-relaxed">
                                  <strong>In Simple Words:</strong> {BLOCK_ROLE_STUDENT_HELP[selectedArchBlock.role]}
                                </p>
                              </div>
                              {selectedArchBlock.moduleName && (
                                <button
                                  type="button"
                                  onClick={() => jumpToModule(selectedArchBlock.moduleName)}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer shrink-0"
                                >
                                  Open {selectedArchBlock.moduleName} RTL →
                                </button>
                              )}
                            </div>
                          )}

                          {selectedArchLink && (
                            <div className="pt-2.5 border-t border-[var(--border-subtle)] text-xs">
                              <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">
                                Wire: {selectedArchLink.label}
                              </span>{' '}
                              <span className="text-[var(--text-secondary)]">
                                ({blocks.find((b) => b.id === selectedArchLink.from)?.label || selectedArchLink.from} →{' '}
                                {blocks.find((b) => b.id === selectedArchLink.to)?.label || selectedArchLink.to})
                              </span>
                              <p className="text-[var(--text-secondary)] mt-0.5">
                                {explainSignalLikeStudent(selectedArchLink.label)}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    }
                  >
                    {/* Routed Internal Signal Buses */}
                    {ip.architecture.links.map((lk, idx) => {
                      const a = blocks.find((b) => b.id === lk.from);
                      const b = blocks.find((bl) => bl.id === lk.to);
                      if (!a || !b) return null;

                      const acx = a.x + a.width / 2;
                      const acy = a.y + a.height / 2;
                      const bcx = b.x + b.width / 2;
                      const bcy = b.y + b.height / 2;
                      const horiz = Math.abs(bcx - acx) >= Math.abs(bcy - acy) * 0.85;
                      const laneOffset = idx % 3 === 0 ? -12 : idx % 3 === 1 ? 0 : 12;

                      let x1: number, y1: number, x2: number, y2: number, cx1: number, cy1: number, cx2: number, cy2: number;
                      if (horiz) {
                        x1 = bcx >= acx ? a.x + a.width : a.x;
                        x2 = bcx >= acx ? b.x : b.x + b.width;
                        y1 = acy + laneOffset;
                        y2 = bcy + laneOffset;
                        cx1 = x1 + (x2 - x1) * 0.48;
                        cy1 = y1;
                        cx2 = x2 - (x2 - x1) * 0.48;
                        cy2 = y2;
                      } else {
                        x1 = acx + laneOffset;
                        x2 = bcx + laneOffset;
                        y1 = bcy >= acy ? a.y + a.height : a.y;
                        y2 = bcy >= acy ? b.y : b.y + b.height;
                        cx1 = x1;
                        cy1 = y1 + (y2 - y1) * 0.48;
                        cx2 = x2;
                        cy2 = y2 - (y2 - y1) * 0.48;
                      }

                      const mx = (x1 + x2) / 2;
                      const my = (y1 + y2) / 2;
                      const active =
                        !selectedArchBlock ||
                        selectedArchBlock.id === lk.from ||
                        selectedArchBlock.id === lk.to;
                      const isLinkSel =
                        selectedArchLink?.from === lk.from &&
                        selectedArchLink?.to === lk.to &&
                        selectedArchLink?.label === lk.label;
                      const stroke = isLinkSel ? '#f59e0b' : active ? '#06b6d4' : '#64748b';
                      const labelText = lk.label.length > 20 ? `${lk.label.slice(0, 18)}..` : lk.label;
                      const tagW = Math.max(76, Math.min(126, labelText.length * 5.8 + 16));

                      return (
                        <g
                          key={idx}
                          opacity={active || isLinkSel ? 1 : 0.35}
                          onClick={() => setSelectedArchLink(lk)}
                          className="cursor-pointer svg-glide"
                        >
                          <path
                            d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={isLinkSel ? 2.6 : active ? 2.1 : 1.3}
                            markerEnd={`url(#${isLinkSel ? `${markerId}-sel` : active ? `${markerId}-act` : `${markerId}-dim`})`}
                          />
                          {(active || isLinkSel) && (
                            <path
                              d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                              fill="none"
                              stroke="#ffffff"
                              strokeOpacity={0.35}
                              strokeWidth={1.2}
                              className="schematic-flow-active"
                            />
                          )}
                          <circle cx={x1} cy={y1} r={3} fill={stroke} stroke="var(--bg-canvas)" strokeWidth={1} />
                          <rect
                            x={mx - tagW / 2}
                            y={my - 9.5}
                            width={tagW}
                            height={18}
                            rx={4}
                            fill="var(--bg-elevated)"
                            stroke={isLinkSel ? '#f59e0b' : active ? '#06b6d4' : 'var(--border-subtle)'}
                            strokeWidth={isLinkSel ? 1.3 : 1}
                          />
                          <text
                            x={mx}
                            y={my + 2.5}
                            textAnchor="middle"
                            className="font-mono text-[9px] font-medium"
                            fill={isLinkSel ? '#f59e0b' : active ? 'var(--sem-control)' : 'var(--text-secondary)'}
                          >
                            {labelText}
                          </text>
                        </g>
                      );
                    })}

                    {/* Silicon Sub-Modules / CAD Hardware Blocks */}
                    {blocks.map((blk) => {
                      const stroke = roleStroke[blk.role] || '#3b82f6';
                      const isSel = selectedArchBlock?.id === blk.id;
                      const hasClockGlyph = blk.role === 'control' || blk.id.includes('clk');

                      return (
                        <g
                          key={blk.id}
                          onClick={() => setSelectedArchBlock(blk)}
                          className="cursor-pointer svg-glide"
                        >
                          {isSel && (
                            <rect
                              x={blk.x - 4}
                              y={blk.y - 4}
                              width={blk.width + 8}
                              height={blk.height + 8}
                              rx={11}
                              fill="none"
                              stroke={stroke}
                              strokeWidth={1.25}
                              strokeDasharray="4 3"
                              opacity={0.78}
                            />
                          )}

                          <rect
                            x={blk.x}
                            y={blk.y}
                            width={blk.width}
                            height={blk.height}
                            rx={8}
                            fill={isSel ? 'var(--bg-elevated)' : 'var(--bg-surface)'}
                            stroke={stroke}
                            strokeWidth={isSel ? 2.2 : 1.5}
                          />

                          {/* Header Band */}
                          <path
                            d={`M ${blk.x + 8} ${blk.y} H ${blk.x + blk.width - 8} Q ${blk.x + blk.width} ${blk.y} ${blk.x + blk.width} ${blk.y + 8} V ${blk.y + 20} H ${blk.x} V ${blk.y + 8} Q ${blk.x} ${blk.y} ${blk.x + 8} ${blk.y} Z`}
                            fill={stroke}
                            fillOpacity={isSel ? 0.24 : 0.14}
                          />
                          <line
                            x1={blk.x}
                            y1={blk.y + 20}
                            x2={blk.x + blk.width}
                            y2={blk.y + 20}
                            stroke={stroke}
                            strokeOpacity={0.4}
                            strokeWidth={1}
                          />
                          <text
                            x={blk.x + 9}
                            y={blk.y + 13}
                            className="font-mono text-[8.5px] font-semibold uppercase tracking-wider"
                            fill={stroke}
                          >
                            {blk.role}
                          </text>

                          {hasClockGlyph && (
                            <polygon
                              points={`${blk.x + blk.width - 17},${blk.y + 6} ${blk.x + blk.width - 9},${blk.y + 10.5} ${blk.x + blk.width - 17},${blk.y + 15}`}
                              fill="none"
                              stroke={stroke}
                              strokeWidth={1.2}
                            />
                          )}

                          <text
                            x={blk.x + blk.width / 2}
                            y={blk.y + 42}
                            textAnchor="middle"
                            className="font-display text-[12px] font-semibold"
                            fill="var(--text-primary)"
                          >
                            {blk.label.length > 24 ? `${blk.label.slice(0, 22)}..` : blk.label}
                          </text>

                          <text
                            x={blk.x + blk.width / 2}
                            y={blk.y + 60}
                            textAnchor="middle"
                            className="font-mono text-[9.5px]"
                            fill="var(--sem-control)"
                          >
                            {blk.moduleName ? `${blk.moduleName}` : `${blk.role.toUpperCase()} UNIT`}
                          </text>

                          {/* Edge Pin Solder Stubs */}
                          {[0.25, 0.5, 0.75].map((ratio, pIdx) => (
                            <rect
                              key={pIdx}
                              x={blk.x + blk.width * ratio - 4}
                              y={blk.y + blk.height - 2.5}
                              width={8}
                              height={4}
                              rx={1}
                              fill={stroke}
                              fillOpacity={0.6}
                            />
                          ))}
                        </g>
                      );
                    })}
                  </InfiniteMeshViewport>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Clocks</div>
                  <div className="font-mono text-cyan-700 dark:text-cyan-400">{ip.architecture.clocks.join(', ')}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Heartbeat ticks driving flip-flops inside this IP.</div>
                </div>
                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Resets</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300">{ip.architecture.resets.join(', ')}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Active-low (`_ni`) or synchronous clear to safe startup values.</div>
                </div>
                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Interrupts / Alerts</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300">{ip.architecture.interrupts.join(', ')}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Urgent status or hardware fault wires routed to CPU/Alert Handler.</div>
                </div>
                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">External Dependencies</div>
                  <div className="text-slate-700 dark:text-slate-300">{ip.architecture.externalDependencies.join(', ')}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Other chips, memories, or packages needed at elaboration time.</div>
                </div>
              </div>
            </div>
          )}

          {/* 04-05: Internal RTL Explorer */}
          {activeTab === 'rtl' && selectedModule && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left File & Module Hierarchy Tree */}
              <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-4">
                <div>
                  <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Module Hierarchy</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select any RTL module to inspect ports, parameters, FSMs, and source reference.
                  </p>
                </div>

                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {ip.modules.map((mod) => {
                    const active = selectedModule.name === mod.name;
                    return (
                      <button
                        key={mod.name}
                        type="button"
                        onClick={() => setSelectedModule(mod)}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                          active
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>{mod.parentModule ? `└─ ${mod.name}` : mod.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{mod.filePath}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">Source File Tree</h3>
                  <ul className="space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 max-h-[200px] overflow-y-auto">
                    {ip.fileTree.map((f) => (
                      <li key={f} className="truncate">{f}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Module Inspector */}
              <div className="lg:col-span-8 space-y-5">
                <div className="rounded-md border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
                  <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-cyan-800 dark:text-cyan-300">RTL Explorer Student Guide:</strong>{' '}
                    {SECTION_STUDENT_GUIDES.rtl}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400">{selectedModule.filePath}</div>
                      <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                        {selectedModule.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{selectedModule.summary}</p>
                    </div>
                    <a
                      href={selectedModule.githubFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500 whitespace-nowrap"
                    >
                      Source on GitHub <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Module Relationships */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400 mb-1">Parent Module</div>
                      {selectedModule.parentModule ? (
                        <button
                          type="button"
                          onClick={() => jumpToModule(selectedModule.parentModule)}
                          className="font-mono font-semibold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                        >
                          {selectedModule.parentModule}
                        </button>
                      ) : (
                        <span className="font-mono text-slate-700 dark:text-slate-300">Top-Level Module</span>
                      )}
                    </div>
                    <div className="p-3 rounded border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400 mb-1">Child Modules ({selectedModule.childModules.length})</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedModule.childModules.length === 0 ? (
                          <span className="text-slate-500">Leaf module</span>
                        ) : (
                          selectedModule.childModules.map((cm) => (
                            <button
                              key={cm}
                              type="button"
                              onClick={() => jumpToModule(cm)}
                              className="font-mono text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              {cm}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400 mb-1">Packages / Interfaces</div>
                      <div className="font-mono text-slate-700 dark:text-slate-300">
                        {[...(selectedModule.packages || []), ...selectedModule.relatedInterfaces].join(', ') || 'Standard'}
                      </div>
                    </div>
                  </div>

                  {/* Interactive FSM States Explorer */}
                  {selectedModule.fsms && selectedModule.fsms.length > 0 && (
                    <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          Interactive Control FSM States (Click any state for plain-English role)
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Steps executed on clock edges
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {selectedModule.fsms.map((fsm) => (
                          <div key={fsm.name} className="space-y-1.5">
                            <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              FSM: <strong className="text-slate-900 dark:text-slate-200">{fsm.name}</strong>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {fsm.states.map((st, idx) => {
                                const isSel =
                                  selectedFsmState?.fsmName === fsm.name && selectedFsmState?.state === st;
                                return (
                                  <React.Fragment key={st}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedFsmState({ fsmName: fsm.name, state: st })}
                                      className={`px-2.5 py-1 rounded font-mono text-[11px] border cursor-pointer transition-colors ${
                                        isSel
                                          ? 'bg-cyan-600 border-cyan-600 text-white'
                                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-cyan-700 dark:text-cyan-300 hover:border-cyan-500'
                                      }`}
                                    >
                                      {st}
                                    </button>
                                    {idx < fsm.states.length - 1 && (
                                      <span className="text-slate-400 font-mono">→</span>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedFsmState ? (
                        <div className="p-3 rounded border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/20 text-slate-700 dark:text-slate-200">
                          <span className="font-mono font-semibold text-cyan-800 dark:text-cyan-300">
                            {selectedFsmState.state}:
                          </span>{' '}
                          {explainFsmStateLikeStudent(selectedFsmState.state)}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tip: Click any state box above (e.g. IDLE, FETCH, WAIT) to see what hardware does inside that step.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ports Table with Student Intuition */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      Module Port Declarations ({selectedModule.ports.length} Signals)
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-md">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400">
                            <th className="py-2 px-3 font-semibold">Port</th>
                            <th className="py-2 px-3 font-semibold">Dir</th>
                            <th className="py-2 px-3 font-semibold text-right">Width</th>
                            <th className="py-2 px-3 font-semibold">Protocol</th>
                            <th className="py-2 px-3 font-semibold">Technical Role & Plain-English Meaning</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {selectedModule.ports.map((pt) => (
                            <tr key={pt.name}>
                              <td className="py-2.5 px-3 font-mono font-semibold text-cyan-700 dark:text-cyan-400 align-top">{pt.name}</td>
                              <td className="py-2.5 px-3 font-mono align-top">{pt.direction}</td>
                              <td className="py-2.5 px-3 font-mono text-right tabular-nums align-top">{pt.width}</td>
                              <td className="py-2.5 px-3 text-blue-700 dark:text-blue-400 align-top">{pt.protocolHint || '-'}</td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 space-y-1">
                                <div>{pt.description}</div>
                                <div className="text-[11px] text-cyan-800 dark:text-cyan-300/90">
                                  <strong>Simple words:</strong>{' '}
                                  {explainSignalLikeStudent(pt.name, pt.direction, pt.width, pt.description)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <CodeBlock
                  title={selectedModule.filePath}
                  language={ip.rtlLanguage}
                  code={selectedModule.sourceExcerpt}
                />
              </div>
            </div>
          )}

          {/* 07: Register Map */}
          {activeTab === 'registers' && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
              <div className="rounded-md border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-cyan-800 dark:text-cyan-300">Register Map Student Guide:</strong>{' '}
                  {SECTION_STUDENT_GUIDES.registers}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  07. Register Map & CSR Definitions
                </h2>
                {ip.registersNote && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{ip.registersNote}</p>
                )}
              </div>

              {ip.registers.length === 0 ? (
                <div className="p-6 rounded border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  Memory-mapped register definitions are not exposed as standalone CSRs for this block (or must be generated from project-specific top configs).
                </div>
              ) : (
                <div className="space-y-4">
                  <RegisterMemoryMapSvg registers={ip.registers} />
                  {ip.registers.map((reg) => (
                    <div key={reg.name} className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400 text-sm">{reg.name}</span>
                          <span className="text-slate-400 mx-2">·</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">Offset {reg.offset}</span>
                          <span className="text-slate-400 mx-2">·</span>
                          <span className="font-mono text-slate-500">Reset {reg.resetValue}</span>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400">{reg.sourceFormat} · {reg.access}</span>
                      </div>
                      <div className="p-4 space-y-3 text-xs">
                        <p className="text-slate-600 dark:text-slate-300">{reg.description}</p>
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                              <th className="py-1.5 pr-3 font-semibold">Bits</th>
                              <th className="py-1.5 pr-3 font-semibold">Field</th>
                              <th className="py-1.5 pr-3 font-semibold">Access</th>
                              <th className="py-1.5 pr-3 font-semibold">Reset</th>
                              <th className="py-1.5 font-semibold">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {reg.fields.map((f) => (
                              <tr key={f.name}>
                                <td className="py-1.5 pr-3 font-mono tabular-nums">[{f.bits}]</td>
                                <td className="py-1.5 pr-3 font-mono font-semibold text-slate-900 dark:text-slate-100">{f.name}</td>
                                <td className="py-1.5 pr-3 font-mono">{f.access}</td>
                                <td className="py-1.5 pr-3 font-mono">{f.reset}</td>
                                <td className="py-1.5 text-slate-600 dark:text-slate-400">{f.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 08: Interactive Parameter Explorer */}
          {activeTab === 'parameters' && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
              <div className="rounded-md border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-cyan-800 dark:text-cyan-300">Parameters Student Guide:</strong>{' '}
                  {SECTION_STUDENT_GUIDES.parameters}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  08. Interactive Compile-Time Parameter Explorer
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Toggle compile-time parameters to preview how elaboration changes pipeline stages, caches, masking, or interconnect sizing.
                </p>
              </div>

              {ip.parameters.length === 0 ? (
                <div className="text-xs text-slate-500">Consult upstream RTL module parameters for configuration options.</div>
              ) : (
                <div className="space-y-3">
                  {ip.parameters.map((p) => (
                    <div key={p.name} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      <div className="space-y-1 max-w-2xl">
                        <div className="font-mono font-bold text-sm text-cyan-700 dark:text-cyan-400">
                          {p.name} <span className="font-normal text-xs text-slate-500">({p.type}, default: {p.defaultValue})</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300">{p.architecturalImpact}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {p.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setParamOverrides((prev) => ({ ...prev, [p.name]: opt }))}
                            className={`px-3 py-1.5 rounded-md font-mono text-xs border cursor-pointer ${
                              paramOverrides[p.name] === opt
                                ? 'bg-cyan-600 border-cyan-600 text-white'
                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="p-4 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs">
                    <div className="text-cyan-400 mb-1">// Active Elaboration Configuration Preview</div>
                    <div>
                      {ip.modules[0]?.name} #({Object.entries(paramOverrides).map(([k, v]) => `.${k}(${v.split(' ')[0]})`).join(', ')}) u_dut (...);
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 09-10: Verification Explorer & Simulation */}
          {activeTab === 'verification' && (
            <div className="space-y-6">
              <div className="rounded-md border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-cyan-800 dark:text-cyan-300">Verification Student Guide:</strong>{' '}
                  {SECTION_STUDENT_GUIDES.verification}
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      09. Verification Infrastructure (Existing vs Recommended)
                    </h2>
                    <div className="text-cyan-700 dark:text-cyan-400 font-medium mt-0.5">
                      Maturity: {ip.verification.maturity} · Framework: {ip.verification.existingInfra.framework}
                    </div>
                  </div>
                  <span className="font-mono text-slate-500">Path: {ip.verification.existingInfra.testbenchPath}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Existing Agents & Models</h3>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                      {ip.verification.existingInfra.agentsAndComponents.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Existing Assertions & Formal</h3>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                      {ip.verification.existingInfra.assertionsAndFormal.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">Recommended Additional DV</h3>
                    <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                      {ip.verification.recommendedStrategy.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4 text-xs">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  10. Test & Simulation Execution
                </h2>
                {ip.verification.simCommands.map((sc, i) => (
                  <div key={i} className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/60 font-semibold text-slate-800 dark:text-slate-200">
                      {sc.tool}
                    </div>
                    <pre className="p-3 bg-slate-950 text-cyan-300 font-mono overflow-x-auto">{sc.command}</pre>
                    <div className="px-4 py-2 text-slate-600 dark:text-slate-400">Expected: {sc.expectedOutput}</div>
                  </div>
                ))}
                <p className="text-slate-500 dark:text-slate-400">
                  <strong>Known Simulation Limitations:</strong> {ip.verification.simLimitations}
                </p>
              </div>
            </div>
          )}

          {/* 11-12: Implementation & References */}
          {activeTab === 'implementation' && (
            <div className="space-y-6 text-xs">
              <div className="rounded-md border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 px-4 py-3 text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-cyan-800 dark:text-cyan-300">Physical Implementation Student Guide:</strong>{' '}
                  {SECTION_STUDENT_GUIDES.implementation}
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  11. Implementation & Physical Design Analysis
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['Synthesizable RTL', ip.implementation.synthesizable ? 'Yes — synthesizable hardware RTL' : 'Simulation / Behavioral'],
                    ['FPGA Support', ip.implementation.fpgaSupport],
                    ['ASIC Considerations', ip.implementation.asicConsiderations],
                    ['Clocking Architecture', ip.implementation.clockingArchitecture],
                    ['Reset Architecture', ip.implementation.resetArchitecture],
                    ['Memory / SRAM Needs', ip.implementation.memoryRequirements],
                    ['Timing & Area Notes', ip.implementation.timingAndAreaNotes],
                  ].map(([k, v]) => (
                    <div key={k} className="p-3.5 rounded border border-slate-200 dark:border-slate-800">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{k}</div>
                      <div className="text-slate-600 dark:text-slate-300 leading-relaxed">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {hostingSocs.length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Open-Source SoC Topologies Integrating {ip.name}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hostingSocs.map((soc) => (
                      <button
                        key={soc.id}
                        type="button"
                        onClick={() => onSelectSoc?.()}
                        className="p-3.5 text-left rounded border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-colors cursor-pointer"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{soc.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{soc.targetUse}</div>
                        <div className="text-[11px] text-cyan-700 dark:text-cyan-400 mt-1">Inspect inside SoC Explorer →</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  12. Attribution, License & Official References
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Copyright: {project.copyright} · License: <strong className="text-slate-900 dark:text-slate-100">{project.license}</strong> · Collected: {project.collectedDate}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <a
                    href={ip.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-colors"
                  >
                    <div>
                      <div className="text-[11px] text-cyan-700 dark:text-cyan-400">Upstream Repository</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{project.name} Source</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                  <a
                    href={ip.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-colors"
                  >
                    <div>
                      <div className="text-[11px] text-cyan-700 dark:text-cyan-400">Official Documentation</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{ip.name} Reference Manual</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                  {ip.references.map((ref) => (
                    <a
                      key={ref.url + ref.label}
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-colors"
                    >
                      <div>
                        <div className="text-[11px] text-cyan-700 dark:text-cyan-400">{ref.kind}</div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{ref.label}</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
