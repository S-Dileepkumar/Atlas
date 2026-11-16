import React, { useMemo, useState } from 'react';
import { Search, BookOpen, ArrowRight, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { GLOSSARY_TERMS } from '../data/glossary';
import { GlossaryTerm } from '../types/ipUniverse';
import { getProtocolById } from '../data/protocols';
import { getIpById } from '../data/ips';
import { getGlossaryLayeredExplanation } from '../data/conceptDepthEngine';
import { ExplanationDepthFilter, LayeredExplanationPanel } from './LayeredExplanationPanel';

interface GlossaryViewProps {
  onSelectProtocol: (id: string) => void;
  onSelectIp: (id: string) => void;
}

const CATEGORIES: Array<'ALL' | GlossaryTerm['category']> = [
  'ALL',
  'Protocol',
  'RTL & Architecture',
  'Verification (UVM/SVA)',
  'Coherency & Memory',
  'Security & Debug',
  'GPU & AI Hardware',
];

export const GlossaryView: React.FC<GlossaryViewProps> = ({ onSelectProtocol, onSelectIp }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'ALL' | GlossaryTerm['category']>('ALL');
  const [depthLevel, setDepthLevel] = useState<ExplanationDepthFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'valid-ready': true,
    'skid-buffer': true,
  });
  const [expandAll, setExpandAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY_TERMS.filter((t) => {
      const catOk = category === 'ALL' || t.category === category;
      const qOk =
        !q ||
        t.term.toLowerCase().includes(q) ||
        (t.acronym && t.acronym.toLowerCase().includes(q)) ||
        t.definition.toLowerCase().includes(q) ||
        t.engineeringContext.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [query, category]);

  const toggleTerm = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !(expandAll ? prev[id] !== false : Boolean(prev[id])) }));
  };

  const isTermExpanded = (id: string) => {
    if (expandAll) return expandedIds[id] !== false;
    return Boolean(expandedIds[id]);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Semiconductor IP & Protocol Glossary
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Authoritative 3-level explanations (L1 Fundamental intuition, L2 Engineering mechanics, L3 Expert RTL/CDC & debug) for every VLSI concept.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search glossary concepts..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Understanding Layer Switcher + Expand Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">Understanding Layer:</span>
          <span>Filter L1/L2/L3 depth across every glossary concept</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
            {[
              { id: 'all' as const, label: 'All 3 Levels' },
              { id: 'l1' as const, label: 'L1 Fundamental' },
              { id: 'l2' as const, label: 'L2 Engineering' },
              { id: 'l3' as const, label: 'L3 Expert (RTL/DV)' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  setDepthLevel(lvl.id);
                  if (lvl.id !== 'all') setExpandAll(true);
                }}
                className={`px-2.5 py-1 rounded font-medium whitespace-nowrap cursor-pointer ${
                  depthLevel === lvl.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !expandAll;
              setExpandAll(next);
              if (!next) setExpandedIds({});
            }}
            className="px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
          >
            {expandAll ? 'Collapse All Deep Views' : 'Expand All L1–L3 Views'}
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              category === c
                ? 'bg-cyan-600 text-white'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {c === 'ALL' ? `All Terms (${GLOSSARY_TERMS.length})` : c}
          </button>
        ))}
      </div>

      {/* Glossary Cards */}
      {filtered.length === 0 ? (
        <div className="p-10 text-center rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          No glossary entries match "{query}".
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const isOpen = isTermExpanded(item.id);
            const explanation = getGlossaryLayeredExplanation(item);
            return (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 max-w-4xl">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.category}
                      {item.acronym ? ` · ${item.acronym}` : ''}
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      {item.term}
                    </h2>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.definition}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      <strong className="text-slate-700 dark:text-slate-200">Engineering Context:</strong>{' '}
                      {item.engineeringContext}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTerm(item.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 cursor-pointer shrink-0"
                  >
                    {isOpen ? (
                      <>
                        Hide L1–L3 Deep Explanation <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Inspect L1–L3 Deep Explanation <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {isOpen && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <LayeredExplanationPanel
                      explanation={explanation}
                      depthLevel={depthLevel}
                      compact
                    />
                  </div>
                )}

                {(item.relatedProtocolIds?.length || item.relatedIpIds?.length) && (
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    {item.relatedProtocolIds?.map((pid) => (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => onSelectProtocol(pid)}
                        className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-400 font-medium hover:underline cursor-pointer"
                      >
                        {getProtocolById(pid).name} Protocol <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                    {item.relatedIpIds?.map((iid) => (
                      <button
                        key={iid}
                        type="button"
                        onClick={() => onSelectIp(iid)}
                        className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                      >
                        {getIpById(iid).name} IP <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
