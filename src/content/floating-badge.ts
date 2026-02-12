import styles from './styles.css?inline';
import { UI_IDS } from '../shared/constants';
import { getNotivThemeMode } from './theme-mode';

export interface FloatingBadgeCallbacks {
  onClick: () => void;
}

export class FloatingBadge {
  private container: HTMLDivElement | null = null;
  private badge: HTMLButtonElement | null = null;
  private currentEl: HTMLSpanElement | null = null;
  private nextEl: HTMLSpanElement | null = null;
  private emptyIcon: SVGSVGElement | null = null;
  private count = 0;
  private prevCount = 0;
  private visible = false;
  private animating = false;
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
      this.triggerPulse();
    }
  }

  private triggerPulse(): void {
    if (!this.badge) return;
    this.badge.classList.remove('pulse');
    void this.badge.offsetWidth;
    this.badge.classList.add('pulse');
    setTimeout(() => {
      this.badge?.classList.remove('pulse');
    }, 400);
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
    emptyIcon.setAttribute('stroke-width', '2');
    emptyIcon.setAttribute('stroke-linecap', 'round');
    const plusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    plusPath.setAttribute('d', 'M12 5v14M5 12h14');
    emptyIcon.appendChild(plusPath);

    flipContainer.appendChild(currentEl);
    flipContainer.appendChild(nextEl);
    badge.appendChild(flipContainer);
    badge.appendChild(emptyIcon);
    shadow.appendChild(badge);

    document.documentElement.appendChild(container);
    this.systemThemeQuery.addEventListener('change', this.themeChangeHandler);
    window.addEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);

    this.container = container;
    this.badge = badge;
    this.currentEl = currentEl;
    this.nextEl = nextEl;
    this.emptyIcon = emptyIcon;
  }

  private applyThemeMode(): void {
    if (!this.container) return;
    this.container.setAttribute('data-notiv-theme', getNotivThemeMode());
  }

  private render(): void {
    if (!this.container || !this.badge || !this.currentEl || !this.nextEl) return;

    this.container.style.display = this.visible ? 'block' : 'none';

    if (this.count > 0) {
      this.badge.className = 'notiv-floating-badge has-notes';
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
      this.badge.className = 'notiv-floating-badge empty';
      this.badge.title = 'Open notes queue';
      this.currentEl.textContent = '';
      this.nextEl.textContent = '';
      this.currentEl.className = 'notiv-badge-flip-number current';
      this.nextEl.className = 'notiv-badge-flip-number next';
    }
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
