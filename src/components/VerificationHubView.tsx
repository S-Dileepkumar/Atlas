import React, { useMemo, useState } from 'react';
import { ShieldCheck, Terminal, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ALL_IPS, getProjectById } from '../data/ips';
import { IpVerificationInfo } from '../types/ipUniverse';

interface VerificationHubViewProps {
  onSelectIp: (ipId: string) => void;
}

const MATURITIES: Array<'ALL' | IpVerificationInfo['maturity']> = [
  'ALL',
  'Full Signoff UVM + Formal',
  'UVM / Co-Simulation',
  'Self-Checking RTL / Verilator',
  'Basic Directed / Research',
];

export const VerificationHubView: React.FC<VerificationHubViewProps> = ({ onSelectIp }) => {
  const [maturity, setMaturity] = useState<'ALL' | IpVerificationInfo['maturity']>('ALL');
  const [query, setQuery] = useState('');

  const filteredIps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_IPS.filter((ip) => {
      if (maturity !== 'ALL' && ip.verification.maturity !== maturity) return false;
      if (!q) return true;
      return (
        ip.name.toLowerCase().includes(q) ||
        ip.verification.existingInfra.framework.toLowerCase().includes(q) ||
        ip.verification.existingInfra.testbenchPath.toLowerCase().includes(q) ||
        ip.verification.existingInfra.agentsAndComponents.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [maturity, query]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
            Design Verification Intelligence
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
            IP Verification Hub
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Audit real upstream UVM testbenches (`core_ibex`, OpenTitan `dvsim`, `core-v-verif`), Verilator co-simulation (`rtlsim`), cocotb suites, formal SVA assertions, and exact simulator execution commands.
          </p>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by IP, UVM, Verilator, cocotb, Spike..."
          className="px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-72 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Maturity Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {MATURITIES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMaturity(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              maturity === m
                ? 'bg-cyan-600 text-white'
                : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {m === 'ALL' ? `All Frameworks (${ALL_IPS.length})` : m}
          </button>
        ))}
      </div>

      {/* Verification Cards */}
      <div className="space-y-4">
        {filteredIps.map((ip) => {
          const proj = getProjectById(ip.projectId);
          const v = ip.verification;
          return (
            <div
              key={ip.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {proj.name} · {v.maturity}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    {ip.name}
                  </h2>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Framework: <strong>{v.existingInfra.framework}</strong> · Path:{' '}
                    <span className="font-mono text-cyan-700 dark:text-cyan-400">{v.existingInfra.testbenchPath}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectIp(ip.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Open IP Verification Tab <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Existing Agents & Components</div>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                    {v.existingInfra.agentsAndComponents.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Assertions, Formal & Tests</div>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc pl-4">
                    {v.existingInfra.assertionsAndFormal.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                    {v.existingInfra.coverageAndTests.slice(0, 2).map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    Upstream Simulation Commands
                  </div>
                  {v.simCommands.map((cmd) => (
                    <div key={cmd.command} className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{cmd.tool}</div>
                      <pre className="font-mono text-[11px] text-cyan-700 dark:text-cyan-300 overflow-x-auto whitespace-pre-wrap break-all">
                        {cmd.command}
                      </pre>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Note: {v.simLimitations}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
