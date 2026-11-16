import { ProtocolComparison } from '../types/protocol';

export const PROTOCOL_COMPARISONS: ProtocolComparison[] = [
  {
    id: 'axi3-vs-axi4',
    title: 'AXI3 vs AXI4',
    protocolA: 'axi3',
    protocolB: 'axi4',
    summary: 'AXI4 scales burst lengths 16x (16 -> 256 beats), removes complex write data interleaving (WID), and introduces QoS/Region hints.',
    rows: [
      { dimension: 'Max INCR Burst Length', valueA: '16 beats (4-bit AxLEN)', valueB: '256 beats (8-bit AxLEN)', engineeringImpact: 'AXI4 amortizes address overhead across 16x larger DMA bursts.' },
      { dimension: 'Write Data Interleaving', valueA: 'Supported via 4-bit WID', valueB: 'Removed (WID eliminated)', engineeringImpact: 'Dramatically reduces crossbar reorder-buffer silicon area.' },
      { dimension: 'QoS & Region Signals', valueA: 'Not present', valueB: 'AxQOS[3:0], AxREGION[3:0]', engineeringImpact: 'Enables real-time latency prioritization for display/camera masters.' },
      { dimension: 'Lock Semantics', valueA: '2-bit AxLOCK (Normal/Exclusive/Locked)', valueB: '1-bit AxLOCK (Normal/Exclusive only)', engineeringImpact: 'Locked transfers caused interconnect stalls and were deprecated.' },
    ],
  },
  {
    id: 'axi4-vs-axi4-lite',
    title: 'AXI4 vs AXI4-Lite',
    protocolA: 'axi4',
    protocolB: 'axi4-lite',
    summary: 'AXI4-Lite strips bursts, IDs, and caching from AXI4 for compact 32/64-bit peripheral register interfaces.',
    rows: [
      { dimension: 'Data Width', valueA: '32 to 1024 bits', valueB: '32 or 64 bits ONLY', engineeringImpact: 'AXI4-Lite guarantees simple CSR decode logic.' },
      { dimension: 'Burst Support', valueA: '1–256 beats (FIXED/INCR/WRAP)', valueB: 'Single beat only (no AxLEN)', engineeringImpact: 'Zero burst counters or 4KB boundary checks in Lite slaves.' },
      { dimension: 'Out-of-Order / IDs', valueA: 'Supported via AxID/BID/RID', valueB: 'Strictly in-order (no IDs)', engineeringImpact: 'Interconnect bridges handle ID stripping and serialization.' },
      { dimension: 'EXOKAY Response', valueA: 'Supported (exclusive access)', valueB: 'Illegal (OKAY/SLVERR/DECERR only)', engineeringImpact: 'Exclusive monitors are omitted in AXI4-Lite.' },
    ],
  },
  {
    id: 'axi4-vs-ahb',
    title: 'AXI4 vs AHB-Lite',
    protocolA: 'axi4',
    protocolB: 'ahb-lite',
    summary: 'AXI4 provides 5 decoupled full-duplex channels with out-of-order IDs; AHB-Lite uses a single pipelined shared-address bus.',
    rows: [
      { dimension: 'Channel Topology', valueA: '5 independent channels (AW, W, B, AR, R)', valueB: 'Shared HADDR/HTRANS + HWDATA/HRDATA', engineeringImpact: 'AXI4 supports simultaneous reads and writes; AHB is half-duplex.' },
      { dimension: 'Handshake Mechanism', valueA: 'Independent VALID/READY per channel', valueB: 'Global HREADY stalls both Address & Data', engineeringImpact: 'AXI4 register slices break timing cleanly on every channel.' },
      { dimension: 'Out-of-Order Completion', valueA: 'Yes (via AxID)', valueB: 'No (strictly in-order)', engineeringImpact: 'Slow AHB slaves stall all subsequent traffic behind them.' },
      { dimension: 'Gate Count / Area', valueA: 'Higher (multi-channel FIFOs & IDs)', valueB: 'Low (~3x fewer wires than AXI4)', engineeringImpact: 'AHB-Lite remains preferred inside compact Cortex-M MCUs.' },
    ],
  },
  {
    id: 'spi-vs-i2c',
    title: 'SPI vs I2C',
    protocolA: 'spi',
    protocolB: 'i2c',
    summary: 'SPI prioritizes high-speed full-duplex push-pull transfers (10–100+ MHz); I2C prioritizes 2-pin multi-device wiring efficiency.',
    rows: [
      { dimension: 'Wire Count (N Targets)', valueA: '3 + N wires (SCLK, MOSI, MISO, N x CS_N)', valueB: '2 wires total (SCL, SDA)', engineeringImpact: 'I2C saves package pins when connecting 5+ sensors.' },
      { dimension: 'Typical Data Rate', valueA: '10 – 100+ Mbps (push-pull)', valueB: '100 kbps – 3.4 Mbps (open-drain)', engineeringImpact: 'SPI/QSPI handles boot flash and displays; I2C handles PMICs/sensors.' },
      { dimension: 'Duplex & Ack', valueA: 'Full-duplex, no hardware ACK', valueB: 'Half-duplex, per-byte ACK/NACK bit', engineeringImpact: 'I2C immediately detects absent targets on address byte.' },
      { dimension: 'Multi-Controller', valueA: 'Not natively supported', valueB: 'Built-in wired-AND arbitration', engineeringImpact: 'Multiple MCUs can share one I2C bus safely.' },
    ],
  },
  {
    id: 'pcie-gen4-vs-gen5',
    title: 'PCIe Gen4 vs PCIe Gen5',
    protocolA: 'pcie-gen5',
    protocolB: 'pcie-gen6',
    summary: 'Gen5 doubles Gen4 to 32 GT/s NRZ (128b/130b); Gen6 doubles again to 64 GT/s PAM4 with 256B Flit mode and FEC.',
    rows: [
      { dimension: 'Lane Rate & Modulation', valueA: '32.0 GT/s NRZ (Gen5)', valueB: '64.0 GT/s PAM4 (Gen6)', engineeringImpact: 'PAM4 halves Nyquist frequency (16 GHz) at 64 GT/s but reduces SNR by ~9.5 dB.' },
      { dimension: 'Framing / Encoding', valueA: '128b/130b variable-length TLP', valueB: 'Fixed 256B Flit Mode + 1b/1b', engineeringImpact: 'Gen6 Flit mode eliminates 128b/130b framing headers and aligns with CXL 3.0.' },
      { dimension: 'Error Correction', valueA: 'LCRC + Ack/Nak Replay (no FEC)', valueB: 'Lightweight FEC + CRC + Replay', engineeringImpact: 'Gen6 FEC recovers PAM4 bit errors in <2 ns without replay.' },
      { dimension: 'x16 Unidirectional BW', valueA: '~63 GB/s', valueB: '~121 GB/s', engineeringImpact: 'Gen5/Gen6 feed multi-GPU AI fabrics and 800GbE NICs.' },
    ],
  },
  {
    id: 'ace-vs-chi',
    title: 'ACE vs CHI',
    protocolA: 'ace',
    protocolB: 'chi',
    summary: 'ACE extends AXI4 wires for small coherent clusters; CHI replaces wires with packetized flits and L-Credits for 64+ core mesh NoCs.',
    rows: [
      { dimension: 'Transport Architecture', valueA: 'Signal-based 8 channels (AXI4 + AC/CR/CD)', valueB: 'Packetized flit-based (REQ, RSP, SNP, DAT)', engineeringImpact: 'CHI routes naturally across multi-hop 2D mesh routers.' },
      { dimension: 'Flow Control', valueA: 'VALID / READY', valueB: 'Link-Layer Credits (L-Credit)', engineeringImpact: 'L-Credits enable deep pipelining across NoC links without combinational loops.' },
      { dimension: 'Direct Memory Transfer', valueA: 'Not supported', valueB: 'Supported (DMT & DCT)', engineeringImpact: 'CHI SN-F sends DRAM data directly to RN-F, cutting latency.' },
    ],
  },
  {
    id: 'ddr4-vs-ddr5',
    title: 'DDR4 vs DDR5',
    protocolA: 'ddr4',
    protocolB: 'ddr5',
    summary: 'DDR5 splits each DIMM into two 32-bit sub-channels, doubles bank count to 32, and embeds on-die ECC.',
    rows: [
      { dimension: 'Channel Width / DIMM', valueA: '1 x 64-bit (+8b ECC) channel', valueB: '2 x 32-bit (+8b ECC) sub-channels', engineeringImpact: '2x independent command queues boost multi-core random access efficiency.' },
      { dimension: 'Burst Length', valueA: 'BL8 (64B across 64b bus)', valueB: 'BL16 (64B across 32b sub-channel)', engineeringImpact: 'Preserves 64-byte cache-line granularity per sub-channel.' },
      { dimension: 'Data Rate & VDD', valueA: '1600–3200 MT/s @ 1.2V', valueB: '4800–8800 MT/s @ 1.1V (On-DIMM PMIC)', engineeringImpact: 'Lower voltage + DFE receiver equalization sustain high rates.' },
    ],
  },
];
