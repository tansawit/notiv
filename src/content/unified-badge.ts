import styles from './styles.css?inline';
import { UI_IDS, STORAGE_KEYS } from '../shared/constants';
import { getNotivThemeMode } from './theme-mode';
import type { HighlightColor, LinearLabel, LinearTeam, LinearUser } from '../shared/types';
import { getHighlightColorPreset, resolveHighlightColor } from '../shared/highlight-colors';
import { FONT_STACK_MONO, FONT_STACK_SANS } from '../shared/visual-tokens';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';

/* ─────────────────────────────────────────────────────────────
 * UNIFIED BADGE
 *
 * The badge IS the queue. One morphing container, four shapes.
 *
 * Stage: BADGE (collapsed)
 *        44×44 circle, shows note count or "+"
 *        Click → expands to QUEUE (250ms, cubic-bezier)
 *
 * Stage: QUEUE (expanded panel)
 *        280×dynamic rounded rect, shows notes list + submit
 *        Click Submit → shrinks to LOADING (200ms, cubic-bezier)
 *
 * Stage: LOADING (collapsed)
 *        44×44 circle, spinning indicator
 *        On response → expands to RESULT
 *          - SUCCESS: spring-like (300ms with overshoot)
 *          - ERROR: cubic-bezier (errors shouldn't bounce)
 *
 * Stage: SUCCESS / ERROR (pill)
 *        ~160×44 pill, green/red with ticket ID or error
 *        After timeout → shrinks to BADGE (200ms, cubic-bezier)
 *
 * HYBRID ANIMATION APPROACH:
 * - Cubic-bezier for functional transitions (precise, tool-like)
 * - Spring-like for success (moment of earned delight)
 * ─────────────────────────────────────────────────────────── */

type Stage = 'badge' | 'queue' | 'loading' | 'success' | 'error';

export interface QueueNoteSummary {
  id: string;
  comment: string;
  target: string;
  attachmentsCount?: number;
  highlightColor: HighlightColor;
}

export interface UnifiedBadgeCallbacks {
  onBadgeClick: () => void;
  onSubmit: () => void;
  onClear: () => void;
  onDelete: (id: string) => void;
  onHover: (id: string | null) => void;
  onEdit: (id: string) => void;
}

export interface SubmissionSettings {
  priority: number | null;
  labelIds: string[];
  assigneeId: string | null;
}

export interface NotePosition {
  x: number;
  y: number;
  color: string;
}

export interface UnifiedBadgeResources {
  teams: LinearTeam[];
  labels: LinearLabel[];
  users: LinearUser[];
}

const BADGE_SIZE = 36;
const QUEUE_WIDTH = 320;
const SUCCESS_WIDTH = 200;
const ERROR_WIDTH = 220;
const HEADER_HEIGHT = 48;
const SETTINGS_HEIGHT = 36;
const ROW_HEIGHT = 52;

const TIMING = {
  expand: 250,
  collapse: 200,
  successExpand: 300,
  pillVisible: 2200,
  contentStagger: 20,
  contentDuration: 120,
};

const EASING = {
  precise: 'cubic-bezier(0.32, 0.72, 0, 1)',
  successSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

export class UnifiedBadge {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private morphContainer: HTMLDivElement | null = null;
  private badgeContent: HTMLDivElement | null = null;
  private queueContent: HTMLDivElement | null = null;
  private loadingContent: HTMLDivElement | null = null;
  private successContent: HTMLDivElement | null = null;
  private errorContent: HTMLDivElement | null = null;
  private listEl: HTMLDivElement | null = null;
  private emptyEl: HTMLDivElement | null = null;
  private titleEl: HTMLSpanElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;
  private settingsEl: HTMLDivElement | null = null;
  private backdrop: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;

  private stage: Stage = 'badge';
  private prevStage: Stage = 'badge';
  private items: QueueNoteSummary[] = [];
  private renderedItemIds: string[] = [];
  private hoveredId: string | null = null;
  private visible = false;
  private submitting = false;


  private resources: UnifiedBadgeResources = { teams: [], labels: [], users: [] };
  private settings: SubmissionSettings = { priority: null, labelIds: [], assigneeId: null };
  private selectedTeamId: string | null = null;
  private settingsExpanded = false;
  private takeoverMode: 'priority' | null = null;
  private teamDropdownOpen = false;
  private assigneeDropdownOpen = false;
  private labelsDropdownOpen = false;
  private teamSearchQuery = '';
  private assigneeSearchQuery = '';
  private labelsSearchQuery = '';

  private successPillTimeout: ReturnType<typeof setTimeout> | null = null;
  private errorPillTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingIssueUrl: string | null = null;

  private readonly prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly themeChangeHandler = (): void => {
    this.applyThemeMode();
  };

  constructor(private readonly callbacks: UnifiedBadgeCallbacks) {
    void this.loadSettings();
  }

  private changeStage(newStage: Stage): void {
    this.prevStage = this.stage;
    this.stage = newStage;
    this.render();
  }

  setItems(value: QueueNoteSummary[]): void {
    const newIds = value.map((item) => item.id);
    const itemsChanged =
      this.renderedItemIds.length !== newIds.length ||
      this.renderedItemIds.some((id, i) => id !== newIds[i]);
    this.items = value;
    if (itemsChanged) {
      this.renderQueueContent();
    }
    this.updateBadgeCount();
  }

  setHoveredId(id: string | null): void {
    const prevId = this.hoveredId;
    this.hoveredId = id;
    this.updateRowHighlights(prevId, id);
  }

  setSubmitting(value: boolean): void {
    this.submitting = value;
    if (value) {
      this.container?.setAttribute('data-notiv-capture-preserve', 'true');
      this.changeStage('loading');
    }
  }

  setResources(resources: UnifiedBadgeResources): void {
    this.resources = resources;
    this.renderSettings();
  }

  getSettings(): SubmissionSettings {
    return { ...this.settings };
  }

  getNotePositions(): NotePosition[] {
    if (!this.listEl) return [];
    const positions: NotePosition[] = [];
    const rows = this.listEl.querySelectorAll('.notiv-unified-row');
    rows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      const note = this.items[index];
      const colorPreset = note ? getHighlightColorPreset(resolveHighlightColor(note.highlightColor)) : null;
      positions.push({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        color: colorPreset?.pinFill ?? '#1a1816'
      });
    });
    return positions;
  }

  resetPriority(): void {
    this.settings.priority = null;
    void this.saveSettings();
    this.renderSettings();
  }

  showSuccessPill(issue?: { identifier?: string; url?: string }): void {
    if (this.successPillTimeout) {
      clearTimeout(this.successPillTimeout);
      this.successPillTimeout = null;
    }

    this.pendingIssueUrl = issue?.url ?? null;

    if (this.successContent) {
      const textEl = this.successContent.querySelector('.notiv-unified-success-text');
      if (textEl) {
        textEl.textContent = issue?.identifier ? `${issue.identifier} created` : 'Ticket created';
      }
    }

    this.changeStage('success');

    this.successPillTimeout = setTimeout(() => {
      this.dismissSuccessPill();
    }, TIMING.pillVisible);
  }

  private dismissSuccessPill(): void {
    if (this.stage !== 'success') return;

    this.pendingIssueUrl = null;

    if (this.successPillTimeout) {
      clearTimeout(this.successPillTimeout);
      this.successPillTimeout = null;
    }

    this.changeStage('badge');
  }

  showErrorPill(message: string): void {
    if (this.errorPillTimeout) {
      clearTimeout(this.errorPillTimeout);
      this.errorPillTimeout = null;
    }

    if (this.errorContent) {
      const textEl = this.errorContent.querySelector('.notiv-unified-error-text');
      if (textEl) {
        const shortMessage = message.length > 24 ? message.slice(0, 22) + '…' : message;
        textEl.textContent = shortMessage;
        textEl.setAttribute('title', message);
      }
    }

    this.changeStage('error');

    this.errorPillTimeout = setTimeout(() => {
      this.dismissErrorPill();
    }, 4000);
  }

  private dismissErrorPill(): void {
    if (this.stage !== 'error') return;

    if (this.errorPillTimeout) {
      clearTimeout(this.errorPillTimeout);
      this.errorPillTimeout = null;
    }

    this.changeStage('badge');
  }

  hideSubmitting(): void {
    this.submitting = false;
    this.container?.removeAttribute('data-notiv-capture-preserve');
  }

  getPosition(): { x: number; y: number; width: number; height: number } | null {
    if (!this.morphContainer) return null;
    const rect = this.morphContainer.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  }

  isQueueVisible(): boolean {
    return this.stage === 'queue';
  }

  openQueue(): void {
    if (this.stage === 'badge') {
      this.changeStage('queue');
    }
  }

  closeQueue(): void {
    if (this.stage === 'queue') {
      this.changeStage('badge');
    }
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
    window.removeEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);
    this.container?.remove();
    this.container = null;
  }

  private async loadSettings(): Promise<void> {
    try {
      const items = await getLocalStorageItems<Record<string, unknown>>([
        STORAGE_KEYS.submitTeamId,
        STORAGE_KEYS.submitPriority,
        STORAGE_KEYS.submitLabelIds,
        STORAGE_KEYS.submitAssigneeId,
        STORAGE_KEYS.submitSettingsExpanded
      ]);
      if (items) {
        if (typeof items[STORAGE_KEYS.submitTeamId] === 'string') {
          this.selectedTeamId = items[STORAGE_KEYS.submitTeamId] as string;
        }
        if (typeof items[STORAGE_KEYS.submitPriority] === 'number') {
          this.settings.priority = items[STORAGE_KEYS.submitPriority] as number;
        }
        if (Array.isArray(items[STORAGE_KEYS.submitLabelIds])) {
          this.settings.labelIds = items[STORAGE_KEYS.submitLabelIds] as string[];
        }
        if (typeof items[STORAGE_KEYS.submitAssigneeId] === 'string') {
          this.settings.assigneeId = items[STORAGE_KEYS.submitAssigneeId] as string;
        }
        if (typeof items[STORAGE_KEYS.submitSettingsExpanded] === 'boolean') {
          this.settingsExpanded = items[STORAGE_KEYS.submitSettingsExpanded] as boolean;
        }
      }
    } catch {
      // Ignore
    }
    this.renderSettings();
  }

  private async saveSettings(): Promise<void> {
    try {
      await setLocalStorageItems({
        [STORAGE_KEYS.submitTeamId]: this.selectedTeamId,
        [STORAGE_KEYS.submitPriority]: this.settings.priority,
        [STORAGE_KEYS.submitLabelIds]: this.settings.labelIds,
        [STORAGE_KEYS.submitAssigneeId]: this.settings.assigneeId,
        [STORAGE_KEYS.submitSettingsExpanded]: this.settingsExpanded
      });
    } catch {
      // Ignore
    }
  }

  private ensureMounted(): void {
    if (this.container) return;

    const container = document.createElement('div');
    container.id = `${UI_IDS.rootContainer}-unified`;
    container.setAttribute('data-notiv-ui', 'true');
    container.style.position = 'fixed';
    container.style.zIndex = '2147483645';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.setAttribute('data-notiv-theme', getNotivThemeMode());

    const shadow = container.attachShadow({ mode: 'open' });
    const styleTag = document.createElement('style');
    styleTag.id = UI_IDS.styleTag;
    styleTag.textContent = styles;
    shadow.appendChild(styleTag);

    const backdrop = document.createElement('div');
    backdrop.className = 'notiv-unified-backdrop';
    backdrop.addEventListener('click', () => {
      if (this.stage === 'queue') {
        this.changeStage('badge');
      }
    });
    shadow.appendChild(backdrop);
    this.backdrop = backdrop;

    const morphContainer = document.createElement('div');
    morphContainer.className = 'notiv-unified-morph';
    morphContainer.setAttribute('data-stage', 'badge');

    this.buildBadgeContent(morphContainer);
    this.buildQueueContent(morphContainer);
    this.buildLoadingContent(morphContainer);
    this.buildSuccessContent(morphContainer);
    this.buildErrorContent(morphContainer);

    const tooltip = document.createElement('div');
    tooltip.className = 'notiv-unified-tooltip';
    tooltip.textContent = 'Submitting to Linear...';
    morphContainer.appendChild(tooltip);
    this.tooltip = tooltip;

    shadow.appendChild(morphContainer);
    this.morphContainer = morphContainer;
    this.shadowRoot = shadow;

    document.documentElement.appendChild(container);
    this.systemThemeQuery.addEventListener('change', this.themeChangeHandler);
    window.addEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);

    this.container = container;
  }

  private buildBadgeContent(parent: HTMLElement): void {
    const content = document.createElement('div');
    content.className = 'notiv-unified-content notiv-unified-badge-content';

    const countEl = document.createElement('span');
    countEl.className = 'notiv-unified-badge-count';
    countEl.textContent = '+';

    const emptyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    emptyIcon.setAttribute('class', 'notiv-unified-badge-icon');
    emptyIcon.setAttribute('viewBox', '0 0 24 24');
    emptyIcon.setAttribute('fill', 'none');
    emptyIcon.setAttribute('stroke', 'currentColor');
    emptyIcon.setAttribute('stroke-width', '1.5');
    emptyIcon.setAttribute('stroke-linecap', 'round');
    const plusPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    plusPath.setAttribute('d', 'M12 5v14M5 12h14');
    emptyIcon.appendChild(plusPath);

    content.appendChild(countEl);
    content.appendChild(emptyIcon);

    content.addEventListener('click', () => {
      if (this.stage === 'badge') {
        this.callbacks.onBadgeClick();
        this.changeStage('queue');
      } else if (this.stage === 'loading') {
        this.showTooltip();
      }
    });

    parent.appendChild(content);
    this.badgeContent = content;
  }

  private buildQueueContent(parent: HTMLElement): void {
    const content = document.createElement('div');
    content.className = 'notiv-unified-content notiv-unified-queue-content';
    content.addEventListener('click', (e) => e.stopPropagation());

    const header = document.createElement('div');
    header.className = 'notiv-unified-header';

    const title = document.createElement('span');
    title.className = 'notiv-unified-title';
    title.textContent = 'Notes';

    const actions = document.createElement('div');
    actions.className = 'notiv-unified-actions';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'notiv-unified-btn notiv-unified-btn-ghost';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => this.callbacks.onClear());
    this.addButtonPressEffect(clearBtn);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'notiv-unified-btn notiv-unified-btn-submit';
    submitBtn.title = 'Submit to Linear';
    const submitIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    submitIcon.setAttribute('width', '14');
    submitIcon.setAttribute('height', '14');
    submitIcon.setAttribute('viewBox', '0 0 24 24');
    submitIcon.setAttribute('fill', 'none');
    submitIcon.setAttribute('stroke', 'currentColor');
    submitIcon.setAttribute('stroke-width', '1.5');
    submitIcon.setAttribute('stroke-linecap', 'round');
    submitIcon.setAttribute('stroke-linejoin', 'round');
    const submitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    submitPath.setAttribute('d', 'M5 12h14M12 5l7 7-7 7');
    submitIcon.appendChild(submitPath);
    submitBtn.appendChild(submitIcon);
    submitBtn.addEventListener('click', () => this.callbacks.onSubmit());
    this.addButtonPressEffect(submitBtn);

    actions.appendChild(clearBtn);
    actions.appendChild(submitBtn);
    header.appendChild(title);
    header.appendChild(actions);

    const list = document.createElement('div');
    list.className = 'notiv-unified-list';

    const empty = document.createElement('div');
    empty.className = 'notiv-unified-empty';
    empty.style.display = 'none';

    const emptyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    emptyIcon.setAttribute('class', 'notiv-unified-empty-icon');
    emptyIcon.setAttribute('viewBox', '0 0 24 24');
    emptyIcon.setAttribute('fill', 'none');
    emptyIcon.setAttribute('stroke', 'currentColor');
    emptyIcon.setAttribute('stroke-width', '1.5');
    emptyIcon.setAttribute('stroke-linecap', 'round');
    emptyIcon.setAttribute('stroke-linejoin', 'round');
    const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    iconPath.setAttribute('d', 'M9 12h6M12 9v6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z');
    emptyIcon.appendChild(iconPath);

    const emptyText = document.createElement('div');
    emptyText.className = 'notiv-unified-empty-text';
    emptyText.textContent = 'Ready when you are';

    const emptyHint = document.createElement('div');
    emptyHint.className = 'notiv-unified-empty-hint';
    emptyHint.textContent = 'Highlight text or click anywhere to capture a thought';

    empty.appendChild(emptyIcon);
    empty.appendChild(emptyText);
    empty.appendChild(emptyHint);
    list.appendChild(empty);

    const settings = document.createElement('div');
    settings.className = 'notiv-unified-settings';

    content.appendChild(header);
    content.appendChild(list);
    content.appendChild(settings);
    parent.appendChild(content);

    this.queueContent = content;
    this.listEl = list;
    this.emptyEl = empty;
    this.titleEl = title;
    this.submitBtn = submitBtn;
    this.clearBtn = clearBtn;
    this.settingsEl = settings;
  }

  private buildLoadingContent(parent: HTMLElement): void {
    const content = document.createElement('div');
    content.className = 'notiv-unified-content notiv-unified-loading-content';

    const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spinner.setAttribute('class', 'notiv-unified-spinner');
    spinner.setAttribute('viewBox', '0 0 24 24');
    spinner.setAttribute('fill', 'none');
    spinner.setAttribute('stroke', 'currentColor');
    spinner.setAttribute('stroke-width', '2.5');
    spinner.setAttribute('stroke-linecap', 'round');
    const spinnerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    spinnerCircle.setAttribute('d', 'M12 2a10 10 0 0 1 10 10');
    spinner.appendChild(spinnerCircle);

    content.appendChild(spinner);

    content.addEventListener('click', () => {
      this.showTooltip();
    });

    parent.appendChild(content);
    this.loadingContent = content;
  }

  private buildSuccessContent(parent: HTMLElement): void {
    const content = document.createElement('div');
    content.className = 'notiv-unified-content notiv-unified-success-content';

    const checkIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    checkIcon.setAttribute('class', 'notiv-unified-success-check');
    checkIcon.setAttribute('width', '16');
    checkIcon.setAttribute('height', '16');
    checkIcon.setAttribute('viewBox', '0 0 24 24');
    checkIcon.setAttribute('fill', 'none');
    checkIcon.setAttribute('stroke', 'currentColor');
    checkIcon.setAttribute('stroke-width', '2.5');
    checkIcon.setAttribute('stroke-linecap', 'round');
    checkIcon.setAttribute('stroke-linejoin', 'round');
    const checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    checkPath.setAttribute('d', 'M4 12l5 5L20 6');
    checkIcon.appendChild(checkPath);

    const textEl = document.createElement('span');
    textEl.className = 'notiv-unified-success-text';
    textEl.textContent = 'Ticket created';

    const arrowIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowIcon.setAttribute('class', 'notiv-unified-success-arrow');
    arrowIcon.setAttribute('width', '14');
    arrowIcon.setAttribute('height', '14');
    arrowIcon.setAttribute('viewBox', '0 0 24 24');
    arrowIcon.setAttribute('fill', 'none');
    arrowIcon.setAttribute('stroke', 'currentColor');
    arrowIcon.setAttribute('stroke-width', '2');
    arrowIcon.setAttribute('stroke-linecap', 'round');
    arrowIcon.setAttribute('stroke-linejoin', 'round');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M7 17L17 7M17 7H7M17 7v10');
    arrowIcon.appendChild(arrowPath);

    content.appendChild(checkIcon);
    content.appendChild(textEl);
    content.appendChild(arrowIcon);

    content.addEventListener('click', () => {
      if (this.pendingIssueUrl) {
        window.open(this.pendingIssueUrl, '_blank', 'noopener,noreferrer');
      }
      this.dismissSuccessPill();
    });

    parent.appendChild(content);
    this.successContent = content;
  }

  private buildErrorContent(parent: HTMLElement): void {
    const content = document.createElement('div');
    content.className = 'notiv-unified-content notiv-unified-error-content';

    const errorIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    errorIcon.setAttribute('class', 'notiv-unified-error-icon');
    errorIcon.setAttribute('width', '16');
    errorIcon.setAttribute('height', '16');
    errorIcon.setAttribute('viewBox', '0 0 24 24');
    errorIcon.setAttribute('fill', 'none');
    errorIcon.setAttribute('stroke', 'currentColor');
    errorIcon.setAttribute('stroke-width', '2.5');
    errorIcon.setAttribute('stroke-linecap', 'round');
    errorIcon.setAttribute('stroke-linejoin', 'round');
    const errorPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    errorPath.setAttribute('d', 'M18 6L6 18M6 6l12 12');
    errorIcon.appendChild(errorPath);

    const textEl = document.createElement('span');
    textEl.className = 'notiv-unified-error-text';
    textEl.textContent = 'Failed to submit';

    content.appendChild(errorIcon);
    content.appendChild(textEl);

    content.addEventListener('click', () => {
      this.dismissErrorPill();
    });

    parent.appendChild(content);
    this.errorContent = content;
  }

  private addButtonPressEffect(button: HTMLButtonElement): void {
    button.addEventListener('mousedown', () => {
      if (!button.disabled) {
        button.style.transform = 'scale(0.97)';
      }
    });
    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
  }

  private showTooltip(): void {
    if (!this.tooltip) return;
    this.tooltip.classList.add('visible');
    setTimeout(() => {
      this.tooltip?.classList.remove('visible');
    }, 2000);
  }

  private applyThemeMode(): void {
    if (!this.container) return;
    this.container.setAttribute('data-notiv-theme', getNotivThemeMode());
  }

  private getQueueHeight(): number {
    const listPadding = 12; // 6px top + 6px bottom from CSS
    const bottomPadding = this.items.length === 0 ? 40 : 4;
    return HEADER_HEIGHT + SETTINGS_HEIGHT + listPadding + Math.max(1, this.items.length) * ROW_HEIGHT + bottomPadding;
  }

  private getDimensions(): { width: number; height: number; borderRadius: number } {
    switch (this.stage) {
      case 'badge':
      case 'loading':
        return {
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
        };
      case 'queue':
        return {
          width: QUEUE_WIDTH,
          height: this.getQueueHeight(),
          borderRadius: 10,
        };
      case 'success':
        return {
          width: SUCCESS_WIDTH,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
        };
      case 'error':
        return {
          width: ERROR_WIDTH,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
        };
    }
  }

  private getTransitionTiming(): string {
    if (this.prefersReducedMotion) {
      return '0ms linear';
    }

    if (this.stage === 'success' && this.prevStage === 'loading') {
      return `${TIMING.successExpand}ms ${EASING.successSpring}`;
    }

    const duration = this.stage === 'queue' ? TIMING.expand : TIMING.collapse;
    return `${duration}ms ${EASING.precise}`;
  }

  private render(): void {
    if (!this.container || !this.morphContainer) return;

    this.container.style.display = this.visible ? 'block' : 'none';
    if (!this.visible) return;

    const dims = this.getDimensions();
    const transition = this.getTransitionTiming();

    this.morphContainer.style.width = `${dims.width}px`;
    this.morphContainer.style.height = `${dims.height}px`;
    this.morphContainer.style.borderRadius = `${dims.borderRadius}px`;
    this.morphContainer.style.transition = `width ${transition}, height ${transition}, border-radius ${transition}, background-color ${transition}, border-color ${transition}`;
    this.morphContainer.setAttribute('data-stage', this.stage);

    if (this.backdrop) {
      this.backdrop.classList.toggle('visible', this.stage === 'queue');
    }

    this.badgeContent?.classList.toggle('active', this.stage === 'badge');
    this.queueContent?.classList.toggle('active', this.stage === 'queue');
    this.loadingContent?.classList.toggle('active', this.stage === 'loading');
    this.successContent?.classList.toggle('active', this.stage === 'success');
    this.errorContent?.classList.toggle('active', this.stage === 'error');

    if (this.stage === 'queue') {
      this.animateQueueContentIn();
    }

    this.updateBadgeCount();
    this.renderQueueContent();
  }

  private updateBadgeCount(): void {
    if (!this.badgeContent) return;

    const countEl = this.badgeContent.querySelector('.notiv-unified-badge-count') as HTMLElement;
    const iconEl = this.badgeContent.querySelector('.notiv-unified-badge-icon') as HTMLElement;

    if (this.items.length > 0) {
      countEl.textContent = String(this.items.length);
      countEl.style.display = 'block';
      iconEl.style.display = 'none';
    } else {
      countEl.style.display = 'none';
      iconEl.style.display = 'block';
    }
  }

  private animateQueueContentIn(): void {
    if (!this.queueContent || this.prefersReducedMotion) return;

    const header = this.queueContent.querySelector('.notiv-unified-header') as HTMLElement;
    const settings = this.queueContent.querySelector('.notiv-unified-settings') as HTMLElement;
    const empty = this.emptyEl;
    const rows = this.listEl?.querySelectorAll('.notiv-unified-row');

    if (header) {
      header.style.opacity = '0';
      header.style.transform = 'translateY(-6px)';
      setTimeout(() => {
        header.style.transition = `opacity ${TIMING.contentDuration}ms ${EASING.precise}, transform ${TIMING.contentDuration}ms ${EASING.precise}`;
        header.style.opacity = '1';
        header.style.transform = 'translateY(0)';
      }, 20);
    }

    if (this.items.length === 0 && empty) {
      empty.style.opacity = '0';
      setTimeout(() => {
        empty.style.transition = `opacity ${TIMING.contentDuration}ms ${EASING.precise}`;
        empty.style.opacity = '1';
      }, 40);
    }

    rows?.forEach((row, i) => {
      const el = row as HTMLElement;
      el.style.opacity = '0';
      el.style.transform = 'translateX(-8px)';
      setTimeout(() => {
        el.style.transition = `opacity ${TIMING.contentDuration}ms ${EASING.precise}, transform ${TIMING.contentDuration}ms ${EASING.precise}`;
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
      }, 30 + i * TIMING.contentStagger);
    });

    if (settings && this.items.length > 0) {
      const rowCount = Math.min(rows?.length ?? 0, 5);
      settings.style.opacity = '0';
      settings.style.transform = 'translateY(4px)';
      setTimeout(() => {
        settings.style.transition = `opacity ${TIMING.contentDuration}ms ${EASING.precise}, transform ${TIMING.contentDuration}ms ${EASING.precise}`;
        settings.style.opacity = '1';
        settings.style.transform = 'translateY(0)';
      }, 30 + rowCount * TIMING.contentStagger);
    }
  }

  private renderQueueContent(): void {
    if (!this.listEl || !this.emptyEl) return;

    const mode = getNotivThemeMode();
    const isDark = mode === 'dark';

    if (this.titleEl) {
      if (this.items.length === 0) {
        this.titleEl.textContent = 'Notes';
      } else if (this.items.length === 1) {
        this.titleEl.textContent = '1 note captured';
      } else {
        this.titleEl.textContent = `${this.items.length} notes captured`;
      }
    }

    if (this.submitBtn) {
      this.submitBtn.disabled = this.items.length === 0 || this.submitting;
    }

    if (this.clearBtn) {
      this.clearBtn.disabled = this.items.length === 0 || this.submitting;
    }

    this.emptyEl.style.display = this.items.length === 0 ? 'flex' : 'none';

    if (this.settingsEl) {
      this.settingsEl.style.display = this.items.length === 0 ? 'none' : 'block';
    }

    const currentIds = this.items.map((item) => item.id);
    const previousIds = new Set(this.renderedItemIds);
    const newIds = new Set(currentIds.filter((id) => !previousIds.has(id)));

    const existingRows = this.listEl.querySelectorAll('.notiv-unified-row');
    existingRows.forEach((row) => row.remove());

    this.renderedItemIds = currentIds;

    this.items.forEach((note, index) => {
      const colorPreset = getHighlightColorPreset(resolveHighlightColor(note.highlightColor));
      const isHovered = this.hoveredId === note.id;
      const isNew = newIds.has(note.id);

      const row = document.createElement('div');
      row.className = 'notiv-unified-row';
      if (isNew) row.classList.add('notiv-unified-row-new');
      row.setAttribute('data-note-id', note.id);
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '14px minmax(0, 1fr) auto';
      row.style.gap = '10px';
      row.style.alignItems = 'start';
      row.style.padding = '8px 6px';
      row.style.borderRadius = '6px';
      row.style.background = isHovered ? (isDark ? 'rgba(240, 239, 237, 0.06)' : 'rgba(26, 24, 22, 0.05)') : 'transparent';
      row.style.cursor = 'pointer';
      row.style.transition = 'background 80ms ease';

      const indexChip = document.createElement('div');
      indexChip.textContent = String(index + 1);
      indexChip.style.width = '14px';
      indexChip.style.height = '14px';
      indexChip.style.marginTop = '2px';
      indexChip.style.borderRadius = '3px';
      indexChip.style.border = `1px solid ${colorPreset.border}`;
      indexChip.style.display = 'grid';
      indexChip.style.placeItems = 'center';
      indexChip.style.fontFamily = FONT_STACK_MONO;
      indexChip.style.fontSize = '9px';
      indexChip.style.fontWeight = '600';
      indexChip.style.color = colorPreset.pinText;
      indexChip.style.background = colorPreset.pinFill;

      const body = document.createElement('div');
      body.style.minWidth = '0';

      const comment = document.createElement('div');
      const commentText = note.comment || 'Untitled note';
      comment.textContent = commentText.length > 110 ? commentText.slice(0, 107) + '...' : commentText;
      comment.style.color = isDark ? '#f0efed' : '#1a1816';
      comment.style.fontFamily = FONT_STACK_SANS;
      comment.style.fontSize = '14px';
      comment.style.fontWeight = '500';
      comment.style.lineHeight = '1.3';

      const target = document.createElement('div');
      let targetText = note.target;
      if ((note.attachmentsCount ?? 0) > 0) {
        targetText += ` · ${note.attachmentsCount} image${note.attachmentsCount === 1 ? '' : 's'}`;
      }
      target.textContent = targetText;
      target.style.marginTop = '4px';
      target.style.color = isDark ? '#8a8884' : '#9c9894';
      target.style.fontFamily = FONT_STACK_MONO;
      target.style.fontSize = '10px';
      target.style.whiteSpace = 'nowrap';
      target.style.overflow = 'hidden';
      target.style.textOverflow = 'ellipsis';

      body.appendChild(comment);
      body.appendChild(target);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.title = 'Delete note';
      deleteBtn.setAttribute('aria-label', 'Delete note');
      deleteBtn.style.appearance = 'none';
      deleteBtn.style.display = 'inline-flex';
      deleteBtn.style.alignItems = 'center';
      deleteBtn.style.justifyContent = 'center';
      deleteBtn.style.width = '20px';
      deleteBtn.style.height = '20px';
      deleteBtn.style.padding = '0';
      deleteBtn.style.border = 'none';
      deleteBtn.style.background = 'transparent';
      deleteBtn.style.color = isDark ? '#8a8884' : '#9c9894';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.opacity = isHovered ? '0.6' : '0';
      deleteBtn.style.transition = 'opacity 80ms ease';
      deleteBtn.disabled = this.submitting;

      const icon = this.createTrashIcon();
      deleteBtn.appendChild(icon);

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onDelete(note.id);
      });

      const deleteBtnDefaultColor = isDark ? '#8a8884' : '#9c9894';
      const deleteBtnHoverColor = isDark ? '#f07070' : '#c94a4a';

      deleteBtn.addEventListener('mouseenter', () => {
        deleteBtn.style.color = deleteBtnHoverColor;
        deleteBtn.style.opacity = '1';
      });

      deleteBtn.addEventListener('mouseleave', () => {
        deleteBtn.style.color = deleteBtnDefaultColor;
        if (!row.matches(':hover')) {
          deleteBtn.style.opacity = '0';
        } else {
          deleteBtn.style.opacity = '0.6';
        }
      });

      row.addEventListener('mouseenter', () => {
        if (this.submitting) return;
        row.style.background = isDark ? 'rgba(240, 239, 237, 0.06)' : 'rgba(26, 24, 22, 0.05)';
        deleteBtn.style.opacity = '0.6';
        this.callbacks.onHover(note.id);
      });

      row.addEventListener('mouseleave', () => {
        row.style.background = 'transparent';
        deleteBtn.style.opacity = '0';
        this.callbacks.onHover(null);
      });

      row.addEventListener('click', () => {
        if (this.submitting) return;
        this.callbacks.onEdit(note.id);
      });

      row.appendChild(indexChip);
      row.appendChild(body);
      row.appendChild(deleteBtn);

      this.listEl!.appendChild(row);
    });

    if (newIds.size > 0) {
      requestAnimationFrame(() => {
        this.listEl?.scrollTo({ top: this.listEl.scrollHeight, behavior: 'smooth' });
      });
    }

    this.renderSettings();
  }

  private updateRowHighlights(prevId: string | null, newId: string | null): void {
    if (!this.listEl) return;
    const mode = getNotivThemeMode();
    const isDark = mode === 'dark';
    const hoverBg = isDark ? 'rgba(240, 239, 237, 0.06)' : 'rgba(26, 24, 22, 0.05)';

    if (prevId) {
      const prevRow = this.listEl.querySelector(`[data-note-id="${prevId}"]`) as HTMLElement | null;
      if (prevRow && !prevRow.matches(':hover')) {
        prevRow.style.background = 'transparent';
        const deleteBtn = prevRow.querySelector('button') as HTMLButtonElement | null;
        if (deleteBtn) deleteBtn.style.opacity = '0';
      }
    }

    if (newId) {
      const newRow = this.listEl.querySelector(`[data-note-id="${newId}"]`) as HTMLElement | null;
      if (newRow) {
        newRow.style.background = hoverBg;
        const deleteBtn = newRow.querySelector('button') as HTMLButtonElement | null;
        if (deleteBtn) deleteBtn.style.opacity = '0.6';
      }
    }
  }

  private renderSettings(): void {
    if (!this.settingsEl || !this.shadowRoot) return;

    this.shadowRoot.querySelectorAll('.notiv-unified-dropdown').forEach((el) => el.remove());
    this.settingsEl.innerHTML = '';

    const bar = document.createElement('div');
    bar.className = 'notiv-unified-settings-bar';
    if (this.takeoverMode) {
      bar.classList.add('selecting', `selecting-${this.takeoverMode}`);
    }

    const resting = document.createElement('div');
    resting.className = 'notiv-unified-bar-resting';

    const priorityBtn = document.createElement('button');
    priorityBtn.type = 'button';
    priorityBtn.className = 'notiv-unified-inline-btn takeover-trigger';
    priorityBtn.appendChild(this.createPriorityIcon(this.settings.priority));
    priorityBtn.innerHTML += this.createChevronHtml();

    priorityBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeAllDropdowns();
      this.takeoverMode = 'priority';
      this.renderSettings();
    });
    resting.appendChild(priorityBtn);

    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    resting.appendChild(spacer);

    const teamAnchor = document.createElement('div');
    teamAnchor.className = 'notiv-unified-dropdown-anchor';

    const selectedTeam = this.resources.teams.find((t) => t.id === this.selectedTeamId) ?? this.resources.teams[0];
    const teamBtn = document.createElement('button');
    teamBtn.type = 'button';
    teamBtn.className = 'notiv-unified-inline-btn';
    if (this.teamDropdownOpen) teamBtn.classList.add('active');

    const teamArrow = document.createElement('span');
    teamArrow.className = 'notiv-unified-team-arrow';
    teamArrow.textContent = '→';
    teamBtn.appendChild(teamArrow);

    const teamKey = document.createElement('span');
    teamKey.className = 'notiv-unified-team-key';
    teamKey.textContent = selectedTeam?.key ?? 'Team';
    teamBtn.appendChild(teamKey);
    teamBtn.innerHTML += this.createChevronHtml();

    teamBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.takeoverMode = null;
      this.assigneeDropdownOpen = false;
      this.labelsDropdownOpen = false;
      this.teamDropdownOpen = !this.teamDropdownOpen;
      this.teamSearchQuery = '';
      this.renderSettings();
    });
    teamAnchor.appendChild(teamBtn);

    if (this.teamDropdownOpen) {
      const dropdown = this.createTeamDropdown();
      this.shadowRoot.appendChild(dropdown);
      requestAnimationFrame(() => this.positionDropdown(dropdown, teamBtn));
    }

    resting.appendChild(teamAnchor);

    const assigneeAnchor = document.createElement('div');
    assigneeAnchor.className = 'notiv-unified-dropdown-anchor';

    const selectedUser = this.resources.users.find((u) => u.id === this.settings.assigneeId);
    const assigneeBtn = document.createElement('button');
    assigneeBtn.type = 'button';
    assigneeBtn.className = 'notiv-unified-inline-btn';
    if (this.assigneeDropdownOpen) assigneeBtn.classList.add('active');

    if (selectedUser) {
      if (selectedUser.avatarUrl) {
        const avatar = document.createElement('img');
        avatar.className = 'notiv-unified-avatar';
        avatar.src = selectedUser.avatarUrl;
        avatar.alt = '';
        assigneeBtn.appendChild(avatar);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'notiv-unified-avatar-placeholder';
        placeholder.textContent = selectedUser.name.charAt(0).toUpperCase();
        assigneeBtn.appendChild(placeholder);
      }
    } else {
      assigneeBtn.appendChild(this.createUserIcon());
    }
    assigneeBtn.innerHTML += this.createChevronHtml();

    assigneeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.takeoverMode = null;
      this.teamDropdownOpen = false;
      this.labelsDropdownOpen = false;
      this.assigneeDropdownOpen = !this.assigneeDropdownOpen;
      this.assigneeSearchQuery = '';
      this.renderSettings();
    });
    assigneeAnchor.appendChild(assigneeBtn);

    if (this.assigneeDropdownOpen) {
      const dropdown = this.createAssigneeDropdown();
      this.shadowRoot.appendChild(dropdown);
      requestAnimationFrame(() => this.positionDropdown(dropdown, assigneeBtn));
    }

    resting.appendChild(assigneeAnchor);

    const labelsAnchor = document.createElement('div');
    labelsAnchor.className = 'notiv-unified-dropdown-anchor';

    const selectedLabels = this.settings.labelIds
      .map((id) => this.resources.labels.find((l) => l.id === id))
      .filter((l): l is LinearLabel => l !== undefined);

    const labelsBtn = document.createElement('button');
    labelsBtn.type = 'button';
    labelsBtn.className = 'notiv-unified-inline-btn';
    if (this.labelsDropdownOpen) labelsBtn.classList.add('active');

    if (selectedLabels.length > 0) {
      const chip = document.createElement('span');
      chip.className = 'notiv-unified-label-chip';
      const dot = document.createElement('span');
      dot.className = 'notiv-unified-label-dot';
      dot.style.background = selectedLabels[0].color;
      chip.appendChild(dot);
      const name = document.createElement('span');
      name.textContent = selectedLabels.length > 1 ? `${selectedLabels[0].name} +${selectedLabels.length - 1}` : selectedLabels[0].name;
      chip.appendChild(name);
      labelsBtn.appendChild(chip);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'notiv-unified-placeholder';
      placeholder.textContent = 'Labels';
      labelsBtn.appendChild(placeholder);
    }
    labelsBtn.innerHTML += this.createChevronHtml();

    labelsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.takeoverMode = null;
      this.teamDropdownOpen = false;
      this.assigneeDropdownOpen = false;
      this.labelsDropdownOpen = !this.labelsDropdownOpen;
      this.labelsSearchQuery = '';
      this.renderSettings();
    });
    labelsAnchor.appendChild(labelsBtn);

    if (this.labelsDropdownOpen) {
      const dropdown = this.createLabelsDropdown();
      this.shadowRoot.appendChild(dropdown);
      requestAnimationFrame(() => this.positionDropdown(dropdown, labelsBtn));
    }

    resting.appendChild(labelsAnchor);

    bar.appendChild(resting);
    bar.appendChild(this.createPriorityTakeover());

    this.settingsEl.appendChild(bar);
  }

  private createTeamDropdown(): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'notiv-unified-dropdown';

    const searchRow = document.createElement('div');
    searchRow.className = 'notiv-unified-dropdown-search';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'notiv-unified-dropdown-input';
    searchInput.placeholder = 'Search teams...';
    searchInput.value = this.teamSearchQuery;

    const listEl = document.createElement('div');
    listEl.className = 'notiv-unified-dropdown-list';

    searchInput.addEventListener('input', () => {
      this.teamSearchQuery = searchInput.value;
      this.renderTeamList(listEl);
    });

    searchRow.appendChild(searchInput);
    dropdown.appendChild(searchRow);
    this.renderTeamList(listEl);
    dropdown.appendChild(listEl);

    setTimeout(() => searchInput.focus(), 0);
    return dropdown;
  }

  private renderTeamList(listEl: HTMLDivElement): void {
    listEl.innerHTML = '';
    const query = this.teamSearchQuery.toLowerCase();
    const filtered = this.resources.teams
      .filter((t) => t.key.toLowerCase().includes(query) || t.name.toLowerCase().includes(query))
      .sort((a, b) => a.key.localeCompare(b.key));

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notiv-unified-dropdown-empty';
      empty.textContent = 'No teams found';
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach((team) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'notiv-unified-dropdown-item';
      if (this.selectedTeamId === team.id) item.classList.add('selected');

      const name = document.createElement('span');
      name.className = 'notiv-unified-dropdown-name';
      name.textContent = team.name;
      item.appendChild(name);

      const key = document.createElement('span');
      key.className = 'notiv-unified-dropdown-team-key';
      key.textContent = team.key;
      item.appendChild(key);

      if (this.selectedTeamId === team.id) {
        item.innerHTML += `<svg class="notiv-unified-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`;
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedTeamId = team.id;
        this.teamDropdownOpen = false;
        void this.saveSettings();
        this.renderSettings();
      });

      listEl.appendChild(item);
    });
  }

  private createPriorityTakeover(): HTMLDivElement {
    const takeover = document.createElement('div');
    takeover.className = 'notiv-unified-bar-takeover';
    takeover.dataset.mode = 'priority';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'notiv-unified-takeover-cancel';
    cancelBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.takeoverMode = null;
      this.renderSettings();
    });
    takeover.appendChild(cancelBtn);

    const options = document.createElement('div');
    options.className = 'notiv-unified-takeover-options';

    const priorities = [
      { value: null, label: 'No priority' },
      { value: 1, label: 'Urgent' },
      { value: 2, label: 'High' },
      { value: 3, label: 'Medium' },
      { value: 4, label: 'Low' }
    ];

    priorities.forEach((p) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'notiv-unified-takeover-chip priority-chip';
      chip.title = p.label;
      if (this.settings.priority === p.value) chip.classList.add('selected');
      chip.appendChild(this.createPriorityIcon(p.value));

      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        chip.classList.add('selecting');
        setTimeout(() => {
          this.settings.priority = p.value;
          void this.saveSettings();
          this.takeoverMode = null;
          this.renderSettings();
        }, 80);
      });

      options.appendChild(chip);
    });

    takeover.appendChild(options);
    return takeover;
  }

  private createAssigneeDropdown(): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'notiv-unified-dropdown';

    const searchRow = document.createElement('div');
    searchRow.className = 'notiv-unified-dropdown-search';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'notiv-unified-dropdown-input';
    searchInput.placeholder = 'Assign to...';
    searchInput.value = this.assigneeSearchQuery;

    const listEl = document.createElement('div');
    listEl.className = 'notiv-unified-dropdown-list';

    searchInput.addEventListener('input', () => {
      this.assigneeSearchQuery = searchInput.value;
      this.renderAssigneeList(listEl);
    });

    searchRow.appendChild(searchInput);
    dropdown.appendChild(searchRow);
    this.renderAssigneeList(listEl);
    dropdown.appendChild(listEl);

    setTimeout(() => searchInput.focus(), 0);
    return dropdown;
  }

  private renderAssigneeList(listEl: HTMLDivElement): void {
    listEl.innerHTML = '';
    const query = this.assigneeSearchQuery.toLowerCase();
    const filtered = this.resources.users.filter((u) => u.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notiv-unified-dropdown-empty';
      empty.textContent = 'No members found';
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach((user) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'notiv-unified-dropdown-item';
      if (this.settings.assigneeId === user.id) item.classList.add('selected');

      if (user.avatarUrl) {
        const avatar = document.createElement('img');
        avatar.className = 'notiv-unified-dropdown-avatar';
        avatar.src = user.avatarUrl;
        item.appendChild(avatar);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'notiv-unified-dropdown-avatar-placeholder';
        placeholder.textContent = user.name.charAt(0).toUpperCase();
        item.appendChild(placeholder);
      }

      const name = document.createElement('span');
      name.className = 'notiv-unified-dropdown-name';
      name.textContent = user.name;
      item.appendChild(name);

      if (this.settings.assigneeId === user.id) {
        item.innerHTML += `<svg class="notiv-unified-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`;
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.settings.assigneeId = user.id;
        this.assigneeDropdownOpen = false;
        void this.saveSettings();
        this.renderSettings();
      });

      listEl.appendChild(item);
    });
  }

  private createLabelsDropdown(): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'notiv-unified-dropdown';

    const searchRow = document.createElement('div');
    searchRow.className = 'notiv-unified-dropdown-search';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'notiv-unified-dropdown-input';
    searchInput.placeholder = 'Add or change labels...';
    searchInput.value = this.labelsSearchQuery;

    const listEl = document.createElement('div');
    listEl.className = 'notiv-unified-dropdown-list';

    searchInput.addEventListener('input', () => {
      this.labelsSearchQuery = searchInput.value;
      this.renderLabelsList(listEl);
    });

    searchRow.appendChild(searchInput);
    dropdown.appendChild(searchRow);
    this.renderLabelsList(listEl);
    dropdown.appendChild(listEl);

    setTimeout(() => searchInput.focus(), 0);
    return dropdown;
  }

  private renderLabelsList(listEl: HTMLDivElement): void {
    listEl.innerHTML = '';
    const query = this.labelsSearchQuery.toLowerCase();
    const filtered = this.resources.labels.filter((l) => l.name.toLowerCase().includes(query));

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notiv-unified-dropdown-empty';
      empty.textContent = 'No labels found';
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach((label) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'notiv-unified-dropdown-item';
      const isSelected = this.settings.labelIds.includes(label.id);
      if (isSelected) item.classList.add('selected');

      const dot = document.createElement('span');
      dot.className = 'notiv-unified-dropdown-dot';
      dot.style.background = label.color;
      item.appendChild(dot);

      const name = document.createElement('span');
      name.className = 'notiv-unified-dropdown-name';
      name.textContent = label.name;
      item.appendChild(name);

      if (isSelected) {
        item.innerHTML += `<svg class="notiv-unified-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`;
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSelected) {
          this.settings.labelIds = this.settings.labelIds.filter((id) => id !== label.id);
        } else {
          this.settings.labelIds = [...this.settings.labelIds, label.id];
        }
        void this.saveSettings();
        this.renderLabelsList(listEl);
        this.renderSettings();
      });

      listEl.appendChild(item);
    });
  }

  private positionDropdown(dropdown: HTMLDivElement, trigger: HTMLElement): void {
    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = this.container?.getBoundingClientRect();
    const dropdownHeight = 220;
    const gap = 6;
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;

    dropdown.style.position = 'fixed';
    dropdown.style.minWidth = '180px';
    dropdown.style.maxWidth = '220px';

    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      dropdown.style.top = `${triggerRect.bottom + gap}px`;
      dropdown.style.bottom = 'auto';
    } else {
      dropdown.style.bottom = `${window.innerHeight - triggerRect.top + gap}px`;
      dropdown.style.top = 'auto';
      dropdown.classList.add('flip-up');
    }

    const panelRight = containerRect ? window.innerWidth - containerRect.right : 20;
    dropdown.style.right = `${panelRight}px`;
    dropdown.style.left = 'auto';
  }

  private closeAllDropdowns(): void {
    this.teamDropdownOpen = false;
    this.assigneeDropdownOpen = false;
    this.labelsDropdownOpen = false;
  }

  private createChevronHtml(): string {
    return `<svg class="notiv-unified-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
  }

  private createPriorityIcon(priority: number | null): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 16 16');

    if (priority === 1) {
      svg.setAttribute('fill', 'none');
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '1');
      rect.setAttribute('y', '1');
      rect.setAttribute('width', '14');
      rect.setAttribute('height', '14');
      rect.setAttribute('rx', '3');
      rect.setAttribute('fill', '#f76b6b');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      line.setAttribute('d', 'M8 4v5');
      line.setAttribute('stroke', 'white');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-linecap', 'round');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', '8');
      dot.setAttribute('cy', '11.5');
      dot.setAttribute('r', '1');
      dot.setAttribute('fill', 'white');
      svg.appendChild(rect);
      svg.appendChild(line);
      svg.appendChild(dot);
    } else if (priority === 2 || priority === 3 || priority === 4) {
      svg.setAttribute('fill', 'currentColor');
      const filledBars = priority === 2 ? 3 : priority === 3 ? 2 : 1;
      const heights = [4, 7, 10];
      heights.forEach((height, i) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(2 + i * 4.5));
        rect.setAttribute('y', String(13 - height));
        rect.setAttribute('width', '3');
        rect.setAttribute('height', String(height));
        rect.setAttribute('rx', '1');
        rect.setAttribute('opacity', i < filledBars ? '1' : '0.25');
        svg.appendChild(rect);
      });
    } else {
      svg.setAttribute('fill', 'currentColor');
      [1, 6.5, 12].forEach((x) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', '7');
        rect.setAttribute('width', '3');
        rect.setAttribute('height', '2');
        rect.setAttribute('rx', '0.5');
        svg.appendChild(rect);
      });
    }

    return svg;
  }

  private createUserIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.innerHTML = '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>';
    return svg;
  }

  private createTrashIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14');
    svg.appendChild(path);

    return svg;
  }
}
