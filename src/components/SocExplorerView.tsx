import React, { useMemo, useState } from 'react';
import { ExternalLink, Cpu, ArrowRight, Layers } from 'lucide-react';
import { ALL_SOCS } from '../data/socs';
import { getIpById, getProjectById } from '../data/ips';
import { getProtocolById } from '../data/protocols';
import { SocEntity } from '../types/ipUniverse';
import { StudentExplainerCard } from './StudentExplainerCard';
import { getSocStudentExplainer } from '../data/studentExplainers';

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
        <div className="lg:col-span-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Interactive SoC Block Diagram (click any IP block to inspect)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Solid line: Documented in RTL/Top · Dashed line: Inferred Relationship
            </span>
          </div>

          <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080E1A] p-3 bg-engineering-grid">
            <svg viewBox="0 0 800 375" className="w-full min-w-[640px] h-auto select-none">
              <defs>
                <marker id="soc-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
                </marker>
              </defs>

              {/* Edges between block boundaries (never cutting inside boxes) */}
              {soc.connections.map((conn, idx) => {
                const src = blockCenter(conn.fromIpId);
                const dst = blockCenter(conn.toIpId);
                if (!src || !dst) return null;
                const a = src.block;
                const b = dst.block;
                const horiz = Math.abs(dst.x - src.x) >= Math.abs(dst.y - src.y);
                const x1 = horiz ? (dst.x >= src.x ? a.x + a.width : a.x) : src.x;
                const y1 = horiz ? src.y : (dst.y >= src.y ? a.y + a.height : a.y);
                const x2 = horiz ? (dst.x >= src.x ? b.x : b.x + b.width) : dst.x;
                const y2 = horiz ? dst.y : (dst.y >= src.y ? b.y : b.y + b.height);
                const offset = idx % 2 === 0 ? -18 : 18;
                const mx = (x1 + x2) / 2 + (horiz ? 0 : offset);
                const my = (y1 + y2) / 2 + (horiz ? offset : 0);
                const isInferred = conn.status === 'Inferred Relationship';

                return (
                  <g
                    key={conn.id}
                    onClick={() => onSelectProtocol(conn.protocolId)}
                    className="cursor-pointer group"
                  >
                    <path
                      d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                      fill="none"
                      strokeWidth={2}
                      strokeDasharray={isInferred ? '5 4' : undefined}
                      markerEnd="url(#soc-arrow)"
                      className="stroke-cyan-600/80 dark:stroke-cyan-400/80 group-hover:stroke-cyan-400 transition-colors"
                    />
                    <rect
                      x={mx - 54}
                      y={my - 10}
                      width={108}
                      height={18}
                      rx={4}
                      className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
                    />
                    <text
                      x={mx}
                      y={my + 2.5}
                      textAnchor="middle"
                      className="text-[9.5px] font-mono fill-slate-700 dark:fill-cyan-300"
                    >
                      {conn.protocolLabel}
                    </text>
                  </g>
                );
              })}

              {/* SoC IP Blocks with Top Domain Accent Strip */}
              {soc.blocks.map((blk) => {
                const isSelected = activeBlockId === blk.id;
                const accent =
                  blk.domain === 'CPU'
                    ? '#06b6d4'
                    : blk.domain === 'Interconnect'
                    ? '#3b82f6'
                    : blk.domain === 'Memory'
                    ? '#10b981'
                    : blk.domain === 'Security'
                    ? '#f59e0b'
                    : blk.domain === 'DMA / Accel'
                    ? '#8b5cf6'
                    : blk.domain === 'Debug / Int'
                    ? '#f43f5e'
                    : '#64748b';
                return (
                  <g
                    key={blk.id}
                    onClick={() => {
                      setActiveBlockId(blk.id);
                      if (blk.ipId) onSelectIp(blk.ipId);
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x={blk.x}
                      y={blk.y}
                      width={blk.width}
                      height={blk.height}
                      rx={7}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className={`${DOMAIN_COLORS[blk.domain]} transition-all hover:opacity-90`}
                    />
                    <rect
                      x={blk.x + 1}
                      y={blk.y + 1}
                      width={blk.width - 2}
                      height={5}
                      rx={3}
                      fill={accent}
                      opacity={0.85}
                    />
                    <text
                      x={blk.x + 12}
                      y={blk.y + 24}
                      className="text-[10px] font-mono uppercase fill-slate-500 dark:fill-slate-400"
                    >
                      {blk.domain}
                    </text>
                    <text
                      x={blk.x + 12}
                      y={blk.y + 44}
                      className="text-[12px] font-semibold fill-slate-900 dark:fill-slate-100"
                    >
                      {blk.label}
                    </text>
                    <text
                      x={blk.x + 12}
                      y={blk.y + 62}
                      className="text-[10px] fill-cyan-700 dark:fill-cyan-400 font-medium"
                    >
                      {blk.ipId ? `Open ${getIpById(blk.ipId).name} →` : 'Subsystem Node'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
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
