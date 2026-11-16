import React, { useMemo, useState } from 'react';
import { Search, FolderTree, ExternalLink, ArrowRight } from 'lucide-react';
import { ALL_IPS, getProjectById } from '../data/ips';
import { IpEntity, RtlModuleNode } from '../types/ipUniverse';
import { CodeBlock } from './DiagramViewers';

interface RtlSourceEngineViewProps {
  onSelectIp: (ipId: string) => void;
}

interface ModuleIndexEntry {
  ip: IpEntity;
  mod: RtlModuleNode;
}

export const RtlSourceEngineView: React.FC<RtlSourceEngineViewProps> = ({ onSelectIp }) => {
  const [query, setQuery] = useState('');
  const [ipFilter, setIpFilter] = useState('ALL');

  const allModules = useMemo<ModuleIndexEntry[]>(() => {
    return ALL_IPS.flatMap((ip) => ip.modules.map((mod) => ({ ip, mod })));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allModules.filter(({ ip, mod }) => {
      if (ipFilter !== 'ALL' && ip.id !== ipFilter) return false;
      if (!q) return true;
      return (
        mod.name.toLowerCase().includes(q) ||
        mod.filePath.toLowerCase().includes(q) ||
        mod.summary.toLowerCase().includes(q) ||
        mod.ports.some((p) => p.name.toLowerCase().includes(q)) ||
        mod.childModules.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [allModules, query, ipFilter]);

  const [selectedKey, setSelectedKey] = useState<string>(
    `${allModules[0]?.ip.id}::${allModules[0]?.mod.name}`
  );

  const activeEntry = useMemo(() => {
    const found = filtered.find((e) => `${e.ip.id}::${e.mod.name}` === selectedKey);
    return found || filtered[0] || allModules[0];
  }, [filtered, selectedKey, allModules]);

  const proj = getProjectById(activeEntry.ip.projectId);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
            Source-Code Intelligence Engine
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            RTL & Module Explorer
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Inspect module hierarchies, parent-child instantiations, ports, localparams, FSM state enums, and upstream GitHub source excerpts across every indexed semiconductor IP.
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {allModules.length} Reverse-Engineered RTL Modules
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search module (ibex_if_stage, aes_cipher_core, VX_schedule), port, or file path..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={ipFilter}
          onChange={(e) => setIpFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Indexed IPs ({ALL_IPS.length})</option>
          {ALL_IPS.map((ip) => (
            <option key={ip.id} value={ip.id}>
              {ip.name} ({ip.modules.length} modules)
            </option>
          ))}
        </select>
      </div>

      {/* Split Browser: Left Module Tree | Right Deep Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
            <span className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              RTL Module Directory
            </span>
            <span className="font-mono text-slate-500 tabular-nums">{filtered.length}</span>
          </div>

          <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map(({ ip, mod }) => {
              const key = `${ip.id}::${mod.name}`;
              const active = `${activeEntry.ip.id}::${activeEntry.mod.name}` === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`w-full px-4 py-3 text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-cyan-50/70 dark:bg-cyan-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {ip.name} · {ip.rtlLanguage}
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {mod.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    {mod.filePath}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Module Inspection Pane */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {proj.name} · {activeEntry.ip.name} · {activeEntry.ip.license}
                </div>
                <h2 className="text-xl font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeEntry.mod.name}
                </h2>
                <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400 mt-0.5">
                  {activeEntry.mod.filePath}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectIp(activeEntry.ip.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                >
                  Open Full IP Explorer <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <a
                  href={activeEntry.mod.githubFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500"
                >
                  View on GitHub <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {activeEntry.mod.summary}
            </p>

            {/* Hierarchy & Packages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1.5">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Module Hierarchy</div>
                <div className="text-slate-600 dark:text-slate-400">
                  Parent: <span className="font-mono text-slate-900 dark:text-slate-200">{activeEntry.mod.parentModule || 'Top-level module'}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Instantiates:{' '}
                  <span className="font-mono text-slate-900 dark:text-slate-200">
                    {activeEntry.mod.childModules.length > 0 ? activeEntry.mod.childModules.join(', ') : 'Leaf module'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-1.5">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Interfaces, Packages & FSMs</div>
                <div className="text-slate-600 dark:text-slate-400">
                  Interfaces: <span className="font-mono text-cyan-700 dark:text-cyan-400">{activeEntry.mod.relatedInterfaces.join(', ') || 'Internal'}</span>
                </div>
                {activeEntry.mod.fsms && activeEntry.mod.fsms.length > 0 && (
                  <div className="text-slate-600 dark:text-slate-400">
                    FSMs: <span className="font-mono text-slate-900 dark:text-slate-200">{activeEntry.mod.fsms.map((f) => `${f.name} [${f.states.join(' -> ')}]`).join('; ')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Ports Table */}
            {activeEntry.mod.ports.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Module Ports ({activeEntry.mod.ports.length})
                </h3>
                <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-3 py-2 font-medium">Port</th>
                        <th className="px-3 py-2 font-medium">Dir</th>
                        <th className="px-3 py-2 font-medium">Width</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeEntry.mod.ports.map((p) => (
                        <tr key={p.name}>
                          <td className="px-3 py-2 font-mono text-slate-900 dark:text-cyan-300">{p.name}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">{p.direction}</td>
                          <td className="px-3 py-2 font-mono tabular-nums text-slate-600 dark:text-slate-400">{p.width}</td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Source Excerpt */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Structural RTL / Source Excerpt
              </h3>
              <CodeBlock
                title={activeEntry.mod.filePath}
                language="systemverilog"
                code={activeEntry.mod.sourceExcerpt}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
