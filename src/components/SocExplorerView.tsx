import React, { useMemo, useState } from 'react';
import { ExternalLink, Cpu, ArrowRight, Layers } from 'lucide-react';
import { ALL_SOCS } from '../data/socs';
import { getIpById, getProjectById } from '../data/ips';
import { getProtocolById } from '../data/protocols';
import { SocEntity } from '../types/ipUniverse';
import { StudentExplainerCard } from './StudentExplainerCard';
import { getSocStudentExplainer } from '../data/studentExplainers';
import { InfiniteMeshViewport } from './InfiniteMeshViewport';

interface SocExplorerViewProps {
  onSelectIp: (ipId: string) => void;
  onSelectProtocol: (protocolId: string) => void;
}

const DOMAIN_COLORS: Record<SocEntity['blocks'][number]['domain'], string> = {
  CPU: 'stroke-cyan-500 fill-cyan-500/10',
  Interconnect: 'stroke-blue-500 fill-blue-500/10',
  Memory: 'stroke-emerald-500 fill-emerald-500/10',
  Security: 'stroke-amber-500 fill-amber-500/10',
  'DMA / Accel': 'stroke-violet-500 fill-violet-500/10',
  Peripheral: 'stroke-slate-400 fill-slate-500/10',
  'Debug / Int': 'stroke-rose-500 fill-rose-500/10',
};

export const SocExplorerView: React.FC<SocExplorerViewProps> = ({
  onSelectIp,
  onSelectProtocol,
}) => {
  const [selectedSocId, setSelectedSocId] = useState<string>(ALL_SOCS[0].id);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  const soc = useMemo(
    () => ALL_SOCS.find((s) => s.id === selectedSocId) || ALL_SOCS[0],
    [selectedSocId]
  );

  const proj = getProjectById(soc.projectId);

  const blockCenter = (id: string) => {
    const b = soc.blocks.find((blk) => blk.id === id) ||
      soc.blocks.find((blk) => blk.ipId === id);
    if (!b) return null;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, block: b };
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
            Independent SoC Architecture Database
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Open-Source SoC Explorer
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Trace how real open-source processors, fabrics, memory controllers, and accelerators connect across complete SoC topologies. Every link separates documented RTL integration from inferred architectural bindings.
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {ALL_SOCS.length} Complete SoC Platforms
        </div>
      </div>

      {/* SoC Selector Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {ALL_SOCS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSelectedSocId(s.id);
              setActiveBlockId(null);
            }}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              s.id === soc.id
                ? 'bg-cyan-600 text-white'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Selected SoC Header Card */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {proj.organization} · {soc.license} · Top RTL: <span className="font-mono text-slate-700 dark:text-slate-300">{soc.topFile}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{soc.name}</h2>
            <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">{soc.targetUse}</p>
          </div>

          <a
            href={soc.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors"
          >
            Upstream Repository <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{soc.summary}</p>
      </div>

      <StudentExplainerCard
        data={getSocStudentExplainer(soc)}
        label={`New to SoC Architecture? · ${soc.name} Explained Like a City`}
      />

      {/* Interactive SoC Block & Protocol Topology Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          {(() => {
            const minX = soc.blocks.length > 0 ? Math.min(...soc.blocks.map((b) => b.x)) : 0;
            const minY = soc.blocks.length > 0 ? Math.min(...soc.blocks.map((b) => b.y)) : 0;
            const maxX = Math.max(...soc.blocks.map((b) => b.x + b.width), 780);
            const maxY = Math.max(...soc.blocks.map((b) => b.y + b.height), 350);
            const socBounds = {
              minX: minX - 36,
              minY: minY - 32,
              width: maxX - minX + 72,
              height: maxY - minY + 64,
            };
            const markerId = `soc-arr-${soc.id.replace(/[^a-zA-Z0-9]/g, '')}`;
            const domainAccent: Record<SocEntity['blocks'][number]['domain'], string> = {
              CPU: '#06b6d4',
              Interconnect: '#3b82f6',
              Memory: '#10b981',
              Security: '#f59e0b',
              'DMA / Accel': '#8b5cf6',
              Peripheral: '#64748b',
              'Debug / Int': '#f43f5e',
            };

            const minimapItems = soc.blocks.map((blk) => ({
              id: blk.id,
              x: blk.x,
              y: blk.y,
              width: blk.width,
              height: blk.height,
              color: domainAccent[blk.domain] || '#64748b',
              active: activeBlockId === blk.id,
            }));
            const minimapLinks = soc.connections
              .map((conn) => {
                const src = blockCenter(conn.fromIpId);
                const dst = blockCenter(conn.toIpId);
                if (!src || !dst) return null;
                return { x1: src.x, y1: src.y, x2: dst.x, y2: dst.y };
              })
              .filter((x): x is { x1: number; y1: number; x2: number; y2: number } => Boolean(x));

            return (
              <InfiniteMeshViewport
                bounds={socBounds}
                title={`Interactive SoC Silicon Topology — ${soc.name} (${soc.blocks.length} Subsystems · ${soc.connections.length} Buses)`}
                subtitle="Solid line: Documented in RTL/Top · Dashed line: Inferred Relationship · Click any IP block or bus wire"
                minHeightClass="h-[460px] sm:h-[520px]"
                showMiniMap={true}
                minimapItems={minimapItems}
                minimapLinks={minimapLinks}
                legend={
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500" /> CPU
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> Interconnect
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Memory
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Security
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-violet-500" /> Accel / DMA
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Clk / Debug / PLIC
                    </span>
                  </>
                }
                renderDefs={() => (
                  <marker id={markerId} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
                  </marker>
                )}
              >
                {/* Edges between block boundaries */}
                {soc.connections.map((conn, idx) => {
                  const src = blockCenter(conn.fromIpId);
                  const dst = blockCenter(conn.toIpId);
                  if (!src || !dst) return null;
                  const a = src.block;
                  const b = dst.block;
                  const horiz = Math.abs(dst.x - src.x) >= Math.abs(dst.y - src.y) * 0.85;
                  const laneOffset = idx % 3 === 0 ? -12 : idx % 3 === 1 ? 0 : 12;

                  let x1: number, y1: number, x2: number, y2: number, cx1: number, cy1: number, cx2: number, cy2: number;
                  if (horiz) {
                    x1 = dst.x >= src.x ? a.x + a.width : a.x;
                    x2 = dst.x >= src.x ? b.x : b.x + b.width;
                    y1 = src.y + laneOffset;
                    y2 = dst.y + laneOffset;
                    cx1 = x1 + (x2 - x1) * 0.48;
                    cy1 = y1;
                    cx2 = x2 - (x2 - x1) * 0.48;
                    cy2 = y2;
                  } else {
                    x1 = src.x + laneOffset;
                    x2 = dst.x + laneOffset;
                    y1 = dst.y >= src.y ? a.y + a.height : a.y;
                    y2 = dst.y >= src.y ? b.y : b.y + b.height;
                    cx1 = x1;
                    cy1 = y1 + (y2 - y1) * 0.48;
                    cx2 = x2;
                    cy2 = y2 - (y2 - y1) * 0.48;
                  }

                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2;
                  const isInferred = conn.status === 'Inferred Relationship';
                  const isEdgeHighlighted =
                    !activeBlockId || src.block.id === activeBlockId || dst.block.id === activeBlockId;
                  const labelW = Math.max(88, Math.min(132, conn.protocolLabel.length * 5.8 + 16));

                  return (
                    <g
                      key={conn.id}
                      opacity={isEdgeHighlighted ? 1 : 0.35}
                      onClick={() => onSelectProtocol(conn.protocolId)}
                      className="cursor-pointer svg-glide"
                    >
                      <path
                        d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth={isEdgeHighlighted ? 2.2 : 1.4}
                        strokeDasharray={isInferred ? '5 4' : undefined}
                        markerEnd={`url(#${markerId})`}
                      />
                      {isEdgeHighlighted && !isInferred && (
                        <path
                          d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeOpacity={0.35}
                          strokeWidth={1.2}
                          className="schematic-flow-active"
                        />
                      )}
                      <circle cx={x1} cy={y1} r={3} fill="#06b6d4" stroke="var(--bg-canvas)" strokeWidth={1} />
                      <rect
                        x={mx - labelW / 2}
                        y={my - 9.5}
                        width={labelW}
                        height={18}
                        rx={4}
                        fill="var(--bg-elevated)"
                        stroke={isEdgeHighlighted ? '#06b6d4' : 'var(--border-subtle)'}
                        strokeWidth={1}
                      />
                      <text
                        x={mx}
                        y={my + 2.5}
                        textAnchor="middle"
                        className="text-[9.5px] font-mono font-medium"
                        fill={isEdgeHighlighted ? 'var(--sem-control)' : 'var(--text-secondary)'}
                      >
                        {conn.protocolLabel}
                      </text>
                    </g>
                  );
                })}

                {/* SoC IP Subsystem Blocks */}
                {soc.blocks.map((blk) => {
                  const isSelected = activeBlockId === blk.id;
                  const accent = domainAccent[blk.domain] || '#64748b';
                  const hasClockGlyph = blk.domain === 'Debug / Int' || blk.id.includes('clk') || blk.id === 'crg' || blk.id === 'fll';

                  return (
                    <g
                      key={blk.id}
                      onClick={() => {
                        setActiveBlockId(blk.id);
                        if (blk.ipId) onSelectIp(blk.ipId);
                      }}
                      className="cursor-pointer svg-glide"
                    >
                      {isSelected && (
                        <rect
                          x={blk.x - 4}
                          y={blk.y - 4}
                          width={blk.width + 8}
                          height={blk.height + 8}
                          rx={11}
                          fill="none"
                          stroke={accent}
                          strokeWidth={1.25}
                          strokeDasharray="4 3"
                          opacity={0.78}
                        />
                      )}

                      <rect
                        x={blk.x}
                        y={blk.y}
                        width={blk.width}
                        height={blk.height}
                        rx={8}
                        fill={isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)'}
                        stroke={accent}
                        strokeWidth={isSelected ? 2.2 : 1.5}
                      />

                      {/* CAD Header Strip */}
                      <path
                        d={`M ${blk.x + 8} ${blk.y} H ${blk.x + blk.width - 8} Q ${blk.x + blk.width} ${blk.y} ${blk.x + blk.width} ${blk.y + 8} V ${blk.y + 20} H ${blk.x} V ${blk.y + 8} Q ${blk.x} ${blk.y} ${blk.x + 8} ${blk.y} Z`}
                        fill={accent}
                        fillOpacity={isSelected ? 0.24 : 0.14}
                      />
                      <line
                        x1={blk.x}
                        y1={blk.y + 20}
                        x2={blk.x + blk.width}
                        y2={blk.y + 20}
                        stroke={accent}
                        strokeOpacity={0.4}
                        strokeWidth={1}
                      />

                      <text
                        x={blk.x + 10}
                        y={blk.y + 13}
                        className="text-[8.5px] font-mono font-semibold uppercase tracking-wider"
                        fill={accent}
                      >
                        {blk.domain}
                      </text>

                      {hasClockGlyph && (
                        <polygon
                          points={`${blk.x + blk.width - 17},${blk.y + 6} ${blk.x + blk.width - 9},${blk.y + 10.5} ${blk.x + blk.width - 17},${blk.y + 15}`}
                          fill="none"
                          stroke={accent}
                          strokeWidth={1.2}
                        />
                      )}

                      <text
                        x={blk.x + 11}
                        y={blk.y + 39}
                        className="text-[12px] font-semibold"
                        fill="var(--text-primary)"
                      >
                        {blk.label.length > 26 ? `${blk.label.slice(0, 24)}..` : blk.label}
                      </text>
                      <text
                        x={blk.x + 11}
                        y={blk.y + 56}
                        className="text-[10px] font-medium font-mono"
                        fill="var(--sem-control)"
                      >
                        {blk.ipId ? `Inspect ${getIpById(blk.ipId).name} →` : 'SoC Infrastructure Block'}
                      </text>

                      {/* Bottom I/O Pin Solder Stubs */}
                      {[0.25, 0.5, 0.75].map((ratio, pIdx) => (
                        <rect
                          key={pIdx}
                          x={blk.x + blk.width * ratio - 4}
                          y={blk.y + blk.height - 2.5}
                          width={8}
                          height={4}
                          rx={1}
                          fill={accent}
                          fillOpacity={0.58}
                        />
                      ))}
                    </g>
                  );
                })}
              </InfiniteMeshViewport>
            );
          })()}
        </div>

        {/* Connected Subsystems & Protocol Links List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Subsystems in {soc.name}
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {soc.blocks.map((b) => (
                <div key={b.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      {b.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {b.domain} · {b.documented ? 'RTL Documented' : 'Abstracted Block'}
                    </div>
                  </div>
                  {b.ipId && (
                    <button
                      type="button"
                      onClick={() => onSelectIp(b.ipId!)}
                      className="text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer shrink-0"
                    >
                      Inspect IP →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Interconnect & Protocol Edges
            </h3>
            <div className="space-y-3">
              {soc.connections.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {c.fromLabel} → {c.toLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectProtocol(c.protocolId)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {getProtocolById(c.protocolId).name} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                    {c.status} · {c.protocolLabel}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{c.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
