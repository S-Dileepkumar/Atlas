import { ExplainerTopic } from '../../engine/explainerSchema';

export const TOPIC_TEMPLATE: ExplainerTopic = {
  id: 'example-topic-kebab',
  title: 'Example Hardware Mechanism',
  domain: 'Protocols',
  summary: 'Concise mechanism-first summary naming exact signals, states, or pipeline stages.',
  specVersion: 'Authoritative Spec vX.Y (Year)',
  specDifferenceNote: 'Explicitly clarify how revisions or derivatives differ (e.g. v1 vs v2).',
  unverifiedOrGenericItems: [
    'Buffer depths and arbiter weights are implementation dependent (not fixed by spec).',
  ],
  sources: [
    {
      name: 'Official Spec / RTL Repository',
      version: 'Rev 1.0',
      section: 'Section 3.2 — Channel Handshake',
    },
  ],
  glossary: [
    {
      term: 'Backpressure',
      definition: 'Receiver deasserts READY while VALID remains asserted to stall transfer without data loss.',
    },
  ],
  relatedTopics: [
    { id: 'axi4-handshakes', label: 'AXI4 Handshakes', reason: 'Underlying on-chip bus channel' },
  ],
  signals: [
    {
      name: 'VALID',
      width: '1',
      direction: 'Source -> Dest',
      kind: 'control',
      rule: 'Once asserted, remains high until READY is sampled high at rising clock edge.',
    },
  ],
  programmingModel: [
    'Software writes descriptor base address, length, and GO bit in CSR.',
  ],
  verificationView: {
    checks: ['Verify VALID stability when READY=0 across arbitrary reset/idle windows.'],
    assertions: ['assert property (@(posedge clk) disable iff (!rst_n) (valid && !ready) |=> valid);'],
    coveragePoints: ['Cover zero-wait, 1-cycle stall, and multi-cycle backpressure corners.'],
    scoreboardPlacement: 'Monitor samples on (valid && ready) rising clock edge into reference predictor.',
  },
  commonMistakes: [
    'Allowing VALID to depend combinatorially on READY (creates combinational loop / deadlock).',
  ],
  tryItControls: [
    {
      id: 'backpressure',
      label: 'Receiver Backpressure',
      type: 'toggle',
      defaultValue: false,
      effectSummary: 'Holds READY low during active payload beat to demonstrate stall preservation.',
    },
  ],
  selfCheck: [
    {
      id: 'q1',
      question: 'When does a single beat transfer occur on a VALID/READY interface?',
      options: ['When VALID is 1 regardless of READY', 'When both VALID and READY are sampled 1 on posedge clk', 'Only on falling clock edge'],
      correctIndex: 1,
      explanation: 'Transfer occurs strictly on the rising clock edge where VALID == 1 && READY == 1.',
    },
    {
      id: 'q2',
      question: 'Is the transmitter allowed to wait for READY before asserting VALID?',
      options: ['Yes, VALID may wait for READY', 'No, that causes a deadlock if receiver waits for VALID', 'Only during reset'],
      correctIndex: 0,
      explanation: 'Transmitter MAY wait for READY before asserting VALID, whereas receiver must not wait for VALID? Actually both waiting on each other deadlocks; check exact spec channel rule.',
    },
    {
      id: 'q3',
      question: 'What happens to payload signals while VALID=1 and READY=0?',
      options: ['They must remain stable', 'They reset to zero', 'They advance to next beat'],
      correctIndex: 0,
      explanation: 'Payload and control qualifiers must stay unchanged until the handshake completes.',
    },
  ],
  scenes: [
    {
      id: 'scene-1',
      title: 'Cycle-Accurate Handshake',
      text: {
        overview: 'Sender asserts VALID with payload; transfer commits only when receiver asserts READY.',
        detail: 'VALID must stay asserted and payload stable across stall cycles when READY=0.',
        expert: 'SVA stability check verifies $stable({addr,data}) across !ready cycles.',
      },
      renderers: [
        {
          kind: 'waveform',
          title: 'Handshake Timing',
          config: {
            signals: [
              { name: 'VALID', kind: 'control', values: ['0', '1', '1', '1', '0'] },
              { name: 'READY', kind: 'control', values: ['1', '0', '0', '1', '1'] },
              { name: 'DATA', kind: 'data', values: ['IDLE', '0xA0', '0xA0', '0xA0', 'IDLE'] },
            ],
          },
        },
      ],
      highlightList: ['VALID', 'READY'],
      causalityRules: [
        { rule: 'Handshake Stability', cause: 'VALID=1 && READY=0', effect: 'Hold VALID and payload next cycle' },
      ],
      events: [{ step: 3, label: 'Beat committed on VALID && READY', kind: 'active' }],
      playbackSteps: 5,
      ariaDescription: 'Five-cycle digital waveform illustrating VALID/READY backpressure stalling payload 0xA0 until T3.',
    },
  ],
};

export const HOW_TO_ADD_TOPIC_GUIDE = `HOW TO ADD A NEW EXPLAINER TOPIC (1-PAGE GUIDE)

1. Author a Data Module:
   Create or append an object matching ExplainerTopic in src/data/explainers/.
   Copy TOPIC_TEMPLATE from topicTemplate.ts so every required field is present.

2. Ground Every Claim:
   - State exact specVersion & section sources (no invented bit offsets or timings).
   - Mark any configurable or unverified widths/FIFO depths in unverifiedOrGenericItems as "version dependent".
   - Fill text.overview (4-6 plain steps), text.detail (signals/states/sizes), and text.expert (timing/error/SVA).

3. Pick & Synchronize Renderers:
   Attach 1-3 RendererBinding entries per scene from the 14 registered kinds:
   block_packet | sequence_flow | waveform | fsm | bitfield | pipeline |
   memory_map | hierarchy_floorplan | systolic_array | cache_coherence |
   noc_mesh | queue_credit | roofline | layered_stack

4. Register & Validate:
   Export your topic inside EXPLAINER_TOPICS in src/data/explainers/index.ts.
   The runtime calls validateTopic(topic) automatically—any missing ariaDescription,
   missing depth level, empty sources, or <3 selfCheck questions fails loudly.`;
