import { getHighlightColorPreset, resolveHighlightColor } from '../../shared/highlight-colors';
import { FONT_STACK_MONO, FONT_STACK_SANS } from '../../shared/visual-tokens';
import { createTrashIcon } from '../../shared/svg-builder';
import { type QueueNoteSummary, ROW_HEIGHT } from './unified-badge-types';

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

function resolveCommentText(comment: string): string {
  if (!comment) {
    return 'Untitled note';
  }
  return comment.length > 110 ? `${comment.slice(0, 107)}...` : comment;
}

function resolveTargetText(note: QueueNoteSummary): string {
  const attachmentsCount = note.attachmentsCount ?? 0;
  if (attachmentsCount === 0) {
    return note.target;
  }
  return `${note.target} · ${attachmentsCount} image${attachmentsCount === 1 ? '' : 's'}`;
}

function ensureRowStructure(row: HTMLDivElement): {
  indexChip: HTMLDivElement;
  comment: HTMLDivElement;
  target: HTMLDivElement;
  deleteBtn: HTMLButtonElement;
} {
  const indexChip = document.createElement('div');
  indexChip.setAttribute('data-role', 'index');

  const body = document.createElement('div');
  body.style.minWidth = '0';

  const comment = document.createElement('div');
  comment.setAttribute('data-role', 'comment');

  const target = document.createElement('div');
  target.setAttribute('data-role', 'target');

  body.appendChild(comment);
  body.appendChild(target);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.title = 'Delete note';
  deleteBtn.setAttribute('aria-label', 'Delete note');
  deleteBtn.setAttribute('data-role', 'delete');
  deleteBtn.appendChild(createTrashIcon());

  row.appendChild(indexChip);
  row.appendChild(body);
  row.appendChild(deleteBtn);

  return { indexChip, comment, target, deleteBtn };
}

function getRowParts(row: HTMLDivElement): {
  indexChip: HTMLDivElement;
  comment: HTMLDivElement;
  target: HTMLDivElement;
  deleteBtn: HTMLButtonElement;
} {
  const existingIndexChip = row.querySelector('[data-role="index"]') as HTMLDivElement | null;
  const existingComment = row.querySelector('[data-role="comment"]') as HTMLDivElement | null;
  const existingTarget = row.querySelector('[data-role="target"]') as HTMLDivElement | null;
  const existingDeleteBtn = row.querySelector('[data-role="delete"]') as HTMLButtonElement | null;

  if (existingIndexChip && existingComment && existingTarget && existingDeleteBtn) {
    return {
      indexChip: existingIndexChip,
      comment: existingComment,
      target: existingTarget,
      deleteBtn: existingDeleteBtn
    };
  }

  row.innerHTML = '';
  return ensureRowStructure(row);
}

function applyRowBaseStyles(row: HTMLDivElement): void {
  row.className = 'notis-unified-row';
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '14px minmax(0, 1fr) auto';
  row.style.gap = '10px';
  row.style.alignItems = 'start';
  row.style.padding = '8px 6px';
  row.style.borderRadius = '6px';
  row.style.cursor = 'pointer';
  row.style.transition = 'background 80ms ease';
}

function applyIndexStyles(indexChip: HTMLDivElement, colorPreset: ReturnType<typeof getHighlightColorPreset>, index: number): void {
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
}

function applyTextStyles(
  comment: HTMLDivElement,
  target: HTMLDivElement,
  note: QueueNoteSummary,
  isDark: boolean
): void {
  comment.textContent = resolveCommentText(note.comment);
  comment.style.color = isDark ? '#f0efed' : '#1a1816';
  comment.style.fontFamily = FONT_STACK_SANS;
  comment.style.fontSize = '14px';
  comment.style.fontWeight = '500';
  comment.style.lineHeight = '1.3';

  target.textContent = resolveTargetText(note);
  target.style.marginTop = '4px';
  target.style.color = isDark ? '#8a8884' : '#9c9894';
  target.style.fontFamily = FONT_STACK_MONO;
  target.style.fontSize = '10px';
  target.style.whiteSpace = 'nowrap';
  target.style.overflow = 'hidden';
  target.style.textOverflow = 'ellipsis';
}

function applyDeleteButtonStyles(deleteBtn: HTMLButtonElement, isDark: boolean, submitting: boolean): void {
  deleteBtn.style.appearance = 'none';
  deleteBtn.style.display = 'inline-flex';
  deleteBtn.style.alignItems = 'center';
  deleteBtn.style.justifyContent = 'center';
  deleteBtn.style.width = '20px';
  deleteBtn.style.height = '20px';
  deleteBtn.style.padding = '0';
  deleteBtn.style.border = 'none';
  deleteBtn.style.background = 'transparent';
  deleteBtn.style.color = isDark ? '#8a8884' : '#9c9894';
  deleteBtn.style.cursor = 'pointer';
  deleteBtn.style.transition = 'opacity 80ms ease';
  deleteBtn.disabled = submitting;
}

function createOrReuseRow(
  input: RenderUnifiedBadgeRowsInput,
  note: QueueNoteSummary,
  index: number,
  existingRowsById: Map<string, HTMLDivElement>
): HTMLDivElement {
  const hoverBg = getHoverBackground(input.isDark);
  const colorPreset = getHighlightColorPreset(resolveHighlightColor(note.highlightColor));
  const isHovered = input.hoveredId === note.id;
  const isNew = input.newIds.has(note.id);

  const row = existingRowsById.get(note.id) ?? document.createElement('div');
  row.setAttribute('data-note-id', note.id);

  applyRowBaseStyles(row);
  row.style.background = isHovered ? hoverBg : 'transparent';
  row.classList.toggle('notis-unified-row-new', isNew);

  const { indexChip, comment, target, deleteBtn } = getRowParts(row);
  applyIndexStyles(indexChip, colorPreset, index);
  applyTextStyles(comment, target, note, input.isDark);
  applyDeleteButtonStyles(deleteBtn, input.isDark, input.submitting);
  deleteBtn.style.opacity = isHovered ? '0.6' : '0';

  if (!existingRowsById.has(note.id)) {
    const deleteBtnDefaultColor = input.isDark ? '#8a8884' : '#9c9894';
    const deleteBtnHoverColor = input.isDark ? '#f07070' : '#c94a4a';

    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      input.onDelete(note.id);
    });

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
      row.style.background = getHoverBackground(input.isDark);
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
  }

  return row;
}

export function renderUnifiedBadgeRows(input: RenderUnifiedBadgeRowsInput): void {
  const existingRowsById = new Map<string, HTMLDivElement>();
  const existingRows = input.listEl.querySelectorAll('.notis-unified-row');
  existingRows.forEach((row) => {
    const id = row.getAttribute('data-note-id');
    if (id) {
      existingRowsById.set(id, row as HTMLDivElement);
    }
  });

  const nextRowIds = new Set(input.items.map((item) => item.id));

  input.items.forEach((note, index) => {
    const row = createOrReuseRow(input, note, index, existingRowsById);
    input.listEl.appendChild(row);
  });

  existingRowsById.forEach((row, id) => {
    if (!nextRowIds.has(id)) {
      row.remove();
    }
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
      const deleteBtn = prevRow.querySelector('[data-role="delete"]') as HTMLButtonElement | null;
      if (deleteBtn) {
        deleteBtn.style.opacity = '0';
      }
    }
  }

  if (nextId) {
    const nextRow = listEl.querySelector(`[data-note-id="${nextId}"]`) as HTMLElement | null;
    if (nextRow) {
      nextRow.style.background = hoverBg;
      const deleteBtn = nextRow.querySelector('[data-role="delete"]') as HTMLButtonElement | null;
      if (deleteBtn) {
        deleteBtn.style.opacity = '0.6';
      }
    }
  }
}

const DELETE_ANIMATION = {
  duration: 200,
  swipeDistance: 40,
  easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
};

export interface AnimateRowDeletionInput {
  listEl: HTMLDivElement;
  deleteId: string;
  onComplete: () => void;
}

export function animateRowDeletion(input: AnimateRowDeletionInput): void {
  const { listEl, deleteId, onComplete } = input;
  const { duration, swipeDistance, easing } = DELETE_ANIMATION;

  const deletedRow = listEl.querySelector(`[data-note-id="${deleteId}"]`) as HTMLElement | null;
  if (!deletedRow) {
    onComplete();
    return;
  }

  const allRows = Array.from(listEl.querySelectorAll('.notis-unified-row')) as HTMLElement[];
  const deletedIndex = allRows.indexOf(deletedRow);
  const rowsBelow = allRows.slice(deletedIndex + 1);

  deletedRow.style.pointerEvents = 'none';
  deletedRow.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
  deletedRow.style.opacity = '0';
  deletedRow.style.transform = `translateX(-${swipeDistance}px)`;

  rowsBelow.forEach((row) => {
    row.style.transition = `transform ${duration}ms ${easing}`;
    row.style.transform = `translateY(-${ROW_HEIGHT}px)`;
  });

  setTimeout(onComplete, duration);
}
