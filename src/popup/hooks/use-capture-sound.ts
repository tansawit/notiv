import { STORAGE_KEYS } from '../../shared/constants';
import { useStorageToggle } from '../../shared/use-storage-toggle';

interface UseCaptureSoundResult {
  soundEnabled: boolean;
  toggleSound: () => void;
}

export function useCaptureSound(): UseCaptureSoundResult {
  const { enabled, toggle } = useStorageToggle({
    storageKey: STORAGE_KEYS.captureSoundEnabled,
    defaultValue: false
  });

  return {
    soundEnabled: enabled,
    toggleSound: () => void toggle()
  };
}
