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

export const FONT_STACK_SANS =
  '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
export const FONT_STACK_MONO = '"JetBrains Mono", "SF Mono", monospace';

export const UTILITY_STYLE_TOKENS = {
  textButton: {
    border: '#1a1816',
    subtleText: '#5c5856',
    solidBackground: '#1a1816',
    solidText: '#faf9f7'
  },
  spinner: {
    track: 'rgba(26, 24, 22, 0.15)',
    head: '#1a1816'
  },
  skeletonGradient:
    'linear-gradient(90deg, rgba(26, 24, 22, 0.05) 25%, rgba(255, 255, 255, 0.9) 37%, rgba(26, 24, 22, 0.05) 63%)',
  combobox: {
    hoverBackgroundFallback: 'rgba(26, 24, 22, 0.04)',
    selectedBackgroundFallback: 'rgba(26, 24, 22, 0.06)',
    selectedBackground: 'rgba(26, 24, 22, 0.05)'
  },
  labelChipFallbackRgb: '128, 128, 128'
} as const;

const VISUAL_MODE_TOKENS: Record<VisualThemeMode, VisualModeTokens> = {
  light: {
    primaryAction: {
      border: '#1a1816',
      background: '#1a1816',
      color: '#faf9f7'
    },
    statusPill: {
      error: {
        border: '#1a1816',
        background: 'rgba(181, 52, 42, 0.1)',
        color: '#9a2d24'
      },
      connected: {
        border: '#1a1816',
        background: 'rgba(45, 122, 79, 0.1)',
        color: '#236b42'
      },
      offline: {
        border: '#1a1816',
        background: 'rgba(26, 24, 22, 0.04)',
        color: '#5c5856'
      }
    },
    message: {
      error: {
        border: '#1a1816',
        background: 'rgba(181, 52, 42, 0.08)',
        color: '#9a2d24'
      },
      notice: {
        border: '#1a1816',
        background: 'rgba(26, 24, 22, 0.04)',
        color: '#1a1816'
      }
    },
    inputFocusBorder: '#1a1816',
    triageAccent: '#b5342a',
    annotatorChipInactiveBorder: '#1a1816',
    annotatorChipInactiveBackground: '#ffffff',
    toast: {
      border: '#1a1816',
      background: '#1a1816',
      color: '#faf9f7'
    },
    floatingTooltip: {
      border: '#1a1816',
      background: '#1a1816',
      color: '#faf9f7',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.08)'
    },
    markerBubble: {
      background: '#faf9f7',
      text: '#1a1816',
      target: '#5c5856',
      attachment: '#5c5856',
      shadowBase: 'rgba(0, 0, 0, 0.1)',
      shadowActive: 'rgba(0, 0, 0, 0.16)',
      pinHoverShadow: 'rgba(0, 0, 0, 0.18)'
    },
    settingsConnectionBadge: {
      ring: 'rgba(250, 249, 247, 0.95)',
      border: '#1a1816',
      idle: '#9c9894',
      error: {
        background: '#b5342a',
        shadow: '0 0 0 1px rgba(250, 249, 247, 0.95), 0 0 0 2px #1a1816'
      },
      connecting: {
        background: '#1a1816',
        shadow: '0 0 0 1px rgba(250, 249, 247, 0.95), 0 0 0 2px #1a1816'
      },
      connected: {
        background: '#2d7a4f',
        shadow: '0 0 0 1px rgba(250, 249, 247, 0.95), 0 0 0 2px #1a1816'
      }
    },
    badges: {
      border: '#1a1816',
      collapsedBackground: '#b5342a',
      collapsedColor: '#faf9f7',
      queueBackground: '#b5342a',
      queueColor: '#faf9f7'
    }
  },
  dark: {
    primaryAction: {
      border: '#ffffff',
      background: '#ffffff',
      color: '#000000'
    },
    statusPill: {
      error: {
        border: 'rgba(255, 255, 255, 0.28)',
        background: 'rgba(255, 107, 107, 0.15)',
        color: '#ff6b6b'
      },
      connected: {
        border: 'rgba(255, 255, 255, 0.28)',
        background: 'rgba(92, 184, 122, 0.15)',
        color: '#7dcea0'
      },
      offline: {
        border: 'rgba(255, 255, 255, 0.28)',
        background: 'rgba(255, 255, 255, 0.06)',
        color: '#a0a0a0'
      }
    },
    message: {
      error: {
        border: 'rgba(255, 255, 255, 0.28)',
        background: 'rgba(255, 107, 107, 0.15)',
        color: '#ff6b6b'
      },
      notice: {
        border: 'rgba(255, 255, 255, 0.28)',
        background: 'rgba(255, 255, 255, 0.06)',
        color: '#ffffff'
      }
    },
    inputFocusBorder: '#ffffff',
    triageAccent: '#ff6b6b',
    annotatorChipInactiveBorder: 'rgba(255, 255, 255, 0.28)',
    annotatorChipInactiveBackground: 'rgba(255, 255, 255, 0.06)',
    toast: {
      border: 'rgba(255, 255, 255, 0.28)',
      background: '#000000',
      color: '#ffffff'
    },
    floatingTooltip: {
      border: 'rgba(255, 255, 255, 0.28)',
      background: '#000000',
      color: '#ffffff',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.25)'
    },
    markerBubble: {
      background: '#000000',
      text: '#ffffff',
      target: '#a0a0a0',
      attachment: '#a0a0a0',
      shadowBase: 'rgba(0, 0, 0, 0.5)',
      shadowActive: 'rgba(0, 0, 0, 0.6)',
      pinHoverShadow: 'rgba(0, 0, 0, 0.55)'
    },
    settingsConnectionBadge: {
      ring: 'rgba(0, 0, 0, 0.94)',
      border: 'rgba(255, 255, 255, 0.28)',
      idle: '#666666',
      error: {
        background: '#ff6b6b',
        shadow: '0 0 0 1px rgba(0, 0, 0, 0.94), 0 0 0 2px rgba(255, 255, 255, 0.28)'
      },
      connecting: {
        background: '#ffffff',
        shadow: '0 0 0 1px rgba(0, 0, 0, 0.94), 0 0 0 2px rgba(255, 255, 255, 0.28)'
      },
      connected: {
        background: '#5cb87a',
        shadow: '0 0 0 1px rgba(0, 0, 0, 0.94), 0 0 0 2px rgba(255, 255, 255, 0.28)'
      }
    },
    badges: {
      border: 'rgba(255, 255, 255, 0.28)',
      collapsedBackground: '#ffffff',
      collapsedColor: '#000000',
      queueBackground: '#ffffff',
      queueColor: '#000000'
    }
  }
};

const PRIORITY_ACCENT_COLORS: Record<VisualThemeMode, Record<string, string>> = {
  light: {
    '1': '#1a1816',
    '2': '#3a3836',
    '3': '#5c5856',
    '4': '#9c9894'
  },
  dark: {
    '1': '#f0efed',
    '2': '#d0cfcd',
    '3': '#a8a6a2',
    '4': '#8a8884'
  }
};

const PRIORITY_FALLBACK_ACCENT: Record<VisualThemeMode, string> = {
  light: '#5c5856',
  dark: '#a8a6a2'
};

const PRIORITY_INACTIVE: Record<VisualThemeMode, string> = {
  light: 'rgba(26, 24, 22, 0.1)',
  dark: 'rgba(240, 239, 237, 0.12)'
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
