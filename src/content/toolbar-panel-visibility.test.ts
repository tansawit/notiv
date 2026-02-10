import { describe, expect, it, vi } from 'vitest';
import {
  morphPanelHostSize,
  refreshPanelVisibility,
  type ToolbarPanelType
} from './toolbar-panel-visibility';

function makePanels(): {
  submitPanel: HTMLDivElement;
  queuePanel: HTMLDivElement;
  settingsPanel: HTMLDivElement;
  panelHost: HTMLDivElement;
} {
  return {
    submitPanel: document.createElement('div'),
    queuePanel: document.createElement('div'),
    settingsPanel: document.createElement('div'),
    panelHost: document.createElement('div')
  };
}

describe('refreshPanelVisibility', () => {
  it('hides panel host after delay when active panel is none', () => {
    vi.useFakeTimers();
    const elements = makePanels();
    elements.panelHost.style.display = 'block';

    const activePanel: ToolbarPanelType = 'none';
    let renderedPanel: ToolbarPanelType = 'submit';
    let panelVisibilityTimer: number | null = null;
    let panelResizeTimer: number | null = null;
    let panelMorphTimer: number | null = null;

    refreshPanelVisibility({
      ...elements,
      activePanel,
      getActivePanel: () => activePanel,
      renderedPanel,
      panelVisibilityTimer,
      panelResizeTimer,
      panelMorphTimer,
      onPanelVisibilityTimerChange: (next) => {
        panelVisibilityTimer = next;
      },
      onPanelResizeTimerChange: (next) => {
        panelResizeTimer = next;
      },
      onPanelMorphTimerChange: (next) => {
        panelMorphTimer = next;
      },
      prepareActivePanelContent: vi.fn(),
      morphPanelHostSize: vi.fn(),
      onRenderedPanelChange: (next) => {
        renderedPanel = next;
      }
    });

    expect(renderedPanel).toBe('none');
    expect(panelVisibilityTimer).not.toBeNull();
    expect(elements.submitPanel.style.display).toBe('none');
    expect(elements.queuePanel.style.display).toBe('none');
    expect(elements.settingsPanel.style.display).toBe('none');

    vi.advanceTimersByTime(170);
    expect(elements.panelHost.style.display).toBe('none');
    vi.useRealTimers();
  });
});

describe('morphPanelHostSize', () => {
  it('sets and clears resize/morph timers while animating between panels', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    const elements = makePanels();
    const activePanel: ToolbarPanelType = 'submit';
    let panelResizeTimer: number | null = null;
    let panelMorphTimer: number | null = null;

    vi.spyOn(elements.queuePanel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 120,
      height: 70,
      top: 0,
      right: 120,
      bottom: 70,
      left: 0,
      toJSON: () => ({})
    } as DOMRect);
    vi.spyOn(elements.submitPanel, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 220,
      height: 110,
      top: 0,
      right: 220,
      bottom: 110,
      left: 0,
      toJSON: () => ({})
    } as DOMRect);

    morphPanelHostSize({
      ...elements,
      previousPanel: 'queue',
      nextPanel: 'submit',
      getActivePanel: () => activePanel,
      toolbarContainerEasing: 'ease',
      shellMorphDurationMs: 320,
      shellMorphExpandEasing: 'ease',
      panelResizeTimer,
      panelMorphTimer,
      onPanelResizeTimerChange: (next) => {
        panelResizeTimer = next;
      },
      onPanelMorphTimerChange: (next) => {
        panelMorphTimer = next;
      }
    });

    expect(panelResizeTimer).not.toBeNull();
    expect(panelMorphTimer).not.toBeNull();
    expect(elements.panelHost.style.width).toBe('220px');
    expect(elements.panelHost.style.height).toBe('110px');

    vi.advanceTimersByTime(200);
    expect(elements.panelHost.style.width).toBe('220px');

    vi.advanceTimersByTime(320);
    expect(panelMorphTimer).toBeNull();
    expect(elements.queuePanel.style.display).toBe('none');
    expect(elements.panelHost.style.width).toBe('');
    expect(elements.panelHost.style.height).toBe('');

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
