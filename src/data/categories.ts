import { ProtocolCategory } from '../types/protocol';

export const PROTOCOL_CATEGORIES: ProtocolCategory[] = [
  {
    id: 'amba',
    name: '1. AMBA – ARM On-Chip Protocols',
    shortName: 'AMBA Bus',
    description: 'Arm AMBA specifications spanning high-bandwidth AXI3/AXI4/AXI5 fabrics, AHB/APB buses, ACE/CHI coherency, trace (ATB), MMU translation (DTI/LTI), and Q/P-Channel low-power handshakes.',
    protocolIds: [
      'amba-axi', 'axi3', 'axi4', 'axi4-lite', 'axi4-stream', 'axi5', 'axi5-lite', 'axi5-stream',
      'ahb', 'ahb-lite', 'ahb5', 'apb', 'apb2', 'apb3', 'apb4', 'apb5',
      'ace', 'ace-lite', 'ace5', 'ace5-lite', 'chi', 'chi-c2c', 'atb', 'cxs', 'dti', 'lti', 'lpi', 'q-channel', 'p-channel', 'gfb',
    ],
  },
  {
    id: 'interconnect',
    name: '2. On-Chip Bus & Interconnect Protocols',
    shortName: 'On-Chip Interconnect',
    description: 'Open-source and vendor on-chip interconnect fabrics including TileLink, Wishbone, OBI, OCP, CoreConnect, Avalon, PULP AXI/Stream, and crossbar matrices.',
    protocolIds: [
      'tl-ul', 'tl-uh', 'tl-ud', 'tilelink', 'wishbone-classic', 'wishbone-b4', 'obi', 'ocp',
      'coreconnect-plb', 'coreconnect-opb', 'coreconnect-dcr', 'avalon-mm', 'avalon-st',
      'ahb-multilayer', 'axi-crossbar', 'noc-packet-if', 'pulp-axi', 'pulp-apb', 'pulp-stream', 'pulp-axi-lite',
    ],
  },
  {
    id: 'processor',
    name: '3. Processor & CPU Interfaces',
    shortName: 'Processor IF',
    description: 'Instruction/data ports, debug/trace ingress, CORE-V X-Interface coprocessor links, and multi-socket CPU coherency fabrics.',
    protocolIds: [
      'riscv-ext-debug', 'riscv-dmi', 'riscv-trace', 'obi', 'cv-x-if', 'core-v-ext-if',
      'arm-amba-proc-if', 'intel-fsb', 'intel-qpi', 'intel-upi', 'hypertransport',
      'coherent-mesh-if', 'proc-mem-if', 'custom-coproc-if', 'riscv-tilelink',
    ],
  },
  {
    id: 'coherency',
    name: '4. Cache Coherency Protocols',
    shortName: 'Cache Coherency',
    description: 'Snooping and directory cache-coherency state models and hardware-coherent interconnect transport specifications.',
    caveatNote: 'Note: MESI, MSI, MOSI, MOESI, MESIF, MERSI, and MOESIF specify logical cache-coherency state-machine protocols rather than standalone physical bus wires.',
    protocolIds: [
      'mesi', 'msi', 'mosi', 'moesi', 'mesif', 'mersi', 'ace', 'ace-lite', 'chi',
      'tilelink-coherence', 'moesif', 'directory-coherence', 'snooping-coherence', 'moesi-cmp-directory', 'amd-if-coherency',
    ],
  },
  {
    id: 'memory',
    name: '5. Memory Interface Protocols (DRAM & Controllers)',
    shortName: 'Memory / DRAM',
    description: 'JEDEC SDR/DDR/LPDDR/GDDR/HBM families, DFI PHY interfaces, memory controller front-ends, SRAM macros, HyperBus, and QSPI/OSPI XIP memory buses.',
    caveatNote: 'Revision Note: Next-generation specs such as DDR6, LPDDR6, GDDR7, and HBM4 are flagged as emerging/under verification—always verify final JEDEC ballot text before silicon commitment.',
    protocolIds: [
      'sdr-sdram', 'ddr', 'ddr2', 'ddr3', 'ddr4', 'ddr5', 'ddr6',
      'lpddr', 'lpddr2', 'lpddr3', 'lpddr4', 'lpddr4x', 'lpddr5', 'lpddr5x', 'lpddr6',
      'gddr3', 'gddr4', 'gddr5', 'gddr5x', 'gddr6', 'gddr6x', 'gddr7',
      'hbm', 'hbm2', 'hbm2e', 'hbm3', 'hbm3e', 'hbm4',
      'dfi', 'ddr-phy-if', 'mem-ctrl-if', 'axi-mem-if', 'avalon-mem-if', 'hyperbus', 'ospi-mem-if', 'sram', 'qspi',
    ],
  },
  {
    id: 'storage',
    name: '6. Non-Volatile Memory & Storage Interfaces',
    shortName: 'NVM & Storage',
    description: 'Flash XIP serial/parallel buses (SPI/QSPI/OSPI/ONFI/Toggle), managed mobile flash (eMMC, SD, UFS), and enterprise NVMe/SATA/SAS storage links.',
    protocolIds: [
      'spi', 'qspi', 'ospi', 'spi-nor', 'spi-nand', 'parallel-nor', 'onfi-nand', 'toggle-nand',
      'emmc', 'sd', 'sdio', 'ufs', 'sata', 'nvme', 'nvme-pcie', 'nvme-of', 'sas', 'scsi', 'hyperflash', 'cfi-flash',
    ],
  },
  {
    id: 'peripheral',
    name: '7. Peripheral & Low-Speed Interfaces',
    shortName: 'Peripherals & Audio',
    description: 'Low-pin-count board/sensor buses (UART, I2C, SMBus, PMBus, I3C, SPI, 1-Wire, GPIO) and chip-to-codec serial audio links (I2S, TDM, PDM, HDA).',
    protocolIds: [
      'uart', 'usart', 'i2c', 'smbus', 'pmbus', 'i3c', 'spi', 'qspi', 'one-wire', 'gpio',
      'i2s', 'tdm', 'pcm-audio', 'pdm', 'ac97', 'intel-hda', 'spdif', 'microwire', 'swpmi',
    ],
  },
  {
    id: 'high-speed',
    name: '8. PCIe & High-Speed Interconnects',
    shortName: 'PCIe & CXL / SerDes',
    description: 'PCI/PCI-X/PCIe Gen1–Gen7 differential lanes, Compute Express Link (CXL 1.1–4.0), NVLink, Infinity Fabric, RapidIO, and high-speed host fabrics.',
    caveatNote: 'Version Verification Note: Future-facing versions (e.g., PCIe Gen7, CXL 4.0) represent emerging or recently finalized specifications requiring individual standards-body verification before silicon freeze.',
    protocolIds: [
      'pci', 'pci-x', 'pcie-gen1', 'pcie-gen2', 'pcie-gen3', 'pcie-gen4', 'pcie-gen5', 'pcie-gen6', 'pcie-gen7',
      'cxl', 'cxl-io', 'cxl-cache', 'cxl-mem', 'cxl-1-1', 'cxl-2-0', 'cxl-3-0', 'cxl-3-1', 'cxl-4-0',
      'nvlink', 'nvlink-c2c', 'infinity-fabric', 'rapidio', 'gen-z', 'usb4', 'usb3', 'sata',
    ],
  },
  {
    id: 'usb',
    name: '9. USB Interfaces & Host Controllers',
    shortName: 'USB & Type-C',
    description: 'USB 1.0 through USB4 v2.0 (80 Gbps), USB Type-C / Power Delivery, device classes (UAS, MSC, UAC, UVC, HID), and xHCI/EHCI/OHCI/UHCI host controllers.',
    protocolIds: [
      'usb-1-0', 'usb-1-1', 'usb-2-0', 'usb-3-0', 'usb-3-1', 'usb-3-2', 'usb3', 'usb4', 'usb4-v2',
      'usb-type-c', 'usb-pd', 'usb-otg', 'usb-uas', 'usb-msc', 'usb-audio', 'usb-uvc', 'usb-hid', 'xhci', 'ehci', 'ohci', 'uhci',
    ],
  },
  {
    id: 'networking',
    name: '10. Ethernet & Networking Interfaces',
    shortName: 'Ethernet & MAC/PHY',
    description: 'IEEE 802.3 speeds from 10BASE-T up to 800G/1.6T Ethernet alongside MII/RMII/GMII/RGMII/SGMII/XGMII/CGMII reconciliation, MDIO, Interlaken, and PTP 1588.',
    protocolIds: [
      'eth-10base-t', 'eth-100base-tx', 'eth-1g', 'eth-2-5g', 'eth-5g', 'eth-10g', 'eth-25g',
      'eth-40g', 'eth-50g', 'eth-100g', 'eth-200g', 'eth-400g', 'eth-800g', 'eth-1-6t',
      'gmii', 'mii', 'rmii', 'rgmii', 'sgmii', 'qsgmii', 'xgmii', 'xlgmii', 'cgmii', 'xfi', 'usxgmii',
      'mdio', 'mii-mgmt', 'interlaken', 'eth-mac-ctrl', 'ptp-1588',
    ],
  },
  {
    id: 'mipi',
    name: '11. MIPI Alliance Protocols',
    shortName: 'MIPI Alliance',
    description: 'Mobile, XR, and automotive camera/display/RF protocols: CSI-2/3, DSI/DSI-2, D-PHY, C-PHY, M-PHY, UniPro, I3C Basic, SoundWire, RFFE, and A-PHY.',
    protocolIds: [
      'mipi-csi-2', 'mipi-csi-3', 'mipi-dsi', 'mipi-dsi-2', 'mipi-d-phy', 'mipi-c-phy', 'mipi-m-phy',
      'mipi-unipro', 'i3c', 'mipi-i3c-basic', 'mipi-soundwire', 'mipi-slimbus', 'mipi-rffe',
      'mipi-digrf', 'mipi-lli', 'mipi-a-phy', 'mipi-i2c', 'mipi-dcs',
    ],
  },
  {
    id: 'display',
    name: '12. Display & Video Interfaces',
    shortName: 'Display & Video',
    description: 'HDMI 1.4–2.2, DisplayPort 1.2–2.1, eDP, VESA DSC compression, LVDS/OpenLDI, parallel RGB/BT.656/BT.1120, and automotive FPD-Link/GMSL links.',
    protocolIds: [
      'hdmi-1-4', 'hdmi-2-0', 'hdmi-2-1', 'hdmi-2-2', 'displayport', 'dp-1-2', 'dp-1-4', 'dp-2-0', 'dp-2-1',
      'edp', 'vesa-dsc', 'mipi-dsi', 'mipi-csi-2', 'lvds', 'rgb-parallel', 'bt-656', 'bt-1120', 'vga', 'dvi', 'openldi', 'fpd-link', 'gmsl',
    ],
  },
  {
    id: 'chip-to-chip',
    name: '13. Chiplet & Die-to-Die Interconnects',
    shortName: 'Chiplet & D2D',
    description: '2.5D/3D chiplet packaging standards including UCIe 1.0–3.0, OCP Bunch of Wires (BoW), AIB, CXL, NVLink-C2C, XSR SerDes, and D2D RDI PHYs.',
    protocolIds: [
      'ucie', 'ucie-1-0', 'ucie-1-1', 'ucie-2-0', 'ucie-3-0', 'bow', 'aib', 'cxl', 'nvlink-c2c', 'xsr', 'xsr-phy', 'd2d-phy',
    ],
  },
  {
    id: 'automotive',
    name: '14. Automotive Interfaces',
    shortName: 'Automotive',
    description: 'In-vehicle control, ADAS, and zonal networks spanning CAN, CAN FD, CAN XL, LIN, FlexRay, Single-Pair Ethernet (T1/T1S/T1L), SENT, PSI5, and CXPI.',
    protocolIds: [
      'can', 'can-fd', 'can-xl', 'lin', 'flexray', 'auto-ethernet', 'eth-100base-t1', 'eth-1000base-t1',
      'eth-10base-t1s', 'eth-10base-t1l', 'sent', 'psi5', 'cxpi', 'most', 'j1850',
    ],
  },
  {
    id: 'debug',
    name: '15. Debug, Test & DFT Interfaces',
    shortName: 'Debug & DFT',
    description: 'Silicon bring-up, boundary scan, and trace fabrics: IEEE 1149.1/6/7 (JTAG/cJTAG), 1687 (iJTAG), 1500, 1838, SWD, CoreSight, ETM/STM, Nexus 5001, and RISC-V Debug.',
    protocolIds: [
      'jtag', 'ieee-1149-1', 'ieee-1149-6', 'ieee-1149-7', 'ieee-1687-ijtag', 'ieee-1500', 'ieee-1838',
      'swd', 'cjtag', 'arm-coresight', 'arm-trace', 'etm', 'stm', 'nexus-5001', 'riscv-debug', 'dmi',
      'boundary-scan', 'scan-chain', 'ieee-1500-wsp',
    ],
  },
  {
    id: 'security',
    name: '16. Security & Cryptographic IP Interfaces',
    shortName: 'Hardware Security',
    description: 'Tamper-evident buses (TL-UL Integrity), OpenTitan crypto/entropy sideload ports, SPDM attestation, TCG TPM/TIS, and APB TrustZone attributes.',
    caveatNote: 'Scope Distinction: Entries such as Key Manager, CSRNG, EDN, HMAC, AES, KMAC, OTP, and FIFO Interface document IP-specific hardware module interfaces (as implemented in OpenTitan) rather than standalone universal bus standards.',
    protocolIds: [
      'tl-ul', 'tl-ul-integrity', 'tl-ul-dev-if', 'entropy-if', 'keymgr-if', 'csrng-if', 'edn-if',
      'hmac-if', 'aes-if', 'kmac-if', 'otp-if', 'secure-boot-if', 'secure-debug-if', 'spdm', 'tcg-tpm-if', 'tis', 'fifo-sec-if', 'apb-sec-ext',
    ],
  },
  {
    id: 'noc',
    name: '17. Network-on-Chip (NoC) & Fabric Protocols',
    shortName: 'NoC & Topologies',
    description: 'Packetized NoC architectures, flow control (Wormhole, VCs, Credit-Based), switching techniques, and Mesh/Torus/Ring/Crossbar/Fat-Tree/Clos topologies.',
    protocolIds: [
      'axi-noc', 'chi-noc', 'tilelink', 'tilelink-noc', 'ocp-noc', 'wishbone-noc', 'packet-noc',
      'wormhole-routing', 'vc-flow-control', 'credit-flow-control', 'circuit-switching', 'packet-switching',
      'mesh-noc', 'torus-noc', 'ring-noc', 'crossbar-interconnect', 'fat-tree-noc', 'clos-network', 'amba-coherent-interconnect', 'chi',
    ],
  },
  {
    id: 'accelerator',
    name: '18. AI / ML / GPU Accelerator Interfaces',
    shortName: 'AI & GPU Accel',
    description: 'Tensor/SIMT execution fabrics, systolic arrays, banked scratchpads, scatter-gather DMAs, AXI4/TileLink/NVLink/CXL/UCIe/HBM high-bandwidth accelerator attaches.',
    protocolIds: [
      'axi4', 'axi4-stream', 'tilelink', 'nvlink', 'cxl', 'ucie', 'hbm', 'hbm3',
      'dma-descriptor-if', 'scratchpad-mem-if', 'systolic-array-if', 'tensor-proc-if',
      'gpu-cmd-if', 'gpu-mem-if', 'simt-exec-if', 'opencl-hw-if', 'openmp-offload-if', 'custom-accel-if',
    ],
  },
  {
    id: 'phy-serdes',
    name: '19. Physical Layer & SerDes Interfaces',
    shortName: 'PHY & SerDes',
    description: 'MAC-to-PHY boundaries and multi-gigabit SerDes links including PIPE, JESD204A/B/C ADC/DAC links, CPRI/eCPRI, Aurora, XAUI/XLAUI/CAUI/SFI, and MIPI/USB/PCIe PHYs.',
    protocolIds: [
      'pipe', 'serdes', 'jesd204a', 'jesd204b', 'jesd204c', 'cpri', 'ecpri', 'aurora',
      'serial-rapidio', 'xaui', 'xlaui', 'caui', 'sfi', 'pcie-phy', 'usb-phy', 'mipi-phy', 'interlaken-phy',
    ],
  },
  {
    id: 'power-mgmt',
    name: '20. Clock, Reset & Power Management Interfaces',
    shortName: 'Clock / Reset / Power',
    description: 'Low-power quiescence and state handshakes (Q-Channel, P-Channel, SPMI, PMBus), CDC/reset bridges, DVFS control, IEEE 1801 (UPF), and IEEE 1685 (IP-XACT).',
    protocolIds: [
      'q-channel', 'p-channel', 'clk-enable-if', 'rst-sync-if', 'power-state-if',
      'ieee-1801-upf', 'ieee-1685-ipxact', 'cdc-if', 'power-domain-ctrl-if', 'dvfs-ctrl-if', 'spmi', 'pmbus',
    ],
  },
  {
    id: 'wireless',
    name: '21. Wireless & Radio Baseband Interfaces',
    shortName: 'Wireless & RF',
    description: 'Short-range PAN, IoT mesh, and cellular air-interface baseband/HCI ecosystems: Bluetooth/BLE, Wi-Fi/802.11, Zigbee, Thread, Matter, UWB, NFC, RFID, LoRa, LTE, 5G NR, 6G.',
    caveatNote: 'Standard Maturity Note: 6G Research Interfaces represent pre-standard exploratory 3GPP/academic study items rather than frozen production silicon specs.',
    protocolIds: [
      'bluetooth', 'ble', 'wifi', 'ieee-802-11', 'zigbee', 'thread', 'matter', 'uwb',
      'nfc', 'rfid', 'lora', 'lte', '5g-nr', '6g-research-if', 'wifi-aware',
    ],
  },
  {
    id: 'industrial',
    name: '22. Industrial, Aerospace & Specialized Interfaces',
    shortName: 'Industrial & Aero',
    description: 'Deterministic radiation-hardened, avionics, and factory automation buses: SpaceWire, SpaceFibre, MIL-STD-1553, ARINC 429/664, TTEthernet, EtherCAT, PROFINET, Modbus, RS-485.',
    protocolIds: [
      'spacewire', 'spacefibre', 'mil-std-1553', 'arinc-429', 'arinc-664-afdx', 'ttethernet',
      'ethercat', 'profinet', 'modbus', 'profibus', 'rs-232', 'rs-422', 'rs-485', 'ieee-1394', 'sercos',
    ],
  },
  {
    id: 'standards',
    name: '23. Related Semiconductor Interface Standards',
    shortName: 'Reference Standards',
    description: 'Foundational arithmetic, DFT, power-intent (UPF), metadata (IP-XACT), ISA, and industry specification libraries underpinning semiconductor engineering.',
    caveatNote: 'Scope Note: Entries in Section 23 represent foundational semiconductor reference, arithmetic, test, or modeling standards (such as IEEE 754 floating-point, UPF, IP-XACT, and ISA specs) rather than wire-level communication protocols.',
    protocolIds: [
      'ieee-754', 'ieee-802-3', 'ieee-802-1', 'ieee-1149-1', 'ieee-1687-ijtag', 'ieee-1500', 'ieee-1838',
      'ieee-1801-upf', 'ieee-1685-ipxact', 'jedec-ddr-stds', 'jedec-hbm-stds', 'jedec-lpddr-stds', 'jedec-ufs-stds',
      'mipi-specs', 'usbif-specs', 'pcisig-specs', 'riscv-isa-specs', 'arm-arch-specs', 'ocp-specs',
    ],
  },
];

export const LEARNING_PATHS = [
  {
    id: 'soc-bus-fundamentals',
    title: 'SoC Bus Fundamentals',
    audience: 'RTL Design & Verification Beginners',
    duration: '4 Core Protocols',
    steps: [
      { protocolId: 'apb', label: 'APB — Non-pipelined register access' },
      { protocolId: 'ahb-lite', label: 'AHB-Lite — Pipelined single-channel bus' },
      { protocolId: 'axi4-lite', label: 'AXI4-Lite — VALID/READY decoupled registers' },
      { protocolId: 'axi4', label: 'AXI4 — 5-channel out-of-order burst fabric' },
    ],
  },
  {
    id: 'streaming-and-serdes',
    title: 'High-Speed Data & SerDes',
    audience: 'Accelerator & PCIe Engineers',
    duration: '3 Core Protocols',
    steps: [
      { protocolId: 'axi4-stream', label: 'AXI4-Stream — Unaddressed packet flow' },
      { protocolId: 'pcie-gen5', label: 'PCIe Gen5 — 32 GT/s TLP & credit flow' },
      { protocolId: 'ucie', label: 'UCIe — Die-to-die chiplet interconnect' },
    ],
  },
  {
    id: 'verification-mastery',
    title: 'Verification & Coherency Track',
    audience: 'Design Verification (DV) Engineers',
    duration: '4 Core Protocols',
    steps: [
      { protocolId: 'axi4', label: 'AXI4 — SVA handshake & ordering checks' },
      { protocolId: 'tl-ul', label: 'TL-UL — Security integrity verification' },
      { protocolId: 'chi', label: 'CHI — Packetized coherent snoop verification' },
      { protocolId: 'ddr5', label: 'DDR5 — Refresh & timing margin checks' },
    ],
  },
];
