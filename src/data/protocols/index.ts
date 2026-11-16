import { ProtocolDocument } from '../../types/protocol';
import { axi4Protocol } from './axi4';
import { axi4LiteProtocol } from './axi4Lite';
import { axi4StreamProtocol } from './axi4Stream';
import { apbProtocol } from './apb';
import { pcieGen5Protocol } from './pcieGen5';
import { ADDITIONAL_PROTOCOLS } from './additionalProtocols';
import { COMPREHENSIVE_CATALOG_PROTOCOLS } from './comprehensiveCatalog';

const RAW_PROTOCOLS: ProtocolDocument[] = [
  axi4Protocol,
  axi4LiteProtocol,
  axi4StreamProtocol,
  apbProtocol,
  pcieGen5Protocol,
  ...ADDITIONAL_PROTOCOLS,
  ...COMPREHENSIVE_CATALOG_PROTOCOLS,
];

const seenIds = new Set<string>();
export const ALL_PROTOCOLS: ProtocolDocument[] = RAW_PROTOCOLS.filter((p) => {
  if (seenIds.has(p.id)) return false;
  seenIds.add(p.id);
  return true;
});

export const PROTOCOL_MAP: Record<string, ProtocolDocument> = Object.fromEntries(
  ALL_PROTOCOLS.map((p) => [p.id, p])
);

export function getProtocolById(id: string): ProtocolDocument {
  return PROTOCOL_MAP[id] || axi4Protocol;
}
