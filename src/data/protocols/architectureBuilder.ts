import { BlockDiagramLink, BlockDiagramNode, ProtocolDocument, SignalDefinition } from '../../types/protocol';

function pickSignal(signals: SignalDefinition[], keywords: string[], fallback: string): string {
  const found = signals.find((s) =>
    keywords.some((kw) => s.name.toLowerCase().includes(kw) || s.channel.toLowerCase().includes(kw))
  );
  return found ? found.name : fallback;
}

function getCategoryFlavor(categoryId: string, name: string) {
  const lower = `${categoryId} ${name}`.toLowerCase();

  if (lower.includes('axi') && !lower.includes('stream') && !lower.includes('lite')) {
    return {
      mgrTitle: 'AXI4 Manager (CPU / DMA)',
      mgrSub: 'AW/AR Issue + WDATA Gen',
      txTitle: 'Out-of-Order ID & Skid Slice',
      txSub: 'AWID/ARID Tracker · Reg Slice',
      fabricTitle: 'AXI4 Crossbar / Arbiter',
      fabricSub: '5-Channel Matrix · 4KB Guard',
      rxTitle: 'Address Decode & Slave Bridge',
      rxSub: 'Burst Unpack · WSTRB Align',
      subTitle: 'Subordinate / DRAM Array',
      subSub: '256-Beat Burst Memory Bank',
      cdcTitle: 'Read Data & Resp Reorder',
      cdcSub: 'RDATA / BRESP / RLAST Mux',
      fcTitle: 'VALID / READY Backpressure',
      fcSub: 'Pipeline Credit & BVALID Ack',
      errTitle: 'SLVERR / DECERR Watchdog',
      errSub: '4KB Boundary & Timeout Guard',
    };
  }

  if (lower.includes('pcie') || lower.includes('cxl') || lower.includes('ucie') || lower.includes('serdes')) {
    return {
      mgrTitle: 'Root Complex / Host Port',
      mgrSub: 'AXI/CXS -> Transaction Layer',
      txTitle: 'TLP Framing & Credit Pool',
      txSub: 'Posted / NP / Cpl Credits',
      fabricTitle: 'Data Link Layer (DLLP)',
      fabricSub: 'Seq Num · LCRC · Ack/Nak',
      rxTitle: 'PIPE MAC + 128b/130b PHY',
      rxSub: 'LTSSM · Scrambler · SerDes',
      subTitle: 'Endpoint / Device Function',
      subSub: 'BAR0-5 Decode · Config Space',
      cdcTitle: 'Elastic Rx Buffer & DFE',
      cdcSub: 'Clock Comp · Deskew · CDR',
      fcTitle: 'InitFC / UpdateFC Return',
      fcSub: 'Flow-Control DLLP Engine',
      errTitle: 'AER / ECRC & Replay Timer',
      errSub: 'Malformed TLP & Link Retrain',
    };
  }

  if (
    lower.includes('ddr') ||
    lower.includes('lpddr') ||
    lower.includes('hbm') ||
    lower.includes('gddr') ||
    lower.includes('mem') ||
    lower.includes('onfi') ||
    lower.includes('sram')
  ) {
    return {
      mgrTitle: 'SoC Memory Port / Master',
      mgrSub: 'Burst Read/Write Requests',
      txTitle: 'Cmd Queue & Bank Scheduler',
      txSub: 'FR-FCFS · Open-Page Arbiter',
      fabricTitle: 'Protocol Timing Engine',
      fabricSub: 'tRCD / tRP / tCAS / tRFC FSM',
      rxTitle: 'DFI PHY & Training Calib',
      rxSub: 'Write Leveling · DQS Gate',
      subTitle: 'Memory Array / Ranks & Banks',
      subSub: 'Row Buffer · Sense Amps · Refresh',
      cdcTitle: 'ECC SECDED & Read FIFO',
      cdcSub: 'DQ/DQS Capture · Scrubbing',
      fcTitle: 'Refresh & ZQ Calibration Ctrl',
      fcSub: 'tREFI Scheduler · Power-Down',
      errTitle: 'ECC Uncorrectable & Parity',
      errSub: 'CMD/ADDR Parity & Alert#',
    };
  }

  if (
    lower.includes('i2c') ||
    lower.includes('spi') ||
    lower.includes('uart') ||
    lower.includes('can') ||
    lower.includes('i3c') ||
    lower.includes('periph') ||
    lower.includes('serial')
  ) {
    return {
      mgrTitle: 'Host CPU / Peripheral DMA',
      mgrSub: 'TX FIFO Push / RX Pop',
      txTitle: 'Baud Div & Frame Serializer',
      txSub: 'Start/Stop/CRC · Shift Reg',
      fabricTitle: 'Serial Bus / Physical Medium',
      fabricSub: 'Clk/Data Lines · Open-Drain/Diff',
      rxTitle: 'Edge Sync & Noise Glitch Filter',
      rxSub: '2-FF Oversample · Bit Recovery',
      subTitle: 'Target Device / Sensor Core',
      subSub: 'Addr Match · Register Payload',
      cdcTitle: 'TX/RX Elastic FIFOs',
      cdcSub: 'Threshold Watermark · DMA Req',
      fcTitle: 'ACK/NACK & Clock Stretching',
      fcSub: 'Arbitration Lost / Flow Ctrl',
      errTitle: 'Framing / CRC / Overrun Detect',
      errSub: 'Bus Timeout & Stuck-Low Recovery',
    };
  }

  if (lower.includes('noc') || lower.includes('coheren') || lower.includes('tilelink') || lower.includes('chi') || lower.includes('ace')) {
    return {
      mgrTitle: 'CPU / Cluster Request Node',
      mgrSub: 'L1 Miss · Coherence Req',
      txTitle: 'Protocol Packetizer & VC Alloc',
      txSub: 'Virtual Channels · Wormhole Flits',
      fabricTitle: 'Crossbar / 2D Mesh Router',
      fabricSub: 'XY Routing · Snoop Broadcast',
      rxTitle: 'Home Node / Directory Cache',
      rxSub: 'MOESI / Snoop Filter Lookup',
      subTitle: 'Coherent L3 / Memory Controller',
      subSub: 'Shared Backing Store + Tag RAM',
      cdcTitle: 'Credit Return & Snoop Resp',
      cdcSub: 'Non-Blocking Deadlock Avoidance',
      fcTitle: 'VC Credit & Ordering Tracker',
      fcSub: 'Channel A/B/C/D/E Separation',
      errTitle: 'Coherency Violation & Timeout',
      errSub: 'Snoop Deadlock & Poison Tag',
    };
  }

  if (lower.includes('sec') || lower.includes('aes') || lower.includes('hmac') || lower.includes('debug') || lower.includes('jtag') || lower.includes('safety')) {
    return {
      mgrTitle: 'Secure Host / TAP Controller',
      mgrSub: 'Privilege / Auth / Scan Cmd',
      txTitle: 'Command & Key / TAP Sequencer',
      txSub: 'State Decode · Integrity Tag',
      fabricTitle: 'Isolation Boundary / Policy Fabric',
      fabricSub: 'Privilege Check · Integrity Bus',
      rxTitle: 'Crypto / Fault / Scan Engine',
      rxSub: 'Masking · Lockstep Compare',
      subTitle: 'Protected Asset / Core TAP',
      subSub: 'Key Vault / Debug Reg / Alert',
      cdcTitle: 'Shadow Regs & Entropy Sync',
      cdcSub: 'Side-Channel Isolation Buffer',
      fcTitle: 'Alert Escalation & Ack Ctrl',
      fcSub: 'Ping / Lockstep Sync Monitor',
      errTitle: 'Tamper / Fault / Alert Handler',
      errSub: 'Zeroization & Fatal Escalation',
    };
  }

  if (lower.includes('display') || lower.includes('cam') || lower.includes('mipi') || lower.includes('hdmi') || lower.includes('eth') || lower.includes('usb')) {
    return {
      mgrTitle: 'Media / DMA Packet Source',
      mgrSub: 'Frame Buffer / Descriptor Fetch',
      txTitle: 'Packetizer, ECC & Scrambler',
      txSub: 'Header Gen · CRC / 8b10b / 64b66b',
      fabricTitle: 'Multi-Lane Link & Deskew',
      fabricSub: 'Lane Striping · Sync Word',
      rxTitle: 'AFE / D-PHY / M-PHY / SerDes',
      rxSub: 'CDR Lock · HS/LP Mode Switch',
      subTitle: 'Sink / Panel / MAC Endpoint',
      subSub: 'Pixel/Frame Unpack · Elastic Buf',
      cdcTitle: 'Async Pixel / Line Buffer',
      cdcSub: 'Rate Matching & Skid Control',
      fcTitle: 'Link Status & Flow Control',
      fcSub: 'BTA / PAUSE / Credit Return',
      errTitle: 'CRC / ECC / Lane Skew Detector',
      errSub: 'Replay / Recovery / Link Fault',
    };
  }

  return {
    mgrTitle: `${name} Initiator`,
    mgrSub: 'Command & Request Issue',
    txTitle: 'Protocol Framing & Queue',
    txSub: 'Pipeline Register · Skid Buf',
    fabricTitle: `${name} Fabric / Channel`,
    fabricSub: 'Arbitration & Routing Matrix',
    rxTitle: 'Target Interface & CDC Bridge',
    rxSub: 'Decode · Synchronizer Stage',
    subTitle: `${name} Responder`,
    subSub: 'Execution / Memory / Endpoint',
    cdcTitle: 'Response & Return Buffer',
    cdcSub: 'Data Unpack · Completion Queue',
    fcTitle: 'Flow-Control & Credit Unit',
    fcSub: 'Backpressure & Handshake Ctrl',
    errTitle: 'Fault, Timeout & Parity Unit',
    errSub: 'Error Flag & Recovery Handler',
  };
}

export function buildCompleteProtocolDiagram(p: ProtocolDocument): {
  nodes: BlockDiagramNode[];
  links: BlockDiagramLink[];
} {
  const sigs = p.signals || [];
  const clkSig = pickSignal(sigs, ['clk', 'sck', 'scl', 'refclk', 'pclk', 'tck'], 'CLK');
  const rstSig = pickSignal(sigs, ['rst', 'reset', 'perst', 'trst'], 'RSTn');
  const reqSig = pickSignal(sigs, ['valid', 'aw', 'ar', 'req', 'cs', 'tx', 'cmd', 'a_valid', 'psel'], sigs[1]?.name || 'REQ / CMD');
  const dataSig = pickSignal(sigs, ['data', 'wdata', 'rdata', 'payload', 'dq', 'td', 'mosi', 'sda'], sigs[3]?.name || 'DATA');
  const ackSig = pickSignal(sigs, ['ready', 'ack', 'gnt', 'bvalid', 'd_valid', 'rvalid', 'miso'], sigs[2]?.name || 'READY / ACK');
  const errSig = pickSignal(sigs, ['err', 'fault', 'alert', 'crc', 'parity', 'slverr', 'nack'], 'ERR / STATUS');

  const f = getCategoryFlavor(p.categoryId, p.name);

  const nodes: BlockDiagramNode[] = [
    {
      id: 'clk_rst',
      label: 'Clock & Reset Sync',
      sublabel: `${clkSig} · ${rstSig}`,
      domain: 'Infra',
      role: 'phy',
      componentKind: 'clock_reset',
      ports: [clkSig, rstSig, 'PLL_LOCK'],
      x: 30,
      y: 24,
      width: 220,
      height: 92,
    },
    {
      id: 'csr',
      label: 'CSR Config & IRQ Bank',
      sublabel: 'Mode · Timing · Addr Mask',
      domain: 'Control',
      role: 'subordinate',
      componentKind: 'csr',
      ports: ['CTRL', 'STAT', 'IRQ'],
      x: 310,
      y: 24,
      width: 220,
      height: 92,
    },
    {
      id: 'sva_mon',
      label: 'SVA & Coverage Monitor',
      sublabel: 'Protocol Rule Checker',
      domain: 'Signoff',
      role: 'interconnect',
      componentKind: 'monitor',
      ports: ['PASS', 'COVG', 'ASSERT'],
      x: 590,
      y: 24,
      width: 220,
      height: 92,
    },
    {
      id: 'err_fc',
      label: f.errTitle,
      sublabel: f.errSub,
      domain: 'Safety',
      role: 'phy',
      componentKind: 'scheduler',
      ports: [errSig, 'TMO', 'REC'],
      x: 870,
      y: 24,
      width: 220,
      height: 92,
    },
    {
      id: 'mgr_core',
      label: f.mgrTitle,
      sublabel: f.mgrSub,
      domain: 'Initiator',
      role: 'manager',
      componentKind: 'core',
      ports: [reqSig, dataSig, ackSig],
      x: 30,
      y: 196,
      width: 220,
      height: 136,
    },
    {
      id: 'tx_stage',
      label: f.txTitle,
      sublabel: f.txSub,
      domain: 'Front-End',
      role: 'interconnect',
      componentKind: 'buffer',
      ports: ['CMD_Q', 'SKID', 'ID/TAG'],
      x: 310,
      y: 196,
      width: 220,
      height: 136,
    },
    {
      id: 'fabric',
      label: f.fabricTitle,
      sublabel: f.fabricSub,
      domain: 'Transport',
      role: 'interconnect',
      componentKind: 'arbiter',
      ports: ['ARB', 'MUX', 'ROUTE'],
      x: 590,
      y: 190,
      width: 220,
      height: 148,
    },
    {
      id: 'rx_stage',
      label: f.rxTitle,
      sublabel: f.rxSub,
      domain: 'Link / PHY',
      role: 'phy',
      componentKind: 'phy',
      ports: ['DEC', 'SYNC', 'ALIGN'],
      x: 870,
      y: 196,
      width: 220,
      height: 136,
    },
    {
      id: 'resp_fc',
      label: f.fcTitle,
      sublabel: f.fcSub,
      domain: 'Flow Ctrl',
      role: 'interconnect',
      componentKind: 'scheduler',
      ports: [ackSig, 'CREDIT', 'HOLD'],
      x: 310,
      y: 408,
      width: 220,
      height: 112,
    },
    {
      id: 'cdc_phy',
      label: f.cdcTitle,
      sublabel: f.cdcSub,
      domain: 'Elastic Buf',
      role: 'interconnect',
      componentKind: 'buffer',
      ports: ['FIFO', 'CDC', 'RESP'],
      x: 590,
      y: 408,
      width: 220,
      height: 112,
    },
    {
      id: 'sub_core',
      label: f.subTitle,
      sublabel: f.subSub,
      domain: 'Target',
      role: 'memory',
      componentKind: 'memory',
      ports: ['ADDR', 'DATA', 'COMP'],
      x: 870,
      y: 408,
      width: 220,
      height: 112,
    },
  ];

  const links: BlockDiagramLink[] = [
    { from: 'clk_rst', to: 'mgr_core', label: `${clkSig} / ${rstSig}`, channelKind: 'clock' },
    { from: 'csr', to: 'tx_stage', label: 'Mode / Timing CFG', channelKind: 'control' },
    { from: 'mgr_core', to: 'tx_stage', label: `${reqSig} + ${dataSig}`, channelKind: 'data' },
    { from: 'tx_stage', to: 'fabric', label: p.channels[1] || 'Framed Request', channelKind: 'control' },
    { from: 'fabric', to: 'sva_mon', label: 'SVA Probe Tap', channelKind: 'verify' },
    { from: 'fabric', to: 'rx_stage', label: p.channels[2] || dataSig, channelKind: 'data' },
    { from: 'rx_stage', to: 'sub_core', label: 'Decoded Target Op', channelKind: 'data' },
    { from: 'rx_stage', to: 'err_fc', label: errSig, channelKind: 'error' },
    { from: 'err_fc', to: 'sva_mon', label: 'Fault Assertion', channelKind: 'verify' },
    { from: 'sub_core', to: 'cdc_phy', label: p.channels[3] || 'Return Data / Cpl', channelKind: 'data' },
    { from: 'cdc_phy', to: 'resp_fc', label: 'Credit / Ack Sync', channelKind: 'control' },
    { from: 'resp_fc', to: 'mgr_core', label: `${ackSig} / Resp`, channelKind: 'control' },
  ];

  return { nodes, links };
}
