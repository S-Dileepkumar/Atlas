import {
  EntityClassification,
  LifecycleStatus,
  ProtocolDocument,
} from '../types/protocol';

export const ENTITY_CLASSIFICATIONS: Array<{
  id: EntityClassification;
  shortLabel: string;
  description: string;
}> = [
  {
    id: 'Communication Protocol',
    shortLabel: 'Comm Protocol',
    description: 'Wire, packet, or bus-level communication rules defining framing, handshakes, arbitration, and transaction ordering.',
  },
  {
    id: 'Electrical & PHY Interface',
    shortLabel: 'Electrical / PHY',
    description: 'Physical-layer signaling, SerDes PMA/PCS electrical boundaries, voltage swings, equalization, and pin-level timing.',
  },
  {
    id: 'Hardware Architecture',
    shortLabel: 'HW Architecture',
    description: 'ISA models, processor pipelines, interconnect topologies (Mesh/Torus/Ring/Clos), 2.5D/3D chiplet packaging, and accelerator structures.',
  },
  {
    id: 'Microarchitectural Mechanism',
    shortLabel: 'uArch Mechanism',
    description: 'Internal silicon circuits and sub-block contracts such as CDC synchronizers, Gray FIFOs, reset trees, clock gating, TLP/DLLP credit engines, and coherency FSMs.',
  },
  {
    id: 'Design & Verification Standard',
    shortLabel: 'Design / DV Std',
    description: 'IEEE & Accellera HDLs, HVLs, assertion languages, stimulus models, IP encryption, and architectural metadata standards.',
  },
  {
    id: 'Manufacturing & Test Standard',
    shortLabel: 'DFT / Test Std',
    description: 'Silicon manufacturing test, JTAG/IJTAG networks, core wrappers, BIST engines, scan chains, and 3D stacked die test architectures.',
  },
  {
    id: 'EDA Format & Methodology',
    shortLabel: 'EDA / Signoff',
    description: 'RTL-to-GDSII physical design flows, static timing/power formats (.lib, SDC, LEF/DEF, SPEF, UPF, GDSII/OASIS), and fault models.',
  },
  {
    id: 'Security Algorithm',
    shortLabel: 'Crypto Algorithm',
    description: 'Mathematical cryptographic primitives, AEAD ciphers, hashes, MACs, signatures, TRNG/DRBG/PUF entropy, and SCA countermeasures.',
  },
  {
    id: 'Functional Safety Standard',
    shortLabel: 'FuSa Standard',
    description: 'ISO 26262 / IEC 61508 automotive & industrial functional safety standards, ASIL decomposition, lockstep CPUs, ECC, and safety islands.',
  },
];

export const LIFECYCLE_STATUSES: LifecycleStatus[] = [
  'Currently Maintained',
  'Superseded / Merged',
  'Deprecated / Historical',
  'Proprietary',
  'Research / Emerging',
];

interface TaxonomyOverride {
  entityType?: EntityClassification;
  lifecycleStatus?: LifecycleStatus;
  lifecycleNote?: string;
  relationships?: string[];
}

export const PROTOCOL_TAXONOMY_OVERRIDES: Record<string, TaxonomyOverride> = {
  // Coherency: logical state-machine protocols vs physical transport buses
  mesi: { entityType: 'Microarchitectural Mechanism', lifecycleNote: 'Canonical 4-state cache coherency state-machine model implemented atop ACE/CHI/UPI fabrics.' },
  msi: { entityType: 'Microarchitectural Mechanism', lifecycleNote: 'Foundational 3-state coherency FSM.' },
  mosi: { entityType: 'Microarchitectural Mechanism' },
  moesi: { entityType: 'Microarchitectural Mechanism', lifecycleNote: '5-state coherency model adding Owned (O) dirty sharing.' },
  mesif: { entityType: 'Microarchitectural Mechanism', lifecycleNote: 'Intel QPI/UPI 5-state coherency FSM introducing Forward (F) responder.' },
  mersi: { entityType: 'Microarchitectural Mechanism', lifecycleNote: 'IBM POWER coherency FSM.' },
  moesif: { entityType: 'Microarchitectural Mechanism' },
  'directory-coherence': { entityType: 'Hardware Architecture' },
  'snooping-coherence': { entityType: 'Hardware Architecture' },
  'moesi-cmp-directory': { entityType: 'Hardware Architecture' },
  'amd-if-coherency': { entityType: 'Microarchitectural Mechanism', lifecycleStatus: 'Proprietary' },

  // Historical / Merged Coherent & Host Interconnects
  'gen-z': {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Superseded / Merged',
    lifecycleNote: 'Merged into Compute Express Link (CXL Consortium) in late 2021. Do NOT target Gen-Z for new silicon; use CXL 3.x (`cxl.mem` / GFAM) instead.',
    relationships: ['Merged into CXL Consortium (2021)', 'Succeeded by CXL 3.0 / 3.1 Fabric'],
  },
  'intel-fsb': {
    entityType: 'Electrical & PHY Interface',
    lifecycleStatus: 'Deprecated / Historical',
    lifecycleNote: 'Shared multi-drop Front-Side Bus retired ~2008; replaced by point-to-point coherent links (Intel QPI -> Intel UPI).',
    relationships: ['Replaced by Intel QPI (2008)', 'Modern successor: Intel UPI'],
  },
  'intel-qpi': {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Superseded / Merged',
    lifecycleNote: 'Superseded by Intel Ultra Path Interconnect (UPI) on Skylake-SP+ Xeon platforms.',
    relationships: ['Succeeded by Intel UPI', 'Uses MESIF coherence'],
  },
  'intel-upi': {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Proprietary',
    lifecycleNote: 'Active proprietary Intel Xeon multi-socket coherent link.',
  },
  hypertransport: {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Deprecated / Historical',
    lifecycleNote: 'Superseded by AMD Infinity Fabric (and industry PCIe/CXL) on modern Zen platforms.',
    relationships: ['Succeeded by AMD Infinity Fabric'],
  },
  nvlink: {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Proprietary',
    lifecycleNote: 'NVIDIA-proprietary coherent GPU interconnect (not an open multi-vendor standard like UCIe or CXL).',
  },
  'nvlink-c2c': {
    entityType: 'Electrical & PHY Interface',
    lifecycleStatus: 'Proprietary',
    lifecycleNote: 'NVIDIA-proprietary die/package coherent C2C interconnect used between Grace CPU and Hopper/Blackwell GPUs.',
  },
  'infinity-fabric': {
    entityType: 'Hardware Architecture',
    lifecycleStatus: 'Proprietary',
    lifecycleNote: 'AMD-proprietary coherent Data/Control fabric spanning EPYC/Ryzen chiplets and Instinct accelerators.',
  },

  // Historical Buses, Audio, USB & Memory
  pci: {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Deprecated / Historical',
    lifecycleNote: 'Legacy 33/66 MHz parallel multi-drop bus completely replaced by point-to-point serial PCI Express (PCIe).',
    relationships: ['Succeeded by PCI-X -> PCIe Gen1..Gen7'],
  },
  'pci-x': {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Deprecated / Historical',
    lifecycleNote: 'Server parallel evolution of PCI replaced by PCIe.',
    relationships: ['Succeeded by PCIe'],
  },
  most: {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Deprecated / Historical',
    lifecycleNote: 'Legacy automotive ring infotainment bus superseded by Automotive Ethernet + SOME/IP.',
    relationships: ['Replaced by Automotive Ethernet (100BASE-T1 / 1000BASE-T1)'],
  },
  j1850: {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Deprecated / Historical',
    lifecycleNote: 'Pre-CAN OBD-II diagnostic bus deprecated after mandatory CAN adoption (2008).',
  },
  ac97: {
    entityType: 'Communication Protocol',
    lifecycleStatus: 'Deprecated / Historical',
    lifecycleNote: 'Legacy 1997 PC codec link replaced by Intel High Definition Audio (HDA) and MIPI SoundWire.',
  },
  uhci: { entityType: 'Hardware Architecture', lifecycleStatus: 'Deprecated / Historical', lifecycleNote: 'Legacy USB 1.x host controller replaced by xHCI.' },
  ohci: { entityType: 'Hardware Architecture', lifecycleStatus: 'Deprecated / Historical', lifecycleNote: 'Legacy USB 1.x host controller replaced by xHCI.' },
  ehci: { entityType: 'Hardware Architecture', lifecycleStatus: 'Superseded / Merged', lifecycleNote: 'USB 2.0 host controller unified into xHCI for modern SoCs.' },
  'usb-1-0': { entityType: 'Communication Protocol', lifecycleStatus: 'Deprecated / Historical' },
  'usb-1-1': { entityType: 'Communication Protocol', lifecycleStatus: 'Deprecated / Historical' },
  'sdr-sdram': { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical' },
  ddr: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical' },
  ddr2: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical' },
  ddr3: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Superseded / Merged' },
  gddr3: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical' },
  gddr4: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical' },
  gddr5: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Superseded / Merged' },
  lpddr: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical' },
  lpddr2: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical' },
  lpddr3: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Superseded / Merged' },
  vga: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical' },
  dvi: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Deprecated / Historical', lifecycleNote: 'Succeeded by HDMI and DisplayPort.' },
  'rs-232': { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Superseded / Merged' },
  'ieee-1394': { entityType: 'Communication Protocol', lifecycleStatus: 'Deprecated / Historical' },

  // Emerging specs
  ddr6: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Research / Emerging', lifecycleNote: 'JEDEC working-group draft; verify final balloted JESD specification.' },
  lpddr6: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Research / Emerging' },
  gddr7: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Currently Maintained', lifecycleNote: 'Published JEDEC JESD239 (2024) introducing PAM3 signaling.' },
  hbm4: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Research / Emerging', lifecycleNote: 'Emerging 2048-bit TSV DRAM standard for frontier AI clusters.' },
  'pcie-gen7': { entityType: 'Communication Protocol', lifecycleStatus: 'Research / Emerging', lifecycleNote: 'PCIe 7.0 (128 GT/s PAM4) specification at 0.9/1.0 milestone.' },
  'cxl-4-0': { entityType: 'Communication Protocol', lifecycleStatus: 'Research / Emerging' },
  'eth-1-6t': { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Research / Emerging' },
  'hdmi-2-2': { entityType: 'Communication Protocol', lifecycleStatus: 'Research / Emerging' },
  'ucie-3-0': { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Research / Emerging' },
  '6g-research-if': { entityType: 'Hardware Architecture', lifecycleStatus: 'Research / Emerging' },

  // PHY / Electrical overrides
  pipe: { entityType: 'Electrical & PHY Interface' },
  serdes: { entityType: 'Electrical & PHY Interface' },
  'pcie-phy': { entityType: 'Electrical & PHY Interface' },
  'usb-phy': { entityType: 'Electrical & PHY Interface' },
  'mipi-phy': { entityType: 'Electrical & PHY Interface' },
  'interlaken-phy': { entityType: 'Electrical & PHY Interface' },
  'mipi-d-phy': { entityType: 'Electrical & PHY Interface' },
  'mipi-c-phy': { entityType: 'Electrical & PHY Interface' },
  'mipi-m-phy': { entityType: 'Electrical & PHY Interface' },
  'mipi-a-phy': { entityType: 'Electrical & PHY Interface' },
  lvds: { entityType: 'Electrical & PHY Interface' },
  aib: { entityType: 'Electrical & PHY Interface' },
  bow: { entityType: 'Electrical & PHY Interface' },
  xsr: { entityType: 'Electrical & PHY Interface' },
  'xsr-phy': { entityType: 'Electrical & PHY Interface' },
  'd2d-phy': { entityType: 'Electrical & PHY Interface' },
  'ddr-phy-if': { entityType: 'Electrical & PHY Interface' },
  xaui: { entityType: 'Electrical & PHY Interface' },
  xlaui: { entityType: 'Electrical & PHY Interface' },
  caui: { entityType: 'Electrical & PHY Interface' },
  sfi: { entityType: 'Electrical & PHY Interface' },
  fpd: { entityType: 'Electrical & PHY Interface' },
  'fpd-link': { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Proprietary' },
  gmsl: { entityType: 'Electrical & PHY Interface', lifecycleStatus: 'Proprietary' },
  'openldi': { entityType: 'Electrical & PHY Interface' },
  jesd204a: { entityType: 'Communication Protocol', lifecycleStatus: 'Superseded / Merged' },
  jesd204b: { entityType: 'Communication Protocol' },
  jesd204c: { entityType: 'Communication Protocol' },

  // Proprietary vendor interconnects
  aurora: { entityType: 'Communication Protocol', lifecycleStatus: 'Proprietary' },

  // DFT & Test Standards sitting in `debug`
  'ieee-1149-1': { entityType: 'Manufacturing & Test Standard' },
  'ieee-1149-6': { entityType: 'Manufacturing & Test Standard' },
  'ieee-1149-7': { entityType: 'Manufacturing & Test Standard' },
  'ieee-1687-ijtag': { entityType: 'Manufacturing & Test Standard' },
  'ieee-1500': { entityType: 'Manufacturing & Test Standard' },
  'ieee-1838': { entityType: 'Manufacturing & Test Standard' },
  'boundary-scan': { entityType: 'Manufacturing & Test Standard' },
  'scan-chain': { entityType: 'Microarchitectural Mechanism' },
  'ieee-1500-wsp': { entityType: 'Manufacturing & Test Standard' },

  // Clock, Reset & Power Mechanisms sitting in `power-mgmt`
  'clk-enable-if': { entityType: 'Microarchitectural Mechanism' },
  'rst-sync-if': { entityType: 'Microarchitectural Mechanism' },
  'power-state-if': { entityType: 'Microarchitectural Mechanism' },
  'cdc-if': { entityType: 'Microarchitectural Mechanism' },
  'power-domain-ctrl-if': { entityType: 'Microarchitectural Mechanism' },
  'dvfs-ctrl-if': { entityType: 'Microarchitectural Mechanism' },
  'ieee-1801-upf': { entityType: 'EDA Format & Methodology' },
  'ieee-1685-ipxact': { entityType: 'Design & Verification Standard' },

  // Reference Standards sitting in `standards`
  'ieee-754': { entityType: 'Design & Verification Standard' },
  'ieee-802-3': { entityType: 'Communication Protocol' },
  'ieee-802-1': { entityType: 'Communication Protocol' },
  'jedec-ddr-stds': { entityType: 'Design & Verification Standard' },
  'jedec-hbm-stds': { entityType: 'Design & Verification Standard' },
  'jedec-lpddr-stds': { entityType: 'Design & Verification Standard' },
  'jedec-ufs-stds': { entityType: 'Design & Verification Standard' },
  'mipi-specs': { entityType: 'Design & Verification Standard' },
  'usbif-specs': { entityType: 'Design & Verification Standard' },
  'pcisig-specs': { entityType: 'Design & Verification Standard' },
  'riscv-isa-specs': { entityType: 'Hardware Architecture' },
  'arm-arch-specs': { entityType: 'Hardware Architecture' },
  'ocp-specs': { entityType: 'Design & Verification Standard' },

  // NoC architectural/routing concepts sitting in `noc`
  'wormhole-routing': { entityType: 'Microarchitectural Mechanism' },
  'vc-flow-control': { entityType: 'Microarchitectural Mechanism' },
  'credit-flow-control': { entityType: 'Microarchitectural Mechanism' },
  'circuit-switching': { entityType: 'Hardware Architecture' },
  'packet-switching': { entityType: 'Hardware Architecture' },
  'mesh-noc': { entityType: 'Hardware Architecture' },
  'torus-noc': { entityType: 'Hardware Architecture' },
  'ring-noc': { entityType: 'Hardware Architecture' },
  'crossbar-interconnect': { entityType: 'Hardware Architecture' },
  'fat-tree-noc': { entityType: 'Hardware Architecture' },
  'clos-network': { entityType: 'Hardware Architecture' },

  // Accelerator microarchitectural patterns
  'scratchpad-mem-if': { entityType: 'Microarchitectural Mechanism' },
  'systolic-array-if': { entityType: 'Hardware Architecture' },
  'simt-exec-if': { entityType: 'Hardware Architecture' },
};

export function getEntityClassification(p: ProtocolDocument): EntityClassification {
  if (p.entityType) return p.entityType;
  const ov = PROTOCOL_TAXONOMY_OVERRIDES[p.id];
  if (ov?.entityType) return ov.entityType;

  switch (p.categoryId) {
    case 'coherency':
      return p.id === 'ace' || p.id === 'ace-lite' || p.id === 'chi'
        ? 'Communication Protocol'
        : 'Microarchitectural Mechanism';
    case 'phy-serdes':
      return 'Electrical & PHY Interface';
    case 'clock-cdc':
      return 'Microarchitectural Mechanism';
    case 'dft-test':
      return 'Manufacturing & Test Standard';
    case 'verif-eda':
      return 'Design & Verification Standard';
    case 'proc-arch':
      return 'Hardware Architecture';
    case 'phys-design':
      return 'EDA Format & Methodology';
    case 'safety':
      return 'Functional Safety Standard';
    case 'packaging':
      return 'Hardware Architecture';
    case 'standards':
      return 'Design & Verification Standard';
    default:
      return 'Communication Protocol';
  }
}

export function getLifecycleStatus(p: ProtocolDocument): LifecycleStatus {
  if (p.lifecycleStatus) return p.lifecycleStatus;
  const ov = PROTOCOL_TAXONOMY_OVERRIDES[p.id];
  if (ov?.lifecycleStatus) return ov.lifecycleStatus;
  if (p.overview.limitations.some((l) => l.toLowerCase().includes('emerging'))) {
    return 'Research / Emerging';
  }
  return 'Currently Maintained';
}

export function getLifecycleNote(p: ProtocolDocument): string | undefined {
  return p.lifecycleNote || PROTOCOL_TAXONOMY_OVERRIDES[p.id]?.lifecycleNote;
}

export function getEntityRelationships(p: ProtocolDocument): string[] {
  return p.relationships || PROTOCOL_TAXONOMY_OVERRIDES[p.id]?.relationships || [];
}
