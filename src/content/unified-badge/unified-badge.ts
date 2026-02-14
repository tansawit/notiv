import styles from '../styles.css?inline';
import { UI_IDS, STORAGE_KEYS } from '../../shared/constants';
import { getNotisThemeMode } from '../theme-mode';
import type { LinearLabel } from '../../shared/types';
import { getHighlightColorPreset, resolveHighlightColor } from '../../shared/highlight-colors';
import { getLocalStorageItems, setLocalStorageItems } from '../../shared/chrome-storage';
import {
  createPriorityIcon,
  createUserIcon,
  createPlusIcon,
  createArrowRightIcon,
  createSettingsIcon,
  createEmptyStateIcon,
  createArcSpinnerIcon,
  createCheckIcon,
  createExternalLinkIcon,
  createErrorIcon,
  getChevronSvgHtml as createChevronHtml,
} from '../../shared/svg-builder';
import {
  type Stage,
  type QueueNoteSummary,
  type UnifiedBadgeCallbacks,
  type SubmissionSettings,
  type NotePosition,
  type UnifiedBadgeResources,
  BADGE_SIZE,
  QUEUE_WIDTH,
  SUCCESS_WIDTH,
  ERROR_WIDTH,
  HEADER_HEIGHT,
  SETTINGS_HEIGHT,
  ROW_HEIGHT,
  TIMING,
  EASING,
} from './unified-badge-types';
import {
  createSearchDropdownShell,
  focusElementNextFrame
} from './unified-badge-dropdown';
import { PRIORITY_OPTIONS, PRIORITY_SELECTION_DELAY_MS } from './unified-badge-settings';
import {
  renderUnifiedBadgeRows,
  updateUnifiedBadgeRowHighlight,
  animateRowDeletion,
} from './unified-badge-list';
import {
  renderAssigneeDropdownList,
  renderLabelsDropdownList,
  renderTeamDropdownList
} from './unified-badge-dropdown-lists';

export type {
  QueueNoteSummary,
  UnifiedBadgeCallbacks,
  SubmissionSettings,
  NotePosition,
  UnifiedBadgeResources,
} from './unified-badge-types';

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
  private introTooltip: HTMLDivElement | null = null;
  private introTooltipTimeout: ReturnType<typeof setTimeout> | null = null;
  private introTooltipShown = false;

  private stage: Stage = 'badge';
  private prevStage: Stage = 'badge';
  private items: QueueNoteSummary[] = [];
  private renderedItemIds: string[] = [];
  private hoveredId: string | null = null;
  private visible = false;
  private submitting = false;
  private animatedDeletionId: string | null = null;

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

  private clearPillTimeouts(): void {
    if (this.successPillTimeout) {
      clearTimeout(this.successPillTimeout);
      this.successPillTimeout = null;
    }
    if (this.errorPillTimeout) {
      clearTimeout(this.errorPillTimeout);
      this.errorPillTimeout = null;
    }
    if (this.introTooltipTimeout) {
      clearTimeout(this.introTooltipTimeout);
      this.introTooltipTimeout = null;
    }
  }

  private changeStage(newStage: Stage): void {
    this.prevStage = this.stage;
    this.stage = newStage;
    if (newStage !== 'queue') {
      this.closeAllDropdowns();
      this.takeoverMode = null;
    }
    this.render();
  }

  setItems(value: QueueNoteSummary[]): void {
    const newIds = value.map((item) => item.id);
    const itemsChanged =
      this.renderedItemIds.length !== newIds.length ||
      this.renderedItemIds.some((id, i) => id !== newIds[i]);
    this.items = value;

    if (this.animatedDeletionId && !newIds.includes(this.animatedDeletionId)) {
      this.animatedDeletionId = null;
      this.updateTitleAndButtons();
      this.updateBadgeCount();
      return;
    }

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
      this.container?.setAttribute('data-notis-capture-preserve', 'true');
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
    const rows = this.listEl.querySelectorAll('.notis-unified-row');
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

  showSuccessPill(issue?: { identifier?: string; url?: string; noteCount?: number }): void {
    if (this.successPillTimeout) {
      clearTimeout(this.successPillTimeout);
      this.successPillTimeout = null;
    }

    this.pendingIssueUrl = issue?.url ?? null;

    if (this.successContent) {
      const textEl = this.successContent.querySelector('.notis-unified-success-text');
      if (textEl) {
        const noteCount = issue?.noteCount ?? 0;
        const noteSuffix = noteCount > 1 ? ` with ${noteCount} notes` : '';
        textEl.textContent = issue?.identifier
          ? `${issue.identifier} created${noteSuffix}`
          : `Ticket created${noteSuffix}`;
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
      const textEl = this.errorContent.querySelector('.notis-unified-error-text');
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
    this.container?.removeAttribute('data-notis-capture-preserve');
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
      this.maybeShowIntroTooltip();
    }
    this.render();
  }

  private async maybeShowIntroTooltip(): Promise<void> {
    if (this.introTooltipShown) return;

    try {
      const data = await getLocalStorageItems<Record<string, unknown>>([
        STORAGE_KEYS.badgeIntroShown
      ]);
      if (data[STORAGE_KEYS.badgeIntroShown]) {
        this.introTooltipShown = true;
        return;
      }
    } catch {
      return;
    }

    this.introTooltipShown = true;
    await setLocalStorageItems({ [STORAGE_KEYS.badgeIntroShown]: true });

    if (!this.introTooltip) return;
    this.introTooltip.classList.add('visible');

    this.introTooltipTimeout = setTimeout(() => {
      this.hideIntroTooltip();
    }, 3500);
  }

  private hideIntroTooltip(): void {
    if (this.introTooltipTimeout) {
      clearTimeout(this.introTooltipTimeout);
      this.introTooltipTimeout = null;
    }
    if (this.introTooltip) {
      this.introTooltip.classList.remove('visible');
    }
  }

  destroy(): void {
    this.clearPillTimeouts();
    this.systemThemeQuery.removeEventListener('change', this.themeChangeHandler);
    window.removeEventListener('notis-theme-change', this.themeChangeHandler as EventListener);
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
    container.setAttribute('data-notis-ui', 'true');
    container.style.position = 'fixed';
    container.style.zIndex = '2147483649';
    container.style.right = '20px';
    container.style.bottom = '20px';
    container.setAttribute('data-notis-theme', getNotisThemeMode());

    const shadow = container.attachShadow({ mode: 'open' });
    const styleTag = document.createElement('style');
    styleTag.id = UI_IDS.styleTag;
    styleTag.textContent = styles;
    shadow.appendChild(styleTag);

    const backdrop = document.createElement('div');
    backdrop.className = 'notis-unified-backdrop';
    backdrop.addEventListener('click', () => {
      if (this.stage === 'queue') {
        this.changeStage('badge');
      }
    });
    shadow.appendChild(backdrop);
    this.backdrop = backdrop;

    const morphContainer = document.createElement('div');
    morphContainer.className = 'notis-unified-morph';
    morphContainer.setAttribute('data-stage', 'badge');

    this.buildBadgeContent(morphContainer);
    this.buildQueueContent(morphContainer);
    this.buildLoadingContent(morphContainer);
    this.buildSuccessContent(morphContainer);
    this.buildErrorContent(morphContainer);

    const tooltip = document.createElement('div');
    tooltip.className = 'notis-unified-tooltip';
    tooltip.textContent = 'Submitting to Linear...';
    morphContainer.appendChild(tooltip);
    this.tooltip = tooltip;

    const introTooltip = document.createElement('div');
    introTooltip.className = 'notis-unified-intro-tooltip';
    introTooltip.innerHTML = `
      <span>Click to annotate</span>
      <kbd>⌘⇧F</kbd>
    `;
    shadow.appendChild(introTooltip);
    this.introTooltip = introTooltip;

    shadow.appendChild(morphContainer);
    this.morphContainer = morphContainer;
    this.shadowRoot = shadow;

    document.documentElement.appendChild(container);
    this.systemThemeQuery.addEventListener('change', this.themeChangeHandler);
    window.addEventListener('notis-theme-change', this.themeChangeHandler as EventListener);

    this.container = container;
  }

  private buildBadgeContent(parent: HTMLElement): void {
    const content = document.createElement('div');
    content.className = 'notis-unified-content notis-unified-badge-content';

    const countEl = document.createElement('span');
    countEl.className = 'notis-unified-badge-count';
    countEl.textContent = '+';

    const emptyIcon = createPlusIcon(24);
    emptyIcon.setAttribute('class', 'notis-unified-badge-icon');

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
    content.className = 'notis-unified-content notis-unified-queue-content';
    content.addEventListener('click', (e) => e.stopPropagation());

    const header = document.createElement('div');
    header.className = 'notis-unified-header';

    const title = document.createElement('span');
    title.className = 'notis-unified-title';
    title.textContent = 'Notes';

    const actions = document.createElement('div');
    actions.className = 'notis-unified-actions';

    const settingsBtn = document.createElement('button');
    settingsBtn.type = 'button';
    settingsBtn.className = 'notis-unified-btn notis-unified-btn-icon';
    settingsBtn.title = 'Settings';
    settingsBtn.appendChild(createSettingsIcon(14));
    settingsBtn.addEventListener('click', () => this.callbacks.onOpenSettings());
    this.addButtonPressEffect(settingsBtn);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'notis-unified-btn notis-unified-btn-ghost';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => this.callbacks.onClear());
    this.addButtonPressEffect(clearBtn);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'notis-unified-btn notis-unified-btn-submit';
    submitBtn.title = 'Submit to Linear';
    submitBtn.appendChild(createArrowRightIcon(14));
    submitBtn.addEventListener('click', () => this.callbacks.onSubmit());
    this.addButtonPressEffect(submitBtn);

    actions.appendChild(settingsBtn);
    actions.appendChild(clearBtn);
    actions.appendChild(submitBtn);
    header.appendChild(title);
    header.appendChild(actions);

    const list = document.createElement('div');
    list.className = 'notis-unified-list';

    const empty = document.createElement('div');
    empty.className = 'notis-unified-empty';
    empty.style.display = 'none';

    const emptyIcon = createEmptyStateIcon(24);
    emptyIcon.setAttribute('class', 'notis-unified-empty-icon');

    const emptyText = document.createElement('div');
    emptyText.className = 'notis-unified-empty-text';
    emptyText.textContent = 'Ready when you are';

    const emptyHint = document.createElement('div');
    emptyHint.className = 'notis-unified-empty-hint';
    emptyHint.textContent = 'Highlight text or click anywhere to capture a thought';

    empty.appendChild(emptyIcon);
    empty.appendChild(emptyText);
    empty.appendChild(emptyHint);
    list.appendChild(empty);

    const settings = document.createElement('div');
    settings.className = 'notis-unified-settings';

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
    content.className = 'notis-unified-content notis-unified-loading-content';

    const spinner = createArcSpinnerIcon();
    spinner.setAttribute('class', 'notis-unified-spinner');

    content.appendChild(spinner);

    content.addEventListener('click', () => {
      this.showTooltip();
    });

    parent.appendChild(content);
    this.loadingContent = content;
  }

  private buildSuccessContent(parent: HTMLElement): void {
    const content = document.createElement('div');
    content.className = 'notis-unified-content notis-unified-success-content';

    const checkIcon = createCheckIcon(16);
    checkIcon.setAttribute('class', 'notis-unified-success-check');
    checkIcon.setAttribute('stroke-width', '2.5');

    const textEl = document.createElement('span');
    textEl.className = 'notis-unified-success-text';
    textEl.textContent = 'Ticket created';

    const arrowIcon = createExternalLinkIcon(14);
    arrowIcon.setAttribute('class', 'notis-unified-success-arrow');

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
    content.className = 'notis-unified-content notis-unified-error-content';

    const errorIcon = createErrorIcon(16);
    errorIcon.setAttribute('class', 'notis-unified-error-icon');
    errorIcon.setAttribute('stroke-width', '2.5');

    const textEl = document.createElement('span');
    textEl.className = 'notis-unified-error-text';
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
    this.container.setAttribute('data-notis-theme', getNotisThemeMode());
  }

  private getQueueHeight(): number {
    if (this.items.length === 0) {
      return this.getEmptyStateHeight();
    }
    const listPadding = 12;
    const bottomPadding = 4;
    return HEADER_HEIGHT + SETTINGS_HEIGHT + listPadding + this.items.length * ROW_HEIGHT + bottomPadding;
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

  private getTransitionTiming(): { duration: number; easing: string } {
    if (this.prefersReducedMotion) {
      return { duration: 0, easing: 'linear' };
    }

    if (this.stage === 'success' && this.prevStage === 'loading') {
      return { duration: TIMING.successExpand, easing: EASING.successSpring };
    }

    if (this.stage === 'queue') {
      return { duration: TIMING.expand, easing: EASING.expandMorph };
    }

    return { duration: TIMING.collapse, easing: EASING.collapseMorph };
  }


  private render(): void {
    if (!this.container || !this.morphContainer) return;

    this.container.style.display = this.visible ? 'block' : 'none';
    if (!this.visible) return;

    const isExpanding = this.stage === 'queue' && this.prevStage !== 'queue';
    const isCollapsing = this.prevStage === 'queue' && this.stage !== 'queue';

    if (isCollapsing) {
      this.animateQueueContentOut(() => {
        this.applyMorphTransition();
      });
    } else {
      this.applyMorphTransition();
      if (isExpanding) {
        this.animateQueueContentIn();
      }
      this.renderQueueContent();
    }

    this.updateBadgeCount();
  }

  private applyMorphTransition(): void {
    if (!this.morphContainer) return;

    const dims = this.getDimensions();
    const { duration, easing } = this.getTransitionTiming();

    const transitionStr = this.prefersReducedMotion
      ? 'none'
      : `width ${duration}ms ${easing}, height ${duration}ms ${easing}, border-radius ${duration}ms ${easing}, background-color ${duration}ms ease, border-color ${duration}ms ease, box-shadow ${duration}ms ease`;

    this.morphContainer.style.transition = transitionStr;
    this.morphContainer.style.width = `${dims.width}px`;
    this.morphContainer.style.height = `${dims.height}px`;
    this.morphContainer.style.borderRadius = `${dims.borderRadius}px`;
    this.morphContainer.setAttribute('data-stage', this.stage);

    if (this.backdrop) {
      this.backdrop.classList.toggle('visible', this.stage === 'queue');
    }

    this.badgeContent?.classList.toggle('active', this.stage === 'badge');
    this.queueContent?.classList.toggle('active', this.stage === 'queue');
    this.loadingContent?.classList.toggle('active', this.stage === 'loading');
    this.successContent?.classList.toggle('active', this.stage === 'success');
    this.errorContent?.classList.toggle('active', this.stage === 'error');
  }

  private updateBadgeCount(): void {
    if (!this.badgeContent) return;

    const countEl = this.badgeContent.querySelector('.notis-unified-badge-count') as HTMLElement;
    const iconEl = this.badgeContent.querySelector('.notis-unified-badge-icon') as HTMLElement;

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

    const header = this.queueContent.querySelector('.notis-unified-header') as HTMLElement;
    const settings = this.queueContent.querySelector('.notis-unified-settings') as HTMLElement;
    const empty = this.emptyEl;
    const rows = this.listEl?.querySelectorAll('.notis-unified-row');
    const { enter } = TIMING;

    if (header) {
      header.style.opacity = '0';
      header.style.transform = 'translateY(-8px)';
      setTimeout(() => {
        header.style.transition = `opacity ${enter.duration}ms ${EASING.contentIn}, transform ${enter.duration}ms ${EASING.contentIn}`;
        header.style.opacity = '1';
        header.style.transform = 'translateY(0)';
      }, enter.header);
    }

    if (this.items.length === 0 && empty) {
      empty.style.opacity = '0';
      empty.style.transform = 'scale(0.95)';
      setTimeout(() => {
        empty.style.transition = `opacity ${enter.duration}ms ${EASING.contentIn}, transform ${enter.duration}ms ${EASING.contentIn}`;
        empty.style.opacity = '1';
        empty.style.transform = 'scale(1)';
      }, enter.settings);
    }

    rows?.forEach((row, i) => {
      const el = row as HTMLElement;
      el.style.opacity = '0';
      el.style.transform = 'translateX(-12px)';
      setTimeout(() => {
        el.style.transition = `opacity ${enter.duration}ms ${EASING.contentIn}, transform ${enter.duration}ms ${EASING.contentIn}`;
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
      }, enter.rowsStart + i * enter.rowStagger);
    });

    if (settings && this.items.length > 0) {
      settings.style.opacity = '0';
      settings.style.transform = 'translateY(6px)';
      setTimeout(() => {
        settings.style.transition = `opacity ${enter.duration}ms ${EASING.contentIn}, transform ${enter.duration}ms ${EASING.contentIn}`;
        settings.style.opacity = '1';
        settings.style.transform = 'translateY(0)';
      }, enter.settings);
    }
  }

  private animateQueueContentOut(onComplete: () => void): void {
    if (!this.queueContent || this.prefersReducedMotion) {
      onComplete();
      return;
    }

    const header = this.queueContent.querySelector('.notis-unified-header') as HTMLElement;
    const settings = this.queueContent.querySelector('.notis-unified-settings') as HTMLElement;
    const empty = this.emptyEl;
    const rows = this.listEl?.querySelectorAll('.notis-unified-row');
    const { exit } = TIMING;

    const rowCount = rows?.length ?? 0;

    rows?.forEach((row, i) => {
      const el = row as HTMLElement;
      const reverseIndex = rowCount - 1 - i;
      setTimeout(() => {
        el.style.transition = `opacity ${exit.duration}ms ${EASING.contentOut}, transform ${exit.duration}ms ${EASING.contentOut}`;
        el.style.opacity = '0';
        el.style.transform = 'translateX(-8px) scale(0.97)';
      }, reverseIndex * exit.rowStagger);
    });

    if (settings && this.items.length > 0) {
      setTimeout(() => {
        settings.style.transition = `opacity ${exit.duration}ms ${EASING.contentOut}, transform ${exit.duration}ms ${EASING.contentOut}`;
        settings.style.opacity = '0';
        settings.style.transform = 'translateY(6px)';
      }, exit.settings);
    }

    if (empty && this.items.length === 0) {
      setTimeout(() => {
        empty.style.transition = `opacity ${exit.duration}ms ${EASING.contentOut}, transform ${exit.duration}ms ${EASING.contentOut}`;
        empty.style.opacity = '0';
        empty.style.transform = 'scale(0.95)';
      }, exit.settings);
    }

    if (header) {
      setTimeout(() => {
        header.style.transition = `opacity ${exit.duration}ms ${EASING.contentOut}, transform ${exit.duration}ms ${EASING.contentOut}`;
        header.style.opacity = '0';
        header.style.transform = 'translateY(-6px)';
      }, exit.header);
    }

    setTimeout(onComplete, TIMING.collapseDelay);
  }

  private renderQueueContent(): void {
    if (!this.listEl || !this.emptyEl) return;

    const mode = getNotisThemeMode();
    const isDark = mode === 'dark';

    this.updateTitleAndButtons();

    const currentIds = this.items.map((item) => item.id);
    const previousIds = new Set(this.renderedItemIds);
    const newIds = new Set(currentIds.filter((id) => !previousIds.has(id)));

    const existingRows = this.listEl.querySelectorAll('.notis-unified-row');
    existingRows.forEach((row) => row.remove());

    this.renderedItemIds = currentIds;

    renderUnifiedBadgeRows({
      listEl: this.listEl,
      items: this.items,
      hoveredId: this.hoveredId,
      newIds,
      submitting: this.submitting,
      isDark,
      onDelete: (id) => this.handleAnimatedDelete(id),
      onHover: this.callbacks.onHover,
      onEdit: this.callbacks.onEdit
    });

    if (newIds.size > 0 && this.stage === 'queue' && !this.prefersReducedMotion) {
      this.animateHeightForAddition(newIds.size);
      requestAnimationFrame(() => {
        this.listEl?.scrollTo({ top: this.listEl.scrollHeight, behavior: 'smooth' });
      });
    }

    this.renderSettings();
  }

  private updateRowHighlights(prevId: string | null, newId: string | null): void {
    if (!this.listEl) return;
    updateUnifiedBadgeRowHighlight(this.listEl, prevId, newId, getNotisThemeMode() === 'dark');
  }

  private handleAnimatedDelete(id: string): void {
    if (!this.listEl || this.prefersReducedMotion) {
      this.callbacks.onDelete(id);
      return;
    }

    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      this.callbacks.onDelete(id);
      return;
    }

    this.animatedDeletionId = id;
    const deletingToEmpty = this.items.length === 1;

    animateRowDeletion({
      listEl: this.listEl,
      deleteId: id,
      onComplete: () => {
        this.cleanupAfterDeletion(id);
        this.callbacks.onDelete(id);
      },
    });

    this.animateHeightForDeletion(deletingToEmpty);
  }

  private cleanupAfterDeletion(id: string): void {
    if (!this.listEl) return;

    const deletedRow = this.listEl.querySelector(`[data-note-id="${id}"]`);
    deletedRow?.remove();

    const remainingRows = this.listEl.querySelectorAll('.notis-unified-row') as NodeListOf<HTMLElement>;
    remainingRows.forEach((row, index) => {
      row.style.transition = 'none';
      row.style.transform = '';

      const indexChip = row.querySelector('div') as HTMLElement | null;
      if (indexChip) {
        indexChip.textContent = String(index + 1);
      }
    });

    this.renderedItemIds = this.renderedItemIds.filter((rid) => rid !== id);
  }

  private updateTitleAndButtons(): void {
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

    if (this.emptyEl) {
      this.emptyEl.style.display = this.items.length === 0 ? 'flex' : 'none';
    }

    if (this.settingsEl) {
      this.settingsEl.style.display = this.items.length === 0 ? 'none' : 'block';
    }
  }

  private animateHeightForDeletion(deletingToEmpty: boolean): void {
    if (!this.morphContainer || this.stage !== 'queue') return;

    const targetHeight = deletingToEmpty
      ? this.getEmptyStateHeight()
      : this.getQueueHeight() - ROW_HEIGHT;

    const duration = 200;
    const easing = 'cubic-bezier(0.32, 0.72, 0, 1)';

    this.morphContainer.style.transition = `height ${duration}ms ${easing}`;
    this.morphContainer.style.height = `${targetHeight}px`;
  }

  private getEmptyStateHeight(): number {
    const listPadding = 12;
    const emptyContentHeight = 96;
    return HEADER_HEIGHT + listPadding + emptyContentHeight;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private animateHeightForAddition(_addedCount: number): void {
    if (!this.morphContainer || this.stage !== 'queue') return;

    const currentComputedHeight = this.morphContainer.offsetHeight;
    const targetHeight = this.getQueueHeight();

    if (currentComputedHeight === targetHeight) return;

    const duration = 200;
    const easing = 'cubic-bezier(0.32, 0.72, 0, 1)';

    this.morphContainer.style.height = `${currentComputedHeight}px`;

    requestAnimationFrame(() => {
      if (!this.morphContainer) return;
      this.morphContainer.style.transition = `height ${duration}ms ${easing}`;
      this.morphContainer.style.height = `${targetHeight}px`;
    });
  }

  private renderSettings(): void {
    if (!this.settingsEl || !this.shadowRoot) return;

    this.shadowRoot.querySelectorAll('.notis-unified-dropdown').forEach((el) => el.remove());
    this.settingsEl.innerHTML = '';

    const bar = document.createElement('div');
    bar.className = 'notis-unified-settings-bar';
    if (this.takeoverMode) {
      bar.classList.add('selecting', `selecting-${this.takeoverMode}`);
    }

    const resting = document.createElement('div');
    resting.className = 'notis-unified-bar-resting';

    const priorityBtn = document.createElement('button');
    priorityBtn.type = 'button';
    priorityBtn.className = 'notis-unified-inline-btn takeover-trigger';
    priorityBtn.appendChild(createPriorityIcon(this.settings.priority));
    priorityBtn.insertAdjacentHTML('beforeend', createChevronHtml('notis-unified-chevron'));

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
    teamAnchor.className = 'notis-unified-dropdown-anchor';

    const selectedTeam = this.resources.teams.find((t) => t.id === this.selectedTeamId) ?? this.resources.teams[0];
    const teamBtn = document.createElement('button');
    teamBtn.type = 'button';
    teamBtn.className = 'notis-unified-inline-btn';
    if (this.teamDropdownOpen) teamBtn.classList.add('active');

    const teamArrow = document.createElement('span');
    teamArrow.className = 'notis-unified-team-arrow';
    teamArrow.textContent = '→';
    teamBtn.appendChild(teamArrow);

    const teamKey = document.createElement('span');
    teamKey.className = 'notis-unified-team-key';
    teamKey.textContent = selectedTeam?.key ?? 'Team';
    teamBtn.appendChild(teamKey);
    teamBtn.insertAdjacentHTML('beforeend', createChevronHtml('notis-unified-chevron'));

    teamBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTeamDropdown();
    });
    teamAnchor.appendChild(teamBtn);

    if (this.teamDropdownOpen) {
      const dropdown = this.createTeamDropdown();
      this.shadowRoot.appendChild(dropdown);
      requestAnimationFrame(() => this.positionDropdown(dropdown, teamBtn));
    }

    resting.appendChild(teamAnchor);

    const assigneeAnchor = document.createElement('div');
    assigneeAnchor.className = 'notis-unified-dropdown-anchor';

    const selectedUser = this.resources.users.find((u) => u.id === this.settings.assigneeId);
    const assigneeBtn = document.createElement('button');
    assigneeBtn.type = 'button';
    assigneeBtn.className = 'notis-unified-inline-btn';
    if (this.assigneeDropdownOpen) assigneeBtn.classList.add('active');

    if (selectedUser) {
      if (selectedUser.avatarUrl) {
        const avatar = document.createElement('img');
        avatar.className = 'notis-unified-avatar';
        avatar.src = selectedUser.avatarUrl;
        avatar.alt = '';
        assigneeBtn.appendChild(avatar);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'notis-unified-avatar-placeholder';
        placeholder.textContent = selectedUser.name.charAt(0).toUpperCase();
        assigneeBtn.appendChild(placeholder);
      }
    } else {
      assigneeBtn.appendChild(createUserIcon());
    }
    assigneeBtn.insertAdjacentHTML('beforeend', createChevronHtml('notis-unified-chevron'));

    assigneeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleAssigneeDropdown();
    });
    assigneeAnchor.appendChild(assigneeBtn);

    if (this.assigneeDropdownOpen) {
      const dropdown = this.createAssigneeDropdown();
      this.shadowRoot.appendChild(dropdown);
      requestAnimationFrame(() => this.positionDropdown(dropdown, assigneeBtn));
    }

    resting.appendChild(assigneeAnchor);

    const labelsAnchor = document.createElement('div');
    labelsAnchor.className = 'notis-unified-dropdown-anchor';

    const selectedLabels = this.settings.labelIds
      .map((id) => this.resources.labels.find((l) => l.id === id))
      .filter((l): l is LinearLabel => l !== undefined);

    const labelsBtn = document.createElement('button');
    labelsBtn.type = 'button';
    labelsBtn.className = 'notis-unified-inline-btn';
    if (this.labelsDropdownOpen) labelsBtn.classList.add('active');

    if (selectedLabels.length > 0) {
      const chip = document.createElement('span');
      chip.className = 'notis-unified-label-chip';
      const dot = document.createElement('span');
      dot.className = 'notis-unified-label-dot';
      dot.style.background = selectedLabels[0].color;
      chip.appendChild(dot);
      const name = document.createElement('span');
      name.textContent = selectedLabels.length > 1 ? `${selectedLabels[0].name} +${selectedLabels.length - 1}` : selectedLabels[0].name;
      chip.appendChild(name);
      labelsBtn.appendChild(chip);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'notis-unified-placeholder';
      placeholder.textContent = 'Labels';
      labelsBtn.appendChild(placeholder);
    }
    labelsBtn.insertAdjacentHTML('beforeend', createChevronHtml('notis-unified-chevron'));

    labelsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleLabelsDropdown();
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
    const { dropdown, searchInput, listEl } = createSearchDropdownShell('Search teams...', this.teamSearchQuery);

    searchInput.addEventListener('input', () => {
      this.teamSearchQuery = searchInput.value;
      this.renderTeamList(listEl);
    });

    this.renderTeamList(listEl);

    focusElementNextFrame(searchInput);
    return dropdown;
  }

  private toggleTeamDropdown(): void {
    this.takeoverMode = null;
    this.assigneeDropdownOpen = false;
    this.labelsDropdownOpen = false;
    this.teamDropdownOpen = !this.teamDropdownOpen;
    this.teamSearchQuery = '';
    this.renderSettings();
  }

  private toggleAssigneeDropdown(): void {
    this.takeoverMode = null;
    this.teamDropdownOpen = false;
    this.labelsDropdownOpen = false;
    this.assigneeDropdownOpen = !this.assigneeDropdownOpen;
    this.assigneeSearchQuery = '';
    this.renderSettings();
  }

  private toggleLabelsDropdown(): void {
    this.takeoverMode = null;
    this.teamDropdownOpen = false;
    this.assigneeDropdownOpen = false;
    this.labelsDropdownOpen = !this.labelsDropdownOpen;
    this.labelsSearchQuery = '';
    this.renderSettings();
  }

  private commitSettingsAndRender(): void {
    void this.saveSettings();
    this.renderSettings();
  }

  private renderTeamList(listEl: HTMLDivElement): void {
    renderTeamDropdownList({
      listEl,
      teams: this.resources.teams,
      selectedTeamId: this.selectedTeamId,
      query: this.teamSearchQuery,
      onSelect: (teamId) => {
        this.selectedTeamId = teamId;
        this.teamDropdownOpen = false;
        this.commitSettingsAndRender();
      }
    });
  }

  private createPriorityTakeover(): HTMLDivElement {
    const takeover = document.createElement('div');
    takeover.className = 'notis-unified-bar-takeover';
    takeover.dataset.mode = 'priority';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'notis-unified-takeover-cancel';
    cancelBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.takeoverMode = null;
      this.renderSettings();
    });
    takeover.appendChild(cancelBtn);

    const options = document.createElement('div');
    options.className = 'notis-unified-takeover-options';

    PRIORITY_OPTIONS.forEach((p) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'notis-unified-takeover-chip priority-chip';
      chip.title = p.label;
      if (this.settings.priority === p.value) chip.classList.add('selected');
      chip.appendChild(createPriorityIcon(p.value));

      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        chip.classList.add('selecting');
        setTimeout(() => {
          this.settings.priority = p.value;
          void this.saveSettings();
          this.takeoverMode = null;
          this.renderSettings();
        }, PRIORITY_SELECTION_DELAY_MS);
      });

      options.appendChild(chip);
    });

    takeover.appendChild(options);
    return takeover;
  }

  private createAssigneeDropdown(): HTMLDivElement {
    const { dropdown, searchInput, listEl } = createSearchDropdownShell('Assign to...', this.assigneeSearchQuery);

    searchInput.addEventListener('input', () => {
      this.assigneeSearchQuery = searchInput.value;
      this.renderAssigneeList(listEl);
    });

    this.renderAssigneeList(listEl);

    focusElementNextFrame(searchInput);
    return dropdown;
  }

  private renderAssigneeList(listEl: HTMLDivElement): void {
    renderAssigneeDropdownList({
      listEl,
      users: this.resources.users,
      selectedAssigneeId: this.settings.assigneeId,
      query: this.assigneeSearchQuery,
      onSelect: (assigneeId) => {
        this.settings.assigneeId = assigneeId;
        this.assigneeDropdownOpen = false;
        this.commitSettingsAndRender();
      }
    });
  }

  private createLabelsDropdown(): HTMLDivElement {
    const { dropdown, searchInput, listEl } = createSearchDropdownShell(
      'Add or change labels...',
      this.labelsSearchQuery
    );

    searchInput.addEventListener('input', () => {
      this.labelsSearchQuery = searchInput.value;
      this.renderLabelsList(listEl);
    });

    this.renderLabelsList(listEl);

    focusElementNextFrame(searchInput);
    return dropdown;
  }

  private renderLabelsList(listEl: HTMLDivElement): void {
    renderLabelsDropdownList({
      listEl,
      labels: this.resources.labels,
      selectedLabelIds: this.settings.labelIds,
      query: this.labelsSearchQuery,
      onToggle: (labelId) => {
        if (this.settings.labelIds.includes(labelId)) {
          this.settings.labelIds = this.settings.labelIds.filter((id) => id !== labelId);
        } else {
          this.settings.labelIds = [...this.settings.labelIds, labelId];
        }
        void this.saveSettings();
        this.renderLabelsList(listEl);
        this.renderSettings();
      }
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

}
