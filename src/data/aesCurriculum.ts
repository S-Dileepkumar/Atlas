export type EvidenceTag =
  | '[OFFICIAL SPECIFICATION]'
  | '[OFFICIAL DOCUMENTATION]'
  | '[OBSERVED IN RTL]'
  | '[OBSERVED IN VERIFICATION]'
  | '[DERIVED FROM RTL]'
  | '[ENGINEERING RECOMMENDATION]'
  | '[EDUCATIONAL EXAMPLE]';

export interface AesSubtopicDoc {
  id: string;
  chapterId: string;
  title: string;
  evidenceTags: EvidenceTag[];
  sourceRefs: { label: string; path: string; url?: string }[];
  level1Fundamental: {
    summary: string;
    everydayAnalogy: string;
    whatHappensStepByStep: string[];
  };
  level2Engineering: {
    architectureAndSpec: string;
    keyParametersOrMath: string[];
    workedExample: string;
  };
  level3Expert: {
    rtlAndMicroarchitecture: string;
    cornerCasesAndFailures: { symptom: string; rootCause: string; detection: string }[];
    verificationAndTradeoffs: string;
  };
}

export interface AesChapter {
  id: string;
  number: string;
  title: string;
  overview: string;
  subtopics: AesSubtopicDoc[];
}

export const AES_CURRICULUM: AesChapter[] = [
  {
    id: 'ch01',
    number: '01',
    title: 'Cryptography Fundamentals',
    overview:
      'Foundational mathematical and structural principles behind modern symmetric block ciphers and why AES replaces linear arithmetic with finite-field algebra.',
    subtopics: [
      {
        id: 'symmetric-encryption',
        chapterId: 'ch01',
        title: 'Symmetric Encryption',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[EDUCATIONAL EXAMPLE]'],
        sourceRefs: [
          { label: 'NIST FIPS 197 (AES Standard)', path: 'Section 1–2: Introduction & Definitions', url: 'https://csrc.nist.gov/pubs/fips/197/final' },
        ],
        level1Fundamental: {
          summary:
            'Symmetric encryption uses the exact same secret key (or mathematically coupled round keys derived from it) for both locking (encrypting) plaintext and unlocking (decrypting) ciphertext.',
          everydayAnalogy:
            'Like a physical deadbolt lock where both Alice and Bob hold identical copies of the same brass house key—unlike asymmetric (RSA/ECC) locks which have separate public padlocks and private keys.',
          whatHappensStepByStep: [
            'Before: Sender holds 128-bit plaintext + shared secret key (128, 192, or 256 bits).',
            'During: Block cipher scrambles plaintext through invertible nonlinear and linear layers keyed by round keys.',
            'Afterward: Receiver applies inverse transformations using the reversed round-key schedule to recover exact plaintext; wrong key produces pseudorandom garbage.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Symmetric algorithms achieve 100x–10,000x higher hardware throughput and vastly lower gate count than asymmetric primitives (RSA-2048/ECDSA-P256), enabling bulk memory encryption, storage protection, and line-rate TLS.',
          keyParametersOrMath: [
            'Key lengths in AES: Nk = 4 (128-bit), Nk = 6 (192-bit), Nk = 8 (256-bit) 32-bit words [OFFICIAL SPECIFICATION]',
            'Round counts: Nr = 10 (AES-128), Nr = 12 (AES-192), Nr = 14 (AES-256) [OFFICIAL SPECIFICATION]',
            'Block size: Nb = 4 words = 128 bits fixed regardless of key size [OFFICIAL SPECIFICATION]',
          ],
          workedExample:
            'In OpenTitan EarlGrey, ECDSA/OTBN establishes asymmetric identity during secure boot, then AES-256 decrypts firmware images in flash and scrambles SRAM at line rate using a hardware-sideloaded key.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Symmetric engines must guarantee strict key isolation: secret key bits must never cross unguarded MMIO debug paths or linger in flip-flops after completion (`KEY_IV_DATA_IN_CLEAR`).',
          cornerCasesAndFailures: [
            {
              symptom: 'Identical plaintext blocks leak patterns under ECB mode',
              rootCause: 'Electronic Codebook (ECB) lacks chaining IV/nonce, making symmetric mapping deterministic.',
              detection: 'NIST CAVP KAT mode checks + protocol review banning ECB on multi-block structured secrets.',
            },
            {
              symptom: 'Decryption fails intermittently on first block after reset',
              rootCause: 'AES key expansion for decryption requires inverse-round key derivation (starting from final expanded key) or on-the-fly reverse schedule.',
              detection: 'UVM scoreboard checks back-to-back encrypt->decrypt transitions without manual key rewrite.',
            },
          ],
          verificationAndTradeoffs:
            'Designers trade silicon area between storing all Nr+1 round keys in registers vs computing KeyExpand on-the-fly per cycle (OpenTitan computes round keys on-the-fly in `aes_key_expand.sv` to cut flip-flop area).',
        },
      },
      {
        id: 'block-ciphers',
        chapterId: 'ch01',
        title: 'Block Ciphers',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'NIST SP 800-38A (Block Cipher Modes)', path: 'ECB, CBC, CFB, OFB, CTR', url: 'https://csrc.nist.gov/pubs/sp/800/38/a/final' },
          { label: 'OpenTitan AES Modes', path: 'hw/ip/aes/rtl/aes_core.sv', url: 'https://opentitan.org/book/hw/ip/aes/' },
        ],
        level1Fundamental: {
          summary:
            'A block cipher cuts long messages into fixed-size chunks (128 bits = 16 bytes for AES) and pushes each chunk through the same keyed permutation box.',
          everydayAnalogy:
            'Think of packing files into identical 16-kg shipping containers, scrambling each container’s contents identically, and optionally linking each container’s lock to the previous container (CBC/CTR) so identical files never look alike.',
          whatHappensStepByStep: [
            'Before: Arbitrary-length stream is buffered or padded into 128-bit blocks plus an Initialization Vector (IV) for chained modes.',
            'During: One block passes through the iterative cipher engine while control logic updates the IV/counter.',
            'Afterward: Output 128-bit block becomes ciphertext (ECB/CBC) or keystream XOR mask (CFB/OFB/CTR).',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'AES always maps {0,1}^128 -> {0,1}^128 as a pseudorandom permutation (PRP). Block Cipher Modes wrap that 128-bit core (`aes_cipher_core`) inside `aes_core` to support chaining and streaming.',
          keyParametersOrMath: [
            'CBC Encrypt: C_i = E_K(P_i XOR C_{i-1}), C_0 = IV [OFFICIAL SPECIFICATION]',
            'CBC Decrypt: P_i = D_K(C_i) XOR C_{i-1} [OFFICIAL SPECIFICATION]',
            'CTR Encrypt/Decrypt: P_i XOR E_K(Nonce || Counter_i) — uses forward cipher ONLY for both directions [OFFICIAL SPECIFICATION]',
          ],
          workedExample:
            'Notice CTR mode turns a block cipher into a stream cipher: `aes_cipher_core` always runs Encryption even when `OPERATION = DECRYPT` (`CTRL_SHADOWED`), then XORs ciphertext with plaintext in `aes_core`.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'In `aes_core.sv`, output IV chaining registers (`iv_q`) update automatically on block completion for CBC/CFB/OFB/CTR; CTR increments only the lower slice or full 128-bit IV modulo 2^128 via dedicated incrementer logic.',
          cornerCasesAndFailures: [
            {
              symptom: 'CTR counter reuse catastrophically leaks P1 XOR P2',
              rootCause: 'Software failed to load a fresh IV/Nonce before starting a second message under the same key.',
              detection: 'Track IV writes vs block counts in verification assertions; hardware cannot detect nonce reuse across sessions alone.',
            },
            {
              symptom: 'Data overwrite corruption before reading DATA_OUT',
              rootCause: 'Controller overwrote state before software drained output registers.',
              detection: 'OpenTitan asserts `STATUS.STALL=1` and pauses new block start until all 4 `DATA_OUT_0..3` words are read (`STATUS.OUTPUT_VALID=0`).',
            },
          ],
          verificationAndTradeoffs:
            'ECB and CTR allow multi-block parallel pipelining because blocks have no data dependency, whereas CBC encryption is strictly sequential (block i depends on C_{i-1}).',
        },
      },
      {
        id: 'finite-fields',
        chapterId: 'ch01',
        title: 'Finite Fields',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'FIPS 197 Section 4 (Mathematical Preliminaries)', path: 'GF(2^8) Polynomial Arithmetic' },
          { label: 'OpenTitan aes_pkg.sv', path: 'hw/ip/aes/rtl/aes_pkg.sv', url: 'https://github.com/lowRISC/opentitan/blob/master/hw/ip/aes/rtl/aes_pkg.sv' },
        ],
        level1Fundamental: {
          summary:
            'Inside AES, bytes are not ordinary integers that overflow past 255—they are elements of a closed 256-symbol mathematical system called a Galois Field GF(2^8), where addition is simple XOR and every non-zero byte has an exact multiplicative inverse.',
          everydayAnalogy:
            'Like clock arithmetic (10 + 4 = 2 on a 12-hour clock), GF(2^8) wraps results neatly back into 8 bits using a fixed prime-like polynomial rule so arithmetic never overflows hardware wires and never loses information.',
          whatHappensStepByStep: [
            'Representation: Each byte [b7..b0] represents a degree-7 polynomial b7*x^7 + ... + b0 over {0,1}.',
            'Addition: Polynomial coefficients add modulo 2 -> bitwise XOR (`a ^ b`), with ZERO carry chains!',
            'Multiplication: Multiply polynomials then divide by the AES irreducible polynomial m(x) = x^8 + x^4 + x^3 + x + 1 (0x11B) keeping the 8-bit remainder.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'FIPS-197 fixes the irreducible reduction polynomial m(x) = x^8 + x^4 + x^3 + x + 1 (binary 1_0001_1011 = 0x11B). Multiplying any byte b by x (0x02) is called `xtime(b)`.',
          keyParametersOrMath: [
            'Addition / Subtraction in GF(2^8): a (+) b = a ^ b (identical, self-inverse) [OFFICIAL SPECIFICATION]',
            'xtime(b) = (b << 1) ^ ((b & 0x80) ? 0x1B : 0x00) [OFFICIAL SPECIFICATION]',
            'Multiplication by 0x03: mul3(b) = xtime(b) ^ b [OFFICIAL SPECIFICATION]',
          ],
          workedExample:
            'Compute 0x57 * 0x02 in GF(2^8): 0x57 = 0101_0111 (MSB=0). Shift left 1 -> 0xAE (no 0x1B XOR needed). Now compute 0xAE * 0x02: MSB=1 -> (0xAE << 1) & 0xFF = 0x5C, then XOR 0x1B -> 0x47!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Hardware synthesizes GF(2^8) operations using pure XOR trees (`aes_mul2`, `aes_mul4` in `aes_pkg.sv`) with zero ripple-carry adders—giving tiny 1–2 XOR-gate propagation depth! Furthermore, Canright’s S-Box decomposes GF(2^8) into isomorphic composite tower fields GF(((2^2)^2)^2) so multiplicative inversion takes ~200 gates instead of a huge 256-entry ROM.',
          cornerCasesAndFailures: [
            {
              symptom: 'S-Box returns 0x00 on input 0x00 vs crashing inversion',
              rootCause: '0x00 has no multiplicative inverse in GF(2^8); FIPS 197 defines inv(0x00) = 0x00 before the affine transform adds 0x63.',
              detection: 'Verify SBox(0x00) == 0x63 and InvSBox(0x63) == 0x00 in directed RTL SVA/DV.',
            },
          ],
          verificationAndTradeoffs:
            'Look-up tables (LUTs) leak timing/cache hits in software and consume large multiplexer trees in ASICs; composite GF(2^4)^2 / GF(((2^2)^2)^2) tower-field gates enable Algebraic Normal Form decomposition required for Domain-Oriented Masking (DOM).',
        },
      },
      {
        id: 'spn',
        chapterId: 'ch01',
        title: 'Substitution-Permutation Networks',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[EDUCATIONAL EXAMPLE]'],
        sourceRefs: [
          { label: 'Rijndael / FIPS 197 Design Rationale', path: 'Wide Trail Strategy (Daemen & Rijmen)' },
        ],
        level1Fundamental: {
          summary:
            'Unlike older Feistel ciphers (like DES) that only scramble half the block per round, AES is a Substitution-Permutation Network (SPN) that scrambles all 128 bits simultaneously in every round using two alternating forces: Confusion (S-Boxes) and Diffusion (ShiftRows + MixColumns).',
          everydayAnalogy:
            'Think of baking: Confusion (SubBytes) replaces every ingredient unpredictably so tasting a crumb hides the recipe; Diffusion (ShiftRows + MixColumns) stirs the bowl thoroughly so changing 1 drop of vanilla alters every bite in the pan.',
          whatHappensStepByStep: [
            '1. Confusion (SubBytes): Independently substitutes each byte nonlinearly to defeat algebraic/linear cryptoanalysis.',
            '2. Transposition (ShiftRows): Slides bytes across columns so each column receives bytes from all 4 prior columns.',
            '3. Mixing (MixColumns): Mixes all 4 bytes inside each column mathematically so after 2 rounds every output bit depends on every input bit (full avalanche).',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'SPNs achieve full diffusion in 2 rounds (Wide Trail Strategy: branch number = 5 for MixColumns). Because every round layer is bijective (invertible), decryption reverses the exact order using inverse primitives.',
          keyParametersOrMath: [
            'Avalanche Effect: Flipping 1 bit in Plaintext flips ~50% (approx. 64 bits) of Ciphertext after Round 2 [EDUCATIONAL EXAMPLE]',
            'MDS (Maximum Distance Separable) Branch Number of MixColumns = 5 (minimum active input + output bytes across linear layer) [OFFICIAL SPECIFICATION]',
          ],
          workedExample:
            'Active bytes across 4 consecutive AES rounds guarantee at least 25 active S-Boxes, bounding maximum differential and linear trail probabilities far below 2^{-128}.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Hardware SPN consequence: unlike Feistel networks where encrypt/decrypt share identical round hardware, an AES SPN requires inverse datapaths (`InvSubBytes`, `InvShiftRows`, `InvMixColumns`) for ECB/CBC decryption—unless S-Boxes share the composite GF(2^8) inverter with pre/post affine muxes (`aes_sub_bytes.sv`), cutting ASIC area nearly in half.',
          cornerCasesAndFailures: [
            {
              symptom: 'Encryption succeeds but Decryption mismatches golden model',
              rootCause: 'Round step order mismatch or applying MixColumns on the wrong round boundary during reverse cipher (`InvShiftRows -> InvSubBytes -> AddRoundKey -> InvMixColumns`).',
              detection: 'Formal equivalence & UVM BoringSSL encrypt->decrypt loopback scoreboarding.',
            },
          ],
          verificationAndTradeoffs:
            'Sharing GF(2^8) inverters across encrypt/decrypt muxes reduces area ~35–40% compared to separate forward/inverse ROM tables while preserving single-cycle round execution.',
        },
      },
    ],
  },
  {
    id: 'ch02',
    number: '02',
    title: 'AES Algorithm',
    overview:
      'Step-by-step transformations operating on the 4×4 byte State Matrix across Round 0, Regular Rounds 1..(Nr-1), and Final Round Nr.',
    subtopics: [
      {
        id: 'key-expansion',
        chapterId: 'ch02',
        title: 'Key Expansion',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'FIPS 197 Section 5.2', path: 'KeyExpansion() Algorithm' },
          { label: 'OpenTitan aes_key_expand.sv', path: 'hw/ip/aes/rtl/aes_key_expand.sv', url: 'https://github.com/lowRISC/opentitan/blob/master/hw/ip/aes/rtl/aes_key_expand.sv' },
        ],
        level1Fundamental: {
          summary:
            'AES cannot reuse the exact same 128-bit key on all 10 rounds—otherwise an attacker could cancel out repeated structure. Key Expansion stretches the single master key into 11 unique round keys (for AES-128), one for Round 0 plus one per round.',
          everydayAnalogy:
            'Like changing the combination on each vault door down a 10-door hallway using a deterministic recipe derived from your master key—rotating words, scrambling via the S-Box, and XORing a round counter (`Rcon`) so every door has a distinct pattern.',
          whatHappensStepByStep: [
            '1. RotWord: Rotates the 4 bytes of the last 32-bit key word cyclically left by 1 byte ([b0,b1,b2,b3] -> [b1,b2,b3,b0]).',
            '2. SubWord: Passes those 4 bytes through the exact same AES S-Box to break linearity.',
            '3. Rcon XOR: XORs the top byte with the round constant Rcon[i] = 2^(i-1) in GF(2^8) to destroy symmetry between rounds.',
            '4. Chain XOR: Computes each new 32-bit word W[i] = W[i-Nk] ^ Temp.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'For AES-128 (Nk=4), Nr=10 requires 44 words (11 round keys × 128 bits). AES-192 generates 52 words (Nk=6, Nr=12). AES-256 generates 60 words (Nk=8, Nr=14) and inserts an extra `SubWord` step whenever `i mod 8 == 4`.',
          keyParametersOrMath: [
            'Rcon[1..10] in hex: 01, 02, 04, 08, 10, 20, 40, 80, 1B, 36 (computed via `xtime`) [OFFICIAL SPECIFICATION]',
            'OpenTitan stores up to 256 bits in `key_full_q` and generates the next round key concurrently with the cipher round [OBSERVED IN RTL]',
          ],
          workedExample:
            'Key[0..3] = 2b7e1516 28aed2a6 abf71588 09cf4f3c. RotWord(09cf4f3c)=cf4f3c09 -> SubWord=8a84eb01 -> ^ Rcon[1](01000000) = 8b84eb01 -> ^ 2b7e1516 = a0fafe17 (Word W[4]).',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Reverse key scheduling for decryption: `aes_key_expand.sv` supports both forward and backward expansion on-the-fly! Before CBC/ECB decryption starts, the initial key is pre-expanded Nr cycles (`INIT` phase) to reach the final round key (`KEY_DEC`), or software reuses cached `key_dec` if the key did not change—avoiding a 10–14 cycle latency penalty per block.',
          cornerCasesAndFailures: [
            {
              symptom: 'Rcon wraps wrongly after Round 8 (0x80)',
              rootCause: 'Treating Rcon as regular binary integer 0x100 truncated to 0x00 instead of GF(2^8) xtime(0x80) = 0x1B.',
              detection: 'FIPS-197 Appendix A/B vector check (Round 9 uses Rcon=0x1B, Round 10 uses 0x36).',
            },
            {
              symptom: 'Decryption key mismatch when key updated between blocks',
              rootCause: 'Control FSM skipped re-running `KEY_DEC` generation on new key write.',
              detection: 'OpenTitan `aes_control.sv` tracks key register dirty flags (`key_init_new_d/q`) and enforces `KEY_DEC` re-generation.',
            },
          ],
          verificationAndTradeoffs:
            'On-the-fly KeyExpand saves 10×128 = 1,280+ flip-flops per share (2,560+ flops when DOM masked!), at the cost of 10–14 cycles initialization delay on decryption key changes.',
        },
      },
      {
        id: 'sub-bytes',
        chapterId: 'ch02',
        title: 'SubBytes',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'FIPS 197 Section 5.1.1', path: 'SubBytes() & S-Box' },
          { label: 'OpenTitan aes_sub_bytes.sv', path: 'hw/ip/aes/rtl/aes_sub_bytes.sv', url: 'https://github.com/lowRISC/opentitan/blob/master/hw/ip/aes/rtl/aes_sub_bytes.sv' },
        ],
        level1Fundamental: {
          summary:
            'SubBytes is the ONLY nonlinear operation in all of AES. Each of the 16 bytes in the 4×4 State Matrix is replaced independently by looking up or computing its 8-bit S-Box output.',
          everydayAnalogy:
            'Think of 16 parallel scrambled decoder wheels—every byte goes in and comes out completely transformed, hiding simple addition/XOR patterns from cryptanalysts.',
          whatHappensStepByStep: [
            '1. Multiplicative Inverse: Computes byte^{-1} in GF(2^8) (mapping 0x00 -> 0x00).',
            '2. Affine Transformation: Rotates bits and XORs with constant 0x63 to destroy algebraic simplicity in GF(2^8).',
            '3. Parallel Application: All 16 bytes transform simultaneously in hardware (`gen_sbox[0..3][0..3]`).',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'SubBytes achieves optimal differential uniformity (4) and maximal nonlinearity (112) over 8-bit bijections. `InvSubBytes` reverses the affine transform first, then takes the identical GF(2^8) inverse.',
          keyParametersOrMath: [
            'S(x) = A * x^{-1} + 0x63 in GF(2) (where A is an 8x8 circulant matrix) [OFFICIAL SPECIFICATION]',
            'Parallelism: OpenTitan instantiates 16 S-Boxes in `aes_sub_bytes.sv` + 4 S-Boxes in `aes_key_expand.sv` = 20 S-Boxes total [OBSERVED IN RTL]',
          ],
          workedExample:
            'Byte 0x19 -> inv(0x19) in GF(2^8) = 0xD2 -> Affine(0xD2) = 0xD4 (matches FIPS-197 S-Box row 1, col 9 = 0xD4).',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'DOM masked S-Box (`SecSBoxImpl=SBoxImplDom`) splits every byte into two random shares (x = x0 ^ x1), propagating fresh PRNG masking entropy (`prd_masking`) through decomposed GF(2^2) multipliers (`aes_sbox_dom.sv`) with pipeline registers inside `aes_cipher_control` (`5 cycles per round` when masked vs `1 cycle per round` when unmasked LUT/Canright!).',
          cornerCasesAndFailures: [
            {
              symptom: 'DOM masked S-Box fails TVLA power leakage test after synthesis',
              rootCause: 'EDA synthesis merged/reordered gates across Share 0 and Share 1 combinational cones, causing temporary glitches proportional to secret `x`.',
              detection: 'Insert explicit flip-flop synchronization barriers between masked GF stages + apply ASIC `dont_touch` constraints.',
            },
          ],
          verificationAndTradeoffs:
            'LUT S-Box: fast (1 cycle/round), bad for DOM masking & often bigger in ASIC. Canright Tower Field: smallest unmasked area. DOM: 5 cycles/round throughput trade-off for 1st-order DPA side-channel immunity.',
        },
      },
      {
        id: 'shift-rows',
        chapterId: 'ch02',
        title: 'ShiftRows',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'FIPS 197 Section 5.1.2', path: 'ShiftRows()' },
          { label: 'OpenTitan aes_shift_rows.sv', path: 'hw/ip/aes/rtl/aes_shift_rows.sv', url: 'https://github.com/lowRISC/opentitan/blob/master/hw/ip/aes/rtl/aes_shift_rows.sv' },
        ],
        level1Fundamental: {
          summary:
            'ShiftRows cyclically shifts each row of the 4×4 State Matrix sideways by a different offset (Row 0 by 0, Row 1 by 1, Row 2 by 2, Row 3 by 3) so bytes no longer stay trapped in their original vertical column.',
          everydayAnalogy:
            'Like sliding rows on a Rubik’s cube—Row 0 stays still while Rows 1, 2, and 3 slide left 1, 2, and 3 slots so vertical columns get thoroughly scrambled before MixColumns stirs each column.',
          whatHappensStepByStep: [
            'Row 0: No shift (stays in place).',
            'Row 1: Circular left shift by 1 byte (right shift by 1 during `InvShiftRows`).',
            'Row 2: Circular left shift by 2 bytes.',
            'Row 3: Circular left shift by 3 bytes.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Without ShiftRows, AES columns would act as four completely independent 32-bit ciphers! ShiftRows guarantees the 4 bytes of any single input column scatter into all 4 distinct output columns.',
          keyParametersOrMath: [
            'Forward ShiftRows: s’[r][c] = s[r][(c + r) mod 4] [OFFICIAL SPECIFICATION]',
            'Hardware gate cost: ZERO logic gates (pure wire permutation, or 2:1 byte muxes when toggling Encrypt vs Decrypt) [OBSERVED IN RTL]',
          ],
          workedExample:
            'Row 1 `[d4, e0, b8, 1e]` under Encrypt shifts left by 1 -> `[e0, b8, 1e, d4]`. Under Decrypt (`InvShiftRows`) shifts right by 1 -> back to `[d4, e0, b8, 1e]`.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'In `aes_shift_rows.sv`, ShiftRows costs zero combinational delay beyond a single `op_i` mux because byte indices are wired statically! Note that OpenTitan routes `data_i[r][c]` in 4×4×8-bit unpacked/packed array order matching column-major FIPS-197 indexing (`in[0..3]` = Col 0).',
          cornerCasesAndFailures: [
            {
              symptom: 'Row-major vs Column-major endianness bug scrambles state',
              rootCause: 'Loading 32-bit bus words into rows instead of columns when feeding TL-UL `DATA_IN_0..3`.',
              detection: 'Verify against FIPS-197 Appendix B intermediate state vectors after Round 1 `ShiftRows`.',
            },
          ],
          verificationAndTradeoffs:
            'Pure wiring costs zero dynamic power and zero timing slack; masked implementations apply the exact same wire permutation independently to Share 0 and Share 1 without extra PRNG randomness.',
        },
      },
      {
        id: 'mix-columns',
        chapterId: 'ch02',
        title: 'MixColumns',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'FIPS 197 Section 5.1.3', path: 'MixColumns() Matrix Multiplication' },
          { label: 'OpenTitan aes_mix_columns.sv', path: 'hw/ip/aes/rtl/aes_mix_columns.sv', url: 'https://github.com/lowRISC/opentitan/blob/master/hw/ip/aes/rtl/aes_mix_columns.sv' },
        ],
        level1Fundamental: {
          summary:
            'MixColumns blends all 4 bytes inside each vertical column together using finite-field multiplication and XOR, ensuring every output byte depends mathematically on all 4 bytes of its column.',
          everydayAnalogy:
            'Think of blending 4 paint colors inside each vertical column cup—now one tiny speck of dye in the top byte tints all 4 bytes in that column!',
          whatHappensStepByStep: [
            'Each 4-byte column is multiplied by a fixed 4×4 MDS matrix `{02, 03, 01, 01}` over GF(2^8).',
            'Each output byte mixes 2x, 3x, 1x, and 1x of the column’s 4 bytes via XOR.',
            'All 4 columns run independently in parallel in hardware.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Forward MixColumns uses tiny coefficients `{01, 02, 03}` (super fast in hardware), whereas Inverse MixColumns uses `{0E, 0B, 0D, 09}` (heavier XOR depth unless factored).',
          keyParametersOrMath: [
            's’_0 = ({02}*s_0) ^ ({03}*s_1) ^ s_2 ^ s_3 [OFFICIAL SPECIFICATION]',
            'OpenTitan `aes_mix_single_column.sv` shares `xtime`/`mul2`/`mul4` blocks between forward (`01,02,03`) and inverse (`09,0B,0D,0E`) modes [OBSERVED IN RTL]',
          ],
          workedExample:
            'Column `[d4, bf, 5d, 30]`: `02*d4 ^ 03*bf ^ 5d ^ 30` = `(b3) ^ (da^bf=65? wait: xtime(bf)=65 ^ bf=da) ^ 5d ^ 30` -> exact FIPS-197 result `04`!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Because `InvMixColumns` uses `{0E, 0B, 0D, 09}`, naive implementation triples XOR gate depth compared to forward `{02, 03, 01, 01}`. OpenTitan decomposes `InvMixColumns(x) = MixColumns(PreMix(x))` using shared `mul2` / `mul4` layers—cutting critical path and ASIC area simultaneously. Wait: remember Final Round OMITS MixColumns!',
          cornerCasesAndFailures: [
            {
              symptom: 'Decryption fails Equivalent Inverse Cipher check',
              rootCause: 'For Equivalent Inverse Cipher ordering (`InvSubBytes -> InvShiftRows -> InvMixColumns -> AddRoundKey`), all middle round keys must themselves be pre-transformed by `InvMixColumns`!',
              detection: 'Ensure `aes_key_expand` applies `aes_mix_columns` on intermediate decrypt round keys when hardware runs Equivalent Inverse ordering.',
            },
          ],
          verificationAndTradeoffs:
            'Because MixColumns is purely linear over GF(2), in DOM masking `MixColumns(x0 ^ x1) = MixColumns(x0) ^ MixColumns(x1)`—no fresh randomness is needed!',
        },
      },
      {
        id: 'add-round-key',
        chapterId: 'ch02',
        title: 'AddRoundKey',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'FIPS 197 Section 5.1.4', path: 'AddRoundKey()' },
          { label: 'OpenTitan aes_cipher_core.sv', path: 'hw/ip/aes/rtl/aes_cipher_core.sv' },
        ],
        level1Fundamental: {
          summary:
            'AddRoundKey simply XORs the current 128-bit State Matrix bit-for-bit with the active 128-bit Round Key for that step.',
          everydayAnalogy:
            'Like turning the secret key inside the lock—every round’s scrambling is mixed with secret key material via a single row of 128 XOR gates.',
          whatHappensStepByStep: [
            '1. Round 0 (Initial Key Whitening): Plaintext XOR Key[0] happens BEFORE Round 1 so attackers cannot peel off Round 1 unkeyed.',
            '2. Rounds 1..Nr: Output of MixColumns (or ShiftRows in Final Round) is XORed with RoundKey[r].',
            '3. Hardware executes all 128 XORs in 1 single logic gate delay.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Because XOR is self-inverse (`(A ^ K) ^ K = A`), AddRoundKey is completely identical for both encryption and decryption!',
          keyParametersOrMath: [
            'State_next[i] = State[i] ^ RoundKey_r[i] for all 128 bits [OFFICIAL SPECIFICATION]',
            'OpenTitan applies AddRoundKey independently to Share 0 (using Key Share 0) and Share 1 (using Key Share 1) [OBSERVED IN RTL]',
          ],
          workedExample:
            'Round 0 Whitening: State `32 43 f6 a8...` ^ Key `2b 7e 15 16...` = `19 3d e3 be...`, feeding straight into Round 1 SubBytes.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Note on Share Independence: When `SecMasking=1`, State and Key are EACH split into two shares: `S = S0 ^ S1`, `K = K0 ^ K1`. Thus `S0 ^ K0` and `S1 ^ K1` compute the masked AddRoundKey in parallel without ever recombining secret shares (`S0 ^ S1`) on a physical wire!',
          cornerCasesAndFailures: [
            {
              symptom: 'Power spike leaks Hamming Distance at Round 0 / Final Round register update',
              rootCause: 'Overwriting State register from old plaintext/ciphertext directly into new plaintext creates strong transition correlation.',
              detection: 'OpenTitan clears state/key registers with PRNG pseudo-random data (`STATE_CLEAR`) between unrelated blocks if triggered.',
            },
          ],
          verificationAndTradeoffs:
            'Zero combinational bottleneck (1 XOR gate), negligible area, and trivially reversible.',
        },
      },
      {
        id: 'final-round',
        chapterId: 'ch02',
        title: 'Final Round',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'FIPS 197 Section 5.1', path: 'Cipher() Final Round nr' },
          { label: 'OpenTitan aes_cipher_control.sv', path: 'hw/ip/aes/rtl/aes_cipher_control.sv' },
        ],
        level1Fundamental: {
          summary:
            'The very last AES round (Round 10 for AES-128, Round 12 for 192, Round 14 for 256) deliberately SKIPS MixColumns!',
          everydayAnalogy:
            'An unkeyed linear shuffle at the very end would give attackers zero extra security because anyone could invert MixColumns cleanly without knowing the key—so AES skips it to save power, time, and make Encrypt/Decrypt cleanly symmetric.',
          whatHappensStepByStep: [
            '1. Run SubBytes on the 16-byte state.',
            '2. Run ShiftRows across the 4 rows.',
            '3. Bypass MixColumns via a 2:1 multiplexer (`rnd_ctr_q == num_rounds_q`).',
            '4. Execute final AddRoundKey with the last round key to produce final Ciphertext!',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Skipping MixColumns in round Nr is both mathematically sound (linear layers with no trailing key XOR add zero cryptographic strength) and required for Equivalent Inverse Decryption symmetry.',
          keyParametersOrMath: [
            'Regular Round (1..Nr-1): AddRoundKey(MixColumns(ShiftRows(SubBytes(State)))) [OFFICIAL SPECIFICATION]',
            'Final Round (Nr): AddRoundKey(ShiftRows(SubBytes(State))) [OFFICIAL SPECIFICATION]',
          ],
          workedExample:
            'At `rnd_ctr_q == 4\'d10` in AES-128, `aes_cipher_core.sv` sets `mix_columns_en = 1\'b0` (mux bypasses `aes_mix_columns` output), driving `ShiftRows -> AddRoundKey -> DATA_OUT_0..3`.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'In `aes_cipher_core.sv`, `state_mux_sel` selects from `{STATE_INIT, STATE_ROUND, STATE_CLEAR}`, while `add_rk_sel` switches between `{ADD_RK_INIT, ADD_RK_ROUND, ADD_RK_FINAL}` so the final round cleanly bypasses `aes_mix_columns` while still feeding `AddRoundKey` into output registers.',
          cornerCasesAndFailures: [
            {
              symptom: 'Ciphertext matches golden model through Round 9 but completely mismatches on Final Round',
              rootCause: 'Off-by-one bug on `num_rounds` leaving MixColumns enabled on Round 10.',
              detection: 'Unit test checking intermediate round outputs + `sva` asserting `!mix_columns_en` whenever `rnd_ctr_q == num_rounds`.',
            },
          ],
          verificationAndTradeoffs:
            'Final round mux adds ~1 mux delay; disabling MixColumns clock/inputs when unused saves dynamic switching power on final cycle.',
        },
      },
    ],
  },
  {
    id: 'ch03',
    number: '03',
    title: 'Hardware Architecture',
    overview:
      'Microarchitectural partitioning separating heavy 128-bit cryptographic datapaths, control sequencers, S-Box options, and masked state/key registers.',
    subtopics: [
      {
        id: 'datapath',
        chapterId: 'ch03',
        title: 'Datapath',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan aes_cipher_core.sv', path: 'hw/ip/aes/rtl/aes_cipher_core.sv' },
        ],
        level1Fundamental: {
          summary:
            'The datapath is the "heavy machinery" carrying 128-bit data blocks and 256-bit keys through SubBytes, ShiftRows, MixColumns, and AddRoundKey on every round.',
          everydayAnalogy:
            'Imagine a wide 128-lane highway looping once per round back into the State Register flip-flops until all 10, 12, or 14 laps finish.',
          whatHappensStepByStep: [
            '1. Input Mux loads 128-bit plaintext (or chained IV ^ plaintext) into the State Register.',
            '2. Round loop pushes 128 bits iteratively through `SubBytes -> ShiftRows -> MixColumns -> AddRoundKey`.',
            '3. Output wires latch finished ciphertext (or plain ^ keystream) out to `DATA_OUT_0..3`.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'OpenTitan uses an iterative 128-bit wide architecture (processing all 16 bytes in parallel per round, NOT an 8-bit serial or 10-stage unrolled pipeline), balancing compact ASIC area (~25–90 kGE depending on masking) against fast 10–56 cycle latency.',
          keyParametersOrMath: [
            'Datapath width: 128 bits per share (256 bits total when `SecMasking=1`) [OBSERVED IN RTL]',
            'Round throughput (Unmasked): 1 round/cycle -> 11–15 cycles/block [OBSERVED IN RTL]',
            'Round throughput (DOM Masked): 5 cycles/round due to S-Box pipeline barriers -> ~56 cycles/AES-128 block [OBSERVED IN RTL]',
          ],
          workedExample:
            'Iterative folding reuses the same 16 S-Boxes and 4 MixColumns units 10 times rather than stamping 10 copies in space (which would consume 10x silicon area).',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Two-share Boolean masking (`num_shares = SecMasking ? 2 : 1`) replicates the linear State Register, Key Register, ShiftRows, MixColumns, and KeyExpand storage across shares `[0]` and `[1]`, joined inside `aes_sub_bytes` via DOM masked multipliers fed by `aes_prng_masking`.',
          cornerCasesAndFailures: [
            {
              symptom: 'Pipeline hazard stalls when `DATA_OUT` not drained before next `DATA_IN` arrives',
              rootCause: 'Single State Register holds live output ciphertext until host software reads all 4 words.',
              detection: 'Dual-buffer shadow registers on `data_in` / `data_out` let host write Block N+1 while Block N encrypts!',
            },
          ],
          verificationAndTradeoffs:
            'Unrolling 10 rounds hits >10 Gbps for NICs/PCIe MACsec but consumes massive area and DOM randomness bandwidth; OpenTitan’s iterative 128-bit datapath matches flash/root-of-trust bandwidth cleanly.',
        },
      },
      {
        id: 'control-unit',
        chapterId: 'ch03',
        title: 'Control Unit',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan aes_control.sv', path: 'hw/ip/aes/rtl/aes_control.sv' },
          { label: 'OpenTitan aes_cipher_control.sv', path: 'hw/ip/aes/rtl/aes_cipher_control.sv' },
        ],
        level1Fundamental: {
          summary:
            'OpenTitan splits control cleanly into two brains: the Outer Controller (`aes_control`) handles modes, IVs, and bus handshakes; the Inner Controller (`aes_cipher_control`) counts rounds 1..Nr and steers the muxes.',
          everydayAnalogy:
            'The Outer Controller is the shift manager taking customer orders (`DATA_IN`, CBC chaining); the Inner Controller is the machine operator counting laps (Round 1 to 10) inside the cipher core.',
          whatHappensStepByStep: [
            '1. Outer control watches TL-UL writes to `DATA_IN_0..3` (automatic mode) or `TRIGGER.START` (manual mode).',
            '2. Outer control requests `aes_cipher_core` via sparse `in_valid_o / in_ready_i` handshake.',
            '3. Inner control steps through rounds, updates `rnd_ctr_q`, triggers PRNG steps, and signals `out_valid_o`.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Decoupling block-cipher mode logic (`aes_control.sv`) from round sequencing (`aes_cipher_control.sv`) lets `aes_cipher_core` stay purely round-focused and makes formal verification modular.',
          keyParametersOrMath: [
            'Handshake encoding: Sparse multi-bit 2-phase/4-bit `sp2v_e` signals (`SP2V_HIGH`, `SP2V_LOW`) resist single-bit glitch faults [OBSERVED IN RTL]',
            'Auto-clear feature: `CTRL_SHADOWED.MANUAL_OPERATION=0` automatically starts encryption upon writing `DATA_IN_3` [OBSERVED IN RTL]',
          ],
          workedExample:
            'During CBC decryption, `aes_control` saves input ciphertext `data_in_prev` in a feedback register while `aes_cipher_core` decrypts it, then XORs `data_out` with `iv_q` at the exit!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Both FSMs enforce sparse Hamming-distance state encodings (`aes_control_fsm.sv`, `aes_cipher_control_fsm.sv`) wrapped in redundant state-check comparators (`aes_control_fsm_p` / `_n` or sparse integrity) that immediately assert `alert_fatal_o` if an illegal glitch state is ever sampled.',
          cornerCasesAndFailures: [
            {
              symptom: 'Deadlock when PRNG reseed (`prng_reseed_req`) coincides with stall',
              rootCause: 'Cipher waits for EDN entropy while EDN waits on system clock or fatal alert lock.',
              detection: 'Verify `aes_control` timeouts/backpressure SVA under asynchronous slow `clk_edn_i` clocks.',
            },
          ],
          verificationAndTradeoffs:
            'Sparse state encodings consume more state flip-flops than binary/one-hot encodings, in exchange for immediate single/double bit-flip fault detection.',
        },
      },
      {
        id: 's-box',
        chapterId: 'ch03',
        title: 'S-Box',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan aes_sbox.sv & variants', path: 'hw/ip/aes/rtl/aes_sbox_dom.sv' },
        ],
        level1Fundamental: {
          summary:
            'The S-Box ("Substitution Box") is the core scrambling table taking 1 byte (8 bits) in and producing 1 scrambled byte out. It can be built as a lookup table, compact algebra equations, or side-channel-masked gates.',
          everydayAnalogy:
            'A miniature tamper-resistant decoder ring—small versions run fast on paper (LUT), clever algebraic versions fold math compactly (Canright), and armored versions mix random noise inside every gear (DOM).',
          whatHappensStepByStep: [
            'LUT (`SBoxImplLut`): Precomputed 256-byte constant table.',
            'Canright (`SBoxImplCanright`): Decomposes GF(2^8) into GF(2^4) and GF(2^2) equations.',
            'DOM (`SBoxImplDom`): Splits signals into 2 shares plus PRNG random shares (`prd_i`) across registered stages.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'OpenTitan exposes parameter `SecSBoxImpl` so integrators can choose area/speed (FPGA LUT vs ASIC Canright) or full 1st-order DPA resistance (DOM).',
          keyParametersOrMath: [
            'Unmasked LUT / Canright S-Box latency: 0 pipeline stages (pure combinational, 1 cycle/round) [OBSERVED IN RTL]',
            'DOM Masked S-Box (`aes_sbox_dom.sv`): 4 internal register stages -> 5 cycles/round, consumes 18–28 bits PRNG randomness per S-Box [OBSERVED IN RTL]',
          ],
          workedExample:
            'On an FPGA prototype with `SecMasking=0`, switching `SecSBoxImpl` to `SBoxImplLut` lets Vivado pack each S-Box into compact 6-input LUTs.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Canright’s tower field (`aes_sbox_canright_pkg.sv`) maps GF(2^8) -> GF((2^4)^2) -> GF(((2^2)^2)^2). Notice why this enables `SBoxImplDom`: in GF(2^2), multiplication has algebraic degree 2 (`x * y`), allowing exact 2-share Domain-Oriented Masking formulas (`a0*b0`, `a0*b1 ^ z`, `a1*b0 ^ z`, `a1*b1`) with synchronized registers separating each nonlinear multiplication layer!',
          cornerCasesAndFailures: [
            {
              symptom: 'Glitches inside combinational multiplier leak secret share correlations',
              rootCause: 'Missing pipeline registers between independent DOM cross-domain products (`a0*b1 + z` arriving slightly before/after `a1*b0 + z`).',
              detection: 'Pre-register resharing terms + formal masking verification (e.g., Coco / Alma leakage analysis) + CW310 TVLA.',
            },
          ],
          verificationAndTradeoffs:
            'DOM masking costs ~5x latency and ~3x–4x area per S-Box compared to Canright unmasked, but pushes TVLA side-channel t-test leakage below threshold even after millions of power traces.',
        },
      },
      {
        id: 'key-register',
        chapterId: 'ch03',
        title: 'Key Register',
        evidenceTags: ['[OBSERVED IN RTL]', '[OBSERVED IN VERIFICATION]'],
        sourceRefs: [
          { label: 'OpenTitan Key Registers', path: 'hw/ip/aes/rtl/aes_core.sv & aes_cipher_core.sv' },
        ],
        level1Fundamental: {
          summary:
            'The Key Register stores both the master initial key (written by software or sideloaded secretly from Key Manager) and the running round key mutating during each cipher round.',
          everydayAnalogy:
            'Two locked drawers: Drawer 1 holds your original key safely untouched across multiple blocks; Drawer 2 holds the temporary working key modified lap-by-lap during rounds, then gets shredded (`PRNG clear`) when finished.',
          whatHappensStepByStep: [
            '1. Master Key enters via 8 shadowed write-only CSRs (`KEY_SHARE0_0..7` & `KEY_SHARE1_0..7`) OR `keymgr_key_i` sideload.',
            '2. Cipher copies Master Key into `key_full_q` at `Round 0`.',
            '3. Each round overwrites `key_full_q` with the newly expanded round key, leaving `key_init_q` intact for the next block.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Software key registers are strictly Write-Only (reading `KEY_SHARE*` returns 0 or bus error—keys can NEVER be read back over TL-UL!). When `SecMasking=1`, software writes two random shares such that `Key = Share0 ^ Share1`.',
          keyParametersOrMath: [
            'Key Share width: 256 bits × 2 shares = 512 flip-flops (`key_init_q`), plus 512 flip-flops (`key_full_q`) + decryption cache (`key_dec_q`) [OBSERVED IN RTL]',
            'Clear command: `TRIGGER.KEY_IV_DATA_IN_CLEAR=1` overwrites shares with fresh PRNG outputs from `aes_prng_clearing` [OBSERVED IN RTL]',
          ],
          workedExample:
            'If software loads `SIDELOAD=1` in `CTRL_SHADOWED`, `aes_core` completely ignores CSR keys and multiplexes `keymgr_key_i.key[0..1]` directly into `aes_cipher_core`.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'If `keymgr` asserts `keymgr_key_i.valid=0` mid-operation or raises a sideload error, `aes_core` halts or blocks invalid key consumption. On a fatal integrity/FSM fault alert, `aes` actively clears `key_init`, `key_full`, `key_dec`, and `state` registers continuously until reset (`rst_ni`).',
          cornerCasesAndFailures: [
            {
              symptom: 'Key leakage across context switch between secure & unprivileged tasks',
              rootCause: 'Firmware forgot to trigger `KEY_IV_DATA_IN_CLEAR` after finishing a sensitive decryption before handing hardware to next driver.',
              detection: 'DV security tests verifying residual key zeroization/PRNG overwrite after clear and fatal alerts.',
            },
          ],
          verificationAndTradeoffs:
            'Separating `key_init_q` and `key_full_q` avoids forcing software to reload 256-bit keys before every 128-bit block, doubling multi-block throughput while keeping software key reads impossible.',
        },
      },
      {
        id: 'state-register',
        chapterId: 'ch03',
        title: 'State Register',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL SPECIFICATION]'],
        sourceRefs: [
          { label: 'OpenTitan State Mux & Flip-Flops', path: 'hw/ip/aes/rtl/aes_cipher_core.sv' },
        ],
        level1Fundamental: {
          summary:
            'The State Register is a bank of 128 flip-flops storing the 4×4 matrix of bytes currently bouncing through AES rounds.',
          everydayAnalogy:
            'Like the scoreboard tray sitting in the center of the cipher loop—on every round tick it catches the newly scrambled bytes and feeds them back around for the next round.',
          whatHappensStepByStep: [
            '1. `STATE_INIT`: Loads initial plaintext ^ Key0 at Round 0.',
            '2. `STATE_ROUND`: Captures output of `SubBytes -> ShiftRows -> MixColumns -> AddRoundKey` on Rounds 1..Nr.',
            '3. `STATE_CLEAR`: Overwrites state with pseudo-random data from `aes_prng_clearing` so no plaintext/ciphertext lingers inside silicon!',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Physically organized as `logic [3:0][3:0][7:0] state_q [NumShares]` matching FIPS-197 column/row coordinates (`state[row][col][7:0]`).',
          keyParametersOrMath: [
            'Register size: 128 bits (unmasked) or 256 bits (`2 × 128` bits when `SecMasking=1`) [OBSERVED IN RTL]',
            'Control mux (`state_sel_i`): `STATE_INIT`, `STATE_ROUND`, `STATE_CLEAR` [OBSERVED IN RTL]',
          ],
          workedExample:
            'Whenever a new block enters while the previous block finishes, `STATE_CLEAR` scrubs residual intermediate round correlations between blocks to suppress cross-block DPA.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Why scrub flip-flops with PRNG bits instead of zeros (`0x00`)? Clearing to zeros creates a huge power spike proportional to the Hamming Weight (`HW(State)`) of the secret intermediate value! Clearing with uniform PRNG output (`STATE_CLEAR`) destroys Hamming Weight leakage during register zeroization.',
          cornerCasesAndFailures: [
            {
              symptom: 'Power spike detected right after block completion reveals last-round state',
              rootCause: 'Resetting `state_q` synchronously to 0x00 instead of PRNG random bits.',
              detection: 'Assert `state_q` receives `prd_clearing` (never constant 0) on `STATE_CLEAR` mux transition.',
            },
          ],
          verificationAndTradeoffs:
            'Adding an explicit `STATE_CLEAR` cycle slightly increases per-block latency (+1 cycle) when clearing is enabled, in exchange for eliminating lingering data-dependent Hamming-weight leakage.',
        },
      },
    ],
  },
  {
    id: 'ch04',
    number: '04',
    title: 'RTL Implementation',
    overview:
      'Actual SystemVerilog module structure, sparse internal control signals, multi-FSM handshakes, and cycle-accurate data flow inside lowRISC OpenTitan hw/ip/aes.',
    subtopics: [
      {
        id: 'module-hierarchy',
        chapterId: 'ch04',
        title: 'Module Hierarchy',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan aes.sv', path: 'hw/ip/aes/rtl/aes.sv', url: 'https://github.com/lowRISC/opentitan/blob/master/hw/ip/aes/rtl/aes.sv' },
          { label: 'OpenTitan aes_core.sv', path: 'hw/ip/aes/rtl/aes_core.sv', url: 'https://github.com/lowRISC/opentitan/blob/master/hw/ip/aes/rtl/aes_core.sv' },
        ],
        level1Fundamental: {
          summary:
            'OpenTitan builds AES cleanly like nested Lego modules: `aes.sv` is the outer chip wrapper; inside live `aes_reg_top` (bus wall socket) and `aes_core` (brain), which holds `aes_cipher_core` (round engine) and PRNGs.',
          everydayAnalogy:
            'Think of nested Russian dolls: Shell 1 (`aes`) handles chip pins and alarms; Shell 2 (`aes_core`) handles modes and bus registers; Shell 3 (`aes_cipher_core`) does pure 128-bit round math using small leaf cells (`aes_sub_bytes`, `aes_mix_columns`).',
          whatHappensStepByStep: [
            'Top (`aes.sv`): Instantiates `aes_reg_top`, `aes_core`, and `prim_alert_sender` fault transmitters.',
            'Middle (`aes_core.sv`): Instantiates `aes_control`, `aes_cipher_core`, `aes_prng_clearing`, and EDN CDC synchronizers.',
            'Cipher Core (`aes_cipher_core.sv`): Instantiates `aes_cipher_control`, `aes_sub_bytes`, `aes_shift_rows`, `aes_mix_columns`, `aes_key_expand`, and `aes_prng_masking`.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Auto-generated register top (`aes_reg_top.sv`) comes deterministically from `hw/ip/aes/data/aes.hjson` via OpenTitan `reggen`—ensuring documentation, C headers, UVM RAL models, and RTL CSRs never drift out of sync.',
          keyParametersOrMath: [
            '12+ synthesizable SystemVerilog RTL modules under `hw/ip/aes/rtl/` [OBSERVED IN RTL]',
            'Relies on OpenTitan `prim_*` primitives (`prim_subreg_shadow`, `prim_lfsr`, `prim_sync_reqack`, `prim_alert_sender`) [OBSERVED IN RTL]',
          ],
          workedExample:
            'Notice `aes_cipher_core` takes no knowledge of ECB/CBC/CTR modes or TL-UL addresses—it simply receives 128-bit masked state + key shares and outputs 128-bit transformed shares.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Inspecting `aes.sv`: `tlul_adapter_reg` inside `aes_reg_top.sv` checks Hsiao SECDED integrity BEFORE `reg2hw` reaches `aes_core.sv`. Any structural/shadow/FSM error bubbles upward via `alert_fatal_o` to `prim_alert_sender`, locking `aes_core` and asserting physical chip alerts.',
          cornerCasesAndFailures: [
            {
              symptom: 'Synthesis flattens boundary between `aes_sub_bytes` shares',
              rootCause: 'Toolchain flattens hierarchy and cross-optimizes Boolean terms across Share 0 and Share 1.',
              detection: 'Preserve module hierarchy boundaries / `dont_touch` attributes around DOM S-Box sub-stages during ASIC synthesis.',
            },
          ],
          verificationAndTradeoffs:
            'Keeping `aes_cipher_core` modular lets engineers swap S-Box microarchitectures (`SecSBoxImpl`) or extract the cipher engine into standalone cryptographic test harnesses.',
        },
      },
      {
        id: 'internal-signals',
        chapterId: 'ch04',
        title: 'Internal Signals',
        evidenceTags: ['[OBSERVED IN RTL]', '[DERIVED FROM RTL]'],
        sourceRefs: [
          { label: 'OpenTitan aes_pkg.sv', path: 'hw/ip/aes/rtl/aes_pkg.sv' },
        ],
        level1Fundamental: {
          summary:
            'Instead of plain 1-bit `valid` / `ready` wires where a single radiation flip could fake an encryption start, OpenTitan encodes critical internal control wires as multi-bit sparse patterns (`sp2v_e`).',
          everydayAnalogy:
            'Instead of unlocking a missile launch with a 1-bit switch (0 vs 1), hardware sends a 6-bit secret passphrase (`SP2V_HIGH = 6\'b011011` vs `SP2V_LOW = 6\'b100100`). Flipping 1 or 2 random bits immediately lands on an INVALID code and trips the alarm!',
          whatHappensStepByStep: [
            '`in_valid_i / in_ready_o`: Sparse multi-bit handshakes starting cipher operations.',
            '`state_d / state_q`: Next-state combinational wires vs registered flip-flop 4×4 matrices.',
            '`prd_masking`: Pseudo-random data bus feeding nonlinear DOM S-Box stages.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            '`aes_pkg.sv` defines enumerated sparse types (`sp2v_e`, `aes_op_e`, `aes_mode_e`, `key_len_e`, `state_sel_e`, `add_rk_sel_e`) with large minimum Hamming distance (~3–4 bits) between legal encodings.',
          keyParametersOrMath: [
            '`sp2v_e` width: 6 bits (Hamming distance 6 between `SP2V_HIGH` and `SP2V_LOW` complements!) [OBSERVED IN RTL]',
            '`aes_mode_e`: 6-bit sparse encoding for ECB, CBC, CFB, OFB, CTR, NONE [OBSERVED IN RTL]',
          ],
          workedExample:
            'Whenever an `aes_cipher_control` signal equals neither `SP2V_HIGH` nor `SP2V_LOW`, `sp2v_sig_err` goes high on that very cycle and raises a fatal security alert!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Crucial detail: `aes_core` drives buffered/registered sparse signals through `prim_buf` (`u_prim_buf_*`) cells in ASIC targets so synthesis tools cannot optimize multi-bit `sp2v_e` redundancy down to a single bit!',
          cornerCasesAndFailures: [
            {
              symptom: 'X-propagation or false fatal alert during simulation reset release',
              rootCause: 'Uninitialized `sp2v_e` signal defaults to `6\'b000000` instead of `SP2V_LOW` before reset completes.',
              detection: 'Reset all sparse signals explicitly to `SP2V_LOW` (`~rst_ni`) and verify with formal/SVA assertions.',
            },
          ],
          verificationAndTradeoffs:
            'Sparse 6-bit buses + `prim_buf` prevent synthesis collapse and provide deterministic single/multi-bit FI coverage with minimal wiring overhead on control paths.',
        },
      },
      {
        id: 'fsm',
        chapterId: 'ch04',
        title: 'FSM',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan aes_cipher_control_fsm.sv', path: 'hw/ip/aes/rtl/aes_cipher_control_fsm.sv' },
          { label: 'OpenTitan aes_control_fsm.sv', path: 'hw/ip/aes/rtl/aes_control_fsm.sv' },
        ],
        level1Fundamental: {
          summary:
            'Two cooperating Finite State Machines walk the chip cleanly through startup, key pre-expansion, 10–14 cipher rounds, result stall checks, and PRNG clearing—while locking permanently if tampered with.',
          everydayAnalogy:
            'A choreography checklist: `IDLE` (waiting) -> `INIT` (load plaintext + Key0) -> `ROUND` (loop Nr times) -> `FINISH` (deliver result) -> `CLEAR` (scrub traces), plus an emergency `ERROR` lock!',
          whatHappensStepByStep: [
            'IDLE: Waits for `in_valid_i == SP2V_HIGH` (encrypt/decrypt/clear request).',
            'INIT: Selects `STATE_INIT` and `KEY_INIT`, resets `rnd_ctr_q = 0`, computes Round 0 AddRoundKey.',
            'ROUND: Loops rounds `0..Nr-1`; if `SecMasking=1`, counts DOM sub-steps `0..4` per round.',
            'FINISH / CLEAR: Hands result back via `out_valid_o` or clears sensitive flip-flops; jumps to `ERROR` on any illegal state.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Generated with `sparse-fsm-encode.py` (`prim_sparse_fsm_flop`), guaranteeing minimum Hamming distance $\\ge 3$ between all legal states (`IDLE`, `INIT`, `ROUND`, `FINISH`, `CLEAR`, `PRNG_RESEED`, `ERROR`).',
          keyParametersOrMath: [
            '`aes_cipher_control_fsm`: Coordinates `sub_bytes_en`, `key_expand_en`, `state_we`, `key_full_we`, `rnd_ctr` [OBSERVED IN RTL]',
            'Reseed interlock: `aes_control_fsm` pauses cipher start whenever `prng_reseed_rate` block counter hits threshold until EDN answers [OBSERVED IN RTL]',
          ],
          workedExample:
            'In DOM masked mode, `aes_cipher_control` holds `sub_bytes_en` active across 5 clock cycles per round (`cipher_op` pipelines through `aes_sbox_dom` stages) before advancing `rnd_ctr_q` by 1.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Notice `ERROR` is a terminal sticky trap state: once an illegal sparse state, `sp2v_e` mismatch, or `alert_fatal_i` triggers `ERROR`, ONLY a full hardware reset (`rst_ni`) can recover the AES block, while outputs clamp cleanly and internal shares continuously scrub.',
          cornerCasesAndFailures: [
            {
              symptom: 'FSM wedges silently in `FINISH` state',
              rootCause: 'Software failed to read all 4 `DATA_OUT` registers or wrote new `DATA_IN` while `STATUS.STALL == 1`.',
              detection: 'Add monitor timeout/coverage tracking backpressure stall cycles and verify clean drain.',
            },
          ],
          verificationAndTradeoffs:
            'Fault-injection testing explicitly flips arbitrary bits inside `state_q` (`force`) in UVM/FPV to confirm 100% single/double-bit flips jump cleanly into `ERROR` + `alert_fatal_o`.',
        },
      },
      {
        id: 'data-flow',
        chapterId: 'ch04',
        title: 'Data Flow',
        evidenceTags: ['[OBSERVED IN RTL]', '[DERIVED FROM RTL]'],
        sourceRefs: [
          { label: 'OpenTitan AES Data Flow Spec', path: 'hw/ip/aes/rtl/aes_core.sv', url: 'https://opentitan.org/book/hw/ip/aes/#architecture' },
        ],
        level1Fundamental: {
          summary:
            'Data enters via 4 32-bit CSRs (`DATA_IN_0..3`), rides through the buffered pipeline so software can preload the NEXT block while the CURRENT block computes, and exits via `DATA_OUT_0..3`.',
          everydayAnalogy:
            'Think of a double-door airlock: while the cipher room is encrypting Parcel A, the host can already drop Parcel B into the waiting input staging tray so zero cycles are wasted between blocks!',
          whatHappensStepByStep: [
            '1. Input Stage (`data_in_q`): Host writes `DATA_IN_0..3`; when all 4 arrive (`STATUS.INPUT_READY` drops temporarily until cipher grabs them).',
            '2. Cipher Loop: `aes_cipher_core` crunches 128-bit state across 10/12/14 rounds.',
            '3. Output Stage (`data_out_q`): Holds completed ciphertext; cleared upon reading `DATA_OUT_3`, signaling ready for the next output.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Tracking individual 32-bit word writes/reads (`data_in_we`, `data_out_read`) eliminates unnecessary polling—in automatic mode, writing the 4th word (`DATA_IN_3`) automatically triggers block execution if `cipher` is ready.',
          keyParametersOrMath: [
            'Input/Output word order: `DATA_IN_0` = bytes 0..3 (LSBs), `DATA_IN_3` = bytes 12..15 [OBSERVED IN RTL]',
            'Auto-stall rule: If `OUTPUT_VALID==1` when Block N+1 finishes cipher rounds, `aes_control` stalls (`STATUS.STALL=1`) until host drains Block N [OBSERVED IN RTL]',
          ],
          workedExample:
            'Streaming 1 KB (64 blocks) over TL-UL: host reads `DATA_OUT_0..3` of Block `i`, writes `DATA_IN_0..3` of Block `i+2` immediately while Block `i+1` is actively encrypting inside `aes_cipher_core`!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'In `CBC` decrypt and `CFB`/`OFB`/`CTR` modes, `aes_core.sv` XORs `data_in` / `iv_q` OUTSIDE `aes_cipher_core` using dedicated feedback muxes (`data_in_prev_q`), guaranteeing `aes_cipher_core` data flow remains strictly 128-bit ECB round transforms.',
          cornerCasesAndFailures: [
            {
              symptom: 'Writing `DATA_IN` words out-of-order causes missed auto-trigger',
              rootCause: 'Writing `DATA_IN_0, 1, 2` without touching all 4 words leaves `data_in_new` incomplete.',
              detection: 'RTL tracks per-word write mask `data_in_we_q[3:0]`; trigger fires only when all 4 bits (`4\'b1111`) are set.',
            },
          ],
          verificationAndTradeoffs:
            '2-deep input/output decoupling overlaps TL-UL bus latency with round execution cycles, keeping the cipher core busy ~100% in pipelined DMA/burst software loops.',
        },
      },
    ],
  },
  {
    id: 'ch05',
    number: '05',
    title: 'Interfaces',
    overview:
      'System-level ports connecting AES to the SoC interconnect (TL-UL Integrity), hardware key hierarchy (KeyMgr), and asynchronous randomness network (EDN).',
    subtopics: [
      {
        id: 'tl-ul',
        chapterId: 'ch05',
        title: 'TL-UL',
        evidenceTags: ['[OFFICIAL SPECIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'OpenTitan TL-UL Bus Integrity', path: 'hw/ip/tlul/rtl/tlul_cmd_intg_chk.sv', url: 'https://opentitan.org/book/hw/ip/tlul/index.html' },
        ],
        level1Fundamental: {
          summary:
            'TL-UL ("TileLink Uncached Lightweight") is the guarded chip bus connecting the Ibex CPU to AES registers—acting like a secure armored courier checking every address and data packet for bit flips.',
          everydayAnalogy:
            'Imagine every envelope arriving at AES has a mathematical tamper seal (`cmd_intg` and `data_intg`). If even 1 bit flipped by cosmic rays or fault laser, the front desk (`tlul_cmd_intg_chk`) sounds a fatal alarm instantly!',
          whatHappensStepByStep: [
            '1. CPU drives `tl_i.a_valid`, `a_opcode`, `a_address`, `a_data`, and 7-bit SECDED integrity fields.',
            '2. `aes_reg_top` checks `cmd_intg` & `data_intg` combinationally.',
            '3. Valid write updates CSRs (or 1st/2nd half of `CTRL_SHADOWED`); invalid integrity returns `d_error=1` + triggers `alert_tx_o`.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'OpenTitan TL-UL uses a 32-bit data bus (`a_data`, `d_data`) wrapped with 7-bit Hsiao SECDED error codes in `a_user.cmd_intg`, `a_user.data_intg`, and `d_user.rsp_intg`.',
          keyParametersOrMath: [
            'SECDED Guarantee: Detects up to 2-bit faults, corrects/flags 1-bit faults across command and payload [OFFICIAL DOCUMENTATION]',
            'Shadowed Write Protocol: `CTRL_SHADOWED` and `CTRL_AUX_SHADOWED` require TWO identical sequential TL-UL writes to commit [OBSERVED IN RTL]',
          ],
          workedExample:
            'Writing `0x0000_0101` ONCE to `CTRL_SHADOWED` only arms the staging shadow register. Writing `0x0000_0101` a SECOND time commits both copies (`staged_q == committed_q`). Writing a different value on write #2 triggers a recoverable shadow update error!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Inside `aes_reg_top.sv`, `reggen` generates one-hot address decoding, structural `tlul_adapter_reg`, and shadow storage monitors comparing `committed_q` vs inverted `shadow_q` on EVERY clock cycle (`~shadow_q != committed_q` triggers fatal storage fault!).',
          cornerCasesAndFailures: [
            {
              symptom: 'Recoverable alert fires when updating `CTRL_SHADOWED` cleanly after an interrupted write',
              rootCause: 'An ISR interrupted software between Write #1 and Write #2 and touched `CTRL_SHADOWED`, desynchronizing the 2-step sequence.',
              detection: 'Disable interrupts across dual-write sequences or read `CTRL_SHADOWED` once to reset the staging phase cleanly.',
            },
          ],
          verificationAndTradeoffs:
            'No SRAM buffers on TL-UL port: single-cycle register acceptance keeps bus latency deterministic while trading away burst-DMA streaming (software/DMA writes 4 words per 128-bit block).',
        },
      },
      {
        id: 'key-manager',
        chapterId: 'ch05',
        title: 'Key Manager',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan KeyMgr Sideload Spec', path: 'hw/ip/keymgr/rtl/keymgr_pkg.sv', url: 'https://opentitan.org/book/hw/ip/keymgr/' },
        ],
        level1Fundamental: {
          summary:
            'Key Manager (`keymgr`) can beam secret keys directly into AES over private dedicated copper wires ("sideloading") so the key NEVER travels over the shared CPU bus and software never even sees the key bytes!',
          everydayAnalogy:
            'Instead of carrying gold bullion through city streets (`TL-UL bus`) where spies watch traffic, Key Manager slides gold directly into the AES safe through a sealed underground pneumatic tube (`keymgr_key_i`).',
          whatHappensStepByStep: [
            '1. Software asks `keymgr` to derive an AES sideload key slot (key never leaves `keymgr` to CPU registers).',
            '2. `keymgr` drives `keymgr_key_i.valid=1` and two random shares `key[0..1]` over dedicated point-to-point wires.',
            '3. Software sets `CTRL_SHADOWED.SIDELOAD=1`, causing `aes_core` to use `keymgr_key_i` invisibly.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Port `keymgr_key_i` carries `hw_key_req_t` containing `valid` plus `key[2][255:0]` (already 2-share Boolean masked directly from KeyMgr!).',
          keyParametersOrMath: [
            'Sideload latency: Zero TL-UL write cycles needed to load 256-bit key shares once `keymgr_key_i.valid=1` [OBSERVED IN RTL]',
            'Access isolation: Setting `SIDELOAD=1` completely blocks CSR writes from overriding the active key path [OBSERVED IN RTL]',
          ],
          workedExample:
            'Even if untrusted firmware compromises the CPU right after triggering encryption, it cannot read `KEY_SHARE*` or inspect the sideloaded key over TL-UL.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            '`aes_core.sv` gates trigger acceptance whenever `CTRL_SHADOWED.SIDELOAD == 1` and `!keymgr_key_i.valid`, ensuring AES never accidentally encrypts with stale/zero sideload wires. If `keymgr` clears its sideload slot (`valid=0`), active key registers clear immediately.',
          cornerCasesAndFailures: [
            {
              symptom: 'AES refuses to start (`IDLE` stuck or ignored trigger) with `SIDELOAD=1`',
              rootCause: 'Software enabled `SIDELOAD=1` before telling `keymgr` to generate/push the valid AES sideload slot.',
              detection: 'Assertion & DV test checking `!cipher_start` while `sideload && !keymgr_key_i.valid`.',
            },
          ],
          verificationAndTradeoffs:
            'Dedicated 512+ bit point-to-point routing costs physical metal routing tracks between `keymgr` and `aes` on the ASIC floorplan, in return for total elimination of software-visible secret key exposure.',
        },
      },
      {
        id: 'entropy-interface',
        chapterId: 'ch05',
        title: 'Entropy Interface',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan EDN Protocol', path: 'hw/ip/edn/rtl/edn_pkg.sv', url: 'https://opentitan.org/book/hw/ip/edn/' },
        ],
        level1Fundamental: {
          summary:
            'The Entropy Distribution Network (`EDN`) streams fresh physical randomness into AES across a separate clock domain (`clk_edn_i`) so DOM masking noise and clearing PRNGs stay unpredictable.',
          everydayAnalogy:
            'Imagine a masked ninja needing fresh smoke-bomb refills delivered from another building running on its own wristwatch (`clk_edn_i`)—requiring a polite two-clock-domain pass-off (`req/ack` synchronizer)!',
          whatHappensStepByStep: [
            '1. AES PRNG counts down `PRNG_RESEED_RATE` blocks (or software hits `TRIGGER.PRNG_RESEED`).',
            '2. `aes_core` sends `edn_req=1` through a `prim_sync_reqack_data` Clock Domain Crossing (CDC) bridge.',
            '3. EDN replies on `clk_edn_i` with `edn_ack=1` and a 32-bit random word (`edn_bus`), updating AES LFSR/PRNG seeds safely!',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            '`clk_edn_i` is asynchronous to main `clk_i`. `aes_core` uses `prim_sync_reqack_data` (4-phase/toggle req-ack CDC synchronizer with 2-FF synchronizers) to transfer 32-bit entropy words cleanly.',
          keyParametersOrMath: [
            'Reseed width: Pulls multiple 32-bit words from `edn_i.edn_bus` to seed both `aes_prng_clearing` (64b) and `aes_prng_masking` [OBSERVED IN RTL]',
            'Reseed rates (`PRNG_RESEED_RATE`): Per-1 block, per-64 blocks, or per-8192 blocks configurable in `CTRL_SHADOWED` [OBSERVED IN RTL]',
          ],
          workedExample:
            'During boot before EDN is enabled by software, attempting an AES operation stalls cleanly waiting for the first EDN seed unless `MANUAL_OPERATION` or boot configuration already initialized EDN.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Crucial CDC detail: Check our interactive **Clock Domain Analyzer** (`cdc-analyzer`) on `opentitan-aes`! `clk_i` and `clk_edn_i` cross via `prim_sync_reqack_data`, guaranteeing `edn_bus` data remains strictly stable while `req` toggles and receiver acknowledges (`ack`).',
          cornerCasesAndFailures: [
            {
              symptom: 'AES hangs forever on first block after reset',
              rootCause: 'Firmware started AES before configuring `ENTROPY_SRC -> CSRNG -> EDN`, leaving `edn_ack` unasserted indefinitely.',
              detection: 'Verify EDN healthy startup before AES; UVM tests deliberately backpressure `edn_ack` for 100s of cycles.',
            },
          ],
          verificationAndTradeoffs:
            'Using EDN across async `clk_edn_i` lets AES reuse the chip’s NIST SP 800-90A/B DRBG entropy pipeline instead of replicating an analog ring-oscillator TRNG inside AES.',
        },
      },
    ],
  },
  {
    id: 'ch06',
    number: '06',
    title: 'Verification',
    overview:
      'Industrial signoff UVM testbench, BoringSSL C-DPI reference scoreboarding, formal/SVA properties, and constrained-random functional coverage inside OpenTitan hw/ip/aes/dv.',
    subtopics: [
      {
        id: 'uvm',
        chapterId: 'ch06',
        title: 'UVM',
        evidenceTags: ['[OBSERVED IN VERIFICATION]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan AES DV Testplan', path: 'hw/ip/aes/dv/env/aes_env.sv', url: 'https://opentitan.org/book/hw/ip/aes/dv/' },
        ],
        level1Fundamental: {
          summary:
            'OpenTitan builds a virtual automated verification factory (`UVM`) around `aes.sv` that drives millions of randomized keys, modes, bus stalls, and keymgr sideloads without human intervention.',
          everydayAnalogy:
            'Like a 24/7 crash-test facility: UVM Drivers push randomized messages and fake errors into every pin of AES while Monitors record everything happening on the wires.',
          whatHappensStepByStep: [
            '1. `tl_agent`: Drives TL-UL register reads/writes (generated via `uvm_reg` RAL model from `aes.hjson`).',
            '2. `edn_agent` & `keymgr_if`: Inject random entropy timings and sideload keys.',
            '3. Virtual Sequences (`aes_base_vseq`, `aes_stress_vseq`): Stress every mode, backpressure, and reset timing.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Inherits OpenTitan’s standardized `cip_base_env`, adding protocol-verified VIP agents for TL-UL, EDN, KeyMgr, and Alert Handler (`alert_esc_agent`).',
          keyParametersOrMath: [
            'Run command: `./util/dvsim/dvsim.py hw/ip/aes/dv/aes_sim_cfg.hjson -i aes_smoke` [OBSERVED IN VERIFICATION]',
            'Auto-generated RAL: `aes_reg_block` derives directly from `aes.hjson` [OBSERVED IN VERIFICATION]',
          ],
          workedExample:
            'Constrained-random stress sequences randomize whether the host reads `DATA_OUT` immediately, delays 200 cycles (`STALL` test), or swaps `OPERATION` mid-session.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Notice `cip_base_env` automatically attaches `tl_device_seq` stress, illegal TL-UL integrity fault injection, and reset-on-the-fly (`aes_reset_vseq`) sequences without custom boilerplate.',
          cornerCasesAndFailures: [
            {
              symptom: 'UVM RAL mirror drifts out of sync on `CTRL_SHADOWED`',
              rootCause: 'Writing `CTRL_SHADOWED` only once in test without completing the 2nd commit write leaves RAL predictor confused unless predictor models staged vs committed state.',
              detection: 'OpenTitan `dv_base_reg` predicts shadowed dual-write protocol explicitly inside RAL callbacks.',
            },
          ],
          verificationAndTradeoffs:
            'Standardizing around `cip_base_env` cuts new IP bring-up time while guaranteeing uniform security/alert regression depth across the SoC.',
        },
      },
      {
        id: 'scoreboard',
        chapterId: 'ch06',
        title: 'Scoreboard',
        evidenceTags: ['[OBSERVED IN VERIFICATION]', '[ENGINEERING RECOMMENDATION]'],
        sourceRefs: [
          { label: 'OpenTitan AES Scoreboard', path: 'hw/ip/aes/dv/env/aes_scoreboard.sv' },
        ],
        level1Fundamental: {
          summary:
            'How does the testbench know if AES computed the RIGHT ciphertext? It feeds the exact same plaintext and key to a trusted C-language crypto library (`BoringSSL / OpenSSL` via SystemVerilog DPI-C) and compares every output bit!',
          everydayAnalogy:
            'An answer-key grader sitting next to the chip: whenever AES outputs 128 ciphertext bits on TL-UL, the Scoreboard asks OpenSSL/BoringSSL for the mathematical answer and screams immediately if 1 single bit disagrees!',
          whatHappensStepByStep: [
            '1. Monitor captures TL-UL writes to `KEY_SHARE*`, `IV*`, `CTRL_SHADOWED`, and `DATA_IN*`.',
            '2. `aes_scoreboard` unmasks two shares (`Key0 ^ Key1`) and calls C-DPI `aes_crypt_dpi(...)`.',
            '3. When host reads `DATA_OUT*`, scoreboard asserts `rtl_ciphertext === golden_ciphertext`.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Never write a golden reference model by copying the RTL developer’s mental math—calling an independent FIPS-validated C crypto library (BoringSSL) catches subtle specification misinterpretations immediately!',
          keyParametersOrMath: [
            'DPI-C bridge: Imports C functions (`aes_crypt_block`) directly into SystemVerilog simulation [OBSERVED IN VERIFICATION]',
            'Shadow/Alert prediction: Scoreboard models expected `alert_tx_o` firing cycles whenever test injects shadowed or TL-UL faults [OBSERVED IN VERIFICATION]',
          ],
          workedExample:
            'When `CTRL_SHADOWED.FORCE_ZERO_MASKS=1` (fixed zero masking debug feature enabled in test), scoreboard still validates identical unmasked ciphertext regardless of internal DOM share randomness!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Tricky scoreboard corner: Because AES buffers up to 2 blocks concurrently (`data_in_q` + active cipher + `data_out_q`) AND auto-increments IV/chaining on every block, the scoreboard must snapshot the exact `CTRL_SHADOWED` + `IV` state active at the moment each block enters `aes_cipher_core`, NOT at `DATA_OUT` read time!',
          cornerCasesAndFailures: [
            {
              symptom: 'Scoreboard false mismatch when host changes `IV` while previous block finishes',
              rootCause: 'Reference predictor sampled `ral.IV` late instead of capturing block-start transaction queue.',
              detection: 'Trigger prediction upon full `DATA_IN_0..3` / `TRIGGER.START` transaction commit into an in-order FIFO queue.',
            },
          ],
          verificationAndTradeoffs:
            'DPI-C BoringSSL eliminates self-fulfilling RTL bugs and executes 100x faster than behavioral SystemVerilog S-Box loops.',
        },
      },
      {
        id: 'assertions',
        chapterId: 'ch06',
        title: 'Assertions',
        evidenceTags: ['[OBSERVED IN VERIFICATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'OpenTitan AES SVA & FPV', path: 'hw/ip/aes/rtl/aes_core.sv & hw/ip/aes/dv/sva/' },
        ],
        level1Fundamental: {
          summary:
            'SystemVerilog Assertions (`SVA`) are nonstop watchdogs inside simulation and Formal Proof (`FPV`) tools that scream the exact picosecond an illegal bus rule, invalid FSM code, or secret key leak occurs.',
          everydayAnalogy:
            'Think of automated smoke detectors bolted onto internal wires—you do not wait until the end of a 10-block cipher to notice something went wrong; an SVA catches an illegal glitch on the exact clock cycle it happens.',
          whatHappensStepByStep: [
            '1. Immediate checks (`ASSERT`): Catch structural/coding invariants every cycle (e.g., legal `sp2v_e` encoding).',
            '2. Concurrent temporal checks (`assert property`): Enforce multi-cycle rules across clock edges (`req |-> ##[1:$] ack`).',
            '3. Formal FPV: Mathematical solver proves assertions hold for ALL possible inputs and ALL cycles without simulation vectors!',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'OpenTitan embeds `ASSERT_*` macros from `prim_assert.sv` directly alongside RTL, plus standalone `aes_bind.sv` interface assertion monitors and JasperGold/VC Formal FPV targets.',
          keyParametersOrMath: [
            'One-hot/Sparse SVA: `ASSERT(AesModeOneHot, ...)` [OBSERVED IN RTL]',
            'Known-X SVA: `ASSERT_KNOWN` forbids `X` propagating onto `tl_o`, `edn_o`, `alert_tx_o` [OBSERVED IN RTL]',
            'Key Non-Leakage: Asserts `DATA_OUT` & `KEY_SHARE` readback paths never expose unmasked key material [OBSERVED IN VERIFICATION]',
          ],
          workedExample:
            'Example property: `assert property (@(posedge clk_i) disable iff (!rst_ni) (edn_req && !edn_ack) |=> edn_req);` guarantees the async EDN request never drops before acknowledgement.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Formal Property Verification (`hw/ip/aes/dv/aes_fpv`) proves shadowed-register guarantees exhaustively: no 1-cycle glitch sequence can alter `CTRL_SHADOWED` without triggering either a second identical write or an alert within 1 cycle.',
          cornerCasesAndFailures: [
            {
              symptom: 'Assertion triggers vacuously or misses multi-clock EDN glitch',
              rootCause: 'Writing CDC SVA solely on `clk_i` without sampling stability across `clk_edn_i` edges.',
              detection: 'Use `prim_sync_reqack_data` built-in formal CDC assertions + dual-clock formal assumptions.',
            },
          ],
          verificationAndTradeoffs:
            'Formal FPV provides 100% exhaustive mathematical proof on control/shadowed FSMs in minutes—work that constrained-random simulation might still miss after days of CPU time.',
        },
      },
      {
        id: 'functional-coverage',
        chapterId: 'ch06',
        title: 'Functional Coverage',
        evidenceTags: ['[OBSERVED IN VERIFICATION]', '[ENGINEERING RECOMMENDATION]'],
        sourceRefs: [
          { label: 'OpenTitan AES Cov Group', path: 'hw/ip/aes/dv/env/aes_env_cov.sv' },
        ],
        level1Fundamental: {
          summary:
            'Running 10,000 tests means nothing if 9,999 accidentally ran ECB AES-128! Functional Coverage is a checklist measuring whether tests actually hit every combination of modes, key lengths, stalls, reseeds, and faults.',
          everydayAnalogy:
            'A pilot’s flight-simulator checklist—not just counting hours flown, but proving you practiced crosswind landings, engine failures, night approaches, and icing together.',
          whatHappensStepByStep: [
            '1. Define Coverpoints: Mode (ECB/CBC/CFB/OFB/CTR), Op (Enc/Dec), KeyLen (128/192/256), Sideload (0/1).',
            '2. Cross Coverpoints: `Mode × Op × KeyLen × Sideload × Stall` guarantees zero blind spots.',
            '3. Closure: Inspect uncovered bins (coverage holes) and write targeted sequences to hit 100% signoff.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            '`aes_env_cov.sv` instantiates SystemVerilog `covergroup` bins sampled on every cipher block start, register write, backpressure event, and alert escalation.',
          keyParametersOrMath: [
            'Mode × Op × KeyLen = 5 × 2 × 3 = 30 baseline cryptographic operating bins [OBSERVED IN VERIFICATION]',
            'PRNG Reseed cross: Covers `ReseedRate × ManualReseed × MidBlockReseed` [OBSERVED IN VERIFICATION]',
          ],
          workedExample:
            'A classic coverage hole caught by crosses: `CFB + Decrypt + AES-192 + Sideload=1 + Stall=1`—which exposes rare IV-update bugs when output is stalled!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'True signoff requires combining **Code Coverage** (line, branch, toggle, FSM arc in RTL), **Functional Coverage** (`covergroup` crosses), and **Fault-Injection Coverage** proving alerts fire across every sparse node.',
          cornerCasesAndFailures: [
            {
              symptom: '100% Functional Coverage reported while illegal corner case remains untested',
              rootCause: 'Missing `ignore_bins` / `cross` between `SIDELOAD=1` changing mid-stream and `KEY_IV_DATA_IN_CLEAR`.',
              detection: 'Peer testplan review mapping every item in `aes.hjson` and testplan back to named covergroups.',
            },
          ],
          verificationAndTradeoffs:
            'Over-granular cross products blow up memory/simulation time (`100k+ bins`); carefully prune impossible/illegal states using `illegal_bins` and `ignore_bins`.',
        },
      },
    ],
  },
  {
    id: 'ch07',
    number: '07',
    title: 'Advanced Engineering',
    overview:
      'Silicon signoff security engineering: Differential Power Analysis (DPA/TVLA), laser/clock Fault Injection defenses, critical-path timing, and architectural security analysis.',
    subtopics: [
      {
        id: 'side-channel-considerations',
        chapterId: 'ch07',
        title: 'Side-Channel Considerations',
        evidenceTags: ['[OFFICIAL DOCUMENTATION]', '[OBSERVED IN RTL]'],
        sourceRefs: [
          { label: 'OpenTitan Masking & CW310 TVLA', path: 'hw/ip/aes/rtl/aes_sbox_dom.sv', url: 'https://opentitan.org/book/hw/ip/aes/#masking' },
        ],
        level1Fundamental: {
          summary:
            'Every time flip-flops switch between 0 and 1, the chip pulls a tiny burst of electrical current. Attackers put an oscilloscope on the power pin and guess secret AES keys statistically—unless hardware splits secrets into masked random shares (DOM)!',
          everydayAnalogy:
            'If a treasure weight is 10 kg, and instead of carrying a 10 kg bar past guards you split it randomly into `(+37 kg)` and `(-27 kg)` bags re-rolled every block, looking at either bag alone leaks zero clue about 10 kg!',
          whatHappensStepByStep: [
            '1. Boolean Masking: Real byte X = Share0 ^ Share1 where Share0 is uniform random noise (`PRNG`).',
            '2. Linear Layers: XOR, ShiftRows, MixColumns run independently on Share0 and Share1.',
            '3. Nonlinear DOM S-Box: Cross-multiplies shares with fresh randomness inside staged registers so dynamic power never correlates with `X`.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'OpenTitan validates side-channel leakage experimentally on Xilinx Kintex-7 CW310 FPGA boards using Non-Specific Fixed-vs-Random **TVLA (Test Vector Leakage Assessment)** Welch’s t-test (`|t| < 4.5` threshold).',
          keyParametersOrMath: [
            'Unmasked AES TVLA: Fails |t| > 4.5 within < 2,000 power traces [EDUCATIONAL EXAMPLE]',
            '1st-order DOM Masked (`SecMasking=1`): Resists 1st-order DPA up to 100k+ / millions of traces when floorplan & PRNG seed are clean [OFFICIAL DOCUMENTATION]',
          ],
          workedExample:
            'Remember: Register clearing ALSO leaks power if overwriting secret state with `0`! That’s why `aes_prng_clearing` overwrites `state_q` and `key_q` with PRNG noise.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Physical backend pitfall: Standard place-and-route optimizers love merging identical logic, collapsing `S0` and `S1` signals onto shared cells or creating capacitive coupling glitches! ASIC signoff MUST tag DOM modules with `dont_touch`, isolate share trees, and verify post-layout gate-level power simulations.',
          cornerCasesAndFailures: [
            {
              symptom: 'Masked RTL passes functional tests 100% yet leaks key in silicon TVLA',
              rootCause: 'Weak PRNG (reused seed or `PRNG_RESEED_RATE` too sparse) or early-evaluation glitches mixing shares prior to FF barrier.',
              detection: 'Gate-level post-synthesis toggle/power analysis + live FPGA CW310 TVLA trace capture.',
            },
          ],
          verificationAndTradeoffs:
            '1st-order DOM defeats standard 1st-order DPA but does NOT defeat 2nd-order multivariate attacks (which correlate power samples from two cycles simultaneously)—requiring 2nd-order masking (3+ shares) at exponentially higher area.',
        },
      },
      {
        id: 'fault-injection',
        chapterId: 'ch07',
        title: 'Fault Injection',
        evidenceTags: ['[OBSERVED IN RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan AES Fault Hardening', path: 'hw/ip/aes/rtl/aes_control_fsm.sv', url: 'https://opentitan.org/book/hw/ip/aes/#fault-injection' },
        ],
        level1Fundamental: {
          summary:
            'An attacker shooting a brief laser pulse or dropping supply voltage ("voltage glitch") tries to make AES skip Final Rounds or flip 1 bit to extract keys (DFA: Differential Fault Analysis). OpenTitan arms AES with redundant detectors and instant self-wipe alarms!',
          everydayAnalogy:
            'Like bank vault tripwires: if someone drills the lock (`shadowed CSR mismatch`), jolts the clock (`sparse FSM glitch`), or cuts a bus wire (`TL-UL SECDED error`), the vault triggers an alarm AND shreds all keys instantly!',
          whatHappensStepByStep: [
            '1. Detect: TL-UL SECDED, shadowed register complement monitors, sparse FSMs, and sparse `sp2v_e` monitors check every cycle.',
            '2. Escalate: Raises `alert_fatal_o` to chip-wide `alert_handler`.',
            '3. Lock & Wipe: Traps FSM permanently in `ERROR`, drives cipher outputs to zero/cleared state until full hardware reset.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'Defends against both **DFA** (corrupting Round 8/9 cipher state to solve Round 10 key equations) and **Control Hijacking** (forcing AES to output raw plaintext instead of ciphertext).',
          keyParametersOrMath: [
            'Fault Counters/Detectors: Sparse `rnd_ctr` / redundant FSMs / dual-write shadowed CSRs (`CTRL_SHADOWED`) [OBSERVED IN RTL]',
            'Alert classes: Recoverable alert (bus write mistake on shadow reg) vs Fatal alert (tamper/SECDED/FSM fault) [OBSERVED IN RTL]',
          ],
          workedExample:
            'Even if a laser flips 1 bit in `aes_cipher_control` state from `ROUND` to `FINISH` early, sparse Hamming distance $\\ge 3$ forces an invalid state bit-pattern, halting output release cleanly.',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Synthesis must NOT optimize away redundant comparators (`prim_sparse_fsm_flop` uses explicit `dont_touch` macros / synthesis pragmas across Vivado/DesignCompiler). Notice `aes_cipher_control` also checks round counter consistency separately from main cipher FSM!',
          cornerCasesAndFailures: [
            {
              symptom: 'Double-bit fault lands directly on another valid sparse state encoding',
              rootCause: 'Insufficient Hamming distance (<3) in custom FSM enum.',
              detection: 'Verify minimum Hamming distance across all enum pairs with OpenTitan `sparse-fsm-encode.py` lint.',
            },
          ],
          verificationAndTradeoffs:
            'Fault-hardening overhead is modest (~10–15% control logic area) while raising DFA/glitch complexity from simple single-pulse voltage glitches to synchronized multi-beam laser targeting.',
        },
      },
      {
        id: 'timing',
        chapterId: 'ch07',
        title: 'Timing',
        evidenceTags: ['[DERIVED FROM RTL]', '[OFFICIAL DOCUMENTATION]'],
        sourceRefs: [
          { label: 'OpenTitan AES Architecture & Timing', path: 'hw/ip/aes/rtl/aes_cipher_core.sv' },
        ],
        level1Fundamental: {
          summary:
            'Hardware timing dictates the maximum clock speed (`f_max` in MHz) AES can run at cleanly before signals fail setup timing—dominated by the long combinational path through S-Box + ShiftRows + MixColumns + AddRoundKey in one cycle.',
          everydayAnalogy:
            'Think of a relay race inside 1 clock tick: signals leave flip-flops, race through 20+ gates of math (`SubBytes -> MixColumns -> XOR`), and must arrive calmly at the next flip-flop before the next clock tick hits!',
          whatHappensStepByStep: [
            'Unmasked Critical Path: `State FF -> aes_sub_bytes (Canright/LUT) -> aes_shift_rows -> aes_mix_columns -> AddRoundKey XOR -> State FF`.',
            'DOM Masked Critical Path: Split into 5 pipelined sub-stages inside `aes_sbox_dom` (`mul` stages), actually keeping per-stage logic shallow!',
            'CDC Timing (`clk_i` <-> `clk_edn_i`): Isolated cleanly inside `prim_sync_reqack_data` with `set_max_delay` / false-path SDC constraints.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'AES-128 block latencies: ~12 cycles (unmasked: 1 init + 10 rounds + 1 output) vs ~56 cycles (DOM masked: 5 cycles per round × 10 rounds + overhead). KeyExpand executes in parallel with `SubBytes -> MixColumns` so key path rarely bottlenecks `State` path except on Canright reverse modes.',
          keyParametersOrMath: [
            'AES-128 Throughput @ 100 MHz (Unmasked, 12 cyc/blk): 128 bits × (100e6 / 12) = ~1.06 Gbps [DERIVED FROM RTL]',
            'AES-128 Throughput @ 100 MHz (DOM Masked, 56 cyc/blk): 128 bits × (100e6 / 56) = ~228 Mbps [DERIVED FROM RTL]',
          ],
          workedExample:
            'For 100 Gbps data-center NICs, engineers pipeline 10 unrolled rounds (`10 stages × 128 bits`, 1 block/cycle = 102.4 Gbps @ 800 MHz); for Root-of-Trust MCUs, 228 Mbps–1 Gbps iterative AES easily saturates SPI Flash!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Important SDC constraint rule: In DOM masked designs, `dont_touch` prevents retiming flip-flops across masking boundaries—so backend STA engineers balance pipeline combinational delay inside `aes_cipher_core` without merging registers across `mul` shares.',
          cornerCasesAndFailures: [
            {
              symptom: 'Setup violation on Canright S-Box -> InvMixColumns path in ASIC STA',
              rootCause: 'High fanout of `op_i` (Encrypt vs Decrypt mode switch) toggling all 16 S-Boxes + 4 MixColumns units simultaneously.',
              detection: 'Buffer `op_q` locally or register `op_i` inside `aes_cipher_core` right next to datapath.',
            },
          ],
          verificationAndTradeoffs:
            'Pipelining DOM S-Boxes raises `f_max` at the expense of 5x higher block latency; never blindly retime across masked pipeline stages or DPA security collapses!',
        },
      },
      {
        id: 'security-analysis',
        chapterId: 'ch07',
        title: 'Security Analysis',
        evidenceTags: ['[OFFICIAL DOCUMENTATION]', '[ENGINEERING RECOMMENDATION]'],
        sourceRefs: [
          { label: 'OpenTitan AES Security Model', path: 'https://opentitan.org/book/hw/ip/aes/', url: 'https://opentitan.org/book/hw/ip/aes/' },
        ],
        level1Fundamental: {
          summary:
            'A secure AES chip needs much more than "good math"—it needs armored key isolation, fresh randomness, tamper detection, clean zeroization, AND safe software usage modes!',
          everydayAnalogy:
            'Buying the strongest steel safe door in the world is useless if you leave the combination taped on the front (ECB mode), unlock it in front of cameras (unmasked power traces), or forget to lock it after leaving (no zeroization).',
          whatHappensStepByStep: [
            '1. Confidentiality: Never use ECB for structured secrets; always pair with fresh IVs/Nonces in CBC/CTR.',
            '2. Integrity/Authenticity: AES alone only encrypts—combine with HMAC/KMAC (Encrypt-then-MAC) so attackers cannot tamper ciphertext!',
            '3. Lifecycle Hardening: Enforce KeyMgr sideload + `SecMasking=1` + `rst_shadowed_ni` + automatic wipe on fatal alert.',
          ],
        },
        level2Engineering: {
          architectureAndSpec:
            'OpenTitan’s threat model explicitly addresses physical non-invasive (DPA/EM side-channel), physical semi-invasive (single/double laser/clock fault injection), and rogue unprivileged software attempting key readback.',
          keyParametersOrMath: [
            'Missing feature by design: OpenTitan AES omits AES-GCM GHASH (handled via KMAC/HMAC or software) [OFFICIAL DOCUMENTATION]',
            'Residual Secret Lifetime: Cleared explicitly via `KEY_IV_DATA_IN_CLEAR` or automatically on `alert_fatal_o` [OBSERVED IN RTL]',
          ],
          workedExample:
            'Padding oracle / Bit-flipping defense: When decrypting flash images using AES-CTR, ALWAYS verify HMAC-SHA256 / KMAC tag over the ciphertext BEFORE executing decrypted instructions!',
        },
        level3Expert: {
          rtlAndMicroarchitecture:
            'Residual silicon threats: (a) 2nd-order power/EM correlation combining Share 0 + Share 1 traces on closely packed ASIC flip-flops; (b) Cold-boot / microprobing remanence mitigated by `aes_prng_clearing` overwriting storage immediately; (c) Non-resetting `rst_shadowed_ni` preserving alert escalation context across warm resets.',
          cornerCasesAndFailures: [
            {
              symptom: 'Chosen-ciphertext malleability in CBC/CTR storage',
              rootCause: 'System integrated raw AES-CTR without pairing it with HMAC/KMAC integrity authentication.',
              detection: 'System-level security audit enforcing Authenticated Encryption (AEAD / Encrypt-then-MAC) across boot & storage flows.',
            },
          ],
          verificationAndTradeoffs:
            'Hardware security is a chain: TL-UL integrity guards bus requests, KeyMgr guards secret provisioning, EDN + DOM guards power side channels, and sparse/shadowed logic guards physical faults—weakening any one link compromises system Root-of-Trust.',
        },
      },
    ],
  },
];

// ============================================================================
// REAL FIPS-197 AES-128 EDUCATIONAL SIMULATOR MATH (ZERO MOCK DATA)
// ============================================================================

export const AES_SBOX: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];

const RCON: number[] = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

export function gfXtime(b: number): number {
  const x = (b & 0xff) << 1;
  return (b & 0x80 ? x ^ 0x1b : x) & 0xff;
}

export function gfMul(a: number, b: number): number {
  let p = 0;
  let aa = a & 0xff;
  let bb = b & 0xff;
  for (let i = 0; i < 8; i++) {
    if (bb & 1) p ^= aa;
    const hi = aa & 0x80;
    aa = (aa << 1) & 0xff;
    if (hi) aa ^= 0x1b;
    bb >>= 1;
  }
  return p & 0xff;
}

export function expandAes128Key(keyBytes: number[]): number[][] {
  const w: number[][] = [];
  for (let i = 0; i < 4; i++) {
    w.push([keyBytes[4 * i] ?? 0, keyBytes[4 * i + 1] ?? 0, keyBytes[4 * i + 2] ?? 0, keyBytes[4 * i + 3] ?? 0]);
  }
  for (let i = 4; i < 44; i++) {
    let temp = [...w[i - 1]];
    if (i % 4 === 0) {
      temp = [
        AES_SBOX[temp[1]] ^ RCON[i / 4],
        AES_SBOX[temp[2]],
        AES_SBOX[temp[3]],
        AES_SBOX[temp[0]],
      ];
    }
    w.push([
      w[i - 4][0] ^ temp[0],
      w[i - 4][1] ^ temp[1],
      w[i - 4][2] ^ temp[2],
      w[i - 4][3] ^ temp[3],
    ]);
  }
  const roundKeys: number[][] = [];
  for (let r = 0; r <= 10; r++) {
    roundKeys.push([...w[4 * r], ...w[4 * r + 1], ...w[4 * r + 2], ...w[4 * r + 3]]);
  }
  return roundKeys;
}

export interface AesRoundSnapshot {
  round: number;
  label: string;
  fsmState: 'INIT' | 'ROUND' | 'FINISH';
  inputState: number[];
  afterSubBytes?: number[];
  afterShiftRows?: number[];
  afterMixColumns?: number[];
  roundKey: number[];
  outputState: number[];
}

function subBytesState(st: number[]): number[] {
  return st.map((b) => AES_SBOX[b & 0xff]);
}

function shiftRowsState(st: number[]): number[] {
  // column-major: index = col*4 + row
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const srcCol = (c + r) % 4;
      out[c * 4 + r] = st[srcCol * 4 + r];
    }
  }
  return out;
}

function mixColumnsState(st: number[]): number[] {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) {
    const s0 = st[c * 4];
    const s1 = st[c * 4 + 1];
    const s2 = st[c * 4 + 2];
    const s3 = st[c * 4 + 3];
    out[c * 4] = gfMul(2, s0) ^ gfMul(3, s1) ^ s2 ^ s3;
    out[c * 4 + 1] = s0 ^ gfMul(2, s1) ^ gfMul(3, s2) ^ s3;
    out[c * 4 + 2] = s0 ^ s1 ^ gfMul(2, s2) ^ gfMul(3, s3);
    out[c * 4 + 3] = gfMul(3, s0) ^ s1 ^ s2 ^ gfMul(2, s3);
  }
  return out;
}

function addRoundKeyState(st: number[], rk: number[]): number[] {
  return st.map((b, i) => (b ^ (rk[i] ?? 0)) & 0xff);
}

export function traceAes128Encryption(plaintextHex: string, keyHex: string): AesRoundSnapshot[] {
  const parse16 = (hex: string, fallback: number[]) => {
    const clean = hex.replace(/[^0-9a-fA-F]/g, '').padEnd(32, '0').slice(0, 32);
    if (!clean) return fallback;
    const arr: number[] = [];
    for (let i = 0; i < 16; i++) {
      arr.push(parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0);
    }
    return arr;
  };

  // FIPS-197 Appendix B defaults
  const pt = parse16(plaintextHex, [0x32, 0x43, 0xf6, 0xa8, 0x88, 0x5a, 0x30, 0x8d, 0x31, 0x31, 0x98, 0xa2, 0xe0, 0x37, 0x07, 0x34]);
  const key = parse16(keyHex, [0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6, 0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c]);
  const rks = expandAes128Key(key);

  const trace: AesRoundSnapshot[] = [];
  let state = addRoundKeyState(pt, rks[0]);
  trace.push({
    round: 0,
    label: 'Round 0 · Initial AddRoundKey (Key Whitening)',
    fsmState: 'INIT',
    inputState: pt,
    roundKey: rks[0],
    outputState: state,
  });

  for (let r = 1; r <= 10; r++) {
    const sb = subBytesState(state);
    const sr = shiftRowsState(sb);
    const mc = r < 10 ? mixColumnsState(sr) : undefined;
    const preKey = mc ?? sr;
    const out = addRoundKeyState(preKey, rks[r]);
    trace.push({
      round: r,
      label: r < 10 ? `Round ${r} · SubBytes -> ShiftRows -> MixColumns -> AddRoundKey` : `Round 10 (Final Round) · SubBytes -> ShiftRows -> AddRoundKey (No MixColumns!)`,
      fsmState: r < 10 ? 'ROUND' : 'FINISH',
      inputState: state,
      afterSubBytes: sb,
      afterShiftRows: sr,
      afterMixColumns: mc,
      roundKey: rks[r],
      outputState: out,
    });
    state = out;
  }
  return trace;
}
