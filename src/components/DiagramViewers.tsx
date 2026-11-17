import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Download, GraduationCap } from 'lucide-react';
import { BlockDiagramLink, BlockDiagramNode, FsmStateNode, FsmTransition } from '../types/protocol';
import {
  explainFsmStateLikeStudent,
  explainFsmTransitionLikeStudent,
  explainSignalLikeStudent,
} from '../data/studentExplainers';

const ROLE_STYLES: Record<BlockDiagramNode['role'], { stroke: string; badge: string; studentHint: string }> = {
  manager: {
    stroke: '#3b82f6',
    badge: 'Initiator / Manager',
    studentHint:
      'Initiator (Manager): The block that starts a conversation (e.g., a CPU or DMA saying "Read this address" or "Write these bytes").',
  },
  interconnect: {
    stroke: '#06b6d4',
    badge: 'Switch / Fabric',
    studentHint:
      'Interconnect / Bridge: The traffic router that checks the destination address, arbitrates when two senders collide, and steers packets cleanly.',
  },
  subordinate: {
    stroke: '#10b981',
    badge: 'Target / Subordinate',
    studentHint:
      'Target (Subordinate): The responder (like SRAM, DDR, or UART) that fulfills the request and sends back data or an OKAY receipt.',
  },
  memory: {
    stroke: '#f59e0b',
    badge: 'Memory / DRAM',
    studentHint:
      'Memory Array / Controller: Stores instructions and data persistently during operation using strict bank/row activation or SRAM read/write timing.',
  },
  phy: {
    stroke: '#8b5cf6',
    badge: 'PHY / SerDes Layer',
    studentHint:
      'Physical Layer (PHY): Converts clean digital bus signals inside the chip into high-speed electrical waveforms (differential pairs, DDR strobes, or IO pads) on the pins.',
  },
};

export const BlockDiagramSvg: React.FC<{ nodes: BlockDiagramNode[]; links: BlockDiagramLink[] }> = ({
  nodes,
  links,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id || null);
  const [selectedLinkIdx, setSelectedLinkIdx] = useState<number | null>(null);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  useEffect(() => {
    setSelectedNodeId(nodes[0]?.id || null);
    setSelectedLinkIdx(null);
  }, [nodes, links]);

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: -12, minY: -16, width: 760, height: 260 };
    const minNodeX = Math.min(...nodes.map((n) => n.x), 0);
    const minNodeY = Math.min(...nodes.map((n) => n.y), 0);
    const maxX = Math.max(...nodes.map((n) => n.x + n.width), 700);
    const maxY = Math.max(...nodes.map((n) => n.y + n.height), 200);
    const minX = Math.min(-16, minNodeX - 16);
    const minY = Math.min(-24, minNodeY - 24);
    return {
      minX,
      minY,
      width: maxX - minX + 36,
      height: maxY - minY + 44,
    };
  }, [nodes]);

  const activeNode = selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;
  const activeLink = selectedLinkIdx !== null ? links[selectedLinkIdx] || null : null;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-6 space-y-4 bg-engineering-grid">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
        <span>Interactive Architecture Diagram · Click any block or arrow link to read its student explanation</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Manager</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Interconnect</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Subordinate</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
          className="w-full min-w-[540px] h-auto max-h-[300px] select-none"
        >
          <defs>
            <marker id="arrow-cyan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--sem-control)" />
            </marker>
            <marker id="arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--sem-high)" />
            </marker>
          </defs>

          {links.map((link, idx) => {
            const a = nodeMap.get(link.from);
            const b = nodeMap.get(link.to);
            if (!a || !b) return null;

            const acx = a.x + a.width / 2;
            const bcx = b.x + b.width / 2;
            const acy = a.y + a.height / 2;
            const bcy = b.y + b.height / 2;
            const isVerticalStack = Math.abs(acx - bcx) < Math.max(a.width, b.width) * 0.5 && Math.abs(acy - bcy) > 30;

            let x1: number, y1: number, x2: number, y2: number, cx1: number, cy1: number, cx2: number, cy2: number;
            if (isVerticalStack) {
              const goingDown = acy <= bcy;
              const laneShift = (idx % 2 === 0 ? -16 : 16);
              x1 = acx + laneShift;
              y1 = goingDown ? a.y + a.height : a.y;
              x2 = bcx + laneShift;
              y2 = goingDown ? b.y : b.y + b.height;
              cx1 = x1;
              cy1 = y1 + (y2 - y1) * 0.45;
              cx2 = x2;
              cy2 = y2 - (y2 - y1) * 0.45;
            } else {
              const goingRight = a.x <= b.x;
              x1 = goingRight ? a.x + a.width : a.x;
              x2 = goingRight ? b.x : b.x + b.width;
              const sameSideOffset = (idx % 2 === 0 ? -12 : 12) + Math.floor(idx / 2) * 6;
              y1 = acy + sameSideOffset;
              y2 = bcy + sameSideOffset;
              cx1 = x1 + (x2 - x1) * 0.45;
              cy1 = y1;
              cx2 = x2 - (x2 - x1) * 0.45;
              cy2 = y2;
            }

            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const isHighlighted =
              selectedLinkIdx === idx ||
              (selectedLinkIdx === null && (!selectedNodeId || link.from === selectedNodeId || link.to === selectedNodeId));

            return (
              <g
                key={idx}
                opacity={isHighlighted ? 1 : 0.35}
                onClick={() => {
                  setSelectedLinkIdx(idx);
                  setSelectedNodeId(null);
                }}
                className="cursor-pointer svg-glide"
              >
                <path
                  d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={isHighlighted ? 'var(--sem-control)' : 'var(--text-secondary)'}
                  strokeWidth={isHighlighted ? 2.2 : 1.3}
                  markerEnd={isHighlighted ? 'url(#arrow-active)' : 'url(#arrow-cyan)'}
                  className="svg-glide"
                />
                <circle cx={x1} cy={y1} r={3} fill="var(--sem-control)" />
                <rect
                  x={mx - 62}
                  y={my - 10}
                  width={124}
                  height={19}
                  rx={4}
                  fill="var(--bg-elevated)"
                  stroke="var(--border-subtle)"
                />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  className="font-mono text-[9.5px] font-medium"
                  fill="var(--sem-control)"
                >
                  {link.label.length > 21 ? `${link.label.slice(0, 19)}..` : link.label}
                </text>
              </g>
            );
          })}

          {nodes.map((node) => {
            const st = ROLE_STYLES[node.role];
            const isSel = selectedNodeId === node.id;
            return (
              <g
                key={node.id}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setSelectedLinkIdx(null);
                }}
                className="cursor-pointer svg-glide"
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={8}
                  fill={isSel ? 'var(--bg-elevated)' : 'var(--bg-surface)'}
                  stroke={st.stroke}
                  strokeWidth={isSel ? 2.2 : 1.4}
                  className="svg-glide"
                />
                <rect
                  x={node.x + 1}
                  y={node.y + 1}
                  width={node.width - 2}
                  height={4}
                  rx={3}
                  fill={st.stroke}
                  opacity={0.85}
                />
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 - 2}
                  textAnchor="middle"
                  className="font-display text-[13px] font-semibold"
                  fill="var(--text-primary)"
                >
                  {node.label}
                </text>
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 16}
                  textAnchor="middle"
                  className="font-mono text-[9.5px] uppercase"
                  fill="var(--text-secondary)"
                >
                  {st.badge}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {(activeNode || activeLink) && (
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
          <GraduationCap className="w-4 h-4 text-[var(--sem-control)] shrink-0 mt-0.5" />
          {activeNode ? (
            <div>
              <strong className="text-[var(--text-primary)]">{activeNode.label}:</strong>{' '}
              {ROLE_STYLES[activeNode.role].studentHint}
            </div>
          ) : activeLink ? (
            <div>
              <strong className="text-[var(--text-primary)]">
                Wire Connection ({nodeMap.get(activeLink.from)?.label} → {nodeMap.get(activeLink.to)?.label} · {activeLink.label}):
              </strong>{' '}
              {explainSignalLikeStudent(activeLink.label)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export const FsmDiagramSvg: React.FC<{ states: FsmStateNode[]; transitions: FsmTransition[] }> = ({
  states,
  transitions,
}) => {
  const [selectedState, setSelectedState] = useState<string>(states[0]?.id || '');
  const [selectedTransition, setSelectedTransition] = useState<number | null>(null);
  const stateMap = useMemo(() => new Map(states.map((s) => [s.id, s])), [states]);

  useEffect(() => {
    setSelectedState(states[0]?.id || '');
    setSelectedTransition(null);
  }, [states, transitions]);

  const bounds = useMemo(() => {
    if (states.length === 0) return { minX: -24, minY: -44, width: 700, height: 260 };
    const minStateX = Math.min(...states.map((s) => s.x), 36);
    const minStateY = Math.min(...states.map((s) => s.y), 40);
    const maxX = Math.max(...states.map((s) => s.x + 130), 660);
    const maxY = Math.max(...states.map((s) => s.y + 125), 215);
    const minX = Math.min(-24, minStateX - 48);
    const minY = Math.min(-44, minStateY - 52);
    return {
      minX,
      minY,
      width: maxX - minX + 36,
      height: maxY - minY + 24,
    };
  }, [states]);

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-6 bg-engineering-grid space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
        <span>Interactive Finite State Machine · Click any state circle or transition arrow to read plain-English logic</span>
        <span className="font-mono text-[var(--sem-high)] font-medium">RST → Initial State</span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
          className="w-full min-w-[520px] h-auto max-h-[250px] select-none"
        >
          <defs>
            <marker id="fsm-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--sem-control)" />
            </marker>
            <marker id="fsm-reset" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="var(--sem-high)" />
            </marker>
          </defs>

          {states[0] && (
            <g>
              <line
                x1={states[0].x - 36}
                y1={states[0].y + 24}
                x2={states[0].x}
                y2={states[0].y + 24}
                stroke="var(--sem-high)"
                strokeWidth={1.75}
                markerEnd="url(#fsm-reset)"
              />
              <text
                x={states[0].x - 20}
                y={states[0].y + 14}
                textAnchor="middle"
                className="font-mono text-[9px] font-bold"
                fill="var(--sem-high)"
              >
                RST
              </text>
            </g>
          )}

          {transitions.map((t, i) => {
            const a = stateMap.get(t.from);
            const b = stateMap.get(t.to);
            if (!a || !b) return null;

            const isSelfLoop = a.id === b.id;
            const forward = a.x < b.x;
            const path = isSelfLoop
              ? `M ${a.x + 35} ${a.y} C ${a.x + 25} ${a.y - 36}, ${a.x + 85} ${a.y - 36}, ${a.x + 75} ${a.y}`
              : forward
              ? `M ${a.x + 110} ${a.y + 24} Q ${(a.x + 110 + b.x) / 2} ${a.y - 22} ${b.x} ${b.y + 24}`
              : `M ${a.x + 55} ${a.y + 48} Q ${(a.x + b.x) / 2 + 55} ${a.y + 104} ${b.x + 55} ${b.y + 48}`;

            const labelX = isSelfLoop ? a.x + 55 : (a.x + b.x) / 2 + 55;
            const labelY = isSelfLoop ? a.y - 32 : forward ? a.y - 10 : a.y + 98;
            const active =
              selectedTransition === i ||
              (selectedTransition === null && (selectedState === t.from || selectedState === t.to));

            return (
              <g
                key={i}
                opacity={active ? 1 : 0.45}
                onClick={() => {
                  setSelectedTransition(i);
                  setSelectedState('');
                }}
                className="cursor-pointer svg-glide"
              >
                <path
                  d={path}
                  fill="none"
                  stroke={active ? 'var(--sem-control)' : 'var(--text-secondary)'}
                  strokeWidth={active ? 2.2 : 1.4}
                  markerEnd="url(#fsm-arrow)"
                  className="svg-glide"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  className="font-mono text-[9.5px] font-medium"
                  fill="var(--text-secondary)"
                >
                  {t.condition}
                </text>
              </g>
            );
          })}

          {states.map((st, idx) => {
            const active = selectedState === st.id;
            return (
              <g
                key={st.id}
                onClick={() => {
                  setSelectedState(st.id);
                  setSelectedTransition(null);
                }}
                className="cursor-pointer svg-glide"
              >
                <rect
                  x={st.x}
                  y={st.y}
                  width={110}
                  height={48}
                  rx={24}
                  fill={active ? 'var(--bg-elevated)' : 'var(--bg-surface)'}
                  stroke={active ? 'var(--sem-control)' : idx === 0 ? 'var(--sem-high)' : 'var(--border-subtle)'}
                  strokeWidth={active ? 2.2 : 1.4}
                  className="svg-glide"
                />
                <text
                  x={st.x + 55}
                  y={st.y + 28}
                  textAnchor="middle"
                  className="font-mono text-[12px] font-semibold"
                  fill="var(--text-primary)"
                >
                  {st.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {selectedState && stateMap.get(selectedState) && (
        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1 text-xs">
          <div className="text-[var(--text-primary)]">
            <span className="font-mono font-semibold text-[var(--sem-control)]">
              {stateMap.get(selectedState)?.label}:
            </span>{' '}
            {stateMap.get(selectedState)?.description}
          </div>
          <div className="text-[var(--text-secondary)] flex items-start gap-1.5">
            <GraduationCap className="w-4 h-4 text-[var(--sem-control)] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[var(--text-primary)]">Student Meaning:</strong>{' '}
              {explainFsmStateLikeStudent(
                stateMap.get(selectedState)!.label,
                stateMap.get(selectedState)!.description
              )}
            </span>
          </div>
        </div>
      )}
      {selectedTransition !== null && transitions[selectedTransition] && (
        <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1 text-xs">
          <div className="font-mono font-semibold text-[var(--sem-control)]">
            Transition: {stateMap.get(transitions[selectedTransition].from)?.label || transitions[selectedTransition].from} →{' '}
            {stateMap.get(transitions[selectedTransition].to)?.label || transitions[selectedTransition].to} when [{transitions[selectedTransition].condition}]
          </div>
          <div className="text-[var(--text-secondary)] flex items-start gap-1.5">
            <GraduationCap className="w-4 h-4 text-[var(--sem-control)] shrink-0 mt-0.5" />
            <span>
              <strong className="text-[var(--text-primary)]">Student Meaning:</strong>{' '}
              {explainFsmTransitionLikeStudent(
                stateMap.get(transitions[selectedTransition].from)?.label || transitions[selectedTransition].from,
                stateMap.get(transitions[selectedTransition].to)?.label || transitions[selectedTransition].to,
                transitions[selectedTransition].condition
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const CodeBlock: React.FC<{ title: string; language: string; code: string }> = ({
  title,
  language,
  code,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.includes('.') ? title : `${title.toLowerCase().replace(/\s+/g, '_')}.sv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 w-full rounded-lg border border-[var(--border-subtle)] bg-[#0B0F19] text-slate-100 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[#1E293B] bg-[#111827]">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-medium text-cyan-400">{title}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-400">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-[#1E293B] text-slate-300 hover:bg-[#161E2E] transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-[#1E293B] text-slate-300 hover:bg-[#161E2E] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export .sv
          </button>
        </div>
      </div>
      <pre className="p-5 text-xs leading-relaxed overflow-x-auto font-mono text-slate-200 tabular-nums">
        <code>{code}</code>
      </pre>
    </div>
  );
};
