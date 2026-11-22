export type ColorPaletteId =
  | 'silicon-cyan'
  | 'cobalt-wafer'
  | 'phosphor-logic'
  | 'amber-telemetry'
  | 'graphite-clean';

export interface ColorPaletteOption {
  id: ColorPaletteId;
  name: string;
  subtitle: string;
  darkSwatches: [string, string, string, string];
  lightSwatches: [string, string, string, string];
}

export const COLOR_PALETTE_STORAGE_KEY = 'vpa_color_palette_v1';
export const THEME_MODE_STORAGE_KEY = 'vpa_theme_mode_v1';

export const COLOR_PALETTES: ColorPaletteOption[] = [
  {
    id: 'silicon-cyan',
    name: 'Silicon Cyan',
    subtitle: 'High-contrast EDA dark canvas with cyan signal & amber silicon alerts',
    darkSwatches: ['#0B0F14', '#141B23', '#22D3EE', '#F59E0B'],
    lightSwatches: ['#F8FAFC', '#FFFFFF', '#0E7490', '#D97706'],
  },
  {
    id: 'cobalt-wafer',
    name: 'Cobalt Wafer',
    subtitle: 'Deep fab-blueprint navy with sapphire interactive controls & gold callouts',
    darkSwatches: ['#090D16', '#111827', '#60A5FA', '#FBBF24'],
    lightSwatches: ['#F4F7FB', '#FFFFFF', '#1D4ED8', '#B45309'],
  },
  {
    id: 'phosphor-logic',
    name: 'Phosphor Logic',
    subtitle: 'Logic-analyzer slate-emerald canvas tuned for long trace reviews',
    darkSwatches: ['#080E0C', '#101A17', '#10B981', '#F59E0B'],
    lightSwatches: ['#F6FAF8', '#FFFFFF', '#047857', '#D97706'],
  },
  {
    id: 'amber-telemetry',
    name: 'Amber Telemetry',
    subtitle: 'Low-blue-light warm charcoal & copper-amber palette for night sessions',
    darkSwatches: ['#110E0B', '#1B1612', '#F59E0B', '#2DD4BF'],
    lightSwatches: ['#FAF8F5', '#FFFFFF', '#B45309', '#0D9488'],
  },
  {
    id: 'graphite-clean',
    name: 'Graphite Clean',
    subtitle: 'Neutral technical monochrome canvas with crisp indigo highlights',
    darkSwatches: ['#0D0E12', '#16181F', '#818CF8', '#34D399'],
    lightSwatches: ['#F9FAFB', '#FFFFFF', '#4338CA', '#059669'],
  },
];

export function isValidPaletteId(value: string | null): value is ColorPaletteId {
  return COLOR_PALETTES.some((p) => p.id === value);
}
