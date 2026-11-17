import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    { valid: 'a_valid', ready: 'a_ready', payloads: ['a_opcode', 'a_address', 'a_data'] },
    { valid: 'd_valid', ready: 'd_ready', payloads: ['d_opcode', 'd_data'] },
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
  const [hoveredCell, setHoveredCell] = useState<{
    sigName: string;
    cycle: number;
    value: string | number;
    type: WaveformSignalTrace['type'];
    xPx: number;
    yPx: number;
  } | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);

  const showHoverTooltip = (
    target: SVGGElement | SVGRectElement,
    sigName: string,
    cycle: number,
    value: string | number,
    type: WaveformSignalTrace['type']
  ) => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;
    const wRect = wrapper.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    const rawCenter = tRect.left - wRect.left + tRect.width / 2;
    const clampedX = Math.max(88, Math.min(Math.max(88, wRect.width - 88), rawCenter));
    const yPx = Math.max(8, tRect.top - wRect.top - 4);
    setHoveredCell({ sigName, cycle, value, type, xPx: clampedX, yPx });
  };

  useEffect(() => {
    setSignals(scenario.signals.map((s) => ({ ...s, values: [...s.values] })));
    setCursorCycle(0);
    setIsPlaying(false);
    setHiddenSignals({});
    setHoveredCell(null);
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
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] rounded-t-lg">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {title || scenario.name}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{scenario.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={() => { setIsPlaying(false); setCursorCycle((c) => (c - 1 + scenario.cycles) % scenario.cycles); }}
            className="p-1.5 rounded-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
            title="Prev Clock Edge"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setCursorCycle((c) => (c + 1) % scenario.cycles); }}
            className="p-1.5 rounded-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
            title="Next Clock Edge"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetTrace}
            className="p-1.5 rounded-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
            title="Reset Waveform"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <span className="h-4 w-px bg-[var(--border-subtle)] mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setCellWidth((w) => Math.max(40, w - 10))}
            className="p-1.5 rounded-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCellWidth((w) => Math.min(96, w + 10))}
            className="p-1.5 rounded-md border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {interactive && (
            <button
              type="button"
              onClick={() => setEditMode((m) => !m)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                editMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {editMode ? 'Editing Signals (Click Bit)' : 'Edit VALID/READY'}
            </button>
          )}
        </div>
      </div>

      {/* Signal Visibility Strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-6 py-2.5 border-b border-[var(--border-subtle)] text-xs bg-[var(--bg-surface)]">
        <span className="text-[var(--text-secondary)] font-medium">Signals:</span>
        {signals.map((sig) => {
          const isVisible = !hiddenSignals[sig.name];
          return (
            <button
              key={sig.name}
              type="button"
              onClick={() => setHiddenSignals((prev) => ({ ...prev, [sig.name]: !prev[sig.name] }))}
              className={`font-mono transition-colors cursor-pointer whitespace-nowrap ${
                isVisible
                  ? 'text-[var(--sem-control)] font-medium'
                  : 'text-[var(--text-secondary)] opacity-45 line-through'
              }`}
            >
              {sig.name}
            </button>
          );
        })}
      </div>

      {/* SVG Waveform Canvas + Unclipped Floating Tooltip */}
      <div ref={canvasWrapperRef} className="relative overflow-visible">
        {hoveredCell && (
          <div
            className="waveform-tooltip pointer-events-none absolute z-30 px-3 py-2 text-xs min-w-[164px] -translate-x-1/2 -translate-y-full transition-all duration-150"
            style={{
              left: `${hoveredCell.xPx}px`,
              top: `${hoveredCell.yPx}px`,
            }}
          >
            <div className="flex items-center justify-between gap-3 font-mono font-semibold text-[var(--text-primary)]">
              <span>{hoveredCell.sigName}</span>
              <span className="text-[var(--sem-control)] tabular-nums">C{hoveredCell.cycle}</span>
            </div>
            <div className="font-mono tabular-nums text-[11px] text-[var(--text-secondary)] mt-0.5">
              Value:{' '}
              <strong className="text-[var(--text-primary)]">
                {String(hoveredCell.value)}
              </strong>{' '}
              ({hoveredCell.type})
            </div>
          </div>
        )}

        {visibleSignals.length === 0 ? (
          <div className="py-10 px-6 text-center text-xs text-[var(--text-secondary)] bg-[var(--bg-canvas)]">
            All signal traces are hidden. Click any signal name above to restore its waveform.
          </div>
        ) : (
        <div
          className="overflow-x-auto bg-engineering-grid bg-[var(--bg-canvas)] py-2"
          onMouseLeave={() => setHoveredCell(null)}
        >
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
                        ? 'var(--sem-error)'
                        : isHandshake
                        ? 'var(--sem-high)'
                        : 'transparent'
                    }
                    fillOpacity={hasErr ? 0.08 : isHandshake ? 0.05 : 0}
                  />
                  <line
                    x1={x}
                    y1={headerH}
                    x2={x}
                    y2={svgH}
                    stroke="var(--border-subtle)"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  <text
                    x={x + cellWidth / 2}
                    y={18}
                    textAnchor="middle"
                    className="font-mono text-[11px] tabular-nums svg-glide"
                    fill={isSelected ? 'var(--sem-control)' : 'var(--text-secondary)'}
                    fontWeight={isSelected ? 700 : 500}
                  >
                    C{c}
                  </text>
                </g>
              );
            })}

            {/* Gliding Active Cycle Cursor */}
            <g
              className="svg-glide pointer-events-none"
              style={{ transform: `translateX(${labelColW + cursorCycle * cellWidth}px)` }}
            >
              <rect
                x={0}
                y={0}
                width={cellWidth}
                height={svgH}
                fill="var(--sem-control)"
                fillOpacity={0.11}
              />
              <line
                x1={0}
                y1={headerH}
                x2={0}
                y2={svgH}
                stroke="var(--sem-control)"
                strokeWidth={1.75}
              />
            </g>

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
                ? 'var(--text-secondary)'
                : isValidSig
                ? 'var(--sem-high)'
                : isReadySig
                ? 'var(--sem-control)'
                : 'var(--sem-control)';

            return (
              <g key={sig.name}>
                {/* Row divider */}
                <line
                  x1={0}
                  y1={headerH + rowIdx * rowH}
                  x2={svgW}
                  y2={headerH + rowIdx * rowH}
                  stroke="var(--border-subtle)"
                  strokeOpacity={0.65}
                />
                {/* Signal name */}
                <text
                  x={14}
                  y={yMid + 4}
                  className="font-mono text-[12px]"
                  fill="var(--text-primary)"
                  fontWeight={600}
                >
                  {sig.name}
                </text>

                {sig.type === 'bus' ? (
                  sig.values.map((val, c) => {
                    const x0 = labelColW + c * cellWidth;
                    const x1 = x0 + cellWidth;
                    const isEmpty = val === '-' || val === 'Z';
                    const isErrVal = String(val) === 'X' || String(val).includes('ERR');
                    const stroke = isErrVal ? 'var(--sem-error)' : val === 'Z' ? 'var(--sem-active)' : 'var(--sem-control)';
                    if (isEmpty) {
                      return (
                        <line
                          key={c}
                          x1={x0}
                          y1={yMid}
                          x2={x1}
                          y2={yMid}
                          stroke={stroke}
                          strokeWidth={1.5}
                          strokeDasharray={val === 'Z' ? '3 2' : undefined}
                        />
                      );
                    }
                    const poly = `${x0 + 3},${yMid} ${x0 + 8},${yTop} ${x1 - 8},${yTop} ${x1 - 3},${yMid} ${x1 - 8},${yBot} ${x0 + 8},${yBot}`;
                    return (
                      <g
                        key={c}
                        onClick={() => setCursorCycle(c)}
                        onMouseEnter={(e) => showHoverTooltip(e.currentTarget, sig.name, c, val, sig.type)}
                        className="cursor-pointer"
                      >
                        <polygon
                          points={poly}
                          fill={stroke}
                          fillOpacity={0.12}
                          stroke={stroke}
                          strokeWidth={1.5}
                        />
                        <text
                          x={x0 + cellWidth / 2}
                          y={yMid + 3.5}
                          textAnchor="middle"
                          className="font-mono text-[11px] tabular-nums"
                          fill="var(--text-primary)"
                          fontWeight={600}
                        >
                          {String(val)}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  <>
                    <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={2} className="svg-glide" />
                    {sig.values.map((val, c) => {
                      const x0 = labelColW + c * cellWidth;
                      return (
                        <rect
                          key={c}
                          x={x0 + 2}
                          y={yTop - 3}
                          width={cellWidth - 4}
                          height={rowH - 6}
                          fill="transparent"
                          className={`cursor-pointer ${editMode && sig.type === 'bit' ? 'hover:fill-amber-500/15' : ''}`}
                          onClick={() => (editMode && sig.type === 'bit' ? handleToggleBit(sig.name, c) : setCursorCycle(c))}
                          onMouseEnter={(e) => showHoverTooltip(e.currentTarget, sig.name, c, val, sig.type)}
                        />
                      );
                    })}
                  </>
                )}
              </g>
            );
          })}
          </svg>
        </div>
        )}
      </div>

      {/* Cycle Inspector & Compliance Status Footer */}
      <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] rounded-b-lg flex flex-col gap-2.5">
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
            ['a_valid', 'a_ready', 'TileLink Channel A'],
            ['d_valid', 'd_ready', 'TileLink Channel D'],
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
            <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-canvas)] px-3.5 py-2 rounded border border-[var(--border-subtle)]">
              <strong className="text-[var(--sem-control)]">What is happening at C{cursorCycle}:</strong> {msg}
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
