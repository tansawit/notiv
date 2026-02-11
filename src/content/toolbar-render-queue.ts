import { Trash2 } from 'lucide';
import type { HighlightColor } from '../shared/types';
import { getHighlightColorPreset, resolveHighlightColor } from '../shared/highlight-colors';
import type { PanelPalette } from './toolbar-palette';
import { createIcon, setButtonDisabled, truncateText } from './toolbar-ui-utils';
import { FONT_STACK_MONO, FONT_STACK_SANS } from '../shared/visual-tokens';

interface QueueNoteSummaryLike {
  id: string;
  comment: string;
  target: string;
  attachmentsCount?: number;
  highlightColor: HighlightColor;
}

interface RenderQueuePanelInput {
  palette: PanelPalette;
  darkMode: boolean;
  queuePanel: HTMLDivElement;
  queueList: HTMLDivElement;
  queueSubmitButton: HTMLButtonElement;
  queueClearButton: HTMLButtonElement;
  queueEmpty: HTMLDivElement;
  queueItems: QueueNoteSummaryLike[];
  queueHoveredId: string | null;
  submitting: boolean;
  makeIconButton: (label: string, icon: HTMLElement) => HTMLButtonElement;
  onQueueDelete: (id: string) => void;
  onQueueHover: (id: string | null) => void;
  setQueueHovered: (id: string | null) => void;
}

export function renderQueuePanelContent(input: RenderQueuePanelInput): void {
  const {
    palette,
    queuePanel,
    queueList,
    queueSubmitButton,
    queueClearButton,
    queueEmpty,
    queueItems,
    queueHoveredId,
    submitting,
    onQueueDelete,
    onQueueHover,
    setQueueHovered
  } = input;

  const titleNode = queuePanel.querySelector<HTMLElement>('[data-queue-title="true"]');
  if (titleNode) {
    titleNode.style.color = palette.headingColor;
    if (submitting) {
      titleNode.textContent = 'Notes';
    } else {
      titleNode.textContent = queueItems.length > 0 ? `Notes (${queueItems.length})` : 'Notes';
    }
  }

  setButtonDisabled(queueSubmitButton, queueItems.length === 0 || submitting);
  queueSubmitButton.style.opacity = queueItems.length === 0 || submitting ? '0.5' : '1';
  queueSubmitButton.style.border = `1.25px solid ${palette.textMuted}`;
  queueSubmitButton.style.background = 'transparent';
  queueSubmitButton.style.color = palette.textPrimary;
  queueSubmitButton.textContent = submitting ? 'Submitting...' : 'Submit';

  setButtonDisabled(queueClearButton, queueItems.length === 0 || submitting);
  queueClearButton.style.opacity = queueItems.length === 0 || submitting ? '0.4' : '1';
  queueClearButton.style.borderColor = 'transparent';
  queueClearButton.style.background = 'transparent';
  queueClearButton.style.color = palette.textMuted;

  queueList.textContent = '';
  queueEmpty.style.display = queueItems.length === 0 ? 'block' : 'none';
  queueEmpty.style.padding = '4px 0';
  queueEmpty.style.color = palette.textMuted;
  queueEmpty.style.fontFamily = FONT_STACK_MONO;
  queueEmpty.style.fontSize = '11px';
  queueEmpty.textContent = 'No notes yet';

  queueItems.forEach((note, index) => {
    const colorPreset = getHighlightColorPreset(resolveHighlightColor(note.highlightColor));
    const hovered = queueHoveredId === note.id;
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '14px minmax(0, 1fr) auto';
    row.style.gap = '8px';
    row.style.alignItems = 'start';
    row.style.padding = '8px 8px';
    row.style.border = '1.25px solid transparent';
    row.style.borderRadius = '6px';
    row.style.background = hovered ? palette.surfaceHoverBackground : 'transparent';
    row.style.transition = 'background 80ms ease';
    row.style.cursor = 'default';
    if (submitting) {
      row.style.opacity = '0.6';
      row.style.pointerEvents = 'none';
    }

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
    indexChip.style.opacity = '0.75';
    indexChip.style.transition = 'opacity 80ms ease';

    const applyHoveredState = (value: boolean, deleteBtn: HTMLButtonElement): void => {
      row.style.background = value ? palette.surfaceHoverBackground : 'transparent';
      indexChip.style.opacity = value ? '1' : '0.75';
      deleteBtn.style.opacity = value ? '0.5' : '0';
    };

    const body = document.createElement('div');
    body.style.minWidth = '0';

    const comment = document.createElement('div');
    comment.textContent = truncateText(note.comment || 'Untitled note', 110);
    comment.style.color = palette.textPrimary;
    comment.style.fontFamily = FONT_STACK_SANS;
    comment.style.fontSize = '14px';
    comment.style.fontWeight = '500';
    comment.style.lineHeight = '1.3';

    const target = document.createElement('div');
    target.textContent = note.target;
    target.style.marginTop = '4px';
    target.style.color = palette.textMuted;
    target.style.fontFamily = FONT_STACK_MONO;
    target.style.fontSize = '10px';
    target.style.whiteSpace = 'nowrap';
    target.style.overflow = 'hidden';
    target.style.textOverflow = 'ellipsis';
    target.style.opacity = '0.8';

    if ((note.attachmentsCount ?? 0) > 0) {
      target.textContent = `${target.textContent} · ${note.attachmentsCount} image${note.attachmentsCount === 1 ? '' : 's'}`;
    }

    body.appendChild(comment);
    body.appendChild(target);

    const deleteIcon = createIcon(Trash2);
    deleteIcon.style.width = '12px';
    deleteIcon.style.height = '12px';
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.title = 'Delete note';
    deleteButton.setAttribute('aria-label', 'Delete note');
    deleteButton.appendChild(deleteIcon);
    deleteButton.style.appearance = 'none';
    deleteButton.style.display = 'inline-flex';
    deleteButton.style.alignItems = 'center';
    deleteButton.style.justifyContent = 'center';
    deleteButton.style.width = '20px';
    deleteButton.style.height = '20px';
    deleteButton.style.padding = '0';
    deleteButton.style.margin = '0';
    deleteButton.style.border = 'none';
    deleteButton.style.background = 'transparent';
    deleteButton.style.color = palette.textMuted;
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.opacity = '0';
    deleteButton.style.transition = 'opacity 80ms ease, color 80ms ease';
    setButtonDisabled(deleteButton, submitting);
    deleteButton.addEventListener('click', () => {
      onQueueDelete(note.id);
    });
    deleteButton.addEventListener('mouseenter', () => {
      if (!submitting) {
        deleteButton.style.opacity = '1';
        deleteButton.style.color = palette.textPrimary;
      }
    });
    deleteButton.addEventListener('mouseleave', () => {
      const isRowHovered = queueHoveredId === note.id;
      deleteButton.style.opacity = isRowHovered ? '0.5' : '0';
      deleteButton.style.color = palette.textMuted;
    });

    row.addEventListener('mouseenter', () => {
      if (submitting) return;
      setQueueHovered(note.id);
      onQueueHover(note.id);
      applyHoveredState(true, deleteButton);
    });

    row.addEventListener('mouseleave', () => {
      if (submitting) return;
      setQueueHovered(null);
      onQueueHover(null);
      applyHoveredState(false, deleteButton);
    });

    row.appendChild(indexChip);
    row.appendChild(body);
    row.appendChild(deleteButton);

    queueList.appendChild(row);
  });
}
