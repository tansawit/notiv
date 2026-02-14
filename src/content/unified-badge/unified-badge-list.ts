import { getHighlightColorPreset, resolveHighlightColor } from '../../shared/highlight-colors';
import { FONT_STACK_MONO, FONT_STACK_SANS } from '../../shared/visual-tokens';
import { createTrashIcon } from '../../shared/svg-builder';
import type { QueueNoteSummary } from './unified-badge-types';

export interface RenderUnifiedBadgeRowsInput {
  listEl: HTMLDivElement;
  items: QueueNoteSummary[];
  hoveredId: string | null;
  newIds: Set<string>;
  submitting: boolean;
  isDark: boolean;
  onDelete: (id: string) => void;
  onHover: (id: string | null) => void;
  onEdit: (id: string) => void;
}

function getHoverBackground(isDark: boolean): string {
  return isDark ? 'rgba(240, 239, 237, 0.06)' : 'rgba(26, 24, 22, 0.05)';
}

export function renderUnifiedBadgeRows(input: RenderUnifiedBadgeRowsInput): void {
  const hoverBg = getHoverBackground(input.isDark);

  input.items.forEach((note, index) => {
    const colorPreset = getHighlightColorPreset(resolveHighlightColor(note.highlightColor));
    const isHovered = input.hoveredId === note.id;
    const isNew = input.newIds.has(note.id);

    const row = document.createElement('div');
    row.className = 'notiv-unified-row';
    if (isNew) {
      row.classList.add('notiv-unified-row-new');
    }
    row.setAttribute('data-note-id', note.id);
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '14px minmax(0, 1fr) auto';
    row.style.gap = '10px';
    row.style.alignItems = 'start';
    row.style.padding = '8px 6px';
    row.style.borderRadius = '6px';
    row.style.background = isHovered ? hoverBg : 'transparent';
    row.style.cursor = 'pointer';
    row.style.transition = 'background 80ms ease';

    const indexChip = document.createElement('div');
    indexChip.textContent = String(index + 1);
    indexChip.style.width = '14px';
    indexChip.style.height = '14px';
    indexChip.style.marginTop = '2px';
    indexChip.style.borderRadius = '3px';
    indexChip.style.border = `1px solid ${colorPreset.border}`;
    indexChip.style.display = 'grid';
    indexChip.style.placeItems = 'center';
    indexChip.style.fontFamily = FONT_STACK_MONO;
    indexChip.style.fontSize = '9px';
    indexChip.style.fontWeight = '600';
    indexChip.style.color = colorPreset.pinText;
    indexChip.style.background = colorPreset.pinFill;

    const body = document.createElement('div');
    body.style.minWidth = '0';

    const comment = document.createElement('div');
    const commentText = note.comment || 'Untitled note';
    comment.textContent = commentText.length > 110 ? commentText.slice(0, 107) + '...' : commentText;
    comment.style.color = input.isDark ? '#f0efed' : '#1a1816';
    comment.style.fontFamily = FONT_STACK_SANS;
    comment.style.fontSize = '14px';
    comment.style.fontWeight = '500';
    comment.style.lineHeight = '1.3';

    const target = document.createElement('div');
    let targetText = note.target;
    if ((note.attachmentsCount ?? 0) > 0) {
      targetText += ` · ${note.attachmentsCount} image${note.attachmentsCount === 1 ? '' : 's'}`;
    }
    target.textContent = targetText;
    target.style.marginTop = '4px';
    target.style.color = input.isDark ? '#8a8884' : '#9c9894';
    target.style.fontFamily = FONT_STACK_MONO;
    target.style.fontSize = '10px';
    target.style.whiteSpace = 'nowrap';
    target.style.overflow = 'hidden';
    target.style.textOverflow = 'ellipsis';

    body.appendChild(comment);
    body.appendChild(target);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.title = 'Delete note';
    deleteBtn.setAttribute('aria-label', 'Delete note');
    deleteBtn.style.appearance = 'none';
    deleteBtn.style.display = 'inline-flex';
    deleteBtn.style.alignItems = 'center';
    deleteBtn.style.justifyContent = 'center';
    deleteBtn.style.width = '20px';
    deleteBtn.style.height = '20px';
    deleteBtn.style.padding = '0';
    deleteBtn.style.border = 'none';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.color = input.isDark ? '#8a8884' : '#9c9894';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.opacity = isHovered ? '0.6' : '0';
    deleteBtn.style.transition = 'opacity 80ms ease';
    deleteBtn.disabled = input.submitting;
    deleteBtn.appendChild(createTrashIcon());

    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      input.onDelete(note.id);
    });

    const deleteBtnDefaultColor = input.isDark ? '#8a8884' : '#9c9894';
    const deleteBtnHoverColor = input.isDark ? '#f07070' : '#c94a4a';

    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.color = deleteBtnHoverColor;
      deleteBtn.style.opacity = '1';
    });

    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.color = deleteBtnDefaultColor;
      deleteBtn.style.opacity = row.matches(':hover') ? '0.6' : '0';
    });

    row.addEventListener('mouseenter', () => {
      if (input.submitting) {
        return;
      }
      row.style.background = hoverBg;
      deleteBtn.style.opacity = '0.6';
      input.onHover(note.id);
    });

    row.addEventListener('mouseleave', () => {
      row.style.background = 'transparent';
      deleteBtn.style.opacity = '0';
      input.onHover(null);
    });

    row.addEventListener('click', () => {
      if (input.submitting) {
        return;
      }
      input.onEdit(note.id);
    });

    row.appendChild(indexChip);
    row.appendChild(body);
    row.appendChild(deleteBtn);
    input.listEl.appendChild(row);
  });
}

export function updateUnifiedBadgeRowHighlight(
  listEl: HTMLDivElement,
  prevId: string | null,
  nextId: string | null,
  isDark: boolean
): void {
  const hoverBg = getHoverBackground(isDark);

  if (prevId) {
    const prevRow = listEl.querySelector(`[data-note-id="${prevId}"]`) as HTMLElement | null;
    if (prevRow && !prevRow.matches(':hover')) {
      prevRow.style.background = 'transparent';
      const deleteBtn = prevRow.querySelector('button') as HTMLButtonElement | null;
      if (deleteBtn) {
        deleteBtn.style.opacity = '0';
      }
    }
  }

  if (nextId) {
    const nextRow = listEl.querySelector(`[data-note-id="${nextId}"]`) as HTMLElement | null;
    if (nextRow) {
      nextRow.style.background = hoverBg;
      const deleteBtn = nextRow.querySelector('button') as HTMLButtonElement | null;
      if (deleteBtn) {
        deleteBtn.style.opacity = '0.6';
      }
    }
  }
}
