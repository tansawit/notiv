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
  '"Times New Roman", Times, serif';
export const FONT_STACK_MONO = '"SF Mono", "Monaco", "Inconsolata", "Fira Mono", monospace';

export const UTILITY_STYLE_TOKENS = {
  textButton: {
    border: '#111111',
    subtleText: '#111111',
    solidBackground: '#111111',
    solidText: '#ffffff'
  },
  spinner: {
    track: 'rgba(17, 17, 17, 0.2)',
    head: '#111111'
  },
  skeletonGradient:
    'linear-gradient(90deg, rgba(17, 17, 17, 0.08) 25%, rgba(255, 255, 255, 0.92) 37%, rgba(17, 17, 17, 0.08) 63%)',
  combobox: {
    hoverBackgroundFallback: 'rgba(17, 17, 17, 0.06)',
    selectedBackgroundFallback: 'rgba(17, 17, 17, 0.1)',
    selectedBackground: 'rgba(17, 17, 17, 0.08)'
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
        background: 'rgba(161, 46, 52, 0.12)',
        color: '#8f2026'
      },
      connected: {
        border: '#111111',
        background: 'rgba(47, 125, 76, 0.1)',
        color: '#1f5e37'
      },
      offline: {
        border: '#111111',
        background: 'rgba(17, 17, 17, 0.05)',
        color: '#555555'
      }
    },
    message: {
      error: {
        border: '#111111',
        background: 'rgba(161, 46, 52, 0.1)',
        color: '#8f2026'
      },
      notice: {
        border: '#111111',
        background: 'rgba(17, 17, 17, 0.05)',
        color: '#111111'
      }
    },
    inputFocusBorder: '#111111',
    triageAccent: '#111111',
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
      shadow: '0 4px 12px rgba(0, 0, 0, 0.22)'
    },
    markerBubble: {
      background: '#ffffff',
      text: '#111111',
      target: '#555555',
      attachment: '#555555',
      shadowBase: 'rgba(0, 0, 0, 0.12)',
      shadowActive: 'rgba(0, 0, 0, 0.18)',
      pinHoverShadow: 'rgba(0, 0, 0, 0.24)'
    },
    settingsConnectionBadge: {
      ring: 'rgba(255, 255, 255, 0.95)',
      border: '#111111',
      idle: '#555555',
      error: {
        background: '#d65f69',
        shadow: '0 0 0 1px rgba(255, 255, 255, 0.95), 0 0 0 2px #111111'
      },
      connecting: {
        background: '#FFE600',
        shadow: '0 0 0 1px rgba(255, 255, 255, 0.95), 0 0 0 2px #111111'
      },
      connected: {
        background: '#49b46d',
        shadow: '0 0 0 1px rgba(255, 255, 255, 0.95), 0 0 0 2px #111111'
      }
    },
    badges: {
      border: '#111111',
      collapsedBackground: '#FFE600',
      collapsedColor: '#111111',
      queueBackground: '#111111',
      queueColor: '#ffffff'
    }
  },
  dark: {
    primaryAction: {
      border: '#FFE600',
      background: '#FFE600',
      color: '#111111'
    },
    statusPill: {
      error: {
        border: '#FFE600',
        background: 'rgba(228, 134, 142, 0.2)',
        color: '#ffd0da'
      },
      connected: {
        border: '#FFE600',
        background: 'rgba(103, 200, 142, 0.18)',
        color: '#c5e7ba'
      },
      offline: {
        border: '#FFE600',
        background: 'rgba(255, 255, 255, 0.08)',
        color: '#d8d8d8'
      }
    },
    message: {
      error: {
        border: '#f28a8a',
        background: 'rgba(228, 134, 142, 0.2)',
        color: '#ffd2dc'
      },
      notice: {
        border: '#FFE600',
        background: 'rgba(255, 230, 0, 0.15)',
        color: '#ffe95e'
      }
    },
    inputFocusBorder: '#FFE600',
    triageAccent: '#FFE600',
    annotatorChipInactiveBorder: '#f2f2f2',
    annotatorChipInactiveBackground: 'rgba(255, 255, 255, 0.04)',
    toast: {
      border: '#FFE600',
      background: '#111111',
      color: '#ffffff'
    },
    floatingTooltip: {
      border: '#FFE600',
      background: '#111111',
      color: '#ffffff',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.45)'
    },
    markerBubble: {
      background: 'rgba(17, 17, 17, 0.98)',
      text: '#ffffff',
      target: '#d0d0d0',
      attachment: '#bdbdbd',
      shadowBase: 'rgba(0, 0, 0, 0.5)',
      shadowActive: 'rgba(0, 0, 0, 0.6)',
      pinHoverShadow: 'rgba(0, 0, 0, 0.5)'
    },
    settingsConnectionBadge: {
      ring: 'rgba(17, 17, 17, 0.95)',
      border: '#FFE600',
      idle: '#9a9a9a',
      error: {
        background: '#e4868e',
        shadow: '0 0 0 1px rgba(17, 17, 17, 0.95), 0 0 0 2px #FFE600'
      },
      connecting: {
        background: '#FFE600',
        shadow: '0 0 0 1px rgba(17, 17, 17, 0.95), 0 0 0 2px #FFE600'
      },
      connected: {
        background: '#67c88e',
        shadow: '0 0 0 1px rgba(17, 17, 17, 0.95), 0 0 0 2px #FFE600'
      }
    },
    badges: {
      border: '#FFE600',
      collapsedBackground: '#FFE600',
      collapsedColor: '#111111',
      queueBackground: '#FFE600',
      queueColor: '#111111'
    }
  }
};

const PRIORITY_ACCENT_COLORS: Record<VisualThemeMode, Record<string, string>> = {
  light: {
    '1': '#111111',
    '2': '#333333',
    '3': '#555555',
    '4': '#777777'
  },
  dark: {
    '1': '#FFE600',
    '2': '#f3d900',
    '3': '#d7bf00',
    '4': '#ad9800'
  }
};

const PRIORITY_FALLBACK_ACCENT: Record<VisualThemeMode, string> = {
  light: '#555555',
  dark: '#d7bf00'
};

const PRIORITY_INACTIVE: Record<VisualThemeMode, string> = {
  light: 'rgba(17, 17, 17, 0.12)',
  dark: 'rgba(255, 255, 255, 0.18)'
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
