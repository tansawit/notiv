import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../shared/constants';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCES = new Set<ThemePreference>(['system', 'light', 'dark']);

function applyThemePreference(preference: ThemePreference): void {
  document.documentElement.removeAttribute('data-theme');
  if (preference === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else if (preference === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

interface UsePopupThemeResult {
  themePreference: ThemePreference;
  cycleTheme: () => void;
}

export function usePopupTheme(): UsePopupThemeResult {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.themePreference], (result) => {
      const stored = result[STORAGE_KEYS.themePreference] as ThemePreference | undefined;
      if (!stored || !THEME_PREFERENCES.has(stored)) {
        return;
      }
      setThemePreference(stored);
      applyThemePreference(stored);
    });
  }, []);

  const cycleTheme = useCallback(() => {
    const next: ThemePreference =
      themePreference === 'system' ? 'light' : themePreference === 'light' ? 'dark' : 'system';
    setThemePreference(next);
    applyThemePreference(next);
    chrome.storage.local.set({ [STORAGE_KEYS.themePreference]: next });
  }, [themePreference]);

  return {
    themePreference,
    cycleTheme,
  };
}
