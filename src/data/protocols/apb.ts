import { ProtocolDocument } from '../../types/protocol';

export const apbProtocol: ProtocolDocument = {
  id: 'apb',
  name: 'APB',
  fullName: 'AMBA Advanced Peripheral Bus (APB3 / APB4 / APB5)',
  categoryId: 'amba',
  standardBody: 'ARM Ltd.',
  specVersion: 'ARM IHI 0024C / IHI 0024E (AMBA APB Protocol Specification)',
  revision: 'Rev E / APB5 (ARM IHI 0024E, 2023)',
  officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0024/latest/',
  year: '2003–2023',
  tagline: 'Low-power, low-gate-count, non-pipelined peripheral bus for slow configuration registers and I/O blocks.',
  depth: 'Full Reference',
  popularityRank: 4,
  overview: {
    definition: 'APB is a simple, non-pipelined, synchronous bus interface optimized for minimal power consumption and minimal silicon area when accessing low-bandwidth peripheral registers.',
    whyDeveloped: 'High-speed system buses (AXI, AHB) consume excessive routing and flip-flop area if routed directly to dozens of slow peripherals like UART, I2C, timers, and watchdogs.',
    problemSolved: 'Isolates slow configuration peripherals behind an AXI-to-APB or AHB-to-APB bridge using a deterministic two-cycle Setup -> Access transfer protocol.',
    usedIn: [
      'UART, I2C, SPI, PWM, Timer, and GPIO register blocks',
      'PLL / Clock / Reset control register subsystems',
      'Debug APB (CoreSight) trace configuration fabrics',
    ],
    terminology: [
      { term: 'Requester (Master / Bridge)', meaning: 'Single bus requester (typically an AXI2APB or AHB2APB bridge) driving PSEL, PENABLE, PADDR, PWRITE.' },
      { term: 'Completer (Slave)', meaning: 'Peripheral block responding with PRDATA, PREADY (APB3+), and PSLVERR (APB3+).' },
      { term: 'Setup Phase', meaning: '1-cycle phase where PSELx=1 and PENABLE=0 to present address and write data.' },
      { term: 'Access Phase', meaning: 'Phase where PSELx=1 and PENABLE=1; completes on rising PCLK when PREADY=1.' },
    ],
    advantages: [
      'Minimal gate count and zero pipeline buffering required in peripherals.',
      'Zero dynamic power transitions during IDLE state.',
      'Trivial state machine (3 states: IDLE, SETUP, ACCESS) makes RTL and timing closure easy.',
    ],
    limitations: [
      'Minimum 2 clock cycles per transfer (50% max bus efficiency vs 100% on AXI/AHB).',
      'No bursts, no split transactions, no multiple masters, and no out-of-order execution.',
      'Reads and writes share a single PADDR channel (half-duplex).',
    ],
  },
  architecture: {
    summary: 'Single Requester (Bridge) drives shared PADDR, PWRITE, PWDATA, PPROT, and PSTRB lines to multiple Completers, with dedicated one-hot PSELx select signals per Completer.',
    clockAndReset: 'Rising-edge PCLK and active-LOW PRESETn. PSELx and PENABLE must be 0 during reset.',
    dataFlow: 'PWDATA carries write payload; PRDATA returns read payload during Access phase.',
    controlFlow: 'Deterministic 2-phase FSM: SETUP (PSEL=1, PENABLE=0) always transitions unconditionally to ACCESS (PSEL=1, PENABLE=1) on the next PCLK edge.',
    nodes: [
      { id: 'axi', label: 'AXI4 / AHB System Bus', role: 'manager', x: 30, y: 75, width: 165, height: 110 },
      { id: 'bridge', label: 'AXI-to-APB Bridge', role: 'interconnect', x: 245, y: 75, width: 170, height: 110 },
      { id: 'uart', label: 'APB Completer (UART / GPIO)', role: 'subordinate', x: 470, y: 75, width: 195, height: 110 },
    ],
    links: [
      { from: 'axi', to: 'bridge', label: 'AXI4-Lite / AHB' },
      { from: 'bridge', to: 'uart', label: 'PSEL, PENABLE, PADDR, PWDATA' },
      { from: 'uart', to: 'bridge', label: 'PRDATA, PREADY, PSLVERR' },
    ],
  },
  specifications: [
    { parameter: 'Minimum Transfer Latency', value: '2 PCLK cycles (1 Setup + >=1 Access)', classification: 'Official Standard Requirement', notes: 'Non-pipelined; next Setup cannot overlap current Access.' },
    { parameter: 'Data Bus Width (PWDATA / PRDATA)', value: '8, 16, or 32 bits (max 32 bits)', classification: 'Official Standard Requirement', notes: 'APB spec caps PWDATA/PRDATA at 32 bits.' },
    { parameter: 'Address Bus Width (PADDR)', value: 'Up to 32 bits', classification: 'Official Standard Requirement', notes: 'Shared between read and write transactions.' },
    { parameter: 'Wait States (PREADY)', value: '0 to N cycles (added in APB3)', classification: 'Official Standard Requirement', notes: 'Completer holds PREADY=0 during Access phase to insert wait states.' },
    { parameter: 'Byte Strobes & Protection', value: 'PSTRB[3:0], PPROT[2:0] (added in APB4)', classification: 'Official Standard Requirement', notes: 'During reads, Requester must drive all PSTRB bits LOW.' },
  ],
  versionDifferences: [
    { version: 'APB2 -> APB3', keyChanges: 'Added PREADY (wait-state insertion) and PSLVERR (error reporting).' },
    { version: 'APB3 -> APB4', keyChanges: 'Added PPROT[2:0] protection attributes and PSTRB[3:0] sparse byte write strobes.' },
    { version: 'APB4 -> APB5', keyChanges: 'Added PWAKEUP, User signals (PAUSER/PWUSER/PRUSER/PBUSER), and parity/RME security extensions.' },
  ],
  channels: ['APB Bus'],
  signals: [
    {
      name: 'PSELx', channel: 'APB Bus', width: '1 per peripheral', direction: 'Manager -> Subordinate', resetValue: '0', polarity: 'Active High',
      summary: 'One-hot peripheral select signal indicating Completer x is addressed.',
      timingRules: 'Asserted in SETUP phase and held HIGH throughout ACCESS phase until PREADY=1.',
      dependencies: ['PENABLE', 'PREADY'],
      legalConditions: 'At most one PSELx HIGH at any time.',
      illegalConditions: 'Two PSEL lines asserted simultaneously or dropping PSEL before PREADY=1.',
      rtlExample: 'wire apb_acc = PSEL && PENABLE && PREADY;',
      svaAssertion: 'assert property (@(posedge PCLK) disable iff (!PRESETn) ($onehot0(PSEL)));',
      uvmDriverNote: 'Driver asserts PSEL=1, PENABLE=0 for exactly 1 cycle.',
      commonBugs: ['Decoder asserting multiple PSEL bits on overlapping address maps.'],
      relatedInterviewQs: ['Why must PSELx be active for at least two cycles per transfer?'],
    },
    {
      name: 'PENABLE', channel: 'APB Bus', width: '1', direction: 'Manager -> Subordinate', resetValue: '0', polarity: 'Active High',
      summary: 'Distinguishes SETUP phase (0) from ACCESS phase (1).',
      timingRules: '0 during SETUP; rises to 1 on the next PCLK edge and stays 1 until PREADY=1.',
      dependencies: ['PSELx', 'PREADY'],
      legalConditions: 'PENABLE=1 implies PSELx=1.',
      illegalConditions: 'PENABLE=1 while PSEL=0, or PENABLE=1 on the very first cycle PSEL rises.',
      rtlExample: 'if (PSEL && !PENABLE) next_state = ACCESS;',
      svaAssertion: 'assert property (@(posedge PCLK) disable iff (!PRESETn) PENABLE |-> PSEL);',
      uvmDriverNote: 'Always wait 1 cycle in SETUP before asserting PENABLE=1.',
      commonBugs: ['Completer latching write data during SETUP (PSEL=1, PENABLE=0) instead of ACCESS, causing double-writes if wait states occur.'],
      relatedInterviewQs: ['What happens if an APB slave writes a register on PSEL without checking PENABLE?'],
    },
    {
      name: 'PREADY', channel: 'APB Bus', width: '1', direction: 'Subordinate -> Manager', resetValue: '1 (if tied)', polarity: 'Active High',
      summary: 'Completer handshake signal extending the ACCESS phase with wait states when LOW.',
      timingRules: 'Sampled only during ACCESS phase (PSEL && PENABLE). May be ignored during IDLE/SETUP.',
      dependencies: ['PSELx', 'PENABLE'],
      legalConditions: '0 for wait states, 1 to complete ACCESS on rising PCLK.',
      illegalConditions: 'Changing PADDR/PWDATA/PWRITE while PENABLE=1 and PREADY=0.',
      rtlExample: 'assign PREADY = (state == ACCESS) ? csr_ready : 1\'b1;',
      svaAssertion: 'assert property (@(posedge PCLK) disable iff (!PRESETn) (PSEL && PENABLE && !PREADY) |=> (PSEL && PENABLE && $stable({PADDR, PWRITE, PWDATA, PSTRB})));',
      uvmDriverNote: 'Responder injects 0–4 wait states on PREADY.',
      commonBugs: ['Bridge changing PADDR mid-wait-state while PREADY=0.'],
      relatedInterviewQs: ['Can PREADY be 0 during the SETUP phase?'],
    },
    {
      name: 'PSLVERR', channel: 'APB Bus', width: '1', direction: 'Subordinate -> Manager', resetValue: '0', polarity: 'Active High',
      summary: 'Indicates transfer failure during the final cycle of ACCESS phase.',
      timingRules: 'Valid ONLY when PSEL && PENABLE && PREADY are all HIGH.',
      dependencies: ['PSELx', 'PENABLE', 'PREADY'],
      legalConditions: 'Sampled only on completing cycle of ACCESS; ignored otherwise.',
      illegalConditions: 'Bridge treating PSLVERR=1 as valid while PREADY=0.',
      rtlExample: 'assign PSLVERR = PSEL && PENABLE && PREADY && invalid_addr;',
      svaAssertion: '// PSLVERR only sampled when (PSEL && PENABLE && PREADY)',
      uvmDriverNote: 'Monitor checks PSLVERR strictly on completing edge.',
      commonBugs: ['Flagging protocol error when PSLVERR toggles while PSEL=0.'],
      relatedInterviewQs: ['When is PSLVERR valid on an APB bus?'],
    },
    {
      name: 'PSTRB', channel: 'APB Bus', width: 'DATA_W / 8 (4)', direction: 'Manager -> Subordinate', resetValue: '0', polarity: 'Active High',
      summary: 'APB4 byte write enable strobes.',
      timingRules: 'Must be all 0s during read transfers (PWRITE=0).',
      dependencies: ['PWRITE', 'PWDATA'],
      legalConditions: '4\'b0000 during all reads; arbitrary mask during writes.',
      illegalConditions: 'Non-zero PSTRB while PWRITE=0.',
      rtlExample: 'if (PSEL && PENABLE && PREADY && PWRITE) ...',
      svaAssertion: 'assert property (@(posedge PCLK) disable iff (!PRESETn) (PSEL && !PWRITE) |-> (PSTRB == 4\'b0));',
      uvmDriverNote: 'Verify PSTRB=0 on reads via constraint.',
      commonBugs: ['Leaving stale PSTRB value from prior write during subsequent read transfer.'],
      relatedInterviewQs: ['What must PSTRB be driven to during an APB4 read transaction?'],
    },
  ],
  transactionFlow: {
    nominal: [
      { step: 1, phase: 'IDLE', title: 'Bus Idle', description: 'PSEL=0, PENABLE=0. Zero bus activity.', activeSignals: ['PSELx', 'PENABLE'] },
      { step: 2, phase: 'SETUP', title: '1-Cycle Setup Phase', description: 'Requester drives PSEL=1, PENABLE=0, PADDR, PWRITE, PWDATA/PSTRB for exactly 1 PCLK cycle.', activeSignals: ['PSELx', 'PADDR', 'PWRITE', 'PWDATA'] },
      { step: 3, phase: 'ACCESS', title: 'Access & Wait States', description: 'Requester asserts PENABLE=1 while holding PADDR/PWDATA stable. Completer extends via PREADY=0 or finishes with PREADY=1.', activeSignals: ['PSELx', 'PENABLE', 'PREADY', 'PRDATA', 'PSLVERR'] },
    ],
    errorAndOrdering: [
      'All APB transfers are strictly blocking and in-order.',
      'PSLVERR=1 on the final ACCESS cycle indicates an error (mapped to SLVERR on an AXI-to-APB bridge).',
    ],
  },
  waveforms: [
    {
      id: 'apb-wr-rd-wait',
      name: 'APB4 Write (Zero Wait) Followed by Read (2 Wait States)',
      category: 'Nominal',
      description: 'Write to 0x08 completes in 2 cycles (SETUP + ACCESS). Read from 0x0C stalls 2 cycles on PREADY=0 before returning PRDATA.',
      cycles: 9,
      clockName: 'PCLK',
      signals: [
        { name: 'PCLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0, 1, 0] },
        { name: 'PSEL', type: 'bit', values: [0, 1, 1, 1, 1, 1, 1, 0, 0] },
        { name: 'PENABLE', type: 'bit', values: [0, 0, 1, 0, 1, 1, 1, 0, 0] },
        { name: 'PWRITE', type: 'bit', values: [0, 1, 1, 0, 0, 0, 0, 0, 0] },
        { name: 'PADDR', type: 'bus', values: ['-', '08', '08', '0C', '0C', '0C', '0C', '-', '-'] },
        { name: 'PWDATA', type: 'bus', values: ['-', 'A5', 'A5', '-', '-', '-', '-', '-', '-'] },
        { name: 'PREADY', type: 'bit', values: [1, 1, 1, 1, 0, 0, 1, 1, 1] },
        { name: 'PRDATA', type: 'bus', values: ['-', '-', '-', '-', '-', '-', '5A', '-', '-'] },
      ],
      annotations: [
        { cycle: 1, label: 'Write SETUP phase (PSEL=1, PENABLE=0)', severity: 'info' },
        { cycle: 2, label: 'Write ACCESS completes (PREADY=1)', severity: 'info' },
        { cycle: 4, label: 'Read ACCESS stalled by PREADY=0', severity: 'warn' },
        { cycle: 6, label: 'PRDATA=0x5A sampled with PREADY=1', severity: 'info' },
      ],
    },
  ],
  rtl: {
    architectureNotes: 'APB completers typically require no state machine at all—a single combinational decode `apb_wr = PSEL && PENABLE && PWRITE && PREADY` drives register enables.',
    datapathNotes: 'PRDATA can be registered on SETUP phase (`PSEL && !PENABLE && !PWRITE`) so data is valid by ACCESS cycle with zero timing stress.',
    controlpathNotes: 'Bridge FSM strictly sequences IDLE -> SETUP -> ACCESS.',
    fsmStates: [
      { id: 'IDLE', label: 'IDLE', description: 'PSEL=0, PENABLE=0', x: 60, y: 80, isInitial: true },
      { id: 'SETUP', label: 'SETUP', description: 'PSEL=1, PENABLE=0 (1 cycle)', x: 260, y: 80 },
      { id: 'ACCESS', label: 'ACCESS', description: 'PSEL=1, PENABLE=1 until PREADY', x: 460, y: 80 },
    ],
    fsmTransitions: [
      { from: 'IDLE', to: 'SETUP', condition: 'req_valid' },
      { from: 'SETUP', to: 'ACCESS', condition: 'always (1 cycle)' },
      { from: 'ACCESS', to: 'SETUP', condition: 'PREADY && next_req' },
      { from: 'ACCESS', to: 'IDLE', condition: 'PREADY && !next_req' },
    ],
    codeTitle: 'apb4_reg_completer.sv',
    codeLanguage: 'SystemVerilog',
    codeSnippet: `module apb4_reg_completer (
  input  logic        PCLK,
  input  logic        PRESETn,
  input  logic        PSEL,
  input  logic        PENABLE,
  input  logic        PWRITE,
  input  logic [11:0] PADDR,
  input  logic [31:0] PWDATA,
  input  logic [3:0]  PSTRB,
  output logic [31:0] PRDATA,
  output logic        PREADY,
  output logic        PSLVERR
);
  logic [31:0] reg_ctrl, reg_cfg;
  wire wr_en = PSEL && PENABLE && PWRITE;
  wire rd_en = PSEL && !PENABLE && !PWRITE; // Pre-latch during SETUP

  assign PREADY  = 1'b1; // Zero-wait-state CSR
  assign PSLVERR = PSEL && PENABLE && (PADDR[11:4] != 8'h00);

  always_ff @(posedge PCLK or negedge PRESETn) begin
    if (!PRESETn) begin
      reg_ctrl <= 32'h0;
      reg_cfg  <= 32'h0000_0001;
      PRDATA   <= 32'h0;
    end else begin
      if (wr_en) begin
        case (PADDR[3:2])
          2'b00: for (int b=0; b<4; b++) if (PSTRB[b]) reg_ctrl[8*b +: 8] <= PWDATA[8*b +: 8];
          2'b01: for (int b=0; b<4; b++) if (PSTRB[b]) reg_cfg[8*b +: 8]  <= PWDATA[8*b +: 8];
          default: ;
        endcase
      end
      if (rd_en) begin
        case (PADDR[3:2])
          2'b00:   PRDATA <= reg_ctrl;
          2'b01:   PRDATA <= reg_cfg;
          default: PRDATA <= 32'h0;
        endcase
      end
    end
  end
endmodule`,
    commonMistakes: [
      'Triggering write on `PSEL && PWRITE` without `PENABLE`, causing writes during SETUP and multiple times during wait states.',
      'Not clearing PSTRB during reads on APB4 bridges.',
    ],
  },
  verification: {
    uvmArchitecture: 'Standard apb_agent with sequencer, driver implementing IDLE->SETUP->ACCESS transitions, and passive monitor sampling on (PSEL && PENABLE && PREADY).',
    driverStrategy: 'Drive back-to-back transfers (ACCESS -> SETUP directly) as well as IDLE-separated transfers.',
    monitorStrategy: 'Check SVA stability throughout SETUP and ACCESS, sample PRDATA/PSLVERR strictly when PREADY=1.',
    scoreboardStrategy: 'UVM RAL register predictor comparing read/write values and PSLVERR on illegal addresses.',
    coveragePoints: [
      'Back-to-back READ->WRITE, WRITE->READ with zero IDLE cycles.',
      'PREADY wait-state lengths (0, 1, 2, 5+ cycles).',
      'PSLVERR asserted on both read and write accesses.',
    ],
    cornerCases: [
      'PSEL asserted for 1 cycle and dropped without PENABLE (illegal SETUP abort).',
      'PSLVERR toggled during wait state before PREADY=1.',
    ],
    svaSnippet: `property p_apb_setup_to_access;
  @(posedge PCLK) disable iff (!PRESETn)
  (PSEL && !PENABLE) |=> (PSEL && PENABLE);
endproperty
assert property (p_apb_setup_to_access);`,
    uvmSnippet: `task apb_driver::drive_transfer(apb_seq_item tr);
  @(posedge vif.PCLK); // SETUP phase
  vif.PSEL    <= 1'b1;
  vif.PENABLE <= 1'b0;
  vif.PADDR   <= tr.addr;
  vif.PWRITE  <= tr.write;
  vif.PWDATA  <= tr.wdata;
  vif.PSTRB   <= tr.write ? tr.strb : 4'b0;
  @(posedge vif.PCLK); // ACCESS phase
  vif.PENABLE <= 1'b1;
  do @(posedge vif.PCLK); while (!vif.PREADY);
  if (!tr.write) tr.rdata = vif.PRDATA;
  tr.slverr = vif.PSLVERR;
  vif.PSEL    <= 1'b0;
  vif.PENABLE <= 1'b0;
endtask`,
  },
  debuggingLab: [
    {
      id: 'apb-dbg-setup-skip',
      title: 'Missing SETUP Phase (PENABLE Asserted Simultaneously with PSEL)',
      symptom: 'Peripheral ignores every first register write or reads wrong address.',
      violatedRule: 'ARM IHI 0024C: PENABLE must remain LOW during the 1-cycle SETUP phase when PSEL rises.',
      rootCause: 'Bridge FSM jumped directly from IDLE to ACCESS.',
      fix: 'Enforce IDLE -> SETUP (PSEL=1, PENABLE=0) -> ACCESS (PSEL=1, PENABLE=1).',
      expectedWaveform: {
        id: 'exp-apb', name: 'Expected: 1-Cycle SETUP precedes ACCESS', category: 'Nominal', description: 'PENABLE=0 at cycle 1, rises at cycle 2.', cycles: 5, clockName: 'PCLK',
        signals: [
          { name: 'PCLK', type: 'clock', values: [0, 1, 0, 1, 0] },
          { name: 'PSEL', type: 'bit', values: [0, 1, 1, 0, 0] },
          { name: 'PENABLE', type: 'bit', values: [0, 0, 1, 0, 0] },
          { name: 'PADDR', type: 'bus', values: ['-', '10', '10', '-', '-'] },
        ],
        annotations: [{ cycle: 1, label: 'SETUP phase', severity: 'info' }, { cycle: 2, label: 'ACCESS phase', severity: 'info' }],
      },
      actualWaveform: {
        id: 'act-apb', name: 'Actual Bug: PENABLE=1 on first PSEL cycle', category: 'Error', description: 'PSEL and PENABLE rise together at cycle 1.', cycles: 5, clockName: 'PCLK',
        signals: [
          { name: 'PCLK', type: 'clock', values: [0, 1, 0, 1, 0] },
          { name: 'PSEL', type: 'bit', values: [0, 1, 1, 0, 0] },
          { name: 'PENABLE', type: 'bit', values: [0, 1, 1, 0, 0] },
          { name: 'PADDR', type: 'bus', values: ['-', '10', '10', '-', '-'] },
        ],
        annotations: [{ cycle: 1, label: 'VIOLATION: Missing SETUP phase', severity: 'error' }],
      },
    },
  ],
  interviewQuestions: [
    {
      id: 'apb-iq-1',
      level: 'Beginner',
      question: 'Why does an APB transfer always take at least 2 clock cycles?',
      answer: 'Cycle 1 is the SETUP phase (PSEL=1, PENABLE=0) where address and control settle; Cycle 2 is the ACCESS phase (PSEL=1, PENABLE=1) where data is sampled when PREADY=1. This non-pipelined timing relaxes peripheral setup budgets.',
      keyTakeaway: '1 cycle SETUP + >=1 cycle ACCESS = minimum 2 cycles.',
    },
    {
      id: 'apb-iq-2',
      level: 'Intermediate',
      question: 'What is the difference between APB2, APB3, and APB4?',
      answer: 'APB2 had no wait states or error signals. APB3 added PREADY (wait states) and PSLVERR. APB4 added PSTRB (byte strobes) and PPROT (protection attributes).',
      keyTakeaway: 'APB3 = PREADY/PSLVERR; APB4 = PSTRB/PPROT.',
    },
  ],
  sources: [
    { title: 'AMBA APB Protocol Specification (IHI 0024C / IHI 0024E)', authority: 'ARM Ltd.', reference: 'Sections 2–3: Operating States & Signal Descriptions' },
  ],
};
