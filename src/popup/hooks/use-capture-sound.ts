import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../../shared/constants';

interface UseCaptureSoundResult {
  soundEnabled: boolean;
  toggleSound: () => void;
}

export function useCaptureSound(): UseCaptureSoundResult {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.captureSoundEnabled], (result) => {
      const stored = result[STORAGE_KEYS.captureSoundEnabled] as boolean | undefined;
      setSoundEnabled(stored === true);
    });
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    chrome.storage.local.set({ [STORAGE_KEYS.captureSoundEnabled]: next });
  }, [soundEnabled]);

  return {
    soundEnabled,
    toggleSound,
  };
}
