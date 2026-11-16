export interface SocNode {
  id: string;
  label: string;
  subtitle: string;
  domain: 'Compute' | 'Interconnect' | 'Memory' | 'High-Speed I/O' | 'Security' | 'Peripherals';
  x: number;
  y: number;
  width: number;
  height: number;
  protocols: string[];
  description: string;
}

export interface SocEdge {
  id: string;
  from: string;
  to: string;
  protocolId: string;
  label: string;
  roleDetail: string;
}

export const SOC_NODES: SocNode[] = [
  {
    id: 'cpu',
    label: 'CPU Compute Cluster',
    subtitle: 'RISC-V / ARM Multi-Core + L1/L2',
    domain: 'Compute',
    x: 40,
    y: 40,
    width: 210,
    height: 92,
    protocols: ['chi', 'ace', 'obi', 'cv-x-if', 'jtag'],
    description: 'Application processor cores executing instructions over OBI/TileLink or coherent CHI/ACE ports, with JTAG/SWD debug hooks.',
  },
  {
    id: 'dma',
    label: 'DMA & AI Accelerator',
    subtitle: 'Scatter-Gather + Tensor Engine',
    domain: 'Compute',
    x: 40,
    y: 175,
    width: 210,
    height: 92,
    protocols: ['axi4', 'axi4-stream', 'axi4-lite'],
    description: 'High-throughput DMA moves pixel/tensor streams via AXI4-Stream into memory-mapped AXI4 bursts, configured over AXI4-Lite CSRs.',
  },
  {
    id: 'noc',
    label: 'Coherent NoC & AXI Crossbar',
    subtitle: 'CHI / AXI4 System Fabric',
    domain: 'Interconnect',
    x: 325,
    y: 95,
    width: 230,
    height: 120,
    protocols: ['axi4', 'chi', 'axi-noc', 'tilelink'],
    description: 'Central SoC routing fabric arbitrates Manager requests, enforces QoS, maintains cache coherency (CHI/ACE), and decodes 4KB+ address regions.',
  },
  {
    id: 'ddr',
    label: 'DDR5 / HBM3 Memory Ctrl',
    subtitle: 'AXI4-to-DFI Memory Subsystem',
    domain: 'Memory',
    x: 640,
    y: 35,
    width: 215,
    height: 92,
    protocols: ['axi4', 'ddr5', 'hbm3', 'lpddr5'],
    description: 'Converts AXI4 256-beat bursts into scheduled DRAM bank ACT/RD/WR commands over DDR5/HBM3 physical pins.',
  },
  {
    id: 'pcie',
    label: 'PCIe Gen5 / CXL / UCIe',
    subtitle: '32 GT/s SerDes & Chiplet I/O',
    domain: 'High-Speed I/O',
    x: 640,
    y: 165,
    width: 215,
    height: 92,
    protocols: ['pcie-gen5', 'cxl', 'ucie', 'axi4'],
    description: 'Root Complex / Endpoint controller translating AXI4 memory transactions into 128b/130b TLPs or coherent CXL/UCIe chiplet flits.',
  },
  {
    id: 'sec',
    label: 'Root of Trust (OpenTitan)',
    subtitle: 'Crypto / Entropy / Hardened Bus',
    domain: 'Security',
    x: 325,
    y: 275,
    width: 230,
    height: 92,
    protocols: ['tl-ul', 'tl-ul-integrity', 'entropy-if'],
    description: 'Isolated security island connecting Ibex core, AES/HMAC/OTBN engines, and CSRNG via SECDED-protected TL-UL buses.',
  },
  {
    id: 'periph',
    label: 'Peripheral Bridge & I/O',
    subtitle: 'AXI2APB + UART / SPI / I2C',
    domain: 'Peripherals',
    x: 40,
    y: 315,
    width: 210,
    height: 92,
    protocols: ['apb', 'uart', 'spi', 'i2c', 'i3c', 'gpio'],
    description: 'AXI-to-APB bridge steps down high-speed AXI transactions to low-power 2-cycle APB register accesses for off-chip serial buses.',
  },
];

export const SOC_EDGES: SocEdge[] = [
  { id: 'e1', from: 'cpu', to: 'noc', protocolId: 'chi', label: 'CHI / ACE', roleDetail: 'Coherent cache refills, snoops, and writebacks between CPU cluster and NoC.' },
  { id: 'e2', from: 'dma', to: 'noc', protocolId: 'axi4', label: 'AXI4 (512b)', roleDetail: 'High-bandwidth burst reads/writes from DMA and accelerators into system fabric.' },
  { id: 'e3', from: 'noc', to: 'ddr', protocolId: 'ddr5', label: 'AXI4 -> DDR5', roleDetail: 'Memory controller translates AXI4 bursts to JEDEC DDR5 sub-channel commands.' },
  { id: 'e4', from: 'noc', to: 'pcie', protocolId: 'pcie-gen5', label: 'AXI4 -> PCIe 5.0', roleDetail: 'DMA/MMIO traffic bridged to PCIe Gen5 TLPs and CXL/UCIe links.' },
  { id: 'e5', from: 'noc', to: 'periph', protocolId: 'apb', label: 'AXI2APB -> APB', roleDetail: 'Low-bandwidth CSR accesses to UART, SPI, I2C, timers, and GPIOs.' },
  { id: 'e6', from: 'noc', to: 'sec', protocolId: 'tl-ul', label: 'TL-UL Integrity', roleDetail: 'Authenticated mailbox / register window into OpenTitan Root of Trust.' },
  { id: 'e7', from: 'dma', to: 'periph', protocolId: 'axi4-stream', label: 'AXI4-Stream', roleDetail: 'Unaddressed streaming pixel/packet data flowing into DMA.' },
];
