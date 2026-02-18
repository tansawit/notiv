import { STORAGE_KEYS } from '../../shared/constants';
import { useStorageToggle } from '../../shared/use-storage-toggle';

interface UseShowNoteTextOptions {
  setFeedback: (notice: string | null, error: string | null) => void;
}

interface UseShowNoteTextResult {
  showNoteTextEnabled: boolean;
  showNoteTextBusy: boolean;
  toggleShowNoteText: () => Promise<void>;
}

export function useShowNoteText(options: UseShowNoteTextOptions): UseShowNoteTextResult {
  const { enabled, busy, toggle } = useStorageToggle({
    storageKey: STORAGE_KEYS.showNoteTextInScreenshot,
    defaultValue: true,
    setFeedback: options.setFeedback,
    messages: {
      enabledNotice: 'Note text will appear in screenshots.',
      disabledNotice: 'Note text hidden from screenshots.',
      loadError: 'Could not load screenshot settings.',
      saveError: 'Could not update screenshot settings.'
    }
  });

  return {
    showNoteTextEnabled: enabled,
    showNoteTextBusy: busy,
    toggleShowNoteText: toggle
  };
}
