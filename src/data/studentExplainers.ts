import { IpEntity, SocEntity } from '../types/ipUniverse';
import { ProtocolDocument } from '../types/protocol';

export interface StudentExplainerData {
  analogyTitle: string;
  everydayAnalogy: string;
  threeStepFlow: string[];
  keyTakeaway: string;
}

export interface OfficialExternalLink {
  label: string;
  authority: string;
  url: string;
}

export function explainSignalLikeStudent(
  signalName: string,
  direction?: string,
  width?: string,
  fallbackSummary?: string
): string {
  const s = signalName.toLowerCase();
  const dir = direction ? direction.toLowerCase() : '';

  if (s === 'clk' || s.startsWith('clk_') || s.endsWith('_clk') || s.includes('aclk') || s.includes('pclk') || s.includes('sclk') || s.includes('tck')) {
    return 'The heartbeat/metronome wire: every flip-flop waits for a rising tick (0 -> 1) on this clock wire before capturing new data.';
  }
  if (s.includes('rst') || s.includes('reset')) {
    return 'The clean-slate reset button: holds all registers and state machines at their safe starting zero values when power turns on.';
  }
  if (s.endsWith('valid') || s === 'valid') {
    return 'Sender flag ("I have real data on the wires right now!"). Once raised to 1, the sender must NOT drop it or alter the data until READY=1.';
  }
  if (s.endsWith('ready') || s === 'ready') {
    return 'Receiver flag ("My hands are free—I can take it!"). If READY=0, the sender patiently holds still (backpressure) without losing data.';
  }
  if (s.includes('gnt')) {
    return 'Permission granted! The memory or bus arbiter raises this wire to say "Your address request has been accepted—you may move on next cycle."';
  }
  if (s === 'req' || s.endsWith('_req') || s.includes('req_o') || s.includes('req_i')) {
    return 'Request doorbell ("Please read or write this address!"). Initiator holds this high until the target answers with grant (gnt).';
  }
  if (s.endsWith('last') || s === 'tlast' || s === 'wlast' || s === 'rlast') {
    return 'End-of-package marker! Pulses to 1 on the very final word of a burst or packet so the receiver knows the transfer is complete.';
  }
  if (s.includes('addr') || s === 'a_address') {
    return `Street / locker number (${width || 'multi-bit'}): tells the memory or peripheral *which* exact register or RAM location to read or write.`;
  }
  if (s.includes('wdata') || s === 'pwdata' || s === 'tdata' || s.includes('a_data')) {
    return `Outgoing cargo box (${width || 'data'}): carries the actual bits/bytes being pushed from sender to receiver.`;
  }
  if (s.includes('rdata') || s === 'prdata' || s === 'd_data') {
    return `Returning cargo box (${width || 'data'}): carries the fetched instruction or memory value back to the requester.`;
  }
  if (s.includes('strb') || s.includes('keep') || s.includes('be_')) {
    return 'Byte mask ("Checkboxes per byte"): lets a 32-bit or 64-bit bus update just 1 or 2 specific bytes inside a word without overwriting neighbors.';
  }
  if (s.includes('len')) {
    return 'Burst item count: specifies how many data beats follow this single address (for AXI4, actual beats = LEN + 1, up to 256).';
  }
  if (s.includes('size')) {
    return 'Box size per beat: specifies how many bytes travel on each clock beat (e.g., 1, 2, 4, 8 bytes per tick).';
  }
  if (s.includes('burst')) {
    return 'Address stepping rule: tells memory whether addresses stay put (FIXED FIFO), step up normally (INCR), or wrap around a cache line (WRAP).';
  }
  if (s.includes('resp') || s.includes('err') || s.includes('d_error')) {
    return 'Delivery receipt code: confirms whether the memory read/write succeeded cleanly (OKAY) or hit an invalid address / integrity fault (SLVERR/DECERR).';
  }
  if (s.endsWith('id') || s.startsWith('awid') || s.startsWith('arid') || s.startsWith('bid') || s.startsWith('rid')) {
    return 'Order tracking tag: stamps each transaction with an ID number so replies returning out-of-order still match the original requester.';
  }
  if (s.includes('psel')) {
    return 'APB wake-up tap ("Hey peripheral #N, this bus cycle is for you!").';
  }
  if (s.includes('penable')) {
    return 'APB Phase-2 "Go!" wire: stays 0 during Cycle 1 (Setup) and goes 1 during Cycle 2 (Access) until PREADY finishes.';
  }
  if (s.includes('pwrite') || s === 'we' || s.endsWith('_we_o') || s.endsWith('_we_i')) {
    return 'Direction switch: 1 means Write (send data to target); 0 means Read (fetch data back from target).';
  }
  if (s.includes('irq') || s.includes('intr') || s.includes('alert')) {
    return 'Urgent doorbell / alarm wire: taps the CPU or security handler immediately when hardware finishes work or detects tampering.';
  }
  if (s.includes('intg') || s.includes('ecc') || s.includes('parity') || s.includes('sec')) {
    return 'Tamper / bit-flip guard bits: extra mathematical checksum wires catching single-bit radiation flips or fault-injection attacks.';
  }
  if (s.includes('scl') || s.includes('sda') || s.includes('mosi') || s.includes('miso') || s.includes('cs_n') || s.includes('tx') || s.includes('rx')) {
    return 'Off-chip serial pin: carries serialized bits one by one across a physical PCB wire to sensors, flash chips, or host cables.';
  }
  if (s.includes('tl_i') || s.includes('tl_o')) {
    return 'Packed TileLink-UL bundle: groups Channel A request and Channel D response wires (plus integrity parity) into one clean SystemVerilog struct.';
  }
  if (fallbackSummary) {
    return `${fallbackSummary} (${dir.includes('out') ? 'Driven out by this block' : dir.includes('in') ? 'Sampled as input by this block' : 'Control/Data interface signal'}).`;
  }
  return `Hardware control/data signal (${width || '1b'}) carrying timing or payload state between connected modules.`;
}

export function explainFsmStateLikeStudent(stateLabel: string, technicalDesc?: string): string {
  const st = stateLabel.toUpperCase();
  if (st.includes('IDLE') || st.includes('RESET')) {
    return 'Resting at the starting line—waiting quietly for a valid request or start trigger so no extra power is burned.';
  }
  if (st.includes('SETUP') || st.includes('INIT')) {
    return 'Getting ready! Putting the address, keys, or settings firmly on the wires for 1 clean cycle before triggering execution.';
  }
  if (st.includes('FETCH')) {
    return 'Picking up the next instruction bytes or data packet from memory/cache.';
  }
  if (st.includes('DECODE')) {
    return 'Reading the instruction/packet header to figure out which hardware unit needs to run next.';
  }
  if (st.includes('ADDR') || st.includes('ARBIT')) {
    return 'Sending or winning access for the target memory address before cargo begins moving.';
  }
  if (st.includes('ACCESS') || st.includes('DATA') || st.includes('RUN') || st.includes('EXEC') || st.includes('BURST') || st.includes('TRANS')) {
    return 'Active work phase! Data beats or cipher rounds are actively executing cycle-by-cycle.';
  }
  if (st.includes('WAIT') || st.includes('STALL') || st.includes('HOLD')) {
    return 'Polite pause: holding outputs completely frozen because the partner unit signaled it is busy (`READY=0`).';
  }
  if (st.includes('RESP') || st.includes('ACK') || st.includes('DONE') || st.includes('FINISH')) {
    return 'Wrapping up and checking the signed delivery receipt (OKAY vs ERROR) before returning to IDLE.';
  }
  if (st.includes('ERR') || st.includes('ALERT') || st.includes('FAULT') || st.includes('LOCK')) {
    return 'Safety lockdown! A bus violation or hardware tamper fault was caught; alerting the system and blocking unsafe writes.';
  }
  return technicalDesc || 'Deterministic hardware control step advancing only on the rising clock edge when conditions hold.';
}

export function explainFsmTransitionLikeStudent(from: string, to: string, condition: string): string {
  const c = condition.trim();
  if (from === to) {
    return `Stay inside ${from} while (${c}) remains true—for example, waiting patiently until the partner catches up.`;
  }
  if (c.toLowerCase().includes('rst')) {
    return `Emergency reset condition (${c}): jumps immediately back to ${to} so no stale state lingers.`;
  }
  return `Move from ${from} to ${to} on the next clock edge as soon as (${c}) becomes true.`;
}

export const SECTION_STUDENT_GUIDES = {
  specs:
    'Think of this table as the rulebook & dimensions of the highway: bit widths tell you how wide each lane is, while "Normative" rules are laws every chip must obey so blocks from different companies plug together cleanly.',
  signals:
    'A bus is simply a bundle of named copper wires. Click any signal row below to see a plain-English analogy, exact bit width, SystemVerilog RTL snippet, and bug-catching assertion!',
  transactions:
    'Read this step-by-step like a comic strip of one complete delivery—from knocking on memory’s door to getting your receipt back.',
  rtl:
    'RTL ("Register Transfer Level") splits into two teams: the Datapath (heavy lifting trucks moving 32/64-bit numbers) and the Control FSM (the traffic-light controller telling trucks when to move or pause).',
  verification:
    'Before spending millions fabricating silicon, Verification Engineers wrap the design in a virtual test harness: a Driver sends random traffic, a Monitor spies passively on the wires, and a Scoreboard grades whether every single answer matched!',
  debugging:
    '90% of real chip bugs happen when rules are bent slightly—like dropping VALID early during backpressure. Compare the clean waveform against the broken one below!',
  registers:
    'Registers (CSRs) are the hardware "control dashboard" visible to C/Rust software at fixed memory addresses. RW = software can write/read; RO = hardware status only; W1C = write a 1 to clear an alarm bit!',
  parameters:
    'Think of RTL parameters like compile-time sizing sliders before manufacturing: changing DATA_WIDTH or PMPNumRegions literally adds or removes hardware wires and flip-flops.',
  implementation:
    'Synthesizable RTL can turn into real gates on an FPGA or ASIC fab; timing, SRAM banks, and multi-clock boundaries determine how fast and small the final chip runs.',
};

export const PROTOCOL_OFFICIAL_LINKS: Record<string, OfficialExternalLink[]> = {
  axi4: [
    { label: 'ARM AMBA AXI & ACE Protocol Specification', authority: 'ARM Developer', url: 'https://developer.arm.com/documentation/ihi0022/latest/' },
    { label: 'PULP Platform Open-Source SystemVerilog AXI IP', authority: 'GitHub (ETH Zurich)', url: 'https://github.com/pulp-platform/axi' },
    { label: 'Alex Forencich Verilog-AXI Reference Cores', authority: 'GitHub (MIT)', url: 'https://github.com/alexforencich/verilog-axi' },
  ],
  'axi4-lite': [
    { label: 'ARM AMBA AXI4-Lite Specification (Section B1)', authority: 'ARM Developer', url: 'https://developer.arm.com/documentation/ihi0022/latest/' },
    { label: 'Verilog-AXI AXI4-Lite Interconnect & RAM', authority: 'GitHub (MIT)', url: 'https://github.com/alexforencich/verilog-axi' },
  ],
  'axi4-stream': [
    { label: 'ARM AMBA AXI4-Stream Protocol Specification', authority: 'ARM Developer', url: 'https://developer.arm.com/documentation/ihi0051/latest/' },
    { label: 'Verilog-AXIS Streaming Components', authority: 'GitHub (MIT)', url: 'https://github.com/alexforencich/verilog-axis' },
  ],
  apb: [
    { label: 'ARM AMBA APB Protocol Specification', authority: 'ARM Developer', url: 'https://developer.arm.com/documentation/ihi0024/latest/' },
    { label: 'PULP APB Open-Source Peripherals', authority: 'GitHub', url: 'https://github.com/pulp-platform/apb' },
  ],
  ahb: [
    { label: 'ARM AMBA 5 AHB Protocol Specification', authority: 'ARM Developer', url: 'https://developer.arm.com/documentation/ihi0033/latest/' },
  ],
  'pcie-gen5': [
    { label: 'PCI-SIG Specifications Library', authority: 'PCI-SIG', url: 'https://pcisig.com/specifications' },
    { label: 'Verilog-PCIe Open-Source DMA & TLP Stack', authority: 'GitHub (MIT)', url: 'https://github.com/alexforencich/verilog-pcie' },
  ],
  'tl-ul': [
    { label: 'OpenTitan TileLink-UL Comportability Spec', authority: 'OpenTitan Docs', url: 'https://opentitan.org/book/hw/ip/tlul/index.html' },
    { label: 'OpenTitan TL-UL RTL Repository', authority: 'GitHub (lowRISC)', url: 'https://github.com/lowRISC/opentitan/tree/master/hw/ip/tlul' },
  ],
  'tl-ul-integrity': [
    { label: 'OpenTitan Bus Integrity & SECDED Architecture', authority: 'OpenTitan Docs', url: 'https://opentitan.org/book/hw/ip/tlul/index.html#bus-integrity' },
  ],
  obi: [
    { label: 'OpenHW Group OBI (Open Bus Interface) Specification', authority: 'OpenHW / GitHub', url: 'https://github.com/openhwgroup/obi' },
    { label: 'lowRISC Ibex Bus Interface Docs', authority: 'Ibex Docs', url: 'https://ibex-core.readthedocs.io/en/latest/03_reference/instruction_fetch.html' },
  ],
  tilelink: [
    { label: 'SiFive / CHIPS Alliance TileLink Specification 1.8', authority: 'CHIPS Alliance', url: 'https://starfivetech.com/uploads/tilelink-spec-1.8.1.pdf' },
    { label: 'Rocket Chip TileLink Diplomatic Generators', authority: 'GitHub', url: 'https://github.com/chipsalliance/rocket-chip' },
  ],
  ddr4: [
    { label: 'JEDEC DDR4 SDRAM Standard (JESD79-4)', authority: 'JEDEC', url: 'https://www.jedec.org/standards-documents/docs/jesd79-4' },
    { label: 'LiteDRAM Open-Source FPGA DDR Controller', authority: 'GitHub (EnjoyDigital)', url: 'https://github.com/enjoy-digital/litedram' },
  ],
  ddr5: [
    { label: 'JEDEC DDR5 SDRAM Standard (JESD79-5)', authority: 'JEDEC', url: 'https://www.jedec.org/standards-documents/docs/jesd79-5' },
  ],
  ucie: [
    { label: 'Universal Chiplet Interconnect Express (UCIe) Specs', authority: 'UCIe Consortium', url: 'https://www.uciexpress.org/specifications' },
  ],
  cxl: [
    { label: 'Compute Express Link (CXL) Specifications', authority: 'CXL Consortium', url: 'https://www.computeexpresslink.org/download-the-specification' },
  ],
  'riscv-debug': [
    { label: 'RISC-V External Debug Support Specification', authority: 'RISC-V International', url: 'https://github.com/riscv/riscv-debug-spec' },
    { label: 'PULP RISC-V Debug Module RTL', authority: 'GitHub', url: 'https://github.com/pulp-platform/riscv-dbg' },
  ],
};

export function getProtocolOfficialLinks(protocol: ProtocolDocument): OfficialExternalLink[] {
  if (PROTOCOL_OFFICIAL_LINKS[protocol.id]) return PROTOCOL_OFFICIAL_LINKS[protocol.id];
  const body = protocol.standardBody.toLowerCase();
  if (body.includes('arm') || body.includes('amba')) {
    return [{ label: 'Arm AMBA Architecture Specifications', authority: 'Arm Developer', url: 'https://developer.arm.com/Architectures/AMBA' }];
  }
  if (body.includes('pci-sig') || body.includes('pcisig')) {
    return [{ label: 'PCI-SIG Specifications Library', authority: 'PCI-SIG', url: 'https://pcisig.com/specifications' }];
  }
  if (body.includes('jedec')) {
    return [{ label: 'JEDEC Memory & Flash Standards Catalog', authority: 'JEDEC', url: 'https://www.jedec.org/standards-documents' }];
  }
  if (body.includes('mipi')) {
    return [{ label: 'MIPI Alliance Specifications', authority: 'MIPI Alliance', url: 'https://www.mipi.org/specifications' }];
  }
  if (body.includes('usb')) {
    return [{ label: 'USB-IF Document Library', authority: 'USB Implementers Forum', url: 'https://www.usb.org/documents' }];
  }
  if (body.includes('risc-v')) {
    return [{ label: 'RISC-V International Specifications', authority: 'RISC-V International', url: 'https://riscv.org/technical/specifications/' }];
  }
  if (body.includes('ocp') || body.includes('open compute') || body.includes('bow')) {
    return [{ label: 'Open Compute Project Specifications & Contributions', authority: 'Open Compute Project', url: 'https://www.opencompute.org/contributions' }];
  }
  if (body.includes('ieee')) {
    return [{ label: 'IEEE Standards Association Catalog', authority: 'IEEE SA', url: 'https://standards.ieee.org/' }];
  }
  if (body.includes('opentitan')) {
    return [{ label: 'OpenTitan Hardware Documentation', authority: 'OpenTitan', url: 'https://opentitan.org/book/hw/index.html' }];
  }
  if (body.includes('cxl')) {
    return [{ label: 'Compute Express Link Specifications', authority: 'CXL Consortium', url: 'https://www.computeexpresslink.org/download-the-specification' }];
  }
  if (body.includes('ucie')) {
    return [{ label: 'UCIe Specifications Library', authority: 'UCIe Consortium', url: 'https://www.uciexpress.org/specifications' }];
  }
  return [
    { label: `${protocol.standardBody} · ${protocol.sources[0]?.title || protocol.name}`, authority: protocol.standardBody, url: 'https://standards.ieee.org/' },
  ];
}

const PROTOCOL_EXPLAINERS: Record<string, StudentExplainerData> = {
  axi4: {
    analogyTitle: 'Think of AXI4 like a 5-Lane Highway with Delivery Trucks & Receipts',
    everydayAnalogy:
      'Instead of one narrow road where everyone waits in a single line, AXI4 builds 5 independent express lanes: one for sending write addresses (AW), one for the write cargo boxes (W), one for signed delivery receipts (B), one for read addresses (AR), and one for returning read cargo (R). Both the sender ("VALID: I have a package") and receiver ("READY: My hands are free") must say yes on the same clock tick.',
    threeStepFlow: [
      '1. Ask First (AW / AR): The CPU drops a single starting address + burst count (e.g., "Give me 16 boxes starting at House #100") so it does not have to repeat the address every cycle.',
      '2. Stream Cargo (W / R): Data boxes flow back-to-back on every clock tick whenever VALID and READY are both 1, ending with WLAST/RLAST.',
      '3. Receipt Check (B): For writes, memory sends back an OKAY receipt on the B-channel so the CPU knows the data actually landed safely.',
    ],
    keyTakeaway:
      'Never change your address/data while VALID=1 and READY=0 (that is like swapping a box mid-air while the receiver is still busy), and never cross a 4KB page boundary inside one burst.',
  },
  'axi4-lite': {
    analogyTitle: 'Think of AXI4-Lite like a Single-Item Express Checkout Counter',
    everydayAnalogy:
      'You do not bring a whole shopping cart (bursts) to a hardware register just to flip an LED or turn on UART interrupts. AXI4-Lite strips away bursts, IDs, and caching from AXI4 so hardware designers only pay a tiny amount of logic to read or write one single 32-bit or 64-bit control register at a time.',
    threeStepFlow: [
      '1. Pick One Register: Put the register address on AWADDR/ARADDR (length is always 1 transfer).',
      '2. Send or Read 1 Word: Move one 32-bit or 64-bit word using WDATA/RDATA with byte enables (WSTRB) if only updating part of the register.',
      '3. Confirm: Get OKAY or SLVERR back so software knows if the register existed.',
    ],
    keyTakeaway:
      'Use AXI4-Lite for CPU-to-register configuration knobs; switch to full AXI4 whenever you move large arrays, video frames, or DMA buffers.',
  },
  'axi4-stream': {
    analogyTitle: 'Think of AXI4-Stream like a Factory Conveyor Belt with No Street Addresses',
    everydayAnalogy:
      'When a camera pushes 4K pixels into an AI engine, the camera does not care where in RAM each pixel goes—it just wants to shove pixels down a pipe as fast as possible! AXI4-Stream drops all address channels and keeps only one directional data stream (`TDATA`), `TVALID`, `TREADY`, and `TLAST` ("End of frame!").',
    threeStepFlow: [
      '1. Push Data: Whenever the producer has a pixel/packet word, it raises TVALID and puts data on TDATA.',
      '2. Handle Backpressure: If the downstream AI unit gets full, it drops TREADY=0; the belt pauses cleanly without dropping a single byte.',
      '3. Mark Boundaries: TLAST pulses high on the final beat of a packet or video line so the next block knows where the frame ends.',
    ],
    keyTakeaway:
      'Zero address overhead means 100% of wires carry payload data—making AXI4-Stream the standard glue between DSP blocks, Ethernet MACs, DMA engines, and neural accelerators.',
  },
  apb: {
    analogyTitle: 'Think of APB like a Quiet Side-Street for Slow Control Knobs',
    everydayAnalogy:
      'Timers, GPIOs, and UART baud-rate dividers do not need a multi-lane superhighway. APB uses a simple two-clock-step knock: on Cycle 1 ("SETUP"), the bridge taps the peripheral on the shoulder (`PSEL=1`). On Cycle 2 ("ACCESS"), it says "Go!" (`PENABLE=1`) and finishes as soon as `PREADY=1`.',
    threeStepFlow: [
      '1. IDLE: Bus is quiet (`PSEL=0, PENABLE=0`), burning minimal dynamic power.',
      '2. SETUP (1 cycle): Address, direction (`PWRITE`), and write data stabilize with `PSEL=1, PENABLE=0`.',
      '3. ACCESS (1+ cycles): `PENABLE` goes high; transfer completes on the clock edge when `PREADY=1`.',
    ],
    keyTakeaway:
      'You cannot pipeline overlapping requests on APB, which keeps peripheral RTL dead simple (~20 lines of Verilog) at the cost of at least 2 cycles per transfer.',
  },
  'pcie-gen5': {
    analogyTitle: 'Think of PCIe like an International Postal System with Layered Envelopes',
    everydayAnalogy:
      'Running 64 parallel wires off a motherboard at 32 billion bits per second would break immediately from wire skew. Instead, PCIe encodes data into packets inside self-clocking high-speed serial differential pairs ("lanes"). Your memory read becomes a Transaction Layer Packet (TLP), gets a sequence number in the Data Link Layer, and rides high-speed PAM4/NRZ electrical waves on the Physical Layer.',
    threeStepFlow: [
      '1. Transaction Layer: Packs your read/write or MSI-X interrupt into a TLP header + payload.',
      '2. Data Link Layer: Adds sequence numbers and LCRC checksums so corrupted packets get auto-retried (ACK/NAK).',
      '3. Physical Layer: Stripes bytes across x1, x4, x8, or x16 differential TX/RX pairs at 32 GT/s (Gen5).',
    ],
    keyTakeaway:
      'PCIe uses Credit-Based Flow Control—a sender never transmits a packet unless it already holds buffer credits promised by the receiver.',
  },
  'tl-ul': {
    analogyTitle: 'Think of TL-UL like a Guarded TileLink Corridor Checking Every Packet for Tampering',
    everydayAnalogy:
      'In a security chip like OpenTitan, if a cosmic ray or laser glitch flips 1 bit on an address wire, an attacker could hijack a crypto key! TL-UL ("TileLink Uncached Lightweight") adds an A-channel request and D-channel response, plus OpenTitan adds SECDED error-correcting checksums on every bus hop.',
    threeStepFlow: [
      '1. Channel A (Request): Host drives `a_valid`, opcode (`Get` or `Put`), address, data, and an integrity digest.',
      '2. Integrity Check: Receiver hardware (`tlul_cmd_intg_chk`) verifies the parity bits immediately; any mismatch triggers an Alert!',
      '3. Channel D (Response): Device replies with `d_valid`, read data or acknowledgment, and response integrity bits.',
    ],
    keyTakeaway:
      'TL-UL keeps hardware nearly as lightweight as AXI4-Lite while guaranteeing split-transaction pipelining and hardware fault-injection detection.',
  },
  obi: {
    analogyTitle: 'Think of OBI like a Handshake-Free Wait-Only Bus Built Specifically for Tiny CPUs',
    everydayAnalogy:
      'Processors like Ibex and CV32E40P want to start fetching the next instruction on the very next clock cycle without heavy AXI channels. OBI splits a transfer into an Address Phase (`req` & `gnt`) and a Data Response Phase (`rvalid`)—no separate write-response channel needed.',
    threeStepFlow: [
      '1. Address Phase: CPU asserts `req=1` with `addr`/`we`/`wdata`. As soon as memory says `gnt=1` ("granted!"), the CPU can prepare the next address.',
      '2. Latency Gap: Memory takes 1 or more clock cycles to look up SRAM or cross a bridge.',
      '3. Response Phase: Memory pulses `rvalid=1` with `rdata` (or error `err=1`)—at least 1 cycle after grant.',
    ],
    keyTakeaway:
      'Because OBI forbids combinatorial `rvalid` in the same cycle as `req`, it prevents dangerous zero-cycle timing loops between CPU fetch stages and memory!',
  },
};

export function getProtocolStudentExplainer(p: ProtocolDocument): StudentExplainerData {
  if (PROTOCOL_EXPLAINERS[p.id]) return PROTOCOL_EXPLAINERS[p.id];

  const cat = p.categoryId;
  if (cat === 'memory') {
    return {
      analogyTitle: `Think of ${p.name} like a High-Density Warehouse with Strict Opening & Refresh Rules`,
      everydayAnalogy: `Memory protocols like ${p.name} store millions of tiny buckets (capacitors or SRAM cells). Before reading a single word, the controller must open the right aisle ("Row Activate"), wait for charges to settle, pick the exact shelf ("Column Read/Write"), and periodically refresh rows before charge leaks away.`,
      threeStepFlow: [
        '1. Command & Address Setup: Controller sends row/bank selection and timing commands over dedicated command/address pins.',
        '2. Timing Guardbands: Hardware enforces strict picosecond/cycle delays (tRCD, tCL, tRP) so bits are stable before sampling.',
        '3. High-Speed Data Burst: Data moves rapidly on both rising and falling clock edges (DDR) or wide HBM stacks back to the NoC.',
      ],
      keyTakeaway: `${p.name} separates slow row-opening penalties from fast burst transfers—so grouping nearby reads together dramatically boosts effective bandwidth.`,
    };
  }
  if (cat === 'peripheral') {
    return {
      analogyTitle: `Think of ${p.name} like a Lean Low-Pin-Count Wire Talking to Off-Chip Sensors`,
      everydayAnalogy: `Chips cannot afford 64 pins just to read a temperature sensor or boot from Flash. ${p.name} serializes bytes bit-by-bit across just 1 to 4 external board wires so microcontrollers can talk cheaply to the outside world.`,
      threeStepFlow: [
        '1. Start / Select: A chip-select line, start condition, or start bit wakes up the external device.',
        '2. Bit-by-Bit Shift: Data shifts serially synchronized either to a shared clock line (SPI/I2C) or an agreed baud rate (UART).',
        '3. Acknowledge / Stop: Parity, ACK bits, or CS deassertion mark the clean end of the frame.',
      ],
      keyTakeaway: `Fewer pins save silicon pad area and PCB routing cost, making ${p.name} ideal for control, sensors, and debug rather than gigabit memory streaming.`,
    };
  }
  if (cat === 'storage') {
    return {
      analogyTitle: `Think of ${p.name} like a Persistent Filing Vault with Boot & Block Commands`,
      everydayAnalogy: `Unlike DRAM, which forgets everything when power disappears, storage protocols like ${p.name} talk to Flash or SSD controllers—sending read/erase/program commands, polling busy flags, or reading directly via Execute-in-Place (XIP).`,
      threeStepFlow: [
        '1. Issue Command / Queue Doorbell: Initiator sends opcode + logical/flash page address.',
        '2. Internal Flash/Controller Access: Non-volatile array reads pages with ECC correction or DMA scatter-gather.',
        '3. Verify Status / Complete: Hardware checks status bits, CRC, or completion queue entries before moving to the next block.',
      ],
      keyTakeaway: `${p.name} balances non-volatile endurance, ECC integrity, and predictable command/queue throughput.`,
    };
  }
  if (cat === 'networking' || cat === 'phy-serdes') {
    return {
      analogyTitle: `Think of ${p.name} like a Precision Multi-Lane Conveyor Syncing Bits Across Long Wires`,
      everydayAnalogy: `At gigabit speeds, receiver and transmitter no longer share one simple wire clock cleanly. ${p.name} frames packets with special scramblers/line codes (8b/10b, 64B/66B, PAM4) and equalization so the receiver can lock onto every bit cleanly.`,
      threeStepFlow: [
        '1. Line Coding & Framing: MAC payload gets wrapped with sync headers, preambles, or FEC parity symbols.',
        '2. Serialize & Equalize: High-speed SerDes drives differential PAM/NRZ electrical waves across PCB/cables.',
        '3. Clock Recovery & Deskew: Receiver CDR recovers timing, strips framing, and checks FCS/CRC integrity.',
      ],
      keyTakeaway: `${p.name} abstracts noisy physical-layer signaling into clean packet/MAC boundaries.`,
    };
  }
  if (cat === 'mipi' || cat === 'display') {
    return {
      analogyTitle: `Think of ${p.name} like a High-Speed Live Video Broadcast Studio Inside Your Device`,
      everydayAnalogy: `A camera sensor or display panel streams millions of pixels every 1/120th of a second without dropping a single frame! ${p.name} synchronizes horizontal/vertical blanking intervals alongside real-time pixel packets so screens and ISPs stay locked.`,
      threeStepFlow: [
        '1. Capability & Mode Setup: Controller reads EDID/panel commands over AUX, DDC, or I2C/CCI.',
        '2. Sync & Blanking Framing: Packet headers or HSYNC/VSYNC strobes mark the exact start of each line and frame.',
        '3. Burst Pixel Delivery: High-speed differential lanes stream compressed (DSC) or raw pixels continuously.',
      ],
      keyTakeaway: `Real-time pixel pipelines cannot stall arbitrarily—${p.name} pairs strict line timing with low-power blanking states.`,
    };
  }
  if (cat === 'usb') {
    return {
      analogyTitle: `Think of ${p.name} like a Smart Universal Plug That Auto-Negotiates Speed, Data & Power`,
      everydayAnalogy: `${p.name} handles everything from hot-plug detection ("A cable just clicked in!") to negotiating voltage rails, enumerating device descriptors, and tunneling storage, audio, or video packets cleanly.`,
      threeStepFlow: [
        '1. Attach & Enumerate: Host detects electrical pull-ups/CC orientation and reads USB device descriptors.',
        '2. Schedule Endpoints: xHCI/EHCI rings schedule Control, Bulk, Interrupt, or Isochronous transfers.',
        '3. Flow Control & Power: Packet ACKs/credits and link power states (U0–U3) prevent buffer drops.',
      ],
      keyTakeaway: `${p.name} separates controller software complexity inside xHCI/descriptors so external peripherals stay truly plug-and-play.`,
    };
  }
  if (cat === 'coherency') {
    return {
      analogyTitle: `Think of ${p.name} like a Shared Classroom Whiteboard Rulebook Preventing Stale Notes`,
      everydayAnalogy: `If CPU Core 0 edits a variable in its private L1 cache while CPU Core 1 still holds an old copy, programs break silently! ${p.name} is a logical state-machine rulebook (Modified/Shared/Invalid, etc.) keeping every core's view consistent.`,
      threeStepFlow: [
        '1. Ownership Request: Before writing, a core asks the fabric/directory for exclusive ownership of that cache line.',
        '2. Snoop or Directory Invalidate: Other cores caching the old copy either invalidate it or pass the dirty line cleanly.',
        '3. State Commit: Cache tags transition cleanly between I / S / E / O / M states.',
      ],
      keyTakeaway: `Important Note: ${p.name} defines logical cache-coherency state transitions rather than physical pin wiring—typically carried over ACE, CHI, or TileLink.`,
    };
  }
  if (cat === 'power-mgmt' || cat === 'security' || cat === 'standards') {
    return {
      analogyTitle: `First-Principles Intuition for ${p.name}`,
      everydayAnalogy: `${p.name} (${p.fullName}) enforces strict system-wide contracts—either coordinating glitch-free clock/power/reset transitions, protecting hardware keys/integrity against faults, or establishing foundational arithmetic/modeling rules across silicon teams.`,
      threeStepFlow: [
        '1. Explicit Policy / Contract: Hardware or metadata defines legal operating states, power domains, or integrity bounds.',
        '2. Synchronized Handshake / Guard: State transitions only proceed after ack/denial or SECDED verification passes.',
        '3. Safe Commit / Alert: Clean state entry, power saving, or immediate fault-alert escalation occurs deterministically.',
      ],
      keyTakeaway: p.tagline,
    };
  }
  if (cat === 'automotive' || cat === 'wireless' || cat === 'industrial' || cat === 'accelerator' || cat === 'interconnect' || cat === 'chip-to-chip' || cat === 'noc' || cat === 'debug' || cat === 'processor') {
    return {
      analogyTitle: `First-Principles Intuition for ${p.name}`,
      everydayAnalogy: `${p.name} (${p.fullName}) serves as a deterministic hardware contract—${p.tagline.charAt(0).toLowerCase() + p.tagline.slice(1)}`,
      threeStepFlow: [
        `1. Initiation / Framing: Producer encodes intent, target address, or frame headers across ${p.channels.slice(0, 2).join(' & ') || 'control channels'}.`,
        '2. Handshake, Arbitration & Flow Control: Built-in backpressure, credits, or deterministic TDMA slots eliminate race conditions.',
        '3. Completion & Diagnostics: Receiver verifies CRC/ACK/status flags cleanly and signals upstream hardware or software.',
      ],
      keyTakeaway: p.tagline,
    };
  }
  return {
    analogyTitle: `First-Principles Intuition for ${p.name}`,
    everydayAnalogy: `${p.name} (${p.fullName}) acts as a strict contract between hardware blocks so a sender and receiver designed by completely different engineers can exchange data cleanly without race conditions or lost bits.`,
    threeStepFlow: [
      `1. Request / Framing: Initiator encodes intent and control metadata across ${p.channels.slice(0, 2).join(' / ') || 'the command channel'}.`,
      '2. Flow Control & Timing: Built-in handshake/credit rules stop faster transmitters from overflowing slower receivers.',
      '3. Completion / Verification: Receivers validate integrity/responses and report completion cleanly to upstream software or hardware.',
    ],
    keyTakeaway: p.tagline,
  };
}

const IP_EXPLAINERS: Record<string, StudentExplainerData> = {
  ibex: {
    analogyTitle: 'Think of Ibex like a Clean, Disciplined 2-Stage Kitchen Assembly Line',
    everydayAnalogy:
      'Instead of building a huge 12-stage factory to chase smartphone speeds, Ibex acts like a compact, ultra-reliable 2-chef kitchen. Chef 1 (`if_stage`) grabs the next RISC-V instruction from memory, and Chef 2 (`id_stage` + `ex_block`) decodes what it means and cooks it in the ALU/multiplier. Meanwhile, a pantry runner (`load_store_unit`) handles RAM trips and a strict security guard (`pmp`) blocks rogue software from touching forbidden memory!',
    threeStepFlow: [
      '1. Fetch (`ibex_if_stage`): Looks up the program counter (`PC`), optionally checks the tiny `ibex_icache`, and decompresses 16-bit compressed RISC-V instructions into 32-bit ops.',
      '2. Decode & Execute (`ibex_id_stage` + `ibex_ex_block`): Reads registers (`ibex_register_file_*`), runs math/branches, or asks the Load-Store Unit (`ibex_load_store_unit`) to read/write memory via OBI.',
      '3. Guard & Lockstep (`ibex_pmp` + `ibex_lockstep`): Checks memory permissions on every cycle and (in OpenTitan) runs a shadow copy 1 cycle behind to catch cosmic-ray or laser fault glitches!',
    ],
    keyTakeaway:
      'Ibex trades raw peak gigahertz for tiny area, crystal-clear RTL, deterministic interrupt response, and full formal/UVM signoff—making it ideal for Root-of-Trust and IoT controllers.',
  },
  'opentitan-aes': {
    analogyTitle: 'Think of OpenTitan AES like a Double-Locked Hardware Safe Wearing Masked Gloves',
    everydayAnalogy:
      'Software encryption is slow and leaks secrets through CPU caches. OpenTitan AES builds a dedicated hardware scrambling machine right on the chip. Even smarter: an attacker measuring the chip’s power wire could normally guess the secret key—so AES asks the chip’s random number network (`EDN`) to mix unpredictable noise ("masking shares") into every wire inside the cipher!',
    threeStepFlow: [
      '1. Load Keys & Mode (`aes_reg_top`): CPU writes `CTRL_SHADOWED` twice (to prevent glitch flips) or lets KeyManager sideload a key secretly over hardware wires.',
      '2. Scramble in Fixed Rounds (`aes_cipher_core`): SubBytes, ShiftRows, MixColumns, and AddRoundKey transform each 128-bit data block in deterministic hardware cycles.',
      '3. Reseed Noise (`EDN` Async Crossing): `clk_edn_i` continuously feeds fresh entropy into `aes_prng_masking` across a clock domain synchronizer so side-channel leaks stay scrambled.',
    ],
    keyTakeaway:
      'Notice the two clocks (`clk_i` and `clk_edn_i`)! OpenTitan AES is a textbook real-world example of why Crypto IPs use both dual-write shadowed registers and async clock domain handshakes.',
  },
  'vortex-gpu': {
    analogyTitle: 'Think of Vortex GPGPU like One Coach Directing 32 Synchronized Swimmers (SIMT)',
    everydayAnalogy:
      'A CPU has a few super-smart brains; a GPU has dozens of simpler workers doing the same math on different pixels or matrix elements at once! In Vortex, a Warp Scheduler picks one group of threads ("a warp"), sends ONE instruction down the pipe (`VX_fetch` -> `VX_decode` -> `VX_execute`), and 32 ALUs execute it together with an active-thread mask.',
    threeStepFlow: [
      '1. Schedule Warps (`VX_schedule`): Picks ready warps and stalls blocked ones (like threads waiting on DRAM) without halting the whole core.',
      '2. Lockstep SIMT Execute (`VX_execute`): Drives parallel ALU/FPU/SFU lanes, handling `if/else` thread divergence via hardware split/join stacks (`VX_ipdom_stack`).',
      '3. Coalesce Memory (`VX_mem_unit` -> AXI4): Combines 32 adjacent thread memory reads into single wide AXI4 bursts so DRAM bandwidth is not wasted.',
    ],
    keyTakeaway:
      'Unlike tiny academic toy GPUs, Vortex compiles real OpenCL/CUDA-style C++ kernels onto RISC-V ISA extensions and boots full workloads on FPGAs over PCIe/AXI4.',
  },
  gemmini: {
    analogyTitle: 'Think of Gemmini like a Marching Band of Calculators Passing Partial Sums Down & Right',
    everydayAnalogy:
      'Multiplying two 1000×1000 AI neural-network matrices on a normal CPU forces the core to read from RAM over and over. Gemmini builds a 2D grid of multiplier-accumulators ("Systolic Array"): activations enter from the left, weights sit inside (or stream down), and every clock tick each cell multiplies its two numbers and passes the running sum smoothly to its neighbor—no RAM bottleneck!',
    threeStepFlow: [
      '1. CPU Offload (`RoCC` Interface): The Rocket/BOOM CPU sends custom matrix instructions ("DMA load weight tile, multiply, store") to Gemmini.',
      '2. Local Scratchpad (`DMA` <-> `TileLink`): High-speed DMA streams tiles from shared L2 cache into fast on-chip SRAM banks (`Scratchpad` & `Accumulator`).',
      '3. Systolic Pulse (`Mesh`): Data flows rhythmically across the PE grid (`Mesh`), completing an entire matrix multiply per wave before writing results back.',
    ],
    keyTakeaway:
      'Gemmini shows how real AI accelerators combine a CPU instruction offload port (`RoCC`), coherent bus (`TileLink`), local scratchpad SRAMs, and systolic dataflow.',
  },
};

export function getIpStudentExplainer(ip: IpEntity): StudentExplainerData {
  if (IP_EXPLAINERS[ip.id]) return IP_EXPLAINERS[ip.id];

  switch (ip.category) {
    case 'CPU & Processor':
      return {
        analogyTitle: `How ${ip.name} Processes Software Instructions in Silicon`,
        everydayAnalogy: `${ip.name} turns binary instructions stored in memory into physical register updates, math operations, and memory requests—cycle by cycle—using ${ip.rtlLanguage}. Think of it like reading a recipe line-by-line while keeping track of your place in the book (the Program Counter).`,
        threeStepFlow: [
          '1. Fetch: Pulls the next instruction bytes from instruction memory/cache using its bus interface.',
          '2. Decode & Control: Figures out whether the instruction wants arithmetic, a memory load/store, or a branch jump.',
          '3. Execute & Writeback: Runs the ALU/FPU/LSU operation and commits the result cleanly to registers or CSRs.',
        ],
        keyTakeaway: ip.functional.socRole,
      };
    case 'GPU & Graphics':
      return {
        analogyTitle: `How ${ip.name} Achieves Massive Thread Parallelism`,
        everydayAnalogy: `While CPUs race to finish one task fast, ${ip.name} trades per-thread complexity for dozens of parallel execution lanes working simultaneously on vectors, pixels, or compute shaders.`,
        threeStepFlow: [
          '1. Dispatch / Wavefront Scheduling: Picks active thread groups so memory stalls are hidden by switching to another ready group.',
          '2. Parallel Vector Execution: Broadcasts decoded compute operations across parallel ALU lanes with per-lane masks.',
          '3. Cache / Coalesced Memory: Merges parallel thread requests into wider memory bursts over the SoC fabric.',
        ],
        keyTakeaway: ip.functional.socRole,
      };
    case 'AI & ML Accelerator':
      return {
        analogyTitle: `Why ${ip.name} Beats CPUs at Neural Networks`,
        everydayAnalogy: `Neural networks spend 90% of their energy moving data rather than doing math! ${ip.name} keeps weights and activations parked in local on-chip SRAM buffers while feeding parallel MAC arrays nonstop.`,
        threeStepFlow: [
          '1. Descriptor / Control Setup: Host CPU programs matrix shapes or layer pointers over control registers.',
          '2. DMA Tile Prefetch: High-bandwidth DMA pulls feature maps from DRAM into local SRAM scratchpads.',
          '3. Parallel MAC Compute & Post-Op: Computes dot products in parallel, applies activation/quantization, and writes tensors back.',
        ],
        keyTakeaway: ip.functional.socRole,
      };
    case 'Security & Crypto':
      return {
        analogyTitle: `Why ${ip.name} Lives Inside Dedicated Hardware`,
        everydayAnalogy: `${ip.name} isolates sensitive keys, randomness, or security policies away from general CPU software—ensuring deterministic timing, tamper resistance, and fault-detection alerts.`,
        threeStepFlow: [
          '1. Privileged Configuration: Host CPU writes shadowed/locked control CSRs or triggers hardware key sideloading.',
          '2. Isolated Engine Execution: Hardware state machines perform fixed-time cryptographic, RNG, or policy checks.',
          '3. Integrity & Alerts: Output status, interrupts, or differential fault alerts report back over the guarded SoC fabric.',
        ],
        keyTakeaway: ip.functional.socRole,
      };
    case 'SoC Interconnect & NoC':
      return {
        analogyTitle: `Think of ${ip.name} like the Chip's Traffic Controller & Highway Overpass`,
        everydayAnalogy: `Multiple masters (CPUs, DMAs, PCIe) all want to reach RAM and peripherals at the exact same clock cycle. ${ip.name} decodes addresses, arbitrates fairly so nobody starves, converts bus widths, and routes responses back to the exact requester.`,
        threeStepFlow: [
          '1. Address Decode: Inspects incoming address bits to decide which slave port owns the target memory region.',
          '2. Arbitration: Picks a winner cleanly when two initiators collide on the same destination.',
          '3. Width / Clock / ID Tracking: Tracks transaction IDs (or NoC flits) so replies always return to the right initiator.',
        ],
        keyTakeaway: ip.functional.socRole,
      };
    default:
      return {
        analogyTitle: `Understanding ${ip.name} From First Principles`,
        everydayAnalogy: `${ip.name} is a specialized hardware building block that plugs into an SoC bus (${ip.interfaces.map((i) => i.protocolLabel).join(', ')}) so CPUs don't have to bit-bang timing-critical protocols in software.`,
        threeStepFlow: [
          '1. Register Setup: Host software writes configuration parameters via the target register bus.',
          '2. Hardware State Machine: Dedicated counters, FIFOs, and FSMs execute protocol timing cycle-accurately.',
          '3. Interrupt / DMA Handoff: Notifies the CPU cleanly when buffers empty, packets arrive, or transfers complete.',
        ],
        keyTakeaway: ip.functional.socRole,
      };
  }
}

export function getSocStudentExplainer(soc: SocEntity): StudentExplainerData {
  return {
    analogyTitle: `Think of the ${soc.name} SoC like a Complete Miniature City`,
    everydayAnalogy: `A modern chip is not one circuit—it is an entire city! The CPU is City Hall making decisions, the Interconnect/NoC is the Highway Interchange connecting neighborhoods, SRAM/DDR controllers are Warehouses storing data, Crypto blocks are Armored Banks, and UART/SPI/PCIe are the Loading Docks talking to the outside world.`,
    threeStepFlow: [
      `1. Decision Center (CPU): Fetches instructions from Memory/ROM across ${soc.connections[0]?.protocolLabel || 'the system bus'} and kicks off work.`,
      '2. Highway Fabric (Interconnect / NoC): Arbitrates traffic across initiators and routes read/write packets to the right memory map region.',
      '3. Specialized Districts (Crypto / Accel / IO): Dedicated engines crunch math or external I/O independently and ring the Interrupt Controller doorbell when finished.',
    ],
    keyTakeaway: soc.summary,
  };
}
