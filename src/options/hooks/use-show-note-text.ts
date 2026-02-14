import { useCallback, useEffect, useState } from 'react';
import { getLocalStorageItems, setLocalStorageItems } from '../../shared/chrome-storage';
import { STORAGE_KEYS } from '../../shared/constants';

interface UseShowNoteTextOptions {
  setFeedback: (notice: string | null, error: string | null) => void;
}

interface UseShowNoteTextResult {
  showNoteTextEnabled: boolean;
  showNoteTextBusy: boolean;
  toggleShowNoteText: () => Promise<void>;
}

async function loadShowNoteTextEnabled(): Promise<boolean> {
  const items = await getLocalStorageItems<Record<string, unknown>>([STORAGE_KEYS.showNoteTextInScreenshot]);
  return items?.[STORAGE_KEYS.showNoteTextInScreenshot] === true;
}

async function saveShowNoteTextEnabled(enabled: boolean): Promise<void> {
  await setLocalStorageItems({ [STORAGE_KEYS.showNoteTextInScreenshot]: enabled });
}

export function useShowNoteText(options: UseShowNoteTextOptions): UseShowNoteTextResult {
  const { setFeedback } = options;
  const [showNoteTextEnabled, setShowNoteTextEnabled] = useState(false);
  const [showNoteTextBusy, setShowNoteTextBusy] = useState(false);

  useEffect(() => {
    const loadShowNoteTextPreference = async (): Promise<void> => {
      try {
        setShowNoteTextEnabled(await loadShowNoteTextEnabled());
      } catch (loadError) {
        setFeedback(
          null,
          loadError instanceof Error ? loadError.message : 'Could not load screenshot settings.'
        );
      }
    };

    void loadShowNoteTextPreference();
  }, [setFeedback]);

  const toggleShowNoteText = useCallback(async (): Promise<void> => {
    const next = !showNoteTextEnabled;
    setShowNoteTextBusy(true);
    setFeedback(null, null);
    try {
      await saveShowNoteTextEnabled(next);
      setShowNoteTextEnabled(next);
      setFeedback(next ? 'Note text will appear in screenshots.' : 'Note text hidden from screenshots.', null);
    } catch (saveError) {
      setFeedback(
        null,
        saveError instanceof Error ? saveError.message : 'Could not update screenshot settings.'
      );
    } finally {
      setShowNoteTextBusy(false);
    }
  }, [showNoteTextEnabled, setFeedback]);

  return {
    showNoteTextEnabled,
    showNoteTextBusy,
    toggleShowNoteText
  };
}
