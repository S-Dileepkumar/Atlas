import React, { useMemo, useState } from 'react';
import { SOC_EDGES, SOC_NODES } from '../data/socGraph';
import { getProtocolById } from '../data/protocols';
import { CodeBlock } from './DiagramViewers';
import { InfiniteMeshViewport } from './InfiniteMeshViewport';

export const SocConnectivityMap: React.FC<{ onSelectProtocol: (id: string) => void }> = ({ onSelectProtocol }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('noc');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const activeNode = SOC_NODES.find((n) => n.id === selectedNodeId) || SOC_NODES[0];
  const activeEdge = SOC_EDGES.find((e) => e.id === selectedEdgeId) || null;
  const nodeMap = useMemo(() => new Map(SOC_NODES.map((n) => [n.id, n])), []);

  const bounds = useMemo(() => {
    const minX = Math.min(...SOC_NODES.map((n) => n.x), 0);
    const minY = Math.min(...SOC_NODES.map((n) => n.y), 0);
    const maxX = Math.max(...SOC_NODES.map((n) => n.x + n.width), 880);
    const maxY = Math.max(...SOC_NODES.map((n) => n.y + n.height), 420);
    return {
      minX: minX - 36,
      minY: minY - 32,
      width: maxX - minX + 72,
      height: maxY - minY + 64,
    };
  }, []);

  const minimapItems = useMemo(
    () =>
      SOC_NODES.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        color: selectedNodeId === n.id && !selectedEdgeId ? '#06b6d4' : '#3b82f6',
        active: selectedNodeId === n.id && !selectedEdgeId,
      })),
    [selectedNodeId, selectedEdgeId]
  );

  const minimapLinks = useMemo(
    () =>
      SOC_EDGES.map((edge) => {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) return null;
        return {
          x1: a.x + a.width / 2,
          y1: a.y + a.height / 2,
          x2: b.x + b.width / 2,
          y2: b.y + b.height / 2,
        };
      }).filter((x): x is { x1: number; y1: number; x2: number; y2: number } => Boolean(x)),
    [nodeMap]
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          SoC Protocol Knowledge Graph & Connectivity Map
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Click any SoC subsystem block or interconnect bridge to trace how CPUs, DMAs, DDR5, PCIe Gen5, OpenTitan TL-UL, and APB peripherals communicate.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Infinite-Mesh SVG Graph */}
        <div className="lg:col-span-8">
          <InfiniteMeshViewport
            bounds={bounds}
            title={`System-on-Chip Protocol Knowledge Graph (${SOC_NODES.length} Subsystems · ${SOC_EDGES.length} Bridges)`}
            subtitle="Pan across the schematic mesh and click any subsystem block or interconnect link"
            minHeightClass="h-[460px] sm:h-[520px]"
            showMiniMap={true}
            minimapItems={minimapItems}
            minimapLinks={minimapLinks}
            renderDefs={() => (
              <marker id="soc-graph-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
              </marker>
            )}
          >
            {SOC_EDGES.map((edge, idx) => {
              const a = nodeMap.get(edge.from);
              const b = nodeMap.get(edge.to);
              if (!a || !b) return null;
              const acx = a.x + a.width / 2;
              const acy = a.y + a.height / 2;
              const bcx = b.x + b.width / 2;
              const bcy = b.y + b.height / 2;
              const horiz = Math.abs(bcx - acx) >= Math.abs(bcy - acy) * 0.85;
              const laneOffset = idx % 3 === 0 ? -12 : idx % 3 === 1 ? 0 : 12;

              let x1: number, y1: number, x2: number, y2: number, cx1: number, cy1: number, cx2: number, cy2: number;
              if (horiz) {
                x1 = bcx >= acx ? a.x + a.width : a.x;
                x2 = bcx >= acx ? b.x : b.x + b.width;
                y1 = acy + laneOffset;
                y2 = bcy + laneOffset;
                cx1 = x1 + (x2 - x1) * 0.48;
                cy1 = y1;
                cx2 = x2 - (x2 - x1) * 0.48;
                cy2 = y2;
              } else {
                x1 = acx + laneOffset;
                x2 = bcx + laneOffset;
                y1 = bcy >= acy ? a.y + a.height : a.y;
                y2 = bcy >= acy ? b.y : b.y + b.height;
                cx1 = x1;
                cy1 = y1 + (y2 - y1) * 0.48;
                cx2 = x2;
                cy2 = y2 - (y2 - y1) * 0.48;
              }

              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              const isHighlighted =
                selectedEdgeId === edge.id ||
                (!selectedEdgeId && (edge.from === selectedNodeId || edge.to === selectedNodeId));
              const badgeW = Math.max(96, Math.min(138, edge.label.length * 6.2 + 16));

              return (
                <g
                  key={edge.id}
                  opacity={isHighlighted ? 1 : 0.36}
                  onClick={() => setSelectedEdgeId(edge.id)}
                  className="cursor-pointer svg-glide"
                >
                  <path
                    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isHighlighted ? '#06b6d4' : 'var(--text-secondary)'}
                    strokeWidth={isHighlighted ? 2.4 : 1.4}
                    markerEnd="url(#soc-graph-arrow)"
                  />
                  {isHighlighted && (
                    <path
                      d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity={0.35}
                      strokeWidth={1.2}
                      className="schematic-flow-active"
                    />
                  )}
                  <circle
                    cx={x1}
                    cy={y1}
                    r={3.2}
                    fill={isHighlighted ? '#06b6d4' : 'var(--text-secondary)'}
                    stroke="var(--bg-canvas)"
                    strokeWidth={1}
                  />
                  <rect
                    x={mx - badgeW / 2}
                    y={my - 10}
                    width={badgeW}
                    height={20}
                    rx={4}
                    fill="var(--bg-elevated)"
                    stroke={isHighlighted ? '#06b6d4' : 'var(--border-subtle)'}
                    strokeWidth={isHighlighted ? 1.2 : 1}
                  />
                  <text
                    x={mx}
                    y={my + 3.5}
                    textAnchor="middle"
                    className="font-mono text-[9.5px] font-medium"
                    fill={isHighlighted ? 'var(--sem-control)' : 'var(--text-secondary)'}
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {SOC_NODES.map((node) => {
              const isSel = selectedNodeId === node.id && !selectedEdgeId;
              const accent = isSel ? '#06b6d4' : '#3b82f6';
              return (
                <g
                  key={node.id}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    setSelectedEdgeId(null);
                  }}
                  className="cursor-pointer svg-glide"
                >
                  {isSel && (
                    <rect
                      x={node.x - 4}
                      y={node.y - 4}
                      width={node.width + 8}
                      height={node.height + 8}
                      rx={11}
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth={1.25}
                      strokeDasharray="4 3"
                      opacity={0.78}
                    />
                  )}
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx={8}
                    fill={isSel ? 'var(--bg-elevated)' : 'var(--bg-surface)'}
                    stroke={accent}
                    strokeWidth={isSel ? 2.25 : 1.5}
                  />
                  <path
                    d={`M ${node.x + 8} ${node.y} H ${node.x + node.width - 8} Q ${node.x + node.width} ${node.y} ${node.x + node.width} ${node.y + 8} V ${node.y + 20} H ${node.x} V ${node.y + 8} Q ${node.x} ${node.y} ${node.x + 8} ${node.y} Z`}
                    fill={accent}
                    fillOpacity={isSel ? 0.24 : 0.14}
                  />
                  <line
                    x1={node.x}
                    y1={node.y + 20}
                    x2={node.x + node.width}
                    y2={node.y + 20}
                    stroke={accent}
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                  <text
                    x={node.x + 12}
                    y={node.y + 13}
                    className="font-mono text-[8.5px] font-semibold uppercase tracking-wider"
                    fill={accent}
                  >
                    {node.domain}
                  </text>
                  <text
                    x={node.x + 12}
                    y={node.y + 42}
                    className="font-display text-[13px] font-semibold"
                    fill="var(--text-primary)"
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.x + 12}
                    y={node.y + 60}
                    className="text-[10.5px]"
                    fill="var(--text-secondary)"
                  >
                    {node.subtitle}
                  </text>
                  {[0.25, 0.5, 0.75].map((ratio, pIdx) => (
                    <rect
                      key={pIdx}
                      x={node.x + node.width * ratio - 4}
                      y={node.y + node.height - 2.5}
                      width={8}
                      height={4}
                      rx={1}
                      fill={accent}
                      fillOpacity={0.55}
                    />
                  ))}
                </g>
              );
            })}
          </InfiniteMeshViewport>
        </div>

        {/* Right Inspector Panel */}
        <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4">
          {activeEdge ? (
            <>
              <div>
                <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                  Interconnect Bridge Link
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeEdge.label}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {activeEdge.roleDetail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectProtocol(activeEdge.protocolId)}
                className="w-full px-4 py-2 text-xs font-medium rounded-md bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
              >
                Open {getProtocolById(activeEdge.protocolId).name} Documentation →
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                  {activeNode.domain} Subsystem
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeNode.label}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {activeNode.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Attached Protocols
                </div>
                <div className="space-y-2">
                  {activeNode.protocols.map((pid) => {
                    const p = getProtocolById(pid);
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => onSelectProtocol(pid)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left rounded-md border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 hover:bg-cyan-500/5 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.standardBody}</div>
                        </div>
                        <span className="text-xs text-cyan-700 dark:text-cyan-400 font-medium">Open →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const UvmGeneratorView: React.FC = () => {
  const [proto, setProto] = useState<'axi4' | 'axi4-lite' | 'axi4-stream' | 'apb'>('axi4');
  const [addrW, setAddrW] = useState<number>(32);
  const [dataW, setDataW] = useState<number>(64);
  const [idW, setIdW] = useState<number>(4);
  const [includeSva, setIncludeSva] = useState<boolean>(true);
  const [includeCov, setIncludeCov] = useState<boolean>(true);

  const generatedCode = useMemo(() => {
    const prefix = proto.replace(/-/g, '_');
    const svaBlock = includeSva
      ? `\n  // SVA Protocol Compliance Checks\n  property p_${prefix}_reset_clean;\n    @(posedge clk) !rst_n |-> (${
          proto === 'apb' ? '!PSEL && !PENABLE' : proto === 'axi4-stream' ? '!TVALID' : '!AWVALID && !WVALID && !ARVALID'
        });\n  endproperty\n  assert property (p_${prefix}_reset_clean);\n`
      : '';

    const covBlock = includeCov
      ? `\n  covergroup cg_${prefix}_txn @(posedge clk);\n    cp_op: coverpoint is_write;\n    cp_addr_align: coverpoint addr[2:0];\n  endgroup\n`
      : '';

    if (proto === 'axi4' || proto === 'axi4-lite') {
      const burstFields = proto === 'axi4'
        ? `  rand logic [7:0]           len;\n  rand logic [2:0]           size;\n  rand logic [1:0]           burst;\n  rand logic [${idW - 1}:0]    id;\n  constraint c_4kb { ((addr[11:0] + ((len + 1) << size)) <= 4096); }`
        : `  // Single-beat AXI4-Lite transaction (no burst/ID fields)`;

      return `// Auto-generated UVM Verification Kit for ${proto.toUpperCase()}
// Parameters: ADDR_W=${addrW}, DATA_W=${dataW}${proto === 'axi4' ? `, ID_W=${idW}` : ''}

interface ${prefix}_if #(parameter int ADDR_W=${addrW}, parameter int DATA_W=${dataW}) (
  input logic clk,
  input logic rst_n
);
  logic AWVALID, AWREADY; logic [ADDR_W-1:0] AWADDR;
  logic WVALID,  WREADY;  logic [DATA_W-1:0] WDATA; logic [DATA_W/8-1:0] WSTRB;
  logic BVALID,  BREADY;  logic [1:0] BRESP;
  logic ARVALID, ARREADY; logic [ADDR_W-1:0] ARADDR;
  logic RVALID,  RREADY;  logic [DATA_W-1:0] RDATA; logic [1:0] RRESP;${
    proto === 'axi4' ? `\n  logic [7:0] AWLEN, ARLEN; logic WLAST, RLAST; logic [${idW - 1}:0] AWID, BID, ARID, RID;` : ''
  }${svaBlock}
endinterface

class ${prefix}_seq_item extends uvm_sequence_item;
  rand bit                   is_write;
  rand logic [${addrW - 1}:0]  addr;
  rand logic [${dataW - 1}:0]  data[];
  rand logic [${dataW / 8 - 1}:0] strb[];
${burstFields}
  ` + "`uvm_object_utils(" + `${prefix}_seq_item)` + `
  function new(string name = "${prefix}_seq_item"); super.new(name); endfunction
endclass

class ${prefix}_monitor extends uvm_monitor;
  ` + "`uvm_component_utils(" + `${prefix}_monitor)` + `
  virtual ${prefix}_if #(${addrW}, ${dataW}) vif;
  uvm_analysis_port #(${prefix}_seq_item) ap;
${covBlock}
  function new(string name, uvm_component parent);
    super.new(name, parent);
    ap = new("ap", this);${includeCov ? `\n    cg_${prefix}_txn = new();` : ''}
  endfunction

  virtual task run_phase(uvm_phase phase);
    forever @(posedge vif.clk) begin
      if (vif.rst_n && vif.AWVALID && vif.AWREADY) begin
        ${prefix}_seq_item tr = ${prefix}_seq_item::type_id::create("tr");
        tr.is_write = 1'b1;
        tr.addr     = vif.AWADDR;
        ap.write(tr);
      end
    end
  endtask
endclass`;
    }

    if (proto === 'axi4-stream') {
      return `// Auto-generated UVM Verification Kit for AXI4-Stream (DATA_W=${dataW})
interface axi4_stream_if #(parameter int DATA_W=${dataW}) (input logic clk, input logic rst_n);
  logic TVALID, TREADY, TLAST;
  logic [DATA_W-1:0]   TDATA;
  logic [DATA_W/8-1:0] TKEEP, TSTRB;${svaBlock}
endinterface

class axi4_stream_seq_item extends uvm_sequence_item;
  rand byte payload[$];
  rand int unsigned idle_cycles;
  ` + "`uvm_object_utils(axi4_stream_seq_item)" + `
  constraint c_len { payload.size() inside {[1:256]}; idle_cycles inside {[0:4]}; }
  function new(string name = "axi4_stream_seq_item"); super.new(name); endfunction
endclass`;
    }

    // APB
    return `// Auto-generated UVM Verification Kit for APB4 (ADDR_W=${addrW}, DATA_W=32)
interface apb_if #(parameter int ADDR_W=${addrW}) (input logic clk, input logic rst_n);
  logic PSEL, PENABLE, PWRITE, PREADY, PSLVERR;
  logic [ADDR_W-1:0] PADDR;
  logic [31:0] PWDATA, PRDATA;
  logic [3:0]  PSTRB;${svaBlock}
endinterface

class apb_driver extends uvm_driver #(apb_seq_item);
  ` + "`uvm_component_utils(apb_driver)" + `
  virtual apb_if #(${addrW}) vif;
  function new(string name, uvm_component parent); super.new(name, parent); endfunction
  task run_phase(uvm_phase phase);
    forever begin
      seq_item_port.get_next_item(req);
      @(posedge vif.clk);
      vif.PSEL <= 1'b1; vif.PENABLE <= 1'b0; vif.PADDR <= req.addr; vif.PWRITE <= req.write;
      @(posedge vif.clk);
      vif.PENABLE <= 1'b1;
      do @(posedge vif.clk); while (!vif.PREADY);
      vif.PSEL <= 1'b0; vif.PENABLE <= 1'b0;
      seq_item_port.item_done();
    end
  endtask
endclass`;
  }, [proto, addrW, dataW, idW, includeSva, includeCov]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          UVM & SVA Verification Generator
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Configure bus parameters to synthesize ready-to-compile SystemVerilog interfaces, UVM sequence items, monitors, and SVA compliance assertions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-900 dark:text-slate-100 mb-1.5">Target Protocol</label>
            <select
              value={proto}
              onChange={(e) => setProto(e.target.value as typeof proto)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            >
              <option value="axi4">AMBA AXI4</option>
              <option value="axi4-lite">AMBA AXI4-Lite</option>
              <option value="axi4-stream">AMBA AXI4-Stream</option>
              <option value="apb">AMBA APB4</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">ADDR_WIDTH</label>
              <select
                value={addrW}
                onChange={(e) => setAddrW(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value={16}>16</option>
                <option value={32}>32</option>
                <option value={48}>48</option>
                <option value={64}>64</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">DATA_WIDTH</label>
              <select
                value={dataW}
                onChange={(e) => setDataW(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              >
                <option value={32}>32</option>
                <option value={64}>64</option>
                <option value={128}>128</option>
                <option value={256}>256</option>
                <option value={512}>512</option>
              </select>
            </div>
          </div>

          {proto === 'axi4' && (
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                ID_WIDTH: <span className="font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">{idW} bits</span>
              </label>
              <input
                type="range"
                min={2}
                max={8}
                value={idW}
                onChange={(e) => setIdW(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSva}
                onChange={(e) => setIncludeSva(e.target.checked)}
                className="accent-cyan-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Include SVA Protocol Assertions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCov}
                onChange={(e) => setIncludeCov(e.target.checked)}
                className="accent-cyan-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Include Functional Covergroups</span>
            </label>
          </div>
        </div>

        <div className="lg:col-span-8">
          <CodeBlock
            title={`${proto.replace(/-/g, '_')}_uvm_pkg.sv`}
            language="SystemVerilog UVM 1.2"
            code={generatedCode}
          />
        </div>
      </div>
    </div>
  );
};
