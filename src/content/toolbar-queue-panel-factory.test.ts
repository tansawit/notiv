import { describe, expect, it } from 'vitest';
import { getPanelPalette } from './toolbar-palette';
import { createToolbarQueuePanelElements } from './toolbar-queue-panel-factory';

function makePanelShell(title: string): HTMLDivElement {
  const panel = document.createElement('div');
  const heading = document.createElement('div');
  heading.textContent = title;
  panel.appendChild(heading);
  return panel;
}

describe('createToolbarQueuePanelElements', () => {
  it('builds queue panel with expected controls', () => {
    const elements = createToolbarQueuePanelElements({
      colorMode: 'light',
      panelPalette: getPanelPalette('light'),
      makePanelShell
    });

    expect(elements.queuePanel.childElementCount).toBe(4);
    expect(elements.queueEmpty.textContent).toBe('No notes yet.');
    expect(elements.queueSubmitButton.textContent).toBe('Submit notes');
    expect(elements.queueClearButton.textContent).toBe('Clear all');
    expect(elements.queueList.style.display).toBe('grid');
  });
});
