import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckSquare,
  GitCompare,
  Network,
  Search,
  X,
} from 'lucide-react';
import { CategoryId, EntityClassification, LifecycleStatus } from '../types/protocol';
import { PROTOCOL_CATEGORIES } from '../data/categories';
import { ALL_PROTOCOLS } from '../data/protocols';
import {
  ENTITY_CLASSIFICATIONS,
  LIFECYCLE_STATUSES,
  getEntityClassification,
  getLifecycleStatus,
} from '../utils/entityTaxonomy';
import type { AppView } from './HomeDashboard';

interface ProtocolDirectoryViewProps {
  onSelectProtocol: (id: string) => void;
  onOpenExplainer?: (topicId?: string) => void;
  onNavigate: (view: AppView) => void;
}

export const ProtocolDirectoryView: React.FC<ProtocolDirectoryViewProps> = ({
  onSelectProtocol,
  onOpenExplainer,
  onNavigate,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all');
  const [entityFilter, setEntityFilter] = useState<EntityClassification | 'ALL'>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleStatus | 'ALL'>('ALL');
  const [inlineFilter, setInlineFilter] = useState('');
  const deferredFilter = useDeferredValue(inlineFilter);
  const [dirPage, setDirPage] = useState(0);
  const dirPageSize = 24;

  const activeCategoryObj = useMemo(
    () => PROTOCOL_CATEGORIES.find((c) => c.id === activeCategory),
    [activeCategory]
  );

  const filteredProtocols = useMemo(() => {
    const q = deferredFilter.trim().toLowerCase();
    return ALL_PROTOCOLS.filter((p) => {
      const catOk = activeCategory === 'all' || p.categoryId === activeCategory;
      if (!catOk) return false;
      const entityOk = entityFilter === 'ALL' || getEntityClassification(p) === entityFilter;
      if (!entityOk) return false;
      const lifecycleOk = lifecycleFilter === 'ALL' || getLifecycleStatus(p) === lifecycleFilter;
      if (!lifecycleOk) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.standardBody.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, entityFilter, lifecycleFilter, deferredFilter]);

  const totalDirPages = Math.max(1, Math.ceil(filteredProtocols.length / dirPageSize));
  const clampedDirPage = Math.min(dirPage, totalDirPages - 1);
  const visibleDirectoryProtocols = useMemo(
    () =>
      filteredProtocols.slice(
        clampedDirPage * dirPageSize,
        (clampedDirPage + 1) * dirPageSize
      ),
    [filteredProtocols, clampedDirPage, dirPageSize]
  );

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-mono font-semibold text-[var(--sem-control)]">
                Protocol Atlas Directory
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{ALL_PROTOCOLS.length} Protocols &amp; Standards</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{PROTOCOL_CATEGORIES.length} Specialized Domains</span>
              <span aria-hidden="true">·</span>
              <span className="text-[var(--sem-high)] font-medium">16-Checkpoint Audited</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
              All Semiconductor Protocols, Fabrics &amp; Architecture Standards
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Browse every on-chip bus, high-speed SerDes interconnect, memory standard, peripheral protocol, CDC/DFT pattern, and packaging specification with signal maps, waveforms, SVA properties, and RTL guides.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('simulator')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap font-medium"
            >
              <Activity className="w-4 h-4 text-[var(--sem-control)]" />
              Waveform Lab
            </button>
            <button
              type="button"
              onClick={() => onNavigate('checker')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap font-medium"
            >
              <CheckSquare className="w-4 h-4 text-[var(--sem-control)]" />
              Compliance Checker
            </button>
            <button
              type="button"
              onClick={() => onNavigate('compare')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap font-medium"
            >
              <GitCompare className="w-4 h-4 text-[var(--sem-control)]" />
              Compare Matrix
            </button>
            <button
              type="button"
              onClick={() => onNavigate('soc-map')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap font-medium"
            >
              <Network className="w-4 h-4 text-[var(--sem-control)]" />
              Bus Fabric Map
            </button>
          </div>
        </div>

        {/* Search & Taxonomy Filters */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={inlineFilter}
              onChange={(e) => {
                setInlineFilter(e.target.value);
                setDirPage(0);
              }}
              placeholder="Filter protocols, standards, buses, or bodies..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--sem-control)]"
            />
            {inlineFilter && (
              <button
                type="button"
                onClick={() => {
                  setInlineFilter('');
                  setDirPage(0);
                }}
                aria-label="Clear filter"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value as EntityClassification | 'ALL');
              setDirPage(0);
            }}
            aria-label="Filter by entity classification"
            className="px-3 py-2 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--sem-control)]"
          >
            <option value="ALL">All Entity Types</option>
            {ENTITY_CLASSIFICATIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </select>

          <select
            value={lifecycleFilter}
            onChange={(e) => {
              setLifecycleFilter(e.target.value as LifecycleStatus | 'ALL');
              setDirPage(0);
            }}
            aria-label="Filter by lifecycle status"
            className="px-3 py-2 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--sem-control)]"
          >
            <option value="ALL">All Lifecycles</option>
            {LIFECYCLE_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {(activeCategory !== 'all' || entityFilter !== 'ALL' || lifecycleFilter !== 'ALL' || inlineFilter) && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setEntityFilter('ALL');
                setLifecycleFilter('ALL');
                setInlineFilter('');
                setDirPage(0);
              }}
              className="px-3 py-2 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--sem-control)] hover:border-[var(--sem-control)] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* 30 Domain Category Tabs */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setDirPage(0);
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-[var(--sem-control)] text-white dark:text-slate-950 font-semibold'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--sem-control)]'
            }`}
          >
            All Domains ({ALL_PROTOCOLS.length})
          </button>
          {PROTOCOL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setDirPage(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-[var(--sem-control)] text-white dark:text-slate-950 font-semibold'
                  : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--sem-control)]'
              }`}
            >
              {cat.shortName} ({cat.protocolIds.length})
            </button>
          ))}
        </div>

        {activeCategoryObj && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-2 text-xs">
            <div className="font-semibold text-sm text-[var(--text-primary)]">
              {activeCategoryObj.name} · {filteredProtocols.length} entries
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">{activeCategoryObj.description}</p>
            {activeCategoryObj.caveatNote && (
              <div className="flex items-start gap-2 pt-1.5 text-[var(--sem-active)]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{activeCategoryObj.caveatNote}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Pagination Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
        <span className="tabular-nums">
          Showing <strong className="text-[var(--text-primary)]">{visibleDirectoryProtocols.length}</strong> of{' '}
          <strong className="text-[var(--text-primary)]">{filteredProtocols.length}</strong> protocols
        </span>
        {totalDirPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={clampedDirPage === 0}
              onClick={() => setDirPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer hover:border-[var(--sem-control)]"
            >
              Prev
            </button>
            <span className="font-mono tabular-nums px-2">
              Page {clampedDirPage + 1} / {totalDirPages}
            </span>
            <button
              type="button"
              disabled={clampedDirPage >= totalDirPages - 1}
              onClick={() => setDirPage((p) => Math.min(totalDirPages - 1, p + 1))}
              className="px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer hover:border-[var(--sem-control)]"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Protocol Cards Grid */}
      {visibleDirectoryProtocols.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center text-xs text-[var(--text-secondary)] space-y-3">
          <BookOpen className="w-6 h-6 text-[var(--sem-control)] mx-auto" />
          <p>No protocols matched your current filters.</p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('all');
              setEntityFilter('ALL');
              setLifecycleFilter('ALL');
              setInlineFilter('');
              setDirPage(0);
            }}
            className="text-[var(--sem-control)] font-semibold hover:underline cursor-pointer"
          >
            Show All {ALL_PROTOCOLS.length} Protocols
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleDirectoryProtocols.map((p) => {
            const entityCls = getEntityClassification(p);
            const lifecycle = getLifecycleStatus(p);
            return (
              <div
                key={p.id}
                className="p-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--sem-control)] transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--sem-control)]">{entityCls}</span>
                    <span aria-hidden="true"> · </span>
                    <span
                      className={
                        lifecycle === 'Superseded / Merged'
                          ? 'text-[var(--sem-active)] font-medium'
                          : lifecycle === 'Deprecated / Historical'
                          ? 'text-[var(--sem-error)] font-medium'
                          : ''
                      }
                    >
                      {lifecycle}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-[var(--text-primary)] mt-1.5">
                    {p.name}
                    <span className="font-normal text-xs text-[var(--text-secondary)] ml-2">
                      {p.fullName}
                    </span>
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    {p.tagline}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)] text-xs">
                  <span className="font-mono text-[var(--text-secondary)] tabular-nums">
                    {p.standardBody} · {p.signals.length} signals
                  </span>
                  <div className="flex items-center gap-3">
                    {onOpenExplainer && (
                      <button
                        type="button"
                        onClick={() => onOpenExplainer(`proto-${p.id}`)}
                        className="font-medium text-[var(--text-secondary)] hover:text-[var(--sem-control)] hover:underline cursor-pointer"
                      >
                        Explainer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectProtocol(p.id)}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--sem-control)] hover:underline cursor-pointer"
                    >
                      Explore Spec
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Pagination */}
      {totalDirPages > 1 && (
        <div className="flex justify-center pt-2">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={clampedDirPage === 0}
              onClick={() => {
                setDirPage((p) => Math.max(0, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer hover:border-[var(--sem-control)]"
            >
              ← Previous Page
            </button>
            <span className="font-mono tabular-nums px-3 text-[var(--text-secondary)]">
              Page {clampedDirPage + 1} of {totalDirPages}
            </span>
            <button
              type="button"
              disabled={clampedDirPage >= totalDirPages - 1}
              onClick={() => {
                setDirPage((p) => Math.min(totalDirPages - 1, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer hover:border-[var(--sem-control)]"
            >
              Next Page →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
