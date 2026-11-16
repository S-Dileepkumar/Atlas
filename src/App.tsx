import { useEffect, useState } from 'react';
import { Dices, X } from 'lucide-react';
import { AppView, HomeDashboard } from './components/HomeDashboard';
import { ProtocolDocView } from './components/ProtocolDocView';
import { SimulatorLab } from './components/SimulatorLab';
import { ComplianceChecker } from './components/ComplianceChecker';
import { ComparisonEngine } from './components/ComparisonEngine';
import { SocConnectivityMap, UvmGeneratorView } from './components/SocMapAndUvm';
import { SearchModal } from './components/SearchModal';
import { GlossaryView } from './components/GlossaryView';
import { IpUniverseExplorer } from './components/IpUniverseExplorer';
import { IpDetailView } from './components/IpDetailView';
import { SocExplorerView } from './components/SocExplorerView';
import { RtlSourceEngineView } from './components/RtlSourceEngineView';
import { VerificationHubView } from './components/VerificationHubView';
import { IpComparisonView } from './components/IpComparisonView';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { RepoIngestionView } from './components/RepoIngestionView';
import { ClockDomainAnalyzerView } from './components/ClockDomainAnalyzerView';
import { AesDeepDiveView } from './components/AesDeepDiveView';
import { DocumentationCompletenessDashboard } from './components/DocumentationCompletenessDashboard';
import { ALL_PROTOCOLS, getProtocolById } from './data/protocols';
import { ALL_IPS, getIpById } from './data/ips';
import { AES_CURRICULUM } from './data/aesCurriculum';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('axi4');
  const [selectedIpId, setSelectedIpId] = useState<string>('ibex');
  const [cdcIpId, setCdcIpId] = useState<string>('opentitan-aes');
  const [aesSubtopicId, setAesSubtopicId] = useState<string | undefined>(undefined);
  const [simProtocolId, setSimProtocolId] = useState<string>('axi4');
  const [compareProtoId, setCompareProtoId] = useState<string | undefined>(undefined);
  const [compareIpAId, setCompareIpAId] = useState<string | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
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
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
    setView(v);
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

  // Top Header Navigation: 5 clean concise hub items adhering strictly to Top Bar Contract
  const headerNavItems: Array<{ id: AppView; label: string; matchViews: AppView[] }> = [
    { id: 'home', label: 'Home', matchViews: ['home'] },
    {
      id: 'protocol-atlas',
      label: 'Protocol Atlas',
      matchViews: ['protocol-atlas', 'protocol', 'simulator', 'checker', 'compare', 'soc-map', 'uvm'],
    },
    {
      id: 'ip-universe',
      label: 'IP Universe',
      matchViews: ['ip-universe', 'processors', 'gpus', 'ai-accelerators', 'ip-detail', 'ip-compare'],
    },
    {
      id: 'soc-explorer',
      label: 'SoCs & RTL',
      matchViews: ['soc-explorer', 'rtl-explorer', 'cdc-analyzer', 'aes-deep-dive', 'verification-hub', 'knowledge-graph', 'completeness-dashboard', 'repo-ingestion'],
    },
    { id: 'glossary', label: 'Glossary', matchViews: ['glossary'] },
  ];

  // Context-aware workspace sub-bars: only appear inside multi-view engineering hubs (calm 5-6 links max)
  const PROTOCOL_HUB_VIEWS: AppView[] = ['protocol', 'simulator', 'checker', 'compare', 'soc-map', 'uvm'];
  const IP_HUB_VIEWS: AppView[] = ['ip-universe', 'processors', 'gpus', 'ai-accelerators', 'ip-detail', 'ip-compare'];
  const SOC_LAB_VIEWS: AppView[] = ['soc-explorer', 'rtl-explorer', 'cdc-analyzer', 'aes-deep-dive', 'verification-hub', 'knowledge-graph', 'completeness-dashboard', 'repo-ingestion'];

  const subBarLinks: Array<{ id: AppView; label: string }> = PROTOCOL_HUB_VIEWS.includes(view)
    ? [
        { id: 'protocol', label: 'Protocol Specs' },
        { id: 'simulator', label: 'Waveform Lab' },
        { id: 'checker', label: 'Compliance Checker' },
        { id: 'compare', label: 'Protocol Compare' },
        { id: 'soc-map', label: 'Bus Fabric Map' },
        { id: 'uvm', label: 'UVM & SVA Gen' },
      ]
    : IP_HUB_VIEWS.includes(view)
    ? [
        { id: 'ip-universe', label: 'All Open-Source IPs' },
        { id: 'processors', label: 'Processors' },
        { id: 'gpus', label: 'GPUs' },
        { id: 'ai-accelerators', label: 'AI Accelerators' },
        { id: 'ip-compare', label: 'Compare IPs' },
      ]
    : SOC_LAB_VIEWS.includes(view)
    ? [
        { id: 'soc-explorer', label: 'SoC Explorer' },
        { id: 'rtl-explorer', label: 'RTL Explorer' },
        { id: 'cdc-analyzer', label: 'Clock Domains (CDC)' },
        { id: 'aes-deep-dive', label: 'AES 7-Chapter Lab' },
        { id: 'verification-hub', label: 'Verification Hub' },
        { id: 'knowledge-graph', label: 'Knowledge Graph' },
        { id: 'completeness-dashboard', label: 'Completeness Audit' },
        { id: 'repo-ingestion', label: 'Repo Ingestion' },
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => navigate('home')}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            VLSI Protocol Atlas
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {headerNavItems.map((item) => {
              const active = item.matchViews.includes(view);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id === 'protocol-atlas' ? 'protocol' : item.id)}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors cursor-pointer border-b-2 ${
                    active
                      ? 'border-cyan-500 text-slate-900 dark:text-cyan-300'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleFeelingLucky('any')}
              title="Jump to a random protocol, open-source IP, CDC map, or lab"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5" />
              Feeling Lucky
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-slate-900 dark:bg-cyan-600 text-white hover:bg-slate-800 dark:hover:bg-cyan-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Search Atlas
            </button>
          </div>
        </div>
      </header>

      {/* Mobile primary hub navigation (< md) */}
      <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        {headerNavItems.map((item) => {
          const active = item.matchViews.includes(view);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id === 'protocol-atlas' ? 'protocol' : item.id)}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1">
        {/* Clean Context-Aware Hub Sub-Bar (hidden on Home & Glossary so pages stay uncluttered) */}
        {subBarLinks.length > 0 && (
          <div className="border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs">
              {subBarLinks.map((lnk) => {
                const active = view === lnk.id || (lnk.id === 'ip-universe' && view === 'ip-detail');
                return (
                  <button
                    key={lnk.id}
                    type="button"
                    onClick={() => navigate(lnk.id)}
                    className={`px-3 py-1 rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-cyan-600/15 text-cyan-700 dark:text-cyan-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {lnk.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lucky Discovery Banner (shown after rolling Feeling Lucky so users can chain random picks seamlessly) */}
        {luckyPick && (
          <div className="border-b border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/25">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Dices className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="min-w-0 truncate">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    Lucky Pick · {luckyPick.kind}:
                  </span>{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{luckyPick.title}</strong>
                  <span className="hidden sm:inline text-slate-600 dark:text-slate-400">
                    {' '}— {luckyPick.subtitle}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleFeelingLucky(luckyPick.scope)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium cursor-pointer"
                >
                  <Dices className="w-3 h-3" /> Roll Again
                </button>
                <button
                  type="button"
                  onClick={() => handleFeelingLucky('protocol')}
                  className="px-2.5 py-1 rounded border border-amber-500/40 bg-white/80 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-cyan-500 font-medium cursor-pointer"
                >
                  Random Protocol
                </button>
                <button
                  type="button"
                  onClick={() => handleFeelingLucky('ip')}
                  className="px-2.5 py-1 rounded border border-amber-500/40 bg-white/80 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-cyan-500 font-medium cursor-pointer"
                >
                  Random IP
                </button>
                <button
                  type="button"
                  onClick={() => setLuckyPick(null)}
                  className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  title="Dismiss Lucky Banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {(view === 'home' || view === 'protocol-atlas') && (
          <HomeDashboard
            recentIds={recentIds}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            onSelectProtocol={openProtocol}
            onSelectIp={openIp}
            onNavigate={navigate}
            onOpenSearch={() => setSearchOpen(true)}
            onFeelingLucky={handleFeelingLucky}
          />
        )}

        {view === 'protocol' && (
          <ProtocolDocView
            protocol={getProtocolById(selectedProtocolId)}
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
          />
        )}

        {view === 'ip-universe' && (
          <IpUniverseExplorer
            presetCategory="ALL"
            onSelectIp={openIp}
            onSelectProtocol={openProtocol}
          />
        )}

        {view === 'processors' && (
          <IpUniverseExplorer
            presetCategory="CPU & Processor"
            heading="Open-Source Processor Explorer"
            subheading="Inspect RISC-V and application processor RTL across Ibex, CVA6, Rocket Chip, SonicBOOM, VexRiscv, SERV, PicoRV32, and CORE-V CV32E40P."
            onSelectIp={openIp}
            onSelectProtocol={openProtocol}
          />
        )}

        {view === 'gpus' && (
          <IpUniverseExplorer
            presetCategory="GPU & Graphics"
            heading="Open-Source GPU Explorer"
            subheading="Compare complete SIMT GPGPU stacks (Vortex), research Southern Islands compute units (MIAOW), and many-core SIMD GPUs (Nyuzi) with explicit distinction of architectural scope."
            onSelectIp={openIp}
            onSelectProtocol={openProtocol}
          />
        )}

        {view === 'ai-accelerators' && (
          <IpUniverseExplorer
            presetCategory="AI & ML Accelerator"
            heading="Open-Source AI & ML Accelerators"
            subheading="Explore systolic-array DNN engines (Gemmini), modular CNN inference pipelines (NVIDIA NVDLA), and low-power FP16 matrix units (PULP RedMulE)."
            onSelectIp={openIp}
            onSelectProtocol={openProtocol}
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
      </main>

      {/* Quiet Engineering Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] py-6 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            VLSI Protocol Atlas & Open-Source IP Universe · Grounded in ARM AMBA, PCI-SIG, JEDEC, OpenTitan, Ibex, OpenHW, UC Berkeley, PULP, Vortex & LiteX repositories.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => navigate('ip-universe')} className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
              IP Universe
            </button>
            <button type="button" onClick={() => navigate('completeness-dashboard')} className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
              Completeness Audit
            </button>
            <button type="button" onClick={() => navigate('soc-explorer')} className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
              SoC Explorer
            </button>
            <button type="button" onClick={() => navigate('repo-ingestion')} className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
              Repo Ingestion
            </button>
            <button type="button" onClick={() => navigate('glossary')} className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
              Glossary
            </button>
            <button type="button" onClick={() => navigate('uvm')} className="hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer">
              UVM Generator
            </button>
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
      />
    </div>
  );
}
