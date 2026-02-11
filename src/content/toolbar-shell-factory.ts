import { ChevronRight, Eye, PenLine, Send, Settings } from 'lucide';
import type { ToolbarControlPalette, ToolbarModePalette } from './toolbar-palette';
import { createIcon } from './toolbar-ui-utils';
import { FONT_STACK_MONO } from '../shared/visual-tokens';

interface CreateToolbarShellInput {
  toolbarPalette: ToolbarModePalette;
  controlPalette: ToolbarControlPalette;
  expandedShellMinWidth: number;
  collapsedShellWidth: number;
  toolbarOuterRadiusPx: number;
  toolbarContainerEasing: string;
  shellMorphDurationMs: number;
  shellMorphExpandEasing: string;
  shellMorphCollapseEasing: string;
  controlsOpacityDurationMs: number;
  controlsTransformDurationMs: number;
  getCollapsedContentTransition: (easing: string) => string;
  getShellTransition: (easing: string) => string;
  makeIconButton: (label: string, icon: HTMLElement) => HTMLButtonElement;
}

export interface ToolbarShellElements {
  container: HTMLDivElement;
  frame: HTMLDivElement;
  panelHost: HTMLDivElement;
  collapsedButton: HTMLButtonElement;
  collapsedBadge: HTMLSpanElement;
  expandedBar: HTMLDivElement;
  expandedControls: HTMLDivElement;
  markersButton: HTMLButtonElement;
  markersIcon: HTMLSpanElement;
  queueButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  settingsConnectionBadge: HTMLSpanElement;
  separator: HTMLSpanElement;
  collapseButton: HTMLButtonElement;
  queueBadge: HTMLSpanElement;
}

export function createToolbarShellElements(input: CreateToolbarShellInput): ToolbarShellElements {
  const {
    toolbarPalette,
    controlPalette,
    expandedShellMinWidth,
    collapsedShellWidth,
    toolbarOuterRadiusPx,
    toolbarContainerEasing,
    shellMorphDurationMs,
    shellMorphExpandEasing,
    shellMorphCollapseEasing,
    controlsOpacityDurationMs,
    controlsTransformDurationMs,
    getCollapsedContentTransition,
    getShellTransition,
    makeIconButton
  } = input;

  const container = document.createElement('div');
  container.setAttribute('data-notiv-ui', 'true');
  container.setAttribute('data-notiv-toolbar', 'true');
  container.style.position = 'fixed';
  container.style.bottom = '1.25rem';
  container.style.right = '1.25rem';
  container.style.opacity = '0';
  container.style.transform = 'translateY(10px) scale(0.98)';
  container.style.transition = `opacity 170ms ease, transform 190ms ${toolbarContainerEasing}`;
  container.style.zIndex = '2147483600';
  container.style.display = 'none';
  container.style.pointerEvents = 'none';

  const frame = document.createElement('div');
  frame.style.display = 'flex';
  frame.style.width = `${expandedShellMinWidth}px`;
  frame.style.position = 'relative';
  frame.style.pointerEvents = 'none';

  const panelHost = document.createElement('div');
  panelHost.style.position = 'absolute';
  panelHost.style.right = '2px';
  panelHost.style.bottom = 'calc(100% + 0.5rem)';
  panelHost.style.transform = 'translateY(8px) scale(0.98)';
  panelHost.style.opacity = '0';
  panelHost.style.transition = [
    'opacity 150ms ease',
    `transform 170ms ${toolbarContainerEasing}`,
    `width ${shellMorphDurationMs}ms ${shellMorphExpandEasing}`,
    `height ${shellMorphDurationMs}ms ${shellMorphExpandEasing}`
  ].join(', ');
  panelHost.style.display = 'none';
  panelHost.style.pointerEvents = 'none';
  panelHost.style.zIndex = '1';

  const collapsedButton = makeIconButton('Expand toolbar', createIcon(PenLine));
  collapsedButton.style.width = `${collapsedShellWidth}px`;
  collapsedButton.style.height = `${collapsedShellWidth}px`;
  collapsedButton.style.borderRadius = `${toolbarOuterRadiusPx}px`;
  collapsedButton.style.border = 'none';
  collapsedButton.style.background = 'transparent';
  collapsedButton.style.color = toolbarPalette.iconColor;
  collapsedButton.style.boxShadow = 'none';
  collapsedButton.style.position = 'absolute';
  collapsedButton.style.top = '0';
  collapsedButton.style.right = '0';
  collapsedButton.style.display = 'flex';
  collapsedButton.style.alignItems = 'center';
  collapsedButton.style.justifyContent = 'center';
  collapsedButton.style.opacity = '1';
  collapsedButton.style.pointerEvents = 'auto';
  collapsedButton.style.transition = getCollapsedContentTransition(shellMorphCollapseEasing);
  collapsedButton.style.visibility = 'visible';
  collapsedButton.dataset.notivRestBackground = 'transparent';
  collapsedButton.dataset.notivRestBorder = 'transparent';
  collapsedButton.dataset.notivRestColor = toolbarPalette.iconColor;
  collapsedButton.dataset.notivRestShadow = 'none';
  collapsedButton.dataset.notivHoverBackground = 'transparent';
  collapsedButton.dataset.notivHoverBorder = 'transparent';
  collapsedButton.dataset.notivHoverColor = toolbarPalette.iconColor;
  collapsedButton.dataset.notivHoverShadow = 'none';
  collapsedButton.dataset.notivPressedBackground = 'transparent';
  collapsedButton.dataset.notivPressedBorder = 'transparent';
  collapsedButton.dataset.notivPressedColor = toolbarPalette.iconColor;
  collapsedButton.dataset.notivPressedShadow = 'none';

  const collapsedBadge = document.createElement('span');
  collapsedBadge.style.position = 'absolute';
  collapsedBadge.style.top = '-5px';
  collapsedBadge.style.right = '-5px';
  collapsedBadge.style.minWidth = '16px';
  collapsedBadge.style.height = '16px';
  collapsedBadge.style.borderRadius = '999px';
  collapsedBadge.style.padding = '0 3px';
  collapsedBadge.style.border = `1.25px solid ${controlPalette.badgeBorder}`;
  collapsedBadge.style.background = controlPalette.collapsedBadgeBackground;
  collapsedBadge.style.color = controlPalette.collapsedBadgeColor;
  collapsedBadge.style.display = 'none';
  collapsedBadge.style.placeItems = 'center';
  collapsedBadge.style.fontFamily = FONT_STACK_MONO;
  collapsedBadge.style.fontSize = '10px';
  collapsedBadge.style.fontWeight = '700';
  collapsedButton.appendChild(collapsedBadge);

  const expandedBar = document.createElement('div');
  expandedBar.style.display = 'flex';
  expandedBar.style.alignItems = 'center';
  expandedBar.style.justifyContent = 'center';
  expandedBar.style.padding = '0';
  expandedBar.style.border = `1.25px solid ${toolbarPalette.shellBorder}`;
  expandedBar.style.borderRadius = `${toolbarOuterRadiusPx}px`;
  expandedBar.style.background = toolbarPalette.shellBackground;
  expandedBar.style.boxShadow = toolbarPalette.shellShadow;
  expandedBar.style.width = `${collapsedShellWidth}px`;
  expandedBar.style.height = `${collapsedShellWidth}px`;
  expandedBar.style.boxSizing = 'border-box';
  expandedBar.style.cursor = 'pointer';
  expandedBar.style.marginLeft = 'auto';
  expandedBar.style.pointerEvents = 'none';
  expandedBar.style.userSelect = 'none';
  expandedBar.style.overflow = 'hidden';
  expandedBar.style.transition = getShellTransition(shellMorphCollapseEasing);

  const expandedControls = document.createElement('div');
  expandedControls.style.display = 'flex';
  expandedControls.style.alignItems = 'center';
  expandedControls.style.gap = '6px';
  expandedControls.style.opacity = '0';
  expandedControls.style.filter = 'blur(10px)';
  expandedControls.style.transform = 'scale(0.4)';
  expandedControls.style.transformOrigin = '50% 50%';
  expandedControls.style.pointerEvents = 'none';
  expandedControls.style.visibility = 'hidden';
  expandedControls.style.transition = [
    `filter ${controlsOpacityDurationMs}ms ${toolbarContainerEasing}`,
    `opacity ${controlsOpacityDurationMs}ms ${toolbarContainerEasing}`,
    `transform ${controlsTransformDurationMs}ms ${toolbarContainerEasing}`
  ].join(', ');

  const markersIcon = createIcon(Eye);
  const markersButton = makeIconButton('Toggle markers', markersIcon);
  const queueButton = makeIconButton('Open notes', createIcon(Send));
  const settingsButton = makeIconButton('Open settings', createIcon(Settings));
  settingsButton.style.position = 'relative';

  const settingsConnectionBadge = document.createElement('span');
  settingsConnectionBadge.setAttribute('aria-hidden', 'true');
  settingsConnectionBadge.style.position = 'absolute';
  settingsConnectionBadge.style.top = '5px';
  settingsConnectionBadge.style.right = '5px';
  settingsConnectionBadge.style.width = '7px';
  settingsConnectionBadge.style.height = '7px';
  settingsConnectionBadge.style.borderRadius = '999px';
  settingsConnectionBadge.style.transition = 'background 160ms ease, box-shadow 160ms ease, border-color 160ms ease';
  settingsConnectionBadge.style.pointerEvents = 'none';
  settingsButton.appendChild(settingsConnectionBadge);

  const separator = document.createElement('span');
  separator.setAttribute('aria-hidden', 'true');
  separator.style.width = '1px';
  separator.style.height = '18px';
  separator.style.background = controlPalette.separator;
  separator.style.margin = '0 1px';
  separator.style.borderRadius = '999px';

  const collapseButton = makeIconButton('Collapse toolbar', createIcon(ChevronRight));
  const toolbarButtonRadius = `${Math.round((Number.parseFloat(markersButton.style.width) || 34) / 2)}px`;
  [markersButton, queueButton, settingsButton, collapseButton].forEach((button) => {
    button.style.borderRadius = toolbarButtonRadius;
  });

  const queueBadge = document.createElement('span');
  queueBadge.style.position = 'absolute';
  queueBadge.style.top = '-4px';
  queueBadge.style.right = '-4px';
  queueBadge.style.minWidth = '16px';
  queueBadge.style.height = '16px';
  queueBadge.style.borderRadius = '999px';
  queueBadge.style.padding = '0 3px';
  queueBadge.style.border = `1.25px solid ${controlPalette.badgeBorder}`;
  queueBadge.style.background = controlPalette.queueBadgeBackground;
  queueBadge.style.color = controlPalette.queueBadgeColor;
  queueBadge.style.display = 'none';
  queueBadge.style.placeItems = 'center';
  queueBadge.style.fontFamily = FONT_STACK_MONO;
  queueBadge.style.fontSize = '10px';
  queueBadge.style.fontWeight = '700';
  queueButton.style.position = 'relative';
  queueButton.appendChild(queueBadge);

  expandedControls.appendChild(markersButton);
  expandedControls.appendChild(queueButton);
  expandedControls.appendChild(settingsButton);
  expandedControls.appendChild(separator);
  expandedControls.appendChild(collapseButton);
  expandedBar.appendChild(expandedControls);

  return {
    container,
    frame,
    panelHost,
    collapsedButton,
    collapsedBadge,
    expandedBar,
    expandedControls,
    markersButton,
    markersIcon,
    queueButton,
    settingsButton,
    settingsConnectionBadge,
    separator,
    collapseButton,
    queueBadge
  };
}
