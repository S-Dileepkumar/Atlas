import { IpEntity } from '../types/ipUniverse';
import { ProtocolDocument } from '../types/protocol';

export type CompletenessStatus =
  | 'Documented'
  | 'Partially documented'
  | 'Not yet documented'
  | 'Not applicable'
  | 'Requires source verification';

export interface CompletenessTopicItem {
  topic: string;
  status: CompletenessStatus;
  detail: string;
}

export interface CompletenessReport {
  items: CompletenessTopicItem[];
  documentedCount: number;
  applicableCount: number;
  percentComplete: number;
  note: string;
}

export function auditProtocolCompleteness(p: ProtocolDocument): CompletenessReport {
  const items: CompletenessTopicItem[] = [
    {
      topic: 'Fundamentals',
      status: p.overview.definition && p.overview.whyDeveloped ? 'Documented' : 'Partially documented',
      detail: 'Definition, motivation, terminology, and first-principles student analogy.',
    },
    {
      topic: 'Architecture',
      status: p.architecture.nodes.length >= 2 && p.architecture.links.length >= 1 ? 'Documented' : 'Partially documented',
      detail: `${p.architecture.nodes.length} blocks and ${p.architecture.links.length} bus/data paths.`,
    },
    {
      topic: 'Specifications',
      status: p.specifications.length >= 6 ? 'Documented' : p.specifications.length > 0 ? 'Partially documented' : 'Not yet documented',
      detail: `${p.specifications.length} specification rows distinguishing normative vs configurable limits.`,
    },
    {
      topic: 'Signals',
      status:
        p.signals.length >= 5 && p.signals.every((s) => s.timingRules && s.legalConditions)
          ? 'Documented'
          : p.signals.length > 0
          ? 'Partially documented'
          : 'Not yet documented',
      detail: `${p.signals.length} signals documented across ${p.channels.length} channels.`,
    },
    {
      topic: 'Transactions',
      status: p.transactionFlow.nominal.length >= 3 ? 'Documented' : 'Partially documented',
      detail: `${p.transactionFlow.nominal.length} nominal phases + ordering/error handling rules.`,
    },
    {
      topic: 'Timing',
      status: p.waveforms.length >= 2 ? 'Documented' : p.waveforms.length === 1 ? 'Partially documented' : 'Not yet documented',
      detail: `${p.waveforms.length} cycle-by-cycle interactive waveform scenario(s).`,
    },
    {
      topic: 'RTL hierarchy',
      status: 'Not applicable',
      detail: 'Bus protocol specification; RTL module trees live inside concrete Open-Source IP pages implementing this bus.',
    },
    {
      topic: 'Internal modules',
      status: p.rtl.codeSnippet ? 'Partially documented' : 'Not applicable',
      detail: 'Includes reference RTL behavioral snippet; full submodule synthesis lives in IP Explorer.',
    },
    {
      topic: 'Registers',
      status: 'Not applicable',
      detail: 'Wire-level bus/link protocol (CSR maps depend on the attached peripheral or host controller IP).',
    },
    {
      topic: 'Parameters',
      status: p.specifications.some((s) => s.classification === 'Configurable Parameter')
        ? 'Documented'
        : 'Partially documented',
      detail: 'Width, ID, burst, and frequency parameterization tracked in Specification table.',
    },
    {
      topic: 'Verification',
      status: p.verification.uvmArchitecture && p.verification.uvmSnippet ? 'Documented' : 'Partially documented',
      detail: 'UVM driver, monitor, scoreboard architecture and verification plan.',
    },
    {
      topic: 'Assertions',
      status: p.verification.svaSnippet || p.signals.some((s) => s.svaAssertion) ? 'Documented' : 'Not yet documented',
      detail: 'SystemVerilog Assertions (SVA) on signal handshakes and protocol invariants.',
    },
    {
      topic: 'Coverage',
      status: p.verification.coveragePoints.length >= 3 ? 'Documented' : 'Partially documented',
      detail: `${p.verification.coveragePoints.length} functional coverage points specified.`,
    },
    {
      topic: 'Debugging',
      status: p.debuggingLab.length >= 2 ? 'Documented' : p.debuggingLab.length === 1 ? 'Partially documented' : 'Not yet documented',
      detail: `${p.debuggingLab.length} interactive broken-vs-expected waveform debugging scenario(s).`,
    },
    {
      topic: 'Corner cases',
      status: p.verification.cornerCases.length >= 3 ? 'Documented' : p.verification.cornerCases.length > 0 ? 'Partially documented' : 'Not yet documented',
      detail: `${p.verification.cornerCases.length} corner-case & deadlock failure analyses.`,
    },
    {
      topic: 'References',
      status: p.sources.length > 0 ? 'Documented' : 'Requires source verification',
      detail: `${p.sources.length} primary specification source citation(s).`,
    },
  ];

  const applicable = items.filter((i) => i.status !== 'Not applicable');
  const documented = applicable.filter((i) => i.status === 'Documented').length;
  return {
    items,
    documentedCount: documented,
    applicableCount: applicable.length,
    percentComplete: Math.round((documented / Math.max(1, applicable.length)) * 100),
    note: `Strict audit across ${applicable.length} protocol-applicable checklists (${items.length - applicable.length} RTL/CSR items marked Not applicable).`,
  };
}

export function auditIpCompleteness(ip: IpEntity): CompletenessReport {
  const verified = ip.confidence === 'Verified from Source/Docs';
  const hasPorts = ip.modules.some((m) => m.ports.length >= 3);
  const hasFsm = ip.modules.some((m) => m.fsms && m.fsms.length > 0);
  const needsVerify = !verified;

  const items: CompletenessTopicItem[] = [
    {
      topic: 'Fundamentals',
      status: ip.functional.whatItDoes && ip.functional.whyItExists ? 'Documented' : 'Partially documented',
      detail: 'First-principles intuition, SoC role, and functional operations.',
    },
    {
      topic: 'Architecture',
      status: ip.architecture.blocks.length >= 3 ? 'Documented' : 'Partially documented',
      detail: `${ip.architecture.blocks.length} internal blocks and ${ip.architecture.links.length} internal interconnects.`,
    },
    {
      topic: 'Specifications',
      status: ip.interfaces.length >= 1 && ip.architecture.clocks.length >= 1 ? 'Documented' : 'Partially documented',
      detail: `${ip.interfaces.length} bus interface(s) across ${ip.architecture.clocks.length} clock domain(s).`,
    },
    {
      topic: 'Signals',
      status: hasPorts ? (needsVerify ? 'Requires source verification' : 'Documented') : 'Partially documented',
      detail: `External interface mappings + ${ip.modules.reduce((acc, m) => acc + m.ports.length, 0)} RTL port declarations.`,
    },
    {
      topic: 'Transactions',
      status: ip.interfaces.length > 0 ? 'Partially documented' : 'Not yet documented',
      detail: 'Bus interface handshakes mapped; detailed cycle transactions live in linked Protocol Spec pages.',
    },
    {
      topic: 'Timing',
      status:
        ip.implementation.timingAndAreaNotes && ip.implementation.clockingArchitecture
          ? needsVerify
            ? 'Requires source verification'
            : 'Documented'
          : 'Partially documented',
      detail: 'Clocking, CDC islands, reset polarity, and FPGA/ASIC timing characteristics.',
    },
    {
      topic: 'RTL hierarchy',
      status:
        ip.fileTree.length >= 4 && ip.modules.length >= 2
          ? needsVerify
            ? 'Requires source verification'
            : 'Documented'
          : 'Partially documented',
      detail: `${ip.fileTree.length} mapped source files and ${ip.modules.length} inspected RTL module nodes.`,
    },
    {
      topic: 'Internal modules',
      status:
        ip.modules.length >= 2 && hasFsm
          ? needsVerify
            ? 'Requires source verification'
            : 'Documented'
          : ip.modules.length >= 1
          ? 'Partially documented'
          : 'Not yet documented',
      detail: `${ip.modules.length} detailed modules${hasFsm ? ' including extracted control FSMs' : ' (FSM extraction pending deeper pass)'}.`,
    },
    {
      topic: 'Registers',
      status:
        ip.registers.length > 0
          ? needsVerify
            ? 'Requires source verification'
            : 'Documented'
          : ip.registersNote
          ? 'Not applicable'
          : 'Not yet documented',
      detail:
        ip.registers.length > 0
          ? `${ip.registers.length} CSR registers with bit-fields documented.`
          : ip.registersNote || 'No MMIO CSR definitions parsed for this block.',
    },
    {
      topic: 'Parameters',
      status: ip.parameters.length >= 2 ? 'Documented' : ip.parameters.length === 1 ? 'Partially documented' : 'Not yet documented',
      detail: `${ip.parameters.length} compile-time elaboration parameters mapped.`,
    },
    {
      topic: 'Verification',
      status: ip.verification.existingInfra.agentsAndComponents.length >= 2 ? 'Documented' : 'Partially documented',
      detail: `${ip.verification.maturity} (${ip.verification.existingInfra.framework}).`,
    },
    {
      topic: 'Assertions',
      status: ip.verification.existingInfra.assertionsAndFormal.length >= 1 ? 'Documented' : 'Not yet documented',
      detail: `${ip.verification.existingInfra.assertionsAndFormal.length} upstream SVA/FPV checks listed.`,
    },
    {
      topic: 'Coverage',
      status: ip.verification.existingInfra.coverageAndTests.length >= 2 ? 'Documented' : 'Partially documented',
      detail: `${ip.verification.existingInfra.coverageAndTests.length} regression/coverage targets cataloged.`,
    },
    {
      topic: 'Debugging',
      status: ip.verification.simCommands.length >= 1 && ip.verification.simLimitations ? 'Partially documented' : 'Not yet documented',
      detail: 'Simulation run steps and constraints documented; interactive waveform traces live in linked Bus Protocol pages.',
    },
    {
      topic: 'Corner cases',
      status: ip.functional.limitations.length >= 1 && ip.verification.recommendedStrategy.length >= 1 ? 'Partially documented' : 'Not yet documented',
      detail: 'Implementation limitations and CDC/reset risks tracked; full corner-case matrix expands progressively.',
    },
    {
      topic: 'References',
      status: ip.references.length >= 2 ? 'Documented' : 'Requires source verification',
      detail: `${ip.references.length} verified upstream repository/doc URLs (${ip.confidence}).`,
    },
  ];

  const applicable = items.filter((i) => i.status !== 'Not applicable');
  const documented = applicable.filter((i) => i.status === 'Documented').length;
  return {
    items,
    documentedCount: documented,
    applicableCount: applicable.length,
    percentComplete: Math.round((documented / Math.max(1, applicable.length)) * 100),
    note:
      ip.confidence === 'Verified from Source/Docs'
        ? `Honest coverage check across ${applicable.length} applicable engineering layers (never artificially inflated to 100%).`
        : `Confidence is "${ip.confidence}" — RTL-derived sections are flagged "Requires source verification" until deeper pass completes.`,
  };
}
