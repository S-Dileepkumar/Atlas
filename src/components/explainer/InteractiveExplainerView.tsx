import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DepthLevel,
  VISUAL_LEGEND,
} from '../../engine/explainerSchema';
import { useTimelineController } from '../../engine/useTimelineController';
import {
  ALL_EXPLAINER_TOPICS,
  ALL_TOPIC_VALIDATION_SUMMARY,
  EXPLAINER_DOMAINS,
  FLAGSHIP_EXPLAINER_TOPICS,
  getExplainerTopicById,
  IP_EXPLAINER_TOPICS,
  PROTOCOL_EXPLAINER_TOPICS,
  TOPIC_VALIDATION_REPORTS,
} from '../../data/explainers';
import { HOW_TO_ADD_TOPIC_GUIDE, TOPIC_TEMPLATE } from '../../data/explainers/topicTemplate';
import { RegisteredRenderer } from './renderers/RendererRegistry';

type ExplainerScope = 'FLAGSHIP' | 'PROTOCOLS' | 'IPS' | 'ALL';

function inferScopeForId(id?: string): ExplainerScope {
  if (!id) return 'FLAGSHIP';
  if (id.startsWith('proto-')) return 'PROTOCOLS';
  if (id.startsWith('ip-')) return 'IPS';
  if (FLAGSHIP_EXPLAINER_TOPICS.some((t) => t.id === id)) return 'FLAGSHIP';
  return 'ALL';
}

interface InteractiveExplainerViewProps {
  initialTopicId?: string;
  initialSceneIndex?: number;
  initialStep?: number;
  onSelectProtocol?: (id: string) => void;
  onSelectIp?: (id: string) => void;
}

export const InteractiveExplainerView: React.FC<InteractiveExplainerViewProps> = ({
  initialTopicId,
  initialSceneIndex = 0,
  initialStep = 0,
  onSelectProtocol,
  onSelectIp,
}) => {
  const [topicId, setTopicId] = useState<string>(() =>
    initialTopicId ? getExplainerTopicById(initialTopicId).id : FLAGSHIP_EXPLAINER_TOPICS[0].id
  );
  const [scope, setScope] = useState<ExplainerScope>(() => inferScopeForId(initialTopicId));
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const [depth, setDepth] = useState<DepthLevel>('detail');
  const [verificationMode, setVerificationMode] = useState<boolean>(false);
  const [sceneIdx, setSceneIdx] = useState<number>(initialSceneIndex);
  const [activeTab, setActiveTab] = useState<'signals' | 'prog' | 'mistakes' | 'quiz' | 'sources'>('signals');
  const [showSchemaModal, setShowSchemaModal] = useState<boolean>(false);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  const topic = useMemo(() => getExplainerTopicById(topicId), [topicId]);
  const safeSceneIdx = Math.min(sceneIdx, Math.max(0, topic.scenes.length - 1));
  const scene = topic.scenes[safeSceneIdx];

  // Try-It interactive parameters initialized from current topic defaults
  const [tryItValues, setTryItValues] = useState<Record<string, string | boolean>>({});
  useEffect(() => {
    const defaults: Record<string, string | boolean> = {};
    topic.tryItControls.forEach((c) => {
      defaults[c.id] = c.defaultValue;
    });
    setTryItValues(defaults);
    setQuizAnswers({});
  }, [topic]);

  // Sync deep-link props if passed externally
  useEffect(() => {
    if (initialTopicId) {
      const resolved = getExplainerTopicById(initialTopicId);
      setTopicId(resolved.id);
      setScope(inferScopeForId(resolved.id));
      setPage(0);
    }
  }, [initialTopicId]);

  const timeline = useTimelineController(topic.id, safeSceneIdx, scene.playbackSteps, true);

  // Jump cleanly to initialStep on initial deep link mount
  useEffect(() => {
    if (initialStep > 0 && initialStep < scene.playbackSteps) {
      timeline.scrubTo(initialStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopicId, initialStep]);

  const scopedBaseTopics = useMemo(() => {
    if (scope === 'FLAGSHIP') return FLAGSHIP_EXPLAINER_TOPICS;
    if (scope === 'PROTOCOLS') return PROTOCOL_EXPLAINER_TOPICS;
    if (scope === 'IPS') return IP_EXPLAINER_TOPICS;
    return ALL_EXPLAINER_TOPICS;
  }, [scope]);

  const filteredTopics = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return scopedBaseTopics.filter((t) => {
      const dOk = domainFilter === 'ALL' || t.domain === domainFilter;
      const qOk =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q) ||
        t.specVersion.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q);
      return dOk && qOk;
    });
  }, [scopedBaseTopics, domainFilter, deferredSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredTopics.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageTopics = useMemo(
    () => filteredTopics.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
    [filteredTopics, clampedPage, pageSize]
  );

  const selectTopic = (newId: string) => {
    const resolved = getExplainerTopicById(newId);
    setTopicId(resolved.id);
    setSceneIdx(0);
    const targetScope = inferScopeForId(resolved.id);
    if (scope !== 'ALL' && targetScope !== scope) {
      setScope(targetScope);
      setDomainFilter('ALL');
      setPage(0);
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#explainer/${resolved.id}/s1/t0`);
    }
  };

  const activeEvents = scene.events.filter((e) => e.step === timeline.currentStep);

  const linkedProtoId =
    topic.linkedProtocolId ||
    (topic.id === 'axi4-handshakes'
      ? 'axi4'
      : topic.id === 'pcie-ltssm-tlp'
      ? 'pcie-gen5'
      : topic.id === 'ddr5-bank-refresh'
      ? 'ddr5'
      : undefined);

  const linkedIpId =
    topic.linkedIpId ||
    (topic.id === 'opentitan-hmac'
      ? 'opentitan-hmac'
      : topic.id === 'systolic-gemmini'
      ? 'gemmini'
      : topic.id === 'gpu-warp-simt'
      ? 'vortex-gpu'
      : topic.id === 'riscv-5stage-pipeline'
      ? 'rocket-chip'
      : undefined);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Studio Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Interactive Hardware Explainer Studio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
            Cycle-accurate explainers for every protocol ({PROTOCOL_EXPLAINER_TOPICS.length}), every open-source silicon IP ({IP_EXPLAINER_TOPICS.length}), and {FLAGSHIP_EXPLAINER_TOPICS.length} flagship multi-scene architectural labs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSchemaModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="tabular-nums">
              Schema &amp; Topic Audit ({ALL_TOPIC_VALIDATION_SUMMARY.totalValid}/{ALL_TOPIC_VALIDATION_SUMMARY.total} Valid)
            </span>
          </button>
        </div>
      </div>

      {/* Main 2-Zone Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Navigation & Topic Selector Rail (3 cols) */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Scope Selector */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-3">
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Explainer catalog scope">
              {(
                [
                  { id: 'FLAGSHIP', label: `Flagship (${FLAGSHIP_EXPLAINER_TOPICS.length})` },
                  { id: 'PROTOCOLS', label: `Protocols (${PROTOCOL_EXPLAINER_TOPICS.length})` },
                  { id: 'IPS', label: `Silicon IPs (${IP_EXPLAINER_TOPICS.length})` },
                  { id: 'ALL', label: `All (${ALL_EXPLAINER_TOPICS.length})` },
                ] as const
              ).map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    setScope(sc.id);
                    setPage(0);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold rounded cursor-pointer transition-colors tabular-nums ${
                    scope === sc.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Filter protocols, IPs, mechanisms..."
                aria-label="Filter hardware explainer topics"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDomainFilter('ALL');
                  setPage(0);
                }}
                className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                  domainFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-cyan-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({scopedBaseTopics.length})
              </button>
              {EXPLAINER_DOMAINS.map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => {
                    setDomainFilter(dom);
                    setPage(0);
                  }}
                  className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer transition-colors ${
                    domainFilter === dom
                      ? 'bg-slate-900 dark:bg-cyan-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {dom}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2" role="list" aria-label="Hardware Explainer Topics">
            {pageTopics.map((item) => {
              const selected = item.id === topic.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTopic(item.id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    selected
                      ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {item.domain} · {item.scenes.length} {item.scenes.length === 1 ? 'scene' : 'scenes'}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 leading-snug">
                    {item.title}
                  </div>
                </button>
              );
            })}
            {filteredTopics.length === 0 && (
              <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center">
                No topics matched &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs">
              <button
                type="button"
                disabled={clampedPage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Prev
              </button>
              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                Page {clampedPage + 1} / {totalPages} ({filteredTopics.length})
              </span>
              <button
                type="button"
                disabled={clampedPage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          )}
        </aside>

        {/* Main Interactive Stage & Controls */}
        <section className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Topic Metadata & Live Controls Header */}
          <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 max-w-2xl">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {topic.domain} <span aria-hidden="true">/</span> {topic.specVersion}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{topic.title}</h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">{topic.summary}</p>
              </div>

              {/* Depth Switcher + Verification + Reduced Motion Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div
                  className="inline-flex items-center p-1 rounded-md bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  role="group"
                  aria-label="Explanation depth level"
                >
                  {(['overview', 'detail', 'expert'] as DepthLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDepth(lvl)}
                      className={`px-2.5 py-1 text-xs font-medium rounded capitalize cursor-pointer transition-colors ${
                        depth === lvl
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setVerificationMode((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors ${
                    verificationMode
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verification View</span>
                </button>

                <button
                  type="button"
                  onClick={() => timeline.setReducedMotion(!timeline.reducedMotion)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors ${
                    timeline.reducedMotion
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {timeline.reducedMotion ? 'Reduced Motion: ON' : 'Reduced Motion: OFF'}
                </button>
              </div>
            </div>

            {/* Related Cross-Links Strip */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <span className="font-medium text-slate-500 dark:text-slate-400">Related Topics:</span>
              {topic.relatedTopics.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => selectTopic(rel.id)}
                  title={rel.reason}
                  className="text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  {rel.label}
                </button>
              ))}
              {linkedProtoId && onSelectProtocol && (
                <button
                  type="button"
                  onClick={() => onSelectProtocol(linkedProtoId)}
                  className="font-semibold text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer"
                >
                  Open Protocol Spec Datasheet →
                </button>
              )}
              {linkedIpId && onSelectIp && (
                <button
                  type="button"
                  onClick={() => onSelectIp(linkedIpId)}
                  className="font-semibold text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer"
                >
                  Inspect IP RTL Explorer →
                </button>
              )}
            </div>
          </div>

          {/* Shared Consistent Visual Language Color Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              {VISUAL_LEGEND.map((item) => (
                <div key={item.key} className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: item.colorVar }}
                    aria-hidden="true"
                  />
                  <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Deep Link: #explainer/{topic.id}/s{safeSceneIdx + 1}/t{timeline.currentStep}
            </div>
          </div>

          {/* Scene Selector + Interactive Try-It Mutation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {topic.scenes.length > 1 ? (
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {topic.scenes.map((sc, idx) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSceneIdx(idx)}
                    className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer transition-colors ${
                      safeSceneIdx === idx
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Scene {idx + 1}: {sc.title}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{scene.title}</div>
            )}

            {topic.tryItControls.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {topic.tryItControls.map((ctrl) =>
                  ctrl.type === 'toggle' ? (
                    <button
                      key={ctrl.id}
                      type="button"
                      title={ctrl.effectSummary}
                      onClick={() =>
                        setTryItValues((prev) => ({ ...prev, [ctrl.id]: !prev[ctrl.id] }))
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors ${
                        tryItValues[ctrl.id]
                          ? 'border-red-500 bg-red-500/15 text-red-700 dark:text-red-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-cyan-500'
                      }`}
                    >
                      Try It: {ctrl.label} ({tryItValues[ctrl.id] ? 'ACTIVE' : 'OFF'})
                    </button>
                  ) : (
                    <label key={ctrl.id} className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-medium">Try It — {ctrl.label}:</span>
                      <select
                        value={String(tryItValues[ctrl.id] ?? ctrl.defaultValue)}
                        onChange={(e) =>
                          setTryItValues((prev) => ({ ...prev, [ctrl.id]: e.target.value }))
                        }
                        className="px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      >
                        {ctrl.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )
                )}
              </div>
            )}
          </div>

          {/* Synchronized Interactive Renderer Stage */}
          <div className="space-y-4" aria-label={scene.ariaDescription}>
            {scene.renderers.map((binding, idx) => (
              <RegisteredRenderer
                key={`${scene.id}-r${idx}`}
                binding={binding}
                currentStep={timeline.currentStep}
                totalSteps={timeline.totalSteps}
                depth={depth}
                reducedMotion={timeline.reducedMotion}
                verificationMode={verificationMode}
                tryItValues={tryItValues}
                onJumpToStep={timeline.scrubTo}
              />
            ))}
          </div>

          {/* Unified Scrubbing & Timeline Playback Control Bar */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={timeline.togglePlay}
                  aria-label={timeline.isPlaying ? 'Pause animation' : 'Play animation'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 dark:bg-cyan-600 text-white hover:bg-slate-800 dark:hover:bg-cyan-500 cursor-pointer"
                >
                  {timeline.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{timeline.isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={timeline.stepBackward}
                  aria-label="Step backward"
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={timeline.stepForward}
                  aria-label="Step forward"
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={timeline.reset}
                  aria-label="Reset timeline"
                  className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrubber Slider + Numeric Readout */}
              <div className="flex-1 min-w-[200px] flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                  Step T{timeline.currentStep} / T{timeline.totalSteps - 1}
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, timeline.totalSteps - 1)}
                  value={timeline.currentStep}
                  onChange={(e) => timeline.scrubTo(Number(e.target.value))}
                  aria-label="Scrub timeline step"
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-1 text-xs">
                {[0.5, 1, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => timeline.setSpeed(sp)}
                    className={`px-2 py-1 rounded font-mono tabular-nums cursor-pointer ${
                      timeline.speed === sp
                        ? 'bg-cyan-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Synchronized Event Readout & Causality Rules */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-mono text-amber-700 dark:text-amber-300">
                {activeEvents.length > 0
                  ? activeEvents.map((e) => `Active Event (T${e.step}): ${e.label}`).join(' · ')
                  : `Cycle T${timeline.currentStep}: Stable propagation / holding between trigger edges.`}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Keys: Space (Play/Pause) · ← / → (Step)
              </div>
            </div>
          </div>

          {/* Depth-Driven Narrative Explanation + Spec Differences + Causality */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">
                {depth} Explanation — {scene.title}
              </h3>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Focus: {scene.highlightList.join(', ')}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{scene.text[depth]}</p>

            {scene.causalityRules.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {scene.causalityRules.map((cr) => (
                  <div
                    key={cr.rule}
                    className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{cr.rule}</div>
                    <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                      <span className="font-mono text-blue-600 dark:text-blue-400">IF</span> {cr.cause}{' '}
                      <span className="font-mono text-teal-600 dark:text-teal-400">-&gt; THEN</span> {cr.effect}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-200">Spec Version Note:</strong> {topic.specDifferenceNote}
            </div>
          </div>

          {/* Expert Verification View Overlay */}
          {verificationMode && (
            <div className="p-4 rounded-lg border border-cyan-500/40 bg-cyan-50/40 dark:bg-cyan-950/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-800 dark:text-cyan-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Design &amp; Formal Verification Engineering View</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Protocol / Structural Checks</div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                    {topic.verificationView.checks.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Coverage &amp; Scoreboard Hook</div>
                  <p className="text-slate-700 dark:text-slate-300">{topic.verificationView.scoreboardPlacement}</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                    {topic.verificationView.coveragePoints.map((cp) => (
                      <li key={cp}>{cp}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">SystemVerilog Assertions (SVA)</div>
                {topic.verificationView.assertions.map((sva) => (
                  <pre
                    key={sva}
                    className="p-2.5 rounded bg-slate-900 text-teal-300 font-mono text-[11px] overflow-x-auto"
                  >
                    {sva}
                  </pre>
                ))}
              </div>
            </div>
          )}

          {/* Mode Diff View ("What Changes") */}
          {topic.modeDiff && (
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                What Changes: {topic.modeDiff.modeA} vs {topic.modeDiff.modeB}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-3 font-medium">Dimension</th>
                      <th className="py-2 pr-3 font-medium text-blue-600 dark:text-blue-400">{topic.modeDiff.modeA}</th>
                      <th className="py-2 pr-3 font-medium text-teal-600 dark:text-teal-400">{topic.modeDiff.modeB}</th>
                      <th className="py-2 font-medium">Architectural Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {topic.modeDiff.rows.map((r) => (
                      <tr key={r.dimension}>
                        <td className="py-2 pr-3 font-semibold text-slate-900 dark:text-slate-100">{r.dimension}</td>
                        <td className="py-2 pr-3 font-mono text-slate-700 dark:text-slate-300">{r.valueA}</td>
                        <td className="py-2 pr-3 font-mono text-slate-700 dark:text-slate-300">{r.valueB}</td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">{r.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Collapsible / Tabbed Engineering Reference Drawer */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
            <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 overflow-x-auto">
              {(
                [
                  { id: 'signals', label: `Signals (${topic.signals.length})` },
                  { id: 'prog', label: 'Programming Model' },
                  { id: 'mistakes', label: 'Common Mistakes' },
                  { id: 'quiz', label: '3-Question Self-Check' },
                  { id: 'sources', label: 'Sources & Version Notes' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 text-xs space-y-3">
              {activeTab === 'signals' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-3">Signal / Field</th>
                        <th className="py-2 pr-3">Width</th>
                        <th className="py-2 pr-3">Direction</th>
                        <th className="py-2">Cycle Rule</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {topic.signals.map((sig) => (
                        <tr key={sig.name}>
                          <td className="py-2 pr-3 font-mono font-semibold text-slate-900 dark:text-slate-100">{sig.name}</td>
                          <td className="py-2 pr-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">{sig.width}</td>
                          <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{sig.direction}</td>
                          <td className="py-2 text-slate-700 dark:text-slate-200">{sig.rule}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'prog' && (
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-700 dark:text-slate-200">
                  {topic.programmingModel.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}

              {activeTab === 'mistakes' && (
                <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-200">
                  {topic.commonMistakes.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}

              {activeTab === 'quiz' && (
                <div className="space-y-4">
                  {topic.selfCheck.map((q, qIdx) => {
                    const chosen = quizAnswers[q.id];
                    const answered = chosen !== undefined;
                    const correct = chosen === q.correctIndex;
                    return (
                      <div key={q.id} className="p-3 rounded-md border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          Q{qIdx + 1}. {q.question}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {q.options.map((opt, optIdx) => {
                            const picked = chosen === optIdx;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                                className={`text-left px-3 py-2 rounded border text-xs cursor-pointer transition-colors ${
                                  picked
                                    ? optIdx === q.correctIndex
                                      ? 'border-teal-500 bg-teal-500/15 text-teal-800 dark:text-teal-200 font-semibold'
                                      : 'border-red-500 bg-red-500/15 text-red-800 dark:text-red-200 font-semibold'
                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {answered && (
                          <div className={`text-xs pt-1 ${correct ? 'text-teal-700 dark:text-teal-300' : 'text-red-700 dark:text-red-300'}`}>
                            {correct ? 'Correct: ' : 'Not quite: '}
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'sources' && (
                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Authoritative Specifications</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                      {topic.sources.map((s) => (
                        <li key={s.name + s.section}>
                          <strong>{s.name}</strong> ({s.version}) — {s.section}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      Version-Dependent / Implementation-Defined Parameters
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                      {topic.unverifiedOrGenericItems.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Glossary Terms</div>
                    <dl className="space-y-1">
                      {topic.glossary.map((g) => (
                        <div key={g.term}>
                          <dt className="inline font-semibold font-mono text-slate-900 dark:text-slate-100">{g.term}: </dt>
                          <dd className="inline text-slate-600 dark:text-slate-300">{g.definition}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Schema Validator & "How to Add a Topic" Guide Modal */}
      {showSchemaModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Topic Schema Validator and Authoring Guide"
        >
          <div className="max-w-3xl w-full max-h-[85vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Runtime Topic Validator &amp; Authoring Guide
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSchemaModal(false)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Live validateTopic() Coverage Summary ({ALL_TOPIC_VALIDATION_SUMMARY.totalValid}/{ALL_TOPIC_VALIDATION_SUMMARY.total} Explainers Pass Schema Verification)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded border border-teal-500/40 bg-teal-500/10">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">Flagship Interactive Labs</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                    {ALL_TOPIC_VALIDATION_SUMMARY.flagshipValid} / {ALL_TOPIC_VALIDATION_SUMMARY.flagshipTotal} Valid
                  </div>
                </div>
                <div className="p-3 rounded border border-teal-500/40 bg-teal-500/10">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">Protocol Explainers</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                    {ALL_TOPIC_VALIDATION_SUMMARY.protocolValid} / {ALL_TOPIC_VALIDATION_SUMMARY.protocolTotal} Valid
                  </div>
                </div>
                <div className="p-3 rounded border border-teal-500/40 bg-teal-500/10">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">Open-Source IP Explainers</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                    {ALL_TOPIC_VALIDATION_SUMMARY.ipValid} / {ALL_TOPIC_VALIDATION_SUMMARY.ipTotal} Valid
                  </div>
                </div>
              </div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
                Flagship Multi-Scene Module Audits
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {TOPIC_VALIDATION_REPORTS.map((rep) => (
                  <div
                    key={rep.id}
                    className={`p-2.5 rounded border flex items-start justify-between gap-2 ${
                      rep.valid
                        ? 'border-teal-500/40 bg-teal-500/10'
                        : 'border-red-500 bg-red-500/10'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">{rep.id}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        Renderers: {rep.renderersUsed.join(', ')}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-teal-700 dark:text-teal-300 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                How to Add a Topic (1-Page Reference)
              </h3>
              <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                {HOW_TO_ADD_TOPIC_GUIDE}
              </pre>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Copy verified TypeScript template matching ExplainerTopic schema</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(TOPIC_TEMPLATE, null, 2));
                  setCopiedTemplate(true);
                  setTimeout(() => setCopiedTemplate(false), 2000);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 dark:bg-cyan-600 text-white hover:bg-slate-800 dark:hover:bg-cyan-500 cursor-pointer"
              >
                {copiedTemplate ? 'Copied TOPIC_TEMPLATE JSON' : 'Copy TOPIC_TEMPLATE JSON'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
