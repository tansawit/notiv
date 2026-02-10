import { Trash2 } from 'lucide';
import type { HighlightColor } from '../shared/types';
import { getHighlightColorPreset, resolveHighlightColor } from '../shared/highlight-colors';
import type { PanelPalette } from './toolbar-palette';
import { createIcon, setButtonDisabled, truncateText } from './toolbar-ui-utils';
import { FONT_STACK_MONO, FONT_STACK_SERIF, getVisualModeTokens } from '../shared/visual-tokens';

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
    darkMode,
    queuePanel,
    queueList,
    queueSubmitButton,
    queueClearButton,
    queueEmpty,
    queueItems,
    queueHoveredId,
    submitting,
    makeIconButton,
    onQueueDelete,
    onQueueHover,
    setQueueHovered
  } = input;

  const countNode = queuePanel.querySelector<HTMLElement>('[data-queue-count="true"]');
  if (countNode) {
    countNode.textContent = submitting
      ? 'Submitting...'
      : `${queueItems.length} note${queueItems.length === 1 ? '' : 's'}`;
    countNode.style.color = palette.textSecondary;
  }

  setButtonDisabled(queueSubmitButton, queueItems.length === 0 || submitting);
  const visualTokens = getVisualModeTokens(darkMode ? 'dark' : 'light');
  queueSubmitButton.style.opacity = queueItems.length === 0 || submitting ? '0.55' : '1';
  queueSubmitButton.style.border = `1.5px solid ${visualTokens.primaryAction.border}`;
  queueSubmitButton.style.background = visualTokens.primaryAction.background;
  queueSubmitButton.style.color = visualTokens.primaryAction.color;
  queueSubmitButton.textContent = submitting
    ? 'Submitting...'
    : queueItems.length <= 0
      ? 'Submit notes'
      : `Submit notes (${queueItems.length})`;

  setButtonDisabled(queueClearButton, queueItems.length === 0 || submitting);
  queueClearButton.style.opacity = queueItems.length === 0 || submitting ? '0.45' : '1';
  queueClearButton.style.borderColor = palette.subtleButtonBorder;
  queueClearButton.style.background = palette.subtleButtonBackground;
  queueClearButton.style.color = palette.subtleButtonColor;

  queueList.textContent = '';
  if (submitting) {
    queueEmpty.style.display = 'block';
    queueEmpty.textContent = 'Submitting notes...';
    queueEmpty.style.color = palette.textSecondary;
    return;
  }
  queueEmpty.style.display = queueItems.length === 0 ? 'block' : 'none';
  queueEmpty.textContent = 'No notes yet.';
  queueEmpty.style.color = palette.textSecondary;

  queueItems.forEach((note, index) => {
    const colorPreset = getHighlightColorPreset(resolveHighlightColor(note.highlightColor));
    const hovered = queueHoveredId === note.id;
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '18px 1fr auto';
    row.style.gap = '9px';
    row.style.alignItems = 'start';
    row.style.padding = '8px 8px';
    row.style.border = hovered ? `1.5px solid ${palette.surfaceHoverBorder}` : `1.5px solid ${palette.surfaceBorder}`;
    row.style.borderRadius = '6px';
    row.style.background = hovered ? palette.surfaceHoverBackground : palette.surfaceBackground;
    row.style.transition = 'border-color 120ms ease, background 120ms ease, box-shadow 120ms ease';
    row.style.boxShadow = hovered ? palette.surfaceHoverShadow : 'none';
    row.style.cursor = 'default';

    const indexChip = document.createElement('div');
    indexChip.textContent = String(index + 1);
    indexChip.style.width = '18px';
    indexChip.style.height = '18px';
    indexChip.style.borderRadius = '4px';
    indexChip.style.border = `1.5px solid ${colorPreset.border}`;
    indexChip.style.display = 'grid';
    indexChip.style.placeItems = 'center';
    indexChip.style.fontFamily = FONT_STACK_MONO;
    indexChip.style.fontSize = '10px';
    indexChip.style.color = colorPreset.pinText;
    indexChip.style.background = hovered ? colorPreset.pinFill : colorPreset.fill;
    indexChip.style.transition = 'all 120ms ease';

    const applyHoveredState = (value: boolean): void => {
      row.style.border = value ? `1.5px solid ${palette.surfaceHoverBorder}` : `1.5px solid ${palette.surfaceBorder}`;
      row.style.background = value ? palette.surfaceHoverBackground : palette.surfaceBackground;
      row.style.boxShadow = value ? palette.surfaceHoverShadow : 'none';
      indexChip.style.border = `1.5px solid ${colorPreset.border}`;
      indexChip.style.color = colorPreset.pinText;
      indexChip.style.background = value ? colorPreset.pinFill : colorPreset.fill;
    };

    const body = document.createElement('div');
    body.style.minWidth = '0';

    const comment = document.createElement('div');
    comment.textContent = truncateText(note.comment || 'Untitled note', 110);
    comment.style.color = palette.textPrimary;
    comment.style.fontFamily = FONT_STACK_SERIF;
    comment.style.fontSize = '13px';
    comment.style.lineHeight = '1.3';

    const target = document.createElement('div');
    target.textContent = note.target;
    target.style.marginTop = '3px';
    target.style.color = palette.textSecondary;
    target.style.fontFamily = FONT_STACK_MONO;
    target.style.fontSize = '10px';
    target.style.whiteSpace = 'nowrap';
    target.style.overflow = 'hidden';
    target.style.textOverflow = 'ellipsis';

    const colorName = colorPreset.label.toLowerCase();
    if ((note.attachmentsCount ?? 0) > 0) {
      target.textContent = `${target.textContent} · ${colorName} highlight · ${note.attachmentsCount} image${note.attachmentsCount === 1 ? '' : 's'}`;
    } else {
      target.textContent = `${target.textContent} · ${colorName} highlight`;
    }

    body.appendChild(comment);
    body.appendChild(target);

    const deleteButton = makeIconButton('Delete note', createIcon(Trash2));
    deleteButton.style.width = '26px';
    deleteButton.style.height = '26px';
    deleteButton.style.borderColor = palette.iconButtonBorder;
    deleteButton.style.background = palette.iconButtonBackground;
    deleteButton.style.color = palette.iconButtonColor;
    setButtonDisabled(deleteButton, submitting);
    deleteButton.style.opacity = submitting ? '0.45' : '1';
    deleteButton.addEventListener('click', () => {
      onQueueDelete(note.id);
    });

    row.addEventListener('mouseenter', () => {
      setQueueHovered(note.id);
      onQueueHover(note.id);
      applyHoveredState(true);
    });

    row.addEventListener('mouseleave', () => {
      setQueueHovered(null);
      onQueueHover(null);
      applyHoveredState(false);
    });

    row.appendChild(indexChip);
    row.appendChild(body);
    row.appendChild(deleteButton);

    queueList.appendChild(row);
  });
}
