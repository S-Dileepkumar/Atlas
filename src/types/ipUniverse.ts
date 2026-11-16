export type IpCategory =
  | 'CPU & Processor'
  | 'GPU & Graphics'
  | 'AI & ML Accelerator'
  | 'SoC Interconnect & NoC'
  | 'Memory & Cache'
  | 'Security & Crypto'
  | 'DMA & Data Movement'
  | 'High-Speed & Peripheral'
  | 'Debug & Interrupt';

export type ImplementationKind =
  | 'Synthesizable RTL (ASIC & FPGA)'
  | 'Synthesizable RTL (FPGA-Focused)'
  | 'Research Prototype RTL'
  | 'Generator (Chisel / SpinalHDL / Migen)';

export type ConfidenceLevel = 'Verified from Source/Docs' | 'Partial Extraction' | 'Inferred from Architecture';

export interface ProjectAttribution {
  id: string;
  name: string;
  organization: string;
  repoUrl: string;
  license: string;
  copyright: string;
  commitOrTag: string;
  collectedDate: string;
  description: string;
}

export interface RtlPort {
  name: string;
  direction: 'input' | 'output' | 'inout';
  width: string;
  protocolHint?: string;
  description: string;
}

export interface RtlModuleNode {
  name: string;
  filePath: string;
  parentModule?: string;
  childModules: string[];
  summary: string;
  parameters: { name: string; defaultValue: string; description: string }[];
  localparams?: { name: string; value: string }[];
  enums?: string[];
  fsms?: { name: string; states: string[] }[];
  internalSignals?: string[];
  packages?: string[];
  ports: RtlPort[];
  relatedInterfaces: string[];
  sourceExcerpt: string;
  githubFileUrl: string;
}

export interface IpInterfaceSpec {
  name: string;
  protocolId: string; // Links directly to VLSI Protocol Atlas
  protocolLabel: string;
  role: 'Initiator / Manager' | 'Target / Subordinate' | 'Bidirectional' | 'Sideband / Interrupt' | 'Clock / Reset';
  clockDomain: string;
  resetDomain: string;
  timingDependencies: string;
  signals: { name: string; width: string; direction: string; notes: string }[];
}

export interface IpRegisterField {
  bits: string;
  name: string;
  access: 'RW' | 'RO' | 'WO' | 'W1C' | 'RC';
  reset: string;
  description: string;
}

export interface IpRegister {
  name: string;
  offset: string;
  width: number;
  resetValue: string;
  access: string;
  description: string;
  sourceFormat: 'HJSON / reggen' | 'SystemRDL' | 'CSR Spec' | 'Unavailable';
  fields: IpRegisterField[];
}

export interface IpParameter {
  name: string;
  type: string;
  defaultValue: string;
  options: string[];
  dependencies?: string;
  architecturalImpact: string;
}

export interface IpVerificationInfo {
  maturity: 'Full Signoff UVM + Formal' | 'UVM / Co-Simulation' | 'Self-Checking RTL / Verilator' | 'Basic Directed / Research';
  existingInfra: {
    framework: string;
    testbenchPath: string;
    agentsAndComponents: string[];
    assertionsAndFormal: string[];
    coverageAndTests: string[];
  };
  recommendedStrategy: string[];
  simCommands: { tool: string; command: string; expectedOutput: string }[];
  simLimitations: string;
}

export interface IpArchBlock {
  id: string;
  label: string;
  moduleName?: string;
  role: 'fetch' | 'decode' | 'execute' | 'memory' | 'control' | 'crypto' | 'interface';
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

export interface IpArchLink {
  from: string;
  to: string;
  label: string;
}

export interface IpEntity {
  id: string;
  name: string;
  category: IpCategory;
  projectId: string;
  implementationKind: ImplementationKind;
  rtlLanguage: 'SystemVerilog' | 'Verilog' | 'Chisel (Scala)' | 'SpinalHDL (Scala)' | 'Python (Migen/LiteX)';
  primaryLanguage: string;
  maintainer: string;
  latestRef: string;
  license: string;
  repoUrl: string;
  docsUrl: string;
  supportedPlatforms: string[];
  developmentStatus: 'Production / Silicon Proven' | 'Active Open-Source' | 'Research Prototype';
  tagline: string;
  depth: 'Deep Reverse-Engineered' | 'Structured Profile';
  confidence: ConfidenceLevel;
  functional: {
    whatItDoes: string;
    whyItExists: string;
    socRole: string;
    whereUsed: string[];
    keyOperations: string[];
    limitations: string[];
  };
  architecture: {
    summary: string;
    clocks: string[];
    resets: string[];
    interrupts: string[];
    externalDependencies: string[];
    blocks: IpArchBlock[];
    links: IpArchLink[];
  };
  fileTree: string[];
  modules: RtlModuleNode[];
  interfaces: IpInterfaceSpec[];
  registersNote?: string;
  registers: IpRegister[];
  parameters: IpParameter[];
  verification: IpVerificationInfo;
  implementation: {
    synthesizable: boolean;
    fpgaSupport: string;
    asicConsiderations: string;
    clockingArchitecture: string;
    resetArchitecture: string;
    memoryRequirements: string;
    timingAndAreaNotes: string;
  };
  references: { label: string; url: string; kind: 'Repository' | 'Documentation' | 'RTL Source' | 'Verification' }[];
}

export interface SocConnection {
  id: string;
  fromIpId: string;
  fromLabel: string;
  toIpId: string;
  toLabel: string;
  protocolId: string;
  protocolLabel: string;
  status: 'Documented in RTL/Top' | 'Inferred Relationship';
  notes: string;
}

export interface SocEntity {
  id: string;
  name: string;
  projectId: string;
  repoUrl: string;
  license: string;
  targetUse: string;
  summary: string;
  topFile: string;
  blocks: {
    id: string;
    label: string;
    ipId?: string;
    domain: 'CPU' | 'Interconnect' | 'Memory' | 'Security' | 'DMA / Accel' | 'Peripheral' | 'Debug / Int';
    x: number;
    y: number;
    width: number;
    height: number;
    documented: boolean;
  }[];
  connections: SocConnection[];
}

export interface GlossaryTerm {
  id: string;
  term: string;
  acronym?: string;
  category: 'Protocol' | 'RTL & Architecture' | 'Verification (UVM/SVA)' | 'Coherency & Memory' | 'Security & Debug' | 'GPU & AI Hardware';
  definition: string;
  engineeringContext: string;
  relatedProtocolIds?: string[];
  relatedIpIds?: string[];
}
