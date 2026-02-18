import type { BoundingBox, HighlightColor } from '../shared/types';
import {
  DEFAULT_HIGHLIGHT_COLOR,
  getHighlightColorPreset,
  resolveHighlightColor
} from '../shared/highlight-colors';
import { getLocalStorageItems } from '../shared/chrome-storage';
import { STORAGE_KEYS } from '../shared/constants';
import { FONT_STACK_MONO, FONT_STACK_SANS } from '../shared/visual-tokens';

interface CaptureMarker {
  x: number;
  y: number;
  text?: string;
  index?: number;
  color?: HighlightColor;
}

let hiddenUiNodes: Array<{ node: HTMLElement; visibility: string; display: string; opacity: string }> = [];
let captureHighlightOverlay: HTMLDivElement | null = null;
let captureCommentOverlay: HTMLDivElement | null = null;
let captureRedactionOverlay: HTMLDivElement | null = null;

function ensureCaptureHighlightOverlay(): HTMLDivElement {
  if (captureHighlightOverlay?.isConnected) {
    return captureHighlightOverlay;
  }

  const overlay = document.createElement('div');
  overlay.setAttribute('data-notis-ui', 'true');
  overlay.setAttribute('data-notis-capture-highlight', 'true');
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '2147483646';
  overlay.style.pointerEvents = 'none';
  overlay.style.display = 'none';
  document.documentElement.appendChild(overlay);

  captureHighlightOverlay = overlay;
  return overlay;
}

function ensureCaptureCommentOverlay(): HTMLDivElement {
  if (captureCommentOverlay?.isConnected) {
    return captureCommentOverlay;
  }

  const container = document.createElement('div');
  container.setAttribute('data-notis-ui', 'true');
  container.setAttribute('data-notis-capture-comment', 'true');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.zIndex = '2147483647';
  container.style.pointerEvents = 'none';
  container.style.display = 'none';
  document.documentElement.appendChild(container);
  captureCommentOverlay = container;
  return container;
}

function ensureCaptureRedactionOverlay(): HTMLDivElement {
  if (captureRedactionOverlay?.isConnected) {
    return captureRedactionOverlay;
  }

  const overlay = document.createElement('div');
  overlay.setAttribute('data-notis-ui', 'true');
  overlay.setAttribute('data-notis-capture-redaction', 'true');
  overlay.style.position = 'fixed';
  overlay.style.left = '0';
  overlay.style.top = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '2147483645';
  overlay.style.pointerEvents = 'none';
  overlay.style.display = 'none';
  document.documentElement.appendChild(overlay);

  captureRedactionOverlay = overlay;
  return overlay;
}

async function loadCaptureRedactionEnabled(): Promise<boolean> {
  const items = await getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.captureRedactionEnabled]);
  return items?.[STORAGE_KEYS.captureRedactionEnabled] !== false;
}

function shouldRedactElement(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  const typeValue = element.getAttribute('type')?.toLowerCase() ?? '';
  const nameValue = element.getAttribute('name')?.toLowerCase() ?? '';
  const idValue = element.id.toLowerCase();
  const autocompleteValue = element.getAttribute('autocomplete')?.toLowerCase() ?? '';
  const ariaLabelValue = element.getAttribute('aria-label')?.toLowerCase() ?? '';
  const placeholderValue = element.getAttribute('placeholder')?.toLowerCase() ?? '';

  if (element.getAttribute('data-notis-redact') === 'true') {
    return true;
  }

  if (tag === 'input') {
    if (typeValue === 'password') {
      return true;
    }
    if (
      autocompleteValue.includes('cc-') ||
      autocompleteValue.includes('one-time-code') ||
      autocompleteValue.includes('password') ||
      autocompleteValue.includes('email') ||
      autocompleteValue.includes('tel')
    ) {
      return true;
    }
  }

  const haystack = `${nameValue} ${idValue} ${ariaLabelValue} ${placeholderValue}`;
  if (
    haystack.includes('password') ||
    haystack.includes('passcode') ||
    haystack.includes('secret') ||
    haystack.includes('token') ||
    haystack.includes('otp') ||
    haystack.includes('credit card') ||
    haystack.includes('card number') ||
    haystack.includes('cvv')
  ) {
    return true;
  }

  return false;
}

function renderCaptureRedactions(): void {
  const overlay = ensureCaptureRedactionOverlay();
  overlay.textContent = '';

  const candidates = document.querySelectorAll<HTMLElement>(
    'input, textarea, [contenteditable="true"], [contenteditable=""]'
  );

  for (const element of candidates) {
    if (!shouldRedactElement(element)) {
      continue;
    }

    const computed = window.getComputedStyle(element);
    if (computed.display === 'none' || computed.visibility === 'hidden') {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) {
      continue;
    }
    if (rect.bottom <= 0 || rect.right <= 0 || rect.left >= window.innerWidth || rect.top >= window.innerHeight) {
      continue;
    }

    const mask = document.createElement('div');
    mask.style.position = 'absolute';
    mask.style.left = `${Math.max(0, Math.round(rect.left))}px`;
    mask.style.top = `${Math.max(0, Math.round(rect.top))}px`;
    mask.style.width = `${Math.max(1, Math.round(rect.width))}px`;
    mask.style.height = `${Math.max(1, Math.round(rect.height))}px`;
    mask.style.borderRadius = '4px';
    mask.style.border = '1px solid rgba(255, 255, 255, 0.28)';
    mask.style.background = 'rgba(0, 0, 0, 0.92)';
    overlay.appendChild(mask);
  }

  overlay.style.display = overlay.childElementCount > 0 ? 'block' : 'none';
}

export async function prepareCaptureUi(input: {
  boundingBox?: BoundingBox;
  marker?: CaptureMarker;
  highlights?: Array<BoundingBox & { color?: HighlightColor }>;
  markers?: CaptureMarker[];
  fallbackBoundingBox?: BoundingBox;
  fallbackMarker?: CaptureMarker;
  redactSensitiveFields?: boolean;
  showNoteText?: boolean;
}): Promise<void> {
  hiddenUiNodes = [];
  const nodes = document.querySelectorAll<HTMLElement>('[data-notis-ui="true"]');
  nodes.forEach((node) => {
    if (
      node.dataset.notisCaptureHighlight === 'true' ||
      node.dataset.notisCaptureComment === 'true' ||
      node.dataset.notisCaptureRedaction === 'true' ||
      node.dataset.notisCapturePreserve === 'true'
    ) {
      return;
    }

    hiddenUiNodes.push({
      node,
      visibility: node.style.visibility,
      display: node.style.display,
      opacity: node.style.opacity
    });
    node.style.opacity = '0';
    node.style.visibility = 'hidden';
    node.style.display = 'none';
  });

  const fallbackHighlight = input.boundingBox ?? input.fallbackBoundingBox;
  const highlights: Array<BoundingBox & { color?: HighlightColor }> =
    input.highlights && input.highlights.length > 0
      ? input.highlights
      : fallbackHighlight
        ? [{ ...fallbackHighlight, color: DEFAULT_HIGHLIGHT_COLOR }]
        : [];
  if (highlights.length > 0) {
    const highlightLayer = ensureCaptureHighlightOverlay();
    highlightLayer.textContent = '';
    highlights.forEach((box) => {
      const colorPreset = getHighlightColorPreset(resolveHighlightColor(box.color));
      const outline = document.createElement('div');
      outline.style.position = 'absolute';
      outline.style.left = `${Math.round(box.x)}px`;
      outline.style.top = `${Math.round(box.y)}px`;
      outline.style.width = `${Math.max(1, Math.round(box.width))}px`;
      outline.style.height = `${Math.max(1, Math.round(box.height))}px`;
      outline.style.border = `2px solid ${colorPreset.border}`;
      outline.style.borderRadius = '8px';
      outline.style.background = colorPreset.fill;
      outline.style.outline = `1px dashed ${colorPreset.outline}`;
      outline.style.outlineOffset = '-5px';
      highlightLayer.appendChild(outline);
    });
    highlightLayer.style.display = 'block';
    highlightLayer.getBoundingClientRect();
  }

  const fallbackMarker = input.marker ?? input.fallbackMarker;
  const markers: CaptureMarker[] =
    input.markers && input.markers.length > 0
      ? input.markers
      : fallbackMarker
        ? [fallbackMarker]
        : [];
  if (markers.length > 0) {
    const markerLayer = ensureCaptureCommentOverlay();
    markerLayer.textContent = '';
    markers.forEach((marker, index) => {
      const colorPreset = getHighlightColorPreset(resolveHighlightColor(marker.color));
      const markerX = Math.round(marker.x);
      const markerY = Math.round(marker.y);

      const pin = document.createElement('div');
      pin.style.position = 'absolute';
      pin.style.left = `${markerX}px`;
      pin.style.top = `${markerY}px`;
      pin.style.transform = 'translate(-12px, -12px) rotate(-45deg)';
      pin.style.width = '24px';
      pin.style.height = '24px';
      pin.style.borderRadius = '50% 50% 50% 0';
      pin.style.border = `1.25px solid ${colorPreset.border}`;
      pin.style.background = colorPreset.pinFill;
      pin.style.color = colorPreset.pinText;
      pin.style.display = 'grid';
      pin.style.placeItems = 'center';
      pin.style.boxShadow = `0 4px 10px ${colorPreset.fill}`;
      const pinLabel = document.createElement('span');
      pinLabel.textContent = String(marker.index ?? index + 1);
      pinLabel.style.display = 'inline-block';
      pinLabel.style.transform = 'rotate(45deg)';
      pinLabel.style.fontFamily = FONT_STACK_MONO;
      pinLabel.style.fontSize = '11px';
      pinLabel.style.fontWeight = '700';
      pinLabel.style.lineHeight = '1';
      pinLabel.style.pointerEvents = 'none';
      pin.appendChild(pinLabel);
      markerLayer.appendChild(pin);

      if (input.showNoteText && marker.text) {
        const label = document.createElement('div');
        label.style.position = 'absolute';
        label.style.left = `${markerX + 16}px`;
        label.style.top = `${markerY - 8}px`;
        label.style.maxWidth = '220px';
        label.style.padding = '4px 8px';
        label.style.borderRadius = '6px';
        label.style.background = 'rgba(26, 24, 22, 0.88)';
        label.style.color = '#faf9f7';
        label.style.fontFamily = FONT_STACK_SANS;
        label.style.fontSize = '11px';
        label.style.lineHeight = '1.4';
        label.style.whiteSpace = 'pre-wrap';
        label.style.wordBreak = 'break-word';
        label.style.pointerEvents = 'none';
        label.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.18)';
        label.textContent = marker.text;
        markerLayer.appendChild(label);
      }
    });
    markerLayer.style.display = 'block';
    markerLayer.getBoundingClientRect();
  }

  if (input.redactSensitiveFields !== false && (await loadCaptureRedactionEnabled())) {
    renderCaptureRedactions();
  } else if (captureRedactionOverlay) {
    captureRedactionOverlay.textContent = '';
    captureRedactionOverlay.style.display = 'none';
  }

  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 70);
      });
    });
  });
}

export function restoreCaptureUi(): void {
  hiddenUiNodes.forEach(({ node, visibility, display, opacity }) => {
    node.style.opacity = opacity;
    node.style.visibility = visibility;
    node.style.display = display;
  });
  hiddenUiNodes = [];

  if (captureHighlightOverlay) {
    captureHighlightOverlay.textContent = '';
    captureHighlightOverlay.style.display = 'none';
  }
  if (captureCommentOverlay) {
    captureCommentOverlay.textContent = '';
    captureCommentOverlay.style.display = 'none';
  }
  if (captureRedactionOverlay) {
    captureRedactionOverlay.textContent = '';
    captureRedactionOverlay.style.display = 'none';
  }
}
