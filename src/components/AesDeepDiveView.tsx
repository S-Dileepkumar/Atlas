import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  ExternalLink,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  AES_CURRICULUM,
  AesSubtopicDoc,
  gfMul,
  gfXtime,
  traceAes128Encryption,
} from '../data/aesCurriculum';

interface AesDeepDiveViewProps {
  onBack?: () => void;
  onSelectIp: (ipId: string) => void;
  onSelectProtocol: (protocolId: string) => void;
  onOpenCdc: (ipId: string) => void;
  onOpenCrypto?: () => void;
  initialSubtopicId?: string;
}

type DepthLayer = 'all' | 'l1' | 'l2' | 'l3';

const FIPS_PT = '3243f6a8885a308d313198a2e0370734';
const FIPS_KEY = '2b7e151628aed2a6abf7158809cf4f3c';

const hex2 = (v: number) => (v & 0xff).toString(16).padStart(2, '0').toUpperCase();

const StateMatrix4x4: React.FC<{ title: string; bytes: number[]; highlightNote?: string }> = ({
  title,
  bytes,
  highlightNote,
}) => (
  <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-2">
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="font-semibold text-[var(--text-primary)]">{title}</span>
      {highlightNote && <span className="text-[var(--sem-control)] font-mono">{highlightNote}</span>}
    </div>
    <div className="grid grid-cols-4 gap-1 font-mono text-xs tabular-nums">
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <div
            key={`${row}-${col}`}
            className="py-1.5 text-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] dark:text-[var(--sem-control)]"
            title={`s[${row}][${col}]`}
          >
            {hex2(bytes[col * 4 + row] ?? 0)}
          </div>
        ))
      )}
    </div>
  </div>
);

export const AesDeepDiveView: React.FC<AesDeepDiveViewProps> = ({
  onBack,
  onSelectIp,
  onSelectProtocol,
  onOpenCdc,
  onOpenCrypto,
  initialSubtopicId,
}) => {
  const allSubtopics = useMemo(
    () => AES_CURRICULUM.flatMap((c) => c.subtopics),
    []
  );

  const [selectedId, setSelectedId] = useState<string>(
    initialSubtopicId || allSubtopics[0].id
  );
  const [depthLayer, setDepthLayer] = useState<DepthLayer>('all');

  // Interactive FIPS-197 Hardware Round Lab state
  const [ptHex, setPtHex] = useState(FIPS_PT);
  const [keyHex, setKeyHex] = useState(FIPS_KEY);
  const [activeRound, setActiveRound] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Interactive GF(2^8) calculator state
  const [gfA, setGfA] = useState('57');
  const [gfB, setGfB] = useState('83');

  useEffect(() => {
    if (initialSubtopicId && allSubtopics.some((s) => s.id === initialSubtopicId)) {
      setSelectedId(initialSubtopicId);
    }
  }, [initialSubtopicId, allSubtopics]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setActiveRound((prev) => {
        if (prev >= 10) {
          setPlaying(false);
          return 10;
        }
        return prev + 1;
      });
    }, 1100);
    return () => clearInterval(t);
  }, [playing]);

  const activeTopicIndex = allSubtopics.findIndex((s) => s.id === selectedId);
  const topic: AesSubtopicDoc = allSubtopics[Math.max(0, activeTopicIndex)] || allSubtopics[0];
  const parentChapter = AES_CURRICULUM.find((c) => c.id === topic.chapterId) || AES_CURRICULUM[0];

  const rounds = useMemo(() => traceAes128Encryption(ptHex, keyHex), [ptHex, keyHex]);
  const currentRoundData = rounds[activeRound] || rounds[0];

  const aVal = parseInt(gfA.replace(/[^0-9a-fA-F]/g, '') || '0', 16) & 0xff;
  const bVal = parseInt(gfB.replace(/[^0-9a-fA-F]/g, '') || '0', 16) & 0xff;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header & Deep Cross-Platform Actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 text-[var(--text-primary)] hover:text-[var(--sem-control)] cursor-pointer mr-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            <span>AES Cryptography &amp; Hardware Architecture</span>
            <span aria-hidden="true">·</span>
            <span>7 Chapters · {allSubtopics.length} Deep-Dive Topics</span>
            <span aria-hidden="true">·</span>
            <span>FIPS-197 + OpenTitan hw/ip/aes RTL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] [text-wrap:balance]">
            AES Complete Technical Knowledge Base &amp; Interactive Round Lab
          </h1>
          <p className="text-xs text-[var(--text-secondary)] max-w-3xl">
            From finite-field $GF(2^8)$ math and SPN ciphers through OpenTitan DOM masking, sparse FSMs, TL-UL/KeyMgr/EDN interfaces, BoringSSL UVM scoreboarding, and side-channel TVLA signoff.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => onSelectIp('opentitan-aes')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--sem-control)] hover:opacity-90 text-white dark:text-slate-950 font-semibold cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" /> OpenTitan AES RTL IP
          </button>
          <button
            type="button"
            onClick={() => onOpenCdc('opentitan-aes')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-[var(--sem-control)]" /> EDN Clock Domains
          </button>
          <button
            type="button"
            onClick={() => onSelectProtocol('tl-ul')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[var(--sem-control)]" /> TL-UL Integrity Spec
          </button>
          {onOpenCrypto && (
            <button
              type="button"
              onClick={onOpenCrypto}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--sem-control)]" /> Crypto &amp; PQC Stack
            </button>
          )}
        </div>
      </div>

      {/* Interactive FIPS-197 AES-128 Hardware Round & GF(2^8) Stage */}
      <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div className="text-xs font-medium text-[var(--sem-control)]">
              Interactive Hardware Datapath &amp; Math Simulator [OFFICIAL SPECIFICATION · FIPS-197 Appendix B]
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Live AES-128 4×4 State Matrix & OpenTitan Round Loop Explorer
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setPtHex(FIPS_PT);
                setKeyHex(FIPS_KEY);
                setActiveRound(0);
                setPlaying(false);
              }}
              className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-500 cursor-pointer"
            >
              Load FIPS-197 Vector
            </button>
            <button
              type="button"
              onClick={() => setActiveRound((r) => Math.max(0, r - 1))}
              disabled={activeRound === 0}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              title="Previous Round"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeRound >= 10) setActiveRound(0);
                setPlaying((p) => !p);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[var(--sem-control)] hover:opacity-90 text-white dark:text-slate-950 font-semibold cursor-pointer"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? 'Pause' : 'Step Rounds'}
            </button>
            <button
              type="button"
              onClick={() => setActiveRound((r) => Math.min(10, r + 1))}
              disabled={activeRound === 10}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              title="Next Round"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setActiveRound(0);
              }}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 hover:border-cyan-500 cursor-pointer"
              title="Reset to Round 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Plaintext & Key Inputs + Round Slider */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs items-end">
          <div className="lg:col-span-4 space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              128-Bit Plaintext Input (`DATA_IN_0..3`, 32 hex chars)
            </label>
            <input
              type="text"
              value={ptHex}
              onChange={(e) => setPtHex(e.target.value)}
              maxLength={32}
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-cyan-300"
            />
          </div>
          <div className="lg:col-span-4 space-y-1">
            <label className="font-medium text-slate-700 dark:text-slate-300">
              128-Bit Master Key (`KEY_SHARE0 ^ KEY_SHARE1`, 32 hex chars)
            </label>
            <input
              type="text"
              value={keyHex}
              onChange={(e) => setKeyHex(e.target.value)}
              maxLength={32}
              className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-cyan-300"
            />
          </div>
          <div className="lg:col-span-4 space-y-1">
            <div className="flex justify-between">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Active Hardware Round (`rnd_ctr_q = {activeRound} / 10`)
              </span>
              <span className="font-mono text-cyan-700 dark:text-cyan-400">
                FSM: {currentRoundData.fsmState}
              </span>
            </div>
            <div className="flex items-center gap-1 pt-1">
              {rounds.map((r) => (
                <button
                  key={r.round}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setActiveRound(r.round);
                  }}
                  className={`flex-1 py-1.5 rounded font-mono text-[11px] cursor-pointer transition-colors ${
                    activeRound === r.round
                      ? 'bg-[var(--sem-control)] text-white dark:text-slate-950 font-bold'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  {r.round}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Round Description + Live 4x4 Byte Matrices */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {currentRoundData.label}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StateMatrix4x4 title="Start of Round (`state_q`)" bytes={currentRoundData.inputState} />
            {currentRoundData.afterSubBytes && (
              <StateMatrix4x4
                title="After SubBytes (`aes_sub_bytes`)"
                bytes={currentRoundData.afterSubBytes}
                highlightNote="20 S-Boxes"
              />
            )}
            {currentRoundData.afterShiftRows && (
              <StateMatrix4x4
                title="After ShiftRows (`aes_shift_rows`)"
                bytes={currentRoundData.afterShiftRows}
                highlightNote="Wire Rotate"
              />
            )}
            {currentRoundData.afterMixColumns ? (
              <StateMatrix4x4
                title="After MixColumns (`aes_mix_columns`)"
                bytes={currentRoundData.afterMixColumns}
                highlightNote="GF(2^8)"
              />
            ) : (
              activeRound > 0 && (
                <div className="p-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col justify-center text-xs text-amber-800 dark:text-amber-300">
                  <strong>MixColumns Bypassed</strong>
                  <span className="mt-1 text-[11px]">
                    Round 10 skips `aes_mix_columns` via Final Round mux!
                  </span>
                </div>
              )
            )}
            <StateMatrix4x4
              title={`Output after XOR Key[${activeRound}]`}
              bytes={currentRoundData.outputState}
              highlightNote={activeRound === 10 ? 'Ciphertext!' : 'AddRoundKey'}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-400">
            <span>
              RoundKey[{activeRound}]:{' '}
              <strong className="text-slate-900 dark:text-slate-200">
                {currentRoundData.roundKey.map(hex2).join(' ')}
              </strong>
            </span>
            <span>
              Output Block:{' '}
              <strong className="text-cyan-700 dark:text-cyan-300">
                {currentRoundData.outputState.map(hex2).join('')}
              </strong>
            </span>
          </div>
        </div>

        {/* Inline GF(2^8) Polynomial Arithmetic Micro-Lab */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
            <Calculator className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Interactive GF(2^8) Hardware Math (`m(x) = x^8+x^4+x^3+x+1 = 0x11B`):
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <label className="inline-flex items-center gap-1.5">
              <span className="text-slate-500">Byte A: 0x</span>
              <input
                type="text"
                value={gfA}
                onChange={(e) => setGfA(e.target.value.slice(0, 2))}
                className="w-12 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-center"
              />
            </label>
            <label className="inline-flex items-center gap-1.5">
              <span className="text-slate-500">Byte B: 0x</span>
              <input
                type="text"
                value={gfB}
                onChange={(e) => setGfB(e.target.value.slice(0, 2))}
                className="w-12 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-center"
              />
            </label>
            <span className="text-slate-700 dark:text-slate-300">
              A + B (XOR) = <strong className="text-cyan-700 dark:text-cyan-400">0x{hex2(aVal ^ bVal)}</strong>
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              xtime(A) = <strong className="text-cyan-700 dark:text-cyan-400">0x{hex2(gfXtime(aVal))}</strong>
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              A * B = <strong className="text-emerald-700 dark:text-emerald-400">0x{hex2(gfMul(aVal, bVal))}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Main Two-Column Exhaustive Curriculum Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Tree: Exact 7-Chapter AES Hierarchy */}
        <aside className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-4 lg:sticky lg:top-20">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              AES Complete Technical Tree (01–07)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Click any of the {allSubtopics.length} subtopics to study Level 1 Fundamentals, Level 2 Engineering, and Level 3 RTL/Verification Expert layers.
            </p>
          </div>

          <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1 text-xs">
            {AES_CURRICULUM.map((chap) => (
              <div key={chap.id} className="space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 px-2 py-1">
                  {chap.number}. {chap.title}
                </div>
                <div className="pl-3 ml-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                  {chap.subtopics.map((sub) => {
                    const active = sub.id === topic.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedId(sub.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <span>{sub.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {sub.evidenceTags[0]?.includes('RTL') ? 'RTL' : sub.evidenceTags[0]?.includes('VERIFICATION') ? 'DV' : 'SPEC'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Detailed 3-Layer Content Panel */}
        <div className="lg:col-span-8 space-y-5">
          {/* Header + 3-Level Filter Bar */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-700 dark:text-cyan-400 font-medium">
                  <span>
                    {parentChapter.number}. {parentChapter.title}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{topic.evidenceTags.join(' · ')}</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {topic.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{parentChapter.overview}</p>
              </div>

              {/* 3-Layer Depth Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-xs shrink-0">
                {[
                  { id: 'all' as DepthLayer, label: 'All 3 Levels' },
                  { id: 'l1' as DepthLayer, label: 'L1 Fundamental' },
                  { id: 'l2' as DepthLayer, label: 'L2 Engineering' },
                  { id: 'l3' as DepthLayer, label: 'L3 Expert' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setDepthLayer(lvl.id)}
                    className={`px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer ${
                      depthLayer === lvl.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Traceability Strip */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Source Traceability:</span>
              {topic.sourceRefs.map((ref) =>
                ref.url ? (
                  <a
                    key={ref.label}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-400 hover:underline font-mono"
                  >
                    {ref.label} ({ref.path}) <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span key={ref.label} className="font-mono">
                    {ref.label} · {ref.path}
                  </span>
                )
              )}
            </div>
          </div>

          {/* LEVEL 1 — FUNDAMENTAL UNDERSTANDING */}
          {(depthLayer === 'all' || depthLayer === 'l1') && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-50/40 dark:bg-cyan-950/20 p-6 space-y-4 text-sm">
              <div className="flex items-center gap-2 text-base font-bold text-cyan-800 dark:text-cyan-300">
                <BookOpen className="w-4 h-4" />
                LEVEL 1 — Fundamental Understanding (First Principles & Everyday Analogy)
              </div>
              <p className="text-base text-slate-800 dark:text-slate-100 leading-relaxed">
                {topic.level1Fundamental.summary}
              </p>
              <div className="p-3.5 rounded border border-cyan-500/20 bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 leading-relaxed">
                <strong className="text-cyan-800 dark:text-cyan-300">Everyday Analogy:</strong>{' '}
                {topic.level1Fundamental.everydayAnalogy}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {topic.level1Fundamental.whatHappensStepByStep.map((step, i) => (
                  <div
                    key={i}
                    className="p-3 rounded border border-cyan-500/20 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 leading-relaxed"
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LEVEL 2 — ENGINEERING UNDERSTANDING */}
          {(depthLayer === 'all' || depthLayer === 'l2') && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-4 text-sm">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                LEVEL 2 — Engineering Understanding (Architecture, Math & Worked Example)
              </div>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-base">
                {topic.level2Engineering.architectureAndSpec}
              </p>
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Key Equations, Widths & RTL Parameters
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 font-mono text-slate-700 dark:text-cyan-300">
                  {topic.level2Engineering.keyParametersOrMath.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Worked Engineering Example
                </div>
                <p className="text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
                  {topic.level2Engineering.workedExample}
                </p>
              </div>
            </div>
          )}

          {/* LEVEL 3 — EXPERT UNDERSTANDING */}
          {(depthLayer === 'all' || depthLayer === 'l3') && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 space-y-5 text-sm">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                LEVEL 3 — Expert Understanding (Microarchitecture, Corner Cases & Verification Trade-Offs)
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  RTL Microarchitecture & Physical Implementation Details
                </h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {topic.level3Expert.rtlAndMicroarchitecture}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-rose-700 dark:text-rose-400">
                  Corner Case & Failure Analysis
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {topic.level3Expert.cornerCasesAndFailures.map((cf, i) => (
                    <div
                      key={i}
                      className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1.5"
                    >
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Symptom: {cf.symptom}
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        <strong>Root Cause:</strong> {cf.rootCause}
                      </div>
                      <div className="text-cyan-800 dark:text-cyan-300">
                        <strong>Detection & Prevention:</strong> {cf.detection}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Verification & Architectural Trade-Offs
                </h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {topic.level3Expert.verificationAndTradeoffs}
                </p>
              </div>
            </div>
          )}

          {/* Sequential Topic Navigator */}
          <div className="flex items-center justify-between gap-4 pt-2 text-xs">
            <button
              type="button"
              disabled={activeTopicIndex <= 0}
              onClick={() => activeTopicIndex > 0 && setSelectedId(allSubtopics[activeTopicIndex - 1].id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {activeTopicIndex > 0 ? allSubtopics[activeTopicIndex - 1].title : 'Start'}
            </button>
            <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              Topic {activeTopicIndex + 1} of {allSubtopics.length}
            </span>
            <button
              type="button"
              disabled={activeTopicIndex >= allSubtopics.length - 1}
              onClick={() =>
                activeTopicIndex < allSubtopics.length - 1 &&
                setSelectedId(allSubtopics[activeTopicIndex + 1].id)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[var(--sem-control)] hover:opacity-90 text-white dark:text-slate-950 font-semibold disabled:opacity-40 cursor-pointer"
            >
              {activeTopicIndex < allSubtopics.length - 1
                ? allSubtopics[activeTopicIndex + 1].title
                : 'Complete'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
