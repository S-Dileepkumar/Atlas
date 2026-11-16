import {
  CategoryId,
  EntityClassification,
  InterviewQuestion,
  LifecycleStatus,
  ProtocolDocument,
  SignalDefinition,
  SpecRow,
} from '../../types/protocol';

export interface ExpandedSignalTuple {
  name: string;
  channel: string;
  width: string;
  dir: SignalDefinition['direction'];
  rst: string;
  summary: string;
  timing?: string;
}

export interface ExpandedEntryTuple {
  id: string;
  name: string;
  fullName: string;
  categoryId: CategoryId;
  entityType: EntityClassification;
  lifecycleStatus: LifecycleStatus;
  lifecycleNote?: string;
  relationships?: string[];
  std: string;
  year: string;
  tagline: string;
  definition: string;
  whyDeveloped: string;
  problemSolved: string;
  usedIn: string[];
  advantages: string[];
  limitations: string[];
  archSummary: string;
  clockAndReset: string;
  dataFlow: string;
  controlFlow: string;
  specs: Array<{ param: string; val: string; cls?: SpecRow['classification']; notes: string }>;
  signals: ExpandedSignalTuple[];
  rtlArchNotes: string;
  codeTitle: string;
  codeSnippet: string;
  commonMistakes: string[];
  verifArch: string;
  coveragePoints: string[];
  cornerCases: string[];
  svaSnippet: string;
  interviewQs: Array<{ level: InterviewQuestion['level']; q: string; a: string; takeaway: string }>;
  sourceRef: string;
}

export function buildExpandedDoc(e: ExpandedEntryTuple, idx: number): ProtocolDocument {
  const signals: SignalDefinition[] = e.signals.map((s) => ({
    name: s.name,
    channel: s.channel,
    width: s.width,
    direction: s.dir,
    resetValue: s.rst,
    polarity: s.width === '1' ? 'Active High' : 'Data / Multi-bit',
    summary: s.summary,
    timingRules: s.timing || `Governed by ${e.std} (${e.year}) specification rules.`,
    dependencies: ['System / Domain Clock', 'Reset State'],
    legalConditions: `Qualified under ${e.name} active protocol/mechanism invariants.`,
    illegalConditions: 'Uninitialized propagation, violated handshakes, or timing/CDC hazards.',
    rtlExample: `// ${e.name}: ${s.name}\nlogic [${s.width === '1' ? '0' : '31'}:0] ${s.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()};`,
    svaAssertion: `assert property (@(posedge clk) !$isunknown(${s.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}));`,
    uvmDriverNote: `Drive/sample ${s.name} cleanly inside ${e.name} verification monitor/driver.`,
    commonBugs: [`Improper reset or timing/ownership violation on ${s.name}.`],
    relatedInterviewQs: [e.interviewQs[0]?.q || `Explain the role of ${s.name} in ${e.name}.`],
  }));

  const sig0 = signals[0]?.name || 'CLK';
  const sig1 = signals[1]?.name || 'REQ';
  const sig2 = signals[2]?.name || 'ACK';
  const sig3 = signals[3]?.name || 'DATA';

  return {
    id: e.id,
    name: e.name,
    fullName: e.fullName,
    categoryId: e.categoryId,
    entityType: e.entityType,
    lifecycleStatus: e.lifecycleStatus,
    lifecycleNote: e.lifecycleNote,
    relationships: e.relationships,
    standardBody: e.std,
    specVersion: e.std,
    year: e.year,
    tagline: e.tagline,
    depth: 'Full Reference',
    popularityRank: 20 + idx,
    overview: {
      definition: e.definition,
      whyDeveloped: e.whyDeveloped,
      problemSolved: e.problemSolved,
      usedIn: e.usedIn,
      terminology: [
        { term: 'Classification', meaning: `${e.entityType} (${e.lifecycleStatus})` },
        ...(e.lifecycleNote ? [{ term: 'Lifecycle & History', meaning: e.lifecycleNote }] : []),
        ...(e.relationships && e.relationships.length > 0
          ? [{ term: 'Ecosystem Links', meaning: e.relationships.join(' · ') }]
          : []),
      ],
      advantages: e.advantages,
      limitations: e.limitations,
    },
    architecture: {
      summary: e.archSummary,
      clockAndReset: e.clockAndReset,
      dataFlow: e.dataFlow,
      controlFlow: e.controlFlow,
      nodes: [
        { id: 'src', label: `${e.name} Source / Initiator`, role: 'manager', x: 40, y: 75, width: 195, height: 110 },
        { id: 'core', label: `${e.entityType}`, role: 'interconnect', x: 270, y: 75, width: 165, height: 110 },
        { id: 'dst', label: `${e.name} Target / Sink`, role: 'subordinate', x: 470, y: 75, width: 195, height: 110 },
      ],
      links: [
        { from: 'src', to: 'core', label: sig1 },
        { from: 'core', to: 'dst', label: sig3 },
        { from: 'dst', to: 'src', label: sig2 },
      ],
    },
    specifications: [
      {
        parameter: 'Entity Classification',
        value: e.entityType,
        classification: 'Official Standard Requirement',
        notes: 'Distinguishes physical wire protocols from architectures, mechanisms, and standards.',
      },
      {
        parameter: 'Lifecycle & Maintenance Status',
        value: e.lifecycleStatus,
        classification: 'Official Standard Requirement',
        notes: e.lifecycleNote || `Active governing standard: ${e.std} (${e.year}).`,
      },
      ...e.specs.map((sp) => ({
        parameter: sp.param,
        value: sp.val,
        classification: sp.cls || 'Official Standard Requirement',
        notes: sp.notes,
      })),
    ],
    channels: Array.from(new Set(signals.map((s) => s.channel))),
    signals,
    transactionFlow: {
      nominal: [
        {
          step: 1,
          phase: 'Initiation / Setup',
          title: `${e.name} Entry & Qualification`,
          description: `Establishes initial state, synchronization, or framing via ${sig1}.`,
          activeSignals: [sig0, sig1],
        },
        {
          step: 2,
          phase: 'Execution / Processing',
          title: 'Active Operation & Transfer',
          description: e.dataFlow,
          activeSignals: [sig1, sig2, sig3],
        },
        {
          step: 3,
          phase: 'Completion / Verification',
          title: 'Acknowledge & Integrity Check',
          description: e.controlFlow,
          activeSignals: [sig2, sig3],
        },
      ],
      errorAndOrdering: [
        ...e.commonMistakes,
        ...(e.lifecycleNote ? [`Historical/Scope Reminder: ${e.lifecycleNote}`] : []),
      ],
    },
    waveforms: [
      {
        id: `${e.id}-nominal`,
        name: `${e.name} Nominal Cycle View`,
        category: 'Nominal',
        description: `Representative cycle-level sequence illustrating ${e.name} operation.`,
        cycles: 6,
        clockName: sig0,
        signals: [
          { name: sig0, type: 'clock', values: [0, 1, 0, 1, 0, 1] },
          { name: sig1, type: 'bit', values: [0, 1, 1, 1, 0, 0] },
          { name: sig2, type: 'bit', values: [0, 0, 1, 1, 1, 0] },
          { name: sig3, type: 'bus', values: ['IDLE', 'INIT', 'EXEC', 'EXEC', 'DONE', 'IDLE'] },
        ],
        annotations: [
          { cycle: 1, label: `${e.name} setup`, severity: 'info' },
          { cycle: 2, label: 'Active phase / check', severity: 'info' },
          { cycle: 4, label: 'Clean completion', severity: 'info' },
        ],
      },
    ],
    rtl: {
      architectureNotes: e.rtlArchNotes,
      datapathNotes: e.dataFlow,
      controlpathNotes: e.controlFlow,
      fsmStates: [
        { id: 'IDLE', label: 'IDLE', description: 'Reset / quiescent baseline state', x: 55, y: 80, isInitial: true },
        { id: 'ACTIVE', label: 'ACTIVE', description: `${e.name} operational phase`, x: 255, y: 80 },
        { id: 'CHECK', label: 'CHECK', description: 'Verify status / complete / recover', x: 455, y: 80 },
      ],
      fsmTransitions: [
        { from: 'IDLE', to: 'ACTIVE', condition: 'enable && !err' },
        { from: 'ACTIVE', to: 'CHECK', condition: 'op_done' },
        { from: 'CHECK', to: 'IDLE', condition: 'ack_ok' },
      ],
      codeTitle: e.codeTitle,
      codeLanguage: 'SystemVerilog',
      codeSnippet: e.codeSnippet,
      commonMistakes: e.commonMistakes,
    },
    verification: {
      uvmArchitecture: e.verifArch,
      driverStrategy: `Generate nominal, stress, and fault/corner stimuli aligned to ${e.std}.`,
      monitorStrategy: `Sample clock/domain-qualified transitions and verify ${e.name} invariants passively.`,
      scoreboardStrategy: `Cross-check ${e.name} functional outcomes against golden reference specification model.`,
      coveragePoints: e.coveragePoints,
      cornerCases: e.cornerCases,
      svaSnippet: e.svaSnippet,
      uvmSnippet: `class ${e.id.replace(/[^a-zA-Z0-9_]/g, '_')}_env extends uvm_env;\n  \`uvm_component_utils(${e.id.replace(/[^a-zA-Z0-9_]/g, '_')}_env)\nendclass`,
    },
    debuggingLab: [],
    interviewQuestions: e.interviewQs.map((q, qIdx) => ({
      id: `${e.id}-iq${qIdx + 1}`,
      level: q.level,
      question: q.q,
      answer: q.a,
      keyTakeaway: q.takeaway,
    })),
    sources: [{ title: `${e.std} — ${e.fullName}`, authority: e.std, reference: e.sourceRef }],
  };
}
