export type KgNodeType =
  | 'protocol'
  | 'ip_core'
  | 'processor'
  | 'soc'
  | 'rtl_module'
  | 'rtl_signal'
  | 'verification_env'
  | 'uvm_component'
  | 'verification_test'
  | 'standard'
  | 'register'
  | 'eda_tool'
  | 'project'
  | 'memory'
  | 'security';

export type KgEdgeType =
  | 'IMPLEMENTS'
  | 'USES_PROTOCOL'
  | 'INTEGRATED_IN'
  | 'CONTAINS'
  | 'INSTANTIATES'
  | 'IMPLEMENTED_BY'
  | 'CONNECTED_TO'
  | 'COMMUNICATES_VIA'
  | 'VERIFIED_BY'
  | 'TESTED_BY'
  | 'CONTAINS_COMPONENT'
  | 'CHECKED_BY'
  | 'COVERED_BY'
  | 'COMPLIES_WITH'
  | 'DEFINED_BY'
  | 'DERIVED_FROM'
  | 'DEPENDS_ON'
  | 'CONFIGURED_BY'
  | 'ACCESSED_THROUGH'
  | 'USES_REGISTER'
  | 'USES_TOOL'
  | 'STORED_IN'
  | 'RELATED_TO';

export type KgEvidenceLabel =
  | 'OFFICIAL_SPECIFICATION'
  | 'OFFICIAL_DOCUMENTATION'
  | 'OBSERVED_IN_RTL'
  | 'OBSERVED_IN_VERIFICATION'
  | 'DERIVED_FROM_RTL'
  | 'ENGINEERING_INTERPRETATION'
  | 'EDUCATIONAL_EXAMPLE'
  | 'UNVERIFIED';

export type KgEdgeConfidence = 'confirmed' | 'inferred' | 'association';

export type KgExplorationMode =
  | 'Protocol-Centric'
  | 'IP-Centric'
  | 'Processor-Centric'
  | 'SoC-Centric'
  | 'RTL-Centric'
  | 'Verification-Centric'
  | 'Standards-Centric';

export interface KgProvenance {
  repoUrl?: string;
  branch?: string;
  commitHash?: string;
  filePath?: string;
  lineRange?: string;
  standardNumber?: string;
  revision?: string;
  officialUrl?: string;
  sourceExcerpt?: string;
}

export interface KgNode {
  id: string;
  nodeType: KgNodeType;
  title: string;
  subtitle: string;
  category: string;
  summary: string;
  architectureDescription?: string;
  evidence: KgEvidenceLabel;
  provenance: KgProvenance;
  specs: Array<{ label: string; value: string }>;
  parameters?: Array<{ name: string; value: string; impact?: string }>;
  interfaces?: Array<{ name: string; protocolId?: string; directionOrRole?: string }>;
  registers?: Array<{ name: string; offset: string; access: string; description: string }>;
  assertions?: string[];
  coverageGoals?: string[];
  projectId?: string;
  tags: string[];
  appLink?: {
    kind: 'protocol' | 'ip' | 'soc';
    id: string;
  };
  isUserIngested?: boolean;
}

export interface KgEdge {
  id: string;
  source: string;
  target: string;
  relation: KgEdgeType;
  label: string;
  confidence: KgEdgeConfidence;
  evidence: KgEvidenceLabel;
  notes?: string;
  provenance?: KgProvenance;
  isUserIngested?: boolean;
}

export interface KgQueryResult {
  query: string;
  interpretation: string;
  matchedNodeIds: string[];
  highlightEdgeIds: string[];
  centerNodeId: string;
  modeRecommendation?: KgExplorationMode;
  explanationBullets: string[];
}

export interface KgFilterState {
  nodeTypes: Set<KgNodeType>;
  evidenceLevels: Set<KgEvidenceLabel>;
  confidences: Set<KgEdgeConfidence>;
  projectId: string;
  protocolFilter: string;
  standardFilter: string;
}
