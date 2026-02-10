import type { BoundingBox } from '../shared/types';
import { DEFAULT_HIGHLIGHT_COLOR, getHighlightColorPreset } from '../shared/highlight-colors';
import { FONT_STACK_SERIF, getVisualModeTokens } from '../shared/visual-tokens';
import { getNotivThemeMode } from './theme-mode';

interface HighlighterOptions {
  overlayZIndex?: number;
  tooltipZIndex?: number;
  bringToFrontOnShow?: boolean;
}

export class Highlighter {
  private overlay: HTMLDivElement;
  private tooltip: HTMLDivElement;
  private visible = false;
  private readonly bringToFrontOnShow: boolean;

  constructor(options: HighlighterOptions = {}) {
    const overlayZIndex = options.overlayZIndex ?? 2147483646;
    const tooltipZIndex = options.tooltipZIndex ?? 2147483647;
    this.bringToFrontOnShow = options.bringToFrontOnShow ?? false;

    const defaultHighlight = getHighlightColorPreset(DEFAULT_HIGHLIGHT_COLOR);
    const visualTokens = getVisualModeTokens(getNotivThemeMode());

    this.overlay = document.createElement('div');
    this.overlay.setAttribute('data-notiv-ui', 'true');
    this.overlay.style.position = 'fixed';
    this.overlay.style.border = `2px solid ${defaultHighlight.border}`;
    this.overlay.style.borderRadius = '4px';
    this.overlay.style.background = defaultHighlight.fill;
    this.overlay.style.outline = `1px dashed ${defaultHighlight.outline}`;
    this.overlay.style.outlineOffset = '-5px';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = String(overlayZIndex);
    this.overlay.style.boxSizing = 'border-box';
    this.overlay.style.display = 'none';
    this.overlay.style.transition = 'all 80ms ease-out';

    this.tooltip = document.createElement('div');
    this.tooltip.setAttribute('data-notiv-ui', 'true');
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.left = '0';
    this.tooltip.style.top = '0';
    this.tooltip.style.maxWidth = '340px';
    this.tooltip.style.padding = '4px 9px';
    this.tooltip.style.borderRadius = '6px';
    this.tooltip.style.background = visualTokens.floatingTooltip.background;
    this.tooltip.style.color = visualTokens.floatingTooltip.color;
    this.tooltip.style.border = `1.5px solid ${visualTokens.floatingTooltip.border}`;
    this.tooltip.style.fontFamily = FONT_STACK_SERIF;
    this.tooltip.style.fontSize = '12px';
    this.tooltip.style.fontWeight = '550';
    this.tooltip.style.lineHeight = '1.3';
    this.tooltip.style.letterSpacing = '0.01em';
    this.tooltip.style.whiteSpace = 'nowrap';
    this.tooltip.style.overflow = 'hidden';
    this.tooltip.style.textOverflow = 'ellipsis';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.zIndex = String(tooltipZIndex);
    this.tooltip.style.display = 'none';
    this.tooltip.style.boxShadow = visualTokens.floatingTooltip.shadow;

    document.documentElement.appendChild(this.overlay);
    document.documentElement.appendChild(this.tooltip);
  }

  show(rect: BoundingBox, label?: string, pointer?: { x: number; y: number }): void {
    if (this.bringToFrontOnShow) {
      this.overlay.remove();
      this.tooltip.remove();
      document.documentElement.appendChild(this.overlay);
      document.documentElement.appendChild(this.tooltip);
    }

    this.overlay.style.left = `${Math.round(rect.x)}px`;
    this.overlay.style.top = `${Math.round(rect.y)}px`;
    this.overlay.style.width = `${Math.round(rect.width)}px`;
    this.overlay.style.height = `${Math.round(rect.height)}px`;

    if (label && label.trim()) {
      this.tooltip.textContent = label;
      this.tooltip.style.display = 'block';

      const anchorX = pointer?.x ?? rect.x + rect.width / 2;
      const anchorY = pointer?.y ?? rect.y;
      const margin = 8;
      const clampedX = Math.max(margin, Math.min(anchorX, window.innerWidth - margin));
      this.tooltip.style.left = `${clampedX}px`;
      this.tooltip.style.top = `${Math.max(margin, anchorY - 10)}px`;
      this.tooltip.style.transform = 'translate(-50%, -100%)';

      const tooltipRect = this.tooltip.getBoundingClientRect();
      if (tooltipRect.left < margin) {
        this.tooltip.style.left = `${margin}px`;
        this.tooltip.style.transform = 'translate(0, -100%)';
      } else if (tooltipRect.right > window.innerWidth - margin) {
        this.tooltip.style.left = `${window.innerWidth - margin}px`;
        this.tooltip.style.transform = 'translate(-100%, -100%)';
      }

      if (tooltipRect.top < margin) {
        this.tooltip.style.top = `${Math.min(window.innerHeight - margin, anchorY + 12)}px`;
        if (this.tooltip.style.transform.includes('-100%')) {
          this.tooltip.style.transform = this.tooltip.style.transform.replace('-100%)', '0)');
        }
      }
    } else {
      this.tooltip.style.display = 'none';
      this.tooltip.textContent = '';
    }

    this.overlay.style.display = 'block';
    this.visible = true;
  }

  hide(): void {
    this.overlay.style.display = 'none';
    this.tooltip.style.display = 'none';
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.overlay.remove();
    this.tooltip.remove();
  }
}
