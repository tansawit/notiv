import type { LinearLabel, LinearProject, LinearTeam, LinearUser } from '../shared/types';
import type { SubmitDropdownControl, SubmitLabelSearchControl } from './base-combobox-control';
import { populateSelectOptions } from './toolbar-select-options';

interface SubmitResources {
  teamOptions: LinearTeam[];
  projectOptions: LinearProject[];
  userOptions: LinearUser[];
  labelOptions: LinearLabel[];
}

interface StoredSubmitPreferences {
  teamId: string;
  projectId: string;
  assigneeId: string;
  priority: string;
  labelIds: string[];
  triage: boolean;
}

interface SyncProjectOptionsInput {
  selectedTeamId: string;
  projectOptions: LinearProject[];
  projectSelect: HTMLSelectElement;
  projectControl: SubmitDropdownControl;
  preferredProjectId?: string;
  previousProjectId?: string;
}

interface SyncTriageOptionVisibilityInput {
  selectedTeamId: string;
  teamOptions: LinearTeam[];
  triageRow: HTMLLabelElement;
  triageInput: HTMLInputElement;
}

interface SyncSubmitFormFromSettingsInput {
  resources: SubmitResources;
  teamSelect: HTMLSelectElement;
  projectSelect: HTMLSelectElement;
  assigneeSelect: HTMLSelectElement;
  prioritySelect: HTMLSelectElement;
  triageRow: HTMLLabelElement;
  triageInput: HTMLInputElement;
  projectControl: SubmitDropdownControl;
  submitDropdownControls: SubmitDropdownControl[];
  submitLabelControl: SubmitLabelSearchControl;
  submitLabelSelection: Set<string>;
  storedPreferences: StoredSubmitPreferences;
  onRenderSubmitLabelChips: () => void;
  onSyncSubmitState: () => void;
}

export function syncProjectOptionsForSelectedTeamContent(input: SyncProjectOptionsInput): void {
  const {
    selectedTeamId,
    projectOptions,
    projectSelect,
    projectControl,
    preferredProjectId,
    previousProjectId
  } = input;

  const filteredProjectOptions = selectedTeamId
    ? projectOptions.filter((project) => project.teamIds.includes(selectedTeamId))
    : projectOptions;

  populateSelectOptions({
    select: projectSelect,
    placeholderLabel: 'None',
    options: filteredProjectOptions,
    candidateValue: preferredProjectId ?? previousProjectId
  });

  projectControl.refresh();
}

export function syncTriageOptionVisibilityContent(input: SyncTriageOptionVisibilityInput): boolean {
  const { selectedTeamId, teamOptions, triageRow, triageInput } = input;
  const selectedTeam = teamOptions.find((team) => team.id === selectedTeamId);
  const triageEnabled = Boolean(selectedTeam?.triageStateId?.trim());

  triageRow.style.display = triageEnabled ? 'flex' : 'none';
  if (!triageEnabled) {
    triageInput.checked = false;
  }

  return triageEnabled;
}

export function syncSubmitFormFromSettingsContent(input: SyncSubmitFormFromSettingsInput): void {
  const {
    resources,
    teamSelect,
    projectSelect,
    assigneeSelect,
    prioritySelect,
    triageRow,
    triageInput,
    projectControl,
    submitDropdownControls,
    submitLabelControl,
    submitLabelSelection,
    storedPreferences,
    onRenderSubmitLabelChips,
    onSyncSubmitState
  } = input;

  const previousTeamId = teamSelect.value.trim();
  const previousProjectId = projectSelect.value.trim();
  const previousAssigneeId = assigneeSelect.value.trim();

  populateSelectOptions({
    select: teamSelect,
    placeholderLabel: 'Select team',
    options: resources.teamOptions,
    candidateValue: previousTeamId || storedPreferences.teamId
  });

  syncProjectOptionsForSelectedTeamContent({
    selectedTeamId: teamSelect.value.trim(),
    projectOptions: resources.projectOptions,
    projectSelect,
    projectControl,
    preferredProjectId: previousProjectId || storedPreferences.projectId,
    previousProjectId
  });

  populateSelectOptions({
    select: assigneeSelect,
    placeholderLabel: 'Unassigned',
    options: resources.userOptions,
    candidateValue: previousAssigneeId || storedPreferences.assigneeId
  });

  const candidatePriority = prioritySelect.value.trim() || storedPreferences.priority;
  if (Array.from(prioritySelect.options).some((option) => option.value === candidatePriority)) {
    prioritySelect.value = candidatePriority;
  }

  const validIds = new Set(resources.labelOptions.map((label) => label.id));
  if (submitLabelSelection.size === 0) {
    for (const labelId of storedPreferences.labelIds) {
      if (validIds.has(labelId)) {
        submitLabelSelection.add(labelId);
      }
    }
  }
  submitLabelSelection.forEach((labelId) => {
    if (!validIds.has(labelId)) {
      submitLabelSelection.delete(labelId);
    }
  });

  onRenderSubmitLabelChips();

  const triageEnabled = syncTriageOptionVisibilityContent({
    selectedTeamId: teamSelect.value.trim(),
    teamOptions: resources.teamOptions,
    triageRow,
    triageInput
  });
  if (triageEnabled) {
    triageInput.checked = storedPreferences.triage;
  }

  submitDropdownControls.forEach((control) => control.refresh());
  submitLabelControl.refresh();
  onSyncSubmitState();
}
