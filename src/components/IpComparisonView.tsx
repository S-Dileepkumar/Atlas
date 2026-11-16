import React, { useMemo, useState } from 'react';
import { GitCompare, ArrowRight } from 'lucide-react';
import { ALL_IPS, getIpById, getProjectById } from '../data/ips';

interface IpComparisonViewProps {
  initialIpA?: string;
  onSelectIp: (ipId: string) => void;
  onSelectProtocol: (protoId: string) => void;
}

const PRESETS: Array<{ label: string; a: string; b: string }> = [
  { label: 'Ibex vs CVA6', a: 'ibex', b: 'cva6' },
  { label: 'Ibex vs PicoRV32', a: 'ibex', b: 'picorv32' },
  { label: 'Rocket Chip vs SonicBOOM', a: 'rocket-chip', b: 'boom' },
  { label: 'CVA6 vs Rocket Chip', a: 'cva6', b: 'rocket-chip' },
  { label: 'Vortex GPGPU vs MIAOW GPU', a: 'vortex-gpu', b: 'miaow-gpu' },
  { label: 'Vortex GPGPU vs Nyuzi', a: 'vortex-gpu', b: 'nyuzi' },
  { label: 'Gemmini vs NVIDIA NVDLA', a: 'gemmini', b: 'nvdla' },
  { label: 'PULP AXI vs Verilog-AXI', a: 'pulp-axi', b: 'verilog-axi' },
  { label: 'OpenTitan AES vs OTBN', a: 'opentitan-aes', b: 'opentitan-otbn' },
];

export const IpComparisonView: React.FC<IpComparisonViewProps> = ({
  initialIpA,
  onSelectIp,
  onSelectProtocol,
}) => {
  const [ipAId, setIpAId] = useState<string>(initialIpA || 'ibex');
  const [ipBId, setIpBId] = useState<string>(initialIpA === 'cva6' ? 'rocket-chip' : 'cva6');

  const ipA = useMemo(() => getIpById(ipAId), [ipAId]);
  const ipB = useMemo(() => getIpById(ipBId), [ipBId]);
  const projA = getProjectById(ipA.projectId);
  const projB = getProjectById(ipB.projectId);

  const rows: Array<{ dimension: string; aVal: string; bVal: string }> = [
    { dimension: 'Upstream Project', aVal: `${projA.name} (${projA.organization})`, bVal: `${projB.name} (${projB.organization})` },
    { dimension: 'IP Category', aVal: ipA.category, bVal: ipB.category },
    { dimension: 'Implementation Kind', aVal: ipA.implementationKind, bVal: ipB.implementationKind },
    { dimension: 'RTL / Generator Language', aVal: ipA.rtlLanguage, bVal: ipB.rtlLanguage },
    { dimension: 'Development Status', aVal: ipA.developmentStatus, bVal: ipB.developmentStatus },
    { dimension: 'License', aVal: ipA.license, bVal: ipB.license },
    { dimension: 'External Bus Protocols', aVal: ipA.interfaces.map((i) => i.protocolLabel).join(', '), bVal: ipB.interfaces.map((i) => i.protocolLabel).join(', ') },
    { dimension: 'Indexed RTL Modules', aVal: `${ipA.modules.length} modules (${ipA.modules.map((m) => m.name).slice(0, 4).join(', ')})`, bVal: `${ipB.modules.length} modules (${ipB.modules.map((m) => m.name).slice(0, 4).join(', ')})` },
    { dimension: 'Verification Maturity', aVal: `${ipA.verification.maturity} — ${ipA.verification.existingInfra.framework}`, bVal: `${ipB.verification.maturity} — ${ipB.verification.existingInfra.framework}` },
    { dimension: 'Memory & Cache Architecture', aVal: ipA.implementation.memoryRequirements, bVal: ipB.implementation.memoryRequirements },
    { dimension: 'Clocking & Reset', aVal: ipA.implementation.clockingArchitecture, bVal: ipB.implementation.clockingArchitecture },
    { dimension: 'FPGA Support', aVal: ipA.implementation.fpgaSupport, bVal: ipB.implementation.fpgaSupport },
    { dimension: 'ASIC & Timing Notes', aVal: ipA.implementation.asicConsiderations, bVal: ipB.implementation.asicConsiderations },
    { dimension: 'Known Limitations', aVal: ipA.functional.limitations.join(' '), bVal: ipB.functional.limitations.join(' ') },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
          Architectural & Verification Tradeoff Engine
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
          Open-Source IP Comparison Matrix
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Compare any two open-source semiconductor IPs across microarchitecture, bus protocols, verification maturity, FPGA/ASIC readiness, and license—grounded strictly in source facts without fabricated PPA estimates.
        </p>
      </div>

      {/* Curated Engineering Presets */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Curated Engineering Comparisons</div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const active = ipAId === p.a && ipBId === p.b;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setIpAId(p.a);
                  setIpBId(p.b);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  active
                    ? 'bg-cyan-600 text-white'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom IP Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
        <div className="md:col-span-5 space-y-1">
          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">IP Candidate A</label>
          <select
            value={ipAId}
            onChange={(e) => setIpAId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          >
            {ALL_IPS.map((ip) => (
              <option key={ip.id} value={ip.id}>
                {ip.name} ({ip.category})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1 flex justify-center">
          <GitCompare className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>

        <div className="md:col-span-5 space-y-1">
          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">IP Candidate B</label>
          <select
            value={ipBId}
            onChange={(e) => setIpBId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          >
            {ALL_IPS.map((ip) => (
              <option key={ip.id} value={ip.id}>
                {ip.name} ({ip.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-48">Dimension</th>
              <th className="px-4 py-3 font-bold text-slate-900 dark:text-cyan-300">
                <button type="button" onClick={() => onSelectIp(ipA.id)} className="hover:underline cursor-pointer inline-flex items-center gap-1">
                  {ipA.name} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </th>
              <th className="px-4 py-3 font-bold text-slate-900 dark:text-blue-300">
                <button type="button" onClick={() => onSelectIp(ipB.id)} className="hover:underline cursor-pointer inline-flex items-center gap-1">
                  {ipB.name} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => (
              <tr key={r.dimension}>
                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 align-top">{r.dimension}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 leading-relaxed align-top">{r.aVal}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 leading-relaxed align-top">{r.bVal}</td>
              </tr>
            ))}
            <tr>
              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 align-top">Protocol Spec Links</td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap gap-2">
                  {ipA.interfaces.map((iface) => (
                    <button
                      key={iface.name}
                      type="button"
                      onClick={() => onSelectProtocol(iface.protocolId)}
                      className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      {iface.protocolLabel} →
                    </button>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap gap-2">
                  {ipB.interfaces.map((iface) => (
                    <button
                      key={iface.name}
                      type="button"
                      onClick={() => onSelectProtocol(iface.protocolId)}
                      className="font-mono text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {iface.protocolLabel} →
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
