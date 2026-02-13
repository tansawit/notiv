import styles from './styles.css?inline';
import { UI_IDS, STORAGE_KEYS } from '../shared/constants';
import { getNotivThemeMode } from './theme-mode';
import type { HighlightColor, LinearLabel, LinearTeam, LinearUser } from '../shared/types';
import { getHighlightColorPreset, resolveHighlightColor } from '../shared/highlight-colors';
import { FONT_STACK_MONO, FONT_STACK_SANS } from '../shared/visual-tokens';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';

export interface QueueNoteSummary {
  id: string;
  comment: string;
  target: string;
  attachmentsCount?: number;
  highlightColor: HighlightColor;
}

export interface QueuePanelCallbacks {
  onSubmit: () => void;
  onClear: () => void;
  onDelete: (id: string) => void;
  onHover: (id: string | null) => void;
  onEdit: (id: string) => void;
}

export interface NotePosition {
  x: number;
  y: number;
  color: string;
}

export interface SubmissionSettings {
  priority: number | null;
  labelIds: string[];
  assigneeId: string | null;
}

export interface QueuePanelResources {
  teams: LinearTeam[];
  labels: LinearLabel[];
  users: LinearUser[];
}

export class QueuePanel {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private listEl: HTMLDivElement | null = null;
  private emptyEl: HTMLDivElement | null = null;
  private titleEl: HTMLSpanElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;
  private settingsEl: HTMLDivElement | null = null;
  private labelsBtnEl: HTMLButtonElement | null = null;
  private items: QueueNoteSummary[] = [];
  private renderedItemIds: string[] = [];
  private hoveredId: string | null = null;
  private visible = false;
  private submitting = false;
  private labelsDropdownOpen = false;
  private assigneeDropdownOpen = false;
  private priorityDropdownOpen = false;
  private labelsSearchQuery = '';
  private assigneeSearchQuery = '';
  private teamSearchQuery = '';
  private teamDropdownOpen = false;
  private resources: QueuePanelResources = { teams: [], labels: [], users: [] };
  private settings: SubmissionSettings = { priority: null, labelIds: [], assigneeId: null };
  private selectedTeamId: string | null = null;
  private settingsExpanded = false;
  private settingsJustExpanded = false;
  private readonly systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly themeChangeHandler = (): void => {
    this.applyThemeMode();
  };

  constructor(private readonly callbacks: QueuePanelCallbacks) {
    void this.loadSettings();
  }

  setItems(value: QueueNoteSummary[]): void {
    const newIds = value.map((item) => item.id);
    const itemsChanged =
      this.renderedItemIds.length !== newIds.length ||
      this.renderedItemIds.some((id, i) => id !== newIds[i]);
    this.items = value;
    if (itemsChanged) {
      this.render();
    }
  }

  setHoveredId(id: string | null): void {
    const prevId = this.hoveredId;
    this.hoveredId = id;
    this.updateRowHighlights(prevId, id);
  }

  setSubmitting(value: boolean): void {
    this.submitting = value;
    this.render();
  }

  setResources(resources: QueuePanelResources): void {
    this.resources = resources;
    this.renderSettings();
  }

  getSettings(): SubmissionSettings {
    return { ...this.settings };
  }

  getNotePositions(): NotePosition[] {
    if (!this.listEl) return [];
    const positions: NotePosition[] = [];
    const rows = this.listEl.querySelectorAll('.notiv-queue-row');
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

  setVisible(value: boolean): void {
    const wasVisible = this.visible;
    this.visible = value;
    if (value) {
      this.ensureMounted();
      if (!wasVisible && this.container) {
        const panel = this.container.shadowRoot?.querySelector('.notiv-queue-panel') as HTMLElement | null;
        if (panel) {
          panel.classList.add('entering');
          panel.addEventListener('animationend', () => {
            panel.classList.remove('entering');
          }, { once: true });
        }
      }
    }
    this.render();
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.systemThemeQuery.removeEventListener('change', this.themeChangeHandler);
    window.removeEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);
    this.container?.remove();
    this.container = null;
    this.listEl = null;
  }

  private ensureMounted(): void {
    if (this.container) return;

    const container = document.createElement('div');
    container.id = `${UI_IDS.rootContainer}-queue`;
    container.setAttribute('data-notiv-ui', 'true');
    container.style.position = 'fixed';
    container.style.zIndex = '2147483645';
    container.style.right = '20px';
    container.style.bottom = '68px';
    container.setAttribute('data-notiv-theme', getNotivThemeMode());

    const shadow = container.attachShadow({ mode: 'open' });
    const styleTag = document.createElement('style');
    styleTag.id = UI_IDS.styleTag;
    styleTag.textContent = styles;
    shadow.appendChild(styleTag);

    const panel = document.createElement('div');
    panel.className = 'notiv-queue-panel';
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    panel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.labelsDropdownOpen || this.assigneeDropdownOpen || this.teamDropdownOpen || this.priorityDropdownOpen) {
        const target = e.target as HTMLElement;
        const isDropdownClick = target.closest('.notiv-queue-dropdown') || target.closest('.notiv-queue-inline-btn');
        if (!isDropdownClick) {
          this.labelsDropdownOpen = false;
          this.assigneeDropdownOpen = false;
          this.teamDropdownOpen = false;
          this.priorityDropdownOpen = false;
          this.renderSettings();
        }
      }
    });

    const header = document.createElement('div');
    header.className = 'notiv-queue-panel-header';

    const title = document.createElement('span');
    title.className = 'notiv-queue-panel-title';
    title.textContent = 'Notes';

    const actions = document.createElement('div');
    actions.className = 'notiv-queue-panel-actions';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'notiv-queue-panel-btn ghost';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => this.callbacks.onClear());

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'notiv-queue-submit-btn';
    submitBtn.title = 'Submit to Linear';
    submitBtn.setAttribute('aria-label', 'Submit to Linear');
    const submitIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    submitIcon.setAttribute('width', '16');
    submitIcon.setAttribute('height', '16');
    submitIcon.setAttribute('viewBox', '0 0 24 24');
    submitIcon.setAttribute('fill', 'none');
    submitIcon.setAttribute('stroke', 'currentColor');
    submitIcon.setAttribute('stroke-width', '1.5');
    submitIcon.setAttribute('stroke-linecap', 'round');
    submitIcon.setAttribute('stroke-linejoin', 'round');
    const submitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    submitPath.setAttribute('d', 'M5 12h11M12 5l7 7-7 7');
    submitIcon.appendChild(submitPath);
    submitBtn.appendChild(submitIcon);
    submitBtn.addEventListener('click', () => this.callbacks.onSubmit());

    actions.appendChild(clearBtn);
    actions.appendChild(submitBtn);
    header.appendChild(title);
    header.appendChild(actions);

    const list = document.createElement('div');
    list.className = 'notiv-queue-panel-list';

    const empty = document.createElement('div');
    empty.className = 'notiv-queue-empty';
    empty.style.display = 'none';

    const emptyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    emptyIcon.setAttribute('class', 'notiv-queue-empty-icon');
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
    emptyText.className = 'notiv-queue-empty-text';
    emptyText.textContent = 'Ready when you are';

    const emptyHint = document.createElement('div');
    emptyHint.className = 'notiv-queue-empty-hint';
    emptyHint.textContent = 'Highlight text or click anywhere to capture a thought';

    empty.appendChild(emptyIcon);
    empty.appendChild(emptyText);
    empty.appendChild(emptyHint);

    list.appendChild(empty);

    const settings = document.createElement('div');
    settings.className = 'notiv-queue-settings';

    panel.appendChild(header);
    panel.appendChild(list);
    panel.appendChild(settings);
    shadow.appendChild(panel);

    document.documentElement.appendChild(container);
    this.systemThemeQuery.addEventListener('change', this.themeChangeHandler);
    window.addEventListener('notiv-theme-change', this.themeChangeHandler as EventListener);

    this.container = container;
    this.shadowRoot = shadow;
    this.listEl = list;
    this.emptyEl = empty;
    this.titleEl = title;
    this.submitBtn = submitBtn;
    this.clearBtn = clearBtn;
    this.settingsEl = settings;

    this.renderSettings();
  }

  private applyThemeMode(): void {
    if (!this.container) return;
    this.container.setAttribute('data-notiv-theme', getNotivThemeMode());
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

  private render(): void {
    if (!this.container) return;

    this.container.style.display = this.visible ? 'block' : 'none';
    if (!this.visible) return;

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
      this.submitBtn.classList.toggle('submitting', this.submitting);
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

    this.renderList();
  }

  private renderList(): void {
    if (!this.listEl || !this.emptyEl) return;

    const mode = getNotivThemeMode();
    const isDark = mode === 'dark';

    const currentIds = this.items.map((item) => item.id);
    const previousIds = new Set(this.renderedItemIds);
    const newIds = new Set(currentIds.filter((id) => !previousIds.has(id)));

    const existingRows = this.listEl.querySelectorAll('.notiv-queue-row');
    existingRows.forEach((row) => row.remove());

    this.renderedItemIds = currentIds;

    this.items.forEach((note, index) => {
      const colorPreset = getHighlightColorPreset(resolveHighlightColor(note.highlightColor));
      const isHovered = this.hoveredId === note.id;
      const isNew = newIds.has(note.id);

      const row = document.createElement('div');
      row.className = 'notiv-queue-row';
      if (isNew) row.classList.add('notiv-queue-row-new');
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

      deleteBtn.addEventListener('focus', () => {
        deleteBtn.style.opacity = '1';
        row.style.background = isDark ? 'rgba(240, 239, 237, 0.06)' : 'rgba(26, 24, 22, 0.05)';
      });

      deleteBtn.addEventListener('blur', () => {
        if (!row.matches(':hover')) {
          deleteBtn.style.opacity = '0';
          row.style.background = 'transparent';
        }
      });

      row.addEventListener('mouseenter', () => {
        if (this.submitting) return;
        row.style.background = isDark ? 'rgba(240, 239, 237, 0.06)' : 'rgba(26, 24, 22, 0.05)';
        deleteBtn.style.opacity = '0.6';
        this.callbacks.onHover(note.id);
      });

      row.addEventListener('mouseleave', () => {
        if (document.activeElement !== deleteBtn) {
          row.style.background = 'transparent';
          deleteBtn.style.opacity = '0';
        }
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
  }

  private renderSettings(): void {
    if (!this.settingsEl) return;

    if (this.shadowRoot) {
      this.shadowRoot.querySelectorAll('.notiv-queue-dropdown').forEach((el) => el.remove());
    }

    this.settingsEl.innerHTML = '';

    const bar = document.createElement('div');
    bar.className = 'notiv-queue-settings-bar';

    const optionsBtn = document.createElement('button');
    optionsBtn.type = 'button';
    optionsBtn.className = 'notiv-queue-options-toggle';
    optionsBtn.textContent = this.settingsExpanded ? 'Less' : 'Options';

    const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chevron.setAttribute('width', '10');
    chevron.setAttribute('height', '10');
    chevron.setAttribute('viewBox', '0 0 24 24');
    chevron.setAttribute('fill', 'none');
    chevron.setAttribute('stroke', 'currentColor');
    chevron.setAttribute('stroke-width', '2.5');
    chevron.setAttribute('stroke-linecap', 'round');
    chevron.setAttribute('stroke-linejoin', 'round');
    chevron.innerHTML = this.settingsExpanded ? '<path d="M15 18l-6-6 6-6"/>' : '<path d="M9 18l6-6-6-6"/>';
    optionsBtn.appendChild(chevron);

    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasExpanded = this.settingsExpanded;
      this.settingsExpanded = !this.settingsExpanded;
      this.settingsJustExpanded = !wasExpanded && this.settingsExpanded;
      this.priorityDropdownOpen = false;
      this.labelsDropdownOpen = false;
      this.assigneeDropdownOpen = false;
      void this.saveSettings();
      this.renderSettings();
    });
    bar.appendChild(optionsBtn);

    if (this.settingsExpanded) {
      const shouldAnimate = this.settingsJustExpanded;
      this.settingsJustExpanded = false;

      const expandableGroup = document.createElement('div');
      expandableGroup.className = 'notiv-queue-expandable-group';

      const priorityBtn = document.createElement('button');
      priorityBtn.type = 'button';
      priorityBtn.className = 'notiv-queue-inline-btn notiv-queue-expandable-item';
      if (shouldAnimate) priorityBtn.classList.add('animate-in');
      if (this.priorityDropdownOpen) priorityBtn.classList.add('active');

      const currentPriorityIcon = this.settings.priority === 1
        ? this.createUrgentIcon()
        : this.settings.priority === 2
          ? this.createPriorityBarsIcon(3)
          : this.settings.priority === 3
            ? this.createPriorityBarsIcon(2)
            : this.settings.priority === 4
              ? this.createPriorityBarsIcon(1)
              : this.createNoPriorityIcon();
      priorityBtn.appendChild(currentPriorityIcon);
      priorityBtn.innerHTML += this.createDropdownChevronHtml();
      priorityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.priorityDropdownOpen = !this.priorityDropdownOpen;
        this.teamDropdownOpen = false;
        this.labelsDropdownOpen = false;
        this.assigneeDropdownOpen = false;
        this.renderSettings();
      });
      expandableGroup.appendChild(priorityBtn);

      if (this.priorityDropdownOpen && this.shadowRoot) {
        const dropdown = this.createPriorityDropdown();
        this.shadowRoot.appendChild(dropdown);
        requestAnimationFrame(() => this.positionDropdown(dropdown, priorityBtn));
      }

      const selectedUser = this.resources.users.find((u) => u.id === this.settings.assigneeId);
      const assigneeBtn = document.createElement('button');
      assigneeBtn.type = 'button';
      assigneeBtn.className = 'notiv-queue-inline-btn notiv-queue-inline-assignee notiv-queue-expandable-item';
      if (shouldAnimate) assigneeBtn.classList.add('animate-in');
      if (this.assigneeDropdownOpen) assigneeBtn.classList.add('active');

      if (selectedUser) {
        if (selectedUser.avatarUrl) {
          const avatar = document.createElement('img');
          avatar.className = 'notiv-queue-inline-avatar';
          avatar.src = selectedUser.avatarUrl;
          avatar.alt = '';
          assigneeBtn.appendChild(avatar);
        } else {
          const placeholder = document.createElement('span');
          placeholder.className = 'notiv-queue-inline-avatar-placeholder';
          placeholder.textContent = selectedUser.name.charAt(0).toUpperCase();
          assigneeBtn.appendChild(placeholder);
        }
      } else {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('width', '14');
        icon.setAttribute('height', '14');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '1.5');
        icon.innerHTML = '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>';
        assigneeBtn.appendChild(icon);
      }
      assigneeBtn.innerHTML += this.createDropdownChevronHtml();
      assigneeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.assigneeDropdownOpen = !this.assigneeDropdownOpen;
        this.priorityDropdownOpen = false;
        this.labelsDropdownOpen = false;
        this.teamDropdownOpen = false;
        this.assigneeSearchQuery = '';
        this.renderSettings();
      });
      expandableGroup.appendChild(assigneeBtn);

      if (this.assigneeDropdownOpen && this.shadowRoot) {
        const dropdown = this.createAssigneeDropdown();
        this.shadowRoot.appendChild(dropdown);
        requestAnimationFrame(() => this.positionDropdown(dropdown, assigneeBtn));
      }

      const selectedLabels = this.settings.labelIds
        .map((id) => this.resources.labels.find((l) => l.id === id))
        .filter((l): l is LinearLabel => l !== undefined);

      const labelsBtn = document.createElement('button');
      labelsBtn.type = 'button';
      labelsBtn.className = 'notiv-queue-inline-btn notiv-queue-inline-labels notiv-queue-expandable-item';
      if (shouldAnimate) labelsBtn.classList.add('animate-in');
      if (this.labelsDropdownOpen) labelsBtn.classList.add('active');

      if (selectedLabels.length > 0) {
        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'notiv-queue-inline-labels-chips';

        const maxVisible = 1;
        const visibleLabels = selectedLabels.slice(0, maxVisible);
        const overflowCount = selectedLabels.length - maxVisible;

        visibleLabels.forEach((label) => {
          const chip = document.createElement('span');
          chip.className = 'notiv-queue-inline-label-chip';

          const dot = document.createElement('span');
          dot.className = 'notiv-queue-inline-label-dot';
          dot.style.background = label.color;

          const name = document.createElement('span');
          name.textContent = label.name;

          chip.appendChild(dot);
          chip.appendChild(name);
          chipsContainer.appendChild(chip);
        });

        if (overflowCount > 0) {
          const overflow = document.createElement('span');
          overflow.className = 'notiv-queue-inline-labels-overflow';
          overflow.textContent = `+${overflowCount}`;
          chipsContainer.appendChild(overflow);
        }

        labelsBtn.appendChild(chipsContainer);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'notiv-queue-inline-placeholder';
        placeholder.textContent = 'Labels';
        labelsBtn.appendChild(placeholder);
      }
      labelsBtn.innerHTML += this.createDropdownChevronHtml();
      labelsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.labelsDropdownOpen = !this.labelsDropdownOpen;
        this.priorityDropdownOpen = false;
        this.assigneeDropdownOpen = false;
        this.teamDropdownOpen = false;
        this.labelsSearchQuery = '';
        this.renderSettings();
      });
      expandableGroup.appendChild(labelsBtn);
      this.labelsBtnEl = labelsBtn;

      if (this.labelsDropdownOpen && this.shadowRoot) {
        const dropdown = this.createLabelsDropdown();
        this.shadowRoot.appendChild(dropdown);
        requestAnimationFrame(() => this.positionDropdown(dropdown, labelsBtn));
      }

      bar.appendChild(expandableGroup);
    }

    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    bar.appendChild(spacer);

    const selectedTeam = this.resources.teams.find((t) => t.id === this.selectedTeamId) ?? this.resources.teams[0];
    const teamBtn = document.createElement('button');
    teamBtn.type = 'button';
    teamBtn.className = 'notiv-queue-inline-btn notiv-queue-team-collapsed';
    if (this.teamDropdownOpen) teamBtn.classList.add('active');

    const teamArrow = document.createElement('span');
    teamArrow.className = 'notiv-queue-inline-team-arrow';
    teamArrow.textContent = '→';
    teamBtn.appendChild(teamArrow);

    const teamKey = document.createElement('span');
    teamKey.className = 'notiv-queue-inline-team-key';
    teamKey.textContent = selectedTeam?.key ?? 'Team';
    teamBtn.appendChild(teamKey);

    teamBtn.innerHTML += this.createDropdownChevronHtml();
    teamBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.teamDropdownOpen = !this.teamDropdownOpen;
      this.priorityDropdownOpen = false;
      this.labelsDropdownOpen = false;
      this.assigneeDropdownOpen = false;
      this.teamSearchQuery = '';
      this.renderSettings();
    });
    bar.appendChild(teamBtn);

    if (this.teamDropdownOpen && this.shadowRoot) {
      const dropdown = this.createTeamDropdown();
      this.shadowRoot.appendChild(dropdown);
      requestAnimationFrame(() => this.positionDropdown(dropdown, teamBtn));
    }

    this.settingsEl.appendChild(bar);
  }

  private createPriorityDropdown(): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'notiv-queue-dropdown notiv-queue-priority-dropdown';

    const listEl = document.createElement('div');
    listEl.className = 'notiv-queue-dropdown-list';

    const priorities = [
      { value: null, label: 'No priority', icon: this.createNoPriorityIcon() },
      { value: 1, label: 'Urgent', icon: this.createUrgentIcon() },
      { value: 2, label: 'High', icon: this.createPriorityBarsIcon(3) },
      { value: 3, label: 'Medium', icon: this.createPriorityBarsIcon(2) },
      { value: 4, label: 'Low', icon: this.createPriorityBarsIcon(1) }
    ];

    priorities.forEach(({ value, label, icon }) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'notiv-queue-dropdown-item';
      const isSelected = this.settings.priority === value;
      if (isSelected) item.classList.add('selected');

      item.appendChild(icon);

      const name = document.createElement('span');
      name.className = 'notiv-queue-dropdown-item-name';
      name.textContent = label;
      item.appendChild(name);

      if (isSelected) {
        const check = this.createCheckIcon();
        item.appendChild(check);
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.settings.priority = value;
        this.priorityDropdownOpen = false;
        void this.saveSettings();
        this.renderSettings();
      });

      listEl.appendChild(item);
    });

    dropdown.appendChild(listEl);
    return dropdown;
  }

  private createLabelsDropdown(): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'notiv-queue-dropdown';

    const searchRow = document.createElement('div');
    searchRow.className = 'notiv-queue-dropdown-search';

    const searchIcon = this.createSearchIcon();
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'notiv-queue-dropdown-search-input';
    searchInput.placeholder = 'Search labels...';
    searchInput.value = this.labelsSearchQuery;
    searchInput.addEventListener('input', () => {
      this.labelsSearchQuery = searchInput.value;
      this.renderLabelsDropdownList(listEl);
    });

    searchRow.appendChild(searchIcon);
    searchRow.appendChild(searchInput);
    dropdown.appendChild(searchRow);

    const listEl = document.createElement('div');
    listEl.className = 'notiv-queue-dropdown-list';
    this.renderLabelsDropdownList(listEl);
    dropdown.appendChild(listEl);

    setTimeout(() => searchInput.focus(), 0);

    return dropdown;
  }

  private renderLabelsDropdownList(listEl: HTMLDivElement): void {
    listEl.innerHTML = '';
    const query = this.labelsSearchQuery.toLowerCase();
    const filtered = this.resources.labels.filter((label) =>
      label.name.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notiv-queue-dropdown-empty';
      empty.textContent = 'No labels found';
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach((label) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'notiv-queue-dropdown-item';
      const isSelected = this.settings.labelIds.includes(label.id);
      if (isSelected) item.classList.add('selected');

      const dot = document.createElement('span');
      dot.className = 'notiv-queue-dropdown-item-dot';
      dot.style.background = label.color;

      const name = document.createElement('span');
      name.className = 'notiv-queue-dropdown-item-name';
      name.textContent = label.name;

      item.appendChild(dot);
      item.appendChild(name);

      if (isSelected) {
        const check = this.createCheckIcon();
        item.appendChild(check);
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isSelected) {
          this.settings.labelIds = this.settings.labelIds.filter((id) => id !== label.id);
        } else {
          this.settings.labelIds = [...this.settings.labelIds, label.id];
        }
        void this.saveSettings();
        this.renderLabelsDropdownList(listEl);
        this.updateLabelsBtnContent();
      });

      listEl.appendChild(item);
    });
  }

  private updateLabelsBtnContent(): void {
    if (!this.labelsBtnEl) return;

    const selectedLabels = this.settings.labelIds
      .map((id) => this.resources.labels.find((l) => l.id === id))
      .filter((l): l is LinearLabel => l !== undefined);

    const chevron = this.labelsBtnEl.querySelector('.notiv-queue-dropdown-chevron');
    this.labelsBtnEl.innerHTML = '';

    if (selectedLabels.length > 0) {
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'notiv-queue-inline-labels-chips';

      const maxVisible = 1;
      const visibleLabels = selectedLabels.slice(0, maxVisible);
      const overflowCount = selectedLabels.length - maxVisible;

      visibleLabels.forEach((label) => {
        const chip = document.createElement('span');
        chip.className = 'notiv-queue-inline-label-chip';

        const dot = document.createElement('span');
        dot.className = 'notiv-queue-inline-label-dot';
        dot.style.background = label.color;

        const name = document.createElement('span');
        name.textContent = label.name;

        chip.appendChild(dot);
        chip.appendChild(name);
        chipsContainer.appendChild(chip);
      });

      if (overflowCount > 0) {
        const overflow = document.createElement('span');
        overflow.className = 'notiv-queue-inline-labels-overflow';
        overflow.textContent = `+${overflowCount}`;
        chipsContainer.appendChild(overflow);
      }

      this.labelsBtnEl.appendChild(chipsContainer);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'notiv-queue-inline-placeholder';
      placeholder.textContent = 'Labels';
      this.labelsBtnEl.appendChild(placeholder);
    }

    if (chevron) {
      this.labelsBtnEl.appendChild(chevron);
    } else {
      this.labelsBtnEl.innerHTML += this.createDropdownChevronHtml();
    }
  }

  private createAssigneeDropdown(): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'notiv-queue-dropdown';

    const searchRow = document.createElement('div');
    searchRow.className = 'notiv-queue-dropdown-search';

    const searchIcon = this.createSearchIcon();
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'notiv-queue-dropdown-search-input';
    searchInput.placeholder = 'Search members...';
    searchInput.value = this.assigneeSearchQuery;
    searchInput.addEventListener('input', () => {
      this.assigneeSearchQuery = searchInput.value;
      this.renderAssigneeDropdownList(listEl);
    });

    searchRow.appendChild(searchIcon);
    searchRow.appendChild(searchInput);
    dropdown.appendChild(searchRow);

    const listEl = document.createElement('div');
    listEl.className = 'notiv-queue-dropdown-list';
    this.renderAssigneeDropdownList(listEl);
    dropdown.appendChild(listEl);

    setTimeout(() => searchInput.focus(), 0);

    return dropdown;
  }

  private renderAssigneeDropdownList(listEl: HTMLDivElement): void {
    listEl.innerHTML = '';
    const query = this.assigneeSearchQuery.toLowerCase();

    const unassignedItem = document.createElement('button');
    unassignedItem.type = 'button';
    unassignedItem.className = 'notiv-queue-dropdown-item';
    if (!this.settings.assigneeId) unassignedItem.classList.add('selected');

    const unassignedPlaceholder = document.createElement('span');
    unassignedPlaceholder.className = 'notiv-queue-dropdown-item-avatar-placeholder';
    unassignedPlaceholder.textContent = '—';
    unassignedItem.appendChild(unassignedPlaceholder);

    const unassignedName = document.createElement('span');
    unassignedName.className = 'notiv-queue-dropdown-item-name';
    unassignedName.textContent = 'Unassigned';
    unassignedItem.appendChild(unassignedName);

    if (!this.settings.assigneeId) {
      const check = this.createCheckIcon();
      unassignedItem.appendChild(check);
    }

    unassignedItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.settings.assigneeId = null;
      this.assigneeDropdownOpen = false;
      void this.saveSettings();
      this.renderSettings();
    });

    if ('unassigned'.includes(query) || query === '') {
      listEl.appendChild(unassignedItem);
    }

    const filtered = this.resources.users
      .filter((user) => user.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (filtered.length === 0 && !listEl.children.length) {
      const empty = document.createElement('div');
      empty.className = 'notiv-queue-dropdown-empty';
      empty.textContent = 'No members found';
      listEl.appendChild(empty);
      return;
    }

    filtered.forEach((user) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'notiv-queue-dropdown-item';
      const isSelected = this.settings.assigneeId === user.id;
      if (isSelected) item.classList.add('selected');

      if (user.avatarUrl) {
        const avatar = document.createElement('img');
        avatar.className = 'notiv-queue-dropdown-item-avatar';
        avatar.src = user.avatarUrl;
        avatar.alt = '';
        item.appendChild(avatar);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'notiv-queue-dropdown-item-avatar-placeholder';
        placeholder.textContent = user.name.charAt(0).toUpperCase();
        item.appendChild(placeholder);
      }

      const name = document.createElement('span');
      name.className = 'notiv-queue-dropdown-item-name';
      name.textContent = user.name;
      item.appendChild(name);

      if (isSelected) {
        const check = this.createCheckIcon();
        item.appendChild(check);
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

  private createTeamDropdown(): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'notiv-queue-dropdown';

    const searchRow = document.createElement('div');
    searchRow.className = 'notiv-queue-dropdown-search';

    const searchIcon = this.createSearchIcon();
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'notiv-queue-dropdown-search-input';
    searchInput.placeholder = 'Search teams...';
    searchInput.value = this.teamSearchQuery;
    searchInput.addEventListener('input', () => {
      this.teamSearchQuery = searchInput.value;
      this.renderTeamDropdownList(listEl);
    });

    searchRow.appendChild(searchIcon);
    searchRow.appendChild(searchInput);
    dropdown.appendChild(searchRow);

    const listEl = document.createElement('div');
    listEl.className = 'notiv-queue-dropdown-list';
    this.renderTeamDropdownList(listEl);
    dropdown.appendChild(listEl);

    setTimeout(() => searchInput.focus(), 0);

    return dropdown;
  }

  private renderTeamDropdownList(listEl: HTMLDivElement): void {
    listEl.innerHTML = '';
    const query = this.teamSearchQuery.toLowerCase();

    const filtered = this.resources.teams.filter((team) =>
      team.name.toLowerCase().includes(query) || team.key.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notiv-queue-dropdown-empty';
      empty.textContent = 'No teams found';
      listEl.appendChild(empty);
      return;
    }

    const currentTeam = this.resources.teams.find((t) => t.id === this.selectedTeamId) ?? this.resources.teams[0];

    filtered.forEach((team) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'notiv-queue-dropdown-item';
      const isSelected = currentTeam?.id === team.id;
      if (isSelected) item.classList.add('selected');

      const prefix = document.createElement('span');
      prefix.className = 'notiv-queue-dropdown-item-prefix';
      prefix.textContent = team.key;

      const name = document.createElement('span');
      name.className = 'notiv-queue-dropdown-item-name';
      name.textContent = team.name;

      item.appendChild(prefix);
      item.appendChild(name);

      if (isSelected) {
        const check = this.createCheckIcon();
        item.appendChild(check);
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

  private createDropdownChevronHtml(): string {
    return `<svg class="notiv-queue-dropdown-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
  }

  private createSearchIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'notiv-queue-dropdown-search-icon');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '8');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '21');
    line.setAttribute('y1', '21');
    line.setAttribute('x2', '16.65');
    line.setAttribute('y2', '16.65');

    svg.appendChild(circle);
    svg.appendChild(line);
    return svg;
  }

  private createCheckIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'notiv-queue-dropdown-check');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M20 6L9 17l-5-5');
    svg.appendChild(path);
    return svg;
  }

  private positionDropdown(dropdown: HTMLDivElement, trigger: HTMLElement): void {
    const triggerRect = trigger.getBoundingClientRect();
    const dropdownHeight = 250;
    const dropdownWidth = Math.max(180, triggerRect.width);
    const gap = 6;
    const edgePadding = 12;
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;

    dropdown.style.minWidth = `${dropdownWidth}px`;

    // Horizontal positioning: align left, but flip to right-align if it would overflow
    const leftPosition = triggerRect.left;
    const rightOverflow = leftPosition + dropdownWidth > window.innerWidth - edgePadding;

    if (rightOverflow) {
      dropdown.style.left = 'auto';
      dropdown.style.right = `${edgePadding}px`;
    } else {
      dropdown.style.left = `${leftPosition}px`;
      dropdown.style.right = 'auto';
    }

    // Vertical positioning
    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      dropdown.style.top = `${triggerRect.bottom + gap}px`;
      dropdown.style.bottom = 'auto';
      dropdown.style.maxHeight = `${Math.min(dropdownHeight, spaceBelow - 10)}px`;
      dropdown.classList.remove('flip-up');
    } else {
      dropdown.style.bottom = `${window.innerHeight - triggerRect.top + gap}px`;
      dropdown.style.top = 'auto';
      dropdown.style.maxHeight = `${Math.min(dropdownHeight, spaceAbove - 10)}px`;
      dropdown.classList.add('flip-up');
    }
  }

  private createNoPriorityIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'currentColor');

    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    line1.setAttribute('x', '1');
    line1.setAttribute('y', '7');
    line1.setAttribute('width', '3');
    line1.setAttribute('height', '2');
    line1.setAttribute('rx', '0.5');

    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    line2.setAttribute('x', '6.5');
    line2.setAttribute('y', '7');
    line2.setAttribute('width', '3');
    line2.setAttribute('height', '2');
    line2.setAttribute('rx', '0.5');

    const line3 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    line3.setAttribute('x', '12');
    line3.setAttribute('y', '7');
    line3.setAttribute('width', '3');
    line3.setAttribute('height', '2');
    line3.setAttribute('rx', '0.5');

    svg.appendChild(line1);
    svg.appendChild(line2);
    svg.appendChild(line3);
    return svg;
  }

  private createUrgentIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 16 16');
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
    return svg;
  }

  private createPriorityBarsIcon(filledBars: number): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 16 16');

    const barWidth = 3;
    const gap = 1.5;
    const startX = 2;
    const heights = [4, 7, 10];
    const baseY = 13;

    heights.forEach((height, i) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(startX + i * (barWidth + gap)));
      rect.setAttribute('y', String(baseY - height));
      rect.setAttribute('width', String(barWidth));
      rect.setAttribute('height', String(height));
      rect.setAttribute('rx', '1');
      rect.setAttribute('fill', i < filledBars ? 'currentColor' : 'currentColor');
      rect.setAttribute('opacity', i < filledBars ? '1' : '0.25');
      svg.appendChild(rect);
    });

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
