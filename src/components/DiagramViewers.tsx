import React, { useEffect, useId, useMemo, useState } from 'react';
import { Copy, Check, Download, GraduationCap } from 'lucide-react';
import { BlockDiagramLink, BlockDiagramNode, FsmStateNode, FsmTransition } from '../types/protocol';
import {
  explainFsmStateLikeStudent,
  explainFsmTransitionLikeStudent,
  explainSignalLikeStudent,
} from '../data/studentExplainers';
import { InfiniteMeshViewport } from './InfiniteMeshViewport';

const ROLE_STYLES: Record<BlockDiagramNode['role'], { stroke: string; badge: string; studentHint: string }> = {
  manager: {
    stroke: '#3b82f6',
    badge: 'INITIATOR / MASTER',
    studentHint:
      'Initiator (Manager): Starts transactions or commands (e.g., CPU/DMA issuing address, control attributes, and write payloads).',
  },
  interconnect: {
    stroke: '#06b6d4',
    badge: 'FABRIC / LOGIC',
    studentHint:
      'Fabric / Protocol Engine: Arbitrates, queues, frames, or monitors transactions and enforces protocol timing & handshakes.',
  },
  subordinate: {
    stroke: '#10b981',
    badge: 'TARGET / CSR',
    studentHint:
      'Target / Register Bank: Decodes requests, holds configuration CSRs, and completes transactions with response status.',
  },
  memory: {
    stroke: '#f59e0b',
    badge: 'MEMORY / ENDPOINT',
    studentHint:
      'Memory / Endpoint Array: Backing SRAM/DRAM banks or endpoint controller servicing read/write payloads.',
  },
  phy: {
    stroke: '#8b5cf6',
    badge: 'PHY / INFRA',
    studentHint:
      'PHY / Clock & Safety Layer: Handles clock/reset synchronization, electrical SerDes/DDR signaling, or fault/timeout guards.',
  },
};

const CHANNEL_COLOR: Record<NonNullable<BlockDiagramLink['channelKind']>, string> = {
  control: 'var(--sem-control)',
  data: 'var(--sem-high)',
  clock: '#f59e0b',
  error: 'var(--sem-error)',
  verify: '#8b5cf6',
};

export const BlockDiagramSvg: React.FC<{ nodes: BlockDiagramNode[]; links: BlockDiagramLink[] }> = ({
  nodes,
  links,
}) => {
  const uid = useId().replace(/:/g, '');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id || null);
  const [selectedLinkIdx, setSelectedLinkIdx] = useState<number | null>(null);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  useEffect(() => {
    setSelectedNodeId(nodes[0]?.id || null);
    setSelectedLinkIdx(null);
  }, [nodes, links]);

  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: -20, minY: -20, width: 1120, height: 540 };
    const minNodeX = Math.min(...nodes.map((n) => n.x));
    const minNodeY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    return {
      minX: minNodeX - 40,
      minY: minNodeY - 36,
      width: maxX - minNodeX + 80,
      height: maxY - minNodeY + 72,
    };
  }, [nodes]);

  const activeNode = selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;
  const activeLink = selectedLinkIdx !== null ? links[selectedLinkIdx] || null : null;

  const minimapItems = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        color: ROLE_STYLES[n.role].stroke,
        active: selectedNodeId === n.id,
      })),
    [nodes, selectedNodeId]
  );

  const minimapLinks = useMemo(
    () =>
      links
        .map((lk) => {
          const a = nodeMap.get(lk.from);
          const b = nodeMap.get(lk.to);
          if (!a || !b) return null;
          return {
            x1: a.x + a.width / 2,
            y1: a.y + a.height / 2,
            x2: b.x + b.width / 2,
            y2: b.y + b.height / 2,
          };
        })
        .filter((x): x is { x1: number; y1: number; x2: number; y2: number } => Boolean(x)),
    [links, nodeMap]
  );

  return (
    <InfiniteMeshViewport
      bounds={bounds}
      title={`Full Hardware Schematic (${nodes.length} Components · ${links.length} Signal Buses)`}
      subtitle="Click any hardware block or bus wire to inspect its signal flow & student guide"
      minHeightClass="h-[430px] sm:h-[490px]"
      showMiniMap={true}
      minimapItems={minimapItems}
      minimapLinks={minimapLinks}
      legend={
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> Initiator
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" /> Fabric / Queue
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-violet-500" /> PHY / Clk / Guard
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Memory / Endpoint
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Data / CSR
          </span>
        </>
      }
      renderDefs={() => (
        <>
          <marker id={`bp-arr-ctrl-${uid}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--sem-control)" />
          </marker>
          <marker id={`bp-arr-data-${uid}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--sem-high)" />
          </marker>
          <marker id={`bp-arr-clk-${uid}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
          </marker>
          <marker id={`bp-arr-err-${uid}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--sem-error)" />
          </marker>
          <marker id={`bp-arr-ver-${uid}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#8b5cf6" />
          </marker>
        </>
      )}
      footer={
        (activeNode || activeLink) && (
          <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
            <GraduationCap className="w-4 h-4 text-[var(--sem-control)] shrink-0 mt-0.5" />
            {activeNode ? (
              <div className="space-y-1">
                <div>
                  <strong className="text-[var(--text-primary)]">{activeNode.label}</strong>
                  {activeNode.sublabel && (
                    <span className="ml-2 font-mono text-[11px] text-[var(--sem-control)]">
                      [{activeNode.sublabel}]
                    </span>
                  )}
                  <span className="mx-1.5">—</span>
                  {ROLE_STYLES[activeNode.role].studentHint}
                </div>
                {activeNode.ports && activeNode.ports.length > 0 && (
                  <div className="font-mono text-[11px] text-[var(--text-secondary)]">
                    Interface Pins: {activeNode.ports.join(' · ')}
                  </div>
                )}
              </div>
            ) : activeLink ? (
              <div>
                <strong className="text-[var(--text-primary)]">
                  Signal Path ({nodeMap.get(activeLink.from)?.label} → {nodeMap.get(activeLink.to)?.label} ·{' '}
                  {activeLink.label}):
                </strong>{' '}
                {explainSignalLikeStudent(activeLink.label)}
              </div>
            ) : null}
          </div>
        )
      }
    >
      {/* Signal Bus Links */}
      {links.map((link, idx) => {
        const a = nodeMap.get(link.from);
        const b = nodeMap.get(link.to);
        if (!a || !b) return null;

        const acx = a.x + a.width / 2;
        const bcx = b.x + b.width / 2;
        const acy = a.y + a.height / 2;
        const bcy = b.y + b.height / 2;
        const isVerticalStack =
          Math.abs(acx - bcx) < Math.max(a.width, b.width) * 0.65 && Math.abs(acy - bcy) > 30;

        let x1: number, y1: number, x2: number, y2: number, cx1: number, cy1: number, cx2: number, cy2: number;
        if (isVerticalStack) {
          const goingDown = acy <= bcy;
          const laneShift = idx % 2 === 0 ? -14 : 14;
          x1 = acx + laneShift;
          y1 = goingDown ? a.y + a.height : a.y;
          x2 = bcx + laneShift;
          y2 = goingDown ? b.y : b.y + b.height;
          cx1 = x1;
          cy1 = y1 + (y2 - y1) * 0.48;
          cx2 = x2;
          cy2 = y2 - (y2 - y1) * 0.48;
        } else {
          const goingRight = acx <= bcx;
          x1 = goingRight ? a.x + a.width : a.x;
          x2 = goingRight ? b.x : b.x + b.width;
          const laneY = idx % 3 === 0 ? -14 : idx % 3 === 1 ? 0 : 14;
          y1 = acy + laneY;
          y2 = bcy + laneY;
          cx1 = x1 + (x2 - x1) * 0.48;
          cy1 = y1;
          cx2 = x2 - (x2 - x1) * 0.48;
          cy2 = y2;
        }

        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const isHighlighted =
          selectedLinkIdx === idx ||
          (selectedLinkIdx === null && (!selectedNodeId || link.from === selectedNodeId || link.to === selectedNodeId));

        const kind = link.channelKind || 'control';
        const strokeColor = isHighlighted ? CHANNEL_COLOR[kind] : 'var(--text-secondary)';
        const markerId =
          kind === 'data'
            ? `bp-arr-data-${uid}`
            : kind === 'clock'
            ? `bp-arr-clk-${uid}`
            : kind === 'error'
            ? `bp-arr-err-${uid}`
            : kind === 'verify'
            ? `bp-arr-ver-${uid}`
            : `bp-arr-ctrl-${uid}`;

        const labelText = link.label.length > 22 ? `${link.label.slice(0, 20)}..` : link.label;
        const badgeW = Math.max(88, Math.min(138, labelText.length * 6.2 + 16));

        return (
          <g
            key={idx}
            opacity={isHighlighted ? 1 : 0.34}
            onClick={() => {
              setSelectedLinkIdx(idx);
              setSelectedNodeId(null);
            }}
            className="cursor-pointer svg-glide"
          >
            {/* Base conductive bus trace */}
            <path
              d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isHighlighted ? 2.4 : 1.35}
              markerEnd={`url(#${markerId})`}
              className="svg-glide"
            />
            {/* Animated directional signal pulse on highlighted paths */}
            {isHighlighted && (
              <path
                d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.35}
                strokeWidth={1.3}
                className="schematic-flow-active"
              />
            )}
            {/* Source pin solder pad */}
            <circle cx={x1} cy={y1} r={3.2} fill={strokeColor} stroke="var(--bg-canvas)" strokeWidth={1} />
            {/* Signal label tag */}
            <rect
              x={mx - badgeW / 2}
              y={my - 10}
              width={badgeW}
              height={19}
              rx={4}
              fill="var(--bg-elevated)"
              stroke={isHighlighted ? strokeColor : 'var(--border-subtle)'}
              strokeWidth={isHighlighted ? 1.2 : 1}
            />
            <text
              x={mx}
              y={my + 3}
              textAnchor="middle"
              className="font-mono text-[9.5px] font-medium"
              fill={isHighlighted ? strokeColor : 'var(--text-secondary)'}
            >
              {labelText}
            </text>
          </g>
        );
      })}

      {/* Hardware Silicon IP / Subsystem Blocks */}
      {nodes.map((node) => {
        const st = ROLE_STYLES[node.role];
        const isSel = selectedNodeId === node.id;
        const ports = node.ports || [];
        const hasSublabel = Boolean(node.sublabel);

        return (
          <g
            key={node.id}
            onClick={() => {
              setSelectedNodeId(node.id);
              setSelectedLinkIdx(null);
            }}
            className="cursor-pointer svg-glide"
          >
            {/* Selection outer schematic focus frame */}
            {isSel && (
              <rect
                x={node.x - 4}
                y={node.y - 4}
                width={node.width + 8}
                height={node.height + 8}
                rx={11}
                fill="none"
                stroke={st.stroke}
                strokeWidth={1.25}
                strokeDasharray="4 3"
                opacity={0.75}
              />
            )}

            {/* Main IC / Block Package */}
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx={8}
              fill={isSel ? 'var(--bg-elevated)' : 'var(--bg-surface)'}
              stroke={st.stroke}
              strokeWidth={isSel ? 2.2 : 1.5}
              className="svg-glide"
            />

            {/* Header Band */}
            <path
              d={`M ${node.x + 8} ${node.y} H ${node.x + node.width - 8} Q ${node.x + node.width} ${node.y} ${node.x + node.width} ${node.y + 8} V ${node.y + 22} H ${node.x} V ${node.y + 8} Q ${node.x} ${node.y} ${node.x + 8} ${node.y} Z`}
              fill={st.stroke}
              fillOpacity={isSel ? 0.24 : 0.14}
            />
            <line
              x1={node.x}
              y1={node.y + 22}
              x2={node.x + node.width}
              y2={node.y + 22}
              stroke={st.stroke}
              strokeOpacity={0.4}
              strokeWidth={1}
            />

            {/* Header Domain / Role Text */}
            <text
              x={node.x + 10}
              y={node.y + 14.5}
              className="font-mono text-[9px] font-semibold tracking-wider uppercase"
              fill={st.stroke}
            >
              {node.domain ? `${node.domain} · ${st.badge.split('/')[0].trim()}` : st.badge}
            </text>

            {/* Optional Clock Edge Triangle Glyph on Clock/Reset Blocks */}
            {node.componentKind === 'clock_reset' && (
              <polygon
                points={`${node.x + node.width - 18},${node.y + 7} ${node.x + node.width - 10},${node.y + 11.5} ${node.x + node.width - 18},${node.y + 16}`}
                fill="none"
                stroke={st.stroke}
                strokeWidth={1.3}
              />
            )}

            {/* Block Title */}
            <text
              x={node.x + node.width / 2}
              y={node.y + (ports.length > 0 ? 44 : node.height / 2 + (hasSublabel ? 2 : 10))}
              textAnchor="middle"
              className="font-display text-[12.5px] font-semibold"
              fill="var(--text-primary)"
            >
              {node.label.length > 26 ? `${node.label.slice(0, 24)}..` : node.label}
            </text>

            {/* Engineering Sub-label */}
            {hasSublabel && (
              <text
                x={node.x + node.width / 2}
                y={node.y + (ports.length > 0 ? 61 : node.height / 2 + 19)}
                textAnchor="middle"
                className="font-mono text-[9.5px]"
                fill="var(--text-secondary)"
              >
                {node.sublabel!.length > 30 ? `${node.sublabel!.slice(0, 28)}..` : node.sublabel}
              </text>
            )}

            {/* Schematic Port Pin Stubs along Bottom Edge */}
            {ports.slice(0, 3).map((pin, pIdx) => {
              const count = Math.min(3, ports.length);
              const slotW = (node.width - 18) / count;
              const px = node.x + 9 + pIdx * slotW;
              const pw = slotW - 4;
              const py = node.y + node.height - 23;
              return (
                <g key={`${node.id}-pin-${pIdx}`}>
                  <rect
                    x={px}
                    y={py}
                    width={pw}
                    height={16}
                    rx={3}
                    fill="var(--bg-canvas)"
                    stroke="var(--border-subtle)"
                    strokeWidth={1}
                  />
                  <text
                    x={px + pw / 2}
                    y={py + 11}
                    textAnchor="middle"
                    className="font-mono text-[8.5px]"
                    fill="var(--text-secondary)"
                  >
                    {pin.length > 9 ? `${pin.slice(0, 8)}.` : pin}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </InfiniteMeshViewport>
  );
};

export const FsmDiagramSvg: React.FC<{ states: FsmStateNode[]; transitions: FsmTransition[] }> = ({
  states,
  transitions,
}) => {
  const uid = useId().replace(/:/g, '');
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

  const fsmMiniItems = useMemo(
    () =>
      states.map((st, idx) => ({
        id: st.id,
        x: st.x,
        y: st.y,
        width: 110,
        height: 48,
        color: selectedState === st.id ? '#06b6d4' : idx === 0 ? '#10b981' : '#3b82f6',
        active: selectedState === st.id,
      })),
    [states, selectedState]
  );

  const fsmMiniLinks = useMemo(
    () =>
      transitions
        .map((t) => {
          const a = stateMap.get(t.from);
          const b = stateMap.get(t.to);
          if (!a || !b) return null;
          return { x1: a.x + 55, y1: a.y + 24, x2: b.x + 55, y2: b.y + 24 };
        })
        .filter((x): x is { x1: number; y1: number; x2: number; y2: number } => Boolean(x)),
    [transitions, stateMap]
  );

  return (
    <InfiniteMeshViewport
      bounds={bounds}
      title="Interactive Finite State Machine"
      subtitle="Click any state node or transition arc to read plain-English logic"
      minHeightClass="h-[310px] sm:h-[340px]"
      showMiniMap={true}
      minimapItems={fsmMiniItems}
      minimapLinks={fsmMiniLinks}
      legend={<span className="font-mono text-[var(--sem-high)] font-medium">RST → Initial State</span>}
      renderDefs={() => (
        <>
          <marker id={`fsm-arrow-${uid}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--sem-control)" />
          </marker>
          <marker id={`fsm-reset-${uid}`} markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill="var(--sem-high)" />
          </marker>
        </>
      )}
      footer={
        <>
          {selectedState && stateMap.get(selectedState) && (
            <div className="space-y-1 text-xs">
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
            <div className="space-y-1 text-xs">
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
        </>
      }
    >
      {states[0] && (
        <g>
          <line
            x1={states[0].x - 36}
            y1={states[0].y + 24}
            x2={states[0].x}
            y2={states[0].y + 24}
            stroke="var(--sem-high)"
            strokeWidth={1.75}
            markerEnd={`url(#fsm-reset-${uid})`}
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
              markerEnd={`url(#fsm-arrow-${uid})`}
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
    </InfiniteMeshViewport>
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
