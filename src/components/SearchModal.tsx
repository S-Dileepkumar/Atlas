import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { ALL_PROTOCOLS } from '../data/protocols';
import { ALL_IPS } from '../data/ips';
import { ALL_SOCS } from '../data/socs';
import { GLOSSARY_TERMS } from '../data/glossary';
import { AES_CURRICULUM } from '../data/aesCurriculum';
import { CRYPTO_CURRICULUM } from '../crypto/cryptoCurriculum';
import { CurriculumPillarId, RTL_SV_UVM_CURRICULUM } from '../data/rtlSvUvmCurriculum';
import {
  getEntityClassification,
  getEntityRelationships,
  getLifecycleStatus,
} from '../utils/entityTaxonomy';

interface SearchResultItem {
  kind: 'protocol' | 'ip' | 'soc' | 'glossary' | 'aes' | 'crypto' | 'curriculum' | 'guide' | 'mind-map';
  targetId: string;
  chapterId?: string;
  pillar?: CurriculumPillarId;
  contextLabel: string;
  matchType: string;
  title: string;
  snippet: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProtocol: (protocolId: string) => void;
  onSelectIp: (ipId: string) => void;
  onSelectSoc: () => void;
  onSelectGlossary: () => void;
  onSelectAesSubtopic?: (subtopicId: string) => void;
  onSelectCryptoSubtopic?: (chapterId: string, subtopicId?: string) => void;
  onSelectCurriculum?: (pillar: CurriculumPillarId, moduleId: string) => void;
  onSelectGuide?: () => void;
  onSelectMindMap?: () => void;
}

type SearchFilterScope = 'all' | 'pqc-math' | 'protocols' | 'hardware-ip' | 'attacks' | 'rtl-uvm' | 'glossary';

const SEARCH_FILTER_TABS: Array<{ id: SearchFilterScope; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pqc-math', label: 'Math & PQC' },
  { id: 'protocols', label: 'Protocols' },
  { id: 'hardware-ip', label: 'Hardware / IP' },
  { id: 'attacks', label: 'Attacks' },
  { id: 'rtl-uvm', label: 'RTL / SV / UVM' },
  { id: 'glossary', label: 'Glossary' },
];

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProtocol,
  onSelectIp,
  onSelectSoc,
  onSelectGlossary,
  onSelectAesSubtopic,
  onSelectCryptoSubtopic,
  onSelectCurriculum,
  onSelectGuide,
  onSelectMindMap,
}) => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchFilterScope>('all');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [
        {
          kind: 'crypto' as const,
          targetId: 'pqc-ml-kem',
          chapterId: 'ch8-pqc',
          contextLabel: 'Ch 08 · NIST FIPS 203 + Area Estimator',
          matchType: 'Quick Jump',
          title: 'ML-KEM (Kyber) & Lattice NTT Accelerator',
          snippet: 'Inspect Module-LWE polynomial math, Z_3329 butterfly pipeline, and ASIC area/cycle tradeoffs',
        },
        {
          kind: 'crypto' as const,
          targetId: 'atk-sca',
          chapterId: 'ch7-attacks',
          contextLabel: 'Ch 07 · Power, EM & Masking Lab',
          matchType: 'Quick Jump',
          title: 'Side-Channel & Fault Reverse Engineering Lab',
          snippet: 'Simulate SPA/DPA/CPA Hamming-weight leakage and 1st-order DOM masking attenuation',
        },
        {
          kind: 'mind-map' as const,
          targetId: 'mind-map',
          contextLabel: 'All Sections · Common · Merged',
          matchType: 'Mind Map',
          title: 'Complete VLSI Atlas Mind Map (Sections, Common & Merged)',
          snippet: 'Interactive architecture mind map connecting all 6 sections, 24 sub-branches, and 8 common cross-cutting bridges',
        },
        {
          kind: 'guide' as const,
          targetId: 'platform-guide',
          contextLabel: 'Navigation Map & Playbooks',
          matchType: 'Platform Guide',
          title: 'How to Use What & Where to Find Everything',
          snippet: 'Interactive roadmap across 498 protocols, 42 RTL/SV/UVM modules, 37 silicon IPs, Explainers & Knowledge Graph',
        },
        ...ALL_IPS.slice(0, 3).map((ip) => ({
          kind: 'ip' as const,
          targetId: ip.id,
          contextLabel: ip.category,
          matchType: 'Open-Source IP',
          title: `${ip.name} (${ip.rtlLanguage})`,
          snippet: ip.tagline,
        })),
        ...ALL_PROTOCOLS.slice(0, 3).map((p) => ({
          kind: 'protocol' as const,
          targetId: p.id,
          contextLabel: `${p.standardBody} · ${getLifecycleStatus(p)}`,
          matchType: getEntityClassification(p),
          title: `${p.name} — ${p.fullName}`,
          snippet: p.tagline,
        })),
      ];
    }

    const out: SearchResultItem[] = [];

    if (
      'mind map all sections common merged bridges architecture tree overview'.includes(q) ||
      q.includes('mind') ||
      q.includes('merged') ||
      q.includes('common') ||
      q.includes('section')
    ) {
      out.push({
        kind: 'mind-map',
        targetId: 'mind-map',
        contextLabel: 'All Sections · Common · Merged',
        matchType: 'Mind Map',
        title: 'Complete VLSI Atlas Mind Map (Sections, Common & Merged)',
        snippet: 'Interactive CAD mind map combining all 6 sections, 24 sub-branches, and 8 common cross-cutting bridges',
      });
    }

    if (
      'how to use what where to find everything platform guide help navigation roadmap shortcuts workflows'.includes(q) ||
      q.includes('guide') ||
      q.includes('how to') ||
      q.includes('where to') ||
      q.includes('shortcut')
    ) {
      out.push({
        kind: 'guide',
        targetId: 'platform-guide',
        contextLabel: 'Navigation Map & Playbooks',
        matchType: 'Platform Guide',
        title: 'How to Use What & Where to Find Everything',
        snippet: 'Complete walkthrough of every workbench, keyboard shortcut, role workflow, and cross-linked database',
      });
    }

    for (const ip of ALL_IPS) {
      if (
        ip.name.toLowerCase().includes(q) ||
        ip.tagline.toLowerCase().includes(q) ||
        ip.category.toLowerCase().includes(q) ||
        ip.projectId.toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'ip',
          targetId: ip.id,
          contextLabel: `${ip.category} · ${ip.rtlLanguage}`,
          matchType: 'Open-Source IP',
          title: ip.name,
          snippet: ip.tagline,
        });
      }
      for (const mod of ip.modules) {
        if (mod.name.toLowerCase().includes(q) || mod.filePath.toLowerCase().includes(q)) {
          out.push({
            kind: 'ip',
            targetId: ip.id,
            contextLabel: ip.name,
            matchType: 'RTL Module',
            title: `${mod.name} (${mod.filePath})`,
            snippet: mod.summary,
          });
        }
      }
    }

    for (const soc of ALL_SOCS) {
      if (soc.name.toLowerCase().includes(q) || soc.summary.toLowerCase().includes(q)) {
        out.push({
          kind: 'soc',
          targetId: soc.id,
          contextLabel: soc.license,
          matchType: 'SoC Platform',
          title: soc.name,
          snippet: soc.targetUse,
        });
      }
    }

    for (const g of GLOSSARY_TERMS) {
      if (
        g.term.toLowerCase().includes(q) ||
        (g.acronym && g.acronym.toLowerCase().includes(q)) ||
        g.definition.toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'glossary',
          targetId: g.id,
          contextLabel: g.category,
          matchType: 'Glossary',
          title: g.term,
          snippet: g.definition,
        });
      }
    }

    for (const p of ALL_PROTOCOLS) {
      const entityCls = getEntityClassification(p);
      const lifecycle = getLifecycleStatus(p);
      const relText = getEntityRelationships(p).join(' ');
      if (
        p.name.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.overview.definition.toLowerCase().includes(q) ||
        entityCls.toLowerCase().includes(q) ||
        lifecycle.toLowerCase().includes(q) ||
        relText.toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'protocol',
          targetId: p.id,
          contextLabel: `${p.standardBody} · ${lifecycle}`,
          matchType: entityCls,
          title: `${p.name} — ${p.fullName}`,
          snippet: p.tagline,
        });
      }

      for (const s of p.signals) {
        if (s.name.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)) {
          out.push({
            kind: 'protocol',
            targetId: p.id,
            contextLabel: p.name,
            matchType: 'Signal',
            title: `${s.name} (${p.name} · ${s.channel})`,
            snippet: s.summary,
          });
        }
      }

      for (const sp of p.specifications) {
        if (sp.parameter.toLowerCase().includes(q) || sp.value.toLowerCase().includes(q)) {
          out.push({
            kind: 'protocol',
            targetId: p.id,
            contextLabel: p.name,
            matchType: 'Specification',
            title: `${sp.parameter}: ${sp.value}`,
            snippet: `${p.name} · ${sp.notes}`,
          });
        }
      }
    }

    for (const ch of AES_CURRICULUM) {
      for (const sub of ch.subtopics) {
        if (
          sub.title.toLowerCase().includes(q) ||
          ch.title.toLowerCase().includes(q) ||
          sub.level1Fundamental.summary.toLowerCase().includes(q) ||
          sub.level2Engineering.architectureAndSpec.toLowerCase().includes(q) ||
          'aes'.includes(q)
        ) {
          out.push({
            kind: 'aes',
            targetId: sub.id,
            contextLabel: `${ch.number}. ${ch.title}`,
            matchType: 'AES Deep Dive',
            title: `AES: ${sub.title}`,
            snippet: sub.level1Fundamental.summary,
          });
        }
      }
    }

    for (const mod of RTL_SV_UVM_CURRICULUM) {
      const pillarLabel =
        mod.pillar === 'rtl-design'
          ? 'RTL Design'
          : mod.pillar === 'systemverilog'
          ? 'SystemVerilog'
          : 'UVM';
      if (
        mod.title.toLowerCase().includes(q) ||
        mod.chapter.toLowerCase().includes(q) ||
        mod.summary.toLowerCase().includes(q) ||
        mod.deepTheory.toLowerCase().includes(q) ||
        pillarLabel.toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'curriculum',
          targetId: mod.id,
          pillar: mod.pillar,
          contextLabel: `${pillarLabel} · ${mod.chapter}`,
          matchType: mod.scopeBadge,
          title: `${mod.number} ${mod.title}`,
          snippet: mod.summary,
        });
      }
    }

    for (const ch of CRYPTO_CURRICULUM) {
      if (
        ch.title.toLowerCase().includes(q) ||
        ch.vlsiPerspective.toLowerCase().includes(q) ||
        'pqc crypto cryptography post-quantum'.includes(q)
      ) {
        out.push({
          kind: 'crypto',
          targetId: ch.id,
          chapterId: ch.id,
          contextLabel: ch.stackLayerLabel,
          matchType: 'Crypto & PQC Stack',
          title: `${ch.number}. ${ch.title}`,
          snippet: ch.keyTakeaway,
        });
      }
      for (const sub of ch.subtopics) {
        if (
          sub.title.toLowerCase().includes(q) ||
          sub.summary.toLowerCase().includes(q) ||
          sub.mechanics.toLowerCase().includes(q) ||
          sub.siliconAndRtlLink.toLowerCase().includes(q) ||
          sub.attackAndDefense.toLowerCase().includes(q)
        ) {
          out.push({
            kind: 'crypto',
            targetId: sub.id,
            chapterId: ch.id,
            contextLabel: `Ch ${ch.number}. ${ch.title}`,
            matchType: 'Crypto & PQC Topic',
            title: sub.title,
            snippet: sub.summary,
          });
        }
      }
    }

    return out.slice(0, 28);
  }, [query]);

  const filteredResults = useMemo(() => {
    const base = results;
    if (scope === 'all') return base;
    return base.filter((r) => {
      if (scope === 'pqc-math') {
        return r.kind === 'crypto' || r.kind === 'aes';
      }
      if (scope === 'protocols') {
        return r.kind === 'protocol';
      }
      if (scope === 'hardware-ip') {
        return r.kind === 'ip' || r.kind === 'soc';
      }
      if (scope === 'attacks') {
        const txt = `${r.title} ${r.snippet} ${r.contextLabel}`.toLowerCase();
        return (
          r.kind === 'crypto' &&
          (r.chapterId === 'ch7-attacks' ||
            txt.includes('attack') ||
            txt.includes('side-channel') ||
            txt.includes('fault') ||
            txt.includes('mask') ||
            txt.includes('oracle'))
        ) || r.kind === 'aes';
      }
      if (scope === 'rtl-uvm') {
        return r.kind === 'curriculum';
      }
      if (scope === 'glossary') {
        return r.kind === 'glossary';
      }
      return true;
    });
  }, [results, scope]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, scope, isOpen]);

  if (!isOpen) return null;

  const handleSelect = (r: SearchResultItem) => {
    if (r.kind === 'mind-map') onSelectMindMap?.();
    else if (r.kind === 'guide') onSelectGuide?.();
    else if (r.kind === 'protocol') onSelectProtocol(r.targetId);
    else if (r.kind === 'ip') onSelectIp(r.targetId);
    else if (r.kind === 'soc') onSelectSoc();
    else if (r.kind === 'aes') onSelectAesSubtopic?.(r.targetId);
    else if (r.kind === 'crypto') {
      onSelectCryptoSubtopic?.(
        r.chapterId || r.targetId,
        r.chapterId && r.targetId !== r.chapterId ? r.targetId : undefined
      );
    }
    else if (r.kind === 'curriculum' && r.pillar) onSelectCurriculum?.(r.pillar, r.targetId);
    else onSelectGlossary();
    onClose();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filteredResults.length ? (prev + 1) % filteredResults.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredResults.length ? (prev - 1 + filteredResults.length) % filteredResults.length : 0
      );
    } else if (e.key === 'Enter' && filteredResults[activeIndex]) {
      e.preventDefault();
      handleSelect(filteredResults[activeIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border-subtle)]">
          <Search className="w-4 h-4 text-[var(--sem-control)] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search ML-KEM, NTT, Ibex, AXI4, DPA/CPA, RTL modules, or glossary..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
            ↑↓ · Enter · ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope Filter Tabs */}
        <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-center gap-1 overflow-x-auto text-[11px]">
          {SEARCH_FILTER_TABS.map((tab) => {
            const active = scope === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={`px-2.5 py-1 rounded font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--sem-control)] text-white dark:text-slate-950 font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)] space-y-2">
              <div>No matching results in this category{query ? ` for "${query}"` : ''}.</div>
              {scope !== 'all' && (
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className="text-[var(--sem-control)] hover:underline cursor-pointer font-medium"
                >
                  Show All Categories
                </button>
              )}
            </div>
          ) : (
            filteredResults.map((r, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={`${r.kind}-${r.targetId}-${i}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handleSelect(r)}
                  className={`w-full px-5 py-3.5 text-left flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                    isActive ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] text-[var(--sem-control)] font-medium font-mono">
                      {r.matchType} · {r.contextLabel}
                    </div>
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                      {r.title}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                      {r.snippet}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
