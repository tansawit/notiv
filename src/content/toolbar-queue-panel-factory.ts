import type { NotivThemeMode, PanelPalette } from './toolbar-palette';
import { makeTextButton } from './toolbar-ui-utils';
import { FONT_STACK_SERIF } from '../shared/visual-tokens';

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
  const { panelPalette, makePanelShell } = input;

  const queuePanel = makePanelShell('');
  queuePanel.style.gap = '8px';

  const panelHeading = queuePanel.querySelector('[data-panel-title="true"]');
  if (panelHeading) {
    (panelHeading as HTMLElement).style.display = 'none';
  }

  const queueHeader = document.createElement('div');
  queueHeader.style.display = 'flex';
  queueHeader.style.justifyContent = 'space-between';
  queueHeader.style.alignItems = 'center';
  queueHeader.style.gap = '8px';

  const queueTitle = document.createElement('div');
  queueTitle.setAttribute('data-queue-title', 'true');
  queueTitle.textContent = 'Notes';
  queueTitle.style.color = panelPalette.headingColor;
  queueTitle.style.fontFamily = FONT_STACK_SERIF;
  queueTitle.style.fontSize = '14px';
  queueTitle.style.fontWeight = '600';

  const queueActions = document.createElement('div');
  queueActions.style.display = 'flex';
  queueActions.style.alignItems = 'center';
  queueActions.style.gap = '6px';

  const queueSubmitButton = makeTextButton('Submit');
  queueSubmitButton.style.padding = '5px 10px';
  queueSubmitButton.style.height = '28px';
  queueSubmitButton.style.fontSize = '11px';
  queueSubmitButton.style.fontWeight = '500';
  queueSubmitButton.style.borderColor = panelPalette.textMuted;
  queueSubmitButton.style.background = 'transparent';
  queueSubmitButton.style.color = panelPalette.textPrimary;

  const queueClearButton = makeTextButton('Clear', true);
  queueClearButton.style.padding = '5px 8px';
  queueClearButton.style.height = '28px';
  queueClearButton.style.fontSize = '11px';
  queueClearButton.style.borderColor = 'transparent';
  queueClearButton.style.background = 'transparent';
  queueClearButton.style.color = panelPalette.textMuted;

  queueActions.appendChild(queueSubmitButton);
  queueActions.appendChild(queueClearButton);

  queueHeader.appendChild(queueTitle);
  queueHeader.appendChild(queueActions);

  const queueEmpty = document.createElement('div');
  queueEmpty.style.display = 'none';
  queueEmpty.style.padding = '8px 0';

  const queueList = document.createElement('div');
  queueList.style.display = 'grid';
  queueList.style.gap = '7px';
  queueList.style.maxHeight = '260px';
  queueList.style.overflowY = 'auto';

  queuePanel.appendChild(queueHeader);
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
