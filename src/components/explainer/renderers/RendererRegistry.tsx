import React from 'react';
import { RendererBinding } from '../../../engine/explainerSchema';
import {
  BitFieldLayoutRenderer,
  BlockPacketRenderer,
  FsmStateRenderer,
  MemoryMapDecodeRenderer,
  PipelineLanesRenderer,
  RendererProps,
  SequenceFlowRenderer,
  WaveformTimelineRenderer,
} from './CoreRenderers';
import {
  CacheCoherenceRenderer,
  HierarchyFloorplanRenderer,
  LayeredStackRenderer,
  NocMeshCanvasRenderer,
  QueueCreditRenderer,
  RooflineChartRenderer,
  SystolicArrayCanvasRenderer,
} from './AdvancedRenderers';

const REGISTRY: Record<string, React.FC<RendererProps>> = {
  block_packet: BlockPacketRenderer,
  sequence_flow: SequenceFlowRenderer,
  waveform: WaveformTimelineRenderer,
  fsm: FsmStateRenderer,
  bitfield: BitFieldLayoutRenderer,
  pipeline: PipelineLanesRenderer,
  memory_map: MemoryMapDecodeRenderer,
  hierarchy_floorplan: HierarchyFloorplanRenderer,
  systolic_array: SystolicArrayCanvasRenderer,
  cache_coherence: CacheCoherenceRenderer,
  noc_mesh: NocMeshCanvasRenderer,
  queue_credit: QueueCreditRenderer,
  roofline: RooflineChartRenderer,
  layered_stack: LayeredStackRenderer,
};

interface RegisteredRendererProps extends Omit<RendererProps, 'config'> {
  binding: RendererBinding;
}

export const RegisteredRenderer: React.FC<RegisteredRendererProps> = ({
  binding,
  currentStep,
  totalSteps,
  depth,
  reducedMotion,
  verificationMode,
  tryItValues,
  onJumpToStep,
}) => {
  const Component = REGISTRY[binding.kind];
  if (!Component) {
    return (
      <div className="p-4 rounded-lg border border-red-500/40 bg-red-500/10 text-xs text-red-700 dark:text-red-300 font-mono">
        Unknown renderer kind: &quot;{binding.kind}&quot;. Register it in RendererRegistry.tsx.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {binding.title && (
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{binding.title}</div>
      )}
      <Component
        config={binding.config}
        currentStep={currentStep}
        totalSteps={totalSteps}
        depth={depth}
        reducedMotion={reducedMotion}
        verificationMode={verificationMode}
        tryItValues={tryItValues}
        onJumpToStep={onJumpToStep}
      />
    </div>
  );
};
