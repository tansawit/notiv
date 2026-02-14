import type { HighlightColor } from '../shared/types';
import { getHighlightColorPreset, resolveHighlightColor } from '../shared/highlight-colors';
import { getNotivThemeMode } from './theme-mode';
import { FONT_STACK_MONO, FONT_STACK_SANS, getVisualModeTokens } from '../shared/visual-tokens';

interface DraftMarkerNote {
  id: string;
  comment: string;
  target: string;
  anchorX: number;
  anchorY: number;
  fixed?: boolean;
  attachments?: Array<{ name: string; dataUrl: string }>;
  highlightColor: HighlightColor;
}

type MarkerClickBehavior = 'edit' | 'delete';

interface DraftMarkerCallbacks {
  onEditRequest: (id: string) => void;
  onDelete: (id: string) => void;
  onHover: (id: string | null) => void;
}

type BubblePlacementDirection = 'right' | 'left' | 'top' | 'bottom';

interface BubblePlacement {
  direction: BubblePlacementDirection;
  left: number;
  top: number;
  width: number;
}

function truncate(value: string, limit: number): string {
  const text = value.trim();
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1)}...`;
}

export class DraftMarkers {
  private readonly container: HTMLDivElement;
  private notes: DraftMarkerNote[] = [];
  private visible = false;
  private animateOnRender = false;
  private visibilityTimer: number | null = null;
  private queueHoverId: string | null = null;
  private markerClickBehavior: MarkerClickBehavior = 'edit';
  private readonly bubbleViewportPadding = 10;
  private readonly bubbleMinWidth = 220;
  private readonly bubbleCompactMinWidth = 170;
  private readonly bubbleMaxWidth = 420;
  private readonly bubbleHorizontalOffset = 34;
  private readonly bubbleVerticalOffset = 18;
  private readonly systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly themeChangeHandler = (): void => {
    if (!this.visible) {
      return;
    }
    this.render();
  };

  constructor(private readonly callbacks: DraftMarkerCallbacks) {
    this.ensureMarkerStyles();
    const container = document.createElement('div');
    container.setAttribute('data-notiv-ui', 'true');
    container.setAttribute('data-notiv-draft-markers', 'true');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.zIndex = '2147483590';
    container.style.pointerEvents = 'none';
    container.style.display = 'none';
    container.style.opacity = '0';
    container.style.transition = 'opacity 80ms ease';
    document.documentElement.appendChild(container);

    this.container = container;

    window.addEventListener('scroll', this.handleWindowUpdate, true);
    window.addEventListener('resize', this.handleWindowUpdate, true);
    this.systemThemeQuery.addEventListener('change', this.themeChangeHandler);
    window.addEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);
  }

  setNotes(notes: DraftMarkerNote[]): void {
    this.notes = notes;
    this.render();
  }

  setVisible(visible: boolean): void {
    if (this.visibilityTimer) {
      window.clearTimeout(this.visibilityTimer);
      this.visibilityTimer = null;
    }
    this.visible = visible;
    if (visible) {
      this.container.style.display = 'block';
      this.animateOnRender = true;
      window.requestAnimationFrame(() => {
        this.container.style.opacity = '1';
      });
    } else {
      this.container.style.opacity = '0';
      this.visibilityTimer = window.setTimeout(() => {
        if (!this.visible) {
          this.container.style.display = 'none';
        }
      }, 170);
    }
    this.render();
  }

  setHoveredNoteId(id: string | null): void {
    this.queueHoverId = id;
    this.container.style.zIndex = id ? '2147483646' : '2147483590';
    this.render();
  }

  setMarkerClickBehavior(behavior: MarkerClickBehavior): void {
    this.markerClickBehavior = behavior;
    this.render();
  }

  requestEdit(id: string): void {
    this.callbacks.onEditRequest(id);
  }

  destroy(): void {
    if (this.visibilityTimer) {
      window.clearTimeout(this.visibilityTimer);
    }
    window.removeEventListener('scroll', this.handleWindowUpdate, true);
    window.removeEventListener('resize', this.handleWindowUpdate, true);
    this.systemThemeQuery.removeEventListener('change', this.themeChangeHandler);
    window.removeEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);
    this.container.remove();
  }

  private handleWindowUpdate = (): void => {
    if (!this.visible) {
      return;
    }
    this.render();
  };

  private resolveBubblePlacement(params: {
    bubble: HTMLDivElement;
    anchorX: number;
    anchorY: number;
    preferredWidth: number;
  }): BubblePlacement {
    const { bubble, anchorX, anchorY, preferredWidth } = params;
    const viewportLeft = this.bubbleViewportPadding;
    const viewportTop = this.bubbleViewportPadding;
    const viewportRight = window.innerWidth - this.bubbleViewportPadding;
    const viewportBottom = window.innerHeight - this.bubbleViewportPadding;
    const viewportWidth = Math.max(this.bubbleCompactMinWidth, viewportRight - viewportLeft);
    const horizontalPreferred = Math.min(
      this.bubbleMaxWidth,
      Math.max(this.bubbleMinWidth, preferredWidth)
    );
    const resolveSideWidth = (availableWidth: number): number => {
      if (availableWidth >= this.bubbleMinWidth) {
        return Math.min(horizontalPreferred, availableWidth);
      }
      if (availableWidth >= this.bubbleCompactMinWidth) {
        return availableWidth;
      }
      return Math.max(this.bubbleCompactMinWidth, Math.min(horizontalPreferred, viewportWidth));
    };

    const rightWidth = resolveSideWidth(viewportRight - (anchorX + this.bubbleHorizontalOffset));
    const leftWidth = resolveSideWidth(anchorX - this.bubbleHorizontalOffset - viewportLeft);
    const centeredWidth = Math.min(horizontalPreferred, viewportWidth);

    const measuredHeights = new Map<number, number>();
    const measureHeight = (width: number): number => {
      const roundedWidth = Math.max(this.bubbleCompactMinWidth, Math.round(width));
      const cached = measuredHeights.get(roundedWidth);
      if (cached) {
        return cached;
      }
      bubble.style.width = `${roundedWidth}px`;
      bubble.style.maxWidth = `${roundedWidth}px`;
      const height = Math.max(44, Math.round(bubble.offsetHeight || 44));
      measuredHeights.set(roundedWidth, height);
      return height;
    };

    const overflowAmount = (left: number, top: number, width: number, height: number): number => {
      const overflowLeft = Math.max(0, viewportLeft - left);
      const overflowRight = Math.max(0, left + width - viewportRight);
      const overflowTop = Math.max(0, viewportTop - top);
      const overflowBottom = Math.max(0, top + height - viewportBottom);
      return overflowLeft + overflowRight + overflowTop + overflowBottom;
    };

    const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
    const directions: BubblePlacementDirection[] = ['right', 'left', 'top', 'bottom'];
    const preferencePenalty: Record<BubblePlacementDirection, number> = {
      right: 0,
      left: 4,
      top: 8,
      bottom: 10
    };

    const candidates = directions.map((direction) => {
      const width =
        direction === 'right'
          ? rightWidth
          : direction === 'left'
            ? leftWidth
            : centeredWidth;
      const height = measureHeight(width);

      const rawLeft =
        direction === 'right'
          ? anchorX + this.bubbleHorizontalOffset
          : direction === 'left'
            ? anchorX - this.bubbleHorizontalOffset - width
            : anchorX - width / 2;
      const rawTop =
        direction === 'top'
          ? anchorY - this.bubbleVerticalOffset - height
          : direction === 'bottom'
            ? anchorY + this.bubbleVerticalOffset
            : anchorY - height / 2;

      const minLeft = viewportLeft;
      const maxLeft = Math.max(minLeft, viewportRight - width);
      const minTop = viewportTop;
      const maxTop = Math.max(minTop, viewportBottom - height);
      const left = clamp(rawLeft, minLeft, maxLeft);
      const top = clamp(rawTop, minTop, maxTop);
      const overflow = overflowAmount(rawLeft, rawTop, width, height);
      const shiftDistance = Math.abs(left - rawLeft) + Math.abs(top - rawTop);

      return {
        direction,
        left,
        top,
        width,
        score: overflow * 100 + shiftDistance * 2 + preferencePenalty[direction]
      };
    });

    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0];
    return {
      direction: best.direction,
      left: best.left,
      top: best.top,
      width: best.width
    };
  }

  private render(): void {
    this.container.textContent = '';

    if (this.notes.length === 0) {
      this.container.style.display = 'none';
      return;
    }
    if (!this.visible) {
      return;
    }

    this.container.style.display = 'block';
    const darkMode = getNotivThemeMode() === 'dark';
    const visualTokens = getVisualModeTokens(darkMode ? 'dark' : 'light');
    const markerTokens = visualTokens.markerBubble;

    this.notes.forEach((note, index) => {
      const colorPreset = getHighlightColorPreset(resolveHighlightColor(note.highlightColor));
      const hoveredFromQueue = this.queueHoverId === note.id;
      const bubbleVisible = hoveredFromQueue;
      const anchorX = Math.round(note.fixed ? note.anchorX : note.anchorX - window.scrollX);
      const anchorY = Math.round(note.fixed ? note.anchorY : note.anchorY - window.scrollY);
      const sidePadding = 10;
      const spaceRight = window.innerWidth - (anchorX + this.bubbleHorizontalOffset) - sidePadding;
      const spaceLeft = anchorX - this.bubbleHorizontalOffset - sidePadding;
      const maxPreferred = Math.max(spaceLeft, spaceRight);
      const preferredWidth = Math.min(this.bubbleMaxWidth, Math.max(this.bubbleMinWidth, maxPreferred));
      const markerRootX = anchorX - 12;
      const markerRootY = anchorY - 12;

      const marker = document.createElement('div');
      marker.style.position = 'absolute';
      marker.setAttribute('data-notiv-draft-marker', 'true');
      marker.style.left = `${anchorX}px`;
      marker.style.top = `${anchorY}px`;
      marker.style.transform = 'translate(-12px, -12px)';
      marker.style.display = 'flex';
      marker.style.alignItems = 'center';
      marker.style.pointerEvents = 'auto';
      marker.style.cursor = 'pointer';
      if (this.animateOnRender) {
        marker.style.animation = `notiv-marker-in 160ms cubic-bezier(0.22, 1, 0.36, 1) ${index * 18}ms both`;
      }

      const handleMarkerActivation = (): void => {
        if (this.markerClickBehavior === 'delete') {
          this.callbacks.onDelete(note.id);
          this.callbacks.onHover(null);
          return;
        }
        this.callbacks.onEditRequest(note.id);
      };

      marker.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleMarkerActivation();
      });

      marker.addEventListener('pointerenter', () => {
        this.callbacks.onHover(note.id);
      });

      marker.addEventListener('pointerleave', () => {
        this.callbacks.onHover(null);
      });

      const pin = document.createElement('div');
      pin.setAttribute('data-notiv-draft-pin', 'true');
      pin.style.width = '24px';
      pin.style.height = '24px';
      pin.style.borderRadius = '50% 50% 50% 0';
      pin.style.border = `1.25px solid ${colorPreset.border}`;
      pin.style.background = colorPreset.pinFill;
      pin.style.color = colorPreset.pinText;
      pin.style.display = 'grid';
      pin.style.placeItems = 'center';
      pin.style.transform = 'rotate(-45deg)';
      pin.style.transformOrigin = '50% 50%';
      pin.style.cursor = 'pointer';
      pin.style.boxShadow = hoveredFromQueue
        ? `0 0 0 3px ${colorPreset.fill}, 0 6px 14px ${markerTokens.pinHoverShadow}`
        : `0 4px 10px ${colorPreset.fill}`;
      const pinLabel = document.createElement('span');
      pinLabel.textContent = String(index + 1);
      pinLabel.style.display = 'inline-block';
      pinLabel.style.transform = 'rotate(45deg)';
      pinLabel.style.fontFamily = FONT_STACK_MONO;
      pinLabel.style.fontSize = '11px';
      pinLabel.style.fontWeight = '700';
      pinLabel.style.lineHeight = '1';
      pinLabel.style.pointerEvents = 'none';
      pin.appendChild(pinLabel);
      pin.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleMarkerActivation();
      });

      const bubble = document.createElement('div');
      bubble.setAttribute('data-notiv-note-bubble', 'true');
      bubble.style.position = 'absolute';
      bubble.style.left = '0';
      bubble.style.top = '0';
      bubble.style.right = 'auto';
      bubble.style.bottom = 'auto';
      bubble.style.transform = 'none';
      bubble.style.width = `${preferredWidth}px`;
      bubble.style.maxWidth = `${preferredWidth}px`;
      bubble.style.padding = '8px 9px 8px';
      bubble.style.border = `1.25px solid ${colorPreset.border}`;
      bubble.style.borderRadius = '6px';
      bubble.style.background = markerTokens.background;
      bubble.style.boxShadow = hoveredFromQueue
        ? `0 10px 18px ${markerTokens.shadowActive}, 0 0 0 2px ${colorPreset.fill}`
        : `0 6px 14px ${markerTokens.shadowBase}, 0 0 0 1px ${colorPreset.fill}`;
      bubble.style.opacity = bubbleVisible ? '1' : '0';
      bubble.style.transition = 'opacity 80ms ease, border-color 80ms ease, box-shadow 80ms ease';
      bubble.style.pointerEvents = bubbleVisible ? 'auto' : 'none';
      bubble.style.cursor = 'pointer';
      bubble.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleMarkerActivation();
      });

      const text = document.createElement('div');
      text.textContent = truncate(note.comment || 'Note', 360);
      text.style.color = markerTokens.text;
      text.style.fontFamily = FONT_STACK_SANS;
      text.style.fontSize = '13px';
      text.style.fontWeight = '520';
      text.style.lineHeight = '1.3';
      text.style.wordBreak = 'break-word';

      const target = document.createElement('div');
      target.textContent = truncate(note.target || 'Unknown target', 82);
      target.style.marginBottom = '4px';
      target.style.color = markerTokens.target;
      target.style.fontFamily = FONT_STACK_MONO;
      target.style.fontSize = '10px';
      target.style.lineHeight = '1.3';
      target.style.letterSpacing = '0.01em';
      target.style.whiteSpace = 'nowrap';
      target.style.overflow = 'hidden';
      target.style.textOverflow = 'ellipsis';

      const meta = document.createElement('div');
      meta.style.marginTop = '5px';
      meta.style.display = 'flex';
      meta.style.justifyContent = 'flex-start';
      meta.style.alignItems = 'center';

      const attachmentCount = note.attachments?.length ?? 0;
      const attachmentInfo = document.createElement('div');
      attachmentInfo.style.fontFamily = FONT_STACK_MONO;
      attachmentInfo.style.fontSize = '10px';
      attachmentInfo.style.color = markerTokens.attachment;
      attachmentInfo.textContent = attachmentCount > 0 ? `${attachmentCount} image${attachmentCount > 1 ? 's' : ''}` : '';

      meta.appendChild(attachmentInfo);
      meta.style.display = attachmentInfo.textContent ? 'flex' : 'none';

      bubble.appendChild(target);
      bubble.appendChild(text);
      bubble.appendChild(meta);

      marker.appendChild(pin);
      marker.appendChild(bubble);
      this.container.appendChild(marker);

      const placement = this.resolveBubblePlacement({
        bubble,
        anchorX,
        anchorY,
        preferredWidth
      });
      bubble.style.width = `${Math.round(placement.width)}px`;
      bubble.style.maxWidth = `${Math.round(placement.width)}px`;
      bubble.style.left = `${Math.round(placement.left - markerRootX)}px`;
      bubble.style.top = `${Math.round(placement.top - markerRootY)}px`;
    });
    this.animateOnRender = false;
  }

  private ensureMarkerStyles(): void {
    if (document.getElementById('notiv-marker-motion-style')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'notiv-marker-motion-style';
    style.textContent = `
      @keyframes notiv-marker-in {
        from { opacity: 0; transform: translate(-12px, -6px) scale(0.84); }
        to { opacity: 1; transform: translate(-12px, -12px) scale(1); }
      }
      @keyframes notiv-bubble-in {
        from { opacity: 0; transform: translateY(-50%) translateX(-4px) scale(0.98); }
        to { opacity: 1; transform: translateY(-50%) translateX(0) scale(1); }
      }
      @keyframes notiv-bubble-in-flat {
        from { opacity: 0; transform: translateX(-4px) scale(0.98); }
        to { opacity: 1; transform: none; }
      }
      @keyframes notiv-pin-pulse {
        0%, 100% { transform: rotate(-45deg) scale(1); }
        50% { transform: rotate(-45deg) scale(1.12); }
      }
      @keyframes notiv-pin-hover-pulse {
        0% { transform: rotate(-45deg) scale(1.08); }
        50% { transform: rotate(-45deg) scale(1.14); }
        100% { transform: rotate(-45deg) scale(1.08); }
      }
      [data-notiv-draft-marker="true"] {
        transition: transform 120ms cubic-bezier(0.22, 1, 0.36, 1);
      }
      [data-notiv-draft-marker="true"]:hover {
        transform: translate(-12px, -14px) rotate(2deg);
      }
      [data-notiv-draft-pin="true"] {
        transition: transform 120ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 120ms ease;
      }
      [data-notiv-draft-marker="true"]:hover [data-notiv-draft-pin="true"] {
        animation: notiv-pin-hover-pulse 800ms ease-in-out infinite;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      [data-notiv-draft-marker="true"]:hover [data-notiv-note-bubble="true"] {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      [data-notiv-draft-pin="true"].pulse-once {
        animation: notiv-pin-pulse 400ms ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }
}
