import React, { useMemo, useState } from 'react';
import { Search, ArrowRight, Cpu, Dices } from 'lucide-react';
import { ALL_IPS, PROJECTS, getProjectById } from '../data/ips';
import { IpCategory } from '../types/ipUniverse';

interface IpUniverseExplorerProps {
  presetCategory?: IpCategory | 'ALL';
  heading?: string;
  subheading?: string;
  onSelectIp: (ipId: string) => void;
  onSelectProtocol: (protoId: string) => void;
}

export const IpUniverseExplorer: React.FC<IpUniverseExplorerProps> = ({
  presetCategory = 'ALL',
  heading = 'Open-Source IP Universe',
  subheading = 'Explore Silicon. Understand Architecture. Reverse Engineer IP. Source-traceable semiconductor IPs across RISC-V, OpenTitan, GPUs, AI accelerators, and interconnects.',
  onSelectIp,
  onSelectProtocol,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>(presetCategory);
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [langFilter, setLangFilter] = useState<string>('ALL');
  const [licenseFilter, setLicenseFilter] = useState<string>('ALL');
  const [protoFilter, setProtoFilter] = useState<string>('ALL');
  const [maturityFilter, setMaturityFilter] = useState<string>('ALL');

  React.useEffect(() => {
    setCategory(presetCategory);
  }, [presetCategory]);

  const categories = useMemo(
    () => Array.from(new Set(ALL_IPS.map((ip) => ip.category))),
    []
  );
  const languages = useMemo(
    () => Array.from(new Set(ALL_IPS.map((ip) => ip.rtlLanguage))),
    []
  );
  const licenses = useMemo(
    () => Array.from(new Set(ALL_IPS.map((ip) => ip.license))),
    []
  );
  const protocols = useMemo(
    () => Array.from(new Set(ALL_IPS.flatMap((ip) => ip.interfaces.map((i) => i.protocolId)))),
    []
  );
  const maturities = useMemo(
    () => Array.from(new Set(ALL_IPS.map((ip) => ip.verification.maturity))),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_IPS.filter((ip) => {
      if (category !== 'ALL' && ip.category !== category) return false;
      if (projectFilter !== 'ALL' && ip.projectId !== projectFilter) return false;
      if (langFilter !== 'ALL' && ip.rtlLanguage !== langFilter) return false;
      if (licenseFilter !== 'ALL' && ip.license !== licenseFilter) return false;
      if (maturityFilter !== 'ALL' && ip.verification.maturity !== maturityFilter) return false;
      if (protoFilter !== 'ALL' && !ip.interfaces.some((i) => i.protocolId === protoFilter)) return false;
      if (q) {
        const modMatch = ip.modules.some((m) => m.name.toLowerCase().includes(q) || m.filePath.toLowerCase().includes(q));
        const textMatch =
          ip.name.toLowerCase().includes(q) ||
          ip.tagline.toLowerCase().includes(q) ||
          ip.functional.whatItDoes.toLowerCase().includes(q) ||
          ip.projectId.toLowerCase().includes(q);
        if (!modMatch && !textMatch) return false;
      }
      return true;
    });
  }, [query, category, projectFilter, langFilter, licenseFilter, protoFilter, maturityFilter]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
            Open-Source Silicon Intelligence
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            {heading}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            {subheading}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Showing <strong className="text-slate-900 dark:text-slate-100">{filtered.length}</strong> of {ALL_IPS.length} verified IPs
          </div>
          <button
            type="button"
            onClick={() => {
              const pool = filtered.length > 0 ? filtered : ALL_IPS;
              const pick = pool[Math.floor(Math.random() * pool.length)];
              onSelectIp(pick.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Dices className="w-3.5 h-3.5" />
            Feeling Lucky IP
          </button>
        </div>
      </div>

      {/* Multi-Faceted Engineering Filters */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
        <div className="lg:col-span-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search IP, RTL module (ibex_if_stage), or project..."
            className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Projects ({PROJECTS.length})</option>
          {PROJECTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={protoFilter}
          onChange={(e) => setProtoFilter(e.target.value)}
          className="px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All Protocols</option>
          {protocols.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
        </select>

        <select
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value)}
          className="px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
        >
          <option value="ALL">All RTL Languages</option>
          {languages.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <div className="lg:col-span-6 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={licenseFilter}
              onChange={(e) => setLicenseFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Licenses</option>
              {licenses.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={maturityFilter}
              onChange={(e) => setMaturityFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Verification Tiers</option>
              {maturities.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('ALL');
              setProjectFilter('ALL');
              setLangFilter('ALL');
              setLicenseFilter('ALL');
              setProtoFilter('ALL');
              setMaturityFilter('ALL');
            }}
            className="text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* IP Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-10 text-center rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No open-source IPs match the active filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ip) => {
            const proj = getProjectById(ip.projectId);
            return (
              <div
                key={ip.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 flex flex-col justify-between gap-4 hover:border-cyan-500/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {proj.name} · {ip.rtlLanguage} · {ip.license}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>{ip.name}</span>
                  </h2>
                  <div className="text-[11px] font-medium text-cyan-700 dark:text-cyan-400">
                    {ip.implementationKind} · {ip.depth}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ip.tagline}
                  </p>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums">{ip.modules.length} RTL modules</span>
                    <span aria-hidden="true">·</span>
                    <span>{ip.verification.maturity}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {ip.interfaces.slice(0, 3).map((iface) => (
                        <button
                          key={iface.name}
                          type="button"
                          onClick={() => onSelectProtocol(iface.protocolId)}
                          className="font-mono text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {iface.protocolId.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectIp(ip.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      Inspect IP <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
