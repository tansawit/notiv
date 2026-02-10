import { detectComponentLabel, detectComponentNames } from '../lib/components';
import type { ElementSelection } from '../shared/types';
import { buildElementSelector } from './selector';
import { Highlighter } from './highlighter';
import { resolveSelectionLabel } from './selection-label';

interface DetectorCallbacks {
  onHover: (selection: ElementSelection | null, element: Element | null) => void;
  onSelect: (
    selection: ElementSelection,
    element: Element,
    pointer: { x: number; y: number }
  ) => void;
}

function isExtensionUiElement(target: Element | null): boolean {
  return !!target?.closest('[data-notiv-ui="true"]');
}

function getAccessibilityInfo(element: Element): { role?: string; label?: string } {
  const role = element.getAttribute('role') ?? undefined;
  const label =
    element.getAttribute('aria-label') ??
    element.getAttribute('aria-labelledby') ??
    undefined;
  return { role, label };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getElementContentPreview(element: Element): string | undefined {
  if (element instanceof HTMLInputElement) {
    const value = normalizeText(element.value || element.placeholder || element.getAttribute('aria-label') || '');
    return value ? value.slice(0, 240) : undefined;
  }

  if (element instanceof HTMLTextAreaElement) {
    const value = normalizeText(element.value || element.placeholder || element.getAttribute('aria-label') || '');
    return value ? value.slice(0, 240) : undefined;
  }

  if (element instanceof HTMLImageElement) {
    const alt = normalizeText(element.alt || '');
    return alt ? alt.slice(0, 240) : undefined;
  }

  const text = normalizeText(element.textContent || '');
  if (text) {
    return text.slice(0, 240);
  }

  return undefined;
}

function getElementHref(element: Element): string | undefined {
  const directHref = element.getAttribute('href')?.trim();
  if (directHref) {
    return directHref;
  }

  const anchor = element.closest('a[href]');
  const href = anchor?.getAttribute('href')?.trim();
  return href || undefined;
}

function resolveSemanticTarget(element: Element): Element {
  if (!(element instanceof HTMLElement)) {
    return element;
  }

  const tag = element.tagName.toLowerCase();
  if (['svg', 'path', 'circle', 'rect', 'line', 'g', 'ellipse', 'polygon', 'polyline'].includes(tag)) {
    return element;
  }

  const interactiveAncestor = element.closest('button, a, input, textarea, select, label, [role="button"], [role="link"]');
  if (interactiveAncestor) {
    return interactiveAncestor;
  }

  const textAncestor = element.closest('h1, h2, h3, h4, h5, h6, p, li, blockquote, code, pre');
  if (textAncestor) {
    return textAncestor;
  }

  return element;
}

function elementToSelection(element: Element): ElementSelection {
  const rect = element.getBoundingClientRect();
  const selection: ElementSelection = {
    elementPath: buildElementSelector(element),
    tag: element.tagName.toLowerCase(),
    elementLabel: undefined,
    classes: Array.from(element.classList),
    componentName: detectComponentLabel(element) ?? undefined,
    reactComponents: detectComponentNames(element),
    contentPreview: getElementContentPreview(element),
    href: getElementHref(element),
    boundingBox: {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    },
    accessibility: getAccessibilityInfo(element)
  };
  selection.elementLabel = resolveSelectionLabel(selection);
  return selection;
}

export class ElementDetector {
  private active = false;
  private hoveredElement: Element | null = null;
  private readonly highlighter: Highlighter;
  private readonly callbacks: DetectorCallbacks;

  constructor(callbacks: DetectorCallbacks) {
    this.callbacks = callbacks;
    this.highlighter = new Highlighter({
      overlayZIndex: 2147483580,
      tooltipZIndex: 2147483581
    });
  }

  start(): void {
    if (this.active) {
      return;
    }

    this.active = true;
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('resize', this.handleResize, true);
    document.body.style.cursor = 'crosshair';
  }

  stop(): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    this.hoveredElement = null;
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('resize', this.handleResize, true);
    document.body.style.removeProperty('cursor');
    this.highlighter.hide();
    this.callbacks.onHover(null, null);
  }

  destroy(): void {
    this.stop();
    this.highlighter.destroy();
  }

  private updateHover(element: Element | null, pointer?: { x: number; y: number }): void {
    this.hoveredElement = element;

    if (!element) {
      this.highlighter.hide();
      this.callbacks.onHover(null, null);
      return;
    }

    const semanticElement = resolveSemanticTarget(element);
    const selection = elementToSelection(semanticElement);
    this.highlighter.show(selection.boundingBox, resolveSelectionLabel(selection), pointer);
    this.callbacks.onHover(selection, element);
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.active) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (isExtensionUiElement(target)) {
      this.updateHover(null);
      return;
    }

    const semanticTarget = resolveSemanticTarget(target);
    if (semanticTarget === this.hoveredElement) {
      return;
    }

    this.updateHover(semanticTarget, { x: event.clientX, y: event.clientY });
  };

  private handleClick = (event: MouseEvent): void => {
    if (!this.active) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element) || isExtensionUiElement(target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const semanticTarget = resolveSemanticTarget(target);
    const selection = elementToSelection(semanticTarget);
    this.callbacks.onSelect(selection, semanticTarget, {
      x: event.clientX,
      y: event.clientY
    });
  };

  private handleScroll = (): void => {
    if (!this.active || !this.hoveredElement) {
      return;
    }
    this.updateHover(this.hoveredElement);
  };

  private handleResize = (): void => {
    if (!this.active || !this.hoveredElement) {
      return;
    }
    this.updateHover(this.hoveredElement);
  };
}
