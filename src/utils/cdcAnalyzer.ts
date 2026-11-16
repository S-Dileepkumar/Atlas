import { IpEntity } from '../types/ipUniverse';

export interface ClockDomainInfo {
  id: string;
  name: string;
  frequencyHint: string;
  roleDescription: string;
  colorIndex: number; // 0..4 for consistent styling
  modules: string[];
  interfaces: string[];
  resetSignals: string[];
}

export interface CdcCrossingItem {
  id: string;
  signalOrPath: string;
  fromDomain: string;
  toDomain: string;
  fromModule: string;
  toModule: string;
  kind: 'Control / Single-Bit' | 'Multi-Bit Data / Bus' | 'Reset Domain Crossing';
  status: 'Protected (Synchronizer Detected)' | 'Potential Async Boundary (Review Sync)' | 'Unsafe Direct Crossing Detected';
  synchronizerHint: string;
  engineeringExplanation: string;
  studentExplanation: string;
}

export interface CdcAnalysisReport {
  targetName: string;
  mode: 'ip' | 'custom-rtl';
  totalClockDomains: number;
  domains: ClockDomainInfo[];
  crossings: CdcCrossingItem[];
  detectedPrimitives: string[];
  summary: string;
  studentSummary: string;
}

function normalizeClockToken(raw: string): string {
  const cleaned = raw.trim().replace(/[(),;]/g, '');
  // Extract primary signal identifier if string has notes like "clk_i (100 MHz system clock)"
  const match = cleaned.match(/([a-zA-Z_][\w]*)/);
  return match ? match[1] : cleaned;
}

function isClockPortName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === 'clk' ||
    lower.startsWith('clk_') ||
    lower.endsWith('_clk') ||
    lower.endsWith('_clk_i') ||
    lower.includes('aclk') ||
    lower.includes('pclk') ||
    lower.includes('hclk') ||
    lower === 'tck' ||
    lower === 'sclk'
  );
}

function isResetPortName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('rst') || lower.includes('reset');
}

export function analyzeIpClockDomains(ip: IpEntity): CdcAnalysisReport {
  const clockNames = new Set<string>();
  const freqMap = new Map<string, string>();
  const primHits = new Set<string>();

  // 1. Collect clocks from IP architecture & interfaces
  for (const c of ip.architecture.clocks) {
    const tok = normalizeClockToken(c);
    if (tok) {
      clockNames.add(tok);
      freqMap.set(tok, c);
    }
  }
  for (const iface of ip.interfaces) {
    const tok = normalizeClockToken(iface.clockDomain);
    if (tok && !tok.toLowerCase().includes('combinational') && !tok.toLowerCase().includes('async')) {
      clockNames.add(tok);
      if (!freqMap.has(tok)) freqMap.set(tok, iface.clockDomain);
    }
  }

  // 2. Collect clocks & CDC primitive clues from RTL modules
  const moduleClockMap = new Map<string, string[]>();
  const allText = ip.modules.map((m) => `${m.name} ${m.summary} ${m.sourceExcerpt}`).join('\n');

  const knownPrims = [
    'prim_flop_2sync',
    'prim_fifo_async',
    'tlul_fifo_async',
    'axi_cdc',
    'cdc_2phase',
    'cdc_fifo_gray',
    'rstmgr',
    'AsyncQueue',
    'GrayCounter',
  ];
  for (const pr of knownPrims) {
    if (allText.toLowerCase().includes(pr.toLowerCase()) || ip.fileTree.some((f) => f.toLowerCase().includes(pr.toLowerCase()))) {
      primHits.add(pr);
    }
  }

  for (const mod of ip.modules) {
    const modClks = new Set<string>();
    for (const pt of mod.ports) {
      if (isClockPortName(pt.name)) {
        const tok = normalizeClockToken(pt.name);
        modClks.add(tok);
        clockNames.add(tok);
        if (!freqMap.has(tok)) freqMap.set(tok, pt.description || 'RTL clock input');
      }
    }
    const posedges = Array.from(mod.sourceExcerpt.matchAll(/@\s*\(\s*posedge\s+([a-zA-Z_]\w*)/g)).map((m) => m[1]);
    for (const pe of posedges) {
      modClks.add(pe);
      clockNames.add(pe);
    }
    if (modClks.size === 0 && clockNames.size > 0) {
      modClks.add(Array.from(clockNames)[0]);
    }
    moduleClockMap.set(mod.name, Array.from(modClks));
  }

  const clockList = Array.from(clockNames);
  if (clockList.length === 0) clockList.push('clk_i');

  const domains: ClockDomainInfo[] = clockList.map((clk, idx) => {
    const modules = ip.modules
      .filter((m) => (moduleClockMap.get(m.name) || []).includes(clk))
      .map((m) => m.name);

    const interfaces = ip.interfaces
      .filter((i) => normalizeClockToken(i.clockDomain) === clk)
      .map((i) => `${i.name} (${i.protocolLabel})`);

    const resets = new Set<string>();
    for (const m of ip.modules) {
      if ((moduleClockMap.get(m.name) || []).includes(clk)) {
        m.ports.filter((p) => isResetPortName(p.name)).forEach((p) => resets.add(p.name));
      }
    }
    if (resets.size === 0 && ip.architecture.resets.length > 0) {
      resets.add(normalizeClockToken(ip.architecture.resets[0]));
    }

    return {
      id: `dom-${idx}`,
      name: clk,
      frequencyHint: freqMap.get(clk) || 'Module Clock Domain',
      roleDescription: idx === 0 ? 'Primary Core / Bus Clock' : 'Auxiliary / Peripheral / Asymmetric Clock Domain',
      colorIndex: idx % 5,
      modules: modules.length > 0 ? modules : idx === 0 ? ip.modules.map((m) => m.name) : [],
      interfaces,
      resetSignals: Array.from(resets),
    };
  });

  const crossings: CdcCrossingItem[] = [];
  const primaryClk = domains[0].name;

  // Detect modules bridging multiple clocks
  for (const mod of ip.modules) {
    const clks = moduleClockMap.get(mod.name) || [];
    if (clks.length > 1) {
      for (let i = 1; i < clks.length; i++) {
        const hasSyncPrim =
          primHits.size > 0 ||
          mod.summary.toLowerCase().includes('async') ||
          mod.summary.toLowerCase().includes('cdc') ||
          mod.summary.toLowerCase().includes('sync') ||
          mod.name.toLowerCase().includes('cdc') ||
          mod.name.toLowerCase().includes('async');

        crossings.push({
          id: `mod-cdc-${mod.name}-${i}`,
          signalOrPath: `${mod.name} (${clks[0]} <-> ${clks[i]})`,
          fromDomain: clks[0],
          toDomain: clks[i],
          fromModule: mod.name,
          toModule: mod.name,
          kind: mod.name.toLowerCase().includes('fifo') || mod.name.toLowerCase().includes('axi') ? 'Multi-Bit Data / Bus' : 'Control / Single-Bit',
          status: hasSyncPrim ? 'Protected (Synchronizer Detected)' : 'Potential Async Boundary (Review Sync)',
          synchronizerHint: hasSyncPrim
            ? `Uses ${Array.from(primHits).join(', ') || 'async handshake / FIFO'}`
            : 'Verify 2-FF synchronizer (control) or Gray-coded Async FIFO (multi-bit)',
          engineeringExplanation: `Module ${mod.name} samples ports from both ${clks[0]} and ${clks[i]}. Ensure no combinational path crosses directly without dual-flop or Gray-coded FIFO isolation.`,
          studentExplanation: `Think of ${mod.name} as a border checkpoint between two clocks (${clks[0]} and ${clks[i]}) ticking at different speeds. Signals crossing here must stop at a 2-FF waiting room (for single wires) or an Async FIFO conveyor belt (for multi-bit data) so flip-flops never sample a wire mid-transition.`,
        });
      }
    }
  }

  // Detect interfaces on secondary clocks connecting into primary domain
  for (const iface of ip.interfaces) {
    const iClk = normalizeClockToken(iface.clockDomain);
    if (iClk !== primaryClk && clockList.includes(iClk)) {
      const alreadyTracked = crossings.some((c) => c.fromDomain === iClk || c.toDomain === iClk);
      if (!alreadyTracked || ip.interfaces.length > 1) {
        const isMultiBit = iface.signals.some((s) => s.width !== '1' && !s.width.includes('1b'));
        const hasPrim = primHits.size > 0 || iface.timingDependencies.toLowerCase().includes('sync') || iface.timingDependencies.toLowerCase().includes('async');
        crossings.push({
          id: `if-cdc-${iface.name}`,
          signalOrPath: `${iface.name} [${iface.protocolLabel}]`,
          fromDomain: iClk,
          toDomain: primaryClk,
          fromModule: iface.name,
          toModule: ip.modules[0]?.name || ip.name,
          kind: isMultiBit ? 'Multi-Bit Data / Bus' : 'Control / Single-Bit',
          status: hasPrim ? 'Protected (Synchronizer Detected)' : 'Potential Async Boundary (Review Sync)',
          synchronizerHint: hasPrim
            ? `Backed by ${Array.from(primHits).join(', ') || 'protocol async adapter'}`
            : isMultiBit
            ? 'Requires Async FIFO (Gray pointers) or Req/Ack toggle handshake'
            : 'Requires 2-FF synchronizer (prim_flop_2sync) on destination clock',
          engineeringExplanation: `Interface ${iface.name} runs on ${iClk} while core logic uses ${primaryClk}. Timing dependencies: ${iface.timingDependencies}`,
          studentExplanation: `Because ${iface.name} ticks to ${iClk} while the main brain of ${ip.name} ticks to ${primaryClk}, every wire crossing between them needs synchronization—just like tossing a ball between two people clapping at unrelated tempos.`,
        });
      }
    }
  }

  // Detect Reset Domain Crossings if multiple clocks exist
  if (domains.length > 1) {
    crossings.push({
      id: 'rdc-check',
      signalOrPath: `${ip.architecture.resets[0] || 'rst_ni'} Reset Tree`,
      fromDomain: primaryClk,
      toDomain: domains[1].name,
      fromModule: 'Reset Controller',
      toModule: domains[1].modules[0] || domains[1].name,
      kind: 'Reset Domain Crossing',
      status: primHits.has('rstmgr') ? 'Protected (Synchronizer Detected)' : 'Potential Async Boundary (Review Sync)',
      synchronizerHint: 'Async-assert / Sync-deassert Reset Bridge per clock domain',
      engineeringExplanation: `Async-active reset (${ip.architecture.resets[0] || 'rst_ni'}) enters multiple clock domains. Deassertion must be synchronized independently to each destination clock to prevent half-reset recovery violations.`,
      studentExplanation: 'Even the "Reset" button needs synchronization! Turning Reset ON immediately resets everything safely, but releasing Reset OFF must happen cleanly right on each clock’s own beat so some flip-flops do not wake up one cycle earlier than their neighbors.',
    });
  }

  return {
    targetName: ip.name,
    mode: 'ip',
    totalClockDomains: domains.length,
    domains,
    crossings,
    detectedPrimitives: Array.from(primHits),
    summary:
      domains.length === 1
        ? `Single synchronous clock domain (${primaryClk}) detected across ${ip.modules.length} RTL modules and ${ip.interfaces.length} bus interfaces. All internal flops share common setup/hold timing.`
        : `Detected ${domains.length} clock domains (${domains.map((d) => d.name).join(', ')}) and ${crossings.length} CDC/reset boundary crossings across ${ip.modules.length} modules.`,
    studentSummary:
      domains.length === 1
        ? `Great news for timing! Every register inside ${ip.name} marches to one single drummer (${primaryClk}). Because everyone steps on the exact same rising clock edge, signals never arrive half-baked between internal stages.`
        : `${ip.name} has ${domains.length} independent clocks (${domains.map((d) => d.name).join(' and ')}). Anywhere data hops from one clock island to another, hardware needs a Synchronizer or Async FIFO to avoid metastability glitches.`,
  };
}

export function analyzeCustomRtlCdc(sourceName: string, code: string): CdcAnalysisReport {
  const clean = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const clkSignalsMap = new Map<string, { driven: Set<string>; read: Set<string>; resets: Set<string> }>();

  // Parse always_ff / always @(posedge CLK ...) blocks
  const blockRegex = /always(?:_ff)?\s*@\s*\(\s*posedge\s+([a-zA-Z_]\w*)([^)]*)\)\s*(begin[\s\S]*?\bend|[^;]+;)/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(clean)) !== null) {
    const clk = match[1];
    const sensRest = match[2] || '';
    const body = match[3] || '';
    if (!clkSignalsMap.has(clk)) {
      clkSignalsMap.set(clk, { driven: new Set(), read: new Set(), resets: new Set() });
    }
    const entry = clkSignalsMap.get(clk)!;

    const rstMatch = sensRest.match(/(?:negedge|posedge)\s+([a-zA-Z_]\w*)/);
    if (rstMatch) entry.resets.add(rstMatch[1]);

    // Driven targets: lhs <= rhs
    for (const am of body.matchAll(/([a-zA-Z_]\w*)\s*(?:\[[^\]]+\])?\s*<=\s*([^;]+);/g)) {
      const lhs = am[1];
      const rhs = am[2];
      entry.driven.add(lhs);
      for (const tok of rhs.matchAll(/\b([a-zA-Z_]\w*)\b/g)) {
        const id = tok[1];
        if (!['if', 'else', 'begin', 'end', 'logic', 'reg', 'rst_n', 'rst_ni', 'aresetn'].includes(id) && id !== lhs) {
          entry.read.add(id);
        }
      }
    }
  }

  // Detect synchronizer module instantiations or 2-stage pipeline naming
  const syncHits = new Set<string>();
  for (const pm of clean.matchAll(/\b([a-zA-Z_]\w*(?:sync|cdc|async_fifo|fifo_async)[a-zA-Z0-9_]*)\b/gi)) {
    syncHits.add(pm[1]);
  }

  const clockList = Array.from(clkSignalsMap.keys());
  if (clockList.length === 0) clockList.push('clk');

  const domains: ClockDomainInfo[] = clockList.map((clk, idx) => {
    const info = clkSignalsMap.get(clk);
    const driven = info ? Array.from(info.driven) : [];
    return {
      id: `rtl-dom-${idx}`,
      name: clk,
      frequencyHint: `Driven regs: ${driven.slice(0, 5).join(', ') || 'combinational / ports'}`,
      roleDescription: `always_ff @(posedge ${clk}) domain`,
      colorIndex: idx % 5,
      modules: driven.length > 0 ? driven.map((d) => `reg ${d}`) : [`@${clk} block`],
      interfaces: [],
      resetSignals: info ? Array.from(info.resets) : [],
    };
  });

  const crossings: CdcCrossingItem[] = [];
  for (const [srcClk, srcData] of clkSignalsMap.entries()) {
    for (const [dstClk, dstData] of clkSignalsMap.entries()) {
      if (srcClk === dstClk) continue;
      for (const sig of srcData.driven) {
        if (dstData.read.has(sig)) {
          const looksSynced =
            sig.toLowerCase().includes('sync') ||
            sig.toLowerCase().includes('gray') ||
            Array.from(syncHits).some((s) => s.toLowerCase().includes('fifo') || s.toLowerCase().includes('2sync'));

          crossings.push({
            id: `rtl-cross-${srcClk}-${dstClk}-${sig}`,
            signalOrPath: sig,
            fromDomain: srcClk,
            toDomain: dstClk,
            fromModule: `always_ff @(${srcClk})`,
            toModule: `always_ff @(${dstClk})`,
            kind: sig.toLowerCase().includes('data') || sig.toLowerCase().includes('bus') || sig.toLowerCase().includes('cnt')
              ? 'Multi-Bit Data / Bus'
              : 'Control / Single-Bit',
            status: looksSynced ? 'Protected (Synchronizer Detected)' : 'Unsafe Direct Crossing Detected',
            synchronizerHint: looksSynced
              ? 'Synchronizer naming/FIFO detected on destination domain'
              : 'WARNING: Direct flop-to-flop crossing without 2-FF sync or Async FIFO!',
            engineeringExplanation: `Register "${sig}" driven on @(posedge ${srcClk}) is sampled directly inside @(posedge ${dstClk}). Insert a 2-FF synchronizer (*_sync1/*_sync2 with ASYNC_REG) for 1-bit control, or a Gray-coded Async FIFO for multi-bit values.`,
            studentExplanation: `Danger! Register "${sig}" changes when "${srcClk}" ticks, but another flip-flop on "${dstClk}" reads it immediately. If those two clocks tick near the same instant, the receiving flip-flop can get stuck halfway between 0 and 1 (metastability)!`,
          });
        }
      }
    }
  }

  return {
    targetName: sourceName,
    mode: 'custom-rtl',
    totalClockDomains: domains.length,
    domains,
    crossings,
    detectedPrimitives: Array.from(syncHits),
    summary: `Analyzed ${clockList.length} clock block(s) (${clockList.join(', ')}) in ${sourceName}. Found ${crossings.length} cross-domain register boundary/crossings.`,
    studentSummary:
      crossings.some((c) => c.status === 'Unsafe Direct Crossing Detected')
        ? `Heads up! Our analyzer caught a signal hopping directly from ${clockList[0]} to another clock without a protective 2-Flip-Flop Synchronizer or Async FIFO.`
        : `Parsed ${clockList.length} clock island(s). Signals inside one clock island are safe; any crossing paths are highlighted below.`,
  };
}
