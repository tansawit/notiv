import type { HighlightColor, LinearLabel, LinearProject, LinearTeam, LinearUser } from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';
import {
  getPanelPalette as resolvePanelPalette,
  getToolbarControlPalette as resolveToolbarControlPalette,
  getToolbarModePalette as resolveToolbarModePalette,
  type NotivThemeMode,
  type PanelPalette,
  type ToolbarControlPalette,
  type ToolbarModePalette
} from './toolbar-palette';
import { renderQueuePanelContent } from './toolbar-render-queue';
import { renderSettingsPanelContent } from './toolbar-render-settings';
import {
  setButtonDisabled,
  setIcon
} from './toolbar-ui-utils';
import {
  createBaseLabelSearchControl,
  createBaseSubmitDropdownControl,
  type SubmitLabelSearchControl,
  type SubmitLabelSearchOption,
  type SubmitDropdownControl,
  type SubmitDropdownOption
} from './base-combobox-control';
import { renderSubmitLabelChipsContent } from './toolbar-render-label-chips';
import { applyPanelModeStyles } from './toolbar-panel-mode';
import {
  morphPanelHostSize as morphPanelHostSizeContent,
  refreshPanelVisibility as refreshPanelVisibilityContent,
  type ToolbarPanelType
} from './toolbar-panel-visibility';
import {
  syncProjectOptionsForSelectedTeamContent,
  syncSubmitFormFromSettingsContent,
  syncTriageOptionVisibilityContent
} from './toolbar-submit-sync';
import { createToolbarSubmitPanelElements } from './toolbar-submit-panel-factory';
import { createToolbarShellElements } from './toolbar-shell-factory';
import { createToolbarQueuePanelElements } from './toolbar-queue-panel-factory';
import { bindToolbarInteractions } from './toolbar-event-bindings';
import {
  Eye,
  EyeOff
} from 'lucide';
import { FONT_STACK_SERIF, getVisualModeTokens } from '../shared/visual-tokens';

export interface QueueNoteSummary {
  id: string;
  comment: string;
  target: string;
  attachmentsCount?: number;
  highlightColor: HighlightColor;
}

export interface ToolbarSettingsState {
  loading: boolean;
  connected: boolean;
  viewerName?: string;
  organizationName?: string;
  tokenEditing: boolean;
  tokenDraft: string;
  tokenMasked: string;
  teamOptions: LinearTeam[];
  projectOptions: LinearProject[];
  labelOptions: LinearLabel[];
  userOptions: LinearUser[];
  loadingResources: boolean;
  savingToken: boolean;
  notice?: string;
  error?: string;
  markersVisible: boolean;
}

export interface ToolbarSubmitPayload {
  teamId?: string;
  title?: string;
  description?: string;
  priority?: number;
  projectId?: string;
  assigneeId?: string;
  triage: boolean;
  labelIds: string[];
}

interface ToolbarCallbacks {
  onExpand: () => void;
  onCollapse: () => void;
  onSubmit: (payload: ToolbarSubmitPayload) => void;
  onSettingsPanelOpen: () => void;
  onQueueDelete: (id: string) => void;
  onQueueHover: (id: string | null) => void;
  onQueueClear: () => void;
  onOpenSettingsPage: () => void;
  onToggleMarkersVisible: () => void;
}

type PanelType = ToolbarPanelType;

const EMPTY_SETTINGS: ToolbarSettingsState = {
  loading: true,
  connected: false,
  tokenEditing: true,
  tokenDraft: '',
  tokenMasked: '',
  teamOptions: [],
  projectOptions: [],
  labelOptions: [],
  userOptions: [],
  loadingResources: false,
  savingToken: false,
  notice: undefined,
  error: undefined,
  markersVisible: true
};

interface SubmitPreferencesStorage {
  [STORAGE_KEYS.submitTeamId]?: string;
  [STORAGE_KEYS.submitProjectId]?: string;
  [STORAGE_KEYS.submitAssigneeId]?: string;
  [STORAGE_KEYS.submitPriority]?: string;
  [STORAGE_KEYS.submitTriage]?: boolean;
  [STORAGE_KEYS.submitLabelIds]?: string[];
}

export class FeedbackToolbar {
  private readonly container: HTMLDivElement;
  private readonly frame: HTMLDivElement;
  private readonly collapsedButton: HTMLButtonElement;
  private readonly collapsedBadge: HTMLSpanElement;
  private readonly expandedBar: HTMLDivElement;
  private readonly expandedControls: HTMLDivElement;
  private readonly markersButton: HTMLButtonElement;
  private readonly markersIcon: HTMLSpanElement;
  private readonly queueButton: HTMLButtonElement;
  private readonly settingsButton: HTMLButtonElement;
  private readonly settingsConnectionBadge: HTMLSpanElement;
  private readonly collapseButton: HTMLButtonElement;
  private readonly separator: HTMLSpanElement;
  private readonly queueBadge: HTMLSpanElement;
  private readonly panelHost: HTMLDivElement;
  private readonly toolbarInnerButtonSize = 34;
  private readonly toolbarInsetPx = 6;
  private readonly toolbarShellBorderPx = 1.5;
  private readonly toolbarOuterRadiusPx = this.toolbarInnerButtonSize / 2 + this.toolbarInsetPx;
  private readonly collapsedShellWidth = this.toolbarOuterRadiusPx * 2;
  private readonly expandedShellMinWidth = this.collapsedShellWidth;
  private readonly expandedShellPaddingPx = this.toolbarInsetPx * 2 + this.toolbarShellBorderPx * 2;
  private readonly shellMorphDurationMs = 320;
  private readonly shellMorphExpandEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
  private readonly shellMorphCollapseEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
  private readonly toolbarContainerEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
  private readonly contentFadeDurationMs = 180;
  private readonly controlsOpacityDurationMs = 280;
  private readonly controlsTransformDurationMs = 280;

  private readonly submitPanel: HTMLDivElement;
  private readonly submitMeta: HTMLDivElement;
  private readonly submitTitleInput: HTMLInputElement;
  private readonly submitDescriptionInput: HTMLTextAreaElement;
  private readonly submitTeamSelect: HTMLSelectElement;
  private readonly submitPrioritySelect: HTMLSelectElement;
  private readonly submitProjectSelect: HTMLSelectElement;
  private readonly submitAssigneeSelect: HTMLSelectElement;
  private readonly submitTeamControl: SubmitDropdownControl;
  private readonly submitProjectControl: SubmitDropdownControl;
  private readonly submitPriorityControl: SubmitDropdownControl;
  private readonly submitAssigneeControl: SubmitDropdownControl;
  private readonly submitLabelControl: SubmitLabelSearchControl;
  private readonly submitTriageInput: HTMLInputElement;
  private readonly submitTriageRow: HTMLLabelElement;
  private readonly submitLabelsWrap: HTMLDivElement;
  private readonly submitConfirmButton: HTMLButtonElement;
  private closeTransientSubmitMenus!: () => void;

  private readonly queuePanel: HTMLDivElement;
  private readonly queueList: HTMLDivElement;
  private readonly queueSubmitButton: HTMLButtonElement;
  private readonly queueClearButton: HTMLButtonElement;
  private readonly queueEmpty: HTMLDivElement;

  private readonly settingsPanel: HTMLDivElement;

  private readonly outsidePointerHandler: (event: PointerEvent) => void;
  private visibilityTimer: number | null = null;
  private panelVisibilityTimer: number | null = null;
  private panelResizeTimer: number | null = null;
  private panelMorphTimer: number | null = null;
  private shellPhaseTimers: number[] = [];

  private toolbarVisible = false;
  private expanded = false;
  private draftCount = 0;
  private submitting = false;
  private activePanel: PanelType = 'none';
  private renderedPanel: PanelType = 'none';
  private submitLabelSelection = new Set<string>();
  private queueItems: QueueNoteSummary[] = [];
  private queueHoveredId: string | null = null;
  private settingsState: ToolbarSettingsState = EMPTY_SETTINGS;
  private submitPreferences: SubmitPreferencesStorage = {};
  private persistSubmitPreferencesTimer: number | null = null;
  private tokenDraftVisible = false;
  private shouldRestoreTokenInputFocus = false;
  private tokenInputSelection: { start: number; end: number } | null = null;
  private colorMode: NotivThemeMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  constructor(private readonly callbacks: ToolbarCallbacks) {
    this.ensureMotionStyles();

    const toolbarPalette = this.getToolbarModePalette();
    const controlPalette = this.getToolbarControlPalette();
    const {
      container,
      frame,
      panelHost,
      collapsedButton,
      collapsedBadge,
      expandedBar,
      expandedControls,
      markersButton,
      markersIcon,
      queueButton,
      settingsButton,
      settingsConnectionBadge,
      separator,
      collapseButton,
      queueBadge
    } = createToolbarShellElements({
      toolbarPalette,
      controlPalette,
      expandedShellMinWidth: this.expandedShellMinWidth,
      collapsedShellWidth: this.collapsedShellWidth,
      toolbarOuterRadiusPx: this.toolbarOuterRadiusPx,
      toolbarContainerEasing: this.toolbarContainerEasing,
      shellMorphDurationMs: this.shellMorphDurationMs,
      shellMorphExpandEasing: this.shellMorphExpandEasing,
      shellMorphCollapseEasing: this.shellMorphCollapseEasing,
      controlsOpacityDurationMs: this.controlsOpacityDurationMs,
      controlsTransformDurationMs: this.controlsTransformDurationMs,
      getCollapsedContentTransition: (easing) => this.getCollapsedContentTransition(easing),
      getShellTransition: (easing) => this.getShellTransition(easing),
      makeIconButton: (label, icon) => this.makeIconButton(label, icon)
    });

    const panelPalette = this.getPanelPalette();
    const {
      submitPanel,
      submitMeta,
      submitTitleInput,
      submitDescriptionInput,
      submitTeamSelect,
      submitPrioritySelect,
      submitProjectSelect,
      submitAssigneeSelect,
      submitTeamControl,
      submitProjectControl,
      submitPriorityControl,
      submitAssigneeControl,
      submitLabelControl,
      submitTriageInput,
      triageRow,
      submitLabelsWrap,
      submitConfirmButton,
      closeTransientSubmitMenus
    } = createToolbarSubmitPanelElements({
      panelPalette,
      makePanelShell: (title) => this.makePanelShell(title),
      makeIconButton: (label, icon) => this.makeIconButton(label, icon),
      onBackToQueue: () => {
        this.togglePanel('queue');
      },
      getPanelPalette: () => this.getPanelPalette(),
      getColorMode: () => this.colorMode,
      getUserById: (userId) => this.settingsState.userOptions.find((entry) => entry.id === userId),
      createSubmitDropdownControl: (config) => this.createSubmitDropdownControl(config),
      createSubmitLabelControl: () => this.createSubmitLabelControl()
    });
    this.closeTransientSubmitMenus = closeTransientSubmitMenus;

    const { queuePanel, queueList, queueSubmitButton, queueClearButton, queueEmpty } =
      createToolbarQueuePanelElements({
        colorMode: this.colorMode,
        panelPalette,
        makePanelShell: (title) => this.makePanelShell(title)
      });

    const settingsPanel = this.makePanelShell('Settings');

    panelHost.appendChild(submitPanel);
    panelHost.appendChild(queuePanel);
    panelHost.appendChild(settingsPanel);

    frame.appendChild(panelHost);
    frame.appendChild(collapsedButton);
    frame.appendChild(expandedBar);
    container.appendChild(frame);
    document.documentElement.appendChild(container);

    this.container = container;
    this.frame = frame;
    this.collapsedButton = collapsedButton;
    this.collapsedBadge = collapsedBadge;
    this.expandedBar = expandedBar;
    this.expandedControls = expandedControls;
    this.markersButton = markersButton;
    this.markersIcon = markersIcon;
    this.queueButton = queueButton;
    this.settingsButton = settingsButton;
    this.settingsConnectionBadge = settingsConnectionBadge;
    this.collapseButton = collapseButton;
    this.separator = separator;
    this.queueBadge = queueBadge;
    this.panelHost = panelHost;

    this.submitPanel = submitPanel;
    this.submitMeta = submitMeta;
    this.submitTitleInput = submitTitleInput;
    this.submitDescriptionInput = submitDescriptionInput;
    this.submitTeamSelect = submitTeamSelect;
    this.submitPrioritySelect = submitPrioritySelect;
    this.submitProjectSelect = submitProjectSelect;
    this.submitAssigneeSelect = submitAssigneeSelect;
    this.submitTeamControl = submitTeamControl;
    this.submitProjectControl = submitProjectControl;
    this.submitPriorityControl = submitPriorityControl;
    this.submitAssigneeControl = submitAssigneeControl;
    this.submitLabelControl = submitLabelControl;
    this.submitTriageInput = submitTriageInput;
    this.submitTriageRow = triageRow;
    this.submitLabelsWrap = submitLabelsWrap;
    this.submitConfirmButton = submitConfirmButton;

    this.queuePanel = queuePanel;
    this.queueList = queueList;
    this.queueSubmitButton = queueSubmitButton;
    this.queueClearButton = queueClearButton;
    this.queueEmpty = queueEmpty;

    this.settingsPanel = settingsPanel;

    this.outsidePointerHandler = bindToolbarInteractions<ToolbarSubmitPayload>({
      container,
      collapsedButton,
      markersButton,
      submitConfirmButton,
      queueButton,
      queueSubmitButton,
      queueClearButton,
      submitTitleInput,
      submitTeamSelect,
      submitProjectSelect,
      submitPrioritySelect,
      submitAssigneeSelect,
      submitTriageInput,
      settingsButton,
      collapseButton,
      submitLabelControl,
      getSubmitDropdownControls: () => this.getSubmitDropdownControls(),
      closeTransientSubmitMenus: () => this.closeTransientSubmitMenus(),
      isSubmitting: () => this.submitting,
      getDraftCount: () => this.draftCount,
      getQueueItemsCount: () => this.queueItems.length,
      hasRequiredSubmitFields: () => this.hasRequiredSubmitFields(),
      collectSubmitPayload: () => this.collectSubmitPayload(),
      getActivePanel: () => this.activePanel,
      setExpanded: (expanded) => {
        this.setExpanded(expanded);
      },
      hidePanels: () => {
        this.hidePanels();
      },
      togglePanel: (panel) => {
        this.togglePanel(panel);
      },
      syncProjectOptionsForSelectedTeam: () => {
        this.syncProjectOptionsForSelectedTeam();
      },
      syncTriageOptionVisibility: () => {
        this.syncTriageOptionVisibility();
      },
      syncSubmitState: () => {
        this.syncSubmitState();
      },
      queuePersistSubmitPreferences: () => {
        this.queuePersistSubmitPreferences();
      },
      onExpand: () => this.callbacks.onExpand(),
      onCollapse: () => this.callbacks.onCollapse(),
      onSubmit: (payload) => this.callbacks.onSubmit(payload),
      onSettingsPanelOpen: () => this.callbacks.onSettingsPanelOpen(),
      onQueueClear: () => this.callbacks.onQueueClear(),
      onToggleMarkersVisible: () => this.callbacks.onToggleMarkersVisible()
    }).outsidePointerHandler;

    this.publishThemeMode();
    this.syncToolbarShell();
    this.syncMarkersUi();
    this.syncSettingsConnectionUi();
    this.syncSubmitFormFromSettings();
    this.syncSubmitState();
    this.renderQueuePanel();
    this.renderSettingsPanel();
    void this.hydrateSubmitPreferences();
  }

  setVisible(visible: boolean): void {
    const wasVisible = this.toolbarVisible;
    this.toolbarVisible = visible;
    if (this.visibilityTimer) {
      window.clearTimeout(this.visibilityTimer);
      this.visibilityTimer = null;
    }

    if (visible) {
      this.container.style.display = 'block';
      this.container.style.pointerEvents = 'auto';
      if (!wasVisible) {
        this.setExpanded(false, false);
        this.hidePanels();
        window.requestAnimationFrame(() => {
          this.container.style.opacity = '1';
          this.container.style.transform = 'translateY(0) scale(1)';
        });
      } else {
        this.container.style.opacity = '1';
        this.container.style.transform = 'translateY(0) scale(1)';
      }
      return;
    }

    this.container.style.opacity = '0';
    this.container.style.transform = 'translateY(10px) scale(0.98)';
    this.container.style.pointerEvents = 'none';
    this.hidePanels();
    this.visibilityTimer = window.setTimeout(() => {
      if (!this.toolbarVisible) {
        this.container.style.display = 'none';
      }
    }, 190);
  }

  collapse(): void {
    this.hidePanels();
    this.setExpanded(false);
  }

  setDraftCount(count: number): void {
    this.draftCount = count;
    this.syncQueueBadge();
    this.syncSubmitState();
  }

  setSubmitting(submitting: boolean): void {
    this.submitting = submitting;
    this.syncSubmitState();
    if (submitting) {
      this.hidePanels();
    }
  }

  clearSubmitInputs(): void {
    this.submitTitleInput.value = '';
    this.submitDescriptionInput.value = '';
    this.syncSubmitState();
  }

  setQueueItems(items: QueueNoteSummary[]): void {
    this.queueItems = items;
    if (this.queueHoveredId && !items.some((item) => item.id === this.queueHoveredId)) {
      this.queueHoveredId = null;
      this.callbacks.onQueueHover(null);
    }
    this.syncQueueBadge();
    this.renderQueuePanel();
  }

  setQueueHoveredNoteId(id: string | null): void {
    this.queueHoveredId = id;
    this.renderQueuePanel();
  }

  setSettingsState(state: ToolbarSettingsState): void {
    this.settingsState = state;
    if (!state.tokenEditing) {
      this.tokenDraftVisible = false;
      this.shouldRestoreTokenInputFocus = false;
      this.tokenInputSelection = null;
    }
    this.syncMarkersUi();
    this.syncSettingsConnectionUi();
    this.syncSubmitFormFromSettings();
    this.renderSettingsPanel();
  }

  destroy(): void {
    if (this.visibilityTimer) {
      window.clearTimeout(this.visibilityTimer);
    }
    if (this.panelVisibilityTimer) {
      window.clearTimeout(this.panelVisibilityTimer);
    }
    if (this.panelResizeTimer) {
      window.clearTimeout(this.panelResizeTimer);
      this.panelResizeTimer = null;
    }
    if (this.panelMorphTimer) {
      window.clearTimeout(this.panelMorphTimer);
    }
    if (this.persistSubmitPreferencesTimer) {
      window.clearTimeout(this.persistSubmitPreferencesTimer);
      this.persistSubmitPreferencesTimer = null;
    }
    this.clearShellPhaseTimers();
    document.removeEventListener('pointerdown', this.outsidePointerHandler, true);
    this.getSubmitDropdownControls().forEach((control) => {
      control.destroy?.();
      control.menu.remove();
    });
    this.submitLabelControl.destroy?.();
    this.submitLabelControl.menu.remove();
    this.container.remove();
  }

  private async hydrateSubmitPreferences(): Promise<void> {
    try {
      const data = await getLocalStorageItems<SubmitPreferencesStorage>([
        STORAGE_KEYS.submitTeamId,
        STORAGE_KEYS.submitProjectId,
        STORAGE_KEYS.submitAssigneeId,
        STORAGE_KEYS.submitPriority,
        STORAGE_KEYS.submitTriage,
        STORAGE_KEYS.submitLabelIds
      ]);
      this.submitPreferences = {
        [STORAGE_KEYS.submitTeamId]: data[STORAGE_KEYS.submitTeamId]?.trim() || undefined,
        [STORAGE_KEYS.submitProjectId]: data[STORAGE_KEYS.submitProjectId]?.trim() || undefined,
        [STORAGE_KEYS.submitAssigneeId]: data[STORAGE_KEYS.submitAssigneeId]?.trim() || undefined,
        [STORAGE_KEYS.submitPriority]: data[STORAGE_KEYS.submitPriority]?.trim() || undefined,
        [STORAGE_KEYS.submitTriage]: data[STORAGE_KEYS.submitTriage] === true,
        [STORAGE_KEYS.submitLabelIds]: (data[STORAGE_KEYS.submitLabelIds] ?? [])
          .map((value) => value.trim())
          .filter(Boolean)
      };

      const storedPriority = this.submitPreferences[STORAGE_KEYS.submitPriority];
      if (storedPriority) {
        this.submitPrioritySelect.value = storedPriority;
      }
      const storedAssigneeId = this.submitPreferences[STORAGE_KEYS.submitAssigneeId];
      if (storedAssigneeId) {
        this.submitAssigneeSelect.value = storedAssigneeId;
      }
      this.submitTriageInput.checked = this.submitPreferences[STORAGE_KEYS.submitTriage] === true;

      const storedLabelIds = this.submitPreferences[STORAGE_KEYS.submitLabelIds] ?? [];
      if (storedLabelIds.length > 0 && this.submitLabelSelection.size === 0) {
        this.submitLabelSelection = new Set(storedLabelIds);
      }
      this.syncSubmitFormFromSettings();
      this.syncSubmitState();
    } catch {
      // Keep runtime-only defaults when storage is unavailable.
    }
  }

  private queuePersistSubmitPreferences(): void {
    if (this.persistSubmitPreferencesTimer) {
      window.clearTimeout(this.persistSubmitPreferencesTimer);
    }
    this.persistSubmitPreferencesTimer = window.setTimeout(() => {
      this.persistSubmitPreferencesTimer = null;
      void this.persistSubmitPreferences();
    }, 120);
  }

  private async persistSubmitPreferences(): Promise<void> {
    const payload: SubmitPreferencesStorage = {
      [STORAGE_KEYS.submitTeamId]: this.submitTeamSelect.value.trim() || undefined,
      [STORAGE_KEYS.submitProjectId]: this.submitProjectSelect.value.trim() || undefined,
      [STORAGE_KEYS.submitAssigneeId]: this.submitAssigneeSelect.value.trim() || undefined,
      [STORAGE_KEYS.submitPriority]: this.submitPrioritySelect.value.trim() || undefined,
      [STORAGE_KEYS.submitTriage]: this.submitTriageInput.checked,
      [STORAGE_KEYS.submitLabelIds]: Array.from(this.submitLabelSelection)
    };
    this.submitPreferences = payload;
    await setLocalStorageItems(payload as Record<string, unknown>).catch(() => undefined);
  }

  private makeIconButton(label: string, icon: HTMLElement): HTMLButtonElement {
    const controlPalette = this.getToolbarControlPalette();
    const button = document.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.style.appearance = 'none';
    button.style.width = `${this.toolbarInnerButtonSize}px`;
    button.style.height = `${this.toolbarInnerButtonSize}px`;
    button.style.border = `1.25px solid ${controlPalette.buttonBorder}`;
    button.style.borderRadius = '6px';
    button.style.background = controlPalette.buttonBackground;
    button.style.color = controlPalette.buttonColor;
    button.style.boxShadow = 'none';
    button.style.display = 'inline-grid';
    button.style.placeItems = 'center';
    button.style.cursor = 'pointer';
    button.style.transform = 'scale(1)';
    button.style.transition = [
      'transform 90ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      'color 120ms ease',
      'background-color 120ms ease',
      'border-color 120ms ease',
      'box-shadow 120ms ease',
      'filter 120ms ease'
    ].join(', ');
    button.dataset.notivRestBackground = controlPalette.buttonBackground;
    button.dataset.notivRestBorder = controlPalette.buttonBorder;
    button.dataset.notivRestColor = controlPalette.buttonColor;
    button.dataset.notivRestShadow = 'none';
    button.dataset.notivHoverBackground = controlPalette.buttonHoverBackground;
    button.dataset.notivHoverBorder = controlPalette.buttonHoverBorder;
    button.dataset.notivHoverColor = controlPalette.buttonHoverColor;
    button.dataset.notivHoverShadow = `inset 0 0 0 1px ${controlPalette.buttonHoverBorder}`;
    button.dataset.notivPressedBackground = controlPalette.buttonPressedBackground;
    button.dataset.notivPressedBorder = controlPalette.buttonHoverBorder;
    button.dataset.notivPressedColor = controlPalette.buttonHoverColor;
    button.dataset.notivPressedShadow = `inset 0 0 0 1px ${controlPalette.buttonHoverBorder}`;

    let hovered = false;
    let pressed = false;
    const applyInteractionState = (): void => {
      const restBackground = button.dataset.notivRestBackground ?? controlPalette.buttonBackground;
      const restBorder = button.dataset.notivRestBorder ?? controlPalette.buttonBorder;
      const restColor = button.dataset.notivRestColor ?? controlPalette.buttonColor;
      const restShadow = button.dataset.notivRestShadow ?? 'none';
      const hoverBackground = button.dataset.notivHoverBackground ?? restBackground;
      const hoverBorder = button.dataset.notivHoverBorder ?? restBorder;
      const hoverColor = button.dataset.notivHoverColor ?? restColor;
      const hoverShadow = button.dataset.notivHoverShadow ?? restShadow;
      const pressedBackground = button.dataset.notivPressedBackground ?? hoverBackground;
      const pressedBorder = button.dataset.notivPressedBorder ?? hoverBorder;
      const pressedColor = button.dataset.notivPressedColor ?? hoverColor;
      const pressedShadow = button.dataset.notivPressedShadow ?? hoverShadow;
      const hoverFilter =
        button.dataset.notivHoverFilter
        ?? (this.colorMode === 'dark' ? 'brightness(1.1)' : 'brightness(0.92)');
      const pressedFilter =
        button.dataset.notivPressedFilter
        ?? (this.colorMode === 'dark' ? 'brightness(1.06)' : 'brightness(0.88)');

      if (button.disabled) {
        hovered = false;
        pressed = false;
        button.style.transform = 'scale(1)';
        button.style.background = restBackground;
        button.style.borderColor = restBorder;
        button.style.color = restColor;
        button.style.boxShadow = restShadow;
        button.style.filter = 'none';
        return;
      }
      if (pressed) {
        button.style.transform = 'scale(0.96)';
        button.style.background = pressedBackground;
        button.style.borderColor = pressedBorder;
        button.style.color = pressedColor;
        button.style.boxShadow = pressedShadow;
        button.style.filter = pressedFilter;
        return;
      }
      button.style.transform = 'scale(1)';
      if (hovered) {
        button.style.background = hoverBackground;
        button.style.borderColor = hoverBorder;
        button.style.color = hoverColor;
        button.style.boxShadow = hoverShadow;
        button.style.filter = hoverFilter;
        return;
      }
      button.style.background = restBackground;
      button.style.borderColor = restBorder;
      button.style.color = restColor;
      button.style.boxShadow = restShadow;
      button.style.filter = 'none';
    };

    button.addEventListener('pointerenter', () => {
      hovered = true;
      applyInteractionState();
    });
    button.addEventListener('pointerleave', () => {
      hovered = false;
      pressed = false;
      applyInteractionState();
    });
    button.addEventListener('pointerdown', (event) => {
      if (button.disabled || event.button !== 0) {
        return;
      }
      pressed = true;
      applyInteractionState();
    });
    button.addEventListener('pointerup', () => {
      pressed = false;
      applyInteractionState();
    });
    button.addEventListener('pointercancel', () => {
      pressed = false;
      applyInteractionState();
    });
    button.addEventListener('blur', () => {
      hovered = false;
      pressed = false;
      applyInteractionState();
    });

    button.appendChild(icon);
    applyInteractionState();
    return button;
  }

  private makePanelShell(title: string): HTMLDivElement {
    const palette = this.getPanelPalette();
    const panel = document.createElement('div');
    panel.setAttribute('data-notiv-ui', 'true');
    panel.style.display = 'none';
    panel.style.width = '332px';
    panel.style.maxWidth = 'min(332px, calc(100vw - 20px))';
    panel.style.border = `1.25px solid ${palette.shellBorder}`;
    panel.style.borderRadius = '12px';
    panel.style.background = palette.shellBackground;
    panel.style.padding = '10px';
    panel.style.boxShadow = palette.shellShadow;
    panel.style.backgroundImage = 'radial-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 0)';
    panel.style.backgroundSize = '12px 12px';
    panel.style.display = 'none';

    const heading = document.createElement('div');
    heading.textContent = title;
    heading.style.marginBottom = '8px';
    heading.style.color = palette.headingColor;
    heading.style.fontFamily = FONT_STACK_SERIF;
    heading.style.fontSize = '14px';
    heading.style.fontWeight = '600';

    panel.appendChild(heading);
    return panel;
  }

  private setExpanded(expanded: boolean, animate = true): void {
    if (this.expanded === expanded && animate) {
      return;
    }
    this.expanded = expanded;
    this.syncToolbarShell(animate);
  }

  private getExpandedShellWidth(): number {
    const controlsWidth = this.expandedControls?.scrollWidth ?? 0;
    const desiredWidth = Math.max(this.expandedShellMinWidth, controlsWidth + this.expandedShellPaddingPx);
    return Math.max(this.collapsedShellWidth, Math.min(desiredWidth, window.innerWidth - 20));
  }

  private getCollapsedContentTransition(easing: string): string {
    return [
      `opacity ${this.contentFadeDurationMs}ms ${easing}`,
      `transform ${this.contentFadeDurationMs}ms ${easing}`
    ].join(', ');
  }

  private getShellTransition(easing: string): string {
    return [
      `width ${this.shellMorphDurationMs}ms ${easing}`,
      `border-radius ${this.shellMorphDurationMs}ms ${easing}`,
      `padding ${this.shellMorphDurationMs}ms ${easing}`,
      `background-color ${this.shellMorphDurationMs}ms ${easing}`,
      `border-color ${this.shellMorphDurationMs}ms ${easing}`,
      `box-shadow ${this.shellMorphDurationMs}ms ${easing}`
    ].join(', ');
  }

  private clearShellPhaseTimers(): void {
    this.shellPhaseTimers.forEach((id) => window.clearTimeout(id));
    this.shellPhaseTimers = [];
  }

  private setCollapsedContentVisible(visible: boolean): void {
    if (visible) {
      this.collapsedButton.style.visibility = 'visible';
    }
    this.collapsedButton.style.opacity = visible ? '1' : '0';
    this.collapsedButton.style.transform = visible ? 'scale(1)' : 'scale(0.5)';
    this.collapsedButton.style.pointerEvents = visible ? 'auto' : 'none';
    if (!visible) {
      this.scheduleShellPhase(() => {
        if (!this.expanded) {
          return;
        }
        this.collapsedButton.style.visibility = 'hidden';
      }, this.contentFadeDurationMs);
    }
  }

  private setExpandedControlsVisible(visible: boolean): void {
    if (visible) {
      this.expandedControls.style.visibility = 'visible';
    }
    this.expandedControls.style.opacity = visible ? '1' : '0';
    this.expandedControls.style.filter = visible ? 'blur(0px)' : 'blur(10px)';
    this.expandedControls.style.transform = visible ? 'scale(1)' : 'scale(0.4)';
    this.expandedControls.style.pointerEvents = visible ? 'auto' : 'none';
    if (!visible) {
      this.scheduleShellPhase(() => {
        if (this.expanded) {
          return;
        }
        this.expandedControls.style.visibility = 'hidden';
      }, this.controlsOpacityDurationMs);
    }
  }

  private syncToolbarShell(animate = true): void {
    this.clearShellPhaseTimers();
    const expandedWidth = this.getExpandedShellWidth();
    const toolbarPalette = this.getToolbarModePalette();
    const shellMorphEasing = this.expanded ? this.shellMorphExpandEasing : this.shellMorphCollapseEasing;
    this.frame.style.width = `${expandedWidth}px`;
    this.collapsedButton.style.color = toolbarPalette.iconColor;
    this.collapsedButton.dataset.notivRestBackground = 'transparent';
    this.collapsedButton.dataset.notivRestBorder = 'transparent';
    this.collapsedButton.dataset.notivRestColor = toolbarPalette.iconColor;
    this.collapsedButton.dataset.notivRestShadow = 'none';
    this.collapsedButton.dataset.notivHoverBackground = this.colorMode === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(17, 17, 17, 0.06)';
    this.collapsedButton.dataset.notivHoverBorder = 'transparent';
    this.collapsedButton.dataset.notivHoverColor = toolbarPalette.iconColor;
    this.collapsedButton.dataset.notivHoverShadow = 'none';
    this.collapsedButton.dataset.notivPressedBackground = this.colorMode === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(17, 17, 17, 0.1)';
    this.collapsedButton.dataset.notivPressedBorder = 'transparent';
    this.collapsedButton.dataset.notivPressedColor = toolbarPalette.iconColor;
    this.collapsedButton.dataset.notivPressedShadow = 'none';
    this.collapsedButton.dataset.notivHoverFilter = this.colorMode === 'dark' ? 'brightness(1.1)' : 'brightness(0.88)';
    this.collapsedButton.dataset.notivPressedFilter = this.colorMode === 'dark' ? 'brightness(1.06)' : 'brightness(0.84)';
    this.collapsedButton.style.transition = this.getCollapsedContentTransition(shellMorphEasing);
    this.expandedBar.style.transition = this.getShellTransition(shellMorphEasing);
    this.applyToolbarControlMode();
    this.applyPanelMode();

    const applyShellState = (): void => {
      if (this.expanded) {
        this.expandedBar.style.width = `${expandedWidth}px`;
        this.expandedBar.style.borderRadius = `${this.toolbarOuterRadiusPx}px`;
        this.expandedBar.style.padding = `${this.toolbarInsetPx}px`;
        this.expandedBar.style.cursor = 'grab';
        this.expandedBar.style.background = toolbarPalette.shellBackground;
        this.expandedBar.style.border = `1.25px solid ${toolbarPalette.shellBorder}`;
        this.expandedBar.style.boxShadow = toolbarPalette.shellShadowExpanded;
        return;
      }

      this.expandedBar.style.width = `${this.collapsedShellWidth}px`;
      this.expandedBar.style.borderRadius = `${this.toolbarOuterRadiusPx}px`;
      this.expandedBar.style.padding = '0';
      this.expandedBar.style.cursor = 'pointer';
      this.expandedBar.style.background = toolbarPalette.shellBackground;
      this.expandedBar.style.border = `1.25px solid ${toolbarPalette.shellBorder}`;
      this.expandedBar.style.boxShadow = toolbarPalette.shellShadow;
      this.hidePanels();
    };

    if (this.expanded && animate) {
      const barRect = this.expandedBar.getBoundingClientRect();
      const spaceOnLeft = barRect.right - 20;
      const neededSpace = expandedWidth;

      if (spaceOnLeft < neededSpace) {
        const shiftAmount = neededSpace - spaceOnLeft;
        const currentRight = parseFloat(this.container.style.right) || 20;
        this.container.style.transition = `right ${this.shellMorphDurationMs}ms ${shellMorphEasing}`;
        this.container.style.right = `${currentRight + shiftAmount}px`;
      }
    }

    if (!animate) {
      const previousCollapsedTransition = this.collapsedButton.style.transition;
      const previousExpandedTransition = this.expandedBar.style.transition;
      const previousControlsTransition = this.expandedControls.style.transition;

      this.collapsedButton.style.transition = 'none';
      this.expandedBar.style.transition = 'none';
      this.expandedControls.style.transition = 'none';
      applyShellState();
      this.setCollapsedContentVisible(!this.expanded);
      this.setExpandedControlsVisible(this.expanded);
      this.expandedBar.style.pointerEvents = this.expanded ? 'auto' : 'none';
      this.syncMarkersUi();
      void this.expandedBar.getBoundingClientRect();
      this.collapsedButton.style.transition = previousCollapsedTransition;
      this.expandedBar.style.transition = previousExpandedTransition;
      this.expandedControls.style.transition = previousControlsTransition;
      return;
    }

    applyShellState();

    if (this.expanded) {
      this.setCollapsedContentVisible(false);
      this.expandedBar.style.pointerEvents = 'auto';
      this.setExpandedControlsVisible(true);
    } else {
      this.setExpandedControlsVisible(false);
      this.setCollapsedContentVisible(true);
      this.expandedBar.style.pointerEvents = 'none';
    }
    this.syncMarkersUi();
  }

  private scheduleShellPhase(callback: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.shellPhaseTimers = this.shellPhaseTimers.filter((timerId) => timerId !== id);
      callback();
    }, delayMs);
    this.shellPhaseTimers.push(id);
  }

  private syncMarkersUi(): void {
    const controlPalette = this.getToolbarControlPalette();
    const visible = this.settingsState.markersVisible;
    const activeHoverBackground = this.colorMode === 'dark' ? '#efefef' : '#2a2a2a';
    const activePressedBackground = this.colorMode === 'dark' ? '#c8c8c8' : '#3a3a3a';
    this.markersButton.title = visible ? 'Hide markers' : 'Show markers';
    this.markersButton.setAttribute('aria-label', visible ? 'Hide markers' : 'Show markers');
    this.markersButton.style.borderColor = 'transparent';
    this.markersButton.style.border = 'none';
    this.markersButton.style.background = visible ? controlPalette.activeBackground : 'transparent';
    this.markersButton.style.color = visible ? controlPalette.activeColor : controlPalette.buttonColor;
    this.markersButton.dataset.notivRestBackground = visible ? controlPalette.activeBackground : 'transparent';
    this.markersButton.dataset.notivRestBorder = 'transparent';
    this.markersButton.dataset.notivRestColor = visible ? controlPalette.activeColor : controlPalette.buttonColor;
    this.markersButton.dataset.notivRestShadow = 'none';
    this.markersButton.dataset.notivHoverBackground = visible
      ? activeHoverBackground
      : controlPalette.buttonHoverBackground;
    this.markersButton.dataset.notivHoverBorder = 'transparent';
    this.markersButton.dataset.notivHoverColor = visible ? controlPalette.activeColor : controlPalette.buttonHoverColor;
    this.markersButton.dataset.notivHoverShadow = 'none';
    this.markersButton.dataset.notivPressedBackground = visible ? activePressedBackground : controlPalette.buttonPressedBackground;
    this.markersButton.dataset.notivPressedBorder = 'transparent';
    this.markersButton.dataset.notivPressedColor = visible ? controlPalette.activeColor : controlPalette.buttonHoverColor;
    this.markersButton.dataset.notivPressedShadow = 'none';
    this.markersButton.dataset.notivHoverFilter = visible ? 'none' : (this.colorMode === 'dark' ? 'brightness(1.1)' : 'brightness(0.9)');
    this.markersButton.dataset.notivPressedFilter = visible ? 'none' : (this.colorMode === 'dark' ? 'brightness(1.06)' : 'brightness(0.86)');
    setIcon(this.markersIcon, visible ? Eye : EyeOff);
  }

  private syncSettingsConnectionUi(): void {
    const hasCredentials = Boolean(this.settingsState.tokenMasked.trim());
    const hasError = Boolean(this.settingsState.error?.trim());
    const connecting =
      hasCredentials && (this.settingsState.loading || this.settingsState.loadingResources || this.settingsState.savingToken);
    const tokens = getVisualModeTokens(this.colorMode);
    const badgeTokens = tokens.settingsConnectionBadge;
    const applyConnectionBadge = (background: string): void => {
      this.settingsConnectionBadge.style.background = background;
      this.settingsConnectionBadge.style.boxShadow = 'none';
      this.settingsConnectionBadge.style.border = `1px solid ${badgeTokens.border}`;
    };

    if (!hasCredentials) {
      applyConnectionBadge(badgeTokens.idle);
      return;
    }

    if (hasError) {
      applyConnectionBadge(badgeTokens.error.background);
      return;
    }

    if (connecting) {
      applyConnectionBadge(badgeTokens.connecting.background);
      return;
    }

    if (this.settingsState.connected) {
      applyConnectionBadge(badgeTokens.connected.background);
      return;
    }
    applyConnectionBadge(badgeTokens.idle);
  }

  private syncQueueBadge(): void {
    const count = this.queueItems.length;
    const value = count > 99 ? '99+' : String(count);
    const visible = count > 0;
    this.queueBadge.textContent = value;
    this.collapsedBadge.textContent = value;
    this.queueBadge.style.display = visible ? 'grid' : 'none';
    this.collapsedBadge.style.display = visible ? 'grid' : 'none';
  }

  private syncSubmitState(): void {
    const queueActionDisabled = this.submitting || this.draftCount === 0;
    const submitActionDisabled = queueActionDisabled || !this.hasRequiredSubmitFields();
    setButtonDisabled(this.submitConfirmButton, submitActionDisabled);
    this.submitConfirmButton.style.opacity = submitActionDisabled ? '0.5' : '1';
    setButtonDisabled(this.queueSubmitButton, queueActionDisabled);
    this.queueSubmitButton.style.opacity = queueActionDisabled ? '0.55' : '1';
    this.queueSubmitButton.textContent = this.submitting
      ? 'Submitting...'
      : this.draftCount <= 0
        ? 'Submit notes'
        : `Submit notes (${this.draftCount})`;
    this.submitTitleInput.disabled = this.submitting;
    this.submitDescriptionInput.disabled = this.submitting;
    this.submitTeamSelect.disabled = this.submitting;
    this.submitPrioritySelect.disabled = this.submitting;
    this.submitProjectSelect.disabled = this.submitting;
    this.submitAssigneeSelect.disabled = this.submitting;
    this.submitTriageInput.disabled = this.submitting;
    this.getSubmitDropdownControls().forEach((control) => control.syncDisabled());
    this.submitLabelControl.syncDisabled();
    if (this.submitting) {
      this.closeTransientSubmitMenus();
    }
    this.submitConfirmButton.textContent = this.submitting
      ? 'Submitting...'
      : this.draftCount <= 0
        ? 'Create ticket from notes'
        : `Create ticket from ${this.draftCount} notes`;
    this.submitMeta.textContent =
      this.draftCount <= 0
        ? 'Add at least one note to submit.'
        : `All ${this.draftCount} note${this.draftCount === 1 ? '' : 's'} in this session will be submitted as one Linear ticket.`;
    this.renderSubmitLabelChips();
  }

  private syncSubmitFormFromSettings(): void {
    syncSubmitFormFromSettingsContent({
      resources: {
        teamOptions: this.settingsState.teamOptions,
        projectOptions: this.settingsState.projectOptions,
        userOptions: this.settingsState.userOptions,
        labelOptions: this.settingsState.labelOptions
      },
      teamSelect: this.submitTeamSelect,
      projectSelect: this.submitProjectSelect,
      assigneeSelect: this.submitAssigneeSelect,
      prioritySelect: this.submitPrioritySelect,
      triageRow: this.submitTriageRow,
      triageInput: this.submitTriageInput,
      projectControl: this.submitProjectControl,
      submitDropdownControls: this.getSubmitDropdownControls(),
      submitLabelControl: this.submitLabelControl,
      submitLabelSelection: this.submitLabelSelection,
      storedPreferences: {
        teamId: this.submitPreferences[STORAGE_KEYS.submitTeamId]?.trim() || '',
        projectId: this.submitPreferences[STORAGE_KEYS.submitProjectId]?.trim() || '',
        assigneeId: this.submitPreferences[STORAGE_KEYS.submitAssigneeId]?.trim() || '',
        priority: this.submitPreferences[STORAGE_KEYS.submitPriority]?.trim() || '',
        labelIds: this.submitPreferences[STORAGE_KEYS.submitLabelIds] ?? [],
        triage: this.submitPreferences[STORAGE_KEYS.submitTriage] === true
      },
      onRenderSubmitLabelChips: () => {
        this.renderSubmitLabelChips();
      },
      onSyncSubmitState: () => {
        this.syncSubmitState();
      }
    });
  }

  private hasRequiredSubmitFields(): boolean {
    const hasTitle = this.submitTitleInput.value.trim().length > 0;
    const hasTeam = this.submitTeamSelect.value.trim().length > 0;
    return hasTitle && hasTeam;
  }

  private syncProjectOptionsForSelectedTeam(preferredProjectId?: string): void {
    syncProjectOptionsForSelectedTeamContent({
      selectedTeamId: this.submitTeamSelect.value.trim(),
      projectOptions: this.settingsState.projectOptions,
      projectSelect: this.submitProjectSelect,
      projectControl: this.submitProjectControl,
      preferredProjectId,
      previousProjectId: this.submitProjectSelect.value
    });
  }

  private syncTriageOptionVisibility(): void {
    syncTriageOptionVisibilityContent({
      selectedTeamId: this.submitTeamSelect.value.trim(),
      teamOptions: this.settingsState.teamOptions,
      triageRow: this.submitTriageRow,
      triageInput: this.submitTriageInput
    });
  }

  private renderSubmitLabelChips(): void {
    renderSubmitLabelChipsContent({
      submitLabelsWrap: this.submitLabelsWrap,
      labelOptions: this.settingsState.labelOptions,
      selectedLabelIds: this.submitLabelSelection,
      submitting: this.submitting,
      palette: this.getPanelPalette(),
      onRemoveLabel: (labelId) => {
        this.submitLabelSelection.delete(labelId);
        this.renderSubmitLabelChips();
        this.submitLabelControl.refresh();
        this.queuePersistSubmitPreferences();
      }
    });
  }

  private collectSubmitPayload(): ToolbarSubmitPayload {
    const priorityRaw = this.submitPrioritySelect.value.trim();
    const priority = priorityRaw === 'none' ? undefined : Number(priorityRaw);
    return {
      teamId: this.submitTeamSelect.value.trim() || undefined,
      title: this.submitTitleInput.value.trim() || undefined,
      description: this.submitDescriptionInput.value.trim() || undefined,
      priority: Number.isFinite(priority) ? priority : undefined,
      projectId: this.submitProjectSelect.value.trim() || undefined,
      assigneeId: this.submitAssigneeSelect.value.trim() || undefined,
      triage: this.submitTriageInput.checked,
      labelIds: Array.from(this.submitLabelSelection)
    };
  }

  private togglePanel(panel: PanelType): void {
    if (!this.expanded) {
      this.setExpanded(true);
    }

    this.activePanel = this.activePanel === panel ? 'none' : panel;
    this.refreshPanelVisibility();
  }

  private hidePanels(): void {
    this.activePanel = 'none';
    this.closeTransientSubmitMenus();
    if (this.queueHoveredId) {
      this.queueHoveredId = null;
      this.callbacks.onQueueHover(null);
    }
    this.refreshPanelVisibility();
  }

  private prepareActivePanelContent(): void {
    if (this.activePanel === 'submit') {
      this.syncSubmitFormFromSettings();
      return;
    }
    if (this.activePanel === 'queue') {
      this.renderQueuePanel();
      return;
    }
    if (this.activePanel === 'settings') {
      this.renderSettingsPanel();
    }
  }

  private morphPanelHostSize(previousPanel: PanelType, nextPanel: PanelType): void {
    morphPanelHostSizeContent({
      previousPanel,
      nextPanel,
      getActivePanel: () => this.activePanel,
      submitPanel: this.submitPanel,
      queuePanel: this.queuePanel,
      settingsPanel: this.settingsPanel,
      panelHost: this.panelHost,
      toolbarContainerEasing: this.toolbarContainerEasing,
      shellMorphDurationMs: this.shellMorphDurationMs,
      shellMorphExpandEasing: this.shellMorphExpandEasing,
      panelResizeTimer: this.panelResizeTimer,
      panelMorphTimer: this.panelMorphTimer,
      onPanelResizeTimerChange: (next) => {
        this.panelResizeTimer = next;
      },
      onPanelMorphTimerChange: (next) => {
        this.panelMorphTimer = next;
      }
    });
  }

  private refreshPanelVisibility(): void {
    refreshPanelVisibilityContent({
      activePanel: this.activePanel,
      getActivePanel: () => this.activePanel,
      renderedPanel: this.renderedPanel,
      submitPanel: this.submitPanel,
      queuePanel: this.queuePanel,
      settingsPanel: this.settingsPanel,
      panelHost: this.panelHost,
      panelVisibilityTimer: this.panelVisibilityTimer,
      panelResizeTimer: this.panelResizeTimer,
      panelMorphTimer: this.panelMorphTimer,
      onPanelVisibilityTimerChange: (next) => {
        this.panelVisibilityTimer = next;
      },
      onPanelResizeTimerChange: (next) => {
        this.panelResizeTimer = next;
      },
      onPanelMorphTimerChange: (next) => {
        this.panelMorphTimer = next;
      },
      prepareActivePanelContent: () => {
        this.prepareActivePanelContent();
      },
      morphPanelHostSize: (previousPanel, nextPanel) => {
        this.morphPanelHostSize(previousPanel, nextPanel);
      },
      onRenderedPanelChange: (next) => {
        this.renderedPanel = next;
      }
    });
  }

  private renderQueuePanel(): void {
    renderQueuePanelContent({
      palette: this.getPanelPalette(),
      darkMode: this.colorMode === 'dark',
      queuePanel: this.queuePanel,
      queueList: this.queueList,
      queueSubmitButton: this.queueSubmitButton,
      queueClearButton: this.queueClearButton,
      queueEmpty: this.queueEmpty,
      queueItems: this.queueItems,
      queueHoveredId: this.queueHoveredId,
      submitting: this.submitting,
      makeIconButton: (label, icon) => this.makeIconButton(label, icon),
      onQueueDelete: (id) => this.callbacks.onQueueDelete(id),
      onQueueHover: (id) => this.callbacks.onQueueHover(id),
      setQueueHovered: (id) => {
        this.queueHoveredId = id;
      }
    });
  }

  private renderSettingsPanel(): void {
    renderSettingsPanelContent({
      settingsPanel: this.settingsPanel,
      palette: this.getPanelPalette(),
      colorMode: this.colorMode,
      settingsState: this.settingsState,
      makeIconButton: (label, icon) => this.makeIconButton(label, icon),
      onToggleTheme: () => {
        this.colorMode = this.colorMode === 'dark' ? 'light' : 'dark';
        this.syncToolbarShell();
        this.syncMarkersUi();
        this.renderQueuePanel();
        this.renderSettingsPanel();
      },
      onOpenSettingsPage: () => {
        this.callbacks.onOpenSettingsPage();
      }
    });
  }

  private ensureMotionStyles(): void {
    if (document.getElementById('notiv-toolbar-motion-style')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'notiv-toolbar-motion-style';
    style.textContent = `
      @keyframes notiv-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes notiv-shimmer {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
    `;
    document.head.appendChild(style);
  }

  private getToolbarModePalette(): ToolbarModePalette {
    return resolveToolbarModePalette(this.colorMode);
  }

  private getToolbarControlPalette(): ToolbarControlPalette {
    return resolveToolbarControlPalette(this.colorMode);
  }

  private applyToolbarControlMode(): void {
    const palette = this.getToolbarControlPalette();
    const controlRadiusPx = this.toolbarOuterRadiusPx - this.toolbarInsetPx;
    const controls: HTMLButtonElement[] = [
      this.markersButton,
      this.queueButton,
      this.settingsButton,
      this.collapseButton
    ];
    controls.forEach((button) => {
      button.style.background = 'transparent';
      button.style.border = 'none';
      button.style.borderColor = 'transparent';
      button.style.borderRadius = `${controlRadiusPx}px`;
      button.style.color = palette.buttonColor;
      button.style.boxShadow = 'none';
      button.dataset.notivRestBackground = 'transparent';
      button.dataset.notivRestBorder = 'transparent';
      button.dataset.notivRestColor = palette.buttonColor;
      button.dataset.notivRestShadow = 'none';
      button.dataset.notivHoverBackground = palette.buttonHoverBackground;
      button.dataset.notivHoverBorder = 'transparent';
      button.dataset.notivHoverColor = palette.buttonHoverColor;
      button.dataset.notivHoverShadow = 'none';
      button.dataset.notivPressedBackground = palette.buttonPressedBackground;
      button.dataset.notivPressedBorder = 'transparent';
      button.dataset.notivPressedColor = palette.buttonHoverColor;
      button.dataset.notivPressedShadow = 'none';
      button.dataset.notivHoverFilter = this.colorMode === 'dark' ? 'brightness(1.1)' : 'brightness(0.9)';
      button.dataset.notivPressedFilter = this.colorMode === 'dark' ? 'brightness(1.06)' : 'brightness(0.86)';
    });

    this.separator.style.background = palette.separator;
    this.collapsedBadge.style.border = `1px solid ${palette.badgeBorder}`;
    this.collapsedBadge.style.background = palette.collapsedBadgeBackground;
    this.collapsedBadge.style.color = palette.collapsedBadgeColor;
    this.queueBadge.style.border = `1px solid ${palette.badgeBorder}`;
    this.queueBadge.style.background = palette.queueBadgeBackground;
    this.queueBadge.style.color = palette.queueBadgeColor;
  }

  private getPanelPalette(): PanelPalette {
    return resolvePanelPalette(this.colorMode);
  }

  private getSubmitDropdownControls(): SubmitDropdownControl[] {
    return [
      this.submitTeamControl,
      this.submitProjectControl,
      this.submitPriorityControl,
      this.submitAssigneeControl
    ];
  }

  private createSubmitDropdownControl(config: {
    select: HTMLSelectElement;
    searchPlaceholder: string;
    getOptions: () => SubmitDropdownOption[];
  }): SubmitDropdownControl {
    const control = createBaseSubmitDropdownControl({
      select: config.select,
      searchPlaceholder: config.searchPlaceholder,
      getOptions: config.getOptions,
      getPalette: () => this.getPanelPalette(),
      onBeforeOpen: () => {
        this.getSubmitDropdownControls().forEach((entry) => {
          if (entry !== control) {
            entry.close();
          }
        });
      }
    });
    return control;
  }

  private createSubmitLabelControl(): SubmitLabelSearchControl {
    return createBaseLabelSearchControl({
      searchPlaceholder: 'Change or add labels...',
      getOptions: () => this.getSubmitLabelOptions(),
      getPalette: () => this.getPanelPalette(),
      isDisabled: () => this.submitting,
      onBeforeOpen: () => {
        this.getSubmitDropdownControls().forEach((control) => control.close());
      },
      onSelect: (value) => {
        if (value.trim().length === 0) {
          return;
        }
        if (this.submitLabelSelection.has(value)) {
          this.submitLabelSelection.delete(value);
        } else {
          this.submitLabelSelection.add(value);
        }
        this.renderSubmitLabelChips();
        this.queuePersistSubmitPreferences();
      }
    });
  }

  private getSubmitLabelOptions(): SubmitLabelSearchOption[] {
    const labelsById = new Map(this.settingsState.labelOptions.map((label) => [label.id, label]));
    return this.settingsState.labelOptions
      .filter((label) => !label.isGroup)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((label) => {
        const parentName = label.parentId ? labelsById.get(label.parentId)?.name ?? '' : '';
        return {
          value: label.id,
          label: parentName ? `${parentName} / ${label.name}` : label.name,
          keywords: parentName ? `${label.name} ${parentName}` : label.name,
          color: label.color,
          checked: this.submitLabelSelection.has(label.id)
        };
      });
  }

  private applyPanelMode(): void {
    applyPanelModeStyles({
      palette: this.getPanelPalette(),
      darkMode: this.colorMode === 'dark',
      submitPanel: this.submitPanel,
      queuePanel: this.queuePanel,
      settingsPanel: this.settingsPanel,
      submitMeta: this.submitMeta,
      submitTitleInput: this.submitTitleInput,
      submitDescriptionInput: this.submitDescriptionInput,
      submitDropdownControls: this.getSubmitDropdownControls(),
      submitLabelControl: this.submitLabelControl,
      queueSubmitButton: this.queueSubmitButton,
      submitConfirmButton: this.submitConfirmButton,
      submitTriageInput: this.submitTriageInput,
      onPublishThemeMode: () => {
        this.publishThemeMode();
      }
    });
  }

  private publishThemeMode(): void {
    document.documentElement.setAttribute('data-notiv-theme', this.colorMode);
    window.dispatchEvent(new CustomEvent('notiv-theme-change', { detail: { mode: this.colorMode } }));
  }
}
