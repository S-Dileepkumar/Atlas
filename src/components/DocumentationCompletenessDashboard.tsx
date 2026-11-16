import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  MinusCircle,
  ShieldAlert,
  Search,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Cpu,
  Layers,
  Filter,
} from 'lucide-react';
import { ALL_PROTOCOLS } from '../data/protocols';
import { ALL_IPS, getProjectById } from '../data/ips';
import { PROTOCOL_CATEGORIES } from '../data/categories';
import {
  auditIpCompleteness,
  auditProtocolCompleteness,
  CompletenessReport,
  CompletenessStatus,
} from '../utils/completenessTracker';
import {
  ENTITY_CLASSIFICATIONS,
  getEntityClassification,
  getLifecycleStatus,
} from '../utils/entityTaxonomy';

interface DocumentationCompletenessDashboardProps {
  onSelectProtocol: (protocolId: string) => void;
  onSelectIp: (ipId: string) => void;
}

type EntityKind = 'Protocol' | 'Open-Source IP';

interface AuditedEntity {
  key: string;
  id: string;
  kind: EntityKind;
  entityType: string;
  lifecycleStatus: string;
  name: string;
  subtitle: string;
  domain: string;
  depthOrConfidence: string;
  report: CompletenessReport;
}

const TOPICS_ORDER = [
  'Fundamentals',
  'Architecture',
  'Specifications',
  'Signals',
  'Transactions',
  'Timing',
  'RTL hierarchy',
  'Internal modules',
  'Registers',
  'Parameters',
  'Verification',
  'Assertions',
  'Coverage',
  'Debugging',
  'Corner cases',
  'References',
];

const STATUS_META: Record<
  CompletenessStatus,
  {
    label: string;
    shortCode: string;
    textClass: string;
    cellClass: string;
    barClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  Documented: {
    label: 'Documented',
    shortCode: 'DOC',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    cellClass: 'bg-emerald-500/85 dark:bg-emerald-500/80 text-white',
    barClass: 'bg-emerald-500',
    Icon: CheckCircle2,
  },
  'Partially documented': {
    label: 'Partially documented',
    shortCode: 'PART',
    textClass: 'text-amber-700 dark:text-amber-400',
    cellClass: 'bg-amber-500/85 dark:bg-amber-500/80 text-white',
    barClass: 'bg-amber-500',
    Icon: Clock,
  },
  'Requires source verification': {
    label: 'Requires source verification',
    shortCode: 'VER',
    textClass: 'text-cyan-700 dark:text-cyan-400',
    cellClass: 'bg-cyan-600/85 dark:bg-cyan-500/80 text-white',
    barClass: 'bg-cyan-500',
    Icon: ShieldAlert,
  },
  'Not yet documented': {
    label: 'Not yet documented',
    shortCode: 'MISS',
    textClass: 'text-rose-700 dark:text-rose-400',
    cellClass: 'bg-rose-500/85 dark:bg-rose-500/80 text-white',
    barClass: 'bg-rose-500',
    Icon: AlertTriangle,
  },
  'Not applicable': {
    label: 'Not applicable',
    shortCode: 'N/A',
    textClass: 'text-slate-500 dark:text-slate-400',
    cellClass: 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    barClass: 'bg-slate-300 dark:bg-slate-700',
    Icon: MinusCircle,
  },
};

export const DocumentationCompletenessDashboard: React.FC<DocumentationCompletenessDashboardProps> = ({
  onSelectProtocol,
  onSelectIp,
}) => {
  const [kindFilter, setKindFilter] = useState<'ALL' | EntityKind>('ALL');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETE' | 'INCOMPLETE' | 'VERIFY'>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [topicStatusFilter, setTopicStatusFilter] = useState<'ALL' | CompletenessStatus>('ALL');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'gap-first' | 'high-first' | 'name'>('high-first');
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const categoryNameMap = useMemo(
    () => Object.fromEntries(PROTOCOL_CATEGORIES.map((c) => [c.id, c.shortName])),
    []
  );

  // Audit every protocol & IP once via deterministic memoization
  const allAudited: AuditedEntity[] = useMemo(() => {
    const protoAudits: AuditedEntity[] = ALL_PROTOCOLS.map((p) => ({
      key: `proto:${p.id}`,
      id: p.id,
      kind: 'Protocol',
      entityType: getEntityClassification(p),
      lifecycleStatus: getLifecycleStatus(p),
      name: p.name,
      subtitle: p.fullName,
      domain: categoryNameMap[p.categoryId] || p.categoryId,
      depthOrConfidence: p.depth,
      report: auditProtocolCompleteness(p),
    }));

    const ipAudits: AuditedEntity[] = ALL_IPS.map((ip) => ({
      key: `ip:${ip.id}`,
      id: ip.id,
      kind: 'Open-Source IP',
      entityType: 'Open-Source Silicon IP',
      lifecycleStatus: ip.confidence,
      name: ip.name,
      subtitle: `${getProjectById(ip.projectId).name} · ${ip.rtlLanguage}`,
      domain: ip.category,
      depthOrConfidence: ip.confidence,
      report: auditIpCompleteness(ip),
    }));

    return [...ipAudits, ...protoAudits];
  }, [categoryNameMap]);

  // Global metrics across selected kindFilter (or full corpus)
  const scopedBase = useMemo(() => {
    if (kindFilter === 'ALL') return allAudited;
    return allAudited.filter((e) => e.kind === kindFilter);
  }, [allAudited, kindFilter]);

  const summaryStats = useMemo(() => {
    const protos = allAudited.filter((e) => e.kind === 'Protocol');
    const ips = allAudited.filter((e) => e.kind === 'Open-Source IP');

    const avgPct = (arr: AuditedEntity[]) =>
      arr.length === 0 ? 0 : Math.round(arr.reduce((s, e) => s + e.report.percentComplete, 0) / arr.length);

    let totalCheckpoints = 0;
    let totalApplicable = 0;
    const statusCounts: Record<CompletenessStatus, number> = {
      Documented: 0,
      'Partially documented': 0,
      'Requires source verification': 0,
      'Not yet documented': 0,
      'Not applicable': 0,
    };

    for (const ent of scopedBase) {
      totalApplicable += ent.report.applicableCount;
      for (const item of ent.report.items) {
        statusCounts[item.status] += 1;
        totalCheckpoints += 1;
      }
    }

    const fullyCompleteCount = scopedBase.filter((e) => e.report.percentComplete === 100).length;
    const needsSourceVerifyCount = scopedBase.filter((e) =>
      e.report.items.some((i) => i.status === 'Requires source verification')
    ).length;

    return {
      protoCount: protos.length,
      ipCount: ips.length,
      protoAvgPct: avgPct(protos),
      ipAvgPct: avgPct(ips),
      overallAvgPct: avgPct(scopedBase),
      fullyCompleteCount,
      needsSourceVerifyCount,
      totalApplicable,
      totalCheckpoints,
      statusCounts,
    };
  }, [allAudited, scopedBase]);

  // Per-topic aggregate counts for the 16 MASTER INSTRUCTION checkpoints
  const topicStats = useMemo(() => {
    return TOPICS_ORDER.map((topicName) => {
      const counts: Record<CompletenessStatus, number> = {
        Documented: 0,
        'Partially documented': 0,
        'Requires source verification': 0,
        'Not yet documented': 0,
        'Not applicable': 0,
      };
      for (const ent of scopedBase) {
        const found = ent.report.items.find((i) => i.topic === topicName);
        if (found) counts[found.status] += 1;
      }
      const applicable = scopedBase.length - counts['Not applicable'];
      const pct = applicable === 0 ? 100 : Math.round((counts.Documented / applicable) * 100);
      return {
        topic: topicName,
        counts,
        applicable,
        pct,
      };
    });
  }, [scopedBase]);

  // Filtered + sorted rows
  const filteredEntities = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = scopedBase.filter((ent) => {
      if (entityTypeFilter !== 'ALL' && ent.entityType !== entityTypeFilter) return false;
      if (statusFilter === 'COMPLETE' && ent.report.percentComplete < 100) return false;
      if (statusFilter === 'INCOMPLETE' && ent.report.percentComplete === 100) return false;
      if (
        statusFilter === 'VERIFY' &&
        !ent.report.items.some((i) => i.status === 'Requires source verification')
      ) {
        return false;
      }

      if (selectedTopic !== 'ALL') {
        const tItem = ent.report.items.find((i) => i.topic === selectedTopic);
        if (!tItem) return false;
        if (topicStatusFilter !== 'ALL' && tItem.status !== topicStatusFilter) return false;
      } else if (topicStatusFilter !== 'ALL') {
        if (!ent.report.items.some((i) => i.status === topicStatusFilter)) return false;
      }

      if (q) {
        const match =
          ent.name.toLowerCase().includes(q) ||
          ent.subtitle.toLowerCase().includes(q) ||
          ent.domain.toLowerCase().includes(q) ||
          ent.entityType.toLowerCase().includes(q) ||
          ent.lifecycleStatus.toLowerCase().includes(q) ||
          ent.id.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    const sorted = [...list];
    if (sortBy === 'gap-first') {
      sorted.sort((a, b) => a.report.percentComplete - b.report.percentComplete || a.name.localeCompare(b.name));
    } else if (sortBy === 'high-first') {
      sorted.sort((a, b) => b.report.percentComplete - a.report.percentComplete || a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [scopedBase, entityTypeFilter, statusFilter, selectedTopic, topicStatusFilter, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredEntities.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageEntities = filteredEntities.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
            MASTER INSTRUCTION Technical Coverage Audit
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            Documentation Completeness Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Live 16-topic engineering verification matrix tracking Fundamentals, Architecture, Signals, Timing, RTL Hierarchy, Registers, UVM/SVA Verification, Debugging, and Primary Citations across all {allAudited.length} protocols & open-source IPs.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs">
          {[
            { id: 'ALL' as const, label: `All Entities (${allAudited.length})` },
            { id: 'Protocol' as const, label: `Protocols (${summaryStats.protoCount})` },
            { id: 'Open-Source IP' as const, label: `Silicon IPs (${summaryStats.ipCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setKindFilter(tab.id);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors ${
                kindFilter === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Scoped Corpus Completeness</span>
            <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {summaryStats.overallAvgPct}%
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${(summaryStats.statusCounts.Documented / Math.max(1, summaryStats.totalApplicable)) * 100}%`,
              }}
              title={`Documented: ${summaryStats.statusCounts.Documented}`}
            />
            <div
              className="h-full bg-amber-500"
              style={{
                width: `${(summaryStats.statusCounts['Partially documented'] / Math.max(1, summaryStats.totalApplicable)) * 100}%`,
              }}
              title={`Partially documented: ${summaryStats.statusCounts['Partially documented']}`}
            />
            <div
              className="h-full bg-cyan-500"
              style={{
                width: `${(summaryStats.statusCounts['Requires source verification'] / Math.max(1, summaryStats.totalApplicable)) * 100}%`,
              }}
              title={`Requires source verification: ${summaryStats.statusCounts['Requires source verification']}`}
            />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {summaryStats.statusCounts.Documented} documented / {summaryStats.totalApplicable} applicable checks
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Protocol Atlas Coverage</span>
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {summaryStats.protoAvgPct}%
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${summaryStats.protoAvgPct}%` }} />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Across {summaryStats.protoCount} bus, PHY, memory & NoC standards
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Open-Source IP Coverage</span>
            <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {summaryStats.ipAvgPct}%
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${summaryStats.ipAvgPct}%` }} />
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            Across {summaryStats.ipCount} RISC-V, GPU, AI, crypto & bus IPs
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Gap & Source Audit</span>
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {summaryStats.fullyCompleteCount}{' '}
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">at 100%</span>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            {summaryStats.needsSourceVerifyCount} items flagged for deeper RTL source pass
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Honest audit: RTL-inferred fields never marked 100%
          </div>
        </div>
      </div>

      {/* 16-Topic Engineering Layer Coverage Breakdown */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              16 MASTER INSTRUCTION Engineering Layers — Coverage & Gap Map
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any topic below to filter the checklist matrix to entities documented or needing work on that layer.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {(['Documented', 'Partially documented', 'Requires source verification', 'Not yet documented', 'Not applicable'] as CompletenessStatus[]).map(
              (st) => (
                <span key={st} className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className={`w-2.5 h-2.5 rounded-xs ${STATUS_META[st].barClass}`} />
                  {st}
                </span>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {topicStats.map((ts) => {
            const isSelected = selectedTopic === ts.topic;
            const total = Math.max(1, scopedBase.length);
            return (
              <button
                key={ts.topic}
                type="button"
                onClick={() => {
                  setSelectedTopic((prev) => (prev === ts.topic ? 'ALL' : ts.topic));
                  setPage(0);
                }}
                className={`p-3 rounded-md border text-left transition-colors cursor-pointer space-y-2 ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{ts.topic}</span>
                  <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400 tabular-nums">
                    {ts.pct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${(ts.counts.Documented / total) * 100}%` }} />
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${(ts.counts['Partially documented'] / total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${(ts.counts['Requires source verification'] / total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${(ts.counts['Not yet documented'] / total) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  <span>{ts.counts.Documented}/{ts.applicable} verified</span>
                  {ts.counts['Not applicable'] > 0 && <span>{ts.counts['Not applicable']} N/A</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter Bar + Entity Checklist Matrix */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs items-center">
          <div className="lg:col-span-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Filter protocols, standards, IPs..."
              className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Entity Types</option>
              <option value="Open-Source Silicon IP">Open-Source Silicon IP</option>
              {ENTITY_CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(0);
              }}
              className="w-full px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Completeness</option>
              <option value="COMPLETE">100% Documented</option>
              <option value="INCOMPLETE">Partial / Gaps (&lt;100%)</option>
              <option value="VERIFY">Requires Source Verification</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setPage(0);
              }}
              className="w-full px-2.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All 16 Topics</option>
              {TOPICS_ORDER.map((t) => (
                <option key={t} value={t}>
                  Topic: {t}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 flex gap-2">
            <select
              value={topicStatusFilter}
              onChange={(e) => {
                setTopicStatusFilter(e.target.value as typeof topicStatusFilter);
                setPage(0);
              }}
              className="w-1/2 px-2 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">Any Status</option>
              <option value="Documented">Doc</option>
              <option value="Partially documented">Partial</option>
              <option value="Requires source verification">Verify</option>
              <option value="Not yet documented">Missing</option>
              <option value="Not applicable">N/A</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-1/2 px-2 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="high-first">High %</option>
              <option value="gap-first">Gaps 1st</option>
              <option value="name">A → Z</option>
            </select>
          </div>
        </div>

        {/* Active filter notice & pagination header */}
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>
              Showing <strong className="text-slate-900 dark:text-slate-100">{filteredEntities.length}</strong> audited entries
              {selectedTopic !== 'ALL' ? ` · Highlighting "${selectedTopic}"` : ''}
            </span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="font-mono tabular-nums">
                Page {clampedPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={clampedPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Entity Matrix Rows */}
        {pageEntities.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No protocols or IPs match your current completeness filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {pageEntities.map((ent) => {
              const isExpanded = Boolean(expandedKeys[ent.key]);
              return (
                <div key={ent.key} className="transition-colors">
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    {/* Left Identity */}
                    <div className="min-w-0 lg:w-1/3">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-cyan-700 dark:text-cyan-400">{ent.entityType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ent.domain}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ent.lifecycleStatus}</span>
                      </div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                        {ent.name}{' '}
                        <span className="font-normal text-xs text-slate-500 dark:text-slate-400">
                          — {ent.subtitle}
                        </span>
                      </div>
                    </div>

                    {/* Center 16-Topic Mini Status Matrix */}
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-8 sm:grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
                        {ent.report.items.map((item) => {
                          const meta = STATUS_META[item.status];
                          const isHighlighted = selectedTopic === item.topic;
                          return (
                            <button
                              key={item.topic}
                              type="button"
                              onClick={() => toggleExpand(ent.key)}
                              title={`${item.topic}: ${item.status} — ${item.detail}`}
                              className={`h-6 rounded-xs text-[9px] font-mono font-semibold flex items-center justify-center cursor-pointer transition-transform ${meta.cellClass} ${
                                isHighlighted ? 'ring-2 ring-slate-900 dark:ring-white scale-105' : ''
                              }`}
                            >
                              {item.topic.slice(0, 2).toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Progress & Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${
                              ent.report.percentComplete === 100
                                ? 'bg-emerald-500'
                                : ent.report.percentComplete >= 70
                                ? 'bg-cyan-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${ent.report.percentComplete}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100 w-10 text-right">
                          {ent.report.percentComplete}%
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpand(ent.key)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {isExpanded ? 'Hide' : 'Checklist'}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => (ent.kind === 'Protocol' ? onSelectProtocol(ent.id) : onSelectIp(ent.id))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer whitespace-nowrap"
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Full 16-Topic Checklist */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-slate-50/60 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200">Audit Summary:</strong>{' '}
                        {ent.report.documentedCount}/{ent.report.applicableCount} applicable technical domains documented ({ent.report.percentComplete}%) · {ent.report.note}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        {ent.report.items.map((item) => {
                          const st = STATUS_META[item.status];
                          const Icon = st.Icon;
                          return (
                            <div
                              key={item.topic}
                              className={`p-3 rounded border bg-white dark:bg-slate-900 space-y-1 ${
                                selectedTopic === item.topic
                                  ? 'border-cyan-500'
                                  : 'border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{item.topic}</span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${st.textClass}`}>
                                  <Icon className="w-3.5 h-3.5" />
                                  {item.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                {item.detail}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
