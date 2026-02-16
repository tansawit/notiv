import { describe, expect, it, vi } from 'vitest';
import type { BackgroundToContentMessage } from '../shared/messages';
import { createContentRuntimeMessageHandler } from './content-runtime-router';

function runHandler(
  message: BackgroundToContentMessage,
  overrides: Partial<Parameters<typeof createContentRuntimeMessageHandler>[0]> = {}
): { response: unknown; returns: boolean | void; prepareCaptureUi: ReturnType<typeof vi.fn> } {
  const prepareCaptureUi = vi.fn().mockResolvedValue(undefined);
  const restoreCaptureUi = vi.fn();
  const setToolbarVisible = vi.fn();
  const setPickerActive = vi.fn();
  const unifiedBadge = {
    setVisible: vi.fn(),
    showSuccessPill: vi.fn(),
    showErrorPill: vi.fn()
  };
  const selectedElement = document.createElement('div');
  selectedElement.getBoundingClientRect = () =>
    ({ left: 10, top: 20, width: 100, height: 50 } as DOMRect);

  const handler = createContentRuntimeMessageHandler({
    getSelectedElement: () => selectedElement,
    getSelectedClickPoint: () => ({ x: 111, y: 222 }),
    prepareCaptureUi,
    restoreCaptureUi,
    setToolbarVisible,
    setPickerActive,
    unifiedBadge,
    ...overrides
  });

  let response: unknown;
  const returns = handler(message, {} as chrome.runtime.MessageSender, (value) => {
    response = value;
  });

  return { response, returns, prepareCaptureUi };
}

describe('content runtime router', () => {
  it('responds to notisPing', () => {
    const { response, returns } = runHandler({ type: 'notisPing' });
    expect(response).toEqual({ ok: true });
    expect(returns).toBeUndefined();
  });

  it('handles capturePrepare with fallback geometry and marker', async () => {
    const { returns, prepareCaptureUi } = runHandler({
      type: 'capturePrepare',
      payload: {
        marker: { x: 1, y: 2 }
      }
    });

    expect(returns).toBe(true);
    await Promise.resolve();
    expect(prepareCaptureUi).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackBoundingBox: { x: 10, y: 20, width: 100, height: 50 },
        fallbackMarker: { x: 111, y: 222 }
      })
    );
  });

  it('routes toolbar and picker visibility updates', () => {
    const setToolbarVisible = vi.fn();
    const setPickerActive = vi.fn();

    runHandler(
      { type: 'toolbarVisibilityChanged', payload: { visible: true } },
      { setToolbarVisible, setPickerActive }
    );
    runHandler(
      { type: 'pickerActivationChanged', payload: { active: true } },
      { setToolbarVisible, setPickerActive }
    );

    expect(setToolbarVisible).toHaveBeenCalledWith(true);
    expect(setPickerActive).toHaveBeenCalledWith(true);
  });

  it('routes issue success and error events to unified badge', () => {
    const unifiedBadge = {
      setVisible: vi.fn(),
      showSuccessPill: vi.fn(),
      showErrorPill: vi.fn()
    };

    runHandler(
      { type: 'issueCreated', payload: { identifier: 'NOT-1', url: 'https://linear.app' } },
      { unifiedBadge }
    );
    runHandler(
      { type: 'issueCreationFailed', payload: { message: 'boom' } },
      { unifiedBadge }
    );

    expect(unifiedBadge.setVisible).toHaveBeenCalledWith(true);
    expect(unifiedBadge.showSuccessPill).toHaveBeenCalledWith({
      identifier: 'NOT-1',
      url: 'https://linear.app'
    });
    expect(unifiedBadge.showErrorPill).toHaveBeenCalledWith('boom');
  });
});
