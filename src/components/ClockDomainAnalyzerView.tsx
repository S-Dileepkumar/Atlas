import React, { useMemo, useState } from 'react';
import {
  Clock,
  AlertTriangle,
  ShieldCheck,
  Code2,
  Cpu,
  GraduationCap,
  Play,
  ArrowRight,
} from 'lucide-react';
import { ALL_IPS, getIpById } from '../data/ips';
import { analyzeCustomRtlCdc, analyzeIpClockDomains, CdcCrossingItem } from '../utils/cdcAnalyzer';

interface ClockDomainAnalyzerViewProps {
  initialIpId?: string;
  onSelectIp: (ipId: string) => void;
}

const DOMAIN_THEMES = [
  { border: '#06b6d4', fill: 'rgba(6, 182, 212, 0.08)', text: 'text-cyan-700 dark:text-cyan-300' },
  { border: '#f59e0b', fill: 'rgba(245, 158, 11, 0.08)', text: 'text-amber-700 dark:text-amber-300' },
  { border: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.08)', text: 'text-violet-700 dark:text-violet-300' },
  { border: '#10b981', fill: 'rgba(16, 185, 129, 0.08)', text: 'text-emerald-700 dark:text-emerald-300' },
  { border: '#f43f5e', fill: 'rgba(244, 63, 94, 0.08)', text: 'text-rose-700 dark:text-rose-300' },
];

const SAMPLE_CUSTOM_CDC_RTL = `// Multi-Clock Peripheral Bridge (Intentionally mixes Safe Sync + Direct CDC Bug)
module cdc_demo_bridge (
  input  logic       clk_sys_i,     // 200 MHz System Clock
  input  logic       clk_uart_i,    // 48 MHz Peripheral Clock
  input  logic       rst_ni,
  input  logic       start_pulse_i,
  input  logic [7:0] tx_byte_i,
  output logic       uart_busy_o,
  output logic [7:0] uart_rx_byte_o
);
  logic       req_toggle_q;
  logic       req_sync1_q, req_sync2_q;
  logic [7:0] unsafe_data_q;

  // Domain 1: 200 MHz System Clock
  always_ff @(posedge clk_sys_i or negedge rst_ni) begin
    if (!rst_ni) begin
      req_toggle_q  <= 1'b0;
      unsafe_data_q <= 8'h00;
    end else if (start_pulse_i) begin
      req_toggle_q  <= ~req_toggle_q;
      unsafe_data_q <= tx_byte_i;
    end
  end

  // Domain 2: 48 MHz UART Clock (Protected 2-FF sync vs Direct multi-bit crossing!)
  always_ff @(posedge clk_uart_i or negedge rst_ni) begin
    if (!rst_ni) begin
      req_sync1_q    <= 1'b0;
      req_sync2_q    <= 1'b0;
      uart_rx_byte_o <= 8'h00;
    end else begin
      req_sync1_q    <= req_toggle_q;   // Sync Stage 1
      req_sync2_q    <= req_sync1_q;    // Sync Stage 2 (Safe 2-FF)
      uart_rx_byte_o <= unsafe_data_q;  // Multi-bit crossed directly!
    end
  end
endmodule`;

export const ClockDomainAnalyzerView: React.FC<ClockDomainAnalyzerViewProps> = ({
  initialIpId,
  onSelectIp,
}) => {
  const [mode, setMode] = useState<'ip' | 'custom'>('ip');
  const [selectedIpId, setSelectedIpId] = useState<string>(initialIpId || 'opentitan-aes');
  const [customRtl, setCustomRtl] = useState<string>(SAMPLE_CUSTOM_CDC_RTL);
  const [selectedCrossing, setSelectedCrossing] = useState<CdcCrossingItem | null>(null);
  const [syncLabMode, setSyncLabMode] = useState<'2ff' | 'skew'>('2ff');

  const multiClockIpIds = useMemo(
    () =>
      new Set(
        ALL_IPS.filter((ip) => ip.architecture.clocks.length > 1 || analyzeIpClockDomains(ip).totalClockDomains > 1).map(
          (i) => i.id
        )
      ),
    []
  );

  const report = useMemo(() => {
    if (mode === 'custom') {
      return analyzeCustomRtlCdc('Custom RTL Buffer', customRtl);
    }
    return analyzeIpClockDomains(getIpById(selectedIpId));
  }, [mode, selectedIpId, customRtl]);

  const activeCrossing = selectedCrossing && report.crossings.some((c) => c.id === selectedCrossing.id)
    ? selectedCrossing
    : report.crossings[0] || null;

  // Dynamic SVG coordinate calculation for Clock Island Swimlanes
  const svgWidth = Math.max(760, report.domains.length * 290 + 40);
  const maxNodesInDomain = Math.max(1, ...report.domains.map((d) => Math.max(d.modules.length, 2)));
  const svgHeight = Math.max(300, 120 + maxNodesInDomain * 52);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
            IP Universe Structural Timing & Metastability Explorer
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            Clock Domain & CDC Boundary Analyzer
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Map clock signals across RTL modules, visualize asynchronous clock islands, detect 2-FF synchronizers vs unsafe direct crossings, and understand metastability from first principles.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs">
          <button
            type="button"
            onClick={() => setMode('ip')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium cursor-pointer ${
              mode === 'ip'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Inspect Open-Source IP
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium cursor-pointer ${
              mode === 'custom'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Analyze Custom RTL
          </button>
        </div>
      </div>

      {/* Mode Selector Bar */}
      {mode === 'ip' ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Target Hardware IP:
            </label>
            <select
              value={selectedIpId}
              onChange={(e) => {
                setSelectedIpId(e.target.value);
                setSelectedCrossing(null);
              }}
              className="px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-w-[260px]"
            >
              {ALL_IPS.map((ip) => (
                <option key={ip.id} value={ip.id}>
                  {ip.name} — {multiClockIpIds.has(ip.id) ? 'Multi-Clock CDC' : 'Single Clock'} ({ip.category})
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-1.5 text-xs">
              {['opentitan-aes', 'ibex', 'verilog-ethernet', 'pulp-axi', 'ultraembedded-usb'].map((quickId) => {
                const qIp = getIpById(quickId);
                return (
                  <button
                    key={quickId}
                    type="button"
                    onClick={() => {
                      setSelectedIpId(quickId);
                      setSelectedCrossing(null);
                    }}
                    className={`px-2.5 py-1 rounded border text-[11px] cursor-pointer ${
                      selectedIpId === quickId
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-medium'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-cyan-500/40'
                    }`}
                  >
                    {qIp.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectIp(selectedIpId)}
            className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            Open Full IP Explorer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Live SystemVerilog / Verilog CDC Scanner (updates automatically as you edit)
            </span>
            <button
              type="button"
              onClick={() => setCustomRtl(SAMPLE_CUSTOM_CDC_RTL)}
              className="text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Reset Multi-Clock Demo RTL
            </button>
          </div>
          <textarea
            value={customRtl}
            onChange={(e) => setCustomRtl(e.target.value)}
            rows={8}
            className="w-full p-3 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}

      {/* Student First-Principles Banner */}
      <div className="rounded-lg border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/20 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-cyan-800 dark:text-cyan-300">
          <GraduationCap className="w-4 h-4 shrink-0" />
          <span>Explain Like Explaining to a New Student · What Does Clock Domain Analysis Show?</span>
        </div>
        <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{report.studentSummary}</p>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{report.summary}</p>
      </div>

      {/* Visual Clock Domain Swimlane Diagram + Crossing Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Visual Clock Island Map ({report.totalClockDomains} Domain{report.totalClockDomains > 1 ? 's' : ''}, {report.crossings.length} Detected Crossing{report.crossings.length === 1 ? '' : 's'})
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Each colored zone is one independent clock heartbeat · Dashed bridges show CDC boundaries
            </span>
          </div>

          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080E1A] p-3 bg-engineering-grid">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[660px] h-auto select-none">
              <defs>
                <marker id="cdc-safe" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
                </marker>
                <marker id="cdc-warn" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                </marker>
                <marker id="cdc-danger" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#f43f5e" />
                </marker>
              </defs>

              {/* Clock Island Swimlanes */}
              {report.domains.map((dom, dIdx) => {
                const colTheme = DOMAIN_THEMES[dom.colorIndex];
                const boxX = 20 + dIdx * 285;
                const boxW = 245;
                const boxH = svgHeight - 40;
                return (
                  <g key={dom.id}>
                    <rect
                      x={boxX}
                      y={20}
                      width={boxW}
                      height={boxH}
                      rx={10}
                      fill={colTheme.fill}
                      stroke={colTheme.border}
                      strokeWidth={1.75}
                    />
                    <rect
                      x={boxX}
                      y={20}
                      width={boxW}
                      height={36}
                      rx={10}
                      fill={colTheme.border}
                      opacity={0.16}
                    />
                    <text
                      x={boxX + 14}
                      y={42}
                      className="font-mono text-[12px] font-bold fill-slate-900 dark:fill-slate-100"
                    >
                      Clock: {dom.name}
                    </text>
                    <text
                      x={boxX + 14}
                      y={70}
                      className="text-[10px] fill-slate-600 dark:fill-slate-400"
                    >
                      {dom.frequencyHint.slice(0, 36)}
                    </text>

                    {/* Modules inside this clock domain */}
                    {dom.modules.slice(0, 6).map((modName, mIdx) => {
                      const ny = 88 + mIdx * 48;
                      return (
                        <g key={`${dom.id}-${modName}-${mIdx}`}>
                          <rect
                            x={boxX + 14}
                            y={ny}
                            width={boxW - 28}
                            height={36}
                            rx={6}
                            className="fill-white dark:fill-slate-900"
                            stroke={colTheme.border}
                            strokeWidth={1.25}
                          />
                          <text
                            x={boxX + 24}
                            y={ny + 22}
                            className="font-mono text-[11px] font-medium fill-slate-800 dark:fill-slate-200"
                          >
                            {modName.length > 26 ? `${modName.slice(0, 24)}..` : modName}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Cross-Domain Boundary Arcs */}
              {report.crossings.map((cross, cIdx) => {
                const idxA = Math.max(0, report.domains.findIndex((d) => d.name === cross.fromDomain));
                const idxB = Math.max(0, report.domains.findIndex((d) => d.name === cross.toDomain));
                if (idxA === idxB && report.domains.length === 1) return null;

                const x1 = 20 + idxA * 285 + (idxA < idxB ? 245 : 0);
                const x2 = 20 + idxB * 285 + (idxA < idxB ? 0 : 245);
                const yPos = 106 + (cIdx % 4) * 52;
                const mx = (x1 + x2) / 2;
                const isUnsafe = cross.status === 'Unsafe Direct Crossing Detected';
                const isSafe = cross.status === 'Protected (Synchronizer Detected)';
                const stroke = isUnsafe ? '#f43f5e' : isSafe ? '#10b981' : '#f59e0b';
                const marker = isUnsafe ? 'url(#cdc-danger)' : isSafe ? 'url(#cdc-safe)' : 'url(#cdc-warn)';
                const active = activeCrossing?.id === cross.id;

                return (
                  <g
                    key={cross.id}
                    onClick={() => setSelectedCrossing(cross)}
                    className="cursor-pointer"
                  >
                    <path
                      d={`M ${x1} ${yPos} C ${mx} ${yPos - 26}, ${mx} ${yPos + 26}, ${x2} ${yPos}`}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={active ? 3 : 2}
                      strokeDasharray={isSafe ? undefined : '6 4'}
                      markerEnd={marker}
                    />
                    <rect
                      x={mx - 58}
                      y={yPos - 12}
                      width={116}
                      height={22}
                      rx={4}
                      className="fill-white dark:fill-slate-950"
                      stroke={stroke}
                      strokeWidth={active ? 2 : 1.25}
                    />
                    <text
                      x={mx}
                      y={yPos + 2.5}
                      textAnchor="middle"
                      className="font-mono text-[9.5px] font-semibold fill-slate-900 dark:fill-slate-100"
                    >
                      {cross.signalOrPath.length > 18 ? `${cross.signalOrPath.slice(0, 16)}..` : cross.signalOrPath}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right Crossing Inspector & Diagnostics */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Detected Sync Points & Boundaries ({report.crossings.length})
            </h2>

            {report.crossings.length === 0 ? (
              <div className="p-4 rounded border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Single synchronous clock domain ({report.domains[0]?.name}). No asynchronous CDC crossings exist inside this IP boundary.
                </span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {report.crossings.map((c) => {
                  const isActive = activeCrossing?.id === c.id;
                  const isUnsafe = c.status === 'Unsafe Direct Crossing Detected';
                  const isSafe = c.status === 'Protected (Synchronizer Detected)';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCrossing(c)}
                      className={`w-full p-3 text-left rounded border transition-colors cursor-pointer text-xs ${
                        isActive
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-200 dark:border-slate-800 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {c.signalOrPath}
                        </span>
                        {isSafe ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${isUnsafe ? 'text-rose-500' : 'text-amber-500'}`} />
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.fromDomain} → {c.toDomain} · {c.kind}
                      </div>
                      <div
                        className={`text-[11px] font-medium mt-1 ${
                          isSafe
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : isUnsafe
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {c.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeCrossing && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3 text-xs">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Selected Boundary Deep Dive
              </div>
              <div className="font-mono text-cyan-700 dark:text-cyan-400">
                {activeCrossing.fromDomain} → {activeCrossing.toDomain}
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong>Engineering Action:</strong> {activeCrossing.synchronizerHint}
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {activeCrossing.engineeringExplanation}
              </p>
              <div className="p-3 rounded border border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-950/20 text-slate-700 dark:text-slate-200 leading-relaxed">
                <strong>Student Analogy:</strong> {activeCrossing.studentExplanation}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Student Visual Lab: How 2-FF Sync vs Gray-Code Async FIFO Fixes Metastability */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Visual CDC Hardware Reference: Why Flip-Flops Need Synchronizers
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Compare how a 2-Flip-Flop Synchronizer tames single-bit metastability vs why multi-bit buses must use Gray-coded Async FIFOs.
            </p>
          </div>
          <div className="flex gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSyncLabMode('2ff')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
                syncLabMode === '2ff'
                  ? 'bg-cyan-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              1-Bit Control: 2-FF Synchronizer
            </button>
            <button
              type="button"
              onClick={() => setSyncLabMode('skew')}
              className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
                syncLabMode === 'skew'
                  ? 'bg-cyan-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Multi-Bit Data: Why Skew Breaks 2-FF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
          {syncLabMode === '2ff' ? (
            <svg viewBox="0 0 820 155" className="w-full min-w-[640px] h-auto">
              <defs>
                <marker id="lab-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
                </marker>
              </defs>
              {/* Launch Flop */}
              <rect x="25" y="30" width="140" height="80" rx="8" className="fill-white dark:fill-slate-900" stroke="#f59e0b" strokeWidth="1.75" />
              <text x="95" y="58" textAnchor="middle" className="font-mono text-[11px] font-bold fill-amber-600 dark:fill-amber-400">Launch FF</text>
              <text x="95" y="76" textAnchor="middle" className="font-mono text-[10px] fill-slate-600 dark:fill-slate-300">@(posedge clk_src)</text>
              <text x="95" y="96" textAnchor="middle" className="text-[10px] fill-slate-500">1-bit signal changes</text>

              {/* Async wire */}
              <line x1="165" y1="70" x2="295" y2="70" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#lab-arr)" />
              <text x="230" y="58" textAnchor="middle" className="font-mono text-[10px] font-semibold fill-rose-500">Async Boundary</text>

              {/* FF1 */}
              <rect x="295" y="30" width="160" height="80" rx="8" className="fill-white dark:fill-slate-900" stroke="#f43f5e" strokeWidth="1.75" />
              <text x="375" y="58" textAnchor="middle" className="font-mono text-[11px] font-bold fill-rose-500">Sync FF1 (Settling)</text>
              <text x="375" y="76" textAnchor="middle" className="font-mono text-[10px] fill-slate-600 dark:fill-slate-300">@(posedge clk_dst)</text>
              <text x="375" y="96" textAnchor="middle" className="text-[10px] fill-slate-500">May go metastable 1 cycle</text>

              {/* Settling wire */}
              <line x1="455" y1="70" x2="555" y2="70" stroke="#06b6d4" strokeWidth="2" markerEnd="url(#lab-arr)" />
              <text x="505" y="58" textAnchor="middle" className="font-mono text-[10px] fill-cyan-600 dark:fill-cyan-400">1 clk settle</text>

              {/* FF2 */}
              <rect x="555" y="30" width="180" height="80" rx="8" className="fill-white dark:fill-slate-900" stroke="#10b981" strokeWidth="1.75" />
              <text x="645" y="58" textAnchor="middle" className="font-mono text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400">Sync FF2 (Clean Out)</text>
              <text x="645" y="76" textAnchor="middle" className="font-mono text-[10px] fill-slate-600 dark:fill-slate-300">@(posedge clk_dst)</text>
              <text x="645" y="96" textAnchor="middle" className="text-[10px] fill-slate-500">Safe to drive dst logic!</text>
            </svg>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded border border-rose-500/40 bg-rose-500/5 space-y-1.5">
                <div className="font-semibold text-rose-700 dark:text-rose-400">
                  Broken: Parallel 2-FF Sync on Binary Bus (0111 → 1000)
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Suppose a 4-bit counter steps from <code className="font-mono">0111</code> (7) to <code className="font-mono">1000</code> (8). All 4 wires flip simultaneously, but wire #3 arrives 50 ps earlier than wires #0..2. Destination FF1 can sample <code className="font-mono">1111</code> (15) or <code className="font-mono">0000</code> (0)—a completely phantom address!
                </p>
              </div>
              <div className="p-3.5 rounded border border-emerald-500/40 bg-emerald-500/5 space-y-1.5">
                <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Solution: Gray-Code Pointers + Dual-Port Async FIFO
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  An Async FIFO stores the wide data safely in RAM and only synchronizes the Read/Write pointers using <strong>Gray Code</strong> (where consecutive numbers differ by strictly 1 bit: e.g., <code className="font-mono">0100 → 1100</code>). Even if metastability delays that 1 bit by a cycle, you only get the old pointer or the new pointer—never corruption!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
