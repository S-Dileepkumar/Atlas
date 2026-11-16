import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { ALL_PROTOCOLS } from '../data/protocols';
import { ALL_IPS } from '../data/ips';
import { ALL_SOCS } from '../data/socs';
import { GLOSSARY_TERMS } from '../data/glossary';
import { AES_CURRICULUM } from '../data/aesCurriculum';

interface SearchResultItem {
  kind: 'protocol' | 'ip' | 'soc' | 'glossary' | 'aes';
  targetId: string;
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
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProtocol,
  onSelectIp,
  onSelectSoc,
  onSelectGlossary,
  onSelectAesSubtopic,
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
          contextLabel: p.standardBody,
          matchType: 'Protocol',
          title: `${p.name} — ${p.fullName}`,
          snippet: p.tagline,
        })),
      ];
    }

    const out: SearchResultItem[] = [];

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
      if (
        p.name.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.overview.definition.toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'protocol',
          targetId: p.id,
          contextLabel: p.name,
          matchType: 'Protocol',
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

    return out.slice(0, 24);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (r: SearchResultItem) => {
    if (r.kind === 'protocol') onSelectProtocol(r.targetId);
    else if (r.kind === 'ip') onSelectIp(r.targetId);
    else if (r.kind === 'soc') onSelectSoc();
    else if (r.kind === 'aes') onSelectAesSubtopic?.(r.targetId);
    else onSelectGlossary();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search IPs (Ibex, Vortex, Gemmini), RTL modules, protocols, signals (AWVALID), SoCs, or glossary..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching IPs, RTL modules, protocols, signals, or glossary terms found for "{query}".
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.targetId}-${i}`}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-4 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-[11px] text-cyan-700 dark:text-cyan-400 font-medium">
                    {r.matchType} · {r.contextLabel}
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {r.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {r.snippet}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
