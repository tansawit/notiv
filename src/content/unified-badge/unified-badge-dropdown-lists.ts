import type { LinearLabel, LinearTeam, LinearUser } from '../../shared/types';
import { appendSelectedCheckIcon } from './unified-badge-dropdown';

function renderEmptyState(listEl: HTMLDivElement, message: string): void {
  const empty = document.createElement('div');
  empty.className = 'notis-unified-dropdown-empty';
  empty.textContent = message;
  listEl.appendChild(empty);
}

export interface RenderTeamDropdownListInput {
  listEl: HTMLDivElement;
  teams: LinearTeam[];
  selectedTeamId: string | null;
  query: string;
  onSelect: (teamId: string) => void;
}

export function renderTeamDropdownList(input: RenderTeamDropdownListInput): void {
  input.listEl.innerHTML = '';
  const normalizedQuery = input.query.toLowerCase();
  const filtered = input.teams
    .filter((team) => team.key.toLowerCase().includes(normalizedQuery) || team.name.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => left.key.localeCompare(right.key));

  if (filtered.length === 0) {
    renderEmptyState(input.listEl, 'No teams found');
    return;
  }

  filtered.forEach((team) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'notis-unified-dropdown-item';
    if (input.selectedTeamId === team.id) {
      item.classList.add('selected');
    }

    const name = document.createElement('span');
    name.className = 'notis-unified-dropdown-name';
    name.textContent = team.name;
    item.appendChild(name);

    const key = document.createElement('span');
    key.className = 'notis-unified-dropdown-team-key';
    key.textContent = team.key;
    item.appendChild(key);

    if (input.selectedTeamId === team.id) {
      appendSelectedCheckIcon(item);
    }

    item.addEventListener('click', (event) => {
      event.stopPropagation();
      input.onSelect(team.id);
    });

    input.listEl.appendChild(item);
  });
}

export interface RenderAssigneeDropdownListInput {
  listEl: HTMLDivElement;
  users: LinearUser[];
  selectedAssigneeId: string | null;
  query: string;
  onSelect: (userId: string) => void;
}

export function renderAssigneeDropdownList(input: RenderAssigneeDropdownListInput): void {
  input.listEl.innerHTML = '';
  const normalizedQuery = input.query.toLowerCase();
  const filtered = input.users.filter((user) => user.name.toLowerCase().includes(normalizedQuery));

  if (filtered.length === 0) {
    renderEmptyState(input.listEl, 'No members found');
    return;
  }

  filtered.forEach((user) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'notis-unified-dropdown-item';
    if (input.selectedAssigneeId === user.id) {
      item.classList.add('selected');
    }

    if (user.avatarUrl) {
      const avatar = document.createElement('img');
      avatar.className = 'notis-unified-dropdown-avatar';
      avatar.src = user.avatarUrl;
      item.appendChild(avatar);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'notis-unified-dropdown-avatar-placeholder';
      placeholder.textContent = user.name.charAt(0).toUpperCase();
      item.appendChild(placeholder);
    }

    const name = document.createElement('span');
    name.className = 'notis-unified-dropdown-name';
    name.textContent = user.name;
    item.appendChild(name);

    if (input.selectedAssigneeId === user.id) {
      appendSelectedCheckIcon(item);
    }

    item.addEventListener('click', (event) => {
      event.stopPropagation();
      input.onSelect(user.id);
    });

    input.listEl.appendChild(item);
  });
}

export interface RenderLabelsDropdownListInput {
  listEl: HTMLDivElement;
  labels: LinearLabel[];
  selectedLabelIds: string[];
  query: string;
  onToggle: (labelId: string) => void;
}

export function renderLabelsDropdownList(input: RenderLabelsDropdownListInput): void {
  input.listEl.innerHTML = '';
  const normalizedQuery = input.query.toLowerCase();
  const filtered = input.labels.filter((label) => label.name.toLowerCase().includes(normalizedQuery));

  if (filtered.length === 0) {
    renderEmptyState(input.listEl, 'No labels found');
    return;
  }

  filtered.forEach((label) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'notis-unified-dropdown-item';
    const isSelected = input.selectedLabelIds.includes(label.id);
    if (isSelected) {
      item.classList.add('selected');
    }

    const dot = document.createElement('span');
    dot.className = 'notis-unified-dropdown-dot';
    dot.style.background = label.color;
    item.appendChild(dot);

    const name = document.createElement('span');
    name.className = 'notis-unified-dropdown-name';
    name.textContent = label.name;
    item.appendChild(name);

    if (isSelected) {
      appendSelectedCheckIcon(item);
    }

    item.addEventListener('click', (event) => {
      event.stopPropagation();
      input.onToggle(label.id);
    });

    input.listEl.appendChild(item);
  });
}
