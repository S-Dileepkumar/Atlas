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

Built for **RTL designers, SoC architects, design verification (DV) engineers, silicon bring-up teams, and students**, the platform unifies authoritative specification details across **498+ protocols and standards (30 categories & 16 Master Knowledge Domains)** with **37+ real open-source silicon IPs**, **6 complete SoC topologies**, a **Semiconductor Engineering Knowledge Graph**, and the **Interactive Hardware Explainer Studio**:

- **Level 1 — Fundamental Understanding:** First-principles intuition, design motivation, everyday analogies, step-by-step mental models, and common beginner misconceptions.
- **Level 2 — Engineering Mechanics:** Formal bus/datapath architecture, quantitative timing & bit-width math, worked cycle-by-cycle examples, and safe reset rules.
- **Level 3 — Expert Signoff (RTL / CDC / DV):** Synthesizable microarchitecture (skid buffers, Gray-coded async FIFOs, shadow registers), real-world *Symptom → Root Cause → Resolution* failure mode analysis, SystemVerilog Assertions (SVA), UVM verification hooks, and silicon debug playbooks.

---

## Features

### 1. Interactive Hardware Explainer Studio (14 Synchronized Renderers)
- **Unified Timeline & Deep-Link Engine (`#explainer/<topic>/s<scene>/t<step>`):** Synchronizes play/pause, cycle step (`←`/`→`), speed control, scrubbing, live **Overview / Detail / Expert** depth switching, **Verification View**, interactive **"Try It"** mutations, **"What Changes"** mode diff tables, and **3-question self-checks**.
- **14 Data-Driven Visualization Renderers:** Block Packet Flows, Sequence Diagrams, Cycle-Accurate Waveforms, FSM State Graphs, Live Hex Bit-Field Decoders, CPU/GPU Pipeline Lanes (forwarding/stalls/flushes), SoC Memory Map & Page Walk, UPF/Clock/Reset Floorplan Overlays, 60fps Systolic Array Canvas (`WS`/`OS`/`RS`), MESI Cache Coherence, 60fps 2D NoC Mesh Canvas, Queue/Credit Meters, Roofline Performance Charts, and Layered Encapsulation Stacks.
- **Built-In Schema Validator & Authoring Guide:** Runtime `validateTopic()` verification enforces citations, accessibility `ariaDescription`, 3 depth layers, and 3-question self-checks on every topic.

### 2. Protocol Atlas (498+ Protocols & Standards Across 30 Domains)
- **Protocol-to-RTL Signal Inspector:** Click any signal across channels to examine width, direction, polarity, reset value, timing rules, legal/illegal handshake conditions, synthesizable SystemVerilog snippets, SVA properties, and UVM driver notes.
- **Interactive Waveform Studio:** Step cycle-by-cycle through live bus handshakes (`AXI4`, `AXI4-Lite`, `AXI4-Stream`, `APB`, `SPI`, `I2C`, `UART`), trigger backpressure stalls, and inspect signal transitions.
- **Compliance Checker:** Validate transaction traces against AMBA and TileLink integrity invariants.
- **Protocol Compare & Bus Fabric Map:** Side-by-side throughput, burst, ordering, coherency, and signal matrices plus SoC-wide interconnect topology maps.
- **UVM & SVA Generator:** Generate parameterized SystemVerilog interfaces, assertions, and verification templates.

### 3. Semiconductor Engineering Knowledge Graph & Repo Ingestion
- **Unified Graph Engine (1,054 Nodes, 977 Edges):** Links 15 entity types across Protocols, Hardware IPs, Processors, SoCs, RTL Modules, Signals, UVM Components, Testcases, Assertions, Standards, Registers, Memory, Clock/Reset Domains, and EDA Tools with shortest-path tracing, blast-radius analysis, natural-language query patterns, and JSON/CSV/Markdown/Mermaid export.
- **Live RTL Repository Ingestion:** Parse Verilog/SystemVerilog/Chisel snippets or upload modules to auto-patch the Knowledge Graph live.

### 4. Open-Source Silicon IP Universe (Dual Explorer Architecture)
Every silicon IP includes both:
1. **IP Explorer:** Submodule RTL trees, internal block diagrams, extracted FSM state diagrams, CSR register maps (`HJSON / reggen` bit fields), compile-time parameters, clocking/reset architecture, and upstream verification commands.
2. **Protocol Explorer:** Interactive SVG bus connectivity hub linking external ports (`OBI`, `AXI4`, `AXI4-Lite`, `TL-UL`, `RoCC`, `PCIe`, `I2C`, `UART`) directly into their protocol specs.

### 5. Specialized Silicon Engineering Labs
- **Clock Domain Analysis (CDC) Tool:** Maps clock islands, reset domains, asynchronous crossings, and synchronizer insertion points (`2-FF`, Gray async FIFOs, reset bridges) across multi-clock IPs.
- **AES 7-Chapter Deep Dive & Interactive FIPS-197 Lab:** Full 26-topic hardware security curriculum covering GF(2⁸) finite fields, SubBytes/ShiftRows/MixColumns/KeyExpansion, DOM masking countermeasures, `TL-UL` integrity, TVLA/fault injection, and an interactive cycle-by-cycle AES-128 state matrix stepper.
- **Documentation Completeness Dashboard:** Live 16-topic **MASTER INSTRUCTION** audit tracking Fundamentals, Architecture, Specifications, Signals, Transactions, Timing, RTL Hierarchy, Internal Modules, Registers, Parameters, Verification, Assertions, Coverage, Debugging, Corner Cases, and Primary Citations across all indexed protocols and IPs.
- **Semiconductor Glossary & Feeling Lucky Discovery:** Authoritative 3-level glossary plus non-repeating **Feeling Lucky** random picks across protocols, silicon IPs, CDC labs, and simulators.

---

## 30 Protocol Categories & 16 Master Knowledge Domains

| # | Domain | Representative Standards & Buses |
|---|---|---|
| 1 | **ARM AMBA On-Chip** | AXI3, AXI4, AXI4-Lite, AXI4-Stream, AXI5, AHB, AHB5, APB2–5, ACE, ACE5, CHI-E, ATB, CXS, DTI, LTI, Q/P-Channel |
| 2 | **Open & Custom On-Chip Buses** | TileLink (UL/UH/UD/C), Wishbone Classic/B4, OBI, OCP, CoreConnect (PLB/OPB/DCR), Avalon-MM/ST, PULP AXI |
| 3 | **Processor & Coprocessor Interfaces** | RISC-V External Debug/DMI/Trace, CV-X-IF, RoCC, OBI, QPI, UPI, HyperTransport |
| 4 | **Cache Coherency & Accelerators** | MSI, MESI, MOSI, MOESI, MESIF, ACE, CHI-E, TileLink-C, CXL.io/cache/mem, CCIX, OpenCAPI, NVLink/NVLink-C2C, Infinity Fabric |
| 5 | **Memory & Storage Interfaces** | SDR/DDR/DDR2–5, LPDDR3–5X, MRDIMM/RDIMM/LRDIMM, GDDR5–7, HBM2E/3/4, DFI 3–5, ONFI, Toggle NAND, QSPI/OSPI, UFS, NVMe |
| 6 | **High-Speed Serial & PCIe Sub-Layers** | PCIe Gen1–7 (Transaction/DLL/PHY, TLP/DLLP, FLIT, LTSSM, SR-IOV, ATS/PRI/PASID, AER), USB4, Ethernet 1G–800G |
| 7 | **Chip-to-Chip & Die-to-Die (D2D)** | UCIe, CXL 1.1–3.1 (HDM Decoders, Fabric Manager), Bunch of Wires (BoW), AIB, XSR/USR SerDes |
| 8 | **Network-on-Chip (NoC)** | AXI NoC, AMBA CHI Mesh, TileLink Fabric, OpenPiton NoC, Wormhole/VC Packet Routing |
| 9 | **Peripheral & Low-Speed Buses** | UART, SPI, Quad/Octal SPI, I2C, SMBus, PMBus, I3C (SPD), CAN/CAN-FD/XL, LIN, FlexRay, I2S, PDM, GPIO, 1-Wire |
| 10 | **Display, Camera & Sensor PHY** | MIPI CSI-2, DSI-2, D-PHY, C-PHY, M-PHY, UniPro, RFFE, eDP, DisplayPort, HDMI, SLVS-EC |
| 11 | **Debug, Trace & Functional Safety** | JTAG (1149.1), cJTAG (1149.7), SWD, CoreSight ETM/ITM/STM, ISO 26262 Lockstep/DCLS, BIST/MBIST/LBIST, IJTAG (1687) |
| 12 | **Hardware Security, CDC & Signoff** | TL-UL Integrity (Hsiao SECDED), OpenTitan KeyMgr/CSRNG/HSM, Caliptra, DICE, SPDM, UPF (1801), CDC/RDC, SVA/UVM/Formal |

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
│   └── gemini-svg_07b7b86a.svg   # Official VLSI Protocol Atlas SVG brand logo (README only)
├── src/
│   ├── engine/
│   │   ├── explainerSchema.ts    # Hardware explainer schema, semantic legend & validateTopic()
│   │   └── useTimelineController.ts # Shared playback, scrubbing, keyboard & hash deep-link hook
│   ├── components/
│   │   ├── explainer/            # Interactive Explainer Studio + all 14 synchronized renderers
│   │   ├── KnowledgeGraphView.tsx
│   │   ├── DocumentationCompletenessDashboard.tsx
│   │   ├── MasterArchitectureView.tsx
│   │   ├── ProtocolDocView.tsx
│   │   ├── IpDetailView.tsx
│   │   └── ...
│   ├── data/
│   │   ├── explainers/           # Authoritative explainer topic datasets + TOPIC_TEMPLATE
│   │   ├── protocols/            # 498+ protocols & standards across 30 categories
│   │   ├── ips/                  # 37+ open-source silicon IP profiles
│   │   ├── socs/                 # 6 SoC integration topologies
│   │   ├── knowledgeGraphEngine.ts # 1,054+ node graph builder, BFS pathfinder & NL queries
│   │   └── glossary.ts           # Multi-layer VLSI & verification terminology
│   ├── App.tsx                   # Top navigation, hash router, Feeling Lucky picker & view router
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
