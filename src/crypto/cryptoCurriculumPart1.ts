import type { CryptoChapter } from './cryptoCurriculumTypes';

export const CRYPTO_CHAPTERS_PART1: CryptoChapter[] = [
  {
    id: 'ch1-math',
    number: 1,
    title: 'Foundational Mathematics',
    stratumId: 'silicon-physics',
    stackLayerLabel: 'Stratum 0 · Mathematical Substrate',
    vlsiPerspective:
      'Every cryptographic hardware accelerator—from an AES S-Box inverter in GF(2^8) to an ML-KEM Number Theoretic Transform butterfly in Z_3329—is a physical CMOS realization of algebraic structures. Understanding field arithmetic directly determines gate count, critical-path carry chains, and side-channel masking linearity.',
    keyTakeaway:
      'Number theory and finite-field algebra dictate datapath width, carry-free XOR vs. carry-propagating modular multipliers, and provable security reductions.',
    subtopics: [
      {
        id: 'math-discrete',
        title: 'Discrete Mathematics (Sets, Relations, Functions, Logic, Proofs)',
        summary:
          'Formal sets, bijections, equivalence relations, Boolean predicates, and proof techniques (induction, contradiction, pigeonhole principle) form the backbone of protocol correctness and RTL equivalence.',
        mechanics:
          'Cryptographic primitives are deterministic or keyed bijections over finite bit-strings {0,1}^n. Equivalence classes modulo n partition integers into residue classes, while proof by induction establishes loop invariants across n-round Feistel/SPN structures and multi-cycle FSMs.',
        siliconAndRtlLink:
          'Boolean predicates map directly to combinational LUTs/standard cells; bijectivity guarantees lossless decryption and enables reversible gate-level formal equivalence checking (LEC) between RTL and netlist.',
        attackAndDefense:
          'Collisions (pigeonhole principle) bound hash security via the birthday paradox (~2^(n/2) work). Formal invariants prevent unreachable FSM states and illegal bus protocol transitions.',
      },
      {
        id: 'math-number-theory',
        title: 'Number Theory (Modular Arithmetic, Primes, GCD, Extended Euclidean, Totient, CRT, Quadratic Residues)',
        summary:
          'Integer arithmetic modulo n, prime distribution, gcd(a,b), Extended Euclidean modular inverses, Euler’s totient phi(n), Chinese Remainder Theorem (CRT), and Legendre/Jacobi quadratic residues.',
        mechanics:
          'For gcd(a,m)=1, Bezout’s identity a·s + m·t = 1 yields a^-1 mod m in O(log m) steps. Euler’s theorem states a^phi(n) === 1 (mod n) for gcd(a,n)=1. CRT maps arithmetic mod N = p·q into independent channels mod p and mod q, cutting RSA exponentiation cost by ~4x.',
        siliconAndRtlLink:
          'Hardware PKA (Public-Key Accelerator) engines replace costly division with Montgomery modular multiplication (replacing mod N with power-of-2 shifts) and binary Extended GCD state machines using shift-and-subtract.',
        attackAndDefense:
          'Bellcore attack: a single transient voltage/clock fault during one CRT branch (mod p or mod q) leaks prime p via gcd(sig_fault - sig_valid, N). Defense: infective CRT or verify-after-sign in hardware.',
        codeSnippet: {
          title: 'montgomery_mul_step.sv',
          language: 'SystemVerilog',
          code: `// Constant-time radix-2^W Montgomery reduction core concept
// Computes R^-1 * (A * B) mod N without variable-time division
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) begin
    acc <= '0;
  end else if (step_en) begin
    // q_i = (acc[0] ^ (a_bit & b[0])) ensures LSB becomes 0 before >> 1
    logic m_bit;
    m_bit = acc[0] ^ (a_shift[0] & b_reg[0]);
    acc   <= (acc + (a_shift[0] ? b_reg : '0) + (m_bit ? mod_n : '0)) >> 1;
  end
end`,
        },
      },
      {
        id: 'math-abstract-algebra',
        title: 'Abstract Algebra (Groups, Rings, Fields, GF(p), GF(2^n), Polynomial Arithmetic)',
        summary:
          'Algebraic structures with 1 or 2 operations: cyclic groups (Diffie-Hellman), polynomial rings R_q = Z_q[X]/(X^n+1) (PQC lattices), prime fields GF(p), and binary extension fields GF(2^n).',
        mechanics:
          'In GF(2^n), addition is bitwise XOR (carry-free), and multiplication is polynomial multiplication modulo an irreducible polynomial (e.g., x^8 + x^4 + x^3 + x + 1 in AES). In GF(p), operations require carry-handling integer arithmetic mod prime p.',
        siliconAndRtlLink:
          'GF(2^8) tower-field decomposition (mapping GF(2^8) -> GF(((2^2)^2)^2)) shrinks an AES S-Box from a 256x8 ROM into ~180 combinational NAND/XOR gates—essential for low-area DOM side-channel masking.',
        attackAndDefense:
          'Small-subgroup confinement attacks exploit non-prime-order groups. Use safe primes or prime-order subgroups (e.g., Ristretto255) and validate curve points on load.',
        atlasLinks: [
          { label: 'AES GF(2^8) & DOM S-Box Lab', kind: 'view', targetId: 'aes-deep-dive' },
          { label: 'OpenTitan AES RTL IP', kind: 'ip', targetId: 'opentitan-aes' },
        ],
      },
      {
        id: 'math-linear-algebra',
        title: 'Linear Algebra (Vectors, Matrices, Gaussian Elimination, Vector Spaces over Finite Fields)',
        summary:
          'Matrix-vector operations, rank, nullspace, Gaussian elimination, and lattices over Z_q or GF(2).',
        mechanics:
          'MixColumns in AES is an MDS matrix multiplication over GF(2^8)^4 maximizing branch number (5). In Module-LWE (ML-KEM / ML-DSA), public keys are noisy linear systems t = A·s + e over ring R_q^{k×k}.',
        siliconAndRtlLink:
          'Vector/matrix operations translate into parallel MAC arrays, systolic meshes, or butterfly networks. Over GF(2), linear layers compile purely to shallow XOR trees with minimal critical path delay.',
        attackAndDefense:
          'Naive linear schemes without noise (or with leaked nonces in ECDSA) collapse immediately via Gaussian elimination or LLL lattice basis reduction (e.g., Hidden Number Problem on biased nonces).',
      },
      {
        id: 'math-probability',
        title: 'Probability & Statistics (Distributions, Entropy, Statistical Distance, Distinguishing Advantage)',
        summary:
          'Uniform vs. discrete Gaussian / centered binomial distributions, min-entropy, total variation distance, and adversary distinguishing advantage.',
        mechanics:
          'Cryptographic IND-CPA security demands that an efficient adversary cannot distinguish E(m_0) from E(m_1) with probability > 1/2 + negl(lambda). Min-entropy H_inf = -log2(max p_i) bounds worst-case key predictability.',
        siliconAndRtlLink:
          'Hardware TRNGs use ring-oscillator jitter or metastable latches followed by cryptographic conditioning (SHA-256 / KMAC) to compress raw physical bias into near-uniform bitstreams passing NIST SP 800-90B health tests.',
        attackAndDefense:
          'Correlation Power Analysis (CPA) uses Pearson correlation across thousands of power traces; Welch’s t-test (TVLA |t| > 4.5) statistically detects first-order side-channel leakage on silicon.',
      },
      {
        id: 'math-complexity',
        title: 'Complexity Theory (P, NP, Reductions, One-Way Functions, Hard Problems)',
        summary:
          'Polynomial-time computation (P), verifiable witnesses (NP), security reductions, one-way functions (OWFs), and trapdoor permutations.',
        mechanics:
          'Security reductions prove that breaking a cryptosystem is at least as hard as solving a conjectured intractable problem (Factoring, ECDLP, LWE, or Syndrome Decoding) in probabilistic polynomial time (PPT).',
        siliconAndRtlLink:
          'Asymptotic security parameters (lambda = 128, 192, 256) dictate silicon datapath bit-widths: 256-bit ECC vs. 2048/3072-bit RSA vs. k=2,3,4 polynomial modules in ML-KEM.',
        attackAndDefense:
          'Time-memory tradeoffs (Hellman tables, rainbow tables) and multi-target attacks shrink effective key bits unless unique per-device/per-session salts or nonces are injected.',
      },
      {
        id: 'math-info-theory',
        title: 'Information Theory (Shannon Entropy, Mutual Information, Channel Capacity)',
        summary:
          'Entropy H(X), conditional entropy H(X|Y), mutual information I(X;Y), and noisy channel limits applied to secrecy and side-channel leakage.',
        mechanics:
          'Shannon entropy H(X) = -sum p(x) log2 p(x) measures average uncertainty. In side-channel evaluation, Mutual Information Analysis (MIA) quantifies I(K; L) between secret key K and physical leakage trace L without assuming a linear Hamming-weight model.',
        siliconAndRtlLink:
          'Dual-rail precharge logic and SRAM/PUF helper data (fuzzy extractors) manage physical entropy: helper data leaks bounded bits I(Secret; Helper), requiring min-entropy margin in PUF enrollment.',
        attackAndDefense:
          'Zero mutual information I(M; C) = 0 defines perfect secrecy; minimizing I(Key; Power/EM) is the formal goal of masked hardware design.',
      },
    ],
  },
  {
    id: 'ch2-hardware',
    number: 2,
    title: 'Computer & Hardware Fundamentals (VLSI / Semiconductor Core)',
    stratumId: 'gates-rtl',
    stackLayerLabel: 'Stratum 1 · Silicon, CMOS & Microarchitecture',
    vlsiPerspective:
      'Software abstractions vanish at the transistor level. Every 0->1 transition charges a load capacitance C_L, radiating EM fields and drawing current from the power grid—turning microarchitectural optimizations (caches, speculation, clock gating) into physical leakage channels.',
    keyTakeaway:
      'Understanding CMOS switching, glitch propagation, CPU pipelines, caches, and CDC boundaries is mandatory for building or breaking secure silicon.',
    subtopics: [
      {
        id: 'hw-digital-logic',
        title: 'Digital Logic & Boolean Algebra',
        summary:
          'Boolean identities, De Morgan’s laws, Karnaugh minimization, canonical SOP/POS forms, and algebraic normal form (ANF).',
        mechanics:
          'Every combinational crypto datapath reduces to AND/OR/XOR/INV networks. Algebraic degree in GF(2) (ANF) governs resistance against higher-order differential cryptanalysis and determines how many shares d+1 are required in hardware masking.',
        siliconAndRtlLink:
          'XOR gates are ~2-3x larger than NAND/NOR in standard-cell libraries; optimizing S-Box tower fields minimizes XOR depth and critical-path setup violations.',
        attackAndDefense:
          'Unbalanced combinational paths cause dynamic glitches (temporary 0->1->0 transitions) that recombine masked shares inside a single clock cycle, breaking naive Boolean masking unless register stages separate non-linear DOM multipliers.',
      },
      {
        id: 'hw-comb-seq',
        title: 'Combinational & Sequential Circuits',
        summary:
          'Multiplexers, adders (RCA, Kogge-Stone), flip-flops, latches, setup/hold windows, and synchronous state retention.',
        mechanics:
          'Combinational logic computes stateless functions f(x) bounded by propagation delay t_pd; sequential flip-flops sample inputs on clock edges subject to t_setup and t_hold constraints.',
        siliconAndRtlLink:
          'Scan-chain flip-flops inserted for manufacturing DFT connect internal cipher registers into a serial shift chain—a prime physical backdoor if scan chains are not disabled or scrambled after wafer test.',
        attackAndDefense:
          'Setup-time violations induced by clock glitching or voltage droop cause registers to latch stale or partial combinational results—the physical mechanism behind fault-injection attacks.',
      },
      {
        id: 'hw-cmos',
        title: 'CMOS Transistor Basics, Standard Cells, Timing & Power',
        summary:
          'NMOS/PMOS complementary networks, dynamic switching energy E = alpha * C_L * V_DD^2, static leakage, and standard-cell characterization.',
        mechanics:
          'Dynamic power P_dyn = alpha * C_L * V_DD^2 * f occurs predominantly when node capacitance charges (0->1) or discharges (1->0). Hamming Distance (HD) between consecutive register states directly modulates instantaneous supply current I_DD(t).',
        siliconAndRtlLink:
          'Standard cells placed on the same power rail share IR-drop and substrate coupling. Decoupling capacitors (decaps) and isolated power grids attenuate high-frequency current spikes.',
        attackAndDefense:
          'CPA models P proportional to HW(SBox(p ^ k)) or HD(R_i, R_{i+1}). Dual-rail precharge logic (WDDL) forces exactly one transition per bit per cycle to flatten switching power.',
      },
      {
        id: 'hw-fsm',
        title: 'Finite State Machines (Mealy, Moore, Sparse Encoding)',
        summary:
          'Control-path state machines governing multi-round cipher loops, key scheduling, bus handshakes, and fault-response lockouts.',
        mechanics:
          'Moore outputs depend only on state; Mealy outputs depend on state + inputs. Binary/one-hot encodings leave unused bit patterns that fault injection can force the FSM into.',
        siliconAndRtlLink:
          'Security-critical IPs (OpenTitan AES, KeyMgr, LifeCycle) use sparse Hamming-distance >= 3 state encodings (generated via LFSR/manual constants) so single- or double-bit faults land in an illegal trap state and assert fatal alerts.',
        attackAndDefense:
          'Glitching a 1-bit `auth_ok` flag or jumping from `IDLE` straight to `KEY_EXPORT` bypasses verification. Countermeasure: sparse FSM encoding + redundant state checks + shadow registers.',
        atlasLinks: [
          { label: 'RTL Design: Safe FSMs', kind: 'view', targetId: 'rtl-design' },
        ],
      },
      {
        id: 'hw-arch',
        title: 'Computer Architecture (CPU Pipeline, Caches, Memory Hierarchy, Buses)',
        summary:
          'Out-of-order execution, branch predictors, L1/L2/LLC set-associative caches, TLBs, and on-chip system interconnects.',
        mechanics:
          'Speculative execution runs instructions past unresolved branches or permission checks; shared L1/LLC cache sets evict lines based on address index bits, leaving persistent microarchitectural footprints.',
        siliconAndRtlLink:
          'A software AES T-table lookup indexes SRAM cache lines with secret bytes `S[k ^ p]`. Even if architecturally constant-latency on cache hits, evicted cache lines create measurable reload timing variance.',
        attackAndDefense:
          'Spectre/Meltdown, Flush+Reload, and Prime+Probe extract secrets across privilege boundaries. Hardware mitigations include cache partitioning, speculation barriers (`LFENCE`), and dedicated non-cached crypto engines.',
        atlasLinks: [
          { label: 'Ibex RISC-V Core', kind: 'ip', targetId: 'ibex' },
          { label: 'CVA6 Application Core', kind: 'ip', targetId: 'cva6' },
        ],
      },
      {
        id: 'hw-isa',
        title: 'Instruction Set Architecture (x86 / ARM / RISC-V)',
        summary:
          'Privilege modes (Ring 0/3, EL0-EL3, M/S/U), hardware crypto extensions (AES-NI, ARMv8 Crypto, RISC-V Zkn/Zkr), and timing guarantees.',
        mechanics:
          'ISAs define architectural behavior, not cycle timing—except when Data-Independent Timing (DIT / DOIT / Zkt) extensions explicitly guarantee instruction latency is independent of operand values.',
        siliconAndRtlLink:
          'Variable-latency hardware multipliers or early-exit dividers leak operand bit-lengths via execution time. RISC-V Zkt and ARMv8.4 FEAT_DIT constrain datapath bypasses on crypto instructions.',
        attackAndDefense:
          'Always inspect CPU errata and enable DIT/DOITM PSTATE flags before executing constant-time software crypto; avoid variable-time `DIV` instructions on secret scalars.',
      },
      {
        id: 'hw-memory',
        title: 'Memory Systems (SRAM, DRAM, Flash, NVM, OTP)',
        summary:
          'Volatile 6T SRAM arrays, capacitive DRAM refresh/row-hammer dynamics, NOR/NAND Flash, eFuse/OTP root keys, and memory encryption.',
        mechanics:
          'SRAM cells retain state briefly after power-off at cryogenic temperatures (cold boot attack); DRAM rows leak charge into adjacent rows under repeated activation (Rowhammer).',
        siliconAndRtlLink:
          'Root-of-Trust SoCs store device secrets in OTP/eFuses with hardware-enforced read-lock (`CREATOR_SW_CFG` / `SECRET2`) and scramble internal SRAM addresses/data using PRINCE or lightweight block ciphers.',
        attackAndDefense:
          'Bus probing on external DRAM/Flash exposes plaintext keys and firmware. Defense: inline memory encryption + integrity trees (XEX/GCM) and internal SRAM address/data scrambling.',
      },
      {
        id: 'hw-interconnects-cdc',
        title: 'Interconnects, Clock Domains & Power Domains',
        summary:
          'On-chip buses (AXI4, TileLink-UL, AHB), multi-clock CDC synchronizers, UPF power islands, and reset trees.',
        mechanics:
          'SoC crypto accelerators sit on slave buses (`TL-UL` / `AXI4-Lite`) and often draw entropy from an independent clock domain (EDN / TRNG) via Gray-coded async FIFOs or 2-FF handshake synchronizers.',
        siliconAndRtlLink:
          'Insecure bus bridges can leak secret key registers if debug/DMA masters are not gated by privilege/lifecycle filters or PMP/TZASC firewalls.',
        attackAndDefense:
          'Reset-domain glitches or power-domain retention corruption can zeroize keys inconsistently. Defense: synchronous key zeroization + hardware alert escalation on bus integrity errors (e.g., TL-UL Hsiao SECDED).',
        atlasLinks: [
          { label: 'Clock Domain Analyzer', kind: 'view', targetId: 'cdc-analyzer' },
          { label: 'TL-UL Integrity Protocol', kind: 'protocol', targetId: 'tl-ul' },
        ],
      },
      {
        id: 'hw-vlsi-flow',
        title: 'Basic VLSI Design Flow (RTL -> Synthesis -> Place & Route -> Timing Closure)',
        summary:
          'How security countermeasures survive—or get destroyed by—EDA synthesis, logic optimization, P&R, and ECOs.',
        mechanics:
          'RTL goes through elaboration, technology mapping (synthesis), DFT scan insertion, floorplanning, clock-tree synthesis (CTS), routing, and STA timing closure.',
        siliconAndRtlLink:
          'Aggressive EDA synthesis (`optimize_registers`, constant propagation, boolean flattening) routinely merges dual-rail signals or removes redundant masked shares unless `dont_touch` / `keep_hierarchy` attributes and formal masking checks protect them.',
        attackAndDefense:
          'Post-layout verification must inspect the routed GDSII/netlist (not just pre-synthesis RTL) for antenna effects, EM hotspots, and logic recombination across masked share boundaries.',
      },
      {
        id: 'hw-side-channel-physics',
        title: 'Side-Channel Physics (Power, EM, Timing, Photon Emission)',
        summary:
          'Physical emanations from switching transistors: supply current IR drop, near-field magnetic flux, execution latency, and NIR photon emission.',
        mechanics:
          'Biot-Savart law couples local metal-layer current loops to micro-EM probes; silicon carrier recombination during CMOS switching emits near-infrared photons detectable through backside thinned dies.',
        siliconAndRtlLink:
          'Top metal mesh shields (active tamper meshes) cover sensitive security macros so physical decapping or backside FIB probing severs a loop and triggers instant zeroization.',
        attackAndDefense:
          'Countermeasures layer physical shields + randomized clock jitter + power-rail decoupling + algorithmic Boolean/arithmetic masking.',
      },
    ],
  },
  {
    id: 'ch3-software',
    number: 3,
    title: 'Software & Systems Foundations',
    stratumId: 'software-os',
    stackLayerLabel: 'Stratum 2 · C, Assembly, Compilers & Secure Boot',
    vlsiPerspective:
      'Even a mathematically sound algorithm leaks keys if a C compiler optimizes a secret-dependent expression into a conditional jump (`Jcc`), or if an unauthenticated bootloader loads malicious microcode before hardware locks down OTP fuses.',
    keyTakeaway:
      'Control over assembly output, memory isolation, and the immutable Boot ROM chain-of-trust bridges silicon hardware to network protocols.',
    subtopics: [
      {
        id: 'sw-c-asm',
        title: 'C and Assembly (Critical for Crypto Implementations)',
        summary:
          'Pointer aliasing, undefined behavior, inline assembly, SIMD intrinsics, and deterministic bit-manipulation in C.',
        mechanics:
          'C compilers exploit Undefined Behavior (UB) such as signed integer overflow or dead-store elimination—famously stripping `memset(key, 0, len)` zeroization calls before function return unless `explicit_bzero` or volatile barriers are used.',
        siliconAndRtlLink:
          'Bitwise masks `mask = -(uint32_t)(cond)` generate branchless arithmetic (`SUB`/`AND`/`XOR`) directly in ALU registers without touching branch predictor tables.',
        attackAndDefense:
          'Verify compiled object disassembly (`objdump`) for secret-dependent branches or memory loads; use `volatile` barriers or assembly kernels for core primitives.',
        codeSnippet: {
          title: 'constant_time_select.c',
          language: 'C',
          code: `// Branchless constant-time conditional swap (for X25519 / Kyber CMOV)
// Returns a if choice == 0, b if choice == 1 without branching
uint32_t ct_select_u32(uint32_t a, uint32_t b, uint32_t choice) {
    // volatile barrier stops compiler from re-introducing a branch
    volatile uint32_t c = choice & 1U;
    uint32_t mask = 0U - c; // 0x00000000 if 0, 0xFFFFFFFF if 1
    return (a & ~mask) | (b & mask);
}`,
        },
      },
      {
        id: 'sw-dsa',
        title: 'Data Structures & Algorithms (Big-O, Sorting, Searching, Graphs)',
        summary:
          'Asymptotic runtime bounds, radix/bitonic sorting, Merkle trees, hash tables, and graph traversal (DAGs/BFS) in cryptography.',
        mechanics:
          'Oblivious/constant-time sorting networks (e.g., Batcher’s bitonic sort) run in fixed O(n log^2 n) comparisons independent of secret inputs—vital in lattice signature samplers and sealed enclaves.',
        siliconAndRtlLink:
          'Polynomial multiplication upgrades from O(n^2) schoolbook loops to O(n log n) Number Theoretic Transforms (NTT), shrinking hardware latency from milliseconds to microseconds.',
        attackAndDefense:
          'Input-dependent hash table collisions enable algorithmic complexity DoS; data-dependent early-exit loops leak secret hamming weights or byte positions.',
      },
      {
        id: 'sw-os',
        title: 'Operating Systems (Processes, Memory Management, Interrupts, Kernel vs User Space)',
        summary:
          'Virtual memory paging, MMU/IOMMU isolation, privilege rings, context switches, and DMA attack surfaces.',
        mechanics:
          'OS kernels isolate user processes via page tables, ASIDs, and privilege traps. However, kernel-level interrupts or page faults occurring inside cryptographic routines reveal instruction-pointer granularity timing.',
        siliconAndRtlLink:
          'Hardware PMP (RISC-V), TrustZone SAU/IDAU (ARM), and IOMMU page tables enforce physical bus isolation so compromised user/DMA peripherals cannot read key SRAM.',
        attackAndDefense:
          'Controlled-channel (page-fault) attacks against enclaves (SGX) trace accessed 4KB pages. Defense: page-oblivious code/data layouts and hardware memory encryption.',
      },
      {
        id: 'sw-secure-boot',
        title: 'Secure Boot & Bootloaders (ROM -> Boot ROM -> First-Stage Loader -> OS)',
        summary:
          'Immutable silicon Mask ROM establishing hardware Root of Trust (RoT) and verifying each subsequent software stage.',
        mechanics:
          'On reset, the CPU fetches from immutable Mask ROM. Boot ROM hashes the mutable First-Stage Bootloader (BL1/ROM_EXT), verifies its digital signature against OTP-burned public key hashes, checks monotonic anti-rollback counters, and locks debug/key registers before jumping.',
        siliconAndRtlLink:
          'Silicon lifecycle controllers gate JTAG/SWD debug ports until Boot ROM verifies RMA tokens or confirms development mode; hardware SHA/OTBN/KMAC accelerators verify signatures before external flash code runs.',
        attackAndDefense:
          'TOCTOU (Time-of-Check to Time-of-Use) flash swap attacks modify SPI flash between verification and execution. Defense: copy verified image into locked internal SRAM before executing.',
      },
      {
        id: 'sw-firmware',
        title: 'Firmware & Embedded Systems',
        summary:
          'Bare-metal MMIO drivers, DMA descriptor rings, watchdog timers, and constrained-RAM cryptographic execution.',
        mechanics:
          'Embedded firmware drives hardware crypto blocks via memory-mapped CSRs, polling status bits or handling completion IRQs without dynamic heap allocation.',
        siliconAndRtlLink:
          'Register-generation tools (e.g., OpenTitan `reggen` HJSON) auto-generate both RTL CSR blocks and C header offsets, preventing MMIO bitfield drift.',
        attackAndDefense:
          'Unvalidated DMA descriptors allow peripherals to overwrite firmware stacks. Enforce MPU/PMP bounds on DMA buffers and clear sensitive MMIO FIFO registers post-operation.',
      },
      {
        id: 'sw-networking',
        title: 'Networking Basics (TCP/IP, TLS Handshake at Protocol Level)',
        summary:
          'Packet framing, IP/TCP state machines, MTU/fragmentation, and the record-layer boundary where TLS encapsulates application data.',
        mechanics:
          'TCP handles ordered reliable byte streams (`SYN`, `ACK`, sequence numbers), while TLS sits above TCP to authenticate endpoints, negotiate cipher suites, and protect record confidentiality/integrity.',
        siliconAndRtlLink:
          'High-throughput NICs and DPUs offload AES-GCM / ChaCha20-Poly1305 inline on Ethernet MAC/PCIe datapaths (`kTLS` hardware offload) to sustain 100G–800G line rates.',
        attackAndDefense:
          'Larger PQC public keys and signatures (1–15 KB) exceed standard 1500-byte Ethernet MTUs, risking TCP fragmentation stalls and amplification vectors in UDP/QUIC unless anti-amplification limits are enforced.',
      },
      {
        id: 'sw-concurrency',
        title: 'Parallelism & Concurrency',
        summary:
          'Multi-core locking, atomic RMW primitives, SIMD vectorization (AVX2/NEON/RVV), and race-condition vulnerabilities.',
        mechanics:
          'Cryptographic state (such as AES-GCM IV/nonces or DRBG counters) must never be reused across concurrent threads. Atomic compare-and-swap or per-thread key derivation prevents nonce collision.',
        siliconAndRtlLink:
          'Simultaneous Multithreading (SMT / Hyper-Threading) shares L1 caches and execution ports between sibling threads—allowing a malicious co-resident thread to spy via PortSmash timing.',
        attackAndDefense:
          'Disable SMT for high-assurance crypto workloads or isolate security execution onto dedicated hardware security cores (e.g., Ibex-based RoT).',
      },
      {
        id: 'sw-compilers',
        title: 'Compilers & Optimization (Constant-Time Code Generation)',
        summary:
          'How LLVM/GCC passes (if-conversion, dead-code elimination, value-range propagation) break or preserve constant-time properties.',
        mechanics:
          'Compilers aggressively convert branchless ternary expressions (`x ? a : b`) back into conditional branches (`cmov` vs `jmp`) depending on target microarchitecture cost models.',
        siliconAndRtlLink:
          'Even when LLVM emits `cmov`, certain older CPUs implement `cmov` with data-dependent pipeline stalls or micro-op cracks. True assurance checks compiled machine code via tools like `ctgrind`, `dudect`, or `Binsec/Rel`.',
        attackAndDefense:
          'Use compiler fences (`__asm__ volatile("" : "+r"(x))`), target-specific assembly kernels, or formal C-to-assembly compilers like Jasmin / CompCert.',
      },
    ],
  },
  {
    id: 'ch4-symmetric',
    number: 4,
    title: 'Classical Cryptography (Symmetric)',
    stratumId: 'protocols-classical',
    stackLayerLabel: 'Stratum 3 · Symmetric Primitives, Modes & AEAD',
    vlsiPerspective:
      'Symmetric algorithms form the bulk-data workhorse of silicon: AES-GCM engines run at hundreds of Gbps in NICs and SSD controllers, while SHA-3/Keccak permutations double as both classical hashes and the heaviest bottleneck in Post-Quantum Kyber/Dilithium hardware.',
    keyTakeaway:
      'Internal permutation structure (SPN vs. ARX vs. Sponge) governs hardware throughput, area, and side-channel masking complexity.',
    subtopics: [
      {
        id: 'sym-classical',
        title: 'Classical Ciphers (Caesar, Vigenere, One-Time Pad) & Cryptanalysis',
        summary:
          'Substitution/transposition roots, Kasiski/IoC frequency attacks, and the strict key-reuse failure of the One-Time Pad.',
        mechanics:
          'Caesar and Vigenere preserve plaintext letter statistics modulo key period k. Even the unbreakable One-Time Pad (C = P XOR K) collapses completely if two messages share keystream K (C1 XOR C2 = P1 XOR P2).',
        siliconAndRtlLink:
          'XOR stream combining is a single gate per bit in RTL, making stream nonce/IV management (not the XOR gate itself) the critical hardware/firmware invariant.',
        attackAndDefense:
          'Many-time pad reuse immediately breaks RC4, CTR, ChaCha20, and AES-GCM confidentiality—and in GCM also leaks the authentication key H.',
      },
      {
        id: 'sym-perfect-secrecy',
        title: 'Shannon’s Perfect Secrecy',
        summary:
          'Information-theoretic bound: ciphertext reveals zero information about plaintext (P(M=m | C=c) = P(M=m)), requiring |K| >= |M|.',
        mechanics:
          'Because truly random keys as long as every transmitted terabyte are impractical, practical symmetric crypto replaces information-theoretic secrecy with computational indistinguishability (PRPs / PRFs) under 128/256-bit keys.',
        siliconAndRtlLink:
          'Hardware DRBGs expand short 256-bit TRNG entropy seeds into gigabits of pseudorandom keystream via AES-CTR or Hash_DRBG.',
        attackAndDefense:
          'Never confuse PRNG output with information-theoretic entropy; if internal DRBG state leaks (e.g., via side-channels or Dual_EC backdoor), all past/future streams collapse.',
      },
      {
        id: 'sym-stream',
        title: 'Stream Ciphers (LFSR, RC4, ChaCha20, Salsa20)',
        summary:
          'Hardware LFSRs (and their linear algebraic weakness), legacy broken RC4, and modern constant-time ARX ciphers Salsa20 / ChaCha20.',
        mechanics:
          'ChaCha20 operates on a 4x4 32-bit state matrix using 20 rounds of quarter-round ARX (Add-Rotate-XOR) operations, eliminating lookup tables completely.',
        siliconAndRtlLink:
          'Plain LFSRs are trivial in flip-flops + XOR taps but trivially broken by the Berlekamp-Massey algorithm after 2n output bits; ChaCha20 synthesizes cleanly to 32-bit adders, barrel shifters, and XOR gates with zero S-Box ROMs.',
        attackAndDefense:
          'RC4 suffers severe keystream biases and is banned in TLS 1.3. ChaCha20 is inherently immune to cache-timing attacks in software because it has no secret-dependent table lookups.',
      },
      {
        id: 'sym-block',
        title: 'Block Ciphers (DES, 3DES, AES — SubBytes, ShiftRows, MixColumns, AddRoundKey)',
        summary:
          'Feistel networks (DES/3DES 64-bit blocks) vs. Substitution-Permutation Network AES (128-bit state, 10/12/14 rounds).',
        mechanics:
          'Each AES round applies: (1) SubBytes: nonlinear GF(2^8) inversion + affine map; (2) ShiftRows: byte-wise row rotation for inter-column diffusion; (3) MixColumns: 4x4 MDS matrix multiply in GF(2^8); (4) AddRoundKey: XOR with expanded round key.',
        siliconAndRtlLink:
          'Unrolled pipelined AES cores achieve 1 block/cycle (>100 Gbps), while compact folded/serial 8-bit or 32-bit datapaths fit ultra-low-area IoT RoT chips with DOM masking.',
        attackAndDefense:
          'DES 56-bit keys are exhaustively brute-forced in hours; 3DES suffers Sweet32 64-bit block collisions. AES-128/256 remain unbroken mathematically, shifting attacks to side channels (DPA/CPA) and key-schedule faults.',
        atlasLinks: [
          { label: 'AES 7-Chapter Interactive Lab', kind: 'view', targetId: 'aes-deep-dive' },
          { label: 'OpenTitan AES RTL', kind: 'ip', targetId: 'opentitan-aes' },
        ],
      },
      {
        id: 'sym-modes',
        title: 'Modes of Operation (ECB, CBC, CTR, GCM, CCM, XTS)',
        summary:
          'How fixed 128-bit block ciphers encrypt arbitrary-length streams, disks, and authenticated packets.',
        mechanics:
          'ECB leaks identical plaintext blocks. CBC chains ciphertext blocks (serial encryption, padding oracle risk). CTR turns a block cipher into a parallelizable stream cipher. XTS (tweaked codebook) protects sector-addressable storage/NVMe. GCM/CCM combine CTR encryption with authentication.',
        siliconAndRtlLink:
          'CTR and GCM parallelize across multiple AES pipeline lanes effortlessly, whereas CBC encryption is strictly sequential (1 block latency per block). XTS requires GF(2^128) alpha-tweak multiplication per block.',
        attackAndDefense:
          'ECB is broken visually (ECB penguin). CBC without MAC allows bit-flipping and padding oracles. GCM with a reused 96-bit nonce completely exposes the GHASH key H = E_K(0) via polynomial root-finding.',
      },
      {
        id: 'sym-hash',
        title: 'Hash Functions (MD5, SHA-1, SHA-2, SHA-3 / Keccak, BLAKE2 / BLAKE3)',
        summary:
          'Collision, preimage, and second-preimage resistance across Merkle-Damgard (MD5/SHA-1/SHA-2), Sponge (Keccak/SHA-3), and Merkle-tree (BLAKE3) designs.',
        mechanics:
          'SHA-256 uses Davies-Meyer compression with 64 rounds of 32-bit ARX/logic ops. Keccak/SHA-3 absorbs/squeezes arbitrary lengths (`SHAKE128/256` XOFs) over a 1600-bit state (24 rounds of theta/rho/pi/chi/iota). BLAKE3 builds a parallel binary Merkle tree over ChaCha-derived compression.',
        siliconAndRtlLink:
          'Keccak’s 1600-bit state fits nicely into wide register files with shallow combinational logic (1 round/cycle = 24 cycles/block), making SHAKE128/256 fast in hardware—critical because Keccak accounts for >60% of ML-KEM/ML-DSA runtime.',
        attackAndDefense:
          'MD5 and SHA-1 have practical chosen-prefix collision attacks and are deprecated. Merkle-Damgard SHA-256 is vulnerable to length-extension attacks (mitigated by HMAC or SHA-3/SHA-512/256).',
      },
      {
        id: 'sym-mac',
        title: 'Message Authentication Codes (HMAC, CMAC, Poly1305)',
        summary:
          'Symmetric integrity and authenticity tags preventing tampering and chosen-ciphertext forgery.',
        mechanics:
          'HMAC = H((K^opad) || H((K^ipad) || m)) safely wraps Merkle-Damgard hashes against length extension. CMAC derives subkeys for CBC-MAC across variable lengths. Poly1305 evaluates a polynomial mod 2^130 - 5 using a one-time key (r, s).',
        siliconAndRtlLink:
          'HMAC hardware engines reuse existing SHA-256 silicon cores (e.g., OpenTitan `hmac`), while Poly1305 requires 130-bit integer multipliers that pair with ChaCha20.',
        attackAndDefense:
          'Tag comparison MUST run in constant time (`ct_memcmp`)—early-exit byte comparison lets attackers forge valid HMAC tags byte-by-byte in linear queries.',
      },
      {
        id: 'sym-aead',
        title: 'Authenticated Encryption with Associated Data (AEAD: AES-GCM, ChaCha20-Poly1305, AES-GCM-SIV)',
        summary:
          'Unified primitives binding confidentiality, integrity, and unencrypted headers (AAD) into one API.',
        mechanics:
          'AEAD outputs `(ciphertext, tag) = Seal(K, N, PT, AAD)`. Encrypt-then-MAC constructions prevent chosen-ciphertext attacks. AES-GCM-SIV uses nonce-misuse-resistant synthetic IVs.',
        siliconAndRtlLink:
          'High-speed AES-GCM cores combine a pipelined AES-CTR engine with a Karatsuba GF(2^128) GHASH multiplier (`PCLMULQDQ` / `PMULL` in CPU ISA, or parallel hardware multipliers in NICs).',
        attackAndDefense:
          'Never release unverified decrypted plaintext before tag verification succeeds; releasing partial plaintext enables decryption oracles and buffer corruption.',
      },
    ],
  },
  {
    id: 'ch5-asymmetric',
    number: 5,
    title: 'Classical Cryptography (Asymmetric & Protocols)',
    stratumId: 'protocols-classical',
    stackLayerLabel: 'Stratum 3 · Public-Key Exchange, Signatures & TLS',
    vlsiPerspective:
      'Asymmetric crypto trades compact symmetric gates for wide 256-bit to 4096-bit integer/polynomial datapaths, dedicated PKA coprocessors (like OpenTitan OTBN), and hardware TRNGs—all facing existential obsolescence from Shor’s quantum algorithm.',
    keyTakeaway:
      'Diffie-Hellman, RSA, and ECC underpin current PKI and TLS 1.3, with strict dependence on unpredictable hardware nonces and safe padding.',
    subtopics: [
      {
        id: 'asym-dh',
        title: 'Diffie-Hellman Key Exchange',
        summary:
          'Establishing a shared secret over an untrusted wire using the Computational / Decisional Diffie-Hellman (CDH/DDH) hardness.',
        mechanics:
          'Parties agree on generator g in group G; Alice sends g^a, Bob sends g^b, and both derive g^{ab}. Classical finite-field DH requires >= 2048-bit primes for 112-bit security.',
        siliconAndRtlLink:
          'Modular exponentiation g^a mod p consumes hundreds of thousands of clock cycles in wide Montgomery PKA multipliers unless pipelined.',
        attackAndDefense:
          'Unauthenticated DH falls trivially to Man-in-the-Middle (MitM) interception; ephemeral DH (DHE/ECDHE) signed by certificates provides forward secrecy.',
      },
      {
        id: 'asym-rsa',
        title: 'RSA (KeyGen, Encryption, Signing, Padding — PKCS#1 v1.5, OAEP, PSS)',
        summary:
          'Trapdoor permutation based on integer factorization N = p·q, requiring randomized padding for IND-CCA2 / EUF-CMA security.',
        mechanics:
          'Textbook RSA (m^e mod N) is deterministic and homomorphic (m1^e · m2^e = (m1·m2)^e). OAEP adds Feistel-structured random masking for encryption; PSS adds probabilistic salting for signatures.',
        siliconAndRtlLink:
          'RSA-2048/4096 PKA engines use 256-bit or 512-bit word-serial Montgomery multipliers + dual-port SRAM banks storing operand limbs.',
        attackAndDefense:
          'PKCS#1 v1.5 encryption padding is vulnerable to Bleichenbacher’s million-message adaptive oracle; small public exponent e=3 without padding leaks roots directly.',
      },
      {
        id: 'asym-ecc',
        title: 'Elliptic Curve Cryptography (Curve Arithmetic, ECDH, ECDSA, EdDSA, Curve25519 / Ed25519)',
        summary:
          'Group law on elliptic curves (Weierstrass, Montgomery, Twisted Edwards) delivering 128-bit classical security in 256-bit keys.',
        mechanics:
          'Scalar multiplication Q = k·P replaces modular exponentiation with point addition and doubling. Montgomery ladders (`X25519`) execute uniform add+double per scalar bit; Edwards curves (`Ed25519`) provide complete addition formulas with deterministic nonces.',
        siliconAndRtlLink:
          '256-bit curves fit in compact 8x32-bit limb datapaths (such as OpenTitan’s OTBN WLEN=256-bit wide-word vector engine), running ~10x faster and smaller than RSA-3072.',
        attackAndDefense:
          'Nonce reuse or even 2-bit bias in ECDSA nonces k recovers the private key immediately via lattice/HNP attacks. Invalid-curve attacks fail to verify input points lie on the curve.',
      },
      {
        id: 'asym-pki',
        title: 'Digital Signatures, Certificates & PKI (X.509)',
        summary:
          'Binding public keys to identities via hierarchical Certificate Authorities (Root CA -> Intermediate -> Leaf), CRL/OCSP revocation, and Certificate Transparency.',
        mechanics:
          'X.509 certificates encode ASN.1 DER structures signed by an issuer CA. Chain validation checks signature links, validity windows, keyUsage extensions, and name constraints.',
        siliconAndRtlLink:
          'Silicon Root-of-Trust chips store immutable Device Identifier Composition Engine (DICE) UDS secrets to mint layered hardware-attested X.509 certificates on boot.',
        attackAndDefense:
          'ASN.1 parser bugs and signature algorithm confusion (`alg=none`, weak MD5/SHA-1 certs) allow forged chains; PQC certificate chains inflate TLS handshake bytes due to larger ML-DSA/SLH-DSA signatures.',
      },
      {
        id: 'asym-kdf',
        title: 'Key Derivation Functions (HKDF, PBKDF2, Argon2, scrypt)',
        summary:
          'Extracting uniform entropy from shared secrets (HKDF) vs. memory/CPU-hard password stretching (Argon2id, scrypt).',
        mechanics:
          'HKDF splits into Extract (compressing non-uniform IKM with salt via HMAC) and Expand (generating multiple independent subkeys with domain-separation `info` labels). Argon2id fills gigabytes of RAM with data-dependent/independent passes to defeat ASIC/GPU password crackers.',
        siliconAndRtlLink:
          'PBKDF2 is purely compute-bound and cracks fast on custom ASIC SHA-256 arrays; Argon2id explicitly targets DRAM bandwidth/capacity walls to neutralize specialized silicon crackers.',
        attackAndDefense:
          'Always separate keys by context (`info = "tls13 hs traffic"` vs `"app data"`) via HKDF rather than reusing raw ECDH/ML-KEM outputs directly.',
      },
      {
        id: 'asym-rng',
        title: 'Random Number Generation (TRNG, PRNG, DRBG, Entropy Sources)',
        summary:
          'Physical noise harvesting (TRNG), deterministic expansion (CTR_DRBG / HMAC_DRBG), and continuous SP 800-90B health monitoring.',
        mechanics:
          'TRNGs sample physical stochastic jitter (ring oscillators, thermal resistor noise, metastability), apply Repetition Count and Adaptive Proportion health tests, condition via SHA/KMAC, and seed an approved DRBG.',
        siliconAndRtlLink:
          'Attacker-induced clock locking or voltage injection can phase-lock ring oscillators, collapsing entropy silently—requiring on-die continuous health tests and alert lines.',
        attackAndDefense:
          'Weak RNGs (predictable boot seeds, Debian OpenSSL bug, ECDSA repeated k) cause catastrophic private key compromise across devices.',
      },
      {
        id: 'asym-tls',
        title: 'TLS 1.2 / 1.3 Handshake & Record Layer (In Depth)',
        summary:
          'Negotiating ephemeral key exchange, mutual/server authentication, and AEAD-protected traffic records over 1-RTT (TLS 1.3).',
        mechanics:
          'TLS 1.3 removes static RSA key transport, CBC ciphers, and MD5/SHA-1; encrypts handshake certificates immediately after `ServerHello`; derives Early, Handshake, and Application secrets via a clean HKDF key schedule; and supports 0-RTT PSK resumption.',
        siliconAndRtlLink:
          'NIC kTLS hardware offload separates control-plane handshake (CPU / HSM) from data-plane symmetric AES-GCM record encryption (wire-speed ASIC pipeline).',
        attackAndDefense:
          'Downgrade attacks are blocked by transcript hashing and ServerRandom magic canary bytes; 0-RTT early data lacks forward secrecy and requires strict replay protection.',
      },
      {
        id: 'asym-mpc-zkp',
        title: 'Secure Multiparty Computation (MPC) & Zero-Knowledge Proofs (Introductory)',
        summary:
          'Computing joint functions without revealing inputs (MPC) and proving statement validity without leaking witnesses (ZKP).',
        mechanics:
          'Shamir secret sharing / Garbled Circuits split secrets across parties. Interactive/non-interactive ZKPs (Schnorr Sigma protocols + Fiat-Shamir) prove knowledge of discrete log x for Y = g^x without revealing x.',
        siliconAndRtlLink:
          'MPC boolean/arithmetic secret sharing shares the exact mathematical foundation of hardware Threshold Implementations (TI) and Domain-Oriented Masking (DOM) used to harden AES/PQC chips against DPA.',
        attackAndDefense:
          'Weak Fiat-Shamir hashes omitting public statement parameters allow forged proofs; hardware ZKP accelerators target MSM (Multi-Scalar Multiplication) and NTT datapaths.',
      },
    ],
  },
];
