import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Layers, ShieldCheck, Cpu } from 'lucide-react';
import { ProtocolDocument } from '../types/protocol';
import { IpRegister } from '../types/ipUniverse';
import { InfiniteMeshViewport } from './InfiniteMeshViewport';

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

  useEffect(() => {
    setSelectedField(layers[0]?.fields[0] || null);
  }, [protocol.id, layers]);

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--sem-control)]" />
          Interactive Protocol Layer &amp; Packet Bit-Field Diagram
        </div>
        <span className="text-[11px] text-[var(--text-secondary)]">
          Click any segment below to inspect field width and hardware role
        </span>
      </div>

      <div className="space-y-3">
        {layers.map((layer) => {
          const totalWeight = layer.fields.reduce((acc, f) => acc + f.widthWeight, 0) || 100;
          return (
            <div key={layer.title} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-semibold text-[var(--text-primary)]">
                  <span className="font-mono text-[var(--sem-control)] mr-2">{layer.layer}</span>
                  {layer.title}
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{layer.details}</p>

              {/* Vector Segmented Packet Bar */}
              <div className="flex w-full rounded-md overflow-hidden border border-[var(--border-subtle)]">
                {layer.fields.map((f) => {
                  const pct = (f.widthWeight / totalWeight) * 100;
                  const isSel = selectedField?.name === f.name;
                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setSelectedField(f)}
                      style={{ width: `${pct}%`, backgroundColor: f.color }}
                      className={`relative px-2.5 py-2 text-left flex flex-col justify-between transition-opacity cursor-pointer border-r last:border-r-0 border-white/25 text-white min-w-0 ${
                        isSel ? 'ring-2 ring-inset ring-white opacity-100' : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      <div className="font-mono text-[11px] font-bold truncate w-full">{f.name}</div>
                      <div className="font-mono text-[9.5px] opacity-90 truncate w-full tabular-nums">{f.bits}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedField && (
        <div className="p-3.5 rounded-md border border-[var(--sem-control)]/40 bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)]">
          <span className="font-mono font-bold text-[var(--sem-control)]">{selectedField.name}</span>{' '}
          <span className="font-mono text-[var(--text-secondary)]">({selectedField.bits}):</span>{' '}
          <span className="text-[var(--text-primary)]">{selectedField.role}</span>
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

      <InfiniteMeshViewport
        bounds={{ minX: 0, minY: 0, width: 820, height: 270 }}
        title="IEEE 1800.2 UVM Verification Environment Topology"
        subtitle="Pan & zoom testbench architecture · Use controls above to animate verification phases"
        minHeightClass="h-[310px] sm:h-[360px]"
        renderDefs={() => (
          <marker id="uvm-arr" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 7 3, 0 6" fill="#06b6d4" />
          </marker>
        )}
      >
        {/* Container Env Box */}
        <rect x="14" y="12" width="792" height="246" rx="10" fill="none" stroke="var(--border-subtle)" strokeDasharray="5 4" strokeWidth={1.5} />
        <text x="28" y="30" className="font-mono text-[10px] font-semibold" fill="var(--text-secondary)">
          uvm_test / uvm_env Hierarchy · TLM + SVA + Scoreboard
        </text>

        {/* Arrows */}
        {[
          { d: 'M 154 84 L 210 84', color: '#06b6d4', active: isActive('test') || isActive('seqr') },
          { d: 'M 348 84 L 404 84', color: '#06b6d4', active: isActive('seqr') || isActive('drv') },
          { d: 'M 479 114 L 479 148', color: '#06b6d4', active: isActive('drv') || isActive('vif') },
          { d: 'M 552 183 L 620 183', color: '#10b981', active: isActive('vif') || isActive('dut') },
          { d: 'M 406 183 L 350 183', color: '#eab308', active: isActive('mon') || isActive('vif') },
          { d: 'M 212 183 L 156 183', color: '#ec4899', active: isActive('sb') || isActive('mon') },
        ].map((edge, idx) => (
          <g key={idx} opacity={edge.active ? 1 : 0.45}>
            <path d={edge.d} stroke={edge.color} strokeWidth={edge.active ? 2.2 : 1.5} markerEnd="url(#uvm-arr)" />
            {edge.active && (
              <path
                d={edge.d}
                stroke="#ffffff"
                strokeOpacity={0.35}
                strokeWidth={1.2}
                className="schematic-flow-active"
              />
            )}
          </g>
        ))}

        {/* UVM Component CAD Blocks */}
        {[
          { id: 'test', x: 26, y: 52, w: 128, h: 62, accent: '#8b5cf6', tag: 'STIMULUS', title: 'uvm_sequence', sub: 'Constrained Random' },
          { id: 'seqr', x: 212, y: 52, w: 136, h: 62, accent: '#3b82f6', tag: 'TLM ARBITER', title: 'uvm_sequencer', sub: 'TLM Seq Arbitration' },
          { id: 'drv', x: 406, y: 52, w: 146, h: 62, accent: '#06b6d4', tag: 'ACTIVE BFM', title: 'uvm_driver', sub: 'Pin Timing Driver' },
          { id: 'vif', x: 406, y: 150, w: 146, h: 64, accent: '#0ea5e9', tag: 'SV INTERFACE', title: 'virtual interface', sub: '+ SVA Bind Checker' },
          { id: 'dut', x: 622, y: 140, w: 165, h: 84, accent: '#10b981', tag: 'DESIGN UNDER TEST', title: 'DUT (RTL)', sub: 'SystemVerilog / Verilator' },
          { id: 'mon', x: 212, y: 150, w: 136, h: 64, accent: '#eab308', tag: 'PASSIVE', title: 'uvm_monitor', sub: 'Passive Pin Sampler' },
          { id: 'sb', x: 26, y: 150, w: 128, h: 64, accent: '#ec4899', tag: 'CHECKER', title: 'Scoreboard +', sub: 'Ref Model & Cov' },
        ].map((blk) => {
          const st = boxStyle(blk.id, blk.accent);
          const active = isActive(blk.id);
          return (
            <g key={blk.id} opacity={st.opacity}>
              {active && (
                <rect
                  x={blk.x - 3}
                  y={blk.y - 3}
                  width={blk.w + 6}
                  height={blk.h + 6}
                  rx={10}
                  fill="none"
                  stroke={blk.accent}
                  strokeWidth={1.2}
                  strokeDasharray="4 3"
                  opacity={0.75}
                />
              )}
              <rect
                x={blk.x}
                y={blk.y}
                width={blk.w}
                height={blk.h}
                rx={7}
                fill={active ? 'var(--bg-elevated)' : 'var(--bg-surface)'}
                stroke={st.stroke}
                strokeWidth={st.strokeWidth}
              />
              <path
                d={`M ${blk.x + 7} ${blk.y} H ${blk.x + blk.w - 7} Q ${blk.x + blk.w} ${blk.y} ${blk.x + blk.w} ${blk.y + 7} V ${blk.y + 18} H ${blk.x} V ${blk.y + 7} Q ${blk.x} ${blk.y} ${blk.x + 7} ${blk.y} Z`}
                fill={blk.accent}
                fillOpacity={active ? 0.24 : 0.12}
              />
              <text x={blk.x + 8} y={blk.y + 12} className="font-mono text-[8px] font-semibold uppercase tracking-wider" fill={blk.accent}>
                {blk.tag}
              </text>
              <text x={blk.x + blk.w / 2} y={blk.y + 37} textAnchor="middle" className="font-mono text-[11px] font-bold" fill="var(--text-primary)">
                {blk.title}
              </text>
              <text x={blk.x + blk.w / 2} y={blk.y + 53} textAnchor="middle" className="font-mono text-[9px]" fill="var(--text-secondary)">
                {blk.sub}
              </text>
            </g>
          );
        })}
      </InfiniteMeshViewport>

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

  useEffect(() => {
    setSelectedIdx(0);
  }, [registers]);

  if (registers.length === 0) return null;

  const safeIdx = selectedIdx < registers.length ? selectedIdx : 0;
  const activeReg = registers[safeIdx];

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4">
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
          const isSel = idx === safeIdx;
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
