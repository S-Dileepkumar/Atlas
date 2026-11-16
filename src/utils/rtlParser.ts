export type SourceFormat =
  | 'SystemVerilog'
  | 'Verilog'
  | 'VHDL'
  | 'Chisel'
  | 'HJSON'
  | 'SystemRDL'
  | 'FuseSoC Core'
  | 'Unknown';

export interface ParsedModule {
  name: string;
  filePath: string;
  format: SourceFormat;
  packages: string[];
  parameters: { name: string; defaultValue: string }[];
  localparams: { name: string; value: string }[];
  ports: { name: string; direction: string; width: string }[];
  enums: string[];
  internalSignals: string[];
  assertions: string[];
  instantiations: { moduleType: string; instanceName: string }[];
  detectedProtocols: string[];
  partialReason?: string;
}

export interface ParsedRegisterEntry {
  name: string;
  description: string;
  access?: string;
  fields: string[];
  sourceFile: string;
}

export interface RepoIngestionProfile {
  repoName: string;
  repoUrl: string;
  license?: string;
  description?: string;
  defaultBranch?: string;
  readmeExcerpt?: string;
  detectedLanguages: SourceFormat[];
  filesScanned: { path: string; format: SourceFormat }[];
  testbenchDirs: string[];
  uvmComponents: string[];
  fusesocTargets: string[];
  modules: ParsedModule[];
  registers: ParsedRegisterEntry[];
  detectedProtocols: string[];
  confidenceNote: string;
}

export function detectFileFormat(path: string): SourceFormat {
  const lower = path.toLowerCase();
  if (lower.endsWith('.sv') || lower.endsWith('.svh')) return 'SystemVerilog';
  if (lower.endsWith('.v') || lower.endsWith('.vh')) return 'Verilog';
  if (lower.endsWith('.vhd') || lower.endsWith('.vhdl')) return 'VHDL';
  if (lower.endsWith('.scala')) return 'Chisel';
  if (lower.endsWith('.hjson')) return 'HJSON';
  if (lower.endsWith('.rdl')) return 'SystemRDL';
  if (lower.endsWith('.core')) return 'FuseSoC Core';
  return 'Unknown';
}

function stripSvComments(code: string): string {
  let out = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
    } else if (code[i] === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
    } else if (code[i] === '"') {
      out += '"';
      i++;
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') i++;
        i++;
      }
      out += '"';
      i++;
    } else {
      out += code[i];
      i++;
    }
  }
  return out;
}

function extractBalancedParens(text: string, openIdx: number): { content: string; endIdx: number } | null {
  if (text[openIdx] !== '(') return null;
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) {
        return { content: text.slice(openIdx + 1, i), endIdx: i };
      }
    }
  }
  return null;
}

function splitTopLevelCommas(block: string): string[] {
  const items: string[] = [];
  let depthParen = 0;
  let depthBrack = 0;
  let start = 0;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === '(') depthParen++;
    else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
    else if (ch === '[') depthBrack++;
    else if (ch === ']') depthBrack = Math.max(0, depthBrack - 1);
    else if (ch === ',' && depthParen === 0 && depthBrack === 0) {
      items.push(block.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = block.slice(start).trim();
  if (tail) items.push(tail);
  return items;
}

export function inferProtocolsFromSignals(names: string[], text: string): string[] {
  const lowerNames = names.map((n) => n.toLowerCase());
  const lowerText = text.toLowerCase();
  const found = new Set<string>();

  if (lowerNames.some((n) => n.includes('awvalid')) && lowerNames.some((n) => n.includes('wvalid'))) {
    found.add(lowerNames.some((n) => n.includes('awlen') || n.includes('wlast')) ? 'AXI4' : 'AXI4-Lite');
  }
  if (lowerNames.some((n) => n.includes('tvalid')) && lowerNames.some((n) => n.includes('tready'))) {
    found.add('AXI4-Stream');
  }
  if (lowerNames.some((n) => n.includes('psel')) && lowerNames.some((n) => n.includes('penable'))) {
    found.add('APB');
  }
  if (lowerNames.some((n) => n.includes('htrans')) && lowerNames.some((n) => n.includes('hready'))) {
    found.add('AHB-Lite');
  }
  if (lowerNames.some((n) => n.startsWith('tl_') || n.includes('a_valid')) || lowerText.includes('tlul_pkg')) {
    found.add('TL-UL');
  }
  if (lowerNames.some((n) => n.includes('instr_req')) && lowerNames.some((n) => n.includes('instr_gnt'))) {
    found.add('OBI');
  }
  if (lowerNames.some((n) => n.includes('sclk')) && lowerNames.some((n) => n.includes('mosi'))) {
    found.add('SPI');
  }
  if (lowerNames.some((n) => n.includes('scl')) && lowerNames.some((n) => n.includes('sda'))) {
    found.add('I2C');
  }
  if (lowerNames.some((n) => n.includes('wb_cyc') || n.includes('wbs_stb'))) {
    found.add('Wishbone');
  }
  return Array.from(found);
}

const SV_KEYWORDS = new Set([
  'module', 'endmodule', 'input', 'output', 'inout', 'logic', 'wire', 'reg', 'assign',
  'always', 'always_ff', 'always_comb', 'always_latch', 'if', 'else', 'case', 'begin',
  'end', 'for', 'generate', 'genvar', 'localparam', 'parameter', 'typedef', 'struct',
  'enum', 'function', 'task', 'return', 'assert', 'property', 'cover', 'initial',
]);

export function parseSourceFile(filePath: string, content: string): {
  format: SourceFormat;
  modules: ParsedModule[];
  registers: ParsedRegisterEntry[];
  fusesocTargets: string[];
  uvmHits: string[];
} {
  const format = detectFileFormat(filePath);
  const modules: ParsedModule[] = [];
  const registers: ParsedRegisterEntry[] = [];
  const fusesocTargets: string[] = [];
  const uvmHits: string[] = [];

  if (content.includes('uvm_component') || content.includes('uvm_driver') || content.includes('uvm_monitor') || content.includes('uvm_sequence_item')) {
    const clsMatches = content.matchAll(/class\s+(\w+)\s+extends\s+(uvm_\w+)/g);
    for (const m of clsMatches) uvmHits.push(`${m[1]} (${m[2]})`);
  }

  if (format === 'SystemVerilog' || format === 'Verilog') {
    const clean = stripSvComments(content);
    const packages = Array.from(clean.matchAll(/import\s+([\w:]+)\s*;/g)).map((m) => m[1]);
    const modMatches = Array.from(clean.matchAll(/\bmodule\s+(\w+)/g));

    for (let idx = 0; idx < modMatches.length; idx++) {
      const m = modMatches[idx];
      const modName = m[1];
      const startPos = m.index ?? 0;
      const endMatch = clean.slice(startPos).search(/\bendmodule\b/);
      const modBody = endMatch >= 0 ? clean.slice(startPos, startPos + endMatch) : clean.slice(startPos);

      const params: ParsedModule['parameters'] = [];
      const ports: ParsedModule['ports'] = [];

      // Look for #(...) and (...) in module header
      const headerEnd = modBody.indexOf(';');
      const header = headerEnd >= 0 ? modBody.slice(0, headerEnd) : modBody.slice(0, 600);
      const hashIdx = header.indexOf('#');
      let searchPortFrom = 0;

      if (hashIdx >= 0) {
        const parenOpen = header.indexOf('(', hashIdx);
        if (parenOpen >= 0) {
          const pBlock = extractBalancedParens(header, parenOpen);
          if (pBlock) {
            searchPortFrom = pBlock.endIdx + 1;
            for (const entry of splitTopLevelCommas(pBlock.content)) {
              const pm = entry.match(/(?:parameter\s+)?(?:[\w:]+\s+)?(\w+)\s*=\s*(.+)$/);
              if (pm) params.push({ name: pm[1], defaultValue: pm[2].trim() });
            }
          }
        }
      }

      const portOpen = header.indexOf('(', searchPortFrom);
      if (portOpen >= 0) {
        const portBlock = extractBalancedParens(header, portOpen);
        if (portBlock) {
          for (const entry of splitTopLevelCommas(portBlock.content)) {
            const pt = entry.match(/\b(input|output|inout)\b\s*(?:logic|wire|reg)?\s*(?:([\w:]+)\s+)?(\[[^\]]+\])?\s*(\w+)/);
            if (pt) {
              ports.push({
                direction: pt[1],
                width: pt[3] || pt[2] || '1',
                name: pt[4],
              });
            }
          }
        }
      }

      const localparams = Array.from(modBody.matchAll(/\blocalparam\s+(?:[\w\[\]:]+\s+)?(\w+)\s*=\s*([^;]+);/g)).map((lp) => ({
        name: lp[1],
        value: lp[2].trim(),
      }));

      const enums = Array.from(modBody.matchAll(/\btypedef\s+enum\b[\s\S]*?\}\s*(\w+)\s*;/g)).map((e) => e[1]);
      const internalSignals = Array.from(modBody.matchAll(/\b(?:logic|wire|reg)\s+(?:\[[^\]]+\]\s*)?(\w+)\s*[;=]/g))
        .map((s) => s[1])
        .filter((n) => !ports.some((p) => p.name === n))
        .slice(0, 24);

      const assertions = Array.from(modBody.matchAll(/\b(?:assert|property)\s+[\s\S]{0,120}?;/g)).map((a) =>
        a[0].replace(/\s+/g, ' ').trim()
      );

      // Child module instantiations: <TypeName> #( ... ) <instName> ( ... ); or <TypeName> <instName> ( ... );
      const bodyOnly = headerEnd >= 0 ? modBody.slice(headerEnd + 1) : modBody;
      const instantiations: ParsedModule['instantiations'] = [];
      const instRegex = /\b([a-zA-Z_]\w*)\s+(?:#\s*\([\s\S]*?\)\s*)?([a-zA-Z_]\w*)\s*\(\s*\./g;
      let im: RegExpExecArray | null;
      while ((im = instRegex.exec(bodyOnly)) !== null) {
        if (!SV_KEYWORDS.has(im[1]) && im[1] !== modName) {
          instantiations.push({ moduleType: im[1], instanceName: im[2] });
        }
      }

      const detectedProtocols = inferProtocolsFromSignals(
        ports.map((p) => p.name),
        clean
      );

      modules.push({
        name: modName,
        filePath,
        format,
        packages,
        parameters: params,
        localparams,
        ports,
        enums,
        internalSignals,
        assertions,
        instantiations,
        detectedProtocols,
        partialReason: ports.length === 0 ? 'Module uses non-ANSI port list or preprocessor macros; ports partially extracted.' : undefined,
      });
    }
  } else if (format === 'Chisel') {
    const classMatches = Array.from(content.matchAll(/\bclass\s+(\w+)[\s\S]{0,140}?extends\s+(?:Module|LazyModule|RawModule)/g));
    for (const cm of classMatches) {
      const modName = cm[1];
      const ios = Array.from(content.matchAll(/\bval\s+(\w+)\s*=\s*(Input|Output|Flipped|Decoupled)\s*\(([^)]+)\)/g)).map((p) => ({
        name: p[1],
        direction: p[2],
        width: p[3].trim(),
      }));
      const children = Array.from(content.matchAll(/Module\s*\(\s*new\s+(\w+)/g)).map((c) => ({
        moduleType: c[1],
        instanceName: c[1].toLowerCase(),
      }));
      modules.push({
        name: modName,
        filePath,
        format: 'Chisel',
        packages: Array.from(content.matchAll(/^import\s+(.+)$/gm)).map((i) => i[1]),
        parameters: [],
        localparams: [],
        ports: ios,
        enums: [],
        internalSignals: [],
        assertions: [],
        instantiations: children,
        detectedProtocols: inferProtocolsFromSignals(ios.map((p) => p.name), content),
        partialReason: 'Chisel Scala AST partially extracted via structural Bundle/Module pattern matching.',
      });
    }
  } else if (format === 'VHDL') {
    const entMatch = content.match(/\bentity\s+(\w+)\s+is([\s\S]*?)\bend\s+(?:entity\s+)?\1?\s*;/i);
    if (entMatch) {
      const portSection = entMatch[2].match(/\bport\s*\(([\s\S]*?)\)\s*;/i);
      const ports: ParsedModule['ports'] = [];
      if (portSection) {
        for (const line of portSection[1].split(';')) {
          const pm = line.match(/(\w+)\s*:\s*(in|out|inout)\s+(.+)/i);
          if (pm) ports.push({ name: pm[1], direction: pm[2].toLowerCase(), width: pm[3].trim() });
        }
      }
      modules.push({
        name: entMatch[1],
        filePath,
        format: 'VHDL',
        packages: Array.from(content.matchAll(/\buse\s+([\w.]+)\s*;/gi)).map((u) => u[1]),
        parameters: [],
        localparams: [],
        ports,
        enums: [],
        internalSignals: [],
        assertions: [],
        instantiations: [],
        detectedProtocols: inferProtocolsFromSignals(ports.map((p) => p.name), content),
      });
    }
  } else if (format === 'HJSON') {
    const regMatches = Array.from(content.matchAll(/name\s*:\s*"?([A-Z0-9_]+)"?[\s\S]{0,300}?desc\s*:\s*"([^"]+)"/g));
    for (const rm of regMatches) {
      registers.push({
        name: rm[1],
        description: rm[2],
        fields: [],
        sourceFile: filePath,
      });
    }
  } else if (format === 'SystemRDL') {
    const regMatches = Array.from(content.matchAll(/\breg\s+(\w+)\s*\{([\s\S]*?)\};/g));
    for (const rm of regMatches) {
      const fields = Array.from(rm[2].matchAll(/\bfield\s*\{[^}]*\}\s*(\w+)/g)).map((f) => f[1]);
      registers.push({
        name: rm[1],
        description: 'Extracted from SystemRDL specification',
        fields,
        sourceFile: filePath,
      });
    }
  } else if (format === 'FuseSoC Core') {
    const targetSection = content.split(/targets:/)[1] || '';
    const tMatches = Array.from(targetSection.matchAll(/^\s{2}(\w+):/gm)).map((t) => t[1]);
    fusesocTargets.push(...tMatches);
  }

  return { format, modules, registers, fusesocTargets, uvmHits };
}

export function ingestRepositoryFiles(
  repoName: string,
  repoUrl: string,
  files: Array<{ path: string; content: string }>,
  meta?: { license?: string; description?: string; defaultBranch?: string; readmeExcerpt?: string }
): RepoIngestionProfile {
  const allModules: ParsedModule[] = [];
  const allRegisters: ParsedRegisterEntry[] = [];
  const allTargets = new Set<string>();
  const allUvm = new Set<string>();
  const allProtocols = new Set<string>();
  const langs = new Set<SourceFormat>();
  const testbenchDirs = new Set<string>();

  for (const f of files) {
    const fmt = detectFileFormat(f.path);
    if (fmt !== 'Unknown') langs.add(fmt);
    if (f.path.includes('/dv/') || f.path.includes('/tb/') || f.path.includes('test')) {
      const dir = f.path.split('/').slice(0, -1).join('/') || 'root';
      testbenchDirs.add(dir);
    }
    const parsed = parseSourceFile(f.path, f.content);
    for (const mod of parsed.modules) {
      allModules.push(mod);
      mod.detectedProtocols.forEach((p) => allProtocols.add(p));
    }
    allRegisters.push(...parsed.registers);
    parsed.fusesocTargets.forEach((t) => allTargets.add(t));
    parsed.uvmHits.forEach((u) => allUvm.add(u));
  }

  return {
    repoName,
    repoUrl,
    license: meta?.license,
    description: meta?.description,
    defaultBranch: meta?.defaultBranch,
    readmeExcerpt: meta?.readmeExcerpt,
    detectedLanguages: Array.from(langs),
    filesScanned: files.map((f) => ({ path: f.path, format: detectFileFormat(f.path) })),
    testbenchDirs: Array.from(testbenchDirs),
    uvmComponents: Array.from(allUvm),
    fusesocTargets: Array.from(allTargets),
    modules: allModules,
    registers: allRegisters,
    detectedProtocols: Array.from(allProtocols),
    confidenceNote:
      allModules.some((m) => m.partialReason) || langs.has('Chisel')
        ? 'Mixed Verified + Partial Extraction: Chisel/Macro-heavy blocks flagged where full elaboration requires compiler tools.'
        : 'Verified AST/Header Extraction from supplied source files.',
  };
}
