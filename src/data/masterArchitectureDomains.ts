import { CategoryId, EntityClassification } from '../types/protocol';

export interface MasterDomainSpec {
  number: string;
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  categoryIds: CategoryId[];
  primaryClassifications: EntityClassification[];
  featuredEntryIds: string[];
  featuredIpIds: string[];
  targetView?:
    | 'aes-deep-dive'
    | 'cdc-analyzer'
    | 'verification-hub'
    | 'ip-universe'
    | 'soc-explorer'
    | 'rtl-explorer'
    | 'simulator'
    | 'uvm'
    | 'completeness-dashboard';
  targetLabel?: string;
  historicalNote?: string;
}

export const MASTER_ARCHITECTURE_DOMAINS: MasterDomainSpec[] = [
  {
    number: '01',
    id: 'protocol-universe',
    title: 'Protocol Universe (On-Chip & Off-Chip Buses)',
    shortTitle: 'Protocol Universe',
    summary:
      'Complete wire, packet, and bus protocol contracts from ARM AMBA (AXI3–AXI5, AHB, APB, ACE, CHI) and open fabrics (TileLink, OBI, Wishbone, OCP) to USB, Ethernet, MIPI, and industrial buses.',
    categoryIds: ['amba', 'interconnect', 'usb', 'networking', 'mipi', 'peripheral', 'noc'],
    primaryClassifications: ['Communication Protocol'],
    featuredEntryIds: ['axi4', 'axi4-lite', 'axi4-stream', 'apb', 'tl-ul', 'obi', 'wishbone-b4', 'eth-100g'],
    featuredIpIds: ['ibex', 'cva6', 'pulp-axi', 'verilog-axi', 'opentitan-tlul-xbar', 'verilog-ethernet'],
    targetView: 'simulator',
    targetLabel: 'Open Waveform Simulator',
  },
  {
    number: '02',
    id: 'processor-isa',
    title: 'Processor Architecture & ISA Foundations',
    shortTitle: 'CPU Arch & ISA',
    summary:
      'Architectural specs (RV32I/RV64I, RISC-V Extensions, Armv8/v9, x86-64), microarchitectural execution (OoO ROB/Tomasulo, branch predictors, pipeline hazards), and coprocessor attaches (RoCC, CV-X-IF, AXI ACP, RVV).',
    categoryIds: ['proc-arch', 'processor'],
    primaryClassifications: ['Hardware Architecture', 'Communication Protocol'],
    featuredEntryIds: [
      'rv32i-rv64i-isa',
      'riscv-extensions-map',
      'armv8-armv9-arch',
      'x86-64-arch',
      'ooo-superscalar-arch',
      'branch-pred-hazards',
      'isa-vs-uarch-vs-bus',
      'rocc',
      'axi-acp',
      'riscv-vector-if',
    ],
    featuredIpIds: ['ibex', 'cva6', 'rocket-chip', 'boom', 'vexriscv', 'core-v-verif'],
    historicalNote:
      'Boundary Clarification: Separates ISA specs (instruction encoding/CSRs) from microarchitectural interfaces (RoCC/CV-X-IF/RVV) and external SoC buses (AXI4/TileLink).',
  },
  {
    number: '03',
    id: 'memory-systems',
    title: 'Memory Systems, DRAM & PHY Training',
    shortTitle: 'Memory & DRAM PHYs',
    summary:
      'JEDEC DDR/LPDDR/GDDR/HBM generations, server DIMM architectures (RDIMM/LRDIMM/MRDIMM), DFI 3.x–5.x, DDR PHY calibration/training, refresh/ECC scrubbing, and SPD / I3C-SPD.',
    categoryIds: ['memory'],
    primaryClassifications: ['Electrical & PHY Interface', 'Communication Protocol', 'Hardware Architecture'],
    featuredEntryIds: [
      'ddr5',
      'lpddr5x',
      'hbm3',
      'gddr7',
      'mrdimm',
      'rdimm',
      'lrdimm',
      'dfi-versions',
      'ddr-phy-training',
      'spd-i3c',
      'hmc',
      'wide-io',
    ],
    featuredIpIds: ['litedram'],
    historicalNote:
      'Historical Context: HMC (Hybrid Memory Cube) and Wide I/O / Wide I/O 2 were superseded by HBM2/3/3E and LPDDR5/5X; SDR/DDR/DDR2/LPDDR1-2 are marked Deprecated/Historical.',
  },
  {
    number: '04',
    id: 'coherent-interconnects',
    title: 'Coherent Interconnects & Cache Coherence',
    shortTitle: 'Coherent Fabrics',
    summary:
      'Logical cache-coherency state machines (MESI/MSI/MOESI/MESIF), snooping & directory protocols, AMBA ACE/CHI/CHI-E, TileLink UH/UD, CXL.cache/.mem, NVLink, Infinity Fabric, and historical consolidation.',
    categoryIds: ['coherency'],
    primaryClassifications: ['Microarchitectural Mechanism', 'Communication Protocol', 'Hardware Architecture'],
    featuredEntryIds: ['mesi', 'moesi', 'mesif', 'chi', 'chi-e', 'ace', 'ccix', 'opencapi', 'ibm-capi', 'gen-z', 'cxl-cache'],
    featuredIpIds: ['rocket-chip', 'openpiton-noc'],
    historicalNote:
      'Consortium Consolidation: CCIX, OpenCAPI, and Gen-Z have been merged into or superseded by Compute Express Link (CXL Consortium) for industry-standard coherent memory/accelerator expansion.',
  },
  {
    number: '05',
    id: 'pcie-cxl-serdes',
    title: 'PCIe, CXL & High-Speed SerDes Internals',
    shortTitle: 'PCIe / CXL / SerDes',
    summary:
      'Deep layered stack: PCIe Transaction Layer & TLPs, DLLPs, Flow Control Credits, Completion/Cfg/Mem Txns, MSI/MSI-X, ATS/PRI/PASID, SR-IOV, PCIe 6.0/7.0 FLIT Mode, LTSSM & Equalization, Retimers/AER, and CXL 1.1–4.0 Fabric Manager.',
    categoryIds: ['high-speed', 'phy-serdes'],
    primaryClassifications: ['Communication Protocol', 'Microarchitectural Mechanism', 'Electrical & PHY Interface'],
    featuredEntryIds: [
      'pcie-gen5',
      'pcie-transaction-tlp',
      'pcie-dllp',
      'pcie-flow-control',
      'pcie-txn-types',
      'pcie-msi-msix',
      'pcie-ats-pri-pasid',
      'pcie-sr-iov',
      'pcie-flit-mode',
      'pcie-ltssm',
      'pcie-lane-retimers-aer',
      'cxl-fabric-mgr',
    ],
    featuredIpIds: ['verilog-pcie'],
    historicalNote:
      'Legacy PCI (33/66 MHz parallel) and PCI-X are explicitly marked Deprecated/Historical; PCIe Gen7 & CXL 4.0 carry Research/Emerging verification tags.',
  },
  {
    number: '06',
    id: 'chiplet-packaging',
    title: 'Chiplet Interconnects & 2.5D/3D Packaging',
    shortTitle: 'Chiplets & 2.5D/3D',
    summary:
      'Die-to-die electrical & streaming links (UCIe 1.0–3.0, OCP Bunch of Wires, Intel AIB, NVLink-C2C) paired with 2.5D Silicon Interposers, 3D Hybrid Bonding, TSVs, TSMC CoWoS, Intel EMIB & Foveros.',
    categoryIds: ['chip-to-chip', 'packaging'],
    primaryClassifications: ['Hardware Architecture', 'Electrical & PHY Interface', 'Communication Protocol'],
    featuredEntryIds: ['ucie', 'bow', 'aib', 'nvlink-c2c', 'interposer-25d-3d-ic', 'cowos-emib-foveros-d2d', 'ieee-1838'],
    featuredIpIds: [],
  },
  {
    number: '07',
    id: 'ai-gpu-compute',
    title: 'AI, ML & GPU Compute Accelerators',
    shortTitle: 'AI & GPU Compute',
    summary:
      'Systolic matrix arrays, SIMT warp schedulers, banked scratchpads, scatter-gather descriptor DMAs, and real open-source accelerator microarchitectures (Gemmini, NVDLA, RedMulE, Vortex GPGPU, MIAOW).',
    categoryIds: ['accelerator'],
    primaryClassifications: ['Hardware Architecture', 'Communication Protocol', 'Microarchitectural Mechanism'],
    featuredEntryIds: ['systolic-array-if', 'tensor-proc-if', 'gpu-cmd-if', 'gpu-mem-if', 'simt-exec-if', 'dma-descriptor-if', 'scratchpad-mem-if'],
    featuredIpIds: ['vortex-gpu', 'gemmini', 'nvdla', 'pulp-redmule', 'miaow-gpu'],
    targetView: 'ip-universe',
    targetLabel: 'Open AI/GPU IP Explorer',
  },
  {
    number: '08',
    id: 'hardware-security',
    title: 'Hardware Security, Crypto & Root of Trust',
    shortTitle: 'Security & Crypto',
    summary:
      'Cryptographic math & countermeasures (AES-128/256 + DOM SCA masking, SHA-2/SHA-3 Keccak, ECC/RSA/AEAD, TRNG/DRBG/PUF), Fault Injection defenses, Root of Trust (OpenTitan/Caliptra), TL-UL Integrity, SPDM, and TPM.',
    categoryIds: ['security'],
    primaryClassifications: ['Security Algorithm', 'Communication Protocol', 'Microarchitectural Mechanism'],
    featuredEntryIds: [
      'sha2-sha3-keccak-alg',
      'asymmetric-ecc-rsa-alg',
      'trng-drbg-puf-arch',
      'rot-sca-fault-arch',
      'tl-ul-integrity',
      'keymgr-if',
      'entropy-if',
      'spdm',
    ],
    featuredIpIds: ['opentitan-aes', 'opentitan-hmac', 'opentitan-kmac', 'opentitan-otbn', 'opentitan-csrng', 'opentitan-keymgr', 'opentitan-alert-handler'],
    targetView: 'aes-deep-dive',
    targetLabel: 'Open AES 7-Chapter Lab',
  },
  {
    number: '09',
    id: 'storage-nvm',
    title: 'Non-Volatile Memory & Storage Fabrics',
    shortTitle: 'NVM & Storage',
    summary:
      'Raw NAND interfaces (ONFI, Toggle DDR NAND), serial/octal NOR XIP (SPI, QSPI, OSPI, HyperFlash), managed mobile flash (eMMC, SD, UFS), and enterprise NVMe / NVMe-oF / SATA / SAS stacks.',
    categoryIds: ['storage'],
    primaryClassifications: ['Communication Protocol', 'Electrical & PHY Interface'],
    featuredEntryIds: ['onfi-nand', 'toggle-nand', 'ospi', 'qspi', 'ufs', 'emmc', 'nvme', 'nvme-pcie', 'nvme-of', 'sata'],
    featuredIpIds: [],
  },
  {
    number: '10',
    id: 'analog-display-sensors',
    title: 'Analog, Mixed-Signal, Display & Sensors',
    shortTitle: 'Analog / Video / Sensor',
    summary:
      'High-speed ADC/DAC converters (JESD204A/B/C), camera sensor links (SLVS, SLVS-EC, Sub-LVDS, MIPI CSI-2), broadcast video (SMPTE SDI, HDMI 2.1, DisplayPort 2.1, eDP), audio links (I2S/TDM/PDM), and mixed-signal SPI control.',
    categoryIds: ['display', 'phy-serdes', 'mipi', 'peripheral'],
    primaryClassifications: ['Electrical & PHY Interface', 'Communication Protocol'],
    featuredEntryIds: ['jesd204c', 'slvs', 'slvs-ec', 'sub-lvds', 'smpte-sdi', 'analog-spi-ctrl', 'hdmi-2-1', 'dp-2-1', 'mipi-csi-2'],
    featuredIpIds: [],
  },
  {
    number: '11',
    id: 'clock-reset-power',
    title: 'Clocking, Reset, CDC & Power Architecture',
    shortTitle: 'Clock / Reset / CDC',
    summary:
      'Strictly classified microarchitectural mechanisms (NOT external buses): Sync/Async Clocks & MTBF, Req-Ack CDC, Gray-Code Async FIFOs, Glitch-Free ICG, DFS/DVS, Clock Monitors, Reset Trees, Isolation/Retention, plus AMBA Q/P-Channel.',
    categoryIds: ['clock-cdc', 'power-mgmt'],
    primaryClassifications: ['Microarchitectural Mechanism', 'Communication Protocol', 'EDA Format & Methodology'],
    featuredEntryIds: [
      'sync-clk-if',
      'async-clk-if',
      'cdc-handshake',
      'gray-code-fifo',
      'clk-gating-if',
      'dfs-ctrl',
      'dvs-ctrl',
      'clk-monitor-if',
      'reset-dist-net',
      'iso-ctrl-if',
      'ret-ctrl-if',
      'q-channel',
      'p-channel',
    ],
    featuredIpIds: ['opentitan-aes', 'cva6'],
    targetView: 'cdc-analyzer',
    targetLabel: 'Open CDC Analyzer Lab',
  },
  {
    number: '12',
    id: 'verification-eda-standards',
    title: 'Hardware Design, Verification & EDA Standards',
    shortTitle: 'Verification & HDL',
    summary:
      'IEEE 1800-2023 SystemVerilog, IEEE 1800.2 UVM, SVA, IEEE 1666 SystemC/TLM-2.0, IEEE 1076 VHDL, IEEE 1364 Verilog (Legacy), IEEE 1850 PSL (Legacy), IEEE 1735 Encryption, DPI-C, VPI/VHPI, UCIS, PSS, SystemRDL, IP-XACT, and IEEE 754.',
    categoryIds: ['verif-eda', 'standards'],
    primaryClassifications: ['Design & Verification Standard'],
    featuredEntryIds: [
      'ieee-1800-sv',
      'ieee-1800-2-uvm',
      'sva-standard',
      'ieee-1666-systemc',
      'ieee-1076-vhdl',
      'ieee-1364-verilog',
      'ieee-1850-psl',
      'ieee-1735',
      'dpi-c',
      'vpi-vhpi',
      'ucis-std',
      'accellera-pss',
      'systemrdl',
      'ieee-1685-ipxact',
      'ieee-754',
    ],
    featuredIpIds: [],
    targetView: 'verification-hub',
    targetLabel: 'Open DV / UVM Hub',
    historicalNote:
      'Standard Evolution: IEEE 1364 (Verilog) and IEEE 1850 (PSL) are explicitly tracked as Superseded/Merged into IEEE 1800 SystemVerilog & SVA.',
  },
  {
    number: '13',
    id: 'dft-manufacturing-test',
    title: 'DFT & Manufacturing Test Architecture',
    shortTitle: 'DFT & Silicon Test',
    summary:
      'IEEE 1149.1/4/6/7/10 JTAG families, TAP Controller FSM, BSDL, IEEE 1500 core wrappers, IEEE 1687 IJTAG, IEEE 1838 3D-DFT, Scan Compression chains, Memory BIST (MBIST), Logic BIST (LBIST), and Built-In Self-Repair (BISR).',
    categoryIds: ['dft-test', 'debug'],
    primaryClassifications: ['Manufacturing & Test Standard', 'Microarchitectural Mechanism'],
    featuredEntryIds: [
      'ieee-1149-1',
      'ieee-1149-4',
      'ieee-1149-6',
      'ieee-1149-7',
      'ieee-1149-10',
      'tap-ctrl',
      'bsdl',
      'mbist',
      'lbist',
      'bisr',
      'ieee-1500',
      'ieee-1687-ijtag',
      'ieee-1838',
      'scan-chain',
    ],
    featuredIpIds: ['ibex'],
  },
  {
    number: '14',
    id: 'physical-implementation',
    title: 'Physical Implementation (RTL-to-GDSII & STA)',
    shortTitle: 'Physical Design & STA',
    summary:
      'Full ASIC tape-out flow from RTL synthesis, floorplanning, and CTS clock trees to Multi-Mode Multi-Corner (MMMC) Static Timing Analysis (OCV/AOCV/POCV, CPPR, cold temperature inversion) and EDA signoff artifacts (.sdc, .lib, LEF/DEF, SPEF, SDF, UPF, GDSII/OASIS).',
    categoryIds: ['phys-design', 'power-mgmt'],
    primaryClassifications: ['EDA Format & Methodology'],
    featuredEntryIds: ['rtl-to-gdsii-flow', 'cts-sta-timing', 'eda-signoff-formats', 'ieee-1801-upf'],
    featuredIpIds: [],
  },
  {
    number: '15',
    id: 'functional-safety',
    title: 'Functional Safety & Automotive/Aero Networks',
    shortTitle: 'Functional Safety',
    summary:
      'ISO 26262 (ASIL-A..D) & IEC 61508 safety lifecycle, SPFM/LFM/PMHF hardware metrics, Dual-Core Lockstep (DCLS), Safety Islands, Hardware Fault Injection, plus deterministic automotive (CAN XL, FlexRay, T1/T1S) & avionics (SpaceWire, MIL-STD-1553, ARINC) buses.',
    categoryIds: ['safety', 'automotive', 'industrial'],
    primaryClassifications: ['Functional Safety Standard', 'Hardware Architecture', 'Communication Protocol'],
    featuredEntryIds: [
      'iso-26262-iec-61508',
      'lockstep-safety-islands',
      'can-fd',
      'can-xl',
      'flexray',
      'eth-1000base-t1',
      'spacewire',
      'arinc-664-afdx',
    ],
    featuredIpIds: ['ibex'],
  },
  {
    number: '16',
    id: 'open-source-hardware',
    title: 'Open-Source Silicon IP & Full-SoC Reference Lab',
    shortTitle: 'Open-Source Silicon',
    summary:
      'Reverse-engineered production RTL trees, register maps, bus fabrics, and DV harnesses from lowRISC OpenTitan & Ibex, OpenHW CVA6 & CV32E40P, UC Berkeley Chipyard/Rocket/BOOM/Gemmini, PULP Platform, Vortex GPGPU, and LiteX.',
    categoryIds: ['processor', 'security', 'accelerator', 'interconnect'],
    primaryClassifications: ['Hardware Architecture', 'Communication Protocol'],
    featuredEntryIds: ['tl-ul', 'obi', 'cv-x-if', 'core-v-ext-if'],
    featuredIpIds: ['ibex', 'cva6', 'opentitan-aes', 'vortex-gpu', 'gemmini', 'rocket-chip', 'pulp-axi', 'verilog-pcie'],
    targetView: 'soc-explorer',
    targetLabel: 'Open SoC & RTL Explorer',
  },
];
