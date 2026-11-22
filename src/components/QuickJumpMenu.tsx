import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Compass } from 'lucide-react';

export type QuickJumpTargetId =
  | 'ml-kem'
  | 'ml-dsa'
  | 'sca-lab'
  | 'ntt-butterfly'
  | 'ip-catalog'
  | 'protocol-specs';

interface QuickJumpItem {
  id: QuickJumpTargetId;
  label: string;
  meta: string;
}

const QUICK_JUMP_ITEMS: QuickJumpItem[] = [
  { id: 'ml-kem', label: 'KEM · ML-KEM (FIPS 203)', meta: 'Ch 08 + Area Estimator' },
  { id: 'ml-dsa', label: 'Signatures · ML-DSA & FN-DSA', meta: 'Ch 08 + 2026 Matrix' },
  { id: 'sca-lab', label: 'Side-Channel & Fault Lab', meta: 'Ch 07 + DOM Power Trace' },
  { id: 'ntt-butterfly', label: 'NTT Butterfly Accelerator', meta: 'Z_3329 Stage Inspector' },
  { id: 'ip-catalog', label: 'IP Catalog (37 Silicon IPs)', meta: 'Ibex, OpenTitan, CVA6' },
  { id: 'protocol-specs', label: 'Protocol Specs (498 Buses)', meta: 'AXI4, TL-UL, PCIe Gen5' },
];

interface QuickJumpMenuProps {
  onJump: (target: QuickJumpTargetId) => void;
  align?: 'left' | 'right';
  compact?: boolean;
}

export const QuickJumpMenu: React.FC<QuickJumpMenuProps> = ({
  onJump,
  align = 'right',
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Quick Jump to ML-KEM, Signatures, Side-Channel Lab, NTT & IP Catalog"
        className={`inline-flex items-center gap-1.5 rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer font-medium ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        } ${
          open
            ? 'border-[var(--sem-control)] bg-[var(--bg-elevated)] text-[var(--sem-control)]'
            : 'border-[var(--sem-control)]/45 bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--sem-control)] hover:bg-[var(--bg-elevated)]'
        }`}
      >
        <Compass className="w-3.5 h-3.5 text-[var(--sem-control)] shrink-0" />
        <span>Quick Jump</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-2 w-72 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl py-1.5 z-50 text-xs`}
        >
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
            Direct Silicon &amp; PQC Jumps
          </div>
          {QUICK_JUMP_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onJump(item.id);
              }}
              className="w-full px-3 py-2 text-left hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer flex items-center justify-between gap-2"
            >
              <span className="font-medium text-[var(--text-primary)]">{item.label}</span>
              <span className="font-mono text-[10px] text-[var(--sem-control)] shrink-0">
                {item.meta}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
