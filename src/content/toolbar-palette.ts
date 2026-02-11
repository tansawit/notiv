import type { NotivThemeMode } from './theme-mode';
export type { NotivThemeMode };

export interface ToolbarModePalette {
  shellBackground: string;
  shellBorder: string;
  shellShadow: string;
  shellShadowExpanded: string;
  iconColor: string;
}

export interface ToolbarControlPalette {
  buttonBackground: string;
  buttonBorder: string;
  buttonColor: string;
  buttonHoverBackground: string;
  buttonHoverBorder: string;
  buttonHoverColor: string;
  buttonPressedBackground: string;
  separator: string;
  badgeBorder: string;
  collapsedBadgeBackground: string;
  collapsedBadgeColor: string;
  queueBadgeBackground: string;
  queueBadgeColor: string;
  activeBackground: string;
  activeBorder: string;
  activeColor: string;
}

export interface PanelPalette {
  shellBorder: string;
  shellBackground: string;
  shellShadow: string;
  headingColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  surfaceBorder: string;
  surfaceBackground: string;
  surfaceHoverBorder: string;
  surfaceHoverBackground: string;
  surfaceHoverShadow: string;
  inputBorder: string;
  inputBackground: string;
  inputText: string;
  surfaceSelectedBackground: string;
  iconButtonBorder: string;
  iconButtonBackground: string;
  iconButtonColor: string;
  subtleButtonBorder: string;
  subtleButtonBackground: string;
  subtleButtonColor: string;
  infoBorder: string;
  infoBackground: string;
  infoText: string;
}

export function getToolbarModePalette(mode: NotivThemeMode): ToolbarModePalette {
  if (mode === 'dark') {
    return {
      shellBackground: 'rgba(24, 24, 24, 0.96)',
      shellBorder: '#d4d4d4',
      shellShadow: '0 6px 16px rgba(0, 0, 0, 0.36), 0 1px 2px rgba(0, 0, 0, 0.16)',
      shellShadowExpanded: '0 10px 22px rgba(0, 0, 0, 0.42), 0 1px 2px rgba(0, 0, 0, 0.18)',
      iconColor: '#efefef'
    };
  }
  return {
    shellBackground: 'rgba(253, 251, 247, 0.98)',
    shellBorder: '#111111',
    shellShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05)',
    shellShadowExpanded: '0 8px 18px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)',
    iconColor: '#111111'
  };
}

export function getToolbarControlPalette(mode: NotivThemeMode): ToolbarControlPalette {
  if (mode === 'dark') {
    return {
      buttonBackground: 'rgba(34, 34, 34, 0.94)',
      buttonBorder: '#cfcfcf',
      buttonColor: '#efefef',
      buttonHoverBackground: 'rgba(255, 255, 255, 0.18)',
      buttonHoverBorder: 'rgba(255, 255, 255, 0.42)',
      buttonHoverColor: '#ffffff',
      buttonPressedBackground: 'rgba(255, 255, 255, 0.24)',
      separator: 'rgba(255, 255, 255, 0.18)',
      badgeBorder: '#d4d4d4',
      collapsedBadgeBackground: '#d7d7d7',
      collapsedBadgeColor: '#111111',
      queueBadgeBackground: '#d7d7d7',
      queueBadgeColor: '#111111',
      activeBackground: '#d7d7d7',
      activeBorder: '#d7d7d7',
      activeColor: '#111111'
    };
  }
  return {
    buttonBackground: 'rgba(253, 251, 247, 0.98)',
    buttonBorder: '#111111',
    buttonColor: '#111111',
    buttonHoverBackground: 'rgba(17, 17, 17, 0.1)',
    buttonHoverBorder: 'rgba(17, 17, 17, 0.28)',
    buttonHoverColor: '#111111',
    buttonPressedBackground: 'rgba(17, 17, 17, 0.16)',
    separator: 'rgba(17, 17, 17, 0.16)',
    badgeBorder: '#111111',
    collapsedBadgeBackground: '#c62828',
    collapsedBadgeColor: '#ffffff',
    queueBadgeBackground: '#c62828',
    queueBadgeColor: '#ffffff',
    activeBackground: '#111111',
    activeBorder: '#111111',
    activeColor: '#ffffff'
  };
}

export function getPanelPalette(mode: NotivThemeMode): PanelPalette {
  if (mode === 'dark') {
    return {
      shellBorder: '#d4d4d4',
      shellBackground: 'rgba(24, 24, 24, 0.96)',
      shellShadow: '0 6px 16px rgba(0, 0, 0, 0.38), 0 1px 2px rgba(0, 0, 0, 0.18)',
      headingColor: '#efefef',
      textPrimary: '#efefef',
      textSecondary: '#c7c7c7',
      textMuted: '#a9a9a9',
      surfaceBorder: '#c9c9c9',
      surfaceBackground: 'rgba(34, 34, 34, 0.9)',
      surfaceHoverBorder: '#d8d8d8',
      surfaceHoverBackground: 'rgba(255, 255, 255, 0.06)',
      surfaceHoverShadow: '0 7px 14px rgba(0, 0, 0, 0.36)',
      inputBorder: 'transparent',
      inputBackground: 'transparent',
      inputText: '#ececec',
      surfaceSelectedBackground: 'rgba(255, 255, 255, 0.1)',
      iconButtonBorder: '#cfcfcf',
      iconButtonBackground: 'rgba(34, 34, 34, 0.94)',
      iconButtonColor: '#efefef',
      subtleButtonBorder: '#c6c6c6',
      subtleButtonBackground: 'rgba(34, 34, 34, 0.94)',
      subtleButtonColor: '#e3e3e3',
      infoBorder: '#c6c6c6',
      infoBackground: 'rgba(34, 34, 34, 0.94)',
      infoText: '#cfcfcf'
    };
  }
  return {
    shellBorder: '#111111',
    shellBackground: 'rgba(253, 251, 247, 0.98)',
    shellShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05)',
    headingColor: '#111111',
    textPrimary: '#111111',
    textSecondary: '#444444',
    textMuted: '#888888',
    surfaceBorder: '#e0e0e0',
    surfaceBackground: '#ffffff',
    surfaceHoverBorder: '#111111',
    surfaceHoverBackground: '#fdfbf7',
    surfaceHoverShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
    inputBorder: 'transparent',
    inputBackground: 'transparent',
    inputText: '#111111',
    surfaceSelectedBackground: 'rgba(17, 17, 17, 0.05)',
    iconButtonBorder: '#e0e0e0',
    iconButtonBackground: '#ffffff',
    iconButtonColor: '#111111',
    subtleButtonBorder: '#e0e0e0',
    subtleButtonBackground: '#ffffff',
    subtleButtonColor: '#444444',
    infoBorder: '#e0e0e0',
    infoBackground: '#ffffff',
    infoText: '#444444'
  };
}
