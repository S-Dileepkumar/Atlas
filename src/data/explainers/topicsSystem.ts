import { ExplainerTopic } from '../../engine/explainerSchema';

export const SYSTEM_EXPLAINER_TOPICS: ExplainerTopic[] = [
  {
    id: 'systolic-gemmini',
    title: 'Systolic Array Dataflow & Roofline Ceilings',
    domain: 'Accelerators',
    summary:
      'Spatial PE MAC grids (Weight-Stationary, Output-Stationary, Row-Stationary) minimizing SRAM/DRAM fetches to climb the Roofline toward peak TOP/s.',
    specVersion: 'UC Berkeley Gemmini / Eyeriss Dataflow Taxonomy',
    specDifferenceNote:
      'Gemmini defaults to parameterized Weight-Stationary (WS) or Output-Stationary (OS) Chisel systolic meshes; Google TPU v1 uses 256x256 WS, while MIT Eyeriss uses Row-Stationary (RS).',
    unverifiedOrGenericItems: [
      '4x4 array dimension shown here is scaled down for clarity (production arrays are 16x16 to 256x256, version dependent).',
      'Peak TOP/s and HBM/DDR bandwidth values in Roofline plot are illustrative architectural budgets (impl dependent).',
    ],
    sources: [
      { name: 'UC Berkeley Gemmini Generator', version: 'DAC 2021', section: 'Systolic Mesh Dataflow & Scratchpad Architecture' },
      { name: 'Williams et al. Roofline Model', version: 'CACM 2009', section: 'Arithmetic Intensity & Bandwidth Ceilings' },
    ],
    glossary: [
      { term: 'Weight-Stationary', definition: 'Filter weights stay pinned in PE registers while activations stream horizontally and partial sums accumulate vertically.' },
      { term: 'Output-Stationary', definition: 'Partial sums accumulate in-place inside each PE register while both weights and activations stream across neighbors.' },
      { term: 'Arithmetic Intensity', definition: 'Ratio of compute operations (FLOPs or MACs) performed per byte transferred from off-chip memory.' },
    ],
    relatedTopics: [
      { id: 'gpu-warp-simt', label: 'GPU SIMT Warps & Tensor Cores', reason: 'Alternative SIMD/SIMT approach to dense matrix compute' },
      { id: 'ddr5-cache-mesi', label: 'DDR5 & Coherent Mesh NoC', reason: 'Supplies off-chip weights/activations at the memory-bound slope' },
    ],
    signals: [
      { name: 'io_in_a[dim][WIDTH]', width: 'dim * 8b/16b', direction: 'Scratchpad -> Mesh Left', kind: 'data', rule: 'Skewed diagonally by 1 cycle per row so wavefronts align in MAC units.' },
      { name: 'io_in_control.dataflow', width: '1', direction: 'Controller -> PEs', kind: 'control', rule: 'Selects WS vs OS muxing inside every PE tile.' },
    ],
    programmingModel: [
      'DMA mvin tiles weights and input activations from DRAM into banked on-chip SRAM scratchpad.',
      'Controller preloads weights (WS) or clears accumulators (OS), issues compute.execute, then mvout writes final tensor.',
    ],
    verificationView: {
      checks: ['Verify diagonal input skew matches expected matrix multiply dimensions C = A * B + D across edge tiles.'],
      assertions: ['assert property (@(posedge clk) (pe_valid_i) |-> ##(2*DIM-1) mesh_done_o);'],
      coveragePoints: ['Cover 100% PE utilization back-to-back matrix tiles in both WS and OS modes.'],
      scoreboardPlacement: 'Golden FP32/INT32 GEMM software kernel validates accumulator SRAM output after mvout completion.',
    },
    commonMistakes: [
      'Omitting triangular skew buffers on activation rows — breaks systolic wavefront alignment and computes wrong inner products.',
    ],
    tryItControls: [
      {
        id: 'dataflow',
        label: 'Stationary Dataflow Policy',
        type: 'select',
        defaultValue: 'weight-stationary',
        options: [
          { label: 'Weight-Stationary (WS)', value: 'weight-stationary' },
          { label: 'Output-Stationary (OS)', value: 'output-stationary' },
          { label: 'Row-Stationary (RS)', value: 'row-stationary' },
        ],
        effectSummary: 'Reconfigures PE operand storage vs streaming axes live on the 60fps Canvas mesh.',
      },
    ],
    modeDiff: {
      modeA: 'Weight-Stationary (WS)',
      modeB: 'Output-Stationary (OS)',
      rows: [
        { dimension: 'Pinned inside PE Register', valueA: 'Filter Weights', valueB: 'Partial Sum Accumulator', impact: 'WS excels for large batch size; OS eliminates wide partial-sum routing.' },
        { dimension: 'Streaming East (->)', valueA: 'Activations', valueB: 'Activations', impact: 'Reuse activations across horizontal PE rows.' },
        { dimension: 'Streaming South (v)', valueA: 'Partial Sums', valueB: 'Weights', impact: 'OS moves narrow weights instead of wide 32-bit accumulators.' },
      ],
    },
    selfCheck: [
      {
        id: 'sys-q1',
        question: 'Why are input activations staggered by 1 cycle per row entering the left side of a systolic array?',
        options: ['To reduce clock frequency', 'So activations arrive in lockstep with cascading partial sums/weights inside each PE', 'To skip SRAM reads'],
        correctIndex: 1,
        explanation: 'Diagonal wavefront skewing guarantees A[i,k] meets B[k,j] at PE(i,j) on the exact same cycle.',
      },
      {
        id: 'sys-q2',
        question: 'In Weight-Stationary mode, what flows downward from PE(r,c) to PE(r+1,c)?',
        options: ['New weights every cycle', 'Accumulating partial sums (psums)', 'Interrupt requests'],
        correctIndex: 1,
        explanation: 'Weights stay stationary inside each PE while partial sums cascade vertically.',
      },
      {
        id: 'sys-q3',
        question: 'What moves a workload rightward onto the flat Compute Ceiling on a Roofline chart?',
        options: ['Increasing Arithmetic Intensity (tiling/reuse in on-chip SRAM)', 'Lowering clock speed', 'Disabling caches'],
        correctIndex: 0,
        explanation: 'Greater data reuse inside SRAM raises Operations/Byte past the Ridge Point.',
      },
    ],
    scenes: [
      {
        id: 'systolic-canvas-roofline',
        title: '4x4 Systolic Wavefront & Roofline Positioning',
        text: {
          overview: 'Activations enter from the left with diagonal timing skew, multiply against weights inside PEs, and climb the Roofline via SRAM data reuse.',
          detail: 'Switch between Weight-Stationary, Output-Stationary, and Row-Stationary above to inspect what stays inside PE registers vs what streams.',
          expert: 'Because only nearest-neighbor wires exist between PEs, wire delay stays short regardless of array scale, permitting >1 GHz clock closure.',
        },
        renderers: [
          {
            kind: 'systolic_array',
            title: '60fps Systolic MAC PE Grid (Switchable Dataflow Policy)',
            config: { gridDim: 4, defaultMode: 'weight-stationary' },
          },
          {
            kind: 'roofline',
            title: 'Accelerator Roofline Model (Memory Slope vs Compute Ceiling)',
            config: {
              peakCompute: 64,
              memBandwidthGBs: 128,
              points: [
                { label: 'Un-tiled GEMV', ai: 2, perf: 0.25, step: 0 },
                { label: 'Naive Conv', ai: 32, perf: 4, step: 2 },
                { label: 'Tiled Scratchpad GEMM', ai: 1024, perf: 60, step: 5 },
              ],
            },
          },
        ],
        highlightList: ['PE00..PE33', 'Ridge Point'],
        causalityRules: [
          { rule: 'Systolic Wavefront', cause: 'Cycle C_k reaches PE(r,c) where r+c == k', effect: 'MAC accumulates A*B without external bus fetch' },
        ],
        events: [
          { step: 0, label: 'PE(0,0) fires first diagonal wavefront (Un-tiled Memory Bound baseline)', kind: 'data' },
          { step: 2, label: 'Diagonal wavefront expands across 3 active PEs', kind: 'active' },
          { step: 5, label: 'Full array saturated; Tiled GEMM reaches Compute Ceiling', kind: 'control' },
        ],
        playbackSteps: 7,
        ariaDescription: 'Animated 4x4 systolic array canvas synchronized with a Roofline log-log performance ceiling chart.',
      },
    ],
  },

  {
    id: 'soc-fabric-memory-walk',
    title: 'SoC Address Map, Page Walk & UPF Power Domains',
    domain: 'SoCs',
    summary:
      'Physical address decoding across BootROM, SRAM, Peripherals, and DRAM combined with Sv32 virtual-to-physical translation and UPF isolation/power gating.',
    specVersion: 'RISC-V Sv32 Privileged Spec + IEEE 1801 UPF Power Format',
    specDifferenceNote:
      'Sv32 uses a 2-level page table (10b VPN[1] + 10b VPN[0] + 12b offset) on RV32, whereas Sv39/Sv48 expand to 3/4 levels on RV64.',
    unverifiedOrGenericItems: [
      'Specific SoC peripheral hex bases (0x4001_0000 HMAC, 0x8000_0000 DRAM) represent a standard OpenTitan/RISC-V-style map (SoC-dependent).',
      'UPF isolation clamp values (0 vs 1) and retention flop strategies are synthesis-library/SoC-dependent.',
    ],
    sources: [
      { name: 'RISC-V Privileged Architecture Spec', version: 'v20211203', section: 'Section 4.3 — Sv32 Page-Based 32-bit Virtual Memory' },
      { name: 'IEEE 1801 UPF Standard', version: 'UPF 3.0', section: 'Power Domains, Isolation & Retention Cells' },
    ],
    glossary: [
      { term: 'UPF Isolation Cell', definition: 'Hardware clamp gate placed at power-domain boundaries so powered-down blocks do not inject X/floating values into always-on logic.' },
      { term: 'DECERR', definition: 'Bus decode error returned by crossbar when no slave aperture matches the probed physical address.' },
    ],
    relatedTopics: [
      { id: 'opentitan-hmac', label: 'OpenTitan HMAC IP', reason: 'Targeted by peripheral aperture 0x4001_0000..0x4001_0FFF' },
      { id: 'axi4-handshakes', label: 'AXI4 Handshakes', reason: 'Carries decoded physical transactions to target slaves' },
    ],
    signals: [
      { name: 'paddr[31:0]', width: '32', direction: 'MMU -> Crossbar Decoder', kind: 'data', rule: 'Compared against slave base/mask ranges.' },
      { name: 'iso_en_n', width: '1', direction: 'PMU -> UPF Clamp', kind: 'error', rule: 'Must assert BEFORE power switch cuts VDD to powered-down island.' },
    ],
    programmingModel: [
      'BootROM runs at reset from 0x0000_1000, verifies Flash signature, initializes DRAM & PMU domains, then jumps to OS kernel.',
      'OS programs SATP CSR with root page table PPN to activate MMU address translation.',
    ],
    verificationView: {
      checks: ['Power-aware (UPF) simulation verifies isolation clamps fire strictly prior to power switch off and release after reset settles.'],
      assertions: ['assert property (@(posedge clk_aon) $fell(pwr_switch_en) |-> $past(iso_en == 1));'],
      coveragePoints: ['Hit every SoC address window plus at least 3 unmapped DECERR holes.'],
      scoreboardPlacement: 'Memory map decoder verifies bus router port index matches address table.',
    },
    commonMistakes: [
      'Cutting power switch before asserting UPF isolation enable — propagates X corruption across entire always-on fabric.',
    ],
    tryItControls: [],
    selfCheck: [
      {
        id: 'soc-q1',
        question: 'In a UPF power-down sequence, what must occur BEFORE the power switch disconnects VDD from an IP island?',
        options: ['Release reset', 'Assert clock gating and isolation clamps', 'Start DMA bursts'],
        correctIndex: 1,
        explanation: 'Clock gate and isolation clamps must engage before power drops so downstream AON receivers never sample floating X rails.',
      },
      {
        id: 'soc-q2',
        question: 'What happens if a CPU master issues a read to an address outside all crossbar apertures?',
        options: ['Hardware silently loops forever', 'Crossbar default slave returns DECERR bus fault', 'Data returns 0xFFFFFFFF without status'],
        correctIndex: 1,
        explanation: 'A compliant interconnect routes unmapped addresses to a default responder that returns DECERR cleanly without hanging.',
      },
      {
        id: 'soc-q3',
        question: 'In RISC-V Sv32, how many page-table levels are walked on a TLB miss?',
        options: ['2 levels (L1 superpage + L0 4KB page)', '4 levels', '1 flat array'],
        correctIndex: 0,
        explanation: 'Sv32 divides the 20-bit Virtual Page Number into two 10-bit indices (VPN[1], VPN[0]).',
      },
    ],
    scenes: [
      {
        id: 'soc-decode-upf',
        title: 'Interactive Address Map, MMU Walk & UPF/Clock/Reset Overlays',
        text: {
          overview: 'Probe hex addresses to watch crossbar aperture decoding and inspect Clock, Reset, and UPF Power overlays across the SoC floorplan.',
          detail: 'Notice how AI Accelerator Island enters ISOLATED / POWER-GATED state on steps T2–T3 under UPF control while AON & BootROM remain powered.',
          expert: 'Crossbar decodes top address bits combinatorially in 0–1 cycle; TLB misses trigger hardware page-table walker (PTW) before issuing DRAM AXI reads.',
        },
        renderers: [
          {
            kind: 'memory_map',
            title: 'SoC Physical Address Decoder & Sv32 Page Walk',
            config: {
              defaultAddrHex: '0x40010010',
              addrPresets: ['0x00001080', '0x40010010', '0x80004000', '0xDEAD0000'],
              regions: [
                { name: 'BootROM (Secure)', startHex: '0x0000_0000', endHex: '0x0000_7FFF', startNum: 0x00000000, endNum: 0x00007fff, target: 'ROM_CTRL', permissions: 'RX', kind: 'control' },
                { name: 'Main SRAM', startHex: '0x1000_0000', endHex: '0x1003_FFFF', startNum: 0x10000000, endNum: 0x1003ffff, target: 'SRAM_BANK0', permissions: 'RWX', kind: 'data' },
                { name: 'OpenTitan HMAC CSR', startHex: '0x4001_0000', endHex: '0x4001_0FFF', startNum: 0x40010000, endNum: 0x40010fff, target: 'TL_UL_HMAC', permissions: 'RW', kind: 'control' },
                { name: 'External DRAM', startHex: '0x8000_0000', endHex: '0x9FFF_FFFF', startNum: 0x80000000, endNum: 0x9fffffff, target: 'DDR5_CTRL', permissions: 'RWX', kind: 'data' },
              ],
              pageWalk: [
                { step: 0, level: 'TLB Lookup', indexBits: 'VA[31:12] Tag Match', pteFlags: 'Hit / Miss', note: 'Checks 4KB/4MB TLB; miss launches PTW.' },
                { step: 1, level: 'L1 Directory', indexBits: 'SATP.PPN + VA[31:22]', pteFlags: 'V=1, R/W/X=0', note: 'Non-leaf pointer yields L0 table PPN.' },
                { step: 2, level: 'L0 Leaf PTE', indexBits: 'L1.PPN + VA[21:12]', pteFlags: 'V=1, R=1, U=1', note: 'Combines Leaf.PPN + VA[11:0] -> PA.' },
              ],
            },
          },
          {
            kind: 'hierarchy_floorplan',
            title: 'SoC Floorplan Domain Overlays (Power / Clock / Reset)',
            config: {
              blocks: [
                { id: 'aon', label: 'AON PMU & Reset Ctrl', x: 24, y: 40, w: 195, h: 82, clockDomain: 'clk_32k_aon', resetDomain: 'POR_rst_n', powerDomain: 'PD_AON (Always-On)' },
                { id: 'cpu', label: 'RV32/64 CPU Cluster', x: 238, y: 40, w: 205, h: 82, clockDomain: 'clk_1GHz_fast', resetDomain: 'sys_rst_n', powerDomain: 'PD_CPU (Switchable)', gatedOnSteps: [3] },
                { id: 'hmac', label: 'Crypto / HMAC Island', x: 462, y: 40, w: 192, h: 82, clockDomain: 'clk_250M_periph', resetDomain: 'periph_rst_n', powerDomain: 'PD_SEC (Always-On)' },
                { id: 'ai', label: 'AI Systolic NPU Island', x: 24, y: 138, w: 300, h: 78, clockDomain: 'clk_1GHz_fast', resetDomain: 'npu_rst_n', powerDomain: 'PD_AI (Power-Gated)', gatedOnSteps: [1, 2] },
                { id: 'noc', label: 'Coherent Crossbar / DDR PHY', x: 344, y: 138, w: 310, h: 78, clockDomain: 'clk_500M_noc', resetDomain: 'sys_rst_n', powerDomain: 'PD_SOC_MEM (Retention)' },
              ],
            },
          },
        ],
        highlightList: ['PD_AI Power Gate', 'Crossbar Decode'],
        causalityRules: [
          { rule: 'UPF Ordering', cause: 'iso_en=1 before pwr_off', effect: 'Prevents X propagation onto PD_SOC_MEM bus' },
        ],
        events: [
          { step: 0, label: 'System active; TLB lookup / Decode running across PD_AI', kind: 'control' },
          { step: 1, label: 'PMU asserts iso_en & gates AI NPU island (PD_AI OFF)', kind: 'error' },
          { step: 2, label: 'L0 PTE resolves physical address while PD_AI stays isolated', kind: 'data' },
          { step: 3, label: 'CPU cluster enters brief WFI clock/power gate', kind: 'active' },
        ],
        playbackSteps: 4,
        ariaDescription: 'Interactive SoC address map probe with Sv32 page walk and switchable Power/Clock/Reset floorplan overlays.',
      },
    ],
  },

  {
    id: 'gpu-warp-simt',
    title: 'GPU SIMT Warp Scheduling & Divergence Masking',
    domain: 'GPUs',
    summary:
      'Hardware multithreaded Streaming Multiprocessor (SM) hiding DRAM latency via zero-overhead warp context switching and active-thread execution masks.',
    specVersion: 'Vortex RISC-V GPGPU / NVIDIA SIMT Execution Model',
    specDifferenceNote:
      'Warp/wavefront width differs by vendor (Vortex 4–32 threads configurable, NVIDIA 32 threads, AMD RDNA 32/64 threads). Independent thread scheduling appeared in Volta+.',
    unverifiedOrGenericItems: [
      'Warp size shown as 32-bit Thread Active Mask (tmask) is Vortex/NVIDIA-style (vendor/version dependent).',
      'Scoreboard & Register File bank numbers vary across SM generations.',
    ],
    sources: [
      { name: 'Vortex Open-Source GPGPU RTL', version: 'v2.x', section: 'hw/rtl/core/VX_schedule.sv & VX_scoreboard.sv' },
    ],
    glossary: [
      { term: 'Warp / Wavefront', definition: 'Group of lockstep threads executing the same PC with per-thread active execution mask (tmask).' },
      { term: 'SIMT Divergence', definition: 'When an if/else branch evaluates true for some threads and false for others, forcing serialized masked execution until reconvergence.' },
    ],
    relatedTopics: [
      { id: 'riscv-5stage-pipeline', label: 'RISC-V 5-Stage Pipeline', reason: 'Single-thread CPU pipeline contrasted against SIMT warp hiding' },
      { id: 'systolic-gemmini', label: 'Systolic Array', reason: 'Matrix-core companion inside modern GPUs' },
    ],
    signals: [
      { name: 'tmask[NUM_THREADS-1:0]', width: '32 (impl)', direction: 'SIMT Stack -> Lanes', kind: 'control', rule: 'Bit i=1 enables lane i writeback & memory access.' },
      { name: 'scoreboard_ready', width: '1', direction: 'Scoreboard -> Scheduler', kind: 'data', rule: 'Only unblocked warps are eligible for round-robin / GTO issue.' },
    ],
    programmingModel: [
      'Kernels launch thousands of threads grouped into Warps; long-latency LD stalls Warp 0 so Scheduler switches to ready Warp 1 immediately.',
    ],
    verificationView: {
      checks: ['Verify SIMT IPDOM stack reconverges diverged thread masks symmetrically upon branch join PC.'],
      assertions: ['assert property (@(posedge clk) (issue_valid) |-> |(issue_tmask));'],
      coveragePoints: ['All-1 mask, half-divergent mask, nested if-else divergence, and zero-stall warp rotation.'],
      scoreboardPlacement: 'Per-thread register/memory trace compares lane outputs against CPU sequential reference.',
    },
    commonMistakes: [
      'Failing to mask memory fault/exceptions on inactive lanes (`tmask[i] == 0`) inside diverged branches.',
    ],
    tryItControls: [],
    selfCheck: [
      {
        id: 'gpu-q1',
        question: 'How does a GPU hide 300+ cycle DRAM latency without huge out-of-order reorder buffers?',
        options: ['By stalling the whole chip', 'By zero-overhead switching to another ready Warp on every cycle', 'By lowering warp size to 1'],
        correctIndex: 1,
        explanation: 'Large partitioned register files keep dozens of warps resident simultaneously for instant cycle-by-cycle scheduling.',
      },
      {
        id: 'gpu-q2',
        question: 'What happens to lane efficiency during a 50/50 divergent branch?',
        options: ['Drops to 50% as taken and fall-through paths execute serially', 'Doubles throughput', 'Causes hardware reset'],
        correctIndex: 0,
        explanation: 'Both paths must execute sequentially with half of tmask disabled until reconvergence.',
      },
      {
        id: 'gpu-q3',
        question: 'What prevents masked-off threads in a warp from corrupting registers or global memory?',
        options: ['tmask predicate bits gating write-enables per lane', 'External PCIe reset', 'ECC scrubbing'],
        correctIndex: 0,
        explanation: 'Every lane writeback and LSU byte-enable is gated by its corresponding tmask bit.',
      },
    ],
    scenes: [
      {
        id: 'gpu-warp-switch',
        title: 'Zero-Overhead Warp Rotation & tmask Divergence',
        text: {
          overview: 'When Warp 0 waits on a long global load, the Warp Scheduler dispatches ready Warp 1 on the very next cycle to keep ALUs busy.',
          detail: 'Inspect the Scoreboard queue depth and decode the 32-bit Thread Execution Mask (tmask) representing active SIMT lanes.',
          expert: 'Vortex VX_schedule.sv maintains warp PCs and IPDOM split/join stacks, gating WB/LSU strobes via tmask.',
        },
        renderers: [
          {
            kind: 'pipeline',
            title: 'Interleaved Multi-Warp Execution Timeline',
            config: {
              scenarios: {
                default: {
                  rows: [
                    { pc: 'W0:0x00', insn: 'LD.GLOBAL (long miss)', stages: ['IF', 'ID', 'EX', 'STALL', 'STALL', 'STALL', 'WB'] },
                    { pc: 'W1:0x00', insn: 'FMA (hide latency)', stages: ['-', 'IF', 'ID', 'EX', 'WB', '-', '-'] },
                    { pc: 'W2:0x00', insn: 'FMA (hide latency)', stages: ['-', '-', 'IF', 'ID', 'EX', 'WB', '-'] },
                  ],
                  forwards: [
                    { cycle: 3, fromRow: 0, toRow: 1, label: 'Switch W0->W1', kind: 'data' },
                  ],
                },
              },
            },
          },
          {
            kind: 'bitfield',
            title: '32-Thread Warp Execution Mask (tmask Interactive Word)',
            config: {
              registerName: 'SIMT Active Thread Mask (tmask[31:0])',
              widthBits: 32,
              defaultHex: '0x0000FFFF',
              presets: [
                { label: 'All 32 Active', hex: '0xFFFFFFFF' },
                { label: '50% Diverged', hex: '0x0000FFFF' },
                { label: 'Single Lane', hex: '0x00000001' },
              ],
              highlightByStep: { 1: ['Lanes_15_0'], 3: ['Lanes_31_16'] },
              fields: [
                { msb: 31, lsb: 16, name: 'Lanes_31_16', kind: 'error', access: 'SIMT', description: 'Upper 16 warp lanes (masked off when 0).' },
                { msb: 15, lsb: 0, name: 'Lanes_15_0', kind: 'data', access: 'SIMT', description: 'Lower 16 warp lanes actively committing.' },
              ],
            },
          },
        ],
        highlightList: ['tmask', 'Warp Switch'],
        causalityRules: [
          { rule: 'Warp Issue Policy', cause: 'Warp 0 blocked on scoreboard load dependency', effect: 'Scheduler rotates to ready Warp 1 with zero pipeline bubble' },
        ],
        events: [
          { step: 1, label: 'Warp 0 issues global load -> scoreboard marks dependency', kind: 'error' },
          { step: 3, label: 'Scheduler issues Warp 1 while Warp 0 waits cleanly', kind: 'data' },
        ],
        playbackSteps: 7,
        ariaDescription: 'Multi-warp GPU pipeline timeline and interactive 32-thread tmask bitfield decoder.',
      },
    ],
  },

  {
    id: 'ddr5-cache-mesi',
    title: 'Cache Coherence (MESI), 2D NoC Mesh & DDR5 Timing',
    domain: 'Interconnect',
    summary:
      'End-to-end coherent memory path: L1 MESI state transitions, 2D XY-routed NoC virtual-channel flits, and DRAM row ACT/RD/PRE bank timing.',
    specVersion: 'JEDEC JESD79-5 DDR5 + Standard MESI Coherence',
    specDifferenceNote:
      'DDR5 splits each DIMM into two independent 32-bit sub-channels (vs single 64-bit DDR4) and boosts Bank Groups; CHI/TileLink/ACE implement directory or snooping coherence.',
    unverifiedOrGenericItems: [
      'NoC mesh dimension (3x3 shown), VC count (2 VCs), and link credits (4) are illustrative interconnect parameters (SoC dependent).',
      'Exact tRCD / CL / tRP cycles depend on DDR5 speed grade (e.g. DDR5-4800 vs DDR5-6400).',
    ],
    sources: [
      { name: 'JEDEC JESD79-5B DDR5 SDRAM', version: '2022', section: 'Command Truth Table & Row Activation Timing (tRCD/CL/tRP)' },
      { name: 'Sorin et al. Primer on Memory Consistency & Cache Coherence', version: '2nd Ed', section: 'Directory-Based MESI Protocol' },
    ],
    glossary: [
      { term: 'MESI', definition: 'Cache coherence states: Modified (dirty/exclusive), Exclusive (clean/only copy), Shared (clean/multiple copies), Invalid.' },
      { term: 'tRCD / CL', definition: 'RAS-to-CAS delay between Row Activate (ACT) and Column Read (RD), followed by CAS Latency (CL) until DQ data emerges.' },
      { term: 'DOR XY Routing', definition: 'Dimension-Order Routing: NoC packet travels horizontally along X first, then turns vertically along Y — deadlock-free.' },
    ],
    relatedTopics: [
      { id: 'riscv-5stage-pipeline', label: 'RISC-V Pipeline', reason: 'MEM stage load/store hits L1 cache here' },
      { id: 'systolic-gemmini', label: 'Systolic Array', reason: 'Shares NoC and DDR5 memory bandwidth ceiling' },
    ],
    signals: [
      { name: 'CMD[CA]', width: 'CA bus', direction: 'DDR Ctrl -> DRAM', kind: 'control', rule: 'Issues ACT (open row), RD (column burst), or PRE (close row).' },
      { name: 'noc_flit_valid', width: '1', direction: 'Router -> Router', kind: 'data', rule: 'Consumes 1 VC credit upon injection into next XY router hop.' },
    ],
    programmingModel: [
      'Cache coherence hardware maintains Single-Writer / Multiple-Reader invariant automatically across cores; DMA devices require IOMMU/coherency config.',
    ],
    verificationView: {
      checks: ['NoC credit leak check ensures total credits returned == total flits consumed after quiescent drain.'],
      assertions: ['assert property (@(posedge dram_clk) (cmd == ACT) |-> ##[tRCD:$] (cmd == RD));'],
      coveragePoints: ['Cover Core0->Core1 Read-to-Modified intervention, XY corner turns, and DDR5 page miss (PRE+ACT+RD).'],
      scoreboardPlacement: 'Coherence checker verifies Single-Writer Multiple-Reader (SWMR) invariant on every cacheline cycle.',
    },
    commonMistakes: [
      'Assuming DRAM access is always constant latency — Row Buffer Conflict adds tRP (Precharge) + tRCD (Activate) penalty before CL.',
    ],
    tryItControls: [
      {
        id: 'backpressure',
        label: 'NoC Hotspot Congestion',
        type: 'toggle',
        defaultValue: false,
        effectSummary: 'Drains VC credits along Row 0 / Col 2 in the 2D Mesh NoC to highlight congestion heatmap links.',
      },
    ],
    selfCheck: [
      {
        id: 'mem-q1',
        question: 'If Core 0 holds Line 0x4000 in Modified (M) state and Core 1 attempts a Load, what must happen first?',
        options: ['Core 1 reads stale DRAM directly', 'Directory snoops/downgrades Core 0 (M -> S) and forwards clean data', 'Line stays Invalid'],
        correctIndex: 1,
        explanation: 'Only Core 0 has the latest modified data; coherence downgrades Core 0 to Shared (or writes back) so Core 1 receives the updated value.',
      },
      {
        id: 'mem-q2',
        question: 'Why does Dimension-Order XY routing prevent routing deadlocks in a 2D mesh without escape VCs?',
        options: ['Because turns from Y->X are forbidden, eliminating cyclic channel dependency loops', 'Because it drops congested packets', 'Because all routers share 1 wire'],
        correctIndex: 0,
        explanation: 'Forbidding Y-to-X turns breaks circular wait cycles in the channel dependency graph.',
      },
      {
        id: 'mem-q3',
        question: 'In a DRAM bank with an open wrong row (Row Buffer Conflict), what command sequence occurs?',
        options: ['RD immediately', 'PRE (precharge old row) -> ACT (open target row) -> RD (column read)', 'Only REFRESH'],
        correctIndex: 1,
        explanation: 'Sense amplifiers must precharge the active row back to bitlines before activating the new row.',
      },
    ],
    scenes: [
      {
        id: 'mesi-noc-ddr5',
        title: 'MESI State Machine, 2D Mesh Routing & DDR5 Row-Miss Waveform',
        text: {
          overview: 'Follow a cache miss from Core 1 through MESI snoop intervention, across XY-routed NoC routers, down to a DDR5 bank PRE -> ACT -> RD sequence.',
          detail: 'Toggle "NoC Hotspot Congestion" to watch Virtual Channel credits drop to 0 and link heatmap edges highlight red.',
          expert: 'Note how separate Request and Response Virtual Channels (VC0/VC1) prevent protocol-level fetch/snoop deadlocks inside shared meshes.',
        },
        renderers: [
          {
            kind: 'cache_coherence',
            title: 'MESI Coherence State Tracker (Cacheline 0x4000)',
            config: {
              timeline: [
                { step: 0, core0State: 'I (Invalid)', core1State: 'I (Invalid)', llcState: 'DRAM Clean', eventLabel: 'Initial cold cache state', kind: 'control' },
                { step: 1, core0State: 'M (Modified)', core1State: 'I (Invalid)', llcState: 'Owned by Core 0', eventLabel: 'Core 0 stores new value (ReadUnique / RFO)', kind: 'error' },
                { step: 2, core0State: 'S (Shared)', core1State: 'S (Shared)', llcState: 'Updated in LLC', eventLabel: 'Core 1 Read Miss snoops Core 0 -> downgrades M to S', kind: 'data' },
                { step: 3, core0State: 'I (Invalid)', core1State: 'M (Modified)', llcState: 'Owned by Core 1', eventLabel: 'Core 1 upgrades S -> M (invalidates Core 0)', kind: 'active' },
                { step: 4, core0State: 'I (Invalid)', core1State: 'I (Invalid)', llcState: 'Writeback to DDR5', eventLabel: 'Eviction triggers DDR5 writeback', kind: 'control' },
              ],
            },
          },
          {
            kind: 'noc_mesh',
            title: '60fps 3x3 2D Mesh NoC (XY Routing, VC Credits & Heatmap)',
            config: { rows: 3, cols: 3 },
          },
          {
            kind: 'waveform',
            title: 'DDR5 Bank Command Timing (Row Conflict: PRE -> tRP -> ACT -> tRCD -> RD)',
            config: {
              signals: [
                { name: 'DDR_CMD', kind: 'control', values: ['PRE', 'NOP', 'ACT', 'NOP', 'RD', 'NOP', 'NOP'] },
                { name: 'DQ_DATA', kind: 'data', values: ['Z', 'Z', 'Z', 'Z', 'Z', 'BL0..7', 'BL8..15'] },
                { name: 'ROW_STATE', kind: 'error', values: ['CLOSE', 'tRP', 'OPEN', 'tRCD', 'COL_RD', 'BURST', 'IDLE'] },
              ],
            },
          },
        ],
        highlightList: ['MESI M->S', 'VC Credits', 'tRP/tRCD'],
        causalityRules: [
          { rule: 'SWMR Invariant', cause: 'Core 1 requests Write Ownership', effect: 'All peer copies invalidated before Core 1 enters M' },
        ],
        events: [
          { step: 0, label: 'Cold start; PRE closes prior DDR5 bank row', kind: 'control' },
          { step: 1, label: 'Core 0 modifies line (M); NoC carries snoop traffic', kind: 'active' },
          { step: 2, label: 'Core 1 reads via snoop -> M transitions to S on both cores', kind: 'data' },
          { step: 3, label: 'Core 1 invalidates Core 0 -> Core 1 enters M', kind: 'active' },
          { step: 4, label: 'DDR5 RD bursts data after tRCD/CL delay', kind: 'data' },
        ],
        playbackSteps: 6,
        ariaDescription: 'Synchronized MESI cache coherence states, 60fps 3x3 NoC mesh canvas with VC credits, and DDR5 bank timing waveform.',
      },
    ],
  },
  {
    id: 'ddr5-bank-refresh',
    title: 'DRAM Bank State Machine, Row Buffers & Refresh (tREFI / tRFC)',
    domain: 'Memory',
    summary:
      'Internal DRAM array lifecycle showing destructive read restore, Same-Bank vs All-Bank Refresh (REFsb vs REFpb/REFab), and closed-page vs open-page row buffer policies.',
    specVersion: 'JEDEC JESD79-5 DDR5 SDRAM & DFI 5.0 Controller Interface',
    specDifferenceNote:
      'DDR5 introduces Same-Bank Refresh (REFsb) so one bank per Bank Group refreshes while peer Bank Groups continue servicing reads/writes, reducing refresh stall impact vs DDR4.',
    unverifiedOrGenericItems: [
      'tRFC / tREFI microsecond timings depend on DRAM density (16Gb vs 24Gb vs 32Gb) and temperature grade (Normal 0–85C vs Extended >85C, version dependent).',
      'Controller page policy (open-page vs closed-page vs adaptive timeout) is SoC memory-controller dependent.',
    ],
    sources: [
      { name: 'JEDEC JESD79-5B', version: '2022', section: 'Bank State Diagram & Same-Bank Refresh (REFsb)' },
      { name: 'DFI Group Specification', version: 'DFI 5.0', section: 'dfi_address / dfi_dram_clk / PHY Training Handshake' },
    ],
    glossary: [
      { term: 'Sense Amplifier (Row Buffer)', definition: 'Volatile latch array holding one open DRAM row per bank after ACTIVATE; enables fast column hits at tCCD_S.' },
      { term: 'REFsb', definition: 'Same-Bank Refresh in DDR5 refreshing a targeted bank across Bank Groups without blocking non-refreshing banks.' },
    ],
    relatedTopics: [
      { id: 'ddr5-cache-mesi', label: 'Cache Coherence & NoC Mesh', reason: 'LLC misses generate read/write transactions to this DRAM controller' },
      { id: 'axi4-handshakes', label: 'AXI4 Handshakes', reason: 'Frontend AXI4 ports enqueue requests into scheduler bank queues' },
    ],
    signals: [
      { name: 'CS_n / CA[13:0]', width: '1 + 14', direction: 'MC -> DDR5 DRAM', kind: 'control', rule: 'DDR5 multiplexes commands across rising/falling edges on CA bus.' },
      { name: 'DQS_t / DQS_c', width: 'Diff Strobe', direction: 'Bidirectional PHY', kind: 'data', rule: 'Source-synchronous data strobe centered inside DQ eye during BL16 burst.' },
    ],
    programmingModel: [
      'Boot firmware runs ZQ calibration, Read/Write DQ leveling, and Command/Address Training before handing off to OS.',
    ],
    verificationView: {
      checks: ['Verify tFAW (Four Activate Window) and tRRD_L/S bank-group turnaround timing constraints never violate JEDEC minimum cycles.'],
      assertions: ['assert property (@(posedge dfi_clk) (cmd == PRE) |-> ##[tRP:$] (cmd == ACT || cmd == REF));'],
      coveragePoints: ['Cover Row Hit, Row Empty, Row Conflict, and REFsb concurrent other-bank read.'],
      scoreboardPlacement: 'Memory controller timing checker monitors DFI command bus and flags any JEDEC timing violation.',
    },
    commonMistakes: [
      'Scheduling consecutive ACT commands to the same Bank Group violating tRRD_L instead of alternating Bank Groups (tRRD_S).',
    ],
    tryItControls: [
      {
        id: 'injectError',
        label: 'Force Row Buffer Conflict',
        type: 'toggle',
        defaultValue: false,
        effectSummary: 'Routes bank FSM through Precharge (PRE) -> tRP before Activate (ACT).',
      },
    ],
    selfCheck: [
      {
        id: 'dram-q1',
        question: 'Why must a DRAM array Precharge (PRE) write back Sense Amplifier data before activating a different row in the same bank?',
        options: ['DRAM capacitor cell read is destructive; Sense Amp holds the only live restored copy', 'Because sense amps cannot hold odd addresses', 'To reset PCIe link'],
        correctIndex: 0,
        explanation: 'Reading a 1T1C DRAM cell drains its capacitor onto the bitline; PRE restores the boosted voltage back into the row and equalizes bitlines.',
      },
      {
        id: 'dram-q2',
        question: 'How does alternating accesses across DIFFERENT DDR5 Bank Groups improve bandwidth?',
        options: ['Allows shorter tRRD_S / tCCD_S intervals instead of longer same-bank-group tRRD_L / tCCD_L', 'Eliminates clock signals', 'Removes ECC'],
        correctIndex: 0,
        explanation: 'Shared internal I/O gating inside one Bank Group imposes _L penalty; different groups operate with _S minimum spacing.',
      },
      {
        id: 'dram-q3',
        question: 'What is the purpose of DFI 5.0 in a DDR5 subsystem?',
        options: ['Standardizes signaling interface between Memory Controller and DDR PHY', 'Replaces software OS kernels', 'Routes NoC cache probes'],
        correctIndex: 0,
        explanation: 'DFI decouples protocol/scheduling logic in the Memory Controller from analog/SerDes calibration in the DDR PHY.',
      },
    ],
    scenes: [
      {
        id: 'dram-fsm-wave',
        title: 'Bank Lifecycle FSM & Precharge/Activate/Refresh Timing',
        text: {
          overview: 'A DRAM bank cycles between Idle (Precharged), Row Active (Sense Amps loaded), Column Read/Write, and Refresh states.',
          detail: 'Compare clean Row Hit reads vs Row Conflict cycles requiring PRE (tRP) -> ACT (tRCD) -> RD (CL) recovery.',
          expert: 'Controller arbitrates FR-FCFS (First-Ready First-Come-First-Served) to drain open row hits before issuing Precharge for conflicting rows.',
        },
        renderers: [
          {
            kind: 'fsm',
            title: 'Single DRAM Bank State Machine',
            config: {
              width: 680,
              height: 220,
              states: [
                { id: 'IDLE', label: 'IDLE/PRE', x: 100, y: 110 },
                { id: 'ACTIVE', label: 'ROW_ACT', x: 320, y: 70 },
                { id: 'BURST', label: 'RD/WR', x: 540, y: 110 },
                { id: 'ERROR', label: 'PRE_WAIT', x: 320, y: 175, kind: 'error' },
              ],
              transitions: [
                { from: 'IDLE', to: 'ACTIVE', guard: 'ACT (tRCD)', stepTrigger: 1 },
                { from: 'ACTIVE', to: 'BURST', guard: 'RD / WR (CL)', stepTrigger: 2 },
                { from: 'BURST', to: 'IDLE', guard: 'PRE (tRP)', stepTrigger: 3 },
                { from: 'IDLE', to: 'ACTIVE', guard: 'REFsb / tRFC', stepTrigger: 4 },
              ],
              activeStateByStep: ['IDLE', 'ACTIVE', 'BURST', 'IDLE', 'ACTIVE'],
            },
          },
          {
            kind: 'waveform',
            title: 'DFI -> DDR5 CA & DQ Timing',
            config: {
              signals: [
                { name: 'dfi_cmd', kind: 'control', values: ['NOP', 'ACT', 'RD', 'NOP', 'PRE', 'ACT'] },
                { name: 'dq_eye', kind: 'data', values: ['Z', 'tRCD', 'CL', 'BL0..15', 'tRP', 'tRCD'] },
                { name: 'bank_open', kind: 'control', values: ['0', '1', '1', '1', '0', '1'] },
              ],
            },
          },
        ],
        highlightList: ['ACT (tRCD)', 'PRE (tRP)', 'BL0..15'],
        causalityRules: [
          { rule: 'Destructive Read Restore', cause: 'Row Conflict triggers PRE', effect: 'Must wait tRP before issuing next ACT to same bank' },
        ],
        events: [
          { step: 0, label: 'Bank precharged and idle; ready for ACT or REF', kind: 'control' },
          { step: 1, label: 'ACT opens target row into Sense Amplifiers (tRCD)', kind: 'data' },
          { step: 2, label: 'RD bursts BL16 payload across DQS strobe after CL', kind: 'active' },
          { step: 3, label: 'PRE writes back sense amps and closes row (tRP)', kind: 'control' },
        ],
        playbackSteps: 5,
        ariaDescription: 'DRAM bank FSM and DDR5 Precharge-Activate-Read timing diagram.',
      },
    ],
  },
];

