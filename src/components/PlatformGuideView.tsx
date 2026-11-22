import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckSquare,
  Clock,
  Code2,
  Compass,
  Cpu,
  Dices,
  FolderTree,
  GitCompare,
  GraduationCap,
  HelpCircle,
  Keyboard,
  Layers,
  Network,
  Search,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { ALL_PROTOCOLS } from '../data/protocols';
import { ALL_IPS } from '../data/ips';
import { ALL_SOCS } from '../data/socs';
import { ALL_EXPLAINER_TOPICS } from '../data/explainers';
import { RTL_SV_UVM_CURRICULUM, CurriculumPillarId } from '../data/rtlSvUvmCurriculum';
import { PROTOCOL_CATEGORIES } from '../data/categories';
import { GLOSSARY_TERMS } from '../data/glossary';
import type { AppView } from './HomeDashboard';

type GuideGroupId =
  | 'all'
  | 'protocols'
  | 'rtl-sv-uvm'
  | 'silicon-ips'
  | 'explainers-kg'
  | 'verification';

interface GuideToolEntry {
  id: string;
  group: Exclude<GuideGroupId, 'all'>;
  title: string;
  whereToFind: string;
  bestFor: string;
  whatItContains: string;
  howToUseSteps: string[];
  primaryLabel: string;
  primaryView?: AppView;
  primaryCurriculum?: CurriculumPillarId;
  primaryProtocolId?: string;
  primaryIpId?: string;
  secondaryLabel?: string;
  secondaryView?: AppView;
  icon: React.ComponentType<{ className?: string }>;
}

interface PlatformGuideViewProps {
  onNavigate: (view: AppView) => void;
  onSelectProtocol: (id: string) => void;
  onSelectIp: (id: string) => void;
  onOpenCurriculum: (pillar: CurriculumPillarId, moduleId?: string) => void;
  onOpenSearch: () => void;
  onFeelingLucky: (scope?: 'any' | 'protocol' | 'ip') => void;
}

const GUIDE_GROUPS: Array<{ id: GuideGroupId; label: string }> = [
  { id: 'all', label: 'All Modules & Tools' },
  { id: 'protocols', label: 'Protocols & Waveforms' },
  { id: 'rtl-sv-uvm', label: 'RTL / SV / UVM' },
  { id: 'silicon-ips', label: 'Silicon IPs & SoCs' },
  { id: 'explainers-kg', label: 'Explainers & Knowledge Graph' },
  { id: 'verification', label: 'Verification, Security & Audit' },
];

export const PlatformGuideView: React.FC<PlatformGuideViewProps> = ({
  onNavigate,
  onSelectProtocol,
  onSelectIp,
  onOpenCurriculum,
  onOpenSearch,
  onFeelingLucky,
}) => {
  const [activeGroup, setActiveGroup] = useState<GuideGroupId>('all');
  const [query, setQuery] = useState('');

  const guideEntries = useMemo<GuideToolEntry[]>(
    () => [
      {
        id: 'guide-protocol-specs',
        group: 'protocols',
        title: `Protocol Atlas & Spec Workbench (${ALL_PROTOCOLS.length} Standards)`,
        whereToFind: 'Top Header -> Protocol Atlas -> Protocol Specs sub-tab (or Home Directory cards)',
        bestFor: 'RTL designers, DV engineers, bring-up engineers, and interview prep',
        whatItContains: `${ALL_PROTOCOLS.length} protocols across ${PROTOCOL_CATEGORIES.length} categories with block diagrams, FSMs, signal tables, timing rules, assertions, debugging labs, and interview Q&A.`,
        howToUseSteps: [
          'Pick a protocol from the left category tree or filter by domain, Entity Type, or Lifecycle Status on Home.',
          'Switch the Focus Filter in the sub-bar (All Focus, RTL Focus, UVM Focus, Interview Prep) to highlight matching sections.',
          'Click any row in the Signal Table or any Pinout chip in the right Waveform Sandbox to open the Signal Inspector drawer.',
          'Compare Expected vs Actual bug waveforms in Section 06 and jump directly to related RTL/SV/UVM handbook modules.',
        ],
        primaryLabel: 'Open Protocol Specs',
        primaryView: 'protocol',
        secondaryLabel: 'Inspect AXI4 Spec',
        icon: BookOpen,
      },
      {
        id: 'guide-waveform-lab',
        group: 'protocols',
        title: 'Interactive Waveform Simulator Lab',
        whereToFind: 'Protocol Atlas sub-bar -> Waveform Lab (or Home -> Waveform Studio card)',
        bestFor: 'Visualizing valid/ready backpressure, burst transfers, and serial framing cycle-by-cycle',
        whatItContains: 'Cycle-accurate programmable traces for AXI4, AXI4-Lite, AXI4-Stream, APB, SPI, I2C, and UART.',
        howToUseSteps: [
          'Select the bus protocol and configure transaction count, burst length, or stall injection cycle.',
          'Step forward/backward cycle-by-cycle or click directly on any clock cycle column to inspect signal state values.',
          'Check the violation detector banner below the traces to confirm valid/ready stability rules hold.',
        ],
        primaryLabel: 'Open Waveform Lab',
        primaryView: 'simulator',
        icon: Activity,
      },
      {
        id: 'guide-compliance-checker',
        group: 'protocols',
        title: 'Protocol Compliance & Assertion Checker',
        whereToFind: 'Protocol Atlas sub-bar -> Compliance Checker (or Home -> Compliance Checker card)',
        bestFor: 'Testing bus transaction sequences against formal AMBA and TileLink protocol invariants',
        whatItContains: 'Interactive JSON/trace validator checking VALID/READY stability, WLAST framing, 4KB boundary rules, and TileLink integrity.',
        howToUseSteps: [
          'Load a built-in passing or failing scenario preset (or edit signal values per clock cycle in the JSON editor).',
          'Run validation to see cycle-indexed pass/fail diagnostics alongside rendered digital & bus waveforms.',
        ],
        primaryLabel: 'Open Compliance Checker',
        primaryView: 'checker',
        icon: CheckSquare,
      },
      {
        id: 'guide-compare-fabric',
        group: 'protocols',
        title: 'Protocol Comparison Matrix & Bus Fabric Map',
        whereToFind: 'Top Header -> Compare button (or Protocol Atlas sub-bar -> Protocol Compare / Bus Fabric Map)',
        bestFor: 'Choosing between AXI4, AHB5, TileLink, PCIe Gen5–7, DDR5/HBM3, and CXL topologies',
        whatItContains: 'Side-by-side matrix of burst rules, out-of-order IDs, coherency, ordering, and SoC bus hierarchy diagrams.',
        howToUseSteps: [
          'Select Protocol A and Protocol B in Protocol Compare to inspect bandwidth, pin count, and latency differences.',
          'Switch to Bus Fabric Map to trace how CPU clusters, coherent NoCs, DMA engines, DDR5/HBM, PCIe, and RoT connect.',
        ],
        primaryLabel: 'Open Protocol Compare',
        primaryView: 'compare',
        secondaryLabel: 'Open Bus Fabric Map',
        secondaryView: 'soc-map',
        icon: GitCompare,
      },
      {
        id: 'guide-rtl-design',
        group: 'rtl-sv-uvm',
        title: `RTL Design Handbook (${RTL_SV_UVM_CURRICULUM.filter((m) => m.pillar === 'rtl-design').length} Modules)`,
        whereToFind: 'Top Header -> RTL Design (or Protocol Doc footer cross-links / Search Atlas)',
        bestFor: 'Mastering synthesizable RTL architecture, CDC safety, pipelining, arbitration, and STA closure',
        whatItContains: '14 deep modules covering always_ff/always_comb rules, safe FSMs, valid/ready skid buffers, Gray async FIFOs, reset bridges, RROBIN/fixed-priority arbiters, SRAM modeling, ICG clock gating, and timing closure.',
        howToUseSteps: [
          'Select any chapter or module in the left sticky syllabus sidebar (or filter by keyword such as "skid" or "CDC").',
          'Review Normative Design Rules, compare Common Pitfall vs Verified Fix, and inspect/export the synthesizable `.sv` snippet.',
          'Click any Related Protocol, Related IP, CDC Analyzer, or RTL Source Explorer pill to jump directly into live silicon.',
        ],
        primaryLabel: 'Open RTL Design (14)',
        primaryCurriculum: 'rtl-design',
        secondaryLabel: 'Open RTL Source Explorer',
        secondaryView: 'rtl-explorer',
        icon: Cpu,
      },
      {
        id: 'guide-systemverilog',
        group: 'rtl-sv-uvm',
        title: `SystemVerilog IEEE 1800 Handbook (${RTL_SV_UVM_CURRICULUM.filter((m) => m.pillar === 'systemverilog').length} Modules)`,
        whereToFind: 'Top Header -> SystemVerilog (or RTL Design sub-bar -> SystemVerilog)',
        bestFor: 'Design and DV engineers writing clean SV RTL interfaces, SVA assertions, randomization, and coverage',
        whatItContains: '14 modules covering 2-state vs 4-state types, packed/unpacked arrays, queues/associative arrays, interfaces/modports, clocking blocks, OOP & parameterized classes, constrained randomization, covergroups, SVA sequences/properties, event scheduling regions, fork/join, and DPI-C.',
        howToUseSteps: [
          'Use the syllabus sidebar to jump directly to a language construct (for example Clocking Blocks or Concurrent SVA).',
          'Study the IEEE 1800 scheduling or race-condition pitfall next to the verified race-free implementation.',
          'Copy or download `.sv` code examples and jump into linked protocols that enforce those SVA properties.',
        ],
        primaryLabel: 'Open SystemVerilog (14)',
        primaryCurriculum: 'systemverilog',
        secondaryLabel: 'Open UVM & SVA Gen',
        secondaryView: 'uvm',
        icon: Code2,
      },
      {
        id: 'guide-uvm-studio',
        group: 'rtl-sv-uvm',
        title: `UVM Methodology IEEE 1800.2 Handbook (${RTL_SV_UVM_CURRICULUM.filter((m) => m.pillar === 'uvm-methodology').length} Modules)`,
        whereToFind: 'Top Header -> UVM (or RTL Design sub-bar -> UVM Methodology)',
        bestFor: 'Verification architects building reusable constrained-random agents, RAL models, and scoreboards',
        whatItContains: '14 modules covering UVM hierarchy & factory overrides, run phases & objections, sequence items, virtual sequences, active/passive drivers & monitors, TLM FIFOs/analysis ports, scoreboards, coverage subscribers, UVM RAL, uvm_config_db, and AXI/TileLink agent templates.',
        howToUseSteps: [
          'Walk sequentially from Module 01 (Testbench Hierarchy & Factory) through Module 14 (Protocol Agent Patterns).',
          'Review every objection/deadlock or config_db wildcard pitfall and apply the verified fix.',
          'Open the Verification Hub or UVM & SVA Generator from the quick links to inspect upstream core_ibex / dvsim flows.',
        ],
        primaryLabel: 'Open UVM Studio (14)',
        primaryCurriculum: 'uvm-methodology',
        secondaryLabel: 'Open Verification Hub',
        secondaryView: 'verification-hub',
        icon: ShieldCheck,
      },
      {
        id: 'guide-rtl-cdc',
        group: 'rtl-sv-uvm',
        title: 'RTL Source Explorer & Clock Domain (CDC) Analyzer',
        whereToFind: 'RTL Design sub-bar -> RTL Source Explorer / Clock Domains (CDC) (or Home tools)',
        bestFor: 'Tracing real Verilog/SystemVerilog module hierarchies and verifying multi-clock async boundaries',
        whatItContains: 'Extracted module trees, port directions, extracted FSMs, synchronizer points (2-FF, Gray FIFO, reset bridges) across multi-clock IPs.',
        howToUseSteps: [
          'Open RTL Explorer and pick an IP core (Ibex, CVA6, OpenTitan AES, Vortex) to inspect submodule hierarchy and RTL snippets.',
          'Open Clock Domains (CDC) to view independent clock islands, reset domains, and synchronizer placement across IPs.',
        ],
        primaryLabel: 'Open CDC Analyzer',
        primaryView: 'cdc-analyzer',
        secondaryLabel: 'Open RTL Explorer',
        secondaryView: 'rtl-explorer',
        icon: Clock,
      },
      {
        id: 'guide-ip-universe',
        group: 'silicon-ips',
        title: `Open-Source Silicon IP Universe (${ALL_IPS.length} Real IPs)`,
        whereToFind: 'Top Header -> IP Universe (includes Processors, GPUs, AI Accelerators sub-tabs)',
        bestFor: 'Reverse-engineering real open-source silicon RTL, CSR maps, parameters, and bus ports',
        whatItContains: `${ALL_IPS.length} IPs from lowRISC OpenTitan & Ibex, OpenHW CVA6, UC Berkeley Rocket Chip/BOOM/Gemmini, Vortex/MIAOW/Nyuzi GPUs, NVDLA, PULP, and LiteX.`,
        howToUseSteps: [
          'Filter by category (CPU & Processor, GPU & Graphics, AI & ML Accelerator, Security & Crypto, Interconnect).',
          'Open any IP to switch between IP Explorer (RTL hierarchy, FSMs, CSR register bit-fields) and Protocol Explorer (linked bus specs).',
          'Use IP Compare in the sub-bar to benchmark two cores side-by-side (for example Ibex vs CVA6 or Vortex vs MIAOW).',
        ],
        primaryLabel: 'Open IP Universe',
        primaryView: 'ip-universe',
        secondaryLabel: 'Inspect Ibex CPU',
        primaryIpId: 'ibex',
        icon: FolderTree,
      },
      {
        id: 'guide-soc-master-arch',
        group: 'silicon-ips',
        title: `SoC Explorer (${ALL_SOCS.length} Topologies) & 16-Domain Architecture Atlas`,
        whereToFind: 'IP Universe sub-bar -> SoC Explorer / 16-Domain Atlas',
        bestFor: 'Seeing how CPUs, crossbars, memory controllers, and peripherals assemble into complete chips',
        whatItContains: '6 full SoC architectures (OpenTitan EarlGrey, Chipyard, PULPissimo, CVA6 SoC, LiteX, OpenPiton) plus the 16-Domain taxonomy (ISA, Packaging, Physical Design, DFT, FuSa, Standards).',
        howToUseSteps: [
          'Pick an SoC in SoC Explorer to trace its memory map, bus crossbar fabric, clock/reset tree, and integrated IP list.',
          'Click any connected IP block or protocol edge inside an SoC to jump straight into its RTL or protocol specification.',
          'Browse 16-Domain Atlas for cross-cutting semiconductor topics spanning RTL-to-GDSII, CoWoS/3D-IC, and ISO 26262 lockstep.',
        ],
        primaryLabel: 'Open SoC Explorer',
        primaryView: 'soc-explorer',
        secondaryLabel: 'Open 16-Domain Atlas',
        secondaryView: 'master-architecture',
        icon: Layers,
      },
      {
        id: 'guide-explainers',
        group: 'explainers-kg',
        title: `Interactive Hardware Explainer Studio (${ALL_EXPLAINER_TOPICS.length} Topics · 14 Renderers)`,
        whereToFind: 'Top Header -> Explainers (or "Explainer" button on any Home / Protocol / IP card)',
        bestFor: 'Visual learners stepping interactively through datapaths, pipelines, systolic arrays, NoCs, and caches',
        whatItContains: `${ALL_EXPLAINER_TOPICS.length} interactive topics backed by 14 live renderers (Packet Flows, Sequence Diagrams, Waveforms, FSMs, Bit-Field Decoders, CPU Pipelines, Memory Page Walks, UPF Floorplans, 60fps Systolic Arrays, MESI Coherence, 2D NoC Mesh, Credit Meters, Roofline Plots, Protocol Stacks).`,
        howToUseSteps: [
          'Search or browse by hardware domain on the Explainers sidebar and pick any topic.',
          'Press Play or use keyboard ArrowLeft / ArrowRight (or Space) to step through cycles and scrub the timeline.',
          'Toggle live between Overview, Detail, and Expert depth levels, switch on Verification View, test Try-It mutations, and take the 3-question self-check.',
          'Copy the URL hash (#explainer/<topic>/s<scene>/t<step>) to deep-link directly to any exact cycle.',
        ],
        primaryLabel: 'Launch Explainer Studio',
        primaryView: 'explainer',
        icon: GraduationCap,
      },
      {
        id: 'guide-mind-map',
        group: 'explainers-kg',
        title: 'Complete Mind Map (All Sections, Common & Merged)',
        whereToFind: 'Top Header -> Mind Map (or Home Utility Strip -> All Sections & Common Mind Map)',
        bestFor: 'Seeing the entire VLSI Atlas at a glance — every section, cross-cutting common concept, and direct jump links',
        whatItContains: 'Interactive infinity-mesh Mind Map switching between Merged (All + Common), All Sections (6 Pillars / 24 Branches), and Common Bridges (8 shared foundations like Valid/Ready, CDC, SVA, RAL, Coherency).',
        howToUseSteps: [
          'Switch modes between Merged (All + Common), All Sections, and Common Bridges depending on your focus.',
          'Click any branch, sub-branch, or Common Bridge node to highlight cross-section dependencies and launch directly into that workbench.',
        ],
        primaryLabel: 'Open Mind Map',
        primaryView: 'mind-map',
        icon: Network,
      },
      {
        id: 'guide-knowledge-graph',
        group: 'explainers-kg',
        title: 'Semiconductor Knowledge Graph & Live Repo Ingestion',
        whereToFind: 'IP Universe sub-bar -> Knowledge Graph (or Home -> Knowledge Graph button; Repo Ingestion via IP sub-bar)',
        bestFor: 'Impact/blast-radius analysis, shortest-path dependency tracing, and parsing your own Verilog/SV snippets',
        whatItContains: '1,108+ interconnected nodes and 1,031+ typed edges spanning Protocols, IPs, SoCs, Modules, Signals, Registers, Clocks, Assertions, and EDA tools.',
        howToUseSteps: [
          'Pick an exploration mode or natural-language query pattern (or find shortest path between two hardware nodes).',
          'Inspect neighbor dependencies, blast radius, and export subgraphs as JSON, CSV, Markdown, or Mermaid diagrams.',
          'In Repo Ingestion, paste or upload Verilog/SystemVerilog/Chisel RTL to extract modules/ports and patch the graph live.',
        ],
        primaryLabel: 'Open Knowledge Graph',
        primaryView: 'knowledge-graph',
        secondaryLabel: 'Open Repo Ingestion',
        secondaryView: 'repo-ingestion',
        icon: Network,
      },
      {
        id: 'guide-aes-deep-dive',
        group: 'verification',
        title: 'AES 7-Chapter Hardware Security Deep Dive & FIPS-197 Stepper',
        whereToFind: 'Home -> 4. AES 7-Chapter Deep Dive / AES Crypto & RTL Lab (or Footer / Search Atlas)',
        bestFor: 'Learning hardware cryptography, DOM side-channel masking, TL-UL bus integrity, and fault testing',
        whatItContains: '30 topics across 7 chapters covering GF(2^8) math, SubBytes/ShiftRows/MixColumns/KeyExpansion, DOM masking, TVLA leakage analysis, UVM security verification, and a live FIPS-197 state matrix stepper.',
        howToUseSteps: [
          'Work chapter-by-chapter or jump to any subtopic with L1 Fundamental, L2 Engineering Mechanics, and L3 RTL/DV notes.',
          'Use the interactive FIPS-197 AES-128 state matrix stepper to observe SubBytes, ShiftRows, MixColumns, and AddRoundKey transformations live.',
        ],
        primaryLabel: 'Open AES Deep Dive',
        primaryView: 'aes-deep-dive',
        icon: ShieldCheck,
      },
      {
        id: 'guide-completeness-glossary',
        group: 'verification',
        title: `16-Checkpoint Completeness Dashboard & Silicon Glossary (${GLOSSARY_TERMS.length} Terms)`,
        whereToFind: 'Footer -> Completeness Audit / Glossary (or Home Utility Strip -> Completeness Dashboard)',
        bestFor: 'Auditing documentation coverage across every protocol/IP and looking up linked RTL/DV terminology',
        whatItContains: 'Live 16-checkpoint quality matrix verifying Fundamentals, Architecture, Signals, Waveforms, RTL, Assertions, Coverage, Debugging, and Citations at 100%, plus the cross-linked Silicon Glossary.',
        howToUseSteps: [
          'Open Completeness Audit to verify checkpoint pass status across all 498 protocols and 37 IPs.',
          'Open Glossary to read Level-1, Level-2, and Level-3 definitions and jump straight to protocols/IPs using that term.',
        ],
        primaryLabel: 'Open Completeness Audit',
        primaryView: 'completeness-dashboard',
        secondaryLabel: 'Open Glossary',
        secondaryView: 'glossary',
        icon: BarChart3,
      },
    ],
    []
  );

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guideEntries.filter((entry) => {
      if (activeGroup !== 'all' && entry.group !== activeGroup) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.whereToFind.toLowerCase().includes(q) ||
        entry.bestFor.toLowerCase().includes(q) ||
        entry.whatItContains.toLowerCase().includes(q) ||
        entry.howToUseSteps.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [guideEntries, activeGroup, query]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Header Banner */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-mono font-semibold text-[var(--sem-control)]">Platform Guide &amp; Navigation Map</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{ALL_PROTOCOLS.length} Protocols</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{RTL_SV_UVM_CURRICULUM.length} RTL / SV / UVM Modules</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{ALL_IPS.length} Open-Source IPs</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{ALL_EXPLAINER_TOPICS.length} Explainers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
              How to Use What &amp; Where to Find Everything
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              A complete roadmap of every workspace, interactive lab, curriculum studio, and dataset in VLSI Protocol Atlas — including exact click paths, step-by-step workflows, keyboard shortcuts, and deep-link URL formats.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--sem-control)] text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              Global Search (/)
            </button>
            <button
              type="button"
              onClick={() => onFeelingLucky('any')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Dices className="w-4 h-4 text-[var(--sem-control)]" />
              Surprise Pick
            </button>
          </div>
        </div>

        {/* Navigation Quick-Map (Where Everything Lives in Top Header & Sub-Bars) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-subtle)]">
          {[
            {
              hub: 'Protocol Atlas',
              path: 'Header -> Protocol Atlas',
              children: 'Protocol Specs (498), Waveform Lab, Compliance Checker, Protocol Compare, Bus Fabric Map, Focus Filter',
              action: () => onNavigate('protocol'),
            },
            {
              hub: 'RTL Design / SV / UVM',
              path: 'Header -> RTL Design | SystemVerilog | UVM',
              children: '14 RTL Design, 14 SystemVerilog (IEEE 1800), 14 UVM (1800.2), RTL Source Explorer, CDC Analyzer, UVM & SVA Gen, Verification Hub',
              action: () => onOpenCurriculum('rtl-design'),
            },
            {
              hub: 'IP Universe & SoCs',
              path: 'Header -> IP Universe',
              children: '37 Open-Source IPs (CPUs, GPUs, AI, Crypto), 6 SoC Topologies, 16-Domain Atlas, Knowledge Graph (1,108 nodes), IP Compare, Repo Ingestion',
              action: () => onNavigate('ip-universe'),
            },
            {
              hub: 'Explainers & Quality Labs',
              path: 'Header -> Explainers · Home Utility Strip · Footer',
              children: '544 Hardware Explainers (14 renderers), AES 7-Chapter Lab (30 topics), 16-Checkpoint Audit (100%), Silicon Glossary',
              action: () => onNavigate('explainer'),
            },
          ].map((item) => (
            <button
              key={item.hub}
              type="button"
              onClick={item.action}
              className="p-4 text-left rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--sem-control)] transition-colors cursor-pointer flex flex-col justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{item.hub}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--sem-control)] shrink-0" />
                </div>
                <div className="font-mono text-[11px] text-[var(--sem-control)]">{item.path}</div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.children}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            {GUIDE_GROUPS.map((grp) => {
              const active = activeGroup === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setActiveGroup(grp.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                  }`}
                >
                  {grp.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a tool, dataset, or workflow..."
              className="w-full pl-8 pr-8 py-2 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--sem-control)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear guide search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Detailed Tool-by-Tool Playbooks */}
        {filteredEntries.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center space-y-3">
            <Compass className="w-6 h-6 text-[var(--text-secondary)] mx-auto" />
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              No matching guide modules for &ldquo;{query}&rdquo;
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Try searching for &ldquo;waveform&rdquo;, &ldquo;UVM&rdquo;, &ldquo;CDC&rdquo;, &ldquo;Ibex&rdquo;, &ldquo;SVA&rdquo;, or reset filters below.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveGroup('all');
                setQuery('');
              }}
              className="px-4 py-2 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer"
            >
              Reset Guide Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <article
                  key={entry.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-[var(--sem-control)] shrink-0" />
                          <h2 className="text-base font-bold text-[var(--text-primary)]">{entry.title}</h2>
                        </div>
                        <div className="font-mono text-[11px] text-[var(--sem-control)]">
                          Where: {entry.whereToFind}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-primary)]">Best for:</strong> {entry.bestFor}
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{entry.whatItContains}</p>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                      <div className="text-xs font-semibold text-[var(--text-primary)]">How to use it</div>
                      <ol className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                        {entry.howToUseSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                            <span className="font-mono text-[11px] text-[var(--sem-control)] tabular-nums shrink-0 mt-0.5">
                              0{i + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (entry.primaryCurriculum) onOpenCurriculum(entry.primaryCurriculum);
                        else if (entry.primaryProtocolId) onSelectProtocol(entry.primaryProtocolId);
                        else if (entry.primaryIpId) onSelectIp(entry.primaryIpId);
                        else if (entry.primaryView) onNavigate(entry.primaryView);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-[var(--sem-control)] text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                    >
                      <span>{entry.primaryLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {entry.secondaryLabel && (
                      <button
                        type="button"
                        onClick={() => {
                          if (entry.secondaryLabel === 'Inspect AXI4 Spec') onSelectProtocol('axi4');
                          else if (entry.secondaryView) onNavigate(entry.secondaryView);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {entry.secondaryLabel}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Role-Based Recommended Workflows + Shortcuts Table */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        <div className="lg:col-span-7 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <HelpCircle className="w-4 h-4 text-[var(--sem-control)]" />
            Quick Role Playbooks: Start Here by Goal
          </div>
          <div className="divide-y divide-[var(--border-subtle)] text-xs">
            {[
              {
                role: 'RTL Design Engineer',
                flow: 'RTL Design Handbook (14) -> Protocol Specs (RTL Focus) -> RTL Source Explorer -> CDC Clock Analyzer',
                cta: 'Open RTL Design',
                onClick: () => onOpenCurriculum('rtl-design'),
              },
              {
                role: 'Design Verification (DV) Engineer',
                flow: 'SystemVerilog (14) -> UVM Studio (14) -> UVM & SVA Gen -> Compliance Checker -> Verification Hub',
                cta: 'Open UVM Studio',
                onClick: () => onOpenCurriculum('uvm-methodology'),
              },
              {
                role: 'SoC Architect / Integrator',
                flow: 'SoC Explorer (6 Chips) -> Bus Fabric Map -> Knowledge Graph -> Protocol Compare -> IP Comparison',
                cta: 'Open SoC Explorer',
                onClick: () => onNavigate('soc-explorer'),
              },
              {
                role: 'Hardware Security Engineer',
                flow: 'AES 7-Chapter Lab -> OpenTitan AES IP -> TL-UL Integrity Protocol -> DOM Masking & TVLA Notes',
                cta: 'Open AES Lab',
                onClick: () => onNavigate('aes-deep-dive'),
              },
              {
                role: 'Student / Interview Preparation',
                flow: 'Explainer Studio -> Protocol Docs (Interview Prep Focus) -> Waveform Studio -> Silicon Glossary',
                cta: 'Launch Explainers',
                onClick: () => onNavigate('explainer'),
              },
            ].map((row) => (
              <div key={row.role} className="py-3.5 first:pt-1 last:pb-1 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="font-semibold text-[var(--text-primary)]">{row.role}</div>
                  <div className="font-mono text-[11px] text-[var(--text-secondary)] leading-relaxed">{row.flow}</div>
                </div>
                <button
                  type="button"
                  onClick={row.onClick}
                  className="px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] font-medium cursor-pointer whitespace-nowrap shrink-0"
                >
                  {row.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <Keyboard className="w-4 h-4 text-[var(--sem-control)]" />
            Keyboard Shortcuts &amp; Deep-Link Formats
          </div>
          <div className="divide-y divide-[var(--border-subtle)] text-xs">
            {[
              { key: '/ or Cmd/Ctrl + K', desc: 'Open Global Atlas Search across all 498 protocols, 42 RTL/SV/UVM modules, 37 IPs, RTL files & signals' },
              { key: 'Esc', desc: 'Close Search Atlas modal cleanly' },
              { key: 'Space / ArrowLeft / ArrowRight', desc: 'Play/pause or step cycle-by-cycle inside Interactive Hardware Explainer Studio' },
              { key: '#explainer/<topic>/s<n>/t<step>', desc: 'Share or bookmark an exact explainer topic, scene, and clock cycle index' },
              { key: 'All / RTL / UVM / Interview Focus', desc: 'In Protocol Docs sub-bar, jump/highlight sections relevant to your engineering role' },
              { key: 'Sun / Moon Toggle (Top Right)', desc: 'Instant dark/light mode across waveforms, SVG FSMs, diagrams & code blocks' },
            ].map((item) => (
              <div key={item.key} className="py-3 first:pt-1 last:pb-1 space-y-1">
                <div className="font-mono text-[11px] font-semibold text-[var(--sem-control)]">{item.key}</div>
                <div className="text-[var(--text-secondary)] leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Data Inventory Summary */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
          <Terminal className="w-4 h-4 text-[var(--sem-control)] shrink-0" />
          <span>
            Looking for documentation authoring schemas or local build commands? Check <strong className="font-mono text-[var(--text-primary)]">README.md</strong> in the repository root.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-[var(--text-secondary)]">
          <span>{ALL_PROTOCOLS.length} Protocols</span>
          <span aria-hidden="true">·</span>
          <span>{RTL_SV_UVM_CURRICULUM.length} RTL/SV/UVM</span>
          <span aria-hidden="true">·</span>
          <span>{ALL_IPS.length} IPs</span>
          <span aria-hidden="true">·</span>
          <span>{ALL_SOCS.length} SoCs</span>
          <span aria-hidden="true">·</span>
          <span>{ALL_EXPLAINER_TOPICS.length} Explainers</span>
        </div>
      </section>
    </div>
  );
};
