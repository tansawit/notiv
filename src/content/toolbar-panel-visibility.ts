export type ToolbarPanelType = 'none' | 'submit' | 'queue' | 'settings';

interface ToolbarPanelElements {
  submitPanel: HTMLDivElement;
  queuePanel: HTMLDivElement;
  settingsPanel: HTMLDivElement;
  panelHost: HTMLDivElement;
}

interface TimerAccessors {
  panelVisibilityTimer: number | null;
  panelResizeTimer: number | null;
  panelMorphTimer: number | null;
  onPanelVisibilityTimerChange: (next: number | null) => void;
  onPanelResizeTimerChange: (next: number | null) => void;
  onPanelMorphTimerChange: (next: number | null) => void;
}

interface MorphPanelHostSizeInput extends ToolbarPanelElements {
  previousPanel: ToolbarPanelType;
  nextPanel: ToolbarPanelType;
  getActivePanel: () => ToolbarPanelType;
  toolbarContainerEasing: string;
  shellMorphDurationMs: number;
  shellMorphExpandEasing: string;
  panelResizeTimer: number | null;
  panelMorphTimer: number | null;
  onPanelResizeTimerChange: (next: number | null) => void;
  onPanelMorphTimerChange: (next: number | null) => void;
}

interface RefreshPanelVisibilityInput extends ToolbarPanelElements, TimerAccessors {
  activePanel: ToolbarPanelType;
  getActivePanel: () => ToolbarPanelType;
  renderedPanel: ToolbarPanelType;
  prepareActivePanelContent: () => void;
  morphPanelHostSize: (previousPanel: ToolbarPanelType, nextPanel: ToolbarPanelType) => void;
  onRenderedPanelChange: (next: ToolbarPanelType) => void;
}

function getPanelIndex(panel: ToolbarPanelType): number {
  if (panel === 'queue') {
    return 0;
  }
  if (panel === 'submit') {
    return 1;
  }
  if (panel === 'settings') {
    return 2;
  }
  return -1;
}

function panelHostTransition(
  toolbarContainerEasing: string,
  shellMorphDurationMs: number,
  shellMorphExpandEasing: string
): string {
  return [
    'opacity 150ms ease',
    `transform 170ms ${toolbarContainerEasing}`,
    `width ${shellMorphDurationMs}ms ${shellMorphExpandEasing}`,
    `height ${shellMorphDurationMs}ms ${shellMorphExpandEasing}`
  ].join(', ');
}

export function getPanelElementByType(
  panel: ToolbarPanelType,
  elements: Pick<ToolbarPanelElements, 'submitPanel' | 'queuePanel' | 'settingsPanel'>
): HTMLDivElement | null {
  if (panel === 'submit') {
    return elements.submitPanel;
  }
  if (panel === 'queue') {
    return elements.queuePanel;
  }
  if (panel === 'settings') {
    return elements.settingsPanel;
  }
  return null;
}

export function morphPanelHostSize(input: MorphPanelHostSizeInput): void {
  const {
    previousPanel,
    nextPanel,
    getActivePanel,
    submitPanel,
    queuePanel,
    settingsPanel,
    panelHost,
    panelResizeTimer,
    panelMorphTimer,
    toolbarContainerEasing,
    shellMorphDurationMs,
    shellMorphExpandEasing,
    onPanelResizeTimerChange,
    onPanelMorphTimerChange
  } = input;

  const fromPanel = getPanelElementByType(previousPanel, { submitPanel, queuePanel, settingsPanel });
  const toPanel = getPanelElementByType(nextPanel, { submitPanel, queuePanel, settingsPanel });
  if (!fromPanel || !toPanel) {
    return;
  }

  const fromIndex = getPanelIndex(previousPanel);
  const toIndex = getPanelIndex(nextPanel);
  const goingForward = toIndex > fromIndex;
  const slideDistance = 20;
  const slideDuration = 200;
  const slideEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';

  fromPanel.style.display = 'grid';
  const fromRect = fromPanel.getBoundingClientRect();

  toPanel.style.display = 'grid';
  toPanel.style.visibility = 'hidden';
  toPanel.style.pointerEvents = 'none';
  const toRect = toPanel.getBoundingClientRect();
  toPanel.style.visibility = '';
  toPanel.style.pointerEvents = '';

  const maxWidth = Math.max(Math.round(fromRect.width), Math.round(toRect.width));
  const maxHeight = Math.max(Math.round(fromRect.height), Math.round(toRect.height));

  panelHost.style.transition = 'none';
  panelHost.style.width = `${maxWidth}px`;
  panelHost.style.height = `${maxHeight}px`;
  panelHost.style.overflow = 'hidden';

  fromPanel.style.position = 'absolute';
  fromPanel.style.bottom = '0';
  fromPanel.style.left = '0';
  fromPanel.style.right = '0';
  fromPanel.style.opacity = '1';
  fromPanel.style.transform = 'translateX(0)';
  fromPanel.style.transition = `opacity ${slideDuration}ms ${slideEasing}, transform ${slideDuration}ms ${slideEasing}`;

  toPanel.style.position = 'absolute';
  toPanel.style.bottom = '0';
  toPanel.style.left = '0';
  toPanel.style.right = '0';
  toPanel.style.opacity = '0';
  toPanel.style.transform = `translateX(${goingForward ? slideDistance : -slideDistance}px)`;
  toPanel.style.transition = `opacity ${slideDuration}ms ${slideEasing}, transform ${slideDuration}ms ${slideEasing}`;
  toPanel.style.display = 'grid';

  void panelHost.offsetHeight;

  window.requestAnimationFrame(() => {
    fromPanel.style.opacity = '0';
    fromPanel.style.transform = `translateX(${goingForward ? -slideDistance : slideDistance}px)`;
    toPanel.style.opacity = '1';
    toPanel.style.transform = 'translateX(0)';
  });

  const resizeDelay = slideDuration;
  if (panelResizeTimer) {
    window.clearTimeout(panelResizeTimer);
  }
  onPanelResizeTimerChange(
    window.setTimeout(() => {
      if (getActivePanel() !== nextPanel) {
        return;
      }
      panelHost.style.transition = panelHostTransition(
        toolbarContainerEasing,
        shellMorphDurationMs,
        shellMorphExpandEasing
      );
      panelHost.style.width = `${Math.round(toRect.width)}px`;
      panelHost.style.height = `${Math.round(toRect.height)}px`;
      onPanelResizeTimerChange(null);
    }, resizeDelay)
  );

  if (panelMorphTimer) {
    window.clearTimeout(panelMorphTimer);
  }
  onPanelMorphTimerChange(
    window.setTimeout(() => {
      if (getActivePanel() !== nextPanel) {
        return;
      }

      fromPanel.style.display = 'none';
      fromPanel.style.position = '';
      fromPanel.style.bottom = '';
      fromPanel.style.left = '';
      fromPanel.style.right = '';
      fromPanel.style.opacity = '';
      fromPanel.style.transform = '';
      fromPanel.style.transition = '';

      toPanel.style.position = '';
      toPanel.style.bottom = '';
      toPanel.style.left = '';
      toPanel.style.right = '';
      toPanel.style.opacity = '';
      toPanel.style.transform = '';
      toPanel.style.transition = '';

      panelHost.style.width = '';
      panelHost.style.height = '';
      panelHost.style.overflow = '';
      panelHost.style.transition = panelHostTransition(
        toolbarContainerEasing,
        shellMorphDurationMs,
        shellMorphExpandEasing
      );
      onPanelMorphTimerChange(null);
    }, resizeDelay + shellMorphDurationMs)
  );
}

function clearPanelTimers(input: TimerAccessors): void {
  const {
    panelVisibilityTimer,
    panelResizeTimer,
    panelMorphTimer,
    onPanelVisibilityTimerChange,
    onPanelResizeTimerChange,
    onPanelMorphTimerChange
  } = input;

  if (panelVisibilityTimer) {
    window.clearTimeout(panelVisibilityTimer);
    onPanelVisibilityTimerChange(null);
  }
  if (panelResizeTimer) {
    window.clearTimeout(panelResizeTimer);
    onPanelResizeTimerChange(null);
  }
  if (panelMorphTimer) {
    window.clearTimeout(panelMorphTimer);
    onPanelMorphTimerChange(null);
  }
}

export function refreshPanelVisibility(input: RefreshPanelVisibilityInput): void {
  const {
    activePanel,
    getActivePanel,
    renderedPanel,
    submitPanel,
    queuePanel,
    settingsPanel,
    panelHost,
    prepareActivePanelContent,
    morphPanelHostSize,
    onRenderedPanelChange
  } = input;

  clearPanelTimers(input);

  if (activePanel === 'none') {
    submitPanel.style.display = 'none';
    queuePanel.style.display = 'none';
    settingsPanel.style.display = 'none';
    onRenderedPanelChange('none');
    panelHost.style.opacity = '0';
    panelHost.style.transform = 'translateY(8px) scale(0.98)';
    panelHost.style.pointerEvents = 'none';
    input.onPanelVisibilityTimerChange(
      window.setTimeout(() => {
        if (getActivePanel() === 'none') {
          panelHost.style.display = 'none';
          panelHost.style.width = '';
          panelHost.style.height = '';
          panelHost.style.overflow = '';
        }
      }, 170)
    );
    return;
  }

  prepareActivePanelContent();

  const previousPanel = renderedPanel;
  const nextPanel = activePanel;
  const shouldMorph = previousPanel !== 'none' && previousPanel !== nextPanel;

  panelHost.style.display = 'block';
  panelHost.style.pointerEvents = 'auto';
  if (shouldMorph) {
    morphPanelHostSize(previousPanel, nextPanel);
  } else {
    submitPanel.style.display = nextPanel === 'submit' ? 'grid' : 'none';
    queuePanel.style.display = nextPanel === 'queue' ? 'grid' : 'none';
    settingsPanel.style.display = nextPanel === 'settings' ? 'grid' : 'none';
    panelHost.style.width = '';
    panelHost.style.height = '';
    panelHost.style.overflow = '';

    window.requestAnimationFrame(() => {
      panelHost.style.opacity = '1';
      panelHost.style.transform = 'translateY(0) scale(1)';
    });
  }

  onRenderedPanelChange(nextPanel);
}
