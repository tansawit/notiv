import type { SubmitDropdownControl, SubmitLabelSearchControl } from './base-combobox-control';

interface BindToolbarInteractionsInput<TSubmitPayload> {
  container: HTMLDivElement;
  collapsedButton: HTMLButtonElement;
  markersButton: HTMLButtonElement;
  submitConfirmButton: HTMLButtonElement;
  queueButton: HTMLButtonElement;
  queueSubmitButton: HTMLButtonElement;
  queueClearButton: HTMLButtonElement;
  submitTitleInput: HTMLInputElement;
  submitTeamSelect: HTMLSelectElement;
  submitProjectSelect: HTMLSelectElement;
  submitPrioritySelect: HTMLSelectElement;
  submitAssigneeSelect: HTMLSelectElement;
  submitTriageInput: HTMLInputElement;
  settingsButton: HTMLButtonElement;
  collapseButton: HTMLButtonElement;
  submitLabelControl: SubmitLabelSearchControl;
  getSubmitDropdownControls: () => SubmitDropdownControl[];
  closeTransientSubmitMenus: () => void;
  isSubmitting: () => boolean;
  getDraftCount: () => number;
  getQueueItemsCount: () => number;
  hasRequiredSubmitFields: () => boolean;
  collectSubmitPayload: () => TSubmitPayload;
  getActivePanel: () => 'none' | 'submit' | 'queue' | 'settings';
  setExpanded: (expanded: boolean) => void;
  hidePanels: () => void;
  togglePanel: (panel: 'submit' | 'queue' | 'settings') => void;
  syncProjectOptionsForSelectedTeam: () => void;
  syncTriageOptionVisibility: () => void;
  syncSubmitState: () => void;
  queuePersistSubmitPreferences: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onSubmit: (payload: TSubmitPayload) => void;
  onSettingsPanelOpen: () => void;
  onQueueClear: () => void;
  onToggleMarkersVisible: () => void;
}

export function bindToolbarInteractions<TSubmitPayload>(
  input: BindToolbarInteractionsInput<TSubmitPayload>
): {
  outsidePointerHandler: (event: PointerEvent) => void;
} {
  const {
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
    getSubmitDropdownControls,
    closeTransientSubmitMenus,
    isSubmitting,
    getDraftCount,
    getQueueItemsCount,
    hasRequiredSubmitFields,
    collectSubmitPayload,
    getActivePanel,
    setExpanded,
    hidePanels,
    togglePanel,
    syncProjectOptionsForSelectedTeam,
    syncTriageOptionVisibility,
    syncSubmitState,
    queuePersistSubmitPreferences,
    onExpand,
    onCollapse,
    onSubmit,
    onSettingsPanelOpen,
    onQueueClear,
    onToggleMarkersVisible
  } = input;

  collapsedButton.addEventListener('click', () => {
    setExpanded(true);
    onExpand();
  });

  markersButton.addEventListener('click', () => {
    hidePanels();
    onToggleMarkersVisible();
  });

  submitConfirmButton.addEventListener('click', () => {
    if (isSubmitting() || getDraftCount() === 0 || !hasRequiredSubmitFields()) {
      return;
    }
    hidePanels();
    onSubmit(collectSubmitPayload());
  });

  queueButton.addEventListener('click', () => {
    togglePanel('queue');
  });

  queueSubmitButton.addEventListener('click', () => {
    if (isSubmitting() || getDraftCount() === 0) {
      return;
    }
    togglePanel('submit');
    if (getActivePanel() === 'submit') {
      onSettingsPanelOpen();
    }
  });

  queueClearButton.addEventListener('click', () => {
    if (getQueueItemsCount() === 0) {
      return;
    }
    onQueueClear();
  });

  submitTitleInput.addEventListener('input', () => {
    syncSubmitState();
  });

  submitTeamSelect.addEventListener('change', () => {
    syncProjectOptionsForSelectedTeam();
    syncTriageOptionVisibility();
    syncSubmitState();
    queuePersistSubmitPreferences();
  });

  submitProjectSelect.addEventListener('change', () => {
    queuePersistSubmitPreferences();
  });

  submitPrioritySelect.addEventListener('change', () => {
    queuePersistSubmitPreferences();
  });

  submitAssigneeSelect.addEventListener('change', () => {
    queuePersistSubmitPreferences();
  });

  submitTriageInput.addEventListener('change', () => {
    queuePersistSubmitPreferences();
  });

  settingsButton.addEventListener('click', () => {
    togglePanel('settings');
    if (getActivePanel() === 'settings') {
      onSettingsPanelOpen();
    }
  });

  collapseButton.addEventListener('click', () => {
    hidePanels();
    setExpanded(false);
    onCollapse();
  });

  const outsidePointerHandler = (event: PointerEvent): void => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    const withinDropdown = getSubmitDropdownControls().some((control) => control.contains(target));
    const withinLabelMenus = submitLabelControl.contains(target);
    if (!container.contains(target) && !withinDropdown && !withinLabelMenus) {
      closeTransientSubmitMenus();
      hidePanels();
      return;
    }

    if (!withinDropdown) {
      getSubmitDropdownControls().forEach((control) => control.close());
    }
    if (!withinLabelMenus) {
      submitLabelControl.close();
    }
  };

  document.addEventListener('pointerdown', outsidePointerHandler, true);

  return { outsidePointerHandler };
}
