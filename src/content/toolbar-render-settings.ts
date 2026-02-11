import { Moon, Sun } from 'lucide';
import type { NotivThemeMode, PanelPalette } from './toolbar-palette';
import { createIcon, makeSkeletonLine, makeSpinner, makeTextButton } from './toolbar-ui-utils';
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
    makeIconButton,
    onToggleTheme,
    onOpenSettingsPage
  } = input;
  settingsPanel.textContent = '';

  settingsPanel.style.gap = '6px';

  const heading = document.createElement('div');
  heading.style.display = 'flex';
  heading.style.alignItems = 'center';
  heading.style.justifyContent = 'space-between';
  heading.style.gap = '8px';

  const headingTitle = document.createElement('div');
  headingTitle.textContent = 'Settings';
  headingTitle.style.color = palette.headingColor;
  headingTitle.style.fontFamily = FONT_STACK_SERIF;
  headingTitle.style.fontSize = '13px';
  headingTitle.style.fontWeight = '600';

  const headingContext = makeIconButton(
    colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
    createIcon(colorMode === 'dark' ? Sun : Moon)
  );
  headingContext.style.width = '30px';
  headingContext.style.height = '30px';
  headingContext.style.border = `1.25px solid ${palette.iconButtonBorder}`;
  headingContext.style.borderRadius = '6px';
  headingContext.style.background = palette.iconButtonBackground;
  headingContext.style.color = palette.iconButtonColor;
  headingContext.addEventListener('click', () => {
    onToggleTheme();
  });

  heading.appendChild(headingTitle);
  heading.appendChild(headingContext);
  settingsPanel.appendChild(heading);

  if (settingsState.loading) {
    const loadingCard = document.createElement('div');
    loadingCard.style.border = `1.25px solid ${palette.surfaceBorder}`;
    loadingCard.style.borderRadius = '6px';
    loadingCard.style.padding = '8px';
    loadingCard.style.display = 'grid';
    loadingCard.style.gap = '7px';
    loadingCard.style.background = palette.surfaceBackground;

    const top = document.createElement('div');
    top.style.display = 'flex';
    top.style.alignItems = 'center';
    top.style.gap = '8px';
    const spinner = makeSpinner(12);
    const text = document.createElement('span');
    text.textContent = 'Syncing Linear settings...';
    text.style.color = palette.textSecondary;
    text.style.fontSize = '12px';
    text.style.fontFamily = FONT_STACK_MONO;
    top.appendChild(spinner);
    top.appendChild(text);

    loadingCard.appendChild(top);
    loadingCard.appendChild(makeSkeletonLine('66%'));
    loadingCard.appendChild(makeSkeletonLine('44%'));
    loadingCard.appendChild(makeSkeletonLine('84%'));
    settingsPanel.appendChild(loadingCard);
    return;
  }

  const connected = settingsState.connected;
  const who = settingsState.viewerName?.trim() || 'Unknown user';
  const org = settingsState.organizationName?.trim() || 'Unknown workspace';
  const hasToken = Boolean(settingsState.tokenMasked.trim());
  const hasError = Boolean(settingsState.error?.trim());
  const visualTokens = getVisualModeTokens(colorMode);

  const card = document.createElement('div');
  card.style.border = `1.25px solid ${palette.surfaceBorder}`;
  card.style.borderRadius = '6px';
  card.style.padding = '8px';
  card.style.display = 'grid';
  card.style.gap = '7px';
  card.style.background = palette.surfaceBackground;
  card.style.boxShadow = 'none';

  const statusRow = document.createElement('div');
  statusRow.style.display = 'flex';
  statusRow.style.justifyContent = 'space-between';
  statusRow.style.alignItems = 'center';
  statusRow.style.gap = '8px';

  const identityWrap = document.createElement('div');
  identityWrap.style.minWidth = '0';
  identityWrap.style.display = 'grid';
  identityWrap.style.gap = '1px';

  const identity = document.createElement('div');
  identity.textContent = connected ? who : hasError ? 'Linear needs attention' : 'Linear not connected';
  identity.style.color = palette.textPrimary;
  identity.style.fontFamily = FONT_STACK_SERIF;
  identity.style.fontSize = '12px';
  identity.style.fontWeight = '560';
  identity.style.lineHeight = '1.2';
  identity.style.whiteSpace = 'nowrap';
  identity.style.overflow = 'hidden';
  identity.style.textOverflow = 'ellipsis';

  const identitySub = document.createElement('div');
  identitySub.textContent = connected ? org : hasError ? 'Connection failed. Reconnect from extension settings.' : 'Use OAuth in extension settings to connect';
  identitySub.style.color = palette.textSecondary;
  identitySub.style.fontFamily = FONT_STACK_MONO;
  identitySub.style.fontSize = '9px';
  identitySub.style.letterSpacing = '0.01em';
  identitySub.style.whiteSpace = 'nowrap';
  identitySub.style.overflow = 'hidden';
  identitySub.style.textOverflow = 'ellipsis';

  identityWrap.appendChild(identity);
  identityWrap.appendChild(identitySub);

  const statusPill = document.createElement('div');
  const statusTone = hasError
    ? visualTokens.statusPill.error
    : connected
      ? visualTokens.statusPill.connected
      : visualTokens.statusPill.offline;
  statusPill.textContent = hasError ? 'Error' : connected ? 'Connected' : 'Offline';
  statusPill.style.border = `1.25px solid ${statusTone.border}`;
  statusPill.style.borderRadius = '999px';
  statusPill.style.padding = '2px 7px';
  statusPill.style.fontSize = '9px';
  statusPill.style.fontWeight = '560';
  statusPill.style.fontFamily = FONT_STACK_MONO;
  statusPill.style.color = statusTone.color;
  statusPill.style.background = statusTone.background;
  statusPill.style.textTransform = 'uppercase';
  statusPill.style.letterSpacing = '0.02em';

  statusRow.appendChild(identityWrap);
  statusRow.appendChild(statusPill);
  card.appendChild(statusRow);

  if (!hasToken) {
    const tokenHelp = document.createElement('div');
    tokenHelp.style.border = `1px dashed ${palette.infoBorder}`;
    tokenHelp.style.borderRadius = '6px';
    tokenHelp.style.padding = '7px 8px';
    tokenHelp.style.background = palette.infoBackground;
    tokenHelp.style.color = palette.infoText;
    tokenHelp.style.fontFamily = FONT_STACK_MONO;
    tokenHelp.style.fontSize = '10px';
    tokenHelp.style.lineHeight = '1.35';
    tokenHelp.textContent = 'Use OAuth from extension settings to connect Linear.';
    card.appendChild(tokenHelp);
  }

  const shouldShowAuthDetails = !connected || hasError || !hasToken;
  if (shouldShowAuthDetails) {
    const tokenLabel = document.createElement('div');
    tokenLabel.textContent = 'Authentication';
    tokenLabel.style.color = palette.textSecondary;
    tokenLabel.style.fontFamily = FONT_STACK_MONO;
    tokenLabel.style.fontSize = '9px';
    tokenLabel.style.textTransform = 'uppercase';
    tokenLabel.style.letterSpacing = '0.03em';
    card.appendChild(tokenLabel);

    const authSummary = document.createElement('div');
    authSummary.textContent = connected
      ? 'Authenticated in extension settings.'
      : 'Not authenticated. Connect from extension settings.';
    authSummary.style.border = `1px dashed ${palette.inputBorder}`;
    authSummary.style.borderRadius = '6px';
    authSummary.style.padding = '8px 9px';
    authSummary.style.fontFamily = FONT_STACK_MONO;
    authSummary.style.fontSize = '10px';
    authSummary.style.lineHeight = '1.35';
    authSummary.style.color = palette.textSecondary;
    authSummary.style.background = palette.inputBackground;
    authSummary.style.flex = '1 1 180px';

    card.appendChild(authSummary);
  }

  settingsPanel.appendChild(card);

  const actionRow = document.createElement('div');
  actionRow.style.display = 'flex';
  actionRow.style.justifyContent = 'flex-end';
  actionRow.style.paddingTop = '2px';

  const openSettingsButton = makeTextButton('Open settings');
  openSettingsButton.style.padding = '7px 10px';
  openSettingsButton.style.height = '30px';
  openSettingsButton.style.fontSize = '11px';
  openSettingsButton.style.whiteSpace = 'nowrap';
  openSettingsButton.style.borderColor = visualTokens.primaryAction.border;
  openSettingsButton.style.background = visualTokens.primaryAction.background;
  openSettingsButton.style.color = visualTokens.primaryAction.color;
  openSettingsButton.addEventListener('click', () => onOpenSettingsPage());
  actionRow.appendChild(openSettingsButton);
  settingsPanel.appendChild(actionRow);

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
