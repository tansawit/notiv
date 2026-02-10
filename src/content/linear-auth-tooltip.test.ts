import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLinearAuthTooltipController } from './linear-auth-tooltip';

describe('createLinearAuthTooltipController', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows and clears the tooltip node', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    const tooltip = createLinearAuthTooltipController();
    tooltip.show('Connect Linear to continue', { x: 200, y: 200 });

    const node = document.querySelector('[data-notiv-ui="true"]') as HTMLDivElement | null;
    expect(node).toBeTruthy();
    expect(node?.textContent).toBe('Connect Linear to continue');

    tooltip.clear();
    expect(document.querySelector('[data-notiv-ui="true"]')).toBeNull();
  });

  it('auto-dismisses after timeout', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    const tooltip = createLinearAuthTooltipController();
    tooltip.show('Auto dismiss');
    expect(document.querySelector('[data-notiv-ui="true"]')).toBeTruthy();

    vi.advanceTimersByTime(5340);
    expect(document.querySelector('[data-notiv-ui="true"]')).toBeNull();
  });
});
