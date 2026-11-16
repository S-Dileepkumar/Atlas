import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { WaveformViewer } from './WaveformViewer';
import { WaveformScenario } from '../types/protocol';

type CheckerProtocol = 'axi4' | 'axi4-stream' | 'apb';

interface TraceCycle {
  cycle: number;
  [key: string]: number | string;
}

interface CheckResult {
  passed: boolean;
  findings: Array<{ cycle: number; rule: string; detail: string; severity: 'error' | 'warn' }>;
  waveform: WaveformScenario;
}

const PRESETS: Record<string, { protocol: CheckerProtocol; label: string; trace: TraceCycle[] }> = {
  'axi4-valid': {
    protocol: 'axi4',
    label: 'Valid AXI4 2-Beat Write Burst',
    trace: [
      { cycle: 0, AWVALID: 0, AWREADY: 1, AWADDR: '0000', AWLEN: 1, AWSIZE: 2, WVALID: 0, WREADY: 1, WDATA: '00', WLAST: 0, BVALID: 0, BREADY: 1 },
      { cycle: 1, AWVALID: 1, AWREADY: 0, AWADDR: '1000', AWLEN: 1, AWSIZE: 2, WVALID: 0, WREADY: 1, WDATA: '00', WLAST: 0, BVALID: 0, BREADY: 1 },
      { cycle: 2, AWVALID: 1, AWREADY: 1, AWADDR: '1000', AWLEN: 1, AWSIZE: 2, WVALID: 0, WREADY: 1, WDATA: '00', WLAST: 0, BVALID: 0, BREADY: 1 },
      { cycle: 3, AWVALID: 0, AWREADY: 1, AWADDR: '0000', AWLEN: 0, AWSIZE: 2, WVALID: 1, WREADY: 1, WDATA: 'A1', WLAST: 0, BVALID: 0, BREADY: 1 },
      { cycle: 4, AWVALID: 0, AWREADY: 1, AWADDR: '0000', AWLEN: 0, AWSIZE: 2, WVALID: 1, WREADY: 1, WDATA: 'B2', WLAST: 1, BVALID: 0, BREADY: 1 },
      { cycle: 5, AWVALID: 0, AWREADY: 1, AWADDR: '0000', AWLEN: 0, AWSIZE: 2, WVALID: 0, WREADY: 1, WDATA: '00', WLAST: 0, BVALID: 1, BREADY: 1 },
    ],
  },
  'axi4-4kb-err': {
    protocol: 'axi4',
    label: 'Buggy AXI4: 4KB Boundary Crossing + Payload Mutation',
    trace: [
      { cycle: 0, AWVALID: 0, AWREADY: 0, AWADDR: '0000', AWLEN: 0, AWSIZE: 2, WVALID: 0, WREADY: 1, WDATA: '00', WLAST: 0, BVALID: 0, BREADY: 1 },
      { cycle: 1, AWVALID: 1, AWREADY: 0, AWADDR: '0FFC', AWLEN: 3, AWSIZE: 2, WVALID: 0, WREADY: 1, WDATA: '00', WLAST: 0, BVALID: 0, BREADY: 1 },
      { cycle: 2, AWVALID: 1, AWREADY: 1, AWADDR: '0FF8', AWLEN: 3, AWSIZE: 2, WVALID: 0, WREADY: 1, WDATA: '00', WLAST: 0, BVALID: 0, BREADY: 1 },
      { cycle: 3, AWVALID: 0, AWREADY: 1, AWADDR: '0000', AWLEN: 0, AWSIZE: 2, WVALID: 1, WREADY: 1, WDATA: 'D0', WLAST: 1, BVALID: 1, BREADY: 1 },
    ],
  },
  'axis-tstrb-err': {
    protocol: 'axi4-stream',
    label: 'Buggy AXI4-Stream: Illegal TKEEP=0, TSTRB=1 & TVALID Drop',
    trace: [
      { cycle: 0, TVALID: 0, TREADY: 1, TDATA: '00', TKEEP: 'F', TSTRB: 'F', TLAST: 0 },
      { cycle: 1, TVALID: 1, TREADY: 0, TDATA: 'AA', TKEEP: '3', TSTRB: 'F', TLAST: 0 },
      { cycle: 2, TVALID: 0, TREADY: 1, TDATA: 'BB', TKEEP: 'F', TSTRB: 'F', TLAST: 1 },
    ],
  },
  'apb-setup-err': {
    protocol: 'apb',
    label: 'Buggy APB: Missing SETUP Phase & Premature PENABLE',
    trace: [
      { cycle: 0, PSEL: 0, PENABLE: 0, PREADY: 1, PADDR: '00' },
      { cycle: 1, PSEL: 1, PENABLE: 1, PREADY: 0, PADDR: '10' },
      { cycle: 2, PSEL: 1, PENABLE: 1, PREADY: 1, PADDR: '14' },
    ],
  },
};

function runComplianceCheck(proto: CheckerProtocol, rawJson: string): CheckResult | { parseError: string } {
  let rows: TraceCycle[];
  try {
    rows = JSON.parse(rawJson);
    if (!Array.isArray(rows) || rows.length === 0) {
      return { parseError: 'Trace must be a non-empty JSON array of cycle objects.' };
    }
  } catch (err) {
    return { parseError: err instanceof Error ? err.message : 'Invalid JSON trace.' };
  }

  const findings: CheckResult['findings'] = [];

  if (proto === 'axi4') {
    let expectedBeats = 0;
    let countedBeats = 0;
    let activeWrite = false;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const next = rows[i + 1];

      if (r.AWVALID === 1 && r.AWREADY === 0 && next) {
        if (next.AWVALID !== 1) {
          findings.push({ cycle: i + 1, rule: 'ARM IHI 0022E A3.2.1', detail: 'AWVALID dropped before AWREADY handshake completed.', severity: 'error' });
        }
        if (next.AWADDR !== r.AWADDR || next.AWLEN !== r.AWLEN) {
          findings.push({ cycle: i + 1, rule: 'ARM IHI 0022E A3.2.1', detail: `AWADDR/AWLEN mutated during AWREADY=0 stall (${r.AWADDR} -> ${next.AWADDR}).`, severity: 'error' });
        }
      }

      if (r.AWVALID === 1) {
        const addrNum = parseInt(String(r.AWADDR), 16) || 0;
        const len = Number(r.AWLEN || 0);
        const size = Number(r.AWSIZE ?? 2);
        const span = (len + 1) * (1 << size);
        if ((addrNum & 0xfff) + span > 4096) {
          findings.push({ cycle: i, rule: 'ARM IHI 0022E A3.4.1', detail: `4KB boundary crossed: 0x${r.AWADDR} + ${span}B exceeds 4KB page.`, severity: 'error' });
        }
      }

      if (r.AWVALID === 1 && r.AWREADY === 1) {
        expectedBeats = Number(r.AWLEN || 0) + 1;
        countedBeats = 0;
        activeWrite = true;
      }

      if (r.WVALID === 1 && r.WREADY === 1) {
        countedBeats++;
        if (r.WLAST === 1 && activeWrite && countedBeats !== expectedBeats) {
          findings.push({ cycle: i, rule: 'ARM IHI 0022E A3.4.1', detail: `WLAST asserted on beat ${countedBeats} but AWLEN specified ${expectedBeats} beats.`, severity: 'error' });
        }
      }

      if (r.BVALID === 1 && activeWrite && countedBeats < expectedBeats) {
        findings.push({ cycle: i, rule: 'ARM IHI 0022E A3.3.1', detail: 'BVALID asserted before all W beats (WLAST) completed.', severity: 'error' });
      }
    }
  } else if (proto === 'axi4-stream') {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const next = rows[i + 1];
      if (r.TVALID === 1 && r.TREADY === 0 && next) {
        if (next.TVALID !== 1) {
          findings.push({ cycle: i + 1, rule: 'ARM IHI 0051A §2.2.1', detail: 'TVALID dropped while TREADY=0.', severity: 'error' });
        }
        if (next.TDATA !== r.TDATA || next.TLAST !== r.TLAST) {
          findings.push({ cycle: i + 1, rule: 'ARM IHI 0051A §2.2.1', detail: 'TDATA/TLAST changed while TREADY=0.', severity: 'error' });
        }
      }
      if (r.TVALID === 1) {
        const keep = parseInt(String(r.TKEEP || 'F'), 16);
        const strb = parseInt(String(r.TSTRB || 'F'), 16);
        if ((strb & ~keep) !== 0) {
          findings.push({ cycle: i, rule: 'ARM IHI 0051A §2.4.3', detail: `Illegal TKEEP/TSTRB combination: TSTRB=0x${r.TSTRB} has bit=1 where TKEEP=0x${r.TKEEP} is 0.`, severity: 'error' });
        }
      }
    }
  } else if (proto === 'apb') {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const prev = rows[i - 1];
      const next = rows[i + 1];
      if (r.PENABLE === 1 && r.PSEL !== 1) {
        findings.push({ cycle: i, rule: 'ARM IHI 0024C §2.1', detail: 'PENABLE=1 while PSEL=0.', severity: 'error' });
      }
      if (r.PSEL === 1 && r.PENABLE === 1 && (!prev || prev.PSEL === 0)) {
        findings.push({ cycle: i, rule: 'ARM IHI 0024C §2.1', detail: 'Missing 1-cycle SETUP phase: PENABLE asserted immediately with PSEL.', severity: 'error' });
      }
      if (r.PSEL === 1 && r.PENABLE === 1 && r.PREADY === 0 && next && next.PADDR !== r.PADDR) {
        findings.push({ cycle: i + 1, rule: 'ARM IHI 0024C §2.1.1', detail: `PADDR mutated (${r.PADDR} -> ${next.PADDR}) during PREADY=0 wait state.`, severity: 'error' });
      }
    }
  }

  const keys = Object.keys(rows[0]).filter((k) => k !== 'cycle');
  const signals = keys.map((k) => ({
    name: k,
    type: (typeof rows[0][k] === 'number' && (k.includes('VALID') || k.includes('READY') || k.includes('LAST') || k.startsWith('PSEL') || k.startsWith('PENABLE')))
      ? ('bit' as const)
      : ('bus' as const),
    values: rows.map((r) => r[k] ?? '-'),
  }));

  const waveform: WaveformScenario = {
    id: 'checker-trace',
    name: `Analyzed ${proto.toUpperCase()} Trace (${rows.length} Cycles)`,
    category: findings.length > 0 ? 'Error' : 'Nominal',
    description: findings.length > 0 ? `${findings.length} compliance violations flagged.` : 'All specification checks passed.',
    cycles: rows.length,
    clockName: 'CLK',
    signals: [{ name: 'CLK', type: 'clock', values: rows.map((_, i) => i % 2) }, ...signals],
    annotations: findings.map((f) => ({ cycle: f.cycle, label: `${f.rule}: ${f.detail}`, severity: 'error' })),
  };

  return { passed: findings.length === 0, findings, waveform };
}

export const ComplianceChecker: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>('axi4-4kb-err');
  const [protocol, setProtocol] = useState<CheckerProtocol>('axi4');
  const [traceText, setTraceText] = useState<string>(() => JSON.stringify(PRESETS['axi4-4kb-err'].trace, null, 2));

  const loadPreset = (key: string) => {
    const p = PRESETS[key];
    setSelectedPreset(key);
    setProtocol(p.protocol);
    setTraceText(JSON.stringify(p.trace, null, 2));
  };

  const result = useMemo(() => runComplianceCheck(protocol, traceText), [protocol, traceText]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Protocol Compliance Checker
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Inspect cycle-by-cycle bus traces against formal ARM AMBA rules (VALID stability, 4KB boundaries, beat counts, TKEEP/TSTRB, APB SETUP/ACCESS phases).
        </p>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(PRESETS).map(([key, item]) => (
          <button
            key={key}
            type="button"
            onClick={() => loadPreset(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
              selectedPreset === key
                ? 'bg-cyan-600 border-cyan-600 text-white'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Trace JSON Editor */}
        <div className="lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Transaction Trace Input (JSON)
            </label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as CheckerProtocol)}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="axi4">AXI4 Ruleset</option>
              <option value="axi4-stream">AXI4-Stream Ruleset</option>
              <option value="apb">APB Ruleset</option>
            </select>
          </div>
          <textarea
            value={traceText}
            onChange={(e) => setTraceText(e.target.value)}
            rows={16}
            spellCheck={false}
            className="w-full p-3 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Play className="w-3 h-3 text-cyan-500" />
            Rule engine evaluates automatically as you edit cycles.
          </div>
        </div>

        {/* Right: Compliance Report & Waveform */}
        <div className="lg:col-span-7 space-y-4">
          {'parseError' in result ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
              JSON Parse Error: {result.parseError}
            </div>
          ) : (
            <>
              <div
                className={`rounded-lg border p-4 ${
                  result.passed
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-rose-500/40 bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {result.passed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-800 dark:text-emerald-300">
                        Zero Violations Found — Trace Complies with {protocol.toUpperCase()} Ruleset
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span className="text-rose-800 dark:text-rose-300">
                        {result.findings.length} Protocol Violation{result.findings.length > 1 ? 's' : ''} Detected
                      </span>
                    </>
                  )}
                </div>

                {result.findings.length > 0 && (
                  <ul className="mt-3 space-y-2 text-xs">
                    {result.findings.map((f, idx) => (
                      <li key={idx} className="p-2.5 rounded bg-white/80 dark:bg-slate-950/70 border border-rose-500/20">
                        <span className="font-mono font-semibold text-rose-700 dark:text-rose-400">
                          Cycle C{f.cycle} · {f.rule}:
                        </span>{' '}
                        <span className="text-slate-800 dark:text-slate-200">{f.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <WaveformViewer scenario={result.waveform} interactive={false} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
