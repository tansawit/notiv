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
    label: 'Thoughtful',
    border: '#3b82f6',
    fill: 'rgba(59, 130, 246, 0.15)',
    outline: 'rgba(37, 99, 235, 0.55)',
    pinFill: '#3b82f6',
    pinText: '#ffffff'
  },
  {
    id: 'yellow',
    label: 'Important',
    border: '#eab308',
    fill: 'rgba(234, 179, 8, 0.18)',
    outline: 'rgba(202, 138, 4, 0.55)',
    pinFill: '#eab308',
    pinText: '#1c1917'
  },
  {
    id: 'green',
    label: 'Good idea',
    border: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.15)',
    outline: 'rgba(22, 163, 74, 0.55)',
    pinFill: '#22c55e',
    pinText: '#ffffff'
  },
  {
    id: 'red',
    label: 'Needs fixing',
    border: '#ef4444',
    fill: 'rgba(239, 68, 68, 0.14)',
    outline: 'rgba(220, 38, 38, 0.55)',
    pinFill: '#ef4444',
    pinText: '#ffffff'
  },
  {
    id: 'purple',
    label: 'Curious',
    border: '#a855f7',
    fill: 'rgba(168, 85, 247, 0.14)',
    outline: 'rgba(147, 51, 234, 0.55)',
    pinFill: '#a855f7',
    pinText: '#ffffff'
  },
  {
    id: 'orange',
    label: 'Revisit later',
    border: '#f97316',
    fill: 'rgba(249, 115, 22, 0.15)',
    outline: 'rgba(234, 88, 12, 0.55)',
    pinFill: '#f97316',
    pinText: '#ffffff'
  },
  {
    id: 'light-blue',
    label: 'Quick note',
    border: '#06b6d4',
    fill: 'rgba(6, 182, 212, 0.14)',
    outline: 'rgba(8, 145, 178, 0.55)',
    pinFill: '#06b6d4',
    pinText: '#ffffff'
  },
  {
    id: 'pink',
    label: 'Highlight',
    border: '#ec4899',
    fill: 'rgba(236, 72, 153, 0.14)',
    outline: 'rgba(219, 39, 119, 0.55)',
    pinFill: '#ec4899',
    pinText: '#ffffff'
  },
  {
    id: 'teal',
    label: 'Reference',
    border: '#14b8a6',
    fill: 'rgba(20, 184, 166, 0.14)',
    outline: 'rgba(13, 148, 136, 0.55)',
    pinFill: '#14b8a6',
    pinText: '#ffffff'
  },
  {
    id: 'gray',
    label: 'Note',
    border: '#6b7280',
    fill: 'rgba(107, 114, 128, 0.12)',
    outline: 'rgba(75, 85, 99, 0.50)',
    pinFill: '#6b7280',
    pinText: '#ffffff'
  },
  {
    id: 'white',
    label: 'Unmarked',
    border: '#d1d5db',
    fill: 'rgba(255, 255, 255, 0.25)',
    outline: 'rgba(209, 213, 219, 0.60)',
    pinFill: '#f3f4f6',
    pinText: '#1f2937'
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
