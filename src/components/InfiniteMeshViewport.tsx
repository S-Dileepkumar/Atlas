import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchContentRef,
} from 'react-zoom-pan-pinch';
import { Maximize2, Minimize2, Move, RotateCcw, ZoomIn, ZoomOut, Mouse, Map as MapIcon } from 'lucide-react';

export interface DiagramBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface MiniMapBlockItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  active?: boolean;
}

export interface MiniMapLinkItem {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface InfiniteMeshViewportProps {
  bounds: DiagramBounds;
  title?: string;
  subtitle?: string;
  legend?: React.ReactNode;
  renderDefs?: () => React.ReactNode;
  minHeightClass?: string;
  showMiniMap?: boolean;
  minimapItems?: MiniMapBlockItem[];
  minimapLinks?: MiniMapLinkItem[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const MIN_SCALE = 0.28;
const MAX_SCALE = 3.2;

export const InfiniteMeshViewport: React.FC<InfiniteMeshViewportProps> = ({
  bounds,
  title,
  subtitle,
  legend,
  renderDefs,
  minHeightClass = 'h-[400px] sm:h-[450px]',
  showMiniMap = true,
  minimapItems,
  minimapLinks,
  children,
  footer,
}) => {
  const uid = useId().replace(/:/g, '');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const minimapSvgRef = useRef<SVGSVGElement | null>(null);
  const minimapDragRef = useRef(false);
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const [vpSize, setVpSize] = useState<{ w: number; h: number }>({ w: 820, h: 460 });
  const [viewState, setViewState] = useState<{ positionX: number; positionY: number; scale: number }>({
    positionX: 0,
    positionY: 0,
    scale: 1,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false);
  const [miniMapVisible, setMiniMapVisible] = useState(showMiniMap);

  const safeW = Math.max(160, bounds.width);
  const safeH = Math.max(120, bounds.height);

  // Measure container viewport for accurate minimap viewport rectangle
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setVpSize((prev) =>
          Math.abs(prev.w - rect.width) > 2 || Math.abs(prev.h - rect.height) > 2
            ? { w: rect.width, h: rect.height }
            : prev
        );
      }
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [expanded]);

  const handleFitView = useCallback(() => {
    const api = transformRef.current;
    if (!api) return;
    api.fitToView({
      mode: 'contain',
      minScale: MIN_SCALE,
      maxScale: 1.35,
      animationTime: 180,
      animationType: 'easeOutCubic',
    });
  }, []);

  // Re-fit smoothly whenever schematic bounds or expanded workspace height changes
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      handleFitView();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [bounds.minX, bounds.minY, bounds.width, bounds.height, expanded, handleFitView]);

  const handlePointerDownCapture = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Prevent node/wire click selection if the user actually dragged to pan
  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pointerDownPosRef.current) return;
    const dist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );
    pointerDownPosRef.current = null;
    if (dist > 5) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // Convert current react-zoom-pan-pinch viewport into diagram world coordinates
  const vpWorld = useMemo(() => {
    const scale = Math.max(0.05, viewState.scale);
    return {
      x: bounds.minX - viewState.positionX / scale,
      y: bounds.minY - viewState.positionY / scale,
      w: vpSize.w / scale,
      h: vpSize.h / scale,
    };
  }, [bounds.minX, bounds.minY, viewState.positionX, viewState.positionY, viewState.scale, vpSize.w, vpSize.h]);

  // Expand minimap frame slightly so off-center panning remains visible inside minimap
  const minimapFrame = useMemo(() => {
    const padX = safeW * 0.14;
    const padY = safeH * 0.14;
    return {
      minX: bounds.minX - padX,
      minY: bounds.minY - padY,
      width: safeW + padX * 2,
      height: safeH + padY * 2,
    };
  }, [bounds.minX, bounds.minY, safeW, safeH]);

  const jumpToMiniMapClientPoint = useCallback(
    (clientX: number, clientY: number, animate: boolean) => {
      const svg = minimapSvgRef.current;
      const api = transformRef.current;
      if (!svg || !api) return;

      let worldX = bounds.minX + safeW / 2;
      let worldY = bounds.minY + safeH / 2;

      const ctm = svg.getScreenCTM();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const transformed = pt.matrixTransform(ctm.inverse());
        worldX = transformed.x;
        worldY = transformed.y;
      } else {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          worldX = minimapFrame.minX + ((clientX - rect.left) / rect.width) * minimapFrame.width;
          worldY = minimapFrame.minY + ((clientY - rect.top) / rect.height) * minimapFrame.height;
        }
      }

      const scale = Math.max(MIN_SCALE, viewState.scale);
      const targetPosX = vpSize.w / 2 - (worldX - bounds.minX) * scale;
      const targetPosY = vpSize.h / 2 - (worldY - bounds.minY) * scale;
      api.setTransform(targetPosX, targetPosY, scale, animate ? 180 : 0, 'easeOutCubic');
    },
    [bounds.minX, bounds.minY, minimapFrame.height, minimapFrame.minX, minimapFrame.minY, minimapFrame.width, safeH, safeW, viewState.scale, vpSize.h, vpSize.w]
  );

  const meshShiftX = viewState.positionX - bounds.minX * viewState.scale;
  const meshShiftY = viewState.positionY - bounds.minY * viewState.scale;
  const showSubMinor = viewState.scale >= 0.55;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--mesh-bg)] overflow-hidden">
      {(title || subtitle || legend) && (
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <div className="text-xs font-semibold text-[var(--text-primary)]">{title}</div>
            )}
            {subtitle && (
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{subtitle}</div>
            )}
          </div>
          {legend && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]">
              {legend}
            </div>
          )}
        </div>
      )}

      {/* Interactive Pan & Zoom Schematic Stage powered by react-zoom-pan-pinch */}
      <div
        ref={stageRef}
        onPointerDownCapture={handlePointerDownCapture}
        onClickCapture={handleClickCapture}
        className={`relative w-full overflow-hidden bg-[var(--mesh-bg)] select-none transition-[height] duration-200 ${
          expanded ? 'h-[72vh] min-h-[520px]' : minHeightClass
        } ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Multi-Tier Vector Infinity-Mesh Grid (CSS-variable synced to Light & Dark modes) */}
        <svg
          width="100%"
          height="100%"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full"
        >
          <defs>
            {/* Tier 1: Sub-minor 8px micro-drafting grid */}
            <pattern
              id={`mesh-subminor-${uid}`}
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${meshShiftX}, ${meshShiftY}) scale(${viewState.scale})`}
            >
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke="var(--mesh-subminor-line)"
                strokeWidth={0.6 / Math.max(0.55, viewState.scale)}
              />
            </pattern>

            {/* Tier 2: Minor 32px CAD grid */}
            <pattern
              id={`mesh-minor-${uid}`}
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${meshShiftX}, ${meshShiftY}) scale(${viewState.scale})`}
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="var(--mesh-minor-line)"
                strokeWidth={0.85 / Math.max(0.45, viewState.scale)}
              />
            </pattern>

            {/* Tier 3: Major 160px engineering grid + precision crosshair vertices */}
            <pattern
              id={`mesh-major-${uid}`}
              width="160"
              height="160"
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${meshShiftX}, ${meshShiftY}) scale(${viewState.scale})`}
            >
              <path
                d="M 160 0 L 0 0 0 160"
                fill="none"
                stroke="var(--mesh-major-line)"
                strokeWidth={1.15 / Math.max(0.45, viewState.scale)}
              />
              <path
                d="M 0 0 H 6 M 0 0 V 6"
                fill="none"
                stroke="var(--mesh-crosshair)"
                strokeWidth={1.25 / Math.max(0.55, viewState.scale)}
              />
              <circle
                cx="0"
                cy="0"
                r={1.5 / Math.max(0.6, viewState.scale)}
                fill="var(--mesh-node-dot)"
              />
            </pattern>

            <radialGradient id={`mesh-vignette-${uid}`} cx="50%" cy="50%" r="72%">
              <stop offset="65%" stopColor="transparent" />
              <stop offset="100%" stopColor="var(--mesh-vignette)" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="100%" height="100%" fill="var(--mesh-bg)" />
          {showSubMinor && (
            <rect x="0" y="0" width="100%" height="100%" fill={`url(#mesh-subminor-${uid})`} />
          )}
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#mesh-minor-${uid})`} />
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#mesh-major-${uid})`} />
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#mesh-vignette-${uid})`} />
        </svg>

        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
          limitToBounds={false}
          centerOnInit={true}
          fitOnInit="contain"
          smooth={true}
          panning={{
            disabled: false,
            velocityDisabled: false,
            allowLeftClickPan: true,
            allowMiddleClickPan: true,
            allowRightClickPan: false,
          }}
          wheel={{
            disabled: false,
            wheelDisabled: !scrollZoomEnabled,
            touchPadDisabled: false,
            step: 0.14,
          }}
          pinch={{
            disabled: false,
            step: 5,
          }}
          doubleClick={{
            disabled: false,
            mode: 'reset',
            animationTime: 180,
          }}
          onInit={(ref) => {
            setViewState({
              positionX: ref.state.positionX,
              positionY: ref.state.positionY,
              scale: ref.state.scale,
            });
          }}
          onTransform={(_ref, state) => {
            setViewState({
              positionX: state.positionX,
              positionY: state.positionY,
              scale: state.scale,
            });
          }}
          onPanningStart={() => setIsPanning(true)}
          onPanningStop={() => setIsPanning(false)}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: `${safeW}px`, height: `${safeH}px` }}
          >
            <svg
              width={safeW}
              height={safeH}
              viewBox={`${bounds.minX} ${bounds.minY} ${safeW} ${safeH}`}
              className="block overflow-visible select-none"
              role="img"
              aria-label={title || 'Interactive pan and zoom hardware schematic diagram'}
            >
              <defs>{renderDefs?.()}</defs>
              {children}
            </svg>
          </TransformComponent>
        </TransformWrapper>

        {/* Top-Right Pan & Zoom Control Deck */}
        <div
          className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/95 backdrop-blur-sm p-1 shadow-sm"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => transformRef.current?.zoomOut(0.2, 160)}
            title="Zoom Out"
            aria-label="Zoom out diagram"
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFitView}
            title="Fit and center schematic"
            className="px-2 py-1 rounded text-[11px] font-mono tabular-nums font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            {Math.round(viewState.scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => transformRef.current?.zoomIn(0.2, 160)}
            title="Zoom In"
            aria-label="Zoom in diagram"
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-[var(--border-subtle)] mx-0.5" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setScrollZoomEnabled((v) => !v)}
            title={
              scrollZoomEnabled
                ? 'Direct mouse-wheel zoom enabled (click to unlock page scroll)'
                : 'Enable direct mouse-wheel zoom (or hold Ctrl/Cmd + Wheel)'
            }
            aria-label="Toggle mouse wheel zoom"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              scrollZoomEnabled
                ? 'bg-[var(--sem-control)]/15 text-[var(--sem-control)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <Mouse className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wheel</span>
          </button>

          <button
            type="button"
            onClick={handleFitView}
            title="Fit & Center Schematic"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </button>

          <button
            type="button"
            onClick={() => setMiniMapVisible((v) => !v)}
            title={miniMapVisible ? 'Hide Mini-Map Navigator' : 'Show Mini-Map Navigator'}
            aria-label="Toggle schematic mini-map navigator"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              miniMapVisible
                ? 'bg-[var(--sem-control)]/15 text-[var(--sem-control)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Map</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse diagram height' : 'Expand diagram workspace'}
            aria-label={expanded ? 'Collapse diagram height' : 'Expand diagram workspace'}
            className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Interactive Bottom-Right Mini-Map Navigator Overlay */}
        {miniMapVisible && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="hidden sm:flex flex-col absolute bottom-3 right-3 z-10 w-44 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/92 backdrop-blur-sm shadow-sm overflow-hidden"
          >
            <div className="px-2 py-1 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
              <span>Mini-Map · Click/Drag</span>
              <button
                type="button"
                onClick={handleFitView}
                className="text-[var(--sem-control)] hover:underline cursor-pointer"
                title="Center viewport on schematic"
              >
                Center
              </button>
            </div>
            <svg
              ref={minimapSvgRef}
              viewBox={`${minimapFrame.minX} ${minimapFrame.minY} ${minimapFrame.width} ${minimapFrame.height}`}
              className="w-full h-24 bg-[var(--mesh-bg)] cursor-crosshair touch-none"
              onPointerDown={(e) => {
                e.stopPropagation();
                minimapDragRef.current = true;
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore in synthetic environments
                }
                jumpToMiniMapClientPoint(e.clientX, e.clientY, true);
              }}
              onPointerMove={(e) => {
                if (!minimapDragRef.current) return;
                e.stopPropagation();
                jumpToMiniMapClientPoint(e.clientX, e.clientY, false);
              }}
              onPointerUp={(e) => {
                minimapDragRef.current = false;
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  // Ignore
                }
              }}
              onPointerCancel={() => {
                minimapDragRef.current = false;
              }}
              aria-label="Interactive diagram mini-map navigator"
            >
              {/* Schematic bounds outline */}
              <rect
                x={bounds.minX}
                y={bounds.minY}
                width={safeW}
                height={safeH}
                fill="none"
                stroke="var(--mesh-major-line)"
                strokeDasharray="10 8"
                strokeWidth={Math.max(1.5, minimapFrame.width * 0.0025)}
              />

              {/* Topology links */}
              {minimapLinks?.map((lk, idx) => (
                <line
                  key={idx}
                  x1={lk.x1}
                  y1={lk.y1}
                  x2={lk.x2}
                  y2={lk.y2}
                  stroke="var(--sem-control)"
                  strokeOpacity={0.38}
                  strokeWidth={Math.max(2.5, minimapFrame.width * 0.004)}
                />
              ))}

              {/* Topology block footprints */}
              {minimapItems && minimapItems.length > 0 ? (
                minimapItems.map((item) => (
                  <rect
                    key={item.id}
                    x={item.x}
                    y={item.y}
                    width={item.width}
                    height={item.height}
                    rx={6}
                    fill={item.color || 'var(--sem-control)'}
                    fillOpacity={item.active ? 0.55 : 0.25}
                    stroke={item.color || 'var(--sem-control)'}
                    strokeWidth={
                      item.active
                        ? Math.max(4, minimapFrame.width * 0.007)
                        : Math.max(2, minimapFrame.width * 0.0035)
                    }
                  />
                ))
              ) : (
                <rect
                  x={bounds.minX + safeW * 0.08}
                  y={bounds.minY + safeH * 0.12}
                  width={safeW * 0.84}
                  height={safeH * 0.76}
                  rx={12}
                  fill="var(--sem-control)"
                  fillOpacity={0.12}
                  stroke="var(--sem-control)"
                  strokeOpacity={0.4}
                  strokeWidth={Math.max(2, minimapFrame.width * 0.0035)}
                />
              )}

              {/* Live Active Viewport Frame */}
              <rect
                x={vpWorld.x}
                y={vpWorld.y}
                width={Math.max(20, vpWorld.w)}
                height={Math.max(16, vpWorld.h)}
                rx={6}
                fill="var(--sem-control)"
                fillOpacity={0.14}
                stroke="var(--sem-control)"
                strokeWidth={Math.max(4, minimapFrame.width * 0.008)}
              />
            </svg>
          </div>
        )}

        {/* Bottom-Left Infinite Pan Navigation HUD */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/90 backdrop-blur-sm px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
          <Move className="w-3.5 h-3.5 text-[var(--sem-control)] shrink-0" />
          <span>Drag to pan · Pinch / Ctrl+Wheel to zoom · Click blocks to inspect</span>
          <span className="hidden md:inline font-mono tabular-nums text-[10px] opacity-80">
            · Pan ({Math.round(viewState.positionX)}, {Math.round(viewState.positionY)})
          </span>
        </div>
      </div>

      {footer && (
        <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          {footer}
        </div>
      )}
    </div>
  );
};
