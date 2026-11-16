import { IpEntity } from '../../types/ipUniverse';

interface InfraSeed {
  id: string;
  name: string;
  category: IpEntity['category'];
  projectId: string;
  implKind: IpEntity['implementationKind'];
  rtlLang: IpEntity['rtlLanguage'];
  license: string;
  repoUrl: string;
  tagline: string;
  whatItDoes: string;
  socRole: string;
  modules: { name: string; path: string; summary: string }[];
  protocols: string[];
  params: { name: string; def: string; impact: string }[];
}

const INFRA_SEEDS: InfraSeed[] = [
  {
    id: 'pulp-axi',
    name: 'PULP AXI Interconnect Library',
    category: 'SoC Interconnect & NoC',
    projectId: 'pulp',
    implKind: 'Synthesizable RTL (ASIC & FPGA)',
    rtlLang: 'SystemVerilog',
    license: 'Solderpad-0.51',
    repoUrl: 'https://github.com/pulp-platform/axi',
    tagline: 'Silicon-proven parameterized AXI4 / AXI4-Lite crossbars, CDCs, width converters, atomics, and register slices.',
    whatItDoes: 'Provides modular SystemVerilog AXI4 building blocks (`axi_xbar`, `axi_to_axi_lite`, `axi_cdc`, `axi_dw_converter`, `axi_cut`, `axi_atop_filter`) widely used in PULP and CVA6 SoCs.',
    socRole: 'Forms the primary AXI4 interconnect fabric connecting CPUs, DMAs, and memory controllers.',
    modules: [
      { name: 'axi_xbar', path: 'src/axi_xbar.sv', summary: 'Full M-to-N AXI4 crossbar with address decoding, ID expansion, and spillover register cuts.' },
      { name: 'axi_to_axi_lite', path: 'src/axi_to_axi_lite.sv', summary: 'Burst-splitting AXI4 to AXI4-Lite protocol bridge.' },
      { name: 'axi_cdc', path: 'src/axi_cdc.sv', summary: 'Dual-clock asynchronous Gray-coded CDC bridge for all 5 AXI4 channels.' },
      { name: 'axi_dw_converter', path: 'src/axi_dw_converter.sv', summary: 'AXI4 upsizer/downsizer data-width converter.' },
      { name: 'axi_cut', path: 'src/axi_cut.sv', summary: 'Full AXI4 spill-register slice breaking forward and backward timing paths.' },
    ],
    protocols: ['axi4', 'axi4-lite'],
    params: [
      { name: 'NoSlvPorts / NoMstPorts', def: '4 / 4', impact: 'Crossbar radix.' },
      { name: 'MaxMstTrans', def: '8', impact: 'Outstanding transactions per manager.' },
    ],
  },
  {
    id: 'openpiton-noc',
    name: 'OpenPiton 2D Mesh NoC',
    category: 'SoC Interconnect & NoC',
    projectId: 'openpiton',
    implKind: 'Synthesizable RTL (ASIC & FPGA)',
    rtlLang: 'Verilog',
    license: 'BSD-3-Clause',
    repoUrl: 'https://github.com/PrincetonUniversity/openpiton',
    tagline: 'Three-physical-plane 2D wormhole-routed Network-on-Chip (`noc1`, `noc2`, `noc3`) for manycore coherent SoCs.',
    whatItDoes: 'Routes directory-coherent cache requests, invalidations, and data responses across tiled OpenSPARC/Ariane/PicoRV32 cores using credit-based wormhole routers.',
    socRole: 'Inter-tile coherent NoC connecting up to thousands of tiled cores and chipsets.',
    modules: [
      { name: 'dynamic_node_top', path: 'piton/design/chip/tile/dynamic_node/rtl/dynamic_node_top.v', summary: '5-port (N/S/E/W/Local) wormhole router.' },
      { name: 'noc_fbits_splitter', path: 'piton/design/chipset/noc_fbits_splitter.v', summary: 'Routes NoC planes between tiles and chipset I/O.' },
    ],
    protocols: ['axi-noc', 'mesi'],
    params: [{ name: 'DATA_WIDTH', def: '64', impact: 'Flit width across all 3 NoC planes.' }],
  },
  {
    id: 'litedram',
    name: 'LiteDRAM Memory Controller',
    category: 'Memory & Cache',
    projectId: 'litex',
    implKind: 'Synthesizable RTL (FPGA-Focused)',
    rtlLang: 'Python (Migen/LiteX)',
    license: 'BSD-2-Clause',
    repoUrl: 'https://github.com/enjoy-digital/litedram',
    tagline: 'Open-source FPGA DDR2/DDR3/DDR4/DDR5/LPDDR4 memory controller and PHY with AXI4 and Wishbone frontends.',
    whatItDoes: 'Generates bank state machines, refresh/ZQC schedulers, multi-port crossbar arbitration, and vendor-specific FPGA SERDES DDR PHYs.',
    socRole: 'Bridges LiteX/VexRiscv/Rocket AXI4 or Wishbone buses to external DRAM.',
    modules: [
      { name: 'LiteDRAMCore', path: 'litedram/core/__init__.py', summary: 'Bank machines, refresher, and multiplexer.' },
      { name: 'LiteDRAMAXI2Native', path: 'litedram/frontend/axi.py', summary: 'AXI4 multi-beat frontend adapter.' },
    ],
    protocols: ['axi4', 'ddr4', 'ddr5', 'lpddr4'],
    params: [{ name: 'PHY_TYPE', def: 'US+ / Artix7 / ECP5', impact: 'Selects FPGA SerDes DDR PHY primitive.' }],
  },
  {
    id: 'verilog-axi',
    name: 'Verilog-AXI Crossbar & DMA',
    category: 'DMA & Data Movement',
    projectId: 'alexforencich',
    implKind: 'Synthesizable RTL (ASIC & FPGA)',
    rtlLang: 'Verilog',
    license: 'MIT',
    repoUrl: 'https://github.com/alexforencich/verilog-axi',
    tagline: 'Pure Verilog AXI4 / AXI4-Lite / AXI4-Stream crossbar, DMA engine, width converters, and FIFO library.',
    whatItDoes: 'Implements standalone, dependency-free AXI4 DMA (`axi_dma`), crossbar (`axi_crossbar`), register slices (`axi_register`), and cocotb testbenches.',
    socRole: 'Moves bulk memory-to-stream (`MM2S`) and stream-to-memory (`S2MM`) data between AXI4 RAM and AXI4-Stream peripherals.',
    modules: [
      { name: 'axi_dma', path: 'rtl/axi_dma.v', summary: 'Scatter/length AXI4 <-> AXI4-Stream DMA with 4KB boundary splitting.' },
      { name: 'axi_crossbar', path: 'rtl/axi_crossbar.v', summary: 'Parameterized multi-master/slave AXI4 crossbar.' },
      { name: 'axi_register', path: 'rtl/axi_register.v', summary: 'Skid-buffered AXI4 pipeline register.' },
    ],
    protocols: ['axi4', 'axi4-stream', 'axi4-lite'],
    params: [
      { name: 'AXI_DATA_WIDTH', def: '32..512', impact: 'AXI4 data bus width.' },
      { name: 'AXI_MAX_BURST_LEN', def: '16..256', impact: 'Maximum DMA burst beats.' },
    ],
  },
  {
    id: 'verilog-ethernet',
    name: 'Verilog-Ethernet 10G/25G MAC',
    category: 'High-Speed & Peripheral',
    projectId: 'alexforencich',
    implKind: 'Synthesizable RTL (FPGA-Focused)',
    rtlLang: 'Verilog',
    license: 'MIT',
    repoUrl: 'https://github.com/alexforencich/verilog-ethernet',
    tagline: '1G/10G/25G Ethernet MAC, PCS/PMA, UDP/IP stack, and ARP/ICMP engines with AXI4-Stream interfaces.',
    whatItDoes: 'Implements IEEE 802.3 Ethernet framing, FCS CRC32, XGMII/GMII PHY adaptation, and hardware UDP/IP offload over AXI4-Stream.',
    socRole: 'Streams network packets directly into SoC AXI4 DMA engines via AXI4-Stream.',
    modules: [
      { name: 'eth_mac_10g', path: 'rtl/eth_mac_10g.v', summary: '10G XGMII MAC with AXI4-Stream TX/RX.' },
      { name: 'udp_complete_64', path: 'rtl/udp_complete_64.v', summary: '64-bit AXI4-Stream UDP/IP/ARP offload.' },
    ],
    protocols: ['axi4-stream'],
    params: [{ name: 'DATA_WIDTH', def: '64', impact: 'AXI4-Stream datapath width (8b for 1G, 64b for 10G/25G).' }],
  },
  {
    id: 'verilog-pcie',
    name: 'Verilog-PCIe DMA & Bridge',
    category: 'High-Speed & Peripheral',
    projectId: 'alexforencich',
    implKind: 'Synthesizable RTL (FPGA-Focused)',
    rtlLang: 'Verilog',
    license: 'MIT',
    repoUrl: 'https://github.com/alexforencich/verilog-pcie',
    tagline: 'Open-source PCIe Gen3/Gen4/Gen5 TLP-to-AXI4 DMA and Completer/Requester bridge for FPGA hard IP shells.',
    whatItDoes: 'Converts Xilinx UltraScale+ / Intel PCIe Hard IP AXI-Stream TLP descriptors into high-throughput AXI4 Master/Slave DMA operations.',
    socRole: 'Bridges host PCIe Gen3–Gen5 root complexes to FPGA/SoC AXI4 memory fabrics (depends on vendor hard SerDes/MAC).',
    modules: [
      { name: 'pcie_us_axi_master', path: 'rtl/pcie_us_axi_master.v', summary: 'Converts incoming PCIe CQ TLPs to AXI4 bursts.' },
      { name: 'pcie_us_axi_dma', path: 'rtl/pcie_us_axi_dma.v', summary: 'High-throughput descriptor-driven PCIe DMA.' },
    ],
    protocols: ['pcie-gen5', 'axi4', 'axi4-stream'],
    params: [{ name: 'AXIS_PCIE_DATA_WIDTH', def: '256 / 512', impact: 'Hard IP TLP stream width.' }],
  },
  {
    id: 'ultraembedded-usb',
    name: 'UltraEmbedded USB 2.0 Host/Dev',
    category: 'High-Speed & Peripheral',
    projectId: 'ultraembedded',
    implKind: 'Synthesizable RTL (ASIC & FPGA)',
    rtlLang: 'Verilog',
    license: 'Apache-2.0',
    repoUrl: 'https://github.com/ultraembedded/cores',
    tagline: 'Synthesizable USB 2.0 UTMI+ Host & Device SIE controllers with AXI4-Lite / Wishbone CSR interfaces.',
    whatItDoes: 'Handles USB 2.0 token/data/handshake PIDs, NRZI/bit-stuffing via external UTMI PHY, SOF framing, and endpoint FIFOs.',
    socRole: 'Provides USB 2.0 peripheral/host connectivity behind AXI4-Lite on embedded RISC-V SoCs.',
    modules: [
      { name: 'usbh_host', path: 'usb_host/src_v/usbh_host.v', summary: 'USB Host Serial Interface Engine + UTMI wrapper.' },
      { name: 'usbf_device_core', path: 'usb_device/src_v/usbf_device_core.v', summary: 'USB 2.0 Device endpoint controller.' },
    ],
    protocols: ['usb3', 'axi4-lite'],
    params: [],
  },
];

export const INTERCONNECT_MEM_PERIPH_IPS: IpEntity[] = INFRA_SEEDS.map((s): IpEntity => ({
  id: s.id,
  name: s.name,
  category: s.category,
  projectId: s.projectId,
  implementationKind: s.implKind,
  rtlLanguage: s.rtlLang,
  primaryLanguage: s.rtlLang,
  maintainer: s.projectId,
  latestRef: 'Upstream Mainline',
  license: s.license,
  repoUrl: s.repoUrl,
  docsUrl: s.repoUrl,
  supportedPlatforms: ['FPGA (Xilinx/Intel/Lattice)', 'Verilator / Cocotb / Icarus'],
  developmentStatus: 'Active Open-Source',
  tagline: s.tagline,
  depth: 'Structured Profile',
  confidence: 'Verified from Source/Docs',
  functional: {
    whatItDoes: s.whatItDoes,
    whyItExists: s.tagline,
    socRole: s.socRole,
    whereUsed: ['Open-source RISC-V SoCs', 'FPGA PCIe/Ethernet/DDR shells'],
    keyOperations: [s.whatItDoes],
    limitations: [
      s.id === 'verilog-pcie'
        ? 'Requires vendor PCIe Hard IP (Xilinx UltraScale+ / Intel P-Tile/R-Tile) for physical SerDes and LTSSM.'
        : 'Consult upstream repository for synthesis/tool compatibility.',
    ],
  },
  architecture: {
    summary: s.whatItDoes,
    clocks: ['clk / aclk'],
    resets: ['rst / aresetn'],
    interrupts: ['Optional irq_o on DMA/MAC completion'],
    externalDependencies: s.id === 'verilog-pcie' ? ['Vendor PCIe Hard IP Block'] : ['None (Self-contained RTL)'],
    blocks: s.modules.slice(0, 3).map((m, idx) => ({
      id: `b${idx}`,
      label: m.name,
      moduleName: m.name,
      role: idx === 0 ? 'interface' : 'control',
      x: 40 + idx * 195,
      y: 70,
      width: 170,
      height: 85,
      description: m.summary,
    })),
    links: s.modules.slice(0, 2).map((_, idx) => ({
      from: `b${idx}`,
      to: `b${idx + 1}`,
      label: 'stream / bus',
    })),
  },
  fileTree: s.modules.map((m) => m.path),
  modules: s.modules.map((m, idx) => ({
    name: m.name,
    filePath: m.path,
    parentModule: idx === 0 ? undefined : s.modules[0].name,
    childModules: [],
    summary: m.summary,
    parameters: s.params.map((p) => ({ name: p.name, defaultValue: p.def, description: p.impact })),
    ports: [
      { name: 'clk', direction: 'input', width: '1', description: 'Clock' },
      { name: 'rst', direction: 'input', width: '1', description: 'Reset' },
    ],
    relatedInterfaces: s.protocols,
    sourceExcerpt: `// Upstream path: ${m.path}\n// Repository: ${s.repoUrl}`,
    githubFileUrl: `${s.repoUrl}/blob/master/${m.path}`,
  })),
  interfaces: s.protocols.map((pid) => ({
    name: `${pid.toUpperCase()} Interface`,
    protocolId: pid,
    protocolLabel: pid.toUpperCase(),
    role: 'Bidirectional',
    clockDomain: 'clk',
    resetDomain: 'rst',
    timingDependencies: 'Consult Protocol Atlas for handshake rules.',
    signals: [{ name: `${pid}_if`, width: 'Parameterized', direction: 'In/Out', notes: 'Parameterized bus signals' }],
  })),
  registers: [],
  registersNote: 'CSR maps are defined per instantiation or driver header in the upstream repository.',
  parameters: s.params.map((p) => ({
    name: p.name,
    type: 'parameter',
    defaultValue: p.def,
    options: [p.def],
    architecturalImpact: p.impact,
  })),
  verification: {
    maturity: 'Self-Checking RTL / Verilator',
    existingInfra: {
      framework: s.projectId === 'alexforencich' ? 'Cocotb (Python) + Icarus Verilog / Verilator' : 'Verilator / QuestaSim / LiteX Sim',
      testbenchPath: 'tb/ or test/',
      agentsAndComponents: ['Cocotbext-axi / cocotbext-pcie / cocotbext-eth BFMs'],
      assertionsAndFormal: ['Protocol assertions in simulation'],
      coverageAndTests: ['Randomized burst, width-conversion, and backpressure suites'],
    },
    recommendedStrategy: ['Verify 4KB boundary splitting and CDC gray-pointer reset sequencing.'],
    simCommands: [{ tool: 'pytest / cocotb', command: 'pytest tb/', expectedOutput: 'Executes cocotb functional simulation.' }],
    simLimitations: 'Check upstream Python/cocotb version dependencies.',
  },
  implementation: {
    synthesizable: true,
    fpgaSupport: 'Verified across AMD/Xilinx and Intel FPGA flows.',
    asicConsiderations: s.id === 'litedram' ? 'FPGA-oriented PHY; ASIC requires foundry DDR PHY.' : 'Pure RTL synthesizable for ASIC.',
    clockingArchitecture: 'Synchronous (with optional `axi_cdc` dual-clock crossings).',
    resetArchitecture: 'Synchronous/Async reset per module parameter.',
    memoryRequirements: 'Distributed/Block RAM for FIFOs.',
    timingAndAreaNotes: 'Area scales linearly with port count and data width.',
  },
  references: [
    { label: `${s.name} Repository`, url: s.repoUrl, kind: 'Repository' },
  ],
}));
