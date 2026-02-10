import { describe, expect, it, vi } from 'vitest';
import type { SubmitDropdownControl } from './base-combobox-control';
import {
  syncProjectOptionsForSelectedTeamContent,
  syncTriageOptionVisibilityContent
} from './toolbar-submit-sync';

describe('syncProjectOptionsForSelectedTeamContent', () => {
  it('filters projects by selected team and refreshes control', () => {
    const projectSelect = document.createElement('select');
    const projectControl = {
      refresh: vi.fn()
    } as unknown as SubmitDropdownControl;

    syncProjectOptionsForSelectedTeamContent({
      selectedTeamId: 'team-a',
      projectOptions: [
        { id: 'p-2', name: 'B Project', teamIds: ['team-b'] },
        { id: 'p-1', name: 'A Project', teamIds: ['team-a'] }
      ],
      projectSelect,
      projectControl,
      preferredProjectId: 'p-1'
    });

    expect(projectSelect.options).toHaveLength(2);
    expect(projectSelect.options[0]?.textContent).toBe('None');
    expect(projectSelect.options[1]?.textContent).toBe('A Project');
    expect(projectSelect.value).toBe('p-1');
    expect(projectControl.refresh).toHaveBeenCalledOnce();
  });
});

describe('syncTriageOptionVisibilityContent', () => {
  it('hides triage when selected team has no triage state', () => {
    const triageRow = document.createElement('label');
    const triageInput = document.createElement('input');
    triageInput.type = 'checkbox';
    triageInput.checked = true;

    const enabled = syncTriageOptionVisibilityContent({
      selectedTeamId: 'team-a',
      teamOptions: [{ id: 'team-a', key: 'A', name: 'Team A', triageStateId: '' }],
      triageRow,
      triageInput
    });

    expect(enabled).toBe(false);
    expect(triageRow.style.display).toBe('none');
    expect(triageInput.checked).toBe(false);
  });
});
