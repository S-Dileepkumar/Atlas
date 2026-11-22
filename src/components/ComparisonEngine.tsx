import React, { useMemo, useState } from 'react';
import { PROTOCOL_COMPARISONS } from '../data/comparisons';
import { ALL_PROTOCOLS, getProtocolById } from '../data/protocols';

interface ComparisonEngineProps {
  initialProtoA?: string;
  onSelectProtocol: (id: string) => void;
}

export const ComparisonEngine: React.FC<ComparisonEngineProps> = ({ initialProtoA, onSelectProtocol }) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PROTOCOL_COMPARISONS[0].id);
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [protoAId, setProtoAId] = useState<string>(initialProtoA || 'axi4');
  const [protoBId, setProtoBId] = useState<string>(initialProtoA === 'axi4-lite' ? 'apb' : 'axi4-lite');

  React.useEffect(() => {
    if (initialProtoA) {
      const match = PROTOCOL_COMPARISONS.find(
        (c) => c.protocolA === initialProtoA || c.protocolB === initialProtoA
      );
      if (match) {
        setSelectedPresetId(match.id);
        setCustomMode(false);
      } else {
        setProtoAId(initialProtoA);
        setCustomMode(true);
      }
    }
  }, [initialProtoA]);

  const activePreset = PROTOCOL_COMPARISONS.find((c) => c.id === selectedPresetId) || PROTOCOL_COMPARISONS[0];
  const docA = useMemo(() => getProtocolById(customMode ? protoAId : activePreset.protocolA), [customMode, protoAId, activePreset]);
  const docB = useMemo(() => getProtocolById(customMode ? protoBId : activePreset.protocolB), [customMode, protoBId, activePreset]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Protocol Comparison Engine
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Evaluate architectural trade-offs, signal overhead, burst capabilities, and verification complexity side by side.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs">
          <button
            type="button"
            onClick={() => setCustomMode(false)}
            className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
              !customMode ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Curated Benchmarks
          </button>
          <button
            type="button"
            onClick={() => setCustomMode(true)}
            className={`px-3 py-1.5 rounded-md font-medium cursor-pointer ${
              customMode ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Custom Side-by-Side
          </button>
        </div>
      </div>

      {!customMode ? (
        <>
          <div className="flex flex-wrap gap-2">
            {PROTOCOL_COMPARISONS.map((cmp) => (
              <button
                key={cmp.id}
                type="button"
                onClick={() => setSelectedPresetId(cmp.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                  cmp.id === activePreset.id
                    ? 'bg-cyan-600 border-cyan-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cmp.title}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{activePreset.title}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{activePreset.summary}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold">Dimension</th>
                    <th className="py-3 px-4 font-semibold text-cyan-700 dark:text-cyan-400">{docA.name}</th>
                    <th className="py-3 px-4 font-semibold text-blue-700 dark:text-blue-400">{docB.name}</th>
                    <th className="py-3 px-4 font-semibold">Engineering Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {activePreset.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{r.dimension}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-200">{r.valueA}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-200">{r.valueB}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.engineeringImpact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Protocol A</label>
              <select
                value={protoAId}
                onChange={(e) => setProtoAId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {ALL_PROTOCOLS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.fullName}</option>
                ))}
              </select>
            </div>
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Protocol B</label>
              <select
                value={protoBId}
                onChange={(e) => setProtoBId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                {ALL_PROTOCOLS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Attribute</th>
                  <th className="py-3 px-4 font-semibold text-cyan-700 dark:text-cyan-400">{docA.name}</th>
                  <th className="py-3 px-4 font-semibold text-blue-700 dark:text-blue-400">{docB.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-4 font-medium">Standard Authority</td>
                  <td className="py-3 px-4">{docA.standardBody} · {docA.specVersion}</td>
                  <td className="py-3 px-4">{docB.standardBody} · {docB.specVersion}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Architecture Summary</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{docA.architecture.summary}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{docB.architecture.summary}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Control / Handshake</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{docA.architecture.controlFlow}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{docB.architecture.controlFlow}</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Documented Channels / Signals</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{docA.channels.length} channels · {docA.signals.length} signals</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{docB.channels.length} channels · {docB.signals.length} signals</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Primary Advantages</td>
                  <td className="py-3 px-4"><ul className="list-disc pl-4 space-y-1">{docA.overview.advantages.map((a, i) => <li key={i}>{a}</li>)}</ul></td>
                  <td className="py-3 px-4"><ul className="list-disc pl-4 space-y-1">{docB.overview.advantages.map((a, i) => <li key={i}>{a}</li>)}</ul></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">Limitations</td>
                  <td className="py-3 px-4"><ul className="list-disc pl-4 space-y-1">{docA.overview.limitations.map((a, i) => <li key={i}>{a}</li>)}</ul></td>
                  <td className="py-3 px-4"><ul className="list-disc pl-4 space-y-1">{docB.overview.limitations.map((a, i) => <li key={i}>{a}</li>)}</ul></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Jump Footer */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-[var(--text-secondary)]">Open full reference:</span>
        <button
          type="button"
          onClick={() => onSelectProtocol(docA.id)}
          className="text-[var(--sem-control)] font-medium hover:underline cursor-pointer"
        >
          {docA.name} Documentation →
        </button>
        <span className="text-[var(--text-secondary)]" aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() => onSelectProtocol(docB.id)}
          className="text-[var(--sem-high)] font-medium hover:underline cursor-pointer"
        >
          {docB.name} Documentation →
        </button>
      </div>
    </div>
  );
};
