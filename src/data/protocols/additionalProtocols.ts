import { ProtocolDocument, CategoryId, SpecRow, SignalDefinition, WaveformScenario, InterviewQuestion } from '../../types/protocol';

interface BriefSeed {
  id: string;
  name: string;
  fullName: string;
  categoryId: CategoryId;
  standardBody: string;
  specVersion: string;
  year: string;
  tagline: string;
  popularityRank: number;
  definition: string;
  whyDeveloped: string;
  problemSolved: string;
  usedIn: string[];
  advantages: string[];
  limitations: string[];
  clockAndReset: string;
  dataFlow: string;
  controlFlow: string;
  specs: SpecRow[];
  signals: SignalDefinition[];
  waveform: WaveformScenario;
  codeTitle: string;
  codeSnippet: string;
  svaSnippet: string;
  interviewQuestions: InterviewQuestion[];
  sourceRef: string;
}

function makeSig(
  name: string,
  channel: string,
  width: string,
  direction: SignalDefinition['direction'],
  resetValue: string,
  summary: string,
  timingRules: string,
  svaAssertion: string
): SignalDefinition {
  return {
    name,
    channel,
    width,
    direction,
    resetValue,
    polarity: width === '1' ? 'Active High' : 'Data / Multi-bit',
    summary,
    timingRules,
    dependencies: ['Clock / Reference'],
    legalConditions: 'Driven per standard phase rules.',
    illegalConditions: 'Violating setup/hold or protocol state invariants.',
    rtlExample: `// Sample ${name} cleanly on synchronous edge or oversampled tick`,
    svaAssertion,
    uvmDriverNote: `Drive and sample ${name} via protocol virtual interface.`,
    commonBugs: [`Improper synchronization or missing ${name} reset default.`],
    relatedInterviewQs: [`How does ${name} govern protocol timing?`],
  };
}

function buildBriefDoc(seed: BriefSeed): ProtocolDocument {
  return {
    id: seed.id,
    name: seed.name,
    fullName: seed.fullName,
    categoryId: seed.categoryId,
    standardBody: seed.standardBody,
    specVersion: seed.specVersion,
    year: seed.year,
    tagline: seed.tagline,
    depth: 'Engineering Brief',
    popularityRank: seed.popularityRank,
    overview: {
      definition: seed.definition,
      whyDeveloped: seed.whyDeveloped,
      problemSolved: seed.problemSolved,
      usedIn: seed.usedIn,
      terminology: [
        { term: 'Initiator / Controller', meaning: 'Entity driving protocol requests, clocks, or frames.' },
        { term: 'Target / Responder', meaning: 'Entity servicing requests and returning data/status.' },
      ],
      advantages: seed.advantages,
      limitations: seed.limitations,
    },
    architecture: {
      summary: seed.definition,
      clockAndReset: seed.clockAndReset,
      dataFlow: seed.dataFlow,
      controlFlow: seed.controlFlow,
      nodes: [
        { id: 'init', label: `${seed.name} Initiator`, role: 'manager', x: 40, y: 75, width: 190, height: 110 },
        { id: 'link', label: `${seed.name} Channel / Fabric`, role: 'interconnect', x: 265, y: 75, width: 170, height: 110 },
        { id: 'targ', label: `${seed.name} Target`, role: 'subordinate', x: 470, y: 75, width: 190, height: 110 },
      ],
      links: [
        { from: 'init', to: 'link', label: 'Request / Tx' },
        { from: 'link', to: 'targ', label: 'Payload / Clock' },
        { from: 'targ', to: 'init', label: 'Response / Rx', bidirectional: false },
      ],
    },
    specifications: seed.specs,
    channels: Array.from(new Set(seed.signals.map((s) => s.channel))),
    signals: seed.signals,
    transactionFlow: {
      nominal: [
        { step: 1, phase: 'Initiation', title: 'Setup & Arbitration', description: `Initiator drives start condition or request attributes on ${seed.name}.`, activeSignals: seed.signals.slice(0, 2).map((s) => s.name) },
        { step: 2, phase: 'Transfer', title: 'Payload & Flow Control', description: seed.dataFlow, activeSignals: seed.signals.slice(1, 4).map((s) => s.name) },
        { step: 3, phase: 'Completion', title: 'Acknowledge / Response', description: seed.controlFlow, activeSignals: seed.signals.slice(-2).map((s) => s.name) },
      ],
      errorAndOrdering: [
        `Consult ${seed.specVersion} for exact timeout, framing error, and retry semantics.`,
      ],
    },
    waveforms: [seed.waveform],
    rtl: {
      architectureNotes: `Clean synchronous RTL design for ${seed.name} separates clock-domain synchronization from protocol FSM control.`,
      datapathNotes: seed.dataFlow,
      controlpathNotes: seed.controlFlow,
      fsmStates: [
        { id: 'IDLE', label: 'IDLE', description: 'Waiting for transaction start', x: 60, y: 80, isInitial: true },
        { id: 'ACTIVE', label: 'ACTIVE', description: 'Address / Payload phase', x: 260, y: 80 },
        { id: 'RESP', label: 'COMPLETE', description: 'Response / Stop phase', x: 460, y: 80 },
      ],
      fsmTransitions: [
        { from: 'IDLE', to: 'ACTIVE', condition: 'start_req' },
        { from: 'ACTIVE', to: 'RESP', condition: 'payload_done' },
        { from: 'RESP', to: 'IDLE', condition: 'ack_complete' },
      ],
      codeTitle: seed.codeTitle,
      codeLanguage: 'SystemVerilog',
      codeSnippet: seed.codeSnippet,
      commonMistakes: [
        `Failing to synchronize asynchronous external inputs before ${seed.name} FSM sampling.`,
        'Violating setup/hold timing or omitting reset defaults on output valid lines.',
      ],
    },
    verification: {
      uvmArchitecture: `UVM agent with ${seed.id}_driver, ${seed.id}_monitor, scoreboard, and SVA protocol compliance module.`,
      driverStrategy: 'Drive nominal, back-to-back, and boundary timing configurations.',
      monitorStrategy: 'Passively reconstruct protocol frames and check timing invariants.',
      scoreboardStrategy: 'Compare expected payload/responses against reference model.',
      coveragePoints: ['All operating modes and speed grades.', 'Error injection and recovery paths.', 'Back-to-back continuous traffic.'],
      cornerCases: ['Reset during active transaction.', 'Maximum wait-state / clock-stretching stress.'],
      svaSnippet: seed.svaSnippet,
      uvmSnippet: `// UVM Monitor analysis port broadcast for ${seed.name}\nap.write(tr);`,
    },
    debuggingLab: [],
    interviewQuestions: seed.interviewQuestions,
    sources: [{ title: seed.specVersion, authority: seed.standardBody, reference: seed.sourceRef }],
  };
}

const SEEDS: BriefSeed[] = [
  {
    id: 'ahb-lite',
    name: 'AHB-Lite',
    fullName: 'AMBA 3 / 5 AHB-Lite Pipelined Bus',
    categoryId: 'amba',
    standardBody: 'ARM Ltd.',
    specVersion: 'ARM IHI 0033A / IHI 0033C',
    year: '2006 / 2015',
    tagline: 'Single-manager, pipelined address/data bus supporting bursts and single-cycle throughput.',
    popularityRank: 6,
    definition: 'AHB-Lite is a single-master pipelined on-chip bus where the Address phase of transaction N+1 overlaps the Data phase of transaction N.',
    whyDeveloped: 'Simplified full multi-master AHB (removing HBUSREQ/HGRANT) for Cortex-M microcontrollers and AHB crossbar matrices.',
    problemSolved: 'Achieves 1 transfer per clock cycle without AXI\'s 5-channel wire overhead.',
    usedIn: ['ARM Cortex-M0/M3/M4/M7 instruction/data buses', 'On-chip SRAM and flash controllers'],
    advantages: ['100% single-cycle pipelined data throughput', 'Low gate count compared to AXI4'],
    limitations: ['Half-duplex (shared HADDR for reads and writes)', 'No out-of-order completion'],
    clockAndReset: 'HCLK rising edge; active-LOW HRESETn.',
    dataFlow: 'HWDATA (Manager -> Subordinate) and HRDATA (Subordinate -> Manager) are active 1 cycle after their corresponding HADDR phase.',
    controlFlow: 'HREADY=1 advances both Address and Data pipelines simultaneously; HREADY=0 stalls both.',
    specs: [
      { parameter: 'Data Width', value: '32, 64, 128, 256, 512, 1024 bits', classification: 'Configurable Parameter', notes: '32-bit typical on Cortex-M SoCs.' },
      { parameter: 'Transfer Types (HTRANS)', value: 'IDLE (00), BUSY (01), NONSEQ (10), SEQ (11)', classification: 'Official Standard Requirement', notes: 'NONSEQ starts burst; SEQ continues burst.' },
      { parameter: 'Burst Types (HBURST)', value: 'SINGLE, INCR, WRAP4/8/16, INCR4/8/16', classification: 'Official Standard Requirement', notes: '1KB boundary crossing prohibition.' },
    ],
    signals: [
      makeSig('HTRANS[1:0]', 'AHB', '2', 'Manager -> Subordinate', '00 (IDLE)', 'Indicates transfer type: IDLE, BUSY, NONSEQ, SEQ.', 'Sampled on HCLK when HREADY=1.', 'assert property (@(posedge HCLK) disable iff (!HRESETn) !HREADY |=> $stable(HTRANS));'),
      makeSig('HADDR[31:0]', 'AHB', '32', 'Manager -> Subordinate', '0', '32-bit byte address driven during Address phase.', 'Must stay stable while HREADY=0.', 'assert property (@(posedge HCLK) disable iff (!HRESETn) !HREADY |=> $stable(HADDR));'),
      makeSig('HREADY', 'AHB', '1', 'Subordinate -> Manager', '1', 'Indicates previous transfer data phase is complete; 0 extends wait states.', 'Master must hold address/control stable when HREADY=0.', 'assert property (@(posedge HCLK) !HRESETn |-> HREADY);'),
      makeSig('HRESP', 'AHB', '1', 'Subordinate -> Manager', '0 (OKAY)', '0=OKAY, 1=ERROR (requires 2-cycle ERROR response with HREADY=0 then HREADY=1).', '2-cycle protocol allows Master to cancel next pipelined address.', 'assert property (@(posedge HCLK) (HRESP && !HREADY) |=> (HRESP && HREADY));'),
    ],
    waveform: {
      id: 'ahb-pipe', name: 'AHB-Lite Pipelined Read & Write', category: 'Nominal', description: 'Address phase N+1 overlaps Data phase N; HREADY=0 stalls both.', cycles: 8, clockName: 'HCLK',
      signals: [
        { name: 'HCLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'HTRANS', type: 'bus', values: ['IDLE', 'NSEQ', 'SEQ', 'SEQ', 'IDLE', 'IDLE', 'IDLE', 'IDLE'] },
        { name: 'HADDR', type: 'bus', values: ['-', '100', '104', '108', '-', '-', '-', '-'] },
        { name: 'HWRITE', type: 'bit', values: [0, 1, 0, 0, 0, 0, 0, 0] },
        { name: 'HWDATA', type: 'bus', values: ['-', '-', 'W0', '-', '-', '-', '-', '-'] },
        { name: 'HRDATA', type: 'bus', values: ['-', '-', '-', 'R1', 'R1', 'R2', '-', '-'] },
        { name: 'HREADY', type: 'bit', values: [1, 1, 1, 0, 1, 1, 1, 1] },
      ],
      annotations: [{ cycle: 3, label: 'HREADY=0 extends Data R1 and Address 108', severity: 'warn' }],
    },
    codeTitle: 'ahb_lite_sram_if.sv',
    codeSnippet: `// Pipeline HADDR/HWRITE from Address Phase to Data Phase
always_ff @(posedge HCLK or negedge HRESETn) begin
  if (!HRESETn) begin
    addr_d <= '0; write_d <= 1'b0; valid_d <= 1'b0;
  end else if (HREADY) begin
    addr_d  <= HADDR;
    write_d <= HWRITE;
    valid_d <= HSEL && HTRANS[1]; // NONSEQ or SEQ
  end
end`,
    svaSnippet: `// Two-cycle ERROR response invariant
assert property (@(posedge HCLK) disable iff (!HRESETn) (HRESP && !HREADY) |=> (HRESP && HREADY));`,
    interviewQuestions: [
      { id: 'ahb-1', level: 'Beginner', question: 'Why does AHB-Lite require a 2-cycle ERROR response?', answer: 'Because AHB is pipelined: when Subordinate signals HRESP=1 on cycle 1 (with HREADY=0), the Manager has already placed the next transfer\'s address on HADDR and needs cycle 2 (HREADY=1) to drive HTRANS=IDLE.', keyTakeaway: '2-cycle error prevents corrupted pipelined next-transfer execution.' },
    ],
    sourceRef: 'ARM IHI 0033A Sections 2–5',
  },
  {
    id: 'spi',
    name: 'SPI',
    fullName: 'Serial Peripheral Interface',
    categoryId: 'peripheral',
    standardBody: 'Motorola / Industry Standard',
    specVersion: 'De-facto 4-wire Synchronous Serial (Modes 0–3)',
    year: '1980s',
    tagline: 'Full-duplex synchronous serial peripheral bus using SCLK, MOSI, MISO, and active-low CS_N.',
    popularityRank: 7,
    definition: 'SPI is a full-duplex, synchronous serial protocol where a Controller shifts data out on MOSI while simultaneously sampling MISO on a configurable clock edge (CPOL/CPHA).',
    whyDeveloped: 'Needed faster full-duplex chip-to-chip communication than UART/I2C for ADCs, flash memories, and displays.',
    problemSolved: 'Achieves 10–100+ MHz serial transfer with trivial shift-register hardware.',
    usedIn: ['NOR Flash boot memories', 'Sensors, DACs/ADCs, PMICs, OLED controllers'],
    advantages: ['Full duplex', 'Very simple shift-register RTL', 'Push-pull drivers allow high frequencies'],
    limitations: ['Requires separate CS_N pin per target', 'No hardware ACK/NACK or standardized flow control'],
    clockAndReset: 'SCLK generated by Controller only during active CS_N=0 frames; configured by CPOL and CPHA.',
    dataFlow: 'Simultaneous MSB-first (typical) bit shifting on MOSI and MISO.',
    controlFlow: 'CS_N falling edge frames transaction; Mode (CPOL, CPHA) defines launch vs sample clock edges.',
    specs: [
      { parameter: 'Clock Modes', value: 'Mode 0 (0,0), Mode 1 (0,1), Mode 2 (1,0), Mode 3 (1,1)', classification: 'Official Standard Requirement', notes: 'CPOL = idle polarity; CPHA = 0 sample on leading edge, 1 sample on trailing edge.' },
      { parameter: 'Signals', value: 'SCLK, MOSI, MISO, CS_N', classification: 'Official Standard Requirement', notes: 'Quad-SPI (QSPI) uses 4 bidirectional IO[3:0] lines.' },
    ],
    signals: [
      makeSig('SCLK', 'SPI', '1', 'Manager -> Subordinate', 'CPOL', 'Serial clock driven by Controller.', 'Only toggles when CS_N=0.', 'assert property (@(posedge clk) cs_n |-> (sclk == CPOL));'),
      makeSig('CS_N', 'SPI', '1', 'Manager -> Subordinate', '1', 'Active-LOW chip select framing the SPI transaction.', 'Asserted >= 1/2 SCLK before first edge.', 'assert property (@(posedge clk) $fell(cs_n) |-> ##[1:$] $rose(sclk));'),
      makeSig('MOSI', 'SPI', '1', 'Manager -> Subordinate', '0', 'Controller-Out Target-In serial data.', 'Launched on opposite edge to sample edge.', '// Stable across sample edge'),
      makeSig('MISO', 'SPI', '1', 'Subordinate -> Manager', 'Hi-Z', 'Target-Out Controller-In serial data.', 'Target must tri-state MISO when CS_N=1.', '// Check tri-state when CS_N=1'),
    ],
    waveform: {
      id: 'spi-mode0', name: 'SPI Mode 0 (CPOL=0, CPHA=0) 4-Bit Frame', category: 'Nominal', description: 'Data sampled on rising SCLK edge, shifted on falling SCLK edge while CS_N=0.', cycles: 10, clockName: 'SYSCLK',
      signals: [
        { name: 'CS_N', type: 'bit', values: [1, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
        { name: 'SCLK', type: 'clock', values: [0, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
        { name: 'MOSI', type: 'bit', values: [0, 1, 1, 0, 0, 1, 1, 0, 0, 0] },
        { name: 'MISO', type: 'bit', values: [0, 0, 0, 1, 1, 0, 0, 1, 1, 0] },
      ],
      annotations: [{ cycle: 2, label: 'Bit 3 sampled on rising edge', severity: 'info' }],
    },
    codeTitle: 'spi_mode0_controller.sv',
    codeSnippet: `// SPI Mode 0: launch on falling SCLK, sample on rising SCLK
always_ff @(posedge sys_clk) begin
  if (sclk_rising)  rx_shift <= {rx_shift[6:0], miso_sync};
  if (sclk_falling) tx_shift <= {tx_shift[6:0], 1'b0};
end`,
    svaSnippet: `assert property (@(posedge sys_clk) cs_n |-> (sclk == cpol));`,
    interviewQuestions: [
      { id: 'spi-1', level: 'Beginner', question: 'Explain CPOL and CPHA in SPI.', answer: 'CPOL sets idle SCLK polarity (0=LOW, 1=HIGH). CPHA=0 samples data on the first (leading) clock transition and shifts on the trailing; CPHA=1 shifts on leading and samples on trailing.', keyTakeaway: 'Mode 0 (0,0) and Mode 3 (1,1) both sample on rising edge.' },
    ],
    sourceRef: 'Industry Standard SPI Specification',
  },
  {
    id: 'i2c',
    name: 'I2C',
    fullName: 'Inter-Integrated Circuit Bus',
    categoryId: 'peripheral',
    standardBody: 'NXP Semiconductors',
    specVersion: 'UM10204 Rev 7.0 (I2C-bus specification)',
    year: '1982 / Rev 7 (2021)',
    tagline: 'Two-wire open-drain multi-controller serial bus with 7/10-bit addressing, ACK/NACK, and clock stretching.',
    popularityRank: 8,
    definition: 'I2C uses two open-drain lines (SDA and SCL) pulled high by resistors to connect multiple peripherals using 7-bit or 10-bit addressing.',
    whyDeveloped: 'Minimize PCB trace and package pin count for low-speed board management and sensor buses.',
    problemSolved: 'Supports multi-master arbitration, per-byte ACK/NACK, and slave clock stretching on just 2 pins.',
    usedIn: ['PMICs, temperature sensors, EEPROMs, SMBus/PMBus telemetry'],
    advantages: ['Only 2 pins regardless of slave count', 'Hardware ACK/NACK & multi-master arbitration'],
    limitations: ['Open-drain pull-up RC limits speed (100 kHz – 3.4 MHz)', 'Bus hang if a slave holds SDA low mid-byte'],
    clockAndReset: 'Open-drain SCL (Standard 100 kHz, Fast 400 kHz, Fast+ 1 MHz, High-Speed 3.4 MHz).',
    dataFlow: 'MSB-first 8-bit bytes on SDA followed by 9th-bit ACK(0)/NACK(1).',
    controlFlow: 'START = SDA falls while SCL=1; STOP = SDA rises while SCL=1.',
    specs: [
      { parameter: 'Speed Grades', value: '100 kbps, 400 kbps, 1 Mbps, 3.4 Mbps', classification: 'Official Standard Requirement', notes: 'Fast-mode (400 kHz) and Fast-mode Plus (1 MHz) most common.' },
      { parameter: 'Electrical Type', value: 'Open-drain with external pull-ups', classification: 'Official Standard Requirement', notes: 'Wired-AND arbitration prevents bus contention.' },
    ],
    signals: [
      makeSig('SCL', 'I2C', '1', 'Bidirectional', '1 (Pulled High)', 'Open-drain serial clock; Target can hold LOW for clock stretching.', 'SDA must remain stable whenever SCL=1 except during START/STOP.', '// Check SCL rise-time and clock stretch timeout'),
      makeSig('SDA', 'I2C', '1', 'Bidirectional', '1 (Pulled High)', 'Open-drain bidirectional serial data.', 'Changes only while SCL=0 (except START and STOP conditions).', 'assert property (@(posedge oversample_clk) (scl && !$rose(scl) && !$fell(scl)) |-> $stable(sda)); // outside START/STOP'),
    ],
    waveform: {
      id: 'i2c-write', name: 'I2C START + 7-bit Address + Write + ACK', category: 'Nominal', description: 'START condition followed by address bits, R/W=0, and slave pulling SDA=0 for ACK on 9th clock.', cycles: 10, clockName: 'OVS_CLK',
      signals: [
        { name: 'SCL', type: 'clock', values: [1, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'SDA', type: 'bit', values: [1, 0, 1, 1, 0, 0, 1, 1, 0, 0] },
      ],
      annotations: [{ cycle: 1, label: 'START: SDA falls while SCL=1', severity: 'info' }, { cycle: 9, label: 'ACK: Target holds SDA=0', severity: 'info' }],
    },
    codeTitle: 'i2c_open_drain_pad.sv',
    codeSnippet: `// Never drive 1 onto open-drain I2C pads; drive 0 or Hi-Z
assign sda_io = sda_drive_low ? 1'b0 : 1'bz;
assign scl_io = scl_drive_low ? 1'b0 : 1'bz;`,
    svaSnippet: `// SDA only transitions when SCL is LOW unless START/STOP`,
    interviewQuestions: [
      { id: 'i2c-1', level: 'Intermediate', question: 'How does I2C resolve multi-master bus arbitration without data corruption?', answer: 'Open-drain wired-AND: every master monitors SDA while transmitting. If Master A releases SDA (1) but reads SDA=0 (driven by Master B), Master A knows it lost arbitration and immediately backs off without corrupting Master B\'s frame.', keyTakeaway: 'Wired-AND non-destructive arbitration.' },
    ],
    sourceRef: 'NXP UM10204 I2C-bus Specification Rev 7.0',
  },
  {
    id: 'uart',
    name: 'UART',
    fullName: 'Universal Asynchronous Receiver/Transmitter',
    categoryId: 'peripheral',
    standardBody: 'EIA / TIA RS-232 / Industry',
    specVersion: 'Asynchronous Start/Data/Parity/Stop Framing',
    year: '1960s–Present',
    tagline: 'Clockless asynchronous serial link using agreed baud rate, start bit, 8 data bits, optional parity, and stop bit.',
    popularityRank: 9,
    definition: 'UART transmits bytes asynchronously over TX and RX lines without a shared clock wire, relying on 16x oversampling to lock onto the Start bit falling edge.',
    whyDeveloped: 'Long-distance and console serial communication without clock skew constraints.',
    problemSolved: 'Simple 2-wire point-to-point console, modem, and debug communication.',
    usedIn: ['SoC boot console', 'Bluetooth/GPS modules', 'USB-to-Serial debug bridges'],
    advantages: ['Zero clock wire needed', 'Minimal logic'],
    limitations: ['Requires +/-2% clock frequency matching', 'Low throughput compared to SPI/PCIe'],
    clockAndReset: 'Asynchronous TX/RX sampled at 16x baud rate clock.',
    dataFlow: 'Idle(1) -> Start(0) -> D0..D7 (LSB first) -> Parity(opt) -> Stop(1).',
    controlFlow: 'Optional RTS/CTS hardware flow control.',
    specs: [
      { parameter: 'Framing', value: '8N1 (1 Start, 8 Data, No Parity, 1 Stop)', classification: 'Implementation Practice', notes: '10 bits per byte = 80% framing efficiency.' },
      { parameter: 'Baud Tolerance', value: '<= +/-2% combined TX/RX clock drift', classification: 'Official Standard Requirement', notes: 'Accumulated phase drift must stay <0.5 bit across 10 bits.' },
    ],
    signals: [
      makeSig('TX', 'UART', '1', 'Transmitter -> Receiver', '1 (Idle Mark)', 'Asynchronous serial transmit output.', 'Transitions at 1/baud intervals.', '// Check stop bit == 1'),
      makeSig('RX', 'UART', '1', 'Receiver -> Transmitter', '1 (Idle Mark)', 'Asynchronous serial receive input.', 'Must pass through 2-FF synchronizer before 16x oversample FSM.', '// Synchronize RX before edge detect'),
    ],
    waveform: {
      id: 'uart-8n1', name: 'UART 8N1 Byte Transmission (0x55)', category: 'Nominal', description: 'Idle(1) drops to Start(0), sends LSB-first alternating bits 1,0,1,0..., ends with Stop(1).', cycles: 11, clockName: 'BAUD_CLK',
      signals: [
        { name: 'BAUD_CLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
        { name: 'TX', type: 'bit', values: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      ],
      annotations: [{ cycle: 1, label: 'START bit (0)', severity: 'info' }, { cycle: 10, label: 'STOP bit (1)', severity: 'info' }],
    },
    codeTitle: 'uart_rx_sync.sv',
    codeSnippet: `// 2-stage synchronizer to prevent metastability on async RX
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) rx_sync <= 2'b11;
  else        rx_sync <= {rx_sync[0], rx_in};
end`,
    svaSnippet: `// Framing error check: Stop bit sampled at mid-bit must be 1`,
    interviewQuestions: [
      { id: 'uart-1', level: 'Beginner', question: 'Why do UART receivers typically oversample RX at 16x the baud rate?', answer: 'To detect the Start bit falling edge within 1/16th of a bit period and then sample the center of each subsequent data bit (8 ticks after edge, then every 16 ticks) for maximum noise margin.', keyTakeaway: '16x oversampling centers sampling at 50% bit width.' },
    ],
    sourceRef: 'TIA/EIA-232 & 16550 UART Architecture',
  },
  {
    id: 'ddr5',
    name: 'DDR5',
    fullName: 'JEDEC JESD79-5 DDR5 SDRAM',
    categoryId: 'memory',
    standardBody: 'JEDEC',
    specVersion: 'JESD79-5B (4800–8800 MT/s)',
    year: '2020–2024',
    tagline: 'Dual 32-bit sub-channel synchronous DRAM architecture with on-die ECC, DFE, and Command/Address parity.',
    popularityRank: 10,
    definition: 'DDR5 splits each 64-bit DIMM into two independent 32-bit (+8-bit ECC) addressable sub-channels, doubles bank groups to 8 (32 banks total), and integrates on-die ECC.',
    whyDeveloped: 'Core counts in server and desktop CPUs demanded higher concurrent channel efficiency and signal integrity at >=4.8 GT/s.',
    problemSolved: 'Doubles memory concurrency via dual independent 40-bit sub-channels and same-bank refresh (REFsb).',
    usedIn: ['Server/AI CPU main memory', 'High-performance workstation & laptop DIMMs'],
    advantages: ['2x independent 32b sub-channels per DIMM', 'Same-bank refresh hides refresh latency', '1.1V VDD with on-DIMM PMIC'],
    limitations: ['Complex DFE/CA training via DFI PHY interface', 'Strict tRFC/tFAW/tRCD timing constraints'],
    clockAndReset: 'Differential CK_t/CK_c up to 4.4 GHz (8800 MT/s DDR); active-LOW RESET_n.',
    dataFlow: '16-beat burst (BL16) on DQ[31:0] per sub-channel synchronous to bidirectional DQS_t/DQS_c.',
    controlFlow: '14-bit CA[13:0] Command/Address bus with CS_n framing.',
    specs: [
      { parameter: 'Data Rate', value: '4800 – 8800 MT/s per pin', classification: 'Official Standard Requirement', notes: 'Double data rate on DQS rising/falling edges.' },
      { parameter: 'Burst Length', value: 'BL16 (64 bytes per 32-bit sub-channel)', classification: 'Official Standard Requirement', notes: 'Matches single 64B CPU cache line.' },
      { parameter: 'Operating Voltage', value: '1.1 V VDD', classification: 'Official Standard Requirement', notes: 'PMIC moved onto DIMM.' },
    ],
    signals: [
      makeSig('CA[13:0]', 'Command/Address', '14', 'Manager -> Subordinate', '0', 'Multiplexed row/column command and address bus.', 'Sampled on CK_t rising (and falling for 2-cycle commands).', '// Enforce tRCD between ACT and RD/WR'),
      makeSig('DQ[31:0]', 'Data', '32', 'Bidirectional', 'Hi-Z', 'Bidirectional data bus per sub-channel.', 'Edge-aligned on reads, center-aligned on writes relative to DQS.', '// Verify write leveling DQS-to-CK skew'),
      makeSig('DQS_t/DQS_c', 'Data Strobe', '4', 'Bidirectional', 'Hi-Z', 'Differential data strobe per byte lane.', 'Includes programmable write/read preamble and postamble.', '// Check preamble prior to first DQ beat'),
    ],
    waveform: {
      id: 'ddr5-rd', name: 'DDR5 ACT -> tRCD -> RD -> RL -> BL16 Burst', category: 'Nominal', description: 'Row Activate followed by Read command after tRCD, returning DQS preamble and DQ beats after Read Latency (RL).', cycles: 10, clockName: 'CK_t',
      signals: [
        { name: 'CK_t', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'CA', type: 'bus', values: ['DES', 'ACT', 'DES', 'DES', 'RD', 'DES', 'DES', 'DES', 'DES', 'DES'] },
        { name: 'DQS_t', type: 'bit', values: [0, 0, 0, 0, 0, 0, 0, 1, 0, 1] },
        { name: 'DQ', type: 'bus', values: ['Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'D0..3', 'D4..7', 'D8..15'] },
      ],
      annotations: [{ cycle: 1, label: 'ACT opens row', severity: 'info' }, { cycle: 4, label: 'RD command after tRCD', severity: 'info' }, { cycle: 7, label: 'DQS & DQ return after RL', severity: 'info' }],
    },
    codeTitle: 'ddr5_bank_timer.sv',
    codeSnippet: `// Enforce tRCD_min cycles between Row ACT and Column RD/WR per bank
if (cmd_act) trcd_cnt[act_bank] <= tRCD_MIN;
else if (trcd_cnt[b] > 0) trcd_cnt[b] <= trcd_cnt[b] - 1'b1;`,
    svaSnippet: `assert property (@(posedge ck) cmd_rd |-> (trcd_cnt[rd_bank] == 0));`,
    interviewQuestions: [
      { id: 'ddr5-1', level: 'Intermediate', question: 'Why did DDR5 split a 64-bit DIMM into two 32-bit sub-channels and double burst length to BL16?', answer: '32 bits x BL16 = 512 bits = 64 bytes (one cache line) per sub-channel, doubling channel concurrency without enlarging cache-line access granularity.', keyTakeaway: '32b x BL16 = 64B cache line per independent sub-channel.' },
    ],
    sourceRef: 'JEDEC Standard JESD79-5B',
  },
  {
    id: 'chi',
    name: 'CHI',
    fullName: 'AMBA 5 Coherent Hub Interface',
    categoryId: 'coherency',
    standardBody: 'ARM Ltd.',
    specVersion: 'ARM IHI 0050F (AMBA 5 CHI)',
    year: '2014–2023',
    tagline: 'Packetized, layered, credit-based coherent Network-on-Chip protocol for multi-cluster CPU/accelerator SoCs.',
    popularityRank: 11,
    definition: 'CHI replaces AXI/ACE\'s wire-level channels with packetized flits across Request (REQ), Response (RSP), Snoop (SNP), and Data (DAT) virtual channels using Link-Layer credits (L-Credit).',
    whyDeveloped: 'ACE wire-level snooping does not scale beyond ~4–8 clusters due to point-to-point routing congestion and lack of packet routing.',
    problemSolved: 'Scales hardware cache coherency across 64–256+ cores over a mesh NoC using directory/snoop filters and Link-Credit flow control.',
    usedIn: ['ARM Neoverse server SoCs', 'Multi-cluster smartphone APs', 'Coherent NoC fabrics'],
    advantages: ['Scales to large mesh NoCs', 'L-Credit flow control decouples link timing', 'Supports DMT (Direct Memory Transfer) & DCT'],
    limitations: ['Complex protocol state machine (MOESI + transient states)', 'High verification effort'],
    clockAndReset: 'Synchronous CLK with Link Activation handshake (TXLINKACTIVEREQ / ACK).',
    dataFlow: 'Split-transaction 256/512-bit DAT flits routed via SrcID/TgtID.',
    controlFlow: 'L-Credit return flits govern REQ, RSP, SNP, DAT channel credits independently.',
    specs: [
      { parameter: 'Virtual Channels', value: 'REQ, RSP, SNP, DAT (4 channels)', classification: 'Official Standard Requirement', notes: 'Avoids protocol-level circular deadlock.' },
      { parameter: 'Flow Control', value: 'L-Credit (Link Credit) up to 15 credits/channel', classification: 'Official Standard Requirement', notes: 'Replaces VALID/READY backpressure across NoC hops.' },
    ],
    signals: [
      makeSig('TXREQFLITV', 'REQ Channel', '1', 'Manager -> Subordinate', '0', 'Indicates valid Request flit transmitted on TXREQFLIT.', 'Requires >=1 available REQ L-Credit.', 'assert property (@(posedge CLK) TXREQFLITV |-> (req_lcrd_cnt > 0));'),
      makeSig('TXREQLCRDV', 'REQ Channel', '1', 'Subordinate -> Manager', '0', 'Returns 1 REQ L-Credit to upstream transmitter.', 'Must not return more credits than max depth.', '// Credit conservation check'),
      makeSig('RXSNPFLITV', 'SNP Channel', '1', 'Subordinate -> Manager', '0', 'Delivers coherent snoop request from Home Node (HN-F) to Request Node (RN-F).', 'RN-F must respond with SnpResp / SnpRespData.', '// Snoop response completion watchdog'),
    ],
    waveform: {
      id: 'chi-read-dmt', name: 'CHI ReadShared with Direct Memory Transfer (DMT)', category: 'Nominal', description: 'RN-F sends ReadShared REQ; HN-F sends ReadNoSnp to SN-F; SN-F returns CompData directly to RN-F.', cycles: 8, clockName: 'CLK',
      signals: [
        { name: 'CLK', type: 'clock', values: [0, 1, 0, 1, 0, 1, 0, 1] },
        { name: 'TXREQFLITV', type: 'bit', values: [0, 1, 0, 0, 0, 0, 0, 0] },
        { name: 'TXREQFLIT', type: 'bus', values: ['-', 'RdShr', '-', '-', '-', '-', '-', '-'] },
        { name: 'RXDATFLITV', type: 'bit', values: [0, 0, 0, 0, 1, 1, 0, 0] },
        { name: 'RXDATFLIT', type: 'bus', values: ['-', '-', '-', '-', 'CompD0', 'CompD1', '-', '-'] },
      ],
      annotations: [{ cycle: 1, label: 'RN-F issues ReadShared', severity: 'info' }, { cycle: 4, label: 'CompData flits arrive directly from SN-F', severity: 'info' }],
    },
    codeTitle: 'chi_lcredit_pool.sv',
    codeSnippet: `// Track CHI L-Credits on Transmit Channel
always_ff @(posedge CLK or negedge RESETn) begin
  if (!RESETn) lcrd_avail <= '0;
  else        lcrd_avail <= lcrd_avail + rx_lcrdv - tx_flitv;
end`,
    svaSnippet: `assert property (@(posedge CLK) disable iff (!RESETn) tx_flitv |-> (lcrd_avail > 0));`,
    interviewQuestions: [
      { id: 'chi-1', level: 'Advanced', question: 'What is the difference between RN-F, HN-F, and SN-F in AMBA CHI?', answer: 'RN-F is a Fully Coherent Request Node (CPU cluster with cache), HN-F is a Fully Coherent Home Node (directory/snoop filter & SLC), and SN-F is a Subordinate Node (DRAM controller).', keyTakeaway: 'RN-F initiates, HN-F serializes coherency, SN-F backs memory.' },
    ],
    sourceRef: 'ARM IHI 0050F AMBA 5 CHI Specification',
  },
  {
    id: 'ucie',
    name: 'UCIe',
    fullName: 'Universal Chiplet Interconnect Express',
    categoryId: 'chip-to-chip',
    standardBody: 'UCIe Consortium',
    specVersion: 'UCIe Specification Rev 1.1 / 2.0',
    year: '2022–2024',
    tagline: 'Open die-to-die chiplet interconnect supporting PCIe, CXL, and Streaming protocols over FDI/RDI.',
    popularityRank: 12,
    definition: 'UCIe standardizes the physical die-to-die layer (Standard 2D and Advanced 2.5D CoWoS/EMIB packaging) and Raw/Flit-Aware Die-to-Die Interfaces (RDI/FDI) for multi-die SoCs.',
    whyDeveloped: 'Reticle limits and yield collapse on monolithic mega-dies forced SoC architects toward heterogeneous chiplet integration.',
    problemSolved: 'Delivers >1 Tbps/mm shoreline bandwidth density at <0.5 pJ/bit energy efficiency across chiplets.',
    usedIn: ['Multi-die server CPUs and AI accelerators', 'Disaggregated I/O + compute chiplets'],
    advantages: ['Open standard across foundries', 'Native PCIe 6.0 / CXL 3.0 Flit mapping on FDI', 'Per-lane redundancy/repair'],
    limitations: ['Tight shoreline bump-pitch constraints on 2.5D interposers'],
    clockAndReset: 'Forwarded-clock source-synchronous PHY (up to 32 GT/s/pin) with FDI/RDI pl_clk.',
    dataFlow: '256B Flits over FDI (lp_irdy/pl_trdy credit/valid handshake).',
    controlFlow: 'Adapter LSM (Link State Machine) manages Active, L1, L2, and LinkError.',
    specs: [
      { parameter: 'Pin Data Rate', value: '4, 8, 12, 16, 24, 32 GT/s per lane', classification: 'Official Standard Requirement', notes: 'NRZ signaling with forwarded clock.' },
      { parameter: 'Energy Efficiency Target', value: '< 0.5 pJ/bit (Standard) / < 0.25 pJ/bit (Advanced)', classification: 'Official Standard Requirement', notes: 'Orders of magnitude lower than long-reach SerDes.' },
    ],
    signals: [
      makeSig('lp_valid', 'FDI', '1', 'Manager -> Subordinate', '0', 'Protocol layer flit valid to D2D Adapter.', 'Combined with lp_irdy and pl_trdy.', 'assert property (@(posedge lclk) (lp_valid && !pl_trdy) |=> lp_valid);'),
      makeSig('pl_trdy', 'FDI', '1', 'Subordinate -> Manager', '0', 'D2D Adapter target ready for FDI flit.', 'Backpressures protocol layer.', '// Check credit return alignment'),
    ],
    waveform: {
      id: 'ucie-fdi', name: 'UCIe FDI Flit Handshake', category: 'Nominal', description: 'Protocol layer transfers 64B/256B flit chunks across FDI on (lp_valid && lp_irdy && pl_trdy).', cycles: 6, clockName: 'lclk',
      signals: [
        { name: 'lclk', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
        { name: 'lp_valid', type: 'bit', values: [0, 1, 1, 1, 0, 0] },
        { name: 'lp_irdy', type: 'bit', values: [0, 1, 1, 1, 0, 0] },
        { name: 'pl_trdy', type: 'bit', values: [1, 1, 0, 1, 1, 1] },
        { name: 'lp_data', type: 'bus', values: ['-', 'F0', 'F1', 'F1', '-', '-'] },
      ],
      annotations: [{ cycle: 2, label: 'pl_trdy=0 stalls F1', severity: 'warn' }],
    },
    codeTitle: 'ucie_fdi_tx.sv',
    codeSnippet: `wire fdi_hs = lp_valid && lp_irdy && pl_trdy;`,
    svaSnippet: `assert property (@(posedge lclk) (lp_valid && lp_irdy && !pl_trdy) |=> (lp_valid && $stable(lp_data)));`,
    interviewQuestions: [
      { id: 'ucie-1', level: 'Intermediate', question: 'What is the difference between FDI and RDI in UCIe?', answer: 'FDI (Flit-Aware Die-to-Die Interface) sits between the Protocol Layer and the D2D Adapter, whereas RDI (Raw Die-to-Die Interface) sits between the D2D Adapter and the Physical Layer.', keyTakeaway: 'Protocol <-> FDI <-> Adapter <-> RDI <-> PHY.' },
    ],
    sourceRef: 'UCIe Specification Rev 1.1',
  },
  {
    id: 'tl-ul',
    name: 'TL-UL',
    fullName: 'TileLink Uncached Lightweight (with OpenTitan Integrity)',
    categoryId: 'security',
    standardBody: 'SiFive / CHIPS Alliance / lowRISC OpenTitan',
    specVersion: 'TileLink Spec 1.8.1 + OpenTitan Bus Integrity',
    year: '2017–2024',
    tagline: 'Lightweight two-channel (A/D) non-cached memory-mapped bus used across RISC-V SoCs and OpenTitan security enclaves.',
    popularityRank: 13,
    definition: 'TL-UL is the minimal conformance level of TileLink supporting single-beat Get and Put operations over A (Request) and D (Response) channels, hardened in OpenTitan with ECC/SECDED integrity bits.',
    whyDeveloped: 'Provide an open-source, formally specified RISC-V peripheral bus supporting end-to-end fault-injection integrity detection.',
    problemSolved: 'Detects physical glitching / bit-flips on address, command, and data buses inside Hardware Roots of Trust.',
    usedIn: ['OpenTitan EarlGrey / Darjeeling security chips', 'RISC-V Rocket Chip / Ibex SoC peripherals'],
    advantages: ['Only 2 channels (A and D)', 'Supports end-to-end SECDED integrity in OpenTitan', 'Open specification'],
    limitations: ['No burst transfers in TL-UL (use TL-UH)', 'No cache coherency (use TL-C)'],
    clockAndReset: 'Rising-edge clk_i; active-LOW rst_ni.',
    dataFlow: '32-bit/64-bit PutFullData/PutPartialData on A channel; AccessAck/AccessAckData on D channel.',
    controlFlow: 'valid/ready handshake on A and D channels.',
    specs: [
      { parameter: 'Channels', value: 'Channel A (Request) & Channel D (Response)', classification: 'Official Standard Requirement', notes: 'B, C, E channels unused in TL-UL.' },
      { parameter: 'Integrity Bits (OpenTitan)', value: 'cmd_intg[6:0], data_intg[6:0]', classification: 'Implementation Practice', notes: '7-bit ECC over command/address and data payloads.' },
    ],
    signals: [
      makeSig('a_valid', 'Channel A', '1', 'Manager -> Subordinate', '0', 'Valid request on Channel A.', 'Must remain high until a_ready=1.', 'assert property (@(posedge clk_i) (a_valid && !a_ready) |=> a_valid);'),
      makeSig('a_opcode', 'Channel A', '3', 'Manager -> Subordinate', '0', '0=PutFullData, 1=PutPartialData, 4=Get.', 'Other opcodes illegal in TL-UL.', 'assert property (@(posedge clk_i) a_valid |-> (a_opcode inside {3\'d0, 3\'d1, 3\'d4}));'),
      makeSig('d_valid', 'Channel D', '1', 'Subordinate -> Manager', '0', 'Valid AccessAck or AccessAckData on Channel D.', 'Includes d_error and data_intg.', 'assert property (@(posedge clk_i) (d_valid && !d_ready) |=> d_valid);'),
    ],
    waveform: {
      id: 'tlul-get', name: 'TL-UL Get (Read) Transaction', category: 'Nominal', description: 'Manager sends Get (opcode=4) on A channel; Subordinate returns AccessAckData (opcode=1) on D channel.', cycles: 6, clockName: 'clk_i',
      signals: [
        { name: 'clk_i', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
        { name: 'a_valid', type: 'bit', values: [0, 1, 0, 0, 0, 0] },
        { name: 'a_ready', type: 'bit', values: [1, 1, 1, 1, 1, 1] },
        { name: 'a_opcode', type: 'bus', values: ['-', 'Get', '-', '-', '-', '-'] },
        { name: 'd_valid', type: 'bit', values: [0, 0, 0, 1, 0, 0] },
        { name: 'd_ready', type: 'bit', values: [1, 1, 1, 1, 1, 1] },
        { name: 'd_data', type: 'bus', values: ['-', '-', '-', 'BEEF', '-', '-'] },
      ],
      annotations: [{ cycle: 1, label: 'Channel A Get handshake', severity: 'info' }, { cycle: 3, label: 'Channel D AccessAckData', severity: 'info' }],
    },
    codeTitle: 'tlul_integrity_check.sv',
    codeSnippet: `// OpenTitan TL-UL request integrity verification
assign intg_err = a_valid && (secded_enc(a_cmd) != a_user.cmd_intg);`,
    svaSnippet: `assert property (@(posedge clk_i) disable iff (!rst_ni) a_valid |-> (a_opcode inside {0, 1, 4}));`,
    interviewQuestions: [
      { id: 'tlul-1', level: 'Intermediate', question: 'Why does OpenTitan add cmd_intg and data_intg to TL-UL instead of relying solely on parity?', answer: 'Single-bit parity cannot detect even-bit flips or correct/detect targeted fault injection (laser/voltage glitching). OpenTitan uses 7-bit Hsiao SECDED ECC across command and data paths to trigger fatal security alerts on tampering.', keyTakeaway: 'SECDED protects against multi-bit physical fault injection.' },
    ],
    sourceRef: 'SiFive TileLink 1.8.1 & OpenTitan Bus Integrity Spec',
  },
];

// Generate structured entries for remaining taxonomy IDs so every single card in all 10 categories opens a real page
const EXTRA_TAXONOMY: Array<{ id: string; name: string; fullName: string; categoryId: CategoryId; std: string; tagline: string; def: string }> = [
  { id: 'axi3', name: 'AXI3', fullName: 'AMBA 3 AXI', categoryId: 'amba', std: 'ARM IHI 0022B', tagline: '5-channel AMBA 3 bus with 4-bit AxLEN (16 beats) and WID write interleaving.', def: 'Predecessor to AXI4 featuring 4-bit burst lengths (up to 16 beats), 2-bit AxLOCK, and WID write data interleaving.' },
  { id: 'ace', name: 'ACE', fullName: 'AXI Coherency Extensions', categoryId: 'coherency', std: 'ARM IHI 0022E', tagline: 'Adds AC/CR/CD snoop channels to AXI4 for hardware-coherent big.LITTLE clusters.', def: 'Extends AXI4 with 3 snoop channels (AC, CR, CD) to maintain cache coherency across heterogeneous ARM CPU clusters and I/O coherent masters.' },
  { id: 'ddr4', name: 'DDR4', fullName: 'JEDEC JESD79-4 DDR4 SDRAM', categoryId: 'memory', std: 'JEDEC JESD79-4', tagline: '64-bit single-channel SDRAM (1600–3200 MT/s) with 4 bank groups and 1.2V VDD.', def: 'Fourth-generation DDR SDRAM introducing bank groups (16 banks total), POD12 signaling, and CRC/DBI.' },
  { id: 'ddr3', name: 'DDR3', fullName: 'JEDEC JESD79-3 DDR3 SDRAM', categoryId: 'memory', std: 'JEDEC JESD79-3', tagline: '1.5V SDRAM (800–2133 MT/s) with 8n prefetch and fly-by command/address topology.', def: 'Third-generation DDR SDRAM using 8-bank architecture and fly-by CA routing with write leveling.' },
  { id: 'lpddr5', name: 'LPDDR5', fullName: 'JEDEC JESD209-5 Low-Power DDR5', categoryId: 'memory', std: 'JEDEC JESD209-5', tagline: 'Mobile/edge DRAM up to 6400 MT/s with separate WCK write clock and DVFS power states.', def: 'Low-power mobile SDRAM decoupling command clock (CK) from high-speed data clock (WCK) with Deep Sleep modes.' },
  { id: 'lpddr4', name: 'LPDDR4', fullName: 'JEDEC JESD209-4 Low-Power DDR4', categoryId: 'memory', std: 'JEDEC JESD209-4', tagline: 'Dual-channel 16-bit low-voltage (1.1V VDDQ) mobile DRAM with LVSTL I/O.', def: 'Mobile DRAM using two independent 16-bit channels per die and Low-Voltage Swing Terminated Logic.' },
  { id: 'hbm3', name: 'HBM3', fullName: 'JEDEC JESD238 High Bandwidth Memory 3', categoryId: 'memory', std: 'JEDEC JESD238', tagline: '3D-stacked TSV DRAM delivering 819+ GB/s over a 1024-bit silicon interposer interface.', def: '2.5D/3D stacked DRAM using 16 independent 64-bit pseudo-channels across a 1024-bit wide interposer bus for AI/HPC GPUs.' },
  { id: 'sram', name: 'SRAM Interface', fullName: 'Synchronous On-Chip & QDR SRAM Interface', categoryId: 'memory', std: 'Foundry Macro / QDR Consortium', tagline: 'Single-cycle deterministic Chip-Enable / Write-Enable / Byte-Mask memory macro interface.', def: 'Deterministic synchronous memory interface (CE_N, WE_N, BWE_N, ADDR, DIN, DOUT) used inside SoC caches and scratchpads.' },
  { id: 'qspi', name: 'QSPI', fullName: 'Quad Serial Peripheral Interface', categoryId: 'memory', std: 'JEDEC JESD216 / Vendor', tagline: '4-lane bidirectional IO[3:0] serial flash interface supporting Execute-in-Place (XIP).', def: 'Extends standard SPI to 4 parallel bidirectional data lines (IO0–IO3) with DDR clocking and XIP memory-mapped reads.' },
  { id: 'i3c', name: 'I3C', fullName: 'MIPI Improved Inter-Integrated Circuit', categoryId: 'peripheral', std: 'MIPI Alliance v1.1.1', tagline: '12.5 MHz push-pull 2-wire sensor bus backward-compatible with I2C plus in-band interrupts.', def: 'Upgrades I2C with dynamic address assignment (DAA), push-pull 12.5 MHz SDR/HDR transfers, and In-Band Interrupts (IBI).' },
  { id: 'gpio', name: 'GPIO', fullName: 'General-Purpose Input/Output Pad Interface', categoryId: 'peripheral', std: 'SoC Padring Standard', tagline: 'Software-configurable digital I/O pins with direction, pull-up/down, slew, and edge-interrupt logic.', def: 'Memory-mapped APB/AHB peripheral controlling bidirectional pad cells (`OEN`, `I`, `O`, interrupt mask/status).' },
  { id: 'pcie-gen6', name: 'PCIe Gen6', fullName: 'PCI Express Base Specification Rev 6.0', categoryId: 'high-speed', std: 'PCI-SIG 6.0', tagline: '64.0 GT/s PAM4 SerDes interconnect with 256B fixed Flit mode, lightweight FEC, and L0p.', def: 'Doubles Gen5 bandwidth to 64 GT/s per lane using PAM4 (4-level) modulation, fixed 256-byte Flits, and forward error correction.' },
  { id: 'usb4', name: 'USB4', fullName: 'USB4 Specification (40 / 80 Gbps)', categoryId: 'high-speed', std: 'USB-IF USB4 v2.0', tagline: 'Thunderbolt-derived tunneled fabric carrying USB3, DisplayPort, and PCIe over USB-C.', def: 'Connection-oriented packetized fabric tunneling PCIe, DisplayPort, and USB 3.2 traffic over dual-lane 20/40/80 Gbps links.' },
  { id: 'usb3', name: 'USB 3.x', fullName: 'USB 3.2 SuperSpeed (5 / 10 / 20 Gbps)', categoryId: 'high-speed', std: 'USB-IF USB 3.2', tagline: 'Dual-simplex SuperSpeed serial bus using 8b/10b (Gen1) or 128b/132b (Gen2) over PIPE.', def: 'High-speed host-centric peripheral interconnect with LTSSM link states (U0–U3) and asynchronous endpoints.' },
  { id: 'sata', name: 'SATA', fullName: 'Serial ATA Revision 3.x (6.0 Gbps)', categoryId: 'high-speed', std: 'SATA-IO', tagline: '8b/10b point-to-point storage SerDes carrying FIS frames between AHCI host and SSD/HDD.', def: 'High-speed storage transport using Out-of-Band (OOB) COMINIT/COMWAKE link bring-up and Frame Information Structures (FIS).' },
  { id: 'cxl', name: 'CXL', fullName: 'Compute Express Link 3.0', categoryId: 'chip-to-chip', std: 'CXL Consortium', tagline: 'Coherent memory expansion & accelerator attach running CXL.io, CXL.cache, and CXL.mem over PCIe PHY.', def: 'Maintains cache coherency between host CPUs and PCIe-attached memory expanders or accelerators using 3 sub-protocols.' },
  { id: 'bow', name: 'BoW', fullName: 'Bunch of Wires Die-to-Die Interface', categoryId: 'chip-to-chip', std: 'OCP ODSA', tagline: 'Simple, low-latency parallel source-synchronous chiplet interface optimized for organic & laminate packages.', def: 'Open Compute Project parallel die-to-die physical interface using unidirectional 16-wire slices with forwarded clock.' },
  { id: 'axi-noc', name: 'AXI NoC', fullName: 'Packetized AXI Network-on-Chip', categoryId: 'noc', std: 'SoC Architecture Standard', tagline: 'Wormhole-routed on-die mesh serializing AXI4 channels into virtual-channel NoC flits.', def: 'Translates AXI4 transactions into packetized flits across 2D mesh/ring routers with QoS virtual channels and CDC bridges.' },
  { id: 'tilelink', name: 'TileLink', fullName: 'TileLink Coherent Chip-Scale Interconnect (TL-C)', categoryId: 'noc', std: 'CHIPS Alliance 1.8.1', tagline: 'Open-source 5-channel (A/B/C/D/E) coherent on-chip bus designed for RISC-V multi-core SoCs.', def: 'Provides deadlock-free hierarchical cache coherency (Acquire/Probe/Release/Grant/Finish) with formal verification support.' },
  { id: 'mesi', name: 'MESI', fullName: 'Modified-Exclusive-Shared-Invalid Coherency Protocol', categoryId: 'coherency', std: 'Classic Snooping / Directory Standard', tagline: '4-state write-invalidate cache coherency protocol avoiding bus broadcasts on private writes.', def: 'Tracks cache line ownership across Modified, Exclusive, Shared, and Invalid states so clean private lines upgrade to M silently.' },
  { id: 'moesi', name: 'MOESI', fullName: 'Modified-Owned-Exclusive-Shared-Invalid Protocol', categoryId: 'coherency', std: 'AMD / ARM Coherency Standard', tagline: '5-state coherency adding Owned (O) state for direct cache-to-cache dirty sharing without DRAM writeback.', def: 'Extends MESI with the Owned state so dirty shared cache lines can be served directly to peer caches without immediate memory writeback.' },
  { id: 'jtag', name: 'JTAG', fullName: 'IEEE 1149.1 Boundary Scan & Debug TAP', categoryId: 'debug', std: 'IEEE 1149.1', tagline: '4/5-pin Test Access Port (TCK, TMS, TDI, TDO, TRSTn) driving a 16-state TAP controller FSM.', def: 'Industry-standard serial test and debug interface used for PCB boundary scan, DFT scan chain loading, and CPU debug.' },
  { id: 'swd', name: 'SWD', fullName: 'ARM Serial Wire Debug', categoryId: 'debug', std: 'ARM CoreSight ADIv5/6', tagline: '2-pin (SWCLK, SWDIO) bidirectional packet debug port replacing 4-pin JTAG on pin-limited MCUs.', def: 'Half-duplex bidirectional synchronous debug wire using 8-bit request packets, 3-bit ACK, and 32-bit data + parity.' },
  { id: 'riscv-debug', name: 'RISC-V Debug', fullName: 'RISC-V Debug Specification (DTM / DMI / DM)', categoryId: 'debug', std: 'RISC-V International v1.0', tagline: 'Layered Debug Transport Module -> Debug Module Interface -> Hart halt/resume and abstract commands.', def: 'Decouples JTAG/USB transport from the Debug Module via DMI register reads/writes for multi-hart RISC-V debugging.' },
  { id: 'tl-ul-integrity', name: 'TL-UL Integrity', fullName: 'OpenTitan Hardened TileLink Integrity Extension', categoryId: 'security', std: 'lowRISC OpenTitan', tagline: 'End-to-end Hsiao SECDED ECC and command/data poisoning across secure SoC fabrics.', def: 'Extends TL-UL user bits with integrity ECC computed at the initiator and checked at every crossbar hop and target.' },
  { id: 'entropy-if', name: 'Entropy Interface', fullName: 'CSPRNG / TRNG Entropy Distribution Handshake', categoryId: 'security', std: 'NIST SP 800-90 / OpenTitan', tagline: 'Valid/Ready hardware entropy delivery interface with FIPS health-check and reseed status flags.', def: 'Standardized cryptographic seed request/ack handshake feeding AES, HMAC, OTBN, and KMAC blocks from hardware CSRNG.' },
  { id: 'obi', name: 'OBI', fullName: 'OpenHW Open Bus Interface', categoryId: 'processor', std: 'OpenHW Group v1.6', tagline: 'Minimalist 2-phase (Address + Response) low-latency bus for embedded RISC-V cores (CV32E40P).', def: 'Simple req/gnt address phase paired with rvalid response phase enabling single-cycle instruction fetch and load/store.' },
  { id: 'cv-x-if', name: 'CV-X-IF', fullName: 'Core-V eXtension Interface', categoryId: 'processor', std: 'OpenHW Group CV-X-IF', tagline: 'Standardized custom instruction offload interface connecting RISC-V CPUs to external coprocessors.', def: 'Allows RISC-V cores to offload custom opcodes, source operands, and speculative commit signals to external AI/crypto accelerators.' },
  { id: 'riscv-tilelink', name: 'RISC-V TileLink', fullName: 'TileLink Processor Cache & RoCC Interface', categoryId: 'processor', std: 'CHIPS Alliance', tagline: 'Native L1 I$/D$ refill and coherent RoCC accelerator interconnect for Rocket/BOOM cores.', def: 'Connects RISC-V L1 caches directly to coherent L2/L3 banks over TL-C Get/Acquire/Release transactions.' },
];

const EXTRA_PROTOCOLS: ProtocolDocument[] = EXTRA_TAXONOMY.map((item, idx) =>
  buildBriefDoc({
    id: item.id,
    name: item.name,
    fullName: item.fullName,
    categoryId: item.categoryId,
    standardBody: item.std,
    specVersion: item.std,
    year: 'Standard',
    tagline: item.tagline,
    popularityRank: 14 + idx,
    definition: item.def,
    whyDeveloped: `Engineered to satisfy ${item.categoryId} latency, bandwidth, and silicon efficiency constraints in modern SoCs.`,
    problemSolved: item.tagline,
    usedIn: ['Enterprise / Edge SoCs', 'ASIC Subsystems', 'FPGA / Verification Platforms'],
    advantages: [`Standardized under ${item.std}`, 'Predictable timing & verification closure'],
    limitations: ['Requires strict compliance checking against target conformance profile'],
    clockAndReset: 'Synchronous reference clock or source-synchronous lane clock with active-LOW reset.',
    dataFlow: 'Structured frame/packet or phase-pipelined data payload transfer.',
    controlFlow: 'Deterministic handshake or credit-based backpressure.',
    specs: [
      { parameter: 'Authority / Specification', value: item.std, classification: 'Official Standard Requirement', notes: 'Consult primary specification for electrical and timing limits.' },
      { parameter: 'Protocol Role', value: item.tagline, classification: 'Implementation Practice', notes: 'Verify target bus width and clock frequency against SoC spec.' },
    ],
    signals: [
      makeSig('REQ / VALID', 'Control', '1', 'Manager -> Subordinate', '0', 'Indicates valid request or frame start.', 'Held stable until ACK / READY.', '// Check VALID stability during stall'),
      makeSig('ACK / READY', 'Control', '1', 'Subordinate -> Manager', '1', 'Indicates target readiness or completion.', 'Synchronous to interface clock.', '// Verify bounded response latency'),
      makeSig('DATA / PAYLOAD', 'Data', 'Configurable', 'Bidirectional', '0', 'Primary address/data payload.', 'Stable during valid handshake.', '// Verify $stable(payload) under stall'),
    ],
    waveform: {
      id: `${item.id}-nom`,
      name: `${item.name} Nominal Request & Response`,
      category: 'Nominal',
      description: `Representative cycle-accurate ${item.name} transfer sequence.`,
      cycles: 6,
      clockName: 'CLK',
      signals: [
        { name: 'CLK', type: 'clock', values: [0, 1, 0, 1, 0, 1] },
        { name: 'VALID', type: 'bit', values: [0, 1, 1, 0, 0, 0] },
        { name: 'READY', type: 'bit', values: [1, 0, 1, 1, 1, 1] },
        { name: 'PAYLOAD', type: 'bus', values: ['-', 'REQ0', 'REQ0', 'RESP', '-', '-'] },
      ],
      annotations: [{ cycle: 2, label: 'Transfer accepted on VALID && READY', severity: 'info' }],
    },
    codeTitle: `${item.id.replace(/-/g, '_')}_if.sv`,
    codeSnippet: `// ${item.name} Interface Skeleton\ninterface ${item.id.replace(/-/g, '_')}_if (input logic clk, input logic rst_n);\n  logic        valid;\n  logic        ready;\n  logic [31:0] payload;\nendinterface`,
    svaSnippet: `assert property (@(posedge clk) disable iff (!rst_n) (valid && !ready) |=> (valid && $stable(payload)));`,
    interviewQuestions: [
      {
        id: `${item.id}-iq-1`,
        level: 'Intermediate',
        question: `What architectural problem does ${item.name} solve inside an SoC?`,
        answer: item.def,
        keyTakeaway: item.tagline,
      },
    ],
    sourceRef: item.std,
  })
);

export const ADDITIONAL_PROTOCOLS: ProtocolDocument[] = [
  ...SEEDS.map(buildBriefDoc),
  ...EXTRA_PROTOCOLS,
];
