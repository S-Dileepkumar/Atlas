import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { ALL_PROTOCOLS } from '../data/protocols';
import { ALL_IPS } from '../data/ips';
import { ALL_SOCS } from '../data/socs';
import { GLOSSARY_TERMS } from '../data/glossary';
import { AES_CURRICULUM } from '../data/aesCurriculum';
import { CurriculumPillarId, RTL_SV_UVM_CURRICULUM } from '../data/rtlSvUvmCurriculum';
import {
  getEntityClassification,
  getEntityRelationships,
  getLifecycleStatus,
} from '../utils/entityTaxonomy';

interface SearchResultItem {
  kind: 'protocol' | 'ip' | 'soc' | 'glossary' | 'aes' | 'curriculum' | 'guide';
  targetId: string;
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
  onSelectCurriculum?: (pillar: CurriculumPillarId, moduleId: string) => void;
  onSelectGuide?: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProtocol,
  onSelectIp,
  onSelectSoc,
  onSelectGlossary,
  onSelectAesSubtopic,
  onSelectCurriculum,
  onSelectGuide,
}) => {
  const [query, setQuery] = useState('');

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
          kind: 'guide' as const,
          targetId: 'platform-guide',
          contextLabel: 'Navigation Map & Playbooks',
          matchType: 'Platform Guide',
          title: 'How to Use What & Where to Find Everything',
          snippet: 'Interactive roadmap across 498 protocols, 42 RTL/SV/UVM modules, 37 silicon IPs, Explainers & Knowledge Graph',
        },
        ...ALL_IPS.slice(0, 4).map((ip) => ({
          kind: 'ip' as const,
          targetId: ip.id,
          contextLabel: ip.category,
          matchType: 'Open-Source IP',
          title: `${ip.name} (${ip.rtlLanguage})`,
          snippet: ip.tagline,
        })),
        ...ALL_PROTOCOLS.slice(0, 4).map((p) => ({
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

    return out.slice(0, 28);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (r: SearchResultItem) => {
    if (r.kind === 'guide') onSelectGuide?.();
    else if (r.kind === 'protocol') onSelectProtocol(r.targetId);
    else if (r.kind === 'ip') onSelectIp(r.targetId);
    else if (r.kind === 'soc') onSelectSoc();
    else if (r.kind === 'aes') onSelectAesSubtopic?.(r.targetId);
    else if (r.kind === 'curriculum' && r.pillar) onSelectCurriculum?.(r.pillar, r.targetId);
    else onSelectGlossary();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border-subtle)]">
          <Search className="w-4 h-4 text-[var(--sem-control)] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search IPs (Ibex, Vortex, Gemmini), RTL modules, protocols, signals (AWVALID), SoCs, or glossary..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[440px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
              No matching IPs, RTL modules, protocols, signals, or glossary terms found for "{query}".
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.targetId}-${i}`}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full px-5 py-3.5 text-left hover:bg-[var(--bg-elevated)] flex items-center justify-between gap-4 transition-colors cursor-pointer"
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};
