# Silicon-to-PQC Cryptography Stack (`crypto`)

This directory documents the complete reverse-engineered cryptography engineering stack from a **VLSI and semiconductor security engineer** perspective:

```text
  Post-Quantum Cryptography (ML-KEM, ML-DSA, FN-DSA, SLH-DSA, HQC)
        ▲
  Protocols & Asymmetric Systems (TLS 1.3, PKI, DH, RSA, ECC, KDF, DRBG)
        ▲
  Symmetric Primitives & AEAD (AES, ChaCha20, SHA-2/3, BLAKE3, HMAC, GCM)
        ▲
  Software, Compilers & Boot (C/ASM, Constant-Time Codegen, Boot ROM → OS)
        ▲
  Architecture & Microarchitecture (Pipelines, Caches, SRAM/NVM, Buses, CDC)
        ▲
  Gates, CMOS & Side-Channel Physics (Boolean Logic, Standard Cells, DPA/EM/Faults)
        ▲
  Foundational Mathematics (Discrete Math, Number Theory, GF(p)/GF(2^n), Probability)
```

## Directory Contents

- `crypto/README.md` — Stack architecture overview and 10-chapter learning syllabus.
- `src/crypto/cryptoCurriculum.ts` — Complete 10-chapter structured curriculum covering Foundational Math, VLSI/Semiconductor Fundamentals, Software/Systems, Classical Symmetric & Asymmetric Crypto, Hardened Implementation, Reverse-Engineering Attacks, Post-Quantum Cryptography (NIST 2026 standards & NTT hardware), Systems-Level Security, and the 7-Stage Practical Mastery Path.
- `src/crypto/cryptoLabs.ts` — Interactive computation engines for Extended Euclidean / Modular Inverse & CRT, Constant-Time vs. Leaky CMOS Power/Cache Simulation, and $\mathbb{Z}_{3329}$ NTT Butterfly & PQC Parameter Comparison.
- `src/crypto/CryptoStackView.tsx` — Interactive web page integrated into VLSI Protocol Atlas (`Crypto & PQC` view).

## 10-Chapter Curriculum Map

1. **Foundational Mathematics** — Discrete math, number theory, abstract algebra ($GF(p)$, $GF(2^n)$), linear algebra, probability, complexity theory, information theory.
2. **Computer & Hardware Fundamentals (VLSI Core)** — Digital logic, combinational/sequential circuits, CMOS & standard cells, FSMs, CPU pipelines/caches, ISAs, memory systems, interconnects/CDC, RTL-to-GDSII flow, side-channel physics.
3. **Software & Systems Foundations** — C & assembly, DSA, OS isolation, Boot ROM & secure boot, firmware, TCP/IP & TLS basics, concurrency, constant-time compiler behavior.
4. **Classical Cryptography (Symmetric)** — Classical ciphers, Shannon secrecy, stream ciphers, DES/3DES/AES internals, block modes (ECB–XTS), hashes (MD5–BLAKE3), MACs, AEAD.
5. **Classical Cryptography (Asymmetric & Protocols)** — Diffie-Hellman, RSA + padding, ECC (ECDH/ECDSA/Ed25519), PKI, KDFs, TRNG/DRBG, TLS 1.2/1.3, introductory MPC & ZKP.
6. **Cryptographic Implementation & Engineering** — Constant-time programming, AES-NI/CLMUL/ARMv8 Crypto, OpenSSL/BoringSSL/libsodium/wolfSSL, hardware accelerators, TRNG/PUF/SE/HSM/TPM, masking/hiding/dual-rail logic, formal verification, FIPS 140 / Common Criteria.
7. **Attacks & Cryptanalysis (Reverse Engineering)** — Differential/linear cryptanalysis, SPA/DPA/CPA/template/EM/acoustic SCA, voltage/clock/laser/EMFI fault injection, cache & transient execution attacks, RSA/ECC implementation attacks, netlist & binary reverse engineering, white-box attacks.
8. **Post-Quantum Cryptography (PQC)** — Lattice/code/hash/MQ/isogeny hard problems, NIST 2026 standards (ML-KEM/Kyber, ML-DSA/Dilithium, Falcon/FN-DSA, SPHINCS+/SLH-DSA, McEliece, BIKE, HQC, hybrids), NTT, error sampling, compression, constant-time & masked PQC hardware, migration.
9. **Advanced / Systems-Level Topics** — Shor/Grover quantum threat model, quantum-resistant protocols, MPC & ZK-SNARKs/STARKs, crypto agility, Hardware RoT + PQC secure boot, reductionist proofs, NIST/IETF/ETSI/ISO standardization.
10. **Practical Mastery Path** — 7-stage silicon-to-PQC engineering progression.
