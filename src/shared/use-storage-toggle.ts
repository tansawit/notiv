import { useCallback, useEffect, useState } from 'react';
import { getLocalStorageItems, setLocalStorageItems } from './chrome-storage';

interface UseStorageToggleOptions {
  storageKey: string;
  defaultValue?: boolean;
  setFeedback?: (notice: string | null, error: string | null) => void;
  messages?: {
    enabledNotice?: string;
    disabledNotice?: string;
    loadError?: string;
    saveError?: string;
  };
}

interface UseStorageToggleResult {
  enabled: boolean;
  busy: boolean;
  toggle: () => Promise<void>;
}

export function useStorageToggle(options: UseStorageToggleOptions): UseStorageToggleResult {
  const { storageKey, defaultValue = false, setFeedback, messages } = options;
  const [enabled, setEnabled] = useState(defaultValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const items = await getLocalStorageItems<Record<string, unknown>>([storageKey]);
        const stored = items?.[storageKey];
        if (typeof stored === 'boolean') {
          setEnabled(stored);
        }
      } catch {
        setFeedback?.(null, messages?.loadError ?? 'Could not load setting.');
      }
    };
    void load();
  }, [storageKey, setFeedback, messages?.loadError]);

  const toggle = useCallback(async (): Promise<void> => {
    const next = !enabled;
    setBusy(true);
    setFeedback?.(null, null);
    try {
      await setLocalStorageItems({ [storageKey]: next });
      setEnabled(next);
      const notice = next ? messages?.enabledNotice : messages?.disabledNotice;
      if (notice) {
        setFeedback?.(notice, null);
      }
    } catch {
      setFeedback?.(null, messages?.saveError ?? 'Could not save setting.');
    } finally {
      setBusy(false);
    }
  }, [enabled, storageKey, setFeedback, messages]);

  return { enabled, busy, toggle };
}
