import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  GitBranch,
  ArrowRight,
  Route,
  SlidersHorizontal,
  Sparkles,
  FileCode2,
  ShieldCheck,
  BookOpen,
  Cpu,
  Layers,
  ExternalLink,
  Upload,
  X,
  Plus,
  Map as MapIcon,
} from 'lucide-react';
import { PROJECTS } from '../data/ips';
import {
  defaultKgFilters,
  EXAMPLE_INTELLIGENCE_QUERIES,
  exportEdgesToCsv,
  exportEntityToMarkdown,
  exportGraphToJson,
  exportSubgraphToMermaid,
  findShortestPathBFS,
  getKnowledgeGraph,
  getModeCenterNodes,
  getNeighborhoodSubgraph,
  ingestRepoProfileIntoGraph,
  resetKnowledgeGraphCache,
  runNaturalLanguageQuery,
  searchGraphNodes,
} from '../data/knowledgeGraphEngine';
import {
  KgEdge,
  KgEdgeConfidence,
  KgEvidenceLabel,
  KgExplorationMode,
  KgFilterState,
  KgNode,
  KgNodeType,
  KgQueryResult,
} from '../types/knowledgeGraph';
import { ingestRepositoryFiles } from '../utils/rtlParser';

interface KnowledgeGraphViewProps {
  initialNodeId?: string;
  onSelectIp: (ipId: string) => void;
  onSelectProtocol: (protoId: string) => void;
  onOpenSocExplorer: () => void;
}

const EXPLORATION_MODES: KgExplorationMode[] = [
  'Protocol-Centric',
  'IP-Centric',
  'Processor-Centric',
  'SoC-Centric',
  'RTL-Centric',
  'Verification-Centric',
  'Standards-Centric',
];

const NODE_STYLE: Record<KgNodeType, { label: string; color: string; bgClass: string }> = {
  protocol: { label: 'Protocol', color: '#3b82f6', bgClass: 'bg-blue-500' },
  ip_core: { label: 'IP Core', color: '#10b981', bgClass: 'bg-emerald-500' },
  processor: { label: 'Processor', color: '#8b5cf6', bgClass: 'bg-violet-500' },
  soc: { label: 'SoC Platform', color: '#f97316', bgClass: 'bg-orange-500' },
  rtl_module: { label: 'RTL Module', color: '#06b6d4', bgClass: 'bg-cyan-500' },
  rtl_signal: { label: 'Interface / Signal', color: '#0ea5e9', bgClass: 'bg-sky-500' },
  verification_env: { label: 'Verification Env', color: '#eab308', bgClass: 'bg-yellow-500' },
  uvm_component: { label: 'UVM Component', color: '#f59e0b', bgClass: 'bg-amber-500' },
  verification_test: { label: 'Test / Coverage', color: '#84cc16', bgClass: 'bg-lime-500' },
  standard: { label: 'Standard', color: '#ec4899', bgClass: 'bg-pink-500' },
  register: { label: 'CSR / Register', color: '#6366f1', bgClass: 'bg-indigo-500' },
  eda_tool: { label: 'EDA Tool', color: '#64748b', bgClass: 'bg-slate-500' },
  project: { label: 'Project Repo', color: '#d97706', bgClass: 'bg-amber-600' },
  memory: { label: 'Memory IP', color: '#14b8a6', bgClass: 'bg-teal-500' },
  security: { label: 'Security IP', color: '#ef4444', bgClass: 'bg-rose-500' },
};

const NODE_TIER: Record<KgNodeType, number> = {
  standard: 0,
  project: 0,
  soc: 1,
  processor: 2,
  ip_core: 2,
  security: 2,
  memory: 2,
  protocol: 3,
  rtl_module: 4,
  rtl_signal: 4,
  register: 4,
  verification_env: 5,
  uvm_component: 6,
  verification_test: 6,
  eda_tool: 6,
};

type LayoutAlgorithm = 'hierarchical' | 'radial' | 'grid';

function computeInitialPositions(
  nodes: KgNode[],
  centerId: string,
  layout: LayoutAlgorithm
): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  if (nodes.length === 0) return pos;

  if (layout === 'radial') {
    const cx = 540;
    const cy = 340;
    pos[centerId] = { x: cx, y: cy };
    const others = nodes.filter((n) => n.id !== centerId);
    const innerRing = others.slice(0, Math.min(10, others.length));
    const outerRing = others.slice(innerRing.length);

    innerRing.forEach((n, idx) => {
      const ang = (idx / Math.max(1, innerRing.length)) * Math.PI * 2 - Math.PI / 2;
      pos[n.id] = { x: cx + Math.cos(ang) * 215, y: cy + Math.sin(ang) * 185 };
    });
    outerRing.forEach((n, idx) => {
      const ang = (idx / Math.max(1, outerRing.length)) * Math.PI * 2 - Math.PI / 3;
      pos[n.id] = { x: cx + Math.cos(ang) * 395, y: cy + Math.sin(ang) * 305 };
    });
    return pos;
  }

  if (layout === 'grid') {
    const cols = Math.max(3, Math.ceil(Math.sqrt(nodes.length)));
    nodes.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      pos[n.id] = { x: 130 + col * 210, y: 90 + row * 120 };
    });
    return pos;
  }

  // Hierarchical Layered Semiconductor Stack (Standards -> SoCs -> Processors/IPs -> Protocols -> RTL -> Verification/Tools)
  const tiers = new Map<number, KgNode[]>();
  nodes.forEach((n) => {
    const t = NODE_TIER[n.nodeType] ?? 3;
    if (!tiers.has(t)) tiers.set(t, []);
    tiers.get(t)!.push(n);
  });

  const sortedTiers = Array.from(tiers.keys()).sort((a, b) => a - b);
  sortedTiers.forEach((tierKey, colIdx) => {
    const bucket = tiers.get(tierKey)!;
    const x = 130 + colIdx * 230;
    const totalH = bucket.length * 102;
    const startY = Math.max(70, 340 - totalH / 2 + 45);
    bucket.forEach((n, rowIdx) => {
      pos[n.id] = { x, y: startY + rowIdx * 102 };
    });
  });

  return pos;
}

function downloadBlob(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  initialNodeId,
  onSelectIp,
  onSelectProtocol,
  onOpenSocExplorer,
}) => {
  const [graphVersion, setGraphVersion] = useState(0);
  const store = useMemo(() => {
    void graphVersion;
    return getKnowledgeGraph();
  }, [graphVersion]);

  const [mode, setMode] = useState<KgExplorationMode>('Processor-Centric');
  const [seedIds, setSeedIds] = useState<string[]>(() =>
    initialNodeId && store.nodes.has(initialNodeId) ? [initialNodeId] : ['ip:ibex']
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>(() =>
    initialNodeId && store.nodes.has(initialNodeId) ? initialNodeId : 'ip:ibex'
  );
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hops, setHops] = useState<number>(2);
  const [layout, setLayout] = useState<LayoutAlgorithm>('hierarchical');
  const [filters, setFilters] = useState<KgFilterState>(defaultKgFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Search & Natural-Language Query Engine
  const [sidebarQuery, setSidebarQuery] = useState('');
  const deferredSidebarQuery = useDeferredValue(sidebarQuery);
  const [nlQuery, setNlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<KgQueryResult | null>(null);

  // Path Finder
  const [pathFinderOpen, setPathFinderOpen] = useState(false);
  const [pathStartId, setPathStartId] = useState('ip:ibex');
  const [pathEndId, setPathEndId] = useState('ip:opentitan-sram-ctrl');
  const [activePath, setActivePath] = useState<{ found: boolean; nodeIds: string[]; edgeIds: string[] } | null>(null);

  // Canvas Interaction (Zoom, Pan, Drag Nodes, Mini-Map, Fullscreen)
  const [zoom, setZoom] = useState(0.92);
  const [pan, setPan] = useState({ x: 30, y: 20 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const kgCanvasRef = useRef<HTMLDivElement | null>(null);
  const kgMinimapSvgRef = useRef<SVGSVGElement | null>(null);
  const kgMinimapDragRef = useRef(false);
  const [kgVpSize, setKgVpSize] = useState<{ w: number; h: number }>({ w: 720, h: 620 });
  const [showKgMiniMap, setShowKgMiniMap] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const el = kgCanvasRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setKgVpSize((prev) =>
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
  }, [fullscreen]);

  // Inspector Tabs & Ingestion Drawer
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'links' | 'provenance'>('overview');
  const [showIngestDrawer, setShowIngestDrawer] = useState(false);
  const [pasteName, setPasteName] = useState('rtl/custom_axi_dma.sv');
  const [pasteCode, setPasteCode] = useState(
    `module custom_axi_dma #(
  parameter int DATA_W = 64
) (
  input  logic clk_i,
  input  logic rst_ni,
  output logic m_axi_awvalid,
  input  logic m_axi_awready,
  output logic m_axi_wvalid,
  input  logic m_axi_wready,
  output logic m_axi_wlast,
  input  logic s_axis_tvalid,
  output logic s_axis_tready
);
  axi_fifo_sync u_fifo (.clk_i(clk_i));
  dma_desc_engine u_desc (.clk_i(clk_i));
  assert property (@(posedge clk_i) disable iff (!rst_ni) m_axi_awvalid && !m_axi_awready |=> m_axi_awvalid);
endmodule`
  );
  const [ingestBanner, setIngestBanner] = useState<string | null>(null);

  useEffect(() => {
    if (initialNodeId && store.nodes.has(initialNodeId)) {
      setSeedIds([initialNodeId]);
      setSelectedNodeId(initialNodeId);
    }
  }, [initialNodeId, store]);

  const subgraph = useMemo(() => {
    const base = getNeighborhoodSubgraph(store, seedIds, hops, filters, 34);
    if (activePath?.found) {
      const nodeSet = new Set(base.nodes.map((n) => n.id));
      for (const pid of activePath.nodeIds) {
        if (!nodeSet.has(pid) && store.nodes.has(pid)) {
          base.nodes.push(store.nodes.get(pid)!);
          nodeSet.add(pid);
        }
      }
      const edgeSet = new Set(base.edges.map((e) => e.id));
      for (const eid of activePath.edgeIds) {
        const edge = store.edges.find((e) => e.id === eid);
        if (edge && !edgeSet.has(edge.id)) {
          base.edges.push(edge);
          edgeSet.add(edge.id);
        }
      }
    }
    return base;
  }, [store, seedIds, hops, filters, activePath]);

  // Recompute clean layout when topology changes
  const topologySignature = useMemo(
    () => `${layout}:${subgraph.nodes.map((n) => n.id).sort().join(',')}`,
    [layout, subgraph.nodes]
  );

  useEffect(() => {
    setNodePositions(computeInitialPositions(subgraph.nodes, selectedNodeId, layout));
  }, [topologySignature]);

  const sidebarEntities = useMemo(
    () => searchGraphNodes(store, deferredSidebarQuery, filters, 80),
    [store, deferredSidebarQuery, filters]
  );

  const selectedNode = store.nodes.get(selectedNodeId) || subgraph.nodes[0] || null;
  const selectedOutgoing = selectedNode ? store.outgoing.get(selectedNode.id) || [] : [];
  const selectedIncoming = selectedNode ? store.incoming.get(selectedNode.id) || [] : [];
  const selectedEdge = selectedEdgeId ? store.edges.find((e) => e.id === selectedEdgeId) || null : null;

  const switchMode = (nextMode: KgExplorationMode) => {
    setMode(nextMode);
    setActivePath(null);
    setQueryResult(null);
    const centers = getModeCenterNodes(nextMode);
    setSeedIds(centers);
    if (centers[0]) setSelectedNodeId(centers[0]);
    setPan({ x: 30, y: 20 });
    setZoom(0.9);
  };

  const focusNode = (id: string, preserveSeeds = false) => {
    if (!store.nodes.has(id)) return;
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    if (!preserveSeeds) {
      setSeedIds([id]);
    } else if (!seedIds.includes(id)) {
      setSeedIds((prev) => [...prev.slice(-4), id]);
    }
  };

  const handleRunNlQuery = (qText?: string) => {
    const queryToRun = (qText ?? nlQuery).trim();
    if (!queryToRun) return;
    setNlQuery(queryToRun);
    const res = runNaturalLanguageQuery(store, queryToRun);
    setQueryResult(res);
    setActivePath(
      res.highlightEdgeIds.length > 0
        ? { found: true, nodeIds: res.matchedNodeIds, edgeIds: res.highlightEdgeIds }
        : null
    );
    if (res.modeRecommendation) setMode(res.modeRecommendation);
    setSeedIds(res.matchedNodeIds.length ? res.matchedNodeIds.slice(0, 8) : [res.centerNodeId]);
    setSelectedNodeId(res.centerNodeId);
  };

  const handleFindShortestPath = () => {
    const res = findShortestPathBFS(store, pathStartId, pathEndId, 6);
    setActivePath(res);
    if (res.found) {
      setSeedIds(res.nodeIds);
      setSelectedNodeId(res.nodeIds[0]);
    }
  };

  const handleIngestCustomRtl = () => {
    const profile = ingestRepositoryFiles(
      pasteName.replace(/\.[^/.]+$/, ''),
      'local://knowledge-graph-ingest',
      [{ path: pasteName || 'custom_ip.sv', content: pasteCode }],
      { description: 'Live SystemVerilog/RTL module parsed directly into Semiconductor Knowledge Graph' }
    );
    const patch = ingestRepoProfileIntoGraph(store, profile);
    setGraphVersion((v) => v + 1);
    setSeedIds([patch.centerNodeId]);
    setSelectedNodeId(patch.centerNodeId);
    setShowIngestDrawer(false);
    setIngestBanner(
      `Injected ${patch.addedNodes} RTL/Protocol nodes and ${patch.addedEdges} verified/inferred edges from ${pasteName}.`
    );
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const xml = new XMLSerializer().serializeToString(svgRef.current);
    downloadBlob(`vlsi-knowledge-graph-${selectedNodeId}.svg`, xml, 'image/svg+xml;charset=utf-8');
  };

  const handleExportPng = () => {
    if (!svgRef.current) return;
    const xml = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#080E1A' : '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pUrl = URL.createObjectURL(pngBlob);
            const a = document.createElement('a');
            a.href = pUrl;
            a.download = `vlsi-knowledge-graph-${selectedNodeId}.png`;
            a.click();
            URL.revokeObjectURL(pUrl);
          }
        }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const kgWorldBounds = useMemo(() => {
    const pts = subgraph.nodes
      .map((n) => nodePositions[n.id])
      .filter((p): p is { x: number; y: number } => Boolean(p));
    if (pts.length === 0) return { minX: 0, minY: 0, width: 1200, height: 720 };
    const padX = 150;
    const padY = 100;
    const minX = Math.min(...pts.map((p) => p.x - 83)) - padX;
    const minY = Math.min(...pts.map((p) => p.y - 28)) - padY;
    const maxX = Math.max(...pts.map((p) => p.x + 83)) + padX;
    const maxY = Math.max(...pts.map((p) => p.y + 28)) + padY;
    return {
      minX,
      minY,
      width: Math.max(480, maxX - minX),
      height: Math.max(320, maxY - minY),
    };
  }, [subgraph.nodes, nodePositions]);

  const kgVpWorld = useMemo(() => {
    const safeZoom = Math.max(0.1, zoom);
    return {
      x: -pan.x / safeZoom,
      y: -pan.y / safeZoom,
      w: kgVpSize.w / safeZoom,
      h: kgVpSize.h / safeZoom,
    };
  }, [pan.x, pan.y, zoom, kgVpSize.w, kgVpSize.h]);

  const fitToScreen = useCallback(() => {
    const targetZoom = Math.min(
      1.05,
      Math.max(
        0.38,
        Math.min((kgVpSize.w - 32) / kgWorldBounds.width, (kgVpSize.h - 32) / kgWorldBounds.height)
      )
    );
    const centerX = kgWorldBounds.minX + kgWorldBounds.width / 2;
    const centerY = kgWorldBounds.minY + kgWorldBounds.height / 2;
    setZoom(+targetZoom.toFixed(2));
    setPan({
      x: kgVpSize.w / 2 - centerX * targetZoom,
      y: kgVpSize.h / 2 - centerY * targetZoom,
    });
  }, [kgVpSize.h, kgVpSize.w, kgWorldBounds.height, kgWorldBounds.minX, kgWorldBounds.minY, kgWorldBounds.width]);

  const jumpKgMiniMap = useCallback(
    (clientX: number, clientY: number) => {
      const svg = kgMinimapSvgRef.current;
      if (!svg) return;
      let worldX = kgWorldBounds.minX + kgWorldBounds.width / 2;
      let worldY = kgWorldBounds.minY + kgWorldBounds.height / 2;

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
          worldX = kgWorldBounds.minX + ((clientX - rect.left) / rect.width) * kgWorldBounds.width;
          worldY = kgWorldBounds.minY + ((clientY - rect.top) / rect.height) * kgWorldBounds.height;
        }
      }

      setPan({
        x: kgVpSize.w / 2 - worldX * zoom,
        y: kgVpSize.h / 2 - worldY * zoom,
      });
    },
    [kgVpSize.h, kgVpSize.w, kgWorldBounds.height, kgWorldBounds.minX, kgWorldBounds.minY, kgWorldBounds.width, zoom]
  );

  const toggleNodeTypeFilter = (t: KgNodeType) => {
    setFilters((prev) => {
      const next = new Set(prev.nodeTypes);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return { ...prev, nodeTypes: next };
    });
  };

  const toggleConfidenceFilter = (c: KgEdgeConfidence) => {
    setFilters((prev) => {
      const next = new Set(prev.confidences);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return { ...prev, confidences: next };
    });
  };

  // Pointer dragging for SVG nodes and canvas pan
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.x) / zoom;
    const dy = (e.clientY - dragStartRef.current.y) / zoom;

    if (draggingNodeId) {
      const origX = dragStartRef.current.origX;
      const origY = dragStartRef.current.origY;
      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: origX + dx, y: origY + dy },
      }));
    } else if (isPanning) {
      setPan({
        x: dragStartRef.current.origX + (e.clientX - dragStartRef.current.x),
        y: dragStartRef.current.origY + (e.clientY - dragStartRef.current.y),
      });
    }
  };

  const handleSvgPointerUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
    dragStartRef.current = null;
  };

  const pathNodeSet = new Set(activePath?.nodeIds || []);
  const pathEdgeSet = new Set(activePath?.edgeIds || []);

  return (
    <div
      className={`${
        fullscreen ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#0B1120] p-4 overflow-y-auto' : 'max-w-[1440px] mx-auto px-4 sm:px-6 py-5'
      } space-y-4`}
    >
      {/* Header + 7 Exploration Mode Switcher */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
              Semiconductor Engineering Knowledge Graph Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Interactive Silicon Intelligence Graph
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Explore {store.nodes.size.toLocaleString()} entities &amp; {store.edges.length.toLocaleString()} verified/inferred relationships across Protocols, Open-Source IPs, Processors, SoCs, RTL Modules, UVM Environments, Standards &amp; EDA Tools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPathFinderOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                pathFinderOpen
                  ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-cyan-500'
              }`}
            >
              <Route className="w-3.5 h-3.5" /> Shortest Path
            </button>
            <button
              type="button"
              onClick={() => setShowIngestDrawer((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 font-medium cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Ingest RTL into Graph
            </button>
            <button
              type="button"
              onClick={() => {
                resetKnowledgeGraphCache();
                setGraphVersion((v) => v + 1);
                setIngestBanner(null);
                switchMode('Processor-Centric');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-cyan-500 cursor-pointer"
              title="Reset Knowledge Graph state"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* 7 Graph Exploration Modes */}
        <div className="flex flex-wrap items-center gap-1.5">
          {EXPLORATION_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === m
                  ? 'bg-cyan-600 text-white'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-cyan-500'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Natural-Language Graph Intelligence Query Bar */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunNlQuery();
              }}
              placeholder='Ask engineering graph question (e.g. "How does Ibex communicate with memory in OpenTitan?" or "Which UVM components exist for AXI4?")'
              className="flex-1 min-w-[260px] px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => handleRunNlQuery()}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-slate-900 dark:bg-cyan-600 text-white hover:opacity-90 cursor-pointer whitespace-nowrap"
            >
              Query Graph
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 mr-1">Example queries:</span>
            {EXAMPLE_INTELLIGENCE_QUERIES.slice(0, 6).map((eq) => (
              <button
                key={eq}
                type="button"
                onClick={() => handleRunNlQuery(eq)}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300 cursor-pointer"
              >
                {eq}
              </button>
            ))}
          </div>

          {queryResult && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-cyan-700 dark:text-cyan-400">{queryResult.interpretation}</div>
              <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300 space-y-0.5">
                {queryResult.explanationBullets.slice(0, 4).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Shortest Path Drawer */}
        {pathFinderOpen && (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-50/40 dark:bg-cyan-950/20 p-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Route className="w-4 h-4 text-cyan-600" /> Multi-Hop Shortest Path:
            </span>
            <select
              value={pathStartId}
              onChange={(e) => setPathStartId(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-[220px]"
            >
              {Array.from(store.nodes.values())
                .filter((n) => n.nodeType !== 'rtl_signal' && n.nodeType !== 'register')
                .slice(0, 120)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title} ({NODE_STYLE[n.nodeType].label})
                  </option>
                ))}
            </select>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={pathEndId}
              onChange={(e) => setPathEndId(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-[220px]"
            >
              {Array.from(store.nodes.values())
                .filter((n) => n.nodeType !== 'rtl_signal' && n.nodeType !== 'register')
                .slice(0, 120)
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title} ({NODE_STYLE[n.nodeType].label})
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleFindShortestPath}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer"
            >
              Trace Path
            </button>
            {activePath && (
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-200">
                {activePath.found
                  ? activePath.nodeIds.map((id) => store.nodes.get(id)?.title || id).join(' → ')
                  : 'No path within 6 hops'}
              </span>
            )}
          </div>
        )}

        {/* Live RTL Ingestion Quick Drawer */}
        {showIngestDrawer && (
          <div className="rounded-lg border border-emerald-500/35 bg-white dark:bg-slate-900 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-emerald-500" />
                Live RTL Source → Knowledge Graph Injector (.sv / .v / .hjson / .rdl)
              </div>
              <button type="button" onClick={() => setShowIngestDrawer(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={pasteName}
                onChange={(e) => setPasteName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-1.5 font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={handleIngestCustomRtl}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer"
              >
                Parse &amp; Inject Nodes Into Live Graph
              </button>
            </div>
            <textarea
              value={pasteCode}
              onChange={(e) => setPasteCode(e.target.value)}
              rows={5}
              className="w-full p-2.5 font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
        )}

        {ingestBanner && (
          <div className="px-3 py-2 rounded border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <span>{ingestBanner}</span>
            <button type="button" onClick={() => setIngestBanner(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3-Panel Interactive Explorer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT PANEL: Entity Explorer & Faceted Filters */}
        <aside className="lg:col-span-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 flex flex-col max-h-[700px]">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
              <span>Entity Explorer ({sidebarEntities.length})</span>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" /> {showFilters ? 'Hide Filters' : 'Filters'}
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder="Search protocols, IPs, RTL modules, UVM..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {showFilters && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-[11px] max-h-64 overflow-y-auto">
                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Project Filter</div>
                  <select
                    value={filters.projectId}
                    onChange={(e) => setFilters((p) => ({ ...p, projectId: e.target.value }))}
                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  >
                    <option value="ALL">All Projects</option>
                    {PROJECTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Edge Confidence</div>
                  <div className="flex flex-wrap gap-1">
                    {(['confirmed', 'inferred', 'association'] as KgEdgeConfidence[]).map((c) => {
                      const active = filters.confidences.has(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleConfidenceFilter(c)}
                          className={`px-2 py-0.5 rounded border cursor-pointer capitalize ${
                            active
                              ? 'bg-cyan-600 border-cyan-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Node Types</div>
                  <div className="grid grid-cols-2 gap-1">
                    {(Object.keys(NODE_STYLE) as KgNodeType[]).map((nt) => {
                      const active = filters.nodeTypes.has(nt);
                      return (
                        <button
                          key={nt}
                          type="button"
                          onClick={() => toggleNodeTypeFilter(nt)}
                          className={`px-1.5 py-0.5 rounded border text-left truncate cursor-pointer flex items-center gap-1 ${
                            active
                              ? 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                              : 'border-transparent text-slate-400 opacity-60'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${NODE_STYLE[nt].bgClass}`} />
                          <span className="truncate">{NODE_STYLE[nt].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {sidebarEntities.map((node) => {
              const active = node.id === selectedNodeId;
              const style = NODE_STYLE[node.nodeType];
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => focusNode(node.id)}
                  className={`w-full px-3 py-2.5 text-left transition-colors cursor-pointer ${
                    active ? 'bg-cyan-50/80 dark:bg-cyan-950/35' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {node.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${style.bgClass}`} />
                      {style.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {node.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* CENTER PANEL: Interactive Graph Canvas */}
        <section className="lg:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#080E1A] flex flex-col min-h-[640px] max-h-[700px] overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as LayoutAlgorithm)}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-[11px]"
                aria-label="Graph Layout Mode"
              >
                <option value="hierarchical">Layered Architecture</option>
                <option value="radial">Radial Hub</option>
                <option value="grid">Compact Matrix</option>
              </select>

              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded overflow-hidden text-[11px]">
                {[1, 2, 3].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHops(h)}
                    className={`px-2 py-1 cursor-pointer ${
                      hops === h ? 'bg-cyan-600 text-white font-semibold' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {h}-Hop
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.15).toFixed(2)))}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.15).toFixed(2)))}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={fitToScreen}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-[11px] cursor-pointer"
                title="Fit and center Knowledge Graph"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setShowKgMiniMap((v) => !v)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] cursor-pointer ${
                  showKgMiniMap
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                    : 'border-slate-200 dark:border-slate-700 hover:border-cyan-500 text-slate-600 dark:text-slate-300'
                }`}
                title={showKgMiniMap ? 'Hide Mini-Map Navigator' : 'Show Mini-Map Navigator'}
                aria-label="Toggle Knowledge Graph mini-map navigator"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                type="button"
                onClick={() => setFullscreen((f) => !f)}
                className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen Graph'}
              >
                {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={handleExportSvg}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                title="Export SVG diagram"
              >
                <Download className="w-3 h-3" /> SVG
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                title="Export PNG image"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    `kg-${selectedNodeId}.json`,
                    exportGraphToJson(subgraph.nodes, subgraph.edges),
                    'application/json'
                  )
                }
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    `kg-${selectedNodeId}-edges.csv`,
                    exportEdgesToCsv(store, subgraph.edges),
                    'text/csv'
                  )
                }
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    `kg-${selectedNodeId}.mmd`,
                    exportSubgraphToMermaid(subgraph.nodes, subgraph.edges)
                  )
                }
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
              >
                Mermaid
              </button>
            </div>
          </div>

          {/* Interactive Infinite-Mesh SVG Viewport */}
          <div ref={kgCanvasRef} className="relative flex-1 bg-[var(--mesh-bg)] overflow-hidden select-none">
            <svg
              ref={svgRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.08 : -0.08;
                setZoom((z) => Math.min(2.2, Math.max(0.35, +(z + delta).toFixed(2))));
              }}
              onPointerDown={(e) => {
                const target = e.target as Element;
                if (target.tagName === 'svg' || target.getAttribute('data-bg-mesh') === 'true') {
                  setIsPanning(true);
                  dragStartRef.current = { x: e.clientX, y: e.clientY, origX: pan.x, origY: pan.y };
                }
              }}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerLeave={handleSvgPointerUp}
            >
              <defs>
                <pattern
                  id="kg-mesh-subminor"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                >
                  <path
                    d="M 8 0 L 0 0 0 8"
                    fill="none"
                    stroke="var(--mesh-subminor-line)"
                    strokeWidth={0.6 / Math.max(0.55, zoom)}
                  />
                </pattern>
                <pattern
                  id="kg-mesh-minor"
                  width="32"
                  height="32"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                >
                  <path
                    d="M 32 0 L 0 0 0 32"
                    fill="none"
                    stroke="var(--mesh-minor-line)"
                    strokeWidth={0.85 / Math.max(0.45, zoom)}
                  />
                </pattern>
                <pattern
                  id="kg-mesh-major"
                  width="160"
                  height="160"
                  patternUnits="userSpaceOnUse"
                  patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                >
                  <path
                    d="M 160 0 L 0 0 0 160"
                    fill="none"
                    stroke="var(--mesh-major-line)"
                    strokeWidth={1.15 / Math.max(0.45, zoom)}
                  />
                  <path
                    d="M 0 0 H 6 M 0 0 V 6"
                    fill="none"
                    stroke="var(--mesh-crosshair)"
                    strokeWidth={1.25 / Math.max(0.55, zoom)}
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r={1.5 / Math.max(0.6, zoom)}
                    fill="var(--mesh-node-dot)"
                  />
                </pattern>
                <marker id="kg-arrow-confirmed" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 7 3, 0 6" fill="#06b6d4" />
                </marker>
                <marker id="kg-arrow-inferred" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 7 3, 0 6" fill="#f59e0b" />
                </marker>
                <marker id="kg-arrow-path" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0, 8 3.5, 0 7" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Infinite Engineering Mesh Background */}
              <rect width="100%" height="100%" fill="var(--mesh-bg)" data-bg-mesh="true" />
              {zoom >= 0.55 && (
                <rect width="100%" height="100%" fill="url(#kg-mesh-subminor)" data-bg-mesh="true" />
              )}
              <rect width="100%" height="100%" fill="url(#kg-mesh-minor)" data-bg-mesh="true" />
              <rect width="100%" height="100%" fill="url(#kg-mesh-major)" data-bg-mesh="true" />

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {subgraph.edges.map((edge) => {
                  const p1 = nodePositions[edge.source];
                  const p2 = nodePositions[edge.target];
                  if (!p1 || !p2) return null;

                  const dx = p2.x - p1.x;
                  const dy = p2.y - p1.y;
                  const ctrlX = (p1.x + p2.x) / 2;
                  const ctrlY = (p1.y + p2.y) / 2 - (Math.abs(dx) < 40 ? 0 : Math.sign(dy || 1) * 28);
                  const d = `M ${p1.x} ${p1.y} Q ${ctrlX} ${ctrlY} ${p2.x} ${p2.y}`;

                  const isPathEdge = pathEdgeSet.has(edge.id);
                  const isFocused =
                    isPathEdge ||
                    selectedEdgeId === edge.id ||
                    edge.source === selectedNodeId ||
                    edge.target === selectedNodeId;

                  const strokeDasharray =
                    edge.confidence === 'inferred'
                      ? '6 4'
                      : edge.confidence === 'association'
                      ? '2 4'
                      : undefined;

                  const strokeColor = isPathEdge
                    ? '#38bdf8'
                    : edge.confidence === 'inferred'
                    ? '#f59e0b'
                    : isFocused
                    ? '#06b6d4'
                    : '#64748b';

                  const midX = 0.25 * p1.x + 0.5 * ctrlX + 0.25 * p2.x;
                  const midY = 0.25 * p1.y + 0.5 * ctrlY + 0.25 * p2.y;

                  return (
                    <g
                      key={edge.id}
                      opacity={isFocused ? 1 : 0.35}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setSelectedEdgeId(edge.id);
                      }}
                      className="cursor-pointer"
                    >
                      <path
                        d={d}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isPathEdge ? 2.8 : isFocused ? 2 : 1.2}
                        strokeDasharray={strokeDasharray}
                        markerEnd={
                          isPathEdge
                            ? 'url(#kg-arrow-path)'
                            : edge.confidence === 'inferred'
                            ? 'url(#kg-arrow-inferred)'
                            : 'url(#kg-arrow-confirmed)'
                        }
                      />
                      {isFocused && (
                        <g>
                          <rect
                            x={midX - 50}
                            y={midY - 9}
                            width={100}
                            height={16}
                            rx={3}
                            className="fill-white/95 dark:fill-slate-900/95 stroke-slate-300 dark:stroke-slate-700"
                          />
                          <text
                            x={midX}
                            y={midY + 2}
                            textAnchor="middle"
                            className="font-mono text-[8.5px] font-medium fill-slate-700 dark:fill-cyan-300"
                          >
                            {edge.relation.length > 16 ? `${edge.relation.slice(0, 15)}..` : edge.relation}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {subgraph.nodes.map((node) => {
                  const pos = nodePositions[node.id];
                  if (!pos) return null;
                  const st = NODE_STYLE[node.nodeType];
                  const isSel = node.id === selectedNodeId;
                  const isOnPath = pathNodeSet.has(node.id);
                  const isSeed = seedIds.includes(node.id);

                  const w = 166;
                  const h = 56;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x - w / 2}, ${pos.y - h / 2})`}
                      onPointerDown={(ev) => {
                        ev.stopPropagation();
                        setDraggingNodeId(node.id);
                        dragStartRef.current = { x: ev.clientX, y: ev.clientY, origX: pos.x, origY: pos.y };
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                      }}
                      onDoubleClick={(ev) => {
                        ev.stopPropagation();
                        focusNode(node.id, true);
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        width={w}
                        height={h}
                        rx={8}
                        className={
                          isSel
                            ? 'fill-cyan-50 dark:fill-slate-800'
                            : 'fill-white dark:fill-slate-900'
                        }
                        stroke={isOnPath ? '#38bdf8' : isSel ? '#06b6d4' : st.color}
                        strokeWidth={isSel || isOnPath ? 2.6 : isSeed ? 2 : 1.4}
                      />
                      <rect x={1} y={1} width={w - 2} height={4} rx={2} fill={st.color} />
                      <text
                        x={10}
                        y={21}
                        className="font-mono text-[8.5px] uppercase fill-slate-500 dark:fill-slate-400"
                      >
                        {st.label}
                      </text>
                      <text
                        x={10}
                        y={36}
                        className="font-display text-[11.5px] font-semibold fill-slate-900 dark:fill-slate-100"
                      >
                        {node.title.length > 21 ? `${node.title.slice(0, 19)}..` : node.title}
                      </text>
                      <text
                        x={10}
                        y={48}
                        className="font-mono text-[8.5px] fill-slate-500 dark:fill-slate-400"
                      >
                        {node.evidence === 'OBSERVED_IN_RTL'
                          ? 'RTL VERIFIED'
                          : node.evidence === 'OFFICIAL_SPECIFICATION'
                          ? 'SPECIFICATION'
                          : node.evidence === 'OBSERVED_IN_VERIFICATION'
                          ? 'DV / UVM'
                          : 'DERIVED'}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Bottom-Left Color & Edge Legend */}
            <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-48 pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 rounded border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 text-[10px] text-slate-600 dark:text-slate-300">
              <span><strong>Solid</strong> Confirmed</span>
              <span><strong>Dashed</strong> Inferred</span>
              <span><strong>Dotted</strong> Association</span>
              <span aria-hidden="true">|</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Protocol</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Processor</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> IP</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> SoC</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> RTL</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> DV/UVM</span>
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500" /> Standard</span>
            </div>

            {/* Bottom-Right Interactive Mini-Map Navigator Overlay */}
            {showKgMiniMap && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="hidden sm:flex flex-col absolute bottom-2.5 right-2.5 z-10 w-44 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/92 backdrop-blur-sm shadow-sm overflow-hidden"
              >
                <div className="px-2 py-1 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                  <span>Mini-Map · Click/Drag</span>
                  <button
                    type="button"
                    onClick={fitToScreen}
                    className="text-[var(--sem-control)] hover:underline cursor-pointer"
                    title="Center viewport on Knowledge Graph"
                  >
                    Center
                  </button>
                </div>
                <svg
                  ref={kgMinimapSvgRef}
                  viewBox={`${kgWorldBounds.minX} ${kgWorldBounds.minY} ${kgWorldBounds.width} ${kgWorldBounds.height}`}
                  className="w-full h-24 bg-[var(--mesh-bg)] cursor-crosshair touch-none"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    kgMinimapDragRef.current = true;
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      // Ignore in synthetic environments
                    }
                    jumpKgMiniMap(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (!kgMinimapDragRef.current) return;
                    e.stopPropagation();
                    jumpKgMiniMap(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    kgMinimapDragRef.current = false;
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {
                      // Ignore
                    }
                  }}
                  onPointerCancel={() => {
                    kgMinimapDragRef.current = false;
                  }}
                  aria-label="Interactive Knowledge Graph mini-map navigator"
                >
                  {/* Graph bounds box */}
                  <rect
                    x={kgWorldBounds.minX + 20}
                    y={kgWorldBounds.minY + 20}
                    width={Math.max(40, kgWorldBounds.width - 40)}
                    height={Math.max(40, kgWorldBounds.height - 40)}
                    fill="none"
                    stroke="var(--mesh-major-line)"
                    strokeDasharray="12 10"
                    strokeWidth={Math.max(1.5, kgWorldBounds.width * 0.0025)}
                  />

                  {/* Edge topology lines */}
                  {subgraph.edges.map((edge) => {
                    const p1 = nodePositions[edge.source];
                    const p2 = nodePositions[edge.target];
                    if (!p1 || !p2) return null;
                    const isActiveEdge =
                      pathEdgeSet.has(edge.id) ||
                      selectedEdgeId === edge.id ||
                      edge.source === selectedNodeId ||
                      edge.target === selectedNodeId;
                    return (
                      <line
                        key={edge.id}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={isActiveEdge ? '#06b6d4' : 'var(--text-secondary)'}
                        strokeOpacity={isActiveEdge ? 0.65 : 0.25}
                        strokeWidth={Math.max(2, kgWorldBounds.width * 0.003)}
                      />
                    );
                  })}

                  {/* Node footprints */}
                  {subgraph.nodes.map((n) => {
                    const p = nodePositions[n.id];
                    if (!p) return null;
                    const color = NODE_STYLE[n.nodeType].color;
                    const isSel = n.id === selectedNodeId;
                    return (
                      <rect
                        key={n.id}
                        x={p.x - 83}
                        y={p.y - 28}
                        width={166}
                        height={56}
                        rx={8}
                        fill={color}
                        fillOpacity={isSel ? 0.72 : 0.34}
                        stroke={isSel ? '#06b6d4' : color}
                        strokeWidth={
                          isSel
                            ? Math.max(5, kgWorldBounds.width * 0.0065)
                            : Math.max(2, kgWorldBounds.width * 0.003)
                        }
                      />
                    );
                  })}

                  {/* Live Active Viewport Position Rectangle */}
                  <rect
                    x={kgVpWorld.x}
                    y={kgVpWorld.y}
                    width={Math.max(28, kgVpWorld.w)}
                    height={Math.max(20, kgVpWorld.h)}
                    rx={8}
                    fill="var(--sem-control)"
                    fillOpacity={0.14}
                    stroke="var(--sem-control)"
                    strokeWidth={Math.max(4, kgWorldBounds.width * 0.0075)}
                  />
                </svg>
              </div>
            )}
          </div>

          {selectedEdge && (
            <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                  {store.nodes.get(selectedEdge.source)?.title} —[{selectedEdge.relation}]→{' '}
                  {store.nodes.get(selectedEdge.target)?.title}
                </span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                  ({selectedEdge.confidence} · {selectedEdge.evidence}) {selectedEdge.notes ? `— ${selectedEdge.notes}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEdgeId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* RIGHT PANEL: Entity Intelligence Inspector */}
        <aside className="lg:col-span-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 flex flex-col max-h-[700px] overflow-hidden">
          {selectedNode ? (
            <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                    {NODE_STYLE[selectedNode.nodeType].label}
                  </span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">{selectedNode.evidence}</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {selectedNode.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedNode.subtitle}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => focusNode(selectedNode.id, false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-cyan-600 text-white hover:bg-cyan-500 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Center Graph Here
                  </button>
                  {selectedNode.appLink?.kind === 'protocol' && (
                    <button
                      type="button"
                      onClick={() => onSelectProtocol(selectedNode.appLink!.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                    >
                      <BookOpen className="w-3 h-3" /> Open Spec
                    </button>
                  )}
                  {selectedNode.appLink?.kind === 'ip' && (
                    <button
                      type="button"
                      onClick={() => onSelectIp(selectedNode.appLink!.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                    >
                      <Cpu className="w-3 h-3" /> Open IP
                    </button>
                  )}
                  {selectedNode.appLink?.kind === 'soc' && (
                    <button
                      type="button"
                      onClick={onOpenSocExplorer}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                    >
                      <Network className="w-3 h-3" /> Open SoC
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      downloadBlob(
                        `${selectedNode.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`,
                        exportEntityToMarkdown(store, selectedNode),
                        'text/markdown'
                      )
                    }
                    className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
                    title="Export Markdown Intelligence Report"
                  >
                    MD
                  </button>
                </div>

                {/* Inspector Sub-Tabs */}
                <div className="flex items-center gap-1 pt-2 text-[11px]">
                  {[
                    { id: 'overview' as const, label: 'Specs & DV' },
                    { id: 'links' as const, label: `Links (${selectedOutgoing.length + selectedIncoming.length})` },
                    { id: 'provenance' as const, label: 'Source / RTL' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInspectorTab(t.id)}
                      className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                        inspectorTab === t.id
                          ? 'bg-slate-900 dark:bg-slate-800 text-white dark:text-cyan-300'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {inspectorTab === 'overview' && (
                  <>
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Technical Summary</div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{selectedNode.summary}</p>
                      {selectedNode.architectureDescription && (
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                          {selectedNode.architectureDescription}
                        </p>
                      )}
                    </div>

                    {selectedNode.specs.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Specifications</div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded">
                          {selectedNode.specs.map((s) => (
                            <div key={s.label} className="px-2.5 py-1.5 flex items-start justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">{s.label}</span>
                              <span className="font-mono text-right text-slate-900 dark:text-slate-100 break-all">
                                {s.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedNode.parameters && selectedNode.parameters.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">Parameters</div>
                        <ul className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                          {selectedNode.parameters.slice(0, 6).map((p) => (
                            <li key={p.name}>
                              <strong className="text-cyan-700 dark:text-cyan-400">{p.name}</strong> = {p.value}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedNode.assertions && selectedNode.assertions.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Verification &amp; SVA Rules
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                          {selectedNode.assertions.slice(0, 5).map((a, idx) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {inspectorTab === 'links' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Outgoing Relationships ({selectedOutgoing.length})
                      </div>
                      {selectedOutgoing.length === 0 ? (
                        <div className="text-slate-500">None in current graph slice.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedOutgoing.map((e) => {
                            const t = store.nodes.get(e.target);
                            if (!t) return null;
                            return (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => focusNode(t.id, true)}
                                className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-left cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[10px] text-cyan-700 dark:text-cyan-400">
                                    {e.relation} · {e.confidence}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                </div>
                                <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                  {t.title}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Incoming Relationships ({selectedIncoming.length})
                      </div>
                      {selectedIncoming.length === 0 ? (
                        <div className="text-slate-500">None in current graph slice.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedIncoming.map((e) => {
                            const s = store.nodes.get(e.source);
                            if (!s) return null;
                            return (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => focusNode(s.id, true)}
                                className="w-full p-2 rounded border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-left cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                                    ← {e.relation} · {e.confidence}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                </div>
                                <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                                  {s.title}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {inspectorTab === 'provenance' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-1.5">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-600" /> Provenance &amp; Evidence
                      </div>
                      <div>
                        <span className="text-slate-500">Evidence Label:</span>{' '}
                        <span className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                          {selectedNode.evidence}
                        </span>
                      </div>
                      {selectedNode.provenance.standardNumber && (
                        <div>
                          <span className="text-slate-500">Standard:</span> {selectedNode.provenance.standardNumber}
                        </div>
                      )}
                      {selectedNode.provenance.filePath && (
                        <div className="font-mono text-[11px] break-all">
                          <span className="text-slate-500">File:</span> {selectedNode.provenance.filePath}
                        </div>
                      )}
                      {selectedNode.provenance.repoUrl && (
                        <a
                          href={selectedNode.provenance.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-400 hover:underline pt-1"
                        >
                          <GitBranch className="w-3 h-3" /> Upstream Repository <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {selectedNode.provenance.officialUrl && !selectedNode.provenance.repoUrl && (
                        <a
                          href={selectedNode.provenance.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-400 hover:underline pt-1"
                        >
                          Official Reference <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {selectedNode.provenance.sourceExcerpt && (
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">RTL Source Excerpt</div>
                        <pre className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
                          <code>{selectedNode.provenance.sourceExcerpt}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-xs text-slate-500">Select any entity node on the graph or left explorer.</div>
          )}
        </aside>
      </div>
    </div>
  );
};
