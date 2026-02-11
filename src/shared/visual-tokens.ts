export type VisualThemeMode = 'light' | 'dark';

export interface VisualTone {
  border: string;
  background: string;
  color: string;
}

export interface VisualModeTokens {
  primaryAction: VisualTone;
  statusPill: {
    error: VisualTone;
    connected: VisualTone;
    offline: VisualTone;
  };
  message: {
    error: VisualTone;
    notice: VisualTone;
  };
  inputFocusBorder: string;
  triageAccent: string;
  annotatorChipInactiveBorder: string;
  annotatorChipInactiveBackground: string;
  toast: VisualTone;
  floatingTooltip: VisualTone & {
    shadow: string;
  };
  markerBubble: {
    background: string;
    text: string;
    target: string;
    attachment: string;
    shadowBase: string;
    shadowActive: string;
    pinHoverShadow: string;
  };
  settingsConnectionBadge: {
    ring: string;
    border: string;
    idle: string;
    error: {
      background: string;
      shadow: string;
    };
    connecting: {
      background: string;
      shadow: string;
    };
    connected: {
      background: string;
      shadow: string;
    };
  };
  badges: {
    border: string;
    collapsedBackground: string;
    collapsedColor: string;
    queueBackground: string;
    queueColor: string;
  };
}

export const FONT_STACK_SERIF =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const FONT_STACK_MONO = '"JetBrains Mono", "SF Mono", monospace';

export const UTILITY_STYLE_TOKENS = {
  textButton: {
    border: '#111111',
    subtleText: '#444444',
    solidBackground: '#111111',
    solidText: '#ffffff'
  },
  spinner: {
    track: 'rgba(17, 17, 17, 0.18)',
    head: '#111111'
  },
  skeletonGradient:
    'linear-gradient(90deg, rgba(17, 17, 17, 0.06) 25%, rgba(255, 255, 255, 0.94) 37%, rgba(17, 17, 17, 0.06) 63%)',
  combobox: {
    hoverBackgroundFallback: 'rgba(17, 17, 17, 0.04)',
    selectedBackgroundFallback: 'rgba(17, 17, 17, 0.08)',
    selectedBackground: 'rgba(17, 17, 17, 0.06)'
  },
  labelChipFallbackRgb: '128, 128, 128'
} as const;

const VISUAL_MODE_TOKENS: Record<VisualThemeMode, VisualModeTokens> = {
  light: {
    primaryAction: {
      border: '#111111',
      background: '#111111',
      color: '#ffffff'
    },
    statusPill: {
      error: {
        border: '#111111',
        background: 'rgba(198, 40, 40, 0.12)',
        color: '#a01f1f'
      },
      connected: {
        border: '#111111',
        background: 'rgba(35, 113, 71, 0.1)',
        color: '#1f5e37'
      },
      offline: {
        border: '#111111',
        background: 'rgba(17, 17, 17, 0.05)',
        color: '#444444'
      }
    },
    message: {
      error: {
        border: '#111111',
        background: 'rgba(198, 40, 40, 0.1)',
        color: '#a01f1f'
      },
      notice: {
        border: '#111111',
        background: 'rgba(17, 17, 17, 0.05)',
        color: '#111111'
      }
    },
    inputFocusBorder: '#111111',
    triageAccent: '#c62828',
    annotatorChipInactiveBorder: '#111111',
    annotatorChipInactiveBackground: '#ffffff',
    toast: {
      border: '#111111',
      background: '#111111',
      color: '#ffffff'
    },
    floatingTooltip: {
      border: '#111111',
      background: '#111111',
      color: '#ffffff',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1)'
    },
    markerBubble: {
      background: '#fdfbf7',
      text: '#111111',
      target: '#444444',
      attachment: '#444444',
      shadowBase: 'rgba(0, 0, 0, 0.12)',
      shadowActive: 'rgba(0, 0, 0, 0.2)',
      pinHoverShadow: 'rgba(0, 0, 0, 0.22)'
    },
    settingsConnectionBadge: {
      ring: 'rgba(253, 251, 247, 0.95)',
      border: '#111111',
      idle: '#777777',
      error: {
        background: '#c62828',
        shadow: '0 0 0 1px rgba(253, 251, 247, 0.95), 0 0 0 2px #111111'
      },
      connecting: {
        background: '#111111',
        shadow: '0 0 0 1px rgba(253, 251, 247, 0.95), 0 0 0 2px #111111'
      },
      connected: {
        background: '#237147',
        shadow: '0 0 0 1px rgba(253, 251, 247, 0.95), 0 0 0 2px #111111'
      }
    },
    badges: {
      border: '#111111',
      collapsedBackground: '#c62828',
      collapsedColor: '#ffffff',
      queueBackground: '#c62828',
      queueColor: '#ffffff'
    }
  },
  dark: {
    primaryAction: {
      border: '#d7d7d7',
      background: '#d7d7d7',
      color: '#111111'
    },
    statusPill: {
      error: {
        border: '#d4d4d4',
        background: 'rgba(228, 134, 142, 0.2)',
        color: '#f2cfd4'
      },
      connected: {
        border: '#d4d4d4',
        background: 'rgba(103, 200, 142, 0.15)',
        color: '#b8d7ae'
      },
      offline: {
        border: '#d4d4d4',
        background: 'rgba(255, 255, 255, 0.06)',
        color: '#c8c8c8'
      }
    },
    message: {
      error: {
        border: '#d4d4d4',
        background: 'rgba(228, 134, 142, 0.18)',
        color: '#f0c9d0'
      },
      notice: {
        border: '#d4d4d4',
        background: 'rgba(255, 255, 255, 0.06)',
        color: '#d8d8d8'
      }
    },
    inputFocusBorder: '#d7d7d7',
    triageAccent: '#c62828',
    annotatorChipInactiveBorder: '#d4d4d4',
    annotatorChipInactiveBackground: 'rgba(255, 255, 255, 0.04)',
    toast: {
      border: '#d4d4d4',
      background: '#1a1a1a',
      color: '#efefef'
    },
    floatingTooltip: {
      border: '#d4d4d4',
      background: 'rgba(30, 30, 30, 0.96)',
      color: '#efefef',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.38), 0 1px 2px rgba(0, 0, 0, 0.18)'
    },
    markerBubble: {
      background: 'rgba(26, 26, 26, 0.97)',
      text: '#efefef',
      target: '#b8b8b8',
      attachment: '#adadad',
      shadowBase: 'rgba(0, 0, 0, 0.42)',
      shadowActive: 'rgba(0, 0, 0, 0.5)',
      pinHoverShadow: 'rgba(0, 0, 0, 0.45)'
    },
    settingsConnectionBadge: {
      ring: 'rgba(26, 26, 26, 0.94)',
      border: '#d4d4d4',
      idle: '#9a9a9a',
      error: {
        background: '#e4868e',
        shadow: '0 0 0 1px rgba(26, 26, 26, 0.94), 0 0 0 2px #d4d4d4'
      },
      connecting: {
        background: '#d7d7d7',
        shadow: '0 0 0 1px rgba(26, 26, 26, 0.94), 0 0 0 2px #d4d4d4'
      },
      connected: {
        background: '#67c88e',
        shadow: '0 0 0 1px rgba(26, 26, 26, 0.94), 0 0 0 2px #d4d4d4'
      }
    },
    badges: {
      border: '#d4d4d4',
      collapsedBackground: '#d7d7d7',
      collapsedColor: '#111111',
      queueBackground: '#d7d7d7',
      queueColor: '#111111'
    }
  }
};

const PRIORITY_ACCENT_COLORS: Record<VisualThemeMode, Record<string, string>> = {
  light: {
    '1': '#111111',
    '2': '#333333',
    '3': '#555555',
    '4': '#888888'
  },
  dark: {
    '1': '#e8e8e8',
    '2': '#cecece',
    '3': '#acacac',
    '4': '#8a8a8a'
  }
};

const PRIORITY_FALLBACK_ACCENT: Record<VisualThemeMode, string> = {
  light: '#555555',
  dark: '#b8b8b8'
};

const PRIORITY_INACTIVE: Record<VisualThemeMode, string> = {
  light: 'rgba(17, 17, 17, 0.12)',
  dark: 'rgba(255, 255, 255, 0.14)'
};

export function getVisualModeTokens(mode: VisualThemeMode): VisualModeTokens {
  return VISUAL_MODE_TOKENS[mode];
}

export function getPriorityAccentColor(mode: VisualThemeMode, value: string): string {
  return PRIORITY_ACCENT_COLORS[mode][value] ?? PRIORITY_FALLBACK_ACCENT[mode];
}

export function getPriorityInactiveColor(mode: VisualThemeMode): string {
  return PRIORITY_INACTIVE[mode];
}
