import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../shared/constants';
import type { ToolbarSettingsState } from './toolbar';
import { FeedbackToolbar } from './toolbar';

const { getLocalStorageItemsMock, setLocalStorageItemsMock } = vi.hoisted(() => ({
  getLocalStorageItemsMock: vi.fn(),
  setLocalStorageItemsMock: vi.fn()
}));

vi.mock('../shared/chrome-storage', () => ({
  getLocalStorageItems: getLocalStorageItemsMock,
  setLocalStorageItems: setLocalStorageItemsMock
}));

function flushAsyncWork(): Promise<void> {
  return Promise.resolve().then(() => undefined);
}

function createBaseSettings(): ToolbarSettingsState {
  return {
    loading: false,
    connected: true,
    viewerName: 'Viewer',
    organizationName: 'Org',
    tokenEditing: false,
    tokenDraft: '',
    tokenMasked: 'abc***xyz',
    teamOptions: [{ id: 'team-a', key: 'TEAM', name: 'Team A', triageStateId: 'triage-a' }],
    projectOptions: [{ id: 'project-a', name: 'Project A', teamIds: ['team-a'] }],
    labelOptions: [{ id: 'label-a', name: 'Label A', color: '#3366ff', isGroup: false }],
    userOptions: [{ id: 'user-a', name: 'User A' }],
    loadingResources: false,
    savingToken: false,
    markersVisible: true
  };
}

interface ToolbarInternals {
  submitTeamSelect: HTMLSelectElement;
  submitProjectSelect: HTMLSelectElement;
  submitAssigneeSelect: HTMLSelectElement;
  submitPrioritySelect: HTMLSelectElement;
  submitTriageInput: HTMLInputElement;
  submitLabelSelection: Set<string>;
}

describe('FeedbackToolbar submit preferences', () => {
  beforeEach(() => {
    getLocalStorageItemsMock.mockReset();
    setLocalStorageItemsMock.mockReset();
    setLocalStorageItemsMock.mockResolvedValue(undefined);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('hydrates saved submit preferences into controls', async () => {
    getLocalStorageItemsMock.mockResolvedValue({
      [STORAGE_KEYS.submitTeamId]: 'team-a',
      [STORAGE_KEYS.submitProjectId]: 'project-a',
      [STORAGE_KEYS.submitAssigneeId]: 'user-a',
      [STORAGE_KEYS.submitPriority]: '2',
      [STORAGE_KEYS.submitTriage]: true,
      [STORAGE_KEYS.submitLabelIds]: ['label-a']
    });

    const toolbar = new FeedbackToolbar({
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
      onSubmit: vi.fn(),
      onSettingsPanelOpen: vi.fn(),
      onQueueDelete: vi.fn(),
      onQueueHover: vi.fn(),
      onQueueClear: vi.fn(),
      onOpenSettingsPage: vi.fn(),
      onToggleMarkersVisible: vi.fn()
    });

    toolbar.setSettingsState(createBaseSettings());
    await flushAsyncWork();
    await flushAsyncWork();

    const internals = toolbar as unknown as ToolbarInternals;
    expect(internals.submitTeamSelect.value).toBe('team-a');
    expect(internals.submitProjectSelect.value).toBe('project-a');
    expect(internals.submitAssigneeSelect.value).toBe('user-a');
    expect(internals.submitPrioritySelect.value).toBe('2');
    expect(internals.submitTriageInput.checked).toBe(true);
    expect(internals.submitLabelSelection.has('label-a')).toBe(true);

    toolbar.destroy();
  });

  it('persists submit preference changes through debounced save', async () => {
    vi.useFakeTimers();
    getLocalStorageItemsMock.mockResolvedValue({});

    const toolbar = new FeedbackToolbar({
      onExpand: vi.fn(),
      onCollapse: vi.fn(),
      onSubmit: vi.fn(),
      onSettingsPanelOpen: vi.fn(),
      onQueueDelete: vi.fn(),
      onQueueHover: vi.fn(),
      onQueueClear: vi.fn(),
      onOpenSettingsPage: vi.fn(),
      onToggleMarkersVisible: vi.fn()
    });

    toolbar.setSettingsState(createBaseSettings());
    await flushAsyncWork();

    const internals = toolbar as unknown as ToolbarInternals;
    internals.submitTeamSelect.value = 'team-a';
    internals.submitTeamSelect.dispatchEvent(new Event('change'));
    internals.submitProjectSelect.value = 'project-a';
    internals.submitProjectSelect.dispatchEvent(new Event('change'));
    internals.submitAssigneeSelect.value = 'user-a';
    internals.submitAssigneeSelect.dispatchEvent(new Event('change'));
    internals.submitPrioritySelect.value = '3';
    internals.submitPrioritySelect.dispatchEvent(new Event('change'));
    internals.submitTriageInput.checked = true;
    internals.submitTriageInput.dispatchEvent(new Event('change'));
    internals.submitLabelSelection = new Set(['label-a']);

    vi.advanceTimersByTime(140);
    await flushAsyncWork();

    const payload = setLocalStorageItemsMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(payload?.[STORAGE_KEYS.submitTeamId]).toBe('team-a');
    expect(payload?.[STORAGE_KEYS.submitProjectId]).toBe('project-a');
    expect(payload?.[STORAGE_KEYS.submitAssigneeId]).toBe('user-a');
    expect(payload?.[STORAGE_KEYS.submitPriority]).toBe('3');
    expect(payload?.[STORAGE_KEYS.submitTriage]).toBe(true);
    expect(payload?.[STORAGE_KEYS.submitLabelIds]).toEqual(['label-a']);

    toolbar.destroy();
    vi.useRealTimers();
  });
});
