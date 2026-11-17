export interface ResolvedSpecMetadata {
  revision: string;
  officialSpecificationUrl: string;
  authorityLabel: string;
}

interface SpecInput {
  id: string;
  name: string;
  standardBody: string;
  specVersion: string;
  year: string;
  categoryId?: string;
}

const EXACT_SPEC_MAP: Record<string, ResolvedSpecMetadata> = {
  axi4: {
    revision: 'Rev H (ARM IHI 0022H, 2021)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0022/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  'axi4-lite': {
    revision: 'Rev H Section B1 (ARM IHI 0022H)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0022/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  'axi4-stream': {
    revision: 'Rev B (ARM IHI 0051B, 2021)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0051/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  apb: {
    revision: 'Rev E / APB5 (ARM IHI 0024E, 2023)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0024/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  ahb: {
    revision: 'Rev C / AMBA 5 AHB (ARM IHI 0033C)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0033/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  'ahb-lite': {
    revision: 'Rev C Section AHB-Lite (ARM IHI 0033C)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0033/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  chi: {
    revision: 'Issue F / CHI-E/F (ARM IHI 0050F)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0050/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  'chi-e': {
    revision: 'Issue E (ARM IHI 0050E)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0050/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  ace: {
    revision: 'Rev H / ACE & AXI5 (ARM IHI 0022H)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0022/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  axi3: {
    revision: 'Rev B (ARM IHI 0022B)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0022/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  axi5: {
    revision: 'Rev H (ARM IHI 0022H)',
    officialSpecificationUrl: 'https://developer.arm.com/documentation/ihi0022/latest/',
    authorityLabel: 'Arm Developer Documentation',
  },
  'pcie-gen5': {
    revision: 'Rev 5.0 (32.0 GT/s, 2019)',
    officialSpecificationUrl: 'https://pcisig.com/specifications',
    authorityLabel: 'PCI-SIG Specifications Library',
  },
  'pcie-gen6': {
    revision: 'Rev 6.0 (64.0 GT/s PAM4 Flit, 2022)',
    officialSpecificationUrl: 'https://pcisig.com/specifications',
    authorityLabel: 'PCI-SIG Specifications Library',
  },
  'pcie-gen7': {
    revision: 'Rev 7.0 (128.0 GT/s PAM4, 2025)',
    officialSpecificationUrl: 'https://pcisig.com/specifications',
    authorityLabel: 'PCI-SIG Specifications Library',
  },
  'tl-ul': {
    revision: 'TileLink 1.8.1 (UL Profile / OpenTitan)',
    officialSpecificationUrl: 'https://opentitan.org/book/hw/ip/tlul/index.html',
    authorityLabel: 'OpenTitan & CHIPS Alliance',
  },
  'tl-ul-integrity': {
    revision: 'OpenTitan Hardened TL-UL SECDED Rev 1',
    officialSpecificationUrl: 'https://opentitan.org/book/hw/ip/tlul/index.html#bus-integrity',
    authorityLabel: 'lowRISC OpenTitan Documentation',
  },
  tilelink: {
    revision: 'Spec 1.8.1 (TL-UL / TL-UH / TL-C)',
    officialSpecificationUrl: 'https://starfivetech.com/uploads/tilelink-spec-1.8.1.pdf',
    authorityLabel: 'CHIPS Alliance TileLink Specification',
  },
  'riscv-tilelink': {
    revision: 'TileLink Spec 1.8.1',
    officialSpecificationUrl: 'https://starfivetech.com/uploads/tilelink-spec-1.8.1.pdf',
    authorityLabel: 'CHIPS Alliance TileLink Specification',
  },
  obi: {
    revision: 'v1.6 (OpenHW Group OBI)',
    officialSpecificationUrl: 'https://github.com/openhwgroup/obi',
    authorityLabel: 'OpenHW Group Repository',
  },
  'cv-x-if': {
    revision: 'v1.0 (OpenHW CORE-V X-Interface)',
    officialSpecificationUrl: 'https://docs.openhwgroup.org/projects/openhw-group-core-v-xif/',
    authorityLabel: 'OpenHW Group Documentation',
  },
  'wishbone-b4': {
    revision: 'Rev B4 (OpenCores Wishbone)',
    officialSpecificationUrl: 'https://cdn.opencores.org/downloads/wbspec_b4.pdf',
    authorityLabel: 'OpenCores Specification',
  },
  'wishbone-classic': {
    revision: 'Rev B3 / Classic',
    officialSpecificationUrl: 'https://cdn.opencores.org/downloads/wbspec_b4.pdf',
    authorityLabel: 'OpenCores Specification',
  },
  ddr4: {
    revision: 'JESD79-4D (JEDEC DDR4)',
    officialSpecificationUrl: 'https://www.jedec.org/standards-documents/docs/jesd79-4d',
    authorityLabel: 'JEDEC Standards Catalog',
  },
  ddr5: {
    revision: 'JESD79-5C (JEDEC DDR5)',
    officialSpecificationUrl: 'https://www.jedec.org/standards-documents/docs/jesd79-5c',
    authorityLabel: 'JEDEC Standards Catalog',
  },
  lpddr5: {
    revision: 'JESD209-5B (JEDEC LPDDR5/5X)',
    officialSpecificationUrl: 'https://www.jedec.org/standards-documents/docs/jesd209-5b',
    authorityLabel: 'JEDEC Standards Catalog',
  },
  lpddr5x: {
    revision: 'JESD209-5B (LPDDR5X Extensions)',
    officialSpecificationUrl: 'https://www.jedec.org/standards-documents/docs/jesd209-5b',
    authorityLabel: 'JEDEC Standards Catalog',
  },
  hbm3: {
    revision: 'JESD238A (JEDEC HBM3)',
    officialSpecificationUrl: 'https://www.jedec.org/standards-documents/docs/jesd238a',
    authorityLabel: 'JEDEC Standards Catalog',
  },
  dfi: {
    revision: 'DFI 5.1 (DDR PHY Interface)',
    officialSpecificationUrl: 'https://www.ddr-phy.org/specifications/',
    authorityLabel: 'DFI Group Official Portal',
  },
  'dfi-versions': {
    revision: 'DFI 3.1 / 4.0 / 5.0 / 5.1',
    officialSpecificationUrl: 'https://www.ddr-phy.org/specifications/',
    authorityLabel: 'DFI Group Official Portal',
  },
  'onfi-nand': {
    revision: 'ONFI 5.1 Specification',
    officialSpecificationUrl: 'https://www.onfi.org/specifications',
    authorityLabel: 'ONFI Workgroup',
  },
  ucie: {
    revision: 'UCIe 2.0 (2024)',
    officialSpecificationUrl: 'https://www.uciexpress.org/specifications',
    authorityLabel: 'UCIe Consortium',
  },
  cxl: {
    revision: 'CXL 3.1 / 3.2',
    officialSpecificationUrl: 'https://www.computeexpresslink.org/download-the-specification',
    authorityLabel: 'CXL Consortium',
  },
  bow: {
    revision: 'OCP ODSA BoW Rev 1.0',
    officialSpecificationUrl: 'https://www.opencompute.org/contributions',
    authorityLabel: 'Open Compute Project',
  },
  i3c: {
    revision: 'MIPI I3C Basic v1.1.1',
    officialSpecificationUrl: 'https://www.mipi.org/specifications/i3c-sensor-specification',
    authorityLabel: 'MIPI Alliance',
  },
  'riscv-debug': {
    revision: 'RISC-V Debug Spec v1.0',
    officialSpecificationUrl: 'https://github.com/riscv/riscv-debug-spec',
    authorityLabel: 'RISC-V International',
  },
  'riscv-ext-debug': {
    revision: 'RISC-V External Debug v1.0',
    officialSpecificationUrl: 'https://github.com/riscv/riscv-debug-spec',
    authorityLabel: 'RISC-V International',
  },
  'ieee-1800-sv': {
    revision: 'IEEE Std 1800-2023',
    officialSpecificationUrl: 'https://standards.ieee.org/ieee/1800/10687/',
    authorityLabel: 'IEEE Standards Association',
  },
  'ieee-1800-2-uvm': {
    revision: 'IEEE Std 1800.2-2020',
    officialSpecificationUrl: 'https://standards.ieee.org/ieee/1800.2/7752/',
    authorityLabel: 'IEEE Standards Association',
  },
  'ieee-1801-upf': {
    revision: 'IEEE Std 1801-2018 (UPF 3.1)',
    officialSpecificationUrl: 'https://standards.ieee.org/ieee/1801/7270/',
    authorityLabel: 'IEEE Standards Association',
  },
  'iso-26262-iec-61508': {
    revision: 'ISO 26262:2018 / IEC 61508 Ed 2.0',
    officialSpecificationUrl: 'https://www.iso.org/standard/68383.html',
    authorityLabel: 'ISO Standards Catalog',
  },
  spdm: {
    revision: 'DMTF DSP0274 v1.3.1',
    officialSpecificationUrl: 'https://www.dmtf.org/standards/spdm',
    authorityLabel: 'DMTF Standards',
  },
};

export function resolveOfficialSpecificationMetadata(input: SpecInput): ResolvedSpecMetadata {
  const exact = EXACT_SPEC_MAP[input.id];
  if (exact) return exact;

  const body = (input.standardBody || '').toLowerCase();
  const idLower = input.id.toLowerCase();
  const revision =
    input.specVersion && input.year && input.year !== 'Standard' && !input.specVersion.includes(input.year)
      ? `${input.specVersion} (${input.year})`
      : input.specVersion || `${input.standardBody} (${input.year || 'Current'})`;

  if (body.includes('arm') || body.includes('amba') || idLower.startsWith('axi') || idLower.startsWith('ahb') || idLower.startsWith('apb') || idLower.startsWith('chi') || idLower.startsWith('ace') || idLower === 'atb' || idLower === 'cxs' || idLower === 'dti' || idLower === 'lti' || idLower === 'q-channel' || idLower === 'p-channel') {
    return {
      revision,
      officialSpecificationUrl: 'https://developer.arm.com/Architectures/AMBA',
      authorityLabel: 'Arm AMBA Architecture Portal',
    };
  }
  if (body.includes('pci-sig') || body.includes('pcisig') || idLower.startsWith('pcie') || idLower === 'pipe') {
    return {
      revision,
      officialSpecificationUrl: 'https://pcisig.com/specifications',
      authorityLabel: 'PCI-SIG Specifications Library',
    };
  }
  if (idLower.startsWith('cxl')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.computeexpresslink.org/download-the-specification',
      authorityLabel: 'CXL Consortium',
    };
  }
  if (idLower.startsWith('ucie')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.uciexpress.org/specifications',
      authorityLabel: 'UCIe Consortium',
    };
  }
  if (idLower.includes('dfi')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.ddr-phy.org/specifications/',
      authorityLabel: 'DFI Group',
    };
  }
  if (idLower.includes('onfi')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.onfi.org/specifications',
      authorityLabel: 'ONFI Workgroup',
    };
  }
  if (idLower.startsWith('nvme')) {
    return {
      revision,
      officialSpecificationUrl: 'https://nvmexpress.org/specifications/',
      authorityLabel: 'NVM Express Specifications',
    };
  }
  if (body.includes('jedec') || idLower.startsWith('ddr') || idLower.startsWith('lpddr') || idLower.startsWith('gddr') || idLower.startsWith('hbm') || idLower === 'ufs' || idLower === 'emmc' || idLower.includes('dimm') || idLower === 'spd-i3c') {
    return {
      revision,
      officialSpecificationUrl: 'https://www.jedec.org/standards-documents',
      authorityLabel: 'JEDEC Standards Documents',
    };
  }
  if (body.includes('mipi') || idLower.startsWith('mipi') || idLower === 'i3c') {
    return {
      revision,
      officialSpecificationUrl: 'https://www.mipi.org/specifications',
      authorityLabel: 'MIPI Alliance Specifications',
    };
  }
  if (body.includes('usb') || idLower.startsWith('usb') || idLower === 'xhci' || idLower === 'ehci' || idLower === 'ohci' || idLower === 'uhci') {
    return {
      revision,
      officialSpecificationUrl: 'https://www.usb.org/documents',
      authorityLabel: 'USB-IF Document Library',
    };
  }
  if (body.includes('vesa') || idLower.startsWith('dp-') || idLower === 'displayport' || idLower === 'edp' || idLower === 'vesa-dsc') {
    return {
      revision,
      officialSpecificationUrl: 'https://vesa.org/vesa-standards/',
      authorityLabel: 'VESA Standards',
    };
  }
  if (body.includes('hdmi') || idLower.startsWith('hdmi')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.hdmi.org/spec/index',
      authorityLabel: 'HDMI Forum Specifications',
    };
  }
  if (body.includes('risc-v') || idLower.startsWith('riscv') || idLower.startsWith('rv32')) {
    return {
      revision,
      officialSpecificationUrl: 'https://riscv.org/technical/specifications/',
      authorityLabel: 'RISC-V International',
    };
  }
  if (body.includes('opentitan') || idLower.startsWith('tl-ul') || idLower.includes('keymgr') || idLower.includes('csrng') || idLower.includes('hmac') || idLower.includes('aes-if') || idLower.includes('kmac')) {
    return {
      revision,
      officialSpecificationUrl: 'https://opentitan.org/book/hw/index.html',
      authorityLabel: 'lowRISC OpenTitan Hardware Book',
    };
  }
  if (body.includes('chips alliance') || idLower.includes('tilelink')) {
    return {
      revision,
      officialSpecificationUrl: 'https://starfivetech.com/uploads/tilelink-spec-1.8.1.pdf',
      authorityLabel: 'CHIPS Alliance TileLink',
    };
  }
  if (body.includes('openhw') || idLower === 'obi' || idLower === 'core-v-ext-if') {
    return {
      revision,
      officialSpecificationUrl: 'https://github.com/openhwgroup/obi',
      authorityLabel: 'OpenHW Group Specifications',
    };
  }
  if (body.includes('ocp') || body.includes('open compute') || idLower === 'bow' || idLower === 'aib' || idLower === 'ocp-specs') {
    return {
      revision,
      officialSpecificationUrl: 'https://www.opencompute.org/contributions',
      authorityLabel: 'Open Compute Project',
    };
  }
  if (body.includes('accellera') || idLower.includes('pss') || idLower.includes('systemrdl') || idLower.includes('ucis')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.accellera.org/downloads/standards',
      authorityLabel: 'Accellera Systems Initiative',
    };
  }
  if (body.includes('avalon') || body.includes('intel')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.intel.com/content/www/us/en/docs/programmable/683091/current/introduction-to-the-interface-specifications.html',
      authorityLabel: 'Intel FPGA Interface Specifications',
    };
  }
  if (body.includes('can') || idLower.startsWith('can')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.can-cia.org/standardization/specifications',
      authorityLabel: 'CAN in Automation (CiA)',
    };
  }
  if (body.includes('sd association') || idLower === 'sd' || idLower === 'sdio') {
    return {
      revision,
      officialSpecificationUrl: 'https://www.sdcard.org/developers/sd-standard-overview/',
      authorityLabel: 'SD Association',
    };
  }
  if (body.includes('nist') || idLower.includes('sha') || idLower.includes('trng') || idLower.includes('ecc-rsa')) {
    return {
      revision,
      officialSpecificationUrl: 'https://csrc.nist.gov/publications/fips',
      authorityLabel: 'NIST Cryptographic Standards',
    };
  }
  if (body.includes('trusted computing') || idLower.includes('tpm')) {
    return {
      revision,
      officialSpecificationUrl: 'https://trustedcomputinggroup.org/work-groups/trusted-platform-module/',
      authorityLabel: 'Trusted Computing Group',
    };
  }
  if (body.includes('bluetooth') || idLower === 'bluetooth' || idLower === 'ble') {
    return {
      revision,
      officialSpecificationUrl: 'https://www.bluetooth.com/specifications/specs/',
      authorityLabel: 'Bluetooth SIG Specifications',
    };
  }
  if (body.includes('3gpp') || idLower === 'lte' || idLower === '5g-nr' || idLower === '6g-research-if') {
    return {
      revision,
      officialSpecificationUrl: 'https://www.3gpp.org/specifications-technologies',
      authorityLabel: '3GPP Specifications',
    };
  }
  if (body.includes('lora')) {
    return {
      revision,
      officialSpecificationUrl: 'https://lora-alliance.org/resource_hub/',
      authorityLabel: 'LoRa Alliance Resources',
    };
  }
  if (body.includes('modbus')) {
    return {
      revision,
      officialSpecificationUrl: 'https://modbus.org/specs.php',
      authorityLabel: 'Modbus Organization',
    };
  }
  if (body.includes('ethercat')) {
    return {
      revision,
      officialSpecificationUrl: 'https://www.ethercat.org/en/technology.html',
      authorityLabel: 'EtherCAT Technology Group',
    };
  }

  return {
    revision,
    officialSpecificationUrl: 'https://standards.ieee.org/',
    authorityLabel: input.standardBody || 'IEEE Standards Association',
  };
}
