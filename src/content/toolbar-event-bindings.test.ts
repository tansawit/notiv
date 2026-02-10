import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SubmitDropdownControl, SubmitLabelSearchControl } from './base-combobox-control';
import { bindToolbarInteractions } from './toolbar-event-bindings';

function makeDropdownControl(): SubmitDropdownControl {
  return {
    container: document.createElement('div'),
    trigger: document.createElement('button'),
    menu: document.createElement('div'),
    searchInput: document.createElement('input'),
    close: vi.fn(),
    refresh: vi.fn(),
    syncTheme: vi.fn(),
    syncDisabled: vi.fn(),
    contains: vi.fn().mockReturnValue(false)
  };
}

function makeLabelControl(): SubmitLabelSearchControl {
  return {
    container: document.createElement('div'),
    menu: document.createElement('div'),
    searchInput: document.createElement('input'),
    close: vi.fn(),
    refresh: vi.fn(),
    syncTheme: vi.fn(),
    syncDisabled: vi.fn(),
    contains: vi.fn().mockReturnValue(false)
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('bindToolbarInteractions', () => {
  it('wires primary button actions', () => {
    const container = document.createElement('div');
    const collapsedButton = document.createElement('button');
    const markersButton = document.createElement('button');
    const submitConfirmButton = document.createElement('button');
    const queueButton = document.createElement('button');
    const queueSubmitButton = document.createElement('button');
    const queueClearButton = document.createElement('button');
    const submitTitleInput = document.createElement('input');
    const submitTeamSelect = document.createElement('select');
    const submitProjectSelect = document.createElement('select');
    const submitPrioritySelect = document.createElement('select');
    const submitAssigneeSelect = document.createElement('select');
    const submitTriageInput = document.createElement('input');
    const settingsButton = document.createElement('button');
    const collapseButton = document.createElement('button');
    const submitLabelControl = makeLabelControl();
    const dropdownControl = makeDropdownControl();

    let expanded = false;
    let activePanel: 'none' | 'submit' | 'queue' | 'settings' = 'none';
    const onExpand = vi.fn();
    const onSettingsPanelOpen = vi.fn();
    const onSubmit = vi.fn();
    const setExpanded = vi.fn((value: boolean) => {
      expanded = value;
    });
    const togglePanel = vi.fn((panel: 'submit' | 'queue' | 'settings') => {
      activePanel = panel;
    });

    const { outsidePointerHandler } = bindToolbarInteractions({
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
      getSubmitDropdownControls: () => [dropdownControl],
      closeTransientSubmitMenus: vi.fn(),
      isSubmitting: () => false,
      getDraftCount: () => 1,
      getQueueItemsCount: () => 1,
      hasRequiredSubmitFields: () => true,
      collectSubmitPayload: () => ({ title: 'Ticket' }),
      getActivePanel: () => activePanel,
      setExpanded,
      hidePanels: vi.fn(),
      togglePanel,
      syncProjectOptionsForSelectedTeam: vi.fn(),
      syncTriageOptionVisibility: vi.fn(),
      syncSubmitState: vi.fn(),
      queuePersistSubmitPreferences: vi.fn(),
      onExpand,
      onCollapse: vi.fn(),
      onSubmit,
      onSettingsPanelOpen,
      onQueueClear: vi.fn(),
      onToggleMarkersVisible: vi.fn()
    });

    collapsedButton.click();
    expect(expanded).toBe(true);
    expect(onExpand).toHaveBeenCalledOnce();

    queueSubmitButton.click();
    expect(togglePanel).toHaveBeenCalledWith('submit');
    expect(onSettingsPanelOpen).toHaveBeenCalledOnce();

    submitConfirmButton.click();
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Ticket' });

    document.removeEventListener('pointerdown', outsidePointerHandler, true);
  });

  it('closes menus and panels for outside pointer target', () => {
    const container = document.createElement('div');
    container.appendChild(document.createElement('button'));
    document.body.appendChild(container);

    const closeTransientSubmitMenus = vi.fn();
    const hidePanels = vi.fn();
    const dropdownControl = makeDropdownControl();
    const submitLabelControl = makeLabelControl();

    const { outsidePointerHandler } = bindToolbarInteractions({
      container,
      collapsedButton: document.createElement('button'),
      markersButton: document.createElement('button'),
      submitConfirmButton: document.createElement('button'),
      queueButton: document.createElement('button'),
      queueSubmitButton: document.createElement('button'),
      queueClearButton: document.createElement('button'),
      submitTitleInput: document.createElement('input'),
      submitTeamSelect: document.createElement('select'),
      submitProjectSelect: document.createElement('select'),
      submitPrioritySelect: document.createElement('select'),
      submitAssigneeSelect: document.createElement('select'),
      submitTriageInput: document.createElement('input'),
      settingsButton: document.createElement('button'),
      collapseButton: document.createElement('button'),
      submitLabelControl,
      getSubmitDropdownControls: () => [dropdownControl],
      closeTransientSubmitMenus,
      isSubmitting: () => false,
      getDraftCount: () => 0,
      getQueueItemsCount: () => 0,
      hasRequiredSubmitFields: () => false,
      collectSubmitPayload: () => ({}),
      getActivePanel: () => 'none',
      setExpanded: vi.fn(),
      hidePanels,
      togglePanel: vi.fn(),
      syncProjectOptionsForSelectedTeam: vi.fn(),
      syncTriageOptionVisibility: vi.fn(),
      syncSubmitState: vi.fn(),
      queuePersistSubmitPreferences: vi.fn(),
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
      onSubmit: vi.fn(),
      onSettingsPanelOpen: vi.fn(),
      onQueueClear: vi.fn(),
      onToggleMarkersVisible: vi.fn()
    });

    outsidePointerHandler({ target: document.body } as unknown as PointerEvent);
    expect(closeTransientSubmitMenus).toHaveBeenCalledOnce();
    expect(hidePanels).toHaveBeenCalledOnce();

    document.removeEventListener('pointerdown', outsidePointerHandler, true);
  });

  it('closes label menu when clicking outside label control but inside toolbar', () => {
    const container = document.createElement('div');
    const insideTarget = document.createElement('button');
    container.appendChild(insideTarget);
    document.body.appendChild(container);

    const hidePanels = vi.fn();
    const closeTransientSubmitMenus = vi.fn();
    const dropdownControl = makeDropdownControl();
    const submitLabelControl = makeLabelControl();

    const { outsidePointerHandler } = bindToolbarInteractions({
      container,
      collapsedButton: document.createElement('button'),
      markersButton: document.createElement('button'),
      submitConfirmButton: document.createElement('button'),
      queueButton: document.createElement('button'),
      queueSubmitButton: document.createElement('button'),
      queueClearButton: document.createElement('button'),
      submitTitleInput: document.createElement('input'),
      submitTeamSelect: document.createElement('select'),
      submitProjectSelect: document.createElement('select'),
      submitPrioritySelect: document.createElement('select'),
      submitAssigneeSelect: document.createElement('select'),
      submitTriageInput: document.createElement('input'),
      settingsButton: document.createElement('button'),
      collapseButton: document.createElement('button'),
      submitLabelControl,
      getSubmitDropdownControls: () => [dropdownControl],
      closeTransientSubmitMenus,
      isSubmitting: () => false,
      getDraftCount: () => 0,
      getQueueItemsCount: () => 0,
      hasRequiredSubmitFields: () => false,
      collectSubmitPayload: () => ({}),
      getActivePanel: () => 'submit',
      setExpanded: vi.fn(),
      hidePanels,
      togglePanel: vi.fn(),
      syncProjectOptionsForSelectedTeam: vi.fn(),
      syncTriageOptionVisibility: vi.fn(),
      syncSubmitState: vi.fn(),
      queuePersistSubmitPreferences: vi.fn(),
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
      onSubmit: vi.fn(),
      onSettingsPanelOpen: vi.fn(),
      onQueueClear: vi.fn(),
      onToggleMarkersVisible: vi.fn()
    });

    outsidePointerHandler({ target: insideTarget } as unknown as PointerEvent);

    expect(dropdownControl.close).toHaveBeenCalledOnce();
    expect(submitLabelControl.close).toHaveBeenCalledOnce();
    expect(closeTransientSubmitMenus).not.toHaveBeenCalled();
    expect(hidePanels).not.toHaveBeenCalled();

    document.removeEventListener('pointerdown', outsidePointerHandler, true);
  });
});
