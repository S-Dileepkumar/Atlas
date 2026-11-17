import { ProtocolDocument } from '../../types/protocol';

export const axi4Protocol: ProtocolDocument = {
  id: 'axi4',
  name: 'AXI4',
  fullName: 'AMBA Advanced eXtensible Interface 4',
  categoryId: 'amba',
  standardBody: 'ARM Ltd.',
  specVersion: 'ARM IHI 0022E / IHI 0022H (AMBA AXI and ACE Protocol Specification)',
  revision: 'Rev H (ARM IHI 0022H, 2021)',
  officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0022/latest/',
  year: '2010 (Rev H 2021)',
  tagline: 'High-performance, five-channel memory-mapped SoC interconnect supporting out-of-order completion and burst transfers.',
  depth: 'Full Reference',
  popularityRank: 1,
  overview: {
    definition: 'AXI4 is a point-to-point, synchronous, memory-mapped on-chip communication protocol built on five independent VALID/READY handshake channels: Write Address (AW), Write Data (W), Write Response (B), Read Address (AR), and Read Data (R).',
    whyDeveloped: 'Earlier shared-bus protocols like AHB coupled address and data phases into a single multiplexed pipeline, limiting multi-master concurrency and pipelined latency hiding. AXI4 decouples address, data, and response channels so reads and writes proceed simultaneously and complete out of order across distinct IDs.',
    problemSolved: 'Eliminates head-of-line blocking across slow and fast memory targets, enables burst transfers of up to 256 beats from a single address phase, supports multiple outstanding transactions, and provides per-channel backpressure via VALID/READY.',
    usedIn: [
      'CPU-to-DRAM memory controller interfaces',
      'DMA engines and GPU/NPU accelerator fabrics',
      'High-throughput FPGA/ASIC crossbar interconnects',
      'PCIe Root Complex / Endpoint AXI bridges',
    ],
    terminology: [
      { term: 'Manager (Master)', meaning: 'Initiates read and write transactions by driving AW/W/AR channels and consuming B/R responses.' },
      { term: 'Subordinate (Slave)', meaning: 'Responds to requests from a Manager, returning RDATA/RRESP or BRESP.' },
      { term: 'Interconnect / Crossbar', meaning: 'Routes transactions between multiple Managers and Subordinates using address decoding and ID width expansion.' },
      { term: 'Beat', meaning: 'A single data transfer occurring on a clock cycle when both VALID and READY are sampled HIGH.' },
      { term: 'Burst', meaning: 'A sequence of 1 to 256 data beats initiated by a single address channel handshake.' },
    ],
    advantages: [
      'Separate read and write channels enable full-duplex concurrent data movement.',
      'Independent channel handshakes allow arbitrary pipeline register slicing for timing closure.',
      'Out-of-order transaction completion via AWID/ARID avoids stalls behind slow peripherals.',
      'Burst lengths up to 256 beats amortize address phase overhead.',
    ],
    limitations: [
      'Higher gate count and routing wire overhead (~100+ signals per full interface) compared to AHB or APB.',
      'Write interleaving across different WIDs was removed in AXI4 (present in AXI3) to simplify crossbar buffering.',
      'Requires strict deadlock-avoidance discipline on VALID/READY dependencies.',
    ],
  },
  architecture: {
    summary: 'AXI4 separates read and write transactions across five unidirectional channels. Address and control information flows from Manager to Subordinate on AW and AR; write data flows forward on W with a trailing B response; read data returns on R.',
    clockAndReset: 'Single synchronous rising-edge clock (ACLK) with active-LOW asynchronous-assert, synchronous-deassert reset (ARESETn). During ARESETn=0, Managers must drive AWVALID, WVALID, ARVALID LOW, and Subordinates must drive BVALID, RVALID LOW.',
    dataFlow: 'Write data moves Manager -> Subordinate on WDATA qualified by WSTRB byte enables and terminated by WLAST. Read data moves Subordinate -> Manager on RDATA terminated by RLAST.',
    controlFlow: 'Every channel uses a two-way VALID/READY handshake. Source asserts VALID with stable payload; destination asserts READY when capable of accepting. Transfer occurs on the rising edge of ACLK where VALID && READY == 1.',
    nodes: [
      { id: 'mgr', label: 'AXI4 Manager (CPU / DMA)', role: 'manager', x: 30, y: 70, width: 170, height: 120 },
      { id: 'ic', label: 'AXI4 Crossbar / Interconnect', role: 'interconnect', x: 270, y: 55, width: 190, height: 150 },
      { id: 'sub', label: 'AXI4 Subordinate (DDR / SRAM)', role: 'memory', x: 530, y: 70, width: 180, height: 120 },
    ],
    links: [
      { from: 'mgr', to: 'ic', label: 'AW / W / AR (Req)' },
      { from: 'ic', to: 'mgr', label: 'B / R (Resp)' },
      { from: 'ic', to: 'sub', label: 'AW / W / AR (Routed)' },
      { from: 'sub', to: 'ic', label: 'B / R (Return)' },
    ],
  },
  specifications: [
    { parameter: 'Data Bus Width (WDATA / RDATA)', value: '32, 64, 128, 256, 512, or 1024 bits', classification: 'Configurable Parameter', notes: 'Must be an integer power of 2 between 8 and 1024 bits (32-1024 typical for AXI4).' },
    { parameter: 'Address Width (AWADDR / ARADDR)', value: 'Configurable (typically 32 to 64 bits)', classification: 'Configurable Parameter', notes: 'Byte-addressed; unaligned start addresses supported via WSTRB and AxSIZE.' },
    { parameter: 'Maximum Burst Length (AxLEN)', value: '256 beats (INCR), 16 beats (FIXED / WRAP)', classification: 'Official Standard Requirement', notes: 'Number of transfers = AxLEN[7:0] + 1. WRAP bursts restricted to lengths 2, 4, 8, or 16.' },
    { parameter: '4KB Boundary Crossing Rule', value: 'Burst must not cross a 4KB address boundary', classification: 'Official Standard Requirement', notes: 'Prevents a single burst from spanning two distinct subordinate address regions.' },
    { parameter: 'Handshake Protocol', value: 'Two-way VALID / READY per channel', classification: 'Official Standard Requirement', notes: 'Source must not wait for READY before asserting VALID. Payload must stay stable once VALID=1 until READY=1.' },
    { parameter: 'Write Data Interleaving', value: 'Not supported in AXI4', classification: 'Official Standard Requirement', notes: 'Removed from AXI3; write data must follow AW issue order (WID signal removed).' },
    { parameter: 'Outstanding Transactions', value: 'Implementation-defined (typically 4–64)', classification: 'Implementation Practice', notes: 'Tracked via AWID/ARID/BID/RID; same-ID transactions must complete in order.' },
    { parameter: 'Reset Behavior (ARESETn)', value: 'Active-LOW; VALID signals forced to 0', classification: 'Official Standard Requirement', notes: 'Asserted asynchronously or synchronously; deasserted synchronously with ACLK.' },
  ],
  versionDifferences: [
    { version: 'AXI3 -> AXI4', keyChanges: 'AxLEN widened from 4-bit (16 beats) to 8-bit (256 beats for INCR); WID removed (no write interleaving); AxQOS and AxREGION added; AxLOCK reduced from 2-bit to 1-bit (exclusive only, locked removed); USER signals standardized.' },
    { version: 'AXI4 -> AXI5', keyChanges: 'Added Atomic transactions, Checksum/Parity protection, Wakeup signals (AWAKEUP), Trace/MPAM tags, and Unaligned/Clean-Invalid extensions.' },
  ],
  channels: ['Global', 'Write Address (AW)', 'Write Data (W)', 'Write Response (B)', 'Read Address (AR)', 'Read Data (R)'],
  signals: [
    {
      name: 'ACLK',
      channel: 'Global',
      width: '1',
      direction: 'System / Global',
      resetValue: 'N/A',
      polarity: 'Edge / Differential',
      summary: 'Global synchronous bus clock. All signals are sampled on the rising edge of ACLK.',
      timingRules: 'All inputs must meet setup and hold times relative to ACLK rising edge.',
      dependencies: ['ARESETn'],
      legalConditions: 'Free-running or gated only when no active transactions or wakeup requirements exist.',
      illegalConditions: 'Glitches or duty-cycle violations violating STA timing constraints.',
      rtlExample: 'always_ff @(posedge ACLK or negedge ARESETn) begin ... end',
      svaAssertion: '// Clock stability verified by formal/clocking block definitions',
      uvmDriverNote: 'Driver synchronizes all pin drives and samples to @(posedge vif.ACLK).',
      commonBugs: ['Driving combinational paths directly off ACLK without flopping outputs.', 'Sampling signals on negedge instead of posedge.'],
      relatedInterviewQs: ['Can AXI4 operate with asynchronous clocks between Manager and Subordinate?'],
    },
    {
      name: 'ARESETn',
      channel: 'Global',
      width: '1',
      direction: 'System / Global',
      resetValue: '0 during reset',
      polarity: 'Active Low',
      summary: 'Active-LOW global reset signal.',
      timingRules: 'May be asserted asynchronously, but MUST be deasserted synchronously with ACLK rising edge.',
      dependencies: ['AWVALID', 'WVALID', 'BVALID', 'ARVALID', 'RVALID'],
      legalConditions: 'Held LOW for at least 16 clock cycles on power-up in typical SoCs; VALID outputs driven LOW.',
      illegalConditions: 'Asserting VALID=1 on the first cycle while ARESETn is still LOW.',
      rtlExample: 'if (!ARESETn) begin awvalid <= 1\'b0; wvalid <= 1\'b0; arvalid <= 1\'b0; end',
      svaAssertion: 'property p_reset_valid_low;\n  @(posedge ACLK) !ARESETn |-> (!AWVALID && !WVALID && !ARVALID && !BVALID && !RVALID);\nendproperty\nassert property (p_reset_valid_low);',
      uvmDriverNote: 'Driver enters idle state during !ARESETn and clears internal outstanding queues.',
      commonBugs: ['Asserting AWVALID on the exact cycle ARESETn=0 due to missing reset branch.', 'Asynchronous deassertion causing metastability across FSM flops.'],
      relatedInterviewQs: ['Why must ARESETn be deasserted synchronously?'],
    },
    {
      name: 'AWVALID',
      channel: 'Write Address (AW)',
      width: '1',
      direction: 'Manager -> Subordinate',
      resetValue: '0',
      polarity: 'Active High',
      summary: 'Indicates that valid write address and control information (AWADDR, AWLEN, AWSIZE, AWBURST, AWID) is driven on the AW channel.',
      timingRules: 'Manager MUST NOT wait for AWREADY before asserting AWVALID. Once asserted, AWVALID must remain HIGH until the rising ACLK edge where AWREADY is HIGH.',
      dependencies: ['AWREADY', 'AWADDR', 'AWLEN', 'AWSIZE', 'AWBURST'],
      legalConditions: 'Asserted independently of AWREADY; held stable until (AWVALID && AWREADY) handshake completes.',
      illegalConditions: 'Deasserting AWVALID when AWREADY=0, or waiting on AWREADY==1 before asserting AWVALID (causes deadlock).',
      rtlExample: 'always_ff @(posedge ACLK or negedge ARESETn) begin\n  if (!ARESETn) awvalid <= 1\'b0;\n  else if (start_wr && !awvalid) awvalid <= 1\'b1;\n  else if (awvalid && AWREADY) awvalid <= 1\'b0;\nend',
      svaAssertion: 'property p_awvalid_stable;\n  @(posedge ACLK) disable iff (!ARESETn)\n  (AWVALID && !AWREADY) |=> AWVALID;\nendproperty\nassert property (p_awvalid_stable);',
      uvmDriverNote: 'UVM driver asserts AWVALID with randomized address/burst attributes and polls @(posedge ACLK iff vif.AWREADY) before dropping AWVALID.',
      commonBugs: ['Combinational dependency on AWREADY (if (AWREADY) AWVALID = 1) causing zero-cycle deadlock.', 'Dropping AWVALID after 1 cycle regardless of AWREADY stall.'],
      relatedInterviewQs: ['Why is Manager forbidden from waiting on AWREADY before asserting AWVALID?'],
    },
    {
      name: 'AWREADY',
      channel: 'Write Address (AW)',
      width: '1',
      direction: 'Subordinate -> Manager',
      resetValue: 'Implementation-defined (0 or 1)',
      polarity: 'Active High',
      summary: 'Indicates the Subordinate is ready to accept a write address and associated control signals.',
      timingRules: 'Subordinate MAY wait for AWVALID before asserting AWREADY, or may assert AWREADY by default (ready-before-valid).',
      dependencies: ['AWVALID'],
      legalConditions: 'May toggle freely while AWVALID=0; once AWVALID && AWREADY=1, address is accepted on that rising clock edge.',
      illegalConditions: 'Creating a combinational path from AWVALID to AWREADY AND from AWREADY back to AWVALID (combinational loop).',
      rtlExample: 'assign AWREADY = !addr_fifo_full;',
      svaAssertion: '// Monitor coverage: observe both ready-before-valid and valid-before-ready\ncover property (@(posedge ACLK) disable iff (!ARESETn) AWVALID && !AWREADY ##[1:4] AWREADY);',
      uvmDriverNote: 'Subordinate UVM responder drives randomized AWREADY wait states (0 to N cycles) to stress Manager backpressure.',
      commonBugs: ['Driving AWREADY permanently LOW when internal write buffer misses a pop condition.', 'Combinational feedthrough causing STA loop with Manager.'],
      relatedInterviewQs: ['Can AWREADY depend on AWVALID? What is the opposite rule for AWVALID?'],
    },
    {
      name: 'AWADDR',
      channel: 'Write Address (AW)',
      width: 'Configurable (e.g. 32 or 64)',
      direction: 'Manager -> Subordinate',
      resetValue: 'Undefined when AWVALID=0',
      polarity: 'Data / Multi-bit',
      summary: 'Start byte address of the first transfer in the write burst.',
      timingRules: 'Must remain completely stable from the cycle AWVALID rises until AWVALID && AWREADY handshake occurs.',
      dependencies: ['AWVALID', 'AWREADY', 'AWLEN', 'AWSIZE', 'AWBURST'],
      legalConditions: 'Must not cause burst to cross a 4KB boundary. For WRAP bursts, must be aligned to transfer size (2^AWSIZE bytes).',
      illegalConditions: 'Changing AWADDR while AWVALID=1 and AWREADY=0, or crossing a 4KB address boundary within a single burst.',
      rtlExample: 'always_ff @(posedge ACLK) begin\n  if (AWVALID && AWREADY) lat_awaddr <= AWADDR;\nend',
      svaAssertion: 'property p_awaddr_stable;\n  @(posedge ACLK) disable iff (!ARESETn)\n  (AWVALID && !AWREADY) |=> $stable(AWADDR);\nendproperty\nassert property (p_awaddr_stable);',
      uvmDriverNote: 'Constrained-random seq_item enforces 4KB boundary constraint: (addr[11:0] + ((len+1) << size)) <= 4096.',
      commonBugs: ['Updating next-transaction AWADDR prematurely while current AWVALID is stalled.', 'Generating WRAP bursts with unaligned AWADDR.'],
      relatedInterviewQs: ['How do you calculate whether an AXI4 burst crosses a 4KB boundary?'],
    },
    {
      name: 'AWLEN',
      channel: 'Write Address (AW)',
      width: '8',
      direction: 'Manager -> Subordinate',
      resetValue: 'Undefined when AWVALID=0',
      polarity: 'Data / Multi-bit',
      summary: 'Specifies exact number of data transfers (beats) in a write burst: Beats = AWLEN + 1.',
      timingRules: 'Must remain stable while AWVALID=1 and AWREADY=0.',
      dependencies: ['AWBURST', 'WLAST'],
      legalConditions: '0..255 for INCR; 0..15 for FIXED; 1, 3, 7, or 15 (2, 4, 8, 16 beats) for WRAP.',
      illegalConditions: 'AWLEN > 15 for FIXED or WRAP bursts, or mismatch between (AWLEN+1) and WLAST beat count.',
      rtlExample: 'logic [7:0] beat_cnt;\n// Increment on (WVALID && WREADY), expect WLAST when beat_cnt == lat_awlen',
      svaAssertion: 'property p_awlen_wrap_valid;\n  @(posedge ACLK) disable iff (!ARESETn)\n  (AWVALID && AWBURST == 2\'b10) |-> (AWLEN inside {8\'d1, 8\'d3, 8\'d7, 8\'d15});\nendproperty',
      uvmDriverNote: 'Driver sends exactly (item.awlen + 1) W-channel beats and drives WLAST=1 solely on the final beat.',
      commonBugs: ['Off-by-one error: sending AWLEN beats instead of AWLEN+1 beats.', 'Using AWLEN=255 with WRAP burst type.'],
      relatedInterviewQs: ['Why are WRAP bursts restricted to 2, 4, 8, or 16 beats?'],
    },
    {
      name: 'WVALID',
      channel: 'Write Data (W)',
      width: '1',
      direction: 'Manager -> Subordinate',
      resetValue: '0',
      polarity: 'Active High',
      summary: 'Indicates valid write data (WDATA), byte strobes (WSTRB), and WLAST are present on the W channel.',
      timingRules: 'Must stay HIGH until WREADY is sampled HIGH. Can be asserted before, concurrently with, or after AWVALID.',
      dependencies: ['WREADY', 'WDATA', 'WSTRB', 'WLAST'],
      legalConditions: 'Early write data (WVALID before AWVALID) is legal in AXI4, provided Subordinate accepts or backpressures cleanly.',
      illegalConditions: 'Deasserting WVALID prior to WREADY=1.',
      rtlExample: 'if (WVALID && WREADY) beat_cnt <= WLAST ? 8\'d0 : beat_cnt + 1\'b1;',
      svaAssertion: 'property p_wvalid_stable;\n  @(posedge ACLK) disable iff (!ARESETn) (WVALID && !WREADY) |=> WVALID;\nendproperty',
      uvmDriverNote: 'Write data thread can run concurrently with AW thread or staggered depending on test scenario.',
      commonBugs: ['Subordinate deadlocking when WVALID arrives before AWVALID.', 'Deasserting WVALID mid-burst stall.'],
      relatedInterviewQs: ['Is it legal in AXI4 for WVALID to assert before AWVALID?'],
    },
    {
      name: 'WREADY',
      channel: 'Write Data (W)',
      width: '1',
      direction: 'Subordinate -> Manager',
      resetValue: 'Implementation-defined',
      polarity: 'Active High',
      summary: 'Indicates the Subordinate can accept write data on the current clock cycle.',
      timingRules: 'Subordinate MAY wait for both AWVALID and WVALID before asserting WREADY (unlike AWVALID/WVALID).',
      dependencies: ['WVALID', 'AWVALID'],
      legalConditions: 'Can be driven low during write FIFO full or while waiting for address decode.',
      illegalConditions: 'None on valid-wait, provided it does not create a cyclic stall if Manager waits for WREADY.',
      rtlExample: 'assign WREADY = !wdata_fifo_full && aw_accepted;',
      svaAssertion: '// Ensure write response BVALID never precedes final WLAST handshake',
      uvmDriverNote: 'Subordinate BFM tests both zero-wait-state WREADY=1 and random backpressure.',
      commonBugs: ['Asserting WREADY=1 before capturing AWADDR and dropping data.', 'Never asserting WREADY if AW arrived after W.'],
      relatedInterviewQs: ['Can Subordinate wait for AWVALID before asserting WREADY?'],
    },
    {
      name: 'WLAST',
      channel: 'Write Data (W)',
      width: '1',
      direction: 'Manager -> Subordinate',
      resetValue: '0',
      polarity: 'Active High',
      summary: 'Marks the final beat of a write burst.',
      timingRules: 'Must be 1 on beat index == AWLEN, and 0 on all earlier beats. Must stay stable while WVALID && !WREADY.',
      dependencies: ['WVALID', 'WREADY', 'AWLEN'],
      legalConditions: 'WLAST=1 on single-beat burst (AWLEN=0).',
      illegalConditions: 'WLAST=1 early (before AWLEN+1 beats) or missing WLAST on final beat.',
      rtlExample: 'assign WLAST = (beat_cnt == lat_awlen);',
      svaAssertion: 'property p_wlast_stable;\n  @(posedge ACLK) disable iff (!ARESETn) (WVALID && !WREADY) |=> $stable(WLAST);\nendproperty',
      uvmDriverNote: 'Driver sets WLAST = (i == item.awlen) inside the beat loop.',
      commonBugs: ['Leaving WLAST stuck HIGH after a single-beat write into the next multi-beat burst.'],
      relatedInterviewQs: ['What happens if WLAST arrives early or late relative to AWLEN?'],
    },
    {
      name: 'BVALID',
      channel: 'Write Response (B)',
      width: '1',
      direction: 'Subordinate -> Manager',
      resetValue: '0',
      polarity: 'Active High',
      summary: 'Indicates the Subordinate has a valid write completion status (BRESP, BID) on the B channel.',
      timingRules: 'Subordinate MUST NOT assert BVALID until BOTH AW handshake AND the final WLAST handshake have completed.',
      dependencies: ['BREADY', 'WLAST', 'AWVALID', 'AWREADY'],
      legalConditions: 'Asserted at least 1 cycle after (WVALID && WREADY && WLAST) and (AWVALID && AWREADY).',
      illegalConditions: 'Asserting BVALID before WLAST handshake completes.',
      rtlExample: 'always_ff @(posedge ACLK or negedge ARESETn) begin\n  if (!ARESETn) bvalid <= 1\'b0;\n  else if (wr_complete) bvalid <= 1\'b1;\n  else if (bvalid && BREADY) bvalid <= 1\'b0;\nend',
      svaAssertion: 'property p_bvalid_stable;\n  @(posedge ACLK) disable iff (!ARESETn) (BVALID && !BREADY) |=> BVALID;\nendproperty',
      uvmDriverNote: 'Manager UVM driver drives BREADY independently (often with random wait states).',
      commonBugs: ['Asserting BVALID immediately after AW handshake before WLAST arrives.'],
      relatedInterviewQs: ['Why must BVALID wait for WLAST rather than AWVALID?'],
    },
    {
      name: 'BREADY',
      channel: 'Write Response (B)',
      width: '1',
      direction: 'Manager -> Subordinate',
      resetValue: 'Implementation-defined',
      polarity: 'Active High',
      summary: 'Indicates the Manager is ready to accept the write response.',
      timingRules: 'Manager MAY wait for BVALID before asserting BREADY.',
      dependencies: ['BVALID'],
      legalConditions: 'Can be tied HIGH if Manager always absorbs write responses in 1 cycle.',
      illegalConditions: 'Holding BREADY permanently LOW while Subordinate blocks further writes.',
      rtlExample: 'assign BREADY = 1\'b1; // Or controlled by outstanding scoreboard FIFO',
      svaAssertion: '// Check BVALID handshake resolves within bounded watchdog cycles',
      uvmDriverNote: 'Randomized BREADY tests Subordinate response holding register.',
      commonBugs: ['Manager ignoring BVALID and initiating overlapping writes with same ID without tracking BRESP.'],
      relatedInterviewQs: ['Can a Manager tie BREADY to 1? When is that dangerous?'],
    },
    {
      name: 'ARVALID',
      channel: 'Read Address (AR)',
      width: '1',
      direction: 'Manager -> Subordinate',
      resetValue: '0',
      polarity: 'Active High',
      summary: 'Indicates valid read address and burst attributes are driven on AR channel.',
      timingRules: 'Manager MUST NOT wait for ARREADY before asserting ARVALID. Held HIGH until ARREADY=1.',
      dependencies: ['ARREADY', 'ARADDR', 'ARLEN', 'ARSIZE', 'ARBURST'],
      legalConditions: 'Pipelined read requests can be issued back-to-back across consecutive cycles.',
      illegalConditions: 'Dropping ARVALID while ARREADY=0.',
      rtlExample: 'if (ARVALID && ARREADY) begin rd_pending <= rd_pending + 1\'b1; end',
      svaAssertion: 'property p_arvalid_stable;\n  @(posedge ACLK) disable iff (!ARESETn) (ARVALID && !ARREADY) |=> ARVALID;\nendproperty',
      uvmDriverNote: 'Constrained-random reads track ARID in scoreboard FIFO.',
      commonBugs: ['Reusing an ARID before prior read completes when out-of-order responses are expected.'],
      relatedInterviewQs: ['How does ARID enable out-of-order read responses?'],
    },
    {
      name: 'RVALID',
      channel: 'Read Data (R)',
      width: '1',
      direction: 'Subordinate -> Manager',
      resetValue: '0',
      polarity: 'Active High',
      summary: 'Indicates valid read data (RDATA), status (RRESP), RID, and RLAST on the R channel.',
      timingRules: 'Subordinate MUST NOT assert RVALID until the corresponding AR handshake has completed. Must remain HIGH until RREADY=1.',
      dependencies: ['RREADY', 'ARVALID', 'ARREADY', 'RLAST'],
      legalConditions: 'Read data interleaving across distinct RIDs IS permitted in AXI4 (unlike write data).',
      illegalConditions: 'Asserting RVALID before ARVALID && ARREADY handshake, or changing RDATA during RREADY=0.',
      rtlExample: 'if (RVALID && RREADY && RLAST) rd_pending <= rd_pending - 1\'b1;',
      svaAssertion: 'property p_rdata_stable;\n  @(posedge ACLK) disable iff (!ARESETn) (RVALID && !RREADY) |=> $stable({RDATA, RRESP, RLAST, RID});\nendproperty',
      uvmDriverNote: 'Monitor samples RDATA on (RVALID && RREADY) and matches RID to outstanding AR queue.',
      commonBugs: ['Returning RVALID on the same combinational cycle as ARVALID (zero-cycle read violation).', 'Forgetting RLAST on single-beat read.'],
      relatedInterviewQs: ['Can RVALID assert in the same clock cycle as ARVALID?'],
    },
    {
      name: 'RREADY',
      channel: 'Read Data (R)',
      width: '1',
      direction: 'Manager -> Subordinate',
      resetValue: 'Implementation-defined',
      polarity: 'Active High',
      summary: 'Indicates the Manager can accept read data and response.',
      timingRules: 'Manager MAY wait for RVALID before asserting RREADY.',
      dependencies: ['RVALID'],
      legalConditions: 'Deasserted during Manager RX buffer backpressure.',
      illegalConditions: 'Holding RREADY LOW indefinitely causing head-of-line Subordinate stall.',
      rtlExample: 'assign RREADY = !rx_fifo_full;',
      svaAssertion: '// Watchdog: RVALID && !RREADY bounded within timeout',
      uvmDriverNote: 'Randomize RREADY stalls mid-burst to verify Subordinate RDATA stability.',
      commonBugs: ['Subordinate advancing read FIFO pointer on RVALID alone instead of (RVALID && RREADY), dropping beats during backpressure.'],
      relatedInterviewQs: ['What happens if Subordinate increments its read pointer without checking RREADY?'],
    },
  ],
  transactionFlow: {
    nominal: [
      { step: 1, phase: 'Initiation', title: 'Manager Request Generation', description: 'Manager prepares target byte address, burst length (AxLEN), beat size (AxSIZE), burst mode (FIXED/INCR/WRAP), and transaction ID.', activeSignals: ['AWADDR', 'AWLEN', 'AWSIZE', 'AWBURST', 'AWID'] },
      { step: 2, phase: 'Address Phase', title: 'AW / AR Channel Handshake', description: 'Manager asserts AWVALID (or ARVALID) without waiting for READY. Subordinate samples address on the rising edge where VALID && READY == 1.', activeSignals: ['AWVALID', 'AWREADY', 'ARVALID', 'ARREADY'] },
      { step: 3, phase: 'Data Phase', title: 'Burst Beat Transfers (W / R)', description: 'Each beat transfers when WVALID && WREADY (or RVALID && RREADY). WSTRB selects active byte lanes; WLAST/RLAST marks the final beat.', activeSignals: ['WVALID', 'WREADY', 'WDATA', 'WSTRB', 'WLAST', 'RVALID', 'RREADY', 'RLAST'] },
      { step: 4, phase: 'Response Phase', title: 'Write Completion (B Channel)', description: 'After both AW handshake and WLAST beat complete, Subordinate asserts BVALID with BRESP (OKAY/EXOKAY/SLVERR/DECERR) and matching BID.', activeSignals: ['BVALID', 'BREADY', 'BRESP', 'BID'] },
      { step: 5, phase: 'Completion', title: 'Scoreboard & ID Retirement', description: 'Manager accepts BVALID (or final RLAST beat) and retires the transaction ID, freeing the slot for future bursts.', activeSignals: ['BVALID', 'BREADY', 'RVALID', 'RREADY', 'RLAST'] },
    ],
    errorAndOrdering: [
      'SLVERR (2\'b10): Subordinate reached successfully, but operation failed (e.g., write to read-only register, FIFO overflow).',
      'DECERR (2\'b11): Interconnect decode error — no subordinate mapped at target address.',
      'Important: Even when an error occurs mid-burst, AXI4 requires ALL remaining beats of the burst to complete with WLAST/RLAST before ending.',
      'Ordering: Transactions with the SAME AxID must complete in issue order; transactions with DIFFERENT AxIDs may complete out of order.',
    ],
  },
  waveforms: [
    {
      id: 'axi4-write-burst',
      name: '4-Beat Write Burst with Backpressure',
      category: 'Burst',
      description: 'Manager issues AWLEN=3 (4 beats) write burst to 0x1000. Subordinate stalls beat 2 with WREADY=0, then returns BRESP=OKAY after WLAST.',
      cycles: 12,
      clockName: 'ACLK',
      signals: [
        { name: 'ACLK', type: 'clock', channel: 'Global', values: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'AWVALID', type: 'bit', channel: 'AW', values: [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { name: 'AWREADY', type: 'bit', channel: 'AW', values: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: 'AWADDR', type: 'bus', channel: 'AW', values: ['-', '1000', '1000', '-', '-', '-', '-', '-', '-', '-', '-', '-'] },
        { name: 'AWLEN', type: 'bus', channel: 'AW', values: ['-', '03', '03', '-', '-', '-', '-', '-', '-', '-', '-', '-'] },
        { name: 'WVALID', type: 'bit', channel: 'W', values: [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0] },
        { name: 'WREADY', type: 'bit', channel: 'W', values: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1] },
        { name: 'WDATA', type: 'bus', channel: 'W', values: ['-', '-', '-', 'D0', 'D1', 'D1', 'D2', 'D3', '-', '-', '-', '-'] },
        { name: 'WLAST', type: 'bit', channel: 'W', values: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
        { name: 'BVALID', type: 'bit', channel: 'B', values: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0] },
        { name: 'BREADY', type: 'bit', channel: 'B', values: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
        { name: 'BRESP', type: 'bus', channel: 'B', values: ['-', '-', '-', '-', '-', '-', '-', '-', 'OK', 'OK', '-', '-'] },
      ],
      annotations: [
        { cycle: 2, label: 'AW handshake: AWVALID & AWREADY', severity: 'info' },
        { cycle: 4, label: 'WREADY=0 stalls Beat 1 (D1 held stable)', severity: 'warn' },
        { cycle: 7, label: 'Final Beat D3 with WLAST=1 accepted', severity: 'info' },
        { cycle: 9, label: 'BRESP=OKAY accepted by Manager', severity: 'info' },
      ],
    },
    {
      id: 'axi4-read-burst',
      name: '4-Beat Read Burst (R Channel Stall)',
      category: 'Nominal',
      description: 'Manager issues ARADDR=0x2000, ARLEN=3. Subordinate returns RDATA D0..D3 with RREADY backpressure at cycle 6.',
      cycles: 12,
      clockName: 'ACLK',
      signals: [
        { name: 'ACLK', type: 'clock', channel: 'Global', values: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'ARVALID', type: 'bit', channel: 'AR', values: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { name: 'ARREADY', type: 'bit', channel: 'AR', values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: 'ARADDR', type: 'bus', channel: 'AR', values: ['-', '2000', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'] },
        { name: 'RVALID', type: 'bit', channel: 'R', values: [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0] },
        { name: 'RREADY', type: 'bit', channel: 'R', values: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1] },
        { name: 'RDATA', type: 'bus', channel: 'R', values: ['-', '-', '-', 'Q0', 'Q1', 'Q2', 'Q2', 'Q3', '-', '-', '-', '-'] },
        { name: 'RLAST', type: 'bit', channel: 'R', values: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
        { name: 'RRESP', type: 'bus', channel: 'R', values: ['-', '-', '-', 'OK', 'OK', 'OK', 'OK', 'OK', '-', '-', '-', '-'] },
      ],
      annotations: [
        { cycle: 1, label: 'AR handshake completes immediately', severity: 'info' },
        { cycle: 5, label: 'Manager pulls RREADY=0; Q2 held stable', severity: 'warn' },
        { cycle: 7, label: 'RLAST=1 completes read burst', severity: 'info' },
      ],
    },
    {
      id: 'axi4-slverr',
      name: 'Decode / Subordinate Error Response (DECERR)',
      category: 'Error',
      description: 'Write burst to unmapped address 0xDEAD0000 receives DECERR (2\'b11) on BRESP after all W beats finish.',
      cycles: 10,
      clockName: 'ACLK',
      signals: [
        { name: 'ACLK', type: 'clock', channel: 'Global', values: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'AWVALID', type: 'bit', channel: 'AW', values: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0] },
        { name: 'AWREADY', type: 'bit', channel: 'AW', values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: 'AWADDR', type: 'bus', channel: 'AW', values: ['-', 'DEAD', '-', '-', '-', '-', '-', '-', '-', '-'] },
        { name: 'WVALID', type: 'bit', channel: 'W', values: [0, 0, 1, 1, 0, 0, 0, 0, 0, 0] },
        { name: 'WREADY', type: 'bit', channel: 'W', values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: 'WLAST', type: 'bit', channel: 'W', values: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0] },
        { name: 'BVALID', type: 'bit', channel: 'B', values: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
        { name: 'BREADY', type: 'bit', channel: 'B', values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
        { name: 'BRESP', type: 'bus', channel: 'B', values: ['-', '-', '-', '-', '-', 'DECERR', '-', '-', '-', '-'] },
      ],
      annotations: [
        { cycle: 3, label: 'All W beats still finish despite bad address', severity: 'info' },
        { cycle: 5, label: 'BRESP returns DECERR (2\'b11)', severity: 'error' },
      ],
    },
  ],
  rtl: {
    architectureNotes: 'A compliant AXI4 Subordinate decouples AW/W/B and AR/R paths using skid buffers (2-entry ping-pong registers) so READY never forms a combinational path from upstream VALID while sustaining 100% throughput.',
    datapathNotes: 'Address increment logic computes next beat address for INCR (addr + (1 << AxSIZE)), FIXED (constant addr), or WRAP (masked wrap boundary). WSTRB masks individual bytes into SRAM/register banks.',
    controlpathNotes: 'Separate write FSM (IDLE -> W_DATA -> B_RESP) and read FSM (IDLE -> R_DATA) allow full-duplex read/write concurrency.',
    fsmStates: [
      { id: 'IDLE', label: 'IDLE', description: 'Wait for AWVALID or WVALID', x: 60, y: 80, isInitial: true },
      { id: 'W_DATA', label: 'W_DATA', description: 'Accept burst beats until WLAST', x: 260, y: 80 },
      { id: 'B_RESP', label: 'B_RESP', description: 'Drive BVALID & wait BREADY', x: 460, y: 80 },
    ],
    fsmTransitions: [
      { from: 'IDLE', to: 'W_DATA', condition: 'AWVALID && AWREADY' },
      { from: 'W_DATA', to: 'B_RESP', condition: 'WVALID && WREADY && WLAST' },
      { from: 'B_RESP', to: 'IDLE', condition: 'BVALID && BREADY' },
    ],
    codeTitle: 'axi4_wr_subordinate_fsm.sv',
    codeLanguage: 'SystemVerilog',
    codeSnippet: `module axi4_wr_subordinate_fsm #(
  parameter int ADDR_W = 32,
  parameter int DATA_W = 64,
  parameter int ID_W   = 4
)(
  input  logic                ACLK,
  input  logic                ARESETn,
  // Write Address Channel
  input  logic                AWVALID,
  output logic                AWREADY,
  input  logic [ADDR_W-1:0]   AWADDR,
  input  logic [7:0]          AWLEN,
  input  logic [ID_W-1:0]     AWID,
  // Write Data Channel
  input  logic                WVALID,
  output logic                WREADY,
  input  logic [DATA_W-1:0]   WDATA,
  input  logic [DATA_W/8-1:0] WSTRB,
  input  logic                WLAST,
  // Write Response Channel
  output logic                BVALID,
  input  logic                BREADY,
  output logic [1:0]          BRESP,
  output logic [ID_W-1:0]     BID
);
  typedef enum logic [1:0] {IDLE, W_DATA, B_RESP} wr_state_e;
  wr_state_e state;
  logic [7:0]        beat_cnt;
  logic [ID_W-1:0]   id_reg;
  logic [ADDR_W-1:0] addr_reg;

  assign AWREADY = (state == IDLE);
  assign WREADY  = (state == W_DATA);
  assign BVALID  = (state == B_RESP);
  assign BRESP   = 2'b00; // OKAY
  assign BID     = id_reg;

  always_ff @(posedge ACLK or negedge ARESETn) begin
    if (!ARESETn) begin
      state    <= IDLE;
      beat_cnt <= '0;
      id_reg   <= '0;
      addr_reg <= '0;
    end else begin
      case (state)
        IDLE: begin
          if (AWVALID && AWREADY) begin
            id_reg   <= AWID;
            addr_reg <= AWADDR;
            beat_cnt <= AWLEN;
            state    <= W_DATA;
          end
        end
        W_DATA: begin
          if (WVALID && WREADY) begin
            addr_reg <= addr_reg + (DATA_W / 8);
            if (WLAST || (beat_cnt == 8'd0))
              state <= B_RESP;
            else
              beat_cnt <= beat_cnt - 8'd1;
          end
        end
        B_RESP: begin
          if (BVALID && BREADY)
            state <= IDLE;
        end
        default: state <= IDLE;
      endcase
    end
  end
endmodule`,
    commonMistakes: [
      'Combinational dependency of AWVALID on AWREADY causing deadlock in point-to-point connections.',
      'Not buffering early WVALID beats when WVALID arrives in the same cycle or before AWVALID.',
      'Failing to maintain payload stability when VALID=1 and READY=0.',
    ],
  },
  verification: {
    uvmArchitecture: 'Standard active/passive AXI4 UVM agent containing axi4_sequencer, axi4_driver (separate AW, W, B, AR, R threads), axi4_monitor (protocol phase reconstructor), axi4_scoreboard (associative array indexed by AxID), and SVA protocol checker bound via virtual interface.',
    driverStrategy: 'Driver forks independent per-channel tasks so AW and W channels can have randomized relative skew (AW-first, concurrent, or W-before-AW) and randomized READY/VALID idle bubbles.',
    monitorStrategy: 'Monitor samples exclusively on posedge ACLK when (VALID && READY), reconstructs multi-beat burst packets, and publishes analysis_port transactions upon BRESP or RLAST.',
    scoreboardStrategy: 'Tracks outstanding writes/reads in per-ID FIFOs, updates shadow memory model byte-by-byte using WSTRB, and verifies RDATA matches expected memory contents including WRAP/INCR address calculation.',
    coveragePoints: [
      'Cross of AxBURST (FIXED, INCR, WRAP) x AxSIZE x AxLEN buckets (1, 2-4, 5-16, 17-256).',
      'Handshake timing variants: VALID-before-READY, READY-before-VALID, simultaneous assertion.',
      'Backpressure stalls on AWREADY, WREADY, BREADY, ARREADY, RREADY across 0..8 cycles.',
      '4KB boundary adjacency (burst ending exactly at 0xFFF) and sparse WSTRB patterns.',
    ],
    cornerCases: [
      'WVALID asserted 5 cycles before AWVALID.',
      '256-beat INCR burst ending at 4KB boundary (0x0FFC -> 0x1000 forbidden).',
      'Out-of-order read completions across 16 different ARIDs with interleaved R beats.',
      'Reset assertion mid-burst while BVALID or RVALID is pending.',
    ],
    svaSnippet: `// AXI4 Protocol Compliance Assertions (SVA)
property p_axi4_aw_payload_stable;
  @(posedge ACLK) disable iff (!ARESETn)
  (AWVALID && !AWREADY) |=> (AWVALID && $stable({AWADDR, AWLEN, AWSIZE, AWBURST, AWID}));
endproperty
assert property (p_axi4_aw_payload_stable)
  else $error("AXI4 Violation: AW payload changed while AWREADY=0");

property p_axi4_w_payload_stable;
  @(posedge ACLK) disable iff (!ARESETn)
  (WVALID && !WREADY) |=> (WVALID && $stable({WDATA, WSTRB, WLAST}));
endproperty
assert property (p_axi4_w_payload_stable)
  else $error("AXI4 Violation: W payload changed while WREADY=0");`,
    uvmSnippet: `class axi4_driver extends uvm_driver #(axi4_seq_item);
  ` + "`uvm_component_utils(axi4_driver)" + `
  virtual axi4_if vif;

  task drive_write_burst(axi4_seq_item req);
    fork
      begin // AW Channel Thread
        repeat (req.aw_delay) @(posedge vif.ACLK);
        vif.AWVALID <= 1'b1;
        vif.AWADDR  <= req.addr;
        vif.AWLEN   <= req.len;
        vif.AWSIZE  <= req.size;
        vif.AWBURST <= req.burst;
        do @(posedge vif.ACLK); while (!vif.AWREADY);
        vif.AWVALID <= 1'b0;
      end
      begin // W Channel Thread
        foreach (req.data[i]) begin
          repeat (req.w_bubble[i]) @(posedge vif.ACLK);
          vif.WVALID <= 1'b1;
          vif.WDATA  <= req.data[i];
          vif.WSTRB  <= req.strb[i];
          vif.WLAST  <= (i == req.data.size() - 1);
          do @(posedge vif.ACLK); while (!vif.WREADY);
          vif.WVALID <= 1'b0;
        end
        vif.WLAST <= 1'b0;
      end
    join
  endtask
endclass`,
  },
  debuggingLab: [
    {
      id: 'axi4-dbg-stability',
      title: 'AWVALID Deasserted & AWADDR Mutated During AWREADY=0 Stall',
      symptom: 'Subordinate samples wrong target address 0x2000 instead of 0x1000, or misses write request entirely.',
      violatedRule: 'ARM IHI 0022E Section A3.2.1: Once VALID is asserted it must remain asserted, and payload must remain stable, until READY is asserted.',
      rootCause: 'Manager state machine timed out after 1 cycle and advanced to the next queued request without checking AWREADY.',
      fix: 'Gate Manager address-queue pop and AWVALID deassertion strictly on (AWVALID && AWREADY).',
      expectedWaveform: {
        id: 'exp-stab', name: 'Expected: Hold AWVALID & AWADDR until AWREADY=1', category: 'Nominal', description: 'AWADDR=1000 stays frozen until cycle 4.', cycles: 7, clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0] },
          { name: 'AWVALID', type: 'bit', values: [0, 1, 1, 1, 0, 0, 0] },
          { name: 'AWREADY', type: 'bit', values: [0, 0, 0, 1, 1, 1, 1] },
          { name: 'AWADDR', type: 'bus', values: ['-', '1000', '1000', '1000', '-', '-', '-'] },
        ],
        annotations: [{ cycle: 3, label: 'Valid handshake at cycle 3', severity: 'info' }],
      },
      actualWaveform: {
        id: 'act-stab', name: 'Actual Bug: AWADDR changes & AWVALID drops while AWREADY=0', category: 'Error', description: 'AWADDR changes to 2000 at cycle 2 while AWREADY=0.', cycles: 7, clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0] },
          { name: 'AWVALID', type: 'bit', values: [0, 1, 1, 0, 0, 0, 0] },
          { name: 'AWREADY', type: 'bit', values: [0, 0, 0, 1, 1, 1, 1] },
          { name: 'AWADDR', type: 'bus', values: ['-', '1000', '2000', '-', '-', '-', '-'] },
        ],
        annotations: [{ cycle: 2, label: 'VIOLATION: AWADDR mutated during stall', severity: 'error' }, { cycle: 3, label: 'VIOLATION: AWVALID dropped before AWREADY', severity: 'error' }],
      },
    },
    {
      id: 'axi4-dbg-early-bvalid',
      title: 'Premature BVALID Asserted Before WLAST Handshake',
      symptom: 'Manager retires write transaction before the 4th data beat is committed to memory, causing read-after-write data corruption.',
      violatedRule: 'ARM IHI 0022E Section A3.3.1: Subordinate must wait for both AW handshake and the final W transfer (WLAST) before asserting BVALID.',
      rootCause: 'Subordinate triggered BVALID directly from (AWVALID && AWREADY) instead of waiting for WLAST.',
      fix: 'Track both aw_done and wlast_done flags; assert BVALID only when (aw_done && wlast_done).',
      expectedWaveform: {
        id: 'exp-bval', name: 'Expected: BVALID asserts after WLAST', category: 'Nominal', description: 'BVALID rises at cycle 5 after WLAST at cycle 4.', cycles: 7, clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0] },
          { name: 'AWVALID', type: 'bit', values: [0, 1, 0, 0, 0, 0, 0] },
          { name: 'WVALID', type: 'bit', values: [0, 0, 1, 1, 1, 0, 0] },
          { name: 'WLAST', type: 'bit', values: [0, 0, 0, 0, 1, 0, 0] },
          { name: 'BVALID', type: 'bit', values: [0, 0, 0, 0, 0, 1, 0] },
        ],
        annotations: [{ cycle: 5, label: 'BVALID safely follows WLAST', severity: 'info' }],
      },
      actualWaveform: {
        id: 'act-bval', name: 'Actual Bug: BVALID fires at cycle 2 before WLAST', category: 'Error', description: 'Subordinate responds before write data finishes.', cycles: 7, clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0] },
          { name: 'AWVALID', type: 'bit', values: [0, 1, 0, 0, 0, 0, 0] },
          { name: 'WVALID', type: 'bit', values: [0, 0, 1, 1, 1, 0, 0] },
          { name: 'WLAST', type: 'bit', values: [0, 0, 0, 0, 1, 0, 0] },
          { name: 'BVALID', type: 'bit', values: [0, 0, 1, 0, 0, 0, 0] },
        ],
        annotations: [{ cycle: 2, label: 'VIOLATION: BVALID asserted prior to WLAST', severity: 'error' }],
      },
    },
  ],
  interviewQuestions: [
    {
      id: 'axi4-iq-1',
      level: 'Beginner',
      question: 'Why does AXI4 forbid a Manager from waiting on READY before asserting VALID?',
      answer: 'If a Manager waits for AWREADY before asserting AWVALID, and the Subordinate legally waits for AWVALID before asserting AWREADY, both sides wait forever, creating a cyclic deadlock.',
      keyTakeaway: 'Source VALID must never combinationally or sequentially depend on destination READY.',
    },
    {
      id: 'axi4-iq-2',
      level: 'Intermediate',
      question: 'Explain the 4KB boundary crossing rule in AXI4 and how to compute it.',
      answer: 'A single burst cannot cross a 4KB address boundary because SoC address decoders allocate minimum 4KB regions to peripherals. Crossing 4KB could cause half of a burst to target a different Subordinate. Check: (AWADDR[11:0] + ((AWLEN + 1) << AWSIZE)) <= 4096.',
      keyTakeaway: 'Minimum slave decode granularity is 4KB.',
    },
    {
      id: 'axi4-iq-3',
      level: 'Intermediate',
      question: 'What changed between AXI3 and AXI4 regarding write data interleaving?',
      answer: 'AXI3 supported write data interleaving using the 4-bit WID signal, allowing beats from different write bursts to mix. AXI4 removed WID and prohibited write interleaving because out-of-order write data buffers in interconnects consumed excessive area and created complex ordering hazards.',
      keyTakeaway: 'Read data interleaving (via RID) is still allowed in AXI4, while write interleaving (WID) was removed.',
    },
    {
      id: 'axi4-iq-4',
      level: 'Advanced',
      question: 'How do you break a combinational timing path on READY and VALID across a long SoC interconnect?',
      answer: 'Insert a Register Slice (skid buffer). Forward-path flops register VALID and payload; a 2-entry skid buffer registers READY on the backward path so neither VALID nor READY has a combinational feedthrough.',
      keyTakeaway: 'A full AXI register slice uses 2 storage entries per channel to break both forward and backward timing paths at 100% bandwidth.',
    },
    {
      id: 'axi4-iq-5',
      level: 'Debugging',
      question: 'In a waveform, AWVALID and WVALID both assert on cycle 10, WLAST completes on cycle 13, but BVALID never rises. What are the top 3 RTL bugs to inspect?',
      answer: '1) Subordinate missed AW handshake because it gated AWREADY on an idle state while W arrived first. 2) Off-by-one beat counter expecting AWLEN+1 beats when WLAST fired one cycle early. 3) Subordinate ID register overwritten or BVALID gated by a sticky error flag.',
      keyTakeaway: 'Check AW/W synchronization state machine, beat counter vs WLAST, and BVALID trigger logic.',
    },
    {
      id: 'axi4-iq-6',
      level: 'Verification',
      question: 'How would you verify out-of-order read completions in a UVM scoreboard?',
      answer: 'Store expected read transactions in an associative array keyed by ARID (queue per ID: `axi4_item exp_q[bit[ID_W-1:0]][$]`). When R beats arrive on the monitor, look up `exp_q[r_item.rid][0]`, verify same-ID beats arrive in order, and pop the queue entry only when RLAST=1.',
      keyTakeaway: 'Per-ID FIFO queues naturally model AXI4 same-ID ordering and cross-ID out-of-order completion.',
    },
  ],
  sources: [
    { title: 'AMBA AXI and ACE Protocol Specification (IHI 0022E / IHI 0022H)', authority: 'ARM Ltd.', reference: 'Sections A1–A4, Channel Handshakes & Ordering' },
    { title: 'ARM CoreLink NIC-400 Network Interconnect Technical Reference Manual', authority: 'ARM Ltd.', reference: 'Register Slice & QoS Architecture' },
  ],
};
