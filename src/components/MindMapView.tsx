import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  GitFork,
  Search,
  X,
} from 'lucide-react';
import { ALL_PROTOCOLS } from '../data/protocols';
import { PROTOCOL_CATEGORIES } from '../data/categories';
import { ALL_IPS } from '../data/ips';
import { ALL_SOCS } from '../data/socs';
import { ALL_EXPLAINER_TOPICS } from '../data/explainers';
import { CurriculumPillarId, RTL_SV_UVM_CURRICULUM } from '../data/rtlSvUvmCurriculum';
import { GLOSSARY_TERMS } from '../data/glossary';
import { InfiniteMeshViewport, MiniMapBlockItem, MiniMapLinkItem } from './InfiniteMeshViewport';
import type { AppView } from './HomeDashboard';

export type MindMapMode = 'merged' | 'sections' | 'common';
export type MindMapNodeKind = 'root' | 'section' | 'subsection' | 'common';

interface JumpAction {
  label: string;
  kind: 'view' | 'protocol' | 'ip' | 'curriculum' | 'explainer' | 'kg';
  targetId: string;
  pillar?: CurriculumPillarId;
}

interface MindMapNode {
  id: string;
  kind: MindMapNodeKind;
  sectionId?: string;
  title: string;
  subtitle: string;
  metric: string;
  description: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  side?: 'left' | 'right' | 'center';
  connectedSectionIds: string[];
  connectedNodeIds: string[];
  actions: JumpAction[];
}

interface MindMapEdge {
  id: string;
  from: string;
  to: string;
  kind: 'hierarchy' | 'branch' | 'common-bridge';
  color: string;
  label?: string;
}

interface MindMapViewProps {
  onNavigate: (view: AppView) => void;
  onSelectProtocol: (id: string) => void;
  onSelectIp: (id: string) => void;
  onOpenCurriculum: (pillar: CurriculumPillarId, moduleId?: string) => void;
  onOpenExplainer: (topicId?: string) => void;
  onOpenKnowledgeGraph: (nodeId?: string) => void;
}

const SECTION_META: Array<{
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  color: string;
  side: 'left' | 'right';
  hubY: number;
  viewTarget: AppView;
  metric: string;
  description: string;
}> = [
  {
    id: 'sec-protocols',
    number: '01',
    title: 'Protocol Atlas & Bus Specs',
    shortTitle: 'Protocols',
    color: '#06b6d4',
    side: 'left',
    hubY: 255,
    viewTarget: 'protocol',
    metric: `${ALL_PROTOCOLS.length} Specs · ${PROTOCOL_CATEGORIES.length} Cats`,
    description:
      'AMBA (AXI3–AXI5, AHB, APB, ACE, CHI), TileLink, OBI, PCIe Gen1–Gen7, CXL, DDR5/HBM3, USB4, Ethernet 10M–1.6T, MIPI, Automotive, Debug, Safety & Packaging.',
  },
  {
    id: 'sec-rtl',
    number: '02',
    title: 'RTL Design Handbook',
    shortTitle: 'RTL Design',
    color: '#3b82f6',
    side: 'left',
    hubY: 556,
    viewTarget: 'rtl-design',
    metric: `${RTL_SV_UVM_CURRICULUM.filter((m) => m.pillar === 'rtl-design').length} Modules · Synthesis`,
    description:
      'Synthesizable Verilog/SystemVerilog microarchitecture: always_comb/always_ff semantics, safe FSMs, valid/ready skid buffers, async Gray FIFOs, reset bridges, arbiters, SRAMs & STA.',
  },
  {
    id: 'sec-sv',
    number: '03',
    title: 'SystemVerilog IEEE 1800',
    shortTitle: 'SystemVerilog',
    color: '#8b5cf6',
    side: 'left',
    hubY: 855,
    viewTarget: 'systemverilog',
    metric: `${RTL_SV_UVM_CURRICULUM.filter((m) => m.pillar === 'systemverilog').length} Modules · SVA & OOP`,
    description:
      'Complete IEEE 1800-2023 language coverage: 2/4-state types, packed structs, interfaces & modports, clocking blocks, OOP, constrained randomization, covergroups, SVA & DPI-C.',
  },
  {
    id: 'sec-uvm',
    number: '04',
    title: 'UVM & Verification Studios',
    shortTitle: 'UVM & Labs',
    color: '#10b981',
    side: 'right',
    hubY: 255,
    viewTarget: 'uvm-studio',
    metric: `${RTL_SV_UVM_CURRICULUM.filter((m) => m.pillar === 'uvm-methodology').length} Modules · 4 Studios`,
    description:
      'IEEE 1800.2 verification architecture (factory, config_db, TLM, virtual sequences, scoreboards, RAL) paired with interactive Waveform Lab, Compliance Checker & UVM Generator.',
  },
  {
    id: 'sec-ips',
    number: '05',
    title: 'Open-Source Silicon IPs',
    shortTitle: 'Silicon IPs',
    color: '#f59e0b',
    side: 'right',
    hubY: 556,
    viewTarget: 'ip-universe',
    metric: `${ALL_IPS.length} Real RTL IPs`,
    description:
      'Reverse-engineered production RTL from lowRISC OpenTitan & Ibex, OpenHW CVA6, UC Berkeley Rocket/BOOM/Gemmini, Vortex/MIAOW/Nyuzi GPUs, NVDLA, PULP & LiteDRAM.',
  },
  {
    id: 'sec-socs',
    number: '06',
    title: 'SoCs, Explainers & Atlases',
    shortTitle: 'SoCs & Studios',
    color: '#f43f5e',
    side: 'right',
    hubY: 855,
    viewTarget: 'soc-explorer',
    metric: `${ALL_SOCS.length} SoCs · ${ALL_EXPLAINER_TOPICS.length} Explainers`,
    description:
      'Multi-IP SoC topologies, Interactive Explainer Studio, 16-Domain Knowledge Architecture, Silicon Knowledge Graph, CDC Analyzer, RTL Source Explorer, Glossary & 100% Audit.',
  },
];

interface CommonBridgeDef {
  id: string;
  title: string;
  subtitle: string;
  metric: string;
  description: string;
  row: 'top' | 'bottom';
  colIdx: number;
  connectedSectionIds: string[];
  connectedNodeIds: string[];
  crosswalk: {
    protocol: { label: string; id: string };
    rtl: { label: string; id: string };
    sv: { label: string; id: string };
    uvm: { label: string; id: string };
    ip: { label: string; id: string };
  };
  actions: JumpAction[];
}

const COMMON_BRIDGES: CommonBridgeDef[] = [
  {
    id: 'common-handshake',
    title: 'Valid / Ready & Skid Buffers',
    subtitle: 'Common Flow-Control Contract',
    metric: 'Protocols ↔ RTL ↔ UVM ↔ IPs',
    description:
      'The universal backpressure contract linking AMBA AXI4/Stream and TileLink channels with RTL skid buffers, SV interface modports, SVA stability checks, and UVM drivers.',
    row: 'top',
    colIdx: 0,
    connectedSectionIds: ['sec-protocols', 'sec-rtl', 'sec-sv', 'sec-uvm', 'sec-ips'],
    connectedNodeIds: [
      'sub-proto-amba',
      'sub-rtl-pipe',
      'sub-sv-types',
      'sub-uvm-agents',
      'sub-ip-noc',
    ],
    crosswalk: {
      protocol: { label: 'AMBA AXI4', id: 'axi4' },
      rtl: { label: 'Skid Buffers & Elastic Pipes', id: 'rtl-skid-buffer' },
      sv: { label: 'Interfaces & Modports', id: 'sv-interfaces-modports' },
      uvm: { label: 'Drivers & Monitors', id: 'uvm-driver-monitor' },
      ip: { label: 'PULP AXI Crossbar', id: 'pulp-axi' },
    },
    actions: [
      { label: 'AXI4 Spec', kind: 'protocol', targetId: 'axi4' },
      { label: 'RTL Skid Buffer Module', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-skid-buffer' },
      { label: 'Waveform Lab', kind: 'view', targetId: 'simulator' },
      { label: 'AXI4 Interactive Explainer', kind: 'explainer', targetId: 'axi4-handshake' },
    ],
  },
  {
    id: 'common-cdc',
    title: 'Clocking, Reset & CDC / RDC',
    subtitle: 'Common Timing-Domain Layer',
    metric: 'Cat 25 ↔ RTL CDC ↔ SV Clocking ↔ IPs',
    description:
      'Safe crossing across asynchronous clock domains via 2-FF synchronizers, Gray-coded async FIFOs, reset synchronization trees, SV clocking blocks, and multi-clock IP verification.',
    row: 'top',
    colIdx: 1,
    connectedSectionIds: ['sec-protocols', 'sec-rtl', 'sec-sv', 'sec-ips', 'sec-socs'],
    connectedNodeIds: [
      'sub-proto-arch',
      'sub-rtl-cdc',
      'sub-sv-sva',
      'sub-ip-sec',
      'sub-soc-audit',
    ],
    crosswalk: {
      protocol: { label: 'Gray-Code Async FIFO', id: 'gray-code-fifo' },
      rtl: { label: 'CDC & Async FIFO', id: 'rtl-cdc-fifo' },
      sv: { label: 'Clocking Blocks & Skew', id: 'sv-clocking-blocks' },
      uvm: { label: 'Virtual Interfaces & Phases', id: 'uvm-phasing-objections' },
      ip: { label: 'OpenTitan AES (Multi-Clk)', id: 'opentitan-aes' },
    },
    actions: [
      { label: 'Open CDC Analyzer', kind: 'view', targetId: 'cdc-analyzer' },
      { label: 'RTL CDC & FIFO Module', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-cdc-fifo' },
      { label: 'SV Clocking Blocks', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-clocking-blocks' },
      { label: 'Gray-Code FIFO Spec', kind: 'protocol', targetId: 'gray-code-fifo' },
    ],
  },
  {
    id: 'common-sva',
    title: 'SVA & Protocol Assertions',
    subtitle: 'Common Verification Invariants',
    metric: 'SV 1800 ↔ Checker ↔ UVM ↔ Specs',
    description:
      'Temporal sequences and concurrent properties verifying protocol handshakes, burst framing, reset cleanliness, and compliance rules across simulation and formal.',
    row: 'top',
    colIdx: 2,
    connectedSectionIds: ['sec-protocols', 'sec-sv', 'sec-uvm', 'sec-socs'],
    connectedNodeIds: [
      'sub-proto-amba',
      'sub-sv-sva',
      'sub-uvm-labs',
      'sub-uvm-hub',
    ],
    crosswalk: {
      protocol: { label: 'SVA Standard Ref', id: 'sva-standard' },
      rtl: { label: 'Safe FSM & Synthesis', id: 'rtl-fsm-design' },
      sv: { label: 'Concurrent SVA', id: 'sv-sva-assertions' },
      uvm: { label: 'Protocol Agent Patterns', id: 'uvm-protocol-agents' },
      ip: { label: 'Ibex RISC-V Core', id: 'ibex' },
    },
    actions: [
      { label: 'Compliance Checker', kind: 'view', targetId: 'checker' },
      { label: 'SV Concurrent SVA', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-sva-assertions' },
      { label: 'UVM & SVA Generator', kind: 'view', targetId: 'uvm' },
      { label: 'Verification Hub', kind: 'view', targetId: 'verification-hub' },
    ],
  },
  {
    id: 'common-csr',
    title: 'CSR Maps, HJSON & UVM RAL',
    subtitle: 'Common SW/HW Control Plane',
    metric: 'APB/TL-UL ↔ SystemRDL ↔ UVM RAL ↔ IPs',
    description:
      'Memory-mapped registers bridging software drivers to silicon state: APB/AXI4-Lite/TL-UL interfaces, SystemRDL specs, IP HJSON CSR tables, and mirrored UVM RAL models.',
    row: 'top',
    colIdx: 3,
    connectedSectionIds: ['sec-protocols', 'sec-rtl', 'sec-uvm', 'sec-ips'],
    connectedNodeIds: [
      'sub-proto-io',
      'sub-rtl-arb',
      'sub-uvm-agents',
      'sub-ip-sec',
    ],
    crosswalk: {
      protocol: { label: 'AMBA APB4 / SystemRDL', id: 'apb' },
      rtl: { label: 'Synchronous Register Files', id: 'rtl-sram-mem' },
      sv: { label: 'Packed Structs & Unions', id: 'sv-packed-unpacked' },
      uvm: { label: 'UVM RAL Model', id: 'uvm-ral' },
      ip: { label: 'OpenTitan HMAC', id: 'opentitan-hmac' },
    },
    actions: [
      { label: 'UVM RAL Module', kind: 'curriculum', pillar: 'uvm-methodology', targetId: 'uvm-ral' },
      { label: 'AMBA APB Spec', kind: 'protocol', targetId: 'apb' },
      { label: 'SystemRDL Spec', kind: 'protocol', targetId: 'systemrdl' },
      { label: 'OpenTitan HMAC IPs', kind: 'ip', targetId: 'opentitan-hmac' },
    ],
  },
  {
    id: 'common-coherency',
    title: 'Coherency, NoC & Memory Hierarchy',
    subtitle: 'Common Fabric Architecture',
    metric: 'CHI/CXL ↔ DRAM ↔ CPUs ↔ SoCs',
    description:
      'Cache coherence and wide memory fabrics uniting MESI/CHI/TileLink/CXL protocols, DDR5/HBM3 PHY layers, multi-core RISC-V clusters, and SoC interconnect topologies.',
    row: 'bottom',
    colIdx: 0,
    connectedSectionIds: ['sec-protocols', 'sec-rtl', 'sec-ips', 'sec-socs'],
    connectedNodeIds: [
      'sub-proto-hs',
      'sub-proto-arch',
      'sub-ip-cpu',
      'sub-ip-noc',
      'sub-soc-map',
    ],
    crosswalk: {
      protocol: { label: 'AMBA CHI / CXL', id: 'chi' },
      rtl: { label: 'Arbitration & Crossbars', id: 'rtl-arbiters' },
      sv: { label: 'Virtual Interfaces & Param', id: 'sv-oop-classes' },
      uvm: { label: 'Scoreboards & TLM', id: 'uvm-tlm-scoreboard' },
      ip: { label: 'Rocket Chip & LiteDRAM', id: 'rocket-chip' },
    },
    actions: [
      { label: 'AMBA CHI Spec', kind: 'protocol', targetId: 'chi' },
      { label: 'Bus Fabric Map', kind: 'view', targetId: 'soc-map' },
      { label: 'SoC Explorer', kind: 'view', targetId: 'soc-explorer' },
      { label: 'Rocket Chip IP', kind: 'ip', targetId: 'rocket-chip' },
    ],
  },
  {
    id: 'common-security',
    title: 'Hardware Security & Fault Safety',
    subtitle: 'Common Trust & Reliability Layer',
    metric: 'TL-UL Integrity ↔ OpenTitan ↔ Lockstep',
    description:
      'Integrity-checked buses, cryptographic accelerators, side-channel masking, ISO 26262 Dual-Core Lockstep, and fault injection safeguards spanning IPs and protocols.',
    row: 'bottom',
    colIdx: 1,
    connectedSectionIds: ['sec-protocols', 'sec-rtl', 'sec-ips', 'sec-socs'],
    connectedNodeIds: [
      'sub-proto-arch',
      'sub-rtl-fsm',
      'sub-ip-sec',
      'sub-soc-map',
    ],
    crosswalk: {
      protocol: { label: 'TL-UL Integrity / ISO 26262', id: 'tl-ul-integrity' },
      rtl: { label: 'Fault-Safe FSM Encoding', id: 'rtl-fsm-design' },
      sv: { label: 'SVA Safety Invariants', id: 'sv-sva-assertions' },
      uvm: { label: 'Fault & Error Injection', id: 'uvm-sequences' },
      ip: { label: 'OpenTitan AES & 7-Ch Lab', id: 'opentitan-aes' },
    },
    actions: [
      { label: '7-Chapter AES Lab', kind: 'view', targetId: 'aes-deep-dive' },
      { label: 'TL-UL Integrity Spec', kind: 'protocol', targetId: 'tl-ul-integrity' },
      { label: 'ISO 26262 Spec', kind: 'protocol', targetId: 'iso-26262-iec-61508' },
      { label: 'OpenTitan EarlGrey SoC', kind: 'view', targetId: 'soc-explorer' },
    ],
  },
  {
    id: 'common-compute',
    title: 'SIMT, Systolic & DMA Compute',
    subtitle: 'Common Parallel Datapath',
    metric: 'AXI-Stream/HBM ↔ RTL Pipes ↔ GPUs/AI',
    description:
      'High-throughput streaming DMA engines, deep arithmetic pipelines, warp schedulers, and systolic matrix arrays across Gemmini, NVDLA, Vortex GPU, and HBM3 subsystems.',
    row: 'bottom',
    colIdx: 2,
    connectedSectionIds: ['sec-protocols', 'sec-rtl', 'sec-ips', 'sec-socs'],
    connectedNodeIds: [
      'sub-proto-hs',
      'sub-rtl-pipe',
      'sub-ip-gpu',
      'sub-soc-exp',
    ],
    crosswalk: {
      protocol: { label: 'AXI4-Stream / HBM3', id: 'axi4-stream' },
      rtl: { label: 'Pipelining & Retiming', id: 'rtl-pipelining' },
      sv: { label: 'Parameterized Classes', id: 'sv-oop-classes' },
      uvm: { label: 'Throughput Coverage', id: 'uvm-coverage' },
      ip: { label: 'Vortex GPU / Gemmini', id: 'vortex-gpu' },
    },
    actions: [
      { label: 'GPUs Explorer', kind: 'view', targetId: 'gpus' },
      { label: 'AI Accelerators', kind: 'view', targetId: 'ai-accelerators' },
      { label: 'Systolic Array Explainer', kind: 'explainer', targetId: 'systolic-gemmini' },
      { label: 'GPU Warp Explainer', kind: 'explainer', targetId: 'gpu-warp-simt' },
    ],
  },
  {
    id: 'common-closure',
    title: 'Randomization, Coverage & Closure',
    subtitle: 'Common Signoff Methodology',
    metric: 'SV Constraints ↔ UVM Cov ↔ STA ↔ 100% Audit',
    description:
      'End-to-end signoff discipline bridging constrained-random stimulus, functional covergroups, static timing analysis (MMMC STA), and 16-checkpoint specification completeness.',
    row: 'bottom',
    colIdx: 3,
    connectedSectionIds: ['sec-rtl', 'sec-sv', 'sec-uvm', 'sec-socs'],
    connectedNodeIds: [
      'sub-rtl-arb',
      'sub-sv-rand',
      'sub-uvm-core',
      'sub-soc-audit',
    ],
    crosswalk: {
      protocol: { label: 'CTS & STA Signoff', id: 'cts-sta-timing' },
      rtl: { label: 'STA & Timing Closure', id: 'rtl-sta-closure' },
      sv: { label: 'Constrained Random & Cov', id: 'sv-constrained-random' },
      uvm: { label: 'Coverage Subscribers', id: 'uvm-coverage' },
      ip: { label: 'CVA6 & CORE-V Verif', id: 'cva6' },
    },
    actions: [
      { label: 'Completeness Audit (100%)', kind: 'view', targetId: 'completeness-dashboard' },
      { label: 'STA Timing Closure', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-sta-closure' },
      { label: 'SV Constrained Random', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-constrained-random' },
      { label: '16-Domain Atlas', kind: 'view', targetId: 'master-architecture' },
    ],
  },
];

interface SubBranchBlueprint {
  id: string;
  sectionId: string;
  slot: number; // 0..3 within section
  title: string;
  subtitle: string;
  metric: string;
  description: string;
  actions: JumpAction[];
}

const SUB_BRANCHES: SubBranchBlueprint[] = [
  // Section 01: Protocols
  {
    id: 'sub-proto-amba',
    sectionId: 'sec-protocols',
    slot: 0,
    title: 'AMBA & On-Chip Buses',
    subtitle: 'AXI4/5, AHB5, APB, TileLink, OBI',
    metric: `${PROTOCOL_CATEGORIES[0].protocolIds.length + PROTOCOL_CATEGORIES[1].protocolIds.length} Specs`,
    description:
      'Core SoC interconnect protocols covering valid/ready 5-channel AXI4, low-power APB, Wishbone B4, PULP AXI, and OpenTitan TL-UL.',
    actions: [
      { label: 'Explore AXI4 Spec', kind: 'protocol', targetId: 'axi4' },
      { label: 'Explore TL-UL Spec', kind: 'protocol', targetId: 'tl-ul' },
      { label: 'Protocol Compare Matrix', kind: 'view', targetId: 'compare' },
    ],
  },
  {
    id: 'sub-proto-hs',
    sectionId: 'sec-protocols',
    slot: 1,
    title: 'High-Speed, Memory & PHYs',
    subtitle: 'PCIe Gen5–7, CXL, DDR5, HBM3, UCIe',
    metric: 'PCIe · Memory · Chiplets',
    description:
      'Packetized SerDes fabrics, TLP/DLLP/LTSSM internals, JEDEC DRAM & DFI PHY calibration, and UCIe/BoW die-to-die interconnects.',
    actions: [
      { label: 'PCIe Gen5 Spec', kind: 'protocol', targetId: 'pcie-gen5' },
      { label: 'DDR5 Spec', kind: 'protocol', targetId: 'ddr5' },
      { label: 'UCIe Chiplet Spec', kind: 'protocol', targetId: 'ucie' },
    ],
  },
  {
    id: 'sub-proto-io',
    sectionId: 'sec-protocols',
    slot: 2,
    title: 'Peripherals, USB, Eth & MIPI',
    subtitle: 'SPI, I2C, I3C, USB4, 800G Eth, CSI-2',
    metric: 'Board · Camera · Network',
    description:
      'Board-level serial control buses, Type-C/USB4, IEEE 802.3 Ethernet MAC/PHY reconciliation layers, audio links, and MIPI CSI/DSI.',
    actions: [
      { label: 'I3C Spec', kind: 'protocol', targetId: 'i3c' },
      { label: '100G Ethernet Spec', kind: 'protocol', targetId: 'eth-100g' },
      { label: 'MIPI CSI-2 Spec', kind: 'protocol', targetId: 'mipi-csi-2' },
    ],
  },
  {
    id: 'sub-proto-arch',
    sectionId: 'sec-protocols',
    slot: 3,
    title: 'Coherency, DFT, Safety & 3D',
    subtitle: 'CHI, MESI, JTAG, ISO 26262, CoWoS',
    metric: 'Coherence · Test · Pack',
    description:
      'Snooping/directory coherency models, IEEE 1149/1687 DFT scan & BIST, CDC architectures, ISO 26262 lockstep safety, and 2.5D/3D packaging.',
    actions: [
      { label: 'AMBA CHI Spec', kind: 'protocol', targetId: 'chi' },
      { label: 'JTAG IEEE 1149.1', kind: 'protocol', targetId: 'jtag' },
      { label: '2.5D/3D Interposers', kind: 'protocol', targetId: 'interposer-25d-3d-ic' },
    ],
  },

  // Section 02: RTL Design
  {
    id: 'sub-rtl-synth',
    sectionId: 'sec-rtl',
    slot: 0,
    title: 'Core Synthesis Semantics',
    subtitle: 'always_comb, always_ff, Latches',
    metric: 'Modules 1.1 – 1.3',
    description:
      'Zero-mismatch combinational vs edge-triggered flip-flop coding rules, blocking (=) vs non-blocking (<=) scheduling, and unintentional latch prevention.',
    actions: [
      { label: '1.1 Comb vs Seq Logic', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-comb-seq' },
      { label: '1.2 Blocking vs NBA', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-blocking-nba' },
    ],
  },
  {
    id: 'sub-rtl-fsm',
    sectionId: 'sec-rtl',
    slot: 1,
    title: 'Safe FSMs & Datapath Control',
    subtitle: 'Moore/Mealy, One-Hot, Resets',
    metric: 'Modules 2.1 – 2.3',
    description:
      '2-process SystemVerilog FSMs, reachable default recovery states, synchronous vs async reset bridges, and arithmetic width/overflow safety.',
    actions: [
      { label: '2.1 Reset Strategies', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-reset-strategies' },
      { label: '2.2 FSM Design Patterns', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-fsm-design' },
    ],
  },
  {
    id: 'sub-rtl-pipe',
    sectionId: 'sec-rtl',
    slot: 2,
    title: 'Pipelining & Skid Buffers',
    subtitle: 'Valid/Ready Forward & Reverse Cuts',
    metric: 'Modules 3.1 – 3.3',
    description:
      'Cutting combinational ready-paths with elastic skid buffers, breaking long datapaths into retimed pipeline stages, and preventing bubble stalls.',
    actions: [
      { label: 'Skid Buffers & Backpressure', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-skid-buffer' },
      { label: 'Pipelining & Retiming', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-pipelining' },
    ],
  },
  {
    id: 'sub-rtl-cdc',
    sectionId: 'sec-rtl',
    slot: 3,
    title: 'CDC, Async FIFOs, Arbiters & STA',
    subtitle: '2-FF, Gray FIFO, ICG, Timing Closure',
    metric: 'Modules 4.1 – 5.4',
    description:
      'Metastability MTBF, Gray-coded async FIFOs, round-robin arbitration, SRAM modeling, integrated clock gating (ICG), and setup/hold timing closure.',
    actions: [
      { label: 'CDC & Async FIFOs', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-cdc-fifo' },
      { label: 'Arbiters & Priority', kind: 'curriculum', pillar: 'rtl-design', targetId: 'rtl-arbiters' },
      { label: 'Open CDC Analyzer', kind: 'view', targetId: 'cdc-analyzer' },
    ],
  },

  // Section 03: SystemVerilog
  {
    id: 'sub-sv-types',
    sectionId: 'sec-sv',
    slot: 0,
    title: 'Types, Structs & Interfaces',
    subtitle: 'logic vs bit, Packed, Modports',
    metric: 'Modules 1.1 – 2.2',
    description:
      'Eliminating X-optimism with 4-state logic vs 2-state bit, packed structs, dynamic queues/associative arrays, and synthesizable SV interfaces with modports.',
    actions: [
      { label: '2-State vs 4-State Types', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-data-types' },
      { label: 'Interfaces & Modports', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-interfaces-modports' },
    ],
  },
  {
    id: 'sub-sv-rand',
    sectionId: 'sec-sv',
    slot: 1,
    title: 'OOP, Randomization & Coverage',
    subtitle: 'Classes, Constraints, Covergroups',
    metric: 'Modules 3.1 – 3.4',
    description:
      'Parameterized SV classes, inheritance/polymorphism, solver constraints (dist, solve..before), and cross-product functional covergroups.',
    actions: [
      { label: 'OOP & Virtual Classes', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-oop-classes' },
      { label: 'Constrained Randomization', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-constrained-random' },
      { label: 'Functional Covergroups', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-covergroups' },
    ],
  },
  {
    id: 'sub-sv-sva',
    sectionId: 'sec-sv',
    slot: 2,
    title: 'Clocking Blocks & SVA',
    subtitle: 'Race-Free Sampling & Temporal Logic',
    metric: 'Modules 4.1 – 4.3',
    description:
      'Preponed/Observed event sampling via clocking blocks and concurrent SystemVerilog Assertions (`|->`, `|=>`, sequences, `$rose`, `$stable`).',
    actions: [
      { label: 'Clocking Blocks', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-clocking-blocks' },
      { label: 'Concurrent SVA', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-sva-assertions' },
    ],
  },
  {
    id: 'sub-sv-sched',
    sectionId: 'sec-sv',
    slot: 3,
    title: 'Scheduling Regions & DPI-C',
    subtitle: 'Event Regions, fork/join, C Bridge',
    metric: 'Modules 5.1 – 5.3',
    description:
      'IEEE 1800 stratified event queue (Active, Inactive, NBA, Observed, Reactive), multi-threaded `fork/join_any` IPC, and DPI-C C/C++ golden models.',
    actions: [
      { label: 'Open SystemVerilog Studio', kind: 'curriculum', pillar: 'systemverilog', targetId: 'sv-event-scheduling' },
    ],
  },

  // Section 04: UVM & Verification
  {
    id: 'sub-uvm-core',
    sectionId: 'sec-uvm',
    slot: 0,
    title: 'UVM Factory, Phasing & Config',
    subtitle: 'Hierarchy, Objections, config_db',
    metric: 'Modules 1.1 – 2.2',
    description:
      'Base class hierarchy (`uvm_object` vs `uvm_component`), factory type/instance overrides, build/connect/run phases, objections, and scoped `uvm_config_db`.',
    actions: [
      { label: 'UVM Hierarchy & Factory', kind: 'curriculum', pillar: 'uvm-methodology', targetId: 'uvm-hierarchy-factory' },
      { label: 'Phasing & Objections', kind: 'curriculum', pillar: 'uvm-methodology', targetId: 'uvm-phasing-objections' },
    ],
  },
  {
    id: 'sub-uvm-agents',
    sectionId: 'sec-uvm',
    slot: 1,
    title: 'Sequences, Drivers, TLM & RAL',
    subtitle: 'Agents, Scoreboards, Register Model',
    metric: 'Modules 2.3 – 4.3',
    description:
      'Seq_item transactions, virtual sequences, active/passive drivers & monitors, TLM analysis ports/FIFOs, out-of-order scoreboards, and UVM RAL.',
    actions: [
      { label: 'Drivers & Monitors', kind: 'curriculum', pillar: 'uvm-methodology', targetId: 'uvm-driver-monitor' },
      { label: 'TLM & Scoreboards', kind: 'curriculum', pillar: 'uvm-methodology', targetId: 'uvm-tlm-scoreboard' },
      { label: 'UVM RAL Module', kind: 'curriculum', pillar: 'uvm-methodology', targetId: 'uvm-ral' },
    ],
  },
  {
    id: 'sub-uvm-labs',
    sectionId: 'sec-uvm',
    slot: 2,
    title: 'Waveform & Compliance Studios',
    subtitle: 'Cycle-Accurate Traces & Rule Linter',
    metric: 'Interactive Labs',
    description:
      'Step clock-by-clock through live AXI4/Stream/APB/SPI/I2C/UART waveforms, inject backpressure stalls, and run automated protocol rule checks.',
    actions: [
      { label: 'Open Waveform Lab', kind: 'view', targetId: 'simulator' },
      { label: 'Open Compliance Checker', kind: 'view', targetId: 'checker' },
    ],
  },
  {
    id: 'sub-uvm-hub',
    sectionId: 'sec-uvm',
    slot: 3,
    title: 'Verification Hub & UVM Generator',
    subtitle: 'Upstream DVSim & Live SV Emitter',
    metric: 'Core Verification Flows',
    description:
      'Inspect real OpenTitan/Ibex DVSim verification harnesses and synthesize ready-to-compile SystemVerilog interfaces, UVM monitors, and SVA checks.',
    actions: [
      { label: 'Open Verification Hub', kind: 'view', targetId: 'verification-hub' },
      { label: 'Open UVM & SVA Gen', kind: 'view', targetId: 'uvm' },
    ],
  },

  // Section 05: Silicon IPs
  {
    id: 'sub-ip-cpu',
    sectionId: 'sec-ips',
    slot: 0,
    title: 'Processors & CPU Cores',
    subtitle: 'Ibex, CVA6, Rocket, BOOM, VexRiscv',
    metric: 'RISC-V & Compute CPUs',
    description:
      'Embedded 2-stage RV32IMC cores through Linux-capable 64-bit out-of-order superscalar processors with CSRs, MMUs, and debug modules.',
    actions: [
      { label: 'Processors Explorer', kind: 'view', targetId: 'processors' },
      { label: 'Inspect Ibex IP', kind: 'ip', targetId: 'ibex' },
      { label: 'Inspect CVA6 IP', kind: 'ip', targetId: 'cva6' },
      { label: 'Compare IPs', kind: 'view', targetId: 'ip-compare' },
    ],
  },
  {
    id: 'sub-ip-gpu',
    sectionId: 'sec-ips',
    slot: 1,
    title: 'GPUs & AI/ML Accelerators',
    subtitle: 'Vortex, MIAOW, Gemmini, NVDLA',
    metric: 'SIMT & Systolic Hardware',
    description:
      'SIMT GPGPU warp schedulers, tensor systolic arrays, DLA convolution pipelines, and shared scratchpad/HBM memory engines.',
    actions: [
      { label: 'GPU Explorer', kind: 'view', targetId: 'gpus' },
      { label: 'AI Accelerators', kind: 'view', targetId: 'ai-accelerators' },
      { label: 'Inspect Vortex GPU', kind: 'ip', targetId: 'vortex-gpu' },
      { label: 'Inspect Gemmini', kind: 'ip', targetId: 'gemmini' },
    ],
  },
  {
    id: 'sub-ip-sec',
    sectionId: 'sec-ips',
    slot: 2,
    title: 'Security IPs & 7-Chapter AES Lab',
    subtitle: 'OpenTitan AES, HMAC, KMAC, OTBN',
    metric: 'Root of Trust RTL',
    description:
      'Constant-time masked AES, SHA/HMAC, Keccak/KMAC, entropy sources, and the 7-chapter interactive AES S-box/MixColumns deep-dive lab.',
    actions: [
      { label: '7-Chapter AES Deep Dive', kind: 'view', targetId: 'aes-deep-dive' },
      { label: 'Inspect OpenTitan AES', kind: 'ip', targetId: 'opentitan-aes' },
      { label: 'Inspect OpenTitan HMAC', kind: 'ip', targetId: 'opentitan-hmac' },
    ],
  },
  {
    id: 'sub-ip-noc',
    sectionId: 'sec-ips',
    slot: 3,
    title: 'Interconnect, DRAM & Peripheral IPs',
    subtitle: 'LiteDRAM, PULP AXI, TL-UL Xbar',
    metric: 'Fabric & Memory Controllers',
    description:
      'Synthesizable AXI4 crossbars, TileLink integrity switches, SDRAM/DDR5 controllers, and open-source SPI/UART/GPIO controller cores.',
    actions: [
      { label: 'Browse All 37 IPs', kind: 'view', targetId: 'ip-universe' },
      { label: 'Inspect PULP AXI', kind: 'ip', targetId: 'pulp-axi' },
      { label: 'Inspect LiteDRAM', kind: 'ip', targetId: 'litedram' },
    ],
  },

  // Section 06: SoCs, Explainers & Atlases
  {
    id: 'sub-soc-exp',
    sectionId: 'sec-socs',
    slot: 0,
    title: 'SoC Explorer & Bus Fabric Map',
    subtitle: 'EarlGrey, Chipyard, PULPissimo',
    metric: `${ALL_SOCS.length} SoC Topologies`,
    description:
      'Interactive multi-subsystem SoC schematics tracing documented RTL connections vs inferred architectural links across CPUs, NoCs, and peripherals.',
    actions: [
      { label: 'Open SoC Explorer', kind: 'view', targetId: 'soc-explorer' },
      { label: 'Open Bus Fabric Map', kind: 'view', targetId: 'soc-map' },
    ],
  },
  {
    id: 'sub-soc-studio',
    sectionId: 'sec-socs',
    slot: 1,
    title: 'Explainer Studio & Glossary',
    subtitle: 'Visual First-Principles Learning',
    metric: `${ALL_EXPLAINER_TOPICS.length} Explainers · ${GLOSSARY_TERMS.length} Terms`,
    description:
      'Step-by-step animated engineering explainers for every protocol, IP, CPU pipeline, systolic array, and GPU warp, paired with a searchable VLSI glossary.',
    actions: [
      { label: 'Open Explainer Studio', kind: 'view', targetId: 'explainer' },
      { label: 'Open Glossary', kind: 'view', targetId: 'glossary' },
    ],
  },
  {
    id: 'sub-soc-map',
    sectionId: 'sec-socs',
    slot: 2,
    title: '16-Domain Atlas & Knowledge Graph',
    subtitle: 'Entity Taxonomy & Multi-Hop Engine',
    metric: '16 Domains · Graph Query',
    description:
      'Strict taxonomy separating Communication Protocols, Hardware Architectures, and Standards alongside a live multi-hop semiconductor knowledge graph.',
    actions: [
      { label: 'Open Knowledge Graph', kind: 'kg', targetId: 'ip:ibex' },
      { label: 'Open 16-Domain Atlas', kind: 'view', targetId: 'master-architecture' },
    ],
  },
  {
    id: 'sub-soc-audit',
    sectionId: 'sec-socs',
    slot: 3,
    title: 'RTL Source, CDC, Repo & Audit',
    subtitle: 'Ingest SV, Audit 100% Checkpoints',
    metric: '100% Verified · Guide',
    description:
      'Inspect live RTL module trees, ingest custom `.sv` files into the graph, verify 16-checkpoint documentation completeness, or browse the Platform Guide.',
    actions: [
      { label: 'Open RTL Explorer', kind: 'view', targetId: 'rtl-explorer' },
      { label: '100% Completeness Audit', kind: 'view', targetId: 'completeness-dashboard' },
      { label: 'Ingest RTL Repository', kind: 'view', targetId: 'repo-ingestion' },
      { label: 'Platform Guide', kind: 'view', targetId: 'guide' },
    ],
  },
];

export const MindMapView: React.FC<MindMapViewProps> = ({
  onNavigate,
  onSelectProtocol,
  onSelectIp,
  onOpenCurriculum,
  onOpenExplainer,
  onOpenKnowledgeGraph,
}) => {
  const [mode, setMode] = useState<MindMapMode>('merged');
  const [sectionFocus, setSectionFocus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('root-atlas');

  const { nodes, edges, bounds } = useMemo<{
    nodes: MindMapNode[];
    edges: MindMapEdge[];
    bounds: { minX: number; minY: number; width: number; height: number };
  }>(() => {
    const outNodes: MindMapNode[] = [];
    const outEdges: MindMapEdge[] = [];

    if (mode === 'common') {
      // Focused Common Crosswalk Graph: Sections on Left & Right, Common Bridges down Center Spine
      const leftSections = SECTION_META.filter((s) => s.side === 'left');
      const rightSections = SECTION_META.filter((s) => s.side === 'right');

      leftSections.forEach((sec, idx) => {
        outNodes.push({
          id: sec.id,
          kind: 'section',
          sectionId: sec.id,
          title: `${sec.number}. ${sec.shortTitle}`,
          subtitle: sec.title,
          metric: sec.metric,
          description: sec.description,
          color: sec.color,
          x: 60,
          y: 120 + idx * 240,
          width: 260,
          height: 82,
          side: 'left',
          connectedSectionIds: [sec.id],
          connectedNodeIds: COMMON_BRIDGES.filter((c) => c.connectedSectionIds.includes(sec.id)).map((c) => c.id),
          actions: [{ label: `Open ${sec.shortTitle}`, kind: 'view', targetId: sec.viewTarget }],
        });
      });

      rightSections.forEach((sec, idx) => {
        outNodes.push({
          id: sec.id,
          kind: 'section',
          sectionId: sec.id,
          title: `${sec.number}. ${sec.shortTitle}`,
          subtitle: sec.title,
          metric: sec.metric,
          description: sec.description,
          color: sec.color,
          x: 1120,
          y: 120 + idx * 240,
          width: 260,
          height: 82,
          side: 'right',
          connectedSectionIds: [sec.id],
          connectedNodeIds: COMMON_BRIDGES.filter((c) => c.connectedSectionIds.includes(sec.id)).map((c) => c.id),
          actions: [{ label: `Open ${sec.shortTitle}`, kind: 'view', targetId: sec.viewTarget }],
        });
      });

      COMMON_BRIDGES.forEach((c, idx) => {
        const col = idx < 4 ? 0 : 1;
        const row = idx % 4;
        const cx = col === 0 ? 450 : 750;
        const cy = 65 + row * 180;
        outNodes.push({
          id: c.id,
          kind: 'common',
          title: c.title,
          subtitle: c.subtitle,
          metric: c.metric,
          description: c.description,
          color: '#0ea5e9',
          x: cx,
          y: cy,
          width: 245,
          height: 74,
          side: 'center',
          connectedSectionIds: c.connectedSectionIds,
          connectedNodeIds: [...c.connectedSectionIds],
          actions: c.actions,
        });

        c.connectedSectionIds.forEach((secId) => {
          outEdges.push({
            id: `cm-edge-${c.id}-${secId}`,
            from: c.id,
            to: secId,
            kind: 'common-bridge',
            color: '#0ea5e9',
          });
        });
      });

      return {
        nodes: outNodes,
        edges: outEdges,
        bounds: { minX: 10, minY: 15, width: 1420, height: 800 },
      };
    }

    // Both 'sections' and 'merged' share the balanced bilateral Mind Map architecture
    const includeCommon = mode === 'merged';
    const rootX = 835;
    const rootY = 550;
    const rootW = 250;
    const rootH = 82;

    outNodes.push({
      id: 'root-atlas',
      kind: 'root',
      title: 'VLSI Protocol Atlas',
      subtitle: includeCommon ? 'Merged Architecture Mind Map' : 'All Platform Sections Tree',
      metric: `${ALL_PROTOCOLS.length} Specs · ${ALL_IPS.length} IPs · 42 Modules`,
      description:
        'Master architectural map uniting Protocol Specifications, RTL Design Engineering, SystemVerilog, UVM Methodology, Open-Source Silicon IPs, and SoC / Explainer Studios.',
      color: '#06b6d4',
      x: rootX,
      y: rootY,
      width: rootW,
      height: rootH,
      side: 'center',
      connectedSectionIds: SECTION_META.map((s) => s.id),
      connectedNodeIds: [
        ...SECTION_META.map((s) => s.id),
        ...(includeCommon ? COMMON_BRIDGES.map((c) => c.id) : []),
      ],
      actions: [
        { label: 'Home Hub', kind: 'view', targetId: 'home' },
        { label: 'Platform Guide', kind: 'view', targetId: 'guide' },
        { label: '16-Domain Atlas', kind: 'view', targetId: 'master-architecture' },
        { label: 'Knowledge Graph', kind: 'kg', targetId: 'ip:ibex' },
      ],
    });

    // Ring 1: 6 Core Platform Sections
    SECTION_META.forEach((sec) => {
      const secX = sec.side === 'left' ? 500 : 1200;
      const secW = 225;
      const secH = 72;
      const childBranches = SUB_BRANCHES.filter((b) => b.sectionId === sec.id);
      const linkedCommon = includeCommon
        ? COMMON_BRIDGES.filter((c) => c.connectedSectionIds.includes(sec.id)).map((c) => c.id)
        : [];

      outNodes.push({
        id: sec.id,
        kind: 'section',
        sectionId: sec.id,
        title: `${sec.number}. ${sec.shortTitle}`,
        subtitle: sec.title,
        metric: sec.metric,
        description: sec.description,
        color: sec.color,
        x: secX,
        y: sec.hubY,
        width: secW,
        height: secH,
        side: sec.side,
        connectedSectionIds: [sec.id],
        connectedNodeIds: ['root-atlas', ...childBranches.map((b) => b.id), ...linkedCommon],
        actions: [{ label: `Open ${sec.shortTitle}`, kind: 'view', targetId: sec.viewTarget }],
      });

      outEdges.push({
        id: `root-to-${sec.id}`,
        from: 'root-atlas',
        to: sec.id,
        kind: 'hierarchy',
        color: sec.color,
      });
    });

    // Ring 2: 24 Sub-Section Leaves (4 per section)
    const sectionSlotTops: Record<string, number[]> = {
      'sec-protocols': [128, 200, 272, 344],
      'sec-rtl': [442, 514, 586, 658],
      'sec-sv': [756, 828, 900, 972],
      'sec-uvm': [128, 200, 272, 344],
      'sec-ips': [442, 514, 586, 658],
      'sec-socs': [756, 828, 900, 972],
    };

    SUB_BRANCHES.forEach((sub) => {
      const parentSec = SECTION_META.find((s) => s.id === sub.sectionId)!;
      const isLeft = parentSec.side === 'left';
      const leafX = isLeft ? 50 : 1555;
      const leafY = sectionSlotTops[sub.sectionId][sub.slot];
      const leafW = 315;
      const leafH = 60;
      const linkedCommon = includeCommon
        ? COMMON_BRIDGES.filter((c) => c.connectedNodeIds.includes(sub.id)).map((c) => c.id)
        : [];

      outNodes.push({
        id: sub.id,
        kind: 'subsection',
        sectionId: sub.sectionId,
        title: sub.title,
        subtitle: sub.subtitle,
        metric: sub.metric,
        description: sub.description,
        color: parentSec.color,
        x: leafX,
        y: leafY,
        width: leafW,
        height: leafH,
        side: parentSec.side,
        connectedSectionIds: [sub.sectionId],
        connectedNodeIds: [sub.sectionId, ...linkedCommon],
        actions: sub.actions,
      });

      outEdges.push({
        id: `sec-to-${sub.id}`,
        from: sub.sectionId,
        to: sub.id,
        kind: 'branch',
        color: parentSec.color,
      });
    });

    // Common Cross-Cutting Bridges (only in Merged mode)
    if (includeCommon) {
      const colXs = [430, 700, 1005, 1275];
      COMMON_BRIDGES.forEach((c) => {
        const cx = colXs[c.colIdx];
        const cy = c.row === 'top' ? 32 : 1082;
        outNodes.push({
          id: c.id,
          kind: 'common',
          title: c.title,
          subtitle: c.subtitle,
          metric: c.metric,
          description: c.description,
          color: '#0ea5e9',
          x: cx,
          y: cy,
          width: 215,
          height: 58,
          side: 'center',
          connectedSectionIds: c.connectedSectionIds,
          connectedNodeIds: [...c.connectedSectionIds, ...c.connectedNodeIds],
          actions: c.actions,
        });

        c.connectedSectionIds.forEach((secId) => {
          outEdges.push({
            id: `bridge-${c.id}-${secId}`,
            from: c.id,
            to: secId,
            kind: 'common-bridge',
            color: '#0ea5e9',
          });
        });
      });
    }

    return {
      nodes: outNodes,
      edges: outEdges,
      bounds: includeCommon
        ? { minX: 12, minY: 0, width: 1896, height: 1170 }
        : { minX: 12, minY: 90, width: 1896, height: 975 },
    };
  }, [mode]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const selectedNode = useMemo(() => {
    if (nodeMap.has(selectedNodeId)) return nodeMap.get(selectedNodeId)!;
    return nodes[0] || null;
  }, [nodeMap, nodes, selectedNodeId]);

  const queryLower = searchQuery.trim().toLowerCase();

  const matchingNodeIds = useMemo(() => {
    const matched = new Set<string>();
    nodes.forEach((n) => {
      const secMatch =
        sectionFocus === 'all' ||
        n.id === 'root-atlas' ||
        n.sectionId === sectionFocus ||
        n.connectedSectionIds.includes(sectionFocus);
      const qMatch =
        !queryLower ||
        n.title.toLowerCase().includes(queryLower) ||
        n.subtitle.toLowerCase().includes(queryLower) ||
        n.description.toLowerCase().includes(queryLower) ||
        n.metric.toLowerCase().includes(queryLower);
      if (secMatch && qMatch) matched.add(n.id);
    });
    return matched;
  }, [nodes, sectionFocus, queryLower]);

  const activeNeighborhood = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNode) return set;
    set.add(selectedNode.id);
    selectedNode.connectedNodeIds.forEach((id) => set.add(id));
    selectedNode.connectedSectionIds.forEach((id) => set.add(id));
    return set;
  }, [selectedNode]);

  const runJumpAction = (act: JumpAction) => {
    if (act.kind === 'view') onNavigate(act.targetId as AppView);
    else if (act.kind === 'protocol') onSelectProtocol(act.targetId);
    else if (act.kind === 'ip') onSelectIp(act.targetId);
    else if (act.kind === 'curriculum' && act.pillar) onOpenCurriculum(act.pillar, act.targetId);
    else if (act.kind === 'explainer') onOpenExplainer(act.targetId);
    else if (act.kind === 'kg') onOpenKnowledgeGraph(act.targetId);
  };

  const minimapItems = useMemo<MiniMapBlockItem[]>(
    () =>
      nodes.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        color: n.color,
        active: selectedNode?.id === n.id,
      })),
    [nodes, selectedNode]
  );

  const minimapLinks = useMemo<MiniMapLinkItem[]>(
    () =>
      edges
        .filter((e) => e.kind !== 'common-bridge' || selectedNode?.id === e.from)
        .map((e) => {
          const a = nodeMap.get(e.from);
          const b = nodeMap.get(e.to);
          if (!a || !b) return null;
          return {
            x1: a.x + a.width / 2,
            y1: a.y + a.height / 2,
            x2: b.x + b.width / 2,
            y2: b.y + b.height / 2,
          };
        })
        .filter((x): x is MiniMapLinkItem => Boolean(x)),
    [edges, nodeMap, selectedNode]
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Clean Page Header */}
      <header className="border-b border-[var(--border-subtle)] pb-6 flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--sem-control)]">Unified Platform Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Sections</span>
            <span aria-hidden="true">·</span>
            <span>Common Bridges</span>
            <span aria-hidden="true">·</span>
            <span>Merged Topology</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
            Complete VLSI Atlas Mind Map
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Navigate every platform section, explore the 8 cross-cutting engineering foundations shared in common across protocols, RTL, SystemVerilog, UVM, and Silicon IPs, or inspect everything merged in one interactive CAD map.
          </p>
        </div>

        {/* Mode Switcher: Merged vs Sections vs Common */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div
            role="group"
            aria-label="Mind map view mode"
            className="inline-flex items-center p-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs"
          >
            {(
              [
                { id: 'merged', label: 'Merged (All + Common)' },
                { id: 'sections', label: 'All Sections (6)' },
                { id: 'common', label: 'Common Bridges (8)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setSelectedNodeId(tab.id === 'common' ? COMMON_BRIDGES[0].id : 'root-atlas');
                }}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  mode === tab.id
                    ? 'bg-[var(--sem-control)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSectionFocus('all')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors ${
              sectionFocus === 'all'
                ? 'bg-[var(--bg-elevated)] border border-[var(--sem-control)] text-[var(--text-primary)]'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Pillars
          </button>
          {SECTION_META.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setSectionFocus(sec.id);
                setSelectedNodeId(sec.id);
              }}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors ${
                sectionFocus === sec.id
                  ? 'bg-[var(--bg-elevated)] border border-[var(--sem-control)] text-[var(--text-primary)]'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {sec.number}. {sec.shortTitle}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter branches (AXI4, CDC, UVM, AES)..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--sem-control)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear filter"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Zone Interactive Mind Map Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Main Zone: Infinite-Mesh Interactive Mind Map Canvas + Mini-Map */}
        <div className="lg:col-span-8 xl:col-span-9">
          <InfiniteMeshViewport
            bounds={bounds}
            title={
              mode === 'merged'
                ? `Merged Architectural Mind Map (${SECTION_META.length} Sections · ${SUB_BRANCHES.length} Sub-Branches · ${COMMON_BRIDGES.length} Common Bridges)`
                : mode === 'sections'
                ? `Platform Sections Hierarchy (${SECTION_META.length} Sections · ${SUB_BRANCHES.length} Sub-Branches)`
                : `Common Engineering Foundations Crosswalk (${COMMON_BRIDGES.length} Shared Bridges ↔ ${SECTION_META.length} Sections)`
            }
            subtitle="Pan, zoom, use the bottom-right mini-map to jump anywhere, and click any node to inspect cross-links"
            minHeightClass="h-[520px] sm:h-[600px]"
            showMiniMap={true}
            minimapItems={minimapItems}
            minimapLinks={minimapLinks}
            legend={
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" /> Protocols
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> RTL
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-violet-500" /> SV 1800
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> UVM
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Silicon IPs
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> SoCs &amp; Studios
                </span>
                {mode !== 'sections' && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-sky-500" /> Common Bridge
                  </span>
                )}
              </>
            }
          >
            {/* Edges: Hierarchy, Sub-Branches & Common Bridges */}
            {edges.map((edge) => {
              const a = nodeMap.get(edge.from);
              const b = nodeMap.get(edge.to);
              if (!a || !b) return null;

              const isCommonBridge = edge.kind === 'common-bridge';
              const isRelatedToSelected =
                selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);

              // Keep non-selected common bridge lines unobtrusive in Merged mode so the tree reads cleanly
              if (mode === 'merged' && isCommonBridge && !isRelatedToSelected && sectionFocus === 'all') {
                return (
                  <line
                    key={edge.id}
                    x1={a.x + a.width / 2}
                    y1={a.y + a.height / 2}
                    x2={b.x + b.width / 2}
                    y2={b.y + b.height / 2}
                    stroke="#0ea5e9"
                    strokeOpacity={0.14}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );
              }

              const acx = a.x + a.width / 2;
              const acy = a.y + a.height / 2;
              const bcx = b.x + b.width / 2;
              const bcy = b.y + b.height / 2;

              let x1 = acx;
              let y1 = acy;
              let x2 = bcx;
              let y2 = bcy;
              let cx1 = acx;
              let cy1 = acy;
              let cx2 = bcx;
              let cy2 = bcy;

              if (isCommonBridge && mode === 'merged') {
                y1 = a.y < 500 ? a.y + a.height : a.y;
                y2 = a.y < 500 ? b.y : b.y + b.height;
                cx1 = x1;
                cy1 = (y1 + y2) / 2;
                cx2 = x2;
                cy2 = (y1 + y2) / 2;
              } else {
                const goRight = bcx >= acx;
                x1 = goRight ? a.x + a.width : a.x;
                x2 = goRight ? b.x : b.x + b.width;
                cx1 = x1 + (x2 - x1) * 0.48;
                cy1 = y1;
                cx2 = x2 - (x2 - x1) * 0.48;
                cy2 = y2;
              }

              const highlighted =
                isRelatedToSelected ||
                (sectionFocus !== 'all' &&
                  (edge.from === sectionFocus || edge.to === sectionFocus || activeNeighborhood.has(edge.from)));
              const opacity =
                selectedNode && selectedNode.id !== 'root-atlas'
                  ? highlighted
                    ? 0.95
                    : 0.18
                  : 0.72;

              return (
                <g key={edge.id} opacity={opacity} className="svg-glide">
                  <path
                    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={edge.color}
                    strokeWidth={highlighted ? 2.4 : edge.kind === 'hierarchy' ? 2.0 : 1.4}
                    strokeDasharray={isCommonBridge ? '6 4' : undefined}
                  />
                  {highlighted && (
                    <path
                      d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity={0.35}
                      strokeWidth={1.2}
                      className="schematic-flow-active"
                    />
                  )}
                </g>
              );
            })}

            {/* Mind Map Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isNeighbor = activeNeighborhood.has(node.id);
              const matchesFilter = matchingNodeIds.has(node.id);
              const dimmedBySelect =
                selectedNode &&
                selectedNode.id !== 'root-atlas' &&
                !isSelected &&
                !isNeighbor;
              const nodeOpacity = !matchesFilter ? 0.18 : dimmedBySelect ? 0.34 : 1;

              const isRoot = node.kind === 'root';
              const isCommon = node.kind === 'common';
              const headerH = isRoot ? 20 : 18;

              return (
                <g
                  key={node.id}
                  opacity={nodeOpacity}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer svg-glide"
                >
                  {isSelected && (
                    <rect
                      x={node.x - 4}
                      y={node.y - 4}
                      width={node.width + 8}
                      height={node.height + 8}
                      rx={12}
                      fill="none"
                      stroke={node.color}
                      strokeWidth={1.4}
                      strokeDasharray="4 3"
                    />
                  )}

                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx={isRoot ? 12 : 8}
                    fill={isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)'}
                    stroke={node.color}
                    strokeWidth={isSelected ? 2.4 : isRoot ? 2 : 1.45}
                    strokeDasharray={isCommon ? '5 2' : undefined}
                  />

                  <path
                    d={`M ${node.x + 8} ${node.y} H ${node.x + node.width - 8} Q ${node.x + node.width} ${node.y} ${node.x + node.width} ${node.y + 8} V ${node.y + headerH} H ${node.x} V ${node.y + 8} Q ${node.x} ${node.y} ${node.x + 8} ${node.y} Z`}
                    fill={node.color}
                    fillOpacity={isSelected ? 0.24 : 0.14}
                  />
                  <line
                    x1={node.x}
                    y1={node.y + headerH}
                    x2={node.x + node.width}
                    y2={node.y + headerH}
                    stroke={node.color}
                    strokeOpacity={0.35}
                    strokeWidth={1}
                  />

                  <text
                    x={node.x + 10}
                    y={node.y + 12.5}
                    className="font-mono text-[8.5px] font-semibold"
                    fill={node.color}
                  >
                    {node.metric}
                  </text>

                  <text
                    x={node.x + 10}
                    y={node.y + (isRoot ? 44 : 36)}
                    className={`font-display font-semibold ${isRoot ? 'text-[14px]' : 'text-[12px]'}`}
                    fill="var(--text-primary)"
                  >
                    {node.title.length > 30 ? `${node.title.slice(0, 28)}..` : node.title}
                  </text>

                  <text
                    x={node.x + 10}
                    y={node.y + (isRoot ? 63 : 51)}
                    className="text-[10px]"
                    fill="var(--text-secondary)"
                  >
                    {node.subtitle.length > 38 ? `${node.subtitle.slice(0, 36)}..` : node.subtitle}
                  </text>
                </g>
              );
            })}
          </InfiniteMeshViewport>
        </div>

        {/* Right Zone: Interactive Node & Cross-Link Inspector */}
        <aside className="lg:col-span-4 xl:col-span-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-5">
          {selectedNode && (
            <>
              <div className="space-y-2 border-b border-[var(--border-subtle)] pb-4">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold" style={{ color: selectedNode.color }}>
                    {selectedNode.kind === 'root'
                      ? 'Unified Root Hub'
                      : selectedNode.kind === 'section'
                      ? 'Core Platform Section'
                      : selectedNode.kind === 'common'
                      ? 'Common Cross-Cutting Bridge'
                      : 'Section Sub-Branch'}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-secondary)] tabular-nums">
                    {selectedNode.metric}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                  {selectedNode.title}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>

              {/* Connected Sections / Common Bridges */}
              {selectedNode.connectedSectionIds.length > 0 && selectedNode.kind !== 'root' && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {selectedNode.kind === 'common'
                      ? `Shared Across ${selectedNode.connectedSectionIds.length} Sections`
                      : 'Connected Pillar'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.connectedSectionIds.map((sid) => {
                      const sec = SECTION_META.find((s) => s.id === sid);
                      if (!sec) return null;
                      return (
                        <button
                          key={sid}
                          type="button"
                          onClick={() => {
                            if (nodeMap.has(sid)) setSelectedNodeId(sid);
                            else onNavigate(sec.viewTarget);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer transition-colors"
                        >
                          {sec.number}. {sec.shortTitle}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Direct Jump Links */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Direct Workbench Links
                </div>
                <div className="space-y-2">
                  {selectedNode.actions.map((act, idx) => (
                    <button
                      key={`${act.targetId}-${idx}`}
                      type="button"
                      onClick={() => runJumpAction(act)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        idx === 0
                          ? 'bg-[var(--sem-control)] text-white hover:opacity-90'
                          : 'border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)]'
                      }`}
                    >
                      <span className="truncate">{act.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Common Bridges Picker */}
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  Jump to Common Bridges
                </div>
                <div className="grid grid-cols-1 gap-1 text-[11px]">
                  {COMMON_BRIDGES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (mode === 'sections') setMode('merged');
                        setSelectedNodeId(c.id);
                      }}
                      className={`px-2.5 py-1.5 rounded text-left flex items-center justify-between transition-colors cursor-pointer ${
                        selectedNode.id === c.id
                          ? 'bg-[var(--bg-elevated)] border border-[var(--sem-control)] text-[var(--text-primary)] font-semibold'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-canvas)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="truncate">{c.title}</span>
                      <span className="font-mono text-[10px] opacity-75 shrink-0 ml-2">
                        {c.connectedSectionIds.length} secs
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Section 01: Merged All-Sections Architecture Directory */}
      <section className="space-y-5 pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-[var(--sem-control)]">01 · All Platform Sections</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
              Every Section &amp; Sub-Branch Directory
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Click any branch to focus it on the Mind Map above or launch directly into that workbench.
            </p>
          </div>
          <div className="text-xs font-mono text-[var(--text-secondary)] tabular-nums">
            {SECTION_META.length} Core Sections · {SUB_BRANCHES.length} Sub-Branches
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {SECTION_META.map((sec) => {
            const branches = SUB_BRANCHES.filter((b) => b.sectionId === sec.id);
            return (
              <div
                key={sec.id}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-semibold" style={{ color: sec.color }}>
                      Section {sec.number}
                    </span>
                    <span className="font-mono text-[var(--text-secondary)] tabular-nums">
                      {sec.metric}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{sec.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {sec.description}
                  </p>

                  <div className="divide-y divide-[var(--border-subtle)] pt-2">
                    {branches.map((br) => (
                      <div key={br.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (mode === 'common') setMode('merged');
                            setSelectedNodeId(br.id);
                            window.scrollTo({ top: 140, behavior: 'smooth' });
                          }}
                          className="text-left min-w-0 cursor-pointer group"
                        >
                          <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--sem-control)] truncate">
                            {br.title}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate">
                            {br.subtitle}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => runJumpAction(br.actions[0])}
                          className="text-[11px] font-medium text-[var(--sem-control)] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Open →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate(sec.viewTarget)}
                  className="w-full px-4 py-2 text-xs font-semibold rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  Open {sec.title} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 02: Common Engineering Crosswalk Table (Merged Synthesis) */}
      <section className="space-y-5 pt-4 border-t border-[var(--border-subtle)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-[var(--sem-control)]">02 · Common &amp; Merged Synthesis</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
              Common Engineering Foundations Across All Sections
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Trace how each foundational VLSI concept manifests identically across Protocol Specs, RTL Design, SystemVerilog, UVM, and real Open-Source Silicon IPs.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMode('common');
              setSelectedNodeId(COMMON_BRIDGES[0].id);
              window.scrollTo({ top: 120, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer whitespace-nowrap"
          >
            <GitFork className="w-3.5 h-3.5 text-[var(--sem-control)]" />
            Isolate Common View on Map
          </button>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                <th className="py-3 px-4 font-semibold">Common Concept</th>
                <th className="py-3 px-4 font-semibold">Protocol Standard</th>
                <th className="py-3 px-4 font-semibold">RTL Design Module</th>
                <th className="py-3 px-4 font-semibold">SystemVerilog</th>
                <th className="py-3 px-4 font-semibold">UVM Methodology</th>
                <th className="py-3 px-4 font-semibold">Silicon IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {COMMON_BRIDGES.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--bg-elevated)]/60 transition-colors">
                  <td className="py-3.5 px-4 align-top">
                    <button
                      type="button"
                      onClick={() => {
                        if (mode === 'sections') setMode('merged');
                        setSelectedNodeId(c.id);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      className="text-left font-semibold text-[var(--text-primary)] hover:text-[var(--sem-control)] cursor-pointer"
                    >
                      {c.title}
                    </button>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{c.subtitle}</div>
                  </td>
                  <td className="py-3.5 px-4 align-top">
                    <button
                      type="button"
                      onClick={() => onSelectProtocol(c.crosswalk.protocol.id)}
                      className="font-mono text-[var(--sem-control)] hover:underline cursor-pointer text-left"
                    >
                      {c.crosswalk.protocol.label} →
                    </button>
                  </td>
                  <td className="py-3.5 px-4 align-top">
                    <button
                      type="button"
                      onClick={() => onOpenCurriculum('rtl-design', c.crosswalk.rtl.id)}
                      className="text-[var(--text-primary)] hover:text-[var(--sem-control)] hover:underline cursor-pointer text-left"
                    >
                      {c.crosswalk.rtl.label} →
                    </button>
                  </td>
                  <td className="py-3.5 px-4 align-top">
                    <button
                      type="button"
                      onClick={() => onOpenCurriculum('systemverilog', c.crosswalk.sv.id)}
                      className="text-[var(--text-primary)] hover:text-[var(--sem-control)] hover:underline cursor-pointer text-left"
                    >
                      {c.crosswalk.sv.label} →
                    </button>
                  </td>
                  <td className="py-3.5 px-4 align-top">
                    <button
                      type="button"
                      onClick={() => onOpenCurriculum('uvm-methodology', c.crosswalk.uvm.id)}
                      className="text-[var(--text-primary)] hover:text-[var(--sem-control)] hover:underline cursor-pointer text-left"
                    >
                      {c.crosswalk.uvm.label} →
                    </button>
                  </td>
                  <td className="py-3.5 px-4 align-top">
                    <button
                      type="button"
                      onClick={() => onSelectIp(c.crosswalk.ip.id)}
                      className="font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer text-left"
                    >
                      {c.crosswalk.ip.label} →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
