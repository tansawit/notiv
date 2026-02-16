import type { BackgroundToContentMessage } from '../shared/messages';
import type { Annotation, BoundingBox } from '../shared/types';

type CapturePreparePayload = Extract<BackgroundToContentMessage, { type: 'capturePrepare' }>['payload'];

export type GroupedCaptureAnnotation = Omit<
  Annotation,
  'screenshot' | 'screenshotViewport' | 'linearIssue'
>;

interface CaptureRegionInput {
  windowId?: number;
  boundingBox: BoundingBox;
  devicePixelRatio?: number;
}

interface CaptureVisibleInput {
  windowId?: number;
}

interface CaptureGroupedScreenshotArgs {
  tabId: number;
  windowId: number | undefined;
  annotations: GroupedCaptureAnnotation[];
  withCapturePreparation: <T>(
    tabId: number,
    payload: CapturePreparePayload | undefined,
    capture: () => Promise<T>
  ) => Promise<T>;
  captureRegionScreenshot: (input: CaptureRegionInput) => Promise<string>;
  captureVisibleScreenshot: (input: CaptureVisibleInput) => Promise<string>;
}

export function buildCapturePreparePayload(
  annotations: GroupedCaptureAnnotation[]
): CapturePreparePayload {
  return {
    highlights: annotations
      .map((annotation) =>
        annotation.boundingBox ? { ...annotation.boundingBox, color: annotation.highlightColor } : null
      )
      .filter(
        (
          box
        ): box is { x: number; y: number; width: number; height: number; color: Annotation['highlightColor'] } =>
          Boolean(box)
      ),
    markers: annotations.map((annotation, index) => ({
      x: annotation.x,
      y: annotation.y,
      text: annotation.comment,
      index: index + 1,
      color: annotation.highlightColor
    }))
  };
}

export function computeGroupedCaptureBounds(
  annotations: GroupedCaptureAnnotation[]
): BoundingBox | null {
  if (annotations.length === 0) {
    return null;
  }

  const fallbackBoxes = annotations.map((annotation) => {
    if (annotation.boundingBox) {
      return annotation.boundingBox;
    }
    return {
      x: annotation.x - 60,
      y: annotation.y - 40,
      width: 120,
      height: 80
    } satisfies BoundingBox;
  });

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of fallbackBoxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  const pad = 120;
  const firstViewport = annotations[0].viewport;
  const viewportWidth = firstViewport?.width;
  const viewportHeight = firstViewport?.height;

  const clampedMinX = Math.max(0, minX - pad);
  const clampedMinY = Math.max(0, minY - pad);
  const clampedMaxX = viewportWidth ? Math.min(viewportWidth, maxX + pad) : maxX + pad;
  const clampedMaxY = viewportHeight ? Math.min(viewportHeight, maxY + pad) : maxY + pad;

  return {
    x: clampedMinX,
    y: clampedMinY,
    width: Math.max(1, clampedMaxX - clampedMinX),
    height: Math.max(1, clampedMaxY - clampedMinY)
  };
}

export async function captureGroupedScreenshot(
  args: CaptureGroupedScreenshotArgs
): Promise<string> {
  const { tabId, windowId, annotations, withCapturePreparation, captureRegionScreenshot, captureVisibleScreenshot } =
    args;

  return withCapturePreparation(
    tabId,
    buildCapturePreparePayload(annotations),
    async () => {
      const groupedBounds = computeGroupedCaptureBounds(annotations);
      if (groupedBounds) {
        return captureRegionScreenshot({
          windowId,
          boundingBox: groupedBounds,
          devicePixelRatio: annotations[0]?.viewport?.devicePixelRatio ?? 1
        });
      }
      return captureVisibleScreenshot({ windowId });
    }
  );
}
