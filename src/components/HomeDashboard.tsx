import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  Activity,
  CheckSquare,
  GitCompare,
  Network,
  Code2,
  Search,
  ArrowRight,
  BookOpen,
  Cpu,
  FolderTree,
  ShieldCheck,
  Layers,
  Clock,
  GraduationCap,
  ExternalLink,
  AlertCircle,
  Dices,
  BarChart3,
} from 'lucide-react';
import { CategoryId, EntityClassification, LifecycleStatus } from '../types/protocol';
import { LEARNING_PATHS, PROTOCOL_CATEGORIES } from '../data/categories';
import { ALL_PROTOCOLS, getProtocolById } from '../data/protocols';
import { ALL_IPS, PROJECTS, getIpById, getProjectById } from '../data/ips';
import { ALL_SOCS } from '../data/socs';
import { GLOSSARY_TERMS } from '../data/glossary';
import {
  ENTITY_CLASSIFICATIONS,
  LIFECYCLE_STATUSES,
  getEntityClassification,
  getLifecycleStatus,
} from '../utils/entityTaxonomy';

export type AppView =
  | 'home'
  | 'master-architecture'
  | 'protocol-atlas'
  | 'protocol'
  | 'ip-universe'
  | 'processors'
  | 'gpus'
  | 'ai-accelerators'
  | 'ip-detail'
  | 'soc-explorer'
  | 'rtl-explorer'
  | 'verification-hub'
  | 'ip-compare'
  | 'cdc-analyzer'
  | 'knowledge-graph'
  | 'repo-ingestion'
  | 'aes-deep-dive'
  | 'glossary'
  | 'simulator'
  | 'checker'
  | 'compare'
  | 'soc-map'
  | 'uvm'
  | 'completeness-dashboard'
  | 'explainer';

interface HomeDashboardProps {
  recentIds: string[];
  onSelectProtocol: (id: string) => void;
  onSelectIp: (id: string) => void;
  onNavigate: (view: AppView) => void;
  onOpenSearch: () => void;
  onFeelingLucky?: (scope?: 'any' | 'protocol' | 'ip') => void;
  onOpenExplainer?: (topicId?: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  recentIds,
  onSelectProtocol,
  onSelectIp,
  onNavigate,
  onOpenSearch,
  onFeelingLucky,
  onOpenExplainer,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all');
  const [entityFilter, setEntityFilter] = useState<EntityClassification | 'ALL'>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleStatus | 'ALL'>('ALL');
  const [inlineFilter, setInlineFilter] = useState('');
  const deferredInlineFilter = useDeferredValue(inlineFilter);
  const [dirPage, setDirPage] = useState(0);
  const dirPageSize = 24;

  const activeCategoryObj = useMemo(
    () => PROTOCOL_CATEGORIES.find((c) => c.id === activeCategory),
    [activeCategory]
  );

  const filteredProtocols = useMemo(() => {
    const q = deferredInlineFilter.trim().toLowerCase();
    return ALL_PROTOCOLS.filter((p) => {
      const catMatch =
        activeCategory === 'all' ||
        p.categoryId === activeCategory ||
        Boolean(activeCategoryObj?.protocolIds.includes(p.id));
      const entMatch = entityFilter === 'ALL' || getEntityClassification(p) === entityFilter;
      const lcMatch = lifecycleFilter === 'ALL' || getLifecycleStatus(p) === lifecycleFilter;
      const qMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.standardBody.toLowerCase().includes(q);
      return catMatch && entMatch && lcMatch && qMatch;
    });
  }, [activeCategory, activeCategoryObj, entityFilter, lifecycleFilter, deferredInlineFilter]);

  const totalDirPages = Math.max(1, Math.ceil(filteredProtocols.length / dirPageSize));
  const clampedDirPage = Math.min(dirPage, totalDirPages - 1);
  const visibleDirectoryProtocols = useMemo(
    () =>
      filteredProtocols.slice(
        clampedDirPage * dirPageSize,
        (clampedDirPage + 1) * dirPageSize
      ),
    [filteredProtocols, clampedDirPage, dirPageSize]
  );

  const primaryFiveIds = ['axi4', 'axi4-lite', 'axi4-stream', 'apb', 'pcie-gen5'];
  const spotlightIpIds = ['ibex', 'opentitan-aes', 'cva6', 'vortex-gpu', 'gemmini'];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-10 space-y-14">
      {/* Workspace Utility Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            VLSI Protocol Atlas & Open-Source IP Universe
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{ALL_PROTOCOLS.length} Protocols</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{ALL_IPS.length} Real Open-Source IPs</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{ALL_SOCS.length} SoC Topologies</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">100% Checkpoint Audited</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('explainer')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer whitespace-nowrap font-medium"
          >
            <Activity className="w-3.5 h-3.5" />
            Interactive Explainer Studio ({ALL_PROTOCOLS.length + ALL_IPS.length + 9})
          </button>
          <button
            type="button"
            onClick={() => onNavigate('knowledge-graph')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-cyan-500 transition-colors cursor-pointer whitespace-nowrap font-medium"
          >
            <Network className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Knowledge Graph
          </button>
          <button
            type="button"
            onClick={() => onNavigate('master-architecture')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-cyan-500 transition-colors cursor-pointer whitespace-nowrap font-medium"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            16-Domain Knowledge Architecture
          </button>
          <button
            type="button"
            onClick={() => onNavigate('completeness-dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-cyan-500 transition-colors cursor-pointer whitespace-nowrap font-medium"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Completeness Dashboard (100%)
          </button>
        </div>
      </div>

      {/* Hero Split — Blueprint Engineering Showcase */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/55 bg-engineering-grid p-6 sm:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
              <span>Understand. Visualize. Verify.</span>
              <span aria-hidden="true">·</span>
              <span>Explore Silicon. Reverse Engineer IP.</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.1] [text-wrap:balance]">
              Open-Source Semiconductor IP &amp; Protocol Intelligence Hub
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Examine complete SoC protocols alongside real reverse-engineered open-source silicon from OpenTitan, Ibex, CVA6, Rocket Chip, Vortex GPGPU, Gemmini, and PULP—with dual IP/Protocol Explorers, RTL module trees, HJSON CSR maps, and upstream UVM verification frameworks.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex-1 min-w-[240px] max-w-md flex items-center justify-between px-4 py-2.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-cyan-500 transition-colors cursor-pointer shadow-2xs"
              >
                <span className="inline-flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Search IPs (Ibex, Vortex), RTL modules, protocols, or glossary...
                </span>
                <span className="font-mono text-[11px] text-slate-400">Ctrl K</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('explainer')}
                className="px-4 py-2.5 text-xs font-semibold rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
              >
                Launch Explainer Studio
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ip-universe')}
                className="px-4 py-2.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                Explore IP Universe
              </button>
              <button
                type="button"
                onClick={() => onNavigate('simulator')}
                className="px-4 py-2.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors cursor-pointer whitespace-nowrap"
              >
                Waveform Lab
              </button>
              {onFeelingLucky && (
                <button
                  type="button"
                  onClick={() => onFeelingLucky('any')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Dices className="w-3.5 h-3.5" />
                  I&apos;m Feeling Lucky
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
              <div>
                <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {ALL_PROTOCOLS.length}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Protocols &amp; Standards</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-cyan-700 dark:text-cyan-400 tabular-nums">
                  {ALL_IPS.length}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Open-Source Silicon IPs</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {ALL_PROTOCOLS.length + ALL_IPS.length + 9}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Interactive Explainers</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  100%
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">16-Checkpoint Audit</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero Anchor: Dual Spotlights (Core Protocols & Deep IPs) */}
        <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/85 p-5 flex flex-col justify-between space-y-4 shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Deep-Dive Silicon IP Spotlights
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('ip-universe')}
                className="text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                View All {ALL_IPS.length} →
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
              {spotlightIpIds.map((id) => {
                const ip = getIpById(id);
                const proj = getProjectById(ip.projectId);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectIp(id)}
                    className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 px-2.5 -mx-2.5 rounded-md transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {ip.name}{' '}
                        <span className="font-normal text-xs text-slate-500 dark:text-slate-400">
                          · {proj.name} · {ip.rtlLanguage}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {ip.tagline}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Start Here: Guided Entry Points for Students & Engineers */}
      <section className="rounded-lg border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <GraduationCap className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
            New to Chip Design? Start With These 4 Interactive Walkthroughs
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Every wire, block diagram, and FSM state includes plain-English student analogies
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <button
            type="button"
            onClick={() => onSelectProtocol('axi4')}
            className="p-3.5 text-left rounded-md border border-cyan-500/30 bg-white/90 dark:bg-slate-900/80 hover:border-cyan-500 transition-colors cursor-pointer"
          >
            <div className="font-semibold text-cyan-800 dark:text-cyan-300">1. How AXI4 Highway Works →</div>
            <div className="text-slate-600 dark:text-slate-400 mt-1">Learn VALID/READY handshakes, 5 channels, signals & waveforms</div>
          </button>
          <button
            type="button"
            onClick={() => onSelectIp('ibex')}
            className="p-3.5 text-left rounded-md border border-cyan-500/30 bg-white/90 dark:bg-slate-900/80 hover:border-cyan-500 transition-colors cursor-pointer"
          >
            <div className="font-semibold text-cyan-800 dark:text-cyan-300">2. Inside Ibex RISC-V CPU →</div>
            <div className="text-slate-600 dark:text-slate-400 mt-1">Click pipeline blocks, RTL ports, CSR registers & FSM states</div>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('cdc-analyzer')}
            className="p-3.5 text-left rounded-md border border-cyan-500/30 bg-white/90 dark:bg-slate-900/80 hover:border-cyan-500 transition-colors cursor-pointer"
          >
            <div className="font-semibold text-cyan-800 dark:text-cyan-300">3. Clock Domain Crossing Lab →</div>
            <div className="text-slate-600 dark:text-slate-400 mt-1">See why multi-clock chips need async FIFOs & synchronizers</div>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('aes-deep-dive')}
            className="p-3.5 text-left rounded-md border border-cyan-500/30 bg-white/90 dark:bg-slate-900/80 hover:border-cyan-500 transition-colors cursor-pointer"
          >
            <div className="font-semibold text-cyan-800 dark:text-cyan-300">4. AES 7-Chapter Deep Dive →</div>
            <div className="text-slate-600 dark:text-slate-400 mt-1">GF(2^8) math, S-Box, DOM masking, UVM & interactive FIPS-197 rounds</div>
          </button>
        </div>
      </section>

      {/* Open-Source IP Universe Workbench */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Open-Source IP Universe Modules
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            3 Interconnected Databases: Protocols · Hardware IPs · SoC Topologies
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { view: 'ip-universe' as AppView, title: 'IP Universe', desc: 'Filter all CPUs, GPUs, AI, crypto & interconnects', icon: Cpu },
            { view: 'soc-explorer' as AppView, title: 'SoC Explorer', desc: 'EarlGrey, Chipyard, PULP, CVA6, LiteX & OpenPiton', icon: Layers },
            { view: 'rtl-explorer' as AppView, title: 'RTL Explorer', desc: 'Module hierarchies, ports, FSMs & source code', icon: FolderTree },
            { view: 'cdc-analyzer' as AppView, title: 'Clock Domains', desc: 'Map clock islands, async FIFOs & CDC crossings', icon: Clock },
            { view: 'aes-deep-dive' as AppView, title: 'AES Crypto & RTL Lab', desc: '7 chapters (26 topics): GF(2^8), DOM S-Box, TL-UL, TVLA & live stepper', icon: ShieldCheck },
            { view: 'verification-hub' as AppView, title: 'Verification Hub', desc: 'UVM core_ibex, dvsim, rtlsim & cocotb benches', icon: ShieldCheck },
            { view: 'ip-compare' as AppView, title: 'IP Comparison', desc: 'Ibex vs CVA6, Vortex vs MIAOW, Gemmini vs NVDLA', icon: GitCompare },
            { view: 'knowledge-graph' as AppView, title: 'Knowledge Graph', desc: 'Trace Protocol ↔ IP ↔ SoC silicon dependency links', icon: Network },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.view}
                type="button"
                onClick={() => onNavigate(tool.view)}
                className="p-4 text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-cyan-500/60 transition-colors cursor-pointer flex flex-col justify-between gap-2"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>{tool.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{tool.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Protocol Atlas Interactive Workbench */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Protocol Atlas Interactive Workbench
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { view: 'master-architecture' as AppView, title: '16-Domain Architecture', desc: 'Explore CPU ISA, Packaging, Physical Design, FuSa, DFT & Taxonomy', icon: Layers },
            { view: 'completeness-dashboard' as AppView, title: 'Completeness Dashboard', desc: '16-topic MASTER INSTRUCTION checklist & coverage gaps', icon: BarChart3 },
            { view: 'simulator' as AppView, title: 'Waveform Studio', desc: 'Simulate AXI4, Lite, Stream, APB, SPI, I2C & UART', icon: Activity },
            { view: 'checker' as AppView, title: 'Compliance Checker', desc: 'Validate traces against AMBA & TL-UL rules', icon: CheckSquare },
            { view: 'compare' as AppView, title: 'Protocol Compare', desc: 'Compare AXI4, AHB, TileLink, PCIe Gen5/6 & DDR', icon: GitCompare },
            { view: 'soc-map' as AppView, title: 'Bus Fabric Map', desc: 'Trace CPU, DMA, NoC, DDR5, PCIe & RoT links', icon: Network },
            { view: 'uvm' as AppView, title: 'UVM & SVA Gen', desc: 'Generate parameterized SV interfaces & agents', icon: Code2 },
            { view: 'glossary' as AppView, title: 'Silicon Glossary', desc: `${GLOSSARY_TERMS.length} linked protocol, RTL & DV terms`, icon: BookOpen },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.view}
                type="button"
                onClick={() => onNavigate(tool.view)}
                className="p-4 text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-cyan-500/60 transition-colors cursor-pointer flex flex-col justify-between gap-2"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>{tool.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{tool.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Core Full-Reference Protocols + Learning Paths + Recently Explored */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Structured Learning Paths
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LEARNING_PATHS.map((path) => (
              <div
                key={path.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3"
              >
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {path.audience} · {path.duration}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {path.title}
                  </h3>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {path.steps.map((st, idx) => (
                    <button
                      key={st.protocolId}
                      type="button"
                      onClick={() => onSelectProtocol(st.protocolId)}
                      className="w-full text-left text-xs text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 py-0.5 flex items-start gap-2 cursor-pointer"
                    >
                      <span className="font-mono text-slate-400 tabular-nums">0{idx + 1}.</span>
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Core Specs & Recent
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('knowledge-graph')}
              className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Knowledge Graph →
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from(new Set([...recentIds, ...primaryFiveIds]))
              .slice(0, 5)
              .map((rid) => {
                const p = getProtocolById(rid);
                return (
                  <button
                    key={rid}
                    type="button"
                    onClick={() => onSelectProtocol(rid)}
                    className="w-full py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-left hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.standardBody} · {p.depth}</div>
                    </div>
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                );
              })}
          </div>
        </div>
      </section>

      {/* Complete 30-Domain Semiconductor Ecosystem Directory */}
      <section className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Complete {PROTOCOL_CATEGORIES.length}-Domain Semiconductor Protocol, Architecture &amp; Standards Directory
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Browse all {PROTOCOL_CATEGORIES.length} specialized domains covering {ALL_PROTOCOLS.length} protocols, PHYs, ISA architectures, CDC/reset mechanisms, DFT, verification standards, and packaging flows — each with both full engineering documentation and an interactive explainer.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value as EntityClassification | 'ALL');
                setDirPage(0);
              }}
              className="px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Entity Types</option>
              {ENTITY_CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
            <select
              value={lifecycleFilter}
              onChange={(e) => {
                setLifecycleFilter(e.target.value as LifecycleStatus | 'ALL');
                setDirPage(0);
              }}
              className="px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Lifecycles</option>
              {LIFECYCLE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={inlineFilter}
              onChange={(e) => {
                setInlineFilter(e.target.value);
                setDirPage(0);
              }}
              placeholder="Filter protocols, standards, or buses..."
              className="px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-60 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setDirPage(0);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-cyan-600 text-white'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All Domains ({ALL_PROTOCOLS.length})
          </button>
          {PROTOCOL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setDirPage(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-cyan-600 text-white'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat.shortName} ({cat.protocolIds.length})
            </button>
          ))}
        </div>

        {activeCategoryObj && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-2 text-xs">
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {activeCategoryObj.name} · {filteredProtocols.length} entries
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{activeCategoryObj.description}</p>
            {activeCategoryObj.caveatNote && (
              <div className="flex items-start gap-2 pt-1.5 text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{activeCategoryObj.caveatNote}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="tabular-nums">
            Showing <strong className="text-slate-900 dark:text-slate-100">{visibleDirectoryProtocols.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-slate-100">{filteredProtocols.length}</strong> entries
          </span>
          {totalDirPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={clampedDirPage === 0}
                onClick={() => setDirPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer hover:border-cyan-500"
              >
                Prev
              </button>
              <span className="font-mono tabular-nums px-2">
                Page {clampedDirPage + 1} / {totalDirPages}
              </span>
              <button
                type="button"
                disabled={clampedDirPage >= totalDirPages - 1}
                onClick={() => setDirPage((p) => Math.min(totalDirPages - 1, p + 1))}
                className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer hover:border-cyan-500"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleDirectoryProtocols.map((p) => {
            const entityCls = getEntityClassification(p);
            const lifecycle = getLifecycleStatus(p);
            return (
              <div
                key={p.id}
                className="p-5 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-cyan-500/60 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-cyan-700 dark:text-cyan-400">{entityCls}</span>
                    <span aria-hidden="true"> · </span>
                    <span
                      className={
                        lifecycle === 'Superseded / Merged'
                          ? 'text-amber-700 dark:text-amber-400 font-medium'
                          : lifecycle === 'Deprecated / Historical'
                          ? 'text-rose-700 dark:text-rose-400 font-medium'
                          : ''
                      }
                    >
                      {lifecycle}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                    {p.name}
                    <span className="font-normal text-xs text-slate-500 dark:text-slate-400 ml-2">
                      {p.fullName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {p.tagline}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    {p.standardBody} · {p.signals.length} signals
                  </span>
                  <div className="flex items-center gap-3">
                    {onOpenExplainer && (
                      <button
                        type="button"
                        onClick={() => onOpenExplainer(`proto-${p.id}`)}
                        className="font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer"
                      >
                        Explainer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectProtocol(p.id)}
                      className="font-semibold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Explore Spec →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalDirPages > 1 && (
          <div className="flex justify-center pt-2">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={clampedDirPage === 0}
                onClick={() => setDirPage((p) => Math.max(0, p - 1))}
                className="px-3.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer hover:border-cyan-500"
              >
                ← Previous Page
              </button>
              <span className="font-mono tabular-nums px-3 text-slate-600 dark:text-slate-300">
                Page {clampedDirPage + 1} of {totalDirPages}
              </span>
              <button
                type="button"
                disabled={clampedDirPage >= totalDirPages - 1}
                onClick={() => setDirPage((p) => Math.min(totalDirPages - 1, p + 1))}
                className="px-3.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 cursor-pointer hover:border-cyan-500"
              >
                Next Page →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Authoritative Specification Sources & Open-Source Silicon Repositories */}
      <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Authoritative Specification Sources & Open-Source RTL Repositories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Direct official links to all 9 primary semiconductor standards organizations and open-source RTL hardware repositories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { name: 'Arm Architecture & AMBA Specs', org: '1 · Arm Architecture', url: 'https://developer.arm.com/documentation' },
            { name: 'PCI-SIG Specifications Library', org: '2 · PCI-SIG (PCIe / M-PCIe)', url: 'https://pcisig.com/specifications' },
            { name: 'JEDEC Memory & Flash Standards', org: '3 · JEDEC (DDR / LPDDR / HBM / UFS)', url: 'https://www.jedec.org/standards-documents' },
            { name: 'MIPI Alliance Specifications', org: '4 · MIPI Alliance (CSI / DSI / I3C / PHY)', url: 'https://www.mipi.org/specifications' },
            { name: 'USB-IF Document Library', org: '5 · USB Implementers Forum', url: 'https://www.usb.org/documents' },
            { name: 'RISC-V Technical Specifications', org: '6 · RISC-V International', url: 'https://riscv.org/technical/specifications/' },
            { name: 'Open Compute Project Specs', org: '7 · Open Compute Project (ODSA / BoW)', url: 'https://www.opencompute.org/contributions' },
            { name: 'IEEE Standards Association', org: '8 · IEEE SA (802.3 / 1149 / 1687 / 1801)', url: 'https://standards.ieee.org/' },
            { name: 'OpenTitan Official Documentation', org: '9 · lowRISC OpenTitan (TL-UL / Crypto)', url: 'https://opentitan.org/book/' },
            { name: 'lowRISC Ibex RISC-V Core', org: 'RTL · Apache-2.0 GitHub', url: 'https://github.com/lowRISC/ibex' },
            { name: 'OpenHW Group CVA6 & OBI', org: 'RTL · Solderpad GitHub', url: 'https://github.com/openhwgroup/cva6' },
            { name: 'PULP Platform & Chipyard / Vortex', org: 'RTL · ETH Zurich / UCB / GT', url: 'https://github.com/pulp-platform' },
          ].map((ext) => (
            <a
              key={ext.url}
              href={ext.url}
              target="_blank"
              rel="noreferrer"
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-cyan-500 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{ext.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{ext.org}</div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
