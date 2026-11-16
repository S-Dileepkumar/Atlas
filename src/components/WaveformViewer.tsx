import React, { useEffect, useMemo, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ZoomIn, ZoomOut, AlertTriangle, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { WaveformScenario, WaveformSignalTrace } from '../types/protocol';

interface WaveformViewerProps {
  scenario: WaveformScenario;
  interactive?: boolean;
  title?: string;
}

interface ViolationItem {
  cycle: number;
  signal: string;
  message: string;
}

function detectHandshakeViolations(signals: WaveformSignalTrace[], cycles: number): ViolationItem[] {
  const violations: ViolationItem[] = [];
  const byName = new Map(signals.map((s) => [s.name, s]));

  // Generic VALID/READY stability rules across AXI4 / AXI4-Lite / AXI4-Stream / TileLink
  const pairs: Array<{ valid: string; ready: string; payloads: string[] }> = [
    { valid: 'AWVALID', ready: 'AWREADY', payloads: ['AWADDR', 'AWLEN'] },
    { valid: 'WVALID', ready: 'WREADY', payloads: ['WDATA', 'WLAST'] },
    { valid: 'BVALID', ready: 'BREADY', payloads: ['BRESP'] },
    { valid: 'ARVALID', ready: 'ARREADY', payloads: ['ARADDR'] },
    { valid: 'RVALID', ready: 'RREADY', payloads: ['RDATA', 'RLAST', 'RRESP'] },
    { valid: 'TVALID', ready: 'TREADY', payloads: ['TDATA', 'TKEEP', 'TLAST'] },
    { valid: 'VALID', ready: 'READY', payloads: ['PAYLOAD'] },
  ];

  for (const pair of pairs) {
    const vSig = byName.get(pair.valid);
    const rSig = byName.get(pair.ready);
    if (!vSig || !rSig) continue;

    for (let c = 0; c < cycles - 1; c++) {
      const vNow = vSig.values[c];
      const rNow = rSig.values[c];
      const vNext = vSig.values[c + 1];
      if (vNow === 1 && rNow === 0) {
        if (vNext !== 1) {
          violations.push({
            cycle: c + 1,
            signal: pair.valid,
            message: `${pair.valid} deasserted at cycle ${c + 1} before ${pair.ready} handshake completed.`,
          });
        }
        for (const pName of pair.payloads) {
          const pSig = byName.get(pName);
          if (pSig && pSig.values[c + 1] !== pSig.values[c]) {
            violations.push({
              cycle: c + 1,
              signal: pName,
              message: `${pName} mutated (${pSig.values[c]} -> ${pSig.values[c + 1]}) while ${pair.valid}=1 and ${pair.ready}=0.`,
            });
          }
        }
      }
    }
  }

  // APB setup -> access rule
  const psel = byName.get('PSEL');
  const penable = byName.get('PENABLE');
  const pready = byName.get('PREADY');
  if (psel && penable) {
    for (let c = 0; c < cycles; c++) {
      if (penable.values[c] === 1 && psel.values[c] !== 1) {
        violations.push({
          cycle: c,
          signal: 'PENABLE',
          message: `PENABLE=1 while PSEL=0 at cycle ${c} (illegal APB state).`,
        });
      }
      if (c > 0 && psel.values[c - 1] === 0 && psel.values[c] === 1 && penable.values[c] === 1) {
        violations.push({
          cycle: c,
          signal: 'PENABLE',
          message: `Missing 1-cycle SETUP phase at cycle ${c}: PENABLE rose simultaneously with PSEL.`,
        });
      }
      if (pready && c < cycles - 1 && psel.values[c] === 1 && penable.values[c] === 1 && pready.values[c] === 0) {
        if (psel.values[c + 1] !== 1 || penable.values[c + 1] !== 1) {
          violations.push({
            cycle: c + 1,
            signal: 'PSEL',
            message: `APB transfer aborted during wait state (PREADY=0) at cycle ${c + 1}.`,
          });
        }
      }
    }
  }

  return violations;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({ scenario, interactive = true, title }) => {
  const [signals, setSignals] = useState<WaveformSignalTrace[]>(scenario.signals);
  const [cursorCycle, setCursorCycle] = useState<number>(Math.min(2, scenario.cycles - 1));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [cellWidth, setCellWidth] = useState<number>(62);
  const [hiddenSignals, setHiddenSignals] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState<boolean>(false);

  useEffect(() => {
    setSignals(scenario.signals.map((s) => ({ ...s, values: [...s.values] })));
    setCursorCycle(0);
    setIsPlaying(false);
    setHiddenSignals({});
  }, [scenario]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setCursorCycle((prev) => (prev + 1) % scenario.cycles);
    }, 650);
    return () => window.clearInterval(timer);
  }, [isPlaying, scenario.cycles]);

  const visibleSignals = useMemo(
    () => signals.filter((s) => !hiddenSignals[s.name]),
    [signals, hiddenSignals]
  );

  const violations = useMemo(
    () => detectHandshakeViolations(signals, scenario.cycles),
    [signals, scenario.cycles]
  );

  const handshakeCycles = useMemo(() => {
    const result: number[] = [];
    const map = new Map(signals.map((s) => [s.name, s]));
    const checkPairs = [
      ['AWVALID', 'AWREADY'],
      ['WVALID', 'WREADY'],
      ['BVALID', 'BREADY'],
      ['ARVALID', 'ARREADY'],
      ['RVALID', 'RREADY'],
      ['TVALID', 'TREADY'],
      ['VALID', 'READY'],
      ['a_valid', 'a_ready'],
      ['d_valid', 'd_ready'],
    ];
    for (let c = 0; c < scenario.cycles; c++) {
      const hit = checkPairs.some(([v, r]) => map.get(v)?.values[c] === 1 && map.get(r)?.values[c] === 1);
      const apbHit = map.get('PSEL')?.values[c] === 1 && map.get('PENABLE')?.values[c] === 1 && map.get('PREADY')?.values[c] === 1;
      if (hit || apbHit) result.push(c);
    }
    return result;
  }, [signals, scenario.cycles]);

  const handleToggleBit = (sigName: string, cycle: number) => {
    if (!interactive || !editMode) return;
    setSignals((prev) =>
      prev.map((s) => {
        if (s.name !== sigName || s.type !== 'bit') return s;
        const nextVals = [...s.values];
        nextVals[cycle] = nextVals[cycle] === 1 ? 0 : 1;
        return { ...s, values: nextVals };
      })
    );
  };

  const resetTrace = () => {
    setSignals(scenario.signals.map((s) => ({ ...s, values: [...s.values] })));
    setCursorCycle(0);
    setIsPlaying(false);
  };

  const labelColW = 132;
  const rowH = 38;
  const headerH = 28;
  const svgW = labelColW + scenario.cycles * cellWidth + 16;
  const svgH = headerH + visibleSignals.length * rowH + 12;

  const activeAnnotations = scenario.annotations.filter((a) => a.cycle === cursorCycle);
  const activeViolations = violations.filter((v) => v.cycle === cursorCycle);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title || scenario.name}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{scenario.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={() => { setIsPlaying(false); setCursorCycle((c) => (c - 1 + scenario.cycles) % scenario.cycles); }}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Step Back"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setCursorCycle((c) => (c + 1) % scenario.cycles); }}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Step Forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={resetTrace}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset Waveform"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setCellWidth((w) => Math.max(40, w - 10))}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCellWidth((w) => Math.min(96, w + 10))}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {interactive && (
            <button
              type="button"
              onClick={() => setEditMode((m) => !m)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                editMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {editMode ? 'Editing Signals (Click Bit)' : 'Edit VALID/READY'}
            </button>
          )}
        </div>
      </div>

      {/* Signal Visibility Strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900">
        <span className="text-slate-500 dark:text-slate-400 font-medium">Signals:</span>
        {signals.map((sig) => {
          const isVisible = !hiddenSignals[sig.name];
          return (
            <button
              key={sig.name}
              type="button"
              onClick={() => setHiddenSignals((prev) => ({ ...prev, [sig.name]: !prev[sig.name] }))}
              className={`font-mono transition-colors cursor-pointer whitespace-nowrap ${
                isVisible
                  ? 'text-cyan-700 dark:text-cyan-400 font-medium'
                  : 'text-slate-400 dark:text-slate-600 line-through'
              }`}
            >
              {sig.name}
            </button>
          );
        })}
      </div>

      {/* SVG Waveform Canvas */}
      <div className="overflow-x-auto bg-engineering-grid bg-slate-50/40 dark:bg-[#080E1A]">
        <svg width={svgW} height={svgH} className="block select-none">
          {/* Cycle Header & Grid Lines */}
          {Array.from({ length: scenario.cycles }).map((_, c) => {
            const x = labelColW + c * cellWidth;
            const isSelected = c === cursorCycle;
            const isHandshake = handshakeCycles.includes(c);
            const hasErr = violations.some((v) => v.cycle === c);
            return (
              <g key={c} onClick={() => setCursorCycle(c)} className="cursor-pointer">
                <rect
                  x={x}
                  y={0}
                  width={cellWidth}
                  height={svgH}
                  fill={
                    hasErr
                      ? 'rgba(239, 68, 68, 0.10)'
                      : isSelected
                      ? 'rgba(6, 182, 212, 0.12)'
                      : isHandshake
                      ? 'rgba(16, 185, 129, 0.06)'
                      : 'transparent'
                  }
                />
                <line
                  x1={x}
                  y1={headerH}
                  x2={x}
                  y2={svgH}
                  stroke={isSelected ? '#06b6d4' : 'rgba(148,163,184,0.18)'}
                  strokeDasharray={isSelected ? undefined : '3 3'}
                  strokeWidth={isSelected ? 1.5 : 1}
                />
                <text
                  x={x + cellWidth / 2}
                  y={18}
                  textAnchor="middle"
                  className="font-mono text-[11px] tabular-nums"
                  fill={isSelected ? '#06b6d4' : '#64748b'}
                  fontWeight={isSelected ? 700 : 500}
                >
                  C{c}
                </text>
              </g>
            );
          })}

          {/* Signal Rows */}
          {visibleSignals.map((sig, rowIdx) => {
            const yTop = headerH + rowIdx * rowH + 6;
            const yBot = yTop + rowH - 12;
            const yMid = (yTop + yBot) / 2;

            // Build SVG path for clock / bit
            let pathD = '';
            if (sig.type === 'clock') {
              sig.values.forEach((_, c) => {
                const x0 = labelColW + c * cellWidth;
                const xm = x0 + cellWidth * 0.5;
                const x1 = x0 + cellWidth;
                if (c === 0) pathD += `M ${x0} ${yBot} `;
                pathD += `L ${x0} ${yTop} L ${xm} ${yTop} L ${xm} ${yBot} L ${x1} ${yBot} `;
              });
            } else if (sig.type === 'bit') {
              sig.values.forEach((val, c) => {
                const x0 = labelColW + c * cellWidth;
                const x1 = x0 + cellWidth;
                const y = val === 1 ? yTop : yBot;
                if (c === 0) pathD += `M ${x0} ${y} L ${x1} ${y} `;
                else {
                  const prevY = sig.values[c - 1] === 1 ? yTop : yBot;
                  if (prevY !== y) pathD += `L ${x0} ${y} `;
                  pathD += `L ${x1} ${y} `;
                }
              });
            }

            const isValidSig = sig.name.includes('VALID') || sig.name === 'PSEL' || sig.name === 'PENABLE';
            const isReadySig = sig.name.includes('READY');
            const strokeColor =
              sig.type === 'clock'
                ? '#94a3b8'
                : isValidSig
                ? '#06b6d4'
                : isReadySig
                ? '#10b981'
                : '#3b82f6';

            return (
              <g key={sig.name}>
                {/* Row divider */}
                <line
                  x1={0}
                  y1={headerH + rowIdx * rowH}
                  x2={svgW}
                  y2={headerH + rowIdx * rowH}
                  stroke="rgba(148,163,184,0.12)"
                />
                {/* Signal name */}
                <text
                  x={14}
                  y={yMid + 4}
                  className="font-mono text-[12px]"
                  fill="currentColor"
                  fontWeight={600}
                >
                  {sig.name}
                </text>

                {sig.type === 'bus' ? (
                  sig.values.map((val, c) => {
                    const x0 = labelColW + c * cellWidth;
                    const x1 = x0 + cellWidth;
                    const isEmpty = val === '-' || val === 'Z';
                    if (isEmpty) {
                      return (
                        <line
                          key={c}
                          x1={x0}
                          y1={yMid}
                          x2={x1}
                          y2={yMid}
                          stroke="#64748b"
                          strokeWidth={1.5}
                          strokeDasharray={val === 'Z' ? '3 2' : undefined}
                        />
                      );
                    }
                    const poly = `${x0 + 3},${yMid} ${x0 + 8},${yTop} ${x1 - 8},${yTop} ${x1 - 3},${yMid} ${x1 - 8},${yBot} ${x0 + 8},${yBot}`;
                    return (
                      <g key={c} onClick={() => setCursorCycle(c)} className="cursor-pointer">
                        <polygon
                          points={poly}
                          fill="rgba(59, 130, 246, 0.14)"
                          stroke="#3b82f6"
                          strokeWidth={1.5}
                        />
                        <text
                          x={x0 + cellWidth / 2}
                          y={yMid + 3.5}
                          textAnchor="middle"
                          className="font-mono text-[11px] tabular-nums"
                          fill="#60a5fa"
                          fontWeight={600}
                        >
                          {String(val)}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  <>
                    <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2} />
                    {sig.type === 'bit' &&
                      editMode &&
                      sig.values.map((val, c) => {
                        const x0 = labelColW + c * cellWidth;
                        return (
                          <rect
                            key={c}
                            x={x0 + 2}
                            y={yTop - 3}
                            width={cellWidth - 4}
                            height={rowH - 6}
                            fill="transparent"
                            className="cursor-pointer hover:fill-amber-500/15"
                            onClick={() => handleToggleBit(sig.name, c)}
                          >
                            <title>Click to toggle {sig.name} at C{c} (currently {val})</title>
                          </rect>
                        );
                      })}
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Cycle Inspector & Compliance Status Footer */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400 tabular-nums">
              Inspecting Cycle C{cursorCycle}
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-slate-600 dark:text-slate-300 font-mono tabular-nums">
              {visibleSignals
                .filter((s) => s.type !== 'clock')
                .slice(0, 5)
                .map((s) => `${s.name}=${s.values[cursorCycle]}`)
                .join('  |  ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {violations.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Protocol Compliance: Clean ({handshakeCycles.length} handshakes)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {violations.length} Protocol Violation{violations.length > 1 ? 's' : ''} Detected
              </span>
            )}
          </div>
        </div>

        {/* Student Plain-English Cycle Narration */}
        {(() => {
          const getVal = (name: string) => visibleSignals.find((s) => s.name === name)?.values[cursorCycle];
          const pairs = [
            ['AWVALID', 'AWREADY', 'Write Address'],
            ['WVALID', 'WREADY', 'Write Data'],
            ['BVALID', 'BREADY', 'Write Response'],
            ['ARVALID', 'ARREADY', 'Read Address'],
            ['RVALID', 'RREADY', 'Read Data'],
            ['TVALID', 'TREADY', 'Stream Beat'],
            ['VALID', 'READY', 'Channel Transfer'],
          ];
          const handshakes = pairs.filter(([v, r]) => getVal(v) === 1 && getVal(r) === 1).map(([, , lbl]) => lbl);
          const stalls = pairs.filter(([v, r]) => getVal(v) === 1 && getVal(r) === 0).map(([, , lbl]) => lbl);
          const apbSetup = getVal('PSEL') === 1 && getVal('PENABLE') === 0;
          const apbAccessWait = getVal('PSEL') === 1 && getVal('PENABLE') === 1 && getVal('PREADY') === 0;
          const apbDone = getVal('PSEL') === 1 && getVal('PENABLE') === 1 && getVal('PREADY') === 1;

          let msg = 'Bus is idle or waiting for the next initiator assertion on the rising clock edge.';
          if (handshakes.length > 0) {
            msg = `Handshake committed at rising edge C${cursorCycle}! Both sender (VALID=1) and receiver (READY=1) agreed on: ${handshakes.join(', ')}.`;
          } else if (stalls.length > 0) {
            msg = `Backpressure / Wait State at C${cursorCycle}: Initiator holds VALID=1 with stable payload on ${stalls.join(', ')}, waiting for receiver READY=1.`;
          } else if (apbDone) {
            msg = `APB Access complete at C${cursorCycle}: PSEL=1, PENABLE=1, and PREADY=1 all align on this rising clock edge.`;
          } else if (apbSetup) {
            msg = `APB Setup phase at C${cursorCycle}: PSEL=1 wakes the peripheral while PENABLE stays 0 for 1 setup cycle.`;
          } else if (apbAccessWait) {
            msg = `APB Wait State at C${cursorCycle}: Peripheral holds PREADY=0, stalling PENABLE=1 for an extra cycle.`;
          }
          return (
            <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/70 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800">
              <strong className="text-cyan-700 dark:text-cyan-400">What is happening at C{cursorCycle}:</strong> {msg}
            </div>
          );
        })()}

        {activeAnnotations.map((ann, i) => (
          <div
            key={i}
            className={`text-xs px-3 py-1.5 rounded border ${
              ann.severity === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                : ann.severity === 'warn'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
            }`}
          >
            Cycle C{ann.cycle}: {ann.label}
          </div>
        ))}

        {activeViolations.map((v, i) => (
          <div
            key={`v-${i}`}
            className="text-xs px-3 py-1.5 rounded border bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 font-medium"
          >
            Live Rule Violation (C{v.cycle} · {v.signal}): {v.message}
          </div>
        ))}
      </div>
    </div>
  );
};
