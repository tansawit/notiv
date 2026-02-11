import type { HighlightColor } from './types';

export interface HighlightColorPreset {
  id: HighlightColor;
  label: string;
  border: string;
  fill: string;
  outline: string;
  pinFill: string;
  pinText: string;
}

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = 'blue';

export const HIGHLIGHT_COLOR_PRESETS: HighlightColorPreset[] = [
  {
    id: 'blue',
    label: 'Slate',
    border: '#4a5568',
    fill: 'rgba(74, 85, 104, 0.12)',
    outline: 'rgba(45, 55, 72, 0.55)',
    pinFill: '#4a5568',
    pinText: '#f7fafc'
  },
  {
    id: 'yellow',
    label: 'Amber',
    border: '#b7861b',
    fill: 'rgba(183, 134, 27, 0.14)',
    outline: 'rgba(146, 106, 20, 0.55)',
    pinFill: '#b7861b',
    pinText: '#fffbeb'
  },
  {
    id: 'green',
    label: 'Sage',
    border: '#5a7a60',
    fill: 'rgba(90, 122, 96, 0.14)',
    outline: 'rgba(66, 95, 72, 0.55)',
    pinFill: '#5a7a60',
    pinText: '#f0fdf4'
  },
  {
    id: 'red',
    label: 'Coral',
    border: '#c25850',
    fill: 'rgba(194, 88, 80, 0.12)',
    outline: 'rgba(153, 68, 62, 0.55)',
    pinFill: '#c25850',
    pinText: '#fef2f2'
  },
  {
    id: 'purple',
    label: 'Violet',
    border: '#7c6a9a',
    fill: 'rgba(124, 106, 154, 0.14)',
    outline: 'rgba(98, 82, 124, 0.55)',
    pinFill: '#7c6a9a',
    pinText: '#faf5ff'
  },
  {
    id: 'orange',
    label: 'Rust',
    border: '#a86240',
    fill: 'rgba(168, 98, 64, 0.14)',
    outline: 'rgba(134, 78, 50, 0.55)',
    pinFill: '#a86240',
    pinText: '#fff7ed'
  },
  {
    id: 'light-blue',
    label: 'Steel',
    border: '#5a7088',
    fill: 'rgba(90, 112, 136, 0.14)',
    outline: 'rgba(68, 86, 106, 0.55)',
    pinFill: '#5a7088',
    pinText: '#f0f9ff'
  }
];

const HIGHLIGHT_COLOR_MAP = new Map(HIGHLIGHT_COLOR_PRESETS.map((preset) => [preset.id, preset]));

export function resolveHighlightColor(value: string | undefined | null): HighlightColor {
  if (!value) {
    return DEFAULT_HIGHLIGHT_COLOR;
  }
  if (value === 'orangle') {
    return 'orange';
  }
  return HIGHLIGHT_COLOR_MAP.has(value as HighlightColor) ? (value as HighlightColor) : DEFAULT_HIGHLIGHT_COLOR;
}

export function getHighlightColorPreset(color: HighlightColor): HighlightColorPreset {
  return HIGHLIGHT_COLOR_MAP.get(color) ?? HIGHLIGHT_COLOR_MAP.get(DEFAULT_HIGHLIGHT_COLOR)!;
}
