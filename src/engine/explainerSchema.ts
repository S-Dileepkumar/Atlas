export type ExplainerDomain =
  | 'Protocols'
  | 'IP Blocks'
  | 'CPUs'
  | 'SoCs'
  | 'GPUs'
  | 'Accelerators'
  | 'Memory'
  | 'Interconnect';

export type DepthLevel = 'overview' | 'detail' | 'expert';

export type RendererKind =
  | 'block_packet'
  | 'sequence_flow'
  | 'waveform'
  | 'fsm'
  | 'bitfield'
  | 'pipeline'
  | 'memory_map'
  | 'hierarchy_floorplan'
  | 'systolic_array'
  | 'cache_coherence'
  | 'noc_mesh'
  | 'queue_credit'
  | 'roofline'
  | 'layered_stack';

export const VISUAL_LEGEND = [
  { key: 'control', label: 'Control / Handshake', colorVar: 'var(--sem-control)', fallbackHex: '#3b82f6' },
  { key: 'data', label: 'Data / Payload', colorVar: 'var(--sem-data)', fallbackHex: '#14b8a6' },
  { key: 'error', label: 'Error / Stall / Flush', colorVar: 'var(--sem-error)', fallbackHex: '#ef4444' },
  { key: 'active', label: 'Active State / Firing Event', colorVar: 'var(--sem-active)', fallbackHex: '#f59e0b' },
] as const;

export interface SceneCausalityRule {
  rule: string;
  cause: string;
  effect: string;
}

export interface SceneEvent {
  step: number;
  label: string;
  kind: 'control' | 'data' | 'error' | 'active';
}

export interface RendererBinding {
  kind: RendererKind;
  title?: string;
  config: Record<string, unknown>;
}

export interface ExplainerScene {
  id: string;
  title: string;
  text: {
    overview: string;
    detail: string;
    expert: string;
  };
  renderers: RendererBinding[];
  highlightList: string[];
  causalityRules: SceneCausalityRule[];
  events: SceneEvent[];
  playbackSteps: number;
  stepLabels?: string[];
  ariaDescription: string;
}

export interface TryItControl {
  id: string;
  label: string;
  type: 'toggle' | 'select';
  defaultValue: string | boolean;
  options?: Array<{ label: string; value: string }>;
  effectSummary: string;
}

export interface ModeDiffEntry {
  modeA: string;
  modeB: string;
  rows: Array<{
    dimension: string;
    valueA: string;
    valueB: string;
    impact: string;
  }>;
}

export interface SelfCheckQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ExplainerSignalRow {
  name: string;
  width: string;
  direction: string;
  kind: 'control' | 'data' | 'error';
  rule: string;
}

export interface ExplainerTopic {
  id: string;
  title: string;
  domain: ExplainerDomain;
  summary: string;
  specVersion: string;
  specDifferenceNote: string;
  unverifiedOrGenericItems: string[];
  sources: Array<{ name: string; version: string; section: string; url?: string }>;
  glossary: Array<{ term: string; definition: string; relatedTopicId?: string }>;
  relatedTopics: Array<{ id: string; label: string; reason: string }>;
  signals: ExplainerSignalRow[];
  programmingModel: string[];
  verificationView: {
    checks: string[];
    assertions: string[];
    coveragePoints: string[];
    scoreboardPlacement: string;
  };
  commonMistakes: string[];
  tryItControls: TryItControl[];
  modeDiff?: ModeDiffEntry;
  selfCheck: SelfCheckQuestion[];
  scenes: ExplainerScene[];
  linkedProtocolId?: string;
  linkedIpId?: string;
}

export function validateTopic(topic: ExplainerTopic): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!topic.id || !/^[a-z0-9-]+$/.test(topic.id)) errors.push('Topic id must be non-empty kebab-case.');
  if (!topic.title?.trim()) errors.push('Topic title is required.');
  if (!topic.summary?.trim()) errors.push('Topic summary is required.');
  if (!topic.specVersion?.trim()) errors.push('Authoritative specVersion must be stated.');
  if (!Array.isArray(topic.sources) || topic.sources.length === 0) {
    errors.push('At least one authoritative source citation is required.');
  }
  if (!Array.isArray(topic.scenes) || topic.scenes.length === 0) {
    errors.push('At least one scene is required.');
  } else {
    topic.scenes.forEach((sc, idx) => {
      if (!sc.id) errors.push(`Scene[${idx}] missing id.`);
      if (!sc.title) errors.push(`Scene[${idx}] missing title.`);
      if (!sc.text?.overview || !sc.text?.detail || !sc.text?.expert) {
        errors.push(`Scene[${idx}] (${sc.id}) must define overview, detail, and expert text.`);
      }
      if (!sc.renderers || sc.renderers.length === 0) {
        errors.push(`Scene[${idx}] (${sc.id}) must attach at least one renderer.`);
      }
      if (typeof sc.playbackSteps !== 'number' || sc.playbackSteps < 1) {
        errors.push(`Scene[${idx}] (${sc.id}) playbackSteps must be >= 1.`);
      }
      if (!sc.ariaDescription?.trim()) {
        errors.push(`Scene[${idx}] (${sc.id}) missing ariaDescription for accessibility.`);
      }
    });
  }
  if (!Array.isArray(topic.selfCheck) || topic.selfCheck.length < 3) {
    errors.push('Topic must include at least 3 selfCheck questions.');
  }
  return { valid: errors.length === 0, errors };
}
