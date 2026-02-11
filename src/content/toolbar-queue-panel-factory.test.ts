import { describe, expect, it } from 'vitest';
import { getPanelPalette } from './toolbar-palette';
import { createToolbarQueuePanelElements } from './toolbar-queue-panel-factory';

function makePanelShell(title: string): HTMLDivElement {
  const panel = document.createElement('div');
  const heading = document.createElement('div');
  heading.setAttribute('data-panel-title', 'true');
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
    expect(elements.queueEmpty.style.display).toBe('none');
    expect(elements.queueSubmitButton.textContent).toBe('Submit');
    expect(elements.queueClearButton.textContent).toBe('Clear');
    expect(elements.queueList.style.display).toBe('grid');
    expect(elements.queueSubmitButton.style.fontWeight).toBe('500');
  });
});
