import { Moon, Sun } from 'lucide';
import type { NotivThemeMode, PanelPalette } from './toolbar-palette';
import { createIcon, makeSpinner, makeTextButton } from './toolbar-ui-utils';
import { FONT_STACK_MONO, FONT_STACK_SERIF, getVisualModeTokens } from '../shared/visual-tokens';

interface SettingsPanelState {
  loading: boolean;
  connected: boolean;
  viewerName?: string;
  organizationName?: string;
  tokenMasked: string;
  notice?: string;
  error?: string;
}

interface RenderSettingsPanelInput {
  settingsPanel: HTMLDivElement;
  palette: PanelPalette;
  colorMode: NotivThemeMode;
  settingsState: SettingsPanelState;
  makeIconButton: (label: string, icon: HTMLElement) => HTMLButtonElement;
  onToggleTheme: () => void;
  onOpenSettingsPage: () => void;
}

export function renderSettingsPanelContent(input: RenderSettingsPanelInput): void {
  const {
    settingsPanel,
    palette,
    colorMode,
    settingsState,
    onToggleTheme,
    onOpenSettingsPage
  } = input;
  settingsPanel.textContent = '';

  settingsPanel.style.gap = '8px';

  const heading = document.createElement('div');
  heading.style.display = 'flex';
  heading.style.alignItems = 'center';
  heading.style.justifyContent = 'space-between';
  heading.style.gap = '8px';

  const headingTitle = document.createElement('div');
  headingTitle.textContent = 'Settings';
  headingTitle.style.color = palette.headingColor;
  headingTitle.style.fontFamily = FONT_STACK_SERIF;
  headingTitle.style.fontSize = '14px';
  headingTitle.style.fontWeight = '600';

  const headingActions = document.createElement('div');
  headingActions.style.display = 'flex';
  headingActions.style.alignItems = 'center';
  headingActions.style.gap = '6px';

  const openSettingsButton = makeTextButton('Open', true);
  openSettingsButton.style.padding = '5px 8px';
  openSettingsButton.style.height = '28px';
  openSettingsButton.style.fontSize = '11px';
  openSettingsButton.style.borderColor = 'transparent';
  openSettingsButton.style.background = 'transparent';
  openSettingsButton.style.color = palette.textMuted;
  openSettingsButton.addEventListener('click', () => onOpenSettingsPage());

  const themeToggle = document.createElement('button');
  themeToggle.type = 'button';
  themeToggle.title = colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  themeToggle.setAttribute('aria-label', themeToggle.title);
  themeToggle.appendChild(createIcon(colorMode === 'dark' ? Sun : Moon));
  themeToggle.style.appearance = 'none';
  themeToggle.style.width = '28px';
  themeToggle.style.height = '28px';
  themeToggle.style.border = 'none';
  themeToggle.style.borderRadius = '6px';
  themeToggle.style.background = 'transparent';
  themeToggle.style.color = palette.textMuted;
  themeToggle.style.cursor = 'pointer';
  themeToggle.style.display = 'inline-grid';
  themeToggle.style.placeItems = 'center';
  themeToggle.style.transition = 'background 120ms ease, color 120ms ease';
  themeToggle.addEventListener('mouseenter', () => {
    themeToggle.style.background = colorMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(17, 17, 17, 0.05)';
    themeToggle.style.color = palette.textPrimary;
  });
  themeToggle.addEventListener('mouseleave', () => {
    themeToggle.style.background = 'transparent';
    themeToggle.style.color = palette.textMuted;
  });
  themeToggle.addEventListener('click', () => onToggleTheme());

  headingActions.appendChild(openSettingsButton);
  headingActions.appendChild(themeToggle);

  heading.appendChild(headingTitle);
  heading.appendChild(headingActions);
  settingsPanel.appendChild(heading);

  if (settingsState.loading) {
    const loadingRow = document.createElement('div');
    loadingRow.style.display = 'flex';
    loadingRow.style.alignItems = 'center';
    loadingRow.style.gap = '8px';
    loadingRow.style.padding = '4px 0';
    const spinner = makeSpinner(12);
    const text = document.createElement('span');
    text.textContent = 'Syncing...';
    text.style.color = palette.textSecondary;
    text.style.fontSize = '12px';
    text.style.fontFamily = FONT_STACK_MONO;
    loadingRow.appendChild(spinner);
    loadingRow.appendChild(text);
    settingsPanel.appendChild(loadingRow);
    return;
  }

  const connected = settingsState.connected;
  const who = settingsState.viewerName?.trim() || 'Unknown user';
  const org = settingsState.organizationName?.trim() || 'Unknown workspace';
  const hasError = Boolean(settingsState.error?.trim());
  const visualTokens = getVisualModeTokens(colorMode);

  const statusRow = document.createElement('div');
  statusRow.style.display = 'flex';
  statusRow.style.alignItems = 'center';
  statusRow.style.gap = '8px';
  statusRow.style.padding = '4px 0';

  const statusDot = document.createElement('div');
  statusDot.style.width = '8px';
  statusDot.style.height = '8px';
  statusDot.style.borderRadius = '999px';
  statusDot.style.flexShrink = '0';
  if (hasError) {
    statusDot.style.background = colorMode === 'dark' ? '#e4868e' : '#c62828';
  } else if (connected) {
    statusDot.style.background = colorMode === 'dark' ? '#67c88e' : '#237147';
  } else {
    statusDot.style.background = colorMode === 'dark' ? '#9a9a9a' : '#888888';
  }

  const identityWrap = document.createElement('div');
  identityWrap.style.minWidth = '0';
  identityWrap.style.flex = '1';

  const identity = document.createElement('div');
  identity.textContent = connected ? who : hasError ? 'Connection error' : 'Not connected';
  identity.style.color = palette.textPrimary;
  identity.style.fontFamily = FONT_STACK_SERIF;
  identity.style.fontSize = '14px';
  identity.style.fontWeight = '500';
  identity.style.lineHeight = '1.3';
  identity.style.whiteSpace = 'nowrap';
  identity.style.overflow = 'hidden';
  identity.style.textOverflow = 'ellipsis';

  const identitySub = document.createElement('div');
  identitySub.textContent = connected ? org : hasError ? 'Reconnect from settings' : 'Connect via settings';
  identitySub.style.marginTop = '2px';
  identitySub.style.color = palette.textMuted;
  identitySub.style.fontFamily = FONT_STACK_MONO;
  identitySub.style.fontSize = '10px';
  identitySub.style.whiteSpace = 'nowrap';
  identitySub.style.overflow = 'hidden';
  identitySub.style.textOverflow = 'ellipsis';
  identitySub.style.opacity = '0.8';

  identityWrap.appendChild(identity);
  identityWrap.appendChild(identitySub);

  statusRow.appendChild(statusDot);
  statusRow.appendChild(identityWrap);
  settingsPanel.appendChild(statusRow);

  if (settingsState.notice || settingsState.error) {
    const message = document.createElement('div');
    message.textContent = settingsState.error ?? settingsState.notice ?? '';
    message.style.padding = '6px 8px';
    message.style.borderRadius = '6px';
    message.style.fontSize = '10px';
    message.style.fontFamily = FONT_STACK_MONO;
    message.style.lineHeight = '1.35';
    const tone = settingsState.error ? visualTokens.message.error : visualTokens.message.notice;
    if (settingsState.error) {
      message.style.border = `1.25px solid ${tone.border}`;
      message.style.background = tone.background;
      message.style.color = tone.color;
    } else {
      message.style.border = `1.25px solid ${tone.border}`;
      message.style.background = tone.background;
      message.style.color = tone.color;
    }
    settingsPanel.appendChild(message);
  }
}
