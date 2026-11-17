import React, { useMemo, useState } from 'react';
import { DepthLevel } from '../../../engine/explainerSchema';

export interface RendererProps {
  config: Record<string, unknown>;
  currentStep: number;
  totalSteps: number;
  depth: DepthLevel;
  reducedMotion: boolean;
  verificationMode: boolean;
  tryItValues: Record<string, string | boolean>;
  onJumpToStep?: (step: number) => void;
}

type SemKind = 'control' | 'data' | 'error' | 'active' | 'neutral';

function semHex(kind?: SemKind): string {
  switch (kind) {
    case 'control':
      return 'var(--sem-control)';
    case 'data':
      return 'var(--sem-data)';
    case 'error':
      return 'var(--sem-error)';
    case 'active':
      return 'var(--sem-active)';
    default:
      return '#64748b';
  }
}

function kindTextClass(kind?: SemKind): string {
  switch (kind) {
    case 'control':
      return 'text-blue-600 dark:text-blue-400';
    case 'data':
      return 'text-teal-600 dark:text-teal-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    case 'active':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-slate-600 dark:text-slate-300';
  }
}

/* ============================================================================
 * 1. BLOCK DIAGRAM WITH ANIMATED PACKETS ALONG WIRES
 * ========================================================================== */
interface BlockNodeCfg {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: SemKind;
}

interface BlockWireCfg {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string;
  kind: 'control' | 'data' | 'error';
}

interface BlockPacketCfg {
  step: number;
  wireId: string;
  label: string;
  kind: 'control' | 'data' | 'error' | 'active';
  progress?: number;
}

export const BlockPacketRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
  reducedMotion,
  tryItValues,
}) => {
  const width = (config.width as number) ?? 720;
  const height = (config.height as number) ?? 230;
  const nodes = (config.nodes as BlockNodeCfg[]) ?? [];
  const wires = (config.wires as BlockWireCfg[]) ?? [];
  const packets = (config.packets as BlockPacketCfg[]) ?? [];
  const backpressureActive = Boolean(tryItValues.backpressure);
  const errorInjected = Boolean(tryItValues.injectError);

  const activePackets = packets.filter((p) => p.step === currentStep);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3 bg-engineering-grid">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[600px] h-auto select-none"
        role="img"
        aria-label="Block diagram with animated signal and data packets"
      >
        <defs>
          <marker id="bp-arrow-control" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-control)" />
          </marker>
          <marker id="bp-arrow-data" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-data)" />
          </marker>
          <marker id="bp-arrow-error" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-error)" />
          </marker>
        </defs>

        {wires.map((w) => {
          const matchingPacket = activePackets.find((p) => p.wireId === w.id);
          const isStalledWire = backpressureActive && w.label.toLowerCase().includes('ready');
          const effectiveKind =
            errorInjected && matchingPacket
              ? 'error'
              : isStalledWire
              ? 'error'
              : matchingPacket
              ? matchingPacket.kind
              : w.kind;

          const strokeColor = semHex(effectiveKind);
          const midX = (w.fromX + w.toX) / 2;
          const midY = (w.fromY + w.toY) / 2;
          const frac = reducedMotion ? 0.5 : matchingPacket?.progress ?? 0.55;
          const px = w.fromX + (w.toX - w.fromX) * frac;
          const py = w.fromY + (w.toY - w.fromY) * frac;

          return (
            <g key={w.id}>
              <line
                x1={w.fromX}
                y1={w.fromY}
                x2={w.toX}
                y2={w.toY}
                stroke={strokeColor}
                strokeWidth={matchingPacket ? 3 : 1.75}
                strokeDasharray={isStalledWire ? '5 4' : undefined}
                markerEnd={`url(#bp-arrow-${effectiveKind === 'active' ? 'control' : effectiveKind})`}
                opacity={matchingPacket || isStalledWire ? 1 : 0.65}
              />
              <text
                x={midX}
                y={midY - 8}
                textAnchor="middle"
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="currentColor"
                className="text-slate-600 dark:text-slate-400"
              >
                {w.label}
              </text>

              {matchingPacket && (
                <g transform={`translate(${px}, ${py})`} className={reducedMotion ? '' : 'transition-transform duration-300'}>
                  <rect
                    x={-48}
                    y={-12}
                    width={96}
                    height={22}
                    rx={4}
                    fill={semHex(errorInjected ? 'error' : matchingPacket.kind)}
                    stroke="var(--sem-surface)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="var(--font-mono)"
                    fill="#ffffff"
                  >
                    {errorInjected ? 'ERR/STALL' : matchingPacket.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {nodes.map((n) => {
          const activeTarget = activePackets.some((p) => {
            const wire = wires.find((w) => w.id === p.wireId);
            return wire && Math.abs(wire.toX - n.x) < 40;
          });
          return (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={6}
                fill="var(--sem-surface)"
                stroke={activeTarget ? 'var(--sem-active)' : n.kind ? semHex(n.kind) : 'var(--sem-border)'}
                strokeWidth={activeTarget ? 2.5 : 1.5}
              />
              <text
                x={n.x + n.w / 2}
                y={n.y + (n.sublabel ? n.h / 2 - 4 : n.h / 2 + 4)}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="currentColor"
                className="text-slate-900 dark:text-slate-100"
              >
                {n.label}
              </text>
              {n.sublabel && (
                <text
                  x={n.x + n.w / 2}
                  y={n.y + n.h / 2 + 13}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fill="currentColor"
                  className="text-slate-500 dark:text-slate-400"
                >
                  {n.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ============================================================================
 * 2. SEQUENCE / MESSAGE-FLOW DIAGRAM WITH LIFELINES
 * ========================================================================== */
interface SeqLifeline {
  id: string;
  label: string;
  role: string;
}

interface SeqMessage {
  step: number;
  from: string;
  to: string;
  label: string;
  kind: 'control' | 'data' | 'error' | 'active';
  rule?: string;
}

export const SequenceFlowRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
  tryItValues,
  onJumpToStep,
}) => {
  const lifelines = (config.lifelines as SeqLifeline[]) ?? [];
  const messages = (config.messages as SeqMessage[]) ?? [];
  const backpressure = Boolean(tryItValues.backpressure);
  const errorInjected = Boolean(tryItValues.injectError);

  const count = Math.max(2, lifelines.length);
  const colWidth = 170;
  const svgWidth = Math.max(540, count * colWidth + 60);
  const rowH = 38;
  const headerH = 48;
  const svgHeight = headerH + messages.length * rowH + 24;

  const colCenter = (id: string) => {
    const idx = lifelines.findIndex((l) => l.id === id);
    return 40 + Math.max(0, idx) * colWidth + colWidth / 2;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full min-w-[560px] h-auto select-none"
        role="img"
        aria-label="Sequence flow diagram showing time-ordered protocol messages"
      >
        <defs>
          <marker id="seq-arrow-blue" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-control)" />
          </marker>
          <marker id="seq-arrow-teal" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-data)" />
          </marker>
          <marker id="seq-arrow-red" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-error)" />
          </marker>
          <marker id="seq-arrow-amber" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-active)" />
          </marker>
        </defs>

        {lifelines.map((ll, i) => {
          const cx = 40 + i * colWidth + colWidth / 2;
          return (
            <g key={ll.id}>
              <rect
                x={cx - 68}
                y={6}
                width={136}
                height={36}
                rx={5}
                fill="var(--sem-surface)"
                stroke="var(--sem-border)"
                strokeWidth={1.5}
              />
              <text x={cx} y={22} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" className="text-slate-900 dark:text-slate-100">
                {ll.label}
              </text>
              <text x={cx} y={35} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="currentColor" className="text-slate-500 dark:text-slate-400">
                {ll.role}
              </text>
              <line
                x1={cx}
                y1={42}
                x2={cx}
                y2={svgHeight - 10}
                stroke="var(--sem-border)"
                strokeDasharray="4 4"
                strokeWidth={1.25}
              />
            </g>
          );
        })}

        {messages.map((m, idx) => {
          const y = headerH + 20 + idx * rowH;
          const isCurrent = m.step === currentStep;
          const isPast = m.step < currentStep;
          const x1 = colCenter(m.from);
          const x2 = colCenter(m.to);
          const effectiveKind =
            (errorInjected && isCurrent) || (backpressure && m.label.includes('READY') && isCurrent)
              ? 'error'
              : m.kind;
          const color = isCurrent ? 'var(--sem-active)' : semHex(effectiveKind);
          const marker =
            effectiveKind === 'error'
              ? 'url(#seq-arrow-red)'
              : effectiveKind === 'data'
              ? 'url(#seq-arrow-teal)'
              : isCurrent
              ? 'url(#seq-arrow-amber)'
              : 'url(#seq-arrow-blue)';

          const selfLoop = x1 === x2;

          return (
            <g
              key={`${m.step}-${idx}`}
              onClick={() => onJumpToStep?.(m.step)}
              className="cursor-pointer"
              opacity={isCurrent ? 1 : isPast ? 0.72 : 0.35}
            >
              {isCurrent && (
                <rect x={4} y={y - 18} width={svgWidth - 8} height={32} rx={4} fill="var(--sem-active)" fillOpacity={0.11} />
              )}
              <text x={14} y={y + 3} fontSize="10" fontFamily="var(--font-mono)" fontWeight="600" fill="currentColor" className="text-slate-500 dark:text-slate-400">
                T{m.step}
              </text>

              {selfLoop ? (
                <path
                  d={`M ${x1} ${y - 6} h 34 v 14 h -34`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isCurrent ? 2.2 : 1.5}
                  markerEnd={marker}
                />
              ) : (
                <line
                  x1={x1}
                  y1={y}
                  x2={x2 + (x2 > x1 ? -4 : 4)}
                  y2={y}
                  stroke={color}
                  strokeWidth={isCurrent ? 2.4 : 1.6}
                  markerEnd={marker}
                />
              )}

              <text
                x={selfLoop ? x1 + 40 : (x1 + x2) / 2}
                y={y - 6}
                textAnchor={selfLoop ? 'start' : 'middle'}
                fontSize="10.5"
                fontFamily="var(--font-mono)"
                fontWeight={isCurrent ? '700' : '500'}
                fill="currentColor"
                className="text-slate-900 dark:text-slate-100"
              >
                {m.label}
              </text>
              {m.rule && isCurrent && (
                <text
                  x={selfLoop ? x1 + 40 : (x1 + x2) / 2}
                  y={y + 12}
                  textAnchor={selfLoop ? 'start' : 'middle'}
                  fontSize="9"
                  fill={semHex('active')}
                >
                  {m.rule}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ============================================================================
 * 3. CYCLE-ACCURATE WAVEFORM / TIMING DIAGRAM WITH SCRUBBABLE CURSOR
 * ========================================================================== */
interface WaveformSignalCfg {
  name: string;
  kind: 'control' | 'data' | 'error';
  values: string[];
  backpressureValues?: string[];
  errorValues?: string[];
}

export const WaveformTimelineRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
  totalSteps,
  tryItValues,
  onJumpToStep,
}) => {
  const signals = (config.signals as WaveformSignalCfg[]) ?? [];
  const cycles = Math.max(totalSteps, signals[0]?.values?.length ?? 6);
  const backpressure = Boolean(tryItValues.backpressure);
  const injectError = Boolean(tryItValues.injectError);

  const labelW = 148;
  const colW = 64;
  const rowH = 34;
  const topH = 26;
  const svgW = labelW + cycles * colW + 20;
  const svgH = topH + rowH * (signals.length + 1) + 12;

  const isBinary = (v: string) => v === '0' || v === '1' || v === 'L' || v === 'H';

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-3">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full min-w-[580px] h-auto select-none"
        role="img"
        aria-label="Cycle-accurate digital timing waveform with interactive clock cursor"
      >
        {/* Scrubbable cycle column headers */}
        {Array.from({ length: cycles }).map((_, c) => {
          const x = labelW + c * colW;
          const active = c === currentStep;
          return (
            <g key={c} onClick={() => onJumpToStep?.(c)} className="cursor-pointer">
              <rect
                x={x}
                y={2}
                width={colW}
                height={svgH - 6}
                fill={active ? 'var(--sem-active)' : 'transparent'}
                fillOpacity={active ? 0.1 : 0}
              />
              <line
                x1={x}
                y1={topH}
                x2={x}
                y2={svgH - 8}
                stroke={active ? 'var(--sem-active)' : 'var(--sem-border)'}
                strokeWidth={active ? 1.8 : 0.75}
                strokeDasharray={active ? undefined : '2 3'}
              />
              <text
                x={x + colW / 2}
                y={17}
                textAnchor="middle"
                fontSize="10"
                fontWeight={active ? '700' : '500'}
                fontFamily="var(--font-mono)"
                fill={active ? 'var(--sem-active)' : 'currentColor'}
                className={active ? '' : 'text-slate-500 dark:text-slate-400'}
              >
                T{c}
              </text>
            </g>
          );
        })}

        {/* Clock row */}
        <g>
          <text x={8} y={topH + 22} fontSize="11" fontWeight="600" fontFamily="var(--font-mono)" fill="currentColor" className="text-slate-700 dark:text-slate-300">
            ACLK / clk
          </text>
          {Array.from({ length: cycles }).map((_, c) => {
            const x = labelW + c * colW;
            const yHi = topH + 8;
            const yLo = topH + 26;
            const half = colW / 2;
            const d = `M ${x} ${yLo} L ${x} ${yHi} L ${x + half} ${yHi} L ${x + half} ${yLo} L ${x + colW} ${yLo}`;
            return <path key={c} d={d} fill="none" stroke="var(--sem-control)" strokeWidth={1.6} />;
          })}
        </g>

        {/* Data & Control rows */}
        {signals.map((sig, rIdx) => {
          const yTop = topH + (rIdx + 1) * rowH + 6;
          const yBot = yTop + 20;
          const yMid = (yTop + yBot) / 2;
          const vals =
            injectError && sig.errorValues
              ? sig.errorValues
              : backpressure && sig.backpressureValues
              ? sig.backpressureValues
              : sig.values;

          return (
            <g key={sig.name}>
              <text
                x={8}
                y={yMid + 4}
                fontSize="11"
                fontWeight="600"
                fontFamily="var(--font-mono)"
                fill="currentColor"
                className={kindTextClass(sig.kind)}
              >
                {sig.name}
              </text>

              {Array.from({ length: cycles }).map((_, c) => {
                const v = vals[c] ?? vals[vals.length - 1] ?? '0';
                const prev = c > 0 ? vals[c - 1] ?? v : v;
                const x = labelW + c * colW;
                const isErr = v.includes('ERR') || v === 'X' || v === 'SLVERR';
                const stroke = isErr ? 'var(--sem-error)' : semHex(sig.kind);

                if (isBinary(v)) {
                  const high = v === '1' || v === 'H';
                  const prevHigh = prev === '1' || prev === 'H';
                  const yCur = high ? yTop : yBot;
                  const yPrev = prevHigh ? yTop : yBot;
                  const edge = c > 0 && high !== prevHigh ? `M ${x} ${yPrev} L ${x} ${yCur}` : `M ${x} ${yCur}`;
                  return (
                    <g key={c}>
                      <path d={`${edge} L ${x + colW} ${yCur}`} fill="none" stroke={stroke} strokeWidth={2} />
                      <text
                        x={x + colW / 2}
                        y={yMid + 3}
                        textAnchor="middle"
                        fontSize="9"
                        fontFamily="var(--font-mono)"
                        fill="currentColor"
                        opacity={0.65}
                        className="text-slate-600 dark:text-slate-400"
                      >
                        {v}
                      </text>
                    </g>
                  );
                }

                // Multi-bit vector bus envelope
                const isIdle = v === '-' || v === 'IDLE' || v === 'Z';
                return (
                  <g key={c}>
                    <polygon
                      points={`${x + 4},${yTop} ${x + colW - 4},${yTop} ${x + colW},${yMid} ${x + colW - 4},${yBot} ${x + 4},${yBot} ${x},${yMid}`}
                      fill={isIdle ? 'transparent' : stroke}
                      fillOpacity={isIdle ? 0 : 0.14}
                      stroke={stroke}
                      strokeWidth={isIdle ? 1 : 1.7}
                    />
                    <text
                      x={x + colW / 2}
                      y={yMid + 3.5}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="600"
                      fontFamily="var(--font-mono)"
                      fill="currentColor"
                      className="text-slate-900 dark:text-slate-100"
                    >
                      {v}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ============================================================================
 * 4. FINITE STATE MACHINE VIEW (LIT STATE, TRANSITION ARCS, GUARD CONDITION)
 * ========================================================================== */
interface FsmStateNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: SemKind;
}

interface FsmEdge {
  from: string;
  to: string;
  guard: string;
  stepTrigger: number;
  kind?: SemKind;
}

export const FsmStateRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
  tryItValues,
}) => {
  const states = (config.states as FsmStateNode[]) ?? [];
  const transitions = (config.transitions as FsmEdge[]) ?? [];
  const activeStateByStep = (config.activeStateByStep as string[]) ?? [];
  const errorInjected = Boolean(tryItValues.injectError);

  const activeStateId = errorInjected && states.some((s) => s.id === 'ERROR')
    ? 'ERROR'
    : activeStateByStep[Math.min(currentStep, activeStateByStep.length - 1)] ?? states[0]?.id;

  const activeTransition = transitions.find((t) => t.stepTrigger === currentStep);
  const svgW = (config.width as number) ?? 680;
  const svgH = (config.height as number) ?? 230;

  return (
    <div className="space-y-2.5">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3 bg-engineering-grid">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[540px] h-auto select-none" role="img" aria-label="Finite state machine diagram">
          <defs>
            <marker id="fsm-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-control)" />
            </marker>
            <marker id="fsm-arrow-active" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-active)" />
            </marker>
            <marker id="fsm-arrow-error" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="var(--sem-error)" />
            </marker>
          </defs>

          {transitions.map((tr, i) => {
            const s1 = states.find((s) => s.id === tr.from);
            const s2 = states.find((s) => s.id === tr.to);
            if (!s1 || !s2) return null;
            const isActive = tr.stepTrigger === currentStep;
            const isErr = tr.kind === 'error' || (errorInjected && tr.to === 'ERROR');
            const color = isErr ? 'var(--sem-error)' : isActive ? 'var(--sem-active)' : 'var(--sem-control)';
            const marker = isErr ? 'url(#fsm-arrow-error)' : isActive ? 'url(#fsm-arrow-active)' : 'url(#fsm-arrow)';

            const mx = (s1.x + s2.x) / 2;
            const curveLift = s1.id === s2.id ? -42 : i % 2 === 0 ? -24 : 24;
            const my = (s1.y + s2.y) / 2 + curveLift;

            const pathD =
              s1.id === s2.id
                ? `M ${s1.x - 16} ${s1.y - 24} C ${s1.x - 32} ${s1.y - 68}, ${s1.x + 32} ${s1.y - 68}, ${s1.x + 16} ${s1.y - 24}`
                : `M ${s1.x} ${s1.y} Q ${mx} ${my} ${s2.x} ${s2.y}`;

            return (
              <g key={`${tr.from}-${tr.to}-${i}`} opacity={isActive ? 1 : 0.48}>
                <path d={pathD} fill="none" stroke={color} strokeWidth={isActive ? 2.5 : 1.4} markerEnd={marker} />
                <rect x={mx - 52} y={my - 10} width={104} height={18} rx={3} fill="var(--sem-surface)" stroke={color} strokeWidth={0.8} />
                <text x={mx} y={my + 2} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="currentColor" className="text-slate-800 dark:text-slate-200">
                  {tr.guard}
                </text>
              </g>
            );
          })}

          {states.map((st) => {
            const isCur = st.id === activeStateId;
            const stroke = st.kind === 'error' ? 'var(--sem-error)' : isCur ? 'var(--sem-active)' : 'var(--sem-control)';
            return (
              <g key={st.id}>
                <circle
                  cx={st.x}
                  cy={st.y}
                  r={isCur ? 30 : 26}
                  fill={isCur ? stroke : 'var(--sem-surface)'}
                  fillOpacity={isCur ? 0.18 : 1}
                  stroke={stroke}
                  strokeWidth={isCur ? 3 : 1.5}
                />
                <text
                  x={st.x}
                  y={st.y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  fill="currentColor"
                  className="text-slate-900 dark:text-slate-100"
                >
                  {st.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Current State:</span>{' '}
          <strong className="font-mono text-amber-600 dark:text-amber-400">{activeStateId}</strong>
        </div>
        <div className="font-mono text-slate-700 dark:text-slate-300">
          {activeTransition
            ? `Guard Fired: ${activeTransition.guard} (${activeTransition.from} -> ${activeTransition.to})`
            : 'Holding state until next guard condition'}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. FRAME / PACKET / REGISTER BIT-FIELD LAYOUT WITH LIVE HEX DECODER
 * ========================================================================== */
interface BitFieldItem {
  msb: number;
  lsb: number;
  name: string;
  kind: 'control' | 'data' | 'error';
  access?: string;
  description: string;
}

export const BitFieldLayoutRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
}) => {
  const widthBits = (config.widthBits as number) ?? 32;
  const defaultHex = (config.defaultHex as string) ?? '0x00000015';
  const presets = (config.presets as Array<{ label: string; hex: string }>) ?? [];
  const fields = (config.fields as BitFieldItem[]) ?? [];
  const regName = (config.registerName as string) ?? 'Packet / CSR Word';
  const highlightByStep = (config.highlightByStep as Record<number, string[]>) ?? {};

  const [hexInput, setHexInput] = useState(defaultHex);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  const parsedValue = useMemo(() => {
    const clean = hexInput.trim().replace(/^0x/i, '');
    const num = Number.parseInt(clean || '0', 16);
    return Number.isFinite(num) ? num >>> 0 : 0;
  }, [hexInput]);

  const highlightedNames = highlightByStep[currentStep] ?? [];

  const extractFieldBits = (msb: number, lsb: number) => {
    const width = msb - lsb + 1;
    const mask = width >= 32 ? 0xffffffff : ((1 << width) - 1) >>> 0;
    return (parsedValue >>> lsb) & mask;
  };

  const activeHoverObj = fields.find((f) => f.name === hoveredField);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{regName}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {widthBits}-bit layout · Value: 0x{parsedValue.toString(16).toUpperCase().padStart(widthBits / 4, '0')}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="text-[11px] text-slate-500 dark:text-slate-400" htmlFor={`hex-in-${regName}`}>
            Live Hex:
          </label>
          <input
            id={`hex-in-${regName}`}
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            className="w-32 px-2 py-1 text-xs font-mono tabular-nums rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            placeholder="0x00000015"
          />
          {presets.map((pr) => (
            <button
              key={pr.label}
              type="button"
              onClick={() => setHexInput(pr.hex)}
              className="px-2 py-1 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap"
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bit blocks (MSB left -> LSB right) */}
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[540px] gap-1">
          {fields.map((f) => {
            const span = f.msb - f.lsb + 1;
            const fieldVal = extractFieldBits(f.msb, f.lsb);
            const isHighlighted = highlightedNames.includes(f.name) || hoveredField === f.name;
            const pct = Math.max(8, (span / widthBits) * 100);
            const borderColor = isHighlighted ? 'var(--sem-active)' : semHex(f.kind);

            return (
              <button
                key={f.name}
                type="button"
                onMouseEnter={() => setHoveredField(f.name)}
                onMouseLeave={() => setHoveredField(null)}
                onClick={() => setHoveredField(f.name)}
                style={{ width: `${pct}%`, borderColor }}
                className={`text-left p-2 rounded border transition-colors cursor-pointer ${
                  isHighlighted
                    ? 'bg-amber-500/10 dark:bg-amber-500/15'
                    : 'bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  [{f.msb === f.lsb ? f.msb : `${f.msb}:${f.lsb}`}]
                </div>
                <div className={`text-xs font-mono font-bold truncate ${kindTextClass(f.kind)}`}>{f.name}</div>
                <div className="text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  0x{fieldVal.toString(16).toUpperCase()} ({fieldVal})
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Decoded field detail */}
      <div className="text-xs px-2.5 py-2 rounded bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
        {activeHoverObj ? (
          <div>
            <strong className="font-mono">{activeHoverObj.name}</strong> [{activeHoverObj.msb}:{activeHoverObj.lsb}]
            {activeHoverObj.access ? ` · ${activeHoverObj.access}` : ''} — {activeHoverObj.description}
          </div>
        ) : (
          <span>Hover or click any bit-field above, or edit the Live Hex input to inspect decoded bits in real time.</span>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 6. PIPELINE DIAGRAM WITH STAGES, BUBBLES, FLUSHES, FORWARDING PATHS
 * ========================================================================== */
interface PipeInsnRow {
  insn: string;
  pc: string;
  stages: string[]; // 'IF' | 'ID' | 'EX' | 'MEM' | 'WB' | 'BUBBLE' | 'FLUSH' | '-'
}

interface ForwardPathCfg {
  cycle: number;
  fromRow: number;
  toRow: number;
  label: string;
  kind: 'data' | 'error';
}

export const PipelineLanesRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
  tryItValues,
  onJumpToStep,
}) => {
  const scenarios = (config.scenarios as Record<string, { rows: PipeInsnRow[]; forwards: ForwardPathCfg[] }>) ?? {};
  const selectedHazard = String(tryItValues.hazardMode ?? Object.keys(scenarios)[0] ?? 'forwarding');
  const activeScenario = scenarios[selectedHazard] ?? Object.values(scenarios)[0] ?? { rows: [], forwards: [] };

  const cycleCount = Math.max(7, activeScenario.rows[0]?.stages.length ?? 7);
  const labelW = 148;
  const cellW = 62;
  const rowH = 38;
  const headerH = 26;
  const svgW = labelW + cycleCount * cellW + 16;
  const svgH = headerH + activeScenario.rows.length * rowH + 16;

  const cellStyle = (tok: string) => {
    if (tok === 'BUBBLE' || tok === 'STALL' || tok === 'FLUSH') {
      return { fill: 'var(--sem-error)', opacity: 0.22, stroke: 'var(--sem-error)', label: tok };
    }
    if (tok === 'EX' || tok === 'MEM') {
      return { fill: 'var(--sem-data)', opacity: 0.2, stroke: 'var(--sem-data)', label: tok };
    }
    if (tok === 'IF' || tok === 'ID' || tok === 'WB') {
      return { fill: 'var(--sem-control)', opacity: 0.18, stroke: 'var(--sem-control)', label: tok };
    }
    return { fill: 'transparent', opacity: 0, stroke: 'transparent', label: '' };
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-3">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[580px] h-auto select-none" role="img" aria-label="CPU pipeline stage execution diagram">
        <defs>
          <marker id="pipe-fwd-teal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="var(--sem-data)" />
          </marker>
          <marker id="pipe-fwd-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="var(--sem-error)" />
          </marker>
        </defs>

        {Array.from({ length: cycleCount }).map((_, c) => {
          const x = labelW + c * cellW;
          const active = c === currentStep;
          return (
            <g key={c} onClick={() => onJumpToStep?.(c)} className="cursor-pointer">
              <rect
                x={x}
                y={2}
                width={cellW}
                height={svgH - 4}
                fill={active ? 'var(--sem-active)' : 'transparent'}
                fillOpacity={active ? 0.12 : 0}
              />
              <text
                x={x + cellW / 2}
                y={17}
                textAnchor="middle"
                fontSize="10"
                fontWeight={active ? '700' : '500'}
                fontFamily="var(--font-mono)"
                fill={active ? 'var(--sem-active)' : 'currentColor'}
                className={active ? '' : 'text-slate-500 dark:text-slate-400'}
              >
                C{c}
              </text>
            </g>
          );
        })}

        {activeScenario.rows.map((row, rIdx) => {
          const y = headerH + rIdx * rowH;
          return (
            <g key={`${row.pc}-${rIdx}`}>
              <text x={8} y={y + 15} fontSize="10" fontFamily="var(--font-mono)" fill="currentColor" className="text-slate-500 dark:text-slate-400">
                {row.pc}
              </text>
              <text x={8} y={y + 28} fontSize="11" fontWeight="600" fontFamily="var(--font-mono)" fill="currentColor" className="text-slate-900 dark:text-slate-100">
                {row.insn}
              </text>

              {row.stages.map((tok, cIdx) => {
                if (tok === '-') return null;
                const st = cellStyle(tok);
                const x = labelW + cIdx * cellW + 3;
                const isCur = cIdx === currentStep;
                return (
                  <g key={cIdx}>
                    <rect
                      x={x}
                      y={y + 5}
                      width={cellW - 6}
                      height={28}
                      rx={4}
                      fill={st.fill}
                      fillOpacity={st.opacity}
                      stroke={isCur ? 'var(--sem-active)' : st.stroke}
                      strokeWidth={isCur ? 2.2 : 1.2}
                    />
                    <text
                      x={x + (cellW - 6) / 2}
                      y={y + 22}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="var(--font-mono)"
                      fill="currentColor"
                      className="text-slate-900 dark:text-slate-100"
                    >
                      {st.label}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Forwarding / Hazard bypass arcs */}
        {activeScenario.forwards.map((fw, idx) => {
          const x = labelW + fw.cycle * cellW + cellW / 2;
          const y1 = headerH + fw.fromRow * rowH + 22;
          const y2 = headerH + fw.toRow * rowH + 14;
          const isCur = fw.cycle === currentStep;
          const stroke = fw.kind === 'error' ? 'var(--sem-error)' : 'var(--sem-data)';
          return (
            <g key={idx} opacity={isCur ? 1 : 0.45}>
              <path
                d={`M ${x + 12} ${y1} C ${x + 34} ${y1}, ${x + 34} ${y2}, ${x + 10} ${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth={isCur ? 2.2 : 1.4}
                markerEnd={fw.kind === 'error' ? 'url(#pipe-fwd-red)' : 'url(#pipe-fwd-teal)'}
              />
              {isCur && (
                <text x={x + 26} y={(y1 + y2) / 2 + 3} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)" fill={stroke}>
                  {fw.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ============================================================================
 * 7. MEMORY MAP AND ADDRESS DECODE / MMU PAGE WALK VIEW
 * ========================================================================== */
interface MemRegionCfg {
  name: string;
  startHex: string;
  endHex: string;
  startNum: number;
  endNum: number;
  target: string;
  permissions: string;
  kind: 'control' | 'data' | 'error';
}

interface PageWalkStage {
  step: number;
  level: string;
  indexBits: string;
  pteFlags: string;
  note: string;
}

export const MemoryMapDecodeRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
}) => {
  const regions = (config.regions as MemRegionCfg[]) ?? [];
  const defaultAddr = (config.defaultAddrHex as string) ?? '0x40010010';
  const addrPresets = (config.addrPresets as string[]) ?? [];
  const pageWalk = (config.pageWalk as PageWalkStage[]) ?? [];

  const [addrInput, setAddrInput] = useState(defaultAddr);

  const addrVal = useMemo(() => {
    const clean = addrInput.trim().replace(/^0x/i, '');
    const n = Number.parseInt(clean || '0', 16);
    return Number.isFinite(n) ? n >>> 0 : 0;
  }, [addrInput]);

  const matchedRegion = regions.find((r) => addrVal >= r.startNum && addrVal <= r.endNum);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300" htmlFor="addr-decode-in">
            Probe Address:
          </label>
          <input
            id="addr-decode-in"
            type="text"
            value={addrInput}
            onChange={(e) => setAddrInput(e.target.value)}
            className="w-36 px-2.5 py-1 text-xs font-mono tabular-nums rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
          {addrPresets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAddrInput(p)}
              className="px-2 py-1 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="text-xs font-mono">
          {matchedRegion ? (
            <span className="text-teal-600 dark:text-teal-400">
              DECODE HIT: {matchedRegion.target} (+0x{(addrVal - matchedRegion.startNum).toString(16).toUpperCase()})
            </span>
          ) : (
            <span className="text-red-600 dark:text-red-400">DECERR: Unmapped Bus Fault</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {regions.map((r) => {
          const hit = matchedRegion?.name === r.name;
          return (
            <div
              key={r.name}
              style={{ borderColor: hit ? 'var(--sem-active)' : undefined }}
              className={`p-2.5 rounded border text-xs transition-colors ${
                hit
                  ? 'bg-amber-500/10 border-amber-500'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{r.name}</span>
                <span className={`font-mono text-[11px] ${kindTextClass(r.kind)}`}>{r.permissions}</span>
              </div>
              <div className="font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                {r.startHex} — {r.endHex} · Target: {r.target}
              </div>
            </div>
          );
        })}
      </div>

      {pageWalk.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Synchronized Translation / Decode Walk
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {pageWalk.map((pw) => {
              const active = pw.step === currentStep;
              return (
                <div
                  key={pw.level}
                  className={`p-2 rounded border text-xs ${
                    active
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-75'
                  }`}
                >
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100">{pw.level}</div>
                  <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400">{pw.indexBits}</div>
                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">Flags: {pw.pteFlags}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{pw.note}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
