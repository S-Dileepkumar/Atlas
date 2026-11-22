// Interactive computation & simulation engines for the Silicon-to-PQC Crypto Stack page.

export interface EuclideanStep {
  step: number;
  q: number;
  r: number;
  oldR: number;
  s: number;
  t: number;
}

export interface ModInverseResult {
  gcd: number;
  inverse: number | null;
  steps: EuclideanStep[];
}

/**
 * Computes gcd(a, m) and modular inverse a^-1 mod m using Extended Euclidean Algorithm.
 */
export function computeExtendedGcd(aInput: number, mInput: number): ModInverseResult {
  const m = Math.max(2, Math.floor(Math.abs(mInput)));
  const a = ((Math.floor(aInput) % m) + m) % m;

  let oldR = a;
  let r = m;
  let oldS = 1;
  let s = 0;
  let oldT = 0;
  let t = 1;

  const steps: EuclideanStep[] = [];
  let iter = 0;

  while (r !== 0 && iter < 40) {
    const q = Math.floor(oldR / r);
    const nextR = oldR - q * r;
    const nextS = oldS - q * s;
    const nextT = oldT - q * t;

    steps.push({
      step: iter + 1,
      q,
      oldR,
      r: nextR,
      s: nextS,
      t: nextT,
    });

    oldR = r;
    r = nextR;
    oldS = s;
    s = nextS;
    oldT = t;
    t = nextT;
    iter += 1;
  }

  const gcd = oldR;
  const inverse = gcd === 1 ? ((oldS % m) + m) % m : null;
  return { gcd, inverse, steps };
}

export interface CrtResult {
  M: number;
  x: number | null;
  coprime: boolean;
  terms: Array<{ a: number; m: number; Mi: number; yi: number }>;
}

/**
 * Solves 3-congruence Chinese Remainder Theorem system: x === a_i (mod m_i).
 */
export function solveCrt3(
  pairs: Array<{ a: number; m: number }>
): CrtResult {
  const mods = pairs.map((p) => Math.max(2, Math.floor(Math.abs(p.m))));
  for (let i = 0; i < mods.length; i++) {
    for (let j = i + 1; j < mods.length; j++) {
      if (computeExtendedGcd(mods[i], mods[j]).gcd !== 1) {
        return { M: 0, x: null, coprime: false, terms: [] };
      }
    }
  }

  const M = mods.reduce((acc, val) => acc * val, 1);
  const terms: Array<{ a: number; m: number; Mi: number; yi: number }> = [];
  let sum = 0;

  for (let i = 0; i < pairs.length; i++) {
    const m = mods[i];
    const a = ((Math.floor(pairs[i].a) % m) + m) % m;
    const Mi = M / m;
    const yi = computeExtendedGcd(Mi, m).inverse ?? 0;
    sum += a * Mi * yi;
    terms.push({ a, m, Mi, yi });
  }

  return { M, x: ((sum % M) + M) % M, coprime: true, terms };
}

// ---------------------------------------------------------------------------
// Lab B: Side-Channel & Constant-Time Leakage Simulator
// ---------------------------------------------------------------------------

export interface SideChannelSample {
  cycle: number;
  label: string;
  leakyPowerMw: number;
  hardenedPowerMw: number;
  leakyCacheHit: boolean;
  secretBit: 0 | 1;
}

function popcount8(v: number): number {
  let x = v & 0xff;
  let c = 0;
  while (x) {
    c += x & 1;
    x >>= 1;
  }
  return c;
}

export function simulateSideChannelTrace(
  secretByte: number,
  maskByte: number
): {
  samples: SideChannelSample[];
  leakyCycles: number;
  hardenedCycles: number;
  leakySnrNote: string;
  hardenedSnrNote: string;
} {
  const sec = secretByte & 0xff;
  const msk = maskByte & 0xff;
  const maskedShare0 = sec ^ msk;
  const samples: SideChannelSample[] = [];
  let leakyCycles = 0;

  for (let bit = 7; bit >= 0; bit--) {
    const kBit = ((sec >> bit) & 1) as 0 | 1;
    const cycleIdx = 8 - bit;

    // Vulnerable implementation: secret-dependent branch + unmasked S-Box table lookup
    // Switching current scales with Hamming Weight when branch taken (extra multiplier/table fetch)
    const hwLeak = kBit === 1 ? 4.2 + popcount8(sec) * 0.35 : 1.7 + popcount8(sec) * 0.12;
    leakyCycles += kBit === 1 ? 3 : 1;

    // Hardened DOM / Constant-Time: both shares evaluated identically in 2-cycle fixed schedule
    const share0Hw = popcount8(maskedShare0 ^ (cycleIdx * 17));
    const share1Hw = popcount8(msk ^ (cycleIdx * 17));
    const balancedHw = 3.1 + ((share0Hw + share1Hw) % 3) * 0.08;

    samples.push({
      cycle: cycleIdx,
      label: `b${bit}`,
      leakyPowerMw: Number(hwLeak.toFixed(2)),
      hardenedPowerMw: Number(balancedHw.toFixed(2)),
      leakyCacheHit: kBit === 0,
      secretBit: kBit,
    });
  }

  return {
    samples,
    leakyCycles,
    hardenedCycles: 16,
    leakySnrNote:
      'High DPA/SPA & timing correlation: secret bit=1 triggers extra branch/multiply cycles (+2 cycles) and unmasked bus Hamming weight.',
    hardenedSnrNote:
      'Constant-time + 1st-order Boolean masking: fixed 16-cycle latency regardless of key, and switching power decoupled via random share m.',
  };
}

// ---------------------------------------------------------------------------
// Lab C: ML-KEM (Kyber) NTT Butterfly & NIST 2026 PQC Benchmark Matrix
// ---------------------------------------------------------------------------

export const KYBER_Q = 3329;

export interface NttButterflyTrace {
  aIn: number;
  bIn: number;
  zeta: number;
  t: number;
  aOut: number;
  bOut: number;
  inverseCheckA: number;
  inverseCheckB: number;
}

/**
 * Computes one Cooley-Tukey NTT butterfly in Z_3329:
 * t = (b * zeta) mod 3329
 * a' = (a + t) mod 3329
 * b' = (a - t) mod 3329
 * And verifies Gentleman-Sande inverse step:
 * a_rec = (a' + b') * inv2 mod 3329
 * b_rec = (a' - b') * inv2 * zeta^-1 mod 3329
 */
export function computeKyberButterfly(
  aInput: number,
  bInput: number,
  zetaInput: number
): NttButterflyTrace {
  const q = KYBER_Q;
  const mod = (n: number) => ((n % q) + q) % q;
  const aIn = mod(Math.floor(aInput));
  const bIn = mod(Math.floor(bInput));
  const zeta = Math.max(1, mod(Math.floor(zetaInput))) || 17;

  const t = mod(bIn * zeta);
  const aOut = mod(aIn + t);
  const bOut = mod(aIn - t);

  const inv2 = 1665; // 2^-1 mod 3329 = (3329 + 1) / 2
  const invZeta = computeExtendedGcd(zeta, q).inverse ?? 1;

  const inverseCheckA = mod((aOut + bOut) * inv2);
  const inverseCheckB = mod(mod((aOut - bOut) * inv2) * invZeta);

  return {
    aIn,
    bIn,
    zeta,
    t,
    aOut,
    bOut,
    inverseCheckA,
    inverseCheckB,
  };
}

export interface PqcSchemeSpec {
  id: string;
  name: string;
  standard: string;
  family: 'Lattice (MLWE)' | 'Lattice (NTRU)' | 'Hash-Based' | 'Code-Based' | 'Classical' | 'Hybrid';
  type: 'KEM / Key Exchange' | 'Digital Signature';
  nistLevel: string;
  publicKeyBytes: number;
  secretKeyBytes: number;
  ciphertextOrSigBytes: number;
  hardwareFocus: string;
  status2026: string;
}

export const PQC_SCHEME_MATRIX: PqcSchemeSpec[] = [
  {
    id: 'x25519',
    name: 'X25519 (Baseline Classical)',
    standard: 'RFC 7748',
    family: 'Classical',
    type: 'KEM / Key Exchange',
    nistLevel: 'Classical 128-bit (0-bit PQ)',
    publicKeyBytes: 32,
    secretKeyBytes: 32,
    ciphertextOrSigBytes: 32,
    hardwareFocus: '256-bit Montgomery ladder multiplier',
    status2026: 'Vulnerable to Shor — migrate to Hybrid',
  },
  {
    id: 'rsa-2048',
    name: 'RSA-2048 PSS (Baseline Classical)',
    standard: 'FIPS 186-5 / PKCS#1',
    family: 'Classical',
    type: 'Digital Signature',
    nistLevel: 'Classical 112-bit (0-bit PQ)',
    publicKeyBytes: 256,
    secretKeyBytes: 1192,
    ciphertextOrSigBytes: 256,
    hardwareFocus: '2048-bit Montgomery modular exponentiation (PKA)',
    status2026: 'Vulnerable to Shor — deprecating post-2030',
  },
  {
    id: 'ml-kem-512',
    name: 'ML-KEM-512 (Kyber-512)',
    standard: 'NIST FIPS 203',
    family: 'Lattice (MLWE)',
    type: 'KEM / Key Exchange',
    nistLevel: 'NIST Level 1 (AES-128 eq.)',
    publicKeyBytes: 800,
    secretKeyBytes: 1632,
    ciphertextOrSigBytes: 768,
    hardwareFocus: '256-pt NTT (q=3329) + Keccak/SHAKE128 CBD sampler',
    status2026: 'Standardized (Primary KEM)',
  },
  {
    id: 'ml-kem-768',
    name: 'ML-KEM-768 (Kyber-768)',
    standard: 'NIST FIPS 203',
    family: 'Lattice (MLWE)',
    type: 'KEM / Key Exchange',
    nistLevel: 'NIST Level 3 (AES-192 eq.)',
    publicKeyBytes: 1184,
    secretKeyBytes: 2400,
    ciphertextOrSigBytes: 1088,
    hardwareFocus: 'k=3 Module-LWE matrix NTT + Keccak-f[1600] bottleneck',
    status2026: 'Standardized (Default TLS 1.3 Target)',
  },
  {
    id: 'ml-kem-1024',
    name: 'ML-KEM-1024 (Kyber-1024)',
    standard: 'NIST FIPS 203',
    family: 'Lattice (MLWE)',
    type: 'KEM / Key Exchange',
    nistLevel: 'NIST Level 5 (AES-256 eq.)',
    publicKeyBytes: 1568,
    secretKeyBytes: 3168,
    ciphertextOrSigBytes: 1568,
    hardwareFocus: 'k=4 Module-LWE high-throughput NTT + masked FO transform',
    status2026: 'Standardized (CNSA 2.0 / High Assurance)',
  },
  {
    id: 'x25519-mlkem768',
    name: 'X25519MLKEM768 (Hybrid TLS)',
    standard: 'IETF TLS 1.3 Hybrid Draft',
    family: 'Hybrid',
    type: 'KEM / Key Exchange',
    nistLevel: 'Classical 128-bit + NIST Level 3',
    publicKeyBytes: 1216,
    secretKeyBytes: 2432,
    ciphertextOrSigBytes: 1120,
    hardwareFocus: 'Dual ECC + ML-KEM engines feeding HKDF combiner',
    status2026: 'Production Deployed (Chrome / Cloudflare / OpenSSL)',
  },
  {
    id: 'ml-dsa-65',
    name: 'ML-DSA-65 (Dilithium-3)',
    standard: 'NIST FIPS 204',
    family: 'Lattice (MLWE)',
    type: 'Digital Signature',
    nistLevel: 'NIST Level 3',
    publicKeyBytes: 1952,
    secretKeyBytes: 4032,
    ciphertextOrSigBytes: 3309,
    hardwareFocus: '256-pt NTT (q=8380417) + SHAKE256 rejection sampling',
    status2026: 'Standardized (Primary Signature)',
  },
  {
    id: 'fn-dsa-512',
    name: 'FN-DSA-512 (Falcon-512)',
    standard: 'NIST FIPS 206 (Draft)',
    family: 'Lattice (NTRU)',
    type: 'Digital Signature',
    nistLevel: 'NIST Level 1',
    publicKeyBytes: 897,
    secretKeyBytes: 1281,
    ciphertextOrSigBytes: 666,
    hardwareFocus: 'NTRU FFT + constant-time IEEE 754 FP64 discrete Gaussian',
    status2026: 'Draft Standardization (Compact Signatures)',
  },
  {
    id: 'slh-dsa-128s',
    name: 'SLH-DSA-SHA2-128s (SPHINCS+)',
    standard: 'NIST FIPS 205',
    family: 'Hash-Based',
    type: 'Digital Signature',
    nistLevel: 'NIST Level 1',
    publicKeyBytes: 32,
    secretKeyBytes: 64,
    ciphertextOrSigBytes: 7856,
    hardwareFocus: 'Pipelined SHA-256 / SHAKE256 tree hashing (WOTS+ / FORS)',
    status2026: 'Standardized (Conservative Root/Firmware Trust)',
  },
  {
    id: 'hqc-128',
    name: 'HQC-128 (Backup Code KEM)',
    standard: 'NIST PQC Round 4 Selected (2025)',
    family: 'Code-Based',
    type: 'KEM / Key Exchange',
    nistLevel: 'NIST Level 1',
    publicKeyBytes: 2249,
    secretKeyBytes: 2289,
    ciphertextOrSigBytes: 4481,
    hardwareFocus: 'GF(2)[X] cyclic polynomial multiplier + BCH/RM decoder',
    status2026: 'Selected Backup KEM (Non-Lattice Diversity)',
  },
  {
    id: 'mceliece-348864',
    name: 'Classic McEliece 348864',
    standard: 'ISO / NIST Round 4 Alternate',
    family: 'Code-Based',
    type: 'KEM / Key Exchange',
    nistLevel: 'NIST Level 1',
    publicKeyBytes: 261120,
    secretKeyBytes: 6492,
    ciphertextOrSigBytes: 96,
    hardwareFocus: 'Large SRAM/DRAM key storage + GF(2^12) Goppa syndrome decode',
    status2026: 'Alternate (Tiny Ciphertext, Huge Public Key)',
  },
];

// ---------------------------------------------------------------------------
// Lab D: Live ML-KEM Parameter Explorer & ASIC Area / Power / Latency Model
// ---------------------------------------------------------------------------

export type MlKemHardwareMode = 'single-pe-unmasked' | 'masked-1st-order' | 'quad-pe-high-speed';

export interface MlKemParameterProfile {
  schemeLabel: string;
  k: number;
  eta1: number;
  du: number;
  dv: number;
  publicKeyBytes: number;
  secretKeyBytes: number;
  ciphertextBytes: number;
  sharedSecretBytes: number;
  classicalSecurityBits: number;
  nttCallsPerDecaps: number;
  keccakBlocksPerDecaps: number;
  estimatedCycles: number;
  estimatedAreaKge: number;
  estimatedPowerMw: number;
  sramFootprintKb: number;
  criticalPathNote: string;
}

export function computeMlKemParameterProfile(
  k: 2 | 3 | 4,
  eta1: 2 | 3,
  du: 10 | 11,
  dv: 4 | 5,
  hwMode: MlKemHardwareMode
): MlKemParameterProfile {
  // FIPS 203 byte formulas for n = 256, q = 3329 (12-bit packed coefficients)
  const polyBytes = 384; // (256 * 12) / 8
  const publicKeyBytes = k * polyBytes + 32; // ek = t_hat || rho
  const indcpaSkBytes = k * polyBytes;
  const secretKeyBytes = indcpaSkBytes + publicKeyBytes + 64; // dk = s_hat || ek || H(ek) || z
  const ciphertextBytes = k * ((256 * du) / 8) + (256 * dv) / 8;

  const schemeLabel =
    k === 2 ? 'ML-KEM-512 (Custom)' : k === 3 ? 'ML-KEM-768 (Custom)' : 'ML-KEM-1024 (Custom)';
  const classicalSecurityBits = k === 2 ? 128 : k === 3 ? 192 : 256;

  // Decapsulation work: k INTTs + k*k matrix NTTs + FO re-encap
  const nttCallsPerDecaps = k * k + 3 * k + 1;
  const keccakBlocksPerDecaps = 8 + k * k * 2 + k * eta1;

  const baseNttCycles = nttCallsPerDecaps * 896; // 1 PE: 128 * 7 stages = 896 cyc/NTT
  const keccakCycles = keccakBlocksPerDecaps * 24;

  let estimatedCycles = baseNttCycles + keccakCycles;
  let estimatedAreaKge = 28 + k * 2;
  let estimatedPowerMw = 6.8 + k * 0.6;
  let sramFootprintKb = 6 + k * 2;
  let criticalPathNote =
    'Critical path: 12x12 multiplier -> Barrett reduction mod 3329 -> SRAM write-back (~4.2 ns @ 28nm).';

  if (hwMode === 'masked-1st-order') {
    estimatedCycles = Math.round(baseNttCycles * 1.65 + keccakCycles * 1.45 + k * 950);
    estimatedAreaKge = 74 + k * 6;
    estimatedPowerMw = 14.2 + k * 1.1;
    sramFootprintKb = 12 + k * 4;
    criticalPathNote =
      'Critical path: A2B/B2A masked gadget + DOM Keccak Chi-layer + TRNG fresh-mask FIFO (~5.8 ns).';
  } else if (hwMode === 'quad-pe-high-speed') {
    estimatedCycles = Math.round(baseNttCycles * 0.28 + keccakCycles * 0.65);
    estimatedAreaKge = 68 + k * 5;
    estimatedPowerMw = 18.5 + k * 1.4;
    sramFootprintKb = 10 + k * 3;
    criticalPathNote =
      'Critical path: 4-bank conflict-free SRAM arbitration -> 4x parallel Barrett butterfly PEs (~4.5 ns).';
  }

  return {
    schemeLabel,
    k,
    eta1,
    du,
    dv,
    publicKeyBytes,
    secretKeyBytes,
    ciphertextBytes,
    sharedSecretBytes: 32,
    classicalSecurityBits,
    nttCallsPerDecaps,
    keccakBlocksPerDecaps,
    estimatedCycles,
    estimatedAreaKge,
    estimatedPowerMw: Number(estimatedPowerMw.toFixed(1)),
    sramFootprintKb,
    criticalPathNote,
  };
}

export interface NttStageAnnotation {
  id: 'input-sram' | 'twiddle-mul' | 'barrett-mod' | 'add-sub-out';
  label: string;
  rtlRole: string;
  leakageNote: string;
}

export const NTT_STAGE_ANNOTATIONS: NttStageAnnotation[] = [
  {
    id: 'input-sram',
    label: '1. Coefficient SRAM Read (a, b)',
    rtlRole: 'Dual-port bank read supplying 12-bit coefficients a[j] and b[j + len] in conflict-free stride.',
    leakageNote:
      'Power/EM Risk: Unmasked coefficient reads expose Hamming distance between sequential SRAM words; mitigate via Boolean share splitting.',
  },
  {
    id: 'twiddle-mul',
    label: '2. Twiddle Multiplier (b · ζ)',
    rtlRole: '12x12-bit unsigned multiplier computing 24-bit intermediate product b * zeta before modular reduction.',
    leakageNote:
      'High CPA/Template Target: Twiddle zeta is public, so single-trace templates correlate directly against b unless b is masked (b = b0 + b1 mod 3329).',
  },
  {
    id: 'barrett-mod',
    label: '3. Barrett / Montgomery Reduction (mod 3329)',
    rtlRole: 'Division-free constant multiplication + shift reducing 24-bit product into [0, 3328] in 1–2 pipeline cycles.',
    leakageNote:
      'Timing Risk: Conditional subtraction `if (r >= Q) r -= Q` must execute via constant-time mux (`r - Q` borrow select), never variable branching.',
  },
  {
    id: 'add-sub-out',
    label: '4. Cooley-Tukey Output (a±t mod q)',
    rtlRole: 'Produces paired butterfly outputs a\' = (a + t) mod 3329 and b\' = (a - t) mod 3329 back into ping-pong SRAM.',
    leakageNote:
      'Fault Risk: Clock glitching write-enable corrupts high-stage NTT coefficients, triggering silent decapsulation mismatches or fault-assisted key recovery.',
  },
];

export function buildPqcMatrixCsv(schemes: PqcSchemeSpec[]): string {
  const header = [
    'Scheme',
    'Standard',
    'Family',
    'Type',
    'Security Level',
    'PublicKeyBytes',
    'SecretKeyBytes',
    'CiphertextOrSigBytes',
    'HardwareFocus',
    'Status2026',
  ];
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
  const rows = schemes.map((s) =>
    [
      s.name,
      s.standard,
      s.family,
      s.type,
      s.nistLevel,
      s.publicKeyBytes,
      s.secretKeyBytes,
      s.ciphertextOrSigBytes,
      s.hardwareFocus,
      s.status2026,
    ]
      .map(escape)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

