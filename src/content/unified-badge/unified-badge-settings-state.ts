export interface UnifiedBadgeSettingsState {
  takeoverMode: 'priority' | null;
  teamDropdownOpen: boolean;
  assigneeDropdownOpen: boolean;
  labelsDropdownOpen: boolean;
  teamSearchQuery: string;
  assigneeSearchQuery: string;
  labelsSearchQuery: string;
}

export function closeAllDropdowns(
  state: UnifiedBadgeSettingsState
): UnifiedBadgeSettingsState {
  return {
    ...state,
    teamDropdownOpen: false,
    assigneeDropdownOpen: false,
    labelsDropdownOpen: false
  };
}

export function hasAnyOpenDropdown(
  state: UnifiedBadgeSettingsState
): boolean {
  return (
    state.teamDropdownOpen ||
    state.assigneeDropdownOpen ||
    state.labelsDropdownOpen ||
    state.takeoverMode !== null
  );
}

export function toggleTeamDropdown(
  state: UnifiedBadgeSettingsState
): UnifiedBadgeSettingsState {
  return {
    ...state,
    takeoverMode: null,
    teamDropdownOpen: !state.teamDropdownOpen,
    assigneeDropdownOpen: false,
    labelsDropdownOpen: false,
    teamSearchQuery: ''
  };
}

export function toggleAssigneeDropdown(
  state: UnifiedBadgeSettingsState
): UnifiedBadgeSettingsState {
  return {
    ...state,
    takeoverMode: null,
    teamDropdownOpen: false,
    assigneeDropdownOpen: !state.assigneeDropdownOpen,
    labelsDropdownOpen: false,
    assigneeSearchQuery: ''
  };
}

export function toggleLabelsDropdown(
  state: UnifiedBadgeSettingsState
): UnifiedBadgeSettingsState {
  return {
    ...state,
    takeoverMode: null,
    teamDropdownOpen: false,
    assigneeDropdownOpen: false,
    labelsDropdownOpen: !state.labelsDropdownOpen,
    labelsSearchQuery: ''
  };
}
