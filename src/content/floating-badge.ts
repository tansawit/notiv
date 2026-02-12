import styles from './styles.css?inline';
import { UI_IDS } from '../shared/constants';
import { getNotivThemeMode } from './theme-mode';

export interface FloatingBadgeCallbacks {
  onClick: () => void;
}

export interface BadgePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class FloatingBadge {
  private container: HTMLDivElement | null = null;
  private badge: HTMLButtonElement | null = null;
  private currentEl: HTMLSpanElement | null = null;
  private nextEl: HTMLSpanElement | null = null;
  private emptyIcon: SVGSVGElement | null = null;
  private savedOverlay: HTMLDivElement | null = null;
  private count = 0;
  private prevCount = 0;
  private visible = false;
  private animating = false;
  private queuePanelOpen = false;
  private readonly systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly themeChangeHandler = (): void => {
    this.applyThemeMode();
  };

  constructor(private readonly callbacks: FloatingBadgeCallbacks) {}

  setCount(value: number): void {
    if (value === this.count) return;
    const isIncreasing = value > this.count;
    this.prevCount = this.count;
    this.count = value;
    this.render();
    if (isIncreasing && this.badge) {
      this.triggerCelebration();
    }
  }

  setQueuePanelOpen(open: boolean): void {
    this.queuePanelOpen = open;
    this.updateBreathingState();
  }

  showSavedConfirmation(): void {
    if (!this.badge || !this.savedOverlay) return;
    this.savedOverlay.classList.remove('visible');
    void this.savedOverlay.offsetWidth;
    this.savedOverlay.classList.add('visible');
    setTimeout(() => {
      this.savedOverlay?.classList.remove('visible');
    }, 1200);
  }

  getPosition(): BadgePosition | null {
    if (!this.badge) return null;
    const rect = this.badge.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  }

  playFlyingDotsAnimation(sourcePositions: Array<{ x: number; y: number; color: string }>): void {
    if (!this.container || !this.badge) return;

    const badgePos = this.getPosition();
    if (!badgePos) return;

    const shadow = this.container.shadowRoot;
    if (!shadow) return;

    sourcePositions.forEach((source, index) => {
      const dot = document.createElement('div');
      dot.className = 'notiv-flying-dot';
      dot.style.setProperty('--dot-color', source.color);
      dot.style.setProperty('--start-x', `${source.x - badgePos.x}px`);
      dot.style.setProperty('--start-y', `${source.y - badgePos.y}px`);
      dot.style.animationDelay = `${index * 60}ms`;
      shadow.appendChild(dot);

      dot.addEventListener('animationend', () => {
        dot.remove();
      });
    });

    const totalDuration = sourcePositions.length * 60 + 400;
    setTimeout(() => {
      this.playReceiveAnimation();
    }, totalDuration - 100);
  }

  playReceiveAnimation(): void {
    if (!this.badge) return;
    this.badge.classList.remove('receive');
    void this.badge.offsetWidth;
    this.badge.classList.add('receive');
    setTimeout(() => {
      this.badge?.classList.remove('receive');
    }, 500);
  }

  playSubmitSuccessAnimation(): void {
    if (!this.badge) return;
    this.badge.classList.remove('submit-success');
    void this.badge.offsetWidth;
    this.badge.classList.add('submit-success');
    setTimeout(() => {
      this.badge?.classList.remove('submit-success');
    }, 800);
  }

  private updateBreathingState(): void {
    if (!this.badge) return;
    const shouldBreathe = this.count > 0 && !this.queuePanelOpen;
    this.badge.classList.toggle('breathing', shouldBreathe);
  }

  private triggerCelebration(): void {
    if (!this.badge) return;
    this.badge.classList.remove('celebrate');
    void this.badge.offsetWidth;
    this.badge.classList.add('celebrate');
    setTimeout(() => {
      this.badge?.classList.remove('celebrate');
    }, 600);
  }

  setVisible(value: boolean): void {
    this.visible = value;
    if (value) {
      this.ensureMounted();
    }
    this.render();
  }

  destroy(): void {
    this.systemThemeQuery.removeEventListener('change', this.themeChangeHandler);
    window.removeEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);
    this.container?.remove();
    this.container = null;
    this.badge = null;
    this.currentEl = null;
    this.nextEl = null;
    this.emptyIcon = null;
    this.savedOverlay = null;
  }

  private ensureMounted(): void {
    if (this.container) return;

    const container = document.createElement('div');
    container.id = `${UI_IDS.rootContainer}-badge`;
    container.setAttribute('data-notiv-ui', 'true');
    container.style.position = 'fixed';
    container.style.zIndex = '2147483600';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.setAttribute('data-notiv-theme', getNotivThemeMode());

    const shadow = container.attachShadow({ mode: 'open' });
    const styleTag = document.createElement('style');
    styleTag.id = UI_IDS.styleTag;
    styleTag.textContent = styles;
    shadow.appendChild(styleTag);

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'notiv-floating-badge empty';
    badge.title = 'Open notes queue';
    badge.setAttribute('aria-label', 'Open notes queue');
    badge.addEventListener('click', () => {
      this.callbacks.onClick();
    });

    const flipContainer = document.createElement('div');
    flipContainer.className = 'notiv-badge-flip-container';

    const currentEl = document.createElement('span');
    currentEl.className = 'notiv-badge-flip-number current';

    const nextEl = document.createElement('span');
    nextEl.className = 'notiv-badge-flip-number next';

    const emptyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    emptyIcon.setAttribute('class', 'notiv-badge-empty-icon');
    emptyIcon.setAttribute('viewBox', '0 0 24 24');
    emptyIcon.setAttribute('fill', 'none');
    emptyIcon.setAttribute('stroke', 'currentColor');
    emptyIcon.setAttribute('stroke-width', '1.5');
    emptyIcon.setAttribute('stroke-linecap', 'round');
    const plusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    plusPath.setAttribute('d', 'M12 5v14M5 12h14');
    emptyIcon.appendChild(plusPath);

    const savedOverlay = document.createElement('div');
    savedOverlay.className = 'notiv-badge-saved-overlay';
    const savedCheck = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    savedCheck.setAttribute('viewBox', '0 0 24 24');
    savedCheck.setAttribute('fill', 'none');
    savedCheck.setAttribute('stroke', 'currentColor');
    savedCheck.setAttribute('stroke-width', '2.5');
    savedCheck.setAttribute('stroke-linecap', 'round');
    savedCheck.setAttribute('stroke-linejoin', 'round');
    const savedCheckPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    savedCheckPath.setAttribute('d', 'M20 6L9 17l-5-5');
    savedCheck.appendChild(savedCheckPath);
    savedOverlay.appendChild(savedCheck);

    flipContainer.appendChild(currentEl);
    flipContainer.appendChild(nextEl);
    badge.appendChild(flipContainer);
    badge.appendChild(emptyIcon);
    badge.appendChild(savedOverlay);
    shadow.appendChild(badge);

    document.documentElement.appendChild(container);
    this.systemThemeQuery.addEventListener('change', this.themeChangeHandler);
    window.addEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);

    this.container = container;
    this.badge = badge;
    this.currentEl = currentEl;
    this.nextEl = nextEl;
    this.emptyIcon = emptyIcon;
    this.savedOverlay = savedOverlay;
  }

  private applyThemeMode(): void {
    if (!this.container) return;
    this.container.setAttribute('data-notiv-theme', getNotivThemeMode());
  }

  private render(): void {
    if (!this.container || !this.badge || !this.currentEl || !this.nextEl) return;

    this.container.style.display = this.visible ? 'block' : 'none';

    if (this.count > 0) {
      this.badge.classList.remove('empty');
      this.badge.classList.add('has-notes');
      const noteLabel = `${this.count} note${this.count === 1 ? '' : 's'} queued`;
      this.badge.title = noteLabel;
      this.badge.setAttribute('aria-label', `${noteLabel}, click to open`);

      if (this.prevCount !== this.count && this.prevCount > 0) {
        this.animateFlip(this.prevCount, this.count);
      } else {
        this.currentEl.textContent = String(this.count);
        this.currentEl.className = 'notiv-badge-flip-number current';
        this.nextEl.className = 'notiv-badge-flip-number next';
        this.nextEl.textContent = '';
      }
    } else {
      this.badge.classList.remove('has-notes', 'breathing');
      this.badge.classList.add('empty');
      this.badge.title = 'Open notes queue';
      this.currentEl.textContent = '';
      this.nextEl.textContent = '';
      this.currentEl.className = 'notiv-badge-flip-number current';
      this.nextEl.className = 'notiv-badge-flip-number next';
    }

    this.updateBreathingState();
  }

  private animateFlip(from: number, to: number): void {
    if (!this.currentEl || !this.nextEl || this.animating) {
      if (this.currentEl) this.currentEl.textContent = String(to);
      return;
    }

    this.animating = true;
    const goingUp = to > from;

    this.currentEl.textContent = String(from);
    this.currentEl.className = 'notiv-badge-flip-number current';

    this.nextEl.textContent = String(to);
    this.nextEl.className = `notiv-badge-flip-number ${goingUp ? 'below' : 'above'}`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.currentEl || !this.nextEl) return;
        this.currentEl.className = `notiv-badge-flip-number ${goingUp ? 'exit-up' : 'exit-down'}`;
        this.nextEl.className = 'notiv-badge-flip-number current';
      });
    });

    setTimeout(() => {
      if (!this.currentEl || !this.nextEl) return;

      this.currentEl.style.transition = 'none';
      this.currentEl.textContent = String(to);
      this.currentEl.className = 'notiv-badge-flip-number current';

      this.nextEl.style.transition = 'none';
      this.nextEl.className = 'notiv-badge-flip-number next';
      this.nextEl.textContent = '';

      requestAnimationFrame(() => {
        if (!this.currentEl || !this.nextEl) return;
        this.currentEl.style.transition = '';
        this.nextEl.style.transition = '';
        this.animating = false;
      });
    }, 220);
  }
}
