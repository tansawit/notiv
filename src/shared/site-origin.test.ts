import { describe, expect, it } from 'vitest';
import {
  resolveSiteOriginPermission,
  normalizeSiteOriginInput,
  stripOriginPatternSuffix
} from './site-origin';

describe('resolveSiteOriginPermission', () => {
  it('returns null for undefined input', () => {
    expect(resolveSiteOriginPermission(undefined)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(resolveSiteOriginPermission(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveSiteOriginPermission('')).toBeNull();
  });

  it('returns permission for valid https URL', () => {
    const result = resolveSiteOriginPermission('https://example.com/path');
    expect(result).toEqual({
      pattern: 'https://example.com/*',
      label: 'https://example.com'
    });
  });

  it('returns permission for valid http URL', () => {
    const result = resolveSiteOriginPermission('http://localhost:3000/app');
    expect(result).toEqual({
      pattern: 'http://localhost/*',
      label: 'http://localhost:3000'
    });
  });

  it('returns null for file:// protocol', () => {
    expect(resolveSiteOriginPermission('file:///path/to/file.html')).toBeNull();
  });

  it('returns null for chrome:// protocol', () => {
    expect(resolveSiteOriginPermission('chrome://extensions')).toBeNull();
  });

  it('returns null for invalid URL', () => {
    expect(resolveSiteOriginPermission('not-a-url')).toBeNull();
  });

  it('strips path and query from pattern', () => {
    const result = resolveSiteOriginPermission('https://example.com/path/to/page?query=1&other=2');
    expect(result?.pattern).toBe('https://example.com/*');
  });
});

describe('normalizeSiteOriginInput', () => {
  it('returns null for empty string', () => {
    expect(normalizeSiteOriginInput('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(normalizeSiteOriginInput('   ')).toBeNull();
  });

  it('adds https:// protocol when missing', () => {
    const result = normalizeSiteOriginInput('example.com');
    expect(result).toEqual({
      pattern: 'https://example.com/*',
      label: 'https://example.com'
    });
  });

  it('preserves existing https:// protocol', () => {
    const result = normalizeSiteOriginInput('https://example.com');
    expect(result).toEqual({
      pattern: 'https://example.com/*',
      label: 'https://example.com'
    });
  });

  it('preserves existing http:// protocol', () => {
    const result = normalizeSiteOriginInput('http://localhost:3000');
    expect(result).toEqual({
      pattern: 'http://localhost/*',
      label: 'http://localhost:3000'
    });
  });

  it('uses custom default protocol', () => {
    const result = normalizeSiteOriginInput('localhost:8080', 'http:');
    expect(result).toEqual({
      pattern: 'http://localhost/*',
      label: 'http://localhost:8080'
    });
  });

  it('trims whitespace from input', () => {
    const result = normalizeSiteOriginInput('  example.com  ');
    expect(result).toEqual({
      pattern: 'https://example.com/*',
      label: 'https://example.com'
    });
  });

  it('returns null for invalid hostname', () => {
    expect(normalizeSiteOriginInput('not valid hostname')).toBeNull();
  });
});

describe('stripOriginPatternSuffix', () => {
  it('removes /* suffix', () => {
    expect(stripOriginPatternSuffix('https://example.com/*')).toBe('https://example.com');
  });

  it('returns unchanged if no /* suffix', () => {
    expect(stripOriginPatternSuffix('https://example.com')).toBe('https://example.com');
  });

  it('handles empty string', () => {
    expect(stripOriginPatternSuffix('')).toBe('');
  });

  it('only removes trailing /*', () => {
    expect(stripOriginPatternSuffix('https://example.com/*/path')).toBe('https://example.com/*/path');
  });
});
