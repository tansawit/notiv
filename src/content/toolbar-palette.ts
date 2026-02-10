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
      shellBackground: 'rgba(17, 17, 17, 0.98)',
      shellBorder: '#f2f2f2',
      shellShadow: '0 8px 18px rgba(0, 0, 0, 0.45)',
      shellShadowExpanded: '0 12px 24px rgba(0, 0, 0, 0.5)',
      iconColor: '#ffffff'
    };
  }
  return {
    shellBackground: 'rgba(255, 255, 255, 0.98)',
    shellBorder: '#111111',
    shellShadow: '0 4px 12px rgba(0, 0, 0, 0.16)',
    shellShadowExpanded: '0 8px 18px rgba(0, 0, 0, 0.2)',
    iconColor: '#111111'
  };
}

export function getToolbarControlPalette(mode: NotivThemeMode): ToolbarControlPalette {
  if (mode === 'dark') {
    return {
      buttonBackground: 'rgba(28, 28, 28, 0.96)',
      buttonBorder: '#f2f2f2',
      buttonColor: '#ffffff',
      separator: 'rgba(255, 255, 255, 0.24)',
      badgeBorder: '#FFE600',
      collapsedBadgeBackground: '#FFE600',
      collapsedBadgeColor: '#111111',
      queueBadgeBackground: '#FFE600',
      queueBadgeColor: '#111111',
      activeBackground: '#FFE600',
      activeBorder: '#FFE600',
      activeColor: '#111111'
    };
  }
  return {
    buttonBackground: 'rgba(255, 255, 255, 0.98)',
    buttonBorder: '#111111',
    buttonColor: '#111111',
    separator: 'rgba(17, 17, 17, 0.25)',
    badgeBorder: '#111111',
    collapsedBadgeBackground: '#FFE600',
    collapsedBadgeColor: '#111111',
    queueBadgeBackground: '#111111',
    queueBadgeColor: '#ffffff',
    activeBackground: '#111111',
    activeBorder: '#111111',
    activeColor: '#ffffff'
  };
}

export function getPanelPalette(mode: NotivThemeMode): PanelPalette {
  if (mode === 'dark') {
    return {
      shellBorder: '#f2f2f2',
      shellBackground: 'rgba(17, 17, 17, 0.98)',
      shellShadow: '0 4px 14px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      headingColor: '#ffffff',
      textPrimary: '#ffffff',
      textSecondary: '#cfcfcf',
      textMuted: '#a9a9a9',
      surfaceBorder: '#f2f2f2',
      surfaceBackground: 'rgba(28, 28, 28, 0.92)',
      surfaceHoverBorder: '#FFE600',
      surfaceHoverBackground: 'rgba(255, 230, 0, 0.12)',
      surfaceHoverShadow: '0 8px 16px rgba(0, 0, 0, 0.45)',
      inputBorder: '#f2f2f2',
      inputBackground: 'rgba(22, 22, 22, 0.96)',
      inputText: '#ffffff',
      surfaceSelectedBackground: 'rgba(255, 255, 255, 0.12)',
      iconButtonBorder: '#f2f2f2',
      iconButtonBackground: 'rgba(28, 28, 28, 0.96)',
      iconButtonColor: '#ffffff',
      subtleButtonBorder: '#f2f2f2',
      subtleButtonBackground: 'rgba(28, 28, 28, 0.96)',
      subtleButtonColor: '#ffffff',
      infoBorder: '#f2f2f2',
      infoBackground: 'rgba(28, 28, 28, 0.96)',
      infoText: '#cfcfcf'
    };
  }
  return {
    shellBorder: '#111111',
    shellBackground: 'rgba(255, 255, 255, 0.98)',
    shellShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 3px 3px 0 rgba(17, 17, 17, 1)',
    headingColor: '#111111',
    textPrimary: '#111111',
    textSecondary: '#555555',
    textMuted: '#777777',
    surfaceBorder: '#111111',
    surfaceBackground: '#f9f9f9',
    surfaceHoverBorder: '#111111',
    surfaceHoverBackground: '#ffffff',
    surfaceHoverShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    inputBorder: '#111111',
    inputBackground: '#ffffff',
    inputText: '#111111',
    surfaceSelectedBackground: 'rgba(17, 17, 17, 0.05)',
    iconButtonBorder: '#111111',
    iconButtonBackground: '#ffffff',
    iconButtonColor: '#111111',
    subtleButtonBorder: '#111111',
    subtleButtonBackground: 'transparent',
    subtleButtonColor: '#111111',
    infoBorder: '#111111',
    infoBackground: '#f9f9f9',
    infoText: '#555555'
  };
}
