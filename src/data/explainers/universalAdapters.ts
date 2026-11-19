import {
  ExplainerDomain,
  ExplainerTopic,
  SelfCheckQuestion,
} from '../../engine/explainerSchema';
import { IpEntity } from '../../types/ipUniverse';
import { CategoryId, ProtocolDocument } from '../../types/protocol';

const FLAGSHIP_PROTOCOL_ALIASES: Record<string, string> = {
  axi4: 'axi4-handshakes',
  'pcie-gen5': 'pcie-ltssm-tlp',
  ddr5: 'ddr5-bank-refresh',
};

const FLAGSHIP_IP_ALIASES: Record<string, string> = {
  'opentitan-hmac': 'opentitan-hmac',
  gemmini: 'systolic-gemmini',
  'vortex-gpu': 'gpu-warp-simt',
  'rocket-chip': 'riscv-5stage-pipeline',
};

export function mapCategoryToExplainerDomain(cat: CategoryId): ExplainerDomain {
  switch (cat) {
    case 'memory':
    case 'storage':
      return 'Memory';
    case 'coherency':
    case 'noc':
    case 'chip-to-chip':
    case 'interconnect':
      return 'Interconnect';
    case 'processor':
    case 'proc-arch':
      return 'CPUs';
    case 'accelerator':
      return 'Accelerators';
    case 'power-mgmt':
    case 'clock-cdc':
    case 'dft-test':
    case 'phys-design':
    case 'packaging':
      return 'SoCs';
    case 'security':
      return 'IP Blocks';
    default:
      return 'Protocols';
  }
}

export function mapIpCategoryToExplainerDomain(cat: IpEntity['category']): ExplainerDomain {
  switch (cat) {
    case 'CPU & Processor':
      return 'CPUs';
    case 'GPU & Graphics':
      return 'GPUs';
    case 'AI & ML Accelerator':
      return 'Accelerators';
    case 'SoC Interconnect & NoC':
      return 'Interconnect';
    case 'Memory & Cache':
      return 'Memory';
    default:
      return 'IP Blocks';
  }
}

function parseBitRange(bitsStr: string): { msb: number; lsb: number } {
  const clean = bitsStr.replace(/[^0-9:]/g, '');
  if (clean.includes(':')) {
    const [a, b] = clean.split(':').map((n) => Number.parseInt(n, 10));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { msb: Math.max(a, b), lsb: Math.min(a, b) };
    }
  }
  const single = Number.parseInt(clean, 10);
  if (Number.isFinite(single)) return { msb: single, lsb: single };
  return { msb: 0, lsb: 0 };
}

export function buildProtocolExplainer(p: ProtocolDocument): ExplainerTopic {
  const domain = mapCategoryToExplainerDomain(p.categoryId);

  // Preserve full 2D multi-component schematic coordinates from protocol architecture
  const rawNodes =
    p.architecture.nodes.length >= 2
      ? p.architecture.nodes
      : [
          { id: 'mgr', label: `${p.name} Initiator`, role: 'manager' as const, x: 40, y: 80, width: 200, height: 110 },
          { id: 'sub', label: `${p.name} Target`, role: 'subordinate' as const, x: 460, y: 80, width: 200, height: 110 },
        ];

  const nodes = rawNodes.map((n) => ({
    id: n.id,
    label: n.label,
    sublabel: n.sublabel || n.role.toUpperCase(),
    domain: n.domain,
    ports: n.ports,
    componentKind: n.componentKind,
    x: n.x,
    y: n.y,
    w: n.width || 210,
    h: n.height || 104,
    kind:
      n.role === 'manager'
        ? ('control' as const)
        : n.role === 'phy'
        ? ('active' as const)
        : ('data' as const),
  }));

  const maxBlockW = Math.max(920, ...nodes.map((n) => n.x + n.w)) + 36;
  const maxBlockH = Math.max(420, ...nodes.map((n) => n.y + n.h)) + 36;

  const wires = p.architecture.links.map((lnk, idx) => {
    const n1 = nodes.find((n) => n.id === lnk.from) || nodes[0];
    const n2 = nodes.find((n) => n.id === lnk.to) || nodes[nodes.length - 1];
    const n1cx = n1.x + n1.w / 2;
    const n1cy = n1.y + n1.h / 2;
    const n2cx = n2.x + n2.w / 2;
    const n2cy = n2.y + n2.h / 2;
    const vertical = Math.abs(n2cx - n1cx) < Math.max(n1.w, n2.w) * 0.65 && Math.abs(n2cy - n1cy) > 30;
    const laneOffset = idx % 2 === 0 ? -12 : 12;

    const fromX = vertical ? n1cx + laneOffset : n2cx >= n1cx ? n1.x + n1.w : n1.x;
    const fromY = vertical ? (n2cy >= n1cy ? n1.y + n1.h : n1.y) : n1cy + laneOffset;
    const toX = vertical ? n2cx + laneOffset : n2cx >= n1cx ? n2.x : n2.x + n2.w;
    const toY = vertical ? (n2cy >= n1cy ? n2.y : n2.y + n2.h) : n2cy + laneOffset;

    return {
      id: `w${idx}`,
      fromX,
      fromY,
      toX,
      toY,
      label: lnk.label,
      kind:
        lnk.channelKind === 'error'
          ? ('error' as const)
          : lnk.channelKind === 'data'
          ? ('data' as const)
          : ('control' as const),
    };
  });

  const phases = p.transactionFlow.nominal.slice(0, 5);
  const seqSteps = Math.max(4, phases.length);
  const packets = wires.map((w, idx) => ({
    step: idx % seqSteps,
    wireId: w.id,
    label: w.label.slice(0, 16),
    kind: (w.kind === 'error' ? 'error' : idx % 2 === 0 ? 'control' : 'data') as 'control' | 'data' | 'active' | 'error',
    progress: 0.52,
  }));
  const wNom = p.waveforms[0];
  const wAlt = p.waveforms[1];
  const waveSignals = (wNom?.signals || []).slice(0, 6).map((s, sIdx) => {
    const altS = wAlt?.signals[sIdx];
    const toStr = (v: number | string) => String(v);
    return {
      name: s.name,
      kind: (sIdx === 0 ? 'control' : s.type === 'bit' ? 'control' : 'data') as 'control' | 'data',
      values: s.values.map(toStr),
      backpressureValues: altS ? altS.values.map(toStr) : undefined,
    };
  });
  if (waveSignals.length === 0) {
    waveSignals.push(
      { name: 'VALID', kind: 'control', values: ['0', '1', '1', '0', '0'], backpressureValues: ['0', '1', '1', '1', '0'] },
      { name: 'READY', kind: 'control', values: ['1', '1', '1', '1', '1'], backpressureValues: ['1', '0', '1', '1', '1'] },
      { name: 'DATA', kind: 'data', values: ['IDLE', 'CMD', 'PAYLOAD', 'IDLE', 'IDLE'], backpressureValues: ['IDLE', 'HOLD', 'COMMIT', 'IDLE', 'IDLE'] }
    );
  }

  const waveCycles = Math.max(4, wNom?.cycles || waveSignals[0]?.values.length || 5);
  const sigA = p.signals[0]?.name || 'CLK';
  const sigB = p.signals[1]?.name || 'VALID_REQ';
  const sigC = p.signals[2]?.name || 'READY_ACK';

  const selfCheck: SelfCheckQuestion[] = [
    {
      id: `${p.id}-q1`,
      question: `What primary engineering problem does ${p.name} (${p.standardBody}) solve?`,
      options: [
        p.overview.problemSolved.slice(0, 110),
        'Replaces power delivery networks with unclocked combinational loops',
        'Eliminates all digital synchronous reset rules inside SoCs',
      ],
      correctIndex: 0,
      explanation: p.overview.problemSolved,
    },
    {
      id: `${p.id}-q2`,
      question: `Which failure mode is flagged in ${p.name} verification & debugging checks?`,
      options: [
        'Guaranteed infinite clock speedup without setup margins',
        p.verification.cornerCases[0] || `Backpressure stall or uninitialized reset propagation on ${sigB}`,
        'Automatic bypassing of all functional coverage targets',
      ],
      correctIndex: 1,
      explanation: p.verification.cornerCases[0] || 'Stalls, reset recovery, and protocol invariants must hold under corner conditions.',
    },
    {
      id: `${p.id}-q3`,
      question: `Where do configurable parameters and timing limits for ${p.name} live?`,
      options: [
        'Strictly hardcoded to 1-bit fixed serial mode only',
        'Specified across specification parameters (version & implementation dependent)',
        'Omitted completely from verification monitors',
      ],
      correctIndex: 1,
      explanation: `Width, depth, and optional profiles for ${p.name} vary by implementation and spec revision (${p.specVersion}).`,
    },
  ];

  return {
    id: `proto-${p.id}`,
    title: `${p.name} — ${p.fullName}`,
    domain,
    summary: p.tagline || p.overview.definition,
    specVersion: `${p.standardBody} · ${p.specVersion} (${p.year})`,
    specDifferenceNote:
      p.lifecycleNote ||
      p.versionDifferences?.map((v) => `${v.version}: ${v.keyChanges}`).join(' | ') ||
      `${p.entityType || 'Protocol'} governed by ${p.standardBody} (${p.year}). Configurable widths & FIFO depths are implementation dependent.`,
    unverifiedOrGenericItems: [
      `Configurable widths, queue depths, and silicon latency budgets in ${p.name} vary per SoC implementation (version dependent).`,
      'Packet/frame schematic bitfield illustrates conceptual header/control qualifiers unless fixed by a bit-exact wire standard.',
    ],
    sources:
      p.sources.length > 0
        ? p.sources.map((s) => ({ name: s.title, version: s.authority, section: s.reference }))
        : [{ name: p.standardBody, version: p.specVersion, section: `${p.name} Primary Reference` }],
    glossary:
      p.overview.terminology.length > 0
        ? p.overview.terminology.map((t) => ({ term: t.term, definition: t.meaning }))
        : [{ term: p.name, definition: p.overview.definition }],
    relatedTopics: [
      { id: 'axi4-handshakes', label: 'AXI4 Handshakes', reason: 'Compare against SoC burst bus flow control' },
      { id: 'soc-fabric-memory-walk', label: 'SoC Address Decode', reason: 'See system integration context' },
    ],
    signals: p.signals.slice(0, 8).map((s) => ({
      name: s.name,
      width: s.width,
      direction: s.direction,
      kind: s.name.toLowerCase().includes('err') || s.name.toLowerCase().includes('resp') ? 'error' : s.channel.toLowerCase().includes('data') ? 'data' : 'control',
      rule: s.timingRules || s.summary,
    })),
    programmingModel: p.transactionFlow.nominal.map((ph) => `${ph.step}. ${ph.phase}: ${ph.description}`),
    verificationView: {
      checks: [p.verification.uvmArchitecture, ...p.verification.cornerCases.slice(0, 2)],
      assertions: [p.verification.svaSnippet || `assert property (@(posedge clk) !$isunknown(${sigB}));`],
      coveragePoints: p.verification.coveragePoints,
      scoreboardPlacement: p.verification.scoreboardStrategy || 'Monitor samples active transfers into reference predictor.',
    },
    commonMistakes: p.rtl.commonMistakes.length > 0 ? p.rtl.commonMistakes : [`Violating ${sigB}/${sigC} handshake stability or reset rules.`],
    tryItControls: [
      {
        id: 'backpressure',
        label: 'Stall / Backpressure Scenario',
        type: 'toggle',
        defaultValue: false,
        effectSummary: `Switches waveform & block paths to demonstrate stall hold and recovery on ${p.name}.`,
      },
      {
        id: 'injectError',
        label: 'Inject Fault / Violation',
        type: 'toggle',
        defaultValue: false,
        effectSummary: 'Highlights error/recovery response across protocol layers.',
      },
    ],
    selfCheck,
    linkedProtocolId: p.id,
    scenes: [
      {
        id: `${p.id}-arch-flow`,
        title: `Architecture Topology & Nominal Flow`,
        text: {
          overview: p.overview.definition,
          detail: `${p.architecture.summary} Clock & Reset: ${p.architecture.clockAndReset}`,
          expert: `${p.rtl.architectureNotes} Verification strategy: ${p.verification.uvmArchitecture}`,
        },
        renderers: [
          {
            kind: 'block_packet',
            title: `${p.name} Architectural Datapath & Active Signals`,
            config: { width: maxBlockW, height: maxBlockH, nodes, wires, packets },
          },
          {
            kind: 'sequence_flow',
            title: `${p.name} Transaction Phase Sequence`,
            config: {
              lifelines: [
                { id: 'mgr', label: 'Initiator / Source', role: 'Producer' },
                { id: 'bus', label: `${p.name} Channel`, role: 'Transport' },
                { id: 'sub', label: 'Target / Sink', role: 'Consumer' },
              ],
              messages: phases.map((ph, idx) => ({
                step: idx,
                from: idx % 2 === 0 ? 'mgr' : 'sub',
                to: idx % 2 === 0 ? 'sub' : 'mgr',
                label: `${ph.phase}: ${ph.title.slice(0, 32)}`,
                kind: idx === phases.length - 1 ? 'active' : idx % 2 === 0 ? 'control' : 'data',
                rule: ph.activeSignals.join(', '),
              })),
            },
          },
        ],
        highlightList: [sigA, sigB, sigC],
        causalityRules: [
          {
            rule: `${p.name} Nominal Progress`,
            cause: `Qualified control strobe on ${sigB}`,
            effect: p.architecture.dataFlow,
          },
        ],
        events: phases.map((ph, idx) => ({
          step: idx,
          label: `${ph.phase} — ${ph.description.slice(0, 75)}`,
          kind: idx === phases.length - 1 ? 'active' : 'control',
        })),
        playbackSteps: seqSteps,
        ariaDescription: `Interactive block and sequence explainer for ${p.name} showing architectural blocks and nominal transaction phases.`,
      },
      {
        id: `${p.id}-wave-decode`,
        title: 'Cycle-Accurate Timing Waveform & Header Qualifier Decoder',
        text: {
          overview: `Observe how ${p.name} signals transition across clock cycles under normal operation and backpressure stalls.`,
          detail: `Scrub cycle markers T0..T${waveCycles - 1} or toggle "Stall / Backpressure Scenario" to compare nominal vs held cycles.`,
          expert: p.debuggingLab[0]?.rootCause || p.transactionFlow.errorAndOrdering[0] || `Ensure strict SVA stability invariants hold across every stall cycle.`,
        },
        renderers: [
          {
            kind: 'waveform',
            title: `${p.name} Interactive Signal Timing`,
            config: { signals: waveSignals },
          },
          {
            kind: 'bitfield',
            title: `${p.name} Qualifier / Status Word Schematic (Live Hex Decoder)`,
            config: {
              registerName: `${p.name} Control & Qualifier Bundle (Schematic)`,
              widthBits: 32,
              defaultHex: '0x00010205',
              presets: [
                { label: 'Nominal', hex: '0x00010205' },
                { label: 'Fault Status', hex: '0x80010205' },
              ],
              highlightByStep: { 0: ['MODE_CTRL'], 1: ['PAYLOAD_TAG'], 2: ['ERR_STATUS'] },
              fields: [
                { msb: 31, lsb: 28, name: 'ERR_STATUS', kind: 'error', access: 'RO', description: 'Protocol / link fault indicator bits.' },
                { msb: 27, lsb: 16, name: 'MODE_CTRL', kind: 'control', access: 'RW', description: 'Channel command, opcode, or attribute qualifiers.' },
                { msb: 15, lsb: 0, name: 'PAYLOAD_TAG', kind: 'data', access: 'RW', description: 'Transaction ID, beat count, or byte/checksum length.' },
              ],
            },
          },
        ],
        highlightList: waveSignals.slice(0, 3).map((s) => s.name),
        causalityRules: [
          {
            rule: 'Waveform Handshake Hold',
            cause: 'Backpressure / Wait state active',
            effect: 'Hold valid control qualifiers stable until handshake/timeout completes',
          },
        ],
        events: [
          { step: 0, label: `Idle / Reset settled across ${sigA}`, kind: 'control' },
          { step: 1, label: `${sigB} initiates active phase`, kind: 'active' },
          { step: 2, label: 'Data / Payload transfer or wait stall evaluated', kind: 'data' },
        ],
        playbackSteps: waveCycles,
        ariaDescription: `Interactive cycle waveform and 32-bit hex decoder for ${p.name}.`,
      },
    ],
  };
}

export function buildIpExplainer(ip: IpEntity): ExplainerTopic {
  const domain = mapIpCategoryToExplainerDomain(ip.category);

  // Preserve full 2D schematic coordinates from IP architecture
  const nodes = ip.architecture.blocks.map((b) => ({
    id: b.id,
    label: b.label,
    sublabel: b.moduleName || b.role.toUpperCase(),
    domain: b.role.toUpperCase(),
    x: b.x,
    y: b.y,
    w: b.width || 215,
    h: b.height || 92,
    kind: (b.role === 'control' || b.role === 'interface' ? 'control' : 'data') as 'control' | 'data',
  }));

  const ipBlockW = Math.max(840, ...nodes.map((n) => n.x + n.w)) + 36;
  const ipBlockH = Math.max(440, ...nodes.map((n) => n.y + n.h)) + 36;

  const wires = ip.architecture.links.map((l, idx) => {
    const n1 = nodes.find((n) => n.id === l.from) || nodes[0];
    const n2 = nodes.find((n) => n.id === l.to) || nodes[Math.min(nodes.length - 1, 1)];
    const n1cx = n1.x + n1.w / 2;
    const n1cy = n1.y + n1.h / 2;
    const n2cx = n2.x + n2.w / 2;
    const n2cy = n2.y + n2.h / 2;
    const vertical = Math.abs(n2cx - n1cx) < Math.max(n1.w, n2.w) * 0.65 && Math.abs(n2cy - n1cy) > 30;
    const laneOffset = idx % 2 === 0 ? -10 : 10;

    return {
      id: `iw${idx}`,
      fromX: vertical ? n1cx + laneOffset : n2cx >= n1cx ? n1.x + n1.w : n1.x,
      fromY: vertical ? (n2cy >= n1cy ? n1.y + n1.h : n1.y) : n1cy + laneOffset,
      toX: vertical ? n2cx + laneOffset : n2cx >= n1cx ? n2.x : n2.x + n2.w,
      toY: vertical ? (n2cy >= n1cy ? n2.y : n2.y + n2.h) : n2cy + laneOffset,
      label: l.label,
      kind: (idx % 2 === 0 ? 'control' : 'data') as 'control' | 'data',
    };
  });

  const fsmMod = ip.modules.find((m) => m.fsms && m.fsms.length > 0);
  const fsmObj = fsmMod?.fsms?.[0] || { name: 'core_fsm', states: ['IDLE', 'DECODE', 'EXECUTE', 'RESPOND'] };
  const fsmStatesList = fsmObj.states.slice(0, 5);
  const fsmNodes = fsmStatesList.map((st, idx) => ({
    id: st,
    label: st.slice(0, 10),
    x: 80 + idx * Math.floor(500 / Math.max(1, fsmStatesList.length - 1)),
    y: idx % 2 === 0 ? 90 : 140,
    kind: st.toLowerCase().includes('err') ? ('error' as const) : undefined,
  }));
  const fsmTransitions = fsmNodes.slice(0, -1).map((st, idx) => ({
    from: st.id,
    to: fsmNodes[idx + 1].id,
    guard: `step_${idx + 1}`,
    stepTrigger: idx + 1,
  }));

  const firstReg = ip.registers[0];
  const regFields = firstReg
    ? firstReg.fields.slice(0, 6).map((f) => {
        const range = parseBitRange(f.bits);
        return {
          msb: range.msb,
          lsb: range.lsb,
          name: f.name,
          kind: (f.access === 'RO' ? 'data' : 'control') as 'control' | 'data',
          access: f.access,
          description: f.description,
        };
      })
    : [
        { msb: 31, lsb: 16, name: 'CFG_PARAM', kind: 'data' as const, access: 'RW', description: `Elaboration/mode field for ${ip.name}` },
        { msb: 15, lsb: 1, name: 'CTRL_STATUS', kind: 'control' as const, access: 'RO', description: 'Busy / Idle / Fault indicator' },
        { msb: 0, lsb: 0, name: 'ENABLE', kind: 'control' as const, access: 'RW', description: 'Core functional enable' },
      ];

  const primaryMod = ip.modules[0];
  const selfCheck: SelfCheckQuestion[] = [
    {
      id: `${ip.id}-iq1`,
      question: `What is the SoC integration role of ${ip.name}?`,
      options: [
        ip.functional.socRole.slice(0, 115),
        'Non-synthesizable testbench helper never compiled into silicon',
        'Analog voltage regulator outside digital RTL hierarchy',
      ],
      correctIndex: 0,
      explanation: ip.functional.socRole,
    },
    {
      id: `${ip.id}-iq2`,
      question: `Which verification framework is documented upstream for ${ip.name}?`,
      options: [
        'None (manual visual inspection only)',
        ip.verification.existingInfra.framework,
        'Spreadsheet estimation without RTL simulation',
      ],
      correctIndex: 1,
      explanation: `${ip.name} uses ${ip.verification.existingInfra.framework} (${ip.verification.maturity}).`,
    },
    {
      id: `${ip.id}-iq3`,
      question: `Which bus interface connects ${ip.name} into an SoC fabric?`,
      options: [
        ip.interfaces.map((i) => i.protocolLabel).join(' / ') || 'Standard SoC Bus',
        'Analog VGA Composite Only',
        'Unbuffered PS/2 Keyboard Port Only',
      ],
      correctIndex: 0,
      explanation: `External ports of ${ip.name} integrate over ${ip.interfaces.map((i) => i.protocolLabel).join(', ')}.`,
    },
  ];

  const stepCount = Math.max(4, fsmStatesList.length);

  return {
    id: `ip-${ip.id}`,
    title: `${ip.name} (${ip.category})`,
    domain,
    summary: ip.tagline,
    specVersion: `${ip.rtlLanguage} · ${ip.latestRef} · ${ip.license}`,
    specDifferenceNote: `${ip.implementationKind} (${ip.developmentStatus}). Clocks: ${ip.architecture.clocks.join(', ')}.`,
    unverifiedOrGenericItems: [
      ...ip.functional.limitations,
      `FIFO depths, CSR width, or pipeline stages can vary across upstream parameters (${ip.parameters.map((p) => p.name).join(', ')}).`,
    ],
    sources: ip.references.map((r) => ({ name: r.label, version: ip.latestRef, section: `${r.kind} (${r.url})` })),
    glossary: ip.modules.slice(0, 4).map((m) => ({ term: m.name, definition: m.summary })),
    relatedTopics: [
      ...ip.interfaces.slice(0, 2).map((ifc) => ({
        id: FLAGSHIP_PROTOCOL_ALIASES[ifc.protocolId] || `proto-${ifc.protocolId}`,
        label: `${ifc.protocolLabel} Bus Protocol`,
        reason: `External interface port used by ${ip.name}`,
      })),
    ],
    signals: (primaryMod?.ports || []).slice(0, 8).map((pt) => ({
      name: pt.name,
      width: pt.width,
      direction: pt.direction,
      kind: pt.name.toLowerCase().includes('err') ? 'error' : pt.protocolHint ? 'data' : 'control',
      rule: pt.description,
    })),
    programmingModel: ip.functional.keyOperations,
    verificationView: {
      checks: [
        `${ip.verification.maturity} (${ip.verification.existingInfra.framework})`,
        ...ip.verification.recommendedStrategy.slice(0, 2),
      ],
      assertions: ip.verification.existingInfra.assertionsAndFormal,
      coveragePoints: ip.verification.existingInfra.coverageAndTests,
      scoreboardPlacement: ip.verification.existingInfra.agentsAndComponents.join(' · '),
    },
    commonMistakes: ip.functional.limitations.length > 0 ? ip.functional.limitations : ['Check clock/reset polarity before SoC integration.'],
    tryItControls: [
      {
        id: 'backpressure',
        label: 'Interface Stall / Backpressure',
        type: 'toggle',
        defaultValue: false,
        effectSummary: `Demonstrates ${ip.name} buffering under downstream bus stall.`,
      },
    ],
    selfCheck,
    linkedIpId: ip.id,
    scenes: [
      {
        id: `${ip.id}-rtl-fsm`,
        title: 'Internal RTL Submodules & Control State Machine',
        text: {
          overview: ip.functional.whatItDoes,
          detail: `${ip.architecture.summary} Primary modules: ${ip.modules.map((m) => m.name).join(', ')}.`,
          expert: `${ip.implementation.timingAndAreaNotes} Clocking: ${ip.implementation.clockingArchitecture}`,
        },
        renderers: [
          {
            kind: 'block_packet',
            title: `${ip.name} Internal Hardware Datapath`,
            config: {
              width: ipBlockW,
              height: ipBlockH,
              nodes,
              wires,
              packets: wires.map((w, idx) => ({
                step: idx % stepCount,
                wireId: w.id,
                label: w.label.slice(0, 14),
                kind: idx % 2 === 0 ? 'control' : 'data',
              })),
            },
          },
          {
            kind: 'fsm',
            title: `Extracted RTL Control FSM (${fsmObj.name})`,
            config: {
              width: 680,
              height: 210,
              states: fsmNodes,
              transitions: fsmTransitions,
              activeStateByStep: fsmStatesList,
            },
          },
        ],
        highlightList: [fsmObj.name, ...(primaryMod ? [primaryMod.name] : [])],
        causalityRules: [
          {
            rule: 'Reset & Clock Synchronization',
            cause: `Clocks: ${ip.architecture.clocks[0] || 'clk'} | Reset: ${ip.architecture.resets[0] || 'rst_n'}`,
            effect: 'Initializes FSM safely to state[0] before accepting bus transactions',
          },
        ],
        events: fsmStatesList.map((st, idx) => ({
          step: idx,
          label: `FSM enters ${st}`,
          kind: idx === fsmStatesList.length - 1 ? 'active' : 'control',
        })),
        playbackSteps: stepCount,
        ariaDescription: `Interactive RTL block datapath and control FSM visualizer for ${ip.name}.`,
      },
      {
        id: `${ip.id}-csr-domains`,
        title: firstReg ? `CSR Register Decoder (${firstReg.name}) & Clock/Reset Domains` : 'Clock/Reset Topology & Staging Buffer',
        text: {
          overview: firstReg
            ? `Inspect ${firstReg.name} (${firstReg.offset}) bit fields live using the hex decoder alongside clock/reset domains.`
            : `Inspect clock/reset hierarchy domains and internal queue behavior across ${ip.name}.`,
          detail: `Clocks: ${ip.architecture.clocks.join(', ')} · Resets: ${ip.architecture.resets.join(', ')}.`,
          expert: `ASIC/FPGA Note: ${ip.implementation.asicConsiderations} · ${ip.implementation.fpgaSupport}`,
        },
        renderers: [
          {
            kind: 'bitfield',
            title: firstReg ? `${firstReg.name} (${firstReg.offset}, Reset ${firstReg.resetValue})` : `${ip.name} Control Schematic Word`,
            config: {
              registerName: firstReg ? `${ip.name} · ${firstReg.name}` : `${ip.name} Control Word`,
              widthBits: firstReg?.width || 32,
              defaultHex: firstReg?.resetValue || '0x00000001',
              presets: [
                { label: 'Reset Default', hex: firstReg?.resetValue || '0x00000000' },
                { label: 'Enable Active', hex: '0x00000015' },
              ],
              highlightByStep: { 0: [regFields[0]?.name || 'ENABLE'] },
              fields: regFields,
            },
          },
          {
            kind: 'hierarchy_floorplan',
            title: `${ip.name} Clock / Reset / Power Domain Partitioning`,
            config: {
              blocks: nodes.slice(0, 4).map((n, idx) => ({
                id: n.id,
                label: n.label,
                x: 24 + (idx % 2) * 320,
                y: 42 + Math.floor(idx / 2) * 94,
                w: 300,
                h: 82,
                clockDomain: ip.architecture.clocks[idx % ip.architecture.clocks.length] || 'clk_i',
                resetDomain: ip.architecture.resets[idx % ip.architecture.resets.length] || 'rst_ni',
                powerDomain: idx === 0 ? 'PD_TOP_IF (Switchable)' : 'PD_CORE (Controlled)',
              })),
            },
          },
        ],
        highlightList: [ip.architecture.clocks[0] || 'clk_i', firstReg?.name || 'Queue'],
        causalityRules: [
          {
            rule: 'CSR / Configuration Barrier',
            cause: 'Control enable written cleanly in IDLE',
            effect: 'Datapath processes active payload cleanly without mid-flight race',
          },
        ],
        events: [
          { step: 0, label: 'Reset state initialized across clock/reset domains', kind: 'control' },
          { step: 1, label: 'Configuration enabled & datapath active', kind: 'active' },
        ],
        playbackSteps: 3,
        ariaDescription: `CSR bitfield decoder and clock/reset domain floorplan for ${ip.name}.`,
      },
    ],
  };
}

export function resolveExplainerAlias(id: string): string {
  if (FLAGSHIP_PROTOCOL_ALIASES[id]) return FLAGSHIP_PROTOCOL_ALIASES[id];
  if (FLAGSHIP_IP_ALIASES[id]) return FLAGSHIP_IP_ALIASES[id];
  return id;
}
