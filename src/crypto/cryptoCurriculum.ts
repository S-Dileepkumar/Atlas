import { CRYPTO_CHAPTERS_PART1 } from './cryptoCurriculumPart1';
import { CRYPTO_CHAPTERS_PART2 } from './cryptoCurriculumPart2';
import type { CryptoChapter, MasteryStage, StackStratum } from './cryptoCurriculumTypes';

export type {
  CryptoAtlasLink,
  CryptoChapter,
  CryptoSubtopic,
  MasteryStage,
  StackStratum,
  StackStratumId,
} from './cryptoCurriculumTypes';

export const CRYPTO_CURRICULUM: CryptoChapter[] = [
  ...CRYPTO_CHAPTERS_PART1,
  ...CRYPTO_CHAPTERS_PART2,
];

export const STACK_STRATA: StackStratum[] = [
  {
    id: 'silicon-physics',
    order: 1,
    label: '01 · Silicon & Mathematical Substrate',
    subtitle: 'GF(p), GF(2^n), Number Theory, Entropy & Information Limits',
    chapterIds: ['ch1-math'],
    hardwareBoundary: 'Algebraic Rules -> Gate Count & Carry Chains',
  },
  {
    id: 'gates-rtl',
    order: 2,
    label: '02 · Gates, CMOS & Side-Channel Physics',
    subtitle: 'Standard Cells, Sparse FSMs, CDC, RTL-to-GDSII & EM/Power Leakage',
    chapterIds: ['ch2-hardware'],
    hardwareBoundary: 'Transistor Switching -> Power & Fault Physics',
  },
  {
    id: 'cpu-memory',
    order: 3,
    label: '03 · Architecture, Caches & Reverse Engineering',
    subtitle: 'Pipelines, SRAM/NVM, CPA/DPA, Faults, Cache Attacks & Netlist RE',
    chapterIds: ['ch7-attacks'],
    hardwareBoundary: 'Microarchitectural Contention -> Physical Attacks',
  },
  {
    id: 'software-os',
    order: 4,
    label: '04 · Software, Compilers & Hardened Engines',
    subtitle: 'Branchless C/ASM, Boot ROM, AES-NI, PKA/HSM/TPM & DOM Masking',
    chapterIds: ['ch3-software', 'ch6-implementation'],
    hardwareBoundary: 'Constant-Time Binary <-> Hardened RTL Macros',
  },
  {
    id: 'protocols-classical',
    order: 5,
    label: '05 · Classical Symmetric, Asymmetric & TLS',
    subtitle: 'AES-GCM, ChaCha20, SHA-3, DH, RSA, ECC, PKI, HKDF, DRBG & TLS 1.3',
    chapterIds: ['ch4-symmetric', 'ch5-asymmetric'],
    hardwareBoundary: 'Wire-Speed AEAD & 256-bit ECC PKA Pipelines',
  },
  {
    id: 'pqc-agility',
    order: 6,
    label: '06 · Post-Quantum Cryptography & Systems',
    subtitle: 'ML-KEM, ML-DSA, FN-DSA, SLH-DSA, HQC, NTT Silicon & PQC Secure Boot',
    chapterIds: ['ch8-pqc', 'ch9-advanced', 'ch10-mastery'],
    hardwareBoundary: 'NTT Butterflies + Keccak Engines + PQC RoT',
  },
];

export const MASTERY_STAGES: MasteryStage[] = [
  {
    id: 'stage-1',
    stageNumber: 1,
    title: 'Math Foundations + Digital Logic + C / Assembly',
    focus: 'Modular inverse, GF(2^8), Boolean gates, setup/hold timing, branchless C & objdump auditing',
    chapterIds: ['ch1-math', 'ch2-hardware', 'ch3-software'],
    deliverables: [
      'Implement constant-time Extended GCD & CRT solver',
      'Write branchless C `ct_select` and verify zero `Jcc` jumps in disassembly',
      'Model combinational vs. sequential setup/hold timing windows',
    ],
    recommendedLab: 'math',
  },
  {
    id: 'stage-2',
    stageNumber: 2,
    title: 'Classical Symmetric + Hash + AEAD',
    focus: 'AES internal state, ChaCha20 ARX, Keccak sponge, HMAC & AES-GCM nonce invariants',
    chapterIds: ['ch4-symmetric'],
    deliverables: [
      'Trace AES-128 SubBytes, ShiftRows, MixColumns & AddRoundKey across all 10 rounds',
      'Compare GF(2^8) S-Box vs. ARX ChaCha20 cache-timing resistance',
      'Demonstrate GHASH key recovery on AES-GCM nonce reuse',
    ],
    recommendedLab: 'aes-deep-dive',
  },
  {
    id: 'stage-3',
    stageNumber: 3,
    title: 'RSA + ECC + Protocols (TLS 1.3 & PKI)',
    focus: 'Montgomery ladder, ECDSA nonce hygiene, OAEP/PSS, HKDF, TRNG/DRBG & TLS 1.3 key schedule',
    chapterIds: ['ch5-asymmetric'],
    deliverables: [
      'Trace TLS 1.3 1-RTT handshake & HKDF Early/Handshake/App secret schedule',
      'Audit RSA-OAEP vs. PKCS#1 v1.5 Bleichenbacher padding oracles',
      'Inspect X25519 constant-time Montgomery ladder arithmetic',
    ],
    recommendedLab: 'math',
  },
  {
    id: 'stage-4',
    stageNumber: 4,
    title: 'Side-Channel & Implementation Attacks',
    focus: 'CPA/DPA correlation, TVLA |t| > 4.5, clock/voltage/laser glitching & Flush+Reload cache leaks',
    chapterIds: ['ch6-implementation', 'ch7-attacks'],
    deliverables: [
      'Simulate Hamming-weight CMOS switching current vs. 1st-order DOM masking',
      'Analyze Differential Fault Analysis (DFA) on AES Round 8/9 & RSA-CRT',
      'Verify sparse FSM fault-trap encoding & glitch-resistant DOM AND gates',
    ],
    recommendedLab: 'sca',
  },
  {
    id: 'stage-5',
    stageNumber: 5,
    title: 'Lattice Math + ML-KEM (Kyber) & ML-DSA (Dilithium) Internals',
    focus: 'Module-LWE over R_q, Cooley-Tukey / Gentleman-Sande NTT, CBD sampling & FO transform',
    chapterIds: ['ch8-pqc'],
    deliverables: [
      'Step through Z_3329 Cooley-Tukey and Gentleman-Sande NTT butterflies',
      'Compare key/ciphertext/signature footprints across FIPS 203/204/205/206 & HQC',
      'Trace Fujisaki-Okamoto implicit rejection & Dilithium rejection sampling',
    ],
    recommendedLab: 'pqc',
  },
  {
    id: 'stage-6',
    stageNumber: 6,
    title: 'Hardware Acceleration & Constant-Time PQC',
    focus: 'Pipelined Keccak + NTT silicon co-design, A2B/B2A masking & formal probing checks',
    chapterIds: ['ch6-implementation', 'ch8-pqc'],
    deliverables: [
      'Design a Barrett-reduced NTT butterfly PE in SystemVerilog',
      'Map Keccak-f[1600] bandwidth vs. NTT memory banking',
      'Plan arithmetic-to-Boolean (A2B) share conversion for masked ML-KEM',
    ],
    recommendedLab: 'pqc',
  },
  {
    id: 'stage-7',
    stageNumber: 7,
    title: 'Full System: Secure Boot -> PQC TLS -> Side-Channel Hardened Silicon',
    focus: 'Mask ROM + OTP fuses + LMS/ML-DSA boot -> X25519MLKEM768 TLS -> hardened silicon accelerators',
    chapterIds: ['ch9-advanced', 'ch10-mastery'],
    deliverables: [
      'Trace Mask ROM -> ROM_EXT PQC signature verification & OTP anti-rollback',
      'Inspect OpenTitan AES + TL-UL integrity + EDN clock domain isolation',
      'Design a crypto-agile silicon Root-of-Trust lifecycle architecture',
    ],
    recommendedLab: 'mastery',
  },
];
