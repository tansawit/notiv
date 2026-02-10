import type { BoundingBox, HighlightColor } from '../shared/types';
import {
  DEFAULT_HIGHLIGHT_COLOR,
  getHighlightColorPreset,
  resolveHighlightColor
} from '../shared/highlight-colors';
import { getLocalStorageItems } from '../shared/chrome-storage';
import { STORAGE_KEYS } from '../shared/constants';
import { FONT_STACK_MONO, FONT_STACK_SERIF, getVisualModeTokens } from '../shared/visual-tokens';
import { getNotivThemeMode } from './theme-mode';

interface CaptureMarker {
  x: number;
  y: number;
  text?: string;
  index?: number;
  color?: HighlightColor;
}

let hiddenUiNodes: Array<{ node: HTMLElement; visibility: string }> = [];
let captureHighlightOverlay: HTMLDivElement | null = null;
let captureCommentOverlay: HTMLDivElement | null = null;
let captureRedactionOverlay: HTMLDivElement | null = null;

function ensureCaptureHighlightOverlay(): HTMLDivElement {
  if (captureHighlightOverlay?.isConnected) {
    return captureHighlightOverlay;
  }

  const overlay = document.createElement('div');
  overlay.setAttribute('data-notiv-ui', 'true');
  overlay.setAttribute('data-notiv-capture-highlight', 'true');
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
  container.setAttribute('data-notiv-ui', 'true');
  container.setAttribute('data-notiv-capture-comment', 'true');
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
  overlay.setAttribute('data-notiv-ui', 'true');
  overlay.setAttribute('data-notiv-capture-redaction', 'true');
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

  if (element.getAttribute('data-notiv-redact') === 'true') {
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
    mask.style.border = '1px solid rgba(17, 17, 17, 0.4)';
    mask.style.background = 'rgba(17, 17, 17, 0.92)';
    overlay.appendChild(mask);
  }

  overlay.style.display = overlay.childElementCount > 0 ? 'block' : 'none';
}

function truncateCaptureComment(text: string, maxLength = 72): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) {
    return clean;
  }
  return `${clean.slice(0, maxLength - 1)}...`;
}

export async function prepareCaptureUi(input: {
  boundingBox?: BoundingBox;
  marker?: CaptureMarker;
  highlights?: Array<BoundingBox & { color?: HighlightColor }>;
  markers?: CaptureMarker[];
  fallbackBoundingBox?: BoundingBox;
  fallbackMarker?: CaptureMarker;
  redactSensitiveFields?: boolean;
}): Promise<void> {
  hiddenUiNodes = [];
  const nodes = document.querySelectorAll<HTMLElement>('[data-notiv-ui="true"]');
  nodes.forEach((node) => {
    if (
      node.dataset.notivCaptureHighlight === 'true' ||
      node.dataset.notivCaptureComment === 'true'
    ) {
      return;
    }

    hiddenUiNodes.push({ node, visibility: node.style.visibility });
    node.style.visibility = 'hidden';
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
    const darkMode = getNotivThemeMode() === 'dark';
    const markerTokens = getVisualModeTokens(darkMode ? 'dark' : 'light').markerBubble;
    markers.forEach((marker, index) => {
      const colorPreset = getHighlightColorPreset(resolveHighlightColor(marker.color));
      const markerX = Math.round(marker.x);
      const markerY = Math.round(marker.y);

      const pin = document.createElement('div');
      pin.style.position = 'absolute';
      pin.style.left = `${markerX}px`;
      pin.style.top = `${markerY}px`;
      pin.style.transform = 'translate(-12px, -12px)';
      pin.style.width = '24px';
      pin.style.height = '24px';
      pin.style.borderRadius = '4px';
      pin.style.border = `1.5px solid ${colorPreset.border}`;
      pin.style.background = colorPreset.pinFill;
      pin.style.color = colorPreset.pinText;
      pin.style.display = 'grid';
      pin.style.placeItems = 'center';
      pin.style.fontFamily = FONT_STACK_MONO;
      pin.style.fontSize = '11px';
      pin.style.fontWeight = '700';
      pin.style.boxShadow = `0 4px 10px ${colorPreset.fill}`;
      pin.textContent = String(marker.index ?? index + 1);
      markerLayer.appendChild(pin);

      const text = truncateCaptureComment(marker.text ?? '');
      if (text) {
        const bubble = document.createElement('div');
        const openLeft = markerX > window.innerWidth - 300;
        bubble.style.position = 'absolute';
        bubble.style.top = `${Math.max(8, markerY - 12)}px`;
        bubble.style.left = `${openLeft ? markerX - 30 : markerX + 30}px`;
        bubble.style.transform = openLeft ? 'translateX(-100%)' : 'none';
        bubble.style.minWidth = '140px';
        bubble.style.maxWidth = '240px';
        bubble.style.padding = '6px 9px';
        bubble.style.borderRadius = '6px';
        bubble.style.border = `1.5px solid ${colorPreset.border}`;
        bubble.style.background = markerTokens.background;
        bubble.style.color = markerTokens.text;
        bubble.style.fontFamily = FONT_STACK_SERIF;
        bubble.style.fontSize = '12px';
        bubble.style.fontWeight = '520';
        bubble.style.lineHeight = '1.25';
        bubble.style.boxShadow = `0 6px 14px ${markerTokens.shadowBase}, 0 0 0 2px ${colorPreset.fill}`;
        bubble.style.whiteSpace = 'normal';
        bubble.style.wordBreak = 'break-word';
        bubble.textContent = text;
        markerLayer.appendChild(bubble);
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
  hiddenUiNodes.forEach(({ node, visibility }) => {
    node.style.visibility = visibility;
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
