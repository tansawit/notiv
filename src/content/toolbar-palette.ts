import type { NotivThemeMode } from './theme-mode';
import { getVisualModeTokens } from '../shared/visual-tokens';
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
      shellBackground: 'rgba(28, 28, 28, 0.97)',
      shellBorder: '#e0dfdd',
      shellShadow: '0 6px 16px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.12)',
      shellShadowExpanded: '0 10px 22px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.14)',
      iconColor: '#f0efed'
    };
  }
  return {
    shellBackground: 'rgba(250, 249, 247, 0.98)',
    shellBorder: '#1a1816',
    shellShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    shellShadowExpanded: '0 8px 18px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)',
    iconColor: '#1a1816'
  };
}

export function getToolbarControlPalette(mode: NotivThemeMode): ToolbarControlPalette {
  const visualTokens = getVisualModeTokens(mode);
  if (mode === 'dark') {
    return {
      buttonBackground: 'rgba(36, 36, 36, 0.96)',
      buttonBorder: '#e0dfdd',
      buttonColor: '#f0efed',
      buttonHoverBackground: 'rgba(240, 239, 237, 0.14)',
      buttonHoverBorder: 'rgba(240, 239, 237, 0.4)',
      buttonHoverColor: '#ffffff',
      buttonPressedBackground: 'rgba(240, 239, 237, 0.2)',
      separator: 'rgba(240, 239, 237, 0.16)',
      badgeBorder: visualTokens.badges.border,
      collapsedBadgeBackground: visualTokens.badges.collapsedBackground,
      collapsedBadgeColor: visualTokens.badges.collapsedColor,
      queueBadgeBackground: visualTokens.badges.queueBackground,
      queueBadgeColor: visualTokens.badges.queueColor,
      activeBackground: '#e0dfdd',
      activeBorder: '#e0dfdd',
      activeColor: '#1c1c1c'
    };
  }
  return {
    buttonBackground: 'rgba(250, 249, 247, 0.98)',
    buttonBorder: '#1a1816',
    buttonColor: '#1a1816',
    buttonHoverBackground: 'rgba(26, 24, 22, 0.08)',
    buttonHoverBorder: 'rgba(26, 24, 22, 0.25)',
    buttonHoverColor: '#1a1816',
    buttonPressedBackground: 'rgba(26, 24, 22, 0.14)',
    separator: 'rgba(26, 24, 22, 0.14)',
    badgeBorder: visualTokens.badges.border,
    collapsedBadgeBackground: visualTokens.badges.collapsedBackground,
    collapsedBadgeColor: visualTokens.badges.collapsedColor,
    queueBadgeBackground: visualTokens.badges.queueBackground,
    queueBadgeColor: visualTokens.badges.queueColor,
    activeBackground: '#1a1816',
    activeBorder: '#1a1816',
    activeColor: '#faf9f7'
  };
}

export function getPanelPalette(mode: NotivThemeMode): PanelPalette {
  if (mode === 'dark') {
    return {
      shellBorder: '#e0dfdd',
      shellBackground: 'rgba(28, 28, 28, 0.97)',
      shellShadow: '0 6px 16px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.12)',
      headingColor: '#f0efed',
      textPrimary: '#f0efed',
      textSecondary: '#a8a6a2',
      textMuted: '#8a8884',
      surfaceBorder: '#e0dfdd',
      surfaceBackground: 'rgba(36, 36, 36, 0.96)',
      surfaceHoverBorder: '#e0dfdd',
      surfaceHoverBackground: 'rgba(240, 239, 237, 0.06)',
      surfaceHoverShadow: '0 6px 14px rgba(0, 0, 0, 0.32)',
      inputBorder: 'transparent',
      inputBackground: 'transparent',
      inputText: '#f0efed',
      surfaceSelectedBackground: 'rgba(240, 239, 237, 0.08)',
      iconButtonBorder: '#e0dfdd',
      iconButtonBackground: 'rgba(36, 36, 36, 0.96)',
      iconButtonColor: '#f0efed',
      subtleButtonBorder: '#e0dfdd',
      subtleButtonBackground: 'rgba(36, 36, 36, 0.96)',
      subtleButtonColor: '#a8a6a2',
      infoBorder: '#e0dfdd',
      infoBackground: 'rgba(36, 36, 36, 0.96)',
      infoText: '#a8a6a2'
    };
  }
  return {
    shellBorder: '#1a1816',
    shellBackground: 'rgba(250, 249, 247, 0.98)',
    shellShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    headingColor: '#1a1816',
    textPrimary: '#1a1816',
    textSecondary: '#5c5856',
    textMuted: '#9c9894',
    surfaceBorder: 'rgba(26, 24, 22, 0.12)',
    surfaceBackground: '#ffffff',
    surfaceHoverBorder: '#1a1816',
    surfaceHoverBackground: '#faf9f7',
    surfaceHoverShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    inputBorder: 'transparent',
    inputBackground: 'transparent',
    inputText: '#1a1816',
    surfaceSelectedBackground: 'rgba(26, 24, 22, 0.05)',
    iconButtonBorder: 'rgba(26, 24, 22, 0.12)',
    iconButtonBackground: '#ffffff',
    iconButtonColor: '#1a1816',
    subtleButtonBorder: 'rgba(26, 24, 22, 0.12)',
    subtleButtonBackground: '#ffffff',
    subtleButtonColor: '#5c5856',
    infoBorder: 'rgba(26, 24, 22, 0.12)',
    infoBackground: '#ffffff',
    infoText: '#5c5856'
  };
}
