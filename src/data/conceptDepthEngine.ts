import { CategoryId, ProtocolDocument } from '../types/protocol';
import { GlossaryTerm, IpEntity } from '../types/ipUniverse';

export interface CornerCaseDetail {
  symptom: string;
  rootCause: string;
  resolution: string;
}

export interface LayeredConceptExplanation {
  title: string;
  level1: {
    intuitionSummary: string;
    whyItExists: string;
    everydayAnalogy: string;
    stepByStepMentalModel: string[];
    beginnerMisconception: string;
  };
  level2: {
    architectureAndMechanics: string;
    mathematicalAndTimingRules: string[];
    workedEngineeringExample: string;
    resetAndInitialization: string;
  };
  level3: {
    rtlMicroarchitecture: string;
    cornerCasesAndFailureModes: CornerCaseDetail[];
    verificationAndAssertions: string;
    siliconDebugPlaybook: string;
  };
}

const PROTOCOL_DEEP_OVERRIDES: Record<string, Partial<LayeredConceptExplanation>> = {
  axi4: {
    level1: {
      intuitionSummary:
        'AXI4 is a five-lane split-transaction on-chip highway that lets CPUs, DMAs, and accelerators overlap multiple read and write requests simultaneously without blocking each other.',
      whyItExists:
        'Single-bus shared architectures (like APB or non-pipelined buses) force a CPU to freeze while slow DDR memory responds. High-speed SoCs need read and write addresses issued independently ahead of slow data returns.',
      everydayAnalogy:
        'Think of a busy warehouse with 5 separate loading doors: Write Address Orders (AW), Write Cargo Trucks (W), Write Delivery Receipts (B), Read Orders (AR), and Returning Read Cargo (R). Two workers at each door raise VALID ("Package ready") and READY ("Hands empty")—cargo moves only on a clock tick when both hands meet.',
      stepByStepMentalModel: [
        '1. Decoupled Orders: Manager sends one starting address + burst count (AWLEN/ARLEN) without holding the data bus.',
        '2. Pipelined Streaming: Data beats stream back-to-back at 1 word per clock cycle until WLAST/RLAST pulses high.',
        '3. Out-of-Order Tagging: Different AxID tags let fast SRAM replies overtake slow DRAM replies cleanly.',
      ],
      beginnerMisconception:
        'Students often think AWVALID must arrive before WVALID, or that AWREADY can wait for WVALID. In AXI4, channels are strictly independent: waiting across channels in the wrong direction creates instant deadlock.',
    },
    level2: {
      architectureAndMechanics:
        'Five independent unidirectional channels (AW, W, B, AR, R), each governed by symmetric two-wire VALID/READY handshakes. Address beats carry AxID, AxADDR, AxLEN[7:0] (1–256 beats), AxSIZE[2:0] (1–128 B/beat), and AxBURST (FIXED=00, INCR=01, WRAP=10).',
      mathematicalAndTimingRules: [
        'Transfer Beat Count = AxLEN + 1 (max 256 for INCR, 16 for WRAP/AXI3).',
        'Bytes per Beat <= 2^AxSIZE <= Data Bus Width (BYTES).',
        'Peak Bandwidth = (DATA_WIDTH_BITS / 8) * F_ACLK * Efficiency.',
        '4KB Boundary Constraint: Start_Addr[31:12] == End_Addr[31:12] for every burst.',
      ],
      workedEngineeringExample:
        'Burst Write: AWADDR=0x1000, AWLEN=7 (8 beats), AWSIZE=3 (8 bytes/beat, 64-bit bus), AWBURST=01 (INCR). Total transfer = 8 * 8B = 64B spanning 0x1000..0x103F (legal: stays inside 0x1000..0x1FFF 4KB page). Every clock where WVALID && WREADY advances address by +8 bytes; beat #7 sets WLAST=1, followed by BVALID with BRESP=2\'b00 (OKAY).',
      resetAndInitialization:
        'During ARESETn=0, ALL VALID signals (AWVALID, WVALID, ARVALID, RVALID, BVALID) MUST drive 0. Managers and Subordinates may only sample or assert VALID strictly after the first rising ACLK following ARESETn deassertion (1).',
    },
    level3: {
      rtlMicroarchitecture:
        'Production AXI4 crossbars break combinational forward/backward paths using 2-deep Skid Buffers (axi_cut / forward+backward register slices) so Fmax is not degraded by READY fan-out. Read reorder buffers or per-ID FIFOs track outstanding transactions per ARID/AWID.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Bus hangs permanently on first write transaction (DEADLOCK).',
          rootCause: 'Subordinate waits for AWVALID before asserting WREADY, while Manager waits for WREADY or AWREADY before driving the partner channel.',
          resolution: 'Never gate READY of one channel on VALID of another channel; drive default READY=1 or decouple AW and W capture into independent skid registers.',
        },
        {
          symptom: 'Silent address aliasing / corrupted neighboring peripheral CSRs.',
          rootCause: 'DMA burst crosses a 4KB boundary (e.g., 0x0FF8 + 16 bytes -> 0x1008) where low 12 bits wrap in a 4KB decoder.',
          resolution: 'Insert hardware burst-splitter ahead of interconnect and assert !(wrap_cross_4kb) in SVA.',
        },
        {
          symptom: 'Interconnect drops or duplicates a beat under backpressure.',
          rootCause: 'Manager toggled AWADDR or dropped AWVALID while AWVALID=1 and AWREADY=0.',
          resolution: 'Hold all payload & VALID outputs inside flip-flops enabled by (!valid_q || ready_i).',
        },
      ],
      verificationAndAssertions:
        'Bind ARM/VIP SVA checks on all 5 channels: (1) X-check on VALID/READY post-reset, (2) $stable(AxPAYLOAD) |-> until READY, (3) WLAST count == AWLEN + 1, (4) No BVALID prior to WLAST handshake, (5) Outstanding transaction counter overflow check.',
      siliconDebugPlaybook:
        'In ILA/waveform debug, filter immediately for (VALID && !READY) cycles. Verify AWID == BID matching and check if a stalled Subordinate is holding BVALID=0 due to missing WLAST or un-acked upstream response.',
    },
  },
  'axi4-lite': {
    level1: {
      intuitionSummary:
        'AXI4-Lite is the stripped-down single-word version of AXI4 designed specifically so CPUs can configure hardware control registers (CSRs) without wasting gates on burst counters.',
      whyItExists:
        'A UART baud divider or GPIO direction register only receives one 32-bit config word at a time. Implementing 256-beat burst wrap math and ID reordering inside every tiny timer would double chip area unnecessarily.',
      everydayAnalogy:
        'If AXI4 is a freight highway for semi-trucks carrying 256 crates, AXI4-Lite is the express single-item counter where you hand over one locker number and one 32-bit sticky note.',
      stepByStepMentalModel: [
        '1. Single Access Only: Every read or write moves exactly 1 data word (32-bit or 64-bit)—no LEN or BURST.',
        '2. Byte Write Strobes: WSTRB[3:0] lets software modify just 1 byte inside a 32-bit register safely.',
        '3. Simple Receipt: Target replies OKAY if the address mapped cleanly or SLVERR if an illegal address was hit.',
      ],
      beginnerMisconception:
        'Beginners often combine AW and W into one combinatorial block assuming AW always arrives first—in real interconnects, WDATA frequently arrives one cycle BEFORE AWADDR!',
    },
    level2: {
      architectureAndMechanics:
        'Retains the 5 AXI channels (AW, W, B, AR, R) but omits AxID, AxLEN, AxSIZE, AxBURST, AxCACHE, AxQOS, WLAST, and RLAST. Data width is fixed to 32 or 64 bits globally across the interface.',
      mathematicalAndTimingRules: [
        'Fixed Transfer Length = 1 beat per address handshake (effective AxLEN = 0).',
        'Byte Masking: byte[i] updates only if WSTRB[i] == 1\'b1 (i in 0..3 for 32-bit).',
        'Minimum Write Latency = 2 cycles (AW+W same cycle -> B next cycle if combinatorial-free).',
      ],
      workedEngineeringExample:
        'Modify byte 1 of CSR at 0x4000_0004 to 0xAB without disturbing bytes 0/2/3: Drive AWADDR=0x4000_0004 (AWVALID=1), WDATA=0x0000_AB00, WSTRB=4\'b0010 (WVALID=1). Subordinate latches whichever channel arrives first, writes WDATA[15:8] when both have shaken hands, and drives BVALID=1, BRESP=2\'b00.',
      resetAndInitialization:
        'All five VALID wires force 0 during ARESETn=0; internal CSR default reset values must already settle before BREADY/RREADY traffic begins.',
    },
    level3: {
      rtlMicroarchitecture:
        'Best-practice AXI4-Lite CSR slaves maintain two 1-bit sticky capture flags (`aw_seen_q`, `w_seen_q`) so AW and W can arrive in either order (AW-first, W-first, or simultaneous) and commit cleanly to the register bank once both flags are true.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Deadlock when WDATA arrives 1 cycle before AWADDR.',
          rootCause: 'Slave FSM stays in IDLE waiting for AWVALID and stalls WREADY=0 while upstream bridge waits for WREADY before draining AW.',
          resolution: 'Accept AW and W independently using decoupled skid capture flops.',
        },
        {
          symptom: 'Simultaneous Read + Write collision corrupts read data or stalls BVALID.',
          rootCause: 'Single-port register decoder shares one mux between AR and AW without round-robin arbitration.',
          resolution: 'Implement clean read/write priority or registered muxing with independent BVALID/RVALID tracking.',
        },
      ],
      verificationAndAssertions:
        'Test all 3 arrival skews (AW before W, W before AW, simultaneous), all 16 WSTRB combinations (including 4\'b0000 zero-strobe dummy write), and unmapped address SLVERR responses.',
      siliconDebugPlaybook:
        'Check whether both aw_hsk and w_hsk completed inside the slave; stuck BVALID=0 almost always traces to one of the two flags never setting or a missing BREADY assertion from the interconnect.',
    },
  },
  'axi4-stream': {
    level1: {
      intuitionSummary:
        'AXI4-Stream is a zero-address unidirectional conveyor belt built for pushing continuous flows of video pixels, Ethernet packets, FFT samples, or AI tensors as fast as possible.',
      whyItExists:
        'When a camera sensor or MAC streams 10 million pixels per second to an ISP or DMA, repeating memory addresses on every beat wastes massive wire count and power. A pure streaming pipe only needs to say "Here is the next word" and "Packet finished."',
      everydayAnalogy:
        'Think of an airport luggage carousel or factory conveyor belt: boxes arrive one after another (`TVALID`), pause cleanly if the packer at the end holds up a stop sign (`TREADY=0`), and carry a red flag on the last box of each batch (`TLAST`).',
      stepByStepMentalModel: [
        '1. Push Data (`TVALID`): Source places N bytes on TDATA and asserts TVALID=1.',
        '2. Backpressure (`TREADY`): Sink lowers TREADY=0 whenever its FIFO is full—the pipe pauses without losing a beat.',
        '3. Packet Framing (`TLAST` + `TKEEP`): TLAST marks end-of-frame/packet while TKEEP tags which trailing bytes are valid vs padding.',
      ],
      beginnerMisconception:
        'Forgetting TKEEP vs TSTRB legality: beginners sometimes emit TKEEP=0 with TSTRB=1 or forget that an unaligned packet end needs partial TKEEP=4\'b0011 on TLAST.',
    },
    level2: {
      architectureAndMechanics:
        'Single unidirectional data channel carrying TDATA[8N-1:0], TKEEP[N-1:0], TSTRB[N-1:0], TLAST, TID, TDEST, and TUSER sideband metadata under TVALID/TREADY handshakes.',
      mathematicalAndTimingRules: [
        'Peak Stream Bandwidth = TDATA_WIDTH (bits) * F_ACLK (Hz) * (active TKEEP fraction).',
        'Legality Invariant: !(TKEEP[i] == 1\'b0 && TSTRB[i] == 1\'b1) for every byte lane i.',
        'Transfer condition: Beat accepted iff (TVALID && TREADY) on rising ACLK.',
      ],
      workedEngineeringExample:
        'Sending a 6-byte Ethernet ARP tail over a 32-bit (4-byte) AXI4-Stream bus: Beat 0 sends Bytes 0–3 with TKEEP=4\'b1111, TSTRB=4\'b1111, TLAST=0. Beat 1 sends Bytes 4–5 in lower lanes with TKEEP=4\'b0011 (upper 2 lanes marked Null), TSTRB=4\'b0011, TLAST=1.',
      resetAndInitialization:
        'ARESETn=0 forces TVALID=0; upstream producers clear partial frame counters and TUSER SOF markers before starting the first new packet after reset.',
    },
    level3: {
      rtlMicroarchitecture:
        'To break long combinatorial TREADY chains across DSP chains without halving throughput (bubble cycles), engineers insert a 2-register Skid Buffer (`axis_register_slice`) or ping-pong mux storing 1 overflow beat whenever downstream drops TREADY.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Beat corrupted or skipped whenever downstream drops TREADY for 1 cycle.',
          rootCause: 'Single-stage pipeline register failed to capture the in-flight beat when m_tready fell from 1 -> 0.',
          resolution: 'Implement dual-slot skid register (`skid_buf_q` + `skid_valid_q`) so s_tready stays 1 until skid slot fills.',
        },
        {
          symptom: 'DMA hangs forever waiting for packet completion.',
          rootCause: 'Truncated or zero-length frame failed to assert TLAST on the final beat, or width-upsizer dropped TLAST.',
          resolution: 'OR-reduce TLAST flags across narrow-to-wide upsizing and add watchdog packet-length SVA.',
        },
      ],
      verificationAndAssertions:
        'Verify single-cycle backpressure glitches, TLAST on 1-beat packets, sparse TKEEP null-byte interleaving across width converters, and FIFO full/empty boundary transitions.',
      siliconDebugPlaybook:
        'Count `(TVALID && TREADY && TLAST)` edges entering vs exiting each DSP block; any mismatch pins down exact beat drop/duplication to that module boundary.',
    },
  },
  apb: {
    level1: {
      intuitionSummary:
        'APB (Advanced Peripheral Bus) is a super-simple, low-power two-step register bus built for slow peripherals like timers, UARTs, I2C controllers, and interrupt blocks.',
      whyItExists:
        'Wiring full 5-channel AXI4 hardware into 40 small peripheral blocks wastes routing metal and switching power. APB connects via an AXI-to-APB bridge so peripherals need minimal logic and stay completely idle between accesses.',
      everydayAnalogy:
        'Like knocking on an office door: Cycle 1 ("SETUP") you tap politely (`PSEL=1, PENABLE=0`) and hold up your request slip; Cycle 2 ("ACCESS") you open the door (`PENABLE=1`) and wait until they nod yes (`PREADY=1`).',
      stepByStepMentalModel: [
        '1. IDLE: Everything sleeps (`PSEL=0, PENABLE=0`) to save switching energy.',
        '2. SETUP (1 exact cycle): PSEL=1 selects one peripheral while PADDR/PWRITE/PWDATA stabilize cleanly.',
        '3. ACCESS (`PENABLE=1`): Transfer stays open until the peripheral drives PREADY=1.',
      ],
      beginnerMisconception:
        'Thinking APB transfers take 1 clock cycle—even zero-wait-state APB always takes at least 2 clock cycles (1 SETUP + 1 ACCESS).',
    },
    level2: {
      architectureAndMechanics:
        'Non-pipelined single-requester bus. APB3 adds PREADY and PSLVERR; APB4 adds PSTRB and PPROT; APB5 adds PWAKEUP, Realm security (`PNSE`), and parity check signals.',
      mathematicalAndTimingRules: [
        'Cycles per Transfer = 2 + Wait_States (minimum 2 cycles; max throughput = 50% of PCLK rate).',
        'APB Max Theoretical Bandwidth = (PWDATA_WIDTH / 8) * (F_PCLK / 2).',
        'State invariant: PSEL && !PENABLE lasts exactly 1 cycle before PSEL && PENABLE.',
      ],
      workedEngineeringExample:
        '32-bit Write to 0x1004 with 1 wait state at 100 MHz PCLK: Cycle 0=IDLE. Cycle 1 (SETUP): PSEL=1, PENABLE=0, PWRITE=1, PADDR=0x1004, PWDATA=0xCAFE_0001. Cycle 2 (ACCESS wait): PENABLE=1, PREADY=0 -> holds all inputs. Cycle 3 (ACCESS done): PREADY=1 samples write and returns to IDLE (total = 30 ns).',
      resetAndInitialization:
        'PRESETn=0 clears PSEL=0 and PENABLE=0; PREADY may be constant 1\'b1 for zero-wait-state combinational/1-cycle register slaves.',
    },
    level3: {
      rtlMicroarchitecture:
        'APB slaves require almost zero FSM overhead: decode `reg_wr = psel_i && penable_i && pwrite_i && pready_o` and `reg_rd = psel_i && !penable_i && !pwrite_i` (allowing registered PRDATA to settle cleanly for the ACCESS sampling edge).',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Peripheral never sees write or glitches first bit.',
          rootCause: 'Slave sampled write enable on `psel_i` alone (firing during SETUP before data stabilized or double-firing during wait states).',
          resolution: 'Qualify write strobe strictly with `psel_i && penable_i && pwrite_i && pready_o`.',
        },
        {
          symptom: 'APB bus locks up indefinitely.',
          rootCause: 'Peripheral forgot to drive PREADY=1 on an unmapped register address.',
          resolution: 'Drive PREADY=1 and assert PSLVERR=1 on invalid offsets.',
        },
      ],
      verificationAndAssertions:
        'SVA guarantees: (1) `(PSEL && !PENABLE) |=> (PSEL && PENABLE)`, (2) `$stable({PADDR, PWRITE, PWDATA, PSTRB})` across `!PREADY`, (3) `PENABLE |-> PSEL`.',
      siliconDebugPlaybook:
        'Trigger on `PSEL && PENABLE && !PREADY` lasting > 16 cycles to pinpoint hung CDC APB bridges or gated peripheral clocks.',
    },
  },
  'tl-ul': {
    level1: {
      intuitionSummary:
        'TL-UL (TileLink Uncached Lightweight) is an open-source, two-channel request/response chip bus hardened by OpenTitan with tamper-detecting checksums on every wire.',
      whyItExists:
        'Open-source silicon and Root-of-Trust chips (like Google/lowRISC OpenTitan) wanted a royalty-free, formally verifiable bus simpler than full AXI4 yet capable of pipelined split transactions and physical fault-injection detection.',
      everydayAnalogy:
        'Think of sending sealed bank envelopes through a guarded pneumatic tube: Channel A sends your request + tamper-evident wax seal; the receiver checks the seal immediately before opening and replies via Channel D with its own sealed receipt.',
      stepByStepMentalModel: [
        '1. Channel A Request: Host sends opcode (`Get`, `PutFullData`, `PutPartialData`), address, data, and `a_source` ID.',
        '2. Integrity Verification (`a_user`): Hardware SECDED parity immediately flags any cosmic-ray or laser bit flip as a fatal alert.',
        '3. Channel D Response: Device answers with `AccessAck` or `AccessAckData` carrying matching `d_source`.',
      ],
      beginnerMisconception:
        'Confusing TL-UL with AXI4-Lite: unlike AXI4-Lite, TL-UL supports pipelined outstanding requests (`a_source` tags) and merges write-data with write-address onto a single Channel A.',
    },
    level2: {
      architectureAndMechanics:
        'Two independent valid/ready channels: Channel A (Host -> Device: `a_opcode`, `a_size`, `a_source`, `a_address`, `a_mask`, `a_data`, `a_user`) and Channel D (Device -> Host: `d_opcode`, `d_size`, `d_source`, `d_data`, `d_error`, `d_user`).',
      mathematicalAndTimingRules: [
        'TileLink Rule: Request transfer width = 2^a_size bytes (up to bus data width, typically 4 bytes on 32-bit TL-UL).',
        'OpenTitan Integrity: 7-bit Hsiao SECDED over command (`cmd_intg`) + 7-bit over data (`data_intg`), catching all 1–3 bit flips.',
        'Address alignment invariant: `(a_address & ((1 << a_size) - 1)) == 0`.',
      ],
      workedEngineeringExample:
        '32-bit `Get` read from 0x4110_0008 with `a_source=3`: Channel A drives `a_valid=1`, `a_opcode=3\'d4 (Get)`, `a_size=2\'d2 (4B)`, `a_mask=4\'hF`, `a_address=0x4110_0008`. Target checks `cmd_intg`, reads register, and 2 cycles later drives `d_valid=1`, `d_opcode=3\'d1 (AccessAckData)`, `d_source=3`, `d_data=0x1234_5678`.',
      resetAndInitialization:
        'Under `rst_ni=0`, `a_valid` and `d_valid` must clear to 0; OpenTitan crossbars also force blanking/zero integrity constants (`tlul_pkg::TL_H2D_DEFAULT`) so idle wires do not trigger false ECC alerts.',
    },
    level3: {
      rtlMicroarchitecture:
        'OpenTitan separates bus crossbars (`tlul_xbar`), register adapters (`tlul_adapter_reg`), SRAM bridges (`tlul_adapter_sram`), and FIFO adapters (`tlul_fifo_async` for CDC). Every endpoint wraps `tlul_cmd_intg_chk` + `tlul_rsp_intg_gen`.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Fatal security alert (`intg_err`) fires immediately on idle bus or invalid write.',
          rootCause: 'Testbench drove `a_user.cmd_intg = 0` instead of computing Hsiao SECDED syndrome, or forgot trailing blanking bytes.',
          resolution: 'Always compute integrity via `tlul_cmd_intg_gen` before crossbar entry or inside UVM `tl_agent`.',
        },
        {
          symptom: 'Partial byte write rejected with `d_error=1`.',
          rootCause: 'Using `PutFullData (0)` with a non-contiguous `a_mask != 4\'hF` for 4-byte size.',
          resolution: 'Use `PutPartialData (1)` whenever `a_mask` has disabled lanes.',
        },
      ],
      verificationAndAssertions:
        'Formal assertions prove `tlul_assert.sv` compliance on every port: legal opcodes (`Get=4`, `PutFullData=0`, `PutPartialData=1`), aligned addresses, unique outstanding `a_source` IDs when FIFO depth < max ID, and SECDED fault injection alert escalation.',
      siliconDebugPlaybook:
        'If OpenTitan locks into fatal lifecycle alert on boot, inspect `intg_err_o` across `xbar_main` peripherals to pinpoint which initiator forgot integrity generation or suffered an uninitialized SRAM read.',
    },
  },
  ddr5: {
    level1: {
      intuitionSummary:
        'DDR5 is high-density system RAM split into two independent 32-bit sub-channels per DIMM, running with on-die ECC and decision-feedback equalization (DFE) to feed multi-core CPUs and GPUs.',
      whyItExists:
        'DDR4 saturated single-64-bit channel efficiency around 3200 MT/s as multi-core servers scaled to 64–128 cores. Splitting one DIMM into two independent 40-bit channels (32b data + 8b ECC) and raising burst length to BL16 doubled concurrency.',
      everydayAnalogy:
        'Instead of one giant 64-lane checkout counter serving one giant cart, DDR5 splits the store into two fast 32-lane express aisles with built-in barcode self-checkers (on-die ECC) and tighter timing sync.',
      stepByStepMentalModel: [
        '1. Activate Row (`ACT`): Controller picks a Bank Group + Bank and opens one entire DRAM row into sense amplifiers.',
        '2. Read / Write Column (`RD`/`WR`): Waits `tRCD`, then triggers a 16-beat double-data-rate burst (BL16) across rising & falling DQS edges.',
        '3. Precharge & Refresh (`PRE`/`REF`): Closes rows and periodically refreshes leaky capacitor cells (`tREFI`) without starving bandwidth.',
      ],
      beginnerMisconception:
        'Assuming DDR5 transfers 1 word per clock cycle like SRAM—DRAMs are 2D capacitor grids that take dozens of cycles (`tRCD + CL`) to open a new row before the fast burst arrives.',
    },
    level2: {
      architectureAndMechanics:
        'JEDEC JESD79-5: Dual independent 32-bit (or 40-bit w/ ECC) sub-channels per DIMM, BL16 prefetch, up to 32 banks across 8 bank groups, 1.1V VDD, on-DIMM PMIC power management, and Same-Bank Refresh (SBR).',
      mathematicalAndTimingRules: [
        'Peak Bandwidth per Dual-Channel DIMM = (64 bits / 8) * DataRate_MTs (e.g., 6400 MT/s * 8 B = 51.2 GB/s).',
        'Row-Hit Read Latency = RL * tCK (nanoseconds); Row-Miss Latency = (tRP + tRCD + CL) * tCK.',
        'Data transferred per BL16 burst per 32-bit sub-channel = 16 beats * 4 bytes = 64 bytes (matches 1 CPU cache line!).',
      ],
      workedEngineeringExample:
        'DDR5-6400 (`CK = 3.2 GHz`, `tCK = 0.3125 ns`, DDR edge rate `6400 MT/s`): Timing `CL40-40-40` -> `tRCD = 40 * 0.3125 ns = 12.5 ns`. One BL16 read fills a complete 64-byte L1/L2 cache line in just 16 UI = 2.5 ns over a single 32-bit sub-channel while the peer sub-channel services another core simultaneously.',
      resetAndInitialization:
        'Strict JEDEC power-up FSM (`RESET_n` low >= 200 us -> CKE/CA training -> ZQ calibration -> Write Leveling -> Read Preamble/DQS eye training via DFI) before normal traffic opens.',
    },
    level3: {
      rtlMicroarchitecture:
        'Controller RTL splits into Front-End (AXI/CHI transaction queue + address hashing across Bank Groups), FR-FCFS Page Policy Arbiter (prioritizes open-row hits while capping starvation), Refresh FSM, and DFI 5.x PHY interface.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Single-bit errors silently accumulate or eye margin collapses above 5600 MT/s.',
          rootCause: 'Skipping periodic ZQ calibration or mis-tuning DFE tap weights during temperature/voltage drift.',
          resolution: 'Schedule ZQCAL commands per JEDEC interval and enable controller-initiated periodic read/write eye retraining.',
        },
        {
          symptom: 'Massive latency spikes every ~3.9 us.',
          rootCause: 'All-Bank Refresh (`REFab`) stalls the entire channel while Same-Bank Refresh (`REFsb`) was left disabled.',
          resolution: 'Enable Same-Bank Refresh so non-refreshing bank groups continue serving reads concurrently.',
        },
      ],
      verificationAndAssertions:
        'DFI compliance assertions check command-to-command spacing (`tRRD_S`, `tRRD_L`, `tFAW`, `tWTR_L`, `tRFC`), JEDEC timing-violation monitors during randomized row hits/misses, and rank-to-rank turnaround bubbles.',
      siliconDebugPlaybook:
        'Run per-bit DQ/DQS shmoo eye scans via PHY BIST/iJTAG; asymmetric eye collapse points to ODT mismatch, VrefCA miscalibration, or DQS-to-CK write-leveling skew.',
    },
  },
  'pcie-gen5': {
    level1: {
      intuitionSummary:
        'PCIe Gen5 is a 32 GT/s packetized serial superhighway linking CPUs to GPUs, NVMe SSDs, NICs, and AI accelerators over differential PCB/riser lanes.',
      whyItExists:
        'Parallel 64-bit PCI motherboards hit an electrical brick wall around 133 MHz because signal traces skew by nanoseconds. Sending self-clocked differential packets over SerDes lanes lets links scale to 32 GT/s (Gen5) and beyond.',
      everydayAnalogy:
        'Think of mailing tracked boxes internationally: The Transaction Layer writes the box address (TLP), the Data Link Layer stamps a tracking number & seal (Sequence + LCRC) for auto-retransmission, and the Physical Layer puts it on 16 parallel express jets.',
      stepByStepMentalModel: [
        '1. Transaction Layer (TLP): Converts CPU MMIO/DMA/MSI-X into Memory Read, Posted Write, or Completion packets.',
        '2. Data Link Layer (DLLP): Tracks ACK/NAK sequence numbers and Flow-Control Credits so no buffer ever overflows.',
        '3. Physical Layer (PIPE/SerDes): Scrambles 128b/130b blocks and runs LTSSM equalization across x1–x16 lanes.',
      ],
      beginnerMisconception:
        'Thinking PCIe is like a simple shared UART—a single x16 Gen5 link actually runs an autonomous hardware retransmission buffer, credit manager, and 3-phase Equalization LTSSM in silicon before software ever boots!',
    },
    level2: {
      architectureAndMechanics:
        'Three-layer full-duplex point-to-point architecture bridged internally via the PIPE 5.x parallel interface (32-bit @ 1 GHz or 64-bit @ 500 MHz per lane). Uses NRZ signaling with 128b/130b encoding at 32.0 GT/s.',
      mathematicalAndTimingRules: [
        'Raw Bit Rate (x16) = 32 GT/s * 16 lanes = 512 Gbps per direction.',
        'Encoding Efficiency = 128 / 130 = 98.46% (only 1.54% overhead vs 20% in Gen1/2 8b/10b).',
        'Net Unidirectional Payload (x16) ~= 512 * (128/130) / 8 ~= 63.0 GB/s (~126 GB/s bidirectional).',
        'Link Layer Latency & Credits: Receiver must advertise sufficient Posted/Non-Posted/Completion header & data credits for full round-trip Bandwidth-Delay Product (BDP).',
      ],
      workedEngineeringExample:
        'A GPU issues a 4KB DMA Read across x16 Gen5: Issues a Non-Posted `MRd` TLP (16B header, uses 1 NPH credit). Root Complex checks credit limit, routes to DDR5, and splits the 4KB answer into sixteen 256B `CplD` TLPs returning at ~63 GB/s (~65 ns payload duration) while incrementing Completion credits back.',
      resetAndInitialization:
        'PERST# deassertion triggers LTSSM: `Detect` (RX termination detect) -> `Polling` (TS1/TS2 bit/symbol lock at 2.5 GT/s) -> `Config` (lane width & link number) -> `L0` -> `Recovery.Equalization` (Phases 0–3 Tx/Rx preset/DFE sweep) up to 32 GT/s.',
    },
    level3: {
      rtlMicroarchitecture:
        'PCIe Controllers partition cleanly into Replay Buffer RAM (re-sends un-ACKed TLPs on NAK/timer expiry), Credit Accounting Arithmetic (modular unsigned wraparound comparisons!), Ordering Rules Matrix (Posted bypasses Non-Posted), and PIPE MAC-to-PCS gearbox.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Link trains cleanly at Gen5 then freezes transmission after ~2000 packets.',
          rootCause: 'Flow-control credit arithmetic used naive `(Limit > Consumed)` comparison instead of modular signed difference, breaking when 8-bit/12-bit credit counters wrapped past 0.',
          resolution: 'Implement `((Credits_Limit - Credits_Consumed) & MASK) >= Packet_Req` modular unsigned subtraction.',
        },
        {
          symptom: 'Deadlock between Root Complex and Endpoint completions.',
          rootCause: 'Endpoint stalled Completion channel behind an un-serviced Posted write (violating PCIe Producer-Consumer ordering).',
          resolution: 'Allow Posted Writes (`MWr`) to pass Non-Posted Reads (`MRd`) and Completions independently.',
        },
      ],
      verificationAndAssertions:
        'Inject LCRC bit errors during heavy Replay stress, verify Recovery speed-change transitions under backpressure, enforce PCIe Producer-Consumer ordering matrix, and stress modular credit wraparound boundaries.',
      siliconDebugPlaybook:
        'Inspect LTSSM trace states (`L0 -> Recovery.RcvrLock -> Polling` indicates high BER/CDR slip); read AER Correctable/Uncorrectable Error Status registers (`Bad TLP`, `Replay Rollover`, `Completion Timeout`).',
    },
  },
};

function makeCategoryTemplate(p: ProtocolDocument): LayeredConceptExplanation {
  const cat: CategoryId = p.categoryId;
  const sigNames = p.signals.slice(0, 4).map((s) => s.name).join(', ') || 'CLK, REQ, ACK, DATA';
  const clk = p.waveforms[0]?.clockName || p.signals[0]?.name || 'CLK';
  const firstStep = p.transactionFlow.nominal[0]?.description || p.overview.whyDeveloped;
  const secondStep = p.transactionFlow.nominal[1]?.description || p.architecture.dataFlow;
  const thirdStep = p.transactionFlow.nominal[2]?.description || p.architecture.controlFlow;

  const domainMap: Record<CategoryId, Omit<LayeredConceptExplanation, 'title'>> = {
    amba: {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) is a standardized Arm AMBA on-chip hardware bus contract allowing IP blocks from different teams to communicate without glue-logic surprises.`,
        whyItExists: `Without a shared protocol contract like ${p.name}, every CPU, DMA, and peripheral vendor would invent incompatible wire handshakes, making SoC integration impossibly slow and bug-prone.`,
        everydayAnalogy: `Imagine standardized electrical plugs and traffic rules inside a silicon city: ${p.name} ensures both initiator and target agree on when addresses, data, and delivery receipts cross the wires.`,
        stepByStepMentalModel: [
          `1. Address / Control Setup: ${firstStep}`,
          `2. Payload & Backpressure: ${secondStep}`,
          `3. Response / Completion: ${thirdStep}`,
        ],
        beginnerMisconception: `Assuming both sides always run at zero wait states—AMBA protocols rely on explicit ready/wait handshakes (${sigNames}) so slower memories can stall faster masters cleanly.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Core interface channels (${p.channels.join(', ')}) decouple timing and control via ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Clock Domain: Synchronous to ${clk}; signals update strictly on rising clock edges.`,
          `Throughput Bound: Peak BW = Bus_Width_Bytes × F_CLK × Transfer_Duty_Cycle.`,
          `Key Spec Rules: ${p.specifications.slice(0, 2).map((s) => `${s.parameter}=${s.value}`).join(' · ')}.`,
        ],
        workedEngineeringExample: `Cycle 1 (${clk}↑): Initiator qualifies request on ${p.signals[1]?.name || 'REQ'} and holds payload stable. If Target holds backpressure low on Cycle 2, values remain frozen ($stable). On Cycle 3 when both valid & ready assert, transfer commits and response completes cleanly.`,
        resetAndInitialization: p.architecture.clockAndReset,
      },
      level3: {
        rtlMicroarchitecture: `${p.rtl.architectureNotes} ${p.rtl.datapathNotes} Register slicing / skid buffering breaks combinatorial paths across large crossbar floors.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Silent dropped beat or corrupted address under backpressure.',
            rootCause: `Upstream RTL cleared valid or mutated payload before target ready sampled on ${clk}.`,
            resolution: `Gate output flip-flops strictly with (!valid_q || ready_i) and enable SVA stability checks.`,
          },
          {
            symptom: 'Fabric deadlock when bridge crosses async clocks.',
            rootCause: 'Multi-bit signals crossed clock domains without dual-clock FIFO or handshake synchronizer.',
            resolution: 'Deploy gray-coded async FIFO or CDC req/ack bridge.',
          },
        ],
        verificationAndAssertions: `${p.verification.uvmArchitecture} Assertions verify reset invariants, legal state transitions (${p.rtl.fsmStates.map((s) => s.label).join(' -> ')}), and zero X-propagation.`,
        siliconDebugPlaybook: `Capture waveform traces filtering for active handshakes vs wait stalls; verify ${p.sources[0]?.title || p.specVersion} rules on every boundary transition.`,
      },
    },
    interconnect: {
      level1: {
        intuitionSummary: `${p.name} is an on-chip interconnect specification governing how multiple processors, accelerators, and memories share bandwidth across an SoC fabric.`,
        whyItExists: `Point-to-point wires grow quadratically (N×M) as chips add cores and peripherals. Shared/switched interconnect protocols like ${p.name} provide scalable arbitration, address decoding, and pipelined transfers.`,
        everydayAnalogy: `Like a smart highway interchange with dedicated on-ramps, stoplights (arbiters), and lane splitters so dozens of drivers share one city grid without crashing.`,
        stepByStepMentalModel: [
          `1. Request & Arbitration: ${firstStep}`,
          `2. Crossbar Routing & Data: ${secondStep}`,
          `3. Response Correlation: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking interconnects are passive copper wires—in silicon they contain address decoders, fairness arbiters, width converters, and pipeline registers adding real area and latency.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Operates across ${p.channels.join(', ')} using signals ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Arbitration Latency = 1+ cycles on contested target ports.`,
          `Aggregate Crossbar BW = Min(Total Initiator Demand, Target Port Width × F_CLK × Non-Blocking Factor).`,
          `Governing Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Two initiators target the same subordinate simultaneously on ${clk}: Round-Robin Arbiter grants Initiator A on Cycle 1 while holding stall/wait-request on Initiator B; Initiator B seamlessly retires its transaction on Cycle 2 with zero lost address bits.`,
        resetAndInitialization: p.architecture.clockAndReset,
      },
      level3: {
        rtlMicroarchitecture: `${p.rtl.architectureNotes} Careful crossbar design avoids combinatorial loops between request valid and grant/stall paths.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Low-priority DMA master starves indefinitely under heavy CPU burst traffic.',
            rootCause: 'Strict fixed-priority arbiter never yields while CPU issues back-to-back requests.',
            resolution: 'Use weighted round-robin or aging QoS arbitration.',
          },
          {
            symptom: 'Out-of-order response misroutes data back to wrong initiator.',
            rootCause: 'Interconnect dropped or truncated extended master ID bits.',
            resolution: 'Widen subordinate ID bits by ceil(log2(Num_Masters)) through switch.',
          },
        ],
        verificationAndAssertions: `${p.verification.uvmArchitecture} Stress multi-master contention, simultaneous reset release, and address-decode hole error responses.`,
        siliconDebugPlaybook: `Inspect arbiter grant counters and outstanding transaction FIFOs to isolate contention hot spots vs protocol stalls.`,
      },
    },
    processor: {
      level1: {
        intuitionSummary: `${p.name} defines a dedicated hardware port allowing a CPU core to fetch instructions, read/write memory, halt for debugging, or offload math directly to tightly coupled coprocessors.`,
        whyItExists: `CPU execution pipelines cannot tolerate generic multi-layer network delays on every instruction fetch or custom instruction. Specialized processor interfaces minimize cycle latency down to 1–2 ticks.`,
        everydayAnalogy: `Like a chef's direct reach-in spice shelf right next to the stove—far faster than walking down the street to the central warehouse every time you need salt.`,
        stepByStepMentalModel: [
          `1. Pipeline Dispatch: ${firstStep}`,
          `2. Execution / Fetch Window: ${secondStep}`,
          `3. Commit / Exception Check: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking CPU interfaces ignore stalls—a missed cache line or multi-cycle coprocessor op must cleanly backpressure or hold speculative commits so exceptions stay precise.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Interfaces CPU stages across ${p.channels.join(', ')} (${sigNames}).`,
        mathematicalAndTimingRules: [
          `Fetch / Execute Penalty = Response_Latency - 1 pipeline stage bubble cycles.`,
          `Speculative Kill Window: Offloaded ops must respect pipeline flush/branch-mispredict signals.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `CPU issues request on Cycle 0 (${clk}↑); target grants address immediately (1-cycle turnaround), allowing Cycle 1 to prepare the next PC while Cycle 1 returns the fetched 32-bit opcode cleanly to decode.`,
        resetAndInitialization: p.architecture.clockAndReset,
      },
      level3: {
        rtlMicroarchitecture: `${p.rtl.architectureNotes} Critical timing optimization ensures target responses NEVER feed combinatorially back into next-cycle request signals (eliminating zero-cycle memory loops).`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Architectural state corrupts after branch misprediction or interrupt.',
            rootCause: 'Coprocessor committed speculative instruction result after CPU flushed pipe.',
            resolution: 'Wait for explicit commit/kill qualification wire before updating architectural registers.',
          },
        ],
        verificationAndAssertions: `${p.verification.uvmArchitecture} Co-simulate against Instruction Set Simulator (ISS) like Spike under random interrupts and branch flushes.`,
        siliconDebugPlaybook: `Compare retired PC trace logs against ISS golden trace to isolate exact cycle of instruction/result divergence.`,
      },
    },
    coherency: {
      level1: {
        intuitionSummary: `${p.name} is a logical cache-coherency protocol—not a physical wire bus—that guarantees all CPU cores and accelerators see consistent shared memory values despite having private caches.`,
        whyItExists: `When Core 0 updates a shared variable inside its fast private L1 cache, Core 1's old cached copy becomes stale. Without a strict coherency state machine, multithreaded code reads garbage data.`,
        everydayAnalogy: `Like multiple editors sharing a live Google Doc with strict "Read-Only Share" vs "Exclusive Edit Lock" badges—before anyone writes, everyone else's stale local draft gets invalidated or updated.`,
        stepByStepMentalModel: [
          `1. Request Ownership: Core checks its local tag state (Modified/Shared/Invalid, etc.) before writing.`,
          `2. Snoop or Directory Broadcast: Peer caches receive probes and downgrade/forward dirty cache lines.`,
          `3. Safe State Transition: Tag arrays transition deterministically without losing dirty modifications.`,
        ],
        beginnerMisconception: `Confusing MESI/MOESI/MESIF with physical pin specs—they are state-transition rulebooks carried on top of interconnects like ACE, CHI, or TileLink.`,
      },
      level2: {
        architectureAndMechanics: `Maintains per-cache-line state transitions across ${p.channels.join(', ')} (${sigNames}). Tracks clean vs dirty, shared vs private, and responder ownership roles.`,
        mathematicalAndTimingRules: [
          `Coherency Invariant (SWMR): Single-Writer OR Multiple-Readers per cache line at any logical instant.`,
          `Data-Value Invariant: Every read returns the value written by the most recent writer in coherence order.`,
          `Cache Line Granularity = Typically 64 bytes (512 bits).`,
        ],
        workedEngineeringExample: `Core A holds Line X in Shared (S) and wants to write -> Core A sends Upgrade/CleanUnique request -> Home/Bus snoops Core B -> Core B moves Line X from Shared (S) to Invalid (I) and ACKs -> Core A promotes Line X to Modified (M) and writes safely.`,
        resetAndInitialization: `All cache valid/coherency tag arrays MUST be hardware-flushed or initialized to Invalid (I) during reset before coherency traffic enables.`,
      },
      level3: {
        rtlMicroarchitecture: `Real coherent silicon needs transient intermediate states (e.g., IS_D, IM_AD, SM_AD) in MSHRs (Miss Status Holding Registers) because requests take multiple cycles and concurrent snoops collide mid-flight.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'System deadlocks or livelocks when two cores repeatedly steal the same cache line.',
            rootCause: 'Snoop responses blocked behind stalled request queues on the same Virtual Channel.',
            resolution: 'Assign strictly higher virtual-channel priority to Snoop & Response channels than Requests.',
          },
          {
            symptom: 'Silent memory corruption after dirty eviction.',
            rootCause: 'Core evicted a Modified line simultaneously as an incoming snoop arrived without tracking transient writeback state.',
            resolution: 'Model explicit MSHR transient hazard states and verify with formal model checker.',
          },
        ],
        verificationAndAssertions: `Formal model checking (Murphi / SVA) + multi-core random false-sharing stress tests asserting Single-Writer-Multiple-Reader invariants on every cycle.`,
        siliconDebugPlaybook: `Dump MSHR & directory tracker histories upon watchdog timeout to trace which transient state failed to drain a snoop ack.`,
      },
    },
    memory: {
      level1: {
        intuitionSummary: `${p.name} governs how chips store and stream gigabytes of volatile data inside high-density DRAM or fast SRAM arrays at multi-gigabit speeds.`,
        whyItExists: `On-chip SRAM is fast (~1 cycle) but ~100× too big/expensive for gigabytes of AI weights or OS memory. External ${p.name} packs billions of tiny capacitor bits by multiplexing Row and Column commands.`,
        everydayAnalogy: `Like a vast multi-floor library archive: first an elevator goes to the right floor/aisle (Row Activate), waits for the shelf tray to slide out (tRCD), then pulls 16 books rapidly down the chute (Data Burst).`,
        stepByStepMentalModel: [
          `1. Row Open (ACT) or CS Select: ${firstStep}`,
          `2. Column Access & Timing Guardbands: ${secondStep}`,
          `3. High-Speed Data Burst & Refresh: ${thirdStep}`,
        ],
        beginnerMisconception: `Expecting uniform random-access latency like CPU registers—opening a closed row or hitting a refresh cycle costs tens of nanoseconds compared to fast consecutive bank hits.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Coordinates command/address, strobe, and DQ data buses (${sigNames}) across strict picosecond AC timing budgets.`,
        mathematicalAndTimingRules: [
          `Peak Raw Bandwidth = Data_Bus_Bytes × Transfers_Per_Second (MT/s).`,
          `Key JEDEC/Timing Delays: tRCD (ACT-to-RD/WR), CL/RL (RD-to-Data), tRP (PRE-to-ACT), tREFI (Refresh Interval).`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Row-Hit vs Row-Miss comparison: If bank row is already open (page hit), data returns after Read Latency (RL); if a different row is open in that bank, controller must Precharge (tRP) -> Activate (tRCD) -> Read (RL), nearly tripling access latency.`,
        resetAndInitialization: `Requires deterministic power-up reset sequence, PLL/DLL lock, ZQ impedance calibration, and read/write DQ-DQS eye training before normal memory map access.`,
      },
      level3: {
        rtlMicroarchitecture: `High-performance controllers separate transaction reordering (FR-FCFS bank schedulers) from DFI PHY command timing engines and periodic calibration/refresh state machines.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Random bit flips appear under heavy contiguous workload or high temperature.',
            rootCause: 'Rowhammer / refresh starvation or drifted DQS write-leveling phase.',
            resolution: 'Enforce bounded refresh postponement (max 8× tREFI), targeted row refresh (TRR), and periodic PHY ZQ/training.',
          },
        ],
        verificationAndAssertions: `Verify all JEDEC AC timing constraints (tFAW, tRRD, tWTR) using compliance DIMM/VIP models alongside back-to-back bank conflict stress.`,
        siliconDebugPlaybook: `Inspect PHY training logs and per-lane DQ Vref/delay shmoo plots to isolate signal integrity vs controller timing bugs.`,
      },
    },
    storage: {
      level1: {
        intuitionSummary: `${p.name} provides non-volatile data storage access so code, bootloaders, AI models, and user files survive power-off.`,
        whyItExists: `DRAM and SRAM lose everything the instant power turns off. Storage protocols bridge SoCs to Flash arrays or NVMe SSDs while hiding erase-before-write quirks and ECC wear management.`,
        everydayAnalogy: `Like writing into a permanent notebook with strict page-erase rules: you can read pages swiftly (or Execute-in-Place), but rewriting requires copying/erasing whole blocks carefully.`,
        stepByStepMentalModel: [
          `1. Command / Doorbell Issue: ${firstStep}`,
          `2. Internal Array / Controller Transfer: ${secondStep}`,
          `3. Busy Polling / Completion: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking Flash writes immediately like RAM—programming or erasing NAND/NOR pages takes microseconds to milliseconds and requires checking BUSY status or interrupts.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Operates across ${p.channels.join(', ')} with ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Throughput = Lane_Count × Bit_Rate_Per_Lane / Framing_Overhead.`,
          `Boot Latency = Reset_Hold + SFDP/Descriptor_Read + Page_Load_Time.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Boot ROM reads 64 KB firmware from ${p.name}: Host configures command opcode/queue, streams blocks across multi-lane data pins/PCIe queues, verifies CRC/ECC, and jumps PC to SRAM.`,
        resetAndInitialization: p.architecture.clockAndReset,
      },
      level3: {
        rtlMicroarchitecture: `Controllers separate XIP/DMA host interface from hardware command sequencer, CRC/BCH/LDPC ECC engines, and clock/IO pad timing recovery.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'SoC fails cold boot intermittently from Flash/SSD.',
            rootCause: 'Boot ROM sampled read data too fast before Flash dummy cycles or DQS strobe calibration completed.',
            resolution: 'Start boot at safe conservative clock frequency & dummy cycle count before enabling DDR/quad/octal turbo modes.',
          },
        ],
        verificationAndAssertions: `Test power-loss recovery mid-write, dummy-cycle edge boundaries, and multi-bit ECC injection/correction thresholds.`,
        siliconDebugPlaybook: `Probe CS_n, CLK, and DATA/DQS lines during first 10 ms of boot to verify opcode bytes and dummy turnaround cycles match target datasheet.`,
      },
    },
    peripheral: {
      level1: {
        intuitionSummary: `${p.name} is a lean, low-pin-count board or sensor interface linking chips cleanly without burning expensive silicon I/O pads.`,
        whyItExists: `Each external chip pin costs precious package area, ESD circuitry, and PCB routing layers. Serial peripheral buses reduce 32+ parallel wires down to 1–4 shared pins.`,
        everydayAnalogy: `Think of Morse code or single-file people walking across a narrow footbridge—sending bits one by one takes more clock ticks than a 64-lane highway, but saves massive bridge cost!`,
        stepByStepMentalModel: [
          `1. Wake-Up / Start Condition: ${firstStep}`,
          `2. Bit-by-Bit Shift: ${secondStep}`,
          `3. ACK / Parity / Stop: ${thirdStep}`,
        ],
        beginnerMisconception: `Sampling external asynchronous/open-drain pins directly inside state machines without 2-flip-flop synchronizers causes random metastability glitches.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Operates over ${p.channels.join(', ')} (${sigNames}).`,
        mathematicalAndTimingRules: [
          `Net Bit Rate = Line_Baud_Rate × (Payload_Bits / Total_Frame_Bits).`,
          `Baud / Clock Divider = F_SYSCLK / Target_Bus_Freq.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Oversampling a serial wire at 16× line rate lets digital glitch filters reject narrow PCB spikes and sample cleanly inside the middle 50% eye of every serial bit.`,
        resetAndInitialization: p.architecture.clockAndReset,
      },
      level3: {
        rtlMicroarchitecture: `Requires 2-FF input synchronizers (` + '`prim_flop_2sync`' + `), glitch-filter majority voting, programmable baud counters, and TX/RX FIFOs to decouple CPU interrupt latency.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Intermittent framing errors or NACKs under board noise.',
            rootCause: 'Missing input synchronizer or rise-time violation on open-drain pull-up resistors.',
            resolution: 'Add 2-FF sync + debounce filter in RTL and size external pull-ups per bus capacitance.',
          },
        ],
        verificationAndAssertions: `Randomize clock jitter/baud mismatch (+/- 3%), inject mid-frame glitch pulses, and stress RX FIFO overflow recovery.`,
        siliconDebugPlaybook: `Check pinmux drive strength, pull-up rise time on oscilloscope, and compare baud divider register vs actual PLL clock.`,
      },
    },
    'high-speed': {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) is a high-speed differential SerDes interconnect moving tens to hundreds of gigabits per second across boards, cables, or backplanes.`,
        whyItExists: `Parallel buses fail at multi-GHz speeds due to wire-to-wire trace skew and crosstalk. Differential SerDes sends a self-clocked bit stream whose clock is recovered mathematically inside the receiver.`,
        everydayAnalogy: `Like high-speed fiber-optic freight tubes using error-correcting barcodes: even if noisy electrical air slightly distorts a pulse, equalization and FEC rebuild the exact bits cleanly.`,
        stepByStepMentalModel: [
          `1. Physical Link Training & Equalization: ${firstStep}`,
          `2. Packet Framing & Credits: ${secondStep}`,
          `3. CRC / Replay Error Recovery: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking SerDes wires stay crisp digital square waves—above 16–32 GT/s the received eye is completely closed until receiver CTLE/DFE equalization re-opens it!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Layered MAC/Data-Link/PCS/PMA stack over ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Aggregate Bandwidth = Lanes × Symbol_Rate × Bits_Per_Symbol (1=NRZ, 2=PAM4) × Line_Code_Eff.`,
          `BER Requirement: Typically < 1e-12 post-FEC (raw pre-FEC ~1e-6 on PAM4 links).`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `At 32+ GT/s, PCB trace attenuation drops signal amplitude by >25 dB at Nyquist; TX 3-tap FIR pre-emphasis + RX CTLE/DFE flatten the channel response so Clock-Data Recovery locks cleanly.`,
        resetAndInitialization: `Link bring-up runs through electrical idle exit, CDR frequency lock, bit/symbol alignment, lane deskew, and speed/width negotiation FSMs.`,
      },
      level3: {
        rtlMicroarchitecture: `High-speed controllers carefully separate high-speed recovered PHY clock domains from core fabric clocks via elastic buffers (` + '`skp`' + ` ordered-set add/drop) and modular sequence/credit wraparound logic.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Link drops periodically to lower Gen speed or triggers excessive CRC replays.',
            rootCause: 'Clock PPM offset (+/- 300 ppm) caused elastic buffer over/underflow or sub-optimal equalization presets.',
            resolution: 'Verify SKP ordered-set insertion rate and sweep TX/RX EQ presets during link training.',
          },
        ],
        verificationAndAssertions: `Verify LTSSM state transitions under lane polarity inversion, lane reversal, injected bit errors, and credit/sequence wraparound.`,
        siliconDebugPlaybook: `Extract eye-height/width bathtub plots via internal SerDes iJTAG monitors and log LTSSM recovery transition histograms.`,
      },
    },
    usb: {
      level1: {
        intuitionSummary: `${p.name} provides plug-and-play host-to-device connectivity spanning hot-plug discovery, data transport, and power delivery over universal cables.`,
        whyItExists: `Before USB, keyboards, printers, disks, and cameras each used incompatible legacy ports requiring reboots and manual IRQs. USB unifies enumeration, power, and packet scheduling.`,
        everydayAnalogy: `Like a universal smart power-and-data socket: the moment you plug in, the host asks "Who are you, how much power do you want, and what speed can you handle?"`,
        stepByStepMentalModel: [
          `1. Attach & Enumerate: ${firstStep}`,
          `2. Endpoint Schedule & Transfer: ${secondStep}`,
          `3. ACK / Power State Management: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking a USB device can send data whenever it wants—USB is strictly host-scheduled via SOF/ITP frames and Transfer Rings inside xHCI/EHCI.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Coordinates PHY signaling, endpoint pipes, and host controller DMA descriptors via ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Frame / Microframe Timing: 1 ms (Full-Speed) / 125 us (High-Speed & SuperSpeed ITP).`,
          `Bandwidth Budget: Control/Isochronous pipes reserve guaranteed periodic microframe slots.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Upon plug-in over USB-C, CC1/CC2 orientation resistors resolve cable flip -> USB PD negotiates 20V/5A -> host xHCI issues ` + '`GET_DESCRIPTOR`' + ` on Endpoint 0 -> assigns device address -> activates Bulk/Isochronous rings.`,
        resetAndInitialization: `SE0 reset signaling (>10 ms on USB2) or Warm/Hot Reset on SuperSpeed places device at Address 0 ready for enumeration.`,
      },
      level3: {
        rtlMicroarchitecture: `Device/Host silicon integrates UTMI+/ULPI/PIPE PHY wrappers, protocol CRC5/CRC16/CRC32 engines, endpoint SRAM FIFOs, and DMA scatter-gather engines.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Device disconnects randomly when entering U1/U2/L2 sleep states.',
            rootCause: 'LFPS wake-up handshake timing or VBUS debounce threshold violated.',
            resolution: 'Verify LFPS tRepeat/tBurst timings across async suspend/resume clock gating.',
          },
        ],
        verificationAndAssertions: `Test Surprise Removal mid-DMA, USB2 fallback, U1/U2/U3 link power state stress, and descriptor/CRC fault recovery.`,
        siliconDebugPlaybook: `Capture protocol-analyzer trace of SETUP/DATA/STATUS stages on EP0 and check xHCI TRB completion error codes.`,
      },
    },
    networking: {
      level1: {
        intuitionSummary: `${p.name} defines standardized Ethernet packet framing, MAC-to-PHY boundaries, or high-speed link rates powering data centers, routers, and SoC NICs.`,
        whyItExists: `Decoupling the Ethernet MAC controller from the physical copper/optical PHY via standard interfaces (MII/GMII/XGMII/SerDes) lets any SoC pair seamlessly with any vendor transceiver.`,
        everydayAnalogy: `Like standardized shipping container sizes at a seaport: whether the cargo arrives by truck (copper), train (backplane), or ship (optical fiber), the crane interface stays identical.`,
        stepByStepMentalModel: [
          `1. Preamble / SFD Framing: ${firstStep}`,
          `2. MAC-PHY Stream & FCS: ${secondStep}`,
          `3. Link Management / Pause: ${thirdStep}`,
        ],
        beginnerMisconception: `Assuming Ethernet carries zero idle overhead—between every frame sits a mandatory Inter-Packet Gap (IPG = 12 bytes), 8B Preamble/SFD, and 4B FCS CRC-32.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Moves packet streams across ${p.channels.join(', ')} (${sigNames}).`,
        mathematicalAndTimingRules: [
          `Min Ethernet Frame Size = 64 bytes (excl. 8B preamble + 12B IPG = 84 bytes on wire -> 14.88 Mpps per 10G!).`,
          `Packet Rate Formula = Link_BPS / ((Frame_Bytes + 20) * 8).`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `At 100G line rate, a minimum 64-byte frame (+20B overhead = 672 bits) arrives every 6.72 ns—requiring wide 512-bit internal MAC datapaths at >= 200–390 MHz inside ASIC/FPGA NICs.`,
        resetAndInitialization: `MDIO Clause 22/45 configures PHY auto-negotiation; MAC waits for PCS block-lock/link_up before draining TX packet FIFOs.`,
      },
      level3: {
        rtlMicroarchitecture: `High-speed MAC/PCS RTL uses deficit idle counters (DIC) to preserve average 12B IPG, pipelined parallel CRC-32 generators, IEEE 1588 nanosecond timestampers at SFD, and asynchronous TX/RX elastic FIFOs.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Tiny 64B packets drop at wire rate while large 1500B jumbo frames pass cleanly.',
            rootCause: 'Under-sized MAC header parser or fixed >12B IPG wasted small-frame budget.',
            resolution: 'Implement Deficit Idle Count (DIC) and size parser pipeline for 1 packet per cycle.',
          },
        ],
        verificationAndAssertions: `Verify 100% wire-rate 64B frame floods, runt/jabber/bad-FCS drops, pause/PFC XOFF storms, and PPM clock-drift tolerance.`,
        siliconDebugPlaybook: `Read RMON/MIB MAC counters (` + '`aFramesTransmittedOK`' + ` vs ` + '`aFCSErrors`' + ` vs PCS ` + '`hi_ber`' + `) to distinguish PHY signal integrity from MAC FIFO overflow.`,
      },
    },
    mipi: {
      level1: {
        intuitionSummary: `${p.name} is an ultra-low-EMI, battery-optimized MIPI Alliance standard connecting mobile cameras, displays, sensors, storage, or RF modems inside compact devices.`,
        whyItExists: `Smartphones and ADAS sensors pack sensitive cellular/Wi-Fi antennas millimeters away from multi-gigabit camera and display cables—MIPI minimizes electromagnetic radiation and idle battery drain.`,
        everydayAnalogy: `Like whispering concisely in high-speed bursts and immediately sleeping between sentences so nearby radios aren't disturbed and batteries last all day.`,
        stepByStepMentalModel: [
          `1. Low-Power (LP) Wake & SOT: ${firstStep}`,
          `2. High-Speed (HS) Packet Burst: ${secondStep}`,
          `3. EOT Return to LP-11 Stop: ${thirdStep}`,
        ],
        beginnerMisconception: `Expecting MIPI D-PHY lanes to run at a steady LVDS voltage—D-PHY physically switches between 1.2V CMOS Low-Power (` + '`LP-11`' + `) and 200 mV High-Speed (` + '`HS`' + `) modes on the exact same wires!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Combines packet framing, ECC/CRC protection, and physical lane signaling across ${sigNames}.`,
        mathematicalAndTimingRules: [
          `CSI-2 / DSI Packet Overhead = 4-byte Header (DI + WC + ECC) + 2-byte CRC-16 footer.`,
          `Total Pixel Bandwidth = H_total × V_total × FPS × Bits_Per_Pixel.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `4K 60fps 10-bit RAW camera over 4-lane D-PHY: Active rate ~= 3840 × 2160 × 60 × 10 ~= 4.98 Gbps + ~15% blanking ~= 5.8 Gbps (~1.45 Gbps/lane, comfortably inside D-PHY v1.2/v2.1 limits).`,
        resetAndInitialization: `Power-on initializes lanes to LP-11 Stop State (>100 us T_INIT) before HS burst synchronization begins.`,
      },
      level3: {
        rtlMicroarchitecture: `MIPI RTL bridges analog PPI byte-clock domains into SoC AXI4-Stream / pixel clock domains via line-buffer FIFOs, lane deskew aligners, and real-time ECC single-bit correction.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Corrupted green/black frames or SOT sync failures.',
            rootCause: 'Analog T_HS-PREPARE / T_HS-SETTLE timer mismatch prevented receiver from capturing the 0xB8 Sync Byte.',
            resolution: 'Tune receiver PPI settle counter in terms of HS byte clocks against sensor datasheet.',
          },
        ],
        verificationAndAssertions: `Verify LP <-> HS mode transitions, multi-lane byte skew injection, Virtual Channel interleaving, and short/long packet ECC error recovery.`,
        siliconDebugPlaybook: `Probe LP-11 -> LP-01 -> LP-00 -> HS transitions on oscilloscope and check SoC MIPI Rx ECC/CRC/SoT interrupt status registers.`,
      },
    },
    display: {
      level1: {
        intuitionSummary: `${p.name} streams real-time high-resolution video frames, audio, and monitor capabilities from a GPU/SoC display engine to an LCD, OLED, or external screen.`,
        whyItExists: `Displays require jitter-free continuous pixel delivery synchronized to exact horizontal and vertical refresh windows—any pipeline stall tears or blanks the visible image.`,
        everydayAnalogy: `Like a movie projector painting rows left-to-right, top-to-bottom 60–240 times every second with brief "turnaround pauses" (Horizontal & Vertical Blanking) between lines and frames.`,
        stepByStepMentalModel: [
          `1. EDID / AUX Capability Read: ${firstStep}`,
          `2. Active Pixels & Blanking Sync: ${secondStep}`,
          `3. Link Maintenance / Hotplug: ${thirdStep}`,
        ],
        beginnerMisconception: `Multiplying only visible resolution (1920×1080) to pick clock rate—total pixel clock must include Horizontal & Vertical Blanking intervals (~15–25% extra pixels)!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Coordinates pixel streams, sideband EDID/AUX setup, and HPD over ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Pixel Clock (Hz) = (H_active + H_blank) × (V_active + V_blank) × Refresh_Hz.`,
          `Raw Video Bitrate = Pixel_Clock × Bits_Per_Pixel (e.g., 24/30 bpp).`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `1080p60 CVT-RB: H_total=2080, V_total=1111, Pixel_Clk = 2080 × 1111 × 60 = 138.65 MHz. At 24 bpp RGB, raw link rate = 3.33 Gbps (plus encoding overhead -> 4.16 Gbps TMDS/DP).`,
        resetAndInitialization: `Sink asserts HPD=1 -> Source reads EDID over DDC/AUX -> Trains physical link (if DP/FRL) -> Starts raster timing generator.`,
      },
      level3: {
        rtlMicroarchitecture: `Display controllers use asynchronous dual-clock pixel FIFOs bridging SoC AXI4 DMA fetches cleanly to the exact PLL-generated Pixel Clock, with underflow protection and VRR blanking stretch.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Screen flickers or loses sync during heavy GPU/AI DRAM load.',
            rootCause: 'Display DMA experienced QoS starvation, underflowing the pixel FIFO mid-scanline.',
            resolution: 'Assign highest real-time QoS priority to display DMA and size FIFO for worst-case DRAM latency.',
          },
        ],
        verificationAndAssertions: `Verify HSYNC/VSYNC/DE geometry consistency, CRC pixel comparison per frame, and AUX/HPD unplug/replug recovery.`,
        siliconDebugPlaybook: `Enable display test-pattern generator (TPG) inside DisplayPort/HDMI TX to isolate DMA memory starvation from PHY link integrity issues.`,
      },
    },
    'chip-to-chip': {
      level1: {
        intuitionSummary: `${p.name} connects separate silicon chiplets inside one package (2.5D interposer, EMIB, or organic substrate) so modular dies act like a single monolithic chip.`,
        whyItExists: `Modern AI GPUs and server CPUs hit the lithography reticle limit (~858 mm²) and yield cliff. Splitting giant dies into smaller chiplets and bonding them with dense ${p.name} bridges restores massive bandwidth at picojoule/bit energy.`,
        everydayAnalogy: `Instead of manufacturing one brittle skyscraper-sized microchip where one defect ruins the whole wafer, chiplet architectures build tested apartments and connect them across ultra-short skybridges.`,
        stepByStepMentalModel: [
          `1. Sideband Discovery & Lane Repair: ${firstStep}`,
          `2. High-Density D2D Streaming: ${secondStep}`,
          `3. Tunneled Protocol Mapping: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking D2D links need heavy SerDes equalization like 1-meter PCIe cables—at 0.5–10 mm package reach, simplicity, bump pitch, and pJ/bit energy matter far more than complex DFE!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Moves parallel slices or flits across ${p.channels.join(', ')} (${sigNames}).`,
        mathematicalAndTimingRules: [
          `Shoreline Bandwidth Density = (Throughput_GBs / Shoreline_mm).`,
          `Energy Efficiency Target = 0.25 to 0.75 pJ/bit (10× better than off-package PCIe).`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `A single UCIe/BoW module running 32 data wires at 16–32 GT/s delivers 512–1024 Gbps in a ~1 mm² shoreline footprint with <2 ns adapter+PHY latency.`,
        resetAndInitialization: `Always-on sideband (` + '`SB_CLK`/`SB_DATA`' + `) boots first, detects defective micro-bumps, swaps redundant spare lanes, and trains forwarded clock phase.`,
      },
      level3: {
        rtlMicroarchitecture: `Separates Protocol Layer (PCIe/CXL/AXI/CHI flit framing) across FDI/RDI adapters from Physical lane-repair muxes, valid/clock forwarding, and runtime health monitors.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Known-good dies fail assembly screening due to 1 bad micro-bump.',
            rootCause: 'Redundant spare lane remapping mux failed to activate during sideband training.',
            resolution: 'Verify spare lane repair bitmaps across all data, clock, and valid bumps.',
          },
        ],
        verificationAndAssertions: `Inject forced defective lanes, forwarded-clock phase jitter, and adapter backpressure stalls across multi-die co-simulation.`,
        siliconDebugPlaybook: `Read sideband lane-repair registers and per-pin PRBS error counters to locate open/bridged package bumps.`,
      },
    },
    automotive: {
      level1: {
        intuitionSummary: `${p.name} is an EMI-hardened, deterministic vehicle communication bus built to survive harsh engine noise, extreme temperatures (-40°C to +150°C), and safety-critical braking/ADAS deadlines.`,
        whyItExists: `Consumer buses drop packets silently under ignition EMI or fail without safety bounds. Automotive ECUs require deterministic arbitration, fault containment, and strict ISO 26262 diagnostics.`,
        everydayAnalogy: `Think of an armored emergency dispatch radio in a noisy storm: strict priority rules ensure braking commands always talk first, and automatic checksums catch any static instantly.`,
        stepByStepMentalModel: [
          `1. Priority Arbitration / Slot Sync: ${firstStep}`,
          `2. Differential Noise-Immune Frame: ${secondStep}`,
          `3. CRC Check & Fault Confinement: ${thirdStep}`,
        ],
        beginnerMisconception: `Assuming higher raw baud rate always wins—in vehicles, non-destructive ID arbitration (` + '`CAN`' + `) or TDMA collision-free determinism (` + '`FlexRay/10BASE-T1S`' + `) prevents safety messages from ever starving.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Connects ECU controller MACs to transceivers across ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Worst-Case Bus Latency = Frame_Time + Sum(Higher_Priority_Frames) (must meet ASIL deadline).`,
          `Bit-Timing Quanta: T_bit = (Sync_Seg + Prop_Seg + Phase_Seg1 + Phase_Seg2) * T_q.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `CAN FD switches dynamically after the Bit-Rate Switch (` + '`BRS`' + `) bit from 500 kbps arbitration up to 5 Mbps data phase—cutting a 64-byte sensor payload airtime by >4× without breaking physical collision-free arbitration.`,
        resetAndInitialization: `Controllers boot in Error-Active/Config mode, synchronize bit timing, and transition to Bus-Off fault containment automatically if TX error counters exceed 255.`,
      },
      level3: {
        rtlMicroarchitecture: `Automotive IP blocks embed bit-stuffing/unstuffing FSMs, hardware CRC15/CRC17/CRC21 polynomials, TX/RX error counters (TEC/REC), and partial-networking wake-up pattern detectors.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Node enters Bus-Off continuously during multi-node bursts.',
            rootCause: 'Sample-point mismatch across oscillator tolerances caused bit-stuff/ACK errors at high baud rates.',
            resolution: 'Match sample point (~75–80%) and verify oscillator tolerance budgets across temp.',
          },
        ],
        verificationAndAssertions: `Test simultaneous multi-node dominant/recessive ID arbitration, bit-stuff errors, Bus-Off -> recovery cycles, and ISO 26262 parity checks.`,
        siliconDebugPlaybook: `Inspect CANH-CANL differential eye on oscilloscope while logging controller Error Warning / Passive / Bus-Off interrupt status.`,
      },
    },
    debug: {
      level1: {
        intuitionSummary: `${p.name} gives silicon engineers and firmware developers X-ray vision inside a packaged chip—allowing board connectivity testing, CPU halt/single-stepping, and live trace capture.`,
        whyItExists: `Once silicon leaves the fab in a tiny BGA package, you cannot touch internal wires with a multimeter. Debug & DFT interfaces serialize control to inspect flip-flops, halt cores, and capture execution history.`,
        everydayAnalogy: `Like a car's OBD-II diagnostic port combined with a black-box flight recorder: even if the main engine CPU crashes, you can pause it, inspect every internal gauge, and test every wire.`,
        stepByStepMentalModel: [
          `1. TAP / Debug Probe Attach: ${firstStep}`,
          `2. Shift Instructions / Commands: ${secondStep}`,
          `3. Halt, Inspect CSRs or Stream Trace: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking JTAG/SWD runs on the system CPU clock—external debug probes supply their OWN slow asynchronous clock (` + '`TCK`/`SWCLK`' + `), creating critical Clock Domain Crossings!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Drives state machines and transport registers across ${sigNames}.`,
        mathematicalAndTimingRules: [
          `TCK / SWCLK Constraint: Typically <= System_Clk / 4 for reliable async handshake synchronization.`,
          `Scan Shift Time = (Chain_Length_Bits / F_TCK).`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Reading RISC-V / Arm IDCODE via JTAG: Probe drives TMS sequence ` + '`1-1-1-1-1`' + ` (guarantee Test-Logic-Reset) -> ` + '`0-1-0-0`' + ` (Shift-DR) -> clocks 32 TCK ticks to shift out manufacturer/part ID on TDO.`,
        resetAndInitialization: `Test reset (` + '`TRSTn`' + ` or 5× ` + '`TMS=1`' + `) resets debug TAP independently of functional system reset (` + '`rst_n`' + `) so engineers can debug locked-up cores!`,
      },
      level3: {
        rtlMicroarchitecture: `Production DFT/Debug integrates async CDC synchronizers across TCK <-> sys_clk, scan-chain isolation wrappers (IEEE 1500/1687), and lifecycle security locks preventing unauthorized access in production silicon.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Debugger corrupts IDCODE or hangs randomly on fast JTAG probes.',
            rootCause: 'TCK operated faster than sys_clk handshake turnaround without returning WAIT status cleanly, or TDO sampled on wrong clock edge.',
            resolution: 'Drive TDO on negedge TCK (per IEEE 1149.1) and enforce CDC sticky busy/wait flags.',
          },
        ],
        verificationAndAssertions: `Verify BSDL boundary scan vectors, full IDCODE/DTMCS/DMI transactions under random TCK:sys_clk frequency ratios, and secure debug lock bypass rejection.`,
        siliconDebugPlaybook: `Always confirm IDCODE read first; if IDCODE returns 0x00000000 or 0xFFFFFFFF, check TRSTn polarity, VTref, and lifecycle fuse status.`,
      },
    },
    security: {
      level1: {
        intuitionSummary: `${p.name} enforces hardware-rooted confidentiality, data integrity, or tamper detection inside secure enclaves so attackers cannot steal keys via software bugs or physical glitches.`,
        whyItExists: `Even bug-free software fails if an attacker injects a voltage brownout, shoots a laser at a wire, or reads unencrypted RAM. Dedicated hardware security interfaces enforce defense-in-depth inside silicon.`,
        everydayAnalogy: `Think of a bank vault where the guard checks tamper seals on every envelope (` + '`SECDED`' + `), receives keys through a blinded wall slot (` + '`keymgr sideload`' + `), and sounds a dual-wire lockdown alarm (` + '`alert`' + `) if anyone picks the lock.`,
        stepByStepMentalModel: [
          `1. Authenticated Request / Integrity Check: ${firstStep}`,
          `2. Isolated Constant-Time / Masked Execution: ${secondStep}`,
          `3. Alert Escalation / Lockdown on Fault: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking a security check is just a functional feature—every hardware error wire, shadowed register, and parity bit must trigger fail-closed lockdowns even if an attacker flips bits intentionally!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Enforces integrity, key isolation, or attestation across ${sigNames}.`,
        mathematicalAndTimingRules: [
          `SECDED Capability: Single-Error-Correct / Double-Error-Detect (Hamming distance >= 4).`,
          `Dual-Rail / Differential Alerts: Complementary pairs prevent single stuck-at faults from muting alarms.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Fault-injection defense: Writing a shadowed control CSR twice allows comparing write #1 vs inverted shadow copy; any laser glitch flipping 1 bit immediately mismatches ` + '`storage != ~shadow`' + ` and triggers a fatal alert.`,
        resetAndInitialization: `Power-on resets zeroize volatile key registers, scramble SRAM keys, and read OTP lifecycle states before exposing peripheral buses.`,
      },
      level3: {
        rtlMicroarchitecture: `Hardened security RTL applies ` + '`prim_flop_2sync`' + `, sparse FSM encodings (Hamming distance >= 3 instead of binary 0/1/2), shadowed registers, differential alert transmitters, and DOM side-channel masking.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Fault-injection test bypasses FSM check into unlocked state.',
            rootCause: 'Synthesizer optimized sequential binary FSM encoding (`2\'b00 -> 2\'b01`) so a 1-bit glitch jumped straight to `DONE`.',
            resolution: 'Use sparse encodings (`mubi` / Hamming >= 3) with `prim_sparse_fsm_flop` (`keep = true`) and default-to-FATAL state.',
          },
        ],
        verificationAndAssertions: `Run formal fault-injection (FI) bit-flip sweeps on every FSM register and bus integrity bit, confirming 100% alert escalation with zero key leakage.`,
        siliconDebugPlaybook: `Inspect Alert Handler crash dump registers (` + '`FATAL_FAULT_STATUS`' + `) to isolate which block triggered integrity, sparse FSM, or storage mismatch alerts.`,
      },
    },
    noc: {
      level1: {
        intuitionSummary: `${p.name} routes packetized traffic across multi-core and heterogeneous SoC tiles so dozens of agents communicate concurrently without giant global wire bottlenecks.`,
        whyItExists: `A central monolithic crossbar fails above ~8–16 masters because wire capacitance and mux fan-in ruin timing closure. A packetized NoC pipelines hops cleanly across short local links.`,
        everydayAnalogy: `Like a city subway & packet postal grid: instead of paving private direct roads from every house to every store, packets hop through compact router intersections using destination tags.`,
        stepByStepMentalModel: [
          `1. Packetize Into Flits (Header/Body/Tail): ${firstStep}`,
          `2. Route & Arbitrate Across VCs: ${secondStep}`,
          `3. Credit Return & Egress Reassembly: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking a NoC carries whole packets in one hop—wormhole NoCs slice packets into small flits so the header reaches the destination while the tail is still entering the source!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Moves packetized flits across ${p.channels.join(', ')} (${sigNames}).`,
        mathematicalAndTimingRules: [
          `Zero-Load Latency = (Hop_Count * Router_Pipe_Stages) + Serialization_Cycles.`,
          `Bisection Bandwidth = Cross_Section_Links * Link_Width * F_NOC.`,
          `Credit Sizing >= Round-Trip Link + Arbiter Delay (keeps throughput at 100%).`,
        ],
        workedEngineeringExample: `On a 4×4 2D Mesh using XY dimension-order routing, packet from (0,1) to (3,2) travels East 3 hops ((0,1)->(1,1)->(2,1)->(3,1)) then North 1 hop ((3,1)->(3,2)) — X-first routing guarantees cycle-free turn model deadlock freedom!`,
        resetAndInitialization: `Reset clears router input/output VC buffers and initializes upstream credit counters to full downstream buffer depth.`,
      },
      level3: {
        rtlMicroarchitecture: `Routers implement input VC FIFOs, route computation (RC), VC allocation (VA), switch allocation (SA), and crossbar traversal (ST), plus NIUs converting AXI/CHI/TileLink into flits.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Mesh locks up permanently under all-to-all burst traffic.',
            rootCause: 'Protocol-level cycle (Request blocked waiting for Response sharing the same Virtual Channel) or routing turn cycle.',
            resolution: 'Assign independent Virtual Channels (VCs) per message class (REQ vs RSP vs SNP) and enforce XY / turn-prohibited routing.',
          },
        ],
        verificationAndAssertions: `Verify permutation/transpose/hotspot traffic patterns, VC credit conservation (` + '`credits_held + in_flight == INIT_CREDITS`' + `), and latency boundedness.`,
        siliconDebugPlaybook: `Check router credit counters at every hop; the exact VC whose credits hit 0 indicates downstream backpressure or protocol deadlock sink.`,
      },
    },
    accelerator: {
      level1: {
        intuitionSummary: `${p.name} coordinates massive parallel math, DMA tile prefetching, or SIMT thread execution inside AI NPUs and GPUs.`,
        whyItExists: `General-purpose CPUs waste ~95% of energy fetching, decoding, and predicting branches for single instructions. Accelerators stream thousands of multiply-accumulates per cycle using structured memory & dispatch interfaces.`,
        everydayAnalogy: `If a CPU is a brilliant Swiss-army surgeon doing 1 complex task at a time, an accelerator is an automated 1,000-nozzle assembly line painting an entire car frame simultaneously.`,
        stepByStepMentalModel: [
          `1. Host Descriptor / Kernel Dispatch: ${firstStep}`,
          `2. DMA Tile Prefetch to Local SRAM: ${secondStep}`,
          `3. Parallel Execute & Writeback Fence: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking FLOPS alone determine AI/GPU speed—90% of real bottlenecks come from memory bandwidth starvation, bank conflicts, and warp/tile synchronization!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Connects control queues, scratchpads, and compute lanes via ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Arithmetic Intensity = Total_MAC_Ops / Total_DRAM_Bytes_Moved (Roofline model).`,
          `Compute Utilization = Active_PEs / Total_PEs (governed by double-buffered DMA overlap).`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Double-buffered NPU pipeline: While Compute Engine multiplies Tile N out of Scratchpad Bank A, autonomous DMA prefetches Tile N+1 over AXI4 into Bank B—hiding 100% of external DRAM latency.`,
        resetAndInitialization: `Reset clears command queues, warp masks, and accumulator partials; host must flush caches / issue memory fences prior to launching descriptors.`,
      },
      level3: {
        rtlMicroarchitecture: `Critical hardware splits banked TCDM/Scratchpad arbiters (handling bank conflicts), ping-pong DMA engines, and execution pipelines with hardware scoreboards.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Accelerator reads stale inputs or host reads half-written output tensors.',
            rootCause: 'Missing cache clean/invalidate or DMA write-completion fence before interrupt.',
            resolution: 'Wait for write-response BVALID/Fence confirmation before asserting host done IRQ.',
          },
        ],
        verificationAndAssertions: `Bit-exact golden reference comparison against PyTorch/C++ functional models across boundary matrix sizes (non-multiples of systolic/warp dimensions).`,
        siliconDebugPlaybook: `Profile compute active cycles vs DMA stall cycles; excessive stalls reveal bank-conflict address strides or undersized AXI outstanding read depth.`,
      },
    },
    'phy-serdes': {
      level1: {
        intuitionSummary: `${p.name} bridges digital protocol controllers (MAC/PCS) to high-speed analog SerDes transceivers driving differential copper or optical links.`,
        whyItExists: `Digital RTL speaks multi-bit parallel words at 250–1000 MHz, whereas external connectors carry ultra-fast 5–112 Gbps serial waves. Standard PHY interfaces let any ASIC MAC pair cleanly with foundry analog hard macros.`,
        everydayAnalogy: `Like a high-speed gearbox and translator sitting between a slow-talking multi-lane warehouse and a supersonic single-track bullet train.`,
        stepByStepMentalModel: [
          `1. Parallel Encode & Gearbox: ${firstStep}`,
          `2. High-Speed Serialize & Analog TX: ${secondStep}`,
          `3. CDR Lock, Align & Parallel RX: ${thirdStep}`,
        ],
        beginnerMisconception: `Assuming RX parallel data arrives aligned cleanly on byte boundaries—a serial receiver only sees raw streams until Comma / Sync-Header word aligners slip bits into frame!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Separates PCS digital framing from PMA analog serialization via ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Parallel Clock = Serial_Baud_Rate / Internal_Bus_Width * Coding_Ratio.`,
          `Coding Overhead: 8b/10b (20%), 64b/66b (3.03%), 128b/130b (1.54%).`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `In 10G 64b/66b PCS over a 64-bit PMA bus: 10.3125 GBaud / 66 bits * 64 -> internal parallel gearbox converts between 66-bit encoded blocks and 64-bit PMA words at 156.25 MHz / 161.13 MHz.`,
        resetAndInitialization: `TX/RX PLLs must lock to REFCLK before releasing PCS reset; RX CDR requires valid incoming transitions/idle patterns before ` + '`RxValid`' + ` asserts.`,
      },
      level3: {
        rtlMicroarchitecture: `Includes barrel-shifter comma/sync-header aligners, LFSR scramblers (` + '`x^58 + x^39 + 1`' + `), multi-lane deskew FIFOs, and elastic clock-compensation buffers.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Link passes internal loopback cleanly but fails over real backplane/cable.',
            rootCause: 'Polarity swap (P/N crossed on PCB) or insufficient CTLE/TX pre-cursor compensation.',
            resolution: 'Enable automatic RX polarity inversion detection and tune TX/RX equalization.',
          },
        ],
        verificationAndAssertions: `Verify PRBS7/PRBS31 pattern locks, injected sync-header slips, PPM frequency offsets, and lane-to-lane deskew margins.`,
        siliconDebugPlaybook: `Test sequentially across Near-End PCS Loopback -> Far-End PMA Loopback -> External Loopback to isolate digital framing vs analog bump/board faults.`,
      },
    },
    'power-mgmt': {
      level1: {
        intuitionSummary: `${p.name} coordinates safe clock gating, reset synchronization, voltage scaling, or power-domain shutdown so chips hit aggressive battery and thermal targets without state corruption.`,
        whyItExists: `Modern SoCs burn catastrophic leakage and dynamic clock power (` + '`P = C * V^2 * f`' + `) if idle blocks stay clocked at peak voltage. Cutting clocks or power carelessly, however, triggers instant metastability or deadlock.`,
        everydayAnalogy: `Like shutting down an airplane engine or factory wing safely: first verify zero passengers are mid-door (` + '`QREQn`' + `), clamp electrical barriers (` + '`ISO_EN`' + `), save critical checklists (` + '`Retention`' + `), and only then flip the breaker.`,
        stepByStepMentalModel: [
          `1. Quiesce Request / Intent: ${firstStep}`,
          `2. Acknowledge / Deny Handshake: ${secondStep}`,
          `3. Safe Isolation, Gate, or Wake: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking clock gating just uses a plain AND gate (` + '`clk & en`' + `)—combining ` + '`clk`' + ` with un-latched combinational logic chops clock pulses into fatal glitches!`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Coordinates glitch-free power/clock/reset transitions across ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Dynamic Power Scaling: P_dyn = alpha * C * V^2 * f (cutting V by 20% cuts P_dyn by ~36%!).`,
          `DVFS Ordering Law: Voltage MUST ramp UP before frequency rises; Frequency MUST drop before voltage lowers.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `Using Arm Q-Channel: Power Controller lowers ` + '`QREQn=0`' + `. If device still has a DMA transfer in flight, it asserts ` + '`QDENY=1`' + ` cleanly; once idle, it lowers ` + '`QACCEPTn=0`' + `, allowing the ICG cell to gate off the block clock safely.`,
        resetAndInitialization: `Always-on power controller domain remains active across sleep states, releasing isolation clamps only AFTER power-switch ack (` + '`PWR_ACK`' + `) stabilizes and reset synchronizer completes.`,
      },
      level3: {
        rtlMicroarchitecture: `Follows strict UPF (` + '`IEEE 1801`' + `) isolation/retention/level-shifter rules, glitch-free Integrated Clock Gating (ICG) latches, and 2-stage async-assert/sync-deassert reset bridges.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Chip hangs permanently upon waking from deep sleep.',
            rootCause: 'Bus initiator sent transaction while powered-down slave isolation clamped READY=0 or forgot wake-up restore sequence.',
            resolution: 'Enforce strict PMU power-down handshake (`QACCEPTn`) and verify UPF power-aware GLS simulation.',
          },
        ],
        verificationAndAssertions: `Run UPF power-aware simulation injecting random sleep/wake transitions mid-traffic, checking zero X-corruption leaking across domain isolation boundaries.`,
        siliconDebugPlaybook: `Inspect PMU sequencer state and measure rail ramp timing on oscilloscope against PLL lock status.`,
      },
    },
    wireless: {
      level1: {
        intuitionSummary: `${p.name} connects digital SoC processors and baseband modems to wireless RF air-interface stacks (Bluetooth, Wi-Fi, 5G, UWB, or LPWAN).`,
        whyItExists: `Radio channels suffer fading, multipath interference, and strict FCC/3GPP spectrum rules. Specialized baseband/HCI protocols decouple precise microsecond RF timing from OS application software.`,
        everydayAnalogy: `Like an air-traffic radio tower and cockpit team: the modem handles noisy static, error correction, and exact millisecond time slots so software only deals with clean data packets.`,
        stepByStepMentalModel: [
          `1. Scan / Synchronize Preamble: ${firstStep}`,
          `2. Demodulate & Decode FEC Frames: ${secondStep}`,
          `3. Deliver Clean HCI / MAC PDUs: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking wireless modems just send raw UART bytes to an antenna—hardware baseband must compute real-time FFT/OFDMA, LDPC/Viterbi FEC, and microsecond IFS/TDMA timing loops.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Interfaces baseband/MAC/HCI pipelines over ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Spectral Throughput = Bandwidth * log2(Modulation_Order) * Code_Rate * Spatial_Streams.`,
          `Link Budget Margin = TX_Power_dBm - Path_Loss_dB + Gains - RX_Sensitivity_dBm.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `In BLE/Wi-Fi/5G packets, hardware correlates the known synchronization preamble to lock carrier frequency offset (CFO) and symbol timing before demodulating QAM constellations into soft LLR bits for hardware FEC.`,
        resetAndInitialization: `RF synthesizer PLL lock and DC-offset / IQ imbalance calibration execute prior to opening RX/TX antenna switches.`,
      },
      level3: {
        rtlMicroarchitecture: `Modern radio SoCs isolate microsecond-critical MAC/PHY engines (autonomous ACK/SIFS state machines, AES-CCM/GCM crypto) from higher-latency Linux host drivers via shared DMA rings or HCI UART/SDIO/PCIe.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Throughput collapses despite strong RSSI.',
            rootCause: 'Hidden-node collisions, adjacent-channel interference, or missed real-time SIFS ACK deadline due to bus latency.',
            resolution: 'Offload ACK & encryption engines strictly to deterministic hardware MAC.',
          },
        ],
        verificationAndAssertions: `Co-simulate baseband RTL under AWGN/multipath fading channel models, verifying packet error rate (PER) curves and IFS turnaround deadlines.`,
        siliconDebugPlaybook: `Capture constellation EVM (Error Vector Magnitude) and IQ samples ahead of FFT/decoder to distinguish analog RF distortion from digital MAC bugs.`,
      },
    },
    industrial: {
      level1: {
        intuitionSummary: `${p.name} delivers ultra-reliable, deterministic, long-reach, or radiation-tolerant communication tailored for factory robotics, avionics, and spacecraft.`,
        whyItExists: `A dropped packet or jitter spike in a factory servo arm, commercial airliner, or satellite payload can cause physical damage or mission loss. Industrial/aerospace protocols trade consumer bandwidth for guaranteed deadlines and redundancy.`,
        everydayAnalogy: `Like an armored dual-track railway running on an atomic-clock schedule—every train arrives within exact microseconds, with a backup track ready if lightning hits the main line.`,
        stepByStepMentalModel: [
          `1. Deterministic Sync / Poll: ${firstStep}`,
          `2. Redundant / Noise-Immune Transfer: ${secondStep}`,
          `3. Integrity Verify & Fail-Safe: ${thirdStep}`,
        ],
        beginnerMisconception: `Applying standard best-effort office Ethernet queues to real-time control loops—without deterministic schedules, queuing jitter ruins servo stability.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Coordinates redundant or differential signaling across ${sigNames}.`,
        mathematicalAndTimingRules: [
          `Bounded Jitter Requirement: Sub-microsecond cycle-to-cycle variation for synchronous motion/avionics.`,
          `Common-Mode Rejection: Differential / transformer-coupled links tolerate >±7V ground potential differences.`,
          `Standard: ${p.standardBody} (${p.year}).`,
        ],
        workedEngineeringExample: `In EtherCAT or SpaceWire/AFDX, hardware ASICs process frames on-the-fly in nanoseconds or duplicate frames across dual redundant A/B lanes so single link failure drops zero packets.`,
        resetAndInitialization: `Safe initialization isolates drivers in high-impedance/recessive state until watchdog & clock-sync lock stabilize.`,
      },
      level3: {
        rtlMicroarchitecture: `Safety-critical RTL incorporates Triple Modular Redundancy (TMR) on radiation-sensitive flops, hardware FDIR (Fault Detection, Isolation, and Recovery) timers, and deterministic switch pipelines.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Intermittent CRC errors across 100-meter factory cable.',
            rootCause: 'Missing end-of-line termination resistors (`120 Ohm` on RS-485) causing signal reflections.',
            resolution: 'Enforce proper line termination and bias resistors plus slew-rate limiting.',
          },
        ],
        verificationAndAssertions: `Verify Single Event Upset (SEU) fault injection recovery, dual-channel skew tolerance, and bounded worst-case execution latency.`,
        siliconDebugPlaybook: `Log hardware FDIR counters and measure common-mode voltage noise vs differential eye across cable terminations.`,
      },
    },
    standards: {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) is a foundational semiconductor reference standard defining shared mathematical, power-intent, test, or modeling rules across the global chip industry.`,
        whyItExists: `Silicon ecosystems fail if every EDA tool, CPU core, and IP vendor interprets floating-point rounding, power domains, or memory maps differently. Reference standards create one universal engineering language.`,
        everydayAnalogy: `Think of the metric system and architectural blueprints—not a physical vehicle itself, but the universal measurement rules that ensure parts built on different continents snap together cleanly.`,
        stepByStepMentalModel: [
          `1. Canonical Schema / Representation: ${firstStep}`,
          `2. Tool / Hardware Compliance Rule: ${secondStep}`,
          `3. Cross-Vendor Interoperability Check: ${thirdStep}`,
        ],
        beginnerMisconception: `Mistaking standards like IEEE 754 or IEEE 1801 (UPF) for physical chip wires—they specify data formats, tool intent, or architectural contracts implemented across hardware and EDA flows.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Applied across design, synthesis, verification, and silicon compliance flows.`,
        mathematicalAndTimingRules: [
          `Normative Scope: ${p.standardBody} (${p.year}).`,
          `Compliance Verification: Checked via formal equivalence, linter rules, or CTS test suites.`,
        ],
        workedEngineeringExample: `When implementing ${p.name}, design and verification teams bind golden reference models directly against EDA synthesis/simulation outputs to guarantee 100% standard conformance.`,
        resetAndInitialization: `Compliance initialization establishes legal reset state, rounding/mode defaults, or power-up metadata bindings before operation.`,
      },
      level3: {
        rtlMicroarchitecture: `Impacts RTL signoff directly: e.g., IEEE 754 FMA guard/round/sticky bits in FPUs, IEEE 1801 UPF isolation cells in synthesis, or IEEE 1685 IP-XACT automated CSR/bus wiring.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Silent cross-vendor integration mismatch or EDA signoff failure.',
            rootCause: 'Assumed unstated vendor extension rather than strict normative standard baseline.',
            resolution: 'Validate strictly against official compliance test suite (CTS) and linter checks.',
          },
        ],
        verificationAndAssertions: `Automate CI compliance suites against official golden reference vectors and EDA linting/equivalence rules.`,
        siliconDebugPlaybook: `Inspect synthesis/lint reports and compare bit-accurate reference outputs against RTL waveforms on edge inputs (e.g., subnormals/NaN or UPF isolation transitions).`,
      },
    },
    'dft-test': {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) is a manufacturing test and silicon diagnostics mechanism used to verify physical transistors and memory arrays after wafer fabrication.`,
        whyItExists: `Physical silicon defects (bridging shorts, stuck-at faults, marginal SRAM cells) occur randomly during lithography; functional tests alone take too long and miss hidden structural defects.`,
        everydayAnalogy: `Like built-in airplane pre-flight diagnostic harnesses that test every wire, actuator, and sensor automatically on the ground before passengers ever board.`,
        stepByStepMentalModel: [
          `1. Test Mode Entry: ${firstStep}`,
          `2. Structural Shift / BIST Execution: ${secondStep}`,
          `3. Signature Compare & Repair: ${thirdStep}`,
        ],
        beginnerMisconception: `Confusing DFT test structures with functional I/O protocols—scan, MBIST, and IEEE 1149.x/1687 networks only activate during manufacturing test or debug.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Operates across ${p.channels.join(', ') || 'TAP / Scan / BIST'} with strict test-clock and reset isolation.`,
        mathematicalAndTimingRules: [
          `Normative Scope: ${p.standardBody} (${p.year}).`,
          `Fault Coverage Goal: >99% Stuck-At + >90% Transition-Delay ATPG / March-C+ SRAM screening.`,
        ],
        workedEngineeringExample: `During wafer sort ATE runs, testers shift compressed ATPG patterns through ${p.name} wrappers to catch nanoscale defects in milliseconds per die.`,
        resetAndInitialization: `Test logic asserts asynchronous reset/clamp isolation on functional I/Os before shifting vectors.`,
      },
      level3: {
        rtlMicroarchitecture: `DFT insertion must eliminate combinational test-clock gating glitches, float-proof tri-states, and asynchronous set/reset loops during scan shift.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Scan chain fails continuity or produces X-corruption in ATPG simulation.',
            rootCause: 'Uncontrolled non-scan flop, unmasked analog output, or missing OCC lockup latch across clock domains.',
            resolution: 'Insert DFT lockup latches on clock-domain crossings and constrain async resets under test_mode.',
          },
        ],
        verificationAndAssertions: `Verify zero X-propagation across parallel/serial scan patterns using gate-level SDF-annotated ATPG simulation.`,
        siliconDebugPlaybook: `Use JTAG/iJTAG chain bypass diagnostic shifts first to bisect broken scan segments before running full March memory diagnostics.`,
      },
    },
    'clock-cdc': {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) is an internal microarchitectural timing, synchronization, or power-boundary mechanism—NOT an external chip-to-chip communication bus.`,
        whyItExists: `Modern SoCs contain dozens of asynchronous clocks, dynamic frequency/voltage islands, and power-gated subsystems; crossing them carelessly guarantees random metastability failures.`,
        everydayAnalogy: `Imagine synchronized airlocks between rooms at different air pressures: ${p.name} ensures data, resets, or clock enables pass cleanly without half-open doors.`,
        stepByStepMentalModel: [
          `1. Domain Boundary Setup: ${firstStep}`,
          `2. Synchronizer / Glitch Guard: ${secondStep}`,
          `3. Safe Capture / Quiescence: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking a 2-flop synchronizer solves multi-bit bus crossings—multi-bit buses require Gray coding, Req/Ack handshakes, or Async FIFOs to prevent skew corruption.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Coordinates boundaries cleanly via ${sigNames}.`,
        mathematicalAndTimingRules: [
          `MTBF Equation: Mean Time Between Failures grows exponentially with synchronizer resolve time t_MET / tau.`,
          `Key Rule: ${p.specifications.slice(0, 2).map((s) => `${s.parameter}=${s.value}`).join(' · ')}.`,
        ],
        workedEngineeringExample: `When passing pointers or control signals across ${clk} boundaries, ${p.name} guarantees zero glitch propagation and monotonic single-bit transitions.`,
        resetAndInitialization: `Reset distribution combines asynchronous assertion (works before clocks run) with synchronous deassertion inside every destination domain.`,
      },
      level3: {
        rtlMicroarchitecture: `Enforce ASYNC_REG / dont_touch attributes on synchronizer flops, prohibit combinational logic before Stage-1 flop, and validate UPF clamp values for isolation cells.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Rare non-deterministic silicon hang occurring once every several million cycles.',
            rootCause: 'Reconvergence bug where two independently synchronized bits fan into downstream combinational logic.',
            resolution: 'Run structural CDC/RDC signoff (SpyGlass/Questa CDC) and pack related bits behind a single handshake or Gray FIFO.',
          },
        ],
        verificationAndAssertions: `Inject randomized +/-1 cycle jitter models in CDC-aware simulation alongside formal structural CDC/RDC signoff.`,
        siliconDebugPlaybook: `Sweep PLL frequency ratios to hit worst-case phase beats while checking MTBF / FIFO watermark error counters.`,
      },
    },
    'verif-eda': {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) is a formal hardware description, verification, or EDA interoperability standard—NOT a physical wire-level bus protocol.`,
        whyItExists: `Chip teams use multiple simulators, linters, formal provers, and coverage databases across organizations; standardized languages and schemas prevent vendor lock-in and simulation ambiguity.`,
        everydayAnalogy: `Like ISO architectural drafting rules and structural load test codes: they don't carry water or electricity themselves, they verify the blueprint won't fail before pouring concrete.`,
        stepByStepMentalModel: [
          `1. Specification Contract: ${firstStep}`,
          `2. Simulation / Formal Execution: ${secondStep}`,
          `3. Coverage / Compliance Signoff: ${thirdStep}`,
        ],
        beginnerMisconception: `Mistaking UVM, SVA, SystemVerilog, or SystemRDL for hardware buses—these standards describe, stimulate, check, or generate hardware rather than carrying runtime chip traffic.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Normative rules governed by ${p.standardBody} (${p.year}).`,
        mathematicalAndTimingRules: [
          `Standard Body: ${p.standardBody} (${p.year}).`,
          `Scope: ${p.specifications.slice(0, 2).map((s) => `${s.parameter}=${s.value}`).join(' · ')}.`,
        ],
        workedEngineeringExample: `Verification architects combine ${p.name} cleanly with constrained-random scoreboards and formal assertions to close functional coverage before tape-out.`,
        resetAndInitialization: `Simulation and formal engines establish deterministic initial/reset invariants cleanly prior to phase execution.`,
      },
      level3: {
        rtlMicroarchitecture: `Directly dictates RTL lint hygiene, 4-state X-optimism/pessimism traps, SVA sampled-value preponed-region semantics, and UVM phase objection determinism.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Test passes in simulation but exhibits hidden race or vacuous assertion coverage.',
            rootCause: 'Overuse of non-deterministic active-region sampling or missing disable iff reset guards.',
            resolution: 'Enforce strict IEEE event-scheduler semantics and run vacuity + formal reachability audits.',
          },
        ],
        verificationAndAssertions: `Audit covergroups, assertion vacuity, and multi-simulator reproducibility across Verilator, VCS, Xcelium, and Questa.`,
        siliconDebugPlaybook: `Cross-compare pre-silicon formal counterexamples or UCIS regression holes directly against silicon bring-up failure signatures.`,
      },
    },
    'proc-arch': {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) defines Instruction Set Architecture (ISA) or CPU microarchitecture execution mechanics—distinct from external chip interconnect buses.`,
        whyItExists: `Software compilers require a stable binary ISA contract, while hardware architects exploit out-of-order execution, branch prediction, and vector pipelines underneath to hit maximum IPC.`,
        everydayAnalogy: `The ISA is the standardized dashboard pedals and steering wheel any driver expects; microarchitecture is the twin-turbo engine and transmission hidden under the hood.`,
        stepByStepMentalModel: [
          `1. Fetch & ISA Decode: ${firstStep}`,
          `2. Rename / Issue / Execute: ${secondStep}`,
          `3. Architectural Retire & Exception Commit: ${thirdStep}`,
        ],
        beginnerMisconception: `Confusing ISA extensions (like RISC-V Vector RVV or ARM SVE instructions) with on-chip bus protocols (like AXI4 or TileLink) that connect the core to L2/DRAM.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Architectural pipelines balance clock frequency against IPC and memory consistency.`,
        mathematicalAndTimingRules: [
          `Architecture / Spec: ${p.standardBody} (${p.year}).`,
          `Key Metrics: ${p.specifications.slice(0, 2).map((s) => `${s.parameter}=${s.value}`).join(' · ')}.`,
        ],
        workedEngineeringExample: `When an exception or branch mispredict occurs mid-flight, the Reorder Buffer flushes younger speculative micro-ops cleanly so architectural state matches sequential program order.`,
        resetAndInitialization: `Reset initializes PC to the reset vector, clears privilege CSRs to Machine/EL3 secure state, and invalidates speculative predictor tables.`,
      },
      level3: {
        rtlMicroarchitecture: `Critical RTL timing paths cluster around register-alias table rename, wakeup-select scheduler CAMs, bypass forwarding muxes, and precise-exception ROB commit.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Silent data corruption under multithreaded locks or speculative transient execution leak.',
            rootCause: 'Store-buffer forwarding hazard violating memory ordering or unmitigated speculative cache timing leak.',
            resolution: 'Enforce strict acquire/release fence barriers and verify with litmus tests (herd7 / riscv-formal).',
          },
        ],
        verificationAndAssertions: `Co-simulate instruction-by-instruction against golden ISA ISS (Spike / Sail) plus hardware litmus tests and formal equivalence checks.`,
        siliconDebugPlaybook: `Capture Nexus/RISC-V instruction trace packets and Performance Monitoring Unit (PMU) stall counters to isolate microarchitectural hazards.`,
      },
    },
    'phys-design': {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) is a physical implementation and tape-out signoff methodology converting synthesized gates into foundry-ready GDSII/OASIS masks.`,
        whyItExists: `Clean RTL means nothing if wires suffer crosstalk, clocks arrive skewed, or transistors violate foundry spacing rules at 3nm/5nm nodes.`,
        everydayAnalogy: `Writing RTL is drafting a circuit schematic; physical design is routing millions of copper traces across a multi-layer PCB city without short circuits or signal delays.`,
        stepByStepMentalModel: [
          `1. Floorplan & Synthesis: ${firstStep}`,
          `2. CTS & Detailed Routing: ${secondStep}`,
          `3. Parasitic Extraction & MMMC STA Signoff: ${thirdStep}`,
        ],
        beginnerMisconception: `Assuming RTL clock frequency alone determines silicon Fmax—wire RC delay, clock skew, OCV/POCV margins, and IR-drop dominate modern FinFET/GAA timing.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Coordinates ${p.specifications.slice(0, 2).map((s) => `${s.parameter}=${s.value}`).join(' · ')}.`,
        mathematicalAndTimingRules: [
          `Setup Rule: T_launch + T_cq + T_comb <= T_clk + T_capture - T_setup - OCV_margin.`,
          `Hold Rule: T_launch + T_cq + T_comb >= T_capture + T_hold + OCV_margin (independent of clock period!).`,
        ],
        workedEngineeringExample: `Tools read .sdc constraints, place standard cells (.lef/.def), extract .spef wire RC, and solve worst negative slack (WNS >= 0) across all PVT corners.`,
        resetAndInitialization: `Physical power-grid verification checks IR-drop and decoupling capacitance across active/sleep rush currents.`,
      },
      level3: {
        rtlMicroarchitecture: `High-fanout buses, deep combinational mux trees, and poorly constrained false/multicycle paths bottleneck PnR congestion and force late ECO loops.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Chip fails at cold temperature (-40°C) despite passing room-temperature STA.',
            rootCause: 'Sub-1V FinFET temperature inversion makes cells slower at cold than hot—omitting cold slow corner in MMMC.',
            resolution: 'Include both slow-cold and slow-hot corners in setup MMMC signoff.',
          },
        ],
        verificationAndAssertions: `Run formal logic equivalence (LEC/Formality) between RTL, post-synth netlist, and post-CTS/ECO GDS netlist.`,
        siliconDebugPlaybook: `Adjust PLL frequency/VDD shmoo plots on tester ATE to distinguish setup-limited Fmax paths from supply-independent hold failures.`,
      },
    },
    safety: {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) is a functional safety standard or fault-tolerant silicon architecture ensuring catastrophic failures cannot go undetected in life-critical systems.`,
        whyItExists: `Cosmic-ray soft errors (SEUs), aging electromigration, or random transistor faults in automotive ADAS, avionics, or medical silicon must be caught within strict FTTI fault budgets.`,
        everydayAnalogy: `Like dual-pilot aviation controls where two pilots fly identically and an automated monitor immediately alerts and hands control to safe backup if they ever disagree.`,
        stepByStepMentalModel: [
          `1. Redundant Execution / ECC Guard: ${firstStep}`,
          `2. Real-Time Fault Detection: ${secondStep}`,
          `3. Safe-State Escalation (< FTTI): ${thirdStep}`,
        ],
        beginnerMisconception: `Confusing Functional Safety (ISO 26262 protecting against random physical faults & systematic errors) with Cybersecurity (protecting against malicious attackers).`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Enforces ${p.specifications.slice(0, 2).map((s) => `${s.parameter}=${s.value}`).join(' · ')}.`,
        mathematicalAndTimingRules: [
          `ASIL-D Targets: SPFM >= 99%, LFM >= 90%, PMHF < 10 FIT (10^-8 failures/hour).`,
          `FTTI: Fault Detection + Reaction must complete inside Fault Tolerant Time Interval.`,
        ],
        workedEngineeringExample: `A Dual-Core Lockstep (DCLS) safety island runs delayed checker pipelines 2 cycles behind the primary core so common-mode clock noise hits different instructions.`,
        resetAndInitialization: `Power-on LBIST/MBIST and Safety Island self-tests verify fault-detection comparators aren't stuck at "always pass" before mission boot.`,
      },
      level3: {
        rtlMicroarchitecture: `Requires temporal/spatial separation in PnR for lockstep cores, SECDED ECC across SRAM/buses, and latent-fault comparator self-test injection hooks.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Fault-injection campaign fails ASIL-D SPFM coverage target.',
            rootCause: 'Untested comparator logic or unguarded interconnect parity between safety island and main SoC.',
            resolution: 'Add end-to-end bus ECC/CRC and periodically run checker fault-injection diagnostics.',
          },
        ],
        verificationAndAssertions: `Execute formal safety fault-injection (Z01X / VC Functional Safety) toggling single/multi-bit SEUs on every safety-critical flip-flop.`,
        siliconDebugPlaybook: `Inspect Fault Collection & Control Unit (FCCU) sticky error registers and ECC syndrome logs to localize soft vs permanent hardware faults.`,
      },
    },
    packaging: {
      level1: {
        intuitionSummary: `${p.name} (${p.fullName}) covers 2.5D interposer and 3D stacked chiplet packaging technologies replacing monolithic single-die reticles.`,
        whyItExists: `Leading-edge lithography hits the ~858 mm² reticle limit with skyrocketing yield losses; disaggregating compute, I/O, and HBM across known-good chiplets boosts yield and density.`,
        everydayAnalogy: `Instead of carving an entire skyscraper out of one giant marble boulder (where one crack ruins everything), modular chiplets bolt factory-tested floors together seamlessly.`,
        stepByStepMentalModel: [
          `1. Die Disaggregation & Floorplan: ${firstStep}`,
          `2. Interposer / EMIB / Hybrid-Bond Routing: ${secondStep}`,
          `3. Known-Good-Die & Thermal Signoff: ${thirdStep}`,
        ],
        beginnerMisconception: `Thinking UCIe/BoW protocol logic replaces physical packaging engineering—2.5D silicon interposers, EMIB bridges, microbumps, and 3D hybrid bonding dictate bandwidth, yield, and heat.`,
      },
      level2: {
        architectureAndMechanics: `${p.architecture.summary} Bridges die boundaries cleanly via ${p.specifications.slice(0, 2).map((s) => `${s.parameter}=${s.value}`).join(' · ')}.`,
        mathematicalAndTimingRules: [
          `Shoreline BW: Microbump pitch (~35–55 µm 2.5D) vs Hybrid Bonding (<9 µm 3D) scales areal bandwidth >10×.`,
          `Key Metrics: ${p.specifications.slice(0, 2).map((s) => `${s.parameter}=${s.value}`).join(' · ')}.`,
        ],
        workedEngineeringExample: `AI accelerators pair multiple leading-edge 3nm compute chiplets beside 8-12 HBM stacks on a CoWoS silicon interposer with <0.5 pJ/bit energy per bit.`,
        resetAndInitialization: `Pre-bond Known-Good-Die (KGD) wafer probing uses IEEE 1838 3D-DFT wrappers so a single bad die never scraps an expensive multi-chip package.`,
      },
      level3: {
        rtlMicroarchitecture: `Floorplanning must align chiplet shoreline macros cleanly with bump-map pitch, thermal hotspots, PDN TSV inductance, and lane-repair spare wires.`,
        cornerCasesAndFailureModes: [
          {
            symptom: 'Package fails warpage or thermal throttling under sustained AI matrix load.',
            rootCause: 'Unbalanced dark-silicon thermal density on stacked 3D compute tiles without thermal TSV relief.',
            resolution: 'Co-simulate 3D electro-thermal + mechanical warpage early alongside RTL floorplanning.',
          },
        ],
        verificationAndAssertions: `Verify IEEE 1838 FPP/Die-Wrapper structural continuity and UCIe/BoW lane-repair failover across microbump shorts/opens.`,
        siliconDebugPlaybook: `Query per-lane eye/BER diagnostics and IEEE 1838 loopback test patterns across interposer bridges to isolate assembly defects.`,
      },
    },
  };

  return {
    title: `${p.name} — ${p.fullName}`,
    ...domainMap[cat],
  };
}

export function getProtocolLayeredExplanation(p: ProtocolDocument): LayeredConceptExplanation {
  const base = makeCategoryTemplate(p);
  const ov = PROTOCOL_DEEP_OVERRIDES[p.id];
  if (!ov) return base;
  return {
    title: base.title,
    level1: { ...base.level1, ...(ov.level1 || {}) },
    level2: { ...base.level2, ...(ov.level2 || {}) },
    level3: { ...base.level3, ...(ov.level3 || {}) },
  };
}

export function getIpLayeredExplanation(ip: IpEntity): LayeredConceptExplanation {
  const modList = ip.modules.slice(0, 4).map((m) => m.name).join(', ');
  const topModuleName = ip.modules[0]?.name || ip.name;
  const busList = ip.interfaces.map((i) => `${i.name} (${i.protocolLabel})`).join(', ');
  const clkList = ip.architecture.clocks.join(', ') || 'clk_i';
  const allFsms = ip.modules.flatMap((m) => (m.fsms || []).map((f) => ({ ...f, moduleName: m.name })));
  const firstFsm = allFsms[0];

  return {
    title: `${ip.name} — ${ip.category} Silicon IP`,
    level1: {
      intuitionSummary: `${ip.functional.whatItDoes} Written in ${ip.rtlLanguage} and maintained under ${ip.maintainer}, it serves as ${ip.functional.socRole.charAt(0).toLowerCase() + ip.functional.socRole.slice(1)}`,
      whyItExists: ip.functional.whyItExists,
      everydayAnalogy:
        ip.category === 'CPU & Processor'
          ? `Think of ${ip.name} as a disciplined instruction assembly line: grabbing opcodes from memory, decoding what work is requested, crunching ALU/load-store work, and safely committing results to registers.`
          : ip.category === 'Security & Crypto'
            ? `Think of ${ip.name} like an armored hardware vault sitting off the main chip bus—accepting strictly checked commands while keeping secret keys and cryptographic math shielded from CPU software bugs.`
            : ip.category === 'GPU & Graphics' || ip.category === 'AI & ML Accelerator'
              ? `Think of ${ip.name} like a specialized parallel math factory—streaming large tiles of pixels, threads, or matrix weights through dozens of synchronized multipliers at once.`
              : `Think of ${ip.name} as a dedicated specialist worker plugged into the SoC highway—handling protocol timing, buffering, or fabric routing autonomously so the main CPU stays free.`,
      stepByStepMentalModel: [
        `1. Interface Entry: External requests or configuration writes enter through ${busList || 'top-level SoC ports'}.`,
        `2. Internal Submodules (${ip.modules.length} mapped): Core processing flows cleanly across ${modList || topModuleName}.`,
        `3. Completion & Reporting: Updated status registers, DMA memory writes, or interrupts notify host software cleanly.`,
      ],
      beginnerMisconception: `Viewing an entire IP block as a single black-box chip—inside ${ip.name}, datapath computation (` + '`EX`' + `/ciphers/FIFOs) is strictly separated from control FSMs and CSR register blocks.`,
    },
    level2: {
      architectureAndMechanics: `${ip.architecture.summary} Features ${ip.architecture.blocks.length} primary architectural blocks connected across ${ip.architecture.clocks.length} clock domain(s): ${clkList}. Primary RTL module entry: ${topModuleName}.`,
      mathematicalAndTimingRules: [
        `Elaboration Parameters (${ip.parameters.length}): ${ip.parameters.slice(0, 3).map((pr) => `${pr.name}=${pr.defaultValue}`).join(' · ') || 'Fixed architectural sizing'}.`,
        `Memory-Mapped CSRs: ${ip.registers.length > 0 ? `${ip.registers.length} documented registers (${ip.registers.slice(0, 3).map((r) => `${r.name} @ ${r.offset}`).join(', ')})` : ip.registersNote || 'Pure datapath/streaming IP without CSRs'}.`,
        `Key Operations: ${ip.functional.keyOperations.slice(0, 2).join(' · ') || ip.architecture.summary.slice(0, 160)}.`,
      ],
      workedEngineeringExample: firstFsm
        ? `FSM Walkthrough (${firstFsm.name} in ${firstFsm.moduleName}): Initializes in ${firstFsm.states[0] || 'IDLE'} on reset (${ip.architecture.resets[0] || 'rst_ni'}). When trigger condition fires, sequences through ${firstFsm.states.slice(0, 4).join(' -> ')} before returning cleanly to idle or raising completion status.`
        : `Interface Walkthrough: Transaction enters ${ip.interfaces[0]?.name || topModuleName} on rising edge of ${ip.architecture.clocks[0] || 'clk_i'}, traverses ${ip.modules[0]?.name || 'input buffer'} into core execution, and commits back across ${busList || 'system fabric'}.`,
      resetAndInitialization: `${ip.implementation.resetArchitecture} Resets: ${ip.architecture.resets.join(', ') || 'rst_ni'}.`,
    },
    level3: {
      rtlMicroarchitecture: `${ip.implementation.clockingArchitecture} ${ip.implementation.timingAndAreaNotes}`,
      cornerCasesAndFailureModes: [
        ...ip.functional.limitations.slice(0, 2).map((lim) => ({
          symptom: `Architectural constraint / boundary in ${ip.name}`,
          rootCause: lim,
          resolution: `Consult ${ip.verification.existingInfra.framework} regression plan & parameter tradeoffs before SoC integration.`,
        })),
        {
          symptom: 'Async boundary corruption or reset glitch during multi-clock operation.',
          rootCause: `Insufficient CDC synchronization across ${ip.architecture.clocks.length} clock domains or asynchronous reset deassertion skew.`,
          resolution: 'Verify 2-FF syncs, async FIFOs, and reset recovery timing arcs across every cross-domain wire.',
        },
      ],
      verificationAndAssertions: `Upstream Verification Framework (${ip.verification.maturity}): ${ip.verification.existingInfra.framework}. Key Assertions: ${ip.verification.existingInfra.assertionsAndFormal.slice(0, 2).join(' · ')}. Recommended Strategy: ${ip.verification.recommendedStrategy.slice(0, 2).join(' ')}`,
      siliconDebugPlaybook: `Trace Source: ${ip.repoUrl}. Run upstream flow (${ip.verification.simCommands[0]?.command || 'see Verification Hub'}) and inspect ${firstFsm ? `${firstFsm.name} FSM state register` : `${topModuleName} top-level handshakes`} alongside CSR status flags.`,
    },
  };
}

const GLOSSARY_DEEP_OVERRIDES: Record<string, Partial<LayeredConceptExplanation>> = {
  'valid-ready': {
    level1: {
      intuitionSummary: 'The fundamental two-wire traffic light of modern digital chip design: sender says VALID ("I have real cargo"), receiver says READY ("I have room to catch it").',
      whyItExists: 'Without feedback from the receiver, a fast sender would overflow slow memories or stalled FIFOs and silently lose bytes.',
      everydayAnalogy: 'Handing a hot coffee cup to a friend: you hold the cup steady (`VALID=1`) until your friend extends their hand (`READY=1`); only at that exact instant does the handoff occur.',
      stepByStepMentalModel: [
        '1. Sender asserts VALID=1 and keeps payload frozen.',
        '2. If READY=0, receiver is busy—sender MUST hold everything unchanged.',
        '3. On the clock tick where VALID && READY == 1, the transfer commits!',
      ],
      beginnerMisconception: 'Thinking READY must wait for VALID, or that sender can drop VALID if READY does not come immediately—both cause protocol violations or deadlocks!',
    },
    level2: {
      architectureAndMechanics: 'Symmetric forward/backward handshake used across AXI4, AXI4-Stream, TileLink, and custom DSP streams. Allows zero-wait single-cycle streaming (VALID=1, READY=1) AND arbitrary multi-cycle stalls.',
      mathematicalAndTimingRules: [
        'Transfer Condition: fire = valid && ready (sampled strictly at posedge clk).',
        'Axiom 1 (Persistence): (valid && !ready) |=> valid && $stable(payload).',
        'Axiom 2 (No Cyclic Combinational Dependency): Source MUST NOT wait for ready before asserting valid.',
      ],
      workedEngineeringExample: 'Cycle 1: valid=1, data=0xAA, ready=0 (no transfer). Cycle 2: valid=1, data=0xAA (held!), ready=0 (still waiting). Cycle 3: valid=1, data=0xAA, ready=1 -> Beat 0xAA accepted at posedge Cycle 3; Cycle 4 can immediately drive next word 0xBB.',
      resetAndInitialization: 'Reset MUST clear `valid <= 0`; `ready` may reset to 0 or 1 depending on downstream buffer readiness.',
    },
    level3: {
      rtlMicroarchitecture: 'Long combinatorial READY fan-out chains ruin Fmax across large SoCs. Insert a 2-slot Skid Buffer (`forward+backward register slice`) to register both VALID/DATA forward and READY backward with 0 throughput loss.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Deadlock cycle where both VALID and READY stay 0 forever.',
          rootCause: 'Master coded `assign valid = ready & have_data` while Slave coded `assign ready = valid & space_ok`.',
          resolution: 'Break combinational dependency: drive `valid` strictly from registered `have_data`.',
        },
      ],
      verificationAndAssertions: 'Formal SVA: `assert property (@(posedge clk) disable iff (!rst_n) (valid && !ready) |=> (valid && $stable(data)));` plus randomized `ready` stall patterns (0%, 50%, 99% stalled).',
      siliconDebugPlaybook: 'Check waveform for the exact cycle `(valid && !ready)` transitions—if `data` changes or `valid` glitches low, upstream RTL lacks a proper hold mux.',
    },
  },
  'skid-buffer': {
    level1: {
      intuitionSummary: 'A tiny 2-slot pipeline safety cushion that lets chip engineers add timing registers on a highway without ever dropping a single byte when the downstream road hits a red light.',
      whyItExists: 'If you put a simple 1-deep flip-flop on `VALID`/`DATA` and wire `READY` straight back, long `READY` wires break timing closure. Yet registering `READY` creates a 1-cycle delay—meaning an extra beat arrives right after you yelled STOP!',
      everydayAnalogy: 'Like the stopping distance behind a car when a traffic light turns yellow: you need 1 extra waiting parking spot (`skid register`) to safely catch the car that already crossed the intersection before seeing red.',
      stepByStepMentalModel: [
        '1. Normal Flow (`READY=1`): Data passes cleanly through the primary output flip-flop at 100% throughput.',
        '2. Sudden Stall (`READY` drops `1 -> 0`): The beat already in flight drops into the backup `skid_q` register (`s_ready` turns 0 next cycle).',
        '3. Resume (`READY` returns `1`): `skid_q` drains first cleanly before new inputs resume.',
      ],
      beginnerMisconception: 'Thinking a single 1-entry pipeline register can register BOTH `VALID` and `READY` at full 100% speed—without a 2nd skid slot, throughput drops to 50% (bubble every other cycle).',
    },
    level2: {
      architectureAndMechanics: 'Consists of two storage registers (`m_data_q` + `skid_data_q`), two 1-bit valid flags (`m_valid_q`, `skid_valid_q`), and registered `s_ready_q = !skid_valid_q`. Zero combinational paths connect `s_*` inputs to `m_*` outputs or `m_ready` to `s_ready`!',
      mathematicalAndTimingRules: [
        'Depth Required = 2 entries to achieve 100% peak bandwidth across a 1-cycle registered READY feedback loop.',
        'Area Cost = 2 * Data_Width flip-flops + 1 2:1 mux.',
        'Bandwidth = 1 beat/cycle steady-state (Latency +1 cycle).',
      ],
      workedEngineeringExample: 'Cycle 0: Beat A in `m_data_q` (`m_valid=1`), upstream sends Beat B (`s_valid=1, s_ready=1`), downstream drops `m_ready=0`. Cycle 1: A stays frozen in `m_data_q`; B latches into `skid_data_q` and `s_ready` registers to `0`. Cycle 2: `m_ready=1` drains A, promotes B from `skid_data_q -> m_data_q`, and frees `s_ready=1`.',
      resetAndInitialization: 'Reset clears `m_valid_q <= 0`, `skid_valid_q <= 0`, and typically `s_ready_q <= 0` (rising to 1 right after reset releases).',
    },
    level3: {
      rtlMicroarchitecture: 'Also called Full AXI Register Slice (e.g., PULP `spill_register` / `axi_cut`). Variants: Forward-only (1 flop, cuts VALID only), Backward-only, or Full Bypass/Skid (2 flops, cuts all timing paths).',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Every 2nd beat is overwritten when downstream toggles `m_ready` on/off every single cycle.',
          rootCause: 'FSM forgot to prioritize `skid_data_q` ahead of fresh `s_data` on resume.',
          resolution: 'Mux `m_data_next = skid_valid_q ? skid_data_q : s_data`.',
        },
      ],
      verificationAndAssertions: 'Stress with checkerboard `m_ready` (1,0,1,0,1,0) and continuous data stream; assert exact FIFO bit-stream preservation (`scoreboard` queue equality).',
      siliconDebugPlaybook: 'Inspect `(m_valid_q && skid_valid_q && s_ready_q)`—all three true simultaneously proves broken backpressure logic!',
    },
  },
  'cdc-metastability': {
    level1: {
      intuitionSummary: 'Metastability happens when a digital flip-flop samples an incoming voltage right as it is switching between 0 and 1—leaving the flip-flop balanced precariously on a razor\'s edge between 0 and 1.',
      whyItExists: 'In complex SoCs, a CPU runs at 1.5 GHz, UART at 48 MHz, and DDR PHY at 800 MHz—with completely independent crystals/PLLs. Signals crossing clock domains arrive at unpredictable phase alignments relative to the destination clock.',
      everydayAnalogy: 'Imagine taking a flash photograph of a flipping coin mid-air: if the flash fires while the coin is vertical, you cannot tell heads or tails until it wobbles and eventually drops to one side (which takes extra time).',
      stepByStepMentalModel: [
        '1. Asynchronous Arrival: Launch clock transitions violate destination flip-flop setup/hold window.',
        '2. Resolution Wait: A 2-FF (or 3-FF) synchronizer gives the first flip-flop 1 full clock cycle to settle cleanly before downstream logic reads FF2.',
        '3. Multi-Bit Safety: Never put separate 2-FF syncs on parallel binary data bits! Use Gray-coded Async FIFOs or closed-loop Req/Ack handshakes.',
      ],
      beginnerMisconception: 'Assuming a 2-FF synchronizer works on a 32-bit binary bus! Different wire skews cause some bits to latch old values and others new values ("data incoherency"), fabricating completely bogus numbers like `0111 -> 1111` instead of `1000`.',
    },
    level2: {
      architectureAndMechanics: 'Mean Time Between Failures (MTBF) grows exponentially with resolving time `t_r`: `MTBF = exp(t_r / tau) / (T_0 * f_clk * f_data)`. Placing `ASYNC_REG` flops physically adjacent maximizes `t_r = T_clk - t_route` inside a 2-FF/3-FF chain.',
      mathematicalAndTimingRules: [
        'MTBF doubles/multiplies ~10x–1000x for every extra picosecond of synchronizer resolution time.',
        'Multi-bit pointers crossing clocks MUST use Gray code (only 1 bit toggles per increment: `011 -> 010`).',
        'Pulse Synchronizer requirement: source pulse width >= 1.5x destination period unless toggle-sync is used.',
      ],
      workedEngineeringExample: 'Writing `wr_ptr = 4\'b0111` (7) -> `4\'b1000` (8) across async clocks risks sampling `4\'b1111` (15, spurious full!). Gray coding sends `4\'b0100 -> 4\'b1100` (only MSB flips), so the receiver cleanly samples either 7 or 8—never 15.',
      resetAndInitialization: 'Reset synchronizers use Asynchronous Assertion + Synchronous Deassertion (2-FF reset bridge) so reset releases cleanly away from active clock edges.',
    },
    level3: {
      rtlMicroarchitecture: 'Mark synchronizer flip-flops with `(* ASYNC_REG = "TRUE" *)` (Vivado) or `dont_touch` / SDC `set_max_delay -datapath_only` so synthesis never merges glitches or inserts combinational logic ahead of FF1.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Reconvergent fanout corruption inside a 2-bit control bus.',
          rootCause: 'Two single-bit signals (`req_a`, `req_b`) synchronized separately and combined with AND/OR logic downstream.',
          resolution: 'Bundle control state into one toggle handshake or MCP (Multi-Cycle Path) enable mux.',
        },
        {
          symptom: 'Silent rare lab hangs occurring once every 4 hours on hot silicon.',
          rootCause: 'Combo glitch on source side sampled cleanly by destination FF1 (`set_false_path` hid glitch hazard).',
          resolution: 'Strictly register ALL CDC launch signals cleanly before crossing any clock boundary.',
        },
      ],
      verificationAndAssertions: 'Run static CDC signoff (SpyGlass CDC / Questa CDC / JasperGold CDC) for Glitch-Free Source, Gray Coding SVA, and X-jitter injection simulations.',
      siliconDebugPlaybook: 'Sweep core frequency/voltage corners in lab testing; failures triggered only at async frequency ratios (e.g., 100 MHz vs 100.01 MHz) point directly to missing or broken CDC synchronization.',
    },
  },
  'setup-hold-timing': {
    level1: {
      intuitionSummary: 'Setup and Hold times are the "don\'t blink before or after the camera shutter clicks" rules for every flip-flop inside a chip.',
      whyItExists: 'Flip-flops contain physical CMOS transistors with finite gate capacitances. Data electrons must stabilize ahead of the rising clock edge (`Setup`) and remain frozen briefly afterward (`Hold`) so the internal cross-coupled latch commits the right voltage.',
      everydayAnalogy: 'Catching a train: Setup time means arriving at the platform 2 minutes BEFORE departure so the doors close cleanly; Hold time means staying seated for 30 seconds AFTER departure so you don\'t jump off mid-threshold.',
      stepByStepMentalModel: [
        '1. Launch Edge: Flip-Flop A sends data through combinational logic gates (AND/OR/MUX).',
        '2. Setup Check (Next Clock Edge): Data must arrive early enough BEFORE the next clock tick (`T_clk + T_skew >= T_cq + T_comb + T_setup`).',
        '3. Hold Check (Same Clock Edge!): Fast short wires must NOT corrupt the current tick before FF B finishes latching (`T_cq_min + T_comb_min >= T_hold + T_skew`).',
      ],
      beginnerMisconception: 'Thinking slowing down the chip clock fixes Hold violations! Hold happens on the SAME clock edge (0 ns cycle relationship)—slowing Fmax NEVER fixes a Hold violation; only inserting physical delay buffers does.',
    },
    level2: {
      architectureAndMechanics: 'Static Timing Analysis (STA) checks every register-to-register path across PVT corners (`SS` Slow-Slow hot/cold for Setup max-delay; `FF` Fast-Fast for Hold min-delay).',
      mathematicalAndTimingRules: [
        'Setup Slack = (T_clk + T_capture_latency) - (T_launch_latency + T_cq + T_comb_max + T_setup) >= 0.',
        'Hold Slack = (T_launch_latency + T_cq_min + T_comb_min) - (T_capture_latency + T_hold) >= 0.',
        'Fixing Setup: Pipeline stages, retiming, wider Vt cells, shorter logic depth.',
      ],
      workedEngineeringExample: 'Target 1 GHz (`T_clk = 1000 ps`): `T_cq = 90 ps`, `T_comb = 780 ps`, `T_setup = 80 ps`, clock uncertainty `= 60 ps`. Arrival = 930 ps vs Required = 1000 - 60 = 940 ps -> Setup Slack = +10 ps (PASS). If combinational adder grows +30 ps -> -20 ps Setup violation (must pipeline!).',
      resetAndInitialization: 'Asynchronous reset deassertion must pass Recovery (setup-like) and Removal (hold-like) checks against the clock edge.',
    },
    level3: {
      rtlMicroarchitecture: 'Long combinational loops (`axi_rready -> axi_arvalid`, deep mux trees, un-pipelined multipliers) kill Setup Slack; back-to-back direct flop-to-flop shift registers with positive clock skew cause Hold violations.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Chip works at 50 MHz on tester, fails deterministically at 500 MHz.',
          rootCause: 'Classic Setup timing violation (critical path longer than clock period).',
          resolution: 'Inspect STA critical path report, add pipeline register / Skid Buffer, and raise frequency slowly.',
        },
        {
          symptom: 'Chip fails at ALL frequencies—even 1 MHz!',
          rootCause: 'Hold violation between adjacent flip-flops due to clock tree skew.',
          resolution: 'Foundry eco buffer insertion on min-delay path; confirm zero negative Hold slack in FF corner signoff.',
        },
      ],
      verificationAndAssertions: 'Gate-Level Simulation (GLS) with annotated SDF delays across Slow & Fast corners plus PrimeTime / Tempus STA signoff.',
      siliconDebugPlaybook: 'Shmoo plot sweep (Voltage vs Frequency): failures disappearing at higher VDD indicate Setup (faster transistors); failures unaffected by slowing Fclk strongly indicate Hold or CDC.',
    },
  },
  'icg-clock-gating': {
    level1: {
      intuitionSummary: 'Integrated Clock Gating (ICG) turns off the ticking clock to idle chip modules cleanly without creating glitches, cutting up to 40–60% of dynamic chip power.',
      whyItExists: 'Even when an idle register holds the exact same value cycle after cycle, toggling its clock tree wires consumes dynamic `C * V^2 * f` power on every tick.',
      everydayAnalogy: 'Turning off a room\'s ceiling fan when nobody is inside—but using an intelligent wall switch that waits until the blades align smoothly before cutting power so the fan never stutters mid-rotation.',
      stepByStepMentalModel: [
        '1. Enable Signal (`en_i` or `test_en_i`): Logic signals whether the block actually has work this cycle.',
        '2. Negative-Edge Latch Inside ICG: Captures `en_i` cleanly while `clk_i == 0` so glitches in `en_i` disappear.',
        '3. Glitch-Free AND Gate: Drives `gclk_o = clk_i & latched_en`, producing full clean clock pulses or flat 0.',
      ],
      beginnerMisconception: 'Writing `assign gclk = clk & enable;` directly in Verilog! Any combinational glitch on `enable` while `clk == 1` slices a tiny sliver pulse ("runt pulse") that corrupts every flip-flop downstream.',
    },
    level2: {
      architectureAndMechanics: 'Standard foundry ICG cell (`CKLNQD` / `prim_clock_gating`) integrates a negative-level-sensitive D-latch + 2-input AND gate + DFT `test_en` OR bypass for scan chain testing.',
      mathematicalAndTimingRules: [
        'Dynamic Power: P_dyn = alpha * C_eff * V^2 * f (ICG drives activity alpha -> ~0 when idle).',
        'ICG Setup Window: `enable` must arrive at least half a cycle BEFORE falling/rising edge check (`en` checked on latch closing edge).',
      ],
      workedEngineeringExample: 'Synthesis tools automatically convert `always_ff @(posedge clk) if (en) q <= d;` across a 64-bit register bank into 1 shared `prim_clock_gating` cell driving all 64 flip-flops, saving 64 muxes + 64 clock pin toggles.',
      resetAndInitialization: 'Ensure `en` or `test_en` forces clock ON during reset if flip-flops use synchronous reset (`rst_i`), otherwise reset never latches into the registers!',
    },
    level3: {
      rtlMicroarchitecture: 'Instantiate foundry/platform wrapper (`prim_clock_gating.sv` in OpenTitan / `tc_clk_gating.sv` in PULP) rather than behavioral `gclk = clk & latch_en` so FPGA LUT tools fall back safely cleanly (`BUFGCE`) while ASIC flows swap in hardened standard cells.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Flip-flops stay X or fail to reset at power-up.',
          rootCause: 'Synchronous reset flip-flop behind an ICG whose `enable` stays 0 during reset.',
          resolution: 'OR `rst_sync_req` or `!rst_ni` cleanly into ICG enable (`en_i | sync_rst_active`).',
        },
      ],
      verificationAndAssertions: 'Formal lint check confirming zero behavioral clock gating logic outside approved `prim_clock_gating` wrappers; DFT scan coverage audit with `test_en_i=1`.',
      siliconDebugPlaybook: 'Check UPF / power regression with toggle coverage; ensure ICG `test_en_i` bypasses cleanly during ATPG scan shifting.',
    },
  },
  'secded-ecc': {
    level1: {
      intuitionSummary: 'SECDED ECC adds a few extra mathematical parity bits alongside data so hardware can automatically fix any 1-bit flip and sound an alarm if 2 bits flip.',
      whyItExists: 'Cosmic rays, alpha particles, voltage drops, or laser fault attacks can flip bits inside SRAM or chip buses ("soft errors")—causing silent AI corruption, crashed OS kernels, or bypassed security keys.',
      everydayAnalogy: 'Think of Sudoku rows and columns: if someone erases 1 single number, the math of the surrounding numbers immediately lets you reconstruct the exact missing digit; if 2 numbers vanish in the same pair, you know the puzzle was damaged.',
      stepByStepMentalModel: [
        '1. Encode on Write: Parity tree computes extra ECC bits (e.g., 7 bits for 32-bit data) and stores them next to data.',
        '2. Syndrome Check on Read: Decoder recomputes parity; syndrome == 0 means clean data.',
        '3. Correct or Alert: Non-zero odd-weight syndrome points to the exact broken bit to invert & heal (SEC); even-weight non-zero syndrome flags an uncorrectable 2-bit fault (DED).',
      ],
      beginnerMisconception: 'Thinking ECC fixes every multi-bit error—standard SECDED reliably guarantees 1-bit correction and 2-bit detection; 3+ simultaneous bit flips can miscorrect without interleaving or scrubbing.',
    },
    level2: {
      architectureAndMechanics: 'Uses a Hsiao (optimal odd-weight-column) parity check matrix `H`, which minimizes XOR gate depth and power compared to textbook Hamming codes.',
      mathematicalAndTimingRules: [
        'Hamming Bound: 2^k >= m + k + 1 (+1 parity bit for DED -> SECDED).',
        'Typical Widths: 32-bit -> +7 ECC bits (39b total); 64-bit -> +8 ECC bits (72b total).',
      ],
      workedEngineeringExample: 'OpenTitan TL-UL Bus Integrity protects 32-bit data + command fields with `prim_secded_inv_39_32` (7 inverted Hsiao bits—inversion catches all-zeros and all-ones stuck-at faults too!). Flipping bit #14 shifts syndrome uniquely to index 14 -> corrected inline without stalling the bus.',
      resetAndInitialization: 'On chip boot, SRAM memories MUST be scrubbed/written with valid ECC codes before software reads uninitialized locations—otherwise random SRAM power-up bits trigger false DED faults!',
    },
    level3: {
      rtlMicroarchitecture: 'Combinational XOR parity tree adds 3–5 levels of XOR gates along critical SRAM read paths; latency-sensitive L1 caches sometimes compute ECC cleanly in parallel with hit/miss tag check and stall 1 cycle only on non-zero syndrome.',
      cornerCasesAndFailureModes: [
        {
          symptom: 'Spurious uncorrectable ECC fatal alert immediately after reset.',
          rootCause: 'CPU or DMA performed a partial/speculative read from un-scrubbed SRAM before background memory zeroization completed.',
          resolution: 'Implement hardware SRAM scrubber FSM (`init_done`) gating memory access post-reset.',
        },
      ],
      verificationAndAssertions: 'Fault-injection UVM sequences systematically flip every single 1-bit index (`0..N-1`) checking silent recovery, and every 2-bit pair checking `err_fatal_o` assertion.',
      siliconDebugPlaybook: 'Read ECC single-error counters & failing-address CSRs to distinguish random soft errors from hard stuck-at physical column defects.',
    },
  },
};

export function getGlossaryLayeredExplanation(term: GlossaryTerm): LayeredConceptExplanation {
  const protos = term.relatedProtocolIds?.join(', ') || 'multiple SoC protocols';
  const ips = term.relatedIpIds?.join(', ') || 'modern open-source RTL blocks';
  const ov = GLOSSARY_DEEP_OVERRIDES[term.id];

  const defaultVal: LayeredConceptExplanation = {
    title: `${term.term}${term.acronym ? ` (${term.acronym})` : ''}`,
    level1: {
      intuitionSummary: term.definition,
      whyItExists: `Solves a recurring silicon design, communication, or verification problem within ${term.category} engineering (${term.engineeringContext}).`,
      everydayAnalogy:
        term.category === 'Protocol'
          ? `Think of ${term.term} like an agreed road rule or postal rule on a microchip highway—making sure transmitters and receivers never collide or lose parcels.`
          : term.category === 'Security & Debug'
            ? `Think of ${term.term} like a bank vault lock or diagnostic X-ray port inside silicon—catching tampering or letting engineers inspect frozen hardware cleanly.`
            : term.category === 'Verification (UVM/SVA)'
              ? `Think of ${term.term} like an automated crash-test dummy & safety inspector auditing every wire on every clock tick before spending millions fabricating silicon.`
              : `Think of ${term.term} as a specialized structural building block inside chip architecture that turns raw transistors into fast, reliable computation.`,
      stepByStepMentalModel: [
        `1. Core Mechanism: ${term.definition}`,
        `2. Practical Silicon Context: ${term.engineeringContext}`,
        `3. Where You Meet It: Actively used across ${protos} and IPs like ${ips}.`,
      ],
      beginnerMisconception: `Treating ${term.term} as an optional optimization—in production ASICs/FPGAs, violating or omitting this mechanism leads directly to timing failure, silent corruption, or silicon deadlocks.`,
    },
    level2: {
      architectureAndMechanics: `${term.definition} Engineering Reality: ${term.engineeringContext}`,
      mathematicalAndTimingRules: [
        `Domain Category: ${term.category}.`,
        `Associated Standards / Buses: ${protos}.`,
        `Reference Hardware Blocks: ${ips}.`,
      ],
      workedEngineeringExample: `Practical Case Study: Inside ${ips} (${protos}), ${term.term} enforces deterministic behavior so boundary conditions—such as backpressure stalls, clock-edge sampling, or security checks—execute without manual software polling.`,
      resetAndInitialization: `Must settle to a safe, deterministic initial state cleanly under synchronous/asynchronous chip reset before active bus or compute traffic commences.`,
    },
    level3: {
      rtlMicroarchitecture: `In synthesizable RTL, ${term.term} impacts critical path closure, register area, and verification signoff. Cross-reference the exact implementation inside ${ips} modules.`,
      cornerCasesAndFailureModes: [
        {
          symptom: `Subtle intermittent failure when stressing ${term.term} corner boundaries.`,
          rootCause: `Edge case during simultaneous reset release, backpressure stall, or cross-clock timing skew in ${term.category}.`,
          resolution: `Bind formal/SVA invariants and stress randomized corner configurations inside UVM regressions.`,
        },
      ],
      verificationAndAssertions: `Verify via SystemVerilog Assertions (SVA), constrained-random UVM sequences, and formal property checks across nominal and fault-injected scenarios.`,
      siliconDebugPlaybook: `Inspect correlated waveform signals and CSR error/status flags across ${protos} boundaries to confirm invariant holds cycle-by-cycle.`,
    },
  };

  if (!ov) return defaultVal;
  return {
    title: defaultVal.title,
    level1: { ...defaultVal.level1, ...(ov.level1 || {}) },
    level2: { ...defaultVal.level2, ...(ov.level2 || {}) },
    level3: { ...defaultVal.level3, ...(ov.level3 || {}) },
  };
}
