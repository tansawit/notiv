import styles from './styles.css?inline';
import { UI_IDS } from '../shared/constants';
import { getNotisThemeMode } from './theme-mode';

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
  private successContent: HTMLDivElement | null = null;
  private spinnerEl: SVGSVGElement | null = null;
  private errorContent: HTMLDivElement | null = null;
  private count = 0;
  private prevCount = 0;
  private visible = false;
  private animating = false;
  private queuePanelOpen = false;
  private successPillActive = false;
  private errorPillActive = false;
  private submitting = false;
  private successPillTimeout: ReturnType<typeof setTimeout> | null = null;
  private errorPillTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingIssueUrl: string | null = null;
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
      dot.className = 'notis-flying-dot';
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

  showSuccessPill(issue?: { identifier?: string; url?: string }): void {
    if (!this.badge || !this.successContent) return;

    if (this.successPillTimeout) {
      clearTimeout(this.successPillTimeout);
      this.successPillTimeout = null;
    }

    this.pendingIssueUrl = issue?.url ?? null;
    this.successPillActive = true;

    const textEl = this.successContent.querySelector('.notis-badge-success-text');
    if (textEl) {
      textEl.textContent = issue?.identifier ? `${issue.identifier} created` : 'Ticket created';
    }

    const arrowEl = this.successContent.querySelector('.notis-badge-success-arrow') as HTMLElement | null;
    if (arrowEl) {
      arrowEl.style.display = this.pendingIssueUrl ? 'block' : 'none';
    }

    this.badge.classList.remove('submit-success', 'success-pill-exit', 'empty', 'has-notes', 'breathing');
    void this.badge.offsetWidth;
    this.badge.classList.add('success-pill');

    const checkPath = this.successContent.querySelector('.notis-badge-success-check path');
    if (checkPath) {
      checkPath.setAttribute('style', '');
      void (checkPath as SVGPathElement).getBoundingClientRect();
    }

    this.successPillTimeout = setTimeout(() => {
      this.dismissSuccessPill();
    }, 2200);
  }

  private dismissSuccessPill(): void {
    if (!this.badge || !this.successPillActive) return;

    this.successPillActive = false;
    this.pendingIssueUrl = null;

    if (this.successPillTimeout) {
      clearTimeout(this.successPillTimeout);
      this.successPillTimeout = null;
    }

    this.badge.classList.remove('success-pill');
    this.badge.classList.add('success-pill-exit');

    setTimeout(() => {
      if (!this.badge) return;
      this.badge.classList.remove('success-pill-exit');
      this.render();
    }, 300);
  }

  private handleSuccessPillClick(): void {
    if (!this.successPillActive) return;

    if (this.pendingIssueUrl) {
      window.open(this.pendingIssueUrl, '_blank', 'noopener,noreferrer');
    }

    this.dismissSuccessPill();
  }

  showSubmitting(): void {
    if (!this.badge) return;
    this.submitting = true;
    this.badge.classList.remove('success-pill', 'error-pill', 'celebrate', 'breathing');
    this.badge.classList.add('submitting');
  }

  hideSubmitting(): void {
    if (!this.badge) return;
    this.submitting = false;
    this.badge.classList.remove('submitting');
  }

  showErrorPill(message: string): void {
    if (!this.badge || !this.errorContent) return;

    this.hideSubmitting();

    if (this.errorPillTimeout) {
      clearTimeout(this.errorPillTimeout);
      this.errorPillTimeout = null;
    }

    this.errorPillActive = true;

    const textEl = this.errorContent.querySelector('.notis-badge-error-text');
    if (textEl) {
      const shortMessage = message.length > 24 ? message.slice(0, 22) + '…' : message;
      textEl.textContent = shortMessage;
      textEl.setAttribute('title', message);
    }

    this.badge.classList.remove('submitting', 'success-pill', 'empty', 'has-notes', 'breathing');
    void this.badge.offsetWidth;
    this.badge.classList.add('error-pill');

    this.errorPillTimeout = setTimeout(() => {
      this.dismissErrorPill();
    }, 4000);
  }

  private dismissErrorPill(): void {
    if (!this.badge || !this.errorPillActive) return;

    this.errorPillActive = false;

    if (this.errorPillTimeout) {
      clearTimeout(this.errorPillTimeout);
      this.errorPillTimeout = null;
    }

    this.badge.classList.remove('error-pill');
    this.badge.classList.add('error-pill-exit');

    setTimeout(() => {
      if (!this.badge) return;
      this.badge.classList.remove('error-pill-exit');
      this.render();
    }, 300);
  }

  private handleErrorPillClick(): void {
    if (!this.errorPillActive) return;
    this.dismissErrorPill();
  }

  private updateBreathingState(): void {
    if (!this.badge) return;
    const shouldBreathe = this.count > 0 && !this.queuePanelOpen;
    this.badge.classList.toggle('breathing', shouldBreathe);

    this.badge.classList.remove('eager', 'busy');
    if (shouldBreathe) {
      if (this.count >= 5) {
        this.badge.classList.add('busy');
      } else if (this.count >= 2) {
        this.badge.classList.add('eager');
      }
    }
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
    if (this.successPillTimeout) {
      clearTimeout(this.successPillTimeout);
      this.successPillTimeout = null;
    }
    if (this.errorPillTimeout) {
      clearTimeout(this.errorPillTimeout);
      this.errorPillTimeout = null;
    }
    this.systemThemeQuery.removeEventListener('change', this.themeChangeHandler);
    window.removeEventListener('notis-theme-change', this.themeChangeHandler as EventListener);
    this.container?.remove();
    this.container = null;
    this.badge = null;
    this.currentEl = null;
    this.nextEl = null;
    this.emptyIcon = null;
    this.savedOverlay = null;
    this.successContent = null;
    this.spinnerEl = null;
    this.errorContent = null;
  }

  private ensureMounted(): void {
    if (this.container) return;

    const container = document.createElement('div');
    container.id = `${UI_IDS.rootContainer}-badge`;
    container.setAttribute('data-notis-ui', 'true');
    container.style.position = 'fixed';
    container.style.zIndex = '2147483600';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.setAttribute('data-notis-theme', getNotisThemeMode());

    const shadow = container.attachShadow({ mode: 'open' });
    const styleTag = document.createElement('style');
    styleTag.id = UI_IDS.styleTag;
    styleTag.textContent = styles;
    shadow.appendChild(styleTag);

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'notis-floating-badge empty';
    badge.title = 'Open notes queue';
    badge.setAttribute('aria-label', 'Open notes queue');

    const flipContainer = document.createElement('div');
    flipContainer.className = 'notis-badge-flip-container';

    const currentEl = document.createElement('span');
    currentEl.className = 'notis-badge-flip-number current';

    const nextEl = document.createElement('span');
    nextEl.className = 'notis-badge-flip-number next';

    const emptyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    emptyIcon.setAttribute('class', 'notis-badge-empty-icon');
    emptyIcon.setAttribute('viewBox', '0 0 24 24');
    emptyIcon.setAttribute('fill', 'none');
    emptyIcon.setAttribute('stroke', 'currentColor');
    emptyIcon.setAttribute('stroke-width', '1.5');
    emptyIcon.setAttribute('stroke-linecap', 'round');
    const plusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    plusPath.setAttribute('d', 'M12 5v14M5 12h14');
    emptyIcon.appendChild(plusPath);

    const savedOverlay = document.createElement('div');
    savedOverlay.className = 'notis-badge-saved-overlay';
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

    const successContent = document.createElement('div');
    successContent.className = 'notis-badge-success-content';

    const successCheck = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    successCheck.setAttribute('class', 'notis-badge-success-check');
    successCheck.setAttribute('viewBox', '0 0 24 24');
    successCheck.setAttribute('fill', 'none');
    successCheck.setAttribute('stroke', 'currentColor');
    successCheck.setAttribute('stroke-width', '2.5');
    successCheck.setAttribute('stroke-linecap', 'round');
    successCheck.setAttribute('stroke-linejoin', 'round');
    const successCheckPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    successCheckPath.setAttribute('d', 'M20 6L9 17l-5-5');
    successCheck.appendChild(successCheckPath);

    const successText = document.createElement('span');
    successText.className = 'notis-badge-success-text';
    successText.textContent = 'Ticket created';

    const successArrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    successArrow.setAttribute('class', 'notis-badge-success-arrow');
    successArrow.setAttribute('viewBox', '0 0 24 24');
    successArrow.setAttribute('fill', 'none');
    successArrow.setAttribute('stroke', 'currentColor');
    successArrow.setAttribute('stroke-width', '2');
    successArrow.setAttribute('stroke-linecap', 'round');
    successArrow.setAttribute('stroke-linejoin', 'round');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M7 17L17 7M17 7H7M17 7v10');
    successArrow.appendChild(arrowPath);

    successContent.appendChild(successCheck);
    successContent.appendChild(successText);
    successContent.appendChild(successArrow);

    const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spinner.setAttribute('class', 'notis-badge-spinner');
    spinner.setAttribute('viewBox', '0 0 24 24');
    spinner.setAttribute('fill', 'none');
    spinner.setAttribute('stroke', 'currentColor');
    spinner.setAttribute('stroke-width', '2.5');
    spinner.setAttribute('stroke-linecap', 'round');
    const spinnerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    spinnerCircle.setAttribute('d', 'M12 2a10 10 0 0 1 10 10');
    spinner.appendChild(spinnerCircle);

    const errorContent = document.createElement('div');
    errorContent.className = 'notis-badge-error-content';

    const errorIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    errorIcon.setAttribute('class', 'notis-badge-error-icon');
    errorIcon.setAttribute('viewBox', '0 0 24 24');
    errorIcon.setAttribute('fill', 'none');
    errorIcon.setAttribute('stroke', 'currentColor');
    errorIcon.setAttribute('stroke-width', '2.5');
    errorIcon.setAttribute('stroke-linecap', 'round');
    errorIcon.setAttribute('stroke-linejoin', 'round');
    const errorIconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    errorIconPath.setAttribute('d', 'M12 9v4m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z');
    errorIcon.appendChild(errorIconPath);

    const errorText = document.createElement('span');
    errorText.className = 'notis-badge-error-text';
    errorText.textContent = 'Error';

    const errorDismiss = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    errorDismiss.setAttribute('class', 'notis-badge-error-dismiss');
    errorDismiss.setAttribute('viewBox', '0 0 24 24');
    errorDismiss.setAttribute('fill', 'none');
    errorDismiss.setAttribute('stroke', 'currentColor');
    errorDismiss.setAttribute('stroke-width', '2.5');
    errorDismiss.setAttribute('stroke-linecap', 'round');
    const dismissPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    dismissPath.setAttribute('d', 'M18 6L6 18M6 6l12 12');
    errorDismiss.appendChild(dismissPath);

    errorContent.appendChild(errorIcon);
    errorContent.appendChild(errorText);
    errorContent.appendChild(errorDismiss);

    flipContainer.appendChild(currentEl);
    flipContainer.appendChild(nextEl);
    badge.appendChild(flipContainer);
    badge.appendChild(emptyIcon);
    badge.appendChild(savedOverlay);
    badge.appendChild(successContent);
    badge.appendChild(spinner);
    badge.appendChild(errorContent);
    shadow.appendChild(badge);

    document.documentElement.appendChild(container);
    this.systemThemeQuery.addEventListener('change', this.themeChangeHandler);
    window.addEventListener('notis-theme-change', this.themeChangeHandler as EventListener);

    this.container = container;
    this.badge = badge;
    this.currentEl = currentEl;
    this.nextEl = nextEl;
    this.emptyIcon = emptyIcon;
    this.savedOverlay = savedOverlay;
    this.successContent = successContent;
    this.spinnerEl = spinner;
    this.errorContent = errorContent;

    badge.addEventListener('click', () => {
      if (this.successPillActive) {
        this.handleSuccessPillClick();
      } else if (this.errorPillActive) {
        this.handleErrorPillClick();
      } else if (!this.submitting) {
        this.callbacks.onClick();
      }
    });
  }

  private applyThemeMode(): void {
    if (!this.container) return;
    this.container.setAttribute('data-notis-theme', getNotisThemeMode());
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
        this.currentEl.className = 'notis-badge-flip-number current';
        this.nextEl.className = 'notis-badge-flip-number next';
        this.nextEl.textContent = '';
      }
    } else {
      this.badge.classList.remove('has-notes', 'breathing');
      this.badge.classList.add('empty');
      this.badge.title = 'Open notes queue';
      this.currentEl.textContent = '';
      this.nextEl.textContent = '';
      this.currentEl.className = 'notis-badge-flip-number current';
      this.nextEl.className = 'notis-badge-flip-number next';
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
    this.currentEl.className = 'notis-badge-flip-number current';

    this.nextEl.textContent = String(to);
    this.nextEl.className = `notis-badge-flip-number ${goingUp ? 'below' : 'above'}`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this.currentEl || !this.nextEl) return;
        this.currentEl.className = `notis-badge-flip-number ${goingUp ? 'exit-up' : 'exit-down'}`;
        this.nextEl.className = 'notis-badge-flip-number current';
      });
    });

    setTimeout(() => {
      if (!this.currentEl || !this.nextEl) return;

      this.currentEl.style.transition = 'none';
      this.currentEl.textContent = String(to);
      this.currentEl.className = 'notis-badge-flip-number current';

      this.nextEl.style.transition = 'none';
      this.nextEl.className = 'notis-badge-flip-number next';
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
