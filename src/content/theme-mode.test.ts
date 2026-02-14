import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNotisThemeMode } from './theme-mode';

describe('getNotisThemeMode', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    document.documentElement.removeAttribute('data-notis-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-notis-theme');
    window.matchMedia = originalMatchMedia;
  });

  it('returns explicit dark theme when set', () => {
    document.documentElement.setAttribute('data-notis-theme', 'dark');
    expect(getNotisThemeMode()).toBe('dark');
  });

  it('returns explicit light theme when set', () => {
    document.documentElement.setAttribute('data-notis-theme', 'light');
    expect(getNotisThemeMode()).toBe('light');
  });

  it('ignores invalid explicit theme values', () => {
    document.documentElement.setAttribute('data-notis-theme', 'invalid');
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(getNotisThemeMode()).toBe('dark');
  });

  it('returns dark when system prefers dark color scheme', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(getNotisThemeMode()).toBe('dark');
  });

  it('returns light when system prefers light color scheme', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(getNotisThemeMode()).toBe('light');
  });

  it('returns light when matchMedia is not available', () => {
    // @ts-expect-error - Testing edge case where matchMedia doesn't exist
    window.matchMedia = undefined;
    expect(getNotisThemeMode()).toBe('light');
  });
});
