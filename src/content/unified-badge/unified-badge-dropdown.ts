const SELECTED_CHECK_ICON_HTML =
  '<svg class="notis-unified-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';

export interface SearchDropdownShell {
  dropdown: HTMLDivElement;
  searchInput: HTMLInputElement;
  listEl: HTMLDivElement;
}

export function createSearchDropdownShell(placeholder: string, value: string): SearchDropdownShell {
  const dropdown = document.createElement('div');
  dropdown.className = 'notis-unified-dropdown';

  const searchRow = document.createElement('div');
  searchRow.className = 'notis-unified-dropdown-search';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'notis-unified-dropdown-input';
  searchInput.placeholder = placeholder;
  searchInput.value = value;

  const listEl = document.createElement('div');
  listEl.className = 'notis-unified-dropdown-list';

  searchRow.appendChild(searchInput);
  dropdown.appendChild(searchRow);
  dropdown.appendChild(listEl);

  return { dropdown, searchInput, listEl };
}

export function appendSelectedCheckIcon(target: HTMLElement): void {
  target.insertAdjacentHTML('beforeend', SELECTED_CHECK_ICON_HTML);
}

export function focusElementNextFrame(target: HTMLElement): void {
  requestAnimationFrame(() => {
    target.focus();
  });
}
