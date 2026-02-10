import type { NotivThemeMode, PanelPalette } from './toolbar-palette';
import { makeTextButton } from './toolbar-ui-utils';
import { FONT_STACK_MONO, FONT_STACK_SERIF, getVisualModeTokens } from '../shared/visual-tokens';

interface CreateToolbarQueuePanelInput {
  colorMode: NotivThemeMode;
  panelPalette: PanelPalette;
  makePanelShell: (title: string) => HTMLDivElement;
}

export interface ToolbarQueuePanelElements {
  queuePanel: HTMLDivElement;
  queueList: HTMLDivElement;
  queueSubmitButton: HTMLButtonElement;
  queueClearButton: HTMLButtonElement;
  queueEmpty: HTMLDivElement;
}

export function createToolbarQueuePanelElements(
  input: CreateToolbarQueuePanelInput
): ToolbarQueuePanelElements {
  const { colorMode, panelPalette, makePanelShell } = input;

  const queuePanel = makePanelShell('Notes');
  queuePanel.style.gap = '8px';

  const queueActions = document.createElement('div');
  queueActions.style.display = 'flex';
  queueActions.style.justifyContent = 'space-between';
  queueActions.style.alignItems = 'center';
  queueActions.style.gap = '10px';
  queueActions.style.marginBottom = '2px';

  const queueCount = document.createElement('div');
  queueCount.setAttribute('data-queue-count', 'true');
  queueCount.style.color = panelPalette.textSecondary;
  queueCount.style.fontFamily = FONT_STACK_MONO;
  queueCount.style.fontSize = '11px';

  const queueClearButton = makeTextButton('Clear all', true);
  queueClearButton.style.padding = '4px 8px';
  queueClearButton.style.height = '26px';
  queueClearButton.style.fontSize = '11px';
  queueClearButton.style.borderColor = panelPalette.subtleButtonBorder;
  queueClearButton.style.background = panelPalette.subtleButtonBackground;
  queueClearButton.style.color = panelPalette.subtleButtonColor;

  const queueSubmitButton = makeTextButton('Submit notes');
  queueSubmitButton.style.padding = '4px 8px';
  queueSubmitButton.style.height = '26px';
  queueSubmitButton.style.fontSize = '11px';
  const visualTokens = getVisualModeTokens(colorMode);
  queueSubmitButton.style.borderColor = visualTokens.primaryAction.border;
  queueSubmitButton.style.background = visualTokens.primaryAction.background;
  queueSubmitButton.style.color = visualTokens.primaryAction.color;

  const queueActionButtons = document.createElement('div');
  queueActionButtons.style.display = 'flex';
  queueActionButtons.style.alignItems = 'center';
  queueActionButtons.style.gap = '6px';
  queueActions.appendChild(queueCount);
  queueActionButtons.appendChild(queueSubmitButton);
  queueActionButtons.appendChild(queueClearButton);
  queueActions.appendChild(queueActionButtons);

  const queueEmpty = document.createElement('div');
  queueEmpty.style.color = panelPalette.textSecondary;
  queueEmpty.style.fontFamily = FONT_STACK_SERIF;
  queueEmpty.style.fontSize = '13px';
  queueEmpty.textContent = 'No notes yet.';

  const queueList = document.createElement('div');
  queueList.style.display = 'grid';
  queueList.style.gap = '7px';
  queueList.style.maxHeight = '260px';
  queueList.style.overflowY = 'auto';

  queuePanel.appendChild(queueActions);
  queuePanel.appendChild(queueEmpty);
  queuePanel.appendChild(queueList);

  return {
    queuePanel,
    queueList,
    queueSubmitButton,
    queueClearButton,
    queueEmpty
  };
}
