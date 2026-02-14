import { useCallback, useEffect, useState } from 'react';
import { getLocalStorageItems, setLocalStorageItems } from '../shared/chrome-storage';
import { STORAGE_KEYS } from '../shared/constants';

interface UseCaptureRedactionOptions {
  setFeedback: (notice: string | null, error: string | null) => void;
}

interface UseCaptureRedactionResult {
  captureRedactionEnabled: boolean;
  captureRedactionBusy: boolean;
  toggleCaptureRedaction: () => Promise<void>;
}

async function loadCaptureRedactionEnabled(): Promise<boolean> {
  const items = await getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.captureRedactionEnabled]);
  return items?.[STORAGE_KEYS.captureRedactionEnabled] !== false;
}

async function saveCaptureRedactionEnabled(enabled: boolean): Promise<void> {
  await setLocalStorageItems({ [STORAGE_KEYS.captureRedactionEnabled]: enabled });
}

export function useCaptureRedaction(options: UseCaptureRedactionOptions): UseCaptureRedactionResult {
  const { setFeedback } = options;
  const [captureRedactionEnabled, setCaptureRedactionEnabled] = useState(true);
  const [captureRedactionBusy, setCaptureRedactionBusy] = useState(false);

  useEffect(() => {
    const loadCaptureRedactionPreference = async (): Promise<void> => {
      try {
        setCaptureRedactionEnabled(await loadCaptureRedactionEnabled());
      } catch (loadError) {
        setFeedback(
          null,
          loadError instanceof Error ? loadError.message : 'Could not load capture privacy settings.'
        );
      }
    };

    void loadCaptureRedactionPreference();
  }, [setFeedback]);

  const toggleCaptureRedaction = useCallback(async (): Promise<void> => {
    const next = !captureRedactionEnabled;
    setCaptureRedactionBusy(true);
    setFeedback(null, null);
    try {
      await saveCaptureRedactionEnabled(next);
      setCaptureRedactionEnabled(next);
      setFeedback(next ? 'Capture redaction enabled.' : 'Capture redaction disabled.', null);
    } catch (saveError) {
      setFeedback(
        null,
        saveError instanceof Error ? saveError.message : 'Could not update capture privacy settings.'
      );
    } finally {
      setCaptureRedactionBusy(false);
    }
  }, [captureRedactionEnabled, setFeedback]);

  return {
    captureRedactionEnabled,
    captureRedactionBusy,
    toggleCaptureRedaction
  };
}
