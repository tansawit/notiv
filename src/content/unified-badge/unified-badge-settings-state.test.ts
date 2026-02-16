import { describe, expect, it } from 'vitest';
import {
  closeAllDropdowns,
  hasAnyOpenDropdown,
  toggleAssigneeDropdown,
  toggleLabelsDropdown,
  toggleTeamDropdown,
  type UnifiedBadgeSettingsState
} from './unified-badge-settings-state';

function createState(overrides: Partial<UnifiedBadgeSettingsState> = {}): UnifiedBadgeSettingsState {
  return {
    takeoverMode: null,
    teamDropdownOpen: false,
    assigneeDropdownOpen: false,
    labelsDropdownOpen: false,
    teamSearchQuery: 'team',
    assigneeSearchQuery: 'assignee',
    labelsSearchQuery: 'labels',
    ...overrides
  };
}

describe('unified badge settings state', () => {
  it('toggles team dropdown and resets conflicting state', () => {
    const next = toggleTeamDropdown(
      createState({
        takeoverMode: 'priority',
        assigneeDropdownOpen: true,
        labelsDropdownOpen: true
      })
    );

    expect(next).toMatchObject({
      takeoverMode: null,
      teamDropdownOpen: true,
      assigneeDropdownOpen: false,
      labelsDropdownOpen: false,
      teamSearchQuery: ''
    });
  });

  it('toggles assignee dropdown and resets search query', () => {
    const opened = toggleAssigneeDropdown(createState());
    const closed = toggleAssigneeDropdown(opened);

    expect(opened.assigneeDropdownOpen).toBe(true);
    expect(opened.assigneeSearchQuery).toBe('');
    expect(closed.assigneeDropdownOpen).toBe(false);
  });

  it('toggles labels dropdown and reports open-state', () => {
    const opened = toggleLabelsDropdown(createState({ takeoverMode: 'priority' }));
    expect(hasAnyOpenDropdown(opened)).toBe(true);
    expect(opened.labelsDropdownOpen).toBe(true);
    expect(opened.takeoverMode).toBe(null);
  });

  it('closes all dropdowns without clearing takeover mode', () => {
    const closed = closeAllDropdowns(
      createState({
        takeoverMode: 'priority',
        teamDropdownOpen: true,
        assigneeDropdownOpen: true,
        labelsDropdownOpen: true
      })
    );

    expect(closed).toMatchObject({
      takeoverMode: 'priority',
      teamDropdownOpen: false,
      assigneeDropdownOpen: false,
      labelsDropdownOpen: false
    });
    expect(hasAnyOpenDropdown(closed)).toBe(true);
  });
});
