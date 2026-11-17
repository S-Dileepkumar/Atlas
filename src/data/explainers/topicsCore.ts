import { ExplainerTopic } from '../../engine/explainerSchema';

export const CORE_EXPLAINER_TOPICS: ExplainerTopic[] = [
  {
    id: 'axi4-handshakes',
    title: 'AXI4 Handshakes, Bursts & Backpressure',
    domain: 'Protocols',
    summary:
      'Five decoupled unidirectional channels (AW, W, B, AR, R) using synchronous VALID/READY handshakes to decouple address phase from burst data.',
    specVersion: 'ARM AMBA AXI and ACE Protocol Specification — IHI 0022H (Issue H)',
    specDifferenceNote:
      'AXI4 removes write-data interleaving (WID dropped from AXI3), expands maximum INCR burst length from 16 to 256 beats (AxLEN 0..255), and introduces QoS/Region signals. AXI4-Lite fixes AxLEN=0 (single beat, no bursts) and omits caching/atomic locks.',
    unverifiedOrGenericItems: [
      'AWID / ARID bit widths are implementation defined (version dependent; typically 4–12 bits in SoCs).',
      'Elastic skid buffer / FIFO depth inside interconnects (shown as 8 entries) is implementation dependent, not fixed by ARM IHI 0022H.',
      'Exact slave latency before asserting BVALID/RVALID depends on downstream memory controller timing.',
    ],
    sources: [
      { name: 'ARM AMBA AXI4 Specification', version: 'IHI 0022H', section: 'Section A3.2 — Basic read and write transactions' },
      { name: 'ARM AMBA AXI4 Specification', version: 'IHI 0022H', section: 'Section A3.3 — Relationships between the channels' },
      { name: 'ARM AMBA AXI4 Specification', version: 'IHI 0022H', section: 'Section A3.4 — Transaction structure & bursts' },
    ],
    glossary: [
      { term: 'VALID / READY', definition: 'Two-wire synchronous flow control: source drives VALID, destination drives READY; beat transfers only when both are 1 at posedge ACLK.' },
      { term: 'Backpressure', definition: 'Receiver pulls READY=0 to throttle producer without dropping data or issuing retries.' },
      { term: 'WLAST', definition: 'Asserted high strictly on the final data beat of a write burst matching AWLEN + 1 beats.' },
      { term: 'SLVERR / DECERR', definition: '2-bit BRESP/RRESP error encodings: 2\'b10 SLVERR (slave internal fault) vs 2\'b11 DECERR (unmapped address).' },
    ],
    relatedTopics: [
      { id: 'soc-fabric-memory-walk', label: 'SoC Address Decode & Bus Fabric', reason: 'Shows how AWADDR/ARADDR hits slaves or returns DECERR' },
      { id: 'opentitan-hmac', label: 'OpenTitan HMAC/SHA-256 IP', reason: 'Uses lightweight bus transactions into CSR FIFO' },
      { id: 'pcie-ltssm-tlp', label: 'PCIe TLP & LTSSM', reason: 'Packetized off-chip cousin using credit flow control' },
    ],
    signals: [
      { name: 'AWVALID / AWREADY', width: '1 / 1', direction: 'Master <-> Slave', kind: 'control', rule: 'Write address handshake; AWVALID cannot wait on AWREADY.' },
      { name: 'AWLEN[7:0]', width: '8', direction: 'Master -> Slave', kind: 'control', rule: 'Exact beats = AWLEN + 1 (1..256 for INCR, 1..16 for FIXED/WRAP).' },
      { name: 'WDATA[DATA_W-1:0]', width: '32–1024 (impl)', direction: 'Master -> Slave', kind: 'data', rule: 'Write payload qualified by WSTRB byte-enable mask.' },
      { name: 'WLAST', width: '1', direction: 'Master -> Slave', kind: 'control', rule: 'Must assert on beat index == AWLEN; mismatch violates AXI4.' },
      { name: 'BRESP[1:0]', width: '2', direction: 'Slave -> Master', kind: 'error', rule: '2\'b00 OKAY, 2\'b10 SLVERR, 2\'b11 DECERR; returned after final WLAST.' },
    ],
    programmingModel: [
      'Master (e.g. DMA or CPU LSU) issues AW transaction header independently or simultaneously with beat 0 of WDATA.',
      'Slave samples AW payload on AWVALID && AWREADY, allocates internal write buffer, and drains W beats.',
      'Slave must NOT assert BVALID before both AW handshake and the WLAST beat handshake have completed.',
    ],
    verificationView: {
      checks: [
        'AXI4_ERRM_AWVALID_STABLE: Once AWVALID=1 while AWREADY=0, AWADDR/AWLEN/AWSIZE/AWBURST must stay immutable.',
        'AXI4_ERRS_BRESP_AFTER_WLAST: BVALID must never assert before WVALID && WREADY && WLAST completes.',
        'AXI4_DEADLOCK_RULE: Master VALID must have zero combinational path from Slave READY.',
      ],
      assertions: [
        'assert property (@(posedge ACLK) disable iff (!ARESETn) (AWVALID && !AWREADY) |=> (AWVALID && $stable({AWADDR, AWLEN, AWSIZE})));',
        'assert property (@(posedge ACLK) disable iff (!ARESETn) (WVALID && !WREADY) |=> $stable({WDATA, WSTRB, WLAST}));',
      ],
      coveragePoints: [
        'Cross cover AWVALID before WVALID, simultaneous AW/W, and WVALID leading AWVALID.',
        'Cover AWLEN = 0 (single beat), 3 (4-beat cacheline), and 255 (max 256-beat INCR burst).',
      ],
      scoreboardPlacement: 'Passive AXI4 Protocol Checker monitors all 5 channels; Scoreboard pushes committed write beats into sparse memory model upon BVALID && BREADY && BRESP==OKAY.',
    },
    commonMistakes: [
      'Making AWVALID depend combinationally on AWREADY — breaks AXI spec Rule A3.3.1 and causes combinational deadlock.',
      'Returning BVALID immediately after AWVALID && AWREADY before WLAST finishes (classic slave FSM bug).',
      'Counting beats from 0..AWLEN without +1: AWLEN=3 means 4 beats, not 3.',
    ],
    tryItControls: [
      {
        id: 'backpressure',
        label: 'Slave Backpressure (Hold READY=0)',
        type: 'toggle',
        defaultValue: false,
        effectSummary: 'Deasserts WREADY at T3 to force the master to hold WDATA stable and raises elastic FIFO occupancy.',
      },
      {
        id: 'injectError',
        label: 'Inject Write SLVERR',
        type: 'toggle',
        defaultValue: false,
        effectSummary: 'Drives BRESP=SLVERR (2\'b10) on completion channel to demonstrate protocol error signaling.',
      },
    ],
    modeDiff: {
      modeA: 'AXI4 Full (Burst Engine)',
      modeB: 'AXI4-Lite (CSR Control)',
      rows: [
        { dimension: 'Max Burst Length (AxLEN)', valueA: 'Up to 256 beats (INCR)', valueB: 'Fixed single beat (1 beat, AxLEN omitted)', impact: 'AXI4 sustains high DRAM bandwidth; AXI4-Lite saves area for control registers.' },
        { dimension: 'Burst Types (AxBURST)', valueA: 'FIXED, INCR, WRAP', valueB: 'Implicit single beat only', impact: 'WRAP supports critical-word-first CPU cacheline fills.' },
        { dimension: 'Transaction IDs (AxID)', valueA: 'Supported (out-of-order per ID)', valueB: 'Omitted (strictly in-order)', impact: 'Allows pipelined outstanding transactions across memory banks.' },
        { dimension: 'Write Strobes (WSTRB)', valueA: 'Byte-granular per beat', valueB: 'Byte-granular single word', impact: 'Both support sub-word masked writes cleanly.' },
      ],
    },
    selfCheck: [
      {
        id: 'axi-q1',
        question: 'If AWLEN = 8\'h03 and AWSIZE = 3\'b010 (4 bytes/beat), how many total bytes does the burst transfer?',
        options: ['12 bytes (3 beats)', '16 bytes (4 beats)', '32 bytes (8 beats)'],
        correctIndex: 1,
        explanation: 'Number of beats = AWLEN + 1 = 4 beats; 4 beats * 4 bytes/beat = 16 bytes.',
      },
      {
        id: 'axi-q2',
        question: 'Which dependency is explicitly FORBIDDEN by the ARM AXI4 specification?',
        options: ['Slave waiting for AWVALID before asserting AWREADY', 'Master waiting for AWREADY before asserting AWVALID', 'Slave waiting for WLAST before asserting BVALID'],
        correctIndex: 1,
        explanation: 'Master must assert VALID independently of READY; if both wait on each other, the interface deadlocks.',
      },
      {
        id: 'axi-q3',
        question: 'During a write transaction, when is the Slave legally permitted to assert BVALID?',
        options: ['Immediately after AW handshake', 'Only after both AW handshake and WLAST beat handshake complete', 'Before WVALID rises'],
        correctIndex: 1,
        explanation: 'Write response confirms completion of all write data beats, so BVALID must follow AWVALID&&AWREADY AND WVALID&&WREADY&&WLAST.',
      },
    ],
    scenes: [
      {
        id: 'axi-write-burst',
        title: 'Write Channel Handshake & Burst Beats (AW -> W -> B)',
        text: {
          overview: '1. Master places write address on AW. 2. Slave accepts address (AWVALID & AWREADY). 3. Master streams data beats until WLAST. 4. Slave returns completion status on B.',
          detail: 'AW and W channels operate independently: WDATA beat 0 can arrive simultaneously with AWADDR, or later. Each beat requires WVALID && WREADY; toggling Slave Backpressure holds WDATA constant at T3 without losing beat 1.',
          expert: 'Per ARM IHI 0022H Section A3.3.1, BVALID requires both AW and WLAST handshakes to complete. Skid buffers must break combinational paths on READY without adding throughput bubbles (>1 beat/cycle).',
        },
        renderers: [
          {
            kind: 'waveform',
            title: 'Cycle-Accurate Write Burst Timing (AWLEN=1 -> 2 Beats)',
            config: {
              signals: [
                { name: 'AWVALID', kind: 'control', values: ['0', '1', '0', '0', '0', '0', '0'] },
                { name: 'AWREADY', kind: 'control', values: ['1', '1', '1', '1', '1', '1', '1'] },
                { name: 'AWADDR', kind: 'data', values: ['IDLE', '0x1000', 'IDLE', 'IDLE', 'IDLE', 'IDLE', 'IDLE'] },
                { name: 'WVALID', kind: 'control', values: ['0', '0', '1', '1', '0', '0', '0'], backpressureValues: ['0', '0', '1', '1', '1', '0', '0'] },
                { name: 'WREADY', kind: 'control', values: ['1', '1', '1', '1', '1', '1', '1'], backpressureValues: ['1', '1', '1', '0', '1', '1', '1'] },
                { name: 'WDATA', kind: 'data', values: ['IDLE', 'IDLE', '0xD0', '0xD1', 'IDLE', 'IDLE', 'IDLE'], backpressureValues: ['IDLE', 'IDLE', '0xD0', '0xD1', '0xD1', 'IDLE', 'IDLE'] },
                { name: 'WLAST', kind: 'control', values: ['0', '0', '0', '1', '0', '0', '0'], backpressureValues: ['0', '0', '0', '1', '1', '0', '0'] },
                { name: 'BVALID', kind: 'control', values: ['0', '0', '0', '0', '1', '0', '0'], backpressureValues: ['0', '0', '0', '0', '0', '1', '0'] },
                { name: 'BRESP', kind: 'error', values: ['-', '-', '-', '-', 'OKAY', '-', '-'], errorValues: ['-', '-', '-', '-', 'SLVERR', '-', '-'] },
              ],
            },
          },
          {
            kind: 'sequence_flow',
            title: 'Decoupled Channel Causality',
            config: {
              lifelines: [
                { id: 'm', label: 'AXI4 Master', role: 'Initiator' },
                { id: 'ic', label: 'Skid / Crossbar', role: 'Fabric' },
                { id: 's', label: 'AXI4 Slave', role: 'SRAM Target' },
              ],
              messages: [
                { step: 1, from: 'm', to: 's', label: 'AW: 0x1000, LEN=1 (AWVALID & AWREADY)', kind: 'control', rule: 'Address Phase Commits' },
                { step: 2, from: 'm', to: 'ic', label: 'W Beat 0: 0xD0, WLAST=0', kind: 'data', rule: 'Beat 0 Handshake' },
                { step: 3, from: 'ic', to: 's', label: 'W Beat 1: 0xD1, WLAST=1', kind: 'data', rule: 'Master must hold if WREADY=0' },
                { step: 4, from: 's', to: 'm', label: 'B Channel: BVALID=1, BRESP=OKAY/SLVERR', kind: 'active', rule: 'Triggered only after WLAST' },
              ],
            },
          },
        ],
        highlightList: ['AWVALID', 'WLAST', 'BVALID'],
        causalityRules: [
          { rule: 'Stability Rule', cause: 'WVALID=1 && WREADY=0', effect: 'Master freezes WDATA, WSTRB, WLAST next clock' },
          { rule: 'Write Response Rule', cause: 'AW handshake + WLAST handshake done', effect: 'Slave asserts BVALID' },
        ],
        events: [
          { step: 1, label: 'AW address phase captured at 0x1000', kind: 'control' },
          { step: 2, label: 'Write Beat 0 (0xD0) transferred', kind: 'data' },
          { step: 3, label: 'Write Beat 1 (0xD1, WLAST=1) — check backpressure toggle!', kind: 'active' },
          { step: 4, label: 'B channel completion status returned', kind: 'control' },
        ],
        playbackSteps: 7,
        ariaDescription: '7-cycle AXI4 write burst sequence across AW, W, and B channels showing optional slave backpressure stall and SLVERR response.',
      },
      {
        id: 'axi-skid-credits',
        title: 'Channel Datapath & Elastic Skid Buffer Occupancy',
        text: {
          overview: 'Requests flow forward over AW/W wires into an internal elastic FIFO while B responses return status to the initiator.',
          detail: 'Registered ready/valid skid buffers isolate timing paths across SoC partitions without stalling the master on alternating cycles.',
          expert: 'Elastic FIFO depth (shown here as 8 slots) prevents bubbles under 1-cycle downstream stalls; full condition triggers WREADY=0 backpressure.',
        },
        renderers: [
          {
            kind: 'block_packet',
            title: 'Master-to-Slave Channel Wiring',
            config: {
              width: 700,
              height: 210,
              nodes: [
                { id: 'master', label: 'DMA Master', sublabel: 'M_AXI4', x: 24, y: 60, w: 140, h: 86, kind: 'control' },
                { id: 'fifo', label: 'Elastic Skid / FIFO', sublabel: 'Timing Closure', x: 265, y: 60, w: 165, h: 86, kind: 'data' },
                { id: 'slave', label: 'Memory Controller', sublabel: 'S_AXI4', x: 525, y: 60, w: 145, h: 86, kind: 'control' },
              ],
              wires: [
                { id: 'aw', fromX: 164, fromY: 82, toX: 265, toY: 82, label: 'AWVALID / READY', kind: 'control' },
                { id: 'w', fromX: 164, fromY: 118, toX: 265, toY: 118, label: 'WDATA[DATA_W]', kind: 'data' },
                { id: 'ic_s', fromX: 430, fromY: 96, toX: 525, toY: 96, label: 'Committed Beats', kind: 'data' },
                { id: 'b', fromX: 525, fromY: 132, toX: 164, toY: 132, label: 'BRESP / BVALID', kind: 'error' },
              ],
              packets: [
                { step: 1, wireId: 'aw', label: 'AW:0x1000', kind: 'control', progress: 0.5 },
                { step: 2, wireId: 'w', label: 'BEAT0 0xD0', kind: 'data', progress: 0.55 },
                { step: 3, wireId: 'ic_s', label: 'BEAT1 WLAST', kind: 'data', progress: 0.6 },
                { step: 4, wireId: 'b', label: 'B:OKAY', kind: 'active', progress: 0.5 },
              ],
            },
          },
          {
            kind: 'queue_credit',
            title: 'Slave Ingress FIFO Occupancy (Implementation-Defined 8 Entries)',
            config: {
              queueName: 'Slave Write Buffer (FIFO Depth = 8 · Impl Defined)',
              fifoDepth: 8,
              maxCredits: 8,
              occupancyByStep: [1, 3, 5, 4, 2, 1],
              backpressureOccupancyByStep: [2, 5, 7, 8, 8, 6],
            },
          },
        ],
        highlightList: ['WREADY', 'Elastic Skid'],
        causalityRules: [
          { rule: 'Queue Full -> READY=0', cause: 'FIFO occupancy == 8', effect: 'Receiver deasserts WREADY until downstream drains' },
        ],
        events: [
          { step: 1, label: 'AW packet buffered in ingress stage', kind: 'control' },
          { step: 3, label: 'WLAST beat drains FIFO (unless backpressure held)', kind: 'data' },
          { step: 4, label: 'BRESP travels back to DMA Master', kind: 'active' },
        ],
        playbackSteps: 6,
        ariaDescription: 'AXI4 block diagram and elastic write FIFO occupancy meter responding to backpressure toggle.',
      },
      {
        id: 'axi-attr-bitfield',
        title: 'AxCACHE / AxPROT / AxBURST Attribute Word',
        text: {
          overview: 'Every AW and AR address transfer carries sideband attributes describing burst pattern, transfer width, and security privileges.',
          detail: 'AxBURST (2 bits): 0=FIXED, 1=INCR, 2=WRAP. AxPROT[1] marks Non-Secure (1) vs Secure (0). AxSIZE encodes 2^AxSIZE bytes/beat.',
          expert: 'ARM IHI 0022H restricts WRAP bursts to power-of-2 lengths (2, 4, 8, 16) with starting address aligned to transfer size.',
        },
        renderers: [
          {
            kind: 'bitfield',
            title: 'AXI4 Control Qualifier Packing (Interactive Hex Decoder)',
            config: {
              registerName: 'AXI4 Ax Channel Qualifier Bundle (Packed Schematic)',
              widthBits: 32,
              defaultHex: '0x03020105',
              presets: [
                { label: 'INCR 4-Beat', hex: '0x03020105' },
                { label: 'WRAP4 Cache', hex: '0x0302020F' },
                { label: 'Lite Non-Sec', hex: '0x00020020' },
              ],
              highlightByStep: { 0: ['AxBURST', 'AxLEN'], 1: ['AxSIZE', 'AxPROT'], 2: ['AxCACHE'] },
              fields: [
                { msb: 31, lsb: 24, name: 'AxLEN', kind: 'control', access: 'Master', description: 'Burst length minus 1 (0..255).' },
                { msb: 23, lsb: 16, name: 'AxSIZE', kind: 'data', access: 'Master', description: 'Bytes per beat = 2^AxSIZE (e.g. 2 => 4B, 3 => 8B).' },
                { msb: 15, lsb: 8, name: 'AxBURST', kind: 'control', access: 'Master', description: '00=FIXED, 01=INCR, 10=WRAP, 11=Reserved.' },
                { msb: 7, lsb: 4, name: 'AxPROT', kind: 'error', access: 'Master', description: 'Privileged / Non-Secure / Instruction access flags.' },
                { msb: 3, lsb: 0, name: 'AxCACHE', kind: 'data', access: 'Master', description: 'Bufferable, Modifiable, Read/Write Allocate attributes.' },
              ],
            },
          },
        ],
        highlightList: ['AxLEN', 'AxBURST', 'AxPROT'],
        causalityRules: [
          { rule: 'WRAP Alignment', cause: 'AxBURST == 2\'b10 (WRAP)', effect: 'Burst length must be 2, 4, 8, or 16' },
        ],
        events: [
          { step: 0, label: 'Decode AxBURST and AxLEN for beat count', kind: 'control' },
          { step: 1, label: 'Check AxPROT security bit against slave TZPC', kind: 'error' },
          { step: 2, label: 'Inspect AxCACHE allocation attributes', kind: 'data' },
        ],
        playbackSteps: 4,
        ariaDescription: 'Interactive 32-bit hex decoder inspecting packed AXI4 AxLEN, AxSIZE, AxBURST, AxPROT, and AxCACHE fields.',
      },
    ],
  },

  {
    id: 'opentitan-hmac',
    title: 'OpenTitan HMAC / SHA-256 IP Architecture',
    domain: 'IP Blocks',
    summary:
      'Hardware cryptographic MAC engine implementing RFC 2104 HMAC over SHA-256 with TileLink-UL CSR interface, message FIFO, and dual ipad/opad compression passes.',
    specVersion: 'lowRISC OpenTitan hw/ip/hmac (Earlgrey Register & RTL Spec)',
    specDifferenceNote:
      'OpenTitan HMAC integrates both raw SHA-256 mode and full two-pass HMAC mode controlled by CFG.hmac_en; byte/digest endianness is software-configurable per word.',
    unverifiedOrGenericItems: [
      'Exact MSG_FIFO depth (typically 16 x 64-bit / 1024-bit staging) varies across OpenTitan silicon variants (version dependent).',
      'Exact CFG bit offsets vary slightly across OpenTitan releases (verify generated hmac_reg_pkg.sv in your target checkout).',
    ],
    sources: [
      { name: 'lowRISC OpenTitan HMAC RTL', version: 'Earlgrey', section: 'hw/ip/hmac/rtl/hmac.sv & hmac_core.sv' },
      { name: 'lowRISC OpenTitan SHA-256 Engine', version: 'Earlgrey', section: 'hw/ip/hmac/rtl/sha2.sv & sha2_pad.sv' },
    ],
    glossary: [
      { term: 'ipad / opad', definition: 'Inner pad (key XOR 0x36) hashed with message, followed by outer pad (key XOR 0x5C) hashed with inner digest.' },
      { term: 'TL-UL', definition: 'TileLink Uncached Lightweight 32-bit bus carrying CSR reads/writes and MSG_FIFO writes.' },
      { term: 'MSG_FIFO', definition: 'Write-only memory-mapped FIFO window buffering streaming message bytes into sha2_pad.' },
    ],
    relatedTopics: [
      { id: 'soc-fabric-memory-walk', label: 'SoC Address Decode & Bus Fabric', reason: 'Shows TL-UL address decode targeting HMAC CSR & MSG_FIFO' },
      { id: 'axi4-handshakes', label: 'AXI4 Handshakes', reason: 'Comparison against full burst buses vs TL-UL CSR access' },
    ],
    signals: [
      { name: 'tl_i / tl_o', width: 'TL-UL struct', direction: 'Bus <-> hmac_reg_top', kind: 'control', rule: 'Carries CSR accesses + MSG_FIFO payload writes; returns integrity/backpressure error if FIFO stalls.' },
      { name: 'intr_hmac_done_o', width: '1', direction: 'hmac -> PLIC', kind: 'control', rule: 'Pulsed/latched interrupt once final outer digest lands in DIGEST_0..7.' },
      { name: 'fifo_wready', width: '1', direction: 'hmac_core -> tl_i', kind: 'data', rule: 'Stalls incoming MSG_FIFO writes while sha2 rounds consume 512-bit chunk.' },
      { name: 'err_code', width: '5', direction: 'hmac_core -> STATUS', kind: 'error', rule: 'Flags push-to-full FIFO or writing CFG/KEY while hash active.' },
    ],
    programmingModel: [
      '1. Write 256-bit secret key to KEY_0 .. KEY_7 while engine is IDLE.',
      '2. Configure CFG (hmac_en=1, sha_en=1, endianness) and assert CMD.hash_start=1.',
      '3. Poll STATUS.fifo_empty/depth and stream message bytes/words into MSG_FIFO window.',
      '4. Assert CMD.hash_process=1, wait for intr_hmac_done_o, and read DIGEST_0 .. DIGEST_7.',
    ],
    verificationView: {
      checks: [
        'Verify sha2_pad appends 0x80 + zero padding + 64-bit big-endian bit length across 512-bit block boundaries.',
        'Confirm security wipe / CFG change during active hash raises error alert without leaking key bits.',
      ],
      assertions: [
        'assert property (@(posedge clk_i) disable iff (!rst_ni) (cmd_hash_process && !hash_active) |-> err_invalid_state);',
      ],
      coveragePoints: ['Message lengths 0, 55, 56, 64, 128 bytes (covering 1-block vs 2-block SHA padding).'],
      scoreboardPlacement: 'TL-UL monitor extracts written KEY + MSG_FIFO stream and compares DIGEST_0..7 against OpenSSL/Python hashlib HMAC-SHA256 reference.',
    },
    commonMistakes: [
      'Setting CMD.hash_process before flushing final partial byte write into MSG_FIFO.',
      'Overwriting KEY_0..7 after hash_start has launched without finishing or wiping active state.',
    ],
    tryItControls: [
      {
        id: 'injectError',
        label: 'Inject Invalid State / FIFO Overflow',
        type: 'toggle',
        defaultValue: false,
        effectSummary: 'Simulates illegal write while busy / FIFO full, lighting the ERROR transition and STATUS error bit.',
      },
    ],
    selfCheck: [
      {
        id: 'hmac-q1',
        question: 'In OpenTitan HMAC mode, how many SHA-256 compression passes are required to produce the final MAC?',
        options: ['1 pass over key + message', '2 passes: inner SHA256(ipad || msg) then outer SHA256(opad || inner_digest)', '64 independent passes'],
        correctIndex: 1,
        explanation: 'RFC 2104 defines HMAC(K, m) = H((K\' xor opad) || H((K\' xor ipad) || m)), requiring inner and outer SHA-256 evaluations.',
      },
      {
        id: 'hmac-q2',
        question: 'Which submodule in lowRISC OpenTitan appends the 0x80 byte and 64-bit message length trailer?',
        options: ['hmac_reg_top.sv', 'sha2_pad.sv', 'hmac_core_mux.sv'],
        correctIndex: 1,
        explanation: 'sha2_pad.sv handles FIPS 180-4 bit/byte padding to exact 512-bit compression blocks.',
      },
      {
        id: 'hmac-q3',
        question: 'When must software write KEY_0..KEY_7 before computing an HMAC?',
        options: ['Before asserting CMD.hash_start while engine is IDLE', 'After CMD.hash_process', 'During DIGEST readout'],
        correctIndex: 0,
        explanation: 'Key registers must be configured before hash_start initializes the ipad XOR state.',
      },
    ],
    scenes: [
      {
        id: 'hmac-datapath-fsm',
        title: 'RTL Datapath & Dual-Pass FSM (IDLE -> IPAD -> ABSORB -> PAD -> OPAD)',
        text: {
          overview: 'CPU writes KEY & MSG_FIFO over TileLink-UL; hmac_core feeds inner ipad key, streams message blocks into sha2, pads, and runs outer opad digest.',
          detail: 'hmac_reg_top decodes CSRs and isolates MSG_FIFO writes. sha2 executes 64 compression rounds per 512-bit chunk before releasing fifo_wready.',
          expert: 'Alert/Error paths assert on illegal key mutation mid-digest or MSG_FIFO overflow. Watch ERROR state highlight when "Inject Invalid State" is toggled.',
        },
        renderers: [
          {
            kind: 'block_packet',
            title: 'OpenTitan hw/ip/hmac RTL Block Datapath',
            config: {
              width: 700,
              height: 220,
              nodes: [
                { id: 'reg', label: 'hmac_reg_top.sv', sublabel: 'TL-UL CSR & FIFO', x: 20, y: 65, w: 140, h: 86, kind: 'control' },
                { id: 'core', label: 'hmac_core.sv', sublabel: 'ipad/opad XOR FSM', x: 205, y: 65, w: 140, h: 86, kind: 'active' as const },
                { id: 'pad', label: 'sha2_pad.sv', sublabel: '512b Block Padder', x: 388, y: 65, w: 135, h: 86, kind: 'data' },
                { id: 'sha', label: 'sha2.sv', sublabel: '64-Round Engine', x: 560, y: 65, w: 120, h: 86, kind: 'data' },
              ],
              wires: [
                { id: 'w1', fromX: 160, fromY: 108, toX: 205, toY: 108, label: 'KEY+MSG', kind: 'data' },
                { id: 'w2', fromX: 345, fromY: 108, toX: 388, toY: 108, label: 'ipad/msg', kind: 'control' },
                { id: 'w3', fromX: 523, fromY: 108, toX: 560, toY: 108, label: '512b blk', kind: 'data' },
              ],
              packets: [
                { step: 0, wireId: 'w1', label: 'CFG/KEY', kind: 'control' },
                { step: 1, wireId: 'w2', label: 'K xor 0x36', kind: 'active' },
                { step: 2, wireId: 'w1', label: 'MSG FIFO', kind: 'data' },
                { step: 3, wireId: 'w3', label: 'PAD 0x80+LEN', kind: 'data' },
                { step: 4, wireId: 'w2', label: 'K xor 0x5C', kind: 'active' },
                { step: 5, wireId: 'w3', label: 'DIGEST[0..7]', kind: 'control' },
              ],
            },
          },
          {
            kind: 'fsm',
            title: 'HMAC Core Controller FSM',
            config: {
              width: 680,
              height: 220,
              states: [
                { id: 'IDLE', label: 'IDLE', x: 80, y: 110 },
                { id: 'IPAD', label: 'IPAD', x: 200, y: 70 },
                { id: 'ABSORB', label: 'ABSORB', x: 335, y: 70 },
                { id: 'PAD', label: 'PAD', x: 465, y: 70 },
                { id: 'OPAD', label: 'OPAD', x: 590, y: 110 },
                { id: 'ERROR', label: 'ERR_ALERT', x: 335, y: 175, kind: 'error' },
              ],
              transitions: [
                { from: 'IDLE', to: 'IPAD', guard: 'CMD.hash_start', stepTrigger: 1 },
                { from: 'IPAD', to: 'ABSORB', guard: 'ipad_sent', stepTrigger: 2 },
                { from: 'ABSORB', to: 'PAD', guard: 'CMD.hash_process', stepTrigger: 3 },
                { from: 'PAD', to: 'OPAD', guard: 'inner_done && hmac_en', stepTrigger: 4 },
                { from: 'OPAD', to: 'IDLE', guard: 'outer_done -> IRQ', stepTrigger: 5 },
                { from: 'ABSORB', to: 'ERROR', guard: 'illegal_write / err', stepTrigger: 99, kind: 'error' },
              ],
              activeStateByStep: ['IDLE', 'IPAD', 'ABSORB', 'PAD', 'OPAD', 'IDLE'],
            },
          },
        ],
        highlightList: ['hmac_core.sv', 'sha2_pad.sv', 'DIGEST_0..7'],
        causalityRules: [
          { rule: 'Two-Pass Sequence', cause: 'CFG.hmac_en == 1 && inner_done', effect: 'Automatically launch opad || inner_digest compression' },
        ],
        events: [
          { step: 0, label: 'KEY & CFG written via TL-UL CSR', kind: 'control' },
          { step: 1, label: 'Inner pad block (Key ^ 0x36) hashed', kind: 'active' },
          { step: 2, label: 'MSG_FIFO payload absorbed by sha2.sv', kind: 'data' },
          { step: 3, label: 'sha2_pad appends 0x80 and length bits', kind: 'data' },
          { step: 4, label: 'Outer pad block (Key ^ 0x5C) + inner digest hashed', kind: 'active' },
          { step: 5, label: 'Final HMAC written to DIGEST_0..7; intr_hmac_done asserted', kind: 'control' },
        ],
        playbackSteps: 6,
        ariaDescription: 'Synchronized OpenTitan HMAC RTL datapath block diagram and 6-state FSM walking from IDLE through IPAD, ABSORB, PAD, OPAD, to completion.',
      },
      {
        id: 'hmac-csr-hex',
        title: 'CSR Programming Layout (CFG / CMD Interactive Decoder)',
        text: {
          overview: 'Software configures HMAC mode, endianness, and triggers start/process via memory-mapped CSRs.',
          detail: 'Inspect how enable bits (hmac_en, sha_en, endian_swap) and trigger bits interact inside the control word.',
          expert: 'Note: Exact CSR bit offsets are Earlgrey version-dependent; always consult generated hmac_reg_pkg.sv.',
        },
        renderers: [
          {
            kind: 'bitfield',
            title: 'HMAC Control & Command Schematic Register (Version-Dependent Bit Map)',
            config: {
              registerName: 'HMAC_CFG + CMD Combined Schematic Word',
              widthBits: 32,
              defaultHex: '0x00000013',
              presets: [
                { label: 'HMAC Start', hex: '0x00000013' },
                { label: 'Raw SHA256', hex: '0x00000012' },
                { label: 'Process Msg', hex: '0x00000023' },
              ],
              highlightByStep: { 0: ['hmac_en', 'sha_en'], 1: ['hash_start'], 2: ['hash_process'] },
              fields: [
                { msb: 31, lsb: 8, name: 'RESERVED', kind: 'control', access: 'RO', description: 'Reserved / zero (version dependent).' },
                { msb: 7, lsb: 6, name: 'digest_size', kind: 'data', access: 'RW', description: 'Digest mode selector (e.g. SHA-256 vs SHA-384/512 on extended builds).' },
                { msb: 5, lsb: 5, name: 'hash_process', kind: 'active' as unknown as 'control', access: 'WO', description: 'Pulse 1 to finalize message padding & outer pass.' },
                { msb: 4, lsb: 4, name: 'hash_start', kind: 'control', access: 'WO', description: 'Pulse 1 to initialize SHA/HMAC FSM from IDLE.' },
                { msb: 3, lsb: 2, name: 'endian_swap', kind: 'data', access: 'RW', description: 'Swap message / digest byte order.' },
                { msb: 1, lsb: 1, name: 'sha_en', kind: 'control', access: 'RW', description: 'Enable SHA-256 compression datapath.' },
                { msb: 0, lsb: 0, name: 'hmac_en', kind: 'control', access: 'RW', description: 'Enable dual-pass RFC 2104 HMAC wrapping.' },
              ],
            },
          },
        ],
        highlightList: ['hmac_en', 'hash_start', 'hash_process'],
        causalityRules: [
          { rule: 'Start Guard', cause: 'sha_en=1 && hash_start=1', effect: 'FSM enters IPAD (if hmac_en=1) or ABSORB (if hmac_en=0)' },
        ],
        events: [
          { step: 0, label: 'Enable hmac_en and sha_en bits', kind: 'control' },
          { step: 1, label: 'Pulse hash_start to begin session', kind: 'control' },
          { step: 2, label: 'Pulse hash_process after final message write', kind: 'data' },
        ],
        playbackSteps: 3,
        ariaDescription: 'Interactive 32-bit hex decoder for OpenTitan HMAC configuration and command bits.',
      },
    ],
  },

  {
    id: 'riscv-5stage-pipeline',
    title: 'RISC-V 5-Stage Pipeline, Forwarding & Hazards',
    domain: 'CPUs',
    summary:
      'Classic in-order RV32I 5-stage pipeline (IF, ID, EX, MEM, WB) demonstrating RAW data forwarding bypasses, load-use bubbles, and branch flush squashing.',
    specVersion: 'RISC-V Unprivileged ISA Specification v20191213 (RV32I Base)',
    specDifferenceNote:
      'The RISC-V ISA specifies sequential architectural state; 5-stage pipeline bypasses, stall interlocking, and branch prediction microarchitecture vary per core (Ibex 2-stage vs Rocket 5-stage vs CVA6 6-stage).',
    unverifiedOrGenericItems: [
      'Pipeline stage count (5 stages shown here) is a classic textbook/Rocket-class microarchitecture, not mandated by RISC-V ISA (Ibex uses 2/3 stages).',
      'Static branch-not-taken vs BTB predictor miss penalty (shown as 2 flushed stages at EX resolve) depends on core predictor design.',
    ],
    sources: [
      { name: 'RISC-V Unprivileged ISA', version: 'v20191213', section: 'Chapter 2 — RV32I Base Integer Instruction Set' },
      { name: 'Patterson & Hennessy / UC Berkeley Rocket', version: 'Classic 5-Stage', section: 'Datapath Forwarding & Hazard Detection Unit' },
    ],
    glossary: [
      { term: 'RAW Hazard', definition: 'Read-After-Write dependency where a younger instruction reads a register (rs1/rs2) not yet written back in WB.' },
      { term: 'EX -> EX Bypass', definition: 'Forwarding ALU output from EX/MEM pipeline register directly into ALU operand mux next cycle.' },
      { term: 'Load-Use Bubble', definition: 'Mandatory 1-cycle stall when consumer needs loaded memory data before MEM completes.' },
    ],
    relatedTopics: [
      { id: 'ddr5-cache-mesi', label: 'Cache Coherence & DRAM Timing', reason: 'MEM stage D-Cache miss triggers L1/L2 refill' },
      { id: 'gpu-warp-simt', label: 'GPU SIMT Warp Scheduling', reason: 'Contrasts CPU forwarding/speculation vs GPU latency hiding' },
    ],
    signals: [
      { name: 'stall_id', width: '1', direction: 'Hazard Unit -> IF/ID', kind: 'error', rule: 'Freezes PC and IF/ID reg on load-use hazard while injecting NOP into ID/EX.' },
      { name: 'fwd_a_sel[1:0]', width: '2', direction: 'Forwarding -> ALU Mux A', kind: 'data', rule: '00=RegFile, 01=WB bypass, 10=EX/MEM ALU bypass.' },
      { name: 'flush_if_id', width: '1', direction: 'Branch Unit -> IF/ID, ID/EX', kind: 'error', rule: 'Clears wrong-path instructions to NOP when taken branch resolves in EX.' },
    ],
    programmingModel: [
      'Architectural x0..x31 appear strictly sequential to software; x0 is hardwired 0.',
      'Compiler scheduling inserts independent instructions after LW to avoid load-use pipeline bubbles.',
    ],
    verificationView: {
      checks: [
        'Compare retired architectural state (rd, PC, mem) against Spike ISA golden model per commit.',
        'Confirm x0 forwarding never bypasses non-zero ALU value (rd==0 must be ignored by Forwarding Unit!).',
      ],
      assertions: [
        'assert property (@(posedge clk) (id_ex_memread && (id_ex_rd != 0) && ((id_ex_rd == if_id_rs1) || (id_ex_rd == if_id_rs2))) |-> stall_id);',
      ],
      coveragePoints: ['Cover EX->EX, MEM->EX, dual-source forwarding, load-use stall, and taken BEQ flush.'],
      scoreboardPlacement: 'Commit/WB retirement port feeds RVFI (RISC-V Formal Interface) tracer into co-simulation golden reference.',
    },
    commonMistakes: [
      'Forgetting `rd != 0` guard in forwarding logic — causes writes to `x0` (like `ADDI x0, x0, 5`) to poison subsequent reads of `x0`.',
      'Flushing wrong pipeline stages on branch mispredict and accidentally killing the resolved branch instruction itself.',
    ],
    tryItControls: [
      {
        id: 'hazardMode',
        label: 'Hazard Scenario',
        type: 'select',
        defaultValue: 'forwarding',
        options: [
          { label: 'ALU Forwarding (EX->EX, 0 stalls)', value: 'forwarding' },
          { label: 'Load-Use Hazard (1-cycle BUBBLE)', value: 'load_use_stall' },
          { label: 'Taken Branch (2-cycle FLUSH)', value: 'branch_flush' },
        ],
        effectSummary: 'Switches instruction sequence, bypass arcs, stalls, and flushes live in the pipeline grid.',
      },
    ],
    selfCheck: [
      {
        id: 'rv-q1',
        question: 'Why does forwarding fail to eliminate ALL stalls after an LW (Load Word) instruction?',
        options: ['LW has no destination register', 'Memory read data only becomes valid at the end of MEM, too late for the next instruction\'s EX cycle', 'RegFile cannot be written'],
        correctIndex: 1,
        explanation: 'LW produces data after MEM (not EX), so an immediately dependent ALU instruction in EX requires 1 stall cycle to use MEM->EX bypass.',
      },
      {
        id: 'rv-q2',
        question: 'What critical check prevents forwarding bugs when the producer destination register is x0?',
        options: ['ex_mem_rd != 5\'d0', 'pc[1:0] == 2\'b00', 'opcode == 7\'h33'],
        correctIndex: 0,
        explanation: 'Register x0 is always 0 in RISC-V; forwarding hardware must explicitly exclude rd == 0.',
      },
      {
        id: 'rv-q3',
        question: 'Which bits encode the 7-bit primary opcode in all standard 32-bit RV32I instructions?',
        options: ['Bits [31:25]', 'Bits [6:0]', 'Bits [14:12]'],
        correctIndex: 1,
        explanation: 'RISC-V places the 7-bit major opcode consistently in bits [6:0] to simplify parallel decode.',
      },
    ],
    scenes: [
      {
        id: 'rv-pipeline-hazards',
        title: 'Stage Execution Matrix, Bypassing, Bubbles & Flushes',
        text: {
          overview: 'Switch Hazard Scenario above to compare zero-stall ALU forwarding, a mandatory 1-cycle load-use bubble, and speculative branch flushes.',
          detail: 'In ALU Forwarding, ADD produces x1 at the end of EX (C2) and feeds SUB\'s ALU input directly in C3 without waiting for WB in C4.',
          expert: 'Hazard unit compares ID/EX.MemRead & (rd != 0) against IF/ID rs1/rs2; taken branch asserts flush_if_id to convert speculative slots into architectural NOPs.',
        },
        renderers: [
          {
            kind: 'pipeline',
            title: 'Cycle-Accurate Instruction Pipeline Lanes',
            config: {
              scenarios: {
                forwarding: {
                  rows: [
                    { pc: '0x00', insn: 'ADD x1, x2, x3', stages: ['IF', 'ID', 'EX', 'MEM', 'WB', '-', '-'] },
                    { pc: '0x04', insn: 'SUB x4, x1, x5', stages: ['-', 'IF', 'ID', 'EX', 'MEM', 'WB', '-'] },
                    { pc: '0x08', insn: 'OR  x6, x1, x7', stages: ['-', '-', 'IF', 'ID', 'EX', 'MEM', 'WB'] },
                  ],
                  forwards: [
                    { cycle: 3, fromRow: 0, toRow: 1, label: 'EX->EX (x1)', kind: 'data' },
                    { cycle: 4, fromRow: 0, toRow: 2, label: 'MEM->EX (x1)', kind: 'data' },
                  ],
                },
                load_use_stall: {
                  rows: [
                    { pc: '0x00', insn: 'LW  x1, 0(x2)', stages: ['IF', 'ID', 'EX', 'MEM', 'WB', '-', '-'] },
                    { pc: '0x04', insn: 'ADD x4, x1, x5', stages: ['-', 'IF', 'ID', 'BUBBLE', 'EX', 'MEM', 'WB'] },
                    { pc: '0x08', insn: 'XOR x6, x7, x8', stages: ['-', '-', 'IF', 'BUBBLE', 'ID', 'EX', 'MEM'] },
                  ],
                  forwards: [
                    { cycle: 4, fromRow: 0, toRow: 1, label: 'MEM->EX after stall', kind: 'data' },
                  ],
                },
                branch_flush: {
                  rows: [
                    { pc: '0x00', insn: 'BEQ x1, x2, +16', stages: ['IF', 'ID', 'EX', 'MEM', 'WB', '-', '-'] },
                    { pc: '0x04', insn: 'ADD x3, x4, x5 (spec)', stages: ['-', 'IF', 'ID', 'FLUSH', '-', '-', '-'] },
                    { pc: '0x10', insn: 'SW  x6, 0(x7) (target)', stages: ['-', '-', '-', 'IF', 'ID', 'EX', 'MEM'] },
                  ],
                  forwards: [
                    { cycle: 3, fromRow: 0, toRow: 1, label: 'Squash wrong path', kind: 'error' },
                  ],
                },
              },
            },
          },
          {
            kind: 'bitfield',
            title: 'RV32I 32-Bit R-Type Instruction Decoder (ADD / SUB / AND)',
            config: {
              registerName: 'RV32I R-Type Word (e.g. 0x003100B3 = ADD x1, x2, x3)',
              widthBits: 32,
              defaultHex: '0x003100B3',
              presets: [
                { label: 'ADD x1,x2,x3', hex: '0x003100B3' },
                { label: 'SUB x4,x1,x5', hex: '0x40508233' },
              ],
              highlightByStep: { 1: ['rs1', 'rs2', 'opcode'], 2: ['funct7', 'funct3'], 4: ['rd'] },
              fields: [
                { msb: 31, lsb: 25, name: 'funct7', kind: 'control', access: 'Decode', description: 'ALU variant selector (0x00 = ADD, 0x20 = SUB/SRA).' },
                { msb: 24, lsb: 20, name: 'rs2', kind: 'data', access: 'ID Stage', description: 'Source register 2 index (0..31).' },
                { msb: 19, lsb: 15, name: 'rs1', kind: 'data', access: 'ID Stage', description: 'Source register 1 index (0..31).' },
                { msb: 14, lsb: 12, name: 'funct3', kind: 'control', access: 'Decode', description: 'Operation selector inside OP group.' },
                { msb: 11, lsb: 7, name: 'rd', kind: 'data', access: 'WB Stage', description: 'Destination register (writes to x0 ignored).' },
                { msb: 6, lsb: 0, name: 'opcode', kind: 'control', access: 'ID Stage', description: '7\'b0110011 (0x33) = OP Register-Register ALU.' },
              ],
            },
          },
        ],
        highlightList: ['EX->EX', 'BUBBLE', 'FLUSH'],
        causalityRules: [
          { rule: 'Load-Use Interlock', cause: 'ID/EX.MemRead && (ID/EX.rd == IF/ID.rs1|rs2)', effect: 'Freeze IF/ID & insert BUBBLE in ID/EX' },
        ],
        events: [
          { step: 1, label: 'ID stage decodes rs1/rs2 and checks Hazard Unit', kind: 'control' },
          { step: 2, label: 'EX stage computes ALU result or resolves BEQ branch', kind: 'active' },
          { step: 3, label: 'Forwarding mux injects EX/MEM result (or FLUSH clears wrong path)', kind: 'data' },
          { step: 4, label: 'WB commits register destination rd', kind: 'control' },
        ],
        playbackSteps: 7,
        ariaDescription: 'Interactive RISC-V 5-stage pipeline matrix comparing forwarding, load-use stalls, and branch flushes with live RV32I R-type bit-field decoder.',
      },
    ],
  },

  {
    id: 'pcie-ltssm-tlp',
    title: 'PCIe Layered Stack, TLP Framing & LTSSM',
    domain: 'Protocols',
    summary:
      'Packetized point-to-point serial interconnect separating Transaction (TLP + credits), Data Link (SeqNum + LCRC Ack/Nak), and Physical (LTSSM + SerDes framing) layers.',
    specVersion: 'PCI-SIG PCI Express Base Specification 5.0 / 6.0 (NRZ vs PAM4 FLIT)',
    specDifferenceNote:
      'PCIe 5.0 (32 GT/s) uses 128b/130b NRZ variable-length TLPs; PCIe 6.0 (64 GT/s) switches to PAM4 + fixed 256-byte FLIT mode with lightweight FEC and L0p.',
    unverifiedOrGenericItems: [
      'Exact FC credit pool initial values are advertised dynamically during DL InitFC1/InitFC2 (device buffer dependent).',
      'Equalization preset coefficients (P0–P10) negotiate dynamically across Recovery.Equalization phases.',
    ],
    sources: [
      { name: 'PCI Express Base Specification', version: 'Rev 5.0 / 6.0', section: 'Chapters 2, 3, 4 — Transaction, Data Link & Physical LTSSM' },
    ],
    glossary: [
      { term: 'TLP', definition: 'Transaction Layer Packet carrying Memory, IO, Config, or Message requests/completions.' },
      { term: 'DLLP', definition: 'Data Link Layer Packet (Ack/Nak, InitFC, UpdateFC) local to a single PCIe link hop.' },
      { term: 'LTSSM', definition: 'Link Training and Status State Machine governing receiver detect, lane polling, config, L0, and Recovery.' },
    ],
    relatedTopics: [
      { id: 'axi4-handshakes', label: 'AXI4 Handshakes', reason: 'Root Complex bridges internal AXI4 bursts to external PCIe TLPs' },
      { id: 'soc-fabric-memory-walk', label: 'SoC Address Decode', reason: 'PCIe BAR apertures map into SoC physical address space' },
    ],
    signals: [
      { name: 'Fmt[2:0] / Type[4:0]', width: '8', direction: 'TLP DW0', kind: 'control', rule: 'Defines 3DW/4DW header + payload vs non-payload + Memory/Cfg/Cpl type.' },
      { name: 'SeqNum[11:0]', width: '12', direction: 'Data Link -> PHY', kind: 'control', rule: 'Tags every TLP for Retry Buffer replay upon Nak DLLP.' },
      { name: 'UpdateFC_PH/PD', width: 'Credit DLLP', direction: 'RX DL -> TX DL', kind: 'data', rule: 'Prevents receiver TLP buffer overflow without per-packet ACK.' },
    ],
    programmingModel: [
      'BIOS/OS enumerates PCIe hierarchy using Config Type 0 / Type 1 reads and writes, programming BAR apertures.',
      'Endpoints become Bus Masters (BME=1) and stream Posted Memory Writes (MWr) and Non-Posted Reads (MRd).',
    ],
    verificationView: {
      checks: [
        'Verify Replay Timer triggers TLP retransmission on Nak DLLP with exact preserved SeqNum order.',
        'Check Posted Requests may pass Non-Posted Requests (PCIe Ordering Rule) to prevent deadlock.',
      ],
      assertions: [
        'assert property (@(posedge pipe_clk) (ltssm_state == L0 && rx_lcrc_err) |-> ##[1:4] tx_nak_dllp);',
      ],
      coveragePoints: ['Cover Gen1->Gen5 speed upgrade through LTSSM Recovery, plus 3DW & 4DW Memory TLPs.'],
      scoreboardPlacement: 'TLP Scoreboard compares TX Transaction Layer output against RX Transaction Layer delivery after LCRC/Ack/Nak stripping.',
    },
    commonMistakes: [
      'Assuming Non-Posted MRd consumes Posted credits — Posted, Non-Posted, and Completion track separate PH/PD/NPH/NPD/CPLH/CPLD credit counters.',
      'Ignoring PCIe 4KB boundary crossing rule: a single TLP must never cross a 4KB address boundary.',
    ],
    tryItControls: [
      {
        id: 'backpressure',
        label: 'Credit Exhaustion / Retry Stall',
        type: 'toggle',
        defaultValue: false,
        effectSummary: 'Drains available Flow Control credits to show TX holding Non-Posted requests until UpdateFC arrives.',
      },
    ],
    selfCheck: [
      {
        id: 'pcie-q1',
        question: 'Which PCIe layer appends the 12-bit Sequence Number and 32-bit LCRC to protect link-level delivery?',
        options: ['Transaction Layer', 'Data Link Layer', 'Physical Layer'],
        correctIndex: 1,
        explanation: 'Data Link Layer adds Sequence Number + LCRC and manages the Retry Buffer via Ack/Nak DLLPs.',
      },
      {
        id: 'pcie-q2',
        question: 'Through which LTSSM state does a PCIe link transition to retrain lane equalization or upgrade link speed (e.g. 2.5 to 32 GT/s)?',
        options: ['Detect', 'Recovery', 'Polling'],
        correctIndex: 1,
        explanation: 'Links enter L0 at Gen1 (2.5 GT/s) first, then enter Recovery to negotiate higher data rates and Tx/Rx equalization.',
      },
      {
        id: 'pcie-q3',
        question: 'Why does PCIe separate Flow Control credits into Posted, Non-Posted, and Completion pools?',
        options: ['To prevent head-of-line deadlock between Posted writes/completions and stalled Non-Posted reads', 'To double clock frequency', 'To encrypt payloads'],
        correctIndex: 0,
        explanation: 'Completions and Posted writes must be able to make forward progress even if Non-Posted request buffers are full.',
      },
    ],
    scenes: [
      {
        id: 'pcie-stack-fsm',
        title: 'Protocol Stack Encapsulation & LTSSM Link Bring-Up',
        text: {
          overview: 'TLPs pick up Sequence + LCRC at Data Link, framing symbols at Physical, and traverse SerDes lanes once LTSSM reaches L0.',
          detail: 'LTSSM walks Detect -> Polling -> Configuration -> L0, then revisits Recovery for Gen3–Gen6 equalization.',
          expert: 'In Gen5 (32 GT/s), 128b/130b Sync Headers distinguish Data Blocks (2\'b10) from Ordered Sets (2\'b01).',
        },
        renderers: [
          {
            kind: 'layered_stack',
            title: 'PCIe TX Encapsulation Stack',
            config: {
              layers: [
                { name: 'Transaction Layer', role: 'Ordering & FC Credits', headerAdded: 'TLP Header (3DW/4DW) + ReqID/Tag', trailerAdded: 'Optional ECRC (32b)', activeSteps: [0], kind: 'control' },
                { name: 'Data Link Layer', role: 'Ack/Nak Reliability', headerAdded: 'SeqNum (12b)', trailerAdded: 'LCRC (32b)', activeSteps: [1], kind: 'data' },
                { name: 'Physical Layer', role: '128b/130b / FLIT Framing', headerAdded: 'STP Token + SyncHdr', trailerAdded: 'EDB / END', activeSteps: [2, 3], kind: 'control' },
              ],
            },
          },
          {
            kind: 'fsm',
            title: 'Physical Layer LTSSM Bring-Up FSM',
            config: {
              width: 680,
              height: 210,
              states: [
                { id: 'DETECT', label: 'Detect', x: 75, y: 105 },
                { id: 'POLLING', label: 'Polling', x: 215, y: 105 },
                { id: 'CONFIG', label: 'Config', x: 355, y: 105 },
                { id: 'L0', label: 'L0', x: 500, y: 70 },
                { id: 'RECOVERY', label: 'Recovery', x: 500, y: 160 },
              ],
              transitions: [
                { from: 'DETECT', to: 'POLLING', guard: 'Rx_detected', stepTrigger: 1 },
                { from: 'POLLING', to: 'CONFIG', guard: 'TS1/TS2_bitlock', stepTrigger: 2 },
                { from: 'CONFIG', to: 'L0', guard: 'lanes_aligned', stepTrigger: 3 },
                { from: 'L0', to: 'RECOVERY', guard: 'speed_chg / err', stepTrigger: 4 },
              ],
              activeStateByStep: ['DETECT', 'POLLING', 'CONFIG', 'L0', 'RECOVERY'],
            },
          },
        ],
        highlightList: ['SeqNum + LCRC', 'LTSSM L0'],
        causalityRules: [
          { rule: 'DL Active Gate', cause: 'LTSSM == L0', effect: 'Data Link exchanges InitFC1/InitFC2 before releasing TLPs' },
        ],
        events: [
          { step: 0, label: 'Transaction Layer builds 3DW/4DW TLP header', kind: 'control' },
          { step: 1, label: 'LTSSM Polling exchanges TS1/TS2; DL adds SeqNum+LCRC', kind: 'data' },
          { step: 2, label: 'Config strips/assigns Link/Lane numbers', kind: 'control' },
          { step: 3, label: 'L0 active data transmission across SerDes lanes', kind: 'active' },
          { step: 4, label: 'Recovery upgrades speed / retrains equalization', kind: 'control' },
        ],
        playbackSteps: 5,
        ariaDescription: 'PCIe 3-layer stack encapsulation paired with LTSSM link training state machine.',
      },
      {
        id: 'pcie-tlp-dw0',
        title: 'TLP Header DW0 Live Decoder & Flow Control Pool',
        text: {
          overview: 'Inspect the first 32-bit Double Word (DW0) of any PCIe Transaction Layer Packet and track Posted Header/Data credit availability.',
          detail: 'Fmt + Type identify MWr, MRd, CfgRd, or CplD; Length encodes payload in 32-bit DWords (0 means 1024 DW = 4KB).',
          expert: 'When Credit Exhaustion is toggled, TX Transaction Layer halts issuing new TLPs even though PHY lanes are idle in L0.',
        },
        renderers: [
          {
            kind: 'bitfield',
            title: 'PCIe TLP Header DWord 0 (Base Spec 5.0)',
            config: {
              registerName: 'PCIe TLP DW0',
              widthBits: 32,
              defaultHex: '0x40000004',
              presets: [
                { label: 'MWr 3DW (4DW payload)', hex: '0x40000004' },
                { label: 'MRd 3DW (4DW req)', hex: '0x00000004' },
                { label: 'CplD (Completion)', hex: '0x4A000004' },
              ],
              highlightByStep: { 0: ['Fmt', 'Type'], 1: ['TC', 'Attr'], 2: ['Length'] },
              fields: [
                { msb: 31, lsb: 29, name: 'Fmt', kind: 'control', access: 'TLP', description: '000=3DW no-data, 010=3DW w/ data, 011=4DW w/ data.' },
                { msb: 28, lsb: 24, name: 'Type', kind: 'control', access: 'TLP', description: '00000=Mem, 00100=Cfg0, 01010=Completion.' },
                { msb: 22, lsb: 20, name: 'TC', kind: 'data', access: 'TLP', description: 'Traffic Class (VC mapping 0..7).' },
                { msb: 15, lsb: 14, name: 'TD_EP', kind: 'error', access: 'TLP', description: 'TD=ECRC Digest present; EP=Poisoned Data.' },
                { msb: 13, lsb: 12, name: 'Attr', kind: 'control', access: 'TLP', description: 'Relaxed Ordering & No Snoop flags.' },
                { msb: 9, lsb: 0, name: 'Length', kind: 'data', access: 'TLP', description: 'Payload length in DWords (1..1023, 0=1024 DW).' },
              ],
            },
          },
          {
            kind: 'queue_credit',
            title: 'Posted Request Flow Control Credits (Device Buffer Dependent)',
            config: {
              queueName: 'TX Flow Control Credit Pool (Posted Header/Data)',
              fifoDepth: 8,
              maxCredits: 8,
              occupancyByStep: [1, 2, 3, 2],
              backpressureOccupancyByStep: [4, 7, 8, 8],
            },
          },
        ],
        highlightList: ['Fmt', 'Type', 'Length'],
        causalityRules: [
          { rule: 'FC Credit Gating', cause: 'Credits_Available < TLP_Requirement', effect: 'TLP held in Transaction Layer queue until UpdateFC DLLP' },
        ],
        events: [
          { step: 0, label: 'Decode Fmt/Type to determine 3DW vs 4DW & Payload', kind: 'control' },
          { step: 1, label: 'Check Traffic Class & Poisoned (EP) flags', kind: 'active' },
          { step: 2, label: 'Validate Length (10b DWord count) & credit consumption', kind: 'data' },
        ],
        playbackSteps: 3,
        ariaDescription: 'Live PCIe TLP DWord 0 hex decoder and Flow Control credit occupancy bar.',
      },
    ],
  },
];
