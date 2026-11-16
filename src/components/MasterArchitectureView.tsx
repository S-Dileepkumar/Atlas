import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  AlertTriangle,
  Cpu,
  Filter,
  GitBranch,
  History,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { MASTER_ARCHITECTURE_DOMAINS, MasterDomainSpec } from '../data/masterArchitectureDomains';
import { ALL_PROTOCOLS, PROTOCOL_MAP } from '../data/protocols';
import { getIpById } from '../data/ips';
import { EntityClassification, LifecycleStatus, ProtocolDocument } from '../types/protocol';
import {
  ENTITY_CLASSIFICATIONS,
  LIFECYCLE_STATUSES,
  getEntityClassification,
  getEntityRelationships,
  getLifecycleNote,
  getLifecycleStatus,
} from '../utils/entityTaxonomy';
import { AppView } from './HomeDashboard';

interface MasterArchitectureViewProps {
  onSelectProtocol: (id: string) => void;
  onSelectIp: (id: string) => void;
  onNavigate: (view: AppView) => void;
}

const LIFECYCLE_STYLES: Record<LifecycleStatus, string> = {
  'Currently Maintained': 'text-emerald-700 dark:text-emerald-400',
  'Superseded / Merged': 'text-amber-700 dark:text-amber-400',
  'Deprecated / Historical': 'text-rose-700 dark:text-rose-400',
  Proprietary: 'text-indigo-700 dark:text-indigo-400',
  'Research / Emerging': 'text-cyan-700 dark:text-cyan-400',
};

export const MasterArchitectureView: React.FC<MasterArchitectureViewProps> = ({
  onSelectProtocol,
  onSelectIp,
  onNavigate,
}) => {
  const [selectedDomainId, setSelectedDomainId] = useState<string>(MASTER_ARCHITECTURE_DOMAINS[0].id);
  const [classificationFilter, setClassificationFilter] = useState<EntityClassification | 'ALL'>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedDomain: MasterDomainSpec = useMemo(
    () => MASTER_ARCHITECTURE_DOMAINS.find((d) => d.id === selectedDomainId) || MASTER_ARCHITECTURE_DOMAINS[0],
    [selectedDomainId]
  );

  // Compute global counts by EntityClassification and LifecycleStatus
  const taxonomyStats = useMemo(() => {
    const classCounts = Object.fromEntries(ENTITY_CLASSIFICATIONS.map((c) => [c.id, 0])) as Record<
      EntityClassification,
      number
    >;
    const lifecycleCounts = Object.fromEntries(LIFECYCLE_STATUSES.map((s) => [s, 0])) as Record<
      LifecycleStatus,
      number
    >;
    for (const p of ALL_PROTOCOLS) {
      const cls = getEntityClassification(p);
      const lc = getLifecycleStatus(p);
      classCounts[cls] = (classCounts[cls] || 0) + 1;
      lifecycleCounts[lc] = (lifecycleCounts[lc] || 0) + 1;
    }
    return { classCounts, lifecycleCounts };
  }, []);

  // Entries belonging to the currently selected Master Domain (ordered with featured entries first)
  const domainEntries = useMemo(() => {
    const featSet = new Set(selectedDomain.featuredEntryIds);
    const featured = selectedDomain.featuredEntryIds
      .map((id) => PROTOCOL_MAP[id])
      .filter((x): x is ProtocolDocument => Boolean(x));
    const categoryExtras = ALL_PROTOCOLS.filter(
      (p) => selectedDomain.categoryIds.includes(p.categoryId) && !featSet.has(p.id)
    );
    return [...featured, ...categoryExtras];
  }, [selectedDomain]);

  // Global filtered view when using strict EntityClassification / Lifecycle / Search filters
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base =
      classificationFilter === 'ALL' && lifecycleFilter === 'ALL' && !q
        ? domainEntries
        : ALL_PROTOCOLS.filter((p) => {
            if (classificationFilter !== 'ALL' && getEntityClassification(p) !== classificationFilter) {
              return false;
            }
            if (lifecycleFilter !== 'ALL' && getLifecycleStatus(p) !== lifecycleFilter) {
              return false;
            }
            if (q) {
              const cls = getEntityClassification(p).toLowerCase();
              const lc = getLifecycleStatus(p).toLowerCase();
              const rels = getEntityRelationships(p).join(' ').toLowerCase();
              return (
                p.name.toLowerCase().includes(q) ||
                p.fullName.toLowerCase().includes(q) ||
                p.tagline.toLowerCase().includes(q) ||
                cls.includes(q) ||
                lc.includes(q) ||
                rels.includes(q)
              );
            }
            return true;
          });
    return base;
  }, [domainEntries, classificationFilter, lifecycleFilter, searchQuery]);

  const isGlobalFilterActive =
    classificationFilter !== 'ALL' || lifecycleFilter !== 'ALL' || searchQuery.trim().length > 0;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
            16-Domain Master Semiconductor Knowledge Architecture
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Semiconductor Taxonomy, Coherency, Physical Design &amp; Lifecycle Atlas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Cleanly classifies all {ALL_PROTOCOLS.length} specifications across 9 rigorous engineering entity types—never confusing EDA/DV standards, security algorithms, safety specs, or internal CDC mechanisms with wire-level communication buses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('completeness-dashboard')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-cyan-500 cursor-pointer whitespace-nowrap"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          Open Completeness Audit
        </button>
      </div>

      {/* Strict 9-Type Entity Classification & 5-State Lifecycle Filter Matrix */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <Filter className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Strict Entity Classification &amp; Historical Lifecycle Filter
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all 498 entries, lifecycle notes, CXL/TLP/CDC..."
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-72 focus:outline-none focus:border-cyan-500"
            />
            {isGlobalFilterActive && (
              <button
                type="button"
                onClick={() => {
                  setClassificationFilter('ALL');
                  setLifecycleFilter('ALL');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-500 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
              Entity Type:
            </span>
            <button
              type="button"
              onClick={() => setClassificationFilter('ALL')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                classificationFilter === 'ALL'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-cyan-500'
              }`}
            >
              All ({ALL_PROTOCOLS.length})
            </button>
            {ENTITY_CLASSIFICATIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.description}
                onClick={() =>
                  setClassificationFilter((prev) => (prev === c.id ? 'ALL' : c.id))
                }
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors tabular-nums ${
                  classificationFilter === c.id
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-cyan-500'
                }`}
              >
                {c.shortLabel} ({taxonomyStats.classCounts[c.id]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
              Lifecycle Status:
            </span>
            <button
              type="button"
              onClick={() => setLifecycleFilter('ALL')}
              className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                lifecycleFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                  : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-cyan-500'
              }`}
            >
              All Statuses
            </button>
            {LIFECYCLE_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setLifecycleFilter((prev) => (prev === st ? 'ALL' : st))}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors tabular-nums ${
                  lifecycleFilter === st
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                    : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-cyan-500'
                }`}
              >
                {st} ({taxonomyStats.lifecycleCounts[st]})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Architectural Insights Strip: Coherent Consolidation + Boundary Discipline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
        <div className="rounded-lg border border-amber-500/35 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
            <History className="w-4 h-4 shrink-0" />
            Historical Consolidation: CCIX, OpenCAPI &amp; Gen-Z → CXL
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            Industry coherent accelerator &amp; memory expansion fabrics converged cleanly into Compute Express Link (CXL): Gen-Z IP transferred into CXL (2021), OpenCAPI transferred its specification to CXL (2022), and CCIX 1.0/1.1 transitioned into maintenance behind PCIe 5.0/6.0 + CXL 3.x. Superseded entries remain preserved for historical systems &amp; architecture interviews with explicit migration notices.
          </p>
        </div>

        <div className="rounded-lg border border-cyan-500/35 bg-cyan-50/60 dark:bg-cyan-950/20 p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-cyan-900 dark:text-cyan-300">
            <GitBranch className="w-4 h-4 shrink-0" />
            Architectural Boundary: ISA Extension vs uArch Interface vs Bus Protocol
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong>ISA Extensions</strong> (RVV, Arm SVE, AES-NI) live inside instruction encodings &amp; architectural registers; <strong>Microarchitectural Interfaces</strong> (RoCC, CV-X-IF, AXI ACP, Gray FIFOs, CDC synchronizers) bridge tightly-coupled execution blocks inside a single die; <strong>External Communication Protocols</strong> (AXI4, CHI, PCIe, CXL, Ethernet) govern multi-agent fabrics and chip pins.
          </p>
        </div>
      </div>

      {/* Main Split: 16-Domain Left Selector + Right Domain Explorer / Filtered Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 16-Domain Navigator */}
        <aside className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              16 Top-Level Knowledge Domains
            </span>
            <span className="font-mono text-slate-500 tabular-nums">01–16</span>
          </div>
          {MASTER_ARCHITECTURE_DOMAINS.map((dom) => {
            const active = !isGlobalFilterActive && dom.id === selectedDomain.id;
            const entryCount = ALL_PROTOCOLS.filter(
              (p) => dom.categoryIds.includes(p.categoryId) || dom.featuredEntryIds.includes(p.id)
            ).length;
            return (
              <button
                key={dom.id}
                type="button"
                onClick={() => {
                  setClassificationFilter('ALL');
                  setLifecycleFilter('ALL');
                  setSearchQuery('');
                  setSelectedDomainId(dom.id);
                }}
                className={`w-full px-4 py-3 text-left transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                  active
                    ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border-l-4 border-l-cyan-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">
                      {dom.number}
                    </span>
                    <span className="truncate">{dom.shortTitle}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {dom.primaryClassifications.join(' · ')}
                  </div>
                </div>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                  {entryCount}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Right: Active Domain Deep View or Global Taxonomy Results */}
        <div className="lg:col-span-8 space-y-5">
          {!isGlobalFilterActive && (
            <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-cyan-700 dark:text-cyan-400 font-semibold">
                    DOMAIN {selectedDomain.number} · {selectedDomain.primaryClassifications.join(' · ')}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedDomain.title}
                  </h2>
                </div>
                {selectedDomain.targetView && selectedDomain.targetLabel && (
                  <button
                    type="button"
                    onClick={() => onNavigate(selectedDomain.targetView!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer whitespace-nowrap"
                  >
                    {selectedDomain.targetLabel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedDomain.summary}
              </p>

              {selectedDomain.historicalNote && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/35 bg-amber-50/70 dark:bg-amber-950/25 p-3 text-xs text-amber-900 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{selectedDomain.historicalNote}</span>
                </div>
              )}

              {selectedDomain.featuredIpIds.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Related Open-Source Silicon Implementations
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDomain.featuredIpIds.map((ipId) => {
                      const ip = getIpById(ipId);
                      return (
                        <button
                          key={ipId}
                          type="button"
                          onClick={() => onSelectIp(ipId)}
                          className="px-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-cyan-500 text-left cursor-pointer transition-colors"
                        >
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {ip.name}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                            · {ip.rtlLanguage}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Entry Cards Grid */}
          <section className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>
                {isGlobalFilterActive ? (
                  <>
                    Global Taxonomy Filter: <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{filteredEntries.length}</strong> matching entries
                  </>
                ) : (
                  <>
                    Showing <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{filteredEntries.length}</strong> entries mapped to Domain {selectedDomain.number}
                  </>
                )}
              </span>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-8 text-center text-xs text-slate-500">
                No entries match the active classification and lifecycle filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredEntries.map((p) => {
                  const entityCls = getEntityClassification(p);
                  const lifecycle = getLifecycleStatus(p);
                  const lifecycleNote = getLifecycleNote(p);
                  const relationships = getEntityRelationships(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectProtocol(p.id)}
                      className="p-4 text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-cyan-500/60 transition-colors cursor-pointer flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                          <span className="text-cyan-700 dark:text-cyan-400">{entityCls}</span>
                          <span className="text-slate-400" aria-hidden="true">·</span>
                          <span className={LIFECYCLE_STYLES[lifecycle]}>{lifecycle}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {p.name}{' '}
                          <span className="font-normal text-xs text-slate-500 dark:text-slate-400">
                            — {p.fullName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          {p.tagline}
                        </p>
                        {lifecycleNote && (
                          <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/25 rounded px-2 py-1 leading-snug">
                            {lifecycleNote}
                          </div>
                        )}
                        {relationships.length > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            Lineage: {relationships.join(' · ')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 truncate">
                          {p.standardBody} · {p.specVersion}
                        </span>
                        <span className="font-medium text-cyan-700 dark:text-cyan-400 shrink-0 ml-2">
                          Inspect →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
