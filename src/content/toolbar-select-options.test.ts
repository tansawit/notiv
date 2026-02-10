import { describe, expect, it } from 'vitest';
import { populateSelectOptions } from './toolbar-select-options';

describe('populateSelectOptions', () => {
  it('sorts options and selects a valid candidate', () => {
    const select = document.createElement('select');

    populateSelectOptions({
      select,
      placeholderLabel: 'Choose one',
      options: [
        { id: '2', name: 'Zulu' },
        { id: '1', name: 'Alpha' }
      ],
      candidateValue: '2'
    });

    expect(select.options).toHaveLength(3);
    expect(select.options[0]?.textContent).toBe('Choose one');
    expect(select.options[1]?.textContent).toBe('Alpha');
    expect(select.options[2]?.textContent).toBe('Zulu');
    expect(select.value).toBe('2');
  });

  it('clears selection for an invalid candidate', () => {
    const select = document.createElement('select');

    populateSelectOptions({
      select,
      placeholderLabel: 'None',
      options: [{ id: 'team-a', name: 'Team A' }],
      candidateValue: 'missing'
    });

    expect(select.value).toBe('');
  });
});
