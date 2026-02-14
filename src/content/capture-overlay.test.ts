import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareCaptureUi, restoreCaptureUi } from './capture-overlay';
import { getLocalStorageItems } from '../shared/chrome-storage';
import { STORAGE_KEYS } from '../shared/constants';

vi.mock('../shared/chrome-storage', () => ({
  getLocalStorageItems: vi.fn()
}));

describe('capture overlay redaction', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.querySelectorAll('[data-notis-ui="true"]').forEach((node) => node.remove());
    vi.clearAllMocks();
  });

  it('adds redaction masks for sensitive fields by default', async () => {
    vi.mocked(getLocalStorageItems).mockResolvedValue({
      [STORAGE_KEYS.captureRedactionEnabled]: true
    });

    const input = document.createElement('input');
    input.type = 'password';
    Object.defineProperty(input, 'getBoundingClientRect', {
      value: () =>
        ({
          x: 20,
          y: 20,
          left: 20,
          top: 20,
          right: 220,
          bottom: 54,
          width: 200,
          height: 34
        }) as DOMRect
    });
    document.body.appendChild(input);

    await prepareCaptureUi({});

    const redactionLayer = document.querySelector('[data-notis-capture-redaction="true"]');
    expect(redactionLayer).toBeTruthy();
    expect(redactionLayer?.childElementCount).toBe(1);
  });

  it('skips redaction when disabled in settings', async () => {
    vi.mocked(getLocalStorageItems).mockResolvedValue({
      [STORAGE_KEYS.captureRedactionEnabled]: false
    });

    const input = document.createElement('input');
    input.type = 'password';
    Object.defineProperty(input, 'getBoundingClientRect', {
      value: () =>
        ({
          x: 20,
          y: 20,
          left: 20,
          top: 20,
          right: 220,
          bottom: 54,
          width: 200,
          height: 34
        }) as DOMRect
    });
    document.body.appendChild(input);

    await prepareCaptureUi({});

    const redactionLayer = document.querySelector('[data-notis-capture-redaction="true"]') as HTMLDivElement | null;
    if (redactionLayer) {
      expect(redactionLayer.style.display).toBe('none');
      expect(redactionLayer.childElementCount).toBe(0);
    } else {
      expect(redactionLayer).toBeNull();
    }
  });

  it('restores and clears redaction overlays', async () => {
    vi.mocked(getLocalStorageItems).mockResolvedValue({
      [STORAGE_KEYS.captureRedactionEnabled]: true
    });

    const input = document.createElement('input');
    input.type = 'password';
    Object.defineProperty(input, 'getBoundingClientRect', {
      value: () =>
        ({
          x: 20,
          y: 20,
          left: 20,
          top: 20,
          right: 220,
          bottom: 54,
          width: 200,
          height: 34
        }) as DOMRect
    });
    document.body.appendChild(input);

    await prepareCaptureUi({});
    restoreCaptureUi();

    const redactionLayer = document.querySelector('[data-notis-capture-redaction="true"]') as HTMLDivElement | null;
    expect(redactionLayer).toBeTruthy();
    expect(redactionLayer?.style.display).toBe('none');
    expect(redactionLayer?.childElementCount).toBe(0);
  });
});
