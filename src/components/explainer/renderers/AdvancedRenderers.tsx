import React, { useEffect, useRef, useState } from 'react';
import { RendererProps } from './CoreRenderers';

/* ============================================================================
 * 8. HIERARCHY / FLOORPLAN VIEW WITH CLOCK, RESET & POWER OVERLAYS
 * ========================================================================== */
interface FloorBlockCfg {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  clockDomain: string;
  resetDomain: string;
  powerDomain: string;
  gatedOnSteps?: number[];
}

export const HierarchyFloorplanRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
}) => {
  const blocks = (config.blocks as FloorBlockCfg[]) ?? [];
  const [overlay, setOverlay] = useState<'clock' | 'reset' | 'power'>('power');

  const overlayColor = (b: FloorBlockCfg) => {
    if (overlay === 'clock') {
      return b.clockDomain.includes('fast') || b.clockDomain.includes('1GHz')
        ? 'var(--sem-control)'
        : 'var(--sem-data)';
    }
    if (overlay === 'reset') {
      return b.resetDomain.includes('POR') ? 'var(--sem-error)' : 'var(--sem-control)';
    }
    return b.powerDomain.includes('AON') ? 'var(--sem-data)' : 'var(--sem-active)';
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Domain Overlay:</span>
        <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {(['power', 'clock', 'reset'] as const).map((ov) => (
            <button
              key={ov}
              type="button"
              onClick={() => setOverlay(ov)}
              className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors ${
                overlay === ov
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {ov === 'power' ? 'UPF Power Domains' : ov === 'clock' ? 'Clock Domains' : 'Reset Domains'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3 bg-engineering-grid">
        <svg viewBox="0 0 680 240" className="w-full min-w-[540px] h-auto select-none" role="img" aria-label="SoC hierarchy floorplan with clock, reset, and power overlays">
          <rect x={8} y={8} width={664} height={224} rx={8} fill="none" stroke="var(--sem-border)" strokeDasharray="6 4" strokeWidth={1.5} />
          <text x={20} y={24} fontSize="10" fontFamily="var(--font-mono)" fill="currentColor" className="text-slate-500 dark:text-slate-400">
            TOP_SOC_DIE · Overlay = {overlay.toUpperCase()}
          </text>

          {blocks.map((b) => {
            const isGated = Boolean(b.gatedOnSteps?.includes(currentStep));
            const col = isGated ? 'var(--sem-error)' : overlayColor(b);
            const domainLabel =
              overlay === 'clock' ? b.clockDomain : overlay === 'reset' ? b.resetDomain : b.powerDomain;

            return (
              <g key={b.id}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx={6}
                  fill={col}
                  fillOpacity={isGated ? 0.08 : 0.14}
                  stroke={col}
                  strokeWidth={isGated ? 2 : 1.5}
                  strokeDasharray={isGated ? '5 3' : undefined}
                />
                <text x={b.x + 10} y={b.y + 20} fontSize="12" fontWeight="700" fill="currentColor" className="text-slate-900 dark:text-slate-100">
                  {b.label}
                </text>
                <text x={b.x + 10} y={b.y + 36} fontSize="10" fontFamily="var(--font-mono)" fill="currentColor" className="text-slate-600 dark:text-slate-300">
                  {domainLabel}
                </text>
                {b.h >= 72 && (
                  <text x={b.x + 10} y={b.y + 52} fontSize="9.5" fontFamily="var(--font-mono)" fill={isGated ? 'var(--sem-error)' : 'var(--sem-data)'}>
                    {isGated ? 'ISOLATED / POWER-GATED' : 'POWERED · CLOCK ACTIVE'}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 9. SYSTOLIC ARRAY / DATAFLOW GRID (<canvas> 60fps: WS / OS / RS MODES)
 * ========================================================================== */
export const SystolicArrayCanvasRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
  reducedMotion,
  tryItValues,
}) => {
  const dim = Math.min(4, Math.max(2, (config.gridDim as number) ?? 4));
  const mode = String(tryItValues.dataflow ?? (config.defaultMode as string) ?? 'weight-stationary');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = 620;
    const cssH = 260;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let rafId = 0;
    let phase = 0;

    const draw = () => {
      const dark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = dark ? '#080e1a' : '#f8fafc';
      ctx.fillRect(0, 0, cssW, cssH);

      const startX = 155;
      const startY = 46;
      const cell = 46;
      const gap = 8;

      // Mode title & streaming legend
      ctx.fillStyle = dark ? '#e2e8f0' : '#0f172a';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Dataflow Mode: ${mode.toUpperCase()} · Cycle C${currentStep}`, 16, 22);

      // Left activation feed vector (skewed by row)
      for (let r = 0; r < dim; r++) {
        const cy = startY + r * (cell + gap) + cell / 2;
        const activeWave = currentStep >= r && currentStep < r + dim;
        ctx.fillStyle = activeWave ? (dark ? '#2dd4bf' : '#0d9488') : (dark ? '#64748b' : '#94a3b8');
        ctx.font = '600 10px "IBM Plex Mono", monospace';
        const actVal = activeWave ? `a[${r},${currentStep - r}]` : '0';
        ctx.fillText(actVal, 22, cy + 4);
      }

      // Top weight / psum feed labels
      for (let c = 0; c < dim; c++) {
        const cx = startX + c * (cell + gap) + 6;
        ctx.fillStyle = mode === 'weight-stationary' ? (dark ? '#fbbf24' : '#d97706') : (dark ? '#60a5fa' : '#2563eb');
        ctx.font = '600 10px "IBM Plex Mono", monospace';
        ctx.fillText(mode === 'weight-stationary' ? `w[:,${c}]` : `b[${currentStep},${c}]`, cx, startY - 10);
      }

      // MAC PE Grid
      for (let r = 0; r < dim; r++) {
        for (let c = 0; c < dim; c++) {
          const x = startX + c * (cell + gap);
          const y = startY + r * (cell + gap);
          const manhattan = r + c;
          const activePE = currentStep >= manhattan && currentStep < manhattan + 3;
          const macAcc = Math.max(0, Math.min(4, currentStep - manhattan + 1));

          ctx.fillStyle = activePE
            ? dark
              ? 'rgba(251, 191, 36, 0.18)'
              : 'rgba(217, 119, 6, 0.14)'
            : dark
            ? '#0f172a'
            : '#ffffff';
          ctx.strokeStyle = activePE ? (dark ? '#fbbf24' : '#d97706') : (dark ? '#334155' : '#cbd5e1');
          ctx.lineWidth = activePE ? 2 : 1;
          ctx.beginPath();
          ctx.roundRect(x, y, cell, cell, 5);
          ctx.fill();
          ctx.stroke();

          // PE text
          ctx.fillStyle = dark ? '#e2e8f0' : '#0f172a';
          ctx.font = '700 10px "IBM Plex Mono", monospace';
          ctx.fillText(`PE${r}${c}`, x + 7, y + 16);
          ctx.fillStyle = activePE ? (dark ? '#2dd4bf' : '#0d9488') : (dark ? '#94a3b8' : '#64748b');
          ctx.font = '500 9px "IBM Plex Mono", monospace';
          const regText =
            mode === 'weight-stationary'
              ? `psum:${macAcc}`
              : mode === 'output-stationary'
              ? `acc+=${macAcc}`
              : `row:${macAcc}`;
          ctx.fillText(regText, x + 5, y + 34);

          // Animated horizontal activation pulse
          if (activePE) {
            const offset = reducedMotion ? 0.5 : (phase % 60) / 60;
            ctx.fillStyle = dark ? '#2dd4bf' : '#0d9488';
            ctx.beginPath();
            ctx.arc(x - 6 + offset * (cell + gap), y + cell / 2, 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Side behavior note box
      const noteX = startX + dim * (cell + gap) + 22;
      ctx.fillStyle = dark ? '#1e293b' : '#ffffff';
      ctx.strokeStyle = dark ? '#334155' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(noteX, startY, 210, 148, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = dark ? '#f8fafc' : '#0f172a';
      ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Active Stationary Policy', noteX + 12, startY + 22);

      ctx.fillStyle = dark ? '#cbd5e1' : '#475569';
      ctx.font = '400 10.5px "DM Sans", sans-serif';
      const lines =
        mode === 'weight-stationary'
          ? ['Weights pinned inside each PE.', 'Activations stream East (->).', 'Partial sums cascade South (v).', 'Amortizes weight SRAM reads.']
          : mode === 'output-stationary'
          ? ['C[r][c] accumulator pinned in PE.', 'Activations stream East (->).', 'Weights stream South (v).', 'Zero partial-sum NoC traffic.']
          : ['1D convolution rows mapped per PE.', 'Reuses filter + input row locally.', 'Reduces DRAM + RF energy.', 'Balances PE utilization.'];
      lines.forEach((ln, idx) => ctx.fillText(ln, noteX + 12, startY + 46 + idx * 20));

      if (!reducedMotion) {
        phase += 1.4;
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [dim, mode, currentStep, reducedMotion]);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-3">
      <canvas
        ref={canvasRef}
        style={{ width: 620, height: 260 }}
        className="max-w-none block rounded"
        aria-label={`Systolic array dataflow canvas running in ${mode} mode`}
      />
    </div>
  );
};

/* ============================================================================
 * 10. CACHE & MEMORY HIERARCHY VIEW (MESI / MOESI + HIT/MISS/EVICT)
 * ========================================================================== */
interface CacheStepCfg {
  step: number;
  core0State: string;
  core1State: string;
  llcState: string;
  eventLabel: string;
  kind: 'control' | 'data' | 'error' | 'active';
}

export const CacheCoherenceRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
}) => {
  const timeline = (config.timeline as CacheStepCfg[]) ?? [];
  const row = timeline[Math.min(currentStep, timeline.length - 1)] ?? {
    step: 0,
    core0State: 'I (Invalid)',
    core1State: 'I (Invalid)',
    llcState: 'Clean in DRAM',
    eventLabel: 'Idle',
    kind: 'control' as const,
  };

  const stateBadgeClass = (s: string) => {
    if (s.startsWith('M')) return 'border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300';
    if (s.startsWith('E') || s.startsWith('S')) return 'border-teal-500/60 bg-teal-500/10 text-teal-700 dark:text-teal-300';
    if (s.startsWith('O')) return 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    return 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400';
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-3 rounded-md border ${stateBadgeClass(row.core0State)}`}>
          <div className="text-[11px] font-semibold">Core 0 L1 Data Cache (Line 0x4000)</div>
          <div className="font-mono text-sm font-bold mt-1">{row.core0State}</div>
        </div>
        <div className={`p-3 rounded-md border ${stateBadgeClass(row.core1State)}`}>
          <div className="text-[11px] font-semibold">Core 1 L1 Data Cache (Line 0x4000)</div>
          <div className="font-mono text-sm font-bold mt-1">{row.core1State}</div>
        </div>
        <div className="p-3 rounded-md border border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200">
          <div className="text-[11px] font-semibold">Coherent Directory / LLC + DRAM</div>
          <div className="font-mono text-sm font-bold mt-1">{row.llcState}</div>
        </div>
      </div>

      <div className="px-3 py-2 rounded border border-amber-500/40 bg-amber-500/10 text-xs font-mono text-slate-900 dark:text-slate-100">
        Step T{row.step} Event: {row.eventLabel}
      </div>
    </div>
  );
};

/* ============================================================================
 * 11. NOC / 2D MESH VIEW (<canvas> 60fps ROUTERS, VCs, CREDITS, HEATMAP)
 * ========================================================================== */
export const NocMeshCanvasRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
  reducedMotion,
  tryItValues,
}) => {
  const rows = (config.rows as number) ?? 3;
  const cols = (config.cols as number) ?? 3;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const congested = Boolean(tryItValues.backpressure);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = 580;
    const cssH = 240;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let tick = 0;

    // XY route path from R(0,0) -> R(2,0) -> R(2,2)
    const route = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ];
    const activeHop = currentStep % route.length;

    const draw = () => {
      const dark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = dark ? '#080e1a' : '#f8fafc';
      ctx.fillRect(0, 0, cssW, cssH);

      const spX = 130;
      const spY = 66;
      const offX = 80;
      const offY = 44;

      // Draw bidirectional mesh links + congestion heatmap
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offX + c * spX;
          const y = offY + r * spY;
          if (c < cols - 1) {
            const hot = congested && r === 0;
            ctx.strokeStyle = hot ? (dark ? '#f87171' : '#dc2626') : (dark ? '#334155' : '#cbd5e1');
            ctx.lineWidth = hot ? 3.5 : 2;
            ctx.beginPath();
            ctx.moveTo(x + 22, y);
            ctx.lineTo(x + spX - 22, y);
            ctx.stroke();
          }
          if (r < rows - 1) {
            const hot = congested && c === 2;
            ctx.strokeStyle = hot ? (dark ? '#f87171' : '#dc2626') : (dark ? '#334155' : '#cbd5e1');
            ctx.lineWidth = hot ? 3.5 : 2;
            ctx.beginPath();
            ctx.moveTo(x, y + 18);
            ctx.lineTo(x, y + spY - 18);
            ctx.stroke();
          }
        }
      }

      // Draw routers + VC credit occupancy
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offX + c * spX;
          const y = offY + r * spY;
          const isCurRouter = route[activeHop][0] === r && route[activeHop][1] === c;
          const credits = congested && c >= 1 ? Math.max(0, 4 - ((currentStep + c) % 4)) : 4 - (isCurRouter ? 1 : 0);

          ctx.fillStyle = isCurRouter
            ? dark
              ? 'rgba(251, 191, 36, 0.22)'
              : 'rgba(217, 119, 6, 0.16)'
            : dark
            ? '#0f172a'
            : '#ffffff';
          ctx.strokeStyle = isCurRouter ? (dark ? '#fbbf24' : '#d97706') : (dark ? '#60a5fa' : '#2563eb');
          ctx.lineWidth = isCurRouter ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.roundRect(x - 24, y - 18, 48, 36, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = dark ? '#f8fafc' : '#0f172a';
          ctx.font = '700 10px "IBM Plex Mono", monospace';
          ctx.fillText(`R(${r},${c})`, x - 18, y - 2);
          ctx.fillStyle = credits === 0 ? (dark ? '#f87171' : '#dc2626') : (dark ? '#2dd4bf' : '#0d9488');
          ctx.font = '500 9px "IBM Plex Mono", monospace';
          ctx.fillText(`VC cr:${credits}`, x - 18, y + 11);
        }
      }

      // Flit packet dot along XY route
      if (activeHop < route.length) {
        const [cr, cc] = route[activeHop];
        const fx = offX + cc * spX;
        const fy = offY + cr * spY;
        const pulseR = reducedMotion ? 6 : 5 + Math.sin(tick * 0.12) * 1.5;
        ctx.fillStyle = dark ? '#2dd4bf' : '#0d9488';
        ctx.beginPath();
        ctx.arc(fx + 18, fy - 12, pulseR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Legend note
      ctx.fillStyle = dark ? '#94a3b8' : '#475569';
      ctx.font = '500 10px "IBM Plex Mono", monospace';
      ctx.fillText(
        `DOR XY Routing R(0,0)->R(2,2) · Active Hop: R(${route[activeHop][0]},${route[activeHop][1]}) · Heatmap: ${congested ? 'HIGH CONGESTION' : 'NOMINAL'}`,
        16,
        cssH - 10
      );

      if (!reducedMotion) {
        tick += 1;
        raf = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [rows, cols, currentStep, reducedMotion, congested]);

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-3">
      <canvas ref={canvasRef} style={{ width: 580, height: 240 }} className="max-w-none block rounded" aria-label="2D NoC mesh router and virtual channel credit simulation" />
    </div>
  );
};

/* ============================================================================
 * 12. QUEUE / FIFO / CREDIT-BASED FLOW CONTROL VIEW
 * ========================================================================== */
export const QueueCreditRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
  tryItValues,
}) => {
  const depth = (config.fifoDepth as number) ?? 8;
  const maxCredits = (config.maxCredits as number) ?? 8;
  const occupancySeq = (config.occupancyByStep as number[]) ?? [1, 3, 5, 6, 4, 2];
  const bpSeq = (config.backpressureOccupancyByStep as number[]) ?? [2, 4, 6, 8, 8, 7];
  const backpressure = Boolean(tryItValues.backpressure);

  const used = backpressure
    ? bpSeq[Math.min(currentStep, bpSeq.length - 1)]
    : occupancySeq[Math.min(currentStep, occupancySeq.length - 1)];
  const peak = Math.max(...(backpressure ? bpSeq : occupancySeq).slice(0, currentStep + 1));
  const creditsLeft = Math.max(0, maxCredits - used);
  const full = used >= depth;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {(config.queueName as string) ?? 'Ingress Elastic FIFO & Credit Pool'}
        </span>
        <div className="flex items-center gap-3 font-mono tabular-nums">
          <span>Occupancy: {used}/{depth}</span>
          <span>Peak: {peak}/{depth}</span>
          <span className={creditsLeft === 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-teal-600 dark:text-teal-400'}>
            Credits Left: {creditsLeft}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-1.5">
        {Array.from({ length: depth }).map((_, idx) => {
          const filled = idx < used;
          return (
            <div
              key={idx}
              className={`h-8 rounded border flex items-center justify-center font-mono text-[10px] font-semibold ${
                filled
                  ? full
                    ? 'border-red-500 bg-red-500/20 text-red-700 dark:text-red-300'
                    : 'border-teal-500 bg-teal-500/20 text-teal-700 dark:text-teal-300'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400'
              }`}
            >
              {filled ? `E${idx}` : 'EMPTY'}
            </div>
          );
        })}
      </div>

      {full && (
        <div className="text-xs font-mono text-red-600 dark:text-red-400">
          FIFO FULL — Deasserting upstream READY / withholding credit return until consumer drains entry E0.
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 13. ROOFLINE PERFORMANCE CHART (COMPUTE CEILING VS MEMORY BANDWIDTH BOUND)
 * ========================================================================== */
interface RooflinePointCfg {
  label: string;
  ai: number; // Arithmetic intensity FLOPs/Byte
  perf: number; // Attainable TOP/s or GFLOP/s
  step: number;
}

export const RooflineChartRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
}) => {
  const peakTops = (config.peakCompute as number) ?? 64;
  const memBwGbs = (config.memBandwidthGBs as number) ?? 128; // Slope
  const points = (config.points as RooflinePointCfg[]) ?? [];
  const ridgeAi = peakTops / (memBwGbs / 1000); // e.g. 64 TOPs / 0.128 TB/s = 500 FLOP/B

  // Log-like clean schematic projection onto 560x210
  const mapX = (ai: number) => 60 + Math.min(460, Math.max(0, (Math.log2(Math.max(0.25, ai)) + 2) * 44));
  const mapY = (perf: number) => 176 - Math.min(144, Math.max(0, (Math.log2(Math.max(0.25, perf)) + 2) * 18));

  const ridgeX = mapX(ridgeAi);
  const peakY = mapY(peakTops);
  const leftX = mapX(0.25);
  const leftY = mapY(0.25 * (memBwGbs / 1000));

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-3">
      <svg viewBox="0 0 580 210" className="w-full min-w-[520px] h-auto select-none" role="img" aria-label="Roofline model performance chart comparing memory bandwidth vs compute ceiling">
        {/* Axes */}
        <line x1={60} y1={176} x2={540} y2={176} stroke="var(--sem-border)" strokeWidth={1.5} />
        <line x1={60} y1={22} x2={60} y2={176} stroke="var(--sem-border)" strokeWidth={1.5} />

        {/* Memory bandwidth ceiling slope + Compute flat roof */}
        <polyline
          points={`${leftX},${leftY} ${ridgeX},${peakY} 532,${peakY}`}
          fill="none"
          stroke="var(--sem-control)"
          strokeWidth={2.5}
        />

        {/* Ridge point vertical marker */}
        <line x1={ridgeX} y1={peakY} x2={ridgeX} y2={176} stroke="var(--sem-active)" strokeDasharray="4 4" strokeWidth={1.2} />
        <text x={ridgeX} y={193} textAnchor="middle" fontSize="9.5" fontFamily="var(--font-mono)" fill="var(--sem-active)">
          Ridge ({ridgeAi.toFixed(0)} FLOP/B)
        </text>
        <text x={140} y={40} fontSize="10" fontFamily="var(--font-mono)" fill="var(--sem-control)">
          BW Slope: {memBwGbs} GB/s
        </text>
        <text x={380} y={peakY - 8} fontSize="10" fontFamily="var(--font-mono)" fill="var(--sem-control)">
          Peak Compute Ceiling: {peakTops}
        </text>

        {/* Operating workload points */}
        {points.map((pt) => {
          const px = mapX(pt.ai);
          const py = mapY(pt.perf);
          const active = pt.step === currentStep;
          const memBound = pt.ai < ridgeAi;
          return (
            <g key={pt.label}>
              <circle
                cx={px}
                cy={py}
                r={active ? 7 : 4.5}
                fill={active ? 'var(--sem-active)' : memBound ? 'var(--sem-error)' : 'var(--sem-data)'}
                stroke="var(--sem-surface)"
                strokeWidth={1.5}
              />
              <text
                x={px + 10}
                y={py + 3}
                fontSize={active ? '10.5' : '9.5'}
                fontWeight={active ? '700' : '500'}
                fontFamily="var(--font-mono)"
                fill="currentColor"
                className="text-slate-900 dark:text-slate-100"
              >
                {pt.label} ({memBound ? 'Mem-Bound' : 'Compute-Bound'})
              </text>
            </g>
          );
        })}

        <text x={300} y={205} textAnchor="middle" fontSize="10" fill="currentColor" className="text-slate-500 dark:text-slate-400">
          Arithmetic Intensity (Ops / Byte, log scale)
        </text>
      </svg>
    </div>
  );
};

/* ============================================================================
 * 14. LAYERED STACK VIEW WITH HEADER / FOOTER ENCAPSULATION ANIMATION
 * ========================================================================== */
interface StackLayerCfg {
  name: string;
  role: string;
  headerAdded: string;
  trailerAdded?: string;
  activeSteps: number[];
  kind: 'control' | 'data' | 'error';
}

export const LayeredStackRenderer: React.FC<RendererProps> = ({
  config,
  currentStep,
}) => {
  const layers = (config.layers as StackLayerCfg[]) ?? [];

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3">
      {layers.map((layer) => {
        const active = layer.activeSteps.includes(currentStep);
        return (
          <div
            key={layer.name}
            className={`p-2.5 rounded border transition-colors ${
              active
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {layer.name} <span className="font-normal text-slate-500 dark:text-slate-400">· {layer.role}</span>
              </div>
              <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                {active ? 'ACTIVE LAYER' : 'PASS-THROUGH'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                +{layer.headerAdded}
              </span>
              <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                Upper Payload
              </span>
              {layer.trailerAdded && (
                <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                  +{layer.trailerAdded}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
