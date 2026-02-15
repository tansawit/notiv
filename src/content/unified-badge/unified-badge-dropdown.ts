const SELECTED_CHECK_ICON_HTML =
  '<svg class="notis-unified-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';

export interface SearchDropdownShell {
  dropdown: HTMLDivElement;
  searchInput: HTMLInputElement;
  listEl: HTMLDivElement;
}

function getDropdownItems(listEl: HTMLDivElement): HTMLButtonElement[] {
  return Array.from(listEl.querySelectorAll('.notis-unified-dropdown-item')) as HTMLButtonElement[];
}

function getHighlightedIndex(listEl: HTMLDivElement): number {
  const items = getDropdownItems(listEl);
  return items.findIndex((item) => item.classList.contains('highlighted'));
}

function setHighlightedIndex(listEl: HTMLDivElement, index: number): void {
  const items = getDropdownItems(listEl);
  items.forEach((item) => item.classList.remove('highlighted'));
  if (index >= 0 && index < items.length) {
    items[index].classList.add('highlighted');
    items[index].scrollIntoView({ block: 'nearest' });
  }
}

function handleDropdownKeyDown(event: KeyboardEvent, listEl: HTMLDivElement): void {
  const items = getDropdownItems(listEl);
  if (items.length === 0) return;

  const currentIndex = getHighlightedIndex(listEl);

  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault();
      const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, items.length - 1);
      setHighlightedIndex(listEl, nextIndex);
      break;
    }
    case 'ArrowUp': {
      event.preventDefault();
      const prevIndex = currentIndex < 0 ? items.length - 1 : Math.max(currentIndex - 1, 0);
      setHighlightedIndex(listEl, prevIndex);
      break;
    }
    case 'Enter': {
      event.preventDefault();
      if (currentIndex >= 0 && currentIndex < items.length) {
        items[currentIndex].click();
      }
      break;
    }
  }
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

  searchInput.addEventListener('keydown', (event) => {
    handleDropdownKeyDown(event, listEl);
  });

  searchRow.appendChild(searchInput);
  dropdown.appendChild(searchRow);
  dropdown.appendChild(listEl);

  return { dropdown, searchInput, listEl };
}

export function appendSelectedCheckIcon(target: HTMLElement): void {
  target.insertAdjacentHTML('beforeend', SELECTED_CHECK_ICON_HTML);
}

export function highlightFirstDropdownItem(listEl: HTMLDivElement): void {
  setHighlightedIndex(listEl, 0);
}

export function focusElementNextFrame(target: HTMLElement): void {
  requestAnimationFrame(() => {
    target.focus();
  });
}
