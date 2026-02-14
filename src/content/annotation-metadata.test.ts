import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectBrowser,
  detectOS,
  sanitizeCapturedUrl,
  isElementFixedOrSticky,
  getComputedStylesSnapshot
} from './annotation-metadata';

describe('detectBrowser', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockUserAgent(ua: string): void {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true
    });
  }

  it('detects Chrome', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    expect(detectBrowser()).toBe('Chrome 120.0.0.0');
  });

  it('detects Edge', () => {
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');
    expect(detectBrowser()).toBe('Edge 120.0.0.0');
  });

  it('detects Firefox', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0');
    expect(detectBrowser()).toBe('Firefox 121.0');
  });

  it('detects Opera', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0');
    expect(detectBrowser()).toBe('Opera 106.0.0.0');
  });

  it('detects Safari', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15');
    expect(detectBrowser()).toBe('Safari 17.2');
  });

  it('returns Unknown for unrecognized browsers', () => {
    mockUserAgent('SomeUnknownBrowser/1.0');
    expect(detectBrowser()).toBe('Unknown');
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
  });
});

describe('detectOS', () => {
  const originalUserAgent = navigator.userAgent;

  function mockUserAgent(ua: string): void {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      configurable: true
    });
  }

  it('detects Windows 10/11', () => {
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    expect(detectOS()).toBe('Windows 10/11');
  });

  it('detects Windows 8.1', () => {
    mockUserAgent('Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36');
    expect(detectOS()).toBe('Windows 8.1');
  });

  it('detects Windows 7', () => {
    mockUserAgent('Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36');
    expect(detectOS()).toBe('Windows 7');
  });

  it('detects macOS', () => {
    mockUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    expect(detectOS()).toBe('macOS 10.15.7');
  });

  it('detects iOS', () => {
    mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15');
    expect(detectOS()).toBe('iOS 17.2');
  });

  it('detects Android', () => {
    mockUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36');
    expect(detectOS()).toBe('Android 14');
  });

  it('detects Linux', () => {
    mockUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
    expect(detectOS()).toBe('Linux');
  });

  it('returns Unknown for unrecognized OS', () => {
    mockUserAgent('SomeUnknownOS/1.0');
    expect(detectOS()).toBe('Unknown');
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
  });
});

describe('sanitizeCapturedUrl', () => {
  it('extracts origin from full URL', () => {
    expect(sanitizeCapturedUrl('https://example.com/path/to/page?query=1')).toBe('https://example.com');
  });

  it('extracts origin with port', () => {
    expect(sanitizeCapturedUrl('http://localhost:3000/dashboard')).toBe('http://localhost:3000');
  });

  it('handles URLs with credentials (strips them)', () => {
    expect(sanitizeCapturedUrl('https://user:pass@example.com/path')).toBe('https://example.com');
  });

  it('returns raw value for invalid URLs', () => {
    expect(sanitizeCapturedUrl('not-a-valid-url')).toBe('not-a-valid-url');
  });

  it('handles empty strings', () => {
    expect(sanitizeCapturedUrl('')).toBe('');
  });
});

describe('isElementFixedOrSticky', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false for null element', () => {
    expect(isElementFixedOrSticky(null)).toBe(false);
  });

  it('returns false for static positioned element', () => {
    const div = document.createElement('div');
    div.style.position = 'static';
    document.body.appendChild(div);
    expect(isElementFixedOrSticky(div)).toBe(false);
  });

  it('returns true for fixed positioned element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.style.position = 'fixed';
    expect(isElementFixedOrSticky(div)).toBe(true);
  });

  it('returns true for sticky positioned element', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    div.style.position = 'sticky';
    expect(isElementFixedOrSticky(div)).toBe(true);
  });

  it('returns true when ancestor is fixed', () => {
    document.body.innerHTML = `
      <div id="parent" style="position: fixed;">
        <div id="child">
          <span id="target">Target</span>
        </div>
      </div>
    `;
    const target = document.getElementById('target');
    expect(isElementFixedOrSticky(target)).toBe(true);
  });
});

describe('getComputedStylesSnapshot', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns expected style properties', () => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.position = 'relative';
    div.style.color = 'red';
    div.style.backgroundColor = 'blue';
    div.style.fontSize = '16px';
    div.style.fontWeight = 'bold';
    document.body.appendChild(div);

    const snapshot = getComputedStylesSnapshot(div);

    expect(snapshot).toHaveProperty('display');
    expect(snapshot).toHaveProperty('position');
    expect(snapshot).toHaveProperty('color');
    expect(snapshot).toHaveProperty('backgroundColor');
    expect(snapshot).toHaveProperty('fontSize');
    expect(snapshot).toHaveProperty('fontWeight');
  });

  it('captures actual computed values', () => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    document.body.appendChild(div);

    const snapshot = getComputedStylesSnapshot(div);
    expect(snapshot.position).toBe('absolute');
  });
});
