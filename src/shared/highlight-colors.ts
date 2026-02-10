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
    label: 'Blue',
    border: '#2f6df6',
    fill: 'rgba(47, 109, 246, 0.12)',
    outline: 'rgba(21, 58, 135, 0.62)',
    pinFill: '#2f6df6',
    pinText: '#f5f9ff'
  },
  {
    id: 'yellow',
    label: 'Yellow',
    border: '#c99f0f',
    fill: 'rgba(249, 213, 68, 0.2)',
    outline: 'rgba(140, 109, 15, 0.6)',
    pinFill: '#d6ac1d',
    pinText: '#2b1f03'
  },
  {
    id: 'green',
    label: 'Green',
    border: '#2c9a4b',
    fill: 'rgba(67, 183, 101, 0.18)',
    outline: 'rgba(25, 108, 52, 0.62)',
    pinFill: '#2f9f4f',
    pinText: '#f2fff6'
  },
  {
    id: 'red',
    label: 'Red',
    border: '#cf4a43',
    fill: 'rgba(225, 91, 86, 0.16)',
    outline: 'rgba(131, 34, 31, 0.62)',
    pinFill: '#cf4a43',
    pinText: '#fff5f5'
  },
  {
    id: 'purple',
    label: 'Purple',
    border: '#7b58c6',
    fill: 'rgba(136, 96, 214, 0.16)',
    outline: 'rgba(84, 55, 146, 0.62)',
    pinFill: '#7b58c6',
    pinText: '#f8f4ff'
  },
  {
    id: 'orange',
    label: 'Orange',
    border: '#d88624',
    fill: 'rgba(234, 155, 65, 0.2)',
    outline: 'rgba(142, 86, 22, 0.62)',
    pinFill: '#dd8b29',
    pinText: '#2d1d07'
  },
  {
    id: 'light-blue',
    label: 'Light blue',
    border: '#30a4d5',
    fill: 'rgba(92, 197, 236, 0.22)',
    outline: 'rgba(26, 114, 156, 0.62)',
    pinFill: '#33a8d8',
    pinText: '#f1fbff'
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
