import type { HighlightColor } from '../shared/types';
import { getHighlightColorPreset, resolveHighlightColor } from '../shared/highlight-colors';
import { getNotivThemeMode } from './theme-mode';
import { FONT_STACK_MONO, FONT_STACK_SERIF, getVisualModeTokens } from '../shared/visual-tokens';

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
    container.style.transition = 'opacity 170ms ease';
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
    this.render();
  }

  setMarkerClickBehavior(behavior: MarkerClickBehavior): void {
    this.markerClickBehavior = behavior;
    this.render();
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
      const rightOffset = 34;
      const sidePadding = 10;
      const spaceRight = window.innerWidth - (anchorX + rightOffset) - sidePadding;
      const spaceLeft = anchorX - rightOffset - sidePadding;
      const maxPreferred = Math.max(spaceLeft, spaceRight);
      const bubbleWidth = Math.min(420, Math.max(220, maxPreferred));
      const openLeft = spaceRight < 240 && spaceLeft > spaceRight;
      const nearTop = anchorY < 70;
      const nearBottom = anchorY > window.innerHeight - 70;

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
      pin.style.borderRadius = '4px';
      pin.style.border = `1.5px solid ${colorPreset.border}`;
      pin.style.background = colorPreset.pinFill;
      pin.style.color = colorPreset.pinText;
      pin.style.display = 'grid';
      pin.style.placeItems = 'center';
      pin.style.fontFamily = FONT_STACK_MONO;
      pin.style.fontSize = '11px';
      pin.style.fontWeight = '700';
      pin.style.cursor = 'pointer';
      pin.style.boxShadow = hoveredFromQueue
        ? `0 0 0 3px ${colorPreset.fill}, 0 6px 14px ${markerTokens.pinHoverShadow}`
        : `0 4px 10px ${colorPreset.fill}`;
      pin.textContent = String(index + 1);
      pin.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleMarkerActivation();
      });

      const bubble = document.createElement('div');
      bubble.setAttribute('data-notiv-note-bubble', 'true');
      bubble.style.position = 'absolute';
      if (openLeft) {
        bubble.style.left = 'auto';
        bubble.style.right = `${rightOffset}px`;
      } else {
        bubble.style.left = `${rightOffset}px`;
        bubble.style.right = 'auto';
      }

      if (nearTop) {
        bubble.style.top = '0';
        bubble.style.bottom = 'auto';
        bubble.style.transform = 'none';
      } else if (nearBottom) {
        bubble.style.top = 'auto';
        bubble.style.bottom = '0';
        bubble.style.transform = 'none';
      } else {
        bubble.style.top = '50%';
        bubble.style.bottom = 'auto';
        bubble.style.transform = 'translateY(-50%)';
      }

      bubble.style.width = `${bubbleWidth}px`;
      bubble.style.maxWidth = `${bubbleWidth}px`;
      bubble.style.padding = '8px 9px 8px';
      bubble.style.border = `1.5px solid ${colorPreset.border}`;
      bubble.style.borderRadius = '6px';
      bubble.style.background = markerTokens.background;
      bubble.style.boxShadow = hoveredFromQueue
        ? `0 10px 18px ${markerTokens.shadowActive}, 0 0 0 2px ${colorPreset.fill}`
        : `0 6px 14px ${markerTokens.shadowBase}, 0 0 0 1px ${colorPreset.fill}`;
      bubble.style.opacity = bubbleVisible ? '1' : '0';
      bubble.style.transition = 'opacity 120ms ease, border-color 120ms ease, box-shadow 120ms ease';
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
      text.style.fontFamily = FONT_STACK_SERIF;
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
      [data-notiv-draft-marker="true"]:hover [data-notiv-draft-pin="true"] {
        transform: scale(1.03);
      }
      [data-notiv-draft-marker="true"]:hover [data-notiv-note-bubble="true"] {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
  }
}
