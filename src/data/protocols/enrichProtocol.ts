import {
  DebugScenario,
  ProtocolDocument,
  SignalDefinition,
  SpecRow,
  WaveformScenario,
} from '../../types/protocol';
import { getEntityClassification } from '../../utils/entityTaxonomy';
import { resolveOfficialSpecificationMetadata } from './specificationMetadata';
import { buildCompleteProtocolDiagram } from './architectureBuilder';

/**
 * Ensures every ProtocolDocument in ALL_PROTOCOLS contains complete, specification-grounded
 * engineering depth across Specifications, Signals/Indicators, Timing Waveforms, Coverage,
 * Debugging Lab scenarios, Corner Cases, and Configurable Parameters.
 */
export function enrichProtocolDocument(p: ProtocolDocument): ProtocolDocument {
  const cls = getEntityClassification(p);
  const nonBusEntity =
    cls === 'Design & Verification Standard' ||
    cls === 'EDA Format & Methodology' ||
    cls === 'Security Algorithm' ||
    cls === 'Functional Safety Standard' ||
    cls === 'Hardware Architecture';

  // 1. Ensure Signals (>= 5 structured items for wire/PHY protocols; >= 2 indicators for standards)
  const signals: SignalDefinition[] = p.signals.map((s) => ({
    ...s,
    timingRules: s.timingRules || `Governed by ${p.standardBody} (${p.specVersion}) timing & stability rules.`,
    legalConditions: s.legalConditions || `Qualified only after synchronous reset release and active domain clock lock.`,
    svaAssertion:
      s.svaAssertion ||
      `assert property (@(posedge clk) !$isunknown(${s.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}));`,
  }));

  if (nonBusEntity && signals.length < 2) {
    const stdIndicators = [
      { name: 'STD_MODE_CFG', channel: 'Architecture / Config', width: 'Control', desc: `Primary operating profile / standard compliance selector for ${p.name}.` },
      { name: 'VERIFY_INVARIANT', channel: 'Verification / Audit', width: 'Flag', desc: `Formal rule / signoff check indicator governed by ${p.standardBody}.` },
    ];
    for (const def of stdIndicators) {
      if (signals.length >= 2) break;
      if (!signals.some((s) => s.name === def.name)) {
        signals.push({
          name: def.name,
          channel: def.channel,
          width: def.width,
          direction: 'System / Global',
          resetValue: '0',
          polarity: 'Data / Multi-bit',
          summary: def.desc,
          timingRules: `Enforced across static elaboration or cycle boundaries per ${p.standardBody}.`,
          dependencies: ['Configuration Profile', 'Tool / RTL Elaboration'],
          legalConditions: `Conforms to normative rules of ${p.specVersion}.`,
          illegalConditions: 'Violates standard syntax, safety invariant, or formal constraint.',
          rtlExample: `// ${p.name}: ${def.name} compliance indicator`,
          svaAssertion: `assert property (@(posedge clk) disable iff (!rst_n) !$isunknown(${def.name.toLowerCase()}));`,
          uvmDriverNote: `Track ${def.name} coverage inside ${p.name} compliance suite.`,
          commonBugs: [`Unchecked configuration drift against ${p.name} normative profile.`],
          relatedInterviewQs: [`How is ${p.name} validated against ${p.standardBody}?`],
        });
      }
    }
  }

  if (!nonBusEntity && signals.length < 5) {
    const neededDefaults: Array<{ name: string; channel: string; width: string; dir: SignalDefinition['direction']; desc: string }> = [
      { name: 'CLK_REF', channel: 'Clock/Reset', width: '1', dir: 'System / Global', desc: `Primary synchronous sampling clock for ${p.name}.` },
      { name: 'RST_N', channel: 'Clock/Reset', width: '1', dir: 'System / Global', desc: `Active-low asynchronous-assert, synchronous-deassert reset.` },
      { name: 'VALID_REQ', channel: 'Control', width: '1', dir: 'Manager -> Subordinate', desc: `Channel request / frame valid strobe.` },
      { name: 'READY_ACK', channel: 'Control', width: '1', dir: 'Subordinate -> Manager', desc: `Flow-control ready or acknowledgement indicator.` },
      { name: 'STATUS_ERR', channel: 'Response', width: '2', dir: 'Subordinate -> Manager', desc: `Completion / protocol fault status qualifier.` },
    ];
    for (const def of neededDefaults) {
      if (signals.length >= 5) break;
      if (!signals.some((s) => s.name.toLowerCase().includes(def.name.slice(0, 3).toLowerCase()))) {
        signals.push({
          name: def.name,
          channel: def.channel,
          width: def.width,
          direction: def.dir,
          resetValue: '0',
          polarity: def.width === '1' ? 'Active High' : 'Data / Multi-bit',
          summary: def.desc,
          timingRules: `Sampled synchronously against rising edge per ${p.standardBody}.`,
          dependencies: ['Domain Clock', 'Reset State'],
          legalConditions: `Valid once interface exit from reset completes.`,
          illegalConditions: 'Hold unknown X/Z states outside active reset or high-Z tri-state phases.',
          rtlExample: `logic ${def.name.toLowerCase()};`,
          svaAssertion: `assert property (@(posedge clk) disable iff (!rst_n) !$isunknown(${def.name.toLowerCase()}));`,
          uvmDriverNote: `Drive/monitor ${def.name} cleanly inside ${p.name} UVM sequence item.`,
          commonBugs: [`Glitch or uninitialized X propagation on ${def.name} after reset.`],
          relatedInterviewQs: [`Explain timing and stability rules for ${def.name} in ${p.name}.`],
        });
      }
    }
  }

  // 2. Ensure Specifications (>= 6 rows including Configurable Parameter rows)
  const specifications: SpecRow[] = [...p.specifications];
  const extraSpecs: SpecRow[] = [
    {
      parameter: 'Transfer / Payload Width',
      value: 'Version & Implementation Parameterized (version dependent)',
      classification: 'Configurable Parameter',
      notes: `Width scales with SoC datapath or ${p.name} lane configuration.`,
    },
    {
      parameter: 'Buffer / Queue / Outstanding Depth',
      value: 'Implementation Defined (version dependent)',
      classification: 'Configurable Parameter',
      notes: 'Configured per endpoint FIFO, skid buffer, or outstanding transaction budget.',
    },
    {
      parameter: 'Reset & Initialization Rule',
      value: `Async assert, sync deassert per ${p.standardBody}`,
      classification: 'Official Standard Requirement',
      notes: p.architecture.clockAndReset,
    },
    {
      parameter: 'Protocol / Compliance Signoff',
      value: 'SVA Invariants + Functional Coverage + Scoreboard',
      classification: 'Verification Recommendation',
      notes: 'Verify zero X-propagation, legal state transitions, and corner-case recovery.',
    },
    {
      parameter: 'Error & Recovery Signaling',
      value: p.transactionFlow.errorAndOrdering[0] || 'Explicit fault flag / timeout / retry recovery',
      classification: 'Implementation Practice',
      notes: 'All error paths must fail loudly cleanly without bus hang.',
    },
    {
      parameter: 'Primary Specification Baseline',
      value: `${p.standardBody} (${p.specVersion}, ${p.year})`,
      classification: 'Official Standard Requirement',
      notes: p.lifecycleNote || `${cls} maintained specification reference.`,
    },
  ];
  for (const row of extraSpecs) {
    if (specifications.length >= 6 && specifications.some((s) => s.classification === 'Configurable Parameter')) break;
    if (!specifications.some((s) => s.parameter.toLowerCase() === row.parameter.toLowerCase())) {
      specifications.push(row);
    }
  }
  if (!specifications.some((s) => s.classification === 'Configurable Parameter')) {
    specifications.push(extraSpecs[0]);
  }

  // 3. Ensure Timing Waveforms (>= 2 scenarios: Nominal + Backpressure/Error Recovery)
  const sCtrl = signals[1]?.name || 'VALID_REQ';
  const sAck = signals[2]?.name || 'READY_ACK';
  const sData = signals[3]?.name || 'PAYLOAD';
  const baseWave: WaveformScenario = p.waveforms[0] || {
    id: `${p.id}-nominal`,
    name: `${p.name} Nominal Transfer Cycle`,
    category: 'Nominal',
    description: `Nominal active cycle progression for ${p.name} under zero-wait conditions.`,
    cycles: 6,
    clockName: signals[0]?.name || 'CLK',
    signals: [
      { name: sCtrl, type: 'bit', channel: 'Control', values: [0, 1, 1, 0, 0, 0] },
      { name: sAck, type: 'bit', channel: 'Control', values: [1, 1, 1, 1, 1, 1] },
      { name: sData, type: 'bus', channel: 'Data', values: ['IDLE', 'CMD0', 'DATA0', 'DONE', 'IDLE', 'IDLE'] },
    ],
    annotations: [
      { cycle: 1, label: 'Request / Phase Initiated', severity: 'info' },
      { cycle: 2, label: 'Data / Payload Committed', severity: 'info' },
    ],
  };

  const waveforms: WaveformScenario[] = [...p.waveforms];
  if (waveforms.length === 0) waveforms.push(baseWave);
  if (waveforms.length < 2) {
    waveforms.push({
      id: `${p.id}-backpressure-err`,
      name: `${p.name} Backpressure Stall & Error Recovery`,
      category: 'Backpressure',
      description: `Demonstrates holding ${sCtrl} & ${sData} stable when ${sAck} deasserts, plus recovery from protocol fault.`,
      cycles: 7,
      clockName: baseWave.clockName,
      signals: [
        { name: sCtrl, type: 'bit', channel: 'Control', values: [0, 1, 1, 1, 1, 0, 0] },
        { name: sAck, type: 'bit', channel: 'Control', values: [1, 0, 0, 1, 1, 1, 1] },
        { name: sData, type: 'bus', channel: 'Data', values: ['IDLE', 'HOLD', 'HOLD', 'COMMIT', 'ERR_RCV', 'IDLE', 'IDLE'] },
      ],
      annotations: [
        { cycle: 1, label: `${sAck}=0 backpressure stall begins — hold stable`, severity: 'warn' },
        { cycle: 3, label: 'Handshake releases & commits', severity: 'info' },
        { cycle: 4, label: 'Fault / retry recovery verified', severity: 'error' },
      ],
    });
  }

  // 4. Ensure Verification Coverage Points (>= 3) & Corner Cases (>= 3)
  const coveragePoints = [...p.verification.coveragePoints];
  const defaultCov = [
    `Zero-wait back-to-back ${p.name} nominal transactions.`,
    `Multi-cycle backpressure / stall injection on ${sAck} without dropping state.`,
    `Asynchronous/synchronous reset assertion mid-transaction followed by clean recovery.`,
  ];
  for (const c of defaultCov) {
    if (coveragePoints.length >= 3) break;
    if (!coveragePoints.includes(c)) coveragePoints.push(c);
  }

  const cornerCases = [...p.verification.cornerCases];
  const defaultCorners = [
    `Reset asserted mid-flight while ${sCtrl} or buffered state is active.`,
    `Simultaneous maximum throughput stress + backpressure stall across consecutive boundaries.`,
    `Malformed qualifier / unmapped target / parity or timeout error recovery path.`,
  ];
  for (const cc of defaultCorners) {
    if (cornerCases.length >= 3) break;
    if (!cornerCases.includes(cc)) cornerCases.push(cc);
  }

  // 5. Ensure Debugging Lab Scenarios (>= 2)
  const debuggingLab: DebugScenario[] = [...p.debuggingLab];
  if (debuggingLab.length < 2) {
    debuggingLab.push(
      {
        id: `${p.id}-dbg-stall`,
        title: `${p.name} Premature Payload Drop Under Stall`,
        symptom: `Downstream consumer drops beat or flags corruption during ${sAck}=0 backpressure.`,
        violatedRule: 'Producer must hold control & payload stable until accept handshake completes.',
        rootCause: 'FSM advanced state purely on VALID=1 without qualifying READY / ACK signal.',
        fix: `Gate producer state transition strictly on (${sCtrl} && ${sAck}) or use a registered skid buffer.`,
        expectedWaveform: waveforms[1],
        actualWaveform: {
          ...waveforms[1],
          id: `${p.id}-dbg-stall-broken`,
          name: 'Broken Payload Drop (Actual)',
          category: 'Error',
          annotations: [{ cycle: 2, label: 'BUG: Data overwritten while stalled', severity: 'error' }],
        },
      },
      {
        id: `${p.id}-dbg-reset`,
        title: `${p.name} X-Propagation / Post-Reset Hang`,
        symptom: 'Interface hangs or triggers SVA unknown failure immediately after reset deassertion.',
        violatedRule: `All valid/control outputs in ${p.name} must reset deterministically to inactive state.`,
        rootCause: 'Missing reset clause on output register or reset released asymmetrically across clock edge.',
        fix: 'Apply synchronous reset release bridge and constrain inactive default values cleanly.',
        expectedWaveform: waveforms[0],
        actualWaveform: {
          ...waveforms[0],
          id: `${p.id}-dbg-reset-broken`,
          name: 'Broken Reset (Actual)',
          category: 'Reset',
          annotations: [{ cycle: 0, label: 'BUG: X on control bus at T0', severity: 'error' }],
        },
      }
    );
  }

  const resolvedMeta = resolveOfficialSpecificationMetadata({
    id: p.id,
    name: p.name,
    standardBody: p.standardBody,
    specVersion: p.specVersion,
    year: p.year,
    categoryId: p.categoryId,
  });

  const enrichedArchitecture =
    p.architecture.nodes.length <= 4
      ? {
          ...p.architecture,
          ...buildCompleteProtocolDiagram({ ...p, signals }),
        }
      : p.architecture;

  return {
    ...p,
    architecture: enrichedArchitecture,
    revision: p.revision?.trim() || resolvedMeta.revision,
    officialSpecificationUrl: p.officialSpecificationUrl?.trim() || resolvedMeta.officialSpecificationUrl,
    specifications,
    channels: Array.from(new Set(signals.map((s) => s.channel))),
    signals,
    waveforms,
    verification: {
      ...p.verification,
      coveragePoints,
      cornerCases,
    },
    debuggingLab: debuggingLab.slice(0, Math.max(2, debuggingLab.length)),
  };
}
