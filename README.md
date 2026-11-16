<p align="center">
  <img src="public/assets/aistudio/gemini-svg_07b7b86a.svg" alt="VLSI Protocol Atlas — Open-Source Protocol & Silicon IP Intelligence Hub" width="580" />
</p>

<h1 align="center">VLSI Protocol Atlas & Open-Source IP Universe</h1>

<p align="center">
  <strong>Understand. Visualize. Verify.</strong> · <strong>Explore Silicon. Understand Architecture. Reverse Engineer IP.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#23-protocol--interface-domains">Protocol Domains</a> •
  <a href="#open-source-silicon-ip-universe">Open-Source IP Universe</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#github-pages-deployment">GitHub Pages Deployment</a> •
  <a href="LICENSE">MIT License</a>
</p>

---

## Overview

**VLSI Protocol Atlas & Open-Source IP Universe** is an interactive semiconductor engineering documentation platform, cycle-accurate protocol simulator, RTL reverse-engineering explorer, and UVM/SVA verification workbench.

Built for **RTL designers, SoC architects, design verification (DV) engineers, silicon bring-up teams, and students**, the platform unifies authoritative specification details across **418+ protocols and standards (23 domains)** with **37+ real open-source silicon IPs** and **6 complete SoC topologies**—all structured with progressive **3-level depth explanations**:

- **Level 1 — Fundamental Understanding:** First-principles intuition, design motivation, everyday analogies, step-by-step mental models, and common beginner misconceptions.
- **Level 2 — Engineering Mechanics:** Formal bus/datapath architecture, quantitative timing & bit-width math, worked cycle-by-cycle examples, and safe reset rules.
- **Level 3 — Expert Signoff (RTL / CDC / DV):** Synthesizable microarchitecture (skid buffers, Gray-coded async FIFOs, shadow registers), real-world *Symptom → Root Cause → Resolution* failure mode analysis, SystemVerilog Assertions (SVA), UVM verification hooks, and silicon debug playbooks.

---

## Features

### 1. Protocol Atlas (418+ Protocols & Standards Across 23 Domains)
- **Protocol-to-RTL Signal Inspector:** Click any signal across channels to examine width, direction, polarity, reset value, timing rules, legal/illegal handshake conditions, synthesizable SystemVerilog snippets, SVA properties, and UVM driver notes.
- **Interactive Waveform Studio:** Step cycle-by-cycle through live bus handshakes (`AXI4`, `AXI4-Lite`, `AXI4-Stream`, `APB`, `SPI`, `I2C`, `UART`), trigger backpressure stalls, and inspect signal transitions.
- **Compliance Checker:** Validate transaction traces against AMBA and TileLink integrity invariants.
- **Protocol Compare & Bus Fabric Map:** Side-by-side throughput, burst, ordering, coherency, and signal matrices plus SoC-wide interconnect topology maps.
- **UVM & SVA Generator:** Generate parameterized SystemVerilog interfaces, assertions, and verification templates.

### 2. Open-Source Silicon IP Universe (Dual Explorer Architecture)
Every silicon IP includes both:
1. **IP Explorer:** Submodule RTL trees, internal block diagrams, extracted FSM state diagrams, CSR register maps (`HJSON / reggen` bit fields), compile-time parameters, clocking/reset architecture, and upstream verification commands.
2. **Protocol Explorer:** Interactive SVG bus connectivity hub linking external ports (`OBI`, `AXI4`, `AXI4-Lite`, `TL-UL`, `RoCC`, `PCIe`, `I2C`, `UART`) directly into their protocol specs.

### 3. Specialized Silicon Engineering Labs
- **Clock Domain Analysis (CDC) Tool:** Maps clock islands, reset domains, asynchronous crossings, and synchronizer insertion points (`2-FF`, Gray async FIFOs, reset bridges) across multi-clock IPs.
- **AES 7-Chapter Deep Dive & Interactive FIPS-197 Lab:** Full 26-topic hardware security curriculum covering GF(2⁸) finite fields, SubBytes/ShiftRows/MixColumns/KeyExpansion, DOM masking countermeasures, `TL-UL` integrity, TVLA/fault injection, and an interactive cycle-by-cycle AES-128 state matrix stepper.
- **Knowledge Graph:** Interactive relationship graph tracing **Protocol ↔ IP ↔ SoC** dependencies.
- **Documentation Completeness Dashboard:** Live 16-topic **MASTER INSTRUCTION** audit tracking Fundamentals, Architecture, Specifications, Signals, Transactions, Timing, RTL Hierarchy, Internal Modules, Registers, Parameters, Verification, Assertions, Coverage, Debugging, Corner Cases, and Primary Citations across all 455+ entries.
- **Semiconductor Glossary & Feeling Lucky Discovery:** Authoritative 3-level glossary plus non-repeating **Feeling Lucky** random picks across protocols, silicon IPs, CDC labs, and simulators.

---

## 23 Protocol & Interface Domains

| # | Domain | Representative Standards & Buses |
|---|---|---|
| 1 | **ARM AMBA On-Chip** | AXI3, AXI4, AXI4-Lite, AXI4-Stream, AXI5, AHB, AHB5, APB2–5, ACE, ACE5, CHI, ATB, CXS, DTI, LTI, Q/P-Channel |
| 2 | **Open & Custom On-Chip Buses** | TileLink (UL/UH/UD/C), Wishbone Classic/B4, OBI, OCP, CoreConnect (PLB/OPB/DCR), Avalon-MM/ST, PULP AXI |
| 3 | **Processor & Coprocessor Interfaces** | RISC-V External Debug/DMI/Trace, CV-X-IF, RoCC, OBI, QPI, UPI, HyperTransport |
| 4 | **Cache Coherency** | MSI, MESI, MOSI, MOESI, MESIF, MERSI, ACE, CHI, TileLink-C, Directory & Snooping Coherence |
| 5 | **Memory & Storage Interfaces** | SDR/DDR/DDR2–5, LPDDR3–5X, GDDR5–7, HBM/HBM2/2E/3/3E/4, SRAM, QSPI, OSPI, HyperBus, ONFI, UFS, eMMC, NVMe |
| 6 | **High-Speed Serial & Interconnects** | PCIe Gen1–Gen7, USB 2.0/3.x/USB4, SATA, SAS, Thunderbolt, DisplayPort, HDMI, Ethernet 1G–800G |
| 7 | **Chip-to-Chip & Die-to-Die (D2D)** | UCIe, CXL 1.1–3.1 (CXL.io/cache/mem), Bunch of Wires (BoW), AIB, OpenCAPI, NVLink, XSR/USR SerDes |
| 8 | **Network-on-Chip (NoC)** | AXI NoC, AMBA CHI Mesh, TileLink Fabric, OpenPiton NoC, Wormhole/VC Packet Routing |
| 9 | **Peripheral & Low-Speed Buses** | UART, SPI, Quad/Octal SPI, I2C, SMBus, PMBus, I3C, CAN/CAN-FD, LIN, FlexRay, I2S, PDM, GPIO, 1-Wire |
| 10 | **Display, Camera & Sensor PHY** | MIPI CSI-2, DSI-2, D-PHY, C-PHY, M-PHY, UniPro, RFFE, eDP, SLVS-EC |
| 11 | **Debug, Trace & Telemetry** | JTAG (IEEE 1149.1), cJTAG (1149.7), SWD, CoreSight ETM/ITM/STM/TPIU, RISC-V Debug/Nexus |
| 12 | **Hardware Security & RoT** | TL-UL Integrity (Hsiao SECDED), OpenTitan KeyMgr & CSRNG, Entropy Source, Caliptra, DICE, SPDM, HSM |
| 13 | **SerDes, PHY & Signaling** | PIPE, SFI, USXGMII, XFI, CEI-28G/56G/112G/224G, JESD204B/C, PAM4 / NRZ Encoding |
| 14 | **Power, Clock & Reset Management** | UPF (IEEE 1801), CPF, Q-Channel, P-Channel, SCMI, PSCI, SVID, PMBus, ICG Cells, Async Reset Bridges |
| 15 | **Timing, DFT & Signoff** | IEEE 1149.1/1149.6, IJTAG (IEEE 1687), IEEE 1500 Wrapper, BIST/MBIST/LBIST, ATPG Scan, SDC Timing Constraints |
| 16–23 | **RF/Wireless, Automotive/Aero, EDA/RTL/DV Standards** | ARINC 429, SpaceWire, MIL-STD-1553, IEEE 1800 SystemVerilog, UVM, SystemRDL, IP-XACT (IEEE 1685), IEEE 754 |

---

## Open-Source Silicon IP Universe

Included hardware IPs and SoCs trace directly to authoritative open-source silicon projects:

- **Processors:** `lowRISC Ibex`, `OpenHW CVA6 (Ariane)`, `CV32E40P`, `UC Berkeley Rocket Chip`, `SonicBOOM`, `VexRiscv`, `SERV`, `PicoRV32`
- **GPUs & AI Accelerators:** `Vortex GPGPU`, `MIAOW GPU`, `Nyuzi GPU`, `Berkeley Gemmini`, `NVIDIA NVDLA`, `PULP RedMulE`
- **Security & Root of Trust:** `OpenTitan AES` (DOM masked), `HMAC`, `KMAC`, `OTBN`, `CSRNG`, `KeyMgr`, `Alert Handler`, `ROM/SRAM/Flash Controllers`
- **Interconnects, Memory & Peripherals:** `PULP AXI`, `OpenTitan TL-UL Xbar`, `OpenPiton NoC`, `LiteDRAM`, `Verilog-AXI`, `Verilog-PCIe`, `Verilog-Ethernet`, `UltraEmbedded USB`, `OpenTitan UART / SPI Host / I2C / GPIO / PLIC`
- **Reference SoCs:** OpenTitan EarlGrey, Chipyard, PULPissimo, CVA6 SoC, LiteX SoC, OpenPiton Manycore

---

## Tech Stack

- **Frontend:** React 19, TypeScript 7, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide Icons
- **Build & Tooling:** Vite 8, `tsx`, ESLint/TypeScript (`tsc --noEmit`)
- **Deployment:** Static production bundle with automated GitHub Actions Pages CI/CD

---

## Project Structure

```text
├── .github/workflows/
│   └── deploy-pages.yml          # Automated GitHub Actions build & GitHub Pages deploy
├── public/assets/aistudio/
│   └── gemini-svg_07b7b86a.svg   # Official VLSI Protocol Atlas SVG brand logo
├── src/
│   ├── components/               # Interactive views, SVG diagrams, simulators & dashboards
│   │   ├── DocumentationCompletenessDashboard.tsx
│   │   ├── LayeredExplanationPanel.tsx
│   │   ├── ProtocolDocView.tsx
│   │   ├── IpDetailView.tsx
│   │   ├── AesDeepDiveView.tsx
│   │   ├── ClockDomainAnalyzerView.tsx
│   │   ├── SimulatorLab.tsx
│   │   └── ...
│   ├── data/
│   │   ├── protocols/            # 418+ protocols across 23 domains + deep specs
│   │   ├── ips/                  # 37+ open-source silicon IP profiles
│   │   ├── socs/                 # 6 SoC integration topologies
│   │   ├── conceptDepthEngine.ts # Progressive L1 / L2 / L3 explanation engine
│   │   ├── aesCurriculum.ts      # 7-chapter AES hardware architecture & crypto curriculum
│   │   └── glossary.ts           # Multi-layer VLSI & verification terminology
│   ├── utils/
│   │   └── completenessTracker.ts # 16-checkpoint MASTER INSTRUCTION audit logic
│   ├── App.tsx                   # Top navigation, Feeling Lucky picker & view router
│   └── main.tsx
├── index.html
├── vite.config.ts
├── package.json
└── LICENSE                       # MIT License
```

---

## Quick Start

### Prerequisites
- **Node.js** `>= 20` (tested on Node 22)
- **npm** `>= 10`

### Installation & Local Development

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/vlsi-protocol-atlas.git
cd vlsi-protocol-atlas

# 2. Install dependencies
npm install

# 3. Start the local development server on port 3000
npm run dev
```

### Typecheck & Production Build

```bash
# Run TypeScript static verification
npm run lint

# Build optimized static output into dist/
npm run build

# Preview production bundle locally
npm run preview
```

---

## GitHub Pages Deployment

This repository includes a zero-config GitHub Actions workflow at `.github/workflows/deploy-pages.yml`:

1. Push to `main` or `master` (or trigger manually via **Actions → Deploy to GitHub Pages → Run workflow**).
2. In your GitHub repository, navigate to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. The workflow automatically detects your repository base path (`VITE_BASE_PATH`), runs `npm run lint` and `npm run build`, generates `.nojekyll` + `404.html`, and publishes to GitHub Pages.

---

## Authoritative Sources & Attributions

Technical documentation and hardware architectures synthesize public specifications and open-source RTL repositories from:
- **Standards Bodies:** Arm AMBA Specifications, PCI-SIG, JEDEC, MIPI Alliance, USB-IF, RISC-V International, Open Compute Project (OCP), IEEE Standards Association, and OpenTitan Documentation.
- **Open-Source Silicon Projects:** lowRISC OpenTitan & Ibex, OpenHW Group (CVA6 / CORE-V), ETH Zurich & University of Bologna (PULP Platform), UC Berkeley (Rocket Chip, BOOM, Gemmini), Georgia Tech (Vortex GPGPU), Princeton (OpenPiton), Enjoy-Digital (LiteX), Alex Forencich (`verilog-axi`, `verilog-pcie`, `verilog-ethernet`), and YosysHQ (`PicoRV32`).

---

## License

Released under the **[MIT License](LICENSE)**.
