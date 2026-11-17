import { ALL_IPS, PROJECTS } from './ips';
import { ALL_PROTOCOLS } from './protocols';
import { ALL_SOCS } from './socs';
import { getEntityRelationships } from '../utils/entityTaxonomy';
import { RepoIngestionProfile } from '../utils/rtlParser';
import {
  KgEdge,
  KgEdgeConfidence,
  KgEdgeType,
  KgEvidenceLabel,
  KgExplorationMode,
  KgFilterState,
  KgNode,
  KgNodeType,
  KgQueryResult,
} from '../types/knowledgeGraph';

export interface KnowledgeGraphStore {
  nodes: Map<string, KgNode>;
  edges: KgEdge[];
  outgoing: Map<string, KgEdge[]>;
  incoming: Map<string, KgEdge[]>;
}

const STANDARD_SEEDS: Array<{
  id: string;
  title: string;
  subtitle: string;
  standardNumber: string;
  revision: string;
  officialUrl: string;
  summary: string;
  relatedProtocols: string[];
  tags: string[];
}> = [
  {
    id: 'std:ieee-1800',
    title: 'IEEE 1800 SystemVerilog',
    subtitle: 'Design, Assertions (SVA) & Verification Language',
    standardNumber: 'IEEE Std 1800-2023',
    revision: '2023',
    officialUrl: 'https://standards.ieee.org/ieee/1800/7743/',
    summary: 'Unified hardware description and verification language defining synthesizable RTL constructs, interfaces, modports, functional coverage (covergroups), and SystemVerilog Assertions (SVA).',
    relatedProtocols: ['axi4', 'axi4-lite', 'axi4-stream', 'apb', 'chi', 'tl-ul', 'obi'],
    tags: ['SystemVerilog', 'SVA', 'Assertions', 'RTL', 'IEEE 1800'],
  },
  {
    id: 'std:ieee-1800-2',
    title: 'IEEE 1800.2 UVM',
    subtitle: 'Universal Verification Methodology Class Library',
    standardNumber: 'IEEE Std 1800.2-2020',
    revision: '2020',
    officialUrl: 'https://standards.ieee.org/ieee/1800.2/7199/',
    summary: 'Standardizes reusable transaction-level verification architecture including uvm_env, uvm_agent, uvm_sequencer, uvm_driver, uvm_monitor, uvm_scoreboard, and UVM RAL register models.',
    relatedProtocols: ['axi4', 'apb', 'tl-ul', 'obi', 'pcie-gen5', 'cxl'],
    tags: ['UVM', 'Verification', 'Scoreboard', 'Agent', 'IEEE 1800.2'],
  },
  {
    id: 'std:arm-amba',
    title: 'ARM AMBA Architecture',
    subtitle: 'AXI4 / AXI5 / ACE / CHI / AHB / APB Bus Specifications',
    standardNumber: 'ARM IHI 0022 / IHI 0050 / IHI 0024',
    revision: 'AXI5 / CHI-E / APB5',
    officialUrl: 'https://developer.arm.com/Architectures/AMBA',
    summary: 'On-chip interconnect specification suite spanning low-power register buses (APB), burst memory-mapped fabrics (AXI4/AXI5), streaming links (AXI4-Stream), and coherent NoCs (ACE/CHI).',
    relatedProtocols: ['axi4', 'axi4-lite', 'axi4-stream', 'apb', 'ahb-lite', 'ace', 'chi', 'chi-e', 'axi-noc'],
    tags: ['AMBA', 'ARM', 'AXI4', 'CHI', 'APB', 'AHB'],
  },
  {
    id: 'std:pci-sig',
    title: 'PCI-SIG PCIe Base Specification',
    subtitle: 'High-Speed Serial Expansion & Transaction/DLL/PHY Layers',
    standardNumber: 'PCIe Base Spec 5.0 / 6.0 / 7.0',
    revision: '6.x / 7.0',
    officialUrl: 'https://pcisig.com/specifications',
    summary: 'Defines layered PCI Express architecture across Transaction Layer (TLPs, credits, MSI-X, ATS/SR-IOV), Data Link Layer (DLLPs, Ack/Nak replay), and Physical Layer (LTSSM, 128b/130b or PAM4 FLIT).',
    relatedProtocols: ['pcie-gen5', 'pcie-gen6', 'pcie-gen7', 'pcie-tlp', 'pcie-dllp', 'pcie-ltssm', 'aer', 'sr-iov', 'ats-pri-pasid'],
    tags: ['PCIe', 'PCI-SIG', 'TLP', 'LTSSM', 'SR-IOV'],
  },
  {
    id: 'std:cxl-consortium',
    title: 'CXL Consortium Specification',
    subtitle: 'Compute Express Link Coherent Cache & Memory Interconnect',
    standardNumber: 'CXL 3.0 / 3.1 Specification',
    revision: '3.1',
    officialUrl: 'https://www.computeexpresslink.org/',
    summary: 'Cache-coherent interconnect layered atop PCIe physical transport supporting CXL.io, CXL.cache, and CXL.mem across Type 1/2/3 devices, HDM decoders, and fabric pooling.',
    relatedProtocols: ['cxl', 'cxl-io', 'cxl-cache', 'cxl-mem', 'cxl-fabric-mgr', 'pcie-gen5'],
    tags: ['CXL', 'Coherency', 'Memory Pooling', 'HDM'],
  },
  {
    id: 'std:jedec-dram',
    title: 'JEDEC DRAM & Flash Standards',
    subtitle: 'DDR4 / DDR5 / LPDDR5 / HBM3 / ONFI / DFI Interfaces',
    standardNumber: 'JESD79-5 / JESD209-5 / JESD238',
    revision: 'DDR5 / LPDDR5X / HBM3',
    officialUrl: 'https://www.jedec.org/',
    summary: 'Governs DRAM bank-group timing constraints (tRCD, tRP, tRAS, tRFC), refresh/scrubbing, PHY training/calibration, SPD/I3C sideband management, and DFI controller-to-PHY signaling.',
    relatedProtocols: ['ddr4', 'ddr5', 'lpddr5', 'lpddr5x', 'hbm3', 'dfi-5', 'dfi-ddr', 'onfi', 'spd-i3c'],
    tags: ['JEDEC', 'DDR5', 'HBM3', 'LPDDR5X', 'DFI'],
  },
  {
    id: 'std:ucie',
    title: 'UCIe Die-to-Die Specification',
    subtitle: 'Universal Chiplet Interconnect Express',
    standardNumber: 'UCIe 1.0 / 1.1 / 2.0',
    revision: '2.0',
    officialUrl: 'https://www.uciexpress.org/',
    summary: 'Open die-to-die chiplet interconnect supporting standard 2D and advanced CoWoS/EMIB packaging with FDI/RDI protocol adapters for PCIe, CXL, and streaming traffic.',
    relatedProtocols: ['ucie', 'cxl', 'pcie-gen6', 'bunch-of-wires'],
    tags: ['UCIe', 'Chiplet', 'Die-to-Die', 'Packaging'],
  },
  {
    id: 'std:riscv-isa',
    title: 'RISC-V International ISA & Debug Specs',
    subtitle: 'Unprivileged, Privileged, Vector, Coherency & External Debug',
    standardNumber: 'RISC-V ISA 2024 + Debug 1.0',
    revision: 'Ratified',
    officialUrl: 'https://riscv.org/technical/specifications/',
    summary: 'Open processor architecture defining RV32/RV64 base integer, M/A/F/D/C/V extensions, PMP/Sv39/Sv48 memory protection, and External Debug / Trace interfaces.',
    relatedProtocols: ['obi', 'tilelink', 'tl-ul', 'riscv-debug', 'rocc', 'cv-x-if'],
    tags: ['RISC-V', 'ISA', 'Debug', 'Vector', 'RoCC'],
  },
  {
    id: 'std:ieee-dft',
    title: 'IEEE 1149.1 & 1687 Test Standards',
    subtitle: 'JTAG Boundary Scan & IJTAG Embedded Instrumentation Network',
    standardNumber: 'IEEE 1149.1 / IEEE 1687 / IEEE 1500',
    revision: 'Current',
    officialUrl: 'https://standards.ieee.org/',
    summary: 'Manufacturing test, boundary-scan TAP state machine, core wrapper isolation (IEEE 1500), and reconfigurable SIB-based embedded instrument access (IJTAG).',
    relatedProtocols: ['jtag', 'swd', 'ijtag-1687', 'ieee-1500', 'scan-atpg', 'mbist', 'riscv-debug'],
    tags: ['DFT', 'JTAG', 'IJTAG', 'ATPG', 'MBIST'],
  },
  {
    id: 'std:ieee-1801',
    title: 'IEEE 1801 UPF & IEEE 1685 IP-XACT',
    subtitle: 'Unified Power Format & Standard IP Metadata Packaging',
    standardNumber: 'IEEE 1801-2018 / IEEE 1685-2022',
    revision: 'Current',
    officialUrl: 'https://standards.ieee.org/',
    summary: 'Power-intent modeling (isolation cells, retention flops, level shifters, power switches) and XML metadata packaging for automated SoC integration and register generation.',
    relatedProtocols: ['upf-power', 'cdc-handshake', 'reset-sync'],
    tags: ['UPF', 'Low Power', 'IP-XACT', 'CDC'],
  },
  {
    id: 'std:mipi',
    title: 'MIPI Alliance Specifications',
    subtitle: 'CSI-2, DSI-2, D-PHY, C-PHY, I3C & Automotive A-PHY',
    standardNumber: 'MIPI CSI-2 / D-PHY / C-PHY / I3C',
    revision: 'Current',
    officialUrl: 'https://www.mipi.org/specifications',
    summary: 'Camera, display, sensor, and automotive physical & protocol layers used across mobile, edge AI vision, and embedded SoCs.',
    relatedProtocols: ['mipi-csi2', 'mipi-dphy', 'mipi-cphy', 'mipi-aphy', 'i3c'],
    tags: ['MIPI', 'Camera', 'Display', 'I3C', 'PHY'],
  },
];

const EDA_TOOLS: Array<{
  id: string;
  title: string;
  subtitle: string;
  category: string;
  officialUrl: string;
  summary: string;
  matchKeywords: string[];
}> = [
  {
    id: 'eda:verilator',
    title: 'Verilator',
    subtitle: 'Open-Source Cycle-Accurate SystemVerilog Simulator & Linter',
    category: 'Simulation / Linting',
    officialUrl: 'https://www.veripool.org/verilator/',
    summary: 'Compiles synthesizable Verilog/SystemVerilog into multi-threaded C++ simulation models with FST/VCD waveform tracing and strict lint checks.',
    matchKeywords: ['verilator', 'rtlsim', 'lint'],
  },
  {
    id: 'eda:vcs',
    title: 'Synopsys VCS',
    subtitle: 'Commercial UVM, SVA & Constraint-Random Simulator',
    category: 'UVM / Signoff Simulation',
    officialUrl: 'https://www.synopsys.com/',
    summary: 'Signoff RTL and UVM 1.2 / IEEE 1800.2 simulator used by OpenTitan dvsim and core_ibex regressions with functional coverage.',
    matchKeywords: ['vcs', 'dvsim', 'uvm'],
  },
  {
    id: 'eda:questa',
    title: 'Siemens QuestaSim',
    subtitle: 'UVM Simulation & Formal Property Verification',
    category: 'Simulation / Formal',
    officialUrl: 'https://eda.sw.siemens.com/',
    summary: 'SystemVerilog/VHDL simulator and assertion debugging platform supporting UVM regressions and Questa Formal.',
    matchKeywords: ['questa', 'vsim'],
  },
  {
    id: 'eda:xcelium',
    title: 'Cadence Xcelium',
    subtitle: 'Parallel Logic Simulation & UVM Engine',
    category: 'Simulation / UVM',
    officialUrl: 'https://www.cadence.com/',
    summary: 'High-throughput UVM and mixed-signal simulator supported by OpenTitan dvsim and CORE-V verification.',
    matchKeywords: ['xcelium', 'xrun'],
  },
  {
    id: 'eda:yosys',
    title: 'Yosys & SymbiYosys',
    subtitle: 'Open-Source RTL Synthesis & Formal Equivalence/BMC Suite',
    category: 'Synthesis & Formal',
    officialUrl: 'https://yosyshq.net/',
    summary: 'Transforms Verilog/SystemVerilog RTL to gate-level netlists and runs bounded model checking / k-induction SVA formal proofs.',
    matchKeywords: ['yosys', 'symbiyosys', 'formal'],
  },
  {
    id: 'eda:fusesoc',
    title: 'FuseSoC',
    subtitle: 'Open-Source IP Package Manager & EDA Build Orchestrator',
    category: 'Build & Packaging',
    officialUrl: 'https://github.com/olofk/fusesoc',
    summary: 'Manages CAPI2 .core files, dependencies, parameters, and tool invocations across Ibex, OpenTitan, SERV, and LiteX.',
    matchKeywords: ['fusesoc', '.core', 'ibex', 'serv'],
  },
  {
    id: 'eda:cocotb',
    title: 'cocotb',
    subtitle: 'Python Coroutine-Based Co-Simulation Framework',
    category: 'Verification Framework',
    officialUrl: 'https://www.cocotb.org/',
    summary: 'Drives RTL bus interfaces (AXI4, PCIe, Ethernet) from async Python testbenches over VPI/VHPI/FLI.',
    matchKeywords: ['cocotb', 'verilog-axi', 'verilog-ethernet', 'verilog-pcie'],
  },
  {
    id: 'eda:openroad',
    title: 'OpenROAD',
    subtitle: 'Automated Open-Source RTL-to-GDSII Physical Design Flow',
    category: 'Physical Design (PnR)',
    officialUrl: 'https://theopenroadproject.org/',
    summary: 'Executes floorplanning, placement, clock tree synthesis, routing, and STA timing closure for open-source silicon.',
    matchKeywords: ['openroad', 'asic', 'sky130', 'asap7'],
  },
  {
    id: 'eda:vivado',
    title: 'AMD Xilinx Vivado',
    subtitle: 'FPGA Synthesis, Implementation & Hardware ILA Debugging',
    category: 'FPGA Implementation',
    officialUrl: 'https://www.xilinx.com/',
    summary: 'Targets UltraScale+/Alveo FPGAs with AXI IP Integrator, bitstream generation, and Integrated Logic Analyzer (ILA).',
    matchKeywords: ['vivado', 'fpga', 'alveo', 'xilinx'],
  },
];

const PROTOCOL_UVM_AND_ASSERTION_SEEDS: Array<{
  protocolId: string;
  envId: string;
  envTitle: string;
  components: Array<{ id: string; title: string; role: string }>;
  assertions: string[];
  tests: string[];
}> = [
  {
    protocolId: 'axi4',
    envId: 'uvm-env:axi4',
    envTitle: 'AMBA AXI4 UVM Verification Environment',
    components: [
      { id: 'uvm-comp:axi4-seqr', title: 'axi4_sequencer', role: 'Generates constrained-random burst IDs, AWSIZE/ARSIZE, and burst lengths' },
      { id: 'uvm-comp:axi4-drv', title: 'axi4_master_driver', role: 'Drives AW, W, AR channels respecting VALID persistence rules' },
      { id: 'uvm-comp:axi4-mon', title: 'axi4_monitor', role: 'Reconstructs out-of-order burst transactions and checks protocol timing' },
      { id: 'uvm-comp:axi4-sb', title: 'axi4_scoreboard', role: 'Verifies read-after-write memory model coherency per AXI ID' },
    ],
    assertions: [
      'AWVALID stable until AWREADY asserted (ARM AXI4 Sec A3.2.1)',
      'WVALID stable until WREADY asserted; WLAST aligns exactly with AWLEN+1 beats',
      'BVALID cannot assert before last W-channel beat handshake completes',
      'ARBURST != 2\'b11 (Reserved encoding forbidden)',
    ],
    tests: ['axi4_outstanding_ooo_burst_test', 'axi4_4kb_boundary_split_test', 'axi4_backpressure_stress_test'],
  },
  {
    protocolId: 'tl-ul',
    envId: 'uvm-env:tl-ul',
    envTitle: 'OpenTitan TL-UL Dvsim UVM Environment',
    components: [
      { id: 'uvm-comp:tl-agent', title: 'tl_agent (tl_host_driver / tl_device_driver)', role: 'Drives A/D channels and injects/checks SECDED ECC integrity bits' },
      { id: 'uvm-comp:tl-mon', title: 'tl_monitor', role: 'Tracks outstanding source IDs and calculates bus integrity parity' },
      { id: 'uvm-comp:cip-env', title: 'cip_base_env & dv_base_scoreboard', role: 'Reusable OpenTitan Comportable IP scoreboard with RAL & alert checking' },
    ],
    assertions: [
      'a_valid must stay asserted until a_ready is sampled high',
      'a_address must align to 2^a_size boundary',
      'cmd_intg and data_intg must pass ECC syndrome checker on every valid beat',
    ],
    tests: ['tl_errors_test', 'tl_intg_err_test', 'stress_all_with_rand_reset_test'],
  },
  {
    protocolId: 'obi',
    envId: 'uvm-env:obi',
    envTitle: 'core_ibex / CORE-V OBI UVM Environment',
    components: [
      { id: 'uvm-comp:obi-agent', title: 'ibex_mem_intf_agent', role: 'Models instruction and data memory responses with random gnt/rvalid delays' },
      { id: 'uvm-comp:riscv-dv', title: 'riscv-dv Instruction Generator', role: 'Produces randomized RISC-V ELF streams for ISS-vs-RTL lockstep compare' },
      { id: 'uvm-comp:obi-cov', title: 'ibex_fcov_monitor', role: 'Samples OBI back-to-back request/grant/rvalid corner coverage' },
    ],
    assertions: [
      'req_o held high and addr_o/we_o/wdata_o stable until gnt_i sampled',
      'rvalid_i matches exact number of accepted req_o && gnt_i phases',
    ],
    tests: ['riscv_arithmetic_basic_test', 'riscv_pmp_fault_stress_test', 'obi_wait_state_fuzz_test'],
  },
  {
    protocolId: 'pcie-gen5',
    envId: 'uvm-env:pcie',
    envTitle: 'PCIe Gen5 / TLP / LTSSM UVM Verification Suite',
    components: [
      { id: 'uvm-comp:pcie-tlp-gen', title: 'pcie_tlp_sequencer', role: 'Generates Posted MRd/MWr, Non-Posted CfgRd, and Completion CPLD packets' },
      { id: 'uvm-comp:pcie-dll', title: 'pcie_dllp_checker', role: 'Monitors Ack/Nak replay timer, sequence numbers, and InitFC credit return' },
      { id: 'uvm-comp:pcie-ltssm', title: 'pcie_ltssm_monitor', role: 'Tracks Detect -> Polling -> Configuration -> L0 -> Recovery state transitions' },
    ],
    assertions: [
      'Posted/Non-Posted TLP never transmitted when corresponding FC credit balance < packet size',
      'TLP ECRC and LCRC match IEEE 802.3 / PCI-SIG polynomial',
    ],
    tests: ['pcie_ltssm_speed_change_test', 'pcie_ack_nak_replay_injection_test', 'pcie_fc_credit_exhaustion_test'],
  },
  {
    protocolId: 'ddr5',
    envId: 'uvm-env:ddr5',
    envTitle: 'JEDEC DDR5 / DFI Protocol Checker Environment',
    components: [
      { id: 'uvm-comp:dfi-mon', title: 'dfi_command_monitor', role: 'Samples ACT, PRE, RD, WR, REF commands across dual 32-bit sub-channels' },
      { id: 'uvm-comp:ddr5-timing', title: 'ddr5_jedec_timing_checker', role: 'Enforces tRCD, tRP, tFAW, tRFC, tCCD_L/S across bank groups' },
    ],
    assertions: [
      'Minimum tRCD cycles between ACT and RD/WR on same bank',
      'Row must be precharged (tRP) before ACT to different row in same bank',
    ],
    tests: ['ddr5_bank_group_interleave_test', 'ddr5_refresh_collision_test', 'ddr5_ecs_ecc_scrub_test'],
  },
];

let cachedGraph: KnowledgeGraphStore | null = null;

function addNodeSafe(store: KnowledgeGraphStore, node: KgNode) {
  if (!store.nodes.has(node.id)) {
    store.nodes.set(node.id, node);
    store.outgoing.set(node.id, []);
    store.incoming.set(node.id, []);
  }
}

function addEdgeSafe(store: KnowledgeGraphStore, edge: KgEdge) {
  if (!store.nodes.has(edge.source) || !store.nodes.has(edge.target)) return;
  if (edge.source === edge.target) return;
  const dup = (store.outgoing.get(edge.source) || []).some(
    (e) => e.target === edge.target && e.relation === edge.relation
  );
  if (dup) return;
  store.edges.push(edge);
  store.outgoing.get(edge.source)!.push(edge);
  store.incoming.get(edge.target)!.push(edge);
}

function ipNodeType(category: string): KgNodeType {
  if (category === 'CPU & Processor') return 'processor';
  if (category === 'Security & Crypto') return 'security';
  if (category === 'Memory & Cache') return 'memory';
  return 'ip_core';
}

function protocolNodeId(id: string) {
  return `proto:${id}`;
}
function ipNodeId(id: string) {
  return `ip:${id}`;
}
function socNodeId(id: string) {
  return `soc:${id}`;
}
function projectNodeId(id: string) {
  return `proj:${id}`;
}
function moduleNodeId(ipId: string, modName: string) {
  return `mod:${ipId}:${modName}`;
}

export function buildKnowledgeGraph(): KnowledgeGraphStore {
  const store: KnowledgeGraphStore = {
    nodes: new Map(),
    edges: [],
    outgoing: new Map(),
    incoming: new Map(),
  };

  // 1. Add Protocol Nodes (all 498 entries)
  for (const p of ALL_PROTOCOLS) {
    addNodeSafe(store, {
      id: protocolNodeId(p.id),
      nodeType: 'protocol',
      title: p.name,
      subtitle: p.fullName,
      category: p.categoryId,
      summary: p.tagline || p.overview.definition,
      architectureDescription: p.overview.whyDeveloped,
      evidence: 'OFFICIAL_SPECIFICATION',
      provenance: {
        standardNumber: p.standardBody,
        revision: p.specVersion,
        officialUrl: p.sources[0]?.reference,
      },
      specs: [
        { label: 'Standard Body', value: p.standardBody },
        { label: 'Spec Revision', value: p.specVersion },
        { label: 'Release Year', value: p.year },
        { label: 'Clock & Reset', value: p.architecture.clockAndReset },
        { label: 'Channels', value: `${p.channels.length} (${p.channels.slice(0, 4).join(', ')})` },
        { label: 'Mapped Signals', value: `${p.signals.length}` },
      ],
      assertions: [
        ...p.signals.filter((s) => s.svaAssertion).slice(0, 4).map((s) => `${s.name}: ${s.svaAssertion}`),
        ...p.verification.cornerCases.slice(0, 3),
      ],
      coverageGoals: p.verification.coveragePoints,
      tags: [p.name, p.standardBody, p.categoryId, ...p.overview.usedIn.slice(0, 3)],
      appLink: { kind: 'protocol', id: p.id },
    });
  }

  // Build quick lookup from protocol name/id to protocol node ID for text relationship linking
  const protoAliasList = ALL_PROTOCOLS.map((p) => ({
    id: p.id,
    nameLower: p.name.toLowerCase(),
  })).sort((a, b) => b.nameLower.length - a.nameLower.length);

  // 2. Add Protocol-to-Protocol Relationships
  for (const p of ALL_PROTOCOLS) {
    const relStrings = getEntityRelationships(p);
    for (const relText of relStrings) {
      const rl = relText.toLowerCase();
      const matchedTarget = protoAliasList.find(
        (cand) => cand.id !== p.id && cand.nameLower.length >= 3 && rl.includes(cand.nameLower)
      );
      if (!matchedTarget) continue;
      const targetId = protocolNodeId(matchedTarget.id);
      if (!store.nodes.has(targetId)) continue;
      const relation: KgEdgeType =
        rl.includes('merged') || rl.includes('superseded') || rl.includes('succeeded') || rl.includes('replaced')
          ? 'DERIVED_FROM'
          : rl.includes('layer') || rl.includes('bridge') || rl.includes('uses')
          ? 'DEPENDS_ON'
          : 'RELATED_TO';
      addEdgeSafe(store, {
        id: `edge:${p.id}:${matchedTarget.id}:${relation}`,
        source: protocolNodeId(p.id),
        target: targetId,
        relation,
        label: relText.slice(0, 32),
        confidence: 'confirmed',
        evidence: 'OFFICIAL_SPECIFICATION',
        notes: relText,
      });
    }
  }

  // 3. Add Upstream Open-Source Hardware Projects
  for (const proj of PROJECTS) {
    addNodeSafe(store, {
      id: projectNodeId(proj.id),
      nodeType: 'project',
      title: proj.name,
      subtitle: proj.organization,
      category: 'Open-Source Hardware Project',
      summary: proj.description,
      evidence: 'OFFICIAL_DOCUMENTATION',
      provenance: {
        repoUrl: proj.repoUrl,
        commitHash: proj.commitOrTag,
        officialUrl: proj.repoUrl,
      },
      specs: [
        { label: 'Organization', value: proj.organization },
        { label: 'License', value: proj.license },
        { label: 'Ref / Tag', value: proj.commitOrTag },
        { label: 'Repository', value: proj.repoUrl },
      ],
      projectId: proj.id,
      tags: [proj.name, proj.license, proj.organization],
    });
  }

  // 4. Add Standards Nodes & Link to Protocols
  for (const std of STANDARD_SEEDS) {
    addNodeSafe(store, {
      id: std.id,
      nodeType: 'standard',
      title: std.title,
      subtitle: std.subtitle,
      category: 'Semiconductor Standard',
      summary: std.summary,
      evidence: 'OFFICIAL_SPECIFICATION',
      provenance: {
        standardNumber: std.standardNumber,
        revision: std.revision,
        officialUrl: std.officialUrl,
      },
      specs: [
        { label: 'Standard ID', value: std.standardNumber },
        { label: 'Revision', value: std.revision },
        { label: 'Official Portal', value: std.officialUrl },
      ],
      tags: std.tags,
    });
    for (const pid of std.relatedProtocols) {
      addEdgeSafe(store, {
        id: `edge:${pid}:${std.id}`,
        source: protocolNodeId(pid),
        target: std.id,
        relation: 'DEFINED_BY',
        label: 'DEFINED_BY',
        confidence: 'confirmed',
        evidence: 'OFFICIAL_SPECIFICATION',
        notes: `Protocol semantics and timing rules are governed by ${std.standardNumber}.`,
        provenance: { standardNumber: std.standardNumber, officialUrl: std.officialUrl },
      });
    }
  }

  // 5. Add EDA Tools
  for (const tool of EDA_TOOLS) {
    addNodeSafe(store, {
      id: tool.id,
      nodeType: 'eda_tool',
      title: tool.title,
      subtitle: tool.subtitle,
      category: tool.category,
      summary: tool.summary,
      evidence: 'OFFICIAL_DOCUMENTATION',
      provenance: { officialUrl: tool.officialUrl },
      specs: [
        { label: 'Category', value: tool.category },
        { label: 'Website', value: tool.officialUrl },
      ],
      tags: [tool.title, tool.category, ...tool.matchKeywords],
    });
  }

  // 6. Add Open-Source Hardware IPs, Processors, Security & Memory IPs + Modules + Registers + Verification
  for (const ip of ALL_IPS) {
    const ipNid = ipNodeId(ip.id);
    const nType = ipNodeType(ip.category);
    const isVerified = ip.confidence === 'Verified from Source/Docs';
    const ipEvidence: KgEvidenceLabel = isVerified ? 'OBSERVED_IN_RTL' : 'DERIVED_FROM_RTL';

    addNodeSafe(store, {
      id: ipNid,
      nodeType: nType,
      title: ip.name,
      subtitle: `${ip.category} · ${ip.rtlLanguage}`,
      category: ip.category,
      summary: ip.tagline,
      architectureDescription: ip.architecture.summary,
      evidence: ipEvidence,
      provenance: {
        repoUrl: ip.repoUrl,
        commitHash: ip.latestRef,
        officialUrl: ip.docsUrl,
      },
      specs: [
        { label: 'Category', value: ip.category },
        { label: 'RTL Language', value: ip.rtlLanguage },
        { label: 'License', value: ip.license },
        { label: 'Status', value: ip.developmentStatus },
        { label: 'Clocks', value: ip.architecture.clocks.join(', ') },
        { label: 'Modules Mapped', value: `${ip.modules.length}` },
      ],
      parameters: ip.parameters.map((p) => ({
        name: p.name,
        value: `${p.type} = ${p.defaultValue}`,
        impact: p.architecturalImpact,
      })),
      interfaces: ip.interfaces.map((iface) => ({
        name: iface.name,
        protocolId: iface.protocolId,
        directionOrRole: `${iface.role} (${iface.clockDomain})`,
      })),
      registers: ip.registers.map((r) => ({
        name: r.name,
        offset: r.offset,
        access: r.access,
        description: r.description,
      })),
      assertions: ip.verification.existingInfra.assertionsAndFormal,
      coverageGoals: ip.verification.existingInfra.coverageAndTests,
      projectId: ip.projectId,
      tags: [ip.name, ip.category, ip.rtlLanguage, ip.license, ...ip.interfaces.map((i) => i.protocolLabel)],
      appLink: { kind: 'ip', id: ip.id },
    });

    // IP <-> Project
    addEdgeSafe(store, {
      id: `edge:${ipNid}:proj:${ip.projectId}`,
      source: projectNodeId(ip.projectId),
      target: ipNid,
      relation: 'CONTAINS',
      label: 'CONTAINS',
      confidence: 'confirmed',
      evidence: 'OFFICIAL_DOCUMENTATION',
      notes: `${ip.name} is maintained inside ${ip.repoUrl}.`,
      provenance: { repoUrl: ip.repoUrl },
    });

    // IP <-> Protocols (via Interfaces) + Interface Signals
    for (const iface of ip.interfaces) {
      const pNid = protocolNodeId(iface.protocolId);
      if (store.nodes.has(pNid)) {
        addEdgeSafe(store, {
          id: `edge:${ipNid}:${pNid}:${iface.name}`,
          source: ipNid,
          target: pNid,
          relation: iface.role.includes('Initiator') ? 'USES_PROTOCOL' : 'IMPLEMENTS',
          label: `${iface.name} (${iface.protocolLabel})`,
          confidence: isVerified ? 'confirmed' : 'inferred',
          evidence: ipEvidence,
          notes: `${iface.role} on clock ${iface.clockDomain}. ${iface.timingDependencies}`,
          provenance: { repoUrl: ip.repoUrl },
        });
      }

      // Add key RTL interface signal node for deep RTL-Centric exploration
      const sigNid = `sig:${ip.id}:${iface.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      addNodeSafe(store, {
        id: sigNid,
        nodeType: 'rtl_signal',
        title: `${ip.name} :: ${iface.name}`,
        subtitle: `${iface.protocolLabel} · ${iface.role}`,
        category: 'Interface / Signal Bundle',
        summary: `Physical bus interface on clock ${iface.clockDomain} (${iface.resetDomain}). ${iface.timingDependencies}`,
        evidence: ipEvidence,
        provenance: { repoUrl: ip.repoUrl },
        specs: [
          { label: 'Protocol', value: iface.protocolLabel },
          { label: 'Role', value: iface.role },
          { label: 'Clock Domain', value: iface.clockDomain },
          { label: 'Reset Domain', value: iface.resetDomain },
          { label: 'Pins Mapped', value: `${iface.signals.length}` },
        ],
        projectId: ip.projectId,
        tags: [iface.name, iface.protocolLabel, ...iface.signals.map((s) => s.name)],
        appLink: { kind: 'ip', id: ip.id },
      });

      addEdgeSafe(store, {
        id: `edge:${ipNid}:${sigNid}`,
        source: ipNid,
        target: sigNid,
        relation: 'CONTAINS',
        label: 'EXPOSES_INTERFACE',
        confidence: isVerified ? 'confirmed' : 'inferred',
        evidence: ipEvidence,
      });

      if (store.nodes.has(pNid)) {
        addEdgeSafe(store, {
          id: `edge:${sigNid}:${pNid}`,
          source: sigNid,
          target: pNid,
          relation: 'COMPLIES_WITH',
          label: 'COMPLIES_WITH',
          confidence: isVerified ? 'confirmed' : 'inferred',
          evidence: ipEvidence,
        });
      }
    }

    // IP <-> RTL Modules & Child Hierarchy
    for (const mod of ip.modules) {
      const mNid = moduleNodeId(ip.id, mod.name);
      addNodeSafe(store, {
        id: mNid,
        nodeType: 'rtl_module',
        title: mod.name,
        subtitle: `${mod.filePath} · ${ip.rtlLanguage}`,
        category: 'RTL Module',
        summary: mod.summary,
        evidence: 'OBSERVED_IN_RTL',
        provenance: {
          repoUrl: ip.repoUrl,
          filePath: mod.filePath,
          officialUrl: mod.githubFileUrl,
          sourceExcerpt: mod.sourceExcerpt,
        },
        specs: [
          { label: 'File Path', value: mod.filePath },
          { label: 'Ports', value: `${mod.ports.length}` },
          { label: 'Parameters', value: `${mod.parameters.length}` },
          { label: 'Child Modules', value: mod.childModules.join(', ') || 'Leaf Module' },
        ],
        parameters: mod.parameters.map((p) => ({
          name: p.name,
          value: p.defaultValue,
          impact: p.description,
        })),
        projectId: ip.projectId,
        tags: [mod.name, ip.name, ...mod.relatedInterfaces],
        appLink: { kind: 'ip', id: ip.id },
      });

      if (!mod.parentModule) {
        addEdgeSafe(store, {
          id: `edge:${ipNid}:${mNid}`,
          source: ipNid,
          target: mNid,
          relation: 'IMPLEMENTED_BY',
          label: 'IMPLEMENTED_BY',
          confidence: 'confirmed',
          evidence: 'OBSERVED_IN_RTL',
          provenance: { filePath: mod.filePath, officialUrl: mod.githubFileUrl },
        });
      } else {
        const parentNid = moduleNodeId(ip.id, mod.parentModule);
        if (store.nodes.has(parentNid)) {
          addEdgeSafe(store, {
            id: `edge:${parentNid}:${mNid}`,
            source: parentNid,
            target: mNid,
            relation: 'INSTANTIATES',
            label: 'INSTANTIATES',
            confidence: 'confirmed',
            evidence: 'OBSERVED_IN_RTL',
            provenance: { filePath: mod.filePath, officialUrl: mod.githubFileUrl },
          });
        } else {
          addEdgeSafe(store, {
            id: `edge:${ipNid}:${mNid}:sub`,
            source: ipNid,
            target: mNid,
            relation: 'CONTAINS',
            label: 'CONTAINS_MODULE',
            confidence: 'confirmed',
            evidence: 'OBSERVED_IN_RTL',
            provenance: { filePath: mod.filePath, officialUrl: mod.githubFileUrl },
          });
        }
      }
    }

    // Connect parent -> child modules after all module nodes are registered
    for (const mod of ip.modules) {
      const parentNid = moduleNodeId(ip.id, mod.name);
      for (const child of mod.childModules) {
        const childNid = moduleNodeId(ip.id, child);
        if (store.nodes.has(childNid)) {
          addEdgeSafe(store, {
            id: `edge:${parentNid}:${childNid}:inst`,
            source: parentNid,
            target: childNid,
            relation: 'INSTANTIATES',
            label: 'INSTANTIATES',
            confidence: 'confirmed',
            evidence: 'OBSERVED_IN_RTL',
            provenance: { filePath: mod.filePath },
          });
        }
      }
    }

    // Registers (top 5 CSRs per IP to keep graph crystal clean while searchable)
    for (const reg of ip.registers.slice(0, 6)) {
      const rNid = `reg:${ip.id}:${reg.name}`;
      addNodeSafe(store, {
        id: rNid,
        nodeType: 'register',
        title: `${ip.name} :: ${reg.name}`,
        subtitle: `Offset ${reg.offset} · ${reg.width}-bit (${reg.access})`,
        category: reg.sourceFormat,
        summary: reg.description,
        evidence: reg.sourceFormat === 'Unavailable' ? 'ENGINEERING_INTERPRETATION' : 'OBSERVED_IN_RTL',
        provenance: { repoUrl: ip.repoUrl },
        specs: [
          { label: 'Offset', value: reg.offset },
          { label: 'Reset Value', value: reg.resetValue },
          { label: 'Access', value: reg.access },
          { label: 'Source Format', value: reg.sourceFormat },
          { label: 'Fields', value: reg.fields.map((f) => `${f.name}[${f.bits}]`).join(', ') || '32b' },
        ],
        projectId: ip.projectId,
        tags: [reg.name, ip.name, reg.offset],
        appLink: { kind: 'ip', id: ip.id },
      });

      addEdgeSafe(store, {
        id: `edge:${ipNid}:${rNid}`,
        source: ipNid,
        target: rNid,
        relation: 'USES_REGISTER',
        label: 'USES_REGISTER',
        confidence: 'confirmed',
        evidence: 'OFFICIAL_DOCUMENTATION',
      });
    }

    // Verification Environment + UVM Components + EDA Tools for this IP
    const vEnv = ip.verification;
    const vNid = `venv:${ip.id}`;
    addNodeSafe(store, {
      id: vNid,
      nodeType: 'verification_env',
      title: `${ip.name} DV Environment`,
      subtitle: `${vEnv.existingInfra.framework} · ${vEnv.maturity}`,
      category: vEnv.maturity,
      summary: `Verification infrastructure at ${vEnv.existingInfra.testbenchPath}. Includes ${vEnv.existingInfra.agentsAndComponents.length} agents/components and ${vEnv.existingInfra.assertionsAndFormal.length} formal/SVA suites.`,
      evidence: 'OBSERVED_IN_VERIFICATION',
      provenance: {
        repoUrl: ip.repoUrl,
        filePath: vEnv.existingInfra.testbenchPath,
      },
      specs: [
        { label: 'Framework', value: vEnv.existingInfra.framework },
        { label: 'Maturity', value: vEnv.maturity },
        { label: 'Testbench Path', value: vEnv.existingInfra.testbenchPath },
      ],
      assertions: vEnv.existingInfra.assertionsAndFormal,
      coverageGoals: vEnv.existingInfra.coverageAndTests,
      projectId: ip.projectId,
      tags: [ip.name, vEnv.existingInfra.framework, 'Verification', 'DV'],
      appLink: { kind: 'ip', id: ip.id },
    });

    addEdgeSafe(store, {
      id: `edge:${ipNid}:${vNid}`,
      source: ipNid,
      target: vNid,
      relation: 'VERIFIED_BY',
      label: 'VERIFIED_BY',
      confidence: 'confirmed',
      evidence: 'OBSERVED_IN_VERIFICATION',
      provenance: { filePath: vEnv.existingInfra.testbenchPath, repoUrl: ip.repoUrl },
    });

    if (vEnv.existingInfra.framework.toLowerCase().includes('uvm')) {
      addEdgeSafe(store, {
        id: `edge:${vNid}:std-uvm`,
        source: vNid,
        target: 'std:ieee-1800-2',
        relation: 'COMPLIES_WITH',
        label: 'USES_UVM_1800.2',
        confidence: 'confirmed',
        evidence: 'OBSERVED_IN_VERIFICATION',
      });
    }
    addEdgeSafe(store, {
      id: `edge:${vNid}:std-sv`,
      source: vNid,
      target: 'std:ieee-1800',
      relation: 'COMPLIES_WITH',
      label: 'USES_SV_1800',
      confidence: 'confirmed',
      evidence: 'OBSERVED_IN_VERIFICATION',
    });

    // Attach top 2 UVM components & tests per IP
    vEnv.existingInfra.agentsAndComponents.slice(0, 3).forEach((comp, idx) => {
      const cNid = `uvm:${ip.id}:${idx}`;
      addNodeSafe(store, {
        id: cNid,
        nodeType: 'uvm_component',
        title: comp.split(':')[0].split('(')[0].trim().slice(0, 46),
        subtitle: `${ip.name} DV Component`,
        category: vEnv.existingInfra.framework,
        summary: comp,
        evidence: 'OBSERVED_IN_VERIFICATION',
        provenance: { repoUrl: ip.repoUrl, filePath: vEnv.existingInfra.testbenchPath },
        specs: [{ label: 'Parent IP', value: ip.name }],
        projectId: ip.projectId,
        tags: [comp, ip.name, 'UVM'],
        appLink: { kind: 'ip', id: ip.id },
      });
      addEdgeSafe(store, {
        id: `edge:${vNid}:${cNid}`,
        source: vNid,
        target: cNid,
        relation: 'CONTAINS_COMPONENT',
        label: 'CONTAINS_COMPONENT',
        confidence: 'confirmed',
        evidence: 'OBSERVED_IN_VERIFICATION',
      });
    });

    vEnv.existingInfra.coverageAndTests.slice(0, 2).forEach((tst, idx) => {
      const tNid = `vtest:${ip.id}:${idx}`;
      addNodeSafe(store, {
        id: tNid,
        nodeType: 'verification_test',
        title: tst.split(':')[0].trim().slice(0, 44),
        subtitle: `${ip.name} Verification Suite`,
        category: 'Test & Coverage',
        summary: tst,
        evidence: 'OBSERVED_IN_VERIFICATION',
        provenance: { repoUrl: ip.repoUrl, filePath: vEnv.existingInfra.testbenchPath },
        specs: [{ label: 'Target IP', value: ip.name }],
        projectId: ip.projectId,
        tags: [tst, ip.name, 'Testcase'],
        appLink: { kind: 'ip', id: ip.id },
      });
      addEdgeSafe(store, {
        id: `edge:${ipNid}:${tNid}`,
        source: ipNid,
        target: tNid,
        relation: 'TESTED_BY',
        label: 'TESTED_BY',
        confidence: 'confirmed',
        evidence: 'OBSERVED_IN_VERIFICATION',
      });
    });

    // Link EDA tools referenced in simCommands / verification
    const simBlob = JSON.stringify(vEnv).toLowerCase() + ' ' + ip.fileTree.join(' ').toLowerCase();
    for (const tool of EDA_TOOLS) {
      if (tool.matchKeywords.some((kw) => simBlob.includes(kw))) {
        addEdgeSafe(store, {
          id: `edge:${vNid}:${tool.id}`,
          source: vNid,
          target: tool.id,
          relation: 'USES_TOOL',
          label: 'USES_TOOL',
          confidence: 'confirmed',
          evidence: 'OFFICIAL_DOCUMENTATION',
          notes: `${tool.title} is referenced in ${ip.name} verification/build recipes.`,
        });
      }
    }

    // Link RISC-V processors to RISC-V Standard
    if (
      ip.category === 'CPU & Processor' &&
      (ip.tagline.toLowerCase().includes('risc-v') ||
        ip.tagline.toLowerCase().includes('rv32') ||
        ip.tagline.toLowerCase().includes('rv64') ||
        ip.id === 'ibex' ||
        ip.id === 'cva6' ||
        ip.id === 'rocket-chip')
    ) {
      addEdgeSafe(store, {
        id: `edge:${ipNid}:std-riscv`,
        source: ipNid,
        target: 'std:riscv-isa',
        relation: 'COMPLIES_WITH',
        label: 'COMPLIES_WITH',
        confidence: 'confirmed',
        evidence: 'OFFICIAL_DOCUMENTATION',
        notes: `${ip.name} implements ratified RISC-V ISA specification.`,
      });
    }
  }

  // 7. Add Protocol UVM Environments & Components
  for (const pUvm of PROTOCOL_UVM_AND_ASSERTION_SEEDS) {
    const pNid = protocolNodeId(pUvm.protocolId);
    if (!store.nodes.has(pNid)) continue;

    addNodeSafe(store, {
      id: pUvm.envId,
      nodeType: 'verification_env',
      title: pUvm.envTitle,
      subtitle: 'IEEE 1800.2 Protocol VIP & Checker',
      category: 'Protocol Verification',
      summary: `Standardized protocol-level verification environment verifying ${pUvm.protocolId.toUpperCase()} timing, backpressure, ordering, and corner cases.`,
      evidence: 'OFFICIAL_SPECIFICATION',
      provenance: { standardNumber: 'IEEE 1800.2-2020' },
      specs: [
        { label: 'Target Protocol', value: pUvm.protocolId.toUpperCase() },
        { label: 'Components', value: `${pUvm.components.length}` },
        { label: 'SVA Rules', value: `${pUvm.assertions.length}` },
      ],
      assertions: pUvm.assertions,
      coverageGoals: pUvm.tests,
      tags: ['UVM', pUvm.protocolId, 'VIP', 'Assertions'],
      appLink: { kind: 'protocol', id: pUvm.protocolId },
    });

    addEdgeSafe(store, {
      id: `edge:${pNid}:${pUvm.envId}`,
      source: pNid,
      target: pUvm.envId,
      relation: 'VERIFIED_BY',
      label: 'VERIFIED_BY',
      confidence: 'confirmed',
      evidence: 'OFFICIAL_DOCUMENTATION',
    });

    addEdgeSafe(store, {
      id: `edge:${pUvm.envId}:std:ieee-1800-2`,
      source: pUvm.envId,
      target: 'std:ieee-1800-2',
      relation: 'COMPLIES_WITH',
      label: 'COMPLIES_WITH',
      confidence: 'confirmed',
      evidence: 'OFFICIAL_SPECIFICATION',
    });

    for (const c of pUvm.components) {
      addNodeSafe(store, {
        id: c.id,
        nodeType: 'uvm_component',
        title: c.title,
        subtitle: `${pUvm.protocolId.toUpperCase()} UVM Component`,
        category: 'UVM VIP Component',
        summary: c.role,
        evidence: 'OFFICIAL_DOCUMENTATION',
        provenance: { standardNumber: 'IEEE 1800.2-2020' },
        specs: [{ label: 'Protocol', value: pUvm.protocolId.toUpperCase() }],
        tags: [c.title, pUvm.protocolId, 'UVM'],
        appLink: { kind: 'protocol', id: pUvm.protocolId },
      });
      addEdgeSafe(store, {
        id: `edge:${pUvm.envId}:${c.id}`,
        source: pUvm.envId,
        target: c.id,
        relation: 'CONTAINS_COMPONENT',
        label: 'CONTAINS_COMPONENT',
        confidence: 'confirmed',
        evidence: 'OFFICIAL_DOCUMENTATION',
      });
    }

    for (const tst of pUvm.tests) {
      const tId = `vtest:${pUvm.protocolId}:${tst}`;
      addNodeSafe(store, {
        id: tId,
        nodeType: 'verification_test',
        title: tst,
        subtitle: `${pUvm.protocolId.toUpperCase()} Compliance Sequence`,
        category: 'UVM Sequence / Test',
        summary: `Directed and constrained-random test validating ${pUvm.protocolId.toUpperCase()} protocol compliance.`,
        evidence: 'OFFICIAL_DOCUMENTATION',
        provenance: {},
        specs: [{ label: 'Protocol', value: pUvm.protocolId.toUpperCase() }],
        tags: [tst, pUvm.protocolId],
        appLink: { kind: 'protocol', id: pUvm.protocolId },
      });
      addEdgeSafe(store, {
        id: `edge:${pUvm.envId}:${tId}`,
        source: pUvm.envId,
        target: tId,
        relation: 'TESTED_BY',
        label: 'RUNS_TEST',
        confidence: 'confirmed',
        evidence: 'OFFICIAL_DOCUMENTATION',
      });
    }
  }

  // 8. Add SoC Platforms & Wire SoC -> IP -> Bus -> Memory Paths
  for (const soc of ALL_SOCS) {
    const sNid = socNodeId(soc.id);
    addNodeSafe(store, {
      id: sNid,
      nodeType: 'soc',
      title: soc.name,
      subtitle: `${soc.targetUse} · ${soc.license}`,
      category: 'SoC Architecture',
      summary: soc.summary,
      evidence: 'OBSERVED_IN_RTL',
      provenance: {
        repoUrl: soc.repoUrl,
        filePath: soc.topFile,
      },
      specs: [
        { label: 'Target Use', value: soc.targetUse },
        { label: 'Top-Level RTL', value: soc.topFile },
        { label: 'License', value: soc.license },
        { label: 'Integrated Blocks', value: `${soc.blocks.length}` },
      ],
      projectId: soc.projectId,
      tags: [soc.name, soc.targetUse, soc.topFile],
      appLink: { kind: 'soc', id: soc.id },
    });

    addEdgeSafe(store, {
      id: `edge:proj:${soc.projectId}:${sNid}`,
      source: projectNodeId(soc.projectId),
      target: sNid,
      relation: 'CONTAINS',
      label: 'BUILDS_SOC',
      confidence: 'confirmed',
      evidence: 'OFFICIAL_DOCUMENTATION',
      provenance: { repoUrl: soc.repoUrl, filePath: soc.topFile },
    });

    for (const blk of soc.blocks) {
      if (!blk.ipId) continue;
      const targetIpNid = ipNodeId(blk.ipId);
      if (store.nodes.has(targetIpNid)) {
        addEdgeSafe(store, {
          id: `edge:${targetIpNid}:${sNid}`,
          source: targetIpNid,
          target: sNid,
          relation: 'INTEGRATED_IN',
          label: 'INTEGRATED_IN',
          confidence: blk.documented ? 'confirmed' : 'inferred',
          evidence: blk.documented ? 'OBSERVED_IN_RTL' : 'ENGINEERING_INTERPRETATION',
          notes: `${blk.label} instantiated inside ${soc.name} (${soc.topFile}).`,
          provenance: { filePath: soc.topFile, repoUrl: soc.repoUrl },
        });
      }
    }

    for (const conn of soc.connections) {
      const fromId = ipNodeId(conn.fromIpId);
      const toId = ipNodeId(conn.toIpId);
      const protoId = protocolNodeId(conn.protocolId);
      const isDoc = conn.status === 'Documented in RTL/Top';

      if (store.nodes.has(fromId) && store.nodes.has(toId)) {
        addEdgeSafe(store, {
          id: `edge:${soc.id}:${conn.id}:ip-ip`,
          source: fromId,
          target: toId,
          relation: 'COMMUNICATES_VIA',
          label: conn.protocolLabel,
          confidence: isDoc ? 'confirmed' : 'inferred',
          evidence: isDoc ? 'OBSERVED_IN_RTL' : 'ENGINEERING_INTERPRETATION',
          notes: `${soc.name}: ${conn.notes}`,
          provenance: { filePath: soc.topFile, repoUrl: soc.repoUrl },
        });
      }

      if (store.nodes.has(fromId) && store.nodes.has(protoId)) {
        addEdgeSafe(store, {
          id: `edge:${soc.id}:${conn.id}:from-proto`,
          source: fromId,
          target: protoId,
          relation: 'COMMUNICATES_VIA',
          label: `VIA ${conn.protocolLabel}`,
          confidence: isDoc ? 'confirmed' : 'inferred',
          evidence: isDoc ? 'OBSERVED_IN_RTL' : 'ENGINEERING_INTERPRETATION',
          notes: conn.notes,
        });
      }
    }
  }

  return store;
}

export function getKnowledgeGraph(): KnowledgeGraphStore {
  if (!cachedGraph) {
    cachedGraph = buildKnowledgeGraph();
  }
  return cachedGraph;
}

export function resetKnowledgeGraphCache() {
  cachedGraph = null;
}

export function defaultKgFilters(): KgFilterState {
  return {
    nodeTypes: new Set<KgNodeType>([
      'protocol',
      'ip_core',
      'processor',
      'soc',
      'rtl_module',
      'rtl_signal',
      'verification_env',
      'uvm_component',
      'verification_test',
      'standard',
      'register',
      'eda_tool',
      'project',
      'memory',
      'security',
    ]),
    evidenceLevels: new Set<KgEvidenceLabel>([
      'OFFICIAL_SPECIFICATION',
      'OFFICIAL_DOCUMENTATION',
      'OBSERVED_IN_RTL',
      'OBSERVED_IN_VERIFICATION',
      'DERIVED_FROM_RTL',
      'ENGINEERING_INTERPRETATION',
      'EDUCATIONAL_EXAMPLE',
      'UNVERIFIED',
    ]),
    confidences: new Set<KgEdgeConfidence>(['confirmed', 'inferred', 'association']),
    projectId: 'ALL',
    protocolFilter: 'ALL',
    standardFilter: 'ALL',
  };
}

export function getModeCenterNodes(mode: KgExplorationMode): string[] {
  switch (mode) {
    case 'Protocol-Centric':
      return ['proto:axi4', 'proto:tl-ul', 'proto:pcie-gen5', 'proto:ddr5'];
    case 'IP-Centric':
      return ['ip:opentitan-aes', 'ip:gemmini', 'ip:pulp-axi'];
    case 'Processor-Centric':
      return ['ip:ibex', 'ip:cva6', 'ip:rocket-chip'];
    case 'SoC-Centric':
      return ['soc:earlgrey', 'soc:chipyard-gemmini', 'soc:pulp-cluster'];
    case 'RTL-Centric':
      return ['mod:ibex:ibex_top', 'mod:ibex:ibex_core', 'mod:opentitan-aes:aes'];
    case 'Verification-Centric':
      return ['uvm-env:axi4', 'venv:ibex', 'venv:opentitan-aes'];
    case 'Standards-Centric':
      return ['std:arm-amba', 'std:ieee-1800', 'std:ieee-1800-2', 'std:riscv-isa'];
  }
}

export function getNeighborhoodSubgraph(
  store: KnowledgeGraphStore,
  seedNodeIds: string[],
  hops: number,
  filters: KgFilterState,
  maxNodes = 36
): { nodes: KgNode[]; edges: KgEdge[] } {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [];

  for (const sid of seedNodeIds) {
    if (store.nodes.has(sid) && !visited.has(sid)) {
      visited.add(sid);
      queue.push({ id: sid, depth: 0 });
    }
  }

  let head = 0;
  while (head < queue.length && visited.size < maxNodes) {
    const { id, depth } = queue[head++];
    if (depth >= hops) continue;

    const adj = [
      ...(store.outgoing.get(id) || []).map((e) => ({ edge: e, nextId: e.target })),
      ...(store.incoming.get(id) || []).map((e) => ({ edge: e, nextId: e.source })),
    ];

    // Sort confirmed edges before inferred, and avoid flooding with minor register/signal leaves first
    adj.sort((a, b) => {
      const score = (e: KgEdge, nid: string) => {
        const n = store.nodes.get(nid);
        let s = e.confidence === 'confirmed' ? 0 : 10;
        if (n?.nodeType === 'register') s += 4;
        if (n?.nodeType === 'rtl_signal') s += 3;
        return s;
      };
      return score(a.edge, a.nextId) - score(b.edge, b.nextId);
    });

    for (const { edge, nextId } of adj) {
      if (visited.size >= maxNodes) break;
      if (!filters.confidences.has(edge.confidence)) continue;
      if (!filters.evidenceLevels.has(edge.evidence)) continue;

      const candidate = store.nodes.get(nextId);
      if (!candidate) continue;
      if (!filters.nodeTypes.has(candidate.nodeType)) continue;
      if (filters.projectId !== 'ALL' && candidate.projectId && candidate.projectId !== filters.projectId) {
        // Keep central protocols & standards visible even if filtering by project
        if (candidate.nodeType !== 'protocol' && candidate.nodeType !== 'standard' && candidate.nodeType !== 'eda_tool') {
          continue;
        }
      }

      if (!visited.has(nextId)) {
        visited.add(nextId);
        queue.push({ id: nextId, depth: depth + 1 });
      }
    }
  }

  const nodes = Array.from(visited)
    .map((id) => store.nodes.get(id)!)
    .filter(Boolean);

  const edges = store.edges.filter(
    (e) =>
      visited.has(e.source) &&
      visited.has(e.target) &&
      filters.confidences.has(e.confidence) &&
      filters.evidenceLevels.has(e.evidence)
  );

  return { nodes, edges };
}

export function findShortestPathBFS(
  store: KnowledgeGraphStore,
  startId: string,
  endId: string,
  maxHops = 6
): { found: boolean; nodeIds: string[]; edgeIds: string[] } {
  if (!store.nodes.has(startId) || !store.nodes.has(endId)) {
    return { found: false, nodeIds: [], edgeIds: [] };
  }
  if (startId === endId) {
    return { found: true, nodeIds: [startId], edgeIds: [] };
  }

  const visited = new Set<string>([startId]);
  const parent = new Map<string, { prevId: string; edgeId: string }>();
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

  let head = 0;
  while (head < queue.length) {
    const { id, depth } = queue[head++];
    if (depth >= maxHops) continue;

    const adj = [
      ...(store.outgoing.get(id) || []).map((e) => ({ nextId: e.target, edge: e })),
      ...(store.incoming.get(id) || []).map((e) => ({ nextId: e.source, edge: e })),
    ];

    for (const { nextId, edge } of adj) {
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      parent.set(nextId, { prevId: id, edgeId: edge.id });
      if (nextId === endId) {
        const nodeIds: string[] = [endId];
        const edgeIds: string[] = [];
        let cur = endId;
        while (cur !== startId) {
          const p = parent.get(cur)!;
          edgeIds.push(p.edgeId);
          nodeIds.push(p.prevId);
          cur = p.prevId;
        }
        return {
          found: true,
          nodeIds: nodeIds.reverse(),
          edgeIds: edgeIds.reverse(),
        };
      }
      queue.push({ id: nextId, depth: depth + 1 });
    }
  }

  return { found: false, nodeIds: [], edgeIds: [] };
}

export function searchGraphNodes(
  store: KnowledgeGraphStore,
  query: string,
  filters?: KgFilterState,
  limit = 60
): KgNode[] {
  const q = query.trim().toLowerCase();
  const res: KgNode[] = [];
  for (const n of store.nodes.values()) {
    if (filters) {
      if (!filters.nodeTypes.has(n.nodeType)) continue;
      if (!filters.evidenceLevels.has(n.evidence)) continue;
      if (
        filters.projectId !== 'ALL' &&
        n.projectId &&
        n.projectId !== filters.projectId &&
        n.nodeType !== 'protocol' &&
        n.nodeType !== 'standard'
      ) {
        continue;
      }
    }
    if (!q) {
      res.push(n);
    } else if (
      n.title.toLowerCase().includes(q) ||
      n.subtitle.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    ) {
      res.push(n);
    }
    if (res.length >= limit) break;
  }
  return res;
}

export const EXAMPLE_INTELLIGENCE_QUERIES: string[] = [
  'Show all SoCs that use Ibex',
  'Which IPs use TL-UL?',
  'Which protocols are implemented in OpenTitan?',
  'Which modules are inside ibex_core?',
  'Which verification frameworks verify OpenTitan AES?',
  'Which UVM components exist for AXI4?',
  'Which standards apply to PCIe?',
  'Which assertions validate AXI4?',
  'Which processors support RISC-V?',
  'Which SoCs use TileLink?',
  'Which EDA tools simulate Ibex?',
  'How does Ibex communicate with memory in OpenTitan?',
  'Show the complete path from protocol specification to verification environment for AXI4',
];

export function runNaturalLanguageQuery(store: KnowledgeGraphStore, rawQuery: string): KgQueryResult {
  const q = rawQuery.trim();
  const ql = q.toLowerCase();

  // Pattern 1: Shortest path / how does X communicate with Y
  if ((ql.includes('ibex') && ql.includes('memory')) || (ql.includes('ibex') && ql.includes('opentitan') && ql.includes('communicate'))) {
    const path = findShortestPathBFS(store, 'ip:ibex', 'ip:opentitan-sram-ctrl', 5);
    const nodesInPath = path.nodeIds.map((id) => store.nodes.get(id)?.title || id);
    return {
      query: q,
      interpretation: 'Multi-Hop Silicon Data-Path Resolution (Ibex -> Bus Fabric -> Memory Controller in OpenTitan EarlGrey)',
      matchedNodeIds: path.found ? path.nodeIds : ['ip:ibex', 'ip:opentitan-tlul-xbar', 'ip:opentitan-sram-ctrl', 'soc:earlgrey', 'proto:tl-ul'],
      highlightEdgeIds: path.edgeIds,
      centerNodeId: 'ip:ibex',
      modeRecommendation: 'SoC-Centric',
      explanationBullets: [
        path.found ? `Verified Path: ${nodesInPath.join(' -> ')}` : 'Ibex -> TL-UL Integrity -> OpenTitan xbar_main -> SRAM/ROM Controller',
        'Ibex issues instruction/data requests on OBI, adapted by tlul_adapter_host onto SECDED-protected TL-UL Integrity.',
        'OpenTitan xbar_main routes authenticated TL-UL transactions directly to opentitan-sram-ctrl.',
      ],
    };
  }

  // Pattern 2: Complete path from protocol specification to verification environment for AXI4
  if (ql.includes('path') && (ql.includes('axi4') || ql.includes('axi')) && ql.includes('verification')) {
    const path = findShortestPathBFS(store, 'std:arm-amba', 'uvm-comp:axi4-sb', 5);
    return {
      query: q,
      interpretation: 'End-to-End Traceability: Specification -> Protocol -> VIP Environment -> Scoreboard/Assertions',
      matchedNodeIds: ['std:arm-amba', 'proto:axi4', 'uvm-env:axi4', 'uvm-comp:axi4-drv', 'uvm-comp:axi4-mon', 'uvm-comp:axi4-sb', 'std:ieee-1800-2'],
      highlightEdgeIds: path.edgeIds,
      centerNodeId: 'proto:axi4',
      modeRecommendation: 'Verification-Centric',
      explanationBullets: [
        'Specification: ARM AMBA Architecture (IHI 0022) defines AXI4 5-channel handshake.',
        'Protocol: AXI4 binds to AMBA AXI4 UVM Verification Environment (IEEE 1800.2).',
        'Verification: axi4_master_driver, axi4_monitor, and axi4_scoreboard validate SVA rules and OOO bursts.',
      ],
    };
  }

  // Pattern 3: Show all SoCs that use Ibex
  if (ql.includes('soc') && ql.includes('ibex')) {
    const edges = [...(store.outgoing.get('ip:ibex') || []), ...(store.incoming.get('ip:ibex') || [])].filter(
      (e) => store.nodes.get(e.source)?.nodeType === 'soc' || store.nodes.get(e.target)?.nodeType === 'soc'
    );
    const socIds = edges.map((e) => (e.source === 'ip:ibex' ? e.target : e.source));
    return {
      query: q,
      interpretation: 'SoC Integration Lookup for Ibex RV32 Core',
      matchedNodeIds: ['ip:ibex', ...socIds],
      highlightEdgeIds: edges.map((e) => e.id),
      centerNodeId: 'ip:ibex',
      modeRecommendation: 'SoC-Centric',
      explanationBullets: socIds.map((id) => `${store.nodes.get(id)?.title}: Integrates Ibex core via verified RTL top wrapper.`),
    };
  }

  // Pattern 4: Which IPs use TL-UL?
  if (ql.includes('tl-ul') || ql.includes('tlul')) {
    const pId = 'proto:tl-ul';
    const related = [...(store.incoming.get(pId) || []), ...(store.outgoing.get(pId) || [])];
    const ipIds = Array.from(
      new Set(
        related
          .map((e) => (e.source === pId ? e.target : e.source))
          .filter((id) => {
            const t = store.nodes.get(id)?.nodeType;
            return t === 'ip_core' || t === 'processor' || t === 'security' || t === 'memory';
          })
      )
    );
    return {
      query: q,
      interpretation: 'Protocol Consumer Query: Open-Source IPs implementing/using TileLink Uncached Lightweight (TL-UL)',
      matchedNodeIds: [pId, ...ipIds],
      highlightEdgeIds: related.map((e) => e.id),
      centerNodeId: pId,
      modeRecommendation: 'Protocol-Centric',
      explanationBullets: ipIds.slice(0, 6).map((id) => `${store.nodes.get(id)?.title} (${store.nodes.get(id)?.subtitle})`),
    };
  }

  // Pattern 5: Which protocols are implemented in OpenTitan?
  if (ql.includes('protocol') && ql.includes('opentitan')) {
    const otIps = Array.from(store.nodes.values()).filter((n) => n.projectId === 'opentitan' && n.nodeType !== 'rtl_module' && n.nodeType !== 'register');
    const protoIds = new Set<string>();
    const edgeIds: string[] = [];
    for (const ip of otIps) {
      for (const e of store.outgoing.get(ip.id) || []) {
        if (store.nodes.get(e.target)?.nodeType === 'protocol') {
          protoIds.add(e.target);
          edgeIds.push(e.id);
        }
      }
    }
    return {
      query: q,
      interpretation: 'Project-Wide Protocol Footprint: OpenTitan',
      matchedNodeIds: ['soc:earlgrey', ...Array.from(protoIds), ...otIps.slice(0, 5).map((i) => i.id)],
      highlightEdgeIds: edgeIds,
      centerNodeId: 'soc:earlgrey',
      modeRecommendation: 'SoC-Centric',
      explanationBullets: Array.from(protoIds).map((id) => `${store.nodes.get(id)?.title} — ${store.nodes.get(id)?.subtitle}`),
    };
  }

  // Pattern 6: Which modules are inside ibex_core?
  if (ql.includes('module') && ql.includes('ibex')) {
    const coreId = 'mod:ibex:ibex_core';
    const childEdges = (store.outgoing.get(coreId) || []).filter((e) => e.relation === 'INSTANTIATES');
    const childIds = childEdges.map((e) => e.target);
    return {
      query: q,
      interpretation: 'RTL Module Hierarchy Inspection: ibex_core submodules',
      matchedNodeIds: ['mod:ibex:ibex_top', coreId, ...childIds],
      highlightEdgeIds: childEdges.map((e) => e.id),
      centerNodeId: coreId,
      modeRecommendation: 'RTL-Centric',
      explanationBullets: childIds.map((id) => `${store.nodes.get(id)?.title} (${store.nodes.get(id)?.provenance.filePath || 'RTL'})`),
    };
  }

  // Pattern 7: OpenTitan AES verification frameworks
  if (ql.includes('aes') && (ql.includes('verif') || ql.includes('uvm'))) {
    const aesId = 'ip:opentitan-aes';
    const vEdges = (store.outgoing.get(aesId) || []).filter((e) => e.relation === 'VERIFIED_BY' || e.relation === 'TESTED_BY');
    const vIds = vEdges.map((e) => e.target);
    const subEdges = vIds.flatMap((vid) => store.outgoing.get(vid) || []);
    return {
      query: q,
      interpretation: 'Verification Infrastructure Trace for OpenTitan AES',
      matchedNodeIds: [aesId, ...vIds, ...subEdges.map((e) => e.target)],
      highlightEdgeIds: [...vEdges, ...subEdges].map((e) => e.id),
      centerNodeId: aesId,
      modeRecommendation: 'Verification-Centric',
      explanationBullets: [
        'Framework: OpenTitan dvsim + UVM (IEEE 1800.2) + JasperGold FPV formal.',
        'Assertions check masking fault resistance, shadowed CSR writes, and TL-UL integrity.',
      ],
    };
  }

  // Pattern 8: UVM components or assertions for AXI4
  if ((ql.includes('uvm') || ql.includes('assertion')) && ql.includes('axi')) {
    const envId = 'uvm-env:axi4';
    const edges = store.outgoing.get(envId) || [];
    return {
      query: q,
      interpretation: 'AXI4 Verification Architecture & SVA Compliance Matrix',
      matchedNodeIds: ['proto:axi4', envId, ...edges.map((e) => e.target), 'std:ieee-1800'],
      highlightEdgeIds: edges.map((e) => e.id),
      centerNodeId: envId,
      modeRecommendation: 'Verification-Centric',
      explanationBullets: (store.nodes.get('proto:axi4')?.assertions || []).slice(0, 5),
    };
  }

  // Pattern 9: Standards applying to PCIe
  if (ql.includes('standard') && ql.includes('pcie')) {
    const pId = 'proto:pcie-gen5';
    const stdEdges = (store.outgoing.get(pId) || []).filter((e) => e.relation === 'DEFINED_BY');
    const related = (store.incoming.get('std:pci-sig') || []).map((e) => e.source).slice(0, 8);
    return {
      query: q,
      interpretation: 'Governing Standards & PCIe Layer Protocols',
      matchedNodeIds: ['std:pci-sig', pId, ...related],
      highlightEdgeIds: stdEdges.map((e) => e.id),
      centerNodeId: 'std:pci-sig',
      modeRecommendation: 'Standards-Centric',
      explanationBullets: ['Governed by PCI-SIG PCIe Base Spec 5.0/6.0/7.0 across Transaction, Data Link, and Physical layers.'],
    };
  }

  // Pattern 10: Processors supporting RISC-V
  if (ql.includes('processor') && ql.includes('risc-v')) {
    const procs = Array.from(store.nodes.values()).filter((n) => n.nodeType === 'processor');
    return {
      query: q,
      interpretation: 'Open-Source RISC-V & Compute Processor Portfolio',
      matchedNodeIds: ['std:riscv-isa', ...procs.map((p) => p.id)],
      highlightEdgeIds: (store.incoming.get('std:riscv-isa') || []).map((e) => e.id),
      centerNodeId: 'std:riscv-isa',
      modeRecommendation: 'Processor-Centric',
      explanationBullets: procs.map((p) => `${p.title} — ${p.subtitle}`),
    };
  }

  // Pattern 11: SoCs using TileLink
  if (ql.includes('soc') && ql.includes('tilelink')) {
    return {
      query: q,
      interpretation: 'SoC Platforms Implementing TileLink / TL-UL Fabrics',
      matchedNodeIds: ['proto:tilelink', 'proto:tl-ul', 'soc:earlgrey', 'soc:chipyard-gemmini', 'ip:rocket-chip', 'ip:opentitan-tlul-xbar'],
      highlightEdgeIds: [],
      centerNodeId: 'proto:tilelink',
      modeRecommendation: 'SoC-Centric',
      explanationBullets: [
        'Chipyard (Rocket / BOOM + Gemmini): Uses full cached/coherent TileLink TL-C SystemBus & L2.',
        'OpenTitan EarlGrey: Uses SECDED-protected TileLink Uncached Lightweight (TL-UL) Integrity crossbars.',
      ],
    };
  }

  // Pattern 12: EDA tools simulating Ibex
  if ((ql.includes('eda') || ql.includes('tool') || ql.includes('simulat')) && ql.includes('ibex')) {
    const venv = 'venv:ibex';
    const toolEdges = (store.outgoing.get(venv) || []).filter((e) => e.relation === 'USES_TOOL');
    return {
      query: q,
      interpretation: 'EDA Simulation, Synthesis & Build Toolchain for Ibex',
      matchedNodeIds: ['ip:ibex', venv, ...toolEdges.map((e) => e.target)],
      highlightEdgeIds: toolEdges.map((e) => e.id),
      centerNodeId: venv,
      modeRecommendation: 'Verification-Centric',
      explanationBullets: toolEdges.map((e) => `${store.nodes.get(e.target)?.title} — ${store.nodes.get(e.target)?.subtitle}`),
    };
  }

  // General Keyword / Entity Lookup Fallback
  const matches = searchGraphNodes(store, q, undefined, 16);
  const center = matches[0]?.id || 'proto:axi4';
  return {
    query: q,
    interpretation: matches.length
      ? `Semantic Graph Search matched ${matches.length} semiconductor entities`
      : 'No exact entity match — showing AXI4 Protocol Hub',
    matchedNodeIds: matches.map((m) => m.id),
    highlightEdgeIds: [],
    centerNodeId: center,
    explanationBullets: matches.slice(0, 5).map((m) => `${m.title} (${m.nodeType.replace('_', ' ')}) — ${m.subtitle}`),
  };
}

export function ingestRepoProfileIntoGraph(
  store: KnowledgeGraphStore,
  profile: RepoIngestionProfile
): { centerNodeId: string; addedNodes: number; addedEdges: number } {
  let addedNodes = 0;
  let addedEdges = 0;

  const slug = profile.repoName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const rootId = `ingested:ip:${slug}`;

  if (!store.nodes.has(rootId)) addedNodes++;
  addNodeSafe(store, {
    id: rootId,
    nodeType: 'ip_core',
    title: `${profile.repoName} (Live Ingested)`,
    subtitle: `${profile.detectedLanguages.join(', ') || 'RTL'} · ${profile.modules.length} modules`,
    category: 'Live Repository Ingestion',
    summary: profile.description || `Extracted directly from ${profile.repoUrl} using AST/header structural parsing.`,
    evidence: 'OBSERVED_IN_RTL',
    provenance: {
      repoUrl: profile.repoUrl,
      branch: profile.defaultBranch,
    },
    specs: [
      { label: 'Source', value: profile.repoUrl },
      { label: 'License', value: profile.license || 'Check LICENSE' },
      { label: 'Modules', value: `${profile.modules.length}` },
      { label: 'CSRs Found', value: `${profile.registers.length}` },
    ],
    tags: [profile.repoName, ...profile.detectedProtocols, ...profile.detectedLanguages],
    isUserIngested: true,
  });

  // Link detected protocols
  for (const protoName of profile.detectedProtocols) {
    const pNorm = protoName.toLowerCase();
    const targetProto = Array.from(store.nodes.values()).find(
      (n) => n.nodeType === 'protocol' && (n.title.toLowerCase() === pNorm || n.id === `proto:${pNorm}`)
    );
    if (targetProto) {
      addEdgeSafe(store, {
        id: `edge:${rootId}:${targetProto.id}`,
        source: rootId,
        target: targetProto.id,
        relation: 'IMPLEMENTS',
        label: `INFERRED_${protoName}`,
        confidence: 'inferred',
        evidence: 'DERIVED_FROM_RTL',
        notes: 'Inferred from RTL port names via signal pattern heuristic.',
        isUserIngested: true,
      });
      addedEdges++;
    }
  }

  // Add parsed modules & child instantiations
  for (const mod of profile.modules) {
    const mId = `ingested:mod:${slug}:${mod.name}`;
    if (!store.nodes.has(mId)) addedNodes++;
    addNodeSafe(store, {
      id: mId,
      nodeType: 'rtl_module',
      title: mod.name,
      subtitle: `${mod.filePath} · ${mod.format}`,
      category: 'Ingested RTL Module',
      summary: `Extracted ${mod.ports.length} ports, ${mod.parameters.length} parameters, ${mod.assertions.length} SVA checks.`,
      evidence: 'OBSERVED_IN_RTL',
      provenance: {
        repoUrl: profile.repoUrl,
        filePath: mod.filePath,
      },
      specs: [
        { label: 'File Path', value: mod.filePath },
        { label: 'Ports', value: `${mod.ports.length}` },
        { label: 'Assertions', value: `${mod.assertions.length}` },
      ],
      parameters: mod.parameters.map((p) => ({ name: p.name, value: p.defaultValue })),
      assertions: mod.assertions,
      tags: [mod.name, ...mod.detectedProtocols],
      isUserIngested: true,
    });

    addEdgeSafe(store, {
      id: `edge:${rootId}:${mId}`,
      source: rootId,
      target: mId,
      relation: 'IMPLEMENTED_BY',
      label: 'IMPLEMENTED_BY',
      confidence: 'confirmed',
      evidence: 'OBSERVED_IN_RTL',
      provenance: { filePath: mod.filePath },
      isUserIngested: true,
    });
    addedEdges++;

    for (const inst of mod.instantiations) {
      const childId = `ingested:mod:${slug}:${inst.moduleType}`;
      if (!store.nodes.has(childId)) {
        addedNodes++;
        addNodeSafe(store, {
          id: childId,
          nodeType: 'rtl_module',
          title: inst.moduleType,
          subtitle: `Instantiated as ${inst.instanceName}`,
          category: 'Inferred Child Module',
          summary: `Module type ${inst.moduleType} instantiated inside ${mod.name} (${mod.filePath}).`,
          evidence: 'DERIVED_FROM_RTL',
          provenance: { repoUrl: profile.repoUrl, filePath: mod.filePath },
          specs: [{ label: 'Instance Name', value: inst.instanceName }],
          tags: [inst.moduleType],
          isUserIngested: true,
        });
      }
      addEdgeSafe(store, {
        id: `edge:${mId}:${childId}:${inst.instanceName}`,
        source: mId,
        target: childId,
        relation: 'INSTANTIATES',
        label: `INSTANTIATES (${inst.instanceName})`,
        confidence: 'confirmed',
        evidence: 'OBSERVED_IN_RTL',
        isUserIngested: true,
      });
      addedEdges++;
    }
  }

  // Add UVM artifacts
  for (const uvm of profile.uvmComponents.slice(0, 6)) {
    const uId = `ingested:uvm:${slug}:${uvm.replace(/[^a-zA-Z0-9]+/g, '_')}`;
    if (!store.nodes.has(uId)) addedNodes++;
    addNodeSafe(store, {
      id: uId,
      nodeType: 'uvm_component',
      title: uvm,
      subtitle: 'Extracted UVM Class',
      category: 'Ingested Verification',
      summary: `Extracted from ${profile.repoName} verification files.`,
      evidence: 'OBSERVED_IN_VERIFICATION',
      provenance: { repoUrl: profile.repoUrl },
      specs: [{ label: 'Source Repo', value: profile.repoName }],
      tags: [uvm, 'UVM'],
      isUserIngested: true,
    });
    addEdgeSafe(store, {
      id: `edge:${rootId}:${uId}`,
      source: rootId,
      target: uId,
      relation: 'VERIFIED_BY',
      label: 'VERIFIED_BY',
      confidence: 'confirmed',
      evidence: 'OBSERVED_IN_VERIFICATION',
      isUserIngested: true,
    });
    addedEdges++;
  }

  return { centerNodeId: rootId, addedNodes, addedEdges };
}

export function exportGraphToJson(nodes: KgNode[], edges: KgEdge[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      platform: 'VLSI Protocol Atlas — Semiconductor Knowledge Graph',
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes,
      edges,
    },
    null,
    2
  );
}

export function exportEdgesToCsv(store: KnowledgeGraphStore, edges: KgEdge[]): string {
  const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
  const header = 'SourceID,SourceTitle,Relation,TargetID,TargetTitle,Confidence,Evidence,Notes';
  const rows = edges.map((e) => {
    const src = store.nodes.get(e.source);
    const tgt = store.nodes.get(e.target);
    return [
      esc(e.source),
      esc(src?.title || e.source),
      esc(e.relation),
      esc(e.target),
      esc(tgt?.title || e.target),
      esc(e.confidence),
      esc(e.evidence),
      esc(e.notes || ''),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export function exportEntityToMarkdown(store: KnowledgeGraphStore, node: KgNode): string {
  const outEdges = store.outgoing.get(node.id) || [];
  const inEdges = store.incoming.get(node.id) || [];
  const lines: string[] = [
    `# ${node.title}`,
    `> ${node.subtitle} · Node Type: \`${node.nodeType}\` · Evidence: \`${node.evidence}\``,
    '',
    '## Overview',
    node.summary,
    '',
  ];
  if (node.architectureDescription) {
    lines.push('## Architecture', node.architectureDescription, '');
  }
  if (node.specs.length > 0) {
    lines.push('## Technical Specifications');
    node.specs.forEach((s) => lines.push(`- **${s.label}**: ${s.value}`));
    lines.push('');
  }
  if (outEdges.length > 0) {
    lines.push('## Outgoing Relationships');
    outEdges.forEach((e) => {
      const t = store.nodes.get(e.target);
      lines.push(`- \`${e.relation}\` → **${t?.title || e.target}** [${e.confidence} / ${e.evidence}]`);
    });
    lines.push('');
  }
  if (inEdges.length > 0) {
    lines.push('## Incoming Relationships');
    inEdges.forEach((e) => {
      const s = store.nodes.get(e.source);
      lines.push(`- **${s?.title || e.source}** → \`${e.relation}\` [${e.confidence} / ${e.evidence}]`);
    });
    lines.push('');
  }
  if (node.provenance.repoUrl || node.provenance.filePath || node.provenance.standardNumber) {
    lines.push('## Provenance & Source');
    if (node.provenance.standardNumber) lines.push(`- Standard: ${node.provenance.standardNumber}`);
    if (node.provenance.repoUrl) lines.push(`- Repository: ${node.provenance.repoUrl}`);
    if (node.provenance.filePath) lines.push(`- File Path: \`${node.provenance.filePath}\``);
    if (node.provenance.officialUrl) lines.push(`- Reference URL: ${node.provenance.officialUrl}`);
  }
  return lines.join('\n');
}

export function exportSubgraphToMermaid(nodes: KgNode[], edges: KgEdge[]): string {
  const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, '_');
  const lines: string[] = ['flowchart LR'];
  nodes.forEach((n) => {
    lines.push(`  ${safeId(n.id)}["${n.title.replace(/"/g, "'")}\\n(${n.nodeType})"]`);
  });
  edges.forEach((e) => {
    const arrow = e.confidence === 'confirmed' ? '-->' : '-.->';
    lines.push(`  ${safeId(e.source)} ${arrow}|${e.relation}| ${safeId(e.target)}`);
  });
  return lines.join('\n');
}
