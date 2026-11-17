import {
  ProtocolDocument,
  CategoryId,
  SignalDefinition,
  WaveformScenario,
  SpecRow,
  InterviewQuestion,
} from '../../types/protocol';
import { resolveOfficialSpecificationMetadata } from './specificationMetadata';

interface CatalogTuple {
  id: string;
  name: string;
  fullName: string;
  categoryId: CategoryId;
  std: string;
  year: string;
  tagline: string;
  emerging?: boolean;
  caveatKind?: 'coherency' | 'security-ip' | 'standard-ref' | 'emerging';
}

const DOMAIN_SIGNAL_TEMPLATES: Record<CategoryId, Array<{ name: string; channel: string; width: string; dir: SignalDefinition['direction']; rst: string; desc: string }>> = {
  amba: [
    { name: 'ACLK', channel: 'Global', width: '1', dir: 'System / Global', rst: '0', desc: 'Rising-edge synchronous AMBA bus clock.' },
    { name: 'ARESETn', channel: 'Global', width: '1', dir: 'System / Global', rst: '0', desc: 'Active-low asynchronous-assert, synchronous-deassert reset.' },
    { name: 'xVALID', channel: 'Handshake', width: '1', dir: 'Manager -> Subordinate', rst: '0', desc: 'Channel payload valid qualifier.' },
    { name: 'xREADY', channel: 'Handshake', width: '1', dir: 'Subordinate -> Manager', rst: '1', desc: 'Target ready / backpressure indicator.' },
    { name: 'xADDR', channel: 'Payload', width: '32..64', dir: 'Manager -> Subordinate', rst: '0', desc: 'Target byte address or control payload.' },
    { name: 'xRESP', channel: 'Response', width: '2', dir: 'Subordinate -> Manager', rst: 'OKAY', desc: 'Completion status (OKAY/EXOKAY/SLVERR/DECERR).' },
  ],
  interconnect: [
    { name: 'clk_i', channel: 'Clock/Reset', width: '1', dir: 'System / Global', rst: '0', desc: 'Synchronous interconnect fabric clock.' },
    { name: 'rst_ni', channel: 'Clock/Reset', width: '1', dir: 'System / Global', rst: '0', desc: 'Active-low fabric reset.' },
    { name: 'req_valid', channel: 'Request', width: '1', dir: 'Manager -> Subordinate', rst: '0', desc: 'Request transfer strobe or valid signal.' },
    { name: 'req_ready', channel: 'Request', width: '1', dir: 'Subordinate -> Manager', rst: '1', desc: 'Grant / wait-request / ready signal.' },
    { name: 'addr', channel: 'Request', width: '32..64', dir: 'Manager -> Subordinate', rst: '0', desc: 'Decoded target address bus.' },
    { name: 'rdata', channel: 'Response', width: '32..256', dir: 'Subordinate -> Manager', rst: '0', desc: 'Returned read payload word.' },
  ],
  processor: [
    { name: 'clk_i', channel: 'Core Clock', width: '1', dir: 'System / Global', rst: '0', desc: 'Processor pipeline clock.' },
    { name: 'instr_req_o', channel: 'Instruction/Cmd', width: '1', dir: 'Manager -> Subordinate', rst: '0', desc: 'CPU request/offload valid indicator.' },
    { name: 'instr_gnt_i', channel: 'Instruction/Cmd', width: '1', dir: 'Subordinate -> Manager', rst: '1', desc: 'Subordinate grant / ready.' },
    { name: 'addr_or_op', channel: 'Instruction/Cmd', width: '32', dir: 'Manager -> Subordinate', rst: '0', desc: 'PC address, opcode, or debug DMI register index.' },
    { name: 'rvalid_i', channel: 'Response', width: '1', dir: 'Subordinate -> Manager', rst: '0', desc: 'Response / result valid pulse.' },
    { name: 'result_i', channel: 'Response', width: '32..64', dir: 'Subordinate -> Manager', rst: '0', desc: 'Instruction/data/coprocessor result value.' },
  ],
  coherency: [
    { name: 'CLK', channel: 'Coherency Domain', width: '1', dir: 'System / Global', rst: '0', desc: 'Coherent cache controller domain clock.' },
    { name: 'REQ_OP', channel: 'Request', width: '6', dir: 'Manager -> Subordinate', rst: '0', desc: 'Coherency transition opcode (ReadShared/CleanUnique/MakeUnique).' },
    { name: 'SNP_VALID', channel: 'Snoop', width: '1', dir: 'Subordinate -> Manager', rst: '0', desc: 'Home-node snoop probe toward peer caches.' },
    { name: 'SNP_RESP', channel: 'Snoop Resp', width: '4', dir: 'Manager -> Subordinate', rst: '0', desc: 'Snoop response carrying cache-line state transition.' },
    { name: 'CACHE_STATE', channel: 'Directory/Tag', width: '3', dir: 'System / Global', rst: 'I', desc: 'Line state encoding (I / S / E / O / M / F).' },
  ],
  memory: [
    { name: 'CK_t / CK_c', channel: 'Clock', width: '2', dir: 'System / Global', rst: '0', desc: 'Differential DRAM command/address timing clock.' },
    { name: 'CA[n:0]', channel: 'Command/Addr', width: '7..16', dir: 'Manager -> Subordinate', rst: 'DES', desc: 'Encoded ACT / PRE / RD / WR / REF command and address.' },
    { name: 'CS_n', channel: 'Control', width: '1', dir: 'Manager -> Subordinate', rst: '1', desc: 'Active-low chip select qualifying command sampling.' },
    { name: 'DQS_t / DQS_c', channel: 'Data Strobe', width: '2..16', dir: 'Bidirectional', rst: 'Z', desc: 'Source-synchronous bidirectional DDR data strobe.' },
    { name: 'DQ[m:0]', channel: 'Data Bus', width: '16..1024', dir: 'Bidirectional', rst: 'Z', desc: 'Double-data-rate data payload pins.' },
  ],
  storage: [
    { name: 'CLK / REFCLK', channel: 'Timing', width: '1..2', dir: 'System / Global', rst: '0', desc: 'Flash serial clock or storage differential reference clock.' },
    { name: 'CMD / CS_n', channel: 'Command', width: '1..8', dir: 'Manager -> Subordinate', rst: '1', desc: 'Storage command line or active-low chip select.' },
    { name: 'DATA_IO', channel: 'Payload', width: '1..16', dir: 'Bidirectional', rst: 'Z', desc: 'Multi-lane bidirectional NVM / storage payload lines.' },
    { name: 'BUSY / RDY_n', channel: 'Status', width: '1', dir: 'Subordinate -> Manager', rst: '1', desc: 'Flash program/erase busy or storage completion IRQ.' },
  ],
  peripheral: [
    { name: 'SCLK / SCL', channel: 'Clock/Timing', width: '1', dir: 'Transmitter -> Receiver', rst: '1', desc: 'Serial bus clock or oversampled baud timing clock.' },
    { name: 'TX / MOSI / SDA', channel: 'Data', width: '1', dir: 'Bidirectional', rst: '1', desc: 'Primary serial command and data wire.' },
    { name: 'RX / MISO', channel: 'Data', width: '1', dir: 'Receiver -> Transmitter', rst: '1', desc: 'Return serial data or peripheral response pin.' },
    { name: 'CTRL / IRQ', channel: 'Control', width: '1', dir: 'Bidirectional', rst: '0', desc: 'Chip select, frame sync, or peripheral interrupt.' },
  ],
  'high-speed': [
    { name: 'REFCLK_P/N', channel: 'PHY Clock', width: '2', dir: 'System / Global', rst: '0', desc: 'Low-jitter 100 MHz differential HCSL reference clock.' },
    { name: 'TX_P/N[n:0]', channel: 'High-Speed TX', width: '2..32', dir: 'Transmitter -> Receiver', rst: 'EI', desc: 'AC-coupled differential SerDes transmit lanes.' },
    { name: 'RX_P/N[n:0]', channel: 'High-Speed RX', width: '2..32', dir: 'Receiver -> Transmitter', rst: 'EI', desc: 'AC-coupled differential SerDes receive lanes.' },
    { name: 'LINK_STATE', channel: 'LTSSM', width: '5', dir: 'System / Global', rst: 'Detect', desc: 'Physical link training & status state machine.' },
  ],
  usb: [
    { name: 'VBUS', channel: 'Power/Attach', width: '1', dir: 'Transmitter -> Receiver', rst: '0', desc: 'USB power rail and device attach detection.' },
    { name: 'D+ / D- (or CC)', channel: 'LS/FS/PD', width: '2', dir: 'Bidirectional', rst: 'SE0', desc: 'Differential D+/D- or Type-C Configuration Channel wire.' },
    { name: 'SSTX / SSRX', channel: 'SuperSpeed', width: '4..8', dir: 'Bidirectional', rst: 'EI', desc: 'Full-duplex differential multi-gigabit SerDes pairs.' },
    { name: 'HCI_REG', channel: 'Host Ctrl', width: '32', dir: 'System / Global', rst: '0', desc: 'Host controller DMA descriptor & doorbell interface.' },
  ],
  networking: [
    { name: 'TX_CLK / RX_CLK', channel: 'MII/PCS Clock', width: '1..2', dir: 'System / Global', rst: '0', desc: 'MAC-to-PHY transmit and recovered receive clocks.' },
    { name: 'TXD / XGMII_TXD', channel: 'TX Path', width: '4..512', dir: 'Transmitter -> Receiver', rst: '0', desc: 'Transmit nibble/byte/64B66B MAC payload bus.' },
    { name: 'TX_EN / TX_CTL', channel: 'TX Path', width: '1..8', dir: 'Transmitter -> Receiver', rst: '0', desc: 'Frame valid / preamble / control delimiter flags.' },
    { name: 'RXD / RX_CTL', channel: 'RX Path', width: '4..512', dir: 'Receiver -> Transmitter', rst: '0', desc: 'Received Ethernet frame data and delimiter status.' },
    { name: 'MDC / MDIO', channel: 'Management', width: '2', dir: 'Bidirectional', rst: '1', desc: 'Clause 22/45 PHY management clock and data pins.' },
  ],
  mipi: [
    { name: 'CLK_P / CLK_N', channel: 'PHY Clock', width: '2', dir: 'Transmitter -> Receiver', rst: 'LP-11', desc: 'HS differential clock lane (or C-PHY 3-wire trio).' },
    { name: 'DATA_P / DATA_N', channel: 'PHY Data', width: '2..8', dir: 'Bidirectional', rst: 'LP-11', desc: 'Multi-lane HS-TX / LP-TX camera or display lanes.' },
    { name: 'CCI_SCL / SDA', channel: 'Control', width: '2', dir: 'Bidirectional', rst: '1', desc: 'I2C/I3C camera control or command mode link.' },
  ],
  display: [
    { name: 'PIXEL_CLK / LINK_CLK', channel: 'Timing', width: '1', dir: 'System / Global', rst: '0', desc: 'Video pixel clock or TMDS/DP symbol clock.' },
    { name: 'DATA_LANES', channel: 'Video Stream', width: '4..24', dir: 'Transmitter -> Receiver', rst: '0', desc: 'Differential video lanes or parallel RGB pixels.' },
    { name: 'AUX_CH / DDC', channel: 'Sideband', width: '2', dir: 'Bidirectional', rst: '1', desc: 'EDID capability discovery & link training auxiliary channel.' },
    { name: 'HPD', channel: 'Hotplug', width: '1', dir: 'Receiver -> Transmitter', rst: '0', desc: 'Hot-Plug Detect interrupt from display sink.' },
  ],
  'chip-to-chip': [
    { name: 'FWD_CLK', channel: 'D2D Clock', width: '1..2', dir: 'System / Global', rst: '0', desc: 'Forwarded source-synchronous chiplet clock.' },
    { name: 'TX_SLICE', channel: 'D2D TX', width: '16..64', dir: 'Transmitter -> Receiver', rst: '0', desc: 'Micro-bump or organic package transmit data slice.' },
    { name: 'RX_SLICE', channel: 'D2D RX', width: '16..64', dir: 'Receiver -> Transmitter', rst: '0', desc: 'Matched receive chiplet data slice.' },
    { name: 'SB_CLK / SB_DATA', channel: 'Sideband', width: '2', dir: 'Bidirectional', rst: '0', desc: 'Always-on D2D training and voltage/lane repair sideband.' },
  ],
  automotive: [
    { name: 'CANH / BUS_P', channel: 'Physical Bus', width: '1', dir: 'Transmitter -> Receiver', rst: 'Recessive', desc: 'Differential automotive bus high / single-ended wire.' },
    { name: 'CANL / BUS_N', channel: 'Physical Bus', width: '1', dir: 'Receiver -> Transmitter', rst: 'Recessive', desc: 'Differential automotive bus low / return reference.' },
    { name: 'TXD / RXD', channel: 'Controller-XCVR', width: '2', dir: 'Bidirectional', rst: '1', desc: 'SoC MAC/CAN controller to physical transceiver interface.' },
    { name: 'WAKE_N', channel: 'Power Mgmt', width: '1', dir: 'Receiver -> Transmitter', rst: '1', desc: 'Partial-networking ECU sleep/wake signal.' },
  ],
  debug: [
    { name: 'TCK / SWCLK', channel: 'Debug Clock', width: '1', dir: 'System / Global', rst: '0', desc: 'External probe test/debug clock (asynchronous to sys_clk).' },
    { name: 'TMS / SWDIO', channel: 'Control/IO', width: '1', dir: 'Bidirectional', rst: '1', desc: 'TAP state transition select or half-duplex packet wire.' },
    { name: 'TDI / TRACE_DATA', channel: 'Data In', width: '1..32', dir: 'Manager -> Subordinate', rst: '0', desc: 'Scan chain input or compressed trace export pins.' },
    { name: 'TDO', channel: 'Data Out', width: '1', dir: 'Subordinate -> Manager', rst: 'Z', desc: 'Shifted test/debug register output.' },
  ],
  security: [
    { name: 'clk_i', channel: 'Security Clock', width: '1', dir: 'System / Global', rst: '0', desc: 'Hardened cryptographic/root-of-trust domain clock.' },
    { name: 'req_valid / data_i', channel: 'Crypto/Sec IF', width: '32..128', dir: 'Manager -> Subordinate', rst: '0', desc: 'Key sideload, entropy request, or integrity-checked packet.' },
    { name: 'intg_chk_i', channel: 'Fault Guard', width: '7..14', dir: 'Manager -> Subordinate', rst: '0', desc: 'SECDED ECC / masking / parity fault-detection sideband.' },
    { name: 'alert_o', channel: 'Security Alert', width: '2', dir: 'Subordinate -> Manager', rst: '0', desc: 'Differential fatal fault-injection alert pair.' },
  ],
  noc: [
    { name: 'noc_clk', channel: 'NoC Mesh Clock', width: '1', dir: 'System / Global', rst: '0', desc: 'Router and crosspoint switch clock.' },
    { name: 'flit_valid', channel: 'Router Link', width: '1', dir: 'Manager -> Subordinate', rst: '0', desc: 'Packet/flit valid indicator across hop link.' },
    { name: 'flit_payload', channel: 'Router Link', width: '128..512', dir: 'Manager -> Subordinate', rst: '0', desc: 'Header/Body/Tail wormhole flit carrying VC & routing bits.' },
    { name: 'vc_credit_rtn', channel: 'Flow Control', width: '4..8', dir: 'Subordinate -> Manager', rst: '0', desc: 'Per-Virtual-Channel buffer credit return.' },
  ],
  accelerator: [
    { name: 'aclk', channel: 'Compute Clock', width: '1', dir: 'System / Global', rst: '0', desc: 'High-frequency AI/GPU tensor compute domain clock.' },
    { name: 'desc_valid / cmd_q', channel: 'Command', width: '1..64', dir: 'Manager -> Subordinate', rst: '0', desc: 'DMA descriptor or SIMT/tensor kernel dispatch command.' },
    { name: 'tile_data', channel: 'Datapath', width: '256..1024', dir: 'Bidirectional', rst: '0', desc: 'Wide weight/activation/vector scratchpad data bus.' },
    { name: 'sync_done', channel: 'Completion', width: '1', dir: 'Subordinate -> Manager', rst: '0', desc: 'Hardware fence / kernel completion interrupt.' },
  ],
  'phy-serdes': [
    { name: 'PMA_CLK', channel: 'PCS/PMA', width: '1', dir: 'System / Global', rst: '0', desc: 'Parallel recovered or transmit symbol clock.' },
    { name: 'TxData / RxData', channel: 'Parallel PIPE', width: '16..64', dir: 'Bidirectional', rst: '0', desc: 'Parallel MAC-to-PHY encoded symbol word.' },
    { name: 'TxDataK / SyncHdr', channel: 'Framing', width: '2..4', dir: 'Transmitter -> Receiver', rst: '0', desc: '8b/10b K-char or 64b/66b / 128b/130b sync header.' },
    { name: 'RxValid / PhyStatus', channel: 'Link Status', width: '1', dir: 'Receiver -> Transmitter', rst: '0', desc: 'CDR lock, symbol alignment, and lane status indicator.' },
  ],
  'power-mgmt': [
    { name: 'CLK / REF_CLK', channel: 'Always-On', width: '1', dir: 'System / Global', rst: '0', desc: 'Low-frequency always-on power controller clock.' },
    { name: 'xREQn', channel: 'Transition Req', width: '1', dir: 'Manager -> Subordinate', rst: '1', desc: 'Low-power quiescent or P-state change request.' },
    { name: 'xACCEPTn', channel: 'Response', width: '1', dir: 'Subordinate -> Manager', rst: '1', desc: 'Device accepts clock gating or power state transition.' },
    { name: 'xDENY', channel: 'Response', width: '1', dir: 'Subordinate -> Manager', rst: '0', desc: 'Device vetoes transition due to pending hardware work.' },
  ],
  wireless: [
    { name: 'BB_CLK', channel: 'Baseband Clock', width: '1', dir: 'System / Global', rst: '0', desc: 'RF/baseband symbol synchronization clock.' },
    { name: 'I_DATA / Q_DATA', channel: 'RF/IQ Baseband', width: '12..16', dir: 'Bidirectional', rst: '0', desc: 'In-phase and Quadrature modulated RF sample streams.' },
    { name: 'MAC_FRAME', channel: 'MAC/PHY SAP', width: '8..32', dir: 'Bidirectional', rst: '0', desc: 'Air-interface MAC protocol data unit frames.' },
    { name: 'CCA / RSSI', channel: 'Radio Sense', width: '8', dir: 'Receiver -> Transmitter', rst: '0', desc: 'Clear-channel assessment and signal strength indicator.' },
  ],
  industrial: [
    { name: 'LINK_CLK', channel: 'Deterministic Sync', width: '1', dir: 'System / Global', rst: '0', desc: 'Isochronous industrial/avionics frame clock.' },
    { name: 'TX_CH_A / B', channel: 'Redundant TX', width: '2', dir: 'Transmitter -> Receiver', rst: '0', desc: 'Differential/redundant deterministic transmit channel.' },
    { name: 'RX_CH_A / B', channel: 'Redundant RX', width: '2', dir: 'Receiver -> Transmitter', rst: '0', desc: 'Fault-tolerant redundant receive channel.' },
    { name: 'SYNC_PULSE', channel: 'Time Sync', width: '1', dir: 'Transmitter -> Receiver', rst: '0', desc: 'Hard real-time cycle boundary strobe.' },
  ],
  standards: [
    { name: 'FORMAT / SPEC_ID', channel: 'Specification', width: '32..64', dir: 'System / Global', rst: '0', desc: 'Canonical encoding, arithmetic, or metadata schema representation.' },
    { name: 'COMPLIANCE_CHK', channel: 'Validation', width: '1', dir: 'System / Global', rst: '1', desc: 'Formal compliance rule / standard assertion gate.' },
  ],
  'dft-test': [
    { name: 'TCK / SCAN_CLK', channel: 'Test Clock', width: '1', dir: 'System / Global', rst: '0', desc: 'Dedicated scan shift or IEEE TAP test clock.' },
    { name: 'TDI / SCAN_IN', channel: 'Test Shift In', width: '1..N', dir: 'Manager -> Subordinate', rst: '0', desc: 'Serialized structural test or MBIST configuration input.' },
    { name: 'TDO / SCAN_OUT', channel: 'Test Shift Out', width: '1..N', dir: 'Subordinate -> Manager', rst: '0', desc: 'Captured signature / pass-fail repair vector output.' },
  ],
  'clock-cdc': [
    { name: 'SRC_CLK / DST_CLK', channel: 'Clock Domains', width: '1', dir: 'System / Global', rst: '0', desc: 'Independent or ratioed clock domain boundaries.' },
    { name: 'SYNC_REQ / ACK', channel: 'CDC / Control', width: '1', dir: 'Bidirectional', rst: '0', desc: 'Multi-flop synchronized handshake or isolation control.' },
  ],
  'verif-eda': [
    { name: 'SPEC_CONTRACT', channel: 'Language / Standard', width: 'N/A', dir: 'System / Global', rst: '0', desc: 'Normative HDL, UVM, assertion, or EDA verification semantics.' },
  ],
  'proc-arch': [
    { name: 'PC / INST_WORD', channel: 'Fetch / Decode', width: '32..64', dir: 'Manager -> Subordinate', rst: '0', desc: 'Program counter and ISA instruction opcode stream.' },
    { name: 'WB_COMMIT', channel: 'Retire / ROB', width: '64', dir: 'Subordinate -> Manager', rst: '0', desc: 'In-order architectural register writeback and trap status.' },
  ],
  'phys-design': [
    { name: 'TIMING_SLACK', channel: 'MMMC Signoff', width: 'Float', dir: 'System / Global', rst: '0', desc: 'Static Timing Analysis required-minus-arrival path margin.' },
  ],
  safety: [
    { name: 'LOCKSTEP_ERR', channel: 'Safety Island', width: '1', dir: 'Subordinate -> Manager', rst: '0', desc: 'Cycle-by-cycle dual-core redundant comparator mismatch fault.' },
  ],
  packaging: [
    { name: 'uBUMP / TSV_IO', channel: '2.5D / 3D Interconnect', width: 'N', dir: 'Bidirectional', rst: '0', desc: 'Fine-pitch interposer microbump or vertical TSV die stack.' },
  ],
};

function makeSignalsForTuple(t: CatalogTuple): SignalDefinition[] {
  const tmpl = DOMAIN_SIGNAL_TEMPLATES[t.categoryId];
  return tmpl.map((s) => ({
    name: s.name,
    channel: s.channel,
    width: s.width,
    direction: s.dir,
    resetValue: s.rst,
    polarity: s.width === '1' ? 'Active High' : 'Data / Multi-bit',
    summary: `${t.name}: ${s.desc}`,
    timingRules: `Governed by ${t.std} (${t.year}) electrical/protocol timing windows.`,
    dependencies: ['System / Domain Clock', 'Reset State'],
    legalConditions: `Maintained stable across active ${t.name} transaction boundaries.`,
    illegalConditions: `Glitches, out-of-range states, or un-synchronized domain crossings.`,
    rtlExample: `// ${t.name} interface signal ${s.name}\nlogic [${s.width === '1' ? '0' : '31'}:0] ${s.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()};`,
    svaAssertion: `assert property (@(posedge clk) !$isunknown(${s.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}));`,
    uvmDriverNote: `Drive/monitor ${s.name} cleanly inside ${t.name} UVM interface.`,
    commonBugs: [`Uncaught reset default or timing skew on ${s.name}.`],
    relatedInterviewQs: [`What role does ${s.name} play in ${t.name}?`],
  }));
}

function makeWaveformForTuple(t: CatalogTuple): WaveformScenario {
  const tmpl = DOMAIN_SIGNAL_TEMPLATES[t.categoryId];
  const clkName = tmpl[0]?.name || 'CLK';
  const sigA = tmpl[1]?.name || 'REQ';
  const sigB = tmpl[2]?.name || 'ACK';
  const sigC = tmpl[3]?.name || 'DATA';

  return {
    id: `${t.id}-nominal`,
    name: `${t.name} Nominal Transaction Cycle`,
    category: 'Nominal',
    description: `Representative cycle-accurate view of ${t.name} (${t.std}) initiation, payload exchange, and completion.`,
    cycles: 6,
    clockName: clkName,
    signals: [
      { name: clkName, type: 'clock', values: [0, 1, 0, 1, 0, 1] },
      { name: sigA, type: 'bit', values: [0, 1, 1, 1, 0, 0] },
      { name: sigB, type: 'bit', values: [0, 0, 1, 1, 1, 0] },
      { name: sigC, type: 'bus', values: ['IDLE', 'HDR', 'D0', 'D1', 'DONE', 'IDLE'] },
    ],
    annotations: [
      { cycle: 1, label: `${t.name} request / start`, severity: 'info' },
      { cycle: 2, label: `Handshake / payload phase`, severity: 'info' },
      { cycle: 4, label: `Completion / status verify`, severity: 'info' },
    ],
  };
}

function buildCatalogDoc(t: CatalogTuple, idx: number): ProtocolDocument {
  const signals = makeSignalsForTuple(t);
  const waveform = makeWaveformForTuple(t);

  const caveatText =
    t.caveatKind === 'coherency'
      ? 'Architectural Note: This entry specifies a logical cache-coherency state-machine / directory protocol rather than a physical pin-level wire bus.'
      : t.caveatKind === 'security-ip'
        ? 'Interface Scope Note: Represents an IP-specific hardware security or cryptographic engine interface pattern (as seen in OpenTitan/TPM subsystems) rather than an industry-wide general bus standard.'
        : t.caveatKind === 'standard-ref'
          ? 'Standards Scope Note: Foundational semiconductor reference/modeling standard rather than a physical wire-level communication bus.'
          : t.emerging
            ? 'Emerging Specification Notice: Standard revision is recent, draft, or roadmap-stage; verify exact normative spec version with the governing standards body before tape-out.'
            : undefined;

  const specs: SpecRow[] = [
    {
      parameter: 'Primary Governing Body',
      value: t.std,
      classification: 'Official Standard Requirement',
      notes: caveatText || `Official authoritative specification baseline (${t.year}).`,
    },
    {
      parameter: 'Domain Classification',
      value: t.fullName,
      classification: 'Configurable Parameter',
      notes: t.tagline,
    },
    {
      parameter: 'Revision Status',
      value: t.emerging ? `${t.year} · Emerging / Pre-Silicon Verify` : `${t.year} · Production Standard`,
      classification: t.emerging ? 'Verification Recommendation' : 'Official Standard Requirement',
      notes: t.emerging
        ? 'Version availability, lane speeds, and electrical compliance require checking official errata/ECNs.'
        : 'Widely deployed across commercial ASIC, SoC, and FPGA verification flows.',
    },
  ];

  const svIdent = t.id.replace(/[^a-zA-Z0-9_]/g, '_');

  const iq: InterviewQuestion[] = [
    {
      id: `${t.id}-iq1`,
      level: 'Beginner',
      question: `What architectural problem does ${t.name} (${t.fullName}) solve in modern semiconductor systems?`,
      answer: `${t.tagline}${caveatText ? ` (${caveatText})` : ''} Standardized by ${t.std}, it defines deterministic rules for framing, timing, and interoperability across SoC boundaries.`,
      keyTakeaway: t.tagline,
    },
    {
      id: `${t.id}-iq2`,
      level: 'Verification',
      question: `What key protocol invariants or failure modes should a verification engineer check on ${t.name}?`,
      answer: `Verify legal reset initialization, valid/ready or credit balance under stall injection, CRC/parity/integrity error reporting, and clean clock/reset domain behavior against ${t.std}.`,
      keyTakeaway: 'Bind SVA checkers to all control transitions and verify recovery under stalled/error paths.',
    },
  ];

  const specMeta = resolveOfficialSpecificationMetadata({
    id: t.id,
    name: t.name,
    standardBody: t.std,
    specVersion: t.std,
    year: t.year,
    categoryId: t.categoryId,
  });

  return {
    id: t.id,
    name: t.name,
    fullName: t.fullName,
    categoryId: t.categoryId,
    standardBody: t.std,
    specVersion: t.std,
    revision: specMeta.revision,
    officialSpecificationUrl: specMeta.officialSpecificationUrl,
    year: t.year,
    tagline: t.tagline,
    depth: 'Engineering Brief',
    popularityRank: 45 + idx,
    overview: {
      definition: `${t.fullName} (${t.name}) — ${t.tagline}${caveatText ? ` [${caveatText}]` : ''}`,
      whyDeveloped: `Standardized by ${t.std} (${t.year}) to guarantee interoperable multi-vendor silicon, predictable timing closure, and reusable verification IP.`,
      problemSolved: `Eliminates ad-hoc custom glue logic across ${t.categoryId.replace(/-/g, ' ')} subsystems while bounding latency, bandwidth, and electrical/logical compliance.`,
      usedIn: [
        'Enterprise & Client SoCs',
        'AI / Data Center Accelerators & Chiplets',
        'Automotive, Industrial, Mobile & Embedded Silicon',
      ],
      terminology: [
        { term: 'Initiator / Producer', meaning: `Block originating ${t.name} transactions, commands, or frames.` },
        { term: 'Target / Responder', meaning: `Endpoint executing ${t.name} requests and returning data/acknowledgment.` },
        ...(caveatText ? [{ term: 'Scope Note', meaning: caveatText }] : []),
      ],
      advantages: [
        `Standardized interoperability governed by ${t.std}`,
        'Deterministic protocol state transitions verifiable via UVM and SVA assertions',
      ],
      limitations: [
        caveatText || `Requires strict compliance with ${t.std} timing, electrical, and reset rules.`,
      ],
    },
    architecture: {
      summary: t.tagline,
      clockAndReset: `Governed by ${signals[0]?.name || 'CLK'} with synchronous reset recovery and CDC isolation where crossing frequency islands.`,
      dataFlow: `Data moves strictly according to ${t.name} channel/lane rules with flow-control backpressure or credit accounting.`,
      controlFlow: `FSM transitions advance only on qualified handshakes, command opcodes, or valid delimiter/CRC checks.`,
      nodes: [
        { id: 'init', label: `${t.name} Initiator`, role: 'manager', x: 40, y: 75, width: 195, height: 110 },
        { id: 'link', label: `${t.name} Channel / Spec`, role: 'interconnect', x: 270, y: 75, width: 165, height: 110 },
        { id: 'targ', label: `${t.name} Responder`, role: 'subordinate', x: 470, y: 75, width: 195, height: 110 },
      ],
      links: [
        { from: 'init', to: 'link', label: 'Command / Tx' },
        { from: 'link', to: 'targ', label: 'Payload / Sync' },
        { from: 'targ', to: 'init', label: 'Status / Ack', bidirectional: false },
      ],
    },
    specifications: specs,
    channels: Array.from(new Set(signals.map((s) => s.channel))),
    signals,
    transactionFlow: {
      nominal: [
        {
          step: 1,
          phase: 'Setup & Qualification',
          title: `${t.name} Initiation`,
          description: `Initiator validates configuration and drives control/command framing on ${signals[1]?.name || 'REQ'}.`,
          activeSignals: signals.slice(0, 2).map((s) => s.name),
        },
        {
          step: 2,
          phase: 'Transfer / Execution',
          title: 'Active Data / State Exchange',
          description: `Payload beats, flits, or state updates progress per ${t.std} timing rules.`,
          activeSignals: signals.slice(1, 4).map((s) => s.name),
        },
        {
          step: 3,
          phase: 'Completion & Check',
          title: 'Acknowledge & Error Validation',
          description: 'Target confirms completion, integrity, or credit return cleanly before returning to idle.',
          activeSignals: signals.slice(-2).map((s) => s.name),
        },
      ],
      errorAndOrdering: [
        `Always verify timeout, illegal state recovery, and compliance boundaries against ${t.std}.`,
      ],
    },
    waveforms: [waveform],
    rtl: {
      architectureNotes: `Clean ${t.name} RTL isolates physical/electrical framing or protocol arbitration from core application datapaths.`,
      datapathNotes: 'Registered outputs and skid buffers break long combinational timing paths across clock boundaries.',
      controlpathNotes: 'Explicit one-hot or safe gray-coded FSM enforces illegal-state recovery.',
      fsmStates: [
        { id: 'IDLE', label: 'IDLE', description: 'Reset / quiescent low-power wait state', x: 55, y: 80, isInitial: true },
        { id: 'ACTIVE', label: 'ACTIVE', description: `${t.name} command / payload phase`, x: 255, y: 80 },
        { id: 'COMPLETE', label: 'COMPLETE', description: 'Status / ACK check & return', x: 455, y: 80 },
      ],
      fsmTransitions: [
        { from: 'IDLE', to: 'ACTIVE', condition: 'req_valid && !err' },
        { from: 'ACTIVE', to: 'ACTIVE', condition: '!done' },
        { from: 'ACTIVE', to: 'COMPLETE', condition: 'done' },
        { from: 'COMPLETE', to: 'IDLE', condition: '1\'b1' },
      ],
      codeTitle: `${svIdent}_if_monitor.sv`,
      codeLanguage: 'SystemVerilog',
      codeSnippet: `// Reference SystemVerilog compliance hook for ${t.name} (${t.std})\nmodule ${svIdent}_monitor (input logic clk, input logic rst_n, input logic req_valid, input logic req_ready);\n  property p_req_hold;\n    @(posedge clk) disable iff (!rst_n)\n    (req_valid && !req_ready) |=> req_valid;\n  endproperty\n  assert property (p_req_hold);\nendmodule`,
      commonMistakes: [
        `Failing to synchronize asynchronous boundaries on ${t.name}.`,
        'Altering control/payload signals while wait/backpressure is asserted.',
      ],
    },
    verification: {
      uvmArchitecture: `UVM agent featuring ${svIdent}_driver, passive ${svIdent}_monitor, scoreboard, and ${t.std} SVA compliance checker.`,
      driverStrategy: `Generate nominal, burst boundary, backpressure stall, and error-injection sequences for ${t.name}.`,
      monitorStrategy: `Sample clock-qualified ${t.name} transitions cleanly to reconstruct complete transactions.`,
      scoreboardStrategy: `Correlate initiated ${t.name} commands against expected target completions and integrity checks.`,
      coveragePoints: [
        `${t.name} nominal vs back-to-back vs error recovery cross coverage`,
        'Maximum burst / payload size and credit boundary wraparound bins',
      ],
      cornerCases: [
        'Asynchronous reset assertion/release during active transfer.',
        'Extended stall/backpressure across multi-clock domains.',
      ],
      svaSnippet: `assert property (@(posedge clk) !$isunknown(req_valid));`,
      uvmSnippet: `class ${svIdent}_driver extends uvm_driver #(${svIdent}_seq_item);\n  \`uvm_component_utils(${svIdent}_driver)\nendclass`,
    },
    debuggingLab: [],
    interviewQuestions: iq,
    sources: [{ title: `${t.std} — ${t.fullName} Official Specification`, authority: t.std, reference: t.year }],
  };
}

const COMPREHENSIVE_TUPLES: CatalogTuple[] = [
  // Section 1: AMBA – ARM On-Chip Protocols
  { id: 'amba-axi', name: 'AMBA AXI', fullName: 'ARM AMBA Advanced eXtensible Interface Family', categoryId: 'amba', std: 'Arm IHI 0022', year: '2003–2023', tagline: 'Umbrella family for high-performance split-transaction 5-channel SoC interconnects (AXI3/AXI4/AXI5).' },
  { id: 'axi5', name: 'AXI5', fullName: 'AMBA 5 AXI Protocol Specification', categoryId: 'amba', std: 'Arm IHI 0022H', year: '2017–2023', tagline: 'Adds atomic operations, CMO cache maintenance, MTE memory tagging, Realm/CCA security, and user-check parity.' },
  { id: 'axi5-lite', name: 'AXI5-Lite', fullName: 'AMBA 5 AXI5-Lite Specification', categoryId: 'amba', std: 'Arm IHI 0022H', year: '2019–2023', tagline: 'Updated single-beat register bus adding AXI5 wakeup, firewall/poison, and interface parity protection.' },
  { id: 'axi5-stream', name: 'AXI5-Stream', fullName: 'AMBA 5 AXI5-Stream Protocol', categoryId: 'amba', std: 'Arm IHI 0051B', year: '2021', tagline: 'Adds wake-up signaling (`TWAKEUP`) and parity/check protection to AXI4-Stream data pipelines.' },
  { id: 'ahb', name: 'AHB', fullName: 'AMBA Advanced High-performance Bus', categoryId: 'amba', std: 'Arm IHI 0011 / 0033', year: '1999–2021', tagline: 'Original multi-master pipelined shared-bus fabric supporting SPLIT, RETRY, and burst transfers.' },
  { id: 'ahb5', name: 'AHB5', fullName: 'AMBA 5 AHB Protocol Specification', categoryId: 'amba', std: 'Arm IHI 0033C', year: '2015–2021', tagline: 'Single-copy atomicity (`HEXCL`), TrustZone `HNONSEC`, extended memory types, and interface parity.' },
  { id: 'apb2', name: 'APB2', fullName: 'AMBA 2 APB Protocol', categoryId: 'amba', std: 'Arm IHI 0011A', year: '1999', tagline: 'Baseline 2-cycle fixed-latency peripheral register bus with no wait states (`PREADY` absent).' },
  { id: 'apb3', name: 'APB3', fullName: 'AMBA 3 APB Protocol', categoryId: 'amba', std: 'Arm IHI 0024B', year: '2004', tagline: 'Introduces `PREADY` wait-state insertion and `PSLVERR` error reporting.' },
  { id: 'apb4', name: 'APB4', fullName: 'AMBA 4 APB Protocol', categoryId: 'amba', std: 'Arm IHI 0024C', year: '2010', tagline: 'Adds `PSTRB` sparse byte write strobes and `PPROT` privileged/secure protection bits.' },
  { id: 'apb5', name: 'APB5', fullName: 'AMBA 5 APB Protocol', categoryId: 'amba', std: 'Arm IHI 0024D', year: '2018–2021', tagline: 'Adds `PWAKEUP`, Realm/RME security attributes (`PNSE`), `PAUSER`, and check/parity signals.' },
  { id: 'ace-lite', name: 'ACE-Lite', fullName: 'AMBA AXI Coherency Extensions Lite', categoryId: 'amba', std: 'Arm IHI 0022E', year: '2011', tagline: 'I/O-coherent one-way snoop initiator interface for non-caching DMA, GPU, and accelerators.' },
  { id: 'ace5', name: 'ACE5', fullName: 'AMBA 5 ACE Coherent Interconnect', categoryId: 'amba', std: 'Arm IHI 0022H', year: '2017–2023', tagline: 'Hardware cache-coherent AMBA 5 extension adding atomics, Stash, CMO, and Realm protection.' },
  { id: 'ace5-lite', name: 'ACE5-Lite', fullName: 'AMBA 5 ACE5-Lite I/O Coherent Interface', categoryId: 'amba', std: 'Arm IHI 0022H', year: '2017–2023', tagline: 'AMBA 5 I/O coherency for PCIe/DMA agents snooping CPU caches without holding local coherent caches.' },
  { id: 'chi-c2c', name: 'CHI C2C', fullName: 'AMBA CHI Chip-to-Chip Specification', categoryId: 'amba', std: 'Arm IHI 0099', year: '2023', tagline: 'Packetizes AMBA CHI flits across chiplet/C2C links for multi-die coherent Arm Neoverse topologies.' },
  { id: 'atb', name: 'ATB', fullName: 'AMBA Trace Bus', categoryId: 'amba', std: 'Arm IHI 0032', year: '2006–2021', tagline: 'High-throughput unidirectional CoreSight debug trace streaming bus with ID tagging and flush control.' },
  { id: 'cxs', name: 'CXS', fullName: 'AMBA Coherent Hub Streaming Interface', categoryId: 'amba', std: 'Arm IHI 0079', year: '2020', tagline: 'Point-to-point flit-level packet streaming interface connecting CHI/CCIX/CXL home nodes to D2D PHYs.' },
  { id: 'dti', name: 'DTI', fullName: 'AMBA Distributed Translation Interface', categoryId: 'amba', std: 'Arm IHI 0087', year: '2020', tagline: 'Standardizes ATS/PRI address translation messages between Arm SMMU (TBU) and Translation Control Units (TCU).' },
  { id: 'lti', name: 'LTI', fullName: 'AMBA Local Translation Interface', categoryId: 'amba', std: 'Arm IHI 0093', year: '2021', tagline: 'Low-latency local MMU/TBU translation request-response interface alongside AXI5/ACE5 streams.' },
  { id: 'lpi', name: 'LPI', fullName: 'AMBA Low Power Interface', categoryId: 'amba', std: 'Arm IHI 0068', year: '2015', tagline: 'Umbrella framework defining Q-Channel and P-Channel clock/power-gating handshakes.' },
  { id: 'q-channel', name: 'Q-Channel', fullName: 'AMBA Low-Power Quiescence Q-Channel', categoryId: 'amba', std: 'Arm IHI 0068', year: '2015', tagline: '4-wire (`QREQn`, `QACCEPTn`, `QDENY`, `QACTIVE`) clock/power quiescence handshake.' },
  { id: 'p-channel', name: 'P-Channel', fullName: 'AMBA Low-Power State P-Channel', categoryId: 'amba', std: 'Arm IHI 0068', year: '2015', tagline: 'Multi-state power transition handshake (`PREQ`, `PSTATE`, `PACCEPT`, `PDENY`, `PACTIVE`).' },
  { id: 'gfb', name: 'GFB', fullName: 'AMBA Generic Flash Bus', categoryId: 'amba', std: 'Arm IHI 0082', year: '2018', tagline: 'Vendor-neutral embedded NVM/Flash controller-to-macro command/read/program interface.' },

  // Section 2: On-Chip Bus and Interconnect Protocols
  { id: 'tl-uh', name: 'TileLink-UH', fullName: 'TileLink Uncached Heavyweight', categoryId: 'interconnect', std: 'SiFive / CHIPS Alliance 1.8.1', year: '2017–2023', tagline: 'Adds multi-beat bursts, atomic arithmetic ops, and Intent hints to TL-UL without cache-block ownership.' },
  { id: 'tl-ud', name: 'TileLink-UD', fullName: 'TileLink Uncached Data / Streaming Profile', categoryId: 'interconnect', std: 'CHIPS Alliance Draft Profile', year: '2022', tagline: 'Variant/terminology profile focusing on uncached split-data streaming across open-source SoC fabrics.' },
  { id: 'wishbone-classic', name: 'Wishbone Classic', fullName: 'Wishbone System-on-Chip Interconnect Rev B3', categoryId: 'interconnect', std: 'OpenCores / Silicore', year: '2002', tagline: 'Open-source master-slave synchronous bus (`CYC`, `STB`, `WE`, `ACK`) for FPGA/ASIC cores.' },
  { id: 'wishbone-b4', name: 'Wishbone B4', fullName: 'Wishbone B4 Pipelined Interconnect Specification', categoryId: 'interconnect', std: 'OpenCores Rev B4', year: '2010', tagline: 'Introduces `STALL` signal for registered pipelined burst transfers alongside classic mode.' },
  { id: 'ocp', name: 'OCP', fullName: 'Open Core Protocol (OCP 3.0)', categoryId: 'interconnect', std: 'OCP-IP / Accellera', year: '2001–2013', tagline: 'Configurable socket-based core-centric bus decoupler with sideband threads and burst profiles.' },
  { id: 'coreconnect-plb', name: 'CoreConnect PLB', fullName: 'IBM CoreConnect Processor Local Bus', categoryId: 'interconnect', std: 'IBM CoreConnect', year: '1999', tagline: 'High-bandwidth 64/128-bit split read/write bus for PowerPC-era SoCs and legacy Xilinx Virtex FPGAs.' },
  { id: 'coreconnect-opb', name: 'CoreConnect OPB', fullName: 'IBM CoreConnect On-chip Peripheral Bus', categoryId: 'interconnect', std: 'IBM CoreConnect', year: '1999', tagline: 'Synchronous 32-bit peripheral bus bridged off CoreConnect PLB for low-gate-count I/O.' },
  { id: 'coreconnect-dcr', name: 'CoreConnect DCR', fullName: 'IBM CoreConnect Device Control Register Bus', categoryId: 'interconnect', std: 'IBM CoreConnect', year: '1999', tagline: 'Dedicated daisy-chained control-register ring relieving memory traffic on CoreConnect systems.' },
  { id: 'avalon-mm', name: 'Avalon-MM', fullName: 'Intel/Altera Avalon Memory-Mapped Interface', categoryId: 'interconnect', std: 'Intel FPGA Avalon', year: '2004–2024', tagline: 'Parameterizable memory-mapped FPGA bus (`address`, `waitrequest`, `readdatavalid`) synthesized by Platform Designer.' },
  { id: 'avalon-st', name: 'Avalon-ST', fullName: 'Intel/Altera Avalon Streaming Interface', categoryId: 'interconnect', std: 'Intel FPGA Avalon', year: '2006–2024', tagline: 'Point-to-point unidirectional streaming (`valid`, `ready`, `data`, `sop`, `eop`) for FPGA DSP pipelines.' },
  { id: 'ahb-multilayer', name: 'AHB Multilayer', fullName: 'AMBA Multi-Layer AHB Interconnect Matrix', categoryId: 'interconnect', std: 'Arm IHI 0033 / Matrix', year: '2003', tagline: 'Parallel crossbar interconnection of AHB buses allowing simultaneous non-blocking master transfers.' },
  { id: 'axi-crossbar', name: 'AXI Crossbar Interfaces', fullName: 'Full-Mesh AXI4/AXI5 Crossbar Routing Ports', categoryId: 'interconnect', std: 'Arm AMBA / Open-Source', year: '2010–2024', tagline: 'N-to-M non-blocking SoC crossbar arbitrating AW/W/B/AR/R channels with QoS and ID width expansion.' },
  { id: 'noc-packet-if', name: 'NoC Packet Interfaces', fullName: 'Packetized On-Die NoC Flit Interfaces', categoryId: 'interconnect', std: 'SoC / IEEE / Open-Source', year: '2015–2025', tagline: 'Header/body/tail wormhole-routed packet links abstracting protocol channels across multi-clock domains.' },
  { id: 'pulp-axi', name: 'PULP AXI', fullName: 'ETH Zurich PULP SystemVerilog AXI Ecosystem', categoryId: 'interconnect', std: 'PULP Platform (Apache-2.0)', year: '2017–2025', tagline: 'Rich open-source SystemVerilog structs, crossbars, CDC FIFOs, and DMA bridges built on AXI4/AXI5.' },
  { id: 'pulp-apb', name: 'PULP APB', fullName: 'ETH Zurich PULP APB Peripheral Macros', categoryId: 'interconnect', std: 'PULP Platform', year: '2017–2025', tagline: 'Parameterized `APB_BUS` SystemVerilog interfaces and AXI-to-APB bridges for open-source SoCs.' },
  { id: 'pulp-stream', name: 'PULP Stream Interface', fullName: 'PULP Hardware Processing Engine (HWPE) Stream Bus', categoryId: 'interconnect', std: 'PULP Platform', year: '2018–2024', tagline: 'Low-overhead streaming valid/ready + address generator interface feeding Tightly Coupled Data Memory (TCDM).' },
  { id: 'pulp-axi-lite', name: 'PULP AXI-Lite', fullName: 'PULP Platform AXI4-Lite Open-Source IP Suite', categoryId: 'interconnect', std: 'PULP Platform', year: '2018–2025', tagline: 'Synthesizable AXI4-Lite register files, crossbars, and width-converters in open-source PULP clusters.' },

  // Section 3: Processor and CPU Interfaces
  { id: 'riscv-ext-debug', name: 'RISC-V External Debug', fullName: 'RISC-V External Debug Support Interface', categoryId: 'processor', std: 'RISC-V International', year: '2019–2024', tagline: 'Architectural contract between an external debug probe (DTM) and on-chip Debug Module halting/stepping harts.' },
  { id: 'riscv-dmi', name: 'RISC-V DMI', fullName: 'RISC-V Debug Module Interface', categoryId: 'processor', std: 'RISC-V Debug v1.0', year: '2019–2024', tagline: 'Simple `req`/`resp` register bus bridging JTAG/USB Debug Transport Modules to the Debug Module registers.' },
  { id: 'riscv-trace', name: 'RISC-V Trace Interface', fullName: 'RISC-V Efficient Trace (E-Trace) & N-Trace Ingress', categoryId: 'processor', std: 'RISC-V International', year: '2020–2024', tagline: 'Cycle-by-cycle instruction retirement, branch, exception, and timestamp packet ingress from core to encoder.' },
  { id: 'core-v-ext-if', name: 'CORE-V eXtension Interface', fullName: 'OpenHW Group CORE-V X-Interface Profile', categoryId: 'processor', std: 'OpenHW Group', year: '2021–2024', tagline: 'Modular coprocessor issue/register/memory/result sub-interfaces extending CV32E40X/CVA6 cores cleanly.' },
  { id: 'arm-amba-proc-if', name: 'ARM AMBA Processor Interfaces', fullName: 'ARM Cortex / Neoverse ACE/CHI/AXI Core Ports', categoryId: 'processor', std: 'Arm Architecture', year: '2005–2024', tagline: 'Standardized processor cluster interfaces (AXI/ACE/CHI, ACP, ATB trace, GIC stream, Q/P power channels).' },
  { id: 'intel-fsb', name: 'Intel FSB', fullName: 'Intel Front-Side Bus (GTL+ Legacy)', categoryId: 'processor', std: 'Intel Corp (Historical)', year: '1993–2008', tagline: 'Multi-drop shared-clock parallel processor-to-northbridge bus superseded by point-to-point QPI/UPI.' },
  { id: 'intel-qpi', name: 'Intel QPI', fullName: 'Intel QuickPath Interconnect', categoryId: 'processor', std: 'Intel Corp', year: '2008–2017', tagline: 'High-speed point-to-point coherent multi-socket processor interconnect replacing shared Front-Side Bus.' },
  { id: 'intel-upi', name: 'Intel UPI', fullName: 'Intel Ultra Path Interconnect', categoryId: 'processor', std: 'Intel Corp', year: '2017–2025', tagline: 'Succeeds QPI in Xeon Scalable CPUs with directory-assisted coherency, higher GT/s, and lower protocol overhead.' },
  { id: 'hypertransport', name: 'HyperTransport', fullName: 'HyperTransport Consortium Coherent Link', categoryId: 'processor', std: 'HyperTransport 3.1', year: '2001–2010', tagline: 'Low-latency packetized bidirectional DDR point-to-point CPU/chipset interconnect used in classic Opteron/MIPS.' },
  { id: 'coherent-mesh-if', name: 'Coherent Mesh Interface', fullName: 'Mesh-NoC Coherent Slice & Directory Interface', categoryId: 'processor', std: 'Server SoC Architecture', year: '2017–2025', tagline: 'Tiled 2D mesh stop interface unifying CPU cores, L3 slices, home nodes, and memory controllers on server dies.' },
  { id: 'proc-mem-if', name: 'Processor Memory Interface', fullName: 'CPU L1/LSU-to-Memory Subsystem Interface', categoryId: 'processor', std: 'ISA / Microarchitecture', year: '2000–2025', tagline: 'Tightly coupled cache refill, store-buffer flush, and uncached I/O memory port exposed by CPU cores.' },
  { id: 'custom-coproc-if', name: 'Custom Coprocessor Interfaces', fullName: 'Tightly Coupled Coprocessor & RoCC Interfaces', categoryId: 'processor', std: 'RISC-V / Custom SoC', year: '2015–2025', tagline: 'Instruction-coupled interfaces (RoCC, Arm CDE, Tensilica TIE) delegating vector/crypto ops directly from pipeline.' },

  // Section 4: Cache Coherency Protocols (Logical state-machine protocols)
  { id: 'msi', name: 'MSI', fullName: 'Modified-Shared-Invalid Coherency Protocol', categoryId: 'coherency', std: 'Classic Coherency Model', year: '1984', tagline: 'Foundational 3-state write-invalidate protocol requiring bus upgrade transactions even for private lines.', caveatKind: 'coherency' },
  { id: 'mosi', name: 'MOSI', fullName: 'Modified-Owned-Shared-Invalid Protocol', categoryId: 'coherency', std: 'Snooping / Directory Model', year: '1987', tagline: 'Adds Owned state to MSI so dirty shared lines transfer directly cache-to-cache without DRAM writeback.', caveatKind: 'coherency' },
  { id: 'mesif', name: 'MESIF', fullName: 'Modified-Exclusive-Shared-Invalid-Forward', categoryId: 'coherency', std: 'Intel QPI / UPI Model', year: '2008', tagline: 'Adds Forward (F) state designating one responder among multiple Shared copies to answer peer read requests.', caveatKind: 'coherency' },
  { id: 'mersi', name: 'MERSI', fullName: 'Modified-Exclusive-Recent-Shared-Invalid', categoryId: 'coherency', std: 'IBM POWER Coherency', year: '2006', tagline: 'IBM variant assigning a Recent (R) responder state (conceptually similar to Forward) to optimize cache-to-cache supply.', caveatKind: 'coherency' },
  { id: 'tilelink-coherence', name: 'TileLink Coherence', fullName: 'TileLink TL-C Hierarchical Coherency Protocol', categoryId: 'coherency', std: 'CHIPS Alliance 1.8.1', year: '2017–2023', tagline: 'Tree-structured Acquire/Probe/Release/Grant/Finish state machine supporting arbitrary multi-level open-source caches.', caveatKind: 'coherency' },
  { id: 'moesif', name: 'MOESIF', fullName: 'Modified-Owned-Exclusive-Shared-Invalid-Forward', categoryId: 'coherency', std: 'Advanced Multi-Socket Model', year: '2012', tagline: 'Combines Owned dirty sharing (O) with clean Forward responder election (F) to minimize DRAM traffic.', caveatKind: 'coherency' },
  { id: 'directory-coherence', name: 'Directory-Based Coherence', fullName: 'Directory & Snoop-Filter Point-to-Point Coherency', categoryId: 'coherency', std: 'Scalable Multi-Core Model', year: '1990–2025', tagline: 'Replaces broadcast snoops with centralized/sliced sharer bitvectors inside home nodes (CHI / Coherent Mesh).', caveatKind: 'coherency' },
  { id: 'snooping-coherence', name: 'Snooping Coherence', fullName: 'Broadcast Bus Snooping Coherency Protocol', categoryId: 'coherency', std: 'Symmetric Shared-Bus Model', year: '1983–2020', tagline: 'All caching masters observe every coherence request on an ordered shared interconnect (classic ACE/SMP).', caveatKind: 'coherency' },
  { id: 'moesi-cmp-directory', name: 'MOESI CMP Directory', fullName: '2-Level Chip-Multiprocessor MOESI Directory', categoryId: 'coherency', std: 'gem5 / Server SoC Architecture', year: '2005–2024', tagline: 'Hierarchical L1-L2 directory maintaining MOESI invariants with transient race states across NUCA banks.', caveatKind: 'coherency' },
  { id: 'amd-if-coherency', name: 'AMD Infinity Fabric Coherency', fullName: 'Scalable Data & Control Fabric Coherency Layer', categoryId: 'coherency', std: 'AMD Architecture', year: '2017–2025', tagline: 'Probe-filtered MOESI coherency spanning CCX/CCD chiplets and multi-socket xGMI/PCIe links.', caveatKind: 'coherency' },

  // Section 5: Memory Interface Protocols (DRAM & Memory Controllers)
  { id: 'sdr-sdram', name: 'SDR SDRAM', fullName: 'Single Data Rate Synchronous DRAM (JESD21-C)', categoryId: 'memory', std: 'JEDEC JESD21-C', year: '1993', tagline: 'Single-edge synchronous DRAM sampling RAS/CAS commands and DQ data once per rising clock.' },
  { id: 'ddr', name: 'DDR', fullName: 'JEDEC JESD79 Double Data Rate SDRAM', categoryId: 'memory', std: 'JEDEC JESD79', year: '2000', tagline: 'First-generation DDR transferring data on both rising and falling DQS edges with 2n prefetch.' },
  { id: 'ddr2', name: 'DDR2', fullName: 'JEDEC JESD79-2 DDR2 SDRAM', categoryId: 'memory', std: 'JEDEC JESD79-2', year: '2003', tagline: 'Adds 4n prefetch, on-die termination (ODT), and posted CAS additive latency at 1.8V.' },
  { id: 'ddr6', name: 'DDR6', fullName: 'Next-Generation DDR6 SDRAM (Specification in Development)', categoryId: 'memory', std: 'JEDEC Emerging Draft', year: '2025+', tagline: 'Next-gen 4×24-bit or multi-subchannel high-rate DRAM architecture targeted beyond 12,800 MT/s.', emerging: true, caveatKind: 'emerging' },
  { id: 'lpddr', name: 'LPDDR', fullName: 'Mobile Low-Power DDR1 (JESD209)', categoryId: 'memory', std: 'JEDEC JESD209', year: '2006', tagline: '1.8V low-power mobile SDRAM eliminating ODT and adding Partial Array Self-Refresh (PASR).' },
  { id: 'lpddr2', name: 'LPDDR2', fullName: 'Low-Power DDR2 SDRAM (JESD209-2)', categoryId: 'memory', std: 'JEDEC JESD209-2', year: '2009', tagline: '1.2V multiplexed DDR Command/Address (CA) pins dramatically cutting package pin count.' },
  { id: 'lpddr3', name: 'LPDDR3', fullName: 'Low-Power DDR3 SDRAM (JESD209-3)', categoryId: 'memory', std: 'JEDEC JESD209-3', year: '2012', tagline: '1600–2133 MT/s mobile DRAM adding CA training, 8n prefetch, and write leveling.' },
  { id: 'lpddr4x', name: 'LPDDR4X', fullName: 'Low-Power DDR4X (0.6V VDDQ)', categoryId: 'memory', std: 'JEDEC JESD209-4B', year: '2016', tagline: 'Reduces I/O swing voltage from 1.1V down to 0.6V VDDQ, slashing smartphone DRAM I/O power.' },
  { id: 'lpddr5x', name: 'LPDDR5X', fullName: 'Enhanced Low-Power DDR5 (JESD209-5B)', categoryId: 'memory', std: 'JEDEC JESD209-5B', year: '2021', tagline: 'Extends LPDDR5 to 8533–9600+ MT/s with adaptive refresh, enhanced TX equalization, and AI edge throughput.' },
  { id: 'lpddr6', name: 'LPDDR6', fullName: 'Next-Generation LPDDR6 (Emerging Standard)', categoryId: 'memory', std: 'JEDEC Emerging Draft', year: '2025+', tagline: 'Emerging ultra-low-power dual-subchannel mobile & edge AI memory interface.', emerging: true, caveatKind: 'emerging' },
  { id: 'gddr3', name: 'GDDR3', fullName: 'Graphics Double Data Rate 3', categoryId: 'memory', std: 'JEDEC JESD212 / Graphics', year: '2004', tagline: 'Early GPU-optimized SDRAM with pseudo-open-drain drivers and separate READ/WRITE strobes.' },
  { id: 'gddr4', name: 'GDDR4', fullName: 'Graphics Double Data Rate 4', categoryId: 'memory', std: 'JEDEC', year: '2006', tagline: 'Transitional 8n-prefetch graphics DRAM adding Data Bus Inversion (DBI).' },
  { id: 'gddr5', name: 'GDDR5', fullName: 'Graphics Double Data Rate 5 (JESD212)', categoryId: 'memory', std: 'JEDEC JESD212', year: '2008', tagline: 'Split CK command clock + quadrature WCK data clock with EDC per-byte CRC and adaptive training.' },
  { id: 'gddr5x', name: 'GDDR5X', fullName: 'Enhanced GDDR5 (QDR Mode)', categoryId: 'memory', std: 'JEDEC JESD232', year: '2016', tagline: '16n prefetch quad-data-rate graphics DRAM pushing 10–14 Gbps per pin before GDDR6.' },
  { id: 'gddr6', name: 'GDDR6', fullName: 'Graphics Double Data Rate 6 (JESD250)', categoryId: 'memory', std: 'JEDEC JESD250', year: '2018', tagline: 'Dual independent 16-bit channels per package reaching 16–20 Gbps NRZ per pin.' },
  { id: 'gddr6x', name: 'GDDR6X', fullName: 'GDDR6X PAM4 Graphics Memory', categoryId: 'memory', std: 'Micron / NVIDIA', year: '2020', tagline: 'PAM4 4-level signaling variant of GDDR6 hitting 21–23 Gbps per pin across GPU cards.' },
  { id: 'gddr7', name: 'GDDR7', fullName: 'Graphics Double Data Rate 7 (JESD239)', categoryId: 'memory', std: 'JEDEC JESD239', year: '2024', tagline: 'PAM3 (3-level) signaling reaching 32–36+ Gbps/pin with independent clock domains and on-die ECC.', emerging: true, caveatKind: 'emerging' },
  { id: 'hbm', name: 'HBM', fullName: 'First-Gen High Bandwidth Memory (JESD235)', categoryId: 'memory', std: 'JEDEC JESD235', year: '2013', tagline: '1024-bit ultra-wide TSV-stacked DRAM over silicon interposer delivering 128 GB/s per stack.' },
  { id: 'hbm2', name: 'HBM2', fullName: 'High Bandwidth Memory 2 (JESD235A)', categoryId: 'memory', std: 'JEDEC JESD235A', year: '2016', tagline: 'Adds pseudo-channel (2×64b) mode and up to 8-Hi/12-Hi TSV stacks at 256–307 GB/s.' },
  { id: 'hbm2e', name: 'HBM2E', fullName: 'Extended HBM2 (JESD235C)', categoryId: 'memory', std: 'JEDEC JESD235C', year: '2019', tagline: 'Pushes HBM2 pin rate to 3.2–3.6 Gbps (460 GB/s per stack) for HPC & AI accelerators.' },
  { id: 'hbm3e', name: 'HBM3E', fullName: 'Extended HBM3 (9.2+ Gbps/pin)', categoryId: 'memory', std: 'JEDEC JESD238A/B', year: '2023', tagline: '12-Hi/16-Hi HBM3 extension delivering >1.18 TB/s per stack for frontier AI training GPUs.' },
  { id: 'hbm4', name: 'HBM4', fullName: 'Next-Gen 2048-Bit High Bandwidth Memory', categoryId: 'memory', std: 'JEDEC HBM4 Draft', year: '2025+', tagline: 'Doubles TSV interface width to 2048 bits with logic-base-die customization for future AI packages.', emerging: true, caveatKind: 'emerging' },
  { id: 'dfi', name: 'DFI', fullName: 'DDR PHY Interface Specification (DFI 5.x)', categoryId: 'memory', std: 'DFI Group', year: '2007–2024', tagline: 'Standardizes timing-critical logic boundary between ASIC Memory Controllers and DDR/LPDDR/HBM PHYs.' },
  { id: 'ddr-phy-if', name: 'DDR PHY Interface', fullName: 'Synchronous Memory Controller-to-PHY Fabric', categoryId: 'memory', std: 'DFI / Foundry Hard Macro', year: '2008–2024', tagline: 'Handles 1:2 / 1:4 frequency gearboxes, leveling calibration, and CA/DQ phase alignment.' },
  { id: 'mem-ctrl-if', name: 'Memory Controller Interface', fullName: 'Native SoC Scheduler / Page-Policy Interface', categoryId: 'memory', std: 'SoC Architecture Standard', year: '2005–2024', tagline: 'Reorders reads/writes for open-page bank hits while enforcing refresh and QoS guarantees.' },
  { id: 'axi-mem-if', name: 'AXI Memory Interface', fullName: 'AXI4/AXI5 Native DDR Controller Front-End', categoryId: 'memory', std: 'Arm AMBA / FPGA IP', year: '2010–2024', tagline: 'Multi-port QoS arbitrated AXI slave front-end bridging NoCs directly into DRAM command queues.' },
  { id: 'avalon-mem-if', name: 'Avalon Memory Interface', fullName: 'Intel FPGA EMIF Avalon-MM Front-End', categoryId: 'memory', std: 'Intel FPGA EMIF', year: '2010–2024', tagline: 'Pipelined burst Avalon-MM user interface exposed by Intel Agilex/Stratix external DDR IP.' },
  { id: 'hyperbus', name: 'HyperBus', fullName: '8-Bit DDR Low-Pin-Count HyperRAM/Flash Bus', categoryId: 'memory', std: 'Infineon / JEDEC xSPI', year: '2014', tagline: '12-pin high-speed 8-bit DDR bus achieving 333–400 MB/s with RWDS data strobe.' },
  { id: 'ospi-mem-if', name: 'OSPI Memory Interface', fullName: 'Octal SPI DDR XIP Memory Interface', categoryId: 'memory', std: 'JEDEC JESD251 (xSPI)', year: '2018', tagline: '8-bit DDR external NOR Flash / PSRAM XIP bus reaching 400 MB/s on microcontrollers.' },

  // Section 6: Non-Volatile Memory and Storage Interfaces
  { id: 'ospi', name: 'OSPI', fullName: 'Octal Serial Peripheral Interface (xSPI)', categoryId: 'storage', std: 'JEDEC JESD251', year: '2018', tagline: '8 bidirectional data lanes + DQS strobe executing DDR XIP boot & PSRAM access up to 400 MB/s.' },
  { id: 'spi-nor', name: 'SPI NOR Flash', fullName: 'Serial NOR Flash SFDP Command Protocol', categoryId: 'storage', std: 'JEDEC JESD216', year: '2011–2024', tagline: '1/2/4/8-lane reliable boot memory using SFDP discovery tables for SoC ROM execution.' },
  { id: 'spi-nand', name: 'SPI NAND Flash', fullName: 'Serial NAND Command & ECC Page Protocol', categoryId: 'storage', std: 'ONFI / Vendor', year: '2014', tagline: 'Low-pin-count high-density flash loading pages into internal cache (`13h`) before serial read (`03h`).' },
  { id: 'parallel-nor', name: 'Parallel NOR Flash', fullName: 'Asynchronous/Synchronous Parallel NOR Bus', categoryId: 'storage', std: 'JEDEC / CFI', year: '1995', tagline: 'Direct non-multiplexed address/data pins allowing instant byte-addressable XIP boot.' },
  { id: 'onfi-nand', name: 'ONFI NAND', fullName: 'Open NAND Flash Interface (ONFI 5.x)', categoryId: 'storage', std: 'ONFI Workgroup', year: '2006–2023', tagline: 'Standardizes raw 8/16-bit DDR NV-LVDDR2/NV-DDR3 NAND timings up to 2400–3600 MT/s per channel.' },
  { id: 'toggle-nand', name: 'Toggle NAND', fullName: 'Asynchronous/DDR Toggle Mode NAND', categoryId: 'storage', std: 'Kioxia / Samsung', year: '2009–2024', tagline: 'Bidirectional DQS-strobed high-speed raw NAND flash interface competing with ONFI.' },
  { id: 'emmc', name: 'eMMC', fullName: 'Embedded MultiMediaCard (JESD84-B51)', categoryId: 'storage', std: 'JEDEC eMMC 5.1', year: '2015', tagline: 'Managed BGA flash with integrated FTL controller over 8-bit HS400 DDR bus.' },
  { id: 'sd', name: 'SD', fullName: 'Secure Digital Card Bus (SD / UHS-I/II)', categoryId: 'storage', std: 'SD Association', year: '1999–2023', tagline: 'Removable CMD + 4-bit DAT flash card protocol supporting UHS-I 104 MB/s and SD Express PCIe.' },
  { id: 'sdio', name: 'SDIO', fullName: 'Secure Digital Input Output Peripheral Bus', categoryId: 'storage', std: 'SD Association', year: '2001', tagline: 'Extends SD 4-bit interface with CMD52/CMD53 register & DMA transfers for Wi-Fi/BT combo modules.' },
  { id: 'ufs', name: 'UFS', fullName: 'Universal Flash Storage (JESD220F UFS 4.0)', categoryId: 'storage', std: 'JEDEC / MIPI', year: '2011–2023', tagline: 'Full-duplex flagship smartphone flash running SCSI UTP over MIPI M-PHY + UniPro (up to 4.2 GB/s).' },
  { id: 'nvme', name: 'NVMe', fullName: 'Non-Volatile Memory Express Base 2.0', categoryId: 'storage', std: 'NVM Express Inc.', year: '2011–2024', tagline: 'Up to 64K submission/completion queue pairs eliminating AHCI legacy bottlenecks on SSDs.' },
  { id: 'nvme-pcie', name: 'NVMe over PCIe', fullName: 'NVMe PCIe Transport Specification', categoryId: 'storage', std: 'NVM Express / PCI-SIG', year: '2011–2024', tagline: 'Maps lockless NVMe doorbells and PRP/SGL DMA scatter-gather lists directly onto PCIe BARs.' },
  { id: 'nvme-of', name: 'NVMe-oF', fullName: 'NVMe over Fabrics (TCP / RDMA / FC)', categoryId: 'storage', std: 'NVM Express Inc.', year: '2016–2024', tagline: 'Extends NVMe queue-pair semantics across RoCEv2 RDMA and Ethernet TCP data-center fabrics.' },
  { id: 'sas', name: 'SAS', fullName: 'Serial Attached SCSI (SAS-4 24G)', categoryId: 'storage', std: 'INCITS T10', year: '2004–2020', tagline: 'Dual-ported enterprise storage SerDes multiplexing SSP, STP (SATA tunnel), and SMP management.' },
  { id: 'scsi', name: 'SCSI', fullName: 'Small Computer System Interface Architecture', categoryId: 'storage', std: 'INCITS T10 SAM-6', year: '1986–2023', tagline: 'Canonical CDB (Command Descriptor Block) storage protocol underlying SAS, iSCSI, USB MSC, and UFS.' },
  { id: 'hyperflash', name: 'HyperFlash', fullName: '12-Pin DDR HyperBus NOR Flash', categoryId: 'storage', std: 'Infineon / Cypress', year: '2014', tagline: 'Executes XIP reads at up to 333 MB/s using 8-bit DDR DQ[7:0] + RWDS strobe.' },
  { id: 'cfi-flash', name: 'CFI Flash', fullName: 'Common Flash Memory Interface (JESD68)', categoryId: 'storage', std: 'JEDEC JESD68.01', year: '1997', tagline: 'Standardizes self-describing Query Tables on parallel NOR flash for portable bootloaders.' },

  // Section 7: Peripheral and Low-Speed Interfaces
  { id: 'usart', name: 'USART', fullName: 'Universal Synchronous/Asynchronous Receiver-Transmitter', categoryId: 'peripheral', std: 'EIA / SoC Peripheral', year: '1970s–2024', tagline: 'Adds an optional synchronous shift clock alongside standard asynchronous UART start/stop framing.' },
  { id: 'smbus', name: 'SMBus', fullName: 'System Management Bus (Rev 3.2)', categoryId: 'peripheral', std: 'SMIF / SBS-IF', year: '1995–2020', tagline: 'Strict-timeout, ARP-capable derivative of I2C used on motherboards, PMICs, and DDR SPD EEPROMs.' },
  { id: 'pmbus', name: 'PMBus', fullName: 'Power Management Bus (Rev 1.3)', categoryId: 'peripheral', std: 'SMIF', year: '2005–2014', tagline: 'SMBus-based command language standardizing VRM voltage margining, telemetry, and fault reporting.' },
  { id: 'one-wire', name: '1-Wire', fullName: 'Single-Wire Open-Drain Device Bus', categoryId: 'peripheral', std: 'Maxim / Analog', year: '1990s', tagline: 'Combines power (parasitic cap) and bidirectional half-duplex telemetry over a single data pin + ground.' },
  { id: 'i2s', name: 'I2S', fullName: 'Inter-IC Sound Digital Audio Bus', categoryId: 'peripheral', std: 'NXP / Philips', year: '1986', tagline: '3-wire serial PCM audio link (`BCLK`, `LRCLK`/`WS`, `SDATA`) isolating left/right stereo channels.' },
  { id: 'tdm', name: 'TDM', fullName: 'Time-Division Multiplexed Audio Interface', categoryId: 'peripheral', std: 'SoC Audio Codec Std', year: '1995–2024', tagline: 'Packs 4 to 16+ multi-channel microphone/speaker PCM slots onto one frame-synced `SDATA` wire.' },
  { id: 'pcm-audio', name: 'PCM Audio', fullName: 'Pulse-Code Modulation Synchronous Serial Audio', categoryId: 'peripheral', std: 'Telecom / DSP', year: '1980s–2024', tagline: 'Frame-sync pulsed serial interface transferring uncompressed linear/companded voice samples to codecs.' },
  { id: 'pdm', name: 'PDM', fullName: 'Pulse-Density Modulation MEMS Microphone Bus', categoryId: 'peripheral', std: 'MEMS Audio Standard', year: '2010–2024', tagline: '2-wire (CLK + 1-bit oversampled DATA) dual-edge DDR bus linking MEMS microphones to CIC decimation filters.' },
  { id: 'ac97', name: 'AC\'97', fullName: 'Intel Audio Codec \'97 Interface', categoryId: 'peripheral', std: 'Intel (Legacy)', year: '1997', tagline: 'Fixed 48 kHz 5-wire AC-link separating digital SoC controller from analog codec silicon.' },
  { id: 'intel-hda', name: 'HD Audio (Intel HDA)', fullName: 'Intel High Definition Audio Link', categoryId: 'peripheral', std: 'Intel HDA v1.0a', year: '2004', tagline: 'DMA-ring CORB/RIRB codec bus replacing AC\'97 for multi-stream high-sample-rate audio.' },
  { id: 'spdif', name: 'S/PDIF', fullName: 'Sony/Philips Digital Interface (IEC 60958)', categoryId: 'peripheral', std: 'IEC 60958', year: '1980s', tagline: 'Bi-phase mark self-clocking consumer optical/coax digital stereo & compressed audio interconnect.' },
  { id: 'microwire', name: 'Microwire', fullName: 'National Semiconductor 3-Wire Serial Bus', categoryId: 'peripheral', std: 'NSC / TI', year: '1980s', tagline: 'Predecessor to SPI Mode 0 using dedicated SK, SI, SO, CS lines for legacy EEPROMs and ADCs.' },
  { id: 'swpmi', name: 'SWPMI', fullName: 'Single Wire Protocol Master Interface', categoryId: 'peripheral', std: 'ETSI TS 102 613', year: '2007', tagline: 'Full-duplex single-wire PHY bridging NFC/baseband chips to UICC/SIM secure elements via current modulation.' },

  // Section 8: PCIe & High-Speed Interconnects
  { id: 'pci', name: 'PCI', fullName: 'Conventional Peripheral Component Interconnect', categoryId: 'high-speed', std: 'PCI-SIG 3.0', year: '1992–2004', tagline: '33/66 MHz 32/64-bit shared parallel multi-drop motherboard bus with multiplexed AD[31:0].' },
  { id: 'pci-x', name: 'PCI-X', fullName: 'PCI-eXtended Split-Transaction Parallel Bus', categoryId: 'high-speed', std: 'PCI-SIG 2.0', year: '1998–2003', tagline: '133–533 MHz server parallel extension of PCI introducing split transactions and ECC parity.' },
  { id: 'pcie-gen1', name: 'PCIe Gen1', fullName: 'PCI Express 1.0a/1.1 (2.5 GT/s)', categoryId: 'high-speed', std: 'PCI-SIG 1.1', year: '2003', tagline: 'Point-to-point full-duplex differential serial lanes at 2.5 GT/s using 8b/10b encoding (250 MB/s per lane).' },
  { id: 'pcie-gen2', name: 'PCIe Gen2', fullName: 'PCI Express 2.0 (5.0 GT/s)', categoryId: 'high-speed', std: 'PCI-SIG 2.0', year: '2007', tagline: 'Doubles Gen1 lane speed to 5.0 GT/s (8b/10b) with dynamic link speed negotiation.' },
  { id: 'pcie-gen3', name: 'PCIe Gen3', fullName: 'PCI Express 3.0 (8.0 GT/s)', categoryId: 'high-speed', std: 'PCI-SIG 3.0', year: '2010', tagline: 'Switches from 8b/10b to low-overhead 128b/130b scrambling, nearly doubling usable payload per Hz.' },
  { id: 'pcie-gen4', name: 'PCIe Gen4', fullName: 'PCI Express 4.0 (16.0 GT/s)', categoryId: 'high-speed', std: 'PCI-SIG 4.0', year: '2017', tagline: 'Doubles Gen3 NRZ speed to 16 GT/s (64 GB/s duplex x16) with stricter CTLE/DFE equalization.' },
  { id: 'pcie-gen7', name: 'PCIe Gen7', fullName: 'PCI Express 7.0 (128.0 GT/s PAM4)', categoryId: 'high-speed', std: 'PCI-SIG 7.0 (Draft / Release)', year: '2025', tagline: 'Targets 128 GT/s per lane via PAM4 Flit mode (512 GB/s bidirectional x16) for AI/800G fabrics.', emerging: true, caveatKind: 'emerging' },
  { id: 'cxl-io', name: 'CXL.io', fullName: 'Compute Express Link Non-Coherent I/O Protocol', categoryId: 'high-speed', std: 'CXL Consortium', year: '2019–2024', tagline: 'PCIe-derived enumeration, DMA, register access, and error reporting plane required by every CXL device.' },
  { id: 'cxl-cache', name: 'CXL.cache', fullName: 'Compute Express Link Device-to-Host Cache Coherency', categoryId: 'high-speed', std: 'CXL Consortium', year: '2019–2024', tagline: 'Lets Type 1/Type 2 accelerators cache host CPU DRAM coherently with low-latency snoop flits.' },
  { id: 'cxl-mem', name: 'CXL.mem', fullName: 'Compute Express Link Coherent Memory Access', categoryId: 'high-speed', std: 'CXL Consortium', year: '2019–2024', tagline: 'Allows host CPUs to map Type 2/Type 3 CXL memory expanders directly into cacheable load/store space.' },
  { id: 'cxl-1-1', name: 'CXL 1.1', fullName: 'Compute Express Link Revision 1.1', categoryId: 'high-speed', std: 'CXL 1.1', year: '2019', tagline: 'Foundational direct-attach coherent accelerator and memory expansion spec on PCIe Gen5 (32 GT/s).' },
  { id: 'cxl-2-0', name: 'CXL 2.0', fullName: 'Compute Express Link Revision 2.0', categoryId: 'high-speed', std: 'CXL 2.0', year: '2020', tagline: 'Adds single-level CXL switching, memory pooling across hosts, persistent memory, and IDE encryption.' },
  { id: 'cxl-3-0', name: 'CXL 3.0', fullName: 'Compute Express Link Revision 3.0', categoryId: 'high-speed', std: 'CXL 3.0', year: '2022', tagline: 'Doubles bandwidth on PCIe 6.0 (64 GT/s PAM4), enabling multi-level switching, GFD fabric, and P2P sharing.' },
  { id: 'cxl-3-1', name: 'CXL 3.1', fullName: 'Compute Express Link Revision 3.1', categoryId: 'high-speed', std: 'CXL 3.1', year: '2023', tagline: 'Adds Trusted Execution Environment (TEE) security enhancements, global fabric attached memory (GFAM), and port-based routing.' },
  { id: 'cxl-4-0', name: 'CXL 4.0', fullName: 'Compute Express Link Revision 4.0 (Roadmap)', categoryId: 'high-speed', std: 'CXL Consortium (Roadmap)', year: '2025+', tagline: 'Next-gen 128 GT/s CXL fabric alignment with PCIe Gen7 physical layer.', emerging: true, caveatKind: 'emerging' },
  { id: 'nvlink', name: 'NVLink', fullName: 'NVIDIA High-Bandwidth Coherent GPU Interconnect', categoryId: 'high-speed', std: 'NVIDIA Architecture', year: '2014–2025', tagline: 'High-speed multi-lane PAM4 coherent fabric linking GPUs and Grace CPUs up to 900–1800 GB/s.' },
  { id: 'nvlink-c2c', name: 'NVLink-C2C', fullName: 'NVIDIA Chip-to-Chip Coherent Interconnect', categoryId: 'high-speed', std: 'NVIDIA Architecture', year: '2022–2025', tagline: 'Ultra-low-energy coherent package/board interconnect uniting Grace CPU and Hopper/Blackwell GPUs.' },
  { id: 'infinity-fabric', name: 'Infinity Fabric', fullName: 'AMD Scalable Infinity Fabric (IFOP / IFIS)', categoryId: 'high-speed', std: 'AMD Architecture', year: '2017–2025', tagline: 'Unifies scalable data (SDF) and control (SCF) buses across EPYC/Ryzen chiplets and Instinct GPUs.' },
  { id: 'rapidio', name: 'RapidIO', fullName: 'RapidIO Switched Packet Interconnect (Gen 1–4)', categoryId: 'high-speed', std: 'RapidIO Trade Assoc', year: '2000–2016', tagline: 'Deterministic microsecond-latency embedded DSP/base-station packet switch fabric.' },
  { id: 'gen-z', name: 'Gen-Z', fullName: 'Gen-Z Memory-Semantic Fabric (Merged into CXL)', categoryId: 'high-speed', std: 'Gen-Z / CXL Consortium', year: '2016–2021', tagline: 'Byte-addressable rack-scale memory fabric whose IP and assets merged into CXL Consortium.' },

  // Section 9: USB Interfaces
  { id: 'usb-1-0', name: 'USB 1.0', fullName: 'Universal Serial Bus 1.0 (1.5 / 12 Mbps)', categoryId: 'usb', std: 'USB-IF', year: '1996', tagline: 'Original plug-and-play host-polled differential D+/D- bus for keyboards, mice, and printers.' },
  { id: 'usb-1-1', name: 'USB 1.1', fullName: 'Universal Serial Bus 1.1 Full Speed', categoryId: 'usb', std: 'USB-IF', year: '1998', tagline: 'Stabilized Full-Speed (12 Mbps) hub and electrical rules, driving mass PC adoption.' },
  { id: 'usb-2-0', name: 'USB 2.0', fullName: 'USB 2.0 High-Speed (480 Mbps)', categoryId: 'usb', std: 'USB-IF', year: '2000', tagline: 'Adds High-Speed 480 Mbps NRZI current-mode signaling via UTMI+/ULPI PHY interfaces.' },
  { id: 'usb-3-0', name: 'USB 3.0', fullName: 'USB 3.0 SuperSpeed Gen1 (5 Gbps)', categoryId: 'usb', std: 'USB-IF', year: '2008', tagline: 'Introduces dual-simplex SSTX/SSRX differential SerDes pairs alongside legacy USB 2.0 D+/D-.' },
  { id: 'usb-3-1', name: 'USB 3.1', fullName: 'USB 3.1 SuperSpeed+ (10 Gbps)', categoryId: 'usb', std: 'USB-IF', year: '2013', tagline: 'Upgrades to 128b/132b encoding at 10 GT/s, doubling net throughput over Gen1.' },
  { id: 'usb-3-2', name: 'USB 3.2', fullName: 'USB 3.2 Dual-Lane SuperSpeed+ (20 Gbps)', categoryId: 'usb', std: 'USB-IF', year: '2017', tagline: 'Bonds two 10 Gbps SuperSpeed lanes over reversible USB Type-C cables to reach 20 Gbps.' },
  { id: 'usb4-v2', name: 'USB4 v2.0', fullName: 'USB4 Version 2.0 (80 / 120 Gbps PAM3)', categoryId: 'usb', std: 'USB-IF USB4 v2', year: '2022', tagline: 'Uses PAM3 signaling at 25.6 GBaud to reach 80 Gbps symmetric or 120/40 Gbps asymmetric over USB-C.' },
  { id: 'usb-type-c', name: 'USB Type-C', fullName: 'USB Type-C Cable & Connector Specification', categoryId: 'usb', std: 'USB-IF', year: '2014–2024', tagline: 'Reversible 24-pin connector adding CC1/CC2 orientation, role detection, and DisplayPort/USB4 Alt-Modes.' },
  { id: 'usb-pd', name: 'USB PD', fullName: 'USB Power Delivery Specification (Rev 3.1/3.2)', categoryId: 'usb', std: 'USB-IF PD 3.2', year: '2012–2023', tagline: 'BMC-coded CC-wire protocol negotiating up to 240W Extended Power Range (48V/5A) and Alt-Modes.' },
  { id: 'usb-otg', name: 'USB OTG', fullName: 'USB On-The-Go & Dual-Role Device (DRD)', categoryId: 'usb', std: 'USB-IF OTG', year: '2001', tagline: 'Allows smartphones/tablets to dynamically switch between USB Host and Peripheral roles via ID pin/SRP/HNP.' },
  { id: 'usb-uas', name: 'USB UAS', fullName: 'USB Attached SCSI Protocol (UASP)', categoryId: 'usb', std: 'USB-IF / T10', year: '2009', tagline: 'Replaces single-threaded Bulk-Only Transport with parallel command/status streams over USB 3.x.' },
  { id: 'usb-msc', name: 'USB MSC', fullName: 'USB Mass Storage Class (BOT)', categoryId: 'usb', std: 'USB-IF', year: '1999', tagline: 'Wraps SCSI block commands inside CBW/CSW Bulk-Only Transport packets for flash drives.' },
  { id: 'usb-audio', name: 'USB Audio', fullName: 'USB Audio Device Class (UAC 1.0/2.0/3.0)', categoryId: 'usb', std: 'USB-IF UAC3', year: '1998–2016', tagline: 'Isochronous audio streaming & mixer topology class for USB DACs, headsets, and interfaces.' },
  { id: 'usb-uvc', name: 'USB Video (UVC)', fullName: 'USB Video Class Specification (1.5)', categoryId: 'usb', std: 'USB-IF UVC', year: '2003–2012', tagline: 'Driverless webcam & capture streaming protocol supporting uncompressed YUV, MJPEG, and H.264.' },
  { id: 'usb-hid', name: 'USB HID', fullName: 'USB Human Interface Device Class', categoryId: 'usb', std: 'USB-IF HID 1.11', year: '2001', tagline: 'Interrupt-polled descriptor-based class for keyboards, mice, gamepads, and debug probes.' },
  { id: 'xhci', name: 'xHCI', fullName: 'Extensible Host Controller Interface (USB 3.x/4)', categoryId: 'usb', std: 'Intel xHCI 1.2', year: '2008–2019', tagline: 'Unified MMIO + Transfer Ring DMA controller managing USB 1.x/2.0/3.x ports simultaneously.' },
  { id: 'ehci', name: 'EHCI', fullName: 'Enhanced Host Controller Interface (USB 2.0)', categoryId: 'usb', std: 'Intel EHCI 1.0', year: '2001', tagline: 'High-Speed 480 Mbps MMIO schedule-list USB 2.0 host controller register standard.' },
  { id: 'ohci', name: 'OHCI', fullName: 'Open Host Controller Interface (USB 1.1)', categoryId: 'usb', std: 'Compaq/MS/NSC', year: '1999', tagline: 'Hardware-offloaded ED/TD DMA descriptor controller for 12 Mbps USB 1.1.' },
  { id: 'uhci', name: 'UHCI', fullName: 'Universal Host Controller Interface (USB 1.1)', categoryId: 'usb', std: 'Intel UHCI', year: '1996', tagline: 'Simplified Intel USB 1.x controller shifting frame-list scheduling work onto host CPU drivers.' },

  // Section 10: Ethernet and Networking Interfaces
  { id: 'eth-10base-t', name: '10BASE-T', fullName: 'IEEE 802.3i 10 Mbps Twisted-Pair Ethernet', categoryId: 'networking', std: 'IEEE 802.3i', year: '1990', tagline: 'Manchester-encoded 10 Mbps baseband Ethernet over Cat3/5 unshielded twisted pair.' },
  { id: 'eth-100base-tx', name: '100BASE-TX', fullName: 'IEEE 802.3u 100 Mbps Fast Ethernet', categoryId: 'networking', std: 'IEEE 802.3u', year: '1995', tagline: '4B5B + MLT-3 100 Mbps Fast Ethernet interfacing MACs through 25 MHz MII/RMII.' },
  { id: 'eth-1g', name: '1G Ethernet', fullName: 'IEEE 802.3ab/z Gigabit Ethernet (1000BASE-T/X)', categoryId: 'networking', std: 'IEEE 802.3ab', year: '1999', tagline: 'PAM5 full-duplex 1 Gbps Ethernet across 4 pairs, interfaced via GMII/RGMII/SGMII.' },
  { id: 'eth-2-5g', name: '2.5G Ethernet', fullName: 'IEEE 802.3bz 2.5GBASE-T Ethernet', categoryId: 'networking', std: 'IEEE 802.3bz', year: '2016', tagline: 'LDPC-coded 2.5 Gbps over legacy Cat5e cabling for Wi-Fi 6/7 AP uplinks and SoCs.' },
  { id: 'eth-5g', name: '5G Ethernet', fullName: 'IEEE 802.3bz 5GBASE-T Ethernet', categoryId: 'networking', std: 'IEEE 802.3bz', year: '2016', tagline: '5 Gbps multi-gig copper Ethernet doubling 2.5GBASE-T clock rate on Cat6 cabling.' },
  { id: 'eth-10g', name: '10G Ethernet', fullName: 'IEEE 802.3ae 10GBASE-R/KR Ethernet', categoryId: 'networking', std: 'IEEE 802.3ae', year: '2002', tagline: '64B/66B 10.3125 GBaud serial Ethernet bridging MACs via 156.25 MHz XGMII / XFI / SFI.' },
  { id: 'eth-25g', name: '25G Ethernet', fullName: 'IEEE 802.3by Single-Lane 25GBASE-CR/KR', categoryId: 'networking', std: 'IEEE 802.3by', year: '2016', tagline: 'Single 25.78 GBaud NRZ lane with optional RS-FEC for ToR server NICs.' },
  { id: 'eth-40g', name: '40G Ethernet', fullName: 'IEEE 802.3ba 40GBASE-R4 (4×10G)', categoryId: 'networking', std: 'IEEE 802.3ba', year: '2010', tagline: 'Stripes 64B/66B blocks across four 10.3125G virtual lanes (XLAUI) inside switches and NICs.' },
  { id: 'eth-50g', name: '50G Ethernet', fullName: 'IEEE 802.3cd Single-Lane 50GBASE-R PAM4', categoryId: 'networking', std: 'IEEE 802.3cd', year: '2018', tagline: 'Introduces 26.56 GBaud PAM4 + mandatory RS(544,514) FEC per lane.' },
  { id: 'eth-100g', name: '100G Ethernet', fullName: 'IEEE 802.3ba/bm/cd 100GBASE-R', categoryId: 'networking', std: 'IEEE 802.3bm/cd', year: '2010–2018', tagline: '100 Gbps Ethernet delivered via 4×25G NRZ, 2×50G PAM4, or single-lane 100G PAM4 (802.3ck).' },
  { id: 'eth-200g', name: '200G Ethernet', fullName: 'IEEE 802.3bs/ck 200GBASE-R PAM4', categoryId: 'networking', std: 'IEEE 802.3bs', year: '2017–2022', tagline: '200 Gbps cloud interconnect using 4×50G or 2×100G PAM4 SerDes lanes.' },
  { id: 'eth-400g', name: '400G Ethernet', fullName: 'IEEE 802.3bs/ck 400GBASE-R', categoryId: 'networking', std: 'IEEE 802.3bs', year: '2017–2022', tagline: 'Data-center backbone running 8×50G or 4×100G PAM4 with RS-FEC and 20-bit CGMII/CDGMII.' },
  { id: 'eth-800g', name: '800G Ethernet', fullName: 'IEEE 802.3df 800GBASE-R (8×100G PAM4)', categoryId: 'networking', std: 'IEEE 802.3df', year: '2024', tagline: 'AI-cluster & hyperscale switch Ethernet combining eight 106.25 Gbps PAM4 lanes.' },
  { id: 'eth-1-6t', name: '1.6T Ethernet', fullName: 'IEEE 802.3dj 1.6TbE (8×200G PAM4)', categoryId: 'networking', std: 'IEEE 802.3dj (Task Force)', year: '2025+', tagline: 'Next-gen 1.6 Terabit Ethernet scaling SerDes to 200 Gbps PAM4 per lane for AI superclusters.', emerging: true, caveatKind: 'emerging' },
  { id: 'mii', name: 'MII', fullName: 'Media Independent Interface (10/100M)', categoryId: 'networking', std: 'IEEE 802.3 Clause 22', year: '1995', tagline: '18-pin 4-bit nibble synchronous interface running at 25 MHz for 100 Mbps MAC-to-PHY links.' },
  { id: 'rmii', name: 'RMII', fullName: 'Reduced Media Independent Interface', categoryId: 'networking', std: 'RMII Consortium', year: '1998', tagline: 'Halves MII pin count using 2-bit dibits (`TXD[1:0]`, `RXD[1:0]`) on a shared 50 MHz REF_CLK.' },
  { id: 'gmii', name: 'GMII', fullName: 'Gigabit Media Independent Interface', categoryId: 'networking', std: 'IEEE 802.3 Clause 35', year: '1998', tagline: '8-bit byte-wide 125 MHz SDR interface connecting 1G Ethernet MACs to PHYs.' },
  { id: 'rgmii', name: 'RGMII', fullName: 'Reduced Gigabit Media Independent Interface', categoryId: 'networking', std: 'RGMII v2.0', year: '2002', tagline: '12-pin 4-bit DDR 125 MHz interface halving GMII pins on embedded SoC boards.' },
  { id: 'sgmii', name: 'SGMII', fullName: 'Serial Gigabit Media Independent Interface', categoryId: 'networking', std: 'Cisco ENG-46158', year: '2001', tagline: '1.25 GBaud 8b/10b differential SerDes carrying 10/100/1000 Mbps Ethernet across just 4 pins.' },
  { id: 'qsgmii', name: 'QSGMII', fullName: 'Quad Serial Gigabit MII (5 Gbps)', categoryId: 'networking', std: 'Cisco QSGMII', year: '2007', tagline: 'Multiplexes four independent 1G SGMII ports onto a single 5.0 GBaud SerDes lane.' },
  { id: 'xgmii', name: 'XGMII', fullName: '10 Gigabit Media Independent Interface', categoryId: 'networking', std: 'IEEE 802.3 Clause 46', year: '2002', tagline: 'Internal chip 32-bit DDR (or 64-bit SDR) interface bridging 10GbE MAC to PCS.' },
  { id: 'xlgmii', name: 'XLGMII', fullName: '40 Gigabit Media Independent Interface', categoryId: 'networking', std: 'IEEE 802.3 Clause 81', year: '2010', tagline: 'Internal 64/256-bit logical MAC-to-PCS reconciliation interface for 40G Ethernet.' },
  { id: 'cgmii', name: 'CGMII', fullName: '100 Gigabit Media Independent Interface', categoryId: 'networking', std: 'IEEE 802.3 Clause 81', year: '2010', tagline: 'High-width on-chip MAC-to-PCS bus sustaining 100 Gbps line rate at FPGA/ASIC core frequencies.' },
  { id: 'xfi', name: 'XFI', fullName: '10 Gigabit Small Form Factor Electrical Interface', categoryId: 'networking', std: 'INF-8077i (XFP)', year: '2002', tagline: 'Single-lane 10.3125 GBaud serial chip-to-module interconnect replacing 4-lane XAUI.' },
  { id: 'usxgmii', name: 'USXGMII', fullName: 'Universal Serial 10GE Media Independent Interface', categoryId: 'networking', std: 'Cisco USXGMII', year: '2016', tagline: 'Carries 10M through 10G multi-gig Ethernet ports over a single 10.3125 GBaud SerDes link.' },
  { id: 'mdio', name: 'MDIO', fullName: 'Management Data Input/Output (MDC/MDIO)', categoryId: 'networking', std: 'IEEE 802.3 Cl. 22 & 45', year: '1995–2022', tagline: '2-wire serial management bus letting Ethernet MACs configure PHY link speed, duplex, and status.' },
  { id: 'mii-mgmt', name: 'MII Management', fullName: 'IEEE 802.3 Clause 22 Station Management (STA)', categoryId: 'networking', std: 'IEEE 802.3 Clause 22', year: '1995', tagline: '32-bit frame format (`PRE`, `ST`, `OP`, `PHYAD`, `REGAD`, `TA`, `DATA`) over MDC/MDIO.' },
  { id: 'interlaken', name: 'Interlaken', fullName: 'Interlaken Packetized Chip-to-Chip SerDes Protocol', categoryId: 'networking', std: 'Interlaken Alliance 1.2', year: '2006', tagline: 'Scalable channelized 64B/67B packet interconnect linking switch/NPU ASICs up to 100G–800G+.' },
  { id: 'eth-mac-ctrl', name: 'Ethernet MAC Control', fullName: 'IEEE 802.3 Annex 31B PAUSE / PFC Flow Control', categoryId: 'networking', std: 'IEEE 802.3x / 802.1Qbb', year: '1997–2011', tagline: 'L2 PAUSE and per-priority PFC (802.1Qbb) flow-control frames enabling lossless RDMA fabrics.' },
  { id: 'ptp-1588', name: 'PTP (IEEE 1588)', fullName: 'Precision Time Protocol Hardware Timestamping', categoryId: 'networking', std: 'IEEE 1588-2019 (v2.1)', year: '2002–2019', tagline: 'Sub-nanosecond hardware MII/XGMII packet timestamping synchronizing 5G/TSN/financial networks.' },

  // Section 11: MIPI Alliance Protocols
  { id: 'mipi-csi-2', name: 'MIPI CSI-2', fullName: 'MIPI Camera Serial Interface 2 (v4.x)', categoryId: 'mipi', std: 'MIPI Alliance CSI-2', year: '2005–2023', tagline: 'Dominant smartphone/automotive camera pixel streaming protocol over D-PHY or C-PHY.' },
  { id: 'mipi-csi-3', name: 'MIPI CSI-3', fullName: 'MIPI Camera Serial Interface 3', categoryId: 'mipi', std: 'MIPI Alliance CSI-3', year: '2012', tagline: 'UniPro/M-PHY-based high-speed camera protocol offering native bidirectional framing.' },
  { id: 'mipi-dsi', name: 'MIPI DSI', fullName: 'MIPI Display Serial Interface (v1.x)', categoryId: 'mipi', std: 'MIPI Alliance DSI', year: '2006–2016', tagline: 'Low-EMI packetized Video-Mode & Command-Mode display link between SoCs and OLED/LCD panels.' },
  { id: 'mipi-dsi-2', name: 'MIPI DSI-2', fullName: 'MIPI Display Serial Interface 2 (v2.x)', categoryId: 'mipi', std: 'MIPI Alliance DSI-2', year: '2016–2023', tagline: 'Supports C-PHY & D-PHY alongside VESA DSC/VDC-M compression for 4K/120Hz mobile/XR panels.' },
  { id: 'mipi-d-phy', name: 'MIPI D-PHY', fullName: 'MIPI D-PHY Differential Physical Layer (v3.5)', categoryId: 'mipi', std: 'MIPI Alliance D-PHY', year: '2009–2023', tagline: 'Source-synchronous differential PHY seamlessly switching between low-power LP-11 and 4.5+ Gbps HS bursts.' },
  { id: 'mipi-c-phy', name: 'MIPI C-PHY', fullName: 'MIPI C-PHY 3-Phase Trio Physical Layer', categoryId: 'mipi', std: 'MIPI Alliance C-PHY', year: '2014–2023', tagline: 'Clock-embedded 3-wire trio encoding 2.28 bits per symbol—delivering higher bandwidth on fewer pins.' },
  { id: 'mipi-m-phy', name: 'MIPI M-PHY', fullName: 'MIPI M-PHY Multi-Gear SerDes PHY (v5.0)', categoryId: 'mipi', std: 'MIPI Alliance M-PHY', year: '2011–2022', tagline: 'High-speed embedded clock SerDes powering UFS 4.0 Gear 5 (23.2 Gbps/lane) and UniPro.' },
  { id: 'mipi-unipro', name: 'MIPI UniPro', fullName: 'MIPI Unified Protocol Stack (v2.0)', categoryId: 'mipi', std: 'MIPI Alliance UniPro', year: '2009–2022', tagline: 'Full OSI L1.5–L4 reliable link layer with CRC retry sitting directly atop M-PHY inside UFS.' },
  { id: 'mipi-i3c-basic', name: 'MIPI I3C Basic', fullName: 'MIPI I3C Basic Specification', categoryId: 'mipi', std: 'MIPI Alliance I3C Basic', year: '2018–2021', tagline: 'Royalty-free public subset of I3C covering SDR 12.5 MHz, DAA, and In-Band Interrupts.' },
  { id: 'mipi-soundwire', name: 'MIPI SoundWire', fullName: 'MIPI SoundWire Audio Bus (SWI3S v2.0)', categoryId: 'mipi', std: 'MIPI Alliance SoundWire', year: '2014–2023', tagline: '2-pin multi-drop DDR audio + control bus uniting microphones, amplifiers, and codecs in one clock domain.' },
  { id: 'mipi-slimbus', name: 'MIPI SLIMbus', fullName: 'Serial Low-power Inter-chip Media Bus', categoryId: 'mipi', std: 'MIPI Alliance SLIMbus', year: '2009', tagline: 'TDM multi-drop 2-wire audio and control bus preceding MIPI SoundWire.' },
  { id: 'mipi-rffe', name: 'MIPI RFFE', fullName: 'MIPI RF Front-End Control Interface (v3.x)', categoryId: 'mipi', std: 'MIPI Alliance RFFE', year: '2010–2022', tagline: 'Deterministic 52 MHz 2-wire bus timing 4G/5G power amplifiers, LNAs, switches, and antenna tuners.' },
  { id: 'mipi-digrf', name: 'MIPI DigRF', fullName: 'MIPI Digital Baseband-to-RF Interface (v4)', categoryId: 'mipi', std: 'MIPI Alliance DigRF', year: '2006–2010', tagline: 'High-speed serialized I/Q sample interface linking cellular modems and RF transceivers.' },
  { id: 'mipi-lli', name: 'MIPI LLI', fullName: 'MIPI Low Latency Interface', categoryId: 'mipi', std: 'MIPI Alliance LLI', year: '2012', tagline: 'Memory-mapped M-PHY die-to-die link allowing shared DRAM access between AP and cellular modem.' },
  { id: 'mipi-a-phy', name: 'MIPI A-PHY', fullName: 'MIPI A-PHY Automotive Long-Reach SerDes', categoryId: 'mipi', std: 'MIPI A-PHY / IEEE 2977', year: '2020–2023', tagline: '15-meter EMC-resilient asymmetric 16–32 Gbps coax/STP link carrying raw CSI-2/DSI-2 sensors in vehicles.' },
  { id: 'mipi-i2c', name: 'MIPI I2C (CCI)', fullName: 'MIPI Camera Control Interface (I2C Subset)', categoryId: 'mipi', std: 'MIPI Alliance', year: '2005', tagline: '400 kHz/1 MHz bidirectional 2-wire register channel paired with CSI-2 for camera sensor setup.' },
  { id: 'mipi-dcs', name: 'MIPI DCS', fullName: 'MIPI Display Command Set', categoryId: 'mipi', std: 'MIPI Alliance DCS', year: '2006–2021', tagline: 'Standardized display panel control commands (`sleep_out`, `set_brightness`, `write_memory`) atop DSI.' },

  // Section 12: Display and Video Interfaces
  { id: 'hdmi-1-4', name: 'HDMI 1.4', fullName: 'High-Definition Multimedia Interface 1.4b', categoryId: 'display', std: 'HDMI Forum', year: '2009', tagline: '10.2 Gbps TMDS 3-lane RGB/YCbCr link introducing 4K/30Hz and Ethernet/ARC.' },
  { id: 'hdmi-2-0', name: 'HDMI 2.0', fullName: 'High-Definition Multimedia Interface 2.0b', categoryId: 'display', std: 'HDMI Forum', year: '2013', tagline: 'Increases TMDS bandwidth to 18 Gbps supporting 4K/60Hz 4:4:4 and HDR10.' },
  { id: 'hdmi-2-1', name: 'HDMI 2.1', fullName: 'HDMI 2.1a Fixed Rate Link (48 Gbps)', categoryId: 'display', std: 'HDMI Forum', year: '2017', tagline: 'Replaces TMDS clock lane with 4-lane 12 Gbps FRL + 16b/18b + DSC for 8K/60 & 4K/120 VRR.' },
  { id: 'hdmi-2-2', name: 'HDMI 2.2', fullName: 'HDMI 2.2 Fixed Rate Link (96 Gbps)', categoryId: 'display', std: 'HDMI Forum (2025)', year: '2025', tagline: 'Next-generation 96 Gbps FRL HDMI link enabling higher uncompressed/DSC resolutions and Latency Indication.', emerging: true, caveatKind: 'emerging' },
  { id: 'displayport', name: 'DisplayPort', fullName: 'VESA DisplayPort Packetized Micro-Packet Link', categoryId: 'display', std: 'VESA DisplayPort', year: '2006–2024', tagline: 'AC-coupled 1–4 main differential lanes + 1 Mbps AUX channel using PCIe-like link training.' },
  { id: 'dp-1-2', name: 'DisplayPort 1.2', fullName: 'VESA DisplayPort 1.2 (HBR2 21.6 Gbps)', categoryId: 'display', std: 'VESA DP 1.2', year: '2010', tagline: 'Doubles lane speed to 5.4 Gbps HBR2 and adds Multi-Stream Transport (MST) daisy-chaining.' },
  { id: 'dp-1-4', name: 'DisplayPort 1.4', fullName: 'VESA DisplayPort 1.4a (HBR3 + DSC)', categoryId: 'display', std: 'VESA DP 1.4a', year: '2016', tagline: '32.4 Gbps (4×8.1 Gbps HBR3) + VESA DSC 1.2 visually lossless compression for 8K displays.' },
  { id: 'dp-2-0', name: 'DisplayPort 2.0', fullName: 'VESA DisplayPort 2.0 (UHBR 80 Gbps)', categoryId: 'display', std: 'VESA DP 2.0', year: '2019', tagline: 'Moves to 128b/132b encoding with UHBR10/13.5/20 rates delivering up to 77.37 Gbps payload.' },
  { id: 'dp-2-1', name: 'DisplayPort 2.1', fullName: 'VESA DisplayPort 2.1a UHBR Alignment', categoryId: 'display', std: 'VESA DP 2.1', year: '2022–2024', tagline: 'Aligns UHBR physical layer cleanly with USB4 PHYs and introduces DP54/DP80 cable certification.' },
  { id: 'edp', name: 'eDP', fullName: 'Embedded DisplayPort (eDP 1.5)', categoryId: 'display', std: 'VESA eDP', year: '2008–2021', tagline: 'Internal laptop/tablet panel link adding Panel Self-Refresh (PSR/PSR2) and Adaptive-Sync power savings.' },
  { id: 'vesa-dsc', name: 'DSC', fullName: 'VESA Display Stream Compression (DSC 1.2a)', categoryId: 'display', std: 'VESA DSC 1.2', year: '2014–2017', tagline: 'Low-latency ~3:1 visually lossless line-buffer compression codec embedded in DP, HDMI, and DSI.' },
  { id: 'lvds', name: 'LVDS', fullName: 'Low-Voltage Differential Signaling (TIA/EIA-644)', categoryId: 'display', std: 'ANSI/TIA/EIA-644', year: '1995', tagline: '350 mV current-mode differential signaling (1:7 serialization) long standard for LCD panels and industrial links.' },
  { id: 'rgb-parallel', name: 'RGB Parallel Video', fullName: 'Parallel DPI / RGB888 Pixel Sync Bus', categoryId: 'display', std: 'MIPI DPI / Legacy', year: '1990s', tagline: 'Unencoded 16/18/24-bit R/G/B wires accompanied by `PCLK`, `HSYNC`, `VSYNC`, and `DE`.' },
  { id: 'bt-656', name: 'BT.656', fullName: 'ITU-R BT.656 SD Digital Video Parallel Bus', categoryId: 'display', std: 'ITU-R BT.656', year: '1995', tagline: '8/10-bit 27 MHz YCbCr 4:2:2 stream embedding SAV/EAV timing codes directly inside pixel data.' },
  { id: 'bt-1120', name: 'BT.1120', fullName: 'ITU-R BT.1120 HD Digital Video Bus', categoryId: 'display', std: 'ITU-R BT.1120', year: '1998', tagline: '16/20-bit 74.25/148.5 MHz 1080p YCbCr 4:2:2 studio/ISP video interface with embedded EAV/SAV sync.' },
  { id: 'vga', name: 'VGA', fullName: 'Video Graphics Array (Analog RGBHV)', categoryId: 'display', std: 'IBM / VESA', year: '1987', tagline: 'Analog 0.7Vpp RGB DAC outputs paired with TTL `HSYNC`, `VSYNC`, and I2C DDC EDID.' },
  { id: 'dvi', name: 'DVI', fullName: 'Digital Visual Interface (TMDS 1.0)', categoryId: 'display', std: 'DDWG', year: '1999', tagline: 'First widespread 8b/10b TMDS digital monitor standard directly preceding HDMI.' },
  { id: 'openldi', name: 'OpenLDI', fullName: 'Open LVDS Display Interface (OLDI)', categoryId: 'display', std: 'OpenLDI / VESA', year: '1999', tagline: 'Standardized 7:1 FPD-Link/LVDS serialization bit mapping for automotive & industrial flat panels.' },
  { id: 'fpd-link', name: 'FPD-Link', fullName: 'Flat Panel Display Link (FPD-Link III/IV)', categoryId: 'display', std: 'Texas Instruments', year: '1996–2022', tagline: 'Coax/STP SerDes carrying bidirectional control + 4K video/camera feeds across automotive cabins.' },
  { id: 'gmsl', name: 'GMSL', fullName: 'Gigabit Multimedia Serial Link (GMSL2/GMSL3)', categoryId: 'display', std: 'Analog Devices / Maxim', year: '2010–2023', tagline: 'Coaxial/STP 6–12 Gbps ADAS camera & infotainment SerDes supporting power-over-coax.' },

  // Section 13: Chiplet and Die-to-Die Interconnects
  { id: 'ucie-1-0', name: 'UCIe 1.0', fullName: 'Universal Chiplet Interconnect Express 1.0', categoryId: 'chip-to-chip', std: 'UCIe Consortium 1.0', year: '2022', tagline: 'Foundational open chiplet spec defining PCIe/CXL/streaming FDI over Standard and Advanced 2.5D packages.' },
  { id: 'ucie-1-1', name: 'UCIe 1.1', fullName: 'Universal Chiplet Interconnect Express 1.1', categoryId: 'chip-to-chip', std: 'UCIe Consortium 1.1', year: '2023', tagline: 'Adds automotive health monitoring, Runtime Link Testing/Repair, and enhanced compliance tooling.' },
  { id: 'ucie-2-0', name: 'UCIe 2.0', fullName: 'Universal Chiplet Interconnect Express 2.0', categoryId: 'chip-to-chip', std: 'UCIe Consortium 2.0', year: '2024', tagline: 'Introduces 3D-packaging (UCIe-3D up to 64+ GT/s/mm² density) and unified manageability stack.' },
  { id: 'ucie-3-0', name: 'UCIe 3.0', fullName: 'Universal Chiplet Interconnect Express 3.0 (64 GT/s)', categoryId: 'chip-to-chip', std: 'UCIe Consortium 3.0', year: '2025+', tagline: 'Doubles per-wire signaling to 48/64 GT/s with Open-D2D manageability and extended reach.', emerging: true, caveatKind: 'emerging' },
  { id: 'aib', name: 'AIB', fullName: 'Advanced Interface Bus (CHIPS Alliance)', categoryId: 'chip-to-chip', std: 'CHIPS Alliance AIB 2.0', year: '2019–2021', tagline: 'Open-source clock-forwarded high-density micro-bump die-to-die parallel PHY up to 4–6.4 Gbps/pin.' },
  { id: 'xsr', name: 'XSR', fullName: 'Ultra-Short-Reach / Extra-Short-Reach SerDes (OIF CEI-112G-XSR)', categoryId: 'chip-to-chip', std: 'OIF CEI-XSR', year: '2020–2024', tagline: '56G/112G/224G PAM4 optical-engine & multi-die SerDes reaching <50 mm over ultra-low-loss substrates.' },
  { id: 'xsr-phy', name: 'XSR-PHY', fullName: 'Extra-Short-Reach Multi-Die SerDes PHY Macro', categoryId: 'chip-to-chip', std: 'OIF / Foundry PHY', year: '2021–2024', tagline: 'Low-latency analog/DSP SerDes macro omitting heavy long-reach FEC for in-package co-packaged optics/chiplets.' },
  { id: 'd2d-phy', name: 'D2D PHY Interface', fullName: 'Die-to-Die Logical-to-Physical (L2P / RDI) Boundary', categoryId: 'chip-to-chip', std: 'UCIe RDI / BoW', year: '2022–2024', tagline: 'Raw Die-to-Die Interface (`RDI`) separating protocol adapters from micro-bump lane repair and clock training.' },

  // Section 14: Automotive Interfaces
  { id: 'can', name: 'CAN', fullName: 'Controller Area Network (ISO 11898-1)', categoryId: 'automotive', std: 'ISO 11898 / Bosch', year: '1986', tagline: 'Arbitration-by-ID differential multi-master automotive bus up to 1 Mbps with 8-byte frames.' },
  { id: 'can-fd', name: 'CAN FD', fullName: 'CAN with Flexible Data-Rate', categoryId: 'automotive', std: 'ISO 11898-1:2015', year: '2012', tagline: 'Extends CAN payloads to 64 bytes and switches data phase bit rate up to 5–8 Mbps after arbitration.' },
  { id: 'can-xl', name: 'CAN XL', fullName: 'CAN eXtra Long (ISO 11898-1 Ed.3)', categoryId: 'automotive', std: 'CiA 610 / ISO', year: '2022–2024', tagline: 'Supports up to 2048-byte payloads and 10–20 Mbps rates, bridging CAN and Ethernet frames cleanly.' },
  { id: 'lin', name: 'LIN', fullName: 'Local Interconnect Network (ISO 17987)', categoryId: 'automotive', std: 'ISO 17987', year: '1999', tagline: 'Ultra-low-cost 20 kbps single-wire UART-based body-control sub-bus for mirrors, seats, and HVAC.' },
  { id: 'flexray', name: 'FlexRay', fullName: 'FlexRay Deterministic Dual-Channel Bus (ISO 17458)', categoryId: 'automotive', std: 'ISO 17458', year: '2004', tagline: '10 Mbps dual-channel TDMA fault-tolerant chassis/by-wire automotive protocol.' },
  { id: 'auto-ethernet', name: 'Automotive Ethernet', fullName: 'IEEE 802.3 Single-Pair UTP Vehicle Backbone', categoryId: 'automotive', std: 'IEEE 802.3 / OPEN Alliance', year: '2015–2024', tagline: 'Replaces heavy shielded harnesses with single-twisted-pair T1 PHYs + SOME/IP + TSN.' },
  { id: 'eth-100base-t1', name: '100BASE-T1', fullName: 'IEEE 802.3bw 100 Mbps Single-Pair Ethernet', categoryId: 'automotive', std: 'IEEE 802.3bw', year: '2015', tagline: 'Full-duplex PAM3 100 Mbps Ethernet over one unshielded twisted pair (15m) with echo cancellation.' },
  { id: 'eth-1000base-t1', name: '1000BASE-T1', fullName: 'IEEE 802.3bp 1 Gbps Single-Pair Ethernet', categoryId: 'automotive', std: 'IEEE 802.3bp', year: '2016', tagline: '1 Gbps PAM3 single-pair backbone connecting ADAS domain controllers, radar, and gateways.' },
  { id: 'eth-10base-t1s', name: '10BASE-T1S', fullName: 'IEEE 802.3cg 10 Mbps Multi-Drop PLCA Ethernet', categoryId: 'automotive', std: 'IEEE 802.3cg', year: '2019', tagline: 'Collision-free Physical Layer Collision Avoidance (PLCA) Ethernet sharing a 2-wire multi-drop zone bus.' },
  { id: 'eth-10base-t1l', name: '10BASE-T1L', fullName: 'IEEE 802.3cg 10 Mbps Long-Reach Single-Pair', categoryId: 'automotive', std: 'IEEE 802.3cg', year: '2019', tagline: '1-kilometer full-duplex single-pair Ethernet delivering data + SPoE power in buildings & factories.' },
  { id: 'sent', name: 'SENT', fullName: 'Single Edge Nibble Transmission (SAE J2716)', categoryId: 'automotive', std: 'SAE J2716', year: '2007', tagline: 'Unidirectional 1-wire falling-edge-to-falling-edge PWM nibble protocol for precision automotive sensors.' },
  { id: 'psi5', name: 'PSI5', fullName: 'Peripheral Sensor Interface 5', categoryId: 'automotive', std: 'PSI5 Spec v2.3', year: '2006', tagline: '2-wire Manchester current-modulated bus delivering power + crash/airbag sensor data under harsh EMI.' },
  { id: 'cxpi', name: 'CXPI', fullName: 'Clock Extension Peripheral Interface (SAE J3076)', categoryId: 'automotive', std: 'JASO D 015 / SAE', year: '2015', tagline: '20 kbps event-triggered CSMA/CR body-electronics successor to LIN supporting low-latency switch panels.' },
  { id: 'most', name: 'MOST', fullName: 'Media Oriented Systems Transport (MOST150)', categoryId: 'automotive', std: 'MOST Cooperation', year: '1998–2007', tagline: 'Legacy automotive ring fiber/coax infotainment network replaced by Automotive Ethernet.' },
  { id: 'j1850', name: 'J1850', fullName: 'SAE J1850 Legacy OBD-II Vehicle Bus', categoryId: 'automotive', std: 'SAE J1850', year: '1994', tagline: '10.4 kbps VPW / 41.6 kbps PWM diagnostic bus standardized in pre-CAN OBD-II vehicles.' },

  // Section 15: Debug, Test and DFT Interfaces
  { id: 'ieee-1149-1', name: 'IEEE 1149.1', fullName: 'IEEE 1149.1 JTAG Boundary-Scan Architecture', categoryId: 'debug', std: 'IEEE 1149.1-2013', year: '1990–2013', tagline: 'Canonical 4/5-wire TAP FSM + Boundary-Scan Register standardizing board connectivity & IDCODE.' },
  { id: 'ieee-1149-6', name: 'IEEE 1149.6', fullName: 'AC-Coupled & Differential Boundary-Scan Test', categoryId: 'debug', std: 'IEEE 1149.6-2015', year: '2003–2015', tagline: 'Extends 1149.1 with AC pulse test receivers verifying PCIe/SerDes AC-coupling capacitors on PCBs.' },
  { id: 'ieee-1149-7', name: 'IEEE 1149.7', fullName: 'Reduced-Pin & Enhanced JTAG (cJTAG)', categoryId: 'debug', std: 'IEEE 1149.7-2022', year: '2009–2022', tagline: 'Adds 2-wire Star/Advanced OScan serialization and multi-TAP power-domain management to JTAG.' },
  { id: 'ieee-1687-ijtag', name: 'IEEE 1687 (iJTAG)', fullName: 'Internal JTAG Embedded Instrument Access Network', categoryId: 'debug', std: 'IEEE 1687-2014', year: '2014', tagline: 'Dynamic SIB-reconfigurable hierarchical scan network automating MBIST, SerDes EYE, and PLL access via ICL/PDL.' },
  { id: 'ieee-1500', name: 'IEEE 1500', fullName: 'Standard Testability Method for Embedded Core IPs', categoryId: 'debug', std: 'IEEE 1500-2022', year: '2005–2022', tagline: 'Isolates third-party hard/soft SoC cores via standardized test wrappers for ATPG & Core Test Language.' },
  { id: 'ieee-1838', name: 'IEEE 1838', fullName: '3D-Stacked Integrated Circuit Test Architecture', categoryId: 'debug', std: 'IEEE 1838-2019', year: '2019', tagline: 'Defines Primary Test Port (PTP) + Die Wrapper Register (DWR) + Flexible Parallel Port across TSV/2.5D/3D dies.' },
  { id: 'cjtag', name: 'cJTAG', fullName: 'Compact 2-Pin JTAG (OScan1 Mode)', categoryId: 'debug', std: 'IEEE 1149.7', year: '2009', tagline: 'Time-multiplexes TDI/TDO/TMS over just `TCKC` and bidirectional `TMSC` for pin-starved IoT/RISC-V chips.' },
  { id: 'arm-coresight', name: 'ARM CoreSight', fullName: 'Arm CoreSight On-Chip Debug & Trace Architecture', categoryId: 'debug', std: 'Arm ADIv6 / CoreSight', year: '2006–2024', tagline: 'Modular DP -> AP -> ROM Table -> ETM/CTI/ETB fabric linking SWD/JTAG probes to multi-core Arm clusters.' },
  { id: 'arm-trace', name: 'ARM Trace Interface', fullName: 'CoreSight TPIU & Embedded Trace Port', categoryId: 'debug', std: 'Arm IHI 0029', year: '2006–2021', tagline: 'Formatter-framed parallel (`TRACECLK`, `TRACEDATA[31:0]`) or HSSTP high-speed off-chip trace output.' },
  { id: 'etm', name: 'ETM', fullName: 'Embedded Trace Macrocell (ETMv4 / ETE)', categoryId: 'debug', std: 'Arm IHI 0064', year: '2013–2022', tagline: 'Real-time non-intrusive instruction/data cycle-level execution tracer emitting compressed ATB packets.' },
  { id: 'stm', name: 'STM', fullName: 'System Trace Macrocell (MIPI STP Protocol)', categoryId: 'debug', std: 'Arm CoreSight / MIPI STP', year: '2011', tagline: 'Memory-mapped printf-style software instrumentation channels merged onto the ATB hardware trace bus.' },
  { id: 'nexus-5001', name: 'Nexus 5001', fullName: 'IEEE-ISTO 5001 Automotive/Embedded Debug Standard', categoryId: 'debug', std: 'Nexus 5001 Forum', year: '1999–2020', tagline: 'High-speed auxiliary trace & calibration port standard across automotive MCUs (also basis for RISC-V N-Trace).' },
  { id: 'dmi', name: 'DMI', fullName: 'Debug Module Interface (Abstract Register Bus)', categoryId: 'debug', std: 'RISC-V Debug v1.0', year: '2019–2024', tagline: 'Protocol-agnostic request/response register bus decoupling transport (JTAG/PCIe) from CPU Debug Module.' },
  { id: 'boundary-scan', name: 'Boundary Scan', fullName: 'PCB Interconnect & Pin-Cell Boundary Scan', categoryId: 'debug', std: 'IEEE 1149.1 / 1149.6', year: '1990', tagline: 'Shifts EXTEST/SAMPLE patterns through I/O pad cells to detect opens/shorts without physical bed-of-nails.' },
  { id: 'scan-chain', name: 'Scan Chain Interface', fullName: 'ATPG Mux-D Flip-Flop Shift Chain Interface', categoryId: 'debug', std: 'Silicon DFT Standard', year: '1980s–2025', tagline: 'Connects every sequential flip-flop into serial shift chains (`scan_en`, `scan_in`, `scan_out`) during manufacturing test.' },
  { id: 'ieee-1500-wsp', name: 'IEEE 1500 WSP', fullName: 'IEEE 1500 Wrapper Serial Port (`WSC` / `WSI` / `WSO`)', categoryId: 'debug', std: 'IEEE 1500', year: '2005', tagline: 'Mandatory 1-bit serial control port loading WIR instructions and WBR boundary chains around isolated IP cores.' },

  // Section 16: Security and Cryptographic IP Interfaces (Include IP-specific caveat where appropriate)
  { id: 'tl-ul-dev-if', name: 'TL-UL Device Interface', fullName: 'OpenTitan TL-UL Subordinate Register Adapter (`tlul_adapter_reg`)', categoryId: 'security', std: 'lowRISC OpenTitan', year: '2019–2025', tagline: 'Translates TL-UL requests with SECDED integrity verification into clean byte-enabled CSR reads/writes.', caveatKind: 'security-ip' },
  { id: 'keymgr-if', name: 'Key Manager Interface', fullName: 'Hardware Key-Sideload & Keymgr Bus (`keymgr_pkg::hw_key_req_t`)', categoryId: 'security', std: 'OpenTitan Comportability', year: '2020–2025', tagline: 'Dedicated non-software-readable sideload wires delivering derived keys directly to AES, HMAC, and KMAC.', caveatKind: 'security-ip' },
  { id: 'csrng-if', name: 'CSRNG Interface', fullName: 'SP 800-90A Deterministic Random Bit Generator Command IF', categoryId: 'security', std: 'OpenTitan / NIST', year: '2020–2025', tagline: 'Application command/genbits valid-ready interface driving hardware CTR_DRBG instantiate/reseed/generate ops.', caveatKind: 'security-ip' },
  { id: 'edn-if', name: 'EDN Interface', fullName: 'Entropy Distribution Network Peripheral Request/Ack Bus', categoryId: 'security', std: 'OpenTitan Comportability', year: '2020–2025', tagline: 'Distributes synchronized hardware random masks (`edn_req`/`edn_rsp`) across async clock domains to crypto engines.', caveatKind: 'security-ip' },
  { id: 'hmac-if', name: 'HMAC Interface', fullName: 'Hardware SHA-256 / HMAC Engine Register & FIFO Port', categoryId: 'security', std: 'OpenTitan / SoC Crypto', year: '2019–2025', tagline: 'Memory-mapped message FIFO + key CSR interface computing keyed-hash message authentication in hardware.', caveatKind: 'security-ip' },
  { id: 'aes-if', name: 'AES Interface', fullName: 'Masked Hardware AES Cipher Block Interface (TL-UL + EDN + Keymgr)', categoryId: 'security', std: 'OpenTitan / FIPS-197', year: '2019–2025', tagline: 'Dual-shadowed control registers, key sideload port, and async EDN masking interface around a hardware AES core.', caveatKind: 'security-ip' },
  { id: 'kmac-if', name: 'KMAC Interface', fullName: 'Hardware Keccak / SHA-3 / KMAC Streaming & App Interface', categoryId: 'security', std: 'OpenTitan / NIST SP 800-185', year: '2020–2025', tagline: 'Multi-slot shared hardware Keccak absorber feeding software FIFO, KeyMgr key derivation, and ROM verification.', caveatKind: 'security-ip' },
  { id: 'otp-if', name: 'OTP Interface', fullName: 'One-Time-Programmable Fuse Controller DAI/LCI/Broadcast IF', categoryId: 'security', std: 'OpenTitan / Foundry eFuse', year: '2020–2025', tagline: 'ECC-protected lifecycle token, root key, and provisioning interface distributing boot state across SoC domains.', caveatKind: 'security-ip' },
  { id: 'secure-boot-if', name: 'Secure Boot Interface', fullName: 'ROM Root-of-Trust Image Verify & Lifecycle Gate', categoryId: 'security', std: 'SoC Security Standard', year: '2018–2025', tagline: 'Hardware-enforced ROM fetch lock, flash signature/HMAC verification, and ePMP unlock sequence.', caveatKind: 'security-ip' },
  { id: 'secure-debug-if', name: 'Secure Debug Interface', fullName: 'Authenticated Lifecycle-Gated Debug Unlock Protocol', categoryId: 'security', std: 'Arm ADAC / RISC-V / OpenTitan', year: '2020–2025', tagline: 'Challenge-response cryptographic token unlocking JTAG/SWD TAPs in provisioned production silicon.' },
  { id: 'spdm', name: 'SPDM', fullName: 'DMTF Security Protocol and Data Model (1.3)', categoryId: 'security', std: 'DMTF DSP0274', year: '2019–2024', tagline: 'Industry-standard PCIe/CXL/DOE device attestation, certificate retrieval, and encrypted session establishment.' },
  { id: 'tcg-tpm-if', name: 'TCG TPM Interface', fullName: 'Trusted Computing Group TPM 2.0 Transport (SPI/I2C/LPC)', categoryId: 'security', std: 'TCG PC Client / Library', year: '2014–2024', tagline: 'Standardizes hardware root-of-trust PCR measurement, sealing, and attestation commands over SPI/I2C/FIFO.' },
  { id: 'tis', name: 'TIS', fullName: 'TCG TPM Interface Specification (MMIO Locality Windows)', categoryId: 'security', std: 'TCG TIS v1.3 / PTP', year: '2013', tagline: 'Fixed memory-mapped register locality state machine (`TPM_ACCESS`, `TPM_STS`, `TPM_DATA_FIFO`).' },
  { id: 'fifo-sec-if', name: 'FIFO Interface', fullName: 'Trusted Hardware Ingress/Egress Packing FIFO Interface', categoryId: 'security', std: 'OpenTitan / TCG PTP', year: '2018–2025', tagline: 'Hardware data-packer bridging narrow MMIO register writes into aligned 128b/1600b crypto message blocks.', caveatKind: 'security-ip' },
  { id: 'apb-sec-ext', name: 'APB Security Extensions', fullName: 'APB4/APB5 `PPROT` & `PNSE` TrustZone/RME Attributes', categoryId: 'security', std: 'Arm IHI 0024D', year: '2010–2021', tagline: 'Hardware firewall qualifiers propagating Secure, Non-Secure, Privileged, and Realm state to peripherals.' },

  // Section 17: Network-on-Chip (NoC) and Fabric Protocols
  { id: 'chi-noc', name: 'CHI NoC', fullName: 'Arm AMBA CHI Packetized Coherent NoC Fabric', categoryId: 'noc', std: 'Arm CoreLink CMN / CHI', year: '2014–2025', tagline: 'Translates RN/HN/SN CHI messages onto virtual-channel 2D mesh routers for multi-socket Arm servers.' },
  { id: 'tilelink-noc', name: 'TileLink NoC', fullName: 'Multi-Hop Packetized TileLink Switch/Mesh Fabric', categoryId: 'noc', std: 'CHIPS Alliance / Open-Source', year: '2018–2025', tagline: 'Maps TileLink A/B/C/D/E priority channels onto non-blocking wormhole crossbar/mesh networks.' },
  { id: 'ocp-noc', name: 'OCP NoC', fullName: 'OCP-to-NoC NIU (Network Interface Unit) Protocol', categoryId: 'noc', std: 'Arteris / OCP-IP', year: '2006–2020', tagline: 'Classic SoC NoC NIU mapping OCP read/write/thread sockets onto serialized NoC transport packets.' },
  { id: 'wishbone-noc', name: 'Wishbone NoC', fullName: 'Packetized Wishbone-over-NoC Bridge', categoryId: 'noc', std: 'OpenCores / Academic', year: '2012–2024', tagline: 'Wraps OpenCores Wishbone B4 master/slave requests into router flits inside open-source FPGA meshes.' },
  { id: 'packet-noc', name: 'Packet-Based NoC', fullName: 'Header-Body-Tail Flit-Level On-Chip Interconnect', categoryId: 'noc', std: 'SoC NoC Architecture', year: '2002–2025', tagline: 'Breaks monolithic bus wires into pipelined point-to-point router links carrying self-routed packets.' },
  { id: 'wormhole-routing', name: 'Wormhole Routing', fullName: 'Cut-Through Wormhole Flit Switching Protocol', categoryId: 'noc', std: 'NoC Architecture Model', year: '1987–2025', tagline: 'Forwards header flits immediately without waiting for packet tail, slashing router SRAM area and latency.' },
  { id: 'vc-flow-control', name: 'Virtual Channel Flow Control', fullName: 'VC-Multiplexed Anti-Deadlock NoC Protocol', categoryId: 'noc', std: 'NoC Architecture Model', year: '1992–2025', tagline: 'Shares one physical router wire across independent virtual queues to eliminate head-of-line blocking and protocol deadlock.' },
  { id: 'credit-flow-control', name: 'Credit-Based Flow Control', fullName: 'Round-Trip Buffer Credit Accounting Protocol', categoryId: 'noc', std: 'NoC / PCIe / CHI', year: '1995–2025', tagline: 'Replaces single-cycle valid/ready backpressure across multi-cycle pipeline links with upstream credit tokens.' },
  { id: 'circuit-switching', name: 'Circuit-Switched Interconnect', fullName: 'TDM / Dedicated Path Reservation Interconnect', categoryId: 'noc', std: 'NoC Architecture Model', year: '2003–2020', tagline: 'Pre-allocates conflict-free TDM slots or crosspoint paths for hard real-time video/DSP latency guarantees.' },
  { id: 'packet-switching', name: 'Packet-Switched Interconnect', fullName: 'Store-and-Forward / Cut-Through Packet Fabric', categoryId: 'noc', std: 'NoC Architecture Model', year: '2002–2025', tagline: 'Dynamically shares fabric bandwidth across bursty masters by arbitrating per-packet or per-flit.' },
  { id: 'mesh-noc', name: 'Mesh NoC', fullName: '2DXY Dimension-Order Routed Grid Topology', categoryId: 'noc', std: 'CMN / OpenPiton / Esp', year: '2005–2025', tagline: 'Physical tile-aligned North/South/East/West router grid minimizing wire length across giant reticle dies.' },
  { id: 'torus-noc', name: 'Torus NoC', fullName: 'Wrap-Around Mesh NoC Topology (Folded Torus)', categoryId: 'noc', std: 'HPC / AI Interconnect', year: '2000–2025', tagline: 'Eliminates edge congestion by wrapping boundary links into continuous loops with dateline VCs for deadlock freedom.' },
  { id: 'ring-noc', name: 'Ring NoC', fullName: 'Dual Counter-Rotating Coherent Ring Stop Fabric', categoryId: 'noc', std: 'Desktop / Server CPU', year: '2010–2025', tagline: 'Simple bidirectional stop architecture linking 4–16 CPU cores, LLC slices, and display/IO agents.' },
  { id: 'crossbar-interconnect', name: 'Crossbar Interconnect', fullName: 'Non-Blocking Full N×M Matrix Switch', categoryId: 'noc', std: 'AMBA NIC / PULP / TileLink', year: '1998–2025', tagline: 'Zero-hop single-stage arbitration connecting small clusters where routing wire area remains tractable.' },
  { id: 'fat-tree-noc', name: 'Fat-Tree NoC', fullName: 'k-ary n-Tree Non-Blocking Butterfly Fabric', categoryId: 'noc', std: 'HPC / ML Cluster', year: '1985–2025', tagline: 'Scales bisection bandwidth proportionally up root switches so any initiator communicates at full rate.' },
  { id: 'clos-network', name: 'Clos Network', fullName: 'Multi-Stage Non-Blocking Rearrangeable Switch', categoryId: 'noc', std: 'Switch Silicon / Datacenter', year: '1953–2025', tagline: '3-stage Ingress-Middle-Egress crossbar fabric avoiding quadratic growth of huge monolithic crossbars.' },
  { id: 'amba-coherent-interconnect', name: 'AMBA Coherent Interconnect', fullName: 'CoreLink CCI / CMN Coherent Fabric Architecture', categoryId: 'noc', std: 'Arm AMBA Coherent', year: '2011–2025', tagline: 'Hardware-coherent SoC backbone combining snoop filters, SLC cache, CHI/ACE ports, and QoS.' },

  // Section 18: AI / ML / GPU Accelerator Interfaces
  { id: 'dma-descriptor-if', name: 'DMA Descriptor Interface', fullName: 'Scatter-Gather Ring & Linked-List Tensor DMA IF', categoryId: 'accelerator', std: 'NVDLA / Xilinx XDMA / PULP', year: '2010–2025', tagline: 'Fetches descriptor structs from host DRAM to stream non-contiguous 2D/3D tensor tiles autonomously.' },
  { id: 'scratchpad-mem-if', name: 'Scratchpad Memory Interface', fullName: 'Multi-Banked TCDM / Scratchpad SRAM Port', categoryId: 'accelerator', std: 'Gemmini / PULP / NPU', year: '2016–2025', tagline: 'Single-cycle deterministic banked SRAM interface with bank-conflict stalling for systolic & vector engines.' },
  { id: 'systolic-array-if', name: 'Systolic Array Interface', fullName: 'Edge-Fed Activation / Weight / Accumulator Stream IF', categoryId: 'accelerator', std: 'TPU / Gemmini Architecture', year: '2017–2025', tagline: 'Time-skewed triangular-buffered interfaces feeding systolic PE rows/columns every clock cycle.' },
  { id: 'tensor-proc-if', name: 'Tensor Processing Interface', fullName: 'Tiled Tensor Core / NPU Execution Dispatch IF', categoryId: 'accelerator', std: 'AI Accelerator Architecture', year: '2018–2025', tagline: 'Coarse-grained tensor ISA interface specifying M×N×K matrix dimensions, strides, and quantization scale.' },
  { id: 'gpu-cmd-if', name: 'GPU Command Interface', fullName: 'Ring-Buffer / User-Queue Kernel Dispatch IF', categoryId: 'accelerator', std: 'Vulkan / HSA AQL / Vortex', year: '2014–2025', tagline: 'Host-to-GPU packet queue scheduling compute grids, barrier fences, and shader addresses.' },
  { id: 'gpu-mem-if', name: 'GPU Memory Interface', fullName: 'Coalesced Wide-Burst Cache/DRAM Request Interface', categoryId: 'accelerator', std: 'Vortex / GPGPU Architecture', year: '2010–2025', tagline: 'Merges per-lane SIMT divergent addresses into minimal wide AXI4/HBM/GDDR cache-line bursts.' },
  { id: 'simt-exec-if', name: 'SIMT Execution Interface', fullName: 'Warp Scheduler, Thread Mask & IPDOM Divergence IF', categoryId: 'accelerator', std: 'Vortex / SIMT GPU', year: '2015–2025', tagline: 'Routes warp PC, active lane bitmask (`tmask`), and scoreboard hazards across parallel SIMD lanes.' },
  { id: 'opencl-hw-if', name: 'OpenCL Hardware Interface', fullName: 'OpenCL Kernel Arguments, NDRange & AXI/PCIe Bridge', categoryId: 'accelerator', std: 'Khronos / FPGA / Vortex', year: '2012–2025', tagline: 'Standardizes global/local memory spaces, work-group dispatch, and host-to-accelerator kernel sync.' },
  { id: 'openmp-offload-if', name: 'OpenMP Offload Interface', fullName: 'HERO / Heterogeneous Shared-Virtual-Memory Offload IF', categoryId: 'accelerator', std: 'OpenMP / PULP HERO', year: '2017–2024', tagline: 'Shared-address pointer translation and IOMMU page-fault interface between Linux host and manycore accelerators.' },
  { id: 'custom-accel-if', name: 'Custom Accelerator Interface', fullName: 'RoCC / CV-X-IF / AXI-Ctrl Accelerator Integration Pattern', categoryId: 'accelerator', std: 'Chipyard / OpenHW', year: '2016–2025', tagline: 'Combines low-latency CSR/opcode control with high-bandwidth DMA master ports on SoC interconnects.' },

  // Section 19: Physical Layer & SerDes Interfaces
  { id: 'pipe', name: 'PIPE', fullName: 'PHY Interface for PCI Express, SATA, USB 3.x & DisplayPort', categoryId: 'phy-serdes', std: 'Intel PIPE 6.x', year: '2003–2024', tagline: 'De facto standard parallel MAC-to-SerDes PHY boundary managing TX/RX symbols, power states (P0–P3), and EQ.' },
  { id: 'serdes', name: 'SerDes Interface', fullName: 'Serializer/Deserializer PMA-to-PCS Parallel Interface', categoryId: 'phy-serdes', std: 'OIF CEI / Foundry PMA', year: '2000–2025', tagline: 'Exposes raw gearboxed parallel bit-words, recovered CDR clock, and loopback/PRBS controls to protocol PCS.' },
  { id: 'jesd204a', name: 'JESD204A', fullName: 'High-Speed Data Converter Multi-Lane SerDes IF', categoryId: 'phy-serdes', std: 'JEDEC JESD204A', year: '2008', tagline: '3.125 Gbps 8b/10b serial interface linking high-speed ADCs/DACs to FPGAs with multi-lane alignment.' },
  { id: 'jesd204b', name: 'JESD204B', fullName: 'Deterministic-Latency Data Converter SerDes (12.5 Gbps)', categoryId: 'phy-serdes', std: 'JEDEC JESD204B', year: '2011', tagline: 'Adds SYSREF deterministic latency subclass 1 synchronizing phased-array RF & radar converters.' },
  { id: 'jesd204c', name: 'JESD204C', fullName: '64B/66B Data Converter SerDes (32 Gbps)', categoryId: 'phy-serdes', std: 'JEDEC JESD204C', year: '2017', tagline: 'Replaces 8b/10b with 64b/66b + CRC-12/FEC to push ADC/DAC converter links to 32 Gbps/lane.' },
  { id: 'cpri', name: 'CPRI', fullName: 'Common Public Radio Interface (1.2–24.3 Gbps)', categoryId: 'phy-serdes', std: 'CPRI Cooperation v7.0', year: '2004–2015', tagline: 'Synchronous TDM fronthaul serial link carrying baseband I/Q samples from BBU up cellular towers to RRHs.' },
  { id: 'ecpri', name: 'eCPRI', fullName: 'Ethernet-Based Common Public Radio Interface', categoryId: 'phy-serdes', std: 'eCPRI Spec v2.0', year: '2017–2019', tagline: 'Packetizes functional-split 5G RAN fronthaul traffic directly over 10G/25G/100G Ethernet + IEEE 1588.' },
  { id: 'aurora', name: 'Aurora', fullName: 'Xilinx/AMD Lightweight 8b/10b & 64b/66b SerDes Link', categoryId: 'phy-serdes', std: 'AMD/Xilinx Aurora', year: '2004–2024', tagline: 'Minimal-overhead FPGA-to-FPGA AXI4-Stream channel bonding over GTY/GTM multi-gigabit transceivers.' },
  { id: 'serial-rapidio', name: 'Serial RapidIO', fullName: 'Serial RapidIO Point-to-Point Switched Fabric', categoryId: 'phy-serdes', std: 'RapidIO 3.1/4.1', year: '2005–2016', tagline: '8b/10b / 64b/67b high-reliability low-latency baseband & aerospace switch interconnect.' },
  { id: 'xaui', name: 'XAUI', fullName: '10 Gigabit Attachment Unit Interface (4×3.125G)', categoryId: 'phy-serdes', std: 'IEEE 802.3ae Cl. 47', year: '2002', tagline: 'Extends XGMII over PCB backplanes using four 8b/10b lanes deskewed via `/A/` alignment columns.' },
  { id: 'xlaui', name: 'XLAUI', fullName: '40 Gigabit Attachment Unit Interface (4×10.3G)', categoryId: 'phy-serdes', std: 'IEEE 802.3ba Annex 83A', year: '2010', tagline: 'Electrical 4×10.3125 Gbps chip-to-chip / chip-to-module 40G Ethernet SerDes interface.' },
  { id: 'caui', name: 'CAUI', fullName: '100 Gigabit Attachment Unit Interface (CAUI-4/10)', categoryId: 'phy-serdes', std: 'IEEE 802.3ba/bm', year: '2010–2015', tagline: '100G Ethernet electrical PHY boundary evolving from 10×10G to 4×25G (CAUI-4) and 100GAUI-2/1.' },
  { id: 'sfi', name: 'SFI', fullName: 'SFP+ 10G Limiting Optical/Electrical PHY Interface', categoryId: 'phy-serdes', std: 'SFF-8431', year: '2006', tagline: 'Direct 10.3125 Gbps 64b/66b chip-to-SFP+ optical module SerDes specification.' },
  { id: 'pcie-phy', name: 'PCIe PHY Interface', fullName: 'PCIe PMA/PCS Differential SerDes Layer (Gen1–Gen7)', categoryId: 'phy-serdes', std: 'PCI-SIG / PIPE', year: '2003–2025', tagline: 'Handles receiver detection, beacon, 8b/10b/128b/130b/PAM4 Flit framing, and TX/RX equalization.' },
  { id: 'usb-phy', name: 'USB PHY Interface', fullName: 'UTMI+ / ULPI (USB 2.0) & PIPE (USB 3.x/4) PHY', categoryId: 'phy-serdes', std: 'Intel / ULPI / USB-IF', year: '2001–2024', tagline: 'Bridges USB MAC controllers to analog D+/D- transceivers (UTMI/ULPI) and SuperSpeed SerDes (PIPE).' },
  { id: 'mipi-phy', name: 'MIPI PHY Interface', fullName: 'PPI (Protocol-to-PHY Interface) for D-PHY/C-PHY/M-PHY', categoryId: 'phy-serdes', std: 'MIPI Alliance PPI/RMMI', year: '2009–2023', tagline: 'Standardizes byte-clocked HS/LP escape-mode signaling between CSI/DSI/UniPro controllers and analog PHYs.' },
  { id: 'interlaken-phy', name: 'Interlaken PHY', fullName: '64B/67B Multi-Lane SerDes Framing Layer', categoryId: 'phy-serdes', std: 'Interlaken Alliance', year: '2006–2020', tagline: 'Channelizes 64b/67b word-locked SerDes lanes with diagnostic CRC-32 scramblers up to 112G PAM4.' },

  // Section 20: Clock, Reset and Power Management Interfaces
  { id: 'clk-enable-if', name: 'Clock Enable Interface', fullName: 'Integrated Clock Gating (ICG) & Request/Active Interface', categoryId: 'power-mgmt', std: 'ASIC Low-Power Standard', year: '2000–2025', tagline: 'Glitch-free latch-based clock-gating enable (`en`, `te` scan override) cutting dynamic clock-tree power.' },
  { id: 'rst-sync-if', name: 'Reset Synchronization Interface', fullName: 'Async-Assert / Sync-Deassert 2-FF Reset Bridge', categoryId: 'power-mgmt', std: 'RTL CDC/RDC Standard', year: '1995–2025', tagline: 'Prevents reset recovery/removal metastability when releasing resets across independent clock domains.' },
  { id: 'power-state-if', name: 'Power State Interface', fullName: 'Retention, Isolation (`ISO_EN`), and Power-Switch Ack IF', categoryId: 'power-mgmt', std: 'UPF / SoC PMU Standard', year: '2007–2025', tagline: 'Coordinates power-gating sequences: quiesce bus -> clamp isolation -> save retention -> drop VDD switch.' },
  { id: 'ieee-1801-upf', name: 'IEEE 1801 (UPF)', fullName: 'Unified Power Format Multi-Voltage Design Standard', categoryId: 'power-mgmt', std: 'IEEE 1801-2024', year: '2007–2024', tagline: 'Vendor-neutral Tcl intent language defining power domains, level shifters, isolation cells, and retention flops.', caveatKind: 'standard-ref' },
  { id: 'ieee-1685-ipxact', name: 'IEEE 1685 (IP-XACT)', fullName: 'XML Metadata Standard for SoC IP & Bus Packaging', categoryId: 'power-mgmt', std: 'IEEE 1685-2022', year: '2009–2022', tagline: 'Standardizes bus definitions, memory maps, CSR registers, and EDA netlist assembly automation.', caveatKind: 'standard-ref' },
  { id: 'cdc-if', name: 'Clock Domain Crossing Interface', fullName: '2-FF Synchronizer, Gray Async FIFO & Req/Ack Handshake', categoryId: 'power-mgmt', std: 'Silicon CDC Methodology', year: '1995–2025', tagline: 'Eliminates metastability & multi-bit skew whenever signals cross asynchronous or mesochronous clock islands.' },
  { id: 'power-domain-ctrl-if', name: 'Power Domain Control Interface', fullName: 'PMU-to-Power-Switch & Sequencer Control Bus', categoryId: 'power-mgmt', std: 'SoC Power Architecture', year: '2008–2025', tagline: 'Daisy-chained switch header acknowledge (`PWR_REQ`/`PWR_ACK`) controlling rush-current during wake-up.' },
  { id: 'dvfs-ctrl-if', name: 'DVFS Control Interface', fullName: 'Dynamic Voltage & Frequency Scaling AVS/PLL Interface', categoryId: 'power-mgmt', std: 'Arm SCMI / PMIC / SoC', year: '2008–2025', tagline: 'Coordinates PMIC voltage ramp-up before PLL frequency step-up (and reverse on step-down) for P=CV²f savings.' },
  { id: 'spmi', name: 'SPMI', fullName: 'MIPI System Power Management Interface (v2.0)', categoryId: 'power-mgmt', std: 'MIPI Alliance SPMI', year: '2012', tagline: 'High-speed multi-master 2-wire 26 MHz bus coordinating SoC DVFS processors with multi-phase PMICs.' },

  // Section 21: Wireless and Radio Baseband Interfaces
  { id: 'bluetooth', name: 'Bluetooth', fullName: 'Bluetooth Classic BR/EDR HCI & Baseband Stack', categoryId: 'wireless', std: 'Bluetooth SIG', year: '1999–2024', tagline: '2.4 GHz FHSS wireless PAN interfacing host CPUs to controllers over UART/USB/SDIO HCI packets.' },
  { id: 'ble', name: 'BLE', fullName: 'Bluetooth Low Energy (4.0–5.4 / LE Audio)', categoryId: 'wireless', std: 'Bluetooth SIG', year: '2010–2024', tagline: 'Ultra-low-duty-cycle 2.4 GHz GATT/Advertising/Isochronous radio designed for coin-cell IoT and wearables.' },
  { id: 'wifi', name: 'Wi-Fi', fullName: 'Wi-Fi Alliance Wireless LAN (Wi-Fi 6 / 6E / 7)', categoryId: 'wireless', std: 'Wi-Fi Alliance / IEEE', year: '1999–2024', tagline: 'High-throughput OFDMA / Multi-Link Operation (MLO) WLAN interfacing SoC MACs over PCIe/SDIO/AXI.' },
  { id: 'ieee-802-11', name: 'IEEE 802.11', fullName: 'IEEE 802.11 MAC/PHY WLAN Architecture (be/ax/ac)', categoryId: 'wireless', std: 'IEEE 802.11-2020/be', year: '1997–2024', tagline: 'Defines CSMA/CA, Block-ACK, MU-MIMO, 320 MHz channels, and 4K-QAM baseband interfaces.' },
  { id: 'zigbee', name: 'Zigbee', fullName: 'Zigbee Smart-Home Mesh over IEEE 802.15.4', categoryId: 'wireless', std: 'Connectivity Standards Alliance', year: '2004–2023', tagline: '250 kbps 2.4 GHz low-power mesh network profile running atop IEEE 802.15.4 MAC/PHY.' },
  { id: 'thread', name: 'Thread', fullName: 'Thread IPv6-Over-802.15.4 Low-Power Mesh', categoryId: 'wireless', std: 'Thread Group 1.3/1.4', year: '2014–2024', tagline: '6LoWPAN IPv6 self-healing border-router mesh protocol serving as the low-power transport for Matter.' },
  { id: 'matter', name: 'Matter', fullName: 'Matter Application Layer over Thread / Wi-Fi / Ethernet', categoryId: 'wireless', std: 'CSA Matter 1.3/1.4', year: '2022–2024', tagline: 'IP-based zero-trust smart-home interoperability standard unifying Wi-Fi, Thread, and BLE commissioning.' },
  { id: 'uwb', name: 'UWB', fullName: 'Ultra-Wideband IEEE 802.15.4z Impulse Radio', categoryId: 'wireless', std: 'IEEE 802.15.4z / FiRa', year: '2020', tagline: '500 MHz bandwidth ToF/AoA impulse radio achieving <10 cm secure centimeter-accurate ranging.' },
  { id: 'nfc', name: 'NFC', fullName: 'Near Field Communication (ISO/IEC 14443 / NCI)', categoryId: 'wireless', std: 'NFC Forum / ISO', year: '2002', tagline: '13.56 MHz inductive short-range contactless tap protocol interfacing controllers to SoCs via I2C/SPI NCI.' },
  { id: 'rfid', name: 'RFID', fullName: 'EPCglobal UHF Gen2 / ISO 18000 Backscatter Tag IF', categoryId: 'wireless', std: 'GS1 / ISO 18000-63', year: '2004', tagline: 'Passive backscatter modulation querying battery-free inventory and supply-chain transponders.' },
  { id: 'lora', name: 'LoRa', fullName: 'Long-Range Chirp Spread Spectrum LPWAN PHY', categoryId: 'wireless', std: 'Semtech / LoRa Alliance', year: '2012', tagline: 'Sub-GHz CSS modulation trading kbps data rate for >10 km urban/rural battery link budgets.' },
  { id: 'lte', name: 'LTE', fullName: '3GPP 4G Long-Term Evolution Baseband & RF IF', categoryId: 'wireless', std: '3GPP Release 8–17', year: '2008–2022', tagline: 'All-IP OFDMA/SC-FDMA cellular baseband processing LTE-M, NB-IoT, and multi-carrier aggregation.' },
  { id: '5g-nr', name: '5G NR', fullName: '3GPP 5G New Radio Baseband / O-RAN Fronthaul', categoryId: 'wireless', std: '3GPP Rel-15–18', year: '2018–2024', tagline: 'Flexible-numerology OFDM + LDPC/Polar FEC modem and O-RAN 7.2x eCPRI fronthaul architecture.' },
  { id: '6g-research-if', name: '6G Research Interfaces', fullName: 'Pre-Standard 6G Sub-THz / AI-Native Baseband Concepts', categoryId: 'wireless', std: '3GPP Rel-20/21 Study', year: '2025+', tagline: 'Exploratory pre-standard research covering sub-THz front-ends, ISAC sensing, and AI-assisted PHY.', emerging: true, caveatKind: 'emerging' },
  { id: 'wifi-aware', name: 'Wi-Fi Aware', fullName: 'Neighbor Awareness Networking (NAN) Discovery', categoryId: 'wireless', std: 'Wi-Fi Alliance NAN', year: '2015–2023', tagline: 'Synchronized cluster beacon scheduling enabling peer-to-peer Wi-Fi discovery and ranging without APs.' },

  // Section 22: Industrial, Aerospace and Specialized Interfaces
  { id: 'spacewire', name: 'SpaceWire', fullName: 'ECSS-E-ST-50-12C Spacecraft Data-Strobe Network', categoryId: 'industrial', std: 'ESA / ECSS', year: '2003–2019', tagline: 'Data-Strobe LVDS point-to-point/wormhole-routed spacecraft payload network immune to clock drift.' },
  { id: 'spacefibre', name: 'SpaceFibre', fullName: 'ECSS-E-ST-50-11C Multi-Gigabit Spacecraft Link', categoryId: 'industrial', std: 'ESA / ECSS', year: '2019', tagline: '2.5–6.25 Gbps/lane 8b/10b fiber/copper successor to SpaceWire adding QoS VCs and deterministic FDIR.' },
  { id: 'mil-std-1553', name: 'MIL-STD-1553', fullName: 'Military Aircraft Dual-Redundant Avionics Data Bus', categoryId: 'industrial', std: 'US DoD MIL-STD-1553B', year: '1978', tagline: '1 Mbps Manchester II transformer-coupled Bus Controller -> Remote Terminal deterministic avionics bus.' },
  { id: 'arinc-429', name: 'ARINC 429', fullName: 'Commercial Avionics Point-to-Point Unidirectional Bus', categoryId: 'industrial', std: 'ARINC 429', year: '1977', tagline: '32-bit bipolar RZ twisted-pair avionics bus isolating transmitters from up to 20 passive receivers.' },
  { id: 'arinc-664-afdx', name: 'ARINC 664 (AFDX)', fullName: 'Avionics Full-Duplex Switched Ethernet (Part 7)', categoryId: 'industrial', std: 'ARINC 664 P7', year: '2005', tagline: 'Deterministic dual-redundant Ethernet Virtual Links guaranteeing bounded latency across modern airliners.' },
  { id: 'ttethernet', name: 'TTEthernet', fullName: 'SAE AS6802 Time-Triggered Safety-Critical Ethernet', categoryId: 'industrial', std: 'SAE AS6802', year: '2011', tagline: 'Fuses fault-tolerant synchronized time-triggered frames with standard best-effort Ethernet in spacecraft/avionics.' },
  { id: 'ethercat', name: 'EtherCAT', fullName: 'Ethernet for Control Automation Technology (IEC 61158)', categoryId: 'industrial', std: 'ETG / IEC 61158', year: '2003', tagline: 'Processes frames on-the-fly in hardware ASICs as a single Ethernet packet passes through every servo node.' },
  { id: 'profinet', name: 'PROFINET', fullName: 'Industrial Real-Time & IRT Switched Ethernet', categoryId: 'industrial', std: 'PI / IEC 61158', year: '2004–2023', tagline: 'Factory automation Ethernet adding RT/IRT hardware ASIC switching and distributed clock sync.' },
  { id: 'modbus', name: 'Modbus', fullName: 'Modbus RTU (RS-485) & Modbus TCP Protocol', categoryId: 'industrial', std: 'Modbus Org / IEC', year: '1979', tagline: 'Simple register/coil polling master-slave industrial automation protocol over RS-485 or TCP port 502.' },
  { id: 'profibus', name: 'PROFIBUS', fullName: 'Process Field Bus (DP / PA over RS-485)', categoryId: 'industrial', std: 'PI / IEC 61158', year: '1989', tagline: '12 Mbps deterministic RS-485 token-passing industrial fieldbus preceding PROFINET.' },
  { id: 'rs-232', name: 'RS-232', fullName: 'TIA-232 Single-Ended Bipolar Serial Interface', categoryId: 'industrial', std: 'EIA / TIA-232-F', year: '1960', tagline: '±3V to ±15V single-ended asynchronous UART point-to-point port for instruments and debug consoles.' },
  { id: 'rs-422', name: 'RS-422', fullName: 'TIA-422 Balanced Differential Multi-Drop Serial', categoryId: 'industrial', std: 'EIA / TIA-422', year: '1975', tagline: 'Full-duplex 10 Mbps noise-immune differential twisted-pair link spanning up to 1.2 km.' },
  { id: 'rs-485', name: 'RS-485', fullName: 'TIA-485 Multi-Point Differential Party-Line Bus', categoryId: 'industrial', std: 'TIA-485-A', year: '1983', tagline: 'Half/full-duplex 32+ unit-load differential industrial backbone underlying Modbus RTU, DMX512, and Profibus.' },
  { id: 'ieee-1394', name: 'IEEE 1394 (FireWire)', fullName: 'IEEE 1394 High-Performance Serial Bus (1394b)', categoryId: 'industrial', std: 'IEEE 1394-2008', year: '1995', tagline: 'Peer-to-peer DMA-capable isochronous serial bus still deployed inside aerospace & machine-vision links.' },
  { id: 'sercos', name: 'SERCOS', fullName: 'Serial Real-Time Communication System (SERCOS III)', categoryId: 'industrial', std: 'IEC 61491', year: '1990–2008', tagline: 'Ring-redundant deterministic industrial servo drive Ethernet achieving sub-microsecond jitter.' },

  // Section 23: Related Semiconductor Interface Standards (Reference Standards)
  { id: 'ieee-754', name: 'IEEE 754', fullName: 'IEEE Standard for Floating-Point Arithmetic', categoryId: 'standards', std: 'IEEE 754-2019', year: '1985–2019', tagline: 'Canonical binary16/32/64/128 floating-point representations, NaN/Inf, FMA, and rounding modes implemented in every FPU.', caveatKind: 'standard-ref' },
  { id: 'ieee-802-3', name: 'IEEE 802.3', fullName: 'IEEE Standard for Ethernet', categoryId: 'standards', std: 'IEEE 802.3-2022', year: '1983–2024', tagline: 'Master Ethernet family standard governing CSMA/CD MAC, MII/XGMII/CGMII, FEC, and 10M–1.6T PHYs.', caveatKind: 'standard-ref' },
  { id: 'ieee-802-1', name: 'IEEE 802.1', fullName: 'IEEE 802.1 Bridging, TSN & Data Center Standards', categoryId: 'standards', std: 'IEEE 802.1Q / TSN', year: '1990–2024', tagline: 'Specifies VLANs, Priority Flow Control (PFC), MACsec encryption, and Time-Sensitive Networking (TSN).', caveatKind: 'standard-ref' },
  { id: 'jedec-ddr-stds', name: 'JEDEC DDR Standards', fullName: 'JEDEC JC-42.3 DDR/DDR2/DDR3/DDR4/DDR5 Family', categoryId: 'standards', std: 'JEDEC JESD79-x', year: '2000–2025', tagline: 'Normative electrical, command-truth-table, SPD EEPROM, and AC timing standards for server/client SDRAM.', caveatKind: 'standard-ref' },
  { id: 'jedec-hbm-stds', name: 'JEDEC HBM Standards', fullName: 'JEDEC JESD235 / JESD238 High Bandwidth Memory Suite', categoryId: 'standards', std: 'JEDEC JESD235/238', year: '2013–2025', tagline: 'Defines 1024/2048-bit TSV pinouts, IEEE 1500 test ports, and pseudo-channel memory timing.', caveatKind: 'standard-ref' },
  { id: 'jedec-lpddr-stds', name: 'JEDEC LPDDR Standards', fullName: 'JEDEC JESD209 Low-Power Mobile DRAM Suite', categoryId: 'standards', std: 'JEDEC JESD209-x', year: '2006–2025', tagline: 'Governs LPDDR1 through LPDDR5X/6 low-voltage CA multiplexing, WCK clocking, and DVFS retention.', caveatKind: 'standard-ref' },
  { id: 'jedec-ufs-stds', name: 'JEDEC UFS Standards', fullName: 'JEDEC JESD220 Universal Flash Storage Suite', categoryId: 'standards', std: 'JEDEC JESD220-x', year: '2011–2024', tagline: 'Unifies SCSI storage protocols, RPMB security, and MIPI M-PHY/UniPro links for mobile/automotive storage.', caveatKind: 'standard-ref' },
  { id: 'mipi-specs', name: 'MIPI Specifications', fullName: 'MIPI Alliance Working Group Specification Portfolio', categoryId: 'standards', std: 'MIPI Alliance', year: '2003–2025', tagline: 'Cross-vendor mobile/automotive ecosystem spanning CSI, DSI, I3C, RFFE, SoundWire, D/C/M/A-PHY.', caveatKind: 'standard-ref' },
  { id: 'usbif-specs', name: 'USB-IF Specifications', fullName: 'USB Implementers Forum Document Library', categoryId: 'standards', std: 'USB-IF', year: '1996–2025', tagline: 'Authoritative specification portal for USB 2.0/3.2/USB4, Type-C, Power Delivery, and compliance CTS.', caveatKind: 'standard-ref' },
  { id: 'pcisig-specs', name: 'PCI-SIG Specifications', fullName: 'PCI-SIG Base, CEM, PIPE & Integrity Standards', categoryId: 'standards', std: 'PCI-SIG', year: '1992–2025', tagline: 'Official specifications for PCIe Gen1–Gen7, SR-IOV, ATS/PASID, IDE encryption, and Form Factors.', caveatKind: 'standard-ref' },
  { id: 'riscv-isa-specs', name: 'RISC-V ISA Specifications', fullName: 'RISC-V Unprivileged, Privileged, Debug & Profile Specs', categoryId: 'standards', std: 'RISC-V International', year: '2014–2025', tagline: 'Open standard ISA specifications governing RV32/RV64, Vector, PMP/Smepmp, AIA interrupts, and Debug.', caveatKind: 'standard-ref' },
  { id: 'arm-arch-specs', name: 'ARM Architecture Specifications', fullName: 'Armv8/Armv9 Architecture Reference & AMBA Library', categoryId: 'standards', std: 'Arm Limited', year: '1990–2025', tagline: 'Authoritative technical reference manuals for Arm CPU architectures, GICv3/v4, SMMU, and AMBA buses.', caveatKind: 'standard-ref' },
  { id: 'ocp-specs', name: 'Open Compute Project Specifications', fullName: 'OCP ODSA BoW, NIC 3.0 & Caliptra Hardware Standards', categoryId: 'standards', std: 'Open Compute Project', year: '2011–2025', tagline: 'Hyperscale open hardware specifications for chiplet BoW interfaces, modular NICs, and Caliptra Root-of-Trust.', caveatKind: 'standard-ref' },
];

export const COMPREHENSIVE_CATALOG_PROTOCOLS: ProtocolDocument[] = COMPREHENSIVE_TUPLES.map(
  (t, idx) => buildCatalogDoc(t, idx)
);
