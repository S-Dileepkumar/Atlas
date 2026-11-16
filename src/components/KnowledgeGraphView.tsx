import React, { useMemo, useState } from 'react';
import { Network, ArrowRight, Cpu, Layers, BookOpen } from 'lucide-react';
import { ALL_IPS, PROJECTS, getIpById } from '../data/ips';
import { ALL_SOCS } from '../data/socs';
import { ALL_PROTOCOLS, getProtocolById } from '../data/protocols';

interface KnowledgeGraphViewProps {
  onSelectIp: (ipId: string) => void;
  onSelectProtocol: (protoId: string) => void;
  onOpenSocExplorer: () => void;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  onSelectIp,
  onSelectProtocol,
  onOpenSocExplorer,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('opentitan');
  const [selectedIpId, setSelectedIpId] = useState<string>('ibex');

  const projectIps = useMemo(
    () => ALL_IPS.filter((ip) => ip.projectId === selectedProjectId),
    [selectedProjectId]
  );

  const activeIp = useMemo(() => {
    if (projectIps.some((p) => p.id === selectedIpId)) return getIpById(selectedIpId);
    return projectIps[0] || ALL_IPS[0];
  }, [projectIps, selectedIpId]);

  const relatedSocs = useMemo(
    () =>
      ALL_SOCS.filter(
        (s) =>
          s.projectId === selectedProjectId ||
          s.blocks.some((b) => b.ipId === activeIp.id) ||
          s.connections.some((c) => c.fromIpId === activeIp.id || c.toIpId === activeIp.id)
      ),
    [selectedProjectId, activeIp]
  );

  const uniqueProtocols = useMemo(() => {
    const ids = Array.from(new Set(activeIp.interfaces.map((i) => i.protocolId)));
    return ids.map((id) => getProtocolById(id));
  }, [activeIp]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
            Unified Silicon Knowledge Graph
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Project → SoC → IP → RTL Module → Protocol Graph
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Navigate the 3 interconnected databases interactively. Click any upstream project to reveal its SoC platforms, hardware IPs, internal RTL modules, and bound communication protocols.
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {PROJECTS.length} Projects · {ALL_SOCS.length} SoCs · {ALL_IPS.length} IPs · {ALL_PROTOCOLS.length} Protocols
        </div>
      </div>

      {/* 4-Column Interactive Graph Traversal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Column 1: Projects */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            1. Open-Source Projects
          </div>
          <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {PROJECTS.map((p) => {
              const count = ALL_IPS.filter((ip) => ip.projectId === p.id).length;
              if (count === 0) return null;
              const active = p.id === selectedProjectId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    const first = ALL_IPS.find((ip) => ip.projectId === p.id);
                    if (first) setSelectedIpId(first.id);
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors cursor-pointer ${
                    active ? 'bg-cyan-50/70 dark:bg-cyan-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {p.license} · {count} IP{count > 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: IPs & SoCs in Project */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            2. IPs & Hosting SoCs
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto">
            {projectIps.map((ip) => {
              const active = ip.id === activeIp.id;
              return (
                <div
                  key={ip.id}
                  className={`px-4 py-3 transition-colors ${
                    active ? 'bg-blue-50/60 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedIpId(ip.id)}
                    className="w-full text-left cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{ip.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {ip.category} · {ip.modules.length} modules
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectIp(ip.id)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Open IP Explorer <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {relatedSocs.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Integrated Inside SoCs
                </div>
                {relatedSocs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={onOpenSocExplorer}
                    className="w-full text-left text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline flex items-center justify-between cursor-pointer"
                  >
                    <span>{s.name}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Internal RTL Modules & Registers */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            3. RTL Modules & CSRs ({activeIp.name})
          </div>
          <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {activeIp.modules.map((m) => (
              <div key={m.name} className="px-4 py-3 space-y-1">
                <div className="text-xs font-mono font-semibold text-slate-900 dark:text-emerald-300">
                  {m.name}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {m.filePath}
                </div>
                {m.childModules.length > 0 && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    → {m.childModules.join(', ')}
                  </div>
                )}
              </div>
            ))}
            {activeIp.registers.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/50 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Registers ({activeIp.registers.length})
                </div>
                <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
                  {activeIp.registers.map((r) => `${r.name} (${r.offset})`).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 4: Bound Protocols */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            4. Bound Protocols
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {uniqueProtocols.map((proto) => (
              <div key={proto.id} className="px-4 py-3 space-y-1.5">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {proto.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {proto.standardBody} · {proto.signals.length} signals
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {proto.tagline}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectProtocol(proto.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Open Protocol Specification <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
