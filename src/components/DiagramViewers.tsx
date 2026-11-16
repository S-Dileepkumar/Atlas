import React, { useMemo, useState } from 'react';
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

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, width: 740, height: 240 };
    const maxX = Math.max(...nodes.map((n) => n.x + n.width), 700);
    const maxY = Math.max(...nodes.map((n) => n.y + n.height), 200);
    return { minX: 0, minY: 0, width: maxX + 36, height: maxY + 36 };
  }, [nodes]);

  const activeNode = selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;
  const activeLink = selectedLinkIdx !== null ? links[selectedLinkIdx] || null : null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#080E1A] p-4 space-y-3 bg-engineering-grid">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Interactive Architecture Diagram · Click any block OR arrow link to read its student explanation</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Manager</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> Interconnect</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Subordinate</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
          className="w-full min-w-[600px] h-auto max-h-[280px] select-none"
        >
          <defs>
            <marker id="arrow-cyan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
            </marker>
            <marker id="arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
            </marker>
          </defs>

          {links.map((link, idx) => {
            const a = nodeMap.get(link.from);
            const b = nodeMap.get(link.to);
            if (!a || !b) return null;
            const goingRight = a.x <= b.x;
            const x1 = goingRight ? a.x + a.width : a.x;
            const x2 = goingRight ? b.x : b.x + b.width;
            const sameSideOffset = (idx % 2 === 0 ? -14 : 14) + Math.floor(idx / 2) * 8;
            const y1 = a.y + a.height / 2 + sameSideOffset;
            const y2 = b.y + b.height / 2 + sameSideOffset;
            const cx1 = x1 + (x2 - x1) * 0.45;
            const cx2 = x2 - (x2 - x1) * 0.45;
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
                className="cursor-pointer"
              >
                <path
                  d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={isHighlighted ? '#06b6d4' : '#64748b'}
                  strokeWidth={isHighlighted ? 2.2 : 1.3}
                  markerEnd={isHighlighted ? 'url(#arrow-active)' : 'url(#arrow-cyan)'}
                />
                <circle cx={x1} cy={y1} r={3} fill="#06b6d4" />
                <rect
                  x={mx - 62}
                  y={my - 10}
                  width={124}
                  height={19}
                  rx={4}
                  className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
                />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  className="font-mono text-[9.5px] font-medium fill-slate-700 dark:fill-cyan-300"
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
                className="cursor-pointer"
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={8}
                  className={isSel ? 'fill-cyan-50/90 dark:fill-slate-800' : 'fill-white dark:fill-slate-900'}
                  stroke={st.stroke}
                  strokeWidth={isSel ? 2.5 : 1.6}
                />
                {/* Top role accent strip */}
                <rect
                  x={node.x + 1}
                  y={node.y + 1}
                  width={node.width - 2}
                  height={5}
                  rx={3}
                  fill={st.stroke}
                  opacity={0.85}
                />
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 - 2}
                  textAnchor="middle"
                  className="font-display text-[13px] font-semibold fill-slate-900 dark:fill-slate-100"
                >
                  {node.label}
                </text>
                <text
                  x={node.x + node.width / 2}
                  y={node.y + node.height / 2 + 16}
                  textAnchor="middle"
                  className="font-mono text-[9.5px] uppercase fill-slate-500 dark:fill-slate-400"
                >
                  {st.badge}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {(activeNode || activeLink) && (
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <GraduationCap className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          {activeNode ? (
            <div>
              <strong className="text-slate-900 dark:text-slate-100">{activeNode.label}:</strong>{' '}
              {ROLE_STYLES[activeNode.role].studentHint}
            </div>
          ) : activeLink ? (
            <div>
              <strong className="text-slate-900 dark:text-slate-100">
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

  const bounds = useMemo(() => {
    if (states.length === 0) return { width: 660, height: 210 };
    const maxX = Math.max(...states.map((s) => s.x + 130), 660);
    const maxY = Math.max(...states.map((s) => s.y + 115), 205);
    return { width: maxX + 24, height: maxY };
  }, [states]);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#080E1A] p-4 bg-engineering-grid space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>Interactive Finite State Machine · Click any state circle OR transition arrow to read plain-English logic</span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400">RST → Initial State</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${bounds.width} ${bounds.height}`} className="w-full min-w-[540px] h-auto max-h-[230px] select-none">
          <defs>
            <marker id="fsm-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
            <marker id="fsm-reset" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
              <polygon points="0 0, 7 2.5, 0 5" fill="#10b981" />
            </marker>
          </defs>

          {/* Reset Entry Arrow to Initial State */}
          {states[0] && (
            <g>
              <line
                x1={Math.max(6, states[0].x - 36)}
                y1={states[0].y + 24}
                x2={states[0].x}
                y2={states[0].y + 24}
                stroke="#10b981"
                strokeWidth={1.75}
                markerEnd="url(#fsm-reset)"
              />
              <text
                x={Math.max(4, states[0].x - 20)}
                y={states[0].y + 14}
                textAnchor="middle"
                className="font-mono text-[9px] font-bold fill-emerald-600 dark:fill-emerald-400"
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
            const labelY = isSelfLoop ? a.y - 30 : forward ? a.y - 8 : a.y + 98;
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
                className="cursor-pointer"
              >
                <path
                  d={path}
                  fill="none"
                  stroke={active ? '#06b6d4' : '#3b82f6'}
                  strokeWidth={active ? 2.2 : 1.4}
                  markerEnd="url(#fsm-arrow)"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  className="font-mono text-[9.5px] font-medium fill-slate-700 dark:fill-slate-300"
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
                className="cursor-pointer"
              >
                <rect
                  x={st.x}
                  y={st.y}
                  width={110}
                  height={48}
                  rx={24}
                  className={active ? 'fill-cyan-500/20' : 'fill-white dark:fill-slate-900'}
                  stroke={active ? '#06b6d4' : idx === 0 ? '#10b981' : '#64748b'}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <text
                  x={st.x + 55}
                  y={st.y + 28}
                  textAnchor="middle"
                  className="font-mono text-[12px] font-semibold fill-slate-900 dark:fill-slate-100"
                >
                  {st.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {selectedState && stateMap.get(selectedState) && (
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
          <div className="text-slate-700 dark:text-slate-200">
            <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
              {stateMap.get(selectedState)?.label}:
            </span>{' '}
            {stateMap.get(selectedState)?.description}
          </div>
          <div className="text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Student Meaning:</strong>{' '}
              {explainFsmStateLikeStudent(
                stateMap.get(selectedState)!.label,
                stateMap.get(selectedState)!.description
              )}
            </span>
          </div>
        </div>
      )}
      {selectedTransition !== null && transitions[selectedTransition] && (
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
          <div className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
            Transition: {stateMap.get(transitions[selectedTransition].from)?.label || transitions[selectedTransition].from} →{' '}
            {stateMap.get(transitions[selectedTransition].to)?.label || transitions[selectedTransition].to} when [{transitions[selectedTransition].condition}]
          </div>
          <div className="text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Student Meaning:</strong>{' '}
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
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-medium text-cyan-400">{title}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-400">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export .sv
          </button>
        </div>
      </div>
      <pre className="p-4 text-xs leading-relaxed overflow-x-auto font-mono text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};
