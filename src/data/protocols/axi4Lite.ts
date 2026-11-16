import { ProtocolDocument } from '../../types/protocol';

export const axi4LiteProtocol: ProtocolDocument = {
  id: 'axi4-lite',
  name: 'AXI4-Lite',
  fullName: 'AMBA AXI4-Lite Control & Register Interface',
  categoryId: 'amba',
  standardBody: 'ARM Ltd.',
  specVersion: 'ARM IHI 0022E Section B1 (AXI4-Lite)',
  year: '2010',
  tagline: 'Lightweight, single-beat subset of AXI4 optimized for memory-mapped control/status registers (CSRs).',
  depth: 'Full Reference',
  popularityRank: 2,
  overview: {
    definition: 'AXI4-Lite is a streamlined, non-burst subset of AXI4 designed specifically for single-data-transfer access to memory-mapped peripheral registers and IP configuration spaces.',
    whyDeveloped: 'Full AXI4 carries burst counters, ID tracking, cache attributes, and wrap-address arithmetic that are unnecessary overhead for simple 32-bit or 64-bit CSR blocks.',
    problemSolved: 'Retains AXI4\'s decoupled 5-channel VALID/READY handshake compatibility so register peripherals can attach to AXI interconnects without complex burst state machines.',
    usedIn: [
      'IP control and status register (CSR) interfaces',
      'DMA descriptor configuration ports',
      'SoC clock, reset, and power management controllers',
      'Interrupt controller (GIC / PLIC) programming interfaces',
    ],
    terminology: [
      { term: 'Single-Beat Only', meaning: 'Every AXI4-Lite transaction has an implicit burst length of 1 transfer (no AxLEN signal).' },
      { term: 'Fixed Data Width', meaning: 'Standard requires WDATA and RDATA width to be strictly 32 bits or 64 bits.' },
      { term: 'Protection Unit (AxPROT)', meaning: '3-bit privilege/security/instruction indicator preserved from full AXI4.' },
    ],
    advantages: [
      'Tiny RTL footprint—no burst counters, no AxID reordering queues, no WLAST/RLAST logic.',
      'Direct drop-in compatibility with AXI4 interconnect bridges.',
      'Independent read/write channels allow simultaneous register write and status read.',
    ],
    limitations: [
      'No burst support—low peak bandwidth for bulk data movement.',
      'No exclusive accesses (atomic locks) or caching/QoS attributes.',
      'Slightly higher wire count than APB due to 5 separate VALID/READY pairs.',
    ],
  },
  architecture: {
    summary: 'Uses the exact five-channel topology of AXI4 (AW, W, B, AR, R) with all burst, ID, lock, cache, and QoS signals removed.',
    clockAndReset: 'Rising-edge ACLK and active-LOW ARESETn. All VALID signals reset to 0.',
    dataFlow: 'Single 32-bit or 64-bit transfer per address handshake. WSTRB supports sub-word byte writes.',
    controlFlow: 'Independent VALID/READY handshakes per channel; Subordinate must generate BRESP on B channel and RDATA/RRESP on R channel.',
    nodes: [
      { id: 'cpu', label: 'Host / Interconnect', role: 'manager', x: 40, y: 75, width: 170, height: 110 },
      { id: 'reg', label: 'AXI4-Lite CSR Bank', role: 'subordinate', x: 380, y: 75, width: 210, height: 110 },
    ],
    links: [
      { from: 'cpu', to: 'reg', label: 'AWADDR, WDATA, WSTRB, ARADDR' },
      { from: 'reg', to: 'cpu', label: 'BRESP, RDATA, RRESP' },
    ],
  },
  specifications: [
    { parameter: 'Data Bus Width', value: '32 bits or 64 bits ONLY', classification: 'Official Standard Requirement', notes: 'Unlike full AXI4, widths of 128+ bits are not part of the AXI4-Lite specification.' },
    { parameter: 'Burst Length', value: 'Fixed to 1 transfer (no AxLEN)', classification: 'Official Standard Requirement', notes: 'No WLAST or RLAST signals exist.' },
    { parameter: 'Transaction IDs', value: 'Not present (all transactions in-order)', classification: 'Official Standard Requirement', notes: 'Interconnect bridges handle ID stripping and matching.' },
    { parameter: 'Access Size', value: 'All accesses are data-bus width', classification: 'Official Standard Requirement', notes: 'No AxSIZE signal; partial writes use WSTRB.' },
    { parameter: 'Protection Signals', value: 'AWPROT[2:0], ARPROT[2:0]', classification: 'Official Standard Requirement', notes: 'Bit 0: Privileged, Bit 1: Non-secure, Bit 2: Instruction.' },
    { parameter: 'Responses (BRESP / RRESP)', value: 'OKAY (00), SLVERR (10), DECERR (11)', classification: 'Official Standard Requirement', notes: 'EXOKAY (01) is illegal in AXI4-Lite because exclusive access is unsupported.' },
  ],
  channels: ['Write Address (AW)', 'Write Data (W)', 'Write Response (B)', 'Read Address (AR)', 'Read Data (R)'],
  signals: [
    {
      name: 'AWVALID', channel: 'Write Address (AW)', width: '1', direction: 'Manager -> Subordinate', resetValue: '0', polarity: 'Active High',
      summary: 'Indicates valid write register address AWADDR and AWPROT.',
      timingRules: 'Must not depend on AWREADY; hold HIGH until AWREADY=1.',
      dependencies: ['AWREADY', 'AWADDR'],
      legalConditions: 'May assert concurrently with WVALID or prior to WVALID.',
      illegalConditions: 'Waiting for AWREADY before asserting AWVALID.',
      rtlExample: 'wire wr_en = aw_hs && w_hs;',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) (AWVALID && !AWREADY) |=> AWVALID);',
      uvmDriverNote: 'Drives single-cycle or skewed AW/W phase.',
      commonBugs: ['Assuming AWVALID and WVALID always arrive on the exact same clock cycle.'],
      relatedInterviewQs: ['Why do many beginner AXI4-Lite RTL slaves fail when AWVALID and WVALID arrive on different cycles?'],
    },
    {
      name: 'AWADDR', channel: 'Write Address (AW)', width: 'Configurable (typically 32)', direction: 'Manager -> Subordinate', resetValue: 'Undefined', polarity: 'Data / Multi-bit',
      summary: 'Byte address of target control register.',
      timingRules: 'Stable while AWVALID && !AWREADY.',
      dependencies: ['AWVALID', 'AWREADY'],
      legalConditions: 'Word-aligned for 32-bit registers (AWADDR[1:0] == 2\'b00 typical).',
      illegalConditions: 'Changing AWADDR before AWREADY=1.',
      rtlExample: 'if (AWVALID && AWREADY) awaddr_q <= AWADDR;',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) (AWVALID && !AWREADY) |=> $stable(AWADDR));',
      uvmDriverNote: 'Constrained to register map offsets.',
      commonBugs: ['Decoding AWADDR[3:0] directly instead of word-indexed AWADDR[5:2].'],
      relatedInterviewQs: ['How does a 32-bit AXI4-Lite slave decode register offsets?'],
    },
    {
      name: 'WSTRB', channel: 'Write Data (W)', width: 'DATA_W / 8 (4 or 8)', direction: 'Manager -> Subordinate', resetValue: 'Undefined', polarity: 'Active High',
      summary: 'Byte-lane write enable mask for WDATA.',
      timingRules: 'WSTRB[n] corresponds to WDATA[8*n +: 8]. Stable while WVALID && !WREADY.',
      dependencies: ['WVALID', 'WDATA'],
      legalConditions: 'Any 4-bit/8-bit mask including 4\'b0000 (no-op write that still expects BRESP).',
      illegalConditions: 'Ignoring WSTRB in register writes and overwriting all 32 bits unconditionally.',
      rtlExample: 'for (int b = 0; b < 4; b++) if (WSTRB[b]) reg0[8*b +: 8] <= WDATA[8*b +: 8];',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) (WVALID && !WREADY) |=> $stable(WSTRB));',
      uvmDriverNote: 'Randomize partial byte strobes in CSR verification.',
      commonBugs: ['Forgetting WSTRB==0 still requires a normal BVALID response.'],
      relatedInterviewQs: ['If WSTRB is 4\'b0000 in AXI4-Lite, should the slave still return BVALID?'],
    },
    {
      name: 'BRESP', channel: 'Write Response (B)', width: '2', direction: 'Subordinate -> Manager', resetValue: '00', polarity: 'Data / Multi-bit',
      summary: 'Write status: OKAY (2\'b00), SLVERR (2\'b10), DECERR (2\'b11).',
      timingRules: 'Valid when BVALID=1; must follow both AW and W handshakes.',
      dependencies: ['BVALID', 'BREADY'],
      legalConditions: '2\'b00, 2\'b10, or 2\'b11.',
      illegalConditions: '2\'b01 (EXOKAY) is forbidden in AXI4-Lite.',
      rtlExample: 'assign BRESP = addr_invalid ? 2\'b10 : 2\'b00;',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) BVALID |-> (BRESP != 2\'b01));',
      uvmDriverNote: 'Scoreboard checks SLVERR when accessing unmapped CSR offsets.',
      commonBugs: ['Returning OKAY on writes to read-only or unimplemented addresses when spec expects SLVERR.'],
      relatedInterviewQs: ['Why is EXOKAY illegal in AXI4-Lite?'],
    },
    {
      name: 'ARADDR', channel: 'Read Address (AR)', width: 'Configurable', direction: 'Manager -> Subordinate', resetValue: 'Undefined', polarity: 'Data / Multi-bit',
      summary: 'Byte address for single register read.',
      timingRules: 'Stable while ARVALID && !ARREADY.',
      dependencies: ['ARVALID', 'ARREADY'],
      legalConditions: 'Independent of AWADDR.',
      illegalConditions: 'Mutating ARADDR during stall.',
      rtlExample: 'if (ARVALID && ARREADY) rdata_q <= csr_mux(ARADDR);',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) (ARVALID && !ARREADY) |=> $stable(ARADDR));',
      uvmDriverNote: 'Reads back registers immediately after writes in UVM reg_model tests.',
      commonBugs: ['Reading stale RDATA when RVALID asserts before register mux settles.'],
      relatedInterviewQs: ['Can an AXI4-Lite slave accept a read and a write on the exact same cycle?'],
    },
    {
      name: 'RRESP', channel: 'Read Data (R)', width: '2', direction: 'Subordinate -> Manager', resetValue: '00', polarity: 'Data / Multi-bit',
      summary: 'Read completion status (OKAY, SLVERR, DECERR).',
      timingRules: 'Held stable while RVALID && !RREADY.',
      dependencies: ['RVALID', 'RREADY', 'RDATA'],
      legalConditions: 'Must never be EXOKAY (2\'b01).',
      illegalConditions: 'Returning RVALID in same cycle as ARVALID.',
      rtlExample: 'assign RRESP = rd_decode_err ? 2\'b10 : 2\'b00;',
      svaAssertion: 'assert property (@(posedge ACLK) disable iff (!ARESETn) RVALID |-> (RRESP != 2\'b01));',
      uvmDriverNote: 'Matched against uvm_reg predictor status.',
      commonBugs: ['Changing RDATA while RVALID=1 and RREADY=0 when register updates from hardware.'],
      relatedInterviewQs: ['What happens if a status register changes while RVALID=1 and RREADY=0?'],
    },
  ],
  transactionFlow: {
    nominal: [
      { step: 1, phase: 'AW/W Issue', title: 'Decoupled Write Address & Data', description: 'Manager drives AWVALID/AWADDR and WVALID/WDATA/WSTRB independently (in any order or concurrently).', activeSignals: ['AWVALID', 'AWREADY', 'WVALID', 'WREADY'] },
      { step: 2, phase: 'Register Commit', title: 'Register File Update', description: 'Subordinate commits WDATA masked by WSTRB once both AW and W phases have been latched.', activeSignals: ['AWADDR', 'WDATA', 'WSTRB'] },
      { step: 3, phase: 'B Response', title: 'Write Status Return', description: 'Subordinate asserts BVALID with BRESP; Manager accepts with BREADY.', activeSignals: ['BVALID', 'BREADY', 'BRESP'] },
      { step: 4, phase: 'AR & R Read', title: 'Control Register Read', description: 'Manager handshakes ARVALID/ARADDR; Subordinate latches read mux value into RDATA and asserts RVALID until RREADY.', activeSignals: ['ARVALID', 'ARREADY', 'RVALID', 'RREADY', 'RDATA'] },
    ],
    errorAndOrdering: [
      'All AXI4-Lite transactions are strictly single-beat and in-order (no IDs).',
      'EXOKAY (2\'b01) is strictly prohibited on BRESP and RRESP.',
      'Subordinate must latch RDATA in a flip-flop when AR handshake occurs so live hardware CSR changes do not violate RDATA stability while RREADY=0.',
    ],
  },
  waveforms: [
    {
      id: 'axil-skewed-wr-rd',
      name: 'Skewed Write (AW before W) Followed by Register Read',
      category: 'Nominal',
      description: 'AWVALID arrives 1 cycle before WVALID. Subordinate latches AWADDR, waits for WVALID, updates CSR, returns BRESP, then services a read.',
      cycles: 10,
      clockName: 'ACLK',
      signals: [
        { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'AWVALID', type: 'bit', values: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0] },
        { name: 'AWREADY', type: 'bit', values: [1, 1, 0, 0, 1, 1, 1, 1, 1, 1] },
        { name: 'AWADDR', type: 'bus', values: ['-', '0004', '-', '-', '-', '-', '-', '-', '-', '-'] },
        { name: 'WVALID', type: 'bit', values: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
        { name: 'WREADY', type: 'bit', values: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
        { name: 'WDATA', type: 'bus', values: ['-', '-', 'CAFE', '-', '-', '-', '-', '-', '-', '-'] },
        { name: 'BVALID', type: 'bit', values: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0] },
        { name: 'BREADY', type: 'bit', values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: 'ARVALID', type: 'bit', values: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
        { name: 'ARREADY', type: 'bit', values: [1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
        { name: 'RVALID', type: 'bit', values: [0, 0, 0, 0, 0, 0, 1, 1, 0, 0] },
        { name: 'RREADY', type: 'bit', values: [1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
        { name: 'RDATA', type: 'bus', values: ['-', '-', '-', '-', '-', '-', 'CAFE', 'CAFE', '-', '-'] },
      ],
      annotations: [
        { cycle: 1, label: 'AW accepted before W arrives', severity: 'info' },
        { cycle: 2, label: 'W accepted; register 0x04 = 0xCAFE', severity: 'info' },
        { cycle: 6, label: 'RREADY=0 holds RDATA=0xCAFE', severity: 'warn' },
      ],
    },
  ],
  rtl: {
    architectureNotes: 'Hold separate aw_seen and w_seen flip-flops so AW and W can arrive in any relative order (AW first, W first, or simultaneous).',
    datapathNotes: '32-bit register bank indexed by word address bits [5:2] with byte-granular WSTRB write enables.',
    controlpathNotes: 'BVALID asserts on the cycle after both aw_seen and w_seen are satisfied; cleared on BVALID && BREADY.',
    fsmStates: [
      { id: 'WAIT_AW_W', label: 'WAIT_AW_W', description: 'Capture AW and/or W independently', x: 60, y: 80, isInitial: true },
      { id: 'COMMIT', label: 'COMMIT', description: 'Write CSR when both latched', x: 260, y: 80 },
      { id: 'RESP', label: 'RESP', description: 'Drive BVALID until BREADY', x: 460, y: 80 },
    ],
    fsmTransitions: [
      { from: 'WAIT_AW_W', to: 'COMMIT', condition: 'aw_seen && w_seen' },
      { from: 'COMMIT', to: 'RESP', condition: 'always (1 cycle)' },
      { from: 'RESP', to: 'WAIT_AW_W', condition: 'BVALID && BREADY' },
    ],
    codeTitle: 'axi4_lite_csr_slave.sv',
    codeLanguage: 'SystemVerilog',
    codeSnippet: `module axi4_lite_csr_slave (
  input  logic        ACLK,
  input  logic        ARESETn,
  input  logic        AWVALID, output logic AWREADY, input logic [31:0] AWADDR,
  input  logic        WVALID,  output logic WREADY,  input logic [31:0] WDATA, input logic [3:0] WSTRB,
  output logic        BVALID,  input  logic BREADY,  output logic [1:0] BRESP,
  input  logic        ARVALID, output logic ARREADY, input logic [31:0] ARADDR,
  output logic        RVALID,  input  logic RREADY,  output logic [31:0] RDATA, output logic [1:0] RRESP
);
  logic        aw_seen, w_seen;
  logic [31:0] awaddr_q, wdata_q;
  logic [3:0]  wstrb_q;
  logic [31:0] ctrl_reg, status_reg;

  assign AWREADY = !aw_seen && !BVALID;
  assign WREADY  = !w_seen  && !BVALID;
  assign ARREADY = !RVALID;
  assign BRESP   = 2'b00;
  assign RRESP   = 2'b00;

  always_ff @(posedge ACLK or negedge ARESETn) begin
    if (!ARESETn) begin
      aw_seen <= 1'b0; w_seen <= 1'b0; BVALID <= 1'b0;
      RVALID  <= 1'b0; ctrl_reg <= 32'h0;
    end else begin
      if (AWVALID && AWREADY) begin aw_seen <= 1'b1; awaddr_q <= AWADDR; end
      if (WVALID  && WREADY)  begin w_seen  <= 1'b1; wdata_q  <= WDATA; wstrb_q <= WSTRB; end

      if (aw_seen && w_seen && !BVALID) begin
        if (awaddr_q[3:2] == 2'b00) begin
          for (int b = 0; b < 4; b++)
            if (wstrb_q[b]) ctrl_reg[8*b +: 8] <= wdata_q[8*b +: 8];
        end
        aw_seen <= 1'b0; w_seen <= 1'b0; BVALID <= 1'b1;
      end else if (BVALID && BREADY) begin
        BVALID <= 1'b0;
      end

      if (ARVALID && ARREADY) begin
        RDATA  <= (ARADDR[3:2] == 2'b00) ? ctrl_reg : status_reg;
        RVALID <= 1'b1;
      end else if (RVALID && RREADY) begin
        RVALID <= 1'b0;
      end
    end
  end
endmodule`,
    commonMistakes: [
      'Requiring AWVALID && WVALID on the exact same cycle (breaks skewed interconnects).',
      'Not latching RDATA at AR handshake, exposing live status counter changes during RREADY=0.',
    ],
  },
  verification: {
    uvmArchitecture: 'UVM RAL (Register Abstraction Layer) integrated with an axi4_lite_adapter so register tests drive `reg_model.CTRL.write(status, val)` automatically.',
    driverStrategy: 'Drive AW-first, W-first, and simultaneous AW+W permutations randomly on every write.',
    monitorStrategy: 'Reconstruct write/read items and feed `uvm_reg_predictor` for automatic mirror verification.',
    scoreboardStrategy: 'UVM RAL built-in predictor checks read-back against RW/RO/W1C field policies.',
    coveragePoints: [
      'Relative arrival skew between AWVALID and WVALID (-3 to +3 cycles).',
      'All WSTRB combinations (0x0, 0x1, 0x3, 0xF).',
      'Unmapped address reads/writes verifying SLVERR.',
    ],
    cornerCases: [
      'Simultaneous AWVALID, WVALID, and ARVALID on the same clock edge.',
      'Hardware counter incrementing while RVALID=1 and RREADY=0.',
    ],
    svaSnippet: `assert property (@(posedge ACLK) disable iff (!ARESETn)
  (BVALID && !BREADY) |=> (BVALID && $stable(BRESP)));
assert property (@(posedge ACLK) disable iff (!ARESETn)
  (RVALID && !RREADY) |=> (RVALID && $stable({RDATA, RRESP})));`,
    uvmSnippet: `class axi4_lite_ral_adapter extends uvm_reg_adapter;
  virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
    axi4_lite_item tr = axi4_lite_item::type_id::create("tr");
    tr.is_write = (rw.kind == UVM_WRITE);
    tr.addr     = rw.addr;
    tr.data     = rw.data;
    tr.strb     = rw.byte_en;
    return tr;
  endfunction
endclass`,
  },
  debuggingLab: [
    {
      id: 'axil-dbg-deadlock',
      title: 'Subordinate Deadlock When WVALID Arrives Before AWVALID',
      symptom: 'Bus hangs indefinitely after WVALID asserts 2 cycles ahead of AWVALID.',
      violatedRule: 'AXI4-Lite allows WVALID to assert before AWVALID; Subordinate must not require simultaneous arrival.',
      rootCause: 'Subordinate RTL used `assign AWREADY = AWVALID && WVALID; assign WREADY = AWVALID && WVALID;` while Manager waited for WREADY before advancing.',
      fix: 'Use independent `aw_seen` and `w_seen` flags so AWREADY and WREADY are independent of each other.',
      expectedWaveform: {
        id: 'exp-axil', name: 'Expected: W accepted independently of AW', category: 'Nominal', description: 'WREADY=1 accepts WDATA at cycle 1; AW accepted at cycle 3.', cycles: 6, clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
          { name: 'WVALID', type: 'bit', values: [0, 1, 0, 0, 0, 0] },
          { name: 'WREADY', type: 'bit', values: [1, 1, 0, 0, 0, 1] },
          { name: 'AWVALID', type: 'bit', values: [0, 0, 0, 1, 0, 0] },
          { name: 'AWREADY', type: 'bit', values: [1, 1, 1, 1, 0, 1] },
          { name: 'BVALID', type: 'bit', values: [0, 0, 0, 0, 1, 0] },
        ],
        annotations: [{ cycle: 4, label: 'BVALID completes cleanly', severity: 'info' }],
      },
      actualWaveform: {
        id: 'act-axil', name: 'Actual Bug: Both READY stuck at 0', category: 'Error', description: 'Manager waits on WREADY while Subordinate waits on AWVALID.', cycles: 6, clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
          { name: 'WVALID', type: 'bit', values: [0, 1, 1, 1, 1, 1] },
          { name: 'WREADY', type: 'bit', values: [0, 0, 0, 0, 0, 0] },
          { name: 'AWVALID', type: 'bit', values: [0, 0, 0, 0, 0, 0] },
          { name: 'AWREADY', type: 'bit', values: [0, 0, 0, 0, 0, 0] },
          { name: 'BVALID', type: 'bit', values: [0, 0, 0, 0, 0, 0] },
        ],
        annotations: [{ cycle: 3, label: 'DEADLOCK: WREADY=0 blocks Manager', severity: 'error' }],
      },
    },
  ],
  interviewQuestions: [
    {
      id: 'axil-iq-1',
      level: 'Beginner',
      question: 'Which signals present in AXI4 are removed in AXI4-Lite?',
      answer: 'AxLEN, AxSIZE, AxBURST, AxLOCK, AxCACHE, AxQOS, AxREGION, AxID, BID, RID, WLAST, RLAST, and all AxUSER/WUSER/BUSER/RUSER signals.',
      keyTakeaway: 'AXI4-Lite strips bursts, IDs, and caching—keeping only single-beat AW/W/B/AR/R with AxPROT.',
    },
    {
      id: 'axil-iq-2',
      level: 'Intermediate',
      question: 'When would you choose AXI4-Lite over APB for a register bank?',
      answer: 'Choose AXI4-Lite when the IP connects directly to an AXI interconnect without an APB bridge, needs separate read/write channels, or requires byte strobes and protection attributes cleanly compatible with AXI4.',
      keyTakeaway: 'APB saves wires behind a bridge; AXI4-Lite avoids protocol bridge latency on AXI fabrics.',
    },
  ],
  sources: [
    { title: 'AMBA AXI and ACE Protocol Specification (IHI 0022E)', authority: 'ARM Ltd.', reference: 'Section B1: AXI4-Lite' },
  ],
};
