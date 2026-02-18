import { InlineAnnotator, type InlineAnnotatorDraft } from './inline-annotator';
import { UnifiedBadge } from './unified-badge';
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
import { Highlighter } from './highlighter';
import {
  type DraftAnnotation,
  type SettingsState,
  getNoteCreationBlockedMessage,
  toQueueItems
} from './content-session-state';
import {
  copyScreenshot as copyDraftScreenshot,
  submitDrafts as submitDraftAnnotations
} from './content-submission';
import { createContentRuntimeMessageHandler } from './content-runtime-router';
import { resolveSelectionLabel } from './selection-label';
import {
  resolveDraftLabel,
  resolveDraftTargetElement,
  resolveFocusBoundingBox,
  resolveLiveBoundingBoxFromElement
} from './focus-resolver';
import { showToast, showTicketCreatedToast } from './toast';
import { playCapturePop } from './capture-sound';
import { createLinearAuthTooltipController } from './linear-auth-tooltip';
import type { BackgroundResponse, BackgroundToContentMessage } from '../shared/messages';
import type {
  BoundingBox,
  ElementSelection,
  LinearSettings,
  LinearWorkspaceResources
} from '../shared/types';
import { STORAGE_KEYS } from '../shared/constants';
import { EMPTY_LINEAR_RESOURCES } from '../shared/linear-resources';
import { normalizeLinearSettings } from '../shared/linear-settings-client';
import { resolveHighlightColor } from '../shared/highlight-colors';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';
import { sendRuntimeMessage } from '../shared/runtime';

const EMPTY_RESOURCES: LinearWorkspaceResources = EMPTY_LINEAR_RESOURCES;
const DEFAULT_HIGHLIGHT_Z_INDEX = {
  overlay: 2147483582,
  tooltip: 2147483583
} as const;
const QUEUE_HIGHLIGHT_Z_INDEX = {
  overlay: 2147483646,
  tooltip: 2147483647
} as const;

let pickerActive = false;
let toolbarVisible = false;
let selectedElement: Element | null = null;
let selectedClickPoint: { x: number; y: number } | null = null;
let draftAnnotations: DraftAnnotation[] = [];
let editingDraftId: string | null = null;
const componentFocusHighlighter = new Highlighter({
  overlayZIndex: DEFAULT_HIGHLIGHT_Z_INDEX.overlay,
  tooltipZIndex: DEFAULT_HIGHLIGHT_Z_INDEX.tooltip,
  bringToFrontOnShow: true
});
let hoveredDraftId: string | null = null;
let isHoverFromQueue = false;
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
  if (isHoverFromQueue) {
    componentFocusHighlighter.setZIndex(QUEUE_HIGHLIGHT_Z_INDEX.overlay, QUEUE_HIGHLIGHT_Z_INDEX.tooltip);
  } else {
    componentFocusHighlighter.setZIndex(DEFAULT_HIGHLIGHT_Z_INDEX.overlay, DEFAULT_HIGHLIGHT_Z_INDEX.tooltip);
  }

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
    if (!note) return;

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

    const anchorPoint = {
      x: note.fixed ? note.anchorX : note.anchorX - window.scrollX,
      y: note.fixed ? note.anchorY : note.anchorY - window.scrollY
    };

    void inlineAnnotator.open(
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
        anchorPoint,
        onDelete: () => {
          setDrafts(draftAnnotations.filter((entry) => entry.id !== id));
          inlineAnnotator.close();
          annotatorFocusTarget = null;
          syncDraftMarkerVisibility();
          refreshFocusedComponentHighlight();
          editingDraftId = null;
          selectedElement = null;
          selectedClickPoint = null;
          restartDetectorIfReady();
        }
      }
    );
    syncDraftMarkerVisibility();
  },
  onDelete: (id) => {
    setDrafts(draftAnnotations.filter((note) => note.id !== id));
  },
  onHover: (id) => {
    isHoverFromQueue = false;
    unifiedBadge.setHoveredId(id);
    setHoveredDraftId(id);
  }
});
let settingsLoaded = false;

const settingsState: SettingsState = {
  loading: true,
  loadingResources: false,
  accessToken: '',
  resources: EMPTY_RESOURCES,
  markersVisible: true,
  error: undefined
};

function syncDraftMarkerVisibility(): void {
  draftMarkers.setVisible(
    toolbarVisible &&
      pickerActive &&
      settingsState.markersVisible &&
      draftAnnotations.length > 0 &&
      !inlineAnnotator.isOpen()
  );
}

function restartDetectorIfReady(): void {
  if (pickerActive && toolbarVisible) {
    detector.start();
  }
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

function applyWorkspaceResources(resources: LinearWorkspaceResources): void {
  settingsState.resources = resources;
  inlineAnnotator.setTeams(resources.teams);
  unifiedBadge.setResources({
    teams: resources.teams,
    labels: resources.labels,
    users: resources.users
  });
}

function clearWorkspaceResources(): void {
  applyWorkspaceResources(EMPTY_RESOURCES);
}

async function loadResources(): Promise<void> {
  if (!settingsState.accessToken.trim()) {
    clearWorkspaceResources();
    return;
  }

  settingsState.loadingResources = true;

  try {
    const response = await sendRuntimeMessage<BackgroundResponse>({ type: 'linearResourcesGet' });

    if (!response.ok) {
      throw new Error(response.error);
    }

    const nextResources = (response.data as LinearWorkspaceResources | undefined) ?? EMPTY_RESOURCES;
    applyWorkspaceResources(nextResources);
  } catch (resourceError) {
    clearWorkspaceResources();
    settingsState.error = resourceError instanceof Error ? resourceError.message : 'Could not load workspace data.';
  } finally {
    settingsState.loadingResources = false;
  }
}

async function ensureSettingsLoaded(force = false): Promise<void> {
  if (settingsLoaded && !force) return;

  settingsState.loading = true;
  settingsState.error = undefined;

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
    settingsState.markersVisible = markersVisible;
    if (pickerActive) {
      settingsState.markersVisible = true;
      void saveMarkersVisible(true).catch(() => {});
    }
    settingsState.error = undefined;

    await loadResources();
    settingsLoaded = true;
  } catch (loadError) {
    settingsState.error = loadError instanceof Error ? loadError.message : 'Could not load settings.';
  } finally {
    settingsState.loading = false;
  }
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
  unifiedBadge.setItems(toQueueItems(nextDrafts));
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
      syncDraftMarkerVisibility();
      void saveMarkersVisible(true).catch(() => {});
    }
    setHoveredDraftId(null);
    detector.start();
    refreshFocusedComponentHighlight();
    return;
  }

  detector.stop();
  setHoveredDraftId(null);
  if (!inlineAnnotator.isOpen()) {
    annotatorFocusTarget = null;
  }
  syncDraftMarkerVisibility();
  refreshFocusedComponentHighlight();
}

function setToolbarVisible(visible: boolean): void {
  toolbarVisible = visible;
  unifiedBadge.setVisible(visible);
  syncDraftMarkerVisibility();

  if (visible) {
    void ensureSettingsLoaded();
  }

  if (!visible) {
    linearAuthTooltip.clear();
    setPickerActive(false);
    inlineAnnotator.close();
    unifiedBadge.closeQueue();
    annotatorFocusTarget = null;
    editingDraftId = null;
    selectedElement = null;
    selectedClickPoint = null;
    refreshFocusedComponentHighlight();
  }
}

async function submitQueuedDrafts(): Promise<void> {
  await submitDraftAnnotations({
    draftAnnotations,
    settingsState,
    unifiedBadge,
    getSubmissionSettings: () => unifiedBadge.getSettings(),
    setDrafts,
    sendRuntimeMessage,
    showToast,
    showTicketCreatedToast
  });
}

async function copyQueuedScreenshot(): Promise<void> {
  await copyDraftScreenshot({
    draftAnnotations,
    unifiedBadge,
    sendRuntimeMessage
  });
}

const detector = new ElementDetector({
  onHover: () => {
    return;
  },
  onSelect: (selection, element, pointer) => {
    const blockedMessage = getNoteCreationBlockedMessage(settingsState);
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
    void inlineAnnotator.open(selection, { anchorPoint: pointer });
    syncDraftMarkerVisibility();
  }
});

function handleAnnotatorSubmit(
  selection: ElementSelection,
  draft: InlineAnnotatorDraft,
  immediate: boolean
): void {
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
    inlineAnnotator.close();
    annotatorFocusTarget = null;
    syncDraftMarkerVisibility();
    refreshFocusedComponentHighlight();
    restartDetectorIfReady();
    return;
  }

  if (!selectedElement) {
    showToast('Could not read selected element. Please try again.', undefined, 'error');
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
  void playCapturePop();
  inlineAnnotator.close();
  annotatorFocusTarget = null;
  syncDraftMarkerVisibility();
  refreshFocusedComponentHighlight();
  selectedElement = null;
  selectedClickPoint = null;
  restartDetectorIfReady();

  if (immediate) {
    const blockedMessage = getNoteCreationBlockedMessage(settingsState);
    if (blockedMessage) {
      showToast(blockedMessage, undefined, 'error');
      return;
    }
    void submitQueuedDrafts();
  }
}

function handleAnnotatorCancel(): void {
  inlineAnnotator.close();
  annotatorFocusTarget = null;
  syncDraftMarkerVisibility();
  refreshFocusedComponentHighlight();
  editingDraftId = null;
  selectedElement = null;
  selectedClickPoint = null;
  restartDetectorIfReady();
}

const inlineAnnotator = new InlineAnnotator(handleAnnotatorSubmit, handleAnnotatorCancel);

const unifiedBadge = new UnifiedBadge({
  onBadgeClick: () => {
    if (!pickerActive) {
      setPickerActive(true);
      void syncPickerState(true);
      void ensureSettingsLoaded();
    }
  },
  onSubmit: () => {
    void submitQueuedDrafts();
  },
  onCopyScreenshot: () => {
    void copyQueuedScreenshot();
  },
  onClear: () => {
    setDrafts([]);
  },
  onDelete: (id: string) => {
    setDrafts(draftAnnotations.filter((note) => note.id !== id));
  },
  onHover: (id: string | null) => {
    isHoverFromQueue = id !== null;
    draftMarkers.setHoveredNoteId(id);
    setHoveredDraftId(id);
  },
  onEdit: (id: string) => {
    unifiedBadge.closeQueue();
    draftMarkers.requestEdit(id);
  },
  onOpenSettings: () => {
    void sendRuntimeMessage({ type: 'openSettingsPage' });
  }
});

setToolbarVisible(false);
setDrafts([]);
draftMarkers.setMarkerClickBehavior('edit');
void loadMarkersVisible().then((visible) => {
  settingsState.markersVisible = visible;
  syncDraftMarkerVisibility();
}).catch(() => {});

const handleFocusedHighlightViewportUpdate = (): void => {
  if (!annotatorFocusTarget && !hoveredDraftId) return;
  refreshFocusedComponentHighlight();
};

window.addEventListener('scroll', handleFocusedHighlightViewportUpdate, true);
window.addEventListener('resize', handleFocusedHighlightViewportUpdate, true);

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented) return;

  if ((event.metaKey || event.ctrlKey) && event.altKey && event.key === 'x') {
    event.preventDefault();
    void copyQueuedScreenshot();
    return;
  }

  if (event.key !== 'Escape') return;

  if (inlineAnnotator.isOpen()) {
    inlineAnnotator.close();
    editingDraftId = null;
    selectedElement = null;
    selectedClickPoint = null;
    restartDetectorIfReady();
    return;
  }

  if (unifiedBadge.isQueueVisible()) {
    if (unifiedBadge.hasOpenDropdown()) {
      unifiedBadge.closeDropdowns();
      return;
    }
    unifiedBadge.closeQueue();
    return;
  }

  if (pickerActive) {
    setPickerActive(false);
    void syncPickerState(false);
  }
});

const handleRuntimeMessage = createContentRuntimeMessageHandler({
  getSelectedElement: () => selectedElement,
  getSelectedClickPoint: () => selectedClickPoint,
  prepareCaptureUi,
  restoreCaptureUi,
  setToolbarVisible,
  setPickerActive,
  unifiedBadge
});

chrome.runtime.onMessage.addListener(
  (
    message: BackgroundToContentMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => handleRuntimeMessage(message, sender, sendResponse)
);
