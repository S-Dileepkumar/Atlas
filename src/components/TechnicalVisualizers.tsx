import React, { useMemo, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Layers, ShieldCheck, Cpu } from 'lucide-react';
import { ProtocolDocument } from '../types/protocol';
import { IpRegister } from '../types/ipUniverse';

interface PacketField {
  name: string;
  bits: string;
  widthWeight: number;
  color: string;
  role: string;
}

interface LayerSpec {
  layer: string;
  title: string;
  details: string;
  fields: PacketField[];
}

function getProtocolPacketLayers(protocol: ProtocolDocument): LayerSpec[] {
  const pid = protocol.id.toLowerCase();

  if (pid.includes('pcie')) {
    return [
      {
        layer: 'Layer 1',
        title: 'Transaction Layer (TLP Framing & Flow Control)',
        details: 'Generates Posted (MWr), Non-Posted (MRd/CfgRd), and Completion (CplD) TLPs tracked via Header/Data flow-control credits.',
        fields: [
          { name: 'Fmt/Type', bits: '[31:24]', widthWeight: 14, color: '#3b82f6', role: 'Transaction type (MRd, MWr, CplD) and 3DW/4DW header length' },
          { name: 'TC / Attr', bits: '[23:12]', widthWeight: 14, color: '#06b6d4', role: 'Traffic Class QoS, Relaxed Ordering, No-Snoop, ID-Based Ordering' },
          { name: 'Length (DW)', bits: '[9:0]', widthWeight: 14, color: '#10b981', role: 'Payload size in 32-bit DWords (up to 1024 DW)' },
          { name: 'Requester ID / Tag', bits: 'DW1 [31:0]', widthWeight: 22, color: '#8b5cf6', role: 'BDF (Bus/Dev/Func) source + Outstanding Non-Posted Tag' },
          { name: '64b Address + ECRC', bits: 'DW2-3 + ECRC', widthWeight: 36, color: '#f59e0b', role: 'Target physical/translated address and optional end-to-end 32b CRC' },
        ],
      },
      {
        layer: 'Layer 2',
        title: 'Data Link Layer (Seq Num, LCRC & Ack/Nak Replay)',
        details: 'Wraps each TLP with a 12-bit Sequence Number and 32-bit Link CRC; buffers packets in Replay Buffer until Ack DLLP returns.',
        fields: [
          { name: 'Seq Num', bits: '[11:0]', widthWeight: 18, color: '#0ea5e9', role: 'Monotonic packet counter for Ack/Nak replay integrity' },
          { name: 'TLP Header + Payload', bits: '3–4 DW + Data', widthWeight: 54, color: '#3b82f6', role: 'Encapsulated Transaction Layer Packet' },
          { name: 'LCRC-32', bits: '[31:0]', widthWeight: 28, color: '#ec4899', role: 'Link-level CRC protecting hop-by-hop link reliability' },
        ],
      },
      {
        layer: 'Layer 3',
        title: 'Physical Layer (128b/130b or PAM4 FLIT + LTSSM)',
        details: 'Stripes bytes across x1–x16 lanes, scrambles symbols, adds Sync/FLIT framing, and trains equalization via LTSSM.',
        fields: [
          { name: 'Sync / Flit Hdr', bits: '2b / 4B', widthWeight: 16, color: '#8b5cf6', role: '128b/130b block sync (01 Data / 10 Ordered Set) or Gen6 256B FLIT framing' },
          { name: 'Scrambled Lanes (x1..x16)', bits: 'Lane Striped', widthWeight: 62, color: '#10b981', role: 'LFSR-scrambled bytes distributed across bonded SerDes lanes' },
          { name: 'TX/RX Eq + SKP', bits: 'Ordered Sets', widthWeight: 22, color: '#f97316', role: 'Clock-compensation SKP and 3-tap SerDes preset coefficients' },
        ],
      },
    ];
  }

  if (pid.includes('cxl')) {
    return [
      {
        layer: 'Muxed Link',
        title: 'CXL Flex Bus Arb/Mux (.io + .cache + .mem)',
        details: 'Arbitrates three sub-protocols dynamically over shared PCIe 5.0/6.0 electrical lanes with 68B / 256B Flits.',
        fields: [
          { name: 'CXL.io', bits: 'PCIe-Compat', widthWeight: 32, color: '#3b82f6', role: 'Discovery, BAR enumeration, interrupts, DMA, and non-coherent MMIO' },
          { name: 'CXL.cache', bits: 'D2H / H2D', widthWeight: 34, color: '#8b5cf6', role: 'Allows Type 1/2 accelerators to cache host DDR coherently' },
          { name: 'CXL.mem', bits: 'HDM Host-Bias', widthWeight: 34, color: '#10b981', role: 'Memory-semantic load/store expansion & multi-host memory pooling' },
        ],
      },
    ];
  }

  if (pid.includes('axi')) {
    return [
      {
        layer: '5 Channels',
        title: 'AXI4 Decoupled Write & Read Channel Architecture',
        details: 'Independent VALID/READY handshakes allow simultaneous address pipelining, multiple outstanding IDs, and out-of-order completions.',
        fields: [
          { name: 'AW (Write Addr)', bits: 'AWID, AWADDR, AWLEN', widthWeight: 20, color: '#3b82f6', role: 'Starts write burst with target address, burst length (1–256), and size' },
          { name: 'W (Write Data)', bits: 'WDATA, WSTRB, WLAST', widthWeight: 24, color: '#06b6d4', role: 'Streams write beats with per-byte write strobes and WLAST termination' },
          { name: 'B (Write Resp)', bits: 'BID, BRESP', widthWeight: 16, color: '#10b981', role: 'Confirms OKAY/EXOKAY/SLVERR/DECERR after final WLAST beat' },
          { name: 'AR (Read Addr)', bits: 'ARID, ARADDR, ARLEN', widthWeight: 20, color: '#8b5cf6', role: 'Issues pipelined read requests tagged by ARID' },
          { name: 'R (Read Data)', bits: 'RID, RDATA, RLAST', widthWeight: 20, color: '#f59e0b', role: 'Returns burst data beats; can interleave across distinct RID tags' },
        ],
      },
    ];
  }

  if (pid.includes('ddr') || pid.includes('hbm') || pid.includes('lpddr')) {
    return [
      {
        layer: 'JEDEC Timing',
        title: 'DRAM Bank Group, Row Activation & Burst Frame',
        details: 'Translates memory controller requests into strict command-address phases respecting tRCD, tCAS (CL), tRP, and tRFC.',
        fields: [
          { name: 'ACT (Row Open)', bits: 'BG/BA + Row[16:0]', widthWeight: 24, color: '#8b5cf6', role: 'Opens wordline into sense amplifiers; must wait tRCD before RD/WR' },
          { name: 'RD / WR CAS', bits: 'Col + Auto-Pre', widthWeight: 22, color: '#3b82f6', role: 'Selects column in open page; data arrives after CAS Latency (CL)' },
          { name: 'BL16 / BL32 DQ', bits: 'DQS Strobe Edges', widthWeight: 32, color: '#10b981', role: 'Dual-data-rate bursts captured on rising and falling DQS edges' },
          { name: 'PRE / REFab', bits: 'tRP / tRFC', widthWeight: 22, color: '#f59e0b', role: 'Closes active row (PRE) or refreshes leaky capacitor cells (REF)' },
        ],
      },
    ];
  }

  // Dynamic synthesis from actual protocol channels & signals so all 498 entries render meaningful diagrams!
  const chanColors = ['#3b82f6', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
  const fields: PacketField[] = (protocol.channels.length ? protocol.channels : ['Control', 'Address', 'Data']).slice(0, 6).map((ch, idx) => {
    const sigs = protocol.signals.filter((s) => s.channel === ch).slice(0, 3).map((s) => s.name);
    return {
      name: ch,
      bits: sigs.join(', ') || `${protocol.name} ${ch}`,
      widthWeight: Math.max(16, Math.floor(100 / Math.max(1, Math.min(6, protocol.channels.length || 3)))),
      color: chanColors[idx % chanColors.length],
      role: sigs.length
        ? `Key signals mapped in ${ch}: ${sigs.join(', ')}`
        : `${protocol.name} structural channel / interface group`,
    };
  });

  return [
    {
      layer: protocol.standardBody,
      title: `${protocol.name} Channel & Frame Structure (${protocol.specVersion})`,
      details: protocol.overview.definition,
      fields,
    },
  ];
}

export const PacketLayerInspectorSvg: React.FC<{ protocol: ProtocolDocument }> = ({ protocol }) => {
  const layers = useMemo(() => getProtocolPacketLayers(protocol), [protocol]);
  const [selectedField, setSelectedField] = useState<PacketField | null>(layers[0]?.fields[0] || null);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#080E1A] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Interactive Protocol Layer &amp; Packet Bit-Field Diagram
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Click any segment below to inspect field width and hardware role
        </span>
      </div>

      <div className="space-y-3">
        {layers.map((layer) => {
          const totalWeight = layer.fields.reduce((acc, f) => acc + f.widthWeight, 0) || 100;
          return (
            <div key={layer.title} className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  <span className="font-mono text-cyan-700 dark:text-cyan-400 mr-2">{layer.layer}</span>
                  {layer.title}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">{layer.details}</p>

              {/* Vector Segmented Packet Bar */}
              <div className="flex w-full rounded overflow-hidden border border-slate-300 dark:border-slate-700">
                {layer.fields.map((f) => {
                  const pct = (f.widthWeight / totalWeight) * 100;
                  const isSel = selectedField?.name === f.name;
                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setSelectedField(f)}
                      style={{ width: `${pct}%` }}
                      className={`px-2 py-2 text-left transition-opacity cursor-pointer border-r last:border-r-0 border-white/25 text-white ${
                        isSel ? 'ring-2 ring-inset ring-white opacity-100' : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div style={{ backgroundColor: f.color }} className="absolute inset-0 -z-10" />
                      <div
                        style={{ backgroundColor: f.color }}
                        className="-mx-2 -my-2 px-2 py-2 h-full flex flex-col justify-between"
                      >
                        <div className="font-mono text-[11px] font-bold truncate">{f.name}</div>
                        <div className="font-mono text-[9.5px] opacity-90 truncate">{f.bits}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedField && (
        <div className="p-3 rounded border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/20 text-xs text-slate-700 dark:text-slate-200">
          <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">{selectedField.name}</span>{' '}
          <span className="font-mono text-slate-500 dark:text-slate-400">({selectedField.bits}):</span>{' '}
          {selectedField.role}
        </div>
      )}
    </div>
  );
};

const UVM_STEPS = [
  {
    id: 'seq',
    title: '1. uvm_sequence → uvm_sequencer',
    detail: 'Constrained-random sequence generates randomized protocol transactions (addresses, burst lengths, corner-case delays) and arbitrates into uvm_sequencer.',
    activeIds: ['test', 'seqr'],
  },
  {
    id: 'drv',
    title: '2. uvm_driver → Virtual Interface → DUT',
    detail: 'Driver pulls transaction item via seq_item_port.get_next_item() and toggles clocked RTL pins (VALID, ADDR, WDATA) on the SystemVerilog virtual interface.',
    activeIds: ['seqr', 'drv', 'vif', 'dut'],
  },
  {
    id: 'sva',
    title: '3. Passive SVA Protocol Checker & DUT Execution',
    detail: 'Bound SystemVerilog Assertions (SVA) continuously check zero-cycle timing invariants (e.g., VALID stable until READY, no X-propagation) inside DUT pins.',
    activeIds: ['vif', 'dut', 'sva'],
  },
  {
    id: 'mon',
    title: '4. uvm_monitor → TLM Analysis Port',
    detail: 'Passive monitor samples pins cleanly on posedge clk (never drives pins!), reconstructs high-level transaction objects, and broadcasts via uvm_analysis_port.',
    activeIds: ['vif', 'mon', 'sb', 'cov'],
  },
  {
    id: 'sb',
    title: '5. Scoreboard Reference Model & Functional Coverage',
    detail: 'Scoreboard compares actual DUT output against golden reference model; covergroups sample cross-coverage bins to sign off verification closure.',
    activeIds: ['mon', 'sb', 'ref', 'cov'],
  },
];

export const UvmArchitectureFlowSvg: React.FC<{
  title?: string;
  driverNote?: string;
  monitorNote?: string;
  scoreboardNote?: string;
}> = ({ title = 'IEEE 1800.2 UVM Verification Testbench Flow', driverNote, monitorNote, scoreboardNote }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  React.useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      setStepIdx((s) => (s + 1) % UVM_STEPS.length);
    }, 1800);
    return () => window.clearInterval(t);
  }, [playing]);

  const current = UVM_STEPS[stepIdx];
  const isActive = (id: string) => current.activeIds.includes(id);

  const boxStyle = (id: string, accent: string) => ({
    stroke: isActive(id) ? accent : '#64748b',
    strokeWidth: isActive(id) ? 2.5 : 1.3,
    opacity: isActive(id) ? 1 : 0.6,
  });

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#080E1A] p-4 space-y-3 bg-engineering-grid">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          {title}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 text-white font-medium cursor-pointer"
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? 'Pause' : 'Animate Flow'}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStepIdx((s) => (s + 1) % UVM_STEPS.length);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <SkipForward className="w-3 h-3" /> Step
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStepIdx(0);
            }}
            className="p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Reset animation"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Stepper buttons */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {UVM_STEPS.map((st, idx) => (
          <button
            key={st.id}
            type="button"
            onClick={() => {
              setPlaying(false);
              setStepIdx(idx);
            }}
            className={`px-2.5 py-1 rounded border cursor-pointer transition-colors ${
              idx === stepIdx
                ? 'bg-slate-900 dark:bg-cyan-600 border-slate-900 dark:border-cyan-600 text-white font-medium'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
            }`}
          >
            {st.title.split(':')[0].split('→')[0].trim()}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 820 270" className="w-full min-w-[640px] h-auto max-h-[260px] select-none">
          <defs>
            <marker id="uvm-arr" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 7 3, 0 6" fill="#06b6d4" />
            </marker>
          </defs>

          {/* Container Env Box */}
          <rect x="14" y="12" width="792" height="246" rx="10" fill="none" stroke="#475569" strokeDasharray="5 4" />
          <text x="28" y="30" className="font-mono text-[10px] font-semibold fill-slate-500 dark:fill-slate-400">
            uvm_test / uvm_env Hierarchy
          </text>

          {/* Arrows */}
          <path d="M 155 82 L 210 82" stroke="#06b6d4" strokeWidth="1.8" markerEnd="url(#uvm-arr)" />
          <path d="M 350 82 L 405 82" stroke="#06b6d4" strokeWidth="1.8" markerEnd="url(#uvm-arr)" />
          <path d="M 475 110 L 475 148" stroke="#06b6d4" strokeWidth="1.8" markerEnd="url(#uvm-arr)" />
          <path d="M 555 182 L 620 182" stroke="#10b981" strokeWidth="1.8" markerEnd="url(#uvm-arr)" />
          <path d="M 405 182 L 350 182" stroke="#eab308" strokeWidth="1.8" markerEnd="url(#uvm-arr)" />
          <path d="M 210 182 L 155 182" stroke="#ec4899" strokeWidth="1.8" markerEnd="url(#uvm-arr)" />

          {/* uvm_test / Sequences */}
          <g {...boxStyle('test', '#8b5cf6')}>
            <rect x="28" y="52" width="126" height="58" rx="6" className="fill-white dark:fill-slate-900" />
            <text x="91" y="76" textAnchor="middle" className="font-mono text-[11px] font-bold fill-slate-900 dark:fill-slate-100">uvm_sequence</text>
            <text x="91" y="94" textAnchor="middle" className="font-mono text-[9.5px] fill-slate-500">Constrained Random</text>
          </g>

          {/* uvm_sequencer */}
          <g {...boxStyle('seqr', '#3b82f6')}>
            <rect x="212" y="52" width="136" height="58" rx="6" className="fill-white dark:fill-slate-900" />
            <text x="280" y="76" textAnchor="middle" className="font-mono text-[11px] font-bold fill-slate-900 dark:fill-slate-100">uvm_sequencer</text>
            <text x="280" y="94" textAnchor="middle" className="font-mono text-[9.5px] fill-slate-500">TLM Seq Arbitration</text>
          </g>

          {/* uvm_driver */}
          <g {...boxStyle('drv', '#06b6d4')}>
            <rect x="406" y="52" width="146" height="58" rx="6" className="fill-white dark:fill-slate-900" />
            <text x="479" y="76" textAnchor="middle" className="font-mono text-[11px] font-bold fill-slate-900 dark:fill-slate-100">uvm_driver</text>
            <text x="479" y="94" textAnchor="middle" className="font-mono text-[9.5px] fill-slate-500">BFM Pin Driving</text>
          </g>

          {/* Virtual Interface + SVA */}
          <g {...boxStyle('vif', '#0ea5e9')}>
            <rect x="406" y="150" width="146" height="62" rx="6" className="fill-white dark:fill-slate-900" />
            <text x="479" y="173" textAnchor="middle" className="font-mono text-[11px] font-bold fill-slate-900 dark:fill-slate-100">virtual interface</text>
            <text x="479" y="191" textAnchor="middle" className="font-mono text-[9.5px] fill-cyan-600 dark:fill-cyan-400">+ SVA Bind Checker</text>
          </g>

          {/* DUT RTL */}
          <g {...boxStyle('dut', '#10b981')}>
            <rect x="622" y="140" width="165" height="82" rx="8" className="fill-emerald-50/70 dark:fill-emerald-950/30" />
            <text x="704" y="172" textAnchor="middle" className="font-display text-[13px] font-bold fill-slate-900 dark:fill-slate-100">DUT (RTL)</text>
            <text x="704" y="191" textAnchor="middle" className="font-mono text-[9.5px] fill-emerald-700 dark:fill-emerald-400">SystemVerilog / Verilator</text>
          </g>

          {/* uvm_monitor */}
          <g {...boxStyle('mon', '#eab308')}>
            <rect x="212" y="150" width="136" height="62" rx="6" className="fill-white dark:fill-slate-900" />
            <text x="280" y="175" textAnchor="middle" className="font-mono text-[11px] font-bold fill-slate-900 dark:fill-slate-100">uvm_monitor</text>
            <text x="280" y="193" textAnchor="middle" className="font-mono text-[9.5px] fill-slate-500">Passive Pin Sampler</text>
          </g>

          {/* Scoreboard + Coverage */}
          <g {...boxStyle('sb', '#ec4899')}>
            <rect x="28" y="150" width="126" height="62" rx="6" className="fill-white dark:fill-slate-900" />
            <text x="91" y="173" textAnchor="middle" className="font-mono text-[10.5px] font-bold fill-slate-900 dark:fill-slate-100">Scoreboard +</text>
            <text x="91" y="191" textAnchor="middle" className="font-mono text-[9.5px] fill-pink-600 dark:fill-pink-400">Ref Model &amp; Cov</text>
          </g>
        </svg>
      </div>

      <div className="p-3 rounded border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/20 text-xs space-y-1">
        <div className="font-semibold text-cyan-800 dark:text-cyan-300">{current.title}</div>
        <p className="text-slate-700 dark:text-slate-200">{current.detail}</p>
        {(driverNote || monitorNote || scoreboardNote) && (
          <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
            {stepIdx === 1 && driverNote ? `Protocol Driver Focus: ${driverNote}` : null}
            {stepIdx === 3 && monitorNote ? `Protocol Monitor Focus: ${monitorNote}` : null}
            {stepIdx === 4 && scoreboardNote ? `Scoreboard Focus: ${scoreboardNote}` : null}
          </div>
        )}
      </div>
    </div>
  );
};

const FIELD_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

export const RegisterMemoryMapSvg: React.FC<{ registers: IpRegister[] }> = ({ registers }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  if (registers.length === 0) return null;

  const activeReg = registers[selectedIdx] || registers[0];

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#080E1A] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Graphical CSR Memory Map &amp; 32-Bit Bitfield Layout
        </div>
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {registers.length} Mapped CSRs · Click any address slot
        </span>
      </div>

      {/* Horizontal Address Offset Strip */}
      <div className="flex flex-wrap gap-1.5">
        {registers.map((r, idx) => {
          const isSel = idx === selectedIdx;
          return (
            <button
              key={r.name}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`px-3 py-1.5 rounded border text-left font-mono text-xs cursor-pointer transition-colors ${
                isSel
                  ? 'bg-cyan-600 border-cyan-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-cyan-500'
              }`}
            >
              <div className="font-bold text-[11px]">{r.offset}</div>
              <div className="text-[10px] opacity-90">{r.name}</div>
            </button>
          );
        })}
      </div>

      {/* Visual Bit-Field Allocation Bar */}
      <div className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{activeReg.name}</span>
            <span className="mx-2 text-slate-400">·</span>
            <span className="font-mono text-slate-600 dark:text-slate-300">Offset {activeReg.offset}</span>
            <span className="mx-2 text-slate-400">·</span>
            <span className="font-mono text-slate-500">Reset {activeReg.resetValue}</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">{activeReg.width}-bit · {activeReg.access}</span>
        </div>

        <div className="flex w-full rounded overflow-hidden border border-slate-300 dark:border-slate-700">
          {activeReg.fields.length > 0 ? (
            activeReg.fields.map((f, idx) => (
              <div
                key={f.name}
                style={{
                  backgroundColor: FIELD_COLORS[idx % FIELD_COLORS.length],
                  flexGrow: 1,
                }}
                className="px-2 py-2 text-white border-r last:border-r-0 border-white/25 min-w-[70px]"
              >
                <div className="font-mono text-[10.5px] font-bold truncate">{f.name}</div>
                <div className="font-mono text-[9.5px] opacity-90">
                  [{f.bits}] · {f.access}
                </div>
              </div>
            ))
          ) : (
            <div className="w-full px-3 py-2 bg-slate-700 text-white font-mono text-[11px]">
              [31:0] {activeReg.name} ({activeReg.access})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
