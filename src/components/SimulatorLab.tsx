import React, { useMemo, useState } from 'react';
import { WaveformScenario } from '../types/protocol';
import { WaveformViewer } from './WaveformViewer';

export type SimProtocolId = 'axi4' | 'axi4-lite' | 'axi4-stream' | 'apb' | 'uart' | 'spi' | 'i2c';

interface SimulatorLabProps {
  initialProtocol?: string;
}

const SIM_PROTOCOLS: Array<{ id: SimProtocolId; label: string; subtitle: string }> = [
  { id: 'axi4', label: 'AXI4 Handshake', subtitle: 'Burst + AW/W/B or AR/R + Wait States' },
  { id: 'axi4-lite', label: 'AXI4-Lite R/W', subtitle: 'Single-Beat CSR with AW/W Skew' },
  { id: 'axi4-stream', label: 'AXI4-Stream', subtitle: 'TVALID/TREADY Packet + TLAST' },
  { id: 'apb', label: 'APB4 Read/Write', subtitle: 'IDLE -> SETUP -> ACCESS + PREADY' },
  { id: 'uart', label: 'UART 8N1/8E1', subtitle: 'Start + 8 Data + Parity + Stop' },
  { id: 'spi', label: 'SPI Modes 0–3', subtitle: 'CPOL/CPHA Edge Shift & Sample' },
  { id: 'i2c', label: 'I2C Frame', subtitle: 'START + 7b Addr + ACK/NACK + STOP' },
];

export const SimulatorLab: React.FC<SimulatorLabProps> = ({ initialProtocol }) => {
  const validInitial = SIM_PROTOCOLS.some((p) => p.id === initialProtocol)
    ? (initialProtocol as SimProtocolId)
    : 'axi4';

  const [simProto, setSimProto] = useState<SimProtocolId>(validInitial);
  const [opType, setOpType] = useState<'write' | 'read'>('write');
  const [addrHex, setAddrHex] = useState('1000');
  const [dataHex, setDataHex] = useState('A5');
  const [burstBeats, setBurstBeats] = useState(4);
  const [waitStates, setWaitStates] = useState(1);
  const [awSkew, setAwSkew] = useState(0);
  const [spiMode, setSpiMode] = useState<0 | 1 | 2 | 3>(0);
  const [uartParity, setUartParity] = useState<'none' | 'even'>('none');
  const [i2cAck, setI2cAck] = useState<boolean>(true);

  const scenario: WaveformScenario = useMemo(() => {
    const cleanAddr = (addrHex || '1000').toUpperCase().slice(0, 4);
    const baseByte = parseInt(dataHex || 'A5', 16) || 0xa5;

    if (simProto === 'axi4') {
      const beats = Math.max(1, Math.min(6, burstBeats));
      const stall = Math.max(0, Math.min(3, waitStates));
      if (opType === 'write') {
        const cycles = 4 + beats + stall + 2;
        const clk = Array.from({ length: cycles }, (_, i) => (i % 2 === 1 ? 1 : 0));
        const awv = Array(cycles).fill(0);
        const awr = Array(cycles).fill(1);
        const awaddr = Array(cycles).fill('-');
        const wv = Array(cycles).fill(0);
        const wr = Array(cycles).fill(1);
        const wdata = Array(cycles).fill('-');
        const wlast = Array(cycles).fill(0);
        const bv = Array(cycles).fill(0);
        const br = Array(cycles).fill(1);
        const bresp = Array(cycles).fill('-');

        awv[1] = 1;
        awaddr[1] = cleanAddr;
        const wStart = 2 + awSkew;
        let idx = wStart;
        const annotations: WaveformScenario['annotations'] = [
          { cycle: 1, label: `AW handshake: Addr 0x${cleanAddr}, AWLEN=${beats - 1}`, severity: 'info' },
        ];

        for (let b = 0; b < beats; b++) {
          const valHex = `D${b}_${((baseByte + b) & 0xff).toString(16).toUpperCase().padStart(2, '0')}`;
          if (b === 1 && stall > 0) {
            for (let s = 0; s < stall; s++) {
              wv[idx] = 1;
              wr[idx] = 0;
              wdata[idx] = valHex;
              annotations.push({ cycle: idx, label: 'Backpressure: WREADY=0 holds WDATA stable', severity: 'warn' });
              idx++;
            }
          }
          if (idx < cycles) {
            wv[idx] = 1;
            wr[idx] = 1;
            wdata[idx] = valHex;
            if (b === beats - 1) wlast[idx] = 1;
            idx++;
          }
        }
        if (idx < cycles) {
          bv[idx] = 1;
          bresp[idx] = 'OKAY';
          annotations.push({ cycle: idx, label: 'BRESP=OKAY completes write burst', severity: 'info' });
        }

        return {
          id: 'sim-axi4-wr',
          name: `AXI4 ${beats}-Beat Write Burst (Wait States=${stall})`,
          category: stall > 0 ? 'Backpressure' : 'Burst',
          description: `Generated AXI4 write burst to 0x${cleanAddr} with AWLEN=${beats - 1}. Click "Edit VALID/READY" to inject stalls or rule violations.`,
          cycles,
          clockName: 'ACLK',
          signals: [
            { name: 'ACLK', type: 'clock', values: clk },
            { name: 'AWVALID', type: 'bit', values: awv },
            { name: 'AWREADY', type: 'bit', values: awr },
            { name: 'AWADDR', type: 'bus', values: awaddr },
            { name: 'WVALID', type: 'bit', values: wv },
            { name: 'WREADY', type: 'bit', values: wr },
            { name: 'WDATA', type: 'bus', values: wdata },
            { name: 'WLAST', type: 'bit', values: wlast },
            { name: 'BVALID', type: 'bit', values: bv },
            { name: 'BREADY', type: 'bit', values: br },
            { name: 'BRESP', type: 'bus', values: bresp },
          ],
          annotations,
        };
      } else {
        const cycles = 4 + beats + stall + 1;
        const clk = Array.from({ length: cycles }, (_, i) => (i % 2 === 1 ? 1 : 0));
        const arv = Array(cycles).fill(0);
        const arr = Array(cycles).fill(1);
        const araddr = Array(cycles).fill('-');
        const rv = Array(cycles).fill(0);
        const rr = Array(cycles).fill(1);
        const rdata = Array(cycles).fill('-');
        const rlast = Array(cycles).fill(0);

        arv[1] = 1;
        araddr[1] = cleanAddr;
        let idx = 3;
        const annotations: WaveformScenario['annotations'] = [
          { cycle: 1, label: `AR handshake: Read ${beats} beats from 0x${cleanAddr}`, severity: 'info' },
        ];
        for (let b = 0; b < beats; b++) {
          const valHex = `Q${b}_${((baseByte + b) & 0xff).toString(16).toUpperCase().padStart(2, '0')}`;
          if (b === 1 && stall > 0) {
            for (let s = 0; s < stall; s++) {
              rv[idx] = 1;
              rr[idx] = 0;
              rdata[idx] = valHex;
              annotations.push({ cycle: idx, label: 'Manager pulls RREADY=0; RDATA held stable', severity: 'warn' });
              idx++;
            }
          }
          if (idx < cycles) {
            rv[idx] = 1;
            rr[idx] = 1;
            rdata[idx] = valHex;
            if (b === beats - 1) rlast[idx] = 1;
            idx++;
          }
        }
        return {
          id: 'sim-axi4-rd',
          name: `AXI4 ${beats}-Beat Read Burst (RREADY Stall=${stall})`,
          category: 'Burst',
          description: `Generated AXI4 read burst from 0x${cleanAddr} with ARLEN=${beats - 1}.`,
          cycles,
          clockName: 'ACLK',
          signals: [
            { name: 'ACLK', type: 'clock', values: clk },
            { name: 'ARVALID', type: 'bit', values: arv },
            { name: 'ARREADY', type: 'bit', values: arr },
            { name: 'ARADDR', type: 'bus', values: araddr },
            { name: 'RVALID', type: 'bit', values: rv },
            { name: 'RREADY', type: 'bit', values: rr },
            { name: 'RDATA', type: 'bus', values: rdata },
            { name: 'RLAST', type: 'bit', values: rlast },
          ],
          annotations,
        };
      }
    }

    if (simProto === 'axi4-lite') {
      const cycles = 8;
      const clk = Array.from({ length: cycles }, (_, i) => (i % 2 === 1 ? 1 : 0));
      const awv = [0, 1, 0, 0, 0, 0, 0, 0];
      const awr = [1, 1, 1, 1, 1, 1, 1, 1];
      const wv = Array(cycles).fill(0);
      const wPos = Math.min(4, 1 + awSkew);
      wv[wPos] = 1;
      const wr = [1, 1, 1, 1, 1, 1, 1, 1];
      const bv = Array(cycles).fill(0);
      const bPos = Math.max(1, wPos) + 1;
      bv[bPos] = 1;
      const awaddr = Array(cycles).fill('-');
      awaddr[1] = cleanAddr;
      const wdata = Array(cycles).fill('-');
      wdata[wPos] = `0x${baseByte.toString(16).toUpperCase().padStart(2, '0')}`;
      const bresp = Array(cycles).fill('-');
      bresp[bPos] = 'OKAY';

      return {
        id: 'sim-axil',
        name: `AXI4-Lite Single-Beat Write (W Skew = +${awSkew} cycles)`,
        category: 'Nominal',
        description: 'Demonstrates decoupled AW and W arrivals before BVALID response.',
        cycles,
        clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: clk },
          { name: 'AWVALID', type: 'bit', values: awv },
          { name: 'AWREADY', type: 'bit', values: awr },
          { name: 'AWADDR', type: 'bus', values: awaddr },
          { name: 'WVALID', type: 'bit', values: wv },
          { name: 'WREADY', type: 'bit', values: wr },
          { name: 'WDATA', type: 'bus', values: wdata },
          { name: 'BVALID', type: 'bit', values: bv },
          { name: 'BREADY', type: 'bit', values: [1, 1, 1, 1, 1, 1, 1, 1] },
          { name: 'BRESP', type: 'bus', values: bresp },
        ],
        annotations: [
          { cycle: 1, label: 'AW handshake latches target CSR address', severity: 'info' },
          { cycle: wPos, label: 'W handshake latches WDATA', severity: 'info' },
          { cycle: bPos, label: 'BVALID returns OKAY after both phases settle', severity: 'info' },
        ],
      };
    }

    if (simProto === 'axi4-stream') {
      const beats = Math.max(1, Math.min(6, burstBeats));
      const stall = Math.max(0, Math.min(3, waitStates));
      const cycles = 3 + beats + stall;
      const clk = Array.from({ length: cycles }, (_, i) => (i % 2 === 1 ? 1 : 0));
      const tv = Array(cycles).fill(0);
      const tr = Array(cycles).fill(1);
      const td = Array(cycles).fill('-');
      const tl = Array(cycles).fill(0);
      const annotations: WaveformScenario['annotations'] = [];

      let idx = 1;
      for (let b = 0; b < beats; b++) {
        const label = `P${b}_${((baseByte + b) & 0xff).toString(16).toUpperCase().padStart(2, '0')}`;
        if (b === 1 && stall > 0) {
          for (let s = 0; s < stall; s++) {
            tv[idx] = 1;
            tr[idx] = 0;
            td[idx] = label;
            annotations.push({ cycle: idx, label: 'Receiver TREADY=0 stalls stream', severity: 'warn' });
            idx++;
          }
        }
        tv[idx] = 1;
        tr[idx] = 1;
        td[idx] = label;
        if (b === beats - 1) {
          tl[idx] = 1;
          annotations.push({ cycle: idx, label: 'TLAST=1 marks packet boundary', severity: 'info' });
        }
        idx++;
      }

      return {
        id: 'sim-axis',
        name: `AXI4-Stream ${beats}-Beat Packet (Backpressure=${stall})`,
        category: stall > 0 ? 'Backpressure' : 'Nominal',
        description: 'Unaddressed packet transfer with TLAST framing and TREADY backpressure.',
        cycles,
        clockName: 'ACLK',
        signals: [
          { name: 'ACLK', type: 'clock', values: clk },
          { name: 'TVALID', type: 'bit', values: tv },
          { name: 'TREADY', type: 'bit', values: tr },
          { name: 'TDATA', type: 'bus', values: td },
          { name: 'TLAST', type: 'bit', values: tl },
        ],
        annotations,
      };
    }

    if (simProto === 'apb') {
      const stall = Math.max(0, Math.min(3, waitStates));
      const cycles = 5 + stall;
      const clk = Array.from({ length: cycles }, (_, i) => (i % 2 === 1 ? 1 : 0));
      const psel = Array(cycles).fill(0);
      const pen = Array(cycles).fill(0);
      const pwr = Array(cycles).fill(opType === 'write' ? 1 : 0);
      const pready = Array(cycles).fill(1);
      const paddr = Array(cycles).fill('-');
      const pwdata = Array(cycles).fill('-');
      const prdata = Array(cycles).fill('-');

      psel[1] = 1;
      pen[1] = 0;
      paddr[1] = cleanAddr;
      if (opType === 'write') pwdata[1] = baseByte.toString(16).toUpperCase().padStart(2, '0');

      const annotations: WaveformScenario['annotations'] = [
        { cycle: 1, label: 'SETUP Phase (PSEL=1, PENABLE=0)', severity: 'info' },
      ];

      for (let k = 0; k <= stall; k++) {
        const c = 2 + k;
        psel[c] = 1;
        pen[c] = 1;
        paddr[c] = cleanAddr;
        if (opType === 'write') pwdata[c] = baseByte.toString(16).toUpperCase().padStart(2, '0');
        if (k < stall) {
          pready[c] = 0;
          annotations.push({ cycle: c, label: 'ACCESS Wait State (PREADY=0)', severity: 'warn' });
        } else {
          pready[c] = 1;
          if (opType === 'read') prdata[c] = baseByte.toString(16).toUpperCase().padStart(2, '0');
          annotations.push({ cycle: c, label: 'ACCESS Complete (PREADY=1)', severity: 'info' });
        }
      }

      return {
        id: 'sim-apb',
        name: `APB4 ${opType.toUpperCase()} Transfer (${stall} Wait States)`,
        category: stall > 0 ? 'Backpressure' : 'Nominal',
        description: 'Strict IDLE -> SETUP -> ACCESS sequencing with PREADY wait-state insertion.',
        cycles,
        clockName: 'PCLK',
        signals: [
          { name: 'PCLK', type: 'clock', values: clk },
          { name: 'PSEL', type: 'bit', values: psel },
          { name: 'PENABLE', type: 'bit', values: pen },
          { name: 'PWRITE', type: 'bit', values: pwr },
          { name: 'PADDR', type: 'bus', values: paddr },
          ...(opType === 'write'
            ? [{ name: 'PWDATA', type: 'bus' as const, values: pwdata }]
            : [{ name: 'PRDATA', type: 'bus' as const, values: prdata }]),
          { name: 'PREADY', type: 'bit', values: pready },
        ],
        annotations,
      };
    }

    if (simProto === 'uart') {
      const bits: number[] = [];
      let ones = 0;
      for (let i = 0; i < 8; i++) {
        const bit = (baseByte >> i) & 1;
        bits.push(bit);
        ones += bit;
      }
      const parityBit = ones % 2; // even parity
      const frame = [1, 0, ...bits, ...(uartParity === 'even' ? [parityBit] : []), 1, 1];
      const labels = ['IDLE', 'START', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', ...(uartParity === 'even' ? ['PAR'] : []), 'STOP', 'IDLE'];

      return {
        id: 'sim-uart',
        name: `UART Frame 0x${baseByte.toString(16).toUpperCase().padStart(2, '0')} (${uartParity === 'even' ? '8E1' : '8N1'})`,
        category: 'Nominal',
        description: 'LSB-first asynchronous serial framing with Start(0), 8 data bits, optional Even parity, and Stop(1).',
        cycles: frame.length,
        clockName: 'BAUD_TICK',
        signals: [
          { name: 'BAUD_TICK', type: 'clock', values: frame.map((_, i) => i % 2) },
          { name: 'TX_LINE', type: 'bit', values: frame },
          { name: 'FRAME_BIT', type: 'bus', values: labels },
        ],
        annotations: [
          { cycle: 1, label: 'START bit falling edge synchronizes 16x oversampler', severity: 'info' },
          { cycle: frame.length - 2, label: 'STOP bit (1) closes byte frame', severity: 'info' },
        ],
      };
    }

    if (simProto === 'spi') {
      const cpol = spiMode >= 2 ? 1 : 0;
      const cpha = spiMode % 2;
      const cycles = 12;
      const cs = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
      const sclk = Array(cycles).fill(cpol);
      for (let c = 2; c <= 9; c++) {
        sclk[c] = c % 2 === 0 ? (cpol ? 0 : 1) : cpol;
      }
      const bits = [0, 1, 2, 3].map((i) => (baseByte >> (7 - i)) & 1);
      const mosi = [0, bits[0], bits[0], bits[1], bits[1], bits[2], bits[2], bits[3], bits[3], 0, 0, 0];
      const miso = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0];

      return {
        id: 'sim-spi',
        name: `SPI Mode ${spiMode} (CPOL=${cpol}, CPHA=${cpha})`,
        category: 'Nominal',
        description: `Idle SCLK=${cpol}; data sampled on ${cpha === 0 ? 'leading' : 'trailing'} SCLK edge.`,
        cycles,
        clockName: 'SYSCLK',
        signals: [
          { name: 'CS_N', type: 'bit', values: cs },
          { name: 'SCLK', type: 'bit', values: sclk },
          { name: 'MOSI', type: 'bit', values: mosi },
          { name: 'MISO', type: 'bit', values: miso },
        ],
        annotations: [
          { cycle: 1, label: 'CS_N drops LOW to select target', severity: 'info' },
          { cycle: 2, label: `First clock edge (${cpha === 0 ? 'Sample' : 'Shift'})`, severity: 'info' },
        ],
      };
    }

    // I2C
    return {
      id: 'sim-i2c',
      name: `I2C 7-Bit Write Frame (${i2cAck ? 'ACK' : 'NACK'})`,
      category: i2cAck ? 'Nominal' : 'Error',
      description: 'START condition -> 7-bit address + W(0) -> Target ACK(0) or NACK(1) -> STOP condition.',
      cycles: 12,
      clockName: 'SCL',
      signals: [
        { name: 'SCL', type: 'bit', values: [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1] },
        { name: 'SDA', type: 'bit', values: [1, 0, 1, 1, 0, 0, 1, 1, i2cAck ? 0 : 1, i2cAck ? 0 : 1, 0, 1] },
        { name: 'PHASE', type: 'bus', values: ['IDLE', 'START', 'A6', 'A5', 'A4', 'A3', 'W=0', 'W=0', i2cAck ? 'ACK' : 'NACK', i2cAck ? 'ACK' : 'NACK', 'STOP', 'IDLE'] },
      ],
      annotations: [
        { cycle: 1, label: 'START: SDA falls while SCL=1', severity: 'info' },
        { cycle: 8, label: i2cAck ? 'Target pulls SDA=0 for ACK' : 'Target leaves SDA=1 (NACK!)', severity: i2cAck ? 'info' : 'error' },
        { cycle: 10, label: 'STOP: SDA rises while SCL=1', severity: 'info' },
      ],
    };
  }, [simProto, opType, addrHex, dataHex, burstBeats, waitStates, awSkew, spiMode, uartParity, i2cAck]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Interactive Waveform Studio & Protocol Simulator
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure transaction parameters, generate cycle-accurate waveforms, and toggle VALID/READY or handshakes live to verify compliance.
        </p>
      </div>

      {/* Protocol Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {SIM_PROTOCOLS.map((p) => {
          const active = simProto === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSimProto(p.id)}
              className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                active
                  ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:text-slate-100'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-semibold">{p.label}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{p.subtitle}</div>
            </button>
          );
        })}
      </div>

      {/* Configuration Controls */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 flex flex-wrap items-end gap-4 text-xs">
        {(simProto === 'axi4' || simProto === 'apb') && (
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Operation</label>
            <div className="flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpType('write')}
                className={`px-3 py-1.5 cursor-pointer ${opType === 'write' ? 'bg-cyan-600 text-white font-medium' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400'}`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setOpType('read')}
                className={`px-3 py-1.5 cursor-pointer ${opType === 'read' ? 'bg-cyan-600 text-white font-medium' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400'}`}
              >
                Read
              </button>
            </div>
          </div>
        )}

        {(simProto === 'axi4' || simProto === 'axi4-lite' || simProto === 'apb') && (
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Address (Hex)</label>
            <input
              type="text"
              value={addrHex}
              onChange={(e) => setAddrHex(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
              maxLength={4}
              className="w-24 px-2.5 py-1.5 font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        <div>
          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payload Seed (Hex)</label>
          <input
            type="text"
            value={dataHex}
            onChange={(e) => setDataHex(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
            maxLength={2}
            className="w-20 px-2.5 py-1.5 font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
        </div>

        {(simProto === 'axi4' || simProto === 'axi4-stream') && (
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Burst Beats: <span className="font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">{burstBeats}</span>
            </label>
            <input
              type="range"
              min={1}
              max={6}
              value={burstBeats}
              onChange={(e) => setBurstBeats(Number(e.target.value))}
              className="w-28 accent-cyan-500"
            />
          </div>
        )}

        {(simProto === 'axi4' || simProto === 'axi4-stream' || simProto === 'apb') && (
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Wait States: <span className="font-mono text-amber-600 dark:text-amber-400 tabular-nums">{waitStates}</span>
            </label>
            <input
              type="range"
              min={0}
              max={3}
              value={waitStates}
              onChange={(e) => setWaitStates(Number(e.target.value))}
              className="w-28 accent-amber-500"
            />
          </div>
        )}

        {simProto === 'axi4-lite' && (
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              W-after-AW Skew: <span className="font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">+{awSkew} cyc</span>
            </label>
            <input
              type="range"
              min={0}
              max={3}
              value={awSkew}
              onChange={(e) => setAwSkew(Number(e.target.value))}
              className="w-28 accent-cyan-500"
            />
          </div>
        )}

        {simProto === 'spi' && (
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">SPI Clock Mode</label>
            <select
              value={spiMode}
              onChange={(e) => setSpiMode(Number(e.target.value) as 0 | 1 | 2 | 3)}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value={0}>Mode 0 (CPOL=0, CPHA=0)</option>
              <option value={1}>Mode 1 (CPOL=0, CPHA=1)</option>
              <option value={2}>Mode 2 (CPOL=1, CPHA=0)</option>
              <option value={3}>Mode 3 (CPOL=1, CPHA=1)</option>
            </select>
          </div>
        )}

        {simProto === 'uart' && (
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Parity</label>
            <select
              value={uartParity}
              onChange={(e) => setUartParity(e.target.value as 'none' | 'even')}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="none">8N1 (No Parity)</option>
              <option value="even">8E1 (Even Parity)</option>
            </select>
          </div>
        )}

        {simProto === 'i2c' && (
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Response</label>
            <div className="flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setI2cAck(true)}
                className={`px-3 py-1.5 cursor-pointer ${i2cAck ? 'bg-emerald-600 text-white font-medium' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400'}`}
              >
                ACK (0)
              </button>
              <button
                type="button"
                onClick={() => setI2cAck(false)}
                className={`px-3 py-1.5 cursor-pointer ${!i2cAck ? 'bg-rose-600 text-white font-medium' : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400'}`}
              >
                NACK (1)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Waveform Renderer */}
      <WaveformViewer scenario={scenario} interactive />
    </div>
  );
};
