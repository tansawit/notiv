import { describe, expect, it, vi } from 'vitest';
import {
  buildCapturePreparePayload,
  captureGroupedScreenshot,
  computeGroupedCaptureBounds,
  type GroupedCaptureAnnotation
} from './capture-grouped';

function createAnnotation(overrides: Partial<GroupedCaptureAnnotation> = {}): GroupedCaptureAnnotation {
  return {
    id: 'note-1',
    comment: 'note',
    highlightColor: 'blue',
    timestamp: 1,
    x: 100,
    y: 200,
    element: 'div',
    elementPath: '/html/body/div',
    viewport: {
      width: 1200,
      height: 900,
      devicePixelRatio: 2
    },
    ...overrides
  };
}

describe('capture-grouped helpers', () => {
  it('builds capture prepare payload with filtered highlights and indexed markers', () => {
    const payload = buildCapturePreparePayload([
      createAnnotation({
        id: 'a',
        comment: 'first',
        boundingBox: { x: 10, y: 20, width: 30, height: 40 }
      }),
      createAnnotation({
        id: 'b',
        comment: 'second'
      })
    ]);

    expect(payload.highlights).toEqual([
      { x: 10, y: 20, width: 30, height: 40, color: 'blue' }
    ]);
    expect(payload.markers).toEqual([
      { x: 100, y: 200, text: 'first', index: 1, color: 'blue' },
      { x: 100, y: 200, text: 'second', index: 2, color: 'blue' }
    ]);
  });

  it('computes grouped bounds and clamps to viewport', () => {
    const bounds = computeGroupedCaptureBounds([
      createAnnotation({
        x: 20,
        y: 30,
        viewport: {
          width: 300,
          height: 250,
          devicePixelRatio: 1
        },
        boundingBox: { x: 20, y: 30, width: 50, height: 50 }
      }),
      createAnnotation({
        x: 250,
        y: 220,
        viewport: {
          width: 300,
          height: 250,
          devicePixelRatio: 1
        },
        boundingBox: { x: 240, y: 210, width: 40, height: 30 }
      })
    ]);

    expect(bounds).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 250
    });
  });

  it('captures grouped screenshot via region path when bounds exist', async () => {
    const captureRegionScreenshot = vi.fn().mockResolvedValue('region');
    const captureVisibleScreenshot = vi.fn().mockResolvedValue('visible');
    const withCapturePreparation = vi.fn(async (_tabId, _payload, capture) => capture());

    const result = await captureGroupedScreenshot({
      tabId: 123,
      windowId: 99,
      annotations: [
        createAnnotation({
          boundingBox: { x: 10, y: 20, width: 40, height: 30 }
        })
      ],
      withCapturePreparation,
      captureRegionScreenshot,
      captureVisibleScreenshot
    });

    expect(result).toBe('region');
    expect(captureRegionScreenshot).toHaveBeenCalledTimes(1);
    expect(captureVisibleScreenshot).not.toHaveBeenCalled();
    expect(withCapturePreparation).toHaveBeenCalledTimes(1);
  });

  it('captures visible screenshot when grouped bounds are unavailable', async () => {
    const captureRegionScreenshot = vi.fn().mockResolvedValue('region');
    const captureVisibleScreenshot = vi.fn().mockResolvedValue('visible');
    const withCapturePreparation = vi.fn(async (_tabId, _payload, capture) => capture());

    const result = await captureGroupedScreenshot({
      tabId: 1,
      windowId: undefined,
      annotations: [],
      withCapturePreparation,
      captureRegionScreenshot,
      captureVisibleScreenshot
    });

    expect(result).toBe('visible');
    expect(captureVisibleScreenshot).toHaveBeenCalledTimes(1);
    expect(captureRegionScreenshot).not.toHaveBeenCalled();
  });
});
