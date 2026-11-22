import type { CryptoChapter } from './cryptoCurriculumTypes';

export const CRYPTO_CHAPTERS_PART2: CryptoChapter[] = [
  {
    id: 'ch6-implementation',
    number: 6,
    title: 'Cryptographic Implementation & Engineering',
    stratumId: 'software-os',
    stackLayerLabel: 'Stratum 4 · Constant-Time SW, Silicon Accelerators & Masking',
    vlsiPerspective:
      'Closing the gap between abstract equations and hostile physical hardware requires constant-time instruction streams, ISA crypto extensions, dedicated silicon engines (AES/SHA/PKA), physical root-of-trust macros (TRNG/PUF/HSM/TPM), and gate-level masking/hiding.',
    keyTakeaway:
      'Production security relies on eliminating secret-dependent timing, isolating keys in hardened hardware boundaries, and formally verifying masking invariants.',
    subtopics: [
      {
        id: 'impl-constant-time',
        title: 'Constant-Time Programming (No Secret-Dependent Branches or Memory Access)',
        summary:
          'Writing software and microcode whose control flow, cache-line footprint, and instruction latency are invariant with respect to secret bits.',
        mechanics:
          'Never branch (`if (secret_bit)`) or index arrays (`sbox[secret_byte]`) or execute variable-latency instructions (`DIV`) on secret material. Replace branches with bitwise `mask = -(bit)` arithmetic and bit-sliced boolean logic across SIMD registers.',
        siliconAndRtlLink:
          'Even constant-time software can leak if CPU microarchitecture triggers speculative execution or operand-dependent silent stores; hardware Data-Independent Timing (DIT / Zkt) modes lock ALU latency.',
        attackAndDefense:
          'Bit-slicing evaluates 32 or 64 AES S-Boxes in parallel using pure boolean gates (`AND`, `XOR`, `NOT`) in registers—immune to cache timing and 10x faster than bytewise lookup tables.',
      },
      {
        id: 'impl-asm',
        title: 'Assembly-Level Crypto (AES-NI, CLMUL, ARM Crypto Extensions, RISC-V Zkn)',
        summary:
          'Hardware-accelerated ISA instructions executing full AES rounds, SHA compression, and carry-less polynomial multiplication in constant cycles.',
        mechanics:
          '`AESENC`/`AESENCLAST` (x86), `AESE`/`AESMC` (ARMv8), and RISC-V `Zkne`/`Zknd` run dedicated standard-cell S-Box + MixColumns pipelines inside the CPU execution unit. `PCLMULQDQ` / `PMULL` accelerate GF(2^128) GHASH.',
        siliconAndRtlLink:
          'Dedicated ISA crypto pipes bypass L1 data cache completely, removing cache-timing leakage while achieving < 1 cycle/byte pipelined AES-CTR throughput.',
        attackAndDefense:
          'Ensure assembly kernels zeroize XMM/YMM/ZMM vector registers (`VPXOR`) before returning to OS/user space so secrets do not linger in physical register files.',
      },
      {
        id: 'impl-libraries',
        title: 'Software Libraries (OpenSSL, BoringSSL, libsodium, wolfSSL)',
        summary:
          'Comparing widely deployed cryptographic stacks: FIPS-validated general suites vs. misuse-resistant modern APIs vs. embedded footprints.',
        mechanics:
          'OpenSSL offers broad legacy/enterprise protocol support and FIPS 140-3 providers. BoringSSL (Google) strips legacy knobs, enforces strict assembly constant-time kernels, and pioneers X25519MLKEM768. libsodium enforces safe high-level AEAD/Ed25519 defaults. wolfSSL targets constrained MCUs and hardware-crypto HALs.',
        siliconAndRtlLink:
          'Libraries hook into silicon engines via Linux `AF_ALG` / `/dev/crypto` / PKCS#11 / PSA Crypto APIs to offload bulk symmetric and PKA math to SoC accelerators.',
        attackAndDefense:
          'Avoid "footgun" low-level primitives (raw ECB, unpadded RSA, manual IV handling); prefer misuse-resistant AEAD and audited BoringSSL/libsodium primitives.',
      },
      {
        id: 'impl-hw-accelerators',
        title: 'Hardware Crypto Accelerators (AES Engines, SHA Engines, PKA / RSA / ECC Engines)',
        summary:
          'Memory-mapped SoC IP blocks offloading symmetric ciphers, hashing, and multi-precision modular arithmetic from the main CPU.',
        mechanics:
          'AES engines stream 128-bit blocks via FIFO/DMA; SHA/KMAC engines absorb padded message blocks into internal 256/1600-bit state registers; PKA/OTBN coprocessors execute wide Montgomery multiplication and modular inversion via microcoded wide-ALU loops.',
        siliconAndRtlLink:
          'Accelerators connect over `TL-UL`, `APB`, or `AXI4-Lite` control CSRs and `AXI4` DMA buses, with dedicated hardware sideload buses carrying keys straight from KeyMgr without exposing key bytes to CPU SRAM.',
        attackAndDefense:
          'Never allow software-readable key registers (`swread = none` in CSR spec) and enforce hardware busy-lock + key zeroization on tamper/lifecycle escalation.',
        atlasLinks: [
          { label: 'OpenTitan AES Accelerator', kind: 'ip', targetId: 'opentitan-aes' },
          { label: 'TL-UL Bus Spec', kind: 'protocol', targetId: 'tl-ul' },
        ],
      },
      {
        id: 'impl-secure-hw',
        title: 'Secure Hardware Design (TRNGs, PUFs, Secure Elements, HSMs, TPMs)',
        summary:
          'Physical security boundaries: silicon root keys, unclonable device fingerprints, tamper-responsive HSMs, and measured-boot TPMs.',
        mechanics:
          'PUFs (SRAM startup mismatch, Ring-Oscillator frequency delta, Arbiter delay skew) extract per-die silicon manufacturing entropy without storing plaintext keys in NVM—stabilized via BCH/Polar error-correcting fuzzy extractors. Secure Elements (SE) and HSMs combine hardened cores, active metal shields, and voltage/temp/laser sensors.',
        siliconAndRtlLink:
          'TPMs (discrete SPI/LPC or firmware fTPM) maintain PCR (Platform Configuration Register) hash chains `PCR[i] = H(PCR[i] || measurement)` for remote attestation.',
        attackAndDefense:
          'Optical/EM analysis of SRAM PUF startup can clone weak PUF cells unless helper data leaks zero key entropy (zero-leakage debiasing) and PUF power-on timing is randomized.',
      },
      {
        id: 'impl-masking-hiding',
        title: 'Masking, Hiding & Dual-Rail Logic for Side-Channel Resistance',
        summary:
          'Breaking statistical dependence between intermediate values and power/EM traces via randomized secret sharing and balanced logic styles.',
        mechanics:
          'Boolean masking splits secret x into d+1 random shares x = x_0 ^ x_1 ^ ... ^ x_d refreshed every cycle by fresh PRNG masks. Domain-Oriented Masking (DOM) separates share domains with register stages before cross-domain XOR compression to stop CMOS glitches. Hiding flattens SNR via random dummy operations, clock jitter, and dual-rail precharge (WDDL).',
        siliconAndRtlLink:
          'DOM-indep S-Box multipliers add ~2.5-3.5x area and 5-stage pipeline latency per S-Box, plus an always-on PRNG/EDN entropy port feeding fresh remasking bits.',
        attackAndDefense:
          'Synthesis tools can merge masked share wires! Enforce `preserve`/`dont_touch` constraints and run formal gate-level probing verification (PROLEAD / Coco / Silver) on the synthesized netlist.',
        codeSnippet: {
          title: 'dom_and_gate.sv',
          language: 'SystemVerilog',
          code: `// 1st-Order Glitch-Resistant Domain-Oriented Masked AND Gate (DOM-indep)
// Computes (q0 ^ q1) = (a0 ^ a1) & (b0 ^ b1) using fresh 1-bit mask z
module dom_and_2share (
  input  logic clk,
  input  logic rst_n,
  input  logic a0, a1, // Shares of A
  input  logic b0, b1, // Shares of B
  input  logic z,      // Fresh uniform remasking bit per cycle
  output logic q0, q1  // Output shares of (A & B)
);
  logic cross_01_q, cross_10_q;
  logic inner_0, inner_1;

  // Inner domain multiplications + registered cross-domain terms prevent glitches
  assign inner_0 = a0 & b0;
  assign inner_1 = a1 & b1;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      cross_01_q <= 1'b0;
      cross_10_q <= 1'b0;
    end else begin
      cross_01_q <= (a0 & b1) ^ z;
      cross_10_q <= (a1 & b0) ^ z;
    end
  end

  assign q0 = inner_0 ^ cross_01_q;
  assign q1 = inner_1 ^ cross_10_q;
endmodule`,
        },
      },
      {
        id: 'impl-formal-verif',
        title: 'Formal Verification of Crypto Code & Masking (Constant-Time, Functional Correctness)',
        summary:
          'Mathematically proving zero timing leakage, zero glitch probing leakage, and bit-exact spec conformance.',
        mechanics:
          'Functional verification (HACL*, Fiat-Crypto, Jasmin, Cryptol/SAW) proves implementations match mathematical specs for all 2^256 inputs. Constant-time verifiers (`ct-verif`, `Binsec/Rel`) prove non-interference over secret inputs. Hardware masking verifiers (MaskVerif, Rebecca, PROLEAD) analyze netlists under glitch-extended probing models.',
        siliconAndRtlLink:
          'In RTL, SystemVerilog Assertions (SVA) + formal model checking (JasperGold / SymbiYosys) prove sparse FSMs cannot transition illegally and key sideloads zeroize within 1 cycle of alert assertion.',
        attackAndDefense:
          'Testing random vectors only covers 10^-60 of state space; formal verification catches rare carry-propagation bugs (e.g., Poly1305/Curve25519 limb overflow) and subtle glitch recombination.',
      },
      {
        id: 'impl-fips-cc',
        title: 'FIPS 140-3 & Common Criteria (CC) Certification Basics',
        summary:
          'Industry assurance frameworks governing cryptographic module boundaries, self-tests, physical tamper response, and side-channel evaluations.',
        mechanics:
          'FIPS 140-3 (ISO/IEC 19790) defines Security Levels 1–4: requiring Known Answer Tests (KATs), continuous RNG health checks, zeroization, and (at Level 3/4) tamper-evident/responsive physical enclosures and non-invasive SCA testing. Common Criteria uses Protection Profiles (PP) and Evaluation Assurance Levels (EAL1–EAL7, AVA_VAN.5 for high-potential attackers).',
        siliconAndRtlLink:
          'Hardware modules must include power-on self-test (POST) ROM/FSMs, role-based access control, and explicit cryptographic boundary schematics.',
        attackAndDefense:
          'Certification is a floor, not a ceiling—historically certified HSMs have still fallen to API logic flaws (PKCS#11 key wrapping leaks) or new transient execution side channels.',
      },
    ],
  },
  {
    id: 'ch7-attacks',
    number: 7,
    title: 'Attacks & Cryptanalysis (Reverse Engineering Focus)',
    stratumId: 'cpu-memory',
    stackLayerLabel: 'Stratum 5 · Physical, Microarchitectural & Binary Reverse Engineering',
    vlsiPerspective:
      'Viewing a chip as an adversary reveals that cryptography rarely breaks through brute-force key search. Instead, attackers exploit transistor physics (CPA/EM), voltage/clock/laser fault injection, CPU cache contention, protocol oracles, and silicon netlist extraction.',
    keyTakeaway:
      'Every implementation leaks along physical, microarchitectural, or algorithmic dimensions unless hardened systematically across all layers.',
    subtopics: [
      {
        id: 'atk-classical',
        title: 'Classical Cryptanalysis (Frequency Analysis, Differential & Linear Cryptanalysis)',
        summary:
          'Exploiting algebraic bias in cipher S-Boxes and round permutations to recover round keys faster than brute force.',
        mechanics:
          'Differential cryptanalysis (Biham-Shamir) tracks high-probability input XOR differences delta_X -> delta_Y across rounds. Linear cryptanalysis (Matsui) exploits probabilistic parity approximations P(sum(X_i) ^ sum(Y_j) ^ sum(K_m) = 0) != 1/2.',
        siliconAndRtlLink:
          'AES’s GF(2^8) inverse S-Box + MDS MixColumns guarantee at least 25 active S-Boxes across 4 rounds (Wide Trail Strategy), bounding differential/linear probabilities below 2^-150.',
        attackAndDefense:
          'Reduced-round variants or custom "lightweight" ciphers with weak S-Box DDT/LAT tables fall quickly; never design proprietary S-Boxes.',
      },
      {
        id: 'atk-sca',
        title: 'Side-Channel Attacks (SPA, DPA, CPA, Template Attacks, EM, Acoustic)',
        summary:
          'Recovering secret keys non-invasively by measuring power rail current, localized magnetic fields, or acoustic coil whine during execution.',
        mechanics:
          'SPA inspects a single trace visually (e.g., RSA square-and-multiply branches). DPA/CPA align thousands of traces and correlate measured power against hypothetical Hamming weight/distance of intermediate values (`SBox(pt ^ k_guess)`). Template attacks build multivariate Gaussian noise models on a profiling device to break keys in 1–5 traces.',
        siliconAndRtlLink:
          'On-die decoupling caps blur global shunt-resistor power, so attackers place 50-micron micro-EM probes directly over the AES/PKA metal stack after thinning the package epoxy.',
        attackAndDefense:
          'Validate silicon with TVLA (Test Vector Leakage Assessment) passing |t| < 4.5 across 1M+ traces using DOM masking + dual-rail/hiding + clock randomization.',
      },
      {
        id: 'atk-fault',
        title: 'Fault Injection (Voltage/Clock Glitching, Laser, EMFI)',
        summary:
          'Actively perturbing silicon setup/hold timing or flipping SRAM/register bits mid-computation to bypass checks or leak secrets.',
        mechanics:
          'Crowbar voltage glitching drops V_DD for nanoseconds; clock glitching inserts a narrow pulse violating combinational t_pd; EMFI injects localized eddy currents via coil pulses; NIR picosecond lasers flip individual SRAM/flip-flop transistors through backside silicon.',
        siliconAndRtlLink:
          'Differential Fault Analysis (DFA) on AES Round 8/9 recovers the full 128-bit key from just 2 faulty ciphertexts! Faults during RSA-CRT or secure-boot `if (sig_ok)` jumps bypass authentication entirely.',
        attackAndDefense:
          'Redundant dual-core lockstep, inverse-round re-computation before output, sparse FSMs, glitch/light/EM sensors, and error-detecting state codes.',
      },
      {
        id: 'atk-timing-cache',
        title: 'Timing & Cache Attacks (Prime+Probe, Flush+Reload, Spectre / Meltdown Variants)',
        summary:
          'Exploiting shared microarchitectural state (L1/LLC caches, BTB, execution ports, speculative pipelines) to read secrets across privilege boundaries.',
        mechanics:
          'Flush+Reload flushes a shared memory line (`clflush`), lets victim run, and measures reload latency (< 80 cycles = cache hit = accessed). Prime+Probe fills an entire cache set without shared memory and measures eviction time. Spectre tricks speculative execution into loading secrets into transient cache lines.',
        siliconAndRtlLink:
          'Set-associative caches map physical/virtual address bits `[11:6]` to cache sets; any secret-dependent array offset leaves a 64-byte cache-line fingerprint.',
        attackAndDefense:
          'Eliminate secret-dependent lookups (use bit-slicing / AES-NI), insert speculation barriers (`LFENCE` / `CSDB`), and partition LLC ways (CAT) across security domains.',
      },
      {
        id: 'atk-impl-rsa-ecc',
        title: 'Implementation Attacks on RSA & ECC (Bleichenbacher, Padding Oracles, Invalid Curve)',
        summary:
          'Turning subtle error messages, timing differences, or missing curve validation into full private-key recovery or decryption oracles.',
        mechanics:
          'Bleichenbacher’s 1998 attack uses 1-bit PKCS#1 v1.5 padding validity feedback to decrypt RSA ciphertexts via adaptive interval narrowing. CBC padding oracles decrypt TLS/web tokens byte-by-byte. Invalid-curve attacks feed a point on a weak twist/unrelated curve to leak static ECDH secret scalars mod small subgroups.',
        siliconAndRtlLink:
          'Hardware PKA drivers must validate `0 < x, y < p` and verify the curve equation `y^2 == x^3 + ax + b (mod p)` in hardware before executing scalar multiplication.',
        attackAndDefense:
          'Use RSA-OAEP / implicit rejection, AEAD instead of unauthenticated CBC, and safe curves (`X25519` twist-secure ladders) with point validation.',
      },
      {
        id: 'atk-re',
        title: 'Reverse Engineering of Crypto Binaries & Hardware Netlists',
        summary:
          'Extracting proprietary keys, custom algorithms, and FSM state machines from firmware binaries and delayered silicon dies.',
        mechanics:
          'Binary RE (Ghidra, IDA, Frida) scans for S-Box constants (`0x63, 0x7c, 0x77...`), SHA-256 initial hashes (`0x6a09e667`), or Kyber modulus `3329`. Hardware RE de-processes silicon metal/poly layers via SEM imaging, reconstructs standard-cell netlists, and extracts masked ROM bits optically.',
        siliconAndRtlLink:
          'Automated netlist RE identifies structural sub-circuits (carry chains, LFSRs, S-Box LUTs) directly from extracted gate graphs.',
        attackAndDefense:
          'Never rely on "security by obscurity" or hardcoded keys in Mask ROM/firmware; use standard audited algorithms, OTP-fused unique device keys, and logic locking / active tamper meshes only as defense-in-depth.',
      },
      {
        id: 'atk-whitebox',
        title: 'White-Box Cryptography Attacks (DCA, BGE, Algebraic Extraction)',
        summary:
          'Why hiding symmetric keys inside obfuscated lookup-table networks fails against Differential Computation Analysis (DCA).',
        mechanics:
          'White-box AES embeds the key into giant encoded T-tables/bijections for DRM/mobile apps where attackers control the CPU. Differential Computation Analysis (DCA) traces memory read/write addresses in QEMU/Pin and runs standard CPA directly on software execution traces—breaking encoded tables without even reverse engineering the encoding!',
        siliconAndRtlLink:
          'Demonstrates fundamentally why software-only key hiding cannot replace a real hardware root of trust (TEE / Secure Element / HSM).',
        attackAndDefense:
          'Move long-term keys out of untrusted user-space memory into hardware-isolated Secure Elements or TEEs; treat white-box software strictly as short-lived obfuscation.',
      },
    ],
  },
  {
    id: 'ch8-pqc',
    number: 8,
    title: 'Post-Quantum Cryptography (PQC)',
    stratumId: 'pqc-agility',
    stackLayerLabel: 'Stratum 6 · Lattice/Hash/Code Math, NIST 2026 Standards & NTT Silicon',
    vlsiPerspective:
      'Post-Quantum Cryptography fundamentally reshapes crypto silicon: large 2048-bit RSA integer multipliers give way to 256-point Number Theoretic Transform (NTT) polynomial butterfly engines (`q=3329` / `q=8380417`), high-throughput Keccak/SHAKE128/256 matrix expanders, and fresh side-channel masking challenges across arithmetic-to-boolean share conversions.',
    keyTakeaway:
      'ML-KEM (FIPS 203), ML-DSA (FIPS 204), SLH-DSA (FIPS 205), FN-DSA (FIPS 206), and backup KEM HQC define the 2026 PQC silicon roadmap.',
    subtopics: [
      {
        id: 'pqc-lattice-problems',
        title: 'Core Hard Problems: Lattice Problems (SVP, CVP, LWE, Ring-LWE, Module-LWE, NTRU)',
        summary:
          'High-dimensional Euclidean lattices where finding short vectors or solving noisy linear equations resists known quantum algorithms.',
        mechanics:
          'Shortest Vector Problem (SVP) asks for the shortest nonzero lattice vector in n ~ 500–1000 dimensions. Learning With Errors (LWE) hides secret s in b = A·s + e (mod q) with small noise e. Ring-LWE adds algebraic structure over R_q = Z_q[X]/(X^n+1) for compact keys; Module-LWE uses small k×k matrices of R_q polynomials to scale security levels cleanly without changing ring size n=256.',
        siliconAndRtlLink:
          'Module-LWE lets one reusable n=256 NTT hardware butterfly core serve ML-KEM-512 (k=2), ML-KEM-768 (k=3), and ML-KEM-1024 (k=4), plus ML-DSA-44/65/87.',
        attackAndDefense:
          'Careful modulus/noise selection prevents algebraic subfield attacks; Fujisaki-Okamoto (FO) transform converts IND-CPA LWE encryption into IND-CCA2 KEMs—making re-encryption comparison a prime side-channel target.',
      },
      {
        id: 'pqc-code-based',
        title: 'Core Hard Problems: Code-Based Cryptography (Syndrome Decoding, McEliece, HQC, BIKE)',
        summary:
          'Decoding random linear error-correcting codes over GF(2) (NP-hard Syndrome Decoding) for conservative non-lattice KEM diversity.',
        mechanics:
          'Classic McEliece hides a binary Goppa code generator matrix using a secret permutation/scrambler; ciphertexts are tiny (96 bytes) while public keys are huge (~261 KB–1.3 MB). Quasi-cyclic codes (HQC, BIKE) shrink public keys to ~2 KB using structured circulant polynomials over GF(2)[X]/(X^r - 1).',
        siliconAndRtlLink:
          'HQC/BIKE replace modular integer NTTs with carry-free GF(2) polynomial multipliers (via `PCLMULQDQ` / hardware Karatsuba XOR arrays) + constant-time BCH/Reed-Muller or Bit-Flipping decoders.',
        attackAndDefense:
          'Decoding failures (DFR) in QC-MDPC codes (BIKE) or timing leaks in error-locator polynomials leak secret parity-check structure—requiring strict DFR < 2^-128 and constant-time decoders.',
      },
      {
        id: 'pqc-hash-mq-isogeny',
        title: 'Hash-Based Signatures (OTS/FTS/Stateful/Stateless), Multivariate Quadratic & Isogenies',
        summary:
          'Post-quantum signature families resting purely on hash collision/preimage resistance, MQ systems, or elliptic-curve isogeny graphs.',
        mechanics:
          'Hash-based: Lamport/WOTS+ (One-Time Signatures), FORS (Few-Time Signatures), XMSS/LMS (stateful Merkle trees—catastrophic if state counter rolls back!), and SPHINCS+/SLH-DSA (stateless hypertrees). Multivariate Quadratic (UOV/MAYO) solves nonlinear quadratic polynomials over finite fields. Isogenies (SIDH/SIKE broken in 2022 via Castryck-Decru auxiliary-point torsion attacks; active research continues on CSIDH/SQIsign without torsion points).',
        siliconAndRtlLink:
          'XMSS/LMS are ideal for low-gate Boot ROM firmware signature verification (tiny verifier, fast SHA-256). SLH-DSA stresses SHAKE/SHA-256 pipelines due to tens of thousands of hash calls per signature.',
        attackAndDefense:
          'Never deploy stateful XMSS/LMS without monotonic NVM counters (flash rollback = total key compromise); avoid SIDH/SIKE.',
      },
      {
        id: 'pqc-ml-kem',
        title: 'NIST FIPS 203: ML-KEM (Kyber — Module-LWE KEM)',
        summary:
          'Standardized primary post-quantum Key Encapsulation Mechanism across ML-KEM-512, 768, and 1024 parameter sets.',
        mechanics:
          'Works over R_q = Z_{3329}[X]/(X^{256}+1). KeyGen expands public matrix A via SHAKE128, samples small secret s and error e from Centered Binomial Distribution (CBD), and computes t = NTT(A)·NTT(s) + NTT(e). Encaps uses FO transform + CBD noise + compress/decompress; Decaps decrypts and re-encrypts to verify ciphertext integrity with implicit rejection.',
        siliconAndRtlLink:
          'Needs 256x12-bit SRAM polynomial buffers, Barrett/Montgomery reduction mod 3329, and parallel Keccak-f[1600] SHAKE cores.',
        attackAndDefense:
          'Decapsulation re-encryption failure comparison MUST be constant-time and masked; single-trace EM/power templates can otherwise extract secret s during `INTT(s^T * u)` or message decoding.',
      },
      {
        id: 'pqc-ml-dsa',
        title: 'NIST FIPS 204: ML-DSA (Dilithium — Module-LWE Fiat-Shamir Signature)',
        summary:
          'Standardized primary post-quantum digital signature using Fiat-Shamir with Aborts over Z_{8380417}[X]/(X^{256}+1).',
        mechanics:
          'Prover commits w = A·y, derives challenge c = H(mu || w_1), and computes response z = y + c·s. To prevent z from leaking secret s, signing executes rejection sampling: if ||z||_inf >= gamma_1 - beta or hint/low-bits fail bounds, abort and retry with fresh nonce y.',
        siliconAndRtlLink:
          'Uses 23-bit modulus q = 8,380,417 (2^23 - 2^13 + 1), requiring wider 24-bit NTT butterflies and fast SHAKE256 rejection-loop streaming.',
        attackAndDefense:
          'Abort/rejection count or single-bit leaks in nonce y allow Lattice/HNP key recovery; fault-skipping the rejection norm check (`||z||_inf`) directly exposes s!',
      },
      {
        id: 'pqc-falcon-sphincs-alt',
        title: 'NIST Schemes: Falcon (FN-DSA / FIPS 206), SPHINCS+ (SLH-DSA / FIPS 205), Backup KEMs (HQC, McEliece, BIKE) & Hybrids',
        summary:
          'Complete 2026 PQC ecosystem: compact NTRU signatures, ultra-conservative stateless hashes, non-lattice backup KEMs, and classical+PQC hybrids.',
        mechanics:
          'FN-DSA (Falcon) achieves tiny 666-byte signatures over NTRU lattices using FFT + discrete Gaussian sampling over IEEE 754 doubles. SLH-DSA (FIPS 205) relies solely on hash security with 32B public keys and ~7.8–49KB signatures. In 2025, NIST selected HQC as the standardized non-lattice backup KEM alongside Classic McEliece & BIKE evaluations. Hybrid KEMs (e.g., X25519MLKEM768) combine classical ECDHE + ML-KEM shared secrets inside HKDF.',
        siliconAndRtlLink:
          'Falcon’s IEEE 754 FP64 discrete Gaussian sampler is notoriously expensive on bare-metal MCUs without double-precision FPUs and extremely hard to mask against side channels; SLH-DSA needs zero NTT multipliers—just fast pipelined SHA/SHAKE.',
        attackAndDefense:
          'Hybrids protect against both immediate quantum harvest-now-decrypt-later AND unforeseen mathematical breaks in new lattice assumptions.',
      },
      {
        id: 'pqc-ntt-math',
        title: 'PQC Implementation: Number Theoretic Transform (NTT) & Polynomial Arithmetic',
        summary:
          'Transforming O(n^2) polynomial multiplication in Z_q[X]/(X^{256}+1) into O(n log n) pointwise vector products.',
        mechanics:
          'Using a primitive 2n-th (or n-th) root of unity zeta in Z_q, negacyclic convolution mod (X^256+1) splits recursively via Cooley-Tukey butterflies `(a + zeta*b, a - zeta*b)` for forward NTT and Gentleman-Sande butterflies for inverse NTT, eliminating explicit X^n reduction.',
        siliconAndRtlLink:
          'Unified butterfly PEs (`a +/- b*zeta mod q`) with ping-pong dual-port SRAM banks compute a 256-point ML-KEM NTT in 128 * 7 = 896 cycles (1 PE) or < 128 cycles (multi-PE SIMD).',
        attackAndDefense:
          'Because NTT processes secret polynomials s in ML-KEM/ML-DSA, power/EM leakage on butterfly twiddle multiplications `(b * zeta)` can recover s in a single trace if unmasked.',
        codeSnippet: {
          title: 'ntt_butterfly_q3329.sv',
          language: 'SystemVerilog',
          code: `// Unified Cooley-Tukey / Gentleman-Sande Butterfly PE for ML-KEM (q = 3329)
module mlkem_ntt_butterfly #(
  parameter int Q = 12'd3329
) (
  input  logic        clk,
  input  logic        inv_mode, // 0 = Cooley-Tukey (Fwd), 1 = Gentleman-Sande (Inv)
  input  logic [11:0] a_in,
  input  logic [11:0] b_in,
  input  logic [11:0] zeta,
  output logic [11:0] a_out,
  output logic [11:0] b_out
);
  // Modular Barrett reduction helper omitted for brevity; shown combinational flow
  logic [23:0] prod;
  logic [11:0] diff_mod, sum_mod, b_zeta;

  always_comb begin
    sum_mod  = (a_in + b_in >= Q) ? (a_in + b_in - Q) : (a_in + b_in);
    diff_mod = (a_in >= b_in)     ? (a_in - b_in)     : (a_in + Q - b_in);
    b_zeta   = (b_in * zeta) % Q; // Replace % Q with Barrett/Montgomery in synthesis

    if (!inv_mode) begin
      a_out = (a_in + b_zeta >= Q) ? (a_in + b_zeta - Q) : (a_in + b_zeta);
      b_out = (a_in >= b_zeta)     ? (a_in - b_zeta)     : (a_in + Q - b_zeta);
    end else begin
      a_out = sum_mod;
      b_out = (diff_mod * zeta) % Q;
    end
  end
endmodule`,
        },
      },
      {
        id: 'pqc-sampling-compression',
        title: 'PQC Implementation: Error Distribution Sampling & Vector Compression',
        summary:
          'Constant-time Centered Binomial Distribution (CBD) vs. Gaussian samplers, plus lossy coefficient compression/decompression.',
        mechanics:
          'ML-KEM replaces tricky discrete Gaussians with Centered Binomial Sampling `CBD_eta`: summing eta random bits from SHAKE256 and subtracting the sum of the next eta bits. Compression rounds coefficients `(round((2^d / q) * x)) mod 2^d` to shrink ciphertext sizes without breaking decryption noise margins.',
        siliconAndRtlLink:
          'CBD_eta=2/3 maps to tiny popcount adder trees fed straight from Keccak squeeze registers; compression avoids hardware division by using constant multiplication + bit-shift (`((x << d) + q/2) * mult_const >> shift`).',
        attackAndDefense:
          'Rejection sampling loops in matrix generation `Parse(SHAKE128)` process public matrix A (safe to branch), whereas sampling secret noise s, e, y MUST be strictly branchless and free of table-lookup timing leaks.',
      },
      {
        id: 'pqc-hw-masking-migration',
        title: 'Constant-Time PQC, Hardware Acceleration, Side-Channel Masking & Migration',
        summary:
          'Protecting PQC chips against SCA/faults (A2B/B2A masking) and migrating TLS, PKI, and firmware at scale.',
        mechanics:
          'Unlike AES (purely GF(2^8) Boolean), ML-KEM/ML-DSA mix arithmetic mod q (NTT) with Boolean/bit ops (SHAKE256, CBD, compression)—requiring expensive Arithmetic-to-Boolean (A2B) and Boolean-to-Arithmetic (B2A) share conversions in masked silicon. Migration uses hybrid TLS key exchange (`X25519MLKEM768`), dual-signed or PQC root firmware, and packet-size tuning for >1KB keys.',
        siliconAndRtlLink:
          'Modern RoT chips embed shared Keccak + NTT + PKA accelerators; masked ML-KEM hardware doubles/triples memory bandwidth due to share storage.',
        attackAndDefense:
          'Single-trace template attacks against unmasked Kyber `INTT` and FO re-encryption have succeeded on ARM Cortex-M4; always deploy shuffling + arithmetic/Boolean masking on embedded PQC.',
      },
    ],
  },
  {
    id: 'ch9-advanced',
    number: 9,
    title: 'Advanced / Systems-Level Topics',
    stratumId: 'pqc-agility',
    stackLayerLabel: 'Stratum 6 · Quantum Threat, Crypto Agility & Formal Foundations',
    vlsiPerspective:
      'Long-lived silicon (automotive, satellite, industrial, data-center RoTs with 10–25 year lifetimes) cannot simply "patch" Mask ROM or eFuses post-tapeout. Architects must engineer crypto agility, hybrid/PQC secure boot, and quantum-era threat models right into silicon.',
    keyTakeaway:
      'Harvest-Now-Decrypt-Later (HNDL) makes PQC key-exchange deployment urgent today, while immutable Boot ROM needs PQC verification from day one.',
    subtopics: [
      {
        id: 'adv-quantum',
        title: 'Quantum Computing Threat Model (Shor’s & Grover’s Algorithms)',
        summary:
          'How fault-tolerant quantum computers break factoring/discrete-log exponentially (Shor) while only quadratically speeding up symmetric search (Grover).',
        mechanics:
          'Shor’s algorithm uses Quantum Fourier Transform (QFT) period-finding in O((log N)^3) gates to break RSA, DH, ECDH, and ECDSA completely. Grover’s algorithm searches an unstructured space of size 2^k in O(2^(k/2)) sequential queries—reducing AES-128 to ~2^64 quantum queries (mitigated simply by doubling symmetric keys to AES-256 and 256-bit hashes).',
        siliconAndRtlLink:
          'Upgrading symmetric silicon from AES-128 to AES-256 adds only 4 extra cipher rounds (~40% latency) and negligible area—whereas replacing RSA/ECC PKA macros requires entirely new NTT/Keccak architectures.',
        attackAndDefense:
          'Harvest-Now-Decrypt-Later (HNDL): adversaries record encrypted classical TLS traffic today to decrypt once CRQCs (Cryptographically Relevant Quantum Computers) arrive—prioritizing immediate ML-KEM key-exchange migration.',
      },
      {
        id: 'adv-pq-protocols',
        title: 'Quantum-Resistant Protocol Design (TLS 1.3, IKEv2, SSH, KEMTLS)',
        summary:
          'Redesigning handshake state machines for larger PQC keys, KEM-based authentication (KEMTLS), and replay/downgrade resistance.',
        mechanics:
          'Classical TLS authenticates via signatures; KEMTLS replaces handshake signatures with ephemeral+static KEM encapsulations, cutting handshake bandwidth when using large PQC signatures. Protocols must avoid fragmentation deadlocks and preserve downgrade binding across hybrid suites.',
        siliconAndRtlLink:
          'Hardware TLS offload engines need larger scatter-gather DMA descriptor buffers to handle 3–15 KB PQC handshake transcripts.',
        attackAndDefense:
          'Prevent protocol downgrade via explicit transcript hashing and deprecate weak classical fallback cipher suites in policy engines.',
      },
      {
        id: 'adv-mpc-zk',
        title: 'Secure Multi-Party Computation & Advanced ZK (ZK-SNARKs / ZK-STARKs)',
        summary:
          'Verifiable succinct proofs (Groth16, PLONK, STARKs) and threshold/MPC signing across distributed silicon enclaves.',
        mechanics:
          'ZK-SNARKs compress millions of computation constraints (R1CS/Plonkish) into ~200-byte pairings-based proofs (quantum-vulnerable due to elliptic curve pairings). ZK-STARKs use FRI low-degree testing over hash functions and Reed-Solomon codes—making STARKs post-quantum secure and transparent (no trusted setup), at larger ~50-100 KB proof sizes.',
        siliconAndRtlLink:
          'Specialized ZKP ASICs/FPGAs accelerate 256-bit/384-bit Multi-Scalar Multiplication (MSM) and 2^20-point NTTs over Goldilocks/BabyBear fields—sharing silicon primitives with PQC.',
        attackAndDefense:
          'Under-constrained arithmetic circuits ("soundness bugs") let malicious provers mint fake proofs; formal constraint auditing is critical.',
      },
      {
        id: 'adv-agility',
        title: 'Crypto Agility & Long-Term Key Management',
        summary:
          'Architecting silicon, firmware, and PKI so algorithms, key sizes, and hash functions can be rotated seamlessly without bricking devices.',
        mechanics:
          'Decouple protocol identifiers (`AlgID`, OIDs, hybrid combiners) from hardwired assumptions; version CSR/HJSON descriptors; support dual-algorithm certificate chains and zero-downtime key rotation.',
        siliconAndRtlLink:
          'In ASICs, avoid hardcoding a single monolithic signature verifier in immutable Mask ROM without key-revocation OTP slots or extensible ROM_EXT chaining.',
        attackAndDefense:
          'Crypto agility poorly implemented enables rollback/downgrade attacks—enforce monotonic minimum-security policy registers in OTP.',
      },
      {
        id: 'adv-rot-pqc-boot',
        title: 'Hardware Root of Trust + PQC Secure Boot',
        summary:
          'Anchoring 15-year silicon lifecycles with immutable hash-based (SLH-DSA/LMS/XMSS) or ML-DSA verification inside Mask ROM.',
        mechanics:
          'Because firmware updates happen over decades, signature algorithms protecting Boot ROM -> ROM_EXT must survive quantum computers. Stateful hash-based verification (LMS/XMSS) or stateless ML-DSA-65/87 require minimal ROM verifier code (SHA-256 / SHAKE256 + NTT) and OTP public-key hashes.',
        siliconAndRtlLink:
          'Open-source silicon RoTs (OpenTitan / Caliptra) integrate hardware SHA-3/KMAC + LMS/ML-DSA verification early in Mask ROM before releasing main CPU cores from reset.',
        attackAndDefense:
          'Protect Boot ROM signature checks with dual-rail fault-hardened comparisons and multiple OTP key-slot revocation fuses.',
      },
      {
        id: 'adv-proofs',
        title: 'Formal Security Proofs (Game-Hopping & Reductionist Security)',
        summary:
          'Bridging mathematical hardness assumptions to real-world protocol security via indistinguishable game sequences.',
        mechanics:
          'Game-hopping transforms the real security experiment G_0 step-by-step (G_0 -> G_1 -> ... -> G_k) where each hop changes adversary advantage by a negligible statistical bound (PRF switching, ROM programming) until G_k reduces directly to breaking LWE/CDH.',
        siliconAndRtlLink:
          'Formal proof bounds dictate concrete parameter choices (e.g., QROM vs ROM security margins in ML-KEM FO transform).',
        attackAndDefense:
          'Many broken schemes failed due to invalid reduction steps (e.g., forgetting multi-user bounds or loose QROM rewinding losses) or violating model assumptions (nonce reuse, side channels) in real hardware.',
      },
      {
        id: 'adv-standards',
        title: 'Standardization Process (NIST, IETF, ETSI, ISO)',
        summary:
          'How cryptographic algorithms move from public cryptanalysis competitions to globally interoperable silicon & network standards.',
        mechanics:
          'NIST runs open multi-round evaluations (AES, SHA-3, PQC 2016–2026: FIPS 203/204/205/206 + HQC backup). IETF standardizes wire encodings (TLS 1.3, X.509, SSH, IKEv2). ETSI/CYBER and ISO/IEC JTC 1/SC 27 harmonize global compliance and hardware evaluation criteria.',
        siliconAndRtlLink:
          'Silicon tapeouts take 18–36 months, requiring RTL teams to track final FIPS test vectors (ACVP KATs) closely to prevent silicon respins.',
        attackAndDefense:
          'Never tape out draft algorithms with mutable padding/domain-separation constants in non-programmable Mask ROM.',
      },
    ],
  },
  {
    id: 'ch10-mastery',
    number: 10,
    title: 'Practical Mastery Path (Recommended Order)',
    stratumId: 'pqc-agility',
    stackLayerLabel: 'Stratum 7 · 7-Stage Silicon-to-PQC Engineering Roadmap',
    vlsiPerspective:
      'True mastery comes from building and breaking every layer yourself: write branchless C & SystemVerilog, synthesize gates, capture real/simulated power traces, break naive RSA/AES, and implement a constant-time NTT + PQC Root-of-Trust flow.',
    keyTakeaway:
      'Follow the 7 sequential stages below—use the interactive Mastery Tracker tab above to check off milestones and launch linked labs.',
    subtopics: [
      {
        id: 'path-stage1',
        title: 'Stage 1: Math Foundations + Digital Logic + C / Assembly',
        summary:
          'Build fluency in modular arithmetic, GF(2^n), combinational/sequential RTL, and branchless C/assembly.',
        mechanics:
          'Implement Extended GCD, CRT, and GF(2^8) multiplication in C without branches; design a parameterized SystemVerilog modular adder/register file and inspect generated assembly with `objdump`.',
        siliconAndRtlLink:
          'Understand carry chains vs. XOR trees, setup/hold windows, and compiler register allocation.',
        attackAndDefense:
          'Verify your C code contains zero secret-dependent `Jcc` jumps or memory loads.',
        atlasLinks: [
          { label: 'RTL Design 14 Modules', kind: 'view', targetId: 'rtl-design' },
        ],
      },
      {
        id: 'path-stage2',
        title: 'Stage 2: Classical Symmetric + Hash + AEAD',
        summary:
          'Master AES internals (SubBytes/ShiftRows/MixColumns/AddRoundKey), ChaCha20, SHA-2/Keccak, HMAC, and AES-GCM.',
        mechanics:
          'Trace FIPS-197 AES-128 state matrices round by round, build a bit-sliced AES or ChaCha20-Poly1305 AEAD wrapper, and trace Keccak-f[1600] sponge absorption.',
        siliconAndRtlLink:
          'Compare pipelined vs. iterative folded AES datapaths and GF(2^8) tower-field S-Boxes.',
        attackAndDefense:
          'Reproduce ECB pattern leakage, GCM nonce-reuse GHASH key recovery, and HMAC early-exit timing leaks.',
        atlasLinks: [
          { label: 'AES 7-Chapter Lab', kind: 'view', targetId: 'aes-deep-dive' },
        ],
      },
      {
        id: 'path-stage3',
        title: 'Stage 3: RSA + ECC + Protocols (TLS 1.3 & PKI)',
        summary:
          'Implement Montgomery multiplication, X25519 Montgomery ladder, HKDF, DRBG health checks, and trace TLS 1.3 handshakes.',
        mechanics:
          'Walk through RSA-OAEP/PSS, Ed25519 signing, X.509 certificate chain validation, and TLS 1.3 Early/Handshake/App key schedule.',
        siliconAndRtlLink:
          'Explore how wide-word PKA coprocessors (like OpenTitan OTBN) execute 256-bit ECC cleanly.',
        attackAndDefense:
          'Demonstrate Bleichenbacher / padding oracle vulnerabilities and ECDSA nonce-reuse key recovery.',
      },
      {
        id: 'path-stage4',
        title: 'Stage 4: Side-Channel & Implementation Attacks',
        summary:
          'Reverse engineer implementations via CPA/DPA power traces, fault injection, and cache timing attacks.',
        mechanics:
          'Execute a Correlation Power Analysis (CPA) attack against an unmasked software/hardware AES S-Box, simulate a Flush+Reload cache attack, and apply Welch’s t-test (TVLA).',
        siliconAndRtlLink:
          'Connect Hamming-weight CMOS switching current to DOM 2-share masking and sparse FSM fault traps.',
        attackAndDefense:
          'Harden an AES S-Box with 1st-order DOM masking and verify TVLA |t| < 4.5.',
      },
      {
        id: 'path-stage5',
        title: 'Stage 5: Lattice Math + Kyber (ML-KEM) / Dilithium (ML-DSA) Internals',
        summary:
          'Master Module-LWE over R_q, Cooley-Tukey / Gentleman-Sande NTT, CBD sampling, and Fujisaki-Okamoto CCA2 transform.',
        mechanics:
          'Trace a full 256-point NTT mod 3329, implement ML-KEM KeyGen/Encaps/Decaps and ML-DSA Fiat-Shamir with Aborts, and benchmark key/signature footprints.',
        siliconAndRtlLink:
          'Design a unified Barrett-reduced NTT butterfly PE in SystemVerilog with dual-port coefficient SRAM.',
        attackAndDefense:
          'Audit FO re-encryption constant-time comparison and Dilithium rejection sampling abort leaks.',
      },
      {
        id: 'path-stage6',
        title: 'Stage 6: Hardware Acceleration & Constant-Time PQC',
        summary:
          'Optimize Keccak + NTT silicon pipelines, A2B/B2A masking, and formal constant-time/probing verification.',
        mechanics:
          'Co-design SHAKE128/256 streaming into NTT coefficient memories, add arithmetic/Boolean masking shares, and run formal constant-time checks.',
        siliconAndRtlLink:
          'Balance clock-domain crossings (EDN/TRNG -> NTT/AES), TL-UL bus integrity, and synthesis `dont_touch` rules.',
        attackAndDefense:
          'Verify masked PQC pipelines against single-trace template attacks and synthesis share-merging.',
        atlasLinks: [
          { label: 'Clock Domain Analyzer', kind: 'view', targetId: 'cdc-analyzer' },
        ],
      },
      {
        id: 'path-stage7',
        title: 'Stage 7: Full System — Secure Boot -> PQC TLS -> Side-Channel Hardened Silicon',
        summary:
          'Integrate the complete vertical stack from immutable Mask ROM & OTP fuses through hybrid PQC TLS on tamper-hardened hardware.',
        mechanics:
          'Boot an authenticated SoC from Mask ROM using LMS/ML-DSA verification, unlock DICE device keys in KeyMgr, negotiate X25519MLKEM768 TLS 1.3, and stream AES-256-GCM over hardened hardware accelerators.',
        siliconAndRtlLink:
          'Trace end-to-end SoC lifecycle states, alert handlers, memory scrambling, and FIPS/CC crypto boundaries.',
        attackAndDefense:
          'Conduct red-team fault + EM + protocol downgrade reviews across the integrated silicon-to-cloud boundary.',
        atlasLinks: [
          { label: 'OpenTitan AES RTL', kind: 'ip', targetId: 'opentitan-aes' },
          { label: 'TL-UL Integrity Protocol', kind: 'protocol', targetId: 'tl-ul' },
        ],
      },
    ],
  },
];
