import type { LinearLabel } from '../shared/types';
import type { PanelPalette } from './toolbar-palette';
import { setButtonDisabled } from './toolbar-ui-utils';
import { FONT_STACK_MONO, UTILITY_STYLE_TOKENS } from '../shared/visual-tokens';

interface RenderSubmitLabelChipsInput {
  submitLabelsWrap: HTMLDivElement;
  labelOptions: LinearLabel[];
  selectedLabelIds: Set<string>;
  submitting: boolean;
  palette: PanelPalette;
  onRemoveLabel: (labelId: string) => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return `rgba(${UTILITY_STYLE_TOKENS.labelChipFallbackRgb}, ${alpha})`;
  }
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function renderSubmitLabelChipsContent(input: RenderSubmitLabelChipsInput): void {
  const { submitLabelsWrap, labelOptions, selectedLabelIds, submitting, palette, onRemoveLabel } = input;
  submitLabelsWrap.textContent = '';

  const labelsById = new Map(labelOptions.map((label) => [label.id, label]));
  const selectedLabels = Array.from(selectedLabelIds)
    .map((labelId) => labelsById.get(labelId))
    .filter((label): label is LinearLabel => Boolean(label));

  if (selectedLabels.length === 0) {
    return;
  }

  selectedLabels.forEach((label) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.style.appearance = 'none';
    chip.style.display = 'inline-flex';
    chip.style.alignItems = 'center';
    chip.style.gap = '7px';
    chip.style.border = `1.5px solid ${hexToRgba(label.color, 0.42)}`;
    chip.style.borderRadius = '4px';
    chip.style.padding = '4px 8px 4px 7px';
    chip.style.background = hexToRgba(label.color, 0.16);
    chip.style.color = palette.textPrimary;
    chip.style.fontFamily = FONT_STACK_MONO;
    chip.style.fontSize = '11px';
    chip.style.cursor = 'pointer';
    chip.style.lineHeight = '1';
    chip.style.whiteSpace = 'nowrap';
    chip.style.transition = 'border-color 100ms ease, background 100ms ease';

    const colorDot = document.createElement('span');
    colorDot.style.width = '9px';
    colorDot.style.height = '9px';
    colorDot.style.borderRadius = '999px';
    colorDot.style.background = label.color;
    colorDot.style.flexShrink = '0';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = label.name;

    const removeIcon = document.createElement('span');
    removeIcon.textContent = 'x';
    removeIcon.style.fontSize = '12px';
    removeIcon.style.lineHeight = '1';
    removeIcon.style.opacity = '0.6';
    removeIcon.style.marginLeft = '1px';

    chip.appendChild(colorDot);
    chip.appendChild(nameSpan);
    chip.appendChild(removeIcon);

    chip.addEventListener('mouseenter', () => {
      chip.style.borderColor = hexToRgba(label.color, 0.6);
      chip.style.background = hexToRgba(label.color, 0.28);
    });
    chip.addEventListener('mouseleave', () => {
      chip.style.borderColor = hexToRgba(label.color, 0.42);
      chip.style.background = hexToRgba(label.color, 0.16);
    });

    setButtonDisabled(chip, submitting);
    chip.style.opacity = submitting ? '0.55' : '1';
    chip.addEventListener('click', () => {
      onRemoveLabel(label.id);
    });
    submitLabelsWrap.appendChild(chip);
  });
}
