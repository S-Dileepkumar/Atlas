export type SpecClassification =
  | 'Official Standard Requirement'
  | 'Configurable Parameter'
  | 'Implementation Practice'
  | 'Verification Recommendation';

export type SignalDirection =
  | 'Manager -> Subordinate'
  | 'Subordinate -> Manager'
  | 'Bidirectional'
  | 'System / Global'
  | 'Transmitter -> Receiver'
  | 'Receiver -> Transmitter';

export interface SignalDefinition {
  name: string;
  channel: string;
  width: string;
  direction: SignalDirection;
  resetValue: string;
  polarity: 'Active High' | 'Active Low' | 'Edge / Differential' | 'Data / Multi-bit';
  summary: string;
  timingRules: string;
  dependencies: string[];
  legalConditions: string;
  illegalConditions: string;
  rtlExample: string;
  svaAssertion: string;
  uvmDriverNote: string;
  commonBugs: string[];
  relatedInterviewQs: string[];
}

export interface SpecRow {
  parameter: string;
  value: string;
  classification: SpecClassification;
  notes: string;
}

export interface TransactionPhase {
  step: number;
  phase: string;
  title: string;
  description: string;
  activeSignals: string[];
  errorBehavior?: string;
}

export interface WaveformSignalTrace {
  name: string;
  type: 'clock' | 'bit' | 'bus';
  channel?: string;
  values: (number | string)[];
}

export interface WaveformScenario {
  id: string;
  name: string;
  category: 'Nominal' | 'Backpressure' | 'Burst' | 'Error' | 'Reset';
  description: string;
  cycles: number;
  clockName: string;
  signals: WaveformSignalTrace[];
  annotations: { cycle: number; label: string; severity?: 'info' | 'warn' | 'error' }[];
}

export interface DebugScenario {
  id: string;
  title: string;
  symptom: string;
  violatedRule: string;
  rootCause: string;
  fix: string;
  expectedWaveform: WaveformScenario;
  actualWaveform: WaveformScenario;
}

export interface FsmStateNode {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  isInitial?: boolean;
}

export interface FsmTransition {
  from: string;
  to: string;
  condition: string;
}

export interface InterviewQuestion {
  id: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Debugging' | 'Verification';
  question: string;
  answer: string;
  keyTakeaway: string;
}

export interface BlockDiagramNode {
  id: string;
  label: string;
  role: 'manager' | 'interconnect' | 'subordinate' | 'phy' | 'memory';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BlockDiagramLink {
  from: string;
  to: string;
  label: string;
  bidirectional?: boolean;
}

export type EntityClassification =
  | 'Communication Protocol'
  | 'Electrical & PHY Interface'
  | 'Hardware Architecture'
  | 'Microarchitectural Mechanism'
  | 'Design & Verification Standard'
  | 'Manufacturing & Test Standard'
  | 'EDA Format & Methodology'
  | 'Security Algorithm'
  | 'Functional Safety Standard';

export type LifecycleStatus =
  | 'Currently Maintained'
  | 'Superseded / Merged'
  | 'Deprecated / Historical'
  | 'Proprietary'
  | 'Research / Emerging';

export interface ProtocolDocument {
  id: string;
  name: string;
  fullName: string;
  categoryId: CategoryId;
  entityType?: EntityClassification;
  lifecycleStatus?: LifecycleStatus;
  lifecycleNote?: string;
  relationships?: string[];
  standardBody: string;
  specVersion: string;
  revision: string;
  officialSpecificationUrl: string;
  year: string;
  tagline: string;
  depth: 'Full Reference' | 'Engineering Brief';
  popularityRank: number;
  overview: {
    definition: string;
    whyDeveloped: string;
    problemSolved: string;
    usedIn: string[];
    terminology: { term: string; meaning: string }[];
    advantages: string[];
    limitations: string[];
  };
  architecture: {
    summary: string;
    clockAndReset: string;
    dataFlow: string;
    controlFlow: string;
    nodes: BlockDiagramNode[];
    links: BlockDiagramLink[];
  };
  specifications: SpecRow[];
  versionDifferences?: { version: string; keyChanges: string }[];
  channels: string[];
  signals: SignalDefinition[];
  transactionFlow: {
    nominal: TransactionPhase[];
    errorAndOrdering: string[];
  };
  waveforms: WaveformScenario[];
  rtl: {
    architectureNotes: string;
    datapathNotes: string;
    controlpathNotes: string;
    fsmStates: FsmStateNode[];
    fsmTransitions: FsmTransition[];
    codeTitle: string;
    codeLanguage: 'SystemVerilog' | 'Verilog';
    codeSnippet: string;
    commonMistakes: string[];
  };
  verification: {
    uvmArchitecture: string;
    driverStrategy: string;
    monitorStrategy: string;
    scoreboardStrategy: string;
    coveragePoints: string[];
    cornerCases: string[];
    svaSnippet: string;
    uvmSnippet: string;
  };
  debuggingLab: DebugScenario[];
  interviewQuestions: InterviewQuestion[];
  sources: { title: string; authority: string; reference: string }[];
}

export type CategoryId =
  | 'amba'
  | 'interconnect'
  | 'processor'
  | 'coherency'
  | 'memory'
  | 'storage'
  | 'peripheral'
  | 'high-speed'
  | 'usb'
  | 'networking'
  | 'mipi'
  | 'display'
  | 'chip-to-chip'
  | 'automotive'
  | 'debug'
  | 'dft-test'
  | 'security'
  | 'noc'
  | 'accelerator'
  | 'phy-serdes'
  | 'power-mgmt'
  | 'clock-cdc'
  | 'wireless'
  | 'industrial'
  | 'standards'
  | 'verif-eda'
  | 'proc-arch'
  | 'phys-design'
  | 'safety'
  | 'packaging';

export interface ProtocolCategory {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  caveatNote?: string;
  protocolIds: string[];
}

export interface ProtocolComparison {
  id: string;
  title: string;
  protocolA: string;
  protocolB: string;
  summary: string;
  rows: {
    dimension: string;
    valueA: string;
    valueB: string;
    engineeringImpact: string;
  }[];
}
