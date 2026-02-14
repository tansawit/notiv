import type { BoundingBox } from '../shared/types';

interface DraftFocusNote {
  element: string;
  elementPath: string;
  elementLabel?: string;
  componentName?: string;
  reactComponents?: string[];
  boundingBox?: BoundingBox;
  anchorX: number;
  anchorY: number;
  fixed?: boolean;
}

interface FocusTarget {
  targetElement?: HTMLElement | null;
  elementPath?: string;
  fallbackBoundingBox?: BoundingBox;
  anchorX?: number;
  anchorY?: number;
  fixed?: boolean;
}

function toBoundingBox(rect: DOMRect): BoundingBox {
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
}

function resolveElementFromPoint(pointX: number, pointY: number): HTMLElement | null {
  const stack = document.elementsFromPoint(pointX, pointY);
  for (const candidate of stack) {
    if (!(candidate instanceof HTMLElement)) {
      continue;
    }
    if (candidate.closest('[data-notis-ui="true"]')) {
      continue;
    }
    let current: HTMLElement | null = candidate;
    while (current?.shadowRoot) {
      const deeper = current.shadowRoot.elementFromPoint(pointX, pointY);
      if (!(deeper instanceof HTMLElement) || deeper === current) {
        break;
      }
      if (deeper.closest('[data-notis-ui="true"]')) {
        break;
      }
      current = deeper;
    }
    if (current) {
      return current;
    }
  }
  return null;
}

export function resolveElementBySelector(elementPath: string): HTMLElement | null {
  try {
    const element = document.querySelector(elementPath);
    return element instanceof HTMLElement ? element : null;
  } catch {
    return null;
  }
}

export function resolveLiveBoundingBoxFromElement(
  element: HTMLElement | null | undefined
): BoundingBox | null {
  if (!element || !document.contains(element)) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return toBoundingBox(rect);
}

function resolveDraftViewportAnchor(note: DraftFocusNote): { x: number; y: number } {
  return note.fixed
    ? { x: note.anchorX, y: note.anchorY }
    : { x: note.anchorX - window.scrollX, y: note.anchorY - window.scrollY };
}

export function resolveDraftTargetElement(note: DraftFocusNote): HTMLElement | null {
  const anchor = resolveDraftViewportAnchor(note);
  const element = resolveElementFromPoint(anchor.x, anchor.y);
  if (!element) {
    return resolveElementBySelector(note.elementPath);
  }

  if (note.boundingBox) {
    const rect = element.getBoundingClientRect();
    const widthRatio = rect.width / Math.max(1, note.boundingBox.width);
    const heightRatio = rect.height / Math.max(1, note.boundingBox.height);
    if (widthRatio < 0.5 || heightRatio < 0.5) {
      return resolveElementBySelector(note.elementPath);
    }
  }

  return element;
}

export function resolveDraftLabel(note: DraftFocusNote): string {
  return note.elementLabel ?? note.componentName ?? note.reactComponents?.[0] ?? note.element;
}

export function resolveFocusBoundingBox(focus: FocusTarget): BoundingBox | null {
  const liveFromRef = resolveLiveBoundingBoxFromElement(focus.targetElement);
  if (liveFromRef) {
    return liveFromRef;
  }

  const fromSelector = focus.elementPath
    ? resolveLiveBoundingBoxFromElement(resolveElementBySelector(focus.elementPath))
    : null;
  if (fromSelector) {
    return fromSelector;
  }

  if (focus.fallbackBoundingBox && typeof focus.anchorX === 'number' && typeof focus.anchorY === 'number') {
    const centerX = focus.fixed ? focus.anchorX : focus.anchorX - window.scrollX;
    const centerY = focus.fixed ? focus.anchorY : focus.anchorY - window.scrollY;
    return {
      x: centerX - focus.fallbackBoundingBox.width / 2,
      y: centerY - focus.fallbackBoundingBox.height / 2,
      width: focus.fallbackBoundingBox.width,
      height: focus.fallbackBoundingBox.height
    };
  }

  return focus.fallbackBoundingBox ?? null;
}
