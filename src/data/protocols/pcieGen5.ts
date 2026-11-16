import { ProtocolDocument } from '../../types/protocol';

export const pcieGen5Protocol: ProtocolDocument = {
  id: 'pcie-gen5',
  name: 'PCIe Gen5',
  fullName: 'PCI Express Base Specification Revision 5.0',
  categoryId: 'high-speed',
  standardBody: 'PCI-SIG',
  specVersion: 'PCI Express Base Specification Rev 5.0 (32.0 GT/s)',
  year: '2019',
  tagline: '32.0 GT/s per-lane full-duplex differential serial interconnect using 128b/130b NRZ encoding and credit-based TLP flow control.',
  depth: 'Full Reference',
  popularityRank: 5,
  overview: {
    definition: 'PCIe Gen5 is a layered, packet-switched, point-to-point serial interconnect operating at 32.0 GT/s per lane using NRZ (2-level) signaling and 128b/130b encoding, delivering ~63 GB/s unidirectional (~126 GB/s bidirectional) across a x16 link.',
    whyDeveloped: 'Data center AI accelerators, 400GbE NICs, NVMe Gen5 SSDs, and CXL 2.0 coherent memory expansion saturated PCIe Gen4 (16.0 GT/s) I/O bandwidth.',
    problemSolved: 'Doubles Gen4 lane rate to 32.0 GT/s while maintaining backward compatibility down to Gen1 (2.5 GT/s) via LTSSM speed negotiation, dynamic Tx/Rx equalization, and lossless credit-based flow control.',
    usedIn: [
      'Data center GPUs, AI inference/training accelerators',
      'CXL 2.0 (Compute Express Link) Type 1/2/3 devices running over PCIe 5.0 PHY',
      '400GbE / 800GbE SmartNICs and NVMe Gen5 enterprise storage',
    ],
    terminology: [
      { term: 'TLP (Transaction Layer Packet)', meaning: 'End-to-end packets carrying Memory Read/Write, Completion (CplD), Config, or Message requests.' },
      { term: 'DLLP (Data Link Layer Packet)', meaning: 'Link-local packets handling Ack/Nak retry protocol, Flow Control credits, and Power Management.' },
      { term: 'LTSSM', meaning: 'Link Training and Status State Machine managing Detect, Polling, Configuration, L0, Recovery, and L0s/L1/L2.' },
      { term: 'Flow Control Credits', meaning: 'Buffer credit accounting (Posted, Non-Posted, Completion) ensuring zero packet drops.' },
    ],
    advantages: [
      '~3.938 GB/s raw payload per lane per direction (x16 = ~63 GB/s unidirectional).',
      'Lossless link via DLLP Ack/Nak Replay Buffer and Credit Flow Control.',
      'Full backward link-width (x1–x16) and speed negotiation (2.5 to 32.0 GT/s).',
    ],
    limitations: [
      'Tight 36 dB insertion loss channel budget at 16 GHz Nyquist requires low-loss PCB substrates or retimers.',
      'Complex 3-phase Tx/Rx Equalization training in LTSSM Recovery.',
      'High verification complexity across PIPE PHY interface, LTSSM, and split-transaction completion timeouts.',
    ],
  },
  architecture: {
    summary: 'PCIe 5.0 stacks three layers: Transaction Layer (TLP generation & credit tracking), Data Link Layer (LCRC + Ack/Nak replay buffer), and Physical Layer (128b/130b scrambling, striping across lanes, LTSSM, and PIPE SerDes interface).',
    clockAndReset: '100 MHz differential REFCLK (+/-300 ppm SSC); PERST# fundamental reset; PCLK on PIPE interface runs at 1.0 GHz (32-bit) or 500 MHz (64-bit) at Gen5 32 GT/s.',
    dataFlow: 'Full-duplex Tx/Rx differential pairs per lane; TLPs striped byte-by-byte across x1/x2/x4/x8/x16 lanes.',
    controlFlow: 'Receiver advertises InitFC1/InitFC2/UpdateFC DLLPs; Transmitter only issues a TLP when sufficient Posted/Non-Posted/Completion credits remain.',
    nodes: [
      { id: 'rc', label: 'Root Complex / SoC Controller', role: 'manager', x: 30, y: 70, width: 175, height: 120 },
      { id: 'pipe', label: 'MAC / PIPE 5.x Interface', role: 'interconnect', x: 255, y: 70, width: 175, height: 120 },
      { id: 'ep', label: 'PCIe Gen5 Endpoint (32 GT/s)', role: 'phy', x: 485, y: 70, width: 185, height: 120 },
    ],
    links: [
      { from: 'rc', to: 'pipe', label: 'AXI / TLP Stream' },
      { from: 'pipe', to: 'ep', label: '128b/130b SerDes Tx/Rx' },
    ],
  },
  specifications: [
    { parameter: 'Data Rate (Gen5)', value: '32.0 GT/s per lane', classification: 'Official Standard Requirement', notes: '16 GHz fundamental Nyquist frequency using NRZ.' },
    { parameter: 'Line Encoding', value: '128b/130b (2-bit Sync Header + 128-bit Block)', classification: 'Official Standard Requirement', notes: '1.54% encoding overhead (vs 20% for Gen1/2 8b/10b). Sync header 2\'b10 = Data, 2\'b01 = Ordered Set.' },
    { parameter: 'Per-Lane Bandwidth (x1)', value: '~3.938 GB/s per direction', classification: 'Official Standard Requirement', notes: '32 GT/s * (128/130) / 8 bits = 3.938 GB/s.' },
    { parameter: 'Channel Loss Budget', value: '36 dB @ 16 GHz (System-to-AIC)', classification: 'Official Standard Requirement', notes: 'Requires DFE + CTLE at Rx and 3-tap FIR pre/de-emphasis at Tx.' },
    { parameter: 'Max Payload Size (MPS)', value: '128 B to 4096 B (256 B / 512 B typical)', classification: 'Configurable Parameter', notes: 'Negotiated in Device Control register.' },
    { parameter: 'PIPE Interface Width', value: '32-bit @ 1 GHz or 64-bit @ 500 MHz', classification: 'Implementation Practice', notes: 'Defined by Intel PIPE 5.x specification.' },
  ],
  versionDifferences: [
    { version: 'Gen4 -> Gen5', keyChanges: 'Doubled speed from 16 GT/s to 32 GT/s; channel loss budget increased to 36 dB; added Alternate Protocol Negotiation (for CXL); shortened TS1/TS2 equalize timeout tolerances.' },
    { version: 'Gen5 -> Gen6', keyChanges: 'Doubled to 64 GT/s using PAM4 signaling, Flit-mode fixed 256B frames, FEC, and L0p dynamic width power saving.' },
  ],
  channels: ['PIPE Tx/Rx Physical', 'Data Link (DLLP)', 'Transaction (TLP)'],
  signals: [
    {
      name: 'TxData[31:0]', channel: 'PIPE Tx/Rx Physical', width: '32 or 64', direction: 'Manager -> Subordinate', resetValue: '0', polarity: 'Data / Multi-bit',
      summary: 'Parallel transmit data from PCIe MAC to SerDes PHY on PIPE interface.',
      timingRules: 'Synchronous to PIPE PCLK; aligned to TxStartBlock and TxSyncHeader.',
      dependencies: ['TxDataValid', 'TxStartBlock', 'TxSyncHeader'],
      legalConditions: 'Active during L0 and LTSSM Polling/Config training sequences.',
      illegalConditions: 'Driving unscrambled Data blocks in L0.',
      rtlExample: 'if (tx_start_block) pipe_tx_sync_hdr <= 2\'b10; // Data block',
      svaAssertion: 'assert property (@(posedge PCLK) disable iff (!Reset_n) TxStartBlock |-> (TxSyncHeader inside {2\'b01, 2\'b10}));',
      uvmDriverNote: 'PIPE VIP tracks 128b/130b block boundaries and scrambles with 23-bit LFSR.',
      commonBugs: ['Using 2\'b00 or 2\'b11 sync headers (invalid—triggers Receiver Framing Error).'],
      relatedInterviewQs: ['What do the two Sync Header values 2\'b10 and 2\'b01 mean in PCIe 128b/130b?'],
    },
    {
      name: 'TxSyncHeader[1:0]', channel: 'PIPE Tx/Rx Physical', width: '2', direction: 'Manager -> Subordinate', resetValue: '01', polarity: 'Data / Multi-bit',
      summary: 'Indicates whether the 128-bit block is a Data Block (2\'b10) or Ordered Set Block (2\'b01).',
      timingRules: 'Sampled on the cycle TxStartBlock=1.',
      dependencies: ['TxStartBlock', 'TxData'],
      legalConditions: 'Strictly 2\'b01 (OS) or 2\'b10 (Data).',
      illegalConditions: '2\'b00 or 2\'b11.',
      rtlExample: 'localparam logic [1:0] SYNC_OS = 2\'b01, SYNC_DATA = 2\'b10;',
      svaAssertion: 'assert property (@(posedge PCLK) TxStartBlock |-> (TxSyncHeader == 2\'b01 || TxSyncHeader == 2\'b10));',
      uvmDriverNote: 'Inject corrupted sync headers in negative framing tests to verify Recovery entry.',
      commonBugs: ['Forgetting to bypass scrambler during SKP Ordered Set insertion.'],
      relatedInterviewQs: ['Why are Ordered Sets excluded from scrambling in Gen3–Gen5?'],
    },
    {
      name: 'RxElecIdle', channel: 'PIPE Tx/Rx Physical', width: '1 per lane', direction: 'Subordinate -> Manager', resetValue: '1', polarity: 'Active High',
      summary: 'PHY signal indicating receiver differential pair is in Electrical Idle (no transitions).',
      timingRules: 'Deasserts during LTSSM Detect -> Polling when partner starts transmitting TS1.',
      dependencies: ['TxElecIdle'],
      legalConditions: '1 during Detect/L0s/L1/L2; 0 during active L0.',
      illegalConditions: 'Unexpected assertion during L0 triggers LTSSM Recovery.',
      rtlExample: 'if (ltssm == DETECT_ACTIVE && !RxElecIdle) next_state = POLLING_ACTIVE;',
      svaAssertion: '// Monitor link drop if RxElecIdle asserts unexpectedly in L0',
      uvmDriverNote: 'Used to trigger L0s exit wake sequences.',
      commonBugs: ['Squelch threshold glitch triggering false exit from L1 low power state.'],
      relatedInterviewQs: ['How does a PCIe link transition from Detect to Polling?'],
    },
    {
      name: 'Credit_FC (PH/PD/NPH/NPD)', channel: 'Data Link (DLLP)', width: '8/12 bits', direction: 'Receiver -> Transmitter', resetValue: 'Initial buffer size', polarity: 'Data / Multi-bit',
      summary: 'Posted, Non-Posted, and Completion Header/Data Flow Control credits advertised via InitFC/UpdateFC DLLPs.',
      timingRules: 'InitFC1/InitFC2 must complete for VC0 before any TLP can enter L0.',
      dependencies: ['TLP_Valid'],
      legalConditions: 'Infinite (0) or finite credit counter tracked modulo 256 (Header) / 4096 (Data).',
      illegalConditions: 'Transmitting a TLP whose header/data credit cost exceeds available remote credits.',
      rtlExample: 'wire can_send_mwr = (avail_ph >= 1) && (avail_pd >= tlp_dw_credits);',
      svaAssertion: 'assert property (@(posedge clk) tlp_tx_fire && is_posted |-> (avail_ph >= 1));',
      uvmDriverNote: 'Scoreboard verifies modular credit wrap-around arithmetic `(CreditLimit - CreditsConsumed) mod 2^N`.',
      commonBugs: ['Overflowing 12-bit Data Credit counter without unsigned modular wrap comparison.'],
      relatedInterviewQs: ['Explain Posted vs Non-Posted vs Completion credits and why Completion credits prevent deadlock.'],
    },
    {
      name: 'AckNak_SeqNum', channel: 'Data Link (DLLP)', width: '12', direction: 'Receiver -> Transmitter', resetValue: '0', polarity: 'Data / Multi-bit',
      summary: '12-bit TLP Sequence Number acknowledged or negatively acknowledged by Data Link Layer.',
      timingRules: 'Receiver verifies LCRC and Sequence Number = ExpectedSeq; sends Ack DLLP or Nak DLLP triggering Replay Buffer retransmission.',
      dependencies: ['LCRC'],
      legalConditions: 'Wraps modulo 4096.',
      illegalConditions: 'Dropping Replay Timer expiry without entering Recovery.',
      rtlExample: 'if (rx_lcrc_err || (rx_seq != next_rcv_seq)) send_nak_dllp <= 1\'b1;',
      svaAssertion: '// Replay number must trigger retransmission within Replay Timeout',
      uvmDriverNote: 'Inject single-bit LCRC corruption to verify Replay Buffer recovery without Transaction Layer loss.',
      commonBugs: ['Purging Replay Buffer before Ack DLLP arrives for that sequence number.'],
      relatedInterviewQs: ['What happens at the Data Link Layer if an LCRC error is detected on an incoming TLP?'],
    },
  ],
  transactionFlow: {
    nominal: [
      { step: 1, phase: 'LTSSM Training', title: 'Link Up & 32 GT/s Equalization', description: 'LTSSM moves Detect -> Polling -> Config -> L0 at 2.5 GT/s, then runs Recovery.Equalization Phases 0–3 to reach 32.0 GT/s.', activeSignals: ['RxElecIdle', 'TxData', 'TxSyncHeader'] },
      { step: 2, phase: 'FC Init', title: 'InitFC1 / InitFC2 Credit Exchange', description: 'Data Link Layer exchanges Posted, Non-Posted, and Completion buffer credits prior to TLP traffic.', activeSignals: ['Credit_FC'] },
      { step: 3, phase: 'TLP Issue', title: 'Posted Write / Non-Posted Read', description: 'Transaction Layer builds 3DW/4DW TLP header, Data Link prepends 12-bit SeqNum and appends 32-bit LCRC, stores copy in Replay Buffer.', activeSignals: ['TxData', 'AckNak_SeqNum'] },
      { step: 4, phase: 'Ack / Completion', title: 'Ack DLLP & CplD Return', description: 'Receiver verifies LCRC and returns Ack DLLP. For Non-Posted Memory Reads, Completer returns CplD TLP matching RequesterID + Tag.', activeSignals: ['AckNak_SeqNum', 'Credit_FC'] },
    ],
    errorAndOrdering: [
      'Strict Ordering Rule: Posted Writes MUST be allowed to pass Non-Posted Reads to prevent producer-consumer deadlock.',
      'Completion Timeout: If a Non-Posted Read receives no Cpl/CplD within configured timeout (typically 50 ms), device flags Completion Timeout error.',
      'Replay Rollover: 4 consecutive Nak/Replay timeouts force LTSSM into Recovery to retrain equalization.',
    ],
  },
  waveforms: [
    {
      id: 'pcie-tlp-ack',
      name: '128b/130b PIPE Block TLP Transmit & Ack DLLP Replay Free',
      category: 'Nominal',
      description: 'MAC issues TLP #42 on PIPE TxData with SyncHeader=2\'b10 (Data) and receives Ack(42) on RxData, freeing Replay Buffer slot.',
      cycles: 10,
      clockName: 'PCLK (1GHz)',
      signals: [
        { name: 'PCLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'TxStartBlock', type: 'bit', values: [0, 1, 0, 0, 0, 1, 0, 0, 0, 0] },
        { name: 'TxSyncHeader', type: 'bus', values: ['-', '10', '-', '-', '-', '01', '-', '-', '-', '-'] },
        { name: 'TxData', type: 'bus', values: ['-', 'STP42', 'MWr_H', 'Data0', 'LCRC', 'SKP_OS', '-', '-', '-', '-'] },
        { name: 'RxValid', type: 'bit', values: [0, 0, 0, 0, 0, 0, 1, 1, 0, 0] },
        { name: 'RxData', type: 'bus', values: ['-', '-', '-', '-', '-', '-', 'SDP', 'ACK42', '-', '-'] },
        { name: 'ReplayBufOcc', type: 'bus', values: ['0', '1', '1', '1', '1', '1', '1', '1', '0', '0'] },
      ],
      annotations: [
        { cycle: 1, label: 'Start of 128b Data Block (SyncHeader=2\'b10)', severity: 'info' },
        { cycle: 5, label: 'SKP Ordered Set (SyncHeader=2\'b01) for clock compensation', severity: 'info' },
        { cycle: 7, label: 'Ack(42) DLLP retires TLP #42 from Replay Buffer', severity: 'info' },
      ],
    },
  ],
  rtl: {
    architectureNotes: 'High-speed PCIe controllers separate the 1 GHz PIPE SerDes clock domain from the core AXI/user clock domain via elastic/async FIFOs and split Transaction/Data-Link pipelines.',
    datapathNotes: '128b/130b gearbox converts 32-bit/64-bit PIPE data words into 130-bit lane blocks and tracks 23-bit PRBS scrambler state.',
    controlpathNotes: 'LTSSM state machine supervises link training, SKP insertion every 370–375 blocks, and Replay Timer management.',
    fsmStates: [
      { id: 'DETECT', label: 'Detect', description: 'Receiver termination detect', x: 40, y: 80, isInitial: true },
      { id: 'POLLING', label: 'Polling', description: 'TS1/TS2 bit & symbol lock', x: 200, y: 80 },
      { id: 'CONFIG', label: 'Config', description: 'Lane width & lane num', x: 360, y: 80 },
      { id: 'L0', label: 'L0', description: 'Active TLP/DLLP link', x: 520, y: 80 },
    ],
    fsmTransitions: [
      { from: 'DETECT', to: 'POLLING', condition: 'RxTermination detected' },
      { from: 'POLLING', to: 'CONFIG', condition: 'TS1/TS2 lock achieved' },
      { from: 'CONFIG', to: 'L0', condition: 'Lane deskew & idle complete' },
      { from: 'L0', to: 'POLLING', condition: 'Recovery / Speed change (Gen5)' },
    ],
    codeTitle: 'pcie_fc_credit_tracker.sv',
    codeLanguage: 'SystemVerilog',
    codeSnippet: `module pcie_fc_credit_tracker #(
  parameter int HDR_W  = 8,
  parameter int DATA_W = 12
)(
  input  logic               clk,
  input  logic               rst_n,
  // Update from Rx UpdateFC DLLP
  input  logic               fc_upd_vld,
  input  logic [HDR_W-1:0]   fc_limit_hdr,
  input  logic [DATA_W-1:0]  fc_limit_data,
  // TLP TX consumption
  input  logic               tx_tlp_fire,
  input  logic [DATA_W-1:0]  tx_tlp_dw4_cost, // 1 credit = 4 DW (16B)
  output logic               has_posted_credit
);
  logic [HDR_W-1:0]  consumed_hdr, limit_hdr_q;
  logic [DATA_W-1:0] consumed_data, limit_data_q;

  // Modular wrap-around credit check per PCIe Base Spec 2.6.1
  logic [HDR_W-1:0]  avail_hdr;
  logic [DATA_W-1:0] avail_data;
  assign avail_hdr  = limit_hdr_q  - consumed_hdr;
  assign avail_data = limit_data_q - consumed_data;

  // MSB=0 check ensures (limit - consumed) mod 2^N < 2^(N-1)
  assign has_posted_credit = (!avail_hdr[HDR_W-1] && (avail_hdr != '0)) &&
                             (!avail_data[DATA_W-1] && (avail_data >= tx_tlp_dw4_cost));

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      consumed_hdr <= '0; consumed_data <= '0;
      limit_hdr_q  <= '0; limit_data_q  <= '0;
    end else begin
      if (fc_upd_vld) begin
        limit_hdr_q  <= fc_limit_hdr;
        limit_data_q <= fc_limit_data;
      end
      if (tx_tlp_fire && has_posted_credit) begin
        consumed_hdr  <= consumed_hdr  + 8'd1;
        consumed_data <= consumed_data + tx_tlp_dw4_cost;
      end
    end
  end
endmodule`,
    commonMistakes: [
      'Comparing `consumed_data < limit_data` directly without modular arithmetic (breaks on 12-bit wrap at 4096).',
      'Forgetting that 1 Data Flow Control Credit equals 4 DWords (16 bytes), rounded up.',
    ],
  },
  verification: {
    uvmArchitecture: 'Dual-layer VIP stack: Physical/PIPE SerDes BFM driving TS1/TS2 training + Transaction-Layer UVM scoreboard checking TLP/Completion Tag matching, Ordering rules, and Credit leaks.',
    driverStrategy: 'Generate Posted MemWr, Non-Posted MemRd/CfgRd, and Split Completions with out-of-order Tags.',
    monitorStrategy: 'Descramble PIPE lane streams, verify 128b/130b block lock, check LCRC, and extract TLPs.',
    scoreboardStrategy: 'Verify Posted writes bypass stalled Non-Posted reads, and check Completion ByteCount/LowerAddress fields.',
    coveragePoints: [
      'LTSSM transitions across L0, Recovery.RcvrLock, Speed (2.5 -> 8 -> 16 -> 32 GT/s), L0s, L1.',
      'Completion splitting (single 512B MemRd answered by 4 x 128B CplD TLPs at RCB boundaries).',
      'Credit wrap-around across 256 Header / 4096 Data boundaries.',
    ],
    cornerCases: [
      'LCRC error injected on last beat of TLP triggering Nak and exact Replay Buffer retransmission.',
      'Posted MemWr overtaking blocked Non-Posted MemRd in ordering queue.',
    ],
    svaSnippet: `// Posted credit must never underflow on TLP transmission
assert property (@(posedge clk) disable iff (!rst_n)
  (tx_tlp_fire && tx_is_posted) |-> has_posted_credit)
  else $error("PCIe FC Violation: Posted TLP transmitted with 0 credits");`,
    uvmSnippet: `// TLP Tag allocation check in UVM scoreboard
if (tlp.fmt_type == MRd64) begin
  assert(!pending_tags.exists(tlp.tag))
    else ` + "`uvm_error(\"TAG_REUSE\", $sformatf(\"Tag %0d already in-flight\", tlp.tag))" + `
  pending_tags[tlp.tag] = tlp;
end`,
  },
  debuggingLab: [
    {
      id: 'pcie-dbg-credit-wrap',
      title: 'Link Stalls Permanently After 4096 Data Credits Consumed',
      symptom: 'PCIe traffic runs smoothly for ~64 KB, then Tx stops sending TLPs despite UpdateFC DLLPs arriving.',
      violatedRule: 'PCIe Base Spec Section 2.6.1: Credit Limit and Credits Consumed are modular counters (mod 2^8 for Header, mod 2^12 for Data).',
      rootCause: 'RTL compared `if (consumed < limit)` using naive unsigned comparison; when `limit` wrapped past 4095 back to 100 while `consumed` was 4080, `4080 < 100` evaluated FALSE.',
      fix: 'Compute `(limit - consumed)` using 12-bit modular subtraction and check MSB==0 (`(limit - consumed) < 2048`).',
      expectedWaveform: {
        id: 'exp-pcie', name: 'Expected: Modular difference = +116 credits', category: 'Nominal', description: 'Wrap-around handled cleanly; tx_tlp_fire continues.', cycles: 6, clockName: 'PCLK',
        signals: [
          { name: 'PCLK', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
          { name: 'consumed', type: 'bus', values: ['4080', '4090', '004', '014', '024', '034'] },
          { name: 'limit', type: 'bus', values: ['100', '100', '100', '100', '100', '100'] },
          { name: 'has_credit', type: 'bit', values: [1, 1, 1, 1, 1, 1] },
          { name: 'tx_tlp_fire', type: 'bit', values: [1, 1, 1, 1, 1, 1] },
        ],
        annotations: [{ cycle: 2, label: 'Modular wrap preserves active credit flow', severity: 'info' }],
      },
      actualWaveform: {
        id: 'act-pcie', name: 'Actual Bug: False zero-credit stall at wrap', category: 'Error', description: 'has_credit drops to 0 when limit wraps ahead of consumed.', cycles: 6, clockName: 'PCLK',
        signals: [
          { name: 'PCLK', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
          { name: 'consumed', type: 'bus', values: ['4080', '4080', '4080', '4080', '4080', '4080'] },
          { name: 'limit', type: 'bus', values: ['100', '100', '100', '100', '100', '100'] },
          { name: 'has_credit', type: 'bit', values: [0, 0, 0, 0, 0, 0] },
          { name: 'tx_tlp_fire', type: 'bit', values: [0, 0, 0, 0, 0, 0] },
        ],
        annotations: [{ cycle: 1, label: 'BUG: Naive (consumed < limit) evaluates false across wrap', severity: 'error' }],
      },
    },
  ],
  interviewQuestions: [
    {
      id: 'pcie-iq-1',
      level: 'Beginner',
      question: 'Why did PCIe Gen3–Gen5 switch from 8b/10b to 128b/130b encoding?',
      answer: '8b/10b wastes 20% of raw SerDes bandwidth on overhead. 128b/130b uses only a 2-bit sync header per 128-bit payload (~1.54% overhead) combined with a 23-bit scrambler for DC balance and clock recovery.',
      keyTakeaway: 'Overhead drops from 20% to 1.54%, saving massive SerDes frequency margin.',
    },
    {
      id: 'pcie-iq-2',
      level: 'Intermediate',
      question: 'Explain why PCIe requires Posted Writes to pass Non-Posted Reads.',
      answer: 'If Device A issues a Non-Posted Read to Host and Host concurrently issues a Posted Write to Device A, blocking the Posted Write behind the Non-Posted Read in a shared switch queue can deadlock if the Non-Posted Read completion depends on that Posted Write completing first.',
      keyTakeaway: 'Posted bypassing Non-Posted prevents PCI ordering deadlocks.',
    },
    {
      id: 'pcie-iq-3',
      level: 'Advanced',
      question: 'How much unidirectional payload bandwidth does a PCIe Gen5 x16 link deliver?',
      answer: '32.0 GT/s * 16 lanes * (128 / 130) / 8 bits/byte = 63.015 GB/s per direction (~126 GB/s full duplex), minus TLP header and DLLP overhead.',
      keyTakeaway: '~63 GB/s unidirectional raw payload.',
    },
  ],
  sources: [
    { title: 'PCI Express Base Specification Revision 5.0, Version 1.0', authority: 'PCI-SIG', reference: 'Chapters 2–4: Transaction, Data Link & Physical Layers' },
    { title: 'PHY Interface for the PCI Express (PIPE) Architecture v5.2', authority: 'Intel Corp.', reference: '128b/130b PIPE Signal Definitions' },
  ],
};
