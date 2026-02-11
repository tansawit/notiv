import { Annotator } from './annotator';
import {
  detectBrowser,
  detectOS,
  getComputedStylesSnapshot,
  isElementFixedOrSticky,
  sanitizeCapturedUrl
} from './annotation-metadata';
import { prepareCaptureUi, restoreCaptureUi } from './capture-overlay';
import { ElementDetector } from './detector';
import { DraftMarkers } from './draft-markers';
import { FeedbackToolbar, type QueueNoteSummary, type ToolbarSettingsState, type ToolbarSubmitPayload } from './toolbar';
import { Highlighter } from './highlighter';
import { resolveSelectionLabel } from './selection-label';
import {
  resolveDraftLabel,
  resolveDraftTargetElement,
  resolveFocusBoundingBox,
  resolveLiveBoundingBoxFromElement
} from './focus-resolver';
import {
  dismissToast,
  showSubmittingTicketToast,
  showTicketCreateErrorToast,
  showTicketCreatedToast,
  showToast
} from './toast';
import { createLinearAuthTooltipController } from './linear-auth-tooltip';
import type { BackgroundResponse, BackgroundToContentMessage } from '../shared/messages';
import type {
  Annotation,
  BoundingBox,
  ElementSelection,
  LinearSettings,
  LinearWorkspaceResources
} from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { EMPTY_LINEAR_RESOURCES } from '../shared/linear-resources';
import { maskAccessToken, normalizeLinearSettings } from '../shared/linear-settings-client';
import {
  resolveHighlightColor
} from '../shared/highlight-colors';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';
import { sendRuntimeMessage } from '../shared/runtime';

type DraftAnnotation = Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'> & {
  anchorX: number;
  anchorY: number;
  fixed?: boolean;
};

interface SettingsState {
  loading: boolean;
  savingToken: boolean;
  loadingResources: boolean;
  accessToken: string;
  tokenDraft: string;
  tokenEditing: boolean;
  resources: LinearWorkspaceResources;
  markersVisible: boolean;
  notice?: string;
  error?: string;
}

const EMPTY_RESOURCES: LinearWorkspaceResources = EMPTY_LINEAR_RESOURCES;

let pickerActive = false;
let toolbarVisible = false;
let selectedElement: Element | null = null;
let selectedClickPoint: { x: number; y: number } | null = null;
let draftAnnotations: DraftAnnotation[] = [];
let editingDraftId: string | null = null;
const componentFocusHighlighter = new Highlighter({
  overlayZIndex: 2147483582,
  tooltipZIndex: 2147483583,
  bringToFrontOnShow: true
});
let hoveredDraftId: string | null = null;
let annotatorFocusTarget: {
  label: string;
  targetElement?: HTMLElement | null;
  elementPath?: string;
  fallbackBoundingBox?: BoundingBox;
  anchorX?: number;
  anchorY?: number;
  fixed?: boolean;
} | null = null;
const linearAuthTooltip = createLinearAuthTooltipController();

function refreshFocusedComponentHighlight(): void {
  if (annotatorFocusTarget) {
    const box = resolveFocusBoundingBox(annotatorFocusTarget);
    if (box) {
      componentFocusHighlighter.show(box);
      return;
    }
  } else if (hoveredDraftId) {
    const note = draftAnnotations.find((item) => item.id === hoveredDraftId);
    if (note) {
      const live = resolveDraftTargetElement(note);
      const box = resolveLiveBoundingBoxFromElement(live)
        ?? resolveFocusBoundingBox({
          elementPath: note.elementPath,
          fallbackBoundingBox: note.boundingBox,
          anchorX: note.anchorX,
          anchorY: note.anchorY,
          fixed: note.fixed
        });
      if (box) {
        componentFocusHighlighter.show(box);
        return;
      }
    }
  }

  componentFocusHighlighter.hide();
}

function setHoveredDraftId(id: string | null): void {
  hoveredDraftId = id;
  refreshFocusedComponentHighlight();
}

const draftMarkers = new DraftMarkers({
  onEditRequest: (id) => {
    const note = draftAnnotations.find((item) => item.id === id);
    if (!note) {
      return;
    }

    editingDraftId = id;
    detector.stop();
    setHoveredDraftId(null);
    annotatorFocusTarget = {
      targetElement: resolveDraftTargetElement(note),
      elementPath: note.elementPath,
      fallbackBoundingBox: note.boundingBox,
      anchorX: note.anchorX,
      anchorY: note.anchorY,
      fixed: note.fixed,
      label: resolveDraftLabel(note)
    };
    refreshFocusedComponentHighlight();
    selectedElement = null;
    selectedClickPoint = null;
    annotator.open(
      {
        elementPath: note.elementPath,
        tag: note.element,
        elementLabel: note.elementLabel,
        classes: note.cssClasses ?? [],
        reactComponents: note.reactComponents ?? [],
        boundingBox: note.boundingBox ?? {
          x: Math.max(0, note.x - 40),
          y: Math.max(0, note.y - 18),
          width: 80,
          height: 36
        },
        accessibility: note.accessibility ?? {}
      },
      {
        initialDraft: {
          comment: note.comment,
          attachments: note.attachments ?? [],
          highlightColor: resolveHighlightColor(note.highlightColor)
        },
        title: 'Edit Note',
        submitLabel: 'Update note',
        onDelete: () => {
          setDrafts(draftAnnotations.filter((entry) => entry.id !== id));
          annotator.close();
          annotatorFocusTarget = null;
          syncDraftMarkerVisibility();
          refreshFocusedComponentHighlight();
          editingDraftId = null;
          selectedElement = null;
          selectedClickPoint = null;
          if (pickerActive && toolbarVisible) {
            detector.start();
          }
        },
        anchorPoint: {
          x: note.fixed ? note.anchorX : note.anchorX - window.scrollX,
          y: note.fixed ? note.anchorY : note.anchorY - window.scrollY
        }
      }
    );
    syncDraftMarkerVisibility();
  },
  onDelete: (id) => {
    setDrafts(draftAnnotations.filter((note) => note.id !== id));
  },
  onHover: (id) => {
    toolbar.setQueueHoveredNoteId(id);
    setHoveredDraftId(id);
  }
});
let settingsLoaded = false;

const settingsState: SettingsState = {
  loading: true,
  savingToken: false,
  loadingResources: false,
  accessToken: '',
  tokenDraft: '',
  tokenEditing: true,
  resources: EMPTY_RESOURCES,
  markersVisible: true,
  notice: undefined,
  error: undefined
};

function syncDraftMarkerVisibility(): void {
  draftMarkers.setVisible(
    toolbarVisible &&
      pickerActive &&
      settingsState.markersVisible &&
      draftAnnotations.length > 0 &&
      !annotator.isOpen()
  );
}

async function syncPickerState(active: boolean): Promise<void> {
  try {
    await sendRuntimeMessage<BackgroundResponse>({
      type: 'setPickerActive',
      payload: { active }
    });
  } catch {
    return;
  }
}

function loadMarkersVisible(): Promise<boolean> {
  return getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.markersVisible]).then((items) => {
    const value = items?.[STORAGE_KEYS.markersVisible];
    return value !== false;
  });
}

function saveMarkersVisible(visible: boolean): Promise<void> {
  return setLocalStorageItems({ [STORAGE_KEYS.markersVisible]: visible });
}

function toQueueItems(notes: DraftAnnotation[]): QueueNoteSummary[] {
  return notes.map((note) => {
    const component = note.componentName ?? note.reactComponents?.[0];
    return {
      id: note.id,
      comment: note.comment,
      target: note.elementLabel ?? (component ? component : note.element),
      attachmentsCount: note.attachments?.length ?? 0,
      highlightColor: resolveHighlightColor(note.highlightColor)
    };
  });
}

function toToolbarSettingsState(state: SettingsState): ToolbarSettingsState {
  const teamOptions = state.resources.teams;
  const projectOptions = state.resources.projects;
  const labelOptions = state.resources.labels;
  const userOptions = state.resources.users;
  const hasToken = Boolean(state.accessToken.trim());
  const hasError = Boolean(state.error?.trim());

  return {
    loading: state.loading,
    connected: hasToken && !hasError,
    viewerName: state.resources.viewerName,
    organizationName: state.resources.organizationName,
    tokenEditing: state.tokenEditing,
    tokenDraft: state.tokenDraft,
    tokenMasked: maskAccessToken(state.accessToken),
    teamOptions,
    projectOptions,
    labelOptions,
    userOptions,
    loadingResources: state.loadingResources,
    savingToken: state.savingToken,
    markersVisible: state.markersVisible,
    notice: state.notice,
    error: state.error
  };
}

function publishSettingsState(): void {
  if (!toolbar) {
    return;
  }
  toolbar.setSettingsState(toToolbarSettingsState(settingsState));
}

function hasLinearAuthError(error?: string): boolean {
  if (!error) {
    return false;
  }
  const message = error.toLowerCase();
  return (
    message.includes('401')
    || message.includes('403')
    || message.includes('unauthorized')
    || message.includes('not connected')
    || (message.includes('invalid') && message.includes('token'))
    || (message.includes('expired') && message.includes('token'))
  );
}

function getNoteCreationBlockedMessage(): string | null {
  if (settingsState.loading || settingsState.loadingResources || settingsState.savingToken) {
    return 'Checking Linear connection. Try creating the note again in a second.';
  }

  if (!settingsState.accessToken.trim()) {
    return 'Connect Linear first. Open extension settings and complete OAuth, then refresh workspace data.';
  }

  if (settingsState.error) {
    if (hasLinearAuthError(settingsState.error)) {
      return 'Linear session is invalid or expired. Reconnect in extension settings, then refresh workspace data.';
    }
    return `Linear connection error: ${settingsState.error}`;
  }

  return null;
}

async function loadResources(): Promise<void> {
  if (!settingsState.accessToken.trim()) {
    settingsState.resources = EMPTY_RESOURCES;
    publishSettingsState();
    return;
  }

  settingsState.loadingResources = true;
  publishSettingsState();

  try {
    const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'linearResourcesGet' });

    if (!response.ok) {
      throw new Error(response.error);
    }

    const nextResources = (response.data as LinearWorkspaceResources | undefined) ?? EMPTY_RESOURCES;
    settingsState.resources = nextResources;
  } catch (resourceError) {
    settingsState.resources = EMPTY_RESOURCES;
    settingsState.error = resourceError instanceof Error ? resourceError.message : 'Could not load workspace data.';
  } finally {
    settingsState.loadingResources = false;
    publishSettingsState();
  }
}

async function ensureSettingsLoaded(force = false): Promise<void> {
  if (settingsLoaded && !force) {
    publishSettingsState();
    return;
  }

  settingsState.loading = true;
  settingsState.notice = undefined;
  settingsState.error = undefined;
  publishSettingsState();

  try {
    const [response, markersVisible] = await Promise.all([
      sendRuntimeMessage<BackgroundResponse>({ type: 'linearSettingsGet' }),
      loadMarkersVisible()
    ]);
    if (!response.ok) {
      throw new Error(response.error);
    }

    const normalized = normalizeLinearSettings(response.data as LinearSettings);
    settingsState.accessToken = normalized.accessToken;
    settingsState.tokenDraft = normalized.accessToken;
    settingsState.tokenEditing = !normalized.accessToken.trim();
    settingsState.markersVisible = markersVisible;
    if (pickerActive) {
      settingsState.markersVisible = true;
      void saveMarkersVisible(true).catch(() => {
        // Marker visibility state will reconcile on next successful storage read.
      });
    }
    settingsState.error = undefined;

    await loadResources();
    settingsLoaded = true;
  } catch (loadError) {
    settingsState.error = loadError instanceof Error ? loadError.message : 'Could not load settings.';
  } finally {
    settingsState.loading = false;
    publishSettingsState();
  }
}

async function refreshLinearResourcesOnExpand(): Promise<void> {
  await ensureSettingsLoaded();
  if (!settingsState.accessToken.trim()) {
    return;
  }
  if (settingsState.loadingResources || settingsState.savingToken) {
    return;
  }
  await loadResources();
}

function setDrafts(nextDrafts: DraftAnnotation[]): void {
  draftAnnotations = nextDrafts;
  if (hoveredDraftId && !nextDrafts.some((note) => note.id === hoveredDraftId)) {
    hoveredDraftId = null;
  }
  if (editingDraftId && !nextDrafts.some((note) => note.id === editingDraftId)) {
    editingDraftId = null;
    annotatorFocusTarget = null;
  }
  toolbar.setDraftCount(nextDrafts.length);
  toolbar.setQueueItems(toQueueItems(nextDrafts));
  draftMarkers.setNotes(
    nextDrafts.map((note) => ({
      target: note.elementLabel ?? note.componentName ?? note.reactComponents?.[0] ?? note.element,
      id: note.id,
      comment: note.comment,
      anchorX: note.anchorX,
      anchorY: note.anchorY,
      fixed: note.fixed,
      attachments: note.attachments,
      highlightColor: resolveHighlightColor(note.highlightColor)
    }))
  );
  syncDraftMarkerVisibility();
  refreshFocusedComponentHighlight();
}

function setPickerActive(active: boolean): void {
  pickerActive = active;

  if (active) {
    if (!settingsState.markersVisible) {
      settingsState.markersVisible = true;
      publishSettingsState();
      syncDraftMarkerVisibility();
      void saveMarkersVisible(true).catch(() => {
        // Marker visibility state will reconcile on next successful storage read.
      });
    }
    setHoveredDraftId(null);
    detector.start();
    refreshFocusedComponentHighlight();
    return;
  }

  detector.stop();
  setHoveredDraftId(null);
  if (!annotator.isOpen()) {
    annotatorFocusTarget = null;
  }
  syncDraftMarkerVisibility();
  refreshFocusedComponentHighlight();
}

function setToolbarVisible(visible: boolean): void {
  toolbarVisible = visible;
  toolbar.setVisible(visible);
  syncDraftMarkerVisibility();

  if (visible) {
    void ensureSettingsLoaded();
  }

  if (!visible) {
    linearAuthTooltip.clear();
    setPickerActive(false);
    annotator.close();
    annotatorFocusTarget = null;
    editingDraftId = null;
    selectedElement = null;
    selectedClickPoint = null;
    refreshFocusedComponentHighlight();
  }
}

function toSubmissionAnnotation(note: DraftAnnotation): Omit<Annotation, 'screenshot' | 'screenshotViewport' | 'linearIssue'> {
  const { anchorX, anchorY, fixed, ...annotation } = note;
  void anchorX;
  void anchorY;
  void fixed;
  return annotation;
}

async function submitDrafts(payload: ToolbarSubmitPayload): Promise<void> {
  if (draftAnnotations.length === 0) {
    showToast('No notes to submit yet.', undefined, 'error');
    return;
  }

  toolbar.setSubmitting(true);
  const submittingToastId = showSubmittingTicketToast();

  try {
    const preferredTeamId = payload.teamId?.trim();
    const selectedTeam =
      settingsState.resources.teams.find((team) => team.id === preferredTeamId)
      ?? settingsState.resources.teams[0];
    if (!selectedTeam) {
      throw new Error('No Linear team found for this workspace.');
    }
    const response = await sendRuntimeMessage<BackgroundResponse>({
      type: 'captureAndCreateGroupedIssue',
      payload: {
        annotations: draftAnnotations.map((note) => toSubmissionAnnotation(note)),
        overrides: {
          teamId: selectedTeam.id,
          title: payload.title?.trim() || undefined,
          description: payload.description?.trim() || undefined,
          priority: payload.priority,
          projectId: payload.projectId?.trim() || undefined,
          assigneeId: payload.assigneeId?.trim() || undefined,
          labelIds: payload.labelIds,
          triage: payload.triage,
          triageStateId: selectedTeam?.triageStateId
        }
      }
    });
    if (!response.ok) {
      throw new Error(response.error);
    }

    const issue = (response.data as { identifier?: string; url?: string } | undefined) ?? {};

    setDrafts([]);
    toolbar.clearSubmitInputs();
    dismissToast(submittingToastId);
    showTicketCreatedToast(issue);
  } catch (error) {
    dismissToast(submittingToastId);
    showTicketCreateErrorToast(`Failed to submit notes: ${error instanceof Error ? error.message : 'Unexpected error.'}`);
  } finally {
    toolbar.setSubmitting(false);
  }
}

const detector = new ElementDetector({
  onHover: () => {
    return;
  },
  onSelect: (selection, element, pointer) => {
    const blockedMessage = getNoteCreationBlockedMessage();
    if (blockedMessage) {
      linearAuthTooltip.show(blockedMessage, pointer);
      return;
    }

    linearAuthTooltip.clear();
    setHoveredDraftId(null);
    selectedElement = element;
    selectedClickPoint = pointer;
    detector.stop();
    annotatorFocusTarget = {
      targetElement: element instanceof HTMLElement ? element : null,
      elementPath: selection.elementPath,
      fallbackBoundingBox: selection.boundingBox,
      anchorX: pointer.x,
      anchorY: pointer.y,
      fixed: isElementFixedOrSticky(element),
      label: resolveSelectionLabel(selection)
    };
    refreshFocusedComponentHighlight();
    annotator.open(selection, { anchorPoint: pointer });
    syncDraftMarkerVisibility();
  }
});

const annotator = new Annotator(
  async (selection: ElementSelection, draft) => {
    if (editingDraftId) {
      const targetId = editingDraftId;
      editingDraftId = null;
      setDrafts(
        draftAnnotations.map((note) =>
          note.id === targetId
            ? {
                ...note,
                comment: draft.comment,
                attachments: draft.attachments,
                highlightColor: draft.highlightColor,
                timestamp: Date.now()
              }
            : note
        )
      );
      annotator.close();
      annotatorFocusTarget = null;
      syncDraftMarkerVisibility();
      refreshFocusedComponentHighlight();
      if (pickerActive && toolbarVisible) {
        detector.start();
      }
      showToast('Note updated.');
      return;
    }

    if (!selectedElement) {
      annotator.setError('Could not read selected element. Please try again.');
      return;
    }

    const timestamp = Date.now();
    const markerX = selectedClickPoint?.x ?? selection.boundingBox.x + selection.boundingBox.width / 2;
    const markerY = selectedClickPoint?.y ?? selection.boundingBox.y + selection.boundingBox.height / 2;
    const elementLabel = resolveSelectionLabel(selection);
    const anchoredToFixed = isElementFixedOrSticky(selectedElement);
    const annotation: DraftAnnotation = {
      id: crypto.randomUUID(),
      comment: draft.comment,
      attachments: draft.attachments,
      highlightColor: draft.highlightColor,
      timestamp,
      x: markerX,
      y: markerY,
      anchorX: anchoredToFixed ? markerX : markerX + window.scrollX,
      anchorY: anchoredToFixed ? markerY : markerY + window.scrollY,
      fixed: anchoredToFixed,
      element: selection.tag,
      elementLabel,
      componentName: selection.componentName,
      elementPath: selection.elementPath,
      url: sanitizeCapturedUrl(window.location.href),
      boundingBox: selection.boundingBox,
      reactComponents: selection.reactComponents,
      cssClasses: selection.classes,
      computedStyles: getComputedStylesSnapshot(selectedElement),
      accessibility: selection.accessibility,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      environment: {
        os: detectOS(),
        browser: detectBrowser(),
        resolution: `${window.screen.width}x${window.screen.height}`,
        userAgent: navigator.userAgent
      }
    };

    setDrafts([...draftAnnotations, annotation]);
    annotator.close();
    annotatorFocusTarget = null;
    syncDraftMarkerVisibility();
    refreshFocusedComponentHighlight();
    selectedElement = null;
    selectedClickPoint = null;
    if (pickerActive && toolbarVisible) {
      detector.start();
    }
    // Intentionally no "note added" toast to keep note capture flow quiet.
  },
  () => {
    annotator.close();
    annotatorFocusTarget = null;
    syncDraftMarkerVisibility();
    refreshFocusedComponentHighlight();
    editingDraftId = null;
    selectedElement = null;
    selectedClickPoint = null;
    if (pickerActive && toolbarVisible) {
      detector.start();
    }
  }
);

const toolbar = new FeedbackToolbar({
  onExpand: () => {
    if (!pickerActive) {
      setPickerActive(true);
      void syncPickerState(true);
    }
    void refreshLinearResourcesOnExpand();
  },
  onCollapse: () => {
    if (pickerActive) {
      if (annotator.isOpen()) {
        annotator.close();
        editingDraftId = null;
        selectedElement = null;
        selectedClickPoint = null;
      }
      setPickerActive(false);
      void syncPickerState(false);
    }
  },
  onSubmit: (payload) => {
    void submitDrafts(payload);
  },
  onSettingsPanelOpen: () => {
    void ensureSettingsLoaded();
  },
  onQueueDelete: (id) => {
    setDrafts(draftAnnotations.filter((note) => note.id !== id));
  },
  onQueueHover: (id) => {
    draftMarkers.setHoveredNoteId(id);
    setHoveredDraftId(id);
  },
  onQueueClear: () => {
    setDrafts([]);
  },
  onOpenSettingsPage: () => {
    void sendRuntimeMessage<BackgroundResponse>({ type: 'openSettingsPage' }).catch(() => undefined);
  },
  onToggleMarkersVisible: () => {
    const nextVisible = !settingsState.markersVisible;
    settingsState.markersVisible = nextVisible;
    settingsState.notice = undefined;
    settingsState.error = undefined;
    publishSettingsState();
    syncDraftMarkerVisibility();
    void saveMarkersVisible(nextVisible).catch(() => {
      // Marker visibility state will revert on next successful storage read.
    });
  }
});

publishSettingsState();
setToolbarVisible(false);
setDrafts([]);
draftMarkers.setMarkerClickBehavior('edit');
void loadMarkersVisible().then((visible) => {
  settingsState.markersVisible = visible;
  publishSettingsState();
  syncDraftMarkerVisibility();
}).catch(() => {
  // Keep default marker visibility if storage is unavailable.
});

const handleFocusedHighlightViewportUpdate = (): void => {
  if (!annotatorFocusTarget && !hoveredDraftId) {
    return;
  }
  refreshFocusedComponentHighlight();
};

window.addEventListener('scroll', handleFocusedHighlightViewportUpdate, true);
window.addEventListener('resize', handleFocusedHighlightViewportUpdate, true);

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented) {
    return;
  }

  if (event.key !== 'Escape') {
    return;
  }

  if (annotator.isOpen()) {
    annotator.close();
    editingDraftId = null;
    selectedElement = null;
    selectedClickPoint = null;
    if (pickerActive && toolbarVisible) {
      detector.start();
    }
    return;
  }

  if (pickerActive) {
    setPickerActive(false);
    void syncPickerState(false);
    toolbar.collapse();
  }
});

chrome.runtime.onMessage.addListener((message: BackgroundToContentMessage, _sender, sendResponse) => {
  if (message.type === 'notivPing') {
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'capturePrepare') {
    const fallbackBoundingBox = selectedElement
      ? (() => {
          const rect = selectedElement.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          } satisfies BoundingBox;
        })()
      : undefined;
    const fallbackMarker = selectedClickPoint
      ? { ...selectedClickPoint }
      : undefined;

    void prepareCaptureUi({
      boundingBox: message.payload.boundingBox,
      marker: message.payload.marker,
      highlights: message.payload.highlights,
      markers: message.payload.markers,
      fallbackBoundingBox,
      fallbackMarker
    }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'captureRestore') {
    restoreCaptureUi();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'toolbarVisibilityChanged') {
    setToolbarVisible(message.payload.visible);
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'pickerActivationChanged') {
    setToolbarVisible(true);
    setPickerActive(message.payload.active);
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'issueCreated') {
    showTicketCreatedToast({
      identifier: message.payload.identifier,
      url: message.payload.url
    });
    sendResponse({ ok: true });
    return;
  }

  if (message.type === 'issueCreationFailed') {
    showTicketCreateErrorToast(`Failed to submit feedback: ${message.payload.message}`);
    sendResponse({ ok: true });
    return;
  }

  sendResponse({ ok: false });
});
