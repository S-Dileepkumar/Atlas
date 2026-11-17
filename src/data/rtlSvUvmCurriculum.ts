export type CurriculumPillarId = 'rtl-design' | 'systemverilog' | 'uvm-methodology';

export interface CurriculumModule {
  id: string;
  pillar: CurriculumPillarId;
  chapter: string;
  number: string;
  title: string;
  scopeBadge: 'Synthesizable RTL' | 'Verification / TB' | 'RTL & DV Bridge' | 'IEEE 1800.2 UVM';
  summary: string;
  deepTheory: string;
  normativeRules: string[];
  commonPitfall: string;
  verifiedFix: string;
  codeTitle: string;
  codeLanguage: string;
  codeExample: string;
  interviewTakeaway: string;
  relatedProtocols: string[];
  relatedIps: string[];
}

export interface CurriculumPillarMeta {
  id: CurriculumPillarId;
  label: string;
  shortLabel: string;
  standardRef: string;
  tagline: string;
  description: string;
}

export const CURRICULUM_PILLARS: CurriculumPillarMeta[] = [
  {
    id: 'rtl-design',
    label: 'RTL Design Engineering',
    shortLabel: 'RTL Design',
    standardRef: 'IEEE 1800 / Synthesis & STA',
    tagline: 'Cycle-accurate microarchitecture, timing closure, CDC/RDC, elastic pipelines & low-power RTL',
    description:
      'Every core RTL synthesis principle, sequential/combinational semantics, reset topology, finite state machine architecture, skid buffer backpressure, setup/hold slack, clock-domain crossing, async FIFOs, UPF low-power isolation, and lint discipline.',
  },
  {
    id: 'systemverilog',
    label: 'SystemVerilog (SV)',
    shortLabel: 'SystemVerilog',
    standardRef: 'IEEE Std 1800-2017 / 2023',
    tagline: 'Design types, interfaces, clocking blocks, OOP, constrained randomization, coverage & SVA',
    description:
      'Complete coverage of IEEE 1800 SystemVerilog: 2-state vs 4-state types, packed/unpacked structures, queues/associative arrays, simulation scheduling regions, clocking blocks, OOP polymorphism, constraint solving, fork/join IPC, functional covergroups, SVA & DPI-C.',
  },
  {
    id: 'uvm-methodology',
    label: 'Universal Verification Methodology (UVM)',
    shortLabel: 'UVM',
    standardRef: 'IEEE Std 1800.2-2020',
    tagline: 'Factory overrides, phasing, config_db, TLM ports, sequences, drivers, scoreboards & RAL',
    description:
      'End-to-end IEEE 1800.2 verification architecture: class hierarchy, factory registration & overrides, top-down/bottom-up phasing, uvm_config_db scoping, TLM-1/2 analysis paths, virtual sequences, out-of-order scoreboards, Register Abstraction Layer (RAL), and objections.',
  },
];

export const RTL_SV_UVM_CURRICULUM: CurriculumModule[] = [
  // ============================================================================
  // PILLAR 1: RTL DESIGN (14 MODULES)
  // ============================================================================
  {
    id: 'rtl-comb-seq',
    pillar: 'rtl-design',
    chapter: '01. Core Synthesis Semantics',
    number: '1.1',
    title: 'Combinational vs Sequential Logic & Sensitivity',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Distinguishing zero-cycle combinational Boolean cones from edge-triggered flip-flop storage elements without simulation-synthesis mismatch.',
    deepTheory:
      'Combinational logic computes outputs purely as a function of current inputs through standard-cell gates (AND/OR/MUX/LUT) with zero memory, settling within one clock period minus setup time. Sequential logic captures D-input values strictly on active clock edges into D-flip-flops (DFFs), isolating combinational clouds and breaking timing loops. A classic Verilog-2001 defect was incomplete sensitivity lists `@(a or b)` omitting a third signal `c`, causing simulation to freeze while synthesis built a 3-input gate—producing silicon that disagrees with RTL simulation.',
    normativeRules: [
      'Always use SystemVerilog `always_comb` for combinational blocks so compilers automatically infer the complete sensitivity list including functions called inside the block.',
      'Always use `always_ff @(posedge clk ...)` for sequential flip-flops; synthesis tools verify the block strictly infers storage registers.',
      'Never feed a combinational output back into its own input without crossing a flip-flop boundary (creates an unanalyzable combinational loop that oscillates or breaks STA).',
    ],
    commonPitfall:
      'Using legacy `always @(a, b)` while reading `sel` inside the block, or placing a blocking delay `#5` inside synthesizable RTL.',
    verifiedFix:
      'Use `always_comb` exclusively for combinational mux/ALU cones and `always_ff` for clocked registers; run Verilator/SpyGlass lint to ban combinational feedback loops.',
    codeTitle: 'comb_vs_seq.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `module alu_pipe #(parameter int W = 32) (
  input  logic         clk,
  input  logic         rst_n,
  input  logic         op_sub,
  input  logic [W-1:0] a, b,
  output logic [W-1:0] y_q
);
  logic [W-1:0] sum_comb;

  // Combinational cloud: auto-sensitive to op_sub, a, b
  always_comb begin
    sum_comb = op_sub ? (a - b) : (a + b);
  end

  // Edge-triggered flip-flop boundary
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) y_q <= '0;
    else        y_q <= sum_comb;
  end
endmodule`,
    interviewTakeaway:
      'Simulation reads event queues while hardware conducts voltage continuously; `always_comb` + `always_ff` eliminate Verilog-95/2001 sensitivity mismatches by construction.',
    relatedProtocols: ['axi4-lite', 'apb'],
    relatedIps: ['ibex', 'picorv32'],
  },
  {
    id: 'rtl-blocking-nba',
    pillar: 'rtl-design',
    chapter: '01. Core Synthesis Semantics',
    number: '1.2',
    title: 'Blocking (=) vs Non-Blocking (<=) & Race Conditions',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'How IEEE 1800 Active vs NBA event regions determine whether sequential chains build shift registers or collapse into a single wire.',
    deepTheory:
      'In SystemVerilog simulation, blocking assignments (`=`) evaluate and update the LHS immediately within the Active region, whereas non-blocking assignments (`<=`) evaluate all RHS expressions in the Active region and schedule LHS updates later in the NBA (Non-Blocking Assignment) region. If two `always_ff` blocks or a two-stage shift register inside one `always_ff` block use blocking `=`, the second flip-flop reads the already-overwritten first stage in zero simulation time—creating a simulator race condition where order of execution determines whether you simulate a 2-cycle pipeline or a 1-cycle wire.',
    normativeRules: [
      'Sequential blocks (`always_ff`) MUST use non-blocking `<=` for all registered outputs.',
      'Combinational blocks (`always_comb`) MUST use blocking `=` for intermediate variables and outputs.',
      'Never mix `=` and `<=` on the same LHS variable or inside the same `always_ff` for registered state.',
    ],
    commonPitfall:
      'Writing `q1 = d; q2 = q1;` inside `@(posedge clk)` collapses two physical flip-flops in simulation into a zero-delay pass-through.',
    verifiedFix:
      'Write `q1 <= d; q2 <= q1;` so both RHS reads sample pre-clock-edge values concurrently in the Active region before committing in NBA.',
    codeTitle: 'shift_reg_nba.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `// Guaranteed 2-stage shift register with zero Active/NBA race
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) begin
    stage1_q <= 1'b0;
    stage2_q <= 1'b0;
  end else begin
    stage1_q <= serial_in; // RHS sampled before NBA updates
    stage2_q <= stage1_q;  // Reads old stage1_q cleanly!
  end
end`,
    interviewTakeaway:
      'Blocking `=` updates immediately in the Active region (modeling wire/gate cascade); `<=` defers writes to NBA (modeling synchronous flip-flop Q outputs).',
    relatedProtocols: ['spi', 'uart'],
    relatedIps: ['ibex', 'opentitan-spi-host'],
  },
  {
    id: 'rtl-latches',
    pillar: 'rtl-design',
    chapter: '01. Core Synthesis Semantics',
    number: '1.3',
    title: 'Latch Inference, Avoidance & Intentional always_latch',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Why incomplete branches infer level-sensitive D-latches that break STA/DFT, and when intentional latches are used in clock gating.',
    deepTheory:
      'When a signal inside a combinational `always` block is not assigned along every control path (for example, missing an `else` branch or `default:` case arm), synthesis preserves the signal\'s previous value by inserting a level-sensitive transparent D-latch. Latches leak timing borrow across phases, complicate static timing analysis (STA), and fail scan-chain ATPG unless explicitly handled. Conversely, standard-cell Integrated Clock Gating (ICG) cells intentionally contain a negative-level-sensitive latch to hold the enable signal glitch-free while `clk` is high.',
    normativeRules: [
      'Assign default values at the very top of every `always_comb` block (e.g., `next_state = state; out_valid = 1\'b0;`) before entering `if`/`case`.',
      'Use `always_comb` (not generic `always @*`): compilers raise an immediate error if any path omits an assignment.',
      'Only instantiate intentional latches via foundry clock-gating cells or `always_latch`. Never use `// synopsys full_case` pragmas to mask missing branches.',
    ],
    commonPitfall:
      'Omitting `default:` in a FSM next-state `case`, causing an unintended latch on `next_state` or masking X-propagation via `full_case` synthesis directives.',
    verifiedFix:
      'Initialize all combinational outputs at the top of `always_comb` and write complete `else` and `default:` clauses.',
    codeTitle: 'latch_free_comb.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `always_comb begin
  // 1. Safe defaults at top guarantee zero inferred latches
  grant_o     = 1'b0;
  next_state  = state_q;

  // 2. Explicit branch overrides
  unique case (state_q)
    ST_IDLE: if (req_i) next_state = ST_RUN;
    ST_RUN:  begin
               grant_o    = 1'b1;
               next_state = done_i ? ST_IDLE : ST_RUN;
             end
    default: next_state = ST_IDLE;
  endcase
end`,
    interviewTakeaway:
      'Default-assign at the top of `always_comb` kills unintentional latches everywhere—and never use vendor `full_case`/`parallel_case` pragmas that hide sim/synth mismatches.',
    relatedProtocols: ['apb', 'axi4-lite'],
    relatedIps: ['opentitan-uart', 'opentitan-gpio'],
  },
  {
    id: 'rtl-reset-strategies',
    pillar: 'rtl-design',
    chapter: '02. Clock, Reset & State Machines',
    number: '1.4',
    title: 'Reset Topologies: Sync vs Async Assert / Sync Deassert',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Comparing synchronous resets, pure async resets, and the industry-standard Reset Synchronizer Bridge preventing recovery/removal violations.',
    deepTheory:
      'A purely synchronous reset (`always_ff @(posedge clk)`) simplifies timing closure because reset acts like normal data, but requires a running free-clock to reset flip-flops (failing if clock gates are off at power-on). A pure asynchronous reset (`always_ff @(posedge clk or negedge rst_n)`) resets immediately without a clock, BUT if `rst_n` deasserts near a rising clock edge, different flip-flops release on different clock cycles or go metastable (recovery/removal violation), scrambling FSM state. Production SoCs therefore use Asynchronous Assertion + Synchronous Deassertion via a 2-FF Reset Synchronizer Bridge.',
    normativeRules: [
      'Feed external asynchronous `ext_rst_n` into a 2-stage reset synchronizer (`D=1\'b1`, async clear `negedge ext_rst_n`) to produce `sync_rst_n` aligned cleanly to `posedge clk`.',
      'Reset control/FSM/valid flip-flops (`valid_q`, `state_q`); leave large datapath payload registers (`wdata_q`, pipeline data) unreset when gated by `valid_q` to save silicon area and routing congestion.',
      'Never mix synchronous and asynchronous reset styles on the same `always_ff` block.',
    ],
    commonPitfall:
      'Routing raw asynchronous `rst_n` from an IO pad directly to 50,000 flip-flops—causing half the FSM to wake up one cycle early.',
    verifiedFix:
      'Assert asynchronously for instant power-on safety, and deassert synchronously through a dedicated per-clock-domain Reset Bridge.',
    codeTitle: 'reset_sync_bridge.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `module reset_sync_bridge (
  input  logic clk,
  input  logic ext_rst_n,   // Async active-low pin/POR
  output logic sync_rst_n   // Async-assert, sync-deassert output
);
  logic rst_meta_q;

  always_ff @(posedge clk or negedge ext_rst_n) begin
    if (!ext_rst_n) begin
      rst_meta_q <= 1'b0;
      sync_rst_n <= 1'b0;
    end else begin
      rst_meta_q <= 1'b1;        // Clears metastability on release
      sync_rst_n <= rst_meta_q;  // Deasserts cleanly after posedge clk
    end
  end
endmodule`,
    interviewTakeaway:
      'Async assert + sync deassert gives clock-less reset safety AND zero recovery/removal metastability on reset release.',
    relatedProtocols: ['axi4', 'tl-ul'],
    relatedIps: ['ibex', 'opentitan-aes'],
  },
  {
    id: 'rtl-fsm-design',
    pillar: 'rtl-design',
    chapter: '02. Clock, Reset & State Machines',
    number: '1.5',
    title: 'FSM Engineering: Moore/Mealy, Encodings & Safe Recovery',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Designing 2-process vs 3-process registered FSMs with binary, Gray, and one-hot encodings plus illegal-state lockup protection.',
    deepTheory:
      'Moore machines drive outputs solely from `state_q` (guaranteed glitch-free and registered), whereas Mealy machines depend on both `state_q` and combinational inputs (zero-cycle latency, but risk combinational timing paths across module boundaries). High-speed FPGAs/ASICs often use One-Hot encoding (`N` FFs, 1-hot bit per state, minimal decode mux depth) or Gray encoding (1-bit transitions across CDC). Critically, if an alpha particle bit-flip or X-corruption lands an FSM with 5 states inside unused binary codes `3\'b101..3\'b111`, a missing safe recovery transitions the chip into permanent deadlock.',
    normativeRules: [
      'Separate sequential state register (`always_ff`) from combinational next-state logic (`always_comb`); optionally register outputs (3-process) to isolate output timing.',
      'Always map `default: next_state = ST_IDLE;` so radiation upsets or unused binary encodings self-heal on the next clock edge.',
      'Avoid Mealy combinational pass-through outputs on standardized bus interfaces like AXI (`VALID`/`READY` combinational loops cause instant timing/protocol bugs).',
    ],
    commonPitfall:
      'Driving `AXI READY` combinationally from `AXI VALID` inside a Mealy FSM—creating a zero-cycle combinational dependency forbidden by ARM IHI 0022E.',
    verifiedFix:
      'Use Moore or registered-output FSMs (`always_ff` output stage) for bus handshakes and explicitly constrain `default` state recovery.',
    codeTitle: 'safe_moore_fsm.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `typedef enum logic [1:0] {
  ST_IDLE  = 2'b00,
  ST_SETUP = 2'b01,
  ST_WAIT  = 2'b10,
  ST_DONE  = 2'b11
} apb_state_e;

always_comb begin
  next_state = state_q;
  psel_o     = 1'b0;
  penable_o  = 1'b0;

  unique case (state_q)
    ST_IDLE:  if (req_i) next_state = ST_SETUP;
    ST_SETUP: begin psel_o = 1'b1; next_state = ST_WAIT; end
    ST_WAIT:  begin psel_o = 1'b1; penable_o = 1'b1; if (pready_i) next_state = ST_IDLE; end
    default:  next_state = ST_IDLE; // Self-healing safe recovery
  endcase
end`,
    interviewTakeaway:
      'Always compare 2-process vs 3-process registered outputs on STA critical paths, and cite ARM AXI combinational loop bans on VALID→READY.',
    relatedProtocols: ['apb', 'axi4', 'ahb-lite'],
    relatedIps: ['opentitan-i2c', 'opentitan-spi-host'],
  },
  {
    id: 'rtl-skid-buffer',
    pillar: 'rtl-design',
    chapter: '03. Datapaths, Pipelines & Timing',
    number: '1.6',
    title: 'Elastic Pipelines & Zero-Bubble Valid/Ready Skid Buffers',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Breaking combinational READY backpressure paths while sustaining 100% 1-beat-per-cycle throughput without dropping data.',
    deepTheory:
      'Registering `VALID` and `DATA` forward is easy—you just stall when `READY == 0`. However, cutting the combinational `m_ready <= s_ready` backward path requires a 2-entry elastic Skid Buffer (Forward+Backward Register Slice). Because `s_ready_o` is a registered signal, when downstream `m_ready_i` drops mid-cycle, upstream has ALREADY launched one in-flight beat on that clock edge! The skid buffer catches that extra beat in a 1-deep shadow/skid register while simultaneously dropping `s_ready_o <= 0` for the next cycle, draining the shadow register cleanly once `m_ready_i` returns.',
    normativeRules: [
      'A forward-only register slice cuts `valid`/`data` critical paths (with 1-cycle stall bubble if using 1 flop, or 0-bubble with 2-entry skid).',
      'A full AXI Register Slice combines Forward + Backward paths so NEITHER `valid/data` NOR `ready` sees any combinational feed-through across the boundary.',
      'Hold `m_valid_o` and `m_data_o` invariant whenever `m_valid_o && !m_ready_i` (Axiom of Backpressure Stability).',
    ],
    commonPitfall:
      'Registering `s_ready_o <= m_ready_i` without a 1-beat shadow skid register—resulting in silently overwriting or dropping 1 data beat every time downstream backpressures.',
    verifiedFix:
      'Implement a 2-slot state machine (`EMPTY`, `ONE`, `FULL_SKID`) or 2-entry elastic slice so zero cycles and zero beats are ever lost.',
    codeTitle: 'skid_buffer.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `module skid_buffer #(parameter int W = 64) (
  input  logic         clk, rst_n,
  input  logic         s_valid_i,
  output logic         s_ready_o,
  input  logic [W-1:0] s_data_i,
  output logic         m_valid_o,
  input  logic         m_ready_i,
  output logic [W-1:0] m_data_o
);
  logic [W-1:0] skid_data_q;
  logic         skid_valid_q;

  assign s_ready_o = !skid_valid_q; // Registered upstream ready (no comb path from m_ready_i!)

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      m_valid_o    <= 1'b0;
      skid_valid_q <= 1'b0;
    end else begin
      if (m_valid_o && m_ready_i) begin
        // Downstream consumed main output: promote skid or accept new input
        m_valid_o    <= skid_valid_q || s_valid_i;
        m_data_o     <= skid_valid_q ? skid_data_q : s_data_i;
        skid_valid_q <= 1'b0;
      end else if (s_valid_i && s_ready_o) begin
        if (!m_valid_o) begin
          m_valid_o <= 1'b1;
          m_data_o  <= s_data_i;
        end else begin
          // Downstream stalled (m_valid_o && !m_ready_i): catch beat in skid!
          skid_valid_q <= 1'b1;
          skid_data_q  <= s_data_i;
        end
      end
    end
  end
endmodule`,
    interviewTakeaway:
      'Every SoC interconnect engineer gets asked to draw or code a Skid Buffer on a whiteboard—key is catching the 1 in-flight beat when registered `s_ready_o` reacts 1 cycle late.',
    relatedProtocols: ['axi4', 'axi4-stream', 'tl-ul'],
    relatedIps: ['pulp-axi', 'verilog-axi', 'opentitan-tlul-xbar'],
  },
  {
    id: 'rtl-sta-timing',
    pillar: 'rtl-design',
    chapter: '03. Datapaths, Pipelines & Timing',
    number: '1.7',
    title: 'Static Timing Analysis (STA): Setup, Hold, Skew & Exceptions',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Deriving the fundamental setup and hold slack inequalities, fixing violations via pipelining vs buffering, and constraining MCP/False Paths.',
    deepTheory:
      'Setup check ensures data launched on edge N arrives at the capture flip-flop BEFORE edge N+1 by at least $T_{\\text{su}}$: $T_{\\text{clk}} + T_{\\text{skew}} \\ge T_{\\text{cq}} + T_{\\text{comb,max}} + T_{\\text{su}}$. Hold check ensures fast data launched on edge N+1 does NOT race through and corrupt the PREVIOUS edge N capture before $T_{\\text{hold}}$: $T_{\\text{cq,min}} + T_{\\text{comb,min}} \\ge T_{\\text{hold}} + T_{\\text{skew}}$. Notice hold is clock-period independent—lowering clock frequency NEVER fixes a hold violation!',
    normativeRules: [
      'Fix setup violations by pipelining deep combinational cones, retiming registers, reducing high-fanout nets, or upsizing slow LVT/ULVT standard cells.',
      'Fix hold violations (post-CTS/layout) by inserting delay buffers in fast paths or lowering positive clock skew (`Tskew = Tcapture - Tlaunch`).',
      'Only apply `set_false_path` on truly asynchronous CDC boundaries (with proper synchronizers!) or static config CSRs; never hide real functional bugs with `set_false_path`.',
    ],
    commonPitfall:
      'Assuming slowing down the clock solves hold violations, or writing `set_false_path` across multi-bit data buses without a synchronizer.',
    verifiedFix:
      'Treat hold as frequency-independent and inspect worst-negative slack (WNS) & total negative slack (TNS) across slow-cold/fast-hot PVT corners.',
    codeTitle: 'sta_pipelined_mac.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `// Splitting a 32x32 multiply-add into 2 pipeline stages cuts T_comb in half (~2x Fmax)
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) begin
    prod_q    <= '0;
    acc_out_q <= '0;
  end else begin
    prod_q    <= a_i * b_i;         // Stage 1: Booth multiplier cone settles before Tclk
    acc_out_q <= prod_q + c_d1_q;   // Stage 2: Carry-save adder settles cleanly
  end
end`,
    interviewTakeaway:
      'Setup depends on $T_{\\text{clk}}$ and worst-case slow corner; Hold is independent of $T_{\\text{clk}}$ and fails on fast corners or large positive clock skew.',
    relatedProtocols: ['ddr5', 'pcie-gen5'],
    relatedIps: ['gemmini', 'vortex-gpu', 'boom'],
  },
  {
    id: 'rtl-cdc',
    pillar: 'rtl-design',
    chapter: '04. Multi-Clock & Low-Power Design',
    number: '1.8',
    title: 'Clock Domain Crossing (CDC): 2-FF Sync, Metastability & MCP',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Mitigating metastability across asynchronous clocks with MTBF 2-FF chains, toggle pulse synchronizers, and closed-loop req/ack handshakes.',
    deepTheory:
      'Whenever a signal violates setup/hold while crossing between asynchronous clocks, the destination flip-flop enters a metastable state where output Q hovers between 0 and 1 before decaying exponentially. Mean Time Between Failures (MTBF) grows exponentially with resolution window ($\\tau$). A single 2-FF synchronizer isolates metastability ONLY for a single-bit slow-changing control level (`T_src >= 2 * T_dst`). Multi-bit data buses MUST NEVER pass through raw parallel 2-FF synchronizers because random 1-cycle skew across bits causes bit-splitting corruption (reconvergence glitch)! Instead, synchronize a 1-bit toggle/req signal while holding the multi-bit data bus completely frozen (Multi-Cycle Path / MCP formulation) or use an async FIFO.',
    normativeRules: [
      'Always drive CDC source inputs directly from a glitch-free flip-flop (`src_q`), NEVER from combinational logic in the source clock domain!',
      'Tag synchronizer flip-flops with `(* ASYNC_REG = "TRUE" *)` / don\'t-touch placement constraints so P&R keeps Stage-1 and Stage-2 physically adjacent to maximize MTBF.',
      'For fast-to-slow pulse crossing, use a closed-loop 4-phase Req/Ack toggle handshake so pulses are never missed regardless of clock frequency ratio.',
    ],
    commonPitfall:
      'Passing a multi-bit address or Gray-unencoded counter directly through independent 2-FF synchronizers (`addr_sync1 <= addr_src`).',
    verifiedFix:
      'Keep multi-bit payload stable behind an MCP `req_toggle` / `ack_toggle` closed-loop synchronizer or stream through a Gray-coded async FIFO.',
    codeTitle: 'cdc_2ff_and_toggle.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `// 1. Standard 2-FF Synchronizer for registered 1-bit level signals
module cdc_2ff #(parameter int STAGES = 2) (
  input  logic dst_clk, dst_rst_n,
  input  logic src_sig_q, // MUST come directly from a src_clk FF!
  output logic dst_sig_o
);
  (* ASYNC_REG = "TRUE" *) logic [STAGES-1:0] sync_q;

  always_ff @(posedge dst_clk or negedge dst_rst_n) begin
    if (!dst_rst_n) sync_q <= '0;
    else            sync_q <= {sync_q[STAGES-2:0], src_sig_q};
  end
  assign dst_sig_o = sync_q[STAGES-1];
endmodule`,
    interviewTakeaway:
      'Never sync multi-bit binary buses with 2-FFs, never place combinational gates before Stage-1, and use Toggle Req/Ack when crossing from fast clock to slow clock.',
    relatedProtocols: ['axi4', 'pcie-gen5', 'uart'],
    relatedIps: ['opentitan-aes', 'opentitan-uart', 'pulp-axi'],
  },
  {
    id: 'rtl-async-fifo',
    pillar: 'rtl-design',
    chapter: '04. Multi-Clock & Low-Power Design',
    number: '1.9',
    title: 'Asynchronous FIFO: Gray-Code Pointers & Full/Empty Logic',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'High-bandwidth multi-bit CDC via dual-port SRAM, binary-to-Gray pointer encoding, and Cummings-style full/empty comparison.',
    deepTheory:
      'An Asynchronous FIFO transfers continuous multi-bit words between arbitrary unrelated clocks (`wclk`, `rclk`). Write and read pointers wrap through an extra MSB (`[ADDR_W:0]`, i.e., 1 extra bit beyond memory depth) to distinguish full from empty when lower address bits match. Before crossing clock domains via 2-FF synchronizers, pointers are converted to Gray code (`bin ^ (bin >> 1)`) so consecutive increments flip at most ONE bit—guaranteeing a synchronized pointer settles cleanly to either the old value or new value, never a garbage intermediate state. Full and empty flags fail safely (pessimistic conservative delay of 2 cycles is safe; optimistic overflow/underflow is impossible).',
    normativeRules: [
      'Register Gray pointers in the source clock domain BEFORE feeding the destination domain\'s 2-FF synchronizer.',
      'Empty check (in `rclk` domain): `rgray_next == rq2_wptr` (all bits equal).',
      'Full check (in `wclk` domain): top TWO MSBs inverted (`wgray_next[MSB:MSB-1] == ~wq2_rptr[MSB:MSB-1]`) and remaining lower bits equal.',
    ],
    commonPitfall:
      'Computing `bin ^ (bin >> 1)` combinationally across the CDC boundary without registering the Gray code first, allowing glitches during multi-bit carry ripple.',
    verifiedFix:
      'Register `wptr_gray_q` in `wclk`, synchronize into `rclk`, and require FIFO depth to be an exact power of 2 ($2^N$) for reflected Gray wrap-around.',
    codeTitle: 'async_fifo_gray_ptr.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `// Cummings Asynchronous FIFO Write Pointer & Full Generation
assign wbin_next  = wbin_q + (winc_i & ~wfull_o);
assign wgray_next = (wbin_next >> 1) ^ wbin_next; // Binary -> Gray

// Full when top 2 Gray MSBs differ and lower bits match synced read ptr
assign wfull_val = (wgray_next == {~wq2_rptr_gray[AW:AW-1], wq2_rptr_gray[AW-2:0]});

always_ff @(posedge wclk or negedge wrst_n) begin
  if (!wrst_n) begin
    wbin_q  <= '0;
    wptr_q  <= '0;
    wfull_o <= 1'b0;
  end else begin
    wbin_q  <= wbin_next;
    wptr_q  <= wgray_next; // Registered Gray output crosses CDC safely!
    wfull_o <= wfull_val;
  end
end`,
    interviewTakeaway:
      'Power-of-2 depth guarantees adjacent Gray code on wrap-around; top-2-MSB inversion detects Full cleanly without converting Gray back to binary for comparison.',
    relatedProtocols: ['axi4', 'axi4-stream', 'pcie-gen5'],
    relatedIps: ['verilog-axi', 'verilog-ethernet', 'opentitan-csrng'],
  },
  {
    id: 'rtl-rdc-clock-mux',
    pillar: 'rtl-design',
    chapter: '04. Multi-Clock & Low-Power Design',
    number: '1.10',
    title: 'Reset Domain Crossing (RDC), Glitch-Free Clock Mux & ICG',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Preventing metastability from asynchronous reset assertion across domains and switching clocks without runt clock pulses.',
    deepTheory:
      'CDC analyzes clock edges; Reset Domain Crossing (RDC) catches bugs when a flip-flop driven by `rst_A` feeds a downstream flip-flop whose `rst_B` is NOT active—meaning `rst_A` clamping to 0 asynchronously while `clk_B` is running violates the capture FF\'s setup/hold even when both blocks share the SAME clock! Similarly, muxing two clocks (`assign clk_out = sel ? clk_a : clk_b`) creates fatal narrow runt glitch pulses whenever `sel` toggles while either clock is high. Glitch-free clock muxes use negative-edge-triggered enable cross-coupling so each clock smoothly finishes its low phase before switching.',
    normativeRules: [
      'Isolate RDC boundaries using software/sequencer reset ordering, synchronous reset assertion on the source FF, or a reset-isolation qualifier (`clamp` before downstream capture).',
      'Never gate clocks with raw combinational AND (`assign gclk = clk & en`)—glitching `en` corrupts clock edges. Always instantiate foundry Integrated Clock Gating (ICG) latch cells.',
      'Use break-before-make negative-edge dual-FF handshake feedback inside glitch-free clock multiplexers.',
    ],
    commonPitfall:
      'Writing `assign clk_gate = clk & enable;` in RTL, creating double clock edges whenever `enable` glitches while `clk == 1`.',
    verifiedFix:
      'Capture `enable` on a negative-level-sensitive latch (`!clk`) inside an ICG module (or foundry `CKLNQD` primitive) and gate cleanly.',
    codeTitle: 'glitch_free_icg_and_mux.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `// Synthesis-friendly Latch-Based Integrated Clock Gating (ICG) Behavioral Model
module clock_gate_icg (
  input  logic clk_i,
  input  logic en_i,
  input  logic test_en_i, // Always bypasses gating during ATPG scan!
  output logic gclk_o
);
  logic en_latched;

  // Transparent only while clk_i is LOW: holds en stable across entire HIGH pulse
  always_latch begin
    if (!clk_i) en_latched = en_i | test_en_i;
  end

  assign gclk_o = clk_i & en_latched;
endmodule`,
    interviewTakeaway:
      'RDC happens even within a SINGLE clock domain when two async resets differ; ICG latches sample `en` during clock LOW phase and include `scan_en` bypass for DFT.',
    relatedProtocols: ['apb', 'jtag'],
    relatedIps: ['ibex', 'cva6', 'opentitan-alert-handler'],
  },
  {
    id: 'rtl-upf-low-power',
    pillar: 'rtl-design',
    chapter: '04. Multi-Clock & Low-Power Design',
    number: '1.11',
    title: 'Low-Power RTL & UPF: Power Domains, Isolation & Retention',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Controlling dynamic and leakage power via clock gating, power-shutoff (PSO) isolation clamps, level shifters, and state retention FFs.',
    deepTheory:
      'Total chip power combines Dynamic ($P_{\\text{dyn}} = \\alpha C V^2 f$) and Static Leakage ($P_{\\text{leak}} = V \\cdot I_{\\text{leak}}(T)$). Architectural clock gating cuts switching factor $\\alpha$; Dynamic Voltage/Frequency Scaling (DVFS) cuts $V^2 f$; Power Shut-Off (PSO / power gating) kills leakage completely via header/footer MTCMOS switches. When a power domain turns OFF, its floating output wires decay to X (unknown), which would trigger crowbar short-circuit currents in powered-ON receivers unless clamped to safe `0`/`1`/latch values via Isolation (`ISO`) cells defined in IEEE 1801 UPF.',
    normativeRules: [
      'Every signal crossing from a switchable power domain to an always-on domain requires an Isolation (`ISO`) cell asserted BEFORE power switch turn-off.',
      'Signals crossing between different voltage islands (DVFS) require Level Shifters (L→H and H→L) combined with isolation (`ELS` combo cells).',
      'Sequencing rule during power-down: (1) Assert bus quiescence/idle, (2) Clock gate, (3) Assert `SAVE` on retention FFs, (4) Assert `ISO_EN` clamps, (5) Deassert power switches.',
    ],
    commonPitfall:
      'Turning off power switches before asserting `ISO_EN`, or forgetting that clock-gating alone does not stop sub-threshold leakage at advanced nodes (5nm/3nm).',
    verifiedFix:
      'Verify power-down/power-up FSM sequencing in UPF power-aware simulation (MVSim / SpyGlass LP) ensuring X-clamp isolation.',
    codeTitle: 'pso_sequencer_notes.sv',
    codeLanguage: 'SystemVerilog / UPF Intent',
    codeExample: `// Power-Down Controller Sequence (Matches IEEE 1801 UPF Domains)
// 1. Wait for AXI outstanding count == 0 & quiesce Q-Channel
// 2. Disable domain ICGs (clk_en_o <= 1'b0)
// 3. Assert iso_en_o  <= 1'b1  (clamps outputs to safe IDLE before rail drops!)
// 4. Pulse  save_o    <= 1'b1  (copies critical CSRs to always-on balloon latches)
// 5. Drop   pwr_req_o <= 1'b0  (opens MTCMOS power-gating switches)`,
    interviewTakeaway:
      'Know the exact 5-step power-down/up order (quiesce -> clk gate -> isolate -> save -> power off, reverse on wake) and why ISO protects downstream domains from crowbar currents.',
    relatedProtocols: ['apb', 'axi4'],
    relatedIps: ['ibex', 'cva6', 'rocket-chip'],
  },
  {
    id: 'rtl-arbitration',
    pillar: 'rtl-design',
    chapter: '05. Interconnects & Architecture',
    number: '1.12',
    title: 'Arbitration & Interconnects: Fixed-Priority vs Round-Robin',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Building glitch-free single-cycle round-robin arbiters using double-width request masking without starvation.',
    deepTheory:
      'Whenever multiple initiators (CPU, DMA, GPU) share an AXI crossbar port or SRAM bank, an arbiter grants access cleanly in 1-hot format. Fixed-priority arbitration (`req & ~(req - 1)`) isolates the lowest set bit in $O(\\log N)$ carry logic, but high-load port 0 starves higher ports indefinitely. True work-conserving Round-Robin rotates priority dynamically after every grant without wasting idle cycles on unrequested ports using the classic double-vector thermometer-mask technique (`req_masked` fallback to `req`).',
    normativeRules: [
      'Always assert `$onehot0(grant)` in SVA—never grant two requesters on the same bus beat.',
      'Hold `grant_q` stable across multi-beat locked/burst transfers (`lock_i`) until `WLAST`/`RLAST` completes (`!stall`).',
      'Register arbitration grants when driving crossbar mux selects to break timing paths between requester `VALID` and downstream `ADDR/DATA`.',
    ],
    commonPitfall:
      'Rotating a naïve counter round-robin pointer every cycle even if a requester isn\'t active—wasting throughput cycles and causing uneven latency.',
    verifiedFix:
      'Use masked priority (`req & mask`) with unmasked fallback (`~|req_masked`) and advance `mask_q` using `gnt - 1` OR thermometer shift on each accepted beat.',
    codeTitle: 'round_robin_arbiter.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `module rr_arbiter #(parameter int N = 4) (
  input  logic         clk, rst_n,
  input  logic [N-1:0] req_i,
  input  logic         hold_i,   // Hold grant during multi-beat burst
  output logic [N-1:0] gnt_o
);
  logic [N-1:0] mask_q, mask_reqs, gnt_masked, gnt_raw;

  // Priority-encode LSB set bit: x & (~x + 1)
  assign mask_reqs  = req_i & mask_q;
  assign gnt_masked = mask_reqs & (~mask_reqs + 1'b1);
  assign gnt_raw    = req_i & (~req_i + 1'b1);
  assign gnt_o      = (|mask_reqs) ? gnt_masked : gnt_raw;

  // Next mask clears current winner and all lower bits: ~((gnt << 1) - 1)
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)              mask_q <= {N{1'b1}};
    else if (|gnt_o && !hold_i) mask_q <= ~((gnt_o << 1) - 1'b1) ^ gnt_o;
  end
endmodule`,
    interviewTakeaway:
      'The double-priority (`mask_reqs ? masked_gnt : raw_gnt`) trick delivers zero-wait-cycle starvation-free round-robin in pure single-cycle carry logic.',
    relatedProtocols: ['axi4', 'chi', 'tl-ul'],
    relatedIps: ['pulp-axi', 'opentitan-tlul-xbar', 'verilog-axi'],
  },
  {
    id: 'rtl-param-generate',
    pillar: 'rtl-design',
    chapter: '05. Interconnects & Architecture',
    number: '1.13',
    title: 'Parameterized Hardware, generate Blocks & Arithmetic Safety',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Writing scalable Silicon IP with localparam assertions, named generate loops, signed extension, and overflow-safe bit growth.',
    deepTheory:
      'Production IPs (`ibex`, `pulp-axi`, `gemmini`) instantiate N cores, configurable `DATA_WIDTH`, and optional ECC using `parameter` and `generate` (`for`, `if`, `case`) evaluated strictly at elaboration time. Furthermore, SystemVerilog arithmetic silently truncates or drops signedness if ONE operand in an expression is unsigned! Always handle bit-growth (`[A+B-1:0]` for $A\\times B$ multiply, `[W:0]` for addition) and explicitly enforce `signed` or `$signed(...)` end-to-end.',
    normativeRules: [
      'Every `generate for (genvar i = 0; ...)` MUST assign a block label (`begin : gen_lane`) for clean hierarchical waveform & formal/UPF path naming.',
      'Never mix signed and unsigned signals in a single expression—SystemVerilog casts the entire expression to UNSIGNED without warning!',
      'Validate illegal parameter combinations at elaboration time using `$fatal` / `initial assert` or synthesis elaboration checks.',
    ],
    commonPitfall:
      'Adding `logic signed [15:0] a` and `logic [15:0] b` drops the sign of `a`, or adding two 8-bit values into an 8-bit RHS silently truncating carry-out.',
    verifiedFix:
      'Cast consistently (`$signed({1\'b0, b})`), size accumulator widths explicitly for bit growth (`$clog2(N)`), and verify signed overflows.',
    codeTitle: 'param_gen_lanes.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `module mac_lanes #(
  parameter int NUM_LANES = 4,
  parameter int DATA_W    = 16
) (
  input  logic signed [DATA_W-1:0]             a_i [NUM_LANES],
  input  logic signed [DATA_W-1:0]             b_i [NUM_LANES],
  output logic signed [(2*DATA_W)+$clog2(NUM_LANES)-1:0] sum_o
);
  logic signed [2*DATA_W-1:0] prod [NUM_LANES];

  for (genvar g = 0; g < NUM_LANES; g++) begin : gen_mul
    assign prod[g] = a_i[g] * b_i[g]; // Full 2*DATA_W precision, no truncation
  end

  always_comb begin
    sum_o = '0;
    for (int i = 0; i < NUM_LANES; i++) sum_o += prod[i];
  end
endmodule`,
    interviewTakeaway:
      'One unsigned operand forces the ENTIRE SystemVerilog expression unsigned; always name `gen_*` blocks and use `$clog2` cleanly.',
    relatedProtocols: ['axi4-stream', 'cxl'],
    relatedIps: ['gemmini', 'pulp-redmule', 'nvdla'],
  },
  {
    id: 'rtl-lint-ppa',
    pillar: 'rtl-design',
    chapter: '05. Interconnects & Architecture',
    number: '1.14',
    title: 'Synthesis Discipline, Lint Sign-Off & PPA Trade-Offs',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Eliminating multi-driven nets, X-propagation traps, and trading Performance, Power & Area (PPA) cleanly in RTL.',
    deepTheory:
      'Clean silicon passes strict RTL linting (Verilator `-Wall`, SpyGlass, Ascent Lint) before hitting synthesis. Key hazards include multi-driven `logic` nets (which SystemVerilog strictly forbids as a compile error, unlike `wire`), `if (sel)` X-optimism (in simulation `if (1\'bx)` falls into the `else` branch as if `sel == 0`, hiding uninitialized control bugs until gate-level simulation!), and bloated mux trees. Optimizing PPA requires balancing unrolling/pipelining (Performance) against resource sharing/bit-width pruning (Area) and operand isolation/clock gating (Power).',
    normativeRules: [
      'Keep combinational loops, width mismatches, unused signals, and inferred latches at ZERO lint waivers whenever possible.',
      'Gate inactive datapath multipliers (`assign mul_a = en ? a : \'0`) for operand isolation so toggling idle inputs doesn\'t burn dynamic power.',
      'Avoid giant priority `if-else if` cascades on wide one-hot vectors; refactor into balanced tree muxes (`case (1\'b1)` or parallel OR-reduction trees).',
    ],
    commonPitfall:
      'Ignoring 32-bit/31-bit width mismatch warnings or relying on `if (x)` falling through to `else` in RTL simulation.',
    verifiedFix:
      'Run X-prop simulation + strict Verilator/SpyGlass checks in CI and use explicit width sizing (`32\'(expr)` or `W\'(...)`).',
    codeTitle: 'operand_isolation_ppa.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `// Operand Isolation: stops dynamic power switching inside multiplier when unused
logic [15:0] op_a_iso, op_b_iso;
assign op_a_iso = mul_valid_i ? operand_a_i : 16'h0000;
assign op_b_iso = mul_valid_i ? operand_b_i : 16'h0000;
assign product  = op_a_iso * op_b_iso;`,
    interviewTakeaway:
      'PPA is a zero-sum triangle: pipelining boosts Fmax (P) at register area/power cost; operand isolation & clock gating slash dynamic power (P) at tiny area cost.',
    relatedProtocols: ['axi4', 'ahb-lite'],
    relatedIps: ['ibex', 'serv', 'opentitan-aes'],
  },

  // ============================================================================
  // PILLAR 2: SYSTEMVERILOG / IEEE 1800 (14 MODULES)
  // ============================================================================
  {
    id: 'sv-datatypes',
    pillar: 'systemverilog',
    chapter: '01. Types, Arrays & Structures',
    number: '2.1',
    title: '2-State vs 4-State Data Types & X-Propagation Semantics',
    scopeBadge: 'RTL & DV Bridge',
    summary:
      'Choosing between 4-state hardware-accurate `logic`/`wire` and 2-state simulation-fast `bit`/`int` without masking X-bugs.',
    deepTheory:
      'SystemVerilog divides types into 4-state (`0, 1, X, Z`: `logic`, `reg`, `wire`, `integer`) and 2-state (`0, 1`: `bit`, `byte`, `shortint`, `int`, `longint`). In RTL design, ALWAYS use 4-state `logic` so uninitialized flip-flops start at `X` (not `0`), exposing missing resets immediately. `logic` replaces both Verilog `reg` and single-driver `wire`, failing cleanly at compile time if accidentally driven by two sources (except inout tri-state pads which still require `wire` / `tri`). In testbenches (`uvm_sequence_item`), 2-state `bit` / `int` cut simulation memory/CPU in half—EXCEPT on DUT interface samplers where you MUST inspect `logic` with `===` / `$isunknown()` to detect DUT X-leaks!',
    normativeRules: [
      'Use `logic` exclusively for single-driver synthesizable RTL nets and registers; reserve `wire` strictly for multi-driver `inout` tri-state buses.',
      'Use `===` (case equality) or `$isunknown(sig)` to test for `X`/`Z` in testbenches; `==` returns `X` (falsy in `if`) whenever either operand has `X`.',
      'Avoid 2-state `bit` inside DUT RTL because it initializes to `0` at time 0, hiding missing reset paths.',
    ],
    commonPitfall:
      'Declaring DUT registers as `bit` (masks unreset flops by defaulting to `0`) or checking `if (sig == 1\'bx)` (always evaluates FALSE in SV!).',
    verifiedFix:
      'Use `logic` in RTL, `bit`/`int` inside abstract UVM transactions, and `assert property (@(posedge clk) !$isunknown(valid))` on pins.',
    codeTitle: 'sv_4state_vs_2state.sv',
    codeLanguage: 'SystemVerilog',
    codeExample: `logic [31:0] bus_data; // 4-state (0, 1, X, Z) - catches unreset RTL!
bit   [31:0] tb_rand;  // 2-state (0, 1) - fast scoreboard/transaction storage

initial begin
  bus_data = 32'hDEAD_XXXX;
  if (bus_data == 32'hDEAD_XXXX)  $display("NEVER RUNS (== yields X!)");
  if (bus_data === 32'hDEAD_XXXX) $display("MATCHES X cleanly via ===");
  if ($isunknown(bus_data))       $error("Unexpected X/Z on bus_data!");
end`,
    interviewTakeaway:
      '2-state `bit` speeds up testbenches; 4-state `logic` is mandatory in RTL so uninitialized hardware defaults to `X` instead of hiding behind `0`.',
    relatedProtocols: ['axi4', 'apb'],
    relatedIps: ['core-v-verif', 'ibex'],
  },
  {
    id: 'sv-packed-unpacked',
    pillar: 'systemverilog',
    chapter: '01. Types, Arrays & Structures',
    number: '2.2',
    title: 'Packed vs Unpacked Arrays, Structs, Unions & Bit Slicing',
    scopeBadge: 'RTL & DV Bridge',
    summary:
      'Memory layout, endianness, slice syntax (`+:`, `-:`), and zero-overhead packed structures for bus payloads and AXI packets.',
    deepTheory:
      'Packed dimensions precede the identifier (`logic [3:0][7:0] word;`) and guarantee contiguous bit storage usable directly in arithmetic, shifts, and single-vector assignments (`word = 32\'h12345678`). Unpacked dimensions follow the identifier (`logic [7:0] mem [0:255];`) and represent separate slots/SRAM words—efficient for memories, but cannot be assigned bit-slice literals as one flattened vector without streaming `{>>{...}}`. `typedef struct packed` packs heterogeneous control/address fields into contiguous hardware wires synthesized cleanly by every tool.',
    normativeRules: [
      'Use `struct packed` for AXI/PCIe header bundles routed across ports so bit-packing stays deterministic.',
      'Use indexed part-selects `data[idx*8 +: 8]` (variable base, constant width) because `data[hi:lo]` is illegal in SystemVerilog when both bounds vary.',
      'Use streaming operators `{>>{array}}` / `{<<byte{word}}` to reverse endianness or convert unpacked byte streams into packed vectors cleanly.',
    ],
    commonPitfall:
      'Writing `data[(i+1)*8-1 : i*8]` inside a procedural loop, which fails compilation because non-constant slice widths are illegal.',
    verifiedFix:
      'Replace dynamic range slices with indexed part-select `data[i*8 +: 8]` and bundle wire payloads via `typedef struct packed`.',
    codeTitle: 'sv_packed_structs.sv',
    codeLanguage: 'SystemVerilog',
    codeExample: `typedef struct packed {
  logic [3:0]  id;
  logic [31:0] addr;
  logic [7:0]  len;
  logic [2:0]  size;
} axi_ar_pkt_t; // Contiguous 47-bit vector!

axi_ar_pkt_t ar_pkt;
logic [63:0] rdata;
logic [7:0]  selected_byte;

always_comb begin
  // Indexed part-select (legal for dynamic byte_lane!)
  selected_byte = rdata[ar_pkt.addr[2:0]*8 +: 8];
end`,
    interviewTakeaway:
      'Packed = contiguous vector (placed left of name); Unpacked = array of slots (placed right of name). Always use `+: width` for dynamic slicing.',
    relatedProtocols: ['axi4', 'pcie-gen5'],
    relatedIps: ['pulp-axi', 'cva6'],
  },
  {
    id: 'sv-dyn-assoc-queues',
    pillar: 'systemverilog',
    chapter: '01. Types, Arrays & Structures',
    number: '2.3',
    title: 'Dynamic Arrays, Associative Arrays, Queues & Array Methods',
    scopeBadge: 'Verification / TB',
    summary:
      'Non-synthesizable verification collections for sparse 64-bit memory models, FIFOs, and scoreboard searching.',
    deepTheory:
      'Simulation testbenches cannot allocate $2^{64}$ bytes for a 64-bit RAM model! SystemVerilog provides three heap collections: Dynamic Arrays (`byte buf[]; buf = new[len];`), Queues (`txn_t q[$]; q.push_back(t); q.pop_front();`), and Associative Arrays (`logic [63:0] sparse_mem [logic [63:0]];`), which allocate hash entries ONLY for addresses actually written! Array locator methods (`.find() with (item.id == x)`, `.unique()`, `.sum()`, `.sort()`) turn complex scoreboard lookups into concise one-liners.',
    normativeRules: [
      'Use Associative Arrays indexed by `bit [63:0]` or transaction ID (`mem[addr]`) for golden memory models and out-of-order AXI scoreboards.',
      'Use Queues (`[$]`) for O(1) FIFO buffering (`push_back`/`pop_front`/`size()`), NOT dynamic arrays reallocated on every beat.',
      'Always check `.exists(key)` on associative arrays before reading to prevent default-value false positives and scoreboard warnings.',
    ],
    commonPitfall:
      'Allocating a fixed `logic [63:0] mem [0:(1<<32)-1]` in simulation (crashes simulator with OOM) or misreading `.find()` returning a queue of matching items rather than a single scalar.',
    verifiedFix:
      'Use associative memory `bit [7:0] ref_mem [bit [63:0]]` and check `if (ref_mem.exists(addr))` on reads.',
    codeTitle: 'sv_collections.sv',
    codeLanguage: 'SystemVerilog',
    codeExample: `// Sparse 64-bit Reference Memory + In-Flight AXI ID Queue Table
bit [63:0] ref_mem [bit [63:0]];          // Associative: only allocates written addresses!
axi_item   pending_by_id [bit [3:0]][$];  // Per-ID FIFO queue for OoO response checking!

function void model_write(bit [63:0] addr, bit [63:0] data);
  ref_mem[addr] = data;
endfunction

function bit [63:0] model_read(bit [63:0] addr);
  return ref_mem.exists(addr) ? ref_mem[addr] : 64'h0;
endfunction`,
    interviewTakeaway:
      'Associative arrays solve sparse 64-bit memory modeling and per-ID out-of-order scoreboards; queues give O(1) push/pop FIFOs.',
    relatedProtocols: ['axi4', 'chi'],
    relatedIps: ['core-v-verif', 'boom'],
  },
  {
    id: 'sv-enum-pkg',
    pillar: 'systemverilog',
    chapter: '01. Types, Arrays & Structures',
    number: '2.4',
    title: 'Enums, Typedefs, Packages (package/import) & Compilation Units',
    scopeBadge: 'RTL & DV Bridge',
    summary:
      'Strong type safety, self-iterating enums, and sharing parameters/types across RTL and UVM via dedicated packages.',
    deepTheory:
      'By default, `enum {IDLE, RUN} st;` infers 32-bit `int`—bad for RTL width control and waveform size. Specifying an explicit 4-state base type (`typedef enum logic [1:0] {...} state_e;`) fixes exact bit width and propagates X in hardware while letting waveforms display human-readable ASCII state names (`ST_WAIT`). Encapsulating `typedef`s and `localparam`s inside a `package` avoids global `$unit` namespace pollution and ensures RTL DUT and UVM testbench compile against the exact same structs and opcodes.',
    normativeRules: [
      'Always define explicit bit widths and 4-state `logic` base types on RTL enums (`typedef enum logic [2:0]`).',
      'Import packages inside module headers or scopes (`import axi_pkg::*;` before port list) rather than polluting `$unit`.',
      'Use `.name()` in `$display`/`uvm_info` debug logs and `.first()`, `.next()`, `.num()` to sweep enum corner cases in coverage/tests.',
    ],
    commonPitfall:
      'Assigning an arbitrary integer vector directly to an enum variable without `enum_t\'(val)` static casting (compile error in strict SystemVerilog), or `import pkg::*;` in `$unit`.',
    verifiedFix:
      'Place `import my_pkg::*;` inside module headers (`module top import my_pkg::*; (...)`) and use `$cast` / static enum casts when decoding incoming wire integers.',
    codeTitle: 'sv_pkg_and_enum.sv',
    codeLanguage: 'SystemVerilog',
    codeExample: `package bus_pkg;
  typedef enum logic [1:0] {
    RESP_OKAY   = 2'b00,
    RESP_EXOKAY = 2'b01,
    RESP_SLVERR = 2'b10,
    RESP_DECERR = 2'b11
  } axi_resp_e;
endpackage

module bus_dec import bus_pkg::*; (
  input  logic [1:0] raw_resp_i,
  output axi_resp_e  resp_o
);
  assign resp_o = axi_resp_e'(raw_resp_i); // Explicit cast to strongly-typed enum
endmodule`,
    interviewTakeaway:
      'Packages share single-source-of-truth types across RTL & UVM; explicit `enum logic [W-1:0]` eliminates 32-bit `int` bloat and displays state names in wave viewers.',
    relatedProtocols: ['axi4', 'tl-ul'],
    relatedIps: ['ibex', 'opentitan-aes'],
  },
  {
    id: 'sv-procedural',
    pillar: 'systemverilog',
    chapter: '02. Procedural Constructs & Interfaces',
    number: '2.5',
    title: 'always_comb, always_ff, unique/priority case & inside',
    scopeBadge: 'Synthesizable RTL',
    summary:
      'Compiler-enforced synthesis intent and runtime overlap/completeness assertions built right into SystemVerilog branch statements.',
    deepTheory:
      'SystemVerilog replaced error-prone `// synopsys parallel_case` / `full_case` comments (which altered synthesis WITHOUT changing simulation) with native keywords `unique case`, `unique0 case`, and `priority case`. Both simulation and synthesis understand them: `unique case` checks that EXACTLY ONE branch matches at runtime (issuing a simulation error if zero match or multiple match) AND tells synthesis to build a flat parallel mux! Meanwhile, the `inside` operator (`addr inside {[32\'h1000:32\'h1FFF], 32\'h8000}`) writes crystal-clear address decoding and constraint sets.',
    normativeRules: [
      'Use `unique case` only when all arms are mutually exclusive and exhaustive (with a `default:` arm); use `unique0` if no match is valid.',
      'Use `inside` with `?` don\'t-care wildcards (`opcode inside {4\'b10??}`) for clean instruction decoders instead of legacy `casex` (which dangerously masks `X` inputs!).',
      'Prefer `casez` or `inside` over `casex`, because `casex` treats actual hardware `X` faults as wildcards and hides X-propagation bugs.',
    ],
    commonPitfall:
      'Using `casex` for instruction decoding—if an uninitialized X leaks onto the opcode bus, `casex` silently matches the first arm instead of propagating error.',
    verifiedFix:
      'Use `case (opcode) inside` or `casez`, where `?` only matches explicit `z`/`?` pattern literals and refuses to swallow `X` values.',
    codeTitle: 'sv_unique_inside.sv',
    codeLanguage: 'SystemVerilog RTL',
    codeExample: `always_comb begin
  dec_hit = 1'b0;
  // Safe pattern match using 'inside': X values on addr do NOT false-match!
  if (addr inside {[32'h4000_0000 : 32'h4000_0FFF]}) begin
    dec_hit = 1'b1;
  end

  unique case (1'b1) // Synthesizes parallel mux & asserts runtime 1-hot!
    sel_uart: rdata = uart_rdata;
    sel_spi:  rdata = spi_rdata;
    sel_gpio: rdata = gpio_rdata;
    default:  rdata = 32'hDEAD_BEEF;
  endcase
end`,
    interviewTakeaway:
      'Never use `casex` (swallows `X`); use `inside` or `unique case` so simulation assertions match the exact mux synthesis builds.',
    relatedProtocols: ['apb', 'axi4-lite'],
    relatedIps: ['ibex', 'cva6'],
  },
  {
    id: 'sv-interfaces-clocking',
    pillar: 'systemverilog',
    chapter: '02. Procedural Constructs & Interfaces',
    number: '2.6',
    title: 'Interfaces, modports, Virtual Interfaces & Clocking Blocks',
    scopeBadge: 'RTL & DV Bridge',
    summary:
      'Bundling protocol wires with directional `modport`s and eliminating testbench-DUT race conditions via `clocking` skews.',
    deepTheory:
      'Wiring 40+ AXI signals manually across dozens of hierarchy levels causes typos and maintenance nightmares. `interface` encapsulates protocol wires, SVA assertions, and directional `modport` views (`modport master (...)`, `modport slave (...)`). For verification, SystemVerilog `clocking` blocks solve the #1 testbench-DUT race condition: `default input #1step output #0` (or `#1ns`) guarantees the driver updates pins strictly AFTER the active clock edge settles (no NBA race with DUT `always_ff`) while the monitor samples inputs from the pre-clock-edge (`#1step` Observed) stable value right BEFORE DUT flops update!',
    normativeRules: [
      'Always drive and sample DUT pins through `clocking` blocks inside `uvm_driver` and `uvm_monitor` (e.g., `@(vif.drv_cb); vif.drv_cb.valid <= 1\'b1;`).',
      'Pass `virtual axi_if.DRV` into UVM classes via `uvm_config_db`—remember classes are dynamic software objects and cannot hold static RTL ports directly.',
      'Embed protocol SVA checkers directly inside the `interface` (or `bind` module) so assertions automatically run across every instance of that bus.',
    ],
    commonPitfall:
      'Sampling `vif.rdata` directly on `@(posedge vif.clk)` inside a monitor—racing with the DUT\'s `always_ff` NBA update and randomly sampling pre-edge vs post-edge data across simulators.',
    verifiedFix:
      'Declare a `clocking mon_cb @(posedge clk); default input #1step; input ...; endclocking` and read `vif.mon_cb.rdata` every edge.',
    codeTitle: 'axi_lite_if_cb.sv',
    codeLanguage: 'SystemVerilog Interface',
    codeExample: `interface apb_if (input logic clk, input logic rst_n);
  logic        psel, penable, pwrite, pready, pslverr;
  logic [31:0] paddr, pwdata, prdata;

  // Driver clocking block: samples pready before edge, drives after edge (#1ns)
  clocking drv_cb @(posedge clk);
    default input #1step output #1ns;
    output psel, penable, pwrite, paddr, pwdata;
    input  pready, prdata, pslverr;
  endclocking

  // Monitor clocking block: passive input-only #1step race-free sampling!
  clocking mon_cb @(posedge clk);
    default input #1step;
    input psel, penable, pwrite, paddr, pwdata, pready, prdata, pslverr;
  endclocking

  modport dut_slave (input clk, rst_n, psel, penable, pwrite, paddr, pwdata,
                     output pready, prdata, pslverr);
endinterface`,
    interviewTakeaway:
      '`#1step` samples the stable pre-clock-edge region cleanly, while clocking block `output` drives via `<=` safely into the Re-NBA region—eliminating all TB-DUT races.',
    relatedProtocols: ['apb', 'axi4-lite', 'axi4'],
    relatedIps: ['core-v-verif', 'opentitan-uart'],
  },
  {
    id: 'sv-scheduling-regions',
    pillar: 'systemverilog',
    chapter: '02. Procedural Constructs & Interfaces',
    number: '2.7',
    title: 'IEEE 1800 Event Scheduling Regions & Race-Free Timing',
    scopeBadge: 'Verification / TB',
    summary:
      'Navigating Preponed, Active, Inactive, NBA, Observed, Reactive, and Re-NBA regions inside a single simulation time step.',
    deepTheory:
      'IEEE 1800 defines a stratified event queue for every discrete timestamp `T` so Verilog RTL, SVA assertions, `program` / Reactive testbenches, and PLI execute deterministically. At `posedge clk`: (1) **Preponed** samples values for `#1step` clocking inputs and SVA `$sampled()`; (2) **Active** runs `module` `always` / `assign`; (3) **Inactive** (`#0`); (4) **NBA** commits `<=` flip-flop outputs (and loops back to Active for comb fanout!); (5) **Observed** evaluates concurrent SVA property pass/fail once all RTL settles; (6) **Reactive / Re-NBA** runs `program` blocks and clocking-block outputs; (7) **Postponed** runs `$strobe` / `$monitor`.',
    normativeRules: [
      'Remember concurrent SVA assertions (`assert property`) sample inputs in Preponed (`$sampled`) and evaluate in Observed—so they automatically see stable pre-clock values without race.',
      'Avoid `#0` delays as a "race fix"—`#0` only pushes a statement to Inactive and creates fragile execution order dependencies.',
      'Use `$strobe` instead of `$display` when printing registered values modified via `<=` in the current clock cycle.',
    ],
    commonPitfall:
      'Calling `$display("q=%0h", q)` immediately after `q <= next_q;` on `@(posedge clk)` and wondering why it prints the OLD value (Active runs before NBA!).',
    verifiedFix:
      'Use `$strobe` (executes in Postponed after NBA settles) or sample via clocking blocks `#1step`.',
    codeTitle: 'sv_event_regions.sv',
    codeLanguage: 'SystemVerilog Timing',
    codeExample: `always_ff @(posedge clk) begin
  cnt <= cnt + 1'b1;
  $display("[Active]    cnt = %0d (OLD value before NBA!)", cnt);
  $strobe ("[Postponed] cnt = %0d (NEW value after NBA!)",  cnt);
end`,
    interviewTakeaway:
      'Preponed (#1step / SVA sample) → Active (blocking/eval) → NBA (`<=` commit) → Observed (SVA eval) → Reactive (TB) → Postponed (`$strobe`).',
    relatedProtocols: ['axi4', 'apb'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'sv-oop-classes',
    pillar: 'systemverilog',
    chapter: '03. OOP & Constrained Random',
    number: '2.8',
    title: 'OOP: Classes, Inheritance, virtual Polymorphism & Abstract Bases',
    scopeBadge: 'Verification / TB',
    summary:
      'How `virtual` methods enable dynamic dispatch, UVM factory overrides, and extensible protocol transaction families.',
    deepTheory:
      'SystemVerilog classes enable object-oriented testbenches (`uvm_object`, `uvm_component`). Crucially, methods in SV are NON-virtual by default! If a base handle `BaseTxn h = ChildErrTxn::new();` calls a non-virtual `print()`, SV statically invokes `BaseTxn::print()`. Marking methods `virtual` enables runtime vtable polymorphism so UVM factory overrides (`type_id::create`) swap driver/transaction behavior seamlessly without touching parent code. `virtual class` (abstract class) + `pure virtual function` enforce strict interface contracts across agents and scoreboards.',
    normativeRules: [
      'Always declare overrideable methods (`body`, `run_phase`, `do_copy`, `convert2string`) with the `virtual` keyword.',
      'Always call `super.new(...)` as the very first executable statement inside a derived constructor.',
      'Use `$cast(child_h, base_h)` when downcasting a base handle back to a derived subclass; never assign blindly without checking `$cast` return status.',
    ],
    commonPitfall:
      'Forgetting `virtual` on a base class task/method or passing a class handle by value expecting a deep clone instead of copying the object.',
    verifiedFix:
      'Mark all polymorphic hooks `virtual`, guard every downcast with `if (!$cast(...)) \`uvm_fatal(...)`, and implement explicit `clone()` / `do_copy()`.',
    codeTitle: 'sv_oop_polymorphism.sv',
    codeLanguage: 'SystemVerilog OOP',
    codeExample: `virtual class BaseBusTxn; // Abstract base contract
  rand bit [31:0] addr;
  pure virtual function string kind_str();
  virtual function void display();
    $display("[%s] addr=0x%08h", kind_str(), addr);
  endfunction
endclass

class AxiErrTxn extends BaseBusTxn;
  rand bit [1:0] bresp;
  virtual function string kind_str(); return "AXI_ERR"; endfunction
  virtual function void display();
    super.display();
    $display("  -> injected bresp=%0b", bresp);
  endfunction
endclass`,
    interviewTakeaway:
      'Without `virtual`, base handles invoke base methods statically; `$cast` checks legal runtime downcasting; `pure virtual` creates interface contracts.',
    relatedProtocols: ['axi4', 'pcie-gen5'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'sv-param-classes-copy',
    pillar: 'systemverilog',
    chapter: '03. OOP & Constrained Random',
    number: '2.9',
    title: 'Parameterized Classes, Static Members & Deep vs Shallow Copy',
    scopeBadge: 'Verification / TB',
    summary:
      'Understanding static specialization types (`C#(int)` vs `C#(byte)`), shallow object cloning traps, and singleton config.',
    deepTheory:
      'A parameterized class `class Packet #(int W = 32);` creates a completely distinct type (and separate set of `static` variables!) for every unique parameter specialization. Meanwhile, built-in `new src_obj` performs a SHALLOW copy: it duplicates top-level scalar fields AND copies nested object handles by reference—so mutating a sub-object in the copy silently corrupts the original! Production scoreboards therefore implement recursive deep `copy()` (`do_copy()` in UVM) so queued expected transactions remain immune to downstream driver mutations.',
    normativeRules: [
      'Pass `Packet#(64)` explicitly as a distinct type when connecting TLM ports (`uvm_analysis_port #(axi_txn#(64))`).',
      'Implement deep `copy()` whenever transactions hold nested sub-objects or dynamic queues mutated after creation.',
      'Be aware `static` properties inside a class are shared globally across ALL instances (great for transaction ID counters, dangerous if unintended in multi-agent benches).',
    ],
    commonPitfall:
      'Using `tr_copy = new tr;` when `tr` contains a nested `PayloadObj` handle—then mutating `tr_copy.pay.data[0]` corrupts the scoreboard\'s golden copy.',
    verifiedFix:
      'Implement deep copy creating fresh nested objects, or clone via UVM `do_copy(uvm_object rhs)`.',
    codeTitle: 'sv_deep_copy.sv',
    codeLanguage: 'SystemVerilog OOP',
    codeExample: `class SubHeader;
  bit [7:0] tag;
  function SubHeader deep_copy();
    deep_copy = new();
    deep_copy.tag = this.tag;
  endfunction
endclass

class Frame #(int DATA_W = 64);
  static int unsigned next_uid = 0; // Per-(DATA_W) global ID counter
  int unsigned        uid;
  SubHeader           hdr;
  bit [DATA_W-1:0]    payload;

  function new(); uid = next_uid++; hdr = new(); endfunction
  function Frame#(DATA_W) deep_copy();
    deep_copy = new();
    deep_copy.payload = this.payload;
    deep_copy.hdr     = this.hdr.deep_copy(); // Independent heap object!
  endfunction
endclass`,
    interviewTakeaway:
      'Shallow copy (`new obj`) shares nested class handles; deep copy clones the full object tree. Each `Class#(Param)` gets its own static state.',
    relatedProtocols: ['axi4-stream', 'eth-10g'],
    relatedIps: ['verilog-ethernet'],
  },
  {
    id: 'sv-constrained-random',
    pillar: 'systemverilog',
    chapter: '03. OOP & Constrained Random',
    number: '2.10',
    title: 'Constrained Randomization: rand/randc, dist, solve..before & Soft',
    scopeBadge: 'Verification / TB',
    summary:
      'Generating legal yet adversarial protocol corner cases with bidirectional constraint solvers without skewing probabilities.',
    deepTheory:
      'Manual directed tests miss subtle multi-interface corner cases. SystemVerilog\'s constraint solver resolves ALL active constraints simultaneously (bidirectionally!). `rand` generates uniform independent values; `randc` cycles through all permutations without repeating until every value is hit. When two correlated variables appear in an implication (`sel == 0 -> data == 0`), the solver picks from the combined valid solution space—skewing `sel == 0` probability to 1/65536 unless you direct the solver with `solve sel before data;`. `soft` constraints establish default ranges that inline test constraints (`randomize() with { ... }`) can override cleanly without solver conflicts!',
    normativeRules: [
      'Always check `if (!txn.randomize()) \`uvm_fatal(...)` because failed randomization leaves variables silently unchanged.',
      'Use `solve A before B;` whenever `A` controls `B`\'s bit-width/implication and you want uniform distribution on `A`.',
      'Declare baseline protocol/performance constraints `soft` so error-injection or corner-case tests can override them cleanly (`randomize() with { len == 255; }`).',
    ],
    commonPitfall:
      'Writing implication `(en == 1) -> (burst_len == 15)` without `solve en before burst_len`—causing `en == 1` to occur only ~1 in 256 trials instead of 50%!',
    verifiedFix:
      'Add `solve en before burst_len;` or explicit `dist {0 := 50, 1 := 50}`, and mark overridable baseline ranges `soft`.',
    codeTitle: 'sv_constraints.sv',
    codeLanguage: 'SystemVerilog Verification',
    codeExample: `class axi_rand_txn;
  rand bit        wrap_burst;
  rand bit [7:0]  len;
  rand bit [2:0]  size;
  rand bit [31:0] addr;

  // Bidirectional 4KB boundary legality constraint (ARM IHI 0022E)
  constraint c_axi_4kb {
    ((addr[11:0] + ((len + 1) << size)) <= 4096);
    size <= 3'd3;
  }

  // Keep wrap_burst 50/50 even though wrap allows only len in {1,3,7,15}!
  constraint c_wrap_legal {
    solve wrap_burst before len;
    wrap_burst -> (len inside {1, 3, 7, 15});
  }

  // Overridable default burst length distribution
  constraint c_len_dist {
    soft len dist { 0 := 30, [1:7] := 50, [8:255] := 20 };
  }
endclass`,
    interviewTakeaway:
      'Solvers solve ALL active constraints bidirectionally—use `solve..before` to restore probability fairness (no hardware-state impact) and `soft` for test overrides.',
    relatedProtocols: ['axi4', 'pcie-gen5'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'sv-concurrency-ipc',
    pillar: 'systemverilog',
    chapter: '04. Concurrency, Coverage & Assertions',
    number: '2.11',
    title: 'Concurrency & IPC: fork/join, wait/disable fork, Mailboxes & Events',
    scopeBadge: 'Verification / TB',
    summary:
      'Spawning parallel stimulus/monitor threads cleanly, killing hung watchdog branches, and synchronizing via mailboxes/semaphores.',
    deepTheory:
      'Hardware executes in parallel, so testbenches coordinate concurrent drivers, monitors, and timeout watchdogs using `fork`: `join` waits for ALL child threads; `join_any` resumes as soon as the FIRST child completes (used for race-to-finish + timeout patterns); `join_none` launches background threads immediately without blocking. A classic trap inside `for` loops spawning `fork..join_none` is closure capture of the shared loop counter `i`—all threads wake up seeing `i == N` unless you copy `automatic int idx = i;` inside the loop body! Similarly, always wrap `disable fork` inside an isolated `fork ... join` guard so you don\'t accidentally kill unrelated parent background threads.',
    normativeRules: [
      'Always capture loop indices into a local `automatic` variable before `fork..join_none` inside loops.',
      'Wrap timeout patterns (`fork .. join_any; disable fork;`) inside an outer `begin ... end` or nested `fork .. join` guard to isolate `disable fork` strictly to that block\'s children.',
      'Use `mailbox #(txn_t)` for producer-consumer TLM queuing and `semaphore` for mutex access to shared physical pins or virtual interfaces.',
    ],
    commonPitfall:
      'Running `disable fork;` inside a driver/sequence that previously spawned persistent background threads—terminating the whole agent silently.',
    verifiedFix:
      'Isolate timeouts inside a wrapper `fork begin fork .. join_any; disable fork; end join` and copy `automatic` vars before spawning.',
    codeTitle: 'sv_fork_timeout_safe.sv',
    codeLanguage: 'SystemVerilog Verification',
    codeExample: `task automatic wait_done_with_timeout(int timeout_cycles);
  // Isolated sub-fork guarantees disable fork ONLY kills this timeout pair!
  fork begin : iso_guard
    fork
      begin
        @(posedge vif.done);
        $display("Transaction completed cleanly.");
      end
      begin
        repeat (timeout_cycles) @(posedge vif.clk);
        $fatal(1, "Timeout waiting for vif.done!");
      end
    join_any
    disable fork;
  end join
endtask`,
    interviewTakeaway:
      'Always copy loop vars to `automatic` inside `fork..join_none` loops, and wrap `fork..join_any; disable fork;` in an outer guard block.',
    relatedProtocols: ['axi4', 'i2c', 'spi'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'sv-functional-coverage',
    pillar: 'systemverilog',
    chapter: '04. Concurrency, Coverage & Assertions',
    number: '2.12',
    title: 'Functional Coverage: covergroup, bins, illegal/ignore & cross',
    scopeBadge: 'Verification / TB',
    summary:
      'Measuring verification completeness against the vPlan using explicit range bins, transition sequences, illegal error traps, and cross coverage.',
    deepTheory:
      'Code coverage (line/branch/toggle/FSM) proves ONLY that RTL lines executed—NOT that all protocol features or legal combinations were tested! Functional coverage (`covergroup`) samples high-level protocol scenarios from the passive `uvm_monitor` or `uvm_subscriber`. Defining explicit `bins`, sequence transitions (`bins wrap_to_incr = (2 => 1)`), `ignore_bins` (for architecturally unimplemented widths), `illegal_bins` (which flag immediate errors if forbidden states ever occur), and `cross` products (`cross cp_burst, cp_size, cp_stall`) provides mathematical sign-off closure.',
    normativeRules: [
      'Sample `covergroup` ONLY on actual observed transactions at the passive monitor (`iff (vif.rst_n && handshake)`), NEVER on randomized stimulus pre-driver.',
      'Enable `option.per_instance = 1;` if multiple agent instances share a covergroup so each interface\'s coverage hole stays visible.',
      'Prune impossible cross-combinations cleanly using `ignore_bins` in `cross` so sign-off targets legitimately reach 100%.',
    ],
    commonPitfall:
      'Putting `covergroup` inside the generator/sequence before checking whether the DUT actually received or accepted the transaction, or leaving unobtainable 64-auto-bin explosions in `cross`.',
    verifiedFix:
      'Bind `covergroup` inside a passive `uvm_subscriber` connected to `monitor.ap`, define concise explicit bins, and prune illegal cross tuples with `ignore_bins`.',
    codeTitle: 'sv_covergroup_axi.sv',
    codeLanguage: 'SystemVerilog Coverage',
    codeExample: `covergroup cg_axi_wr @(posedge vif.clk iff (vif.rst_n && vif.AWVALID && vif.AWREADY));
  option.per_instance = 1;

  cp_burst: coverpoint vif.AWBURST {
    bins fixed       = {2'b00};
    bins incr        = {2'b01};
    bins wrap        = {2'b10};
    illegal_bins rsv = {2'b11}; // Reserved AXI burst type triggers immediate error!
  }
  cp_len: coverpoint vif.AWLEN {
    bins single  = {0};
    bins short_b = {[1:15]};
    bins max_b   = {255};
  }
  // Cross matrix omitting impossible WRAP bursts with len=255
  cx_burst_x_len: cross cp_burst, cp_len {
    ignore_bins illegal_wrap = binsof(cp_burst.wrap) && binsof(cp_len.max_b);
  }
endgroup`,
    interviewTakeaway:
      'Code coverage asks "Did my simulator execute every RTL line?"; Functional coverage asks "Did I observe every spec requirement & cross corner case at the pins?"',
    relatedProtocols: ['axi4', 'apb', 'pcie-gen5'],
    relatedIps: ['core-v-verif', 'opentitan-aes'],
  },
  {
    id: 'sv-sva-temporal',
    pillar: 'systemverilog',
    chapter: '04. Concurrency, Coverage & Assertions',
    number: '2.13',
    title: 'SystemVerilog Assertions (SVA): Temporal Operators & Sequences',
    scopeBadge: 'RTL & DV Bridge',
    summary:
      'Encoding zero-cycle bus invariants with `|->`, `|=>`, `##[m:n]`, `$rose`/`$fell`/`$past`/`$stable`, and repetition operators.',
    deepTheory:
      'Immediate `assert (cond)` checks combinational conditions at execution time and is prone to delta-cycle glitches. Concurrent SVA (`assert property`) samples in Preponed and spans cycles cleanly: Overlapped implication (`A |-> B`) checks antecedent `A` and consequent `B` starting in the SAME cycle; Non-overlapped (`A |=> B`, shorthand for `A |-> ##1 B`) checks starting NEXT cycle. Always guard with `disable iff (!rst_n)` so active resets cancel pending assertions cleanly. Consecutive repetition (`sig[*3]`), non-consecutive (`sig[=2]`), goto repetition (`sig[->1]`), and `throughout` verify exact handshake stability.',
    normativeRules: [
      'Always wrap protocol SVA properties with `disable iff (!rst_n)` so asynchronous resets clear multi-cycle obligations without false fails.',
      'Check AXI stability rule via `VALID && !READY |=> VALID && $stable(ADDR)` (using `|=>` to check the NEXT rising edge!).',
      'Watch out for vacuous passes: if antecedent `A` never triggers, `A |-> B` passes vacuously! Pair every critical assertion with a `cover property` of its trigger.',
    ],
    commonPitfall:
      'Using `##[1:$]` unbounded liveness consequents without strong/weak fairness or forgetting `disable iff (!rst_n)` (causing spurious fails during reset).',
    verifiedFix:
      'Pair bounded liveness timeouts (`##[1:16]`), `disable iff (!rst_n)`, and matching `cover property` witnesses.',
    codeTitle: 'sv_sva_axi_rules.sv',
    codeLanguage: 'SystemVerilog Assertions (SVA)',
    codeExample: `// 1. AXI4 Rule: Once AWVALID=1 without AWREADY, AWVALID stays 1 and payload stays stable next cycle
property p_aw_valid_stable;
  @(posedge ACLK) disable iff (!ARESETn)
  (AWVALID && !AWREADY) |=> (AWVALID && $stable({AWADDR, AWLEN, AWSIZE, AWBURST}));
endproperty
ast_aw_stable: assert property (p_aw_valid_stable)
  else $error("AXI4 Violation: AW payload mutated before AWREADY!");

// 2. Non-vacuous witness cover: prove we actually tested backpressure!
cov_aw_stall: cover property (@(posedge ACLK) disable iff (!ARESETn) AWVALID && !AWREADY ##1 AWVALID && AWREADY);`,
    interviewTakeaway:
      '`|->` starts consequent on the SAME cycle; `|=>` starts NEXT cycle; `$stable(x)` checks `x == $past(x)`. Always pair `assert` with `cover` to catch vacuous passes.',
    relatedProtocols: ['axi4', 'apb', 'tl-ul'],
    relatedIps: ['opentitan-tlul-xbar', 'core-v-verif'],
  },
  {
    id: 'sv-formal-bind-dpi',
    pillar: 'systemverilog',
    chapter: '04. Concurrency, Coverage & Assertions',
    number: '2.14',
    title: 'Formal SVA (assert/assume/cover), bind & DPI-C Interfacing',
    scopeBadge: 'RTL & DV Bridge',
    summary:
      'Separating verification monitors from synthesizable RTL via `bind`, formal assumptions vs proofs, and calling C/C++ golden models.',
    deepTheory:
      'Never paste verification SVA directly inside production RTL modules if teams want pure synthesis separation—use SystemVerilog `bind` (`bind axi_ctrl axi_sva_chk u_chk (.*);`) to attach SVA modules passively from outside! In Formal Verification (JasperGold, VC Formal, SymbiYosys), `assume property` constrains legal environment inputs, `assert property` exhaustively proves RTL never violates specs across ALL reachable states, and `cover property` generates reachable counterexamples/witnesses. Meanwhile, DPI-C (`import "DPI-C" function ...`) invokes compiled C/C++ reference models (e.g., OpenSSL AES, RISC-V Spike ISS, PCIe CRC) directly inside SystemVerilog with near-zero overhead compared to legacy VPI.',
    normativeRules: [
      'Use `bind` in testbench tops to attach SVA/coverage modules onto DUT internal signals without modifying checked-in RTL files.',
      'In Formal Verification, NEVER `assume` outputs or internal DUT signals (that masks real RTL bugs!); only `assume` input protocol boundaries.',
      'Keep DPI-C exported/imported functions time-consuming ONLY if explicitly typed `task`, and convert 4-state `logic` cleanly using `svLogicVecVal` or pass 2-state `bit`/`int`.',
    ],
    commonPitfall:
      'Over-constraining a Formal `assume` (e.g. assuming `rst_n == 1` forever or assuming an internal state), which causes ALL formal assertions to pass trivially while silicon fails!',
    verifiedFix:
      'Run formal over-constraint / vacuity audits (`cover` every input corner) and verify golden C/C++ models cleanly via 2-state DPI-C functions.',
    codeTitle: 'sv_bind_and_dpi.sv',
    codeLanguage: 'SystemVerilog Formal & DPI-C',
    codeExample: `// 1. Bind passive SVA checker cleanly onto an existing RTL module without touching RTL source
bind aes_core aes_sva_checker #(.KEY_W(256)) u_aes_chk (
  .clk_i   (clk_i),
  .rst_ni  (rst_ni),
  .valid_i (data_in_valid_i),
  .ready_o (ready_o)
);

// 2. Direct Programming Interface (DPI-C) calling C golden AES model inside UVM Scoreboard
import "DPI-C" function void c_aes256_encrypt(
  input  byte unsigned key[32],
  input  byte unsigned pt[16],
  output byte unsigned ct[16]
);`,
    interviewTakeaway:
      '`bind` attaches SVA without touching RTL; in Formal, `assume` inputs and `assert` outputs (never over-assume internal state); DPI-C embeds C/C++ golden models natively.',
    relatedProtocols: ['tl-ul-integrity', 'axi4'],
    relatedIps: ['opentitan-aes', 'ibex', 'core-v-verif'],
  },

  // ============================================================================
  // PILLAR 3: UVM METHODOLOGY / IEEE 1800.2 (14 MODULES)
  // ============================================================================
  {
    id: 'uvm-hierarchy',
    pillar: 'uvm-methodology',
    chapter: '01. Core Foundations & Factory',
    number: '3.1',
    title: 'UVM Class Hierarchy: uvm_void, uvm_object vs uvm_component',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Why static structural hierarchy (`uvm_component`) uses `(name, parent)` while transient data (`uvm_object`) uses `(name)` only.',
    deepTheory:
      'Every class in IEEE 1800.2 UVM inherits from `uvm_void` -> `uvm_object` -> `uvm_report_object` -> `uvm_component`. `uvm_object` represents transient data and stimulus (`uvm_sequence_item`, `uvm_sequence`, `uvm_reg`): created dynamically at runtime, passed through mailboxes/TLM, garbage-collected when finished, and initialized with `function new(string name = "")`. In contrast, `uvm_component` represents permanent structural testbench architecture (`uvm_env`, `uvm_agent`, `uvm_driver`, `uvm_monitor`, `uvm_scoreboard`, `uvm_test`): built strictly during `build_phase`, anchored into a static tree via `(name, parent)`, equipped with automated phasing, factory hierarchical instance overrides, and reporting.',
    normativeRules: [
      'Never instantiate new `uvm_component` objects inside `run_phase`—components must all be built in `build_phase` before elaboration locks topology.',
      'Use `uvm_object` / `uvm_sequence_item` (NOT `uvm_component`) for dynamic bus transactions and config objects.',
      'Always pass `this` as `parent` when creating child components (`drv = axi_driver::type_id::create("drv", this);`) so hierarchical paths (`uvm_test_top.env.agt.drv`) resolve cleanly.',
    ],
    commonPitfall:
      'Trying to register a `uvm_sequence` with `\`uvm_component_utils` (sequences are transient `uvm_object`s!) or calling `new("drv")` without `this` parent, orphaning the component outside `uvm_top`.',
    verifiedFix:
      'Use `(name)` + `\`uvm_object_utils` for sequences/items/configs and `(name, parent)` + `\`uvm_component_utils` for structural hierarchy.',
    codeTitle: 'uvm_comp_vs_obj.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `// Transient data object (NO parent!)
class axi_cfg extends uvm_object;
  \`uvm_object_utils(axi_cfg)
  bit is_active = 1'b1;
  function new(string name = "axi_cfg"); super.new(name); endfunction
endclass

// Structural hierarchy component (REQUIRES parent!)
class axi_agent extends uvm_agent;
  \`uvm_component_utils(axi_agent)
  axi_driver drv;
  function new(string name, uvm_component parent); super.new(name, parent); endfunction
endclass`,
    interviewTakeaway:
      '`uvm_object` = transient data (`new(name)`), no phases; `uvm_component` = static structural tree (`new(name, parent)`), phased & path-addressable.',
    relatedProtocols: ['axi4', 'apb'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-factory',
    pillar: 'uvm-methodology',
    chapter: '01. Core Foundations & Factory',
    number: '3.2',
    title: 'UVM Factory, Registration & Type/Instance Overrides',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Swapping drivers, error-injecting transactions, or customized scoreboards from a test without modifying a single line of env code.',
    deepTheory:
      'In well-architected UVM, you NEVER hardcode `drv = axi_driver::new(...)`. Instead, every class registers its proxy with the global singleton `uvm_factory` via `\`uvm_component_utils(T)` (or `\`uvm_object_utils(T)`), and instantiates via `T::type_id::create("inst", this)`. When a corner-case `uvm_test` calls `set_type_override_by_type(axi_txn::get_type(), axi_err_txn::get_type())` (globally) or `set_inst_override_by_type("env.m_agt.*", ...)` (scoped to one agent!) BEFORE calling `create()`, the factory seamlessly returns an `axi_err_txn` inside existing environments!',
    normativeRules: [
      'Register every UVM class with `\`uvm_object_utils` / `\`uvm_component_utils` (or `_param_utils(T #(P))` for parameterized classes!).',
      'Always construct UVM objects/components via `ClassName::type_id::create(...)` rather than calling `new()` directly.',
      'Apply overrides in `uvm_test::build_phase` BEFORE calling `super.build_phase(phase)` (or before child `create()` calls execute).',
    ],
    commonPitfall:
      'Calling `\`uvm_object_utils` on a parameterized class `my_item #(int W)` without `_param_utils`—causing all specializations to collide on the same string name inside the factory!',
    verifiedFix:
      'Use `\`uvm_object_param_utils(my_item #(W))` for parameterized classes and always build via `type_id::create`.',
    codeTitle: 'uvm_factory_override.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class axi_err_test extends axi_base_test;
  \`uvm_component_utils(axi_err_test)
  function new(string name, uvm_component parent); super.new(name, parent); endfunction

  virtual function void build_phase(uvm_phase phase);
    // Apply factory override BEFORE env creates transactions/drivers!
    set_inst_override_by_type("env.axi_agt0.*",
      axi_seq_item::get_type(),
      axi_4kb_err_item::get_type()
    );
    super.build_phase(phase);
  endfunction
endclass`,
    interviewTakeaway:
      'The Factory pattern relies on registration + `type_id::create` + inheritance polymorphism; use `set_inst_override_by_type` to alter a single agent without touching siblings.',
    relatedProtocols: ['axi4', 'pcie-gen5'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-phasing',
    pillar: 'uvm-methodology',
    chapter: '01. Core Foundations & Factory',
    number: '3.3',
    title: 'Complete UVM Phasing: Top-Down build, Bottom-Up connect & run',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Deterministic elaboration, TLM wiring, time-consuming simulation tasks, and post-test scoreboard checking order.',
    deepTheory:
      'UVM runs 9 common phases in strict order: `build_phase` (function, executes **Top-Down** so `env` builds config before child `agent` creates sub-blocks!), `connect_phase` (function, **Bottom-Up** so ports exist cleanly upward), `end_of_elaboration_phase` (**Bottom-Up**, topology printing & final checks), `start_of_simulation_phase` (**Bottom-Up**), `run_phase` (ONLY time-consuming `task`, runs all components in **parallel** concurrently with optional 12 run-time sub-phases `pre_reset`..`post_shutdown`), and cleanup phases `extract_phase`, `check_phase`, `report_phase`, `final_phase`.',
    normativeRules: [
      'Remember `build_phase` is Top-Down so `test` can pass `config_db` handles before `env`/`agent` read them; `connect_phase` through `report_phase` are Bottom-Up (except `final_phase` which is Top-Down).',
      'Never consume simulation time (`#10`, `@(posedge clk)`) inside function phases (`build`, `connect`, `check`, `report`). Only `run_phase` (or `reset/configure/main/shutdown_phase`) is a `task`.',
      'Never mix `run_phase` objections and sub-phase (`main_phase`) objections carelessly across VIPs unless synchronized via phase domains.',
    ],
    commonPitfall:
      'Forgetting `super.build_phase(phase)` in derived classes (breaks auto-config hooks) or calling `drop_objection` before checking pending scoreboard queues inside `check_phase`.',
    verifiedFix:
      'Keep `run_phase` strictly for simulation execution, verify empty FIFOs / error counts inside `check_phase`, and summarize pass/fail in `report_phase`.',
    codeTitle: 'uvm_phasing_order.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `// Summary of UVM Execution Order:
// 1. build_phase               (function, TOP-DOWN)  -> create children & read config_db
// 2. connect_phase             (function, BOTTOM-UP)-> port.connect(export)
// 3. end_of_elaboration_phase  (function, BOTTOM-UP)-> uvm_top.print_topology()
// 4. start_of_simulation_phase (function, BOTTOM-UP)-> banner / pre-sim setup
// 5. run_phase                 (task,     PARALLEL) -> drive/monitor/sequences
//    [Concurrent sub-phases: reset -> configure -> main -> shutdown]
// 6. extract_phase             (function, BOTTOM-UP)-> gather coverage/stats
// 7. check_phase               (function, BOTTOM-UP)-> ensure scoreboard queues empty!
// 8. report_phase              (function, BOTTOM-UP)-> pass/fail UVM_INFO summary
// 9. final_phase               (function, TOP-DOWN) -> close files / final cleanup`,
    interviewTakeaway:
      '`build` is Top-Down (parent configures child); `connect` through `report` are Bottom-Up; ONLY `run_phase` & its 12 sub-phases are time-consuming tasks.',
    relatedProtocols: ['axi4', 'apb'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-config-db',
    pillar: 'uvm-methodology',
    chapter: '02. Config & TLM Communication',
    number: '3.4',
    title: 'uvm_config_db#(T): Virtual Interface Passing & Scope Precedence',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Injecting hardware `virtual interface` handles from static `tb_top` into dynamic UVM classes and mastering hierarchical lookup.',
    deepTheory:
      '`uvm_config_db#(T)::set(cntxt, inst_name, field_name, value)` and `::get(cntxt, inst_name, field_name, value)` act as a typed global key-value database keyed by hierarchical instance path. In static `module tb_top`, `set(null, "uvm_test_top.env.agt*", "vif", dut_if)` binds the physical `interface` before `run_test()` starts `build_phase`. When multiple `set()` calls match in `build_phase`, higher hierarchy (closer to `uvm_top` / test) wins; if within `run_phase`, the most recent `set()` wins!',
    normativeRules: [
      'Always test return boolean: `if (!uvm_config_db#(virtual axi_if)::get(this, "", "vif", vif)) \`uvm_fatal("NOVIF", "Missing vif")`.',
      'Pass `null` as `cntxt` from non-component modules (`tb_top`) and start path with `"uvm_test_top..."` or `"*"`.',
      'Prefer bundling dozens of scalar configuration knobs into a single `axi_agent_cfg` `uvm_object` rather than 20 separate `config_db::get` string lookups (hugely improves elaboration speed!).',
    ],
    commonPitfall:
      'Misspelling `field_name` ("vif" vs "axi_vif") without checking the boolean return value of `config_db::get`, leading to a cryptic Null-Object Dereference crash later in `run_phase`!',
    verifiedFix:
      'Wrap every `uvm_config_db::get` in `if (!... ) \`uvm_fatal(...)`, bundle knobs in `cfg` objects, and call `print_config()` on debug.',
    codeTitle: 'uvm_config_db_vif.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `// In module tb_top:
initial begin
  uvm_config_db#(virtual apb_if)::set(null, "uvm_test_top.env.apb_agt*", "vif", u_apb_if);
  run_test("apb_smoke_test");
end

// Inside apb_driver::build_phase(uvm_phase phase):
virtual function void build_phase(uvm_phase phase);
  super.build_phase(phase);
  if (!uvm_config_db#(virtual apb_if)::get(this, "", "vif", vif))
    \`uvm_fatal("NO_VIF", {"Virtual interface must be set for: ", get_full_name()})
endfunction`,
    interviewTakeaway:
      'Always check `config_db::get` with `\`uvm_fatal`; bundle scalar settings into a `cfg` object for speed; higher-hierarchy `set()` wins in `build_phase`.',
    relatedProtocols: ['apb', 'axi4-lite'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-tlm',
    pillar: 'uvm-methodology',
    chapter: '02. Config & TLM Communication',
    number: '3.5',
    title: 'TLM 1.0 & 2.0: Analysis Ports, Imps, FIFOs & Multi-Port Macros',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Decoupling monitors from scoreboards and coverage collectors using 1-to-N non-blocking broadcasts and `uvm_tlm_analysis_fifo`.',
    deepTheory:
      'Transaction-Level Modeling (TLM) decouples components through standardized `port` (calls method) -> `export` (forwards) -> `imp` (implements method) chains. `uvm_analysis_port#(T)` performs zero-time non-blocking 1-to-N broadcasts via `ap.write(tr)` from passive monitors to ANY number of subscribers (`scoreboard`, `coverage_collector`, `logger`). When a single scoreboard monitors BOTH an AXI Request port and an AXI Response port carrying the SAME transaction class, a plain `uvm_analysis_imp` fails because both would collide on `function void write(T t)`. You resolve this cleanly via either `\`uvm_analysis_imp_decl(_req)` / `(_rsp)` suffixes or two `uvm_tlm_analysis_fifo` queues!',
    normativeRules: [
      'A `uvm_analysis_port` is legally allowed to have 0, 1, or N connected subscribers (`min_size = 0`). Never assume a monitor has only 1 consumer.',
      'Use `uvm_tlm_analysis_fifo#(T)` whenever a scoreboard needs blocking `fifo.get(tr)` synchronization across two independent interfaces.',
      'Use `\`uvm_analysis_imp_decl(_suffix)` whenever one class implements `write()` for multiple analysis streams.',
    ],
    commonPitfall:
      'Declaring two `uvm_analysis_imp #(txn, my_sb)` handles in one scoreboard—causing a compile error or routing both streams into the same `write()` method.',
    verifiedFix:
      'Use `\`uvm_analysis_imp_decl(_in)` / `\`uvm_analysis_imp_decl(_out)` (or `uvm_tlm_analysis_fifo`) and connect `mon.ap.connect(sb.fifo.analysis_export)`.',
    codeTitle: 'uvm_tlm_multiport.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `\`uvm_analysis_imp_decl(_expected)
\`uvm_analysis_imp_decl(_actual)

class axi_scoreboard extends uvm_scoreboard;
  \`uvm_component_utils(axi_scoreboard)
  uvm_analysis_imp_expected #(axi_item, axi_scoreboard) exp_imp;
  uvm_analysis_imp_actual   #(axi_item, axi_scoreboard) act_imp;

  function void build_phase(uvm_phase phase);
    exp_imp = new("exp_imp", this);
    act_imp = new("act_imp", this);
  endfunction

  function void write_expected(axi_item t); /* push to golden model queue */ endfunction
  function void write_actual(axi_item t);   /* pop & compare against expected */ endfunction
endclass`,
    interviewTakeaway:
      'Ports call methods (`port.connect(imp)`), `analysis_port` broadcasts 1-to-N with zero delay, and `\`uvm_analysis_imp_decl` / `analysis_fifo` prevents multiple `write()` collisions.',
    relatedProtocols: ['axi4', 'axi4-stream'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-seq-item',
    pillar: 'uvm-methodology',
    chapter: '02. Config & TLM Communication',
    number: '3.6',
    title: 'Transaction Modeling (uvm_sequence_item): do_* vs Field Macros',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Why manual `do_copy`, `do_compare`, `do_print`, and `convert2string` run 5x–10x faster and debug cleaner than `uvm_field_*` macros.',
    deepTheory:
      '`uvm_sequence_item` extends `uvm_transaction` and models atomic bus operations (read/write bursts, TLPs, Ethernet frames). While beginners wrap properties in `\`uvm_field_int` macros inside `\`uvm_object_utils_begin..end`, those macros expand into massive redundant `case`-tree macro boilerplate that bloats compile time, slows simulation drastically on tight loops, and makes debugging nearly unreadable. Senior verification teams register classes simply with `\`uvm_object_utils(T)` and hand-write clean `do_copy()`, `do_compare()`, `do_print()`/`convert2string()`, and `do_pack()`/`do_unpack()`.',
    normativeRules: [
      'Use `\`uvm_object_utils(T)` + explicit `do_copy`, `do_compare`, and `convert2string()` instead of slow `\`uvm_field_*` automation macros.',
      'Always call `super.do_copy(rhs)` / `super.do_compare(rhs, comparer)` and check `$cast` inside `do_copy` / `do_compare`.',
      'Always `\`uvm_fatal` on `$cast` failure inside `do_copy` so type bugs surface immediately.',
    ],
    commonPitfall:
      'Forgetting `super.do_compare` or overriding `copy()` directly instead of `do_copy()` (`copy()` is non-virtual in `uvm_object` and delegates to `do_copy()`!).',
    verifiedFix:
      'Override ONLY the virtual `do_*` hooks (`do_copy`, `do_compare`, `do_print`, `do_pack`), never the top-level wrapper `copy()`/`compare()`.',
    codeTitle: 'uvm_do_methods.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class apb_item extends uvm_sequence_item;
  \`uvm_object_utils(apb_item)
  rand bit        pwrite;
  rand bit [31:0] paddr, pwdata;
  bit      [31:0] prdata;
  bit             pslverr;

  function new(string name = "apb_item"); super.new(name); endfunction

  virtual function void do_copy(uvm_object rhs);
    apb_item rhs_;
    if (!$cast(rhs_, rhs)) \`uvm_fatal("CASTERR", "do_copy rhs type mismatch")
    super.do_copy(rhs);
    pwrite = rhs_.pwrite; paddr = rhs_.paddr; pwdata = rhs_.pwdata;
    prdata = rhs_.prdata; pslverr = rhs_.pslverr;
  endfunction

  virtual function bit do_compare(uvm_object rhs, uvm_comparer comparer);
    apb_item rhs_;
    if (!$cast(rhs_, rhs)) return 0;
    return super.do_compare(rhs, comparer) &&
           (pwrite == rhs_.pwrite) && (paddr == rhs_.paddr) &&
           (pwrite ? (pwdata == rhs_.pwdata) : (prdata == rhs_.prdata));
  endfunction

  virtual function string convert2string();
    return $sformatf("%s @0x%08h data=0x%08h err=%0b",
      pwrite ? "WR" : "RD", paddr, pwrite ? pwdata : prdata, pslverr);
  endfunction
endclass`,
    interviewTakeaway:
      '`copy()`/`compare()`/`print()` are non-virtual template methods that call `do_copy()`/`do_compare()`/`do_print()`; avoid `\`uvm_field_*` macros for massive simulation speedups.',
    relatedProtocols: ['apb', 'axi4-lite'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-sequences-arb',
    pillar: 'uvm-methodology',
    chapter: '03. Sequences, Drivers & Monitors',
    number: '3.7',
    title: 'Sequences, Sequencers: start_item/finish_item vs uvm_do & Arbitration',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Controlling exact constraint timing between `start_item` and `finish_item` plus sequencer arbitration modes and `grab`/`lock`.',
    deepTheory:
      'A `uvm_sequence` executes inside `body()` and sends items to a `uvm_sequencer` which arbitrates among concurrent sequences (`SEQ_ARB_FIFO`, `SEQ_ARB_WEIGHTED`, `SEQ_ARB_RANDOM`, `SEQ_ARB_STRICT_FIFO`). Crucially, prefer explicit `start_item(req)` → `req.randomize()` → `finish_item(req)` over legacy `\`uvm_do` macros! Why? Because `start_item()` blocks until the sequencer grants access and the driver is ready—allowing `randomize()` to sample the CURRENT hardware state (late randomization!) right before `finish_item()` hands the transaction to the driver and waits for `item_done()`.',
    normativeRules: [
      'Use explicit `create` → `start_item(req)` → `randomize()` → `finish_item(req)` for transparent late randomization and zero macro obfuscation.',
      'To hold exclusive atomic ownership of a sequencer (e.g., atomic read-modify-write), use `lock()` (waits in normal priority queue) or `grab()` (cuts to front immediately)—never forget `unlock()`/`ungrab()`!',
      'Launch top sequences cleanly from test `run_phase`: `seq.start(env.agt.seqr);`.',
    ],
    commonPitfall:
      'Using `\`uvm_do` (randomizes BEFORE sequencer arbitration, so bus conditions can go stale while waiting in queue) or forgetting `ungrab()`, starving all other sequences forever!',
    verifiedFix:
      'Always randomize BETWEEN `start_item(req)` and `finish_item(req)`, and wrap `lock()`/`unlock()` cleanly.',
    codeTitle: 'uvm_seq_handshake.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class axi_burst_seq extends uvm_sequence #(axi_item);
  \`uvm_object_utils(axi_burst_seq)
  function new(string name = "axi_burst_seq"); super.new(name); endfunction

  virtual task body();
    repeat (10) begin
      axi_item req = axi_item::type_id::create("req");
      start_item(req); // 1. Blocks until sequencer arbitrates & driver pulls!
      if (!req.randomize() with { len inside {[1:7]}; })
        \`uvm_fatal("RND", "AXI item randomization failed")
      finish_item(req); // 2. Hands item to driver and blocks until item_done()
    end
  endtask
endclass`,
    interviewTakeaway:
      '`start_item` -> `randomize` -> `finish_item` gives late randomization right when the driver is ready; `lock()` respects priority while `grab()` preempts immediately.',
    relatedProtocols: ['axi4', 'spi', 'i2c'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-virtual-sequences',
    pillar: 'uvm-methodology',
    chapter: '03. Sequences, Drivers & Monitors',
    number: '3.8',
    title: 'Virtual Sequences, p_sequencer & Multi-Interface Coordination',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Orchestrating coordinated traffic across CPU, DMA, PCIe, and APB agents simultaneously using `uvm_virtual_sequencer` and `p_sequencer`.',
    deepTheory:
      'Real SoCs don\'t run one interface in isolation: you configure DMA CSRs over APB, trigger an AXI memory burst, and inject an interrupt simultaneously! A **Virtual Sequence** generates NO pin items of its own (`uvm_sequence #(uvm_sequence_item)`): it holds handles to sub-sequencers (`axi_seqr`, `apb_seqr`) directly OR accesses them via a `uvm_virtual_sequencer` bound with `\`uvm_declare_p_sequencer(soc_vseqr)`. Inside `body()`, it launches child sequences (`apb_cfg.start(p_sequencer.apb_seqr)`) sequentially or in parallel (`fork..join`).',
    normativeRules: [
      'A `uvm_virtual_sequencer` does NOT connect to any `uvm_driver`; it purely aggregates references (`apb_seqr`, `axi_seqr`) wired inside `env::connect_phase`.',
      'Pass `null` as sequencer when starting a standalone virtual sequence holding direct handles, OR start it on `vseqr` when using `p_sequencer`.',
      'Keep child sub-sequences protocol-pure and unaware of SoC topology so VIP blocks remain reusable across projects.',
    ],
    commonPitfall:
      'Accessing `m_sequencer` directly without `$cast` or `\`uvm_declare_p_sequencer`—remember `m_sequencer` is typed as base `uvm_sequencer_base`, so it lacks your custom sub-sequencer fields!',
    verifiedFix:
      'Use `\`uvm_declare_p_sequencer(my_vseqr)` (or explicit sub-sequencer properties populated before `.start(null)`).',
    codeTitle: 'uvm_virtual_sequence.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class soc_vseqr extends uvm_sequencer;
  \`uvm_component_utils(soc_vseqr)
  apb_sequencer apb_seqr;
  axi_sequencer axi_seqr;
  function new(string name, uvm_component parent); super.new(name, parent); endfunction
endclass

class dma_xfer_vseq extends uvm_sequence;
  \`uvm_object_utils(dma_xfer_vseq)
  \`uvm_declare_p_sequencer(soc_vseqr)

  virtual task body();
    apb_dma_cfg_seq cfg_seq = apb_dma_cfg_seq::type_id::create("cfg_seq");
    axi_bg_mem_seq  mem_seq = axi_bg_mem_seq::type_id::create("mem_seq");
    cfg_seq.start(p_sequencer.apb_seqr); // Step 1: Program DMA CSRs on APB
    mem_seq.start(p_sequencer.axi_seqr); // Step 2: Drive concurrent AXI traffic
  endtask
endclass`,
    interviewTakeaway:
      '`m_sequencer` is the generic base handle; `\`uvm_declare_p_sequencer(vseqr)` downcasts it into strongly-typed `p_sequencer` exposing every agent\'s sequencer.',
    relatedProtocols: ['apb', 'axi4', 'pcie-gen5'],
    relatedIps: ['core-v-verif', 'pulp-axi'],
  },
  {
    id: 'uvm-driver',
    pillar: 'uvm-methodology',
    chapter: '03. Sequences, Drivers & Monitors',
    number: '3.9',
    title: 'Active Drivers (uvm_driver): seq_item_port, Pipelining & Reset',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Translating abstract transactions into cycle-accurate clocked pin stimulus with mid-simulation reset resilience and pipelined IDs.',
    deepTheory:
      '`uvm_driver #(REQ, RSP)` pulls requests from its sequencer via `seq_item_port.get_next_item(req)` (blocks until `finish_item` submits a request) and releases the sequence with `seq_item_port.item_done()`. For high-throughput pipelined protocols like AXI4 or DDR5, `get_next_item` blocks until the transaction finishes—if instead the driver uses `get(req)` -> forks pin driving -> immediately calls `put(rsp)` (or `item_done(rsp)` with `seq_id` tagged), multiple outstanding transactions overlap seamlessly! Furthermore, drivers MUST handle asynchronous/synchronous reset mid-test cleanly by killing active drive loops and returning pins to idle (`VALID <= 0`).',
    normativeRules: [
      'Every `get_next_item(req)` MUST have an exact matching `item_done()`—forgetting `item_done()` deadlocks `finish_item()` forever!',
      'Drive DUT pins strictly through the `virtual interface` clocking block (`vif.drv_cb.AWVALID <= 1\'b1`)—never inject unclocked delays inside drivers.',
      'On reset assertion (`!vif.rst_n`), flush pipelined driver queues and clamp output valid/control pins immediately to 0.',
    ],
    commonPitfall:
      'Calling `try_next_item` in a tight zero-delay `forever` loop without `@(posedge vif.clk)` (hangs simulation at 0ns!) or omitting `item_done()` on error exit.',
    verifiedFix:
      'Always use blocking `get_next_item(req)` paired with `item_done()`, and wrap active pin tasks in a reset-aware `fork..join_any; disable fork;` supervisor.',
    codeTitle: 'uvm_axi_lite_driver.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class axil_driver extends uvm_driver #(axil_item);
  \`uvm_component_utils(axil_driver)
  virtual axil_if vif;

  virtual task run_phase(uvm_phase phase);
    reset_pins();
    forever begin
      seq_item_port.get_next_item(req);
      drive_transfer(req);
      seq_item_port.item_done();
    end
  endtask

  task drive_transfer(axil_item tr);
    @(vif.drv_cb);
    vif.drv_cb.AWVALID <= 1'b1;
    vif.drv_cb.AWADDR  <= tr.addr;
    do @(vif.drv_cb); while (!vif.drv_cb.AWREADY);
    vif.drv_cb.AWVALID <= 1'b0;
  endtask
endclass`,
    interviewTakeaway:
      '`get_next_item` + `item_done` synchronizes 1-at-a-time; `get()` + `put(rsp)` enables pipelined outstanding transactions. Always reset output valid pins on `!rst_n`.',
    relatedProtocols: ['axi4-lite', 'axi4', 'apb'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-monitor-agent',
    pillar: 'uvm-methodology',
    chapter: '03. Sequences, Drivers & Monitors',
    number: '3.10',
    title: 'Monitors, Coverage Subscribers & Active/Passive Agents',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Decoupling stimulus from observation so agents flip effortlessly between Active block-level driving and Passive SoC-level snooping.',
    deepTheory:
      'The golden rule of UVM testbench reuse is: **Monitors NEVER drive pins, and Drivers NEVER feed the Scoreboard!** At block level, an agent acts `UVM_ACTIVE` (creates `sequencer` + `driver` + `monitor`) to drive a standalone IP. When that same IP is integrated inside a full SoC where an embedded RISC-V core drives the bus instead, you flip one knob (`is_active = UVM_PASSIVE`): the agent omits `driver` and `sequencer`, leaving the `uvm_monitor` intact to sample pins, reconstruct `uvm_sequence_item`s, check protocol rules, and feed scoreboards & `uvm_subscriber` coverage collectors identically!',
    normativeRules: [
      'Check `get_is_active() == UVM_ACTIVE` in both `build_phase` (creating `drv` and `seqr`) AND `connect_phase` (connecting `drv.seq_item_port.connect(seqr.seq_item_export)`).',
      'Sample pins passively in `uvm_monitor` using `#1step` clocking blocks (`vif.mon_cb`) and broadcast cloned items on `uvm_analysis_port`.',
      'Keep functional coverage inside a dedicated `uvm_subscriber#(T)` rather than mixing stimulus, monitoring, and coverage in one giant monolithic file.',
    ],
    commonPitfall:
      'Having the `driver` call `ap.write(req)` directly to the scoreboard—breaking passive SoC reuse and failing to verify the driver actually wiggled pins properly!',
    verifiedFix:
      'Keep `driver` strictly pin-facing and `monitor` strictly passive pin-to-TLM, respecting `UVM_ACTIVE`/`UVM_PASSIVE`.',
    codeTitle: 'uvm_active_passive_agent.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class axi_agent extends uvm_agent;
  \`uvm_component_utils(axi_agent)
  axi_sequencer seqr;
  axi_driver    drv;
  axi_monitor   mon;

  virtual function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    mon = axi_monitor::type_id::create("mon", this); // ALWAYS built!
    if (get_is_active() == UVM_ACTIVE) begin
      seqr = axi_sequencer::type_id::create("seqr", this);
      drv  = axi_driver::type_id::create("drv", this);
    end
  endfunction

  virtual function void connect_phase(uvm_phase phase);
    if (get_is_active() == UVM_ACTIVE)
      drv.seq_item_port.connect(seqr.seq_item_export);
  endfunction
endclass`,
    interviewTakeaway:
      'Never send scoreboard expected/actual items from the driver—the monitor is the single pin-level source of truth enabling seamless Active-to-Passive SoC reuse.',
    relatedProtocols: ['axi4', 'tl-ul', 'apb'],
    relatedIps: ['core-v-verif', 'ibex'],
  },
  {
    id: 'uvm-scoreboard',
    pillar: 'uvm-methodology',
    chapter: '04. Scoreboards, RAL & Sign-Off',
    number: '3.11',
    title: 'Scoreboards & Reference Models: In-Order vs Out-of-Order IDs',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Predicting expected DUT outputs cleanly and matching out-of-order AXI4/CHI completions using per-ID associative queues and drain checks.',
    deepTheory:
      'A `uvm_scoreboard` combines a **Predictor** (golden C/SystemVerilog reference model) with a **Comparator** checking actual DUT outputs. Simple point-to-point streams (`axi4-stream`, `apb`) use an in-order `uvm_in_order_class_comparator` or simple queue (`pop_front`). However, pipelined fabrics like AXI4 or CHI reorder responses across distinct transaction IDs (`ARID`/`RID`)! An out-of-order scoreboard indexes expected requests in a hash of FIFO queues `exp_q[id][$]`: same-ID ordering remains strictly FIFO (`pop_front`), while cross-ID completions can arrive in any sequence! Finally, `check_phase()` MUST assert that ZERO orphaned expected items remain stranded in `exp_q`!',
    normativeRules: [
      'Always verify `exp_q.size() == 0` inside `check_phase()`—a DUT that silently drops packets passes all comparisons unless you check for leftover expected items!',
      'Deep-clone incoming transactions before pushing to scoreboard predictors if upstream monitors reuse transaction handles.',
      'Separate protocol/timing checks (SVA on pins) from end-to-end data transformation checks (Scoreboard).',
    ],
    commonPitfall:
      'Checking only `if (actual == expected)` when items arrive, missing dropped/missing packets completely at end-of-test because `check_phase` never verified queue emptiness.',
    verifiedFix:
      'Maintain `exp_by_id[id][$]`, verify `pop_front()` matches on every arrival, and raise `\`uvm_error` in `check_phase` if any queue is non-empty.',
    codeTitle: 'uvm_ooo_scoreboard.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class axi_ooo_scoreboard extends uvm_scoreboard;
  \`uvm_component_utils(axi_ooo_scoreboard)
  axi_item exp_by_id [bit [3:0]][$];

  function void push_expected(axi_item req);
    axi_item clone_item;
    $cast(clone_item, req.clone());
    exp_by_id[clone_item.id].push_back(clone_item);
  endfunction

  function void check_actual(axi_item act);
    if (!exp_by_id.exists(act.id) || exp_by_id[act.id].size() == 0) begin
      \`uvm_error("UNEXP_RSP", $sformatf("Unexpected response for ID=%0d", act.id))
      return;
    end
    axi_item exp = exp_by_id[act.id].pop_front(); // Same-ID responses stay strict FIFO!
    if (!act.compare(exp))
      \`uvm_error("MISMATCH", {"Actual=", act.convert2string(), " Exp=", exp.convert2string()})
  endfunction

  virtual function void check_phase(uvm_phase phase);
    foreach (exp_by_id[id]) if (exp_by_id[id].size() > 0)
      \`uvm_error("ORPHAN", $sformatf("%0d transactions dropped on ID=%0d", exp_by_id[id].size(), id))
  endfunction
endclass`,
    interviewTakeaway:
      'Use per-ID associative queues (`exp[id][$]`) for AXI4/CHI out-of-order checking, and ALWAYS assert zero leftover items in `check_phase()`.',
    relatedProtocols: ['axi4', 'chi'],
    relatedIps: ['core-v-verif', 'pulp-axi'],
  },
  {
    id: 'uvm-ral',
    pillar: 'uvm-methodology',
    chapter: '04. Scoreboards, RAL & Sign-Off',
    number: '3.12',
    title: 'Register Abstraction Layer (RAL): Block, Adapter, Predictor & Front/Backdoor',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Protocol-agnostic CSR verification supporting mirror tracking, bit-bash/reset built-in tests, and zero-time HDL backdoor access.',
    deepTheory:
      'Instead of hardcoding raw APB addresses (`0x4000_0004`) inside tests, **UVM RAL** models your entire IP register map cleanly (`uvm_reg_block` -> `uvm_reg` -> `uvm_reg_field` + `uvm_reg_map`). A `uvm_reg_adapter` translates generic `uvm_reg_bus_op` into `apb_item` / `axi_item` (`reg2bus` & `bus2reg`), while `uvm_reg_predictor` listens to the passive `monitor.ap` (explicit prediction!) so even non-RAL DMA writes update RAL\'s shadow mirror cleanly! Frontdoor (`reg.write(..., UVM_FRONTDOOR)`) drives real bus cycles; Backdoor (`UVM_BACKDOOR` / `.poke()` / `.peek()`) reads/writes RTL HDL paths via DPI/VPI in 0 simulation time to cross-check frontdoor writes.',
    normativeRules: [
      'Always connect `uvm_reg_predictor` (`mon.ap -> predictor.bus_in`) and set `reg_map.set_auto_predict(0)` (Explicit Prediction) so RAL mirrors reflect ACTUAL bus completions rather than un-arbitrated frontdoor requests.',
      'Run built-in UVM RAL sequences (`uvm_reg_hw_reset_seq`, `uvm_reg_bit_bash_seq`, `uvm_reg_access_seq`) on every IP to verify RW, RO, W1C, and reset defaults automatically.',
      'Always call `reg_block.lock_model()` at the end of `uvm_reg_block::build()`.',
    ],
    commonPitfall:
      'Leaving `auto_predict = 1` when multiple bus masters write CSRs—causing RAL mirror values to miss bus updates or record failed transactions as written.',
    verifiedFix:
      'Wire `uvm_reg_adapter` + `uvm_reg_predictor` in `env::connect_phase`, set `auto_predict(0)`, and pair Frontdoor writes with Backdoor `.mirror(UVM_CHECK, UVM_BACKDOOR)`.',
    codeTitle: 'uvm_ral_adapter.sv',
    codeLanguage: 'SystemVerilog UVM RAL',
    codeExample: `class apb_reg_adapter extends uvm_reg_adapter;
  \`uvm_object_utils(apb_reg_adapter)
  function new(string name = "apb_reg_adapter");
    super.new(name);
    supports_byte_enable = 1;
    provides_responses   = 0;
  endfunction

  virtual function uvm_sequence_item reg2bus(const ref uvm_reg_bus_op rw);
    apb_item tr = apb_item::type_id::create("tr");
    tr.pwrite = (rw.kind == UVM_WRITE);
    tr.paddr  = rw.addr;
    tr.pwdata = rw.data;
    return tr;
  endfunction

  virtual function void bus2reg(uvm_sequence_item bus_item, ref uvm_reg_bus_op rw);
    apb_item tr;
    if (!$cast(tr, bus_item)) \`uvm_fatal("ADAPT", "Type mismatch in bus2reg")
    rw.kind   = tr.pwrite ? UVM_WRITE : UVM_READ;
    rw.addr   = tr.paddr;
    rw.data   = tr.pwrite ? tr.pwdata : tr.prdata;
    rw.status = tr.pslverr ? UVM_NOT_OK : UVM_IS_OK;
  endfunction
endclass`,
    interviewTakeaway:
      'Know the difference between Auto vs Explicit Prediction (`uvm_reg_predictor` on monitor.ap), `reg2bus`/`bus2reg`, and Frontdoor (bus pins) vs Backdoor (0-ns HDL path).',
    relatedProtocols: ['apb', 'axi4-lite', 'tl-ul'],
    relatedIps: ['opentitan-aes', 'opentitan-uart', 'core-v-verif'],
  },
  {
    id: 'uvm-objections',
    pillar: 'uvm-methodology',
    chapter: '04. Scoreboards, RAL & Sign-Off',
    number: '3.13',
    title: 'Objections, Drain Time, Watchdog Timeouts & Heartbeats',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Controlling testbench termination cleanly so simulations never quit before the last scoreboard check completes or hang forever.',
    deepTheory:
      '`run_phase` ends automatically the instant its objection counter drops to 0. Best practice raises objections strictly at the **top-level test / virtual sequence** (`phase.raise_objection(this)`) rather than inside every single inner sequence item loop (which creates massive simulation overhead!). Once stimulus finishes and drops its objection, setting `phase.phase_done.set_drain_time(this, 500ns)` keeps clocks running long enough for the last pipelined AXI write response (`BVALID`) and scoreboard comparison to settle cleanly before `extract_phase` runs!',
    normativeRules: [
      'Raise and drop objections ONLY in `uvm_test` or top-level sequences—NEVER inside forever-looping `uvm_driver` or `uvm_monitor` `run_phase` tasks!',
      'Configure `uvm_top.set_timeout(5ms)` in `base_test` to abort deadlocked runs gracefully with debug context.',
      'Verify every `raise_objection` executes a matching `drop_objection` on every control exit path.',
    ],
    commonPitfall:
      'Raising an objection inside a driver\'s `forever` loop (simulation hangs until timeout!) or forgetting `drain_time`, causing `run_phase` to kill the last cycle of data before the monitor samples it.',
    verifiedFix:
      'Manage objections at `uvm_test::run_phase`, configure explicit `set_drain_time`, and set a global watchdog `set_timeout`.',
    codeTitle: 'uvm_test_objection.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class axi_smoke_test extends axi_base_test;
  \`uvm_component_utils(axi_smoke_test)

  virtual task run_phase(uvm_phase phase);
    axi_burst_seq seq = axi_burst_seq::type_id::create("seq");

    phase.phase_done.set_drain_time(this, 200ns); // Let last BVALID/RVALID drain!
    phase.raise_objection(this, "Starting AXI smoke stimulus");
    seq.start(env.axi_agt.seqr);
    phase.drop_objection(this, "Finished AXI smoke stimulus");
  endtask
endclass`,
    interviewTakeaway:
      'Raise objections in the test, NOT drivers/monitors; use `set_drain_time` so in-flight pipeline responses reach the monitor/scoreboard before `run_phase` shuts down.',
    relatedProtocols: ['axi4', 'pcie-gen5'],
    relatedIps: ['core-v-verif'],
  },
  {
    id: 'uvm-reporting-callbacks',
    pillar: 'uvm-methodology',
    chapter: '04. Scoreboards, RAL & Sign-Off',
    number: '3.14',
    title: 'Reporting, Verbosity, uvm_report_catcher & uvm_callback Hooks',
    scopeBadge: 'IEEE 1800.2 UVM',
    summary:
      'Demoting expected error-test errors dynamically, filtering logs from CLI plusargs, and injecting hooks cleanly via callbacks.',
    deepTheory:
      'UVM\'s standardized reporting (`\`uvm_info`, `\`uvm_warning`, `\`uvm_error`, `\`uvm_fatal`) separates message ID, severity, and verbosity (`UVM_NONE`, `UVM_LOW`, `UVM_MEDIUM`, `UVM_HIGH`, `UVM_DEBUG`) controllable from command-line plusargs (`+UVM_VERBOSITY=UVM_HIGH`, `+UVM_MAX_QUIT_COUNT=5`, `+UVM_TESTNAME=...`) WITHOUT recompiling RTL or testbench! During negative error-injection tests (like testing an intentional ECC fault or SLVERR), a **`uvm_report_catcher`** intercepts the expected `\`uvm_error` from a passive monitor and cleanly demotes it to `UVM_INFO` while verifying it actually occurred! Similarly, **`uvm_callback`** adds pre/post hooks inside VIP drivers/monitors without modifying VIP class inheritance.',
    normativeRules: [
      'Always use UVM reporting macros (`\`uvm_info` / `\`uvm_error` / `\`uvm_fatal`) instead of raw `$display` so logs remain filterable by ID and verbosity.',
      'Guard expensive string formatting (`convert2string()`) behind `\`uvm_info` macros, which evaluate string expressions ONLY when verbosity threshold allows.',
      'Use `uvm_report_catcher` + a verification count check in negative tests so expected error injections demote cleanly only when matched.',
    ],
    commonPitfall:
      'Using `$display` everywhere (unfilterable noise!) or demoting ALL `UVM_ERROR`s blindly without verifying the expected fault actually fired.',
    verifiedFix:
      'Write targeted `uvm_report_catcher` matching exact message IDs (`if (get_id() == "AXI_SLVERR")`) and assert `catcher.caught_cnt > 0` in `check_phase`.',
    codeTitle: 'uvm_report_catcher.sv',
    codeLanguage: 'SystemVerilog UVM',
    codeExample: `class expected_err_catcher extends uvm_report_catcher;
  int unsigned caught_count = 0;
  function new(string name = "expected_err_catcher"); super.new(name); endfunction

  virtual function action_e catch();
    if (get_severity() == UVM_ERROR && get_id() == "AXI_BRESP_ERR") begin
      caught_count++;
      set_severity(UVM_INFO); // Demote expected injected error cleanly!
      set_message({"[EXPECTED INJECTED FAULT] ", get_message()});
    end
    return THROW;
  endfunction
endclass`,
    interviewTakeaway:
      'Use `+UVM_VERBOSITY`/`+UVM_TESTNAME` to debug without recompiling, and `uvm_report_catcher` to verify & demote expected faults in negative error tests.',
    relatedProtocols: ['axi4', 'tl-ul-integrity'],
    relatedIps: ['core-v-verif', 'opentitan-alert-handler'],
  },
];
