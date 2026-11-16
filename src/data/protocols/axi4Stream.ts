import { ProtocolDocument } from '../../types/protocol';

export const axi4StreamProtocol: ProtocolDocument = {
  id: 'axi4-stream',
  name: 'AXI4-Stream',
  fullName: 'AMBA 4 AXI4-Stream Protocol',
  categoryId: 'amba',
  standardBody: 'ARM Ltd.',
  specVersion: 'ARM IHI 0051A / IHI 0051B (AMBA AXI-Stream Protocol Specification)',
  year: '2010 (Rev B 2021)',
  tagline: 'Unidirectional, address-free high-speed data streaming protocol with packet framing and zero-overhead backpressure.',
  depth: 'Full Reference',
  popularityRank: 3,
  overview: {
    definition: 'AXI4-Stream is a single-channel, point-to-point unidirectional streaming interface optimized for continuous or packetized data flow without memory addresses.',
    whyDeveloped: 'DSP pipelines, video scalers, Ethernet MACs, and DMA engines move continuous streams where memory addresses and burst counters add useless latency and routing overhead.',
    problemSolved: 'Provides standardized TVALID/TREADY flow control, packet framing via TLAST, sparse/null byte classification via TKEEP and TSTRB, and stream multiplexing via TID/TDEST.',
    usedIn: [
      'Video / ISP pixel pipelines and HDMI/MIPI bridges',
      'Ethernet MAC TX/RX packet engines',
      'DMA scatter-gather streaming ports (S2MM / MM2S)',
      'AI/ML tensor systolic array data feeders',
    ],
    terminology: [
      { term: 'Transmitter (Master)', meaning: 'Drives TVALID, TDATA, TLAST, TKEEP, TSTRB, TID, TDEST, TUSER downstream.' },
      { term: 'Receiver (Slave)', meaning: 'Consumes data stream and controls backpressure via TREADY.' },
      { term: 'Data Byte (TKEEP=1, TSTRB=1)', meaning: 'Valid payload byte carrying real application data.' },
      { term: 'Position Byte (TKEEP=1, TSTRB=0)', meaning: 'Placeholder byte preserving stream alignment without carrying data.' },
      { term: 'Null Byte (TKEEP=0, TSTRB=0)', meaning: 'Padding byte that may be stripped by width converters or upsizers.' },
    ],
    advantages: [
      'Arbitrary continuous stream length—no 4KB boundary or 256-beat burst limits.',
      'Minimal signal set (TVALID, TREADY, TDATA, TLAST) achieves multi-terabit/s aggregate throughput.',
      'Native support for upsizing, downsizing, and packet interleaving via TID.',
    ],
    limitations: [
      'No built-in address channel or read/write response channel.',
      'Unidirectional only—bidirectional links require two independent AXI4-Stream interfaces.',
      'Confusing TKEEP vs TSTRB semantics frequently cause RTL bugs in width converters.',
    ],
  },
  architecture: {
    summary: 'Single unidirectional channel moving payload from Transmitter to Receiver on (TVALID && TREADY). Multiple streams can merge through an AXI4-Stream Switch using TDEST/TID.',
    clockAndReset: 'Rising-edge ACLK and active-LOW ARESETn. TVALID must be 0 during ARESETn=0.',
    dataFlow: 'TDATA bytes (8*n bits wide) flow left-to-right; TLAST=1 marks the end of a frame/packet.',
    controlFlow: 'Identical VALID/READY handshake rules to AXI4: Transmitter cannot wait for TREADY before asserting TVALID.',
    nodes: [
      { id: 'tx', label: 'Stream Transmitter (MAC / Camera)', role: 'manager', x: 40, y: 75, width: 190, height: 110 },
      { id: 'fifo', label: 'Skid / Width Converter', role: 'interconnect', x: 280, y: 75, width: 170, height: 110 },
      { id: 'rx', label: 'Stream Receiver (DMA / DSP)', role: 'subordinate', x: 500, y: 75, width: 190, height: 110 },
    ],
    links: [
      { from: 'tx', to: 'fifo', label: 'TVALID, TDATA, TKEEP, TLAST' },
      { from: 'fifo', to: 'tx', label: 'TREADY' },
      { from: 'fifo', to: 'rx', label: 'TVALID, TDATA, TLAST' },
      { from: 'rx', to: 'fifo', label: 'TREADY' },
    ],
  },
  specifications: [
    { parameter: 'TDATA Width', value: 'Integer multiple of 8 bits (8*n)', classification: 'Configurable Parameter', notes: 'Typically 8, 16, 32, 64, 128, 256, or 512 bits (not strictly required to be power-of-2 in IHI 0051B).' },
    { parameter: 'TKEEP & TSTRB Width', value: 'TDATA_WIDTH / 8 bits each', classification: 'Official Standard Requirement', notes: 'Combination TKEEP=0, TSTRB=1 is RESERVED / ILLEGAL.' },
    { parameter: 'Packet Framing', value: 'Optional TLAST (default 1 if omitted)', classification: 'Configurable Parameter', notes: 'TLAST=1 marks final beat of a packet/frame.' },
    { parameter: 'TREADY Presence', value: 'Optional (default 1 if omitted)', classification: 'Configurable Parameter', notes: 'Fixed-rate sensors (e.g. ADC) may omit TREADY if receiver never backpressures.' },
    { parameter: 'TID / TDEST Widths', value: 'Recommended <= 8 bits / <= 4 bits', classification: 'Configurable Parameter', notes: 'Used for stream ID and routing destination in switches.' },
  ],
  channels: ['Stream Channel'],
  signals: [
    {
      name: 'TVALID', channel: 'Stream Channel', width: '1', direction: 'Transmitter -> Receiver', resetValue: '0', polarity: 'Active High',
      summary: 'Indicates Transmitter is driving valid payload on TDATA and sideband signals.',
      timingRules: 'Must not depend on TREADY; once asserted, stays HIGH until TREADY=1.',
      dependencies: ['TREADY', 'TDATA', 'TLAST'],
      legalConditions: 'Continuous or bursty assertion independent of TREADY.',
      illegalConditions: 'Dropping TVALID when TREADY=0.',
      rtlExample: 'assign m_axis_tvalid = !fifo_empty;',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) (TVALID && !TREADY) |=> TVALID);',
      uvmDriverNote: 'Drives packets with configurable inter-beat bubbles.',
      commonBugs: ['Gating TVALID with TREADY combinationally (`assign TVALID = valid_req & TREADY;`).'],
      relatedInterviewQs: ['What happens if TVALID is gated by TREADY?'],
    },
    {
      name: 'TREADY', channel: 'Stream Channel', width: '1', direction: 'Receiver -> Transmitter', resetValue: 'Implementation-defined', polarity: 'Active High',
      summary: 'Indicates Receiver can accept a stream beat on the current ACLK rising edge.',
      timingRules: 'May wait for TVALID before asserting, or stay HIGH continuously.',
      dependencies: ['TVALID'],
      legalConditions: 'Deasserted during downstream FIFO full or backpressure.',
      illegalConditions: 'Creating a combinational loop with upstream TVALID.',
      rtlExample: 'assign s_axis_tready = !fifo_full;',
      svaAssertion: '// Cover backpressure during active packet before TLAST',
      uvmDriverNote: 'Responder randomly stalls TREADY to verify skid-buffer retention.',
      commonBugs: ['Registered TREADY without a skid buffer, causing 1-beat overflow after full flag rises.'],
      relatedInterviewQs: ['Why do AXI4-Stream pipelines require a 2-entry skid buffer to register TREADY?'],
    },
    {
      name: 'TDATA', channel: 'Stream Channel', width: '8 * n (Configurable)', direction: 'Transmitter -> Receiver', resetValue: 'Undefined', polarity: 'Data / Multi-bit',
      summary: 'Primary payload data bus.',
      timingRules: 'Must remain stable while TVALID=1 and TREADY=0.',
      dependencies: ['TVALID', 'TREADY', 'TKEEP', 'TSTRB'],
      legalConditions: 'Byte lanes where TKEEP=0 may hold arbitrary values.',
      illegalConditions: 'Changing TDATA while TVALID && !TREADY.',
      rtlExample: 'if (TVALID && TREADY) rx_shift_reg <= TDATA;',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) (TVALID && !TREADY) |=> $stable(TDATA));',
      uvmDriverNote: 'Generated per byte stream, sliced according to TKEEP.',
      commonBugs: ['Endianness byte-swap mismatch between Ethernet network order and little-endian DMA.'],
      relatedInterviewQs: ['How does TDATA byte ordering map to memory in an AXI DMA?'],
    },
    {
      name: 'TKEEP', channel: 'Stream Channel', width: 'TDATA_W / 8', direction: 'Transmitter -> Receiver', resetValue: 'All 1s if omitted', polarity: 'Active High',
      summary: 'Byte qualifier indicating whether the corresponding byte in TDATA must be transported (1) or can be stripped as a null byte (0).',
      timingRules: 'Stable while TVALID && !TREADY.',
      dependencies: ['TSTRB', 'TLAST'],
      legalConditions: 'Typically all 1s on non-TLAST beats; trailing 0s on final TLAST beat for unaligned packet lengths.',
      illegalConditions: 'Setting TKEEP[i]=0 while TSTRB[i]=1 (illegal combination).',
      rtlExample: 'if (TVALID && TREADY && TLAST) pkt_bytes += $countones(TKEEP);',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) TVALID |-> ((TSTRB & ~TKEEP) == 0));',
      uvmDriverNote: 'Randomize non-aligned packet lengths (e.g., 61 bytes on 64-bit bus).',
      commonBugs: ['Allowing TKEEP=0, TSTRB=1 in generator or ignoring TKEEP on TLAST beat.'],
      relatedInterviewQs: ['Explain the difference between TKEEP and TSTRB.'],
    },
    {
      name: 'TSTRB', channel: 'Stream Channel', width: 'TDATA_W / 8', direction: 'Transmitter -> Receiver', resetValue: 'Equals TKEEP if omitted', polarity: 'Active High',
      summary: 'Distinguishes Data Bytes (TSTRB=1, TKEEP=1) from Position Bytes (TSTRB=0, TKEEP=1).',
      timingRules: 'Must satisfy TSTRB <= TKEEP bitwise (TSTRB=1 implies TKEEP=1).',
      dependencies: ['TKEEP'],
      legalConditions: 'Often tied directly to TKEEP in standard packet streams.',
      illegalConditions: 'TSTRB[i]=1 when TKEEP[i]=0.',
      rtlExample: 'assign tstrb_valid = ((TSTRB & ~TKEEP) == \'0);',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) TVALID |-> ((TSTRB & ~TKEEP) == 0));',
      uvmDriverNote: 'Verify upsizers preserve position bytes when TKEEP=1, TSTRB=0.',
      commonBugs: ['Using TSTRB without checking TKEEP in null-byte stripping bridges.'],
      relatedInterviewQs: ['When is a Position Byte (TKEEP=1, TSTRB=0) used in practice?'],
    },
    {
      name: 'TLAST', channel: 'Stream Channel', width: '1', direction: 'Transmitter -> Receiver', resetValue: '0', polarity: 'Active High',
      summary: 'Indicates boundary / final beat of a packet or frame.',
      timingRules: 'Held stable while TVALID && !TREADY.',
      dependencies: ['TVALID', 'TREADY'],
      legalConditions: 'Can be asserted every cycle for 1-beat packets, or never asserted for infinite continuous streams.',
      illegalConditions: 'Changing TLAST during stall.',
      rtlExample: 'if (TVALID && TREADY && TLAST) pkt_done <= 1\'b1;',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) (TVALID && !TREADY) |=> $stable(TLAST));',
      uvmDriverNote: 'Packet sequence sets TLAST=1 on final word.',
      commonBugs: ['Dropping TLAST during width-conversion downsizing or missing TLAST on 1-beat packet.'],
      relatedInterviewQs: ['What happens in an AXI4-Stream DMA if TLAST never asserts?'],
    },
  ],
  transactionFlow: {
    nominal: [
      { step: 1, phase: 'Packet Start', title: 'Beat 0 Assertion', description: 'Transmitter drives TVALID=1, first TDATA word, TKEEP=all 1s, TLAST=0.', activeSignals: ['TVALID', 'TDATA', 'TKEEP', 'TLAST'] },
      { step: 2, phase: 'Streaming / Stall', title: 'Flow Control via TREADY', description: 'Receiver asserts TREADY=1 to accept beats every cycle, or drops TREADY=0 to apply zero-loss backpressure.', activeSignals: ['TVALID', 'TREADY', 'TDATA'] },
      { step: 3, phase: 'Packet End', title: 'TLAST & Partial TKEEP', description: 'Final beat asserts TLAST=1 with TKEEP masking valid bytes in the last word.', activeSignals: ['TVALID', 'TREADY', 'TLAST', 'TKEEP'] },
    ],
    errorAndOrdering: [
      'AXI4-Stream has no native error response signal; packet errors (CRC fail, abort) are carried via TUSER sideband on the TLAST beat.',
      'Beats sharing the same TID must maintain strict FIFO order.',
    ],
  },
  waveforms: [
    {
      id: 'axis-packet-stall',
      name: '3-Beat Packet with Partial Final TKEEP and Backpressure',
      category: 'Backpressure',
      description: 'Transmitter sends 3-beat packet (10 bytes total on 32-bit bus). Receiver stalls cycle 4 with TREADY=0; TLAST beat has TKEEP=0x3.',
      cycles: 8,
      clockName: 'ACLK',
      signals: [
        { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'TVALID', type: 'bit', values: [0, 1, 1, 1, 1, 1, 0, 0] },
        { name: 'TREADY', type: 'bit', values: [1, 1, 1, 0, 1, 1, 1, 1] },
        { name: 'TDATA', type: 'bus', values: ['-', 'P0', 'P1', 'P2', 'P2', 'P3', '-', '-'] },
        { name: 'TKEEP', type: 'bus', values: ['-', 'F', 'F', 'F', 'F', '3', '-', '-'] },
        { name: 'TLAST', type: 'bit', values: [0, 0, 0, 0, 0, 1, 0, 0] },
      ],
      annotations: [
        { cycle: 3, label: 'TREADY=0 stalls P2; TDATA/TLAST held stable', severity: 'warn' },
        { cycle: 5, label: 'TLAST=1 with TKEEP=4\'h3 (2 valid bytes)', severity: 'info' },
      ],
    },
  ],
  rtl: {
    architectureNotes: 'A 2-entry skid buffer registers all outputs (TVALID, TDATA, TLAST, TREADY) with zero combinational path between upstream and downstream while sustaining 1 beat/cycle.',
    datapathNotes: 'Primary register `data_r` holds active beat; `skid_r` captures incoming beat during the 1-cycle downstream TREADY deassertion shadow.',
    controlpathNotes: 'State switches cleanly between EMPTY, BUSY (1 entry), and FULL (2 entries, upstream TREADY=0).',
    fsmStates: [
      { id: 'EMPTY', label: 'EMPTY', description: 's_tready=1, m_tvalid=0', x: 60, y: 80, isInitial: true },
      { id: 'BUSY', label: 'BUSY', description: 's_tready=1, m_tvalid=1', x: 260, y: 80 },
      { id: 'FULL', label: 'FULL', description: 's_tready=0, skid_r holds beat', x: 460, y: 80 },
    ],
    fsmTransitions: [
      { from: 'EMPTY', to: 'BUSY', condition: 's_tvalid' },
      { from: 'BUSY', to: 'EMPTY', condition: '!s_tvalid && m_tready' },
      { from: 'BUSY', to: 'FULL', condition: 's_tvalid && !m_tready' },
      { from: 'FULL', to: 'BUSY', condition: 'm_tready' },
    ],
    codeTitle: 'axis_skid_buffer.sv',
    codeLanguage: 'SystemVerilog',
    codeSnippet: `module axis_skid_buffer #(
  parameter int DATA_W = 64
)(
  input  logic                ACLK,
  input  logic                ARESETn,
  input  logic                s_tvalid,
  output logic                s_tready,
  input  logic [DATA_W-1:0]   s_tdata,
  input  logic                s_tlast,
  output logic                m_tvalid,
  input  logic                m_tready,
  output logic [DATA_W-1:0]   m_tdata,
  output logic                m_tlast
);
  logic [DATA_W:0] main_q, skid_q;
  logic            main_v, skid_v;

  assign s_tready = !skid_v;
  assign m_tvalid = main_v;
  assign {m_tlast, m_tdata} = main_q;

  always_ff @(posedge ACLK or negedge ARESETn) begin
    if (!ARESETn) begin
      main_v <= 1'b0; skid_v <= 1'b0;
      main_q <= '0;   skid_q <= '0;
    end else begin
      if (s_tvalid && s_tready) begin
        if (!main_v || (m_tready && !skid_v)) begin
          main_q <= {s_tlast, s_tdata};
          main_v <= 1'b1;
        end else begin
          skid_q <= {s_tlast, s_tdata};
          skid_v <= 1'b1;
        end
      end else if (m_tvalid && m_tready) begin
        if (skid_v) begin
          main_q <= skid_q;
          skid_v <= 1'b0;
        end else begin
          main_v <= 1'b0;
        end
      end
    end
  end
endmodule`,
    commonMistakes: [
      'Registering TREADY with a 1-entry buffer—drops 1 beat whenever downstream stalls.',
      'Violating (TSTRB & ~TKEEP) == 0 during width conversion.',
    ],
  },
  verification: {
    uvmArchitecture: 'Packet-level UVM agent: driver serializes variable-length byte arrays into TDATA beats with randomized TKEEP trailing masks and TUSER metadata; monitor reassembles complete packets on TLAST.',
    driverStrategy: 'Inject random TVALID idle gaps (0–5 cycles) and random TREADY backpressure bursts.',
    monitorStrategy: 'Reconstruct byte stream whenever (TVALID && TREADY), discard null bytes (TKEEP=0), and flush packet upon TLAST=1.',
    scoreboardStrategy: 'Byte-stream queue comparison independent of bus width (allows verifying 64b-to-128b upsizer DUTs).',
    coveragePoints: [
      'Packet byte lengths: 1 byte, sub-word, exact bus-width multiple, unaligned jumbo frame.',
      'All TKEEP trailing bitmasks at TLAST.',
      'Back-to-back packets with zero idle cycles between TLAST and next packet beat 0.',
    ],
    cornerCases: [
      '1-beat packet where first beat also has TLAST=1.',
      'Null beat inside packet (TKEEP=0, TLAST=0) produced by sparse stream filter.',
    ],
    svaSnippet: `assert property (@(posedge ACLK) disable iff (!ARESETn)
  TVALID |-> ((TSTRB & ~TKEEP) == '0))
  else $error("Illegal AXI4-Stream: TSTRB=1 while TKEEP=0");`,
    uvmSnippet: `// Reassemble byte packet in axi4s_monitor
if (vif.TVALID && vif.TREADY) begin
  for (int b = 0; b < DATA_W/8; b++) begin
    if (vif.TKEEP[b]) pkt.bytes.push_back(vif.TDATA[8*b +: 8]);
  end
  if (vif.TLAST) begin ap.write(pkt); pkt = new(); end
end`,
  },
  debuggingLab: [
    {
      id: 'axis-dbg-drop',
      title: '1-Beat Packet Drop in Naive Registered TREADY Pipeline',
      symptom: 'Every time downstream deasserts TREADY for 1 cycle, one TDATA word disappears or duplicates.',
      violatedRule: 'Upstream saw s_tready=1 on cycle N and drove beat B1, while downstream stalled.',
      rootCause: 'Engineer registered `s_tready <= m_tready` without a skid register to catch the in-flight beat on cycle N+1.',
      fix: 'Replace 1-stage register with a 2-entry skid buffer (`main_q` + `skid_q`).',
      expectedWaveform: {
        id: 'exp-axis', name: 'Expected: Skid buffer holds B1 during TREADY=0', category: 'Nominal', description: 'B1 captured in skid_q and forwarded cleanly at cycle 4.', cycles: 6, clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
          { name: 's_tvalid', type: 'bit', values: [0, 1, 1, 1, 0, 0] },
          { name: 's_tready', type: 'bit', values: [1, 1, 1, 0, 1, 1] },
          { name: 's_tdata', type: 'bus', values: ['-', 'B0', 'B1', 'B2', '-', '-'] },
          { name: 'm_tvalid', type: 'bit', values: [0, 0, 1, 1, 1, 1] },
          { name: 'm_tready', type: 'bit', values: [1, 1, 0, 1, 1, 1] },
          { name: 'm_tdata', type: 'bus', values: ['-', '-', 'B0', 'B0', 'B1', 'B2'] },
        ],
        annotations: [{ cycle: 4, label: 'B1 & B2 delivered intact', severity: 'info' }],
      },
      actualWaveform: {
        id: 'act-axis', name: 'Actual Bug: Beat B1 Overwritten', category: 'Error', description: 'B1 is overwritten by B2 when m_tready drops.', cycles: 6, clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
          { name: 's_tvalid', type: 'bit', values: [0, 1, 1, 1, 0, 0] },
          { name: 's_tready', type: 'bit', values: [1, 1, 1, 0, 1, 1] },
          { name: 's_tdata', type: 'bus', values: ['-', 'B0', 'B1', 'B2', '-', '-'] },
          { name: 'm_tvalid', type: 'bit', values: [0, 0, 1, 1, 1, 0] },
          { name: 'm_tready', type: 'bit', values: [1, 1, 0, 1, 1, 1] },
          { name: 'm_tdata', type: 'bus', values: ['-', '-', 'B0', 'B0', 'B2', '-'] },
        ],
        annotations: [{ cycle: 4, label: 'BUG: Beat B1 lost!', severity: 'error' }],
      },
    },
  ],
  interviewQuestions: [
    {
      id: 'axis-iq-1',
      level: 'Beginner',
      question: 'Why does AXI4-Stream not have an address channel?',
      answer: 'AXI4-Stream moves sequential data between known producer-consumer endpoints (e.g., Ethernet MAC to DMA). Addressing is handled either at a DMA descriptor layer or via TDEST routing IDs.',
      keyTakeaway: 'Eliminating address channels removes burst/4KB boundaries and saves area.',
    },
    {
      id: 'axis-iq-2',
      level: 'Intermediate',
      question: 'What is the difference between TKEEP and TSTRB, and which combination is illegal?',
      answer: 'TKEEP=1 indicates the byte must remain in the stream; TKEEP=0 marks a null byte that can be removed. TSTRB=1 indicates valid data content; TSTRB=0 with TKEEP=1 marks a Position Byte (alignment placeholder). TKEEP=0 with TSTRB=1 is illegal.',
      keyTakeaway: 'TSTRB=1 requires TKEEP=1.',
    },
  ],
  sources: [
    { title: 'AMBA AXI-Stream Protocol Specification (IHI 0051A / IHI 0051B)', authority: 'ARM Ltd.', reference: 'Sections 2–4: Handshake, TKEEP/TSTRB, Optional Signals' },
  ],
};
