import { describe, expect, it } from 'vitest';
import { getHighlightColorPreset, resolveHighlightColor } from './highlight-colors';

describe('resolveHighlightColor', () => {
  it('returns default for empty values', () => {
    expect(resolveHighlightColor(undefined)).toBe('blue');
    expect(resolveHighlightColor(null)).toBe('blue');
    expect(resolveHighlightColor('')).toBe('blue');
  });

  it('normalizes legacy typo and unknown values', () => {
    expect(resolveHighlightColor('orangle')).toBe('orange');
    expect(resolveHighlightColor('not-a-color')).toBe('blue');
  });
});

describe('getHighlightColorPreset', () => {
  it('returns expected preset values', () => {
    const preset = getHighlightColorPreset('green');
    expect(preset.id).toBe('green');
    expect(preset.border).toContain('#');
  });
});
