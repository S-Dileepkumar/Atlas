import { ExplainerDomain, ExplainerTopic, RendererKind, validateTopic } from '../../engine/explainerSchema';
import { CORE_EXPLAINER_TOPICS } from './topicsCore';
import { SYSTEM_EXPLAINER_TOPICS } from './topicsSystem';
import { ALL_PROTOCOLS } from '../protocols';
import { ALL_IPS } from '../ips';
import {
  buildIpExplainer,
  buildProtocolExplainer,
  resolveExplainerAlias,
} from './universalAdapters';

export const EXPLAINER_DOMAINS: ExplainerDomain[] = [
  'Protocols',
  'IP Blocks',
  'CPUs',
  'SoCs',
  'GPUs',
  'Accelerators',
  'Memory',
  'Interconnect',
];

export const FLAGSHIP_EXPLAINER_TOPICS: ExplainerTopic[] = [
  ...CORE_EXPLAINER_TOPICS,
  ...SYSTEM_EXPLAINER_TOPICS,
];

export const PROTOCOL_EXPLAINER_TOPICS: ExplainerTopic[] = ALL_PROTOCOLS.map(buildProtocolExplainer);
export const IP_EXPLAINER_TOPICS: ExplainerTopic[] = ALL_IPS.map(buildIpExplainer);

export const EXPLAINER_TOPICS: ExplainerTopic[] = FLAGSHIP_EXPLAINER_TOPICS;

export const ALL_EXPLAINER_TOPICS: ExplainerTopic[] = [
  ...FLAGSHIP_EXPLAINER_TOPICS,
  ...PROTOCOL_EXPLAINER_TOPICS,
  ...IP_EXPLAINER_TOPICS,
];

const EXPLAINER_TOPIC_MAP = new Map<string, ExplainerTopic>(
  ALL_EXPLAINER_TOPICS.map((t) => [t.id, t])
);

export interface TopicValidationReport {
  id: string;
  title: string;
  valid: boolean;
  errors: string[];
  renderersUsed: RendererKind[];
}

export const TOPIC_VALIDATION_REPORTS: TopicValidationReport[] = FLAGSHIP_EXPLAINER_TOPICS.map((topic) => {
  const res = validateTopic(topic);
  const renderersUsed = Array.from(
    new Set(topic.scenes.flatMap((sc) => sc.renderers.map((r) => r.kind)))
  );
  return {
    id: topic.id,
    title: topic.title,
    valid: res.valid,
    errors: res.errors,
    renderersUsed,
  };
});

export const ALL_TOPIC_VALIDATION_SUMMARY = (() => {
  const protoValid = PROTOCOL_EXPLAINER_TOPICS.filter((t) => validateTopic(t).valid).length;
  const ipValid = IP_EXPLAINER_TOPICS.filter((t) => validateTopic(t).valid).length;
  const flagshipValid = TOPIC_VALIDATION_REPORTS.filter((r) => r.valid).length;
  return {
    flagshipTotal: FLAGSHIP_EXPLAINER_TOPICS.length,
    flagshipValid,
    protocolTotal: PROTOCOL_EXPLAINER_TOPICS.length,
    protocolValid: protoValid,
    ipTotal: IP_EXPLAINER_TOPICS.length,
    ipValid,
    total: ALL_EXPLAINER_TOPICS.length,
    totalValid: flagshipValid + protoValid + ipValid,
  };
})();

export function getExplainerTopicById(rawId: string): ExplainerTopic {
  const aliased = resolveExplainerAlias(rawId);
  return (
    EXPLAINER_TOPIC_MAP.get(aliased) ??
    EXPLAINER_TOPIC_MAP.get(rawId) ??
    EXPLAINER_TOPIC_MAP.get(`proto-${rawId}`) ??
    EXPLAINER_TOPIC_MAP.get(`ip-${rawId}`) ??
    FLAGSHIP_EXPLAINER_TOPICS[0]
  );
}
