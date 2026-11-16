import React, { useState } from 'react';
import { GitBranch, Upload, FileCode2, AlertCircle, CheckCircle2, Play } from 'lucide-react';
import { ingestRepositoryFiles, RepoIngestionProfile } from '../utils/rtlParser';

const SAMPLE_BUNDLES: Array<{
  id: string;
  label: string;
  repoName: string;
  repoUrl: string;
  license: string;
  files: Array<{ path: string; content: string }>;
}> = [
  {
    id: 'ibex-sample',
    label: 'Load lowRISC Ibex Multi-File RTL + Core Sample',
    repoName: 'lowRISC/ibex',
    repoUrl: 'https://github.com/lowRISC/ibex',
    license: 'Apache-2.0',
    files: [
      {
        path: 'rtl/ibex_top.sv',
        content: `import ibex_pkg::*;
module ibex_top #(
  parameter bit PMPEnable = 1'b0,
  parameter int unsigned PMPNumRegions = 4,
  parameter bit RV32E = 1'b0
) (
  input  logic        clk_i,
  input  logic        rst_ni,
  output logic        instr_req_o,
  input  logic        instr_gnt_i,
  input  logic        instr_rvalid_i,
  output logic [31:0] instr_addr_o,
  input  logic [31:0] instr_rdata_i,
  output logic        data_req_o,
  input  logic        data_gnt_i,
  output logic        data_we_o,
  output logic [31:0] data_addr_o
);
  logic core_busy_d;
  ibex_core #(.PMPEnable(PMPEnable)) u_ibex_core (.clk_i(clk_i), .rst_ni(rst_ni));
  assert property (@(posedge clk_i) disable iff (!rst_ni) instr_req_o |-> !$isunknown(instr_addr_o));
endmodule`,
      },
      {
        path: 'ibex_core.core',
        content: `CAPI=2:
name: "lowrisc:ibex:ibex_core:0.1"
targets:
  default:
    filesets:
      - files_rtl
  lint:
    default_tool: verilator
  sim:
    default_tool: vcs`,
      },
      {
        path: 'dv/uvm/core_ibex/env/ibex_if_driver.sv',
        content: `class ibex_obi_driver extends uvm_driver #(obi_seq_item);
endclass`,
      },
    ],
  },
  {
    id: 'aes-hjson-sample',
    label: 'Load OpenTitan AES RTL + HJSON CSR Sample',
    repoName: 'lowRISC/opentitan (hw/ip/aes)',
    repoUrl: 'https://github.com/lowRISC/opentitan',
    license: 'Apache-2.0',
    files: [
      {
        path: 'hw/ip/aes/rtl/aes.sv',
        content: `import tlul_pkg::*;
module aes #(
  parameter bit AES192Enable = 1'b1,
  parameter bit SecMasking = 1'b1
) (
  input  logic             clk_i,
  input  logic             rst_ni,
  input  tlul_pkg::tl_h2d_t tl_i,
  output tlul_pkg::tl_d2h_t tl_o
);
  typedef enum logic [1:0] {IDLE, INIT, RUN, ERROR} aes_ctrl_e;
  aes_core u_aes_core (.clk_i(clk_i));
  aes_reg_top u_reg (.clk_i(clk_i), .tl_i(tl_i), .tl_o(tl_o));
endmodule`,
      },
      {
        path: 'hw/ip/aes/data/aes.hjson',
        content: `{
  name: "CTRL_SHADOWED",
  desc: "Control register controlling AES mode, key length, and operation."
},
{
  name: "TRIGGER",
  desc: "Trigger start, key/IV clear, or PRNG reseed."
},
{
  name: "STATUS",
  desc: "Reports idle, stall, output_valid, and alert status bits."
}`,
      },
    ],
  },
];

function parseGithubSlug(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

export const RepoIngestionView: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/lowRISC/ibex');
  const [customFilename, setCustomFilename] = useState('rtl/custom_ip.sv');
  const [customSource, setCustomSource] = useState(
    `module axi_lite_bridge #(
  parameter int ADDR_W = 32,
  parameter int DATA_W = 32
) (
  input  logic              aclk,
  input  logic              aresetn,
  input  logic              s_axi_awvalid,
  output logic              s_axi_awready,
  input  logic [ADDR_W-1:0] s_axi_awaddr,
  input  logic              s_axi_wvalid,
  output logic              s_axi_wready,
  output logic              m_apb_psel,
  output logic              m_apb_penable
);
  typedef enum logic [1:0] {ST_IDLE, ST_SETUP, ST_ACCESS} apb_fsm_e;
  apb_slave_mux u_mux (.clk_i(aclk));
  assert property (@(posedge aclk) disable iff (!aresetn) m_apb_penable |-> m_apb_psel);
endmodule`
  );

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [profile, setProfile] = useState<RepoIngestionProfile>(() =>
    ingestRepositoryFiles(
      SAMPLE_BUNDLES[0].repoName,
      SAMPLE_BUNDLES[0].repoUrl,
      SAMPLE_BUNDLES[0].files,
      { license: SAMPLE_BUNDLES[0].license, description: 'Preloaded multi-file Ibex RTL + FuseSoC + UVM sample' }
    )
  );

  const handleFetchGithub = async () => {
    const slug = parseGithubSlug(repoUrl);
    if (!slug) {
      setFetchError('Enter a valid public GitHub repository URL (e.g. https://github.com/lowRISC/ibex).');
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${slug.owner}/${slug.repo}`);
      if (!repoRes.ok) {
        throw new Error(`GitHub API returned ${repoRes.status} (rate limit or private repository).`);
      }
      const repoJson = await repoRes.json();
      const branch: string = repoJson.default_branch || 'main';

      const treeRes = await fetch(
        `https://api.github.com/repos/${slug.owner}/${slug.repo}/git/trees/${branch}?recursive=1`
      );
      if (!treeRes.ok) {
        throw new Error(`Could not fetch file tree (${treeRes.status}).`);
      }
      const treeJson = await treeRes.json();
      const candidates: Array<{ path: string }> = (treeJson.tree || []).filter(
        (t: { type: string; path: string }) =>
          t.type === 'blob' &&
          /\.(sv|v|vhd|scala|hjson|rdl|core)$/i.test(t.path)
      );

      // Prioritize top-level rtl/, hw/, or .core files up to 6 raw fetches to stay respectful of API limits
      const prioritized = [
        ...candidates.filter((c) => c.path.includes('top') || c.path.endsWith('.core') || c.path.endsWith('.hjson')),
        ...candidates.filter((c) => c.path.includes('rtl/') || c.path.includes('src/')),
        ...candidates,
      ];
      const uniquePaths = Array.from(new Set(prioritized.map((c) => c.path))).slice(0, 6);

      const downloaded: Array<{ path: string; content: string }> = [];
      for (const path of uniquePaths) {
        try {
          const rawRes = await fetch(
            `https://raw.githubusercontent.com/${slug.owner}/${slug.repo}/${branch}/${path}`
          );
          if (rawRes.ok) {
            const text = await rawRes.text();
            downloaded.push({ path, content: text.slice(0, 32000) });
          }
        } catch {
          // Skip individual unreadable raw file
        }
      }

      if (downloaded.length === 0) {
        throw new Error('No supported RTL/HJSON/SystemRDL/FuseSoC files were downloadable from this repository.');
      }

      const nextProfile = ingestRepositoryFiles(`${slug.owner}/${slug.repo}`, repoUrl, downloaded, {
        license: repoJson.license?.spdx_id || 'Check LICENSE file',
        description: repoJson.description || undefined,
        defaultBranch: branch,
      });
      setProfile(nextProfile);
    } catch (err) {
      setFetchError(
        err instanceof Error
          ? `${err.message} You can test the multi-file parser immediately using the preloaded samples or custom source paste below.`
          : 'Failed to query GitHub API.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleParseCustom = () => {
    setFetchError(null);
    const nextProfile = ingestRepositoryFiles(
      'Custom Local RTL / Spec Input',
      'local://pasted-source',
      [{ path: customFilename || 'module.sv', content: customSource }],
      { description: 'Parsed directly in-browser via balanced-parenthesis SystemVerilog/Verilog/VHDL/Chisel/HJSON/RDL parser.' }
    );
    setProfile(nextProfile);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const loaded: Array<{ path: string; content: string }> = [];
    for (const f of Array.from(fileList).slice(0, 12)) {
      const content = await f.text();
      loaded.push({ path: f.name, content });
    }
    setFetchError(null);
    setProfile(
      ingestRepositoryFiles(
        `Uploaded Bundle (${loaded.length} files)`,
        'local://uploaded-files',
        loaded,
        { description: 'Multi-file local upload analyzed in-browser.' }
      )
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <p className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
          Automated RTL & Metadata Extraction Engine
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
          Repository Ingestion Pipeline
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Inspect public GitHub hardware repositories, load real multi-file RTL bundles, or upload/paste SystemVerilog, Verilog, VHDL, Chisel, HJSON, SystemRDL, or FuseSoC `.core` files to automatically extract modules, ports, parameters, assertions, protocols, and UVM classes.
        </p>
      </div>

      {/* Input Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            1. Fetch Public GitHub Repository or Load Real Sample
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/lowRISC/ibex"
              className="flex-1 min-w-[220px] px-3 py-2 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              disabled={loading}
              onClick={handleFetchGithub}
              className="px-4 py-2 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white cursor-pointer"
            >
              {loading ? 'Scanning Repo...' : 'Ingest GitHub URL'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {SAMPLE_BUNDLES.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setFetchError(null);
                  setRepoUrl(b.repoUrl);
                  setProfile(
                    ingestRepositoryFiles(b.repoName, b.repoUrl, b.files, {
                      license: b.license,
                      description: `Preloaded multi-file snapshot from ${b.repoName}`,
                    })
                  );
                }}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-500 cursor-pointer"
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Or upload multi-file `.sv`, `.v`, `.hjson`, `.rdl`, `.core` files:</span>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:border-cyan-500 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Upload RTL Files
              <input
                type="file"
                multiple
                accept=".sv,.svh,.v,.vh,.vhd,.vhdl,.scala,.hjson,.rdl,.core"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {fetchError && (
            <div className="p-3 rounded border border-amber-500/40 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{fetchError}</span>
            </div>
          )}
        </div>

        {/* Custom RTL Paste Sandbox */}
        <div className="lg:col-span-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              2. Direct RTL / HJSON / SystemRDL Parser Input
            </div>
            <button
              type="button"
              onClick={handleParseCustom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 dark:bg-cyan-600 text-white hover:opacity-90 cursor-pointer"
            >
              <Play className="w-3 h-3" /> Parse Source
            </button>
          </div>

          <input
            type="text"
            value={customFilename}
            onChange={(e) => setCustomFilename(e.target.value)}
            placeholder="Filename with extension (e.g. module.sv, regs.hjson, map.rdl, core.core)"
            className="w-full px-3 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />

          <textarea
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            rows={6}
            className="w-full p-3 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Preliminary Extracted IP Profile */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Preliminary Extracted IP Profile · {profile.repoUrl}
              {profile.license ? ` · ${profile.license}` : ''}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {profile.repoName}
            </h2>
            {profile.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{profile.description}</p>
            )}
          </div>

          <div className="text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profile.confidenceNote}</span>
          </div>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="text-slate-500 dark:text-slate-400">Languages</div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {profile.detectedLanguages.join(', ') || 'None'}
            </div>
          </div>
          <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="text-slate-500 dark:text-slate-400">Modules Extracted</div>
            <div className="font-mono font-bold text-lg text-slate-900 dark:text-cyan-300 tabular-nums">
              {profile.modules.length}
            </div>
          </div>
          <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="text-slate-500 dark:text-slate-400">Detected Protocols</div>
            <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {profile.detectedProtocols.join(', ') || 'None inferred'}
            </div>
          </div>
          <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="text-slate-500 dark:text-slate-400">CSRs / Registers</div>
            <div className="font-mono font-bold text-lg text-slate-900 dark:text-emerald-300 tabular-nums">
              {profile.registers.length}
            </div>
          </div>
          <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="text-slate-500 dark:text-slate-400">UVM / FuseSoC</div>
            <div className="font-mono text-slate-900 dark:text-slate-100 mt-0.5 truncate">
              {profile.uvmComponents.length} UVM · {profile.fusesocTargets.length} targets
            </div>
          </div>
        </div>

        {/* Extracted Modules Detail */}
        {profile.modules.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Extracted Modules & Interfaces
            </h3>
            <div className="space-y-3">
              {profile.modules.map((mod) => (
                <div
                  key={`${mod.filePath}-${mod.name}`}
                  className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-cyan-300">
                        {mod.name}
                      </span>
                      <span className="ml-2 font-mono text-slate-500 dark:text-slate-400">
                        ({mod.filePath} · {mod.format})
                      </span>
                    </div>
                    <div className="font-mono text-blue-700 dark:text-blue-400">
                      {mod.detectedProtocols.length > 0 ? `Protocols: ${mod.detectedProtocols.join(', ')}` : 'Internal / Custom interface'}
                    </div>
                  </div>

                  {mod.partialReason && (
                    <div className="text-amber-700 dark:text-amber-300 text-[11px]">
                      Partial Extraction Notice: {mod.partialReason}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Parameters ({mod.parameters.length})</div>
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {mod.parameters.map((p) => `${p.name}=${p.defaultValue}`).join(', ') || 'None'}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Child Instances ({mod.instantiations.length})</div>
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {mod.instantiations.map((i) => `${i.moduleType} (${i.instanceName})`).join(', ') || 'Leaf module'}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Enums & Assertions</div>
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {mod.enums.join(', ') || 'No enums'} · {mod.assertions.length} SVA
                      </div>
                    </div>
                  </div>

                  {mod.ports.length > 0 && (
                    <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-[11px]">
                        <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <tr>
                            <th className="px-2.5 py-1.5">Port Name</th>
                            <th className="px-2.5 py-1.5">Direction</th>
                            <th className="px-2.5 py-1.5">Width / Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                          {mod.ports.map((p) => (
                            <tr key={p.name}>
                              <td className="px-2.5 py-1 text-slate-900 dark:text-slate-100">{p.name}</td>
                              <td className="px-2.5 py-1 text-slate-600 dark:text-slate-400">{p.direction}</td>
                              <td className="px-2.5 py-1 text-slate-600 dark:text-slate-400">{p.width}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted Registers / UVM / FuseSoC */}
        {(profile.registers.length > 0 || profile.uvmComponents.length > 0 || profile.fusesocTargets.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {profile.registers.length > 0 && (
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Extracted CSR / Registers</div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {profile.registers.map((r) => (
                    <div key={r.name} className="py-1.5">
                      <div className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">{r.name}</div>
                      <div className="text-slate-600 dark:text-slate-300">{r.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(profile.uvmComponents.length > 0 || profile.fusesocTargets.length > 0) && (
              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2">
                <div className="font-semibold text-slate-900 dark:text-slate-100">UVM & FuseSoC Artifacts</div>
                {profile.uvmComponents.length > 0 && (
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    UVM Classes: {profile.uvmComponents.join(', ')}
                  </div>
                )}
                {profile.fusesocTargets.length > 0 && (
                  <div className="font-mono text-slate-700 dark:text-slate-300">
                    FuseSoC Targets: {profile.fusesocTargets.join(', ')}
                  </div>
                )}
                {profile.testbenchDirs.length > 0 && (
                  <div className="font-mono text-slate-500 dark:text-slate-400">
                    TB Directories: {profile.testbenchDirs.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
