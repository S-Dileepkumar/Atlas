import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  ChevronDown,
  Compass,
  Dices,
  GitCompareArrows,
  HelpCircle,
  Menu,
  Moon,
  Palette,
  Printer,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { AppView, HomeDashboard } from './components/HomeDashboard';
import { AtlasLogoMark, BrandBannerLockup } from './components/BrandLogo';
import { SearchModal } from './components/SearchModal';
import { ALL_PROTOCOLS, getProtocolById } from './data/protocols';
import { ALL_IPS, getIpById } from './data/ips';
import { ALL_SOCS } from './data/socs';
import { ALL_EXPLAINER_TOPICS } from './data/explainers';
import { AES_CURRICULUM } from './data/aesCurriculum';
import type { CurriculumPillarId } from './data/rtlSvUvmCurriculum';
import type { CryptoLabTabId } from './crypto/CryptoStackView';
import {
  COLOR_PALETTE_STORAGE_KEY,
  COLOR_PALETTES,
  ColorPaletteId,
  THEME_MODE_STORAGE_KEY,
  isValidPaletteId,
} from './utils/themePalettes';

const ProtocolDocView = lazy(() => import('./components/ProtocolDocView').then((m) => ({ default: m.ProtocolDocView })));
const SimulatorLab = lazy(() => import('./components/SimulatorLab').then((m) => ({ default: m.SimulatorLab })));
const ComplianceChecker = lazy(() => import('./components/ComplianceChecker').then((m) => ({ default: m.ComplianceChecker })));
const ComparisonEngine = lazy(() => import('./components/ComparisonEngine').then((m) => ({ default: m.ComparisonEngine })));
const SocConnectivityMap = lazy(() => import('./components/SocMapAndUvm').then((m) => ({ default: m.SocConnectivityMap })));
const UvmGeneratorView = lazy(() => import('./components/SocMapAndUvm').then((m) => ({ default: m.UvmGeneratorView })));
const GlossaryView = lazy(() => import('./components/GlossaryView').then((m) => ({ default: m.GlossaryView })));
const IpUniverseExplorer = lazy(() => import('./components/IpUniverseExplorer').then((m) => ({ default: m.IpUniverseExplorer })));
const IpDetailView = lazy(() => import('./components/IpDetailView').then((m) => ({ default: m.IpDetailView })));
const SocExplorerView = lazy(() => import('./components/SocExplorerView').then((m) => ({ default: m.SocExplorerView })));
const RtlSourceEngineView = lazy(() => import('./components/RtlSourceEngineView').then((m) => ({ default: m.RtlSourceEngineView })));
const VerificationHubView = lazy(() => import('./components/VerificationHubView').then((m) => ({ default: m.VerificationHubView })));
const IpComparisonView = lazy(() => import('./components/IpComparisonView').then((m) => ({ default: m.IpComparisonView })));
const KnowledgeGraphView = lazy(() => import('./components/KnowledgeGraphView').then((m) => ({ default: m.KnowledgeGraphView })));
const RepoIngestionView = lazy(() => import('./components/RepoIngestionView').then((m) => ({ default: m.RepoIngestionView })));
const ClockDomainAnalyzerView = lazy(() => import('./components/ClockDomainAnalyzerView').then((m) => ({ default: m.ClockDomainAnalyzerView })));
const AesDeepDiveView = lazy(() => import('./components/AesDeepDiveView').then((m) => ({ default: m.AesDeepDiveView })));
const DocumentationCompletenessDashboard = lazy(() =>
  import('./components/DocumentationCompletenessDashboard').then((m) => ({ default: m.DocumentationCompletenessDashboard }))
);
const MasterArchitectureView = lazy(() => import('./components/MasterArchitectureView').then((m) => ({ default: m.MasterArchitectureView })));
const InteractiveExplainerView = lazy(() =>
  import('./components/explainer/InteractiveExplainerView').then((m) => ({ default: m.InteractiveExplainerView }))
);
const RtlSvUvmStudioView = lazy(() =>
  import('./components/RtlSvUvmStudioView').then((m) => ({ default: m.RtlSvUvmStudioView }))
);
const PlatformGuideView = lazy(() =>
  import('./components/PlatformGuideView').then((m) => ({ default: m.PlatformGuideView }))
);
const MindMapView = lazy(() =>
  import('./components/MindMapView').then((m) => ({ default: m.MindMapView }))
);
const CryptoStackView = lazy(() =>
  import('./crypto/CryptoStackView').then((m) => ({ default: m.CryptoStackView }))
);

function parseExplainerHash(): { active: boolean; topicId?: string; sceneIdx?: number; step?: number } {
  if (typeof window === 'undefined') return { active: false };
  const h = window.location.hash;
  if (!h.startsWith('#explainer')) return { active: false };
  const parts = h.replace(/^#explainer\/?/, '').split('/').filter(Boolean);
  const topicId = parts[0];
  const sceneIdx = parts[1]?.startsWith('s') ? Math.max(0, Number.parseInt(parts[1].slice(1), 10) - 1 || 0) : 0;
  const step = parts[2]?.startsWith('t') ? Math.max(0, Number.parseInt(parts[2].slice(1), 10) || 0) : 0;
  return { active: true, topicId, sceneIdx, step };
}

export default function App() {
  const initialHash = parseExplainerHash();
  const [view, setView] = useState<AppView>(() => (initialHash.active ? 'explainer' : 'home'));
  const [explainerDeepLink, setExplainerDeepLink] = useState<{ topicId?: string; sceneIdx?: number; step?: number }>(() => ({
    topicId: initialHash.topicId,
    sceneIdx: initialHash.sceneIdx,
    step: initialHash.step,
  }));
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('axi4');
  const [selectedIpId, setSelectedIpId] = useState<string>('ibex');
  const [kgInitialNodeId, setKgInitialNodeId] = useState<string | undefined>(undefined);
  const [cdcIpId, setCdcIpId] = useState<string>('opentitan-aes');
  const [aesSubtopicId, setAesSubtopicId] = useState<string | undefined>(undefined);
  const [cryptoTarget, setCryptoTarget] = useState<{
    chapterId?: string;
    subtopicId?: string;
    lab?: CryptoLabTabId;
  }>({});
  const [simProtocolId, setSimProtocolId] = useState<string>('axi4');
  const [compareProtoId, setCompareProtoId] = useState<string | undefined>(undefined);
  const [compareIpAId, setCompareIpAId] = useState<string | undefined>(undefined);
  const [curriculumModuleId, setCurriculumModuleId] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [quickJumpOpen, setQuickJumpOpen] = useState<boolean>(false);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const quickJumpRef = useRef<HTMLDivElement | null>(null);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [palette, setPalette] = useState<ColorPaletteId>(() => {
    try {
      const saved = localStorage.getItem(COLOR_PALETTE_STORAGE_KEY);
      return isValidPaletteId(saved) ? saved : 'silicon-cyan';
    } catch {
      return 'silicon-cyan';
    }
  });
  const [useCaseFilter, setUseCaseFilter] = useState<'all' | 'rtl' | 'uvm' | 'interview'>('all');
  const [mobileDocDrawerOpen, setMobileDocDrawerOpen] = useState<boolean>(false);
  const [luckyPick, setLuckyPick] = useState<{
    kind: 'Protocol' | 'Open-Source IP' | 'AES 7-Chapter Lab' | 'Clock Domain Analysis' | 'Waveform Lab';
    title: string;
    subtitle: string;
    scope: 'any' | 'protocol' | 'ip';
  } | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vpa_recent_protocols');
      return saved ? JSON.parse(saved) : ['axi4', 'axi4-lite', 'axi4-stream', 'pcie-gen5'];
    } catch {
      return ['axi4', 'axi4-lite', 'axi4-stream', 'pcie-gen5'];
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
    try {
      localStorage.setItem(COLOR_PALETTE_STORAGE_KEY, palette);
    } catch {
      // Ignore storage errors
    }
  }, [palette]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (quickJumpOpen) setQuickJumpOpen(false);
        if (paletteOpen) setPaletteOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable))
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (quickJumpRef.current && !quickJumpRef.current.contains(e.target as Node)) {
        setQuickJumpOpen(false);
      }
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [quickJumpOpen, paletteOpen]);

  const pickDifferent = <T,>(items: T[], getId: (item: T) => string, currentId?: string): T => {
    const pool = items.length > 1 && currentId ? items.filter((item) => getId(item) !== currentId) : items;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const openProtocol = (id: string, clearLucky = true) => {
    if (clearLucky) setLuckyPick(null);
    setSelectedProtocolId(id);
    setView('protocol');
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 6);
      try {
        localStorage.setItem('vpa_recent_protocols', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openIp = (id: string, clearLucky = true) => {
    if (clearLucky) setLuckyPick(null);
    setSelectedIpId(id);
    setView('ip-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigate = (v: AppView) => {
    setLuckyPick(null);
    if (v === 'rtl-design' || v === 'systemverilog' || v === 'uvm-studio') {
      setCurriculumModuleId(undefined);
    }
    setView(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCurriculum = (pillar: CurriculumPillarId, moduleId?: string) => {
    setLuckyPick(null);
    setCurriculumModuleId(moduleId);
    setView(pillar === 'rtl-design' ? 'rtl-design' : pillar === 'systemverilog' ? 'systemverilog' : 'uvm-studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openKnowledgeGraph = (nodeId?: string) => {
    setKgInitialNodeId(nodeId);
    setLuckyPick(null);
    setView('knowledge-graph');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openExplainer = (topicId?: string) => {
    setLuckyPick(null);
    setExplainerDeepLink({ topicId, sceneIdx: 0, step: 0 });
    setView('explainer');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', topicId ? `#explainer/${topicId}/s1/t0` : '#explainer');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFeelingLucky = (scope: 'any' | 'protocol' | 'ip' = 'any') => {
    const roll = Math.random();

    if (scope === 'protocol' || (scope === 'any' && roll < 0.45)) {
      const proto = pickDifferent(ALL_PROTOCOLS, (p) => p.id, view === 'protocol' ? selectedProtocolId : undefined);
      setLuckyPick({
        kind: 'Protocol',
        title: `${proto.name} — ${proto.fullName}`,
        subtitle: `${proto.standardBody} · ${proto.signals.length} mapped signals`,
        scope,
      });
      openProtocol(proto.id, false);
      return;
    }

    if (scope === 'ip' || (scope === 'any' && roll < 0.80)) {
      const ip = pickDifferent(ALL_IPS, (i) => i.id, view === 'ip-detail' ? selectedIpId : undefined);
      setLuckyPick({
        kind: 'Open-Source IP',
        title: `${ip.name} (${ip.category})`,
        subtitle: `${ip.rtlLanguage} · ${ip.modules.length} RTL modules · ${ip.interfaces.length} bus interfaces`,
        scope,
      });
      openIp(ip.id, false);
      return;
    }

    if (roll < 0.90) {
      const allAesTopics = AES_CURRICULUM.flatMap((ch) => ch.subtopics);
      const topic = pickDifferent(allAesTopics, (t) => t.id, view === 'aes-deep-dive' ? aesSubtopicId : undefined);
      setAesSubtopicId(topic.id);
      setView('aes-deep-dive');
      setLuckyPick({
        kind: 'AES 7-Chapter Lab',
        title: topic.title,
        subtitle: topic.level1Fundamental.summary,
        scope,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (roll < 0.95) {
      const multiClockIps = ALL_IPS.filter((i) => i.architecture.clocks.length >= 2);
      const cdcCandidate = pickDifferent(multiClockIps.length ? multiClockIps : ALL_IPS, (i) => i.id, view === 'cdc-analyzer' ? cdcIpId : undefined);
      setCdcIpId(cdcCandidate.id);
      setView('cdc-analyzer');
      setLuckyPick({
        kind: 'Clock Domain Analysis',
        title: `${cdcCandidate.name} CDC & Sync Boundary Map`,
        subtitle: `${cdcCandidate.architecture.clocks.length} clock domains (${cdcCandidate.architecture.clocks.join(', ')})`,
        scope,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const simIds = ['axi4', 'axi4-lite', 'axi4-stream', 'apb', 'spi', 'i2c', 'uart'];
    const simId = pickDifferent(simIds, (id) => id, view === 'simulator' ? simProtocolId : undefined);
    const simProto = getProtocolById(simId);
    setSimProtocolId(simId);
    setView('simulator');
    setLuckyPick({
      kind: 'Waveform Lab',
      title: `${simProto.name} Interactive Timing Simulator`,
      subtitle: 'Step cycle-by-cycle through signals, handshakes, and live protocol waveforms',
      scope,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Top Header Navigation: clean concise single-line links directly exposing Protocols, RTL Design, SV, UVM, IPs & Explainers
  const headerNavItems: Array<{ id: AppView; label: string; matchViews: AppView[] }> = [
    { id: 'home', label: 'Home', matchViews: ['home'] },
    {
      id: 'protocol-atlas',
      label: 'Protocol Atlas',
      matchViews: ['protocol-atlas', 'protocol', 'simulator', 'checker', 'compare', 'soc-map'],
    },
    {
      id: 'rtl-design',
      label: 'RTL Design',
      matchViews: ['rtl-design', 'rtl-explorer', 'cdc-analyzer'],
    },
    {
      id: 'systemverilog',
      label: 'SystemVerilog',
      matchViews: ['systemverilog'],
    },
    {
      id: 'uvm-studio',
      label: 'UVM',
      matchViews: ['uvm-studio', 'uvm', 'verification-hub'],
    },
    {
      id: 'ip-universe',
      label: 'IP Universe',
      matchViews: ['ip-universe', 'processors', 'gpus', 'ai-accelerators', 'ip-detail', 'ip-compare', 'soc-explorer', 'master-architecture', 'knowledge-graph', 'completeness-dashboard', 'repo-ingestion'],
    },
    { id: 'explainer', label: 'Explainers', matchViews: ['explainer'] },
    { id: 'crypto', label: 'Crypto & PQC', matchViews: ['crypto', 'aes-deep-dive'] },
    { id: 'mind-map', label: 'Mind Map', matchViews: ['mind-map'] },
  ];

  // Context-aware workspace sub-bars
  const PROTOCOL_HUB_VIEWS: AppView[] = ['protocol', 'simulator', 'checker', 'compare', 'soc-map'];
  const RTL_SV_UVM_VIEWS: AppView[] = ['rtl-design', 'systemverilog', 'uvm-studio', 'rtl-explorer', 'cdc-analyzer', 'uvm', 'verification-hub'];
  const IP_HUB_VIEWS: AppView[] = ['ip-universe', 'processors', 'gpus', 'ai-accelerators', 'ip-detail', 'ip-compare', 'soc-explorer', 'master-architecture', 'knowledge-graph', 'completeness-dashboard', 'repo-ingestion'];
  const CRYPTO_SECURITY_VIEWS: AppView[] = ['crypto', 'aes-deep-dive'];

  const subBarLinks: Array<{ id: AppView; label: string }> = PROTOCOL_HUB_VIEWS.includes(view)
    ? [
        { id: 'protocol', label: 'Protocol Specs' },
        { id: 'simulator', label: 'Waveform Lab' },
        { id: 'checker', label: 'Compliance Checker' },
        { id: 'compare', label: 'Protocol Compare' },
        { id: 'soc-map', label: 'Bus Fabric Map' },
        { id: 'rtl-design', label: 'RTL Handbook' },
        { id: 'systemverilog', label: 'SV Handbook' },
        { id: 'uvm-studio', label: 'UVM Handbook' },
      ]
    : RTL_SV_UVM_VIEWS.includes(view)
    ? [
        { id: 'rtl-design', label: 'RTL Design (14)' },
        { id: 'systemverilog', label: 'SystemVerilog (14)' },
        { id: 'uvm-studio', label: 'UVM Methodology (14)' },
        { id: 'rtl-explorer', label: 'RTL Source Explorer' },
        { id: 'cdc-analyzer', label: 'Clock Domains (CDC)' },
        { id: 'uvm', label: 'UVM & SVA Gen' },
        { id: 'verification-hub', label: 'Verification Hub' },
      ]
    : IP_HUB_VIEWS.includes(view)
    ? [
        { id: 'ip-universe', label: 'All Open-Source IPs' },
        { id: 'processors', label: 'Processors' },
        { id: 'gpus', label: 'GPUs' },
        { id: 'ai-accelerators', label: 'AI Accelerators' },
        { id: 'soc-explorer', label: 'SoC Explorer' },
        { id: 'master-architecture', label: '16-Domain Atlas' },
        { id: 'knowledge-graph', label: 'Knowledge Graph' },
        { id: 'ip-compare', label: 'Compare IPs' },
      ]
    : CRYPTO_SECURITY_VIEWS.includes(view)
    ? [
        { id: 'crypto', label: 'Crypto & PQC Stack (10 Chapters)' },
        { id: 'aes-deep-dive', label: 'AES 7-Chapter Lab' },
        { id: 'cdc-analyzer', label: 'Clock Domains (CDC)' },
        { id: 'rtl-design', label: 'RTL Design (14)' },
        { id: 'verification-hub', label: 'Verification Hub' },
        { id: 'ip-universe', label: 'Open-Source IPs' },
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Sticky 60px Stripe/Linear Engineering Header */}
      <header className="sticky top-0 z-40 h-[60px] border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          {/* Left: Mobile Drawer Trigger + Brand + Primary Hub Nav */}
          <div className="flex items-center gap-4 min-w-0">
            {view === 'protocol' && (
              <button
                type="button"
                onClick={() => setMobileDocDrawerOpen((v) => !v)}
                aria-label="Toggle protocol sidebar"
                className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer shrink-0"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('home')}
              className="inline-flex items-center gap-2 text-sm sm:text-base font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer hover:text-[var(--sem-control)] transition-colors"
            >
              <AtlasLogoMark className="w-6 h-6 shrink-0" />
              <span>VLSI Protocol Atlas</span>
            </button>

            <nav className="hidden lg:flex items-center gap-3 xl:gap-4 text-[12.5px] xl:text-[13px] font-medium pl-3 border-l border-[var(--border-subtle)]">
              {headerNavItems.map((item) => {
                const active = item.matchViews.includes(view);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id === 'protocol-atlas' ? 'protocol' : item.id)}
                    className={`whitespace-nowrap shrink-0 h-[60px] inline-flex items-center border-b-2 transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--sem-control)] text-[var(--text-primary)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Quick Jump + Compare Matrix + Guide + Search + Feeling Lucky + Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div ref={quickJumpRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setQuickJumpOpen((v) => !v)}
                aria-expanded={quickJumpOpen}
                aria-haspopup="menu"
                title="Quick Jump to KEM, Signatures, Side-Channel, NTT & IP Catalog"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  quickJumpOpen
                    ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--sem-control)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)]'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-[var(--sem-control)]" />
                <span>Quick Jump</span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>

              {quickJumpOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl py-1.5 z-50 text-xs"
                >
                  <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
                    Direct Silicon &amp; PQC Jumps
                  </div>
                  {[
                    {
                      label: 'KEM · ML-KEM (FIPS 203)',
                      meta: 'Ch 08 + Area Estimator',
                      action: () => {
                        setCryptoTarget({ chapterId: 'ch8-pqc', subtopicId: 'pqc-ml-kem', lab: 'params' });
                        navigate('crypto');
                      },
                    },
                    {
                      label: 'Signatures · ML-DSA & FN-DSA',
                      meta: 'Ch 08 + 2026 Matrix',
                      action: () => {
                        setCryptoTarget({ chapterId: 'ch8-pqc', subtopicId: 'pqc-ml-dsa', lab: 'pqc' });
                        navigate('crypto');
                      },
                    },
                    {
                      label: 'Side-Channel & Fault Lab',
                      meta: 'Ch 07 + DOM Power Trace',
                      action: () => {
                        setCryptoTarget({ chapterId: 'ch7-attacks', subtopicId: 'atk-sca', lab: 'sca' });
                        navigate('crypto');
                      },
                    },
                    {
                      label: 'NTT Butterfly Accelerator',
                      meta: 'Z_3329 Stage Inspector',
                      action: () => {
                        setCryptoTarget({ chapterId: 'ch8-pqc', subtopicId: 'pqc-ntt-math', lab: 'pqc' });
                        navigate('crypto');
                      },
                    },
                    {
                      label: 'IP Catalog (37 Silicon IPs)',
                      meta: 'Ibex, OpenTitan, CVA6, Vortex',
                      action: () => navigate('ip-universe'),
                    },
                    {
                      label: 'Protocol Specs (498 Buses)',
                      meta: 'AXI4, TL-UL, PCIe Gen5, CXL',
                      action: () => navigate('protocol'),
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setQuickJumpOpen(false);
                        item.action();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-[var(--text-primary)]">{item.label}</span>
                      <span className="font-mono text-[10px] text-[var(--sem-control)] shrink-0">
                        {item.meta}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('compare')}
              title="Open Protocol Comparison Matrix"
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'compare'
                  ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <GitCompareArrows className="w-4 h-4" />
              <span className="hidden xl:inline">Compare</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('guide')}
              title="How to Use & Where to Find What (Platform Guide)"
              aria-label="How to Use and Where to Find What"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'guide'
                  ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden xl:inline">Guide</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              title="Search Atlas (/ or Cmd+K)"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4 text-[var(--text-secondary)]" />
              <span className="hidden sm:inline">Search Atlas</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                /
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => handleFeelingLucky('any')}
              title="Jump to a random protocol, open-source IP, CDC map, or lab"
              aria-label="Feeling Lucky random discovery"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--sem-active)] hover:bg-[var(--bg-elevated)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Dices className="w-4 h-4" />
            </button>

            {/* Curated Color Palette Switcher */}
            <div ref={paletteRef} className="relative">
              <button
                type="button"
                onClick={() => setPaletteOpen((v) => !v)}
                aria-expanded={paletteOpen}
                aria-haspopup="menu"
                title="Select Color Palette"
                aria-label="Select Color Palette"
                className={`inline-flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  paletteOpen
                    ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--sem-control)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)]'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-[var(--sem-control)]" />
                <span className="hidden xl:inline">
                  {COLOR_PALETTES.find((p) => p.id === palette)?.name || 'Palette'}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full border border-[var(--border-subtle)]"
                  style={{ backgroundColor: 'var(--sem-control)' }}
                />
              </button>

              {paletteOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-80 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl p-2.5 z-50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-[var(--border-subtle)]">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      Engineering Color Palettes
                    </span>
                    <button
                      type="button"
                      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-3 h-3 text-[var(--sem-active)]" /> Dark
                        </>
                      ) : (
                        <>
                          <Moon className="w-3 h-3 text-[var(--sem-control)]" /> Light
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1">
                    {COLOR_PALETTES.map((opt) => {
                      const active = palette === opt.id;
                      const swatches = theme === 'dark' ? opt.darkSwatches : opt.lightSwatches;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setPalette(opt.id);
                            setPaletteOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-md border text-left transition-colors cursor-pointer flex items-start justify-between gap-2.5 ${
                            active
                              ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)]'
                              : 'border-transparent hover:bg-[var(--bg-canvas)] hover:border-[var(--border-subtle)]'
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                              <span>{opt.name}</span>
                              {active && <Check className="w-3.5 h-3.5 text-[var(--sem-control)]" />}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] leading-snug">
                              {opt.subtitle}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 pt-0.5" aria-hidden="true">
                            {swatches.map((hex) => (
                              <span
                                key={hex}
                                className="w-3 h-3 rounded-full border border-white/20 shadow-xs"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all duration-150 shrink-0 cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[var(--sem-active)] transition-transform duration-150 rotate-0" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--text-primary)] transition-transform duration-150 rotate-0" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile / tablet primary hub navigation (< lg) */}
      <div className="lg:hidden border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        {headerNavItems.map((item) => {
          const active = item.matchViews.includes(view);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id === 'protocol-atlas' ? 'protocol' : item.id)}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                active
                  ? 'bg-[var(--sem-control)] text-white dark:text-slate-950 font-semibold'
                  : 'text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1">
        {/* Clean Context-Aware Hub Sub-Bar */}
        {subBarLinks.length > 0 && (
          <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/70">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {subBarLinks.map((lnk) => {
                  const active = view === lnk.id || (lnk.id === 'ip-universe' && view === 'ip-detail');
                  return (
                    <button
                      key={lnk.id}
                      type="button"
                      onClick={() => navigate(lnk.id)}
                      className={`px-3 py-1 rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]/60 border border-transparent'
                      }`}
                    >
                      {lnk.label}
                    </button>
                  );
                })}
              </div>

              {/* Use-Case Filter when inside Protocol Docs */}
              {view === 'protocol' && (
                <div
                  role="group"
                  aria-label="Protocol Doc Focus Filter"
                  className="inline-flex items-center p-0.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shrink-0"
                >
                  {(
                    [
                      { id: 'all', label: 'All Focus' },
                      { id: 'rtl', label: 'RTL Focus' },
                      { id: 'uvm', label: 'UVM Focus' },
                      { id: 'interview', label: 'Interview Prep' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setUseCaseFilter(opt.id)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors whitespace-nowrap ${
                        useCaseFilter === opt.id
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lucky Discovery Banner (shown after rolling Feeling Lucky so users can chain random picks seamlessly) */}
        {luckyPick && (
          <div className="border-b border-[var(--sem-active)]/40 bg-[var(--bg-surface)]">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Dices className="w-4 h-4 text-[var(--sem-active)] shrink-0" />
                <div className="min-w-0 truncate">
                  <span className="font-semibold text-[var(--sem-active)]">
                    Lucky Pick · {luckyPick.kind}:
                  </span>{' '}
                  <strong className="text-[var(--text-primary)]">{luckyPick.title}</strong>
                  <span className="hidden sm:inline text-[var(--text-secondary)]">
                    {' '}— {luckyPick.subtitle}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleFeelingLucky(luckyPick.scope)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--sem-active)] hover:opacity-90 text-slate-950 font-semibold cursor-pointer"
                >
                  <Dices className="w-3 h-3" /> Roll Again
                </button>
                <button
                  type="button"
                  onClick={() => handleFeelingLucky('protocol')}
                  className="px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] font-medium cursor-pointer"
                >
                  Random Protocol
                </button>
                <button
                  type="button"
                  onClick={() => handleFeelingLucky('ip')}
                  className="px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] font-medium cursor-pointer"
                >
                  Random IP
                </button>
                <button
                  type="button"
                  onClick={() => setLuckyPick(null)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Dismiss Lucky Banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <Suspense
          fallback={
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12 space-y-4">
              <div className="h-7 w-64 rounded bg-[var(--bg-surface)] animate-pulse" />
              <div className="h-4 w-96 rounded bg-[var(--bg-surface)] animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="h-44 rounded-lg bg-[var(--bg-surface)] animate-pulse" />
                <div className="h-44 rounded-lg bg-[var(--bg-surface)] animate-pulse" />
                <div className="h-44 rounded-lg bg-[var(--bg-surface)] animate-pulse" />
              </div>
            </div>
          }
        >
          <div key={view} className="view-transition">
            {(view === 'home' || view === 'protocol-atlas') && (
              <HomeDashboard
                recentIds={recentIds}
                onSelectProtocol={openProtocol}
                onSelectIp={openIp}
                onNavigate={navigate}
                onOpenSearch={() => setSearchOpen(true)}
                onFeelingLucky={handleFeelingLucky}
                onOpenExplainer={openExplainer}
              />
            )}

            {view === 'protocol' && (
              <ProtocolDocView
                protocol={getProtocolById(selectedProtocolId)}
                useCaseFilter={useCaseFilter}
                onSelectProtocol={openProtocol}
                mobileSidebarOpen={mobileDocDrawerOpen}
                onCloseMobileSidebar={() => setMobileDocDrawerOpen(false)}
                onBack={() => navigate('home')}
                onOpenLab={(simId) => {
                  setSimProtocolId(simId);
                  navigate('simulator');
                }}
                onCompare={(pid) => {
                  setCompareProtoId(pid);
                  navigate('compare');
                }}
                onSelectIp={openIp}
                onOpenAesDeepDive={() => navigate('aes-deep-dive')}
                onOpenKnowledgeGraph={openKnowledgeGraph}
                onOpenExplainer={openExplainer}
                onOpenCurriculum={(pillar) => openCurriculum(pillar)}
              />
            )}

            {(view === 'rtl-design' || view === 'systemverilog' || view === 'uvm-studio') && (
              <RtlSvUvmStudioView
                initialPillar={
                  view === 'rtl-design'
                    ? 'rtl-design'
                    : view === 'systemverilog'
                    ? 'systemverilog'
                    : 'uvm-methodology'
                }
                initialModuleId={curriculumModuleId}
                onSelectProtocol={openProtocol}
                onSelectIp={openIp}
                onNavigate={navigate}
                onPillarChange={(p) =>
                  setView(p === 'rtl-design' ? 'rtl-design' : p === 'systemverilog' ? 'systemverilog' : 'uvm-studio')
                }
              />
            )}

            {view === 'ip-universe' && (
              <IpUniverseExplorer
                presetCategory="ALL"
                onSelectIp={openIp}
                onSelectProtocol={openProtocol}
                onOpenExplainer={openExplainer}
              />
            )}

            {view === 'processors' && (
              <IpUniverseExplorer
                presetCategory="CPU & Processor"
                heading="Open-Source Processor Explorer"
                subheading="Inspect RISC-V and application processor RTL across Ibex, CVA6, Rocket Chip, SonicBOOM, VexRiscv, SERV, PicoRV32, and CORE-V CV32E40P."
                onSelectIp={openIp}
                onSelectProtocol={openProtocol}
                onOpenExplainer={openExplainer}
              />
            )}

            {view === 'gpus' && (
              <IpUniverseExplorer
                presetCategory="GPU & Graphics"
                heading="Open-Source GPU Explorer"
                subheading="Compare complete SIMT GPGPU stacks (Vortex), research Southern Islands compute units (MIAOW), and many-core SIMD GPUs (Nyuzi) with explicit distinction of architectural scope."
                onSelectIp={openIp}
                onSelectProtocol={openProtocol}
                onOpenExplainer={openExplainer}
              />
            )}

            {view === 'ai-accelerators' && (
              <IpUniverseExplorer
                presetCategory="AI & ML Accelerator"
                heading="Open-Source AI & ML Accelerators"
                subheading="Explore systolic-array DNN engines (Gemmini), modular CNN inference pipelines (NVIDIA NVDLA), and low-power FP16 matrix units (PULP RedMulE)."
                onSelectIp={openIp}
                onSelectProtocol={openProtocol}
                onOpenExplainer={openExplainer}
              />
            )}

            {view === 'ip-detail' && (
              <IpDetailView
                ip={getIpById(selectedIpId)}
                onBack={() => navigate('ip-universe')}
                onSelectProtocol={openProtocol}
                onCompareIp={(ipId) => {
                  setCompareIpAId(ipId);
                  navigate('ip-compare');
                }}
                onOpenCdc={(ipId) => {
                  setCdcIpId(ipId);
                  navigate('cdc-analyzer');
                }}
                onSelectSoc={() => navigate('soc-explorer')}
                onOpenAesDeepDive={() => navigate('aes-deep-dive')}
                onOpenKnowledgeGraph={openKnowledgeGraph}
                onOpenExplainer={openExplainer}
              />
            )}

            {view === 'cdc-analyzer' && (
              <ClockDomainAnalyzerView initialIpId={cdcIpId} onSelectIp={openIp} />
            )}

            {view === 'aes-deep-dive' && (
              <AesDeepDiveView
                initialSubtopicId={aesSubtopicId}
                onBack={() => navigate('home')}
                onSelectIp={openIp}
                onSelectProtocol={openProtocol}
                onOpenCdc={(ipId) => {
                  setCdcIpId(ipId);
                  navigate('cdc-analyzer');
                }}
                onOpenCrypto={() => navigate('crypto')}
              />
            )}

            {view === 'soc-explorer' && (
              <SocExplorerView onSelectIp={openIp} onSelectProtocol={openProtocol} />
            )}

            {view === 'rtl-explorer' && <RtlSourceEngineView onSelectIp={openIp} />}

            {view === 'verification-hub' && <VerificationHubView onSelectIp={openIp} />}

            {view === 'ip-compare' && (
              <IpComparisonView
                initialIpA={compareIpAId}
                onSelectIp={openIp}
                onSelectProtocol={openProtocol}
              />
            )}

            {view === 'knowledge-graph' && (
              <KnowledgeGraphView
                initialNodeId={kgInitialNodeId}
                onSelectIp={openIp}
                onSelectProtocol={openProtocol}
                onOpenSocExplorer={() => navigate('soc-explorer')}
              />
            )}

            {view === 'repo-ingestion' && <RepoIngestionView />}

            {view === 'glossary' && (
              <GlossaryView onSelectProtocol={openProtocol} onSelectIp={openIp} />
            )}

            {view === 'simulator' && <SimulatorLab initialProtocol={simProtocolId} />}

            {view === 'checker' && <ComplianceChecker />}

            {view === 'compare' && (
              <ComparisonEngine initialProtoA={compareProtoId} onSelectProtocol={openProtocol} />
            )}

            {view === 'soc-map' && <SocConnectivityMap onSelectProtocol={openProtocol} />}

            {view === 'uvm' && <UvmGeneratorView />}

            {view === 'completeness-dashboard' && (
              <DocumentationCompletenessDashboard
                onSelectProtocol={openProtocol}
                onSelectIp={openIp}
              />
            )}

            {view === 'master-architecture' && (
              <MasterArchitectureView
                onSelectProtocol={openProtocol}
                onSelectIp={openIp}
                onNavigate={navigate}
              />
            )}

            {view === 'explainer' && (
              <InteractiveExplainerView
                initialTopicId={explainerDeepLink.topicId}
                initialSceneIndex={explainerDeepLink.sceneIdx}
                initialStep={explainerDeepLink.step}
                onSelectProtocol={openProtocol}
                onSelectIp={openIp}
              />
            )}

            {view === 'mind-map' && (
              <MindMapView
                onNavigate={navigate}
                onSelectProtocol={openProtocol}
                onSelectIp={openIp}
                onOpenCurriculum={openCurriculum}
                onOpenExplainer={openExplainer}
                onOpenKnowledgeGraph={openKnowledgeGraph}
              />
            )}

            {view === 'crypto' && (
              <CryptoStackView
                initialChapterId={cryptoTarget.chapterId}
                initialSubtopicId={cryptoTarget.subtopicId}
                initialLab={cryptoTarget.lab}
                onBack={() => navigate('home')}
                onNavigate={navigate}
                onSelectProtocol={openProtocol}
                onSelectIp={openIp}
                onOpenCdc={(ipId) => {
                  setCdcIpId(ipId);
                  navigate('cdc-analyzer');
                }}
              />
            )}

            {view === 'guide' && (
              <PlatformGuideView
                onNavigate={navigate}
                onSelectProtocol={openProtocol}
                onSelectIp={openIp}
                onOpenCurriculum={openCurriculum}
                onOpenSearch={() => setSearchOpen(true)}
                onFeelingLucky={handleFeelingLucky}
              />
            )}
          </div>
        </Suspense>
      </main>

      {/* Authoritative Semiconductor Engineering Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs text-[var(--text-secondary)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-12 pb-8 space-y-10">
          {/* Top Grid: Brand Overview + 4 Structured Domain Navigation Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Brand & Architecture Summary (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <button
                type="button"
                onClick={() => navigate('home')}
                aria-label="VLSI Protocol Atlas Home"
                className="inline-flex items-center text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--sem-control)]/40 hover:opacity-95 transition-opacity cursor-pointer"
              >
                <BrandBannerLockup />
              </button>

              <p className="leading-relaxed max-w-sm">
                Full-stack semiconductor reference uniting on-chip interconnect specifications, synthesizable RTL/SystemVerilog/UVM design patterns, reverse-engineered open-source cores, side-channel defenses, and NIST 2026 Post-Quantum Cryptography.
              </p>

              {/* Verified Corpus Inventory */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums text-[11px] text-[var(--text-primary)] pt-1">
                <span>{ALL_PROTOCOLS.length} Protocols</span>
                <span aria-hidden="true" className="text-[var(--text-secondary)]">·</span>
                <span>{ALL_IPS.length} Silicon IPs</span>
                <span aria-hidden="true" className="text-[var(--text-secondary)]">·</span>
                <span>{ALL_SOCS.length} SoCs</span>
                <span aria-hidden="true" className="text-[var(--text-secondary)]">·</span>
                <span>{ALL_EXPLAINER_TOPICS.length} Explainers</span>
              </div>

              {/* Footer Utility Actions & Quick Palette Switcher */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Search className="w-3.5 h-3.5 text-[var(--sem-control)]" />
                  Search Atlas
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-primary)] hover:border-[var(--sem-control)] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-[var(--sem-control)]" />
                  Print / PDF
                </button>
              </div>
            </div>

            {/* Column 1: Protocols & Fabrics (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Protocols &amp; Fabrics
              </div>
              <ul className="space-y-2">
                {[
                  { label: `Protocol Specs (${ALL_PROTOCOLS.length})`, view: 'protocol' as AppView },
                  { label: 'Waveform Simulator Lab', view: 'simulator' as AppView },
                  { label: 'Compliance & SVA Checker', view: 'checker' as AppView },
                  { label: 'Protocol Compare Matrix', view: 'compare' as AppView },
                  { label: 'SoC Bus Fabric Map', view: 'soc-map' as AppView },
                ].map((link) => (
                  <li key={link.view}>
                    <button
                      type="button"
                      onClick={() => navigate(link.view)}
                      className="text-left hover:text-[var(--sem-control)] transition-colors cursor-pointer"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: RTL, SV & Verification (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                RTL, SV &amp; UVM
              </div>
              <ul className="space-y-2">
                {[
                  { label: 'RTL Design Handbook (14)', view: 'rtl-design' as AppView },
                  { label: 'SystemVerilog IEEE 1800', view: 'systemverilog' as AppView },
                  { label: 'UVM IEEE 1800.2 Studio', view: 'uvm-studio' as AppView },
                  { label: 'Clock Domain Analyzer (CDC)', view: 'cdc-analyzer' as AppView },
                  { label: 'RTL Source Explorer', view: 'rtl-explorer' as AppView },
                  { label: 'Verification Hub', view: 'verification-hub' as AppView },
                ].map((link) => (
                  <li key={link.view}>
                    <button
                      type="button"
                      onClick={() => navigate(link.view)}
                      className="text-left hover:text-[var(--sem-control)] transition-colors cursor-pointer"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Silicon IPs & Graphs (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Silicon IPs &amp; Graphs
              </div>
              <ul className="space-y-2">
                {[
                  { label: `Open-Source IP Catalog (${ALL_IPS.length})`, view: 'ip-universe' as AppView },
                  { label: `SoC Topologies (${ALL_SOCS.length})`, view: 'soc-explorer' as AppView },
                  { label: '16-Domain Architecture', view: 'master-architecture' as AppView },
                  { label: 'Knowledge Graph', view: 'knowledge-graph' as AppView },
                  { label: `Explainer Studio (${ALL_EXPLAINER_TOPICS.length})`, view: 'explainer' as AppView },
                  { label: 'Atlas Mind Map', view: 'mind-map' as AppView },
                ].map((link) => (
                  <li key={link.view}>
                    <button
                      type="button"
                      onClick={() => navigate(link.view)}
                      className="text-left hover:text-[var(--sem-control)] transition-colors cursor-pointer"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Crypto, PQC & Quality (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                Crypto, PQC &amp; Quality
              </div>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setCryptoTarget({ chapterId: 'ch8-pqc', lab: 'pqc' });
                      navigate('crypto');
                    }}
                    className="text-left font-medium text-[var(--text-primary)] hover:text-[var(--sem-control)] transition-colors cursor-pointer"
                  >
                    Crypto &amp; PQC Stack (10 Ch)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('aes-deep-dive')}
                    className="text-left hover:text-[var(--sem-control)] transition-colors cursor-pointer"
                  >
                    AES 7-Chapter FIPS-197 Lab
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('completeness-dashboard')}
                    className="text-left hover:text-[var(--sem-control)] transition-colors cursor-pointer"
                  >
                    16-Checkpoint Audit (100%)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('glossary')}
                    className="text-left hover:text-[var(--sem-control)] transition-colors cursor-pointer"
                  >
                    Silicon Glossary
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate('guide')}
                    className="text-left font-medium text-[var(--sem-control)] hover:underline cursor-pointer"
                  >
                    How to Use &amp; Guide
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Middle Bar: Palette Quick Selector & Grounding Standards */}
          <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-primary)] font-semibold">
                Grounded Standards &amp; Upstream Hardware
              </div>
              <div className="text-[11px] leading-relaxed">
                NIST FIPS 203 / 204 / 205 · ARM AMBA 5 · TileLink · PCI-SIG · JEDEC · MIPI · IEEE 1800 / 1800.2 · RISC-V · lowRISC OpenTitan &amp; Ibex · OpenHW CVA6 · UC Berkeley Rocket &amp; Gemmini · PULP · Vortex · LiteX
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-mono text-[var(--text-secondary)] mr-1">
                Palette:
              </span>
              {COLOR_PALETTES.map((opt) => {
                const active = palette === opt.id;
                const swatch = theme === 'dark' ? opt.darkSwatches[2] : opt.lightSwatches[2];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPalette(opt.id)}
                    title={opt.name}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: swatch }}
                    />
                    {opt.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Legal & Navigation Strip */}
          <div className="pt-5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-[var(--text-primary)]">MIT License</strong>
              <span aria-hidden="true">·</span>
              <span>VLSI Protocol Atlas &amp; Open-Source Silicon Security Reference</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono tabular-nums">
                Shortcut: <span className="text-[var(--sem-control)]">/</span> or{' '}
                <span className="text-[var(--sem-control)]">Cmd+K</span>
              </span>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:text-[var(--sem-control)] transition-colors cursor-pointer"
              >
                Back to Top
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectProtocol={openProtocol}
        onSelectIp={openIp}
        onSelectSoc={() => navigate('soc-explorer')}
        onSelectGlossary={() => navigate('glossary')}
        onSelectAesSubtopic={(subId) => {
          setAesSubtopicId(subId);
          navigate('aes-deep-dive');
        }}
        onSelectCryptoSubtopic={(chapterId, subtopicId) => {
          setCryptoTarget({ chapterId, subtopicId });
          navigate('crypto');
        }}
        onSelectCurriculum={openCurriculum}
        onSelectGuide={() => navigate('guide')}
        onSelectMindMap={() => navigate('mind-map')}
      />
    </div>
  );
}
